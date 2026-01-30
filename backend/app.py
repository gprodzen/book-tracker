#!/usr/bin/env python3
"""Book Tracker API - Flask backend with Open Library API integration."""

import sqlite3
import urllib.request
import urllib.parse
import json
from pathlib import Path
from flask import Flask, jsonify, request, g
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATABASE = Path(__file__).parent / 'books.db'

# Open Library APIs - better cover quality than Google Books
OPEN_LIBRARY_SEARCH = 'https://openlibrary.org/search.json'
OPEN_LIBRARY_COVERS = 'https://covers.openlibrary.org/b'


def get_db():
    """Get database connection for current request."""
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception):
    """Close database connection at end of request."""
    db = g.pop('db', None)
    if db is not None:
        db.close()


def dict_from_row(row):
    """Convert sqlite3.Row to dict."""
    return dict(zip(row.keys(), row))


# --- Open Library API ---

def get_open_library_cover_url(isbn: str = None, olid: str = None, size: str = 'L') -> str | None:
    """
    Get cover URL from Open Library.
    Size: S (small), M (medium), L (large)
    Can use ISBN or Open Library ID (OLID).
    """
    if isbn:
        return f"{OPEN_LIBRARY_COVERS}/isbn/{isbn}-{size}.jpg"
    if olid:
        return f"{OPEN_LIBRARY_COVERS}/olid/{olid}-{size}.jpg"
    return None


def check_cover_exists(url: str) -> bool:
    """Check if a cover actually exists (not a placeholder)."""
    try:
        req = urllib.request.Request(url, method='HEAD')
        with urllib.request.urlopen(req, timeout=5) as response:
            # Open Library returns a 1x1 gif for missing covers
            content_length = response.headers.get('Content-Length', '0')
            return int(content_length) > 1000  # Real covers are larger
    except Exception:
        return False


def search_open_library(query: str, limit: int = 5) -> list[dict]:
    """Search Open Library for books."""
    params = urllib.parse.urlencode({
        'q': query,
        'limit': limit,
        'fields': 'key,title,author_name,first_publish_year,cover_i,isbn,number_of_pages_median,publisher,subject',
    })
    url = f"{OPEN_LIBRARY_SEARCH}?{params}"

    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data.get('docs', [])
    except Exception as e:
        print(f"Open Library API error: {e}")
        return []


def get_open_library_book_by_isbn(isbn: str) -> dict | None:
    """Get book details from Open Library by ISBN."""
    results = search_open_library(f'isbn:{isbn}', limit=1)
    return results[0] if results else None


def extract_open_library_info(ol_book: dict) -> dict:
    """Extract relevant info from Open Library search result."""
    cover_id = ol_book.get('cover_i')
    isbns = ol_book.get('isbn', [])

    # Prefer ISBN13
    isbn13 = next((i for i in isbns if len(i) == 13), None)
    isbn10 = next((i for i in isbns if len(i) == 10), None)
    best_isbn = isbn13 or isbn10

    return {
        'open_library_key': ol_book.get('key'),
        'title': ol_book.get('title'),
        'authors': ol_book.get('author_name', []),
        'first_publish_year': ol_book.get('first_publish_year'),
        'page_count': ol_book.get('number_of_pages_median'),
        'publishers': ol_book.get('publisher', [])[:3],
        'subjects': ol_book.get('subject', [])[:10],
        'cover_image_url': f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None,
        'cover_image_medium': f"https://covers.openlibrary.org/b/id/{cover_id}-M.jpg" if cover_id else None,
        'isbn_10': isbn10,
        'isbn_13': isbn13,
    }


# --- API Routes ---

@app.route('/api/books', methods=['GET'])
def get_books():
    """Get all books with filtering and pagination."""
    db = get_db()

    # Query parameters
    status = request.args.get('status')
    search = request.args.get('search', '')
    sort_by = request.args.get('sort', 'date_added')
    sort_order = request.args.get('order', 'desc')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))

    # Build query
    query = 'SELECT * FROM library_view WHERE 1=1'
    params = []

    if status:
        query += ' AND status = ?'
        params.append(status)

    if search:
        query += ' AND (title LIKE ? OR author LIKE ?)'
        search_term = f'%{search}%'
        params.extend([search_term, search_term])

    # Sorting
    valid_sorts = ['date_added', 'finished_reading_at', 'title', 'author', 'my_rating', 'page_count', 'year_published']
    if sort_by in valid_sorts:
        order = 'DESC' if sort_order.lower() == 'desc' else 'ASC'
        query += f' ORDER BY {sort_by} IS NULL, {sort_by} {order}'

    # Pagination
    offset = (page - 1) * per_page
    query += ' LIMIT ? OFFSET ?'
    params.extend([per_page, offset])

    cursor = db.execute(query, params)
    books = [dict_from_row(row) for row in cursor.fetchall()]

    # Add Open Library cover URLs for books without covers
    for book in books:
        if not book.get('cover_image_url'):
            isbn = book.get('isbn13') or book.get('isbn')
            if isbn:
                book['cover_image_url'] = get_open_library_cover_url(isbn=isbn, size='L')

    # Get total count
    count_query = 'SELECT COUNT(*) FROM library_view WHERE 1=1'
    count_params = []
    if status:
        count_query += ' AND status = ?'
        count_params.append(status)
    if search:
        count_query += ' AND (title LIKE ? OR author LIKE ?)'
        count_params.extend([f'%{search}%', f'%{search}%'])

    total = db.execute(count_query, count_params).fetchone()[0]

    return jsonify({
        'books': books,
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page,
    })


@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id: int):
    """Get a single book with all details."""
    db = get_db()

    cursor = db.execute('SELECT * FROM library_view WHERE book_id = ?', (book_id,))
    book = cursor.fetchone()

    if not book:
        return jsonify({'error': 'Book not found'}), 404

    book_dict = dict_from_row(book)

    # Add Open Library cover URL if missing
    if not book_dict.get('cover_image_url'):
        isbn = book_dict.get('isbn13') or book_dict.get('isbn')
        if isbn:
            book_dict['cover_image_url'] = get_open_library_cover_url(isbn=isbn, size='L')

    # Get tags
    cursor = db.execute('''
        SELECT t.id, t.name, t.color
        FROM tags t
        JOIN user_book_tags ubt ON t.id = ubt.tag_id
        WHERE ubt.user_book_id = ?
    ''', (book_dict['user_book_id'],))
    book_dict['tags'] = [dict_from_row(row) for row in cursor.fetchall()]

    # Get notes
    cursor = db.execute('''
        SELECT id, title, content, created_at, updated_at
        FROM notes
        WHERE user_book_id = ?
        ORDER BY created_at DESC
    ''', (book_dict['user_book_id'],))
    book_dict['notes'] = [dict_from_row(row) for row in cursor.fetchall()]

    # Get reading sessions
    cursor = db.execute('''
        SELECT id, started_at, finished_at, pages_read, notes, created_at
        FROM reading_sessions
        WHERE user_book_id = ?
        ORDER BY finished_at DESC
    ''', (book_dict['user_book_id'],))
    book_dict['reading_sessions'] = [dict_from_row(row) for row in cursor.fetchall()]

    return jsonify(book_dict)


@app.route('/api/books/<int:book_id>/enrich', methods=['POST'])
def enrich_book(book_id: int):
    """Fetch additional data from Open Library and update the book."""
    db = get_db()

    cursor = db.execute('SELECT * FROM books WHERE id = ?', (book_id,))
    book = cursor.fetchone()

    if not book:
        return jsonify({'error': 'Book not found'}), 404

    book_dict = dict_from_row(book)

    # Try ISBN13, then ISBN10, then title+author search
    ol_book = None
    if book_dict['isbn13']:
        ol_book = get_open_library_book_by_isbn(book_dict['isbn13'])
    if not ol_book and book_dict['isbn']:
        ol_book = get_open_library_book_by_isbn(book_dict['isbn'])
    if not ol_book:
        results = search_open_library(f"{book_dict['title']} {book_dict['author']}", limit=1)
        ol_book = results[0] if results else None

    if not ol_book:
        return jsonify({'error': 'Book not found in Open Library'}), 404

    info = extract_open_library_info(ol_book)

    # Update book with Open Library data
    db.execute('''
        UPDATE books
        SET google_books_id = ?,
            cover_image_url = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (info['open_library_key'], info['cover_image_url'], book_id))
    db.commit()

    return jsonify({
        'message': 'Book enriched successfully',
        'open_library_info': info,
    })


@app.route('/api/books/enrich-all', methods=['POST'])
def enrich_all_books():
    """Enrich books by fetching cover IDs from Open Library for better quality."""
    db = get_db()

    # Get books that don't have enriched covers yet
    cursor = db.execute('''
        SELECT id, isbn, isbn13, title, author
        FROM books
        WHERE cover_image_url IS NULL OR cover_image_url LIKE '%covers.openlibrary.org/b/isbn%'
        LIMIT 50
    ''')
    books = cursor.fetchall()

    enriched = 0
    failed = 0

    for book in books:
        book_dict = dict_from_row(book)
        ol_book = None

        # Search Open Library for book to get cover_id (higher quality than ISBN lookup)
        if book_dict['isbn13']:
            ol_book = get_open_library_book_by_isbn(book_dict['isbn13'])
        if not ol_book and book_dict['isbn']:
            ol_book = get_open_library_book_by_isbn(book_dict['isbn'])
        if not ol_book:
            results = search_open_library(f"{book_dict['title']} {book_dict['author']}", limit=1)
            ol_book = results[0] if results else None

        if ol_book:
            info = extract_open_library_info(ol_book)
            if info['cover_image_url']:
                db.execute('''
                    UPDATE books
                    SET google_books_id = ?,
                        cover_image_url = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (info['open_library_key'], info['cover_image_url'], book_dict['id']))
                enriched += 1
            else:
                failed += 1
        else:
            failed += 1

    db.commit()

    remaining = db.execute('''
        SELECT COUNT(*) FROM books
        WHERE cover_image_url IS NULL OR cover_image_url LIKE '%covers.openlibrary.org/b/isbn%'
    ''').fetchone()[0]

    return jsonify({
        'message': f'Enriched {enriched} books, {failed} not found',
        'enriched': enriched,
        'failed': failed,
        'remaining': remaining,
    })


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get library statistics."""
    db = get_db()

    stats = {}

    # Total books by status
    cursor = db.execute('SELECT status, COUNT(*) as count FROM user_books GROUP BY status')
    stats['by_status'] = {row['status']: row['count'] for row in cursor.fetchall()}
    stats['total_books'] = sum(stats['by_status'].values())

    # Books read by year
    cursor = db.execute('''
        SELECT strftime('%Y', finished_reading_at) as year, COUNT(*) as count
        FROM user_books
        WHERE finished_reading_at IS NOT NULL
        GROUP BY year
        ORDER BY year DESC
    ''')
    stats['books_by_year'] = {row['year']: row['count'] for row in cursor.fetchall() if row['year']}

    # Average days to read (from added to finished)
    cursor = db.execute('''
        SELECT AVG(days_to_read) as avg_days
        FROM library_view
        WHERE days_to_read IS NOT NULL AND days_to_read >= 0
    ''')
    result = cursor.fetchone()
    stats['avg_days_to_read'] = round(result['avg_days'], 1) if result['avg_days'] else None

    # Total pages read
    cursor = db.execute('''
        SELECT SUM(b.page_count) as total_pages
        FROM books b
        JOIN user_books ub ON b.id = ub.book_id
        WHERE ub.status = 'finished' AND b.page_count IS NOT NULL
    ''')
    result = cursor.fetchone()
    stats['total_pages_read'] = result['total_pages'] or 0

    # Top authors
    cursor = db.execute('''
        SELECT b.author, COUNT(*) as count
        FROM books b
        JOIN user_books ub ON b.id = ub.book_id
        GROUP BY b.author
        ORDER BY count DESC
        LIMIT 10
    ''')
    stats['top_authors'] = [{'author': row['author'], 'count': row['count']} for row in cursor.fetchall()]

    # Tag distribution
    cursor = db.execute('''
        SELECT t.name, COUNT(*) as count
        FROM tags t
        JOIN user_book_tags ubt ON t.id = ubt.tag_id
        GROUP BY t.id
        ORDER BY count DESC
        LIMIT 20
    ''')
    stats['top_tags'] = [{'tag': row['name'], 'count': row['count']} for row in cursor.fetchall()]

    return jsonify(stats)


@app.route('/api/tags', methods=['GET'])
def get_tags():
    """Get all tags."""
    db = get_db()
    cursor = db.execute('''
        SELECT t.id, t.name, t.color, COUNT(ubt.user_book_id) as book_count
        FROM tags t
        LEFT JOIN user_book_tags ubt ON t.id = ubt.tag_id
        GROUP BY t.id
        ORDER BY book_count DESC
    ''')
    tags = [dict_from_row(row) for row in cursor.fetchall()]
    return jsonify(tags)


@app.route('/api/search/openlibrary', methods=['GET'])
def search_openlibrary():
    """Search Open Library API directly."""
    query = request.args.get('q', '')
    if not query:
        return jsonify({'error': 'Query parameter q is required'}), 400

    limit = int(request.args.get('limit', 10))
    results = search_open_library(query, limit)

    books = [extract_open_library_info(book) for book in results]
    return jsonify({'results': books})


# --- Book Update API ---

@app.route('/api/books/<int:book_id>', methods=['PATCH'])
def update_book(book_id: int):
    """Update a book's progress, status, priority, or other fields."""
    db = get_db()
    data = request.get_json()

    cursor = db.execute('SELECT * FROM library_view WHERE book_id = ?', (book_id,))
    book = cursor.fetchone()

    if not book:
        return jsonify({'error': 'Book not found'}), 404

    user_book_id = book['user_book_id']
    page_count = book['page_count']

    # Build update query dynamically
    updates = []
    params = []

    allowed_fields = ['status', 'current_page', 'progress_percent', 'priority', 'why_reading', 'my_rating']
    for field in allowed_fields:
        if field in data:
            updates.append(f'{field} = ?')
            params.append(data[field])

    # Auto-calculate progress_percent if current_page is updated and page_count exists
    if 'current_page' in data and page_count and page_count > 0:
        progress = min(100, int((data['current_page'] / page_count) * 100))
        if 'progress_percent' not in data:
            updates.append('progress_percent = ?')
            params.append(progress)

    # Update last_read_at when progress changes
    if 'current_page' in data or 'progress_percent' in data:
        updates.append('last_read_at = CURRENT_TIMESTAMP')

    # Update started_reading_at when status changes to reading
    if data.get('status') == 'reading':
        cursor = db.execute('SELECT started_reading_at FROM user_books WHERE id = ?', (user_book_id,))
        existing = cursor.fetchone()
        if not existing['started_reading_at']:
            updates.append('started_reading_at = CURRENT_TIMESTAMP')

    # Update finished_reading_at when status changes to finished
    if data.get('status') == 'finished':
        updates.append('finished_reading_at = CURRENT_TIMESTAMP')
        updates.append('progress_percent = 100')
        if page_count:
            updates.append('current_page = ?')
            params.append(page_count)

    if not updates:
        return jsonify({'error': 'No valid fields to update'}), 400

    updates.append('updated_at = CURRENT_TIMESTAMP')
    params.append(user_book_id)

    query = f'UPDATE user_books SET {", ".join(updates)} WHERE id = ?'
    db.execute(query, params)
    db.commit()

    # Return updated book
    cursor = db.execute('SELECT * FROM library_view WHERE book_id = ?', (book_id,))
    updated_book = dict_from_row(cursor.fetchone())

    return jsonify(updated_book)


# --- Dashboard API ---

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    """Get aggregated dashboard data."""
    db = get_db()

    # Get currently reading books
    cursor = db.execute('''
        SELECT * FROM library_view
        WHERE status = 'reading'
        ORDER BY last_read_at DESC NULLS LAST, priority DESC
    ''')
    currently_reading = [dict_from_row(row) for row in cursor.fetchall()]

    # Add Open Library cover URLs for books without covers
    for book in currently_reading:
        if not book.get('cover_image_url'):
            isbn = book.get('isbn13') or book.get('isbn')
            if isbn:
                book['cover_image_url'] = get_open_library_cover_url(isbn=isbn, size='L')

    # Get queued books
    cursor = db.execute('''
        SELECT * FROM library_view
        WHERE status = 'queued'
        ORDER BY priority DESC, date_added ASC
        LIMIT 10
    ''')
    queued = [dict_from_row(row) for row in cursor.fetchall()]

    for book in queued:
        if not book.get('cover_image_url'):
            isbn = book.get('isbn13') or book.get('isbn')
            if isbn:
                book['cover_image_url'] = get_open_library_cover_url(isbn=isbn, size='L')

    # Get learning paths with progress
    cursor = db.execute('''
        SELECT
            lp.id,
            lp.name,
            lp.description,
            lp.color,
            COUNT(lpb.user_book_id) as total_books,
            SUM(CASE WHEN ub.status = 'finished' THEN 1 ELSE 0 END) as completed_books,
            (SELECT lv.title FROM learning_path_books lpb2
             JOIN library_view lv ON lv.user_book_id = lpb2.user_book_id
             JOIN user_books ub2 ON ub2.id = lpb2.user_book_id
             WHERE lpb2.learning_path_id = lp.id
             AND ub2.status IN ('queued', 'reading', 'owned', 'interested')
             ORDER BY lpb2.position ASC
             LIMIT 1) as next_book
        FROM learning_paths lp
        LEFT JOIN learning_path_books lpb ON lp.id = lpb.learning_path_id
        LEFT JOIN user_books ub ON lpb.user_book_id = ub.id
        GROUP BY lp.id
        ORDER BY lp.created_at DESC
    ''')
    paths = [dict_from_row(row) for row in cursor.fetchall()]

    # Get WIP limit
    cursor = db.execute("SELECT value FROM user_settings WHERE key = 'wip_limit'")
    row = cursor.fetchone()
    wip_limit = int(row['value']) if row else 5

    return jsonify({
        'currently_reading': currently_reading,
        'queued': queued,
        'learning_paths': paths,
        'wip_limit': wip_limit,
        'reading_count': len(currently_reading),
    })


# --- Learning Paths API ---

@app.route('/api/paths', methods=['GET'])
def get_paths():
    """Get all learning paths with book counts and progress."""
    db = get_db()

    cursor = db.execute('''
        SELECT
            lp.id,
            lp.name,
            lp.description,
            lp.color,
            lp.created_at,
            COUNT(lpb.user_book_id) as total_books,
            SUM(CASE WHEN ub.status = 'finished' THEN 1 ELSE 0 END) as completed_books
        FROM learning_paths lp
        LEFT JOIN learning_path_books lpb ON lp.id = lpb.learning_path_id
        LEFT JOIN user_books ub ON lpb.user_book_id = ub.id
        GROUP BY lp.id
        ORDER BY lp.created_at DESC
    ''')
    paths = [dict_from_row(row) for row in cursor.fetchall()]

    return jsonify(paths)


@app.route('/api/paths', methods=['POST'])
def create_path():
    """Create a new learning path."""
    db = get_db()
    data = request.get_json()

    if not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400

    cursor = db.execute('''
        INSERT INTO learning_paths (name, description, color)
        VALUES (?, ?, ?)
    ''', (data['name'], data.get('description', ''), data.get('color', '#58a6ff')))
    db.commit()

    path_id = cursor.lastrowid

    return jsonify({
        'id': path_id,
        'name': data['name'],
        'description': data.get('description', ''),
        'color': data.get('color', '#58a6ff'),
        'total_books': 0,
        'completed_books': 0,
    }), 201


@app.route('/api/paths/<int:path_id>', methods=['GET'])
def get_path(path_id: int):
    """Get a single learning path with its books."""
    db = get_db()

    cursor = db.execute('SELECT * FROM learning_paths WHERE id = ?', (path_id,))
    path = cursor.fetchone()

    if not path:
        return jsonify({'error': 'Path not found'}), 404

    path_dict = dict_from_row(path)

    # Get books in this path
    cursor = db.execute('''
        SELECT lv.*, lpb.position
        FROM library_view lv
        JOIN learning_path_books lpb ON lv.user_book_id = lpb.user_book_id
        WHERE lpb.learning_path_id = ?
        ORDER BY lpb.position ASC
    ''', (path_id,))
    books = [dict_from_row(row) for row in cursor.fetchall()]

    # Add cover URLs
    for book in books:
        if not book.get('cover_image_url'):
            isbn = book.get('isbn13') or book.get('isbn')
            if isbn:
                book['cover_image_url'] = get_open_library_cover_url(isbn=isbn, size='L')

    path_dict['books'] = books
    path_dict['total_books'] = len(books)
    path_dict['completed_books'] = sum(1 for b in books if b['status'] == 'finished')

    return jsonify(path_dict)


@app.route('/api/paths/<int:path_id>', methods=['PATCH'])
def update_path(path_id: int):
    """Update a learning path."""
    db = get_db()
    data = request.get_json()

    cursor = db.execute('SELECT * FROM learning_paths WHERE id = ?', (path_id,))
    path = cursor.fetchone()

    if not path:
        return jsonify({'error': 'Path not found'}), 404

    updates = []
    params = []

    for field in ['name', 'description', 'color']:
        if field in data:
            updates.append(f'{field} = ?')
            params.append(data[field])

    if not updates:
        return jsonify({'error': 'No valid fields to update'}), 400

    updates.append('updated_at = CURRENT_TIMESTAMP')
    params.append(path_id)

    query = f'UPDATE learning_paths SET {", ".join(updates)} WHERE id = ?'
    db.execute(query, params)
    db.commit()

    cursor = db.execute('SELECT * FROM learning_paths WHERE id = ?', (path_id,))
    updated_path = dict_from_row(cursor.fetchone())

    return jsonify(updated_path)


@app.route('/api/paths/<int:path_id>', methods=['DELETE'])
def delete_path(path_id: int):
    """Delete a learning path."""
    db = get_db()

    cursor = db.execute('SELECT * FROM learning_paths WHERE id = ?', (path_id,))
    if not cursor.fetchone():
        return jsonify({'error': 'Path not found'}), 404

    db.execute('DELETE FROM learning_paths WHERE id = ?', (path_id,))
    db.commit()

    return '', 204


@app.route('/api/paths/<int:path_id>/books', methods=['GET'])
def get_path_books(path_id: int):
    """Get all books in a learning path."""
    db = get_db()

    cursor = db.execute('SELECT * FROM learning_paths WHERE id = ?', (path_id,))
    if not cursor.fetchone():
        return jsonify({'error': 'Path not found'}), 404

    cursor = db.execute('''
        SELECT lv.*, lpb.position
        FROM library_view lv
        JOIN learning_path_books lpb ON lv.user_book_id = lpb.user_book_id
        WHERE lpb.learning_path_id = ?
        ORDER BY lpb.position ASC
    ''', (path_id,))
    books = [dict_from_row(row) for row in cursor.fetchall()]

    for book in books:
        if not book.get('cover_image_url'):
            isbn = book.get('isbn13') or book.get('isbn')
            if isbn:
                book['cover_image_url'] = get_open_library_cover_url(isbn=isbn, size='L')

    return jsonify(books)


@app.route('/api/paths/<int:path_id>/books', methods=['POST'])
def add_book_to_path(path_id: int):
    """Add a book to a learning path."""
    db = get_db()
    data = request.get_json()

    cursor = db.execute('SELECT * FROM learning_paths WHERE id = ?', (path_id,))
    if not cursor.fetchone():
        return jsonify({'error': 'Path not found'}), 404

    user_book_id = data.get('user_book_id')
    if not user_book_id:
        return jsonify({'error': 'user_book_id is required'}), 400

    cursor = db.execute('SELECT * FROM user_books WHERE id = ?', (user_book_id,))
    if not cursor.fetchone():
        return jsonify({'error': 'Book not found'}), 404

    # Check if already in path
    cursor = db.execute('''
        SELECT * FROM learning_path_books
        WHERE learning_path_id = ? AND user_book_id = ?
    ''', (path_id, user_book_id))
    if cursor.fetchone():
        return jsonify({'error': 'Book already in path'}), 409

    # Get next position
    cursor = db.execute('''
        SELECT MAX(position) as max_pos FROM learning_path_books WHERE learning_path_id = ?
    ''', (path_id,))
    row = cursor.fetchone()
    next_pos = (row['max_pos'] or 0) + 1

    position = data.get('position', next_pos)

    db.execute('''
        INSERT INTO learning_path_books (learning_path_id, user_book_id, position)
        VALUES (?, ?, ?)
    ''', (path_id, user_book_id, position))
    db.commit()

    return jsonify({'message': 'Book added to path', 'position': position}), 201


@app.route('/api/paths/<int:path_id>/books/<int:user_book_id>', methods=['DELETE'])
def remove_book_from_path(path_id: int, user_book_id: int):
    """Remove a book from a learning path."""
    db = get_db()

    cursor = db.execute('''
        SELECT * FROM learning_path_books
        WHERE learning_path_id = ? AND user_book_id = ?
    ''', (path_id, user_book_id))
    if not cursor.fetchone():
        return jsonify({'error': 'Book not in path'}), 404

    db.execute('''
        DELETE FROM learning_path_books
        WHERE learning_path_id = ? AND user_book_id = ?
    ''', (path_id, user_book_id))
    db.commit()

    return '', 204


@app.route('/api/paths/<int:path_id>/books/reorder', methods=['PATCH'])
def reorder_path_books(path_id: int):
    """Reorder books within a learning path."""
    db = get_db()
    data = request.get_json()

    cursor = db.execute('SELECT * FROM learning_paths WHERE id = ?', (path_id,))
    if not cursor.fetchone():
        return jsonify({'error': 'Path not found'}), 404

    # data should be a list of {user_book_id, position}
    book_order = data.get('books', [])
    if not book_order:
        return jsonify({'error': 'books list is required'}), 400

    for item in book_order:
        db.execute('''
            UPDATE learning_path_books
            SET position = ?
            WHERE learning_path_id = ? AND user_book_id = ?
        ''', (item['position'], path_id, item['user_book_id']))

    db.commit()

    return jsonify({'message': 'Books reordered'})


# --- Settings API ---

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get all user settings."""
    db = get_db()
    cursor = db.execute('SELECT key, value FROM user_settings')
    settings = {row['key']: row['value'] for row in cursor.fetchall()}

    # Add defaults if not set
    if 'wip_limit' not in settings:
        settings['wip_limit'] = '5'

    return jsonify(settings)


@app.route('/api/settings', methods=['PATCH'])
def update_settings():
    """Update user settings."""
    db = get_db()
    data = request.get_json()

    for key, value in data.items():
        db.execute('''
            INSERT INTO user_settings (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
        ''', (key, str(value), str(value)))

    db.commit()

    return jsonify(data)


# --- Pipeline/Books by Status API ---

@app.route('/api/pipeline', methods=['GET'])
def get_pipeline():
    """Get all books organized by status for the pipeline/kanban view."""
    db = get_db()

    pipeline = {}
    statuses = ['interested', 'owned', 'queued', 'reading', 'finished', 'abandoned']

    for status in statuses:
        cursor = db.execute('''
            SELECT * FROM library_view
            WHERE status = ?
            ORDER BY
                CASE WHEN status = 'reading' THEN last_read_at END DESC,
                CASE WHEN status = 'queued' THEN priority END DESC,
                CASE WHEN status = 'finished' THEN finished_reading_at END DESC,
                date_added DESC
        ''', (status,))
        books = [dict_from_row(row) for row in cursor.fetchall()]

        for book in books:
            if not book.get('cover_image_url'):
                isbn = book.get('isbn13') or book.get('isbn')
                if isbn:
                    book['cover_image_url'] = get_open_library_cover_url(isbn=isbn, size='L')

            # Get learning paths for this book
            cursor2 = db.execute('''
                SELECT lp.id, lp.name, lp.color
                FROM learning_paths lp
                JOIN learning_path_books lpb ON lp.id = lpb.learning_path_id
                WHERE lpb.user_book_id = ?
            ''', (book['user_book_id'],))
            book['paths'] = [dict_from_row(row) for row in cursor2.fetchall()]

        pipeline[status] = books

    # Get WIP limit
    cursor = db.execute("SELECT value FROM user_settings WHERE key = 'wip_limit'")
    row = cursor.fetchone()
    wip_limit = int(row['value']) if row else 5

    return jsonify({
        'pipeline': pipeline,
        'wip_limit': wip_limit,
    })


if __name__ == '__main__':
    app.run(debug=True, port=5001)

#!/usr/bin/env python3
"""Import Goodreads library export CSV into SQLite database."""

import csv
import sqlite3
import re
from pathlib import Path
from datetime import datetime


def clean_isbn(isbn_str: str) -> str | None:
    """Clean ISBN from Goodreads format (e.g., '="1234567890"' -> '1234567890')."""
    if not isbn_str:
        return None
    # Remove ="..." wrapper and quotes
    cleaned = re.sub(r'^="?"?|"?"?$', '', isbn_str)
    return cleaned if cleaned else None


def parse_date(date_str: str) -> str | None:
    """Parse Goodreads date format (YYYY/MM/DD) to ISO format."""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, "%Y/%m/%d")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None


def map_shelf_to_status(shelf: str) -> str:
    """Map Goodreads shelf names to our status enum."""
    mapping = {
        'read': 'read',
        'currently-reading': 'currently_reading',
        'to-read': 'want_to_read',
    }
    return mapping.get(shelf, 'want_to_read')


def parse_bookshelves(shelves_str: str) -> list[str]:
    """Parse comma-separated bookshelves, excluding the exclusive shelf."""
    if not shelves_str:
        return []
    # Split by comma and clean up
    shelves = [s.strip() for s in shelves_str.split(',')]
    # Filter out the exclusive shelves
    excluded = {'read', 'currently-reading', 'to-read'}
    return [s for s in shelves if s and s not in excluded]


def import_csv(csv_path: str, db_path: str):
    """Import Goodreads CSV export into SQLite database."""
    # Read schema and create database
    schema_path = Path(__file__).parent / 'schema.sql'
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Execute schema
    with open(schema_path) as f:
        cursor.executescript(f.read())

    # Read CSV
    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        books_inserted = 0
        tags_cache = {}  # name -> id

        for row in reader:
            # Insert book
            cursor.execute('''
                INSERT OR IGNORE INTO books (
                    goodreads_id, isbn, isbn13, title, author, additional_authors,
                    publisher, binding, page_count, year_published,
                    original_publication_year, goodreads_avg_rating
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                row['Book Id'],
                clean_isbn(row['ISBN']),
                clean_isbn(row['ISBN13']),
                row['Title'],
                row['Author'],
                row['Additional Authors'] or None,
                row['Publisher'] or None,
                row['Binding'] or None,
                int(row['Number of Pages']) if row['Number of Pages'] else None,
                int(row['Year Published']) if row['Year Published'] else None,
                int(row['Original Publication Year']) if row['Original Publication Year'] else None,
                float(row['Average Rating']) if row['Average Rating'] else None,
            ))

            # Get book ID (may have been inserted earlier if duplicate)
            cursor.execute('SELECT id FROM books WHERE goodreads_id = ?', (row['Book Id'],))
            book_id = cursor.fetchone()[0]

            # Insert user_book relationship
            status = map_shelf_to_status(row['Exclusive Shelf'])
            my_rating = int(row['My Rating']) if row['My Rating'] and int(row['My Rating']) > 0 else None

            cursor.execute('''
                INSERT OR REPLACE INTO user_books (
                    book_id, status, my_rating, date_added, finished_reading_at,
                    read_count, owned_copies, goodreads_review
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                book_id,
                status,
                my_rating,
                parse_date(row['Date Added']),
                parse_date(row['Date Read']),
                int(row['Read Count']) if row['Read Count'] else 0,
                int(row['Owned Copies']) if row['Owned Copies'] else 0,
                row['My Review'] if row['My Review'] else None,
            ))

            # Get user_book ID
            cursor.execute('SELECT id FROM user_books WHERE book_id = ?', (book_id,))
            user_book_id = cursor.fetchone()[0]

            # Create reading session if book was read
            if status == 'read' and parse_date(row['Date Read']):
                cursor.execute('''
                    INSERT INTO reading_sessions (user_book_id, finished_at)
                    VALUES (?, ?)
                ''', (user_book_id, parse_date(row['Date Read'])))

            # Process custom tags/bookshelves
            custom_shelves = parse_bookshelves(row['Bookshelves'])
            for shelf_name in custom_shelves:
                # Get or create tag
                if shelf_name not in tags_cache:
                    cursor.execute('INSERT OR IGNORE INTO tags (name) VALUES (?)', (shelf_name,))
                    cursor.execute('SELECT id FROM tags WHERE name = ?', (shelf_name,))
                    tags_cache[shelf_name] = cursor.fetchone()[0]

                tag_id = tags_cache[shelf_name]
                cursor.execute('''
                    INSERT OR IGNORE INTO user_book_tags (user_book_id, tag_id)
                    VALUES (?, ?)
                ''', (user_book_id, tag_id))

            books_inserted += 1

    conn.commit()

    # Print summary
    cursor.execute('SELECT COUNT(*) FROM books')
    total_books = cursor.fetchone()[0]

    cursor.execute('SELECT status, COUNT(*) FROM user_books GROUP BY status')
    status_counts = dict(cursor.fetchall())

    cursor.execute('SELECT COUNT(*) FROM tags')
    total_tags = cursor.fetchone()[0]

    print(f"Import complete!")
    print(f"  Total books: {total_books}")
    print(f"  Status breakdown:")
    for status, count in status_counts.items():
        print(f"    - {status}: {count}")
    print(f"  Custom tags imported: {total_tags}")

    conn.close()


if __name__ == '__main__':
    import sys

    csv_path = sys.argv[1] if len(sys.argv) > 1 else '../goodreads_library_export.csv'
    db_path = sys.argv[2] if len(sys.argv) > 2 else 'books.db'

    import_csv(csv_path, db_path)

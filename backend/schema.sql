-- Book Tracker Database Schema
-- Designed for future migration to Supabase (PostgreSQL-compatible)

-- Core book information (immutable reference data)
CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goodreads_id TEXT UNIQUE,
    google_books_id TEXT,
    isbn TEXT,
    isbn13 TEXT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    additional_authors TEXT,
    publisher TEXT,
    binding TEXT,
    page_count INTEGER,
    year_published INTEGER,
    original_publication_year INTEGER,
    description TEXT,
    cover_image_url TEXT,
    goodreads_avg_rating REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User's relationship with books (reading status, personal rating)
-- Status pipeline: want_to_read → queued → reading → finished/abandoned
CREATE TABLE IF NOT EXISTS user_books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    status TEXT CHECK(status IN ('want_to_read', 'queued', 'reading', 'finished', 'abandoned')) NOT NULL,
    my_rating INTEGER CHECK(my_rating >= 0 AND my_rating <= 5),
    date_added TIMESTAMP,
    started_reading_at TIMESTAMP,
    finished_reading_at TIMESTAMP,
    read_count INTEGER DEFAULT 0,
    owned_copies INTEGER DEFAULT 0,
    is_private INTEGER DEFAULT 0,
    goodreads_review TEXT,
    -- New progress tracking fields
    current_page INTEGER DEFAULT 0,
    progress_percent INTEGER DEFAULT 0,
    last_read_at TIMESTAMP,
    why_reading TEXT,  -- Context note for why you're reading this book
    priority INTEGER DEFAULT 0,  -- For queue ordering (higher = more important)
    -- Format ownership (v1)
    owns_kindle INTEGER DEFAULT 0,
    owns_audible INTEGER DEFAULT 0,
    owns_hardcopy INTEGER DEFAULT 0,
    -- Idea source tracking (v1)
    idea_source TEXT,
    source_book_id INTEGER REFERENCES books(id),
    date_captured DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(book_id)
);

-- Track individual reading sessions (for re-reads and detailed metrics)
CREATE TABLE IF NOT EXISTS reading_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    pages_read INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Markdown notes for books (separate from reading sessions for flexibility)
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-defined tags/shelves
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many relationship between user_books and tags
CREATE TABLE IF NOT EXISTS user_book_tags (
    user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    position INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_book_id, tag_id)
);

-- Learning paths (project-based reading lists)
CREATE TABLE IF NOT EXISTS learning_paths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    objective TEXT,  -- v1: What you want to achieve with this learning path
    color TEXT DEFAULT '#58a6ff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books in learning paths (many-to-many with ordering)
CREATE TABLE IF NOT EXISTS learning_path_books (
    learning_path_id INTEGER NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,  -- Order within path
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (learning_path_id, user_book_id)
);

-- User settings (key-value store)
CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_isbn13 ON books(isbn13);
CREATE INDEX IF NOT EXISTS idx_books_google_id ON books(google_books_id);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_user_books_status ON user_books(status);
CREATE INDEX IF NOT EXISTS idx_user_books_date_added ON user_books(date_added);
CREATE INDEX IF NOT EXISTS idx_user_books_finished ON user_books(finished_reading_at);
CREATE INDEX IF NOT EXISTS idx_user_books_priority ON user_books(priority);
CREATE INDEX IF NOT EXISTS idx_user_books_last_read ON user_books(last_read_at);
CREATE INDEX IF NOT EXISTS idx_notes_user_book ON notes(user_book_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_learning_path_books_path ON learning_path_books(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_books_book ON learning_path_books(user_book_id);
CREATE INDEX IF NOT EXISTS idx_user_books_source_book ON user_books(source_book_id);

-- View for easy querying of books with user data
CREATE VIEW IF NOT EXISTS library_view AS
SELECT
    b.id as book_id,
    b.goodreads_id,
    b.google_books_id,
    b.isbn,
    b.isbn13,
    b.title,
    b.author,
    b.additional_authors,
    b.publisher,
    b.binding,
    b.page_count,
    b.year_published,
    b.original_publication_year,
    b.description,
    b.cover_image_url,
    b.goodreads_avg_rating,
    ub.id as user_book_id,
    ub.status,
    ub.my_rating,
    ub.date_added,
    ub.started_reading_at,
    ub.finished_reading_at,
    ub.read_count,
    ub.owned_copies,
    ub.is_private,
    ub.goodreads_review,
    ub.current_page,
    ub.progress_percent,
    ub.last_read_at,
    ub.why_reading,
    ub.priority,
    ub.owns_kindle,
    ub.owns_audible,
    ub.owns_hardcopy,
    ub.idea_source,
    ub.source_book_id,
    ub.date_captured,
    -- Calculate days from added to read (for metrics)
    CAST(julianday(ub.finished_reading_at) - julianday(ub.date_added) AS INTEGER) as days_to_read,
    -- Calculate if book is stale (not touched in 30+ days)
    CASE WHEN ub.status = 'reading' AND ub.last_read_at IS NOT NULL
         AND julianday('now') - julianday(ub.last_read_at) > 30
         THEN 1 ELSE 0 END as is_stale
FROM books b
JOIN user_books ub ON b.id = ub.book_id;

#!/usr/bin/env python3
"""
Book Tracker v1 Migration
Adds format ownership, idea source tracking, and learning path objectives.
"""

import sqlite3
from pathlib import Path
import os

def get_database_path():
    """Get database path, supporting Railway volume mount."""
    volume_path = os.environ.get('RAILWAY_VOLUME_MOUNT_PATH')
    if volume_path:
        return Path(volume_path) / 'books.db'
    return Path(__file__).parent / 'books.db'

def migrate():
    """Run v1 migration."""
    db_path = get_database_path()
    print(f"Migrating database at: {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get existing columns in user_books
    cursor.execute("PRAGMA table_info(user_books)")
    existing_columns = {row[1] for row in cursor.fetchall()}

    # Add format ownership columns to user_books
    new_user_book_columns = [
        ('owns_kindle', 'INTEGER DEFAULT 0'),
        ('owns_audible', 'INTEGER DEFAULT 0'),
        ('owns_hardcopy', 'INTEGER DEFAULT 0'),
        ('idea_source', 'TEXT'),
        ('source_book_id', 'INTEGER REFERENCES books(id)'),
        ('date_captured', 'DATE'),
    ]

    for col_name, col_def in new_user_book_columns:
        if col_name not in existing_columns:
            print(f"Adding column: user_books.{col_name}")
            cursor.execute(f"ALTER TABLE user_books ADD COLUMN {col_name} {col_def}")

    # Get existing columns in learning_paths
    cursor.execute("PRAGMA table_info(learning_paths)")
    path_columns = {row[1] for row in cursor.fetchall()}

    # Add objective column to learning_paths
    if 'objective' not in path_columns:
        print("Adding column: learning_paths.objective")
        cursor.execute("ALTER TABLE learning_paths ADD COLUMN objective TEXT")

    # Create index for source_book_id
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='index' AND name='idx_user_books_source_book'
    """)
    if not cursor.fetchone():
        print("Creating index: idx_user_books_source_book")
        cursor.execute("CREATE INDEX idx_user_books_source_book ON user_books(source_book_id)")

    # Drop and recreate library_view to include new columns
    print("Updating library_view...")
    cursor.execute("DROP VIEW IF EXISTS library_view")
    cursor.execute("""
        CREATE VIEW library_view AS
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
            CAST(julianday(ub.finished_reading_at) - julianday(ub.date_added) AS INTEGER) as days_to_read,
            CASE WHEN ub.status = 'reading' AND ub.last_read_at IS NOT NULL
                 AND julianday('now') - julianday(ub.last_read_at) > 30
                 THEN 1 ELSE 0 END as is_stale
        FROM books b
        JOIN user_books ub ON b.id = ub.book_id
    """)

    conn.commit()
    conn.close()

    print("Migration complete!")

if __name__ == '__main__':
    migrate()

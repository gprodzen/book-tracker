#!/usr/bin/env python3
"""
Database migration script for Book Tracker redesign.

Migrates from the old schema to the new project management-style schema:
- Adds new status values: interested, owned, queued, reading, finished, abandoned
- Adds progress tracking columns: current_page, progress_percent, last_read_at, why_reading, priority
- Creates learning_paths and learning_path_books tables
- Creates user_settings table with default WIP limit
"""

import sqlite3
from pathlib import Path

DATABASE = Path(__file__).parent / 'books.db'


def migrate():
    """Run all migrations."""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("Starting migration...")

    # Check current schema
    cursor.execute("PRAGMA table_info(user_books)")
    columns = {row['name'] for row in cursor.fetchall()}

    # Step 1: Add new columns to user_books if they don't exist
    new_columns = [
        ('current_page', 'INTEGER DEFAULT 0'),
        ('progress_percent', 'INTEGER DEFAULT 0'),
        ('last_read_at', 'TIMESTAMP'),
        ('why_reading', 'TEXT'),
        ('priority', 'INTEGER DEFAULT 0'),
    ]

    for col_name, col_def in new_columns:
        if col_name not in columns:
            print(f"  Adding column: {col_name}")
            cursor.execute(f"ALTER TABLE user_books ADD COLUMN {col_name} {col_def}")

    # Step 2: Create learning_paths table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS learning_paths (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            color TEXT DEFAULT '#58a6ff',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("  Created learning_paths table")

    # Step 3: Create learning_path_books table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS learning_path_books (
            learning_path_id INTEGER NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
            user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
            position INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (learning_path_id, user_book_id)
        )
    """)
    print("  Created learning_path_books table")

    # Step 4: Create user_settings table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("  Created user_settings table")

    # Step 5: Set default WIP limit
    cursor.execute("""
        INSERT OR IGNORE INTO user_settings (key, value) VALUES ('wip_limit', '5')
    """)
    print("  Set default WIP limit to 5")

    # Step 6: Create new indexes
    indexes = [
        ('idx_user_books_priority', 'user_books(priority)'),
        ('idx_user_books_last_read', 'user_books(last_read_at)'),
        ('idx_learning_path_books_path', 'learning_path_books(learning_path_id)'),
        ('idx_learning_path_books_book', 'learning_path_books(user_book_id)'),
    ]

    for idx_name, idx_def in indexes:
        cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON {idx_def}")
    print("  Created indexes")

    # Step 7: Migrate status values
    # Old: want_to_read, currently_reading, read, did_not_finish
    # New: interested, owned, queued, reading, finished, abandoned
    status_mapping = {
        'want_to_read': 'interested',
        'currently_reading': 'reading',
        'read': 'finished',
        'did_not_finish': 'abandoned',
    }

    # First, check if we need to migrate (if old statuses exist)
    cursor.execute("SELECT DISTINCT status FROM user_books")
    current_statuses = {row['status'] for row in cursor.fetchall()}
    old_statuses = set(status_mapping.keys())

    if current_statuses & old_statuses:
        print("  Migrating status values...")

        # Need to temporarily disable the CHECK constraint
        # SQLite doesn't support ALTER CONSTRAINT, so we need to recreate the table

        # Get counts before migration
        for old_status, new_status in status_mapping.items():
            cursor.execute("SELECT COUNT(*) as cnt FROM user_books WHERE status = ?", (old_status,))
            count = cursor.fetchone()['cnt']
            if count > 0:
                print(f"    {old_status} -> {new_status}: {count} books")

        # Drop the view first since it references user_books
        cursor.execute("DROP VIEW IF EXISTS library_view")

        # Create new table with updated CHECK constraint
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_books_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
                status TEXT CHECK(status IN ('interested', 'owned', 'queued', 'reading', 'finished', 'abandoned')) NOT NULL,
                my_rating INTEGER CHECK(my_rating >= 0 AND my_rating <= 5),
                date_added TIMESTAMP,
                started_reading_at TIMESTAMP,
                finished_reading_at TIMESTAMP,
                read_count INTEGER DEFAULT 0,
                owned_copies INTEGER DEFAULT 0,
                is_private INTEGER DEFAULT 0,
                goodreads_review TEXT,
                current_page INTEGER DEFAULT 0,
                progress_percent INTEGER DEFAULT 0,
                last_read_at TIMESTAMP,
                why_reading TEXT,
                priority INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(book_id)
            )
        """)

        # Copy data with status transformation
        cursor.execute("""
            INSERT INTO user_books_new
            SELECT
                id,
                book_id,
                CASE status
                    WHEN 'want_to_read' THEN 'interested'
                    WHEN 'currently_reading' THEN 'reading'
                    WHEN 'read' THEN 'finished'
                    WHEN 'did_not_finish' THEN 'abandoned'
                    ELSE status
                END as status,
                my_rating,
                date_added,
                started_reading_at,
                finished_reading_at,
                read_count,
                owned_copies,
                is_private,
                goodreads_review,
                COALESCE(current_page, 0),
                COALESCE(progress_percent, 0),
                last_read_at,
                why_reading,
                COALESCE(priority, 0),
                created_at,
                updated_at
            FROM user_books
        """)

        # Drop old table and rename new
        cursor.execute("DROP TABLE user_books")
        cursor.execute("ALTER TABLE user_books_new RENAME TO user_books")

        # Recreate indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_books_status ON user_books(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_books_date_added ON user_books(date_added)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_books_finished ON user_books(finished_reading_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_books_priority ON user_books(priority)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_books_last_read ON user_books(last_read_at)")

        print("  Status migration complete")
    else:
        print("  Status values already migrated or no old statuses found")

    # Step 8: Drop and recreate library_view with new columns
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
            CAST(julianday(ub.finished_reading_at) - julianday(ub.date_added) AS INTEGER) as days_to_read,
            CASE WHEN ub.status = 'reading' AND ub.last_read_at IS NOT NULL
                 AND julianday('now') - julianday(ub.last_read_at) > 30
                 THEN 1 ELSE 0 END as is_stale
        FROM books b
        JOIN user_books ub ON b.id = ub.book_id
    """)
    print("  Recreated library_view")

    # Commit all changes
    conn.commit()

    # Print summary
    cursor.execute("SELECT status, COUNT(*) as cnt FROM user_books GROUP BY status")
    print("\nFinal status counts:")
    for row in cursor.fetchall():
        print(f"  {row['status']}: {row['cnt']}")

    cursor.execute("SELECT COUNT(*) as cnt FROM learning_paths")
    print(f"\nLearning paths: {cursor.fetchone()['cnt']}")

    cursor.execute("SELECT key, value FROM user_settings")
    print("\nSettings:")
    for row in cursor.fetchall():
        print(f"  {row['key']}: {row['value']}")

    conn.close()
    print("\nMigration complete!")


if __name__ == '__main__':
    migrate()

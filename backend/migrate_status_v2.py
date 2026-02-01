#!/usr/bin/env python3
"""
Migration script: Schema Refactor v2 - Book Status Pipeline

This migration transforms the book status schema from 6 states to 5 states:
- Before: interested → owned → queued → reading → finished/abandoned
- After: want_to_read → queued → reading → finished/abandoned

Key changes:
- 'interested' → 'want_to_read'
- 'owned' → 'want_to_read' + set owns_hardcopy=1 (ownership becomes an attribute)
- All other statuses remain unchanged
"""

import sqlite3
import os
from pathlib import Path


def get_database_path():
    """Get database path, supporting Railway volume mount."""
    volume_path = os.environ.get('RAILWAY_VOLUME_MOUNT_PATH')
    if volume_path:
        return Path(volume_path) / 'books.db'
    return Path(__file__).parent / 'books.db'


def migrate():
    """Run the status schema migration."""
    db_path = get_database_path()

    if not db_path.exists():
        print(f"Database not found at {db_path}. Skipping migration.")
        return

    print(f"Running status schema migration on {db_path}")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Step 1: Check current schema
        cursor.execute("SELECT COUNT(*) FROM user_books WHERE status IN ('interested', 'owned')")
        count_to_migrate = cursor.fetchone()[0]
        print(f"Found {count_to_migrate} books with 'interested' or 'owned' status to migrate")

        # Check if migration already done
        cursor.execute("SELECT COUNT(*) FROM user_books WHERE status = 'want_to_read'")
        already_migrated = cursor.fetchone()[0]
        if already_migrated > 0:
            print("Migration appears to have already been run (found 'want_to_read' status). Checking for remaining old statuses...")
            cursor.execute("SELECT COUNT(*) FROM user_books WHERE status IN ('interested', 'owned')")
            remaining = cursor.fetchone()[0]
            if remaining == 0:
                print("No old statuses found. Migration complete.")
                return

        # Step 2: Drop the library_view
        print("Dropping library_view...")
        cursor.execute("DROP VIEW IF EXISTS library_view")

        # Step 3: Create new user_books table with updated CHECK constraint
        print("Creating new user_books table with updated CHECK constraint...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_books_new (
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
                current_page INTEGER DEFAULT 0,
                progress_percent INTEGER DEFAULT 0,
                last_read_at TIMESTAMP,
                why_reading TEXT,
                priority INTEGER DEFAULT 0,
                owns_kindle INTEGER DEFAULT 0,
                owns_audible INTEGER DEFAULT 0,
                owns_hardcopy INTEGER DEFAULT 0,
                idea_source TEXT,
                source_book_id INTEGER REFERENCES books(id),
                date_captured DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(book_id)
            )
        """)

        # Step 4: Copy data with status transformation
        print("Copying data with status transformation...")
        cursor.execute("""
            INSERT INTO user_books_new (
                id, book_id, status, my_rating, date_added, started_reading_at,
                finished_reading_at, read_count, owned_copies, is_private,
                goodreads_review, current_page, progress_percent, last_read_at,
                why_reading, priority, owns_kindle, owns_audible, owns_hardcopy,
                idea_source, source_book_id, date_captured, created_at, updated_at
            )
            SELECT
                id, book_id,
                CASE
                    WHEN status = 'interested' THEN 'want_to_read'
                    WHEN status = 'owned' THEN 'want_to_read'
                    ELSE status
                END as status,
                my_rating, date_added, started_reading_at, finished_reading_at,
                read_count, owned_copies, is_private, goodreads_review,
                current_page, progress_percent, last_read_at, why_reading,
                priority, owns_kindle, owns_audible,
                CASE
                    WHEN status = 'owned' THEN 1
                    ELSE owns_hardcopy
                END as owns_hardcopy,
                idea_source, source_book_id, date_captured, created_at, updated_at
            FROM user_books
        """)

        migrated_count = cursor.rowcount
        print(f"Migrated {migrated_count} records")

        # Step 5: Count books that were 'owned' and got owns_hardcopy set
        cursor.execute("""
            SELECT COUNT(*) FROM user_books WHERE status = 'owned'
        """)
        owned_count = cursor.fetchone()[0]
        print(f"Set owns_hardcopy=1 for {owned_count} previously 'owned' books")

        # Step 6: Rename tables
        print("Swapping tables...")
        cursor.execute("DROP TABLE user_books")
        cursor.execute("ALTER TABLE user_books_new RENAME TO user_books")

        # Step 7: Recreate indexes
        print("Recreating indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_books_status ON user_books(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_books_date_added ON user_books(date_added)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_books_finished ON user_books(finished_reading_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_books_priority ON user_books(priority)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_books_last_read ON user_books(last_read_at)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_books_source_book ON user_books(source_book_id)")

        # Step 8: Recreate library_view
        print("Recreating library_view...")
        cursor.execute("""
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
                CAST(julianday(ub.finished_reading_at) - julianday(ub.date_added) AS INTEGER) as days_to_read,
                CASE WHEN ub.status = 'reading' AND ub.last_read_at IS NOT NULL
                     AND julianday('now') - julianday(ub.last_read_at) > 30
                     THEN 1 ELSE 0 END as is_stale
            FROM books b
            JOIN user_books ub ON b.id = ub.book_id
        """)

        conn.commit()

        # Step 9: Verify migration
        print("\nVerifying migration...")
        cursor.execute("SELECT status, COUNT(*) FROM user_books GROUP BY status ORDER BY status")
        status_counts = cursor.fetchall()
        print("Status counts after migration:")
        for status, count in status_counts:
            print(f"  {status}: {count}")

        # Check for any remaining old statuses
        cursor.execute("SELECT COUNT(*) FROM user_books WHERE status IN ('interested', 'owned')")
        remaining_old = cursor.fetchone()[0]
        if remaining_old > 0:
            print(f"\nWARNING: Found {remaining_old} records with old status values!")
        else:
            print("\nMigration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        conn.close()


if __name__ == '__main__':
    migrate()

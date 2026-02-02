#!/usr/bin/env python3
"""
Migration: add progress_updates table for state-first logging.
"""

import sqlite3
from pathlib import Path

DATABASE = Path(__file__).parent / 'books.db'


def migrate():
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS progress_updates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_book_id INTEGER NOT NULL REFERENCES user_books(id) ON DELETE CASCADE,
            input_mode TEXT CHECK(input_mode IN ('page', 'percent')) NOT NULL,
            previous_page INTEGER,
            current_page INTEGER,
            previous_percent INTEGER,
            current_percent INTEGER,
            delta_pages INTEGER,
            delta_percent INTEGER,
            note TEXT,
            source TEXT DEFAULT 'manual',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_progress_updates_user_book_id ON progress_updates(user_book_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_progress_updates_created_at ON progress_updates(created_at)")

    conn.commit()
    conn.close()
    print("progress_updates migration complete")


if __name__ == '__main__':
    migrate()

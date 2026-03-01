"""
SQLite database management for xeepy.

Provides low-level database operations and schema management.
"""

import sqlite3
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Any
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class Database:
    """
    SQLite database manager for xeepy.
    
    Handles connection management, schema initialization,
    and provides utility methods for common operations.
    """
    
    SCHEMA_VERSION = 1
    
    def __init__(self, db_path: str = 'xeepy_tracker.db'):
        """
        Initialize database connection.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._connection: Optional[sqlite3.Connection] = None
        self._init_database()
    
    @property
    def connection(self) -> sqlite3.Connection:
        """Get or create database connection."""
        if self._connection is None:
            self._connection = sqlite3.connect(
                str(self.db_path),
                detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
            )
            self._connection.row_factory = sqlite3.Row
            # Enable foreign keys
            self._connection.execute('PRAGMA foreign_keys = ON')
        return self._connection
    
    @contextmanager
    def transaction(self):
        """Context manager for database transactions."""
        conn = self.connection
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Transaction failed: {e}")
            raise
    
    def _init_database(self):
        """Initialize database schema."""
        with self.transaction() as conn:
            # Schema version tracking
            conn.execute('''
                CREATE TABLE IF NOT EXISTS schema_version (
                    version INTEGER PRIMARY KEY,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Follow actions table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS follow_actions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    action_type TEXT NOT NULL CHECK(action_type IN ('follow', 'unfollow')),
                    source TEXT,
                    reason TEXT,
                    followed_back INTEGER DEFAULT 0,
                    followed_back_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    metadata TEXT
                )
            ''')
            
            # Create indexes for common queries
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_follow_actions_username 
                ON follow_actions(username)
            ''')
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_follow_actions_type 
                ON follow_actions(action_type)
            ''')
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_follow_actions_created 
                ON follow_actions(created_at)
            ''')
            
            # User profiles cache
            conn.execute('''
                CREATE TABLE IF NOT EXISTS user_profiles (
                    username TEXT PRIMARY KEY,
                    display_name TEXT,
                    bio TEXT,
                    followers_count INTEGER,
                    following_count INTEGER,
                    tweets_count INTEGER,
                    verified INTEGER DEFAULT 0,
                    profile_image_url TEXT,
                    created_at TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Whitelist table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS whitelist (
                    username TEXT PRIMARY KEY,
                    reason TEXT,
                    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Action sessions (for resumability)
            conn.execute('''
                CREATE TABLE IF NOT EXISTS action_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_type TEXT NOT NULL,
                    status TEXT DEFAULT 'in_progress',
                    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    total_count INTEGER DEFAULT 0,
                    success_count INTEGER DEFAULT 0,
                    failed_count INTEGER DEFAULT 0,
                    skipped_count INTEGER DEFAULT 0,
                    metadata TEXT
                )
            ''')
            
            # Session items (for resumability)
            conn.execute('''
                CREATE TABLE IF NOT EXISTS session_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    username TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    processed_at TIMESTAMP,
                    error_message TEXT,
                    FOREIGN KEY (session_id) REFERENCES action_sessions(id)
                )
            ''')
            
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_session_items_session 
                ON session_items(session_id)
            ''')
            
            # Analytics table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS daily_stats (
                    date TEXT PRIMARY KEY,
                    follows INTEGER DEFAULT 0,
                    unfollows INTEGER DEFAULT 0,
                    follow_backs INTEGER DEFAULT 0,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Record schema version
            cursor = conn.execute('SELECT MAX(version) FROM schema_version')
            current_version = cursor.fetchone()[0]
            if current_version is None or current_version < self.SCHEMA_VERSION:
                conn.execute(
                    'INSERT OR REPLACE INTO schema_version (version) VALUES (?)',
                    (self.SCHEMA_VERSION,)
                )
        
        logger.info(f"Database initialized at {self.db_path}")
    
    def execute(self, query: str, params: tuple = ()) -> sqlite3.Cursor:
        """Execute a SQL query."""
        return self.connection.execute(query, params)
    
    def executemany(self, query: str, params_list: list) -> sqlite3.Cursor:
        """Execute a SQL query with multiple parameter sets."""
        return self.connection.executemany(query, params_list)
    
    def fetchone(self, query: str, params: tuple = ()) -> Optional[sqlite3.Row]:
        """Execute query and fetch one result."""
        cursor = self.execute(query, params)
        return cursor.fetchone()
    
    def fetchall(self, query: str, params: tuple = ()) -> list[sqlite3.Row]:
        """Execute query and fetch all results."""
        cursor = self.execute(query, params)
        return cursor.fetchall()
    
    def insert(self, table: str, data: dict) -> int:
        """Insert a row and return the last row id."""
        columns = ', '.join(data.keys())
        placeholders = ', '.join(['?' for _ in data])
        query = f'INSERT INTO {table} ({columns}) VALUES ({placeholders})'
        
        with self.transaction() as conn:
            cursor = conn.execute(query, tuple(data.values()))
            return cursor.lastrowid
    
    def update(self, table: str, data: dict, where: str, params: tuple = ()) -> int:
        """Update rows and return affected count."""
        set_clause = ', '.join([f'{k} = ?' for k in data.keys()])
        query = f'UPDATE {table} SET {set_clause} WHERE {where}'
        
        with self.transaction() as conn:
            cursor = conn.execute(query, tuple(data.values()) + params)
            return cursor.rowcount
    
    def delete(self, table: str, where: str, params: tuple = ()) -> int:
        """Delete rows and return affected count."""
        query = f'DELETE FROM {table} WHERE {where}'
        
        with self.transaction() as conn:
            cursor = conn.execute(query, params)
            return cursor.rowcount
    
    def count(self, table: str, where: str = None, params: tuple = ()) -> int:
        """Count rows in a table."""
        query = f'SELECT COUNT(*) FROM {table}'
        if where:
            query += f' WHERE {where}'
        cursor = self.execute(query, params)
        return cursor.fetchone()[0]
    
    def close(self):
        """Close database connection."""
        if self._connection:
            self._connection.close()
            self._connection = None
            logger.debug("Database connection closed")
    
    def vacuum(self):
        """Optimize database by running VACUUM."""
        self.connection.execute('VACUUM')
        logger.info("Database vacuumed")
    
    def backup(self, backup_path: str):
        """Create a backup of the database."""
        backup_db = sqlite3.connect(backup_path)
        self.connection.backup(backup_db)
        backup_db.close()
        logger.info(f"Database backed up to {backup_path}")
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

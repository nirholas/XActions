"""
Snapshot storage for follower/following comparisons.

Store and retrieve snapshots of followers/following lists to detect changes over time.
"""

import json
import sqlite3
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional


@dataclass
class SnapshotMetadata:
    """Metadata for a stored snapshot"""
    snapshot_id: str
    username: str
    snapshot_type: str  # 'followers' or 'following'
    count: int
    created_at: datetime
    
    def to_dict(self) -> dict:
        return {
            "snapshot_id": self.snapshot_id,
            "username": self.username,
            "snapshot_type": self.snapshot_type,
            "count": self.count,
            "created_at": self.created_at.isoformat(),
        }


class SnapshotStorage:
    """
    Store follower/following snapshots for comparison.
    
    Uses SQLite for efficient storage and retrieval of user snapshots.
    Supports comparing snapshots to detect unfollowers and new followers.
    
    Example:
        storage = SnapshotStorage()
        
        # Save current followers
        snapshot_id = storage.save_snapshot("myuser", "followers", {"user1", "user2", "user3"})
        
        # Later, load and compare
        old_followers = storage.load_snapshot("myuser", "followers")
        # Compare with current followers to find changes
    """
    
    def __init__(self, db_path: str = "xeepy_snapshots.db"):
        """
        Initialize snapshot storage.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = Path(db_path)
        self._init_db()
    
    def _init_db(self) -> None:
        """Initialize database schema"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Snapshots metadata table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS snapshots (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    snapshot_type TEXT NOT NULL,
                    count INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(username, snapshot_type, created_at)
                )
            """)
            
            # Snapshot data table (stores individual usernames)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS snapshot_data (
                    snapshot_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    FOREIGN KEY (snapshot_id) REFERENCES snapshots(id) ON DELETE CASCADE,
                    PRIMARY KEY (snapshot_id, user_id)
                )
            """)
            
            # Indexes for faster queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_snapshots_username 
                ON snapshots(username, snapshot_type, created_at DESC)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_snapshot_data_id 
                ON snapshot_data(snapshot_id)
            """)
            
            conn.commit()
    
    def save_snapshot(
        self,
        username: str,
        snapshot_type: str,
        users: set[str],
        metadata: Optional[dict] = None,
    ) -> str:
        """
        Save a snapshot of users (followers or following).
        
        Args:
            username: Account username
            snapshot_type: Type of snapshot ('followers' or 'following')
            users: Set of usernames in the snapshot
            metadata: Optional additional metadata
            
        Returns:
            Snapshot ID for later retrieval
        """
        if snapshot_type not in ("followers", "following"):
            raise ValueError("snapshot_type must be 'followers' or 'following'")
        
        snapshot_id = str(uuid.uuid4())
        created_at = datetime.utcnow()
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Insert snapshot metadata
            cursor.execute(
                """
                INSERT INTO snapshots (id, username, snapshot_type, count, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (snapshot_id, username.lower(), snapshot_type, len(users), created_at)
            )
            
            # Insert user data in batches
            batch_size = 1000
            users_list = list(users)
            for i in range(0, len(users_list), batch_size):
                batch = users_list[i:i + batch_size]
                cursor.executemany(
                    "INSERT INTO snapshot_data (snapshot_id, user_id) VALUES (?, ?)",
                    [(snapshot_id, user.lower()) for user in batch]
                )
            
            conn.commit()
        
        return snapshot_id
    
    def load_snapshot(
        self,
        username: str,
        snapshot_type: str,
        snapshot_id: Optional[str] = None,
    ) -> Optional[set[str]]:
        """
        Load a snapshot.
        
        Args:
            username: Account username
            snapshot_type: Type of snapshot ('followers' or 'following')
            snapshot_id: Specific snapshot ID (None = latest)
            
        Returns:
            Set of usernames in the snapshot, or None if not found
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if snapshot_id:
                # Load specific snapshot
                cursor.execute(
                    "SELECT id FROM snapshots WHERE id = ? AND username = ? AND snapshot_type = ?",
                    (snapshot_id, username.lower(), snapshot_type)
                )
            else:
                # Load latest snapshot
                cursor.execute(
                    """
                    SELECT id FROM snapshots 
                    WHERE username = ? AND snapshot_type = ?
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (username.lower(), snapshot_type)
                )
            
            row = cursor.fetchone()
            if not row:
                return None
            
            actual_id = row[0]
            
            # Load user data
            cursor.execute(
                "SELECT user_id FROM snapshot_data WHERE snapshot_id = ?",
                (actual_id,)
            )
            
            return {row[0] for row in cursor.fetchall()}
    
    def load_snapshot_with_metadata(
        self,
        username: str,
        snapshot_type: str,
        snapshot_id: Optional[str] = None,
    ) -> Optional[tuple[set[str], SnapshotMetadata]]:
        """
        Load a snapshot with its metadata.
        
        Args:
            username: Account username
            snapshot_type: Type of snapshot
            snapshot_id: Specific snapshot ID (None = latest)
            
        Returns:
            Tuple of (users set, metadata) or None if not found
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if snapshot_id:
                cursor.execute(
                    """
                    SELECT id, username, snapshot_type, count, created_at 
                    FROM snapshots WHERE id = ? AND username = ? AND snapshot_type = ?
                    """,
                    (snapshot_id, username.lower(), snapshot_type)
                )
            else:
                cursor.execute(
                    """
                    SELECT id, username, snapshot_type, count, created_at 
                    FROM snapshots WHERE username = ? AND snapshot_type = ?
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (username.lower(), snapshot_type)
                )
            
            row = cursor.fetchone()
            if not row:
                return None
            
            metadata = SnapshotMetadata(
                snapshot_id=row[0],
                username=row[1],
                snapshot_type=row[2],
                count=row[3],
                created_at=datetime.fromisoformat(row[4]) if isinstance(row[4], str) else row[4],
            )
            
            # Load user data
            cursor.execute(
                "SELECT user_id FROM snapshot_data WHERE snapshot_id = ?",
                (metadata.snapshot_id,)
            )
            
            users = {r[0] for r in cursor.fetchall()}
            return users, metadata
    
    def list_snapshots(
        self,
        username: str,
        snapshot_type: Optional[str] = None,
        limit: int = 100,
    ) -> list[SnapshotMetadata]:
        """
        List all snapshots for a user.
        
        Args:
            username: Account username
            snapshot_type: Filter by type (optional)
            limit: Maximum number of snapshots to return
            
        Returns:
            List of snapshot metadata, newest first
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if snapshot_type:
                cursor.execute(
                    """
                    SELECT id, username, snapshot_type, count, created_at 
                    FROM snapshots 
                    WHERE username = ? AND snapshot_type = ?
                    ORDER BY created_at DESC LIMIT ?
                    """,
                    (username.lower(), snapshot_type, limit)
                )
            else:
                cursor.execute(
                    """
                    SELECT id, username, snapshot_type, count, created_at 
                    FROM snapshots 
                    WHERE username = ?
                    ORDER BY created_at DESC LIMIT ?
                    """,
                    (username.lower(), limit)
                )
            
            results = []
            for row in cursor.fetchall():
                results.append(SnapshotMetadata(
                    snapshot_id=row[0],
                    username=row[1],
                    snapshot_type=row[2],
                    count=row[3],
                    created_at=datetime.fromisoformat(row[4]) if isinstance(row[4], str) else row[4],
                ))
            
            return results
    
    def delete_snapshot(self, snapshot_id: str) -> bool:
        """
        Delete a specific snapshot.
        
        Args:
            snapshot_id: ID of snapshot to delete
            
        Returns:
            True if deleted, False if not found
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Delete data first (foreign key)
            cursor.execute(
                "DELETE FROM snapshot_data WHERE snapshot_id = ?",
                (snapshot_id,)
            )
            
            # Delete metadata
            cursor.execute(
                "DELETE FROM snapshots WHERE id = ?",
                (snapshot_id,)
            )
            
            conn.commit()
            return cursor.rowcount > 0
    
    def cleanup_old_snapshots(
        self,
        username: str,
        snapshot_type: str,
        keep_count: int = 10,
    ) -> int:
        """
        Remove old snapshots, keeping only the most recent ones.
        
        Args:
            username: Account username
            snapshot_type: Type of snapshot
            keep_count: Number of recent snapshots to keep
            
        Returns:
            Number of snapshots deleted
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Get IDs of snapshots to delete
            cursor.execute(
                """
                SELECT id FROM snapshots 
                WHERE username = ? AND snapshot_type = ?
                ORDER BY created_at DESC
                LIMIT -1 OFFSET ?
                """,
                (username.lower(), snapshot_type, keep_count)
            )
            
            ids_to_delete = [row[0] for row in cursor.fetchall()]
            
            if not ids_to_delete:
                return 0
            
            # Delete data
            placeholders = ",".join("?" * len(ids_to_delete))
            cursor.execute(
                f"DELETE FROM snapshot_data WHERE snapshot_id IN ({placeholders})",
                ids_to_delete
            )
            
            # Delete metadata
            cursor.execute(
                f"DELETE FROM snapshots WHERE id IN ({placeholders})",
                ids_to_delete
            )
            
            conn.commit()
            return len(ids_to_delete)
    
    def compare_snapshots(
        self,
        username: str,
        snapshot_type: str,
        old_snapshot_id: Optional[str] = None,
        new_snapshot_id: Optional[str] = None,
    ) -> Optional[tuple[set[str], set[str]]]:
        """
        Compare two snapshots to find changes.
        
        Args:
            username: Account username
            snapshot_type: Type of snapshot
            old_snapshot_id: Older snapshot ID (None = second latest)
            new_snapshot_id: Newer snapshot ID (None = latest)
            
        Returns:
            Tuple of (removed users, added users) or None if insufficient data
        """
        snapshots = self.list_snapshots(username, snapshot_type, limit=2)
        
        if len(snapshots) < 2 and (old_snapshot_id is None or new_snapshot_id is None):
            return None
        
        # Determine which snapshots to compare
        if new_snapshot_id is None:
            new_snapshot_id = snapshots[0].snapshot_id
        if old_snapshot_id is None:
            old_snapshot_id = snapshots[1].snapshot_id
        
        old_users = self.load_snapshot(username, snapshot_type, old_snapshot_id)
        new_users = self.load_snapshot(username, snapshot_type, new_snapshot_id)
        
        if old_users is None or new_users is None:
            return None
        
        removed = old_users - new_users
        added = new_users - old_users
        
        return removed, added
    
    def get_stats(self) -> dict:
        """Get storage statistics"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) FROM snapshots")
            total_snapshots = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM snapshot_data")
            total_records = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT username) FROM snapshots")
            unique_users = cursor.fetchone()[0]
            
            return {
                "total_snapshots": total_snapshots,
                "total_records": total_records,
                "unique_users": unique_users,
                "db_size_bytes": self.db_path.stat().st_size if self.db_path.exists() else 0,
            }

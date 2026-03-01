"""
Follow/Unfollow tracking for xeepy.

Tracks all follow and unfollow actions with timestamps,
enabling smart unfollowing, analytics, and history export.
"""

import csv
import json
import logging
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass, asdict

from .database import Database

logger = logging.getLogger(__name__)


@dataclass
class FollowRecord:
    """Record of a follow action."""
    username: str
    action_type: str
    source: Optional[str] = None
    reason: Optional[str] = None
    followed_back: bool = False
    followed_back_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    metadata: Optional[dict] = None


@dataclass
class FollowStats:
    """Statistics about follow/unfollow activity."""
    total_follows: int
    total_unfollows: int
    total_follow_backs: int
    follow_back_rate: float
    follows_today: int
    unfollows_today: int
    pending_follow_backs: int


class FollowTracker:
    """
    Track all follow/unfollow actions with timestamps.
    
    Enables:
    - Smart unfollow after X days
    - Analytics on follow-back rate
    - History export
    - Whitelist management
    - Session resumability
    """
    
    def __init__(self, db_path: str = 'xeepy_tracker.db'):
        """
        Initialize the follow tracker.
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db = Database(db_path)
        logger.info(f"FollowTracker initialized with database: {db_path}")
    
    def record_follow(
        self,
        username: str,
        source: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> int:
        """
        Record when we followed someone.
        
        Args:
            username: The username that was followed
            source: Where we found this user (e.g., 'keyword:python', 'followers:elonmusk')
            metadata: Additional data about the follow
            
        Returns:
            The ID of the created record
        """
        data = {
            'username': username.lower().lstrip('@'),
            'action_type': 'follow',
            'source': source,
            'metadata': json.dumps(metadata) if metadata else None
        }
        
        record_id = self.db.insert('follow_actions', data)
        self._update_daily_stats('follows')
        
        logger.info(f"Recorded follow: @{username} (source: {source})")
        return record_id
    
    def record_unfollow(
        self,
        username: str,
        reason: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> int:
        """
        Record when we unfollowed someone.
        
        Args:
            username: The username that was unfollowed
            reason: Why we unfollowed (e.g., 'no_follow_back', 'inactive', 'manual')
            metadata: Additional data about the unfollow
            
        Returns:
            The ID of the created record
        """
        data = {
            'username': username.lower().lstrip('@'),
            'action_type': 'unfollow',
            'reason': reason,
            'metadata': json.dumps(metadata) if metadata else None
        }
        
        record_id = self.db.insert('follow_actions', data)
        self._update_daily_stats('unfollows')
        
        logger.info(f"Recorded unfollow: @{username} (reason: {reason})")
        return record_id
    
    def record_follow_back(self, username: str) -> bool:
        """
        Record that a user followed us back.
        
        Args:
            username: The username that followed back
            
        Returns:
            True if record was updated, False if not found
        """
        username = username.lower().lstrip('@')
        
        # Find the most recent follow action for this user
        row = self.db.fetchone('''
            SELECT id FROM follow_actions 
            WHERE username = ? AND action_type = 'follow' AND followed_back = 0
            ORDER BY created_at DESC LIMIT 1
        ''', (username,))
        
        if row:
            self.db.update(
                'follow_actions',
                {'followed_back': 1, 'followed_back_at': datetime.now()},
                'id = ?',
                (row['id'],)
            )
            self._update_daily_stats('follow_backs')
            logger.info(f"Recorded follow back: @{username}")
            return True
        
        return False
    
    def get_follows_older_than(
        self,
        days: int,
        exclude_followed_back: bool = True
    ) -> list[dict]:
        """
        Get follows older than X days that haven't followed back.
        
        Args:
            days: Number of days threshold
            exclude_followed_back: Whether to exclude users who followed back
            
        Returns:
            List of follow records
        """
        cutoff_date = datetime.now() - timedelta(days=days)
        
        query = '''
            SELECT username, source, created_at, metadata
            FROM follow_actions
            WHERE action_type = 'follow'
            AND created_at < ?
        '''
        params = [cutoff_date]
        
        if exclude_followed_back:
            query += ' AND followed_back = 0'
        
        # Exclude users we've already unfollowed
        query += '''
            AND username NOT IN (
                SELECT username FROM follow_actions 
                WHERE action_type = 'unfollow' 
                AND created_at > (
                    SELECT MAX(created_at) FROM follow_actions f2 
                    WHERE f2.username = follow_actions.username 
                    AND f2.action_type = 'follow'
                )
            )
        '''
        
        query += ' ORDER BY created_at ASC'
        
        rows = self.db.fetchall(query, tuple(params))
        
        results = []
        for row in rows:
            results.append({
                'username': row['username'],
                'source': row['source'],
                'followed_at': row['created_at'],
                'days_ago': (datetime.now() - row['created_at']).days if row['created_at'] else None,
                'metadata': json.loads(row['metadata']) if row['metadata'] else None
            })
        
        return results
    
    def get_follow_back_rate(self, days: Optional[int] = None) -> float:
        """
        Calculate percentage of follows that follow back.
        
        Args:
            days: Only consider follows within the last X days (None for all time)
            
        Returns:
            Follow-back rate as a percentage (0-100)
        """
        query = '''
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN followed_back = 1 THEN 1 ELSE 0 END) as follow_backs
            FROM follow_actions
            WHERE action_type = 'follow'
        '''
        params = []
        
        if days:
            cutoff_date = datetime.now() - timedelta(days=days)
            query += ' AND created_at >= ?'
            params.append(cutoff_date)
        
        row = self.db.fetchone(query, tuple(params))
        
        if row and row['total'] > 0:
            return (row['follow_backs'] / row['total']) * 100
        return 0.0
    
    def get_stats(self) -> FollowStats:
        """Get comprehensive follow statistics."""
        today = datetime.now().date().isoformat()
        
        # Total counts
        total_follows = self.db.count(
            'follow_actions',
            "action_type = 'follow'"
        )
        total_unfollows = self.db.count(
            'follow_actions',
            "action_type = 'unfollow'"
        )
        total_follow_backs = self.db.count(
            'follow_actions',
            "action_type = 'follow' AND followed_back = 1"
        )
        
        # Today's counts
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        
        follows_today = self.db.count(
            'follow_actions',
            "action_type = 'follow' AND created_at >= ?",
            (today_start,)
        )
        unfollows_today = self.db.count(
            'follow_actions',
            "action_type = 'unfollow' AND created_at >= ?",
            (today_start,)
        )
        
        # Pending follow backs (followed but not followed back yet)
        pending = self.db.count(
            'follow_actions',
            "action_type = 'follow' AND followed_back = 0"
        )
        
        follow_back_rate = self.get_follow_back_rate()
        
        return FollowStats(
            total_follows=total_follows,
            total_unfollows=total_unfollows,
            total_follow_backs=total_follow_backs,
            follow_back_rate=follow_back_rate,
            follows_today=follows_today,
            unfollows_today=unfollows_today,
            pending_follow_backs=pending
        )
    
    def is_following(self, username: str) -> bool:
        """
        Check if we are currently following a user (based on records).
        
        Args:
            username: The username to check
            
        Returns:
            True if we followed and haven't unfollowed since
        """
        username = username.lower().lstrip('@')
        
        row = self.db.fetchone('''
            SELECT action_type FROM follow_actions
            WHERE username = ?
            ORDER BY created_at DESC
            LIMIT 1
        ''', (username,))
        
        return row and row['action_type'] == 'follow'
    
    def was_followed_before(self, username: str) -> bool:
        """
        Check if we've ever followed a user before.
        
        Args:
            username: The username to check
            
        Returns:
            True if we've followed them at any point
        """
        username = username.lower().lstrip('@')
        
        count = self.db.count(
            'follow_actions',
            "username = ? AND action_type = 'follow'",
            (username,)
        )
        return count > 0
    
    def get_follow_history(self, username: str) -> list[dict]:
        """
        Get full follow/unfollow history for a user.
        
        Args:
            username: The username to get history for
            
        Returns:
            List of action records
        """
        username = username.lower().lstrip('@')
        
        rows = self.db.fetchall('''
            SELECT action_type, source, reason, followed_back, 
                   followed_back_at, created_at, metadata
            FROM follow_actions
            WHERE username = ?
            ORDER BY created_at DESC
        ''', (username,))
        
        return [dict(row) for row in rows]
    
    # Whitelist management
    
    def add_to_whitelist(self, username: str, reason: Optional[str] = None):
        """Add a user to the never-unfollow whitelist."""
        username = username.lower().lstrip('@')
        
        self.db.execute('''
            INSERT OR REPLACE INTO whitelist (username, reason) 
            VALUES (?, ?)
        ''', (username, reason))
        self.db.connection.commit()
        
        logger.info(f"Added @{username} to whitelist")
    
    def remove_from_whitelist(self, username: str):
        """Remove a user from the whitelist."""
        username = username.lower().lstrip('@')
        self.db.delete('whitelist', 'username = ?', (username,))
        logger.info(f"Removed @{username} from whitelist")
    
    def is_whitelisted(self, username: str) -> bool:
        """Check if a user is whitelisted."""
        username = username.lower().lstrip('@')
        return self.db.count('whitelist', 'username = ?', (username,)) > 0
    
    def get_whitelist(self) -> list[str]:
        """Get all whitelisted usernames."""
        rows = self.db.fetchall('SELECT username FROM whitelist')
        return [row['username'] for row in rows]
    
    # Session management for resumability
    
    def create_session(
        self,
        session_type: str,
        usernames: list[str],
        metadata: Optional[dict] = None
    ) -> int:
        """
        Create a new action session for tracking progress.
        
        Args:
            session_type: Type of session (e.g., 'unfollow_non_followers')
            usernames: List of usernames to process
            metadata: Additional session metadata
            
        Returns:
            The session ID
        """
        session_data = {
            'session_type': session_type,
            'total_count': len(usernames),
            'metadata': json.dumps(metadata) if metadata else None
        }
        
        session_id = self.db.insert('action_sessions', session_data)
        
        # Insert session items
        items = [(session_id, u.lower().lstrip('@')) for u in usernames]
        self.db.executemany(
            'INSERT INTO session_items (session_id, username) VALUES (?, ?)',
            items
        )
        self.db.connection.commit()
        
        logger.info(f"Created session {session_id} with {len(usernames)} items")
        return session_id
    
    def get_pending_session(self, session_type: str) -> Optional[dict]:
        """
        Get an incomplete session of a given type.
        
        Args:
            session_type: Type of session to look for
            
        Returns:
            Session data if found, None otherwise
        """
        row = self.db.fetchone('''
            SELECT id, session_type, started_at, total_count, 
                   success_count, failed_count, skipped_count, metadata
            FROM action_sessions
            WHERE session_type = ? AND status = 'in_progress'
            ORDER BY started_at DESC
            LIMIT 1
        ''', (session_type,))
        
        if row:
            return dict(row)
        return None
    
    def get_pending_session_items(self, session_id: int) -> list[str]:
        """Get pending items from a session."""
        rows = self.db.fetchall('''
            SELECT username FROM session_items
            WHERE session_id = ? AND status = 'pending'
        ''', (session_id,))
        
        return [row['username'] for row in rows]
    
    def update_session_item(
        self,
        session_id: int,
        username: str,
        status: str,
        error_message: Optional[str] = None
    ):
        """Update the status of a session item."""
        username = username.lower().lstrip('@')
        
        self.db.update(
            'session_items',
            {
                'status': status,
                'processed_at': datetime.now(),
                'error_message': error_message
            },
            'session_id = ? AND username = ?',
            (session_id, username)
        )
        
        # Update session counts
        status_field = {
            'success': 'success_count',
            'failed': 'failed_count',
            'skipped': 'skipped_count'
        }.get(status)
        
        if status_field:
            self.db.execute(f'''
                UPDATE action_sessions 
                SET {status_field} = {status_field} + 1
                WHERE id = ?
            ''', (session_id,))
            self.db.connection.commit()
    
    def complete_session(self, session_id: int):
        """Mark a session as completed."""
        self.db.update(
            'action_sessions',
            {'status': 'completed', 'completed_at': datetime.now()},
            'id = ?',
            (session_id,)
        )
        logger.info(f"Session {session_id} completed")
    
    # User profile caching
    
    def cache_user_profile(self, profile: dict):
        """
        Cache a user's profile data.
        
        Args:
            profile: Dictionary with user profile data
        """
        username = profile.get('username', '').lower().lstrip('@')
        if not username:
            return
        
        data = {
            'username': username,
            'display_name': profile.get('display_name'),
            'bio': profile.get('bio'),
            'followers_count': profile.get('followers_count'),
            'following_count': profile.get('following_count'),
            'tweets_count': profile.get('tweets_count'),
            'verified': 1 if profile.get('verified') else 0,
            'profile_image_url': profile.get('profile_image_url'),
            'updated_at': datetime.now()
        }
        
        self.db.execute('''
            INSERT OR REPLACE INTO user_profiles 
            (username, display_name, bio, followers_count, following_count,
             tweets_count, verified, profile_image_url, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', tuple(data.values()))
        self.db.connection.commit()
    
    def get_cached_profile(self, username: str) -> Optional[dict]:
        """Get cached profile for a user."""
        username = username.lower().lstrip('@')
        row = self.db.fetchone(
            'SELECT * FROM user_profiles WHERE username = ?',
            (username,)
        )
        return dict(row) if row else None
    
    # Export functionality
    
    def export_history(self, filepath: str, action_type: Optional[str] = None):
        """
        Export full history to CSV.
        
        Args:
            filepath: Path to export CSV file
            action_type: Filter by action type ('follow' or 'unfollow')
        """
        query = '''
            SELECT username, action_type, source, reason, 
                   followed_back, followed_back_at, created_at
            FROM follow_actions
        '''
        params = []
        
        if action_type:
            query += ' WHERE action_type = ?'
            params.append(action_type)
        
        query += ' ORDER BY created_at DESC'
        
        rows = self.db.fetchall(query, tuple(params))
        
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                'Username', 'Action', 'Source', 'Reason',
                'Followed Back', 'Followed Back At', 'Date'
            ])
            
            for row in rows:
                writer.writerow([
                    row['username'],
                    row['action_type'],
                    row['source'] or '',
                    row['reason'] or '',
                    'Yes' if row['followed_back'] else 'No',
                    row['followed_back_at'] or '',
                    row['created_at']
                ])
        
        logger.info(f"Exported {len(rows)} records to {filepath}")
    
    def export_unfollowed(self, filepath: str):
        """Export list of unfollowed users."""
        self.export_history(filepath, action_type='unfollow')
    
    def _update_daily_stats(self, field: str):
        """Update daily statistics."""
        today = datetime.now().date().isoformat()
        
        # Try to update existing record
        result = self.db.execute(f'''
            UPDATE daily_stats 
            SET {field} = {field} + 1, updated_at = CURRENT_TIMESTAMP
            WHERE date = ?
        ''', (today,))
        
        if result.rowcount == 0:
            # Insert new record
            self.db.execute(f'''
                INSERT INTO daily_stats (date, {field}) VALUES (?, 1)
            ''', (today,))
        
        self.db.connection.commit()
    
    def close(self):
        """Close the tracker and database connection."""
        self.db.close()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

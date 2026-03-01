"""
Tests for xeepy follow/unfollow operations.

Comprehensive test suite covering storage, actions, and CLI.
"""

import pytest
import asyncio
import tempfile
import os
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

# Import modules to test
from xeepy.storage.database import Database
from xeepy.storage.follow_tracker import FollowTracker, FollowRecord, FollowStats
from xeepy.actions.base import (
    RateLimiter, RateLimitConfig, RateLimitStrategy,
    FollowFilters, UnfollowFilters, ActionStats,
    FollowResult, UnfollowResult
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def temp_db():
    """Create a temporary database file."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = f.name
    yield db_path
    try:
        os.unlink(db_path)
    except:
        pass


@pytest.fixture
def database(temp_db):
    """Create a Database instance."""
    db = Database(temp_db)
    yield db
    db.close()


@pytest.fixture
def tracker(temp_db):
    """Create a FollowTracker instance."""
    tracker = FollowTracker(temp_db)
    yield tracker
    tracker.close()


@pytest.fixture
def rate_limiter():
    """Create a RateLimiter instance."""
    config = RateLimitConfig(
        min_delay=0.01,
        max_delay=0.02,
        hourly_limit=1000,
        daily_limit=5000
    )
    return RateLimiter(config)


@pytest.fixture
def mock_browser():
    """Create a mock browser manager."""
    browser = AsyncMock()
    browser.is_logged_in = AsyncMock(return_value=True)
    browser.goto = AsyncMock()
    browser.click = AsyncMock(return_value=True)
    browser.wait_for_selector = AsyncMock(return_value=True)
    browser.get_text = AsyncMock(return_value="Test bio")
    browser.get_all_text = AsyncMock(return_value=["user1", "user2", "user3"])
    browser.scroll_down = AsyncMock()
    return browser


# =============================================================================
# Database Tests
# =============================================================================

class TestDatabase:
    """Tests for the Database class."""
    
    def test_init_creates_tables(self, database):
        """Test that initialization creates all required tables."""
        # Check tables exist
        cursor = database.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )
        tables = {row[0] for row in cursor.fetchall()}
        
        assert 'follow_actions' in tables
        assert 'user_profiles' in tables
        assert 'whitelist' in tables
        assert 'action_sessions' in tables
        assert 'session_items' in tables
        assert 'daily_stats' in tables
    
    def test_insert_and_fetch(self, database):
        """Test inserting and fetching data."""
        # Insert
        record_id = database.insert('whitelist', {
            'username': 'testuser',
            'reason': 'test reason'
        })
        
        assert record_id > 0
        
        # Fetch
        row = database.fetchone(
            'SELECT * FROM whitelist WHERE username = ?',
            ('testuser',)
        )
        
        assert row is not None
        assert row['username'] == 'testuser'
        assert row['reason'] == 'test reason'
    
    def test_update(self, database):
        """Test updating data."""
        database.insert('whitelist', {'username': 'testuser', 'reason': 'old'})
        
        affected = database.update(
            'whitelist',
            {'reason': 'new reason'},
            'username = ?',
            ('testuser',)
        )
        
        assert affected == 1
        
        row = database.fetchone(
            'SELECT reason FROM whitelist WHERE username = ?',
            ('testuser',)
        )
        assert row['reason'] == 'new reason'
    
    def test_delete(self, database):
        """Test deleting data."""
        database.insert('whitelist', {'username': 'testuser'})
        
        affected = database.delete('whitelist', 'username = ?', ('testuser',))
        
        assert affected == 1
        assert database.count('whitelist') == 0
    
    def test_count(self, database):
        """Test counting rows."""
        assert database.count('whitelist') == 0
        
        database.insert('whitelist', {'username': 'user1'})
        database.insert('whitelist', {'username': 'user2'})
        
        assert database.count('whitelist') == 2
        assert database.count('whitelist', 'username = ?', ('user1',)) == 1


# =============================================================================
# FollowTracker Tests
# =============================================================================

class TestFollowTracker:
    """Tests for the FollowTracker class."""
    
    def test_record_follow(self, tracker):
        """Test recording a follow action."""
        record_id = tracker.record_follow('testuser', source='test')
        
        assert record_id > 0
        assert tracker.is_following('testuser')
        assert tracker.was_followed_before('testuser')
    
    def test_record_unfollow(self, tracker):
        """Test recording an unfollow action."""
        tracker.record_follow('testuser')
        record_id = tracker.record_unfollow('testuser', reason='test')
        
        assert record_id > 0
        assert not tracker.is_following('testuser')
    
    def test_record_follow_back(self, tracker):
        """Test recording a follow back."""
        tracker.record_follow('testuser')
        
        assert tracker.record_follow_back('testuser')
        
        # Verify it's recorded
        stats = tracker.get_stats()
        assert stats.total_follow_backs == 1
    
    def test_username_normalization(self, tracker):
        """Test that usernames are normalized."""
        tracker.record_follow('@TestUser')
        
        assert tracker.is_following('testuser')
        assert tracker.is_following('@TestUser')
        assert tracker.is_following('TESTUSER')
    
    def test_get_follows_older_than(self, tracker):
        """Test getting old follows."""
        # Record some follows
        tracker.record_follow('recent_user')
        
        # Manually insert an old follow
        tracker.db.execute('''
            INSERT INTO follow_actions (username, action_type, created_at)
            VALUES (?, ?, ?)
        ''', ('old_user', 'follow', datetime.now() - timedelta(days=10)))
        tracker.db.connection.commit()
        
        # Get follows older than 5 days
        old_follows = tracker.get_follows_older_than(5)
        
        assert len(old_follows) == 1
        assert old_follows[0]['username'] == 'old_user'
    
    def test_get_follow_back_rate(self, tracker):
        """Test calculating follow-back rate."""
        # Record follows
        tracker.record_follow('user1')
        tracker.record_follow('user2')
        tracker.record_follow('user3')
        tracker.record_follow('user4')
        
        # Record follow-backs for 2 of them
        tracker.record_follow_back('user1')
        tracker.record_follow_back('user2')
        
        rate = tracker.get_follow_back_rate()
        
        assert rate == 50.0  # 2 out of 4 = 50%
    
    def test_get_stats(self, tracker):
        """Test getting statistics."""
        tracker.record_follow('user1')
        tracker.record_follow('user2')
        tracker.record_unfollow('user2', reason='test')
        tracker.record_follow_back('user1')
        
        stats = tracker.get_stats()
        
        assert isinstance(stats, FollowStats)
        assert stats.total_follows == 2
        assert stats.total_unfollows == 1
        assert stats.total_follow_backs == 1
    
    def test_whitelist(self, tracker):
        """Test whitelist operations."""
        assert not tracker.is_whitelisted('testuser')
        
        tracker.add_to_whitelist('testuser', reason='friend')
        assert tracker.is_whitelisted('testuser')
        
        whitelist = tracker.get_whitelist()
        assert 'testuser' in whitelist
        
        tracker.remove_from_whitelist('testuser')
        assert not tracker.is_whitelisted('testuser')
    
    def test_session_management(self, tracker):
        """Test session management for resumability."""
        usernames = ['user1', 'user2', 'user3']
        
        session_id = tracker.create_session(
            'test_session',
            usernames,
            {'test': 'metadata'}
        )
        
        assert session_id > 0
        
        # Get pending items
        pending = tracker.get_pending_session_items(session_id)
        assert len(pending) == 3
        
        # Update an item
        tracker.update_session_item(session_id, 'user1', 'success')
        
        pending = tracker.get_pending_session_items(session_id)
        assert len(pending) == 2
        
        # Complete session
        tracker.complete_session(session_id)
        
        # No pending sessions should exist
        assert tracker.get_pending_session('test_session') is None
    
    def test_export_history(self, tracker, temp_db):
        """Test exporting history to CSV."""
        tracker.record_follow('user1', source='test')
        tracker.record_follow('user2', source='test')
        tracker.record_unfollow('user1', reason='test')
        
        export_path = temp_db + '.csv'
        tracker.export_history(export_path)
        
        assert os.path.exists(export_path)
        
        with open(export_path) as f:
            lines = f.readlines()
        
        assert len(lines) == 4  # Header + 3 records
        
        os.unlink(export_path)


# =============================================================================
# RateLimiter Tests
# =============================================================================

class TestRateLimiter:
    """Tests for the RateLimiter class."""
    
    @pytest.mark.asyncio
    async def test_basic_wait(self, rate_limiter):
        """Test basic rate limiting."""
        start = datetime.now()
        
        await rate_limiter.wait()
        await rate_limiter.wait()
        
        elapsed = (datetime.now() - start).total_seconds()
        assert elapsed >= 0.01  # At least minimum delay
    
    def test_record_success_resets_errors(self, rate_limiter):
        """Test that success resets error count."""
        rate_limiter.record_error()
        rate_limiter.record_error()
        
        assert rate_limiter._consecutive_errors == 2
        
        rate_limiter.record_success()
        
        assert rate_limiter._consecutive_errors == 0
    
    def test_get_stats(self, rate_limiter):
        """Test getting rate limiter stats."""
        stats = rate_limiter.get_stats()
        
        assert 'actions_last_hour' in stats
        assert 'actions_last_day' in stats
        assert 'hourly_limit' in stats
        assert 'daily_limit' in stats
    
    def test_pause(self, rate_limiter):
        """Test pausing the rate limiter."""
        rate_limiter.pause(10)
        
        stats = rate_limiter.get_stats()
        assert stats['is_paused']


# =============================================================================
# Filter Tests
# =============================================================================

class TestFollowFilters:
    """Tests for FollowFilters."""
    
    def test_matches_basic(self):
        """Test basic filter matching."""
        filters = FollowFilters(
            min_followers=100,
            max_followers=10000
        )
        
        profile = {
            'followers_count': 500,
            'following_count': 200,
            'tweets_count': 100,
            'bio': 'Test bio',
            'has_profile_pic': True,
            'verified': False
        }
        
        matches, reason = filters.matches(profile)
        assert matches
    
    def test_rejects_too_few_followers(self):
        """Test rejecting profiles with too few followers."""
        filters = FollowFilters(min_followers=100)
        
        profile = {
            'followers_count': 50,
            'following_count': 200,
            'tweets_count': 100
        }
        
        matches, reason = filters.matches(profile)
        assert not matches
        assert 'Too few followers' in reason
    
    def test_rejects_too_many_followers(self):
        """Test rejecting profiles with too many followers."""
        filters = FollowFilters(max_followers=1000)
        
        profile = {
            'followers_count': 5000,
            'following_count': 200,
            'tweets_count': 100
        }
        
        matches, reason = filters.matches(profile)
        assert not matches
        assert 'Too many followers' in reason
    
    def test_bio_keyword_filter(self):
        """Test bio keyword filtering."""
        filters = FollowFilters(
            keywords_in_bio=['python', 'developer'],
            min_followers=0
        )
        
        profile1 = {
            'bio': 'Python developer and tech enthusiast',
            'followers_count': 100
        }
        profile2 = {
            'bio': 'I love cooking',
            'followers_count': 100
        }
        
        matches1, _ = filters.matches(profile1)
        matches2, _ = filters.matches(profile2)
        
        assert matches1
        assert not matches2
    
    def test_exclude_verified(self):
        """Test excluding verified accounts."""
        filters = FollowFilters(
            exclude_verified=True,
            min_followers=0
        )
        
        profile = {
            'followers_count': 100,
            'verified': True
        }
        
        matches, reason = filters.matches(profile)
        assert not matches
        assert 'Verified' in reason


# =============================================================================
# Result Classes Tests
# =============================================================================

class TestResultClasses:
    """Tests for result dataclasses."""
    
    def test_follow_result(self):
        """Test FollowResult."""
        result = FollowResult(
            success_count=5,
            failed_count=2,
            skipped_count=3,
            followed_users=['u1', 'u2', 'u3', 'u4', 'u5'],
            failed_users=['f1', 'f2'],
            skipped_users=['s1', 's2', 's3'],
            duration_seconds=60.5,
            rate_limited=False
        )
        
        assert result.total_processed == 10
        
        d = result.to_dict()
        assert d['success_count'] == 5
        assert len(d['followed_users']) == 5
    
    def test_unfollow_result(self):
        """Test UnfollowResult."""
        result = UnfollowResult(
            success_count=3,
            failed_count=1,
            skipped_count=2,
            unfollowed_users=['u1', 'u2', 'u3'],
            failed_users=['f1'],
            skipped_users=['s1', 's2'],
            duration_seconds=30.0,
            rate_limited=True
        )
        
        assert result.total_processed == 6
        assert result.rate_limited
    
    def test_action_stats(self):
        """Test ActionStats."""
        stats = ActionStats()
        
        assert stats.duration_seconds >= 0
        
        stats.success_count = 5
        stats.failed_count = 2
        stats.complete()
        
        assert stats.completed_at is not None
        
        d = stats.to_dict()
        assert d['success_count'] == 5
        assert d['completed_at'] is not None


# =============================================================================
# Integration Tests
# =============================================================================

class TestIntegration:
    """Integration tests combining multiple components."""
    
    def test_full_workflow(self, tracker):
        """Test a full follow/unfollow workflow."""
        # Simulate following users
        tracker.record_follow('user1', source='keyword:python')
        tracker.record_follow('user2', source='keyword:python')
        tracker.record_follow('user3', source='hashtag:coding')
        
        # Check stats
        stats = tracker.get_stats()
        assert stats.total_follows == 3
        
        # Simulate some follow-backs
        tracker.record_follow_back('user1')
        
        # Simulate unfollowing non-followers
        tracker.record_unfollow('user2', reason='non_follower')
        tracker.record_unfollow('user3', reason='non_follower')
        
        # Final stats
        stats = tracker.get_stats()
        assert stats.total_follows == 3
        assert stats.total_unfollows == 2
        assert stats.total_follow_backs == 1
        
        # Check follow-back rate
        rate = tracker.get_follow_back_rate()
        assert rate == pytest.approx(33.33, rel=0.1)
    
    def test_whitelist_protection(self, tracker):
        """Test that whitelist protects users from unfollow."""
        # Add to whitelist
        tracker.add_to_whitelist('important_user', reason='friend')
        
        # Simulate getting non-followers
        non_followers = ['user1', 'important_user', 'user2']
        
        # Filter out whitelisted
        to_unfollow = [u for u in non_followers if not tracker.is_whitelisted(u)]
        
        assert 'important_user' not in to_unfollow
        assert len(to_unfollow) == 2


# =============================================================================
# Run Tests
# =============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v'])

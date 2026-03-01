"""
Tests for the monitoring module.
"""

import os
import tempfile
import unittest
from datetime import datetime
from unittest.mock import MagicMock, AsyncMock, patch

from xeepy.monitoring.unfollower_detector import UnfollowerDetector, UnfollowerReport
from xeepy.monitoring.follower_alerts import FollowerAlerts, MilestoneConfig, EventType
from xeepy.monitoring.account_monitor import AccountMonitor, AccountSnapshot
from xeepy.monitoring.engagement_tracker import EngagementTracker, TweetEngagement
from xeepy.storage.snapshots import SnapshotStorage


class TestUnfollowerDetector(unittest.TestCase):
    """Tests for UnfollowerDetector."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_snapshots.db")
        self.storage = SnapshotStorage(self.db_path)
        self.detector = UnfollowerDetector(storage=self.storage)
    
    def tearDown(self):
        """Clean up test fixtures."""
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        os.rmdir(self.temp_dir)
    
    def test_unfollower_report_creation(self):
        """Test UnfollowerReport creation."""
        report = UnfollowerReport(
            username="testuser",
            detected_at=datetime.utcnow(),
            unfollowers=["user1", "user2"],
            new_followers=["user3"],
            previous_count=100,
            current_count=99,
        )
        
        self.assertEqual(report.net_change, -1)
        self.assertEqual(len(report.unfollowers), 2)
    
    def test_unfollower_report_to_dict(self):
        """Test UnfollowerReport serialization."""
        report = UnfollowerReport(
            username="testuser",
            detected_at=datetime.utcnow(),
            unfollowers=["user1"],
            new_followers=["user2", "user3"],
            previous_count=100,
            current_count=102,
        )
        
        data = report.to_dict()
        
        self.assertIn("username", data)
        self.assertIn("unfollowers", data)
        self.assertIn("net_change", data)
        self.assertEqual(data["net_change"], 2)
    
    def test_detect_with_no_previous_snapshot(self):
        """Test detection when no previous snapshot exists."""
        # Mock the scraper
        mock_scraper = MagicMock()
        mock_scraper.get_followers = AsyncMock(return_value=iter([]))
        
        self.detector.scraper = mock_scraper
        
        # First detection should create baseline
        # This would need async test setup


class TestFollowerAlerts(unittest.TestCase):
    """Tests for FollowerAlerts."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.alerts = FollowerAlerts()
    
    def test_milestone_config_defaults(self):
        """Test MilestoneConfig default values."""
        config = MilestoneConfig()
        
        self.assertIn(1000, config.follower_milestones)
        self.assertIn(10000, config.follower_milestones)
    
    def test_custom_milestones(self):
        """Test custom milestone configuration."""
        config = MilestoneConfig(
            follower_milestones=[500, 1500, 2500],
            enable_round_numbers=False,
        )
        
        alerts = FollowerAlerts(config=config)
        
        self.assertEqual(alerts.config.follower_milestones, [500, 1500, 2500])
    
    def test_check_milestones(self):
        """Test milestone detection."""
        config = MilestoneConfig(follower_milestones=[100, 500, 1000])
        alerts = FollowerAlerts(config=config)
        
        reached = alerts._check_milestones(95, 105)
        
        self.assertIn(100, reached)
    
    def test_no_milestone_crossed(self):
        """Test when no milestone is crossed."""
        config = MilestoneConfig(follower_milestones=[100, 500, 1000])
        alerts = FollowerAlerts(config=config)
        
        reached = alerts._check_milestones(50, 75)
        
        self.assertEqual(len(reached), 0)


class TestAccountMonitor(unittest.TestCase):
    """Tests for AccountMonitor."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_snapshots.db")
        self.storage = SnapshotStorage(self.db_path)
        self.monitor = AccountMonitor(storage=self.storage)
    
    def tearDown(self):
        """Clean up test fixtures."""
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        os.rmdir(self.temp_dir)
    
    def test_account_snapshot_creation(self):
        """Test AccountSnapshot creation."""
        snapshot = AccountSnapshot(
            username="testuser",
            timestamp=datetime.utcnow(),
            followers_count=1000,
            following_count=500,
            tweets_count=250,
            likes_count=100,
            bio="Test bio",
            display_name="Test User",
            verified=False,
        )
        
        self.assertEqual(snapshot.username, "testuser")
        self.assertEqual(snapshot.followers_count, 1000)
    
    def test_snapshot_to_dict(self):
        """Test AccountSnapshot serialization."""
        snapshot = AccountSnapshot(
            username="testuser",
            timestamp=datetime.utcnow(),
            followers_count=1000,
            following_count=500,
            tweets_count=250,
        )
        
        data = snapshot.to_dict()
        
        self.assertIn("username", data)
        self.assertIn("followers_count", data)


class TestEngagementTracker(unittest.TestCase):
    """Tests for EngagementTracker."""
    
    def test_tweet_engagement_creation(self):
        """Test TweetEngagement creation."""
        engagement = TweetEngagement(
            tweet_id="123456",
            likes=100,
            retweets=20,
            replies=10,
            views=5000,
            quotes=5,
            recorded_at=datetime.utcnow(),
        )
        
        self.assertEqual(engagement.tweet_id, "123456")
        self.assertEqual(engagement.total_engagement, 135)  # likes + retweets + replies + quotes
    
    def test_engagement_rate_calculation(self):
        """Test engagement rate calculation."""
        engagement = TweetEngagement(
            tweet_id="123456",
            likes=100,
            retweets=20,
            replies=10,
            views=5000,
            quotes=5,
            recorded_at=datetime.utcnow(),
        )
        
        # (100 + 20 + 10 + 5) / 5000 * 100 = 2.7%
        self.assertAlmostEqual(engagement.engagement_rate, 2.7, places=1)
    
    def test_engagement_rate_zero_views(self):
        """Test engagement rate with zero views."""
        engagement = TweetEngagement(
            tweet_id="123456",
            likes=100,
            retweets=20,
            replies=10,
            views=0,
            quotes=5,
            recorded_at=datetime.utcnow(),
        )
        
        self.assertEqual(engagement.engagement_rate, 0.0)


if __name__ == "__main__":
    unittest.main()

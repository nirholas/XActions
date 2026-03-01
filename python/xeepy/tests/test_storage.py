"""
Tests for the storage module.
"""

import os
import tempfile
import unittest
from datetime import datetime, timedelta

from xeepy.storage.snapshots import SnapshotStorage, SnapshotMetadata
from xeepy.storage.timeseries import TimeSeriesStorage, DataPoint


class TestSnapshotStorage(unittest.TestCase):
    """Tests for SnapshotStorage."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_snapshots.db")
        self.storage = SnapshotStorage(self.db_path)
    
    def tearDown(self):
        """Clean up test fixtures."""
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        os.rmdir(self.temp_dir)
    
    def test_save_and_load_snapshot(self):
        """Test saving and loading a snapshot."""
        usernames = {"user1", "user2", "user3"}
        
        self.storage.save_snapshot("followers", "testuser", usernames)
        
        loaded = self.storage.load_latest_snapshot("followers", "testuser")
        
        self.assertIsNotNone(loaded)
        self.assertEqual(loaded, usernames)
    
    def test_compare_snapshots(self):
        """Test comparing two snapshots."""
        # Save first snapshot
        old_followers = {"user1", "user2", "user3"}
        self.storage.save_snapshot("followers", "testuser", old_followers)
        
        # Save second snapshot with changes
        new_followers = {"user1", "user3", "user4", "user5"}
        self.storage.save_snapshot("followers", "testuser", new_followers)
        
        # Compare
        added, removed = self.storage.compare_snapshots("followers", "testuser")
        
        self.assertEqual(added, {"user4", "user5"})
        self.assertEqual(removed, {"user2"})
    
    def test_load_nonexistent_snapshot(self):
        """Test loading a snapshot that doesn't exist."""
        loaded = self.storage.load_latest_snapshot("followers", "nonexistent")
        self.assertIsNone(loaded)
    
    def test_get_snapshot_metadata(self):
        """Test getting snapshot metadata."""
        usernames = {"user1", "user2"}
        self.storage.save_snapshot("followers", "testuser", usernames)
        
        metadata_list = self.storage.get_snapshot_metadata("followers", "testuser", limit=10)
        
        self.assertEqual(len(metadata_list), 1)
        self.assertEqual(metadata_list[0].count, 2)
        self.assertEqual(metadata_list[0].snapshot_type, "followers")
    
    def test_multiple_snapshots(self):
        """Test saving multiple snapshots."""
        self.storage.save_snapshot("followers", "testuser", {"user1"})
        self.storage.save_snapshot("followers", "testuser", {"user1", "user2"})
        self.storage.save_snapshot("followers", "testuser", {"user1", "user2", "user3"})
        
        # Get all metadata
        metadata_list = self.storage.get_snapshot_metadata("followers", "testuser", limit=10)
        
        self.assertEqual(len(metadata_list), 3)
        # Should be in reverse chronological order
        self.assertEqual(metadata_list[0].count, 3)


class TestTimeSeriesStorage(unittest.TestCase):
    """Tests for TimeSeriesStorage."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_timeseries.db")
        self.storage = TimeSeriesStorage(self.db_path)
    
    def tearDown(self):
        """Clean up test fixtures."""
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        os.rmdir(self.temp_dir)
    
    def test_record_and_get_series(self):
        """Test recording and retrieving time series data."""
        now = datetime.utcnow()
        
        self.storage.record("followers", "testuser", 100, now - timedelta(days=2))
        self.storage.record("followers", "testuser", 110, now - timedelta(days=1))
        self.storage.record("followers", "testuser", 120, now)
        
        series = self.storage.get_series("followers", "testuser", days=7)
        
        self.assertEqual(len(series.data_points), 3)
    
    def test_get_latest_value(self):
        """Test getting the latest value."""
        now = datetime.utcnow()
        
        self.storage.record("followers", "testuser", 100, now - timedelta(hours=2))
        self.storage.record("followers", "testuser", 150, now)
        
        latest = self.storage.get_latest("followers", "testuser")
        
        self.assertIsNotNone(latest)
        self.assertEqual(latest.value, 150)
    
    def test_get_change(self):
        """Test calculating change over time."""
        now = datetime.utcnow()
        
        self.storage.record("followers", "testuser", 100, now - timedelta(days=7))
        self.storage.record("followers", "testuser", 150, now)
        
        change = self.storage.get_change("followers", "testuser", days=7)
        
        self.assertIsNotNone(change)
        self.assertEqual(change["change"], 50)
        self.assertEqual(change["change_percentage"], 50.0)
    
    def test_get_daily_series(self):
        """Test getting daily aggregated data."""
        now = datetime.utcnow()
        base = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Record multiple values per day
        self.storage.record("followers", "testuser", 100, base - timedelta(days=1, hours=12))
        self.storage.record("followers", "testuser", 105, base - timedelta(days=1, hours=6))
        self.storage.record("followers", "testuser", 110, base - timedelta(hours=12))
        self.storage.record("followers", "testuser", 115, base - timedelta(hours=6))
        
        daily = self.storage.get_daily_series("followers", "testuser", days=3)
        
        # Should have aggregated data for 2 days
        self.assertGreater(len(daily), 0)
    
    def test_empty_series(self):
        """Test getting series with no data."""
        series = self.storage.get_series("followers", "nonexistent", days=7)
        
        self.assertEqual(len(series.data_points), 0)


if __name__ == "__main__":
    unittest.main()

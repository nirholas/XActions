"""
Tests for the analytics module.
"""

import os
import tempfile
import unittest
from datetime import datetime, timedelta
from unittest.mock import MagicMock, AsyncMock

from xeepy.analytics.growth_tracker import GrowthTracker, GrowthReport
from xeepy.analytics.engagement_analytics import EngagementAnalytics, EngagementReport
from xeepy.analytics.best_time_to_post import BestTimeAnalyzer, TimeSlot, PostingSchedule
from xeepy.analytics.audience_insights import AudienceInsights, AudienceReport
from xeepy.analytics.competitor_analysis import CompetitorAnalyzer, AccountMetrics, CompetitorReport
from xeepy.analytics.reports import ReportGenerator, Report, ReportSection
from xeepy.storage.timeseries import TimeSeriesStorage


class TestGrowthTracker(unittest.TestCase):
    """Tests for GrowthTracker."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_timeseries.db")
        self.storage = TimeSeriesStorage(self.db_path)
        self.tracker = GrowthTracker(storage=self.storage)
    
    def tearDown(self):
        """Clean up test fixtures."""
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        os.rmdir(self.temp_dir)
    
    def test_growth_report_creation(self):
        """Test GrowthReport creation."""
        report = GrowthReport(
            username="testuser",
            period_days=30,
            start_followers=1000,
            end_followers=1100,
            net_change=100,
            change_percentage=10.0,
            avg_daily_growth=3.33,
            growth_trend="growing",
        )
        
        self.assertEqual(report.net_change, 100)
        self.assertEqual(report.growth_trend, "growing")
    
    def test_growth_report_summary(self):
        """Test GrowthReport summary generation."""
        report = GrowthReport(
            username="testuser",
            period_days=30,
            start_followers=1000,
            end_followers=1100,
            net_change=100,
            change_percentage=10.0,
            avg_daily_growth=3.33,
            growth_trend="growing",
        )
        
        summary = report.summary()
        
        self.assertIn("testuser", summary)
        self.assertIn("1,000", summary)
        self.assertIn("1,100", summary)
    
    def test_generate_report_empty_data(self):
        """Test generating report with no data."""
        report = self.tracker.generate_report("nonexistent", days=30)
        
        self.assertEqual(report.start_followers, 0)
        self.assertEqual(report.end_followers, 0)
    
    def test_get_growth_history(self):
        """Test getting growth history."""
        now = datetime.utcnow()
        
        # Add some data
        self.storage.record("followers", "testuser", 100, now - timedelta(days=2))
        self.storage.record("followers", "testuser", 110, now - timedelta(days=1))
        self.storage.record("followers", "testuser", 120, now)
        
        history = self.tracker.get_growth_history("testuser", days=7)
        
        # Should have data
        self.assertIsInstance(history, list)


class TestEngagementAnalytics(unittest.TestCase):
    """Tests for EngagementAnalytics."""
    
    def test_engagement_report_creation(self):
        """Test EngagementReport creation."""
        report = EngagementReport(
            total_tweets_analyzed=100,
            avg_likes=50.5,
            avg_retweets=10.2,
            avg_replies=5.3,
            avg_views=1000.0,
            avg_engagement_rate=2.5,
            total_engagement=6600,
        )
        
        self.assertEqual(report.total_tweets_analyzed, 100)
        self.assertAlmostEqual(report.avg_engagement_rate, 2.5)
    
    def test_engagement_report_summary(self):
        """Test EngagementReport summary."""
        report = EngagementReport(
            total_tweets_analyzed=100,
            avg_likes=50.5,
            avg_retweets=10.2,
            avg_replies=5.3,
            avg_views=1000.0,
            avg_engagement_rate=2.5,
            total_engagement=6600,
        )
        
        summary = report.summary()
        
        self.assertIn("100 tweets", summary)
        self.assertIn("2.50%", summary)


class TestBestTimeAnalyzer(unittest.TestCase):
    """Tests for BestTimeAnalyzer."""
    
    def test_time_slot_creation(self):
        """Test TimeSlot creation."""
        slot = TimeSlot(
            day="Monday",
            hour=14,
            avg_engagement=150.5,
            sample_size=20,
            confidence="high",
        )
        
        self.assertEqual(slot.day, "Monday")
        self.assertEqual(slot.hour, 14)
        self.assertEqual(slot.time_str, "2:00 PM")
    
    def test_posting_schedule_text(self):
        """Test PostingSchedule text generation."""
        slots = [
            TimeSlot("Monday", 9, 100, 10, "high"),
            TimeSlot("Tuesday", 12, 90, 8, "medium"),
        ]
        
        schedule = PostingSchedule(
            best_slots=slots,
            worst_slots=[],
            by_day={},
            heatmap={},
            overall_best_days=["Monday", "Tuesday"],
            overall_best_hours=[9, 12],
            recommended_posts_per_day=2,
        )
        
        text = schedule.get_schedule_text()
        
        self.assertIn("Monday", text)
        self.assertIn("9:00 AM", text)


class TestAudienceInsights(unittest.TestCase):
    """Tests for AudienceInsights."""
    
    def test_audience_report_creation(self):
        """Test AudienceReport creation."""
        report = AudienceReport(
            total_followers=10000,
            sample_size=500,
            verified_percentage=5.0,
            active_percentage=80.0,
            likely_bots_percentage=2.0,
            avg_follower_count=500.0,
            avg_following_count=300.0,
        )
        
        self.assertEqual(report.total_followers, 10000)
        self.assertEqual(report.sample_size, 500)
    
    def test_audience_report_summary(self):
        """Test AudienceReport summary."""
        report = AudienceReport(
            total_followers=10000,
            sample_size=500,
            verified_percentage=5.0,
            active_percentage=80.0,
            likely_bots_percentage=2.0,
            avg_follower_count=500.0,
            avg_following_count=300.0,
        )
        
        summary = report.summary()
        
        self.assertIn("10,000", summary)
        self.assertIn("5.0%", summary)


class TestCompetitorAnalyzer(unittest.TestCase):
    """Tests for CompetitorAnalyzer."""
    
    def test_account_metrics_creation(self):
        """Test AccountMetrics creation."""
        metrics = AccountMetrics(
            username="testuser",
            followers_count=10000,
            following_count=500,
            tweets_count=2000,
            avg_likes=50.0,
            avg_retweets=10.0,
            avg_replies=5.0,
            engagement_rate=2.5,
            tweets_per_day=3.0,
        )
        
        self.assertEqual(metrics.username, "testuser")
        self.assertEqual(metrics.followers_count, 10000)
    
    def test_account_metrics_to_dict(self):
        """Test AccountMetrics serialization."""
        metrics = AccountMetrics(
            username="testuser",
            followers_count=10000,
            following_count=500,
            tweets_count=2000,
            avg_likes=50.0,
            avg_retweets=10.0,
            avg_replies=5.0,
            engagement_rate=2.5,
            tweets_per_day=3.0,
        )
        
        data = metrics.to_dict()
        
        self.assertIn("username", data)
        self.assertIn("engagement_rate", data)


class TestReportGenerator(unittest.TestCase):
    """Tests for ReportGenerator."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.generator = ReportGenerator()
    
    def test_create_report(self):
        """Test creating a custom report."""
        sections = [
            ReportSection(title="Overview", content="This is the overview."),
            ReportSection(title="Details", content="These are the details."),
        ]
        
        report = self.generator.create_report(
            title="Test Report",
            sections=sections,
            summary="Test summary",
        )
        
        self.assertEqual(report.title, "Test Report")
        self.assertEqual(len(report.sections), 2)
    
    def test_report_to_markdown(self):
        """Test report Markdown export."""
        sections = [
            ReportSection(title="Overview", content="Content here"),
        ]
        
        report = self.generator.create_report(
            title="Test Report",
            sections=sections,
        )
        
        markdown = report.to_markdown()
        
        self.assertIn("# Test Report", markdown)
        self.assertIn("## Overview", markdown)
    
    def test_report_to_html(self):
        """Test report HTML export."""
        sections = [
            ReportSection(title="Overview", content="Content here"),
        ]
        
        report = self.generator.create_report(
            title="Test Report",
            sections=sections,
        )
        
        html = report.to_html()
        
        self.assertIn("<html>", html)
        self.assertIn("Test Report", html)
    
    def test_report_to_dict(self):
        """Test report dictionary export."""
        sections = [
            ReportSection(title="Overview", content="Content here"),
        ]
        
        report = self.generator.create_report(
            title="Test Report",
            sections=sections,
        )
        
        data = report.to_dict()
        
        self.assertIn("title", data)
        self.assertIn("sections", data)


if __name__ == "__main__":
    unittest.main()

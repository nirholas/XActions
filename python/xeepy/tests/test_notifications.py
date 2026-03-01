"""
Tests for the notifications module.
"""

import unittest
from unittest.mock import MagicMock, patch, AsyncMock

from xeepy.notifications.console import ConsoleNotifier, NotificationLevel
from xeepy.notifications.email import EmailNotifier, EmailConfig
from xeepy.notifications.webhook import WebhookNotifier, WebhookType
from xeepy.notifications.telegram import TelegramNotifier, TelegramConfig
from xeepy.notifications.manager import NotificationManager, NotifyConfig


class TestConsoleNotifier(unittest.TestCase):
    """Tests for ConsoleNotifier."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.notifier = ConsoleNotifier(use_colors=False)
    
    def test_notify_info(self):
        """Test info notification."""
        # Should not raise
        self.notifier.notify(
            title="Test Info",
            message="This is an info message",
            level=NotificationLevel.INFO,
        )
    
    def test_notify_error(self):
        """Test error notification."""
        self.notifier.notify(
            title="Test Error",
            message="This is an error message",
            level=NotificationLevel.ERROR,
        )
    
    def test_notify_with_data(self):
        """Test notification with additional data."""
        self.notifier.notify(
            title="Test",
            message="Message",
            level=NotificationLevel.INFO,
            data={"key": "value", "count": 42},
        )
    
    def test_format_table(self):
        """Test table formatting."""
        data = [
            {"name": "Alice", "age": 30},
            {"name": "Bob", "age": 25},
        ]
        
        table = self.notifier.format_table(data, headers=["name", "age"])
        
        self.assertIn("Alice", table)
        self.assertIn("Bob", table)


class TestWebhookNotifier(unittest.TestCase):
    """Tests for WebhookNotifier."""
    
    def test_detect_webhook_type_discord(self):
        """Test Discord webhook detection."""
        url = "https://discord.com/api/webhooks/123/abc"
        notifier = WebhookNotifier(url)
        
        self.assertEqual(notifier.webhook_type, WebhookType.DISCORD)
    
    def test_detect_webhook_type_slack(self):
        """Test Slack webhook detection."""
        url = "https://hooks.slack.com/services/T00/B00/xxx"
        notifier = WebhookNotifier(url)
        
        self.assertEqual(notifier.webhook_type, WebhookType.SLACK)
    
    def test_detect_webhook_type_generic(self):
        """Test generic webhook detection."""
        url = "https://example.com/webhook"
        notifier = WebhookNotifier(url)
        
        self.assertEqual(notifier.webhook_type, WebhookType.GENERIC)
    
    def test_format_discord_payload(self):
        """Test Discord payload formatting."""
        notifier = WebhookNotifier("https://discord.com/api/webhooks/123/abc")
        
        payload = notifier._format_discord_payload(
            title="Test",
            message="Hello Discord",
            level=NotificationLevel.INFO,
        )
        
        self.assertIn("embeds", payload)
        self.assertEqual(payload["embeds"][0]["title"], "Test")
    
    def test_format_slack_payload(self):
        """Test Slack payload formatting."""
        notifier = WebhookNotifier("https://hooks.slack.com/services/T00/B00/xxx")
        
        payload = notifier._format_slack_payload(
            title="Test",
            message="Hello Slack",
            level=NotificationLevel.WARNING,
        )
        
        self.assertIn("attachments", payload)
        self.assertIn("Test", payload["attachments"][0]["title"])


class TestEmailConfig(unittest.TestCase):
    """Tests for EmailConfig."""
    
    @patch.dict('os.environ', {
        'SMTP_HOST': 'smtp.test.com',
        'SMTP_PORT': '587',
        'SMTP_USER': 'user@test.com',
        'SMTP_PASSWORD': 'password123',
        'EMAIL_FROM': 'from@test.com',
        'EMAIL_TO': 'to@test.com',
    })
    def test_from_env(self):
        """Test creating config from environment variables."""
        config = EmailConfig.from_env()
        
        self.assertEqual(config.smtp_host, 'smtp.test.com')
        self.assertEqual(config.smtp_port, 587)
        self.assertEqual(config.smtp_user, 'user@test.com')
        self.assertEqual(config.smtp_password, 'password123')


class TestNotificationManager(unittest.TestCase):
    """Tests for NotificationManager."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.manager = NotificationManager()
        self.mock_notifier = MagicMock()
        self.mock_notifier.notify = MagicMock()
    
    def test_add_channel(self):
        """Test adding a notification channel."""
        self.manager.add_channel("test", self.mock_notifier)
        
        self.assertIn("test", self.manager._channels)
    
    def test_remove_channel(self):
        """Test removing a notification channel."""
        self.manager.add_channel("test", self.mock_notifier)
        self.manager.remove_channel("test")
        
        self.assertNotIn("test", self.manager._channels)
    
    def test_notify_all_channels(self):
        """Test notifying all channels."""
        mock1 = MagicMock()
        mock2 = MagicMock()
        
        self.manager.add_channel("channel1", mock1)
        self.manager.add_channel("channel2", mock2)
        
        self.manager.notify(
            title="Test",
            message="Hello",
            level=NotificationLevel.INFO,
        )
        
        mock1.notify.assert_called_once()
        mock2.notify.assert_called_once()
    
    def test_notify_specific_channels(self):
        """Test notifying specific channels only."""
        mock1 = MagicMock()
        mock2 = MagicMock()
        
        self.manager.add_channel("channel1", mock1)
        self.manager.add_channel("channel2", mock2)
        
        self.manager.notify(
            title="Test",
            message="Hello",
            level=NotificationLevel.INFO,
            channels=["channel1"],
        )
        
        mock1.notify.assert_called_once()
        mock2.notify.assert_not_called()
    
    def test_channel_error_handling(self):
        """Test that errors in one channel don't affect others."""
        mock1 = MagicMock()
        mock1.notify.side_effect = Exception("Channel 1 error")
        mock2 = MagicMock()
        
        self.manager.add_channel("channel1", mock1)
        self.manager.add_channel("channel2", mock2)
        
        # Should not raise
        self.manager.notify(
            title="Test",
            message="Hello",
            level=NotificationLevel.INFO,
        )
        
        # Channel 2 should still be called
        mock2.notify.assert_called_once()


if __name__ == "__main__":
    unittest.main()

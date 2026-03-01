"""
Notification manager - unified interface for all notification channels.

Coordinates sending notifications through multiple channels.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Protocol, runtime_checkable

from .console import ConsoleNotifier, ConsoleConfig
from .email import EmailNotifier, EmailConfig
from .webhook import WebhookNotifier, WebhookConfig, WebhookType
from .telegram import TelegramNotifier, TelegramConfig


@runtime_checkable
class Notifier(Protocol):
    """Protocol for notification handlers"""
    
    async def notify(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Send a notification"""
        ...


@dataclass
class NotifyConfig:
    """
    Unified notification configuration.
    
    Example:
        config = NotifyConfig(
            console=True,
            email=EmailConfig(...),
            webhook_url="https://discord.com/api/webhooks/...",
            telegram=TelegramConfig(...),
        )
    """
    console: bool = True
    console_config: Optional[ConsoleConfig] = None
    email: Optional[EmailConfig] = None
    webhook_url: Optional[str] = None
    webhook_config: Optional[WebhookConfig] = None
    telegram: Optional[TelegramConfig] = None
    
    # Event filtering
    enabled_events: Optional[List[str]] = None  # None = all events
    disabled_events: List[str] = field(default_factory=list)
    
    # Channel-specific event routing
    console_events: Optional[List[str]] = None
    email_events: Optional[List[str]] = None
    webhook_events: Optional[List[str]] = None
    telegram_events: Optional[List[str]] = None
    
    @classmethod
    def from_env(cls) -> "NotifyConfig":
        """
        Load notification configuration from environment variables.
        
        Environment variables:
        - XEEPY_NOTIFY_CONSOLE: "true" or "false"
        - XEEPY_EMAIL_*: Email configuration
        - XEEPY_WEBHOOK_URL: Webhook URL
        - XEEPY_TELEGRAM_*: Telegram configuration
        """
        import os
        
        config = cls(
            console=os.environ.get("XEEPY_NOTIFY_CONSOLE", "true").lower() == "true",
        )
        
        # Email config
        if os.environ.get("XEEPY_EMAIL_SMTP_HOST"):
            try:
                config.email = EmailConfig.from_env()
            except Exception:
                pass
        
        # Webhook
        webhook_url = os.environ.get("XEEPY_WEBHOOK_URL")
        if webhook_url:
            config.webhook_url = webhook_url
        
        # Telegram
        if os.environ.get("XEEPY_TELEGRAM_BOT_TOKEN"):
            try:
                config.telegram = TelegramConfig.from_env()
            except Exception:
                pass
        
        return config


class NotificationManager:
    """
    Unified notification manager.
    
    Sends notifications through all configured channels with
    event filtering and error handling.
    
    Example:
        config = NotifyConfig(
            console=True,
            webhook_url="https://discord.com/api/webhooks/...",
        )
        
        manager = NotificationManager(config)
        await manager.notify(
            "unfollower_detected",
            "User @example unfollowed you",
            {"total_unfollowers": 5},
        )
    """
    
    def __init__(self, config: Optional[NotifyConfig] = None):
        """
        Initialize notification manager.
        
        Args:
            config: Notification configuration (default: console only)
        """
        self.config = config or NotifyConfig()
        self.handlers: Dict[str, Notifier] = {}
        self._setup_handlers()
    
    def _setup_handlers(self) -> None:
        """Setup notification handlers based on config"""
        # Console
        if self.config.console:
            self.handlers["console"] = ConsoleNotifier(
                self.config.console_config or ConsoleConfig()
            )
        
        # Email
        if self.config.email:
            self.handlers["email"] = EmailNotifier(self.config.email)
        
        # Webhook
        if self.config.webhook_config:
            self.handlers["webhook"] = WebhookNotifier(self.config.webhook_config)
        elif self.config.webhook_url:
            self.handlers["webhook"] = WebhookNotifier(self.config.webhook_url)
        
        # Telegram
        if self.config.telegram:
            self.handlers["telegram"] = TelegramNotifier(self.config.telegram)
    
    def _is_event_enabled(self, event: str, channel: str) -> bool:
        """Check if event should be sent to channel"""
        # Global event filtering
        if self.config.disabled_events and event in self.config.disabled_events:
            return False
        
        if self.config.enabled_events and event not in self.config.enabled_events:
            return False
        
        # Channel-specific filtering
        channel_events = getattr(self.config, f"{channel}_events", None)
        if channel_events is not None and event not in channel_events:
            return False
        
        return True
    
    async def notify(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        channels: Optional[List[str]] = None,
    ) -> Dict[str, bool]:
        """
        Send notification through all configured channels.
        
        Args:
            event: Event type identifier
            message: Notification message
            data: Additional data to include
            channels: Specific channels to use (None = all)
            
        Returns:
            Dictionary mapping channel name to success status
        """
        results = {}
        
        target_handlers = self.handlers
        if channels:
            target_handlers = {
                name: handler 
                for name, handler in self.handlers.items() 
                if name in channels
            }
        
        for channel, handler in target_handlers.items():
            if not self._is_event_enabled(event, channel):
                continue
            
            try:
                results[channel] = await handler.notify(event, message, data)
            except Exception as e:
                print(f"Notification failed for {channel}: {e}")
                results[channel] = False
        
        return results
    
    async def notify_unfollowers(
        self,
        unfollowers: List[str],
        total_before: int,
        total_after: int,
    ) -> Dict[str, bool]:
        """
        Send unfollower notification.
        
        Args:
            unfollowers: List of users who unfollowed
            total_before: Follower count before
            total_after: Follower count after
            
        Returns:
            Results for each channel
        """
        net_change = total_after - total_before
        
        message = f"{len(unfollowers)} user(s) unfollowed you"
        data = {
            "unfollowers": unfollowers[:10],
            "total_unfollowers": len(unfollowers),
            "followers_before": total_before,
            "followers_after": total_after,
            "net_change": net_change,
        }
        
        return await self.notify("unfollower_detected", message, data)
    
    async def notify_new_followers(
        self,
        new_followers: List[str],
    ) -> Dict[str, bool]:
        """
        Send new follower notification.
        
        Args:
            new_followers: List of new followers
            
        Returns:
            Results for each channel
        """
        if len(new_followers) == 1:
            message = f"New follower: @{new_followers[0]}"
        else:
            message = f"{len(new_followers)} new followers"
        
        data = {"new_followers": new_followers[:10]}
        
        return await self.notify("new_follower", message, data)
    
    async def notify_keyword_match(
        self,
        keyword: str,
        tweet_author: str,
        tweet_text: str,
        tweet_url: Optional[str] = None,
    ) -> Dict[str, bool]:
        """
        Send keyword match notification.
        
        Args:
            keyword: Matched keyword
            tweet_author: Tweet author
            tweet_text: Tweet text
            tweet_url: URL to tweet (optional)
            
        Returns:
            Results for each channel
        """
        message = f"Keyword '{keyword}' found in tweet by @{tweet_author}"
        data = {
            "keyword": keyword,
            "author": tweet_author,
            "preview": tweet_text[:200] if len(tweet_text) > 200 else tweet_text,
        }
        
        if tweet_url:
            data["url"] = tweet_url
        
        return await self.notify("keyword_match", message, data)
    
    async def notify_account_change(
        self,
        username: str,
        changes: Dict[str, Any],
    ) -> Dict[str, bool]:
        """
        Send account change notification.
        
        Args:
            username: Account that changed
            changes: Dictionary of changes
            
        Returns:
            Results for each channel
        """
        change_types = list(changes.keys())
        message = f"Changes detected for @{username}: {', '.join(change_types)}"
        
        return await self.notify("account_change", message, changes)
    
    def add_handler(self, name: str, handler: Notifier) -> None:
        """
        Add a custom notification handler.
        
        Args:
            name: Handler name
            handler: Handler instance (must implement Notifier protocol)
        """
        if not isinstance(handler, Notifier):
            raise TypeError("Handler must implement Notifier protocol")
        
        self.handlers[name] = handler
    
    def remove_handler(self, name: str) -> bool:
        """
        Remove a notification handler.
        
        Args:
            name: Handler name to remove
            
        Returns:
            True if removed, False if not found
        """
        if name in self.handlers:
            del self.handlers[name]
            return True
        return False
    
    def get_handlers(self) -> List[str]:
        """Get list of active handler names"""
        return list(self.handlers.keys())
    
    async def test_all(self) -> Dict[str, bool]:
        """
        Test all notification channels.
        
        Sends a test notification to verify configuration.
        
        Returns:
            Results for each channel
        """
        return await self.notify(
            "test",
            "This is a test notification from Xeepy",
            {"purpose": "configuration verification"},
        )

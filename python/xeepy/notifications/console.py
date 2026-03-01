"""
Console notification handler.

Outputs notifications to the console with color formatting.
"""

import sys
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional


class NotificationLevel(Enum):
    """Notification severity levels"""
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"
    ALERT = "alert"


# ANSI color codes
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    
    # Foreground colors
    BLACK = "\033[30m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    
    # Background colors
    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"
    BG_YELLOW = "\033[43m"
    BG_BLUE = "\033[44m"


# Level to color mapping
LEVEL_COLORS = {
    NotificationLevel.INFO: Colors.BLUE,
    NotificationLevel.SUCCESS: Colors.GREEN,
    NotificationLevel.WARNING: Colors.YELLOW,
    NotificationLevel.ERROR: Colors.RED,
    NotificationLevel.ALERT: Colors.MAGENTA + Colors.BOLD,
}

LEVEL_ICONS = {
    NotificationLevel.INFO: "ℹ️ ",
    NotificationLevel.SUCCESS: "✅",
    NotificationLevel.WARNING: "⚠️ ",
    NotificationLevel.ERROR: "❌",
    NotificationLevel.ALERT: "🚨",
}


@dataclass
class ConsoleConfig:
    """Configuration for console notifications"""
    use_colors: bool = True
    use_icons: bool = True
    show_timestamp: bool = True
    timestamp_format: str = "%Y-%m-%d %H:%M:%S"
    output_stream: Any = None  # Default to sys.stdout


class ConsoleNotifier:
    """
    Console notification handler.
    
    Outputs formatted notifications to the console with optional
    colors, icons, and timestamps.
    
    Example:
        notifier = ConsoleNotifier()
        await notifier.notify("unfollower_detected", "User @example unfollowed you")
        await notifier.notify("new_follower", "New follower: @newuser", level=NotificationLevel.SUCCESS)
    """
    
    # Event to level mapping
    EVENT_LEVELS = {
        "unfollower_detected": NotificationLevel.ALERT,
        "new_follower": NotificationLevel.SUCCESS,
        "follower_milestone": NotificationLevel.SUCCESS,
        "keyword_match": NotificationLevel.INFO,
        "account_change": NotificationLevel.WARNING,
        "error": NotificationLevel.ERROR,
        "monitoring_started": NotificationLevel.INFO,
        "monitoring_stopped": NotificationLevel.INFO,
        "snapshot_saved": NotificationLevel.SUCCESS,
        "report_generated": NotificationLevel.SUCCESS,
    }
    
    def __init__(self, config: Optional[ConsoleConfig] = None):
        """
        Initialize console notifier.
        
        Args:
            config: Console configuration
        """
        self.config = config or ConsoleConfig()
        self.output = self.config.output_stream or sys.stdout
        
        # Check if output supports colors
        self._supports_colors = self._check_color_support()
    
    def _check_color_support(self) -> bool:
        """Check if the output stream supports ANSI colors"""
        if not self.config.use_colors:
            return False
        
        # Check if stdout is a TTY
        if hasattr(self.output, 'isatty'):
            return self.output.isatty()
        
        return False
    
    def _colorize(self, text: str, color: str) -> str:
        """Apply color to text if supported"""
        if self._supports_colors:
            return f"{color}{text}{Colors.RESET}"
        return text
    
    def _format_message(
        self,
        event: str,
        message: str,
        level: NotificationLevel,
        data: Optional[dict] = None,
    ) -> str:
        """Format notification message"""
        parts = []
        
        # Timestamp
        if self.config.show_timestamp:
            timestamp = datetime.now().strftime(self.config.timestamp_format)
            parts.append(self._colorize(f"[{timestamp}]", Colors.CYAN))
        
        # Level icon
        if self.config.use_icons:
            icon = LEVEL_ICONS.get(level, "•")
            parts.append(icon)
        
        # Event type
        event_color = LEVEL_COLORS.get(level, Colors.WHITE)
        event_label = self._colorize(f"[{event.upper()}]", event_color)
        parts.append(event_label)
        
        # Message
        parts.append(message)
        
        # Additional data
        if data:
            data_str = self._format_data(data)
            if data_str:
                parts.append(self._colorize(f"| {data_str}", Colors.CYAN))
        
        return " ".join(parts)
    
    def _format_data(self, data: dict) -> str:
        """Format additional data for display"""
        items = []
        for key, value in data.items():
            if isinstance(value, list) and len(value) > 3:
                value = f"{value[:3]}... (+{len(value) - 3} more)"
            items.append(f"{key}={value}")
        return ", ".join(items)
    
    async def notify(
        self,
        event: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        level: Optional[NotificationLevel] = None,
    ) -> bool:
        """
        Send a console notification.
        
        Args:
            event: Event type identifier
            message: Notification message
            data: Additional data to display
            level: Notification level (auto-determined from event if not provided)
            
        Returns:
            True (console notifications always succeed)
        """
        if level is None:
            level = self.EVENT_LEVELS.get(event, NotificationLevel.INFO)
        
        formatted = self._format_message(event, message, level, data)
        
        print(formatted, file=self.output)
        
        # Flush to ensure immediate output
        if hasattr(self.output, 'flush'):
            self.output.flush()
        
        return True
    
    async def notify_unfollowers(
        self,
        unfollowers: list[str],
        total_before: int,
        total_after: int,
    ) -> bool:
        """
        Send formatted unfollower notification.
        
        Args:
            unfollowers: List of users who unfollowed
            total_before: Follower count before
            total_after: Follower count after
        """
        net_change = total_after - total_before
        
        message = f"{len(unfollowers)} user(s) unfollowed you"
        data = {
            "users": unfollowers[:5],  # Show first 5
            "total_unfollowers": len(unfollowers),
            "followers_before": total_before,
            "followers_after": total_after,
            "net_change": net_change,
        }
        
        return await self.notify("unfollower_detected", message, data, NotificationLevel.ALERT)
    
    async def notify_new_followers(
        self,
        new_followers: list[str],
    ) -> bool:
        """
        Send formatted new follower notification.
        
        Args:
            new_followers: List of new followers
        """
        if len(new_followers) == 1:
            message = f"New follower: @{new_followers[0]}"
        else:
            message = f"{len(new_followers)} new followers"
        
        data = {"users": new_followers[:5]} if len(new_followers) > 1 else None
        
        return await self.notify("new_follower", message, data, NotificationLevel.SUCCESS)
    
    async def notify_keyword_match(
        self,
        keyword: str,
        tweet_author: str,
        tweet_text: str,
    ) -> bool:
        """
        Send keyword match notification.
        
        Args:
            keyword: Matched keyword
            tweet_author: Tweet author username
            tweet_text: Tweet text (truncated if needed)
        """
        truncated_text = tweet_text[:100] + "..." if len(tweet_text) > 100 else tweet_text
        message = f"Keyword '{keyword}' found in tweet by @{tweet_author}"
        data = {"preview": truncated_text}
        
        return await self.notify("keyword_match", message, data, NotificationLevel.INFO)
    
    async def notify_account_change(
        self,
        username: str,
        change_type: str,
        details: str,
    ) -> bool:
        """
        Send account change notification.
        
        Args:
            username: Account that changed
            change_type: Type of change
            details: Change details
        """
        message = f"@{username}: {change_type}"
        data = {"details": details}
        
        return await self.notify("account_change", message, data, NotificationLevel.WARNING)
    
    def print_separator(self, char: str = "-", length: int = 50) -> None:
        """Print a visual separator line"""
        line = char * length
        print(self._colorize(line, Colors.CYAN), file=self.output)
    
    def print_header(self, title: str) -> None:
        """Print a section header"""
        self.print_separator("=")
        print(self._colorize(f"  {title}  ", Colors.BOLD + Colors.WHITE), file=self.output)
        self.print_separator("=")
    
    def print_table(self, headers: list[str], rows: list[list[str]]) -> None:
        """
        Print a formatted table.
        
        Args:
            headers: Column headers
            rows: Table rows
        """
        if not rows:
            return
        
        # Calculate column widths
        widths = [len(h) for h in headers]
        for row in rows:
            for i, cell in enumerate(row):
                widths[i] = max(widths[i], len(str(cell)))
        
        # Print header
        header_row = " | ".join(
            self._colorize(h.ljust(widths[i]), Colors.BOLD)
            for i, h in enumerate(headers)
        )
        print(header_row, file=self.output)
        print("-+-".join("-" * w for w in widths), file=self.output)
        
        # Print rows
        for row in rows:
            row_str = " | ".join(
                str(cell).ljust(widths[i])
                for i, cell in enumerate(row)
            )
            print(row_str, file=self.output)

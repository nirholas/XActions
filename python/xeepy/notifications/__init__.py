"""
Notifications module for xeepy.

Send notifications through various channels: console, email, webhooks, and Telegram.
"""

from .console import ConsoleNotifier
from .email import EmailNotifier, EmailConfig
from .webhook import WebhookNotifier
from .telegram import TelegramNotifier, TelegramConfig
from .manager import NotificationManager, NotifyConfig

__all__ = [
    "ConsoleNotifier",
    "EmailNotifier",
    "EmailConfig",
    "WebhookNotifier",
    "TelegramNotifier",
    "TelegramConfig",
    "NotificationManager",
    "NotifyConfig",
]

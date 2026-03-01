"""
Actions module for xeepy.

Provides automation actions for X/Twitter:
- Follow/Unfollow operations
- Direct Messages (DM)
- Scheduled tweets and drafts
- Poll creation
- Account settings management
- Engagement (like, retweet, bookmark, reply)
"""

from .base import (
    BaseAction,
    ActionResult,
    ActionStats,
    FollowResult,
    UnfollowResult,
    FollowFilters,
    RateLimiter,
    BrowserManager,
)

# Import new action modules
from .messaging import (
    DirectMessage,
    Conversation,
    DMInbox,
    DirectMessageActions,
)

from .scheduling import (
    ScheduledTweet,
    DraftTweet,
    SchedulingActions,
)

from .polls import (
    Poll,
    PollActions,
)

from .settings import (
    AccountSettings,
    NotificationSettings,
    SettingsActions,
)

__all__ = [
    # Base
    'BaseAction',
    'ActionResult',
    'ActionStats',
    'FollowResult',
    'UnfollowResult',
    'FollowFilters',
    'RateLimiter',
    'BrowserManager',
    # DM
    'DirectMessage',
    'Conversation',
    'DMInbox',
    'DirectMessageActions',
    # Scheduling
    'ScheduledTweet',
    'DraftTweet',
    'SchedulingActions',
    # Polls
    'Poll',
    'PollActions',
    # Settings
    'AccountSettings',
    'NotificationSettings',
    'SettingsActions',
]


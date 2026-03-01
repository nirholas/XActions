"""
Xeepy - X/Twitter Automation Toolkit

A comprehensive Python toolkit for X/Twitter scraping and automation
using browser automation (Playwright).

Features:
- Scraping: profiles, followers, tweets, replies, threads, hashtags, media, Spaces
- Actions: follow, unfollow, DM, scheduled tweets, polls, engagement
- GraphQL API: direct access with batch queries for higher rate limits
- Monitoring: unfollowers, keywords, engagement tracking
- Analytics: growth, engagement, audience insights
- Export: CSV, JSON, SQLite
"""

__version__ = "0.2.0"
__author__ = "Xeepy Team"

from xeepy.core.browser import BrowserManager
from xeepy.core.auth import AuthManager
from xeepy.core.rate_limiter import RateLimiter
from xeepy.core.config import Config
from xeepy.core.exceptions import XeepyError

# Storage
from xeepy.storage import Database, FollowTracker
from xeepy.storage import SnapshotStorage, TimeSeriesStorage

# Follow Actions
from xeepy.actions.follow import (
    FollowUser,
    FollowByKeyword,
    FollowByHashtag,
    FollowTargetFollowers,
    FollowEngagers,
    AutoFollow,
)

# Unfollow Actions
from xeepy.actions.unfollow import (
    UnfollowUser,
    UnfollowUsers,
    UnfollowAll,
    UnfollowNonFollowers,
    SmartUnfollow,
    UnfollowByCriteria,
)

# Base classes and utilities
from xeepy.actions.base import (
    BaseAction,
    FollowResult,
    UnfollowResult,
    FollowFilters,
    UnfollowFilters,
    ActionStats,
)

# NEW: DM Actions
from xeepy.actions.messaging import (
    DirectMessage,
    Conversation,
    DMInbox,
    DirectMessageActions,
)

# NEW: Scheduling Actions
from xeepy.actions.scheduling import (
    ScheduledTweet,
    DraftTweet,
    SchedulingActions,
)

# NEW: Poll Actions
from xeepy.actions.polls import Poll, PollActions

# NEW: Settings Actions
from xeepy.actions.settings import (
    AccountSettings,
    NotificationSettings,
    SettingsActions,
)

# NEW: Scrapers
from xeepy.scrapers import (
    SpacesScraper,
    Space,
    SpaceCategory,
    SpaceState,
    MediaDownloader,
    MediaItem,
    RecommendationsScraper,
    Trend,
    RecommendedUser,
)

# NEW: GraphQL API
from xeepy.api.graphql import GraphQLClient, Operation, create_graphql_client

# Monitoring
from xeepy.monitoring import (
    UnfollowerDetector,
    FollowerAlerts,
    AccountMonitor,
    KeywordMonitor,
    EngagementTracker,
)

# Analytics
from xeepy.analytics import (
    GrowthTracker,
    EngagementAnalytics,
    BestTimeAnalyzer,
    AudienceInsights,
    CompetitorAnalyzer,
    ReportGenerator,
)

# Notifications
from xeepy.notifications import (
    ConsoleNotifier,
    WebhookNotifier,
    TelegramNotifier,
    NotificationManager,
)

__all__ = [
    # Core
    "BrowserManager",
    "AuthManager", 
    "RateLimiter",
    "Config",
    "XeepyError",
    # Storage
    "Database",
    "FollowTracker",
    "SnapshotStorage",
    "TimeSeriesStorage",
    # Follow Actions
    "FollowUser",
    "FollowByKeyword",
    "FollowByHashtag",
    "FollowTargetFollowers",
    "FollowEngagers",
    "AutoFollow",
    # Unfollow Actions
    "UnfollowUser",
    "UnfollowUsers",
    "UnfollowAll",
    "UnfollowNonFollowers",
    "SmartUnfollow",
    "UnfollowByCriteria",
    # Base classes
    "BaseAction",
    "FollowResult",
    "UnfollowResult",
    "FollowFilters",
    "UnfollowFilters",
    "ActionStats",
    # DM Actions
    "DirectMessage",
    "Conversation",
    "DMInbox",
    "DirectMessageActions",
    # Scheduling Actions
    "ScheduledTweet",
    "DraftTweet",
    "SchedulingActions",
    # Poll Actions
    "Poll",
    "PollActions",
    # Settings Actions
    "AccountSettings",
    "NotificationSettings",
    "SettingsActions",
    # Scrapers
    "SpacesScraper",
    "Space",
    "SpaceCategory",
    "SpaceState",
    "MediaDownloader",
    "MediaItem",
    "RecommendationsScraper",
    "Trend",
    "RecommendedUser",
    # GraphQL
    "GraphQLClient",
    "Operation",
    "create_graphql_client",
    # Monitoring
    "UnfollowerDetector",
    "FollowerAlerts",
    "AccountMonitor",
    "KeywordMonitor",
    "EngagementTracker",
    # Analytics
    "GrowthTracker",
    "EngagementAnalytics",
    "BestTimeAnalyzer",
    "AudienceInsights",
    "CompetitorAnalyzer",
    "ReportGenerator",
    # Notifications
    "ConsoleNotifier",
    "WebhookNotifier",
    "TelegramNotifier",
    "NotificationManager",
]


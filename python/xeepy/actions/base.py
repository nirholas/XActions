"""
Base classes for xeepy actions.

Provides the foundational classes for all follow/unfollow operations,
including rate limiting, browser management, and result tracking.
"""

import asyncio
import logging
import random
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, Callable, Any, Protocol

logger = logging.getLogger(__name__)


# =============================================================================
# Protocol Definitions (for type hints without tight coupling)
# =============================================================================

class BrowserManager(Protocol):
    """
    Protocol for browser automation manager.
    
    Implementations should provide methods for navigating to pages,
    clicking elements, extracting data, etc.
    """
    
    async def goto(self, url: str) -> None:
        """Navigate to a URL."""
        ...
    
    async def click(self, selector: str) -> bool:
        """Click an element."""
        ...
    
    async def wait_for_selector(self, selector: str, timeout: int = 30000) -> bool:
        """Wait for an element to appear."""
        ...
    
    async def get_text(self, selector: str) -> Optional[str]:
        """Get text content of an element."""
        ...
    
    async def get_all_text(self, selector: str) -> list[str]:
        """Get text content of all matching elements."""
        ...
    
    async def scroll_down(self) -> None:
        """Scroll down the page."""
        ...
    
    async def is_logged_in(self) -> bool:
        """Check if user is logged in to X/Twitter."""
        ...
    
    async def screenshot(self, path: str) -> None:
        """Take a screenshot."""
        ...


# =============================================================================
# Rate Limiter
# =============================================================================

class RateLimitStrategy(Enum):
    """Rate limiting strategies."""
    FIXED = "fixed"           # Fixed delay between actions
    RANDOM = "random"         # Random delay within range
    ADAPTIVE = "adaptive"     # Adjust based on responses
    HUMANLIKE = "humanlike"   # Simulate human behavior patterns


@dataclass
class RateLimitConfig:
    """Configuration for rate limiting."""
    min_delay: float = 2.0        # Minimum seconds between actions
    max_delay: float = 5.0        # Maximum seconds between actions
    hourly_limit: int = 100       # Maximum actions per hour
    daily_limit: int = 400        # Maximum actions per day
    strategy: RateLimitStrategy = RateLimitStrategy.HUMANLIKE
    burst_limit: int = 10         # Max actions before longer pause
    burst_pause: float = 60.0     # Pause duration after burst
    error_backoff: float = 2.0    # Multiplier on error


class RateLimiter:
    """
    Rate limiter for X/Twitter actions.
    
    Manages delays between actions to avoid rate limiting,
    with support for different strategies and adaptive behavior.
    """
    
    def __init__(self, config: Optional[RateLimitConfig] = None):
        """
        Initialize rate limiter.
        
        Args:
            config: Rate limit configuration
        """
        self.config = config or RateLimitConfig()
        self._action_times: list[datetime] = []
        self._burst_count: int = 0
        self._last_action: Optional[datetime] = None
        self._consecutive_errors: int = 0
        self._paused_until: Optional[datetime] = None
    
    async def wait(self) -> float:
        """
        Wait the appropriate amount of time before next action.
        
        Returns:
            The number of seconds waited
        """
        # Check if we're in a pause
        if self._paused_until and datetime.now() < self._paused_until:
            wait_time = (self._paused_until - datetime.now()).total_seconds()
            logger.info(f"Rate limit pause: waiting {wait_time:.1f}s")
            await asyncio.sleep(wait_time)
            self._paused_until = None
            return wait_time
        
        # Calculate delay based on strategy
        delay = self._calculate_delay()
        
        # Check hourly/daily limits
        self._cleanup_old_actions()
        
        hour_ago = datetime.now() - timedelta(hours=1)
        hourly_count = sum(1 for t in self._action_times if t > hour_ago)
        
        if hourly_count >= self.config.hourly_limit:
            # Wait until we can make more actions
            oldest_in_hour = min(t for t in self._action_times if t > hour_ago)
            wait_until = oldest_in_hour + timedelta(hours=1)
            extra_wait = (wait_until - datetime.now()).total_seconds()
            if extra_wait > 0:
                logger.warning(f"Hourly limit reached, waiting {extra_wait:.1f}s")
                delay = max(delay, extra_wait)
        
        day_ago = datetime.now() - timedelta(days=1)
        daily_count = sum(1 for t in self._action_times if t > day_ago)
        
        if daily_count >= self.config.daily_limit:
            oldest_in_day = min(t for t in self._action_times if t > day_ago)
            wait_until = oldest_in_day + timedelta(days=1)
            extra_wait = (wait_until - datetime.now()).total_seconds()
            if extra_wait > 0:
                logger.warning(f"Daily limit reached, waiting {extra_wait:.1f}s")
                delay = max(delay, extra_wait)
        
        # Check burst limit
        self._burst_count += 1
        if self._burst_count >= self.config.burst_limit:
            logger.info(f"Burst limit reached, taking {self.config.burst_pause}s break")
            delay = max(delay, self.config.burst_pause)
            self._burst_count = 0
        
        # Apply error backoff
        if self._consecutive_errors > 0:
            backoff = self.config.error_backoff ** self._consecutive_errors
            delay *= backoff
            logger.debug(f"Error backoff applied: {backoff}x")
        
        if delay > 0:
            logger.debug(f"Rate limit: waiting {delay:.2f}s")
            await asyncio.sleep(delay)
        
        self._last_action = datetime.now()
        self._action_times.append(self._last_action)
        
        return delay
    
    def _calculate_delay(self) -> float:
        """Calculate delay based on strategy."""
        if self.config.strategy == RateLimitStrategy.FIXED:
            return self.config.min_delay
        
        elif self.config.strategy == RateLimitStrategy.RANDOM:
            return random.uniform(self.config.min_delay, self.config.max_delay)
        
        elif self.config.strategy == RateLimitStrategy.HUMANLIKE:
            # Simulate human-like timing with variability
            base = random.uniform(self.config.min_delay, self.config.max_delay)
            
            # Occasionally add "thinking" pauses
            if random.random() < 0.1:
                base += random.uniform(5, 15)
            
            # Occasionally very quick actions
            if random.random() < 0.2:
                base = max(1.0, base * 0.5)
            
            return base
        
        elif self.config.strategy == RateLimitStrategy.ADAPTIVE:
            # Start with random, adjust based on recent errors
            base = random.uniform(self.config.min_delay, self.config.max_delay)
            
            # Slow down if we've had recent errors
            if self._consecutive_errors > 0:
                base *= (1 + self._consecutive_errors * 0.5)
            
            return base
        
        return self.config.min_delay
    
    def _cleanup_old_actions(self):
        """Remove action times older than 24 hours."""
        cutoff = datetime.now() - timedelta(days=1)
        self._action_times = [t for t in self._action_times if t > cutoff]
    
    def record_success(self):
        """Record a successful action."""
        self._consecutive_errors = 0
    
    def record_error(self):
        """Record a failed action."""
        self._consecutive_errors += 1
    
    def pause(self, seconds: float):
        """Pause rate limiter for specified duration."""
        self._paused_until = datetime.now() + timedelta(seconds=seconds)
        logger.info(f"Rate limiter paused for {seconds}s")
    
    def get_stats(self) -> dict:
        """Get rate limiter statistics."""
        self._cleanup_old_actions()
        
        hour_ago = datetime.now() - timedelta(hours=1)
        day_ago = datetime.now() - timedelta(days=1)
        
        return {
            'actions_last_hour': sum(1 for t in self._action_times if t > hour_ago),
            'actions_last_day': sum(1 for t in self._action_times if t > day_ago),
            'hourly_limit': self.config.hourly_limit,
            'daily_limit': self.config.daily_limit,
            'consecutive_errors': self._consecutive_errors,
            'burst_count': self._burst_count,
            'is_paused': self._paused_until is not None and datetime.now() < self._paused_until
        }


# =============================================================================
# Result Classes
# =============================================================================

@dataclass
class ActionStats:
    """Statistics for an action execution."""
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    total_processed: int = 0
    success_count: int = 0
    failed_count: int = 0
    skipped_count: int = 0
    rate_limited: bool = False
    errors: list[str] = field(default_factory=list)
    
    @property
    def duration_seconds(self) -> float:
        """Get duration in seconds."""
        end = self.completed_at or datetime.now()
        return (end - self.started_at).total_seconds()
    
    def complete(self):
        """Mark action as complete."""
        self.completed_at = datetime.now()
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            'started_at': self.started_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration_seconds': self.duration_seconds,
            'total_processed': self.total_processed,
            'success_count': self.success_count,
            'failed_count': self.failed_count,
            'skipped_count': self.skipped_count,
            'rate_limited': self.rate_limited,
            'errors': self.errors
        }


@dataclass
class ActionResult:
    """Base result for any action."""
    success: bool
    message: str
    stats: ActionStats
    data: Optional[dict] = None


@dataclass
class FollowResult:
    """Result of a follow operation."""
    success_count: int
    failed_count: int
    skipped_count: int
    followed_users: list[str]
    failed_users: list[str]
    skipped_users: list[str]
    duration_seconds: float
    rate_limited: bool
    errors: list[str] = field(default_factory=list)
    
    @property
    def total_processed(self) -> int:
        return self.success_count + self.failed_count + self.skipped_count
    
    def to_dict(self) -> dict:
        return {
            'success_count': self.success_count,
            'failed_count': self.failed_count,
            'skipped_count': self.skipped_count,
            'followed_users': self.followed_users,
            'failed_users': self.failed_users,
            'skipped_users': self.skipped_users,
            'duration_seconds': self.duration_seconds,
            'rate_limited': self.rate_limited,
            'errors': self.errors
        }


@dataclass
class UnfollowResult:
    """Result of an unfollow operation."""
    success_count: int
    failed_count: int
    skipped_count: int
    unfollowed_users: list[str]
    failed_users: list[str]
    skipped_users: list[str]
    duration_seconds: float
    rate_limited: bool
    errors: list[str] = field(default_factory=list)
    
    @property
    def total_processed(self) -> int:
        return self.success_count + self.failed_count + self.skipped_count
    
    def to_dict(self) -> dict:
        return {
            'success_count': self.success_count,
            'failed_count': self.failed_count,
            'skipped_count': self.skipped_count,
            'unfollowed_users': self.unfollowed_users,
            'failed_users': self.failed_users,
            'skipped_users': self.skipped_users,
            'duration_seconds': self.duration_seconds,
            'rate_limited': self.rate_limited,
            'errors': self.errors
        }


# =============================================================================
# Filters
# =============================================================================

@dataclass
class FollowFilters:
    """Filters for who to follow."""
    min_followers: int = 100
    max_followers: int = 100000
    min_following: int = 0
    max_following: int = 50000
    min_tweets: int = 10
    max_tweets: Optional[int] = None
    min_account_age_days: int = 30
    must_have_bio: bool = True
    must_have_profile_pic: bool = True
    exclude_verified: bool = False
    exclude_default_pic: bool = True
    language: Optional[str] = None
    keywords_in_bio: Optional[list[str]] = None
    exclude_keywords_in_bio: Optional[list[str]] = None
    min_follower_ratio: Optional[float] = None  # followers/following ratio
    max_follower_ratio: Optional[float] = None
    exclude_protected: bool = True
    
    def matches(self, profile: dict) -> tuple[bool, str]:
        """
        Check if a profile matches the filters.
        
        Args:
            profile: User profile dictionary
            
        Returns:
            Tuple of (matches, reason if not matching)
        """
        followers = profile.get('followers_count', 0)
        following = profile.get('following_count', 0)
        tweets = profile.get('tweets_count', 0)
        bio = profile.get('bio', '')
        has_profile_pic = profile.get('has_profile_pic', True)
        is_verified = profile.get('verified', False)
        is_protected = profile.get('protected', False)
        account_created = profile.get('created_at')
        
        # Follower count checks
        if followers < self.min_followers:
            return False, f"Too few followers ({followers} < {self.min_followers})"
        if followers > self.max_followers:
            return False, f"Too many followers ({followers} > {self.max_followers})"
        
        # Following count checks
        if following < self.min_following:
            return False, f"Too few following ({following} < {self.min_following})"
        if following > self.max_following:
            return False, f"Too many following ({following} > {self.max_following})"
        
        # Tweet count checks
        if tweets < self.min_tweets:
            return False, f"Too few tweets ({tweets} < {self.min_tweets})"
        if self.max_tweets and tweets > self.max_tweets:
            return False, f"Too many tweets ({tweets} > {self.max_tweets})"
        
        # Account age check
        if account_created and self.min_account_age_days > 0:
            if isinstance(account_created, str):
                from datetime import datetime
                account_created = datetime.fromisoformat(account_created.replace('Z', '+00:00'))
            age_days = (datetime.now(account_created.tzinfo) - account_created).days
            if age_days < self.min_account_age_days:
                return False, f"Account too new ({age_days} < {self.min_account_age_days} days)"
        
        # Bio checks
        if self.must_have_bio and not bio:
            return False, "No bio"
        
        if self.keywords_in_bio:
            bio_lower = bio.lower()
            if not any(kw.lower() in bio_lower for kw in self.keywords_in_bio):
                return False, "Bio doesn't contain required keywords"
        
        if self.exclude_keywords_in_bio and bio:
            bio_lower = bio.lower()
            for kw in self.exclude_keywords_in_bio:
                if kw.lower() in bio_lower:
                    return False, f"Bio contains excluded keyword: {kw}"
        
        # Profile pic check
        if self.must_have_profile_pic and not has_profile_pic:
            return False, "No profile picture"
        if self.exclude_default_pic and not has_profile_pic:
            return False, "Default profile picture"
        
        # Verified check
        if self.exclude_verified and is_verified:
            return False, "Verified account excluded"
        
        # Protected check
        if self.exclude_protected and is_protected:
            return False, "Protected account excluded"
        
        # Follower ratio check
        if following > 0:
            ratio = followers / following
            if self.min_follower_ratio and ratio < self.min_follower_ratio:
                return False, f"Follower ratio too low ({ratio:.2f} < {self.min_follower_ratio})"
            if self.max_follower_ratio and ratio > self.max_follower_ratio:
                return False, f"Follower ratio too high ({ratio:.2f} > {self.max_follower_ratio})"
        
        return True, "Matches all filters"


@dataclass
class UnfollowFilters:
    """Filters for who to unfollow."""
    min_followers: Optional[int] = None  # Keep if they have >= this many followers
    max_followers: Optional[int] = None
    min_following_days: Optional[int] = None  # Grace period
    is_verified: Optional[bool] = None  # True = only verified, False = only non-verified
    has_interacted: Optional[bool] = None  # Keep if they've interacted with you
    
    def should_unfollow(self, profile: dict, followed_at: Optional[datetime] = None) -> tuple[bool, str]:
        """
        Check if a user should be unfollowed.
        
        Args:
            profile: User profile dictionary
            followed_at: When we followed this user
            
        Returns:
            Tuple of (should_unfollow, reason)
        """
        followers = profile.get('followers_count', 0)
        is_verified = profile.get('verified', False)
        has_interacted = profile.get('has_interacted', False)
        
        # Check follower count (keep if they have many followers)
        if self.min_followers and followers >= self.min_followers:
            return False, f"Has {followers} followers (>= {self.min_followers})"
        
        if self.max_followers and followers > self.max_followers:
            return True, f"Has too many followers ({followers} > {self.max_followers})"
        
        # Check grace period
        if self.min_following_days and followed_at:
            days_following = (datetime.now() - followed_at).days
            if days_following < self.min_following_days:
                return False, f"Only following for {days_following} days (< {self.min_following_days})"
        
        # Check verified status
        if self.is_verified is not None:
            if self.is_verified and not is_verified:
                return True, "Not verified"
            if not self.is_verified and is_verified:
                return False, "Is verified"
        
        # Check interaction
        if self.has_interacted is not None:
            if self.has_interacted and not has_interacted:
                return True, "Has not interacted"
            if not self.has_interacted and has_interacted:
                return False, "Has interacted"
        
        return True, "Matches unfollow criteria"


# =============================================================================
# Base Action Class
# =============================================================================

class BaseAction(ABC):
    """
    Base class for all follow/unfollow actions.
    
    Provides common functionality for:
    - Rate limiting
    - Progress tracking
    - Error handling
    - Statistics collection
    - Logging
    """
    
    def __init__(
        self,
        browser: BrowserManager,
        rate_limiter: RateLimiter,
        tracker: Any = None,  # FollowTracker
    ):
        """
        Initialize the action.
        
        Args:
            browser: Browser automation manager
            rate_limiter: Rate limiter instance
            tracker: Follow tracker for persistence
        """
        self.browser = browser
        self.rate_limiter = rate_limiter
        self.tracker = tracker
        self.stats = ActionStats()
        self._cancelled = False
        self._paused = False
        self.logger = logging.getLogger(self.__class__.__name__)
    
    @abstractmethod
    async def execute(self, **kwargs) -> ActionResult:
        """
        Execute the action with full logging and tracking.
        
        Must be implemented by subclasses.
        """
        raise NotImplementedError
    
    async def validate_preconditions(self) -> tuple[bool, str]:
        """
        Check if action can be performed.
        
        Returns:
            Tuple of (can_proceed, message)
        """
        # Check if logged in
        if not await self.browser.is_logged_in():
            return False, "Not logged in to X/Twitter"
        
        # Check rate limiter status
        rate_stats = self.rate_limiter.get_stats()
        if rate_stats['is_paused']:
            return False, "Rate limiter is paused"
        
        if rate_stats['actions_last_day'] >= rate_stats['daily_limit']:
            return False, "Daily action limit reached"
        
        return True, "Preconditions met"
    
    def get_stats(self) -> dict:
        """Return execution statistics."""
        return self.stats.to_dict()
    
    def cancel(self):
        """Cancel the action."""
        self._cancelled = True
        self.logger.info("Action cancelled")
    
    def pause(self):
        """Pause the action."""
        self._paused = True
        self.logger.info("Action paused")
    
    def resume(self):
        """Resume the action."""
        self._paused = False
        self.logger.info("Action resumed")
    
    async def _wait_if_paused(self):
        """Wait while action is paused."""
        while self._paused and not self._cancelled:
            await asyncio.sleep(1)
    
    async def _handle_rate_limit(self):
        """Handle rate limiting with wait."""
        await self.rate_limiter.wait()
    
    def _log_progress(
        self,
        current: int,
        total: int,
        message: str = "",
        on_progress: Optional[Callable] = None
    ):
        """Log progress and call callback if provided."""
        percent = (current / total * 100) if total > 0 else 0
        log_msg = f"Progress: {current}/{total} ({percent:.1f}%)"
        if message:
            log_msg += f" - {message}"
        self.logger.info(log_msg)
        
        if on_progress:
            try:
                on_progress(current, total, message)
            except Exception as e:
                self.logger.warning(f"Progress callback error: {e}")
    
    async def _safe_action(
        self,
        action_func: Callable,
        *args,
        **kwargs
    ) -> tuple[bool, Optional[str]]:
        """
        Execute an action with error handling.
        
        Returns:
            Tuple of (success, error_message)
        """
        try:
            result = await action_func(*args, **kwargs)
            self.rate_limiter.record_success()
            return result, None
        except Exception as e:
            self.rate_limiter.record_error()
            error_msg = str(e)
            self.logger.error(f"Action failed: {error_msg}")
            self.stats.errors.append(error_msg)
            return False, error_msg


# =============================================================================
# X/Twitter Selectors (CSS selectors for browser automation)
# =============================================================================

class XSelectors:
    """CSS selectors for X/Twitter elements."""
    
    # Profile page
    FOLLOW_BUTTON = '[data-testid="follow"]'
    UNFOLLOW_BUTTON = '[data-testid="unfollow"]'
    FOLLOWING_BUTTON = '[data-testid="following"]'  # Shows when already following
    CONFIRM_UNFOLLOW = '[data-testid="confirmationSheetConfirm"]'
    
    # User cells in lists
    USER_CELL = '[data-testid="UserCell"]'
    USER_NAME = '[data-testid="User-Name"]'
    USER_LINK = 'a[role="link"][href*="/"]'
    
    # Profile info
    PROFILE_NAME = '[data-testid="UserName"]'
    PROFILE_BIO = '[data-testid="UserDescription"]'
    FOLLOWERS_LINK = 'a[href$="/followers"]'
    FOLLOWING_LINK = 'a[href$="/following"]'
    
    # Tabs and navigation
    FOLLOWERS_TAB = '[role="tab"][href$="/followers"]'
    FOLLOWING_TAB = '[role="tab"][href$="/following"]'
    
    # Search
    SEARCH_INPUT = '[data-testid="SearchBox_Search_Input"]'
    SEARCH_RESULTS = '[data-testid="TypeaheadUser"]'
    
    # Tweet engagement
    LIKE_BUTTON = '[data-testid="like"]'
    UNLIKE_BUTTON = '[data-testid="unlike"]'
    RETWEET_BUTTON = '[data-testid="retweet"]'
    REPLY_BUTTON = '[data-testid="reply"]'
    
    # Lists
    TIMELINE = '[data-testid="primaryColumn"]'
    TWEET = '[data-testid="tweet"]'
    
    # Modals
    MODAL_CLOSE = '[data-testid="app-bar-close"]'
    
    # Rate limit / error indicators
    RATE_LIMIT_MESSAGE = 'text="Rate limit exceeded"'
    ERROR_MESSAGE = '[data-testid="error-detail"]'


# =============================================================================
# X/Twitter URLs
# =============================================================================

class XUrls:
    """URL patterns for X/Twitter."""
    
    BASE = "https://x.com"
    PROFILE = "https://x.com/{username}"
    FOLLOWERS = "https://x.com/{username}/followers"
    FOLLOWING = "https://x.com/{username}/following"
    SEARCH = "https://x.com/search?q={query}&src=typed_query&f=user"
    SEARCH_TWEETS = "https://x.com/search?q={query}&src=typed_query"
    HASHTAG = "https://x.com/hashtag/{hashtag}"
    TWEET = "https://x.com/{username}/status/{tweet_id}"
    TWEET_LIKERS = "https://x.com/{username}/status/{tweet_id}/likes"
    TWEET_RETWEETERS = "https://x.com/{username}/status/{tweet_id}/retweets"
    HOME = "https://x.com/home"
    NOTIFICATIONS = "https://x.com/notifications"

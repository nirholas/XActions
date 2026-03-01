"""
Automated following with rules and scheduling.

Combines multiple follow strategies with intelligent rules.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Callable, Any
from enum import Enum

from ..base import (
    BaseAction,
    ActionStats,
    FollowResult,
    FollowFilters,
    RateLimiter,
    BrowserManager,
)
from .follow_by_keyword import FollowByKeyword
from .follow_by_hashtag import FollowByHashtag
from .follow_followers import FollowTargetFollowers
from .follow_engagers import FollowEngagers

logger = logging.getLogger(__name__)


class FollowStrategy(Enum):
    """Available follow strategies."""
    KEYWORD = "keyword"
    HASHTAG = "hashtag"
    TARGET_FOLLOWERS = "target_followers"
    TARGET_FOLLOWING = "target_following"
    ENGAGERS = "engagers"


@dataclass
class FollowRule:
    """Rule for automated following."""
    strategy: FollowStrategy
    params: dict
    weight: float = 1.0  # Relative weight for selection
    daily_limit: Optional[int] = None
    enabled: bool = True
    last_run: Optional[datetime] = None
    runs_today: int = 0


@dataclass
class AutoFollowConfig:
    """Configuration for automated following."""
    daily_follow_limit: int = 100
    hourly_follow_limit: int = 25
    min_interval_minutes: int = 30
    max_interval_minutes: int = 120
    active_hours: tuple[int, int] = (9, 22)  # Start and end hour (24h format)
    filters: Optional[FollowFilters] = None
    rules: list[FollowRule] = field(default_factory=list)
    stop_on_error_count: int = 5
    dry_run: bool = False


@dataclass
class AutoFollowStats:
    """Statistics for auto follow session."""
    started_at: datetime = field(default_factory=datetime.now)
    total_followed: int = 0
    total_failed: int = 0
    total_skipped: int = 0
    runs_completed: int = 0
    errors: list[str] = field(default_factory=list)
    by_strategy: dict = field(default_factory=dict)


class AutoFollow(BaseAction):
    """
    Automated following with rules and scheduling.
    
    Combines multiple follow strategies (keywords, hashtags, target followers, etc.)
    with intelligent rules, rate limiting, and scheduling.
    """
    
    def __init__(
        self,
        browser: BrowserManager,
        rate_limiter: RateLimiter,
        tracker: Any = None,
        config: Optional[AutoFollowConfig] = None,
    ):
        """
        Initialize auto follow.
        
        Args:
            browser: Browser automation manager
            rate_limiter: Rate limiter instance
            tracker: Follow tracker for persistence
            config: Auto follow configuration
        """
        super().__init__(browser, rate_limiter, tracker)
        self.config = config or AutoFollowConfig()
        self.auto_stats = AutoFollowStats()
        self._running = False
        self._next_run: Optional[datetime] = None
    
    async def execute(
        self,
        duration_hours: Optional[float] = None,
        max_follows: Optional[int] = None,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
        on_follow: Optional[Callable[[str, bool], None]] = None,
        on_run_complete: Optional[Callable[[FollowResult], None]] = None,
    ) -> FollowResult:
        """
        Run automated following.
        
        Args:
            duration_hours: How long to run (None for indefinite)
            max_follows: Maximum total follows (None for config limit)
            on_progress: Progress callback
            on_follow: Called after each follow
            on_run_complete: Called after each strategy run
            
        Returns:
            FollowResult with aggregated results
        """
        self.stats = ActionStats()
        self.auto_stats = AutoFollowStats()
        self._running = True
        
        followed_users = []
        failed_users = []
        skipped_users = []
        
        end_time = None
        if duration_hours:
            end_time = datetime.now() + timedelta(hours=duration_hours)
        
        max_follows = max_follows or self.config.daily_follow_limit
        
        self.logger.info(
            f"Starting auto follow: duration={duration_hours}h, max={max_follows}"
        )
        
        if self.config.dry_run:
            self.logger.info("DRY RUN - no follows will be performed")
        
        # Validate preconditions
        can_proceed, message = await self.validate_preconditions()
        if not can_proceed:
            self.logger.error(f"Precondition failed: {message}")
            return self._build_result(followed_users, failed_users, skipped_users, [message])
        
        consecutive_errors = 0
        
        while self._running:
            # Check stopping conditions
            if self._cancelled:
                self.logger.info("Auto follow cancelled")
                break
            
            if end_time and datetime.now() >= end_time:
                self.logger.info("Duration reached, stopping")
                break
            
            if len(followed_users) >= max_follows:
                self.logger.info("Max follows reached")
                break
            
            if consecutive_errors >= self.config.stop_on_error_count:
                self.logger.error(f"Too many consecutive errors ({consecutive_errors}), stopping")
                break
            
            # Check if within active hours
            if not self._is_active_hour():
                wait_time = self._time_until_active()
                self.logger.info(f"Outside active hours, waiting {wait_time:.0f} minutes")
                await self._wait_or_cancel(wait_time * 60)
                continue
            
            # Wait if paused
            await self._wait_if_paused()
            
            # Select and run a strategy
            rule = self._select_rule()
            if not rule:
                self.logger.warning("No enabled rules available")
                await self._wait_or_cancel(60)
                continue
            
            try:
                self.logger.info(f"Running strategy: {rule.strategy.value}")
                
                # Calculate how many to follow this run
                remaining = max_follows - len(followed_users)
                run_limit = min(
                    remaining,
                    self.config.hourly_follow_limit,
                    rule.daily_limit or remaining
                )
                
                result = await self._run_strategy(
                    rule,
                    max_follows=run_limit,
                    on_progress=on_progress,
                    on_follow=on_follow
                )
                
                # Aggregate results
                followed_users.extend(result.followed_users)
                failed_users.extend(result.failed_users)
                skipped_users.extend(result.skipped_users)
                self.stats.errors.extend(result.errors)
                
                # Update stats
                self.auto_stats.total_followed += result.success_count
                self.auto_stats.total_failed += result.failed_count
                self.auto_stats.total_skipped += result.skipped_count
                self.auto_stats.runs_completed += 1
                
                # Track by strategy
                strategy_key = rule.strategy.value
                if strategy_key not in self.auto_stats.by_strategy:
                    self.auto_stats.by_strategy[strategy_key] = {
                        'followed': 0, 'failed': 0, 'skipped': 0
                    }
                self.auto_stats.by_strategy[strategy_key]['followed'] += result.success_count
                self.auto_stats.by_strategy[strategy_key]['failed'] += result.failed_count
                self.auto_stats.by_strategy[strategy_key]['skipped'] += result.skipped_count
                
                # Update rule tracking
                rule.last_run = datetime.now()
                rule.runs_today += 1
                
                if on_run_complete:
                    on_run_complete(result)
                
                if result.rate_limited:
                    self.logger.warning("Rate limited, taking extended break")
                    await self._wait_or_cancel(self.config.max_interval_minutes * 60)
                    consecutive_errors += 1
                else:
                    consecutive_errors = 0
                
            except Exception as e:
                error_msg = f"Strategy error: {str(e)}"
                self.logger.error(error_msg)
                self.stats.errors.append(error_msg)
                self.auto_stats.errors.append(error_msg)
                consecutive_errors += 1
            
            # Wait before next run
            wait_minutes = self._calculate_wait_time()
            self._next_run = datetime.now() + timedelta(minutes=wait_minutes)
            self.logger.info(f"Next run in {wait_minutes:.0f} minutes")
            
            await self._wait_or_cancel(wait_minutes * 60)
        
        self._running = False
        self.stats.success_count = len(followed_users)
        self.stats.failed_count = len(failed_users)
        self.stats.skipped_count = len(skipped_users)
        self.stats.complete()
        
        self.logger.info(
            f"Auto follow complete: {len(followed_users)} followed, "
            f"{len(failed_users)} failed, {len(skipped_users)} skipped, "
            f"{self.auto_stats.runs_completed} runs"
        )
        
        return self._build_result(followed_users, failed_users, skipped_users)
    
    def _select_rule(self) -> Optional[FollowRule]:
        """Select a rule to run based on weights and availability."""
        import random
        
        available_rules = [
            r for r in self.config.rules
            if r.enabled and (r.daily_limit is None or r.runs_today < r.daily_limit)
        ]
        
        if not available_rules:
            return None
        
        # Weighted random selection
        total_weight = sum(r.weight for r in available_rules)
        choice = random.uniform(0, total_weight)
        
        cumulative = 0
        for rule in available_rules:
            cumulative += rule.weight
            if choice <= cumulative:
                return rule
        
        return available_rules[-1]
    
    async def _run_strategy(
        self,
        rule: FollowRule,
        max_follows: int,
        on_progress: Optional[Callable] = None,
        on_follow: Optional[Callable] = None,
    ) -> FollowResult:
        """Run a specific follow strategy."""
        
        filters = self.config.filters or FollowFilters()
        
        if rule.strategy == FollowStrategy.KEYWORD:
            action = FollowByKeyword(self.browser, self.rate_limiter, self.tracker)
            return await action.execute(
                keywords=rule.params.get('keywords', []),
                max_follows=max_follows,
                filters=filters,
                dry_run=self.config.dry_run,
                on_progress=on_progress,
                on_follow=on_follow,
            )
        
        elif rule.strategy == FollowStrategy.HASHTAG:
            action = FollowByHashtag(self.browser, self.rate_limiter, self.tracker)
            return await action.execute(
                hashtags=rule.params.get('hashtags', []),
                max_follows=max_follows,
                filters=filters,
                dry_run=self.config.dry_run,
                on_progress=on_progress,
                on_follow=on_follow,
            )
        
        elif rule.strategy in (FollowStrategy.TARGET_FOLLOWERS, FollowStrategy.TARGET_FOLLOWING):
            action = FollowTargetFollowers(self.browser, self.rate_limiter, self.tracker)
            mode = 'followers' if rule.strategy == FollowStrategy.TARGET_FOLLOWERS else 'following'
            return await action.execute(
                target_username=rule.params.get('target', ''),
                max_follows=max_follows,
                mode=mode,
                filters=filters,
                dry_run=self.config.dry_run,
                on_progress=on_progress,
                on_follow=on_follow,
            )
        
        elif rule.strategy == FollowStrategy.ENGAGERS:
            action = FollowEngagers(self.browser, self.rate_limiter, self.tracker)
            return await action.execute(
                tweet_urls=rule.params.get('tweet_urls', []),
                engagement_type=rule.params.get('engagement_type', 'likers'),
                max_follows=max_follows,
                filters=filters,
                dry_run=self.config.dry_run,
                on_progress=on_progress,
                on_follow=on_follow,
            )
        
        else:
            raise ValueError(f"Unknown strategy: {rule.strategy}")
    
    def _is_active_hour(self) -> bool:
        """Check if current hour is within active hours."""
        current_hour = datetime.now().hour
        start, end = self.config.active_hours
        
        if start <= end:
            return start <= current_hour < end
        else:
            # Handles overnight ranges like (22, 6)
            return current_hour >= start or current_hour < end
    
    def _time_until_active(self) -> float:
        """Calculate minutes until active hours start."""
        current = datetime.now()
        start_hour = self.config.active_hours[0]
        
        # Calculate next start time
        next_start = current.replace(hour=start_hour, minute=0, second=0, microsecond=0)
        if next_start <= current:
            next_start += timedelta(days=1)
        
        return (next_start - current).total_seconds() / 60
    
    def _calculate_wait_time(self) -> float:
        """Calculate wait time until next run in minutes."""
        import random
        return random.uniform(
            self.config.min_interval_minutes,
            self.config.max_interval_minutes
        )
    
    async def _wait_or_cancel(self, seconds: float):
        """Wait for specified time or until cancelled."""
        end_time = datetime.now() + timedelta(seconds=seconds)
        
        while datetime.now() < end_time and not self._cancelled:
            await asyncio.sleep(min(10, (end_time - datetime.now()).total_seconds()))
    
    def stop(self):
        """Stop the auto follow process."""
        self._running = False
        self.cancel()
        self.logger.info("Auto follow stopping...")
    
    def get_auto_stats(self) -> dict:
        """Get auto follow statistics."""
        return {
            'started_at': self.auto_stats.started_at.isoformat(),
            'duration_minutes': (datetime.now() - self.auto_stats.started_at).total_seconds() / 60,
            'total_followed': self.auto_stats.total_followed,
            'total_failed': self.auto_stats.total_failed,
            'total_skipped': self.auto_stats.total_skipped,
            'runs_completed': self.auto_stats.runs_completed,
            'by_strategy': self.auto_stats.by_strategy,
            'next_run': self._next_run.isoformat() if self._next_run else None,
            'is_running': self._running,
            'errors': self.auto_stats.errors[-10:],  # Last 10 errors
        }
    
    def _build_result(
        self,
        followed: list[str],
        failed: list[str],
        skipped: list[str],
        errors: Optional[list[str]] = None
    ) -> FollowResult:
        """Build the result object."""
        all_errors = self.stats.errors + (errors or [])
        return FollowResult(
            success_count=len(followed),
            failed_count=len(failed),
            skipped_count=len(skipped),
            followed_users=followed,
            failed_users=failed,
            skipped_users=skipped,
            duration_seconds=self.stats.duration_seconds,
            rate_limited=self.stats.rate_limited,
            errors=all_errors
        )

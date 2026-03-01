"""
Smart unfollow based on follow tracking.

Unfollow users who didn't follow back within X days.
Works with follow tracking to know when you followed someone.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Callable

from ..base import (
    BaseAction,
    ActionStats,
    UnfollowResult,
)
from .unfollow_user import UnfollowUser

logger = logging.getLogger(__name__)


class SmartUnfollow(BaseAction):
    """
    Unfollow users who didn't follow back within X days.
    
    Works with follow tracking to know when you followed someone.
    This is more targeted than unfollow_non_followers because it
    respects a grace period.
    """
    
    async def execute(
        self,
        days_threshold: int = 3,
        max_unfollows: int = 50,
        check_engagement: bool = True,
        whitelist: Optional[list[str]] = None,
        min_followers: Optional[int] = None,
        exclude_verified: bool = False,
        dry_run: bool = False,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
        on_unfollow: Optional[Callable[[str, bool], None]] = None,
    ) -> UnfollowResult:
        """
        Unfollow users who didn't follow back within threshold days.
        
        Args:
            days_threshold: Days to wait before considering for unfollow
            max_unfollows: Maximum users to unfollow
            check_engagement: Keep if they engaged with you
            whitelist: Usernames to never unfollow
            min_followers: Keep if they have >= this many followers
            exclude_verified: Never unfollow verified accounts
            dry_run: Preview without unfollowing
            on_progress: Progress callback
            on_unfollow: Called after each unfollow
            
        Returns:
            UnfollowResult with operation details
        """
        self.stats = ActionStats()
        
        unfollowed_users = []
        failed_users = []
        skipped_users = []
        
        self.logger.info(
            f"Starting smart unfollow: threshold={days_threshold} days, max={max_unfollows}"
        )
        
        if dry_run:
            self.logger.info("DRY RUN - no unfollows will be performed")
        
        # Validate we have a tracker
        if not self.tracker:
            error_msg = "SmartUnfollow requires a FollowTracker"
            self.logger.error(error_msg)
            return self._build_result([], [], [], [error_msg])
        
        # Validate preconditions
        can_proceed, message = await self.validate_preconditions()
        if not can_proceed:
            self.logger.error(f"Precondition failed: {message}")
            return self._build_result([], [], [], [message])
        
        # Build whitelist set
        whitelist_set = set(w.lower().lstrip('@') for w in (whitelist or []))
        whitelist_set.update(self.tracker.get_whitelist())
        
        try:
            # Get follows older than threshold that haven't followed back
            self._log_progress(0, 100, "Finding eligible users...", on_progress)
            
            old_follows = self.tracker.get_follows_older_than(
                days_threshold,
                exclude_followed_back=True
            )
            
            self.logger.info(
                f"Found {len(old_follows)} follows older than {days_threshold} days "
                "without follow back"
            )
            
            # Apply filters
            to_unfollow = []
            
            for follow_record in old_follows:
                username = follow_record['username']
                
                # Whitelist check
                if username in whitelist_set:
                    self.logger.debug(f"Skipping @{username}: whitelisted")
                    skipped_users.append(username)
                    continue
                
                # Check cached profile for additional filters
                if min_followers or exclude_verified:
                    profile = self.tracker.get_cached_profile(username)
                    if profile:
                        if min_followers and profile.get('followers_count', 0) >= min_followers:
                            self.logger.debug(
                                f"Skipping @{username}: has {profile['followers_count']} followers"
                            )
                            skipped_users.append(username)
                            continue
                        
                        if exclude_verified and profile.get('verified', False):
                            self.logger.debug(f"Skipping @{username}: is verified")
                            skipped_users.append(username)
                            continue
                
                # Check engagement (if we have that data)
                if check_engagement:
                    # This would require tracking engagement
                    # For now, we skip this check
                    pass
                
                to_unfollow.append(username)
                
                if len(to_unfollow) >= max_unfollows:
                    break
            
            self.logger.info(f"After filters: {len(to_unfollow)} users to unfollow")
            
            # Unfollow
            total = len(to_unfollow)
            
            for i, username in enumerate(to_unfollow):
                if self._cancelled:
                    self.logger.info("Operation cancelled")
                    break
                
                await self._wait_if_paused()
                
                progress = int((i / total) * 100) if total > 0 else 100
                self._log_progress(
                    progress, 100,
                    f"Unfollowing @{username} ({i+1}/{total})",
                    on_progress
                )
                
                if dry_run:
                    self.logger.info(f"[DRY RUN] Would unfollow @{username}")
                    unfollowed_users.append(username)
                    continue
                
                unfollow_action = UnfollowUser(
                    self.browser, self.rate_limiter, self.tracker
                )
                result = await unfollow_action.execute(
                    username=username,
                    reason=f'smart_unfollow:{days_threshold}d',
                    on_complete=on_unfollow
                )
                
                unfollowed_users.extend(result.unfollowed_users)
                failed_users.extend(result.failed_users)
                skipped_users.extend(result.skipped_users)
                self.stats.errors.extend(result.errors)
                
                if result.rate_limited:
                    self.stats.rate_limited = True
                    self.logger.warning("Rate limited, stopping")
                    break
                    
        except Exception as e:
            error_msg = f"Error during smart unfollow: {str(e)}"
            self.logger.error(error_msg)
            self.stats.errors.append(error_msg)
        
        self.stats.success_count = len(unfollowed_users)
        self.stats.failed_count = len(failed_users)
        self.stats.skipped_count = len(skipped_users)
        self.stats.complete()
        
        self.logger.info(
            f"Smart unfollow complete: {len(unfollowed_users)} unfollowed, "
            f"{len(failed_users)} failed, {len(skipped_users)} skipped"
        )
        
        return self._build_result(unfollowed_users, failed_users, skipped_users)
    
    async def get_eligible_count(self, days_threshold: int = 3) -> int:
        """
        Get count of users eligible for smart unfollow.
        
        Args:
            days_threshold: Days threshold for eligibility
            
        Returns:
            Count of eligible users
        """
        if not self.tracker:
            return 0
        
        old_follows = self.tracker.get_follows_older_than(
            days_threshold,
            exclude_followed_back=True
        )
        return len(old_follows)
    
    def _build_result(
        self,
        unfollowed: list[str],
        failed: list[str],
        skipped: list[str],
        errors: Optional[list[str]] = None
    ) -> UnfollowResult:
        """Build the result object."""
        all_errors = self.stats.errors + (errors or [])
        return UnfollowResult(
            success_count=len(unfollowed),
            failed_count=len(failed),
            skipped_count=len(skipped),
            unfollowed_users=unfollowed,
            failed_users=failed,
            skipped_users=skipped,
            duration_seconds=self.stats.duration_seconds,
            rate_limited=self.stats.rate_limited,
            errors=all_errors
        )

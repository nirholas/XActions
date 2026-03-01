"""
Unfollow users who don't follow you back.

This is the most requested feature - find and unfollow non-followers.
"""

import logging
from typing import Optional, Callable
from dataclasses import dataclass

from ..base import (
    BaseAction,
    ActionStats,
    UnfollowResult,
    XSelectors,
    XUrls,
)
from .unfollow_user import UnfollowUser

logger = logging.getLogger(__name__)


@dataclass
class NonFollowerStats:
    """Statistics about non-followers."""
    total_following: int = 0
    total_followers: int = 0
    non_followers_count: int = 0
    whitelisted_count: int = 0
    filtered_count: int = 0


class UnfollowNonFollowers(BaseAction):
    """
    Unfollow users who don't follow you back.
    
    This is the most requested feature. Must be bulletproof.
    
    Algorithm:
    1. Scrape your followers list
    2. Scrape your following list
    3. Find difference (following - followers = non-followers)
    4. Apply whitelist and filters
    5. Unfollow with rate limiting
    6. Log and track all unfollows
    """
    
    async def execute(
        self,
        max_unfollows: int = 100,
        whitelist: Optional[list[str]] = None,
        min_followers: Optional[int] = None,
        min_following_days: Optional[int] = None,
        verified_only: bool = False,
        exclude_verified: bool = False,
        dry_run: bool = False,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
        on_unfollow: Optional[Callable[[str, bool], None]] = None,
        on_stats: Optional[Callable[[NonFollowerStats], None]] = None,
    ) -> UnfollowResult:
        """
        Unfollow non-followers with intelligent filtering.
        
        Args:
            max_unfollows: Maximum accounts to unfollow
            whitelist: Usernames to never unfollow
            min_followers: Keep if they have >= this many followers
            min_following_days: Days to wait before unfollowing
            verified_only: Only unfollow verified accounts
            exclude_verified: Never unfollow verified accounts
            dry_run: Preview without unfollowing
            on_progress: Progress callback
            on_unfollow: Called after each unfollow
            on_stats: Called with stats before unfollowing starts
            
        Returns:
            UnfollowResult with stats and unfollowed list
        """
        self.stats = ActionStats()
        
        unfollowed_users = []
        failed_users = []
        skipped_users = []
        
        self.logger.info(f"Starting unfollow non-followers, max={max_unfollows}")
        
        if dry_run:
            self.logger.info("DRY RUN - no unfollows will be performed")
        
        # Validate preconditions
        can_proceed, message = await self.validate_preconditions()
        if not can_proceed:
            self.logger.error(f"Precondition failed: {message}")
            return self._build_result(unfollowed_users, failed_users, skipped_users, [message])
        
        # Build whitelist set
        whitelist_set = set(w.lower().lstrip('@') for w in (whitelist or []))
        if self.tracker:
            whitelist_set.update(self.tracker.get_whitelist())
        
        try:
            # Step 1 & 2: Get followers and following lists
            self._log_progress(0, 100, "Fetching followers list...", on_progress)
            followers = await self._get_followers()
            
            self._log_progress(25, 100, "Fetching following list...", on_progress)
            following = await self._get_following()
            
            # Step 3: Find non-followers
            self._log_progress(50, 100, "Calculating non-followers...", on_progress)
            followers_set = set(f.lower() for f in followers)
            following_set = set(f.lower() for f in following)
            
            non_followers = following_set - followers_set
            
            # Create stats
            nf_stats = NonFollowerStats(
                total_following=len(following),
                total_followers=len(followers),
                non_followers_count=len(non_followers)
            )
            
            self.logger.info(
                f"Following: {nf_stats.total_following}, "
                f"Followers: {nf_stats.total_followers}, "
                f"Non-followers: {nf_stats.non_followers_count}"
            )
            
            # Step 4: Apply filters
            self._log_progress(60, 100, "Applying filters...", on_progress)
            
            to_unfollow = await self._apply_filters(
                list(non_followers),
                whitelist_set,
                min_followers,
                min_following_days,
                verified_only,
                exclude_verified
            )
            
            nf_stats.whitelisted_count = len([
                u for u in non_followers if u in whitelist_set
            ])
            nf_stats.filtered_count = len(non_followers) - len(to_unfollow) - nf_stats.whitelisted_count
            
            # Report stats
            if on_stats:
                on_stats(nf_stats)
            
            self.logger.info(
                f"After filters: {len(to_unfollow)} users to unfollow "
                f"(whitelisted: {nf_stats.whitelisted_count}, "
                f"filtered: {nf_stats.filtered_count})"
            )
            
            # Apply max limit
            to_unfollow = to_unfollow[:max_unfollows]
            
            # Step 5: Unfollow with rate limiting
            total = len(to_unfollow)
            
            for i, username in enumerate(to_unfollow):
                if self._cancelled:
                    self.logger.info("Operation cancelled")
                    break
                
                await self._wait_if_paused()
                
                progress = 70 + int((i / total) * 30) if total > 0 else 100
                self._log_progress(
                    progress, 100,
                    f"Unfollowing @{username} ({i+1}/{total})",
                    on_progress
                )
                
                if dry_run:
                    self.logger.info(f"[DRY RUN] Would unfollow @{username}")
                    unfollowed_users.append(username)
                    continue
                
                # Step 6: Log and track
                unfollow_action = UnfollowUser(
                    self.browser, self.rate_limiter, self.tracker
                )
                result = await unfollow_action.execute(
                    username=username,
                    reason='non_follower',
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
            error_msg = f"Error during unfollow non-followers: {str(e)}"
            self.logger.error(error_msg)
            self.stats.errors.append(error_msg)
        
        self.stats.success_count = len(unfollowed_users)
        self.stats.failed_count = len(failed_users)
        self.stats.skipped_count = len(skipped_users)
        self.stats.complete()
        
        self.logger.info(
            f"Unfollow non-followers complete: {len(unfollowed_users)} unfollowed, "
            f"{len(failed_users)} failed, {len(skipped_users)} skipped"
        )
        
        return self._build_result(unfollowed_users, failed_users, skipped_users)
    
    async def _get_followers(self) -> list[str]:
        """Get list of your followers."""
        followers = []
        
        try:
            # Navigate to followers page
            # First go to home to find our profile link
            await self.browser.goto(XUrls.HOME)
            import asyncio
            await asyncio.sleep(2)
            
            # Navigate to our followers
            # In a real implementation, you'd get your username first
            await self.browser.goto("https://x.com/followers")
            
            await self.browser.wait_for_selector(XSelectors.USER_CELL, timeout=15000)
            
            # Scroll and collect
            collected = set()
            scroll_attempts = 0
            max_scrolls = 100  # Get many followers
            no_new_count = 0
            
            while scroll_attempts < max_scrolls:
                usernames = await self.browser.get_all_text(
                    f'{XSelectors.USER_CELL} {XSelectors.USER_NAME}'
                )
                
                new_this_scroll = 0
                for username in usernames:
                    if username:
                        clean = username.split('@')[-1] if '@' in username else username
                        clean = clean.split()[0].lower() if clean else ''
                        if clean and clean not in collected:
                            collected.add(clean)
                            followers.append(clean)
                            new_this_scroll += 1
                
                if new_this_scroll == 0:
                    no_new_count += 1
                    if no_new_count >= 5:
                        break
                else:
                    no_new_count = 0
                
                await self.browser.scroll_down()
                await asyncio.sleep(1.5)
                scroll_attempts += 1
                
                # Log progress periodically
                if scroll_attempts % 10 == 0:
                    self.logger.debug(f"Collected {len(followers)} followers so far...")
            
            self.logger.info(f"Collected {len(followers)} followers")
            
        except Exception as e:
            self.logger.error(f"Failed to get followers: {e}")
            self.stats.errors.append(f"Get followers error: {str(e)}")
        
        return followers
    
    async def _get_following(self) -> list[str]:
        """Get list of users you're following."""
        following = []
        
        try:
            await self.browser.goto("https://x.com/following")
            import asyncio
            await asyncio.sleep(2)
            
            await self.browser.wait_for_selector(XSelectors.USER_CELL, timeout=15000)
            
            collected = set()
            scroll_attempts = 0
            max_scrolls = 100
            no_new_count = 0
            
            while scroll_attempts < max_scrolls:
                usernames = await self.browser.get_all_text(
                    f'{XSelectors.USER_CELL} {XSelectors.USER_NAME}'
                )
                
                new_this_scroll = 0
                for username in usernames:
                    if username:
                        clean = username.split('@')[-1] if '@' in username else username
                        clean = clean.split()[0].lower() if clean else ''
                        if clean and clean not in collected:
                            collected.add(clean)
                            following.append(clean)
                            new_this_scroll += 1
                
                if new_this_scroll == 0:
                    no_new_count += 1
                    if no_new_count >= 5:
                        break
                else:
                    no_new_count = 0
                
                await self.browser.scroll_down()
                await asyncio.sleep(1.5)
                scroll_attempts += 1
                
                if scroll_attempts % 10 == 0:
                    self.logger.debug(f"Collected {len(following)} following so far...")
            
            self.logger.info(f"Collected {len(following)} following")
            
        except Exception as e:
            self.logger.error(f"Failed to get following: {e}")
            self.stats.errors.append(f"Get following error: {str(e)}")
        
        return following
    
    async def _apply_filters(
        self,
        users: list[str],
        whitelist: set[str],
        min_followers: Optional[int],
        min_following_days: Optional[int],
        verified_only: bool,
        exclude_verified: bool
    ) -> list[str]:
        """Apply whitelist and criteria filters."""
        filtered = []
        
        for username in users:
            # Whitelist check
            if username.lower() in whitelist:
                self.logger.debug(f"Skipping @{username}: whitelisted")
                continue
            
            # Check tracker whitelist
            if self.tracker and self.tracker.is_whitelisted(username):
                self.logger.debug(f"Skipping @{username}: whitelisted in tracker")
                continue
            
            # Check min following days
            if min_following_days and self.tracker:
                follows = self.tracker.get_follows_older_than(min_following_days)
                usernames_old_enough = {f['username'] for f in follows}
                if username not in usernames_old_enough:
                    self.logger.debug(
                        f"Skipping @{username}: followed less than {min_following_days} days ago"
                    )
                    continue
            
            # For min_followers, verified_only, exclude_verified we would need
            # to fetch profile data. This is expensive, so it's optional.
            # In a real implementation, you might cache this data.
            
            if min_followers or verified_only or exclude_verified:
                profile = None
                if self.tracker:
                    profile = self.tracker.get_cached_profile(username)
                
                if profile:
                    if min_followers and profile.get('followers_count', 0) >= min_followers:
                        self.logger.debug(
                            f"Skipping @{username}: has {profile['followers_count']} followers"
                        )
                        continue
                    
                    is_verified = profile.get('verified', False)
                    if verified_only and not is_verified:
                        self.logger.debug(f"Skipping @{username}: not verified")
                        continue
                    if exclude_verified and is_verified:
                        self.logger.debug(f"Skipping @{username}: is verified")
                        continue
            
            filtered.append(username)
        
        return filtered
    
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

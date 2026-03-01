"""
Single user follow operation.

Follow a specific user by username.
"""

import logging
from typing import Optional, Callable

from ..base import (
    BaseAction,
    ActionResult,
    ActionStats,
    FollowResult,
    FollowFilters,
    XSelectors,
    XUrls,
)

logger = logging.getLogger(__name__)


class FollowUser(BaseAction):
    """
    Follow a single user by username.
    
    The most basic follow operation - navigate to profile and click follow.
    """
    
    async def execute(
        self,
        username: str,
        skip_if_following: bool = True,
        check_filters: bool = False,
        filters: Optional[FollowFilters] = None,
        source: Optional[str] = None,
        on_complete: Optional[Callable[[str, bool], None]] = None,
    ) -> FollowResult:
        """
        Follow a single user.
        
        Args:
            username: Username to follow (with or without @)
            skip_if_following: Skip if already following
            check_filters: Whether to apply filters before following
            filters: Filters to apply (if check_filters is True)
            source: Source of this follow for tracking
            on_complete: Callback when complete (username, success)
            
        Returns:
            FollowResult with operation details
        """
        username = username.lower().lstrip('@')
        self.stats = ActionStats()
        
        followed_users = []
        failed_users = []
        skipped_users = []
        
        self.logger.info(f"Starting follow for @{username}")
        
        # Validate preconditions
        can_proceed, message = await self.validate_preconditions()
        if not can_proceed:
            self.logger.error(f"Precondition failed: {message}")
            return FollowResult(
                success_count=0,
                failed_count=1,
                skipped_count=0,
                followed_users=[],
                failed_users=[username],
                skipped_users=[],
                duration_seconds=self.stats.duration_seconds,
                rate_limited=False,
                errors=[message]
            )
        
        try:
            # Rate limit wait
            await self._handle_rate_limit()
            
            # Check if already following (via tracker)
            if skip_if_following and self.tracker:
                if self.tracker.is_following(username):
                    self.logger.info(f"Already following @{username} (per tracker)")
                    skipped_users.append(username)
                    self.stats.skipped_count += 1
                    return self._build_result(followed_users, failed_users, skipped_users)
            
            # Navigate to profile
            profile_url = XUrls.PROFILE.format(username=username)
            await self.browser.goto(profile_url)
            
            # Wait for profile to load
            await self.browser.wait_for_selector(XSelectors.PROFILE_NAME, timeout=10000)
            
            # Check filters if requested
            if check_filters and filters:
                profile = await self._extract_profile()
                matches, reason = filters.matches(profile)
                if not matches:
                    self.logger.info(f"@{username} filtered out: {reason}")
                    skipped_users.append(username)
                    self.stats.skipped_count += 1
                    return self._build_result(followed_users, failed_users, skipped_users)
            
            # Check if already following (via UI)
            is_following = await self._is_following()
            if skip_if_following and is_following:
                self.logger.info(f"Already following @{username} (per UI)")
                skipped_users.append(username)
                self.stats.skipped_count += 1
                return self._build_result(followed_users, failed_users, skipped_users)
            
            # Click follow button
            success = await self._click_follow()
            
            if success:
                self.logger.info(f"Successfully followed @{username}")
                followed_users.append(username)
                self.stats.success_count += 1
                
                # Record in tracker
                if self.tracker:
                    self.tracker.record_follow(username, source=source or 'manual')
            else:
                self.logger.warning(f"Failed to follow @{username}")
                failed_users.append(username)
                self.stats.failed_count += 1
            
            # Call completion callback
            if on_complete:
                on_complete(username, success)
            
        except Exception as e:
            error_msg = f"Error following @{username}: {str(e)}"
            self.logger.error(error_msg)
            failed_users.append(username)
            self.stats.failed_count += 1
            self.stats.errors.append(error_msg)
        
        self.stats.complete()
        return self._build_result(followed_users, failed_users, skipped_users)
    
    async def _is_following(self) -> bool:
        """Check if we're already following this user."""
        try:
            # If the "Following" button is visible, we're already following
            return await self.browser.wait_for_selector(
                XSelectors.FOLLOWING_BUTTON, 
                timeout=2000
            )
        except:
            return False
    
    async def _click_follow(self) -> bool:
        """Click the follow button."""
        try:
            # Wait for follow button
            if not await self.browser.wait_for_selector(XSelectors.FOLLOW_BUTTON, timeout=5000):
                self.logger.warning("Follow button not found")
                return False
            
            # Click follow
            success = await self.browser.click(XSelectors.FOLLOW_BUTTON)
            if not success:
                return False
            
            # Verify follow succeeded by checking for "Following" button
            import asyncio
            await asyncio.sleep(1)
            
            return await self.browser.wait_for_selector(
                XSelectors.FOLLOWING_BUTTON,
                timeout=5000
            )
        except Exception as e:
            self.logger.error(f"Click follow failed: {e}")
            return False
    
    async def _extract_profile(self) -> dict:
        """Extract profile data from the current page."""
        profile = {
            'username': '',
            'display_name': '',
            'bio': '',
            'followers_count': 0,
            'following_count': 0,
            'tweets_count': 0,
            'verified': False,
            'has_profile_pic': True,
        }
        
        try:
            # Get bio
            bio = await self.browser.get_text(XSelectors.PROFILE_BIO)
            if bio:
                profile['bio'] = bio
            
            # Get follower/following counts would require parsing the UI
            # This is a simplified version
            
        except Exception as e:
            self.logger.debug(f"Error extracting profile: {e}")
        
        return profile
    
    def _build_result(
        self,
        followed: list[str],
        failed: list[str],
        skipped: list[str]
    ) -> FollowResult:
        """Build the result object."""
        return FollowResult(
            success_count=len(followed),
            failed_count=len(failed),
            skipped_count=len(skipped),
            followed_users=followed,
            failed_users=failed,
            skipped_users=skipped,
            duration_seconds=self.stats.duration_seconds,
            rate_limited=self.stats.rate_limited,
            errors=self.stats.errors
        )


class FollowUsers(BaseAction):
    """
    Follow multiple users from a list.
    
    Batch operation with progress tracking.
    """
    
    async def execute(
        self,
        usernames: list[str],
        max_follows: Optional[int] = None,
        skip_if_following: bool = True,
        filters: Optional[FollowFilters] = None,
        source: Optional[str] = None,
        dry_run: bool = False,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
        on_follow: Optional[Callable[[str, bool], None]] = None,
    ) -> FollowResult:
        """
        Follow multiple users.
        
        Args:
            usernames: List of usernames to follow
            max_follows: Maximum number to follow (None for all)
            skip_if_following: Skip if already following
            filters: Filters to apply
            source: Source for tracking
            dry_run: Preview without following
            on_progress: Progress callback (current, total, message)
            on_follow: Called after each follow attempt
            
        Returns:
            FollowResult with aggregated results
        """
        self.stats = ActionStats()
        
        followed_users = []
        failed_users = []
        skipped_users = []
        
        # Clean usernames
        usernames = [u.lower().lstrip('@') for u in usernames]
        
        # Apply max limit
        if max_follows:
            usernames = usernames[:max_follows]
        
        total = len(usernames)
        self.logger.info(f"Starting batch follow of {total} users")
        
        if dry_run:
            self.logger.info("DRY RUN - no follows will be performed")
        
        follow_user = FollowUser(self.browser, self.rate_limiter, self.tracker)
        
        for i, username in enumerate(usernames):
            if self._cancelled:
                self.logger.info("Operation cancelled")
                break
            
            await self._wait_if_paused()
            
            self._log_progress(i + 1, total, f"Processing @{username}", on_progress)
            
            if dry_run:
                self.logger.info(f"[DRY RUN] Would follow @{username}")
                followed_users.append(username)
                continue
            
            result = await follow_user.execute(
                username=username,
                skip_if_following=skip_if_following,
                check_filters=filters is not None,
                filters=filters,
                source=source,
                on_complete=on_follow
            )
            
            # Aggregate results
            followed_users.extend(result.followed_users)
            failed_users.extend(result.failed_users)
            skipped_users.extend(result.skipped_users)
            self.stats.errors.extend(result.errors)
            
            if result.rate_limited:
                self.stats.rate_limited = True
                self.logger.warning("Rate limited, pausing operation")
                break
        
        self.stats.success_count = len(followed_users)
        self.stats.failed_count = len(failed_users)
        self.stats.skipped_count = len(skipped_users)
        self.stats.complete()
        
        self.logger.info(
            f"Batch follow complete: {len(followed_users)} followed, "
            f"{len(failed_users)} failed, {len(skipped_users)} skipped"
        )
        
        return FollowResult(
            success_count=len(followed_users),
            failed_count=len(failed_users),
            skipped_count=len(skipped_users),
            followed_users=followed_users,
            failed_users=failed_users,
            skipped_users=skipped_users,
            duration_seconds=self.stats.duration_seconds,
            rate_limited=self.stats.rate_limited,
            errors=self.stats.errors
        )

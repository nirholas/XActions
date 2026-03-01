"""
Follow a target account's followers or following.

Great for niche targeting by following competitors' or influencers' audiences.
"""

import logging
from typing import Optional, Callable

from ..base import (
    BaseAction,
    ActionStats,
    FollowResult,
    FollowFilters,
    XSelectors,
    XUrls,
)

logger = logging.getLogger(__name__)


class FollowTargetFollowers(BaseAction):
    """
    Follow the followers or following of a target account.
    
    Great for niche targeting - follow users who already follow
    similar accounts (competitors, influencers, etc.).
    """
    
    async def execute(
        self,
        target_username: str,
        max_follows: int = 50,
        mode: str = 'followers',  # 'followers' or 'following'
        filters: Optional[FollowFilters] = None,
        skip_mutual: bool = True,
        skip_following: bool = True,
        skip_previously_followed: bool = True,
        dry_run: bool = False,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
        on_follow: Optional[Callable[[str, bool], None]] = None,
    ) -> FollowResult:
        """
        Follow followers or following of a target account.
        
        Args:
            target_username: Target account username
            max_follows: Maximum users to follow
            mode: 'followers' to follow their followers, 'following' to follow who they follow
            filters: Filtering criteria
            skip_mutual: Skip if you already follow them
            skip_following: Skip users already being followed (same as skip_mutual)
            skip_previously_followed: Skip users we've followed before
            dry_run: Preview without following
            on_progress: Progress callback
            on_follow: Called after each follow
            
        Returns:
            FollowResult with operation details
        """
        self.stats = ActionStats()
        
        followed_users = []
        failed_users = []
        skipped_users = []
        
        target_username = target_username.lower().lstrip('@')
        mode_display = "followers" if mode == 'followers' else "following"
        
        self.logger.info(
            f"Starting to follow @{target_username}'s {mode_display}, max={max_follows}"
        )
        
        if dry_run:
            self.logger.info("DRY RUN - no follows will be performed")
        
        # Validate preconditions
        can_proceed, message = await self.validate_preconditions()
        if not can_proceed:
            self.logger.error(f"Precondition failed: {message}")
            return self._build_result(followed_users, failed_users, skipped_users, [message])
        
        # Use default filters if not provided
        if filters is None:
            filters = FollowFilters()
        
        try:
            # Get users from target's followers/following
            users = await self._get_target_users(target_username, mode, max_follows * 2)
            self.logger.info(f"Found {len(users)} users from @{target_username}'s {mode_display}")
            
            processed = set()
            
            for user_data in users:
                if self._cancelled or len(followed_users) >= max_follows:
                    break
                
                await self._wait_if_paused()
                
                username = user_data.get('username', '').lower().lstrip('@')
                if not username or username in processed:
                    continue
                
                processed.add(username)
                
                # Skip the target themselves
                if username == target_username:
                    continue
                
                self._log_progress(
                    len(followed_users),
                    max_follows,
                    f"Processing @{username}",
                    on_progress
                )
                
                # Skip if already following
                if (skip_mutual or skip_following) and self.tracker:
                    if self.tracker.is_following(username):
                        self.logger.debug(f"Skipping @{username}: already following")
                        skipped_users.append(username)
                        continue
                
                # Skip if previously followed
                if skip_previously_followed and self.tracker:
                    if self.tracker.was_followed_before(username):
                        self.logger.debug(f"Skipping @{username}: previously followed")
                        skipped_users.append(username)
                        continue
                
                # Apply filters
                if filters:
                    matches, reason = filters.matches(user_data)
                    if not matches:
                        self.logger.debug(f"Skipping @{username}: {reason}")
                        skipped_users.append(username)
                        continue
                
                # Follow the user
                if dry_run:
                    self.logger.info(f"[DRY RUN] Would follow @{username}")
                    followed_users.append(username)
                    continue
                
                await self._handle_rate_limit()
                
                success = await self._follow_user(username)
                
                if success:
                    self.logger.info(f"Followed @{username}")
                    followed_users.append(username)
                    
                    # Track the follow
                    if self.tracker:
                        source = f"{mode}:{target_username}"
                        self.tracker.record_follow(username, source=source)
                    
                    # Cache profile
                    if self.tracker and user_data:
                        self.tracker.cache_user_profile(user_data)
                else:
                    self.logger.warning(f"Failed to follow @{username}")
                    failed_users.append(username)
                
                if on_follow:
                    on_follow(username, success)
                    
        except Exception as e:
            error_msg = f"Error during operation: {str(e)}"
            self.logger.error(error_msg)
            self.stats.errors.append(error_msg)
        
        self.stats.success_count = len(followed_users)
        self.stats.failed_count = len(failed_users)
        self.stats.skipped_count = len(skipped_users)
        self.stats.complete()
        
        self.logger.info(
            f"Target follow complete: {len(followed_users)} followed, "
            f"{len(failed_users)} failed, {len(skipped_users)} skipped"
        )
        
        return self._build_result(followed_users, failed_users, skipped_users)
    
    async def _get_target_users(
        self, 
        target_username: str, 
        mode: str,
        max_users: int
    ) -> list[dict]:
        """
        Get followers or following of target account.
        
        Args:
            target_username: Target account
            mode: 'followers' or 'following'
            max_users: Maximum users to retrieve
            
        Returns:
            List of user data dictionaries
        """
        users = []
        collected = set()
        
        try:
            # Navigate to the appropriate page
            if mode == 'followers':
                url = XUrls.FOLLOWERS.format(username=target_username)
            else:
                url = XUrls.FOLLOWING.format(username=target_username)
            
            await self.browser.goto(url)
            
            # Wait for user list to load
            await self.browser.wait_for_selector(XSelectors.USER_CELL, timeout=10000)
            
            # Scroll and collect users
            scroll_attempts = 0
            max_scrolls = 20
            no_new_users_count = 0
            
            while scroll_attempts < max_scrolls and len(users) < max_users:
                # Extract user cells
                user_elements = await self._extract_user_cells()
                
                new_users_this_scroll = 0
                for user_data in user_elements:
                    username = user_data.get('username', '')
                    if username and username not in collected:
                        collected.add(username)
                        users.append(user_data)
                        new_users_this_scroll += 1
                
                if new_users_this_scroll == 0:
                    no_new_users_count += 1
                    if no_new_users_count >= 3:
                        self.logger.debug("No more new users found, stopping scroll")
                        break
                else:
                    no_new_users_count = 0
                
                if len(users) >= max_users:
                    break
                
                # Scroll for more
                await self.browser.scroll_down()
                import asyncio
                await asyncio.sleep(1.5)
                
                scroll_attempts += 1
            
            self.logger.debug(f"Collected {len(users)} users from @{target_username}'s {mode}")
            
        except Exception as e:
            self.logger.error(f"Failed to get target users: {e}")
            self.stats.errors.append(f"Get target users error: {str(e)}")
        
        return users[:max_users]
    
    async def _extract_user_cells(self) -> list[dict]:
        """Extract user data from user cells on page."""
        users = []
        
        try:
            # In a real implementation, this would parse the DOM
            # to extract username, bio, follower count, etc.
            
            usernames = await self.browser.get_all_text(
                f'{XSelectors.USER_CELL} {XSelectors.USER_NAME}'
            )
            
            for username in usernames:
                if username:
                    # Clean username (may have display name attached)
                    clean_username = username.split('@')[-1] if '@' in username else username
                    clean_username = clean_username.split()[0] if clean_username else ''
                    
                    users.append({
                        'username': clean_username.lstrip('@'),
                        'bio': '',
                        'followers_count': 0,
                        'following_count': 0,
                        'tweets_count': 0,
                        'verified': False,
                        'has_profile_pic': True,
                    })
            
        except Exception as e:
            self.logger.debug(f"Error extracting user cells: {e}")
        
        return users
    
    async def _follow_user(self, username: str) -> bool:
        """Follow a user from their profile."""
        try:
            profile_url = XUrls.PROFILE.format(username=username)
            await self.browser.goto(profile_url)
            
            # Wait for profile to load
            await self.browser.wait_for_selector(XSelectors.PROFILE_NAME, timeout=10000)
            
            # Check if already following
            try:
                is_following = await self.browser.wait_for_selector(
                    XSelectors.FOLLOWING_BUTTON, 
                    timeout=2000
                )
                if is_following:
                    return True
            except:
                pass
            
            # Click follow button
            if not await self.browser.wait_for_selector(XSelectors.FOLLOW_BUTTON, timeout=5000):
                return False
            
            success = await self.browser.click(XSelectors.FOLLOW_BUTTON)
            if not success:
                return False
            
            # Verify
            import asyncio
            await asyncio.sleep(1)
            
            return await self.browser.wait_for_selector(
                XSelectors.FOLLOWING_BUTTON,
                timeout=5000
            )
            
        except Exception as e:
            self.logger.error(f"Follow failed for @{username}: {e}")
            return False
    
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

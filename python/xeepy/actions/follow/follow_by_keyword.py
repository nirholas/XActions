"""
Follow users by keyword search.

Search for keywords and follow users who tweet about those topics.
"""

import logging
from typing import Optional, Callable
from urllib.parse import quote

from ..base import (
    BaseAction,
    ActionStats,
    FollowResult,
    FollowFilters,
    XSelectors,
    XUrls,
)

logger = logging.getLogger(__name__)


class FollowByKeyword(BaseAction):
    """
    Follow users who tweet about specific keywords/topics.
    
    Searches for keywords and follows users from the results,
    applying filters to ensure quality follows.
    """
    
    async def execute(
        self,
        keywords: list[str],
        max_follows: int = 50,
        filters: Optional[FollowFilters] = None,
        search_type: str = 'users',  # 'users' or 'tweets'
        skip_following: bool = True,
        skip_previously_followed: bool = True,
        source_prefix: str = 'keyword',
        dry_run: bool = False,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
        on_follow: Optional[Callable[[str, bool], None]] = None,
    ) -> FollowResult:
        """
        Search for keywords and follow matching users.
        
        Args:
            keywords: Terms to search for
            max_follows: Maximum users to follow
            filters: Filtering criteria
            search_type: Search for 'users' or 'tweets' (then follow authors)
            skip_following: Skip users already being followed
            skip_previously_followed: Skip users we've followed before
            source_prefix: Prefix for tracking source
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
        processed_users = set()
        
        self.logger.info(f"Starting keyword follow: {keywords}, max={max_follows}")
        
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
        
        for keyword in keywords:
            if self._cancelled or len(followed_users) >= max_follows:
                break
            
            self.logger.info(f"Searching for keyword: {keyword}")
            
            # Get users from search
            users = await self._search_users(keyword, search_type)
            self.logger.info(f"Found {len(users)} users for '{keyword}'")
            
            for user_data in users:
                if self._cancelled or len(followed_users) >= max_follows:
                    break
                
                await self._wait_if_paused()
                
                username = user_data.get('username', '').lower().lstrip('@')
                if not username or username in processed_users:
                    continue
                
                processed_users.add(username)
                
                self._log_progress(
                    len(followed_users),
                    max_follows,
                    f"Processing @{username}",
                    on_progress
                )
                
                # Skip if already following
                if skip_following and self.tracker:
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
                        source = f"{source_prefix}:{keyword}"
                        self.tracker.record_follow(username, source=source)
                    
                    # Cache profile
                    if self.tracker and user_data:
                        self.tracker.cache_user_profile(user_data)
                else:
                    self.logger.warning(f"Failed to follow @{username}")
                    failed_users.append(username)
                
                if on_follow:
                    on_follow(username, success)
        
        self.stats.success_count = len(followed_users)
        self.stats.failed_count = len(failed_users)
        self.stats.skipped_count = len(skipped_users)
        self.stats.complete()
        
        self.logger.info(
            f"Keyword follow complete: {len(followed_users)} followed, "
            f"{len(failed_users)} failed, {len(skipped_users)} skipped"
        )
        
        return self._build_result(followed_users, failed_users, skipped_users)
    
    async def _search_users(self, keyword: str, search_type: str) -> list[dict]:
        """
        Search for users matching the keyword.
        
        Args:
            keyword: Search term
            search_type: 'users' or 'tweets'
            
        Returns:
            List of user data dictionaries
        """
        users = []
        
        try:
            # Build search URL
            encoded_query = quote(keyword)
            if search_type == 'users':
                search_url = XUrls.SEARCH.format(query=encoded_query)
            else:
                search_url = XUrls.SEARCH_TWEETS.format(query=encoded_query)
            
            await self.browser.goto(search_url)
            
            # Wait for results
            await self.browser.wait_for_selector(XSelectors.USER_CELL, timeout=10000)
            
            # Scroll and collect users
            collected = set()
            scroll_attempts = 0
            max_scrolls = 10
            
            while scroll_attempts < max_scrolls:
                # Extract user cells
                user_elements = await self._extract_user_cells()
                
                for user_data in user_elements:
                    username = user_data.get('username', '')
                    if username and username not in collected:
                        collected.add(username)
                        users.append(user_data)
                
                # Check if we have enough
                if len(users) >= 100:  # Cap at 100 per keyword
                    break
                
                # Scroll for more
                await self.browser.scroll_down()
                import asyncio
                await asyncio.sleep(1.5)
                
                # Check if we got new users
                new_count = len(collected)
                scroll_attempts += 1
            
            self.logger.debug(f"Collected {len(users)} users from search")
            
        except Exception as e:
            self.logger.error(f"Search failed: {e}")
            self.stats.errors.append(f"Search error: {str(e)}")
        
        return users
    
    async def _extract_user_cells(self) -> list[dict]:
        """Extract user data from user cells on page."""
        users = []
        
        try:
            # Get all user cell elements
            # This would need to be implemented based on the browser manager
            # For now, we'll return a placeholder structure
            
            # In a real implementation, this would parse the DOM
            # to extract username, bio, follower count, etc.
            
            usernames = await self.browser.get_all_text(f'{XSelectors.USER_CELL} {XSelectors.USER_NAME}')
            
            for username in usernames:
                if username:
                    users.append({
                        'username': username.lstrip('@'),
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
                    return True  # Already following counts as success
            except:
                pass
            
            # Click follow button
            if not await self.browser.wait_for_selector(XSelectors.FOLLOW_BUTTON, timeout=5000):
                self.logger.warning(f"Follow button not found for @{username}")
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

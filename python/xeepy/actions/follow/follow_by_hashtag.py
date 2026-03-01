"""
Follow users by hashtag.

Search for hashtags and follow users who use them.
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


class FollowByHashtag(BaseAction):
    """
    Follow users who tweet with specific hashtags.
    
    Great for finding users interested in specific topics
    or participating in trending conversations.
    """
    
    async def execute(
        self,
        hashtags: list[str],
        max_follows: int = 50,
        filters: Optional[FollowFilters] = None,
        include_recent: bool = True,
        include_top: bool = False,
        skip_following: bool = True,
        skip_previously_followed: bool = True,
        dry_run: bool = False,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
        on_follow: Optional[Callable[[str, bool], None]] = None,
    ) -> FollowResult:
        """
        Search for hashtags and follow users who use them.
        
        Args:
            hashtags: Hashtags to search (with or without #)
            max_follows: Maximum users to follow
            filters: Filtering criteria
            include_recent: Include recent tweets
            include_top: Include top tweets
            skip_following: Skip users already being followed
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
        processed_users = set()
        
        # Clean hashtags
        hashtags = [h.lstrip('#') for h in hashtags]
        
        self.logger.info(f"Starting hashtag follow: #{', #'.join(hashtags)}, max={max_follows}")
        
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
        
        for hashtag in hashtags:
            if self._cancelled or len(followed_users) >= max_follows:
                break
            
            self.logger.info(f"Searching hashtag: #{hashtag}")
            
            # Get users from hashtag
            users = await self._search_hashtag(hashtag, include_recent, include_top)
            self.logger.info(f"Found {len(users)} users for #{hashtag}")
            
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
                        source = f"hashtag:{hashtag}"
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
            f"Hashtag follow complete: {len(followed_users)} followed, "
            f"{len(failed_users)} failed, {len(skipped_users)} skipped"
        )
        
        return self._build_result(followed_users, failed_users, skipped_users)
    
    async def _search_hashtag(
        self, 
        hashtag: str, 
        include_recent: bool,
        include_top: bool
    ) -> list[dict]:
        """
        Search for users using a hashtag.
        
        Args:
            hashtag: Hashtag to search (without #)
            include_recent: Include recent tweets
            include_top: Include top tweets
            
        Returns:
            List of user data dictionaries
        """
        users = []
        collected = set()
        
        try:
            # Search with hashtag
            search_query = f"#{hashtag}"
            encoded_query = quote(search_query)
            
            # Try different tabs based on options
            tabs_to_search = []
            if include_recent:
                tabs_to_search.append(('live', 'Recent'))
            if include_top:
                tabs_to_search.append(('top', 'Top'))
            
            if not tabs_to_search:
                tabs_to_search = [('live', 'Recent')]
            
            for tab_param, tab_name in tabs_to_search:
                if len(users) >= 100:
                    break
                
                search_url = f"https://x.com/search?q={encoded_query}&src=typed_query&f={tab_param}"
                await self.browser.goto(search_url)
                
                # Wait for tweets to load
                await self.browser.wait_for_selector(XSelectors.TWEET, timeout=10000)
                
                # Scroll and collect users
                scroll_attempts = 0
                max_scrolls = 5
                
                while scroll_attempts < max_scrolls:
                    # Extract users from tweets
                    tweet_authors = await self._extract_tweet_authors()
                    
                    for user_data in tweet_authors:
                        username = user_data.get('username', '')
                        if username and username not in collected:
                            collected.add(username)
                            users.append(user_data)
                    
                    if len(users) >= 100:
                        break
                    
                    # Scroll for more
                    await self.browser.scroll_down()
                    import asyncio
                    await asyncio.sleep(1.5)
                    
                    scroll_attempts += 1
            
            self.logger.debug(f"Collected {len(users)} users from #{hashtag}")
            
        except Exception as e:
            self.logger.error(f"Hashtag search failed: {e}")
            self.stats.errors.append(f"Hashtag search error: {str(e)}")
        
        return users
    
    async def _extract_tweet_authors(self) -> list[dict]:
        """Extract author data from tweets on page."""
        users = []
        
        try:
            # In a real implementation, this would parse tweet elements
            # to get the author username and profile info
            
            # Placeholder - would be implemented with actual DOM parsing
            pass
            
        except Exception as e:
            self.logger.debug(f"Error extracting tweet authors: {e}")
        
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

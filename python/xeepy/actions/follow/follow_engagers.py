"""
Follow users who engage with specific tweets.

Follow likers, retweeters, or commenters on tweets.
These users are highly relevant and more likely to follow back.
"""

import logging
import re
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


class FollowEngagers(BaseAction):
    """
    Follow users who engage with specific tweets.
    
    These users are highly relevant and more likely to follow back
    since they've already shown interest in similar content.
    """
    
    async def execute(
        self,
        tweet_urls: list[str],
        engagement_type: str = 'likers',  # 'likers', 'retweeters', 'commenters', 'all'
        max_follows: int = 50,
        filters: Optional[FollowFilters] = None,
        skip_following: bool = True,
        skip_previously_followed: bool = True,
        dry_run: bool = False,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
        on_follow: Optional[Callable[[str, bool], None]] = None,
    ) -> FollowResult:
        """
        Follow users who engaged with specific tweets.
        
        Args:
            tweet_urls: List of tweet URLs to get engagers from
            engagement_type: Type of engagement ('likers', 'retweeters', 'commenters', 'all')
            max_follows: Maximum users to follow
            filters: Filtering criteria
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
        
        engagement_types = []
        if engagement_type == 'all':
            engagement_types = ['likers', 'retweeters', 'commenters']
        else:
            engagement_types = [engagement_type]
        
        self.logger.info(
            f"Starting engager follow from {len(tweet_urls)} tweets, "
            f"type={engagement_type}, max={max_follows}"
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
        
        for tweet_url in tweet_urls:
            if self._cancelled or len(followed_users) >= max_follows:
                break
            
            # Parse tweet URL
            tweet_info = self._parse_tweet_url(tweet_url)
            if not tweet_info:
                self.logger.warning(f"Invalid tweet URL: {tweet_url}")
                continue
            
            self.logger.info(f"Processing tweet: {tweet_url}")
            
            for eng_type in engagement_types:
                if self._cancelled or len(followed_users) >= max_follows:
                    break
                
                # Get engagers
                users = await self._get_engagers(tweet_info, eng_type)
                self.logger.info(f"Found {len(users)} {eng_type} for tweet")
                
                for user_data in users:
                    if self._cancelled or len(followed_users) >= max_follows:
                        break
                    
                    await self._wait_if_paused()
                    
                    username = user_data.get('username', '').lower().lstrip('@')
                    if not username or username in processed_users:
                        continue
                    
                    processed_users.add(username)
                    
                    # Skip tweet author
                    if username == tweet_info['username']:
                        continue
                    
                    self._log_progress(
                        len(followed_users),
                        max_follows,
                        f"Processing @{username} ({eng_type})",
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
                            source = f"engager:{eng_type}:{tweet_info['tweet_id']}"
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
            f"Engager follow complete: {len(followed_users)} followed, "
            f"{len(failed_users)} failed, {len(skipped_users)} skipped"
        )
        
        return self._build_result(followed_users, failed_users, skipped_users)
    
    def _parse_tweet_url(self, url: str) -> Optional[dict]:
        """
        Parse a tweet URL to extract username and tweet ID.
        
        Args:
            url: Tweet URL
            
        Returns:
            Dictionary with 'username' and 'tweet_id', or None if invalid
        """
        # Match patterns like:
        # https://twitter.com/username/status/1234567890
        # https://x.com/username/status/1234567890
        patterns = [
            r'(?:https?://)?(?:www\.)?(?:twitter\.com|x\.com)/(\w+)/status/(\d+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return {
                    'username': match.group(1).lower(),
                    'tweet_id': match.group(2),
                    'url': url
                }
        
        return None
    
    async def _get_engagers(self, tweet_info: dict, engagement_type: str) -> list[dict]:
        """
        Get users who engaged with a tweet.
        
        Args:
            tweet_info: Tweet info dictionary
            engagement_type: 'likers', 'retweeters', or 'commenters'
            
        Returns:
            List of user data dictionaries
        """
        users = []
        
        try:
            username = tweet_info['username']
            tweet_id = tweet_info['tweet_id']
            
            if engagement_type == 'likers':
                url = XUrls.TWEET_LIKERS.format(username=username, tweet_id=tweet_id)
            elif engagement_type == 'retweeters':
                url = XUrls.TWEET_RETWEETERS.format(username=username, tweet_id=tweet_id)
            elif engagement_type == 'commenters':
                # Comments are on the tweet page itself
                url = XUrls.TWEET.format(username=username, tweet_id=tweet_id)
            else:
                return users
            
            await self.browser.goto(url)
            
            # Wait for content to load
            if engagement_type == 'commenters':
                await self.browser.wait_for_selector(XSelectors.TWEET, timeout=10000)
            else:
                await self.browser.wait_for_selector(XSelectors.USER_CELL, timeout=10000)
            
            # Scroll and collect users
            collected = set()
            scroll_attempts = 0
            max_scrolls = 10
            
            while scroll_attempts < max_scrolls:
                if engagement_type == 'commenters':
                    user_elements = await self._extract_comment_authors()
                else:
                    user_elements = await self._extract_user_cells()
                
                for user_data in user_elements:
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
            
            self.logger.debug(f"Collected {len(users)} {engagement_type}")
            
        except Exception as e:
            self.logger.error(f"Failed to get {engagement_type}: {e}")
            self.stats.errors.append(f"Get {engagement_type} error: {str(e)}")
        
        return users
    
    async def _extract_user_cells(self) -> list[dict]:
        """Extract user data from user cells on page."""
        users = []
        
        try:
            usernames = await self.browser.get_all_text(
                f'{XSelectors.USER_CELL} {XSelectors.USER_NAME}'
            )
            
            for username in usernames:
                if username:
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
    
    async def _extract_comment_authors(self) -> list[dict]:
        """Extract authors from comments/replies."""
        users = []
        
        try:
            # In a real implementation, this would parse reply tweets
            # to get the author information
            pass
            
        except Exception as e:
            self.logger.debug(f"Error extracting comment authors: {e}")
        
        return users
    
    async def _follow_user(self, username: str) -> bool:
        """Follow a user from their profile."""
        try:
            profile_url = XUrls.PROFILE.format(username=username)
            await self.browser.goto(profile_url)
            
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

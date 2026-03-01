"""
Like By User Action

Like tweets from a specific user's profile.
"""

import asyncio
import time
from typing import Callable, Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import LikeResult, LikeFilters, TweetElement


class LikeByUser(BaseAction):
    """
    Like tweets from a specific user.
    
    Usage:
        liker = LikeByUser(browser, rate_limiter)
        result = await liker.execute(
            username="elonmusk",
            max_likes=10
        )
    """
    
    SELECTORS = {
        "tweet_article": 'article[data-testid="tweet"]',
        "like_button": '[data-testid="like"]',
        "unlike_button": '[data-testid="unlike"]',
        "tweet_text": '[data-testid="tweetText"]',
        "user_name": '[data-testid="User-Name"]',
        "primary_column": '[data-testid="primaryColumn"]',
        "user_not_found": '[data-testid="empty_state_header_text"]',
    }
    
    def __init__(
        self,
        browser: BrowserManager,
        rate_limiter: Optional[RateLimiter] = None,
        dry_run: bool = False,
    ):
        self.browser = browser
        self.rate_limiter = rate_limiter
        self.dry_run = dry_run
        self._cancelled = False
        self._liked_tweets: set = set()
    
    async def execute(
        self,
        username: str,
        max_likes: int = 50,
        include_replies: bool = False,
        include_retweets: bool = False,
        filters: Optional[LikeFilters] = None,
        on_like: Optional[Callable] = None,
        on_skip: Optional[Callable] = None,
    ) -> LikeResult:
        """
        Like tweets from a specific user.
        
        Args:
            username: Username to like tweets from (without @)
            max_likes: Maximum number of tweets to like
            include_replies: Include user's replies
            include_retweets: Include user's retweets
            filters: Additional filters
            on_like: Callback when a tweet is liked
            on_skip: Callback when a tweet is skipped
            
        Returns:
            LikeResult with summary of actions
        """
        start_time = time.time()
        result = LikeResult()
        filters = filters or LikeFilters()
        
        # Override retweet/reply filters based on parameters
        filters.exclude_retweets = not include_retweets
        filters.exclude_replies = not include_replies
        
        self._cancelled = False
        self._liked_tweets.clear()
        
        # Clean username
        username = username.lstrip("@").strip()
        if not username:
            result.errors.append("Invalid username")
            return result
        
        logger.info(f"Starting to like tweets from @{username}")
        
        try:
            # Navigate to user's profile
            profile_url = f"https://x.com/{username}"
            await self.browser.goto(profile_url)
            await asyncio.sleep(2)
            
            # Check if user exists
            page = self._get_page()
            if page:
                not_found = await page.query_selector(self.SELECTORS["user_not_found"])
                if not_found:
                    result.errors.append(f"User @{username} not found")
                    return result
            
            # Process tweets
            scroll_attempts = 0
            max_scroll_attempts = 20
            
            while result.success_count < max_likes and not self._cancelled:
                tweets = await self._get_visible_tweets()
                
                if not tweets:
                    scroll_attempts += 1
                    if scroll_attempts >= max_scroll_attempts:
                        logger.info("No more tweets found")
                        break
                    await self._scroll_down()
                    continue
                
                for tweet_element in tweets:
                    if self._cancelled or result.success_count >= max_likes:
                        break
                    
                    tweet = await self._parse_tweet_element(tweet_element)
                    if not tweet:
                        continue
                    
                    # Skip if already processed
                    tweet_id = tweet.tweet_url or id(tweet_element)
                    if tweet_id in self._liked_tweets:
                        continue
                    
                    self._liked_tweets.add(tweet_id)
                    
                    # Check if already liked
                    if await self._is_already_liked(tweet_element):
                        result.skipped_count += 1
                        result.skipped_tweets.append(str(tweet_id))
                        continue
                    
                    # Verify tweet is from target user
                    if tweet.author_username and tweet.author_username.lower() != username.lower():
                        if not tweet.is_retweet:
                            continue
                    
                    # Apply filters
                    matches, reason = filters.matches(tweet)
                    if not matches:
                        logger.debug(f"Skipping: {reason}")
                        result.skipped_count += 1
                        if on_skip:
                            await self._safe_callback(on_skip, tweet, reason)
                        continue
                    
                    # Rate limiting
                    if self.rate_limiter:
                        await self.rate_limiter.wait()
                    
                    # Like the tweet
                    success = await self._like_tweet(tweet_element)
                    
                    if success:
                        result.success_count += 1
                        result.liked_tweets.append(tweet.tweet_url or str(tweet_id))
                        logger.info(
                            f"Liked [{result.success_count}/{max_likes}] from @{username}: "
                            f"{tweet.text[:50] if tweet.text else 'No text'}..."
                        )
                        
                        if on_like:
                            await self._safe_callback(on_like, tweet)
                        
                        if self.rate_limiter:
                            self.rate_limiter.record_success()
                    else:
                        result.failed_count += 1
                        result.failed_tweets.append(tweet.tweet_url or str(tweet_id))
                        
                        if self.rate_limiter:
                            self.rate_limiter.record_error()
                    
                    await asyncio.sleep(1)
                
                await self._scroll_down()
                scroll_attempts = 0
                await asyncio.sleep(1)
        
        except Exception as e:
            logger.error(f"Error liking user's tweets: {e}")
            result.errors.append(str(e))
        
        result.duration_seconds = time.time() - start_time
        result.cancelled = self._cancelled
        
        logger.info(
            f"Completed liking @{username}'s tweets: {result.success_count} liked, "
            f"{result.failed_count} failed, {result.skipped_count} skipped"
        )
        
        return result
    
    async def execute_multiple_users(
        self,
        usernames: list[str],
        max_likes_per_user: int = 10,
        total_max_likes: int = 100,
        **kwargs,
    ) -> LikeResult:
        """
        Like tweets from multiple users.
        
        Args:
            usernames: List of usernames to like tweets from
            max_likes_per_user: Max likes per individual user
            total_max_likes: Total max likes across all users
            **kwargs: Additional arguments passed to execute()
            
        Returns:
            Combined LikeResult
        """
        combined_result = LikeResult()
        start_time = time.time()
        total_liked = 0
        
        for username in usernames:
            if self._cancelled or total_liked >= total_max_likes:
                break
            
            remaining = min(max_likes_per_user, total_max_likes - total_liked)
            result = await self.execute(username, max_likes=remaining, **kwargs)
            
            combined_result.success_count += result.success_count
            combined_result.failed_count += result.failed_count
            combined_result.skipped_count += result.skipped_count
            combined_result.liked_tweets.extend(result.liked_tweets)
            combined_result.failed_tweets.extend(result.failed_tweets)
            combined_result.skipped_tweets.extend(result.skipped_tweets)
            combined_result.errors.extend(result.errors)
            
            total_liked += result.success_count
            
            # Pause between users
            if not self._cancelled:
                await asyncio.sleep(5)
        
        combined_result.duration_seconds = time.time() - start_time
        combined_result.cancelled = self._cancelled
        
        return combined_result
    
    async def _get_visible_tweets(self) -> list:
        """Get all visible tweet elements."""
        page = self._get_page()
        if not page:
            return []
        
        try:
            return await page.query_selector_all(self.SELECTORS["tweet_article"])
        except Exception:
            return []
    
    async def _parse_tweet_element(self, element) -> Optional[TweetElement]:
        """Parse a tweet element into TweetElement."""
        try:
            tweet = TweetElement()
            
            # Get text
            text_el = await element.query_selector('[data-testid="tweetText"]')
            if text_el:
                tweet.text = await text_el.text_content()
                tweet.has_text = bool(tweet.text and tweet.text.strip())
            
            # Get author
            user_el = await element.query_selector(self.SELECTORS["user_name"])
            if user_el:
                user_text = await user_el.text_content()
                if "@" in user_text:
                    parts = user_text.split("@")
                    if len(parts) >= 2:
                        tweet.author_display_name = parts[0].strip()
                        username_part = parts[1].split()[0] if parts[1] else ""
                        tweet.author_username = username_part.strip("·").strip()
            
            # Get URL
            link_el = await element.query_selector('a[href*="/status/"]')
            if link_el:
                href = await link_el.get_attribute("href")
                if href:
                    tweet.tweet_url = f"https://x.com{href}" if href.startswith("/") else href
            
            # Check for retweet indicator
            retweet_el = await element.query_selector('[data-testid="socialContext"]')
            if retweet_el:
                context = await retweet_el.text_content()
                tweet.is_retweet = "reposted" in context.lower() if context else False
            
            # Check if reply
            reply_el = await element.query_selector('[data-testid="tweet"] a[href*="/status/"]')
            # Simplified reply detection
            tweet.is_reply = False
            
            return tweet
            
        except Exception as e:
            logger.debug(f"Error parsing tweet: {e}")
            return None
    
    async def _is_already_liked(self, element) -> bool:
        """Check if tweet is already liked."""
        try:
            unlike_button = await element.query_selector(self.SELECTORS["unlike_button"])
            return unlike_button is not None
        except Exception:
            return False
    
    async def _like_tweet(self, element) -> bool:
        """Click the like button."""
        if self.dry_run:
            logger.info("[DRY-RUN] Would like tweet")
            return True
        
        try:
            like_button = await element.query_selector(self.SELECTORS["like_button"])
            if like_button:
                await like_button.click()
                await asyncio.sleep(0.5)
                unlike_button = await element.query_selector(self.SELECTORS["unlike_button"])
                return unlike_button is not None
        except Exception as e:
            logger.debug(f"Error clicking like: {e}")
        
        return False
    
    async def _scroll_down(self, pixels: int = 800):
        """Scroll down the page."""
        page = self._get_page()
        if page:
            await page.evaluate(f"window.scrollBy(0, {pixels})")
            await asyncio.sleep(0.5)
    
    def _get_page(self):
        """Get current page."""
        return getattr(self.browser, 'page', None)
    
    async def _safe_callback(self, callback: Callable, *args):
        """Safely execute callback."""
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(*args)
            else:
                callback(*args)
        except Exception as e:
            logger.error(f"Callback error: {e}")
    
    def cancel(self):
        """Cancel the operation."""
        self._cancelled = True
        logger.info("Like by user operation cancelled")

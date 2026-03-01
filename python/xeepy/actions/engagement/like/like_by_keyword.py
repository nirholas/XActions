"""
Like By Keyword Action

Search for tweets by keyword and like them.
"""

import asyncio
import time
from typing import Callable, Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import LikeResult, LikeFilters, TweetElement


class LikeByKeyword(BaseAction):
    """
    Search for keywords and like matching tweets.
    
    Usage:
        liker = LikeByKeyword(browser, rate_limiter)
        result = await liker.execute(
            keywords=["python", "AI"],
            max_likes=20,
            search_filter="latest"
        )
    """
    
    SELECTORS = {
        "search_input": '[data-testid="SearchBox_Search_Input"]',
        "tweet_article": 'article[data-testid="tweet"]',
        "like_button": '[data-testid="like"]',
        "unlike_button": '[data-testid="unlike"]',
        "tweet_text": '[data-testid="tweetText"]',
        "user_name": '[data-testid="User-Name"]',
        "tab_latest": '[role="tab"]:has-text("Latest")',
        "tab_top": '[role="tab"]:has-text("Top")',
        "tab_people": '[role="tab"]:has-text("People")',
        "tab_media": '[role="tab"]:has-text("Media")',
    }
    
    SEARCH_URL = "https://x.com/search"
    
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
        self._liked_tweets: set = set()  # Track liked tweets to avoid duplicates
    
    async def execute(
        self,
        keywords: list[str],
        max_likes: int = 50,
        search_filter: str = "latest",
        filters: Optional[LikeFilters] = None,
        on_like: Optional[Callable] = None,
        on_skip: Optional[Callable] = None,
    ) -> LikeResult:
        """
        Search for keywords and like matching tweets.
        
        Args:
            keywords: Keywords to search for
            max_likes: Maximum number of tweets to like
            search_filter: 'top', 'latest', 'people', 'media'
            filters: Additional filters for which tweets to like
            on_like: Callback when a tweet is liked
            on_skip: Callback when a tweet is skipped
            
        Returns:
            LikeResult with summary of actions
        """
        start_time = time.time()
        result = LikeResult()
        filters = filters or LikeFilters()
        self._cancelled = False
        self._liked_tweets.clear()
        
        if not keywords:
            result.errors.append("No keywords provided")
            return result
        
        # Build search query
        search_query = " OR ".join(keywords)
        logger.info(f"Starting keyword search: {search_query}")
        
        try:
            # Navigate to search
            search_url = f"{self.SEARCH_URL}?q={search_query}&src=typed_query"
            await self.browser.goto(search_url)
            await asyncio.sleep(2)
            
            # Switch to correct tab
            await self._switch_tab(search_filter)
            await asyncio.sleep(1)
            
            # Process tweets
            scroll_attempts = 0
            max_scroll_attempts = 20
            
            while result.success_count < max_likes and not self._cancelled:
                # Get visible tweets
                tweets = await self._get_visible_tweets()
                
                if not tweets:
                    scroll_attempts += 1
                    if scroll_attempts >= max_scroll_attempts:
                        logger.info("No more tweets found")
                        break
                    await self._scroll_down()
                    continue
                
                # Process each tweet
                for tweet_element in tweets:
                    if self._cancelled or result.success_count >= max_likes:
                        break
                    
                    tweet = await self._parse_tweet_element(tweet_element)
                    if not tweet or tweet.tweet_url in self._liked_tweets:
                        continue
                    
                    # Check if already liked
                    if await self._is_already_liked(tweet_element):
                        logger.debug(f"Already liked: {tweet.tweet_url}")
                        result.skipped_count += 1
                        self._liked_tweets.add(tweet.tweet_url)
                        continue
                    
                    # Apply filters
                    matches, reason = filters.matches(tweet)
                    if not matches:
                        logger.debug(f"Skipping tweet: {reason}")
                        result.skipped_count += 1
                        result.skipped_tweets.append(tweet.tweet_url or "unknown")
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
                        result.liked_tweets.append(tweet.tweet_url or "unknown")
                        self._liked_tweets.add(tweet.tweet_url)
                        logger.info(f"Liked [{result.success_count}/{max_likes}]: {tweet.text[:50] if tweet.text else 'No text'}...")
                        
                        if on_like:
                            await self._safe_callback(on_like, tweet)
                        
                        if self.rate_limiter:
                            self.rate_limiter.record_success()
                    else:
                        result.failed_count += 1
                        result.failed_tweets.append(tweet.tweet_url or "unknown")
                        
                        if self.rate_limiter:
                            self.rate_limiter.record_error()
                    
                    # Small delay between likes
                    await asyncio.sleep(1)
                
                # Scroll for more content
                await self._scroll_down()
                scroll_attempts = 0
                await asyncio.sleep(1)
        
        except Exception as e:
            logger.error(f"Error in keyword search: {e}")
            result.errors.append(str(e))
        
        result.duration_seconds = time.time() - start_time
        result.cancelled = self._cancelled
        
        logger.info(
            f"Keyword search complete: {result.success_count} liked, "
            f"{result.failed_count} failed, {result.skipped_count} skipped"
        )
        
        return result
    
    async def _switch_tab(self, tab_name: str) -> bool:
        """Switch to the specified search tab."""
        tab_map = {
            "top": self.SELECTORS["tab_top"],
            "latest": self.SELECTORS["tab_latest"],
            "people": self.SELECTORS["tab_people"],
            "media": self.SELECTORS["tab_media"],
        }
        
        selector = tab_map.get(tab_name.lower())
        if not selector:
            return False
        
        try:
            page = self._get_page()
            if page:
                await page.click(selector)
                await asyncio.sleep(1)
                return True
        except Exception as e:
            logger.debug(f"Could not switch to {tab_name} tab: {e}")
        
        return False
    
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
        """Parse a tweet element into TweetElement dataclass."""
        try:
            tweet = TweetElement()
            
            # Get tweet text
            text_el = await element.query_selector(self.SELECTORS["tweet_text"])
            if text_el:
                tweet.text = await text_el.text_content()
                tweet.has_text = bool(tweet.text and tweet.text.strip())
            
            # Get author
            user_el = await element.query_selector(self.SELECTORS["user_name"])
            if user_el:
                user_text = await user_el.text_content()
                # Parse username from text like "Display Name@username"
                if "@" in user_text:
                    parts = user_text.split("@")
                    if len(parts) >= 2:
                        tweet.author_display_name = parts[0].strip()
                        # Get username (first part after @, before any other text)
                        username_part = parts[1].split()[0] if parts[1] else ""
                        tweet.author_username = username_part.strip("·").strip()
            
            # Try to get tweet URL from link
            link_el = await element.query_selector('a[href*="/status/"]')
            if link_el:
                href = await link_el.get_attribute("href")
                if href:
                    tweet.tweet_url = f"https://x.com{href}" if href.startswith("/") else href
            
            # Check for media
            media_el = await element.query_selector('[data-testid="tweetPhoto"], video')
            tweet.has_media = media_el is not None
            
            # Check if retweet
            retweet_indicator = await element.query_selector('[data-testid="socialContext"]')
            if retweet_indicator:
                context_text = await retweet_indicator.text_content()
                tweet.is_retweet = "reposted" in context_text.lower() if context_text else False
            
            # Extract hashtags
            if tweet.text:
                import re
                tweet.hashtags = re.findall(r'#(\w+)', tweet.text)
                tweet.mentions = re.findall(r'@(\w+)', tweet.text)
            
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
        """Click the like button on a tweet element."""
        if self.dry_run:
            logger.info("[DRY-RUN] Would like tweet")
            return True
        
        try:
            like_button = await element.query_selector(self.SELECTORS["like_button"])
            if like_button:
                await like_button.click()
                await asyncio.sleep(0.5)
                
                # Verify like was registered
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
        """Get the current page from browser."""
        return getattr(self.browser, 'page', None)
    
    async def _safe_callback(self, callback: Callable, *args):
        """Safely execute a callback."""
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
        logger.info("Like by keyword operation cancelled")

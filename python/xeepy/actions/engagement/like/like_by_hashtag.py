"""
Like By Hashtag Action

Like tweets containing specific hashtags.
"""

import asyncio
import time
from typing import Callable, Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import LikeResult, LikeFilters, TweetElement


class LikeByHashtag(BaseAction):
    """
    Like tweets with specific hashtags.
    
    Great for engaging in specific communities.
    
    Usage:
        liker = LikeByHashtag(browser, rate_limiter)
        result = await liker.execute(
            hashtags=["Python", "AI", "MachineLearning"],
            max_likes=30
        )
    """
    
    SELECTORS = {
        "tweet_article": 'article[data-testid="tweet"]',
        "like_button": '[data-testid="like"]',
        "unlike_button": '[data-testid="unlike"]',
        "tweet_text": '[data-testid="tweetText"]',
        "user_name": '[data-testid="User-Name"]',
        "tab_latest": '[role="tab"]:has-text("Latest")',
        "tab_top": '[role="tab"]:has-text("Top")',
    }
    
    HASHTAG_URL = "https://x.com/hashtag"
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
        self._liked_tweets: set = set()
    
    async def execute(
        self,
        hashtags: list[str],
        max_likes: int = 50,
        search_filter: str = "latest",
        filters: Optional[LikeFilters] = None,
        on_like: Optional[Callable] = None,
        on_skip: Optional[Callable] = None,
        likes_per_hashtag: Optional[int] = None,
    ) -> LikeResult:
        """
        Like tweets with specific hashtags.
        
        Args:
            hashtags: Hashtags to search (without #)
            max_likes: Maximum total likes
            search_filter: 'top' or 'latest'
            filters: Additional filters
            on_like: Callback when liked
            on_skip: Callback when skipped
            likes_per_hashtag: Max likes per hashtag (if None, spread evenly)
            
        Returns:
            LikeResult with summary
        """
        start_time = time.time()
        result = LikeResult()
        filters = filters or LikeFilters()
        self._cancelled = False
        self._liked_tweets.clear()
        
        if not hashtags:
            result.errors.append("No hashtags provided")
            return result
        
        # Clean hashtags (remove # if present)
        hashtags = [h.lstrip("#").strip() for h in hashtags if h.strip()]
        
        # Calculate likes per hashtag
        if likes_per_hashtag is None:
            likes_per_hashtag = max(1, max_likes // len(hashtags))
        
        total_liked = 0
        
        for hashtag in hashtags:
            if self._cancelled or total_liked >= max_likes:
                break
            
            remaining = min(likes_per_hashtag, max_likes - total_liked)
            logger.info(f"Processing hashtag #{hashtag} (target: {remaining} likes)")
            
            hashtag_result = await self._process_hashtag(
                hashtag=hashtag,
                max_likes=remaining,
                search_filter=search_filter,
                filters=filters,
                on_like=on_like,
                on_skip=on_skip,
            )
            
            # Aggregate results
            result.success_count += hashtag_result.success_count
            result.failed_count += hashtag_result.failed_count
            result.skipped_count += hashtag_result.skipped_count
            result.liked_tweets.extend(hashtag_result.liked_tweets)
            result.failed_tweets.extend(hashtag_result.failed_tweets)
            result.skipped_tweets.extend(hashtag_result.skipped_tweets)
            result.errors.extend(hashtag_result.errors)
            
            total_liked += hashtag_result.success_count
            
            # Pause between hashtags
            if not self._cancelled and hashtags.index(hashtag) < len(hashtags) - 1:
                await asyncio.sleep(3)
        
        result.duration_seconds = time.time() - start_time
        result.cancelled = self._cancelled
        
        logger.info(
            f"Hashtag liking complete: {result.success_count} liked, "
            f"{result.failed_count} failed, {result.skipped_count} skipped"
        )
        
        return result
    
    async def _process_hashtag(
        self,
        hashtag: str,
        max_likes: int,
        search_filter: str,
        filters: LikeFilters,
        on_like: Optional[Callable],
        on_skip: Optional[Callable],
    ) -> LikeResult:
        """Process a single hashtag."""
        result = LikeResult()
        
        try:
            # Navigate to hashtag page via search (more reliable)
            search_url = f"{self.SEARCH_URL}?q=%23{hashtag}&src=typed_query"
            await self.browser.goto(search_url)
            await asyncio.sleep(2)
            
            # Switch tab
            await self._switch_tab(search_filter)
            await asyncio.sleep(1)
            
            scroll_attempts = 0
            max_scroll_attempts = 15
            
            while result.success_count < max_likes and not self._cancelled:
                tweets = await self._get_visible_tweets()
                
                if not tweets:
                    scroll_attempts += 1
                    if scroll_attempts >= max_scroll_attempts:
                        break
                    await self._scroll_down()
                    continue
                
                for tweet_element in tweets:
                    if self._cancelled or result.success_count >= max_likes:
                        break
                    
                    tweet = await self._parse_tweet_element(tweet_element)
                    if not tweet:
                        continue
                    
                    tweet_id = tweet.tweet_url or id(tweet_element)
                    if tweet_id in self._liked_tweets:
                        continue
                    
                    self._liked_tweets.add(tweet_id)
                    
                    # Verify tweet contains the hashtag
                    if tweet.text and f"#{hashtag.lower()}" not in tweet.text.lower():
                        # Also check hashtags list
                        if hashtag.lower() not in [h.lower() for h in tweet.hashtags]:
                            continue
                    
                    # Check if already liked
                    if await self._is_already_liked(tweet_element):
                        result.skipped_count += 1
                        continue
                    
                    # Apply filters
                    matches, reason = filters.matches(tweet)
                    if not matches:
                        result.skipped_count += 1
                        if on_skip:
                            await self._safe_callback(on_skip, tweet, reason)
                        continue
                    
                    # Rate limiting
                    if self.rate_limiter:
                        await self.rate_limiter.wait()
                    
                    # Like
                    success = await self._like_tweet(tweet_element)
                    
                    if success:
                        result.success_count += 1
                        result.liked_tweets.append(tweet.tweet_url or str(tweet_id))
                        logger.info(
                            f"Liked #{hashtag} [{result.success_count}/{max_likes}]: "
                            f"{tweet.text[:40] if tweet.text else 'No text'}..."
                        )
                        
                        if on_like:
                            await self._safe_callback(on_like, tweet)
                        
                        if self.rate_limiter:
                            self.rate_limiter.record_success()
                    else:
                        result.failed_count += 1
                        if self.rate_limiter:
                            self.rate_limiter.record_error()
                    
                    await asyncio.sleep(1)
                
                await self._scroll_down()
                scroll_attempts = 0
                await asyncio.sleep(1)
        
        except Exception as e:
            logger.error(f"Error processing #{hashtag}: {e}")
            result.errors.append(f"#{hashtag}: {str(e)}")
        
        return result
    
    async def _switch_tab(self, tab_name: str) -> bool:
        """Switch to search tab."""
        selector = self.SELECTORS.get(f"tab_{tab_name.lower()}")
        if not selector:
            return False
        
        try:
            page = self._get_page()
            if page:
                await page.click(selector)
                await asyncio.sleep(1)
                return True
        except Exception:
            pass
        return False
    
    async def _get_visible_tweets(self) -> list:
        """Get visible tweets."""
        page = self._get_page()
        if not page:
            return []
        try:
            return await page.query_selector_all(self.SELECTORS["tweet_article"])
        except Exception:
            return []
    
    async def _parse_tweet_element(self, element) -> Optional[TweetElement]:
        """Parse tweet element."""
        try:
            tweet = TweetElement()
            
            text_el = await element.query_selector('[data-testid="tweetText"]')
            if text_el:
                tweet.text = await text_el.text_content()
                tweet.has_text = bool(tweet.text and tweet.text.strip())
            
            user_el = await element.query_selector(self.SELECTORS["user_name"])
            if user_el:
                user_text = await user_el.text_content()
                if "@" in user_text:
                    parts = user_text.split("@")
                    if len(parts) >= 2:
                        tweet.author_display_name = parts[0].strip()
                        username_part = parts[1].split()[0] if parts[1] else ""
                        tweet.author_username = username_part.strip("·").strip()
            
            link_el = await element.query_selector('a[href*="/status/"]')
            if link_el:
                href = await link_el.get_attribute("href")
                if href:
                    tweet.tweet_url = f"https://x.com{href}" if href.startswith("/") else href
            
            # Extract hashtags from text
            if tweet.text:
                import re
                tweet.hashtags = re.findall(r'#(\w+)', tweet.text)
            
            retweet_el = await element.query_selector('[data-testid="socialContext"]')
            if retweet_el:
                context = await retweet_el.text_content()
                tweet.is_retweet = "reposted" in context.lower() if context else False
            
            return tweet
        except Exception:
            return None
    
    async def _is_already_liked(self, element) -> bool:
        """Check if already liked."""
        try:
            unlike_button = await element.query_selector(self.SELECTORS["unlike_button"])
            return unlike_button is not None
        except Exception:
            return False
    
    async def _like_tweet(self, element) -> bool:
        """Like a tweet."""
        if self.dry_run:
            return True
        
        try:
            like_button = await element.query_selector(self.SELECTORS["like_button"])
            if like_button:
                await like_button.click()
                await asyncio.sleep(0.5)
                unlike_button = await element.query_selector(self.SELECTORS["unlike_button"])
                return unlike_button is not None
        except Exception:
            pass
        return False
    
    async def _scroll_down(self, pixels: int = 800):
        """Scroll down."""
        page = self._get_page()
        if page:
            await page.evaluate(f"window.scrollBy(0, {pixels})")
            await asyncio.sleep(0.5)
    
    def _get_page(self):
        """Get page."""
        return getattr(self.browser, 'page', None)
    
    async def _safe_callback(self, callback: Callable, *args):
        """Safe callback execution."""
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(*args)
            else:
                callback(*args)
        except Exception as e:
            logger.error(f"Callback error: {e}")
    
    def cancel(self):
        """Cancel operation."""
        self._cancelled = True
        logger.info("Like by hashtag operation cancelled")

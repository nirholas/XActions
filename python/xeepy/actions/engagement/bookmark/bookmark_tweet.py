"""
Bookmark Tweet Action

Add a tweet to bookmarks.
"""

import asyncio
import re
from typing import Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import BookmarkResult


class BookmarkTweet(BaseAction):
    """
    Add a tweet to bookmarks.
    
    Usage:
        bookmark_action = BookmarkTweet(browser, rate_limiter)
        result = await bookmark_action.execute("https://x.com/user/status/123456")
    """
    
    SELECTORS = {
        "tweet_article": 'article[data-testid="tweet"]',
        "share_button": '[data-testid="share"]',
        "bookmark_option": '[role="menuitem"]:has-text("Bookmark")',
        "bookmark_add": '[data-testid="bookmark"]',
        "bookmark_remove": '[data-testid="removeBookmark"]',
        "toast_message": '[data-testid="toast"]',
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
    
    async def execute(
        self,
        tweet_url: str,
        skip_if_bookmarked: bool = True,
    ) -> BookmarkResult:
        """
        Bookmark a tweet.
        
        Args:
            tweet_url: URL of the tweet to bookmark
            skip_if_bookmarked: Skip if already bookmarked
            
        Returns:
            BookmarkResult
        """
        import time
        start_time = time.time()
        result = BookmarkResult()
        
        tweet_url = self._normalize_url(tweet_url)
        if not tweet_url:
            result.failed_count = 1
            result.errors.append("Invalid tweet URL")
            return result
        
        try:
            if self.rate_limiter:
                await self.rate_limiter.wait()
            
            logger.info(f"Navigating to tweet: {tweet_url}")
            await self.browser.goto(tweet_url)
            await asyncio.sleep(2)
            
            page = self._get_page()
            if not page:
                result.failed_count = 1
                result.errors.append("No active page")
                return result
            
            try:
                await page.wait_for_selector(self.SELECTORS["tweet_article"], timeout=10000)
            except Exception:
                result.failed_count = 1
                result.errors.append("Tweet not found")
                return result
            
            if self.dry_run:
                logger.info(f"[DRY-RUN] Would bookmark: {tweet_url}")
                result.success_count = 1
                result.bookmarked_tweets.append(tweet_url)
                result.duration_seconds = time.time() - start_time
                return result
            
            # Click share button to open menu
            share_btn = await page.query_selector(self.SELECTORS["share_button"])
            if not share_btn:
                result.failed_count = 1
                result.errors.append("Share button not found")
                return result
            
            await share_btn.click()
            await asyncio.sleep(0.5)
            
            # Look for bookmark option in dropdown
            try:
                await page.wait_for_selector('[role="menu"]', timeout=3000)
                
                # Try to find bookmark option
                bookmark_opt = await page.query_selector(self.SELECTORS["bookmark_option"])
                if not bookmark_opt:
                    # Try alternative selector
                    bookmark_opt = await page.query_selector('[role="menuitem"] [d*="M4 4.5"]')  # Bookmark icon path
                
                if bookmark_opt:
                    # Check if already bookmarked (text might say "Remove Bookmark")
                    text = await bookmark_opt.text_content() if bookmark_opt else ""
                    if "Remove" in text and skip_if_bookmarked:
                        logger.info(f"Already bookmarked: {tweet_url}")
                        result.skipped_count = 1
                        # Close menu
                        await page.keyboard.press("Escape")
                        return result
                    
                    await bookmark_opt.click()
                    await asyncio.sleep(1)
                    
                    # Check for success toast
                    toast = await page.query_selector(self.SELECTORS["toast_message"])
                    if toast:
                        toast_text = await toast.text_content()
                        if "added" in toast_text.lower() or "bookmark" in toast_text.lower():
                            logger.info(f"Successfully bookmarked: {tweet_url}")
                            result.success_count = 1
                            result.bookmarked_tweets.append(tweet_url)
                            if self.rate_limiter:
                                self.rate_limiter.record_success()
                            result.duration_seconds = time.time() - start_time
                            return result
                    
                    # Assume success if no error
                    logger.info(f"Bookmarked: {tweet_url}")
                    result.success_count = 1
                    result.bookmarked_tweets.append(tweet_url)
                else:
                    # Close menu and try direct bookmark button on tweet
                    await page.keyboard.press("Escape")
                    await asyncio.sleep(0.3)
                    
                    # Try direct bookmark button
                    tweet = await page.query_selector(self.SELECTORS["tweet_article"])
                    if tweet:
                        bookmark_btn = await tweet.query_selector(self.SELECTORS["bookmark_add"])
                        if bookmark_btn:
                            await bookmark_btn.click()
                            await asyncio.sleep(1)
                            result.success_count = 1
                            result.bookmarked_tweets.append(tweet_url)
                        else:
                            result.failed_count = 1
                            result.errors.append("Bookmark option not found")
                    else:
                        result.failed_count = 1
                        result.errors.append("Could not find bookmark option")
            
            except Exception as e:
                result.failed_count = 1
                result.errors.append(f"Failed to open bookmark menu: {e}")
        
        except Exception as e:
            logger.error(f"Error bookmarking tweet: {e}")
            result.failed_count = 1
            result.errors.append(str(e))
            if self.rate_limiter:
                self.rate_limiter.record_error()
        
        result.duration_seconds = time.time() - start_time
        return result
    
    async def bulk_bookmark(
        self,
        tweet_urls: list[str],
        on_bookmark: Optional[callable] = None,
        delay_between: tuple[int, int] = (1, 3),
    ) -> BookmarkResult:
        """
        Bookmark multiple tweets.
        
        Args:
            tweet_urls: List of tweet URLs
            on_bookmark: Callback after each bookmark
            delay_between: Delay range between bookmarks
            
        Returns:
            Combined BookmarkResult
        """
        import time
        import random
        
        start_time = time.time()
        combined_result = BookmarkResult()
        
        for url in tweet_urls:
            result = await self.execute(url)
            
            combined_result.success_count += result.success_count
            combined_result.failed_count += result.failed_count
            combined_result.bookmarked_tweets.extend(result.bookmarked_tweets)
            combined_result.failed_tweets.extend(result.failed_tweets)
            combined_result.errors.extend(result.errors)
            
            if result.success_count > 0 and on_bookmark:
                try:
                    if asyncio.iscoroutinefunction(on_bookmark):
                        await on_bookmark(url)
                    else:
                        on_bookmark(url)
                except Exception as e:
                    logger.error(f"Callback error: {e}")
            
            delay = random.uniform(*delay_between)
            await asyncio.sleep(delay)
        
        combined_result.duration_seconds = time.time() - start_time
        return combined_result
    
    def _normalize_url(self, url: str) -> Optional[str]:
        """Normalize tweet URL."""
        if url.isdigit():
            return f"https://x.com/i/status/{url}"
        
        patterns = [
            r'https?://(?:www\.)?(?:twitter|x)\.com/\w+/status/(\d+)',
        ]
        
        for pattern in patterns:
            match = re.match(pattern, url)
            if match:
                tweet_id = match.group(1)
                return f"https://x.com/i/status/{tweet_id}"
        
        if re.match(r'https?://x\.com/', url):
            return url
        
        return None
    
    def _get_page(self):
        """Get current page."""
        return getattr(self.browser, 'page', None)

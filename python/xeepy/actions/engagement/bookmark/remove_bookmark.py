"""
Remove Bookmark Action

Remove a tweet from bookmarks.
"""

import asyncio
import re
from typing import Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import BookmarkResult


class RemoveBookmark(BaseAction):
    """
    Remove a tweet from bookmarks.
    
    Usage:
        remover = RemoveBookmark(browser, rate_limiter)
        result = await remover.execute("https://x.com/user/status/123456")
    """
    
    SELECTORS = {
        "tweet_article": 'article[data-testid="tweet"]',
        "share_button": '[data-testid="share"]',
        "remove_bookmark_option": '[role="menuitem"]:has-text("Remove")',
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
    ) -> BookmarkResult:
        """
        Remove a tweet from bookmarks.
        
        Args:
            tweet_url: URL of the tweet to remove from bookmarks
            
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
                logger.info(f"[DRY-RUN] Would remove bookmark: {tweet_url}")
                result.success_count = 1
                result.removed_bookmarks.append(tweet_url)
                result.duration_seconds = time.time() - start_time
                return result
            
            # Click share button
            share_btn = await page.query_selector(self.SELECTORS["share_button"])
            if not share_btn:
                result.failed_count = 1
                result.errors.append("Share button not found")
                return result
            
            await share_btn.click()
            await asyncio.sleep(0.5)
            
            try:
                await page.wait_for_selector('[role="menu"]', timeout=3000)
                
                # Look for "Remove from Bookmarks" option
                remove_opt = await page.query_selector(self.SELECTORS["remove_bookmark_option"])
                
                if not remove_opt:
                    # Tweet might not be bookmarked
                    logger.info(f"Tweet not bookmarked (skipping): {tweet_url}")
                    result.skipped_count = 1
                    await page.keyboard.press("Escape")
                    return result
                
                text = await remove_opt.text_content() if remove_opt else ""
                if "Remove" in text and "Bookmark" in text:
                    await remove_opt.click()
                    await asyncio.sleep(1)
                    
                    logger.info(f"Removed bookmark: {tweet_url}")
                    result.success_count = 1
                    result.removed_bookmarks.append(tweet_url)
                else:
                    # Not a remove option
                    result.skipped_count = 1
                    await page.keyboard.press("Escape")
            
            except Exception as e:
                result.failed_count = 1
                result.errors.append(f"Failed to remove bookmark: {e}")
        
        except Exception as e:
            logger.error(f"Error removing bookmark: {e}")
            result.failed_count = 1
            result.errors.append(str(e))
        
        result.duration_seconds = time.time() - start_time
        return result
    
    async def bulk_remove(
        self,
        tweet_urls: list[str],
        on_remove: Optional[callable] = None,
        delay_between: tuple[int, int] = (1, 3),
    ) -> BookmarkResult:
        """
        Remove multiple bookmarks.
        
        Args:
            tweet_urls: List of tweet URLs
            on_remove: Callback after each removal
            delay_between: Delay range
            
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
            combined_result.skipped_count += result.skipped_count
            combined_result.removed_bookmarks.extend(result.removed_bookmarks)
            combined_result.errors.extend(result.errors)
            
            if result.success_count > 0 and on_remove:
                try:
                    if asyncio.iscoroutinefunction(on_remove):
                        await on_remove(url)
                    else:
                        on_remove(url)
                except Exception as e:
                    logger.error(f"Callback error: {e}")
            
            delay = random.uniform(*delay_between)
            await asyncio.sleep(delay)
        
        combined_result.duration_seconds = time.time() - start_time
        return combined_result
    
    def _normalize_url(self, url: str) -> Optional[str]:
        """Normalize URL."""
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

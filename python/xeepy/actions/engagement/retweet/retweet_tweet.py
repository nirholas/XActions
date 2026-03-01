"""
Retweet Tweet Action

Retweet a single tweet.
"""

import asyncio
import re
from typing import Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import RetweetResult


class RetweetTweet(BaseAction):
    """
    Retweet a single tweet.
    
    Usage:
        retweeter = RetweetTweet(browser, rate_limiter)
        result = await retweeter.execute("https://x.com/user/status/123456")
    """
    
    SELECTORS = {
        "tweet_article": 'article[data-testid="tweet"]',
        "retweet_button": '[data-testid="retweet"]',
        "unretweet_button": '[data-testid="unretweet"]',
        "retweet_confirm": '[data-testid="retweetConfirm"]',
        "unretweet_confirm": '[data-testid="unretweetConfirm"]',
        "retweet_menu": '[data-testid="Dropdown"]',
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
        skip_if_retweeted: bool = True,
    ) -> RetweetResult:
        """
        Retweet a tweet.
        
        Args:
            tweet_url: URL of the tweet to retweet
            skip_if_retweeted: Skip if already retweeted
            
        Returns:
            RetweetResult
        """
        import time
        start_time = time.time()
        result = RetweetResult()
        
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
            
            # Check if already retweeted
            unretweet_btn = await page.query_selector(self.SELECTORS["unretweet_button"])
            if unretweet_btn and skip_if_retweeted:
                logger.info(f"Already retweeted: {tweet_url}")
                result.skipped_count = 1
                return result
            
            # Find retweet button
            retweet_btn = await page.query_selector(self.SELECTORS["retweet_button"])
            if not retweet_btn:
                result.failed_count = 1
                result.errors.append("Retweet button not found")
                return result
            
            if self.dry_run:
                logger.info(f"[DRY-RUN] Would retweet: {tweet_url}")
                result.success_count = 1
                result.retweeted_tweets.append(tweet_url)
                result.duration_seconds = time.time() - start_time
                return result
            
            # Click retweet button (opens menu)
            await retweet_btn.click()
            await asyncio.sleep(0.5)
            
            # Click confirm retweet
            try:
                await page.wait_for_selector(self.SELECTORS["retweet_confirm"], timeout=3000)
                confirm_btn = await page.query_selector(self.SELECTORS["retweet_confirm"])
                if confirm_btn:
                    await confirm_btn.click()
                    await asyncio.sleep(1)
            except Exception:
                # Menu might not have appeared
                pass
            
            # Verify retweet
            await asyncio.sleep(1)
            unretweet_btn = await page.query_selector(self.SELECTORS["unretweet_button"])
            
            if unretweet_btn:
                logger.info(f"Successfully retweeted: {tweet_url}")
                result.success_count = 1
                result.retweeted_tweets.append(tweet_url)
                if self.rate_limiter:
                    self.rate_limiter.record_success()
            else:
                result.failed_count = 1
                result.errors.append("Retweet may not have registered")
                if self.rate_limiter:
                    self.rate_limiter.record_error()
        
        except Exception as e:
            logger.error(f"Error retweeting: {e}")
            result.failed_count = 1
            result.errors.append(str(e))
            if self.rate_limiter:
                self.rate_limiter.record_error()
        
        result.duration_seconds = time.time() - start_time
        return result
    
    async def unretweet(self, tweet_url: str) -> RetweetResult:
        """
        Undo a retweet.
        
        Args:
            tweet_url: URL of the tweet to unretweet
            
        Returns:
            RetweetResult
        """
        import time
        start_time = time.time()
        result = RetweetResult()
        
        tweet_url = self._normalize_url(tweet_url)
        if not tweet_url:
            result.failed_count = 1
            result.errors.append("Invalid tweet URL")
            return result
        
        try:
            if self.rate_limiter:
                await self.rate_limiter.wait()
            
            await self.browser.goto(tweet_url)
            await asyncio.sleep(2)
            
            page = self._get_page()
            if not page:
                result.failed_count = 1
                return result
            
            # Find unretweet button
            unretweet_btn = await page.query_selector(self.SELECTORS["unretweet_button"])
            if not unretweet_btn:
                result.skipped_count = 1
                logger.info(f"Not retweeted (skipping): {tweet_url}")
                return result
            
            if self.dry_run:
                logger.info(f"[DRY-RUN] Would unretweet: {tweet_url}")
                result.success_count = 1
                result.duration_seconds = time.time() - start_time
                return result
            
            # Click unretweet
            await unretweet_btn.click()
            await asyncio.sleep(0.5)
            
            # Confirm unretweet
            try:
                await page.wait_for_selector(self.SELECTORS["unretweet_confirm"], timeout=3000)
                confirm_btn = await page.query_selector(self.SELECTORS["unretweet_confirm"])
                if confirm_btn:
                    await confirm_btn.click()
                    await asyncio.sleep(1)
            except Exception:
                pass
            
            logger.info(f"Unretweeted: {tweet_url}")
            result.success_count = 1
        
        except Exception as e:
            logger.error(f"Error unretweeting: {e}")
            result.failed_count = 1
            result.errors.append(str(e))
        
        result.duration_seconds = time.time() - start_time
        return result
    
    async def bulk_retweet(
        self,
        tweet_urls: list[str],
        on_retweet: Optional[callable] = None,
        delay_between: tuple[int, int] = (2, 5),
    ) -> RetweetResult:
        """
        Retweet multiple tweets.
        
        Args:
            tweet_urls: List of tweet URLs
            on_retweet: Callback after each retweet
            delay_between: Delay range between retweets
            
        Returns:
            Combined RetweetResult
        """
        import time
        import random
        
        start_time = time.time()
        combined_result = RetweetResult()
        
        for url in tweet_urls:
            result = await self.execute(url)
            
            combined_result.success_count += result.success_count
            combined_result.failed_count += result.failed_count
            combined_result.skipped_count += result.skipped_count
            combined_result.retweeted_tweets.extend(result.retweeted_tweets)
            combined_result.failed_tweets.extend(result.failed_tweets)
            combined_result.errors.extend(result.errors)
            
            if result.success_count > 0 and on_retweet:
                try:
                    if asyncio.iscoroutinefunction(on_retweet):
                        await on_retweet(url)
                    else:
                        on_retweet(url)
                except Exception as e:
                    logger.error(f"Callback error: {e}")
            
            # Delay between retweets
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
            r'https?://(?:mobile\.)?(?:twitter|x)\.com/\w+/status/(\d+)',
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

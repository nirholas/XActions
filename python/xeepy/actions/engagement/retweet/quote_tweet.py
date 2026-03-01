"""
Quote Tweet Action

Quote tweet with custom text.
"""

import asyncio
import re
from typing import Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import RetweetResult


class QuoteTweet(BaseAction):
    """
    Quote tweet with custom text.
    
    Usage:
        quoter = QuoteTweet(browser, rate_limiter)
        result = await quoter.execute(
            tweet_url="https://x.com/user/status/123",
            quote_text="This is so insightful! 🔥"
        )
    """
    
    SELECTORS = {
        "tweet_article": 'article[data-testid="tweet"]',
        "retweet_button": '[data-testid="retweet"]',
        "quote_option": '[data-testid="Dropdown"] [role="menuitem"]:has-text("Quote")',
        "tweet_input": '[data-testid="tweetTextarea_0"]',
        "tweet_submit": '[data-testid="tweetButton"]',
        "compose_tweet": '[data-testid="SideNav_NewTweet_Button"]',
    }
    
    MAX_QUOTE_LENGTH = 280
    
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
        quote_text: str,
        media_paths: Optional[list[str]] = None,
    ) -> RetweetResult:
        """
        Quote tweet with custom text.
        
        Args:
            tweet_url: URL of the tweet to quote
            quote_text: Text for the quote
            media_paths: Optional media to attach
            
        Returns:
            RetweetResult
        """
        import time
        start_time = time.time()
        result = RetweetResult()
        
        # Validate
        if not quote_text or not quote_text.strip():
            result.failed_count = 1
            result.errors.append("Quote text cannot be empty")
            return result
        
        if len(quote_text) > self.MAX_QUOTE_LENGTH:
            result.failed_count = 1
            result.errors.append(f"Quote exceeds {self.MAX_QUOTE_LENGTH} characters")
            return result
        
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
                logger.info(f"[DRY-RUN] Would quote tweet {tweet_url}: {quote_text}")
                result.success_count = 1
                result.quoted_tweets.append({
                    "tweet_url": tweet_url,
                    "quote_text": quote_text,
                    "dry_run": True,
                })
                result.duration_seconds = time.time() - start_time
                return result
            
            # Click retweet button to open menu
            retweet_btn = await page.query_selector(self.SELECTORS["retweet_button"])
            if not retweet_btn:
                result.failed_count = 1
                result.errors.append("Retweet button not found")
                return result
            
            await retweet_btn.click()
            await asyncio.sleep(0.5)
            
            # Click "Quote" option
            try:
                await page.wait_for_selector(self.SELECTORS["quote_option"], timeout=3000)
                quote_option = await page.query_selector(self.SELECTORS["quote_option"])
                if quote_option:
                    await quote_option.click()
                    await asyncio.sleep(1)
                else:
                    # Try alternative: look for "Quote Tweet" text
                    quote_option = await page.query_selector('[role="menuitem"]:has-text("Quote")')
                    if quote_option:
                        await quote_option.click()
                        await asyncio.sleep(1)
                    else:
                        result.failed_count = 1
                        result.errors.append("Quote option not found")
                        return result
            except Exception as e:
                result.failed_count = 1
                result.errors.append(f"Failed to open quote dialog: {e}")
                return result
            
            # Wait for quote compose area
            try:
                await page.wait_for_selector(self.SELECTORS["tweet_input"], timeout=5000)
            except Exception:
                result.failed_count = 1
                result.errors.append("Quote compose area not found")
                return result
            
            # Type quote text
            tweet_input = await page.query_selector(self.SELECTORS["tweet_input"])
            if tweet_input:
                await tweet_input.click()
                await page.keyboard.type(quote_text, delay=30)
                await asyncio.sleep(0.5)
            
            # Attach media if provided
            if media_paths:
                for path in media_paths:
                    await self._attach_media(path)
            
            # Submit
            submit_btn = await page.query_selector(self.SELECTORS["tweet_submit"])
            if not submit_btn:
                result.failed_count = 1
                result.errors.append("Submit button not found")
                return result
            
            await submit_btn.click()
            await asyncio.sleep(2)
            
            logger.info(f"Quote tweeted: {quote_text[:50]}...")
            result.success_count = 1
            result.quoted_tweets.append({
                "tweet_url": tweet_url,
                "quote_text": quote_text,
            })
            
            if self.rate_limiter:
                self.rate_limiter.record_success()
        
        except Exception as e:
            logger.error(f"Error quote tweeting: {e}")
            result.failed_count = 1
            result.errors.append(str(e))
            if self.rate_limiter:
                self.rate_limiter.record_error()
        
        result.duration_seconds = time.time() - start_time
        return result
    
    async def quote_with_template(
        self,
        tweet_url: str,
        template: str,
        context: dict,
        media_paths: Optional[list[str]] = None,
    ) -> RetweetResult:
        """
        Quote tweet using a template with context variables.
        
        Args:
            tweet_url: URL of tweet to quote
            template: Template string with {placeholders}
            context: Dictionary of values for placeholders
            media_paths: Optional media
            
        Returns:
            RetweetResult
        """
        try:
            quote_text = template.format(**context)
        except KeyError as e:
            result = RetweetResult()
            result.failed_count = 1
            result.errors.append(f"Missing template variable: {e}")
            return result
        
        return await self.execute(tweet_url, quote_text, media_paths)
    
    async def bulk_quote(
        self,
        tweets: list[dict],  # [{"url": "...", "text": "..."}]
        delay_between: tuple[int, int] = (30, 60),
    ) -> RetweetResult:
        """
        Quote multiple tweets.
        
        Args:
            tweets: List of dicts with "url" and "text" keys
            delay_between: Delay range between quotes
            
        Returns:
            Combined RetweetResult
        """
        import time
        import random
        
        start_time = time.time()
        combined_result = RetweetResult()
        
        for tweet in tweets:
            url = tweet.get("url")
            text = tweet.get("text")
            media = tweet.get("media_paths")
            
            if not url or not text:
                combined_result.failed_count += 1
                combined_result.errors.append("Missing url or text in tweet dict")
                continue
            
            result = await self.execute(url, text, media)
            
            combined_result.success_count += result.success_count
            combined_result.failed_count += result.failed_count
            combined_result.quoted_tweets.extend(result.quoted_tweets)
            combined_result.errors.extend(result.errors)
            
            # Longer delay for quote tweets
            delay = random.uniform(*delay_between)
            await asyncio.sleep(delay)
        
        combined_result.duration_seconds = time.time() - start_time
        return combined_result
    
    async def _attach_media(self, path: str) -> bool:
        """Attach media to quote."""
        page = self._get_page()
        if not page:
            return False
        
        try:
            file_input = await page.query_selector('input[type="file"][accept*="image"]')
            if file_input:
                await file_input.set_input_files(path)
                await asyncio.sleep(1)
                return True
        except Exception as e:
            logger.warning(f"Failed to attach media: {e}")
        
        return False
    
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

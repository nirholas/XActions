"""
Reply Tweet Action

Post a reply to a single tweet.
"""

import asyncio
import re
from typing import Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import CommentResult


class ReplyTweet(BaseAction):
    """
    Reply to a single tweet.
    
    Usage:
        replier = ReplyTweet(browser, rate_limiter)
        result = await replier.execute(
            tweet_url="https://x.com/user/status/123",
            reply_text="Great point! 🔥"
        )
    """
    
    SELECTORS = {
        "tweet_article": 'article[data-testid="tweet"]',
        "reply_button": '[data-testid="reply"]',
        "reply_input": '[data-testid="tweetTextarea_0"]',
        "reply_submit": '[data-testid="tweetButtonInline"]',
        "reply_confirm": '[data-testid="confirmationSheetConfirm"]',
        "tweet_text": '[data-testid="tweetText"]',
        "char_counter": '[data-testid="tweetTextarea_0_label"]',
    }
    
    MAX_REPLY_LENGTH = 280
    
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
        reply_text: str,
        media_paths: Optional[list[str]] = None,
    ) -> CommentResult:
        """
        Reply to a tweet.
        
        Args:
            tweet_url: URL of the tweet to reply to
            reply_text: Text of the reply
            media_paths: Optional paths to media files to attach
            
        Returns:
            CommentResult with success/failure info
        """
        import time
        start_time = time.time()
        result = CommentResult()
        
        # Validate reply text
        if not reply_text or not reply_text.strip():
            result.failed_count = 1
            result.errors.append("Reply text cannot be empty")
            return result
        
        if len(reply_text) > self.MAX_REPLY_LENGTH:
            result.failed_count = 1
            result.errors.append(f"Reply exceeds {self.MAX_REPLY_LENGTH} characters")
            return result
        
        # Normalize URL
        tweet_url = self._normalize_url(tweet_url)
        if not tweet_url:
            result.failed_count = 1
            result.errors.append("Invalid tweet URL")
            return result
        
        try:
            # Rate limiting
            if self.rate_limiter:
                await self.rate_limiter.wait()
            
            # Navigate to tweet
            logger.info(f"Navigating to tweet: {tweet_url}")
            await self.browser.goto(tweet_url)
            await asyncio.sleep(2)
            
            # Wait for tweet to load
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
                logger.info(f"[DRY-RUN] Would reply to {tweet_url}: {reply_text}")
                result.success_count = 1
                result.comments_posted.append({
                    "tweet_url": tweet_url,
                    "comment_text": reply_text,
                    "dry_run": True,
                })
                result.duration_seconds = time.time() - start_time
                return result
            
            # Click reply button to open reply dialog
            reply_btn = await page.query_selector(self.SELECTORS["reply_button"])
            if not reply_btn:
                result.failed_count = 1
                result.errors.append("Reply button not found")
                return result
            
            await reply_btn.click()
            await asyncio.sleep(1)
            
            # Wait for reply input
            try:
                await page.wait_for_selector(self.SELECTORS["reply_input"], timeout=5000)
            except Exception:
                result.failed_count = 1
                result.errors.append("Reply input not found")
                return result
            
            # Type reply
            reply_input = await page.query_selector(self.SELECTORS["reply_input"])
            if reply_input:
                await reply_input.click()
                await page.keyboard.type(reply_text, delay=30)
                await asyncio.sleep(0.5)
            
            # Attach media if provided
            if media_paths:
                for path in media_paths:
                    await self._attach_media(path)
            
            # Submit reply
            submit_btn = await page.query_selector(self.SELECTORS["reply_submit"])
            if not submit_btn:
                result.failed_count = 1
                result.errors.append("Submit button not found")
                return result
            
            await submit_btn.click()
            await asyncio.sleep(2)
            
            # Check for confirmation or success
            # Note: Twitter might show the reply immediately or require confirmation
            
            logger.info(f"Reply posted to {tweet_url}")
            result.success_count = 1
            result.comments_posted.append({
                "tweet_url": tweet_url,
                "comment_text": reply_text,
            })
            
            if self.rate_limiter:
                self.rate_limiter.record_success()
        
        except Exception as e:
            logger.error(f"Error replying to tweet: {e}")
            result.failed_count = 1
            result.errors.append(str(e))
            result.failed_comments.append({
                "tweet_url": tweet_url,
                "comment_text": reply_text,
                "error": str(e),
            })
            if self.rate_limiter:
                self.rate_limiter.record_error()
        
        result.duration_seconds = time.time() - start_time
        return result
    
    async def reply_with_preview(
        self,
        tweet_url: str,
        reply_text: str,
        preview_callback: callable,
    ) -> CommentResult:
        """
        Reply with a preview step before posting.
        
        Args:
            tweet_url: URL of the tweet
            reply_text: Text of the reply
            preview_callback: Callback to confirm (returns bool)
            
        Returns:
            CommentResult
        """
        # Show preview
        confirmed = await preview_callback(tweet_url, reply_text)
        
        if confirmed:
            return await self.execute(tweet_url, reply_text)
        else:
            result = CommentResult()
            result.skipped_count = 1
            return result
    
    async def _attach_media(self, path: str) -> bool:
        """Attach media to reply."""
        page = self._get_page()
        if not page:
            return False
        
        try:
            # Find file input
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

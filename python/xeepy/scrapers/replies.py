"""
Tweet replies scraper.

THIS IS THE FIX FOR THE ORIGINAL twitter_reply.py!

The original version used the deprecated Tweepy search API.
This version uses Playwright browser automation to scrape replies
directly from the tweet page.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Callable

from loguru import logger

from xeepy.core.selectors import Selectors
from xeepy.core.utils import extract_tweet_id, parse_count
from xeepy.models.tweet import Tweet, Reply
from xeepy.scrapers.base import BaseScraper, ScrapeResult


class RepliesScraper(BaseScraper):
    """
    Scraper for X/Twitter tweet replies.
    
    **THIS FIXES THE ORIGINAL BROKEN twitter_reply.py**
    
    The old version used the deprecated Tweepy search API which no longer
    works for getting tweet replies. This version uses browser automation
    to scrape replies directly from the tweet page.
    
    Features:
    - Scrapes all visible replies to a tweet
    - Handles infinite scroll for large threads
    - Extracts user info, text, engagement metrics
    - Supports progress callbacks
    - Exports to CSV/JSON
    
    Example:
        >>> async with BrowserManager() as browser:
        ...     # Login first if needed
        ...     await browser.auth.login_with_cookies(cookies)
        ...     
        ...     scraper = RepliesScraper(browser)
        ...     result = await scraper.scrape(
        ...         "https://x.com/elonmusk/status/1234567890",
        ...         limit=100,
        ...     )
        ...     
        ...     for reply in result.items:
        ...         print(f"@{reply.author.username}: {reply.text}")
        ...     
        ...     # Export to CSV (like original)
        ...     scraper.export("replies.csv", format="csv")
    """
    
    async def scrape(
        self,
        target: str,
        limit: int = 100,
        on_progress: Callable[[int, int], None] | None = None,
        include_nested: bool = True,
        **kwargs,
    ) -> ScrapeResult[Reply]:
        """
        Scrape replies to a specific tweet.
        
        Args:
            target: Tweet URL or tweet ID.
            limit: Maximum number of replies to collect.
            on_progress: Progress callback (current_count, limit).
            include_nested: Whether to include nested replies (replies to replies).
            **kwargs: Additional options.
            
        Returns:
            ScrapeResult containing Reply objects.
            
        Example:
            >>> result = await scraper.scrape(
            ...     "https://x.com/user/status/1234567890",
            ...     limit=50
            ... )
        """
        result = ScrapeResult[Reply](target=target)
        self.reset()
        
        # Extract tweet ID from URL if needed
        if target.startswith("http"):
            tweet_id = extract_tweet_id(target)
            if not tweet_id:
                result.error = f"Could not extract tweet ID from URL: {target}"
                return result
            tweet_url = target
        else:
            tweet_id = target
            tweet_url = f"https://x.com/i/status/{tweet_id}"
        
        result.metadata["tweet_id"] = tweet_id
        
        try:
            logger.info(f"Scraping replies to tweet {tweet_id} (limit: {limit})")
            
            # Navigate to tweet
            await self.browser.navigate(tweet_url)
            
            # Wait for the tweet and replies to load
            loaded = await self._wait_for_content(
                Selectors.TWEET,
                timeout=15000,
            )
            
            if not loaded:
                error = await self._check_for_error_states()
                if error:
                    result.error = error
                    return result
                result.error = "Tweet failed to load"
                return result
            
            # Check for specific tweet errors
            error = await self._check_tweet_errors()
            if error:
                result.error = error
                return result
            
            # Store context for extraction
            self._parent_tweet_id = tweet_id
            self._include_nested = include_nested
            
            # Get the original tweet author to exclude from replies
            self._original_author = await self._get_original_author()
            
            # Wait a moment for replies to load
            await self.browser.page.wait_for_timeout(2000)
            
            # Scroll and collect replies
            items = await self._scroll_and_collect(
                selector=Selectors.TWEET,
                extractor=self._extract_item,
                limit=limit,
                id_key="id",
                on_progress=on_progress,
                scroll_pause=2.0,  # Replies load slower
            )
            
            # Convert to Reply objects
            replies = [Reply.from_dict(item) for item in items]
            
            result.items = replies
            result.total_found = len(replies)
            self.results = replies
            
            logger.info(f"Collected {len(replies)} replies")
            
        except Exception as e:
            logger.error(f"Replies scraping error: {e}")
            result.error = str(e)
        finally:
            result.completed_at = datetime.now()
        
        return result
    
    async def _extract_item(self, element: Any) -> dict[str, Any] | None:
        """
        Extract reply data from a tweet element.
        
        Args:
            element: Playwright locator for the tweet/reply.
            
        Returns:
            Dict with reply data or None if extraction fails.
        """
        try:
            # Get tweet ID from link
            tweet_id = ""
            try:
                time_link = element.locator('a[href*="/status/"] time').first
                if await time_link.count() > 0:
                    parent_link = element.locator('a[href*="/status/"]').first
                    href = await parent_link.get_attribute("href")
                    if href:
                        tweet_id = extract_tweet_id(href) or ""
            except Exception:
                pass
            
            if not tweet_id:
                return None
            
            # Skip the original tweet (first tweet on the page)
            if tweet_id == self._parent_tweet_id:
                return None
            
            # Author info
            author_username = ""
            author_display_name = ""
            is_verified = False
            
            try:
                user_name = element.locator(Selectors.TWEET_AUTHOR)
                if await user_name.count() > 0:
                    # Get username from link
                    user_link = user_name.locator('a[href^="/"]').first
                    if await user_link.count() > 0:
                        href = await user_link.get_attribute("href")
                        if href:
                            author_username = href.strip("/").split("/")[0]
                    
                    # Get display name
                    name_span = user_name.locator('span').first
                    if await name_span.count() > 0:
                        author_display_name = await name_span.inner_text()
                    
                    # Check verification
                    verified = user_name.locator('svg[data-testid="icon-verified"]')
                    if await verified.count() > 0:
                        is_verified = True
            except Exception:
                pass
            
            # Skip original author's tweets in the thread (unless it's a reply)
            if hasattr(self, '_original_author') and author_username == self._original_author:
                # Check if this is actually a reply to someone
                is_reply_to_other = await self._check_is_reply(element)
                if not is_reply_to_other:
                    return None
            
            # Reply text
            text = ""
            try:
                text_element = element.locator(Selectors.TWEET_TEXT)
                if await text_element.count() > 0:
                    text = await text_element.inner_text()
            except Exception:
                pass
            
            # Timestamp
            timestamp = None
            timestamp_str = ""
            try:
                time_element = element.locator('time')
                if await time_element.count() > 0:
                    datetime_str = await time_element.get_attribute("datetime")
                    timestamp_str = await time_element.inner_text()
                    if datetime_str:
                        timestamp = datetime.fromisoformat(datetime_str.replace("Z", "+00:00"))
            except Exception:
                pass
            
            # Engagement counts
            likes = await self._extract_count(element, '[data-testid="like"] span')
            retweets = await self._extract_count(element, '[data-testid="retweet"] span')
            replies = await self._extract_count(element, '[data-testid="reply"] span')
            
            # Check who this is replying to
            reply_to_user = ""
            try:
                reply_context = element.locator('a[href^="/"]:has-text("@")')
                if await reply_context.count() > 0:
                    href = await reply_context.first.get_attribute("href")
                    if href:
                        reply_to_user = href.strip("/")
            except Exception:
                pass
            
            # Author object
            author = {
                "id": "",
                "username": author_username,
                "display_name": author_display_name,
                "is_verified": is_verified,
                "is_blue_verified": is_verified,
            }
            
            return {
                "id": tweet_id,
                "author": author,
                "user": author_display_name,  # For backwards compatibility
                "handle": f"@{author_username}",  # For backwards compatibility
                "text": text,
                "timestamp": timestamp.isoformat() if timestamp else None,
                "timestamp_str": timestamp_str,
                "likes": likes,
                "retweets": retweets,
                "replies": replies,
                "is_verified": is_verified,
                "is_reply": True,
                "reply_to_id": self._parent_tweet_id,
                "reply_to_user": reply_to_user,
                "parent_tweet_id": self._parent_tweet_id,
                "parent_author": getattr(self, '_original_author', ''),
            }
            
        except Exception as e:
            logger.debug(f"Error extracting reply: {e}")
            return None
    
    async def _check_is_reply(self, element: Any) -> bool:
        """Check if the tweet is a reply to someone."""
        try:
            reply_indicator = element.locator('text="Replying to"')
            return await reply_indicator.count() > 0
        except Exception:
            return False
    
    async def _get_original_author(self) -> str:
        """Get the username of the original tweet author."""
        try:
            # The first tweet on the page is the original
            first_tweet = self.browser.page.locator(Selectors.TWEET).first
            user_link = first_tweet.locator(f'{Selectors.TWEET_AUTHOR} a[href^="/"]').first
            
            if await user_link.count() > 0:
                href = await user_link.get_attribute("href")
                if href:
                    return href.strip("/").split("/")[0]
        except Exception as e:
            logger.debug(f"Could not get original author: {e}")
        return ""
    
    async def _check_tweet_errors(self) -> str | None:
        """Check for tweet-specific error states."""
        error_texts = [
            ("This Tweet was deleted", "Tweet was deleted"),
            ("This Tweet is from an account that no longer exists", "Account no longer exists"),
            ("You're unable to view this Tweet", "Tweet not viewable"),
            ("This Tweet is unavailable", "Tweet unavailable"),
            ("Age-restricted adult content", "Age-restricted content"),
        ]
        
        for selector_text, error_msg in error_texts:
            try:
                element = self.browser.page.locator(f'text="{selector_text}"')
                if await element.count() > 0:
                    return error_msg
            except Exception:
                continue
        
        return None
    
    def to_csv_rows(self) -> list[dict[str, Any]]:
        """
        Convert results to CSV-compatible rows.
        
        Compatible with the original twitter_reply.py output format.
        
        Returns:
            List of dicts suitable for CSV export.
        """
        rows = []
        for reply in self.results:
            if hasattr(reply, 'to_flat_dict'):
                row = reply.to_flat_dict()
            else:
                row = {
                    "user": reply.get("user", ""),
                    "handle": reply.get("handle", ""),
                    "text": reply.get("text", "").replace("\n", " "),
                    "timestamp": reply.get("timestamp", ""),
                    "likes": reply.get("likes", 0),
                    "retweets": reply.get("retweets", 0),
                    "replies": reply.get("replies", 0),
                    "is_verified": reply.get("is_verified", False),
                }
            rows.append(row)
        return rows


# Convenience function matching original API
async def get_tweet_replies(
    browser_or_url: Any,
    tweet_url: str | None = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """
    Convenience function to get tweet replies.
    
    This provides a simpler API similar to the original twitter_reply.py.
    
    Args:
        browser_or_url: BrowserManager instance or tweet URL (if URL, creates browser).
        tweet_url: Tweet URL (if browser_or_url is BrowserManager).
        limit: Maximum replies to collect.
        
    Returns:
        List of reply dicts.
        
    Example:
        >>> # With browser
        >>> replies = await get_tweet_replies(browser, tweet_url, limit=50)
        >>> 
        >>> # Or just URL (creates browser automatically)
        >>> replies = await get_tweet_replies("https://x.com/user/status/123")
    """
    from xeepy.core.browser import BrowserManager
    
    if isinstance(browser_or_url, str):
        # URL provided, create browser
        tweet_url = browser_or_url
        async with BrowserManager() as browser:
            scraper = RepliesScraper(browser)
            result = await scraper.scrape(tweet_url, limit=limit)
            return scraper.to_csv_rows()
    else:
        # Browser provided
        browser = browser_or_url
        if tweet_url is None:
            raise ValueError("tweet_url is required when browser is provided")
        
        scraper = RepliesScraper(browser)
        result = await scraper.scrape(tweet_url, limit=limit)
        return scraper.to_csv_rows()

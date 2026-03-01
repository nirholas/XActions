"""
Thread scraper for Twitter/X threads.

Scrapes complete threads (series of connected tweets by the same author).
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable

from loguru import logger

from xeepy.core.selectors import Selectors
from xeepy.core.utils import extract_tweet_id
from xeepy.models.tweet import Tweet, Thread
from xeepy.scrapers.base import BaseScraper, ScrapeResult


class ThreadScraper(BaseScraper):
    """
    Scraper for X/Twitter threads.
    
    A thread is a series of connected tweets by the same author.
    This scraper navigates to a tweet and collects all tweets
    in the thread by the original author.
    
    Example:
        >>> async with BrowserManager() as browser:
        ...     scraper = ThreadScraper(browser)
        ...     result = await scraper.scrape(
        ...         "https://x.com/user/status/1234567890"
        ...     )
        ...     thread = result.items[0]
        ...     print(f"Thread has {thread.length} tweets")
        ...     print(thread.full_text)
    """
    
    async def scrape(
        self,
        target: str,
        limit: int = 50,
        on_progress: Callable[[int, int], None] | None = None,
        **kwargs,
    ) -> ScrapeResult[Thread]:
        """
        Scrape a complete thread starting from any tweet in it.
        
        Args:
            target: Tweet URL or ID (any tweet in the thread).
            limit: Maximum tweets to collect in the thread.
            on_progress: Progress callback.
            **kwargs: Additional options.
            
        Returns:
            ScrapeResult containing a Thread object.
        """
        result = ScrapeResult[Thread](target=target)
        self.reset()
        
        # Extract tweet ID
        if target.startswith("http"):
            tweet_id = extract_tweet_id(target)
            if not tweet_id:
                result.error = f"Could not extract tweet ID from URL: {target}"
                return result
            tweet_url = target
        else:
            tweet_id = target
            tweet_url = f"https://x.com/i/status/{tweet_id}"
        
        try:
            logger.info(f"Scraping thread from tweet {tweet_id}")
            
            # Navigate to tweet
            await self.browser.navigate(tweet_url)
            
            # Wait for content
            loaded = await self._wait_for_content(Selectors.TWEET, timeout=15000)
            if not loaded:
                error = await self._check_for_error_states()
                result.error = error or "Tweet failed to load"
                return result
            
            # Get the original author
            author_username = await self._get_author()
            if not author_username:
                result.error = "Could not identify thread author"
                return result
            
            self._thread_author = author_username
            
            # Collect thread tweets
            await self.browser.page.wait_for_timeout(1500)
            
            items = await self._scroll_and_collect(
                selector=Selectors.TWEET,
                extractor=self._extract_item,
                limit=limit,
                id_key="id",
                on_progress=on_progress,
            )
            
            # Convert to Tweet objects and sort by timestamp
            tweets = [Tweet.from_dict(item) for item in items]
            tweets.sort(key=lambda t: t.timestamp or datetime.min)
            
            # Create Thread object
            thread = Thread(
                id=tweets[0].id if tweets else tweet_id,
                author=tweets[0].author if tweets else None,
                tweets=tweets,
                created_at=tweets[0].timestamp if tweets else None,
            )
            
            result.items = [thread]
            result.total_found = len(tweets)
            self.results = tweets
            
            logger.info(f"Collected thread with {len(tweets)} tweets")
            
        except Exception as e:
            logger.error(f"Thread scraping error: {e}")
            result.error = str(e)
        finally:
            result.completed_at = datetime.now()
        
        return result
    
    async def _extract_item(self, element: Any) -> dict[str, Any] | None:
        """Extract tweet data, filtering for thread author only."""
        try:
            # Get tweet ID
            tweet_id = ""
            try:
                link = element.locator('a[href*="/status/"]').first
                if await link.count() > 0:
                    href = await link.get_attribute("href")
                    if href:
                        tweet_id = extract_tweet_id(href) or ""
            except Exception:
                pass
            
            if not tweet_id:
                return None
            
            # Get author
            author_username = ""
            author_display_name = ""
            try:
                user_link = element.locator(f'{Selectors.TWEET_AUTHOR} a[href^="/"]').first
                if await user_link.count() > 0:
                    href = await user_link.get_attribute("href")
                    if href:
                        author_username = href.strip("/").split("/")[0]
                
                name_span = element.locator(f'{Selectors.TWEET_AUTHOR} span').first
                if await name_span.count() > 0:
                    author_display_name = await name_span.inner_text()
            except Exception:
                pass
            
            # Only include tweets by the thread author
            if author_username.lower() != self._thread_author.lower():
                return None
            
            # Tweet text
            text = ""
            try:
                text_element = element.locator(Selectors.TWEET_TEXT)
                if await text_element.count() > 0:
                    text = await text_element.inner_text()
            except Exception:
                pass
            
            # Timestamp
            timestamp = None
            try:
                time_element = element.locator('time')
                if await time_element.count() > 0:
                    datetime_str = await time_element.get_attribute("datetime")
                    if datetime_str:
                        timestamp = datetime.fromisoformat(datetime_str.replace("Z", "+00:00"))
            except Exception:
                pass
            
            # Engagement
            likes = await self._extract_count(element, '[data-testid="like"] span')
            retweets = await self._extract_count(element, '[data-testid="retweet"] span')
            replies = await self._extract_count(element, '[data-testid="reply"] span')
            
            return {
                "id": tweet_id,
                "author": {
                    "username": author_username,
                    "display_name": author_display_name,
                },
                "text": text,
                "timestamp": timestamp.isoformat() if timestamp else None,
                "likes": likes,
                "retweets": retweets,
                "replies": replies,
                "is_thread": True,
            }
            
        except Exception as e:
            logger.debug(f"Error extracting thread tweet: {e}")
            return None
    
    async def _get_author(self) -> str:
        """Get the thread author's username."""
        try:
            first_tweet = self.browser.page.locator(Selectors.TWEET).first
            user_link = first_tweet.locator(f'{Selectors.TWEET_AUTHOR} a[href^="/"]').first
            
            if await user_link.count() > 0:
                href = await user_link.get_attribute("href")
                if href:
                    return href.strip("/").split("/")[0]
        except Exception as e:
            logger.debug(f"Could not get thread author: {e}")
        return ""

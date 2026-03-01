"""
Likes scraper for Twitter/X.

Scrapes tweets that a user has liked.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable

from loguru import logger

from xeepy.core.selectors import Selectors
from xeepy.core.utils import extract_username, extract_tweet_id
from xeepy.models.tweet import Tweet
from xeepy.scrapers.base import BaseScraper, ScrapeResult


class LikesScraper(BaseScraper):
    """
    Scraper for X/Twitter liked tweets.
    
    Scrapes tweets that a user has liked from their Likes tab.
    Note: Likes may be private/hidden on some accounts.
    
    Example:
        >>> async with BrowserManager() as browser:
        ...     scraper = LikesScraper(browser)
        ...     result = await scraper.scrape("elonmusk", limit=50)
        ...     for tweet in result.items:
        ...         print(f"Liked: {tweet.text[:50]}...")
    """
    
    async def scrape(
        self,
        target: str,
        limit: int = 100,
        on_progress: Callable[[int, int], None] | None = None,
        **kwargs,
    ) -> ScrapeResult[Tweet]:
        """
        Scrape tweets liked by a user.
        
        Args:
            target: Username or profile URL.
            limit: Maximum liked tweets to collect.
            on_progress: Progress callback.
            **kwargs: Additional options.
            
        Returns:
            ScrapeResult containing Tweet objects.
        """
        result = ScrapeResult[Tweet](target=target)
        self.reset()
        
        # Normalize target
        if target.startswith("http"):
            username = extract_username(target)
            if not username:
                result.error = f"Could not extract username from URL: {target}"
                return result
        else:
            username = target.lstrip("@")
        
        likes_url = f"https://x.com/{username}/likes"
        
        try:
            logger.info(f"Scraping likes from @{username} (limit: {limit})")
            
            await self.browser.navigate(likes_url)
            
            loaded = await self._wait_for_content(Selectors.TWEET, timeout=15000)
            if not loaded:
                error = await self._check_for_error_states()
                if error:
                    result.error = error
                    return result
                
                # Check for hidden/empty likes
                hidden = await self._check_hidden_likes()
                if hidden:
                    result.error = "Likes are hidden or empty"
                    return result
                
                result.error = "Likes tab failed to load"
                return result
            
            items = await self._scroll_and_collect(
                selector=Selectors.TWEET,
                extractor=self._extract_item,
                limit=limit,
                id_key="id",
                on_progress=on_progress,
            )
            
            tweets = [Tweet.from_dict(item) for item in items]
            
            result.items = tweets
            result.total_found = len(tweets)
            self.results = tweets
            
            logger.info(f"Collected {len(tweets)} liked tweets")
            
        except Exception as e:
            logger.error(f"Likes scraping error: {e}")
            result.error = str(e)
        finally:
            result.completed_at = datetime.now()
        
        return result
    
    async def _extract_item(self, element: Any) -> dict[str, Any] | None:
        """Extract liked tweet data."""
        try:
            # Tweet ID
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
            
            # Author
            author_username = ""
            author_display_name = ""
            try:
                user_name = element.locator(Selectors.TWEET_AUTHOR)
                if await user_name.count() > 0:
                    user_link = user_name.locator('a[href^="/"]').first
                    if await user_link.count() > 0:
                        href = await user_link.get_attribute("href")
                        if href:
                            author_username = href.strip("/").split("/")[0]
                    
                    name_span = user_name.locator('span').first
                    if await name_span.count() > 0:
                        author_display_name = await name_span.inner_text()
            except Exception:
                pass
            
            # Text
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
            }
            
        except Exception as e:
            logger.debug(f"Error extracting liked tweet: {e}")
            return None
    
    async def _check_hidden_likes(self) -> bool:
        """Check if likes are hidden or empty."""
        try:
            indicators = [
                'text="Likes are private"',
                'text="has hidden their likes"',
                'text="hasn\'t liked any"',
                Selectors.EMPTY_STATE,
            ]
            for indicator in indicators:
                element = self.browser.page.locator(indicator)
                if await element.count() > 0:
                    return True
        except Exception:
            pass
        return False

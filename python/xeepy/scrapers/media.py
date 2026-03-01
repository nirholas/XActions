"""
Media scraper for Twitter/X.

Scrapes media (images, videos, GIFs) from a user's profile.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable

from loguru import logger

from xeepy.core.selectors import Selectors
from xeepy.core.utils import extract_username, extract_tweet_id
from xeepy.models.tweet import Tweet
from xeepy.scrapers.base import BaseScraper, ScrapeResult


class MediaScraper(BaseScraper):
    """
    Scraper for X/Twitter user media.
    
    Scrapes media posts from a user's Media tab.
    
    Example:
        >>> async with BrowserManager() as browser:
        ...     scraper = MediaScraper(browser)
        ...     result = await scraper.scrape("elonmusk", limit=50)
        ...     for tweet in result.items:
        ...         for url in tweet.media:
        ...             print(f"Media: {url}")
    """
    
    async def scrape(
        self,
        target: str,
        limit: int = 100,
        on_progress: Callable[[int, int], None] | None = None,
        **kwargs,
    ) -> ScrapeResult[Tweet]:
        """
        Scrape media posts from a user's profile.
        
        Args:
            target: Username or profile URL.
            limit: Maximum media posts to collect.
            on_progress: Progress callback.
            **kwargs: Additional options.
            
        Returns:
            ScrapeResult containing Tweet objects with media.
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
        
        media_url = f"https://x.com/{username}/media"
        
        try:
            logger.info(f"Scraping media from @{username} (limit: {limit})")
            
            await self.browser.navigate(media_url)
            
            # Wait for media grid or tweets
            loaded = await self._wait_for_content(Selectors.TWEET, timeout=15000)
            if not loaded:
                error = await self._check_for_error_states()
                if error:
                    result.error = error
                    return result
                
                empty = await self._check_empty_media()
                if empty:
                    result.items = []
                    result.total_found = 0
                    result.completed_at = datetime.now()
                    return result
                
                result.error = "Media tab failed to load"
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
            
            logger.info(f"Collected {len(tweets)} media posts")
            
        except Exception as e:
            logger.error(f"Media scraping error: {e}")
            result.error = str(e)
        finally:
            result.completed_at = datetime.now()
        
        return result
    
    async def _extract_item(self, element: Any) -> dict[str, Any] | None:
        """Extract tweet with media data."""
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
            
            # Media URLs
            media = []
            media_types = []
            try:
                # Images
                images = element.locator('[data-testid="tweetPhoto"] img')
                for i in range(await images.count()):
                    img = images.nth(i)
                    src = await img.get_attribute("src")
                    if src and "profile_images" not in src:
                        media.append(src)
                        media_types.append("image")
                
                # Videos
                videos = element.locator('[data-testid="videoPlayer"]')
                if await videos.count() > 0:
                    media_types.append("video")
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
                "media": media,
                "media_types": media_types,
            }
            
        except Exception as e:
            logger.debug(f"Error extracting media tweet: {e}")
            return None
    
    async def _check_empty_media(self) -> bool:
        """Check if media tab is empty."""
        try:
            indicators = [
                'text="hasn\'t posted media"',
                Selectors.EMPTY_STATE,
            ]
            for indicator in indicators:
                element = self.browser.page.locator(indicator)
                if await element.count() > 0:
                    return True
        except Exception:
            pass
        return False
    
    async def get_media_urls(
        self,
        target: str,
        limit: int = 100,
    ) -> list[str]:
        """
        Get just the media URLs from a user's profile.
        
        Args:
            target: Username to scrape.
            limit: Maximum posts to scan.
            
        Returns:
            List of media URLs.
        """
        result = await self.scrape(target, limit)
        urls = []
        for tweet in result.items:
            urls.extend(tweet.media)
        return urls

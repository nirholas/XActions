"""
Search scraper for Twitter/X.

Scrapes search results for tweets, users, etc.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable, Literal

from loguru import logger

from xeepy.core.selectors import Selectors
from xeepy.core.utils import extract_tweet_id
from xeepy.models.tweet import Tweet
from xeepy.models.user import User
from xeepy.scrapers.base import BaseScraper, ScrapeResult


SearchType = Literal["top", "latest", "people", "media"]


class SearchScraper(BaseScraper):
    """
    Scraper for X/Twitter search results.
    
    Supports searching for tweets (top/latest), people, and media.
    
    Example:
        >>> async with BrowserManager() as browser:
        ...     scraper = SearchScraper(browser)
        ...     
        ...     # Search tweets
        ...     result = await scraper.scrape("python programming", limit=50)
        ...     
        ...     # Search for people
        ...     result = await scraper.search_people("python developer", limit=20)
        ...     
        ...     # Search latest tweets
        ...     result = await scraper.search_latest("breaking news", limit=100)
    """
    
    async def scrape(
        self,
        target: str,
        limit: int = 100,
        on_progress: Callable[[int, int], None] | None = None,
        search_type: SearchType = "top",
        **kwargs,
    ) -> ScrapeResult[Tweet]:
        """
        Search for tweets matching a query.
        
        Args:
            target: Search query.
            limit: Maximum results to collect.
            on_progress: Progress callback.
            search_type: Type of search ("top", "latest", "people", "media").
            **kwargs: Additional options.
            
        Returns:
            ScrapeResult containing Tweet or User objects.
        """
        if search_type == "people":
            return await self.search_people(target, limit, on_progress)
        
        result = ScrapeResult[Tweet](target=target)
        self.reset()
        
        # Build search URL
        query = target.replace(" ", "%20")
        if search_type == "latest":
            url = f"https://x.com/search?q={query}&src=typed_query&f=live"
        elif search_type == "media":
            url = f"https://x.com/search?q={query}&src=typed_query&f=media"
        else:  # top
            url = f"https://x.com/search?q={query}&src=typed_query"
        
        try:
            logger.info(f"Searching: '{target}' (type: {search_type}, limit: {limit})")
            
            await self.browser.navigate(url)
            
            loaded = await self._wait_for_content(Selectors.TWEET, timeout=15000)
            if not loaded:
                error = await self._check_for_error_states()
                if error:
                    result.error = error
                    return result
                
                no_results = await self._check_no_results()
                if no_results:
                    result.items = []
                    result.total_found = 0
                    result.completed_at = datetime.now()
                    return result
                
                result.error = "Search failed to load"
                return result
            
            items = await self._scroll_and_collect(
                selector=Selectors.TWEET,
                extractor=self._extract_tweet,
                limit=limit,
                id_key="id",
                on_progress=on_progress,
            )
            
            tweets = [Tweet.from_dict(item) for item in items]
            
            result.items = tweets
            result.total_found = len(tweets)
            result.metadata["query"] = target
            result.metadata["search_type"] = search_type
            self.results = tweets
            
            logger.info(f"Found {len(tweets)} results for '{target}'")
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            result.error = str(e)
        finally:
            result.completed_at = datetime.now()
        
        return result
    
    async def _extract_item(self, element: Any) -> dict[str, Any] | None:
        """Delegate to appropriate extractor."""
        return await self._extract_tweet(element)
    
    async def _extract_tweet(self, element: Any) -> dict[str, Any] | None:
        """Extract tweet from search result."""
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
            logger.debug(f"Error extracting search result: {e}")
            return None
    
    async def search_people(
        self,
        query: str,
        limit: int = 50,
        on_progress: Callable[[int, int], None] | None = None,
    ) -> ScrapeResult[User]:
        """
        Search for users matching a query.
        
        Args:
            query: Search query.
            limit: Maximum users to collect.
            on_progress: Progress callback.
            
        Returns:
            ScrapeResult containing User objects.
        """
        result = ScrapeResult[User](target=query)
        self.reset()
        
        encoded_query = query.replace(" ", "%20")
        url = f"https://x.com/search?q={encoded_query}&src=typed_query&f=user"
        
        try:
            logger.info(f"Searching people: '{query}' (limit: {limit})")
            
            await self.browser.navigate(url)
            
            loaded = await self._wait_for_content(Selectors.USER_CELL, timeout=15000)
            if not loaded:
                no_results = await self._check_no_results()
                if no_results:
                    result.items = []
                    result.total_found = 0
                    result.completed_at = datetime.now()
                    return result
                
                result.error = "People search failed to load"
                return result
            
            items = await self._scroll_and_collect(
                selector=Selectors.USER_CELL,
                extractor=self._extract_user,
                limit=limit,
                id_key="username",
                on_progress=on_progress,
            )
            
            users = [User.from_dict(item) for item in items]
            
            result.items = users
            result.total_found = len(users)
            result.metadata["query"] = query
            self.results = users
            
            logger.info(f"Found {len(users)} users for '{query}'")
            
        except Exception as e:
            logger.error(f"People search error: {e}")
            result.error = str(e)
        finally:
            result.completed_at = datetime.now()
        
        return result
    
    async def _extract_user(self, element: Any) -> dict[str, Any] | None:
        """Extract user from search result."""
        try:
            # Username
            username = ""
            try:
                user_links = element.locator('a[href^="/"]')
                for i in range(await user_links.count()):
                    link = user_links.nth(i)
                    href = await link.get_attribute("href")
                    if href and not any(x in href for x in ["/search", "/explore"]):
                        username = href.strip("/")
                        break
            except Exception:
                pass
            
            if not username:
                return None
            
            # Display name
            display_name = ""
            try:
                name_element = element.locator('[dir="ltr"] span').first
                if await name_element.count() > 0:
                    display_name = await name_element.inner_text()
            except Exception:
                pass
            
            # Bio
            bio = ""
            try:
                bio_element = element.locator('[data-testid="UserDescription"]')
                if await bio_element.count() > 0:
                    bio = await bio_element.inner_text()
            except Exception:
                pass
            
            # Verification
            is_blue_verified = False
            try:
                verified = element.locator('svg[data-testid="icon-verified"]')
                if await verified.count() > 0:
                    is_blue_verified = True
            except Exception:
                pass
            
            return {
                "id": "",
                "username": username,
                "display_name": display_name,
                "bio": bio,
                "is_verified": False,
                "is_blue_verified": is_blue_verified,
            }
            
        except Exception as e:
            logger.debug(f"Error extracting user from search: {e}")
            return None
    
    async def _check_no_results(self) -> bool:
        """Check if search has no results."""
        try:
            indicators = [
                'text="No results for"',
                Selectors.EMPTY_STATE,
            ]
            for indicator in indicators:
                element = self.browser.page.locator(indicator)
                if await element.count() > 0:
                    return True
        except Exception:
            pass
        return False
    
    async def search_latest(
        self,
        query: str,
        limit: int = 100,
        on_progress: Callable[[int, int], None] | None = None,
    ) -> ScrapeResult[Tweet]:
        """Convenience method for searching latest tweets."""
        return await self.scrape(query, limit, on_progress, search_type="latest")
    
    async def search_top(
        self,
        query: str,
        limit: int = 100,
        on_progress: Callable[[int, int], None] | None = None,
    ) -> ScrapeResult[Tweet]:
        """Convenience method for searching top tweets."""
        return await self.scrape(query, limit, on_progress, search_type="top")

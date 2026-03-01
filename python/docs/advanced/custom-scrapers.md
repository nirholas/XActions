# Building Custom Scrapers

Extend XTools by creating custom scrapers that inherit from `BaseScraper`.

## BaseScraper Overview

All scrapers inherit from `BaseScraper`, which provides common functionality:

```python
from xtools.scrapers.base import BaseScraper, ScrapeResult
from xtools.models import Tweet, User

class BaseScraper:
    """Base class for all scrapers."""
    
    def __init__(self, browser_manager, rate_limiter=None):
        self.browser = browser_manager
        self.limiter = rate_limiter
    
    async def scrape(self, **kwargs) -> ScrapeResult:
        """Override this method in subclasses."""
        raise NotImplementedError
    
    async def navigate(self, url: str):
        """Navigate with rate limiting."""
        if self.limiter:
            await self.limiter.acquire("navigate")
        await self.browser.navigate(self.page, url)
    
    async def scroll_and_collect(self, selector: str, limit: int):
        """Scroll page and collect elements."""
        # Built-in infinite scroll handling
        pass
```

## Creating a Custom Scraper

```python
from xtools.scrapers.base import BaseScraper, ScrapeResult
from xtools.models import Tweet
from dataclasses import dataclass
from typing import List

@dataclass
class BookmarkResult(ScrapeResult):
    """Result from bookmarks scraper."""
    bookmarks: List[Tweet]
    cursor: str = None

class BookmarksScraper(BaseScraper):
    """Scrape user's bookmarked tweets."""
    
    async def scrape(
        self,
        limit: int = 100,
        cursor: str = None
    ) -> BookmarkResult:
        """
        Scrape bookmarked tweets.
        
        Args:
            limit: Maximum bookmarks to retrieve
            cursor: Pagination cursor for continuation
        
        Returns:
            BookmarkResult with list of bookmarked tweets
        """
        page = await self.browser.new_page()
        
        try:
            await self.navigate("https://x.com/i/bookmarks")
            await self._wait_for_content(page)
            
            bookmarks = []
            last_cursor = cursor
            
            while len(bookmarks) < limit:
                # Extract tweets from current view
                new_tweets = await self._extract_tweets(page)
                bookmarks.extend(new_tweets)
                
                # Scroll for more content
                last_cursor = await self._scroll_and_wait(page)
                if not last_cursor:
                    break  # No more content
            
            return BookmarkResult(
                bookmarks=bookmarks[:limit],
                cursor=last_cursor
            )
        finally:
            await self.browser.close_page(page)
    
    async def _extract_tweets(self, page) -> List[Tweet]:
        """Extract tweet data from page."""
        tweets = []
        elements = await page.query_selector_all('[data-testid="tweet"]')
        
        for el in elements:
            tweet = await self._parse_tweet_element(el)
            if tweet:
                tweets.append(tweet)
        
        return tweets
    
    async def _parse_tweet_element(self, element) -> Tweet:
        """Parse a tweet DOM element into Tweet model."""
        text = await element.query_selector('[data-testid="tweetText"]')
        user = await element.query_selector('[data-testid="User-Name"]')
        
        return Tweet(
            text=await text.inner_text() if text else "",
            author=await self._extract_username(user)
        )
```

!!! tip "Error Handling"
    Always wrap page operations in try/finally to ensure pages are closed.

## Registering Custom Scrapers

```python
from xtools import XTools

async def use_custom_scraper():
    """Register and use custom scraper."""
    async with XTools() as x:
        # Register scraper
        x.scrape.register("bookmarks", BookmarksScraper)
        
        # Use like built-in scrapers
        result = await x.scrape.bookmarks(limit=50)
        
        for tweet in result.bookmarks:
            print(f"Bookmarked: {tweet.text[:50]}")
```

## GraphQL-Based Scraper

For higher rate limits, build scrapers using the GraphQL API:

```python
from xtools.scrapers.base import BaseScraper, ScrapeResult
from xtools.api.graphql import GraphQLClient

class GraphQLScraper(BaseScraper):
    """Base class for GraphQL-based scrapers."""
    
    def __init__(self, browser_manager, cookies: dict):
        super().__init__(browser_manager)
        self.gql = GraphQLClient(cookies=cookies)
    
    async def close(self):
        await self.gql.close()

class UserLikesScraper(GraphQLScraper):
    """Scrape tweets liked by a user via GraphQL."""
    
    QUERY_ID = "eSSNbhECHHWWALkkQq-YTA"
    
    async def scrape(self, user_id: str, limit: int = 100):
        """Fetch liked tweets via GraphQL."""
        variables = {
            "userId": user_id,
            "count": min(limit, 100),
            "includePromotedContent": False
        }
        
        response = await self.gql.query(
            self.QUERY_ID,
            "Likes",
            variables
        )
        
        return self._parse_response(response)
    
    def _parse_response(self, response: dict) -> List[Tweet]:
        """Parse GraphQL response into Tweet models."""
        entries = response["data"]["user"]["result"]["timeline_v2"]["timeline"]["instructions"]
        # Parse tweet entries...
        return tweets
```

!!! warning "GraphQL Endpoints"
    X's GraphQL endpoints change frequently. Monitor for breaking changes.

## Testing Custom Scrapers

```python
import pytest
from unittest.mock import AsyncMock, MagicMock

@pytest.fixture
def mock_browser():
    browser = MagicMock()
    browser.new_page = AsyncMock()
    browser.navigate = AsyncMock()
    return browser

@pytest.mark.asyncio
async def test_bookmarks_scraper(mock_browser):
    """Test BookmarksScraper."""
    scraper = BookmarksScraper(mock_browser)
    
    # Mock page content
    mock_page = AsyncMock()
    mock_browser.new_page.return_value = mock_page
    
    result = await scraper.scrape(limit=10)
    
    assert isinstance(result, BookmarkResult)
    mock_browser.navigate.assert_called()
```

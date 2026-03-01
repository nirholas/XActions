# SearchScraper

Scrapes Twitter/X search results with advanced filtering options.

## Import

```python
from xeepy.scrapers.search import SearchScraper
```

## Class Signature

```python
class SearchScraper:
    def __init__(
        self,
        browser_manager: BrowserManager,
        rate_limiter: Optional[RateLimiter] = None
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `browser_manager` | `BrowserManager` | Required | Browser manager instance |
| `rate_limiter` | `Optional[RateLimiter]` | `None` | Rate limiter instance |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `scrape(query, limit)` | `ScrapeResult[Tweet]` | Search tweets |
| `scrape_users(query, limit)` | `ScrapeResult[User]` | Search users |
| `scrape_advanced(query)` | `ScrapeResult[Tweet]` | Advanced search |
| `scrape_latest(query)` | `ScrapeResult[Tweet]` | Latest tweets |
| `scrape_top(query)` | `ScrapeResult[Tweet]` | Top/popular tweets |

### `scrape`

```python
async def scrape(
    self,
    query: str,
    limit: int = 100,
    search_type: str = "latest",
    language: Optional[str] = None,
    cursor: Optional[str] = None
) -> ScrapeResult[Tweet]
```

Search for tweets matching a query.

**Parameters:**
- `query`: Search query (supports Twitter search operators)
- `limit`: Maximum results to fetch
- `search_type`: Result type (`latest`, `top`, `photos`, `videos`)
- `language`: Filter by language code (e.g., `en`, `es`)
- `cursor`: Pagination cursor

### `scrape_advanced`

```python
async def scrape_advanced(
    self,
    query: str,
    from_user: Optional[str] = None,
    to_user: Optional[str] = None,
    mentions: Optional[List[str]] = None,
    min_likes: Optional[int] = None,
    min_retweets: Optional[int] = None,
    min_replies: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    has_media: Optional[bool] = None,
    has_links: Optional[bool] = None,
    exclude_retweets: bool = False,
    limit: int = 100
) -> ScrapeResult[Tweet]
```

Advanced search with multiple filters.

### `scrape_users`

```python
async def scrape_users(
    self,
    query: str,
    limit: int = 50
) -> ScrapeResult[User]
```

Search for users matching a query.

## Search Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `from:` | `from:elonmusk` | Tweets from user |
| `to:` | `to:elonmusk` | Replies to user |
| `@` | `@username` | Mentions user |
| `#` | `#python` | Contains hashtag |
| `"text"` | `"exact phrase"` | Exact phrase match |
| `min_faves:` | `min_faves:100` | Minimum likes |
| `min_retweets:` | `min_retweets:50` | Minimum retweets |
| `since:` | `since:2024-01-01` | After date |
| `until:` | `until:2024-12-31` | Before date |
| `filter:media` | `filter:media` | Has media |
| `filter:links` | `filter:links` | Has links |
| `-filter:retweets` | `-filter:retweets` | Exclude retweets |
| `lang:` | `lang:en` | Language filter |

## Usage Examples

### Basic Search

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.search("python programming", limit=100)
        
        for tweet in result.items:
            print(f"@{tweet.author.username}: {tweet.text[:80]}...")
            print(f"  ❤️ {tweet.like_count}")

asyncio.run(main())
```

### Advanced Search with Filters

```python
from xeepy import Xeepy
from datetime import datetime, timedelta

async def main():
    async with Xeepy() as x:
        result = await x.scrape.search_advanced(
            query="AI",
            from_user="OpenAI",
            min_likes=1000,
            start_date=datetime.now() - timedelta(days=30),
            exclude_retweets=True,
            limit=50
        )
        
        print(f"Found {len(result.items)} tweets")

asyncio.run(main())
```

### Search Using Operators

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Complex search query
        query = (
            "#python "
            "min_faves:100 "
            "-filter:retweets "
            "lang:en"
        )
        
        result = await x.scrape.search(query, limit=200)
        
        for tweet in result.items:
            print(f"{tweet.created_at}: {tweet.text[:50]}...")

asyncio.run(main())
```

### Search Users

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.search_users("data scientist", limit=50)
        
        for user in result.items:
            print(f"@{user.username} - {user.name}")
            print(f"  {user.followers_count:,} followers")
            print(f"  Bio: {user.bio[:50] if user.bio else 'N/A'}...")

asyncio.run(main())
```

### Monitor Keywords

```python
from xeepy import Xeepy
import asyncio

async def monitor_keyword(keyword: str, interval: int = 300):
    """Monitor keyword and print new tweets."""
    seen_ids = set()
    
    async with Xeepy() as x:
        while True:
            result = await x.scrape.search(
                keyword,
                search_type="latest",
                limit=20
            )
            
            for tweet in result.items:
                if tweet.id not in seen_ids:
                    seen_ids.add(tweet.id)
                    print(f"NEW: @{tweet.author.username}: {tweet.text[:80]}")
            
            await asyncio.sleep(interval)

asyncio.run(monitor_keyword("#breaking"))
```

### Export Search Results

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.search(
            "startup funding",
            search_type="top",
            limit=500
        )
        
        # Export to multiple formats
        x.export.to_csv(result.items, "search_results.csv")
        x.export.to_json(result.items, "search_results.json")

asyncio.run(main())
```

## See Also

- [Tweet Model](../models/tweet.md) - Tweet data structure
- [HashtagScraper](hashtag.md) - Hashtag-specific scraping
- [KeywordMonitor](../monitoring/keywords.md) - Keyword monitoring

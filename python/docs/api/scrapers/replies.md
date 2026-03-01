# RepliesScraper

Scrapes replies to a specific tweet, with support for filtering and pagination.

## Import

```python
from xeepy.scrapers.replies import RepliesScraper
```

## Class Signature

```python
class RepliesScraper:
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
| `scrape(tweet_url, limit)` | `ScrapeResult[Tweet]` | Scrape replies to a tweet |
| `scrape_all(tweet_url)` | `ScrapeResult[Tweet]` | Scrape all available replies |
| `scrape_by_author(tweet_url, author)` | `ScrapeResult[Tweet]` | Filter replies by author |
| `scrape_verified_only(tweet_url)` | `ScrapeResult[Tweet]` | Get only verified user replies |

### `scrape`

```python
async def scrape(
    self,
    tweet_url: str,
    limit: int = 100,
    include_author_replies: bool = True,
    sort_by: str = "relevance"
) -> ScrapeResult[Tweet]
```

Scrape replies to a specific tweet.

**Parameters:**
- `tweet_url`: URL of the tweet to get replies for
- `limit`: Maximum number of replies to fetch
- `include_author_replies`: Include replies from the tweet author
- `sort_by`: Sort order (`relevance`, `recency`, `likes`)

**Returns:** `ScrapeResult` containing list of `Tweet` objects

### `scrape_all`

```python
async def scrape_all(
    self,
    tweet_url: str,
    include_author_replies: bool = True
) -> ScrapeResult[Tweet]
```

Scrape all available replies without limit.

### `scrape_by_author`

```python
async def scrape_by_author(
    self,
    tweet_url: str,
    author: str,
    limit: int = 100
) -> ScrapeResult[Tweet]
```

Get replies from a specific author.

### `scrape_verified_only`

```python
async def scrape_verified_only(
    self,
    tweet_url: str,
    limit: int = 100
) -> ScrapeResult[Tweet]
```

Get replies only from verified accounts.

## ScrapeResult Object

```python
@dataclass
class ScrapeResult[T]:
    items: List[T]           # List of scraped items
    total_count: int         # Total items scraped
    cursor: Optional[str]    # Pagination cursor
    has_more: bool           # More items available
    scrape_time: datetime    # When scrape completed
    errors: List[str]        # Any errors encountered
```

## Usage Examples

### Basic Reply Scraping

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Scrape up to 100 replies
        result = await x.scrape.replies(
            "https://x.com/elonmusk/status/123456789"
        )
        
        for reply in result.items:
            print(f"@{reply.author.username}: {reply.text}")
            print(f"  Likes: {reply.like_count}, Retweets: {reply.retweet_count}")

asyncio.run(main())
```

### With Filtering Options

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Get recent replies, excluding author
        result = await x.scrape.replies(
            "https://x.com/user/status/123",
            limit=500,
            include_author_replies=False,
            sort_by="recency"
        )
        
        print(f"Found {result.total_count} replies")
        
        # Export to CSV
        x.export.to_csv(result.items, "replies.csv")

asyncio.run(main())
```

### Filter by Specific Author

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Get replies from a specific user
        result = await x.scrape.replies_by_author(
            "https://x.com/user/status/123",
            author="specificuser"
        )
        
        for reply in result.items:
            print(f"{reply.created_at}: {reply.text}")

asyncio.run(main())
```

### Verified Users Only

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Only get replies from verified accounts
        result = await x.scrape.replies_verified_only(
            "https://x.com/viral_tweet/status/123"
        )
        
        for reply in result.items:
            print(f"✓ @{reply.author.username}: {reply.text}")

asyncio.run(main())
```

## See Also

- [Tweet Model](../models/tweet.md) - Tweet data structure
- [ProfileScraper](profile.md) - User profile scraping
- [TweetsScraper](tweets.md) - User tweets scraping

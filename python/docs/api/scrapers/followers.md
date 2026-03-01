# FollowersScraper

Scrapes the followers list of a Twitter/X user.

## Import

```python
from xeepy.scrapers.followers import FollowersScraper
```

## Class Signature

```python
class FollowersScraper:
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
| `scrape(username, limit)` | `ScrapeResult[User]` | Get followers list |
| `scrape_all(username)` | `ScrapeResult[User]` | Get all followers |
| `scrape_verified(username)` | `ScrapeResult[User]` | Get verified followers only |
| `count(username)` | `int` | Get follower count |

### `scrape`

```python
async def scrape(
    self,
    username: str,
    limit: int = 1000,
    cursor: Optional[str] = None
) -> ScrapeResult[User]
```

Scrape a user's followers list.

**Parameters:**
- `username`: Target username (without @)
- `limit`: Maximum followers to fetch
- `cursor`: Pagination cursor for continuing previous scrape

**Returns:** `ScrapeResult` containing `User` objects

### `scrape_all`

```python
async def scrape_all(
    self,
    username: str,
    progress_callback: Optional[Callable] = None
) -> ScrapeResult[User]
```

Scrape all followers (may take a long time for large accounts).

**Parameters:**
- `username`: Target username
- `progress_callback`: Callback function for progress updates

### `scrape_verified`

```python
async def scrape_verified(
    self,
    username: str,
    limit: int = 500
) -> ScrapeResult[User]
```

Get only verified followers.

### `count`

```python
async def count(self, username: str) -> int
```

Get the total follower count without scraping the full list.

## Usage Examples

### Basic Followers Scraping

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.followers("username", limit=1000)
        
        print(f"Scraped {len(result.items)} followers")
        
        for follower in result.items:
            print(f"@{follower.username} - {follower.followers_count} followers")
        
        # Export to CSV
        x.export.to_csv(result.items, "followers.csv")

asyncio.run(main())
```

### Scrape All Followers with Progress

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        def progress(current, total):
            print(f"Progress: {current}/{total}")
        
        result = await x.scrape.followers_all(
            "username",
            progress_callback=progress
        )
        
        print(f"Total followers: {len(result.items)}")

asyncio.run(main())
```

### Pagination Support

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        all_followers = []
        cursor = None
        
        while True:
            result = await x.scrape.followers(
                "username",
                limit=500,
                cursor=cursor
            )
            
            all_followers.extend(result.items)
            
            if not result.has_more:
                break
            
            cursor = result.cursor
            print(f"Fetched {len(all_followers)} so far...")
        
        print(f"Total: {len(all_followers)} followers")

asyncio.run(main())
```

### Find Mutual Followers

```python
from xeepy import Xeepy

async def find_mutual_followers(user1: str, user2: str):
    async with Xeepy() as x:
        followers1 = await x.scrape.followers(user1, limit=5000)
        followers2 = await x.scrape.followers(user2, limit=5000)
        
        set1 = {f.username for f in followers1.items}
        set2 = {f.username for f in followers2.items}
        
        mutual = set1.intersection(set2)
        print(f"Mutual followers: {len(mutual)}")
        
        return list(mutual)

asyncio.run(find_mutual_followers("user1", "user2"))
```

### Filter by Follower Count

```python
from xeepy import Xeepy

async def get_influential_followers(username: str, min_followers: int = 10000):
    async with Xeepy() as x:
        result = await x.scrape.followers(username, limit=2000)
        
        influential = [
            f for f in result.items
            if f.followers_count >= min_followers
        ]
        
        influential.sort(key=lambda f: f.followers_count, reverse=True)
        
        print(f"Found {len(influential)} influential followers:")
        for f in influential[:10]:
            print(f"  @{f.username}: {f.followers_count:,} followers")
        
        return influential

asyncio.run(get_influential_followers("elonmusk"))
```

## See Also

- [User Model](../models/user.md) - User data structure
- [FollowingScraper](following.md) - Get following list
- [ProfileScraper](profile.md) - Profile scraping

# LikesScraper

Scrapes users who liked a specific tweet.

## Import

```python
from xeepy.scrapers.likes import LikesScraper
```

## Class Signature

```python
class LikesScraper:
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
| `scrape(tweet_url, limit)` | `ScrapeResult[User]` | Get users who liked a tweet |
| `scrape_by_id(tweet_id, limit)` | `ScrapeResult[User]` | Using tweet ID |
| `count(tweet_url)` | `int` | Get like count |
| `scrape_verified(tweet_url)` | `ScrapeResult[User]` | Verified likers only |

### `scrape`

```python
async def scrape(
    self,
    tweet_url: str,
    limit: int = 100,
    cursor: Optional[str] = None
) -> ScrapeResult[User]
```

Scrape users who liked a specific tweet.

**Parameters:**
- `tweet_url`: URL of the tweet
- `limit`: Maximum users to fetch
- `cursor`: Pagination cursor

**Returns:** `ScrapeResult` containing `User` objects

### `scrape_by_id`

```python
async def scrape_by_id(
    self,
    tweet_id: str,
    limit: int = 100
) -> ScrapeResult[User]
```

Scrape likers using tweet ID instead of URL.

### `scrape_verified`

```python
async def scrape_verified(
    self,
    tweet_url: str,
    limit: int = 100
) -> ScrapeResult[User]
```

Get only verified users who liked the tweet.

### `count`

```python
async def count(self, tweet_url: str) -> int
```

Get the total like count without scraping users.

## Usage Examples

### Basic Likes Scraping

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.likes(
            "https://x.com/user/status/123456789",
            limit=100
        )
        
        print(f"Scraped {len(result.items)} likers")
        
        for user in result.items:
            print(f"@{user.username} - {user.followers_count:,} followers")

asyncio.run(main())
```

### Find Influential Likers

```python
from xeepy import Xeepy

async def find_influential_likers(tweet_url: str, min_followers: int = 10000):
    async with Xeepy() as x:
        result = await x.scrape.likes(tweet_url, limit=500)
        
        influential = [
            user for user in result.items
            if user.followers_count >= min_followers
        ]
        
        influential.sort(key=lambda u: u.followers_count, reverse=True)
        
        print(f"Influential likers (>{min_followers:,} followers):")
        for user in influential[:10]:
            print(f"  @{user.username}: {user.followers_count:,} followers")
        
        return influential

asyncio.run(find_influential_likers("https://x.com/user/status/123"))
```

### Verified Likers Only

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.likes_verified(
            "https://x.com/viral_tweet/status/123",
            limit=100
        )
        
        print(f"Verified users who liked this tweet:")
        for user in result.items:
            print(f"✓ @{user.username} - {user.name}")

asyncio.run(main())
```

### Export Likers List

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.likes(
            "https://x.com/user/status/123",
            limit=1000
        )
        
        # Export to CSV
        x.export.to_csv(result.items, "tweet_likers.csv")
        
        # Export just usernames
        usernames = [user.username for user in result.items]
        with open("likers_usernames.txt", "w") as f:
            f.write("\n".join(usernames))

asyncio.run(main())
```

### Compare Engagement Across Tweets

```python
from xeepy import Xeepy

async def compare_tweet_engagement(tweet_urls: list):
    async with Xeepy() as x:
        for url in tweet_urls:
            result = await x.scrape.likes(url, limit=200)
            
            total_followers = sum(u.followers_count for u in result.items)
            avg_followers = total_followers / len(result.items) if result.items else 0
            verified_count = sum(1 for u in result.items if u.is_verified)
            
            print(f"\nTweet: {url.split('/')[-1]}")
            print(f"  Likers scraped: {len(result.items)}")
            print(f"  Avg follower count: {avg_followers:,.0f}")
            print(f"  Verified likers: {verified_count}")

asyncio.run(compare_tweet_engagement([
    "https://x.com/user/status/111",
    "https://x.com/user/status/222",
    "https://x.com/user/status/333"
]))
```

### Find Common Likers

```python
from xeepy import Xeepy

async def find_common_likers(tweet_urls: list):
    """Find users who liked multiple tweets."""
    async with Xeepy() as x:
        all_likers = []
        
        for url in tweet_urls:
            result = await x.scrape.likes(url, limit=500)
            all_likers.append(set(u.username for u in result.items))
        
        # Find intersection
        common = all_likers[0]
        for likers in all_likers[1:]:
            common = common.intersection(likers)
        
        print(f"Users who liked all {len(tweet_urls)} tweets:")
        for username in list(common)[:20]:
            print(f"  @{username}")
        
        return list(common)

asyncio.run(find_common_likers([
    "https://x.com/user/status/111",
    "https://x.com/user/status/222"
]))
```

## See Also

- [User Model](../models/user.md) - User data structure
- [EngageActions](../actions/engage.md) - Like/unlike tweets
- [RepliesScraper](replies.md) - Get tweet replies

# RecommendationsScraper

Scrapes trending topics and recommended users from X/Twitter.

## Import

```python
from xeepy.scrapers.recommendations import RecommendationsScraper
```

## Class Signature

```python
class RecommendationsScraper:
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
| `trends(location)` | `ScrapeResult[Trend]` | Get trending topics |
| `recommended_users(based_on)` | `ScrapeResult[Recommendation]` | Get user recommendations |
| `explore(tab, limit)` | `ScrapeResult[Tweet]` | Explore page content |
| `for_you()` | `ScrapeResult[Tweet]` | For You timeline |
| `topics()` | `ScrapeResult[Topic]` | Get suggested topics |

### `trends`

```python
async def trends(
    self,
    location: Optional[str] = None,
    woeid: Optional[int] = None
) -> ScrapeResult[Trend]
```

Get trending topics for a location.

**Parameters:**
- `location`: Location name (e.g., "United States", "New York")
- `woeid`: Yahoo Where On Earth ID

### `recommended_users`

```python
async def recommended_users(
    self,
    based_on: Optional[List[str]] = None,
    limit: int = 20
) -> ScrapeResult[Recommendation]
```

Get recommended users to follow.

**Parameters:**
- `based_on`: Usernames to base recommendations on
- `limit`: Maximum recommendations

### `explore`

```python
async def explore(
    self,
    tab: str = "for-you",
    limit: int = 50
) -> ScrapeResult[Tweet]
```

Get content from the Explore page.

**Parameters:**
- `tab`: Explore tab (`for-you`, `trending`, `news`, `sports`, `entertainment`)
- `limit`: Maximum tweets

## Trend Object

```python
@dataclass
class Trend:
    name: str                        # Trend name/hashtag
    url: str                         # Trend URL
    tweet_count: Optional[int]       # Number of tweets
    category: Optional[str]          # Trend category
    description: Optional[str]       # Trend description
    promoted: bool                   # Is promoted content
    position: int                    # Rank position
```

## Recommendation Object

```python
@dataclass
class Recommendation:
    user: User                       # Recommended user
    reason: str                      # Why recommended
    mutual_followers: List[str]      # Mutual followers
    context: Optional[str]           # Additional context
```

## Usage Examples

### Get Trending Topics

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.trends(location="United States")
        
        print("Trending in United States:")
        for trend in result.items:
            tweet_count = f"{trend.tweet_count:,}" if trend.tweet_count else "N/A"
            print(f"  {trend.position}. {trend.name} ({tweet_count} tweets)")

asyncio.run(main())
```

### Trends by City

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        cities = ["New York", "Los Angeles", "London", "Tokyo"]
        
        for city in cities:
            result = await x.scrape.trends(location=city)
            print(f"\n{city} Top 5 Trends:")
            for trend in result.items[:5]:
                print(f"  - {trend.name}")

asyncio.run(main())
```

### Get Recommended Users

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.recommended_users(
            based_on=["elonmusk", "BillGates"],
            limit=20
        )
        
        print("Recommended users to follow:")
        for rec in result.items:
            print(f"  @{rec.user.username}")
            print(f"    Reason: {rec.reason}")
            print(f"    Followers: {rec.user.followers_count:,}")

asyncio.run(main())
```

### Explore Page Content

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # For You tab
        for_you = await x.scrape.explore(tab="for-you", limit=30)
        
        # Trending tab
        trending = await x.scrape.explore(tab="trending", limit=30)
        
        # News tab
        news = await x.scrape.explore(tab="news", limit=30)
        
        print(f"For You: {len(for_you.items)} tweets")
        print(f"Trending: {len(trending.items)} tweets")
        print(f"News: {len(news.items)} tweets")

asyncio.run(main())
```

### Track Trend Movement

```python
from xeepy import Xeepy
import asyncio
from datetime import datetime

async def track_trends(location: str, interval: int = 3600):
    """Track trend positions over time."""
    history = {}
    
    async with Xeepy() as x:
        while True:
            result = await x.scrape.trends(location=location)
            timestamp = datetime.now().isoformat()
            
            for trend in result.items:
                if trend.name not in history:
                    history[trend.name] = []
                history[trend.name].append({
                    "time": timestamp,
                    "position": trend.position,
                    "tweets": trend.tweet_count
                })
            
            # Report changes
            print(f"\n[{timestamp}] Trend Update:")
            for trend in result.items[:10]:
                prev = history[trend.name][-2] if len(history[trend.name]) > 1 else None
                change = ""
                if prev:
                    diff = prev["position"] - trend.position
                    if diff > 0:
                        change = f"↑{diff}"
                    elif diff < 0:
                        change = f"↓{abs(diff)}"
                print(f"  {trend.position}. {trend.name} {change}")
            
            await asyncio.sleep(interval)

asyncio.run(track_trends("United States"))
```

### Export Trends Data

```python
from xeepy import Xeepy
from datetime import datetime

async def main():
    async with Xeepy() as x:
        result = await x.scrape.trends(location="Worldwide")
        
        data = [
            {
                "position": t.position,
                "name": t.name,
                "tweet_count": t.tweet_count,
                "category": t.category,
                "promoted": t.promoted,
                "scraped_at": datetime.now().isoformat()
            }
            for t in result.items
        ]
        
        x.export.to_csv(data, "trends.csv")
        x.export.to_json(data, "trends.json")

asyncio.run(main())
```

### Get Suggested Topics

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.topics()
        
        print("Suggested Topics:")
        for topic in result.items:
            print(f"  - {topic.name}")
            print(f"    Category: {topic.category}")
            print(f"    Followers: {topic.follower_count:,}")

asyncio.run(main())
```

## See Also

- [Tweet Model](../models/tweet.md) - Tweet data structure
- [HashtagScraper](hashtag.md) - Hashtag scraping
- [SearchScraper](search.md) - Search functionality

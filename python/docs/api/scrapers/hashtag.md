# HashtagScraper

Scrapes tweets containing specific hashtags.

## Import

```python
from xeepy.scrapers.hashtag import HashtagScraper
```

## Class Signature

```python
class HashtagScraper:
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
| `scrape(hashtag, limit)` | `ScrapeResult[Tweet]` | Get tweets with hashtag |
| `scrape_latest(hashtag)` | `ScrapeResult[Tweet]` | Latest hashtag tweets |
| `scrape_top(hashtag)` | `ScrapeResult[Tweet]` | Top/popular tweets |
| `scrape_multiple(hashtags)` | `Dict[str, ScrapeResult]` | Multiple hashtags |
| `get_stats(hashtag)` | `HashtagStats` | Hashtag statistics |

### `scrape`

```python
async def scrape(
    self,
    hashtag: str,
    limit: int = 100,
    sort_by: str = "latest",
    language: Optional[str] = None,
    cursor: Optional[str] = None
) -> ScrapeResult[Tweet]
```

Scrape tweets containing a specific hashtag.

**Parameters:**
- `hashtag`: Hashtag to search (with or without #)
- `limit`: Maximum tweets to fetch
- `sort_by`: Sort order (`latest`, `top`)
- `language`: Filter by language code
- `cursor`: Pagination cursor

### `scrape_multiple`

```python
async def scrape_multiple(
    self,
    hashtags: List[str],
    limit_per_hashtag: int = 50
) -> Dict[str, ScrapeResult[Tweet]]
```

Scrape multiple hashtags in parallel.

### `get_stats`

```python
async def get_stats(
    self,
    hashtag: str,
    sample_size: int = 100
) -> HashtagStats
```

Get statistics about a hashtag.

## HashtagStats Object

```python
@dataclass
class HashtagStats:
    hashtag: str                     # The hashtag
    sample_size: int                 # Tweets analyzed
    avg_likes: float                 # Average likes
    avg_retweets: float              # Average retweets
    avg_replies: float               # Average replies
    top_authors: List[str]           # Most active authors
    related_hashtags: List[str]      # Co-occurring hashtags
    peak_hours: List[int]            # Most active hours (UTC)
    language_distribution: Dict      # Languages breakdown
```

## Usage Examples

### Basic Hashtag Scraping

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.hashtag("#python", limit=100)
        
        for tweet in result.items:
            print(f"@{tweet.author.username}: {tweet.text[:80]}...")
            print(f"  ❤️ {tweet.like_count} | 🔄 {tweet.retweet_count}")

asyncio.run(main())
```

### Latest vs Top Tweets

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Get latest tweets
        latest = await x.scrape.hashtag(
            "#AI",
            limit=50,
            sort_by="latest"
        )
        
        # Get top/popular tweets
        top = await x.scrape.hashtag(
            "#AI",
            limit=50,
            sort_by="top"
        )
        
        print(f"Latest avg likes: {sum(t.like_count for t in latest.items) / len(latest.items):.0f}")
        print(f"Top avg likes: {sum(t.like_count for t in top.items) / len(top.items):.0f}")

asyncio.run(main())
```

### Multiple Hashtags

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        hashtags = ["#python", "#javascript", "#rust", "#golang"]
        
        results = await x.scrape.hashtags(hashtags, limit_per_hashtag=100)
        
        for hashtag, result in results.items():
            avg_likes = sum(t.like_count for t in result.items) / len(result.items)
            print(f"{hashtag}: {len(result.items)} tweets, avg {avg_likes:.0f} likes")

asyncio.run(main())
```

### Hashtag Analytics

```python
from xeepy import Xeepy

async def analyze_hashtag(hashtag: str):
    async with Xeepy() as x:
        stats = await x.scrape.hashtag_stats(hashtag, sample_size=200)
        
        print(f"Hashtag Analysis: {stats.hashtag}")
        print("=" * 50)
        print(f"Sample size: {stats.sample_size} tweets")
        print(f"Avg likes: {stats.avg_likes:.1f}")
        print(f"Avg retweets: {stats.avg_retweets:.1f}")
        print(f"Avg replies: {stats.avg_replies:.1f}")
        print(f"\nTop authors: {', '.join(stats.top_authors[:5])}")
        print(f"Related hashtags: {', '.join(stats.related_hashtags[:5])}")
        print(f"Peak hours (UTC): {stats.peak_hours[:5]}")

asyncio.run(analyze_hashtag("#MachineLearning"))
```

### Filter by Language

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # English tweets only
        result = await x.scrape.hashtag(
            "#news",
            limit=200,
            language="en"
        )
        
        # Spanish tweets
        result_es = await x.scrape.hashtag(
            "#noticias",
            limit=200,
            language="es"
        )
        
        print(f"English tweets: {len(result.items)}")
        print(f"Spanish tweets: {len(result_es.items)}")

asyncio.run(main())
```

### Find Trending Content

```python
from xeepy import Xeepy
from datetime import datetime, timedelta

async def find_viral_hashtag_content(hashtag: str, min_likes: int = 1000):
    async with Xeepy() as x:
        result = await x.scrape.hashtag(hashtag, limit=500)
        
        viral = [
            t for t in result.items
            if t.like_count >= min_likes
        ]
        
        viral.sort(key=lambda t: t.like_count, reverse=True)
        
        print(f"Viral tweets for {hashtag} (>{min_likes} likes):")
        for tweet in viral[:10]:
            print(f"\n@{tweet.author.username} ({tweet.like_count:,} likes)")
            print(f"  {tweet.text[:100]}...")

asyncio.run(find_viral_hashtag_content("#startup", min_likes=500))
```

## See Also

- [Tweet Model](../models/tweet.md) - Tweet data structure
- [SearchScraper](search.md) - General search
- [FollowActions](../actions/follow.md) - Follow by hashtag

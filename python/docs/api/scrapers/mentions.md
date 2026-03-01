# MentionsScraper

Scrapes tweets that mention a specific user.

## Import

```python
from xeepy.scrapers.mentions import MentionsScraper
```

## Class Signature

```python
class MentionsScraper:
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
| `scrape(username, limit)` | `ScrapeResult[Tweet]` | Get mentions of user |
| `scrape_latest(username)` | `ScrapeResult[Tweet]` | Latest mentions |
| `scrape_from_verified(username)` | `ScrapeResult[Tweet]` | Verified user mentions |
| `scrape_high_engagement(username)` | `ScrapeResult[Tweet]` | High engagement mentions |

### `scrape`

```python
async def scrape(
    self,
    username: str,
    limit: int = 100,
    include_replies: bool = True,
    cursor: Optional[str] = None
) -> ScrapeResult[Tweet]
```

Scrape tweets mentioning a specific user.

**Parameters:**
- `username`: Username to search mentions for (without @)
- `limit`: Maximum mentions to fetch
- `include_replies`: Include reply tweets
- `cursor`: Pagination cursor

### `scrape_from_verified`

```python
async def scrape_from_verified(
    self,
    username: str,
    limit: int = 100
) -> ScrapeResult[Tweet]
```

Get only mentions from verified accounts.

### `scrape_high_engagement`

```python
async def scrape_high_engagement(
    self,
    username: str,
    min_likes: int = 100,
    limit: int = 100
) -> ScrapeResult[Tweet]
```

Get mentions with high engagement.

## Usage Examples

### Basic Mentions Scraping

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.mentions("username", limit=100)
        
        print(f"Found {len(result.items)} mentions")
        
        for tweet in result.items:
            print(f"@{tweet.author.username}: {tweet.text[:80]}...")
            print(f"  ❤️ {tweet.like_count}")

asyncio.run(main())
```

### Monitor Brand Mentions

```python
from xeepy import Xeepy
import asyncio

async def monitor_mentions(username: str, interval: int = 300):
    """Monitor mentions in real-time."""
    seen_ids = set()
    
    async with Xeepy() as x:
        while True:
            result = await x.scrape.mentions(username, limit=20)
            
            new_mentions = [
                t for t in result.items
                if t.id not in seen_ids
            ]
            
            for tweet in new_mentions:
                seen_ids.add(tweet.id)
                print(f"NEW MENTION by @{tweet.author.username}:")
                print(f"  {tweet.text[:100]}...")
            
            await asyncio.sleep(interval)

asyncio.run(monitor_mentions("mybrand"))
```

### Verified Mentions Only

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.mentions_from_verified(
            "username",
            limit=50
        )
        
        print("Mentions from verified accounts:")
        for tweet in result.items:
            print(f"✓ @{tweet.author.username}: {tweet.text[:60]}...")

asyncio.run(main())
```

### High Engagement Mentions

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.mentions_high_engagement(
            "username",
            min_likes=500,
            limit=100
        )
        
        result.items.sort(key=lambda t: t.like_count, reverse=True)
        
        print("Top mentions by engagement:")
        for tweet in result.items[:10]:
            print(f"@{tweet.author.username} ({tweet.like_count:,} likes)")
            print(f"  {tweet.text[:80]}...")

asyncio.run(main())
```

### Mention Analytics

```python
from xeepy import Xeepy
from collections import Counter
from datetime import datetime

async def analyze_mentions(username: str):
    async with Xeepy() as x:
        result = await x.scrape.mentions(username, limit=500)
        
        # Analyze sentiment by author
        author_counts = Counter(t.author.username for t in result.items)
        
        # Time distribution
        hours = Counter(t.created_at.hour for t in result.items)
        
        # Engagement stats
        total_likes = sum(t.like_count for t in result.items)
        total_retweets = sum(t.retweet_count for t in result.items)
        
        print(f"Mention Analytics for @{username}")
        print("=" * 40)
        print(f"Total mentions: {len(result.items)}")
        print(f"Unique mentioners: {len(author_counts)}")
        print(f"Total engagement: {total_likes + total_retweets:,}")
        print(f"\nTop mentioners:")
        for author, count in author_counts.most_common(5):
            print(f"  @{author}: {count} mentions")
        print(f"\nPeak hours (UTC): {hours.most_common(3)}")

asyncio.run(analyze_mentions("elonmusk"))
```

### Export Mentions Report

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.mentions("mybrand", limit=1000)
        
        # Prepare report data
        data = [
            {
                "date": t.created_at.isoformat(),
                "author": t.author.username,
                "author_followers": t.author.followers_count,
                "text": t.text,
                "likes": t.like_count,
                "retweets": t.retweet_count,
                "url": f"https://x.com/{t.author.username}/status/{t.id}"
            }
            for t in result.items
        ]
        
        x.export.to_csv(data, "mentions_report.csv")
        x.export.to_json(data, "mentions_report.json")

asyncio.run(main())
```

### Filter Mentions by Sentiment

```python
from xeepy import Xeepy
from xeepy.ai import SentimentAnalyzer

async def analyze_mention_sentiment(username: str):
    async with Xeepy() as x:
        result = await x.scrape.mentions(username, limit=200)
        
        analyzer = SentimentAnalyzer()
        
        positive = []
        negative = []
        neutral = []
        
        for tweet in result.items:
            sentiment = await analyzer.analyze(tweet.text)
            
            if sentiment.score > 0.3:
                positive.append(tweet)
            elif sentiment.score < -0.3:
                negative.append(tweet)
            else:
                neutral.append(tweet)
        
        print(f"Sentiment breakdown:")
        print(f"  Positive: {len(positive)} ({len(positive)/len(result.items)*100:.1f}%)")
        print(f"  Neutral: {len(neutral)} ({len(neutral)/len(result.items)*100:.1f}%)")
        print(f"  Negative: {len(negative)} ({len(negative)/len(result.items)*100:.1f}%)")

asyncio.run(analyze_mention_sentiment("mybrand"))
```

## See Also

- [Tweet Model](../models/tweet.md) - Tweet data structure
- [SearchScraper](search.md) - Advanced search
- [KeywordMonitor](../monitoring/keywords.md) - Keyword monitoring

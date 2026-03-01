# KeywordsMonitor

Monitor X/Twitter for specific keywords and phrases in real-time.

## Import

```python
from xeepy.monitoring.keywords import KeywordsMonitor
```

## Class Signature

```python
class KeywordsMonitor:
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
| `monitor(keywords, callback)` | `None` | Start keyword monitoring |
| `stop()` | `None` | Stop monitoring |
| `add_keyword(keyword)` | `None` | Add keyword to monitor |
| `remove_keyword(keyword)` | `None` | Remove keyword |
| `get_matches(keyword, limit)` | `List[Tweet]` | Get recent matches |
| `get_stats()` | `MonitorStats` | Get monitoring statistics |

### `monitor`

```python
async def monitor(
    self,
    keywords: List[str],
    callback: Callable[[Tweet], Awaitable[None]],
    interval: int = 60,
    min_likes: int = 0,
    language: Optional[str] = None
) -> None
```

Start monitoring for keywords.

**Parameters:**
- `keywords`: Keywords to monitor
- `callback`: Async function called for each match
- `interval`: Check interval in seconds
- `min_likes`: Minimum likes filter
- `language`: Language filter

### `get_matches`

```python
async def get_matches(
    self,
    keyword: str,
    limit: int = 50,
    since: Optional[datetime] = None
) -> List[Tweet]
```

Get recent tweets matching a keyword.

### `get_stats`

```python
def get_stats(self) -> MonitorStats
```

Get monitoring statistics.

## MonitorStats Object

```python
@dataclass
class MonitorStats:
    keywords: List[str]              # Active keywords
    total_matches: int               # Total matches found
    matches_per_keyword: Dict[str, int]  # Matches by keyword
    running_since: datetime          # When monitoring started
    last_check: datetime             # Last check time
```

## Usage Examples

### Basic Keyword Monitoring

```python
from xeepy import Xeepy

async def on_match(tweet):
    print(f"Match found!")
    print(f"@{tweet.author.username}: {tweet.text[:100]}...")
    print(f"Likes: {tweet.like_count}")
    print("-" * 50)

async def main():
    async with Xeepy() as x:
        await x.monitor.keywords(
            keywords=["#python", "python programming"],
            callback=on_match,
            interval=60  # Check every minute
        )

asyncio.run(main())
```

### Monitor Brand Mentions

```python
from xeepy import Xeepy

async def handle_mention(tweet):
    print(f"Brand mention detected!")
    print(f"User: @{tweet.author.username}")
    print(f"Text: {tweet.text}")
    
    # Could auto-like or respond
    # await x.engage.like(f"https://x.com/{tweet.author.username}/status/{tweet.id}")

async def main():
    async with Xeepy() as x:
        await x.monitor.keywords(
            keywords=["@mybrand", "MyBrand", "#mybrand"],
            callback=handle_mention,
            interval=120
        )

asyncio.run(main())
```

### Filter by Engagement

```python
from xeepy import Xeepy

async def on_viral_match(tweet):
    print(f"Viral tweet found!")
    print(f"Likes: {tweet.like_count:,}")
    print(f"@{tweet.author.username}: {tweet.text[:100]}...")

async def main():
    async with Xeepy() as x:
        await x.monitor.keywords(
            keywords=["trending topic", "#viral"],
            callback=on_viral_match,
            interval=300,
            min_likes=1000  # Only tweets with 1000+ likes
        )

asyncio.run(main())
```

### Monitor with Language Filter

```python
from xeepy import Xeepy

async def on_match(tweet):
    print(f"Match: {tweet.text[:80]}...")

async def main():
    async with Xeepy() as x:
        await x.monitor.keywords(
            keywords=["Python", "Django", "FastAPI"],
            callback=on_match,
            language="en"  # English only
        )

asyncio.run(main())
```

### Get Recent Matches

```python
from xeepy import Xeepy
from datetime import datetime, timedelta

async def main():
    async with Xeepy() as x:
        # Get matches from last hour
        matches = await x.monitor.get_keyword_matches(
            "#python",
            limit=100,
            since=datetime.now() - timedelta(hours=1)
        )
        
        print(f"Found {len(matches)} tweets in last hour")
        for tweet in matches[:10]:
            print(f"@{tweet.author.username}: {tweet.text[:60]}...")

asyncio.run(main())
```

### Monitor with Notifications

```python
from xeepy import Xeepy
from xeepy.notifications import DiscordWebhook

async def main():
    webhook = DiscordWebhook("https://discord.com/api/webhooks/...")
    
    async def notify(tweet):
        message = (
            f"**Keyword Match Found!**\n"
            f"User: @{tweet.author.username}\n"
            f"Text: {tweet.text[:200]}\n"
            f"Likes: {tweet.like_count}"
        )
        await webhook.send(message)
    
    async with Xeepy() as x:
        await x.monitor.keywords(
            keywords=["@mycompany", "my product name"],
            callback=notify,
            interval=300
        )

asyncio.run(main())
```

### Dynamic Keyword Management

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Start with initial keywords
        monitor = x.monitor.keyword_monitor
        
        await monitor.start(["python", "javascript"])
        
        # Add more keywords later
        monitor.add_keyword("rust")
        monitor.add_keyword("golang")
        
        # Remove a keyword
        monitor.remove_keyword("javascript")
        
        # Get stats
        stats = monitor.get_stats()
        print(f"Monitoring: {stats.keywords}")
        print(f"Total matches: {stats.total_matches}")

asyncio.run(main())
```

### Competition Monitoring

```python
from xeepy import Xeepy
import json

async def monitor_competitors(competitors: list):
    matches = {}
    
    async def track_match(tweet):
        for comp in competitors:
            if comp.lower() in tweet.text.lower():
                if comp not in matches:
                    matches[comp] = []
                matches[comp].append({
                    "text": tweet.text,
                    "author": tweet.author.username,
                    "likes": tweet.like_count,
                    "time": tweet.created_at.isoformat()
                })
    
    async with Xeepy() as x:
        # Monitor for 1 hour
        import asyncio
        
        task = asyncio.create_task(
            x.monitor.keywords(
                keywords=competitors,
                callback=track_match,
                interval=120
            )
        )
        
        await asyncio.sleep(3600)  # 1 hour
        task.cancel()
        
        # Save results
        with open("competitor_mentions.json", "w") as f:
            json.dump(matches, f, indent=2)

asyncio.run(monitor_competitors(["Competitor1", "Competitor2"]))
```

### Sentiment-Based Alerts

```python
from xeepy import Xeepy
from xeepy.ai import SentimentAnalyzer

async def main():
    analyzer = SentimentAnalyzer()
    
    async def check_sentiment(tweet):
        sentiment = await analyzer.analyze(tweet.text)
        
        if sentiment.score < -0.5:  # Negative sentiment
            print(f"⚠️ Negative mention detected!")
            print(f"@{tweet.author.username}: {tweet.text[:100]}...")
            print(f"Sentiment: {sentiment.score:.2f}")
    
    async with Xeepy() as x:
        await x.monitor.keywords(
            keywords=["@mybrand"],
            callback=check_sentiment,
            interval=300
        )

asyncio.run(main())
```

## See Also

- [SearchScraper](../scrapers/search.md) - Search functionality
- [MentionsScraper](../scrapers/mentions.md) - Mentions scraping
- [SentimentAnalyzer](../ai/sentiment.md) - Sentiment analysis

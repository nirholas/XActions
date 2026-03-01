# EngagementAnalytics

Analyze tweet engagement metrics and performance.

## Import

```python
from xeepy.analytics.engagement import EngagementAnalytics
```

## Class Signature

```python
class EngagementAnalytics:
    def __init__(
        self,
        browser_manager: BrowserManager,
        storage: Optional[Storage] = None
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `browser_manager` | `BrowserManager` | Required | Browser manager instance |
| `storage` | `Optional[Storage]` | `None` | Storage for historical data |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `analyze(username, period)` | `EngagementAnalysis` | Analyze engagement |
| `tweet_performance(tweet_ids)` | `List[TweetPerformance]` | Analyze specific tweets |
| `best_posting_times(username)` | `TimingAnalysis` | Find optimal times |
| `content_analysis(username)` | `ContentAnalysis` | Analyze content types |
| `rate(username)` | `float` | Calculate engagement rate |

### `analyze`

```python
async def analyze(
    self,
    username: Optional[str] = None,
    period: str = "30d"
) -> EngagementAnalysis
```

Comprehensive engagement analysis.

**Parameters:**
- `username`: Account to analyze
- `period`: Analysis period

### `best_posting_times`

```python
async def best_posting_times(
    self,
    username: Optional[str] = None
) -> TimingAnalysis
```

Find optimal posting times based on engagement data.

### `content_analysis`

```python
async def content_analysis(
    self,
    username: Optional[str] = None,
    limit: int = 100
) -> ContentAnalysis
```

Analyze which content types perform best.

## EngagementAnalysis Object

```python
@dataclass
class EngagementAnalysis:
    username: str                    # Account analyzed
    period: str                      # Analysis period
    total_tweets: int                # Tweets in period
    total_likes: int                 # Total likes received
    total_retweets: int              # Total retweets
    total_replies: int               # Total replies
    total_views: int                 # Total views
    engagement_rate: float           # Overall rate (%)
    avg_likes: float                 # Per tweet average
    avg_retweets: float              # Per tweet average
    avg_replies: float               # Per tweet average
    top_tweets: List[Tweet]          # Best performing
```

## TimingAnalysis Object

```python
@dataclass
class TimingAnalysis:
    best_hours: List[int]            # Best hours (UTC)
    best_days: List[str]             # Best days of week
    worst_hours: List[int]           # Worst hours
    heatmap: Dict[str, Dict[int, float]]  # Day/hour engagement
```

## ContentAnalysis Object

```python
@dataclass
class ContentAnalysis:
    by_type: Dict[str, float]        # Engagement by content type
    by_length: Dict[str, float]      # Engagement by length
    hashtag_performance: Dict[str, float]  # Hashtag effectiveness
    media_vs_text: Dict[str, float]  # Media impact
    top_topics: List[str]            # Best performing topics
```

## Usage Examples

### Basic Engagement Analysis

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        analysis = await x.analytics.engagement("username", period="30d")
        
        print(f"=== 30-Day Engagement Analysis ===")
        print(f"Tweets: {analysis.total_tweets}")
        print(f"Total likes: {analysis.total_likes:,}")
        print(f"Total retweets: {analysis.total_retweets:,}")
        print(f"Total replies: {analysis.total_replies:,}")
        print(f"Engagement rate: {analysis.engagement_rate:.2f}%")
        print(f"\nAverages per tweet:")
        print(f"  Likes: {analysis.avg_likes:.1f}")
        print(f"  Retweets: {analysis.avg_retweets:.1f}")
        print(f"  Replies: {analysis.avg_replies:.1f}")

asyncio.run(main())
```

### Find Best Posting Times

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        timing = await x.analytics.best_posting_times("username")
        
        print(f"=== Optimal Posting Times ===")
        print(f"Best hours (UTC): {timing.best_hours}")
        print(f"Best days: {timing.best_days}")
        print(f"Worst hours (UTC): {timing.worst_hours}")
        
        print(f"\nEngagement heatmap:")
        for day, hours in timing.heatmap.items():
            best_hour = max(hours, key=hours.get)
            print(f"  {day}: Best at {best_hour}:00 ({hours[best_hour]:.1f}x)")

asyncio.run(main())
```

### Content Type Analysis

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        content = await x.analytics.content_analysis("username")
        
        print(f"=== Content Performance ===")
        print(f"\nBy type:")
        for content_type, score in sorted(content.by_type.items(), key=lambda x: -x[1]):
            print(f"  {content_type}: {score:.1f}x avg engagement")
        
        print(f"\nMedia vs text:")
        for category, score in content.media_vs_text.items():
            print(f"  {category}: {score:.1f}x")
        
        print(f"\nTop topics:")
        for topic in content.top_topics[:5]:
            print(f"  - {topic}")

asyncio.run(main())
```

### Analyze Specific Tweets

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        tweet_ids = ["123456789", "987654321"]
        
        performance = await x.analytics.tweet_performance(tweet_ids)
        
        for tweet in performance:
            print(f"\nTweet ID: {tweet.id}")
            print(f"  Likes: {tweet.like_count:,}")
            print(f"  Retweets: {tweet.retweet_count:,}")
            print(f"  Replies: {tweet.reply_count:,}")
            print(f"  Views: {tweet.view_count:,}")
            print(f"  Engagement rate: {tweet.engagement_rate:.2f}%")
            print(f"  Performance: {tweet.performance_score:.1f}x average")

asyncio.run(main())
```

### Compare Hashtag Performance

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        content = await x.analytics.content_analysis("username")
        
        print(f"=== Hashtag Performance ===")
        sorted_hashtags = sorted(
            content.hashtag_performance.items(),
            key=lambda x: -x[1]
        )
        
        for hashtag, score in sorted_hashtags[:10]:
            indicator = "🔥" if score > 1.5 else "✓" if score > 1.0 else "❌"
            print(f"  {indicator} {hashtag}: {score:.2f}x avg")

asyncio.run(main())
```

### Calculate Engagement Rate

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        rate = await x.analytics.engagement_rate("username")
        
        print(f"Engagement rate: {rate:.2f}%")
        
        # Industry benchmarks
        if rate > 6:
            print("🏆 Excellent! Top 1% engagement")
        elif rate > 3:
            print("🌟 Great! Above average")
        elif rate > 1:
            print("✓ Average engagement")
        else:
            print("📈 Room for improvement")

asyncio.run(main())
```

### Export Engagement Report

```python
from xeepy import Xeepy

async def generate_engagement_report(username: str):
    async with Xeepy() as x:
        analysis = await x.analytics.engagement(username, period="30d")
        timing = await x.analytics.best_posting_times(username)
        content = await x.analytics.content_analysis(username)
        
        report = {
            "username": username,
            "metrics": {
                "engagement_rate": analysis.engagement_rate,
                "total_engagement": analysis.total_likes + analysis.total_retweets + analysis.total_replies,
                "avg_likes": analysis.avg_likes,
                "avg_retweets": analysis.avg_retweets
            },
            "timing": {
                "best_hours": timing.best_hours,
                "best_days": timing.best_days
            },
            "content": {
                "best_type": max(content.by_type, key=content.by_type.get),
                "top_topics": content.top_topics[:5]
            },
            "top_tweets": [
                {"id": t.id, "likes": t.like_count, "text": t.text[:100]}
                for t in analysis.top_tweets[:5]
            ]
        }
        
        x.export.to_json([report], f"engagement_{username}.json")

asyncio.run(generate_engagement_report("myaccount"))
```

### Engagement Trend Over Time

```python
from xeepy import Xeepy

async def engagement_trend(username: str):
    async with Xeepy() as x:
        week = await x.analytics.engagement(username, period="7d")
        month = await x.analytics.engagement(username, period="30d")
        quarter = await x.analytics.engagement(username, period="90d")
        
        print(f"=== Engagement Trend ===")
        print(f"Last 7 days:  {week.engagement_rate:.2f}%")
        print(f"Last 30 days: {month.engagement_rate:.2f}%")
        print(f"Last 90 days: {quarter.engagement_rate:.2f}%")
        
        if week.engagement_rate > month.engagement_rate:
            print("📈 Engagement is improving!")
        elif week.engagement_rate < month.engagement_rate:
            print("📉 Engagement is declining")
        else:
            print("➡️ Engagement is stable")

asyncio.run(engagement_trend("username"))
```

## See Also

- [GrowthAnalytics](growth.md) - Growth metrics
- [ContentAnalytics](content.md) - Content analysis
- [TweetsScraper](../scrapers/tweets.md) - Tweet data

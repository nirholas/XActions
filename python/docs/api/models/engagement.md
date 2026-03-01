# Engagement

Data models for engagement metrics and interactions.

## Import

```python
from xeepy.models import Engagement, EngagementMetrics, Interaction
```

## Engagement Class

```python
@dataclass
class Engagement:
    tweet_id: str
    likes: int = 0
    retweets: int = 0
    replies: int = 0
    quotes: int = 0
    views: int = 0
    bookmarks: int = 0
    timestamp: datetime = field(default_factory=datetime.now)
```

## EngagementMetrics Class

```python
@dataclass
class EngagementMetrics:
    total_engagement: int            # Sum of all interactions
    engagement_rate: float           # Engagement / followers %
    like_rate: float                 # Likes / views %
    retweet_rate: float              # Retweets / views %
    reply_rate: float                # Replies / views %
    viral_score: float               # Virality indicator
```

## Interaction Class

```python
@dataclass
class Interaction:
    type: str                        # like, retweet, reply, quote, bookmark
    user: User                       # User who interacted
    tweet_id: str                    # Tweet interacted with
    timestamp: datetime              # When interaction occurred
    content: Optional[str] = None    # Reply/quote text if applicable
```

## InteractionSummary Class

```python
@dataclass
class InteractionSummary:
    tweet_id: str
    likers: List[User]               # Users who liked
    retweeters: List[User]           # Users who retweeted
    repliers: List[User]             # Users who replied
    quoters: List[User]              # Users who quoted
```

## Properties

### Engagement

| Property | Type | Description |
|----------|------|-------------|
| `tweet_id` | `str` | Associated tweet ID |
| `likes` | `int` | Like count |
| `retweets` | `int` | Retweet count |
| `replies` | `int` | Reply count |
| `quotes` | `int` | Quote count |
| `views` | `int` | View count |
| `bookmarks` | `int` | Bookmark count |
| `timestamp` | `datetime` | Measurement time |

### Computed Properties

```python
@property
def total(self) -> int:
    """Total engagement (likes + retweets + replies + quotes)."""

@property
def engagement_rate(self) -> float:
    """Engagement rate (total / views * 100)."""
```

## Usage Examples

### Track Tweet Engagement

```python
from xeepy import Xeepy

async def track_engagement(tweet_url: str):
    async with Xeepy() as x:
        tweet = await x.scrape.tweet(tweet_url)
        
        engagement = Engagement(
            tweet_id=tweet.id,
            likes=tweet.like_count,
            retweets=tweet.retweet_count,
            replies=tweet.reply_count,
            quotes=tweet.quote_count,
            views=tweet.view_count,
            bookmarks=tweet.bookmark_count
        )
        
        print(f"=== Engagement: {tweet.id} ===")
        print(f"Likes: {engagement.likes:,}")
        print(f"Retweets: {engagement.retweets:,}")
        print(f"Replies: {engagement.replies:,}")
        print(f"Quotes: {engagement.quotes:,}")
        print(f"Views: {engagement.views:,}")
        print(f"Bookmarks: {engagement.bookmarks:,}")
        print(f"Total: {engagement.total:,}")
        print(f"Rate: {engagement.engagement_rate:.2f}%")

asyncio.run(track_engagement("https://x.com/user/status/123"))
```

### Calculate Metrics

```python
from xeepy import Xeepy
from xeepy.models import EngagementMetrics

async def calculate_metrics(username: str):
    async with Xeepy() as x:
        user = await x.scrape.profile(username)
        tweets = await x.scrape.tweets(username, limit=50)
        
        total_engagement = sum(t.total_engagement for t in tweets.items)
        total_views = sum(t.view_count for t in tweets.items)
        
        metrics = EngagementMetrics(
            total_engagement=total_engagement,
            engagement_rate=(total_engagement / user.followers_count) * 100 if user.followers_count else 0,
            like_rate=(sum(t.like_count for t in tweets.items) / total_views) * 100 if total_views else 0,
            retweet_rate=(sum(t.retweet_count for t in tweets.items) / total_views) * 100 if total_views else 0,
            reply_rate=(sum(t.reply_count for t in tweets.items) / total_views) * 100 if total_views else 0,
            viral_score=total_engagement / len(tweets.items) if tweets.items else 0
        )
        
        print(f"=== Metrics: @{username} ===")
        print(f"Total engagement: {metrics.total_engagement:,}")
        print(f"Engagement rate: {metrics.engagement_rate:.2f}%")
        print(f"Like rate: {metrics.like_rate:.2f}%")
        print(f"Retweet rate: {metrics.retweet_rate:.2f}%")
        print(f"Reply rate: {metrics.reply_rate:.2f}%")
        print(f"Viral score: {metrics.viral_score:.0f}")

asyncio.run(calculate_metrics("username"))
```

### Get Users Who Engaged

```python
from xeepy import Xeepy

async def get_engagers(tweet_url: str):
    async with Xeepy() as x:
        likers = await x.scrape.likes(tweet_url, limit=100)
        
        summary = InteractionSummary(
            tweet_id=tweet_url.split("/")[-1],
            likers=likers.items,
            retweeters=[],  # Would need separate scrape
            repliers=[],
            quoters=[]
        )
        
        print(f"=== Users who liked ===")
        for user in summary.likers[:20]:
            print(f"  @{user.username} ({user.followers_count:,} followers)")

asyncio.run(get_engagers("https://x.com/user/status/123"))
```

### Compare Engagement

```python
from xeepy import Xeepy

async def compare_tweets(tweet_urls: list):
    async with Xeepy() as x:
        tweets = []
        for url in tweet_urls:
            tweet = await x.scrape.tweet(url)
            tweets.append(tweet)
        
        print("=== Engagement Comparison ===")
        print(f"{'Tweet ID':20} {'Likes':>10} {'RT':>10} {'Replies':>10} {'Rate':>8}")
        print("-" * 60)
        
        for tweet in tweets:
            rate = tweet.engagement_rate
            print(f"{tweet.id:20} {tweet.like_count:>10,} {tweet.retweet_count:>10,} {tweet.reply_count:>10,} {rate:>7.2f}%")

asyncio.run(compare_tweets([
    "https://x.com/user/status/123",
    "https://x.com/user/status/456"
]))
```

### Track Engagement Over Time

```python
from xeepy import Xeepy
import asyncio

async def track_over_time(tweet_url: str, intervals: int = 5, delay: int = 60):
    async with Xeepy() as x:
        history = []
        
        for i in range(intervals):
            tweet = await x.scrape.tweet(tweet_url)
            
            engagement = Engagement(
                tweet_id=tweet.id,
                likes=tweet.like_count,
                retweets=tweet.retweet_count,
                replies=tweet.reply_count,
                views=tweet.view_count
            )
            history.append(engagement)
            
            print(f"[{i+1}/{intervals}] Likes: {engagement.likes:,} | RT: {engagement.retweets:,} | Views: {engagement.views:,}")
            
            if i < intervals - 1:
                await asyncio.sleep(delay)
        
        # Calculate growth
        if len(history) >= 2:
            like_growth = history[-1].likes - history[0].likes
            view_growth = history[-1].views - history[0].views
            print(f"\nGrowth: +{like_growth:,} likes, +{view_growth:,} views")

asyncio.run(track_over_time("https://x.com/user/status/123"))
```

### Export Engagement Data

```python
from xeepy import Xeepy

async def export_engagement(username: str):
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(username, limit=100)
        
        data = []
        for tweet in tweets.items:
            data.append({
                "id": tweet.id,
                "text": tweet.text[:100],
                "likes": tweet.like_count,
                "retweets": tweet.retweet_count,
                "replies": tweet.reply_count,
                "quotes": tweet.quote_count,
                "views": tweet.view_count,
                "engagement_rate": tweet.engagement_rate,
                "created_at": tweet.created_at.isoformat()
            })
        
        x.export.to_csv(data, f"engagement_{username}.csv")
        print(f"Exported engagement for {len(data)} tweets")

asyncio.run(export_engagement("username"))
```

### Find Most Engaged Followers

```python
from xeepy import Xeepy

async def most_engaged_followers(username: str):
    async with Xeepy() as x:
        # Get recent tweets
        tweets = await x.scrape.tweets(username, limit=20)
        
        engagement_count = {}
        
        for tweet in tweets.items:
            replies = await x.scrape.replies(tweet.url, limit=50)
            
            for reply in replies.items:
                author = reply.author.username
                if author not in engagement_count:
                    engagement_count[author] = 0
                engagement_count[author] += 1
        
        sorted_engagers = sorted(
            engagement_count.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        print(f"Most engaged followers of @{username}:")
        for user, count in sorted_engagers[:20]:
            print(f"  @{user}: {count} replies")

asyncio.run(most_engaged_followers("myaccount"))
```

### Engagement Benchmarks

```python
from xeepy import Xeepy

async def benchmark_engagement(username: str):
    async with Xeepy() as x:
        user = await x.scrape.profile(username)
        tweets = await x.scrape.tweets(username, limit=50)
        
        avg_likes = sum(t.like_count for t in tweets.items) / len(tweets.items)
        avg_rate = sum(t.engagement_rate for t in tweets.items) / len(tweets.items)
        
        print(f"=== Engagement Benchmarks: @{username} ===")
        print(f"Followers: {user.followers_count:,}")
        print(f"Avg likes/tweet: {avg_likes:.0f}")
        print(f"Avg engagement rate: {avg_rate:.2f}%")
        
        # Industry benchmarks
        if avg_rate > 6:
            print("\n🏆 Excellent! (Top 1%)")
        elif avg_rate > 3:
            print("\n🌟 Great! (Top 10%)")
        elif avg_rate > 1:
            print("\n✓ Good (Average)")
        else:
            print("\n📈 Room for improvement")

asyncio.run(benchmark_engagement("username"))
```

## See Also

- [Tweet](tweet.md) - Tweet data model
- [User](user.md) - User data model
- [EngagementAnalytics](../analytics/engagement.md) - Engagement analytics

# CompetitorAnalytics

Analyze and compare competitor accounts on X/Twitter.

## Import

```python
from xeepy.analytics.competitors import CompetitorAnalytics
```

## Class Signature

```python
class CompetitorAnalytics:
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
| `compare(accounts)` | `ComparisonReport` | Compare multiple accounts |
| `analyze(competitor)` | `CompetitorAnalysis` | Deep dive on competitor |
| `content_gap(you, competitor)` | `ContentGapReport` | Find content gaps |
| `best_content(competitor)` | `List[Tweet]` | Get best performing content |
| `track(competitors, callback)` | `None` | Track competitors over time |

### `compare`

```python
async def compare(
    self,
    accounts: List[str],
    metrics: List[str] = None
) -> ComparisonReport
```

Compare multiple accounts side by side.

**Parameters:**
- `accounts`: Usernames to compare
- `metrics`: Specific metrics to compare (default: all)

### `content_gap`

```python
async def content_gap(
    self,
    your_account: str,
    competitor: str
) -> ContentGapReport
```

Find content topics you're missing vs competitor.

### `best_content`

```python
async def best_content(
    self,
    competitor: str,
    limit: int = 20,
    period: str = "30d"
) -> List[Tweet]
```

Get competitor's best performing content.

## ComparisonReport Object

```python
@dataclass
class ComparisonReport:
    accounts: List[AccountMetrics]   # Metrics for each account
    rankings: Dict[str, List[str]]   # Rankings by metric
    insights: List[str]              # Key insights
    generated_at: datetime           # Report timestamp
```

## AccountMetrics Object

```python
@dataclass
class AccountMetrics:
    username: str                    # Account username
    followers: int                   # Follower count
    following: int                   # Following count
    tweets: int                      # Tweet count
    engagement_rate: float           # Engagement rate
    avg_likes: float                 # Average likes
    avg_retweets: float              # Average retweets
    posting_frequency: float         # Tweets per day
    growth_rate: float               # 30-day growth %
```

## ContentGapReport Object

```python
@dataclass
class ContentGapReport:
    missing_topics: List[str]        # Topics you don't cover
    missing_hashtags: List[str]      # Hashtags you don't use
    content_type_gaps: Dict[str, float]  # Content type differences
    timing_gaps: List[int]           # Hours you miss
    recommendations: List[str]       # Suggested actions
```

## Usage Examples

### Compare Accounts

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        report = await x.analytics.compare_competitors([
            "myaccount",
            "competitor1",
            "competitor2"
        ])
        
        print("=== Competitor Comparison ===")
        for account in report.accounts:
            print(f"\n@{account.username}:")
            print(f"  Followers: {account.followers:,}")
            print(f"  Engagement rate: {account.engagement_rate:.2f}%")
            print(f"  Avg likes: {account.avg_likes:.0f}")
            print(f"  Posts/day: {account.posting_frequency:.1f}")
            print(f"  30d growth: {account.growth_rate:+.2f}%")
        
        print(f"\n=== Rankings ===")
        for metric, ranking in report.rankings.items():
            print(f"  {metric}: {' > '.join(ranking)}")

asyncio.run(main())
```

### Deep Competitor Analysis

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        analysis = await x.analytics.analyze_competitor("competitor")
        
        print(f"=== Competitor Analysis: @{analysis.username} ===")
        print(f"\nOverview:")
        print(f"  Followers: {analysis.followers:,}")
        print(f"  Engagement rate: {analysis.engagement_rate:.2f}%")
        
        print(f"\nContent Strategy:")
        print(f"  Posts per week: {analysis.posts_per_week:.1f}")
        print(f"  Best posting times: {analysis.best_times}")
        print(f"  Top content types: {analysis.top_content_types}")
        
        print(f"\nTop hashtags:")
        for hashtag in analysis.top_hashtags[:5]:
            print(f"  - {hashtag}")
        
        print(f"\nRecent growth: {analysis.growth_30d:+.2f}%")

asyncio.run(main())
```

### Find Content Gaps

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        gaps = await x.analytics.content_gap("myaccount", "competitor")
        
        print("=== Content Gap Analysis ===")
        
        print(f"\nTopics to explore:")
        for topic in gaps.missing_topics[:10]:
            print(f"  - {topic}")
        
        print(f"\nHashtags to try:")
        for hashtag in gaps.missing_hashtags[:10]:
            print(f"  - {hashtag}")
        
        print(f"\nContent type opportunities:")
        for content_type, diff in gaps.content_type_gaps.items():
            if diff > 0:
                print(f"  - More {content_type} ({diff:+.1f}%)")
        
        print(f"\nRecommendations:")
        for rec in gaps.recommendations:
            print(f"  • {rec}")

asyncio.run(main())
```

### Get Competitor's Best Content

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        best = await x.analytics.competitor_best_content(
            "competitor",
            limit=10,
            period="30d"
        )
        
        print("=== Competitor's Top Content ===")
        for i, tweet in enumerate(best, 1):
            print(f"\n{i}. {tweet.text[:80]}...")
            print(f"   Likes: {tweet.like_count:,} | RT: {tweet.retweet_count:,}")
            print(f"   Engagement: {tweet.engagement_rate:.2f}%")

asyncio.run(main())
```

### Track Competitors Over Time

```python
from xeepy import Xeepy
import asyncio

async def track_competitors():
    async with Xeepy() as x:
        async def on_update(report):
            print(f"\n[{datetime.now()}] Competitor Update")
            for account in report.accounts:
                change = account.followers - account.previous_followers
                print(f"  @{account.username}: {account.followers:,} ({change:+,})")
        
        await x.analytics.track_competitors(
            ["competitor1", "competitor2", "competitor3"],
            callback=on_update,
            interval=3600  # Check hourly
        )

asyncio.run(track_competitors())
```

### Export Comparison Report

```python
from xeepy import Xeepy

async def export_comparison(accounts: list):
    async with Xeepy() as x:
        report = await x.analytics.compare_competitors(accounts)
        
        data = [
            {
                "username": a.username,
                "followers": a.followers,
                "engagement_rate": a.engagement_rate,
                "avg_likes": a.avg_likes,
                "posting_frequency": a.posting_frequency,
                "growth_rate": a.growth_rate
            }
            for a in report.accounts
        ]
        
        x.export.to_csv(data, "competitor_comparison.csv")
        print("Comparison exported to competitor_comparison.csv")

asyncio.run(export_comparison(["account1", "account2", "account3"]))
```

### Competitive Positioning

```python
from xeepy import Xeepy

async def competitive_position(your_account: str, competitors: list):
    async with Xeepy() as x:
        all_accounts = [your_account] + competitors
        report = await x.analytics.compare_competitors(all_accounts)
        
        # Find your position in each ranking
        print(f"=== Competitive Positioning ===")
        
        for metric, ranking in report.rankings.items():
            position = ranking.index(your_account) + 1
            total = len(ranking)
            
            if position == 1:
                status = "🥇 Leader"
            elif position == 2:
                status = "🥈 Strong"
            elif position <= total // 2:
                status = "📊 Middle"
            else:
                status = "📈 Opportunity"
            
            print(f"{metric}: #{position}/{total} {status}")

asyncio.run(competitive_position("myaccount", ["comp1", "comp2", "comp3"]))
```

### Steal Competitor Strategy

```python
from xeepy import Xeepy

async def analyze_strategy(competitor: str):
    async with Xeepy() as x:
        analysis = await x.analytics.analyze_competitor(competitor)
        best = await x.analytics.competitor_best_content(competitor, limit=50)
        
        print(f"=== Strategy Breakdown: @{competitor} ===")
        
        # Content timing
        print(f"\nPosting Schedule:")
        print(f"  Frequency: {analysis.posts_per_week:.1f} posts/week")
        print(f"  Best times: {analysis.best_times}")
        
        # Content types
        print(f"\nContent Mix:")
        for content_type, pct in analysis.content_mix.items():
            print(f"  {content_type}: {pct:.0f}%")
        
        # Engagement drivers
        print(f"\nHigh-engagement patterns:")
        for pattern in analysis.engagement_patterns[:5]:
            print(f"  - {pattern}")

asyncio.run(analyze_strategy("successful_competitor"))
```

## See Also

- [GrowthAnalytics](growth.md) - Growth analysis
- [EngagementAnalytics](engagement.md) - Engagement metrics
- [ContentAnalytics](content.md) - Content analysis

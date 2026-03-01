# ContentAnalytics

Analyze content performance and optimize content strategy.

## Import

```python
from xeepy.analytics.content import ContentAnalytics
```

## Class Signature

```python
class ContentAnalytics:
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
| `analyze(username, period)` | `ContentAnalysis` | Analyze content performance |
| `top_performing(username)` | `List[Tweet]` | Get best content |
| `topic_analysis(username)` | `TopicAnalysis` | Analyze content topics |
| `optimize(draft)` | `OptimizationReport` | Get optimization suggestions |
| `a_b_test_results(tweet_ids)` | `ABTestResults` | Analyze A/B test |

### `analyze`

```python
async def analyze(
    self,
    username: Optional[str] = None,
    period: str = "30d"
) -> ContentAnalysis
```

Comprehensive content analysis.

### `topic_analysis`

```python
async def topic_analysis(
    self,
    username: Optional[str] = None,
    limit: int = 200
) -> TopicAnalysis
```

Analyze content topics and their performance.

### `optimize`

```python
async def optimize(
    self,
    draft: str,
    context: Optional[str] = None
) -> OptimizationReport
```

Get suggestions to optimize a draft tweet.

## ContentAnalysis Object

```python
@dataclass
class ContentAnalysis:
    username: str                    # Account analyzed
    period: str                      # Analysis period
    total_posts: int                 # Posts in period
    avg_engagement: float            # Average engagement
    by_type: Dict[str, TypeMetrics]  # Performance by type
    by_length: Dict[str, float]      # Performance by length
    by_time: Dict[int, float]        # Performance by hour
    top_hashtags: List[str]          # Best performing hashtags
    top_topics: List[str]            # Best performing topics
```

## TopicAnalysis Object

```python
@dataclass
class TopicAnalysis:
    topics: List[TopicMetrics]       # Topics with metrics
    trending_topics: List[str]       # Currently trending
    declining_topics: List[str]      # Declining in performance
    opportunities: List[str]         # Underexplored topics
```

## OptimizationReport Object

```python
@dataclass
class OptimizationReport:
    original: str                    # Original draft
    suggestions: List[str]           # Improvement suggestions
    optimized_versions: List[str]    # Alternative versions
    predicted_engagement: float      # Predicted performance
    best_time_to_post: datetime      # Optimal posting time
```

## Usage Examples

### Content Performance Analysis

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        analysis = await x.analytics.content("username", period="30d")
        
        print("=== Content Analysis ===")
        print(f"Total posts: {analysis.total_posts}")
        print(f"Avg engagement: {analysis.avg_engagement:.2f}%")
        
        print(f"\nPerformance by type:")
        for content_type, metrics in analysis.by_type.items():
            print(f"  {content_type}:")
            print(f"    Posts: {metrics.count}")
            print(f"    Avg engagement: {metrics.avg_engagement:.2f}%")
        
        print(f"\nBest performing length:")
        best_length = max(analysis.by_length, key=analysis.by_length.get)
        print(f"  {best_length}: {analysis.by_length[best_length]:.2f}x avg")

asyncio.run(main())
```

### Get Top Performing Content

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        top = await x.analytics.top_content("username", limit=10)
        
        print("=== Top Performing Content ===")
        for i, tweet in enumerate(top, 1):
            print(f"\n{i}. {tweet.text[:80]}...")
            print(f"   Likes: {tweet.like_count:,} | RT: {tweet.retweet_count:,}")
            print(f"   Type: {tweet.content_type}")
            print(f"   Posted: {tweet.created_at}")

asyncio.run(main())
```

### Topic Analysis

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        topics = await x.analytics.topic_analysis("username")
        
        print("=== Topic Performance ===")
        
        print("\nTop performing topics:")
        for topic in topics.topics[:5]:
            print(f"  {topic.name}: {topic.engagement_rate:.2f}% engagement")
        
        print("\nTrending topics:")
        for topic in topics.trending_topics[:5]:
            print(f"  ↗️ {topic}")
        
        print("\nDeclining topics:")
        for topic in topics.declining_topics[:5]:
            print(f"  ↘️ {topic}")
        
        print("\nOpportunities (underexplored):")
        for topic in topics.opportunities[:5]:
            print(f"  💡 {topic}")

asyncio.run(main())
```

### Optimize Draft Tweet

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        draft = "Just shipped a new feature for our product!"
        
        report = await x.analytics.optimize_content(draft)
        
        print("=== Content Optimization ===")
        print(f"Original: {draft}")
        
        print(f"\nSuggestions:")
        for suggestion in report.suggestions:
            print(f"  • {suggestion}")
        
        print(f"\nOptimized versions:")
        for i, version in enumerate(report.optimized_versions, 1):
            print(f"  {i}. {version}")
        
        print(f"\nPredicted engagement: {report.predicted_engagement:.2f}%")
        print(f"Best time to post: {report.best_time_to_post}")

asyncio.run(main())
```

### Content Type Comparison

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        analysis = await x.analytics.content("username")
        
        print("=== Content Type Comparison ===")
        
        types_sorted = sorted(
            analysis.by_type.items(),
            key=lambda x: x[1].avg_engagement,
            reverse=True
        )
        
        for content_type, metrics in types_sorted:
            bar = "█" * int(metrics.avg_engagement / 0.5)
            print(f"{content_type:15} {bar} {metrics.avg_engagement:.2f}%")

asyncio.run(main())
```

### Hashtag Performance

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        analysis = await x.analytics.content("username")
        
        print("=== Hashtag Performance ===")
        
        for hashtag in analysis.top_hashtags[:10]:
            print(f"  {hashtag.tag}: {hashtag.avg_engagement:.2f}% ({hashtag.uses} uses)")

asyncio.run(main())
```

### Export Content Report

```python
from xeepy import Xeepy

async def export_content_report(username: str):
    async with Xeepy() as x:
        analysis = await x.analytics.content(username, period="30d")
        top = await x.analytics.top_content(username, limit=20)
        
        report = {
            "username": username,
            "total_posts": analysis.total_posts,
            "avg_engagement": analysis.avg_engagement,
            "by_type": {
                k: {"count": v.count, "engagement": v.avg_engagement}
                for k, v in analysis.by_type.items()
            },
            "top_hashtags": analysis.top_hashtags[:10],
            "top_posts": [
                {
                    "text": t.text[:100],
                    "likes": t.like_count,
                    "retweets": t.retweet_count
                }
                for t in top
            ]
        }
        
        x.export.to_json([report], f"content_report_{username}.json")

asyncio.run(export_content_report("myaccount"))
```

### Content Calendar Optimization

```python
from xeepy import Xeepy

async def optimize_calendar(username: str):
    async with Xeepy() as x:
        analysis = await x.analytics.content(username)
        
        print("=== Content Calendar Recommendations ===")
        
        # Best hours
        print("\nBest posting hours (UTC):")
        sorted_hours = sorted(analysis.by_time.items(), key=lambda x: -x[1])[:5]
        for hour, score in sorted_hours:
            print(f"  {hour}:00 - {score:.2f}x avg engagement")
        
        # Content mix recommendations
        print("\nRecommended content mix:")
        total_engagement = sum(m.avg_engagement for m in analysis.by_type.values())
        for content_type, metrics in analysis.by_type.items():
            recommended_pct = (metrics.avg_engagement / total_engagement) * 100
            print(f"  {content_type}: {recommended_pct:.0f}%")

asyncio.run(optimize_calendar("username"))
```

### A/B Test Analysis

```python
from xeepy import Xeepy

async def analyze_ab_test(tweet_a: str, tweet_b: str):
    async with Xeepy() as x:
        results = await x.analytics.ab_test_results([tweet_a, tweet_b])
        
        print("=== A/B Test Results ===")
        print(f"\nVariant A: {results.variant_a.text[:50]}...")
        print(f"  Engagement: {results.variant_a.engagement:.2f}%")
        print(f"  Likes: {results.variant_a.likes:,}")
        
        print(f"\nVariant B: {results.variant_b.text[:50]}...")
        print(f"  Engagement: {results.variant_b.engagement:.2f}%")
        print(f"  Likes: {results.variant_b.likes:,}")
        
        winner = "A" if results.variant_a.engagement > results.variant_b.engagement else "B"
        lift = abs(results.variant_a.engagement - results.variant_b.engagement)
        print(f"\n🏆 Winner: Variant {winner} (+{lift:.2f}% engagement)")

asyncio.run(analyze_ab_test("tweet_id_a", "tweet_id_b"))
```

## See Also

- [EngagementAnalytics](engagement.md) - Engagement analysis
- [CompetitorAnalytics](competitors.md) - Competitor analysis
- [ContentGenerator](../ai/content.md) - AI content generation

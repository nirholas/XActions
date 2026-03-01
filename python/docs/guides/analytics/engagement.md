# Engagement Analysis

Measure, analyze, and optimize your Twitter engagement with comprehensive metrics on likes, retweets, replies, and overall interaction rates.

## Overview

Engagement analysis goes beyond vanity metrics to understand how your audience interacts with your content. Track engagement rates, identify top-performing content, and optimize your strategy based on data.

## Use Cases

- **Content Performance**: Identify what content resonates best
- **Audience Understanding**: Learn when and how your audience engages
- **ROI Measurement**: Measure engagement from campaigns and efforts
- **Strategy Optimization**: Data-driven content strategy improvements
- **Benchmarking**: Compare performance against competitors

## Basic Usage

```python
import asyncio
from xeepy import Xeepy
from xeepy.analytics import EngagementAnalyzer

async def analyze_engagement():
    async with Xeepy() as x:
        analyzer = EngagementAnalyzer(x)
        
        # Get engagement metrics
        metrics = await analyzer.get_metrics("your_username", days=30)
        
        print(f"30-Day Engagement Summary:")
        print(f"  Total tweets: {metrics.tweet_count}")
        print(f"  Total likes: {metrics.total_likes:,}")
        print(f"  Total retweets: {metrics.total_retweets:,}")
        print(f"  Total replies: {metrics.total_replies:,}")
        print(f"  Engagement rate: {metrics.engagement_rate:.2%}")

asyncio.run(analyze_engagement())
```

## Detailed Engagement Breakdown

```python
async def detailed_engagement():
    async with Xeepy() as x:
        analyzer = EngagementAnalyzer(x)
        
        # Get detailed breakdown
        report = await analyzer.detailed_report("your_username", days=30)
        
        print("Engagement Breakdown:")
        print(f"\nLikes:")
        print(f"  Total: {report.likes.total:,}")
        print(f"  Average per tweet: {report.likes.average:.1f}")
        print(f"  Median: {report.likes.median}")
        print(f"  Max: {report.likes.max} (Tweet ID: {report.likes.max_tweet_id})")
        
        print(f"\nRetweets:")
        print(f"  Total: {report.retweets.total:,}")
        print(f"  Average per tweet: {report.retweets.average:.1f}")
        print(f"  Quote tweets: {report.retweets.quotes}")
        
        print(f"\nReplies:")
        print(f"  Total received: {report.replies.total:,}")
        print(f"  Reply rate: {report.replies.reply_rate:.2%}")
        print(f"  Avg thread depth: {report.replies.avg_thread_depth:.1f}")

asyncio.run(detailed_engagement())
```

## Top Performing Content

```python
async def top_content_analysis():
    async with Xeepy() as x:
        analyzer = EngagementAnalyzer(x)
        
        # Get top performing tweets
        top_tweets = await analyzer.top_content(
            username="your_username",
            metric="engagement",  # likes, retweets, replies, engagement
            limit=10,
            days=30
        )
        
        print("Top 10 Tweets by Engagement:")
        print("-" * 60)
        
        for i, tweet in enumerate(top_tweets, 1):
            print(f"\n{i}. {tweet.text[:80]}...")
            print(f"   Likes: {tweet.likes} | RTs: {tweet.retweets} | Replies: {tweet.reply_count}")
            print(f"   Engagement rate: {tweet.engagement_rate:.2%}")
            print(f"   Posted: {tweet.created_at}")

asyncio.run(top_content_analysis())
```

## Engagement Rate Calculation

```python
async def calculate_engagement_rates():
    async with Xeepy() as x:
        analyzer = EngagementAnalyzer(x)
        
        # Get tweets
        tweets = await x.scrape.tweets("your_username", limit=100)
        profile = await x.scrape.profile("your_username")
        
        # Calculate different engagement metrics
        for tweet in tweets[:10]:
            # Standard engagement rate
            standard_er = (tweet.likes + tweet.retweets + tweet.reply_count) / profile.followers_count
            
            # Engagement rate by impressions (if available)
            impression_er = (tweet.likes + tweet.retweets) / tweet.views if tweet.views else 0
            
            # Amplification rate (retweets per follower)
            amp_rate = tweet.retweets / profile.followers_count
            
            print(f"Tweet: {tweet.text[:40]}...")
            print(f"  Standard ER: {standard_er:.3%}")
            print(f"  Impression ER: {impression_er:.3%}")
            print(f"  Amplification: {amp_rate:.4%}\n")

asyncio.run(calculate_engagement_rates())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | str | required | Account to analyze |
| `days` | int | 30 | Analysis period |
| `metric` | str | "engagement" | Primary metric to sort by |
| `include_replies` | bool | True | Include reply tweets |
| `min_engagement` | int | 0 | Minimum engagement filter |

!!! tip "Engagement Rate Benchmarks"
    - **< 1%**: Below average
    - **1-3%**: Average engagement
    - **3-6%**: Good engagement
    - **> 6%**: Excellent engagement

!!! note "Engagement Rate Formula"
    Standard: `(Likes + Retweets + Replies) / Followers × 100`

## Content Type Analysis

```python
async def analyze_content_types():
    async with Xeepy() as x:
        analyzer = EngagementAnalyzer(x)
        
        tweets = await x.scrape.tweets("your_username", limit=200)
        
        # Categorize content
        categories = {
            "with_media": [],
            "with_links": [],
            "questions": [],
            "threads": [],
            "plain_text": []
        }
        
        for tweet in tweets:
            if tweet.media:
                categories["with_media"].append(tweet)
            elif tweet.urls:
                categories["with_links"].append(tweet)
            elif "?" in tweet.text:
                categories["questions"].append(tweet)
            elif tweet.is_thread_start:
                categories["threads"].append(tweet)
            else:
                categories["plain_text"].append(tweet)
        
        # Calculate engagement by category
        print("Engagement by Content Type:")
        print("-" * 50)
        
        for category, cat_tweets in categories.items():
            if cat_tweets:
                avg_engagement = sum(t.likes + t.retweets for t in cat_tweets) / len(cat_tweets)
                print(f"{category:15}: {len(cat_tweets):3} tweets, avg engagement: {avg_engagement:.1f}")

asyncio.run(analyze_content_types())
```

## Time-Based Engagement Patterns

```python
async def engagement_by_time():
    async with Xeepy() as x:
        analyzer = EngagementAnalyzer(x)
        
        tweets = await x.scrape.tweets("your_username", limit=200)
        
        # Group by hour
        from collections import defaultdict
        hourly_engagement = defaultdict(list)
        
        for tweet in tweets:
            hour = tweet.created_at.hour
            engagement = tweet.likes + tweet.retweets + tweet.reply_count
            hourly_engagement[hour].append(engagement)
        
        print("Average Engagement by Hour (UTC):")
        print("-" * 40)
        
        for hour in range(24):
            if hourly_engagement[hour]:
                avg = sum(hourly_engagement[hour]) / len(hourly_engagement[hour])
                bar = "█" * int(avg / 10)
                print(f"{hour:02d}:00  {bar} {avg:.1f}")

asyncio.run(engagement_by_time())
```

## Competitor Engagement Comparison

```python
async def compare_engagement():
    async with Xeepy() as x:
        analyzer = EngagementAnalyzer(x)
        
        accounts = ["your_account", "competitor1", "competitor2"]
        
        results = []
        for account in accounts:
            metrics = await analyzer.get_metrics(account, days=30)
            results.append({
                "account": account,
                "tweets": metrics.tweet_count,
                "avg_likes": metrics.avg_likes,
                "avg_retweets": metrics.avg_retweets,
                "engagement_rate": metrics.engagement_rate
            })
        
        # Sort by engagement rate
        results.sort(key=lambda x: x["engagement_rate"], reverse=True)
        
        print("Engagement Comparison (30 Days):")
        print("-" * 70)
        print(f"{'Account':<20} {'Tweets':<8} {'Avg Likes':<12} {'Avg RTs':<10} {'ER':<8}")
        print("-" * 70)
        
        for r in results:
            print(f"@{r['account']:<19} {r['tweets']:<8} {r['avg_likes']:<12.1f} {r['avg_retweets']:<10.1f} {r['engagement_rate']:.2%}")

asyncio.run(compare_engagement())
```

## Engagement Trends

```python
async def engagement_trends():
    async with Xeepy() as x:
        analyzer = EngagementAnalyzer(x)
        
        # Get weekly engagement trends
        trends = await analyzer.weekly_trends("your_username", weeks=8)
        
        print("Weekly Engagement Trends:")
        print("-" * 50)
        
        for week in trends:
            trend_indicator = "📈" if week.change > 0 else "📉" if week.change < 0 else "➡️"
            print(f"Week of {week.start_date}:")
            print(f"  {trend_indicator} Engagement: {week.total_engagement:,} ({week.change:+.1%})")
            print(f"  Avg per tweet: {week.avg_engagement:.1f}")
            print(f"  Best performer: {week.best_tweet.text[:40]}...\n")

asyncio.run(engagement_trends())
```

## Export Engagement Data

```python
async def export_engagement():
    async with Xeepy() as x:
        analyzer = EngagementAnalyzer(x)
        
        # Get comprehensive data
        tweets = await x.scrape.tweets("your_username", limit=500)
        
        export_data = []
        for tweet in tweets:
            export_data.append({
                "tweet_id": tweet.id,
                "created_at": tweet.created_at.isoformat(),
                "text": tweet.text[:100],
                "likes": tweet.likes,
                "retweets": tweet.retweets,
                "replies": tweet.reply_count,
                "views": tweet.views,
                "has_media": bool(tweet.media),
                "has_links": bool(tweet.urls),
                "engagement_total": tweet.likes + tweet.retweets + tweet.reply_count
            })
        
        x.export.to_csv(export_data, "engagement_data.csv")
        print(f"Exported {len(export_data)} tweets with engagement data")

asyncio.run(export_engagement())
```

## Best Practices

1. **Track Consistently**: Monitor engagement regularly for trend insights
2. **Context Matters**: Compare similar content types for fair analysis
3. **Look Beyond Likes**: Replies and retweets often indicate deeper engagement
4. **Test and Iterate**: Use data to inform content experiments
5. **Benchmark Realistically**: Compare against accounts of similar size
6. **Consider Reach**: High engagement with low reach may indicate niche appeal

## Related Guides

- [Growth Tracking](growth.md)
- [Best Time to Post](best-time.md)
- [Content Analysis](../scraping/tweets.md)

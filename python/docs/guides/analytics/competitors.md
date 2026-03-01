# Competitor Analysis

Monitor and analyze competitor Twitter accounts to benchmark performance, identify opportunities, and inform your strategy.

## Overview

Competitor analysis tracks other accounts' content strategy, engagement patterns, and growth to help you understand your market position and discover winning tactics you can adapt.

## Use Cases

- **Benchmarking**: Compare your performance against competitors
- **Content Ideas**: Identify successful content themes in your space
- **Gap Analysis**: Find opportunities competitors aren't addressing
- **Trend Spotting**: Detect emerging trends early through competitor activity
- **Strategic Planning**: Inform strategy with competitive intelligence

## Basic Usage

```python
import asyncio
from xeepy import Xeepy
from xeepy.analytics import CompetitorAnalyzer

async def analyze_competitor():
    async with Xeepy() as x:
        analyzer = CompetitorAnalyzer(x)
        
        # Basic competitor analysis
        report = await analyzer.analyze("competitor_username")
        
        print(f"Competitor Analysis: @{report.username}")
        print("-" * 50)
        print(f"Followers: {report.followers:,}")
        print(f"Following: {report.following:,}")
        print(f"Tweets (30 days): {report.tweet_count}")
        print(f"Avg engagement rate: {report.engagement_rate:.2%}")
        print(f"Growth rate: {report.growth_rate:.2%}")

asyncio.run(analyze_competitor())
```

## Multi-Competitor Comparison

```python
async def compare_competitors():
    async with Xeepy() as x:
        analyzer = CompetitorAnalyzer(x)
        
        competitors = ["competitor1", "competitor2", "competitor3", "your_account"]
        
        reports = []
        for username in competitors:
            report = await analyzer.analyze(username, days=30)
            reports.append(report)
        
        # Sort by engagement rate
        reports.sort(key=lambda r: r.engagement_rate, reverse=True)
        
        print("Competitor Comparison (30 Days)")
        print("=" * 80)
        print(f"{'Account':<20} {'Followers':>12} {'Tweets':>8} {'Eng Rate':>10} {'Growth':>10}")
        print("-" * 80)
        
        for r in reports:
            is_you = " ← You" if r.username == "your_account" else ""
            print(f"@{r.username:<19} {r.followers:>12,} {r.tweet_count:>8} {r.engagement_rate:>9.2%} {r.growth_rate:>9.2%}{is_you}")

asyncio.run(compare_competitors())
```

## Content Strategy Analysis

```python
async def analyze_content_strategy():
    async with Xeepy() as x:
        analyzer = CompetitorAnalyzer(x)
        
        # Analyze competitor's content strategy
        strategy = await analyzer.content_strategy("competitor_username", days=30)
        
        print("Content Strategy Analysis:")
        print("-" * 50)
        
        print("\nContent Mix:")
        for content_type, pct in strategy.content_mix.items():
            bar = "█" * int(pct * 30)
            print(f"  {content_type:15} {bar} {pct:.1%}")
        
        print(f"\nPosting Frequency: {strategy.avg_tweets_per_day:.1f} tweets/day")
        print(f"Most active day: {strategy.most_active_day}")
        print(f"Peak posting hour: {strategy.peak_hour}:00 UTC")
        
        print("\nTop Performing Content Types:")
        for ct in strategy.top_performing[:3]:
            print(f"  {ct.type}: {ct.avg_engagement:.1f} avg engagement")

asyncio.run(analyze_content_strategy())
```

## Top Content Discovery

```python
async def find_top_content():
    async with Xeepy() as x:
        analyzer = CompetitorAnalyzer(x)
        
        # Get competitor's best performing content
        top_content = await analyzer.top_content(
            username="competitor_username",
            days=30,
            limit=10
        )
        
        print("Top Performing Tweets:")
        print("-" * 60)
        
        for i, tweet in enumerate(top_content, 1):
            print(f"\n{i}. [{tweet.created_at.strftime('%Y-%m-%d')}]")
            print(f"   {tweet.text[:100]}...")
            print(f"   📊 Likes: {tweet.likes:,} | RTs: {tweet.retweets:,} | Replies: {tweet.reply_count:,}")
            print(f"   📈 Engagement rate: {tweet.engagement_rate:.2%}")
            
            # Identify content characteristics
            tags = []
            if tweet.media:
                tags.append("📷 Media")
            if tweet.urls:
                tags.append("🔗 Links")
            if "?" in tweet.text:
                tags.append("❓ Question")
            if tweet.hashtags:
                tags.append(f"# {len(tweet.hashtags)} hashtags")
            
            if tags:
                print(f"   Tags: {' | '.join(tags)}")

asyncio.run(find_top_content())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | str | required | Competitor username |
| `days` | int | 30 | Analysis period |
| `include_replies` | bool | False | Include reply tweets |
| `engagement_calc` | str | "standard" | Engagement calculation method |

!!! tip "Competitor Selection"
    Choose competitors at different stages: direct competitors (similar size), aspirational (larger), and emerging (smaller but growing fast).

!!! note "Public Data Only"
    Competitor analysis works only with public accounts. Private accounts cannot be analyzed.

## Growth Comparison

```python
async def compare_growth():
    async with Xeepy() as x:
        analyzer = CompetitorAnalyzer(x)
        
        competitors = ["competitor1", "competitor2", "your_account"]
        
        print("30-Day Growth Comparison:")
        print("-" * 60)
        
        results = []
        for username in competitors:
            growth = await analyzer.growth_metrics(username, days=30)
            results.append({
                "username": username,
                "start": growth.start_followers,
                "end": growth.end_followers,
                "change": growth.net_change,
                "rate": growth.growth_rate
            })
        
        # Sort by growth rate
        results.sort(key=lambda r: r["rate"], reverse=True)
        
        for r in results:
            indicator = "📈" if r["rate"] > 0 else "📉"
            print(f"@{r['username']:20} {indicator} {r['change']:+,} ({r['rate']:+.2%})")

asyncio.run(compare_growth())
```

## Hashtag and Topic Analysis

```python
async def analyze_topics():
    async with Xeepy() as x:
        analyzer = CompetitorAnalyzer(x)
        
        # Analyze topics and hashtags used by competitor
        topics = await analyzer.topic_analysis("competitor_username", days=30)
        
        print("Topic Analysis:")
        print("-" * 50)
        
        print("\nTop Hashtags:")
        for tag in topics.hashtags[:10]:
            print(f"  #{tag.name}: {tag.count} uses, {tag.avg_engagement:.1f} avg engagement")
        
        print("\nKey Topics:")
        for topic in topics.topics[:10]:
            print(f"  {topic.name}: {topic.percentage:.1%} of content")
        
        print("\nMentions (collaborations/conversations):")
        for mention in topics.mentions[:5]:
            print(f"  @{mention.username}: {mention.count} mentions")

asyncio.run(analyze_topics())
```

## Audience Comparison

```python
async def compare_audiences():
    async with Xeepy() as x:
        analyzer = CompetitorAnalyzer(x)
        
        # Compare follower characteristics
        comparison = await analyzer.audience_comparison(
            your_username="your_account",
            competitor="competitor_username",
            sample_size=500
        )
        
        print("Audience Comparison:")
        print("-" * 60)
        
        print(f"\n{'Metric':<25} {'You':>15} {'Competitor':>15}")
        print("-" * 60)
        print(f"{'Avg follower count':<25} {comparison.you.avg_followers:>15,.0f} {comparison.competitor.avg_followers:>15,.0f}")
        print(f"{'Verified %':<25} {comparison.you.verified_pct:>14.1%} {comparison.competitor.verified_pct:>14.1%}")
        print(f"{'Active % (30 days)':<25} {comparison.you.active_pct:>14.1%} {comparison.competitor.active_pct:>14.1%}")
        
        print(f"\nAudience overlap: {comparison.overlap_percentage:.1%}")
        print(f"Unique to you: {comparison.unique_to_you:,}")
        print(f"Unique to competitor: {comparison.unique_to_competitor:,}")

asyncio.run(compare_audiences())
```

## Engagement Pattern Analysis

```python
async def analyze_engagement_patterns():
    async with Xeepy() as x:
        analyzer = CompetitorAnalyzer(x)
        
        # Compare engagement patterns
        patterns = await analyzer.engagement_patterns(
            usernames=["competitor1", "competitor2", "your_account"],
            days=30
        )
        
        print("Engagement Pattern Analysis:")
        print("-" * 70)
        
        for p in patterns:
            print(f"\n@{p.username}:")
            print(f"  Best day: {p.best_day} ({p.best_day_engagement:.1f} avg)")
            print(f"  Best hour: {p.best_hour}:00 UTC ({p.best_hour_engagement:.1f} avg)")
            print(f"  Reply rate: {p.reply_rate:.1%}")
            print(f"  Retweet ratio: {p.retweet_ratio:.1%}")

asyncio.run(analyze_engagement_patterns())
```

## Competitive Dashboard Export

```python
async def export_competitive_dashboard():
    async with Xeepy() as x:
        analyzer = CompetitorAnalyzer(x)
        
        competitors = ["competitor1", "competitor2", "competitor3"]
        
        dashboard_data = {
            "generated_at": datetime.now().isoformat(),
            "competitors": []
        }
        
        for username in competitors:
            report = await analyzer.comprehensive_report(username, days=30)
            
            dashboard_data["competitors"].append({
                "username": username,
                "followers": report.followers,
                "growth_rate": report.growth_rate,
                "engagement_rate": report.engagement_rate,
                "tweets_per_day": report.tweets_per_day,
                "top_content_themes": report.top_themes,
                "best_posting_times": report.best_times,
                "top_hashtags": report.top_hashtags
            })
        
        x.export.to_json(dashboard_data, "competitive_dashboard.json")
        print("Competitive dashboard exported to competitive_dashboard.json")

asyncio.run(export_competitive_dashboard())
```

## Competitive Alerts

```python
async def monitor_competitors():
    async with Xeepy() as x:
        analyzer = CompetitorAnalyzer(x)
        
        competitors = ["competitor1", "competitor2"]
        
        for username in competitors:
            # Check for significant changes
            changes = await analyzer.detect_changes(username)
            
            if changes.significant_changes:
                print(f"⚠️ Alert for @{username}:")
                
                for change in changes.significant_changes:
                    print(f"  - {change.description}")
                    print(f"    Previous: {change.previous_value}")
                    print(f"    Current: {change.current_value}")
                    print(f"    Change: {change.percentage_change:+.1%}")

asyncio.run(monitor_competitors())
```

## Best Practices

1. **Track Consistently**: Monitor competitors on a regular schedule
2. **Learn, Don't Copy**: Adapt successful tactics, don't duplicate content
3. **Multiple Competitors**: Track 3-5 competitors across different tiers
4. **Focus on Actionable**: Prioritize insights you can act on
5. **Consider Context**: Engagement varies by niche and audience size
6. **Ethical Monitoring**: Use public data only; don't misrepresent insights

## Related Guides

- [Growth Tracking](growth.md)
- [Engagement Analysis](engagement.md)
- [Audience Insights](audience.md)

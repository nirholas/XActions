# Best Time to Post Analysis

Discover optimal posting times by analyzing when your audience is most active and engaged for maximum reach and interaction.

## Overview

Posting at the right time can dramatically increase your content's visibility and engagement. This guide shows how to analyze your historical data and audience behavior to find your personal best posting times.

## Use Cases

- **Content Scheduling**: Plan posts for maximum engagement
- **Global Audiences**: Optimize for multiple time zones
- **Campaign Timing**: Launch campaigns at peak activity times
- **A/B Testing**: Test timing hypotheses with data
- **Automation**: Feed insights into scheduling tools

## Basic Usage

```python
import asyncio
from xeepy import Xeepy
from xeepy.analytics import TimingAnalyzer

async def find_best_times():
    async with Xeepy() as x:
        analyzer = TimingAnalyzer(x)
        
        # Analyze your best posting times
        best_times = await analyzer.best_times(
            username="your_username",
            days=90,
            metric="engagement"  # engagement, likes, retweets, replies
        )
        
        print("Best Times to Post:")
        print("-" * 40)
        
        for slot in best_times.top_slots[:5]:
            print(f"{slot.day} at {slot.hour}:00 UTC")
            print(f"  Avg engagement: {slot.avg_engagement:.1f}")
            print(f"  Sample size: {slot.tweet_count} tweets\n")

asyncio.run(find_best_times())
```

## Hourly Engagement Analysis

```python
async def hourly_analysis():
    async with Xeepy() as x:
        analyzer = TimingAnalyzer(x)
        
        # Get hourly engagement patterns
        hourly = await analyzer.hourly_breakdown("your_username", days=60)
        
        print("Engagement by Hour (UTC):")
        print("-" * 50)
        
        max_engagement = max(h.avg_engagement for h in hourly)
        
        for hour_data in hourly:
            bar_length = int((hour_data.avg_engagement / max_engagement) * 30)
            bar = "█" * bar_length
            indicator = "⭐" if hour_data.avg_engagement == max_engagement else "  "
            
            print(f"{hour_data.hour:02d}:00 {indicator} {bar} {hour_data.avg_engagement:.1f}")

asyncio.run(hourly_analysis())
```

## Day-of-Week Analysis

```python
async def daily_analysis():
    async with Xeepy() as x:
        analyzer = TimingAnalyzer(x)
        
        # Get daily patterns
        daily = await analyzer.daily_breakdown("your_username", days=90)
        
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        
        print("Engagement by Day of Week:")
        print("-" * 50)
        
        for day_data in daily:
            day_name = days[day_data.day_index]
            bar = "█" * int(day_data.avg_engagement / 5)
            print(f"{day_name:10} {bar} {day_data.avg_engagement:.1f} avg ({day_data.tweet_count} tweets)")

asyncio.run(daily_analysis())
```

## Heatmap Data Generation

```python
async def generate_heatmap_data():
    async with Xeepy() as x:
        analyzer = TimingAnalyzer(x)
        
        # Get full heatmap data (day x hour)
        heatmap = await analyzer.engagement_heatmap("your_username", days=90)
        
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        
        print("Engagement Heatmap (Hour vs Day):")
        print("-" * 80)
        print("     " + " ".join(f"{h:02d}" for h in range(24)))
        
        for day_idx, day_name in enumerate(days):
            row = heatmap.data[day_idx]
            # Normalize to 0-9 scale for display
            max_val = max(max(r) for r in heatmap.data) or 1
            normalized = [int((v / max_val) * 9) for v in row]
            row_str = " ".join(str(v) for v in normalized)
            print(f"{day_name}  {row_str}")
        
        # Export for visualization
        x.export.to_json(heatmap.to_dict(), "timing_heatmap.json")

asyncio.run(generate_heatmap_data())
```

## Audience Timezone Analysis

```python
async def analyze_audience_timezones():
    async with Xeepy() as x:
        analyzer = TimingAnalyzer(x)
        
        # Analyze follower activity patterns to infer timezones
        timezone_dist = await analyzer.infer_audience_timezones(
            username="your_username",
            sample_size=500
        )
        
        print("Estimated Audience Timezone Distribution:")
        print("-" * 50)
        
        for tz, percentage in timezone_dist.distribution.items():
            bar = "█" * int(percentage * 50)
            print(f"{tz:20} {bar} {percentage:.1%}")
        
        print(f"\nPrimary timezone: {timezone_dist.primary_timezone}")
        print(f"Recommended posting window: {timezone_dist.recommended_window}")

asyncio.run(analyze_audience_timezones())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | str | required | Account to analyze |
| `days` | int | 30 | Historical days to analyze |
| `metric` | str | "engagement" | Metric to optimize |
| `timezone` | str | "UTC" | Output timezone |
| `min_tweets` | int | 3 | Minimum tweets per slot |

!!! tip "Sample Size Matters"
    More historical data leads to more reliable insights. Aim for at least 60-90 days of data with consistent posting patterns.

!!! note "Individual Variation"
    Generic "best times" rarely apply universally. Your optimal times depend on your specific audience demographics and behavior.

## Compare Your Times vs Optimal

```python
async def compare_posting_patterns():
    async with Xeepy() as x:
        analyzer = TimingAnalyzer(x)
        
        tweets = await x.scrape.tweets("your_username", limit=200)
        best_times = await analyzer.best_times("your_username", days=90)
        
        # Analyze your actual posting times
        from collections import Counter
        posting_hours = Counter(t.created_at.hour for t in tweets)
        
        optimal_hours = [slot.hour for slot in best_times.top_slots[:5]]
        
        # Calculate alignment
        total_tweets = len(tweets)
        optimal_tweets = sum(1 for t in tweets if t.created_at.hour in optimal_hours)
        alignment = optimal_tweets / total_tweets
        
        print(f"Posting Time Analysis:")
        print(f"  Your most common hours: {posting_hours.most_common(3)}")
        print(f"  Optimal hours: {optimal_hours}")
        print(f"  Tweets at optimal times: {alignment:.1%}")
        
        if alignment < 0.5:
            print(f"\n💡 Suggestion: Try posting more during {optimal_hours}")

asyncio.run(compare_posting_patterns())
```

## Content-Type Specific Timing

```python
async def timing_by_content_type():
    async with Xeepy() as x:
        analyzer = TimingAnalyzer(x)
        
        tweets = await x.scrape.tweets("your_username", limit=300)
        
        # Separate by content type
        media_tweets = [t for t in tweets if t.media]
        link_tweets = [t for t in tweets if t.urls and not t.media]
        text_tweets = [t for t in tweets if not t.media and not t.urls]
        
        content_types = {
            "Media posts": media_tweets,
            "Link shares": link_tweets,
            "Text only": text_tweets
        }
        
        print("Best Times by Content Type:")
        print("-" * 50)
        
        for content_type, type_tweets in content_types.items():
            if len(type_tweets) >= 10:
                # Find best hour for this content type
                from collections import defaultdict
                hourly = defaultdict(list)
                
                for tweet in type_tweets:
                    engagement = tweet.likes + tweet.retweets
                    hourly[tweet.created_at.hour].append(engagement)
                
                best_hour = max(hourly.keys(), key=lambda h: sum(hourly[h]) / len(hourly[h]))
                best_avg = sum(hourly[best_hour]) / len(hourly[best_hour])
                
                print(f"{content_type}: Best at {best_hour}:00 UTC (avg {best_avg:.1f} engagement)")

asyncio.run(timing_by_content_type())
```

## Schedule Optimization

```python
async def optimize_schedule():
    async with Xeepy() as x:
        analyzer = TimingAnalyzer(x)
        
        # Get optimal schedule for X posts per week
        posts_per_week = 14  # 2 per day
        
        schedule = await analyzer.optimal_schedule(
            username="your_username",
            posts_per_week=posts_per_week,
            min_gap_hours=4  # Minimum hours between posts
        )
        
        print(f"Optimal Weekly Schedule ({posts_per_week} posts):")
        print("-" * 50)
        
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        
        for slot in schedule.slots:
            print(f"{days[slot.day_index]} {slot.hour:02d}:00 UTC - Expected ER: {slot.expected_engagement:.2%}")
        
        print(f"\nTotal expected weekly engagement: {schedule.total_expected:.0f}")

asyncio.run(optimize_schedule())
```

## Export Timing Data

```python
async def export_timing_analysis():
    async with Xeepy() as x:
        analyzer = TimingAnalyzer(x)
        
        # Comprehensive timing export
        heatmap = await analyzer.engagement_heatmap("your_username", days=90)
        best_times = await analyzer.best_times("your_username", days=90)
        
        export_data = {
            "heatmap": heatmap.to_dict(),
            "best_slots": [
                {
                    "day": slot.day,
                    "hour": slot.hour,
                    "avg_engagement": slot.avg_engagement,
                    "tweet_count": slot.tweet_count
                }
                for slot in best_times.top_slots
            ],
            "analysis_period_days": 90,
            "generated_at": datetime.now().isoformat()
        }
        
        x.export.to_json(export_data, "timing_analysis.json")
        print("Timing analysis exported to timing_analysis.json")

asyncio.run(export_timing_analysis())
```

## Best Practices

1. **Use Your Data**: Generic advice is less valuable than your own analytics
2. **Account for Timezones**: Know where your primary audience is located
3. **Test Consistently**: Post at various times over weeks to gather data
4. **Consider Content Type**: Different content may perform better at different times
5. **Review Regularly**: Audience behavior changes; update analysis quarterly
6. **Don't Over-Optimize**: Consistency matters more than perfect timing

## Related Guides

- [Engagement Analysis](engagement.md)
- [Audience Insights](audience.md)
- [Content Strategy](../scraping/tweets.md)

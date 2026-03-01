# Growth Tracking Analytics

Monitor and analyze your Twitter account growth with detailed metrics, trend analysis, and actionable insights.

## Overview

Growth tracking provides comprehensive analytics on follower changes, engagement trends, and account performance over time. Understand what drives growth and optimize your strategy with data-driven decisions.

## Use Cases

- **Performance Monitoring**: Track follower gains and losses daily
- **Campaign ROI**: Measure growth impact of marketing campaigns
- **Trend Analysis**: Identify growth patterns and seasonality
- **Goal Setting**: Set realistic growth targets based on historical data
- **Strategy Optimization**: Understand what content drives follower growth

## Basic Usage

```python
import asyncio
from xeepy import Xeepy
from xeepy.analytics import GrowthTracker

async def track_growth():
    async with Xeepy() as x:
        tracker = GrowthTracker(x)
        
        # Get current growth metrics
        metrics = await tracker.get_metrics("your_username")
        
        print(f"Current followers: {metrics.followers:,}")
        print(f"30-day change: {metrics.monthly_change:+,}")
        print(f"Daily average: {metrics.daily_average:+.1f}")
        print(f"Growth rate: {metrics.growth_rate:.2%}")

asyncio.run(track_growth())
```

## Daily Growth Tracking

```python
async def daily_tracking():
    async with Xeepy() as x:
        tracker = GrowthTracker(x)
        
        # Track daily changes
        today = await tracker.daily_snapshot("your_username")
        
        print(f"Date: {today.date}")
        print(f"Followers: {today.followers:,}")
        print(f"Following: {today.following:,}")
        print(f"New followers: {today.new_followers:+,}")
        print(f"Lost followers: {today.lost_followers}")
        print(f"Net change: {today.net_change:+,}")
        
        # Store in database for historical tracking
        await tracker.save_snapshot(today)

asyncio.run(daily_tracking())
```

## Historical Growth Analysis

```python
async def historical_analysis():
    async with Xeepy() as x:
        tracker = GrowthTracker(x)
        
        # Get growth history
        history = await tracker.get_history(
            username="your_username",
            days=90  # Last 90 days
        )
        
        print("Growth History (Last 90 Days):")
        print("-" * 50)
        
        # Weekly aggregates
        for week in history.weekly_aggregates:
            print(f"Week of {week.start_date}:")
            print(f"  Gained: +{week.gained:,}")
            print(f"  Lost: -{week.lost:,}")
            print(f"  Net: {week.net_change:+,}")
            print(f"  Growth rate: {week.growth_rate:.2%}\n")
        
        # Overall summary
        print(f"Total growth: {history.total_change:+,}")
        print(f"Average daily: {history.daily_average:+.1f}")
        print(f"Best day: {history.best_day.date} (+{history.best_day.change})")
        print(f"Worst day: {history.worst_day.date} ({history.worst_day.change})")

asyncio.run(historical_analysis())
```

## Follower Change Analysis

```python
async def analyze_follower_changes():
    async with Xeepy() as x:
        tracker = GrowthTracker(x)
        
        # Get detailed unfollower data
        report = await tracker.unfollower_report("your_username")
        
        print(f"New followers today: {len(report.new_followers)}")
        for user in report.new_followers[:5]:
            print(f"  + @{user.username} ({user.followers_count:,} followers)")
        
        print(f"\nUnfollowers today: {len(report.unfollowers)}")
        for user in report.unfollowers[:5]:
            print(f"  - @{user.username} ({user.followers_count:,} followers)")
        
        # Analyze unfollower patterns
        print(f"\nUnfollower analysis:")
        print(f"  Avg follower count: {report.avg_unfollower_size:,.0f}")
        print(f"  Were following back: {report.mutual_unfollows}")

asyncio.run(analyze_follower_changes())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | str | required | Account to track |
| `days` | int | 30 | Historical days to analyze |
| `include_details` | bool | True | Include individual user data |
| `store_history` | bool | True | Save snapshots to database |

!!! tip "Consistent Tracking"
    Run daily snapshots at the same time each day for accurate trend analysis. Use cron jobs or scheduled tasks for automation.

!!! note "Historical Data"
    Twitter doesn't provide historical follower data. Start tracking today to build your historical database.

## Growth Rate Calculations

```python
async def calculate_growth_rates():
    async with Xeepy() as x:
        tracker = GrowthTracker(x)
        
        history = await tracker.get_history("your_username", days=30)
        
        # Calculate various growth metrics
        print("Growth Metrics:")
        print(f"  Daily growth rate: {history.daily_growth_rate:.3%}")
        print(f"  Weekly growth rate: {history.weekly_growth_rate:.2%}")
        print(f"  Monthly growth rate: {history.monthly_growth_rate:.2%}")
        
        # Compound annual growth rate (CAGR)
        if history.days >= 30:
            cagr = ((history.end_followers / history.start_followers) ** (365 / history.days) - 1)
            print(f"  Projected annual growth: {cagr:.1%}")
        
        # Velocity (acceleration of growth)
        print(f"  Growth velocity: {history.velocity:+.2f} (accelerating)" if history.velocity > 0 
              else f"  Growth velocity: {history.velocity:.2f} (slowing)")

asyncio.run(calculate_growth_rates())
```

## Growth Visualization Data

```python
async def get_visualization_data():
    async with Xeepy() as x:
        tracker = GrowthTracker(x)
        
        history = await tracker.get_history("your_username", days=60)
        
        # Prepare data for charts
        chart_data = {
            "dates": [d.date.isoformat() for d in history.daily_data],
            "followers": [d.followers for d in history.daily_data],
            "daily_change": [d.net_change for d in history.daily_data],
            "cumulative_change": []
        }
        
        # Calculate cumulative change
        cumulative = 0
        for d in history.daily_data:
            cumulative += d.net_change
            chart_data["cumulative_change"].append(cumulative)
        
        # Export for visualization tools
        x.export.to_json(chart_data, "growth_chart_data.json")
        print("Chart data exported to growth_chart_data.json")

asyncio.run(get_visualization_data())
```

## Comparative Growth Analysis

```python
async def compare_growth():
    async with Xeepy() as x:
        tracker = GrowthTracker(x)
        
        accounts = ["your_account", "competitor1", "competitor2"]
        
        print("30-Day Growth Comparison:")
        print("-" * 60)
        
        results = []
        for account in accounts:
            history = await tracker.get_history(account, days=30)
            results.append({
                "account": account,
                "growth": history.total_change,
                "rate": history.monthly_growth_rate
            })
        
        # Sort by growth rate
        results.sort(key=lambda x: x["rate"], reverse=True)
        
        for r in results:
            bar = "█" * int(r["rate"] * 100)
            print(f"@{r['account']:20}: {bar} {r['rate']:.2%} ({r['growth']:+,})")

asyncio.run(compare_growth())
```

## Goal Tracking

```python
async def track_goals():
    async with Xeepy() as x:
        tracker = GrowthTracker(x)
        
        # Define growth goal
        goal = 10000  # Target followers
        deadline_days = 90  # Days to achieve
        
        metrics = await tracker.get_metrics("your_username")
        history = await tracker.get_history("your_username", days=30)
        
        current = metrics.followers
        needed = goal - current
        daily_rate = history.daily_average
        
        if daily_rate > 0:
            days_needed = needed / daily_rate
            on_track = days_needed <= deadline_days
            
            print(f"Goal: {goal:,} followers in {deadline_days} days")
            print(f"Current: {current:,}")
            print(f"Needed: {needed:,}")
            print(f"Daily average: {daily_rate:+.1f}")
            print(f"Projected days to goal: {days_needed:.0f}")
            print(f"Status: {'✅ On track!' if on_track else '⚠️ Need to increase growth rate'}")
            
            if not on_track:
                required_rate = needed / deadline_days
                print(f"Required daily rate: {required_rate:.1f} ({required_rate - daily_rate:+.1f} vs current)")

asyncio.run(track_goals())
```

## Automated Growth Reports

```python
async def generate_growth_report():
    async with Xeepy() as x:
        tracker = GrowthTracker(x)
        
        # Weekly growth report
        report = await tracker.generate_report(
            username="your_username",
            period="weekly"
        )
        
        print("=" * 60)
        print("WEEKLY GROWTH REPORT")
        print("=" * 60)
        print(f"Period: {report.start_date} to {report.end_date}")
        print(f"\nFollowers: {report.end_followers:,} ({report.change:+,})")
        print(f"Growth rate: {report.growth_rate:.2%}")
        print(f"\nBest performing day: {report.best_day}")
        print(f"Total new followers: {report.total_gained:,}")
        print(f"Total unfollowers: {report.total_lost:,}")
        print(f"\nEngagement correlation: {report.engagement_correlation:.2f}")
        
        # Export full report
        x.export.to_json(report.to_dict(), "weekly_report.json")

asyncio.run(generate_growth_report())
```

## Best Practices

1. **Track Consistently**: Run daily at the same time for accurate data
2. **Set Realistic Goals**: Base targets on historical performance
3. **Correlate with Content**: Track which content drives follower growth
4. **Monitor Unfollowers**: High unfollows may indicate content issues
5. **Compare Competitors**: Benchmark against similar accounts
6. **Long-term View**: Focus on trends, not daily fluctuations

## Related Guides

- [Engagement Analysis](engagement.md)
- [Audience Insights](audience.md)
- [Report Generation](reports.md)

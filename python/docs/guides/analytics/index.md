# Analytics Guide

Xeepy provides deep analytics to understand your X/Twitter performance, audience, and optimal strategies.

## Overview

<div class="grid cards" markdown>

-   :material-trending-up:{ .lg .middle } **[Growth Analytics](growth.md)**
    
    Track follower trends and growth patterns

-   :material-chart-bar:{ .lg .middle } **[Engagement Analytics](engagement.md)**
    
    Analyze likes, retweets, and interactions

-   :material-clock-outline:{ .lg .middle } **[Best Time to Post](best-time.md)**
    
    Find when your audience is most active

-   :material-account-group:{ .lg .middle } **[Audience Insights](audience.md)**
    
    Understand who follows you

-   :material-account-search:{ .lg .middle } **[Competitor Analysis](competitors.md)**
    
    Benchmark against competitors

-   :material-file-chart:{ .lg .middle } **[Reports](reports.md)**
    
    Generate comprehensive reports

</div>

## Quick Start

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Get comprehensive analytics
    analytics = await x.analytics.dashboard()
    
    print(f"""
    📊 Analytics Dashboard
    ═══════════════════════
    
    Followers: {analytics.followers:,} ({analytics.follower_change:+d} this week)
    Engagement Rate: {analytics.engagement_rate:.2%}
    Best Day to Post: {analytics.best_day}
    Best Hour: {analytics.best_hour}:00
    
    Top Content Type: {analytics.top_content_type}
    Avg Likes per Post: {analytics.avg_likes:.1f}
    """)
```

## Growth Analytics

### Track Growth Over Time

```python
async with Xeepy() as x:
    growth = await x.analytics.track_growth(period="30d")
    
    print(f"""
    📈 30-Day Growth Report
    ────────────────────────
    Starting: {growth.start_followers:,}
    Current: {growth.end_followers:,}
    Net Change: {growth.net_change:+,}
    Growth Rate: {growth.growth_rate:.1%}
    Avg Daily: {growth.avg_daily:+.1f}
    """)
    
    # Daily breakdown
    for day in growth.daily_data:
        print(f"  {day.date}: {day.followers:,} ({day.change:+d})")
```

### Growth Projections

```python
async with Xeepy() as x:
    projection = await x.analytics.growth_projection(
        based_on="90d",  # Historical data to use
        project_to="1y"   # Project 1 year ahead
    )
    
    print(f"Projected followers in 1 year: {projection.projected_count:,}")
    print(f"Confidence: {projection.confidence:.0%}")
    
    # Milestones
    for milestone in projection.milestones:
        print(f"  {milestone.count:,} followers: {milestone.estimated_date}")
```

## Engagement Analytics

### Analyze Your Engagement

```python
async with Xeepy() as x:
    engagement = await x.analytics.engagement_analysis(period="30d")
    
    print(f"""
    💬 Engagement Analysis
    ───────────────────────
    Total Tweets: {engagement.total_tweets}
    Total Likes: {engagement.total_likes:,}
    Total Retweets: {engagement.total_retweets:,}
    Total Replies: {engagement.total_replies:,}
    
    Engagement Rate: {engagement.rate:.2%}
    Avg Likes/Tweet: {engagement.avg_likes:.1f}
    Avg Retweets: {engagement.avg_retweets:.1f}
    
    Top Performing Tweet:
    "{engagement.top_tweet.text[:100]}..."
    ({engagement.top_tweet.likes:,} likes)
    """)
```

### Content Performance by Type

```python
async with Xeepy() as x:
    by_type = await x.analytics.engagement_by_type()
    
    print("📝 Content Type Performance:")
    print("───────────────────────────")
    
    for content_type in by_type.types:
        print(f"""
    {content_type.name}:
      Posts: {content_type.count}
      Avg Engagement: {content_type.avg_engagement:.1f}
      Best: {content_type.engagement_rate:.2%}
        """)
```

### Hashtag Performance

```python
async with Xeepy() as x:
    hashtags = await x.analytics.hashtag_performance(period="90d")
    
    print("# Hashtag Performance:")
    for tag in hashtags.top_hashtags[:10]:
        print(f"  {tag.name}: {tag.avg_engagement:.1f} avg engagement ({tag.uses} uses)")
```

## Best Time to Post

### Find Optimal Posting Times

```python
async with Xeepy() as x:
    best_times = await x.analytics.best_time_to_post()
    
    print(f"""
    ⏰ Best Times to Post
    ──────────────────────
    
    Best Day: {best_times.best_day}
    Best Hour: {best_times.best_hour}:00 (your timezone)
    
    Top 5 Time Slots:
    """)
    
    for slot in best_times.top_slots[:5]:
        print(f"  {slot.day} {slot.hour}:00 - {slot.engagement_score:.1f} score")
```

### Heatmap Data

```python
async with Xeepy() as x:
    heatmap = await x.analytics.engagement_heatmap()
    
    # Get engagement score for each hour of each day
    for day in heatmap.days:
        print(f"\n{day.name}:")
        for hour in day.hours:
            bar = "█" * int(hour.score / 10)
            print(f"  {hour.hour:02d}:00 {bar} {hour.score:.0f}")
```

## Audience Insights

### Understand Your Audience

```python
async with Xeepy() as x:
    audience = await x.analytics.audience_insights(sample_size=1000)
    
    print(f"""
    👥 Audience Insights
    ─────────────────────
    
    Demographics:
      Location: {', '.join(audience.top_locations[:5])}
      Primary Language: {audience.primary_language}
    
    Interests:
      {', '.join(audience.top_interests[:10])}
    
    Account Types:
      Creators: {audience.creator_percentage:.0%}
      Businesses: {audience.business_percentage:.0%}
      Personal: {audience.personal_percentage:.0%}
    
    Activity:
      Active (last 7d): {audience.active_percentage:.0%}
      Avg Followers: {audience.avg_follower_count:,.0f}
    """)
```

### Influencer Analysis

```python
async with Xeepy() as x:
    influencers = await x.analytics.follower_influencers(min_followers=10000)
    
    print("🌟 Your Most Influential Followers:")
    for inf in influencers[:20]:
        print(f"  @{inf.username} - {inf.followers_count:,} followers")
        print(f"    Niche: {inf.niche}")
        print(f"    Engagement Rate: {inf.engagement_rate:.2%}")
```

## Competitor Analysis

### Compare to Competitors

```python
async with Xeepy() as x:
    comparison = await x.analytics.competitor_analysis(
        competitors=["competitor1", "competitor2", "competitor3"],
        metrics=["followers", "engagement", "posting_frequency"]
    )
    
    print("📊 Competitor Comparison")
    print("────────────────────────")
    
    for comp in comparison.competitors:
        print(f"""
    @{comp.username}:
      Followers: {comp.followers:,}
      Engagement Rate: {comp.engagement_rate:.2%}
      Posts/Week: {comp.posts_per_week:.1f}
      Top Hashtags: {', '.join(comp.top_hashtags[:3])}
        """)
```

### Content Gap Analysis

```python
async with Xeepy() as x:
    gaps = await x.analytics.content_gaps(competitors=["comp1", "comp2"])
    
    print("💡 Content Opportunities:")
    for gap in gaps.opportunities:
        print(f"  - {gap.topic}: {gap.competitor_engagement:.0f} avg engagement")
        print(f"    You haven't posted about this recently")
```

## Generating Reports

### Weekly Report

```python
async with Xeepy() as x:
    report = await x.analytics.generate_report(
        period="7d",
        format="markdown",
        include=["growth", "engagement", "top_content", "audience"]
    )
    
    # Save report
    with open("weekly_report.md", "w") as f:
        f.write(report.content)
    
    print(f"✓ Report saved: weekly_report.md")
```

### PDF Report

```python
async with Xeepy() as x:
    report = await x.analytics.generate_report(
        period="30d",
        format="pdf",
        template="professional"  # or "minimal", "detailed"
    )
    
    report.save("monthly_report.pdf")
```

### Scheduled Reports

```python
async with Xeepy() as x:
    # Configure automatic reports
    await x.analytics.schedule_report(
        frequency="weekly",
        day="monday",
        time="09:00",
        recipients=["you@email.com"],
        format="pdf"
    )
```

## CLI Commands

```bash
# Growth analytics
xeepy analytics growth --period 30d

# Engagement analysis
xeepy analytics engagement --period 7d

# Best time to post
xeepy analytics best-time

# Audience insights
xeepy analytics audience --sample 1000

# Competitor analysis
xeepy analytics competitors comp1,comp2,comp3

# Generate report
xeepy analytics report --period 30d --format pdf --output report.pdf
```

## Data Export

```python
async with Xeepy() as x:
    # Export raw analytics data
    growth_data = await x.analytics.track_growth("90d")
    x.export.to_csv(growth_data.daily_data, "growth_data.csv")
    
    # Export for data science
    x.export.to_parquet(growth_data.daily_data, "growth_data.parquet")
    
    # Export to database
    await x.export.to_database(
        growth_data,
        "postgresql://user:pass@host/db",
        table="growth_metrics"
    )
```

## Best Practices

1. **Analyze trends, not snapshots** - Look at data over time
2. **Compare fairly** - Use similar time periods for comparisons
3. **Account for seasonality** - Some periods are naturally slower
4. **Focus on actionable insights** - Optimize based on data
5. **Regular reviews** - Check analytics weekly at minimum

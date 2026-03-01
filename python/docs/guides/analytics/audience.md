# Audience Insights

Understand your Twitter audience through demographic analysis, interest mapping, and behavioral patterns to create more resonant content.

## Overview

Audience insights reveal who your followers are, what they care about, and how they interact with content. This knowledge enables targeted content creation, better engagement strategies, and more effective community building.

## Use Cases

- **Content Strategy**: Create content that resonates with your audience
- **Persona Development**: Build detailed audience personas
- **Partnership Targeting**: Find alignment for collaborations
- **Growth Strategy**: Identify similar audiences to target
- **Product Development**: Understand customer segments

## Basic Usage

```python
import asyncio
from xeepy import Xeepy
from xeepy.analytics import AudienceAnalyzer

async def analyze_audience():
    async with Xeepy() as x:
        analyzer = AudienceAnalyzer(x)
        
        # Get audience overview
        insights = await analyzer.get_insights(
            username="your_username",
            sample_size=500
        )
        
        print("Audience Overview:")
        print(f"  Total followers: {insights.total_followers:,}")
        print(f"  Verified followers: {insights.verified_count} ({insights.verified_pct:.1%})")
        print(f"  Avg follower count: {insights.avg_follower_count:,.0f}")
        print(f"  Median follower count: {insights.median_follower_count:,}")

asyncio.run(analyze_audience())
```

## Interest Analysis

```python
async def analyze_interests():
    async with Xeepy() as x:
        analyzer = AudienceAnalyzer(x)
        
        # Analyze follower interests from bios and tweets
        interests = await analyzer.interest_analysis(
            username="your_username",
            sample_size=300
        )
        
        print("Top Audience Interests:")
        print("-" * 50)
        
        for interest in interests.top_interests[:15]:
            bar = "█" * int(interest.percentage * 50)
            print(f"{interest.name:20} {bar} {interest.percentage:.1%}")
        
        print(f"\nInterest categories:")
        for category, pct in interests.categories.items():
            print(f"  {category}: {pct:.1%}")

asyncio.run(analyze_interests())
```

## Follower Size Distribution

```python
async def follower_distribution():
    async with Xeepy() as x:
        analyzer = AudienceAnalyzer(x)
        
        followers = await x.scrape.followers("your_username", limit=1000)
        
        # Categorize by follower size
        categories = {
            "Nano (0-1k)": 0,
            "Micro (1k-10k)": 0,
            "Mid (10k-100k)": 0,
            "Macro (100k-1M)": 0,
            "Mega (1M+)": 0
        }
        
        for f in followers:
            count = f.followers_count
            if count < 1000:
                categories["Nano (0-1k)"] += 1
            elif count < 10000:
                categories["Micro (1k-10k)"] += 1
            elif count < 100000:
                categories["Mid (10k-100k)"] += 1
            elif count < 1000000:
                categories["Macro (100k-1M)"] += 1
            else:
                categories["Mega (1M+)"] += 1
        
        print("Follower Size Distribution:")
        print("-" * 50)
        
        total = len(followers)
        for category, count in categories.items():
            pct = count / total * 100
            bar = "█" * int(pct / 2)
            print(f"{category:18} {bar} {pct:.1f}% ({count:,})")

asyncio.run(follower_distribution())
```

## Geographic Distribution

```python
async def geographic_analysis():
    async with Xeepy() as x:
        analyzer = AudienceAnalyzer(x)
        
        # Analyze location data from profiles
        geo = await analyzer.geographic_distribution(
            username="your_username",
            sample_size=500
        )
        
        print("Geographic Distribution:")
        print("-" * 50)
        
        print("\nTop Countries:")
        for country in geo.top_countries[:10]:
            bar = "█" * int(country.percentage * 30)
            print(f"{country.name:20} {bar} {country.percentage:.1%}")
        
        print("\nTop Cities:")
        for city in geo.top_cities[:10]:
            print(f"  {city.name}: {city.percentage:.1%}")
        
        print(f"\nPrimary language: {geo.primary_language}")

asyncio.run(geographic_analysis())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | str | required | Account to analyze |
| `sample_size` | int | 500 | Followers to sample |
| `include_tweets` | bool | True | Analyze follower tweets |
| `deep_analysis` | bool | False | Full profile analysis |

!!! tip "Sample Size Trade-offs"
    Larger samples provide more accurate insights but take longer. For accounts with 10k+ followers, a 500-1000 sample usually provides reliable data.

!!! note "Location Data Limitations"
    Only ~30% of Twitter users share location. Results represent users with location data, which may skew toward certain demographics.

## Activity Level Analysis

```python
async def activity_analysis():
    async with Xeepy() as x:
        analyzer = AudienceAnalyzer(x)
        
        followers = await x.scrape.followers("your_username", limit=500)
        
        # Categorize by activity
        active_today = 0
        active_week = 0
        active_month = 0
        dormant = 0
        
        from datetime import datetime, timedelta
        now = datetime.now()
        
        for f in followers:
            if f.last_tweet_date:
                days_ago = (now - f.last_tweet_date).days
                if days_ago <= 1:
                    active_today += 1
                elif days_ago <= 7:
                    active_week += 1
                elif days_ago <= 30:
                    active_month += 1
                else:
                    dormant += 1
        
        total = len(followers)
        print("Follower Activity Levels:")
        print(f"  Active today: {active_today} ({active_today/total*100:.1f}%)")
        print(f"  Active this week: {active_week} ({active_week/total*100:.1f}%)")
        print(f"  Active this month: {active_month} ({active_month/total*100:.1f}%)")
        print(f"  Dormant (30+ days): {dormant} ({dormant/total*100:.1f}%)")

asyncio.run(activity_analysis())
```

## Influential Followers

```python
async def find_influential_followers():
    async with Xeepy() as x:
        analyzer = AudienceAnalyzer(x)
        
        # Get most influential followers
        influential = await analyzer.influential_followers(
            username="your_username",
            limit=100,
            min_followers=10000
        )
        
        print("Most Influential Followers:")
        print("-" * 60)
        
        for user in influential[:20]:
            verified = "✓" if user.verified else " "
            print(f"{verified} @{user.username:20} {user.followers_count:>10,} followers")
            if user.bio:
                print(f"   {user.bio[:60]}...")
            print()

asyncio.run(find_influential_followers())
```

## Audience Overlap Analysis

```python
async def audience_overlap():
    async with Xeepy() as x:
        analyzer = AudienceAnalyzer(x)
        
        # Compare your audience with another account
        overlap = await analyzer.audience_overlap(
            username1="your_username",
            username2="similar_account",
            sample_size=500
        )
        
        print("Audience Overlap Analysis:")
        print("-" * 50)
        print(f"Your followers sampled: {overlap.sample1_size}")
        print(f"Their followers sampled: {overlap.sample2_size}")
        print(f"Overlap: {overlap.overlap_count} ({overlap.overlap_percentage:.1%})")
        print(f"\nShared followers:")
        
        for user in overlap.shared_followers[:10]:
            print(f"  @{user.username} ({user.followers_count:,} followers)")

asyncio.run(audience_overlap())
```

## Persona Development

```python
async def develop_personas():
    async with Xeepy() as x:
        analyzer = AudienceAnalyzer(x)
        
        # AI-powered persona generation
        personas = await analyzer.generate_personas(
            username="your_username",
            num_personas=3,
            sample_size=500
        )
        
        print("Audience Personas:")
        print("=" * 60)
        
        for i, persona in enumerate(personas, 1):
            print(f"\nPersona {i}: {persona.name}")
            print("-" * 40)
            print(f"Description: {persona.description}")
            print(f"Percentage: {persona.percentage:.1%} of audience")
            print(f"Interests: {', '.join(persona.interests)}")
            print(f"Goals: {', '.join(persona.goals)}")
            print(f"Content preferences: {', '.join(persona.content_preferences)}")
            print(f"Best engagement times: {persona.best_times}")

asyncio.run(develop_personas())
```

## Engagement Segmentation

```python
async def segment_by_engagement():
    async with Xeepy() as x:
        analyzer = AudienceAnalyzer(x)
        
        # Segment followers by their engagement with you
        segments = await analyzer.engagement_segments(
            username="your_username",
            days=30
        )
        
        print("Follower Engagement Segments:")
        print("-" * 50)
        
        print(f"\n🔥 Super Fans (engaged 10+ times): {len(segments.super_fans)}")
        for user in segments.super_fans[:5]:
            print(f"   @{user.username}: {user.engagement_count} interactions")
        
        print(f"\n💚 Regular Engagers (3-9 times): {len(segments.regulars)}")
        print(f"\n👋 Occasional (1-2 times): {len(segments.occasional)}")
        print(f"\n😴 Silent followers (0 times): {len(segments.silent)}")

asyncio.run(segment_by_engagement())
```

## Export Audience Data

```python
async def export_audience_report():
    async with Xeepy() as x:
        analyzer = AudienceAnalyzer(x)
        
        insights = await analyzer.comprehensive_report(
            username="your_username",
            sample_size=1000
        )
        
        report_data = {
            "overview": {
                "total_followers": insights.total_followers,
                "verified_pct": insights.verified_pct,
                "avg_follower_count": insights.avg_follower_count
            },
            "interests": [
                {"name": i.name, "percentage": i.percentage}
                for i in insights.interests.top_interests
            ],
            "geography": {
                "countries": insights.geography.top_countries,
                "cities": insights.geography.top_cities
            },
            "activity": insights.activity_levels,
            "influential": [
                {"username": u.username, "followers": u.followers_count}
                for u in insights.influential[:50]
            ]
        }
        
        x.export.to_json(report_data, "audience_report.json")
        print("Audience report exported to audience_report.json")

asyncio.run(export_audience_report())
```

## Best Practices

1. **Regular Updates**: Re-analyze quarterly as your audience evolves
2. **Combine Signals**: Use bio, tweets, and engagement for complete picture
3. **Focus on Active**: Weight analysis toward engaged followers
4. **Validate Personas**: Check personas against actual engagement data
5. **Act on Insights**: Use findings to inform content strategy
6. **Respect Privacy**: Use aggregate data, not individual tracking

## Related Guides

- [Growth Tracking](growth.md)
- [Engagement Analysis](engagement.md)
- [Smart Targeting](../ai/targeting.md)

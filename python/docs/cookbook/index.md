# Cookbook

Real-world recipes for X/Twitter success. These aren't tutorials—they're battle-tested workflows.

<div class="grid cards" markdown>

-   :material-trending-up:{ .lg .middle } __Growth Hacking__

    ---

    Proven strategies to grow your following fast

    [:octicons-arrow-right-24: Growth Recipes](growth/viral-content.md)

-   :material-robot:{ .lg .middle } __Automation Workflows__

    ---

    Set-and-forget automation scripts

    [:octicons-arrow-right-24: Automation](automation/scheduled-posts.md)

-   :material-chart-scatter-plot:{ .lg .middle } __Data Science__

    ---

    Advanced analytics and ML applications

    [:octicons-arrow-right-24: Data Science](data-science/sentiment-dashboard.md)

-   :material-briefcase:{ .lg .middle } __Business Intelligence__

    ---

    Competitive intelligence and lead gen

    [:octicons-arrow-right-24: Business](business/competitor-intel.md)

-   :material-school:{ .lg .middle } __Research__

    ---

    Academic and journalism applications

    [:octicons-arrow-right-24: Research](research/academic-scraping.md)

</div>

## Quick Wins

Copy-paste scripts for immediate results:

### 🧹 Clean Your Following (5 minutes)

```python
import asyncio
from xeepy import Xeepy

async def quick_cleanup():
    async with Xeepy() as x:
        result = await x.unfollow.non_followers(
            max_unfollows=50,
            min_following_days=7,
            exclude_verified=True,
            dry_run=False
        )
        print(f"✅ Unfollowed {result.success_count} non-followers")

asyncio.run(quick_cleanup())
```

### 📈 Daily Growth Script

```python
import asyncio
from xeepy import Xeepy

async def daily_growth():
    async with Xeepy() as x:
        # Follow 50 users in your niche
        await x.follow.by_keyword(
            ["your", "niche", "keywords"],
            max_follows=50
        )
        
        # Like 30 tweets
        await x.engage.auto_like(
            keywords=["your niche"],
            max_likes=30
        )
        
        # Check stats
        me = await x.scrape.profile("me")
        print(f"Followers: {me.followers_count} | Following: {me.following_count}")

asyncio.run(daily_growth())
```

### 🔍 Competitor Analysis

```python
import asyncio
from xeepy import Xeepy

async def analyze_competitor(username: str):
    async with Xeepy() as x:
        profile = await x.scrape.profile(username)
        tweets = await x.scrape.tweets(username, limit=100)
        
        # Calculate engagement rate
        total_engagement = sum(t.likes + t.retweets for t in tweets)
        avg_engagement = total_engagement / len(tweets)
        engagement_rate = (avg_engagement / profile.followers_count) * 100
        
        print(f"@{username} Analysis:")
        print(f"  Followers: {profile.followers_count:,}")
        print(f"  Avg Engagement: {avg_engagement:.0f}")
        print(f"  Engagement Rate: {engagement_rate:.2f}%")
        
        # Top performing content
        top_tweets = sorted(tweets, key=lambda t: t.likes, reverse=True)[:5]
        print(f"\nTop Tweets:")
        for t in top_tweets:
            print(f"  - {t.text[:60]}... ({t.likes} likes)")

asyncio.run(analyze_competitor("competitor_username"))
```

## Featured Recipes

### 🎯 The Ghost Follower Detector

Find and remove followers who never engage:

```python
import asyncio
from xeepy import Xeepy
from collections import defaultdict

async def detect_ghost_followers():
    """Find followers who never engage with your content"""
    
    async with Xeepy() as x:
        # Get your recent tweets
        my_tweets = await x.scrape.tweets("me", limit=50)
        
        # Get all engagers
        engager_counts = defaultdict(int)
        
        for tweet in my_tweets:
            likers = await x.scrape.likers(tweet.url, limit=100)
            for user in likers:
                engager_counts[user.username] += 1
        
        # Get your followers
        followers = await x.scrape.followers("me", limit=1000)
        follower_usernames = {f.username for f in followers}
        
        # Find ghosts (followers who never engage)
        engagers = set(engager_counts.keys())
        ghosts = follower_usernames - engagers
        
        print(f"📊 Ghost Follower Analysis")
        print(f"   Total followers: {len(follower_usernames)}")
        print(f"   Active engagers: {len(engagers & follower_usernames)}")
        print(f"   Ghost followers: {len(ghosts)} ({len(ghosts)/len(follower_usernames)*100:.1f}%)")
        
        return list(ghosts)

asyncio.run(detect_ghost_followers())
```

### 🌙 The Sleep Schedule Optimizer

Post when your audience is most active:

```python
import asyncio
from xeepy import Xeepy
from collections import Counter
from datetime import datetime

async def find_optimal_post_times():
    """Analyze when your audience engages most"""
    
    async with Xeepy() as x:
        # Get your followers' recent activity
        followers = await x.scrape.followers("me", limit=200)
        
        activity_hours = Counter()
        
        for follower in followers[:50]:  # Sample 50 followers
            tweets = await x.scrape.tweets(follower.username, limit=20)
            
            for tweet in tweets:
                hour = tweet.created_at.hour
                activity_hours[hour] += 1
        
        # Find peak hours
        total = sum(activity_hours.values())
        print("📊 Audience Activity by Hour (your timezone)")
        print("="*50)
        
        for hour in range(24):
            count = activity_hours.get(hour, 0)
            pct = (count / total * 100) if total > 0 else 0
            bar = "█" * int(pct / 2)
            time_str = f"{hour:02d}:00"
            print(f"{time_str} | {bar} {pct:.1f}%")
        
        # Top 3 hours
        top_hours = activity_hours.most_common(3)
        print(f"\n🎯 Best times to post: {', '.join(f'{h}:00' for h, _ in top_hours)}")

asyncio.run(find_optimal_post_times())
```

## Advanced Patterns

These recipes combine multiple Xeepy features:

- [Viral Content Detector](growth/viral-content.md) - Find trends before they peak
- [Engagement Pod Automation](growth/engagement-pods.md) - Coordinate with allies
- [Sentiment Dashboard](data-science/sentiment-dashboard.md) - Real-time brand monitoring
- [Lead Generation Pipeline](business/lead-generation.md) - Find and qualify prospects
- [Crisis Detection System](business/crisis-detection.md) - Early warning for brand issues

# Quick Start

Get productive with Xeepy in 5 minutes. This guide covers the most common use cases with copy-paste examples.

## Prerequisites

```bash
# Make sure you've completed installation
pip install xeepy[all]
playwright install chromium

# And authenticated
xeepy auth login
```

## Your First Scrape

Let's scrape replies to a tweet:

```python
import asyncio
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Scrape replies to any tweet
        replies = await x.scrape.replies(
            "https://x.com/elonmusk/status/1234567890",
            limit=100
        )
        
        # Print results
        for reply in replies:
            print(f"@{reply.author.username}: {reply.text}")
        
        # Export to CSV
        x.export.to_csv(replies, "replies.csv")
        print(f"✓ Saved {len(replies)} replies to replies.csv")

asyncio.run(main())
```

Run it:
```bash
python scrape_replies.py
```

## 5 Essential Operations

### 1. Scrape Any Data

```python
async with Xeepy() as x:
    # Get user profile
    profile = await x.scrape.profile("elonmusk")
    print(f"{profile.name} has {profile.followers_count:,} followers")
    
    # Get user's tweets
    tweets = await x.scrape.tweets("elonmusk", limit=50)
    
    # Get followers list
    followers = await x.scrape.followers("elonmusk", limit=500)
    
    # Search tweets
    results = await x.scrape.search("python programming", limit=100)
    
    # Get hashtag tweets
    hashtag_tweets = await x.scrape.hashtag("#buildinpublic", limit=100)
```

### 2. Follow & Unfollow

```python
async with Xeepy() as x:
    # Follow a user
    await x.follow.user("naval")
    
    # Follow users by hashtag
    await x.follow.by_hashtag("#startup", limit=20)
    
    # Unfollow non-followers (most popular feature!)
    result = await x.unfollow.non_followers(
        max_unfollows=50,
        whitelist=["important_friend", "business_partner"]
    )
    print(f"Unfollowed {result.unfollowed_count} users")
```

### 3. Monitor Your Account

```python
async with Xeepy() as x:
    # Check who unfollowed you
    report = await x.monitor.unfollowers()
    print(f"Lost {len(report.unfollowers)} followers since last check")
    
    # Track growth over time
    growth = await x.analytics.track_growth(period="7d")
    print(f"Net change: {growth.net_followers:+d} followers")
    
    # Find best posting times
    best_times = await x.analytics.best_time_to_post()
    print(f"Best time to post: {best_times[0]}")
```

### 4. Engage with Content

```python
async with Xeepy() as x:
    # Like a tweet
    await x.engage.like("https://x.com/user/status/123")
    
    # Retweet
    await x.engage.retweet("https://x.com/user/status/123")
    
    # Reply to a tweet
    await x.engage.reply(
        "https://x.com/user/status/123",
        "Great thread! 🔥"
    )
    
    # Auto-like tweets by keyword
    await x.engage.auto_like(
        keywords=["python", "opensource"],
        limit=20
    )
```

### 5. Export Data

```python
async with Xeepy() as x:
    data = await x.scrape.followers("username", limit=1000)
    
    # Export options
    x.export.to_csv(data, "followers.csv")
    x.export.to_json(data, "followers.json")
    x.export.to_excel(data, "followers.xlsx")
    
    # Export to database
    await x.export.to_database(data, "sqlite:///xeepy.db")
```

## CLI Quick Reference

Don't want to write Python? Use the CLI:

```bash
# Scrape replies
xeepy scrape replies https://x.com/user/status/123 -o replies.csv

# Get profile info
xeepy scrape profile elonmusk

# Unfollow non-followers (dry run first!)
xeepy unfollow non-followers --dry-run
xeepy unfollow non-followers --max 50

# Check unfollowers
xeepy monitor unfollowers

# Search tweets
xeepy scrape search "python tips" --limit 100 -o results.csv

# Growth report
xeepy analytics growth --period 30d
```

## Real-World Examples

### Example 1: Research Thread Engagement

```python
"""Find which of your threads performed best"""
import asyncio
from xeepy import Xeepy

async def analyze_threads():
    async with Xeepy() as x:
        # Get your own tweets
        my_tweets = await x.scrape.tweets("yourusername", limit=200)
        
        # Filter to threads (tweets with replies to self)
        threads = [t for t in my_tweets if t.is_thread_start]
        
        # Sort by engagement
        threads.sort(key=lambda t: t.engagement_rate, reverse=True)
        
        print("🧵 Your Top Performing Threads:")
        for i, thread in enumerate(threads[:10], 1):
            print(f"{i}. {thread.text[:50]}...")
            print(f"   ❤️ {thread.likes} | 🔁 {thread.retweets} | 💬 {thread.replies}")
            print()

asyncio.run(analyze_threads())
```

### Example 2: Competitor Analysis

```python
"""Analyze what content works for competitors"""
import asyncio
from xeepy import Xeepy

async def analyze_competitor():
    async with Xeepy() as x:
        competitor = "competitor_handle"
        
        # Get their recent tweets
        tweets = await x.scrape.tweets(competitor, limit=100)
        
        # Analyze engagement patterns
        analysis = await x.analytics.engagement_analysis(tweets)
        
        print(f"📊 @{competitor} Analysis:")
        print(f"Avg likes: {analysis.avg_likes:.0f}")
        print(f"Avg retweets: {analysis.avg_retweets:.0f}")
        print(f"Best posting day: {analysis.best_day}")
        print(f"Best posting hour: {analysis.best_hour}:00")
        print(f"Top hashtags: {', '.join(analysis.top_hashtags[:5])}")
        
        # Their best performing tweet
        top_tweet = max(tweets, key=lambda t: t.likes)
        print(f"\n🏆 Top Tweet ({top_tweet.likes:,} likes):")
        print(f"   {top_tweet.text[:100]}...")

asyncio.run(analyze_competitor())
```

### Example 3: Daily Automation Script

```python
"""Daily automation: clean up follows, engage, report"""
import asyncio
from xeepy import Xeepy

async def daily_routine():
    async with Xeepy() as x:
        print("🌅 Starting daily routine...")
        
        # 1. Check for new unfollowers
        unfollower_report = await x.monitor.unfollowers()
        print(f"📉 {len(unfollower_report.unfollowers)} new unfollowers")
        
        # 2. Unfollow non-followers (limit 25/day to be safe)
        unfollow_result = await x.unfollow.non_followers(max_unfollows=25)
        print(f"👋 Unfollowed {unfollow_result.unfollowed_count} non-followers")
        
        # 3. Follow people from target hashtag
        await x.follow.by_hashtag("#buildinpublic", limit=10)
        print(f"➕ Followed 10 people from #buildinpublic")
        
        # 4. Like tweets in your niche
        liked = await x.engage.auto_like(
            keywords=["indie hacker", "saas", "startup"],
            limit=20
        )
        print(f"❤️ Liked {len(liked)} tweets")
        
        # 5. Generate growth report
        growth = await x.analytics.track_growth(period="24h")
        print(f"\n📊 24h Summary:")
        print(f"   Followers: {growth.followers_count:,} ({growth.net_followers:+d})")
        print(f"   Following: {growth.following_count:,}")
        
        print("\n✅ Daily routine complete!")

asyncio.run(daily_routine())
```

## Configuration

Create `xeepy.toml` in your project:

```toml
[xeepy]
# Browser settings
headless = true
timeout = 30000

# Rate limiting (requests per minute)
rate_limit = 20

# Default export format
export_format = "csv"

# Session file
session_file = "~/.config/xeepy/session.json"

[xeepy.proxy]
# Optional: Use proxy
enabled = false
url = "http://user:pass@proxy:8080"

[xeepy.notifications]
# Get notified on errors
discord_webhook = "https://discord.com/api/webhooks/..."
```

## What's Next?

Now that you've got the basics, explore:

<div class="grid cards" markdown>

-   **[Scraping Guide](../guides/scraping/index.md)**
    
    Master all scraping features: replies, followers, search, and more

-   **[Growth Cookbook](../cookbook/growth/index.md)**
    
    Proven strategies for growing your X presence

-   **[AI Features](../guides/ai/index.md)**
    
    Generate replies, analyze sentiment, detect bots

-   **[Analytics](../guides/analytics/index.md)**
    
    Deep insights into your account performance

</div>

---

Next: [Build Your First Complete Script](first-script.md) →

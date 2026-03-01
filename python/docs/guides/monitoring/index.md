# Monitoring Guide

Xeepy provides comprehensive monitoring capabilities to track your account, detect changes, and stay informed about your X/Twitter presence.

## Overview

<div class="grid cards" markdown>

-   :material-account-remove:{ .lg .middle } **[Unfollower Detection](unfollowers.md)**
    
    Know when someone unfollows you

-   :material-chart-line:{ .lg .middle } **[Growth Tracking](growth.md)**
    
    Track follower changes over time

-   :material-account-eye:{ .lg .middle } **[Account Monitoring](accounts.md)**
    
    Watch specific accounts for changes

-   :material-tag-search:{ .lg .middle } **[Keyword Monitoring](keywords.md)**
    
    Get alerts when keywords are mentioned

-   :material-heart-pulse:{ .lg .middle } **[Engagement Tracking](engagement.md)**
    
    Monitor likes, retweets, replies

</div>

## Quick Start

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Check who unfollowed you
    report = await x.monitor.unfollowers()
    
    print(f"New unfollowers: {len(report.unfollowers)}")
    print(f"New followers: {len(report.new_followers)}")
    
    for user in report.unfollowers:
        print(f"  - @{user} unfollowed you")
```

## Unfollower Detection

Track when users unfollow you:

```python
async with Xeepy() as x:
    # Basic unfollower check
    report = await x.monitor.unfollowers()
    
    # With history comparison
    report = await x.monitor.unfollowers(
        compare_to="24h",  # Compare to 24 hours ago
        notify=True        # Send notification
    )
    
    print(f"""
    📊 Follower Report
    ─────────────────
    Current followers: {report.current_count:,}
    New followers: +{len(report.new_followers)}
    Unfollowers: -{len(report.unfollowers)}
    Net change: {report.net_change:+d}
    """)
```

### Detailed Unfollower Info

```python
async with Xeepy() as x:
    report = await x.monitor.unfollowers(include_details=True)
    
    for unfollower in report.unfollowers_detailed:
        print(f"@{unfollower.username}")
        print(f"  Followers: {unfollower.followers_count:,}")
        print(f"  Following: {unfollower.following_count:,}")
        print(f"  Last tweet: {unfollower.last_tweet_date}")
        print(f"  Followed you for: {unfollower.days_following} days")
```

### Schedule Unfollower Checks

```python
import asyncio
from xeepy import Xeepy

async def monitor_unfollowers():
    """Check for unfollowers every hour"""
    async with Xeepy() as x:
        while True:
            report = await x.monitor.unfollowers()
            
            if report.unfollowers:
                # Send alert
                await x.notify.discord(
                    f"⚠️ Lost {len(report.unfollowers)} followers: " +
                    ", ".join(f"@{u}" for u in report.unfollowers[:5])
                )
            
            await asyncio.sleep(3600)  # Check every hour
```

## Growth Tracking

Monitor your account growth over time:

```python
async with Xeepy() as x:
    # Track growth for different periods
    growth_day = await x.monitor.growth(period="24h")
    growth_week = await x.monitor.growth(period="7d")
    growth_month = await x.monitor.growth(period="30d")
    
    print(f"""
    📈 Growth Report
    ─────────────────
    Last 24h: {growth_day.net_change:+d} followers
    Last 7d:  {growth_week.net_change:+d} followers
    Last 30d: {growth_month.net_change:+d} followers
    
    Average daily: {growth_month.avg_daily_change:+.1f}
    Growth rate: {growth_month.growth_rate:.2%}
    """)
```

### Growth Trends

```python
async with Xeepy() as x:
    trends = await x.monitor.growth_trends(period="30d")
    
    # Daily breakdown
    for day in trends.daily_data:
        print(f"{day.date}: {day.followers:,} ({day.change:+d})")
    
    # Identify best/worst days
    print(f"Best day: {trends.best_day.date} (+{trends.best_day.change})")
    print(f"Worst day: {trends.worst_day.date} ({trends.worst_day.change})")
```

## Account Monitoring

Watch specific accounts for changes:

```python
async with Xeepy() as x:
    # Monitor competitor accounts
    competitors = ["competitor1", "competitor2"]
    
    for account in competitors:
        changes = await x.monitor.account(account)
        
        if changes.has_changes:
            print(f"@{account} changes:")
            if changes.bio_changed:
                print(f"  Bio: {changes.old_bio} → {changes.new_bio}")
            if changes.name_changed:
                print(f"  Name: {changes.old_name} → {changes.new_name}")
            if changes.followers_changed:
                print(f"  Followers: {changes.follower_change:+d}")
```

### Watch for Specific Events

```python
async with Xeepy() as x:
    # Get notified when account posts
    await x.monitor.watch_account(
        "target_user",
        events=["new_tweet", "new_thread", "pinned_change"],
        callback=my_notification_handler
    )
```

## Keyword Monitoring

Track mentions of keywords across X:

```python
async with Xeepy() as x:
    # Monitor keywords in real-time
    await x.monitor.keywords(
        keywords=["your_brand", "your_product", "@yourusername"],
        callback=handle_mention
    )

async def handle_mention(tweet):
    """Called when keyword is found"""
    print(f"Found mention: {tweet.text}")
    
    # Auto-respond, like, or notify
    if tweet.sentiment > 0.5:
        await x.engage.like(tweet.url)
```

### Scheduled Keyword Search

```python
async with Xeepy() as x:
    # Search for keywords periodically
    results = await x.monitor.keyword_search(
        keywords=["python tips", "learn python"],
        since="1h",  # Last hour
        min_engagement=10
    )
    
    for tweet in results:
        print(f"@{tweet.author.username}: {tweet.text[:100]}")
```

## Engagement Monitoring

Track engagement on your tweets:

```python
async with Xeepy() as x:
    # Monitor engagement on recent tweets
    engagement = await x.monitor.my_engagement(period="7d")
    
    print(f"""
    💬 Engagement Report (7d)
    ─────────────────────────
    Total likes: {engagement.total_likes:,}
    Total retweets: {engagement.total_retweets:,}
    Total replies: {engagement.total_replies:,}
    
    Avg per tweet: {engagement.avg_per_tweet:.1f}
    Engagement rate: {engagement.rate:.2%}
    
    Top tweet: {engagement.top_tweet.text[:50]}...
      ({engagement.top_tweet.likes:,} likes)
    """)
```

### Per-Tweet Monitoring

```python
async with Xeepy() as x:
    # Watch a specific tweet's performance
    tweet_url = "https://x.com/you/status/123456789"
    
    performance = await x.monitor.tweet_performance(
        tweet_url,
        duration="24h",
        interval="1h"
    )
    
    for snapshot in performance.timeline:
        print(f"{snapshot.time}: {snapshot.likes} likes, {snapshot.retweets} RTs")
```

## Notifications Integration

Connect monitoring to notifications:

```python
from xeepy import Xeepy
from xeepy.notifications import DiscordNotifier, TelegramNotifier

async with Xeepy() as x:
    discord = DiscordNotifier(webhook_url="...")
    telegram = TelegramNotifier(token="...", chat_id="...")
    
    # Configure notification triggers
    x.monitor.on_unfollower(lambda u: discord.send(f"Lost follower: @{u}"))
    x.monitor.on_new_follower(lambda u: telegram.send(f"New follower: @{u}"))
    x.monitor.on_mention(lambda t: discord.send(f"Mentioned: {t.text[:100]}"))
    
    # Start monitoring
    await x.monitor.start()
```

## CLI Commands

```bash
# Check unfollowers
xeepy monitor unfollowers

# Track growth
xeepy monitor growth --period 7d

# Watch keywords
xeepy monitor keywords "python,automation" --notify discord

# Monitor account
xeepy monitor account competitor_username --watch

# Full monitoring daemon
xeepy monitor start --config monitoring.yaml
```

## Monitoring Configuration

Create `monitoring.yaml`:

```yaml
monitoring:
  # Unfollower detection
  unfollowers:
    enabled: true
    check_interval: 3600  # seconds
    notify:
      - discord
      - email
  
  # Growth tracking
  growth:
    enabled: true
    periods: ["24h", "7d", "30d"]
    snapshot_interval: 86400
  
  # Keyword monitoring
  keywords:
    enabled: true
    terms:
      - "your_brand"
      - "@yourusername"
      - "your_product"
    min_engagement: 5
  
  # Account watching
  accounts:
    enabled: true
    watch:
      - competitor1
      - competitor2
    events:
      - new_tweet
      - follower_milestone
  
  # Notifications
  notifications:
    discord:
      webhook: ${DISCORD_WEBHOOK}
    telegram:
      token: ${TELEGRAM_TOKEN}
      chat_id: ${TELEGRAM_CHAT_ID}
    email:
      to: you@example.com
```

## Best Practices

1. **Start simple** - Begin with unfollower detection
2. **Set reasonable intervals** - Don't check too frequently
3. **Filter noise** - Set minimum engagement thresholds
4. **Prioritize alerts** - Not everything needs a notification
5. **Review regularly** - Check monitoring reports weekly

## Data Storage

Monitoring data is stored automatically:

```python
async with Xeepy() as x:
    # Access historical data
    history = await x.monitor.get_history(
        metric="followers",
        period="90d"
    )
    
    # Export for analysis
    x.export.to_csv(history, "follower_history.csv")
```

# Unfollower Detection

Track exactly who unfollowed you, when, and get insights on why.

## Basic Unfollower Check

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Get unfollower report
    report = await x.monitor.unfollowers()
    
    print(f"📉 Unfollowers: {len(report.unfollowers)}")
    print(f"📈 New Followers: {len(report.new_followers)}")
    print(f"📊 Net Change: {report.net_change:+d}")

# Detailed unfollower info
async with Xeepy() as x:
    report = await x.monitor.unfollowers(detailed=True)
    
    for user in report.unfollowers:
        print(f"\n@{user.username}")
        print(f"  Followers: {user.followers_count:,}")
        print(f"  Was following you since: {user.followed_since}")
        print(f"  Last interaction: {user.last_interaction}")
```

## How It Works

Xeepy tracks your followers by:

1. **First Run**: Saves complete follower list as baseline
2. **Subsequent Runs**: Compares current followers to baseline
3. **Detection**: Identifies additions and removals
4. **Storage**: Updates baseline for next comparison

```python
# First run creates baseline
async with Xeepy() as x:
    report = await x.monitor.unfollowers()
    # report.unfollowers = []  (no baseline yet)
    # report.message = "Baseline created with 5,432 followers"

# Second run (24 hours later)
async with Xeepy() as x:
    report = await x.monitor.unfollowers()
    # report.unfollowers = [user1, user2, user3]  # Detected!
    # report.new_followers = [user4, user5]
```

## Data Storage Options

### File-Based (Default)

```python
# Stores in ~/.xeepy/followers_baseline.json
async with Xeepy() as x:
    report = await x.monitor.unfollowers()
```

### Custom Storage Location

```python
async with Xeepy(storage_path="/custom/path") as x:
    report = await x.monitor.unfollowers()
```

### SQLite Database

```python
from xeepy import Xeepy
from xeepy.storage import SQLiteStorage

# Use SQLite for better querying
storage = SQLiteStorage("followers.db")

async with Xeepy(storage=storage) as x:
    report = await x.monitor.unfollowers()
    
    # Query historical data
    history = storage.get_unfollower_history(days=30)
    print(f"Total unfollowers (30 days): {len(history)}")
```

## Advanced Analysis

### Unfollower Patterns

```python
async def analyze_unfollower_patterns():
    """Understand why people unfollow"""
    
    async with Xeepy() as x:
        report = await x.monitor.unfollowers(detailed=True)
        
        # Categorize unfollowers
        categories = {
            "high_value": [],    # 10k+ followers
            "recent": [],        # Followed < 7 days
            "inactive": [],      # No tweets in 30 days
            "mass_unfollower": [], # Unfollows many people
            "competitor": [],    # Follows competitors
        }
        
        for user in report.unfollowers:
            # High value (potential influencer)
            if user.followers_count >= 10000:
                categories["high_value"].append(user)
            
            # Recent follower (didn't stick)
            if user.followed_days < 7:
                categories["recent"].append(user)
            
            # Inactive account
            if user.days_since_last_tweet > 30:
                categories["inactive"].append(user)
            
            # Mass unfollower
            if user.recent_unfollows > 50:
                categories["mass_unfollower"].append(user)
        
        # Print analysis
        print("📊 Unfollower Analysis")
        print("=" * 50)
        
        for category, users in categories.items():
            if users:
                print(f"\n{category}: {len(users)}")
                for u in users[:3]:
                    print(f"  @{u.username} ({u.followers_count:,})")
        
        return categories
```

### High-Value Unfollower Alerts

```python
async def alert_vip_unfollowers(min_followers: int = 10000):
    """Alert when important people unfollow"""
    
    async with Xeepy() as x:
        report = await x.monitor.unfollowers()
        
        vips = [u for u in report.unfollowers if u.followers_count >= min_followers]
        
        if vips:
            message = f"🚨 {len(vips)} VIP unfollower(s):\n\n"
            
            for user in vips:
                message += f"@{user.username} ({user.followers_count:,} followers)\n"
                message += f"Bio: {user.bio[:100]}...\n\n"
            
            # Send alert
            await x.notify.discord(
                webhook_url="...",
                content=message
            )
            
            await x.notify.telegram(
                bot_token="...",
                chat_id="...",
                message=message
            )
        
        return vips
```

## Scheduled Monitoring

### Daily Check Script

```python
#!/usr/bin/env python3
"""daily_unfollower_check.py - Run via cron"""

import asyncio
from datetime import datetime
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        report = await x.monitor.unfollowers()
        
        # Format report
        date = datetime.now().strftime("%Y-%m-%d")
        
        summary = f"""
📊 Daily Follower Report - {date}
{'='*40}

📉 Lost: {len(report.unfollowers)}
📈 Gained: {len(report.new_followers)}  
📊 Net: {report.net_change:+d}

"""
        
        if report.unfollowers:
            summary += "Top Unfollowers:\n"
            for u in sorted(report.unfollowers, key=lambda x: -x.followers_count)[:5]:
                summary += f"  • @{u.username} ({u.followers_count:,})\n"
        
        if report.new_followers:
            summary += "\nTop New Followers:\n"
            for u in sorted(report.new_followers, key=lambda x: -x.followers_count)[:5]:
                summary += f"  • @{u.username} ({u.followers_count:,})\n"
        
        # Send via Discord
        await x.notify.discord(webhook_url="...", content=summary)
        
        # Save to log
        with open("unfollower_log.txt", "a") as f:
            f.write(summary + "\n")
        
        print(summary)

if __name__ == "__main__":
    asyncio.run(main())
```

### Cron Setup

```bash
# Run daily at 9 AM
0 9 * * * /usr/bin/python3 /path/to/daily_unfollower_check.py

# Run every 6 hours
0 */6 * * * /usr/bin/python3 /path/to/daily_unfollower_check.py
```

## Unfollower Recovery

### Win-Back Campaign

```python
async def unfollower_winback(days: int = 7, message_template: str = None):
    """Attempt to win back recent unfollowers"""
    
    async with Xeepy() as x:
        # Get recent unfollowers from database
        recent_unfollowers = await x.monitor.get_unfollower_history(days=days)
        
        # Filter for recoverable accounts
        targets = [
            u for u in recent_unfollowers
            if u.followers_count > 100  # Not a bot
            and u.followed_days > 30    # Was a real follower
            and not u.is_protected      # Can interact
        ]
        
        print(f"Found {len(targets)} potential win-back targets")
        
        for user in targets[:10]:  # Limit to avoid spam
            # Engage with their recent content
            tweets = await x.scrape.tweets(user.username, limit=5)
            
            if tweets:
                # Like their tweet
                await x.engage.like(tweets[0].url)
                print(f"✓ Liked @{user.username}'s tweet")
            
            await asyncio.sleep(60)  # Be gentle
        
        return targets
```

## Metrics & Analytics

### Historical Trends

```python
from datetime import datetime, timedelta
import matplotlib.pyplot as plt

async def plot_unfollower_trends(days: int = 30):
    """Visualize unfollower patterns"""
    
    async with Xeepy() as x:
        history = await x.monitor.get_unfollower_history(days=days)
        
        # Group by date
        daily_counts = {}
        for record in history:
            date = record.timestamp.date()
            daily_counts[date] = daily_counts.get(date, 0) + 1
        
        # Plot
        dates = list(daily_counts.keys())
        counts = list(daily_counts.values())
        
        plt.figure(figsize=(12, 6))
        plt.bar(dates, counts, color='red', alpha=0.7)
        plt.xlabel('Date')
        plt.ylabel('Unfollowers')
        plt.title(f'Daily Unfollowers - Last {days} Days')
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig('unfollower_trends.png')
        
        print(f"Chart saved to unfollower_trends.png")
        
        # Summary stats
        total = sum(counts)
        avg = total / days
        max_day = max(daily_counts.items(), key=lambda x: x[1])
        
        print(f"\nSummary:")
        print(f"  Total unfollowers: {total}")
        print(f"  Average per day: {avg:.1f}")
        print(f"  Worst day: {max_day[0]} ({max_day[1]} unfollowers)")
```

### Correlation Analysis

```python
async def correlate_unfollows_with_content():
    """Find if specific content causes unfollows"""
    
    async with Xeepy() as x:
        # Get unfollower timestamps
        unfollowers = await x.monitor.get_unfollower_history(days=30)
        
        # Get your tweets
        my_tweets = await x.scrape.tweets("your_username", limit=100)
        
        # Correlate
        correlations = []
        
        for tweet in my_tweets:
            # Count unfollows within 24 hours of tweet
            tweet_time = tweet.created_at
            unfollows_after = [
                u for u in unfollowers
                if tweet_time <= u.timestamp <= tweet_time + timedelta(hours=24)
            ]
            
            if unfollows_after:
                correlations.append({
                    "tweet": tweet.text[:100],
                    "unfollows": len(unfollows_after),
                    "posted_at": tweet_time
                })
        
        # Sort by unfollows
        correlations.sort(key=lambda x: -x["unfollows"])
        
        print("Tweets potentially causing unfollows:")
        for c in correlations[:5]:
            print(f"\n  {c['unfollows']} unfollows after:")
            print(f"  '{c['tweet']}...'")
```

## Export & Reporting

```python
async def export_unfollower_report(format: str = "all"):
    """Export detailed unfollower reports"""
    
    async with Xeepy() as x:
        report = await x.monitor.unfollowers(detailed=True)
        history = await x.monitor.get_unfollower_history(days=30)
        
        if format in ["csv", "all"]:
            x.export.to_csv(report.unfollowers, "unfollowers.csv")
            x.export.to_csv(history, "unfollower_history.csv")
        
        if format in ["json", "all"]:
            x.export.to_json({
                "current": [u.__dict__ for u in report.unfollowers],
                "history": [u.__dict__ for u in history],
                "summary": {
                    "total_unfollowers": len(report.unfollowers),
                    "new_followers": len(report.new_followers),
                    "net_change": report.net_change
                }
            }, "unfollower_report.json")
        
        if format in ["excel", "all"]:
            x.export.to_excel({
                "Current Unfollowers": report.unfollowers,
                "30-Day History": history,
                "New Followers": report.new_followers
            }, "unfollower_report.xlsx")
        
        print("Reports exported!")
```

## Best Practices

!!! tip "Monitoring Tips"
    - Run checks at consistent times for accurate comparison
    - Don't obsess over every unfollower
    - Focus on high-value unfollowers
    - Look for patterns, not individual events

!!! warning "Avoid Over-Reaction"
    - Some unfollows are bots/spam being cleaned
    - Inactive accounts get deleted
    - Focus on net growth, not individual losses
    - Don't harass unfollowers

!!! info "Database Recommendation"
    For serious monitoring, use SQLite storage:
    ```python
    from xeepy.storage import SQLiteStorage
    storage = SQLiteStorage("followers.db")
    ```
    This enables historical queries and trend analysis.

## Next Steps

[:octicons-arrow-right-24: Growth Analytics](growth.md) - Track overall growth

[:octicons-arrow-right-24: Account Monitoring](accounts.md) - Watch specific accounts

[:octicons-arrow-right-24: Non-Follower Unfollow](../actions/unfollow.md) - Unfollow non-followers

# AccountMonitor

Monitor account changes, security events, and activity on X/Twitter.

## Import

```python
from xeepy.monitoring.account import AccountMonitor
```

## Class Signature

```python
class AccountMonitor:
    def __init__(
        self,
        browser_manager: BrowserManager,
        storage: Optional[Storage] = None
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `browser_manager` | `BrowserManager` | Required | Browser manager instance |
| `storage` | `Optional[Storage]` | `None` | Storage for tracking history |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `track_changes(username)` | `ChangeReport` | Track profile changes |
| `get_activity(username)` | `ActivityReport` | Get account activity |
| `monitor(username, callback)` | `None` | Start continuous monitoring |
| `get_login_history()` | `List[LoginEvent]` | Get login history |
| `compare_snapshots(old, new)` | `ChangeReport` | Compare two snapshots |

### `track_changes`

```python
async def track_changes(
    self,
    username: Optional[str] = None
) -> ChangeReport
```

Track changes in an account since last check.

**Parameters:**
- `username`: Username to track (default: logged-in user)

### `get_activity`

```python
async def get_activity(
    self,
    username: Optional[str] = None,
    days: int = 7
) -> ActivityReport
```

Get account activity summary.

### `monitor`

```python
async def monitor(
    self,
    username: str,
    callback: Callable[[ChangeReport], Awaitable[None]],
    interval: int = 3600,
    track: List[str] = None
) -> None
```

Start continuous monitoring for account changes.

**Parameters:**
- `username`: Account to monitor
- `callback`: Async function called on changes
- `interval`: Check interval in seconds
- `track`: Specific changes to track (`bio`, `followers`, `name`, `avatar`, etc.)

## ChangeReport Object

```python
@dataclass
class ChangeReport:
    username: str                    # Account username
    changes: List[Change]            # Detected changes
    old_snapshot: AccountSnapshot    # Previous state
    new_snapshot: AccountSnapshot    # Current state
    detected_at: datetime            # When detected
```

## Change Object

```python
@dataclass
class Change:
    field: str                       # What changed (bio, name, etc.)
    old_value: Any                   # Previous value
    new_value: Any                   # New value
    changed_at: datetime             # When changed
```

## ActivityReport Object

```python
@dataclass
class ActivityReport:
    username: str                    # Account username
    tweets_posted: int               # Tweets in period
    replies_sent: int                # Replies sent
    likes_given: int                 # Likes given
    retweets_made: int               # Retweets made
    avg_tweets_per_day: float        # Average daily tweets
    most_active_hour: int            # Most active hour (UTC)
    most_active_day: str             # Most active day
    engagement_rate: float           # Engagement rate
```

## Usage Examples

### Track Profile Changes

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        report = await x.monitor.track_changes("username")
        
        if report.changes:
            print(f"Changes detected for @{report.username}:")
            for change in report.changes:
                print(f"  {change.field}:")
                print(f"    Old: {change.old_value}")
                print(f"    New: {change.new_value}")
        else:
            print("No changes detected")

asyncio.run(main())
```

### Monitor Account Continuously

```python
from xeepy import Xeepy

async def on_change(report):
    if report.changes:
        print(f"@{report.username} changed their profile!")
        for change in report.changes:
            print(f"  - {change.field} changed")

async def main():
    async with Xeepy() as x:
        await x.monitor.account(
            "competitor_account",
            callback=on_change,
            interval=3600,  # Check every hour
            track=["bio", "name", "avatar", "followers"]
        )

asyncio.run(main())
```

### Get Activity Report

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        activity = await x.monitor.account_activity("username", days=7)
        
        print(f"=== 7-Day Activity Report ===")
        print(f"Tweets posted: {activity.tweets_posted}")
        print(f"Replies sent: {activity.replies_sent}")
        print(f"Likes given: {activity.likes_given}")
        print(f"Retweets: {activity.retweets_made}")
        print(f"Avg tweets/day: {activity.avg_tweets_per_day:.1f}")
        print(f"Most active hour: {activity.most_active_hour}:00 UTC")
        print(f"Most active day: {activity.most_active_day}")

asyncio.run(main())
```

### Monitor Bio Changes

```python
from xeepy import Xeepy

async def alert_bio_change(report):
    for change in report.changes:
        if change.field == "bio":
            print(f"⚠️ @{report.username} changed their bio!")
            print(f"Old: {change.old_value}")
            print(f"New: {change.new_value}")

async def main():
    async with Xeepy() as x:
        await x.monitor.account(
            "important_account",
            callback=alert_bio_change,
            interval=1800,
            track=["bio"]
        )

asyncio.run(main())
```

### Track Multiple Accounts

```python
from xeepy import Xeepy
import asyncio

async def monitor_multiple(accounts: list):
    async with Xeepy() as x:
        async def on_change(report):
            print(f"Change detected: @{report.username}")
            for change in report.changes:
                print(f"  {change.field}: {change.old_value} → {change.new_value}")
        
        tasks = []
        for account in accounts:
            task = asyncio.create_task(
                x.monitor.account(
                    account,
                    callback=on_change,
                    interval=3600
                )
            )
            tasks.append(task)
        
        await asyncio.gather(*tasks)

asyncio.run(monitor_multiple(["account1", "account2", "account3"]))
```

### Export Activity Data

```python
from xeepy import Xeepy

async def export_activity(username: str, days: int = 30):
    async with Xeepy() as x:
        activity = await x.monitor.account_activity(username, days=days)
        
        data = {
            "username": username,
            "period_days": days,
            "tweets_posted": activity.tweets_posted,
            "replies_sent": activity.replies_sent,
            "likes_given": activity.likes_given,
            "retweets_made": activity.retweets_made,
            "avg_tweets_per_day": activity.avg_tweets_per_day,
            "most_active_hour": activity.most_active_hour,
            "most_active_day": activity.most_active_day,
            "engagement_rate": activity.engagement_rate
        }
        
        x.export.to_json([data], f"activity_{username}.json")
        print(f"Activity data exported")

asyncio.run(export_activity("myaccount"))
```

### Detect Follower Milestones

```python
from xeepy import Xeepy

async def check_milestones(report):
    old = report.old_snapshot.followers_count
    new = report.new_snapshot.followers_count
    
    milestones = [100, 500, 1000, 5000, 10000, 50000, 100000]
    
    for milestone in milestones:
        if old < milestone <= new:
            print(f"🎉 @{report.username} reached {milestone:,} followers!")

async def main():
    async with Xeepy() as x:
        await x.monitor.account(
            "myaccount",
            callback=check_milestones,
            interval=3600,
            track=["followers"]
        )

asyncio.run(main())
```

### Security Monitoring

```python
from xeepy import Xeepy
from xeepy.notifications import TelegramBot

async def security_monitor():
    bot = TelegramBot("BOT_TOKEN", "CHAT_ID")
    
    async def alert(report):
        suspicious = ["email", "password", "phone"]
        
        for change in report.changes:
            if change.field in suspicious:
                await bot.send(
                    f"🚨 Security Alert!\n"
                    f"Account setting changed: {change.field}\n"
                    f"Time: {change.changed_at}"
                )
    
    async with Xeepy() as x:
        await x.monitor.account(
            "myaccount",
            callback=alert,
            interval=1800
        )

asyncio.run(security_monitor())
```

## See Also

- [UnfollowersMonitor](unfollowers.md) - Track unfollowers
- [GrowthMonitor](growth.md) - Growth metrics
- [SettingsActions](../actions/settings.md) - Account settings

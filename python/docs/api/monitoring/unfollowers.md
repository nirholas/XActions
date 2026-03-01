# UnfollowersMonitor

Monitor and detect users who have unfollowed you.

## Import

```python
from xeepy.monitoring.unfollowers import UnfollowersMonitor
```

## Class Signature

```python
class UnfollowersMonitor:
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
| `check()` | `UnfollowReport` | Check for unfollowers |
| `get_history()` | `List[UnfollowEvent]` | Get unfollow history |
| `start_monitoring(interval)` | `None` | Start continuous monitoring |
| `stop_monitoring()` | `None` | Stop monitoring |
| `export_report(path)` | `None` | Export report to file |

### `check`

```python
async def check(
    self,
    username: Optional[str] = None
) -> UnfollowReport
```

Check for new unfollowers since last check.

**Parameters:**
- `username`: Username to check (default: logged-in user)

### `get_history`

```python
async def get_history(
    self,
    days: int = 30
) -> List[UnfollowEvent]
```

Get unfollow history for the specified period.

### `start_monitoring`

```python
async def start_monitoring(
    self,
    interval: int = 3600,
    callback: Optional[Callable] = None
) -> None
```

Start continuous monitoring for unfollowers.

**Parameters:**
- `interval`: Check interval in seconds (default: 1 hour)
- `callback`: Function to call when unfollowers detected

## UnfollowReport Object

```python
@dataclass
class UnfollowReport:
    unfollowers: List[User]          # Users who unfollowed
    new_followers: List[User]        # New followers
    total_followers: int             # Current follower count
    previous_followers: int          # Previous count
    net_change: int                  # Net change
    checked_at: datetime             # Check timestamp
```

## UnfollowEvent Object

```python
@dataclass
class UnfollowEvent:
    user: User                       # User who unfollowed
    detected_at: datetime            # When detected
    was_following_back: bool         # If you were following them
```

## Usage Examples

### Basic Unfollower Check

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        report = await x.monitor.unfollowers()
        
        print(f"Current followers: {report.total_followers}")
        print(f"Net change: {report.net_change:+d}")
        
        if report.unfollowers:
            print(f"\n{len(report.unfollowers)} users unfollowed you:")
            for user in report.unfollowers:
                print(f"  - @{user.username} ({user.followers_count:,} followers)")
        
        if report.new_followers:
            print(f"\n{len(report.new_followers)} new followers:")
            for user in report.new_followers:
                print(f"  + @{user.username}")

asyncio.run(main())
```

### Continuous Monitoring

```python
from xeepy import Xeepy
import asyncio

async def on_unfollow(report):
    """Callback when unfollowers detected."""
    if report.unfollowers:
        print(f"Alert! {len(report.unfollowers)} unfollowed you:")
        for user in report.unfollowers:
            print(f"  @{user.username}")

async def main():
    async with Xeepy() as x:
        # Start monitoring (checks every hour)
        await x.monitor.start_unfollower_monitoring(
            interval=3600,
            callback=on_unfollow
        )

asyncio.run(main())
```

### Get Unfollow History

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        history = await x.monitor.unfollower_history(days=30)
        
        print(f"Unfollow events in last 30 days: {len(history)}")
        
        for event in history[-10:]:
            print(f"  {event.detected_at}: @{event.user.username}")
            if event.was_following_back:
                print(f"    (You were following them)")

asyncio.run(main())
```

### Export Report

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        report = await x.monitor.unfollowers()
        
        # Export to CSV
        data = [
            {
                "username": u.username,
                "name": u.name,
                "followers": u.followers_count,
                "following": u.following_count,
                "verified": u.is_verified
            }
            for u in report.unfollowers
        ]
        
        x.export.to_csv(data, "unfollowers.csv")
        print(f"Exported {len(data)} unfollowers to unfollowers.csv")

asyncio.run(main())
```

### Daily Unfollower Report

```python
from xeepy import Xeepy
from datetime import datetime

async def daily_report():
    async with Xeepy() as x:
        report = await x.monitor.unfollowers()
        
        print(f"=== Daily Follower Report ({datetime.now().date()}) ===")
        print(f"Total followers: {report.total_followers:,}")
        print(f"Change: {report.net_change:+d}")
        print(f"New followers: {len(report.new_followers)}")
        print(f"Unfollowers: {len(report.unfollowers)}")
        
        if report.unfollowers:
            print("\nUnfollowers:")
            for user in report.unfollowers:
                print(f"  @{user.username}")
        
        if report.new_followers:
            print("\nNew followers:")
            for user in report.new_followers[:5]:
                print(f"  @{user.username}")
            if len(report.new_followers) > 5:
                print(f"  ... and {len(report.new_followers) - 5} more")

asyncio.run(daily_report())
```

### Unfollower Notification

```python
from xeepy import Xeepy
from xeepy.notifications import DiscordWebhook

async def monitor_with_notifications():
    webhook = DiscordWebhook("https://discord.com/api/webhooks/...")
    
    async def notify(report):
        if report.unfollowers:
            message = f"🔔 {len(report.unfollowers)} users unfollowed you:\n"
            for user in report.unfollowers[:10]:
                message += f"• @{user.username}\n"
            await webhook.send(message)
    
    async with Xeepy() as x:
        await x.monitor.start_unfollower_monitoring(
            interval=3600,
            callback=notify
        )

asyncio.run(monitor_with_notifications())
```

### Track Influential Unfollowers

```python
from xeepy import Xeepy

async def track_influential_unfollowers(min_followers: int = 10000):
    async with Xeepy() as x:
        report = await x.monitor.unfollowers()
        
        influential = [
            u for u in report.unfollowers
            if u.followers_count >= min_followers
        ]
        
        if influential:
            print(f"⚠️ Influential accounts that unfollowed you:")
            for user in influential:
                print(f"  @{user.username} - {user.followers_count:,} followers")

asyncio.run(track_influential_unfollowers())
```

## See Also

- [GrowthMonitor](growth.md) - Growth analytics
- [FollowersScraper](../scrapers/followers.md) - Followers scraping
- [UnfollowActions](../actions/unfollow.md) - Unfollow operations

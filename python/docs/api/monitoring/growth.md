# GrowthMonitor

Monitor and track account growth metrics over time.

## Import

```python
from xeepy.monitoring.growth import GrowthMonitor
```

## Class Signature

```python
class GrowthMonitor:
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
| `track(username)` | `GrowthSnapshot` | Record current metrics |
| `get_history(username, days)` | `List[GrowthSnapshot]` | Get historical data |
| `calculate_growth(username, period)` | `GrowthStats` | Calculate growth stats |
| `compare(usernames)` | `ComparisonReport` | Compare multiple accounts |
| `forecast(username, days)` | `ForecastResult` | Predict future growth |

### `track`

```python
async def track(
    self,
    username: Optional[str] = None
) -> GrowthSnapshot
```

Record a snapshot of current account metrics.

### `calculate_growth`

```python
async def calculate_growth(
    self,
    username: Optional[str] = None,
    period: str = "7d"
) -> GrowthStats
```

Calculate growth statistics for a period.

**Parameters:**
- `username`: Username to analyze
- `period`: Time period (`1d`, `7d`, `30d`, `90d`, `1y`)

### `compare`

```python
async def compare(
    self,
    usernames: List[str]
) -> ComparisonReport
```

Compare growth metrics across multiple accounts.

### `forecast`

```python
async def forecast(
    self,
    username: Optional[str] = None,
    days: int = 30
) -> ForecastResult
```

Predict future growth based on historical data.

## GrowthSnapshot Object

```python
@dataclass
class GrowthSnapshot:
    username: str                    # Account username
    followers_count: int             # Followers at snapshot
    following_count: int             # Following at snapshot
    tweet_count: int                 # Tweets at snapshot
    like_count: int                  # Likes at snapshot
    listed_count: int                # Lists at snapshot
    recorded_at: datetime            # Snapshot timestamp
```

## GrowthStats Object

```python
@dataclass
class GrowthStats:
    username: str                    # Account username
    period: str                      # Analysis period
    start_followers: int             # Followers at start
    end_followers: int               # Followers at end
    followers_gained: int            # New followers
    followers_lost: int              # Lost followers
    net_growth: int                  # Net change
    growth_rate: float               # Growth percentage
    avg_daily_growth: float          # Average daily gain
    best_day: datetime               # Day with most growth
    worst_day: datetime              # Day with most loss
```

## Usage Examples

### Track Current Metrics

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        snapshot = await x.monitor.track_growth()
        
        print(f"=== Growth Snapshot ===")
        print(f"Followers: {snapshot.followers_count:,}")
        print(f"Following: {snapshot.following_count:,}")
        print(f"Tweets: {snapshot.tweet_count:,}")
        print(f"Recorded: {snapshot.recorded_at}")

asyncio.run(main())
```

### Calculate Growth Stats

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        stats = await x.monitor.calculate_growth(period="30d")
        
        print(f"=== 30-Day Growth Report ===")
        print(f"Net growth: {stats.net_growth:+,} followers")
        print(f"Growth rate: {stats.growth_rate:+.1f}%")
        print(f"Avg daily: {stats.avg_daily_growth:+.1f}")
        print(f"Gained: {stats.followers_gained:,}")
        print(f"Lost: {stats.followers_lost:,}")
        print(f"Best day: {stats.best_day}")
        print(f"Worst day: {stats.worst_day}")

asyncio.run(main())
```

### View Growth History

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        history = await x.monitor.growth_history(days=7)
        
        print("Daily follower counts (last 7 days):")
        for snapshot in history:
            print(f"  {snapshot.recorded_at.date()}: {snapshot.followers_count:,}")

asyncio.run(main())
```

### Compare Accounts

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        report = await x.monitor.compare_growth([
            "account1",
            "account2",
            "account3"
        ])
        
        print("Account Comparison:")
        for account in report.accounts:
            print(f"\n@{account.username}:")
            print(f"  Followers: {account.followers_count:,}")
            print(f"  30d growth: {account.growth_30d:+,}")
            print(f"  Growth rate: {account.growth_rate:.1f}%")

asyncio.run(main())
```

### Forecast Future Growth

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        forecast = await x.monitor.forecast_growth(days=30)
        
        print(f"=== 30-Day Growth Forecast ===")
        print(f"Current followers: {forecast.current:,}")
        print(f"Predicted in 30 days: {forecast.predicted:,}")
        print(f"Expected gain: {forecast.expected_gain:+,}")
        print(f"Confidence: {forecast.confidence:.0%}")

asyncio.run(main())
```

### Weekly Growth Report

```python
from xeepy import Xeepy
from datetime import datetime

async def weekly_report():
    async with Xeepy() as x:
        stats = await x.monitor.calculate_growth(period="7d")
        history = await x.monitor.growth_history(days=7)
        
        print(f"=== Weekly Growth Report ({datetime.now().date()}) ===")
        print(f"\nOverview:")
        print(f"  Net growth: {stats.net_growth:+,}")
        print(f"  Growth rate: {stats.growth_rate:+.2f}%")
        
        print(f"\nDaily breakdown:")
        prev_count = None
        for snapshot in history:
            if prev_count is not None:
                change = snapshot.followers_count - prev_count
                print(f"  {snapshot.recorded_at.date()}: {snapshot.followers_count:,} ({change:+,})")
            else:
                print(f"  {snapshot.recorded_at.date()}: {snapshot.followers_count:,}")
            prev_count = snapshot.followers_count

asyncio.run(weekly_report())
```

### Export Growth Data

```python
from xeepy import Xeepy

async def export_growth_data(days: int = 90):
    async with Xeepy() as x:
        history = await x.monitor.growth_history(days=days)
        
        data = [
            {
                "date": s.recorded_at.isoformat(),
                "followers": s.followers_count,
                "following": s.following_count,
                "tweets": s.tweet_count
            }
            for s in history
        ]
        
        x.export.to_csv(data, f"growth_data_{days}d.csv")
        print(f"Exported {len(data)} data points")

asyncio.run(export_growth_data())
```

### Milestone Tracking

```python
from xeepy import Xeepy

async def check_milestones(milestones: list):
    async with Xeepy() as x:
        snapshot = await x.monitor.track_growth()
        
        for milestone in milestones:
            if snapshot.followers_count >= milestone:
                print(f"✓ Reached {milestone:,} followers!")
            else:
                remaining = milestone - snapshot.followers_count
                print(f"○ {milestone:,} followers ({remaining:,} to go)")

milestones = [100, 500, 1000, 5000, 10000, 50000, 100000]
asyncio.run(check_milestones(milestones))
```

## See Also

- [UnfollowersMonitor](unfollowers.md) - Track unfollowers
- [EngagementAnalytics](../analytics/engagement.md) - Engagement metrics
- [ProfileScraper](../scrapers/profile.md) - Profile data

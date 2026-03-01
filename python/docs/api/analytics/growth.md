# GrowthAnalytics

Analyze account growth trends and patterns.

## Import

```python
from xeepy.analytics.growth import GrowthAnalytics
```

## Class Signature

```python
class GrowthAnalytics:
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
| `storage` | `Optional[Storage]` | `None` | Storage for historical data |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `analyze(username, period)` | `GrowthAnalysis` | Analyze growth metrics |
| `trends(username)` | `TrendAnalysis` | Identify growth trends |
| `velocity(username)` | `VelocityMetrics` | Calculate growth velocity |
| `benchmark(username, peers)` | `BenchmarkReport` | Compare to peers |
| `cohort_analysis(username)` | `CohortAnalysis` | Analyze follower cohorts |

### `analyze`

```python
async def analyze(
    self,
    username: Optional[str] = None,
    period: str = "30d"
) -> GrowthAnalysis
```

Comprehensive growth analysis.

**Parameters:**
- `username`: Account to analyze
- `period`: Analysis period (`7d`, `30d`, `90d`, `1y`, `all`)

### `trends`

```python
async def trends(
    self,
    username: Optional[str] = None
) -> TrendAnalysis
```

Identify growth trends and patterns.

### `velocity`

```python
async def velocity(
    self,
    username: Optional[str] = None
) -> VelocityMetrics
```

Calculate growth velocity and acceleration.

## GrowthAnalysis Object

```python
@dataclass
class GrowthAnalysis:
    username: str                    # Account analyzed
    period: str                      # Analysis period
    followers_start: int             # Starting followers
    followers_end: int               # Ending followers
    net_growth: int                  # Net change
    growth_rate: float               # Growth percentage
    avg_daily_growth: float          # Average daily
    max_daily_growth: int            # Best day
    min_daily_growth: int            # Worst day
    consistency_score: float         # 0-1 consistency
    growth_trend: str                # accelerating, steady, declining
```

## TrendAnalysis Object

```python
@dataclass
class TrendAnalysis:
    trend_direction: str             # up, down, stable
    trend_strength: float            # 0-1 strength
    seasonality: Dict[str, float]    # Day/hour patterns
    anomalies: List[datetime]        # Unusual days
    prediction_30d: int              # 30-day forecast
```

## Usage Examples

### Basic Growth Analysis

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        analysis = await x.analytics.growth("username", period="30d")
        
        print(f"=== 30-Day Growth Analysis ===")
        print(f"Starting followers: {analysis.followers_start:,}")
        print(f"Ending followers: {analysis.followers_end:,}")
        print(f"Net growth: {analysis.net_growth:+,}")
        print(f"Growth rate: {analysis.growth_rate:+.2f}%")
        print(f"Avg daily: {analysis.avg_daily_growth:+.1f}")
        print(f"Consistency: {analysis.consistency_score:.0%}")
        print(f"Trend: {analysis.growth_trend}")

asyncio.run(main())
```

### Identify Trends

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        trends = await x.analytics.growth_trends("username")
        
        print(f"=== Trend Analysis ===")
        print(f"Direction: {trends.trend_direction}")
        print(f"Strength: {trends.trend_strength:.0%}")
        print(f"30-day prediction: {trends.prediction_30d:,}")
        
        print(f"\nBest days:")
        for day, score in sorted(trends.seasonality.items(), key=lambda x: -x[1])[:3]:
            print(f"  {day}: {score:.2f}")

asyncio.run(main())
```

### Calculate Growth Velocity

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        velocity = await x.analytics.growth_velocity("username")
        
        print(f"=== Growth Velocity ===")
        print(f"Current velocity: {velocity.current:+.1f}/day")
        print(f"Acceleration: {velocity.acceleration:+.2f}")
        print(f"7-day avg: {velocity.avg_7d:+.1f}/day")
        print(f"30-day avg: {velocity.avg_30d:+.1f}/day")

asyncio.run(main())
```

### Benchmark Against Peers

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        benchmark = await x.analytics.growth_benchmark(
            "myaccount",
            peers=["peer1", "peer2", "peer3"]
        )
        
        print(f"=== Peer Benchmark ===")
        print(f"Your growth rate: {benchmark.your_rate:+.2f}%")
        print(f"Peer average: {benchmark.peer_avg:+.2f}%")
        print(f"Percentile rank: {benchmark.percentile:.0f}%")
        
        print(f"\nRankings:")
        for i, account in enumerate(benchmark.rankings, 1):
            print(f"  {i}. @{account.username}: {account.growth_rate:+.2f}%")

asyncio.run(main())
```

### Compare Time Periods

```python
from xeepy import Xeepy

async def compare_periods(username: str):
    async with Xeepy() as x:
        week = await x.analytics.growth(username, period="7d")
        month = await x.analytics.growth(username, period="30d")
        quarter = await x.analytics.growth(username, period="90d")
        
        print(f"=== Period Comparison ===")
        print(f"Last 7 days:  {week.growth_rate:+.2f}% ({week.avg_daily_growth:+.1f}/day)")
        print(f"Last 30 days: {month.growth_rate:+.2f}% ({month.avg_daily_growth:+.1f}/day)")
        print(f"Last 90 days: {quarter.growth_rate:+.2f}% ({quarter.avg_daily_growth:+.1f}/day)")

asyncio.run(compare_periods("username"))
```

### Export Growth Report

```python
from xeepy import Xeepy
from datetime import datetime

async def generate_report(username: str):
    async with Xeepy() as x:
        analysis = await x.analytics.growth(username, period="30d")
        trends = await x.analytics.growth_trends(username)
        
        report = {
            "username": username,
            "generated_at": datetime.now().isoformat(),
            "metrics": {
                "followers_start": analysis.followers_start,
                "followers_end": analysis.followers_end,
                "net_growth": analysis.net_growth,
                "growth_rate": analysis.growth_rate,
                "avg_daily": analysis.avg_daily_growth,
                "consistency": analysis.consistency_score
            },
            "trends": {
                "direction": trends.trend_direction,
                "strength": trends.trend_strength,
                "prediction_30d": trends.prediction_30d
            }
        }
        
        x.export.to_json([report], f"growth_report_{username}.json")
        print(f"Report exported for @{username}")

asyncio.run(generate_report("myaccount"))
```

### Detect Growth Anomalies

```python
from xeepy import Xeepy

async def detect_anomalies(username: str):
    async with Xeepy() as x:
        trends = await x.analytics.growth_trends(username)
        
        if trends.anomalies:
            print(f"Unusual growth days detected:")
            for date in trends.anomalies:
                print(f"  - {date.strftime('%Y-%m-%d')}")
        else:
            print("No anomalies detected")

asyncio.run(detect_anomalies("username"))
```

## See Also

- [EngagementAnalytics](engagement.md) - Engagement metrics
- [AudienceAnalytics](audience.md) - Audience analysis
- [GrowthMonitor](../monitoring/growth.md) - Growth monitoring

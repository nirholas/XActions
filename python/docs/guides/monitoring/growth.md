# Growth Monitoring

Track your account growth, detect follower changes, and set up alerts for milestones and anomalies.

## Overview

Growth monitoring helps you:

- Track daily follower/following counts
- Detect sudden changes (gains or drops)
- Celebrate milestones automatically
- Identify growth patterns and trends
- Store historical data for analysis

## Setting Up Daily Tracking

### Basic Growth Tracker

```python
import asyncio
from datetime import datetime
from xtools import Xtools

async def track_daily_growth(username: str):
    """Record daily growth metrics."""
    async with Xtools() as x:
        profile = await x.scrape.profile(username)
        
        metrics = {
            "date": datetime.now().isoformat(),
            "username": username,
            "followers": profile.followers_count,
            "following": profile.following_count,
            "tweets": profile.tweet_count,
            "likes": profile.likes_count
        }
        
        print(f"📊 {username} Stats for {metrics['date'][:10]}")
        print(f"   Followers: {metrics['followers']:,}")
        print(f"   Following: {metrics['following']:,}")
        print(f"   Tweets: {metrics['tweets']:,}")
        
        return metrics

# Run daily
asyncio.run(track_daily_growth("your_username"))
```

### Automated Daily Tracking with Storage

```python
import asyncio
import json
from datetime import datetime
from pathlib import Path
from xtools import Xtools

class GrowthTracker:
    def __init__(self, username: str, data_file: str = "growth_data.json"):
        self.username = username
        self.data_file = Path(data_file)
        self.history = self._load_history()
    
    def _load_history(self) -> list:
        """Load historical data from file."""
        if self.data_file.exists():
            return json.loads(self.data_file.read_text())
        return []
    
    def _save_history(self):
        """Save history to file."""
        self.data_file.write_text(json.dumps(self.history, indent=2))
    
    async def record_snapshot(self) -> dict:
        """Take a growth snapshot."""
        async with Xtools() as x:
            profile = await x.scrape.profile(self.username)
            
            snapshot = {
                "timestamp": datetime.now().isoformat(),
                "followers": profile.followers_count,
                "following": profile.following_count,
                "tweets": profile.tweet_count,
                "likes": profile.likes_count,
                "listed": profile.listed_count
            }
            
            self.history.append(snapshot)
            self._save_history()
            
            return snapshot
    
    def get_growth_rate(self, days: int = 7) -> dict:
        """Calculate growth rate over period."""
        if len(self.history) < 2:
            return {"error": "Not enough data"}
        
        # Get snapshots from period
        recent = self.history[-1]
        
        # Find snapshot from N days ago
        target_date = datetime.now().timestamp() - (days * 86400)
        old_snapshot = None
        
        for snap in self.history:
            snap_time = datetime.fromisoformat(snap["timestamp"]).timestamp()
            if snap_time >= target_date:
                old_snapshot = snap
                break
        
        if not old_snapshot:
            old_snapshot = self.history[0]
        
        return {
            "period_days": days,
            "follower_change": recent["followers"] - old_snapshot["followers"],
            "following_change": recent["following"] - old_snapshot["following"],
            "tweet_change": recent["tweets"] - old_snapshot["tweets"],
            "daily_avg_followers": (recent["followers"] - old_snapshot["followers"]) / days
        }

# Usage
async def main():
    tracker = GrowthTracker("elonmusk")
    
    # Record today's snapshot
    snapshot = await tracker.record_snapshot()
    print(f"Today: {snapshot['followers']:,} followers")
    
    # Get weekly growth
    growth = tracker.get_growth_rate(days=7)
    print(f"Weekly change: {growth['follower_change']:+,} followers")
    print(f"Daily average: {growth['daily_avg_followers']:+.1f}/day")

asyncio.run(main())
```

## Follower Change Detection

### Real-Time Change Detection

```python
import asyncio
from xtools import Xtools

class FollowerChangeDetector:
    def __init__(self, username: str):
        self.username = username
        self.last_followers = set()
        self.last_count = 0
    
    async def check_changes(self) -> dict:
        """Detect follower changes since last check."""
        async with Xtools() as x:
            # Get current followers
            result = await x.scrape.followers(self.username, limit=5000)
            current_followers = {u.username for u in result.users}
            current_count = len(current_followers)
            
            changes = {
                "new_followers": [],
                "unfollowers": [],
                "net_change": 0
            }
            
            if self.last_followers:
                # Find new followers
                new = current_followers - self.last_followers
                changes["new_followers"] = list(new)
                
                # Find unfollowers
                lost = self.last_followers - current_followers
                changes["unfollowers"] = list(lost)
                
                # Net change
                changes["net_change"] = current_count - self.last_count
            
            # Update state
            self.last_followers = current_followers
            self.last_count = current_count
            
            return changes
    
    async def monitor(self, interval_minutes: int = 60):
        """Continuously monitor for changes."""
        print(f"🔍 Monitoring @{self.username} for follower changes...")
        
        # Initial load
        await self.check_changes()
        print(f"   Loaded {self.last_count:,} followers")
        
        while True:
            await asyncio.sleep(interval_minutes * 60)
            
            changes = await self.check_changes()
            
            if changes["new_followers"]:
                print(f"\n✅ New followers ({len(changes['new_followers'])}):")
                for user in changes["new_followers"][:10]:
                    print(f"   @{user}")
            
            if changes["unfollowers"]:
                print(f"\n❌ Unfollowers ({len(changes['unfollowers'])}):")
                for user in changes["unfollowers"][:10]:
                    print(f"   @{user}")
            
            if changes["net_change"]:
                emoji = "📈" if changes["net_change"] > 0 else "📉"
                print(f"\n{emoji} Net change: {changes['net_change']:+,}")

# Usage
async def main():
    detector = FollowerChangeDetector("your_username")
    await detector.monitor(interval_minutes=30)

asyncio.run(main())
```

## Growth Alerts

### Milestone Alerts

```python
import asyncio
from xtools import Xtools
from xtools.notifications import DiscordNotifier

MILESTONES = [100, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]

class MilestoneTracker:
    def __init__(self, username: str, webhook_url: str = None):
        self.username = username
        self.last_count = 0
        self.achieved_milestones = set()
        self.notifier = DiscordNotifier(webhook_url) if webhook_url else None
    
    def _check_milestones(self, count: int) -> list:
        """Check if any milestones were crossed."""
        crossed = []
        for milestone in MILESTONES:
            if self.last_count < milestone <= count:
                if milestone not in self.achieved_milestones:
                    crossed.append(milestone)
                    self.achieved_milestones.add(milestone)
        return crossed
    
    async def check_and_alert(self):
        """Check for milestone achievements."""
        async with Xtools() as x:
            profile = await x.scrape.profile(self.username)
            count = profile.followers_count
            
            crossed = self._check_milestones(count)
            self.last_count = count
            
            for milestone in crossed:
                message = f"🎉 @{self.username} hit {milestone:,} followers!"
                print(message)
                
                if self.notifier:
                    await self.notifier.send(
                        title="Milestone Achieved!",
                        message=message,
                        color=0x00FF00
                    )
            
            return crossed

# Usage
async def main():
    tracker = MilestoneTracker(
        "your_username",
        webhook_url="https://discord.com/api/webhooks/..."
    )
    
    while True:
        await tracker.check_and_alert()
        await asyncio.sleep(3600)  # Check hourly

asyncio.run(main())
```

### Drop Alerts

```python
import asyncio
from datetime import datetime
from xtools import Xtools

class DropAlertMonitor:
    def __init__(self, username: str, drop_threshold_percent: float = 5.0):
        self.username = username
        self.threshold = drop_threshold_percent
        self.baseline = None
        self.history = []
    
    async def check_for_drops(self) -> dict:
        """Detect unusual follower drops."""
        async with Xtools() as x:
            profile = await x.scrape.profile(self.username)
            current = profile.followers_count
            
            result = {
                "current": current,
                "alert": False,
                "drop_percent": 0,
                "message": None
            }
            
            if self.baseline is None:
                self.baseline = current
                return result
            
            # Calculate drop percentage
            if self.baseline > 0:
                drop_percent = ((self.baseline - current) / self.baseline) * 100
                
                if drop_percent >= self.threshold:
                    result["alert"] = True
                    result["drop_percent"] = drop_percent
                    result["message"] = (
                        f"⚠️ ALERT: @{self.username} lost "
                        f"{self.baseline - current:,} followers "
                        f"({drop_percent:.1f}% drop)"
                    )
            
            # Update baseline (rolling average)
            self.history.append(current)
            if len(self.history) > 24:  # Keep last 24 readings
                self.history.pop(0)
            self.baseline = sum(self.history) / len(self.history)
            
            return result

# Usage
async def main():
    monitor = DropAlertMonitor("your_username", drop_threshold_percent=3.0)
    
    while True:
        result = await monitor.check_for_drops()
        
        if result["alert"]:
            print(result["message"])
            # Send notification, email, etc.
        
        await asyncio.sleep(1800)  # Check every 30 minutes

asyncio.run(main())
```

## Historical Tracking Database

### SQLite-Based Tracking

```python
import asyncio
import sqlite3
from datetime import datetime, timedelta
from xtools import Xtools

class GrowthDatabase:
    def __init__(self, db_path: str = "growth.db"):
        self.conn = sqlite3.connect(db_path)
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema."""
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS growth_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                followers INTEGER,
                following INTEGER,
                tweets INTEGER,
                likes INTEGER,
                listed INTEGER
            )
        """)
        
        self.conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_username_time 
            ON growth_metrics(username, timestamp)
        """)
        
        self.conn.commit()
    
    async def record(self, username: str):
        """Record current metrics for username."""
        async with Xtools() as x:
            profile = await x.scrape.profile(username)
            
            self.conn.execute("""
                INSERT INTO growth_metrics 
                (username, followers, following, tweets, likes, listed)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                username,
                profile.followers_count,
                profile.following_count,
                profile.tweet_count,
                profile.likes_count,
                profile.listed_count
            ))
            
            self.conn.commit()
    
    def get_history(self, username: str, days: int = 30) -> list:
        """Get historical data for username."""
        since = datetime.now() - timedelta(days=days)
        
        cursor = self.conn.execute("""
            SELECT timestamp, followers, following, tweets
            FROM growth_metrics
            WHERE username = ? AND timestamp >= ?
            ORDER BY timestamp ASC
        """, (username, since.isoformat()))
        
        return cursor.fetchall()
    
    def get_growth_summary(self, username: str, days: int = 7) -> dict:
        """Get growth summary for period."""
        history = self.get_history(username, days)
        
        if len(history) < 2:
            return {"error": "Insufficient data"}
        
        first = history[0]
        last = history[-1]
        
        return {
            "period_days": days,
            "start_followers": first[1],
            "end_followers": last[1],
            "change": last[1] - first[1],
            "percent_change": ((last[1] - first[1]) / first[1]) * 100 if first[1] else 0,
            "data_points": len(history)
        }

# Usage
async def main():
    db = GrowthDatabase()
    
    # Record metrics for multiple accounts
    accounts = ["account1", "account2", "account3"]
    
    for account in accounts:
        await db.record(account)
        print(f"Recorded metrics for @{account}")
    
    # Get growth summary
    summary = db.get_growth_summary("account1", days=7)
    print(f"\n7-day Growth Summary:")
    print(f"  Change: {summary['change']:+,} followers")
    print(f"  Percent: {summary['percent_change']:+.2f}%")

asyncio.run(main())
```

## Growth Dashboards

### Terminal Dashboard

```python
import asyncio
from datetime import datetime
from xtools import Xtools

async def display_dashboard(usernames: list):
    """Display growth dashboard for multiple accounts."""
    async with Xtools() as x:
        print("\n" + "=" * 60)
        print(f"📊 GROWTH DASHBOARD - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        print("=" * 60)
        
        for username in usernames:
            profile = await x.scrape.profile(username)
            
            print(f"\n@{username}")
            print(f"  {'Followers:':<12} {profile.followers_count:>10,}")
            print(f"  {'Following:':<12} {profile.following_count:>10,}")
            print(f"  {'Tweets:':<12} {profile.tweet_count:>10,}")
            print(f"  {'Ratio:':<12} {profile.followers_count/max(1,profile.following_count):>10.2f}")
        
        print("\n" + "=" * 60)

# Usage
asyncio.run(display_dashboard(["elonmusk", "naval", "paulg"]))
```

## Anomaly Detection

### Statistical Anomaly Detection

```python
import asyncio
from statistics import mean, stdev
from xtools import Xtools

class AnomalyDetector:
    def __init__(self, username: str, sensitivity: float = 2.0):
        self.username = username
        self.sensitivity = sensitivity  # Standard deviations
        self.daily_changes = []
    
    def _is_anomaly(self, value: float) -> bool:
        """Check if value is anomalous based on history."""
        if len(self.daily_changes) < 7:
            return False
        
        avg = mean(self.daily_changes)
        std = stdev(self.daily_changes) if len(self.daily_changes) > 1 else 0
        
        if std == 0:
            return False
        
        z_score = abs(value - avg) / std
        return z_score > self.sensitivity
    
    async def add_data_point(self, change: int) -> dict:
        """Add daily change and check for anomaly."""
        is_anomaly = self._is_anomaly(change)
        
        self.daily_changes.append(change)
        if len(self.daily_changes) > 30:  # Keep 30 days
            self.daily_changes.pop(0)
        
        result = {
            "change": change,
            "is_anomaly": is_anomaly,
            "average": mean(self.daily_changes) if self.daily_changes else 0
        }
        
        if is_anomaly:
            direction = "gain" if change > 0 else "loss"
            result["message"] = (
                f"🚨 Anomaly detected: {abs(change):,} follower {direction} "
                f"(avg: {result['average']:.0f})"
            )
        
        return result

# Usage
async def main():
    detector = AnomalyDetector("your_username", sensitivity=2.0)
    
    # Simulate daily changes
    daily_changes = [50, 45, 52, 48, 500, 47, 51]  # 500 is anomaly
    
    for change in daily_changes:
        result = await detector.add_data_point(change)
        if result["is_anomaly"]:
            print(result["message"])

asyncio.run(main())
```

## Complete Growth Monitoring System

```python
import asyncio
import json
from datetime import datetime
from pathlib import Path
from xtools import Xtools
from xtools.notifications import DiscordNotifier

class ComprehensiveGrowthMonitor:
    def __init__(
        self,
        username: str,
        data_dir: str = "growth_data",
        discord_webhook: str = None
    ):
        self.username = username
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.notifier = DiscordNotifier(discord_webhook) if discord_webhook else None
        
        self.metrics_file = self.data_dir / f"{username}_metrics.json"
        self.followers_file = self.data_dir / f"{username}_followers.json"
        
        self.metrics_history = self._load_json(self.metrics_file)
        self.known_followers = set(self._load_json(self.followers_file))
    
    def _load_json(self, path: Path) -> list:
        if path.exists():
            return json.loads(path.read_text())
        return []
    
    def _save_json(self, path: Path, data):
        path.write_text(json.dumps(data, indent=2, default=str))
    
    async def run_check(self) -> dict:
        """Run comprehensive growth check."""
        async with Xtools() as x:
            # Get profile metrics
            profile = await x.scrape.profile(self.username)
            
            # Get current followers
            result = await x.scrape.followers(self.username, limit=10000)
            current_followers = {u.username for u in result.users}
            
            # Calculate changes
            new_followers = current_followers - self.known_followers
            unfollowers = self.known_followers - current_followers
            
            # Record metrics
            snapshot = {
                "timestamp": datetime.now().isoformat(),
                "followers": profile.followers_count,
                "following": profile.following_count,
                "tweets": profile.tweet_count,
                "new_followers": list(new_followers),
                "unfollowers": list(unfollowers)
            }
            
            self.metrics_history.append(snapshot)
            self._save_json(self.metrics_file, self.metrics_history[-1000:])
            
            # Update known followers
            self.known_followers = current_followers
            self._save_json(self.followers_file, list(current_followers))
            
            # Send notifications
            await self._send_notifications(snapshot)
            
            return snapshot
    
    async def _send_notifications(self, snapshot: dict):
        """Send notifications for significant events."""
        if not self.notifier:
            return
        
        if snapshot["new_followers"]:
            await self.notifier.send(
                title=f"New Followers for @{self.username}",
                message=f"+{len(snapshot['new_followers'])} new followers",
                color=0x00FF00
            )
        
        if snapshot["unfollowers"]:
            await self.notifier.send(
                title=f"Unfollowers for @{self.username}",
                message=f"-{len(snapshot['unfollowers'])} unfollowers",
                color=0xFF0000
            )

# Usage
async def main():
    monitor = ComprehensiveGrowthMonitor(
        "your_username",
        discord_webhook="https://discord.com/api/webhooks/..."
    )
    
    # Run every hour
    while True:
        result = await monitor.run_check()
        print(f"[{datetime.now()}] Followers: {result['followers']:,}")
        await asyncio.sleep(3600)

asyncio.run(main())
```

## Next Steps

- [Account Monitoring](accounts.md) - Track profile changes
- [Keyword Monitoring](keywords.md) - Monitor mentions and topics
- [Engagement Monitoring](engagement.md) - Track interactions
- [Analytics Guide](../analytics/index.md) - Deep dive into data analysis

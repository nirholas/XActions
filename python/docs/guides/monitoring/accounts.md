# Account Change Monitoring

Monitor profile changes, tweet deletions, and following behavior across multiple accounts.

## Overview

Account monitoring helps you:

- Detect bio, name, or avatar changes
- Track tweet deletions
- Monitor following/unfollowing activity
- Watch multiple accounts simultaneously
- Store change history for analysis

## Bio/Name/Avatar Change Detection

### Basic Profile Change Monitor

```python
import asyncio
from datetime import datetime
from xtools import Xtools

class ProfileChangeMonitor:
    def __init__(self, username: str):
        self.username = username
        self.last_profile = None
    
    async def check_changes(self) -> list:
        """Check for profile changes."""
        async with Xtools() as x:
            profile = await x.scrape.profile(self.username)
            changes = []
            
            if self.last_profile:
                # Check name change
                if profile.name != self.last_profile.get("name"):
                    changes.append({
                        "field": "name",
                        "old": self.last_profile.get("name"),
                        "new": profile.name
                    })
                
                # Check bio change
                if profile.bio != self.last_profile.get("bio"):
                    changes.append({
                        "field": "bio",
                        "old": self.last_profile.get("bio"),
                        "new": profile.bio
                    })
                
                # Check avatar change
                if profile.profile_image_url != self.last_profile.get("avatar"):
                    changes.append({
                        "field": "avatar",
                        "old": self.last_profile.get("avatar"),
                        "new": profile.profile_image_url
                    })
                
                # Check location change
                if profile.location != self.last_profile.get("location"):
                    changes.append({
                        "field": "location",
                        "old": self.last_profile.get("location"),
                        "new": profile.location
                    })
                
                # Check website change
                if profile.url != self.last_profile.get("url"):
                    changes.append({
                        "field": "website",
                        "old": self.last_profile.get("url"),
                        "new": profile.url
                    })
            
            # Update stored profile
            self.last_profile = {
                "name": profile.name,
                "bio": profile.bio,
                "avatar": profile.profile_image_url,
                "location": profile.location,
                "url": profile.url
            }
            
            return changes

# Usage
async def main():
    monitor = ProfileChangeMonitor("elonmusk")
    
    # Initial load
    await monitor.check_changes()
    print("Profile loaded. Monitoring for changes...")
    
    while True:
        await asyncio.sleep(3600)  # Check hourly
        
        changes = await monitor.check_changes()
        for change in changes:
            print(f"\n🔔 @{monitor.username} changed their {change['field']}:")
            print(f"   Old: {change['old']}")
            print(f"   New: {change['new']}")

asyncio.run(main())
```

### Comprehensive Profile Tracker

```python
import asyncio
import json
from datetime import datetime
from pathlib import Path
from xtools import Xtools

class ComprehensiveProfileTracker:
    TRACKED_FIELDS = [
        "name", "username", "bio", "location", "url",
        "profile_image_url", "profile_banner_url",
        "protected", "verified"
    ]
    
    def __init__(self, username: str, storage_dir: str = "profile_history"):
        self.username = username
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.history_file = self.storage_dir / f"{username}_history.json"
        self.history = self._load_history()
    
    def _load_history(self) -> list:
        if self.history_file.exists():
            return json.loads(self.history_file.read_text())
        return []
    
    def _save_history(self):
        self.history_file.write_text(json.dumps(self.history, indent=2))
    
    async def snapshot(self) -> dict:
        """Take a profile snapshot and detect changes."""
        async with Xtools() as x:
            profile = await x.scrape.profile(self.username)
            
            current = {
                "timestamp": datetime.now().isoformat(),
                "name": profile.name,
                "username": profile.username,
                "bio": profile.bio,
                "location": profile.location,
                "url": profile.url,
                "profile_image_url": profile.profile_image_url,
                "profile_banner_url": profile.profile_banner_url,
                "protected": profile.protected,
                "verified": profile.verified,
                "followers_count": profile.followers_count,
                "following_count": profile.following_count
            }
            
            changes = []
            
            if self.history:
                last = self.history[-1]
                for field in self.TRACKED_FIELDS:
                    if current.get(field) != last.get(field):
                        changes.append({
                            "field": field,
                            "old": last.get(field),
                            "new": current.get(field),
                            "timestamp": current["timestamp"]
                        })
            
            # Always save snapshot
            self.history.append(current)
            self._save_history()
            
            return {
                "snapshot": current,
                "changes": changes
            }
    
    def get_field_history(self, field: str) -> list:
        """Get history of changes for a specific field."""
        changes = []
        last_value = None
        
        for snapshot in self.history:
            value = snapshot.get(field)
            if value != last_value and last_value is not None:
                changes.append({
                    "timestamp": snapshot["timestamp"],
                    "old": last_value,
                    "new": value
                })
            last_value = value
        
        return changes

# Usage
async def main():
    tracker = ComprehensiveProfileTracker("elonmusk")
    
    result = await tracker.snapshot()
    
    if result["changes"]:
        print("🔔 Profile changes detected:")
        for change in result["changes"]:
            print(f"   {change['field']}: {change['old']} → {change['new']}")
    else:
        print("No changes detected")
    
    # View bio history
    bio_history = tracker.get_field_history("bio")
    print(f"\nBio changed {len(bio_history)} times")

asyncio.run(main())
```

## Tweet Deletion Monitoring

### Track Deleted Tweets

```python
import asyncio
import json
from datetime import datetime
from pathlib import Path
from xtools import Xtools

class TweetDeletionMonitor:
    def __init__(self, username: str, storage_dir: str = "tweet_archive"):
        self.username = username
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.archive_file = self.storage_dir / f"{username}_tweets.json"
        self.deleted_file = self.storage_dir / f"{username}_deleted.json"
        
        self.known_tweets = self._load_json(self.archive_file)
        self.deleted_tweets = self._load_json(self.deleted_file)
    
    def _load_json(self, path: Path) -> dict:
        if path.exists():
            return json.loads(path.read_text())
        return {}
    
    def _save_json(self, path: Path, data: dict):
        path.write_text(json.dumps(data, indent=2))
    
    async def check_for_deletions(self) -> list:
        """Check for deleted tweets."""
        async with Xtools() as x:
            # Get current tweets
            result = await x.scrape.tweets(self.username, limit=200)
            current_ids = {t.id for t in result.tweets}
            
            # Find deleted tweets
            deleted = []
            for tweet_id, tweet_data in list(self.known_tweets.items()):
                if tweet_id not in current_ids:
                    # Tweet was deleted
                    tweet_data["deleted_at"] = datetime.now().isoformat()
                    deleted.append(tweet_data)
                    self.deleted_tweets[tweet_id] = tweet_data
                    del self.known_tweets[tweet_id]
            
            # Add new tweets to archive
            for tweet in result.tweets:
                if tweet.id not in self.known_tweets:
                    self.known_tweets[tweet.id] = {
                        "id": tweet.id,
                        "text": tweet.text,
                        "created_at": tweet.created_at.isoformat() if tweet.created_at else None,
                        "archived_at": datetime.now().isoformat(),
                        "likes": tweet.like_count,
                        "retweets": tweet.retweet_count
                    }
            
            # Save state
            self._save_json(self.archive_file, self.known_tweets)
            self._save_json(self.deleted_file, self.deleted_tweets)
            
            return deleted
    
    def get_deleted_tweets(self) -> list:
        """Get all recorded deleted tweets."""
        return list(self.deleted_tweets.values())

# Usage
async def main():
    monitor = TweetDeletionMonitor("target_username")
    
    # Check for deletions
    deleted = await monitor.check_for_deletions()
    
    if deleted:
        print(f"🗑️ {len(deleted)} tweets deleted:")
        for tweet in deleted:
            print(f"\n   [{tweet['id']}]")
            print(f"   {tweet['text'][:100]}...")
            print(f"   Originally posted: {tweet['created_at']}")
    else:
        print("No deletions detected")
    
    # View all deleted tweets
    all_deleted = monitor.get_deleted_tweets()
    print(f"\nTotal archived deletions: {len(all_deleted)}")

asyncio.run(main())
```

## Following Changes Monitoring

### Track Who User Follows/Unfollows

```python
import asyncio
import json
from datetime import datetime
from pathlib import Path
from xtools import Xtools

class FollowingChangeMonitor:
    def __init__(self, username: str, storage_dir: str = "following_data"):
        self.username = username
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.state_file = self.storage_dir / f"{username}_following.json"
        self.history_file = self.storage_dir / f"{username}_follow_history.json"
        
        self.known_following = set(self._load_state())
        self.history = self._load_history()
    
    def _load_state(self) -> list:
        if self.state_file.exists():
            return json.loads(self.state_file.read_text())
        return []
    
    def _load_history(self) -> list:
        if self.history_file.exists():
            return json.loads(self.history_file.read_text())
        return []
    
    def _save_state(self, following: set):
        self.state_file.write_text(json.dumps(list(following)))
    
    def _save_history(self):
        self.history_file.write_text(json.dumps(self.history, indent=2))
    
    async def check_changes(self) -> dict:
        """Check for following changes."""
        async with Xtools() as x:
            result = await x.scrape.following(self.username, limit=5000)
            current_following = {u.username for u in result.users}
            
            changes = {
                "new_follows": [],
                "unfollows": [],
                "timestamp": datetime.now().isoformat()
            }
            
            if self.known_following:
                # New follows
                new_follows = current_following - self.known_following
                changes["new_follows"] = list(new_follows)
                
                # Unfollows
                unfollows = self.known_following - current_following
                changes["unfollows"] = list(unfollows)
                
                # Record history
                if new_follows or unfollows:
                    self.history.append(changes)
                    self._save_history()
            
            # Update state
            self.known_following = current_following
            self._save_state(current_following)
            
            return changes
    
    def get_follow_history(self, username: str) -> list:
        """Get follow/unfollow history for specific user."""
        events = []
        for record in self.history:
            if username in record.get("new_follows", []):
                events.append({"action": "followed", "timestamp": record["timestamp"]})
            if username in record.get("unfollows", []):
                events.append({"action": "unfollowed", "timestamp": record["timestamp"]})
        return events

# Usage
async def main():
    monitor = FollowingChangeMonitor("target_username")
    
    changes = await monitor.check_changes()
    
    if changes["new_follows"]:
        print(f"➕ Started following ({len(changes['new_follows'])}):")
        for user in changes["new_follows"][:10]:
            print(f"   @{user}")
    
    if changes["unfollows"]:
        print(f"➖ Stopped following ({len(changes['unfollows'])}):")
        for user in changes["unfollows"][:10]:
            print(f"   @{user}")

asyncio.run(main())
```

## Multiple Account Tracking

### Multi-Account Monitor

```python
import asyncio
import json
from datetime import datetime
from pathlib import Path
from xtools import Xtools

class MultiAccountMonitor:
    def __init__(self, usernames: list, storage_dir: str = "multi_monitor"):
        self.usernames = usernames
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.state = self._load_state()
    
    def _load_state(self) -> dict:
        state_file = self.storage_dir / "state.json"
        if state_file.exists():
            return json.loads(state_file.read_text())
        return {}
    
    def _save_state(self):
        state_file = self.storage_dir / "state.json"
        state_file.write_text(json.dumps(self.state, indent=2))
    
    async def check_all(self) -> dict:
        """Check all accounts for changes."""
        async with Xtools() as x:
            results = {}
            
            for username in self.usernames:
                profile = await x.scrape.profile(username)
                
                current = {
                    "name": profile.name,
                    "bio": profile.bio,
                    "followers": profile.followers_count,
                    "following": profile.following_count,
                    "avatar": profile.profile_image_url,
                    "verified": profile.verified
                }
                
                changes = []
                last = self.state.get(username, {})
                
                for field in ["name", "bio", "avatar", "verified"]:
                    if field in last and current[field] != last[field]:
                        changes.append({
                            "field": field,
                            "old": last[field],
                            "new": current[field]
                        })
                
                results[username] = {
                    "current": current,
                    "changes": changes
                }
                
                self.state[username] = current
                
                await asyncio.sleep(1)  # Rate limiting
            
            self._save_state()
            return results
    
    async def monitor_loop(self, interval_minutes: int = 60):
        """Continuous monitoring loop."""
        print(f"🔍 Monitoring {len(self.usernames)} accounts...")
        
        while True:
            results = await self.check_all()
            
            for username, data in results.items():
                if data["changes"]:
                    print(f"\n🔔 @{username} changes:")
                    for change in data["changes"]:
                        print(f"   {change['field']}: {change['old']} → {change['new']}")
            
            await asyncio.sleep(interval_minutes * 60)

# Usage
async def main():
    accounts = [
        "elonmusk",
        "naval",
        "paulg",
        "sama",
        "vaborsh"
    ]
    
    monitor = MultiAccountMonitor(accounts)
    await monitor.monitor_loop(interval_minutes=30)

asyncio.run(main())
```

## Change History Storage

### Structured Change Log

```python
import asyncio
import sqlite3
from datetime import datetime
from xtools import Xtools

class ChangeHistoryDB:
    def __init__(self, db_path: str = "account_changes.db"):
        self.conn = sqlite3.connect(db_path)
        self._init_db()
    
    def _init_db(self):
        self.conn.executescript("""
            CREATE TABLE IF NOT EXISTS profile_changes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                field TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS tweet_deletions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                tweet_id TEXT NOT NULL,
                tweet_text TEXT,
                original_date TEXT,
                deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS follow_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                target_username TEXT NOT NULL,
                action TEXT NOT NULL,
                detected_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_profile_user ON profile_changes(username);
            CREATE INDEX IF NOT EXISTS idx_deletions_user ON tweet_deletions(username);
            CREATE INDEX IF NOT EXISTS idx_follow_user ON follow_events(username);
        """)
        self.conn.commit()
    
    def log_profile_change(self, username: str, field: str, old_value, new_value):
        self.conn.execute("""
            INSERT INTO profile_changes (username, field, old_value, new_value)
            VALUES (?, ?, ?, ?)
        """, (username, field, str(old_value), str(new_value)))
        self.conn.commit()
    
    def log_deletion(self, username: str, tweet_id: str, text: str, original_date: str):
        self.conn.execute("""
            INSERT INTO tweet_deletions (username, tweet_id, tweet_text, original_date)
            VALUES (?, ?, ?, ?)
        """, (username, tweet_id, text, original_date))
        self.conn.commit()
    
    def log_follow_event(self, username: str, target: str, action: str):
        self.conn.execute("""
            INSERT INTO follow_events (username, target_username, action)
            VALUES (?, ?, ?)
        """, (username, target, action))
        self.conn.commit()
    
    def get_user_history(self, username: str, days: int = 30) -> dict:
        """Get all changes for a user."""
        from datetime import timedelta
        since = (datetime.now() - timedelta(days=days)).isoformat()
        
        profile_changes = self.conn.execute("""
            SELECT field, old_value, new_value, detected_at
            FROM profile_changes
            WHERE username = ? AND detected_at >= ?
            ORDER BY detected_at DESC
        """, (username, since)).fetchall()
        
        deletions = self.conn.execute("""
            SELECT tweet_id, tweet_text, deleted_at
            FROM tweet_deletions
            WHERE username = ? AND deleted_at >= ?
            ORDER BY deleted_at DESC
        """, (username, since)).fetchall()
        
        follow_events = self.conn.execute("""
            SELECT target_username, action, detected_at
            FROM follow_events
            WHERE username = ? AND detected_at >= ?
            ORDER BY detected_at DESC
        """, (username, since)).fetchall()
        
        return {
            "profile_changes": profile_changes,
            "deletions": deletions,
            "follow_events": follow_events
        }

# Usage
db = ChangeHistoryDB()

# Log changes
db.log_profile_change("elonmusk", "bio", "Old bio text", "New bio text")
db.log_deletion("user", "123456", "Deleted tweet text", "2024-01-01")
db.log_follow_event("user", "target", "followed")

# Get history
history = db.get_user_history("elonmusk", days=7)
print(f"Profile changes: {len(history['profile_changes'])}")
print(f"Deletions: {len(history['deletions'])}")
print(f"Follow events: {len(history['follow_events'])}")
```

## Alert Configuration

### Configurable Alert System

```python
import asyncio
from dataclasses import dataclass
from typing import Callable, Optional
from xtools import Xtools
from xtools.notifications import DiscordNotifier, TelegramNotifier

@dataclass
class AlertConfig:
    profile_changes: bool = True
    bio_only: bool = False
    deletions: bool = True
    min_deletion_likes: int = 0
    follow_events: bool = True
    follower_threshold: Optional[int] = None

class ConfigurableMonitor:
    def __init__(
        self,
        username: str,
        config: AlertConfig,
        discord_webhook: str = None,
        telegram_token: str = None,
        telegram_chat: str = None
    ):
        self.username = username
        self.config = config
        self.notifiers = []
        
        if discord_webhook:
            self.notifiers.append(DiscordNotifier(discord_webhook))
        if telegram_token and telegram_chat:
            self.notifiers.append(TelegramNotifier(telegram_token, telegram_chat))
    
    async def send_alert(self, title: str, message: str, priority: str = "normal"):
        """Send alert to all configured notifiers."""
        for notifier in self.notifiers:
            await notifier.send(
                title=title,
                message=message,
                color=0xFF0000 if priority == "high" else 0x00FF00
            )
    
    async def handle_profile_change(self, changes: list):
        if not self.config.profile_changes:
            return
        
        for change in changes:
            if self.config.bio_only and change["field"] != "bio":
                continue
            
            await self.send_alert(
                title=f"@{self.username} Profile Change",
                message=f"{change['field']}: {change['new']}"
            )
    
    async def handle_deletion(self, tweet: dict):
        if not self.config.deletions:
            return
        
        if tweet.get("likes", 0) < self.config.min_deletion_likes:
            return
        
        await self.send_alert(
            title=f"@{self.username} Deleted Tweet",
            message=tweet["text"][:200],
            priority="high" if tweet.get("likes", 0) > 1000 else "normal"
        )
    
    async def handle_follow_event(self, target: str, action: str):
        if not self.config.follow_events:
            return
        
        await self.send_alert(
            title=f"@{self.username} {action.title()}",
            message=f"@{target}"
        )

# Usage
config = AlertConfig(
    profile_changes=True,
    bio_only=False,
    deletions=True,
    min_deletion_likes=100,  # Only alert for popular deletions
    follow_events=True
)

monitor = ConfigurableMonitor(
    "target_user",
    config,
    discord_webhook="https://discord.com/api/webhooks/..."
)
```

## Next Steps

- [Growth Monitoring](growth.md) - Track follower changes
- [Keyword Monitoring](keywords.md) - Monitor mentions and topics
- [Engagement Monitoring](engagement.md) - Track interactions

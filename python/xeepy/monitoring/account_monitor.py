"""
Account monitor - monitor any public account for changes.

Track follower/following changes, new tweets, bio updates, and more.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from ..storage.snapshots import SnapshotStorage
from ..storage.timeseries import TimeSeriesStorage
from ..notifications.manager import NotificationManager


@dataclass
class AccountSnapshot:
    """Snapshot of an account's state"""
    username: str
    timestamp: datetime
    followers_count: int
    following_count: int
    tweets_count: int
    bio: Optional[str] = None
    display_name: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    verified: bool = False
    profile_image_url: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "username": self.username,
            "timestamp": self.timestamp.isoformat(),
            "followers_count": self.followers_count,
            "following_count": self.following_count,
            "tweets_count": self.tweets_count,
            "bio": self.bio,
            "display_name": self.display_name,
            "location": self.location,
            "website": self.website,
            "verified": self.verified,
        }


@dataclass
class AccountChanges:
    """Changes detected for an account"""
    username: str
    period_start: datetime
    period_end: datetime
    followers_change: int = 0
    following_change: int = 0
    tweets_change: int = 0
    new_follows: List[str] = field(default_factory=list)
    new_unfollows: List[str] = field(default_factory=list)
    new_tweets: List[str] = field(default_factory=list)  # Tweet IDs
    bio_changed: bool = False
    old_bio: Optional[str] = None
    new_bio: Optional[str] = None
    display_name_changed: bool = False
    old_display_name: Optional[str] = None
    new_display_name: Optional[str] = None
    
    @property
    def has_changes(self) -> bool:
        """Check if any changes were detected"""
        return (
            self.followers_change != 0 or
            self.following_change != 0 or
            self.tweets_change != 0 or
            self.bio_changed or
            self.display_name_changed or
            bool(self.new_follows) or
            bool(self.new_unfollows) or
            bool(self.new_tweets)
        )
    
    def to_dict(self) -> dict:
        return {
            "username": self.username,
            "period_start": self.period_start.isoformat(),
            "period_end": self.period_end.isoformat(),
            "followers_change": self.followers_change,
            "following_change": self.following_change,
            "tweets_change": self.tweets_change,
            "new_follows": self.new_follows,
            "new_unfollows": self.new_unfollows,
            "new_tweets_count": len(self.new_tweets),
            "bio_changed": self.bio_changed,
            "display_name_changed": self.display_name_changed,
        }
    
    def summary(self) -> str:
        """Generate human-readable summary"""
        parts = []
        
        if self.followers_change:
            parts.append(f"Followers: {self.followers_change:+d}")
        if self.following_change:
            parts.append(f"Following: {self.following_change:+d}")
        if self.tweets_change:
            parts.append(f"Tweets: {self.tweets_change:+d}")
        if self.bio_changed:
            parts.append("Bio changed")
        if self.display_name_changed:
            parts.append("Name changed")
        if self.new_follows:
            parts.append(f"Started following {len(self.new_follows)} accounts")
        if self.new_unfollows:
            parts.append(f"Unfollowed {len(self.new_unfollows)} accounts")
        
        return " | ".join(parts) if parts else "No changes"


class AccountMonitor:
    """
    Monitor any public account for changes.
    
    Track:
    - Follower/following count changes
    - New tweets
    - Bio/profile changes
    - Who they follow/unfollow
    
    Example:
        monitor = AccountMonitor(storage)
        
        # Check once
        changes = await monitor.check("elonmusk")
        if changes.has_changes:
            print(changes.summary())
        
        # Continuous monitoring
        await monitor.monitor(
            ["elonmusk", "jack"],
            interval_minutes=60,
            on_change=lambda c: print(f"@{c.username}: {c.summary()}")
        )
    """
    
    def __init__(
        self,
        snapshot_storage: SnapshotStorage,
        timeseries_storage: Optional[TimeSeriesStorage] = None,
        scraper: Optional[Any] = None,
        notifier: Optional[NotificationManager] = None,
    ):
        """
        Initialize account monitor.
        
        Args:
            snapshot_storage: Storage for account snapshots
            timeseries_storage: Storage for time series data
            scraper: X/Twitter scraper instance
            notifier: Notification manager for alerts
        """
        self.snapshot_storage = snapshot_storage
        self.timeseries_storage = timeseries_storage
        self.scraper = scraper
        self.notifier = notifier
        
        self._previous_snapshots: Dict[str, AccountSnapshot] = {}
    
    async def _get_user_info(self, username: str) -> Optional[AccountSnapshot]:
        """Fetch current user information"""
        if self.scraper is None:
            try:
                from ..scraper import Scraper
                self.scraper = Scraper()
            except ImportError:
                raise RuntimeError("No scraper available")
        
        if hasattr(self.scraper, 'get_user'):
            try:
                user = await self.scraper.get_user(username)
                if user:
                    return AccountSnapshot(
                        username=username.lower(),
                        timestamp=datetime.utcnow(),
                        followers_count=getattr(user, 'followers_count', 0),
                        following_count=getattr(user, 'following_count', 0),
                        tweets_count=getattr(user, 'tweets_count', 0),
                        bio=getattr(user, 'bio', None) or getattr(user, 'description', None),
                        display_name=getattr(user, 'display_name', None) or getattr(user, 'name', None),
                        location=getattr(user, 'location', None),
                        website=getattr(user, 'website', None) or getattr(user, 'url', None),
                        verified=getattr(user, 'verified', False),
                        profile_image_url=getattr(user, 'profile_image_url', None),
                    )
            except Exception as e:
                print(f"Error fetching user {username}: {e}")
        
        return None
    
    async def _get_user_following(self, username: str) -> set[str]:
        """Get accounts that user is following"""
        following = set()
        
        if hasattr(self.scraper, 'get_following'):
            try:
                async for user in self.scraper.get_following(username):
                    if isinstance(user, dict):
                        following.add(user.get('username', '').lower())
                    elif isinstance(user, str):
                        following.add(user.lower())
                    elif hasattr(user, 'username'):
                        following.add(user.username.lower())
            except Exception as e:
                print(f"Error fetching following for {username}: {e}")
        
        return following
    
    async def _get_recent_tweets(
        self,
        username: str,
        limit: int = 20,
    ) -> List[str]:
        """Get recent tweet IDs"""
        tweet_ids = []
        
        if hasattr(self.scraper, 'get_tweets'):
            try:
                count = 0
                async for tweet in self.scraper.get_tweets(username):
                    tweet_id = None
                    if isinstance(tweet, dict):
                        tweet_id = tweet.get('id') or tweet.get('id_str')
                    elif hasattr(tweet, 'id'):
                        tweet_id = tweet.id
                    
                    if tweet_id:
                        tweet_ids.append(str(tweet_id))
                        count += 1
                        if count >= limit:
                            break
            except Exception as e:
                print(f"Error fetching tweets for {username}: {e}")
        
        return tweet_ids
    
    def _compare_snapshots(
        self,
        old: AccountSnapshot,
        new: AccountSnapshot,
    ) -> AccountChanges:
        """Compare two snapshots to find changes"""
        changes = AccountChanges(
            username=new.username,
            period_start=old.timestamp,
            period_end=new.timestamp,
            followers_change=new.followers_count - old.followers_count,
            following_change=new.following_count - old.following_count,
            tweets_change=new.tweets_count - old.tweets_count,
        )
        
        # Check bio change
        if old.bio != new.bio:
            changes.bio_changed = True
            changes.old_bio = old.bio
            changes.new_bio = new.bio
        
        # Check display name change
        if old.display_name != new.display_name:
            changes.display_name_changed = True
            changes.old_display_name = old.display_name
            changes.new_display_name = new.display_name
        
        return changes
    
    async def check(
        self,
        username: str,
        track_following: bool = False,
        track_tweets: bool = False,
        notify: bool = True,
    ) -> AccountChanges:
        """
        Check an account for changes since last check.
        
        Args:
            username: Username to check
            track_following: Also track who they follow/unfollow
            track_tweets: Also track new tweets
            notify: Send notifications on changes
            
        Returns:
            AccountChanges with detected changes
        """
        username = username.lower().lstrip('@')
        
        # Get current state
        current = await self._get_user_info(username)
        if current is None:
            raise ValueError(f"Could not fetch user info for {username}")
        
        # Get previous state
        previous = self._previous_snapshots.get(username)
        
        # Store current for next comparison
        self._previous_snapshots[username] = current
        
        # Record time series data
        if self.timeseries_storage:
            self.timeseries_storage.record_multiple(
                username,
                {
                    "followers": current.followers_count,
                    "following": current.following_count,
                    "tweets": current.tweets_count,
                },
            )
        
        # If no previous data, return empty changes
        if previous is None:
            return AccountChanges(
                username=username,
                period_start=current.timestamp,
                period_end=current.timestamp,
            )
        
        # Compare snapshots
        changes = self._compare_snapshots(previous, current)
        
        # Track following changes if enabled
        if track_following and changes.following_change != 0:
            old_following = self.snapshot_storage.load_snapshot(username, "following")
            current_following = await self._get_user_following(username)
            self.snapshot_storage.save_snapshot(username, "following", current_following)
            
            if old_following:
                changes.new_follows = sorted(current_following - old_following)
                changes.new_unfollows = sorted(old_following - current_following)
        
        # Track new tweets if enabled
        if track_tweets and changes.tweets_change > 0:
            changes.new_tweets = await self._get_recent_tweets(
                username, 
                limit=min(changes.tweets_change + 5, 50)
            )
        
        # Send notifications
        if notify and changes.has_changes and self.notifier:
            await self.notifier.notify_account_change(
                username,
                {
                    "summary": changes.summary(),
                    **changes.to_dict(),
                },
            )
        
        return changes
    
    async def monitor(
        self,
        usernames: List[str],
        interval_minutes: int = 60,
        duration_hours: Optional[float] = None,
        on_change: Optional[Callable[[AccountChanges], None]] = None,
        track_following: bool = False,
        track_tweets: bool = False,
        notify: bool = True,
    ) -> None:
        """
        Continuously monitor accounts for changes.
        
        Args:
            usernames: Accounts to monitor
            interval_minutes: Check frequency
            duration_hours: How long to run (None = forever)
            on_change: Callback when change detected
            track_following: Track who they follow
            track_tweets: Track new tweets
            notify: Send notifications
        """
        usernames = [u.lower().lstrip('@') for u in usernames]
        start_time = datetime.utcnow()
        interval_seconds = interval_minutes * 60
        
        if self.notifier:
            await self.notifier.notify(
                "monitoring_started",
                f"Started monitoring {len(usernames)} account(s)",
                {"accounts": usernames[:10]},
            )
        
        try:
            while True:
                for username in usernames:
                    try:
                        changes = await self.check(
                            username,
                            track_following=track_following,
                            track_tweets=track_tweets,
                            notify=notify,
                        )
                        
                        if changes.has_changes and on_change:
                            on_change(changes)
                        
                    except Exception as e:
                        print(f"Error monitoring {username}: {e}")
                    
                    # Small delay between users to avoid rate limits
                    await asyncio.sleep(2)
                
                # Check duration
                if duration_hours is not None:
                    elapsed = (datetime.utcnow() - start_time).total_seconds() / 3600
                    if elapsed >= duration_hours:
                        break
                
                await asyncio.sleep(interval_seconds)
                
        finally:
            if self.notifier:
                await self.notifier.notify(
                    "monitoring_stopped",
                    f"Stopped monitoring {len(usernames)} account(s)",
                )
    
    async def get_changes_since(
        self,
        username: str,
        since: datetime,
    ) -> Optional[AccountChanges]:
        """
        Get all changes for account since datetime.
        
        Requires time series storage for historical data.
        
        Args:
            username: Account username
            since: Start datetime
            
        Returns:
            AccountChanges or None if insufficient data
        """
        if self.timeseries_storage is None:
            return None
        
        username = username.lower()
        
        # Get historical data
        days_back = (datetime.utcnow() - since).days + 1
        followers_history = self.timeseries_storage.get_series(
            "followers", username, days=days_back
        )
        following_history = self.timeseries_storage.get_series(
            "following", username, days=days_back
        )
        tweets_history = self.timeseries_storage.get_series(
            "tweets", username, days=days_back
        )
        
        if not followers_history.data_points:
            return None
        
        # Find data points closest to since datetime
        old_followers = next(
            (dp for dp in followers_history.data_points if dp.timestamp >= since),
            followers_history.data_points[0] if followers_history.data_points else None
        )
        new_followers = followers_history.data_points[-1] if followers_history.data_points else None
        
        if old_followers is None or new_followers is None:
            return None
        
        old_following = next(
            (dp for dp in following_history.data_points if dp.timestamp >= since),
            None
        )
        new_following = following_history.data_points[-1] if following_history.data_points else None
        
        old_tweets = next(
            (dp for dp in tweets_history.data_points if dp.timestamp >= since),
            None
        )
        new_tweets = tweets_history.data_points[-1] if tweets_history.data_points else None
        
        return AccountChanges(
            username=username,
            period_start=since,
            period_end=datetime.utcnow(),
            followers_change=int(new_followers.value - old_followers.value),
            following_change=int(new_following.value - old_following.value) if old_following and new_following else 0,
            tweets_change=int(new_tweets.value - old_tweets.value) if old_tweets and new_tweets else 0,
        )
    
    def get_tracked_accounts(self) -> List[str]:
        """Get list of accounts currently being tracked"""
        return list(self._previous_snapshots.keys())
    
    def get_latest_snapshot(self, username: str) -> Optional[AccountSnapshot]:
        """Get the latest snapshot for an account"""
        return self._previous_snapshots.get(username.lower())

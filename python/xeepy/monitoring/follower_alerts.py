"""
Follower alerts - notifications for new followers and milestones.

Monitor for new followers and follower count milestones.
"""

import asyncio
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set

from ..storage.snapshots import SnapshotStorage
from ..storage.timeseries import TimeSeriesStorage
from ..notifications.manager import NotificationManager


class EventType(Enum):
    """Types of follower events"""
    NEW_FOLLOWER = "new_follower"
    MILESTONE_REACHED = "milestone_reached"
    RAPID_GROWTH = "rapid_growth"
    FOLLOWER_LOST = "follower_lost"


@dataclass
class FollowerEvent:
    """A follower-related event"""
    event_type: EventType
    timestamp: datetime
    data: Dict[str, Any]
    
    def to_dict(self) -> dict:
        return {
            "event_type": self.event_type.value,
            "timestamp": self.timestamp.isoformat(),
            "data": self.data,
        }


@dataclass 
class MilestoneConfig:
    """Configuration for milestone notifications"""
    milestones: List[int] = None  # Specific milestones to track
    round_number_milestones: bool = True  # Track round numbers (100, 500, 1000, etc.)
    percentage_milestones: bool = False  # Track percentage growth (10%, 25%, etc.)
    custom_check: Optional[Callable[[int, int], bool]] = None  # Custom milestone check
    
    def __post_init__(self):
        if self.milestones is None:
            self.milestones = [100, 500, 1000, 5000, 10000, 25000, 50000, 100000]
    
    def check_milestone(self, old_count: int, new_count: int) -> Optional[int]:
        """
        Check if a milestone was reached.
        
        Args:
            old_count: Previous follower count
            new_count: Current follower count
            
        Returns:
            Milestone value if reached, None otherwise
        """
        if new_count <= old_count:
            return None
        
        # Check specific milestones
        for milestone in self.milestones:
            if old_count < milestone <= new_count:
                return milestone
        
        # Check round number milestones
        if self.round_number_milestones:
            # Check powers of 10 and halves
            for base in [100, 500, 1000, 5000, 10000]:
                multiplier = 1
                while base * multiplier <= new_count:
                    milestone = base * multiplier
                    if old_count < milestone <= new_count:
                        return milestone
                    multiplier += 1
        
        # Custom check
        if self.custom_check and self.custom_check(old_count, new_count):
            return new_count
        
        return None


class FollowerAlerts:
    """
    Monitor for new followers and send alerts.
    
    Features:
    - New follower notifications
    - Milestone alerts (100, 1000, 10000 followers, etc.)
    - Rapid growth detection
    - Follower lost alerts
    
    Example:
        alerts = FollowerAlerts(storage, notifier=notifier)
        
        # Start monitoring
        await alerts.monitor("myusername", interval_minutes=30)
        
        # Or check once
        events = await alerts.check("myusername")
        for event in events:
            print(f"Event: {event.event_type.value}")
    """
    
    def __init__(
        self,
        snapshot_storage: SnapshotStorage,
        timeseries_storage: Optional[TimeSeriesStorage] = None,
        scraper: Optional[Any] = None,
        notifier: Optional[NotificationManager] = None,
        milestone_config: Optional[MilestoneConfig] = None,
    ):
        """
        Initialize follower alerts.
        
        Args:
            snapshot_storage: Storage for follower snapshots
            timeseries_storage: Storage for growth tracking (optional)
            scraper: X/Twitter scraper instance
            notifier: Notification manager
            milestone_config: Milestone notification settings
        """
        self.snapshot_storage = snapshot_storage
        self.timeseries_storage = timeseries_storage
        self.scraper = scraper
        self.notifier = notifier
        self.milestone_config = milestone_config or MilestoneConfig()
        
        self._callbacks: Dict[EventType, List[Callable]] = {
            event_type: [] for event_type in EventType
        }
    
    def on_event(
        self,
        event_type: EventType,
        callback: Callable[[FollowerEvent], None],
    ) -> None:
        """
        Register callback for specific event type.
        
        Args:
            event_type: Type of event to listen for
            callback: Function to call when event occurs
        """
        self._callbacks[event_type].append(callback)
    
    def _emit_event(self, event: FollowerEvent) -> None:
        """Emit event to all registered callbacks"""
        for callback in self._callbacks[event.event_type]:
            try:
                callback(event)
            except Exception as e:
                print(f"Callback error: {e}")
    
    async def _get_current_followers(self, username: str) -> tuple[Set[str], int]:
        """Fetch current followers and count"""
        if self.scraper is None:
            try:
                from ..scraper import Scraper
                self.scraper = Scraper()
            except ImportError:
                raise RuntimeError("No scraper available")
        
        followers = set()
        
        if hasattr(self.scraper, 'get_followers'):
            async for follower in self.scraper.get_followers(username):
                if isinstance(follower, dict):
                    followers.add(follower.get('username', '').lower())
                elif isinstance(follower, str):
                    followers.add(follower.lower())
                elif hasattr(follower, 'username'):
                    followers.add(follower.username.lower())
        
        return followers, len(followers)
    
    async def check(
        self,
        username: str,
        notify: bool = True,
    ) -> List[FollowerEvent]:
        """
        Check for follower events since last check.
        
        Args:
            username: Twitter/X username to check
            notify: Send notifications for events
            
        Returns:
            List of follower events detected
        """
        username = username.lower().lstrip('@')
        events = []
        
        # Get previous snapshot
        previous_result = self.snapshot_storage.load_snapshot_with_metadata(
            username, "followers"
        )
        
        previous_followers: Set[str] = set()
        previous_count = 0
        
        if previous_result:
            previous_followers, metadata = previous_result
            previous_count = metadata.count
        
        # Get current followers
        current_followers, current_count = await self._get_current_followers(username)
        
        # Save new snapshot
        self.snapshot_storage.save_snapshot(username, "followers", current_followers)
        
        # Record in time series
        if self.timeseries_storage:
            self.timeseries_storage.record("followers", username, current_count)
        
        # Skip further analysis if no previous data
        if not previous_followers:
            return events
        
        # Detect new followers
        new_followers = current_followers - previous_followers
        if new_followers:
            event = FollowerEvent(
                event_type=EventType.NEW_FOLLOWER,
                timestamp=datetime.utcnow(),
                data={
                    "new_followers": sorted(new_followers),
                    "count": len(new_followers),
                    "total_followers": current_count,
                },
            )
            events.append(event)
            self._emit_event(event)
            
            if notify and self.notifier:
                await self.notifier.notify_new_followers(sorted(new_followers))
        
        # Detect lost followers
        lost_followers = previous_followers - current_followers
        if lost_followers:
            event = FollowerEvent(
                event_type=EventType.FOLLOWER_LOST,
                timestamp=datetime.utcnow(),
                data={
                    "lost_followers": sorted(lost_followers),
                    "count": len(lost_followers),
                    "total_followers": current_count,
                },
            )
            events.append(event)
            self._emit_event(event)
        
        # Check for milestones
        milestone = self.milestone_config.check_milestone(previous_count, current_count)
        if milestone:
            event = FollowerEvent(
                event_type=EventType.MILESTONE_REACHED,
                timestamp=datetime.utcnow(),
                data={
                    "milestone": milestone,
                    "previous_count": previous_count,
                    "current_count": current_count,
                },
            )
            events.append(event)
            self._emit_event(event)
            
            if notify and self.notifier:
                await self.notifier.notify(
                    "follower_milestone",
                    f"🎉 You reached {milestone:,} followers!",
                    {"milestone": milestone, "current_count": current_count},
                )
        
        # Check for rapid growth
        if previous_count > 0:
            growth_rate = (current_count - previous_count) / previous_count
            if growth_rate >= 0.1:  # 10% growth
                event = FollowerEvent(
                    event_type=EventType.RAPID_GROWTH,
                    timestamp=datetime.utcnow(),
                    data={
                        "growth_rate": growth_rate,
                        "growth_percentage": growth_rate * 100,
                        "gained": current_count - previous_count,
                        "previous_count": previous_count,
                        "current_count": current_count,
                    },
                )
                events.append(event)
                self._emit_event(event)
        
        return events
    
    async def monitor(
        self,
        username: str,
        interval_minutes: int = 30,
        duration_hours: Optional[float] = None,
        on_event: Optional[Callable[[FollowerEvent], None]] = None,
        notify: bool = True,
    ) -> None:
        """
        Continuously monitor for follower events.
        
        Args:
            username: Twitter/X username to monitor
            interval_minutes: Check frequency in minutes
            duration_hours: How long to run (None = forever)
            on_event: Callback for all events
            notify: Send notifications
        """
        start_time = datetime.utcnow()
        interval_seconds = interval_minutes * 60
        
        if self.notifier:
            await self.notifier.notify(
                "monitoring_started",
                f"Started follower monitoring for @{username}",
                {"interval_minutes": interval_minutes},
            )
        
        try:
            while True:
                try:
                    events = await self.check(username, notify=notify)
                    
                    if on_event:
                        for event in events:
                            on_event(event)
                    
                except Exception as e:
                    print(f"Monitoring error: {e}")
                
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
                    f"Stopped follower monitoring for @{username}",
                )
    
    async def get_new_followers_since(
        self,
        username: str,
        since_snapshot_id: str,
    ) -> List[str]:
        """
        Get new followers since a specific snapshot.
        
        Args:
            username: Twitter/X username
            since_snapshot_id: Snapshot ID to compare against
            
        Returns:
            List of new follower usernames
        """
        old_followers = self.snapshot_storage.load_snapshot(
            username, "followers", since_snapshot_id
        )
        
        if old_followers is None:
            return []
        
        current_followers, _ = await self._get_current_followers(username)
        
        new_followers = current_followers - old_followers
        return sorted(new_followers)
    
    def get_follower_count_history(
        self,
        username: str,
        days: int = 30,
    ) -> List[dict]:
        """
        Get follower count history from time series.
        
        Args:
            username: Twitter/X username
            days: Number of days to look back
            
        Returns:
            List of daily count records
        """
        if self.timeseries_storage is None:
            return []
        
        return self.timeseries_storage.get_daily_series("followers", username, days)

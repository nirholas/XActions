"""
Unfollower detector - detect who unfollowed you.

Compare follower snapshots to identify users who unfollowed.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Set

from ..storage.snapshots import SnapshotStorage, SnapshotMetadata
from ..notifications.manager import NotificationManager, NotifyConfig


@dataclass
class UnfollowerReport:
    """Report on unfollower detection"""
    unfollowers: List[str]
    new_followers: List[str]
    total_followers_before: int
    total_followers_after: int
    net_change: int
    timestamp: datetime
    unfollower_details: List[Dict[str, Any]] = field(default_factory=list)
    new_follower_details: List[Dict[str, Any]] = field(default_factory=list)
    previous_snapshot_id: Optional[str] = None
    current_snapshot_id: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Convert report to dictionary"""
        return {
            "unfollowers": self.unfollowers,
            "new_followers": self.new_followers,
            "total_followers_before": self.total_followers_before,
            "total_followers_after": self.total_followers_after,
            "net_change": self.net_change,
            "timestamp": self.timestamp.isoformat(),
            "unfollower_count": len(self.unfollowers),
            "new_follower_count": len(self.new_followers),
        }
    
    @property
    def has_changes(self) -> bool:
        """Check if there are any changes"""
        return bool(self.unfollowers or self.new_followers)
    
    def summary(self) -> str:
        """Generate human-readable summary"""
        parts = []
        
        if self.unfollowers:
            parts.append(f"{len(self.unfollowers)} unfollower(s): {', '.join(self.unfollowers[:5])}")
            if len(self.unfollowers) > 5:
                parts[-1] += f" (+{len(self.unfollowers) - 5} more)"
        
        if self.new_followers:
            parts.append(f"{len(self.new_followers)} new follower(s): {', '.join(self.new_followers[:5])}")
            if len(self.new_followers) > 5:
                parts[-1] += f" (+{len(self.new_followers) - 5} more)"
        
        parts.append(f"Net change: {self.net_change:+d} (was {self.total_followers_before}, now {self.total_followers_after})")
        
        return "\n".join(parts)


class UnfollowerDetector:
    """
    Detect who unfollowed you by comparing snapshots.
    
    This is one of the most requested features - track who unfollowed
    your account by comparing current followers with previous snapshots.
    
    Example:
        from xeepy.storage import SnapshotStorage
        from xeepy.monitoring import UnfollowerDetector
        
        storage = SnapshotStorage()
        detector = UnfollowerDetector(storage)
        
        # First run - creates initial snapshot
        report = await detector.detect("myusername")
        
        # Later - detects changes since last check
        report = await detector.detect("myusername")
        if report.unfollowers:
            print(f"Unfollowers: {report.unfollowers}")
    """
    
    def __init__(
        self,
        storage: SnapshotStorage,
        scraper: Optional[Any] = None,
        notifier: Optional[NotificationManager] = None,
    ):
        """
        Initialize unfollower detector.
        
        Args:
            storage: Snapshot storage for persisting follower data
            scraper: X/Twitter scraper instance for fetching followers
            notifier: Notification manager for alerts
        """
        self.storage = storage
        self.scraper = scraper
        self.notifier = notifier
    
    async def _get_current_followers(self, username: str) -> Set[str]:
        """
        Fetch current followers for a user.
        
        Args:
            username: Twitter/X username
            
        Returns:
            Set of follower usernames
        """
        if self.scraper is None:
            # Try to import and create scraper
            try:
                from ..scraper import Scraper
                self.scraper = Scraper()
            except ImportError:
                raise RuntimeError(
                    "No scraper provided and unable to import default scraper. "
                    "Please provide a scraper instance or install required dependencies."
                )
        
        followers = set()
        
        # Use scraper to get followers
        if hasattr(self.scraper, 'get_followers'):
            async for follower in self.scraper.get_followers(username):
                if isinstance(follower, dict):
                    followers.add(follower.get('username', '').lower())
                elif isinstance(follower, str):
                    followers.add(follower.lower())
                elif hasattr(follower, 'username'):
                    followers.add(follower.username.lower())
        
        return followers
    
    async def _get_user_details(self, usernames: List[str]) -> List[Dict[str, Any]]:
        """
        Fetch detailed information for users.
        
        Args:
            usernames: List of usernames to fetch
            
        Returns:
            List of user detail dictionaries
        """
        if not usernames or self.scraper is None:
            return []
        
        details = []
        
        if hasattr(self.scraper, 'get_user'):
            for username in usernames[:50]:  # Limit to avoid rate limits
                try:
                    user = await self.scraper.get_user(username)
                    if user:
                        details.append({
                            "username": username,
                            "display_name": getattr(user, 'display_name', None),
                            "followers_count": getattr(user, 'followers_count', None),
                            "following_count": getattr(user, 'following_count', None),
                            "bio": getattr(user, 'bio', None),
                        })
                except Exception:
                    details.append({"username": username})
        
        return details
    
    def _compare_snapshots(
        self,
        old: Set[str],
        new: Set[str],
    ) -> tuple[Set[str], Set[str]]:
        """
        Compare snapshots to find changes.
        
        Args:
            old: Previous followers set
            new: Current followers set
            
        Returns:
            Tuple of (unfollowers, new_followers)
        """
        unfollowers = old - new
        new_followers = new - old
        
        return unfollowers, new_followers
    
    async def detect(
        self,
        username: str,
        since_snapshot: Optional[str] = None,
        notify: bool = True,
        fetch_details: bool = False,
    ) -> UnfollowerReport:
        """
        Detect unfollowers since last check.
        
        Algorithm:
        1. Load previous followers snapshot
        2. Fetch current followers
        3. Compare and find removed followers
        4. Save new snapshot
        5. Generate report
        
        Args:
            username: Your Twitter/X username
            since_snapshot: Compare against specific snapshot ID (None = latest)
            notify: Send notifications if unfollowers detected
            fetch_details: Fetch full profile info for unfollowers
            
        Returns:
            UnfollowerReport with details on changes
        """
        username = username.lower().lstrip('@')
        
        # Load previous snapshot
        previous_result = self.storage.load_snapshot_with_metadata(
            username, 
            "followers", 
            since_snapshot
        )
        
        previous_followers: Set[str] = set()
        previous_metadata: Optional[SnapshotMetadata] = None
        
        if previous_result:
            previous_followers, previous_metadata = previous_result
        
        # Fetch current followers
        current_followers = await self._get_current_followers(username)
        
        # Save new snapshot
        current_snapshot_id = self.storage.save_snapshot(
            username,
            "followers",
            current_followers,
        )
        
        # If no previous snapshot, just return with current data
        if not previous_followers:
            return UnfollowerReport(
                unfollowers=[],
                new_followers=list(current_followers),
                total_followers_before=0,
                total_followers_after=len(current_followers),
                net_change=len(current_followers),
                timestamp=datetime.utcnow(),
                current_snapshot_id=current_snapshot_id,
            )
        
        # Compare snapshots
        unfollowers, new_followers = self._compare_snapshots(
            previous_followers,
            current_followers,
        )
        
        # Fetch details if requested
        unfollower_details = []
        new_follower_details = []
        
        if fetch_details:
            unfollower_details = await self._get_user_details(list(unfollowers))
            new_follower_details = await self._get_user_details(list(new_followers))
        
        # Create report
        report = UnfollowerReport(
            unfollowers=sorted(unfollowers),
            new_followers=sorted(new_followers),
            total_followers_before=len(previous_followers),
            total_followers_after=len(current_followers),
            net_change=len(current_followers) - len(previous_followers),
            timestamp=datetime.utcnow(),
            unfollower_details=unfollower_details,
            new_follower_details=new_follower_details,
            previous_snapshot_id=previous_metadata.snapshot_id if previous_metadata else None,
            current_snapshot_id=current_snapshot_id,
        )
        
        # Send notifications if enabled and there are unfollowers
        if notify and self.notifier and unfollowers:
            await self.notifier.notify_unfollowers(
                report.unfollowers,
                report.total_followers_before,
                report.total_followers_after,
            )
        
        return report
    
    async def detect_with_callback(
        self,
        username: str,
        on_unfollower: Callable[[str, Dict[str, Any]], None],
        on_new_follower: Optional[Callable[[str, Dict[str, Any]], None]] = None,
        fetch_details: bool = False,
    ) -> UnfollowerReport:
        """
        Detect unfollowers and call callback for each one.
        
        Args:
            username: Your Twitter/X username
            on_unfollower: Callback for each unfollower (username, details)
            on_new_follower: Callback for each new follower (optional)
            fetch_details: Fetch full profile info
            
        Returns:
            UnfollowerReport
        """
        report = await self.detect(
            username,
            notify=False,
            fetch_details=fetch_details,
        )
        
        # Call unfollower callbacks
        for i, unfollower in enumerate(report.unfollowers):
            details = report.unfollower_details[i] if i < len(report.unfollower_details) else {}
            on_unfollower(unfollower, details)
        
        # Call new follower callbacks
        if on_new_follower:
            for i, follower in enumerate(report.new_followers):
                details = report.new_follower_details[i] if i < len(report.new_follower_details) else {}
                on_new_follower(follower, details)
        
        return report
    
    async def schedule_detection(
        self,
        username: str,
        interval_hours: float = 1.0,
        duration_hours: Optional[float] = None,
        on_report: Optional[Callable[[UnfollowerReport], None]] = None,
        notify: bool = True,
    ) -> None:
        """
        Schedule periodic unfollower detection.
        
        Args:
            username: Your Twitter/X username
            interval_hours: How often to check (in hours)
            duration_hours: How long to run (None = forever)
            on_report: Callback for each report
            notify: Send notifications
        """
        start_time = datetime.utcnow()
        interval_seconds = interval_hours * 3600
        
        while True:
            try:
                report = await self.detect(username, notify=notify)
                
                if on_report:
                    on_report(report)
                
            except Exception as e:
                print(f"Detection error: {e}")
            
            # Check if we should stop
            if duration_hours is not None:
                elapsed = (datetime.utcnow() - start_time).total_seconds() / 3600
                if elapsed >= duration_hours:
                    break
            
            await asyncio.sleep(interval_seconds)
    
    def get_history(
        self,
        username: str,
        limit: int = 10,
    ) -> List[SnapshotMetadata]:
        """
        Get snapshot history for a user.
        
        Args:
            username: Twitter/X username
            limit: Maximum number of snapshots to return
            
        Returns:
            List of snapshot metadata
        """
        return self.storage.list_snapshots(username, "followers", limit)
    
    def compare_specific_snapshots(
        self,
        username: str,
        old_snapshot_id: str,
        new_snapshot_id: str,
    ) -> Optional[tuple[Set[str], Set[str]]]:
        """
        Compare two specific snapshots.
        
        Args:
            username: Twitter/X username
            old_snapshot_id: Older snapshot ID
            new_snapshot_id: Newer snapshot ID
            
        Returns:
            Tuple of (unfollowers, new_followers) or None if snapshots not found
        """
        old_followers = self.storage.load_snapshot(username, "followers", old_snapshot_id)
        new_followers = self.storage.load_snapshot(username, "followers", new_snapshot_id)
        
        if old_followers is None or new_followers is None:
            return None
        
        return self._compare_snapshots(old_followers, new_followers)

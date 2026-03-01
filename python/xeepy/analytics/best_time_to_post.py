"""
Best time to post analyzer - find optimal posting times.

Analyze historical engagement data to determine the best times to post.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, time
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class TimeSlot:
    """A time slot for posting"""
    day: str
    hour: int
    avg_engagement: float
    sample_size: int
    confidence: str  # low, medium, high
    
    @property
    def time_str(self) -> str:
        """Get formatted time string"""
        hour_12 = self.hour % 12 or 12
        am_pm = "AM" if self.hour < 12 else "PM"
        return f"{hour_12}:00 {am_pm}"
    
    def to_dict(self) -> dict:
        return {
            "day": self.day,
            "hour": self.hour,
            "time": self.time_str,
            "avg_engagement": self.avg_engagement,
            "sample_size": self.sample_size,
            "confidence": self.confidence,
        }


@dataclass
class PostingSchedule:
    """Recommended posting schedule"""
    best_slots: List[TimeSlot]
    worst_slots: List[TimeSlot]
    by_day: Dict[str, List[TimeSlot]]
    heatmap: Dict[str, Dict[int, float]]  # day -> hour -> engagement
    overall_best_days: List[str]
    overall_best_hours: List[int]
    recommended_posts_per_day: int
    
    def to_dict(self) -> dict:
        return {
            "best_slots": [s.to_dict() for s in self.best_slots],
            "worst_slots": [s.to_dict() for s in self.worst_slots],
            "overall_best_days": self.overall_best_days,
            "overall_best_hours": self.overall_best_hours,
            "recommended_posts_per_day": self.recommended_posts_per_day,
        }
    
    def get_schedule_text(self) -> str:
        """Generate human-readable schedule"""
        lines = ["📅 Recommended Posting Schedule", "=" * 30]
        
        for slot in self.best_slots[:7]:  # Top 7 slots
            lines.append(f"  • {slot.day} at {slot.time_str} (avg: {slot.avg_engagement:.0f})")
        
        if self.overall_best_days:
            lines.append(f"\n🏆 Best days: {', '.join(self.overall_best_days[:3])}")
        
        if self.overall_best_hours:
            hours_str = ", ".join(
                f"{h % 12 or 12}{'AM' if h < 12 else 'PM'}" 
                for h in self.overall_best_hours[:3]
            )
            lines.append(f"⏰ Best hours: {hours_str}")
        
        lines.append(f"\n📝 Recommended: {self.recommended_posts_per_day} posts per day")
        
        return "\n".join(lines)


class BestTimeAnalyzer:
    """
    Find optimal posting times based on engagement data.
    
    Analyzes historical tweet performance to identify:
    - Best hours to post
    - Best days to post
    - Best day+hour combinations
    - Personalized posting schedule
    
    Example:
        analyzer = BestTimeAnalyzer(scraper)
        
        schedule = await analyzer.analyze("myusername", limit=200)
        print(schedule.get_schedule_text())
        
        # Get heatmap data for visualization
        heatmap = schedule.heatmap
    """
    
    DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    
    def __init__(
        self,
        scraper: Optional[Any] = None,
    ):
        """
        Initialize best time analyzer.
        
        Args:
            scraper: X/Twitter scraper instance
        """
        self.scraper = scraper
    
    def _parse_tweet_time_data(self, tweet: Any) -> Optional[dict]:
        """Extract time and engagement data from tweet"""
        if isinstance(tweet, dict):
            created_at = tweet.get('created_at')
            if isinstance(created_at, str):
                for fmt in [
                    "%a %b %d %H:%M:%S +0000 %Y",
                    "%Y-%m-%dT%H:%M:%S.%fZ",
                    "%Y-%m-%d %H:%M:%S",
                ]:
                    try:
                        created_at = datetime.strptime(created_at, fmt)
                        break
                    except ValueError:
                        continue
            
            if not isinstance(created_at, datetime):
                return None
            
            likes = tweet.get('favorite_count') or tweet.get('likes', 0)
            retweets = tweet.get('retweet_count') or tweet.get('retweets', 0)
            replies = tweet.get('reply_count') or tweet.get('replies', 0)
            quotes = tweet.get('quote_count') or tweet.get('quotes', 0)
            
            return {
                "created_at": created_at,
                "day": self.DAY_NAMES[created_at.weekday()],
                "hour": created_at.hour,
                "engagement": likes + retweets + replies + quotes,
            }
        else:
            created_at = getattr(tweet, 'created_at', None)
            if created_at is None:
                return None
            
            if isinstance(created_at, str):
                try:
                    created_at = datetime.strptime(created_at, "%a %b %d %H:%M:%S +0000 %Y")
                except ValueError:
                    return None
            
            likes = getattr(tweet, 'likes', 0) or getattr(tweet, 'favorite_count', 0)
            retweets = getattr(tweet, 'retweets', 0) or getattr(tweet, 'retweet_count', 0)
            replies = getattr(tweet, 'replies', 0) or getattr(tweet, 'reply_count', 0)
            quotes = getattr(tweet, 'quotes', 0) or getattr(tweet, 'quote_count', 0)
            
            return {
                "created_at": created_at,
                "day": self.DAY_NAMES[created_at.weekday()],
                "hour": created_at.hour,
                "engagement": likes + retweets + replies + quotes,
            }
    
    async def _fetch_tweets(
        self,
        username: str,
        limit: int,
    ) -> List[dict]:
        """Fetch tweets with time data"""
        if self.scraper is None:
            try:
                from ..scraper import Scraper
                self.scraper = Scraper()
            except ImportError:
                raise RuntimeError("No scraper available")
        
        data = []
        
        if hasattr(self.scraper, 'get_tweets'):
            try:
                count = 0
                async for tweet in self.scraper.get_tweets(username):
                    parsed = self._parse_tweet_time_data(tweet)
                    if parsed:
                        data.append(parsed)
                        count += 1
                        if count >= limit:
                            break
            except Exception as e:
                print(f"Error fetching tweets: {e}")
        
        return data
    
    def _calculate_confidence(self, sample_size: int) -> str:
        """Determine confidence level based on sample size"""
        if sample_size >= 10:
            return "high"
        elif sample_size >= 5:
            return "medium"
        else:
            return "low"
    
    async def analyze(
        self,
        username: str,
        limit: int = 200,
        min_sample_size: int = 3,
    ) -> PostingSchedule:
        """
        Analyze best posting times for a user.
        
        Args:
            username: Twitter/X username
            limit: Number of tweets to analyze
            min_sample_size: Minimum samples for a slot to be considered
            
        Returns:
            PostingSchedule with recommendations
        """
        username = username.lower().lstrip('@')
        tweet_data = await self._fetch_tweets(username, limit)
        
        if not tweet_data:
            return PostingSchedule(
                best_slots=[],
                worst_slots=[],
                by_day={},
                heatmap={},
                overall_best_days=[],
                overall_best_hours=[],
                recommended_posts_per_day=1,
            )
        
        # Aggregate by day+hour
        slot_data = defaultdict(list)
        for t in tweet_data:
            key = (t["day"], t["hour"])
            slot_data[key].append(t["engagement"])
        
        # Calculate averages and create TimeSlots
        all_slots = []
        for (day, hour), engagements in slot_data.items():
            if len(engagements) >= min_sample_size:
                avg = sum(engagements) / len(engagements)
                all_slots.append(TimeSlot(
                    day=day,
                    hour=hour,
                    avg_engagement=avg,
                    sample_size=len(engagements),
                    confidence=self._calculate_confidence(len(engagements)),
                ))
        
        # Sort by engagement
        all_slots.sort(key=lambda s: s.avg_engagement, reverse=True)
        
        best_slots = all_slots[:10]
        worst_slots = all_slots[-5:] if len(all_slots) > 5 else []
        
        # Group by day
        by_day = defaultdict(list)
        for slot in all_slots:
            by_day[slot.day].append(slot)
        
        # Sort each day's slots
        for day in by_day:
            by_day[day].sort(key=lambda s: s.avg_engagement, reverse=True)
        
        # Create heatmap
        heatmap = {day: {} for day in self.DAY_NAMES}
        for slot in all_slots:
            heatmap[slot.day][slot.hour] = slot.avg_engagement
        
        # Calculate overall best days
        day_totals = defaultdict(list)
        for t in tweet_data:
            day_totals[t["day"]].append(t["engagement"])
        
        day_avgs = [
            (day, sum(engs) / len(engs))
            for day, engs in day_totals.items()
            if len(engs) >= min_sample_size
        ]
        day_avgs.sort(key=lambda x: x[1], reverse=True)
        overall_best_days = [d for d, _ in day_avgs]
        
        # Calculate overall best hours
        hour_totals = defaultdict(list)
        for t in tweet_data:
            hour_totals[t["hour"]].append(t["engagement"])
        
        hour_avgs = [
            (hour, sum(engs) / len(engs))
            for hour, engs in hour_totals.items()
            if len(engs) >= min_sample_size
        ]
        hour_avgs.sort(key=lambda x: x[1], reverse=True)
        overall_best_hours = [h for h, _ in hour_avgs]
        
        # Calculate recommended posts per day
        posts_per_day = len(tweet_data) / max(1, (tweet_data[-1]["created_at"] - tweet_data[0]["created_at"]).days) if tweet_data else 1
        recommended_posts = max(1, min(5, round(posts_per_day)))
        
        return PostingSchedule(
            best_slots=best_slots,
            worst_slots=worst_slots,
            by_day=dict(by_day),
            heatmap=heatmap,
            overall_best_days=overall_best_days,
            overall_best_hours=overall_best_hours,
            recommended_posts_per_day=recommended_posts,
        )
    
    def generate_heatmap_data(
        self,
        schedule: PostingSchedule,
    ) -> List[List[float]]:
        """
        Generate heatmap data for visualization.
        
        Returns a 7x24 matrix (days x hours) suitable for heatmap plotting.
        
        Args:
            schedule: PostingSchedule from analyze()
            
        Returns:
            2D list of engagement values
        """
        matrix = []
        
        for day in self.DAY_NAMES:
            row = []
            day_data = schedule.heatmap.get(day, {})
            for hour in range(24):
                row.append(day_data.get(hour, 0))
            matrix.append(row)
        
        return matrix
    
    def plot_heatmap(
        self,
        schedule: PostingSchedule,
        output_path: Optional[str] = None,
    ) -> Optional[str]:
        """
        Generate heatmap visualization.
        
        Args:
            schedule: PostingSchedule from analyze()
            output_path: Where to save (None = return base64)
            
        Returns:
            Path to saved image or base64 encoded image
        """
        try:
            import matplotlib.pyplot as plt
            import numpy as np
        except ImportError:
            print("matplotlib and numpy required for heatmap")
            return None
        
        data = self.generate_heatmap_data(schedule)
        
        fig, ax = plt.subplots(figsize=(14, 6))
        
        # Create heatmap
        im = ax.imshow(data, cmap='YlOrRd', aspect='auto')
        
        # Labels
        ax.set_xticks(range(24))
        ax.set_xticklabels([f"{h % 12 or 12}{'a' if h < 12 else 'p'}" for h in range(24)])
        ax.set_yticks(range(7))
        ax.set_yticklabels(self.DAY_NAMES)
        
        ax.set_xlabel("Hour")
        ax.set_ylabel("Day")
        ax.set_title("Engagement Heatmap by Day and Hour")
        
        # Colorbar
        plt.colorbar(im, label="Avg Engagement")
        
        plt.tight_layout()
        
        if output_path:
            plt.savefig(output_path, dpi=150, bbox_inches='tight')
            plt.close()
            return output_path
        else:
            import io
            import base64
            
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
            plt.close()
            buffer.seek(0)
            
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    def get_next_best_time(
        self,
        schedule: PostingSchedule,
        after: Optional[datetime] = None,
    ) -> Optional[TimeSlot]:
        """
        Get the next best time slot to post.
        
        Args:
            schedule: PostingSchedule from analyze()
            after: Time to search after (default: now)
            
        Returns:
            Next best TimeSlot or None
        """
        after = after or datetime.now()
        current_day = self.DAY_NAMES[after.weekday()]
        current_hour = after.hour
        
        # Look through best slots for the next upcoming one
        for slot in schedule.best_slots:
            slot_day_idx = self.DAY_NAMES.index(slot.day)
            current_day_idx = self.DAY_NAMES.index(current_day)
            
            # Same day, later hour
            if slot.day == current_day and slot.hour > current_hour:
                return slot
            
            # Future day
            if slot_day_idx > current_day_idx:
                return slot
            
            # Next week
            if slot_day_idx < current_day_idx:
                return slot
        
        # Return the first best slot (will be next week)
        return schedule.best_slots[0] if schedule.best_slots else None

"""
Growth tracker - track follower growth over time.

Store daily snapshots and analyze growth patterns.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from ..storage.timeseries import TimeSeriesStorage


@dataclass
class GrowthReport:
    """Report on follower growth"""
    username: str
    period_days: int
    start_followers: int
    end_followers: int
    net_change: int
    change_percentage: float
    avg_daily_growth: float
    best_day: Optional[dict] = None
    worst_day: Optional[dict] = None
    growth_trend: str = "stable"  # growing, declining, stable
    daily_data: List[dict] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "username": self.username,
            "period_days": self.period_days,
            "start_followers": self.start_followers,
            "end_followers": self.end_followers,
            "net_change": self.net_change,
            "change_percentage": self.change_percentage,
            "avg_daily_growth": self.avg_daily_growth,
            "best_day": self.best_day,
            "worst_day": self.worst_day,
            "growth_trend": self.growth_trend,
        }
    
    def summary(self) -> str:
        """Generate human-readable summary"""
        sign = "+" if self.net_change >= 0 else ""
        return (
            f"@{self.username} Growth Report ({self.period_days} days)\n"
            f"  Followers: {self.start_followers:,} → {self.end_followers:,} "
            f"({sign}{self.net_change:,}, {sign}{self.change_percentage:.1f}%)\n"
            f"  Avg daily growth: {self.avg_daily_growth:+.1f}\n"
            f"  Trend: {self.growth_trend}"
        )


class GrowthTracker:
    """
    Track follower growth over time.
    
    Stores daily snapshots for historical analysis and provides
    growth metrics, trends, and visualizations.
    
    Example:
        tracker = GrowthTracker(storage)
        
        # Record current stats
        await tracker.record_snapshot("myusername")
        
        # Get growth history
        history = tracker.get_growth_history("myusername", days=30)
        
        # Generate report
        report = tracker.generate_report("myusername", days=30)
        print(report.summary())
    """
    
    def __init__(
        self,
        storage: TimeSeriesStorage,
        scraper: Optional[Any] = None,
    ):
        """
        Initialize growth tracker.
        
        Args:
            storage: Time series storage for historical data
            scraper: X/Twitter scraper instance
        """
        self.storage = storage
        self.scraper = scraper
    
    async def _get_user_stats(self, username: str) -> Optional[dict]:
        """Fetch current user statistics"""
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
                    if isinstance(user, dict):
                        return {
                            "followers": user.get('followers_count', 0),
                            "following": user.get('following_count', 0) or user.get('friends_count', 0),
                            "tweets": user.get('tweets_count', 0) or user.get('statuses_count', 0),
                            "likes": user.get('likes_count', 0) or user.get('favourites_count', 0),
                            "listed": user.get('listed_count', 0),
                        }
                    else:
                        return {
                            "followers": getattr(user, 'followers_count', 0),
                            "following": getattr(user, 'following_count', 0) or getattr(user, 'friends_count', 0),
                            "tweets": getattr(user, 'tweets_count', 0) or getattr(user, 'statuses_count', 0),
                            "likes": getattr(user, 'likes_count', 0) or getattr(user, 'favourites_count', 0),
                            "listed": getattr(user, 'listed_count', 0),
                        }
            except Exception as e:
                print(f"Error fetching user {username}: {e}")
        
        return None
    
    async def record_snapshot(
        self,
        username: str,
        stats: Optional[dict] = None,
    ) -> dict:
        """
        Record current stats snapshot.
        
        Args:
            username: Twitter/X username
            stats: Pre-fetched stats (optional)
            
        Returns:
            Recorded stats dictionary
        """
        username = username.lower().lstrip('@')
        
        if stats is None:
            stats = await self._get_user_stats(username)
        
        if stats is None:
            raise ValueError(f"Could not fetch stats for {username}")
        
        # Record all metrics
        timestamp = datetime.utcnow()
        
        self.storage.record("followers", username, stats.get("followers", 0), timestamp)
        self.storage.record("following", username, stats.get("following", 0), timestamp)
        self.storage.record("tweets", username, stats.get("tweets", 0), timestamp)
        self.storage.record("likes", username, stats.get("likes", 0), timestamp)
        
        return {
            "username": username,
            "timestamp": timestamp.isoformat(),
            **stats,
        }
    
    def get_growth_history(
        self,
        username: str,
        days: int = 30,
        metric: str = "followers",
    ) -> List[dict]:
        """
        Get historical growth data.
        
        Args:
            username: Twitter/X username
            days: Number of days to look back
            metric: Metric to get history for
            
        Returns:
            List of daily data points
        """
        username = username.lower()
        return self.storage.get_daily_series(metric, username, days)
    
    def calculate_growth_rate(
        self,
        username: str,
        days: int = 7,
    ) -> Optional[float]:
        """
        Calculate growth rate percentage.
        
        Args:
            username: Twitter/X username
            days: Period to calculate over
            
        Returns:
            Growth rate as percentage, or None if insufficient data
        """
        username = username.lower()
        change = self.storage.get_change("followers", username, days)
        
        if change is None:
            return None
        
        return change.get("change_percentage")
    
    def generate_report(
        self,
        username: str,
        days: int = 30,
    ) -> GrowthReport:
        """
        Generate comprehensive growth report.
        
        Args:
            username: Twitter/X username
            days: Period to analyze
            
        Returns:
            GrowthReport with growth metrics and trends
        """
        username = username.lower()
        
        # Get daily data
        daily_data = self.get_growth_history(username, days, "followers")
        
        if not daily_data:
            return GrowthReport(
                username=username,
                period_days=days,
                start_followers=0,
                end_followers=0,
                net_change=0,
                change_percentage=0,
                avg_daily_growth=0,
            )
        
        # Calculate metrics
        start_followers = daily_data[0].get("last", 0) or daily_data[0].get("avg", 0)
        end_followers = daily_data[-1].get("last", 0) or daily_data[-1].get("avg", 0)
        net_change = end_followers - start_followers
        
        change_percentage = 0.0
        if start_followers > 0:
            change_percentage = (net_change / start_followers) * 100
        
        # Calculate daily changes
        daily_changes = []
        for i in range(1, len(daily_data)):
            prev = daily_data[i - 1].get("last", 0) or daily_data[i - 1].get("avg", 0)
            curr = daily_data[i].get("last", 0) or daily_data[i].get("avg", 0)
            daily_changes.append({
                "date": daily_data[i].get("date"),
                "change": curr - prev,
                "value": curr,
            })
        
        avg_daily_growth = net_change / days if days > 0 else 0
        
        # Find best and worst days
        best_day = max(daily_changes, key=lambda x: x["change"]) if daily_changes else None
        worst_day = min(daily_changes, key=lambda x: x["change"]) if daily_changes else None
        
        # Determine trend
        growth_trend = "stable"
        if len(daily_changes) >= 7:
            recent_avg = sum(d["change"] for d in daily_changes[-7:]) / 7
            if recent_avg > 1:
                growth_trend = "growing"
            elif recent_avg < -1:
                growth_trend = "declining"
        
        return GrowthReport(
            username=username,
            period_days=days,
            start_followers=int(start_followers),
            end_followers=int(end_followers),
            net_change=net_change,
            change_percentage=change_percentage,
            avg_daily_growth=avg_daily_growth,
            best_day=best_day,
            worst_day=worst_day,
            growth_trend=growth_trend,
            daily_data=daily_changes,
        )
    
    def generate_growth_chart(
        self,
        username: str,
        days: int = 30,
        output_path: Optional[str] = None,
    ) -> Optional[str]:
        """
        Generate growth visualization chart.
        
        Requires matplotlib to be installed.
        
        Args:
            username: Twitter/X username
            days: Period to visualize
            output_path: Where to save chart (None = return as base64)
            
        Returns:
            Path to saved chart or base64 encoded image
        """
        try:
            import matplotlib.pyplot as plt
            import matplotlib.dates as mdates
        except ImportError:
            print("matplotlib required for chart generation")
            return None
        
        daily_data = self.get_growth_history(username, days, "followers")
        
        if not daily_data:
            return None
        
        # Extract data
        dates = [d.get("date") for d in daily_data]
        values = [d.get("last", 0) or d.get("avg", 0) for d in daily_data]
        
        # Create figure
        fig, ax = plt.subplots(figsize=(12, 6))
        
        ax.plot(dates, values, linewidth=2, color='#1DA1F2')
        ax.fill_between(dates, values, alpha=0.3, color='#1DA1F2')
        
        # Formatting
        ax.set_title(f"@{username} Follower Growth ({days} days)", fontsize=14, fontweight='bold')
        ax.set_xlabel("Date")
        ax.set_ylabel("Followers")
        ax.grid(True, alpha=0.3)
        
        # Format x-axis
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%m/%d'))
        plt.xticks(rotation=45)
        
        # Add annotations
        if len(values) > 1:
            change = values[-1] - values[0]
            pct = (change / values[0] * 100) if values[0] > 0 else 0
            sign = "+" if change >= 0 else ""
            ax.annotate(
                f"{sign}{change:,.0f} ({sign}{pct:.1f}%)",
                xy=(dates[-1], values[-1]),
                xytext=(10, 10),
                textcoords='offset points',
                fontsize=10,
                fontweight='bold',
                color='green' if change >= 0 else 'red',
            )
        
        plt.tight_layout()
        
        # Save or return
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
    
    def compare_periods(
        self,
        username: str,
        period1_days: int = 7,
        period2_days: int = 7,
    ) -> dict:
        """
        Compare growth between two periods.
        
        Args:
            username: Twitter/X username
            period1_days: Length of recent period
            period2_days: Length of comparison period
            
        Returns:
            Comparison data
        """
        username = username.lower()
        
        # Get data for both periods
        total_days = period1_days + period2_days
        all_data = self.get_growth_history(username, total_days, "followers")
        
        if len(all_data) < total_days:
            return {"error": "Insufficient data"}
        
        # Split into periods
        period2_data = all_data[:period2_days]
        period1_data = all_data[period2_days:]
        
        # Calculate metrics for each period
        def calc_period_metrics(data: List[dict]) -> dict:
            if not data:
                return {"growth": 0, "avg": 0}
            
            start = data[0].get("last", 0) or data[0].get("avg", 0)
            end = data[-1].get("last", 0) or data[-1].get("avg", 0)
            
            return {
                "growth": end - start,
                "start": start,
                "end": end,
                "avg_daily": (end - start) / len(data) if data else 0,
            }
        
        period1_metrics = calc_period_metrics(period1_data)
        period2_metrics = calc_period_metrics(period2_data)
        
        return {
            "period1": {
                "days": period1_days,
                "label": f"Last {period1_days} days",
                **period1_metrics,
            },
            "period2": {
                "days": period2_days,
                "label": f"Previous {period2_days} days",
                **period2_metrics,
            },
            "comparison": {
                "growth_difference": period1_metrics["growth"] - period2_metrics["growth"],
                "growth_improved": period1_metrics["growth"] > period2_metrics["growth"],
            },
        }
    
    def project_growth(
        self,
        username: str,
        days_ahead: int = 30,
        based_on_days: int = 30,
    ) -> dict:
        """
        Project future growth based on historical data.
        
        Args:
            username: Twitter/X username
            days_ahead: Days to project
            based_on_days: Historical days to base projection on
            
        Returns:
            Growth projection
        """
        username = username.lower()
        
        change = self.storage.get_change("followers", username, based_on_days)
        
        if change is None:
            return {"error": "Insufficient data"}
        
        daily_avg = change["change"] / based_on_days
        current = change["end_value"]
        
        projected = current + (daily_avg * days_ahead)
        
        return {
            "current_followers": int(current),
            "projected_followers": int(projected),
            "days_ahead": days_ahead,
            "daily_avg_growth": daily_avg,
            "projected_growth": int(daily_avg * days_ahead),
            "based_on_days": based_on_days,
            "confidence": "low" if based_on_days < 14 else "medium" if based_on_days < 30 else "high",
        }

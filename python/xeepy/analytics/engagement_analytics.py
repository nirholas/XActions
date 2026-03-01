"""
Engagement analytics - analyze engagement patterns on tweets.

Provides detailed engagement metrics and insights.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class EngagementReport:
    """Engagement analysis report"""
    total_tweets_analyzed: int
    avg_likes: float
    avg_retweets: float
    avg_replies: float
    avg_views: float
    avg_engagement_rate: float
    total_engagement: int
    top_tweets: List[dict] = field(default_factory=list)
    worst_tweets: List[dict] = field(default_factory=list)
    engagement_by_hour: Dict[int, float] = field(default_factory=dict)
    engagement_by_day: Dict[str, float] = field(default_factory=dict)
    engagement_by_type: Dict[str, float] = field(default_factory=dict)  # text, image, video, thread
    
    def to_dict(self) -> dict:
        return {
            "total_tweets_analyzed": self.total_tweets_analyzed,
            "avg_likes": self.avg_likes,
            "avg_retweets": self.avg_retweets,
            "avg_replies": self.avg_replies,
            "avg_views": self.avg_views,
            "avg_engagement_rate": self.avg_engagement_rate,
            "total_engagement": self.total_engagement,
            "engagement_by_hour": self.engagement_by_hour,
            "engagement_by_day": self.engagement_by_day,
            "engagement_by_type": self.engagement_by_type,
        }
    
    def summary(self) -> str:
        """Generate human-readable summary"""
        lines = [
            f"Engagement Report ({self.total_tweets_analyzed} tweets analyzed)",
            f"  Avg Likes: {self.avg_likes:.1f}",
            f"  Avg Retweets: {self.avg_retweets:.1f}",
            f"  Avg Replies: {self.avg_replies:.1f}",
            f"  Avg Engagement Rate: {self.avg_engagement_rate:.2f}%",
            f"  Total Engagement: {self.total_engagement:,}",
        ]
        
        if self.engagement_by_day:
            best_day = max(self.engagement_by_day, key=self.engagement_by_day.get)
            lines.append(f"  Best Day: {best_day} ({self.engagement_by_day[best_day]:.1f} avg)")
        
        if self.engagement_by_hour:
            best_hour = max(self.engagement_by_hour, key=self.engagement_by_hour.get)
            lines.append(f"  Best Hour: {best_hour}:00 ({self.engagement_by_hour[best_hour]:.1f} avg)")
        
        return "\n".join(lines)


class EngagementAnalytics:
    """
    Analyze engagement patterns on your tweets.
    
    Provides insights on:
    - Average engagement metrics
    - Best performing content
    - Optimal posting times
    - Content type performance
    
    Example:
        analytics = EngagementAnalytics(scraper)
        
        # Analyze recent tweets
        report = await analytics.analyze_tweets("myusername", limit=100)
        print(report.summary())
        
        # Find best posting times
        best_times = await analytics.find_best_posting_time("myusername")
    """
    
    def __init__(
        self,
        scraper: Optional[Any] = None,
    ):
        """
        Initialize engagement analytics.
        
        Args:
            scraper: X/Twitter scraper instance
        """
        self.scraper = scraper
    
    def _parse_tweet(self, tweet: Any) -> Optional[dict]:
        """Parse tweet into standardized format"""
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
                created_at = datetime.utcnow()
            
            likes = tweet.get('favorite_count') or tweet.get('likes', 0)
            retweets = tweet.get('retweet_count') or tweet.get('retweets', 0)
            replies = tweet.get('reply_count') or tweet.get('replies', 0)
            views = tweet.get('view_count') or tweet.get('views', 0)
            quotes = tweet.get('quote_count') or tweet.get('quotes', 0)
            
            # Determine content type
            content_type = "text"
            media = tweet.get('media') or tweet.get('extended_entities', {}).get('media', [])
            if media:
                if any(m.get('type') == 'video' for m in media):
                    content_type = "video"
                elif any(m.get('type') == 'photo' for m in media):
                    content_type = "image"
            
            if tweet.get('in_reply_to_status_id') or tweet.get('is_reply'):
                content_type = "reply"
            elif tweet.get('is_thread') or (tweet.get('thread_id') and tweet.get('thread_id') != tweet.get('id')):
                content_type = "thread"
            
            return {
                "id": str(tweet.get('id') or tweet.get('id_str', '')),
                "text": tweet.get('text') or tweet.get('full_text', ''),
                "created_at": created_at,
                "likes": likes,
                "retweets": retweets,
                "replies": replies,
                "views": views,
                "quotes": quotes,
                "content_type": content_type,
                "engagement": likes + retweets + replies + quotes,
                "engagement_rate": ((likes + retweets + replies + quotes) / views * 100) if views > 0 else 0,
            }
        else:
            # Object-based parsing
            created_at = getattr(tweet, 'created_at', datetime.utcnow())
            if isinstance(created_at, str):
                try:
                    created_at = datetime.strptime(created_at, "%a %b %d %H:%M:%S +0000 %Y")
                except ValueError:
                    created_at = datetime.utcnow()
            
            likes = getattr(tweet, 'likes', 0) or getattr(tweet, 'favorite_count', 0)
            retweets = getattr(tweet, 'retweets', 0) or getattr(tweet, 'retweet_count', 0)
            replies = getattr(tweet, 'replies', 0) or getattr(tweet, 'reply_count', 0)
            views = getattr(tweet, 'views', 0) or getattr(tweet, 'view_count', 0)
            quotes = getattr(tweet, 'quotes', 0) or getattr(tweet, 'quote_count', 0)
            
            content_type = "text"
            if hasattr(tweet, 'media') and tweet.media:
                content_type = "image"
            
            return {
                "id": str(getattr(tweet, 'id', '')),
                "text": getattr(tweet, 'text', ''),
                "created_at": created_at,
                "likes": likes,
                "retweets": retweets,
                "replies": replies,
                "views": views,
                "quotes": quotes,
                "content_type": content_type,
                "engagement": likes + retweets + replies + quotes,
                "engagement_rate": ((likes + retweets + replies + quotes) / views * 100) if views > 0 else 0,
            }
    
    async def _fetch_tweets(
        self,
        username: str,
        limit: int = 100,
    ) -> List[dict]:
        """Fetch and parse tweets"""
        if self.scraper is None:
            try:
                from ..scraper import Scraper
                self.scraper = Scraper()
            except ImportError:
                raise RuntimeError("No scraper available")
        
        tweets = []
        
        if hasattr(self.scraper, 'get_tweets'):
            try:
                count = 0
                async for tweet in self.scraper.get_tweets(username):
                    parsed = self._parse_tweet(tweet)
                    if parsed:
                        tweets.append(parsed)
                        count += 1
                        if count >= limit:
                            break
            except Exception as e:
                print(f"Error fetching tweets: {e}")
        
        return tweets
    
    async def analyze_tweets(
        self,
        username: str,
        limit: int = 100,
        tweets: Optional[List[dict]] = None,
    ) -> EngagementReport:
        """
        Analyze engagement on recent tweets.
        
        Args:
            username: Twitter/X username
            limit: Number of tweets to analyze
            tweets: Pre-fetched tweets (optional)
            
        Returns:
            EngagementReport with detailed analysis
        """
        username = username.lower().lstrip('@')
        
        if tweets is None:
            tweets = await self._fetch_tweets(username, limit)
        
        if not tweets:
            return EngagementReport(
                total_tweets_analyzed=0,
                avg_likes=0,
                avg_retweets=0,
                avg_replies=0,
                avg_views=0,
                avg_engagement_rate=0,
                total_engagement=0,
            )
        
        # Calculate averages
        total_likes = sum(t["likes"] for t in tweets)
        total_retweets = sum(t["retweets"] for t in tweets)
        total_replies = sum(t["replies"] for t in tweets)
        total_views = sum(t["views"] for t in tweets)
        total_engagement = sum(t["engagement"] for t in tweets)
        
        n = len(tweets)
        avg_engagement_rate = sum(t["engagement_rate"] for t in tweets) / n if n > 0 else 0
        
        # Top and worst tweets
        sorted_by_engagement = sorted(tweets, key=lambda t: t["engagement"], reverse=True)
        top_tweets = [
            {
                "id": t["id"],
                "text": t["text"][:100],
                "engagement": t["engagement"],
                "likes": t["likes"],
                "retweets": t["retweets"],
            }
            for t in sorted_by_engagement[:5]
        ]
        worst_tweets = [
            {
                "id": t["id"],
                "text": t["text"][:100],
                "engagement": t["engagement"],
                "likes": t["likes"],
                "retweets": t["retweets"],
            }
            for t in sorted_by_engagement[-5:]
        ]
        
        # Engagement by hour
        engagement_by_hour = defaultdict(list)
        for t in tweets:
            hour = t["created_at"].hour
            engagement_by_hour[hour].append(t["engagement"])
        
        engagement_by_hour_avg = {
            hour: sum(values) / len(values)
            for hour, values in engagement_by_hour.items()
        }
        
        # Engagement by day
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        engagement_by_day = defaultdict(list)
        for t in tweets:
            day = day_names[t["created_at"].weekday()]
            engagement_by_day[day].append(t["engagement"])
        
        engagement_by_day_avg = {
            day: sum(values) / len(values)
            for day, values in engagement_by_day.items()
        }
        
        # Engagement by content type
        engagement_by_type = defaultdict(list)
        for t in tweets:
            engagement_by_type[t["content_type"]].append(t["engagement"])
        
        engagement_by_type_avg = {
            ctype: sum(values) / len(values)
            for ctype, values in engagement_by_type.items()
        }
        
        return EngagementReport(
            total_tweets_analyzed=n,
            avg_likes=total_likes / n,
            avg_retweets=total_retweets / n,
            avg_replies=total_replies / n,
            avg_views=total_views / n if total_views > 0 else 0,
            avg_engagement_rate=avg_engagement_rate,
            total_engagement=total_engagement,
            top_tweets=top_tweets,
            worst_tweets=worst_tweets,
            engagement_by_hour=dict(engagement_by_hour_avg),
            engagement_by_day=engagement_by_day_avg,
            engagement_by_type=engagement_by_type_avg,
        )
    
    async def find_best_posting_time(
        self,
        username: str,
        limit: int = 200,
    ) -> dict:
        """
        Analyze when your tweets perform best.
        
        Args:
            username: Twitter/X username
            limit: Number of tweets to analyze
            
        Returns:
            Best hours and days to post
        """
        username = username.lower().lstrip('@')
        tweets = await self._fetch_tweets(username, limit)
        
        if not tweets:
            return {
                "best_hours": [],
                "best_days": [],
                "worst_hours": [],
                "worst_days": [],
            }
        
        # Analyze by hour
        hour_engagement = defaultdict(list)
        for t in tweets:
            hour_engagement[t["created_at"].hour].append(t["engagement"])
        
        hour_avg = {
            hour: sum(values) / len(values)
            for hour, values in hour_engagement.items()
            if len(values) >= 3  # Minimum sample size
        }
        
        sorted_hours = sorted(hour_avg.items(), key=lambda x: x[1], reverse=True)
        
        # Analyze by day
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        day_engagement = defaultdict(list)
        for t in tweets:
            day = day_names[t["created_at"].weekday()]
            day_engagement[day].append(t["engagement"])
        
        day_avg = {
            day: sum(values) / len(values)
            for day, values in day_engagement.items()
            if len(values) >= 3
        }
        
        sorted_days = sorted(day_avg.items(), key=lambda x: x[1], reverse=True)
        
        # Analyze by day+hour combinations
        combo_engagement = defaultdict(list)
        for t in tweets:
            day = day_names[t["created_at"].weekday()]
            hour = t["created_at"].hour
            combo_engagement[(day, hour)].append(t["engagement"])
        
        combo_avg = {
            combo: sum(values) / len(values)
            for combo, values in combo_engagement.items()
            if len(values) >= 2
        }
        
        sorted_combos = sorted(combo_avg.items(), key=lambda x: x[1], reverse=True)
        
        return {
            "best_hours": [{"hour": h, "avg_engagement": e} for h, e in sorted_hours[:5]],
            "worst_hours": [{"hour": h, "avg_engagement": e} for h, e in sorted_hours[-3:]],
            "best_days": [{"day": d, "avg_engagement": e} for d, e in sorted_days[:3]],
            "worst_days": [{"day": d, "avg_engagement": e} for d, e in sorted_days[-2:]],
            "best_combinations": [
                {"day": d, "hour": h, "avg_engagement": e}
                for (d, h), e in sorted_combos[:10]
            ],
            "recommendation": self._generate_time_recommendation(sorted_hours, sorted_days),
        }
    
    def _generate_time_recommendation(
        self,
        sorted_hours: List[tuple],
        sorted_days: List[tuple],
    ) -> str:
        """Generate posting time recommendation"""
        if not sorted_hours or not sorted_days:
            return "Insufficient data for recommendation"
        
        best_hour = sorted_hours[0][0]
        best_day = sorted_days[0][0]
        
        hour_12 = best_hour % 12 or 12
        am_pm = "AM" if best_hour < 12 else "PM"
        
        return f"Best time to post: {best_day} at {hour_12}:00 {am_pm}"
    
    async def compare_engagement_periods(
        self,
        username: str,
        days1: int = 7,
        days2: int = 7,
    ) -> dict:
        """
        Compare engagement between two periods.
        
        Args:
            username: Twitter/X username
            days1: Recent period days
            days2: Previous period days
            
        Returns:
            Comparison data
        """
        # This would require time-filtered tweet fetching
        # For now, return a placeholder structure
        return {
            "period1": {"days": days1, "label": f"Last {days1} days"},
            "period2": {"days": days2, "label": f"Previous {days2} days"},
            "note": "Detailed period comparison requires tweet timestamp filtering",
        }
    
    def analyze_content_performance(self, tweets: List[dict]) -> dict:
        """
        Analyze which content types perform best.
        
        Args:
            tweets: List of parsed tweets
            
        Returns:
            Content type performance analysis
        """
        type_stats = defaultdict(lambda: {"count": 0, "total_engagement": 0, "tweets": []})
        
        for t in tweets:
            ctype = t.get("content_type", "text")
            type_stats[ctype]["count"] += 1
            type_stats[ctype]["total_engagement"] += t["engagement"]
            type_stats[ctype]["tweets"].append(t)
        
        results = {}
        for ctype, stats in type_stats.items():
            avg = stats["total_engagement"] / stats["count"] if stats["count"] > 0 else 0
            results[ctype] = {
                "count": stats["count"],
                "total_engagement": stats["total_engagement"],
                "avg_engagement": avg,
                "percentage_of_tweets": stats["count"] / len(tweets) * 100 if tweets else 0,
            }
        
        # Rank content types
        ranked = sorted(results.items(), key=lambda x: x[1]["avg_engagement"], reverse=True)
        
        return {
            "by_type": results,
            "ranking": [{"type": t, "avg_engagement": s["avg_engagement"]} for t, s in ranked],
            "recommendation": f"Focus on {ranked[0][0]} content" if ranked else "Post more content for analysis",
        }

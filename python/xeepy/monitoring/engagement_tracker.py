"""
Engagement tracker - track engagement on your tweets.

Monitor likes, retweets, replies, and other engagement metrics.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from ..storage.timeseries import TimeSeriesStorage


@dataclass
class TweetEngagement:
    """Engagement data for a single tweet"""
    tweet_id: str
    text: str
    created_at: datetime
    likes: int
    retweets: int
    replies: int
    quotes: int
    views: int
    bookmarks: int
    
    @property
    def total_engagement(self) -> int:
        """Total engagement actions"""
        return self.likes + self.retweets + self.replies + self.quotes
    
    @property
    def engagement_rate(self) -> float:
        """Engagement rate based on views"""
        if self.views == 0:
            return 0.0
        return (self.total_engagement / self.views) * 100
    
    def to_dict(self) -> dict:
        return {
            "tweet_id": self.tweet_id,
            "text": self.text[:100],
            "created_at": self.created_at.isoformat(),
            "likes": self.likes,
            "retweets": self.retweets,
            "replies": self.replies,
            "quotes": self.quotes,
            "views": self.views,
            "bookmarks": self.bookmarks,
            "total_engagement": self.total_engagement,
            "engagement_rate": self.engagement_rate,
        }


@dataclass
class EngagementChange:
    """Change in engagement for a tweet"""
    tweet_id: str
    period_start: datetime
    period_end: datetime
    likes_change: int
    retweets_change: int
    replies_change: int
    quotes_change: int
    views_change: int
    
    @property
    def has_changes(self) -> bool:
        return any([
            self.likes_change,
            self.retweets_change,
            self.replies_change,
            self.quotes_change,
            self.views_change,
        ])
    
    def to_dict(self) -> dict:
        return {
            "tweet_id": self.tweet_id,
            "period_start": self.period_start.isoformat(),
            "period_end": self.period_end.isoformat(),
            "likes_change": self.likes_change,
            "retweets_change": self.retweets_change,
            "replies_change": self.replies_change,
            "quotes_change": self.quotes_change,
            "views_change": self.views_change,
        }


class EngagementTracker:
    """
    Track engagement on your tweets over time.
    
    Features:
    - Track likes, retweets, replies, views
    - Historical engagement data
    - Engagement change notifications
    - Find top performing content
    
    Example:
        tracker = EngagementTracker(storage)
        
        # Track a specific tweet
        engagement = await tracker.track_tweet("1234567890")
        
        # Track recent tweets
        all_engagement = await tracker.track_recent("myusername", limit=20)
        
        # Get engagement changes
        changes = await tracker.get_changes("myusername", hours=24)
    """
    
    def __init__(
        self,
        timeseries_storage: Optional[TimeSeriesStorage] = None,
        scraper: Optional[Any] = None,
        notifier: Optional[Any] = None,
    ):
        """
        Initialize engagement tracker.
        
        Args:
            timeseries_storage: Storage for engagement history
            scraper: X/Twitter scraper instance
            notifier: Notification manager
        """
        self.timeseries_storage = timeseries_storage
        self.scraper = scraper
        self.notifier = notifier
        
        self._previous_engagement: Dict[str, TweetEngagement] = {}
    
    async def _get_tweet_engagement(self, tweet_id: str) -> Optional[TweetEngagement]:
        """Fetch engagement data for a tweet"""
        if self.scraper is None:
            try:
                from ..scraper import Scraper
                self.scraper = Scraper()
            except ImportError:
                raise RuntimeError("No scraper available")
        
        if hasattr(self.scraper, 'get_tweet'):
            try:
                tweet = await self.scraper.get_tweet(tweet_id)
                if tweet:
                    return self._parse_tweet_engagement(tweet)
            except Exception as e:
                print(f"Error fetching tweet {tweet_id}: {e}")
        
        return None
    
    def _parse_tweet_engagement(self, tweet: Any) -> TweetEngagement:
        """Parse tweet object into TweetEngagement"""
        if isinstance(tweet, dict):
            return TweetEngagement(
                tweet_id=str(tweet.get('id') or tweet.get('id_str', '')),
                text=tweet.get('text') or tweet.get('full_text', ''),
                created_at=self._parse_datetime(tweet.get('created_at')),
                likes=tweet.get('favorite_count') or tweet.get('likes', 0),
                retweets=tweet.get('retweet_count') or tweet.get('retweets', 0),
                replies=tweet.get('reply_count') or tweet.get('replies', 0),
                quotes=tweet.get('quote_count') or tweet.get('quotes', 0),
                views=tweet.get('view_count') or tweet.get('views', 0),
                bookmarks=tweet.get('bookmark_count') or tweet.get('bookmarks', 0),
            )
        else:
            return TweetEngagement(
                tweet_id=str(getattr(tweet, 'id', '')),
                text=getattr(tweet, 'text', '') or getattr(tweet, 'full_text', ''),
                created_at=self._parse_datetime(getattr(tweet, 'created_at', None)),
                likes=getattr(tweet, 'likes', 0) or getattr(tweet, 'favorite_count', 0),
                retweets=getattr(tweet, 'retweets', 0) or getattr(tweet, 'retweet_count', 0),
                replies=getattr(tweet, 'replies', 0) or getattr(tweet, 'reply_count', 0),
                quotes=getattr(tweet, 'quotes', 0) or getattr(tweet, 'quote_count', 0),
                views=getattr(tweet, 'views', 0) or getattr(tweet, 'view_count', 0),
                bookmarks=getattr(tweet, 'bookmarks', 0) or getattr(tweet, 'bookmark_count', 0),
            )
    
    def _parse_datetime(self, dt_value: Any) -> datetime:
        """Parse datetime from various formats"""
        if dt_value is None:
            return datetime.utcnow()
        if isinstance(dt_value, datetime):
            return dt_value
        if isinstance(dt_value, str):
            for fmt in [
                "%a %b %d %H:%M:%S +0000 %Y",
                "%Y-%m-%dT%H:%M:%S.%fZ",
                "%Y-%m-%d %H:%M:%S",
            ]:
                try:
                    return datetime.strptime(dt_value, fmt)
                except ValueError:
                    continue
        return datetime.utcnow()
    
    async def track_tweet(
        self,
        tweet_id: str,
        store: bool = True,
    ) -> Optional[TweetEngagement]:
        """
        Track engagement for a specific tweet.
        
        Args:
            tweet_id: Tweet ID to track
            store: Store in time series
            
        Returns:
            TweetEngagement data
        """
        engagement = await self._get_tweet_engagement(tweet_id)
        
        if engagement and store and self.timeseries_storage:
            self.timeseries_storage.record_multiple(
                f"tweet_{tweet_id}",
                {
                    "likes": engagement.likes,
                    "retweets": engagement.retweets,
                    "replies": engagement.replies,
                    "quotes": engagement.quotes,
                    "views": engagement.views,
                    "bookmarks": engagement.bookmarks,
                },
            )
        
        if engagement:
            self._previous_engagement[tweet_id] = engagement
        
        return engagement
    
    async def track_recent(
        self,
        username: str,
        limit: int = 20,
        store: bool = True,
    ) -> List[TweetEngagement]:
        """
        Track engagement for recent tweets from a user.
        
        Args:
            username: Username to get tweets from
            limit: Number of tweets to track
            store: Store in time series
            
        Returns:
            List of TweetEngagement for recent tweets
        """
        if self.scraper is None:
            try:
                from ..scraper import Scraper
                self.scraper = Scraper()
            except ImportError:
                raise RuntimeError("No scraper available")
        
        results = []
        
        if hasattr(self.scraper, 'get_tweets'):
            try:
                count = 0
                async for tweet in self.scraper.get_tweets(username):
                    engagement = self._parse_tweet_engagement(tweet)
                    results.append(engagement)
                    
                    if store and self.timeseries_storage:
                        self.timeseries_storage.record_multiple(
                            f"tweet_{engagement.tweet_id}",
                            {
                                "likes": engagement.likes,
                                "retweets": engagement.retweets,
                                "replies": engagement.replies,
                                "quotes": engagement.quotes,
                                "views": engagement.views,
                            },
                        )
                    
                    self._previous_engagement[engagement.tweet_id] = engagement
                    
                    count += 1
                    if count >= limit:
                        break
                        
            except Exception as e:
                print(f"Error fetching tweets: {e}")
        
        return results
    
    async def get_changes(
        self,
        tweet_ids: List[str],
    ) -> List[EngagementChange]:
        """
        Get engagement changes for tracked tweets.
        
        Args:
            tweet_ids: Tweet IDs to check
            
        Returns:
            List of EngagementChange for tweets with changes
        """
        changes = []
        
        for tweet_id in tweet_ids:
            previous = self._previous_engagement.get(tweet_id)
            if previous is None:
                continue
            
            current = await self._get_tweet_engagement(tweet_id)
            if current is None:
                continue
            
            change = EngagementChange(
                tweet_id=tweet_id,
                period_start=previous.created_at,
                period_end=datetime.utcnow(),
                likes_change=current.likes - previous.likes,
                retweets_change=current.retweets - previous.retweets,
                replies_change=current.replies - previous.replies,
                quotes_change=current.quotes - previous.quotes,
                views_change=current.views - previous.views,
            )
            
            if change.has_changes:
                changes.append(change)
            
            # Update stored engagement
            self._previous_engagement[tweet_id] = current
        
        return changes
    
    async def monitor(
        self,
        username: str,
        interval_minutes: int = 60,
        duration_hours: Optional[float] = None,
        on_change: Optional[Callable[[EngagementChange], None]] = None,
        tweet_limit: int = 20,
    ) -> None:
        """
        Continuously monitor engagement on tweets.
        
        Args:
            username: Username to monitor
            interval_minutes: Check frequency
            duration_hours: How long to run
            on_change: Callback for engagement changes
            tweet_limit: Number of tweets to track
        """
        start_time = datetime.utcnow()
        interval_seconds = interval_minutes * 60
        
        # Initial tracking
        tweets = await self.track_recent(username, limit=tweet_limit)
        tweet_ids = [t.tweet_id for t in tweets]
        
        if self.notifier:
            await self.notifier.notify(
                "monitoring_started",
                f"Started engagement tracking for @{username}",
                {"tweets_tracked": len(tweet_ids)},
            )
        
        try:
            while True:
                await asyncio.sleep(interval_seconds)
                
                try:
                    changes = await self.get_changes(tweet_ids)
                    
                    for change in changes:
                        if on_change:
                            on_change(change)
                        
                        if self.notifier:
                            await self.notifier.notify(
                                "engagement_change",
                                f"Engagement change on tweet {change.tweet_id}",
                                change.to_dict(),
                            )
                    
                except Exception as e:
                    print(f"Monitoring error: {e}")
                
                # Check duration
                if duration_hours is not None:
                    elapsed = (datetime.utcnow() - start_time).total_seconds() / 3600
                    if elapsed >= duration_hours:
                        break
                        
        finally:
            if self.notifier:
                await self.notifier.notify(
                    "monitoring_stopped",
                    f"Stopped engagement tracking for @{username}",
                )
    
    def get_top_tweets(
        self,
        sort_by: str = "total_engagement",
        limit: int = 10,
    ) -> List[TweetEngagement]:
        """
        Get top performing tracked tweets.
        
        Args:
            sort_by: Metric to sort by (likes, retweets, replies, total_engagement, engagement_rate)
            limit: Number of tweets to return
            
        Returns:
            List of top tweets
        """
        tweets = list(self._previous_engagement.values())
        
        if sort_by == "total_engagement":
            tweets.sort(key=lambda t: t.total_engagement, reverse=True)
        elif sort_by == "engagement_rate":
            tweets.sort(key=lambda t: t.engagement_rate, reverse=True)
        else:
            tweets.sort(key=lambda t: getattr(t, sort_by, 0), reverse=True)
        
        return tweets[:limit]
    
    def get_engagement_summary(self) -> dict:
        """
        Get summary of all tracked engagement.
        
        Returns:
            Summary statistics
        """
        tweets = list(self._previous_engagement.values())
        
        if not tweets:
            return {
                "tweets_tracked": 0,
                "total_likes": 0,
                "total_retweets": 0,
                "total_replies": 0,
                "avg_engagement_rate": 0,
            }
        
        return {
            "tweets_tracked": len(tweets),
            "total_likes": sum(t.likes for t in tweets),
            "total_retweets": sum(t.retweets for t in tweets),
            "total_replies": sum(t.replies for t in tweets),
            "total_views": sum(t.views for t in tweets),
            "avg_likes": sum(t.likes for t in tweets) / len(tweets),
            "avg_retweets": sum(t.retweets for t in tweets) / len(tweets),
            "avg_replies": sum(t.replies for t in tweets) / len(tweets),
            "avg_engagement_rate": sum(t.engagement_rate for t in tweets) / len(tweets),
            "top_tweet_id": max(tweets, key=lambda t: t.total_engagement).tweet_id,
        }
    
    def get_history(
        self,
        tweet_id: str,
        days: int = 30,
    ) -> Optional[Dict[str, List[dict]]]:
        """
        Get engagement history for a tweet.
        
        Args:
            tweet_id: Tweet ID
            days: Days of history
            
        Returns:
            Dictionary with metric history
        """
        if self.timeseries_storage is None:
            return None
        
        entity_id = f"tweet_{tweet_id}"
        
        return {
            "likes": self.timeseries_storage.get_daily_series("likes", entity_id, days),
            "retweets": self.timeseries_storage.get_daily_series("retweets", entity_id, days),
            "replies": self.timeseries_storage.get_daily_series("replies", entity_id, days),
            "views": self.timeseries_storage.get_daily_series("views", entity_id, days),
        }

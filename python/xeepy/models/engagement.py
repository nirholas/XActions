"""
Engagement metrics data models.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class EngagementMetrics:
    """
    Engagement metrics for a single tweet or action.
    
    Attributes:
        tweet_id: ID of the tweet.
        likes: Number of likes.
        retweets: Number of retweets.
        replies: Number of replies.
        quotes: Number of quote tweets.
        views: Number of views/impressions.
        bookmarks: Number of bookmarks.
        timestamp: When these metrics were recorded.
    """
    
    tweet_id: str
    likes: int = 0
    retweets: int = 0
    replies: int = 0
    quotes: int = 0
    views: int = 0
    bookmarks: int = 0
    timestamp: datetime = field(default_factory=datetime.now)
    
    @property
    def total_engagement(self) -> int:
        """Total engagement actions."""
        return self.likes + self.retweets + self.replies + self.quotes
    
    @property
    def engagement_rate(self) -> float:
        """Engagement rate (engagement / views)."""
        if self.views == 0:
            return 0.0
        return self.total_engagement / self.views
    
    @property
    def like_rate(self) -> float:
        """Like rate (likes / views)."""
        if self.views == 0:
            return 0.0
        return self.likes / self.views
    
    @property
    def retweet_rate(self) -> float:
        """Retweet rate (retweets / views)."""
        if self.views == 0:
            return 0.0
        return self.retweets / self.views
    
    @property
    def reply_rate(self) -> float:
        """Reply rate (replies / views)."""
        if self.views == 0:
            return 0.0
        return self.replies / self.views
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "tweet_id": self.tweet_id,
            "likes": self.likes,
            "retweets": self.retweets,
            "replies": self.replies,
            "quotes": self.quotes,
            "views": self.views,
            "bookmarks": self.bookmarks,
            "total_engagement": self.total_engagement,
            "engagement_rate": self.engagement_rate,
            "like_rate": self.like_rate,
            "retweet_rate": self.retweet_rate,
            "reply_rate": self.reply_rate,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
    
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "EngagementMetrics":
        """Create from dictionary."""
        timestamp = data.get("timestamp")
        if isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except ValueError:
                timestamp = datetime.now()
        elif timestamp is None:
            timestamp = datetime.now()
            
        return cls(
            tweet_id=data.get("tweet_id", ""),
            likes=data.get("likes", 0),
            retweets=data.get("retweets", 0),
            replies=data.get("replies", 0),
            quotes=data.get("quotes", 0),
            views=data.get("views", 0),
            bookmarks=data.get("bookmarks", 0),
            timestamp=timestamp,
        )


@dataclass
class EngagementSummary:
    """
    Aggregated engagement summary for an account or time period.
    
    Attributes:
        username: Username for this summary.
        period_start: Start of the period.
        period_end: End of the period.
        tweets_count: Number of tweets in period.
        total_likes: Total likes received.
        total_retweets: Total retweets received.
        total_replies: Total replies received.
        total_views: Total views/impressions.
        followers_gained: New followers in period.
        followers_lost: Unfollowers in period.
    """
    
    username: str
    period_start: datetime | None = None
    period_end: datetime | None = None
    
    # Tweet metrics
    tweets_count: int = 0
    total_likes: int = 0
    total_retweets: int = 0
    total_replies: int = 0
    total_quotes: int = 0
    total_views: int = 0
    total_bookmarks: int = 0
    
    # Follower changes
    followers_gained: int = 0
    followers_lost: int = 0
    net_followers: int = 0
    
    # Averages
    avg_likes_per_tweet: float = 0.0
    avg_retweets_per_tweet: float = 0.0
    avg_replies_per_tweet: float = 0.0
    avg_views_per_tweet: float = 0.0
    
    # Best performing
    best_tweet_id: str = ""
    best_tweet_engagement: int = 0
    
    # Activity
    posts_per_day: float = 0.0
    most_active_hour: int = 0
    most_active_day: str = ""
    
    created_at: datetime = field(default_factory=datetime.now)
    
    @property
    def total_engagement(self) -> int:
        """Total engagement across all tweets."""
        return self.total_likes + self.total_retweets + self.total_replies + self.total_quotes
    
    @property
    def avg_engagement_per_tweet(self) -> float:
        """Average engagement per tweet."""
        if self.tweets_count == 0:
            return 0.0
        return self.total_engagement / self.tweets_count
    
    @property
    def overall_engagement_rate(self) -> float:
        """Overall engagement rate."""
        if self.total_views == 0:
            return 0.0
        return self.total_engagement / self.total_views
    
    def calculate_averages(self) -> None:
        """Calculate average metrics based on totals."""
        if self.tweets_count > 0:
            self.avg_likes_per_tweet = self.total_likes / self.tweets_count
            self.avg_retweets_per_tweet = self.total_retweets / self.tweets_count
            self.avg_replies_per_tweet = self.total_replies / self.tweets_count
            self.avg_views_per_tweet = self.total_views / self.tweets_count
        
        self.net_followers = self.followers_gained - self.followers_lost
        
        if self.period_start and self.period_end:
            days = (self.period_end - self.period_start).days or 1
            self.posts_per_day = self.tweets_count / days
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "username": self.username,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "tweets_count": self.tweets_count,
            "total_likes": self.total_likes,
            "total_retweets": self.total_retweets,
            "total_replies": self.total_replies,
            "total_quotes": self.total_quotes,
            "total_views": self.total_views,
            "total_bookmarks": self.total_bookmarks,
            "total_engagement": self.total_engagement,
            "followers_gained": self.followers_gained,
            "followers_lost": self.followers_lost,
            "net_followers": self.net_followers,
            "avg_likes_per_tweet": self.avg_likes_per_tweet,
            "avg_retweets_per_tweet": self.avg_retweets_per_tweet,
            "avg_replies_per_tweet": self.avg_replies_per_tweet,
            "avg_views_per_tweet": self.avg_views_per_tweet,
            "avg_engagement_per_tweet": self.avg_engagement_per_tweet,
            "overall_engagement_rate": self.overall_engagement_rate,
            "best_tweet_id": self.best_tweet_id,
            "best_tweet_engagement": self.best_tweet_engagement,
            "posts_per_day": self.posts_per_day,
            "most_active_hour": self.most_active_hour,
            "most_active_day": self.most_active_day,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
    
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "EngagementSummary":
        """Create from dictionary."""
        period_start = data.get("period_start")
        if isinstance(period_start, str):
            try:
                period_start = datetime.fromisoformat(period_start.replace("Z", "+00:00"))
            except ValueError:
                period_start = None
                
        period_end = data.get("period_end")
        if isinstance(period_end, str):
            try:
                period_end = datetime.fromisoformat(period_end.replace("Z", "+00:00"))
            except ValueError:
                period_end = None
                
        created_at = data.get("created_at")
        if isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            except ValueError:
                created_at = datetime.now()
        elif created_at is None:
            created_at = datetime.now()
        
        return cls(
            username=data.get("username", ""),
            period_start=period_start,
            period_end=period_end,
            tweets_count=data.get("tweets_count", 0),
            total_likes=data.get("total_likes", 0),
            total_retweets=data.get("total_retweets", 0),
            total_replies=data.get("total_replies", 0),
            total_quotes=data.get("total_quotes", 0),
            total_views=data.get("total_views", 0),
            total_bookmarks=data.get("total_bookmarks", 0),
            followers_gained=data.get("followers_gained", 0),
            followers_lost=data.get("followers_lost", 0),
            net_followers=data.get("net_followers", 0),
            avg_likes_per_tweet=data.get("avg_likes_per_tweet", 0.0),
            avg_retweets_per_tweet=data.get("avg_retweets_per_tweet", 0.0),
            avg_replies_per_tweet=data.get("avg_replies_per_tweet", 0.0),
            avg_views_per_tweet=data.get("avg_views_per_tweet", 0.0),
            best_tweet_id=data.get("best_tweet_id", ""),
            best_tweet_engagement=data.get("best_tweet_engagement", 0),
            posts_per_day=data.get("posts_per_day", 0.0),
            most_active_hour=data.get("most_active_hour", 0),
            most_active_day=data.get("most_active_day", ""),
            created_at=created_at,
        )


@dataclass
class FollowStats:
    """
    Statistics about follow/unfollow activity.
    
    Attributes:
        username: Account username.
        followers_count: Current follower count.
        following_count: Current following count.
        new_followers: List of new followers.
        unfollowers: List of accounts that unfollowed.
        not_following_back: Accounts you follow that don't follow back.
        not_followed_back: Accounts that follow you that you don't follow.
    """
    
    username: str
    followers_count: int = 0
    following_count: int = 0
    
    new_followers: list[str] = field(default_factory=list)
    unfollowers: list[str] = field(default_factory=list)
    not_following_back: list[str] = field(default_factory=list)
    not_followed_back: list[str] = field(default_factory=list)
    
    checked_at: datetime = field(default_factory=datetime.now)
    previous_check: datetime | None = None
    
    @property
    def follow_back_rate(self) -> float:
        """Percentage of people you follow who follow you back."""
        if self.following_count == 0:
            return 0.0
        following_back = self.following_count - len(self.not_following_back)
        return following_back / self.following_count * 100
    
    @property
    def fan_count(self) -> int:
        """Number of followers who you don't follow back."""
        return len(self.not_followed_back)
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "username": self.username,
            "followers_count": self.followers_count,
            "following_count": self.following_count,
            "new_followers_count": len(self.new_followers),
            "new_followers": self.new_followers,
            "unfollowers_count": len(self.unfollowers),
            "unfollowers": self.unfollowers,
            "not_following_back_count": len(self.not_following_back),
            "not_following_back": self.not_following_back,
            "not_followed_back_count": len(self.not_followed_back),
            "not_followed_back": self.not_followed_back,
            "follow_back_rate": self.follow_back_rate,
            "fan_count": self.fan_count,
            "checked_at": self.checked_at.isoformat() if self.checked_at else None,
            "previous_check": self.previous_check.isoformat() if self.previous_check else None,
        }

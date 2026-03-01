"""
Xeepy Action Types

Data classes and types for action results and configurations.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class TweetElement:
    """Represents a tweet element scraped from the page."""
    
    tweet_id: Optional[str] = None
    tweet_url: Optional[str] = None
    text: Optional[str] = None
    author_username: Optional[str] = None
    author_display_name: Optional[str] = None
    author_followers: Optional[int] = None
    likes_count: int = 0
    retweets_count: int = 0
    replies_count: int = 0
    views_count: int = 0
    is_retweet: bool = False
    is_reply: bool = False
    is_quote: bool = False
    has_media: bool = False
    has_text: bool = True
    language: Optional[str] = None
    timestamp: Optional[datetime] = None
    hashtags: list[str] = field(default_factory=list)
    mentions: list[str] = field(default_factory=list)
    
    @property
    def engagement_score(self) -> int:
        """Calculate total engagement score."""
        return self.likes_count + self.retweets_count + self.replies_count


@dataclass
class UserElement:
    """Represents a user element scraped from the page."""
    
    user_id: Optional[str] = None
    username: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0
    tweets_count: int = 0
    is_verified: bool = False
    is_following: bool = False
    profile_url: Optional[str] = None


@dataclass
class LikeResult:
    """Result of like operations."""
    
    success_count: int = 0
    failed_count: int = 0
    skipped_count: int = 0
    liked_tweets: list[str] = field(default_factory=list)  # Tweet IDs or URLs
    failed_tweets: list[str] = field(default_factory=list)
    skipped_tweets: list[str] = field(default_factory=list)
    duration_seconds: float = 0.0
    rate_limited: bool = False
    cancelled: bool = False
    errors: list[str] = field(default_factory=list)
    
    @property
    def total_processed(self) -> int:
        return self.success_count + self.failed_count + self.skipped_count
    
    def to_dict(self) -> dict:
        return {
            "success_count": self.success_count,
            "failed_count": self.failed_count,
            "skipped_count": self.skipped_count,
            "liked_tweets": self.liked_tweets,
            "duration_seconds": self.duration_seconds,
            "rate_limited": self.rate_limited,
            "cancelled": self.cancelled,
        }


@dataclass
class CommentResult:
    """Result of comment operations."""
    
    success_count: int = 0
    failed_count: int = 0
    skipped_count: int = 0
    comments_posted: list[dict] = field(default_factory=list)  # {tweet_url, comment_text}
    failed_comments: list[dict] = field(default_factory=list)
    duration_seconds: float = 0.0
    rate_limited: bool = False
    cancelled: bool = False
    errors: list[str] = field(default_factory=list)
    
    @property
    def total_processed(self) -> int:
        return self.success_count + self.failed_count + self.skipped_count
    
    def to_dict(self) -> dict:
        return {
            "success_count": self.success_count,
            "failed_count": self.failed_count,
            "comments_posted": self.comments_posted,
            "duration_seconds": self.duration_seconds,
            "rate_limited": self.rate_limited,
            "cancelled": self.cancelled,
        }


@dataclass
class RetweetResult:
    """Result of retweet operations."""
    
    success_count: int = 0
    failed_count: int = 0
    skipped_count: int = 0
    retweeted_tweets: list[str] = field(default_factory=list)
    quoted_tweets: list[dict] = field(default_factory=list)  # {tweet_url, quote_text}
    failed_tweets: list[str] = field(default_factory=list)
    duration_seconds: float = 0.0
    rate_limited: bool = False
    cancelled: bool = False
    errors: list[str] = field(default_factory=list)
    
    @property
    def total_processed(self) -> int:
        return self.success_count + self.failed_count + self.skipped_count
    
    def to_dict(self) -> dict:
        return {
            "success_count": self.success_count,
            "failed_count": self.failed_count,
            "retweeted_tweets": self.retweeted_tweets,
            "quoted_tweets": self.quoted_tweets,
            "duration_seconds": self.duration_seconds,
            "rate_limited": self.rate_limited,
            "cancelled": self.cancelled,
        }


@dataclass
class BookmarkResult:
    """Result of bookmark operations."""
    
    success_count: int = 0
    failed_count: int = 0
    bookmarked_tweets: list[str] = field(default_factory=list)
    removed_bookmarks: list[str] = field(default_factory=list)
    failed_tweets: list[str] = field(default_factory=list)
    exported_count: int = 0
    export_path: Optional[str] = None
    duration_seconds: float = 0.0
    rate_limited: bool = False
    cancelled: bool = False
    errors: list[str] = field(default_factory=list)
    
    @property
    def total_processed(self) -> int:
        return self.success_count + self.failed_count
    
    def to_dict(self) -> dict:
        return {
            "success_count": self.success_count,
            "failed_count": self.failed_count,
            "bookmarked_tweets": self.bookmarked_tweets,
            "exported_count": self.exported_count,
            "export_path": self.export_path,
            "duration_seconds": self.duration_seconds,
            "rate_limited": self.rate_limited,
            "cancelled": self.cancelled,
        }


@dataclass
class LikeFilters:
    """Filters for like operations."""
    
    min_likes: int = 0
    max_likes: int = 100000
    min_retweets: int = 0
    max_retweets: int = 100000
    min_followers: int = 0
    max_followers: int = 10000000
    exclude_retweets: bool = True
    exclude_replies: bool = False
    exclude_media_only: bool = False
    require_text: bool = True
    language: Optional[str] = None
    blocked_keywords: list[str] = field(default_factory=list)
    blocked_users: list[str] = field(default_factory=list)
    
    def matches(self, tweet: TweetElement) -> tuple[bool, str]:
        """
        Check if a tweet matches the filters.
        
        Returns:
            (matches, reason)
        """
        # Check engagement limits
        if tweet.likes_count < self.min_likes:
            return False, f"too few likes ({tweet.likes_count} < {self.min_likes})"
        if tweet.likes_count > self.max_likes:
            return False, f"too many likes ({tweet.likes_count} > {self.max_likes})"
        if tweet.retweets_count < self.min_retweets:
            return False, f"too few retweets ({tweet.retweets_count} < {self.min_retweets})"
        if tweet.retweets_count > self.max_retweets:
            return False, f"too many retweets ({tweet.retweets_count} > {self.max_retweets})"
        
        # Check author followers
        if tweet.author_followers is not None:
            if tweet.author_followers < self.min_followers:
                return False, f"author has too few followers"
            if tweet.author_followers > self.max_followers:
                return False, f"author has too many followers"
        
        # Check tweet type
        if self.exclude_retweets and tweet.is_retweet:
            return False, "is retweet"
        if self.exclude_replies and tweet.is_reply:
            return False, "is reply"
        if self.exclude_media_only and tweet.has_media and not tweet.has_text:
            return False, "media only (no text)"
        if self.require_text and not tweet.has_text:
            return False, "no text content"
        
        # Check language
        if self.language and tweet.language and tweet.language != self.language:
            return False, f"wrong language ({tweet.language})"
        
        # Check blocked keywords
        if tweet.text:
            text_lower = tweet.text.lower()
            for keyword in self.blocked_keywords:
                if keyword.lower() in text_lower:
                    return False, f"contains blocked keyword: {keyword}"
        
        # Check blocked users
        if tweet.author_username:
            username_lower = tweet.author_username.lower()
            for user in self.blocked_users:
                if user.lower() == username_lower:
                    return False, f"from blocked user: {user}"
        
        return True, "passed all filters"


@dataclass
class AutoLikeConfig:
    """Configuration for auto-liker."""
    
    # Targeting
    keywords: list[str] = field(default_factory=list)
    hashtags: list[str] = field(default_factory=list)
    from_users: list[str] = field(default_factory=list)
    
    # Filtering
    min_likes: int = 0
    max_likes: int = 10000
    min_followers: int = 100
    exclude_retweets: bool = True
    exclude_replies: bool = False
    exclude_media_only: bool = False
    require_text: bool = True
    language: str = "en"
    
    # Blacklist
    blocked_keywords: list[str] = field(default_factory=list)
    blocked_users: list[str] = field(default_factory=list)
    
    # Limits
    max_likes_per_session: int = 50
    max_likes_per_hour: int = 30
    delay_range: tuple[int, int] = (2, 5)
    
    # Advanced
    like_probability: float = 1.0  # Random chance to like (0-1)
    also_retweet: bool = False
    also_bookmark: bool = False
    
    def to_filters(self) -> LikeFilters:
        """Convert to LikeFilters."""
        return LikeFilters(
            min_likes=self.min_likes,
            max_likes=self.max_likes,
            min_followers=self.min_followers,
            exclude_retweets=self.exclude_retweets,
            exclude_replies=self.exclude_replies,
            exclude_media_only=self.exclude_media_only,
            require_text=self.require_text,
            language=self.language,
            blocked_keywords=self.blocked_keywords,
            blocked_users=self.blocked_users,
        )


@dataclass
class AutoCommentConfig:
    """Configuration for auto-commenter."""
    
    # Targeting
    keywords: list[str] = field(default_factory=list)
    hashtags: list[str] = field(default_factory=list)
    from_users: list[str] = field(default_factory=list)
    
    # Comments
    templates: list[str] = field(default_factory=list)
    use_ai: bool = False
    ai_style: str = "helpful"  # 'helpful', 'casual', 'professional', 'witty'
    ai_max_length: int = 280
    
    # Smart features
    mention_author: bool = False
    add_hashtags: bool = False
    personalize: bool = True
    
    # Filtering
    min_likes: int = 0
    max_likes: int = 10000
    min_followers: int = 100
    exclude_retweets: bool = True
    
    # Limits
    max_comments_per_session: int = 10
    max_comments_per_hour: int = 5
    delay_range: tuple[int, int] = (60, 120)
    
    # Safety
    review_before_post: bool = True
    blocked_keywords: list[str] = field(default_factory=list)
    blocked_users: list[str] = field(default_factory=list)


@dataclass
class AutoRetweetConfig:
    """Configuration for auto-retweeter."""
    
    # Targeting
    keywords: list[str] = field(default_factory=list)
    hashtags: list[str] = field(default_factory=list)
    from_users: list[str] = field(default_factory=list)
    
    # Filtering
    min_likes: int = 10
    max_likes: int = 50000
    min_followers: int = 500
    exclude_replies: bool = True
    language: str = "en"
    
    # Blacklist
    blocked_keywords: list[str] = field(default_factory=list)
    blocked_users: list[str] = field(default_factory=list)
    
    # Limits
    max_retweets_per_session: int = 20
    max_retweets_per_hour: int = 10
    delay_range: tuple[int, int] = (5, 15)
    
    # Advanced
    retweet_probability: float = 1.0
    quote_instead: bool = False
    quote_templates: list[str] = field(default_factory=list)

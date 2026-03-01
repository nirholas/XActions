"""
Tweet data model for X/Twitter tweets.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from xeepy.models.user import User


@dataclass
class Tweet:
    """
    Represents an X/Twitter tweet.
    
    Attributes:
        id: Unique tweet ID.
        author: User who posted the tweet.
        text: Tweet text content.
        timestamp: When the tweet was posted.
        likes: Number of likes.
        retweets: Number of retweets.
        replies: Number of replies.
        quotes: Number of quote tweets.
        views: Number of views (impressions).
        bookmarks: Number of bookmarks.
        media: List of media URLs (images, videos).
        hashtags: List of hashtags in the tweet.
        mentions: List of @mentions in the tweet.
        urls: List of URLs in the tweet.
        is_retweet: Whether this is a retweet.
        is_quote: Whether this is a quote tweet.
        is_reply: Whether this is a reply.
        is_thread: Whether this is part of a thread.
        reply_to_id: ID of tweet being replied to.
        reply_to_user: Username being replied to.
        quoted_tweet_id: ID of quoted tweet.
        conversation_id: ID of the conversation root.
        language: Detected language code.
    """
    
    id: str
    author: User | None = None
    text: str = ""
    timestamp: datetime | None = None
    likes: int = 0
    retweets: int = 0
    replies: int = 0
    quotes: int = 0
    views: int = 0
    bookmarks: int = 0
    
    # Media and content
    media: list[str] = field(default_factory=list)
    media_types: list[str] = field(default_factory=list)  # 'image', 'video', 'gif'
    hashtags: list[str] = field(default_factory=list)
    mentions: list[str] = field(default_factory=list)
    urls: list[str] = field(default_factory=list)
    card_url: str = ""  # URL card/preview
    
    # Tweet type flags
    is_retweet: bool = False
    is_quote: bool = False
    is_reply: bool = False
    is_thread: bool = False
    is_pinned: bool = False
    is_sensitive: bool = False
    
    # Related tweets
    reply_to_id: str = ""
    reply_to_user: str = ""
    quoted_tweet_id: str = ""
    retweeted_tweet_id: str = ""
    conversation_id: str = ""
    thread_id: str = ""
    
    # Additional metadata
    language: str = ""
    source: str = ""  # e.g., "Twitter Web App"
    
    # Metadata
    scraped_at: datetime = field(default_factory=datetime.now)
    raw_data: dict[str, Any] = field(default_factory=dict)
    
    @property
    def url(self) -> str:
        """Get the full URL to this tweet."""
        if self.author:
            return f"https://x.com/{self.author.username}/status/{self.id}"
        return f"https://x.com/i/status/{self.id}"
    
    @property
    def engagement_rate(self) -> float:
        """Calculate engagement rate (likes + retweets + replies) / views."""
        if self.views == 0:
            return 0.0
        return (self.likes + self.retweets + self.replies) / self.views
    
    @property
    def total_engagement(self) -> int:
        """Get total engagement (likes + retweets + replies + quotes)."""
        return self.likes + self.retweets + self.replies + self.quotes
    
    @property
    def has_media(self) -> bool:
        """Check if tweet has any media."""
        return len(self.media) > 0
    
    @property
    def has_hashtags(self) -> bool:
        """Check if tweet has any hashtags."""
        return len(self.hashtags) > 0
    
    @property
    def has_mentions(self) -> bool:
        """Check if tweet has any mentions."""
        return len(self.mentions) > 0
    
    @property
    def word_count(self) -> int:
        """Get word count of tweet text."""
        return len(self.text.split())
    
    @property
    def character_count(self) -> int:
        """Get character count of tweet text."""
        return len(self.text)
    
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Tweet":
        """
        Create a Tweet instance from a dictionary.
        
        Args:
            data: Dictionary containing tweet data.
            
        Returns:
            Tweet instance.
        """
        # Parse timestamp
        timestamp = data.get("timestamp")
        if isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            except ValueError:
                timestamp = None
        
        # Parse author
        author = data.get("author")
        if isinstance(author, dict):
            author = User.from_dict(author)
        
        # Parse scraped_at
        scraped_at = data.get("scraped_at")
        if isinstance(scraped_at, str):
            try:
                scraped_at = datetime.fromisoformat(scraped_at.replace("Z", "+00:00"))
            except ValueError:
                scraped_at = datetime.now()
        elif scraped_at is None:
            scraped_at = datetime.now()
        
        return cls(
            id=data.get("id", ""),
            author=author,
            text=data.get("text", ""),
            timestamp=timestamp,
            likes=data.get("likes", 0),
            retweets=data.get("retweets", 0),
            replies=data.get("replies", 0),
            quotes=data.get("quotes", 0),
            views=data.get("views", 0),
            bookmarks=data.get("bookmarks", 0),
            media=data.get("media", []),
            media_types=data.get("media_types", []),
            hashtags=data.get("hashtags", []),
            mentions=data.get("mentions", []),
            urls=data.get("urls", []),
            card_url=data.get("card_url", ""),
            is_retweet=data.get("is_retweet", False),
            is_quote=data.get("is_quote", False),
            is_reply=data.get("is_reply", False),
            is_thread=data.get("is_thread", False),
            is_pinned=data.get("is_pinned", False),
            is_sensitive=data.get("is_sensitive", False),
            reply_to_id=data.get("reply_to_id", ""),
            reply_to_user=data.get("reply_to_user", ""),
            quoted_tweet_id=data.get("quoted_tweet_id", ""),
            retweeted_tweet_id=data.get("retweeted_tweet_id", ""),
            conversation_id=data.get("conversation_id", ""),
            thread_id=data.get("thread_id", ""),
            language=data.get("language", ""),
            source=data.get("source", ""),
            scraped_at=scraped_at,
            raw_data=data.get("raw_data", {}),
        )
    
    def to_dict(self) -> dict[str, Any]:
        """
        Convert Tweet to a dictionary.
        
        Returns:
            Dictionary representation of the tweet.
        """
        return {
            "id": self.id,
            "author": self.author.to_dict() if self.author else None,
            "text": self.text,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "likes": self.likes,
            "retweets": self.retweets,
            "replies": self.replies,
            "quotes": self.quotes,
            "views": self.views,
            "bookmarks": self.bookmarks,
            "media": self.media,
            "media_types": self.media_types,
            "hashtags": self.hashtags,
            "mentions": self.mentions,
            "urls": self.urls,
            "card_url": self.card_url,
            "is_retweet": self.is_retweet,
            "is_quote": self.is_quote,
            "is_reply": self.is_reply,
            "is_thread": self.is_thread,
            "is_pinned": self.is_pinned,
            "is_sensitive": self.is_sensitive,
            "reply_to_id": self.reply_to_id,
            "reply_to_user": self.reply_to_user,
            "quoted_tweet_id": self.quoted_tweet_id,
            "retweeted_tweet_id": self.retweeted_tweet_id,
            "conversation_id": self.conversation_id,
            "thread_id": self.thread_id,
            "language": self.language,
            "source": self.source,
            "url": self.url,
            "engagement_rate": self.engagement_rate,
            "total_engagement": self.total_engagement,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
        }
    
    def to_flat_dict(self) -> dict[str, Any]:
        """
        Convert Tweet to a flat dictionary suitable for CSV export.
        
        Returns:
            Flat dictionary without nested structures.
        """
        return {
            "id": self.id,
            "author_username": self.author.username if self.author else "",
            "author_display_name": self.author.display_name if self.author else "",
            "text": self.text.replace("\n", " ").replace("\r", ""),
            "timestamp": self.timestamp.isoformat() if self.timestamp else "",
            "likes": self.likes,
            "retweets": self.retweets,
            "replies": self.replies,
            "quotes": self.quotes,
            "views": self.views,
            "bookmarks": self.bookmarks,
            "media_count": len(self.media),
            "media_urls": ";".join(self.media),
            "hashtags": ";".join(self.hashtags),
            "mentions": ";".join(self.mentions),
            "urls": ";".join(self.urls),
            "is_retweet": self.is_retweet,
            "is_quote": self.is_quote,
            "is_reply": self.is_reply,
            "reply_to_id": self.reply_to_id,
            "reply_to_user": self.reply_to_user,
            "url": self.url,
            "total_engagement": self.total_engagement,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else "",
        }
    
    def __str__(self) -> str:
        author = f"@{self.author.username}" if self.author else "Unknown"
        text_preview = self.text[:50] + "..." if len(self.text) > 50 else self.text
        return f"{author}: {text_preview}"
    
    def __repr__(self) -> str:
        return f"Tweet(id='{self.id}', author='{self.author.username if self.author else 'Unknown'}')"
    
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Tweet):
            return False
        return self.id == other.id
    
    def __hash__(self) -> int:
        return hash(self.id)


@dataclass
class Reply(Tweet):
    """
    Represents a reply to a tweet.
    
    Extends Tweet with additional reply-specific fields.
    """
    
    # Reply specific
    parent_tweet_id: str = ""
    parent_author: str = ""
    depth: int = 0  # Nesting level in conversation
    
    def to_dict(self) -> dict[str, Any]:
        """Convert Reply to dictionary."""
        data = super().to_dict()
        data.update({
            "parent_tweet_id": self.parent_tweet_id,
            "parent_author": self.parent_author,
            "depth": self.depth,
        })
        return data


@dataclass  
class Thread:
    """
    Represents a Twitter thread (series of connected tweets).
    
    Attributes:
        id: Conversation/thread ID.
        author: Thread author.
        tweets: List of tweets in the thread.
        created_at: When the thread started.
    """
    
    id: str
    author: User | None = None
    tweets: list[Tweet] = field(default_factory=list)
    created_at: datetime | None = None
    scraped_at: datetime = field(default_factory=datetime.now)
    
    @property
    def length(self) -> int:
        """Number of tweets in thread."""
        return len(self.tweets)
    
    @property
    def total_likes(self) -> int:
        """Total likes across all tweets."""
        return sum(t.likes for t in self.tweets)
    
    @property
    def total_retweets(self) -> int:
        """Total retweets across all tweets."""
        return sum(t.retweets for t in self.tweets)
    
    @property
    def full_text(self) -> str:
        """Concatenated text of all tweets."""
        return "\n\n".join(t.text for t in self.tweets)
    
    @property
    def url(self) -> str:
        """URL to the first tweet (thread start)."""
        if self.tweets:
            return self.tweets[0].url
        return ""
    
    def to_dict(self) -> dict[str, Any]:
        """Convert Thread to dictionary."""
        return {
            "id": self.id,
            "author": self.author.to_dict() if self.author else None,
            "tweets": [t.to_dict() for t in self.tweets],
            "length": self.length,
            "total_likes": self.total_likes,
            "total_retweets": self.total_retweets,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
            "url": self.url,
        }

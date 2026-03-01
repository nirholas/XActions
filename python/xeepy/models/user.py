"""
User data model for X/Twitter users.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class User:
    """
    Represents an X/Twitter user profile.
    
    Attributes:
        id: Unique user ID.
        username: User's handle (without @).
        display_name: User's display name.
        bio: User's bio/description.
        location: User's location (if provided).
        website: User's website URL.
        joined_date: When the account was created.
        followers_count: Number of followers.
        following_count: Number of accounts following.
        tweets_count: Total number of tweets.
        is_verified: Has legacy verification badge.
        is_blue_verified: Has Twitter Blue verification.
        is_protected: Account is private/protected.
        is_business: Is a business account.
        profile_image_url: Profile picture URL.
        banner_url: Profile banner image URL.
        pinned_tweet_id: ID of pinned tweet (if any).
    """
    
    id: str
    username: str
    display_name: str
    bio: str = ""
    location: str = ""
    website: str = ""
    joined_date: datetime | None = None
    followers_count: int = 0
    following_count: int = 0
    tweets_count: int = 0
    is_verified: bool = False
    is_blue_verified: bool = False
    is_protected: bool = False
    is_business: bool = False
    profile_image_url: str = ""
    banner_url: str = ""
    pinned_tweet_id: str | None = None
    
    # Metadata
    scraped_at: datetime = field(default_factory=datetime.now)
    raw_data: dict[str, Any] = field(default_factory=dict)
    
    @property
    def profile_url(self) -> str:
        """Get the full URL to this user's profile."""
        return f"https://x.com/{self.username}"
    
    @property
    def followers_url(self) -> str:
        """Get the URL to this user's followers list."""
        return f"https://x.com/{self.username}/followers"
    
    @property
    def following_url(self) -> str:
        """Get the URL to this user's following list."""
        return f"https://x.com/{self.username}/following"
    
    @property
    def follow_ratio(self) -> float:
        """Calculate followers to following ratio."""
        if self.following_count == 0:
            return float(self.followers_count)
        return self.followers_count / self.following_count
    
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "User":
        """
        Create a User instance from a dictionary.
        
        Args:
            data: Dictionary containing user data.
            
        Returns:
            User instance.
        """
        # Parse joined_date if it's a string
        joined_date = data.get("joined_date")
        if isinstance(joined_date, str):
            try:
                joined_date = datetime.fromisoformat(joined_date.replace("Z", "+00:00"))
            except ValueError:
                joined_date = None
        
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
            username=data.get("username", ""),
            display_name=data.get("display_name", ""),
            bio=data.get("bio", ""),
            location=data.get("location", ""),
            website=data.get("website", ""),
            joined_date=joined_date,
            followers_count=data.get("followers_count", 0),
            following_count=data.get("following_count", 0),
            tweets_count=data.get("tweets_count", 0),
            is_verified=data.get("is_verified", False),
            is_blue_verified=data.get("is_blue_verified", False),
            is_protected=data.get("is_protected", False),
            is_business=data.get("is_business", False),
            profile_image_url=data.get("profile_image_url", ""),
            banner_url=data.get("banner_url", ""),
            pinned_tweet_id=data.get("pinned_tweet_id"),
            scraped_at=scraped_at,
            raw_data=data.get("raw_data", {}),
        )
    
    def to_dict(self) -> dict[str, Any]:
        """
        Convert User to a dictionary.
        
        Returns:
            Dictionary representation of the user.
        """
        return {
            "id": self.id,
            "username": self.username,
            "display_name": self.display_name,
            "bio": self.bio,
            "location": self.location,
            "website": self.website,
            "joined_date": self.joined_date.isoformat() if self.joined_date else None,
            "followers_count": self.followers_count,
            "following_count": self.following_count,
            "tweets_count": self.tweets_count,
            "is_verified": self.is_verified,
            "is_blue_verified": self.is_blue_verified,
            "is_protected": self.is_protected,
            "is_business": self.is_business,
            "profile_image_url": self.profile_image_url,
            "banner_url": self.banner_url,
            "pinned_tweet_id": self.pinned_tweet_id,
            "profile_url": self.profile_url,
            "follow_ratio": self.follow_ratio,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
        }
    
    def to_flat_dict(self) -> dict[str, Any]:
        """
        Convert User to a flat dictionary suitable for CSV export.
        
        Returns:
            Flat dictionary without nested structures.
        """
        return {
            "id": self.id,
            "username": self.username,
            "display_name": self.display_name,
            "bio": self.bio.replace("\n", " ").replace("\r", ""),
            "location": self.location,
            "website": self.website,
            "joined_date": self.joined_date.isoformat() if self.joined_date else "",
            "followers_count": self.followers_count,
            "following_count": self.following_count,
            "tweets_count": self.tweets_count,
            "is_verified": self.is_verified,
            "is_blue_verified": self.is_blue_verified,
            "is_protected": self.is_protected,
            "profile_url": self.profile_url,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else "",
        }
    
    def __str__(self) -> str:
        return f"@{self.username} ({self.display_name})"
    
    def __repr__(self) -> str:
        return f"User(username='{self.username}', id='{self.id}')"
    
    def __eq__(self, other: object) -> bool:
        if not isinstance(other, User):
            return False
        return self.id == other.id or self.username.lower() == other.username.lower()
    
    def __hash__(self) -> int:
        return hash(self.id or self.username.lower())

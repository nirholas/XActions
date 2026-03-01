"""
Xeepy Scrapers Module

Provides scrapers for various X/Twitter data:
- User profiles
- Followers/Following lists
- Tweets and timelines
- Replies
- Threads
- Hashtags
- Media
- Likes
- Lists
- Search results
- Twitter Spaces (audio, transcripts, chat)
- Media downloads
- Trends and recommendations
"""

from xeepy.scrapers.base import BaseScraper
from xeepy.scrapers.profile import ProfileScraper
from xeepy.scrapers.followers import FollowersScraper
from xeepy.scrapers.following import FollowingScraper
from xeepy.scrapers.tweets import TweetsScraper
from xeepy.scrapers.replies import RepliesScraper
from xeepy.scrapers.thread import ThreadScraper
from xeepy.scrapers.hashtag import HashtagScraper
from xeepy.scrapers.media import MediaScraper
from xeepy.scrapers.likes import LikesScraper
from xeepy.scrapers.lists import ListsScraper
from xeepy.scrapers.search import SearchScraper
from xeepy.scrapers.spaces import SpacesScraper, Space, SpaceCategory, SpaceState
from xeepy.scrapers.downloads import MediaDownloader, MediaItem
from xeepy.scrapers.recommendations import RecommendationsScraper, Trend, RecommendedUser

__all__ = [
    "BaseScraper",
    "ProfileScraper",
    "FollowersScraper",
    "FollowingScraper",
    "TweetsScraper",
    "RepliesScraper",
    "ThreadScraper",
    "HashtagScraper",
    "MediaScraper",
    "LikesScraper",
    "ListsScraper",
    "SearchScraper",
    # New scrapers
    "SpacesScraper",
    "Space",
    "SpaceCategory",
    "SpaceState",
    "MediaDownloader",
    "MediaItem",
    "RecommendationsScraper",
    "Trend",
    "RecommendedUser",
]


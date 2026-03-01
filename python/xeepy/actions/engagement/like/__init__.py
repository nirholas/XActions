"""
Xeepy Like Module

Provides all like-related automation features.
"""

from xeepy.actions.engagement.like.like_tweet import LikeTweet
from xeepy.actions.engagement.like.like_by_keyword import LikeByKeyword
from xeepy.actions.engagement.like.like_by_user import LikeByUser
from xeepy.actions.engagement.like.like_by_hashtag import LikeByHashtag
from xeepy.actions.engagement.like.auto_liker import AutoLiker

__all__ = [
    "LikeTweet",
    "LikeByKeyword",
    "LikeByUser",
    "LikeByHashtag",
    "AutoLiker",
]

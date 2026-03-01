"""
Xeepy Engagement Module

Contains all engagement automation features:
- Likes (single, by keyword, by user, by hashtag, auto-liker)
- Comments (reply, auto-commenter, AI commenter)
- Retweets (single, quote tweet, auto-retweet)
- Bookmarks (add, remove, export)
"""

from xeepy.actions.engagement.like import (
    LikeTweet,
    LikeByKeyword,
    LikeByUser,
    LikeByHashtag,
    AutoLiker,
)
from xeepy.actions.engagement.comment import (
    ReplyTweet,
    AutoCommenter,
    AICommenter,
)
from xeepy.actions.engagement.retweet import (
    RetweetTweet,
    QuoteTweet,
    AutoRetweet,
)
from xeepy.actions.engagement.bookmark import (
    BookmarkTweet,
    RemoveBookmark,
    ExportBookmarks,
    BookmarkManager,
)

__all__ = [
    # Like actions
    "LikeTweet",
    "LikeByKeyword",
    "LikeByUser",
    "LikeByHashtag",
    "AutoLiker",
    # Comment actions
    "ReplyTweet",
    "AutoCommenter",
    "AICommenter",
    # Retweet actions
    "RetweetTweet",
    "QuoteTweet",
    "AutoRetweet",
    # Bookmark actions
    "BookmarkTweet",
    "RemoveBookmark",
    "ExportBookmarks",
    "BookmarkManager",
]

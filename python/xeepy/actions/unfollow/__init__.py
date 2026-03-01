"""
Unfollow operations module.

Provides various unfollow operations for X/Twitter automation.
"""

from .unfollow_user import UnfollowUser, UnfollowUsers
from .unfollow_all import UnfollowAll
from .unfollow_non_followers import UnfollowNonFollowers
from .smart_unfollow import SmartUnfollow
from .unfollow_by_criteria import UnfollowByCriteria

__all__ = [
    'UnfollowUser',
    'UnfollowUsers',
    'UnfollowAll',
    'UnfollowNonFollowers',
    'SmartUnfollow',
    'UnfollowByCriteria',
]

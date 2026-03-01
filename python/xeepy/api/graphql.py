"""
Direct GraphQL API access for X/Twitter.

Provides direct access to Twitter's internal GraphQL API for:
- Higher rate limits with batch queries
- Faster operations without browser automation
- Access to internal endpoints

Note: Requires valid session cookies (ct0, auth_token).
"""

from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable
from urllib.parse import urlencode

import httpx
from loguru import logger


# GraphQL operation IDs (these may need updating as Twitter changes them)
@dataclass
class Operation:
    """GraphQL operation definitions."""
    
    # User operations
    UserByScreenName = ('xc8f1g7BYqr6VTzTbvNlGw', 'UserByScreenName')
    UsersByRestIds = ('GD4q8bBE2i6cqWw2iT74Gg', 'UsersByRestIds')
    
    # Tweet operations
    TweetDetail = ('xOhkmRac04YFZmOzU9PJHg', 'TweetDetail')
    TweetResultByRestId = ('V3vfsYzNEyD9tsf4xoFRgw', 'TweetResultByRestId')
    
    # Batch operations (higher rate limits)
    TweetsByRestIds = ('QvCV3AU7X1ZXr9JSrH9EOA', 'TweetsByRestIds')  # ~220 batch, 500/15min
    UsersByRestIds = ('GD4q8bBE2i6cqWw2iT74Gg', 'UsersByRestIds')    # ~100 batch, 500/15min
    
    # Timeline operations
    UserTweets = ('V7H0Ap3_Hh2FyS75OCDO3Q', 'UserTweets')
    UserTweetsAndReplies = ('E4wA5vo2sjVyvpliUffSCw', 'UserTweetsAndReplies')
    UserMedia = ('Ma9mPDLfvU0FIg-USZPX2w', 'UserMedia')
    UserLikes = ('9MSTt44HoGjVFSg_u3rHDw', 'Likes')
    
    # Follower/Following operations
    Followers = ('pd8Tt5J25-W0GHNdrOZVaA', 'Followers')
    Following = ('AmvGuD6OFYv5HHXQ4HTt_A', 'Following')
    FollowersYouKnow = ('RvojYJJB90VwJ0rdVhbjMQ', 'FollowersYouKnow')
    
    # Search operations
    SearchTimeline = ('gkjsKepM6gl_HmFWoWKfgg', 'SearchTimeline')
    
    # Engagement operations
    CreateTweet = ('7TKRKCPuAGsmYde0CudbVg', 'CreateTweet')
    DeleteTweet = ('VaenaVgh5q5ih7kvyVjgtg', 'DeleteTweet')
    FavoriteTweet = ('lI07N6Otwv1PhnEgXILM7A', 'FavoriteTweet')
    UnfavoriteTweet = ('ZYKSe-w7KEslx3JhSIk5LA', 'UnfavoriteTweet')
    CreateRetweet = ('ojPdsZsimiJrUGLR1sjUtA', 'CreateRetweet')
    DeleteRetweet = ('iQtK4dl5hBmXewYZuEOKVw', 'DeleteRetweet')
    CreateBookmark = ('aoDbu3RHznuiSkQ9aNM67Q', 'CreateBookmark')
    DeleteBookmark = ('Wlmlj2-xzyS1GN3a6cj-mQ', 'DeleteBookmark')
    
    # Follow operations
    Follow = ('2P7dCUflZ-Uyx5FqhDf2Ng', 'Follow')
    Unfollow = ('6h0ugqf5oDsT_9g7TLPe4g', 'Unfollow')
    
    # DM operations
    useSendMessageMutation = ('MaxK2PKX1F9Z-9SwqwavTw', 'useSendMessageMutation')
    DmAllSearchSlice = ('U-QXVRZ6iddb1QuZweh5DQ', 'DmAllSearchSlice')
    
    # Scheduled tweets
    CreateScheduledTweet = ('LCVzRQGxOaGnOnYH01NQXg', 'CreateScheduledTweet')
    DeleteScheduledTweet = ('CTOVqej0JBXAZSwkp1US0g', 'DeleteScheduledTweet')
    FetchScheduledTweets = ('ITtjAzvlZni2wWXwf295Qg', 'FetchScheduledTweets')
    
    # Draft tweets
    CreateDraftTweet = ('TlKbxn3NNPPORDcM3OgXlw', 'CreateDraftTweet')
    DeleteDraftTweet = ('bkh9G3FGgTldS9iTKWWYYw', 'DeleteDraftTweet')
    FetchDraftTweets = ('ZkqIq_xRhiUme0PBJNpRtg', 'FetchDraftTweets')
    
    # Space operations
    AudioSpaceById = ('xRXYjcPY9kq1VxZoLnvX2w', 'AudioSpaceById')
    AudioSpaceSearch = ('BV2ZL4foHvHh3-L8cd4FiA', 'AudioSpaceSearch')
    
    # Default features for requests
    default_features = {
        "creator_subscriptions_tweet_preview_api_enabled": True,
        "c9s_tweet_anatomy_moderator_badge_enabled": True,
        "tweetypie_unmention_optimization_enabled": True,
        "responsive_web_edit_tweet_api_enabled": True,
        "graphql_is_translatable_rweb_tweet_is_translatable_enabled": True,
        "view_counts_everywhere_api_enabled": True,
        "longform_notetweets_consumption_enabled": True,
        "responsive_web_twitter_article_tweet_consumption_enabled": True,
        "tweet_awards_web_tipping_enabled": False,
        "longform_notetweets_rich_text_read_enabled": True,
        "longform_notetweets_inline_media_enabled": True,
        "rweb_video_timestamps_enabled": True,
        "responsive_web_graphql_exclude_directive_enabled": True,
        "verified_phone_label_enabled": False,
        "freedom_of_speech_not_reach_fetch_enabled": True,
        "standardized_nudges_misinfo": True,
        "tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled": True,
        "responsive_web_media_download_video_enabled": False,
        "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
        "responsive_web_graphql_timeline_navigation_enabled": True,
        "responsive_web_enhance_cards_enabled": False,
    }
    
    default_variables = {
        "includePromotedContent": False,
        "withSuperFollowsUserFields": True,
        "withDownvotePerspective": False,
        "withReactionsMetadata": False,
        "withReactionsPerspective": False,
        "withSuperFollowsTweetFields": True,
        "withClientEventToken": False,
        "withBirdwatchNotes": False,
        "withVoice": True,
        "withV2Timeline": True,
    }


class GraphQLClient:
    """
    Direct GraphQL client for Twitter API.
    
    Provides batch operations with higher rate limits
    compared to browser automation.
    """
    
    GQL_API = "https://twitter.com/i/api/graphql"
    V1_API = "https://api.twitter.com/1.1"
    V2_API = "https://api.twitter.com/2"
    
    # Bearer token for Twitter web app
    BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
    
    def __init__(
        self,
        cookies: dict[str, str] | str | None = None,
        debug: bool = False,
    ):
        """
        Initialize GraphQL client.
        
        Args:
            cookies: Dict of cookies or path to cookies JSON file
                    Required: ct0, auth_token
            debug: Enable debug logging
        """
        self.debug = debug
        self._session: httpx.AsyncClient | None = None
        self._cookies = self._load_cookies(cookies) if cookies else {}
        self._csrf_token = self._cookies.get("ct0", "")
    
    def _load_cookies(self, cookies: dict | str) -> dict:
        """Load cookies from dict or file."""
        if isinstance(cookies, dict):
            return cookies
        
        if isinstance(cookies, str):
            try:
                with open(cookies, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load cookies from {cookies}: {e}")
                return {}
        
        return {}
    
    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create HTTP session."""
        if self._session is None:
            headers = {
                "Authorization": f"Bearer {self.BEARER_TOKEN}",
                "x-twitter-active-user": "yes",
                "x-twitter-auth-type": "OAuth2Session",
                "x-twitter-client-language": "en",
                "x-csrf-token": self._csrf_token,
                "Content-Type": "application/json",
            }
            
            self._session = httpx.AsyncClient(
                headers=headers,
                cookies=self._cookies,
                timeout=30.0,
                follow_redirects=True,
            )
        
        return self._session
    
    def _build_params(
        self,
        variables: dict,
        features: dict | None = None,
    ) -> dict:
        """Build request parameters."""
        params = {
            "variables": json.dumps(variables),
            "features": json.dumps(features or Operation.default_features),
        }
        return params
    
    async def gql(
        self,
        method: str,
        operation: tuple,
        variables: dict,
        features: dict | None = None,
    ) -> dict:
        """
        Execute a GraphQL operation.
        
        Args:
            method: HTTP method (GET or POST)
            operation: Operation tuple (id, name)
            variables: Query variables
            features: Feature flags
            
        Returns:
            Response JSON
        """
        session = await self._get_session()
        op_id, op_name = operation
        url = f"{self.GQL_API}/{op_id}/{op_name}"
        
        params = self._build_params(variables, features)
        
        try:
            if method.upper() == "GET":
                response = await session.get(url, params=params)
            else:
                response = await session.post(url, json={
                    "queryId": op_id,
                    "variables": variables,
                    "features": features or Operation.default_features,
                })
            
            response.raise_for_status()
            data = response.json()
            
            if self.debug:
                logger.debug(f"GraphQL {op_name}: {response.status_code}")
            
            return data
            
        except Exception as e:
            logger.error(f"GraphQL error for {op_name}: {e}")
            raise
    
    # ========== Batch Operations (Higher Rate Limits) ==========
    
    async def tweets_by_ids(self, tweet_ids: list[str]) -> list[dict]:
        """
        Batch fetch tweets by IDs.
        
        This is much more efficient than fetching one at a time.
        Batch size: ~220 tweets
        Rate limit: ~500 requests per 15 minutes
        
        Args:
            tweet_ids: List of tweet IDs
            
        Returns:
            List of tweet data dicts
        """
        results = []
        
        # Process in batches of 220
        batch_size = 220
        for i in range(0, len(tweet_ids), batch_size):
            batch = tweet_ids[i:i + batch_size]
            
            variables = {
                "tweetIds": batch,
                "withCommunity": False,
                "includePromotedContent": False,
                "withVoice": False,
            }
            
            try:
                data = await self.gql("GET", Operation.TweetsByRestIds, variables)
                tweets = self._find_key(data, "tweetResult") or []
                results.extend(tweets)
            except Exception as e:
                logger.error(f"Error in tweets_by_ids batch: {e}")
        
        logger.info(f"Fetched {len(results)} tweets in batches")
        return results
    
    async def users_by_ids(self, user_ids: list[str]) -> list[dict]:
        """
        Batch fetch users by IDs.
        
        Batch size: ~100 users
        Rate limit: ~500 requests per 15 minutes
        
        Args:
            user_ids: List of user IDs
            
        Returns:
            List of user data dicts
        """
        results = []
        
        # Process in batches of 100
        batch_size = 100
        for i in range(0, len(user_ids), batch_size):
            batch = user_ids[i:i + batch_size]
            
            variables = {
                "userIds": batch,
            }
            
            try:
                data = await self.gql("GET", Operation.UsersByRestIds, variables)
                users = self._find_key(data, "user") or []
                results.extend(users)
            except Exception as e:
                logger.error(f"Error in users_by_ids batch: {e}")
        
        logger.info(f"Fetched {len(results)} users in batches")
        return results
    
    # ========== Single Operations ==========
    
    async def get_user(self, username: str) -> dict | None:
        """Get user by username."""
        variables = {
            "screen_name": username,
            "withSafetyModeUserFields": True,
        }
        
        data = await self.gql("GET", Operation.UserByScreenName, variables)
        return self._find_key(data, "user")
    
    async def get_tweet(self, tweet_id: str) -> dict | None:
        """Get tweet by ID."""
        variables = {
            "tweetId": tweet_id,
            "withCommunity": False,
            "includePromotedContent": False,
            "withVoice": False,
        }
        
        data = await self.gql("GET", Operation.TweetResultByRestId, variables)
        return self._find_key(data, "tweetResult")
    
    async def get_user_tweets(
        self,
        user_id: str,
        limit: int = 100,
        cursor: str | None = None,
    ) -> tuple[list[dict], str | None]:
        """
        Get user's tweets.
        
        Args:
            user_id: User ID (not username)
            limit: Maximum tweets to return
            cursor: Pagination cursor
            
        Returns:
            Tuple of (tweets, next_cursor)
        """
        variables = {
            "userId": user_id,
            "count": min(limit, 100),
            "includePromotedContent": False,
            "withQuickPromoteEligibilityTweetFields": False,
            "withVoice": True,
            "withV2Timeline": True,
        }
        
        if cursor:
            variables["cursor"] = cursor
        
        data = await self.gql("GET", Operation.UserTweets, variables)
        
        tweets = self._find_key(data, "tweet_results") or []
        next_cursor = self._find_key(data, "cursor_bottom") or self._find_key(data, "next_cursor")
        
        return tweets, next_cursor
    
    async def get_followers(
        self,
        user_id: str,
        limit: int = 100,
        cursor: str | None = None,
    ) -> tuple[list[dict], str | None]:
        """Get user's followers."""
        variables = {
            "userId": user_id,
            "count": min(limit, 100),
            "includePromotedContent": False,
        }
        
        if cursor:
            variables["cursor"] = cursor
        
        data = await self.gql("GET", Operation.Followers, variables)
        
        users = self._find_key(data, "user_results") or []
        next_cursor = self._find_key(data, "cursor_bottom")
        
        return users, next_cursor
    
    async def get_following(
        self,
        user_id: str,
        limit: int = 100,
        cursor: str | None = None,
    ) -> tuple[list[dict], str | None]:
        """Get users that a user is following."""
        variables = {
            "userId": user_id,
            "count": min(limit, 100),
            "includePromotedContent": False,
        }
        
        if cursor:
            variables["cursor"] = cursor
        
        data = await self.gql("GET", Operation.Following, variables)
        
        users = self._find_key(data, "user_results") or []
        next_cursor = self._find_key(data, "cursor_bottom")
        
        return users, next_cursor
    
    # ========== Engagement Operations ==========
    
    async def like(self, tweet_id: str) -> dict:
        """Like a tweet."""
        variables = {"tweet_id": tweet_id}
        return await self.gql("POST", Operation.FavoriteTweet, variables)
    
    async def unlike(self, tweet_id: str) -> dict:
        """Unlike a tweet."""
        variables = {"tweet_id": tweet_id}
        return await self.gql("POST", Operation.UnfavoriteTweet, variables)
    
    async def retweet(self, tweet_id: str) -> dict:
        """Retweet a tweet."""
        variables = {"tweet_id": tweet_id, "dark_request": False}
        return await self.gql("POST", Operation.CreateRetweet, variables)
    
    async def unretweet(self, tweet_id: str) -> dict:
        """Remove retweet."""
        variables = {"source_tweet_id": tweet_id, "dark_request": False}
        return await self.gql("POST", Operation.DeleteRetweet, variables)
    
    async def bookmark(self, tweet_id: str) -> dict:
        """Bookmark a tweet."""
        variables = {"tweet_id": tweet_id}
        return await self.gql("POST", Operation.CreateBookmark, variables)
    
    async def unbookmark(self, tweet_id: str) -> dict:
        """Remove bookmark."""
        variables = {"tweet_id": tweet_id}
        return await self.gql("POST", Operation.DeleteBookmark, variables)
    
    async def follow(self, user_id: str) -> dict:
        """Follow a user."""
        variables = {"user_id": user_id}
        return await self.gql("POST", Operation.Follow, variables)
    
    async def unfollow(self, user_id: str) -> dict:
        """Unfollow a user."""
        variables = {"user_id": user_id}
        return await self.gql("POST", Operation.Unfollow, variables)
    
    # ========== Tweet Operations ==========
    
    async def tweet(
        self,
        text: str,
        reply_to: str | None = None,
        quote: str | None = None,
        media_ids: list[str] | None = None,
    ) -> dict:
        """
        Post a tweet.
        
        Args:
            text: Tweet text
            reply_to: Tweet ID to reply to
            quote: Tweet ID to quote
            media_ids: List of media IDs to attach
            
        Returns:
            Created tweet data
        """
        variables = {
            "tweet_text": text,
            "dark_request": False,
            "media": {
                "media_entities": [],
                "possibly_sensitive": False,
            },
            "semantic_annotation_ids": [],
        }
        
        if reply_to:
            variables["reply"] = {
                "in_reply_to_tweet_id": reply_to,
                "exclude_reply_user_ids": [],
            }
        
        if quote:
            variables["attachment_url"] = f"https://twitter.com/i/status/{quote}"
        
        if media_ids:
            variables["media"]["media_entities"] = [
                {"media_id": mid, "tagged_users": []}
                for mid in media_ids
            ]
        
        return await self.gql("POST", Operation.CreateTweet, variables)
    
    async def delete_tweet(self, tweet_id: str) -> dict:
        """Delete a tweet."""
        variables = {"tweet_id": tweet_id, "dark_request": False}
        return await self.gql("POST", Operation.DeleteTweet, variables)
    
    # ========== Search ==========
    
    async def search(
        self,
        query: str,
        search_type: str = "Latest",
        limit: int = 100,
        cursor: str | None = None,
    ) -> tuple[list[dict], str | None]:
        """
        Search tweets.
        
        Args:
            query: Search query
            search_type: Type of search (Top, Latest, People, Photos, Videos)
            limit: Maximum results
            cursor: Pagination cursor
            
        Returns:
            Tuple of (results, next_cursor)
        """
        variables = {
            "rawQuery": query,
            "count": min(limit, 100),
            "querySource": "typed_query",
            "product": search_type,
        }
        
        if cursor:
            variables["cursor"] = cursor
        
        data = await self.gql("GET", Operation.SearchTimeline, variables)
        
        results = self._find_key(data, "tweet_results") or []
        next_cursor = self._find_key(data, "cursor_bottom")
        
        return results, next_cursor
    
    # ========== Utility Methods ==========
    
    def _find_key(self, data: Any, key: str) -> Any:
        """Recursively find a key in nested data."""
        if isinstance(data, dict):
            if key in data:
                return data[key]
            for v in data.values():
                result = self._find_key(v, key)
                if result is not None:
                    return result
        elif isinstance(data, list):
            for item in data:
                result = self._find_key(item, key)
                if result is not None:
                    return result
        return None
    
    @property
    def user_id(self) -> str | None:
        """Get current user ID from cookies."""
        twid = self._cookies.get("twid", "")
        match = re.search(r'u=(\d+)', twid)
        return match.group(1) if match else None
    
    def save_cookies(self, filepath: str) -> None:
        """Save cookies to file."""
        with open(filepath, 'w') as f:
            json.dump(self._cookies, f, indent=2)
        logger.info(f"Saved cookies to {filepath}")
    
    async def close(self) -> None:
        """Close the session."""
        if self._session:
            await self._session.aclose()
            self._session = None


# Convenience function
def create_graphql_client(cookies: dict | str) -> GraphQLClient:
    """Create a GraphQL client with cookies."""
    return GraphQLClient(cookies=cookies)

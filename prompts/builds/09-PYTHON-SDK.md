# Track 09 — Python SDK

> Build a Python SDK that wraps XActions' Node.js Scraper class, giving Python developers the same ergonomic API that `twikit` (4k★, Python-native) offers. Python is the #1 language for data science, AI agents, and automation — this track makes XActions accessible to that ecosystem. The Python SDK communicates with the Node.js library via a local subprocess bridge or can be used standalone with pure-Python HTTP requests.

---

## Research Before Starting

```
src/client/Scraper.js               — Node.js Scraper class API surface
src/client/models/Tweet.js           — Tweet model fields
src/client/models/Profile.js         — Profile model fields
src/client/api/graphqlQueries.js     — GraphQL endpoint registry
src/client/auth/CookieAuth.js        — Cookie auth pattern
src/client/auth/CredentialAuth.js    — Login flow
src/client/http/HttpClient.js        — HTTP client with rate limiting
package.json                         — Node.js package metadata
```

Study competitor Python implementations:
- `d60/twikit` — Python, `Client` class, async/await, cookie persistence, full Twitter API
- `bisguzar/twitter-scraper` — Python, synchronous, simpler API
- `snscrape` — Python, CLI-first, scraping-focused

### Approach

Two implementation modes:
1. **Pure Python** (recommended) — Native Python HTTP client using `httpx`/`aiohttp`, reimplements the Twitter GraphQL API calls directly in Python. No Node.js dependency.
2. **Bridge mode** (optional) — Spawns `node` subprocess, communicates via JSON-RPC. Uses the full Node.js implementation. Useful for feature parity.

The pure Python approach is preferred because:
- No Node.js installation required
- Familiar Python idioms (snake_case, context managers, type hints)
- Better integration with Python ecosystem (pandas, jupyter, langchain)
- Lower overhead than subprocess bridge

---

## Architecture

```
src/python/
  xactions/
    __init__.py          ← Package root, version, top-level imports
    client.py            ← Scraper class (main entry point)
    auth.py              ← CookieAuth, CredentialAuth, GuestAuth
    http.py              ← HTTP client with rate limiting and TLS
    models.py            ← Tweet, Profile, Space, Message dataclasses
    api/
      __init__.py
      tweets.py          ← Tweet CRUD operations
      users.py           ← User operations
      search.py          ← Search operations
      trends.py          ← Trends operations
      media.py           ← Media upload
      graphql.py         ← GraphQL endpoint registry and query builder
    pagination.py        ← AsyncGenerator pagination utilities
    errors.py            ← Error classes (ScraperError, RateLimitError, etc.)
    constants.py         ← Bearer token, default features, API URLs
    utils.py             ← Helpers (random delay, cookie parsing, etc.)
    bridge.py            ← Optional Node.js subprocess bridge
    types.py             ← Type aliases and TypedDict definitions
  tests/
    __init__.py
    test_client.py
    test_auth.py
    test_models.py
    test_api.py
    conftest.py          ← Shared fixtures
  pyproject.toml         ← Python package metadata (PEP 621)
  setup.py               ← Backward-compatible setup
  README.md              ← Python SDK documentation
```

---

## Prompts

### Prompt 1: Python Package Setup

```
Create the Python package structure with proper packaging files.

Create src/python/pyproject.toml:
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "xactions"
version = "1.0.0"
description = "XActions Python SDK — Twitter/X automation without API keys"
readme = "README.md"
license = {text = "MIT"}
authors = [
  {name = "nich", email = "nich@xactions.app"}
]
requires-python = ">=3.9"
classifiers = [
  "Development Status :: 4 - Beta",
  "Intended Audience :: Developers",
  "License :: OSI Approved :: MIT License",
  "Programming Language :: Python :: 3",
  "Programming Language :: Python :: 3.9",
  "Programming Language :: Python :: 3.10",
  "Programming Language :: Python :: 3.11",
  "Programming Language :: Python :: 3.12",
  "Programming Language :: Python :: 3.13",
  "Topic :: Software Development :: Libraries :: Python Modules",
  "Topic :: Internet :: WWW/HTTP",
]
keywords = ["twitter", "x", "scraper", "automation", "api"]

dependencies = [
  "httpx>=0.25.0",
  "aiofiles>=23.0.0",
]

[project.optional-dependencies]
async = ["aiohttp>=3.9.0"]
tls = ["curl-cffi>=0.7.0"]
all = ["aiohttp>=3.9.0", "curl-cffi>=0.7.0"]
dev = ["pytest>=7.0", "pytest-asyncio>=0.23", "pytest-httpx>=0.30", "ruff>=0.1.0"]

[project.urls]
Homepage = "https://xactions.app"
Repository = "https://github.com/nirholas/XActions"
Documentation = "https://xactions.app/docs/python"

[tool.setuptools.packages.find]
where = ["."]

[tool.ruff]
line-length = 120
target-version = "py39"

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "B", "SIM"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

Create src/python/xactions/__init__.py:
"""
XActions Python SDK — Twitter/X automation without API keys.

Usage:
    from xactions import Scraper

    scraper = Scraper()
    scraper.login(username='user', password='pass', email='e@mail.com')
    profile = scraper.get_profile('elonmusk')

Author: nich (@nichxbt)
License: MIT
"""

__version__ = "1.0.0"
__author__ = "nich (@nichxbt)"

from .client import Scraper
from .models import Tweet, Profile, Space, Message
from .errors import ScraperError, AuthenticationError, RateLimitError, NotFoundError
from .auth import CookieAuth, CredentialAuth

__all__ = [
    "Scraper",
    "Tweet", "Profile", "Space", "Message",
    "ScraperError", "AuthenticationError", "RateLimitError", "NotFoundError",
    "CookieAuth", "CredentialAuth",
]
```

### Prompt 2: Python Constants and GraphQL Registry

```
Create src/python/xactions/constants.py.

Port the GraphQL endpoint registry from the Node.js version (src/client/api/graphqlQueries.js).

Contents:

BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"

BASE_URL = "https://x.com"
API_BASE = "https://api.x.com"

GRAPHQL_ENDPOINTS: dict[str, dict] = {
    "UserByScreenName": {
        "query_id": "xc8f1g7BYqr6VTzTbvNLGg",
        "operation_name": "UserByScreenName",
        "method": "GET",
    },
    "UserTweets": { ... },
    "TweetDetail": { ... },
    "SearchTimeline": { ... },
    "Followers": { ... },
    "Following": { ... },
    "Likes": { ... },
    "CreateTweet": { ... },
    "DeleteTweet": { ... },
    "FavoriteTweet": { ... },
    "UnfavoriteTweet": { ... },
    "CreateRetweet": { ... },
    "DeleteRetweet": { ... },
    "CreateFollow": { "url": f"{API_BASE}/1.1/friendships/create.json", "method": "POST" },
    "DestroyFollow": { "url": f"{API_BASE}/1.1/friendships/destroy.json", "method": "POST" },
    "ListLatestTweetsTimeline": { ... },
}

DEFAULT_FEATURES: dict[str, bool] = {
    "hidden_profile_subscriptions_enabled": True,
    "rweb_tipjar_consumption_enabled": True,
    "responsive_web_graphql_exclude_directive_enabled": True,
    "verified_phone_label_enabled": False,
    "subscriptions_verification_info_is_identity_verified_enabled": True,
    # ... all features from Node.js version
}

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def build_graphql_url(endpoint_name: str, variables: dict, features: dict | None = None) -> str:
    """Build full GraphQL URL with encoded query parameters."""
    ...

All query IDs match the Node.js version exactly. Include a comment about periodic updates.
```

### Prompt 3: Python Error Classes

```
Create src/python/xactions/errors.py.

Mirror the Node.js error hierarchy:

class ScraperError(Exception):
    """Base error for all XActions scraper operations."""
    def __init__(self, message: str, code: str = "UNKNOWN", endpoint: str = "", 
                 http_status: int = 0, rate_limit_reset: datetime | None = None):
        super().__init__(message)
        self.code = code
        self.endpoint = endpoint
        self.http_status = http_status
        self.rate_limit_reset = rate_limit_reset

class AuthenticationError(ScraperError):
    """Authentication failed or required."""
    # codes: AUTH_FAILED, AUTH_REQUIRED, ACCOUNT_SUSPENDED, ACCOUNT_LOCKED, EMAIL_REQUIRED, TWO_FACTOR_REQUIRED

class RateLimitError(ScraperError):
    """Twitter rate limit exceeded."""
    def __init__(self, message: str, retry_after: int = 0, limit: int = 0,
                 remaining: int = 0, reset_at: datetime | None = None, **kwargs):
        super().__init__(message, code="RATE_LIMITED", **kwargs)
        self.retry_after = retry_after
        self.limit = limit
        self.remaining = remaining
        self.reset_at = reset_at

class NotFoundError(ScraperError):
    """Resource not found."""
    # codes: USER_NOT_FOUND, TWEET_NOT_FOUND, LIST_NOT_FOUND

class TwitterApiError(ScraperError):
    """Error from Twitter API response."""
    TWITTER_ERROR_MAP = {
        34: ("NotFoundError", "USER_NOT_FOUND"),
        50: ("NotFoundError", "USER_NOT_FOUND"),
        63: ("AuthenticationError", "ACCOUNT_SUSPENDED"),
        88: ("RateLimitError", "RATE_LIMITED"),
        326: ("AuthenticationError", "ACCOUNT_LOCKED"),
    }
    
    @classmethod
    def from_response(cls, errors: list[dict], status: int = 0) -> ScraperError:
        """Convert Twitter error response to appropriate exception."""
        ...

All exceptions use Python conventions. Include __repr__ for debugging.
```

### Prompt 4: Python Data Models

```
Create src/python/xactions/models.py.

Use Python dataclasses with from_graphql class methods, mirroring the Node.js models.

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

@dataclass
class Tweet:
    id: str = ""
    text: str = ""
    full_text: str = ""
    username: str = ""
    user_id: str = ""
    time_parsed: datetime | None = None
    timestamp: int = 0
    hashtags: list[str] = field(default_factory=list)
    mentions: list[str] = field(default_factory=list)
    urls: list[str] = field(default_factory=list)
    photos: list[dict] = field(default_factory=list)
    videos: list[dict] = field(default_factory=list)
    thread: list["Tweet"] = field(default_factory=list)
    in_reply_to_status_id: str | None = None
    in_reply_to_status: "Tweet | None" = None
    quoted_status_id: str | None = None
    quoted_status: "Tweet | None" = None
    is_retweet: bool = False
    is_reply: bool = False
    is_quote: bool = False
    retweeted_status: "Tweet | None" = None
    likes: int = 0
    retweets: int = 0
    replies: int = 0
    views: int = 0
    bookmark_count: int = 0
    conversation_id: str = ""
    sensitive_content: bool = False
    poll: dict | None = None
    place: dict | None = None

    @classmethod
    def from_graphql(cls, raw: dict) -> "Tweet | None":
        """Parse a Tweet from Twitter's GraphQL response.
        
        Handles the nested raw.legacy structure:
        - raw.legacy.full_text → full_text
        - raw.legacy.favorite_count → likes
        - raw.legacy.retweet_count → retweets
        - raw.legacy.reply_count → replies
        - raw.views.count → views
        - raw.legacy.entities.hashtags[].text → hashtags
        - raw.legacy.entities.user_mentions[].screen_name → mentions
        - raw.legacy.entities.urls[].expanded_url → urls
        - raw.legacy.entities.media[] → photos/videos
        - raw.quoted_status_result.result → quotedStatus (recursive)
        - raw.legacy.retweeted_status_result.result → retweetedStatus
        """
        if not raw:
            return None
        # Handle TweetWithVisibilityResults wrapper
        if "tweet" in raw:
            raw = raw["tweet"]
        legacy = raw.get("legacy", {})
        if not legacy:
            return None
        
        # ... full implementation parsing every field
        # Use .get() everywhere for null safety
        # Parse dates: datetime.strptime(legacy.get("created_at", ""), "%a %b %d %H:%M:%S %z %Y")
        # Parse media entities: separate photos from videos by type
        # Recursive parsing for quoted/retweeted tweets

    def to_dict(self) -> dict:
        """Convert to plain dictionary."""
        ...

@dataclass 
class Profile:
    id: str = ""
    username: str = ""
    name: str = ""
    bio: str = ""
    location: str = ""
    website: str = ""
    joined: datetime | None = None
    followers_count: int = 0
    following_count: int = 0
    tweet_count: int = 0
    likes_count: int = 0
    listed_count: int = 0
    media_count: int = 0
    avatar: str = ""
    banner: str = ""
    verified: bool = False
    protected: bool = False
    is_blue_verified: bool = False
    is_government: bool = False
    is_business: bool = False
    can_dm: bool = False
    pinned_tweet_ids: list[str] = field(default_factory=list)

    @classmethod
    def from_graphql(cls, raw: dict) -> "Profile | None":
        """Parse a Profile from Twitter's GraphQL response."""
        ...

@dataclass
class Space:
    id: str = ""
    state: str = ""  # 'live' | 'scheduled' | 'ended'
    title: str = ""
    host_ids: list[str] = field(default_factory=list)
    participant_count: int = 0
    started_at: datetime | None = None
    scheduled_start: datetime | None = None

@dataclass
class Message:
    id: str = ""
    text: str = ""
    sender_id: str = ""
    recipient_id: str = ""
    created_at: datetime | None = None
    conversation_id: str = ""

All models handle missing fields gracefully. All use snake_case per Python conventions.
Include __str__ and __repr__ for clean debugging output.
```

### Prompt 5: Python HTTP Client

```
Create src/python/xactions/http.py.

A Python HTTP client using httpx (async+sync) with rate limiting, retry, and optional TLS bypass via curl-cffi.

import httpx
import asyncio
import time
import random
from typing import Any

class HttpClient:
    """HTTP client for Twitter API requests with rate limiting and retry."""

    def __init__(self, *, proxy: str | None = None, timeout: int = 30,
                 max_retries: int = 3, use_tls_bypass: bool = False):
        self._proxy = proxy
        self._timeout = timeout
        self._max_retries = max_retries
        self._rate_limits: dict[str, dict] = {}
        self._use_tls_bypass = use_tls_bypass
        self._client: httpx.AsyncClient | None = None
        self._sync_client: httpx.Client | None = None

    async def _get_async_client(self) -> httpx.AsyncClient:
        if self._client is None:
            if self._use_tls_bypass:
                try:
                    from curl_cffi.requests import AsyncSession
                    # curl-cffi provides Chrome TLS fingerprint
                    self._client = AsyncSession(impersonate="chrome120")
                    return self._client
                except ImportError:
                    pass
            self._client = httpx.AsyncClient(
                proxy=self._proxy,
                timeout=self._timeout,
                http2=True,
                follow_redirects=True,
            )
        return self._client

    def _get_sync_client(self) -> httpx.Client:
        # Same but synchronous
        ...

    async def request(self, method: str, url: str, *, headers: dict | None = None,
                      json: dict | None = None, data: dict | None = None,
                      params: dict | None = None) -> httpx.Response:
        """Make an HTTP request with retry and rate limit handling."""
        # Check rate limits before request
        # Retry with exponential backoff on 429, 5xx
        # Parse rate limit headers: x-rate-limit-limit, x-rate-limit-remaining, x-rate-limit-reset
        # Random delay between requests (1-2s)
        ...

    def request_sync(self, method: str, url: str, **kwargs) -> httpx.Response:
        """Synchronous version of request()."""
        ...

    async def graphql(self, endpoint_name: str, variables: dict,
                      features: dict | None = None) -> dict:
        """Make a GraphQL API request."""
        # Build URL from constants.GRAPHQL_ENDPOINTS
        # Handle GET (query params) vs POST (JSON body)
        # Parse response, check for errors
        ...

    async def close(self):
        if self._client:
            await self._client.aclose()

    def _check_rate_limit(self, endpoint: str) -> None:
        """Raise RateLimitError if we've hit the limit for this endpoint."""
        ...

    def _update_rate_limit(self, endpoint: str, headers: dict) → None:
        """Update rate limit tracking from response headers."""
        ...

    @staticmethod
    async def random_delay(min_ms: int = 1000, max_ms: int = 2000) → None:
        await asyncio.sleep(random.uniform(min_ms, max_ms) / 1000)

Full implementation. Support both sync and async usage patterns.
```

### Prompt 6: Python Cookie Auth

```
Create src/python/xactions/auth.py.

Port the auth system from Node.js (Track 02).

import json
import httpx
from pathlib import Path
from datetime import datetime

class CookieAuth:
    """Manage Twitter authentication cookies."""

    def __init__(self, *, cookie_file_path: str | Path | None = None,
                 cookies: str | dict | list | None = None):
        self._cookies: dict[str, dict] = {}
        self._cookie_file_path = Path(cookie_file_path) if cookie_file_path else None
        if cookies:
            self.set_cookies(cookies)

    def get_cookies(self) -> list[dict]:
        ...

    def get_cookie_string(self) -> str:
        ...

    def set_cookies(self, cookies) -> None:
        """Accept string, dict, or list of cookie objects."""
        ...

    def get_auth_token(self) -> str | None:
        ...

    def get_csrf_token(self) -> str | None:
        ...

    def get_user_id(self) -> str | None:
        ...

    def is_authenticated(self) -> bool:
        ...

    def save_cookies(self, file_path: str | Path | None = None, *, password: str | None = None) -> None:
        """Save cookies to JSON file. Optional encryption."""
        ...

    def load_cookies(self, file_path: str | Path | None = None, *, password: str | None = None) -> None:
        """Load cookies from JSON file."""
        ...

    def get_headers(self) -> dict[str, str]:
        """Return auth-related HTTP headers."""
        return {
            "Cookie": self.get_cookie_string(),
            "x-csrf-token": self.get_csrf_token() or "",
        }


class CredentialAuth(CookieAuth):
    """Login via username/password using Twitter's onboarding flow."""

    def __init__(self, http: "HttpClient | None" = None, **kwargs):
        super().__init__(**kwargs)
        self._http = http
        self._flow_token: str | None = None
        self._username: str | None = None

    async def login(self, *, username: str, password: str, email: str | None = None,
                    two_factor_code: str | None = None) -> None:
        """Execute the full Twitter login flow.
        
        Steps:
        1. Activate guest token
        2. Initiate login flow (flow_name=login)
        3. JS instrumentation callback
        4. Enter username (LoginEnterUserIdentifierSSO)
        5. Handle email challenge if triggered (LoginEnterAlternateIdentifierSubtask)
        6. Enter password (LoginEnterPassword)
        7. Handle 2FA if triggered (LoginTwoFactorAuthChallenge)
        8. Account duplication check
        9. Extract cookies from responses
        """
        ...

    def login_sync(self, **kwargs) -> None:
        """Synchronous login wrapper."""
        import asyncio
        asyncio.get_event_loop().run_until_complete(self.login(**kwargs))

    async def logout(self) -> None:
        ...

    async def _execute_subtask(self, subtask_input: dict) -> dict:
        """Execute a single onboarding subtask."""
        ...


class GuestAuth:
    """Guest-only authentication for read-only operations."""
    
    def __init__(self):
        self._guest_token: str | None = None
        self._guest_token_expires: float = 0

    async def initialize(self, http: "HttpClient") -> None:
        ...

    def is_authenticated(self) -> bool:
        return False

    def is_guest_mode(self) -> bool:
        return True

    def get_headers(self) -> dict[str, str]:
        ...

All auth flows mirror the Node.js implementation exactly.
Use httpx for HTTP requests.
```

### Prompt 7: Python Tweet API

```
Create src/python/xactions/api/tweets.py.

Port tweet operations from Node.js (src/client/api/tweets.js).

from typing import AsyncIterator
from ..models import Tweet
from ..http import HttpClient
from ..constants import GRAPHQL_ENDPOINTS, DEFAULT_FEATURES

async def get_tweet(http: HttpClient, tweet_id: str) -> Tweet:
    """Get a single tweet by ID."""
    response = await http.graphql("TweetDetail", {
        "focalTweetId": tweet_id,
        "with_rux_injections": False,
        "includePromotedContent": False,
        "withCommunity": True,
        "withQuickPromoteEligibilityTweetFields": True,
        "withBirdwatchNotes": True,
        "withVoice": True,
        "withV2Timeline": True,
    })
    # Parse response: data.tweetResult.result
    result = _navigate(response, "data.tweetResult.result")
    if not result:
        raise NotFoundError(f"Tweet {tweet_id} not found", code="TWEET_NOT_FOUND")
    return Tweet.from_graphql(result)

async def get_tweets(http: HttpClient, user_id: str, count: int = 20) -> AsyncIterator[Tweet]:
    """Get user tweets with cursor pagination."""
    cursor = None
    yielded = 0
    while yielded < count:
        variables = {
            "userId": user_id,
            "count": 20,
            "includePromotedContent": False,
            "withQuickPromoteEligibilityTweetFields": True,
            "withVoice": True,
            "withV2Timeline": True,
        }
        if cursor:
            variables["cursor"] = cursor
        response = await http.graphql("UserTweets", variables)
        entries, next_cursor = _parse_timeline_entries(response, "data.user.result.timeline_v2.timeline")
        if not entries:
            break
        for entry in entries:
            tweet = _parse_tweet_entry(entry)
            if tweet:
                yield tweet
                yielded += 1
                if yielded >= count:
                    break
        cursor = next_cursor
        if not cursor:
            break
        await http.random_delay()

async def send_tweet(http: HttpClient, text: str, *, reply_to: str | None = None,
                     media_ids: list[str] | None = None) -> Tweet:
    """Create a new tweet."""
    ...

async def delete_tweet(http: HttpClient, tweet_id: str) -> None:
    ...

async def like_tweet(http: HttpClient, tweet_id: str) -> None:
    ...

async def unlike_tweet(http: HttpClient, tweet_id: str) -> None:
    ...

async def retweet(http: HttpClient, tweet_id: str) -> None:
    ...

async def unretweet(http: HttpClient, tweet_id: str) -> None:
    ...

async def get_latest_tweet(http: HttpClient, user_id: str) -> Tweet | None:
    async for tweet in get_tweets(http, user_id, count=1):
        return tweet
    return None

# Helper functions
def _navigate(obj: dict, path: str) -> Any:
    """Safe dot-path navigation."""
    ...

def _parse_timeline_entries(response: dict, path: str) -> tuple[list, str | None]:
    """Extract entries and cursor from timeline response."""
    ...

def _parse_tweet_entry(entry: dict) -> Tweet | None:
    """Parse a single timeline entry into a Tweet."""
    ...

All functions are async. Synchronous wrappers provided in client.py.
Full real implementation, no mocks. Same endpoint logic as Node.js.
```

### Prompt 8: Python User and Search API

```
Create src/python/xactions/api/users.py and src/python/xactions/api/search.py.

users.py:

async def get_user_by_screen_name(http: HttpClient, username: str) -> Profile:
    """Get user profile by screen name."""
    ...

async def get_user_by_id(http: HttpClient, user_id: str) -> Profile:
    ...

async def get_followers(http: HttpClient, user_id: str, count: int = 100) -> AsyncIterator[Profile]:
    """Get user followers with cursor pagination."""
    ...

async def get_following(http: HttpClient, user_id: str, count: int = 100) -> AsyncIterator[Profile]:
    ...

async def follow_user(http: HttpClient, user_id: str) -> None:
    ...

async def unfollow_user(http: HttpClient, user_id: str) -> None:
    ...

async def get_user_id_by_screen_name(http: HttpClient, username: str) -> str:
    profile = await get_user_by_screen_name(http, username)
    return profile.id


search.py:

from enum import Enum

class SearchMode(str, Enum):
    TOP = "Top"
    LATEST = "Latest"
    PHOTOS = "Photos"
    VIDEOS = "Videos"
    PEOPLE = "People"

async def search_tweets(http: HttpClient, query: str, count: int = 20,
                        mode: SearchMode = SearchMode.LATEST) -> AsyncIterator[Tweet]:
    """Search tweets with cursor pagination."""
    cursor = None
    yielded = 0
    while yielded < count:
        variables = {
            "rawQuery": query,
            "count": 20,
            "querySource": "typed_query",
            "product": mode.value,
        }
        if cursor:
            variables["cursor"] = cursor
        response = await http.graphql("SearchTimeline", variables)
        entries, next_cursor = _parse_search_entries(response)
        for entry in entries:
            tweet = _parse_tweet_entry(entry)
            if tweet:
                yield tweet
                yielded += 1
                if yielded >= count:
                    break
        cursor = next_cursor
        if not cursor:
            break
        await http.random_delay()

async def search_profiles(http: HttpClient, query: str, count: int = 20) -> AsyncIterator[Profile]:
    """Search user profiles."""
    ...

All are async generators with cursor-based pagination. Same parsing logic as Node.js.
```

### Prompt 9: Python Scraper Client Class

```
Create src/python/xactions/client.py.

The main entry point — equivalent to src/client/Scraper.js.

import asyncio
from typing import AsyncIterator
from .auth import CookieAuth, CredentialAuth, GuestAuth
from .http import HttpClient
from .models import Tweet, Profile
from .api import tweets as tweets_api, users as users_api, search as search_api
from .errors import ScraperError

class Scraper:
    """XActions Twitter Scraper — HTTP-only, no browser needed.
    
    Usage:
        # Sync
        scraper = Scraper()
        scraper.login(username='user', password='pass')
        profile = scraper.get_profile('elonmusk')
        
        # Async
        async with Scraper() as scraper:
            await scraper.login_async(username='user', password='pass')
            profile = await scraper.get_profile_async('elonmusk')
    """

    def __init__(self, *, cookies: str | dict | None = None,
                 proxy: str | None = None, tls_bypass: bool = False):
        self._http = HttpClient(proxy=proxy, use_tls_bypass=tls_bypass)
        self._auth: CookieAuth | CredentialAuth | GuestAuth
        self._user_id_cache: dict[str, str] = {}
        
        if cookies:
            self._auth = CookieAuth(cookies=cookies)
        else:
            self._auth = CredentialAuth(http=self._http)

    # === Context manager for async ===
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, *args):
        await self._http.close()

    # === Auth methods (sync wrappers) ===
    def login(self, *, username: str, password: str, email: str | None = None,
              two_factor_code: str | None = None) -> None:
        _run(self.login_async(username=username, password=password, 
                               email=email, two_factor_code=two_factor_code))

    async def login_async(self, **kwargs) -> None:
        if not isinstance(self._auth, CredentialAuth):
            self._auth = CredentialAuth(http=self._http)
        await self._auth.login(**kwargs)

    def logout(self) -> None:
        _run(self.logout_async())

    async def logout_async(self) -> None:
        if isinstance(self._auth, CredentialAuth):
            await self._auth.logout()

    def is_logged_in(self) -> bool:
        return self._auth.is_authenticated()

    # === Cookie methods ===
    def save_cookies(self, file_path: str = "cookies.json", *, password: str | None = None) -> None:
        self._auth.save_cookies(file_path, password=password)

    def load_cookies(self, file_path: str = "cookies.json", *, password: str | None = None) -> None:
        self._auth.load_cookies(file_path, password=password)

    # === Profile (sync + async) ===
    def get_profile(self, username: str) -> Profile:
        return _run(self.get_profile_async(username))

    async def get_profile_async(self, username: str) -> Profile:
        return await users_api.get_user_by_screen_name(self._http, username)

    # === Tweets ===
    def get_tweet(self, tweet_id: str) -> Tweet:
        return _run(self.get_tweet_async(tweet_id))

    async def get_tweet_async(self, tweet_id: str) -> Tweet:
        return await tweets_api.get_tweet(self._http, tweet_id)

    def get_tweets(self, username: str, count: int = 20) -> list[Tweet]:
        return _run(_collect(self.get_tweets_async(username, count)))

    async def get_tweets_async(self, username: str, count: int = 20) -> AsyncIterator[Tweet]:
        user_id = await self._resolve_user_id(username)
        async for tweet in tweets_api.get_tweets(self._http, user_id, count):
            yield tweet

    # === Search ===
    def search_tweets(self, query: str, count: int = 20, mode: str = "Latest") -> list[Tweet]:
        return _run(_collect(self.search_tweets_async(query, count, mode)))

    async def search_tweets_async(self, query: str, count: int = 20, mode: str = "Latest") -> AsyncIterator[Tweet]:
        async for tweet in search_api.search_tweets(self._http, query, count, SearchMode(mode)):
            yield tweet

    # === Actions ===
    def send_tweet(self, text: str, **kwargs) -> Tweet:
        return _run(self.send_tweet_async(text, **kwargs))

    async def send_tweet_async(self, text: str, **kwargs) -> Tweet:
        self._require_auth()
        return await tweets_api.send_tweet(self._http, text, **kwargs)

    def like(self, tweet_id: str) -> None:
        _run(self.like_async(tweet_id))

    async def like_async(self, tweet_id: str) -> None:
        self._require_auth()
        await tweets_api.like_tweet(self._http, tweet_id)

    def follow(self, username: str) -> None:
        _run(self.follow_async(username))

    async def follow_async(self, username: str) -> None:
        self._require_auth()
        user_id = await self._resolve_user_id(username)
        await users_api.follow_user(self._http, user_id)

    # ... unfollow, unlike, retweet, unretweet, delete_tweet, get_followers, get_following, get_trends, send_dm ...

    # === Internal ===
    async def _resolve_user_id(self, username: str) -> str:
        if username in self._user_id_cache:
            return self._user_id_cache[username]
        user_id = await users_api.get_user_id_by_screen_name(self._http, username)
        self._user_id_cache[username] = user_id
        return user_id

    def _require_auth(self) -> None:
        if not self._auth.is_authenticated():
            raise ScraperError("Not authenticated — login required", code="AUTH_REQUIRED")


def _run(coro):
    """Run async coroutine synchronously."""
    try:
        loop = asyncio.get_running_loop()
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            return pool.submit(asyncio.run, coro).result()
    except RuntimeError:
        return asyncio.run(coro)


async def _collect(async_iter) -> list:
    """Collect async iterator into list."""
    return [item async for item in async_iter]

Every method has both sync and async variants. The sync API uses asyncio.run() internally. Python convention: snake_case everywhere.
```

### Prompt 10: Python Pagination Utilities

```
Create src/python/xactions/pagination.py.

Port the AsyncCursor pattern from Node.js (Track 05).

from typing import AsyncIterator, TypeVar, Callable, Awaitable

T = TypeVar("T")

class AsyncCursor(AsyncIterator[T]):
    """Cursor-based async pagination iterator.
    
    Usage:
        async for tweet in AsyncCursor(fetch_page, parse_items, parse_cursor):
            print(tweet.text)
    """

    def __init__(self, fetch_page: Callable, parse_items: Callable,
                 parse_cursor: Callable, *, max_items: int | None = None,
                 delay_ms: int = 1500):
        self._fetch_page = fetch_page
        self._parse_items = parse_items
        self._parse_cursor = parse_cursor
        self._max_items = max_items
        self._delay_ms = delay_ms
        self._cursor: str | None = None
        self._buffer: list[T] = []
        self._yielded: int = 0
        self._exhausted: bool = False

    def __aiter__(self):
        return self

    async def __anext__(self) -> T:
        if self._max_items and self._yielded >= self._max_items:
            raise StopAsyncIteration
        while not self._buffer:
            if self._exhausted:
                raise StopAsyncIteration
            await self._fetch_next_page()
        item = self._buffer.pop(0)
        self._yielded += 1
        return item

    async def _fetch_next_page(self) -> None:
        response = await self._fetch_page(self._cursor)
        items = self._parse_items(response)
        cursor = self._parse_cursor(response)
        if not items:
            self._exhausted = True
            return
        self._buffer.extend(items)
        if cursor and cursor != self._cursor:
            self._cursor = cursor
            if items:
                await asyncio.sleep(self._delay_ms / 1000)
        else:
            self._exhausted = True

    async def collect(self, max_items: int | None = None) -> list[T]:
        """Collect all items into a list."""
        items = []
        async for item in self:
            items.append(item)
            if max_items and len(items) >= max_items:
                break
        return items

    async def take(self, n: int) -> list[T]:
        """Take first n items."""
        return await self.collect(max_items=n)


def paginate_timeline(http, endpoint: str, variables: dict, *,
                      parse_tweet: Callable, max_items: int = 100,
                      delay_ms: int = 1500) -> AsyncCursor[Tweet]:
    """Create a paginated timeline cursor."""
    async def fetch_page(cursor: str | None) -> dict:
        vars = {**variables}
        if cursor:
            vars["cursor"] = cursor
        return await http.graphql(endpoint, vars)
    
    def parse_items(response: dict) -> list:
        ...
    
    def parse_cursor(response: dict) -> str | None:
        ...
    
    return AsyncCursor(fetch_page, parse_items, parse_cursor,
                       max_items=max_items, delay_ms=delay_ms)
```

### Prompt 11: Node.js Bridge Mode (Optional)

```
Create src/python/xactions/bridge.py.

Optional mode that spawns a Node.js subprocess to use the full XActions Node.js library. Useful when the Python pure implementation doesn't support a feature yet.

import subprocess
import json
import uuid
from pathlib import Path

class NodeBridge:
    """Bridge to XActions Node.js library via subprocess JSON-RPC."""

    def __init__(self, node_path: str = "node", xactions_path: str | None = None):
        self._node_path = node_path
        self._xactions_path = xactions_path or self._find_xactions()
        self._process: subprocess.Popen | None = None

    def _find_xactions(self) -> str:
        """Find XActions Node.js installation."""
        # Check: npm list -g xactions, local node_modules, XACTIONS_PATH env var
        ...

    def start(self) -> None:
        """Start the Node.js bridge subprocess."""
        bridge_script = self._generate_bridge_script()
        self._process = subprocess.Popen(
            [self._node_path, "-e", bridge_script],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

    def _generate_bridge_script(self) -> str:
        """Generate Node.js script that accepts JSON-RPC commands on stdin."""
        return """
        import { Scraper } from 'xactions';
        import readline from 'readline';
        
        const scraper = new Scraper();
        const rl = readline.createInterface({ input: process.stdin });
        
        rl.on('line', async (line) => {
            try {
                const { id, method, params } = JSON.parse(line);
                let result;
                switch(method) {
                    case 'login': result = await scraper.login(params); break;
                    case 'getProfile': result = await scraper.getProfile(params.username); break;
                    case 'getTweet': result = await scraper.getTweet(params.id); break;
                    case 'searchTweets': {
                        const tweets = [];
                        for await (const t of scraper.searchTweets(params.query, params.count)) tweets.push(t);
                        result = tweets;
                        break;
                    }
                    // ... all other methods
                }
                console.log(JSON.stringify({ id, result }));
            } catch(e) {
                console.log(JSON.stringify({ id, error: { message: e.message, code: e.code } }));
            }
        });
        """

    def call(self, method: str, params: dict = {}) -> Any:
        """Call a method on the Node.js Scraper."""
        request_id = str(uuid.uuid4())
        request = json.dumps({"id": request_id, "method": method, "params": params})
        self._process.stdin.write(request + "\n")
        self._process.stdin.flush()
        response_line = self._process.stdout.readline()
        response = json.loads(response_line)
        if "error" in response:
            raise ScraperError(response["error"]["message"], code=response["error"].get("code", "BRIDGE_ERROR"))
        return response["result"]

    def stop(self) -> None:
        if self._process:
            self._process.terminate()
            self._process = None

Usage:
    from xactions.bridge import NodeBridge
    bridge = NodeBridge()
    bridge.start()
    profile = bridge.call("getProfile", {"username": "elonmusk"})
    bridge.stop()
```

### Prompt 12: Python SDK README

```
Create src/python/README.md with comprehensive documentation.

# XActions Python SDK

> Twitter/X automation for Python — no API keys required.

## Installation

\```bash
pip install xactions

# With TLS bypass (recommended for production):
pip install xactions[tls]

# With async support:
pip install xactions[async]

# Everything:
pip install xactions[all]
\```

## Quick Start

\```python
from xactions import Scraper

scraper = Scraper()

# Login with credentials
scraper.login(username='your_username', password='your_password', email='your_email')
scraper.save_cookies('cookies.json')

# Or load saved cookies
scraper.load_cookies('cookies.json')

# Get a profile
profile = scraper.get_profile('elonmusk')
print(f'{profile.name} — {profile.followers_count:,} followers')

# Get a tweet
tweet = scraper.get_tweet('1234567890')
print(f'{tweet.text} — {tweet.likes} likes')

# Search tweets
tweets = scraper.search_tweets('#python', count=50)
for tweet in tweets:
    print(tweet.text)

# Post a tweet
new_tweet = scraper.send_tweet('Hello from XActions Python SDK!')

# Like and follow
scraper.like('1234567890')
scraper.follow('elonmusk')
\```

## Async Usage

\```python
import asyncio
from xactions import Scraper

async def main():
    async with Scraper() as scraper:
        await scraper.login_async(username='user', password='pass')
        
        async for tweet in scraper.search_tweets_async('#ai', count=100):
            print(tweet.text)

asyncio.run(main())
\```

## Features
- Cookie-based authentication with persistence
- Username/password login (no API keys needed)
- Full tweet, user, search, trends API
- Async and sync interfaces
- Rate limiting with exponential backoff
- Optional TLS bypass via curl-cffi
- AsyncIterator pagination
- Type hints throughout

## API Reference
[Full API docs with every method, parameter, and return type]

## Comparison with twikit
[Table showing feature parity]

Include examples for: scraping followers, exporting data to pandas DataFrame, using with LangChain/LlamaIndex, Jupyter notebook usage.
```

### Prompt 13: Python Tests

```
Create src/python/tests/ with comprehensive test suite.

tests/conftest.py:
- Shared fixtures: mock HTTP client, sample GraphQL responses
- Use pytest-httpx for mocking HTTP requests

tests/test_models.py:
1. test_tweet_from_graphql_basic
2. test_tweet_from_graphql_retweet
3. test_tweet_from_graphql_quote
4. test_tweet_from_graphql_media
5. test_tweet_from_graphql_null_safety
6. test_profile_from_graphql_basic
7. test_profile_from_graphql_null_safety
8. test_tweet_to_dict_roundtrip

tests/test_auth.py:
9. test_cookie_auth_set_string
10. test_cookie_auth_set_dict
11. test_cookie_auth_is_authenticated
12. test_cookie_auth_save_load
13. test_cookie_auth_get_headers
14. test_credential_auth_login_flow (mocked HTTP)
15. test_guest_auth_headers

tests/test_client.py:
16. test_scraper_init_default
17. test_scraper_init_with_cookies
18. test_scraper_get_profile (mocked)
19. test_scraper_get_tweet (mocked)
20. test_scraper_search_tweets (mocked)
21. test_scraper_require_auth_for_write
22. test_scraper_sync_api
23. test_scraper_context_manager

tests/test_pagination.py:
24. test_async_cursor_basic
25. test_async_cursor_max_items
26. test_async_cursor_empty_page
27. test_async_cursor_collect

tests/test_errors.py:
28. test_rate_limit_error
29. test_authentication_error
30. test_twitter_api_error_mapping

Use pytest-asyncio for async tests.
All fixtures use real Twitter GraphQL response shapes (same as Node.js fixtures).
No mocking of model parsing — test against real response structures.
```

### Prompt 14: Python Package Integration with Node.js

```
Update the root package.json to reference the Python SDK:

Add to the exports:
  "./python": "./src/python/"

Add npm scripts:
  "python:install": "cd src/python && pip install -e '.[dev]'",
  "python:test": "cd src/python && pytest -v",
  "python:lint": "cd src/python && ruff check .",
  "python:build": "cd src/python && python -m build"

Update the root README.md (or create a section) mentioning:
- Python SDK installation: pip install xactions (from PyPI) or pip install -e ./src/python
- Quick example showing Python usage
- Link to src/python/README.md for full docs

Create a GitHub Actions workflow for Python testing:
.github/workflows/python-tests.yml:
  - Run on push to main and PRs
  - Matrix: Python 3.9, 3.10, 3.11, 3.12, 3.13
  - Steps: install, lint (ruff), test (pytest)

Integration README section:
  The Python SDK is a pure-Python reimplementation of the XActions Scraper class.
  It uses the same Twitter GraphQL endpoints and authentication flow as the Node.js version.
  Feature parity is tracked in the comparison table.
```

### Prompt 15: Python CLI Tool

```
Create a Python CLI entry point.

Add to src/python/pyproject.toml:
[project.scripts]
xactions-py = "xactions.cli:main"

Create src/python/xactions/cli.py:

import argparse
import sys
import json
from .client import Scraper

def main():
    parser = argparse.ArgumentParser(description="XActions Python CLI")
    subparsers = parser.add_subparsers(dest="command")

    # Login
    login_parser = subparsers.add_parser("login", help="Login to Twitter")
    login_parser.add_argument("-u", "--username", required=True)
    login_parser.add_argument("-p", "--password", required=True)
    login_parser.add_argument("-e", "--email")

    # Profile
    profile_parser = subparsers.add_parser("profile", help="Get user profile")
    profile_parser.add_argument("username")
    profile_parser.add_argument("--json", action="store_true")

    # Tweet
    tweet_parser = subparsers.add_parser("tweet", help="Get a tweet")
    tweet_parser.add_argument("tweet_id")

    # Search
    search_parser = subparsers.add_parser("search", help="Search tweets")
    search_parser.add_argument("query")
    search_parser.add_argument("-n", "--count", type=int, default=20)
    search_parser.add_argument("--mode", default="Latest", choices=["Top", "Latest", "Photos", "Videos"])

    # Post
    post_parser = subparsers.add_parser("post", help="Post a tweet")
    post_parser.add_argument("text")

    # Followers
    followers_parser = subparsers.add_parser("followers", help="Get followers")
    followers_parser.add_argument("username")
    followers_parser.add_argument("-n", "--count", type=int, default=100)

    # Trends
    subparsers.add_parser("trends", help="Get trending topics")

    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)

    scraper = Scraper()
    
    # Try loading saved cookies
    try:
        scraper.load_cookies()
    except:
        pass

    if args.command == "login":
        scraper.login(username=args.username, password=args.password, email=args.email)
        scraper.save_cookies()
        print(f"✅ Logged in as @{args.username}")

    elif args.command == "profile":
        profile = scraper.get_profile(args.username)
        if args.json:
            print(json.dumps(profile.to_dict(), indent=2, default=str))
        else:
            print(f"👤 {profile.name} (@{profile.username})")
            print(f"📝 {profile.bio}")
            print(f"📊 {profile.followers_count:,} followers · {profile.following_count:,} following · {profile.tweet_count:,} tweets")

    elif args.command == "tweet":
        tweet = scraper.get_tweet(args.tweet_id)
        print(f"🐦 @{tweet.username}: {tweet.text}")
        print(f"❤️ {tweet.likes} · 🔁 {tweet.retweets} · 💬 {tweet.replies}")

    elif args.command == "search":
        tweets = scraper.search_tweets(args.query, count=args.count, mode=args.mode)
        for tweet in tweets:
            print(f"@{tweet.username}: {tweet.text[:100]}")
            print(f"  ❤️ {tweet.likes} · 🔁 {tweet.retweets}")
            print()

    elif args.command == "post":
        if not scraper.is_logged_in():
            print("❌ Not logged in. Run: xactions-py login -u <username> -p <password>")
            sys.exit(1)
        tweet = scraper.send_tweet(args.text)
        print(f"✅ Tweet posted: https://x.com/i/status/{tweet.id}")

    elif args.command == "followers":
        followers = scraper.get_followers(args.username, count=args.count)
        for f in followers:
            print(f"@{f.username} — {f.followers_count:,} followers — {f.bio[:60]}")

    elif args.command == "trends":
        trends = scraper.get_trends()
        for i, trend in enumerate(trends, 1):
            print(f"{i:2}. {trend}")

if __name__ == "__main__":
    main()

Clean CLI with emoji output. Handle errors gracefully.
```

---

## Validation

After all 15 prompts are complete, verify:

```bash
# Python package installs
cd src/python && pip install -e ".[dev]"

# Imports work
python -c "from xactions import Scraper, Tweet, Profile; print('✅ Python SDK loads')"

# Models work
python -c "
from xactions.models import Tweet, Profile
t = Tweet(id='123', text='hello', likes=42)
print(f'✅ Tweet: {t.text} — {t.likes} likes')
p = Profile(username='test', followers_count=1000)
print(f'✅ Profile: @{p.username} — {p.followers_count} followers')
"

# Auth works
python -c "
from xactions.auth import CookieAuth
auth = CookieAuth(cookies='auth_token=test; ct0=csrf')
print(f'✅ Authenticated: {auth.is_authenticated()}')
print(f'✅ Auth token: {auth.get_auth_token()}')
"

# Scraper instantiation
python -c "
from xactions import Scraper
s = Scraper()
print(f'✅ Scraper created, logged in: {s.is_logged_in()}')
"

# Tests pass
cd src/python && pytest -v

# CLI works
xactions-py --help

# Lint clean
cd src/python && ruff check .
```

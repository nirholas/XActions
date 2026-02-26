# Track 09 — Python SDK

> Python is the dominant language in the scraping ecosystem (twikit: 4,060★, bisguzar/twitter-scraper: 4,003★). XActions needs a first-class Python package to capture this market. Target: PyPI package `xactions` with async-first design, Pydantic models, and feature parity with the Node.js Scraper class.

---

## Research Before Starting

```
src/client/                     — Node.js Scraper class (source of truth for feature parity)
src/client/models/              — Tweet.js, Profile.js, Media.js models
src/client/auth/                — CookieJar.js, CookieAuth.js patterns
src/client/api/                 — Endpoints, parsers, query IDs
src/client/http/                — RateLimiter, RetryHandler patterns
```

Study competitors for Python API patterns:
- twikit (https://github.com/d60/twikit) — async client, login flow, Cookie auth
- bisguzar/twitter-scraper — sync client, simpler API
- tweepy — OAuth patterns, Pydantic-style response objects

---

## Prompts

### Prompt 1: Project Scaffold and Build System

```
Create python/ directory at the repository root with a complete modern Python project scaffold.

Create python/pyproject.toml:
- Build system: hatchling
- Name: "xactions"
- Version: "0.1.0"
- Description: "X/Twitter automation toolkit — scrape, post, search, analytics. No API fees."
- Requires-python: ">=3.9"
- Dependencies: httpx>=0.27, pydantic>=2.0, cryptography>=42.0
- Optional dependencies:
  - dev: pytest>=8.0, pytest-asyncio>=0.24, pytest-cov, ruff>=0.5, mypy>=1.11
  - cli: click>=8.1, rich>=13.0
- License: MIT
- Authors: [{ name = "nichxbt" }]
- URLs: { Homepage = "https://github.com/nirholas/XActions", Documentation = "https://xactions.dev/docs" }
- Scripts: { xactions = "xactions.cli:main" } (in [project.scripts])

Create python/src/xactions/__init__.py — empty for now (Prompt 10 fills it)
Create python/src/xactions/py.typed — empty marker file
Create python/README.md — placeholder referencing main repo
Create python/.gitignore — __pycache__, *.pyc, dist/, .venv/, .mypy_cache/, .ruff_cache/, .pytest_cache/, htmlcov/
Create python/ruff.toml — target-version="py39", line-length=100, select=["E","F","I","N","UP","B","SIM","TCH"]
Create python/Makefile:
  - lint: ruff check src/ tests/
  - format: ruff format src/ tests/
  - test: pytest tests/ -v
  - coverage: pytest --cov=xactions --cov-report=html tests/
  - typecheck: mypy src/
  - build: python -m build
  - clean: rm -rf dist/ build/ *.egg-info

Ensure src layout (python/src/xactions/) so imports are `from xactions import Scraper`.
```

### Prompt 2: Constants File

```
Create python/src/xactions/constants.py:

All Twitter API constants needed by the SDK:

1. BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs..."
   (The full public bearer token — same as Node.js client)

2. BASE_URL = "https://x.com"
3. API_BASE = "https://x.com/i/api"
4. GRAPHQL_BASE = "https://x.com/i/api/graphql"

5. GRAPHQL_ENDPOINTS: dict[str, str] mapping endpoint names to paths:
   - USER_BY_SCREEN_NAME: full path with query ID
   - USER_TWEETS, USER_TWEETS_AND_REPLIES, USER_MEDIA
   - TWEET_DETAIL, TWEET_RESULT_BY_REST_ID
   - FOLLOWERS, FOLLOWING, BLUE_VERIFIED_FOLLOWERS
   - SEARCH_TIMELINE
   - FAVORITES (liked tweets)
   - CREATE_TWEET, DELETE_TWEET
   - FAVORITE_TWEET, UNFAVORITE_TWEET
   - CREATE_RETWEET, DELETE_RETWEET
   - FOLLOW_USER, UNFOLLOW_USER
   - LIST_LATEST_TWEETS_TIMELINE

6. DEFAULT_FEATURES: dict — the large features dict Twitter sends with every GraphQL request
   (Copy exact features from Node.js src/client/api/endpoints.js)

7. DEFAULT_HEADERS: dict — standard browser-like headers:
   - User-Agent (Chrome 120+ on Windows)
   - Accept, Accept-Language, Accept-Encoding
   - Sec-Ch-Ua headers
   - x-twitter-active-user: "yes"
   - x-twitter-client-language: "en"

8. RATE_LIMITS: dict mapping endpoint names to (requests, window_seconds)

Include type hints for everything. Use Final from typing for constants.
```

### Prompt 3: Error Classes

```
Create python/src/xactions/errors.py:

Exception hierarchy:

class XActionsError(Exception):
    """Base exception for all XActions errors."""
    def __init__(self, message: str, *, code: str | None = None, endpoint: str | None = None):
        ...

class AuthenticationError(XActionsError):
    """Raised when authentication fails or is required."""
    pass

class RateLimitError(XActionsError):
    """Raised when Twitter rate limit is hit."""
    def __init__(self, message: str, *, retry_after: float | None = None, 
                 reset_at: datetime | None = None, endpoint: str | None = None):
        ...

class NotFoundError(XActionsError):
    """Raised when a user/tweet/resource doesn't exist."""
    pass

class TwitterAPIError(XActionsError):
    """Raised when Twitter returns an error response."""
    def __init__(self, message: str, *, twitter_code: int | None = None,
                 http_status: int | None = None, endpoint: str | None = None):
        ...

class SuspendedError(NotFoundError):
    """Raised when a user account is suspended."""
    pass

class ProtectedError(XActionsError):
    """Raised when trying to access a protected account's data without following."""
    pass

Utility function:
def detect_twitter_error(response_data: dict, http_status: int, endpoint: str) -> XActionsError | None:
    """Inspect a Twitter response and return the appropriate error, or None if OK."""
    Maps: code 88 → RateLimitError, 34 → NotFoundError, 326 → AuthenticationError,
    63 → SuspendedError, 179 → ProtectedError
    Also handles GraphQL errors array format.

All exceptions should have __repr__ for debugging.
```

### Prompt 4: Pydantic Models (Profile, Tweet, Media)

```
Create python/src/xactions/models.py:

Pydantic v2 models with from_graphql() class methods:

class Media(BaseModel):
    type: Literal["photo", "video", "animated_gif"]
    url: str
    preview_url: str | None = None
    width: int | None = None
    height: int | None = None
    duration_ms: int | None = None  # video only
    alt_text: str | None = None

class Poll(BaseModel):
    options: list[PollOption]
    total_votes: int
    end_datetime: datetime | None = None

class PollOption(BaseModel):
    label: str
    votes: int

class Tweet(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    id: str
    text: str
    created_at: datetime
    user_id: str
    username: str
    name: str
    likes: int = Field(alias="favorite_count", default=0)
    retweets: int = Field(alias="retweet_count", default=0)
    replies: int = Field(alias="reply_count", default=0)
    views: int = 0
    bookmarks: int = Field(alias="bookmark_count", default=0)
    is_retweet: bool = False
    is_quote: bool = False
    is_reply: bool = False
    in_reply_to_status_id: str | None = None
    quoted_status: "Tweet | None" = None
    retweeted_status: "Tweet | None" = None
    media: list[Media] = []
    hashtags: list[str] = []
    mentions: list[str] = []
    urls: list[str] = []
    poll: Poll | None = None
    language: str | None = None
    source: str | None = None
    raw: dict = Field(default_factory=dict, exclude=True)

    @classmethod
    def from_graphql(cls, data: dict) -> "Tweet | None":
        """Parse a tweet from Twitter's GraphQL response.
        Handle TweetWithVisibilityResults wrapper.
        Return None for tombstones/unavailable tweets."""
        ...

class Profile(BaseModel):
    id: str
    username: str
    name: str
    bio: str = ""
    location: str = ""
    website: str = ""
    joined: datetime | None = None
    followers_count: int = 0
    following_count: int = 0
    tweet_count: int = 0
    listed_count: int = 0
    is_verified: bool = False
    is_blue_verified: bool = False
    is_protected: bool = False
    profile_image_url: str = ""
    banner_url: str = ""
    pinned_tweet_id: str | None = None
    raw: dict = Field(default_factory=dict, exclude=True)
    
    @classmethod
    def from_graphql(cls, data: dict) -> "Profile | None":
        """Parse from UserByScreenName GraphQL response."""
        ...

All from_graphql methods must handle the real nested Twitter response paths:
- data.user.result.legacy for Profile
- data.tweetResult.result.legacy for Tweet (or data.tweet_results.result...)
- Handle __typename checks for UserUnavailable, TweetTombstone
```

### Prompt 5: HTTP Client with httpx

```
Create python/src/xactions/http.py:

Async HTTP client wrapping httpx with Twitter-specific logic.

class HttpClient:
    def __init__(
        self,
        *,
        proxy: str | None = None,
        timeout: float = 30.0,
        max_retries: int = 3,
    ):
        self._client: httpx.AsyncClient  — created in __aenter__
        self._guest_token: str | None = None
        self._csrf_token: str | None = None
        self._cookies: dict[str, str] = {}
        self._rate_limits: dict[str, RateLimitInfo] = {}
        self._proxy = proxy
        self._timeout = timeout
        self._max_retries = max_retries

    async def __aenter__(self) -> "HttpClient": ...
    async def __aexit__(self, *args) -> None: ...

    async def _activate_guest_token(self) -> str:
        """POST https://api.x.com/1.1/guest/activate.json → guest_token"""
        ...
    
    async def _ensure_guest_token(self) -> None:
        """Activate guest token if not set."""
        ...

    def _build_headers(self, authenticated: bool = False) -> dict:
        """Merge default headers + auth headers + CSRF."""
        ...

    async def get(self, url: str, *, params: dict | None = None, authenticated: bool = False) -> dict:
        """GET with retry logic, rate limit tracking, error detection."""
        ...

    async def post(self, url: str, *, json: dict | None = None, authenticated: bool = False) -> dict:
        """POST with retry and error handling."""
        ...

    async def graphql(self, endpoint: str, variables: dict, *, authenticated: bool = False) -> dict:
        """Build GraphQL GET request with features and variables query params."""
        url = f"{GRAPHQL_BASE}/{endpoint}"
        params = {
            "variables": json.dumps(variables),
            "features": json.dumps(DEFAULT_FEATURES),
        }
        return await self.get(url, params=params, authenticated=authenticated)

    async def graphql_mutate(self, endpoint: str, variables: dict) -> dict:
        """POST GraphQL mutation (always authenticated)."""
        ...

    def _update_rate_limits(self, endpoint: str, headers: httpx.Headers) -> None:
        """Parse x-rate-limit-* headers and update tracking."""
        ...

    async def _handle_rate_limit(self, endpoint: str) -> None:
        """Wait until rate limit resets (adaptive backoff)."""
        ...

Rate limit tracking via dataclass:
@dataclass
class RateLimitInfo:
    limit: int
    remaining: int
    reset: datetime
```

### Prompt 6: Cookie Authentication

```
Create python/src/xactions/auth.py:

class CookieAuth:
    """Authenticate using browser cookies (same pattern as Node.js CookieJar)."""
    
    def __init__(self):
        self._cookies: dict[str, str] = {}
        self._user_id: str | None = None
        self._username: str | None = None
        self._is_authenticated: bool = False
    
    @property
    def is_authenticated(self) -> bool: ...
    
    @property
    def user_id(self) -> str | None: ...
    
    def load_cookies(self, cookies: dict[str, str]) -> None:
        """Load cookies from a dict. Requires at minimum: auth_token, ct0."""
        Validate required cookies present.
        Extract user_id from twid cookie.
        Set self._csrf_token from ct0.
        ...

    def load_cookies_from_string(self, cookie_string: str) -> None:
        """Parse 'name1=value1; name2=value2' format."""
        ...

    @classmethod
    def from_file(cls, path: str | Path, password: str | None = None) -> "CookieAuth":
        """Load cookies from JSON file. Optional decryption."""
        ...

    def save_to_file(self, path: str | Path, password: str | None = None) -> None:
        """Save cookies to JSON file. Optional encryption with Fernet."""
        ...

    def get_cookies(self) -> dict[str, str]:
        """Return cookie dict for httpx client."""
        ...

    def get_headers(self) -> dict[str, str]:
        """Return auth headers: Cookie string + x-csrf-token."""
        ...

class CredentialAuth(CookieAuth):
    """Authenticate using username/password via Twitter's login flow."""
    
    async def login(self, username: str, password: str, *, email: str | None = None,
                    http_client: "HttpClient | None" = None) -> None:
        """Execute multi-step login flow (flow_token based):
        1. POST task.json with flow_name=login
        2. Submit username (LoginJsInstrumentationSubtask)
        3. Submit password (LoginEnterPassword)
        4. Handle verification challenge if needed (email)
        5. Extract cookies from response
        """
        ...

    async def _submit_flow_step(self, flow_token: str, subtask_id: str, 
                                 payload: dict, http: "HttpClient") -> dict:
        """Submit one step of the login flow."""
        ...
```

### Prompt 7: Main Scraper Class

```
Create python/src/xactions/scraper.py:

The main async Scraper class — primary public interface.

class Scraper:
    """
    XActions Twitter Scraper — no API key required.
    
    Usage:
        async with Scraper() as scraper:
            profile = await scraper.get_profile("elonmusk")
            async for tweet in scraper.get_tweets("elonmusk", count=100):
                print(tweet.text)
    """
    
    def __init__(
        self,
        *,
        auth: CookieAuth | None = None,
        cookies: dict[str, str] | None = None,
        cookie_file: str | Path | None = None,
        proxy: str | None = None,
        timeout: float = 30.0,
        max_retries: int = 3,
        delay: float = 1.5,
    ): ...

    async def __aenter__(self) -> "Scraper": ...
    async def __aexit__(self, *args) -> None: ...
    
    # --- Read operations (work in guest mode) ---
    async def get_profile(self, username: str) -> Profile: ...
    async def get_tweet(self, tweet_id: str) -> Tweet: ...
    async def get_tweets(self, username: str, *, count: int = 20) -> AsyncGenerator[Tweet, None]: ...
    async def get_latest_tweet(self, username: str) -> Tweet | None: ...
    async def get_replies(self, username: str, *, count: int = 20) -> AsyncGenerator[Tweet, None]: ...
    async def get_media_tweets(self, username: str, *, count: int = 20) -> AsyncGenerator[Tweet, None]: ...
    async def get_liked_tweets(self, username: str, *, count: int = 20) -> AsyncGenerator[Tweet, None]: ...
    async def get_followers(self, username: str, *, count: int = 100) -> AsyncGenerator[Profile, None]: ...
    async def get_following(self, username: str, *, count: int = 100) -> AsyncGenerator[Profile, None]: ...
    async def search_tweets(self, query: str, *, count: int = 50, mode: str = "Latest") -> AsyncGenerator[Tweet, None]: ...
    async def get_trends(self) -> list[str]: ...
    async def get_list_tweets(self, list_id: str, *, count: int = 50) -> AsyncGenerator[Tweet, None]: ...

    # --- Write operations (require auth) ---
    async def send_tweet(self, text: str, *, reply_to: str | None = None, 
                          media_ids: list[str] | None = None) -> Tweet: ...
    async def like(self, tweet_id: str) -> bool: ...
    async def unlike(self, tweet_id: str) -> bool: ...
    async def retweet(self, tweet_id: str) -> bool: ...
    async def unretweet(self, tweet_id: str) -> bool: ...
    async def follow(self, username: str) -> bool: ...
    async def unfollow(self, username: str) -> bool: ...
    async def delete_tweet(self, tweet_id: str) -> bool: ...

    # --- Account ---
    async def me(self) -> Profile: ...
    @property
    def is_authenticated(self) -> bool: ...
    
    # --- Login ---
    async def login(self, username: str, password: str, *, email: str | None = None) -> None:
        """Login with credentials (creates CredentialAuth internally)."""
        ...
    async def login_with_cookies(self, cookies: dict[str, str]) -> None: ...

    # --- Internals ---
    async def _resolve_user_id(self, username: str) -> str:
        """Resolve username → user ID (cached)."""
        ...
    def _require_auth(self) -> None:
        """Raise AuthenticationError if not logged in."""
        ...

All generator methods must:
- Honor count parameter (stop after yielding that many items)
- Include delay between pages
- Handle rate limits with automatic retry
- Log progress if verbose mode enabled
```

### Prompt 8: Async Generator Pagination

```
Create python/src/xactions/pagination.py:

Reusable async pagination utilities.

class Paginator(Generic[T]):
    """Async paginator for Twitter's cursor-based endpoints."""
    
    def __init__(
        self,
        http: HttpClient,
        endpoint: str,
        variables: dict,
        parser: Callable[[dict], tuple[list[T], str | None]],
        *,
        count: int | None = None,
        delay: float = 1.5,
        authenticated: bool = False,
    ): ...
    
    def __aiter__(self) -> AsyncIterator[T]: ...
    
    async def __anext__(self) -> T:
        """Yield items one at a time, fetching new pages as needed."""
        ...
    
    async def collect(self, max_items: int | None = None) -> list[T]:
        """Collect all results into a list."""
        ...

    async def first(self) -> T | None:
        """Return first result or None."""
        ...

def parse_timeline_entries(data: dict) -> tuple[list[dict], str | None]:
    """Extract entries + cursor from timeline instructions."""
    Navigate data.*.timeline.instructions, find TimelineAddEntries,
    extract entries, find cursor-bottom value.
    ...

def parse_user_entries(data: dict) -> tuple[list[dict], str | None]:
    """Extract user entries + cursor from followers/following response."""
    ...

def parse_search_entries(data: dict) -> tuple[list[dict], str | None]:
    """Extract search result entries + cursor."""
    ...

Each parse function returns (raw_entries, next_cursor).
The Paginator feeds entries through the model's from_graphql class method.

Include:
- Automatic page delay (configurable)
- Rate limit handling (catch RateLimitError, wait, retry)
- Progress callback support: on_page(page_num, items_so_far, total_so_far)
```

### Prompt 9: Package __init__.py — Public API

```
Create python/src/xactions/__init__.py:

Clean public API that users import from:

from xactions import Scraper
from xactions import Tweet, Profile, Media, Poll
from xactions import CookieAuth, CredentialAuth
from xactions import (
    XActionsError,
    AuthenticationError,
    RateLimitError,
    NotFoundError,
    TwitterAPIError,
    SuspendedError,
    ProtectedError,
)

__version__ = "0.1.0"
__author__ = "nichxbt"

__all__ = [
    "Scraper",
    "Tweet", "Profile", "Media", "Poll",
    "CookieAuth", "CredentialAuth",
    "XActionsError", "AuthenticationError", "RateLimitError",
    "NotFoundError", "TwitterAPIError", "SuspendedError", "ProtectedError",
    "__version__",
]

# Convenience re-export for quick usage
__doc__ = """
XActions Python SDK — X/Twitter automation without API fees.

Quick start:
    import asyncio
    from xactions import Scraper

    async def main():
        async with Scraper() as scraper:
            profile = await scraper.get_profile("elonmusk")
            print(f"{profile.name}: {profile.followers_count} followers")
    
    asyncio.run(main())
"""
```

### Prompt 10: Synchronous Wrapper

```
Create python/src/xactions/sync.py:

Synchronous wrapper for users who don't want to deal with async/await.

class SyncScraper:
    """
    Synchronous wrapper around the async Scraper.
    
    Usage:
        with SyncScraper() as scraper:
            profile = scraper.get_profile("elonmusk")
            for tweet in scraper.get_tweets("elonmusk", count=10):
                print(tweet.text)
    """
    
    def __init__(self, **kwargs):
        self._scraper = Scraper(**kwargs)
        self._loop: asyncio.AbstractEventLoop | None = None
    
    def __enter__(self) -> "SyncScraper": 
        # Create event loop, run __aenter__
        ...
    
    def __exit__(self, *args) -> None:
        # Run __aexit__, close loop
        ...
    
    # Sync versions of all read methods
    def get_profile(self, username: str) -> Profile:
        return self._run(self._scraper.get_profile(username))
    
    def get_tweets(self, username: str, *, count: int = 20) -> list[Tweet]:
        return self._run(self._collect(self._scraper.get_tweets(username, count=count)))
    
    # ... all other methods wrapped similarly
    
    def _run(self, coro):
        return self._loop.run_until_complete(coro)
    
    async def _collect(self, agen) -> list:
        return [item async for item in agen]

Update __init__.py to also export SyncScraper:
from xactions import SyncScraper

Usage pattern:
    from xactions import SyncScraper
    with SyncScraper() as s:
        profile = s.get_profile("x")
```

### Prompt 11: Test Suite

```
Create python/tests/ with comprehensive pytest test suite.

python/tests/conftest.py:
- Fixtures: mock_http_client, sample_profile_data, sample_tweet_data
- Load JSON test fixtures from python/tests/fixtures/

python/tests/fixtures/:
- Copy same Twitter GraphQL response fixtures from tests/fixtures/graphql-responses/

python/tests/test_models.py (12 tests):
- Profile.from_graphql parses all fields correctly
- Tweet.from_graphql parses tweet, retweet, quote, reply, media, poll
- Models handle None/missing fields gracefully
- Media model validates types
- Poll calculations correct

python/tests/test_auth.py (8 tests):
- CookieAuth.load_cookies validates required cookies
- Cookie string parsing works
- File save/load round-trip
- Encrypted save/load
- CredentialAuth flow steps

python/tests/test_scraper.py (10 tests):
- get_profile returns Profile
- get_tweet returns Tweet
- get_tweets pagination 
- search_tweets works
- Write operations require auth
- Error handling (not found, rate limit)

python/tests/test_errors.py (6 tests):
- Error hierarchy isinstance checks
- detect_twitter_error maps codes correctly
- Error repr includes useful info

python/tests/test_pagination.py (5 tests):
- Paginator yields items across pages
- Cursor extraction works
- Count limit honored
- Empty results handled

All tests use pytest-asyncio for async tests.
Mark integration tests with @pytest.mark.integration.
```

### Prompt 12: CLI with Click

```
Create python/src/xactions/cli.py:

Full CLI using Click + Rich for beautiful terminal output.

@click.group()
@click.version_option(__version__)
@click.option("--cookies", type=click.Path(), help="Path to cookie file")
@click.option("--proxy", help="HTTP proxy URL")
@click.option("--verbose", "-v", is_flag=True)
@click.pass_context
def main(ctx, cookies, proxy, verbose): ...

@main.command()
@click.argument("username")
@click.pass_context
async def profile(ctx, username):
    """Get a user's profile."""
    async with _create_scraper(ctx) as scraper:
        p = await scraper.get_profile(username)
        _print_profile(p)

@main.command()
@click.argument("tweet_id")
async def tweet(ctx, tweet_id):
    """Get a specific tweet."""
    ...

@main.command()
@click.argument("username")
@click.option("--count", "-n", default=20)
async def tweets(ctx, username, count):
    """Get a user's tweets."""
    ...

@main.command()
@click.argument("query")
@click.option("--count", "-n", default=20)
@click.option("--mode", type=click.Choice(["Latest", "Top", "People", "Media"]), default="Latest")
async def search(ctx, query, count, mode):
    """Search tweets."""
    ...

@main.command()
async def trends(ctx):
    """Get trending topics."""
    ...

@main.command()
@click.argument("username")
@click.option("--count", "-n", default=100)
async def followers(ctx, username, count):
    """Get followers."""
    ...

@main.command()
@click.argument("text")
@click.option("--reply-to", help="Tweet ID to reply to")
async def post(ctx, text, reply_to):
    """Post a tweet."""
    ...

@main.command()
@click.argument("username")
@click.argument("password")
@click.option("--email", help="Email for verification challenges")
async def login(ctx, username, password, email):
    """Login with credentials."""
    ...

Helper functions:
- _create_scraper(ctx) → Scraper with cookies/proxy from context
- _print_profile(profile) → Rich formatted profile card
- _print_tweet(tweet) → Rich formatted tweet
- _print_table(items, columns) → Rich table

Use asyncclick or nest_asyncio for async Click commands.
```

### Prompt 13: README with Examples

```
Create python/README.md:

Full README for the Python SDK (will also be the PyPI page).

# XActions Python SDK

> X/Twitter scraping and automation for Python. No API key required.

## Installation
    pip install xactions

## Quick Start (async)
    import asyncio
    from xactions import Scraper

    async def main():
        async with Scraper() as scraper:
            # Get a profile
            profile = await scraper.get_profile("elonmusk")
            print(f"{profile.name}: {profile.followers_count:,} followers")
            
            # Get tweets
            async for tweet in scraper.get_tweets("elonmusk", count=5):
                print(f"  {tweet.text[:80]}...")
            
            # Search
            async for tweet in scraper.search_tweets("python", count=10):
                print(tweet.text)

    asyncio.run(main())

## Quick Start (sync)
    from xactions import SyncScraper
    
    with SyncScraper() as scraper:
        profile = scraper.get_profile("x")
        print(profile.followers_count)

## Authentication
    # With cookies
    scraper = Scraper(cookies={"auth_token": "...", "ct0": "..."})
    
    # With cookie file
    scraper = Scraper(cookie_file="cookies.json")
    
    # With login
    async with Scraper() as scraper:
        await scraper.login("username", "password", email="email@example.com")

## CLI
    xactions profile elonmusk
    xactions tweets elonmusk --count 10
    xactions search "python" --mode Latest
    xactions trends
    xactions post "Hello from XActions!"

## API Reference
Document every public method on Scraper, CookieAuth, Tweet, Profile.

## Node.js Version
Link to main XActions repo for the Node.js version with MCP server and browser scripts.

Include badges: PyPI version, Python versions, License, Downloads.
```

### Prompt 14: CI/CD and PyPI Publishing

```
Create .github/workflows/python-test.yml:

name: Python SDK Tests
on:
  push:
    paths: ['python/**']
  pull_request:
    paths: ['python/**']

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.9", "3.10", "3.11", "3.12", "3.13"]
    defaults:
      run:
        working-directory: python
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install -e ".[dev,cli]"
      - run: ruff check src/ tests/
      - run: pytest tests/ -v --cov=xactions --cov-report=xml
      - uses: codecov/codecov-action@v4
        if: matrix.python-version == '3.12'

  publish:
    needs: test
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/python-v')
    defaults:
      run:
        working-directory: python
    permissions:
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install build
      - run: python -m build
      - uses: pypa/gh-action-pypi-publish@release/v1
        with:
          packages-dir: python/dist/

Tag format: python-v0.1.0 triggers publish.
Trusted publisher (no API token needed).
```

### Prompt 15: Example Scripts

```
Create python/examples/ with 5 complete, runnable example scripts:

1. python/examples/get_profile.py
   Fetch and display a profile with Rich formatting.
   Accept username from command line args.

2. python/examples/search_and_export.py
   Search tweets by query, export to CSV with columns:
   id, username, text, likes, retweets, created_at, url

3. python/examples/follower_analysis.py
   For a given username, fetch followers (up to 500),
   compute: avg followers, avg following, median tweet count, 
   percentage verified, top 10 most-followed followers.
   Display with Rich tables.

4. python/examples/monitor_mentions.py
   Poll every 60 seconds for new mentions of a keyword.
   Print new tweets not seen before (use a set of seen IDs).
   Run until Ctrl+C.

5. python/examples/authenticated_actions.py
   Login, post a tweet, like a tweet, follow a user, get own profile.
   Demonstrates full authenticated workflow.

Each script:
- Has #!/usr/bin/env python3 shebang
- Has docstring explaining what it does
- Uses argparse or sys.argv for inputs
- Has if __name__ == "__main__": main()
- Is fully runnable, no placeholders
```

---

## Validation

```bash
cd python
pip install -e ".[dev,cli]"
ruff check src/ tests/
pytest tests/ -v
mypy src/
xactions --help
xactions profile x
python examples/get_profile.py x
```

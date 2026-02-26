# Track 09 — Python SDK

> Build a Python SDK that wraps XActions' Node.js Scraper class, giving Python developers the same ergonomic API that twikit (4k stars, Python-native) offers. Python is the #1 language for data science, AI agents, and automation — this track makes XActions accessible to that ecosystem. The Python SDK communicates with the Node.js library via a local subprocess bridge or can be used standalone with pure-Python HTTP requests.

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
- d60/twikit — Python, Client class, async/await, cookie persistence, full Twitter API
- bisguzar/twitter-scraper — Python, synchronous, simpler API
- snscrape — Python, CLI-first, scraping-focused

### Approach

Two implementation modes:
1. **Pure Python** (recommended) — Native Python HTTP client using httpx/aiohttp, reimplements the Twitter GraphQL API calls directly in Python. No Node.js dependency.
2. **Bridge mode** (optional) — Spawns node subprocess, communicates via JSON-RPC. Uses the full Node.js implementation. Useful for feature parity.

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
    __init__.py          <- Package root, version, top-level imports
    client.py            <- Scraper class (main entry point)
    auth.py              <- CookieAuth, CredentialAuth, GuestAuth
    http.py              <- HTTP client with rate limiting and TLS
    models.py            <- Tweet, Profile, Space, Message dataclasses
    api/
      __init__.py
      tweets.py          <- Tweet CRUD operations
      users.py           <- User operations
      search.py          <- Search operations
      trends.py          <- Trends operations
      media.py           <- Media upload
      graphql.py         <- GraphQL endpoint registry and query builder
    pagination.py        <- AsyncGenerator pagination utilities
    errors.py            <- Error classes (ScraperError, RateLimitError, etc.)
    constants.py         <- Bearer token, default features, API URLs
    utils.py             <- Helpers (random delay, cookie parsing, etc.)
    bridge.py            <- Optional Node.js subprocess bridge
    types.py             <- Type aliases and TypedDict definitions
    cli.py               <- Python CLI entry point
  tests/
    __init__.py
    test_client.py
    test_auth.py
    test_models.py
    test_api.py
    conftest.py          <- Shared fixtures
  pyproject.toml         <- Python package metadata (PEP 621)
  setup.py               <- Backward-compatible setup
  README.md              <- Python SDK documentation
```

---

## Prompts

### Prompt 1: Python Package Setup

Create the Python package structure with proper packaging files.

Create src/python/pyproject.toml with:
- PEP 621 metadata (name=xactions, version=1.0.0, requires-python>=3.9)
- Dependencies: httpx>=0.25.0, aiofiles>=23.0.0
- Optional deps: async (aiohttp), tls (curl-cffi), dev (pytest, pytest-asyncio, pytest-httpx, ruff)
- Tool config: ruff (line-length=120, target-version=py39), pytest (asyncio_mode=auto)
- Build system: setuptools>=68.0

Create src/python/xactions/__init__.py:
- Package docstring with usage example
- __version__ = "1.0.0", __author__ = "nich (@nichxbt)"
- Import and export: Scraper, Tweet, Profile, Space, Message, ScraperError, AuthenticationError, RateLimitError, NotFoundError, CookieAuth, CredentialAuth
- __all__ list

### Prompt 2: Python Constants and GraphQL Registry

Create src/python/xactions/constants.py.

Port the GraphQL endpoint registry from the Node.js version (src/client/api/graphqlQueries.js).

Include:
- BEARER_TOKEN (same as Node.js)
- BASE_URL = "https://x.com"
- API_BASE = "https://api.x.com"
- GRAPHQL_ENDPOINTS dict with query_id, operation_name, method for: UserByScreenName, UserTweets, TweetDetail, SearchTimeline, Followers, Following, Likes, CreateTweet, DeleteTweet, FavoriteTweet, UnfavoriteTweet, CreateRetweet, DeleteRetweet, CreateFollow, DestroyFollow, ListLatestTweetsTimeline
- DEFAULT_FEATURES dict (all boolean features from Node.js version)
- USER_AGENT string
- build_graphql_url() helper function

All query IDs must match the Node.js version exactly. Include a comment about periodic updates.

### Prompt 3: Python Error Classes

Create src/python/xactions/errors.py.

Mirror the Node.js error hierarchy:
- ScraperError(Exception) — base error with code, endpoint, http_status, rate_limit_reset
- AuthenticationError(ScraperError) — codes: AUTH_FAILED, AUTH_REQUIRED, ACCOUNT_SUSPENDED, ACCOUNT_LOCKED, EMAIL_REQUIRED, TWO_FACTOR_REQUIRED
- RateLimitError(ScraperError) — retry_after, limit, remaining, reset_at
- NotFoundError(ScraperError) — codes: USER_NOT_FOUND, TWEET_NOT_FOUND, LIST_NOT_FOUND
- TwitterApiError(ScraperError) — TWITTER_ERROR_MAP mapping Twitter error codes to exception types, from_response() classmethod

All exceptions use Python conventions. Include __repr__ for debugging.

### Prompt 4: Python Data Models

Create src/python/xactions/models.py.

Use Python dataclasses with from_graphql class methods, mirroring the Node.js models.

Tweet dataclass with fields: id, text, full_text, username, user_id, time_parsed, timestamp, hashtags, mentions, urls, photos, videos, thread, in_reply_to_status_id, in_reply_to_status, quoted_status_id, quoted_status, is_retweet, is_reply, is_quote, retweeted_status, likes, retweets, replies, views, bookmark_count, conversation_id, sensitive_content, poll, place.

from_graphql classmethod that:
- Handles TweetWithVisibilityResults wrapper
- Parses raw.legacy structure (full_text, favorite_count->likes, retweet_count->retweets, etc.)
- Parses entities (hashtags, mentions, urls, media)
- Separates photos from videos by media type
- Recursively parses quoted/retweeted tweets
- Parses dates with datetime.strptime
- Uses .get() everywhere for null safety

Profile dataclass with fields: id, username, name, bio, location, website, joined, followers_count, following_count, tweet_count, likes_count, listed_count, media_count, avatar, banner, verified, protected, is_blue_verified, is_government, is_business, can_dm, pinned_tweet_ids.

Space and Message dataclasses.

All models include to_dict(), __str__, __repr__ methods. Handle missing fields gracefully. Snake_case per Python conventions.

### Prompt 5: Python HTTP Client

Create src/python/xactions/http.py.

A Python HTTP client using httpx (async+sync) with rate limiting, retry, and optional TLS bypass via curl-cffi.

HttpClient class with:
- __init__: proxy, timeout, max_retries, use_tls_bypass options
- _get_async_client(): creates httpx.AsyncClient or curl_cffi.requests.AsyncSession
- _get_sync_client(): same but synchronous
- request(): async method with retry, rate limit handling, random delay
- request_sync(): synchronous wrapper
- graphql(): make GraphQL API request (build URL, handle GET vs POST, parse response)
- close(): cleanup
- _check_rate_limit(): raise RateLimitError if limit hit
- _update_rate_limit(): parse x-rate-limit-* headers
- random_delay(): static method, configurable min/max ms

Support both sync and async usage patterns. Full implementation with exponential backoff on 429 and 5xx.

### Prompt 6: Python Cookie Auth

Create src/python/xactions/auth.py.

Port the auth system from Node.js (Track 02).

CookieAuth class:
- Constructor accepts cookie_file_path and cookies (string, dict, or list)
- get_cookies(), get_cookie_string(), set_cookies()
- get_auth_token(), get_csrf_token(), get_user_id()
- is_authenticated()
- save_cookies() / load_cookies() with optional encryption
- get_headers() — returns Cookie and x-csrf-token headers

CredentialAuth(CookieAuth) class:
- login() async method implementing the full Twitter onboarding flow:
  1. Activate guest token
  2. Initiate login flow (flow_name=login)
  3. JS instrumentation callback
  4. Enter username (LoginEnterUserIdentifierSSO)
  5. Handle email challenge if triggered
  6. Enter password (LoginEnterPassword)
  7. Handle 2FA if triggered
  8. Account duplication check
  9. Extract cookies from responses
- login_sync() wrapper
- logout()
- _execute_subtask() helper

GuestAuth class:
- initialize() to get guest token
- is_authenticated() returns False
- is_guest_mode() returns True
- get_headers() with guest token

All auth flows mirror the Node.js implementation exactly. Use httpx for HTTP requests.

### Prompt 7: Python Tweet API

Create src/python/xactions/api/__init__.py and src/python/xactions/api/tweets.py.

Port tweet operations from Node.js (src/client/api/tweets.js).

Functions (all async):
- get_tweet(http, tweet_id) -> Tweet
- get_tweets(http, user_id, count=20) -> AsyncIterator[Tweet] (cursor pagination)
- send_tweet(http, text, reply_to=None, media_ids=None) -> Tweet
- delete_tweet(http, tweet_id) -> None
- like_tweet(http, tweet_id) -> None
- unlike_tweet(http, tweet_id) -> None
- retweet(http, tweet_id) -> None
- unretweet(http, tweet_id) -> None
- get_latest_tweet(http, user_id) -> Tweet | None

Helper functions:
- _navigate(obj, path) — safe dot-path navigation
- _parse_timeline_entries(response, path) -> tuple[list, str | None]
- _parse_tweet_entry(entry) -> Tweet | None

Full real implementation, no mocks. Same endpoint logic as Node.js.

### Prompt 8: Python User and Search API

Create src/python/xactions/api/users.py and src/python/xactions/api/search.py.

users.py functions:
- get_user_by_screen_name(http, username) -> Profile
- get_user_by_id(http, user_id) -> Profile
- get_followers(http, user_id, count=100) -> AsyncIterator[Profile]
- get_following(http, user_id, count=100) -> AsyncIterator[Profile]
- follow_user(http, user_id) -> None
- unfollow_user(http, user_id) -> None
- get_user_id_by_screen_name(http, username) -> str

search.py:
- SearchMode enum: TOP, LATEST, PHOTOS, VIDEOS, PEOPLE
- search_tweets(http, query, count=20, mode=SearchMode.LATEST) -> AsyncIterator[Tweet]
- search_profiles(http, query, count=20) -> AsyncIterator[Profile]

All are async generators with cursor-based pagination. Same parsing logic as Node.js.

### Prompt 9: Python Scraper Client Class

Create src/python/xactions/client.py.

The main entry point — equivalent to src/client/Scraper.js.

Scraper class with:
- Constructor: cookies, proxy, tls_bypass options
- Context manager support (__aenter__, __aexit__)
- Auth: login(), login_async(), logout(), is_logged_in(), save_cookies(), load_cookies()
- Profile: get_profile() / get_profile_async()
- Tweets: get_tweet() / get_tweet_async(), get_tweets() / get_tweets_async()
- Search: search_tweets() / search_tweets_async()
- Actions: send_tweet(), like(), follow(), unfollow(), unlike(), retweet(), unretweet(), delete_tweet()
- Followers: get_followers(), get_following()
- Internal: _resolve_user_id() with cache, _require_auth()

Every method has both sync and async variants. Sync API uses _run() helper with asyncio.run(). _collect() helper converts async iterator to list.

### Prompt 10: Python Pagination Utilities

Create src/python/xactions/pagination.py.

Port the AsyncCursor pattern from Node.js (Track 05).

AsyncCursor class implementing AsyncIterator[T]:
- __init__: fetch_page, parse_items, parse_cursor callables, max_items, delay_ms
- __aiter__ / __anext__
- _fetch_next_page(): fetch, parse items/cursor, handle exhaustion
- collect(max_items=None) -> list[T]
- take(n) -> list[T]

paginate_timeline() factory function creating AsyncCursor for timeline endpoints.

### Prompt 11: Node.js Bridge Mode (Optional)

Create src/python/xactions/bridge.py.

Optional mode that spawns a Node.js subprocess to use the full XActions Node.js library.

NodeBridge class:
- Constructor: node_path, xactions_path
- _find_xactions(): find XActions Node.js installation (npm global, local node_modules, env var)
- start(): spawn Node.js subprocess with JSON-RPC bridge script
- _generate_bridge_script(): inline Node.js script accepting commands on stdin
- call(method, params) -> Any: send JSON-RPC request, read response line
- stop(): terminate subprocess

Bridge script handles: login, getProfile, getTweet, searchTweets, getFollowers, sendTweet, etc.

### Prompt 12: Python SDK README

Create src/python/README.md with comprehensive documentation.

Sections:
- Installation (pip install xactions, with [tls], [async], [all] extras)
- Quick Start (login, get profile, get tweet, search, post, like, follow)
- Async Usage (async with context manager)
- Features list
- Full API Reference (every method with parameters and return types)
- Comparison table with twikit
- Examples: scraping followers, exporting to pandas DataFrame, using with LangChain/LlamaIndex, Jupyter notebook usage

### Prompt 13: Python Tests

Create src/python/tests/ with comprehensive test suite.

tests/conftest.py: shared fixtures, mock HTTP client, sample GraphQL responses (using pytest-httpx)

tests/test_models.py: 8 tests covering Tweet/Profile from_graphql parsing (basic, retweet, quote, media, null safety, to_dict roundtrip)

tests/test_auth.py: 7 tests (cookie set string/dict, is_authenticated, save/load, get_headers, credential login flow mocked, guest auth)

tests/test_client.py: 8 tests (init, init with cookies, get_profile, get_tweet, search_tweets, require_auth, sync_api, context_manager)

tests/test_pagination.py: 4 tests (basic, max_items, empty_page, collect)

tests/test_errors.py: 3 tests (rate_limit, authentication, twitter_api_error_mapping)

30 total tests. Use pytest-asyncio for async. All fixtures use real Twitter GraphQL response shapes.

### Prompt 14: Python Package Integration with Node.js

Update root package.json:
- Add exports: "./python": "./src/python/"
- Add scripts: python:install, python:test, python:lint, python:build

Update README.md or add section mentioning Python SDK installation and usage.

Create .github/workflows/python-tests.yml:
- Matrix: Python 3.9, 3.10, 3.11, 3.12, 3.13
- Steps: install, lint (ruff), test (pytest)

### Prompt 15: Python CLI Tool

Add to pyproject.toml: [project.scripts] xactions-py = "xactions.cli:main"

Create src/python/xactions/cli.py with argparse:
- Subcommands: login, profile, tweet, search, post, followers, trends
- Cookie persistence (auto-save/load)
- Emoji-rich output (same style as Node.js CLI)
- JSON output flag
- Error handling with user-friendly messages

Test: xactions-py --help, xactions-py profile elonmusk, xactions-py search "#python"

---

## Validation

After all 15 prompts are complete, verify:

```bash
# Python package installs
cd src/python && pip install -e ".[dev]"

# Imports work
python -c "from xactions import Scraper, Tweet, Profile; print('OK Python SDK loads')"

# Models work
python -c "
from xactions.models import Tweet, Profile
t = Tweet(id='123', text='hello', likes=42)
print(f'OK Tweet: {t.text} - {t.likes} likes')
p = Profile(username='test', followers_count=1000)
print(f'OK Profile: @{p.username} - {p.followers_count} followers')
"

# Auth works
python -c "
from xactions.auth import CookieAuth
auth = CookieAuth(cookies='auth_token=test; ct0=csrf')
print(f'OK Authenticated: {auth.is_authenticated()}')
print(f'OK Auth token: {auth.get_auth_token()}')
"

# Scraper instantiation
python -c "
from xactions import Scraper
s = Scraper()
print(f'OK Scraper created, logged in: {s.is_logged_in()}')
"

# Tests pass
cd src/python && pytest -v

# CLI works
xactions-py --help

# Lint clean
cd src/python && ruff check .
```

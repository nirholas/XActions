# Track 09 — Python SDK

> Build a Python package (`xactions`) that wraps the Node.js Scraper class via a subprocess bridge, AND provides a native Python implementation of the core HTTP client for zero-dependency usage. This matches `twikit` (4000+ stars) which is pure Python. Both approaches ship in the same package.

---

## Research Before Starting

```
src/client/Scraper.js               — Node.js Scraper class (the API surface to mirror)
src/client/auth/CookieAuth.js       — Auth to replicate in Python
src/client/http/HttpClient.js       — HTTP client to replicate
src/client/http/graphql.js          — GraphQL query IDs (shared)
src/client/pagination/parsers.js    — Response parsers to replicate
types/index.d.ts                    — TypeScript definitions (API reference)
```

Study `d60/twikit` — the Python Twitter scraper with 4000+ stars:
- `Client` class with `login()`, `get_user_by_screen_name()`, `search_tweet()`, `create_tweet()`
- Async/await with `httpx`
- Cookie persistence
- Rate limit handling

---

## Architecture

```
python/
  xactions/
    __init__.py             ← Package root, exports Scraper
    scraper.py              ← Main Scraper class (native Python)
    auth/
      __init__.py
      cookies.py            ← Cookie jar with file persistence
      login.py              ← Username/password login flow
      guest.py              ← Guest token management
    http/
      __init__.py
      client.py             ← HTTP client with httpx
      rate_limiter.py        ← Rate limit tracking
      graphql.py             ← Query ID registry (mirrors Node.js)
    parsers/
      __init__.py
      tweets.py             ← Tweet response parser
      users.py              ← User response parser
      search.py             ← Search response parser
    pagination/
      __init__.py
      cursor.py             ← AsyncGenerator pagination
    bridge/
      __init__.py
      node_bridge.py        ← Subprocess bridge to Node.js (optional fallback)
  tests/
    test_scraper.py
    test_auth.py
    test_http.py
    test_parsers.py
    test_pagination.py
  pyproject.toml            ← Package configuration
  README.md                 ← Python-specific README
```

---

## Prompts

### Prompt 1: Python Package Setup

```
Create the Python package structure with pyproject.toml.

Create python/pyproject.toml:
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "xactions"
version = "3.1.0"
description = "XActions Python SDK — X/Twitter automation without API keys"
readme = "README.md"
license = {text = "MIT"}
requires-python = ">=3.9"
authors = [{ name = "nich", email = "nich@xactions.app" }]
keywords = ["twitter", "x", "scraper", "automation", "mcp"]
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.9",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Topic :: Internet",
    "Topic :: Software Development :: Libraries",
]
dependencies = [
    "httpx>=0.25.0",
]

[project.optional-dependencies]
dev = ["pytest", "pytest-asyncio", "pytest-cov"]

[project.urls]
Homepage = "https://xactions.app"
Repository = "https://github.com/nirholas/xactions"
Documentation = "https://github.com/nirholas/xactions/tree/main/python"

Create python/xactions/__init__.py:
"""XActions — X/Twitter automation without API keys."""
from .scraper import Scraper

__version__ = "3.1.0"
__author__ = "nich (@nichxbt)"
__all__ = ["Scraper"]

Create python/README.md with: overview, install (pip install xactions), quick start, link to main repo.
Files: python/pyproject.toml, python/xactions/__init__.py, python/README.md
```

### Prompt 2: Python Cookie Auth

```
Create python/xactions/auth/cookies.py — cookie management matching Node.js CookieAuth.

Requirements:
- Python 3.9+, type hints throughout
- Class CookieAuth:
  - __init__(self) — empty cookie dict
  - set(name: str, value: str) → None
  - get(name: str) → str | None
  - has(name: str) → bool
  - delete(name: str) → None
  - clear() → None
  - get_all() → dict[str, str]
  - to_header() → str — "auth_token=abc; ct0=xyz"
  - is_authenticated() → bool — True if auth_token AND ct0 set
  - get_auth_headers() → dict[str, str] — Cookie + x-csrf-token headers
  - async save(file_path: str) → None — JSON file persistence
  - @classmethod async load(cls, file_path: str) → CookieAuth
  - @classmethod from_env(cls) → CookieAuth — reads XACTIONS_SESSION_COOKIE
  - @classmethod from_dict(cls, data: dict) → CookieAuth
  - @classmethod parse(cls, cookie_string: str) → CookieAuth

File format matches Node.js:
{ "cookies": {...}, "created": "...", "username": null }

Use aiofiles for async file I/O (add to dependencies).

Create python/xactions/auth/__init__.py with re-exports.
Files: python/xactions/auth/cookies.py, python/xactions/auth/__init__.py
```

### Prompt 3: Python Guest Token

```
Create python/xactions/auth/guest.py — guest token management.

Requirements:
- Class GuestToken:
  - __init__(self, max_age: int = 10800) — 3hr default TTL
  - async activate(self) → str — POST to guest/activate.json
  - get_token(self) → str | None
  - is_expired(self) → bool
  - async ensure_valid(self) → str
  - get_headers(self) → dict[str, str]
  - reset(self) → None

Use httpx.AsyncClient for HTTP.
Bearer token: same public token as Node.js.
Handle 429 with Retry-After.

File: python/xactions/auth/guest.py
```

### Prompt 4: Python Login Flow

```
Create python/xactions/auth/login.py — username/password login via onboarding/task.json.

Requirements:
- Class CredentialAuth:
  - __init__(self, cookie_auth: CookieAuth, guest_token: GuestToken)
  - async login(self, username: str, password: str, email: str | None = None) → dict:
    Same multi-step flow as Node.js CredentialAuth (Track 02):
    1. Activate guest token
    2. Init login flow
    3. Submit username
    4. Handle email verification if needed
    5. Submit password
    6. Handle 2FA (raise TwoFactorRequired with flow_token)
    7. Extract cookies from Set-Cookie headers
    Returns: {"success": True, "username": username}
  
  - async submit_two_factor(self, flow_token: str, code: str) → dict
  
Custom exceptions:
  class TwoFactorRequired(Exception): flow_token: str
  class LoginFailed(Exception): reason: str
  class AccountSuspended(Exception): pass
  class AccountLocked(Exception): pass

Use httpx.AsyncClient with follow_redirects=True.
Parse Set-Cookie headers to extract auth_token and ct0.

File: python/xactions/auth/login.py
```

### Prompt 5: Python HTTP Client

```
Create python/xactions/http/client.py — HTTP client with rate limiting.

Requirements:
- Class HttpClient:
  - __init__(self, cookie_auth: CookieAuth | None = None, guest_token: GuestToken | None = None, timeout: int = 30)
  - async request(self, method: str, url: str, **kwargs) → dict
    - Adds auth headers
    - Tracks rate limits from response headers
    - Retries on 429 with exponential backoff
    - Raises AuthError on 401
  - async get(self, url: str, params: dict | None = None) → dict
  - async post(self, url: str, json: dict | None = None) → dict
  - async graphql(self, query_id: str, operation_name: str, variables: dict, features: dict | None = None) → dict
    - Builds Twitter GraphQL URL
    - Encodes variables as JSON query params
    - Includes default feature flags
  - async close(self) → None — close httpx client
  - async __aenter__ / __aexit__ — context manager support

Rate limiting:
  - Track x-rate-limit-remaining/reset per endpoint
  - Auto-wait when remaining == 0
  - Exponential backoff on 429: 1s, 2s, 4s, 8s... max 60s

Use httpx.AsyncClient with:
  - Custom User-Agent (realistic Chrome)
  - Timeout
  - Automatic cookie handling

File: python/xactions/http/client.py
```

### Prompt 6: Python GraphQL Query Registry

```
Create python/xactions/http/graphql.py — mirrors the Node.js query ID registry.

Requirements:
- QUERIES dict matching Node.js src/client/http/graphql.js exactly
- Same query IDs for all operations
- Helper functions:
  - build_graphql_url(query_id, operation_name) → str
  - encode_variables(variables: dict) → str
  - get_default_features() → dict

Create python/xactions/http/rate_limiter.py:
- Class RateLimiter:
  - update(endpoint: str, headers: dict) → None
  - can_request(endpoint: str) → bool
  - get_wait_time(endpoint: str) → float (seconds)
  - is_rate_limited(endpoint: str) → bool
  - async wait_for_reset(endpoint: str) → None

Create python/xactions/http/__init__.py with re-exports.
Files: python/xactions/http/graphql.py, python/xactions/http/rate_limiter.py, python/xactions/http/__init__.py
```

### Prompt 7: Python Response Parsers

```
Create python/xactions/parsers/ — response parsers matching Node.js parsers.

python/xactions/parsers/tweets.py:
- parse_tweets(response: dict) → list[dict] — from UserTweets
- parse_tweet(response: dict) → dict — from TweetDetail
- Extract: id, text, created_at, likes, retweets, replies, quotes, impressions, bookmarks, author, media, hashtags

python/xactions/parsers/users.py:
- parse_users(response: dict) → list[dict] — from Followers/Following
- parse_profile(response: dict) → dict — from UserByScreenName
- Extract: id, username, display_name, bio, followers, following, tweets, avatar, verified

python/xactions/parsers/search.py:
- parse_search_results(response: dict) → dict — { tweets: [...], users: [...] }

python/xactions/parsers/__init__.py — re-exports all parsers

All parsers handle:
- Tombstoned tweets → { id, tombstoned: True }
- Promoted tweets → skipped
- TweetWithVisibilityResults → unwrapped
- Null/empty responses → empty list

Files: python/xactions/parsers/tweets.py, users.py, search.py, __init__.py
```

### Prompt 8: Python Pagination with AsyncGenerators

```
Create python/xactions/pagination/cursor.py — AsyncGenerator pagination.

Requirements:
- Class CursorExtractor:
  - @staticmethod extract(response: dict, type: str) → dict — { bottom: str | None, top: str | None }
  - Handles timeline, search, followers, following types
  - Same logic as Node.js CursorExtractor

- Class AsyncCursor:
  - __init__(self, http_client, query_id, operation_name, variables, parser, cursor_type, limit=float('inf'), delay=1.0)
  - async __aiter__(self) — AsyncGenerator:
    1. Fetch first page
    2. Parse items
    3. Yield each item
    4. Extract cursor
    5. If cursor and under limit → delay → fetch next page
    6. Repeat
  - async to_list(self) → list
  - async first(self) → dict | None
  - async take(self, n: int) → list
  - async count(self) → int

Usage:
  async for tweet in scraper.get_tweets("elonmusk", limit=100):
      print(tweet["text"])

Create python/xactions/pagination/__init__.py with re-exports.
Files: python/xactions/pagination/cursor.py, __init__.py
```

### Prompt 9: Python Scraper Class — Main Entry Point

```
Create python/xactions/scraper.py — the main Scraper class matching Node.js API surface.

Requirements:
- Class Scraper:
  - __init__(self, stealth=False)
  - async login(self, username=None, password=None, email=None, cookies=None, cookie_file=None)
    If cookies (dict or string) → CookieAuth.from_dict / parse
    If cookie_file → CookieAuth.load(file)
    If username+password → CredentialAuth.login()
    If env var XACTIONS_SESSION_COOKIE → from env
  - async save_cookies(self, file_path: str) → None
  - async load_cookies(self, file_path: str) → None
  - is_logged_in(self) → bool

  - async get_profile(self, username: str) → dict
  - async get_tweet(self, tweet_id: str) → dict
  - async get_tweets(self, username: str, limit: int = 100) → AsyncGenerator
  - async get_followers(self, username: str, limit: int = 100) → AsyncGenerator
  - async get_following(self, username: str, limit: int = 100) → AsyncGenerator
  - async search_tweets(self, query: str, limit: int = 100) → AsyncGenerator
  - async get_likes(self, username: str, limit: int = 100) → AsyncGenerator
  - async get_bookmarks(self, limit: int = 100) → AsyncGenerator

  - async send_tweet(self, text: str, media=None, reply_to=None) → dict
  - async delete_tweet(self, tweet_id: str) → bool
  - async like(self, tweet_id: str) → bool
  - async unlike(self, tweet_id: str) → bool
  - async retweet(self, tweet_id: str) → bool
  - async unretweet(self, tweet_id: str) → bool
  - async follow(self, username: str) → bool
  - async unfollow(self, username: str) → bool

  - async close(self) → None
  - async __aenter__ / __aexit__ — context manager

File: python/xactions/scraper.py
```

### Prompt 10: Python Node.js Bridge (Optional Fallback)

```
Create python/xactions/bridge/node_bridge.py — subprocess bridge to the Node.js Scraper for features not yet ported to Python.

Requirements:
- Class NodeBridge:
  - __init__(self, node_path='node', xactions_path=None)
    xactions_path: path to XActions Node.js installation (auto-detect from npm global)
  - async call(self, method: str, *args) → dict:
    1. Build a small Node.js script that imports xactions and calls the method
    2. Execute via subprocess with stdout JSON output
    3. Parse and return the result
  - is_available(self) → bool — checks if Node.js and xactions are installed
  - async get_version(self) → str — returns xactions npm package version

The bridge script template:
  import('xactions').then(async ({ Scraper }) => {
    const s = new Scraper();
    const result = await s.{method}({args});
    process.stdout.write(JSON.stringify(result));
  });

Used for features like:
  - Media upload (complex, rely on Node.js implementation)
  - MCP server integration
  - Browser automation (Puppeteer)

The Scraper class in scraper.py should have:
  @property
  def bridge(self) → NodeBridge | None:
    # Lazy-init NodeBridge, returns None if Node.js not available

Create python/xactions/bridge/__init__.py.
Files: python/xactions/bridge/node_bridge.py, python/xactions/bridge/__init__.py
```

### Prompt 11: Python Tests — Auth

```
Create python/tests/test_auth.py — pytest tests for auth module.

Requirements:
- Use pytest + pytest-asyncio
- Use unittest.mock for HTTP mocking

Test cases:
1. CookieAuth set/get/has/delete/clear
2. CookieAuth to_header() format
3. CookieAuth is_authenticated() logic
4. CookieAuth save/load roundtrip (temp files)
5. CookieAuth from_env() reads env var
6. CookieAuth from_dict() creates from dict
7. CookieAuth parse() parses cookie string
8. GuestToken activate() sends correct request
9. GuestToken is_expired() logic
10. GuestToken ensure_valid() activates if expired
11. CredentialAuth login() multi-step flow (mock HTTP)
12. CredentialAuth handles 2FA (raises TwoFactorRequired)
13. CredentialAuth handles wrong password
14. CredentialAuth extracts cookies from response
15. submit_two_factor() submits code correctly

File: python/tests/test_auth.py
```

### Prompt 12: Python Tests — Scraper

```
Create python/tests/test_scraper.py — pytest tests for Scraper class.

Requirements:
- Use pytest + pytest-asyncio
- Mock HTTP responses

Test cases:
1. Scraper() initializes without error
2. login(cookies={"auth_token": "...", "ct0": "..."}) authenticates
3. login(cookie_file="cookies.json") loads from file
4. is_logged_in() returns correct state
5. get_profile("testuser") returns profile dict
6. get_tweet("123") returns tweet dict
7. get_tweets("testuser", limit=10) yields tweets
8. get_followers("testuser", limit=10) yields users
9. search_tweets("query", limit=10) yields tweets
10. send_tweet("text") sends CreateTweet request
11. like("123") sends FavoriteTweet request
12. follow("testuser") sends follow request
13. Error handling — get_profile for non-existent user
14. Rate limiting — waits on 429
15. Context manager — async with Scraper() as s: ...

File: python/tests/test_scraper.py
```

### Prompt 13: Python Tests — Parsers

```
Create python/tests/test_parsers.py — tests for response parsers.

Requirements:
- Use pytest
- Embed fixture data matching Twitter's actual response shapes (same as Node.js fixtures)

Test cases:
1. parse_tweets() extracts tweets from timeline response
2. parse_tweets() skips cursor entries
3. parse_tweets() skips promoted tweets
4. parse_tweets() extracts all tweet fields
5. parse_tweets() handles tombstoned tweets
6. parse_profile() extracts single profile
7. parse_profile() includes all fields
8. parse_users() extracts user list from followers
9. parse_search_results() handles mixed results
10. parse_tweet() extracts single tweet detail
11. Empty response returns empty list
12. Null response returns empty list
13. Malformed response doesn't crash (returns partial)
14. Media parsing extracts photo/video URLs
15. Hashtag extraction from tweet entities

File: python/tests/test_parsers.py
```

### Prompt 14: Python CI and Package Scripts

```
1. Add Python test command to package.json:
   "test:python": "cd python && python -m pytest tests/ -v"

2. Create python/tests/conftest.py — shared fixtures:
   - Mock HTTP client fixture
   - Sample Twitter response fixtures
   - Temp directory fixture

3. Create python/Makefile:
   install:
       pip install -e ".[dev]"
   test:
       pytest tests/ -v --cov=xactions --cov-report=term-missing
   lint:
       ruff check xactions/
   format:
       ruff format xactions/
   build:
       python -m build
   clean:
       rm -rf dist/ build/ *.egg-info

4. Create python/.gitignore:
   __pycache__/
   *.pyc
   *.egg-info/
   dist/
   build/
   .pytest_cache/
   .coverage

Files: python/tests/conftest.py, python/Makefile, python/.gitignore, package.json (update)
```

### Prompt 15: Python SDK Documentation

```
Create docs/python-sdk.md — documentation for the Python SDK.

Structure:
1. Overview — Python SDK for XActions, mirrors the Node.js API
2. Installation — pip install xactions
3. Quick Start
   ```python
   from xactions import Scraper
   
   async def main():
       async with Scraper() as scraper:
           await scraper.login(username="user", password="pass", email="e@mail.com")
           await scraper.save_cookies("cookies.json")
           
           profile = await scraper.get_profile("elonmusk")
           print(f"Followers: {profile['followers']}")
           
           async for tweet in scraper.get_tweets("elonmusk", limit=10):
               print(tweet["text"])
   ```
4. Authentication — cookies, login, 2FA, session persistence
5. Scraping — profiles, tweets, followers, search
6. Actions — send tweet, like, follow, retweet
7. Pagination — async generators, filtering
8. Media Upload — via Node.js bridge
9. Rate Limiting — automatic handling
10. Node.js Bridge — optional, for advanced features
11. API Reference — every class and method
12. Comparison with twikit — XActions Python vs twikit feature table
13. Contributing — how to contribute to the Python SDK

File: docs/python-sdk.md
```

---

## Validation

```bash
# Package installs
cd python && pip install -e ".[dev]"

# Tests pass
cd python && pytest tests/ -v

# Package builds
cd python && python -m build

# Import works
python -c "from xactions import Scraper; print('OK')"
```

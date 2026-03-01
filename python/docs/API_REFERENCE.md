# Xeepy API Reference

> Complete API documentation for all Xeepy classes and methods.

---

## Table of Contents

- [Xeepy (Main Class)](#xeepy-main-class)
- [Scrapers](#scrapers)
- [Follow/Unfollow Actions](#followunfollow-actions)
- [Engagement Actions](#engagement-actions)
- [Monitoring](#monitoring)
- [AI Integration](#ai-integration)
- [Storage & Export](#storage--export)
- [Models](#models)

---

## Xeepy (Main Class)

The main entry point for all Xeepy functionality.

### Constructor

```python
Xeepy(
    headless: bool = True,
    session_path: str | None = None,
    config: XeepyConfig | None = None,
    rate_limit: bool = True
)
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `headless` | `bool` | `True` | Run browser in headless mode |
| `session_path` | `str` | `None` | Path to saved session file |
| `config` | `XeepyConfig` | `None` | Configuration object |
| `rate_limit` | `bool` | `True` | Enable rate limiting |

### Usage

```python
from xeepy import Xeepy

# Basic usage
async with Xeepy() as x:
    # Access all features via x.scrape, x.follow, etc.
    pass

# With options
async with Xeepy(headless=False, session_path="session.json") as x:
    pass
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `x.scrape` | `Scraper` | Access to all scrapers |
| `x.follow` | `FollowActions` | Follow operations |
| `x.unfollow` | `UnfollowActions` | Unfollow operations |
| `x.engage` | `EngageActions` | Engagement operations |
| `x.monitor` | `Monitor` | Monitoring features |
| `x.auth` | `Auth` | Authentication methods |
| `x.export` | `Export` | Export utilities |

---

## Scrapers

### `scrape.replies()`

Scrape replies to a tweet.

```python
async def replies(
    tweet_url: str,
    limit: int = 100,
    include_author: bool = False
) -> list[Tweet]
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tweet_url` | `str` | required | URL of the tweet |
| `limit` | `int` | `100` | Maximum replies to fetch |
| `include_author` | `bool` | `False` | Include OP's replies |

**Returns:** `list[Tweet]`

**Example:**

```python
replies = await x.scrape.replies(
    "https://x.com/elonmusk/status/1234567890",
    limit=50
)

for reply in replies:
    print(f"@{reply.username}: {reply.text}")
```

---

### `scrape.profile()`

Scrape a user's profile information.

```python
async def profile(username: str) -> User
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | `str` | required | Twitter username (without @) |

**Returns:** `User`

**Example:**

```python
user = await x.scrape.profile("elonmusk")
print(f"Name: {user.name}")
print(f"Bio: {user.bio}")
print(f"Followers: {user.followers_count}")
print(f"Following: {user.following_count}")
```

---

### `scrape.followers()`

Scrape a user's followers.

```python
async def followers(
    username: str,
    limit: int = 1000
) -> list[User]
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | `str` | required | Twitter username |
| `limit` | `int` | `1000` | Maximum followers to fetch |

**Returns:** `list[User]`

**Example:**

```python
followers = await x.scrape.followers("elonmusk", limit=100)
for follower in followers:
    print(f"@{follower.username} - {follower.followers_count} followers")
```

---

### `scrape.following()`

Scrape who a user is following.

```python
async def following(
    username: str,
    limit: int = 1000
) -> list[User]
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | `str` | required | Twitter username |
| `limit` | `int` | `1000` | Maximum users to fetch |

**Returns:** `list[User]`

---

### `scrape.tweets()`

Scrape a user's tweets.

```python
async def tweets(
    username: str,
    limit: int = 100,
    include_replies: bool = False,
    include_retweets: bool = True
) -> list[Tweet]
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | `str` | required | Twitter username |
| `limit` | `int` | `100` | Maximum tweets to fetch |
| `include_replies` | `bool` | `False` | Include replies |
| `include_retweets` | `bool` | `True` | Include retweets |

**Returns:** `list[Tweet]`

---

### `scrape.hashtag()`

Scrape tweets by hashtag.

```python
async def hashtag(
    tag: str,
    limit: int = 100,
    mode: str = "latest"
) -> list[Tweet]
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `tag` | `str` | required | Hashtag (with or without #) |
| `limit` | `int` | `100` | Maximum tweets to fetch |
| `mode` | `str` | `"latest"` | `"latest"` or `"top"` |

**Returns:** `list[Tweet]`

---

### `scrape.search()`

Search for tweets.

```python
async def search(
    query: str,
    limit: int = 100,
    mode: str = "latest"
) -> list[Tweet]
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | `str` | required | Search query |
| `limit` | `int` | `100` | Maximum results |
| `mode` | `str` | `"latest"` | `"latest"` or `"top"` |

**Returns:** `list[Tweet]`

---

## Follow/Unfollow Actions

### `follow.user()`

Follow a user.

```python
async def user(username: str) -> bool
```

**Returns:** `bool` - Success status

---

### `follow.by_hashtag()`

Follow users from a hashtag.

```python
async def by_hashtag(
    hashtag: str,
    limit: int = 50,
    min_followers: int = 100
) -> FollowResult
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `hashtag` | `str` | required | Hashtag to search |
| `limit` | `int` | `50` | Max users to follow |
| `min_followers` | `int` | `100` | Minimum follower count |

**Returns:** `FollowResult`

---

### `unfollow.non_followers()`

Unfollow users who don't follow back.

```python
async def non_followers(
    max_unfollows: int = 100,
    whitelist: list[str] | None = None,
    dry_run: bool = False
) -> UnfollowResult
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `max_unfollows` | `int` | `100` | Maximum to unfollow |
| `whitelist` | `list[str]` | `None` | Users to never unfollow |
| `dry_run` | `bool` | `False` | Preview without acting |

**Returns:** `UnfollowResult`

**Example:**

```python
# Preview first
result = await x.unfollow.non_followers(dry_run=True)
print(f"Would unfollow: {len(result.would_unfollow)} users")

# Then execute
result = await x.unfollow.non_followers(
    max_unfollows=50,
    whitelist=["friend1", "friend2"]
)
print(f"Unfollowed: {result.unfollowed_count}")
```

---

### `unfollow.everyone()`

Unfollow all users (nuclear option).

```python
async def everyone(
    whitelist: list[str] | None = None,
    dry_run: bool = True  # Default is True for safety
) -> UnfollowResult
```

⚠️ **Warning:** This is irreversible. Always use `dry_run=True` first.

---

### `unfollow.smart()`

Smart unfollow based on criteria.

```python
async def smart(
    days_inactive: int = 30,
    min_engagement: float = 0.01,
    max_unfollows: int = 100
) -> UnfollowResult
```

---

## Engagement Actions

### `engage.like()`

Like a tweet.

```python
async def like(tweet_url: str) -> bool
```

---

### `engage.auto_like()`

Auto-like tweets by criteria.

```python
async def auto_like(
    keywords: list[str] | None = None,
    hashtags: list[str] | None = None,
    users: list[str] | None = None,
    limit: int = 50,
    delay_range: tuple[int, int] = (2, 5)
) -> EngagementResult
```

**Example:**

```python
result = await x.engage.auto_like(
    keywords=["python", "javascript"],
    limit=20
)
print(f"Liked {result.liked_count} tweets")
```

---

### `engage.comment()`

Post a comment on a tweet.

```python
async def comment(
    tweet_url: str,
    text: str
) -> bool
```

---

### `engage.retweet()`

Retweet a tweet.

```python
async def retweet(tweet_url: str) -> bool
```

---

## Monitoring

### `monitor.unfollowers()`

Detect who unfollowed you.

```python
async def unfollowers() -> UnfollowerReport
```

**Returns:** `UnfollowerReport`

```python
report = await x.monitor.unfollowers()
print(f"New unfollowers: {report.unfollowers}")
print(f"New followers: {report.new_followers}")
print(f"Total followers: {report.current_count}")
```

---

### `monitor.account()`

Monitor an account for changes.

```python
async def account(
    username: str,
    watch: list[str] = ["bio", "followers", "following"]
) -> AccountMonitor
```

---

### `monitor.keywords()`

Monitor for keyword mentions.

```python
async def keywords(
    keywords: list[str],
    callback: Callable[[Tweet], None] | None = None
) -> KeywordMonitor
```

---

## AI Integration

### `ContentGenerator`

AI-powered content generation.

```python
from xeepy.ai import ContentGenerator

ai = ContentGenerator(
    provider: str = "openai",  # "openai", "anthropic", "ollama"
    api_key: str | None = None,
    model: str | None = None,
    base_url: str | None = None  # For Ollama
)
```

### `ai.generate_reply()`

Generate an AI reply to a tweet.

```python
async def generate_reply(
    tweet_text: str,
    style: str = "friendly",  # friendly, witty, professional, crypto
    context: str | None = None,
    max_length: int = 280
) -> str
```

**Example:**

```python
reply = await ai.generate_reply(
    tweet_text="Just shipped a new feature!",
    style="supportive",
    max_length=280
)
print(reply)  # "Congrats on the launch! 🎉 What problem does it solve?"
```

---

### `ai.analyze_sentiment()`

Analyze sentiment of tweets.

```python
async def analyze_sentiment(
    tweets: list[Tweet]
) -> SentimentResult
```

---

### `ai.detect_bot()`

Detect if an account is a bot.

```python
async def detect_bot(user: User) -> BotDetectionResult
```

---

## Storage & Export

### `export.to_csv()`

Export data to CSV.

```python
def to_csv(
    data: list[Tweet | User],
    filepath: str,
    columns: list[str] | None = None
) -> str
```

---

### `export.to_json()`

Export data to JSON.

```python
def to_json(
    data: list[Tweet | User],
    filepath: str,
    indent: int = 2
) -> str
```

---

### `export.to_excel()`

Export data to Excel.

```python
def to_excel(
    data: list[Tweet | User],
    filepath: str,
    sheet_name: str = "Data"
) -> str
```

---

## Models

### `Tweet`

```python
@dataclass
class Tweet:
    id: str
    text: str
    username: str
    user_id: str
    created_at: datetime
    likes: int
    retweets: int
    replies: int
    url: str
    media: list[Media] | None = None
    is_reply: bool = False
    is_retweet: bool = False
```

### `User`

```python
@dataclass
class User:
    id: str
    username: str
    name: str
    bio: str | None
    followers_count: int
    following_count: int
    tweet_count: int
    created_at: datetime
    verified: bool
    profile_image_url: str | None
    banner_url: str | None
    location: str | None
    website: str | None
```

### `UnfollowResult`

```python
@dataclass
class UnfollowResult:
    unfollowed_count: int
    unfollowed_users: list[str]
    would_unfollow: list[str]  # For dry_run
    skipped_whitelist: list[str]
    errors: list[str]
```

### `EngagementResult`

```python
@dataclass
class EngagementResult:
    liked_count: int
    liked_tweets: list[str]
    commented_count: int
    retweeted_count: int
    errors: list[str]
```

---

## Configuration

### `XeepyConfig`

```python
@dataclass
class XeepyConfig:
    # Browser settings
    headless: bool = True
    slow_mo: int = 0
    timeout: int = 30000
    
    # Rate limiting
    follow_delay: tuple[int, int] = (3, 8)
    unfollow_delay: tuple[int, int] = (2, 6)
    like_delay: tuple[int, int] = (1, 3)
    comment_delay: tuple[int, int] = (30, 90)
    
    # Limits per day
    max_follows_per_day: int = 100
    max_unfollows_per_day: int = 150
    max_likes_per_day: int = 500
    max_comments_per_day: int = 50
    
    # Storage
    database_path: str = "~/.xeepy/data.db"
    session_path: str = "~/.xeepy/session.json"
```

---

## Error Handling

### Exceptions

```python
from xeepy.exceptions import (
    XeepyError,           # Base exception
    AuthenticationError,   # Login/session issues
    RateLimitError,        # Rate limit exceeded
    ScraperError,          # Scraping failed
    ActionError,           # Action failed (follow, like, etc.)
    NetworkError,          # Network issues
)
```

### Example

```python
from xeepy import Xeepy
from xeepy.exceptions import AuthenticationError, RateLimitError

async with Xeepy() as x:
    try:
        await x.follow.user("username")
    except AuthenticationError:
        print("Please login first")
        await x.auth.login()
    except RateLimitError as e:
        print(f"Rate limited. Wait {e.retry_after} seconds")
```

---

## Next Steps

- [Examples](EXAMPLES.md) - See more code examples
- [CLI Reference](CLI_REFERENCE.md) - Command-line usage
- [FAQ](FAQ.md) - Common questions

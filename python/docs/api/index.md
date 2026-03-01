# API Reference

Complete API documentation for Xeepy modules.

## Module Overview

```
xeepy/
├── __init__.py          # Xeepy main class
├── core/                # Core functionality
│   ├── browser.py       # Browser management
│   ├── auth.py          # Authentication
│   ├── rate_limiter.py  # Rate limiting
│   └── config.py        # Configuration
├── scrapers/            # Data scraping
├── actions/             # User actions
├── monitoring/          # Account monitoring
├── analytics/           # Analytics & insights
├── ai/                  # AI features
├── api/                 # REST & GraphQL
├── models/              # Data models
├── storage/             # Data persistence
└── notifications/       # Alerts & notifications
```

## Quick Reference

### Main Class

```python
from xeepy import Xeepy

async with Xeepy(
    headless: bool = True,
    timeout: int = 30000,
    config_file: str = None,
    profile: str = "default"
) as x:
    # x.scrape - Scraping operations
    # x.follow - Follow operations  
    # x.unfollow - Unfollow operations
    # x.engage - Engagement actions
    # x.monitor - Monitoring
    # x.analytics - Analytics
    # x.ai - AI features
    # x.export - Data export
    # x.auth - Authentication
    # x.config - Configuration
```

## Core Modules

### [Xeepy](core/xeepy.md)

Main entry point and orchestrator.

```python
from xeepy import Xeepy

async with Xeepy() as x:
    profile = await x.scrape.profile("username")
```

### [Browser Manager](core/browser.md)

Playwright browser management.

```python
from xeepy.core.browser import BrowserManager

browser = BrowserManager(headless=True)
await browser.start()
page = await browser.new_page()
```

### [Auth Manager](core/auth.md)

Authentication and session handling.

```python
from xeepy.core.auth import AuthManager

auth = AuthManager(browser_manager)
await auth.login()
await auth.save_cookies("session.json")
```

### [Rate Limiter](core/rate_limiter.md)

Rate limiting to protect accounts.

```python
from xeepy.core.rate_limiter import RateLimiter

limiter = RateLimiter(requests_per_minute=20)
await limiter.wait()
```

### [Config](core/config.md)

Configuration management.

```python
from xeepy.core.config import Config

config = Config.load("xeepy.toml")
config.rate_limit.requests_per_minute = 15
```

## Scrapers

| Module | Description |
|--------|-------------|
| [replies](scrapers/replies.md) | Tweet replies |
| [profile](scrapers/profile.md) | User profiles |
| [followers](scrapers/followers.md) | Followers list |
| [following](scrapers/following.md) | Following list |
| [tweets](scrapers/tweets.md) | User tweets |
| [thread](scrapers/thread.md) | Thread unroller |
| [search](scrapers/search.md) | Search results |
| [hashtag](scrapers/hashtag.md) | Hashtag tweets |
| [media](scrapers/media.md) | Media posts |
| [likes](scrapers/likes.md) | Tweet likes |
| [lists](scrapers/lists.md) | List members |
| [mentions](scrapers/mentions.md) | User mentions |
| [spaces](scrapers/spaces.md) | Twitter Spaces |
| [downloads](scrapers/downloads.md) | Media downloader |
| [recommendations](scrapers/recommendations.md) | Trends & recommendations |

### Example: Scraping

```python
# Replies
replies = await x.scrape.replies(tweet_url, limit=100)

# Profile
profile = await x.scrape.profile("username")

# Followers with pagination
async for batch in x.scrape.followers_batched("username", batch_size=100):
    process(batch)
```

## Actions

| Module | Description |
|--------|-------------|
| [follow](actions/follow.md) | Follow operations |
| [unfollow](actions/unfollow.md) | Unfollow operations |
| [engage](actions/engage.md) | Like, retweet, reply |
| [messaging](actions/messaging.md) | Direct messages |
| [scheduling](actions/scheduling.md) | Scheduled tweets |
| [polls](actions/polls.md) | Poll creation |
| [settings](actions/settings.md) | Account settings |

### Example: Actions

```python
# Follow
await x.follow.user("username")
await x.follow.by_hashtag("#python", limit=20)

# Unfollow
result = await x.unfollow.non_followers(max_unfollows=50)

# Engage
await x.engage.like(tweet_url)
await x.engage.auto_like(keywords=["python"], limit=20)
```

## Monitoring

| Module | Description |
|--------|-------------|
| [unfollowers](monitoring/unfollowers.md) | Detect unfollowers |
| [growth](monitoring/growth.md) | Track growth |
| [keywords](monitoring/keywords.md) | Keyword monitoring |
| [account](monitoring/account.md) | Account changes |

### Example: Monitoring

```python
# Check unfollowers
report = await x.monitor.unfollowers()
print(f"Lost: {len(report.unfollowers)}")
print(f"Gained: {len(report.new_followers)}")

# Continuous monitoring
async for event in x.monitor.watch():
    if event.type == "unfollower":
        notify(f"@{event.username} unfollowed you")
```

## Analytics

| Module | Description |
|--------|-------------|
| [growth](analytics/growth.md) | Growth analytics |
| [engagement](analytics/engagement.md) | Engagement metrics |
| [audience](analytics/audience.md) | Audience insights |
| [competitors](analytics/competitors.md) | Competitor analysis |
| [content](analytics/content.md) | Content performance |

### Example: Analytics

```python
# Growth report
growth = await x.analytics.growth(period="30d")
print(f"Net change: {growth.net_change}")

# Best posting times
best_times = await x.analytics.best_posting_times()
print(f"Best day: {best_times.best_day}")
print(f"Best hour: {best_times.best_hour}")
```

## AI

| Module | Description |
|--------|-------------|
| [providers](ai/providers.md) | Provider abstraction |
| [content](ai/content.md) | Content generation |
| [sentiment](ai/sentiment.md) | Sentiment analysis |
| [detection](ai/detection.md) | Bot detection |

### Example: AI

```python
from xeepy.ai import ContentGenerator

ai = ContentGenerator(provider="openai", api_key="...")

# Generate reply
reply = await ai.generate_reply(
    tweet_text="Just launched my startup!",
    style="supportive"
)

# Sentiment analysis
sentiment = await ai.analyze_sentiment(tweets)
```

## API

| Module | Description |
|--------|-------------|
| [graphql](graphql.md) | GraphQL client |
| [server](server.md) | REST API server |

### Example: GraphQL

```python
from xeepy.api.graphql import GraphQLClient

gql = GraphQLClient(cookies="session.json")

# Batch operations
tweets = await gql.tweets_by_ids(["id1", "id2", "id3"])
users = await gql.users_by_ids(["id1", "id2"])

await gql.close()
```

## Data Models

| Model | Description |
|-------|-------------|
| [Tweet](models/tweet.md) | Tweet data |
| [User](models/user.md) | User data |
| [Engagement](models/engagement.md) | Engagement data |

### Example: Models

```python
from xeepy.models import Tweet, User

# Models are dataclasses with type hints
tweet = Tweet(
    id="123",
    text="Hello world",
    author=User(username="example"),
    created_at=datetime.now()
)
```

## Storage

| Module | Description |
|--------|-------------|
| [database](storage/database.md) | SQLite caching |
| [export](storage/export.md) | Data export |

### Example: Export

```python
# Export to various formats
x.export.to_csv(data, "output.csv")
x.export.to_json(data, "output.json")
x.export.to_excel(data, "output.xlsx")
x.export.to_database(data, "sqlite:///data.db")
```

## Notifications

| Module | Description |
|--------|-------------|
| [discord](notifications/discord.md) | Discord webhooks |
| [telegram](notifications/telegram.md) | Telegram bot |
| [email](notifications/email.md) | Email notifications |

### Example: Notifications

```python
from xeepy.notifications import NotificationManager

notifier = NotificationManager()
notifier.add_discord("https://discord.com/api/webhooks/...")
notifier.add_telegram(bot_token="...", chat_id="...")

await notifier.send("🚨 New unfollower detected!")
```

## Type Reference

### Common Types

```python
from typing import List, Optional, AsyncIterator
from datetime import datetime
from dataclasses import dataclass

# Tweet URL types
TweetURL = str  # https://x.com/user/status/123

# Username types
Username = str  # Without @

# Time periods
Period = str  # "7d", "30d", "1y"

# Result types
@dataclass
class ScrapeResult:
    items: List[Any]
    cursor: Optional[str]
    has_more: bool

@dataclass
class ActionResult:
    success: bool
    affected: List[str]
    errors: List[str]
```

## Exception Reference

```python
from xeepy.exceptions import (
    XeepyError,           # Base exception
    AuthenticationError,   # Auth failures
    RateLimitError,        # Rate limited
    NotFoundError,         # Resource not found
    NetworkError,          # Network issues
    TimeoutError,          # Operation timeout
    ConfigError,           # Configuration error
)
```

## See Also

- [Getting Started](../getting-started/index.md)
- [Guides](../guides/scraping/index.md)
- [CLI Reference](../cli/index.md)
- [Examples](../cookbook/index.md)

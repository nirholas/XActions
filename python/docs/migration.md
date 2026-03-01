# Migration Guide

This guide helps you migrate from Xeepy v1.x to v2.x, or from other Twitter libraries.

---

## From Xeepy v1.x to v2.x

### Breaking Changes in v2.0

#### 1. Async Context Manager Required

```python
# ❌ Old (v1.x)
x = Xeepy()
await x.scrape.replies(url)
await x.close()

# ✅ New (v2.x)
async with Xeepy() as x:
    await x.scrape.replies(url)
```

#### 2. Method Renames

| v1.x | v2.x | Notes |
|------|------|-------|
| `x.get_replies()` | `x.scrape.replies()` | Moved to scrape manager |
| `x.get_followers()` | `x.scrape.followers()` | Moved to scrape manager |
| `x.get_following()` | `x.scrape.following()` | Moved to scrape manager |
| `x.like_tweet()` | `x.engage.like()` | Moved to engage manager |
| `x.retweet()` | `x.engage.retweet()` | Moved to engage manager |
| `x.follow_user()` | `x.follow.user()` | Moved to follow manager |
| `x.unfollow_user()` | `x.unfollow.user()` | Moved to unfollow manager |

#### 3. Return Type Changes

All scraping methods now return `ScrapeResult` objects instead of raw lists:

```python
# ❌ Old (v1.x)
replies = await x.get_replies(url)  # Returns List[Tweet]
for reply in replies:
    print(reply.text)

# ✅ New (v2.x)
result = await x.scrape.replies(url)  # Returns ScrapeResult[Tweet]
print(f"Found {result.count} replies")
for reply in result.items:
    print(reply.text)
```

#### 4. Configuration Changes

```python
# ❌ Old (v1.x)
x = Xeepy(browser="chromium", headless=True)

# ✅ New (v2.x)
x = Xeepy(
    headless=True,
    config_path="xeepy.yml"  # Optional external config
)
```

#### 5. Rate Limiter Integration

Rate limiting is now built-in and enabled by default:

```python
# ❌ Old (v1.x) - Manual delays
import asyncio
for user in users:
    await x.follow_user(user)
    await asyncio.sleep(5)

# ✅ New (v2.x) - Automatic rate limiting
for user in users:
    await x.follow.user(user)  # Automatic delays
```

---

## From Tweepy to Xeepy

### Why Migrate?

| Feature | Tweepy | Xeepy |
|---------|--------|-------|
| Twitter API Required | ✅ Yes | ❌ No |
| API Costs | $100+/month | Free |
| Rate Limits | Strict (API) | Browser-based |
| Full Access | Limited by tier | Full access |

### Quick Conversion Guide

#### Authentication

```python
# ❌ Tweepy
import tweepy
auth = tweepy.OAuth1UserHandler(
    consumer_key, consumer_secret,
    access_token, access_token_secret
)
api = tweepy.API(auth)

# ✅ Xeepy
from xeepy import Xeepy
async with Xeepy() as x:
    await x.auth.login()  # Browser-based auth
```

#### Get Tweet Replies

```python
# ❌ Tweepy (v1 API - deprecated)
# No native method, requires search workarounds

# ✅ Xeepy
async with Xeepy() as x:
    replies = await x.scrape.replies("https://x.com/user/status/123")
```

#### Get User Timeline

```python
# ❌ Tweepy
tweets = api.user_timeline(screen_name="username", count=100)

# ✅ Xeepy
async with Xeepy() as x:
    result = await x.scrape.tweets("username", limit=100)
    tweets = result.items
```

#### Get Followers

```python
# ❌ Tweepy
followers = tweepy.Cursor(api.get_followers, screen_name="username").items(1000)

# ✅ Xeepy
async with Xeepy() as x:
    result = await x.scrape.followers("username", limit=1000)
    followers = result.items
```

#### Like a Tweet

```python
# ❌ Tweepy
api.create_favorite(tweet_id)

# ✅ Xeepy
async with Xeepy() as x:
    await x.engage.like("https://x.com/user/status/123")
```

#### Follow a User

```python
# ❌ Tweepy
api.create_friendship(screen_name="username")

# ✅ Xeepy
async with Xeepy() as x:
    await x.follow.user("username")
```

#### Search Tweets

```python
# ❌ Tweepy
tweets = api.search_tweets(q="python", count=100)

# ✅ Xeepy
async with Xeepy() as x:
    result = await x.scrape.search("python", limit=100)
    tweets = result.items
```

---

## From Snscrape to Xeepy

### Key Differences

| Feature | Snscrape | Xeepy |
|---------|----------|-------|
| Maintenance | Abandoned | Active |
| Actions | Read-only | Full actions |
| Rate Limits | Strict | Manageable |
| Anti-Detection | None | Built-in |

### Common Migrations

#### Scrape User Tweets

```python
# ❌ Snscrape
import snscrape.modules.twitter as sntwitter
tweets = []
for tweet in sntwitter.TwitterUserScraper("username").get_items():
    tweets.append(tweet)
    if len(tweets) >= 100:
        break

# ✅ Xeepy
async with Xeepy() as x:
    result = await x.scrape.tweets("username", limit=100)
    tweets = result.items
```

#### Search Tweets

```python
# ❌ Snscrape
for tweet in sntwitter.TwitterSearchScraper("python").get_items():
    print(tweet.content)

# ✅ Xeepy
async with Xeepy() as x:
    result = await x.scrape.search("python")
    for tweet in result.items:
        print(tweet.text)
```

---

## From Twitter API v2 to Xeepy

### Cost Comparison

| Twitter API Tier | Cost | Tweets/Month | Xeepy |
|------------------|------|--------------|-------|
| Free | $0 | 1,500 | Unlimited |
| Basic | $100 | 10,000 | Unlimited |
| Pro | $5,000 | 1,000,000 | Unlimited |
| Enterprise | $$$$ | Custom | Unlimited |

### Endpoint Mapping

| Twitter API v2 Endpoint | Xeepy Method |
|-------------------------|--------------|
| `GET /2/tweets/:id` | `x.scrape.tweet(url)` |
| `GET /2/users/:id` | `x.scrape.profile(username)` |
| `GET /2/users/:id/tweets` | `x.scrape.tweets(username)` |
| `GET /2/users/:id/followers` | `x.scrape.followers(username)` |
| `GET /2/users/:id/following` | `x.scrape.following(username)` |
| `POST /2/users/:id/likes` | `x.engage.like(url)` |
| `POST /2/users/:id/retweets` | `x.engage.retweet(url)` |
| `POST /2/users/:id/following` | `x.follow.user(username)` |
| `DELETE /2/users/:id/following` | `x.unfollow.user(username)` |
| `POST /2/tweets` | GraphQL API |
| `POST /2/dm_conversations` | `x.dm.send(message, recipients)` |

---

## Data Model Mapping

### Tweet Object

```python
# Twitter API v2 Tweet
{
    "id": "123456789",
    "text": "Hello world",
    "created_at": "2024-01-01T12:00:00.000Z",
    "author_id": "987654321",
    "public_metrics": {
        "like_count": 100,
        "retweet_count": 50
    }
}

# Xeepy Tweet
Tweet(
    id="123456789",
    text="Hello world",
    created_at=datetime(2024, 1, 1, 12, 0, 0),
    author=User(id="987654321", ...),
    likes=100,
    retweets=50
)
```

### User Object

```python
# Twitter API v2 User
{
    "id": "987654321",
    "username": "johndoe",
    "name": "John Doe",
    "public_metrics": {
        "followers_count": 1000,
        "following_count": 500
    }
}

# Xeepy User
User(
    id="987654321",
    username="johndoe",
    name="John Doe",
    followers_count=1000,
    following_count=500
)
```

---

## Migration Checklist

### Before You Start

- [ ] Backup your existing code
- [ ] Note your current API usage patterns
- [ ] Install Xeepy: `pip install xeepy`
- [ ] Install Playwright: `playwright install chromium`

### During Migration

- [ ] Replace authentication code
- [ ] Update method calls to new namespaces
- [ ] Handle `ScrapeResult` return types
- [ ] Remove manual rate limiting (now automatic)
- [ ] Update error handling

### After Migration

- [ ] Test all functionality
- [ ] Remove old library dependencies
- [ ] Update environment variables
- [ ] Review rate limit settings

---

## Common Issues

### 1. Async/Await Errors

All Xeepy methods are async:

```python
# ❌ Wrong
replies = x.scrape.replies(url)

# ✅ Correct
replies = await x.scrape.replies(url)
```

### 2. Browser Not Installed

```bash
# Install browser
playwright install chromium
```

### 3. Authentication Issues

```python
# Clear old session and re-authenticate
async with Xeepy() as x:
    await x.auth.login()  # Opens browser for manual login
    await x.auth.save_cookies("session.json")
```

### 4. Rate Limit Adjustments

```python
# Customize rate limits if needed
from xeepy.core.config import Config

config = Config()
config.rate_limits.actions_per_hour = 50
config.rate_limits.scrapes_per_hour = 200

async with Xeepy(config=config) as x:
    ...
```

---

## Getting Help

- 📖 [Documentation](https://xeepy.dev)
- 💬 [Discord Community](https://discord.gg/xeepy)
- 🐛 [GitHub Issues](https://github.com/nirholas/xeepy/issues)
- 🤝 [Contributing](community/contributing.md)

---

## See Also

- [Quick Start Guide](getting-started/quickstart.md)
- [Installation](getting-started/installation.md)
- [Configuration](getting-started/configuration.md)
- [API Reference](api/index.md)

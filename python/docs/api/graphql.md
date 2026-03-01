# GraphQLClient

Direct access to X/Twitter GraphQL API for higher rate limits and batch operations.

## Import

```python
from xeepy.api.graphql import GraphQLClient
```

## Class Signature

```python
class GraphQLClient:
    def __init__(
        self,
        cookies: Union[Dict[str, str], str],
        proxy: Optional[str] = None
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `cookies` | `Union[Dict, str]` | Required | Auth cookies or path to cookies file |
| `proxy` | `Optional[str]` | `None` | Proxy URL |

## Required Cookies

| Cookie | Description |
|--------|-------------|
| `ct0` | CSRF token |
| `auth_token` | Authentication token |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `tweets_by_ids(ids)` | `List[Tweet]` | Batch fetch tweets |
| `users_by_ids(ids)` | `List[User]` | Batch fetch users |
| `get_user(username)` | `User` | Get single user |
| `get_tweet(id)` | `Tweet` | Get single tweet |
| `get_user_tweets(user_id)` | `Tuple[List[Tweet], str]` | Get user timeline |
| `like(tweet_id)` | `bool` | Like a tweet |
| `retweet(tweet_id)` | `bool` | Retweet |
| `bookmark(tweet_id)` | `bool` | Bookmark tweet |
| `follow(user_id)` | `bool` | Follow user |
| `tweet(text, media_ids)` | `Tweet` | Post tweet |
| `search(query, search_type)` | `Tuple[List[Tweet], str]` | Search tweets |
| `close()` | `None` | Close client |

### `tweets_by_ids`

```python
async def tweets_by_ids(
    self,
    tweet_ids: List[str],
    batch_size: int = 220
) -> List[Tweet]
```

Batch fetch up to 220 tweets per request.

**Rate Limit:** 500 requests / 15 minutes (vs 50 for single)

### `users_by_ids`

```python
async def users_by_ids(
    self,
    user_ids: List[str],
    batch_size: int = 100
) -> List[User]
```

Batch fetch up to 100 users per request.

### `search`

```python
async def search(
    self,
    query: str,
    search_type: str = "Latest",
    cursor: Optional[str] = None,
    limit: int = 20
) -> Tuple[List[Tweet], Optional[str]]
```

Search tweets.

**Parameters:**
- `query`: Search query
- `search_type`: `Latest`, `Top`, `People`, `Photos`, `Videos`
- `cursor`: Pagination cursor
- `limit`: Results per page

## Usage Examples

### Initialize with Cookies

```python
from xeepy.api.graphql import GraphQLClient

# From dictionary
gql = GraphQLClient(cookies={
    "ct0": "your-csrf-token",
    "auth_token": "your-auth-token"
})

# From file
gql = GraphQLClient(cookies="cookies.json")
```

### Batch Fetch Tweets

```python
from xeepy.api.graphql import GraphQLClient

async def main():
    gql = GraphQLClient(cookies="cookies.json")
    
    tweet_ids = ["123456", "789012", "345678", ...]  # Up to 220
    
    tweets = await gql.tweets_by_ids(tweet_ids)
    
    for tweet in tweets:
        print(f"@{tweet.author.username}: {tweet.text[:50]}...")
        print(f"  Likes: {tweet.like_count:,}")
    
    await gql.close()

asyncio.run(main())
```

### Batch Fetch Users

```python
from xeepy.api.graphql import GraphQLClient

async def main():
    gql = GraphQLClient(cookies="cookies.json")
    
    user_ids = ["123", "456", "789", ...]  # Up to 100
    
    users = await gql.users_by_ids(user_ids)
    
    for user in users:
        print(f"@{user.username}: {user.followers_count:,} followers")
    
    await gql.close()

asyncio.run(main())
```

### Get Single User

```python
from xeepy.api.graphql import GraphQLClient

async def main():
    gql = GraphQLClient(cookies="cookies.json")
    
    user = await gql.get_user("elonmusk")
    
    print(f"@{user.username}")
    print(f"Name: {user.name}")
    print(f"Followers: {user.followers_count:,}")
    print(f"Following: {user.following_count:,}")
    
    await gql.close()

asyncio.run(main())
```

### Get User Timeline

```python
from xeepy.api.graphql import GraphQLClient

async def main():
    gql = GraphQLClient(cookies="cookies.json")
    
    user = await gql.get_user("username")
    
    # Get first page
    tweets, cursor = await gql.get_user_tweets(user.id, limit=20)
    
    for tweet in tweets:
        print(f"{tweet.created_at}: {tweet.text[:50]}...")
    
    # Get next page
    if cursor:
        more_tweets, next_cursor = await gql.get_user_tweets(
            user.id, limit=20, cursor=cursor
        )
    
    await gql.close()

asyncio.run(main())
```

### Search Tweets

```python
from xeepy.api.graphql import GraphQLClient

async def main():
    gql = GraphQLClient(cookies="cookies.json")
    
    # Search latest tweets
    tweets, cursor = await gql.search("Python programming", search_type="Latest")
    
    print(f"Found {len(tweets)} tweets:")
    for tweet in tweets:
        print(f"  @{tweet.author.username}: {tweet.text[:50]}...")
    
    # Get more results
    if cursor:
        more, next_cursor = await gql.search(
            "Python programming",
            search_type="Latest",
            cursor=cursor
        )
    
    await gql.close()

asyncio.run(main())
```

### Engagement Actions

```python
from xeepy.api.graphql import GraphQLClient

async def main():
    gql = GraphQLClient(cookies="cookies.json")
    
    tweet_id = "123456789"
    
    # Like
    await gql.like(tweet_id)
    print("Liked!")
    
    # Retweet
    await gql.retweet(tweet_id)
    print("Retweeted!")
    
    # Bookmark
    await gql.bookmark(tweet_id)
    print("Bookmarked!")
    
    await gql.close()

asyncio.run(main())
```

### Follow User

```python
from xeepy.api.graphql import GraphQLClient

async def main():
    gql = GraphQLClient(cookies="cookies.json")
    
    # Get user ID first
    user = await gql.get_user("username")
    
    # Follow
    await gql.follow(user.id)
    print(f"Followed @{user.username}")
    
    await gql.close()

asyncio.run(main())
```

### Post Tweet

```python
from xeepy.api.graphql import GraphQLClient

async def main():
    gql = GraphQLClient(cookies="cookies.json")
    
    # Simple tweet
    tweet = await gql.tweet("Hello from Xeepy! 🚀")
    print(f"Posted: {tweet.url}")
    
    # With media (upload media first)
    # tweet = await gql.tweet("Check this out!", media_ids=["123456"])
    
    await gql.close()

asyncio.run(main())
```

### Context Manager

```python
from xeepy.api.graphql import GraphQLClient

async def main():
    async with GraphQLClient(cookies="cookies.json") as gql:
        user = await gql.get_user("username")
        print(f"@{user.username}: {user.followers_count:,}")

asyncio.run(main())
```

### High-Volume Scraping

```python
from xeepy.api.graphql import GraphQLClient

async def scrape_large_dataset(tweet_ids: list):
    gql = GraphQLClient(cookies="cookies.json")
    
    all_tweets = []
    
    # Process in batches of 220
    for i in range(0, len(tweet_ids), 220):
        batch = tweet_ids[i:i+220]
        tweets = await gql.tweets_by_ids(batch)
        all_tweets.extend(tweets)
        print(f"Fetched {len(all_tweets)}/{len(tweet_ids)}")
    
    await gql.close()
    return all_tweets

# Can fetch 110,000 tweets in 15 minutes (500 requests × 220 tweets)
asyncio.run(scrape_large_dataset(tweet_ids))
```

### With Proxy

```python
from xeepy.api.graphql import GraphQLClient

gql = GraphQLClient(
    cookies="cookies.json",
    proxy="http://user:pass@proxy:8080"
)
```

### Error Handling

```python
from xeepy.api.graphql import GraphQLClient, GraphQLError

async def safe_fetch():
    gql = GraphQLClient(cookies="cookies.json")
    
    try:
        tweets = await gql.tweets_by_ids(["123", "456"])
        return tweets
    except GraphQLError as e:
        print(f"GraphQL error: {e}")
        return []
    finally:
        await gql.close()

asyncio.run(safe_fetch())
```

### Extract Cookies from Browser

```python
from xeepy.core.auth import AuthManager
from xeepy.api.graphql import GraphQLClient

async def main():
    # Extract from Chrome
    auth = AuthManager()
    await auth.import_cookies_from_browser("chrome")
    cookies = auth.get_auth_tokens()
    
    # Use with GraphQL
    gql = GraphQLClient(cookies=cookies)
    user = await gql.get_user("username")
    
    await gql.close()

asyncio.run(main())
```

## Rate Limits

| Endpoint | Rate Limit | Notes |
|----------|------------|-------|
| Batch tweets | 500 / 15min | 220 tweets per request |
| Batch users | 500 / 15min | 100 users per request |
| Single tweet | 50 / 15min | |
| Single user | 95 / 15min | |
| Search | 50 / 15min | |
| Like/Retweet | 50 / 15min | |

## See Also

- [APIServer](server.md) - REST API server
- [AuthManager](core/auth.md) - Cookie management
- [RateLimiter](core/rate_limiter.md) - Rate limiting

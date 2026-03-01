# EngageActions

Actions for engaging with tweets: like, retweet, reply, bookmark, and quote.

## Import

```python
from xeepy.actions.engage import EngageActions
```

## Class Signature

```python
class EngageActions:
    def __init__(
        self,
        browser_manager: BrowserManager,
        rate_limiter: Optional[RateLimiter] = None
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `browser_manager` | `BrowserManager` | Required | Browser manager instance |
| `rate_limiter` | `Optional[RateLimiter]` | `None` | Rate limiter instance |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `like(tweet_url)` | `bool` | Like a tweet |
| `unlike(tweet_url)` | `bool` | Unlike a tweet |
| `retweet(tweet_url)` | `bool` | Retweet a tweet |
| `unretweet(tweet_url)` | `bool` | Undo retweet |
| `reply(tweet_url, text)` | `Tweet` | Reply to a tweet |
| `quote(tweet_url, text)` | `Tweet` | Quote tweet |
| `bookmark(tweet_url)` | `bool` | Bookmark a tweet |
| `unbookmark(tweet_url)` | `bool` | Remove bookmark |
| `auto_like(keywords, limit)` | `EngageResult` | Auto-like by keywords |

### `like`

```python
async def like(
    self,
    tweet_url: str,
    check_existing: bool = True
) -> bool
```

Like a specific tweet.

**Parameters:**
- `tweet_url`: URL of the tweet to like
- `check_existing`: Skip if already liked

### `reply`

```python
async def reply(
    self,
    tweet_url: str,
    text: str,
    media: Optional[List[str]] = None
) -> Tweet
```

Reply to a tweet.

**Parameters:**
- `tweet_url`: URL of the tweet to reply to
- `text`: Reply text content
- `media`: Optional media file paths

### `quote`

```python
async def quote(
    self,
    tweet_url: str,
    text: str,
    media: Optional[List[str]] = None
) -> Tweet
```

Quote tweet with comment.

### `auto_like`

```python
async def auto_like(
    self,
    keywords: List[str],
    limit: int = 50,
    search_type: str = "latest",
    delay_range: Tuple[float, float] = (2.0, 5.0),
    min_followers: int = 100
) -> EngageResult
```

Automatically like tweets matching keywords.

**Parameters:**
- `keywords`: Keywords to search for
- `limit`: Maximum tweets to like
- `search_type`: Search type (`latest`, `top`)
- `delay_range`: Delay between likes
- `min_followers`: Min author followers

## EngageResult Object

```python
@dataclass
class EngageResult:
    liked: List[str]                 # Successfully liked tweet IDs
    retweeted: List[str]             # Successfully retweeted
    replied: List[str]               # Successfully replied
    failed: List[Dict]               # Failed actions with errors
    total_engagement: int            # Total successful actions
```

## Usage Examples

### Like a Tweet

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        success = await x.engage.like(
            "https://x.com/user/status/123456789"
        )
        
        if success:
            print("Tweet liked!")
        else:
            print("Failed to like or already liked")

asyncio.run(main())
```

### Retweet

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        success = await x.engage.retweet(
            "https://x.com/user/status/123456789"
        )
        
        print("Retweeted!" if success else "Failed to retweet")

asyncio.run(main())
```

### Reply to Tweet

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        reply = await x.engage.reply(
            "https://x.com/user/status/123456789",
            "Great tweet! Thanks for sharing 🙏"
        )
        
        print(f"Reply posted: {reply.id}")

asyncio.run(main())
```

### Reply with Media

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        reply = await x.engage.reply(
            "https://x.com/user/status/123456789",
            "Check out this image!",
            media=["screenshot.png"]
        )
        
        print(f"Reply with media posted: {reply.id}")

asyncio.run(main())
```

### Quote Tweet

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        quote = await x.engage.quote(
            "https://x.com/user/status/123456789",
            "This is so important! Everyone should read this thread 👇"
        )
        
        print(f"Quote tweet posted: {quote.id}")

asyncio.run(main())
```

### Bookmark Tweet

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        await x.engage.bookmark("https://x.com/user/status/123")
        print("Tweet bookmarked!")
        
        # Remove bookmark later
        await x.engage.unbookmark("https://x.com/user/status/123")
        print("Bookmark removed!")

asyncio.run(main())
```

### Auto-Like by Keywords

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.engage.auto_like(
            keywords=["python", "programming"],
            limit=50,
            search_type="latest",
            delay_range=(3.0, 8.0),
            min_followers=500
        )
        
        print(f"Liked {len(result.liked)} tweets")
        print(f"Failed: {len(result.failed)}")

asyncio.run(main())
```

### Batch Engagement

```python
from xeepy import Xeepy

async def engage_with_tweets(tweet_urls: list):
    async with Xeepy() as x:
        results = {"liked": 0, "retweeted": 0, "failed": 0}
        
        for url in tweet_urls:
            try:
                await x.engage.like(url)
                results["liked"] += 1
                
                await x.engage.retweet(url)
                results["retweeted"] += 1
                
                await asyncio.sleep(random.uniform(5, 15))
            except Exception as e:
                results["failed"] += 1
                print(f"Failed {url}: {e}")
        
        return results

asyncio.run(engage_with_tweets(urls))
```

### Smart Auto-Engagement

```python
from xeepy import Xeepy

async def smart_engage(keywords: list, daily_limit: int = 100):
    """Engage smartly with content matching keywords."""
    async with Xeepy() as x:
        engaged = 0
        
        for keyword in keywords:
            if engaged >= daily_limit:
                break
            
            # Search for tweets
            results = await x.scrape.search(
                keyword,
                search_type="latest",
                limit=30
            )
            
            for tweet in results.items:
                if engaged >= daily_limit:
                    break
                
                # Skip low-quality accounts
                if tweet.author.followers_count < 100:
                    continue
                
                # Like the tweet
                url = f"https://x.com/{tweet.author.username}/status/{tweet.id}"
                await x.engage.like(url)
                engaged += 1
                
                # Random delay
                await asyncio.sleep(random.uniform(10, 30))
        
        print(f"Engaged with {engaged} tweets")

asyncio.run(smart_engage(["#python", "#datascience"]))
```

## See Also

- [FollowActions](follow.md) - Follow operations
- [SearchScraper](../scrapers/search.md) - Search functionality
- [Tweet Model](../models/tweet.md) - Tweet data structure

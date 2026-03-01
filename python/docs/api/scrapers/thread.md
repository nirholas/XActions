# ThreadScraper

Scrapes and unrolls Twitter/X threads into a complete conversation.

## Import

```python
from xeepy.scrapers.thread import ThreadScraper
```

## Class Signature

```python
class ThreadScraper:
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
| `scrape(tweet_url)` | `Thread` | Unroll a thread |
| `scrape_from_tweet(tweet_id)` | `Thread` | Unroll from tweet ID |
| `is_thread(tweet_url)` | `bool` | Check if tweet is part of thread |
| `get_thread_length(tweet_url)` | `int` | Count tweets in thread |

### `scrape`

```python
async def scrape(
    self,
    tweet_url: str,
    include_media: bool = True
) -> Thread
```

Unroll a complete thread from any tweet in the thread.

**Parameters:**
- `tweet_url`: URL of any tweet in the thread
- `include_media`: Include media attachments

**Returns:** `Thread` object containing all tweets in order

### `scrape_from_tweet`

```python
async def scrape_from_tweet(
    self,
    tweet_id: str,
    include_media: bool = True
) -> Thread
```

Unroll thread using tweet ID.

### `is_thread`

```python
async def is_thread(self, tweet_url: str) -> bool
```

Check if a tweet is part of a thread.

### `get_thread_length`

```python
async def get_thread_length(self, tweet_url: str) -> int
```

Get the number of tweets in a thread without full scrape.

## Thread Object

```python
@dataclass
class Thread:
    author: User                     # Thread author
    tweets: List[Tweet]              # Ordered list of tweets
    total_tweets: int                # Number of tweets
    created_at: datetime             # First tweet timestamp
    total_likes: int                 # Sum of all likes
    total_retweets: int              # Sum of all retweets
    total_replies: int               # Sum of all replies
    
    def to_text(self) -> str:
        """Convert thread to readable text."""
        pass
    
    def to_markdown(self) -> str:
        """Convert thread to markdown format."""
        pass
```

## Usage Examples

### Basic Thread Unrolling

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        thread = await x.scrape.thread(
            "https://x.com/user/status/123456789"
        )
        
        print(f"Thread by @{thread.author.username}")
        print(f"Total tweets: {thread.total_tweets}")
        print("=" * 50)
        
        for i, tweet in enumerate(thread.tweets, 1):
            print(f"\n[{i}/{thread.total_tweets}]")
            print(tweet.text)
            print(f"❤️ {tweet.like_count}")

asyncio.run(main())
```

### Export Thread as Text

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        thread = await x.scrape.thread(
            "https://x.com/user/status/123456789"
        )
        
        # Export as plain text
        text = thread.to_text()
        with open("thread.txt", "w") as f:
            f.write(text)
        
        # Export as markdown
        markdown = thread.to_markdown()
        with open("thread.md", "w") as f:
            f.write(markdown)

asyncio.run(main())
```

### Check Thread Before Scraping

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        url = "https://x.com/user/status/123"
        
        if await x.scrape.is_thread(url):
            length = await x.scrape.thread_length(url)
            print(f"This is a thread with {length} tweets")
            
            thread = await x.scrape.thread(url)
            # Process thread...
        else:
            print("This is a single tweet")

asyncio.run(main())
```

### Thread Analytics

```python
from xeepy import Xeepy

async def analyze_thread(url: str):
    async with Xeepy() as x:
        thread = await x.scrape.thread(url)
        
        print(f"Thread Analytics for @{thread.author.username}")
        print("=" * 50)
        print(f"Total tweets: {thread.total_tweets}")
        print(f"Total likes: {thread.total_likes:,}")
        print(f"Total retweets: {thread.total_retweets:,}")
        print(f"Total replies: {thread.total_replies:,}")
        
        avg_likes = thread.total_likes / thread.total_tweets
        print(f"Avg likes per tweet: {avg_likes:.1f}")
        
        # Find best performing tweet in thread
        best = max(thread.tweets, key=lambda t: t.like_count)
        print(f"\nBest performing tweet ({best.like_count} likes):")
        print(f"  {best.text[:100]}...")

asyncio.run(analyze_thread("https://x.com/user/status/123"))
```

### Batch Thread Export

```python
from xeepy import Xeepy
import json

async def export_threads(urls: list):
    async with Xeepy() as x:
        threads_data = []
        
        for url in urls:
            try:
                thread = await x.scrape.thread(url)
                threads_data.append({
                    "author": thread.author.username,
                    "tweets": [t.text for t in thread.tweets],
                    "total_likes": thread.total_likes,
                    "url": url
                })
            except Exception as e:
                print(f"Failed to scrape {url}: {e}")
        
        with open("threads.json", "w") as f:
            json.dump(threads_data, f, indent=2)

urls = [
    "https://x.com/user1/status/123",
    "https://x.com/user2/status/456"
]
asyncio.run(export_threads(urls))
```

## See Also

- [Tweet Model](../models/tweet.md) - Tweet data structure
- [TweetsScraper](tweets.md) - User timeline scraping
- [RepliesScraper](replies.md) - Tweet replies

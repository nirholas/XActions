# TweetsScraper

Scrapes tweets from a user's profile timeline.

## Import

```python
from xeepy.scrapers.tweets import TweetsScraper
```

## Class Signature

```python
class TweetsScraper:
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
| `scrape(username, limit)` | `ScrapeResult[Tweet]` | Get user's tweets |
| `scrape_with_replies(username)` | `ScrapeResult[Tweet]` | Include replies |
| `scrape_media_only(username)` | `ScrapeResult[Tweet]` | Media tweets only |
| `scrape_by_date_range(username, start, end)` | `ScrapeResult[Tweet]` | Filter by date |
| `get_tweet(tweet_id)` | `Tweet` | Get single tweet by ID |

### `scrape`

```python
async def scrape(
    self,
    username: str,
    limit: int = 100,
    include_retweets: bool = True,
    include_replies: bool = False,
    cursor: Optional[str] = None
) -> ScrapeResult[Tweet]
```

Scrape tweets from a user's timeline.

**Parameters:**
- `username`: Target username
- `limit`: Maximum tweets to fetch
- `include_retweets`: Include retweets
- `include_replies`: Include reply tweets
- `cursor`: Pagination cursor

**Returns:** `ScrapeResult` containing `Tweet` objects

### `scrape_by_date_range`

```python
async def scrape_by_date_range(
    self,
    username: str,
    start_date: datetime,
    end_date: datetime,
    limit: int = 1000
) -> ScrapeResult[Tweet]
```

Scrape tweets within a specific date range.

### `get_tweet`

```python
async def get_tweet(self, tweet_id: str) -> Tweet
```

Get a single tweet by its ID.

## Tweet Object

```python
@dataclass
class Tweet:
    id: str                          # Tweet ID
    text: str                        # Tweet content
    author: User                     # Author info
    created_at: datetime             # Post time
    like_count: int                  # Number of likes
    retweet_count: int               # Number of retweets
    reply_count: int                 # Number of replies
    quote_count: int                 # Number of quotes
    view_count: Optional[int]        # View count
    language: str                    # Detected language
    source: str                      # Posted from (device/app)
    is_retweet: bool                 # Is a retweet
    is_reply: bool                   # Is a reply
    is_quote: bool                   # Is a quote tweet
    retweeted_tweet: Optional[Tweet] # Original if retweet
    quoted_tweet: Optional[Tweet]    # Quoted tweet
    in_reply_to_id: Optional[str]    # Reply parent ID
    media: List[Media]               # Attached media
    urls: List[str]                  # URLs in tweet
    hashtags: List[str]              # Hashtags used
    mentions: List[str]              # Mentioned users
```

## Usage Examples

### Basic Tweet Scraping

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.tweets("elonmusk", limit=100)
        
        for tweet in result.items:
            print(f"[{tweet.created_at}] {tweet.text[:50]}...")
            print(f"  ❤️ {tweet.like_count} | 🔄 {tweet.retweet_count}")

asyncio.run(main())
```

### Filter Retweets and Replies

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Original tweets only
        result = await x.scrape.tweets(
            "username",
            limit=200,
            include_retweets=False,
            include_replies=False
        )
        
        print(f"Found {len(result.items)} original tweets")

asyncio.run(main())
```

### Scrape by Date Range

```python
from xeepy import Xeepy
from datetime import datetime, timedelta

async def main():
    async with Xeepy() as x:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        result = await x.scrape.tweets_by_date(
            "username",
            start_date=start_date,
            end_date=end_date
        )
        
        print(f"Tweets in last 30 days: {len(result.items)}")

asyncio.run(main())
```

### Analyze Tweet Performance

```python
from xeepy import Xeepy

async def analyze_tweets(username: str):
    async with Xeepy() as x:
        result = await x.scrape.tweets(username, limit=500)
        
        total_likes = sum(t.like_count for t in result.items)
        total_retweets = sum(t.retweet_count for t in result.items)
        
        avg_likes = total_likes / len(result.items)
        avg_retweets = total_retweets / len(result.items)
        
        # Find best performing tweet
        best_tweet = max(result.items, key=lambda t: t.like_count)
        
        print(f"Analyzed {len(result.items)} tweets")
        print(f"Avg likes: {avg_likes:.1f}")
        print(f"Avg retweets: {avg_retweets:.1f}")
        print(f"Best tweet ({best_tweet.like_count} likes):")
        print(f"  {best_tweet.text[:100]}...")

asyncio.run(analyze_tweets("username"))
```

### Export Media Tweets

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.tweets_media_only("username", limit=100)
        
        media_data = []
        for tweet in result.items:
            for media in tweet.media:
                media_data.append({
                    "tweet_id": tweet.id,
                    "media_type": media.type,
                    "media_url": media.url,
                    "likes": tweet.like_count
                })
        
        x.export.to_csv(media_data, "media_tweets.csv")

asyncio.run(main())
```

## See Also

- [Tweet Model](../models/tweet.md) - Tweet data structure
- [RepliesScraper](replies.md) - Get tweet replies
- [MediaScraper](media.md) - Media-focused scraping

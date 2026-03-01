# Tweet

Data model representing a tweet/post on X/Twitter.

## Import

```python
from xeepy.models import Tweet
```

## Class Signature

```python
@dataclass
class Tweet:
    id: str
    text: str
    author: User
    created_at: datetime
    like_count: int = 0
    retweet_count: int = 0
    reply_count: int = 0
    quote_count: int = 0
    view_count: int = 0
    bookmark_count: int = 0
    url: str = ""
    conversation_id: Optional[str] = None
    in_reply_to_id: Optional[str] = None
    in_reply_to_user: Optional[str] = None
    is_retweet: bool = False
    is_quote: bool = False
    is_reply: bool = False
    media: List[Media] = field(default_factory=list)
    hashtags: List[str] = field(default_factory=list)
    mentions: List[str] = field(default_factory=list)
    urls: List[str] = field(default_factory=list)
    language: Optional[str] = None
    source: Optional[str] = None
    is_sensitive: bool = False
    poll: Optional[Poll] = None
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `str` | Unique tweet ID |
| `text` | `str` | Tweet content |
| `author` | `User` | Tweet author |
| `created_at` | `datetime` | Creation timestamp |
| `like_count` | `int` | Number of likes |
| `retweet_count` | `int` | Number of retweets |
| `reply_count` | `int` | Number of replies |
| `quote_count` | `int` | Number of quote tweets |
| `view_count` | `int` | Number of views |
| `bookmark_count` | `int` | Number of bookmarks |
| `url` | `str` | Full tweet URL |
| `conversation_id` | `str` | Thread conversation ID |
| `in_reply_to_id` | `str` | Parent tweet ID if reply |
| `in_reply_to_user` | `str` | Parent tweet author |
| `is_retweet` | `bool` | Is a retweet |
| `is_quote` | `bool` | Is a quote tweet |
| `is_reply` | `bool` | Is a reply |
| `media` | `List[Media]` | Attached media |
| `hashtags` | `List[str]` | Hashtags used |
| `mentions` | `List[str]` | Users mentioned |
| `urls` | `List[str]` | URLs in tweet |
| `language` | `str` | Detected language |
| `source` | `str` | Client used to post |
| `is_sensitive` | `bool` | Marked as sensitive |
| `poll` | `Poll` | Poll if present |

## Computed Properties

```python
@property
def engagement_rate(self) -> float:
    """Calculate engagement rate."""
    
@property
def total_engagement(self) -> int:
    """Sum of all engagement metrics."""
    
@property
def has_media(self) -> bool:
    """Check if tweet has media."""
    
@property
def is_thread(self) -> bool:
    """Check if part of a thread."""
```

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `to_dict()` | `Dict` | Convert to dictionary |
| `from_dict(data)` | `Tweet` | Create from dictionary |
| `from_api(data)` | `Tweet` | Create from API response |

## Usage Examples

### Access Tweet Data

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        tweets = await x.scrape.tweets("username", limit=10)
        
        for tweet in tweets.items:
            print(f"ID: {tweet.id}")
            print(f"Text: {tweet.text}")
            print(f"Author: @{tweet.author.username}")
            print(f"Posted: {tweet.created_at}")
            print(f"Likes: {tweet.like_count:,}")
            print(f"Retweets: {tweet.retweet_count:,}")
            print(f"Views: {tweet.view_count:,}")
            print(f"URL: {tweet.url}")
            print("---")

asyncio.run(main())
```

### Check Tweet Type

```python
from xeepy import Xeepy

async def categorize_tweets(username: str):
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(username, limit=100)
        
        original = [t for t in tweets.items if not t.is_retweet and not t.is_reply]
        replies = [t for t in tweets.items if t.is_reply]
        retweets = [t for t in tweets.items if t.is_retweet]
        quotes = [t for t in tweets.items if t.is_quote]
        
        print(f"Original: {len(original)}")
        print(f"Replies: {len(replies)}")
        print(f"Retweets: {len(retweets)}")
        print(f"Quotes: {len(quotes)}")

asyncio.run(categorize_tweets("username"))
```

### Access Media

```python
from xeepy import Xeepy

async def get_media_tweets(username: str):
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(username, limit=50)
        
        for tweet in tweets.items:
            if tweet.has_media:
                print(f"Tweet: {tweet.text[:50]}...")
                for media in tweet.media:
                    print(f"  - {media.type}: {media.url}")

asyncio.run(get_media_tweets("username"))
```

### Calculate Engagement

```python
from xeepy import Xeepy

async def top_engagement(username: str):
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(username, limit=100)
        
        # Sort by engagement
        sorted_tweets = sorted(
            tweets.items,
            key=lambda t: t.total_engagement,
            reverse=True
        )
        
        print("Top 10 by engagement:")
        for tweet in sorted_tweets[:10]:
            print(f"{tweet.total_engagement:,} - {tweet.text[:40]}...")
            print(f"  Rate: {tweet.engagement_rate:.2f}%")

asyncio.run(top_engagement("username"))
```

### Extract Hashtags

```python
from xeepy import Xeepy
from collections import Counter

async def popular_hashtags(username: str):
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(username, limit=200)
        
        all_hashtags = []
        for tweet in tweets.items:
            all_hashtags.extend(tweet.hashtags)
        
        counter = Counter(all_hashtags)
        
        print("Most used hashtags:")
        for tag, count in counter.most_common(10):
            print(f"  #{tag}: {count}")

asyncio.run(popular_hashtags("username"))
```

### Filter by Content

```python
from xeepy import Xeepy

async def filter_tweets(username: str):
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(username, limit=100)
        
        # Tweets with links
        with_links = [t for t in tweets.items if t.urls]
        print(f"With links: {len(with_links)}")
        
        # Tweets with mentions
        with_mentions = [t for t in tweets.items if t.mentions]
        print(f"With mentions: {len(with_mentions)}")
        
        # Long tweets
        long_tweets = [t for t in tweets.items if len(t.text) > 200]
        print(f"Long tweets: {len(long_tweets)}")

asyncio.run(filter_tweets("username"))
```

### Convert to Dictionary

```python
from xeepy import Xeepy
import json

async def export_tweet(tweet_url: str):
    async with Xeepy() as x:
        # Get single tweet
        tweet = await x.scrape.tweet(tweet_url)
        
        # Convert to dict
        data = tweet.to_dict()
        
        # Save as JSON
        with open("tweet.json", "w") as f:
            json.dump(data, f, indent=2, default=str)

asyncio.run(export_tweet("https://x.com/user/status/123"))
```

### Access Poll Data

```python
from xeepy import Xeepy

async def get_poll_tweet(tweet_url: str):
    async with Xeepy() as x:
        tweet = await x.scrape.tweet(tweet_url)
        
        if tweet.poll:
            print(f"Poll question: {tweet.text}")
            print(f"Total votes: {tweet.poll.total_votes:,}")
            print(f"Status: {tweet.poll.status}")
            
            for option in tweet.poll.options:
                bar = "█" * int(option.percentage / 5)
                print(f"  {option.label}: {bar} {option.percentage:.1f}%")

asyncio.run(get_poll_tweet("https://x.com/user/status/123"))
```

### Thread Detection

```python
from xeepy import Xeepy

async def get_threads(username: str):
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(username, limit=100)
        
        # Group by conversation
        conversations = {}
        for tweet in tweets.items:
            if tweet.conversation_id:
                if tweet.conversation_id not in conversations:
                    conversations[tweet.conversation_id] = []
                conversations[tweet.conversation_id].append(tweet)
        
        # Find threads (2+ tweets in conversation by same author)
        threads = [
            tweets for tweets in conversations.values()
            if len(tweets) >= 2
        ]
        
        print(f"Found {len(threads)} threads")

asyncio.run(get_threads("username"))
```

## See Also

- [User](user.md) - User data model
- [Engagement](engagement.md) - Engagement model
- [TweetsScraper](../scrapers/tweets.md) - Scraping tweets

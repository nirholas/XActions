# Scraping Replies

Learn how to scrape all replies to any tweet, with filtering, threading, and export options.

## Basic Usage

```python
from xeepy import Xeepy

async with Xeepy() as x:
    replies = await x.scrape.replies(
        "https://x.com/elonmusk/status/1234567890"
    )
    
    for reply in replies:
        print(f"@{reply.author.username}: {reply.text}")
```

## Parameters

```python
replies = await x.scrape.replies(
    url: str,              # Tweet URL or ID
    limit: int = 100,      # Max replies to scrape
    include_author_replies: bool = True,  # Include OP's replies
    sort_by: str = "top",  # "top", "recent", "controversial"
    min_likes: int = 0,    # Filter by minimum likes
    verified_only: bool = False,  # Only verified accounts
)
```

## Advanced Examples

### Get All Replies (No Limit)

```python
async with Xeepy() as x:
    # Warning: Can be slow for viral tweets
    replies = await x.scrape.replies(
        tweet_url,
        limit=None  # Get all available replies
    )
```

### Filter High-Engagement Replies

```python
async with Xeepy() as x:
    replies = await x.scrape.replies(
        tweet_url,
        limit=500,
        min_likes=10,  # Only replies with 10+ likes
        sort_by="top"
    )
```

### Stream Replies in Real-Time

```python
async with Xeepy() as x:
    async for reply in x.scrape.replies_stream(tweet_url):
        print(f"New reply: {reply.text[:50]}...")
        
        # Process each reply as it arrives
        if "question" in reply.text.lower():
            await notify_about_question(reply)
```

### Get Reply Threads

```python
async with Xeepy() as x:
    # Get replies with their nested replies
    replies = await x.scrape.replies(
        tweet_url,
        include_nested=True,  # Get replies to replies
        max_depth=3           # How deep to go
    )
    
    for reply in replies:
        print(f"@{reply.author.username}: {reply.text}")
        for nested in reply.replies:
            print(f"  └─ @{nested.author.username}: {nested.text}")
```

### Analyze Sentiment of Replies

```python
from xeepy import Xeepy
from xeepy.ai import ContentGenerator

async with Xeepy() as x:
    replies = await x.scrape.replies(tweet_url, limit=100)
    
    ai = ContentGenerator(provider="openai")
    
    sentiments = {"positive": 0, "negative": 0, "neutral": 0}
    
    for reply in replies:
        result = await ai.analyze_sentiment(reply.text)
        sentiments[result.label] += 1
    
    print(f"Sentiment breakdown: {sentiments}")
```

## Export Replies

```python
async with Xeepy() as x:
    replies = await x.scrape.replies(tweet_url, limit=500)
    
    # CSV with all fields
    x.export.to_csv(replies, "replies.csv")
    
    # JSON for programmatic use
    x.export.to_json(replies, "replies.json")
    
    # Excel with formatting
    x.export.to_excel(replies, "replies.xlsx")
```

### Customize Export Fields

```python
async with Xeepy() as x:
    replies = await x.scrape.replies(tweet_url)
    
    # Export specific fields only
    x.export.to_csv(
        replies,
        "replies.csv",
        fields=["author.username", "text", "likes", "created_at"]
    )
```

## CLI Usage

```bash
# Basic scrape
xeepy scrape replies https://x.com/user/status/123

# With options
xeepy scrape replies https://x.com/user/status/123 \
    --limit 500 \
    --min-likes 5 \
    --sort top \
    --output replies.csv

# JSON output
xeepy scrape replies https://x.com/user/status/123 \
    --format json \
    --output replies.json
```

## Reply Data Model

```python
@dataclass
class Reply:
    id: str                    # Reply tweet ID
    text: str                  # Reply content
    author: User               # Author details
    created_at: datetime       # When posted
    likes: int                 # Like count
    retweets: int              # Retweet count
    replies: int               # Reply count
    url: str                   # Reply URL
    in_reply_to: str           # Parent tweet ID
    conversation_id: str       # Thread root ID
    is_author_reply: bool      # Is OP replying?
    media: List[Media]         # Attached media
    hashtags: List[str]        # Hashtags used
    mentions: List[str]        # Users mentioned
    nested_replies: List[Reply]  # Replies to this reply
```

## Use Cases

### Find Questions to Answer

```python
async with Xeepy() as x:
    replies = await x.scrape.replies(my_tweet_url)
    
    questions = [r for r in replies if "?" in r.text]
    
    print(f"Found {len(questions)} questions to answer:")
    for q in questions:
        print(f"  @{q.author.username}: {q.text}")
```

### Identify Influencer Replies

```python
async with Xeepy() as x:
    replies = await x.scrape.replies(tweet_url, limit=500)
    
    # Find replies from accounts with 10k+ followers
    influencer_replies = [
        r for r in replies 
        if r.author.followers_count >= 10000
    ]
    
    print(f"Influencer replies ({len(influencer_replies)}):")
    for r in influencer_replies:
        print(f"  @{r.author.username} ({r.author.followers_count:,} followers)")
```

### Build Community List from Engagers

```python
async with Xeepy() as x:
    # Get people who engage with your content
    replies = await x.scrape.replies(my_tweet_url)
    
    engaged_users = [r.author for r in replies]
    
    # Export for follow-up
    x.export.to_csv(engaged_users, "engaged_community.csv")
```

## Troubleshooting

??? question "Why am I getting fewer replies than expected?"
    
    X/Twitter's API doesn't return all replies. Hidden replies, spam-filtered
    replies, and very old replies may not be accessible.

??? question "Replies are loading slowly"
    
    Large reply threads require pagination. Consider:
    
    - Using `limit` to cap results
    - Using `min_likes` to filter
    - Using `sort_by="top"` to get best replies first

??? question "How do I get quote tweets?"
    
    Quote tweets are separate from replies. Use:
    ```python
    quotes = await x.scrape.quotes(tweet_url)
    ```

# Scraping Guide

Xeepy provides powerful, flexible scraping capabilities for X/Twitter. This guide covers all scraping features with detailed examples.

## Overview

Xeepy can scrape virtually any public data from X/Twitter:

<div class="grid cards" markdown>

-   :material-reply:{ .lg .middle } **[Replies](replies.md)**
    
    Scrape all replies to any tweet

-   :material-account:{ .lg .middle } **[Profiles](profiles.md)**
    
    Get detailed user profile information

-   :material-account-group:{ .lg .middle } **[Followers](followers.md)**
    
    Extract follower lists with metadata

-   :material-account-arrow-right:{ .lg .middle } **[Following](following.md)**
    
    Get who a user follows

-   :material-twitter:{ .lg .middle } **[Tweets](tweets.md)**
    
    Scrape user tweets and timelines

-   :material-link-variant:{ .lg .middle } **[Threads](threads.md)**
    
    Unroll and extract full threads

-   :material-magnify:{ .lg .middle } **[Search](search.md)**
    
    Search tweets with advanced filters

-   :material-pound:{ .lg .middle } **[Hashtags](hashtags.md)**
    
    Scrape tweets by hashtag

-   :material-image-multiple:{ .lg .middle } **[Media](media.md)**
    
    Extract images and videos

-   :material-format-list-bulleted:{ .lg .middle } **[Lists](lists.md)**
    
    Scrape list members and tweets

</div>

## Quick Start

```python
from xeepy import Xeepy

async with Xeepy() as x:
    # Scrape 100 replies to a tweet
    replies = await x.scrape.replies(
        "https://x.com/elonmusk/status/1234567890",
        limit=100
    )
    
    # Export to CSV
    x.export.to_csv(replies, "replies.csv")
```

## Common Patterns

### Scrape with Progress

```python
async with Xeepy() as x:
    async for tweet in x.scrape.tweets_stream("username", limit=1000):
        print(f"Got tweet: {tweet.text[:50]}...")
        
        # Process each tweet as it comes
        await process_tweet(tweet)
```

### Scrape Multiple Users

```python
async with Xeepy() as x:
    users = ["user1", "user2", "user3"]
    
    for user in users:
        tweets = await x.scrape.tweets(user, limit=100)
        x.export.to_csv(tweets, f"{user}_tweets.csv")
```

### Handle Large Datasets

```python
async with Xeepy() as x:
    # Scrape in batches to avoid memory issues
    async for batch in x.scrape.followers_batched("popular_user", batch_size=100):
        # Process and save each batch
        x.export.append_csv(batch, "followers.csv")
        print(f"Processed {len(batch)} followers")
```

## Rate Limiting

Xeepy automatically handles rate limiting to protect your account:

```python
async with Xeepy() as x:
    # Default: 20 requests/minute (safe)
    replies = await x.scrape.replies(url, limit=1000)
    
    # Customize rate limit
    x.config.rate_limit.requests_per_minute = 30
```

!!! warning "Be Respectful"
    Higher rate limits increase detection risk. Stick to defaults unless you have a specific need.

## Data Models

All scraped data uses typed models for consistency:

```python
# Tweet model
reply.id           # Tweet ID
reply.text         # Tweet content
reply.author       # User model
reply.created_at   # Datetime
reply.likes        # Like count
reply.retweets     # Retweet count
reply.replies      # Reply count
reply.url          # Tweet URL

# User model
user.id            # User ID
user.username      # Handle (without @)
user.name          # Display name
user.bio           # Bio/description
user.followers_count
user.following_count
user.tweet_count
user.verified
user.created_at
```

## Export Options

Every scraping function integrates with export:

```python
async with Xeepy() as x:
    data = await x.scrape.replies(url, limit=100)
    
    # Multiple export formats
    x.export.to_csv(data, "data.csv")
    x.export.to_json(data, "data.json")
    x.export.to_excel(data, "data.xlsx")
    x.export.to_parquet(data, "data.parquet")
    
    # Database export
    await x.export.to_database(data, "sqlite:///data.db")
```

## Best Practices

1. **Start small** - Test with `limit=10` before scaling up
2. **Use caching** - Avoid re-scraping the same data
3. **Respect rate limits** - Don't disable built-in protections
4. **Handle errors** - Network issues happen; use try/except
5. **Store incrementally** - Save data as you scrape for large jobs

## Detailed Guides

Choose a specific scraping topic:

- [Replies Scraping](replies.md) - Extract conversation threads
- [Profile Scraping](profiles.md) - Get user details
- [Followers Scraping](followers.md) - Build follower lists
- [Tweet Scraping](tweets.md) - Get user timelines
- [Search Scraping](search.md) - Find tweets by query
- [Hashtag Scraping](hashtags.md) - Monitor hashtag activity
- [Thread Unrolling](threads.md) - Extract full threads
- [Media Scraping](media.md) - Download images/videos

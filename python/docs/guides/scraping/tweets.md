# Scraping User Tweets

Extract tweets from any public Twitter profile to analyze content strategy, engagement patterns, and posting behavior.

## Overview

The tweets scraper retrieves a user's timeline including tweet text, media, engagement metrics, and metadata. This data powers content analysis, competitive research, and historical tweet archiving.

## Use Cases

- **Content Analysis**: Study what content performs best for an account
- **Competitive Intelligence**: Monitor competitor posting strategies
- **Historical Archive**: Back up tweets for research or compliance
- **Engagement Research**: Identify high-performing tweet patterns

## Basic Usage

```python
import asyncio
from xeepy import Xeepy

async def scrape_user_tweets():
    async with Xeepy() as x:
        # Get recent tweets from a user
        tweets = await x.scrape.tweets("elonmusk", limit=100)
        
        for tweet in tweets:
            print(f"{tweet.created_at}: {tweet.text[:50]}...")
            print(f"  Likes: {tweet.likes} | RTs: {tweet.retweets}")
        
        # Export for analysis
        x.export.to_csv(tweets, "user_tweets.csv")

asyncio.run(scrape_user_tweets())
```

## Advanced Filtering

```python
async def filtered_tweet_scrape():
    async with Xeepy() as x:
        # Scrape with advanced filters
        tweets = await x.scrape.tweets(
            username="techcrunch",
            limit=500,
            include_retweets=False,    # Original tweets only
            include_replies=False,      # No reply tweets
            min_likes=100,              # Only popular tweets
            media_only=False,           # Include text-only tweets
            since="2024-01-01",         # Date range start
            until="2024-12-31"          # Date range end
        )
        
        # Analyze engagement
        total_engagement = sum(t.likes + t.retweets for t in tweets)
        avg_engagement = total_engagement / len(tweets) if tweets else 0
        print(f"Average engagement: {avg_engagement:.1f}")

asyncio.run(filtered_tweet_scrape())
```

## Extracting Tweet Components

```python
async def extract_tweet_details():
    async with Xeepy() as x:
        tweets = await x.scrape.tweets("username", limit=50)
        
        for tweet in tweets:
            # Access all tweet properties
            print(f"ID: {tweet.id}")
            print(f"Text: {tweet.text}")
            print(f"Created: {tweet.created_at}")
            print(f"Likes: {tweet.likes}")
            print(f"Retweets: {tweet.retweets}")
            print(f"Replies: {tweet.reply_count}")
            print(f"Quotes: {tweet.quote_count}")
            print(f"Views: {tweet.views}")
            
            # Media attachments
            if tweet.media:
                for media in tweet.media:
                    print(f"Media: {media.type} - {media.url}")
            
            # Hashtags and mentions
            print(f"Hashtags: {tweet.hashtags}")
            print(f"Mentions: {tweet.mentions}")
            print(f"URLs: {tweet.urls}")

asyncio.run(extract_tweet_details())
```

## Batch Processing

```python
async def batch_tweet_analysis():
    async with Xeepy() as x:
        accounts = ["user1", "user2", "user3"]
        all_tweets = []
        
        for account in accounts:
            tweets = await x.scrape.tweets(account, limit=200)
            all_tweets.extend(tweets)
            print(f"Scraped {len(tweets)} tweets from @{account}")
        
        # Aggregate analysis
        top_tweets = sorted(all_tweets, key=lambda t: t.likes, reverse=True)[:10]
        print("\nTop 10 tweets by likes:")
        for t in top_tweets:
            print(f"@{t.author.username}: {t.likes} likes - {t.text[:40]}...")

asyncio.run(batch_tweet_analysis())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | str | required | Target username |
| `limit` | int | 100 | Maximum tweets to retrieve |
| `include_retweets` | bool | True | Include retweets |
| `include_replies` | bool | True | Include reply tweets |
| `min_likes` | int | 0 | Minimum likes filter |
| `media_only` | bool | False | Only tweets with media |
| `since` | str | None | Start date (YYYY-MM-DD) |
| `until` | str | None | End date (YYYY-MM-DD) |

!!! tip "Performance Optimization"
    For accounts with thousands of tweets, use date ranges to paginate through history efficiently. This prevents timeout issues and reduces memory usage.

!!! note "Tweet Availability"
    Twitter limits how far back you can retrieve tweets. Very old tweets may not be accessible through the standard timeline.

## Content Analysis Example

```python
async def analyze_content_strategy():
    async with Xeepy() as x:
        tweets = await x.scrape.tweets("username", limit=500)
        
        # Categorize by content type
        with_media = [t for t in tweets if t.media]
        with_links = [t for t in tweets if t.urls]
        questions = [t for t in tweets if "?" in t.text]
        
        print(f"Tweets with media: {len(with_media)} ({len(with_media)/len(tweets)*100:.1f}%)")
        print(f"Tweets with links: {len(with_links)} ({len(with_links)/len(tweets)*100:.1f}%)")
        print(f"Questions asked: {len(questions)}")

asyncio.run(analyze_content_strategy())
```

## Best Practices

1. **Use Date Ranges**: For historical analysis, specify `since` and `until` parameters
2. **Filter Retweets**: Set `include_retweets=False` for original content analysis
3. **Monitor Rate Limits**: Large scrapes may hit rate limits; use delays
4. **Store Raw Data**: Export raw JSON for future analysis flexibility
5. **Respect ToS**: Use scraped data responsibly and ethically

## Related Guides

- [Thread Unrolling](threads.md)
- [Search Scraping](search.md)
- [Engagement Analysis](../analytics/engagement.md)

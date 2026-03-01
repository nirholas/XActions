# Hashtag Tweet Scraping

Collect and analyze tweets containing specific hashtags to track trends, measure campaign performance, and understand community conversations.

## Overview

Hashtag scraping retrieves tweets using specific hashtags, providing insights into trending topics, campaign reach, and community engagement. This is essential for marketers, researchers, and community managers.

## Use Cases

- **Campaign Tracking**: Measure hashtag campaign performance
- **Trend Analysis**: Monitor trending hashtags in your industry
- **Community Research**: Study conversations around specific topics
- **Event Monitoring**: Track event hashtags in real-time
- **Content Discovery**: Find shareable content in your niche

## Basic Usage

```python
import asyncio
from xeepy import Xeepy

async def scrape_hashtag():
    async with Xeepy() as x:
        # Scrape tweets with a hashtag
        tweets = await x.scrape.hashtag("#Python", limit=100)
        
        for tweet in tweets:
            print(f"@{tweet.author.username}: {tweet.text[:60]}...")
            print(f"  Likes: {tweet.likes} | RTs: {tweet.retweets}\n")
        
        # Export results
        x.export.to_csv(tweets, "python_hashtag.csv")

asyncio.run(scrape_hashtag())
```

## Advanced Hashtag Scraping

```python
async def advanced_hashtag_scrape():
    async with Xeepy() as x:
        # Scrape with filtering options
        tweets = await x.scrape.hashtag(
            hashtag="#MachineLearning",
            limit=500,
            sort_by="Latest",          # Latest, Top, People, Media
            lang="en",                 # Language filter
            since="2024-01-01",        # Date range
            until="2024-12-31",
            min_likes=10,              # Quality filter
            include_retweets=False,    # Original tweets only
            verified_only=False        # All users
        )
        
        print(f"Found {len(tweets)} tweets with #MachineLearning")
        
        # Engagement metrics
        total_likes = sum(t.likes for t in tweets)
        total_rts = sum(t.retweets for t in tweets)
        print(f"Total engagement: {total_likes} likes, {total_rts} RTs")

asyncio.run(advanced_hashtag_scrape())
```

## Multiple Hashtag Analysis

```python
async def multi_hashtag_analysis():
    async with Xeepy() as x:
        hashtags = ["#Python", "#JavaScript", "#Rust", "#Go"]
        results = {}
        
        for tag in hashtags:
            tweets = await x.scrape.hashtag(tag, limit=200)
            
            # Calculate metrics
            results[tag] = {
                "count": len(tweets),
                "total_likes": sum(t.likes for t in tweets),
                "total_retweets": sum(t.retweets for t in tweets),
                "unique_authors": len(set(t.author.username for t in tweets)),
                "avg_engagement": sum(t.likes + t.retweets for t in tweets) / len(tweets) if tweets else 0
            }
        
        # Compare hashtags
        print("Hashtag Performance Comparison:")
        print("-" * 60)
        for tag, metrics in results.items():
            print(f"{tag}:")
            print(f"  Tweets: {metrics['count']}")
            print(f"  Avg engagement: {metrics['avg_engagement']:.1f}")
            print(f"  Unique authors: {metrics['unique_authors']}\n")

asyncio.run(multi_hashtag_analysis())
```

## Campaign Hashtag Tracking

```python
async def track_campaign_hashtag():
    async with Xeepy() as x:
        campaign_tag = "#YourCampaign2024"
        
        tweets = await x.scrape.hashtag(
            campaign_tag,
            limit=1000,
            include_retweets=True
        )
        
        # Campaign metrics
        original_tweets = [t for t in tweets if not t.is_retweet]
        retweets = [t for t in tweets if t.is_retweet]
        
        print(f"Campaign: {campaign_tag}")
        print(f"Total mentions: {len(tweets)}")
        print(f"Original tweets: {len(original_tweets)}")
        print(f"Retweets: {len(retweets)}")
        
        # Top contributors
        from collections import Counter
        contributors = Counter(t.author.username for t in original_tweets)
        print("\nTop contributors:")
        for user, count in contributors.most_common(10):
            print(f"  @{user}: {count} tweets")
        
        # Reach estimation
        total_followers = sum(t.author.followers_count for t in original_tweets)
        print(f"\nEstimated reach: {total_followers:,} followers")

asyncio.run(track_campaign_hashtag())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `hashtag` | str | required | Hashtag to search (with or without #) |
| `limit` | int | 100 | Maximum tweets to retrieve |
| `sort_by` | str | "Top" | Latest, Top, People, Media |
| `lang` | str | None | Language code filter |
| `since` | str | None | Start date (YYYY-MM-DD) |
| `until` | str | None | End date (YYYY-MM-DD) |
| `min_likes` | int | 0 | Minimum likes filter |
| `include_retweets` | bool | True | Include retweets |

!!! tip "Hashtag Formatting"
    You can pass the hashtag with or without the `#` symbol. Both `"#Python"` and `"Python"` work correctly.

!!! warning "Popular Hashtags"
    Very popular hashtags may return thousands of results. Use `limit` and date filters to manage data volume.

## Real-Time Hashtag Monitoring

```python
async def monitor_hashtag():
    async with Xeepy() as x:
        hashtag = "#BreakingNews"
        seen_ids = set()
        
        print(f"Monitoring {hashtag}...")
        
        while True:
            tweets = await x.scrape.hashtag(
                hashtag,
                limit=50,
                sort_by="Latest"
            )
            
            new_tweets = [t for t in tweets if t.id not in seen_ids]
            
            for tweet in new_tweets:
                seen_ids.add(tweet.id)
                print(f"\n[NEW] @{tweet.author.username}")
                print(f"  {tweet.text[:100]}...")
                print(f"  Likes: {tweet.likes} | RTs: {tweet.retweets}")
            
            await asyncio.sleep(30)  # Check every 30 seconds

# asyncio.run(monitor_hashtag())
```

## Hashtag Trend Analysis

```python
async def analyze_hashtag_trends():
    async with Xeepy() as x:
        tweets = await x.scrape.hashtag("#AI", limit=500)
        
        # Group by date
        from collections import defaultdict
        daily_counts = defaultdict(int)
        daily_engagement = defaultdict(int)
        
        for tweet in tweets:
            date = tweet.created_at.strftime("%Y-%m-%d")
            daily_counts[date] += 1
            daily_engagement[date] += tweet.likes + tweet.retweets
        
        print("Daily hashtag activity:")
        for date in sorted(daily_counts.keys()):
            print(f"  {date}: {daily_counts[date]} tweets, {daily_engagement[date]} engagement")

asyncio.run(analyze_hashtag_trends())
```

## Best Practices

1. **Start Recent**: Use `sort_by="Latest"` for real-time monitoring
2. **Filter Quality**: Set `min_likes` to focus on engaging content
3. **Track Variations**: Monitor hashtag variations (e.g., #AI, #ArtificialIntelligence)
4. **Exclude Retweets**: Use `include_retweets=False` for unique content analysis
5. **Set Date Ranges**: Bound searches for campaign-specific analysis
6. **Monitor Competitors**: Track competitor campaign hashtags

## Related Guides

- [Search Results Scraping](search.md)
- [Keyword Monitoring](../monitoring/keywords.md)
- [Engagement Analysis](../analytics/engagement.md)

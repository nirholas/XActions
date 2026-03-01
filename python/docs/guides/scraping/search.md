# Search Results Scraping

Scrape Twitter search results to find relevant conversations, monitor topics, and gather data for research and analysis.

## Overview

The search scraper leverages Twitter's search functionality to find tweets matching specific queries, filters, and criteria. This is essential for social listening, trend monitoring, and targeted data collection.

## Use Cases

- **Social Listening**: Monitor brand mentions and sentiment
- **Trend Research**: Study emerging topics and conversations
- **Lead Generation**: Find potential customers discussing relevant topics
- **Competitive Intelligence**: Track competitor mentions and campaigns
- **Content Discovery**: Find viral content in your niche

## Basic Usage

```python
import asyncio
from xeepy import Xeepy

async def basic_search():
    async with Xeepy() as x:
        # Simple keyword search
        results = await x.scrape.search("python programming", limit=100)
        
        for tweet in results:
            print(f"@{tweet.author.username}: {tweet.text[:60]}...")
            print(f"  Engagement: {tweet.likes} likes, {tweet.retweets} RTs\n")
        
        # Export results
        x.export.to_csv(results, "search_results.csv")

asyncio.run(basic_search())
```

## Advanced Search Queries

```python
async def advanced_search():
    async with Xeepy() as x:
        # Use Twitter advanced search operators
        results = await x.scrape.search(
            query="machine learning -course -tutorial",  # Exclude terms
            limit=200,
            search_type="Latest",      # Latest, Top, People, Photos, Videos
            lang="en",                 # Language filter
            since="2024-01-01",        # Date range
            until="2024-12-31",
            min_likes=50,              # Engagement filters
            min_retweets=10,
            has_media=True,            # Only tweets with media
            is_verified=False          # Include all users
        )
        
        print(f"Found {len(results)} tweets matching criteria")

asyncio.run(advanced_search())
```

## Search Operators

```python
async def search_with_operators():
    async with Xeepy() as x:
        # From specific user
        from_user = await x.scrape.search("from:elonmusk AI", limit=50)
        
        # To specific user (replies)
        to_user = await x.scrape.search("to:OpenAI feedback", limit=50)
        
        # Mentions of user
        mentions = await x.scrape.search("@github copilot", limit=50)
        
        # Exact phrase
        exact = await x.scrape.search('"artificial intelligence"', limit=50)
        
        # OR operator
        either = await x.scrape.search("Python OR JavaScript", limit=50)
        
        # Filter by engagement
        popular = await x.scrape.search(
            "startup funding min_faves:1000",
            limit=50
        )
        
        # Near location (approximate)
        local = await x.scrape.search(
            "coffee shop near:NYC within:10mi",
            limit=50
        )

asyncio.run(search_with_operators())
```

## Real-Time Monitoring

```python
async def monitor_search_results():
    async with Xeepy() as x:
        seen_ids = set()
        
        while True:
            # Search for latest mentions
            results = await x.scrape.search(
                query="your_brand_name",
                search_type="Latest",
                limit=50
            )
            
            # Find new tweets
            new_tweets = [t for t in results if t.id not in seen_ids]
            
            for tweet in new_tweets:
                seen_ids.add(tweet.id)
                print(f"New mention: @{tweet.author.username}")
                print(f"  {tweet.text[:100]}...\n")
            
            # Wait before next check
            await asyncio.sleep(60)  # Check every minute

# asyncio.run(monitor_search_results())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | str | required | Search query with operators |
| `limit` | int | 100 | Maximum results |
| `search_type` | str | "Top" | Latest, Top, People, Photos, Videos |
| `lang` | str | None | Language code (en, es, etc.) |
| `since` | str | None | Start date (YYYY-MM-DD) |
| `until` | str | None | End date (YYYY-MM-DD) |
| `min_likes` | int | 0 | Minimum likes filter |
| `min_retweets` | int | 0 | Minimum retweets filter |
| `has_media` | bool | False | Only tweets with media |

!!! tip "Search Operators Reference"
    - `from:user` - Tweets from specific user
    - `to:user` - Replies to specific user
    - `@user` - Mentions of user
    - `"exact phrase"` - Exact match
    - `-word` - Exclude word
    - `OR` - Match either term
    - `min_faves:N` - Minimum likes
    - `min_retweets:N` - Minimum retweets
    - `filter:media` - Has media
    - `filter:links` - Has links

!!! warning "Rate Limits"
    Search scraping is rate-limited. For high-volume monitoring, implement delays between requests and consider caching results.

## Aggregating Search Data

```python
async def aggregate_search_data():
    async with Xeepy() as x:
        results = await x.scrape.search("AI startups", limit=500)
        
        # Analyze results
        total_engagement = sum(t.likes + t.retweets for t in results)
        unique_authors = len(set(t.author.username for t in results))
        
        # Top authors by tweet count
        from collections import Counter
        author_counts = Counter(t.author.username for t in results)
        top_authors = author_counts.most_common(10)
        
        print(f"Total tweets: {len(results)}")
        print(f"Unique authors: {unique_authors}")
        print(f"Total engagement: {total_engagement}")
        print(f"\nTop authors:")
        for author, count in top_authors:
            print(f"  @{author}: {count} tweets")

asyncio.run(aggregate_search_data())
```

## Export and Analysis

```python
async def export_search_analysis():
    async with Xeepy() as x:
        results = await x.scrape.search("your_keyword", limit=200)
        
        # Export raw data
        x.export.to_json(results, "search_raw.json")
        x.export.to_csv(results, "search_results.csv")
        
        # Export with custom fields
        x.export.to_csv(
            results,
            "search_custom.csv",
            fields=["author.username", "text", "likes", "created_at"]
        )

asyncio.run(export_search_analysis())
```

## Best Practices

1. **Refine Queries**: Use operators to reduce noise and improve relevance
2. **Set Date Ranges**: Bound searches to relevant time periods
3. **Filter by Engagement**: Use `min_likes` to focus on impactful tweets
4. **Monitor Continuously**: Set up scheduled searches for ongoing monitoring
5. **Deduplicate Results**: Track seen tweet IDs to avoid processing duplicates

## Related Guides

- [Hashtag Scraping](hashtags.md)
- [Keyword Monitoring](../monitoring/keywords.md)
- [Sentiment Analysis](../ai/sentiment.md)

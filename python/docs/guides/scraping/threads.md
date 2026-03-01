# Unrolling Twitter Threads

Extract complete Twitter threads in order, preserving the narrative flow and all associated media and engagement data.

## Overview

Twitter threads are powerful storytelling tools, but reading them on the platform can be fragmented. The thread unroller extracts entire threads as a cohesive document, perfect for archiving, analysis, or content repurposing.

## Use Cases

- **Content Archiving**: Save valuable thread content before deletion
- **Research Documentation**: Preserve educational threads for reference
- **Content Repurposing**: Convert threads to blog posts or newsletters
- **Engagement Analysis**: Study which thread tweets perform best

## Basic Usage

```python
import asyncio
from xeepy import Xeepy

async def unroll_thread():
    async with Xeepy() as x:
        # Unroll a thread from any tweet in the chain
        thread = await x.scrape.thread(
            "https://x.com/naval/status/1002103360646823936"
        )
        
        print(f"Thread by @{thread.author.username}")
        print(f"Total tweets: {len(thread.tweets)}")
        print(f"Total engagement: {thread.total_likes} likes\n")
        
        for i, tweet in enumerate(thread.tweets, 1):
            print(f"{i}. {tweet.text}\n")

asyncio.run(unroll_thread())
```

## Advanced Thread Extraction

```python
async def advanced_thread_unroll():
    async with Xeepy() as x:
        thread = await x.scrape.thread(
            url="https://x.com/user/status/123456789",
            include_replies=True,      # Include author's replies
            include_quotes=True,       # Include quote tweets
            include_media=True,        # Download media attachments
            output_dir="threads"       # Save media to directory
        )
        
        # Access thread metadata
        print(f"Thread ID: {thread.id}")
        print(f"Author: @{thread.author.username}")
        print(f"Created: {thread.created_at}")
        print(f"Tweet count: {len(thread.tweets)}")
        
        # Engagement summary
        print(f"\nEngagement Summary:")
        print(f"  Total likes: {thread.total_likes}")
        print(f"  Total retweets: {thread.total_retweets}")
        print(f"  Total replies: {thread.total_replies}")

asyncio.run(advanced_thread_unroll())
```

## Converting Threads to Documents

```python
async def thread_to_document():
    async with Xeepy() as x:
        thread = await x.scrape.thread(
            "https://x.com/user/status/123456789"
        )
        
        # Generate markdown document
        markdown = f"# {thread.tweets[0].text[:50]}...\n\n"
        markdown += f"*By @{thread.author.username} on {thread.created_at}*\n\n"
        markdown += "---\n\n"
        
        for tweet in thread.tweets:
            markdown += f"{tweet.text}\n\n"
            if tweet.media:
                for media in tweet.media:
                    markdown += f"![Media]({media.url})\n\n"
        
        # Save to file
        with open("thread_export.md", "w") as f:
            f.write(markdown)
        
        print("Thread exported to markdown!")

asyncio.run(thread_to_document())
```

## Batch Thread Processing

```python
async def batch_unroll_threads():
    async with Xeepy() as x:
        thread_urls = [
            "https://x.com/user1/status/111",
            "https://x.com/user2/status/222",
            "https://x.com/user3/status/333",
        ]
        
        threads = []
        for url in thread_urls:
            thread = await x.scrape.thread(url)
            threads.append(thread)
            print(f"Unrolled: {len(thread.tweets)} tweets from @{thread.author.username}")
        
        # Export all threads
        for thread in threads:
            filename = f"thread_{thread.id}.json"
            x.export.to_json(thread, filename)

asyncio.run(batch_unroll_threads())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | str | required | URL of any tweet in thread |
| `include_replies` | bool | False | Include author replies |
| `include_quotes` | bool | False | Include quote tweets |
| `include_media` | bool | True | Extract media URLs |
| `output_dir` | str | None | Directory for media downloads |

!!! tip "Finding the Thread Start"
    You can pass any tweet URL from the thread - the unroller automatically finds and retrieves the entire thread from the beginning.

!!! note "Long Threads"
    Very long threads (100+ tweets) may take longer to process. The scraper handles pagination automatically.

## Analyzing Thread Performance

```python
async def analyze_thread_performance():
    async with Xeepy() as x:
        thread = await x.scrape.thread(
            "https://x.com/user/status/123456789"
        )
        
        # Find best performing tweet in thread
        best_tweet = max(thread.tweets, key=lambda t: t.likes)
        print(f"Best tweet: {best_tweet.text[:50]}...")
        print(f"Likes: {best_tweet.likes}")
        
        # Engagement dropoff analysis
        print("\nEngagement by position:")
        for i, tweet in enumerate(thread.tweets, 1):
            pct = (tweet.likes / thread.tweets[0].likes * 100) if thread.tweets[0].likes else 0
            print(f"  Tweet {i}: {tweet.likes} likes ({pct:.1f}% of first)")

asyncio.run(analyze_thread_performance())
```

## Export Formats

```python
async def export_thread_formats():
    async with Xeepy() as x:
        thread = await x.scrape.thread("https://x.com/user/status/123")
        
        # Multiple export options
        x.export.to_json(thread, "thread.json")
        x.export.to_csv(thread.tweets, "thread_tweets.csv")
        x.export.thread_to_markdown(thread, "thread.md")
        x.export.thread_to_html(thread, "thread.html")

asyncio.run(export_thread_formats())
```

## Best Practices

1. **Save Thread URLs**: Threads can be deleted; save URLs of valuable threads
2. **Download Media**: Use `include_media=True` to preserve images and videos
3. **Check Completeness**: Verify tweet count matches what you see on Twitter
4. **Archive Regularly**: Important threads should be archived promptly
5. **Cite Sources**: When repurposing content, credit the original author

## Related Guides

- [Scraping User Tweets](tweets.md)
- [Media Scraping](media.md)
- [Content Analysis](../analytics/engagement.md)

# Twitter List Scraping

Extract members and tweets from Twitter Lists to discover curated communities, track industry experts, and monitor focused content streams.

## Overview

Twitter Lists are curated collections of accounts organized around themes, industries, or interests. The list scraper extracts list metadata, members, and recent tweets, providing access to pre-filtered high-quality content streams.

## Use Cases

- **Expert Discovery**: Find industry experts curated by trusted sources
- **Community Research**: Study curated communities in your niche
- **Content Streams**: Access focused content without noise
- **Lead Generation**: Build prospect lists from relevant lists
- **Competitive Analysis**: See who competitors have curated

## Basic Usage

```python
import asyncio
from xeepy import Xeepy

async def scrape_list():
    async with Xeepy() as x:
        # Scrape members from a Twitter list
        members = await x.scrape.list_members(
            list_url="https://x.com/i/lists/123456789"
        )
        
        for user in members:
            print(f"@{user.username}: {user.followers_count} followers")
            print(f"  Bio: {user.bio[:60]}...\n")
        
        # Export to CSV
        x.export.to_csv(members, "list_members.csv")

asyncio.run(scrape_list())
```

## Scraping List Tweets

```python
async def scrape_list_tweets():
    async with Xeepy() as x:
        # Get recent tweets from list timeline
        tweets = await x.scrape.list_tweets(
            list_url="https://x.com/i/lists/123456789",
            limit=200
        )
        
        print(f"Retrieved {len(tweets)} tweets from list")
        
        for tweet in tweets:
            print(f"@{tweet.author.username}: {tweet.text[:50]}...")
            print(f"  Engagement: {tweet.likes} likes\n")

asyncio.run(scrape_list_tweets())
```

## Scraping User's Lists

```python
async def scrape_user_lists():
    async with Xeepy() as x:
        # Get all lists created by a user
        lists = await x.scrape.user_lists(
            username="elonmusk",
            include_subscribed=False  # Only created lists
        )
        
        for lst in lists:
            print(f"List: {lst.name}")
            print(f"  Description: {lst.description}")
            print(f"  Members: {lst.member_count}")
            print(f"  Subscribers: {lst.subscriber_count}")
            print(f"  URL: {lst.url}\n")

asyncio.run(scrape_user_lists())
```

## Advanced List Member Scraping

```python
async def advanced_list_scraping():
    async with Xeepy() as x:
        # Scrape with filtering
        members = await x.scrape.list_members(
            list_url="https://x.com/i/lists/123456789",
            limit=500,
            min_followers=1000,       # Filter by followers
            verified_only=False,       # Include non-verified
            include_profile=True       # Full profile data
        )
        
        # Analyze the list
        total_followers = sum(u.followers_count for u in members)
        avg_followers = total_followers / len(members) if members else 0
        verified_count = sum(1 for u in members if u.verified)
        
        print(f"List Analysis:")
        print(f"  Total members: {len(members)}")
        print(f"  Verified members: {verified_count}")
        print(f"  Average followers: {avg_followers:,.0f}")
        print(f"  Combined reach: {total_followers:,}")

asyncio.run(advanced_list_scraping())
```

## Discovering Public Lists

```python
async def discover_lists():
    async with Xeepy() as x:
        # Search for public lists by topic
        lists = await x.scrape.search_lists(
            query="machine learning",
            limit=20
        )
        
        print("Top ML-related lists:")
        for lst in lists:
            print(f"\n{lst.name} by @{lst.owner.username}")
            print(f"  Members: {lst.member_count}")
            print(f"  Subscribers: {lst.subscriber_count}")
            print(f"  {lst.url}")

asyncio.run(discover_lists())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `list_url` | str | required | List URL or ID |
| `limit` | int | 100 | Maximum items to retrieve |
| `min_followers` | int | 0 | Minimum follower filter |
| `verified_only` | bool | False | Only verified accounts |
| `include_profile` | bool | True | Include full profile data |
| `include_subscribed` | bool | True | Include subscribed lists |

!!! tip "Finding List IDs"
    You can use either the full URL (`https://x.com/i/lists/123456789`) or just the list ID (`123456789`). Find list IDs by navigating to the list on Twitter and copying from the URL.

!!! note "Private Lists"
    You can only scrape public lists or private lists you own. Member data is limited based on list visibility settings.

## Batch List Processing

```python
async def batch_process_lists():
    async with Xeepy() as x:
        list_urls = [
            "https://x.com/i/lists/111",
            "https://x.com/i/lists/222",
            "https://x.com/i/lists/333",
        ]
        
        all_members = {}
        
        for url in list_urls:
            members = await x.scrape.list_members(url, limit=200)
            list_id = url.split("/")[-1]
            all_members[list_id] = members
            print(f"List {list_id}: {len(members)} members")
        
        # Find members appearing in multiple lists
        from collections import Counter
        all_usernames = []
        for members in all_members.values():
            all_usernames.extend(u.username for u in members)
        
        common = Counter(all_usernames)
        multi_list = [(u, c) for u, c in common.items() if c > 1]
        
        print(f"\nUsers in multiple lists: {len(multi_list)}")

asyncio.run(batch_process_lists())
```

## List Comparison Analysis

```python
async def compare_lists():
    async with Xeepy() as x:
        # Compare two curated lists
        list1_members = await x.scrape.list_members(
            "https://x.com/i/lists/111",
            limit=500
        )
        list2_members = await x.scrape.list_members(
            "https://x.com/i/lists/222",
            limit=500
        )
        
        set1 = set(u.username for u in list1_members)
        set2 = set(u.username for u in list2_members)
        
        overlap = set1 & set2
        only_list1 = set1 - set2
        only_list2 = set2 - set1
        
        print(f"List 1 members: {len(set1)}")
        print(f"List 2 members: {len(set2)}")
        print(f"Overlap: {len(overlap)} members")
        print(f"Unique to List 1: {len(only_list1)}")
        print(f"Unique to List 2: {len(only_list2)}")

asyncio.run(compare_lists())
```

## Building Custom Lists

```python
async def build_custom_list():
    async with Xeepy() as x:
        # Scrape multiple lists and combine unique members
        source_lists = [
            "https://x.com/i/lists/111",
            "https://x.com/i/lists/222",
        ]
        
        unique_members = {}
        
        for url in source_lists:
            members = await x.scrape.list_members(url, limit=200)
            for member in members:
                if member.username not in unique_members:
                    unique_members[member.username] = member
        
        # Filter for high-value accounts
        quality_members = [
            u for u in unique_members.values()
            if u.followers_count > 5000 and u.tweet_count > 100
        ]
        
        print(f"Quality accounts found: {len(quality_members)}")
        x.export.to_csv(quality_members, "curated_list.csv")

asyncio.run(build_custom_list())
```

## Best Practices

1. **Verify List Quality**: Check list descriptions and subscriber counts
2. **Check Last Updated**: Old lists may have inactive members
3. **Cross-Reference**: Compare multiple lists for validation
4. **Filter Strategically**: Use follower counts to focus on influential members
5. **Respect Curation**: Lists represent someone's curation effort
6. **Monitor Changes**: Track list membership changes over time

## Related Guides

- [Following Scraping](following.md)
- [Audience Insights](../analytics/audience.md)
- [Competitor Analysis](../analytics/competitors.md)

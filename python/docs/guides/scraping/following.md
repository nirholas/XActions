# Scraping Following Lists

Retrieve and analyze the accounts a user follows to understand their interests, find potential connections, and build targeted outreach lists.

## Overview

The following scraper extracts comprehensive data about accounts a user follows, including profile information, follower counts, and activity metrics. This is invaluable for competitive analysis, lead generation, and understanding network dynamics.

## Use Cases

- **Competitive Analysis**: See who your competitors follow for partnership insights
- **Lead Generation**: Build lists of potential customers from relevant accounts
- **Network Mapping**: Understand industry connections and influencer relationships
- **Content Discovery**: Find accounts posting content your audience engages with

## Basic Usage

```python
import asyncio
from xeepy import Xeepy

async def scrape_following():
    async with Xeepy() as x:
        # Get accounts a user follows
        following = await x.scrape.following("elonmusk", limit=500)
        
        for user in following:
            print(f"@{user.username}: {user.followers_count} followers")
        
        # Export to CSV for analysis
        x.export.to_csv(following, "following_list.csv")

asyncio.run(scrape_following())
```

## Advanced Options

```python
async def advanced_following_scrape():
    async with Xeepy() as x:
        # Scrape with filtering options
        following = await x.scrape.following(
            username="techcrunch",
            limit=1000,
            include_protected=False,  # Skip private accounts
            min_followers=1000,       # Only accounts with 1k+ followers
            verified_only=False,      # Include non-verified accounts
            active_days=30            # Only accounts active in last 30 days
        )
        
        # Filter by account type
        influencers = [u for u in following if u.followers_count > 10000]
        brands = [u for u in following if u.verified and u.followers_count > 50000]
        
        return following

asyncio.run(advanced_following_scrape())
```

## Batch Processing Multiple Accounts

```python
async def batch_following_analysis():
    async with Xeepy() as x:
        target_accounts = ["user1", "user2", "user3"]
        all_following = {}
        
        for account in target_accounts:
            following = await x.scrape.following(account, limit=500)
            all_following[account] = following
            print(f"@{account} follows {len(following)} accounts")
        
        # Find common follows across accounts
        sets = [set(u.username for u in f) for f in all_following.values()]
        common = sets[0].intersection(*sets[1:])
        print(f"Common follows: {len(common)}")

asyncio.run(batch_following_analysis())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | str | required | Target username to scrape |
| `limit` | int | 100 | Maximum accounts to retrieve |
| `include_protected` | bool | True | Include private accounts |
| `min_followers` | int | 0 | Minimum follower count filter |
| `verified_only` | bool | False | Only verified accounts |
| `active_days` | int | None | Filter by recent activity |

!!! tip "Rate Limiting"
    The scraper automatically handles rate limits. For large following lists (10k+), expect the operation to take several minutes. Use `limit` parameter to control batch sizes.

!!! warning "Private Accounts"
    You can only scrape following lists from public accounts or accounts that follow you back.

## Best Practices

1. **Start Small**: Test with `limit=100` before running large scrapes
2. **Use Filters**: Apply `min_followers` to focus on influential accounts
3. **Schedule Off-Peak**: Run large scrapes during low-traffic hours
4. **Cache Results**: Store results locally to avoid repeated scraping
5. **Respect Privacy**: Only scrape public information for legitimate purposes

## Data Export

```python
async def export_following_data():
    async with Xeepy() as x:
        following = await x.scrape.following("username", limit=500)
        
        # Multiple export formats
        x.export.to_csv(following, "following.csv")
        x.export.to_json(following, "following.json")
        x.export.to_excel(following, "following.xlsx")

asyncio.run(export_following_data())
```

## Related Guides

- [Scraping Followers](../scraping/followers.md)
- [Audience Insights](../analytics/audience.md)
- [Competitor Analysis](../analytics/competitors.md)

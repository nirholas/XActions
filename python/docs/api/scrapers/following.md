# FollowingScraper

Scrapes the list of accounts that a user follows.

## Import

```python
from xeepy.scrapers.following import FollowingScraper
```

## Class Signature

```python
class FollowingScraper:
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
| `scrape(username, limit)` | `ScrapeResult[User]` | Get following list |
| `scrape_all(username)` | `ScrapeResult[User]` | Get complete following list |
| `count(username)` | `int` | Get following count |
| `is_following(username, target)` | `bool` | Check if user follows target |

### `scrape`

```python
async def scrape(
    self,
    username: str,
    limit: int = 1000,
    cursor: Optional[str] = None
) -> ScrapeResult[User]
```

Scrape accounts that a user follows.

**Parameters:**
- `username`: Target username (without @)
- `limit`: Maximum accounts to fetch
- `cursor`: Pagination cursor

**Returns:** `ScrapeResult` containing `User` objects

### `scrape_all`

```python
async def scrape_all(
    self,
    username: str,
    progress_callback: Optional[Callable] = None
) -> ScrapeResult[User]
```

Scrape complete following list.

### `is_following`

```python
async def is_following(
    self,
    username: str,
    target: str
) -> bool
```

Check if a user follows a specific account.

## Usage Examples

### Basic Following Scraping

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.following("username", limit=500)
        
        print(f"User follows {len(result.items)} accounts")
        
        for user in result.items:
            print(f"@{user.username} - {user.name}")

asyncio.run(main())
```

### Find Non-Followers

```python
from xeepy import Xeepy

async def find_non_followers(username: str):
    """Find accounts that don't follow back."""
    async with Xeepy() as x:
        following = await x.scrape.following(username, limit=5000)
        followers = await x.scrape.followers(username, limit=5000)
        
        following_set = {u.username for u in following.items}
        followers_set = {u.username for u in followers.items}
        
        non_followers = following_set - followers_set
        
        print(f"Following: {len(following_set)}")
        print(f"Followers: {len(followers_set)}")
        print(f"Non-followers: {len(non_followers)}")
        
        return list(non_followers)

asyncio.run(find_non_followers("myusername"))
```

### Analyze Following Categories

```python
from xeepy import Xeepy
from collections import Counter

async def analyze_following(username: str):
    async with Xeepy() as x:
        result = await x.scrape.following(username, limit=1000)
        
        # Analyze verification status
        verified = sum(1 for u in result.items if u.is_verified)
        
        # Analyze follower counts
        follower_ranges = Counter()
        for user in result.items:
            if user.followers_count < 1000:
                follower_ranges["<1K"] += 1
            elif user.followers_count < 10000:
                follower_ranges["1K-10K"] += 1
            elif user.followers_count < 100000:
                follower_ranges["10K-100K"] += 1
            else:
                follower_ranges[">100K"] += 1
        
        print(f"Total following: {len(result.items)}")
        print(f"Verified: {verified}")
        print(f"Follower distribution: {dict(follower_ranges)}")

asyncio.run(analyze_following("username"))
```

### Export with Custom Fields

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.following("username", limit=2000)
        
        # Prepare custom data
        data = [
            {
                "username": u.username,
                "name": u.name,
                "followers": u.followers_count,
                "following": u.following_count,
                "ratio": round(u.followers_count / max(u.following_count, 1), 2),
                "verified": u.is_verified
            }
            for u in result.items
        ]
        
        x.export.to_csv(data, "following_analysis.csv")
        print(f"Exported {len(data)} accounts")

asyncio.run(main())
```

### Check Specific Relationship

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Check if user follows a specific account
        is_following = await x.scrape.is_following(
            "myusername",
            "targetuser"
        )
        
        if is_following:
            print("You follow @targetuser")
        else:
            print("You don't follow @targetuser")

asyncio.run(main())
```

## See Also

- [User Model](../models/user.md) - User data structure
- [FollowersScraper](followers.md) - Get followers list
- [UnfollowActions](../actions/unfollow.md) - Unfollow operations

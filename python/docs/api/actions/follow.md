# FollowActions

Actions for following users on X/Twitter.

## Import

```python
from xeepy.actions.follow import FollowActions
```

## Class Signature

```python
class FollowActions:
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
| `user(username)` | `bool` | Follow a single user |
| `users(usernames)` | `FollowResult` | Follow multiple users |
| `by_hashtag(hashtag, limit)` | `FollowResult` | Follow users by hashtag |
| `by_keyword(keyword, limit)` | `FollowResult` | Follow users by keyword |
| `followers_of(username, limit)` | `FollowResult` | Follow user's followers |
| `likers_of(tweet_url, limit)` | `FollowResult` | Follow tweet likers |

### `user`

```python
async def user(
    self,
    username: str,
    check_existing: bool = True
) -> bool
```

Follow a single user.

**Parameters:**
- `username`: Username to follow (without @)
- `check_existing`: Skip if already following

**Returns:** `True` if followed successfully

### `users`

```python
async def users(
    self,
    usernames: List[str],
    delay_range: Tuple[float, float] = (2.0, 5.0),
    skip_existing: bool = True
) -> FollowResult
```

Follow multiple users with delays.

**Parameters:**
- `usernames`: List of usernames to follow
- `delay_range`: Random delay range between follows (seconds)
- `skip_existing`: Skip already followed users

### `by_hashtag`

```python
async def by_hashtag(
    self,
    hashtag: str,
    limit: int = 50,
    min_followers: int = 100,
    delay_range: Tuple[float, float] = (3.0, 8.0)
) -> FollowResult
```

Follow users who post with a specific hashtag.

**Parameters:**
- `hashtag`: Target hashtag (with or without #)
- `limit`: Maximum users to follow
- `min_followers`: Minimum follower count filter
- `delay_range`: Delay between follows

### `followers_of`

```python
async def followers_of(
    self,
    username: str,
    limit: int = 50,
    min_followers: int = 100
) -> FollowResult
```

Follow followers of another user.

## FollowResult Object

```python
@dataclass
class FollowResult:
    followed: List[str]              # Successfully followed usernames
    failed: List[Dict]               # Failed follows with errors
    skipped: List[str]               # Skipped (already following)
    total_attempted: int             # Total attempts
    
    @property
    def success_rate(self) -> float:
        return len(self.followed) / self.total_attempted if self.total_attempted else 0
```

## Usage Examples

### Follow Single User

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        success = await x.follow.user("username")
        
        if success:
            print("Followed successfully!")
        else:
            print("Follow failed or already following")

asyncio.run(main())
```

### Follow Multiple Users

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        usernames = ["user1", "user2", "user3", "user4"]
        
        result = await x.follow.users(
            usernames,
            delay_range=(3.0, 7.0)
        )
        
        print(f"Followed: {len(result.followed)}")
        print(f"Failed: {len(result.failed)}")
        print(f"Skipped: {len(result.skipped)}")
        print(f"Success rate: {result.success_rate:.1%}")

asyncio.run(main())
```

### Follow by Hashtag

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.follow.by_hashtag(
            "#python",
            limit=30,
            min_followers=500,
            delay_range=(5.0, 10.0)
        )
        
        print(f"Followed {len(result.followed)} Python users")
        
        for username in result.followed:
            print(f"  ✓ @{username}")

asyncio.run(main())
```

### Follow Followers of Influencer

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.follow.followers_of(
            "elonmusk",
            limit=50,
            min_followers=1000
        )
        
        print(f"Followed {len(result.followed)} accounts")

asyncio.run(main())
```

### Follow Tweet Likers

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.follow.likers_of(
            "https://x.com/user/status/123456789",
            limit=30
        )
        
        print(f"Followed {len(result.followed)} users who liked the tweet")

asyncio.run(main())
```

### Follow by Keyword Search

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.follow.by_keyword(
            "data scientist",
            limit=40,
            min_followers=500
        )
        
        print(f"Followed {len(result.followed)} data scientists")

asyncio.run(main())
```

### Follow with Whitelist Check

```python
from xeepy import Xeepy

async def follow_with_filter(usernames: list, blacklist: set):
    async with Xeepy() as x:
        filtered = [u for u in usernames if u not in blacklist]
        
        result = await x.follow.users(filtered)
        
        return result

blacklist = {"spammer1", "spammer2", "bot_account"}
asyncio.run(follow_with_filter(["user1", "user2"], blacklist))
```

### Follow with Daily Limit

```python
from xeepy import Xeepy
import asyncio

async def safe_follow(usernames: list, daily_limit: int = 100):
    """Follow with daily limit protection."""
    async with Xeepy() as x:
        followed_today = 0
        
        for username in usernames:
            if followed_today >= daily_limit:
                print(f"Daily limit ({daily_limit}) reached")
                break
            
            success = await x.follow.user(username)
            if success:
                followed_today += 1
                print(f"Followed @{username} ({followed_today}/{daily_limit})")
            
            # Extra delay to stay safe
            await asyncio.sleep(random.uniform(10, 30))
        
        return followed_today

asyncio.run(safe_follow(usernames, daily_limit=50))
```

## See Also

- [UnfollowActions](unfollow.md) - Unfollow operations
- [EngageActions](engage.md) - Engagement actions
- [FollowersScraper](../scrapers/followers.md) - Scrape followers

# UnfollowActions

Actions for unfollowing users on X/Twitter, including smart unfollow strategies.

## Import

```python
from xeepy.actions.unfollow import UnfollowActions
```

## Class Signature

```python
class UnfollowActions:
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
| `user(username)` | `bool` | Unfollow single user |
| `users(usernames)` | `UnfollowResult` | Unfollow multiple users |
| `non_followers(max_unfollows)` | `UnfollowResult` | Unfollow non-followers |
| `everyone(max_unfollows)` | `UnfollowResult` | Unfollow all users |
| `inactive(days, max_unfollows)` | `UnfollowResult` | Unfollow inactive users |
| `by_criteria(criteria)` | `UnfollowResult` | Unfollow by custom criteria |

### `user`

```python
async def user(self, username: str) -> bool
```

Unfollow a single user.

### `non_followers`

```python
async def non_followers(
    self,
    max_unfollows: int = 100,
    whitelist: List[str] = None,
    delay_range: Tuple[float, float] = (3.0, 8.0),
    dry_run: bool = False
) -> UnfollowResult
```

Unfollow users who don't follow back.

**Parameters:**
- `max_unfollows`: Maximum users to unfollow
- `whitelist`: Usernames to never unfollow
- `delay_range`: Random delay between unfollows (seconds)
- `dry_run`: Preview without actually unfollowing

### `everyone`

```python
async def everyone(
    self,
    max_unfollows: int = None,
    whitelist: List[str] = None,
    delay_range: Tuple[float, float] = (3.0, 8.0),
    dry_run: bool = False
) -> UnfollowResult
```

Unfollow all users (use with caution).

### `inactive`

```python
async def inactive(
    self,
    days: int = 90,
    max_unfollows: int = 100,
    whitelist: List[str] = None,
    dry_run: bool = False
) -> UnfollowResult
```

Unfollow users who haven't posted recently.

### `by_criteria`

```python
async def by_criteria(
    self,
    criteria: UnfollowCriteria,
    max_unfollows: int = 100,
    dry_run: bool = False
) -> UnfollowResult
```

Unfollow based on custom criteria.

## UnfollowResult Object

```python
@dataclass
class UnfollowResult:
    unfollowed: List[str]            # Successfully unfollowed
    failed: List[Dict]               # Failed with errors
    skipped: List[str]               # Skipped (whitelisted)
    would_unfollow: List[str]        # Preview list (dry_run)
    total_attempted: int             # Total attempts
```

## UnfollowCriteria Object

```python
@dataclass
class UnfollowCriteria:
    min_followers: Optional[int] = None    # Min followers to keep
    max_followers: Optional[int] = None    # Max followers to keep
    min_following: Optional[int] = None    # Min following to keep
    following_ratio_min: Optional[float] = None  # Min followers/following
    must_be_verified: bool = False         # Keep only verified
    must_follow_back: bool = False         # Keep only followers
    inactive_days: Optional[int] = None    # Max days since tweet
    bio_keywords: Optional[List[str]] = None  # Keep if bio contains
    exclude_keywords: Optional[List[str]] = None  # Remove if bio contains
```

## Usage Examples

### Unfollow Non-Followers

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.unfollow.non_followers(
            max_unfollows=100,
            whitelist=["friend1", "friend2", "important_account"]
        )
        
        print(f"Unfollowed: {len(result.unfollowed)} users")
        print(f"Failed: {len(result.failed)}")
        print(f"Skipped (whitelisted): {len(result.skipped)}")

asyncio.run(main())
```

### Preview Before Unfollowing (Dry Run)

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Preview who would be unfollowed
        result = await x.unfollow.non_followers(
            max_unfollows=200,
            dry_run=True
        )
        
        print(f"Would unfollow {len(result.would_unfollow)} users:")
        for username in result.would_unfollow[:20]:
            print(f"  - @{username}")
        
        # Confirm and execute
        confirm = input("Proceed? (y/n): ")
        if confirm.lower() == "y":
            result = await x.unfollow.non_followers(
                max_unfollows=200,
                dry_run=False
            )
            print(f"Unfollowed {len(result.unfollowed)} users")

asyncio.run(main())
```

### Unfollow Everyone

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Keep some important accounts
        whitelist = ["official_support", "best_friend", "spouse"]
        
        result = await x.unfollow.everyone(
            whitelist=whitelist,
            delay_range=(5.0, 15.0),
            dry_run=True  # Preview first!
        )
        
        print(f"Would unfollow: {len(result.would_unfollow)}")

asyncio.run(main())
```

### Unfollow Inactive Users

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.unfollow.inactive(
            days=90,  # No tweets in 90 days
            max_unfollows=50
        )
        
        print(f"Unfollowed {len(result.unfollowed)} inactive accounts")

asyncio.run(main())
```

### Unfollow by Custom Criteria

```python
from xeepy import Xeepy
from xeepy.actions.unfollow import UnfollowCriteria

async def main():
    async with Xeepy() as x:
        # Define custom criteria
        criteria = UnfollowCriteria(
            max_followers=100,           # Low follower accounts
            must_follow_back=False,      # Doesn't follow back
            inactive_days=60,            # Inactive for 60+ days
            exclude_keywords=["crypto", "nft", "forex"]  # Spam-like bios
        )
        
        result = await x.unfollow.by_criteria(
            criteria=criteria,
            max_unfollows=100,
            dry_run=True
        )
        
        print(f"Matching accounts: {len(result.would_unfollow)}")

asyncio.run(main())
```

### Keep Only Verified Users

```python
from xeepy import Xeepy
from xeepy.actions.unfollow import UnfollowCriteria

async def main():
    async with Xeepy() as x:
        criteria = UnfollowCriteria(
            must_be_verified=True  # Keep only verified
        )
        
        result = await x.unfollow.by_criteria(
            criteria=criteria,
            max_unfollows=500,
            dry_run=True
        )
        
        print(f"Non-verified to unfollow: {len(result.would_unfollow)}")

asyncio.run(main())
```

### Gradual Unfollow Over Time

```python
from xeepy import Xeepy
import asyncio

async def gradual_unfollow(daily_limit: int = 50, days: int = 7):
    """Spread unfollows over multiple days."""
    async with Xeepy() as x:
        for day in range(days):
            result = await x.unfollow.non_followers(
                max_unfollows=daily_limit,
                delay_range=(10.0, 30.0)
            )
            
            print(f"Day {day + 1}: Unfollowed {len(result.unfollowed)}")
            
            if day < days - 1:
                print("Waiting 24 hours...")
                await asyncio.sleep(86400)

asyncio.run(gradual_unfollow())
```

## See Also

- [FollowActions](follow.md) - Follow operations
- [FollowingScraper](../scrapers/following.md) - Get following list
- [FollowersScraper](../scrapers/followers.md) - Get followers list

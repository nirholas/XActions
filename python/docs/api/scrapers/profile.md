# ProfileScraper

Scrapes user profile information including bio, follower counts, and account details.

## Import

```python
from xeepy.scrapers.profile import ProfileScraper
```

## Class Signature

```python
class ProfileScraper:
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
| `scrape(username)` | `User` | Get full profile for a user |
| `scrape_many(usernames)` | `List[User]` | Batch scrape multiple profiles |
| `get_basic_info(username)` | `User` | Get basic profile info only |
| `exists(username)` | `bool` | Check if username exists |

### `scrape`

```python
async def scrape(
    self,
    username: str,
    include_pinned_tweet: bool = True
) -> User
```

Scrape complete profile information for a user.

**Parameters:**
- `username`: Twitter/X username (without @)
- `include_pinned_tweet`: Include the user's pinned tweet

**Returns:** `User` object with full profile data

### `scrape_many`

```python
async def scrape_many(
    self,
    usernames: List[str],
    concurrency: int = 3
) -> List[User]
```

Scrape multiple profiles in parallel.

**Parameters:**
- `usernames`: List of usernames to scrape
- `concurrency`: Number of concurrent scrapes

### `get_basic_info`

```python
async def get_basic_info(self, username: str) -> User
```

Get basic profile info (faster, less data).

### `exists`

```python
async def exists(self, username: str) -> bool
```

Check if a username exists and is accessible.

## User Object

```python
@dataclass
class User:
    id: str                          # User ID
    username: str                    # @handle
    name: str                        # Display name
    bio: Optional[str]               # Profile bio
    location: Optional[str]          # Location
    website: Optional[str]           # Website URL
    created_at: datetime             # Account creation date
    followers_count: int             # Number of followers
    following_count: int             # Number following
    tweet_count: int                 # Total tweets
    like_count: int                  # Total likes
    listed_count: int                # Lists the user is on
    is_verified: bool                # Blue checkmark
    is_protected: bool               # Private account
    is_blue_verified: bool           # Twitter Blue subscriber
    profile_image_url: str           # Avatar URL
    profile_banner_url: Optional[str] # Banner image URL
    pinned_tweet: Optional[Tweet]    # Pinned tweet
```

## Usage Examples

### Basic Profile Scraping

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        profile = await x.scrape.profile("elonmusk")
        
        print(f"Name: {profile.name}")
        print(f"Username: @{profile.username}")
        print(f"Followers: {profile.followers_count:,}")
        print(f"Following: {profile.following_count:,}")
        print(f"Tweets: {profile.tweet_count:,}")
        print(f"Bio: {profile.bio}")
        print(f"Verified: {profile.is_verified}")

asyncio.run(main())
```

### Batch Profile Scraping

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        usernames = ["elonmusk", "BillGates", "sundarpichai"]
        
        profiles = await x.scrape.profiles(usernames)
        
        for profile in profiles:
            print(f"@{profile.username}: {profile.followers_count:,} followers")
        
        # Export to CSV
        x.export.to_csv(profiles, "profiles.csv")

asyncio.run(main())
```

### Check Username Availability

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        username = "desired_username"
        
        if await x.scrape.profile_exists(username):
            print(f"@{username} is taken")
        else:
            print(f"@{username} is available!")

asyncio.run(main())
```

### Profile Comparison

```python
from xeepy import Xeepy

async def compare_accounts(usernames: list):
    async with Xeepy() as x:
        profiles = await x.scrape.profiles(usernames)
        
        # Sort by followers
        sorted_profiles = sorted(
            profiles,
            key=lambda p: p.followers_count,
            reverse=True
        )
        
        print("Ranking by followers:")
        for i, p in enumerate(sorted_profiles, 1):
            ratio = p.followers_count / max(p.following_count, 1)
            print(f"{i}. @{p.username}: {p.followers_count:,} (ratio: {ratio:.1f})")

asyncio.run(compare_accounts(["user1", "user2", "user3"]))
```

## See Also

- [User Model](../models/user.md) - User data structure
- [FollowersScraper](followers.md) - Get user's followers
- [FollowingScraper](following.md) - Get who user follows

# User

Data model representing a user/account on X/Twitter.

## Import

```python
from xeepy.models import User
```

## Class Signature

```python
@dataclass
class User:
    id: str
    username: str
    name: str
    bio: str = ""
    location: str = ""
    website: str = ""
    created_at: Optional[datetime] = None
    followers_count: int = 0
    following_count: int = 0
    tweet_count: int = 0
    like_count: int = 0
    listed_count: int = 0
    is_verified: bool = False
    is_blue_verified: bool = False
    is_protected: bool = False
    profile_image_url: str = ""
    profile_banner_url: str = ""
    pinned_tweet_id: Optional[str] = None
    url: str = ""
```

## Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `str` | Unique user ID |
| `username` | `str` | Handle (without @) |
| `name` | `str` | Display name |
| `bio` | `str` | Profile description |
| `location` | `str` | Profile location |
| `website` | `str` | Profile website |
| `created_at` | `datetime` | Account creation date |
| `followers_count` | `int` | Number of followers |
| `following_count` | `int` | Number following |
| `tweet_count` | `int` | Total tweets |
| `like_count` | `int` | Total likes given |
| `listed_count` | `int` | Lists included in |
| `is_verified` | `bool` | Legacy verified |
| `is_blue_verified` | `bool` | Twitter Blue verified |
| `is_protected` | `bool` | Private account |
| `profile_image_url` | `str` | Avatar URL |
| `profile_banner_url` | `str` | Banner URL |
| `pinned_tweet_id` | `str` | Pinned tweet ID |
| `url` | `str` | Profile URL |

## Computed Properties

```python
@property
def follower_ratio(self) -> float:
    """Followers / Following ratio."""
    
@property
def account_age_days(self) -> int:
    """Days since account creation."""
    
@property
def tweets_per_day(self) -> float:
    """Average tweets per day."""
    
@property
def profile_url(self) -> str:
    """Full profile URL."""
```

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `to_dict()` | `Dict` | Convert to dictionary |
| `from_dict(data)` | `User` | Create from dictionary |
| `from_api(data)` | `User` | Create from API response |

## Usage Examples

### Access User Profile

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        user = await x.scrape.profile("username")
        
        print(f"=== @{user.username} ===")
        print(f"Name: {user.name}")
        print(f"Bio: {user.bio}")
        print(f"Location: {user.location}")
        print(f"Website: {user.website}")
        print(f"Followers: {user.followers_count:,}")
        print(f"Following: {user.following_count:,}")
        print(f"Tweets: {user.tweet_count:,}")
        print(f"Joined: {user.created_at}")
        print(f"Verified: {'✓' if user.is_verified or user.is_blue_verified else '✗'}")

asyncio.run(main())
```

### Calculate Follower Ratio

```python
from xeepy import Xeepy

async def analyze_ratios(usernames: list):
    async with Xeepy() as x:
        for username in usernames:
            user = await x.scrape.profile(username)
            
            ratio = user.follower_ratio
            status = "🌟" if ratio > 10 else "✓" if ratio > 1 else "📊"
            
            print(f"{status} @{user.username}: {ratio:.1f}x ({user.followers_count:,}/{user.following_count:,})")

asyncio.run(analyze_ratios(["user1", "user2", "user3"]))
```

### Find Verified Users

```python
from xeepy import Xeepy

async def get_verified_followers(username: str):
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=500)
        
        verified = [
            u for u in followers.items
            if u.is_verified or u.is_blue_verified
        ]
        
        print(f"Verified followers of @{username}:")
        for user in verified:
            badge = "✓" if user.is_verified else "🔵"
            print(f"  {badge} @{user.username} ({user.followers_count:,} followers)")

asyncio.run(get_verified_followers("elonmusk"))
```

### Account Age Analysis

```python
from xeepy import Xeepy

async def analyze_account_ages(username: str):
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=200)
        
        age_buckets = {"<30 days": 0, "30-90 days": 0, "90-365 days": 0, "1+ years": 0}
        
        for user in followers.items:
            age = user.account_age_days
            if age < 30:
                age_buckets["<30 days"] += 1
            elif age < 90:
                age_buckets["30-90 days"] += 1
            elif age < 365:
                age_buckets["90-365 days"] += 1
            else:
                age_buckets["1+ years"] += 1
        
        print(f"Account age distribution:")
        for bucket, count in age_buckets.items():
            pct = count / len(followers.items) * 100
            print(f"  {bucket}: {count} ({pct:.1f}%)")

asyncio.run(analyze_account_ages("username"))
```

### Filter by Follower Count

```python
from xeepy import Xeepy

async def find_influencers(username: str, min_followers: int = 10000):
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=500)
        
        influencers = [
            u for u in followers.items
            if u.followers_count >= min_followers
        ]
        
        influencers.sort(key=lambda u: u.followers_count, reverse=True)
        
        print(f"Influencers following @{username}:")
        for user in influencers[:20]:
            print(f"  @{user.username}: {user.followers_count:,}")

asyncio.run(find_influencers("myaccount"))
```

### Activity Analysis

```python
from xeepy import Xeepy

async def analyze_activity(username: str):
    async with Xeepy() as x:
        user = await x.scrape.profile(username)
        
        print(f"=== Activity: @{username} ===")
        print(f"Account age: {user.account_age_days} days")
        print(f"Total tweets: {user.tweet_count:,}")
        print(f"Tweets/day: {user.tweets_per_day:.2f}")
        
        if user.tweets_per_day > 10:
            print("🔥 Very active poster")
        elif user.tweets_per_day > 3:
            print("✓ Active poster")
        elif user.tweets_per_day > 0.5:
            print("📊 Moderate poster")
        else:
            print("💤 Infrequent poster")

asyncio.run(analyze_activity("username"))
```

### Export User List

```python
from xeepy import Xeepy

async def export_followers(username: str):
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=1000)
        
        data = [user.to_dict() for user in followers.items]
        
        x.export.to_csv(data, f"followers_{username}.csv")
        print(f"Exported {len(data)} followers")

asyncio.run(export_followers("myaccount"))
```

### Find Users by Bio

```python
from xeepy import Xeepy

async def find_by_bio(username: str, keywords: list):
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=500)
        
        matches = []
        for user in followers.items:
            bio_lower = user.bio.lower()
            if any(kw.lower() in bio_lower for kw in keywords):
                matches.append(user)
        
        print(f"Users with {keywords} in bio:")
        for user in matches[:20]:
            print(f"  @{user.username}: {user.bio[:60]}...")

asyncio.run(find_by_bio("pycon", ["python", "developer", "engineer"]))
```

### Compare Users

```python
from xeepy import Xeepy

async def compare_users(usernames: list):
    async with Xeepy() as x:
        users = []
        for username in usernames:
            user = await x.scrape.profile(username)
            users.append(user)
        
        print(f"{'Username':20} {'Followers':>12} {'Following':>12} {'Tweets':>10} {'Ratio':>8}")
        print("-" * 65)
        
        for user in users:
            print(f"@{user.username:19} {user.followers_count:>12,} {user.following_count:>12,} {user.tweet_count:>10,} {user.follower_ratio:>8.1f}")

asyncio.run(compare_users(["user1", "user2", "user3"]))
```

### Private Account Check

```python
from xeepy import Xeepy

async def check_access(usernames: list):
    async with Xeepy() as x:
        for username in usernames:
            user = await x.scrape.profile(username)
            
            if user.is_protected:
                print(f"🔒 @{user.username} - Private account")
            else:
                print(f"🌐 @{user.username} - Public account")

asyncio.run(check_access(["user1", "user2"]))
```

## See Also

- [Tweet](tweet.md) - Tweet data model
- [Engagement](engagement.md) - Engagement model
- [ProfileScraper](../scrapers/profile.md) - Scraping profiles

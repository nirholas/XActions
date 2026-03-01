# Database

SQLite-based storage for caching and historical data.

## Import

```python
from xeepy.storage import Database
```

## Class Signature

```python
class Database:
    def __init__(
        self,
        path: str = "xeepy.db",
        auto_create: bool = True
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `path` | `str` | `"xeepy.db"` | Database file path |
| `auto_create` | `bool` | `True` | Create tables automatically |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `save_user(user)` | `None` | Store user data |
| `save_tweet(tweet)` | `None` | Store tweet data |
| `save_followers(username, users)` | `None` | Store follower list |
| `get_user(username)` | `Optional[User]` | Retrieve user |
| `get_tweet(id)` | `Optional[Tweet]` | Retrieve tweet |
| `get_followers(username)` | `List[User]` | Retrieve followers |
| `get_history(username, metric)` | `List[DataPoint]` | Get historical data |
| `query(sql, params)` | `List[Dict]` | Execute raw SQL |
| `close()` | `None` | Close connection |

### `save_user`

```python
def save_user(
    self,
    user: User,
    timestamp: Optional[datetime] = None
) -> None
```

Store user data with optional timestamp.

### `get_history`

```python
def get_history(
    self,
    username: str,
    metric: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[DataPoint]
```

Retrieve historical data points.

**Parameters:**
- `username`: Account to get history for
- `metric`: Metric name (`followers`, `following`, `tweets`)
- `start_date`: Filter start
- `end_date`: Filter end

## DataPoint Object

```python
@dataclass
class DataPoint:
    timestamp: datetime
    value: int
    metric: str
```

## Usage Examples

### Basic Storage

```python
from xeepy import Xeepy
from xeepy.storage import Database

async def main():
    db = Database("my_data.db")
    
    async with Xeepy() as x:
        user = await x.scrape.profile("username")
        db.save_user(user)
        
        print(f"Saved @{user.username}")
    
    # Later retrieval
    stored = db.get_user("username")
    print(f"Retrieved: @{stored.username}")
    
    db.close()

asyncio.run(main())
```

### Store Followers

```python
from xeepy import Xeepy
from xeepy.storage import Database

async def store_followers(username: str):
    db = Database()
    
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=1000)
        
        db.save_followers(username, followers.items)
        print(f"Saved {len(followers.items)} followers")
    
    db.close()

asyncio.run(store_followers("myaccount"))
```

### Track Growth Over Time

```python
from xeepy import Xeepy
from xeepy.storage import Database
from datetime import datetime, timedelta

async def track_growth(username: str):
    db = Database()
    
    async with Xeepy() as x:
        user = await x.scrape.profile(username)
        db.save_user(user)
    
    # Get history
    history = db.get_history(
        username,
        metric="followers",
        start_date=datetime.now() - timedelta(days=30)
    )
    
    print(f"Follower history for @{username}:")
    for point in history:
        print(f"  {point.timestamp.date()}: {point.value:,}")
    
    db.close()

asyncio.run(track_growth("myaccount"))
```

### Compare Historical Data

```python
from xeepy.storage import Database
from datetime import datetime, timedelta

def compare_periods(username: str):
    db = Database()
    
    now = datetime.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    current = db.get_history(username, "followers", start_date=now - timedelta(hours=1))
    week = db.get_history(username, "followers", start_date=week_ago, end_date=week_ago + timedelta(hours=1))
    month = db.get_history(username, "followers", start_date=month_ago, end_date=month_ago + timedelta(hours=1))
    
    if current and week and month:
        print(f"@{username} growth:")
        print(f"  7-day: {current[0].value - week[0].value:+,}")
        print(f"  30-day: {current[0].value - month[0].value:+,}")
    
    db.close()

compare_periods("myaccount")
```

### Cache Tweet Data

```python
from xeepy import Xeepy
from xeepy.storage import Database

async def cache_tweets(username: str):
    db = Database()
    
    async with Xeepy() as x:
        tweets = await x.scrape.tweets(username, limit=100)
        
        for tweet in tweets.items:
            db.save_tweet(tweet)
        
        print(f"Cached {len(tweets.items)} tweets")
    
    # Retrieve cached
    cached = db.get_tweet("123456789")
    if cached:
        print(f"Found: {cached.text[:50]}...")
    
    db.close()

asyncio.run(cache_tweets("username"))
```

### Raw SQL Queries

```python
from xeepy.storage import Database

def custom_query():
    db = Database()
    
    # Custom query
    results = db.query("""
        SELECT username, followers_count, timestamp
        FROM users
        WHERE followers_count > ?
        ORDER BY followers_count DESC
        LIMIT 10
    """, [10000])
    
    for row in results:
        print(f"@{row['username']}: {row['followers_count']:,}")
    
    db.close()

custom_query()
```

### Detect Unfollowers

```python
from xeepy import Xeepy
from xeepy.storage import Database

async def detect_unfollowers(username: str):
    db = Database()
    
    # Get previously stored followers
    previous = set(u.username for u in db.get_followers(username))
    
    async with Xeepy() as x:
        current_result = await x.scrape.followers(username, limit=5000)
        current = set(u.username for u in current_result.items)
        
        # Save current
        db.save_followers(username, current_result.items)
    
    # Find differences
    unfollowed = previous - current
    new_followers = current - previous
    
    print(f"Unfollowed: {len(unfollowed)}")
    for user in list(unfollowed)[:10]:
        print(f"  - @{user}")
    
    print(f"\nNew followers: {len(new_followers)}")
    
    db.close()

asyncio.run(detect_unfollowers("myaccount"))
```

### Context Manager

```python
from xeepy import Xeepy
from xeepy.storage import Database

async def with_context_manager():
    with Database("data.db") as db:
        async with Xeepy() as x:
            user = await x.scrape.profile("username")
            db.save_user(user)
        
        # Auto-closes on exit

asyncio.run(with_context_manager())
```

### Export from Database

```python
from xeepy.storage import Database
from xeepy import Xeepy

def export_stored_data(username: str):
    db = Database()
    x = Xeepy()
    
    followers = db.get_followers(username)
    
    data = [
        {
            "username": u.username,
            "followers": u.followers_count,
            "following": u.following_count
        }
        for u in followers
    ]
    
    x.export.to_csv(data, f"stored_followers_{username}.csv")
    print(f"Exported {len(data)} stored followers")
    
    db.close()

export_stored_data("myaccount")
```

## See Also

- [Export](export.md) - Export functions
- [UnfollowersMonitor](../monitoring/unfollowers.md) - Unfollower tracking
- [GrowthMonitor](../monitoring/growth.md) - Growth tracking

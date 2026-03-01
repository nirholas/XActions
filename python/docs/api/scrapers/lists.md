# ListsScraper

Scrapes Twitter/X list members and list information.

## Import

```python
from xeepy.scrapers.lists import ListsScraper
```

## Class Signature

```python
class ListsScraper:
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
| `scrape_members(list_url)` | `ScrapeResult[User]` | Get list members |
| `scrape_subscribers(list_url)` | `ScrapeResult[User]` | Get list subscribers |
| `scrape_user_lists(username)` | `ScrapeResult[List]` | User's created lists |
| `scrape_user_memberships(username)` | `ScrapeResult[List]` | Lists user is member of |
| `get_list_info(list_url)` | `TwitterList` | Get list details |
| `scrape_list_timeline(list_url)` | `ScrapeResult[Tweet]` | Get list timeline |

### `scrape_members`

```python
async def scrape_members(
    self,
    list_url: str,
    limit: int = 500,
    cursor: Optional[str] = None
) -> ScrapeResult[User]
```

Scrape members of a Twitter list.

**Parameters:**
- `list_url`: URL of the Twitter list
- `limit`: Maximum members to fetch
- `cursor`: Pagination cursor

### `scrape_list_timeline`

```python
async def scrape_list_timeline(
    self,
    list_url: str,
    limit: int = 100
) -> ScrapeResult[Tweet]
```

Scrape tweets from a list's timeline.

### `get_list_info`

```python
async def get_list_info(self, list_url: str) -> TwitterList
```

Get detailed information about a list.

## TwitterList Object

```python
@dataclass
class TwitterList:
    id: str                          # List ID
    name: str                        # List name
    description: Optional[str]       # List description
    owner: User                      # List owner
    member_count: int                # Number of members
    subscriber_count: int            # Number of subscribers
    is_private: bool                 # Private list flag
    created_at: datetime             # Creation date
    banner_url: Optional[str]        # List banner image
```

## Usage Examples

### Scrape List Members

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.list_members(
            "https://x.com/i/lists/123456789",
            limit=500
        )
        
        print(f"List has {len(result.items)} members")
        
        for member in result.items:
            print(f"@{member.username} - {member.followers_count:,} followers")

asyncio.run(main())
```

### Get List Information

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        list_info = await x.scrape.list_info(
            "https://x.com/i/lists/123456789"
        )
        
        print(f"List: {list_info.name}")
        print(f"Owner: @{list_info.owner.username}")
        print(f"Description: {list_info.description}")
        print(f"Members: {list_info.member_count}")
        print(f"Subscribers: {list_info.subscriber_count}")

asyncio.run(main())
```

### Scrape List Timeline

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.list_timeline(
            "https://x.com/i/lists/123456789",
            limit=100
        )
        
        for tweet in result.items:
            print(f"@{tweet.author.username}: {tweet.text[:80]}...")

asyncio.run(main())
```

### Get User's Lists

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Lists created by user
        created = await x.scrape.user_lists("username")
        print(f"User created {len(created.items)} lists")
        
        # Lists user is a member of
        memberships = await x.scrape.user_list_memberships("username")
        print(f"User is member of {len(memberships.items)} lists")
        
        for lst in memberships.items:
            print(f"  - {lst.name} by @{lst.owner.username}")

asyncio.run(main())
```

### Export List Members

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.list_members(
            "https://x.com/i/lists/123456789",
            limit=1000
        )
        
        # Export to CSV with custom fields
        data = [
            {
                "username": m.username,
                "name": m.name,
                "followers": m.followers_count,
                "following": m.following_count,
                "verified": m.is_verified
            }
            for m in result.items
        ]
        
        x.export.to_csv(data, "list_members.csv")

asyncio.run(main())
```

### Find Common List Members

```python
from xeepy import Xeepy

async def find_common_members(list_urls: list):
    async with Xeepy() as x:
        all_members = []
        
        for url in list_urls:
            result = await x.scrape.list_members(url, limit=500)
            all_members.append(set(m.username for m in result.items))
        
        common = all_members[0]
        for members in all_members[1:]:
            common = common.intersection(members)
        
        print(f"Common members across {len(list_urls)} lists: {len(common)}")
        return list(common)

asyncio.run(find_common_members([
    "https://x.com/i/lists/111",
    "https://x.com/i/lists/222"
]))
```

### List Member Analytics

```python
from xeepy import Xeepy

async def analyze_list(list_url: str):
    async with Xeepy() as x:
        info = await x.scrape.list_info(list_url)
        members = await x.scrape.list_members(list_url, limit=500)
        
        total_followers = sum(m.followers_count for m in members.items)
        avg_followers = total_followers / len(members.items)
        verified_count = sum(1 for m in members.items if m.is_verified)
        
        print(f"List Analysis: {info.name}")
        print("=" * 40)
        print(f"Total members: {info.member_count}")
        print(f"Combined reach: {total_followers:,}")
        print(f"Avg followers: {avg_followers:,.0f}")
        print(f"Verified members: {verified_count}")

asyncio.run(analyze_list("https://x.com/i/lists/123"))
```

## See Also

- [User Model](../models/user.md) - User data structure
- [FollowersScraper](followers.md) - Followers scraping
- [ProfileScraper](profile.md) - Profile information

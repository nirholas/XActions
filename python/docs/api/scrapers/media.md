# MediaScraper

Scrapes media posts (photos and videos) from user profiles.

## Import

```python
from xeepy.scrapers.media import MediaScraper
```

## Class Signature

```python
class MediaScraper:
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
| `scrape(username, limit)` | `ScrapeResult[Tweet]` | Get media tweets |
| `scrape_photos(username)` | `ScrapeResult[Tweet]` | Photos only |
| `scrape_videos(username)` | `ScrapeResult[Tweet]` | Videos only |
| `scrape_gifs(username)` | `ScrapeResult[Tweet]` | GIFs only |
| `get_media_urls(username)` | `List[MediaItem]` | Extract media URLs |

### `scrape`

```python
async def scrape(
    self,
    username: str,
    limit: int = 100,
    media_type: Optional[str] = None,
    cursor: Optional[str] = None
) -> ScrapeResult[Tweet]
```

Scrape media tweets from a user's profile.

**Parameters:**
- `username`: Target username
- `limit`: Maximum tweets to fetch
- `media_type`: Filter type (`photo`, `video`, `gif`, `all`)
- `cursor`: Pagination cursor

### `get_media_urls`

```python
async def get_media_urls(
    self,
    username: str,
    limit: int = 100,
    media_type: Optional[str] = None
) -> List[MediaItem]
```

Extract direct media URLs from user's media tweets.

## MediaItem Object

```python
@dataclass
class MediaItem:
    url: str                         # Direct media URL
    type: str                        # photo, video, gif
    tweet_id: str                    # Source tweet ID
    width: int                       # Media width
    height: int                      # Media height
    duration_ms: Optional[int]       # Video duration (ms)
    thumbnail_url: Optional[str]     # Video thumbnail
    alt_text: Optional[str]          # Accessibility text
    views: Optional[int]             # Video views
```

## Usage Examples

### Basic Media Scraping

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.media("username", limit=100)
        
        for tweet in result.items:
            print(f"Tweet: {tweet.text[:50]}...")
            for media in tweet.media:
                print(f"  - {media.type}: {media.url}")

asyncio.run(main())
```

### Photos Only

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.media_photos("username", limit=50)
        
        photo_urls = []
        for tweet in result.items:
            for media in tweet.media:
                if media.type == "photo":
                    photo_urls.append(media.url)
        
        print(f"Found {len(photo_urls)} photos")
        
        # Save URLs to file
        with open("photos.txt", "w") as f:
            f.write("\n".join(photo_urls))

asyncio.run(main())
```

### Videos Only

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.scrape.media_videos("username", limit=50)
        
        for tweet in result.items:
            for media in tweet.media:
                if media.type == "video":
                    print(f"Video: {media.url}")
                    print(f"  Duration: {media.duration_ms / 1000}s")
                    print(f"  Views: {media.views:,}")

asyncio.run(main())
```

### Extract All Media URLs

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        media_items = await x.scrape.media_urls("username", limit=200)
        
        # Group by type
        photos = [m for m in media_items if m.type == "photo"]
        videos = [m for m in media_items if m.type == "video"]
        gifs = [m for m in media_items if m.type == "gif"]
        
        print(f"Photos: {len(photos)}")
        print(f"Videos: {len(videos)}")
        print(f"GIFs: {len(gifs)}")
        
        # Export URLs
        data = [{"url": m.url, "type": m.type, "tweet_id": m.tweet_id} for m in media_items]
        x.export.to_csv(data, "media_urls.csv")

asyncio.run(main())
```

### High-Quality Image URLs

```python
from xeepy import Xeepy

async def get_hq_images(username: str):
    """Get highest quality image URLs."""
    async with Xeepy() as x:
        media_items = await x.scrape.media_urls(
            username,
            limit=100,
            media_type="photo"
        )
        
        hq_urls = []
        for item in media_items:
            # Modify URL for highest quality
            hq_url = item.url.replace("name=medium", "name=4096x4096")
            hq_url = hq_url.replace("name=small", "name=4096x4096")
            if "?" not in hq_url:
                hq_url += "?name=4096x4096"
            hq_urls.append(hq_url)
        
        return hq_urls

asyncio.run(get_hq_images("photographer"))
```

### Media Analytics

```python
from xeepy import Xeepy
from collections import Counter

async def media_analytics(username: str):
    async with Xeepy() as x:
        result = await x.scrape.media(username, limit=500)
        
        media_types = Counter()
        total_views = 0
        total_likes = 0
        
        for tweet in result.items:
            total_likes += tweet.like_count
            for media in tweet.media:
                media_types[media.type] += 1
                if media.views:
                    total_views += media.views
        
        print(f"Media Analytics for @{username}")
        print("=" * 40)
        print(f"Total media tweets: {len(result.items)}")
        print(f"Media breakdown: {dict(media_types)}")
        print(f"Total video views: {total_views:,}")
        print(f"Avg likes per media tweet: {total_likes / len(result.items):.1f}")

asyncio.run(media_analytics("username"))
```

## See Also

- [Tweet Model](../models/tweet.md) - Tweet data structure
- [MediaDownloader](downloads.md) - Download media files
- [TweetsScraper](tweets.md) - General tweet scraping

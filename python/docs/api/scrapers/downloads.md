# MediaDownloader

Downloads media files (photos, videos, GIFs) from tweets.

## Import

```python
from xeepy.scrapers.downloads import MediaDownloader
```

## Class Signature

```python
class MediaDownloader:
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
| `scrape(tweet_ids, output_dir)` | `DownloadResult` | Download media from tweets |
| `download_user_media(username)` | `List[str]` | Download all user media |
| `download_photo(url, path)` | `str` | Download single photo |
| `download_video(url, path)` | `str` | Download single video |
| `download_hq(tweet_id)` | `str` | Download highest quality |

### `scrape`

```python
async def scrape(
    self,
    tweet_ids: List[str],
    output_dir: str = "media",
    photos: bool = True,
    videos: bool = True,
    gifs: bool = True,
    hq_images: bool = False,
    concurrent: int = 3
) -> DownloadResult
```

Download media from multiple tweets.

**Parameters:**
- `tweet_ids`: List of tweet IDs to download from
- `output_dir`: Directory to save files
- `photos`: Download photos
- `videos`: Download videos
- `gifs`: Download GIFs
- `hq_images`: Get highest quality images (4096x4096)
- `concurrent`: Concurrent downloads

### `download_user_media`

```python
async def download_user_media(
    self,
    username: str,
    output_dir: str = "media",
    limit: int = 100,
    media_types: List[str] = ["photo", "video", "gif"]
) -> List[str]
```

Download all media from a user's profile.

### `download_photo`

```python
async def download_photo(
    self,
    url: str,
    output_path: Optional[str] = None,
    quality: str = "large"
) -> str
```

Download a single photo.

**Parameters:**
- `url`: Photo URL
- `output_path`: Custom save path
- `quality`: Quality level (`thumb`, `small`, `medium`, `large`, `orig`)

### `download_video`

```python
async def download_video(
    self,
    url: str,
    output_path: Optional[str] = None,
    quality: str = "highest"
) -> str
```

Download a single video.

## DownloadResult Object

```python
@dataclass
class DownloadResult:
    downloaded: List[str]            # Successfully downloaded paths
    failed: List[Dict]               # Failed downloads with errors
    total_size: int                  # Total bytes downloaded
    duration: float                  # Time taken in seconds
    
    @property
    def success_count(self) -> int:
        return len(self.downloaded)
    
    @property
    def failure_count(self) -> int:
        return len(self.failed)
```

## Usage Examples

### Download from Tweet IDs

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.media.download(
            tweet_ids=["123456789", "987654321"],
            output_dir="downloads",
            photos=True,
            videos=True
        )
        
        print(f"Downloaded: {result.success_count} files")
        print(f"Failed: {result.failure_count}")
        print(f"Total size: {result.total_size / 1024 / 1024:.1f} MB")
        
        for path in result.downloaded:
            print(f"  - {path}")

asyncio.run(main())
```

### Download User's Media

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        paths = await x.media.download_user_media(
            "username",
            output_dir="media/username",
            limit=200
        )
        
        print(f"Downloaded {len(paths)} files")

asyncio.run(main())
```

### High Quality Images

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        result = await x.media.download(
            tweet_ids=["123456789"],
            output_dir="hq_images",
            photos=True,
            videos=False,
            hq_images=True  # 4096x4096 quality
        )
        
        print(f"Downloaded {result.success_count} HQ images")

asyncio.run(main())
```

### Download Single Photo

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        photo_url = "https://pbs.twimg.com/media/xxx.jpg"
        
        path = await x.media.download_photo(
            photo_url,
            output_path="my_photo.jpg",
            quality="orig"
        )
        
        print(f"Saved to: {path}")

asyncio.run(main())
```

### Download Single Video

```python
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        video_url = "https://video.twimg.com/ext_tw_video/xxx.mp4"
        
        path = await x.media.download_video(
            video_url,
            output_path="my_video.mp4",
            quality="highest"
        )
        
        print(f"Saved to: {path}")

asyncio.run(main())
```

### Batch Download with Progress

```python
from xeepy import Xeepy

async def download_with_progress(tweet_ids: list):
    async with Xeepy() as x:
        total = len(tweet_ids)
        downloaded = 0
        
        for i, tweet_id in enumerate(tweet_ids):
            try:
                result = await x.media.download(
                    tweet_ids=[tweet_id],
                    output_dir="batch_media"
                )
                downloaded += result.success_count
                print(f"Progress: {i+1}/{total} tweets processed")
            except Exception as e:
                print(f"Failed {tweet_id}: {e}")
        
        print(f"Total downloaded: {downloaded} files")

asyncio.run(download_with_progress(["111", "222", "333"]))
```

### Download Only New Media

```python
from xeepy import Xeepy
import os

async def download_new_only(username: str, output_dir: str):
    """Download only media that doesn't exist locally."""
    async with Xeepy() as x:
        # Get existing files
        existing = set()
        if os.path.exists(output_dir):
            existing = set(os.listdir(output_dir))
        
        # Get user's media tweets
        result = await x.scrape.media(username, limit=200)
        
        new_downloads = []
        for tweet in result.items:
            for media in tweet.media:
                filename = f"{tweet.id}_{media.type}.{'jpg' if media.type == 'photo' else 'mp4'}"
                if filename not in existing:
                    path = await x.media.download_photo(
                        media.url,
                        output_path=os.path.join(output_dir, filename)
                    ) if media.type == "photo" else await x.media.download_video(
                        media.url,
                        output_path=os.path.join(output_dir, filename)
                    )
                    new_downloads.append(path)
        
        print(f"Downloaded {len(new_downloads)} new files")

asyncio.run(download_new_only("username", "media_archive"))
```

## See Also

- [MediaScraper](media.md) - Scrape media tweets
- [TweetsScraper](tweets.md) - User tweets
- [Tweet Model](../models/tweet.md) - Tweet structure

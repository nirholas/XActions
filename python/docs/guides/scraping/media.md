# Media Post Scraping

Extract and download media content from tweets including photos, videos, GIFs, and high-quality image variants.

## Overview

The media scraper retrieves visual content from tweets, enabling archival, analysis, and content curation. It supports downloading photos at various resolutions, videos in multiple qualities, and animated GIFs.

## Use Cases

- **Content Archival**: Preserve media before potential deletion
- **Asset Collection**: Build image libraries for inspiration
- **Research**: Analyze visual content trends
- **Backup**: Archive your own media posts
- **Curation**: Collect media for newsletters or compilations

## Basic Usage

```python
import asyncio
from xeepy import Xeepy

async def scrape_media():
    async with Xeepy() as x:
        # Get media posts from a user
        media_tweets = await x.scrape.media("nasa", limit=50)
        
        for tweet in media_tweets:
            print(f"Tweet: {tweet.text[:50]}...")
            for media in tweet.media:
                print(f"  Type: {media.type}")
                print(f"  URL: {media.url}")

asyncio.run(scrape_media())
```

## Downloading Media Files

```python
async def download_media():
    async with Xeepy() as x:
        # Download media from specific tweets
        result = await x.media.download(
            tweet_ids=["123456789", "987654321"],
            output_dir="downloads/media",
            photos=True,
            videos=True,
            gifs=True,
            hq_images=True  # Highest quality images
        )
        
        print(f"Downloaded {len(result.files)} files")
        for file in result.files:
            print(f"  {file.filename}: {file.size_mb:.1f} MB")

asyncio.run(download_media())
```

## Scraping User Media Gallery

```python
async def scrape_user_gallery():
    async with Xeepy() as x:
        # Get all media from a user's media tab
        media_tweets = await x.scrape.media(
            username="natgeo",
            limit=200,
            media_type="all",       # all, photos, videos
            include_retweets=False  # Original content only
        )
        
        # Categorize by media type
        photos = []
        videos = []
        gifs = []
        
        for tweet in media_tweets:
            for media in tweet.media:
                if media.type == "photo":
                    photos.append(media)
                elif media.type == "video":
                    videos.append(media)
                elif media.type == "animated_gif":
                    gifs.append(media)
        
        print(f"Photos: {len(photos)}")
        print(f"Videos: {len(videos)}")
        print(f"GIFs: {len(gifs)}")

asyncio.run(scrape_user_gallery())
```

## Batch Media Download

```python
async def batch_download():
    async with Xeepy() as x:
        users = ["nasa", "natgeo", "bbcearth"]
        
        for username in users:
            print(f"\nProcessing @{username}...")
            
            # Download user's media
            paths = await x.media.download_user_media(
                username=username,
                output_dir=f"media/{username}",
                limit=100,
                photos=True,
                videos=True,
                hq_images=True
            )
            
            print(f"  Downloaded {len(paths)} files")

asyncio.run(batch_download())
```

## Video Quality Options

```python
async def download_videos():
    async with Xeepy() as x:
        # Download videos with quality preference
        result = await x.media.download(
            tweet_ids=["123456789"],
            output_dir="videos",
            videos=True,
            video_quality="highest",  # highest, 720p, 480p, lowest
            include_thumbnail=True    # Save video thumbnails
        )
        
        for file in result.files:
            if file.type == "video":
                print(f"Video: {file.filename}")
                print(f"  Resolution: {file.width}x{file.height}")
                print(f"  Duration: {file.duration_seconds}s")
                print(f"  Size: {file.size_mb:.1f} MB")

asyncio.run(download_videos())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | str | required | Target username |
| `limit` | int | 50 | Maximum media tweets |
| `media_type` | str | "all" | all, photos, videos |
| `include_retweets` | bool | True | Include retweeted media |
| `output_dir` | str | "media" | Download directory |
| `photos` | bool | True | Download photos |
| `videos` | bool | True | Download videos |
| `gifs` | bool | True | Download GIFs |
| `hq_images` | bool | False | Highest quality images |
| `video_quality` | str | "highest" | Video quality preference |

!!! tip "High Quality Images"
    Use `hq_images=True` to download the largest available image variants. Twitter stores multiple resolutions; this option fetches the original upload quality.

!!! note "Video Limitations"
    Some videos may have DRM or playback restrictions. The scraper downloads the best available quality that's publicly accessible.

## Image Quality Variants

```python
async def get_image_variants():
    async with Xeepy() as x:
        media_tweets = await x.scrape.media("username", limit=10)
        
        for tweet in media_tweets:
            for media in tweet.media:
                if media.type == "photo":
                    print(f"\nImage variants:")
                    print(f"  Thumb: {media.thumb_url}")
                    print(f"  Small: {media.small_url}")
                    print(f"  Medium: {media.medium_url}")
                    print(f"  Large: {media.large_url}")
                    print(f"  Original: {media.original_url}")

asyncio.run(get_image_variants())
```

## Media Metadata Extraction

```python
async def extract_media_metadata():
    async with Xeepy() as x:
        media_tweets = await x.scrape.media("username", limit=50)
        
        for tweet in media_tweets:
            print(f"\nTweet ID: {tweet.id}")
            print(f"Posted: {tweet.created_at}")
            
            for media in tweet.media:
                print(f"\n  Media ID: {media.id}")
                print(f"  Type: {media.type}")
                print(f"  Dimensions: {media.width}x{media.height}")
                
                if media.type == "video":
                    print(f"  Duration: {media.duration_ms}ms")
                    print(f"  Views: {media.view_count}")
                
                # Alt text if available
                if media.alt_text:
                    print(f"  Alt text: {media.alt_text}")

asyncio.run(extract_media_metadata())
```

## Organizing Downloaded Media

```python
async def organized_download():
    async with Xeepy() as x:
        from datetime import datetime
        
        media_tweets = await x.scrape.media("username", limit=100)
        
        for tweet in media_tweets:
            # Organize by date and type
            date_str = tweet.created_at.strftime("%Y/%m")
            
            for media in tweet.media:
                type_dir = media.type  # photo, video, animated_gif
                output_path = f"media/{date_str}/{type_dir}"
                
                await x.media.download_single(
                    media_url=media.original_url,
                    output_dir=output_path,
                    filename=f"{tweet.id}_{media.id}"
                )

asyncio.run(organized_download())
```

## Best Practices

1. **Respect Copyright**: Only download media you have rights to use
2. **Use HQ Sparingly**: High-quality downloads consume more bandwidth and storage
3. **Organize by Date**: Structure directories by date for easy navigation
4. **Check File Sizes**: Videos can be large; monitor disk space
5. **Handle Errors**: Some media may be unavailable; implement error handling
6. **Rate Limiting**: Space out bulk downloads to avoid rate limits

## Related Guides

- [User Tweets Scraping](tweets.md)
- [Thread Unrolling](threads.md)
- [Search Scraping](search.md)

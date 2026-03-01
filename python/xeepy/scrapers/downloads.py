"""
Media downloader for X/Twitter content.

Supports:
- Download photos (with HQ variants)
- Download videos (with quality selection)
- Download GIFs
- Download media cards
- Batch downloads from tweets/users
"""

from __future__ import annotations

import asyncio
import hashlib
import mimetypes
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse, parse_qs

import aiofiles
import httpx
from loguru import logger

from xeepy.core.browser import BrowserManager
from xeepy.core.rate_limiter import RateLimiter
from xeepy.scrapers.base import BaseScraper, ScrapeResult


@dataclass
class MediaItem:
    """
    Represents a downloadable media item.
    
    Attributes:
        id: Unique media ID
        url: URL to the media file
        type: Media type (photo, video, gif, card)
        tweet_id: ID of tweet containing media
        author: Username of tweet author
        width: Media width in pixels
        height: Media height in pixels
        duration: Video duration in seconds
        thumbnail_url: Video thumbnail URL
        alt_text: Alt text description
        variants: List of quality variants (for video)
        downloaded_path: Local path after download
    """
    
    id: str
    url: str
    type: str = "photo"  # photo, video, gif, card
    tweet_id: str = ""
    author: str = ""
    width: int = 0
    height: int = 0
    duration: float = 0.0
    thumbnail_url: str = ""
    alt_text: str = ""
    variants: list[dict] = field(default_factory=list)
    downloaded_path: str = ""
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "url": self.url,
            "type": self.type,
            "tweet_id": self.tweet_id,
            "author": self.author,
            "width": self.width,
            "height": self.height,
            "duration": self.duration,
            "thumbnail_url": self.thumbnail_url,
            "alt_text": self.alt_text,
            "variants": self.variants,
            "downloaded_path": self.downloaded_path,
        }
    
    def get_best_quality_url(self) -> str:
        """Get the highest quality URL for this media."""
        if self.type == "photo":
            # Add :orig suffix for original quality
            if "?" not in self.url:
                return f"{self.url}?format=jpg&name=orig"
            return self.url
        
        if self.type in ["video", "gif"] and self.variants:
            # Find highest bitrate variant
            best = max(
                self.variants,
                key=lambda v: v.get("bitrate", 0) if v.get("content_type") == "video/mp4" else 0
            )
            return best.get("url", self.url)
        
        return self.url


class MediaDownloader(BaseScraper):
    """
    Downloader for X/Twitter media content.
    
    Supports downloading photos, videos, GIFs, and media cards
    with quality selection and batch operations.
    """
    
    def __init__(
        self,
        browser_manager: BrowserManager,
        rate_limiter: RateLimiter | None = None,
    ):
        super().__init__(browser_manager, rate_limiter)
        self._http_client: httpx.AsyncClient | None = None
    
    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(
                timeout=60.0,
                follow_redirects=True,
            )
        return self._http_client
    
    async def scrape(
        self,
        tweet_ids: list[str] | None = None,
        user_ids: list[str] | None = None,
        output_dir: str = "media",
        photos: bool = True,
        videos: bool = True,
        gifs: bool = True,
        cards: bool = False,
        hq_images: bool = True,
        video_thumbnails: bool = False,
        **kwargs,
    ) -> ScrapeResult[MediaItem]:
        """
        Download media from tweets or users.
        
        Args:
            tweet_ids: List of tweet IDs to download media from
            user_ids: List of user IDs to download all media from
            output_dir: Directory to save downloaded files
            photos: Download photos
            videos: Download videos
            gifs: Download GIFs
            cards: Download media cards
            hq_images: Download highest quality images
            video_thumbnails: Also download video thumbnails
            
        Returns:
            ScrapeResult containing MediaItem objects
        """
        result = ScrapeResult[MediaItem](target="media_download")
        
        try:
            # Create output directory
            output_path = Path(output_dir)
            output_path.mkdir(parents=True, exist_ok=True)
            
            media_items = []
            
            # Collect media from tweets
            if tweet_ids:
                for tweet_id in tweet_ids:
                    await self.rate_limiter.wait()
                    items = await self._get_media_from_tweet(tweet_id)
                    media_items.extend(items)
            
            # Collect media from user timelines
            if user_ids:
                for user_id in user_ids:
                    await self.rate_limiter.wait()
                    items = await self._get_media_from_user(user_id)
                    media_items.extend(items)
            
            # Filter by type
            filtered_items = []
            for item in media_items:
                if item.type == "photo" and photos:
                    filtered_items.append(item)
                elif item.type == "video" and videos:
                    filtered_items.append(item)
                elif item.type == "gif" and gifs:
                    filtered_items.append(item)
                elif item.type == "card" and cards:
                    filtered_items.append(item)
            
            # Download media
            for item in filtered_items:
                try:
                    downloaded_path = await self._download_media(
                        item,
                        output_path,
                        hq=hq_images,
                    )
                    item.downloaded_path = downloaded_path
                    
                    # Download thumbnail if requested
                    if video_thumbnails and item.thumbnail_url:
                        await self._download_file(
                            item.thumbnail_url,
                            output_path / f"{item.id}_thumb.jpg"
                        )
                    
                except Exception as e:
                    logger.warning(f"Failed to download {item.id}: {e}")
            
            result.items = filtered_items
            result.total_found = len(filtered_items)
            result.completed_at = datetime.now()
            
            logger.info(f"Downloaded {len(filtered_items)} media items to {output_dir}")
            
        except Exception as e:
            logger.error(f"Media download error: {e}")
            result.error = str(e)
            result.completed_at = datetime.now()
        
        return result
    
    async def _get_media_from_tweet(self, tweet_id: str) -> list[MediaItem]:
        """Extract media items from a tweet."""
        items = []
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to tweet
            await page.goto(
                f"https://twitter.com/i/status/{tweet_id}",
                wait_until="networkidle"
            )
            await asyncio.sleep(2)
            
            # Get author
            author_el = await page.query_selector('[data-testid="User-Name"] a')
            author = ""
            if author_el:
                href = await author_el.get_attribute("href")
                author = href.split("/")[-1] if href else ""
            
            # Find photos
            photos = await page.query_selector_all('[data-testid="tweetPhoto"] img')
            for i, photo in enumerate(photos):
                src = await photo.get_attribute("src")
                if src and "media" in src:
                    # Extract original URL
                    url = src.split("?")[0] if "?" in src else src
                    
                    # Get dimensions
                    width = await photo.get_attribute("width") or "0"
                    height = await photo.get_attribute("height") or "0"
                    
                    # Get alt text
                    alt = await photo.get_attribute("alt") or ""
                    
                    item = MediaItem(
                        id=f"{tweet_id}_photo_{i}",
                        url=url,
                        type="photo",
                        tweet_id=tweet_id,
                        author=author,
                        width=int(width) if width.isdigit() else 0,
                        height=int(height) if height.isdigit() else 0,
                        alt_text=alt,
                    )
                    items.append(item)
            
            # Find videos
            videos = await page.query_selector_all('video')
            for i, video in enumerate(videos):
                src = await video.get_attribute("src")
                poster = await video.get_attribute("poster")
                
                # Try to get video source from video element or blob
                if src:
                    item = MediaItem(
                        id=f"{tweet_id}_video_{i}",
                        url=src,
                        type="video",
                        tweet_id=tweet_id,
                        author=author,
                        thumbnail_url=poster or "",
                    )
                    items.append(item)
            
            # Try to extract video URLs from network requests
            # by looking at the page state
            video_urls = await page.evaluate("""
                () => {
                    const urls = [];
                    const videos = document.querySelectorAll('video source');
                    videos.forEach(v => {
                        if (v.src) urls.push({url: v.src, type: v.type});
                    });
                    return urls;
                }
            """)
            
            for i, v in enumerate(video_urls):
                if v.get("url") and "video" in v.get("url", ""):
                    item = MediaItem(
                        id=f"{tweet_id}_video_src_{i}",
                        url=v["url"],
                        type="video" if "video/mp4" in v.get("type", "") else "gif",
                        tweet_id=tweet_id,
                        author=author,
                    )
                    if item.id not in [x.id for x in items]:
                        items.append(item)
            
            # Find GIFs (animated images)
            gifs = await page.query_selector_all('[data-testid="tweetPhoto"] video')
            for i, gif in enumerate(gifs):
                src = await gif.get_attribute("src")
                if src and "tweet_video" in src:
                    item = MediaItem(
                        id=f"{tweet_id}_gif_{i}",
                        url=src,
                        type="gif",
                        tweet_id=tweet_id,
                        author=author,
                    )
                    items.append(item)
            
            logger.info(f"Found {len(items)} media items in tweet {tweet_id}")
            
        except Exception as e:
            logger.error(f"Error getting media from tweet {tweet_id}: {e}")
        
        return items
    
    async def _get_media_from_user(
        self,
        user_id: str,
        limit: int = 100,
    ) -> list[MediaItem]:
        """Get all media from a user's media tab."""
        items = []
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to user's media tab
            await page.goto(
                f"https://twitter.com/{user_id}/media",
                wait_until="networkidle"
            )
            await asyncio.sleep(2)
            
            # Scroll to load more media
            collected_tweets = set()
            for _ in range(10):  # Scroll iterations
                # Find tweet links with media
                tweet_links = await page.query_selector_all('a[href*="/status/"]')
                
                for link in tweet_links:
                    href = await link.get_attribute("href")
                    if href and "/status/" in href:
                        match = re.search(r'/status/(\d+)', href)
                        if match:
                            tweet_id = match.group(1)
                            if tweet_id not in collected_tweets:
                                collected_tweets.add(tweet_id)
                
                if len(collected_tweets) >= limit:
                    break
                
                # Scroll down
                await page.evaluate("window.scrollBy(0, 1000)")
                await asyncio.sleep(1)
            
            # Get media from each tweet
            for tweet_id in list(collected_tweets)[:limit]:
                await self.rate_limiter.wait()
                tweet_items = await self._get_media_from_tweet(tweet_id)
                items.extend(tweet_items)
            
            logger.info(f"Found {len(items)} media items from user {user_id}")
            
        except Exception as e:
            logger.error(f"Error getting media from user {user_id}: {e}")
        
        return items
    
    async def _download_media(
        self,
        item: MediaItem,
        output_dir: Path,
        hq: bool = True,
    ) -> str:
        """Download a single media item."""
        url = item.get_best_quality_url() if hq else item.url
        
        # Determine file extension
        if item.type == "photo":
            ext = ".jpg"
            if "png" in url.lower():
                ext = ".png"
            elif "gif" in url.lower():
                ext = ".gif"
        elif item.type == "video":
            ext = ".mp4"
        elif item.type == "gif":
            ext = ".mp4"  # Twitter GIFs are actually mp4
        else:
            ext = Path(urlparse(url).path).suffix or ".bin"
        
        # Generate filename
        filename = f"{item.author}_{item.tweet_id}_{item.id}{ext}"
        output_path = output_dir / filename
        
        # Download
        await self._download_file(url, output_path)
        
        return str(output_path)
    
    async def _download_file(self, url: str, output_path: Path) -> None:
        """Download a file from URL."""
        client = await self._get_http_client()
        
        try:
            response = await client.get(url)
            response.raise_for_status()
            
            async with aiofiles.open(output_path, "wb") as f:
                await f.write(response.content)
            
            logger.debug(f"Downloaded: {output_path}")
            
        except Exception as e:
            logger.error(f"Download failed for {url}: {e}")
            raise
    
    async def download_tweet_media(
        self,
        tweet_id: str,
        output_dir: str = "media",
        hq: bool = True,
    ) -> list[str]:
        """
        Convenience method to download all media from a single tweet.
        
        Args:
            tweet_id: Tweet ID to download media from
            output_dir: Output directory
            hq: Download highest quality
            
        Returns:
            List of downloaded file paths
        """
        result = await self.scrape(
            tweet_ids=[tweet_id],
            output_dir=output_dir,
            hq_images=hq,
        )
        return [item.downloaded_path for item in result.items if item.downloaded_path]
    
    async def download_user_media(
        self,
        username: str,
        output_dir: str = "media",
        limit: int = 100,
        hq: bool = True,
    ) -> list[str]:
        """
        Convenience method to download all media from a user.
        
        Args:
            username: Username to download media from
            output_dir: Output directory
            limit: Maximum number of media items
            hq: Download highest quality
            
        Returns:
            List of downloaded file paths
        """
        result = await self.scrape(
            user_ids=[username],
            output_dir=output_dir,
            hq_images=hq,
        )
        return [item.downloaded_path for item in result.items if item.downloaded_path]
    
    async def close(self) -> None:
        """Close HTTP client."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None


# Convenience functions
async def download_media(
    tweet_ids: list[str],
    output_dir: str = "media",
    browser_manager: BrowserManager = None,
) -> list[str]:
    """Download media from tweets."""
    downloader = MediaDownloader(browser_manager)
    result = await downloader.scrape(tweet_ids=tweet_ids, output_dir=output_dir)
    return [item.downloaded_path for item in result.items if item.downloaded_path]

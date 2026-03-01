"""
Bookmark Manager

Unified manager for all bookmark operations.
"""

import asyncio
from typing import Callable, Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import BookmarkResult
from xeepy.actions.engagement.bookmark.bookmark_tweet import BookmarkTweet
from xeepy.actions.engagement.bookmark.remove_bookmark import RemoveBookmark
from xeepy.actions.engagement.bookmark.export_bookmarks import ExportBookmarks


class BookmarkManager(BaseAction):
    """
    Unified manager for bookmark operations.
    
    Provides a single interface for adding, removing, exporting,
    and managing bookmarks.
    
    Usage:
        manager = BookmarkManager(browser, rate_limiter)
        
        # Add bookmark
        await manager.add_bookmark("https://x.com/user/status/123")
        
        # Remove bookmark
        await manager.remove_bookmark("https://x.com/user/status/123")
        
        # Export all
        count = await manager.export_all_bookmarks("bookmarks.json")
        
        # Bulk operations
        await manager.bulk_bookmark(["url1", "url2", "url3"])
    """
    
    def __init__(
        self,
        browser: BrowserManager,
        rate_limiter: Optional[RateLimiter] = None,
        dry_run: bool = False,
    ):
        self.browser = browser
        self.rate_limiter = rate_limiter
        self.dry_run = dry_run
        
        # Initialize sub-actions
        self._bookmark_action = BookmarkTweet(browser, rate_limiter, dry_run)
        self._remove_action = RemoveBookmark(browser, rate_limiter, dry_run)
        self._export_action = ExportBookmarks(browser, rate_limiter, dry_run)
    
    async def execute(self, *args, **kwargs):
        """Not used directly - use specific methods instead."""
        raise NotImplementedError("Use specific methods like add_bookmark, remove_bookmark, etc.")
    
    async def add_bookmark(self, tweet_url: str) -> bool:
        """
        Add a tweet to bookmarks.
        
        Args:
            tweet_url: URL of the tweet
            
        Returns:
            True if successful
        """
        result = await self._bookmark_action.execute(tweet_url)
        return result.success_count > 0
    
    async def remove_bookmark(self, tweet_url: str) -> bool:
        """
        Remove a tweet from bookmarks.
        
        Args:
            tweet_url: URL of the tweet
            
        Returns:
            True if successful
        """
        result = await self._remove_action.execute(tweet_url)
        return result.success_count > 0
    
    async def export_all_bookmarks(
        self,
        filepath: str,
        format: str = "json",
        include_content: bool = True,
    ) -> int:
        """
        Export all bookmarks to file.
        
        Args:
            filepath: Path to export file
            format: Export format ('json', 'csv', 'txt')
            include_content: Include full tweet content
            
        Returns:
            Number of bookmarks exported
        """
        result = await self._export_action.execute(
            filepath=filepath,
            format=format,
            include_content=include_content,
        )
        return result.exported_count
    
    async def bulk_bookmark(
        self,
        tweet_urls: list[str],
        on_progress: Optional[Callable] = None,
        delay_between: tuple[int, int] = (1, 3),
    ) -> BookmarkResult:
        """
        Bookmark multiple tweets.
        
        Args:
            tweet_urls: List of tweet URLs
            on_progress: Progress callback (index, url, success)
            delay_between: Delay range between operations
            
        Returns:
            BookmarkResult with summary
        """
        return await self._bookmark_action.bulk_bookmark(
            tweet_urls=tweet_urls,
            on_bookmark=on_progress,
            delay_between=delay_between,
        )
    
    async def bulk_remove(
        self,
        tweet_urls: list[str],
        on_progress: Optional[Callable] = None,
        delay_between: tuple[int, int] = (1, 3),
    ) -> BookmarkResult:
        """
        Remove multiple bookmarks.
        
        Args:
            tweet_urls: List of tweet URLs
            on_progress: Progress callback
            delay_between: Delay range
            
        Returns:
            BookmarkResult with summary
        """
        return await self._remove_action.bulk_remove(
            tweet_urls=tweet_urls,
            on_remove=on_progress,
            delay_between=delay_between,
        )
    
    async def sync_bookmarks(
        self,
        local_filepath: str,
        direction: str = "export",
    ) -> BookmarkResult:
        """
        Sync bookmarks with a local file.
        
        Args:
            local_filepath: Path to local JSON file
            direction: 'export' to save to file, 'import' to add from file
            
        Returns:
            BookmarkResult
        """
        import json
        from pathlib import Path
        
        result = BookmarkResult()
        
        if direction == "export":
            count = await self.export_all_bookmarks(local_filepath, format="json")
            result.exported_count = count
            result.export_path = local_filepath
            result.success_count = count
        
        elif direction == "import":
            path = Path(local_filepath)
            if not path.exists():
                result.errors.append(f"File not found: {local_filepath}")
                return result
            
            with open(path) as f:
                data = json.load(f)
            
            urls = []
            if isinstance(data, dict) and "bookmarks" in data:
                urls = [b.get("url") for b in data["bookmarks"] if b.get("url")]
            elif isinstance(data, list):
                urls = [item.get("url") if isinstance(item, dict) else item for item in data]
            
            if urls:
                result = await self.bulk_bookmark(urls)
        
        else:
            result.errors.append(f"Invalid direction: {direction}")
        
        return result
    
    async def is_bookmarked(self, tweet_url: str) -> bool:
        """
        Check if a tweet is bookmarked.
        
        Note: This requires navigating to the tweet, so it's slow.
        Consider caching results for bulk operations.
        
        Args:
            tweet_url: URL of the tweet
            
        Returns:
            True if bookmarked
        """
        # Navigate to tweet and check bookmark status
        # This is a simplistic check - could be improved
        await self.browser.goto(tweet_url)
        await asyncio.sleep(2)
        
        page = self._get_page()
        if not page:
            return False
        
        try:
            share_btn = await page.query_selector('[data-testid="share"]')
            if share_btn:
                await share_btn.click()
                await asyncio.sleep(0.5)
                
                # Look for "Remove from Bookmarks" option
                remove_opt = await page.query_selector('[role="menuitem"]:has-text("Remove")')
                
                # Close menu
                await page.keyboard.press("Escape")
                
                return remove_opt is not None
        except Exception:
            pass
        
        return False
    
    def _get_page(self):
        """Get current page."""
        return getattr(self.browser, 'page', None)
    
    def get_stats(self) -> dict:
        """Get bookmark operation stats."""
        return {
            "dry_run": self.dry_run,
            "rate_limiter_active": self.rate_limiter is not None,
        }

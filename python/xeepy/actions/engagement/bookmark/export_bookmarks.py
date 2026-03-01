"""
Export Bookmarks Action

Export all bookmarks to a file.
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import BookmarkResult, TweetElement


class ExportBookmarks(BaseAction):
    """
    Export all bookmarks to a file.
    
    Usage:
        exporter = ExportBookmarks(browser, rate_limiter)
        result = await exporter.execute(
            filepath="bookmarks.json",
            format="json",
            include_content=True
        )
    """
    
    SELECTORS = {
        "tweet_article": 'article[data-testid="tweet"]',
        "tweet_text": '[data-testid="tweetText"]',
        "user_name": '[data-testid="User-Name"]',
        "time_element": 'time',
        "bookmarks_page": '[data-testid="primaryColumn"]',
        "empty_state": '[data-testid="emptyState"]',
    }
    
    BOOKMARKS_URL = "https://x.com/i/bookmarks"
    
    def __init__(
        self,
        browser: BrowserManager,
        rate_limiter: Optional[RateLimiter] = None,
        dry_run: bool = False,
    ):
        self.browser = browser
        self.rate_limiter = rate_limiter
        self.dry_run = dry_run
        self._cancelled = False
    
    async def execute(
        self,
        filepath: str,
        format: str = "json",
        include_content: bool = True,
        max_bookmarks: int = 0,
        on_progress: Optional[callable] = None,
    ) -> BookmarkResult:
        """
        Export all bookmarks to file.
        
        Args:
            filepath: Path to export file
            format: Export format ('json', 'csv', 'txt')
            include_content: Include full tweet content
            max_bookmarks: Max to export (0 for all)
            on_progress: Progress callback
            
        Returns:
            BookmarkResult with export info
        """
        import time
        start_time = time.time()
        result = BookmarkResult()
        
        self._cancelled = False
        bookmarks = []
        
        try:
            logger.info("Navigating to bookmarks page...")
            await self.browser.goto(self.BOOKMARKS_URL)
            await asyncio.sleep(2)
            
            page = self._get_page()
            if not page:
                result.failed_count = 1
                result.errors.append("No active page")
                return result
            
            # Wait for page load
            try:
                await page.wait_for_selector(
                    f'{self.SELECTORS["bookmarks_page"]}, {self.SELECTORS["empty_state"]}',
                    timeout=10000
                )
            except Exception:
                result.failed_count = 1
                result.errors.append("Could not load bookmarks page")
                return result
            
            # Check for empty state
            empty = await page.query_selector(self.SELECTORS["empty_state"])
            if empty:
                logger.info("No bookmarks found")
                result.exported_count = 0
                return result
            
            # Scrape bookmarks
            seen_urls = set()
            scroll_attempts = 0
            max_scroll_attempts = 50
            
            while not self._cancelled:
                if max_bookmarks > 0 and len(bookmarks) >= max_bookmarks:
                    break
                
                # Get visible tweets
                tweets = await page.query_selector_all(self.SELECTORS["tweet_article"])
                
                new_count = 0
                for tweet_element in tweets:
                    if self._cancelled:
                        break
                    
                    if max_bookmarks > 0 and len(bookmarks) >= max_bookmarks:
                        break
                    
                    tweet_data = await self._extract_tweet_data(tweet_element, include_content)
                    
                    if tweet_data and tweet_data.get("url") not in seen_urls:
                        seen_urls.add(tweet_data.get("url"))
                        bookmarks.append(tweet_data)
                        new_count += 1
                        
                        if on_progress:
                            try:
                                if asyncio.iscoroutinefunction(on_progress):
                                    await on_progress(len(bookmarks), tweet_data)
                                else:
                                    on_progress(len(bookmarks), tweet_data)
                            except Exception:
                                pass
                
                logger.info(f"Extracted {len(bookmarks)} bookmarks...")
                
                if new_count == 0:
                    scroll_attempts += 1
                    if scroll_attempts >= max_scroll_attempts:
                        logger.info("Reached end of bookmarks")
                        break
                else:
                    scroll_attempts = 0
                
                # Scroll for more
                await page.evaluate("window.scrollBy(0, 800)")
                await asyncio.sleep(1)
            
            # Export to file
            if not self.dry_run:
                await self._export_to_file(bookmarks, filepath, format)
                logger.info(f"Exported {len(bookmarks)} bookmarks to {filepath}")
            else:
                logger.info(f"[DRY-RUN] Would export {len(bookmarks)} bookmarks to {filepath}")
            
            result.success_count = len(bookmarks)
            result.exported_count = len(bookmarks)
            result.export_path = filepath
            result.bookmarked_tweets = [b.get("url", "") for b in bookmarks]
        
        except Exception as e:
            logger.error(f"Error exporting bookmarks: {e}")
            result.failed_count = 1
            result.errors.append(str(e))
        
        result.duration_seconds = time.time() - start_time
        result.cancelled = self._cancelled
        
        return result
    
    async def _extract_tweet_data(
        self,
        element,
        include_content: bool,
    ) -> Optional[dict]:
        """Extract data from a tweet element."""
        try:
            data = {
                "extracted_at": datetime.now().isoformat(),
            }
            
            # Get URL
            link_el = await element.query_selector('a[href*="/status/"]')
            if link_el:
                href = await link_el.get_attribute("href")
                if href:
                    data["url"] = f"https://x.com{href}" if href.startswith("/") else href
                    # Extract tweet ID
                    import re
                    match = re.search(r'/status/(\d+)', href)
                    if match:
                        data["tweet_id"] = match.group(1)
            
            # Get author
            user_el = await element.query_selector(self.SELECTORS["user_name"])
            if user_el:
                user_text = await user_el.text_content()
                if "@" in user_text:
                    parts = user_text.split("@")
                    if len(parts) >= 2:
                        data["author_name"] = parts[0].strip()
                        username_part = parts[1].split()[0] if parts[1] else ""
                        data["author_username"] = username_part.strip("·").strip()
            
            # Get timestamp
            time_el = await element.query_selector(self.SELECTORS["time_element"])
            if time_el:
                datetime_attr = await time_el.get_attribute("datetime")
                if datetime_attr:
                    data["tweet_timestamp"] = datetime_attr
            
            # Get content if requested
            if include_content:
                text_el = await element.query_selector(self.SELECTORS["tweet_text"])
                if text_el:
                    data["text"] = await text_el.text_content()
                
                # Check for media
                media_el = await element.query_selector('[data-testid="tweetPhoto"], video')
                data["has_media"] = media_el is not None
            
            return data if data.get("url") else None
        
        except Exception as e:
            logger.debug(f"Error extracting tweet data: {e}")
            return None
    
    async def _export_to_file(
        self,
        bookmarks: list[dict],
        filepath: str,
        format: str,
    ):
        """Export bookmarks to file."""
        path = Path(filepath)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        if format.lower() == "json":
            with open(path, "w", encoding="utf-8") as f:
                json.dump({
                    "exported_at": datetime.now().isoformat(),
                    "total_bookmarks": len(bookmarks),
                    "bookmarks": bookmarks,
                }, f, indent=2, ensure_ascii=False)
        
        elif format.lower() == "csv":
            import csv
            with open(path, "w", newline="", encoding="utf-8") as f:
                if bookmarks:
                    writer = csv.DictWriter(f, fieldnames=bookmarks[0].keys())
                    writer.writeheader()
                    writer.writerows(bookmarks)
        
        elif format.lower() == "txt":
            with open(path, "w", encoding="utf-8") as f:
                f.write(f"# Bookmarks Export - {datetime.now().isoformat()}\n")
                f.write(f"# Total: {len(bookmarks)}\n\n")
                
                for i, bookmark in enumerate(bookmarks, 1):
                    f.write(f"## {i}. @{bookmark.get('author_username', 'unknown')}\n")
                    f.write(f"URL: {bookmark.get('url', 'N/A')}\n")
                    if bookmark.get("text"):
                        f.write(f"Text: {bookmark.get('text')}\n")
                    f.write("\n---\n\n")
        
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def _get_page(self):
        """Get current page."""
        return getattr(self.browser, 'page', None)
    
    def cancel(self):
        """Cancel export."""
        self._cancelled = True
        logger.info("Bookmark export cancelled")

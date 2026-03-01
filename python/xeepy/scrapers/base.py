"""
Base scraper class with common functionality.

All scrapers inherit from BaseScraper to ensure consistent behavior.
"""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Generic, TypeVar

from loguru import logger
from rich.progress import Progress, TaskID

from xeepy.core.browser import BrowserManager
from xeepy.core.rate_limiter import RateLimiter
from xeepy.core.selectors import Selectors
from xeepy.core.exceptions import ScrapingError, PaginationError
from xeepy.core.utils import deduplicate_by_key, generate_filename

T = TypeVar("T")


@dataclass
class ScrapeResult(Generic[T]):
    """
    Result of a scraping operation.
    
    Attributes:
        items: List of scraped items.
        total_found: Total items found (may be more than collected).
        target: The scraping target (URL, username, etc.).
        started_at: When scraping started.
        completed_at: When scraping finished.
        error: Error message if scraping failed.
        metadata: Additional metadata about the scrape.
    """
    
    items: list[T] = field(default_factory=list)
    total_found: int = 0
    target: str = ""
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: datetime | None = None
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    
    @property
    def count(self) -> int:
        """Number of items collected."""
        return len(self.items)
    
    @property
    def success(self) -> bool:
        """Whether scraping completed without error."""
        return self.error is None
    
    @property
    def duration_seconds(self) -> float:
        """Duration of scraping in seconds."""
        if self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return 0.0
    
    def to_dict(self) -> dict[str, Any]:
        """Convert result to dictionary."""
        return {
            "items": [
                item.to_dict() if hasattr(item, "to_dict") else item
                for item in self.items
            ],
            "count": self.count,
            "total_found": self.total_found,
            "target": self.target,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_seconds": self.duration_seconds,
            "success": self.success,
            "error": self.error,
            "metadata": self.metadata,
        }


class BaseScraper(ABC):
    """
    Base class for all Xeepy scrapers.
    
    Provides common functionality:
    - Browser management integration
    - Rate limiting
    - Progress tracking
    - Infinite scroll handling
    - Error handling and retries
    - Export to multiple formats
    
    Subclasses must implement:
    - scrape(): Main scraping method
    - _extract_item(): Extract a single item from element
    """
    
    def __init__(
        self,
        browser: BrowserManager,
        rate_limiter: RateLimiter | None = None,
    ) -> None:
        """
        Initialize the scraper.
        
        Args:
            browser: BrowserManager instance for page interactions.
            rate_limiter: Optional RateLimiter for action throttling.
        """
        self.browser = browser
        self.rate_limiter = rate_limiter or RateLimiter()
        self.results: list[Any] = []
        self._seen_ids: set[str] = set()
        self._stop_requested = False
        
    @abstractmethod
    async def scrape(
        self,
        target: str,
        limit: int = 100,
        on_progress: Callable[[int, int], None] | None = None,
        **kwargs,
    ) -> ScrapeResult:
        """
        Main scraping method - must be implemented by subclasses.
        
        Args:
            target: Scraping target (URL, username, hashtag, etc.).
            limit: Maximum number of items to collect.
            on_progress: Callback for progress updates (current, total).
            **kwargs: Additional scraper-specific arguments.
            
        Returns:
            ScrapeResult containing collected items and metadata.
        """
        raise NotImplementedError
    
    @abstractmethod
    async def _extract_item(self, element: Any) -> dict[str, Any] | None:
        """
        Extract data from a single element.
        
        Args:
            element: Playwright element locator.
            
        Returns:
            Extracted data dict or None if extraction fails.
        """
        raise NotImplementedError
    
    async def _scroll_and_collect(
        self,
        selector: str,
        extractor: Callable[[Any], dict[str, Any] | None],
        limit: int,
        id_key: str = "id",
        on_progress: Callable[[int, int], None] | None = None,
        max_scroll_attempts: int = 50,
        scroll_pause: float = 1.5,
        no_new_items_threshold: int = 5,
    ) -> list[dict[str, Any]]:
        """
        Common scroll-and-collect pattern for infinite scroll pages.
        
        Args:
            selector: CSS selector for items to collect.
            extractor: Function to extract data from each element.
            limit: Maximum items to collect.
            id_key: Key to use for deduplication.
            on_progress: Progress callback.
            max_scroll_attempts: Maximum scroll attempts before giving up.
            scroll_pause: Seconds to wait between scrolls.
            no_new_items_threshold: Scrolls without new items before stopping.
            
        Returns:
            List of extracted items.
        """
        items: list[dict[str, Any]] = []
        no_new_items_count = 0
        scroll_count = 0
        
        while len(items) < limit and scroll_count < max_scroll_attempts:
            if self._stop_requested:
                logger.info("Stop requested, ending scroll collection")
                break
            
            # Wait for rate limiter
            if self.rate_limiter:
                await self.rate_limiter.wait("scrape")
            
            # Get current elements
            try:
                elements = await self.browser.page.locator(selector).all()
            except Exception as e:
                logger.warning(f"Error getting elements: {e}")
                break
            
            # Extract data from new elements
            new_items_this_scroll = 0
            
            for element in elements:
                if len(items) >= limit:
                    break
                
                try:
                    item = await extractor(element)
                    
                    if item and item.get(id_key):
                        item_id = str(item[id_key])
                        
                        if item_id not in self._seen_ids:
                            self._seen_ids.add(item_id)
                            items.append(item)
                            new_items_this_scroll += 1
                            
                            if self.rate_limiter:
                                self.rate_limiter.record_action("scrape")
                            
                            if on_progress:
                                on_progress(len(items), limit)
                                
                except Exception as e:
                    logger.debug(f"Error extracting item: {e}")
                    continue
            
            # Check if we're getting new items
            if new_items_this_scroll == 0:
                no_new_items_count += 1
                if no_new_items_count >= no_new_items_threshold:
                    logger.info(
                        f"No new items for {no_new_items_threshold} scrolls, stopping"
                    )
                    break
            else:
                no_new_items_count = 0
            
            # Scroll down
            try:
                await self.browser.page.evaluate("window.scrollBy(0, window.innerHeight)")
                await asyncio.sleep(scroll_pause)
            except Exception as e:
                logger.warning(f"Scroll error: {e}")
                break
            
            scroll_count += 1
            logger.debug(f"Scroll {scroll_count}: {len(items)} items collected")
        
        return items
    
    async def _wait_for_content(
        self,
        selector: str,
        timeout: int = 10000,
    ) -> bool:
        """
        Wait for content to load on the page.
        
        Args:
            selector: CSS selector to wait for.
            timeout: Maximum wait time in milliseconds.
            
        Returns:
            True if content loaded, False otherwise.
        """
        try:
            await self.browser.page.wait_for_selector(
                selector,
                timeout=timeout,
                state="visible",
            )
            return True
        except Exception as e:
            logger.warning(f"Timeout waiting for {selector}: {e}")
            return False
    
    async def _check_for_error_states(self) -> str | None:
        """
        Check for common error states on the page.
        
        Returns:
            Error message if error state detected, None otherwise.
        """
        error_selectors = {
            Selectors.ERROR_STATE: "Page error",
            '[data-testid="error-detail"]': "Content unavailable",
            'text="This account doesn\'t exist"': "Account not found",
            'text="Account suspended"': "Account suspended",
            'text="These Tweets are protected"': "Protected account",
            'text="Something went wrong"': "Something went wrong",
        }
        
        for selector, message in error_selectors.items():
            try:
                element = self.browser.page.locator(selector)
                if await element.count() > 0:
                    return message
            except Exception:
                continue
        
        return None
    
    async def _extract_text(
        self,
        element: Any,
        selector: str,
        default: str = "",
    ) -> str:
        """
        Safely extract text from an element.
        
        Args:
            element: Parent element.
            selector: CSS selector for text element.
            default: Default value if extraction fails.
            
        Returns:
            Extracted text or default.
        """
        try:
            text_element = element.locator(selector)
            if await text_element.count() > 0:
                text = await text_element.first.inner_text()
                return text.strip()
        except Exception:
            pass
        return default
    
    async def _extract_attribute(
        self,
        element: Any,
        selector: str,
        attribute: str,
        default: str = "",
    ) -> str:
        """
        Safely extract an attribute from an element.
        
        Args:
            element: Parent element.
            selector: CSS selector for element.
            attribute: Attribute name to extract.
            default: Default value if extraction fails.
            
        Returns:
            Extracted attribute value or default.
        """
        try:
            attr_element = element.locator(selector)
            if await attr_element.count() > 0:
                value = await attr_element.first.get_attribute(attribute)
                return value or default
        except Exception:
            pass
        return default
    
    async def _extract_count(
        self,
        element: Any,
        selector: str,
        default: int = 0,
    ) -> int:
        """
        Extract a count/number from an element.
        
        Args:
            element: Parent element.
            selector: CSS selector for count element.
            default: Default value if extraction fails.
            
        Returns:
            Extracted count or default.
        """
        from xeepy.core.utils import parse_count
        
        text = await self._extract_text(element, selector)
        return parse_count(text) if text else default
    
    def stop(self) -> None:
        """Request the scraper to stop at the next opportunity."""
        self._stop_requested = True
        logger.info("Stop requested for scraper")
    
    def reset(self) -> None:
        """Reset scraper state for a new scrape operation."""
        self.results = []
        self._seen_ids = set()
        self._stop_requested = False
    
    def export(
        self,
        filepath: str | Path | None = None,
        format: str = "json",
        prefix: str = "scrape",
    ) -> Path:
        """
        Export scraped results to file.
        
        Args:
            filepath: Output file path (auto-generated if None).
            format: Export format ('json', 'csv', 'sqlite').
            prefix: Filename prefix if auto-generating.
            
        Returns:
            Path to the exported file.
        """
        from xeepy.exporters import CSVExporter, JSONExporter, SQLiteExporter
        
        if filepath is None:
            filepath = generate_filename(prefix, format)
        
        filepath = Path(filepath)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert results to exportable format
        data = [
            item.to_dict() if hasattr(item, "to_dict") else item
            for item in self.results
        ]
        
        if format == "json":
            exporter = JSONExporter()
        elif format == "csv":
            exporter = CSVExporter()
        elif format == "sqlite":
            exporter = SQLiteExporter()
        else:
            raise ValueError(f"Unsupported export format: {format}")
        
        exporter.export(data, filepath)
        logger.info(f"Exported {len(data)} items to {filepath}")
        
        return filepath

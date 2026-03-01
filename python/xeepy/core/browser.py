"""
Xeepy Browser Manager

Manages Playwright browser instances for X/Twitter automation.
"""

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from playwright.async_api import Browser, BrowserContext, Page, async_playwright
from loguru import logger
from fake_useragent import UserAgent

from xeepy.core.config import BrowserConfig


class BrowserManager:
    """
    Manages browser instances and contexts for automation.
    
    Supports session persistence, proxy configuration, and user agent rotation.
    """
    
    def __init__(self, config: Optional[BrowserConfig] = None):
        self.config = config or BrowserConfig()
        self._playwright = None
        self._browser: Optional[Browser] = None
        self._context: Optional[BrowserContext] = None
        self._page: Optional[Page] = None
        self._ua = UserAgent()
    
    async def start(self) -> None:
        """Start the browser."""
        if self._browser is not None:
            return
        
        logger.info("Starting browser...")
        self._playwright = await async_playwright().start()
        
        launch_options = {
            "headless": self.config.headless,
            "slow_mo": self.config.slow_mo,
        }
        
        if self.config.proxy:
            launch_options["proxy"] = {"server": self.config.proxy}
        
        self._browser = await self._playwright.chromium.launch(**launch_options)
        logger.info("Browser started successfully")
    
    async def stop(self) -> None:
        """Stop the browser and cleanup."""
        if self._page:
            await self._page.close()
            self._page = None
        
        if self._context:
            await self._context.close()
            self._context = None
        
        if self._browser:
            await self._browser.close()
            self._browser = None
        
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
        
        logger.info("Browser stopped")
    
    async def new_context(
        self,
        storage_state: Optional[str | Path] = None,
        user_agent: Optional[str] = None,
    ) -> BrowserContext:
        """
        Create a new browser context.
        
        Args:
            storage_state: Path to session file for persistence
            user_agent: Custom user agent (random if not provided)
        """
        if self._browser is None:
            await self.start()
        
        context_options = {
            "viewport": {
                "width": self.config.viewport_width,
                "height": self.config.viewport_height,
            },
            "user_agent": user_agent or self.config.user_agent or self._ua.random,
        }
        
        if storage_state and Path(storage_state).exists():
            context_options["storage_state"] = str(storage_state)
            logger.info(f"Loading session from {storage_state}")
        
        self._context = await self._browser.new_context(**context_options)
        return self._context
    
    async def new_page(self) -> Page:
        """Create a new page in the current context."""
        if self._context is None:
            await self.new_context()
        
        self._page = await self._context.new_page()
        self._page.set_default_timeout(self.config.timeout)
        return self._page
    
    async def save_session(self, path: str | Path) -> None:
        """Save current session state for later reuse."""
        if self._context is None:
            raise RuntimeError("No active context to save")
        
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        await self._context.storage_state(path=str(path))
        logger.info(f"Session saved to {path}")
    
    @asynccontextmanager
    async def page_context(
        self,
        storage_state: Optional[str | Path] = None,
    ):
        """
        Context manager for page lifecycle.
        
        Usage:
            async with browser.page_context() as page:
                await page.goto("https://x.com")
        """
        await self.new_context(storage_state=storage_state)
        page = await self.new_page()
        try:
            yield page
        finally:
            if page and not page.is_closed():
                await page.close()
    
    @property
    def page(self) -> Optional[Page]:
        """Get the current page."""
        return self._page
    
    @property
    def context(self) -> Optional[BrowserContext]:
        """Get the current context."""
        return self._context
    
    @property
    def browser(self) -> Optional[Browser]:
        """Get the browser instance."""
        return self._browser
    
    async def goto(self, url: str, wait_until: str = "domcontentloaded") -> None:
        """Navigate to a URL."""
        if self._page is None:
            await self.new_page()
        
        await self._page.goto(url, wait_until=wait_until)
    
    async def wait_for_selector(
        self,
        selector: str,
        timeout: Optional[int] = None,
        state: str = "visible",
    ):
        """Wait for an element to appear."""
        if self._page is None:
            raise RuntimeError("No active page")
        
        return await self._page.wait_for_selector(
            selector,
            timeout=timeout or self.config.timeout,
            state=state,
        )
    
    async def click(self, selector: str, **kwargs) -> None:
        """Click an element."""
        if self._page is None:
            raise RuntimeError("No active page")
        await self._page.click(selector, **kwargs)
    
    async def fill(self, selector: str, value: str, **kwargs) -> None:
        """Fill an input field."""
        if self._page is None:
            raise RuntimeError("No active page")
        await self._page.fill(selector, value, **kwargs)
    
    async def screenshot(self, path: str | Path, **kwargs) -> None:
        """Take a screenshot."""
        if self._page is None:
            raise RuntimeError("No active page")
        await self._page.screenshot(path=str(path), **kwargs)

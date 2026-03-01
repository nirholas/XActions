"""
Lists scraper for Twitter/X.

Scrapes list members and list information.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable

from loguru import logger

from xeepy.core.selectors import Selectors
from xeepy.models.user import User
from xeepy.scrapers.base import BaseScraper, ScrapeResult


class ListsScraper(BaseScraper):
    """
    Scraper for X/Twitter lists.
    
    Scrapes members of a Twitter list.
    
    Example:
        >>> async with BrowserManager() as browser:
        ...     scraper = ListsScraper(browser)
        ...     result = await scraper.scrape(
        ...         "https://x.com/i/lists/1234567890",
        ...         limit=100
        ...     )
        ...     for user in result.items:
        ...         print(f"@{user.username}")
    """
    
    async def scrape(
        self,
        target: str,
        limit: int = 100,
        on_progress: Callable[[int, int], None] | None = None,
        **kwargs,
    ) -> ScrapeResult[User]:
        """
        Scrape members of a Twitter list.
        
        Args:
            target: List URL (https://x.com/i/lists/ID or username/lists/name).
            limit: Maximum members to collect.
            on_progress: Progress callback.
            **kwargs: Additional options.
            
        Returns:
            ScrapeResult containing User objects.
        """
        result = ScrapeResult[User](target=target)
        self.reset()
        
        # Navigate to list members
        if "/members" not in target:
            members_url = target.rstrip("/") + "/members"
        else:
            members_url = target
        
        try:
            logger.info(f"Scraping list members from {target} (limit: {limit})")
            
            await self.browser.navigate(members_url)
            
            loaded = await self._wait_for_content(Selectors.USER_CELL, timeout=15000)
            if not loaded:
                error = await self._check_for_error_states()
                if error:
                    result.error = error
                    return result
                
                empty = await self._check_empty_list()
                if empty:
                    result.items = []
                    result.total_found = 0
                    result.completed_at = datetime.now()
                    return result
                
                result.error = "List members failed to load"
                return result
            
            items = await self._scroll_and_collect(
                selector=Selectors.USER_CELL,
                extractor=self._extract_item,
                limit=limit,
                id_key="username",
                on_progress=on_progress,
            )
            
            users = [User.from_dict(item) for item in items]
            
            result.items = users
            result.total_found = len(users)
            self.results = users
            
            logger.info(f"Collected {len(users)} list members")
            
        except Exception as e:
            logger.error(f"List scraping error: {e}")
            result.error = str(e)
        finally:
            result.completed_at = datetime.now()
        
        return result
    
    async def _extract_item(self, element: Any) -> dict[str, Any] | None:
        """Extract user data from list member cell."""
        try:
            # Username
            username = ""
            try:
                user_links = element.locator('a[href^="/"]')
                for i in range(await user_links.count()):
                    link = user_links.nth(i)
                    href = await link.get_attribute("href")
                    if href and not any(x in href for x in ["/lists", "/followers", "/following"]):
                        username = href.strip("/")
                        break
            except Exception:
                pass
            
            if not username:
                return None
            
            # Display name
            display_name = ""
            try:
                name_element = element.locator('[dir="ltr"] span').first
                if await name_element.count() > 0:
                    display_name = await name_element.inner_text()
            except Exception:
                pass
            
            # Bio
            bio = ""
            try:
                bio_element = element.locator('[data-testid="UserDescription"]')
                if await bio_element.count() > 0:
                    bio = await bio_element.inner_text()
            except Exception:
                pass
            
            # Verification
            is_blue_verified = False
            try:
                verified = element.locator('svg[data-testid="icon-verified"]')
                if await verified.count() > 0:
                    is_blue_verified = True
            except Exception:
                pass
            
            return {
                "id": "",
                "username": username,
                "display_name": display_name,
                "bio": bio,
                "is_verified": False,
                "is_blue_verified": is_blue_verified,
            }
            
        except Exception as e:
            logger.debug(f"Error extracting list member: {e}")
            return None
    
    async def _check_empty_list(self) -> bool:
        """Check if list is empty."""
        try:
            indicators = [
                'text="This List is empty"',
                'text="No members"',
                Selectors.EMPTY_STATE,
            ]
            for indicator in indicators:
                element = self.browser.page.locator(indicator)
                if await element.count() > 0:
                    return True
        except Exception:
            pass
        return False
    
    async def scrape_user_lists(
        self,
        username: str,
        limit: int = 50,
    ) -> ScrapeResult:
        """
        Scrape lists that a user has created or is a member of.
        
        Args:
            username: Username to get lists for.
            limit: Maximum lists to collect.
            
        Returns:
            ScrapeResult with list metadata.
        """
        result = ScrapeResult(target=f"@{username}/lists")
        
        url = f"https://x.com/{username}/lists"
        
        try:
            await self.browser.navigate(url)
            
            loaded = await self._wait_for_content(Selectors.LIST_CELL, timeout=15000)
            if not loaded:
                result.error = "Lists failed to load"
                return result
            
            # Collect list info
            lists = []
            list_cells = self.browser.page.locator(Selectors.LIST_CELL)
            
            for i in range(min(await list_cells.count(), limit)):
                cell = list_cells.nth(i)
                
                try:
                    name = ""
                    name_el = cell.locator(Selectors.LIST_NAME)
                    if await name_el.count() > 0:
                        name = await name_el.inner_text()
                    
                    description = ""
                    desc_el = cell.locator(Selectors.LIST_DESCRIPTION)
                    if await desc_el.count() > 0:
                        description = await desc_el.inner_text()
                    
                    # Get list URL
                    link = cell.locator('a[href*="/lists/"]').first
                    list_url = ""
                    if await link.count() > 0:
                        list_url = await link.get_attribute("href") or ""
                    
                    lists.append({
                        "name": name,
                        "description": description,
                        "url": f"https://x.com{list_url}" if list_url else "",
                    })
                except Exception:
                    continue
            
            result.items = lists
            result.total_found = len(lists)
            
        except Exception as e:
            result.error = str(e)
        finally:
            result.completed_at = datetime.now()
        
        return result

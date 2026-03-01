"""
Followers list scraper.

Scrapes the list of followers for an X/Twitter account.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Callable

from loguru import logger

from xeepy.core.selectors import Selectors
from xeepy.core.utils import extract_username
from xeepy.models.user import User
from xeepy.scrapers.base import BaseScraper, ScrapeResult


class FollowersScraper(BaseScraper):
    """
    Scraper for X/Twitter followers lists.
    
    Extracts follower data including:
    - Username and display name
    - Bio
    - Verification status
    - Follow status (if you follow them back)
    
    Note: Requires authentication to see full follower lists.
    
    Example:
        >>> async with BrowserManager() as browser:
        ...     scraper = FollowersScraper(browser)
        ...     result = await scraper.scrape("elonmusk", limit=100)
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
        Scrape followers of a user.
        
        Args:
            target: Username (with or without @) or profile URL.
            limit: Maximum number of followers to collect.
            on_progress: Progress callback (current_count, limit).
            **kwargs: Additional options.
            
        Returns:
            ScrapeResult containing User objects for each follower.
        """
        result = ScrapeResult[User](target=target)
        self.reset()
        
        # Normalize target to username
        if target.startswith("http"):
            username = extract_username(target)
            if not username:
                result.error = f"Could not extract username from URL: {target}"
                return result
        else:
            username = target.lstrip("@")
        
        followers_url = f"https://x.com/{username}/followers"
        
        try:
            logger.info(f"Scraping followers of @{username} (limit: {limit})")
            
            # Navigate to followers page
            await self.browser.navigate(followers_url)
            
            # Wait for user cells to load
            loaded = await self._wait_for_content(
                Selectors.USER_CELL,
                timeout=15000,
            )
            
            if not loaded:
                # Check for error states
                error = await self._check_for_error_states()
                if error:
                    result.error = error
                    return result
                    
                # Check if no followers
                empty = await self._check_empty_state()
                if empty:
                    result.items = []
                    result.total_found = 0
                    result.completed_at = datetime.now()
                    return result
                    
                result.error = "Followers list failed to load"
                return result
            
            # Scroll and collect followers
            items = await self._scroll_and_collect(
                selector=Selectors.USER_CELL,
                extractor=self._extract_item,
                limit=limit,
                id_key="username",
                on_progress=on_progress,
            )
            
            # Convert to User objects
            users = [User.from_dict(item) for item in items]
            
            result.items = users
            result.total_found = len(users)
            self.results = users
            
            logger.info(f"Collected {len(users)} followers")
            
        except Exception as e:
            logger.error(f"Followers scraping error: {e}")
            result.error = str(e)
        finally:
            result.completed_at = datetime.now()
        
        return result
    
    async def _extract_item(self, element: Any) -> dict[str, Any] | None:
        """
        Extract user data from a UserCell element.
        
        Args:
            element: Playwright locator for the UserCell.
            
        Returns:
            Dict with user data or None if extraction fails.
        """
        try:
            # Username/handle
            username = ""
            try:
                # Look for the username link
                user_links = element.locator('a[href^="/"]')
                for i in range(await user_links.count()):
                    link = user_links.nth(i)
                    href = await link.get_attribute("href")
                    if href and not any(x in href for x in ["/followers", "/following", "/status/"]):
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
            
            # Bio/description
            bio = ""
            try:
                bio_element = element.locator('[data-testid="UserDescription"]')
                if await bio_element.count() > 0:
                    bio = await bio_element.inner_text()
            except Exception:
                # Alternative selector for bio
                try:
                    # Bio is often in a div after the name section
                    divs = element.locator('div[dir="auto"]')
                    for i in range(await divs.count()):
                        div = divs.nth(i)
                        text = await div.inner_text()
                        # Bio is usually longer and not the username
                        if len(text) > 20 and not text.startswith("@"):
                            bio = text
                            break
                except Exception:
                    pass
            
            # Verification status
            is_verified = False
            is_blue_verified = False
            try:
                verified_badge = element.locator('svg[data-testid="icon-verified"]')
                if await verified_badge.count() > 0:
                    is_blue_verified = True
            except Exception:
                pass
            
            # Profile image
            profile_image_url = ""
            try:
                avatar = element.locator('img[src*="profile_images"]')
                if await avatar.count() > 0:
                    profile_image_url = await avatar.get_attribute("src") or ""
            except Exception:
                pass
            
            return {
                "id": "",  # Not available from list view
                "username": username,
                "display_name": display_name,
                "bio": bio,
                "is_verified": is_verified,
                "is_blue_verified": is_blue_verified,
                "profile_image_url": profile_image_url,
                "followers_count": 0,
                "following_count": 0,
            }
            
        except Exception as e:
            logger.debug(f"Error extracting user from cell: {e}")
            return None
    
    async def _check_empty_state(self) -> bool:
        """Check if the followers list is empty."""
        try:
            empty_indicators = [
                Selectors.EMPTY_STATE,
                'text="doesn\'t have any followers"',
                'text="No followers yet"',
            ]
            
            for indicator in empty_indicators:
                element = self.browser.page.locator(indicator)
                if await element.count() > 0:
                    return True
        except Exception:
            pass
        return False
    
    async def get_follower_usernames(
        self,
        target: str,
        limit: int = 100,
        on_progress: Callable[[int, int], None] | None = None,
    ) -> list[str]:
        """
        Get just the usernames of followers (faster, less data).
        
        Args:
            target: Username to get followers for.
            limit: Maximum followers to collect.
            on_progress: Progress callback.
            
        Returns:
            List of follower usernames.
        """
        result = await self.scrape(target, limit, on_progress)
        return [user.username for user in result.items]

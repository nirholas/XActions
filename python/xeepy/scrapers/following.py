"""
Following list scraper.

Scrapes the list of accounts that a user is following.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable

from loguru import logger

from xeepy.core.selectors import Selectors
from xeepy.core.utils import extract_username
from xeepy.models.user import User
from xeepy.scrapers.base import BaseScraper, ScrapeResult


class FollowingScraper(BaseScraper):
    """
    Scraper for X/Twitter following lists.
    
    Extracts data about accounts a user follows, including:
    - Username and display name
    - Bio
    - Verification status
    
    Example:
        >>> async with BrowserManager() as browser:
        ...     scraper = FollowingScraper(browser)
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
        Scrape accounts that a user is following.
        
        Args:
            target: Username (with or without @) or profile URL.
            limit: Maximum number of accounts to collect.
            on_progress: Progress callback (current_count, limit).
            **kwargs: Additional options.
            
        Returns:
            ScrapeResult containing User objects.
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
        
        following_url = f"https://x.com/{username}/following"
        
        try:
            logger.info(f"Scraping following list of @{username} (limit: {limit})")
            
            # Navigate to following page
            await self.browser.navigate(following_url)
            
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
                    
                # Check if not following anyone
                empty = await self._check_empty_state()
                if empty:
                    result.items = []
                    result.total_found = 0
                    result.completed_at = datetime.now()
                    return result
                    
                result.error = "Following list failed to load"
                return result
            
            # Scroll and collect following
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
            
            logger.info(f"Collected {len(users)} accounts from following list")
            
        except Exception as e:
            logger.error(f"Following scraping error: {e}")
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
                try:
                    divs = element.locator('div[dir="auto"]')
                    for i in range(await divs.count()):
                        div = divs.nth(i)
                        text = await div.inner_text()
                        if len(text) > 20 and not text.startswith("@"):
                            bio = text
                            break
                except Exception:
                    pass
            
            # Verification status
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
                "id": "",
                "username": username,
                "display_name": display_name,
                "bio": bio,
                "is_verified": False,
                "is_blue_verified": is_blue_verified,
                "profile_image_url": profile_image_url,
                "followers_count": 0,
                "following_count": 0,
            }
            
        except Exception as e:
            logger.debug(f"Error extracting user from cell: {e}")
            return None
    
    async def _check_empty_state(self) -> bool:
        """Check if the following list is empty."""
        try:
            empty_indicators = [
                Selectors.EMPTY_STATE,
                'text="isn\'t following anyone"',
                'text="Not following anyone"',
            ]
            
            for indicator in empty_indicators:
                element = self.browser.page.locator(indicator)
                if await element.count() > 0:
                    return True
        except Exception:
            pass
        return False
    
    async def get_following_usernames(
        self,
        target: str,
        limit: int = 100,
        on_progress: Callable[[int, int], None] | None = None,
    ) -> list[str]:
        """
        Get just the usernames of accounts being followed.
        
        Args:
            target: Username to get following list for.
            limit: Maximum accounts to collect.
            on_progress: Progress callback.
            
        Returns:
            List of usernames.
        """
        result = await self.scrape(target, limit, on_progress)
        return [user.username for user in result.items]
    
    async def get_non_followers(
        self,
        username: str,
        on_progress: Callable[[int, int], None] | None = None,
    ) -> list[str]:
        """
        Get accounts that the user follows but who don't follow back.
        
        This requires scraping both followers and following lists.
        
        Args:
            username: Username to check.
            on_progress: Progress callback.
            
        Returns:
            List of usernames who don't follow back.
        """
        from xeepy.scrapers.followers import FollowersScraper
        
        # Get following list
        following_result = await self.scrape(username, limit=5000)
        following_set = {u.username.lower() for u in following_result.items}
        
        if on_progress:
            on_progress(1, 2)
        
        # Get followers list
        followers_scraper = FollowersScraper(self.browser, self.rate_limiter)
        followers_result = await followers_scraper.scrape(username, limit=5000)
        followers_set = {u.username.lower() for u in followers_result.items}
        
        if on_progress:
            on_progress(2, 2)
        
        # Find non-followers
        non_followers = following_set - followers_set
        
        return list(non_followers)

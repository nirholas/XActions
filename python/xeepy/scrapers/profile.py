"""
User profile scraper.

Scrapes detailed profile information for X/Twitter users.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable

from loguru import logger

from xeepy.core.selectors import Selectors
from xeepy.core.utils import parse_count, extract_username
from xeepy.models.user import User
from xeepy.scrapers.base import BaseScraper, ScrapeResult


class ProfileScraper(BaseScraper):
    """
    Scraper for X/Twitter user profiles.
    
    Extracts comprehensive profile data including:
    - User info (name, handle, bio, location, website)
    - Statistics (followers, following, tweets count)
    - Verification status
    - Profile images
    
    Example:
        >>> async with BrowserManager() as browser:
        ...     scraper = ProfileScraper(browser)
        ...     result = await scraper.scrape("elonmusk")
        ...     print(result.items[0].followers_count)
    """
    
    async def scrape(
        self,
        target: str,
        limit: int = 1,
        on_progress: Callable[[int, int], None] | None = None,
        **kwargs,
    ) -> ScrapeResult[User]:
        """
        Scrape a user's profile information.
        
        Args:
            target: Username (with or without @) or profile URL.
            limit: Ignored for profile scraping (always returns 1).
            on_progress: Progress callback.
            **kwargs: Additional options.
            
        Returns:
            ScrapeResult containing the User profile.
        """
        result = ScrapeResult[User](target=target)
        
        # Normalize target to username
        if target.startswith("http"):
            username = extract_username(target)
            if not username:
                result.error = f"Could not extract username from URL: {target}"
                return result
        else:
            username = target.lstrip("@")
        
        profile_url = f"https://x.com/{username}"
        
        try:
            logger.info(f"Scraping profile: @{username}")
            
            # Navigate to profile
            await self.browser.navigate(profile_url)
            
            # Wait for profile to load
            loaded = await self._wait_for_content(
                Selectors.PRIMARY_COLUMN,
                timeout=15000,
            )
            
            if not loaded:
                # Check for error states
                error = await self._check_for_error_states()
                if error:
                    result.error = error
                    return result
                result.error = "Profile failed to load"
                return result
            
            # Check for error states
            error = await self._check_for_error_states()
            if error:
                result.error = error
                return result
            
            # Extract profile data
            user = await self._extract_profile(username)
            
            if user:
                result.items = [user]
                result.total_found = 1
                self.results = [user]
                
                if on_progress:
                    on_progress(1, 1)
            else:
                result.error = "Failed to extract profile data"
                
        except Exception as e:
            logger.error(f"Profile scraping error: {e}")
            result.error = str(e)
        finally:
            result.completed_at = datetime.now()
        
        return result
    
    async def _extract_item(self, element: Any) -> dict[str, Any] | None:
        """Not used for profile scraping."""
        return None
    
    async def _extract_profile(self, username: str) -> User | None:
        """
        Extract profile data from the current page.
        
        Args:
            username: The username being scraped.
            
        Returns:
            User object or None if extraction fails.
        """
        try:
            page = self.browser.page
            
            # Display name
            display_name = ""
            try:
                name_element = page.locator('[data-testid="UserName"] span').first
                if await name_element.count() > 0:
                    display_name = await name_element.inner_text()
            except Exception:
                pass
            
            # Bio
            bio = ""
            try:
                bio_element = page.locator('[data-testid="UserDescription"]')
                if await bio_element.count() > 0:
                    bio = await bio_element.inner_text()
            except Exception:
                pass
            
            # Location
            location = ""
            try:
                location_element = page.locator('[data-testid="UserLocation"] span')
                if await location_element.count() > 0:
                    location = await location_element.inner_text()
            except Exception:
                pass
            
            # Website
            website = ""
            try:
                website_element = page.locator('[data-testid="UserUrl"] a')
                if await website_element.count() > 0:
                    website = await website_element.get_attribute("href") or ""
            except Exception:
                pass
            
            # Joined date
            joined_date = None
            try:
                joined_element = page.locator('[data-testid="UserJoinDate"] span')
                if await joined_element.count() > 0:
                    joined_text = await joined_element.inner_text()
                    # Parse "Joined Month Year" format
                    if "Joined " in joined_text:
                        from xeepy.core.utils import parse_timestamp
                        date_str = joined_text.replace("Joined ", "")
                        joined_date = parse_timestamp(date_str)
            except Exception:
                pass
            
            # Followers count
            followers_count = 0
            try:
                followers_link = page.locator(f'a[href="/{username}/verified_followers"]')
                if await followers_link.count() == 0:
                    followers_link = page.locator(f'a[href="/{username}/followers"]')
                
                if await followers_link.count() > 0:
                    count_text = await followers_link.inner_text()
                    followers_count = parse_count(count_text.split()[0])
            except Exception:
                pass
            
            # Following count
            following_count = 0
            try:
                following_link = page.locator(f'a[href="/{username}/following"]')
                if await following_link.count() > 0:
                    count_text = await following_link.inner_text()
                    following_count = parse_count(count_text.split()[0])
            except Exception:
                pass
            
            # Verification status
            is_verified = False
            is_blue_verified = False
            try:
                verified_badge = page.locator('[data-testid="UserName"] svg[data-testid="icon-verified"]')
                if await verified_badge.count() > 0:
                    is_blue_verified = True
                    # Check for legacy verified (different badge color/type)
                    # Legacy verified has gold checkmark
            except Exception:
                pass
            
            # Profile image URL
            profile_image_url = ""
            try:
                avatar = page.locator('[data-testid="UserAvatar-Container"] img')
                if await avatar.count() > 0:
                    profile_image_url = await avatar.get_attribute("src") or ""
            except Exception:
                pass
            
            # Banner URL
            banner_url = ""
            try:
                banner = page.locator('a[href$="/photo"] img, a[href$="/header_photo"] img')
                if await banner.count() > 0:
                    banner_url = await banner.get_attribute("src") or ""
            except Exception:
                pass
            
            # Protected account check
            is_protected = False
            try:
                protected_icon = page.locator('[data-testid="icon-lock"]')
                if await protected_icon.count() > 0:
                    is_protected = True
            except Exception:
                pass
            
            return User(
                id="",  # Can't easily get ID from profile page
                username=username,
                display_name=display_name,
                bio=bio,
                location=location,
                website=website,
                joined_date=joined_date,
                followers_count=followers_count,
                following_count=following_count,
                tweets_count=0,  # Would need additional parsing
                is_verified=is_verified,
                is_blue_verified=is_blue_verified,
                is_protected=is_protected,
                profile_image_url=profile_image_url,
                banner_url=banner_url,
            )
            
        except Exception as e:
            logger.error(f"Profile extraction error: {e}")
            return None
    
    async def scrape_multiple(
        self,
        usernames: list[str],
        on_progress: Callable[[int, int], None] | None = None,
    ) -> ScrapeResult[User]:
        """
        Scrape multiple user profiles.
        
        Args:
            usernames: List of usernames to scrape.
            on_progress: Progress callback.
            
        Returns:
            ScrapeResult containing all User profiles.
        """
        result = ScrapeResult[User](target=f"Multiple: {len(usernames)} users")
        users: list[User] = []
        
        for i, username in enumerate(usernames):
            if self._stop_requested:
                break
            
            single_result = await self.scrape(username)
            
            if single_result.success and single_result.items:
                users.extend(single_result.items)
            
            if on_progress:
                on_progress(i + 1, len(usernames))
            
            # Rate limiting between profiles
            if self.rate_limiter and i < len(usernames) - 1:
                await self.rate_limiter.wait("scrape")
        
        result.items = users
        result.total_found = len(users)
        result.completed_at = datetime.now()
        self.results = users
        
        return result

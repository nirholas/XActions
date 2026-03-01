"""
Account settings management.

Supports:
- Update account settings
- Get/change notifications settings
- Change password
- Privacy settings
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from loguru import logger

from xeepy.core.browser import BrowserManager
from xeepy.core.rate_limiter import RateLimiter
from xeepy.actions.base import BaseAction, ActionResult


@dataclass
class AccountSettings:
    """
    Account settings configuration.
    
    Attributes:
        allow_dm_from: Who can DM ('everyone', 'following', 'verified')
        allow_dm_groups: Allow group DM requests
        discoverable_by_email: Allow discovery by email
        discoverable_by_phone: Allow discovery by phone
        show_location: Show location in tweets
        sensitive_media: Show sensitive media
        personalization: Allow personalization
        data_sharing: Allow data sharing for ads
        protected: Protected tweets (private account)
    """
    
    allow_dm_from: str = "following"
    allow_dm_groups: bool = True
    discoverable_by_email: bool = False
    discoverable_by_phone: bool = False
    show_location: bool = False
    sensitive_media: bool = False
    personalization: bool = False
    data_sharing: bool = False
    protected: bool = False
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "allow_dm_from": self.allow_dm_from,
            "allow_dm_groups": self.allow_dm_groups,
            "discoverable_by_email": self.discoverable_by_email,
            "discoverable_by_phone": self.discoverable_by_phone,
            "show_location": self.show_location,
            "sensitive_media": self.sensitive_media,
            "personalization": self.personalization,
            "data_sharing": self.data_sharing,
            "protected": self.protected,
        }


@dataclass 
class NotificationSettings:
    """
    Notification settings configuration.
    
    Attributes:
        mentions: Notify on @mentions
        likes: Notify on likes
        retweets: Notify on retweets
        new_followers: Notify on new followers
        direct_messages: Notify on DMs
        email_notifications: Enable email notifications
        push_notifications: Enable push notifications
        quality_filter: Filter low-quality notifications
    """
    
    mentions: bool = True
    likes: bool = True
    retweets: bool = True
    new_followers: bool = True
    direct_messages: bool = True
    email_notifications: bool = False
    push_notifications: bool = True
    quality_filter: bool = True
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "mentions": self.mentions,
            "likes": self.likes,
            "retweets": self.retweets,
            "new_followers": self.new_followers,
            "direct_messages": self.direct_messages,
            "email_notifications": self.email_notifications,
            "push_notifications": self.push_notifications,
            "quality_filter": self.quality_filter,
        }


class SettingsActions(BaseAction):
    """
    Actions for managing account settings.
    """
    
    def __init__(
        self,
        browser_manager: BrowserManager,
        rate_limiter: RateLimiter | None = None,
    ):
        super().__init__(browser_manager, rate_limiter)
    
    async def get_settings(self) -> AccountSettings:
        """
        Get current account settings.
        
        Returns:
            AccountSettings object with current values
        """
        settings = AccountSettings()
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to settings
            await page.goto("https://twitter.com/settings/account", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Try to extract settings from page
            # This would need to navigate to various settings pages
            
            # Privacy settings
            await page.goto("https://twitter.com/settings/privacy_and_safety", wait_until="networkidle")
            await asyncio.sleep(1)
            
            # Check protected tweets
            protected_toggle = await page.query_selector('[data-testid="protectedTweetsToggle"]')
            if protected_toggle:
                is_checked = await protected_toggle.get_attribute("aria-checked")
                settings.protected = is_checked == "true"
            
            # DM settings
            await page.goto("https://twitter.com/settings/direct_messages", wait_until="networkidle")
            await asyncio.sleep(1)
            
            # Check DM from setting
            dm_setting = await page.query_selector('[data-testid="allowDMFromSetting"]')
            if dm_setting:
                text = await dm_setting.inner_text()
                if "everyone" in text.lower():
                    settings.allow_dm_from = "everyone"
                elif "verified" in text.lower():
                    settings.allow_dm_from = "verified"
                else:
                    settings.allow_dm_from = "following"
            
            logger.info("Retrieved account settings")
            
        except Exception as e:
            logger.error(f"Error getting settings: {e}")
        
        return settings
    
    async def update_settings(self, settings: dict[str, Any]) -> ActionResult:
        """
        Update account settings.
        
        Args:
            settings: Dictionary of settings to update
            
        Returns:
            ActionResult indicating success/failure
        """
        result = ActionResult(action="update_settings", target="account")
        
        try:
            page = await self.browser_manager.get_page()
            
            # Process each setting
            for key, value in settings.items():
                await self.rate_limiter.wait()
                
                if key == "protected":
                    await self._update_protected(page, value)
                elif key == "allow_dm_from":
                    await self._update_dm_settings(page, value)
                elif key == "discoverable_by_email":
                    await self._update_discoverability(page, "email", value)
                elif key == "discoverable_by_phone":
                    await self._update_discoverability(page, "phone", value)
                elif key == "sensitive_media":
                    await self._update_sensitive_media(page, value)
            
            result.success = True
            result.message = f"Updated {len(settings)} settings"
            result.data = settings
            logger.info(result.message)
            
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error updating settings: {e}")
        
        return result
    
    async def _update_protected(self, page, value: bool) -> None:
        """Update protected tweets setting."""
        await page.goto("https://twitter.com/settings/audience_and_tagging", wait_until="networkidle")
        await asyncio.sleep(1)
        
        toggle = await page.query_selector('[data-testid="protectedTweetsToggle"]')
        if toggle:
            is_checked = await toggle.get_attribute("aria-checked") == "true"
            if is_checked != value:
                await toggle.click()
                await asyncio.sleep(1)
                
                # Confirm if turning on
                if value:
                    confirm_btn = await page.query_selector('[data-testid="confirmationSheetConfirm"]')
                    if confirm_btn:
                        await confirm_btn.click()
                        await asyncio.sleep(1)
    
    async def _update_dm_settings(self, page, value: str) -> None:
        """Update DM settings."""
        await page.goto("https://twitter.com/settings/direct_messages", wait_until="networkidle")
        await asyncio.sleep(1)
        
        # Click on DM setting to open options
        dm_setting = await page.query_selector('[data-testid="allowDMFromSetting"]')
        if dm_setting:
            await dm_setting.click()
            await asyncio.sleep(0.5)
            
            # Select the appropriate option
            if value == "everyone":
                option = await page.query_selector('[data-testid="everyoneOption"]')
            elif value == "verified":
                option = await page.query_selector('[data-testid="verifiedOption"]')
            else:
                option = await page.query_selector('[data-testid="followingOption"]')
            
            if option:
                await option.click()
                await asyncio.sleep(0.5)
    
    async def _update_discoverability(self, page, type: str, value: bool) -> None:
        """Update discoverability settings."""
        await page.goto("https://twitter.com/settings/contacts", wait_until="networkidle")
        await asyncio.sleep(1)
        
        toggle_id = f"discoverableBy{type.title()}Toggle"
        toggle = await page.query_selector(f'[data-testid="{toggle_id}"]')
        if toggle:
            is_checked = await toggle.get_attribute("aria-checked") == "true"
            if is_checked != value:
                await toggle.click()
                await asyncio.sleep(1)
    
    async def _update_sensitive_media(self, page, value: bool) -> None:
        """Update sensitive media setting."""
        await page.goto("https://twitter.com/settings/content_you_see", wait_until="networkidle")
        await asyncio.sleep(1)
        
        toggle = await page.query_selector('[data-testid="sensitiveMediaToggle"]')
        if toggle:
            is_checked = await toggle.get_attribute("aria-checked") == "true"
            if is_checked != value:
                await toggle.click()
                await asyncio.sleep(1)
    
    async def get_notifications(self) -> list[dict]:
        """
        Get recent notifications.
        
        Returns:
            List of notification objects
        """
        notifications = []
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to notifications
            await page.goto("https://twitter.com/notifications", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Get notification items
            notif_items = await page.query_selector_all('[data-testid="notification"]')
            
            for item in notif_items[:50]:
                try:
                    # Get notification text
                    text_el = await item.query_selector('[data-testid="notificationText"]')
                    text = await text_el.inner_text() if text_el else ""
                    
                    # Get timestamp
                    time_el = await item.query_selector('time')
                    timestamp = None
                    if time_el:
                        datetime_attr = await time_el.get_attribute("datetime")
                        if datetime_attr:
                            timestamp = datetime_attr
                    
                    # Get type
                    notif_type = "other"
                    if "liked" in text.lower():
                        notif_type = "like"
                    elif "retweeted" in text.lower():
                        notif_type = "retweet"
                    elif "followed" in text.lower():
                        notif_type = "follow"
                    elif "mentioned" in text.lower():
                        notif_type = "mention"
                    elif "replied" in text.lower():
                        notif_type = "reply"
                    
                    notification = {
                        "text": text,
                        "type": notif_type,
                        "timestamp": timestamp,
                    }
                    notifications.append(notification)
                    
                except Exception as e:
                    continue
            
            logger.info(f"Retrieved {len(notifications)} notifications")
            
        except Exception as e:
            logger.error(f"Error getting notifications: {e}")
        
        return notifications
    
    async def update_notification_settings(
        self,
        settings: NotificationSettings | dict,
    ) -> ActionResult:
        """
        Update notification settings.
        
        Args:
            settings: NotificationSettings object or dict
            
        Returns:
            ActionResult indicating success/failure
        """
        result = ActionResult(action="update_notifications", target="settings")
        
        if isinstance(settings, NotificationSettings):
            settings = settings.to_dict()
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to notification settings
            await page.goto("https://twitter.com/settings/notifications", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Process settings
            for key, value in settings.items():
                toggle_id = f"{key}Toggle"
                toggle = await page.query_selector(f'[data-testid="{toggle_id}"]')
                if toggle:
                    is_checked = await toggle.get_attribute("aria-checked") == "true"
                    if is_checked != value:
                        await toggle.click()
                        await asyncio.sleep(0.5)
            
            result.success = True
            result.message = "Updated notification settings"
            logger.info(result.message)
            
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error updating notification settings: {e}")
        
        return result
    
    async def change_password(
        self,
        current_password: str,
        new_password: str,
    ) -> ActionResult:
        """
        Change account password.
        
        Args:
            current_password: Current password
            new_password: New password
            
        Returns:
            ActionResult indicating success/failure
        """
        result = ActionResult(action="change_password", target="account")
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to password settings
            await page.goto("https://twitter.com/settings/password", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Enter current password
            current_input = await page.query_selector('[data-testid="currentPassword"]')
            if not current_input:
                current_input = await page.query_selector('input[name="current_password"]')
            
            if current_input:
                await current_input.fill(current_password)
                await asyncio.sleep(0.3)
            
            # Enter new password
            new_input = await page.query_selector('[data-testid="newPassword"]')
            if not new_input:
                new_input = await page.query_selector('input[name="new_password"]')
            
            if new_input:
                await new_input.fill(new_password)
                await asyncio.sleep(0.3)
            
            # Confirm new password
            confirm_input = await page.query_selector('[data-testid="confirmPassword"]')
            if not confirm_input:
                confirm_input = await page.query_selector('input[name="confirm_password"]')
            
            if confirm_input:
                await confirm_input.fill(new_password)
                await asyncio.sleep(0.3)
            
            # Submit
            submit_btn = await page.query_selector('[data-testid="savePassword"]')
            if not submit_btn:
                submit_btn = await page.query_selector('button[type="submit"]')
            
            if submit_btn:
                await submit_btn.click()
                await asyncio.sleep(2)
                
                # Check for success
                error_el = await page.query_selector('[data-testid="passwordError"]')
                if error_el:
                    error_text = await error_el.inner_text()
                    result.error = error_text
                else:
                    result.success = True
                    result.message = "Password changed successfully"
                    logger.info(result.message)
            else:
                result.error = "Could not find submit button"
                
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error changing password: {e}")
        
        return result
    
    async def update_profile(
        self,
        name: str | None = None,
        bio: str | None = None,
        location: str | None = None,
        website: str | None = None,
    ) -> ActionResult:
        """
        Update profile information.
        
        Args:
            name: Display name
            bio: Bio/description
            location: Location string
            website: Website URL
            
        Returns:
            ActionResult indicating success/failure
        """
        result = ActionResult(action="update_profile", target="profile")
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to profile settings
            await page.goto("https://twitter.com/settings/profile", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Update name
            if name is not None:
                name_input = await page.query_selector('[data-testid="displayName"]')
                if name_input:
                    await name_input.fill(name)
                    await asyncio.sleep(0.3)
            
            # Update bio
            if bio is not None:
                bio_input = await page.query_selector('[data-testid="bio"]')
                if bio_input:
                    await bio_input.fill(bio)
                    await asyncio.sleep(0.3)
            
            # Update location
            if location is not None:
                location_input = await page.query_selector('[data-testid="location"]')
                if location_input:
                    await location_input.fill(location)
                    await asyncio.sleep(0.3)
            
            # Update website
            if website is not None:
                website_input = await page.query_selector('[data-testid="website"]')
                if website_input:
                    await website_input.fill(website)
                    await asyncio.sleep(0.3)
            
            # Save
            save_btn = await page.query_selector('[data-testid="saveProfile"]')
            if save_btn:
                await save_btn.click()
                await asyncio.sleep(2)
                
                result.success = True
                result.message = "Profile updated successfully"
                result.data = {
                    "name": name,
                    "bio": bio,
                    "location": location,
                    "website": website,
                }
                logger.info(result.message)
            else:
                result.error = "Could not find save button"
                
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error updating profile: {e}")
        
        return result
    
    async def update_profile_image(self, image_path: str) -> ActionResult:
        """
        Update profile image.
        
        Args:
            image_path: Path to new profile image
            
        Returns:
            ActionResult indicating success/failure
        """
        from pathlib import Path
        
        result = ActionResult(action="update_profile_image", target=image_path)
        
        if not Path(image_path).exists():
            result.error = f"Image file not found: {image_path}"
            return result
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to profile settings
            await page.goto("https://twitter.com/settings/profile", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Find image upload input
            file_input = await page.query_selector('input[type="file"][accept*="image"]')
            if file_input:
                await file_input.set_input_files(image_path)
                await asyncio.sleep(2)
                
                # Apply/save
                apply_btn = await page.query_selector('[data-testid="applyProfilePhoto"]')
                if apply_btn:
                    await apply_btn.click()
                    await asyncio.sleep(1)
                
                # Save profile
                save_btn = await page.query_selector('[data-testid="saveProfile"]')
                if save_btn:
                    await save_btn.click()
                    await asyncio.sleep(2)
                
                result.success = True
                result.message = "Profile image updated"
                logger.info(result.message)
            else:
                result.error = "Could not find image upload input"
                
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error updating profile image: {e}")
        
        return result
    
    async def update_profile_banner(self, image_path: str) -> ActionResult:
        """
        Update profile banner/header image.
        
        Args:
            image_path: Path to new banner image
            
        Returns:
            ActionResult indicating success/failure
        """
        from pathlib import Path
        
        result = ActionResult(action="update_profile_banner", target=image_path)
        
        if not Path(image_path).exists():
            result.error = f"Image file not found: {image_path}"
            return result
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to profile settings
            await page.goto("https://twitter.com/settings/profile", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Click on banner to open upload
            banner_edit = await page.query_selector('[data-testid="addBannerPhoto"]')
            if banner_edit:
                await banner_edit.click()
                await asyncio.sleep(0.5)
            
            # Find image upload input
            file_input = await page.query_selector('input[type="file"][accept*="image"]')
            if file_input:
                await file_input.set_input_files(image_path)
                await asyncio.sleep(2)
                
                # Apply
                apply_btn = await page.query_selector('[data-testid="applyBannerPhoto"]')
                if apply_btn:
                    await apply_btn.click()
                    await asyncio.sleep(1)
                
                # Save profile
                save_btn = await page.query_selector('[data-testid="saveProfile"]')
                if save_btn:
                    await save_btn.click()
                    await asyncio.sleep(2)
                
                result.success = True
                result.message = "Profile banner updated"
                logger.info(result.message)
            else:
                result.error = "Could not find image upload input"
                
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error updating profile banner: {e}")
        
        return result


__all__ = [
    "AccountSettings",
    "NotificationSettings",
    "SettingsActions",
]

"""
Unfollow all users operation.

Unfollow everyone you're following (with safety limits).
"""

import logging
from typing import Optional, Callable

from ..base import (
    BaseAction,
    ActionStats,
    UnfollowResult,
    XSelectors,
    XUrls,
)
from .unfollow_user import UnfollowUser

logger = logging.getLogger(__name__)


class UnfollowAll(BaseAction):
    """
    Unfollow all users you're following.
    
    WARNING: This is a destructive operation. Use with caution.
    Includes safety features like whitelist, confirmation, and limits.
    """
    
    async def execute(
        self,
        max_unfollows: int = 100,
        whitelist: Optional[list[str]] = None,
        require_confirmation: bool = True,
        batch_size: int = 50,
        dry_run: bool = False,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
        on_unfollow: Optional[Callable[[str, bool], None]] = None,
        on_confirm: Optional[Callable[[int], bool]] = None,
    ) -> UnfollowResult:
        """
        Unfollow all users (with safety limits).
        
        Args:
            max_unfollows: Maximum users to unfollow (safety limit)
            whitelist: Usernames to never unfollow
            require_confirmation: Require confirmation before starting
            batch_size: Process in batches of this size
            dry_run: Preview without unfollowing
            on_progress: Progress callback
            on_unfollow: Called after each unfollow
            on_confirm: Confirmation callback (receives count, returns bool)
            
        Returns:
            UnfollowResult with operation details
        """
        self.stats = ActionStats()
        
        unfollowed_users = []
        failed_users = []
        skipped_users = []
        
        self.logger.info(f"Starting unfollow all, max={max_unfollows}")
        
        if dry_run:
            self.logger.info("DRY RUN - no unfollows will be performed")
        
        # Validate preconditions
        can_proceed, message = await self.validate_preconditions()
        if not can_proceed:
            self.logger.error(f"Precondition failed: {message}")
            return self._build_result(unfollowed_users, failed_users, skipped_users, [message])
        
        # Build whitelist set
        whitelist_set = set(w.lower().lstrip('@') for w in (whitelist or []))
        if self.tracker:
            whitelist_set.update(self.tracker.get_whitelist())
        
        try:
            # Get list of users we're following
            following = await self._get_all_following()
            self.logger.info(f"Found {len(following)} users you're following")
            
            # Filter whitelist
            following = [u for u in following if u.lower() not in whitelist_set]
            self.logger.info(f"After whitelist filter: {len(following)} users")
            
            # Apply max limit
            following = following[:max_unfollows]
            
            # Confirmation
            if require_confirmation and not dry_run:
                if on_confirm:
                    if not on_confirm(len(following)):
                        self.logger.info("User cancelled operation")
                        return self._build_result([], [], [], ["Operation cancelled by user"])
                else:
                    self.logger.warning(
                        f"About to unfollow {len(following)} users. "
                        "Provide on_confirm callback for production use."
                    )
            
            # Process in batches
            total = len(following)
            
            for i in range(0, total, batch_size):
                if self._cancelled:
                    self.logger.info("Operation cancelled")
                    break
                
                batch = following[i:i + batch_size]
                batch_num = i // batch_size + 1
                total_batches = (total + batch_size - 1) // batch_size
                
                self.logger.info(f"Processing batch {batch_num}/{total_batches}")
                
                for j, username in enumerate(batch):
                    if self._cancelled:
                        break
                    
                    await self._wait_if_paused()
                    
                    overall_progress = i + j + 1
                    self._log_progress(
                        overall_progress, total,
                        f"Unfollowing @{username}",
                        on_progress
                    )
                    
                    # Check whitelist again (in case it was updated)
                    if self.tracker and self.tracker.is_whitelisted(username):
                        skipped_users.append(username)
                        continue
                    
                    if dry_run:
                        self.logger.info(f"[DRY RUN] Would unfollow @{username}")
                        unfollowed_users.append(username)
                        continue
                    
                    unfollow_action = UnfollowUser(
                        self.browser, self.rate_limiter, self.tracker
                    )
                    result = await unfollow_action.execute(
                        username=username,
                        reason='unfollow_all',
                        on_complete=on_unfollow
                    )
                    
                    unfollowed_users.extend(result.unfollowed_users)
                    failed_users.extend(result.failed_users)
                    skipped_users.extend(result.skipped_users)
                    self.stats.errors.extend(result.errors)
                    
                    if result.rate_limited:
                        self.stats.rate_limited = True
                        self.logger.warning("Rate limited, stopping")
                        break
                
                if self.stats.rate_limited:
                    break
                
        except Exception as e:
            error_msg = f"Error during unfollow all: {str(e)}"
            self.logger.error(error_msg)
            self.stats.errors.append(error_msg)
        
        self.stats.success_count = len(unfollowed_users)
        self.stats.failed_count = len(failed_users)
        self.stats.skipped_count = len(skipped_users)
        self.stats.complete()
        
        self.logger.info(
            f"Unfollow all complete: {len(unfollowed_users)} unfollowed, "
            f"{len(failed_users)} failed, {len(skipped_users)} skipped"
        )
        
        return self._build_result(unfollowed_users, failed_users, skipped_users)
    
    async def _get_all_following(self) -> list[str]:
        """
        Get list of all users we're following.
        
        Returns:
            List of usernames
        """
        following = []
        
        try:
            # Navigate to our following page
            # First we need to get our own username
            await self.browser.goto(XUrls.HOME)
            import asyncio
            await asyncio.sleep(2)
            
            # Get current user's profile link and username
            # This would need to be implemented based on the browser manager
            # For now, assume we have a way to get it
            
            # Navigate to following list
            # This is a simplified version - in reality you'd need
            # to get your own username first
            await self.browser.goto("https://x.com/following")
            
            await self.browser.wait_for_selector(XSelectors.USER_CELL, timeout=10000)
            
            # Scroll and collect all following
            collected = set()
            scroll_attempts = 0
            max_scrolls = 50
            no_new_count = 0
            
            while scroll_attempts < max_scrolls:
                # Extract usernames
                usernames = await self.browser.get_all_text(
                    f'{XSelectors.USER_CELL} {XSelectors.USER_NAME}'
                )
                
                new_this_scroll = 0
                for username in usernames:
                    if username:
                        clean = username.split('@')[-1] if '@' in username else username
                        clean = clean.split()[0].lower() if clean else ''
                        if clean and clean not in collected:
                            collected.add(clean)
                            following.append(clean)
                            new_this_scroll += 1
                
                if new_this_scroll == 0:
                    no_new_count += 1
                    if no_new_count >= 3:
                        break
                else:
                    no_new_count = 0
                
                # Scroll
                await self.browser.scroll_down()
                await asyncio.sleep(1.5)
                scroll_attempts += 1
            
            self.logger.debug(f"Collected {len(following)} following")
            
        except Exception as e:
            self.logger.error(f"Failed to get following list: {e}")
            self.stats.errors.append(f"Get following error: {str(e)}")
        
        return following
    
    def _build_result(
        self,
        unfollowed: list[str],
        failed: list[str],
        skipped: list[str],
        errors: Optional[list[str]] = None
    ) -> UnfollowResult:
        """Build the result object."""
        all_errors = self.stats.errors + (errors or [])
        return UnfollowResult(
            success_count=len(unfollowed),
            failed_count=len(failed),
            skipped_count=len(skipped),
            unfollowed_users=unfollowed,
            failed_users=failed,
            skipped_users=skipped,
            duration_seconds=self.stats.duration_seconds,
            rate_limited=self.stats.rate_limited,
            errors=all_errors
        )

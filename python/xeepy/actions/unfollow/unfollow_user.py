"""
Single user unfollow operation.

Unfollow a specific user by username.
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

logger = logging.getLogger(__name__)


class UnfollowUser(BaseAction):
    """
    Unfollow a single user by username.
    
    The most basic unfollow operation - navigate to profile and click unfollow.
    """
    
    async def execute(
        self,
        username: str,
        reason: Optional[str] = None,
        skip_if_not_following: bool = True,
        on_complete: Optional[Callable[[str, bool], None]] = None,
    ) -> UnfollowResult:
        """
        Unfollow a single user.
        
        Args:
            username: Username to unfollow (with or without @)
            reason: Reason for unfollowing (for tracking)
            skip_if_not_following: Skip if not currently following
            on_complete: Callback when complete (username, success)
            
        Returns:
            UnfollowResult with operation details
        """
        username = username.lower().lstrip('@')
        self.stats = ActionStats()
        
        unfollowed_users = []
        failed_users = []
        skipped_users = []
        
        self.logger.info(f"Starting unfollow for @{username}")
        
        # Check whitelist
        if self.tracker and self.tracker.is_whitelisted(username):
            self.logger.info(f"@{username} is whitelisted, skipping")
            skipped_users.append(username)
            return self._build_result(unfollowed_users, failed_users, skipped_users)
        
        # Validate preconditions
        can_proceed, message = await self.validate_preconditions()
        if not can_proceed:
            self.logger.error(f"Precondition failed: {message}")
            return UnfollowResult(
                success_count=0,
                failed_count=1,
                skipped_count=0,
                unfollowed_users=[],
                failed_users=[username],
                skipped_users=[],
                duration_seconds=self.stats.duration_seconds,
                rate_limited=False,
                errors=[message]
            )
        
        try:
            # Rate limit wait
            await self._handle_rate_limit()
            
            # Navigate to profile
            profile_url = XUrls.PROFILE.format(username=username)
            await self.browser.goto(profile_url)
            
            # Wait for profile to load
            await self.browser.wait_for_selector(XSelectors.PROFILE_NAME, timeout=10000)
            
            # Check if currently following
            is_following = await self._is_following()
            
            if not is_following:
                if skip_if_not_following:
                    self.logger.info(f"Not following @{username}, skipping")
                    skipped_users.append(username)
                    return self._build_result(unfollowed_users, failed_users, skipped_users)
                else:
                    self.logger.info(f"Not following @{username}")
                    unfollowed_users.append(username)  # Consider it a success
                    return self._build_result(unfollowed_users, failed_users, skipped_users)
            
            # Click unfollow button
            success = await self._click_unfollow()
            
            if success:
                self.logger.info(f"Successfully unfollowed @{username}")
                unfollowed_users.append(username)
                self.stats.success_count += 1
                
                # Record in tracker
                if self.tracker:
                    self.tracker.record_unfollow(username, reason=reason or 'manual')
            else:
                self.logger.warning(f"Failed to unfollow @{username}")
                failed_users.append(username)
                self.stats.failed_count += 1
            
            # Call completion callback
            if on_complete:
                on_complete(username, success)
            
        except Exception as e:
            error_msg = f"Error unfollowing @{username}: {str(e)}"
            self.logger.error(error_msg)
            failed_users.append(username)
            self.stats.failed_count += 1
            self.stats.errors.append(error_msg)
        
        self.stats.complete()
        return self._build_result(unfollowed_users, failed_users, skipped_users)
    
    async def _is_following(self) -> bool:
        """Check if we're currently following this user."""
        try:
            return await self.browser.wait_for_selector(
                XSelectors.FOLLOWING_BUTTON, 
                timeout=3000
            )
        except:
            return False
    
    async def _click_unfollow(self) -> bool:
        """Click the unfollow button and confirm."""
        try:
            # Click the "Following" button to start unfollow
            if not await self.browser.wait_for_selector(XSelectors.FOLLOWING_BUTTON, timeout=5000):
                self.logger.warning("Following button not found")
                return False
            
            success = await self.browser.click(XSelectors.FOLLOWING_BUTTON)
            if not success:
                return False
            
            # Wait for and click confirmation
            import asyncio
            await asyncio.sleep(0.5)
            
            if await self.browser.wait_for_selector(XSelectors.CONFIRM_UNFOLLOW, timeout=3000):
                await self.browser.click(XSelectors.CONFIRM_UNFOLLOW)
            
            await asyncio.sleep(1)
            
            # Verify unfollow succeeded by checking for "Follow" button
            return await self.browser.wait_for_selector(
                XSelectors.FOLLOW_BUTTON,
                timeout=5000
            )
        except Exception as e:
            self.logger.error(f"Click unfollow failed: {e}")
            return False
    
    def _build_result(
        self,
        unfollowed: list[str],
        failed: list[str],
        skipped: list[str]
    ) -> UnfollowResult:
        """Build the result object."""
        return UnfollowResult(
            success_count=len(unfollowed),
            failed_count=len(failed),
            skipped_count=len(skipped),
            unfollowed_users=unfollowed,
            failed_users=failed,
            skipped_users=skipped,
            duration_seconds=self.stats.duration_seconds,
            rate_limited=self.stats.rate_limited,
            errors=self.stats.errors
        )


class UnfollowUsers(BaseAction):
    """
    Unfollow multiple users from a list.
    
    Batch operation with progress tracking and resumability.
    """
    
    async def execute(
        self,
        usernames: list[str],
        max_unfollows: Optional[int] = None,
        reason: Optional[str] = None,
        whitelist: Optional[list[str]] = None,
        dry_run: bool = False,
        resume_session: bool = True,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
        on_unfollow: Optional[Callable[[str, bool], None]] = None,
    ) -> UnfollowResult:
        """
        Unfollow multiple users.
        
        Args:
            usernames: List of usernames to unfollow
            max_unfollows: Maximum number to unfollow (None for all)
            reason: Reason for unfollowing (for tracking)
            whitelist: Usernames to never unfollow
            dry_run: Preview without unfollowing
            resume_session: Resume previous incomplete session if exists
            on_progress: Progress callback (current, total, message)
            on_unfollow: Called after each unfollow attempt
            
        Returns:
            UnfollowResult with aggregated results
        """
        self.stats = ActionStats()
        
        unfollowed_users = []
        failed_users = []
        skipped_users = []
        
        # Clean usernames
        usernames = [u.lower().lstrip('@') for u in usernames]
        
        # Apply whitelist
        whitelist_set = set(w.lower().lstrip('@') for w in (whitelist or []))
        if self.tracker:
            whitelist_set.update(self.tracker.get_whitelist())
        
        # Filter out whitelisted
        original_count = len(usernames)
        usernames = [u for u in usernames if u not in whitelist_set]
        if original_count != len(usernames):
            self.logger.info(f"Filtered out {original_count - len(usernames)} whitelisted users")
        
        # Apply max limit
        if max_unfollows:
            usernames = usernames[:max_unfollows]
        
        total = len(usernames)
        self.logger.info(f"Starting batch unfollow of {total} users")
        
        if dry_run:
            self.logger.info("DRY RUN - no unfollows will be performed")
        
        # Create or resume session for resumability
        session_id = None
        if self.tracker and resume_session:
            pending_session = self.tracker.get_pending_session('batch_unfollow')
            if pending_session:
                session_id = pending_session['id']
                usernames = self.tracker.get_pending_session_items(session_id)
                self.logger.info(f"Resuming session {session_id} with {len(usernames)} remaining")
            else:
                session_id = self.tracker.create_session(
                    'batch_unfollow',
                    usernames,
                    {'reason': reason}
                )
        
        unfollow_user = UnfollowUser(self.browser, self.rate_limiter, self.tracker)
        
        for i, username in enumerate(usernames):
            if self._cancelled:
                self.logger.info("Operation cancelled")
                break
            
            await self._wait_if_paused()
            
            self._log_progress(i + 1, total, f"Processing @{username}", on_progress)
            
            if dry_run:
                self.logger.info(f"[DRY RUN] Would unfollow @{username}")
                unfollowed_users.append(username)
                continue
            
            result = await unfollow_user.execute(
                username=username,
                reason=reason,
                skip_if_not_following=True,
                on_complete=on_unfollow
            )
            
            # Aggregate results
            unfollowed_users.extend(result.unfollowed_users)
            failed_users.extend(result.failed_users)
            skipped_users.extend(result.skipped_users)
            self.stats.errors.extend(result.errors)
            
            # Update session
            if self.tracker and session_id:
                if result.unfollowed_users:
                    self.tracker.update_session_item(session_id, username, 'success')
                elif result.failed_users:
                    self.tracker.update_session_item(
                        session_id, username, 'failed',
                        result.errors[0] if result.errors else None
                    )
                else:
                    self.tracker.update_session_item(session_id, username, 'skipped')
            
            if result.rate_limited:
                self.stats.rate_limited = True
                self.logger.warning("Rate limited, pausing operation")
                break
        
        # Complete session
        if self.tracker and session_id and not self._cancelled:
            self.tracker.complete_session(session_id)
        
        self.stats.success_count = len(unfollowed_users)
        self.stats.failed_count = len(failed_users)
        self.stats.skipped_count = len(skipped_users)
        self.stats.complete()
        
        self.logger.info(
            f"Batch unfollow complete: {len(unfollowed_users)} unfollowed, "
            f"{len(failed_users)} failed, {len(skipped_users)} skipped"
        )
        
        return UnfollowResult(
            success_count=len(unfollowed_users),
            failed_count=len(failed_users),
            skipped_count=len(skipped_users),
            unfollowed_users=unfollowed_users,
            failed_users=failed_users,
            skipped_users=skipped_users,
            duration_seconds=self.stats.duration_seconds,
            rate_limited=self.stats.rate_limited,
            errors=self.stats.errors
        )

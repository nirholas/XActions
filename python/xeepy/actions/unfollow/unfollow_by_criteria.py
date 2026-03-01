"""
Unfollow by custom criteria.

Flexible unfollow operation with custom filtering rules.
"""

import logging
from typing import Optional, Callable
from dataclasses import dataclass

from ..base import (
    BaseAction,
    ActionStats,
    UnfollowResult,
    UnfollowFilters,
    XSelectors,
    XUrls,
)
from .unfollow_user import UnfollowUser

logger = logging.getLogger(__name__)


@dataclass 
class UnfollowCriteria:
    """Criteria for filtering users to unfollow."""
    # Follower count filters
    min_followers: Optional[int] = None
    max_followers: Optional[int] = None
    
    # Following count filters
    min_following: Optional[int] = None
    max_following: Optional[int] = None
    
    # Ratio filters
    min_ratio: Optional[float] = None  # followers/following
    max_ratio: Optional[float] = None
    
    # Activity filters
    min_tweets: Optional[int] = None
    max_tweets: Optional[int] = None
    inactive_days: Optional[int] = None  # No tweets in X days
    
    # Account filters
    verified_only: bool = False
    exclude_verified: bool = False
    has_bio: Optional[bool] = None
    has_profile_pic: Optional[bool] = None
    
    # Bio content filters
    bio_contains: Optional[list[str]] = None
    bio_not_contains: Optional[list[str]] = None
    
    # Source filter (based on how we followed them)
    from_source: Optional[str] = None
    not_from_source: Optional[str] = None


class UnfollowByCriteria(BaseAction):
    """
    Unfollow users based on custom criteria.
    
    More flexible than other unfollow operations - allows
    combining multiple filter criteria.
    """
    
    async def execute(
        self,
        criteria: UnfollowCriteria,
        max_unfollows: int = 50,
        whitelist: Optional[list[str]] = None,
        must_be_non_follower: bool = False,
        dry_run: bool = False,
        on_progress: Optional[Callable[[int, int, str], None]] = None,
        on_unfollow: Optional[Callable[[str, bool], None]] = None,
    ) -> UnfollowResult:
        """
        Unfollow users matching the given criteria.
        
        Args:
            criteria: Filter criteria for selecting users
            max_unfollows: Maximum users to unfollow
            whitelist: Usernames to never unfollow
            must_be_non_follower: Only unfollow if they don't follow back
            dry_run: Preview without unfollowing
            on_progress: Progress callback
            on_unfollow: Called after each unfollow
            
        Returns:
            UnfollowResult with operation details
        """
        self.stats = ActionStats()
        
        unfollowed_users = []
        failed_users = []
        skipped_users = []
        
        self.logger.info(f"Starting criteria-based unfollow, max={max_unfollows}")
        
        if dry_run:
            self.logger.info("DRY RUN - no unfollows will be performed")
        
        # Validate preconditions
        can_proceed, message = await self.validate_preconditions()
        if not can_proceed:
            self.logger.error(f"Precondition failed: {message}")
            return self._build_result([], [], [], [message])
        
        # Build whitelist set
        whitelist_set = set(w.lower().lstrip('@') for w in (whitelist or []))
        if self.tracker:
            whitelist_set.update(self.tracker.get_whitelist())
        
        try:
            # Get users we're following
            self._log_progress(0, 100, "Fetching following list...", on_progress)
            following = await self._get_following()
            
            # If must be non-follower, get followers too
            followers_set = set()
            if must_be_non_follower:
                self._log_progress(25, 100, "Fetching followers list...", on_progress)
                followers = await self._get_followers()
                followers_set = set(f.lower() for f in followers)
            
            # Filter by criteria
            self._log_progress(50, 100, "Applying criteria filters...", on_progress)
            
            to_unfollow = []
            
            for username in following:
                username_lower = username.lower()
                
                # Whitelist check
                if username_lower in whitelist_set:
                    skipped_users.append(username)
                    continue
                
                # Non-follower check
                if must_be_non_follower and username_lower in followers_set:
                    skipped_users.append(username)
                    continue
                
                # Apply criteria
                matches, reason = await self._matches_criteria(username, criteria)
                
                if matches:
                    to_unfollow.append(username)
                    if len(to_unfollow) >= max_unfollows:
                        break
                else:
                    self.logger.debug(f"Skipping @{username}: {reason}")
                    skipped_users.append(username)
            
            self.logger.info(f"Found {len(to_unfollow)} users matching criteria")
            
            # Unfollow
            total = len(to_unfollow)
            
            for i, username in enumerate(to_unfollow):
                if self._cancelled:
                    self.logger.info("Operation cancelled")
                    break
                
                await self._wait_if_paused()
                
                progress = 60 + int((i / total) * 40) if total > 0 else 100
                self._log_progress(
                    progress, 100,
                    f"Unfollowing @{username} ({i+1}/{total})",
                    on_progress
                )
                
                if dry_run:
                    self.logger.info(f"[DRY RUN] Would unfollow @{username}")
                    unfollowed_users.append(username)
                    continue
                
                unfollow_action = UnfollowUser(
                    self.browser, self.rate_limiter, self.tracker
                )
                result = await unfollow_action.execute(
                    username=username,
                    reason='criteria_filter',
                    on_complete=on_unfollow
                )
                
                unfollowed_users.extend(result.unfollowed_users)
                failed_users.extend(result.failed_users)
                # Don't add to skipped_users again
                self.stats.errors.extend(result.errors)
                
                if result.rate_limited:
                    self.stats.rate_limited = True
                    self.logger.warning("Rate limited, stopping")
                    break
                    
        except Exception as e:
            error_msg = f"Error during criteria-based unfollow: {str(e)}"
            self.logger.error(error_msg)
            self.stats.errors.append(error_msg)
        
        self.stats.success_count = len(unfollowed_users)
        self.stats.failed_count = len(failed_users)
        self.stats.skipped_count = len(skipped_users)
        self.stats.complete()
        
        self.logger.info(
            f"Criteria-based unfollow complete: {len(unfollowed_users)} unfollowed, "
            f"{len(failed_users)} failed, {len(skipped_users)} skipped"
        )
        
        return self._build_result(unfollowed_users, failed_users, skipped_users)
    
    async def _matches_criteria(
        self,
        username: str,
        criteria: UnfollowCriteria
    ) -> tuple[bool, str]:
        """
        Check if a user matches the unfollow criteria.
        
        Args:
            username: Username to check
            criteria: Criteria to match against
            
        Returns:
            Tuple of (matches, reason if not matching)
        """
        # Get cached profile if available
        profile = None
        if self.tracker:
            profile = self.tracker.get_cached_profile(username)
        
        # If we don't have profile data, we can only check source-based criteria
        if profile:
            followers = profile.get('followers_count', 0)
            following = profile.get('following_count', 0)
            tweets = profile.get('tweets_count', 0)
            verified = profile.get('verified', False)
            bio = profile.get('bio', '')
            has_pic = profile.get('has_profile_pic', True)
            
            # Follower count
            if criteria.min_followers is not None and followers < criteria.min_followers:
                return False, f"Too few followers ({followers})"
            if criteria.max_followers is not None and followers > criteria.max_followers:
                return True, f"Too many followers ({followers})"  # This MATCHES for unfollow
            
            # Following count
            if criteria.min_following is not None and following < criteria.min_following:
                return False, f"Too few following ({following})"
            if criteria.max_following is not None and following > criteria.max_following:
                return True, f"Too many following ({following})"
            
            # Ratio
            if following > 0:
                ratio = followers / following
                if criteria.min_ratio is not None and ratio < criteria.min_ratio:
                    return True, f"Low ratio ({ratio:.2f})"  # Low ratio = unfollow
                if criteria.max_ratio is not None and ratio > criteria.max_ratio:
                    return False, f"High ratio ({ratio:.2f})"
            
            # Tweets
            if criteria.min_tweets is not None and tweets < criteria.min_tweets:
                return True, f"Too few tweets ({tweets})"
            if criteria.max_tweets is not None and tweets > criteria.max_tweets:
                return True, f"Too many tweets ({tweets})"
            
            # Verified
            if criteria.verified_only and not verified:
                return False, "Not verified"
            if criteria.exclude_verified and verified:
                return False, "Is verified"
            
            # Bio
            if criteria.has_bio is not None:
                has_bio = bool(bio and bio.strip())
                if criteria.has_bio and not has_bio:
                    return True, "No bio"
                if not criteria.has_bio and has_bio:
                    return False, "Has bio"
            
            if criteria.has_profile_pic is not None:
                if criteria.has_profile_pic and not has_pic:
                    return True, "No profile pic"
                if not criteria.has_profile_pic and has_pic:
                    return False, "Has profile pic"
            
            # Bio content
            if criteria.bio_contains and bio:
                bio_lower = bio.lower()
                if not any(kw.lower() in bio_lower for kw in criteria.bio_contains):
                    return False, "Bio doesn't contain required keywords"
            
            if criteria.bio_not_contains and bio:
                bio_lower = bio.lower()
                for kw in criteria.bio_not_contains:
                    if kw.lower() in bio_lower:
                        return True, f"Bio contains '{kw}'"
        
        # Source-based criteria (from tracker)
        if self.tracker and (criteria.from_source or criteria.not_from_source):
            history = self.tracker.get_follow_history(username)
            if history:
                last_follow = next(
                    (h for h in history if h['action_type'] == 'follow'),
                    None
                )
                if last_follow:
                    source = last_follow.get('source', '')
                    
                    if criteria.from_source:
                        if criteria.from_source not in (source or ''):
                            return False, f"Not from source {criteria.from_source}"
                    
                    if criteria.not_from_source:
                        if criteria.not_from_source in (source or ''):
                            return True, f"From excluded source {criteria.not_from_source}"
        
        # Default: if we have no profile data and no source criteria matched,
        # don't unfollow (be conservative)
        if profile is None:
            return False, "No profile data available"
        
        return True, "Matches criteria"
    
    async def _get_following(self) -> list[str]:
        """Get list of users we're following."""
        following = []
        
        try:
            await self.browser.goto("https://x.com/following")
            import asyncio
            await asyncio.sleep(2)
            
            await self.browser.wait_for_selector(XSelectors.USER_CELL, timeout=15000)
            
            collected = set()
            scroll_attempts = 0
            max_scrolls = 50
            no_new_count = 0
            
            while scroll_attempts < max_scrolls:
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
                
                await self.browser.scroll_down()
                await asyncio.sleep(1.5)
                scroll_attempts += 1
            
        except Exception as e:
            self.logger.error(f"Failed to get following: {e}")
        
        return following
    
    async def _get_followers(self) -> list[str]:
        """Get list of followers."""
        followers = []
        
        try:
            await self.browser.goto("https://x.com/followers")
            import asyncio
            await asyncio.sleep(2)
            
            await self.browser.wait_for_selector(XSelectors.USER_CELL, timeout=15000)
            
            collected = set()
            scroll_attempts = 0
            max_scrolls = 50
            no_new_count = 0
            
            while scroll_attempts < max_scrolls:
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
                            followers.append(clean)
                            new_this_scroll += 1
                
                if new_this_scroll == 0:
                    no_new_count += 1
                    if no_new_count >= 3:
                        break
                else:
                    no_new_count = 0
                
                await self.browser.scroll_down()
                await asyncio.sleep(1.5)
                scroll_attempts += 1
            
        except Exception as e:
            self.logger.error(f"Failed to get followers: {e}")
        
        return followers
    
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

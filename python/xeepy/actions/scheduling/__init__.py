"""
Scheduled tweets and drafts management.

Supports:
- Schedule tweets for future posting
- Schedule replies
- Manage scheduled tweets
- Draft tweets management
"""

from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

from loguru import logger

from xeepy.core.browser import BrowserManager
from xeepy.core.rate_limiter import RateLimiter
from xeepy.actions.base import BaseAction, ActionResult


@dataclass
class ScheduledTweet:
    """
    Represents a scheduled tweet.
    
    Attributes:
        id: Unique scheduled tweet ID
        text: Tweet text content
        scheduled_at: When the tweet will be posted
        created_at: When the schedule was created
        media: List of media file paths
        is_reply: Whether this is a scheduled reply
        reply_to_id: ID of tweet being replied to (if reply)
        poll_options: Poll options (if poll tweet)
        poll_duration: Poll duration in minutes
    """
    
    id: str
    text: str = ""
    scheduled_at: datetime | None = None
    created_at: datetime | None = None
    media: list[str] = field(default_factory=list)
    is_reply: bool = False
    reply_to_id: str = ""
    poll_options: list[str] = field(default_factory=list)
    poll_duration: int = 0
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "text": self.text,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "media": self.media,
            "is_reply": self.is_reply,
            "reply_to_id": self.reply_to_id,
            "poll_options": self.poll_options,
            "poll_duration": self.poll_duration,
        }


@dataclass
class DraftTweet:
    """
    Represents a draft tweet.
    
    Attributes:
        id: Unique draft ID
        text: Tweet text content
        created_at: When the draft was created
        updated_at: When the draft was last updated
        media: List of media file paths
        is_reply: Whether this is a reply draft
        reply_to_id: ID of tweet being replied to (if reply)
    """
    
    id: str
    text: str = ""
    created_at: datetime | None = None
    updated_at: datetime | None = None
    media: list[str] = field(default_factory=list)
    is_reply: bool = False
    reply_to_id: str = ""
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "text": self.text,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "media": self.media,
            "is_reply": self.is_reply,
            "reply_to_id": self.reply_to_id,
        }


class SchedulingActions(BaseAction):
    """
    Actions for scheduled tweets and drafts.
    
    Provides methods for scheduling, managing, and deleting scheduled content.
    """
    
    def __init__(
        self,
        browser_manager: BrowserManager,
        rate_limiter: RateLimiter | None = None,
    ):
        super().__init__(browser_manager, rate_limiter)
    
    async def schedule_tweet(
        self,
        text: str,
        scheduled_time: datetime | str,
        media: list[str] | None = None,
    ) -> ActionResult:
        """
        Schedule a tweet for future posting.
        
        Args:
            text: Tweet text content
            scheduled_time: When to post (datetime or "YYYY-MM-DD HH:MM")
            media: List of media file paths to attach
            
        Returns:
            ActionResult with scheduled tweet details
        """
        result = ActionResult(action="schedule_tweet", target=text[:50])
        
        try:
            page = await self.browser_manager.get_page()
            
            # Parse scheduled time
            if isinstance(scheduled_time, str):
                scheduled_time = datetime.strptime(scheduled_time, "%Y-%m-%d %H:%M")
            
            # Navigate to compose
            await page.goto("https://twitter.com/compose/tweet", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Enter tweet text
            text_input = await page.query_selector('[data-testid="tweetTextarea_0"]')
            if text_input:
                await text_input.fill(text)
                await asyncio.sleep(0.5)
            
            # Handle media uploads
            if media:
                file_input = await page.query_selector('input[type="file"][accept*="image"]')
                if file_input:
                    for media_path in media:
                        if Path(media_path).exists():
                            await file_input.set_input_files(media_path)
                            await asyncio.sleep(2)
            
            # Click schedule button (calendar icon)
            schedule_btn = await page.query_selector('[data-testid="scheduleOption"]')
            if not schedule_btn:
                schedule_btn = await page.query_selector('[aria-label*="Schedule"]')
            
            if schedule_btn:
                await schedule_btn.click()
                await asyncio.sleep(1)
                
                # Set date
                date_input = await page.query_selector('[data-testid="scheduledDateInput"]')
                if date_input:
                    await date_input.fill(scheduled_time.strftime("%Y-%m-%d"))
                
                # Set time
                time_input = await page.query_selector('[data-testid="scheduledTimeInput"]')
                if time_input:
                    await time_input.fill(scheduled_time.strftime("%H:%M"))
                
                # Confirm schedule
                confirm_btn = await page.query_selector('[data-testid="scheduledConfirmationPrimaryAction"]')
                if confirm_btn:
                    await confirm_btn.click()
                    await asyncio.sleep(1)
                    
                    result.success = True
                    result.message = f"Tweet scheduled for {scheduled_time}"
                    result.data = {
                        "text": text,
                        "scheduled_at": scheduled_time.isoformat(),
                    }
                    logger.info(result.message)
            else:
                result.error = "Could not find schedule button"
                
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error scheduling tweet: {e}")
        
        return result
    
    async def schedule_reply(
        self,
        text: str,
        tweet_id: str,
        scheduled_time: datetime | str,
        media: list[str] | None = None,
    ) -> ActionResult:
        """
        Schedule a reply to a tweet.
        
        Args:
            text: Reply text content
            tweet_id: ID of tweet to reply to
            scheduled_time: When to post
            media: List of media file paths
            
        Returns:
            ActionResult with scheduled reply details
        """
        result = ActionResult(action="schedule_reply", target=tweet_id)
        
        try:
            page = await self.browser_manager.get_page()
            
            # Parse scheduled time
            if isinstance(scheduled_time, str):
                scheduled_time = datetime.strptime(scheduled_time, "%Y-%m-%d %H:%M")
            
            # Navigate to tweet
            # First need to find tweet URL
            await page.goto(
                f"https://twitter.com/i/status/{tweet_id}",
                wait_until="networkidle"
            )
            await asyncio.sleep(2)
            
            # Click reply button
            reply_btn = await page.query_selector('[data-testid="reply"]')
            if reply_btn:
                await reply_btn.click()
                await asyncio.sleep(1)
            
            # Enter reply text
            text_input = await page.query_selector('[data-testid="tweetTextarea_0"]')
            if text_input:
                await text_input.fill(text)
                await asyncio.sleep(0.5)
            
            # Handle media uploads
            if media:
                file_input = await page.query_selector('input[type="file"][accept*="image"]')
                if file_input:
                    for media_path in media:
                        if Path(media_path).exists():
                            await file_input.set_input_files(media_path)
                            await asyncio.sleep(2)
            
            # Click schedule button
            schedule_btn = await page.query_selector('[data-testid="scheduleOption"]')
            if schedule_btn:
                await schedule_btn.click()
                await asyncio.sleep(1)
                
                # Set date and time
                date_input = await page.query_selector('[data-testid="scheduledDateInput"]')
                if date_input:
                    await date_input.fill(scheduled_time.strftime("%Y-%m-%d"))
                
                time_input = await page.query_selector('[data-testid="scheduledTimeInput"]')
                if time_input:
                    await time_input.fill(scheduled_time.strftime("%H:%M"))
                
                # Confirm
                confirm_btn = await page.query_selector('[data-testid="scheduledConfirmationPrimaryAction"]')
                if confirm_btn:
                    await confirm_btn.click()
                    await asyncio.sleep(1)
                    
                    result.success = True
                    result.message = f"Reply scheduled for {scheduled_time}"
                    result.data = {
                        "text": text,
                        "reply_to": tweet_id,
                        "scheduled_at": scheduled_time.isoformat(),
                    }
                    logger.info(result.message)
                    
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error scheduling reply: {e}")
        
        return result
    
    async def scheduled_tweets(self, ascending: bool = True) -> list[ScheduledTweet]:
        """
        Get all scheduled tweets.
        
        Args:
            ascending: Sort by scheduled time ascending
            
        Returns:
            List of scheduled tweets
        """
        scheduled = []
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to scheduled tweets page
            await page.goto(
                "https://twitter.com/compose/tweet/unsent/scheduled",
                wait_until="networkidle"
            )
            await asyncio.sleep(2)
            
            # Get scheduled tweet items
            tweet_items = await page.query_selector_all('[data-testid="scheduledTweet"]')
            
            for item in tweet_items:
                try:
                    # Get tweet text
                    text_el = await item.query_selector('[data-testid="tweetText"]')
                    text = await text_el.inner_text() if text_el else ""
                    
                    # Get scheduled time
                    time_el = await item.query_selector('[data-testid="scheduledTime"]')
                    time_text = await time_el.inner_text() if time_el else ""
                    
                    # Try to parse scheduled time
                    scheduled_at = None
                    if time_text:
                        try:
                            scheduled_at = datetime.strptime(time_text, "%b %d, %Y at %I:%M %p")
                        except:
                            pass
                    
                    # Get ID from data attribute or generate
                    tweet_id = await item.get_attribute("data-tweet-id") or str(len(scheduled))
                    
                    scheduled_tweet = ScheduledTweet(
                        id=tweet_id,
                        text=text,
                        scheduled_at=scheduled_at,
                    )
                    scheduled.append(scheduled_tweet)
                    
                except Exception as e:
                    logger.warning(f"Error parsing scheduled tweet: {e}")
                    continue
            
            # Sort
            if scheduled_at:
                scheduled.sort(
                    key=lambda x: x.scheduled_at or datetime.max,
                    reverse=not ascending
                )
            
            logger.info(f"Found {len(scheduled)} scheduled tweets")
            
        except Exception as e:
            logger.error(f"Error getting scheduled tweets: {e}")
        
        return scheduled
    
    async def delete_scheduled_tweet(self, tweet_id: str) -> ActionResult:
        """
        Delete a scheduled tweet.
        
        Args:
            tweet_id: ID of scheduled tweet to delete
            
        Returns:
            ActionResult indicating success/failure
        """
        result = ActionResult(action="delete_scheduled", target=tweet_id)
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to scheduled tweets
            await page.goto(
                "https://twitter.com/compose/tweet/unsent/scheduled",
                wait_until="networkidle"
            )
            await asyncio.sleep(2)
            
            # Find and click on the scheduled tweet
            tweet_items = await page.query_selector_all('[data-testid="scheduledTweet"]')
            
            for item in tweet_items:
                item_id = await item.get_attribute("data-tweet-id")
                if item_id == tweet_id or str(len(tweet_items)) == tweet_id:
                    # Click to open
                    await item.click()
                    await asyncio.sleep(1)
                    
                    # Find delete option
                    delete_btn = await page.query_selector('[data-testid="unsentTweetDeleteConfirm"]')
                    if not delete_btn:
                        # Click more menu
                        more_btn = await page.query_selector('[data-testid="caret"]')
                        if more_btn:
                            await more_btn.click()
                            await asyncio.sleep(0.5)
                            delete_btn = await page.query_selector('[data-testid="unsentTweetDelete"]')
                    
                    if delete_btn:
                        await delete_btn.click()
                        await asyncio.sleep(0.5)
                        
                        # Confirm deletion
                        confirm_btn = await page.query_selector('[data-testid="confirmationSheetConfirm"]')
                        if confirm_btn:
                            await confirm_btn.click()
                            await asyncio.sleep(1)
                            
                            result.success = True
                            result.message = f"Deleted scheduled tweet {tweet_id}"
                            logger.info(result.message)
                            break
            
            if not result.success:
                result.error = f"Could not find scheduled tweet {tweet_id}"
                
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error deleting scheduled tweet: {e}")
        
        return result
    
    async def clear_scheduled_tweets(self) -> ActionResult:
        """
        Delete all scheduled tweets.
        
        Returns:
            ActionResult with count of deleted tweets
        """
        result = ActionResult(action="clear_scheduled", target="all")
        deleted_count = 0
        
        try:
            scheduled = await self.scheduled_tweets()
            
            for tweet in scheduled:
                delete_result = await self.delete_scheduled_tweet(tweet.id)
                if delete_result.success:
                    deleted_count += 1
                await asyncio.sleep(1)
            
            result.success = True
            result.message = f"Deleted {deleted_count} scheduled tweets"
            result.data = {"deleted_count": deleted_count}
            logger.info(result.message)
            
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error clearing scheduled tweets: {e}")
        
        return result
    
    async def draft_tweets(self, ascending: bool = True) -> list[DraftTweet]:
        """
        Get all draft tweets.
        
        Args:
            ascending: Sort by creation time ascending
            
        Returns:
            List of draft tweets
        """
        drafts = []
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to drafts page
            await page.goto(
                "https://twitter.com/compose/tweet/unsent/drafts",
                wait_until="networkidle"
            )
            await asyncio.sleep(2)
            
            # Get draft items
            draft_items = await page.query_selector_all('[data-testid="draftTweet"]')
            
            for item in draft_items:
                try:
                    # Get draft text
                    text_el = await item.query_selector('[data-testid="tweetText"]')
                    text = await text_el.inner_text() if text_el else ""
                    
                    # Get ID
                    draft_id = await item.get_attribute("data-draft-id") or str(len(drafts))
                    
                    draft = DraftTweet(
                        id=draft_id,
                        text=text,
                    )
                    drafts.append(draft)
                    
                except Exception as e:
                    logger.warning(f"Error parsing draft: {e}")
                    continue
            
            logger.info(f"Found {len(drafts)} draft tweets")
            
        except Exception as e:
            logger.error(f"Error getting draft tweets: {e}")
        
        return drafts
    
    async def delete_draft_tweet(self, draft_id: str) -> ActionResult:
        """
        Delete a draft tweet.
        
        Args:
            draft_id: ID of draft to delete
            
        Returns:
            ActionResult indicating success/failure
        """
        result = ActionResult(action="delete_draft", target=draft_id)
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to drafts
            await page.goto(
                "https://twitter.com/compose/tweet/unsent/drafts",
                wait_until="networkidle"
            )
            await asyncio.sleep(2)
            
            # Find and delete draft
            draft_items = await page.query_selector_all('[data-testid="draftTweet"]')
            
            for item in draft_items:
                item_id = await item.get_attribute("data-draft-id")
                if item_id == draft_id or str(len(draft_items)) == draft_id:
                    # Click to open
                    await item.click()
                    await asyncio.sleep(1)
                    
                    # Find delete option
                    delete_btn = await page.query_selector('[data-testid="unsentTweetDelete"]')
                    if delete_btn:
                        await delete_btn.click()
                        await asyncio.sleep(0.5)
                        
                        # Confirm
                        confirm_btn = await page.query_selector('[data-testid="confirmationSheetConfirm"]')
                        if confirm_btn:
                            await confirm_btn.click()
                            await asyncio.sleep(1)
                            
                            result.success = True
                            result.message = f"Deleted draft {draft_id}"
                            logger.info(result.message)
                            break
            
            if not result.success:
                result.error = f"Could not find draft {draft_id}"
                
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error deleting draft: {e}")
        
        return result
    
    async def clear_draft_tweets(self) -> ActionResult:
        """
        Delete all draft tweets.
        
        Returns:
            ActionResult with count of deleted drafts
        """
        result = ActionResult(action="clear_drafts", target="all")
        deleted_count = 0
        
        try:
            drafts = await self.draft_tweets()
            
            for draft in drafts:
                delete_result = await self.delete_draft_tweet(draft.id)
                if delete_result.success:
                    deleted_count += 1
                await asyncio.sleep(1)
            
            result.success = True
            result.message = f"Deleted {deleted_count} drafts"
            result.data = {"deleted_count": deleted_count}
            logger.info(result.message)
            
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error clearing drafts: {e}")
        
        return result


__all__ = [
    "ScheduledTweet",
    "DraftTweet",
    "SchedulingActions",
]

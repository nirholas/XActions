"""
Poll creation and management.

Supports creating polls with up to 4 options.
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
class Poll:
    """
    Represents a Twitter poll.
    
    Attributes:
        id: Poll ID
        tweet_id: ID of tweet containing poll
        question: Poll question (tweet text)
        options: List of poll options
        duration_minutes: Poll duration in minutes
        end_time: When the poll ends
        total_votes: Total number of votes
        votes_by_option: Votes per option
    """
    
    id: str = ""
    tweet_id: str = ""
    question: str = ""
    options: list[str] = field(default_factory=list)
    duration_minutes: int = 1440  # 24 hours default
    end_time: datetime | None = None
    total_votes: int = 0
    votes_by_option: list[int] = field(default_factory=list)
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "tweet_id": self.tweet_id,
            "question": self.question,
            "options": self.options,
            "duration_minutes": self.duration_minutes,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "total_votes": self.total_votes,
            "votes_by_option": self.votes_by_option,
        }


class PollActions(BaseAction):
    """
    Actions for creating and managing polls.
    """
    
    # Valid durations in minutes
    VALID_DURATIONS = [5, 30, 60, 360, 720, 1440, 2880, 4320, 7200, 10080]  # 5min to 7 days
    
    def __init__(
        self,
        browser_manager: BrowserManager,
        rate_limiter: RateLimiter | None = None,
    ):
        super().__init__(browser_manager, rate_limiter)
    
    async def create_poll(
        self,
        text: str,
        options: list[str],
        duration_minutes: int = 1440,
    ) -> ActionResult:
        """
        Create a poll tweet.
        
        Args:
            text: Poll question/tweet text
            options: List of poll options (2-4 options)
            duration_minutes: Poll duration (5 min to 7 days)
            
        Returns:
            ActionResult with poll details
        """
        result = ActionResult(action="create_poll", target=text[:50])
        
        # Validate options
        if len(options) < 2:
            result.error = "Poll must have at least 2 options"
            return result
        
        if len(options) > 4:
            result.error = "Poll can have at most 4 options"
            return result
        
        # Validate duration
        valid_duration = min(self.VALID_DURATIONS, key=lambda x: abs(x - duration_minutes))
        if valid_duration != duration_minutes:
            logger.warning(f"Adjusted poll duration from {duration_minutes} to {valid_duration} minutes")
            duration_minutes = valid_duration
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to compose
            await page.goto("https://twitter.com/compose/tweet", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Enter tweet text
            text_input = await page.query_selector('[data-testid="tweetTextarea_0"]')
            if text_input:
                await text_input.fill(text)
                await asyncio.sleep(0.5)
            
            # Click poll button
            poll_btn = await page.query_selector('[data-testid="pollButton"]')
            if not poll_btn:
                poll_btn = await page.query_selector('[aria-label*="Poll"]')
            
            if not poll_btn:
                result.error = "Could not find poll button - polls may not be available"
                return result
            
            await poll_btn.click()
            await asyncio.sleep(1)
            
            # Fill in poll options
            for i, option in enumerate(options):
                option_input = await page.query_selector(f'[data-testid="pollOption{i}"]')
                if not option_input:
                    option_input = await page.query_selector(f'input[placeholder*="Choice {i + 1}"]')
                
                if option_input:
                    await option_input.fill(option)
                    await asyncio.sleep(0.3)
                elif i < 2:
                    # First two options are required
                    result.error = f"Could not find input for option {i + 1}"
                    return result
            
            # Set duration
            duration_btn = await page.query_selector('[data-testid="pollDuration"]')
            if duration_btn:
                await duration_btn.click()
                await asyncio.sleep(0.5)
                
                # Calculate days and hours
                days = duration_minutes // 1440
                hours = (duration_minutes % 1440) // 60
                minutes = duration_minutes % 60
                
                # Set days
                days_input = await page.query_selector('[data-testid="pollDurationDays"]')
                if days_input:
                    await days_input.fill(str(days))
                
                # Set hours
                hours_input = await page.query_selector('[data-testid="pollDurationHours"]')
                if hours_input:
                    await hours_input.fill(str(hours))
                
                # Set minutes
                mins_input = await page.query_selector('[data-testid="pollDurationMinutes"]')
                if mins_input:
                    await mins_input.fill(str(minutes))
            
            # Submit tweet with poll
            submit_btn = await page.query_selector('[data-testid="tweetButton"]')
            if submit_btn:
                await submit_btn.click()
                await asyncio.sleep(2)
                
                # Try to get the created tweet URL
                current_url = page.url
                
                result.success = True
                result.message = f"Created poll with {len(options)} options"
                result.data = {
                    "question": text,
                    "options": options,
                    "duration_minutes": duration_minutes,
                }
                logger.info(result.message)
            else:
                result.error = "Could not find submit button"
                
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error creating poll: {e}")
        
        return result
    
    async def vote(
        self,
        tweet_url: str,
        option_index: int,
    ) -> ActionResult:
        """
        Vote on a poll.
        
        Args:
            tweet_url: URL of tweet containing poll
            option_index: Index of option to vote for (0-based)
            
        Returns:
            ActionResult indicating success/failure
        """
        result = ActionResult(action="vote_poll", target=tweet_url)
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to tweet
            await page.goto(tweet_url, wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Find poll options
            poll_options = await page.query_selector_all('[data-testid="pollOption"]')
            
            if not poll_options:
                result.error = "No poll found in tweet"
                return result
            
            if option_index >= len(poll_options):
                result.error = f"Invalid option index {option_index}, poll has {len(poll_options)} options"
                return result
            
            # Click the option
            await poll_options[option_index].click()
            await asyncio.sleep(1)
            
            # Click vote button if separate
            vote_btn = await page.query_selector('[data-testid="pollVoteButton"]')
            if vote_btn:
                await vote_btn.click()
                await asyncio.sleep(1)
            
            result.success = True
            result.message = f"Voted for option {option_index + 1}"
            logger.info(result.message)
            
        except Exception as e:
            result.success = False
            result.error = str(e)
            logger.error(f"Error voting on poll: {e}")
        
        return result
    
    async def get_poll_results(self, tweet_url: str) -> Poll | None:
        """
        Get results of a poll.
        
        Args:
            tweet_url: URL of tweet containing poll
            
        Returns:
            Poll object with results, or None if not found
        """
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to tweet
            await page.goto(tweet_url, wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Get poll container
            poll_container = await page.query_selector('[data-testid="poll"]')
            if not poll_container:
                logger.warning("No poll found in tweet")
                return None
            
            # Get question (tweet text)
            question_el = await page.query_selector('[data-testid="tweetText"]')
            question = await question_el.inner_text() if question_el else ""
            
            # Get options and their votes
            options = []
            votes = []
            
            option_els = await poll_container.query_selector_all('[data-testid="pollOption"]')
            for opt in option_els:
                # Get option text
                text_el = await opt.query_selector('span')
                text = await text_el.inner_text() if text_el else ""
                options.append(text)
                
                # Get vote percentage/count
                vote_el = await opt.query_selector('[data-testid="pollVoteCount"]')
                vote_text = await vote_el.inner_text() if vote_el else "0"
                # Parse "25%" or "1,234 votes" format
                import re
                match = re.search(r'([\d,]+)', vote_text)
                vote_count = int(match.group(1).replace(',', '')) if match else 0
                votes.append(vote_count)
            
            # Get total votes
            total_el = await poll_container.query_selector('[data-testid="pollTotalVotes"]')
            total_text = await total_el.inner_text() if total_el else "0"
            import re
            match = re.search(r'([\d,]+)', total_text)
            total_votes = int(match.group(1).replace(',', '')) if match else sum(votes)
            
            poll = Poll(
                question=question,
                options=options,
                total_votes=total_votes,
                votes_by_option=votes,
            )
            
            return poll
            
        except Exception as e:
            logger.error(f"Error getting poll results: {e}")
            return None


__all__ = [
    "Poll",
    "PollActions",
]

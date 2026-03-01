"""
Tweets scraper for user timelines.

Scrapes tweets from a user's profile timeline.
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Callable

from loguru import logger

from xeepy.core.selectors import Selectors
from xeepy.core.utils import extract_username, extract_tweet_id, parse_count
from xeepy.models.tweet import Tweet
from xeepy.models.user import User
from xeepy.scrapers.base import BaseScraper, ScrapeResult


class TweetsScraper(BaseScraper):
    """
    Scraper for X/Twitter user timelines.
    
    Extracts tweets from a user's profile including:
    - Tweet text and media
    - Engagement metrics (likes, retweets, replies)
    - Timestamps
    - Reply/retweet status
    
    Example:
        >>> async with BrowserManager() as browser:
        ...     scraper = TweetsScraper(browser)
        ...     result = await scraper.scrape("elonmusk", limit=50)
        ...     for tweet in result.items:
        ...         print(f"{tweet.likes} likes: {tweet.text[:50]}...")
    """
    
    async def scrape(
        self,
        target: str,
        limit: int = 100,
        on_progress: Callable[[int, int], None] | None = None,
        include_replies: bool = False,
        include_retweets: bool = True,
        **kwargs,
    ) -> ScrapeResult[Tweet]:
        """
        Scrape tweets from a user's timeline.
        
        Args:
            target: Username (with or without @) or profile URL.
            limit: Maximum number of tweets to collect.
            on_progress: Progress callback (current_count, limit).
            include_replies: Whether to include replies (requires /with_replies tab).
            include_retweets: Whether to include retweets.
            **kwargs: Additional options.
            
        Returns:
            ScrapeResult containing Tweet objects.
        """
        result = ScrapeResult[Tweet](target=target)
        self.reset()
        
        # Normalize target to username
        if target.startswith("http"):
            username = extract_username(target)
            if not username:
                result.error = f"Could not extract username from URL: {target}"
                return result
        else:
            username = target.lstrip("@")
        
        # Build URL based on options
        if include_replies:
            profile_url = f"https://x.com/{username}/with_replies"
        else:
            profile_url = f"https://x.com/{username}"
        
        try:
            logger.info(f"Scraping tweets from @{username} (limit: {limit})")
            
            # Navigate to profile
            await self.browser.navigate(profile_url)
            
            # Wait for tweets to load
            loaded = await self._wait_for_content(
                Selectors.TWEET,
                timeout=15000,
            )
            
            if not loaded:
                error = await self._check_for_error_states()
                if error:
                    result.error = error
                    return result
                    
                empty = await self._check_empty_timeline()
                if empty:
                    result.items = []
                    result.total_found = 0
                    result.completed_at = datetime.now()
                    return result
                    
                result.error = "Timeline failed to load"
                return result
            
            # Store username for author context
            self._current_username = username
            self._include_retweets = include_retweets
            
            # Scroll and collect tweets
            items = await self._scroll_and_collect(
                selector=Selectors.TWEET,
                extractor=self._extract_item,
                limit=limit,
                id_key="id",
                on_progress=on_progress,
            )
            
            # Convert to Tweet objects
            tweets = [Tweet.from_dict(item) for item in items]
            
            result.items = tweets
            result.total_found = len(tweets)
            self.results = tweets
            
            logger.info(f"Collected {len(tweets)} tweets")
            
        except Exception as e:
            logger.error(f"Tweets scraping error: {e}")
            result.error = str(e)
        finally:
            result.completed_at = datetime.now()
        
        return result
    
    async def _extract_item(self, element: Any) -> dict[str, Any] | None:
        """
        Extract tweet data from a tweet element.
        
        Args:
            element: Playwright locator for the tweet.
            
        Returns:
            Dict with tweet data or None if extraction fails.
        """
        try:
            # Get tweet ID from link
            tweet_id = ""
            try:
                time_link = element.locator('a[href*="/status/"] time').first
                if await time_link.count() > 0:
                    parent_link = element.locator('a[href*="/status/"]').first
                    href = await parent_link.get_attribute("href")
                    if href:
                        tweet_id = extract_tweet_id(href) or ""
            except Exception:
                pass
            
            if not tweet_id:
                return None
            
            # Check if it's a retweet
            is_retweet = False
            retweeted_by = ""
            try:
                social_context = element.locator('[data-testid="socialContext"]')
                if await social_context.count() > 0:
                    context_text = await social_context.inner_text()
                    if "reposted" in context_text.lower() or "retweeted" in context_text.lower():
                        is_retweet = True
                        retweeted_by = context_text.split(" ")[0]
            except Exception:
                pass
            
            # Skip retweets if not included
            if is_retweet and hasattr(self, '_include_retweets') and not self._include_retweets:
                return None
            
            # Author info
            author_username = ""
            author_display_name = ""
            try:
                user_name = element.locator(Selectors.TWEET_AUTHOR)
                if await user_name.count() > 0:
                    # Get username from link
                    user_link = user_name.locator('a[href^="/"]').first
                    if await user_link.count() > 0:
                        href = await user_link.get_attribute("href")
                        if href:
                            author_username = href.strip("/").split("/")[0]
                    
                    # Get display name
                    name_span = user_name.locator('span').first
                    if await name_span.count() > 0:
                        author_display_name = await name_span.inner_text()
            except Exception:
                pass
            
            # Tweet text
            text = ""
            try:
                text_element = element.locator(Selectors.TWEET_TEXT)
                if await text_element.count() > 0:
                    text = await text_element.inner_text()
            except Exception:
                pass
            
            # Timestamp
            timestamp = None
            try:
                time_element = element.locator('time')
                if await time_element.count() > 0:
                    datetime_str = await time_element.get_attribute("datetime")
                    if datetime_str:
                        timestamp = datetime.fromisoformat(datetime_str.replace("Z", "+00:00"))
            except Exception:
                pass
            
            # Engagement counts
            likes = await self._extract_count(element, '[data-testid="like"] span')
            retweets = await self._extract_count(element, '[data-testid="retweet"] span')
            replies = await self._extract_count(element, '[data-testid="reply"] span')
            
            # Views
            views = 0
            try:
                analytics_link = element.locator('a[href*="/analytics"]')
                if await analytics_link.count() > 0:
                    views_text = await analytics_link.inner_text()
                    views = parse_count(views_text)
            except Exception:
                pass
            
            # Media URLs
            media = []
            media_types = []
            try:
                # Images
                images = element.locator('[data-testid="tweetPhoto"] img')
                for i in range(await images.count()):
                    img = images.nth(i)
                    src = await img.get_attribute("src")
                    if src and "profile_images" not in src:
                        media.append(src)
                        media_types.append("image")
                
                # Videos
                videos = element.locator('[data-testid="videoPlayer"]')
                if await videos.count() > 0:
                    media_types.append("video")
            except Exception:
                pass
            
            # Check if it's a reply
            is_reply = False
            reply_to_user = ""
            try:
                reply_context = element.locator('text="Replying to"')
                if await reply_context.count() > 0:
                    is_reply = True
                    reply_link = element.locator('a[href^="/"]').first
                    if await reply_link.count() > 0:
                        href = await reply_link.get_attribute("href")
                        if href:
                            reply_to_user = href.strip("/")
            except Exception:
                pass
            
            # Check for quote tweet
            is_quote = False
            try:
                quote_tweet = element.locator('[data-testid="tweet"] [data-testid="tweet"]')
                if await quote_tweet.count() > 0:
                    is_quote = True
            except Exception:
                pass
            
            # Author user object
            author = {
                "id": "",
                "username": author_username,
                "display_name": author_display_name,
            }
            
            return {
                "id": tweet_id,
                "author": author,
                "text": text,
                "timestamp": timestamp.isoformat() if timestamp else None,
                "likes": likes,
                "retweets": retweets,
                "replies": replies,
                "views": views,
                "media": media,
                "media_types": media_types,
                "is_retweet": is_retweet,
                "is_quote": is_quote,
                "is_reply": is_reply,
                "reply_to_user": reply_to_user,
            }
            
        except Exception as e:
            logger.debug(f"Error extracting tweet: {e}")
            return None
    
    async def _check_empty_timeline(self) -> bool:
        """Check if the timeline is empty."""
        try:
            empty_indicators = [
                Selectors.EMPTY_STATE,
                'text="hasn\'t posted"',
                'text="No posts yet"',
            ]
            
            for indicator in empty_indicators:
                element = self.browser.page.locator(indicator)
                if await element.count() > 0:
                    return True
        except Exception:
            pass
        return False

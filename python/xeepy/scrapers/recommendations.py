"""
Recommendations and trends scraper.

Supports:
- Recommended users based on user/interests
- Global and local trends
- Trends by UTC offset
- Explore page content
"""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from loguru import logger

from xeepy.core.browser import BrowserManager
from xeepy.core.rate_limiter import RateLimiter
from xeepy.scrapers.base import BaseScraper, ScrapeResult
from xeepy.models.user import User


@dataclass
class Trend:
    """
    Represents a trending topic.
    
    Attributes:
        name: Trend name/hashtag
        url: URL to trend search
        tweet_count: Number of tweets
        description: Trend description/context
        category: Trend category (if any)
        location: Geographic location (if localized)
        promoted: Whether this is a promoted trend
    """
    
    name: str
    url: str = ""
    tweet_count: int = 0
    description: str = ""
    category: str = ""
    location: str = ""
    promoted: bool = False
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "url": self.url,
            "tweet_count": self.tweet_count,
            "description": self.description,
            "category": self.category,
            "location": self.location,
            "promoted": self.promoted,
        }


@dataclass
class RecommendedUser:
    """
    Represents a recommended user.
    
    Attributes:
        user: User object with profile info
        reason: Why this user is recommended
        mutual_followers: List of mutual followers
        context: Additional context about recommendation
    """
    
    user: User
    reason: str = ""
    mutual_followers: list[str] = field(default_factory=list)
    context: str = ""
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "user": self.user.to_dict(),
            "reason": self.reason,
            "mutual_followers": self.mutual_followers,
            "context": self.context,
        }


class RecommendationsScraper(BaseScraper):
    """
    Scraper for recommendations and trends.
    
    Provides access to Twitter's recommendation engine
    and trending topics.
    """
    
    def __init__(
        self,
        browser_manager: BrowserManager,
        rate_limiter: RateLimiter | None = None,
    ):
        super().__init__(browser_manager, rate_limiter)
    
    async def scrape(self, **kwargs) -> ScrapeResult:
        """Base scrape method - use specific methods instead."""
        raise NotImplementedError("Use specific methods: trends(), recommended_users()")
    
    async def trends(
        self,
        location: str | None = None,
        utc_offset: int | None = None,
    ) -> ScrapeResult[Trend]:
        """
        Get trending topics.
        
        Args:
            location: Location name for localized trends
            utc_offset: UTC offset for time-based trends (-12 to +14)
            
        Returns:
            ScrapeResult containing Trend objects
        """
        result = ScrapeResult[Trend](target="trends")
        
        try:
            page = await self.browser_manager.get_page()
            
            # Navigate to explore/trends
            await page.goto("https://twitter.com/explore/tabs/trending", wait_until="networkidle")
            await asyncio.sleep(2)
            
            # If location specified, try to change it
            if location:
                settings_btn = await page.query_selector('[aria-label="Settings"]')
                if settings_btn:
                    await settings_btn.click()
                    await asyncio.sleep(1)
                    
                    # Find location input
                    location_input = await page.query_selector('[data-testid="locationInput"]')
                    if location_input:
                        await location_input.fill(location)
                        await asyncio.sleep(1)
                        
                        # Select first result
                        location_option = await page.query_selector('[data-testid="locationOption"]')
                        if location_option:
                            await location_option.click()
                            await asyncio.sleep(2)
            
            # Get trend items
            trend_items = await page.query_selector_all('[data-testid="trend"]')
            
            for item in trend_items:
                try:
                    # Get trend name
                    name_el = await item.query_selector('[data-testid="trendName"]')
                    if not name_el:
                        name_el = await item.query_selector('span')
                    name = await name_el.inner_text() if name_el else ""
                    
                    if not name:
                        continue
                    
                    # Get URL
                    link = await item.query_selector('a')
                    href = await link.get_attribute("href") if link else ""
                    url = f"https://twitter.com{href}" if href else ""
                    
                    # Get tweet count
                    count_el = await item.query_selector('[data-testid="trendMetric"]')
                    tweet_count = 0
                    if count_el:
                        count_text = await count_el.inner_text()
                        # Parse "10.5K Tweets" format
                        match = re.search(r'([\d.]+)([KMB])?', count_text)
                        if match:
                            num = float(match.group(1))
                            multiplier = match.group(2)
                            if multiplier == 'K':
                                num *= 1000
                            elif multiplier == 'M':
                                num *= 1000000
                            elif multiplier == 'B':
                                num *= 1000000000
                            tweet_count = int(num)
                    
                    # Get category
                    category_el = await item.query_selector('[data-testid="trendCategory"]')
                    category = await category_el.inner_text() if category_el else ""
                    
                    # Check if promoted
                    promoted_el = await item.query_selector('[data-testid="promotedIndicator"]')
                    promoted = promoted_el is not None
                    
                    # Get description
                    desc_el = await item.query_selector('[data-testid="trendDescription"]')
                    description = await desc_el.inner_text() if desc_el else ""
                    
                    trend = Trend(
                        name=name,
                        url=url,
                        tweet_count=tweet_count,
                        description=description,
                        category=category,
                        location=location or "",
                        promoted=promoted,
                    )
                    result.items.append(trend)
                    
                except Exception as e:
                    logger.warning(f"Error parsing trend: {e}")
                    continue
            
            result.total_found = len(result.items)
            result.completed_at = datetime.now()
            
            logger.info(f"Found {len(result.items)} trends")
            
        except Exception as e:
            logger.error(f"Error getting trends: {e}")
            result.error = str(e)
            result.completed_at = datetime.now()
        
        return result
    
    async def recommended_users(
        self,
        based_on: list[str] | None = None,
        limit: int = 20,
    ) -> ScrapeResult[RecommendedUser]:
        """
        Get recommended users to follow.
        
        Args:
            based_on: List of usernames to base recommendations on
            limit: Maximum number of recommendations
            
        Returns:
            ScrapeResult containing RecommendedUser objects
        """
        result = ScrapeResult[RecommendedUser](target="recommended_users")
        
        try:
            page = await self.browser_manager.get_page()
            
            if based_on:
                # Get recommendations based on specific user
                username = based_on[0]
                await page.goto(
                    f"https://twitter.com/{username}/followers_you_follow",
                    wait_until="networkidle"
                )
            else:
                # Get general recommendations from connect page
                await page.goto("https://twitter.com/i/connect_people", wait_until="networkidle")
            
            await asyncio.sleep(2)
            
            # Scroll to load more
            for _ in range(3):
                await page.evaluate("window.scrollBy(0, 1000)")
                await asyncio.sleep(1)
                
                if len(result.items) >= limit:
                    break
            
            # Get user cells
            user_cells = await page.query_selector_all('[data-testid="UserCell"]')
            
            for cell in user_cells[:limit]:
                try:
                    # Get username
                    username_el = await cell.query_selector('[data-testid="UserName"]')
                    if not username_el:
                        continue
                    
                    # Get the link to extract username
                    link = await cell.query_selector('a[href^="/"]')
                    href = await link.get_attribute("href") if link else ""
                    username = href.split("/")[-1] if href else ""
                    
                    # Get display name
                    name_spans = await username_el.query_selector_all('span')
                    display_name = ""
                    for span in name_spans:
                        text = await span.inner_text()
                        if text and not text.startswith("@"):
                            display_name = text
                            break
                    
                    # Get bio
                    bio_el = await cell.query_selector('[data-testid="UserDescription"]')
                    bio = await bio_el.inner_text() if bio_el else ""
                    
                    # Get avatar
                    avatar_el = await cell.query_selector('img[src*="profile_images"]')
                    avatar = await avatar_el.get_attribute("src") if avatar_el else ""
                    
                    # Get reason for recommendation
                    reason_el = await cell.query_selector('[data-testid="socialContext"]')
                    reason = await reason_el.inner_text() if reason_el else ""
                    
                    # Check for verified
                    verified_el = await cell.query_selector('[data-testid="icon-verified"]')
                    is_verified = verified_el is not None
                    
                    user = User(
                        id="",
                        username=username,
                        display_name=display_name,
                        bio=bio,
                        avatar_url=avatar,
                        is_verified=is_verified,
                    )
                    
                    rec = RecommendedUser(
                        user=user,
                        reason=reason,
                    )
                    result.items.append(rec)
                    
                except Exception as e:
                    logger.warning(f"Error parsing recommended user: {e}")
                    continue
            
            result.total_found = len(result.items)
            result.completed_at = datetime.now()
            
            logger.info(f"Found {len(result.items)} recommended users")
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {e}")
            result.error = str(e)
            result.completed_at = datetime.now()
        
        return result
    
    async def explore(
        self,
        tab: str = "for-you",
        limit: int = 50,
    ) -> ScrapeResult:
        """
        Get content from the Explore page.
        
        Args:
            tab: Explore tab (for-you, trending, news, sports, entertainment)
            limit: Maximum items to return
            
        Returns:
            ScrapeResult with mixed content (tweets, trends, users)
        """
        result = ScrapeResult(target=f"explore/{tab}")
        
        try:
            page = await self.browser_manager.get_page()
            
            # Map tab names to URLs
            tab_urls = {
                "for-you": "https://twitter.com/explore",
                "trending": "https://twitter.com/explore/tabs/trending",
                "news": "https://twitter.com/explore/tabs/news",
                "sports": "https://twitter.com/explore/tabs/sports",
                "entertainment": "https://twitter.com/explore/tabs/entertainment",
            }
            
            url = tab_urls.get(tab, tab_urls["for-you"])
            await page.goto(url, wait_until="networkidle")
            await asyncio.sleep(2)
            
            # Scroll to load content
            for _ in range(3):
                await page.evaluate("window.scrollBy(0, 1000)")
                await asyncio.sleep(1)
            
            # Get all items (mix of tweets, trends, etc.)
            items = []
            
            # Get tweets
            tweets = await page.query_selector_all('[data-testid="tweet"]')
            for tweet in tweets[:limit]:
                try:
                    text_el = await tweet.query_selector('[data-testid="tweetText"]')
                    text = await text_el.inner_text() if text_el else ""
                    items.append({"type": "tweet", "text": text})
                except:
                    continue
            
            # Get trends
            trends = await page.query_selector_all('[data-testid="trend"]')
            for trend in trends:
                try:
                    name_el = await trend.query_selector('span')
                    name = await name_el.inner_text() if name_el else ""
                    items.append({"type": "trend", "name": name})
                except:
                    continue
            
            result.items = items[:limit]
            result.total_found = len(items)
            result.completed_at = datetime.now()
            
            logger.info(f"Found {len(result.items)} items in explore/{tab}")
            
        except Exception as e:
            logger.error(f"Error getting explore content: {e}")
            result.error = str(e)
            result.completed_at = datetime.now()
        
        return result


# Convenience functions
async def get_trends(
    browser_manager: BrowserManager,
    location: str | None = None,
) -> list[Trend]:
    """Get current trending topics."""
    scraper = RecommendationsScraper(browser_manager)
    result = await scraper.trends(location=location)
    return result.items


async def get_recommended_users(
    browser_manager: BrowserManager,
    based_on: list[str] | None = None,
) -> list[RecommendedUser]:
    """Get recommended users to follow."""
    scraper = RecommendationsScraper(browser_manager)
    result = await scraper.recommended_users(based_on=based_on)
    return result.items

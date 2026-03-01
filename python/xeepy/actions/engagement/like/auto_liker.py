"""
Auto Liker Action

Continuously auto-like tweets based on configurable criteria.
"""

import asyncio
import random
import time
from typing import Callable, Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import LikeResult, AutoLikeConfig, TweetElement


class AutoLiker(BaseAction):
    """
    Automatically like tweets based on configurable criteria.
    
    Can run continuously or for a set duration.
    
    Usage:
        config = AutoLikeConfig(
            keywords=["python", "programming"],
            max_likes_per_session=50,
            delay_range=(3, 8)
        )
        
        auto_liker = AutoLiker(browser, rate_limiter)
        result = await auto_liker.execute(
            config=config,
            duration_minutes=30,
            on_like=lambda t: print(f"Liked: {t.text[:50]}")
        )
    """
    
    SELECTORS = {
        "tweet_article": 'article[data-testid="tweet"]',
        "like_button": '[data-testid="like"]',
        "unlike_button": '[data-testid="unlike"]',
        "tweet_text": '[data-testid="tweetText"]',
        "user_name": '[data-testid="User-Name"]',
        "home_timeline": '[data-testid="primaryColumn"]',
        "tab_latest": '[role="tab"]:has-text("Latest")',
    }
    
    SEARCH_URL = "https://x.com/search"
    HOME_URL = "https://x.com/home"
    
    def __init__(
        self,
        browser: BrowserManager,
        rate_limiter: Optional[RateLimiter] = None,
        dry_run: bool = False,
    ):
        self.browser = browser
        self.rate_limiter = rate_limiter
        self.dry_run = dry_run
        self._cancelled = False
        self._paused = False
        self._liked_tweets: set = set()
        self._session_likes = 0
        self._hourly_likes = 0
        self._hour_start = time.time()
    
    async def execute(
        self,
        config: AutoLikeConfig,
        duration_minutes: int = 30,
        on_like: Optional[Callable] = None,
        on_skip: Optional[Callable] = None,
    ) -> LikeResult:
        """
        Run auto-liker for specified duration.
        
        Args:
            config: Liking criteria and limits
            duration_minutes: How long to run (0 for unlimited)
            on_like: Callback when tweet liked
            on_skip: Callback when tweet skipped
            
        Returns:
            LikeResult with summary
        """
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60) if duration_minutes > 0 else float('inf')
        result = LikeResult()
        
        self._cancelled = False
        self._paused = False
        self._liked_tweets.clear()
        self._session_likes = 0
        self._hourly_likes = 0
        self._hour_start = time.time()
        
        logger.info(
            f"Starting auto-liker for {duration_minutes} minutes "
            f"(max {config.max_likes_per_session} likes)"
        )
        
        try:
            while not self._cancelled and time.time() < end_time:
                # Check session limit
                if self._session_likes >= config.max_likes_per_session:
                    logger.info("Session limit reached")
                    break
                
                # Check hourly limit
                self._check_hourly_limit(config)
                if self._paused:
                    await asyncio.sleep(60)
                    continue
                
                # Determine search source
                source = self._choose_source(config)
                
                # Navigate to source
                await self._navigate_to_source(source, config)
                await asyncio.sleep(2)
                
                # Process tweets
                likes_this_round = await self._process_feed(
                    config=config,
                    result=result,
                    on_like=on_like,
                    on_skip=on_skip,
                )
                
                if likes_this_round == 0:
                    # No tweets found, scroll or change source
                    await self._scroll_down()
                    await asyncio.sleep(random.uniform(2, 5))
                
                # Random delay between rounds
                delay = random.uniform(*config.delay_range)
                logger.debug(f"Waiting {delay:.1f}s before next round")
                await asyncio.sleep(delay)
        
        except Exception as e:
            logger.error(f"Auto-liker error: {e}")
            result.errors.append(str(e))
        
        result.duration_seconds = time.time() - start_time
        result.cancelled = self._cancelled
        
        logger.info(
            f"Auto-liker finished: {result.success_count} liked, "
            f"{result.failed_count} failed, {result.skipped_count} skipped "
            f"in {result.duration_seconds/60:.1f} minutes"
        )
        
        return result
    
    async def _process_feed(
        self,
        config: AutoLikeConfig,
        result: LikeResult,
        on_like: Optional[Callable],
        on_skip: Optional[Callable],
    ) -> int:
        """Process visible tweets in current feed."""
        likes_this_round = 0
        tweets = await self._get_visible_tweets()
        
        for tweet_element in tweets:
            if self._cancelled:
                break
            
            if self._session_likes >= config.max_likes_per_session:
                break
            
            tweet = await self._parse_tweet_element(tweet_element)
            if not tweet:
                continue
            
            tweet_id = tweet.tweet_url or id(tweet_element)
            if tweet_id in self._liked_tweets:
                continue
            
            self._liked_tweets.add(tweet_id)
            
            # Check if should like
            should_like, reason = await self._should_like(tweet, config)
            
            if not should_like:
                result.skipped_count += 1
                result.skipped_tweets.append(str(tweet_id))
                logger.debug(f"Skipping: {reason}")
                if on_skip:
                    await self._safe_callback(on_skip, tweet, reason)
                continue
            
            # Check if already liked
            if await self._is_already_liked(tweet_element):
                result.skipped_count += 1
                continue
            
            # Random like probability
            if random.random() > config.like_probability:
                result.skipped_count += 1
                continue
            
            # Rate limiting
            if self.rate_limiter:
                await self.rate_limiter.wait()
            
            # Perform like
            success = await self._like_tweet(tweet_element)
            
            if success:
                result.success_count += 1
                result.liked_tweets.append(tweet.tweet_url or str(tweet_id))
                self._session_likes += 1
                self._hourly_likes += 1
                likes_this_round += 1
                
                logger.info(
                    f"[{self._session_likes}/{config.max_likes_per_session}] "
                    f"Liked: {tweet.text[:50] if tweet.text else 'No text'}..."
                )
                
                if on_like:
                    await self._safe_callback(on_like, tweet)
                
                if self.rate_limiter:
                    self.rate_limiter.record_success()
                
                # Optional: also retweet
                if config.also_retweet and random.random() < 0.3:
                    await self._retweet_tweet(tweet_element)
                
                # Optional: also bookmark
                if config.also_bookmark and random.random() < 0.5:
                    await self._bookmark_tweet(tweet_element)
                
                # Delay between likes
                await asyncio.sleep(random.uniform(1, 3))
            else:
                result.failed_count += 1
                result.failed_tweets.append(str(tweet_id))
                if self.rate_limiter:
                    self.rate_limiter.record_error()
        
        return likes_this_round
    
    async def _should_like(
        self,
        tweet: TweetElement,
        config: AutoLikeConfig,
    ) -> tuple[bool, str]:
        """
        Determine if tweet should be liked.
        
        Returns:
            (should_like, reason)
        """
        # Check retweet/reply exclusions
        if config.exclude_retweets and tweet.is_retweet:
            return False, "is retweet"
        
        if config.exclude_replies and tweet.is_reply:
            return False, "is reply"
        
        # Check text requirement
        if config.require_text and not tweet.has_text:
            return False, "no text"
        
        # Check media-only exclusion
        if config.exclude_media_only and tweet.has_media and not tweet.has_text:
            return False, "media only"
        
        # Check engagement limits
        if tweet.likes_count < config.min_likes:
            return False, f"too few likes ({tweet.likes_count})"
        
        if tweet.likes_count > config.max_likes:
            return False, f"too many likes ({tweet.likes_count})"
        
        # Check author followers
        if tweet.author_followers is not None:
            if tweet.author_followers < config.min_followers:
                return False, "author has too few followers"
        
        # Check blocked users
        if tweet.author_username:
            username_lower = tweet.author_username.lower()
            for blocked in config.blocked_users:
                if blocked.lower() == username_lower:
                    return False, f"blocked user: {blocked}"
        
        # Check blocked keywords
        if tweet.text:
            text_lower = tweet.text.lower()
            for keyword in config.blocked_keywords:
                if keyword.lower() in text_lower:
                    return False, f"blocked keyword: {keyword}"
        
        # Check from_users (always like these users)
        if config.from_users and tweet.author_username:
            username_lower = tweet.author_username.lower()
            if username_lower in [u.lower() for u in config.from_users]:
                return True, "from favorite user"
        
        # Check keywords match
        if config.keywords and tweet.text:
            text_lower = tweet.text.lower()
            if any(kw.lower() in text_lower for kw in config.keywords):
                return True, "keyword match"
        
        # Check hashtag match
        if config.hashtags and tweet.hashtags:
            tweet_tags = [h.lower() for h in tweet.hashtags]
            config_tags = [h.lower().lstrip("#") for h in config.hashtags]
            if any(tag in tweet_tags for tag in config_tags):
                return True, "hashtag match"
        
        # If no specific targeting, allow all
        if not config.keywords and not config.hashtags and not config.from_users:
            return True, "no targeting (allow all)"
        
        return False, "no match"
    
    def _check_hourly_limit(self, config: AutoLikeConfig):
        """Check and reset hourly limits."""
        current_time = time.time()
        if current_time - self._hour_start >= 3600:
            self._hourly_likes = 0
            self._hour_start = current_time
            self._paused = False
        elif self._hourly_likes >= config.max_likes_per_hour:
            wait_time = 3600 - (current_time - self._hour_start)
            logger.warning(f"Hourly limit reached, waiting {wait_time/60:.1f} minutes")
            self._paused = True
    
    def _choose_source(self, config: AutoLikeConfig) -> str:
        """Choose a source to browse for tweets."""
        sources = []
        
        if config.keywords:
            sources.append("keyword_search")
        if config.hashtags:
            sources.append("hashtag_search")
        if config.from_users:
            sources.append("user_profile")
        
        if not sources:
            sources.append("home_timeline")
        
        return random.choice(sources)
    
    async def _navigate_to_source(self, source: str, config: AutoLikeConfig):
        """Navigate to the chosen source."""
        if source == "home_timeline":
            await self.browser.goto(self.HOME_URL)
        
        elif source == "keyword_search":
            keyword = random.choice(config.keywords)
            url = f"{self.SEARCH_URL}?q={keyword}&src=typed_query&f=live"
            await self.browser.goto(url)
        
        elif source == "hashtag_search":
            hashtag = random.choice(config.hashtags).lstrip("#")
            url = f"{self.SEARCH_URL}?q=%23{hashtag}&src=typed_query&f=live"
            await self.browser.goto(url)
        
        elif source == "user_profile":
            user = random.choice(config.from_users).lstrip("@")
            await self.browser.goto(f"https://x.com/{user}")
    
    async def _get_visible_tweets(self) -> list:
        """Get visible tweets."""
        page = self._get_page()
        if not page:
            return []
        try:
            return await page.query_selector_all(self.SELECTORS["tweet_article"])
        except Exception:
            return []
    
    async def _parse_tweet_element(self, element) -> Optional[TweetElement]:
        """Parse tweet element into TweetElement."""
        try:
            tweet = TweetElement()
            
            # Get text
            text_el = await element.query_selector('[data-testid="tweetText"]')
            if text_el:
                tweet.text = await text_el.text_content()
                tweet.has_text = bool(tweet.text and tweet.text.strip())
            
            # Get author
            user_el = await element.query_selector(self.SELECTORS["user_name"])
            if user_el:
                user_text = await user_el.text_content()
                if "@" in user_text:
                    parts = user_text.split("@")
                    if len(parts) >= 2:
                        tweet.author_display_name = parts[0].strip()
                        username_part = parts[1].split()[0] if parts[1] else ""
                        tweet.author_username = username_part.strip("·").strip()
            
            # Get URL
            link_el = await element.query_selector('a[href*="/status/"]')
            if link_el:
                href = await link_el.get_attribute("href")
                if href:
                    tweet.tweet_url = f"https://x.com{href}" if href.startswith("/") else href
            
            # Check for media
            media_el = await element.query_selector('[data-testid="tweetPhoto"], video')
            tweet.has_media = media_el is not None
            
            # Check if retweet
            retweet_el = await element.query_selector('[data-testid="socialContext"]')
            if retweet_el:
                context = await retweet_el.text_content()
                tweet.is_retweet = "reposted" in context.lower() if context else False
            
            # Extract hashtags
            if tweet.text:
                import re
                tweet.hashtags = re.findall(r'#(\w+)', tweet.text)
                tweet.mentions = re.findall(r'@(\w+)', tweet.text)
            
            return tweet
        except Exception:
            return None
    
    async def _is_already_liked(self, element) -> bool:
        """Check if already liked."""
        try:
            unlike_button = await element.query_selector(self.SELECTORS["unlike_button"])
            return unlike_button is not None
        except Exception:
            return False
    
    async def _like_tweet(self, element) -> bool:
        """Like a tweet."""
        if self.dry_run:
            logger.info("[DRY-RUN] Would like tweet")
            return True
        
        try:
            like_button = await element.query_selector(self.SELECTORS["like_button"])
            if like_button:
                await like_button.click()
                await asyncio.sleep(0.5)
                unlike_button = await element.query_selector(self.SELECTORS["unlike_button"])
                return unlike_button is not None
        except Exception:
            pass
        return False
    
    async def _retweet_tweet(self, element) -> bool:
        """Retweet a tweet (optional action)."""
        if self.dry_run:
            return True
        
        try:
            retweet_btn = await element.query_selector('[data-testid="retweet"]')
            if retweet_btn:
                await retweet_btn.click()
                await asyncio.sleep(0.5)
                # Click confirm retweet
                page = self._get_page()
                if page:
                    confirm = await page.query_selector('[data-testid="retweetConfirm"]')
                    if confirm:
                        await confirm.click()
                        return True
        except Exception:
            pass
        return False
    
    async def _bookmark_tweet(self, element) -> bool:
        """Bookmark a tweet (optional action)."""
        if self.dry_run:
            return True
        
        try:
            share_btn = await element.query_selector('[data-testid="share"]')
            if share_btn:
                await share_btn.click()
                await asyncio.sleep(0.5)
                page = self._get_page()
                if page:
                    bookmark_option = await page.query_selector('[data-testid="Dropdown"] [role="menuitem"]:has-text("Bookmark")')
                    if bookmark_option:
                        await bookmark_option.click()
                        return True
        except Exception:
            pass
        return False
    
    async def _scroll_down(self, pixels: int = 800):
        """Scroll down."""
        page = self._get_page()
        if page:
            await page.evaluate(f"window.scrollBy(0, {pixels})")
            await asyncio.sleep(0.5)
    
    def _get_page(self):
        """Get current page."""
        return getattr(self.browser, 'page', None)
    
    async def _safe_callback(self, callback: Callable, *args):
        """Safe callback execution."""
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(*args)
            else:
                callback(*args)
        except Exception as e:
            logger.error(f"Callback error: {e}")
    
    def pause(self):
        """Pause auto-liker."""
        self._paused = True
        logger.info("Auto-liker paused")
    
    def resume(self):
        """Resume auto-liker."""
        self._paused = False
        logger.info("Auto-liker resumed")
    
    def cancel(self):
        """Cancel auto-liker."""
        self._cancelled = True
        logger.info("Auto-liker cancelled")
    
    def get_stats(self) -> dict:
        """Get current stats."""
        return {
            "session_likes": self._session_likes,
            "hourly_likes": self._hourly_likes,
            "unique_tweets_seen": len(self._liked_tweets),
            "is_paused": self._paused,
            "is_cancelled": self._cancelled,
        }

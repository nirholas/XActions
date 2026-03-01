"""
Auto Retweet Action

Automatically retweet tweets based on criteria.
"""

import asyncio
import random
import time
from typing import Callable, Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import RetweetResult, AutoRetweetConfig, TweetElement


class AutoRetweet(BaseAction):
    """
    Automatically retweet tweets based on configurable criteria.
    
    Usage:
        config = AutoRetweetConfig(
            keywords=["Python", "AI"],
            max_retweets_per_session=20,
            delay_range=(5, 15)
        )
        
        auto_rt = AutoRetweet(browser, rate_limiter)
        result = await auto_rt.execute(
            config=config,
            duration_minutes=30
        )
    """
    
    SELECTORS = {
        "tweet_article": 'article[data-testid="tweet"]',
        "retweet_button": '[data-testid="retweet"]',
        "unretweet_button": '[data-testid="unretweet"]',
        "retweet_confirm": '[data-testid="retweetConfirm"]',
        "quote_option": '[role="menuitem"]:has-text("Quote")',
        "tweet_text": '[data-testid="tweetText"]',
        "user_name": '[data-testid="User-Name"]',
    }
    
    SEARCH_URL = "https://x.com/search"
    
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
        self._retweeted: set = set()
        self._session_retweets = 0
        self._hourly_retweets = 0
        self._hour_start = time.time()
    
    async def execute(
        self,
        config: AutoRetweetConfig,
        duration_minutes: int = 30,
        on_retweet: Optional[Callable] = None,
        on_skip: Optional[Callable] = None,
    ) -> RetweetResult:
        """
        Run auto-retweeter.
        
        Args:
            config: Retweet configuration
            duration_minutes: How long to run
            on_retweet: Callback when retweeted
            on_skip: Callback when skipped
            
        Returns:
            RetweetResult
        """
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60) if duration_minutes > 0 else float('inf')
        result = RetweetResult()
        
        self._cancelled = False
        self._retweeted.clear()
        self._session_retweets = 0
        self._hourly_retweets = 0
        self._hour_start = time.time()
        
        logger.info(
            f"Starting auto-retweeter for {duration_minutes} minutes "
            f"(max {config.max_retweets_per_session} retweets)"
        )
        
        try:
            while not self._cancelled and time.time() < end_time:
                if self._session_retweets >= config.max_retweets_per_session:
                    logger.info("Session retweet limit reached")
                    break
                
                # Check hourly limit
                if self._check_hourly_limit(config):
                    await asyncio.sleep(60)
                    continue
                
                # Navigate to source
                await self._navigate_to_source(config)
                await asyncio.sleep(2)
                
                # Process feed
                retweets_this_round = await self._process_feed(
                    config=config,
                    result=result,
                    on_retweet=on_retweet,
                    on_skip=on_skip,
                )
                
                if retweets_this_round == 0:
                    await self._scroll_down()
                
                delay = random.uniform(*config.delay_range)
                await asyncio.sleep(delay)
        
        except Exception as e:
            logger.error(f"Auto-retweeter error: {e}")
            result.errors.append(str(e))
        
        result.duration_seconds = time.time() - start_time
        result.cancelled = self._cancelled
        
        logger.info(
            f"Auto-retweeter finished: {result.success_count} retweeted, "
            f"{result.failed_count} failed, {result.skipped_count} skipped"
        )
        
        return result
    
    async def _process_feed(
        self,
        config: AutoRetweetConfig,
        result: RetweetResult,
        on_retweet: Optional[Callable],
        on_skip: Optional[Callable],
    ) -> int:
        """Process visible tweets."""
        retweets_this_round = 0
        tweets = await self._get_visible_tweets()
        
        for tweet_element in tweets:
            if self._cancelled:
                break
            
            if self._session_retweets >= config.max_retweets_per_session:
                break
            
            tweet = await self._parse_tweet_element(tweet_element)
            if not tweet:
                continue
            
            tweet_id = tweet.tweet_url or id(tweet_element)
            if tweet_id in self._retweeted:
                continue
            
            self._retweeted.add(tweet_id)
            
            # Check if should retweet
            should_rt, reason = self._should_retweet(tweet, config)
            
            if not should_rt:
                result.skipped_count += 1
                logger.debug(f"Skipping: {reason}")
                if on_skip:
                    await self._safe_callback(on_skip, tweet, reason)
                continue
            
            # Check if already retweeted
            if await self._is_already_retweeted(tweet_element):
                result.skipped_count += 1
                continue
            
            # Random probability
            if random.random() > config.retweet_probability:
                result.skipped_count += 1
                continue
            
            # Rate limiting
            if self.rate_limiter:
                await self.rate_limiter.wait()
            
            # Retweet (or quote if configured)
            if config.quote_instead and config.quote_templates:
                success = await self._quote_tweet(
                    tweet_element,
                    random.choice(config.quote_templates)
                )
                if success:
                    result.quoted_tweets.append({
                        "tweet_url": tweet.tweet_url or str(tweet_id),
                        "quote_text": config.quote_templates[0],
                    })
            else:
                success = await self._retweet(tweet_element)
                if success:
                    result.retweeted_tweets.append(tweet.tweet_url or str(tweet_id))
            
            if success:
                result.success_count += 1
                self._session_retweets += 1
                self._hourly_retweets += 1
                retweets_this_round += 1
                
                logger.info(
                    f"[{self._session_retweets}/{config.max_retweets_per_session}] "
                    f"Retweeted: {tweet.text[:50] if tweet.text else 'No text'}..."
                )
                
                if on_retweet:
                    await self._safe_callback(on_retweet, tweet)
                
                if self.rate_limiter:
                    self.rate_limiter.record_success()
                
                await asyncio.sleep(random.uniform(2, 5))
            else:
                result.failed_count += 1
                result.failed_tweets.append(str(tweet_id))
                if self.rate_limiter:
                    self.rate_limiter.record_error()
        
        return retweets_this_round
    
    def _should_retweet(
        self,
        tweet: TweetElement,
        config: AutoRetweetConfig,
    ) -> tuple[bool, str]:
        """Determine if should retweet."""
        # Check replies
        if config.exclude_replies and tweet.is_reply:
            return False, "is reply"
        
        # Check engagement
        if tweet.likes_count < config.min_likes:
            return False, f"too few likes ({tweet.likes_count})"
        
        if tweet.likes_count > config.max_likes:
            return False, "too many likes"
        
        # Check followers
        if tweet.author_followers is not None:
            if tweet.author_followers < config.min_followers:
                return False, "author has too few followers"
        
        # Check blocked users
        if tweet.author_username:
            if tweet.author_username.lower() in [u.lower() for u in config.blocked_users]:
                return False, "blocked user"
        
        # Check blocked keywords
        if tweet.text:
            text_lower = tweet.text.lower()
            for keyword in config.blocked_keywords:
                if keyword.lower() in text_lower:
                    return False, f"blocked keyword: {keyword}"
        
        # Check language
        if config.language and tweet.language:
            if tweet.language != config.language:
                return False, f"wrong language: {tweet.language}"
        
        # Check from_users
        if config.from_users and tweet.author_username:
            if tweet.author_username.lower() in [u.lower() for u in config.from_users]:
                return True, "from target user"
        
        # Check keywords
        if config.keywords and tweet.text:
            if any(kw.lower() in tweet.text.lower() for kw in config.keywords):
                return True, "keyword match"
        
        # Check hashtags
        if config.hashtags and tweet.hashtags:
            tweet_tags = [h.lower() for h in tweet.hashtags]
            if any(h.lower().lstrip("#") in tweet_tags for h in config.hashtags):
                return True, "hashtag match"
        
        # No targeting
        if not config.keywords and not config.hashtags and not config.from_users:
            return True, "no targeting"
        
        return False, "no match"
    
    def _check_hourly_limit(self, config: AutoRetweetConfig) -> bool:
        """Check hourly limit."""
        current_time = time.time()
        if current_time - self._hour_start >= 3600:
            self._hourly_retweets = 0
            self._hour_start = current_time
            return False
        
        if self._hourly_retweets >= config.max_retweets_per_hour:
            wait_time = 3600 - (current_time - self._hour_start)
            logger.warning(f"Hourly retweet limit, waiting {wait_time/60:.1f} min")
            return True
        
        return False
    
    async def _retweet(self, tweet_element) -> bool:
        """Retweet a tweet."""
        if self.dry_run:
            logger.info("[DRY-RUN] Would retweet")
            return True
        
        try:
            page = self._get_page()
            if not page:
                return False
            
            # Click retweet button
            rt_btn = await tweet_element.query_selector(self.SELECTORS["retweet_button"])
            if not rt_btn:
                return False
            
            await rt_btn.click()
            await asyncio.sleep(0.5)
            
            # Confirm retweet
            try:
                await page.wait_for_selector(self.SELECTORS["retweet_confirm"], timeout=3000)
                confirm = await page.query_selector(self.SELECTORS["retweet_confirm"])
                if confirm:
                    await confirm.click()
                    await asyncio.sleep(1)
                    return True
            except Exception:
                pass
            
            return False
        
        except Exception as e:
            logger.error(f"Retweet error: {e}")
            return False
    
    async def _quote_tweet(self, tweet_element, quote_text: str) -> bool:
        """Quote a tweet."""
        if self.dry_run:
            logger.info(f"[DRY-RUN] Would quote: {quote_text}")
            return True
        
        try:
            page = self._get_page()
            if not page:
                return False
            
            # Click retweet to open menu
            rt_btn = await tweet_element.query_selector(self.SELECTORS["retweet_button"])
            if not rt_btn:
                return False
            
            await rt_btn.click()
            await asyncio.sleep(0.5)
            
            # Click quote option
            quote_opt = await page.query_selector(self.SELECTORS["quote_option"])
            if quote_opt:
                await quote_opt.click()
                await asyncio.sleep(1)
                
                # Type quote
                input_el = await page.query_selector('[data-testid="tweetTextarea_0"]')
                if input_el:
                    await input_el.click()
                    await page.keyboard.type(quote_text, delay=30)
                    await asyncio.sleep(0.5)
                    
                    # Submit
                    submit = await page.query_selector('[data-testid="tweetButton"]')
                    if submit:
                        await submit.click()
                        await asyncio.sleep(2)
                        return True
            
            return False
        
        except Exception as e:
            logger.error(f"Quote error: {e}")
            return False
    
    async def _is_already_retweeted(self, element) -> bool:
        """Check if already retweeted."""
        try:
            unretweet = await element.query_selector(self.SELECTORS["unretweet_button"])
            return unretweet is not None
        except Exception:
            return False
    
    async def _navigate_to_source(self, config: AutoRetweetConfig):
        """Navigate to source."""
        if config.keywords:
            kw = random.choice(config.keywords)
            url = f"{self.SEARCH_URL}?q={kw}&src=typed_query&f=live"
            await self.browser.goto(url)
        elif config.hashtags:
            tag = random.choice(config.hashtags).lstrip("#")
            url = f"{self.SEARCH_URL}?q=%23{tag}&src=typed_query&f=live"
            await self.browser.goto(url)
        elif config.from_users:
            user = random.choice(config.from_users).lstrip("@")
            await self.browser.goto(f"https://x.com/{user}")
        else:
            await self.browser.goto("https://x.com/home")
    
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
        """Parse tweet."""
        try:
            tweet = TweetElement()
            
            text_el = await element.query_selector('[data-testid="tweetText"]')
            if text_el:
                tweet.text = await text_el.text_content()
                tweet.has_text = bool(tweet.text and tweet.text.strip())
            
            user_el = await element.query_selector(self.SELECTORS["user_name"])
            if user_el:
                user_text = await user_el.text_content()
                if "@" in user_text:
                    parts = user_text.split("@")
                    if len(parts) >= 2:
                        tweet.author_display_name = parts[0].strip()
                        username_part = parts[1].split()[0] if parts[1] else ""
                        tweet.author_username = username_part.strip("·").strip()
            
            link_el = await element.query_selector('a[href*="/status/"]')
            if link_el:
                href = await link_el.get_attribute("href")
                if href:
                    tweet.tweet_url = f"https://x.com{href}" if href.startswith("/") else href
            
            if tweet.text:
                import re
                tweet.hashtags = re.findall(r'#(\w+)', tweet.text)
            
            retweet_el = await element.query_selector('[data-testid="socialContext"]')
            if retweet_el:
                context = await retweet_el.text_content()
                tweet.is_retweet = "reposted" in context.lower() if context else False
            
            return tweet
        except Exception:
            return None
    
    async def _scroll_down(self, pixels: int = 800):
        """Scroll down."""
        page = self._get_page()
        if page:
            await page.evaluate(f"window.scrollBy(0, {pixels})")
            await asyncio.sleep(0.5)
    
    def _get_page(self):
        """Get page."""
        return getattr(self.browser, 'page', None)
    
    async def _safe_callback(self, callback: Callable, *args):
        """Safe callback."""
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(*args)
            else:
                callback(*args)
        except Exception as e:
            logger.error(f"Callback error: {e}")
    
    def cancel(self):
        """Cancel."""
        self._cancelled = True
        logger.info("Auto-retweeter cancelled")
    
    def get_stats(self) -> dict:
        """Get stats."""
        return {
            "session_retweets": self._session_retweets,
            "hourly_retweets": self._hourly_retweets,
            "tweets_seen": len(self._retweeted),
            "is_cancelled": self._cancelled,
        }

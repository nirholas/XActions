"""
Auto Commenter Action

Automatically comment on tweets using templates.
"""

import asyncio
import random
import time
from typing import Callable, Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import CommentResult, AutoCommentConfig, TweetElement, LikeFilters


class AutoCommenter(BaseAction):
    """
    Automatically comment on tweets with templates or custom text.
    
    Usage:
        config = AutoCommentConfig(
            keywords=["Python", "programming"],
            templates=[
                "Great point! 🔥",
                "This is so helpful, thanks!",
                "Interesting perspective 👀"
            ],
            max_comments_per_session=10
        )
        
        commenter = AutoCommenter(browser, rate_limiter)
        result = await commenter.execute(
            config=config,
            duration_minutes=30
        )
    """
    
    SELECTORS = {
        "tweet_article": 'article[data-testid="tweet"]',
        "reply_button": '[data-testid="reply"]',
        "reply_input": '[data-testid="tweetTextarea_0"]',
        "reply_submit": '[data-testid="tweetButtonInline"]',
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
        self._commented_tweets: set = set()
        self._session_comments = 0
        self._hourly_comments = 0
        self._hour_start = time.time()
    
    async def execute(
        self,
        config: AutoCommentConfig,
        duration_minutes: int = 30,
        on_comment: Optional[Callable] = None,
        on_skip: Optional[Callable] = None,
    ) -> CommentResult:
        """
        Run auto-commenter for specified duration.
        
        Args:
            config: Comment configuration
            duration_minutes: How long to run (0 for unlimited)
            on_comment: Callback when comment posted
            on_skip: Callback when tweet skipped
            
        Returns:
            CommentResult with summary
        """
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60) if duration_minutes > 0 else float('inf')
        result = CommentResult()
        
        self._cancelled = False
        self._commented_tweets.clear()
        self._session_comments = 0
        self._hourly_comments = 0
        self._hour_start = time.time()
        
        # Validate config
        if not config.templates and not config.use_ai:
            result.errors.append("No templates provided and AI not enabled")
            return result
        
        logger.info(
            f"Starting auto-commenter for {duration_minutes} minutes "
            f"(max {config.max_comments_per_session} comments)"
        )
        
        try:
            while not self._cancelled and time.time() < end_time:
                # Check limits
                if self._session_comments >= config.max_comments_per_session:
                    logger.info("Session comment limit reached")
                    break
                
                # Check hourly limit
                if self._check_hourly_limit(config):
                    await asyncio.sleep(60)
                    continue
                
                # Navigate to search
                await self._navigate_to_source(config)
                await asyncio.sleep(2)
                
                # Process tweets
                comments_this_round = await self._process_feed(
                    config=config,
                    result=result,
                    on_comment=on_comment,
                    on_skip=on_skip,
                )
                
                if comments_this_round == 0:
                    await self._scroll_down()
                
                # Longer delay for comments (more risky)
                delay = random.uniform(*config.delay_range)
                logger.debug(f"Waiting {delay:.1f}s before next round")
                await asyncio.sleep(delay)
        
        except Exception as e:
            logger.error(f"Auto-commenter error: {e}")
            result.errors.append(str(e))
        
        result.duration_seconds = time.time() - start_time
        result.cancelled = self._cancelled
        
        logger.info(
            f"Auto-commenter finished: {result.success_count} comments posted, "
            f"{result.failed_count} failed, {result.skipped_count} skipped"
        )
        
        return result
    
    async def _process_feed(
        self,
        config: AutoCommentConfig,
        result: CommentResult,
        on_comment: Optional[Callable],
        on_skip: Optional[Callable],
    ) -> int:
        """Process visible tweets."""
        comments_this_round = 0
        tweets = await self._get_visible_tweets()
        
        for tweet_element in tweets:
            if self._cancelled:
                break
            
            if self._session_comments >= config.max_comments_per_session:
                break
            
            tweet = await self._parse_tweet_element(tweet_element)
            if not tweet:
                continue
            
            tweet_id = tweet.tweet_url or id(tweet_element)
            if tweet_id in self._commented_tweets:
                continue
            
            self._commented_tweets.add(tweet_id)
            
            # Check if should comment
            should_comment, reason = self._should_comment(tweet, config)
            
            if not should_comment:
                result.skipped_count += 1
                logger.debug(f"Skipping: {reason}")
                if on_skip:
                    await self._safe_callback(on_skip, tweet, reason)
                continue
            
            # Select comment text
            comment_text = self._select_template(tweet, config)
            if not comment_text:
                result.skipped_count += 1
                continue
            
            # Personalize if enabled
            if config.personalize:
                comment_text = self._personalize_comment(comment_text, tweet, config)
            
            # Preview mode
            if config.review_before_post:
                logger.info(f"Preview comment for {tweet.tweet_url}:")
                logger.info(f"  Tweet: {tweet.text[:100] if tweet.text else 'No text'}...")
                logger.info(f"  Comment: {comment_text}")
                # In real implementation, would wait for user confirmation
                # For now, just log and proceed (dry_run handles actual posting)
            
            # Rate limiting
            if self.rate_limiter:
                await self.rate_limiter.wait()
            
            # Post comment
            success = await self._post_comment(tweet_element, comment_text)
            
            if success:
                result.success_count += 1
                result.comments_posted.append({
                    "tweet_url": tweet.tweet_url or str(tweet_id),
                    "comment_text": comment_text,
                })
                self._session_comments += 1
                self._hourly_comments += 1
                comments_this_round += 1
                
                logger.info(
                    f"[{self._session_comments}/{config.max_comments_per_session}] "
                    f"Commented: {comment_text[:50]}..."
                )
                
                if on_comment:
                    await self._safe_callback(on_comment, tweet, comment_text)
                
                if self.rate_limiter:
                    self.rate_limiter.record_success()
                
                # Longer delay after commenting
                await asyncio.sleep(random.uniform(30, 60))
            else:
                result.failed_count += 1
                result.failed_comments.append({
                    "tweet_url": tweet.tweet_url or str(tweet_id),
                    "comment_text": comment_text,
                })
                if self.rate_limiter:
                    self.rate_limiter.record_error()
        
        return comments_this_round
    
    def _should_comment(
        self,
        tweet: TweetElement,
        config: AutoCommentConfig,
    ) -> tuple[bool, str]:
        """Determine if should comment on tweet."""
        # Check exclusions
        if config.exclude_retweets and tweet.is_retweet:
            return False, "is retweet"
        
        # Check engagement
        if tweet.likes_count < config.min_likes:
            return False, "too few likes"
        
        if tweet.likes_count > config.max_likes:
            return False, "too many likes (avoid spam)"
        
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
        
        # Check from_users (always comment on these)
        if config.from_users and tweet.author_username:
            if tweet.author_username.lower() in [u.lower() for u in config.from_users]:
                return True, "from target user"
        
        # Check keywords
        if config.keywords and tweet.text:
            text_lower = tweet.text.lower()
            if any(kw.lower() in text_lower for kw in config.keywords):
                return True, "keyword match"
        
        # Check hashtags
        if config.hashtags and tweet.hashtags:
            tweet_tags = [h.lower() for h in tweet.hashtags]
            config_tags = [h.lower().lstrip("#") for h in config.hashtags]
            if any(tag in tweet_tags for tag in config_tags):
                return True, "hashtag match"
        
        # No targeting = allow all
        if not config.keywords and not config.hashtags and not config.from_users:
            return True, "no targeting"
        
        return False, "no match"
    
    def _select_template(
        self,
        tweet: TweetElement,
        config: AutoCommentConfig,
    ) -> Optional[str]:
        """Select appropriate comment template."""
        if not config.templates:
            return None
        
        # Simple random selection for now
        # Could be enhanced with context-based selection
        return random.choice(config.templates)
    
    def _personalize_comment(
        self,
        comment: str,
        tweet: TweetElement,
        config: AutoCommentConfig,
    ) -> str:
        """Personalize comment based on tweet context."""
        # Add author mention if enabled
        if config.mention_author and tweet.author_username:
            if not comment.startswith("@"):
                comment = f"@{tweet.author_username} {comment}"
        
        # Add relevant hashtags if enabled
        if config.add_hashtags and tweet.hashtags:
            # Add 1-2 hashtags from the tweet
            tags_to_add = tweet.hashtags[:2]
            for tag in tags_to_add:
                if f"#{tag}" not in comment:
                    comment = f"{comment} #{tag}"
        
        # Truncate if too long
        if len(comment) > 280:
            comment = comment[:277] + "..."
        
        return comment
    
    async def _post_comment(self, tweet_element, comment_text: str) -> bool:
        """Post a comment to a tweet."""
        if self.dry_run:
            logger.info(f"[DRY-RUN] Would comment: {comment_text}")
            return True
        
        try:
            page = self._get_page()
            if not page:
                return False
            
            # Click reply button
            reply_btn = await tweet_element.query_selector(self.SELECTORS["reply_button"])
            if not reply_btn:
                return False
            
            await reply_btn.click()
            await asyncio.sleep(1)
            
            # Wait for reply input
            try:
                await page.wait_for_selector(self.SELECTORS["reply_input"], timeout=5000)
            except Exception:
                return False
            
            # Type comment
            reply_input = await page.query_selector(self.SELECTORS["reply_input"])
            if reply_input:
                await reply_input.click()
                await page.keyboard.type(comment_text, delay=30)
                await asyncio.sleep(0.5)
            
            # Submit
            submit_btn = await page.query_selector(self.SELECTORS["reply_submit"])
            if submit_btn:
                await submit_btn.click()
                await asyncio.sleep(2)
                return True
        
        except Exception as e:
            logger.error(f"Error posting comment: {e}")
        
        return False
    
    def _check_hourly_limit(self, config: AutoCommentConfig) -> bool:
        """Check hourly comment limit. Returns True if should pause."""
        current_time = time.time()
        if current_time - self._hour_start >= 3600:
            self._hourly_comments = 0
            self._hour_start = current_time
            return False
        
        if self._hourly_comments >= config.max_comments_per_hour:
            wait_time = 3600 - (current_time - self._hour_start)
            logger.warning(f"Hourly comment limit reached, waiting {wait_time/60:.1f} minutes")
            return True
        
        return False
    
    async def _navigate_to_source(self, config: AutoCommentConfig):
        """Navigate to tweet source."""
        if config.keywords:
            keyword = random.choice(config.keywords)
            url = f"{self.SEARCH_URL}?q={keyword}&src=typed_query&f=live"
            await self.browser.goto(url)
        elif config.hashtags:
            hashtag = random.choice(config.hashtags).lstrip("#")
            url = f"{self.SEARCH_URL}?q=%23{hashtag}&src=typed_query&f=live"
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
        """Parse tweet element."""
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
    
    def cancel(self):
        """Cancel operation."""
        self._cancelled = True
        logger.info("Auto-commenter cancelled")
    
    def get_stats(self) -> dict:
        """Get current stats."""
        return {
            "session_comments": self._session_comments,
            "hourly_comments": self._hourly_comments,
            "unique_tweets_seen": len(self._commented_tweets),
            "is_cancelled": self._cancelled,
        }

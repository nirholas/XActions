"""
AI Commenter Action

Generate AI-powered contextual comments for tweets.
"""

import asyncio
import random
import time
from typing import Callable, Optional

from loguru import logger

from xeepy.actions.base import BaseAction, BrowserManager, RateLimiter
from xeepy.actions.types import CommentResult, AutoCommentConfig, TweetElement


class AICommenter(BaseAction):
    """
    Generate AI-powered comments for tweets.
    
    Requires an AI/LLM client to generate contextual responses.
    
    Usage:
        commenter = AICommenter(browser, rate_limiter, ai_client=openai_client)
        result = await commenter.execute(
            config=AutoCommentConfig(
                keywords=["AI", "machine learning"],
                use_ai=True,
                ai_style="helpful"
            ),
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
    
    AI_STYLES = {
        "helpful": "You are a helpful and friendly person engaging on social media. Provide value and be genuinely interested.",
        "casual": "You are a casual, laid-back person. Keep responses light and conversational.",
        "professional": "You are a professional engaging in industry discussions. Be insightful and add expertise.",
        "witty": "You are witty and clever. Add humor while still being relevant and respectful.",
        "supportive": "You are encouraging and supportive. Celebrate others' achievements and provide positive feedback.",
    }
    
    SEARCH_URL = "https://x.com/search"
    
    def __init__(
        self,
        browser: BrowserManager,
        rate_limiter: Optional[RateLimiter] = None,
        ai_client: Optional[any] = None,
        dry_run: bool = False,
    ):
        """
        Initialize AI Commenter.
        
        Args:
            browser: Browser manager
            rate_limiter: Rate limiter
            ai_client: AI/LLM client (e.g., OpenAI client)
            dry_run: If True, don't actually post
        """
        self.browser = browser
        self.rate_limiter = rate_limiter
        self.ai_client = ai_client
        self.dry_run = dry_run
        self._cancelled = False
        self._commented_tweets: set = set()
        self._session_comments = 0
    
    async def execute(
        self,
        config: AutoCommentConfig,
        duration_minutes: int = 30,
        on_comment: Optional[Callable] = None,
        on_skip: Optional[Callable] = None,
    ) -> CommentResult:
        """
        Run AI-powered auto-commenter.
        
        Args:
            config: Comment configuration (use_ai should be True)
            duration_minutes: How long to run
            on_comment: Callback when comment posted
            on_skip: Callback when skipped
            
        Returns:
            CommentResult
        """
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60) if duration_minutes > 0 else float('inf')
        result = CommentResult()
        
        self._cancelled = False
        self._commented_tweets.clear()
        self._session_comments = 0
        
        if not self.ai_client and not self.dry_run:
            # Use fallback templates if no AI client
            logger.warning("No AI client provided, using fallback templates")
        
        logger.info(
            f"Starting AI commenter for {duration_minutes} minutes "
            f"(style: {config.ai_style})"
        )
        
        try:
            while not self._cancelled and time.time() < end_time:
                if self._session_comments >= config.max_comments_per_session:
                    break
                
                await self._navigate_to_source(config)
                await asyncio.sleep(2)
                
                comments_this_round = await self._process_feed(
                    config=config,
                    result=result,
                    on_comment=on_comment,
                    on_skip=on_skip,
                )
                
                if comments_this_round == 0:
                    await self._scroll_down()
                
                delay = random.uniform(*config.delay_range)
                await asyncio.sleep(delay)
        
        except Exception as e:
            logger.error(f"AI commenter error: {e}")
            result.errors.append(str(e))
        
        result.duration_seconds = time.time() - start_time
        result.cancelled = self._cancelled
        
        return result
    
    async def generate_comment(
        self,
        tweet: TweetElement,
        style: str = "helpful",
        max_length: int = 280,
    ) -> Optional[str]:
        """
        Generate an AI-powered comment for a tweet.
        
        Args:
            tweet: The tweet to respond to
            style: AI personality style
            max_length: Maximum comment length
            
        Returns:
            Generated comment text or None
        """
        if not tweet.text:
            return None
        
        # Build prompt
        system_prompt = self.AI_STYLES.get(style, self.AI_STYLES["helpful"])
        
        user_prompt = f"""Generate a short, natural Twitter reply to this tweet:

Tweet: "{tweet.text}"
Author: @{tweet.author_username or 'unknown'}

Requirements:
- Maximum {max_length} characters
- Be natural and conversational
- Don't be generic or spammy
- Add value to the conversation
- Don't use hashtags unless very relevant
- No emojis unless appropriate

Reply:"""
        
        try:
            if self.ai_client:
                # Try OpenAI-style API
                if hasattr(self.ai_client, 'chat'):
                    response = await self._call_openai_style(system_prompt, user_prompt)
                else:
                    response = await self._call_generic_ai(system_prompt, user_prompt)
                
                if response:
                    # Clean up response
                    response = response.strip().strip('"\'')
                    if len(response) > max_length:
                        response = response[:max_length - 3] + "..."
                    return response
            else:
                # Fallback to simple templates
                return self._generate_fallback_comment(tweet, style)
        
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            return self._generate_fallback_comment(tweet, style)
        
        return None
    
    async def _call_openai_style(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        """Call OpenAI-style chat API."""
        try:
            response = await asyncio.to_thread(
                self.ai_client.chat.completions.create,
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=100,
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return None
    
    async def _call_generic_ai(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        """Call generic AI API."""
        # Placeholder for other AI providers
        logger.warning("Generic AI client not implemented")
        return None
    
    def _generate_fallback_comment(self, tweet: TweetElement, style: str) -> str:
        """Generate fallback comment without AI."""
        fallback_templates = {
            "helpful": [
                "Great insight! Thanks for sharing.",
                "This is really valuable, appreciate you posting this.",
                "Interesting perspective, definitely something to think about.",
            ],
            "casual": [
                "Nice one! 👍",
                "Ha, love this!",
                "So true though",
            ],
            "professional": [
                "Excellent analysis. This aligns with industry trends.",
                "Well articulated. Would love to discuss further.",
                "Insightful point. Thanks for sharing your expertise.",
            ],
            "witty": [
                "This hits different 😄",
                "Facts. No notes.",
                "Someone had to say it!",
            ],
            "supportive": [
                "Love seeing this! Keep it up! 🙌",
                "This is amazing work!",
                "You're absolutely crushing it!",
            ],
        }
        
        templates = fallback_templates.get(style, fallback_templates["helpful"])
        return random.choice(templates)
    
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
            if not tweet or not tweet.text:
                continue
            
            tweet_id = tweet.tweet_url or id(tweet_element)
            if tweet_id in self._commented_tweets:
                continue
            
            self._commented_tweets.add(tweet_id)
            
            # Check targeting
            if not self._matches_targeting(tweet, config):
                result.skipped_count += 1
                if on_skip:
                    await self._safe_callback(on_skip, tweet, "no match")
                continue
            
            # Generate AI comment
            comment_text = await self.generate_comment(
                tweet=tweet,
                style=config.ai_style,
                max_length=config.ai_max_length,
            )
            
            if not comment_text:
                result.skipped_count += 1
                continue
            
            # Add mention if configured
            if config.mention_author and tweet.author_username:
                if not comment_text.startswith("@"):
                    comment_text = f"@{tweet.author_username} {comment_text}"
            
            # Preview mode
            if config.review_before_post:
                logger.info(f"AI Comment Preview:")
                logger.info(f"  Tweet: {tweet.text[:100]}...")
                logger.info(f"  Comment: {comment_text}")
            
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
                    "ai_generated": True,
                })
                self._session_comments += 1
                comments_this_round += 1
                
                logger.info(f"Posted AI comment: {comment_text[:50]}...")
                
                if on_comment:
                    await self._safe_callback(on_comment, tweet, comment_text)
                
                await asyncio.sleep(random.uniform(30, 60))
            else:
                result.failed_count += 1
        
        return comments_this_round
    
    def _matches_targeting(self, tweet: TweetElement, config: AutoCommentConfig) -> bool:
        """Check if tweet matches targeting criteria."""
        if config.from_users and tweet.author_username:
            if tweet.author_username.lower() in [u.lower() for u in config.from_users]:
                return True
        
        if config.keywords and tweet.text:
            if any(kw.lower() in tweet.text.lower() for kw in config.keywords):
                return True
        
        if config.hashtags and tweet.hashtags:
            tweet_tags = [h.lower() for h in tweet.hashtags]
            if any(h.lower().lstrip("#") in tweet_tags for h in config.hashtags):
                return True
        
        if not config.keywords and not config.hashtags and not config.from_users:
            return True
        
        return False
    
    async def _post_comment(self, tweet_element, comment_text: str) -> bool:
        """Post a comment."""
        if self.dry_run:
            logger.info(f"[DRY-RUN] Would post AI comment: {comment_text}")
            return True
        
        try:
            page = self._get_page()
            if not page:
                return False
            
            reply_btn = await tweet_element.query_selector(self.SELECTORS["reply_button"])
            if not reply_btn:
                return False
            
            await reply_btn.click()
            await asyncio.sleep(1)
            
            await page.wait_for_selector(self.SELECTORS["reply_input"], timeout=5000)
            
            reply_input = await page.query_selector(self.SELECTORS["reply_input"])
            if reply_input:
                await reply_input.click()
                await page.keyboard.type(comment_text, delay=30)
                await asyncio.sleep(0.5)
            
            submit_btn = await page.query_selector(self.SELECTORS["reply_submit"])
            if submit_btn:
                await submit_btn.click()
                await asyncio.sleep(2)
                return True
        
        except Exception as e:
            logger.error(f"Error posting AI comment: {e}")
        
        return False
    
    async def _navigate_to_source(self, config: AutoCommentConfig):
        """Navigate to source."""
        if config.keywords:
            keyword = random.choice(config.keywords)
            url = f"{self.SEARCH_URL}?q={keyword}&src=typed_query&f=live"
            await self.browser.goto(url)
        elif config.hashtags:
            hashtag = random.choice(config.hashtags).lstrip("#")
            url = f"{self.SEARCH_URL}?q=%23{hashtag}&src=typed_query&f=live"
            await self.browser.goto(url)
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
        """Safe callback."""
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

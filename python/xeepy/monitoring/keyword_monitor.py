"""
Keyword monitor - monitor X for specific keywords and hashtags.

Find tweets matching keywords in real-time.
"""

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Set


@dataclass
class SearchFilters:
    """Filters for keyword search"""
    min_likes: int = 0
    min_retweets: int = 0
    min_replies: int = 0
    min_followers: int = 0
    exclude_retweets: bool = False
    exclude_replies: bool = False
    language: Optional[str] = None
    verified_only: bool = False
    
    def matches(self, tweet: dict) -> bool:
        """Check if tweet matches filters"""
        if self.min_likes and tweet.get('likes', 0) < self.min_likes:
            return False
        if self.min_retweets and tweet.get('retweets', 0) < self.min_retweets:
            return False
        if self.min_replies and tweet.get('replies', 0) < self.min_replies:
            return False
        if self.min_followers and tweet.get('author_followers', 0) < self.min_followers:
            return False
        if self.exclude_retweets and tweet.get('is_retweet'):
            return False
        if self.exclude_replies and tweet.get('is_reply'):
            return False
        if self.language and tweet.get('language') != self.language:
            return False
        if self.verified_only and not tweet.get('author_verified'):
            return False
        return True


@dataclass
class KeywordMatch:
    """A tweet matching keyword criteria"""
    tweet_id: str
    author_username: str
    author_display_name: Optional[str]
    text: str
    matched_keywords: List[str]
    matched_hashtags: List[str]
    created_at: datetime
    likes: int = 0
    retweets: int = 0
    replies: int = 0
    url: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "tweet_id": self.tweet_id,
            "author_username": self.author_username,
            "author_display_name": self.author_display_name,
            "text": self.text,
            "matched_keywords": self.matched_keywords,
            "matched_hashtags": self.matched_hashtags,
            "created_at": self.created_at.isoformat(),
            "likes": self.likes,
            "retweets": self.retweets,
            "replies": self.replies,
            "url": self.url,
        }
    
    @property
    def tweet_url(self) -> str:
        """Generate tweet URL"""
        return self.url or f"https://twitter.com/{self.author_username}/status/{self.tweet_id}"


class KeywordMonitor:
    """
    Monitor X for specific keywords/hashtags in real-time.
    
    Great for:
    - Brand monitoring
    - Finding opportunities to engage
    - Tracking trends
    - Competitor mentions
    
    Example:
        monitor = KeywordMonitor(scraper)
        
        # Search once
        matches = await monitor.search(
            keywords=["python", "programming"],
            hashtags=["coding"],
            limit=50,
        )
        
        # Continuous monitoring
        await monitor.monitor(
            keywords=["my_brand"],
            on_match=lambda m: print(f"Found: {m.text[:50]}"),
            interval_seconds=60,
        )
    """
    
    def __init__(
        self,
        scraper: Optional[Any] = None,
        notifier: Optional[Any] = None,
    ):
        """
        Initialize keyword monitor.
        
        Args:
            scraper: X/Twitter scraper instance
            notifier: Notification manager for alerts
        """
        self.scraper = scraper
        self.notifier = notifier
        
        self._seen_tweets: Set[str] = set()
        self._callbacks: List[Callable[[KeywordMatch], None]] = []
    
    def on_match(self, callback: Callable[[KeywordMatch], None]) -> None:
        """Register callback for matches"""
        self._callbacks.append(callback)
    
    def _emit_match(self, match: KeywordMatch) -> None:
        """Emit match to all callbacks"""
        for callback in self._callbacks:
            try:
                callback(match)
            except Exception as e:
                print(f"Callback error: {e}")
    
    def _build_search_query(
        self,
        keywords: List[str],
        hashtags: Optional[List[str]] = None,
        filters: Optional[SearchFilters] = None,
    ) -> str:
        """Build search query string"""
        parts = []
        
        # Add keywords with OR
        if keywords:
            keyword_query = " OR ".join(f'"{k}"' if " " in k else k for k in keywords)
            parts.append(f"({keyword_query})")
        
        # Add hashtags
        if hashtags:
            hashtag_query = " OR ".join(f"#{h.lstrip('#')}" for h in hashtags)
            parts.append(f"({hashtag_query})")
        
        # Add filters
        if filters:
            if filters.exclude_retweets:
                parts.append("-is:retweet")
            if filters.exclude_replies:
                parts.append("-is:reply")
            if filters.language:
                parts.append(f"lang:{filters.language}")
            if filters.verified_only:
                parts.append("is:verified")
            if filters.min_likes:
                parts.append(f"min_faves:{filters.min_likes}")
            if filters.min_retweets:
                parts.append(f"min_retweets:{filters.min_retweets}")
        
        return " ".join(parts)
    
    def _check_keywords_in_text(
        self,
        text: str,
        keywords: List[str],
        hashtags: Optional[List[str]] = None,
    ) -> tuple[List[str], List[str]]:
        """Check which keywords/hashtags are in text"""
        text_lower = text.lower()
        
        matched_keywords = [k for k in keywords if k.lower() in text_lower]
        
        matched_hashtags = []
        if hashtags:
            for h in hashtags:
                tag = h.lstrip('#').lower()
                if f"#{tag}" in text_lower or f"#{tag} " in text_lower:
                    matched_hashtags.append(h)
        
        return matched_keywords, matched_hashtags
    
    def _parse_tweet(
        self,
        tweet: Any,
        keywords: List[str],
        hashtags: Optional[List[str]] = None,
    ) -> Optional[KeywordMatch]:
        """Parse tweet object into KeywordMatch"""
        # Extract data from various tweet formats
        if isinstance(tweet, dict):
            tweet_id = str(tweet.get('id') or tweet.get('id_str', ''))
            text = tweet.get('text') or tweet.get('full_text', '')
            author = tweet.get('user', {})
            author_username = author.get('screen_name') or tweet.get('author_username', '')
            author_display_name = author.get('name') or tweet.get('author_name')
            likes = tweet.get('favorite_count') or tweet.get('likes', 0)
            retweets = tweet.get('retweet_count') or tweet.get('retweets', 0)
            replies = tweet.get('reply_count') or tweet.get('replies', 0)
            created_at_str = tweet.get('created_at')
        else:
            tweet_id = str(getattr(tweet, 'id', ''))
            text = getattr(tweet, 'text', '') or getattr(tweet, 'full_text', '')
            author_username = getattr(tweet, 'author_username', '') or getattr(tweet, 'screen_name', '')
            author_display_name = getattr(tweet, 'author_name', None) or getattr(tweet, 'name', None)
            likes = getattr(tweet, 'likes', 0) or getattr(tweet, 'favorite_count', 0)
            retweets = getattr(tweet, 'retweets', 0) or getattr(tweet, 'retweet_count', 0)
            replies = getattr(tweet, 'replies', 0) or getattr(tweet, 'reply_count', 0)
            created_at_str = getattr(tweet, 'created_at', None)
        
        if not tweet_id or not text:
            return None
        
        # Check for keyword matches
        matched_keywords, matched_hashtags = self._check_keywords_in_text(
            text, keywords, hashtags
        )
        
        if not matched_keywords and not matched_hashtags:
            return None
        
        # Parse created_at
        created_at = datetime.utcnow()
        if created_at_str:
            if isinstance(created_at_str, datetime):
                created_at = created_at_str
            elif isinstance(created_at_str, str):
                try:
                    # Try various formats
                    for fmt in [
                        "%a %b %d %H:%M:%S +0000 %Y",  # Twitter format
                        "%Y-%m-%dT%H:%M:%S.%fZ",  # ISO format
                        "%Y-%m-%d %H:%M:%S",
                    ]:
                        try:
                            created_at = datetime.strptime(created_at_str, fmt)
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass
        
        return KeywordMatch(
            tweet_id=tweet_id,
            author_username=author_username,
            author_display_name=author_display_name,
            text=text,
            matched_keywords=matched_keywords,
            matched_hashtags=matched_hashtags,
            created_at=created_at,
            likes=likes,
            retweets=retweets,
            replies=replies,
        )
    
    async def search(
        self,
        keywords: List[str],
        hashtags: Optional[List[str]] = None,
        limit: int = 100,
        filters: Optional[SearchFilters] = None,
    ) -> List[KeywordMatch]:
        """
        Search for tweets matching keywords.
        
        Args:
            keywords: Terms to search for
            hashtags: Hashtags to search for
            limit: Maximum results to return
            filters: Additional filters
            
        Returns:
            List of matching tweets
        """
        if self.scraper is None:
            try:
                from ..scraper import Scraper
                self.scraper = Scraper()
            except ImportError:
                raise RuntimeError("No scraper available")
        
        query = self._build_search_query(keywords, hashtags, filters)
        matches = []
        
        if hasattr(self.scraper, 'search'):
            try:
                count = 0
                async for tweet in self.scraper.search(query):
                    match = self._parse_tweet(tweet, keywords, hashtags)
                    
                    if match:
                        # Apply additional filters
                        if filters:
                            tweet_dict = {
                                'likes': match.likes,
                                'retweets': match.retweets,
                                'replies': match.replies,
                            }
                            if not filters.matches(tweet_dict):
                                continue
                        
                        matches.append(match)
                        count += 1
                        
                        if count >= limit:
                            break
                            
            except Exception as e:
                print(f"Search error: {e}")
        
        return matches
    
    async def monitor(
        self,
        keywords: List[str],
        hashtags: Optional[List[str]] = None,
        interval_seconds: int = 60,
        duration_hours: Optional[float] = None,
        on_match: Optional[Callable[[KeywordMatch], None]] = None,
        filters: Optional[SearchFilters] = None,
        notify: bool = True,
    ) -> None:
        """
        Monitor for tweets matching keywords.
        
        Args:
            keywords: Terms to search for
            hashtags: Hashtags to monitor
            interval_seconds: Search frequency
            duration_hours: How long to run (None = forever)
            on_match: Callback for matching tweets
            filters: Additional filters
            notify: Send notifications
        """
        start_time = datetime.utcnow()
        
        if self.notifier:
            await self.notifier.notify(
                "monitoring_started",
                f"Started keyword monitoring",
                {"keywords": keywords, "hashtags": hashtags},
            )
        
        try:
            while True:
                try:
                    matches = await self.search(
                        keywords, 
                        hashtags, 
                        limit=50,
                        filters=filters,
                    )
                    
                    new_matches = []
                    for match in matches:
                        if match.tweet_id not in self._seen_tweets:
                            self._seen_tweets.add(match.tweet_id)
                            new_matches.append(match)
                            
                            # Emit to callbacks
                            self._emit_match(match)
                            
                            if on_match:
                                on_match(match)
                            
                            # Send notification
                            if notify and self.notifier:
                                await self.notifier.notify_keyword_match(
                                    ", ".join(match.matched_keywords + match.matched_hashtags),
                                    match.author_username,
                                    match.text,
                                    match.tweet_url,
                                )
                    
                    # Cleanup old seen tweets to prevent memory growth
                    if len(self._seen_tweets) > 10000:
                        # Keep only the most recent 5000
                        self._seen_tweets = set(list(self._seen_tweets)[-5000:])
                    
                except Exception as e:
                    print(f"Monitoring error: {e}")
                
                # Check duration
                if duration_hours is not None:
                    elapsed = (datetime.utcnow() - start_time).total_seconds() / 3600
                    if elapsed >= duration_hours:
                        break
                
                await asyncio.sleep(interval_seconds)
                
        finally:
            if self.notifier:
                await self.notifier.notify(
                    "monitoring_stopped",
                    "Stopped keyword monitoring",
                )
    
    async def monitor_mentions(
        self,
        username: str,
        interval_seconds: int = 60,
        duration_hours: Optional[float] = None,
        on_mention: Optional[Callable[[KeywordMatch], None]] = None,
        notify: bool = True,
    ) -> None:
        """
        Monitor mentions of a username.
        
        Args:
            username: Username to monitor mentions for
            interval_seconds: Search frequency
            duration_hours: How long to run
            on_mention: Callback for mentions
            notify: Send notifications
        """
        username = username.lstrip('@')
        
        await self.monitor(
            keywords=[f"@{username}"],
            interval_seconds=interval_seconds,
            duration_hours=duration_hours,
            on_match=on_mention,
            notify=notify,
        )
    
    def clear_seen_tweets(self) -> None:
        """Clear the set of seen tweets"""
        self._seen_tweets.clear()
    
    def get_stats(self) -> dict:
        """Get monitoring statistics"""
        return {
            "seen_tweets_count": len(self._seen_tweets),
            "registered_callbacks": len(self._callbacks),
        }

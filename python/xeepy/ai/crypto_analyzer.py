"""
Crypto Twitter Analyzer for Xeepy.

Specialized analysis for cryptocurrency and Web3 Twitter.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from loguru import logger

from xeepy.ai.providers.base import AIProvider


@dataclass
class TokenSentiment:
    """Sentiment analysis for a specific token/project.
    
    Attributes:
        token: Token symbol (e.g., $BTC).
        overall_sentiment: Overall sentiment score (-1 to 1).
        sentiment_label: Classification ('bullish', 'bearish', 'neutral').
        volume: Tweet volume analyzed.
        trending: Whether the token is trending.
        key_influencers: Influencers talking about this token.
        common_narratives: Common themes/narratives.
        warning_signs: Potential warning signs (pump signals, etc.).
    """
    token: str
    overall_sentiment: float
    sentiment_label: str
    volume: int
    trending: bool
    key_influencers: list[str]
    common_narratives: list[str]
    warning_signs: list[str] = field(default_factory=list)


@dataclass
class AlphaTweet:
    """A tweet potentially containing alpha (valuable info).
    
    Attributes:
        tweet_id: Tweet identifier.
        text: Tweet content.
        author: Tweet author.
        alpha_score: How likely this contains alpha (0-1).
        category: Alpha category ('early project', 'airdrop', 'insight', etc.).
        tokens_mentioned: Tokens mentioned.
        actionable: Whether this is actionable.
        urgency: Urgency level ('high', 'medium', 'low').
    """
    tweet_id: str
    text: str
    author: str
    alpha_score: float
    category: str
    tokens_mentioned: list[str]
    actionable: bool
    urgency: str = "medium"


@dataclass
class ShillActivity:
    """Detected shill/coordinated activity.
    
    Attributes:
        token: Token being shilled.
        confidence: Confidence this is a shill (0-1).
        evidence: Evidence of shilling.
        accounts_involved: Accounts participating.
        time_pattern: Pattern of posts.
        recommendation: What to do about it.
    """
    token: str
    confidence: float
    evidence: list[str]
    accounts_involved: list[str]
    time_pattern: str
    recommendation: str


class CryptoAnalyzer:
    """Specialized analysis for Crypto Twitter.
    
    Features:
    - Token/project sentiment analysis
    - Alpha detection
    - Shill/coordination detection
    - Influencer tracking
    - Narrative analysis
    
    Example:
        ```python
        from xeepy.ai import CryptoAnalyzer
        from xeepy.ai.providers import OpenAIProvider
        
        analyzer = CryptoAnalyzer(OpenAIProvider())
        
        # Analyze token sentiment
        sentiment = await analyzer.analyze_token_sentiment("$ETH")
        print(f"Sentiment: {sentiment.sentiment_label}")
        
        # Find alpha
        alpha = await analyzer.find_alpha(keywords=["airdrop", "early"])
        for tweet in alpha:
            print(f"Alpha ({tweet.alpha_score}): {tweet.text[:100]}")
        ```
    """
    
    # Common crypto tokens to recognize
    MAJOR_TOKENS = {
        "BTC", "ETH", "SOL", "AVAX", "DOT", "MATIC", "LINK",
        "UNI", "AAVE", "SNX", "CRV", "MKR", "COMP", "YFI"
    }
    
    # Shill indicators
    SHILL_PATTERNS = [
        "100x potential",
        "moon soon",
        "next [A-Z]+",
        "don't miss",
        "gem alert",
        "alpha leak",
        "insider info",
    ]
    
    def __init__(self, provider: AIProvider | None = None):
        """Initialize the crypto analyzer.
        
        Args:
            provider: AI provider for advanced analysis.
        """
        self.provider = provider
    
    async def analyze_token_sentiment(
        self,
        token: str,
        tweets: list[dict[str, Any]] | None = None,
        *,
        limit: int = 100,
    ) -> TokenSentiment:
        """Analyze sentiment for a specific token.
        
        Args:
            token: Token symbol (e.g., "$BTC" or "BTC").
            tweets: Pre-collected tweets mentioning the token.
            limit: Max tweets to analyze if fetching.
            
        Returns:
            TokenSentiment with analysis.
        """
        # Normalize token symbol
        token = token.upper().lstrip("$")
        
        if not tweets:
            # Would normally fetch tweets here
            logger.warning("No tweets provided - using minimal analysis")
            tweets = []
        
        # Analyze with AI if available
        if self.provider and tweets:
            return await self._analyze_sentiment_with_ai(token, tweets)
        else:
            return self._basic_sentiment_analysis(token, tweets)
    
    async def find_alpha(
        self,
        tweets: list[dict[str, Any]] | None = None,
        *,
        keywords: list[str] | None = None,
        limit: int = 50,
    ) -> list[AlphaTweet]:
        """Find potential alpha tweets.
        
        Args:
            tweets: Pre-collected tweets to analyze.
            keywords: Keywords that might indicate alpha.
            limit: Max alpha tweets to return.
            
        Returns:
            List of potential alpha tweets.
        """
        keywords = keywords or [
            "alpha", "early", "airdrop", "mint", "whitelist",
            "presale", "seed", "insider", "alpha leak"
        ]
        
        if not tweets:
            logger.warning("No tweets provided for alpha search")
            return []
        
        if self.provider:
            return await self._find_alpha_with_ai(tweets, keywords, limit)
        else:
            return self._basic_alpha_detection(tweets, keywords, limit)
    
    async def detect_shills(
        self,
        token: str,
        tweets: list[dict[str, Any]] | None = None,
        *,
        limit: int = 50,
    ) -> list[ShillActivity]:
        """Detect coordinated shilling activity.
        
        Args:
            token: Token to check for shilling.
            tweets: Tweets mentioning the token.
            limit: Max tweets to analyze.
            
        Returns:
            List of detected shill activities.
        """
        token = token.upper().lstrip("$")
        
        if not tweets:
            logger.warning("No tweets provided for shill detection")
            return []
        
        if self.provider:
            return await self._detect_shills_with_ai(token, tweets, limit)
        else:
            return self._basic_shill_detection(token, tweets)
    
    async def analyze_narrative(
        self,
        topic: str,
        tweets: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Analyze the current narrative around a topic.
        
        Args:
            topic: Topic to analyze (token, project, trend).
            tweets: Relevant tweets.
            
        Returns:
            Dict with narrative analysis.
        """
        if not self.provider:
            return {
                "topic": topic,
                "narratives": [],
                "sentiment": "neutral",
                "key_points": [],
            }
        
        tweet_texts = [
            t.get("text", str(t)) if isinstance(t, dict) else str(t)
            for t in (tweets or [])[:20]
        ]
        
        system_prompt = """Analyze the crypto Twitter narrative around this topic.

Identify:
1. Main narratives being pushed
2. Overall sentiment
3. Key talking points
4. Potential misinformation

Format:
NARRATIVES: [narrative1, narrative2, ...]
SENTIMENT: [bullish/bearish/neutral/mixed]
KEY_POINTS: [point1, point2, ...]
WARNINGS: [warning1, warning2, ...]"""

        context = f"Topic: {topic}\n\nRecent tweets:\n" + "\n".join(tweet_texts)
        
        response = await self.provider.generate(
            context,
            system_prompt=system_prompt,
            max_tokens=300,
        )
        
        return self._parse_narrative(topic, response.content)
    
    async def _analyze_sentiment_with_ai(
        self,
        token: str,
        tweets: list[dict[str, Any]],
    ) -> TokenSentiment:
        """Analyze token sentiment using AI."""
        tweet_texts = [
            t.get("text", str(t)) if isinstance(t, dict) else str(t)
            for t in tweets[:30]
        ]
        
        authors = [
            t.get("author", t.get("username", "unknown"))
            if isinstance(t, dict) else "unknown"
            for t in tweets[:30]
        ]
        
        system_prompt = f"""Analyze the sentiment for ${token} based on these tweets.

Provide:
SENTIMENT_SCORE: [-1 to 1]
SENTIMENT_LABEL: [bullish/bearish/neutral]
TRENDING: [true/false]
INFLUENCERS: [top 3 influential accounts]
NARRATIVES: [main narratives]
WARNINGS: [any warning signs like pump signals]"""

        context = f"Token: ${token}\n\nTweets:\n" + "\n".join(
            f"@{a}: {t[:200]}" for a, t in zip(authors, tweet_texts)
        )
        
        response = await self.provider.generate(
            context,
            system_prompt=system_prompt,
            max_tokens=300,
        )
        
        return self._parse_token_sentiment(token, len(tweets), response.content)
    
    def _basic_sentiment_analysis(
        self,
        token: str,
        tweets: list[dict[str, Any]],
    ) -> TokenSentiment:
        """Basic sentiment analysis without AI."""
        bullish_words = {"bullish", "moon", "pump", "ath", "buy", "long", "wagmi"}
        bearish_words = {"bearish", "dump", "crash", "sell", "short", "ngmi", "rug"}
        
        bullish_count = 0
        bearish_count = 0
        
        for tweet in tweets:
            text = tweet.get("text", str(tweet)).lower() if isinstance(tweet, dict) else str(tweet).lower()
            bullish_count += sum(1 for w in bullish_words if w in text)
            bearish_count += sum(1 for w in bearish_words if w in text)
        
        total = bullish_count + bearish_count
        if total > 0:
            sentiment_score = (bullish_count - bearish_count) / total
        else:
            sentiment_score = 0.0
        
        if sentiment_score > 0.2:
            label = "bullish"
        elif sentiment_score < -0.2:
            label = "bearish"
        else:
            label = "neutral"
        
        return TokenSentiment(
            token=f"${token}",
            overall_sentiment=sentiment_score,
            sentiment_label=label,
            volume=len(tweets),
            trending=len(tweets) > 50,
            key_influencers=[],
            common_narratives=[],
            warning_signs=[],
        )
    
    async def _find_alpha_with_ai(
        self,
        tweets: list[dict[str, Any]],
        keywords: list[str],
        limit: int,
    ) -> list[AlphaTweet]:
        """Find alpha using AI."""
        # Pre-filter tweets that might contain alpha
        candidates = []
        for tweet in tweets:
            text = tweet.get("text", str(tweet)).lower() if isinstance(tweet, dict) else str(tweet).lower()
            if any(kw.lower() in text for kw in keywords):
                candidates.append(tweet)
        
        if not candidates:
            return []
        
        system_prompt = """Analyze these tweets for potential crypto alpha.

For each tweet that contains valuable/actionable information, score it.
Focus on: early projects, airdrops, yield opportunities, insider insights.

Format each as:
TWEET: [first 100 chars]
ALPHA_SCORE: [0-1]
CATEGORY: [early_project/airdrop/insight/opportunity/other]
TOKENS: [tokens mentioned]
ACTIONABLE: [true/false]
URGENCY: [high/medium/low]
---"""

        tweet_texts = [
            f"@{t.get('author', 'anon')}: {t.get('text', str(t))[:200]}"
            if isinstance(t, dict) else str(t)[:200]
            for t in candidates[:20]
        ]
        
        response = await self.provider.generate(
            "\n".join(tweet_texts),
            system_prompt=system_prompt,
            max_tokens=limit * 80,
        )
        
        return self._parse_alpha_tweets(candidates, response.content, limit)
    
    def _basic_alpha_detection(
        self,
        tweets: list[dict[str, Any]],
        keywords: list[str],
        limit: int,
    ) -> list[AlphaTweet]:
        """Basic alpha detection without AI."""
        alpha_tweets = []
        
        for tweet in tweets:
            if isinstance(tweet, dict):
                text = tweet.get("text", "")
                author = tweet.get("author", tweet.get("username", "unknown"))
                tweet_id = tweet.get("id", str(hash(text)))
            else:
                text = str(tweet)
                author = "unknown"
                tweet_id = str(hash(text))
            
            text_lower = text.lower()
            
            # Count keyword matches
            matches = sum(1 for kw in keywords if kw.lower() in text_lower)
            
            if matches > 0:
                alpha_score = min(1.0, matches * 0.2)
                
                # Detect category
                if "airdrop" in text_lower:
                    category = "airdrop"
                elif "mint" in text_lower or "nft" in text_lower:
                    category = "early_project"
                else:
                    category = "insight"
                
                # Extract mentioned tokens
                import re
                tokens = re.findall(r'\$([A-Z]{2,10})', text.upper())
                
                alpha_tweets.append(AlphaTweet(
                    tweet_id=tweet_id,
                    text=text,
                    author=author,
                    alpha_score=alpha_score,
                    category=category,
                    tokens_mentioned=tokens,
                    actionable=matches > 1,
                    urgency="medium",
                ))
        
        # Sort by alpha score
        alpha_tweets.sort(key=lambda x: x.alpha_score, reverse=True)
        return alpha_tweets[:limit]
    
    async def _detect_shills_with_ai(
        self,
        token: str,
        tweets: list[dict[str, Any]],
        limit: int,
    ) -> list[ShillActivity]:
        """Detect shills using AI."""
        # Group by author to find patterns
        by_author: dict[str, list] = {}
        for tweet in tweets:
            if isinstance(tweet, dict):
                author = tweet.get("author", tweet.get("username", "unknown"))
                by_author.setdefault(author, []).append(tweet)
        
        # Find suspicious authors (multiple similar tweets)
        suspicious = {
            author: posts
            for author, posts in by_author.items()
            if len(posts) > 2
        }
        
        if not suspicious:
            return []
        
        system_prompt = f"""Analyze these tweets about ${token} for coordinated shilling.

Look for:
- Repeated similar messages
- Unrealistic claims (100x, moon, etc.)
- Suspicious timing patterns
- Low-quality accounts promoting

Format:
CONFIDENCE: [0-1]
EVIDENCE: [evidence1, evidence2]
ACCOUNTS: [account1, account2]
PATTERN: [description of timing pattern]
RECOMMENDATION: [what to do]"""

        context = f"Token: ${token}\n\nSuspicious posting patterns:\n"
        for author, posts in list(suspicious.items())[:5]:
            context += f"\n@{author} ({len(posts)} posts):\n"
            for p in posts[:3]:
                text = p.get("text", str(p))[:150] if isinstance(p, dict) else str(p)[:150]
                context += f"  - {text}\n"
        
        response = await self.provider.generate(
            context,
            system_prompt=system_prompt,
            max_tokens=300,
        )
        
        return [self._parse_shill_activity(token, response.content)]
    
    def _basic_shill_detection(
        self,
        token: str,
        tweets: list[dict[str, Any]],
    ) -> list[ShillActivity]:
        """Basic shill detection without AI."""
        import re
        
        shill_indicators = []
        suspicious_accounts = []
        
        for tweet in tweets:
            if isinstance(tweet, dict):
                text = tweet.get("text", "")
                author = tweet.get("author", "unknown")
            else:
                text = str(tweet)
                author = "unknown"
            
            text_lower = text.lower()
            
            # Check for shill patterns
            for pattern in self.SHILL_PATTERNS:
                if re.search(pattern, text_lower, re.IGNORECASE):
                    shill_indicators.append(pattern)
                    if author not in suspicious_accounts:
                        suspicious_accounts.append(author)
        
        if not shill_indicators:
            return []
        
        return [ShillActivity(
            token=f"${token}",
            confidence=min(1.0, len(shill_indicators) * 0.15),
            evidence=list(set(shill_indicators))[:5],
            accounts_involved=suspicious_accounts[:10],
            time_pattern="unknown",
            recommendation="Exercise caution - potential coordinated promotion detected",
        )]
    
    def _parse_token_sentiment(
        self,
        token: str,
        volume: int,
        content: str,
    ) -> TokenSentiment:
        """Parse token sentiment from AI response."""
        sentiment_score = 0.0
        sentiment_label = "neutral"
        trending = False
        influencers = []
        narratives = []
        warnings = []
        
        for line in content.split("\n"):
            line = line.strip()
            if line.upper().startswith("SENTIMENT_SCORE:"):
                try:
                    sentiment_score = float(line.split(":", 1)[1].strip())
                except ValueError:
                    pass
            elif line.upper().startswith("SENTIMENT_LABEL:"):
                sentiment_label = line.split(":", 1)[1].strip().lower()
            elif line.upper().startswith("TRENDING:"):
                trending = line.split(":", 1)[1].strip().lower() == "true"
            elif line.upper().startswith("INFLUENCERS:"):
                inf_str = line.split(":", 1)[1].strip()
                influencers = [i.strip().strip("[]@") for i in inf_str.split(",")]
            elif line.upper().startswith("NARRATIVES:"):
                narr_str = line.split(":", 1)[1].strip()
                narratives = [n.strip().strip("[]") for n in narr_str.split(",")]
            elif line.upper().startswith("WARNINGS:"):
                warn_str = line.split(":", 1)[1].strip()
                if warn_str.lower() != "none":
                    warnings = [w.strip().strip("[]") for w in warn_str.split(",")]
        
        return TokenSentiment(
            token=f"${token}",
            overall_sentiment=sentiment_score,
            sentiment_label=sentiment_label,
            volume=volume,
            trending=trending,
            key_influencers=influencers,
            common_narratives=narratives,
            warning_signs=warnings,
        )
    
    def _parse_alpha_tweets(
        self,
        candidates: list[dict[str, Any]],
        content: str,
        limit: int,
    ) -> list[AlphaTweet]:
        """Parse alpha tweets from AI response."""
        alpha_tweets = []
        
        for block in content.split("---"):
            block = block.strip()
            if not block:
                continue
            
            alpha_score = 0.0
            category = "other"
            tokens = []
            actionable = False
            urgency = "medium"
            tweet_text = ""
            
            for line in block.split("\n"):
                line = line.strip()
                if line.upper().startswith("TWEET:"):
                    tweet_text = line.split(":", 1)[1].strip()
                elif line.upper().startswith("ALPHA_SCORE:"):
                    try:
                        alpha_score = float(line.split(":", 1)[1].strip())
                    except ValueError:
                        pass
                elif line.upper().startswith("CATEGORY:"):
                    category = line.split(":", 1)[1].strip().lower()
                elif line.upper().startswith("TOKENS:"):
                    tok_str = line.split(":", 1)[1].strip()
                    tokens = [t.strip().strip("[]$") for t in tok_str.split(",")]
                elif line.upper().startswith("ACTIONABLE:"):
                    actionable = line.split(":", 1)[1].strip().lower() == "true"
                elif line.upper().startswith("URGENCY:"):
                    urgency = line.split(":", 1)[1].strip().lower()
            
            if alpha_score > 0.3:
                # Try to find matching candidate
                matched = None
                for c in candidates:
                    c_text = c.get("text", str(c)) if isinstance(c, dict) else str(c)
                    if tweet_text.lower() in c_text.lower()[:150]:
                        matched = c
                        break
                
                if matched:
                    if isinstance(matched, dict):
                        full_text = matched.get("text", "")
                        author = matched.get("author", "unknown")
                        tweet_id = matched.get("id", str(hash(full_text)))
                    else:
                        full_text = str(matched)
                        author = "unknown"
                        tweet_id = str(hash(full_text))
                else:
                    full_text = tweet_text
                    author = "unknown"
                    tweet_id = str(hash(tweet_text))
                
                alpha_tweets.append(AlphaTweet(
                    tweet_id=tweet_id,
                    text=full_text,
                    author=author,
                    alpha_score=alpha_score,
                    category=category,
                    tokens_mentioned=tokens,
                    actionable=actionable,
                    urgency=urgency,
                ))
        
        alpha_tweets.sort(key=lambda x: x.alpha_score, reverse=True)
        return alpha_tweets[:limit]
    
    def _parse_shill_activity(
        self,
        token: str,
        content: str,
    ) -> ShillActivity:
        """Parse shill activity from AI response."""
        confidence = 0.5
        evidence = []
        accounts = []
        pattern = "unknown"
        recommendation = "Exercise caution"
        
        for line in content.split("\n"):
            line = line.strip()
            if line.upper().startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.split(":", 1)[1].strip())
                except ValueError:
                    pass
            elif line.upper().startswith("EVIDENCE:"):
                ev_str = line.split(":", 1)[1].strip()
                evidence = [e.strip().strip("[]") for e in ev_str.split(",")]
            elif line.upper().startswith("ACCOUNTS:"):
                acc_str = line.split(":", 1)[1].strip()
                accounts = [a.strip().strip("[]@") for a in acc_str.split(",")]
            elif line.upper().startswith("PATTERN:"):
                pattern = line.split(":", 1)[1].strip()
            elif line.upper().startswith("RECOMMENDATION:"):
                recommendation = line.split(":", 1)[1].strip()
        
        return ShillActivity(
            token=f"${token}",
            confidence=confidence,
            evidence=evidence,
            accounts_involved=accounts,
            time_pattern=pattern,
            recommendation=recommendation,
        )
    
    def _parse_narrative(
        self,
        topic: str,
        content: str,
    ) -> dict[str, Any]:
        """Parse narrative analysis from AI response."""
        narratives = []
        sentiment = "neutral"
        key_points = []
        warnings = []
        
        for line in content.split("\n"):
            line = line.strip()
            if line.upper().startswith("NARRATIVES:"):
                narr_str = line.split(":", 1)[1].strip()
                narratives = [n.strip().strip("[]") for n in narr_str.split(",")]
            elif line.upper().startswith("SENTIMENT:"):
                sentiment = line.split(":", 1)[1].strip().lower()
            elif line.upper().startswith("KEY_POINTS:"):
                pts_str = line.split(":", 1)[1].strip()
                key_points = [p.strip().strip("[]") for p in pts_str.split(",")]
            elif line.upper().startswith("WARNINGS:"):
                warn_str = line.split(":", 1)[1].strip()
                if warn_str.lower() != "none":
                    warnings = [w.strip().strip("[]") for w in warn_str.split(",")]
        
        return {
            "topic": topic,
            "narratives": narratives,
            "sentiment": sentiment,
            "key_points": key_points,
            "warnings": warnings,
        }

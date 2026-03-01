"""
Spam/Bot Detector for Xeepy.

Detect spam accounts, bots, and fake followers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from loguru import logger

from xeepy.ai.providers.base import AIProvider


@dataclass
class BotScore:
    """Bot/spam detection result for a user.
    
    Attributes:
        username: The username analyzed.
        bot_probability: Probability of being a bot (0-1).
        spam_probability: Probability of being spam (0-1).
        fake_probability: Probability of being a fake account (0-1).
        quality_score: Overall account quality score (0-100).
        red_flags: List of detected red flags.
        evidence: Supporting evidence for the assessment.
    """
    username: str
    bot_probability: float
    spam_probability: float
    fake_probability: float
    quality_score: float
    red_flags: list[str] = field(default_factory=list)
    evidence: dict[str, Any] = field(default_factory=dict)


@dataclass
class FollowerQualityReport:
    """Report on follower quality for an account.
    
    Attributes:
        username: The account analyzed.
        total_analyzed: Number of followers analyzed.
        quality_breakdown: Distribution of follower quality.
        bot_percentage: Percentage of likely bots.
        fake_percentage: Percentage of likely fake accounts.
        average_quality: Average follower quality score.
        suspicious_accounts: List of suspicious followers.
        recommendations: Recommendations for improving follower quality.
    """
    username: str
    total_analyzed: int
    quality_breakdown: dict[str, int]  # {'high': X, 'medium': Y, 'low': Z}
    bot_percentage: float
    fake_percentage: float
    average_quality: float
    suspicious_accounts: list[BotScore]
    recommendations: list[str]


class SpamDetector:
    """Detect spam accounts and bots.
    
    Uses heuristics and AI to identify:
    - Bot accounts
    - Spam accounts
    - Fake followers
    - Low-quality accounts
    
    Example:
        ```python
        from xeepy.ai import SpamDetector
        from xeepy.ai.providers import OpenAIProvider
        
        detector = SpamDetector(OpenAIProvider())
        
        score = await detector.analyze_user(username="suspicious_account")
        print(f"Bot probability: {score.bot_probability}")
        print(f"Red flags: {score.red_flags}")
        ```
    """
    
    # Heuristic thresholds
    SUSPICIOUS_FOLLOWER_RATIO = 50  # Following/followers ratio
    MIN_ACCOUNT_AGE_DAYS = 30
    MIN_TWEETS_FOR_REAL = 10
    SUSPICIOUS_USERNAME_PATTERNS = [
        r"\d{5,}$",  # Ends with 5+ digits
        r"^[a-z]{3,}\d{4,}$",  # Short name + numbers
    ]
    
    def __init__(self, provider: AIProvider | None = None):
        """Initialize the spam detector.
        
        Args:
            provider: AI provider for advanced analysis.
        """
        self.provider = provider
    
    async def analyze_user(
        self,
        username: str | None = None,
        profile_data: dict[str, Any] | None = None,
    ) -> BotScore:
        """Analyze if a user is likely a bot/spam.
        
        Args:
            username: Username to analyze.
            profile_data: Pre-fetched profile data (optional).
            
        Returns:
            BotScore with analysis results.
        
        Note:
            Provide either username (will fetch data) or profile_data.
        """
        if profile_data is None and username is None:
            raise ValueError("Must provide either username or profile_data")
        
        # Use provided data or create minimal structure
        data = profile_data or {"username": username}
        
        red_flags = []
        evidence = {}
        
        # Heuristic analysis
        heuristic_scores = self._analyze_heuristics(data, red_flags, evidence)
        
        # AI analysis if provider available
        if self.provider and profile_data:
            ai_scores = await self._analyze_with_ai(data)
            
            # Combine scores (weighted average)
            bot_prob = 0.4 * heuristic_scores["bot"] + 0.6 * ai_scores["bot"]
            spam_prob = 0.4 * heuristic_scores["spam"] + 0.6 * ai_scores["spam"]
            fake_prob = 0.4 * heuristic_scores["fake"] + 0.6 * ai_scores["fake"]
            
            red_flags.extend(ai_scores.get("red_flags", []))
        else:
            bot_prob = heuristic_scores["bot"]
            spam_prob = heuristic_scores["spam"]
            fake_prob = heuristic_scores["fake"]
        
        # Calculate quality score (inverse of problems)
        avg_problem = (bot_prob + spam_prob + fake_prob) / 3
        quality_score = max(0, 100 * (1 - avg_problem))
        
        return BotScore(
            username=data.get("username", username or "unknown"),
            bot_probability=round(bot_prob, 3),
            spam_probability=round(spam_prob, 3),
            fake_probability=round(fake_prob, 3),
            quality_score=round(quality_score, 1),
            red_flags=list(set(red_flags)),  # Deduplicate
            evidence=evidence,
        )
    
    async def analyze_followers(
        self,
        followers: list[dict[str, Any]],
        username: str,
        *,
        sample_size: int | None = None,
    ) -> FollowerQualityReport:
        """Analyze quality of followers.
        
        Args:
            followers: List of follower profile data.
            username: The account whose followers are being analyzed.
            sample_size: Max followers to analyze (for performance).
            
        Returns:
            FollowerQualityReport with analysis.
        """
        # Sample if needed
        if sample_size and len(followers) > sample_size:
            import random
            followers = random.sample(followers, sample_size)
        
        # Analyze each follower
        scores = []
        quality_breakdown = {"high": 0, "medium": 0, "low": 0}
        suspicious = []
        
        for follower in followers:
            score = await self.analyze_user(profile_data=follower)
            scores.append(score)
            
            # Categorize quality
            if score.quality_score >= 70:
                quality_breakdown["high"] += 1
            elif score.quality_score >= 40:
                quality_breakdown["medium"] += 1
            else:
                quality_breakdown["low"] += 1
            
            # Track suspicious accounts
            if score.bot_probability > 0.6 or score.spam_probability > 0.6:
                suspicious.append(score)
        
        # Calculate statistics
        total = len(scores)
        bot_count = sum(1 for s in scores if s.bot_probability > 0.5)
        fake_count = sum(1 for s in scores if s.fake_probability > 0.5)
        avg_quality = sum(s.quality_score for s in scores) / total if total else 0
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            bot_pct=bot_count / total if total else 0,
            fake_pct=fake_count / total if total else 0,
            low_quality_pct=quality_breakdown["low"] / total if total else 0,
        )
        
        return FollowerQualityReport(
            username=username,
            total_analyzed=total,
            quality_breakdown=quality_breakdown,
            bot_percentage=round(100 * bot_count / total, 1) if total else 0,
            fake_percentage=round(100 * fake_count / total, 1) if total else 0,
            average_quality=round(avg_quality, 1),
            suspicious_accounts=suspicious[:20],  # Limit to top 20
            recommendations=recommendations,
        )
    
    def _analyze_heuristics(
        self,
        data: dict[str, Any],
        red_flags: list[str],
        evidence: dict[str, Any],
    ) -> dict[str, float]:
        """Analyze user using heuristics.
        
        Returns dict with bot, spam, fake probabilities.
        """
        import re
        
        bot_score = 0.0
        spam_score = 0.0
        fake_score = 0.0
        
        username = data.get("username", "")
        
        # Username patterns
        for pattern in self.SUSPICIOUS_USERNAME_PATTERNS:
            if re.search(pattern, username):
                bot_score += 0.2
                red_flags.append(f"Suspicious username pattern: {pattern}")
                evidence["username_pattern"] = pattern
        
        # Profile completeness
        has_bio = bool(data.get("bio", "").strip())
        has_avatar = bool(data.get("avatar") or data.get("profile_image"))
        has_banner = bool(data.get("banner") or data.get("profile_banner"))
        
        if not has_bio:
            fake_score += 0.15
            red_flags.append("No bio")
        if not has_avatar:
            fake_score += 0.2
            red_flags.append("Default avatar")
        if not has_banner:
            fake_score += 0.1
        
        # Follower/following ratio
        followers = data.get("followers_count", data.get("followers", 0))
        following = data.get("following_count", data.get("following", 0))
        
        if isinstance(followers, int) and isinstance(following, int):
            if followers > 0 and following > 0:
                ratio = following / followers
                evidence["follow_ratio"] = ratio
                
                if ratio > self.SUSPICIOUS_FOLLOWER_RATIO:
                    spam_score += 0.3
                    red_flags.append(f"Very high following/followers ratio: {ratio:.1f}")
                elif ratio > 10:
                    spam_score += 0.15
                    red_flags.append(f"High following/followers ratio: {ratio:.1f}")
            
            if following > 5000 and followers < 100:
                spam_score += 0.3
                red_flags.append("Mass following with few followers")
        
        # Account age
        created_at = data.get("created_at")
        if created_at:
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                except ValueError:
                    created_at = None
            
            if created_at:
                age_days = (datetime.now(created_at.tzinfo or None) - created_at).days
                evidence["account_age_days"] = age_days
                
                if age_days < 7:
                    bot_score += 0.25
                    red_flags.append("Very new account (< 7 days)")
                elif age_days < self.MIN_ACCOUNT_AGE_DAYS:
                    bot_score += 0.1
                    red_flags.append(f"New account (< {self.MIN_ACCOUNT_AGE_DAYS} days)")
        
        # Tweet count
        tweets = data.get("tweets_count", data.get("statuses_count", 0))
        if isinstance(tweets, int):
            evidence["tweet_count"] = tweets
            
            if tweets < self.MIN_TWEETS_FOR_REAL:
                fake_score += 0.15
                red_flags.append(f"Very few tweets: {tweets}")
        
        # Engagement indicators
        if data.get("verified"):
            bot_score -= 0.3
            spam_score -= 0.3
            fake_score -= 0.3
        
        # Normalize scores to 0-1 range
        bot_score = max(0, min(1, bot_score))
        spam_score = max(0, min(1, spam_score))
        fake_score = max(0, min(1, fake_score))
        
        return {
            "bot": bot_score,
            "spam": spam_score,
            "fake": fake_score,
        }
    
    async def _analyze_with_ai(
        self,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        """Analyze user using AI."""
        # Build profile summary for AI
        profile_summary = f"""Username: {data.get('username', 'unknown')}
Bio: {data.get('bio', 'None')}
Followers: {data.get('followers_count', data.get('followers', 'unknown'))}
Following: {data.get('following_count', data.get('following', 'unknown'))}
Tweets: {data.get('tweets_count', data.get('statuses_count', 'unknown'))}
Account created: {data.get('created_at', 'unknown')}
Verified: {data.get('verified', False)}"""

        # Add recent tweets if available
        recent_tweets = data.get("recent_tweets", [])
        if recent_tweets:
            profile_summary += "\n\nRecent tweets:\n"
            for tweet in recent_tweets[:5]:
                if isinstance(tweet, dict):
                    profile_summary += f"- {tweet.get('text', str(tweet)[:100])}\n"
                else:
                    profile_summary += f"- {str(tweet)[:100]}\n"
        
        system_prompt = """Analyze this Twitter profile to detect if it's a bot, spam, or fake account.

Respond in this exact format:
BOT: [0.0-1.0]
SPAM: [0.0-1.0]
FAKE: [0.0-1.0]
RED_FLAGS: [comma-separated list or "none"]

Only respond with the analysis."""

        response = await self.provider.generate(
            profile_summary,
            system_prompt=system_prompt,
            max_tokens=200,
        )
        
        # Parse response
        result = {
            "bot": 0.3,
            "spam": 0.3,
            "fake": 0.3,
            "red_flags": [],
        }
        
        for line in response.content.split("\n"):
            line = line.strip().upper()
            if line.startswith("BOT:"):
                try:
                    result["bot"] = float(line.split(":", 1)[1].strip())
                except ValueError:
                    pass
            elif line.startswith("SPAM:"):
                try:
                    result["spam"] = float(line.split(":", 1)[1].strip())
                except ValueError:
                    pass
            elif line.startswith("FAKE:"):
                try:
                    result["fake"] = float(line.split(":", 1)[1].strip())
                except ValueError:
                    pass
            elif line.startswith("RED_FLAGS:"):
                flags = line.split(":", 1)[1].strip()
                if flags.lower() != "none":
                    result["red_flags"] = [f.strip() for f in flags.split(",")]
        
        return result
    
    def _generate_recommendations(
        self,
        bot_pct: float,
        fake_pct: float,
        low_quality_pct: float,
    ) -> list[str]:
        """Generate recommendations based on analysis."""
        recommendations = []
        
        if bot_pct > 0.2:
            recommendations.append(
                f"High bot percentage ({bot_pct*100:.0f}%). Consider removing "
                "suspicious followers or investigating their source."
            )
        
        if fake_pct > 0.15:
            recommendations.append(
                f"Notable fake account percentage ({fake_pct*100:.0f}%). "
                "These may be purchased followers or bot networks."
            )
        
        if low_quality_pct > 0.3:
            recommendations.append(
                f"Many low-quality followers ({low_quality_pct*100:.0f}%). "
                "Focus on organic growth strategies for better engagement."
            )
        
        if not recommendations:
            recommendations.append(
                "Follower quality looks healthy! Continue current growth strategies."
            )
        
        return recommendations

"""
Smart Targeting for Xeepy.

AI-powered targeting recommendations for follower growth.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from loguru import logger

from xeepy.ai.providers.base import AIProvider


@dataclass
class TargetRecommendation:
    """Recommendation for a target account to engage with.
    
    Attributes:
        username: The recommended username.
        score: Overall recommendation score (0-100).
        reasons: Why this account is recommended.
        recommended_actions: Suggested engagement actions.
        estimated_follow_back_chance: Estimated chance they'll follow back.
        priority: Engagement priority ('high', 'medium', 'low').
    """
    username: str
    score: float
    reasons: list[str]
    recommended_actions: list[str]
    estimated_follow_back_chance: float
    priority: str = "medium"


@dataclass
class TargetAnalysis:
    """Deep analysis of a potential target account.
    
    Attributes:
        username: The analyzed username.
        engagement_rate: Their engagement rate.
        content_relevance: How relevant their content is (0-1).
        audience_overlap: Estimated audience overlap (0-1).
        best_engagement_times: Best times to engage.
        content_themes: Their main content themes.
        engagement_style: How they typically engage.
        recommended_approach: How to best approach this account.
    """
    username: str
    engagement_rate: float
    content_relevance: float
    audience_overlap: float
    best_engagement_times: list[str]
    content_themes: list[str]
    engagement_style: str
    recommended_approach: str


@dataclass
class TargetingStrategy:
    """Overall targeting strategy.
    
    Attributes:
        niche: Target niche.
        goals: Targeting goals.
        recommended_hashtags: Hashtags to follow/engage with.
        recommended_keywords: Keywords to search for.
        accounts_to_follow: Accounts to follow.
        accounts_to_engage: Accounts to actively engage with.
        content_strategy: Content recommendations.
    """
    niche: str
    goals: list[str]
    recommended_hashtags: list[str]
    recommended_keywords: list[str]
    accounts_to_follow: list[TargetRecommendation]
    accounts_to_engage: list[TargetRecommendation]
    content_strategy: list[str]


class SmartTargeting:
    """AI-powered targeting recommendations.
    
    Find the best accounts to follow and engage with based on
    your niche, goals, and existing audience.
    
    Example:
        ```python
        from xeepy.ai import SmartTargeting
        from xeepy.ai.providers import OpenAIProvider
        
        targeting = SmartTargeting(OpenAIProvider())
        
        targets = await targeting.find_targets(
            niche="AI/ML",
            goal="growth",
            limit=20,
        )
        
        for target in targets:
            print(f"{target.username}: {target.score}/100")
            print(f"  Actions: {', '.join(target.recommended_actions)}")
        ```
    """
    
    # Goal configurations
    GOALS = {
        "growth": {
            "description": "Maximize follower growth",
            "metrics": ["follow_back_chance", "engagement_rate", "audience_size"],
            "actions": ["follow", "like", "reply"],
        },
        "engagement": {
            "description": "Build genuine relationships",
            "metrics": ["engagement_rate", "content_relevance", "interaction_quality"],
            "actions": ["reply", "quote", "dm"],
        },
        "sales": {
            "description": "Find potential customers",
            "metrics": ["buyer_signals", "budget_indicators", "problem_awareness"],
            "actions": ["dm", "reply", "offer_value"],
        },
        "network": {
            "description": "Connect with industry peers",
            "metrics": ["authority", "mutual_connections", "content_relevance"],
            "actions": ["engage", "collaborate", "share"],
        },
    }
    
    def __init__(self, provider: AIProvider | None = None):
        """Initialize smart targeting.
        
        Args:
            provider: AI provider for advanced analysis.
        """
        self.provider = provider
    
    async def find_targets(
        self,
        niche: str,
        *,
        goal: str = "growth",
        existing_accounts: list[dict[str, Any]] | None = None,
        limit: int = 50,
        min_followers: int = 100,
        max_followers: int = 100000,
    ) -> list[TargetRecommendation]:
        """Find recommended accounts to engage with.
        
        Args:
            niche: The niche/industry to target.
            goal: Goal type ('growth', 'engagement', 'sales', 'network').
            existing_accounts: Accounts already in this niche (for reference).
            limit: Maximum recommendations to return.
            min_followers: Minimum follower count for targets.
            max_followers: Maximum follower count for targets.
            
        Returns:
            List of target recommendations.
        """
        if not self.provider:
            logger.warning("No AI provider - returning basic recommendations")
            return self._basic_recommendations(niche, limit)
        
        goal_config = self.GOALS.get(goal, self.GOALS["growth"])
        
        system_prompt = f"""You are an expert Twitter growth strategist.

Goal: {goal_config['description']}
Key metrics: {', '.join(goal_config['metrics'])}
Recommended actions: {', '.join(goal_config['actions'])}

Generate a list of {limit} account recommendations for the "{niche}" niche.

For each account, provide:
1. A realistic Twitter username (make them up based on common patterns in this niche)
2. A recommendation score (0-100)
3. Reasons why they're a good target
4. Recommended engagement actions
5. Estimated follow-back chance (0-1)
6. Priority (high/medium/low)

Format each as:
USERNAME: @example
SCORE: 85
REASONS: [reason1, reason2]
ACTIONS: [action1, action2]
FOLLOW_BACK: 0.6
PRIORITY: high
---"""

        context = f"Niche: {niche}\nGoal: {goal}\nFollower range: {min_followers}-{max_followers}"
        
        if existing_accounts:
            sample = existing_accounts[:5]
            context += f"\n\nExample accounts in niche: {', '.join(str(a.get('username', a)) for a in sample)}"
        
        response = await self.provider.generate(
            context,
            system_prompt=system_prompt,
            max_tokens=limit * 100,
        )
        
        # Parse recommendations
        recommendations = self._parse_recommendations(response.content)
        
        return recommendations[:limit]
    
    async def analyze_target(
        self,
        profile_data: dict[str, Any],
        *,
        your_niche: str | None = None,
    ) -> TargetAnalysis:
        """Deep analysis of a potential target account.
        
        Args:
            profile_data: Target account profile data.
            your_niche: Your niche for relevance scoring.
            
        Returns:
            TargetAnalysis with detailed insights.
        """
        username = profile_data.get("username", "unknown")
        
        if not self.provider:
            return self._basic_analysis(profile_data)
        
        # Build profile summary
        profile_summary = f"""Username: {username}
Bio: {profile_data.get('bio', 'None')}
Followers: {profile_data.get('followers_count', profile_data.get('followers', 'unknown'))}
Following: {profile_data.get('following_count', profile_data.get('following', 'unknown'))}
Tweets: {profile_data.get('tweets_count', 'unknown')}"""

        recent_tweets = profile_data.get("recent_tweets", [])
        if recent_tweets:
            profile_summary += "\n\nRecent tweets:\n"
            for tweet in recent_tweets[:5]:
                text = tweet.get("text", str(tweet)) if isinstance(tweet, dict) else str(tweet)
                profile_summary += f"- {text[:150]}\n"
        
        if your_niche:
            profile_summary += f"\n\nYour niche: {your_niche}"
        
        system_prompt = """Analyze this Twitter account as a potential engagement target.

Provide:
ENGAGEMENT_RATE: [estimated rate 0-10%]
CONTENT_RELEVANCE: [0-1]
AUDIENCE_OVERLAP: [0-1]
BEST_TIMES: [list of best times to engage]
THEMES: [main content themes]
ENGAGEMENT_STYLE: [how they engage - responsive/selective/passive]
RECOMMENDED_APPROACH: [how to best engage with them]"""

        response = await self.provider.generate(
            profile_summary,
            system_prompt=system_prompt,
            max_tokens=300,
        )
        
        return self._parse_analysis(username, response.content)
    
    async def generate_strategy(
        self,
        niche: str,
        *,
        goals: list[str] | None = None,
        current_followers: int = 0,
        target_growth: int = 1000,
    ) -> TargetingStrategy:
        """Generate a comprehensive targeting strategy.
        
        Args:
            niche: Your niche/industry.
            goals: Specific goals (defaults to general growth).
            current_followers: Your current follower count.
            target_growth: Target follower growth.
            
        Returns:
            TargetingStrategy with comprehensive recommendations.
        """
        goals = goals or ["growth", "engagement"]
        
        if not self.provider:
            return self._basic_strategy(niche, goals)
        
        system_prompt = """Create a comprehensive Twitter targeting strategy.

Include:
1. Top 5 hashtags to follow/engage with
2. Top 5 keywords to search for
3. Types of accounts to follow (with examples)
4. Types of accounts to actively engage with
5. Content strategy recommendations

Format:
HASHTAGS: [#tag1, #tag2, ...]
KEYWORDS: [keyword1, keyword2, ...]
FOLLOW_ACCOUNTS: [type1, type2, ...]
ENGAGE_ACCOUNTS: [type1, type2, ...]
CONTENT_STRATEGY: [strategy1, strategy2, ...]"""

        context = f"""Niche: {niche}
Goals: {', '.join(goals)}
Current followers: {current_followers}
Target growth: {target_growth}"""

        response = await self.provider.generate(
            context,
            system_prompt=system_prompt,
            max_tokens=500,
        )
        
        return self._parse_strategy(niche, goals, response.content)
    
    def _parse_recommendations(self, content: str) -> list[TargetRecommendation]:
        """Parse recommendations from AI response."""
        recommendations = []
        
        # Split by separator
        blocks = content.split("---")
        
        for block in blocks:
            block = block.strip()
            if not block:
                continue
            
            username = ""
            score = 50.0
            reasons = []
            actions = []
            follow_back = 0.3
            priority = "medium"
            
            for line in block.split("\n"):
                line = line.strip()
                if line.upper().startswith("USERNAME:"):
                    username = line.split(":", 1)[1].strip().lstrip("@")
                elif line.upper().startswith("SCORE:"):
                    try:
                        score = float(line.split(":", 1)[1].strip())
                    except ValueError:
                        pass
                elif line.upper().startswith("REASONS:"):
                    reasons_str = line.split(":", 1)[1].strip()
                    reasons = [r.strip().strip("[]") for r in reasons_str.split(",")]
                elif line.upper().startswith("ACTIONS:"):
                    actions_str = line.split(":", 1)[1].strip()
                    actions = [a.strip().strip("[]") for a in actions_str.split(",")]
                elif line.upper().startswith("FOLLOW_BACK:"):
                    try:
                        follow_back = float(line.split(":", 1)[1].strip())
                    except ValueError:
                        pass
                elif line.upper().startswith("PRIORITY:"):
                    priority = line.split(":", 1)[1].strip().lower()
            
            if username:
                recommendations.append(TargetRecommendation(
                    username=username,
                    score=score,
                    reasons=reasons or ["Relevant to niche"],
                    recommended_actions=actions or ["follow", "engage"],
                    estimated_follow_back_chance=follow_back,
                    priority=priority,
                ))
        
        return recommendations
    
    def _parse_analysis(self, username: str, content: str) -> TargetAnalysis:
        """Parse analysis from AI response."""
        engagement_rate = 0.02
        content_relevance = 0.5
        audience_overlap = 0.3
        best_times = ["9am", "12pm", "6pm"]
        themes = []
        engagement_style = "responsive"
        recommended_approach = "Engage thoughtfully with their content"
        
        for line in content.split("\n"):
            line = line.strip()
            if line.upper().startswith("ENGAGEMENT_RATE:"):
                try:
                    rate_str = line.split(":", 1)[1].strip().rstrip("%")
                    engagement_rate = float(rate_str) / 100
                except ValueError:
                    pass
            elif line.upper().startswith("CONTENT_RELEVANCE:"):
                try:
                    content_relevance = float(line.split(":", 1)[1].strip())
                except ValueError:
                    pass
            elif line.upper().startswith("AUDIENCE_OVERLAP:"):
                try:
                    audience_overlap = float(line.split(":", 1)[1].strip())
                except ValueError:
                    pass
            elif line.upper().startswith("BEST_TIMES:"):
                times_str = line.split(":", 1)[1].strip()
                best_times = [t.strip().strip("[]") for t in times_str.split(",")]
            elif line.upper().startswith("THEMES:"):
                themes_str = line.split(":", 1)[1].strip()
                themes = [t.strip().strip("[]") for t in themes_str.split(",")]
            elif line.upper().startswith("ENGAGEMENT_STYLE:"):
                engagement_style = line.split(":", 1)[1].strip()
            elif line.upper().startswith("RECOMMENDED_APPROACH:"):
                recommended_approach = line.split(":", 1)[1].strip()
        
        return TargetAnalysis(
            username=username,
            engagement_rate=engagement_rate,
            content_relevance=content_relevance,
            audience_overlap=audience_overlap,
            best_engagement_times=best_times,
            content_themes=themes,
            engagement_style=engagement_style,
            recommended_approach=recommended_approach,
        )
    
    def _parse_strategy(
        self,
        niche: str,
        goals: list[str],
        content: str,
    ) -> TargetingStrategy:
        """Parse strategy from AI response."""
        hashtags = []
        keywords = []
        follow_types = []
        engage_types = []
        content_strategy = []
        
        for line in content.split("\n"):
            line = line.strip()
            if line.upper().startswith("HASHTAGS:"):
                tags = line.split(":", 1)[1].strip()
                hashtags = [t.strip().strip("[]#") for t in tags.split(",")]
            elif line.upper().startswith("KEYWORDS:"):
                kws = line.split(":", 1)[1].strip()
                keywords = [k.strip().strip("[]") for k in kws.split(",")]
            elif line.upper().startswith("FOLLOW_ACCOUNTS:"):
                types = line.split(":", 1)[1].strip()
                follow_types = [t.strip().strip("[]") for t in types.split(",")]
            elif line.upper().startswith("ENGAGE_ACCOUNTS:"):
                types = line.split(":", 1)[1].strip()
                engage_types = [t.strip().strip("[]") for t in types.split(",")]
            elif line.upper().startswith("CONTENT_STRATEGY:"):
                strats = line.split(":", 1)[1].strip()
                content_strategy = [s.strip().strip("[]") for s in strats.split(",")]
        
        # Create placeholder recommendations
        follow_recs = [
            TargetRecommendation(
                username=f"{niche.lower().replace(' ', '')}_account",
                score=70,
                reasons=[f"Relevant {t}" for t in follow_types[:1]],
                recommended_actions=["follow"],
                estimated_follow_back_chance=0.4,
            )
            for _ in follow_types[:3]
        ] if follow_types else []
        
        engage_recs = [
            TargetRecommendation(
                username=f"{niche.lower().replace(' ', '')}_influencer",
                score=80,
                reasons=[f"High engagement {t}" for t in engage_types[:1]],
                recommended_actions=["reply", "like", "retweet"],
                estimated_follow_back_chance=0.2,
            )
            for _ in engage_types[:3]
        ] if engage_types else []
        
        return TargetingStrategy(
            niche=niche,
            goals=goals,
            recommended_hashtags=hashtags,
            recommended_keywords=keywords,
            accounts_to_follow=follow_recs,
            accounts_to_engage=engage_recs,
            content_strategy=content_strategy,
        )
    
    def _basic_recommendations(
        self,
        niche: str,
        limit: int,
    ) -> list[TargetRecommendation]:
        """Generate basic recommendations without AI."""
        return [
            TargetRecommendation(
                username=f"{niche.lower().replace(' ', '_')}_example_{i}",
                score=70 - i * 5,
                reasons=[f"Relevant to {niche}"],
                recommended_actions=["follow", "engage"],
                estimated_follow_back_chance=0.3,
            )
            for i in range(min(limit, 5))
        ]
    
    def _basic_analysis(self, profile_data: dict[str, Any]) -> TargetAnalysis:
        """Generate basic analysis without AI."""
        username = profile_data.get("username", "unknown")
        return TargetAnalysis(
            username=username,
            engagement_rate=0.02,
            content_relevance=0.5,
            audience_overlap=0.3,
            best_engagement_times=["morning", "lunch", "evening"],
            content_themes=["general"],
            engagement_style="unknown",
            recommended_approach="Engage naturally with their content",
        )
    
    def _basic_strategy(
        self,
        niche: str,
        goals: list[str],
    ) -> TargetingStrategy:
        """Generate basic strategy without AI."""
        niche_tag = niche.lower().replace(" ", "")
        return TargetingStrategy(
            niche=niche,
            goals=goals,
            recommended_hashtags=[f"#{niche_tag}", "#tech", "#startup"],
            recommended_keywords=[niche, "tips", "growth"],
            accounts_to_follow=[],
            accounts_to_engage=[],
            content_strategy=[
                "Share valuable content daily",
                "Engage with others in your niche",
                "Be consistent with posting times",
            ],
        )

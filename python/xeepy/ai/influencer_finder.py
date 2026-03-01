"""
Influencer Finder for Xeepy.

Identify and analyze influencers in any niche.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from loguru import logger

from xeepy.ai.providers.base import AIProvider


@dataclass
class Influencer:
    """Information about an identified influencer.
    
    Attributes:
        username: The influencer's username.
        display_name: Their display name.
        followers: Follower count.
        engagement_rate: Their engagement rate.
        niche_relevance: How relevant they are to the niche (0-1).
        influence_score: Overall influence score (0-100).
        content_themes: Main content themes.
        posting_frequency: How often they post.
        best_for: What they're best for (awareness, engagement, etc.).
        contact_difficulty: How hard to reach ('easy', 'medium', 'hard').
    """
    username: str
    display_name: str
    followers: int
    engagement_rate: float
    niche_relevance: float
    influence_score: float
    content_themes: list[str]
    posting_frequency: str
    best_for: list[str]
    contact_difficulty: str = "medium"


@dataclass
class InfluencerTier:
    """Categorized tier of influencers.
    
    Attributes:
        name: Tier name ('mega', 'macro', 'micro', 'nano').
        follower_range: Follower count range for this tier.
        typical_engagement: Typical engagement rate for tier.
        influencers: Influencers in this tier.
        pros: Advantages of this tier.
        cons: Disadvantages of this tier.
    """
    name: str
    follower_range: tuple[int, int]
    typical_engagement: str
    influencers: list[Influencer]
    pros: list[str]
    cons: list[str]


@dataclass
class InfluencerReport:
    """Comprehensive influencer analysis report.
    
    Attributes:
        niche: The analyzed niche.
        total_found: Total influencers found.
        tiers: Influencers organized by tier.
        top_recommendations: Top recommended influencers.
        emerging_voices: Rising influencers to watch.
        insights: Key insights about the niche.
    """
    niche: str
    total_found: int
    tiers: dict[str, InfluencerTier]
    top_recommendations: list[Influencer]
    emerging_voices: list[Influencer]
    insights: list[str]


class InfluencerFinder:
    """Find and analyze influencers in any niche.
    
    Identifies key opinion leaders, analyzes their influence,
    and provides recommendations for engagement.
    
    Example:
        ```python
        from xeepy.ai import InfluencerFinder
        from xeepy.ai.providers import OpenAIProvider
        
        finder = InfluencerFinder(OpenAIProvider())
        
        # Find influencers in a niche
        influencers = await finder.find_influencers(
            niche="AI/Machine Learning",
            limit=20,
        )
        
        for inf in influencers:
            print(f"@{inf.username}: {inf.influence_score}/100")
        ```
    """
    
    # Influencer tier definitions
    TIERS = {
        "mega": {
            "range": (1_000_000, float("inf")),
            "engagement": "1-3%",
            "pros": ["Massive reach", "High credibility", "Brand recognition"],
            "cons": ["Expensive", "Less accessible", "Lower engagement rate"],
        },
        "macro": {
            "range": (100_000, 1_000_000),
            "engagement": "3-5%",
            "pros": ["Large reach", "Professional content", "Established authority"],
            "cons": ["Still expensive", "Saturated with partnerships"],
        },
        "micro": {
            "range": (10_000, 100_000),
            "engagement": "5-10%",
            "pros": ["High engagement", "Niche authority", "Affordable"],
            "cons": ["Limited reach", "May lack professionalism"],
        },
        "nano": {
            "range": (1_000, 10_000),
            "engagement": "8-15%",
            "pros": ["Very high engagement", "Authentic connections", "Cost-effective"],
            "cons": ["Very limited reach", "Inconsistent posting"],
        },
    }
    
    def __init__(self, provider: AIProvider | None = None):
        """Initialize the influencer finder.
        
        Args:
            provider: AI provider for advanced analysis.
        """
        self.provider = provider
    
    async def find_influencers(
        self,
        niche: str,
        *,
        accounts: list[dict[str, Any]] | None = None,
        limit: int = 20,
        min_followers: int = 1000,
        min_engagement: float = 0.01,
    ) -> list[Influencer]:
        """Find influencers in a specific niche.
        
        Args:
            niche: The niche/industry to search.
            accounts: Pre-collected accounts to analyze.
            limit: Maximum influencers to return.
            min_followers: Minimum follower count.
            min_engagement: Minimum engagement rate.
            
        Returns:
            List of identified influencers.
        """
        if accounts:
            # Analyze provided accounts
            influencers = []
            for account in accounts:
                inf = await self.analyze_influencer(account, niche)
                if inf.followers >= min_followers and inf.engagement_rate >= min_engagement:
                    influencers.append(inf)
            
            # Sort by influence score
            influencers.sort(key=lambda x: x.influence_score, reverse=True)
            return influencers[:limit]
        
        # Generate recommendations using AI
        if self.provider:
            return await self._find_with_ai(niche, limit, min_followers)
        else:
            return self._generate_placeholder_influencers(niche, limit)
    
    async def analyze_influencer(
        self,
        profile_data: dict[str, Any],
        niche: str | None = None,
    ) -> Influencer:
        """Analyze a single account as a potential influencer.
        
        Args:
            profile_data: Account profile data.
            niche: Niche for relevance scoring.
            
        Returns:
            Influencer analysis.
        """
        username = profile_data.get("username", "unknown")
        display_name = profile_data.get("name", profile_data.get("display_name", username))
        followers = profile_data.get("followers_count", profile_data.get("followers", 0))
        
        # Calculate engagement rate if we have the data
        total_tweets = profile_data.get("tweets_count", profile_data.get("statuses_count", 0))
        avg_likes = profile_data.get("avg_likes", 0)
        avg_retweets = profile_data.get("avg_retweets", 0)
        
        if followers > 0 and (avg_likes or avg_retweets):
            engagement_rate = (avg_likes + avg_retweets) / followers
        else:
            engagement_rate = 0.03  # Default estimate
        
        # Use AI for deeper analysis if available
        if self.provider:
            return await self._analyze_with_ai(profile_data, niche, engagement_rate)
        else:
            return self._basic_analysis(
                username, display_name, followers, engagement_rate, niche
            )
    
    async def generate_report(
        self,
        niche: str,
        accounts: list[dict[str, Any]] | None = None,
        *,
        limit: int = 50,
    ) -> InfluencerReport:
        """Generate a comprehensive influencer report for a niche.
        
        Args:
            niche: The niche to analyze.
            accounts: Pre-collected accounts.
            limit: Max influencers to include.
            
        Returns:
            InfluencerReport with comprehensive analysis.
        """
        # Find all influencers
        influencers = await self.find_influencers(
            niche,
            accounts=accounts,
            limit=limit,
            min_followers=1000,
        )
        
        # Organize by tier
        tiers = {}
        for tier_name, tier_config in self.TIERS.items():
            tier_range = tier_config["range"]
            tier_influencers = [
                inf for inf in influencers
                if tier_range[0] <= inf.followers < tier_range[1]
            ]
            
            tiers[tier_name] = InfluencerTier(
                name=tier_name,
                follower_range=tier_range,
                typical_engagement=tier_config["engagement"],
                influencers=tier_influencers,
                pros=tier_config["pros"],
                cons=tier_config["cons"],
            )
        
        # Get top recommendations
        top_recs = sorted(
            influencers,
            key=lambda x: x.influence_score * x.niche_relevance,
            reverse=True,
        )[:10]
        
        # Find emerging voices (high engagement, lower followers)
        emerging = sorted(
            [inf for inf in influencers if inf.followers < 50000],
            key=lambda x: x.engagement_rate,
            reverse=True,
        )[:5]
        
        # Generate insights
        insights = self._generate_insights(niche, influencers, tiers)
        
        return InfluencerReport(
            niche=niche,
            total_found=len(influencers),
            tiers=tiers,
            top_recommendations=top_recs,
            emerging_voices=emerging,
            insights=insights,
        )
    
    async def _find_with_ai(
        self,
        niche: str,
        limit: int,
        min_followers: int,
    ) -> list[Influencer]:
        """Find influencers using AI."""
        system_prompt = f"""Generate a list of {limit} realistic Twitter influencer profiles in the "{niche}" niche.

For each influencer, provide:
USERNAME: @example
DISPLAY_NAME: Example Name
FOLLOWERS: [number]
ENGAGEMENT_RATE: [0.01-0.15]
NICHE_RELEVANCE: [0-1]
INFLUENCE_SCORE: [0-100]
THEMES: [theme1, theme2, theme3]
POSTING_FREQ: [daily/few times a week/weekly]
BEST_FOR: [awareness/engagement/conversions/education]
CONTACT: [easy/medium/hard]
---

Make the profiles realistic for this niche. Include a mix of tier sizes.
Minimum followers: {min_followers}"""

        response = await self.provider.generate(
            f"Generate influencer profiles for: {niche}",
            system_prompt=system_prompt,
            max_tokens=limit * 150,
        )
        
        return self._parse_influencers(response.content, limit)
    
    async def _analyze_with_ai(
        self,
        profile_data: dict[str, Any],
        niche: str | None,
        engagement_rate: float,
    ) -> Influencer:
        """Analyze influencer using AI."""
        username = profile_data.get("username", "unknown")
        display_name = profile_data.get("name", profile_data.get("display_name", username))
        followers = profile_data.get("followers_count", profile_data.get("followers", 0))
        bio = profile_data.get("bio", profile_data.get("description", ""))
        
        recent_tweets = profile_data.get("recent_tweets", [])
        tweets_text = ""
        if recent_tweets:
            tweets_text = "\n".join(
                t.get("text", str(t))[:100] if isinstance(t, dict) else str(t)[:100]
                for t in recent_tweets[:5]
            )
        
        system_prompt = """Analyze this Twitter account as an influencer.

Provide:
NICHE_RELEVANCE: [0-1]
INFLUENCE_SCORE: [0-100]
THEMES: [theme1, theme2, theme3]
POSTING_FREQ: [daily/few times a week/weekly/sporadic]
BEST_FOR: [awareness/engagement/conversions/education/entertainment]
CONTACT: [easy/medium/hard]"""

        context = f"""Username: @{username}
Display Name: {display_name}
Followers: {followers}
Engagement Rate: {engagement_rate:.2%}
Bio: {bio}
{"Target niche: " + niche if niche else ""}
{"Recent tweets:" + chr(10) + tweets_text if tweets_text else ""}"""

        response = await self.provider.generate(
            context,
            system_prompt=system_prompt,
            max_tokens=200,
        )
        
        # Parse response
        niche_relevance = 0.5
        influence_score = 50.0
        themes = []
        posting_freq = "unknown"
        best_for = []
        contact = "medium"
        
        for line in response.content.split("\n"):
            line = line.strip()
            if line.upper().startswith("NICHE_RELEVANCE:"):
                try:
                    niche_relevance = float(line.split(":", 1)[1].strip())
                except ValueError:
                    pass
            elif line.upper().startswith("INFLUENCE_SCORE:"):
                try:
                    influence_score = float(line.split(":", 1)[1].strip())
                except ValueError:
                    pass
            elif line.upper().startswith("THEMES:"):
                themes_str = line.split(":", 1)[1].strip()
                themes = [t.strip().strip("[]") for t in themes_str.split(",")]
            elif line.upper().startswith("POSTING_FREQ:"):
                posting_freq = line.split(":", 1)[1].strip().lower()
            elif line.upper().startswith("BEST_FOR:"):
                bf_str = line.split(":", 1)[1].strip()
                best_for = [b.strip().strip("[]") for b in bf_str.split(",")]
            elif line.upper().startswith("CONTACT:"):
                contact = line.split(":", 1)[1].strip().lower()
        
        return Influencer(
            username=username,
            display_name=display_name,
            followers=followers,
            engagement_rate=engagement_rate,
            niche_relevance=niche_relevance,
            influence_score=influence_score,
            content_themes=themes,
            posting_frequency=posting_freq,
            best_for=best_for,
            contact_difficulty=contact,
        )
    
    def _basic_analysis(
        self,
        username: str,
        display_name: str,
        followers: int,
        engagement_rate: float,
        niche: str | None,
    ) -> Influencer:
        """Basic influencer analysis without AI."""
        # Calculate influence score based on followers and engagement
        follower_score = min(50, followers / 20000 * 50)  # Max 50 from followers
        engagement_score = min(50, engagement_rate * 500)  # Max 50 from engagement
        influence_score = follower_score + engagement_score
        
        # Estimate posting frequency based on follower count
        if followers > 100000:
            posting_freq = "daily"
        elif followers > 10000:
            posting_freq = "few times a week"
        else:
            posting_freq = "weekly"
        
        # Determine contact difficulty
        if followers < 10000:
            contact = "easy"
        elif followers < 100000:
            contact = "medium"
        else:
            contact = "hard"
        
        return Influencer(
            username=username,
            display_name=display_name,
            followers=followers,
            engagement_rate=engagement_rate,
            niche_relevance=0.5,  # Unknown without AI
            influence_score=influence_score,
            content_themes=[niche] if niche else ["general"],
            posting_frequency=posting_freq,
            best_for=["awareness", "engagement"],
            contact_difficulty=contact,
        )
    
    def _parse_influencers(self, content: str, limit: int) -> list[Influencer]:
        """Parse influencers from AI response."""
        influencers = []
        
        for block in content.split("---"):
            block = block.strip()
            if not block:
                continue
            
            username = ""
            display_name = ""
            followers = 0
            engagement_rate = 0.03
            niche_relevance = 0.5
            influence_score = 50.0
            themes = []
            posting_freq = "unknown"
            best_for = []
            contact = "medium"
            
            for line in block.split("\n"):
                line = line.strip()
                if line.upper().startswith("USERNAME:"):
                    username = line.split(":", 1)[1].strip().lstrip("@")
                elif line.upper().startswith("DISPLAY_NAME:"):
                    display_name = line.split(":", 1)[1].strip()
                elif line.upper().startswith("FOLLOWERS:"):
                    try:
                        fol_str = line.split(":", 1)[1].strip().replace(",", "").replace("K", "000").replace("M", "000000")
                        followers = int(float(fol_str))
                    except ValueError:
                        pass
                elif line.upper().startswith("ENGAGEMENT_RATE:"):
                    try:
                        er_str = line.split(":", 1)[1].strip().rstrip("%")
                        engagement_rate = float(er_str)
                        if engagement_rate > 1:  # Assume percentage
                            engagement_rate /= 100
                    except ValueError:
                        pass
                elif line.upper().startswith("NICHE_RELEVANCE:"):
                    try:
                        niche_relevance = float(line.split(":", 1)[1].strip())
                    except ValueError:
                        pass
                elif line.upper().startswith("INFLUENCE_SCORE:"):
                    try:
                        influence_score = float(line.split(":", 1)[1].strip())
                    except ValueError:
                        pass
                elif line.upper().startswith("THEMES:"):
                    themes_str = line.split(":", 1)[1].strip()
                    themes = [t.strip().strip("[]") for t in themes_str.split(",")]
                elif line.upper().startswith("POSTING_FREQ:"):
                    posting_freq = line.split(":", 1)[1].strip().lower()
                elif line.upper().startswith("BEST_FOR:"):
                    bf_str = line.split(":", 1)[1].strip()
                    best_for = [b.strip().strip("[]") for b in bf_str.split(",")]
                elif line.upper().startswith("CONTACT:"):
                    contact = line.split(":", 1)[1].strip().lower()
            
            if username:
                influencers.append(Influencer(
                    username=username,
                    display_name=display_name or username,
                    followers=followers,
                    engagement_rate=engagement_rate,
                    niche_relevance=niche_relevance,
                    influence_score=influence_score,
                    content_themes=themes,
                    posting_frequency=posting_freq,
                    best_for=best_for,
                    contact_difficulty=contact,
                ))
        
        return influencers[:limit]
    
    def _generate_placeholder_influencers(
        self,
        niche: str,
        limit: int,
    ) -> list[Influencer]:
        """Generate placeholder influencers without AI."""
        niche_slug = niche.lower().replace(" ", "_").replace("/", "_")
        
        return [
            Influencer(
                username=f"{niche_slug}_influencer_{i}",
                display_name=f"{niche} Expert {i}",
                followers=10000 * (limit - i + 1),
                engagement_rate=0.05,
                niche_relevance=0.8,
                influence_score=70 - i * 3,
                content_themes=[niche],
                posting_frequency="daily" if i < 5 else "weekly",
                best_for=["awareness", "engagement"],
                contact_difficulty="medium",
            )
            for i in range(min(limit, 10))
        ]
    
    def _generate_insights(
        self,
        niche: str,
        influencers: list[Influencer],
        tiers: dict[str, InfluencerTier],
    ) -> list[str]:
        """Generate insights from influencer data."""
        insights = []
        
        if not influencers:
            return ["No influencers found in this niche."]
        
        # Average engagement
        avg_engagement = sum(inf.engagement_rate for inf in influencers) / len(influencers)
        insights.append(
            f"Average engagement rate in {niche}: {avg_engagement:.1%}"
        )
        
        # Tier distribution
        micro_count = len(tiers.get("micro", InfluencerTier("", (0, 0), "", [], [], [])).influencers)
        if micro_count > len(influencers) * 0.5:
            insights.append(
                "This niche is dominated by micro-influencers - "
                "great for targeted, authentic engagement."
            )
        
        # Top themes
        all_themes = []
        for inf in influencers:
            all_themes.extend(inf.content_themes)
        
        if all_themes:
            from collections import Counter
            top_themes = Counter(all_themes).most_common(3)
            themes_str = ", ".join(t[0] for t in top_themes)
            insights.append(f"Top content themes: {themes_str}")
        
        # Contact difficulty
        easy_contacts = sum(1 for inf in influencers if inf.contact_difficulty == "easy")
        if easy_contacts > len(influencers) * 0.3:
            insights.append(
                f"{easy_contacts} influencers are relatively easy to contact - "
                "good opportunity for outreach."
            )
        
        return insights

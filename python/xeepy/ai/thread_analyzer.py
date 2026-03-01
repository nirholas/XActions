"""Thread Analyzer - AI-powered analysis of viral Twitter/X threads.

This module provides advanced analytics for threads including:
- Engagement pattern analysis
- Hook effectiveness scoring
- Virality prediction
- Content structure analysis
- Optimal posting time recommendations
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from xeepy.ai.providers.base import AIProvider


class HookType(Enum):
    """Types of thread hooks."""

    QUESTION = "question"
    STATISTIC = "statistic"
    CONTROVERSY = "controversy"
    STORY = "story"
    PROMISE = "promise"
    CURIOSITY_GAP = "curiosity_gap"
    AUTHORITY = "authority"
    URGENCY = "urgency"
    SOCIAL_PROOF = "social_proof"
    UNKNOWN = "unknown"


class ThreadStructure(Enum):
    """Common thread structures."""

    LISTICLE = "listicle"  # "10 things about X"
    STORY = "story"  # Narrative arc
    TUTORIAL = "tutorial"  # How-to guide
    BREAKDOWN = "breakdown"  # Analysis/explanation
    DEBATE = "debate"  # Pros/cons
    TIMELINE = "timeline"  # Chronological events
    CASE_STUDY = "case_study"  # Real example analysis
    PREDICTION = "prediction"  # Future-focused
    MIXED = "mixed"


@dataclass
class ThreadTweet:
    """Individual tweet in a thread."""

    position: int
    text: str
    engagement_score: float = 0.0
    has_media: bool = False
    has_link: bool = False
    word_count: int = 0
    emoji_count: int = 0
    hashtag_count: int = 0
    mention_count: int = 0


@dataclass
class HookAnalysis:
    """Analysis of thread hook (first tweet)."""

    hook_type: HookType
    effectiveness_score: float  # 0-100
    elements: list[str] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)
    emotional_triggers: list[str] = field(default_factory=list)


@dataclass
class EngagementPattern:
    """Engagement pattern analysis."""

    drop_off_points: list[int]  # Tweet positions where engagement drops
    peak_engagement_position: int
    engagement_decay_rate: float  # % drop per tweet
    retention_score: float  # 0-100, how well thread retains readers


@dataclass
class ViralityPrediction:
    """Prediction of thread virality potential."""

    viral_score: float  # 0-100
    confidence: float  # 0-1
    strengths: list[str] = field(default_factory=list)
    weaknesses: list[str] = field(default_factory=list)
    predicted_engagement_range: tuple[int, int] = (0, 0)
    viral_factors: dict[str, float] = field(default_factory=dict)


@dataclass
class ThreadInsights:
    """Comprehensive thread analysis insights."""

    total_tweets: int
    total_words: int
    avg_words_per_tweet: float
    structure: ThreadStructure
    hook_analysis: HookAnalysis
    engagement_pattern: EngagementPattern
    virality_prediction: ViralityPrediction
    optimal_length: int
    cta_effectiveness: float  # Call-to-action score
    readability_score: float
    topic_coherence: float
    pacing_score: float
    recommendations: list[str] = field(default_factory=list)


class ThreadAnalyzer:
    """AI-powered thread analyzer for viral content insights."""

    # Patterns for hook detection
    HOOK_PATTERNS = {
        HookType.QUESTION: [r"\?$", r"^(what|why|how|when|where|who|which)", r"ever wonder"],
        HookType.STATISTIC: [r"\d+%", r"\d+ (out of|in)", r"studies show", r"data shows"],
        HookType.CONTROVERSY: [r"unpopular opinion", r"hot take", r"controversial", r"debate"],
        HookType.STORY: [r"^(i |my |when i)", r"true story", r"let me tell you"],
        HookType.PROMISE: [r"(will|going to) (show|teach|reveal)", r"here's how", r"secret"],
        HookType.CURIOSITY_GAP: [r"you won't believe", r"the truth about", r"what they"],
        HookType.AUTHORITY: [r"years of experience", r"as a \w+", r"expert", r"insider"],
        HookType.URGENCY: [r"before it's too late", r"don't miss", r"limited time", r"now"],
        HookType.SOCIAL_PROOF: [r"million", r"viral", r"everyone", r"trending"],
    }

    # Viral content indicators
    VIRAL_INDICATORS = [
        "surprising", "shocking", "secret", "mistake", "never",
        "always", "best", "worst", "free", "easy", "simple",
        "powerful", "proven", "guaranteed", "exclusive", "rare",
    ]

    def __init__(self, provider: AIProvider | None = None) -> None:
        """Initialize thread analyzer.

        Args:
            provider: AI provider for advanced analysis
        """
        self.provider = provider

    async def analyze(
        self,
        tweets: list[str],
        engagement_data: list[dict[str, int]] | None = None,
    ) -> ThreadInsights:
        """Analyze a thread for insights and optimization opportunities.

        Args:
            tweets: List of tweet texts in order
            engagement_data: Optional engagement metrics per tweet

        Returns:
            Comprehensive thread insights
        """
        if not tweets:
            raise ValueError("Thread must contain at least one tweet")

        # Parse tweets
        parsed_tweets = self._parse_tweets(tweets, engagement_data)

        # Basic metrics
        total_words = sum(t.word_count for t in parsed_tweets)
        avg_words = total_words / len(parsed_tweets)

        # Analyze components
        structure = self._detect_structure(tweets)
        hook_analysis = await self._analyze_hook(tweets[0])
        engagement_pattern = self._analyze_engagement(parsed_tweets, engagement_data)
        virality = await self._predict_virality(tweets, hook_analysis, structure)

        # Calculate scores
        readability = self._calculate_readability(tweets)
        coherence = self._calculate_coherence(tweets)
        pacing = self._calculate_pacing(parsed_tweets)
        cta_score = self._analyze_cta(tweets[-1] if tweets else "")

        # Generate recommendations
        recommendations = await self._generate_recommendations(
            tweets, hook_analysis, engagement_pattern, virality
        )

        return ThreadInsights(
            total_tweets=len(tweets),
            total_words=total_words,
            avg_words_per_tweet=round(avg_words, 1),
            structure=structure,
            hook_analysis=hook_analysis,
            engagement_pattern=engagement_pattern,
            virality_prediction=virality,
            optimal_length=self._calculate_optimal_length(len(tweets), engagement_pattern),
            cta_effectiveness=cta_score,
            readability_score=readability,
            topic_coherence=coherence,
            pacing_score=pacing,
            recommendations=recommendations,
        )

    def _parse_tweets(
        self,
        tweets: list[str],
        engagement_data: list[dict[str, int]] | None,
    ) -> list[ThreadTweet]:
        """Parse tweets into structured format."""
        parsed = []
        for i, text in enumerate(tweets):
            engagement_score = 0.0
            if engagement_data and i < len(engagement_data):
                ed = engagement_data[i]
                engagement_score = (
                    ed.get("likes", 0) * 1
                    + ed.get("retweets", 0) * 2
                    + ed.get("replies", 0) * 1.5
                    + ed.get("bookmarks", 0) * 3
                )

            parsed.append(
                ThreadTweet(
                    position=i + 1,
                    text=text,
                    engagement_score=engagement_score,
                    has_media=bool(re.search(r"(pic\.twitter|t\.co/\w+)", text)),
                    has_link=bool(re.search(r"https?://", text)),
                    word_count=len(text.split()),
                    emoji_count=len(re.findall(r"[\U0001F300-\U0001F9FF]", text)),
                    hashtag_count=len(re.findall(r"#\w+", text)),
                    mention_count=len(re.findall(r"@\w+", text)),
                )
            )
        return parsed

    def _detect_structure(self, tweets: list[str]) -> ThreadStructure:
        """Detect the thread's content structure."""
        combined = " ".join(tweets).lower()
        first_tweet = tweets[0].lower()

        # Listicle detection
        if re.search(r"^\d+[\.\):]|\b(top|best|worst) \d+\b", first_tweet):
            return ThreadStructure.LISTICLE

        # Tutorial detection
        if re.search(r"\b(how to|step|guide|tutorial|learn)\b", first_tweet):
            return ThreadStructure.TUTORIAL

        # Story detection
        if re.search(r"^(i |my |when i |this is the story)", first_tweet):
            return ThreadStructure.STORY

        # Breakdown detection
        if re.search(r"\b(breakdown|analysis|explain|deep dive)\b", first_tweet):
            return ThreadStructure.BREAKDOWN

        # Timeline detection
        if re.search(r"\b(timeline|history|evolution|year)\b", first_tweet):
            return ThreadStructure.TIMELINE

        # Case study detection
        if re.search(r"\b(case study|example|real story|happened)\b", first_tweet):
            return ThreadStructure.CASE_STUDY

        # Prediction detection
        if re.search(r"\b(prediction|future|will happen|expect)\b", first_tweet):
            return ThreadStructure.PREDICTION

        # Debate detection
        if re.search(r"\b(pros|cons|debate|vs|versus|comparison)\b", combined):
            return ThreadStructure.DEBATE

        return ThreadStructure.MIXED

    async def _analyze_hook(self, first_tweet: str) -> HookAnalysis:
        """Analyze the hook (first tweet) effectiveness."""
        text_lower = first_tweet.lower()

        # Detect hook type
        hook_type = HookType.UNKNOWN
        matched_elements = []

        for h_type, patterns in self.HOOK_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    hook_type = h_type
                    matched_elements.append(pattern)
                    break
            if hook_type != HookType.UNKNOWN:
                break

        # Calculate effectiveness score
        score = 50.0  # Base score

        # Bonus for strong hooks
        if hook_type in [HookType.QUESTION, HookType.STORY, HookType.CURIOSITY_GAP]:
            score += 15

        # Check for viral indicators
        viral_count = sum(1 for v in self.VIRAL_INDICATORS if v in text_lower)
        score += min(viral_count * 5, 20)

        # Length bonus (sweet spot: 200-260 chars)
        if 200 <= len(first_tweet) <= 260:
            score += 10
        elif len(first_tweet) < 100:
            score -= 10

        # Emoji bonus
        emoji_count = len(re.findall(r"[\U0001F300-\U0001F9FF]", first_tweet))
        if 1 <= emoji_count <= 3:
            score += 5

        # Detect emotional triggers
        emotional_triggers = []
        trigger_words = {
            "fear": ["afraid", "scary", "warning", "danger", "risk"],
            "curiosity": ["secret", "hidden", "unknown", "mystery", "discover"],
            "excitement": ["amazing", "incredible", "unbelievable", "insane"],
            "urgency": ["now", "today", "immediately", "don't miss"],
            "social": ["everyone", "people", "community", "together"],
        }
        for emotion, words in trigger_words.items():
            if any(w in text_lower for w in words):
                emotional_triggers.append(emotion)

        # Generate suggestions using AI if available
        suggestions = []
        if self.provider:
            suggestions = await self._get_ai_hook_suggestions(first_tweet, hook_type)
        else:
            # Fallback suggestions
            if hook_type == HookType.UNKNOWN:
                suggestions.append("Add a question to create curiosity")
            if len(first_tweet) > 260:
                suggestions.append("Shorten hook for better engagement")
            if emoji_count == 0:
                suggestions.append("Add 1-2 relevant emojis for visibility")

        return HookAnalysis(
            hook_type=hook_type,
            effectiveness_score=min(100, max(0, score)),
            elements=matched_elements,
            suggestions=suggestions,
            emotional_triggers=emotional_triggers,
        )

    async def _get_ai_hook_suggestions(
        self,
        hook: str,
        hook_type: HookType,
    ) -> list[str]:
        """Get AI-powered suggestions for hook improvement."""
        if not self.provider:
            return []

        prompt = f"""Analyze this Twitter thread hook and provide 3 specific suggestions to improve engagement:

Hook: "{hook}"
Detected type: {hook_type.value}

Respond with exactly 3 actionable suggestions, one per line, no numbering."""

        try:
            response = await self.provider.generate(prompt)
            suggestions = [s.strip() for s in response.content.strip().split("\n") if s.strip()]
            return suggestions[:3]
        except Exception:
            return []

    def _analyze_engagement(
        self,
        tweets: list[ThreadTweet],
        engagement_data: list[dict[str, int]] | None,
    ) -> EngagementPattern:
        """Analyze engagement patterns across the thread."""
        if not engagement_data:
            # Return default pattern without real data
            return EngagementPattern(
                drop_off_points=[],
                peak_engagement_position=1,
                engagement_decay_rate=0.0,
                retention_score=50.0,
            )

        scores = [t.engagement_score for t in tweets]
        if not scores or max(scores) == 0:
            return EngagementPattern(
                drop_off_points=[],
                peak_engagement_position=1,
                engagement_decay_rate=0.0,
                retention_score=50.0,
            )

        # Find peak
        peak_pos = scores.index(max(scores)) + 1

        # Find drop-off points (>30% drop from previous)
        drop_offs = []
        for i in range(1, len(scores)):
            if scores[i - 1] > 0:
                drop_pct = (scores[i - 1] - scores[i]) / scores[i - 1]
                if drop_pct > 0.3:
                    drop_offs.append(i + 1)

        # Calculate decay rate
        if len(scores) > 1 and scores[0] > 0:
            final_retention = scores[-1] / scores[0]
            decay_rate = (1 - final_retention) / len(scores) * 100
        else:
            decay_rate = 0.0

        # Retention score
        retention = 50.0
        if scores[0] > 0:
            avg_retention = sum(s / scores[0] for s in scores) / len(scores)
            retention = avg_retention * 100

        return EngagementPattern(
            drop_off_points=drop_offs,
            peak_engagement_position=peak_pos,
            engagement_decay_rate=round(decay_rate, 2),
            retention_score=round(min(100, retention), 1),
        )

    async def _predict_virality(
        self,
        tweets: list[str],
        hook: HookAnalysis,
        structure: ThreadStructure,
    ) -> ViralityPrediction:
        """Predict virality potential of the thread."""
        combined_text = " ".join(tweets).lower()

        # Base factors
        factors = {
            "hook_strength": hook.effectiveness_score / 100,
            "length_optimal": 1.0 if 5 <= len(tweets) <= 15 else 0.7,
            "structure_clarity": 0.8 if structure != ThreadStructure.MIXED else 0.5,
            "emotional_appeal": min(len(hook.emotional_triggers) * 0.2, 0.6) + 0.4,
        }

        # Viral indicator presence
        viral_count = sum(1 for v in self.VIRAL_INDICATORS if v in combined_text)
        factors["viral_language"] = min(viral_count * 0.1, 0.8)

        # Content quality signals
        has_data = bool(re.search(r"\d+%|\d+ (out of|in \d+)", combined_text))
        has_examples = bool(re.search(r"(for example|such as|like when)", combined_text))
        factors["credibility"] = 0.5 + (0.25 if has_data else 0) + (0.25 if has_examples else 0)

        # Calculate weighted score
        weights = {
            "hook_strength": 0.25,
            "length_optimal": 0.15,
            "structure_clarity": 0.15,
            "emotional_appeal": 0.20,
            "viral_language": 0.10,
            "credibility": 0.15,
        }

        viral_score = sum(factors[k] * weights[k] for k in factors) * 100

        # Generate strengths/weaknesses
        strengths = []
        weaknesses = []

        if factors["hook_strength"] > 0.7:
            strengths.append("Strong opening hook")
        else:
            weaknesses.append("Hook could be more compelling")

        if factors["emotional_appeal"] > 0.6:
            strengths.append("Good emotional resonance")

        if factors["credibility"] > 0.7:
            strengths.append("Includes data/examples for credibility")
        else:
            weaknesses.append("Add data or examples for credibility")

        if structure == ThreadStructure.LISTICLE:
            strengths.append("Listicle format performs well")
        elif structure == ThreadStructure.STORY:
            strengths.append("Story format creates engagement")

        if len(tweets) > 20:
            weaknesses.append("Thread may be too long for retention")
        elif len(tweets) < 4:
            weaknesses.append("Thread may be too short for value delivery")

        # Predict engagement range
        base_engagement = int(viral_score * 10)
        low = max(0, base_engagement - 200)
        high = base_engagement + 500

        return ViralityPrediction(
            viral_score=round(viral_score, 1),
            confidence=0.65,  # Moderate confidence without real data
            strengths=strengths,
            weaknesses=weaknesses,
            predicted_engagement_range=(low, high),
            viral_factors=factors,
        )

    def _calculate_readability(self, tweets: list[str]) -> float:
        """Calculate readability score (0-100)."""
        combined = " ".join(tweets)
        words = combined.split()
        sentences = re.split(r"[.!?]+", combined)
        sentences = [s for s in sentences if s.strip()]

        if not words or not sentences:
            return 50.0

        avg_words_per_sentence = len(words) / len(sentences)
        avg_word_length = sum(len(w) for w in words) / len(words)

        # Flesch-like scoring (simplified)
        score = 100 - (avg_words_per_sentence * 1.5) - (avg_word_length * 5)
        return max(0, min(100, score))

    def _calculate_coherence(self, tweets: list[str]) -> float:
        """Calculate topic coherence score (0-100)."""
        if len(tweets) < 2:
            return 100.0

        # Extract key terms from each tweet
        all_words = []
        tweet_words = []
        for tweet in tweets:
            words = set(re.findall(r"\b[a-z]{4,}\b", tweet.lower()))
            tweet_words.append(words)
            all_words.extend(words)

        if not all_words:
            return 50.0

        # Calculate term overlap between consecutive tweets
        overlaps = []
        for i in range(len(tweet_words) - 1):
            if tweet_words[i] and tweet_words[i + 1]:
                overlap = len(tweet_words[i] & tweet_words[i + 1])
                union = len(tweet_words[i] | tweet_words[i + 1])
                overlaps.append(overlap / union if union > 0 else 0)

        if not overlaps:
            return 50.0

        return min(100, (sum(overlaps) / len(overlaps)) * 200)

    def _calculate_pacing(self, tweets: list[ThreadTweet]) -> float:
        """Calculate pacing score based on tweet length variation."""
        if len(tweets) < 2:
            return 100.0

        lengths = [t.word_count for t in tweets]
        avg_length = sum(lengths) / len(lengths)

        if avg_length == 0:
            return 50.0

        # Calculate variance
        variance = sum((l - avg_length) ** 2 for l in lengths) / len(lengths)
        std_dev = variance ** 0.5

        # Good pacing has moderate variance (not too uniform, not too chaotic)
        ideal_std = avg_length * 0.3
        deviation_from_ideal = abs(std_dev - ideal_std)

        score = 100 - (deviation_from_ideal / avg_length * 50)
        return max(0, min(100, score))

    def _analyze_cta(self, last_tweet: str) -> float:
        """Analyze call-to-action effectiveness."""
        text_lower = last_tweet.lower()
        score = 30.0  # Base score

        # CTA patterns
        cta_patterns = [
            (r"\bfollow\b", 20),
            (r"\bretweet\b|\brt\b", 15),
            (r"\blike\b", 10),
            (r"\bshare\b", 15),
            (r"\bcomment\b|\breply\b", 15),
            (r"\bsubscribe\b|\bnewsletter\b", 15),
            (r"\bcheck out\b|\blink\b", 10),
            (r"\bdm\b|\bmessage\b", 10),
            (r"\bif you (liked|enjoyed|found)", 15),
        ]

        for pattern, bonus in cta_patterns:
            if re.search(pattern, text_lower):
                score += bonus

        return min(100, score)

    def _calculate_optimal_length(
        self,
        current_length: int,
        engagement: EngagementPattern,
    ) -> int:
        """Calculate optimal thread length based on engagement patterns."""
        # General research suggests 7-15 tweets is optimal
        if engagement.drop_off_points:
            # Suggest ending before first major drop-off
            return min(engagement.drop_off_points[0] - 1, current_length)

        if current_length < 5:
            return 7  # Suggest expanding
        elif current_length > 20:
            return 15  # Suggest trimming
        else:
            return current_length  # Length is good

    async def _generate_recommendations(
        self,
        tweets: list[str],
        hook: HookAnalysis,
        engagement: EngagementPattern,
        virality: ViralityPrediction,
    ) -> list[str]:
        """Generate actionable recommendations."""
        recommendations = []

        # Hook recommendations
        if hook.effectiveness_score < 70:
            recommendations.extend(hook.suggestions[:2])

        # Length recommendations
        if len(tweets) > 20:
            recommendations.append(
                f"Consider shortening to {min(15, len(tweets) - 5)} tweets for better retention"
            )
        elif len(tweets) < 5:
            recommendations.append("Expand thread to at least 5-7 tweets for more value")

        # Engagement recommendations
        if engagement.drop_off_points:
            pos = engagement.drop_off_points[0]
            recommendations.append(
                f"Tweet #{pos} shows engagement drop - add hook/media/question to re-engage"
            )

        # Virality recommendations
        recommendations.extend(virality.weaknesses[:2])

        # AI-powered recommendations
        if self.provider and len(recommendations) < 5:
            ai_recs = await self._get_ai_recommendations(tweets, virality.viral_score)
            recommendations.extend(ai_recs)

        return recommendations[:7]  # Limit to top 7

    async def _get_ai_recommendations(
        self,
        tweets: list[str],
        viral_score: float,
    ) -> list[str]:
        """Get AI-powered recommendations."""
        if not self.provider:
            return []

        prompt = f"""Analyze this Twitter thread and provide 2 specific recommendations to increase virality.

Thread (first 3 tweets):
{chr(10).join(tweets[:3])}

Current virality score: {viral_score}/100

Provide exactly 2 actionable, specific recommendations (one per line)."""

        try:
            response = await self.provider.generate(prompt)
            recs = [r.strip() for r in response.content.strip().split("\n") if r.strip()]
            return recs[:2]
        except Exception:
            return []

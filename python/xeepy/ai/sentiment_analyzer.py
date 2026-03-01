"""
Sentiment Analyzer for Xeepy.

Analyze sentiment of tweets, conversations, and mentions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from loguru import logger

from xeepy.ai.providers.base import AIProvider


@dataclass
class SentimentResult:
    """Result of sentiment analysis for a single text.
    
    Attributes:
        text: The analyzed text.
        score: Sentiment score from -1 (negative) to 1 (positive).
        label: Classification label ('positive', 'negative', 'neutral').
        confidence: Confidence in the classification (0-1).
        emotions: Detected emotions with their intensities.
    """
    text: str
    score: float
    label: str
    confidence: float
    emotions: dict[str, float] = field(default_factory=dict)


@dataclass
class ConversationSentiment:
    """Sentiment analysis for a conversation/thread.
    
    Attributes:
        overall_score: Overall sentiment score.
        overall_label: Overall classification.
        tweet_sentiments: Individual tweet sentiments.
        dominant_emotion: Most prevalent emotion.
        sentiment_trend: How sentiment changes through conversation.
        toxicity_score: How toxic the conversation is (0-1).
    """
    overall_score: float
    overall_label: str
    tweet_sentiments: list[SentimentResult]
    dominant_emotion: str
    sentiment_trend: str  # 'improving', 'declining', 'stable', 'volatile'
    toxicity_score: float = 0.0


@dataclass
class MentionsSentiment:
    """Sentiment analysis for mentions of a user.
    
    Attributes:
        username: The username analyzed.
        total_mentions: Total mentions analyzed.
        positive_count: Number of positive mentions.
        negative_count: Number of negative mentions.
        neutral_count: Number of neutral mentions.
        average_score: Average sentiment score.
        most_positive: Most positive mentions.
        most_negative: Most negative mentions.
        common_themes: Common themes in mentions.
    """
    username: str
    total_mentions: int
    positive_count: int
    negative_count: int
    neutral_count: int
    average_score: float
    most_positive: list[SentimentResult]
    most_negative: list[SentimentResult]
    common_themes: list[str]


class SentimentAnalyzer:
    """Analyze sentiment of tweets and conversations.
    
    Supports both AI-powered analysis (via provider) and local
    analysis using VADER when no provider is configured.
    
    Example:
        ```python
        from xeepy.ai import SentimentAnalyzer
        from xeepy.ai.providers import OpenAIProvider
        
        provider = OpenAIProvider()
        analyzer = SentimentAnalyzer(provider)
        
        result = await analyzer.analyze_tweet("I love this product!")
        print(f"Sentiment: {result.label} ({result.score})")
        ```
    """
    
    # Emotion categories
    EMOTIONS = [
        "joy", "sadness", "anger", "fear", "surprise",
        "disgust", "anticipation", "trust"
    ]
    
    def __init__(self, provider: AIProvider | None = None):
        """Initialize the sentiment analyzer.
        
        Args:
            provider: AI provider for analysis. If None, uses local VADER.
        """
        self.provider = provider
        self._vader = None
    
    async def analyze_tweet(
        self,
        tweet_text: str,
        *,
        include_emotions: bool = True,
    ) -> SentimentResult:
        """Analyze sentiment of a single tweet.
        
        Args:
            tweet_text: The tweet text to analyze.
            include_emotions: Whether to detect specific emotions.
            
        Returns:
            SentimentResult with analysis.
        """
        if self.provider:
            return await self._analyze_with_ai(tweet_text, include_emotions)
        else:
            return await self._analyze_with_vader(tweet_text)
    
    async def analyze_conversation(
        self,
        tweets: list[str],
    ) -> ConversationSentiment:
        """Analyze overall sentiment of a conversation/thread.
        
        Args:
            tweets: List of tweet texts in conversation order.
            
        Returns:
            ConversationSentiment with analysis.
        """
        # Analyze individual tweets
        sentiments = []
        for tweet in tweets:
            result = await self.analyze_tweet(tweet)
            sentiments.append(result)
        
        # Calculate overall metrics
        scores = [s.score for s in sentiments]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        # Determine overall label
        if avg_score > 0.1:
            overall_label = "positive"
        elif avg_score < -0.1:
            overall_label = "negative"
        else:
            overall_label = "neutral"
        
        # Aggregate emotions
        all_emotions: dict[str, float] = {}
        for s in sentiments:
            for emotion, value in s.emotions.items():
                all_emotions[emotion] = all_emotions.get(emotion, 0) + value
        
        dominant_emotion = max(all_emotions, key=all_emotions.get) if all_emotions else "neutral"
        
        # Determine sentiment trend
        trend = self._calculate_trend(scores)
        
        # Calculate toxicity
        toxicity = await self._calculate_toxicity(tweets)
        
        return ConversationSentiment(
            overall_score=avg_score,
            overall_label=overall_label,
            tweet_sentiments=sentiments,
            dominant_emotion=dominant_emotion,
            sentiment_trend=trend,
            toxicity_score=toxicity,
        )
    
    async def analyze_mentions(
        self,
        mentions: list[str],
        username: str,
        *,
        top_n: int = 5,
    ) -> MentionsSentiment:
        """Analyze sentiment of mentions for a user.
        
        Args:
            mentions: List of mention texts.
            username: The username being mentioned.
            top_n: Number of top positive/negative to return.
            
        Returns:
            MentionsSentiment with analysis.
        """
        sentiments = []
        for mention in mentions:
            result = await self.analyze_tweet(mention)
            sentiments.append(result)
        
        # Categorize
        positive = [s for s in sentiments if s.label == "positive"]
        negative = [s for s in sentiments if s.label == "negative"]
        neutral = [s for s in sentiments if s.label == "neutral"]
        
        # Sort for top mentions
        sorted_positive = sorted(positive, key=lambda x: x.score, reverse=True)
        sorted_negative = sorted(negative, key=lambda x: x.score)
        
        # Calculate average
        scores = [s.score for s in sentiments]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        # Extract common themes
        themes = await self._extract_themes(mentions) if self.provider else []
        
        return MentionsSentiment(
            username=username,
            total_mentions=len(mentions),
            positive_count=len(positive),
            negative_count=len(negative),
            neutral_count=len(neutral),
            average_score=avg_score,
            most_positive=sorted_positive[:top_n],
            most_negative=sorted_negative[:top_n],
            common_themes=themes,
        )
    
    async def _analyze_with_ai(
        self,
        text: str,
        include_emotions: bool,
    ) -> SentimentResult:
        """Analyze sentiment using AI provider."""
        emotion_instruction = ""
        if include_emotions:
            emotion_instruction = f"""
Also rate these emotions (0-1):
{", ".join(self.EMOTIONS)}"""
        
        system_prompt = f"""Analyze the sentiment of the given text.

Respond in this exact format:
SCORE: [number from -1 to 1]
LABEL: [positive/negative/neutral]
CONFIDENCE: [number from 0 to 1]
{emotion_instruction if include_emotions else ""}

Only respond with the analysis, no explanations."""

        response = await self.provider.generate(
            f"Text: \"{text}\"",
            system_prompt=system_prompt,
            max_tokens=200,
        )
        
        # Parse response
        content = response.content.upper()
        
        score = 0.0
        label = "neutral"
        confidence = 0.5
        emotions = {}
        
        for line in content.split("\n"):
            line = line.strip()
            if line.startswith("SCORE:"):
                try:
                    score = float(line.split(":", 1)[1].strip())
                    score = max(-1, min(1, score))
                except ValueError:
                    pass
            elif line.startswith("LABEL:"):
                label = line.split(":", 1)[1].strip().lower()
                if label not in ["positive", "negative", "neutral"]:
                    label = "neutral"
            elif line.startswith("CONFIDENCE:"):
                try:
                    confidence = float(line.split(":", 1)[1].strip())
                    confidence = max(0, min(1, confidence))
                except ValueError:
                    pass
            elif ":" in line and include_emotions:
                # Check for emotion
                parts = line.split(":", 1)
                emotion = parts[0].strip().lower()
                if emotion in self.EMOTIONS:
                    try:
                        value = float(parts[1].strip())
                        emotions[emotion] = max(0, min(1, value))
                    except ValueError:
                        pass
        
        return SentimentResult(
            text=text,
            score=score,
            label=label,
            confidence=confidence,
            emotions=emotions,
        )
    
    async def _analyze_with_vader(self, text: str) -> SentimentResult:
        """Analyze sentiment using VADER (local, no AI)."""
        if self._vader is None:
            try:
                from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
                self._vader = SentimentIntensityAnalyzer()
            except ImportError:
                logger.warning("VADER not installed. Using basic analysis.")
                return self._basic_sentiment(text)
        
        scores = self._vader.polarity_scores(text)
        compound = scores["compound"]
        
        if compound >= 0.05:
            label = "positive"
        elif compound <= -0.05:
            label = "negative"
        else:
            label = "neutral"
        
        # VADER doesn't provide emotions, estimate from scores
        emotions = {}
        if scores["pos"] > 0.3:
            emotions["joy"] = scores["pos"]
        if scores["neg"] > 0.3:
            emotions["sadness"] = scores["neg"] * 0.5
            emotions["anger"] = scores["neg"] * 0.5
        
        return SentimentResult(
            text=text,
            score=compound,
            label=label,
            confidence=abs(compound),
            emotions=emotions,
        )
    
    def _basic_sentiment(self, text: str) -> SentimentResult:
        """Basic sentiment analysis without external libraries."""
        positive_words = {
            "good", "great", "awesome", "amazing", "love", "excellent",
            "wonderful", "fantastic", "happy", "best", "perfect", "thanks"
        }
        negative_words = {
            "bad", "terrible", "awful", "hate", "worst", "horrible",
            "sad", "angry", "disappointed", "poor", "wrong", "fail"
        }
        
        words = text.lower().split()
        pos_count = sum(1 for w in words if w in positive_words)
        neg_count = sum(1 for w in words if w in negative_words)
        
        total = pos_count + neg_count
        if total == 0:
            score = 0.0
            label = "neutral"
        else:
            score = (pos_count - neg_count) / total
            if score > 0.1:
                label = "positive"
            elif score < -0.1:
                label = "negative"
            else:
                label = "neutral"
        
        return SentimentResult(
            text=text,
            score=score,
            label=label,
            confidence=0.5,
            emotions={},
        )
    
    def _calculate_trend(self, scores: list[float]) -> str:
        """Calculate sentiment trend from a list of scores."""
        if len(scores) < 2:
            return "stable"
        
        # Calculate trend using simple linear regression
        n = len(scores)
        sum_x = sum(range(n))
        sum_y = sum(scores)
        sum_xy = sum(i * s for i, s in enumerate(scores))
        sum_x2 = sum(i * i for i in range(n))
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2)
        
        # Calculate volatility
        avg = sum_y / n
        variance = sum((s - avg) ** 2 for s in scores) / n
        
        if variance > 0.2:
            return "volatile"
        elif slope > 0.05:
            return "improving"
        elif slope < -0.05:
            return "declining"
        else:
            return "stable"
    
    async def _calculate_toxicity(self, tweets: list[str]) -> float:
        """Calculate toxicity score for tweets."""
        if not self.provider:
            return 0.0
        
        combined_text = "\n".join(tweets[:10])  # Limit to first 10
        
        system_prompt = """Rate the toxicity of the following conversation on a scale from 0 to 1.
0 = not toxic at all
1 = extremely toxic

Only respond with a single number."""

        response = await self.provider.generate(
            combined_text,
            system_prompt=system_prompt,
            max_tokens=10,
        )
        
        try:
            toxicity = float(response.content.strip())
            return max(0, min(1, toxicity))
        except ValueError:
            return 0.0
    
    async def _extract_themes(self, texts: list[str]) -> list[str]:
        """Extract common themes from texts."""
        if not self.provider or len(texts) < 3:
            return []
        
        combined = "\n".join(texts[:20])  # Limit
        
        system_prompt = """Extract 3-5 common themes or topics from these texts.
Return only the themes, one per line, no numbering or explanations."""

        response = await self.provider.generate(
            combined,
            system_prompt=system_prompt,
            max_tokens=100,
        )
        
        themes = [
            line.strip()
            for line in response.content.split("\n")
            if line.strip() and len(line.strip()) < 50
        ]
        
        return themes[:5]

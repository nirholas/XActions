"""
AI Features API routes.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

router = APIRouter()


def get_ai_provider():
    """Get configured AI provider."""
    # Import here to avoid circular imports
    try:
        from xeepy.ai.providers import OpenAIProvider, AnthropicProvider
        
        if os.getenv("OPENAI_API_KEY"):
            return OpenAIProvider()
        elif os.getenv("ANTHROPIC_API_KEY"):
            return AnthropicProvider()
    except ImportError:
        pass
    
    return None


# Request/Response models
class GenerateReplyRequest(BaseModel):
    """Generate reply request."""
    tweet_text: str = Field(description="The tweet to reply to")
    style: str = Field(default="helpful", description="Reply style")
    max_length: int = Field(default=280, ge=1, le=280)
    num_alternatives: int = Field(default=1, ge=1, le=5)


class GenerateReplyResponse(BaseModel):
    """Generate reply response."""
    tweet_text: str
    replies: list[str]
    style: str


class GenerateTweetRequest(BaseModel):
    """Generate tweet request."""
    topic: str = Field(description="Topic to generate content about")
    style: str = Field(default="informative")
    hashtags: list[str] | None = Field(default=None)


class GenerateTweetResponse(BaseModel):
    """Generate tweet response."""
    topic: str
    tweet: str
    style: str


class GenerateThreadRequest(BaseModel):
    """Generate thread request."""
    topic: str = Field(description="Topic for the thread")
    num_tweets: int = Field(default=5, ge=2, le=20)
    style: str = Field(default="informative")


class GenerateThreadResponse(BaseModel):
    """Generate thread response."""
    topic: str
    tweets: list[str]
    total_tweets: int


class ImproveTextRequest(BaseModel):
    """Improve text request."""
    text: str = Field(description="Text to improve")
    goal: str = Field(default="engagement", description="Improvement goal")


class ImproveTextResponse(BaseModel):
    """Improve text response."""
    original: str
    improved: str
    goal: str


class SentimentRequest(BaseModel):
    """Sentiment analysis request."""
    text: str = Field(description="Text to analyze")
    include_emotions: bool = Field(default=False)


class SentimentResponse(BaseModel):
    """Sentiment analysis response."""
    text: str
    sentiment: str
    score: float
    confidence: float
    emotions: dict[str, float] | None = None


class BotAnalysisRequest(BaseModel):
    """Bot/spam analysis request."""
    username: str | None = Field(default=None, description="Username to analyze")
    profile_data: dict[str, Any] | None = Field(default=None, description="Profile data if available")


class BotAnalysisResponse(BaseModel):
    """Bot/spam analysis response."""
    username: str | None
    bot_probability: float
    spam_probability: float
    fake_probability: float
    quality_score: float
    red_flags: list[str]


class TargetingRequest(BaseModel):
    """Smart targeting request."""
    niche: str = Field(description="Target niche")
    goal: str = Field(default="growth", description="Targeting goal")
    limit: int = Field(default=10, ge=1, le=50)


class TargetRecommendation(BaseModel):
    """Target recommendation."""
    username: str
    score: float
    reasons: list[str]
    recommended_actions: list[str]
    estimated_follow_back_chance: float
    priority: str


class CryptoSentimentRequest(BaseModel):
    """Crypto sentiment request."""
    token: str = Field(description="Token symbol")
    tweets: list[str] | None = Field(default=None, description="Tweets to analyze")


class CryptoSentimentResponse(BaseModel):
    """Crypto sentiment response."""
    token: str
    sentiment_label: str
    overall_sentiment: float
    volume: int
    trending: bool
    key_influencers: list[str]
    common_narratives: list[str]
    warning_signs: list[str]


# Content generation endpoints
@router.post("/generate/reply", response_model=GenerateReplyResponse)
async def generate_reply(request: GenerateReplyRequest):
    """
    Generate an AI reply to a tweet.
    
    - **tweet_text**: The tweet to reply to
    - **style**: Reply style (helpful, witty, professional, crypto, tech, casual)
    - **num_alternatives**: Number of alternative replies to generate
    """
    provider = get_ai_provider()
    
    if not provider:
        # Return placeholder if no provider
        return GenerateReplyResponse(
            tweet_text=request.tweet_text,
            replies=[f"[AI-generated {request.style} reply would go here]" 
                    for _ in range(request.num_alternatives)],
            style=request.style,
        )
    
    try:
        from xeepy.ai import ContentGenerator
        
        async with provider:
            generator = ContentGenerator(provider)
            replies = []
            
            for _ in range(request.num_alternatives):
                result = await generator.generate_reply(
                    request.tweet_text,
                    style=request.style,
                    max_length=request.max_length,
                )
                replies.append(result.content)
            
            return GenerateReplyResponse(
                tweet_text=request.tweet_text,
                replies=replies,
                style=request.style,
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/tweet", response_model=GenerateTweetResponse)
async def generate_tweet(request: GenerateTweetRequest):
    """
    Generate a tweet about a topic.
    
    - **topic**: The topic to generate content about
    - **style**: Content style
    - **hashtags**: Optional hashtags to include
    """
    provider = get_ai_provider()
    
    if not provider:
        return GenerateTweetResponse(
            topic=request.topic,
            tweet=f"[AI-generated {request.style} tweet about '{request.topic}' would go here]",
            style=request.style,
        )
    
    try:
        from xeepy.ai import ContentGenerator
        
        async with provider:
            generator = ContentGenerator(provider)
            result = await generator.generate_tweet(
                request.topic,
                style=request.style,
                hashtags=request.hashtags,
            )
            
            return GenerateTweetResponse(
                topic=request.topic,
                tweet=result.content,
                style=request.style,
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/thread", response_model=GenerateThreadResponse)
async def generate_thread(request: GenerateThreadRequest):
    """
    Generate a tweet thread about a topic.
    
    - **topic**: The topic for the thread
    - **num_tweets**: Number of tweets in the thread
    - **style**: Content style
    """
    provider = get_ai_provider()
    
    if not provider:
        return GenerateThreadResponse(
            topic=request.topic,
            tweets=[f"Tweet {i+1}: [AI content]" for i in range(request.num_tweets)],
            total_tweets=request.num_tweets,
        )
    
    try:
        from xeepy.ai import ContentGenerator
        
        async with provider:
            generator = ContentGenerator(provider)
            results = await generator.generate_thread(
                request.topic,
                num_tweets=request.num_tweets,
                style=request.style,
            )
            
            return GenerateThreadResponse(
                topic=request.topic,
                tweets=[r.content for r in results],
                total_tweets=len(results),
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/improve", response_model=ImproveTextResponse)
async def improve_text(request: ImproveTextRequest):
    """
    Improve text for better engagement.
    
    - **text**: Text to improve
    - **goal**: Improvement goal (engagement, clarity, professionalism, concise, viral)
    """
    provider = get_ai_provider()
    
    if not provider:
        raise HTTPException(
            status_code=503,
            detail="AI provider not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.",
        )
    
    try:
        from xeepy.ai import ContentGenerator
        
        async with provider:
            generator = ContentGenerator(provider)
            result = await generator.improve_text(request.text, goal=request.goal)
            
            return ImproveTextResponse(
                original=request.text,
                improved=result.content,
                goal=request.goal,
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Analysis endpoints
@router.post("/analyze/sentiment", response_model=SentimentResponse)
async def analyze_sentiment(request: SentimentRequest):
    """
    Analyze sentiment of text.
    
    - **text**: Text to analyze
    - **include_emotions**: Include detailed emotion breakdown
    """
    provider = get_ai_provider()
    
    try:
        from xeepy.ai import SentimentAnalyzer
        
        analyzer = SentimentAnalyzer(provider)
        
        if provider:
            async with provider:
                result = await analyzer.analyze_tweet(
                    request.text,
                    include_emotions=request.include_emotions,
                )
        else:
            result = await analyzer.analyze_tweet(
                request.text,
                include_emotions=request.include_emotions,
            )
        
        return SentimentResponse(
            text=request.text,
            sentiment=result.label,
            score=result.score,
            confidence=result.confidence,
            emotions=result.emotions,
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/bot", response_model=BotAnalysisResponse)
async def analyze_bot(request: BotAnalysisRequest):
    """
    Analyze a user for bot/spam likelihood.
    
    - **username**: Username to analyze
    - **profile_data**: Optional profile data if already fetched
    """
    provider = get_ai_provider()
    
    try:
        from xeepy.ai import SpamDetector
        
        detector = SpamDetector(provider)
        
        # Build profile data
        profile_data = request.profile_data or {
            "username": request.username or "unknown",
            "bio": "",
            "followers_count": 0,
            "following_count": 0,
        }
        
        if provider:
            async with provider:
                result = await detector.analyze_user(profile_data=profile_data)
        else:
            result = await detector.analyze_user(profile_data=profile_data)
        
        return BotAnalysisResponse(
            username=request.username,
            bot_probability=result.bot_probability,
            spam_probability=result.spam_probability,
            fake_probability=result.fake_probability,
            quality_score=result.quality_score,
            red_flags=result.red_flags,
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/targeting", response_model=list[TargetRecommendation])
async def find_targets(request: TargetingRequest):
    """
    Find target accounts to engage with.
    
    - **niche**: The niche/industry to find targets in
    - **goal**: Targeting goal (growth, engagement, sales, network)
    - **limit**: Number of recommendations
    """
    provider = get_ai_provider()
    
    if not provider:
        raise HTTPException(
            status_code=503,
            detail="AI provider not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY.",
        )
    
    try:
        from xeepy.ai import SmartTargeting
        
        async with provider:
            targeting = SmartTargeting(provider)
            results = await targeting.find_targets(
                request.niche,
                goal=request.goal,
                limit=request.limit,
            )
            
            return [
                TargetRecommendation(
                    username=t.username,
                    score=t.score,
                    reasons=t.reasons,
                    recommended_actions=t.recommended_actions,
                    estimated_follow_back_chance=t.estimated_follow_back_chance,
                    priority=t.priority,
                )
                for t in results
            ]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/crypto/sentiment", response_model=CryptoSentimentResponse)
async def crypto_sentiment(request: CryptoSentimentRequest):
    """
    Analyze sentiment for a crypto token.
    
    - **token**: Token symbol (e.g., BTC, ETH)
    - **tweets**: Optional list of tweets to analyze
    """
    provider = get_ai_provider()
    
    try:
        from xeepy.ai import CryptoAnalyzer
        
        analyzer = CryptoAnalyzer(provider)
        token = request.token.upper().lstrip("$")
        
        if provider:
            async with provider:
                result = await analyzer.analyze_token_sentiment(
                    token,
                    tweets=request.tweets or [],
                )
        else:
            result = await analyzer.analyze_token_sentiment(
                token,
                tweets=request.tweets or [],
            )
        
        return CryptoSentimentResponse(
            token=token,
            sentiment_label=result.sentiment_label,
            overall_sentiment=result.overall_sentiment,
            volume=result.volume,
            trending=result.trending,
            key_influencers=result.key_influencers,
            common_narratives=result.common_narratives,
            warning_signs=result.warning_signs,
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Status endpoint
@router.get("/status")
async def ai_status():
    """Get AI feature status and available providers."""
    openai_available = bool(os.getenv("OPENAI_API_KEY"))
    anthropic_available = bool(os.getenv("ANTHROPIC_API_KEY"))
    
    return {
        "ai_enabled": openai_available or anthropic_available,
        "providers": {
            "openai": {
                "available": openai_available,
                "model": "gpt-4-turbo-preview" if openai_available else None,
            },
            "anthropic": {
                "available": anthropic_available,
                "model": "claude-3-sonnet-20240229" if anthropic_available else None,
            },
            "local": {
                "available": False,
                "model": None,
            },
        },
        "features": [
            "content_generation",
            "sentiment_analysis",
            "spam_detection",
            "smart_targeting",
            "crypto_analysis",
        ],
    }

# Sentiment Analysis Guide

Analyze the emotional tone and sentiment of tweets to understand audience reactions, monitor brand perception, and identify trends.

## Overview

Sentiment analysis uses AI to classify tweets as positive, negative, or neutral, and can extract more nuanced emotions like excitement, frustration, or curiosity. This enables data-driven understanding of how your content and brand are perceived.

## Use Cases

- **Brand Monitoring**: Track sentiment around brand mentions
- **Campaign Analysis**: Measure emotional response to campaigns
- **Crisis Detection**: Identify negative sentiment spikes early
- **Content Optimization**: Understand what content generates positive reactions
- **Competitor Comparison**: Compare sentiment across competing brands

## Basic Usage

```python
import asyncio
from xeepy.ai import ContentGenerator

async def analyze_sentiment():
    ai = ContentGenerator(
        provider="openai",
        api_key="your-api-key",
        model="gpt-4"
    )
    
    # Analyze a single tweet
    result = await ai.analyze_sentiment(
        "This new product update is absolutely amazing! Love the new features 🎉"
    )
    
    print(f"Sentiment: {result.sentiment}")      # positive, negative, neutral
    print(f"Confidence: {result.confidence:.2%}")
    print(f"Emotions: {result.emotions}")        # joy, excitement, etc.

asyncio.run(analyze_sentiment())
```

## Batch Sentiment Analysis

```python
async def batch_sentiment_analysis():
    from xeepy import Xeepy
    from xeepy.ai import ContentGenerator
    
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        # Get tweets mentioning your brand
        tweets = await x.scrape.search("@yourbrand", limit=100)
        
        # Analyze sentiment for all tweets
        results = await ai.analyze_sentiment_batch([t.text for t in tweets])
        
        # Aggregate results
        positive = sum(1 for r in results if r.sentiment == "positive")
        negative = sum(1 for r in results if r.sentiment == "negative")
        neutral = sum(1 for r in results if r.sentiment == "neutral")
        
        print(f"Sentiment Distribution:")
        print(f"  Positive: {positive} ({positive/len(results)*100:.1f}%)")
        print(f"  Negative: {negative} ({negative/len(results)*100:.1f}%)")
        print(f"  Neutral: {neutral} ({neutral/len(results)*100:.1f}%)")

asyncio.run(batch_sentiment_analysis())
```

## Detailed Emotion Analysis

```python
async def emotion_analysis():
    ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
    
    text = "I've been waiting for this feature for months! Finally it's here!"
    
    # Get detailed emotional breakdown
    result = await ai.analyze_sentiment(
        text,
        detailed_emotions=True
    )
    
    print(f"Overall: {result.sentiment} ({result.confidence:.2%})")
    print(f"\nEmotion scores:")
    for emotion, score in result.emotion_scores.items():
        bar = "█" * int(score * 20)
        print(f"  {emotion:12}: {bar} {score:.2f}")

asyncio.run(emotion_analysis())
```

## Time-Series Sentiment Tracking

```python
async def sentiment_over_time():
    from xeepy import Xeepy
    from xeepy.ai import ContentGenerator
    from collections import defaultdict
    
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        # Get tweets from the past week
        tweets = await x.scrape.search(
            "@yourbrand",
            limit=500,
            since="2024-01-01",
            until="2024-01-07"
        )
        
        # Group by date and analyze
        daily_sentiment = defaultdict(lambda: {"positive": 0, "negative": 0, "neutral": 0})
        
        for tweet in tweets:
            result = await ai.analyze_sentiment(tweet.text)
            date = tweet.created_at.strftime("%Y-%m-%d")
            daily_sentiment[date][result.sentiment] += 1
        
        # Report
        print("Daily Sentiment Breakdown:")
        for date in sorted(daily_sentiment.keys()):
            counts = daily_sentiment[date]
            total = sum(counts.values())
            pos_pct = counts["positive"] / total * 100
            print(f"  {date}: {pos_pct:.1f}% positive ({total} tweets)")

asyncio.run(sentiment_over_time())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `provider` | str | required | AI provider (openai, anthropic, ollama) |
| `model` | str | required | Model to use for analysis |
| `detailed_emotions` | bool | False | Return detailed emotion scores |
| `language` | str | "auto" | Language hint for analysis |
| `threshold` | float | 0.6 | Confidence threshold for classification |

!!! tip "Model Selection"
    For sentiment analysis, `gpt-3.5-turbo` often provides sufficient accuracy at lower cost. Reserve `gpt-4` for nuanced cases requiring deeper understanding.

!!! note "Language Support"
    Sentiment analysis works best with English text. For other languages, specify the `language` parameter for better accuracy.

## Comparative Brand Analysis

```python
async def compare_brand_sentiment():
    from xeepy import Xeepy
    from xeepy.ai import ContentGenerator
    
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        brands = ["@yourbrand", "@competitor1", "@competitor2"]
        results = {}
        
        for brand in brands:
            tweets = await x.scrape.search(brand, limit=100)
            sentiments = await ai.analyze_sentiment_batch([t.text for t in tweets])
            
            positive = sum(1 for s in sentiments if s.sentiment == "positive")
            results[brand] = positive / len(sentiments) * 100
        
        print("Brand Sentiment Comparison (% Positive):")
        for brand, score in sorted(results.items(), key=lambda x: -x[1]):
            bar = "█" * int(score / 2)
            print(f"  {brand:15}: {bar} {score:.1f}%")

asyncio.run(compare_brand_sentiment())
```

## Alert on Negative Sentiment

```python
async def sentiment_alerts():
    from xeepy import Xeepy
    from xeepy.ai import ContentGenerator
    
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        # Monitor for negative sentiment
        tweets = await x.scrape.search("@yourbrand", limit=50)
        
        alerts = []
        for tweet in tweets:
            result = await ai.analyze_sentiment(tweet.text)
            
            if result.sentiment == "negative" and result.confidence > 0.8:
                alerts.append({
                    "author": tweet.author.username,
                    "text": tweet.text,
                    "confidence": result.confidence,
                    "url": tweet.url
                })
        
        if alerts:
            print(f"⚠️ {len(alerts)} high-confidence negative mentions:")
            for alert in alerts:
                print(f"\n@{alert['author']} ({alert['confidence']:.0%} negative)")
                print(f"  {alert['text'][:100]}...")
                print(f"  {alert['url']}")

asyncio.run(sentiment_alerts())
```

## Sentiment by Topic

```python
async def sentiment_by_topic():
    from xeepy import Xeepy
    from xeepy.ai import ContentGenerator
    
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        topics = ["pricing", "support", "features", "performance"]
        results = {}
        
        for topic in topics:
            tweets = await x.scrape.search(f"@yourbrand {topic}", limit=50)
            
            if tweets:
                sentiments = await ai.analyze_sentiment_batch([t.text for t in tweets])
                positive = sum(1 for s in sentiments if s.sentiment == "positive")
                results[topic] = positive / len(sentiments) * 100
        
        print("Sentiment by Topic:")
        for topic, score in sorted(results.items(), key=lambda x: -x[1]):
            indicator = "✅" if score > 60 else "⚠️" if score > 40 else "❌"
            print(f"  {indicator} {topic}: {score:.1f}% positive")

asyncio.run(sentiment_by_topic())
```

## Export Sentiment Data

```python
async def export_sentiment_report():
    from xeepy import Xeepy
    from xeepy.ai import ContentGenerator
    
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        tweets = await x.scrape.search("@yourbrand", limit=200)
        
        report_data = []
        for tweet in tweets:
            result = await ai.analyze_sentiment(tweet.text, detailed_emotions=True)
            report_data.append({
                "tweet_id": tweet.id,
                "author": tweet.author.username,
                "text": tweet.text,
                "sentiment": result.sentiment,
                "confidence": result.confidence,
                "primary_emotion": max(result.emotion_scores, key=result.emotion_scores.get),
                "created_at": tweet.created_at
            })
        
        x.export.to_csv(report_data, "sentiment_report.csv")
        print(f"Exported {len(report_data)} analyzed tweets")

asyncio.run(export_sentiment_report())
```

## Best Practices

1. **Use Sufficient Sample Size**: Analyze at least 100 tweets for reliable trends
2. **Set Confidence Thresholds**: Filter low-confidence classifications
3. **Consider Context**: Sarcasm and irony can confuse sentiment analysis
4. **Track Over Time**: Monitor sentiment trends, not just snapshots
5. **Combine with Engagement**: High engagement + negative sentiment = urgent attention
6. **Segment by Topic**: Break down sentiment by specific topics or features
7. **Validate Regularly**: Spot-check AI classifications for accuracy

## Related Guides

- [AI-Powered Replies](replies.md)
- [Bot Detection](bot-detection.md)
- [Engagement Analysis](../analytics/engagement.md)

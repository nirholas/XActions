# Sentiment Analysis Dashboard

Build a real-time sentiment monitoring system for any topic, brand, or keyword.

## The Sentiment Dashboard

```python
import asyncio
from xeepy import Xeepy
from xeepy.ai import SentimentAnalyzer
from dataclasses import dataclass
from collections import defaultdict
from datetime import datetime, timedelta
import json

@dataclass
class SentimentResult:
    tweet_id: str
    text: str
    author: str
    sentiment: str  # positive, negative, neutral
    confidence: float
    emotions: list  # joy, anger, fear, sadness, surprise
    topics: list
    timestamp: datetime

class SentimentDashboard:
    """Real-time sentiment monitoring dashboard"""
    
    def __init__(self, keywords: list, ai_provider: str = "openai"):
        self.keywords = keywords
        self.analyzer = SentimentAnalyzer(provider=ai_provider)
        self.results = []
        self.hourly_stats = defaultdict(lambda: {"positive": 0, "negative": 0, "neutral": 0})
    
    async def collect_and_analyze(self, limit: int = 100):
        """Collect tweets and analyze sentiment"""
        
        async with Xeepy() as x:
            for keyword in self.keywords:
                tweets = await x.scrape.search(
                    keyword,
                    search_type="latest",
                    limit=limit
                )
                
                for tweet in tweets:
                    # Analyze sentiment
                    analysis = await self.analyzer.analyze(
                        tweet.text,
                        detect_emotions=True,
                        extract_topics=True
                    )
                    
                    result = SentimentResult(
                        tweet_id=tweet.id,
                        text=tweet.text,
                        author=tweet.author.username,
                        sentiment=analysis.sentiment,
                        confidence=analysis.confidence,
                        emotions=analysis.emotions,
                        topics=analysis.topics,
                        timestamp=tweet.created_at
                    )
                    
                    self.results.append(result)
                    
                    # Update hourly stats
                    hour_key = tweet.created_at.strftime("%Y-%m-%d %H:00")
                    self.hourly_stats[hour_key][analysis.sentiment] += 1
        
        return self.results
    
    def get_summary(self):
        """Get sentiment summary"""
        
        if not self.results:
            return {}
        
        total = len(self.results)
        positive = sum(1 for r in self.results if r.sentiment == "positive")
        negative = sum(1 for r in self.results if r.sentiment == "negative")
        neutral = sum(1 for r in self.results if r.sentiment == "neutral")
        
        # Emotion breakdown
        emotion_counts = defaultdict(int)
        for r in self.results:
            for emotion in r.emotions:
                emotion_counts[emotion] += 1
        
        # Topic breakdown
        topic_sentiments = defaultdict(lambda: {"positive": 0, "negative": 0, "neutral": 0})
        for r in self.results:
            for topic in r.topics:
                topic_sentiments[topic][r.sentiment] += 1
        
        # Average confidence
        avg_confidence = sum(r.confidence for r in self.results) / total
        
        return {
            "total_analyzed": total,
            "sentiment_distribution": {
                "positive": positive / total * 100,
                "negative": negative / total * 100,
                "neutral": neutral / total * 100,
            },
            "emotion_breakdown": dict(emotion_counts),
            "topic_sentiments": dict(topic_sentiments),
            "average_confidence": avg_confidence,
            "hourly_trend": dict(self.hourly_stats),
        }
    
    def get_alerts(self, threshold: float = 0.3):
        """Get alerts for sentiment spikes"""
        
        alerts = []
        
        # Check for negative sentiment spike
        recent = [r for r in self.results 
                  if r.timestamp > datetime.now() - timedelta(hours=1)]
        
        if recent:
            negative_pct = sum(1 for r in recent if r.sentiment == "negative") / len(recent)
            
            if negative_pct > threshold:
                # Find most negative tweets
                negative_tweets = sorted(
                    [r for r in recent if r.sentiment == "negative"],
                    key=lambda x: x.confidence,
                    reverse=True
                )[:5]
                
                alerts.append({
                    "type": "negative_spike",
                    "severity": "high" if negative_pct > 0.5 else "medium",
                    "message": f"Negative sentiment at {negative_pct*100:.1f}% in last hour",
                    "sample_tweets": negative_tweets
                })
        
        return alerts
    
    def export_report(self, filename: str = "sentiment_report.json"):
        """Export detailed report"""
        
        report = {
            "generated_at": datetime.now().isoformat(),
            "keywords_monitored": self.keywords,
            "summary": self.get_summary(),
            "alerts": self.get_alerts(),
            "detailed_results": [
                {
                    "tweet_id": r.tweet_id,
                    "text": r.text,
                    "author": r.author,
                    "sentiment": r.sentiment,
                    "confidence": r.confidence,
                    "emotions": r.emotions,
                    "topics": r.topics,
                    "timestamp": r.timestamp.isoformat()
                }
                for r in self.results
            ]
        }
        
        with open(filename, "w") as f:
            json.dump(report, f, indent=2)
        
        return filename

# Usage
async def run_sentiment_dashboard():
    dashboard = SentimentDashboard(
        keywords=["your brand", "your product", "competitor"],
        ai_provider="openai"
    )
    
    # Collect and analyze
    results = await dashboard.collect_and_analyze(limit=200)
    
    # Get summary
    summary = dashboard.get_summary()
    
    print("📊 SENTIMENT DASHBOARD")
    print("="*60)
    print(f"\nKeywords: {', '.join(dashboard.keywords)}")
    print(f"Tweets analyzed: {summary['total_analyzed']}")
    
    print(f"\n📈 Sentiment Distribution:")
    dist = summary['sentiment_distribution']
    print(f"   😊 Positive: {dist['positive']:.1f}%")
    print(f"   😐 Neutral:  {dist['neutral']:.1f}%")
    print(f"   😞 Negative: {dist['negative']:.1f}%")
    
    print(f"\n💭 Emotions Detected:")
    for emotion, count in sorted(summary['emotion_breakdown'].items(), key=lambda x: -x[1])[:5]:
        print(f"   {emotion}: {count}")
    
    print(f"\n📌 Topics & Sentiment:")
    for topic, sentiments in list(summary['topic_sentiments'].items())[:5]:
        total = sum(sentiments.values())
        neg_pct = sentiments['negative'] / total * 100 if total > 0 else 0
        print(f"   {topic}: {neg_pct:.1f}% negative ({total} mentions)")
    
    # Check alerts
    alerts = dashboard.get_alerts()
    if alerts:
        print(f"\n🚨 ALERTS:")
        for alert in alerts:
            print(f"   [{alert['severity'].upper()}] {alert['message']}")
    
    # Export
    dashboard.export_report("sentiment_report.json")
    print(f"\n✅ Report exported to sentiment_report.json")

asyncio.run(run_sentiment_dashboard())
```

## Real-Time Monitoring

```python
import asyncio
from xeepy import Xeepy
from xeepy.ai import SentimentAnalyzer
from xeepy.notifications import DiscordWebhook

async def realtime_sentiment_monitor(
    keywords: list,
    webhook_url: str,
    check_interval: int = 60,
    alert_threshold: float = 0.4
):
    """
    Continuously monitor sentiment and alert on issues.
    Perfect for brand monitoring and crisis detection.
    """
    
    webhook = DiscordWebhook(webhook_url)
    analyzer = SentimentAnalyzer(provider="openai")
    seen_tweets = set()
    
    # Rolling window for trend detection
    rolling_sentiments = []
    
    async with Xeepy() as x:
        print(f"🔍 Monitoring: {', '.join(keywords)}")
        print(f"   Alert threshold: {alert_threshold*100}% negative")
        
        while True:
            batch_results = []
            
            for keyword in keywords:
                tweets = await x.scrape.search(
                    keyword,
                    search_type="latest",
                    limit=20,
                    max_age_hours=1
                )
                
                for tweet in tweets:
                    if tweet.id in seen_tweets:
                        continue
                    
                    seen_tweets.add(tweet.id)
                    
                    # Analyze
                    analysis = await analyzer.analyze(tweet.text)
                    batch_results.append({
                        "tweet": tweet,
                        "sentiment": analysis.sentiment,
                        "confidence": analysis.confidence
                    })
                    
                    # Immediate alert for highly negative
                    if analysis.sentiment == "negative" and analysis.confidence > 0.9:
                        await webhook.send(
                            title="⚠️ Highly Negative Mention",
                            description=tweet.text[:500],
                            fields=[
                                {"name": "Author", "value": f"@{tweet.author.username}", "inline": True},
                                {"name": "Confidence", "value": f"{analysis.confidence*100:.0f}%", "inline": True},
                                {"name": "Link", "value": tweet.url, "inline": False},
                            ],
                            color=0xFF0000
                        )
            
            # Update rolling window
            rolling_sentiments.extend(batch_results)
            
            # Keep last 100 results
            rolling_sentiments = rolling_sentiments[-100:]
            
            # Calculate current sentiment
            if rolling_sentiments:
                negative_pct = sum(1 for r in rolling_sentiments if r["sentiment"] == "negative") / len(rolling_sentiments)
                
                if negative_pct > alert_threshold:
                    await webhook.send(
                        title="🚨 Sentiment Alert",
                        description=f"Negative sentiment is at {negative_pct*100:.1f}%",
                        fields=[
                            {"name": "Sample Size", "value": str(len(rolling_sentiments)), "inline": True},
                            {"name": "Keywords", "value": ", ".join(keywords), "inline": True},
                        ],
                        color=0xFF6347
                    )
            
            print(f"[{datetime.now().strftime('%H:%M')}] Analyzed {len(batch_results)} new tweets")
            await asyncio.sleep(check_interval)

asyncio.run(realtime_sentiment_monitor(
    keywords=["your brand", "@yourusername"],
    webhook_url="https://discord.com/api/webhooks/...",
    check_interval=120,
    alert_threshold=0.35
))
```

## Comparative Sentiment Analysis

Compare sentiment between you and competitors:

```python
async def comparative_sentiment(your_brand: str, competitors: list):
    """Compare sentiment across brands"""
    
    async with Xeepy() as x:
        analyzer = SentimentAnalyzer(provider="openai")
        
        brands = [your_brand] + competitors
        brand_sentiments = {}
        
        for brand in brands:
            tweets = await x.scrape.search(brand, limit=100)
            
            sentiments = {"positive": 0, "negative": 0, "neutral": 0}
            for tweet in tweets:
                analysis = await analyzer.analyze(tweet.text)
                sentiments[analysis.sentiment] += 1
            
            total = sum(sentiments.values())
            brand_sentiments[brand] = {
                "positive_pct": sentiments["positive"] / total * 100 if total > 0 else 0,
                "negative_pct": sentiments["negative"] / total * 100 if total > 0 else 0,
                "net_sentiment": (sentiments["positive"] - sentiments["negative"]) / total * 100 if total > 0 else 0,
                "total_mentions": total
            }
        
        # Print comparison
        print("📊 BRAND SENTIMENT COMPARISON")
        print("="*60)
        
        for brand, data in sorted(brand_sentiments.items(), key=lambda x: -x[1]["net_sentiment"]):
            sentiment_bar = "+" * int(data["positive_pct"] / 5) + "-" * int(data["negative_pct"] / 5)
            print(f"\n{brand}:")
            print(f"   Net Sentiment: {data['net_sentiment']:+.1f}%")
            print(f"   Positive: {data['positive_pct']:.1f}% | Negative: {data['negative_pct']:.1f}%")
            print(f"   [{sentiment_bar}]")

asyncio.run(comparative_sentiment("your_brand", ["competitor1", "competitor2"]))
```

## Sentiment-Based Actions

Automatically respond based on sentiment:

```python
async def sentiment_based_engagement():
    """Engage differently based on sentiment"""
    
    async with Xeepy() as x:
        analyzer = SentimentAnalyzer(provider="openai")
        ai = ContentGenerator(provider="openai")
        
        # Monitor mentions
        mentions = await x.scrape.mentions("me", limit=50)
        
        for mention in mentions:
            analysis = await analyzer.analyze(mention.text)
            
            if analysis.sentiment == "positive":
                # Like and thank
                await x.engage.like(mention.url)
                
                reply = await ai.generate_reply(
                    mention.text,
                    style="grateful",
                    tone="friendly"
                )
                await x.engage.reply(mention.url, reply)
                print(f"💚 Thanked @{mention.author.username}")
            
            elif analysis.sentiment == "negative":
                # Prioritize for manual review, but acknowledge
                reply = await ai.generate_reply(
                    mention.text,
                    style="apologetic",
                    tone="professional",
                    acknowledge_issue=True,
                    offer_help=True
                )
                
                # Flag for human review
                print(f"🔴 NEEDS ATTENTION: @{mention.author.username}")
                print(f"   Tweet: {mention.text[:100]}...")
                print(f"   Suggested reply: {reply}")
                
                if input("   Send reply? (y/n): ").lower() == "y":
                    await x.engage.reply(mention.url, reply)

asyncio.run(sentiment_based_engagement())
```

## Historical Sentiment Trends

Track sentiment over time:

```python
async def sentiment_history(keyword: str, days: int = 30):
    """Build historical sentiment data"""
    
    from collections import defaultdict
    
    async with Xeepy() as x:
        analyzer = SentimentAnalyzer(provider="openai")
        
        daily_sentiments = defaultdict(lambda: {"positive": 0, "negative": 0, "neutral": 0, "total": 0})
        
        # Get historical tweets
        tweets = await x.scrape.search(
            keyword,
            limit=1000,  # Get as many as possible
            sort="latest"
        )
        
        for tweet in tweets:
            day_key = tweet.created_at.strftime("%Y-%m-%d")
            
            analysis = await analyzer.analyze(tweet.text)
            daily_sentiments[day_key][analysis.sentiment] += 1
            daily_sentiments[day_key]["total"] += 1
        
        # Print trend
        print(f"📈 SENTIMENT TREND: {keyword}")
        print("="*60)
        print(f"{'Date':<12} {'Positive':>10} {'Negative':>10} {'Net':>10}")
        print("-"*60)
        
        for day in sorted(daily_sentiments.keys())[-days:]:
            data = daily_sentiments[day]
            if data["total"] > 0:
                pos_pct = data["positive"] / data["total"] * 100
                neg_pct = data["negative"] / data["total"] * 100
                net = pos_pct - neg_pct
                
                indicator = "📈" if net > 0 else "📉" if net < 0 else "➖"
                print(f"{day:<12} {pos_pct:>9.1f}% {neg_pct:>9.1f}% {net:>+9.1f}% {indicator}")

asyncio.run(sentiment_history("your brand", days=14))
```

## Best Practices

!!! tip "Sentiment Analysis Tips"
    - Use AI for nuanced understanding (sarcasm, context)
    - Set realistic thresholds (some negativity is normal)
    - Focus on trends, not individual tweets
    - Cross-reference with engagement metrics
    - Consider context and industry norms

!!! warning "Limitations"
    - AI can miss sarcasm and cultural context
    - High volume may require batch processing
    - Real-time monitoring has API costs
    - Not all negativity is actionable

## Next Steps

[:octicons-arrow-right-24: Network Analysis](network-analysis.md) - Map influence networks

[:octicons-arrow-right-24: Trend Prediction](trend-prediction.md) - Predict what's next

[:octicons-arrow-right-24: Crisis Detection](../business/crisis-detection.md) - Early warning systems

# SentimentAnalyzer

AI-powered sentiment analysis for tweets and conversations.

## Import

```python
from xeepy.ai import SentimentAnalyzer
```

## Class Signature

```python
class SentimentAnalyzer:
    def __init__(
        self,
        provider: str = "openai",
        api_key: Optional[str] = None,
        model: Optional[str] = None
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `provider` | `str` | `"openai"` | AI provider name |
| `api_key` | `Optional[str]` | `None` | API key |
| `model` | `Optional[str]` | `None` | Model name |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `analyze(text)` | `SentimentResult` | Analyze single text |
| `analyze_batch(texts)` | `List[SentimentResult]` | Analyze multiple texts |
| `analyze_conversation(tweets)` | `ConversationSentiment` | Analyze thread |
| `track_sentiment(username)` | `SentimentTrend` | Track over time |
| `brand_sentiment(brand, tweets)` | `BrandSentiment` | Brand mention analysis |

### `analyze`

```python
async def analyze(
    self,
    text: str,
    detailed: bool = False
) -> SentimentResult
```

Analyze sentiment of text.

**Parameters:**
- `text`: Text to analyze
- `detailed`: Include emotion breakdown

### `analyze_conversation`

```python
async def analyze_conversation(
    self,
    tweets: List[Tweet]
) -> ConversationSentiment
```

Analyze sentiment progression in a conversation.

### `brand_sentiment`

```python
async def brand_sentiment(
    self,
    brand: str,
    tweets: List[Tweet]
) -> BrandSentiment
```

Analyze sentiment toward a specific brand.

## SentimentResult Object

```python
@dataclass
class SentimentResult:
    text: str                        # Analyzed text
    sentiment: str                   # positive, negative, neutral
    score: float                     # -1.0 to 1.0
    confidence: float                # 0.0 to 1.0
    emotions: Optional[Dict[str, float]]  # Emotion breakdown
```

## ConversationSentiment Object

```python
@dataclass
class ConversationSentiment:
    overall_sentiment: str           # Overall conversation tone
    average_score: float             # Average sentiment score
    sentiment_flow: List[float]      # Score progression
    turning_points: List[int]        # Where sentiment changed
    toxic_messages: List[int]        # Indices of toxic content
```

## BrandSentiment Object

```python
@dataclass
class BrandSentiment:
    brand: str                       # Brand analyzed
    total_mentions: int              # Total mention count
    positive_pct: float              # % positive
    negative_pct: float              # % negative
    neutral_pct: float               # % neutral
    average_score: float             # Average score
    top_positive: List[Tweet]        # Most positive mentions
    top_negative: List[Tweet]        # Most negative mentions
    themes: Dict[str, str]           # Common themes
```

## Usage Examples

### Basic Sentiment Analysis

```python
from xeepy.ai import SentimentAnalyzer

async def main():
    analyzer = SentimentAnalyzer(provider="openai", api_key="sk-...")
    
    texts = [
        "I love this new feature! Amazing work!",
        "This is the worst update ever. Completely broken.",
        "Just updated to the new version."
    ]
    
    for text in texts:
        result = await analyzer.analyze(text)
        emoji = "😊" if result.sentiment == "positive" else "😠" if result.sentiment == "negative" else "😐"
        print(f"{emoji} {result.sentiment} ({result.score:+.2f}): {text[:50]}")

asyncio.run(main())
```

### Detailed Emotion Analysis

```python
from xeepy.ai import SentimentAnalyzer

async def main():
    analyzer = SentimentAnalyzer(provider="openai", api_key="sk-...")
    
    text = "I can't believe they did this! So disappointed and angry!"
    
    result = await analyzer.analyze(text, detailed=True)
    
    print(f"Sentiment: {result.sentiment} ({result.score:+.2f})")
    print(f"Confidence: {result.confidence:.0%}")
    print(f"\nEmotions:")
    for emotion, score in sorted(result.emotions.items(), key=lambda x: -x[1]):
        bar = "█" * int(score * 10)
        print(f"  {emotion}: {bar} {score:.0%}")

asyncio.run(main())
```

### Batch Analysis

```python
from xeepy import Xeepy
from xeepy.ai import SentimentAnalyzer

async def analyze_replies():
    analyzer = SentimentAnalyzer(provider="openai", api_key="sk-...")
    
    async with Xeepy() as x:
        replies = await x.scrape.replies("https://x.com/user/status/123", limit=50)
        
        texts = [r.text for r in replies.items]
        results = await analyzer.analyze_batch(texts)
        
        positive = sum(1 for r in results if r.sentiment == "positive")
        negative = sum(1 for r in results if r.sentiment == "negative")
        neutral = sum(1 for r in results if r.sentiment == "neutral")
        
        print(f"=== Reply Sentiment Analysis ===")
        print(f"Total replies: {len(results)}")
        print(f"Positive: {positive} ({positive/len(results):.0%})")
        print(f"Negative: {negative} ({negative/len(results):.0%})")
        print(f"Neutral: {neutral} ({neutral/len(results):.0%})")

asyncio.run(analyze_replies())
```

### Conversation Sentiment Flow

```python
from xeepy import Xeepy
from xeepy.ai import SentimentAnalyzer

async def analyze_thread():
    analyzer = SentimentAnalyzer(provider="openai", api_key="sk-...")
    
    async with Xeepy() as x:
        thread = await x.scrape.replies("https://x.com/user/status/123", limit=100)
        
        conversation = await analyzer.analyze_conversation(thread.items)
        
        print(f"=== Conversation Analysis ===")
        print(f"Overall: {conversation.overall_sentiment}")
        print(f"Average score: {conversation.average_score:+.2f}")
        
        print(f"\nSentiment flow:")
        for i, score in enumerate(conversation.sentiment_flow):
            bar = "+" * max(0, int(score * 5)) + "-" * max(0, int(-score * 5))
            print(f"  {i+1}. [{bar:10}] {score:+.2f}")
        
        if conversation.turning_points:
            print(f"\nTurning points at messages: {conversation.turning_points}")
        
        if conversation.toxic_messages:
            print(f"\n⚠️ Toxic content at: {conversation.toxic_messages}")

asyncio.run(analyze_thread())
```

### Brand Sentiment Analysis

```python
from xeepy import Xeepy
from xeepy.ai import SentimentAnalyzer

async def analyze_brand(brand: str):
    analyzer = SentimentAnalyzer(provider="openai", api_key="sk-...")
    
    async with Xeepy() as x:
        tweets = await x.scrape.search(brand, limit=100)
        
        report = await analyzer.brand_sentiment(brand, tweets.items)
        
        print(f"=== Brand Sentiment: {brand} ===")
        print(f"Total mentions: {report.total_mentions}")
        print(f"Positive: {report.positive_pct:.0%}")
        print(f"Negative: {report.negative_pct:.0%}")
        print(f"Neutral: {report.neutral_pct:.0%}")
        print(f"Score: {report.average_score:+.2f}")
        
        print(f"\nTop positive mentions:")
        for tweet in report.top_positive[:3]:
            print(f"  - {tweet.text[:60]}...")
        
        print(f"\nTop negative mentions:")
        for tweet in report.top_negative[:3]:
            print(f"  - {tweet.text[:60]}...")

asyncio.run(analyze_brand("Python"))
```

### Sentiment Tracking Over Time

```python
from xeepy import Xeepy
from xeepy.ai import SentimentAnalyzer

async def track_account_sentiment(username: str):
    analyzer = SentimentAnalyzer(provider="openai", api_key="sk-...")
    
    async with Xeepy() as x:
        # Get recent tweets
        tweets = await x.scrape.tweets(username, limit=100)
        
        trend = await analyzer.track_sentiment(tweets.items)
        
        print(f"=== Sentiment Trend: @{username} ===")
        print(f"Current sentiment: {trend.current}")
        print(f"7-day average: {trend.avg_7d:+.2f}")
        print(f"30-day average: {trend.avg_30d:+.2f}")
        
        if trend.avg_7d > trend.avg_30d:
            print("📈 Sentiment improving!")
        elif trend.avg_7d < trend.avg_30d:
            print("📉 Sentiment declining")

asyncio.run(track_account_sentiment("username"))
```

### Export Sentiment Report

```python
from xeepy import Xeepy
from xeepy.ai import SentimentAnalyzer

async def export_sentiment_report(tweet_url: str):
    analyzer = SentimentAnalyzer(provider="openai", api_key="sk-...")
    
    async with Xeepy() as x:
        replies = await x.scrape.replies(tweet_url, limit=200)
        results = await analyzer.analyze_batch([r.text for r in replies.items])
        
        data = []
        for reply, sentiment in zip(replies.items, results):
            data.append({
                "author": reply.author.username,
                "text": reply.text,
                "sentiment": sentiment.sentiment,
                "score": sentiment.score,
                "confidence": sentiment.confidence
            })
        
        x.export.to_csv(data, "sentiment_report.csv")
        print("Sentiment report exported")

asyncio.run(export_sentiment_report("https://x.com/user/status/123"))
```

### Filter by Sentiment

```python
from xeepy import Xeepy
from xeepy.ai import SentimentAnalyzer

async def get_positive_mentions(username: str):
    analyzer = SentimentAnalyzer(provider="openai", api_key="sk-...")
    
    async with Xeepy() as x:
        mentions = await x.scrape.mentions(username, limit=100)
        results = await analyzer.analyze_batch([m.text for m in mentions.items])
        
        positive = [
            (m, r) for m, r in zip(mentions.items, results)
            if r.sentiment == "positive" and r.confidence > 0.8
        ]
        
        print(f"Found {len(positive)} highly positive mentions:")
        for mention, result in positive[:10]:
            print(f"  @{mention.author.username}: {mention.text[:50]}...")

asyncio.run(get_positive_mentions("myaccount"))
```

## See Also

- [ContentGenerator](content.md) - AI content generation
- [BotDetector](detection.md) - Bot detection
- [AIProvider](providers.md) - Provider setup

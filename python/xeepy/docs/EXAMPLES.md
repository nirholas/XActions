# Xeepy Examples

Practical examples for common use cases.

## AI Content Generation

### Generate Engaging Replies

```python
import asyncio
from xeepy.ai import ContentGenerator
from xeepy.ai.providers import OpenAIProvider

async def generate_replies():
    async with OpenAIProvider() as provider:
        generator = ContentGenerator(provider)
        
        tweets_to_reply = [
            "Just hit 10k followers! Thanks everyone for the support!",
            "What's the best programming language to learn in 2024?",
            "AI is going to change everything. Change my mind.",
        ]
        
        for tweet in tweets_to_reply:
            # Generate multiple styles
            for style in ["helpful", "witty", "professional"]:
                reply = await generator.generate_reply(tweet, style=style)
                print(f"\nTweet: {tweet}")
                print(f"Style: {style}")
                print(f"Reply: {reply.content}")

asyncio.run(generate_replies())
```

### Create a Thread

```python
async def create_thread():
    async with OpenAIProvider() as provider:
        generator = ContentGenerator(provider)
        
        thread = await generator.generate_thread(
            topic="Why async programming in Python is a game-changer",
            num_tweets=7,
            style="educational",
        )
        
        print("📝 Generated Thread:\n")
        for i, tweet in enumerate(thread, 1):
            print(f"{i}/ {tweet.content}\n")

asyncio.run(create_thread())
```

### Improve Existing Content

```python
async def improve_content():
    async with OpenAIProvider() as provider:
        generator = ContentGenerator(provider)
        
        original = "I made an app. It's cool. Check it out."
        
        # Try different goals
        goals = ["engagement", "clarity", "viral", "professional"]
        
        for goal in goals:
            improved = await generator.improve_text(original, goal=goal)
            print(f"\nGoal: {goal}")
            print(f"Improved: {improved.content}")

asyncio.run(improve_content())
```

---

## Sentiment Analysis

### Analyze Customer Feedback

```python
async def analyze_feedback():
    from xeepy.ai import SentimentAnalyzer
    from xeepy.ai.providers import OpenAIProvider
    
    feedback = [
        "Your product saved me hours of work! Absolutely love it!",
        "Tried the new update, it's okay I guess.",
        "Worst customer support ever. Still waiting for a response.",
        "The app keeps crashing. Please fix this ASAP!",
        "Just discovered this tool and I'm already hooked!",
    ]
    
    async with OpenAIProvider() as provider:
        analyzer = SentimentAnalyzer(provider)
        
        print("📊 Sentiment Analysis Results:\n")
        
        positive = 0
        negative = 0
        neutral = 0
        
        for text in feedback:
            result = await analyzer.analyze_tweet(text, include_emotions=True)
            
            print(f"Text: {text[:50]}...")
            print(f"Sentiment: {result.label} (score: {result.score:+.2f})")
            print(f"Top emotion: {max(result.emotions.items(), key=lambda x: x[1])}")
            print()
            
            if result.label == "positive":
                positive += 1
            elif result.label == "negative":
                negative += 1
            else:
                neutral += 1
        
        print(f"\nSummary: {positive} positive, {neutral} neutral, {negative} negative")

asyncio.run(analyze_feedback())
```

### Analyze Conversation Sentiment

```python
async def analyze_conversation():
    from xeepy.ai import SentimentAnalyzer
    
    conversation = [
        {"text": "This new policy is terrible!", "author": "user1"},
        {"text": "I actually think it makes sense", "author": "user2"},
        {"text": "No way, it's going to hurt everyone", "author": "user1"},
        {"text": "Let's wait and see the results", "author": "user3"},
        {"text": "I've already seen improvements", "author": "user4"},
        {"text": "Same here, surprisingly positive!", "author": "user2"},
    ]
    
    analyzer = SentimentAnalyzer()  # Falls back to VADER without provider
    
    result = await analyzer.analyze_conversation(conversation)
    
    print("📈 Conversation Analysis:")
    print(f"Overall sentiment: {result.overall_sentiment}")
    print(f"Sentiment trend: {result.sentiment_trend}")
    print(f"Progression: {result.sentiment_progression}")

asyncio.run(analyze_conversation())
```

---

## Bot Detection

### Audit Followers

```python
async def audit_followers():
    from xeepy.ai import SpamDetector
    from xeepy.ai.providers import OpenAIProvider
    
    # Simulated follower data
    followers = [
        {
            "username": "john_developer",
            "bio": "Software engineer | Python lover | Building cool stuff",
            "followers_count": 2500,
            "following_count": 500,
            "tweets_count": 1200,
            "created_at": "2019-03-15",
        },
        {
            "username": "xyz12345678",
            "bio": "Follow for follow | DM for promos | $$ Easy money $$",
            "followers_count": 50,
            "following_count": 4999,
            "tweets_count": 10,
            "created_at": "2024-01-01",
        },
        {
            "username": "ai_news_bot",
            "bio": "",
            "followers_count": 100,
            "following_count": 0,
            "tweets_count": 50000,
            "created_at": "2023-06-01",
        },
    ]
    
    async with OpenAIProvider() as provider:
        detector = SpamDetector(provider)
        
        print("🔍 Follower Audit:\n")
        
        for follower in followers:
            result = await detector.analyze_user(profile_data=follower)
            
            print(f"@{follower['username']}")
            print(f"  Bot score: {result.bot_probability:.0%}")
            print(f"  Spam score: {result.spam_probability:.0%}")
            print(f"  Quality: {result.quality_score}/100")
            
            if result.red_flags:
                print(f"  🚩 Red flags:")
                for flag in result.red_flags:
                    print(f"     - {flag}")
            print()

asyncio.run(audit_followers())
```

---

## Smart Targeting

### Find Growth Targets

```python
async def find_targets():
    from xeepy.ai import SmartTargeting
    from xeepy.ai.providers import OpenAIProvider
    
    async with OpenAIProvider() as provider:
        targeting = SmartTargeting(provider)
        
        # Find targets for different goals
        goals = ["growth", "engagement", "network"]
        
        for goal in goals:
            print(f"\n🎯 Targets for {goal.upper()}:\n")
            
            targets = await targeting.find_targets(
                niche="Python/Data Science",
                goal=goal,
                limit=5,
            )
            
            for i, target in enumerate(targets, 1):
                print(f"{i}. @{target.username}")
                print(f"   Score: {target.score:.0f}/100")
                print(f"   Priority: {target.priority}")
                print(f"   Follow-back chance: {target.estimated_follow_back_chance:.0%}")
                print(f"   Why: {', '.join(target.reasons[:2])}")
                print(f"   Actions: {', '.join(target.recommended_actions)}")

asyncio.run(find_targets())
```

---

## Crypto Twitter Analysis

### Token Sentiment Dashboard

```python
async def crypto_dashboard():
    from xeepy.ai import CryptoAnalyzer
    
    tokens = ["BTC", "ETH", "SOL", "DOGE"]
    
    analyzer = CryptoAnalyzer()
    
    print("🪙 Crypto Sentiment Dashboard\n")
    print("-" * 50)
    
    for token in tokens:
        result = await analyzer.analyze_token_sentiment(token, tweets=[])
        
        # Color coding
        if result.sentiment_label == "bullish":
            emoji = "🟢"
        elif result.sentiment_label == "bearish":
            emoji = "🔴"
        else:
            emoji = "🟡"
        
        trending = "🔥" if result.trending else ""
        
        print(f"{emoji} ${token:4} | {result.sentiment_label:8} | "
              f"Score: {result.overall_sentiment:+.2f} {trending}")
    
    print("-" * 50)

asyncio.run(crypto_dashboard())
```

---

## CLI Examples

### Scraping Workflow

```bash
#!/bin/bash

# 1. Scrape a competitor's profile
xeepy scrape profile competitor -o competitor_profile.json

# 2. Scrape their followers (potential targets)
xeepy scrape followers competitor --limit 1000 -o competitor_followers.csv -f csv

# 3. Scrape their popular tweets
xeepy scrape tweets competitor --limit 50 -o competitor_tweets.json
```

### Engagement Workflow

```bash
#!/bin/bash

# 1. Find and follow users in your niche
xeepy follow by-keyword "Python" "data science" \
  --max 25 \
  --min-followers 500 \
  --max-followers 50000 \
  --dry-run

# 2. If dry run looks good, remove --dry-run
xeepy follow by-keyword "Python" "data science" \
  --max 25 \
  --min-followers 500 \
  --max-followers 50000

# 3. Auto-like relevant content
xeepy engage auto-like "Python tips" "coding" \
  --max 30 \
  --duration 60
```

### Cleanup Workflow

```bash
#!/bin/bash

# 1. Preview non-followers to unfollow
xeepy unfollow non-followers \
  --whitelist friend1 friend2 \
  --min-days 14 \
  --dry-run

# 2. Smart unfollow to reach target ratio
xeepy unfollow smart \
  --target-ratio 1.2 \
  --preserve-engagement \
  --max 50 \
  --dry-run
```

### Monitoring Setup

```bash
#!/bin/bash

# 1. Create initial snapshot
xeepy monitor unfollowers/snapshot

# 2. Check for unfollowers daily (run via cron)
xeepy monitor unfollowers --notify

# 3. Weekly growth report
xeepy monitor growth --period 7d -o weekly_growth.json
```

---

## API Usage Examples

### Python Client

```python
import httpx

class XeepyClient:
    def __init__(self, base_url="http://localhost:8000", api_key=None):
        self.client = httpx.Client(
            base_url=base_url,
            headers={"X-API-Key": api_key} if api_key else {},
        )
    
    def generate_reply(self, tweet_text, style="helpful", num=1):
        response = self.client.post("/api/v1/ai/generate/reply", json={
            "tweet_text": tweet_text,
            "style": style,
            "num_alternatives": num,
        })
        response.raise_for_status()
        return response.json()
    
    def analyze_sentiment(self, text, include_emotions=False):
        response = self.client.post("/api/v1/ai/analyze/sentiment", json={
            "text": text,
            "include_emotions": include_emotions,
        })
        response.raise_for_status()
        return response.json()
    
    def get_unfollowers(self):
        response = self.client.get("/api/v1/monitor/unfollowers")
        response.raise_for_status()
        return response.json()


# Usage
client = XeepyClient(api_key="your-api-key")

# Generate reply
result = client.generate_reply(
    "Just launched my new startup!",
    style="helpful",
    num=3
)
for reply in result["replies"]:
    print(reply)

# Analyze sentiment
sentiment = client.analyze_sentiment(
    "This product is amazing!",
    include_emotions=True
)
print(f"Sentiment: {sentiment['sentiment']} ({sentiment['score']:+.2f})")
```

### Async Python Client

```python
import httpx
import asyncio

async def main():
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Generate thread
        response = await client.post("/api/v1/ai/generate/thread", json={
            "topic": "10 Python tips",
            "num_tweets": 10,
            "style": "educational",
        })
        thread = response.json()
        
        for i, tweet in enumerate(thread["tweets"], 1):
            print(f"{i}. {tweet}")

asyncio.run(main())
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'X-API-Key': 'your-api-key' }
});

async function analyzeAndReply(tweetText) {
  // First analyze sentiment
  const sentimentRes = await client.post('/api/v1/ai/analyze/sentiment', {
    text: tweetText,
    include_emotions: true
  });
  
  console.log('Sentiment:', sentimentRes.data.sentiment);
  
  // Generate appropriate reply based on sentiment
  const style = sentimentRes.data.sentiment === 'positive' ? 'witty' : 'helpful';
  
  const replyRes = await client.post('/api/v1/ai/generate/reply', {
    tweet_text: tweetText,
    style: style
  });
  
  console.log('Generated reply:', replyRes.data.replies[0]);
}

analyzeAndReply("Just shipped my biggest feature yet!");
```

---

## Integration Examples

### Discord Bot Integration

```python
import discord
from xeepy.ai import ContentGenerator, SentimentAnalyzer
from xeepy.ai.providers import OpenAIProvider

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

@client.event
async def on_message(message):
    if message.author == client.user:
        return
    
    if message.content.startswith("!reply"):
        tweet = message.content[7:]  # Remove "!reply "
        
        async with OpenAIProvider() as provider:
            generator = ContentGenerator(provider)
            reply = await generator.generate_reply(tweet, style="witty")
            await message.channel.send(f"Generated reply:\n> {reply.content}")
    
    elif message.content.startswith("!sentiment"):
        text = message.content[11:]  # Remove "!sentiment "
        
        analyzer = SentimentAnalyzer()
        result = await analyzer.analyze_tweet(text)
        
        emoji = "🟢" if result.label == "positive" else "🔴" if result.label == "negative" else "🟡"
        await message.channel.send(f"{emoji} Sentiment: {result.label} (score: {result.score:+.2f})")

client.run("your-discord-token")
```

### Slack Bot Integration

```python
from slack_bolt.async_app import AsyncApp
from xeepy.ai import ContentGenerator
from xeepy.ai.providers import OpenAIProvider

app = AsyncApp(token="xoxb-your-token")

@app.command("/generate-thread")
async def generate_thread(ack, say, command):
    await ack()
    
    topic = command["text"]
    
    async with OpenAIProvider() as provider:
        generator = ContentGenerator(provider)
        thread = await generator.generate_thread(topic, num_tweets=5)
        
        blocks = [{"type": "section", "text": {"type": "mrkdwn", "text": f"*Thread about: {topic}*"}}]
        
        for i, tweet in enumerate(thread, 1):
            blocks.append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"{i}/ {tweet.content}"}
            })
        
        await say(blocks=blocks)
```

---

## Performance Tips

### Batch Processing

```python
async def process_batch(tweets, batch_size=10):
    """Process tweets in batches to avoid rate limits."""
    from xeepy.ai import SentimentAnalyzer
    import asyncio
    
    analyzer = SentimentAnalyzer()
    results = []
    
    for i in range(0, len(tweets), batch_size):
        batch = tweets[i:i + batch_size]
        
        # Process batch concurrently
        batch_results = await asyncio.gather(*[
            analyzer.analyze_tweet(tweet)
            for tweet in batch
        ])
        
        results.extend(batch_results)
        
        # Small delay between batches
        await asyncio.sleep(1)
    
    return results
```

### Caching Results

```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=1000)
def get_cached_sentiment(text_hash):
    """Cache sentiment results by text hash."""
    # This is called only on cache miss
    pass

async def analyze_with_cache(text):
    text_hash = hashlib.md5(text.encode()).hexdigest()
    
    cached = get_cached_sentiment(text_hash)
    if cached:
        return cached
    
    result = await analyzer.analyze_tweet(text)
    # Store in cache
    return result
```

---

## Error Handling

```python
from xeepy.ai.providers import ProviderError, RateLimitError, AuthenticationError

async def safe_generate():
    try:
        async with OpenAIProvider() as provider:
            generator = ContentGenerator(provider)
            reply = await generator.generate_reply("Hello!")
            return reply
            
    except AuthenticationError:
        print("❌ Invalid API key. Check your OPENAI_API_KEY.")
        
    except RateLimitError as e:
        print(f"⏳ Rate limited. Retry after {e.retry_after}s")
        
    except ProviderError as e:
        print(f"⚠️ Provider error: {e}")
        
    except Exception as e:
        print(f"💥 Unexpected error: {e}")
        raise
```

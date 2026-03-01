# 🤖 AI Features Guide

Xeepy integrates with leading AI providers to enable intelligent automation. This guide covers all AI-powered features.

---

## 🎯 Overview

| Feature | Description | Providers |
|---------|-------------|-----------|
| Content Generation | AI-generated tweets, replies, threads | OpenAI, Anthropic, Ollama |
| Sentiment Analysis | Analyze tweet sentiment and emotions | All providers + local |
| Bot Detection | Identify spam/bot accounts | ML-based |
| Smart Targeting | AI recommendations for who to follow | All providers |
| Crypto Analysis | Crypto Twitter intelligence | GPT-4, Claude |

---

## 🔧 Setup

### Install AI Dependencies

```bash
pip install xeepy[ai]
```

### Configure Providers

```python
from xeepy.ai import AIConfig

# OpenAI
config = AIConfig(
    provider="openai",
    api_key="sk-...",
    model="gpt-4"
)

# Anthropic Claude
config = AIConfig(
    provider="anthropic",
    api_key="sk-ant-...",
    model="claude-3-opus-20240229"
)

# Local (Ollama)
config = AIConfig(
    provider="ollama",
    model="llama2",
    base_url="http://localhost:11434"
)
```

### Environment Variables

```bash
# .env file
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://localhost:11434
```

---

## 📝 Content Generation

### Generate Replies

```python
from xeepy.ai import ContentGenerator

ai = ContentGenerator(provider="openai", api_key="...")

# Basic reply
reply = await ai.generate_reply(
    tweet_text="Just launched my startup! 🚀",
    style="supportive"
)
# Output: "Congrats on the launch! What problem are you solving?"

# With context
reply = await ai.generate_reply(
    tweet_text="Python is the best language",
    style="witty",
    context={
        "author": "pythonista42",
        "author_bio": "Python developer | Open source contributor"
    }
)
```

### Available Styles

| Style | Description | Best For |
|-------|-------------|----------|
| `supportive` | Encouraging, positive | Launches, achievements |
| `witty` | Clever, humorous | Entertainment, engagement |
| `professional` | Formal, business-like | B2B, corporate |
| `casual` | Friendly, conversational | General engagement |
| `crypto` | Web3 vernacular (WAGMI, etc.) | Crypto Twitter |
| `tech` | Technical, enthusiastic | Dev community |
| `helpful` | Adds value, informative | Questions, discussions |

### Generate Tweets

```python
# Single tweet
tweet = await ai.generate_tweet(
    topic="Python async programming tips",
    style="educational",
    hashtags=["Python", "AsyncIO"]
)

# Thread
thread = await ai.generate_thread(
    topic="Why async/await is game-changing in Python",
    num_tweets=5,
    style="educational"
)
for i, tweet in enumerate(thread, 1):
    print(f"Tweet {i}: {tweet}")
```

### Improve Existing Text

```python
# Make more engaging
improved = await ai.improve_text(
    text="Check out my new project",
    goal="engagement"  # engagement, clarity, professionalism
)
# Output: "🚀 Just shipped something I've been working on for months! Check it out and let me know what you think 👇"
```

---

## 😊 Sentiment Analysis

### Analyze Single Tweet

```python
from xeepy.ai import SentimentAnalyzer

analyzer = SentimentAnalyzer()

result = await analyzer.analyze_tweet(
    "This product is absolutely terrible! Worst purchase ever!"
)

print(f"Score: {result.score}")      # -0.85 (negative)
print(f"Label: {result.label}")      # "negative"
print(f"Confidence: {result.confidence}")  # 0.92
print(f"Emotions: {result.emotions}")
# {'anger': 0.7, 'disappointment': 0.2, 'frustration': 0.1}
```

### Analyze Conversation

```python
# Analyze a thread or replies
tweets = [
    "Just announced our new feature!",
    "This is amazing! Can't wait to try it",
    "Not sure about the pricing though",
    "Finally! Been waiting for this"
]

sentiment = await analyzer.analyze_conversation(tweets)
print(f"Overall sentiment: {sentiment.overall_label}")  # "positive"
print(f"Sentiment trend: {sentiment.trend}")  # "stable" or "improving" or "declining"
```

### Analyze Mentions

```python
# Analyze how people talk about you/your brand
report = await analyzer.analyze_mentions(
    username="your_username",
    limit=100
)

print(f"Positive mentions: {report.positive_percentage:.1%}")
print(f"Negative mentions: {report.negative_percentage:.1%}")
print(f"Common complaints: {report.negative_topics}")
print(f"Common praise: {report.positive_topics}")
```

---

## 🤖 Bot/Spam Detection

### Analyze Single User

```python
from xeepy.ai import SpamDetector

detector = SpamDetector()

score = await detector.analyze_user("suspicious_account_123")

print(f"Bot probability: {score.bot_probability:.1%}")
print(f"Spam probability: {score.spam_probability:.1%}")
print(f"Quality score: {score.quality_score}/100")
print(f"Red flags: {score.red_flags}")
# ['Default profile picture', 'Account age < 30 days', 
#  'Following/follower ratio > 10', 'Repetitive tweet patterns']
```

### Analyze Your Followers

```python
# Find bots/spam among your followers
report = await detector.analyze_followers(
    username="your_username",
    sample_size=200
)

print(f"Estimated fake followers: {report.fake_percentage:.1%}")
print(f"High-quality followers: {report.quality_percentage:.1%}")
print(f"Suspicious accounts: {report.suspicious_accounts}")
```

### Detection Factors

The bot detector analyzes:

| Factor | Weight | Description |
|--------|--------|-------------|
| Account age | High | New accounts are more suspicious |
| Profile completeness | Medium | Bio, avatar, banner |
| Tweet patterns | High | Repetitive content, timing |
| Engagement ratio | Medium | Likes/retweets vs followers |
| Following ratio | Medium | Following >> Followers = suspicious |
| Content originality | High | Original vs copied content |
| Activity hours | Low | Abnormal posting times |

---

## 🎯 Smart Targeting

### Find Accounts to Follow

```python
from xeepy.ai import SmartTargeting

targeting = SmartTargeting(provider="openai", api_key="...")

recommendations = await targeting.find_targets(
    niche="Python developers",
    goal="growth",  # growth, engagement, sales
    limit=25
)

for rec in recommendations:
    print(f"@{rec.username}")
    print(f"  Score: {rec.score:.2f}")
    print(f"  Why: {rec.reasons}")
    print(f"  Actions: {rec.recommended_actions}")
    print(f"  Follow-back chance: {rec.follow_back_chance:.1%}")
```

### Analyze Target Account

```python
# Deep analysis of a potential account to engage with
analysis = await targeting.analyze_target("python_guru")

print(f"Relevance to your niche: {analysis.relevance_score:.1%}")
print(f"Engagement quality: {analysis.engagement_quality}")
print(f"Best time to engage: {analysis.best_engagement_time}")
print(f"Content themes: {analysis.content_themes}")
print(f"Recommendation: {analysis.recommendation}")
```

---

## 💰 Crypto Twitter Analysis

### Token Sentiment

```python
from xeepy.ai import CryptoAnalyzer

crypto = CryptoAnalyzer(provider="openai", api_key="...")

# Analyze sentiment for a token
sentiment = await crypto.analyze_token_sentiment(
    token="$ETH",
    limit=100
)

print(f"Overall sentiment: {sentiment.label}")  # bullish, bearish, neutral
print(f"Sentiment score: {sentiment.score}")
print(f"Volume of discussion: {sentiment.tweet_count}")
print(f"Notable influencers talking: {sentiment.influencers}")
```

### Find Alpha

```python
# Find potentially valuable tweets
alpha = await crypto.find_alpha(
    keywords=["airdrop", "whitelist", "alpha"],
    limit=50
)

for tweet in alpha:
    print(f"@{tweet.author}: {tweet.text}")
    print(f"  Alpha score: {tweet.alpha_score}")
    print(f"  Urgency: {tweet.urgency}")
```

### Detect Shills

```python
# Detect coordinated promotion
shills = await crypto.detect_shills(
    token="$NEWCOIN",
    limit=50
)

print(f"Shill probability: {shills.shill_probability:.1%}")
print(f"Suspicious accounts: {len(shills.suspicious_accounts)}")
print(f"Coordination patterns: {shills.patterns}")
```

---

## 🔌 Integration Examples

### Auto-Comment with AI

```python
from xeepy import Xeepy
from xeepy.ai import ContentGenerator

async with Xeepy() as x:
    ai = ContentGenerator(provider="openai", api_key="...")
    
    # Search for tweets to engage with
    tweets = await x.scrape.search("Python tips", limit=10)
    
    for tweet in tweets:
        # Generate contextual reply
        reply = await ai.generate_reply(
            tweet_text=tweet.text,
            style="helpful",
            context={"author": tweet.author.username}
        )
        
        # Preview (don't auto-post without review!)
        print(f"Tweet: {tweet.text[:50]}...")
        print(f"Reply: {reply}")
        print("---")
```

### Smart Unfollow with AI

```python
from xeepy import Xeepy
from xeepy.ai import SpamDetector

async with Xeepy() as x:
    detector = SpamDetector()
    
    # Get non-followers
    non_followers = await x.unfollow.get_non_followers()
    
    # Analyze each to keep quality accounts
    to_unfollow = []
    to_keep = []
    
    for user in non_followers:
        score = await detector.analyze_user(user)
        
        if score.quality_score < 30 or score.bot_probability > 0.7:
            to_unfollow.append(user)
        else:
            to_keep.append(user)
    
    print(f"Unfollow (low quality): {len(to_unfollow)}")
    print(f"Keep (high quality): {len(to_keep)}")
```

### Growth Suite with AI

```python
from xeepy import Xeepy
from xeepy.ai import SmartTargeting, ContentGenerator

async with Xeepy() as x:
    targeting = SmartTargeting(provider="openai", api_key="...")
    content = ContentGenerator(provider="openai", api_key="...")
    
    # Find accounts to engage with
    targets = await targeting.find_targets(
        niche="Python developers",
        goal="growth",
        limit=10
    )
    
    for target in targets:
        # Get their recent tweet
        tweets = await x.scrape.tweets(target.username, limit=1)
        
        if tweets:
            # Generate relevant reply
            reply = await content.generate_reply(
                tweet_text=tweets[0].text,
                style="helpful"
            )
            
            print(f"Engage with @{target.username}")
            print(f"  Their tweet: {tweets[0].text[:50]}...")
            print(f"  Your reply: {reply}")
```

---

## 💡 Best Practices

### 1. Don't Auto-Post Without Review

```python
# ✅ Good: Preview before posting
reply = await ai.generate_reply(tweet)
print(f"Preview: {reply}")
user_confirms = input("Post this? (y/n): ")
if user_confirms == "y":
    await x.engage.comment(tweet_url, reply)

# ❌ Bad: Fully automated posting
reply = await ai.generate_reply(tweet)
await x.engage.comment(tweet_url, reply)  # Dangerous!
```

### 2. Use Appropriate Styles

```python
# Match style to context
if "startup" in tweet.lower() or "launch" in tweet.lower():
    style = "supportive"
elif "help" in tweet.lower() or "?" in tweet:
    style = "helpful"
elif account_is_crypto:
    style = "crypto"
else:
    style = "casual"
```

### 3. Rate Limit AI Calls

```python
# AI APIs have rate limits too
import asyncio

for tweet in tweets:
    reply = await ai.generate_reply(tweet.text)
    await asyncio.sleep(1)  # Don't spam the AI API
```

### 4. Cache Results

```python
from functools import lru_cache

@lru_cache(maxsize=100)
async def cached_sentiment(tweet_text):
    return await analyzer.analyze_tweet(tweet_text)
```

---

## 🔒 Privacy & Ethics

- **Never store** user data longer than necessary
- **Don't pretend** AI replies are from a human
- **Respect** user privacy and preferences
- **Don't use** AI for spam or harassment
- **Review** AI-generated content before posting
- **Disclose** AI usage if required by platform

---

## 📊 Cost Estimation

| Provider | Model | Cost per 1K tokens |
|----------|-------|-------------------|
| OpenAI | GPT-4 | ~$0.03-0.06 |
| OpenAI | GPT-3.5 | ~$0.002 |
| Anthropic | Claude 3 Opus | ~$0.015-0.075 |
| Anthropic | Claude 3 Sonnet | ~$0.003-0.015 |
| Ollama | Local | Free |

**Typical usage per feature:**
- Reply generation: 200-500 tokens
- Sentiment analysis: 100-200 tokens
- Thread generation: 1000-2000 tokens

---

## 🚀 Next Steps

1. **[Examples](EXAMPLES.md)** - More AI integration examples
2. **[API Reference](API_REFERENCE.md)** - Full API documentation
3. **[CLI Reference](CLI_REFERENCE.md)** - AI CLI commands

---

<p align="center">
  <strong>AI + Automation = 🚀</strong>
</p>

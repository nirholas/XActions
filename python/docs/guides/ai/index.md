# AI Features Guide

Xeepy integrates with leading AI providers to supercharge your X/Twitter automation with intelligent content generation, analysis, and insights.

## Overview

<div class="grid cards" markdown>

-   :material-robot:{ .lg .middle } **[Content Generation](content.md)**
    
    Generate tweets, threads, and replies with AI

-   :material-message-reply:{ .lg .middle } **[Smart Replies](replies.md)**
    
    Context-aware reply generation

-   :material-emoticon:{ .lg .middle } **[Sentiment Analysis](sentiment.md)**
    
    Understand the tone of conversations

-   :material-account-search:{ .lg .middle } **[Bot Detection](bot-detection.md)**
    
    Identify fake accounts and bots

-   :material-target:{ .lg .middle } **[Smart Targeting](targeting.md)**
    
    Find the right accounts to engage with

</div>

## Supported Providers

| Provider | Models | Best For |
|----------|--------|----------|
| **OpenAI** | GPT-4, GPT-4 Turbo, GPT-3.5 | Best quality, most versatile |
| **Anthropic** | Claude 3 Opus, Sonnet, Haiku | Nuanced content, safety |
| **Ollama** | Llama 3, Mistral, etc. | Free, local, privacy |

## Quick Start

```python
from xeepy.ai import ContentGenerator

# Initialize with your preferred provider
ai = ContentGenerator(
    provider="openai",
    api_key="sk-your-api-key",  # or use OPENAI_API_KEY env var
    model="gpt-4-turbo"
)

# Generate a reply
reply = await ai.generate_reply(
    tweet_text="Just shipped my first SaaS product! 🚀",
    style="supportive"
)
print(reply)  # "Congrats on the launch! 🎉 What problem does it solve?"
```

## Content Generation

### Generate Tweets

```python
from xeepy.ai import ContentGenerator

ai = ContentGenerator(provider="openai")

# Generate a tweet about a topic
tweet = await ai.generate_tweet(
    topic="Python programming tips",
    style="educational",
    include_hashtags=True,
    max_length=280
)

print(tweet)
# "🐍 Python tip: Use list comprehensions instead of loops for cleaner code.
#
# # Instead of this:
# result = []
# for x in items:
#     result.append(x * 2)
#
# # Do this:
# result = [x * 2 for x in items]
#
# #Python #CodingTips"
```

### Generate Threads

```python
ai = ContentGenerator(provider="anthropic", model="claude-3-opus")

thread = await ai.generate_thread(
    topic="How I grew from 0 to 10k followers",
    key_points=[
        "Consistency is key",
        "Engage with your community",
        "Provide value, not self-promotion",
        "Use threads effectively"
    ],
    style="storytelling",
    thread_length=8  # Number of tweets
)

for i, tweet in enumerate(thread.tweets, 1):
    print(f"Tweet {i}/{len(thread.tweets)}:")
    print(tweet)
    print()
```

### Content Styles

```python
# Available styles
styles = [
    "professional",    # Business-appropriate
    "casual",          # Friendly, conversational
    "witty",           # Clever, humorous
    "supportive",      # Encouraging, positive
    "educational",     # Teaching, informative
    "controversial",   # Thought-provoking (use carefully)
    "storytelling",    # Narrative format
    "crypto",          # Web3/crypto community style
    "tech",            # Developer community style
]

# Use different styles
tweet_pro = await ai.generate_tweet(topic, style="professional")
tweet_casual = await ai.generate_tweet(topic, style="casual")
tweet_witty = await ai.generate_tweet(topic, style="witty")
```

## Smart Replies

### Context-Aware Replies

```python
from xeepy import Xeepy
from xeepy.ai import ContentGenerator

async with Xeepy() as x:
    ai = ContentGenerator(provider="openai")
    
    # Get a tweet to reply to
    tweet_url = "https://x.com/user/status/123456789"
    tweet = await x.scrape.tweet(tweet_url)
    
    # Generate contextual reply
    reply = await ai.generate_reply(
        tweet_text=tweet.text,
        author_bio=tweet.author.bio,
        style="supportive",
        max_length=280
    )
    
    print(f"Suggested reply: {reply}")
```

### Reply Variations

```python
# Get multiple reply options
replies = await ai.generate_reply(
    tweet_text="What's the best programming language to learn in 2024?",
    style="educational",
    variations=3  # Generate 3 different replies
)

for i, reply in enumerate(replies, 1):
    print(f"Option {i}: {reply}")
```

### Auto-Reply System

```python
async with Xeepy() as x:
    ai = ContentGenerator(provider="openai")
    
    # Get mentions
    mentions = await x.scrape.mentions("yourusername", limit=10)
    
    for mention in mentions:
        # Skip if already replied
        if mention.has_my_reply:
            continue
        
        # Generate reply
        reply = await ai.generate_reply(
            tweet_text=mention.text,
            style="supportive"
        )
        
        # Review before posting (recommended!)
        print(f"Tweet: {mention.text}")
        print(f"Suggested: {reply}")
        
        if input("Post? (y/n): ").lower() == 'y':
            await x.engage.reply(mention.url, reply)
```

## Sentiment Analysis

### Analyze Tweet Sentiment

```python
from xeepy.ai import SentimentAnalyzer

analyzer = SentimentAnalyzer(provider="openai")

# Single tweet
result = await analyzer.analyze("This product is amazing! Best purchase ever 🙌")
print(f"Sentiment: {result.label}")  # "positive"
print(f"Score: {result.score}")      # 0.95
print(f"Confidence: {result.confidence}")  # 0.98

# Batch analysis
tweets = ["Great work!", "This is terrible", "It's okay I guess"]
results = await analyzer.analyze_batch(tweets)

for tweet, result in zip(tweets, results):
    print(f"{tweet}: {result.label} ({result.score:.2f})")
```

### Monitor Sentiment Trends

```python
async with Xeepy() as x:
    analyzer = SentimentAnalyzer(provider="openai")
    
    # Get replies to your tweet
    replies = await x.scrape.replies(my_tweet_url, limit=100)
    
    # Analyze sentiment
    sentiments = await analyzer.analyze_batch([r.text for r in replies])
    
    positive = sum(1 for s in sentiments if s.label == "positive")
    negative = sum(1 for s in sentiments if s.label == "negative")
    neutral = sum(1 for s in sentiments if s.label == "neutral")
    
    print(f"""
    Sentiment Breakdown:
    ✅ Positive: {positive} ({positive/len(sentiments):.0%})
    ❌ Negative: {negative} ({negative/len(sentiments):.0%})
    😐 Neutral: {neutral} ({neutral/len(sentiments):.0%})
    """)
```

## Bot Detection

### Detect Bot Accounts

```python
from xeepy.ai import BotDetector

detector = BotDetector(provider="openai")

# Check single account
result = await detector.analyze("suspicious_account")

print(f"Bot probability: {result.bot_probability:.0%}")
print(f"Signals: {', '.join(result.signals)}")
# Signals: "High posting frequency", "Generic bio", "Recent account"

# Classification
if result.bot_probability > 0.7:
    print("⚠️ Likely bot")
elif result.bot_probability > 0.4:
    print("🤔 Possibly bot")
else:
    print("✅ Likely human")
```

### Filter Bot Followers

```python
async with Xeepy() as x:
    detector = BotDetector(provider="openai")
    
    # Get followers
    followers = await x.scrape.followers("yourusername", limit=500)
    
    # Analyze for bots
    real_followers = []
    bot_followers = []
    
    for follower in followers:
        result = await detector.analyze_profile(follower)
        
        if result.bot_probability > 0.7:
            bot_followers.append(follower)
        else:
            real_followers.append(follower)
    
    print(f"Real followers: {len(real_followers)}")
    print(f"Likely bots: {len(bot_followers)}")
```

## Smart Targeting

### Find Ideal Accounts to Engage

```python
from xeepy.ai import SmartTargeting

targeting = SmartTargeting(provider="openai")

# Define your ideal audience
ideal_audience = await targeting.find_accounts(
    criteria={
        "interests": ["startups", "SaaS", "indie hacking"],
        "follower_range": (1000, 50000),
        "engagement_rate_min": 0.02,
        "active_days": 7,
        "language": "en"
    },
    sample_from="followers_of:competitor_account",
    limit=100
)

for account in ideal_audience:
    print(f"@{account.username}")
    print(f"  Relevance: {account.relevance_score:.0%}")
    print(f"  Why: {account.relevance_reason}")
```

### Content Recommendations

```python
targeting = SmartTargeting(provider="anthropic")

# Get content recommendations based on your audience
recommendations = await targeting.content_recommendations(
    based_on="my_top_tweets",
    audience_analysis=True
)

print("📝 Content Recommendations:")
for rec in recommendations:
    print(f"  - {rec.topic}")
    print(f"    Predicted engagement: {rec.predicted_engagement}")
    print(f"    Best time to post: {rec.best_time}")
```

## Local AI with Ollama

Use AI features without cloud APIs:

```bash
# Install Ollama first: https://ollama.ai
ollama pull llama3
ollama pull mistral
```

```python
from xeepy.ai import ContentGenerator

# Use local Ollama
ai = ContentGenerator(
    provider="ollama",
    model="llama3",
    base_url="http://localhost:11434"  # Default Ollama URL
)

# Works the same as cloud providers
tweet = await ai.generate_tweet(
    topic="Python automation",
    style="educational"
)
```

## Configuration

### Environment Variables

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# Ollama (optional)
export OLLAMA_BASE_URL="http://localhost:11434"
```

### In Code

```python
from xeepy.ai import ContentGenerator

# Full configuration
ai = ContentGenerator(
    provider="openai",
    api_key="sk-...",
    model="gpt-4-turbo",
    temperature=0.7,      # Creativity (0-1)
    max_tokens=500,       # Response length
    timeout=30,           # Request timeout
)
```

### Config File

```toml
# xeepy.toml
[xeepy.ai]
default_provider = "openai"

[xeepy.ai.openai]
model = "gpt-4-turbo"
temperature = 0.7
max_tokens = 500

[xeepy.ai.anthropic]
model = "claude-3-sonnet"
temperature = 0.7

[xeepy.ai.ollama]
model = "llama3"
base_url = "http://localhost:11434"
```

## CLI Commands

```bash
# Generate tweet
xeepy ai tweet "Python tips" --style educational

# Generate thread
xeepy ai thread "My startup journey" --length 5

# Generate reply
xeepy ai reply "https://x.com/user/status/123" --style supportive

# Analyze sentiment
xeepy ai sentiment "This is amazing!"

# Detect bot
xeepy ai bot-check suspicious_username
```

## Best Practices

1. **Review AI content** - Always review before posting
2. **Add personal touch** - Edit AI suggestions to match your voice
3. **Don't over-automate** - Mix AI and human content
4. **Use appropriate models** - GPT-4 for quality, GPT-3.5 for speed
5. **Consider local AI** - Ollama for privacy and cost savings
6. **Test styles** - Experiment to find what works for your audience

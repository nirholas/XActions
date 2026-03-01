# ContentGenerator

AI-powered content generation for X/Twitter.

## Import

```python
from xeepy.ai import ContentGenerator
```

## Class Signature

```python
class ContentGenerator:
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
| `api_key` | `Optional[str]` | `None` | API key (env var fallback) |
| `model` | `Optional[str]` | `None` | Model name (provider default) |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `generate_reply(tweet, style)` | `str` | Generate reply to tweet |
| `generate_tweet(topic, style)` | `str` | Generate original tweet |
| `generate_thread(topic, length)` | `List[str]` | Generate tweet thread |
| `rewrite(text, style)` | `str` | Rewrite content |
| `hashtags(text)` | `List[str]` | Suggest hashtags |
| `hook(topic)` | `str` | Generate engaging hook |

### `generate_reply`

```python
async def generate_reply(
    self,
    tweet_text: str,
    style: str = "professional",
    context: Optional[str] = None,
    max_length: int = 280
) -> str
```

Generate a contextual reply.

**Parameters:**
- `tweet_text`: Text of tweet to reply to
- `style`: Reply style (`professional`, `witty`, `supportive`, `informative`, `crypto`)
- `context`: Additional context about the account
- `max_length`: Maximum reply length

### `generate_thread`

```python
async def generate_thread(
    self,
    topic: str,
    length: int = 5,
    style: str = "educational"
) -> List[str]
```

Generate a tweet thread.

**Parameters:**
- `topic`: Thread topic
- `length`: Number of tweets (max 25)
- `style`: Thread style

### `hook`

```python
async def hook(
    self,
    topic: str,
    style: str = "curiosity"
) -> str
```

Generate an engaging hook/opener.

**Parameters:**
- `topic`: Topic to create hook for
- `style`: Hook style (`curiosity`, `contrarian`, `statistic`, `story`, `question`)

## Styles

| Style | Description |
|-------|-------------|
| `professional` | Business-appropriate, thoughtful |
| `witty` | Clever, humorous |
| `supportive` | Encouraging, positive |
| `informative` | Educational, factual |
| `crypto` | Crypto/Web3 terminology |
| `tech` | Technical, developer-focused |
| `casual` | Friendly, conversational |

## Usage Examples

### Generate Reply

```python
from xeepy.ai import ContentGenerator

async def main():
    ai = ContentGenerator(provider="openai", api_key="sk-...")
    
    tweet = "Just launched my first SaaS product after 6 months of work!"
    
    reply = await ai.generate_reply(
        tweet_text=tweet,
        style="supportive"
    )
    
    print(f"Reply: {reply}")

asyncio.run(main())
```

### Generate Original Tweet

```python
from xeepy.ai import ContentGenerator

async def main():
    ai = ContentGenerator(provider="anthropic", api_key="sk-ant-...")
    
    tweet = await ai.generate_tweet(
        topic="Python async programming tips",
        style="educational"
    )
    
    print(f"Generated tweet: {tweet}")

asyncio.run(main())
```

### Generate Thread

```python
from xeepy.ai import ContentGenerator

async def main():
    ai = ContentGenerator(provider="openai", api_key="sk-...")
    
    thread = await ai.generate_thread(
        topic="How I grew my Twitter to 10K followers",
        length=7,
        style="story"
    )
    
    print("Generated thread:")
    for i, tweet in enumerate(thread, 1):
        print(f"\n{i}/ {tweet}")

asyncio.run(main())
```

### Generate Hook

```python
from xeepy.ai import ContentGenerator

async def main():
    ai = ContentGenerator(provider="openai", api_key="sk-...")
    
    hooks = []
    for style in ["curiosity", "contrarian", "statistic", "question"]:
        hook = await ai.hook(
            topic="productivity for developers",
            style=style
        )
        hooks.append((style, hook))
    
    print("Hook variations:")
    for style, hook in hooks:
        print(f"\n{style.upper()}: {hook}")

asyncio.run(main())
```

### Rewrite Content

```python
from xeepy.ai import ContentGenerator

async def main():
    ai = ContentGenerator(provider="openai", api_key="sk-...")
    
    original = "We are pleased to announce the release of version 2.0 of our software product."
    
    rewritten = await ai.rewrite(
        text=original,
        style="casual"
    )
    
    print(f"Original: {original}")
    print(f"Rewritten: {rewritten}")

asyncio.run(main())
```

### Suggest Hashtags

```python
from xeepy.ai import ContentGenerator

async def main():
    ai = ContentGenerator(provider="openai", api_key="sk-...")
    
    tweet = "Just built a Python script that automates my email responses using GPT-4"
    
    hashtags = await ai.hashtags(tweet)
    
    print(f"Suggested hashtags: {' '.join(hashtags)}")

asyncio.run(main())
```

### Auto-Reply to Mentions

```python
from xeepy import Xeepy
from xeepy.ai import ContentGenerator

async def auto_reply_mentions():
    ai = ContentGenerator(provider="openai", api_key="sk-...")
    
    async with Xeepy() as x:
        mentions = await x.scrape.mentions(limit=10)
        
        for tweet in mentions.items:
            # Skip already replied
            if tweet.replied:
                continue
            
            # Generate contextual reply
            reply = await ai.generate_reply(
                tweet_text=tweet.text,
                style="supportive",
                context="I'm a Python developer who helps others learn coding"
            )
            
            # Post reply
            await x.engage.reply(tweet.url, reply)
            print(f"Replied to @{tweet.author.username}")

asyncio.run(auto_reply_mentions())
```

### Content Calendar Generation

```python
from xeepy.ai import ContentGenerator

async def generate_week_content():
    ai = ContentGenerator(provider="openai", api_key="sk-...")
    
    topics = [
        "Python tip",
        "Career advice for developers",
        "Productivity hack",
        "Book recommendation",
        "Industry hot take"
    ]
    
    calendar = []
    for day, topic in enumerate(topics):
        tweet = await ai.generate_tweet(topic, style="educational")
        calendar.append({
            "day": day + 1,
            "topic": topic,
            "tweet": tweet
        })
    
    print("Weekly content calendar:")
    for item in calendar:
        print(f"\nDay {item['day']} - {item['topic']}:")
        print(f"  {item['tweet']}")

asyncio.run(generate_week_content())
```

### Different Provider Example

```python
from xeepy.ai import ContentGenerator

async def compare_providers(tweet: str):
    providers = [
        ("openai", "sk-..."),
        ("anthropic", "sk-ant-..."),
    ]
    
    print(f"Original: {tweet}\n")
    
    for provider, key in providers:
        ai = ContentGenerator(provider=provider, api_key=key)
        reply = await ai.generate_reply(tweet, style="witty")
        print(f"{provider.upper()}: {reply}\n")

asyncio.run(compare_providers("Python is the best language!"))
```

### Local Ollama

```python
from xeepy.ai import ContentGenerator

async def main():
    # Use local Ollama (no API key needed)
    ai = ContentGenerator(provider="ollama", model="llama2")
    
    tweet = await ai.generate_tweet(
        topic="Benefits of open source",
        style="professional"
    )
    
    print(tweet)

asyncio.run(main())
```

## See Also

- [AIProvider](providers.md) - AI provider setup
- [SentimentAnalyzer](sentiment.md) - Sentiment analysis
- [ContentAnalytics](../analytics/content.md) - Content analytics

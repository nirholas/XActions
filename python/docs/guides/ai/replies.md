# AI-Powered Reply Generation

Generate contextual, engaging replies to tweets using AI models from OpenAI, Anthropic, or local Ollama instances.

## Overview

The AI reply generator creates human-like responses to tweets based on context, tone, and your specified style preferences. It supports multiple AI providers and can be fine-tuned for different engagement strategies.

## Use Cases

- **Community Engagement**: Respond thoughtfully to followers at scale
- **Brand Voice Consistency**: Maintain consistent tone across all replies
- **Time Savings**: Draft replies quickly for human review
- **Multilingual Support**: Generate replies in multiple languages
- **A/B Testing**: Test different response styles

## Basic Usage

```python
import asyncio
from xeepy.ai import ContentGenerator

async def generate_reply():
    ai = ContentGenerator(
        provider="openai",
        api_key="your-openai-api-key",
        model="gpt-4"
    )
    
    # Generate a reply to a tweet
    reply = await ai.generate_reply(
        tweet_text="Just launched my first Python package! 🎉",
        style="supportive"
    )
    
    print(f"Generated reply: {reply}")

asyncio.run(generate_reply())
```

## Provider Configuration

```python
from xeepy.ai import ContentGenerator

# OpenAI Configuration
openai_ai = ContentGenerator(
    provider="openai",
    api_key="sk-...",
    model="gpt-4-turbo"  # or gpt-3.5-turbo
)

# Anthropic (Claude) Configuration
anthropic_ai = ContentGenerator(
    provider="anthropic",
    api_key="sk-ant-...",
    model="claude-3-opus-20240229"  # or claude-3-sonnet
)

# Ollama (Local) Configuration
ollama_ai = ContentGenerator(
    provider="ollama",
    base_url="http://localhost:11434",
    model="llama2"  # or mistral, codellama
)
```

## Reply Styles

```python
async def styled_replies():
    ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
    
    tweet = "Struggling to learn machine learning. Any tips?"
    
    # Different style options
    styles = ["supportive", "professional", "witty", "educational", "casual"]
    
    for style in styles:
        reply = await ai.generate_reply(
            tweet_text=tweet,
            style=style,
            max_length=280
        )
        print(f"\n[{style.upper()}]: {reply}")

asyncio.run(styled_replies())
```

## Context-Aware Replies

```python
async def contextual_reply():
    ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
    
    # Provide additional context for better replies
    reply = await ai.generate_reply(
        tweet_text="What's the best programming language for beginners?",
        style="educational",
        context={
            "your_expertise": "Python developer with 10 years experience",
            "brand_voice": "helpful, encouraging, practical",
            "target_audience": "coding beginners",
            "avoid_topics": ["language wars", "negative comparisons"]
        },
        max_length=280
    )
    
    print(f"Reply: {reply}")

asyncio.run(contextual_reply())
```

## Batch Reply Generation

```python
async def batch_replies():
    from xeepy import Xeepy
    from xeepy.ai import ContentGenerator
    
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        # Get tweets to reply to
        mentions = await x.scrape.search("@yourusername", limit=20)
        
        replies = []
        for tweet in mentions:
            reply = await ai.generate_reply(
                tweet_text=tweet.text,
                style="professional",
                max_length=280
            )
            replies.append({
                "original_tweet": tweet.text,
                "author": tweet.author.username,
                "generated_reply": reply
            })
            print(f"@{tweet.author.username}: {reply[:50]}...")
        
        # Export for review before posting
        x.export.to_json(replies, "draft_replies.json")

asyncio.run(batch_replies())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `provider` | str | required | openai, anthropic, ollama |
| `api_key` | str | required* | API key for provider |
| `model` | str | required | Model identifier |
| `base_url` | str | None | Custom API endpoint (Ollama) |
| `temperature` | float | 0.7 | Creativity level (0-1) |
| `max_tokens` | int | 150 | Maximum response length |

!!! tip "Temperature Settings"
    - **0.3-0.5**: More consistent, predictable replies
    - **0.6-0.8**: Balanced creativity and coherence
    - **0.9-1.0**: More creative, varied responses

!!! warning "Human Review"
    Always review AI-generated content before posting. AI can produce inappropriate or off-brand responses that require editing.

## Thread Reply Generation

```python
async def generate_thread_reply():
    ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
    
    # Generate reply with thread context
    reply = await ai.generate_reply(
        tweet_text="This is the 5th tweet in the thread",
        thread_context=[
            "First tweet introducing the topic",
            "Second tweet with more details",
            "Third tweet with examples",
            "Fourth tweet addressing concerns"
        ],
        style="educational",
        max_length=280
    )
    
    print(f"Thread-aware reply: {reply}")

asyncio.run(generate_thread_reply())
```

## Custom Prompts

```python
async def custom_prompt_reply():
    ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
    
    # Use a completely custom prompt
    reply = await ai.generate_reply(
        tweet_text="What's your favorite productivity tool?",
        custom_prompt="""
        You are a tech productivity expert. Generate a reply that:
        1. Recommends one specific tool
        2. Gives a brief reason why
        3. Keeps it under 200 characters
        4. Ends with an engaging question
        
        Tweet to reply to: {tweet_text}
        """,
        max_length=280
    )
    
    print(f"Custom reply: {reply}")

asyncio.run(custom_prompt_reply())
```

## Quality Filtering

```python
async def quality_filtered_replies():
    ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
    
    tweet = "Just shipped my first feature!"
    
    # Generate multiple options and score them
    options = []
    for _ in range(3):
        reply = await ai.generate_reply(
            tweet_text=tweet,
            style="supportive",
            temperature=0.8  # Higher variance
        )
        
        # Score the reply
        score = await ai.score_reply(
            original_tweet=tweet,
            reply=reply,
            criteria=["relevance", "engagement_potential", "brand_alignment"]
        )
        
        options.append({"reply": reply, "score": score})
    
    # Pick the best one
    best = max(options, key=lambda x: x["score"])
    print(f"Best reply (score {best['score']:.2f}): {best['reply']}")

asyncio.run(quality_filtered_replies())
```

## Best Practices

1. **Review Before Posting**: Never auto-post without human review
2. **Define Brand Voice**: Create clear guidelines for the AI to follow
3. **Use Temperature Wisely**: Lower for consistency, higher for creativity
4. **Provide Context**: More context leads to better, more relevant replies
5. **A/B Test Styles**: Try different styles to see what resonates
6. **Monitor Quality**: Regularly audit generated content for accuracy
7. **Respect Rate Limits**: AI API calls have costs and limits

## Related Guides

- [Sentiment Analysis](sentiment.md)
- [Bot Detection](bot-detection.md)
- [Engagement Analysis](../analytics/engagement.md)

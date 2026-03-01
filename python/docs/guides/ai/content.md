# AI Content Generation

Generate high-quality tweets, threads, and content with AI.

## Setup

```python
from xeepy.ai import ContentGenerator

# OpenAI
ai = ContentGenerator(
    provider="openai",
    api_key="sk-...",
    model="gpt-4"  # or "gpt-3.5-turbo"
)

# Anthropic
ai = ContentGenerator(
    provider="anthropic",
    api_key="sk-ant-...",
    model="claude-3-opus-20240229"
)

# Ollama (local, free)
ai = ContentGenerator(
    provider="ollama",
    model="llama2"
)
```

## Generate Tweets

### Basic Tweet Generation

```python
# Simple tweet
tweet = await ai.generate_tweet(
    topic="Python productivity tips"
)
# Output: "🐍 Python tip: Use list comprehensions instead of loops for cleaner, 
#          faster code. [x**2 for x in range(10)] > traditional loops every time!"

# With style
tweet = await ai.generate_tweet(
    topic="New feature announcement",
    style="excited"
)

# With constraints
tweet = await ai.generate_tweet(
    topic="AI in healthcare",
    max_length=200,  # Leave room for link
    include_emoji=True,
    include_hashtags=False
)
```

### Style Options

| Style | Description | Use Case |
|-------|-------------|----------|
| `professional` | Formal, authoritative | B2B, announcements |
| `casual` | Friendly, conversational | Community building |
| `excited` | Energetic, enthusiastic | Launches, wins |
| `educational` | Informative, teaching | Tips, how-tos |
| `witty` | Clever, humorous | Engagement bait |
| `supportive` | Encouraging, helpful | Replies, community |
| `controversial` | Bold, thought-provoking | Engagement, debates |

```python
# Professional announcement
tweet = await ai.generate_tweet(
    topic="Q4 earnings exceeded expectations",
    style="professional",
    tone_modifiers=["confident", "data-driven"]
)

# Casual engagement
tweet = await ai.generate_tweet(
    topic="Friday mood",
    style="casual",
    include_emoji=True
)

# Controversial take
tweet = await ai.generate_tweet(
    topic="Remote work vs office",
    style="controversial",
    avoid=["offensive", "political"]
)
```

## Generate Threads

### Basic Thread

```python
thread = await ai.generate_thread(
    topic="10 Python tips every developer should know",
    thread_length=10,
    style="educational"
)

# Returns list of tweets
for i, tweet in enumerate(thread, 1):
    print(f"{i}. {tweet}")

# Post the thread
async with Xeepy() as x:
    await x.post.thread(thread)
```

### Structured Thread

```python
# Thread with specific structure
thread = await ai.generate_thread(
    topic="How I grew from 0 to 100k followers",
    thread_length=12,
    structure={
        "hook": "Attention-grabbing opener",
        "story": "4-5 story tweets",
        "lessons": "3-4 key takeaways",
        "cta": "Call to action"
    },
    style="storytelling"
)
```

### Thread from Content

```python
# Convert article to thread
thread = await ai.article_to_thread(
    content="""
    Your long-form article or blog post content here...
    Can be multiple paragraphs with detailed information.
    """,
    max_tweets=15,
    preserve_key_points=True
)

# Convert video transcript to thread
thread = await ai.transcript_to_thread(
    transcript="Video transcript text...",
    max_tweets=10,
    highlight_quotes=True
)
```

## Generate Replies

### Contextual Replies

```python
# Reply to a tweet
reply = await ai.generate_reply(
    tweet_text="Just launched my first SaaS product! Nervous but excited 🚀",
    style="supportive"
)
# Output: "Congratulations on the launch! 🎉 The first step is always the hardest. 
#          What problem does it solve? Would love to check it out!"

# Reply matching energy
reply = await ai.generate_reply(
    tweet_text="This is the worst take I've seen all week",
    style="diplomatic",
    avoid=["confrontational", "dismissive"]
)
```

### Reply with Context

```python
# Use conversation context
reply = await ai.generate_reply(
    tweet_text="What's your favorite programming language?",
    context={
        "author_bio": "Python developer, ML enthusiast",
        "your_expertise": ["Python", "AI", "Data Science"],
        "conversation_tone": "friendly"
    },
    style="knowledgeable"
)

# Reply to question
reply = await ai.generate_reply(
    tweet_text="How do I get started with machine learning?",
    style="helpful",
    include_resources=True,
    max_length=280
)
```

## Brand Voice Training

### Train on Your Content

```python
# Provide example tweets
ai.train_voice(
    example_tweets=[
        "Your past tweet 1",
        "Your past tweet 2", 
        "Your past tweet 3",
        # More examples = better results (10-20 recommended)
    ]
)

# Or load from your timeline
async with Xeepy() as x:
    my_tweets = await x.scrape.tweets("your_username", limit=50)
    ai.train_voice(example_tweets=[t.text for t in my_tweets])
```

### Brand Guidelines

```python
ai.set_brand_guidelines({
    "tone": "friendly, professional",
    "personality": ["helpful", "knowledgeable", "approachable"],
    "vocabulary": {
        "prefer": ["innovative", "streamlined", "powerful"],
        "avoid": ["revolutionary", "disrupting", "game-changing"]
    },
    "formatting": {
        "use_emoji": True,
        "emoji_style": "minimal",  # or "expressive"
        "hashtags": False,
        "threads_over_long_tweets": True
    },
    "topics": {
        "focus": ["AI", "productivity", "development"],
        "avoid": ["politics", "controversy"]
    }
})

# Generate with brand voice
tweet = await ai.generate_tweet(
    topic="New feature release",
    use_brand_voice=True
)
```

## Batch Generation

```python
# Generate multiple tweets at once
topics = [
    "Python tip of the day",
    "Remote work productivity",
    "AI industry news",
    "Developer tools recommendation"
]

tweets = await ai.generate_batch(
    topics=topics,
    style="educational",
    deduplicate=True  # Ensure variety
)

# Generate week of content
content_calendar = await ai.generate_content_calendar(
    themes=["Python", "AI", "Productivity"],
    days=7,
    posts_per_day=3,
    styles=["educational", "engaging", "promotional"]
)
```

## Advanced Options

### Temperature Control

```python
# Low temperature = more consistent, predictable
ai_consistent = ContentGenerator(
    provider="openai",
    api_key="...",
    temperature=0.3
)

# High temperature = more creative, varied
ai_creative = ContentGenerator(
    provider="openai", 
    api_key="...",
    temperature=0.9
)
```

### A/B Testing

```python
# Generate variations for testing
variations = await ai.generate_variations(
    topic="New product launch",
    count=5,
    vary_by=["style", "emoji", "length"]
)

# Test which performs best
for i, tweet in enumerate(variations):
    print(f"Variation {i+1}: {tweet}")
```

### Content Hooks

```python
# Generate attention-grabbing hooks
hooks = await ai.generate_hooks(
    topic="Why Python is perfect for beginners",
    hook_types=[
        "question",      # "Ever wondered why...?"
        "statistic",     # "90% of developers..."
        "controversial", # "Unpopular opinion:..."
        "story",         # "Last year I..."
        "bold_claim"     # "Python will change..."
    ]
)
```

## Quality Control

### Review System

```python
# Generate with quality check
tweet = await ai.generate_tweet(
    topic="AI ethics",
    quality_check=True  # AI reviews its own output
)

# Manual approval workflow
class ContentApprover:
    def __init__(self, ai):
        self.ai = ai
        self.pending = []
    
    async def generate_for_review(self, topic, count=5):
        tweets = await self.ai.generate_batch([topic] * count)
        self.pending.extend(tweets)
        return tweets
    
    def approve(self, index):
        return self.pending.pop(index)
    
    def reject_all(self):
        self.pending.clear()
```

### Content Filtering

```python
# Built-in safety
ai = ContentGenerator(
    provider="openai",
    api_key="...",
    safety_filter=True,  # Filter inappropriate content
    fact_check=True,     # Flag potentially false claims
    brand_safe=True      # Avoid controversial topics
)
```

## Cost Optimization

```python
# Use cheaper model for drafts, expensive for final
draft_ai = ContentGenerator(provider="openai", model="gpt-3.5-turbo")
final_ai = ContentGenerator(provider="openai", model="gpt-4")

# Generate drafts cheaply
drafts = await draft_ai.generate_batch(topics, count=10)

# Polish best ones with GPT-4
best_draft = drafts[0]  # After human selection
final = await final_ai.improve_tweet(best_draft)

# Or use local AI for high volume
local_ai = ContentGenerator(provider="ollama", model="llama2")
bulk_content = await local_ai.generate_batch(topics, count=100)
```

## Integration with Posting

```python
async with Xeepy() as x:
    # Generate and post
    tweet = await ai.generate_tweet("Python tip of the day")
    await x.post.tweet(tweet)
    
    # Generate and schedule
    tweets = await ai.generate_batch(
        ["Monday motivation", "Tuesday tip", "Wednesday wisdom"],
        style="inspiring"
    )
    
    for i, tweet in enumerate(tweets):
        schedule_time = f"2024-01-{15+i} 09:00"
        await x.schedule.tweet(tweet, schedule_time)
```

## Best Practices

!!! tip "Quality Tips"
    - Provide specific topics, not vague prompts
    - Use brand guidelines for consistency
    - Review all AI content before posting
    - A/B test different styles

!!! warning "Authenticity"
    - Don't rely 100% on AI - add your personal touch
    - Disclose AI usage if required by platform
    - Mix AI content with genuine posts
    - Respond to comments personally

## Next Steps

[:octicons-arrow-right-24: Smart Replies](replies.md) - AI-powered reply generation

[:octicons-arrow-right-24: Sentiment Analysis](sentiment.md) - Analyze content tone

[:octicons-arrow-right-24: Content Calendar](../../cookbook/automation/content-calendar.md) - Automate content scheduling

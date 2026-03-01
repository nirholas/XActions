# Xeepy Features Guide

Comprehensive guide to all Xeepy features.

## AI-Powered Features

### Content Generation

Generate high-quality content for X/Twitter using AI.

#### Tweet Generation

```python
from xeepy.ai import ContentGenerator
from xeepy.ai.providers import OpenAIProvider

async with OpenAIProvider() as provider:
    generator = ContentGenerator(provider)
    
    # Generate a single tweet
    result = await generator.generate_tweet(
        topic="Python async programming",
        style="informative",
        hashtags=["Python", "AsyncIO"],
    )
    print(result.content)
```

#### Reply Generation

```python
# Generate a contextual reply
reply = await generator.generate_reply(
    tweet_text="Just deployed my first ML model to production!",
    style="helpful",  # or witty, professional, crypto, tech, casual
    max_length=280,
)
print(reply.content)
```

#### Thread Generation

```python
# Generate a multi-tweet thread
thread = await generator.generate_thread(
    topic="10 Python tips every developer should know",
    num_tweets=10,
    style="educational",
)

for i, tweet in enumerate(thread, 1):
    print(f"{i}. {tweet.content}\n")
```

#### Content Styles

| Style | Description | Best For |
|-------|-------------|----------|
| `helpful` | Informative, constructive | General engagement |
| `witty` | Clever, humorous | Entertainment |
| `professional` | Formal, business-like | B2B, corporate |
| `crypto` | Crypto Twitter vernacular | Web3 community |
| `tech` | Technical, detailed | Developer audience |
| `casual` | Friendly, conversational | Personal accounts |

### Sentiment Analysis

Analyze the sentiment of tweets and conversations.

```python
from xeepy.ai import SentimentAnalyzer

analyzer = SentimentAnalyzer(provider)

# Analyze a single tweet
result = await analyzer.analyze_tweet(
    "This new feature is absolutely amazing! Best update ever!",
    include_emotions=True,
)

print(f"Sentiment: {result.label}")  # positive, negative, neutral
print(f"Score: {result.score}")  # -1.0 to 1.0
print(f"Confidence: {result.confidence}")  # 0.0 to 1.0
print(f"Emotions: {result.emotions}")  # {joy: 0.8, trust: 0.6, ...}
```

#### Conversation Analysis

```python
# Analyze sentiment of a conversation
conversation_result = await analyzer.analyze_conversation(
    tweets=[
        {"text": "Love this!", "author": "user1"},
        {"text": "Totally agree!", "author": "user2"},
        {"text": "Not sure about this...", "author": "user3"},
    ]
)

print(f"Overall sentiment: {conversation_result.overall_sentiment}")
print(f"Progression: {conversation_result.sentiment_progression}")
```

### Bot/Spam Detection

Identify potential bot accounts, spam, and fake followers.

```python
from xeepy.ai import SpamDetector

detector = SpamDetector(provider)

# Analyze a user
result = await detector.analyze_user(
    profile_data={
        "username": "suspicious_user",
        "bio": "Follow for follow | DM for promos",
        "followers_count": 50,
        "following_count": 5000,
        "tweets_count": 100,
        "created_at": "2024-01-01",
    }
)

print(f"Bot Probability: {result.bot_probability:.0%}")
print(f"Spam Probability: {result.spam_probability:.0%}")
print(f"Quality Score: {result.quality_score}/100")
print(f"Red Flags: {result.red_flags}")
```

#### Detection Signals

The detector looks for:
- High following/followers ratio
- Account age vs activity level
- Suspicious bio patterns
- Default profile pictures
- Generic usernames
- Tweet patterns

### Smart Targeting

AI-powered recommendations for accounts to engage with.

```python
from xeepy.ai import SmartTargeting

targeting = SmartTargeting(provider)

# Find targets in a niche
targets = await targeting.find_targets(
    niche="AI/ML",
    goal="growth",  # growth, engagement, sales, network
    limit=10,
)

for target in targets:
    print(f"@{target.username}")
    print(f"  Score: {target.score}")
    print(f"  Follow-back chance: {target.estimated_follow_back_chance:.0%}")
    print(f"  Actions: {target.recommended_actions}")
```

#### Targeting Goals

| Goal | Optimizes For |
|------|---------------|
| `growth` | Accounts likely to follow back |
| `engagement` | Active users who engage |
| `sales` | Potential customers |
| `network` | Industry connections |

### Crypto Analysis

Specialized features for Crypto Twitter.

```python
from xeepy.ai import CryptoAnalyzer

analyzer = CryptoAnalyzer(provider)

# Token sentiment analysis
sentiment = await analyzer.analyze_token_sentiment(
    token="ETH",
    tweets=scraped_tweets,  # Optional
)

print(f"${sentiment.token}: {sentiment.sentiment_label}")
print(f"Score: {sentiment.overall_sentiment:+.2f}")
print(f"Volume: {sentiment.volume} tweets")
print(f"Trending: {sentiment.trending}")
print(f"Narratives: {sentiment.common_narratives}")
print(f"Warnings: {sentiment.warning_signs}")
```

#### Alpha Detection

```python
# Find potential alpha tweets
alpha_tweets = await analyzer.find_alpha(
    tweets=scraped_tweets,
    min_score=0.7,
)

for tweet in alpha_tweets:
    print(f"Score: {tweet.alpha_score}")
    print(f"Type: {tweet.tweet_type}")  # alpha, shill, news, etc.
    print(f"Text: {tweet.text}")
```

### Influencer Discovery

Find and analyze influencers in any niche.

```python
from xeepy.ai import InfluencerFinder

finder = InfluencerFinder(provider)

# Find influencers
influencers = await finder.find_influencers(
    niche="AI",
    min_tier="micro",  # nano, micro, macro, mega
    limit=20,
)

for inf in influencers:
    print(f"@{inf.username} ({inf.tier.value})")
    print(f"  Followers: {inf.followers_count:,}")
    print(f"  Engagement: {inf.engagement_rate:.1%}")
    print(f"  Topics: {inf.topics}")
```

#### Influencer Tiers

| Tier | Followers | Characteristics |
|------|-----------|-----------------|
| Nano | 1K-10K | High engagement, niche authority |
| Micro | 10K-100K | Good engagement, targeted reach |
| Macro | 100K-1M | Broad reach, moderate engagement |
| Mega | 1M+ | Maximum reach, lower engagement |

---

## Scraping Features

### Profile Scraping

```bash
# CLI
xeepy scrape profile elonmusk -o profile.json

# Python
profile = await scraper.get_profile("elonmusk")
```

### Follower/Following Scraping

```bash
# Get followers
xeepy scrape followers elonmusk --limit 1000 -o followers.json

# Get following
xeepy scrape following elonmusk --limit 1000
```

### Tweet Scraping

```bash
# User timeline
xeepy scrape tweets elonmusk --limit 100 --include-replies

# Replies to a tweet
xeepy scrape replies https://twitter.com/user/status/123

# Thread
xeepy scrape thread https://twitter.com/user/status/123
```

### Search

```bash
# Search tweets
xeepy scrape search "AI machine learning" --type tweets

# Search users
xeepy scrape search "AI developer" --type users
```

---

## Follow/Unfollow Features

### Smart Following

```bash
# By keyword
xeepy follow by-keyword "Python" "JavaScript" --max 50 --min-followers 500

# Followers of competitor
xeepy follow followers-of competitor_account --max 100

# Engagers on a tweet
xeepy follow engagers tweet_url --likers --commenters
```

### Intelligent Unfollowing

```bash
# Non-followers with whitelist
xeepy unfollow non-followers --whitelist friend1 friend2 --dry-run

# Inactive accounts
xeepy unfollow inactive --days 90

# Smart unfollow
xeepy unfollow smart --target-ratio 1.2 --preserve-engagement
```

---

## Engagement Automation

### Auto-Like

```bash
# Like tweets by keyword
xeepy engage auto-like "AI" "ML" --max 50 --duration 30 --dry-run
```

### Auto-Comment

```bash
# AI-generated comments
xeepy engage auto-comment "startup" "founder" --style helpful --max 20
```

### Auto-Engage

```bash
# Full engagement with a user
xeepy engage auto-engage target_user --likes 5 --comments 2 --retweets 1
```

---

## Monitoring Features

### Unfollower Detection

```bash
# Check unfollowers
xeepy monitor unfollowers --notify

# Create snapshot
xeepy monitor unfollowers/snapshot
```

### Growth Analytics

```bash
# Growth report
xeepy monitor growth --period 30d -o growth_report.json
```

### Keyword Monitoring

```bash
# Monitor topics
xeepy monitor keywords "brand" "product" --alert-threshold 10 --sentiment
```

### Real-time Mentions

```bash
# Monitor mentions
xeepy monitor mentions --continuous --interval 5 --notify
```

---

## Best Practices

### Rate Limiting

Always respect rate limits:

```yaml
# config.yaml
rate_limit:
  requests_per_minute: 60
  delay_between_follows: 5.0
  delay_between_likes: 1.0
  max_follows_per_day: 200
```

### Whitelisting

Protect important accounts:

```bash
xeepy unfollow non-followers \
  --whitelist-file whitelist.txt \
  --min-days 7
```

### Dry Runs

Test before executing:

```bash
xeepy follow by-keyword "AI" --max 50 --dry-run
```

### Export Results

Always export for analysis:

```bash
xeepy scrape followers user --limit 1000 -o followers.csv -f csv
```

---

## Limitations

⚠️ **Educational purposes only!**

- Do NOT run against X/Twitter production
- Automation may violate ToS
- Accounts can be restricted
- Use responsibly and ethically

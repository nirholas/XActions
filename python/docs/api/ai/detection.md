# BotDetector

AI-powered bot and spam account detection.

## Import

```python
from xeepy.ai import BotDetector
```

## Class Signature

```python
class BotDetector:
    def __init__(
        self,
        provider: str = "openai",
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        threshold: float = 0.7
    )
```

## Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `provider` | `str` | `"openai"` | AI provider name |
| `api_key` | `Optional[str]` | `None` | API key |
| `model` | `Optional[str]` | `None` | Model name |
| `threshold` | `float` | `0.7` | Bot probability threshold |

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `analyze(user)` | `BotAnalysis` | Analyze single user |
| `analyze_batch(users)` | `List[BotAnalysis]` | Analyze multiple users |
| `filter_bots(users)` | `FilterResult` | Filter out bots |
| `analyze_followers(username)` | `FollowerAnalysis` | Analyze follower quality |
| `spam_check(tweet)` | `SpamResult` | Check if tweet is spam |

### `analyze`

```python
async def analyze(
    self,
    user: User
) -> BotAnalysis
```

Analyze if a user is a bot.

### `filter_bots`

```python
async def filter_bots(
    self,
    users: List[User],
    threshold: Optional[float] = None
) -> FilterResult
```

Separate real users from bots.

**Parameters:**
- `users`: Users to filter
- `threshold`: Custom threshold (default: instance threshold)

### `analyze_followers`

```python
async def analyze_followers(
    self,
    username: str,
    sample_size: int = 200
) -> FollowerAnalysis
```

Analyze bot percentage among followers.

## BotAnalysis Object

```python
@dataclass
class BotAnalysis:
    user: User                       # Analyzed user
    is_bot: bool                     # Bot classification
    bot_probability: float           # 0.0 to 1.0
    confidence: float                # Analysis confidence
    signals: List[str]               # Bot indicators found
    human_signals: List[str]         # Human indicators found
    category: str                    # bot, human, suspicious
```

## FilterResult Object

```python
@dataclass
class FilterResult:
    real_users: List[User]           # Likely human users
    bots: List[User]                 # Likely bots
    suspicious: List[User]           # Uncertain cases
    bot_percentage: float            # % identified as bots
```

## FollowerAnalysis Object

```python
@dataclass
class FollowerAnalysis:
    username: str                    # Account analyzed
    total_sampled: int               # Followers sampled
    bot_percentage: float            # % bots
    suspicious_percentage: float     # % suspicious
    quality_score: float             # 0-100 quality
    common_bot_patterns: List[str]   # Patterns found
```

## SpamResult Object

```python
@dataclass
class SpamResult:
    is_spam: bool                    # Spam classification
    spam_probability: float          # 0.0 to 1.0
    spam_type: Optional[str]         # Type if spam
    signals: List[str]               # Spam indicators
```

## Bot Signals

Common bot indicators detected:

| Signal | Description |
|--------|-------------|
| `default_profile_image` | Using default avatar |
| `no_bio` | Empty or generic bio |
| `suspicious_username` | Random characters/numbers |
| `high_following_ratio` | Follows many, few followers |
| `low_tweet_count` | Very few tweets |
| `repetitive_content` | Duplicate/similar tweets |
| `rapid_posting` | Unnaturally fast posting |
| `new_account` | Recently created |

## Usage Examples

### Analyze Single User

```python
from xeepy import Xeepy
from xeepy.ai import BotDetector

async def main():
    detector = BotDetector(provider="openai", api_key="sk-...")
    
    async with Xeepy() as x:
        user = await x.scrape.profile("suspicious_account")
        analysis = await detector.analyze(user)
        
        print(f"=== Bot Analysis: @{user.username} ===")
        print(f"Classification: {analysis.category}")
        print(f"Bot probability: {analysis.bot_probability:.0%}")
        print(f"Confidence: {analysis.confidence:.0%}")
        
        if analysis.signals:
            print(f"\n🚩 Bot signals:")
            for signal in analysis.signals:
                print(f"  - {signal}")
        
        if analysis.human_signals:
            print(f"\n✓ Human signals:")
            for signal in analysis.human_signals:
                print(f"  - {signal}")

asyncio.run(main())
```

### Filter Bots from Followers

```python
from xeepy import Xeepy
from xeepy.ai import BotDetector

async def clean_followers(username: str):
    detector = BotDetector(provider="openai", api_key="sk-...", threshold=0.7)
    
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=200)
        
        result = await detector.filter_bots(followers.items)
        
        print(f"=== Follower Analysis ===")
        print(f"Total analyzed: {len(followers.items)}")
        print(f"Real users: {len(result.real_users)}")
        print(f"Bots: {len(result.bots)}")
        print(f"Suspicious: {len(result.suspicious)}")
        print(f"Bot percentage: {result.bot_percentage:.1f}%")
        
        if result.bots:
            print(f"\nIdentified bots:")
            for bot in result.bots[:10]:
                print(f"  - @{bot.username}")

asyncio.run(clean_followers("myaccount"))
```

### Analyze Follower Quality

```python
from xeepy import Xeepy
from xeepy.ai import BotDetector

async def follower_quality(username: str):
    detector = BotDetector(provider="openai", api_key="sk-...")
    
    async with Xeepy() as x:
        analysis = await detector.analyze_followers(username, sample_size=300)
        
        print(f"=== Follower Quality: @{username} ===")
        print(f"Sampled: {analysis.total_sampled}")
        print(f"Bot percentage: {analysis.bot_percentage:.1f}%")
        print(f"Suspicious: {analysis.suspicious_percentage:.1f}%")
        print(f"Quality score: {analysis.quality_score:.0f}/100")
        
        if analysis.common_bot_patterns:
            print(f"\nCommon bot patterns found:")
            for pattern in analysis.common_bot_patterns:
                print(f"  - {pattern}")
        
        if analysis.quality_score >= 80:
            print("\n✓ High quality followers!")
        elif analysis.quality_score >= 60:
            print("\n⚠️ Moderate quality")
        else:
            print("\n❌ Low quality - consider cleaning")

asyncio.run(follower_quality("myaccount"))
```

### Check Tweet for Spam

```python
from xeepy import Xeepy
from xeepy.ai import BotDetector

async def check_replies_for_spam(tweet_url: str):
    detector = BotDetector(provider="openai", api_key="sk-...")
    
    async with Xeepy() as x:
        replies = await x.scrape.replies(tweet_url, limit=50)
        
        spam_count = 0
        for reply in replies.items:
            result = await detector.spam_check(reply)
            
            if result.is_spam:
                spam_count += 1
                print(f"🚫 Spam detected ({result.spam_type}):")
                print(f"   @{reply.author.username}: {reply.text[:50]}...")
        
        print(f"\nTotal spam replies: {spam_count}/{len(replies.items)}")

asyncio.run(check_replies_for_spam("https://x.com/user/status/123"))
```

### Batch User Analysis

```python
from xeepy import Xeepy
from xeepy.ai import BotDetector

async def analyze_new_followers():
    detector = BotDetector(provider="openai", api_key="sk-...")
    
    async with Xeepy() as x:
        # Get recent followers
        followers = await x.scrape.followers("myaccount", limit=50)
        
        # Analyze all
        results = await detector.analyze_batch(followers.items)
        
        for user, analysis in zip(followers.items, results):
            if analysis.is_bot:
                print(f"🤖 @{user.username} - {analysis.bot_probability:.0%} bot")
            elif analysis.category == "suspicious":
                print(f"⚠️ @{user.username} - Suspicious")
            else:
                print(f"✓ @{user.username} - Human")

asyncio.run(analyze_new_followers())
```

### Export Bot Report

```python
from xeepy import Xeepy
from xeepy.ai import BotDetector

async def export_bot_report(username: str):
    detector = BotDetector(provider="openai", api_key="sk-...")
    
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=500)
        results = await detector.analyze_batch(followers.items)
        
        data = []
        for user, analysis in zip(followers.items, results):
            data.append({
                "username": user.username,
                "followers": user.followers_count,
                "following": user.following_count,
                "tweets": user.tweet_count,
                "category": analysis.category,
                "bot_probability": analysis.bot_probability,
                "signals": ", ".join(analysis.signals)
            })
        
        x.export.to_csv(data, f"bot_report_{username}.csv")
        print(f"Report exported with {len(data)} users")

asyncio.run(export_bot_report("myaccount"))
```

### Custom Threshold

```python
from xeepy.ai import BotDetector

# Strict detection (fewer false negatives)
strict = BotDetector(provider="openai", api_key="sk-...", threshold=0.5)

# Lenient detection (fewer false positives)
lenient = BotDetector(provider="openai", api_key="sk-...", threshold=0.9)

# Per-call override
result = await lenient.filter_bots(users, threshold=0.6)
```

### Block Detected Bots

```python
from xeepy import Xeepy
from xeepy.ai import BotDetector

async def block_bots(username: str, dry_run: bool = True):
    detector = BotDetector(provider="openai", api_key="sk-...", threshold=0.85)
    
    async with Xeepy() as x:
        followers = await x.scrape.followers(username, limit=200)
        result = await detector.filter_bots(followers.items)
        
        print(f"Found {len(result.bots)} bots")
        
        if dry_run:
            print("Dry run - would block:")
            for bot in result.bots:
                print(f"  - @{bot.username}")
        else:
            for bot in result.bots:
                await x.engage.block(bot.username)
                print(f"Blocked @{bot.username}")

asyncio.run(block_bots("myaccount", dry_run=True))
```

## See Also

- [SentimentAnalyzer](sentiment.md) - Sentiment analysis
- [ContentGenerator](content.md) - Content generation
- [AudienceAnalytics](../analytics/audience.md) - Audience quality

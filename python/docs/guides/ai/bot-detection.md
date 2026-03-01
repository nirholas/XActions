# Bot and Spam Detection

Identify automated accounts, spam bots, and inauthentic behavior using AI-powered analysis of user profiles and activity patterns.

## Overview

Bot detection analyzes user profiles, posting patterns, and content characteristics to identify automated or suspicious accounts. This helps maintain community quality, filter engagement data, and protect against spam attacks.

## Use Cases

- **Follower Quality Audit**: Identify bot followers inflating counts
- **Engagement Authenticity**: Filter fake engagement from analytics
- **Community Protection**: Block spam accounts proactively
- **Influencer Vetting**: Verify influencer audience authenticity
- **Research Data Quality**: Clean datasets of bot-generated content

## Basic Usage

```python
import asyncio
from xeepy import Xeepy
from xeepy.ai import ContentGenerator

async def detect_bot():
    async with Xeepy() as x:
        ai = ContentGenerator(
            provider="openai",
            api_key="your-api-key",
            model="gpt-4"
        )
        
        # Get user profile
        profile = await x.scrape.profile("suspicious_account")
        
        # Analyze for bot indicators
        result = await ai.detect_bot(profile)
        
        print(f"Bot probability: {result.bot_score:.1%}")
        print(f"Classification: {result.classification}")  # bot, human, suspicious
        print(f"\nRisk factors:")
        for factor in result.risk_factors:
            print(f"  - {factor}")

asyncio.run(detect_bot())
```

## Detailed Bot Analysis

```python
async def detailed_bot_analysis():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        # Get comprehensive profile data
        profile = await x.scrape.profile("account_to_check")
        tweets = await x.scrape.tweets("account_to_check", limit=50)
        
        # Full analysis with tweet patterns
        result = await ai.detect_bot(
            profile=profile,
            tweets=tweets,
            analyze_patterns=True  # Check posting patterns
        )
        
        print(f"Account: @{profile.username}")
        print(f"Bot Score: {result.bot_score:.1%}")
        print(f"\nIndicators:")
        print(f"  Profile completeness: {result.indicators['profile_score']:.1%}")
        print(f"  Activity patterns: {result.indicators['activity_score']:.1%}")
        print(f"  Content originality: {result.indicators['content_score']:.1%}")
        print(f"  Network authenticity: {result.indicators['network_score']:.1%}")

asyncio.run(detailed_bot_analysis())
```

## Batch Follower Audit

```python
async def audit_followers():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        # Get followers
        followers = await x.scrape.followers("your_account", limit=500)
        
        # Analyze each follower
        bots = []
        suspicious = []
        humans = []
        
        for follower in followers:
            result = await ai.detect_bot(follower)
            
            if result.bot_score > 0.8:
                bots.append(follower)
            elif result.bot_score > 0.5:
                suspicious.append(follower)
            else:
                humans.append(follower)
        
        total = len(followers)
        print(f"Follower Audit Results:")
        print(f"  Likely bots: {len(bots)} ({len(bots)/total*100:.1f}%)")
        print(f"  Suspicious: {len(suspicious)} ({len(suspicious)/total*100:.1f}%)")
        print(f"  Likely humans: {len(humans)} ({len(humans)/total*100:.1f}%)")
        
        # Export bot list
        x.export.to_csv(bots, "potential_bots.csv")

asyncio.run(audit_followers())
```

## Heuristic Detection (No AI)

```python
async def heuristic_bot_detection():
    async with Xeepy() as x:
        profile = await x.scrape.profile("account_to_check")
        
        # Rule-based bot indicators
        score = 0
        factors = []
        
        # Check profile age vs tweet count
        account_age_days = (datetime.now() - profile.created_at).days
        tweets_per_day = profile.tweet_count / max(account_age_days, 1)
        
        if tweets_per_day > 50:
            score += 0.3
            factors.append(f"High posting rate: {tweets_per_day:.1f} tweets/day")
        
        # Check follower/following ratio
        if profile.followers_count > 0:
            ratio = profile.following_count / profile.followers_count
            if ratio > 10:
                score += 0.2
                factors.append(f"Suspicious ratio: following {ratio:.1f}x more")
        
        # Check default profile
        if profile.default_profile_image:
            score += 0.2
            factors.append("Default profile image")
        
        # Check bio length
        if len(profile.bio or "") < 10:
            score += 0.1
            factors.append("Minimal or no bio")
        
        # Check username pattern
        import re
        if re.search(r'\d{6,}$', profile.username):
            score += 0.2
            factors.append("Username ends with many numbers")
        
        print(f"Heuristic bot score: {min(score, 1.0):.1%}")
        print(f"Factors: {factors}")

asyncio.run(heuristic_bot_detection())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `profile` | User | required | User profile object |
| `tweets` | list | None | Recent tweets for pattern analysis |
| `analyze_patterns` | bool | True | Check posting time patterns |
| `threshold` | float | 0.7 | Bot classification threshold |
| `include_network` | bool | False | Analyze follower network |

!!! tip "Combine Methods"
    For best results, combine AI analysis with heuristic rules. Use fast heuristics for initial filtering, then AI for borderline cases.

!!! warning "False Positives"
    Automated accounts aren't always malicious. Brand accounts, news bots, and utility accounts may trigger bot detection. Consider context.

## Posting Pattern Analysis

```python
async def analyze_posting_patterns():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        tweets = await x.scrape.tweets("account_to_check", limit=100)
        
        # Analyze timing patterns
        from collections import Counter
        
        hours = Counter(t.created_at.hour for t in tweets)
        days = Counter(t.created_at.weekday() for t in tweets)
        
        # Calculate variance (bots often have low variance)
        hour_variance = max(hours.values()) / (sum(hours.values()) / 24) if hours else 0
        
        print("Posting time distribution:")
        print(f"  Peak hour concentration: {hour_variance:.2f}x average")
        
        # Check for precise intervals
        if len(tweets) > 1:
            intervals = []
            for i in range(1, len(tweets)):
                delta = (tweets[i-1].created_at - tweets[i].created_at).total_seconds()
                intervals.append(delta)
            
            avg_interval = sum(intervals) / len(intervals)
            variance = sum((i - avg_interval)**2 for i in intervals) / len(intervals)
            
            if variance < 100:  # Very consistent timing
                print("  ⚠️ Suspiciously consistent posting intervals")

asyncio.run(analyze_posting_patterns())
```

## Content Similarity Detection

```python
async def detect_content_spam():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        tweets = await x.scrape.tweets("account_to_check", limit=50)
        
        # Check for repeated content
        texts = [t.text for t in tweets]
        
        # Simple duplicate check
        unique_ratio = len(set(texts)) / len(texts)
        
        if unique_ratio < 0.5:
            print(f"⚠️ Low content uniqueness: {unique_ratio:.1%}")
        
        # AI-based similarity analysis
        result = await ai.analyze_content_patterns(texts)
        
        print(f"\nContent Analysis:")
        print(f"  Template usage detected: {result.template_score:.1%}")
        print(f"  Promotional content ratio: {result.promo_ratio:.1%}")
        print(f"  Repetitive phrases: {len(result.repeated_phrases)}")

asyncio.run(detect_content_spam())
```

## Influencer Audience Audit

```python
async def audit_influencer():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        influencer = "influencer_username"
        
        # Sample followers
        followers = await x.scrape.followers(influencer, limit=200)
        
        # Analyze sample
        bot_count = 0
        for follower in followers:
            result = await ai.detect_bot(follower)
            if result.bot_score > 0.7:
                bot_count += 1
        
        fake_percentage = bot_count / len(followers) * 100
        
        print(f"Influencer Audit: @{influencer}")
        print(f"  Sampled followers: {len(followers)}")
        print(f"  Likely fake: {bot_count} ({fake_percentage:.1f}%)")
        print(f"  Estimated real followers: {int((100 - fake_percentage) / 100 * await x.scrape.profile(influencer).followers_count):,}")

asyncio.run(audit_influencer())
```

## Export Detection Results

```python
async def export_bot_report():
    async with Xeepy() as x:
        ai = ContentGenerator(provider="openai", api_key="...", model="gpt-4")
        
        followers = await x.scrape.followers("your_account", limit=500)
        
        report = []
        for follower in followers:
            result = await ai.detect_bot(follower)
            report.append({
                "username": follower.username,
                "followers": follower.followers_count,
                "bot_score": result.bot_score,
                "classification": result.classification,
                "risk_factors": ", ".join(result.risk_factors)
            })
        
        x.export.to_csv(report, "bot_detection_report.csv")
        print(f"Exported analysis of {len(report)} accounts")

asyncio.run(export_bot_report())
```

## Best Practices

1. **Sample Appropriately**: For large follower bases, use representative samples
2. **Set Thresholds Carefully**: Too strict catches false positives; too loose misses bots
3. **Consider Context**: News aggregators and brand accounts may appear bot-like
4. **Use Multiple Signals**: Combine profile, content, and behavior analysis
5. **Regular Audits**: Bot tactics evolve; audit periodically
6. **Document Decisions**: Keep records of why accounts were flagged

## Related Guides

- [AI-Powered Replies](replies.md)
- [Sentiment Analysis](sentiment.md)
- [Audience Insights](../analytics/audience.md)

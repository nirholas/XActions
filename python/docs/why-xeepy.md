---
title: Why Xeepy?
description: Learn why Xeepy is the best choice for X/Twitter automation - comparing alternatives and explaining our unique approach.
---

# Why Xeepy?

## The Problem We Solved

In 2023, Twitter (now X) drastically changed their API:

- **Basic API**: $100/month, severely rate-limited
- **Pro API**: $5,000/month for reasonable access
- **Enterprise**: Contact sales (read: very expensive)

Worse, many endpoints were removed entirely. **Tweet replies?** Gone from the free tier. **Full-archive search?** Enterprise only. **Unfollower detection?** Never existed.

The original `twitter_reply.py` script in this repo used Tweepy's search API—which Twitter broke in 2023. **Xeepy was born from the ashes of that broken script.**

## Our Solution: Browser Automation

Instead of fighting API restrictions, we went around them entirely. Xeepy uses **Playwright** to automate a real browser, giving you the same access as any X user:

```python
# What used to require expensive API access
# now works with simple browser automation

async with Xeepy() as x:
    # This "impossible" query now just works
    replies = await x.scrape.replies(tweet_url)
```

## Xeepy vs. Alternatives

### vs. Twitter API (Official)

| Aspect | Twitter API | Xeepy |
|--------|-------------|--------|
| **Monthly Cost** | $100-$5,000+ | Free |
| **Tweet Replies** | ❌ Premium only | ✅ Included |
| **Full Archive** | ❌ Enterprise only | ✅ Included |
| **Rate Limits** | Strict, per-endpoint | Flexible, human-like |
| **Unfollower Detection** | ❌ Not available | ✅ Built-in |
| **Setup** | API keys, OAuth | Just cookies |

### vs. Tweepy

Tweepy is a great library—but it depends on the Twitter API:

```python
# Tweepy (BROKEN since 2023)
import tweepy
api.search_tweets(q=f"to:{username}")  # ❌ No longer works!

# Xeepy (WORKS)
from xeepy import Xeepy
await x.scrape.replies(tweet_url)  # ✅ Works perfectly
```

### vs. SNScrape

SNScrape was popular but is now unmaintained and broken:

| Aspect | SNScrape | Xeepy |
|--------|----------|--------|
| **Status** | ❌ Unmaintained | ✅ Actively developed |
| **Login Required** | No (but limited) | Yes (full access) |
| **Anti-Detection** | Basic | Advanced |
| **Actions** | Scraping only | Scraping + Actions |
| **AI Features** | ❌ No | ✅ Built-in |

### vs. Nitter

Nitter instances are unreliable and frequently go down:

| Aspect | Nitter | Xeepy |
|--------|--------|--------|
| **Reliability** | ❌ Instances die often | ✅ Your own browser |
| **Authentication** | ❌ Can't log in | ✅ Full account access |
| **Actions** | ❌ Read only | ✅ Full automation |
| **Rate Limits** | Per-instance | Your control |

## Unique Features

Xeepy isn't just a scraper—it's a complete automation toolkit:

### 🎯 Unfollower Detection

The #1 requested feature that no API provides:

```python
from xeepy import UnfollowerDetector

detector = UnfollowerDetector(storage, notifier)
report = await detector.detect("yourusername")

print(f"Lost followers: {report.unfollowers}")
print(f"New followers: {report.new_followers}")
print(f"Net change: {report.net_change}")
```

### 📊 Advanced Analytics

Built-in analytics that would cost $50+/month elsewhere:

```python
from xeepy.analytics import BestTimeAnalyzer, AudienceInsights

# Find YOUR optimal posting times
analyzer = BestTimeAnalyzer()
schedule = await analyzer.analyze("yourusername")
print(schedule.get_schedule_text())
# "Best time to post: Tuesday at 9:00 AM"

# Understand your audience
insights = AudienceInsights()
report = await insights.analyze("yourusername")
print(f"Top locations: {report.locations}")
print(f"Bot percentage: {report.likely_bots_percentage}%")
```

### 🤖 AI Integration

Native AI support for content and analysis:

```python
from xeepy.ai import ContentGenerator, SentimentAnalyzer

# Generate viral content
generator = ContentGenerator(provider="openai")
thread = await generator.generate_thread(
    topic="Python async tips",
    style="viral",
    num_tweets=10
)

# Analyze sentiment of replies
analyzer = SentimentAnalyzer()
for reply in replies:
    sentiment = await analyzer.analyze(reply.text)
    if sentiment.label == "negative":
        print(f"Hater detected: @{reply.author}")
```

### 🔔 Multi-Channel Notifications

Get alerts everywhere:

```python
from xeepy.notifications import NotificationManager

manager = NotificationManager()
manager.add_channel("discord", discord_webhook)
manager.add_channel("telegram", telegram_bot)
manager.add_channel("email", email_config)
manager.add_channel("slack", slack_webhook)

# All channels notified instantly
await manager.notify("🚨 Alert!", "Someone important followed you!")
```

### 🛡️ Advanced Stealth

Undetectable automation:

```python
from xeepy import Xeepy
from xeepy.core import BrowserConfig

config = BrowserConfig(
    stealth_mode=True,        # Anti-fingerprinting
    rotate_user_agent=True,   # Random user agents
    human_delays=True,        # Natural timing
    proxy_rotation=True,      # IP rotation
)

async with Xeepy(browser_config=config) as x:
    # Scrape like a human
    ...
```

## Who Uses Xeepy?

<div class="grid cards" markdown>

-   :material-account-group:{ .lg .middle } __Growth Hackers__

    ---

    Automate follow/unfollow, find optimal posting times, track competitor growth.

-   :material-chart-line:{ .lg .middle } __Data Scientists__

    ---

    Scrape large datasets for research, sentiment analysis, network analysis.

-   :material-briefcase:{ .lg .middle } __Marketing Teams__

    ---

    Monitor brand mentions, track campaigns, generate engagement reports.

-   :material-robot:{ .lg .middle } __AI Developers__

    ---

    Build AI-powered bots, train models on Twitter data, automate content.

-   :material-school:{ .lg .middle } __Researchers__

    ---

    Academic research, discourse analysis, misinformation tracking.

-   :material-account:{ .lg .middle } __Personal Users__

    ---

    Clean up following list, track unfollowers, optimize posting schedule.

</div>

## The Bottom Line

| Need | Solution |
|------|----------|
| Scrape tweet replies | ✅ Xeepy |
| Detect unfollowers | ✅ Xeepy |
| Automate follows | ✅ Xeepy |
| Analyze engagement | ✅ Xeepy |
| Generate AI content | ✅ Xeepy |
| $0 monthly cost | ✅ Xeepy |

**Ready to get started?**

[Quick Start Guide :material-arrow-right:](getting-started/quickstart.md){ .md-button .md-button--primary }

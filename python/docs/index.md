---
title: Xeepy - The Ultimate X/Twitter Automation Toolkit
description: No API keys. No rate limits. No compromises. Automate X/Twitter with Python using browser automation.
---

<style>
.md-typeset h1 {
  display: none;
}
</style>

<div align="center" markdown>

# 🚀 Xeepy

## The Ultimate X/Twitter Automation Toolkit

**No API keys required. No rate limits. No compromises.**

[Get Started](getting-started/quickstart.md){ .md-button .md-button--primary }
[View on GitHub](https://github.com/nirholas/Get-Tweet-Replies-With-Python-Tweepy){ .md-button }

</div>

---

## ✨ What is Xeepy?

Xeepy is a **professional-grade Python toolkit** for automating X (formerly Twitter) using browser automation. Unlike traditional API-based solutions that require expensive API access or face strict rate limits, Xeepy operates through Playwright browser automation—giving you the same capabilities as a real user.

<div class="grid cards" markdown>

-   :material-api-off:{ .lg .middle } __No API Keys Required__

    ---

    Forget the $100/month Twitter API. Xeepy uses browser automation to work without any API credentials.

-   :material-speedometer:{ .lg .middle } __No Rate Limits__

    ---

    Smart rate limiting mimics human behavior. Scrape thousands of tweets without getting blocked.

-   :material-shield-check:{ .lg .middle } __Stealth Mode__

    ---

    Advanced anti-detection with user agent rotation, human-like delays, and fingerprint randomization.

-   :material-robot:{ .lg .middle } __AI-Powered__

    ---

    Generate content, analyze sentiment, detect bots, and find optimal posting times with AI.

</div>

---

## 🎯 Key Features

### 📊 Comprehensive Scraping

Scrape anything from X/Twitter with simple Python code:

```python
import asyncio
from xeepy import Xeepy

async def main():
    async with Xeepy() as x:
        # Get tweet replies (the original mission!)
        replies = await x.scrape.replies("https://x.com/elonmusk/status/123456")
        
        # Scrape user profiles
        profile = await x.scrape.profile("elonmusk")
        
        # Get followers with pagination
        followers = await x.scrape.followers("naval", limit=5000)
        
        # Search tweets
        tweets = await x.scrape.search("python programming", limit=100)
        
        # Export to CSV
        x.export.to_csv(replies, "replies.csv")

asyncio.run(main())
```

### 🎯 Smart Follow/Unfollow

Grow your account intelligently:

```python
async with Xeepy() as x:
    # Unfollow non-followers (the #1 requested feature!)
    result = await x.unfollow.non_followers(
        max_unfollows=100,
        whitelist=["bestfriend", "mom"],
        dry_run=True  # Preview first
    )
    
    # Follow users from a competitor's followers
    await x.follow.target_followers(
        target="competitor",
        limit=50,
        filters={"min_followers": 100, "has_bio": True}
    )
```

### 📈 Real-Time Monitoring

Track your account and competitors:

```python
from xeepy import UnfollowerDetector, GrowthTracker

# Detect who unfollowed you
detector = UnfollowerDetector(storage=storage, notifier=notifier)
report = await detector.detect("yourusername")
print(f"Lost {len(report.unfollowers)} followers today 😢")

# Track growth over time
tracker = GrowthTracker(storage=storage)
growth = tracker.generate_report("yourusername", days=30)
print(f"Gained {growth.net_change} followers this month! 🚀")
```

### 🤖 AI-Powered Automation

Let AI do the heavy lifting:

```python
from xeepy.ai import ContentGenerator, SentimentAnalyzer

# Generate viral content
generator = ContentGenerator(provider="openai")
thread = await generator.generate_thread(
    topic="10 Python tips that will blow your mind",
    style="viral",
    num_tweets=10
)

# Analyze conversation sentiment
analyzer = SentimentAnalyzer()
result = await analyzer.analyze_conversation(replies)
print(f"Overall sentiment: {result.overall_sentiment}")
```

### 🔔 Multi-Channel Notifications

Get notified everywhere:

```python
from xeepy.notifications import NotificationManager

manager = NotificationManager()
manager.add_channel("discord", WebhookNotifier(discord_url))
manager.add_channel("telegram", TelegramNotifier(bot_token, chat_id))
manager.add_channel("email", EmailNotifier(smtp_config))

# Now all your alerts go everywhere
await manager.notify(
    title="🚨 Viral Tweet Alert!",
    message="Your tweet just hit 10,000 likes!",
    level="success"
)
```

---

## 🏆 Why Xeepy?

<div class="grid" markdown>

| Feature | Twitter API | Tweepy | Xeepy |
|---------|-------------|--------|--------|
| **Cost** | $100+/month | Free (limited) | **Free** |
| **Rate Limits** | 100-500/15min | Strict | **Flexible** |
| **Tweet Replies** | ❌ Removed | ❌ Broken | ✅ **Works** |
| **Unfollower Detection** | ❌ No | ❌ No | ✅ **Yes** |
| **AI Features** | ❌ No | ❌ No | ✅ **Built-in** |
| **Browser Automation** | ❌ No | ❌ No | ✅ **Playwright** |
| **Anti-Detection** | N/A | N/A | ✅ **Advanced** |

</div>

---

## 🚀 Quick Install

=== "pip"

    ```bash
    pip install xeepy
    playwright install chromium
    ```

=== "pipx"

    ```bash
    pipx install xeepy
    playwright install chromium
    ```

=== "From Source"

    ```bash
    git clone https://github.com/nirholas/Get-Tweet-Replies-With-Python-Tweepy.git
    cd Get-Tweet-Replies-With-Python-Tweepy
    pip install -e ".[all]"
    playwright install chromium
    ```

---

## 📚 Documentation

<div class="grid cards" markdown>

-   :material-rocket-launch:{ .lg .middle } __Getting Started__

    ---

    New to Xeepy? Start here with installation and your first script.

    [:octicons-arrow-right-24: Quick Start](getting-started/quickstart.md)

-   :material-book-open-variant:{ .lg .middle } __Guides__

    ---

    In-depth guides for every feature: scraping, automation, monitoring, AI.

    [:octicons-arrow-right-24: Explore Guides](guides/index.md)

-   :material-food:{ .lg .middle } __Cookbook__

    ---

    Ready-to-use recipes for growth hacking, data science, and business intelligence.

    [:octicons-arrow-right-24: Browse Recipes](cookbook/index.md)

-   :material-api:{ .lg .middle } __API Reference__

    ---

    Complete API documentation for all classes and methods.

    [:octicons-arrow-right-24: API Docs](api/index.md)

</div>

---

## 💬 Community

<div class="grid cards" markdown>

-   :fontawesome-brands-discord:{ .lg .middle } __Discord__

    ---

    Join 5,000+ members discussing X automation, sharing scripts, and getting help.

    [:octicons-arrow-right-24: Join Discord](https://discord.gg/xeepy)

-   :fontawesome-brands-github:{ .lg .middle } __GitHub__

    ---

    Star the repo, report issues, and contribute to Xeepy.

    [:octicons-arrow-right-24: GitHub](https://github.com/nirholas/Get-Tweet-Replies-With-Python-Tweepy)

-   :fontawesome-brands-x-twitter:{ .lg .middle } __X/Twitter__

    ---

    Follow us for updates, tips, and automation tricks.

    [:octicons-arrow-right-24: @xeepy_dev](https://x.com/xeepy_dev)

</div>

---

## ⚠️ Disclaimer

!!! warning "Educational Purposes Only"

    Xeepy is designed for **educational and research purposes only**. 
    
    - Automating X/Twitter may violate their Terms of Service
    - Use responsibly and at your own risk
    - Do not use for spam, harassment, or malicious purposes
    - Respect rate limits and other users

---

<div align="center" markdown>

**Made with ❤️ by the Xeepy Team**

[Star on GitHub :star:](https://github.com/nirholas/Get-Tweet-Replies-With-Python-Tweepy){ .md-button }

</div>

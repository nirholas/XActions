# Getting Started

Welcome to Xeepy! This guide will take you from zero to automating X/Twitter in under 5 minutes.

## What You'll Learn

<div class="grid cards" markdown>

-   :material-download:{ .lg .middle } **Installation**

    ---

    Install Xeepy and its dependencies with a single command

    [:octicons-arrow-right-24: Install Guide](installation.md)

-   :material-rocket-launch:{ .lg .middle } **Quick Start**

    ---

    Run your first scraping script in under 2 minutes

    [:octicons-arrow-right-24: Quick Start](quickstart.md)

-   :material-key:{ .lg .middle } **Authentication**

    ---

    Learn how to authenticate without API keys

    [:octicons-arrow-right-24: Auth Guide](authentication.md)

-   :material-cog:{ .lg .middle } **Configuration**

    ---

    Customize Xeepy for your use case

    [:octicons-arrow-right-24: Config Guide](configuration.md)

-   :material-code-braces:{ .lg .middle } **First Script**

    ---

    Build a complete automation workflow

    [:octicons-arrow-right-24: First Script](first-script.md)

</div>

## The 60-Second Version

```bash
# Install Xeepy
pip install xeepy

# Install browser
playwright install chromium

# Run your first scrape
xeepy scrape replies https://x.com/elonmusk/status/123456789
```

That's it! You're now scraping X/Twitter without paying for API access.

## Prerequisites

| Requirement | Version | Why |
|-------------|---------|-----|
| Python | 3.10+ | Modern async/await support |
| Playwright | Latest | Browser automation engine |
| Chromium | Auto-installed | Browser for scraping |

!!! tip "No API Keys Required"
    Unlike Tweepy or the official Twitter API, Xeepy uses browser automation.
    This means:
    
    - ✅ No $100/month API fees
    - ✅ No rate limit anxiety
    - ✅ No approval process
    - ✅ Access to all features

## Learning Path

```mermaid
graph LR
    A[Install] --> B[Authenticate]
    B --> C[First Scrape]
    C --> D[Export Data]
    D --> E[Advanced]
    
    style A fill:#1da1f2
    style B fill:#1da1f2
    style C fill:#1da1f2
    style D fill:#1da1f2
    style E fill:#1da1f2
```

### Recommended Reading Order

1. **[Installation](installation.md)** - Get Xeepy running (2 min)
2. **[Authentication](authentication.md)** - Set up your session (3 min)
3. **[Quick Start](quickstart.md)** - Run example scripts (5 min)
4. **[First Script](first-script.md)** - Build something useful (10 min)
5. **[Configuration](configuration.md)** - Customize behavior (optional)

## Choose Your Path

=== ":material-speedometer: I want to scrape data fast"

    Perfect! Jump straight to the [Scraping Guide](../guides/scraping/index.md).
    
    ```python
    from xeepy import Xeepy
    
    async with Xeepy() as x:
        # Get 1000 replies to any tweet
        replies = await x.scrape.replies(tweet_url, limit=1000)
        x.export.to_csv(replies, "replies.csv")
    ```

=== ":material-account-multiple: I want to grow my following"

    Check out our [Growth Automation Cookbook](../cookbook/growth/index.md).
    
    ```python
    async with Xeepy() as x:
        # Unfollow non-followers, follow by hashtag
        await x.unfollow.non_followers(max_unfollows=100)
        await x.follow.by_hashtag("#buildinpublic", limit=50)
    ```

=== ":material-chart-line: I want analytics & insights"

    Head to the [Analytics Guide](../guides/analytics/index.md).
    
    ```python
    async with Xeepy() as x:
        # Track growth, find best posting times
        growth = await x.analytics.track_growth("7d")
        best_times = await x.analytics.best_time_to_post()
    ```

=== ":material-robot: I want AI-powered features"

    Explore [AI Features](../guides/ai/index.md).
    
    ```python
    from xeepy.ai import ContentGenerator
    
    ai = ContentGenerator(provider="openai")
    reply = await ai.generate_reply(tweet_text, style="witty")
    ```

## Need Help?

- :material-book: [FAQ](../community/faq.md) - Common questions answered
- :material-github: [GitHub Issues](https://github.com/xeepy/xeepy/issues) - Bug reports
- :material-discord: [Discord](https://discord.gg/xeepy) - Community support
- :material-email: [Email](mailto:support@xeepy.dev) - Direct support

---

Ready? Let's [install Xeepy](installation.md) →

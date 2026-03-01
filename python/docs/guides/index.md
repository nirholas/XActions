# Guides

Comprehensive guides for every Xeepy feature.

<div class="grid cards" markdown>

-   :material-magnify:{ .lg .middle } __Scraping__

    ---

    Extract data from X/Twitter without API limits

    [:octicons-arrow-right-24: Scraping Guide](scraping/index.md)

-   :material-account-multiple-plus:{ .lg .middle } __Actions__

    ---

    Follow, unfollow, like, retweet, and engage

    [:octicons-arrow-right-24: Actions Guide](actions/index.md)

-   :material-chart-line:{ .lg .middle } __Monitoring__

    ---

    Track followers, keywords, and account changes

    [:octicons-arrow-right-24: Monitoring Guide](monitoring/index.md)

-   :material-google-analytics:{ .lg .middle } __Analytics__

    ---

    Growth metrics, engagement analysis, and insights

    [:octicons-arrow-right-24: Analytics Guide](analytics/index.md)

-   :material-robot:{ .lg .middle } __AI Features__

    ---

    Content generation, sentiment analysis, and more

    [:octicons-arrow-right-24: AI Guide](ai/index.md)

-   :material-bell:{ .lg .middle } __Notifications__

    ---

    Discord, Telegram, email, and webhook alerts

    [:octicons-arrow-right-24: Notifications Guide](notifications/index.md)

-   :material-database-export:{ .lg .middle } __Data Export__

    ---

    CSV, JSON, Excel, and database exports

    [:octicons-arrow-right-24: Export Guide](export/index.md)

</div>

## Quick Reference

### Most Common Tasks

| Task | Guide | Code |
|------|-------|------|
| Scrape tweet replies | [Replies](scraping/replies.md) | `await x.scrape.replies(url)` |
| Unfollow non-followers | [Unfollow](actions/unfollow.md) | `await x.unfollow.non_followers()` |
| Follow by keyword | [Follow](actions/follow.md) | `await x.follow.by_keyword([...])` |
| Track unfollowers | [Monitoring](monitoring/unfollowers.md) | `await x.monitor.unfollowers()` |
| Auto-like tweets | [Engagement](actions/engagement.md) | `await x.engage.auto_like([...])` |
| Generate AI replies | [AI](ai/replies.md) | `await ai.generate_reply(text)` |

### Learning Path

=== "Beginner"

    1. [Installation](../getting-started/installation.md)
    2. [Quick Start](../getting-started/quickstart.md)
    3. [Scraping Basics](scraping/index.md)
    4. [Follow/Unfollow](actions/follow.md)

=== "Intermediate"

    1. [Rate Limiting](../advanced/rate-limiting.md)
    2. [Monitoring](monitoring/index.md)
    3. [Analytics](analytics/index.md)
    4. [Notifications](notifications/index.md)

=== "Advanced"

    1. [AI Features](ai/index.md)
    2. [Mass Operations](actions/mass-operations.md)
    3. [Multi-Account](../advanced/multi-account.md)
    4. [Custom Scrapers](../advanced/custom-scrapers.md)

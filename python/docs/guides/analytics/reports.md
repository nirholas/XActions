# Report Generation

Create comprehensive, automated reports for Twitter analytics, combining multiple data sources into actionable insights.

## Overview

Report generation automates the creation of periodic analytics summaries, combining growth, engagement, audience, and competitive data into formatted reports for stakeholders, clients, or personal tracking.

## Use Cases

- **Weekly Reports**: Automated weekly performance summaries
- **Client Reporting**: Professional reports for social media clients
- **Executive Summaries**: High-level metrics for leadership
- **Campaign Analysis**: Post-campaign performance reports
- **Audit Reports**: Comprehensive account audits

## Basic Usage

```python
import asyncio
from xeepy import Xeepy
from xeepy.analytics import ReportGenerator

async def generate_basic_report():
    async with Xeepy() as x:
        generator = ReportGenerator(x)
        
        # Generate a weekly report
        report = await generator.weekly_report("your_username")
        
        print(report.summary)
        
        # Export to different formats
        report.to_markdown("weekly_report.md")
        report.to_html("weekly_report.html")
        report.to_pdf("weekly_report.pdf")

asyncio.run(generate_basic_report())
```

## Comprehensive Performance Report

```python
async def comprehensive_report():
    async with Xeepy() as x:
        generator = ReportGenerator(x)
        
        report = await generator.generate(
            username="your_username",
            period_days=30,
            include_sections=[
                "overview",
                "growth",
                "engagement",
                "top_content",
                "audience",
                "recommendations"
            ]
        )
        
        # Print report sections
        print("=" * 60)
        print("30-DAY PERFORMANCE REPORT")
        print("=" * 60)
        
        print("\n📊 OVERVIEW")
        print("-" * 40)
        print(f"Followers: {report.overview.followers:,}")
        print(f"Net change: {report.overview.follower_change:+,}")
        print(f"Tweets published: {report.overview.tweets_published}")
        print(f"Total engagement: {report.overview.total_engagement:,}")
        
        print("\n📈 GROWTH")
        print("-" * 40)
        print(f"Growth rate: {report.growth.rate:.2%}")
        print(f"New followers: {report.growth.gained:,}")
        print(f"Lost followers: {report.growth.lost:,}")
        
        print("\n💬 ENGAGEMENT")
        print("-" * 40)
        print(f"Engagement rate: {report.engagement.rate:.2%}")
        print(f"Avg likes: {report.engagement.avg_likes:.1f}")
        print(f"Avg retweets: {report.engagement.avg_retweets:.1f}")
        print(f"Avg replies: {report.engagement.avg_replies:.1f}")

asyncio.run(comprehensive_report())
```

## Custom Report Templates

```python
async def custom_template_report():
    async with Xeepy() as x:
        generator = ReportGenerator(x)
        
        # Define custom template
        template = """
        # Twitter Report for @{username}
        ## Period: {start_date} to {end_date}
        
        ### Key Metrics
        | Metric | Value | Change |
        |--------|-------|--------|
        | Followers | {followers:,} | {follower_change:+,} |
        | Engagement Rate | {engagement_rate:.2%} | {er_change:+.2%} |
        | Tweets | {tweet_count} | - |
        
        ### Top Performing Tweets
        {top_tweets}
        
        ### Recommendations
        {recommendations}
        """
        
        report = await generator.generate_from_template(
            username="your_username",
            template=template,
            period_days=7
        )
        
        print(report.rendered)

asyncio.run(custom_template_report())
```

## Automated Scheduled Reports

```python
async def scheduled_report_system():
    from xeepy import Xeepy
    from xeepy.analytics import ReportGenerator
    from xeepy.notifications import EmailNotifier
    
    async with Xeepy() as x:
        generator = ReportGenerator(x)
        notifier = EmailNotifier(
            smtp_host="smtp.gmail.com",
            smtp_port=587,
            username="your@email.com",
            password="app_password"
        )
        
        # Generate weekly report
        report = await generator.weekly_report("your_username")
        
        # Send via email
        await notifier.send(
            to="recipient@email.com",
            subject=f"Weekly Twitter Report - {report.period}",
            body=report.to_html(),
            attachments=[
                ("report.pdf", report.to_pdf_bytes()),
                ("data.csv", report.to_csv_bytes())
            ]
        )
        
        print(f"Report sent for period: {report.period}")

# Schedule with cron or similar
asyncio.run(scheduled_report_system())
```

## Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `username` | str | required | Account to report on |
| `period_days` | int | 7 | Report period in days |
| `include_sections` | list | all | Sections to include |
| `compare_previous` | bool | True | Include period comparison |
| `format` | str | "markdown" | Output format |

!!! tip "Report Frequency"
    - **Daily**: High-volume accounts or during campaigns
    - **Weekly**: Standard for most accounts
    - **Monthly**: Strategic overview and trend analysis

!!! note "Data Requirements"
    Some report sections require historical data. Enable tracking before generating comparison reports.

## Multi-Account Reports

```python
async def multi_account_report():
    async with Xeepy() as x:
        generator = ReportGenerator(x)
        
        accounts = ["account1", "account2", "account3"]
        
        # Generate consolidated report
        report = await generator.multi_account_report(
            usernames=accounts,
            period_days=30
        )
        
        print("MULTI-ACCOUNT REPORT")
        print("=" * 70)
        print(f"\n{'Account':<20} {'Followers':>12} {'Growth':>10} {'Eng Rate':>10}")
        print("-" * 70)
        
        for account in report.accounts:
            print(f"@{account.username:<19} {account.followers:>12,} {account.growth_rate:>9.2%} {account.engagement_rate:>9.2%}")
        
        print("-" * 70)
        print(f"{'TOTALS':<20} {report.total_followers:>12,} {report.avg_growth:>9.2%} {report.avg_engagement:>9.2%}")

asyncio.run(multi_account_report())
```

## Competitive Report

```python
async def competitive_report():
    async with Xeepy() as x:
        generator = ReportGenerator(x)
        
        report = await generator.competitive_report(
            your_account="your_username",
            competitors=["competitor1", "competitor2", "competitor3"],
            period_days=30
        )
        
        print("COMPETITIVE ANALYSIS REPORT")
        print("=" * 60)
        
        print("\n📊 Market Position")
        print(f"Your rank by followers: #{report.your_rank.followers}")
        print(f"Your rank by engagement: #{report.your_rank.engagement}")
        print(f"Your rank by growth: #{report.your_rank.growth}")
        
        print("\n📈 Comparative Metrics")
        print(f"Your engagement vs avg: {report.vs_average.engagement:+.2%}")
        print(f"Your growth vs avg: {report.vs_average.growth:+.2%}")
        
        print("\n💡 Competitive Insights")
        for insight in report.insights[:5]:
            print(f"  • {insight}")

asyncio.run(competitive_report())
```

## Campaign Performance Report

```python
async def campaign_report():
    async with Xeepy() as x:
        generator = ReportGenerator(x)
        
        # Generate campaign-specific report
        report = await generator.campaign_report(
            username="your_username",
            campaign_hashtag="#YourCampaign",
            start_date="2024-01-01",
            end_date="2024-01-15"
        )
        
        print("CAMPAIGN PERFORMANCE REPORT")
        print("=" * 60)
        print(f"Campaign: {report.hashtag}")
        print(f"Period: {report.start_date} to {report.end_date}")
        
        print("\n📊 Campaign Metrics")
        print(f"Total mentions: {report.total_mentions:,}")
        print(f"Unique participants: {report.unique_participants:,}")
        print(f"Total reach: {report.estimated_reach:,}")
        print(f"Total engagement: {report.total_engagement:,}")
        
        print("\n📈 Your Performance")
        print(f"Your campaign tweets: {report.your_tweets}")
        print(f"Your campaign engagement: {report.your_engagement:,}")
        print(f"Share of voice: {report.share_of_voice:.1%}")
        
        print("\n🏆 Top Campaign Tweets")
        for tweet in report.top_tweets[:5]:
            print(f"  @{tweet.author}: {tweet.engagement:,} engagement")

asyncio.run(campaign_report())
```

## Export Options

```python
async def export_reports():
    async with Xeepy() as x:
        generator = ReportGenerator(x)
        
        report = await generator.generate("your_username", period_days=30)
        
        # Export in multiple formats
        
        # Markdown (for GitHub, docs)
        report.to_markdown("report.md")
        
        # HTML (for web, email)
        report.to_html("report.html", style="professional")
        
        # PDF (for clients, archival)
        report.to_pdf("report.pdf", include_charts=True)
        
        # CSV (for data analysis)
        report.to_csv("report_data.csv")
        
        # JSON (for APIs, automation)
        report.to_json("report.json")
        
        # Excel (for business users)
        report.to_excel("report.xlsx", include_charts=True)
        
        print("Reports exported in all formats")

asyncio.run(export_reports())
```

## Report with Visualizations

```python
async def report_with_charts():
    async with Xeepy() as x:
        generator = ReportGenerator(x)
        
        report = await generator.generate(
            username="your_username",
            period_days=30,
            include_charts=True
        )
        
        # Save charts
        for chart_name, chart_data in report.charts.items():
            chart_data.save(f"charts/{chart_name}.png")
        
        # Generate HTML with embedded charts
        report.to_html(
            "visual_report.html",
            embed_charts=True,
            chart_style="modern"
        )
        
        print("Visual report generated with charts")

asyncio.run(report_with_charts())
```

## Notification Integration

```python
async def report_with_notifications():
    async with Xeepy() as x:
        generator = ReportGenerator(x)
        
        report = await generator.weekly_report("your_username")
        
        # Discord notification
        await x.notify.discord(
            webhook_url="https://discord.com/api/webhooks/...",
            message=report.to_discord_embed()
        )
        
        # Telegram notification
        await x.notify.telegram(
            bot_token="...",
            chat_id="...",
            message=report.summary
        )
        
        # Slack notification
        await x.notify.slack(
            webhook_url="https://hooks.slack.com/...",
            message=report.to_slack_blocks()
        )

asyncio.run(report_with_notifications())
```

## Best Practices

1. **Consistent Timing**: Generate reports at the same time each period
2. **Include Context**: Add notes about events that affected metrics
3. **Actionable Insights**: Include recommendations, not just data
4. **Visual Clarity**: Use charts for trend data, tables for comparisons
5. **Archive Reports**: Keep historical reports for long-term trend analysis
6. **Automate**: Set up scheduled generation for consistency

## Related Guides

- [Growth Tracking](growth.md)
- [Engagement Analysis](engagement.md)
- [Competitor Analysis](competitors.md)

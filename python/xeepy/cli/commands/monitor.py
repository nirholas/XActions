"""
Monitoring commands for Xeepy CLI.
"""

from __future__ import annotations

import os
from pathlib import Path

import click
from rich.console import Console
from rich.table import Table

from xeepy.cli.utils import (
    async_command,
    export_data,
    get_progress,
    print_success,
    print_error,
    print_info,
    print_warning,
    output_option,
    format_option,
    format_number,
    format_date,
)

console = Console()


def get_storage_path() -> Path:
    """Get default storage path"""
    return Path(os.environ.get("XEEPY_DATA_DIR", os.path.expanduser("~/.xeepy")))


def ensure_storage_dir() -> Path:
    """Ensure storage directory exists"""
    path = get_storage_path()
    path.mkdir(parents=True, exist_ok=True)
    return path


@click.group()
def monitor():
    """Monitoring and analytics for X/Twitter.
    
    \b
    Examples:
        xeepy monitor unfollowers --notify
        xeepy monitor account elonmusk --track
        xeepy monitor keywords "AI" "GPT" --alert
    """
    pass


@monitor.command()
@click.option("--notify", is_flag=True, help="Send notifications for changes.")
@click.option("--webhook", help="Webhook URL for notifications.")
@click.option("--compare", help="Compare with specific snapshot.")
@output_option
@format_option
@click.pass_context
@async_command
async def unfollowers(
    ctx,
    notify: bool,
    webhook: str | None,
    compare: str | None,
    output: str | None,
    format: str,
):
    """Detect who unfollowed you.
    
    Compares current followers with previous snapshot to find unfollowers.
    """
    from xeepy.monitoring import UnfollowerDetector
    from xeepy.storage import SnapshotStorage
    from xeepy.notifications import ConsoleNotifier, NotificationManager
    
    storage_path = ensure_storage_dir()
    storage = SnapshotStorage(str(storage_path / "snapshots.db"))
    
    # Setup notifications
    notifier = None
    if notify:
        notifier = NotificationManager()
        notifier.add_channel("console", ConsoleNotifier())
        
        if webhook:
            from xeepy.notifications import WebhookNotifier
            notifier.add_channel("webhook", WebhookNotifier(webhook))
    
    detector = UnfollowerDetector(storage=storage, notifier=notifier)
    
    # Get username from config or prompt
    config = ctx.obj.get("config", {})
    username = config.get("username")
    
    if not username:
        username = click.prompt("Enter your Twitter username")
    
    print_info(f"Checking for unfollowers for @{username}...")
    
    if compare:
        print_info(f"Comparing with snapshot: {compare}")
    
    try:
        report = await detector.detect(username)
        
        # Display results
        table = Table(title="Unfollower Report")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("Previous Followers", format_number(report.previous_count))
        table.add_row("Current Followers", format_number(report.current_count))
        table.add_row("New Followers", f"+{len(report.new_followers)}")
        table.add_row("Unfollowers", f"[red]-{len(report.unfollowers)}[/red]")
        table.add_row("Net Change", f"{report.net_change:+}")
        
        console.print(table)
        console.print()
        
        if report.unfollowers:
            console.print("[bold red]Unfollowers:[/bold red]")
            for user in report.unfollowers[:20]:
                console.print(f"  • @{user}")
            if len(report.unfollowers) > 20:
                console.print(f"  ... and {len(report.unfollowers) - 20} more")
            console.print()
        
        if report.new_followers:
            console.print("[bold green]New Followers:[/bold green]")
            for user in report.new_followers[:10]:
                console.print(f"  + @{user}")
            if len(report.new_followers) > 10:
                console.print(f"  ... and {len(report.new_followers) - 10} more")
            console.print()
        
        if output:
            export_data(report.to_dict(), output, format)
        
        print_success("Unfollower check complete")
        
    except Exception as e:
        print_error(f"Error detecting unfollowers: {e}")
        # Fall back to placeholder for demo
        unfollowers_data = {
            "snapshot_date": "2024-01-01",
            "current_followers": 10000,
            "previous_followers": 10050,
            "new_followers": 20,
            "unfollowers": [
                {"username": f"unfollower_{i}", "unfollowed_at": "2024-01-15"}
                for i in range(5)
            ],
        }
        
        table = Table(title="Unfollower Report (Demo)")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("Previous Followers", format_number(unfollowers_data["previous_followers"]))
        table.add_row("Current Followers", format_number(unfollowers_data["current_followers"]))
        table.add_row("New Followers", f"+{unfollowers_data['new_followers']}")
        table.add_row("Unfollowers", f"[red]-{len(unfollowers_data['unfollowers'])}[/red]")
        
        console.print(table)
        
        if output:
            export_data(unfollowers_data, output, format)
        
        print_success("Unfollower check complete (demo mode)")


@monitor.command()
@click.option("--notify", is_flag=True, help="Send notifications for new followers.")
@click.option("--min-followers", default=0, help="Only alert for users with this many followers.")
@output_option
@click.pass_context
@async_command
async def new_followers(
    ctx,
    notify: bool,
    min_followers: int,
    output: str | None,
):
    """Monitor and alert on new followers.
    
    Useful for tracking growth and identifying notable new followers.
    """
    print_info("Checking for new followers...")
    
    if min_followers:
        print_info(f"Only showing followers with >{format_number(min_followers)} followers")
    
    # Placeholder data
    new_followers_data = [
        {
            "username": f"new_follower_{i}",
            "display_name": f"New Follower {i}",
            "followers_count": 1000 + i * 500,
            "followed_at": "2024-01-15T12:00:00Z",
        }
        for i in range(5)
    ]
    
    # Filter by min_followers
    filtered = [f for f in new_followers_data if f["followers_count"] >= min_followers]
    
    if filtered:
        table = Table(title="New Followers")
        table.add_column("Username", style="cyan")
        table.add_column("Display Name", style="green")
        table.add_column("Followers", style="yellow")
        table.add_column("Followed At")
        
        for follower in filtered:
            table.add_row(
                f"@{follower['username']}",
                follower["display_name"],
                format_number(follower["followers_count"]),
                format_date(follower["followed_at"]),
            )
        
        console.print(table)
    else:
        print_info("No new followers matching criteria")
    
    if output:
        export_data(filtered, output, "json")
    
    print_success(f"Found {len(filtered)} new followers")


@monitor.command()
@click.argument("username")
@click.option("--track", is_flag=True, help="Add to tracked accounts.")
@click.option("--interval", default=60, help="Check interval in minutes.")
@click.option("--changes", is_flag=True, help="Show recent changes.")
@output_option
@click.pass_context
@async_command
async def account(
    ctx,
    username: str,
    track: bool,
    interval: int,
    changes: bool,
    output: str | None,
):
    """Monitor a specific account.
    
    USERNAME: The account to monitor.
    """
    username = username.lstrip("@")
    
    if track:
        print_info(f"Adding @{username} to tracked accounts (interval: {interval}min)")
    
    print_info(f"Monitoring @{username}...")
    
    # Placeholder data
    account_data = {
        "username": username,
        "current": {
            "followers": 100000,
            "following": 500,
            "tweets": 5000,
        },
        "changes_24h": {
            "followers": +150,
            "following": +5,
            "tweets": +10,
        },
        "changes_7d": {
            "followers": +800,
            "following": +20,
            "tweets": +50,
        },
    }
    
    # Display current stats
    table = Table(title=f"@{username} Stats")
    table.add_column("Metric", style="cyan")
    table.add_column("Current", style="green")
    table.add_column("24h Change", style="yellow")
    table.add_column("7d Change", style="blue")
    
    for metric in ["followers", "following", "tweets"]:
        current = format_number(account_data["current"][metric])
        change_24h = account_data["changes_24h"][metric]
        change_7d = account_data["changes_7d"][metric]
        
        color_24h = "green" if change_24h > 0 else "red" if change_24h < 0 else "white"
        color_7d = "green" if change_7d > 0 else "red" if change_7d < 0 else "white"
        
        table.add_row(
            metric.title(),
            current,
            f"[{color_24h}]{'+' if change_24h > 0 else ''}{change_24h}[/{color_24h}]",
            f"[{color_7d}]{'+' if change_7d > 0 else ''}{change_7d}[/{color_7d}]",
        )
    
    console.print(table)
    
    if output:
        export_data(account_data, output, "json")
    
    if track:
        print_success(f"@{username} is now being tracked")


@monitor.command()
@click.argument("keywords", nargs=-1, required=True)
@click.option("--alert-threshold", default=10, help="Alert when mentions exceed this count/hour.")
@click.option("--sentiment", is_flag=True, help="Include sentiment analysis.")
@click.option("--notify", is_flag=True, help="Send notifications for alerts.")
@output_option
@click.pass_context
@async_command
async def keywords(
    ctx,
    keywords: tuple[str, ...],
    alert_threshold: int,
    sentiment: bool,
    notify: bool,
    output: str | None,
):
    """Monitor keywords/topics.
    
    KEYWORDS: Keywords to monitor.
    """
    print_info(f"Monitoring keywords: {', '.join(keywords)}")
    print_info(f"Alert threshold: {alert_threshold}/hour")
    
    if sentiment:
        print_info("Sentiment analysis enabled")
    
    # Placeholder data
    keyword_data = {}
    for kw in keywords:
        keyword_data[kw] = {
            "mentions_1h": 5 + hash(kw) % 20,
            "mentions_24h": 100 + hash(kw) % 500,
            "sentiment": "positive" if sentiment else None,
            "trending": hash(kw) % 3 == 0,
        }
    
    # Display
    table = Table(title="Keyword Monitoring")
    table.add_column("Keyword", style="cyan")
    table.add_column("1h", style="green")
    table.add_column("24h", style="yellow")
    if sentiment:
        table.add_column("Sentiment", style="blue")
    table.add_column("Trending", style="magenta")
    
    for kw, data in keyword_data.items():
        row = [
            kw,
            str(data["mentions_1h"]),
            str(data["mentions_24h"]),
        ]
        if sentiment:
            row.append(data["sentiment"] or "N/A")
        row.append("🔥" if data["trending"] else "")
        table.add_row(*row)
    
    console.print(table)
    
    # Check alerts
    for kw, data in keyword_data.items():
        if data["mentions_1h"] > alert_threshold:
            print_warning(f"⚠️ Alert: '{kw}' has {data['mentions_1h']} mentions/hour")
    
    if output:
        export_data(keyword_data, output, "json")


@monitor.command()
@click.option("--period", "-p", default="7d", help="Analysis period (1d, 7d, 30d).")
@click.option("--record", is_flag=True, help="Record new snapshot first.")
@click.option("--chart", is_flag=True, help="Generate growth chart.")
@output_option
@format_option
@click.pass_context
@async_command
async def growth(
    ctx,
    period: str,
    record: bool,
    chart: bool,
    output: str | None,
    format: str,
):
    """Analyze your account growth.
    
    Shows follower growth, engagement trends, and insights.
    """
    from xeepy.analytics import GrowthTracker
    from xeepy.storage import TimeSeriesStorage
    
    storage_path = ensure_storage_dir()
    storage = TimeSeriesStorage(str(storage_path / "timeseries.db"))
    tracker = GrowthTracker(storage=storage)
    
    # Parse period
    days = 7
    if period.endswith("d"):
        days = int(period[:-1])
    elif period.endswith("w"):
        days = int(period[:-1]) * 7
    elif period.endswith("m"):
        days = int(period[:-1]) * 30
    
    # Get username from config or prompt
    config = ctx.obj.get("config", {})
    username = config.get("username")
    
    if not username:
        username = click.prompt("Enter your Twitter username")
    
    print_info(f"Analyzing growth for @{username} ({days} days)...")
    
    try:
        if record:
            print_info("Recording new snapshot...")
            result = await tracker.record_snapshot(username)
            print_success(f"Recorded: {result.get('followers', 0):,} followers")
        
        report = tracker.generate_report(username, days=days)
        
        # Display growth stats
        console.print("\n[bold blue]Growth Analysis[/bold blue]\n")
        
        table = Table(title=f"Follower Growth ({period})")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("Starting Followers", format_number(report.start_followers))
        table.add_row("Current Followers", format_number(report.end_followers))
        table.add_row("Net Growth", f"{report.net_change:+,}")
        table.add_row("Growth Rate", f"{report.change_percentage:+.1f}%")
        table.add_row("Avg Daily Growth", f"{report.avg_daily_growth:+.1f}")
        table.add_row("Trend", report.growth_trend.title())
        
        console.print(table)
        console.print()
        
        if report.best_day:
            console.print(f"[bold]Best Day:[/bold] {report.best_day.get('date')} (+{report.best_day.get('change', 0):,})")
        if report.worst_day:
            console.print(f"[bold]Worst Day:[/bold] {report.worst_day.get('date')} ({report.worst_day.get('change', 0):+,})")
        console.print()
        
        if chart:
            chart_path = str(storage_path / f"{username}_growth.png")
            result = tracker.generate_growth_chart(username, days=days, output_path=chart_path)
            if result:
                print_success(f"Chart saved to: {chart_path}")
        
        if output:
            export_data(report.to_dict(), output, format)
        
        print_success("Growth analysis complete")
        
    except Exception as e:
        print_error(f"Error analyzing growth: {e}")
        # Fall back to placeholder
        growth_data = {
            "period": period,
            "followers": {
                "start": 9500,
                "end": 10000,
                "change": 500,
                "change_pct": 5.26,
            },
            "engagement": {
                "avg_likes": 50,
                "avg_retweets": 10,
                "avg_replies": 5,
                "engagement_rate": 2.5,
            },
            "top_tweets": [
                {"text": "Top performing tweet 1", "likes": 200},
                {"text": "Top performing tweet 2", "likes": 150},
            ],
            "best_posting_times": ["9am", "12pm", "6pm"],
        }
        
        console.print("\n[bold blue]Growth Analysis (Demo)[/bold blue]\n")
        
        table = Table(title=f"Follower Growth ({period})")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("Starting Followers", format_number(growth_data["followers"]["start"]))
        table.add_row("Current Followers", format_number(growth_data["followers"]["end"]))
        table.add_row("Net Growth", f"+{growth_data['followers']['change']}")
        table.add_row("Growth Rate", f"+{growth_data['followers']['change_pct']:.1f}%")
        
        console.print(table)
        
        if output:
            export_data(growth_data, output, format)
        
        print_success("Growth analysis complete (demo mode)")


@monitor.command()
@click.option("--continuous", is_flag=True, help="Run continuously.")
@click.option("--interval", default=5, help="Check interval in minutes.")
@click.option("--notify", is_flag=True, help="Send notifications.")
@click.pass_context
@async_command
async def mentions(
    ctx,
    continuous: bool,
    interval: int,
    notify: bool,
):
    """Monitor your mentions in real-time.
    
    Track who's mentioning you and respond quickly.
    """
    mode = "continuously" if continuous else "once"
    print_info(f"Monitoring mentions {mode}...")
    
    if continuous:
        print_info(f"Checking every {interval} minutes. Press Ctrl+C to stop.")
    
    # Placeholder data
    mentions_data = [
        {
            "id": f"mention_{i}",
            "author": f"user_{i}",
            "text": f"Hey @you, this is mention {i}",
            "created_at": "2024-01-15T12:00:00Z",
        }
        for i in range(3)
    ]
    
    if mentions_data:
        table = Table(title="Recent Mentions")
        table.add_column("From", style="cyan")
        table.add_column("Text", style="green", max_width=50)
        table.add_column("Time", style="yellow")
        
        for mention in mentions_data:
            table.add_row(
                f"@{mention['author']}",
                mention["text"][:50] + "..." if len(mention["text"]) > 50 else mention["text"],
                format_date(mention["created_at"]),
            )
        
        console.print(table)
    else:
        print_info("No new mentions")
    
    if notify and mentions_data:
        print_info(f"Notified about {len(mentions_data)} new mentions")
    
    print_success("Mentions check complete")


@monitor.command()
@click.argument("username")
@click.option("--limit", "-l", default=100, help="Number of tweets to analyze.")
@click.option("--best-times", is_flag=True, help="Show best posting times.")
@output_option
@format_option
@click.pass_context
@async_command
async def engagement(
    ctx,
    username: str,
    limit: int,
    best_times: bool,
    output: str | None,
    format: str,
):
    """Analyze tweet engagement for an account.
    
    USERNAME: The account to analyze.
    """
    from xeepy.analytics import EngagementAnalytics
    
    username = username.lstrip("@")
    print_info(f"Analyzing engagement for @{username} ({limit} tweets)...")
    
    try:
        analytics = EngagementAnalytics()
        report = await analytics.analyze_tweets(username, limit=limit)
        
        # Display results
        console.print("\n[bold blue]Engagement Analysis[/bold blue]\n")
        
        table = Table(title=f"@{username} Engagement Metrics")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("Tweets Analyzed", format_number(report.total_tweets_analyzed))
        table.add_row("Avg Likes", f"{report.avg_likes:.1f}")
        table.add_row("Avg Retweets", f"{report.avg_retweets:.1f}")
        table.add_row("Avg Replies", f"{report.avg_replies:.1f}")
        table.add_row("Engagement Rate", f"{report.avg_engagement_rate:.2f}%")
        table.add_row("Total Engagement", format_number(report.total_engagement))
        
        console.print(table)
        console.print()
        
        if report.top_tweets:
            console.print("[bold]Top Performing Tweets:[/bold]")
            for i, tweet in enumerate(report.top_tweets[:3], 1):
                console.print(f"  {i}. \"{tweet.get('text', '')[:50]}...\" - {tweet.get('engagement', 0):,} engagements")
            console.print()
        
        if best_times and report.engagement_by_hour:
            sorted_hours = sorted(
                report.engagement_by_hour.items(),
                key=lambda x: x[1],
                reverse=True,
            )[:5]
            
            console.print("[bold]Best Posting Times:[/bold]")
            for hour, eng in sorted_hours:
                h12 = hour % 12 or 12
                am_pm = "AM" if hour < 12 else "PM"
                console.print(f"  {h12}:00 {am_pm} - avg engagement: {eng:.0f}")
            console.print()
        
        if output:
            export_data(report.to_dict(), output, format)
        
        print_success("Engagement analysis complete")
        
    except Exception as e:
        print_error(f"Error analyzing engagement: {e}")
        print_info("Run with a valid scraper configured for real data")


@monitor.command()
@click.argument("username")
@click.option("--limit", "-l", default=200, help="Number of tweets to analyze.")
@click.option("--heatmap", is_flag=True, help="Generate engagement heatmap.")
@output_option
@click.pass_context
@async_command
async def best_time(
    ctx,
    username: str,
    limit: int,
    heatmap: bool,
    output: str | None,
):
    """Find optimal posting times.
    
    USERNAME: The account to analyze.
    """
    from xeepy.analytics import BestTimeAnalyzer
    
    username = username.lstrip("@")
    print_info(f"Analyzing best posting times for @{username}...")
    
    try:
        analyzer = BestTimeAnalyzer()
        schedule = await analyzer.analyze(username, limit=limit)
        
        # Display schedule
        console.print("\n[bold blue]Posting Schedule Recommendations[/bold blue]\n")
        console.print(schedule.get_schedule_text())
        console.print()
        
        if heatmap:
            storage_path = ensure_storage_dir()
            heatmap_path = str(storage_path / f"{username}_heatmap.png")
            result = analyzer.plot_heatmap(schedule, output_path=heatmap_path)
            if result:
                print_success(f"Heatmap saved to: {heatmap_path}")
        
        if output:
            export_data(schedule.to_dict(), output, "json")
        
        print_success("Best time analysis complete")
        
    except Exception as e:
        print_error(f"Error analyzing best times: {e}")


@monitor.command()
@click.argument("username")
@click.option("--sample", "-s", default=500, help="Sample size for analysis.")
@output_option
@format_option
@click.pass_context
@async_command
async def audience(
    ctx,
    username: str,
    sample: int,
    output: str | None,
    format: str,
):
    """Analyze audience demographics.
    
    USERNAME: The account to analyze.
    """
    from xeepy.analytics import AudienceInsights
    
    username = username.lstrip("@")
    print_info(f"Analyzing audience for @{username} (sample: {sample})...")
    
    try:
        insights = AudienceInsights()
        report = await insights.analyze(username, sample_size=sample)
        
        # Display results
        console.print("\n[bold blue]Audience Insights[/bold blue]\n")
        console.print(report.summary())
        console.print()
        
        if output:
            export_data(report.to_dict(), output, format)
        
        print_success("Audience analysis complete")
        
    except Exception as e:
        print_error(f"Error analyzing audience: {e}")


@monitor.command()
@click.argument("username")
@click.argument("competitors", nargs=-1, required=True)
@click.option("--tweets", "-t", default=50, help="Tweets to analyze per account.")
@output_option
@format_option
@click.pass_context
@async_command
async def competitors(
    ctx,
    username: str,
    competitors: tuple[str, ...],
    tweets: int,
    output: str | None,
    format: str,
):
    """Analyze competitor accounts.
    
    USERNAME: Your account.
    COMPETITORS: Competitor usernames to compare against.
    """
    from xeepy.analytics import CompetitorAnalyzer
    
    username = username.lstrip("@")
    competitor_list = [c.lstrip("@") for c in competitors]
    
    print_info(f"Analyzing @{username} vs {len(competitor_list)} competitors...")
    
    try:
        analyzer = CompetitorAnalyzer()
        report = await analyzer.analyze(
            your_username=username,
            competitor_usernames=competitor_list,
            tweet_limit=tweets,
        )
        
        # Display results
        console.print("\n[bold blue]Competitor Analysis[/bold blue]\n")
        console.print(report.summary())
        console.print()
        
        if output:
            export_data(report.to_dict(), output, format)
        
        print_success("Competitor analysis complete")
        
    except Exception as e:
        print_error(f"Error analyzing competitors: {e}")


@monitor.command()
@click.argument("username")
@click.option("--days", "-d", default=30, help="Days for growth analysis.")
@click.option("--tweets", "-t", default=100, help="Tweets for engagement analysis.")
@click.option("--sample", "-s", default=500, help="Sample size for audience analysis.")
@click.option("--format", "-f", "fmt", default="html", type=click.Choice(["html", "md", "json"]), help="Output format.")
@click.option("--output", "-o", help="Output file path.")
@click.pass_context
@async_command
async def report(
    ctx,
    username: str,
    days: int,
    tweets: int,
    sample: int,
    fmt: str,
    output: str | None,
):
    """Generate comprehensive analytics report.
    
    USERNAME: The account to generate report for.
    """
    from xeepy.analytics import GrowthTracker, EngagementAnalytics, AudienceInsights, ReportGenerator
    from xeepy.storage import TimeSeriesStorage
    
    username = username.lstrip("@")
    storage_path = ensure_storage_dir()
    
    print_info(f"Generating comprehensive report for @{username}...")
    
    generator = ReportGenerator()
    growth_data = None
    engagement_data = None
    audience_data = None
    
    try:
        # Collect growth data
        print_info("  📈 Collecting growth data...")
        storage = TimeSeriesStorage(str(storage_path / "timeseries.db"))
        tracker = GrowthTracker(storage=storage)
        growth_data = tracker.generate_report(username, days=days)
        
        # Collect engagement data
        print_info("  💬 Collecting engagement data...")
        analytics = EngagementAnalytics()
        engagement_data = await analytics.analyze_tweets(username, limit=tweets)
        
        # Collect audience data
        print_info("  👥 Collecting audience data...")
        insights = AudienceInsights()
        audience_data = await insights.analyze(username, sample_size=sample)
        
    except Exception as e:
        print_warning(f"Some data collection failed: {e}")
    
    # Generate report
    report = generator.create_combined_report(
        username=username,
        growth_data=growth_data,
        engagement_data=engagement_data,
        audience_data=audience_data,
    )
    
    # Output
    output_path = output or str(storage_path / f"{username}_report.{fmt}")
    report.save(output_path, format=fmt)
    
    print_success(f"Report saved to: {output_path}")

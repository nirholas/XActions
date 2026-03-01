# Xeepy - X/Twitter Automation Toolkit

A professional-grade Python toolkit for scraping and automating X (formerly Twitter) using Playwright browser automation. This project replaces the deprecated Tweepy API approach with modern web scraping techniques.

## 🚀 Features

- **Browser Automation**: Uses Playwright for reliable web scraping
- **12 Specialized Scrapers**: Profile, followers, following, tweets, replies, threads, hashtags, media, likes, lists, and search
- **Stealth Mode**: Anti-detection measures including user agent rotation
- **Rate Limiting**: Smart rate limiting with exponential backoff
- **Multiple Export Formats**: CSV, JSON, NDJSON, and SQLite
- **Async/Await**: Fully asynchronous for optimal performance
- **Type Hints**: Complete type annotations for IDE support

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/xeepy.git
cd xeepy

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium
```

### Requirements

- Python 3.10+
- Playwright
- See `requirements.txt` for full dependency list

## 🔧 Quick Start

### Basic Usage

```python
import asyncio
from xeepy import ProfileScraper, RepliesScraper
from xeepy.core import BrowserManager, Authenticator

async def main():
    async with BrowserManager() as browser:
        page = await browser.new_page()
        
        # Optional: Authenticate for protected content
        auth = Authenticator()
        await auth.login(page)
        
        # Scrape a profile
        profile_scraper = ProfileScraper(page)
        profile = await profile_scraper.scrape("elonmusk")
        print(f"Followers: {profile.followers_count}")
        
        # Scrape replies to a tweet
        replies_scraper = RepliesScraper(page)
        result = await replies_scraper.scrape(
            tweet_id="1234567890123456789",
            max_items=100
        )
        
        for reply in result.data:
            print(f"@{reply.author_username}: {reply.text}")

asyncio.run(main())
```

### Scraping Replies (Main Use Case)

This toolkit was created to fix the broken `twitter_reply.py` script that used the deprecated Tweepy search API.

```python
import asyncio
from xeepy import RepliesScraper
from xeepy.core import BrowserManager
from xeepy.exporters import CSVExporter

async def scrape_replies():
    async with BrowserManager(headless=False) as browser:
        page = await browser.new_page()
        
        scraper = RepliesScraper(page)
        result = await scraper.scrape(
            tweet_id="1234567890123456789",
            max_items=500
        )
        
        print(f"Found {len(result.data)} replies")
        
        # Export to CSV
        exporter = CSVExporter()
        exporter.export(
            [r.to_dict() for r in result.data],
            "replies.csv"
        )

asyncio.run(scrape_replies())
```

## 📚 Available Scrapers

| Scraper | Description | Usage |
|---------|-------------|-------|
| `ProfileScraper` | Extract user profile data | `scrape(username)` |
| `FollowersScraper` | Get user's followers | `scrape(username, max_items=100)` |
| `FollowingScraper` | Get who user follows | `scrape(username, max_items=100)` |
| `TweetsScraper` | Get user's tweets | `scrape(username, max_items=100)` |
| `RepliesScraper` | Get replies to a tweet | `scrape(tweet_id, max_items=100)` |
| `ThreadScraper` | Get full thread | `scrape(tweet_id)` |
| `HashtagScraper` | Search by hashtag | `scrape(hashtag, max_items=100)` |
| `MediaScraper` | Get user's media | `scrape(username, max_items=100)` |
| `LikesScraper` | Get user's likes | `scrape(username, max_items=100)` |
| `ListsScraper` | Get list members | `scrape(list_id, max_items=100)` |
| `SearchScraper` | Full search | `scrape(query, mode="latest", max_items=100)` |

## 🔐 Authentication

For accessing protected content or avoiding rate limits:

```python
from xeepy.core import AuthConfig, Authenticator

# Method 1: Cookie file (recommended)
config = AuthConfig(cookies_file="cookies.json")
auth = Authenticator(config)
await auth.login(page)  # Loads from file or prompts manual login

# Method 2: Credentials (use with caution)
config = AuthConfig(
    username="your_username",
    password="your_password",
    phone_or_email="backup@email.com"  # For verification prompts
)
```

## 📤 Exporters

### CSV Export

```python
from xeepy.exporters import CSVExporter

exporter = CSVExporter()
exporter.export(data, "output.csv")

# With custom headers
exporter.export_with_headers(
    data,
    "output.csv",
    headers={"username": "User Name", "text": "Tweet Text"}
)
```

### JSON Export

```python
from xeepy.exporters import JSONExporter

exporter = JSONExporter(indent=2)
exporter.export(data, "output.json")

# Newline-delimited JSON for streaming
exporter.export_ndjson(data, "output.ndjson")
```

### SQLite Export

```python
from xeepy.exporters import SQLiteExporter

exporter = SQLiteExporter()
exporter.export(data, "data.db", table="tweets")

# Query later
results = exporter.query("data.db", "SELECT * FROM tweets WHERE likes > 100")
```

## ⚙️ Configuration

### Browser Configuration

```python
from xeepy.core import BrowserConfig, BrowserManager

config = BrowserConfig(
    headless=True,          # Run without visible browser
    timeout=30,             # Page load timeout (seconds)
    stealth_mode=True,      # Enable anti-detection
    rotate_user_agent=True, # Rotate user agents
    proxy="http://proxy:8080",  # Optional proxy
)

async with BrowserManager(config) as browser:
    ...
```

### Rate Limiting

```python
from xeepy.core import RateLimitConfig, RateLimiter

config = RateLimitConfig(
    requests_per_minute=30,
    requests_per_hour=500,
    min_delay=1.0,
    max_delay=5.0,
    jitter=True,  # Add randomness to delays
)

limiter = RateLimiter(config)
await limiter.wait("scroll")  # Wait before action
```

## 🧪 Testing

```bash
# Run all tests
pytest xeepy/tests/

# Run with coverage
pytest --cov=xeepy xeepy/tests/

# Run specific test file
pytest xeepy/tests/test_utils.py -v
```

## 📁 Project Structure

```
xeepy/
├── __init__.py           # Package exports
├── core/                 # Core infrastructure
│   ├── browser.py       # Browser management
│   ├── auth.py          # Authentication
│   ├── config.py        # Configuration classes
│   ├── rate_limiter.py  # Rate limiting
│   ├── selectors.py     # DOM selectors
│   ├── exceptions.py    # Custom exceptions
│   └── utils.py         # Utility functions
├── models/              # Data models
│   ├── user.py         # User model
│   ├── tweet.py        # Tweet model
│   └── engagement.py   # Engagement metrics
├── scrapers/           # Scraper implementations
│   ├── base.py        # Base scraper class
│   ├── profile.py     # Profile scraper
│   ├── followers.py   # Followers scraper
│   ├── following.py   # Following scraper
│   ├── tweets.py      # Tweets scraper
│   ├── replies.py     # Replies scraper (THE FIX!)
│   ├── thread.py      # Thread scraper
│   ├── hashtag.py     # Hashtag scraper
│   ├── media.py       # Media scraper
│   ├── likes.py       # Likes scraper
│   ├── lists.py       # Lists scraper
│   └── search.py      # Search scraper
├── monitoring/         # Account monitoring
│   ├── unfollower_detector.py  # Track who unfollowed
│   ├── follower_alerts.py      # Milestone alerts
│   ├── account_monitor.py      # Track account changes
│   ├── keyword_monitor.py      # Brand monitoring
│   └── engagement_tracker.py   # Tweet performance
├── analytics/          # Analytics and insights
│   ├── growth_tracker.py       # Follower growth
│   ├── engagement_analytics.py # Engagement metrics
│   ├── best_time_to_post.py    # Optimal posting times
│   ├── audience_insights.py    # Audience analysis
│   ├── competitor_analysis.py  # Competitor comparison
│   └── reports.py              # Report generation
├── notifications/      # Multi-channel notifications
│   ├── console.py     # Console output
│   ├── email.py       # Email notifications
│   ├── webhook.py     # Discord/Slack webhooks
│   ├── telegram.py    # Telegram bot
│   └── manager.py     # Unified notification manager
├── storage/            # Data persistence
│   ├── snapshots.py   # Snapshot storage
│   └── timeseries.py  # Time series data
├── exporters/          # Export functionality
│   ├── csv_exporter.py
│   ├── json_exporter.py
│   └── sqlite_exporter.py
└── tests/              # Test suite
```

## 📊 Monitoring & Analytics

Xeepy includes comprehensive monitoring and analytics features for tracking your account's performance.

### Unfollower Detection

Track who unfollowed you with efficient snapshot comparison:

```python
from xeepy.monitoring import UnfollowerDetector
from xeepy.storage import SnapshotStorage
from xeepy.notifications import ConsoleNotifier, NotificationManager

# Setup
storage = SnapshotStorage("~/.xeepy/snapshots.db")
notifier = NotificationManager()
notifier.add_channel("console", ConsoleNotifier())

detector = UnfollowerDetector(storage=storage, notifier=notifier)

# Detect unfollowers
report = await detector.detect("yourusername")

print(f"Unfollowers: {report.unfollowers}")
print(f"New followers: {report.new_followers}")
print(f"Net change: {report.net_change}")
```

### Growth Tracking

Monitor follower growth over time with charts:

```python
from xeepy.analytics import GrowthTracker
from xeepy.storage import TimeSeriesStorage

storage = TimeSeriesStorage("~/.xeepy/timeseries.db")
tracker = GrowthTracker(storage=storage)

# Record daily snapshot
await tracker.record_snapshot("yourusername")

# Generate growth report
report = tracker.generate_report("yourusername", days=30)
print(report.summary())

# Generate growth chart
tracker.generate_growth_chart("yourusername", days=30, output_path="growth.png")
```

### Engagement Analytics

Analyze your tweet engagement patterns:

```python
from xeepy.analytics import EngagementAnalytics

analytics = EngagementAnalytics()

# Analyze recent tweets
report = await analytics.analyze_tweets("yourusername", limit=100)
print(f"Avg likes: {report.avg_likes}")
print(f"Avg engagement rate: {report.avg_engagement_rate}%")

# Find best posting times
best_times = await analytics.find_best_posting_time("yourusername")
print(f"Best hours: {best_times['best_hours']}")
print(f"Recommendation: {best_times['recommendation']}")
```

### Best Time to Post

Find optimal posting times with heatmap visualization:

```python
from xeepy.analytics import BestTimeAnalyzer

analyzer = BestTimeAnalyzer()

# Analyze your posting patterns
schedule = await analyzer.analyze("yourusername", limit=200)
print(schedule.get_schedule_text())

# Generate heatmap
analyzer.plot_heatmap(schedule, output_path="heatmap.png")

# Get next best time
next_slot = analyzer.get_next_best_time(schedule)
print(f"Post next: {next_slot.day} at {next_slot.time_str}")
```

### Audience Insights

Understand your follower demographics:

```python
from xeepy.analytics import AudienceInsights

insights = AudienceInsights()

# Analyze audience
report = await insights.analyze("yourusername", sample_size=500)
print(report.summary())

# Key insights
print(f"Top locations: {report.locations}")
print(f"Common interests: {report.common_bio_keywords[:10]}")
print(f"Verified %: {report.verified_percentage}%")
print(f"Likely bots %: {report.likely_bots_percentage}%")

# Find influential followers
influencers = await insights.find_influencers("yourusername", min_followers=10000)
```

### Competitor Analysis

Compare your performance against competitors:

```python
from xeepy.analytics import CompetitorAnalyzer

analyzer = CompetitorAnalyzer()

# Analyze against competitors
report = await analyzer.analyze(
    your_username="yourusername",
    competitor_usernames=["competitor1", "competitor2"],
)
print(report.summary())

# Key comparisons
print(f"Your strengths: {report.your_strengths}")
print(f"Opportunities: {report.opportunities}")
```

### Report Generation

Generate comprehensive reports in multiple formats:

```python
from xeepy.analytics import ReportGenerator, GrowthTracker, EngagementAnalytics

generator = ReportGenerator()

# Generate combined report
report = generator.create_combined_report(
    username="yourusername",
    growth_data=growth_tracker.generate_report("yourusername"),
    engagement_data=await analytics.analyze_tweets("yourusername"),
)

# Export in different formats
report.save("report.html")  # HTML report
report.save("report.md")    # Markdown report  
report.save("report.json")  # JSON data
```

### Multi-Channel Notifications

Get notified across multiple channels:

```python
from xeepy.notifications import (
    NotificationManager,
    ConsoleNotifier,
    WebhookNotifier,
    TelegramNotifier,
    TelegramConfig,
)

manager = NotificationManager()

# Add channels
manager.add_channel("console", ConsoleNotifier())
manager.add_channel("discord", WebhookNotifier("https://discord.com/api/webhooks/..."))
manager.add_channel("telegram", TelegramNotifier(TelegramConfig(
    bot_token="your_bot_token",
    chat_id="your_chat_id",
)))

# Send notification
manager.notify(
    title="🚨 Unfollower Alert",
    message="5 users unfollowed you today",
    level="warning",
)
```

### CLI Commands

Use monitoring from the command line:

```bash
# Check unfollowers
xeepy monitor unfollowers --notify

# Track growth
xeepy monitor growth --period 30d --chart

# Analyze engagement
xeepy monitor engagement yourusername --best-times

# Find best posting times
xeepy monitor best-time yourusername --heatmap

# Analyze audience
xeepy monitor audience yourusername --sample 500

# Compare with competitors
xeepy monitor competitors yourusername competitor1 competitor2

# Generate comprehensive report
xeepy monitor report yourusername --format html --output report.html
```

## ⚠️ Important Notes

1. **Rate Limiting**: X actively rate-limits automated access. Use delays between requests.

2. **Terms of Service**: Scraping may violate X's Terms of Service. Use responsibly and for personal/research purposes only.

3. **Selectors Change**: X frequently updates their DOM structure. Selectors may need updates.

4. **Authentication**: Some content requires login. Use cookie-based auth for persistence.

5. **Headless Mode**: Some anti-bot measures detect headless browsers. Try `headless=False` if blocked.

## 🔄 Migration from twitter_reply.py

The original `twitter_reply.py` used Tweepy's search API which is now deprecated/paywalled. This toolkit provides a drop-in replacement:

```python
# Old (broken) - twitter_reply.py with Tweepy
import tweepy
tweets = api.search_tweets(q=f"to:{username}", ...)  # No longer works!

# New - Xeepy with Playwright
from xeepy import RepliesScraper
result = await scraper.scrape(tweet_id="...")  # Works!
```

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and feature requests, please open a GitHub issue.

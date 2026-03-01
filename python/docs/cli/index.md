# CLI Reference

Xeepy provides a powerful command-line interface for common operations without writing code.

## Installation

The CLI is included with Xeepy:

```bash
pip install xeepy
```

## Basic Usage

```bash
xeepy [COMMAND] [SUBCOMMAND] [OPTIONS]

# Get help
xeepy --help
xeepy scrape --help
xeepy scrape replies --help
```

## Commands Overview

| Command | Description |
|---------|-------------|
| `auth` | Authentication management |
| `scrape` | Scrape data from X/Twitter |
| `follow` | Follow users |
| `unfollow` | Unfollow users |
| `engage` | Like, retweet, reply |
| `monitor` | Monitor account changes |
| `analytics` | View analytics and reports |
| `ai` | AI-powered features |
| `export` | Export data to files |
| `config` | Configuration management |

## Authentication Commands

### Login

```bash
# Interactive login (opens browser)
xeepy auth login

# Login with specific profile
xeepy auth login --profile business

# Login with browser visible
xeepy auth login --headful
```

### Status

```bash
# Check authentication status
xeepy auth status

# Output:
# ✓ Authenticated as @username
# Session age: 2 days
```

### Logout

```bash
# Clear session
xeepy auth logout

# Clear all sessions
xeepy auth logout --all
```

### Import/Export

```bash
# Export session for backup
xeepy auth export session_backup.json

# Import session
xeepy auth import session_backup.json

# Import from browser cookies
xeepy auth import cookies.txt --format netscape
```

## Scrape Commands

### Scrape Replies

```bash
# Basic usage
xeepy scrape replies https://x.com/user/status/123456

# With options
xeepy scrape replies https://x.com/user/status/123456 \
    --limit 500 \
    --output replies.csv

# Filter options
xeepy scrape replies URL \
    --min-likes 10 \
    --verified-only \
    --sort top
```

### Scrape Profile

```bash
# Get profile info
xeepy scrape profile elonmusk

# Output as JSON
xeepy scrape profile elonmusk --format json

# Multiple profiles
xeepy scrape profile user1 user2 user3 -o profiles.csv
```

### Scrape Tweets

```bash
# User's tweets
xeepy scrape tweets username --limit 100

# Include retweets and replies
xeepy scrape tweets username --include-retweets --include-replies

# Date range
xeepy scrape tweets username --since 2024-01-01 --until 2024-02-01
```

### Scrape Followers

```bash
# Basic
xeepy scrape followers username --limit 1000

# Output to file
xeepy scrape followers username -o followers.csv

# With metadata
xeepy scrape followers username --include-bio --include-stats
```

### Scrape Following

```bash
xeepy scrape following username --limit 500 -o following.csv
```

### Scrape Search

```bash
# Basic search
xeepy scrape search "python programming" --limit 100

# Advanced search
xeepy scrape search "python programming" \
    --min-likes 50 \
    --min-retweets 10 \
    --lang en \
    --since 2024-01-01

# Search type
xeepy scrape search "keyword" --type latest  # or "top", "people"
```

### Scrape Hashtag

```bash
xeepy scrape hashtag "#buildinpublic" --limit 200 -o hashtag.csv
```

### Scrape Thread

```bash
# Unroll a thread
xeepy scrape thread https://x.com/user/status/123456 -o thread.json
```

## Follow Commands

### Follow User

```bash
# Follow single user
xeepy follow user naval

# Follow multiple
xeepy follow user user1 user2 user3
```

### Follow by Hashtag

```bash
xeepy follow hashtag "#buildinpublic" \
    --limit 20 \
    --min-followers 100 \
    --max-followers 50000
```

### Follow from Search

```bash
xeepy follow search "indie hacker" \
    --limit 15 \
    --min-followers 500
```

### Follow Followers Of

```bash
xeepy follow followers-of competitor_account \
    --limit 30 \
    --active-days 30
```

## Unfollow Commands

### Unfollow Non-Followers

```bash
# Dry run (preview)
xeepy unfollow non-followers --dry-run

# Execute
xeepy unfollow non-followers --max 50

# With whitelist
xeepy unfollow non-followers \
    --max 50 \
    --whitelist-file whitelist.txt

# Inline whitelist
xeepy unfollow non-followers \
    --max 50 \
    --whitelist user1,user2,user3
```

### Unfollow Inactive

```bash
xeepy unfollow inactive --days 180 --max 30
```

### Smart Unfollow

```bash
xeepy unfollow smart \
    --criteria inactive,no-bio,not-following \
    --max 25
```

### Unfollow Everyone

```bash
# Requires confirmation
xeepy unfollow everyone \
    --whitelist-file whitelist.txt \
    --confirm
```

## Engage Commands

### Like

```bash
# Like a tweet
xeepy engage like https://x.com/user/status/123456

# Like multiple
xeepy engage like URL1 URL2 URL3
```

### Retweet

```bash
xeepy engage retweet https://x.com/user/status/123456
```

### Reply

```bash
xeepy engage reply https://x.com/user/status/123456 "Great thread!"
```

### Auto-Like

```bash
xeepy engage auto-like \
    --keywords "python,automation" \
    --limit 20 \
    --min-likes 10
```

## Monitor Commands

### Check Unfollowers

```bash
# One-time check
xeepy monitor unfollowers

# With notification
xeepy monitor unfollowers --notify discord

# Continuous monitoring
xeepy monitor unfollowers --watch --interval 3600
```

### Track Growth

```bash
xeepy monitor growth --period 7d
```

### Monitor Keywords

```bash
xeepy monitor keywords "your_brand,your_product" \
    --notify telegram \
    --interval 300
```

### Start Daemon

```bash
# Start all monitors in background
xeepy monitor start --config monitoring.yaml --daemon
```

## Analytics Commands

### Growth Report

```bash
xeepy analytics growth --period 30d
```

### Engagement Analysis

```bash
xeepy analytics engagement --period 7d
```

### Best Time to Post

```bash
xeepy analytics best-time

# Output:
# Best day: Tuesday
# Best hour: 14:00
# Top 5 slots: ...
```

### Audience Insights

```bash
xeepy analytics audience --sample 1000
```

### Competitor Analysis

```bash
xeepy analytics competitors comp1,comp2,comp3
```

### Generate Report

```bash
# Markdown report
xeepy analytics report --period 30d -o report.md

# PDF report
xeepy analytics report --period 30d --format pdf -o report.pdf
```

## AI Commands

### Generate Tweet

```bash
xeepy ai tweet "Python tips" --style educational
```

### Generate Thread

```bash
xeepy ai thread "My startup journey" --length 5
```

### Generate Reply

```bash
xeepy ai reply https://x.com/user/status/123456 --style supportive
```

### Analyze Sentiment

```bash
xeepy ai sentiment "This is amazing!"

# Analyze from file
xeepy ai sentiment --file tweets.txt
```

### Bot Detection

```bash
xeepy ai bot-check suspicious_username
```

## Export Commands

### Convert Formats

```bash
# CSV to JSON
xeepy export convert data.csv data.json

# JSON to Excel
xeepy export convert data.json data.xlsx
```

### Export to Database

```bash
xeepy export database data.csv sqlite:///data.db --table tweets
xeepy export database data.csv postgresql://user:pass@host/db --table tweets
```

## Configuration Commands

### View Config

```bash
# Show current configuration
xeepy config show

# Show specific setting
xeepy config get rate_limit.requests_per_minute
```

### Set Config

```bash
xeepy config set rate_limit.requests_per_minute 25
xeepy config set headless true
```

### Profiles

```bash
# List profiles
xeepy config profiles

# Create profile
xeepy config create-profile business

# Use profile
xeepy --profile business scrape replies URL
```

## Global Options

Available for all commands:

| Option | Description |
|--------|-------------|
| `--profile NAME` | Use named profile |
| `--config FILE` | Use config file |
| `--headless/--no-headless` | Browser visibility |
| `--verbose/-v` | Verbose output |
| `--quiet/-q` | Suppress output |
| `--dry-run` | Preview without executing |
| `--output/-o FILE` | Output file |
| `--format FORMAT` | Output format (csv, json, etc.) |

## Output Formats

```bash
# CSV (default)
xeepy scrape tweets user -o tweets.csv

# JSON
xeepy scrape tweets user -o tweets.json --format json

# Excel
xeepy scrape tweets user -o tweets.xlsx --format excel

# Pretty print to console
xeepy scrape profile user --format pretty
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `XEEPY_SESSION_FILE` | Session file path |
| `XEEPY_CONFIG_FILE` | Config file path |
| `XEEPY_PROFILE` | Default profile |
| `XEEPY_HEADLESS` | Headless mode (true/false) |
| `DISCORD_WEBHOOK` | Discord notification URL |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `OPENAI_API_KEY` | OpenAI API key |

## Examples

### Daily Routine Script

```bash
#!/bin/bash
# daily_routine.sh

echo "🌅 Starting daily routine..."

# Check unfollowers
xeepy monitor unfollowers --notify discord

# Unfollow non-followers
xeepy unfollow non-followers --max 25 --whitelist-file whitelist.txt

# Follow from target hashtag
xeepy follow hashtag "#buildinpublic" --limit 15 --min-followers 100

# Generate growth report
xeepy analytics growth --period 24h --notify discord

echo "✅ Daily routine complete!"
```

### Data Collection Pipeline

```bash
#!/bin/bash
# collect_data.sh

USERNAME=$1
OUTPUT_DIR="data/$USERNAME"
mkdir -p $OUTPUT_DIR

echo "📊 Collecting data for @$USERNAME..."

xeepy scrape profile $USERNAME -o "$OUTPUT_DIR/profile.json" --format json
xeepy scrape tweets $USERNAME --limit 500 -o "$OUTPUT_DIR/tweets.csv"
xeepy scrape followers $USERNAME --limit 1000 -o "$OUTPUT_DIR/followers.csv"

echo "✅ Data saved to $OUTPUT_DIR/"
```

### Competitor Analysis

```bash
#!/bin/bash
# analyze_competitors.sh

COMPETITORS="comp1 comp2 comp3"

for comp in $COMPETITORS; do
    echo "Analyzing @$comp..."
    xeepy scrape tweets $comp --limit 100 -o "analysis/$comp_tweets.csv"
done

xeepy analytics competitors $COMPETITORS -o "analysis/comparison.md"
```

# CLI Command Reference

Complete reference for all Xeepy command-line commands.

## Global Options

```bash
# All commands support these options
xeepy [OPTIONS] COMMAND [ARGS]

Options:
  --config PATH    Configuration file path
  --profile NAME   Profile to use (for multiple accounts)
  --verbose, -v    Enable verbose output
  --quiet, -q      Suppress non-essential output
  --json           Output in JSON format
  --help           Show help message
```

## Authentication Commands

### `auth login`

Authenticate with X/Twitter.

```bash
# Interactive browser login
xeepy auth login

# With specific profile
xeepy auth login --profile work

# Headless (cookie import)
xeepy auth login --cookies cookies.json
```

### `auth logout`

Clear authentication.

```bash
xeepy auth logout
xeepy auth logout --profile work
```

### `auth status`

Check authentication status.

```bash
xeepy auth status
# Output: ✓ Logged in as @username
```

### `auth export`

Export session cookies.

```bash
xeepy auth export session.json
xeepy auth export --format netscape cookies.txt
```

---

## Scraping Commands

### `scrape replies`

Get replies to a tweet.

```bash
# Basic usage
xeepy scrape replies https://x.com/user/status/123

# With options
xeepy scrape replies https://x.com/user/status/123 \
  --limit 500 \
  --output replies.csv \
  --format csv

# Include nested replies
xeepy scrape replies https://x.com/user/status/123 --nested
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--limit, -n` | Maximum replies | 100 |
| `--output, -o` | Output file | stdout |
| `--format, -f` | Output format (csv, json, table) | table |
| `--nested` | Include nested replies | false |
| `--since` | Only replies after date | - |

### `scrape profile`

Get user profile information.

```bash
xeepy scrape profile elonmusk
xeepy scrape profile elonmusk --json
xeepy scrape profile user1 user2 user3 --output profiles.csv
```

### `scrape followers`

Get user's followers.

```bash
# Basic
xeepy scrape followers username

# With limit
xeepy scrape followers username --limit 1000 --output followers.csv

# Filter by followers count
xeepy scrape followers username --min-followers 1000
```

### `scrape following`

Get who a user follows.

```bash
xeepy scrape following username --limit 500
xeepy scrape following username --output following.json --format json
```

### `scrape tweets`

Get user's tweets.

```bash
# Recent tweets
xeepy scrape tweets username --limit 100

# With date range
xeepy scrape tweets username \
  --since 2024-01-01 \
  --until 2024-02-01 \
  --output tweets.csv

# Include retweets
xeepy scrape tweets username --include-retweets
```

### `scrape search`

Search for tweets.

```bash
# Basic search
xeepy scrape search "python programming"

# Advanced search
xeepy scrape search "AI tools" \
  --limit 200 \
  --type Latest \
  --min-likes 100 \
  --lang en

# Search with operators
xeepy scrape search "from:elonmusk AI" --limit 50
```

### `scrape hashtag`

Get tweets with a hashtag.

```bash
xeepy scrape hashtag python --limit 100
xeepy scrape hashtag machinelearning --since 2024-01-01
```

### `scrape thread`

Unroll a Twitter thread.

```bash
xeepy scrape thread https://x.com/user/status/123
xeepy scrape thread https://x.com/user/status/123 --output thread.md --format markdown
```

---

## Follow/Unfollow Commands

### `follow user`

Follow a user.

```bash
xeepy follow user username
xeepy follow user user1 user2 user3
```

### `follow by-keyword`

Follow users tweeting about keywords.

```bash
xeepy follow by-keyword "python" "machine learning" \
  --limit 50 \
  --min-followers 100
```

### `follow by-hashtag`

Follow users using specific hashtags.

```bash
xeepy follow by-hashtag python AI \
  --limit 30 \
  --since 24h
```

### `follow target-followers`

Follow followers of a specific account.

```bash
xeepy follow target-followers competitor_account \
  --limit 100 \
  --min-followers 500 \
  --skip-verified
```

### `unfollow non-followers`

Unfollow accounts that don't follow you back.

```bash
# Preview mode
xeepy unfollow non-followers --dry-run

# Execute
xeepy unfollow non-followers --limit 100

# With whitelist
xeepy unfollow non-followers \
  --whitelist @friend1 @friend2 \
  --skip-verified \
  --min-following-days 30
```

### `unfollow everyone`

Mass unfollow (use with caution).

```bash
# ALWAYS preview first
xeepy unfollow everyone --dry-run

# With safety limits
xeepy unfollow everyone \
  --limit 100 \
  --whitelist-file whitelist.txt \
  --delay 5
```

### `unfollow smart`

AI-powered unfollowing based on engagement.

```bash
xeepy unfollow smart \
  --criteria "no_interaction_30_days" \
  --limit 50 \
  --dry-run
```

---

## Engagement Commands

### `engage like`

Like tweets.

```bash
# Single tweet
xeepy engage like https://x.com/user/status/123

# Multiple tweets
xeepy engage like url1 url2 url3

# Auto-like by keyword
xeepy engage like --keyword "python tips" --limit 20
```

### `engage retweet`

Retweet tweets.

```bash
xeepy engage retweet https://x.com/user/status/123
xeepy engage retweet url1 url2 --quote "Great insight!"
```

### `engage comment`

Reply to tweets.

```bash
xeepy engage comment https://x.com/user/status/123 "Great post!"

# AI-generated comment
xeepy engage comment https://x.com/user/status/123 \
  --ai \
  --style supportive
```

### `engage auto-like`

Automatic liking based on criteria.

```bash
xeepy engage auto-like \
  --keywords "python" "ai" "programming" \
  --limit 50 \
  --min-followers 500 \
  --delay 2-5
```

### `engage bookmark`

Bookmark tweets.

```bash
xeepy engage bookmark https://x.com/user/status/123
xeepy engage bookmark url1 url2 url3
```

---

## Monitoring Commands

### `monitor unfollowers`

Check for unfollowers.

```bash
# Basic check
xeepy monitor unfollowers

# With notification
xeepy monitor unfollowers --notify discord

# Detailed report
xeepy monitor unfollowers --detailed --output report.json
```

### `monitor growth`

Track follower growth.

```bash
xeepy monitor growth --days 30
xeepy monitor growth --output growth.csv --chart growth.png
```

### `monitor keywords`

Monitor keyword mentions.

```bash
# Start monitoring
xeepy monitor keywords "brand" "product" \
  --interval 5m \
  --notify telegram

# One-time check
xeepy monitor keywords "brand" --since 1h
```

### `monitor accounts`

Watch specific accounts for changes.

```bash
xeepy monitor accounts competitor1 competitor2 \
  --watch bio,followers,tweets \
  --notify discord
```

---

## DM Commands

### `dm send`

Send direct messages.

```bash
xeepy dm send username "Hello!"
xeepy dm send user1 user2 "Check this out!" --media image.jpg
```

### `dm inbox`

View DM inbox.

```bash
xeepy dm inbox
xeepy dm inbox --unread-only --limit 20
```

### `dm search`

Search DMs.

```bash
xeepy dm search "keyword"
```

---

## Scheduling Commands

### `schedule tweet`

Schedule a tweet.

```bash
xeepy schedule tweet "Hello world!" --at "2024-12-25 09:00"
xeepy schedule tweet "With media!" --at "2024-12-25 12:00" --media photo.jpg
```

### `schedule list`

List scheduled tweets.

```bash
xeepy schedule list
xeepy schedule list --json
```

### `schedule delete`

Delete scheduled tweet.

```bash
xeepy schedule delete TWEET_ID
xeepy schedule delete --all
```

---

## Export Commands

### `export csv`

Export data to CSV.

```bash
xeepy export csv followers.json followers.csv
xeepy export csv --fields username,followers_count,bio
```

### `export json`

Export to JSON.

```bash
xeepy export json followers.csv followers.json
```

### `export excel`

Export to Excel.

```bash
xeepy export excel data.json report.xlsx
xeepy export excel --sheets followers,following
```

---

## Utility Commands

### `trends`

Get trending topics.

```bash
xeepy trends
xeepy trends --location "United States"
xeepy trends --json
```

### `rate-limits`

Check rate limit status.

```bash
xeepy rate-limits
```

### `config`

Manage configuration.

```bash
# Show current config
xeepy config show

# Set value
xeepy config set default_limit 100

# Edit in editor
xeepy config edit
```

### `version`

Show version information.

```bash
xeepy version
xeepy version --check-update
```

---

## Environment Variables

```bash
# Authentication
export XEEPY_SESSION_PATH=~/.xeepy/session.json

# Defaults
export XEEPY_DEFAULT_LIMIT=100
export XEEPY_RATE_LIMIT_DELAY=2

# Notifications
export XEEPY_DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
export XEEPY_TELEGRAM_BOT_TOKEN=123456:ABC...
export XEEPY_TELEGRAM_CHAT_ID=123456789

# AI Providers
export XEEPY_OPENAI_API_KEY=sk-...
export XEEPY_ANTHROPIC_API_KEY=sk-ant-...
```

---

## Examples

### Daily Workflow

```bash
# Morning check
xeepy monitor unfollowers --notify discord
xeepy monitor growth

# Engagement session
xeepy engage auto-like --keywords "python" --limit 30
xeepy follow by-keyword "developer" --limit 20

# Evening cleanup
xeepy unfollow non-followers --limit 50 --skip-verified
```

### Research Session

```bash
# Scrape competitor data
xeepy scrape followers competitor --limit 5000 -o comp_followers.csv
xeepy scrape tweets competitor --limit 500 -o comp_tweets.csv

# Analyze
xeepy scrape profile comp_followers.csv --output comp_profiles.csv
```

### Content Curation

```bash
# Find content to engage with
xeepy scrape search "AI tools" --min-likes 1000 -o viral_ai.csv

# Scrape threads for inspiration
xeepy scrape thread https://x.com/user/status/123 -o thread.md
```

## Shell Completions

```bash
# Bash
xeepy --install-completion bash

# Zsh
xeepy --install-completion zsh

# Fish
xeepy --install-completion fish
```

# 🖥️ CLI Reference

Complete command-line interface documentation for Xeepy.

---

## Installation

```bash
pip install xeepy
```

After installation, the `xeepy` command is available globally.

---

## Global Options

```bash
xeepy [OPTIONS] COMMAND [ARGS]

Options:
  -c, --config PATH    Config file path (default: ~/.xeepy/config.yaml)
  -v, --verbose        Enable verbose output
  --headless/--no-headless  Run browser headless (default: headless)
  --version            Show version
  --help               Show help
```

---

## Authentication Commands

### `xeepy auth login`

Setup authentication with your X/Twitter session.

```bash
xeepy auth login [OPTIONS]

Options:
  --token TEXT    Your auth_token cookie value
  --interactive   Interactive setup wizard
```

**Examples:**

```bash
# Interactive login
xeepy auth login --interactive

# Direct token
xeepy auth login --token "your_auth_token_here"
```

### `xeepy auth logout`

Remove saved authentication.

```bash
xeepy auth logout
```

### `xeepy auth status`

Check authentication status.

```bash
xeepy auth status

# Output:
# ✅ Authenticated as @your_username
# Session expires: 2026-03-15
```

---

## Scraping Commands

### `xeepy scrape replies`

Scrape replies to a tweet.

```bash
xeepy scrape replies URL [OPTIONS]

Arguments:
  URL    Tweet URL

Options:
  -l, --limit INT      Max replies (default: 100)
  -o, --output PATH    Output file (.json or .csv)
  --format TEXT        Output format: json, csv (default: json)
```

**Examples:**

```bash
# Basic
xeepy scrape replies https://x.com/user/status/123

# With options
xeepy scrape replies https://x.com/user/status/123 -l 200 -o replies.csv

# JSON output
xeepy scrape replies https://x.com/user/status/123 --format json -o replies.json
```

### `xeepy scrape profile`

Scrape user profile information.

```bash
xeepy scrape profile USERNAME [OPTIONS]

Arguments:
  USERNAME    X/Twitter username (without @)

Options:
  -o, --output PATH    Output file
```

**Examples:**

```bash
xeepy scrape profile elonmusk
xeepy scrape profile python -o python_profile.json
```

### `xeepy scrape followers`

Scrape a user's followers.

```bash
xeepy scrape followers USERNAME [OPTIONS]

Arguments:
  USERNAME    X/Twitter username

Options:
  -l, --limit INT      Max followers (default: 100)
  -o, --output PATH    Output file
  --format TEXT        json or csv
```

**Examples:**

```bash
xeepy scrape followers python -l 500 -o followers.csv
```

### `xeepy scrape following`

Scrape who a user follows.

```bash
xeepy scrape following USERNAME [OPTIONS]

Arguments:
  USERNAME    X/Twitter username

Options:
  -l, --limit INT      Max accounts (default: 100)
  -o, --output PATH    Output file
```

### `xeepy scrape tweets`

Scrape a user's tweets.

```bash
xeepy scrape tweets USERNAME [OPTIONS]

Arguments:
  USERNAME    X/Twitter username

Options:
  -l, --limit INT          Max tweets (default: 100)
  -o, --output PATH        Output file
  --include-replies        Include replies
  --include-retweets       Include retweets
```

**Examples:**

```bash
xeepy scrape tweets python -l 200 -o tweets.json
xeepy scrape tweets python --include-replies
```

### `xeepy scrape search`

Search for tweets.

```bash
xeepy scrape search QUERY [OPTIONS]

Arguments:
  QUERY    Search query

Options:
  -l, --limit INT      Max results (default: 50)
  -o, --output PATH    Output file
  --filter TEXT        top, latest, people, media (default: latest)
```

**Examples:**

```bash
xeepy scrape search "Python tutorial" -l 100 --filter latest
xeepy scrape search "from:python min_faves:100" -o popular.json
```

### `xeepy scrape hashtag`

Scrape tweets with a hashtag.

```bash
xeepy scrape hashtag TAG [OPTIONS]

Arguments:
  TAG    Hashtag (without #)

Options:
  -l, --limit INT      Max tweets (default: 100)
  -o, --output PATH    Output file
  --filter TEXT        top or latest
```

**Examples:**

```bash
xeepy scrape hashtag Python -l 200 -o python_hashtag.csv
```

### `xeepy scrape thread`

Unroll and scrape a thread.

```bash
xeepy scrape thread URL [OPTIONS]

Arguments:
  URL    Thread URL (first tweet)

Options:
  -o, --output PATH    Output file
```

### `xeepy scrape media`

Scrape a user's media posts.

```bash
xeepy scrape media USERNAME [OPTIONS]

Arguments:
  USERNAME    X/Twitter username

Options:
  -l, --limit INT      Max media (default: 50)
  -o, --output PATH    Output file
  --download           Download media files
```

### `xeepy scrape likes`

Scrape who liked a tweet.

```bash
xeepy scrape likes URL [OPTIONS]

Arguments:
  URL    Tweet URL

Options:
  -l, --limit INT      Max likers (default: 100)
  -o, --output PATH    Output file
```

---

## Unfollow Commands

### `xeepy unfollow non-followers`

Unfollow users who don't follow you back.

```bash
xeepy unfollow non-followers [OPTIONS]

Options:
  -m, --max INT            Max unfollows (default: 100)
  -w, --whitelist TEXT     Users to never unfollow (can repeat)
  --min-followers INT      Keep if they have >= this many followers
  --dry-run                Preview without unfollowing
  -o, --output PATH        Export unfollowed list
```

**Examples:**

```bash
# Dry run first!
xeepy unfollow non-followers --dry-run

# With whitelist
xeepy unfollow non-followers --max 50 -w friend1 -w friend2

# Keep accounts with 10k+ followers
xeepy unfollow non-followers --min-followers 10000

# Export list
xeepy unfollow non-followers -o unfollowed.txt
```

### `xeepy unfollow everyone`

⚠️ Unfollow ALL accounts.

```bash
xeepy unfollow everyone [OPTIONS]

Options:
  -m, --max INT        Max unfollows (default: 500)
  --dry-run            Preview without unfollowing
  --export-first       Export following list before (recommended!)
  --confirm            Skip confirmation prompt
```

**Examples:**

```bash
# Always dry run first!
xeepy unfollow everyone --dry-run

# With backup
xeepy unfollow everyone --export-first -o following_backup.json
```

### `xeepy unfollow smart`

Smart time-based unfollow.

```bash
xeepy unfollow smart [OPTIONS]

Options:
  --days INT           Days to wait for follow-back (default: 3)
  -m, --max INT        Max unfollows (default: 50)
  --dry-run            Preview only
```

**Examples:**

```bash
xeepy unfollow smart --days 5 --max 25
```

---

## Follow Commands

### `xeepy follow user`

Follow a specific user.

```bash
xeepy follow user USERNAME
```

### `xeepy follow by-keyword`

Follow users tweeting about keywords.

```bash
xeepy follow by-keyword KEYWORDS... [OPTIONS]

Arguments:
  KEYWORDS    Keywords to search (space-separated)

Options:
  -m, --max INT            Max follows (default: 50)
  --min-followers INT      Min followers filter (default: 100)
  --max-followers INT      Max followers filter (default: 100000)
```

**Examples:**

```bash
xeepy follow by-keyword Python "machine learning" -m 25
xeepy follow by-keyword coding --min-followers 500
```

### `xeepy follow by-hashtag`

Follow users using specific hashtags.

```bash
xeepy follow by-hashtag HASHTAGS... [OPTIONS]

Arguments:
  HASHTAGS    Hashtags (without #)

Options:
  -m, --max INT    Max follows (default: 50)
```

### `xeepy follow followers-of`

Follow followers of a target account.

```bash
xeepy follow followers-of USERNAME [OPTIONS]

Arguments:
  USERNAME    Target account

Options:
  -m, --max INT    Max follows (default: 50)
  --mode TEXT      followers or following (default: followers)
```

**Examples:**

```bash
xeepy follow followers-of python -m 30
xeepy follow followers-of competitor --mode following
```

### `xeepy follow engagers`

Follow users who engaged with specific tweets.

```bash
xeepy follow engagers URLS... [OPTIONS]

Arguments:
  URLS    Tweet URLs

Options:
  -m, --max INT       Max follows (default: 50)
  --type TEXT         likers, retweeters, commenters, all (default: likers)
```

---

## Engagement Commands

### `xeepy engage like`

Like a specific tweet.

```bash
xeepy engage like URL
```

### `xeepy engage auto-like`

Auto-like tweets by criteria.

```bash
xeepy engage auto-like [OPTIONS]

Options:
  -k, --keyword TEXT      Keywords to match (can repeat)
  -h, --hashtag TEXT      Hashtags to match (can repeat)
  -m, --max INT           Max likes (default: 50)
  -d, --duration INT      Duration in minutes (default: 30)
```

**Examples:**

```bash
xeepy engage auto-like -k Python -k coding -m 25
xeepy engage auto-like -h 100DaysOfCode --duration 15
```

### `xeepy engage comment`

Post a comment on a tweet.

```bash
xeepy engage comment URL TEXT
```

### `xeepy engage bookmark`

Bookmark a tweet.

```bash
xeepy engage bookmark URL
```

### `xeepy engage export-bookmarks`

Export all bookmarks.

```bash
xeepy engage export-bookmarks [OPTIONS]

Options:
  -o, --output PATH    Output file (default: bookmarks.json)
  --format TEXT        json or csv
```

---

## Monitoring Commands

### `xeepy monitor unfollowers`

Detect who unfollowed you.

```bash
xeepy monitor unfollowers [OPTIONS]

Options:
  --notify             Send notification
  -o, --output PATH    Export report
```

**Examples:**

```bash
xeepy monitor unfollowers
xeepy monitor unfollowers --notify -o report.json
```

### `xeepy monitor account`

Monitor changes to an account.

```bash
xeepy monitor account USERNAME [OPTIONS]

Arguments:
  USERNAME    Account to monitor

Options:
  --since INT    Hours to look back (default: 24)
```

### `xeepy monitor keywords`

Monitor X for keywords in real-time.

```bash
xeepy monitor keywords KEYWORDS... [OPTIONS]

Arguments:
  KEYWORDS    Keywords to monitor

Options:
  --interval INT    Check interval in seconds (default: 60)
  --notify          Send notifications on match
```

---

## Analytics Commands

### `xeepy analytics growth`

Show growth statistics.

```bash
xeepy analytics growth [OPTIONS]

Options:
  --days INT    Days of history (default: 30)
```

### `xeepy analytics engagement`

Analyze engagement on your tweets.

```bash
xeepy analytics engagement [OPTIONS]

Options:
  --limit INT    Tweets to analyze (default: 100)
```

### `xeepy analytics best-time`

Find optimal posting times.

```bash
xeepy analytics best-time [OPTIONS]

Options:
  --limit INT    Tweets to analyze (default: 200)
```

---

## AI Commands

### `xeepy ai reply`

Generate an AI reply.

```bash
xeepy ai reply TEXT [OPTIONS]

Arguments:
  TEXT    Tweet text to reply to

Options:
  --style TEXT      Reply style (default: helpful)
  --provider TEXT   openai, anthropic, ollama
```

**Examples:**

```bash
xeepy ai reply "Just launched my startup!" --style supportive
xeepy ai reply "Python vs JavaScript?" --style witty
```

### `xeepy ai sentiment`

Analyze sentiment of text.

```bash
xeepy ai sentiment TEXT
```

### `xeepy ai detect-bot`

Analyze if an account is a bot.

```bash
xeepy ai detect-bot USERNAME
```

---

## Configuration Commands

### `xeepy config show`

Show current configuration.

```bash
xeepy config show
```

### `xeepy config set`

Set a configuration value.

```bash
xeepy config set KEY VALUE
```

**Examples:**

```bash
xeepy config set headless true
xeepy config set rate_limit.delay 5
```

---

## Output Formats

All scraping commands support these output formats:

| Format | Extension | Description |
|--------|-----------|-------------|
| JSON | `.json` | Structured data |
| CSV | `.csv` | Spreadsheet compatible |

**Auto-detection:** Output format is detected from file extension.

```bash
xeepy scrape followers python -o followers.json  # JSON
xeepy scrape followers python -o followers.csv   # CSV
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Authentication error |
| 3 | Rate limit error |
| 4 | Not found error |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `XEEPY_AUTH_TOKEN` | X/Twitter auth token |
| `XEEPY_CONFIG` | Config file path |
| `OPENAI_API_KEY` | OpenAI API key for AI features |
| `ANTHROPIC_API_KEY` | Anthropic API key |

---

## Cron Examples

```bash
# Daily unfollower check at 9 AM
0 9 * * * xeepy monitor unfollowers --notify

# Weekly cleanup on Sundays
0 20 * * 0 xeepy unfollow non-followers --max 50

# Hourly engagement
0 * * * * xeepy engage auto-like -k Python --max 10 --duration 5
```

---

<p align="center">
  <strong>Need help? Run `xeepy --help`</strong>
</p>

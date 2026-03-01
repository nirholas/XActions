# Xeepy CLI Reference

Complete reference for all Xeepy CLI commands.

## Global Options

```bash
xeepy [OPTIONS] COMMAND [ARGS]...

Options:
  -c, --config PATH   Path to configuration file (default: config.yaml)
  -v, --verbose       Enable verbose output
  -q, --quiet         Suppress non-essential output
  --version           Show version and exit
  --help              Show help and exit
```

## Commands Overview

| Command | Description |
|---------|-------------|
| `scrape` | Scraping operations (profiles, followers, tweets) |
| `follow` | Follow operations |
| `unfollow` | Unfollow operations |
| `engage` | Engagement automation (likes, comments, retweets) |
| `monitor` | Monitoring and analytics |
| `ai` | AI-powered features |
| `status` | Show current status |
| `init` | Initialize configuration |

---

## Scrape Commands

### `scrape profile`

Scrape a user's profile information.

```bash
xeepy scrape profile USERNAME [OPTIONS]

Arguments:
  USERNAME    Twitter username (without @)

Options:
  -o, --output PATH   Output file path
  -f, --format TEXT   Output format (json, csv, txt)
```

**Example:**
```bash
xeepy scrape profile elonmusk -o elon.json
```

### `scrape followers`

Scrape followers of a user.

```bash
xeepy scrape followers USERNAME [OPTIONS]

Options:
  -o, --output PATH   Output file path
  -f, --format TEXT   Output format
  -l, --limit INT     Maximum number of results (default: 100)
  --cursor TEXT       Pagination cursor for resuming
```

### `scrape following`

Scrape accounts a user is following.

```bash
xeepy scrape following USERNAME [OPTIONS]

Options:
  -o, --output PATH   Output file path
  -f, --format TEXT   Output format
  -l, --limit INT     Maximum number of results
```

### `scrape tweets`

Scrape tweets from a user's timeline.

```bash
xeepy scrape tweets USERNAME [OPTIONS]

Options:
  -o, --output PATH      Output file path
  -f, --format TEXT      Output format
  -l, --limit INT        Maximum number of tweets
  --include-replies      Include replies
  --include-retweets     Include retweets
```

### `scrape replies`

Scrape replies to a specific tweet.

```bash
xeepy scrape replies TWEET_URL [OPTIONS]

Arguments:
  TWEET_URL    URL of the tweet

Options:
  -o, --output PATH   Output file path
  -l, --limit INT     Maximum replies to fetch
```

### `scrape thread`

Scrape an entire thread.

```bash
xeepy scrape thread TWEET_URL [OPTIONS]

Arguments:
  TWEET_URL    URL of any tweet in the thread
```

### `scrape hashtag`

Scrape tweets with a hashtag.

```bash
xeepy scrape hashtag HASHTAG [OPTIONS]

Options:
  -l, --limit INT    Maximum tweets
  --recent           Get recent tweets (vs top)
```

### `scrape search`

Search for tweets or users.

```bash
xeepy scrape search QUERY [OPTIONS]

Options:
  --type TEXT    Search type: tweets, users, or both
  -l, --limit INT    Maximum results
```

---

## Follow Commands

### `follow user`

Follow a specific user.

```bash
xeepy follow user USERNAME [OPTIONS]

Options:
  --dry-run    Preview without making changes
```

### `follow by-keyword`

Follow users who tweet about keywords.

```bash
xeepy follow by-keyword KEYWORDS... [OPTIONS]

Arguments:
  KEYWORDS    One or more keywords to search for

Options:
  -m, --max INT           Maximum users to follow (default: 50)
  --min-followers INT     Minimum follower count (default: 100)
  --max-followers INT     Maximum follower count (default: 100000)
  --verified-only         Only follow verified accounts
  --dry-run               Preview without following
  -o, --output PATH       Export followed users
```

**Example:**
```bash
xeepy follow by-keyword "AI" "machine learning" --max 50 --min-followers 500
```

### `follow by-hashtag`

Follow users who tweet with a hashtag.

```bash
xeepy follow by-hashtag HASHTAG [OPTIONS]

Options:
  -m, --max INT          Maximum users to follow
  --min-followers INT    Minimum follower count
  --dry-run              Preview only
```

### `follow followers-of`

Follow the followers of a target account.

```bash
xeepy follow followers-of USERNAME [OPTIONS]

Options:
  -m, --max INT          Maximum users to follow (default: 100)
  --min-followers INT    Minimum follower count for targets
  --skip-private         Skip private accounts
  --dry-run              Preview only
```

### `follow engagers`

Follow users who engaged with a tweet.

```bash
xeepy follow engagers TWEET_URL [OPTIONS]

Options:
  -m, --max INT     Maximum users to follow
  --likers          Follow users who liked (default: true)
  --retweeters      Follow users who retweeted
  --commenters      Follow users who commented
  --dry-run         Preview only
```

### `follow auto`

Automatically follow users in a niche.

```bash
xeepy follow auto [OPTIONS]

Options:
  -n, --niche TEXT       Target niche/topic (required)
  -m, --max INT          Maximum users to follow (default: 50)
  -d, --duration INT     Duration in minutes (default: 30)
  --interval INT         Seconds between follows (default: 60)
  --dry-run              Preview only
```

---

## Unfollow Commands

### `unfollow user`

Unfollow a specific user.

```bash
xeepy unfollow user USERNAME [OPTIONS]

Options:
  --dry-run    Preview without unfollowing
```

### `unfollow non-followers`

Unfollow users who don't follow you back.

```bash
xeepy unfollow non-followers [OPTIONS]

Options:
  -m, --max INT              Maximum to unfollow (default: 100)
  -w, --whitelist TEXT       Usernames to never unfollow (multiple)
  --whitelist-file PATH      File with whitelist usernames
  --min-days INT             Minimum days since following (default: 7)
  --dry-run                  Preview only
  -o, --output PATH          Export unfollowed users
```

**Example:**
```bash
xeepy unfollow non-followers --whitelist friend1 --whitelist friend2 --dry-run
```

### `unfollow all`

Unfollow everyone (except whitelist).

```bash
xeepy unfollow all [OPTIONS]

Options:
  -w, --whitelist TEXT    Usernames to keep
  --confirm               Skip confirmation prompt
  --dry-run               Preview only
```

⚠️ **Warning:** This is a destructive operation!

### `unfollow inactive`

Unfollow users who haven't been active.

```bash
xeepy unfollow inactive [OPTIONS]

Options:
  -d, --days INT         Days since last activity (default: 90)
  -m, --max INT          Maximum to unfollow
  -w, --whitelist TEXT   Protected usernames
  --dry-run              Preview only
```

### `unfollow by-criteria`

Unfollow users matching criteria.

```bash
xeepy unfollow by-criteria [OPTIONS]

Options:
  --min-followers INT    Unfollow if fewer followers
  --max-followers INT    Unfollow if more followers
  --min-ratio FLOAT      Unfollow if following/followers ratio above
  --no-bio               Unfollow users without bio
  --no-avatar            Unfollow users with default avatar
  -m, --max INT          Maximum to unfollow
  --dry-run              Preview only
```

### `unfollow smart`

Intelligently unfollow to optimize your account.

```bash
xeepy unfollow smart [OPTIONS]

Options:
  --preserve-engagement     Keep users you've engaged with (default: true)
  --preserve-recent INT     Days to preserve recent follows (default: 30)
  --target-ratio FLOAT      Target followers/following ratio
  -m, --max INT             Maximum to unfollow (default: 50)
  --dry-run                 Preview only
```

---

## Engage Commands

### `engage like`

Like a specific tweet.

```bash
xeepy engage like TWEET_URL [OPTIONS]
```

### `engage unlike`

Unlike a tweet.

```bash
xeepy engage unlike TWEET_URL
```

### `engage auto-like`

Auto-like tweets matching keywords.

```bash
xeepy engage auto-like KEYWORDS... [OPTIONS]

Options:
  -m, --max INT           Maximum tweets to like (default: 50)
  -d, --duration INT      Duration in minutes (default: 30)
  --min-likes INT         Minimum likes on tweet
  --max-likes INT         Maximum likes (avoid viral)
  --verified-only         Only like verified users
  --dry-run               Preview only
```

### `engage comment`

Comment on a tweet.

```bash
xeepy engage comment TWEET_URL [OPTIONS]

Options:
  -t, --text TEXT      Comment text
  --ai                 Generate comment with AI
  -s, --style TEXT     AI style (helpful, witty, professional, etc.)
  --dry-run            Preview only
```

### `engage auto-comment`

Auto-comment on matching tweets.

```bash
xeepy engage auto-comment KEYWORDS... [OPTIONS]

Options:
  -m, --max INT          Maximum comments (default: 20)
  -s, --style TEXT       AI comment style (default: helpful)
  --templates PATH       Custom templates file
  -d, --duration INT     Duration in minutes
  --dry-run              Preview only
```

### `engage retweet`

Retweet or quote tweet.

```bash
xeepy engage retweet TWEET_URL [OPTIONS]

Options:
  -q, --quote TEXT    Add quote text
  --ai-quote          Generate quote with AI
  --dry-run           Preview only
```

### `engage auto-engage`

Engage with a user's recent tweets.

```bash
xeepy engage auto-engage USERNAME [OPTIONS]

Options:
  --likes INT       Tweets to like (default: 5)
  --comments INT    Tweets to comment on (default: 2)
  --retweets INT    Tweets to retweet (default: 1)
  -s, --style TEXT  Comment style
  --dry-run         Preview only
```

---

## Monitor Commands

### `monitor unfollowers`

Detect who unfollowed you.

```bash
xeepy monitor unfollowers [OPTIONS]

Options:
  --notify              Send notifications
  --webhook TEXT        Webhook URL
  --compare TEXT        Compare with specific snapshot
  -o, --output PATH     Export report
```

### `monitor new-followers`

Monitor new followers.

```bash
xeepy monitor new-followers [OPTIONS]

Options:
  --notify              Send notifications
  --min-followers INT   Only alert for notable followers
```

### `monitor account`

Monitor a specific account.

```bash
xeepy monitor account USERNAME [OPTIONS]

Options:
  --track              Add to tracked accounts
  --interval INT       Check interval in minutes (default: 60)
  --changes            Show recent changes
```

### `monitor keywords`

Monitor keywords/topics.

```bash
xeepy monitor keywords KEYWORDS... [OPTIONS]

Options:
  --alert-threshold INT    Alert when mentions exceed (default: 10)
  --sentiment              Include sentiment analysis
  --notify                 Send notifications
```

### `monitor growth`

Analyze your account growth.

```bash
xeepy monitor growth [OPTIONS]

Options:
  -p, --period TEXT    Analysis period: 1d, 7d, 30d (default: 7d)
  -o, --output PATH    Export report
```

### `monitor mentions`

Monitor mentions in real-time.

```bash
xeepy monitor mentions [OPTIONS]

Options:
  --continuous        Run continuously
  --interval INT      Check interval in minutes (default: 5)
  --notify            Send notifications
```

---

## AI Commands

### `ai reply`

Generate an AI reply to a tweet.

```bash
xeepy ai reply TWEET_TEXT [OPTIONS]

Arguments:
  TWEET_TEXT    The tweet to reply to

Options:
  -s, --style TEXT      Reply style (default: helpful)
                        Choices: helpful, witty, professional, crypto, tech, casual
  -n, --num INT         Number of alternatives (default: 1)
  --max-length INT      Maximum reply length (default: 280)
  -o, --output PATH     Export generated replies
```

**Example:**
```bash
xeepy ai reply "Just launched my AI startup!" --style witty --num 3
```

### `ai generate`

Generate tweet content.

```bash
xeepy ai generate TOPIC [OPTIONS]

Options:
  -s, --style TEXT      Tweet style
  -h, --hashtags TEXT   Hashtags to include (multiple)
  --thread              Generate a thread
  -n, --num INT         Tweets for thread (default: 5)
```

**Example:**
```bash
xeepy ai generate "Python tips" --thread --num 7
```

### `ai sentiment`

Analyze sentiment of text.

```bash
xeepy ai sentiment TEXT [OPTIONS]

Options:
  --detailed    Include emotion breakdown
```

### `ai analyze-user`

Analyze a user for bot/spam likelihood.

```bash
xeepy ai analyze-user USERNAME [OPTIONS]

Options:
  --detailed    Include detailed analysis
```

### `ai improve`

Improve text for better engagement.

```bash
xeepy ai improve TEXT [OPTIONS]

Options:
  -g, --goal TEXT    Goal: engagement, clarity, professionalism, concise, viral
```

### `ai find-targets`

Find target accounts to engage with.

```bash
xeepy ai find-targets NICHE [OPTIONS]

Options:
  -g, --goal TEXT     Goal: growth, engagement, sales, network
  -l, --limit INT     Number of recommendations (default: 10)
```

### `ai crypto-sentiment`

Analyze sentiment for a crypto token.

```bash
xeepy ai crypto-sentiment TOKEN [OPTIONS]

Options:
  --detailed    Include detailed breakdown
```

**Example:**
```bash
xeepy ai crypto-sentiment BTC --detailed
```

---

## Utility Commands

### `status`

Show current status and configuration.

```bash
xeepy status
```

### `init`

Initialize Xeepy configuration.

```bash
xeepy init [OPTIONS]

Options:
  --provider TEXT    AI provider to use (default: openai)
```

---

## Output Formats

All scraping and export commands support multiple formats:

- **json** (default): JSON format, best for programmatic use
- **csv**: CSV format, good for spreadsheets
- **txt**: Plain text, human readable

```bash
# Export as JSON
xeepy scrape followers user -o followers.json -f json

# Export as CSV
xeepy scrape tweets user -o tweets.csv -f csv
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Configuration error |
| 4 | API error |
| 5 | Authentication error |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `XEEPY_CONFIG` | Config file path |
| `XEEPY_DEBUG` | Enable debug mode |

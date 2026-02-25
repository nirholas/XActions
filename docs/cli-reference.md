# XActions CLI Reference

> **The Complete X/Twitter Automation Toolkit**  
> Version 3.0.0 | Author: nich ([@nichxbt](https://x.com/nichxbt))

The XActions CLI provides powerful command-line tools for X/Twitter automation, scraping, and data extraction. No Twitter API required — saves you $100-$5,000+/month in API costs.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
  - [xactions login](#xactions-login)
  - [xactions logout](#xactions-logout)
- [Commands](#commands)
  - [xactions profile](#xactions-profile)
  - [xactions followers](#xactions-followers)
  - [xactions following](#xactions-following)
  - [xactions non-followers](#xactions-non-followers)
  - [xactions tweets](#xactions-tweets)
  - [xactions search](#xactions-search)
  - [xactions hashtag](#xactions-hashtag)
  - [xactions thread](#xactions-thread)
  - [xactions media](#xactions-media)
  - [xactions info](#xactions-info)
  - [xactions persona create](#xactions-persona-create)
  - [xactions persona list](#xactions-persona-list)
  - [xactions persona run](#xactions-persona-run)
  - [xactions persona status](#xactions-persona-status)
  - [xactions persona edit](#xactions-persona-edit)
  - [xactions persona delete](#xactions-persona-delete)
- [Output Formats](#output-formats)
- [Environment Variables](#environment-variables)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Installation

Install XActions globally using npm:

```bash
npm install -g xactions
```

Verify the installation:

```bash
xactions --version
# Output: 3.0.0

xactions --help
```

### Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- A valid X/Twitter account for authentication

---

## Quick Start

```bash
# 1. Install XActions
npm install -g xactions

# 2. Authenticate with your X account
xactions login

# 3. Scrape a profile
xactions profile elonmusk

# 4. Get followers and save to file
xactions followers elonmusk --limit 500 --output followers.json
```

---

## Authentication

XActions uses your X/Twitter session cookie for authentication. This approach bypasses API rate limits and doesn't require expensive API access.

### xactions login

Set up authentication with your X/Twitter session cookie.

**Syntax:**

```bash
xactions login
```

**Usage:**

```bash
$ xactions login

⚡ XActions Login Setup

To get your auth_token cookie:
1. Go to x.com and log in
2. Open DevTools (F12) → Application → Cookies
3. Find "auth_token" and copy its value

? Enter your auth_token cookie: ********

✓ Authentication saved!
```

**How to get your auth_token:**

1. Open [x.com](https://x.com) in your browser and log in
2. Press `F12` to open Developer Tools
3. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
4. Expand **Cookies** → click on `https://x.com`
5. Find the cookie named `auth_token`
6. Copy the **Value** (a long hexadecimal string)
7. Paste it when prompted by `xactions login`

> ⚠️ **Security Note**: Your auth_token is stored locally in `~/.xactions/config.json`. Never share this token with anyone.

---

### xactions logout

Remove saved authentication credentials.

**Syntax:**

```bash
xactions logout
```

**Example:**

```bash
$ xactions logout
✓ Logged out successfully
```

---

## Commands

### xactions profile

Fetch detailed profile information for any X/Twitter user.

**Syntax:**

```bash
xactions profile <username> [options]
```

**Arguments:**

| Argument   | Description                        | Required |
|------------|-------------------------------------|----------|
| `username` | X/Twitter username (without the @) | Yes      |

**Options:**

| Option         | Alias | Description          | Default |
|----------------|-------|----------------------|---------|
| `--json`       | `-j`  | Output as raw JSON   | false   |

**Examples:**

```bash
# Get profile with formatted output
xactions profile elonmusk

# Output:
# ⚡ @elonmusk
#
#   Name:      Elon Musk
#   Bio:       Mars & Cars, Chips & Dips
#   Location:  𝕏
#   Website:   x.com
#   Joined:    June 2009
#   Following: 800  Followers: 195.2M
#   ✓ Verified

# Get profile as JSON
xactions profile elonmusk --json

# Output:
# {
#   "username": "elonmusk",
#   "name": "Elon Musk",
#   "bio": "Mars & Cars, Chips & Dips",
#   "location": "𝕏",
#   "website": "x.com",
#   "joined": "June 2009",
#   "following": 800,
#   "followers": 195200000,
#   "verified": true
# }
```

---

### xactions followers

Scrape the followers list for any user.

**Syntax:**

```bash
xactions followers <username> [options]
```

**Arguments:**

| Argument   | Description                        | Required |
|------------|-------------------------------------|----------|
| `username` | X/Twitter username (without the @) | Yes      |

**Options:**

| Option          | Alias | Description                    | Default |
|-----------------|-------|--------------------------------|---------|
| `--limit <n>`   | `-l`  | Maximum followers to scrape    | 100     |
| `--output <file>` | `-o` | Output file (.json or .csv)  | stdout  |

**Examples:**

```bash
# Scrape 100 followers (default)
xactions followers nichxbt

# Scrape 500 followers and save to JSON
xactions followers nichxbt --limit 500 --output followers.json

# Scrape 1000 followers and save to CSV
xactions followers nichxbt -l 1000 -o followers.csv

# Pipe output to jq for processing
xactions followers nichxbt --limit 50 | jq '.[].username'
```

**Output Schema (JSON):**

```json
[
  {
    "username": "user1",
    "name": "User One",
    "bio": "Developer & Creator",
    "followers": 1500,
    "following": 200,
    "verified": false,
    "followsBack": true
  }
]
```

---

### xactions following

Scrape the accounts a user is following.

**Syntax:**

```bash
xactions following <username> [options]
```

**Arguments:**

| Argument   | Description                        | Required |
|------------|-------------------------------------|----------|
| `username` | X/Twitter username (without the @) | Yes      |

**Options:**

| Option          | Alias | Description                    | Default |
|-----------------|-------|--------------------------------|---------|
| `--limit <n>`   | `-l`  | Maximum accounts to scrape     | 100     |
| `--output <file>` | `-o` | Output file (.json or .csv)  | stdout  |

**Examples:**

```bash
# Scrape following list
xactions following nichxbt

# Scrape 200 accounts and save to JSON
xactions following nichxbt --limit 200 --output following.json

# Get following as CSV for spreadsheet analysis
xactions following nichxbt -l 500 -o following.csv
```

---

### xactions non-followers

Analyze follow relationships to find accounts that don't follow you back.

**Syntax:**

```bash
xactions non-followers <username> [options]
```

**Arguments:**

| Argument   | Description                        | Required |
|------------|-------------------------------------|----------|
| `username` | Your X/Twitter username            | Yes      |

**Options:**

| Option          | Alias | Description                    | Default |
|-----------------|-------|--------------------------------|---------|
| `--limit <n>`   | `-l`  | Maximum accounts to analyze    | 500     |
| `--output <file>` | `-o` | Output file for full list    | stdout  |

**Examples:**

```bash
# Analyze your follow relationships
xactions non-followers nichxbt

# Output:
# 📊 Follow Analysis
#
#   Total Following: 450
#   Mutuals:         320
#   Non-Followers:   130
#
# Non-followers:
#   @user1 - John Doe
#   @user2 - Jane Smith
#   @user3 - Bob Wilson
#   ... and 127 more

# Save full list of non-followers to file
xactions non-followers nichxbt --limit 1000 --output non-followers.json

# Analyze and export for batch unfollowing
xactions non-followers myaccount -l 2000 -o cleanup-list.json
```

---

### xactions tweets

Scrape tweets from a user's timeline.

**Syntax:**

```bash
xactions tweets <username> [options]
```

**Arguments:**

| Argument   | Description                        | Required |
|------------|-------------------------------------|----------|
| `username` | X/Twitter username (without the @) | Yes      |

**Options:**

| Option          | Alias | Description                    | Default |
|-----------------|-------|--------------------------------|---------|
| `--limit <n>`   | `-l`  | Maximum tweets to scrape       | 50      |
| `--replies`     | `-r`  | Include replies in results     | false   |
| `--output <file>` | `-o` | Output file (.json or .csv)  | stdout  |

**Examples:**

```bash
# Scrape recent tweets
xactions tweets elonmusk

# Scrape 200 tweets including replies
xactions tweets elonmusk --limit 200 --replies

# Save tweets to JSON file
xactions tweets elonmusk -l 100 -o elon-tweets.json

# Export to CSV for spreadsheet analysis
xactions tweets nichxbt --limit 500 --output tweets.csv
```

**Output Schema (JSON):**

```json
[
  {
    "id": "1234567890123456789",
    "text": "Just shipped a new feature! 🚀",
    "timestamp": "2025-12-15T10:30:00.000Z",
    "likes": 1500,
    "retweets": 200,
    "replies": 50,
    "views": 50000,
    "isReply": false,
    "isRetweet": false
  }
]
```

---

### xactions search

Search for tweets matching a query.

**Syntax:**

```bash
xactions search <query> [options]
```

**Arguments:**

| Argument | Description           | Required |
|----------|-----------------------|----------|
| `query`  | Search query string   | Yes      |

**Options:**

| Option           | Alias | Description                                      | Default  |
|------------------|-------|--------------------------------------------------|----------|
| `--limit <n>`    | `-l`  | Maximum results to return                        | 50       |
| `--filter <type>`| `-f`  | Filter type: `latest`, `top`, `people`, `photos`, `videos` | `latest` |
| `--output <file>`| `-o`  | Output file                                      | stdout   |

**Examples:**

```bash
# Search for tweets about Bitcoin
xactions search "bitcoin"

# Search with filter for top tweets
xactions search "AI agents" --filter top --limit 100

# Search for photos only
xactions search "sunset photography" -f photos -l 50 -o photos.json

# Search for people/accounts
xactions search "web3 developer" --filter people

# Complex query with quotes
xactions search '"machine learning" from:openai' --limit 200

# Save search results
xactions search "typescript tips" -o ts-tips.json
```

**Search Operators:**

| Operator            | Description                        | Example                          |
|---------------------|------------------------------------|----------------------------------|
| `from:username`     | Tweets from a specific user        | `from:nichxbt`                   |
| `to:username`       | Replies to a specific user         | `to:elonmusk`                    |
| `"exact phrase"`    | Match exact phrase                 | `"artificial intelligence"`      |
| `filter:links`      | Only tweets with links             | `web3 filter:links`              |
| `filter:images`     | Only tweets with images            | `sunset filter:images`           |
| `min_faves:n`       | Minimum likes                      | `javascript min_faves:100`       |
| `min_retweets:n`    | Minimum retweets                   | `breaking min_retweets:50`       |
| `since:YYYY-MM-DD`  | Tweets since date                  | `bitcoin since:2025-01-01`       |
| `until:YYYY-MM-DD`  | Tweets until date                  | `crypto until:2025-06-01`        |
| `-word`             | Exclude word                       | `crypto -scam`                   |
| `OR`                | Match either term                  | `bitcoin OR ethereum`            |

---

### xactions hashtag

Scrape tweets containing a specific hashtag.

**Syntax:**

```bash
xactions hashtag <tag> [options]
```

**Arguments:**

| Argument | Description                      | Required |
|----------|----------------------------------|----------|
| `tag`    | Hashtag to search (with or without #) | Yes |

**Options:**

| Option          | Alias | Description                    | Default |
|-----------------|-------|--------------------------------|---------|
| `--limit <n>`   | `-l`  | Maximum tweets to scrape       | 50      |
| `--output <file>` | `-o` | Output file                  | stdout  |

**Examples:**

```bash
# Scrape tweets with #buildinpublic
xactions hashtag buildinpublic

# With the # symbol (both work)
xactions hashtag "#100DaysOfCode"

# Scrape 200 tweets and save
xactions hashtag AI --limit 200 --output ai-tweets.json

# Track trending hashtag
xactions hashtag trending -l 500 -o trending.json
```

---

### xactions thread

Scrape an entire tweet thread/conversation.

**Syntax:**

```bash
xactions thread <url> [options]
```

**Arguments:**

| Argument | Description                            | Required |
|----------|----------------------------------------|----------|
| `url`    | URL of any tweet in the thread         | Yes      |

**Options:**

| Option          | Alias | Description                    | Default |
|-----------------|-------|--------------------------------|---------|
| `--output <file>` | `-o` | Output file                  | stdout  |

**Examples:**

```bash
# Scrape a thread (formatted output)
xactions thread https://x.com/nichxbt/status/1234567890123456789

# Output:
# 🧵 Thread:
#
# 1. First tweet in the thread explaining the concept...
#    Dec 15, 2025
#
# 2. Continuing with more details about implementation...
#    Dec 15, 2025
#
# 3. Final thoughts and call to action...
#    Dec 15, 2025

# Save thread to file
xactions thread https://x.com/user/status/123456789 -o thread.json
```

---

### xactions media

Scrape media (images, videos, GIFs) from a user's timeline.

**Syntax:**

```bash
xactions media <username> [options]
```

**Arguments:**

| Argument   | Description                        | Required |
|------------|-------------------------------------|----------|
| `username` | X/Twitter username (without the @) | Yes      |

**Options:**

| Option          | Alias | Description                    | Default |
|-----------------|-------|--------------------------------|---------|
| `--limit <n>`   | `-l`  | Maximum media items to scrape  | 50      |
| `--output <file>` | `-o` | Output file                  | stdout  |

**Examples:**

```bash
# Scrape media from a user
xactions media nichxbt

# Scrape 100 media items
xactions media photographer --limit 100 --output media.json

# Short form
xactions media artist -l 200 -o artist-media.json
```

**Output Schema (JSON):**

```json
[
  {
    "type": "image",
    "url": "https://pbs.twimg.com/media/...",
    "tweetId": "1234567890123456789",
    "tweetUrl": "https://x.com/user/status/1234567890123456789",
    "timestamp": "2025-12-15T10:30:00.000Z",
    "alt": "Image description"
  }
]
```

---

### xactions info

Display XActions information, version, and links.

**Syntax:**

```bash
xactions info
```

**Example:**

```bash
$ xactions info

⚡ XActions v3.0.0

The Complete X/Twitter Automation Toolkit

Features:
  • Scrape profiles, followers, following, tweets
  • Search tweets and hashtags
  • Extract threads, media, and more
  • Export to JSON or CSV
  • No Twitter API required (saves $100-$5000+/mo)

Author:
  nich (@nichxbt) - https://github.com/nirholas

Links:
  Website:  https://xactions.app
  GitHub:   https://github.com/nirholas/xactions
  Docs:     https://xactions.app/docs

Run "xactions --help" for all commands
```

---

### xactions persona create

Interactively create a new persona for the algorithm builder. Guides you through choosing a niche preset, engagement strategy, and activity pattern.

**Syntax:**

```bash
xactions persona create [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--name <name>` | Persona name (skips prompt) |
| `--preset <preset>` | Niche preset (skips prompt) |
| `--strategy <strategy>` | Engagement strategy (skips prompt) |
| `--activity <pattern>` | Activity pattern (skips prompt) |

**Available Presets:**

| Preset | Description |
|--------|-------------|
| `crypto-degen` | Crypto/DeFi/Web3 with degen slang |
| `tech-builder` | Indie hacker / building in public |
| `ai-researcher` | AI/ML papers and research |
| `growth-marketer` | Content strategy and audience growth |
| `finance-investor` | Markets, investing, economics |
| `creative-writer` | Writing craft and storytelling |
| `custom` | Define your own topics and tone |

**Available Strategies:**

| Strategy | Follows/day | Likes/day | Comments/day | Posts/day |
|----------|-------------|-----------|--------------|-----------|
| `aggressive` | 80 | 150 | 40 | 5 |
| `moderate` | 40 | 80 | 20 | 3 |
| `conservative` | 15 | 40 | 8 | 1 |
| `thoughtleader` | 20 | 60 | 30 | 4 |

**Available Activity Patterns:**

| Pattern | Description |
|---------|-------------|
| `night-owl` | Active late night, peak midnight–2am |
| `early-bird` | Active from 5am, peak morning |
| `nine-to-five` | Checks before/after work, active evenings |
| `always-on` | Active throughout the day |
| `weekend-warrior` | Light weekdays, heavy weekends |

**Examples:**

```bash
# Interactive creation
$ xactions persona create

# One-liner
$ xactions persona create --name "CryptoBot" --preset crypto-degen --strategy aggressive --activity night-owl

# Custom niche (interactive prompts for topics, search terms, etc.)
$ xactions persona create --preset custom
```

---

### xactions persona list

List all saved personas with their stats and last activity.

**Syntax:**

```bash
xactions persona list
```

**Example:**

```bash
$ xactions persona list

🤖 Saved Personas

  ● CryptoBot (persona_1234567890)
    Preset: crypto-degen | Strategy: aggressive
    Sessions: 42 | Follows: 320 | Likes: 1200 | Comments: 180
    Last active: 1/15/2025, 3:42:00 AM

  ○ AIResearcher (persona_0987654321)
    Preset: ai-researcher | Strategy: thoughtleader
    Sessions: 0 | Follows: 0 | Likes: 0 | Comments: 0
```

---

### xactions persona run

Start the 24/7 algorithm builder for a persona. Launches a Puppeteer browser, logs in, and runs automated sessions with sleep cycles.

**Syntax:**

```bash
xactions persona run <personaId> [options]
```

**Arguments:**

| Argument | Description | Required |
|----------|-------------|----------|
| `personaId` | The persona ID (shown in `persona list`) | Yes |

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `--headless` | Run browser in headless mode | `true` |
| `--no-headless` | Show the browser window | - |
| `--dry-run` | Preview actions without executing | `false` |
| `--sessions <n>` | Stop after N sessions (0 = infinite) | `0` |
| `--token <token>` | X auth token (overrides saved config) | - |

**Environment Variables:**

| Variable | Required | Description |
|----------|----------|-------------|
| `XACTIONS_SESSION_COOKIE` | Yes* | X auth token (alt: `--token` or `xactions login`) |
| `OPENROUTER_API_KEY` | Yes | OpenRouter key for LLM-generated comments/posts |

**Examples:**

```bash
# Start with saved auth
$ xactions persona run persona_1234567890

# With visible browser for debugging
$ xactions persona run persona_1234567890 --no-headless

# Dry run — preview without executing
$ xactions persona run persona_1234567890 --dry-run

# Run 5 sessions then stop
$ xactions persona run persona_1234567890 --sessions 5

# Explicit auth token
$ xactions persona run persona_1234567890 --token "abc123hex..."
```

---

### xactions persona status

Display detailed status, config, and lifetime stats for a persona.

**Syntax:**

```bash
xactions persona status <personaId>
```

**Example:**

```bash
$ xactions persona status persona_1234567890

🤖 CryptoBot — Status Report

Identity
  ID: persona_1234567890
  Preset: crypto-degen
  Created: 1/10/2025, 9:00:00 AM

Niche
  Topics: crypto, defi, web3, bitcoin, ethereum, solana, memecoins
  Search terms: 7
  Target accounts: 0xCygaar, blaboratory, DefiIgnas

Strategy
  Growth: aggressive
  Activity: night-owl
  Daily limits: 80 follows, 150 likes, 40 comments

Lifetime Stats
  Sessions: 42
  Follows: 320
  Likes: 1200
  Comments: 180
  Posts: 24
  Searches: 89
  Last active: 1/15/2025, 3:42:00 AM

Follow Graph
  Users followed: 280
  Current followers: 145
  Target: 10,000
```

---

### xactions persona edit

Modify an existing persona's config without recreating it.

**Syntax:**

```bash
xactions persona edit <personaId> [options]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--topics <topics>` | Set topics (comma-separated) |
| `--search-terms <terms>` | Set search terms (comma-separated) |
| `--target-accounts <accounts>` | Set target accounts (comma-separated, no @) |
| `--strategy <strategy>` | Set engagement strategy |
| `--activity <pattern>` | Set activity pattern |

**Examples:**

```bash
# Change topics
$ xactions persona edit persona_123 --topics "ai,llm,agents,agi"

# Switch to conservative strategy
$ xactions persona edit persona_123 --strategy conservative

# Update target accounts
$ xactions persona edit persona_123 --target-accounts "elonmusk,sama,karpathy"
```

---

### xactions persona delete

Permanently delete a saved persona and all its data.

**Syntax:**

```bash
xactions persona delete <personaId>
```

**Example:**

```bash
$ xactions persona delete persona_1234567890
? Delete persona persona_1234567890? This cannot be undone. (y/N) y
✅ Persona persona_1234567890 deleted
```

---

## Output Formats

XActions supports two output formats: **JSON** and **CSV**.

### JSON Output

JSON is the default format when using `--output` with a `.json` extension.

```bash
# Save as JSON
xactions followers nichxbt -o followers.json
```

**Features:**
- Preserves all data types (numbers, booleans, nested objects)
- Easy to process with `jq`, Node.js, Python, etc.
- Suitable for programmatic use

### CSV Output

Use `.csv` extension to export as comma-separated values.

```bash
# Save as CSV
xactions followers nichxbt -o followers.csv
```

**Features:**
- Opens directly in Excel, Google Sheets, Numbers
- Great for data analysis and reporting
- Flattens nested data structures

### Stdout Output

Without `--output`, data is printed to stdout as JSON.

```bash
# Print to terminal
xactions followers nichxbt

# Pipe to jq for processing
xactions followers nichxbt | jq '.[].username'

# Pipe to file
xactions followers nichxbt > followers.json

# Pipe to another command
xactions followers nichxbt | wc -l
```

---

## Environment Variables

XActions supports the following environment variables:

| Variable              | Description                                      | Default              |
|-----------------------|--------------------------------------------------|----------------------|
| `XACTIONS_AUTH_TOKEN` | X/Twitter auth_token cookie (alternative to login) | —                  |
| `XACTIONS_CONFIG_DIR` | Custom config directory path                     | `~/.xactions`        |
| `XACTIONS_HEADLESS`   | Run browser in headless mode                     | `true`               |
| `XACTIONS_TIMEOUT`    | Request timeout in milliseconds                  | `30000`              |
| `XACTIONS_PROXY`      | HTTP/SOCKS proxy URL                             | —                    |
| `DEBUG`               | Enable debug logging (`xactions:*`)              | —                    |

### Examples

```bash
# Use auth token from environment
export XACTIONS_AUTH_TOKEN="your_auth_token_here"
xactions followers nichxbt

# Use a proxy
export XACTIONS_PROXY="http://proxy.example.com:8080"
xactions profile elonmusk

# Enable debug mode
DEBUG=xactions:* xactions followers nichxbt

# Custom config directory
XACTIONS_CONFIG_DIR=/custom/path xactions login

# Inline environment variables
XACTIONS_HEADLESS=false xactions profile nichxbt
```

---

## Configuration

XActions stores configuration in `~/.xactions/config.json`.

### Config File Location

```
~/.xactions/
├── config.json      # Authentication and settings
├── personas/        # Saved persona configurations
│   ├── persona_123.json
│   └── persona_456.json
└── cache/           # Temporary cache (optional)
```

### Config File Structure

```json
{
  "authToken": "your_auth_token_here",
  "headless": true,
  "timeout": 30000,
  "proxy": null
}
```

### Manual Configuration

You can manually edit the config file:

```bash
# View current config
cat ~/.xactions/config.json

# Edit config
nano ~/.xactions/config.json
```

---

## Troubleshooting

### Common Issues

**1. "Authentication required" error**

```bash
# Solution: Run login command
xactions login
```

**2. "Timeout" errors**

```bash
# Increase timeout
XACTIONS_TIMEOUT=60000 xactions followers nichxbt
```

**3. "Browser not found" error**

XActions requires Chromium/Chrome. Install it:

```bash
# macOS
brew install --cask chromium

# Ubuntu/Debian
sudo apt install chromium-browser

# Or use Puppeteer's bundled Chromium
npm install puppeteer
```

**4. Rate limiting**

If you're being rate limited:
- Reduce the `--limit` value
- Add delays between commands
- Consider using a proxy

**5. "Page not loading" issues**

```bash
# Run with visible browser for debugging
XACTIONS_HEADLESS=false xactions profile nichxbt
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
DEBUG=xactions:* xactions followers nichxbt
```

### Getting Help

- **Documentation**: https://xactions.app/docs
- **GitHub Issues**: https://github.com/nirholas/xactions/issues
- **Twitter/X**: [@nichxbt](https://x.com/nichxbt)

---

## Command Reference Summary

| Command         | Description                          | Example                                    |
|-----------------|--------------------------------------|-------------------------------------------|
| `login`         | Set up authentication                | `xactions login`                          |
| `logout`        | Remove authentication                | `xactions logout`                         |
| `profile`       | Get user profile                     | `xactions profile elonmusk --json`        |
| `followers`     | Scrape followers                     | `xactions followers user -l 500 -o f.json`|
| `following`     | Scrape following                     | `xactions following user -l 500`          |
| `non-followers` | Find non-followers                   | `xactions non-followers myuser`           |
| `tweets`        | Scrape tweets                        | `xactions tweets user -l 100 --replies`   |
| `search`        | Search tweets                        | `xactions search "query" -f top`          |
| `hashtag`       | Scrape hashtag                       | `xactions hashtag AI -l 200`              |
| `thread`        | Scrape thread                        | `xactions thread <url>`                   |
| `media`         | Scrape media                         | `xactions media user -l 50`               |
| `info`          | Show info                            | `xactions info`                           |
| `persona create`| Create a new persona                 | `xactions persona create`                 |
| `persona list`  | List all personas                    | `xactions persona list`                   |
| `persona run`   | Start 24/7 algorithm builder         | `xactions persona run <id>`               |
| `persona status`| Show persona stats                   | `xactions persona status <id>`            |
| `persona edit`  | Modify persona config                | `xactions persona edit <id> --strategy aggressive` |
| `persona delete`| Delete a persona                     | `xactions persona delete <id>`            |

---

## License

MIT License - see [LICENSE](../LICENSE) for details.

---

<p align="center">
  <strong>⚡ XActions</strong><br>
  Built by <a href="https://x.com/nichxbt">nich (@nichxbt)</a><br>
  <a href="https://xactions.app">https://xactions.app</a>
</p>

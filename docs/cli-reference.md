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
- [Scraping Commands](#commands)
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
- [Persona Commands](#xactions-persona-create)
  - [xactions persona create](#xactions-persona-create)
  - [xactions persona list](#xactions-persona-list)
  - [xactions persona run](#xactions-persona-run)
  - [xactions persona status](#xactions-persona-status)
  - [xactions persona edit](#xactions-persona-edit)
  - [xactions persona delete](#xactions-persona-delete)
- [Agent Commands](#agent-commands)
- [Plugin Commands](#plugin-commands)
- [Stream Commands](#stream-commands)
- [Workflow Commands](#workflow-commands)
- [Graph Commands](#graph-commands)
- [Portability Commands](#portability-commands)
- [Cross-Platform Scraping](#cross-platform-scraping)
- [AI Writer Commands](#ai-writer-commands)
- [AI Content Optimizer](#ai-content-optimizer)
- [Analytics Commands](#analytics-commands)
- [CRM Commands](#crm-commands)
- [Scheduling Commands](#scheduling-commands)
- [RSS Monitor](#rss-monitor)
- [Notifications](#notification-commands)
- [Dataset Management](#dataset-management)
- [Team Management](#team-management)
- [Bulk Operations](#bulk-operations)
- [Import/Export Compatibility](#importexport-compatibility)
- [MCP Config](#mcp-config)
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

## Agent Commands

### xactions agent setup

Interactive 8-step setup wizard for first-time agent configuration.

```bash
xactions agent setup
```

Walks through niche selection, persona creation, LLM provider setup, timezone, intensity level, browser login, test run, and saves config to `data/agent-config.json`.

### xactions agent start

Start the autonomous thought leader agent.

```bash
xactions agent start [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <path>` | Path to agent config file | `data/agent-config.json` |

**Example:**

```bash
xactions agent start --config data/agent-config.json
```

### xactions agent test

Run the agent for 5 minutes in test mode.

```bash
xactions agent test [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <path>` | Path to agent config file | `data/agent-config.json` |

### xactions agent login

Open a visible browser for manual X.com login. Saves session cookies for headless runs.

```bash
xactions agent login
```

### xactions agent status

Show current agent status and today's action counts.

```bash
xactions agent status [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --config <path>` | Path to agent config file | `data/agent-config.json` |

**Example output:**

```
📊 Agent Status — Today
  Likes:      47 / 150
  Follows:    12 / 80
  Comments:   8  / 25
  Posts:       2  / 5
  LLM cost:   $0.34
```

### xactions agent report

Generate a growth report for the last N days.

```bash
xactions agent report [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --days <n>` | Number of days to report on | `7` |

---

## Plugin Commands

### xactions plugin install

Install a plugin from npm or a local path.

```bash
xactions plugin install <name>
```

**Example:**

```bash
$ xactions plugin install xactions-plugin-sentiment
✅ Installed xactions-plugin-sentiment@1.2.0
   Tools: 3 | Scrapers: 1 | Routes: 2 | Actions: 1
```

### xactions plugin remove

Remove an installed plugin.

```bash
xactions plugin remove <name>
```

### xactions plugin list

List all installed plugins with status.

```bash
$ xactions plugin list
 ✅ xactions-plugin-sentiment  v1.2.0  Sentiment analysis tools
 ⏸  xactions-plugin-analytics  v0.9.1  Advanced analytics (disabled)
```

### xactions plugin enable / disable

Enable or disable a plugin without removing it.

```bash
xactions plugin enable <name>
xactions plugin disable <name>
```

### xactions plugin discover

Scan `node_modules` for `xactions-plugin-*` packages.

```bash
xactions plugin discover
```

---

## Stream Commands

### xactions stream start

Start a real-time stream for an account.

```bash
xactions stream start <type> <username> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --interval <seconds>` | Poll interval | `60` |

**Types:** `tweet`, `follower`, `mention`

**Example:**

```bash
$ xactions stream start tweet nichxbt -i 30
🔴 Stream started: stream_abc123
   Type: tweet | User: nichxbt | Interval: 30s
```

### xactions stream stop

Stop an active stream.

```bash
xactions stream stop <streamId>
```

### xactions stream list

List all active streams and browser pool status.

```bash
$ xactions stream list
Active Streams:
  stream_abc123  tweet     nichxbt   ✅ running  polls:142  errors:0
  stream_def456  follower  nichxbt   ⏸  paused   polls:89   errors:1

Browser Pool: 2/5 active
```

### xactions stream history

Show recent events for a stream.

```bash
xactions stream history <streamId> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Number of events | `20` |
| `-t, --type <eventType>` | Filter by event type | all |

### xactions stream pause / resume

Pause or resume a stream without losing state.

```bash
xactions stream pause <streamId>
xactions stream resume <streamId>
```

### xactions stream status

Get detailed status of a specific stream.

```bash
xactions stream status <streamId>
```

### xactions stream stop-all

Stop all active streams.

```bash
xactions stream stop-all
```

---

## Workflow Commands

### xactions workflow create

Create a workflow from a JSON file or interactively.

```bash
xactions workflow create [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --file <path>` | Load workflow from JSON file | interactive |

**Interactive mode** prompts for: name, description, trigger type (manual/schedule/webhook), cron expression.

### xactions workflow run

Run a workflow by name or ID.

```bash
xactions workflow run <name> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--auth <token>` | Auth token for browser actions | from config |

### xactions workflow list

List all saved workflows.

```bash
$ xactions workflow list
 ✅ morning-engage  wf_001  schedule (0 9 * * *)  5 steps  Morning engagement routine
 ✅ weekly-report   wf_002  manual                 3 steps  Generate weekly analytics
```

### xactions workflow delete

Delete a workflow.

```bash
xactions workflow delete <id>
```

### xactions workflow actions

List all available workflow actions grouped by category.

```bash
xactions workflow actions
```

### xactions workflow runs

Show execution history for a workflow.

```bash
xactions workflow runs <workflowId> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Number of runs to show | `10` |

---

## Graph Commands

### xactions graph build

Build a social graph by crawling an account's network.

```bash
xactions graph build <username> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --depth <n>` | Crawl depth | `2` |
| `-n, --max-nodes <n>` | Maximum nodes to collect | `500` |
| `--auth <token>` | Auth token | from config |

**Example:**

```bash
$ xactions graph build nichxbt -d 2 -n 200
🕸️ Building graph for nichxbt...
   Depth: 2 | Max nodes: 200
   ████████████████████ 100%
✅ Graph saved: graph_abc123 (187 nodes, 2,341 edges)
```

### xactions graph analyze

Run cluster, influence, and bridge analysis on a graph.

```bash
xactions graph analyze <graphId>
```

**Output:** Clusters, top influencers, bridge accounts, orbit analysis.

### xactions graph recommend

Get follow/engage/unfollow recommendations from a graph.

```bash
xactions graph recommend <graphId>
```

**Output:** Suggested follows, engagement targets, watch list, safe-to-unfollow.

### xactions graph export

Export a graph for visualization.

```bash
xactions graph export <graphId> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --format <format>` | Output format: html, gexf, d3 | `html` |
| `-o, --output <path>` | Output file path | auto |

### xactions graph list

List all saved graphs.

```bash
xactions graph list
```

### xactions graph delete

Delete a saved graph.

```bash
xactions graph delete <graphId>
```

---

## Portability Commands

### xactions export

Export a full Twitter account (profile, tweets, followers, following, bookmarks).

```bash
xactions export <username> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --format <formats>` | Comma-separated: json,csv,xlsx,md,html | `json,csv,md,html` |
| `--only <phases>` | Limit to: profile,tweets,followers,following,bookmarks,likes | all |
| `-l, --limit <n>` | Items per phase | `500` |
| `-o, --output <dir>` | Output directory | `exports/<username>` |

**Example:**

```bash
xactions export nichxbt -f json,csv --only profile,tweets -l 1000
```

### xactions migrate

Migrate Twitter data to Bluesky or Mastodon.

```bash
xactions migrate <username> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--to <platform>` | Target: bluesky or mastodon | **required** |
| `--dry-run` | Preview without executing | `true` |
| `--execute` | Actually perform migration | `false` |
| `--export-dir <dir>` | Use existing export data | auto |
| `-l, --limit <n>` | Items to migrate | `50` |

### xactions diff

Compare two account exports and show changes.

```bash
xactions diff <dirA> <dirB> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <dir>` | Save diff report | stdout |

**Output:** Follower/following deltas, tweet count changes, engagement trends, profile diffs.

---

## Cross-Platform Scraping

### xactions scrape

Multi-platform scraping for Twitter, Bluesky, Mastodon, and Threads.

```bash
xactions scrape <action> [target] [options]
```

**Actions:** `profile`, `followers`, `following`, `tweets`, `search`, `hashtag`, `trending`

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --platform <platform>` | twitter, bluesky, mastodon, threads | `twitter` |
| `-u, --username <username>` | Target username | — |
| `-q, --query <query>` | Search query | — |
| `-l, --limit <n>` | Max items | `100` |
| `-i, --instance <url>` | Mastodon instance URL | — |
| `-o, --output <file>` | Output file | stdout |
| `-j, --json` | Force JSON output | `false` |

**Examples:**

```bash
xactions scrape profile -p bluesky -u nichxbt.bsky.social
xactions scrape followers -p mastodon -u user -i https://mastodon.social -l 500
xactions scrape trending -p twitter
```

### xactions platforms

List supported social media platforms.

```bash
xactions platforms
```

---

## AI Writer Commands

### xactions ai analyze

Analyze a user's writing voice from their tweets.

```bash
xactions ai analyze <username> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Tweets to analyze | `100` |
| `-o, --output <file>` | Save voice profile | — |
| `--json` | JSON output | `false` |

### xactions ai generate

Generate tweets or threads in a user's voice.

```bash
xactions ai generate <topic> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-v, --voice <username>` | Voice to mimic | **required** |
| `-c, --count <n>` | Number of variations | `3` |
| `-s, --style <style>` | casual, professional, provocative | — |
| `-t, --type <type>` | tweet or thread | `tweet` |
| `-m, --model <model>` | LLM model | auto |
| `-k, --api-key <key>` | OpenRouter API key | from env |

### xactions ai rewrite

Rewrite a tweet in a user's voice with a goal.

```bash
xactions ai rewrite <text> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-v, --voice <username>` | Voice to mimic | **required** |
| `-g, --goal <goal>` | more_engaging, shorter, more_professional, funnier | `more_engaging` |
| `-c, --count <n>` | Number of variations | `3` |

### xactions ai calendar

Generate a weekly content calendar.

```bash
xactions ai calendar <username> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --days <n>` | Days to plan | `7` |
| `-p, --posts-per-day <n>` | Posts per day | `3` |
| `-t, --topics <topics>` | Comma-separated topic list | auto |
| `-o, --output <file>` | Save calendar | — |

---

## AI Content Optimizer

### xactions optimize

AI-optimize a tweet for engagement.

```bash
xactions optimize <text> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--goal <goal>` | engagement, clarity, growth, viral | `engagement` |

### xactions hashtags

Suggest hashtags for tweet text.

```bash
xactions hashtags <text> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --count <n>` | Number of suggestions | `5` |

### xactions predict

Predict tweet performance (score, reach, strengths, weaknesses).

```bash
xactions predict <text>
```

### xactions variations

Generate tweet variations.

```bash
xactions variations <text> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-n, --count <n>` | Number of variations | `3` |

---

## Analytics Commands

### xactions sentiment

Analyze sentiment of text or tweet content.

```bash
xactions sentiment <text> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-m, --mode <mode>` | rules or llm | `rules` |
| `-o, --output <file>` | Save results | stdout |

### xactions monitor

Start monitoring sentiment for a username or keyword.

```bash
xactions monitor <target> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --type <type>` | mentions, keyword, replies | `mentions` |
| `-i, --interval <seconds>` | Check interval | `900` |
| `-m, --mode <mode>` | rules or llm | `rules` |
| `--threshold <n>` | Alert threshold | `-0.3` |
| `--webhook <url>` | Webhook for alerts | — |

### xactions report

Generate a reputation report for a monitored username.

```bash
xactions report <username> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --period <period>` | 24h, 7d, 30d, all | `7d` |
| `-f, --format <format>` | json or markdown | `markdown` |
| `-o, --output <file>` | Save report | stdout |

### xactions history

View account history over time.

```bash
xactions history <username> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-d, --days <n>` | Days of history | `30` |
| `-i, --interval <interval>` | hour, day, week | `day` |
| `-f, --format <format>` | json or csv | `json` |
| `--export <path>` | Export to file | — |

### xactions snapshot

Start auto-snapshotting an account (long-running).

```bash
xactions snapshot <username> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --interval <minutes>` | Snapshot interval | `60` |

### xactions audience

Analyze follower overlap between two accounts.

```bash
xactions audience <username1> <username2> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--max <n>` | Max followers to compare | `5000` |

### xactions evergreen

Find and recycle top-performing evergreen content.

```bash
xactions evergreen <username> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--min-likes <n>` | Minimum likes threshold | `50` |
| `--min-age <days>` | Minimum age in days | `30` |
| `--analyze` | Analyze only (don't queue) | `false` |

---

## CRM Commands

### xactions crm sync

Sync followers to the built-in CRM.

```bash
xactions crm sync <username>
```

### xactions crm tag

Tag a contact.

```bash
xactions crm tag <username> <tag>
```

### xactions crm search

Search contacts by query.

```bash
xactions crm search <query>
```

### xactions crm score

Auto-score all contacts based on engagement.

```bash
xactions crm score
```

### xactions crm segment

Get members of a segment.

```bash
xactions crm segment <name>
```

---

## Scheduling Commands

### xactions schedule add

Add a scheduled job.

```bash
xactions schedule add <name> <cron> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-c, --command <cmd>` | Command to execute | **required** |

**Example:**

```bash
xactions schedule add morning-scrape "0 9 * * *" -c "xactions followers nichxbt -l 100 -o daily.json"
```

### xactions schedule list

List all scheduled jobs.

```bash
$ xactions schedule list
 ✅ morning-scrape  0 9 * * *   Next: 2025-01-20 09:00
 ⏸  weekly-export   0 0 * * 1   Next: 2025-01-27 00:00 (disabled)
```

### xactions schedule remove

Remove a scheduled job.

```bash
xactions schedule remove <name>
```

### xactions schedule run

Run a job immediately (ignoring cron schedule).

```bash
xactions schedule run <name>
```

---

## RSS Monitor

### xactions rss add

Add an RSS feed for monitoring and auto-drafting.

```bash
xactions rss add <name> <url> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --template <template>` | Tweet template | `📰 {title}\n\n{link}` |

**Example:**

```bash
xactions rss add techcrunch https://techcrunch.com/feed/ -t "🔗 {title}\n{description}\n\n{link}"
```

### xactions rss list

List all monitored feeds.

```bash
xactions rss list
```

### xactions rss check

Check feeds for new items and create draft posts.

```bash
xactions rss check [name]    # Check specific feed or all feeds
```

### xactions rss drafts

View draft posts generated from RSS items.

```bash
xactions rss drafts
```

---

## Notification Commands

### xactions notify test

Send a test notification to a specific channel.

```bash
xactions notify test <channel>    # slack, discord, telegram, email
```

### xactions notify send

Send a notification to all configured channels.

```bash
xactions notify send <message> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --title <title>` | Notification title | `XActions Alert` |
| `-s, --severity <level>` | info, warning, critical | `info` |

### xactions notify configure

Interactive configuration for notification channels (Slack, Discord, Telegram, email).

```bash
xactions notify configure
```

---

## Dataset Management

### xactions dataset list

List all stored scraping datasets.

```bash
xactions dataset list
```

### xactions dataset export

Export a dataset to file.

```bash
xactions dataset export <name> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --format <format>` | json, csv, jsonl | `json` |
| `-o, --output <path>` | Output file | stdout |

### xactions dataset delete

Delete a stored dataset.

```bash
xactions dataset delete <name>
```

---

## Team Management

### xactions team create

Create a new team.

```bash
xactions team create <name> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-u, --owner <username>` | Team owner | current user |

### xactions team invite

Invite a user to a team.

```bash
xactions team invite <teamId> <email> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-r, --role <role>` | admin, member, viewer | `member` |

### xactions team members

List team members.

```bash
xactions team members <teamId>
```

### xactions team activity

View team activity log.

```bash
xactions team activity <teamId> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-l, --limit <n>` | Number of entries | `20` |

---

## Bulk Operations

Run actions in bulk from a CSV, JSON, or TXT file.

```bash
xactions bulk <action> <file> [options]
```

**Actions:** `follow`, `unfollow`, `block`, `mute`, `scrape`

| Option | Description | Default |
|--------|-------------|---------|
| `--delay <ms>` | Delay between actions | `2000` |
| `--dry-run` | Preview without executing | `false` |
| `--resume` | Resume from last position | `false` |

**Example:**

```bash
xactions bulk follow targets.csv --delay 3000
xactions bulk scrape usernames.txt -o results.json
```

---

## Import/Export Compatibility

### xactions import

Import data from Apify, Phantombuster, or CSV.

```bash
xactions import <file> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--from <source>` | apify, phantombuster, auto | `auto` |
| `-o, --output <path>` | Output file | — |

### xactions export-data

Export data in external tool format.

```bash
xactions export-data <file> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--to <target>` | apify, phantombuster, socialblade, csv | `csv` |
| `--type <type>` | profile, tweet, followers | `profile` |
| `-o, --output <path>` | Output file | — |

### xactions convert

Convert between data formats.

```bash
xactions convert <file> [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `--from <source>` | Source format | `apify` |
| `--to <target>` | Target format | `csv` |
| `-o, --output <path>` | Output file | — |

---

## MCP Config

Generate MCP server configuration for AI tools.

```bash
xactions mcp-config [options]
```

| Option | Description | Default |
|--------|-------------|---------|
| `-w, --write` | Write to config file | `false` |
| `-c, --client <client>` | claude, cursor, windsurf, vscode | `claude` |

**Example:**

```bash
# Generate config for Claude Desktop
xactions mcp-config -c claude

# Write directly to Claude config file
xactions mcp-config -c claude --write
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

| Command | Description | Example |
|---------|-------------|---------|
| `login` | Set up authentication | `xactions login` |
| `logout` | Remove authentication | `xactions logout` |
| `profile` | Get user profile | `xactions profile elonmusk --json` |
| `followers` | Scrape followers | `xactions followers user -l 500 -o f.json` |
| `following` | Scrape following | `xactions following user -l 500` |
| `non-followers` | Find non-followers | `xactions non-followers myuser` |
| `tweets` | Scrape tweets | `xactions tweets user -l 100 --replies` |
| `search` | Search tweets | `xactions search "query" -f top` |
| `hashtag` | Scrape hashtag | `xactions hashtag AI -l 200` |
| `thread` | Scrape thread | `xactions thread <url>` |
| `media` | Scrape media | `xactions media user -l 50` |
| `info` | Show info | `xactions info` |
| `persona create` | Create a persona | `xactions persona create` |
| `persona list` | List personas | `xactions persona list` |
| `persona run` | Start algorithm builder | `xactions persona run <id>` |
| `persona status` | Show persona stats | `xactions persona status <id>` |
| `persona edit` | Modify persona | `xactions persona edit <id> --strategy aggressive` |
| `persona delete` | Delete a persona | `xactions persona delete <id>` |
| `agent setup` | Agent setup wizard | `xactions agent setup` |
| `agent start` | Start thought leader agent | `xactions agent start` |
| `agent test` | 5-minute test run | `xactions agent test` |
| `agent login` | Manual browser login | `xactions agent login` |
| `agent status` | Today's agent metrics | `xactions agent status` |
| `agent report` | Growth report | `xactions agent report -d 30` |
| `plugin install` | Install plugin | `xactions plugin install xactions-plugin-*` |
| `plugin remove` | Remove plugin | `xactions plugin remove <name>` |
| `plugin list` | List plugins | `xactions plugin list` |
| `plugin enable` | Enable plugin | `xactions plugin enable <name>` |
| `plugin disable` | Disable plugin | `xactions plugin disable <name>` |
| `plugin discover` | Discover plugins | `xactions plugin discover` |
| `stream start` | Start real-time stream | `xactions stream start tweet nichxbt -i 30` |
| `stream stop` | Stop stream | `xactions stream stop <id>` |
| `stream list` | List streams | `xactions stream list` |
| `stream history` | Stream event history | `xactions stream history <id> -l 50` |
| `stream pause` | Pause stream | `xactions stream pause <id>` |
| `stream resume` | Resume stream | `xactions stream resume <id>` |
| `stream status` | Stream details | `xactions stream status <id>` |
| `stream stop-all` | Stop all streams | `xactions stream stop-all` |
| `workflow create` | Create workflow | `xactions workflow create -f flow.json` |
| `workflow run` | Run workflow | `xactions workflow run morning-engage` |
| `workflow list` | List workflows | `xactions workflow list` |
| `workflow delete` | Delete workflow | `xactions workflow delete <id>` |
| `workflow actions` | List actions | `xactions workflow actions` |
| `workflow runs` | Execution history | `xactions workflow runs <id>` |
| `graph build` | Build social graph | `xactions graph build nichxbt -d 2` |
| `graph analyze` | Analyze graph | `xactions graph analyze <id>` |
| `graph recommend` | Get recommendations | `xactions graph recommend <id>` |
| `graph export` | Export graph | `xactions graph export <id> -f html` |
| `graph list` | List graphs | `xactions graph list` |
| `graph delete` | Delete graph | `xactions graph delete <id>` |
| `export` | Export account | `xactions export nichxbt -f json,csv` |
| `migrate` | Migrate to Bluesky/Mastodon | `xactions migrate user --to bluesky` |
| `diff` | Compare exports | `xactions diff export1/ export2/` |
| `scrape` | Cross-platform scrape | `xactions scrape profile -p bluesky -u user` |
| `platforms` | List platforms | `xactions platforms` |
| `ai analyze` | Analyze writing voice | `xactions ai analyze nichxbt` |
| `ai generate` | Generate tweets | `xactions ai generate "AI" -v nichxbt` |
| `ai rewrite` | Rewrite tweet | `xactions ai rewrite "text" -v nichxbt` |
| `ai calendar` | Content calendar | `xactions ai calendar nichxbt -d 7` |
| `optimize` | Optimize tweet | `xactions optimize "my tweet"` |
| `hashtags` | Suggest hashtags | `xactions hashtags "my tweet" -n 5` |
| `predict` | Predict performance | `xactions predict "my tweet"` |
| `variations` | Generate variations | `xactions variations "my tweet" -n 5` |
| `sentiment` | Analyze sentiment | `xactions sentiment "great news!"` |
| `monitor` | Monitor reputation | `xactions monitor nichxbt -i 300` |
| `report` | Reputation report | `xactions report nichxbt -p 7d` |
| `history` | Account history | `xactions history nichxbt -d 30` |
| `snapshot` | Auto-snapshot | `xactions snapshot nichxbt -i 60` |
| `audience` | Follower overlap | `xactions audience user1 user2` |
| `evergreen` | Recycle top content | `xactions evergreen nichxbt` |
| `crm sync` | Sync followers to CRM | `xactions crm sync nichxbt` |
| `crm tag` | Tag contact | `xactions crm tag user vip` |
| `crm search` | Search contacts | `xactions crm search "ai"` |
| `crm score` | Auto-score contacts | `xactions crm score` |
| `crm segment` | Get segment | `xactions crm segment influencers` |
| `schedule add` | Add scheduled job | `xactions schedule add job "0 9 * * *" -c "..."` |
| `schedule list` | List jobs | `xactions schedule list` |
| `schedule remove` | Remove job | `xactions schedule remove <name>` |
| `schedule run` | Run job now | `xactions schedule run <name>` |
| `rss add` | Add RSS feed | `xactions rss add tech https://...` |
| `rss list` | List feeds | `xactions rss list` |
| `rss check` | Check for new items | `xactions rss check` |
| `rss drafts` | View draft posts | `xactions rss drafts` |
| `notify test` | Test notification | `xactions notify test slack` |
| `notify send` | Send notification | `xactions notify send "Alert!"` |
| `notify configure` | Configure channels | `xactions notify configure` |
| `dataset list` | List datasets | `xactions dataset list` |
| `dataset export` | Export dataset | `xactions dataset export my-data -f csv` |
| `dataset delete` | Delete dataset | `xactions dataset delete my-data` |
| `team create` | Create team | `xactions team create "My Team"` |
| `team invite` | Invite member | `xactions team invite <id> user@email.com` |
| `team members` | List members | `xactions team members <id>` |
| `team activity` | Activity log | `xactions team activity <id>` |
| `bulk` | Bulk operations | `xactions bulk follow targets.csv` |
| `import` | Import data | `xactions import data.json --from apify` |
| `export-data` | Export to format | `xactions export-data data.json --to csv` |
| `convert` | Convert formats | `xactions convert data.json --to csv` |
| `mcp-config` | Generate MCP config | `xactions mcp-config -c claude --write` |

---

## License

MIT License - see [LICENSE](../LICENSE) for details.

---

<p align="center">
  <strong>⚡ XActions</strong><br>
  Built by <a href="https://x.com/nichxbt">nich (@nichxbt)</a><br>
  <a href="https://xactions.app">https://xactions.app</a>
</p>

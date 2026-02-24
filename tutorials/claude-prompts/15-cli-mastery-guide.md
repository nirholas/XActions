# Tutorial: XActions CLI Mastery — Command Line Power User Guide

You are my CLI tool expert. I want to master the XActions command-line interface for maximum productivity. Walk me through every command, every flag, and every workflow. I want to be able to do everything from my terminal.

## Context

I'm using XActions (https://github.com/nirholas/XActions), an open-source X/Twitter toolkit with a full CLI (`xactions` command) powered by Commander.js. The CLI uses Puppeteer headless Chrome for scraping and supports JSON/CSV output.

## What I Need You To Do

### Part 1: Installation & Setup

1. **Install globally:**
   ```bash
   npm install -g xactions
   ```
   Or use locally:
   ```bash
   npx xactions [command]
   ```

2. **Login — get your auth token first:**
   ```bash
   xactions login
   ```
   This opens an interactive prompt for your auth_token cookie.
   
   **How to get your auth_token:**
   - Open x.com → F12 → Application → Cookies → auth_token
   - Copy the value
   
   The token is stored in `~/.xactions/config.json`

3. **Verify login:**
   ```bash
   xactions profile YOUR_USERNAME
   ```
   Should show your profile data.

4. **Logout:**
   ```bash
   xactions logout
   ```

### Part 2: Profile Scraping

```bash
xactions profile USERNAME
```

**Options:**
- `--format json|csv` — Output format (default: pretty print)
- `--output filename` — Save to file instead of stdout

**Examples:**
```bash
# Pretty print to terminal
xactions profile elonmusk

# Save as JSON
xactions profile elonmusk --format json --output elon.json

# Quick check your own account  
xactions profile myusername
```

**Output includes:**
- Display name, username, bio
- Location, website, join date
- Followers, following, tweet count
- Account verification status

### Part 3: Follower & Following Scraping

**Scrape followers:**
```bash
xactions followers USERNAME [--limit N] [--format json|csv] [--output file]
```

**Scrape following:**
```bash
xactions following USERNAME [--limit N] [--format json|csv] [--output file]
```

**Examples:**
```bash
# Get first 200 followers as CSV
xactions followers myusername --limit 200 --format csv --output my-followers.csv

# Get following list as JSON
xactions following myusername --limit 500 --format json --output my-following.json

# Pipe to other tools
xactions followers elonmusk --limit 50 --format json | jq '.[].username'
```

**Output per user:**
- Username
- Display name
- Bio  
- Follows you back (Y/N)

### Part 4: Find Non-Followers

The killer feature:

```bash
xactions non-followers USERNAME
```

**Examples:**
```bash
# Find who doesn't follow back
xactions non-followers myusername

# Save to file for batch unfollowing
xactions non-followers myusername --format json --output unfollowers.json

# Get CSV for spreadsheet analysis
xactions non-followers myusername --format csv --output unfollowers.csv

# Count them
xactions non-followers myusername --format json | jq '. | length'
```

### Part 5: Tweet Scraping

```bash
xactions tweets USERNAME [--limit N] [--format json|csv] [--output file]
```

**Examples:**
```bash
# Get last 100 tweets
xactions tweets myusername --limit 100 --format json --output my-tweets.json

# Analyze posting frequency
xactions tweets myusername --limit 200 --format json | jq '.[].timestamp'

# Find most liked tweets
xactions tweets myusername --limit 100 --format json | jq 'sort_by(-.likes) | .[:5]'

# Get tweets as CSV for spreadsheet
xactions tweets competitor1 --limit 50 --format csv --output comp-tweets.csv
```

### Part 6: Tweet Search

Powerful tweet search from the command line:

```bash
xactions search "QUERY" [--limit N] [--format json|csv] [--output file]
```

**Search operators:**
```bash
# Basic keyword search
xactions search "machine learning"

# From a specific user
xactions search "from:elonmusk AI"

# Trending topic
xactions search "#buildinpublic" --limit 50

# Advanced operators
xactions search "\"startup funding\" min_faves:100 -filter:replies lang:en"

# Mentions
xactions search "@myusername" --limit 200

# Date range (if supported upstream)
xactions search "AI startups since:2026-01-01"
```

### Part 7: Hashtag Analysis

```bash
xactions hashtag "HASHTAG" [--limit N] [--format json|csv] [--output file]
```

**Examples:**
```bash
# Scrape tweets with hashtag
xactions hashtag "web3" --limit 100 --format json

# Multiple hashtags (run separately)
xactions hashtag "AI" --limit 50 --output ai-tweets.json
xactions hashtag "machinelearning" --limit 50 --output ml-tweets.json

# Combine and analyze  
cat ai-tweets.json ml-tweets.json | jq -s 'flatten | sort_by(-.likes)'
```

### Part 8: Thread Scraping

```bash
xactions thread "TWEET_URL" [--format json|markdown|text] [--output file]
```

**Examples:**
```bash
# Unroll a thread to terminal
xactions thread "https://x.com/user/status/123456"

# Save as markdown (great for note-taking)
xactions thread "https://x.com/user/status/123456" --format markdown --output thread.md

# Save as JSON with metadata
xactions thread "https://x.com/user/status/123456" --format json --output thread.json
```

### Part 9: Media Scraping

```bash
xactions media USERNAME [--limit N] [--format json] [--output file]
```

**Examples:**
```bash
# Get all media URLs from a profile
xactions media photographer1 --limit 100 --format json --output media.json

# Extract just the URLs
xactions media photographer1 --format json | jq '.[].urls[]'
```

### Part 10: Account Info

```bash
xactions info
```

Shows your logged-in account info and XActions version.

### Part 11: MCP Server Launch

```bash
xactions mcp
```

Starts the MCP server for Claude Desktop integration. Usually run via Claude Desktop config, not directly.

### Part 12: Advanced CLI Workflows

Now let's combine commands for powerful workflows:

#### Workflow 1: Find and Export Non-Followers for Cleanup
```bash
# Step 1: Find non-followers
xactions non-followers myusername --format json --output nonfollowers.json

# Step 2: Count them
cat nonfollowers.json | jq '. | length'

# Step 3: Extract just usernames for bulk operations
cat nonfollowers.json | jq -r '.[].username' > usernames-to-unfollow.txt

# Step 4: Review the list
head -20 usernames-to-unfollow.txt
```

#### Workflow 2: Competitor Analysis Report
```bash
# Scrape profiles
for user in competitor1 competitor2 competitor3; do
  xactions profile $user --format json --output "profiles/$user.json"
done

# Scrape their tweets
for user in competitor1 competitor2 competitor3; do
  xactions tweets $user --limit 50 --format csv --output "tweets/$user.csv"
done

# Combine data for analysis
cat profiles/*.json | jq -s '.'
```

#### Workflow 3: Niche Research
```bash
# Search multiple keywords
for kw in "ai startup" "machine learning" "deep learning"; do
  xactions search "$kw" --limit 30 --format json --output "research/$(echo $kw | tr ' ' '-').json"
done

# Find top voices across all searches
cat research/*.json | jq -s 'flatten | group_by(.author) | map({author: .[0].author, count: length, totalLikes: (map(.likes) | add)}) | sort_by(-.totalLikes) | .[:20]'
```

#### Workflow 4: Daily Metrics Tracking
```bash
# Create a script: daily-metrics.sh
#!/bin/bash
DATE=$(date +%Y-%m-%d)

# Snapshot followers
xactions followers myusername --limit 1000 --format json --output "snapshots/$DATE-followers.json"

# Snapshot following  
xactions following myusername --limit 1000 --format json --output "snapshots/$DATE-following.json"

# Count
echo "$DATE: $(cat snapshots/$DATE-followers.json | jq '. | length') followers, $(cat snapshots/$DATE-following.json | jq '. | length') following"

# Compare with yesterday
YESTERDAY=$(date -d "yesterday" +%Y-%m-%d 2>/dev/null || date -v-1d +%Y-%m-%d)
if [ -f "snapshots/$YESTERDAY-followers.json" ]; then
  TODAY_COUNT=$(cat snapshots/$DATE-followers.json | jq '. | length')
  YESTERDAY_COUNT=$(cat snapshots/$YESTERDAY-followers.json | jq '. | length')
  echo "Change: $(($TODAY_COUNT - $YESTERDAY_COUNT)) followers"
fi
```

#### Workflow 5: Content Performance Report
```bash
# Get tweets and sort by engagement
xactions tweets myusername --limit 100 --format json | \
  jq 'sort_by(-((.likes // 0) + (.retweets // 0) + (.replies // 0))) | 
  .[:10] | 
  .[] | 
  {text: .text[:80], likes, retweets, replies, url}'
```

### Part 13: Environment Variables

Configure XActions via environment variables:

```bash
# Session cookie (alternative to login command)
export XACTIONS_SESSION_COOKIE="your_auth_token_here"

# MCP mode
export XACTIONS_MODE="local"           # local (Puppeteer) or remote (API)
export XACTIONS_API_URL="https://api.xactions.app"

# Puppeteer settings  
export PUPPETEER_HEADLESS="true"       # Run headless (default) or visible
```

### Part 14: Piping & Integration

XActions CLI plays well with Unix tools:

```bash
# Count followers
xactions followers me --format json | jq '. | length'

# Get only usernames  
xactions following me --format json | jq -r '.[].username'

# Filter by criteria
xactions followers me --format json | jq '[.[] | select(.bio | test("developer|engineer"; "i"))]'

# Export to CSV for Excel
xactions tweets me --limit 200 --format csv > my-tweets.csv

# Combine with grep
xactions search "my brand" --format json | jq -r '.[].text' | grep -i "complaint"
```

### Part 15: Troubleshooting CLI

Common issues and fixes:

1. **"Command not found"**
   ```bash
   npm install -g xactions
   # or use: npx xactions
   ```

2. **"Not logged in"**
   ```bash
   xactions login
   # Enter your auth_token
   ```

3. **"Scraping returns empty"**
   - Cookie may have expired: `xactions login` with new token
   - Account might be private
   - Rate limited: wait and try again

4. **"Puppeteer errors"**
   ```bash
   # Install Chromium dependencies
   npx puppeteer install
   ```

5. **Slow performance**
   - Reduce `--limit` for faster results
   - Puppeteer needs to render pages, so large scrapes take time
   - Consider running overnight for big exports

## My CLI Goals
(Replace before pasting)
- Am I comfortable with the command line? Beginner/Intermediate/Advanced
- What do I mainly want to do? Scraping / Analysis / Automation
- Do I want to build automated scripts? Yes/No
- Preferred output format: JSON / CSV / Pretty print

Start with Part 1 — help me install and log in, then walk me through my first commands.

# XActions CLI Reference

> **The Complete X/Twitter Automation Toolkit**  
> Author: nich ([@nichxbt](https://x.com/nichxbt)). Run `xactions --version` for the version you have installed.

The XActions CLI provides command-line tools for X/Twitter automation, scraping, and data extraction. No Twitter API required, which saves $100-$5,000+/month in API costs.

**Most read commands need no account at all.** Profiles, timelines, threads, and media all work on the guest tier the moment you install. Logging in unlocks search, followers, following, likes, bookmarks, and DMs. `xactions doctor` tells you which tier you are on right now.

---


## ask

Ask how to do something with XActions and get a sourced answer plus what to run. No API key needed.

```bash
xactions ask "how do I unfollow everyone?"
xactions ask "scrape followers" --json
echo "how do I download a video" | xactions ask
```

| Option | Description |
|---|---|
| `--json` | Print the answer, sources and actions as JSON |
| `-q, --quiet` | Answer only, no progress or lane line |
| `--no-sources` | Skip the source list |
| `-p, --provider <name>` | Answer with your own key (`groq`, `openrouter`, `xai`, `openai`, `gemini`, `mistral`, `cerebras`) |
| `-k, --key <key>` | API key for `--provider` (defaults to `<PROVIDER>_API_KEY`) |
| `-m, --model <model>` | Model override for `--provider` |

The answer streams as it is written and ends with a **Run it** block naming the browser script, CLI command or MCP tool that does the job. Retrieval is local to the install, so it answers with no network once the free lanes are unreachable. Full guide: [Ask XActions](ask.md).

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Finding your way around](#finding-your-way-around)
  - [xactions quickstart](#xactions-quickstart)
  - [xactions completion](#xactions-completion)
  - [xactions skills](#xactions-skills)
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
  - [xactions article](#xactions-article)
  - [xactions media](#xactions-media)
  - [xactions analyze](#xactions-analyze)
  - [xactions brief](#xactions-brief)
  - [xactions download](#xactions-download)
  - [xactions reputation](#xactions-reputation)
  - [xactions engage](#xactions-engage)
  - [xactions info](#xactions-info)
- [Persona Commands](#xactions-persona-create)
  - [xactions persona create](#xactions-persona-create)
  - [xactions persona list](#xactions-persona-list)
  - [xactions persona run](#xactions-persona-run)
  - [xactions persona status](#xactions-persona-status)
  - [xactions persona edit](#xactions-persona-edit)
  - [xactions persona delete](#xactions-persona-delete)
- [Organization Commands](#organization-commands)
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
  - [Compact output for agents](#compact-output-for-agents)
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
xactions doctor      # checks Node, the browser, the MCP server, and what works right now
```

### Requirements

- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- An X/Twitter account **only** for search, followers, following, likes, bookmarks, and DMs. Everything else works logged out.

---

## Quick Start

```bash
npm install -g xactions

xactions quickstart          # guided first run, adapts to what you have set up
xactions doctor              # verify the install and see which tier you are on

xactions profile NASA        # works with no account
xactions tweets NASA --limit 20
xactions analyze NASA        # engagement rate, cadence, content mix, best posting hour
xactions brief base CoinbaseDev --topic x402   # research accounts before tagging them

xactions connect             # log in once, in a real browser, to unlock the rest
xactions search "your topic" --limit 50
xactions followers yourhandle --limit 500 --output followers.json
```

`xactions connect` drives a real browser: you log in normally and the session is captured for you. `xactions login` now also imports cookies without DevTools, via `--from-browser` (reads your browser's cookie DB) or `--cookies-file` (an exported cookies file); with no flags it prompts you to paste `auth_token` and `ct0`.

---

## Finding your way around

There are more than fifty commands. Running `xactions` with no arguments prints them grouped by task rather than alphabetically:

```
Start here              Set up and verify the install
Read an account         Works with no login at all
Followers and audience  Who follows whom, and who is worth your time
Search and monitor      Find posts, then keep watching them
Write and grow          Draft, sharpen, schedule, and recycle posts
Automate                Run it without you
Move data               Export, import, convert, migrate, diff
Low level               The raw HTTP client
```

`xactions help <command>` gives the full flag list for any one command.

### xactions quickstart

A guided first run. Reads what you already have configured and prints the three commands that will produce a result on your machine, then the directions worth exploring next.

```bash
xactions quickstart
xactions quickstart --json    # just the detected setup state, for scripts
```

The JSON form reports the config directory, whether a session is saved, and which tier (`guest` or `session`) you are on.

### xactions completion

Tab completion for bash, zsh, and fish. The script is generated from the live command tree, so it covers every command, sub-command, and flag, and stays correct as commands are added.

```bash
# bash
xactions completion bash > /etc/bash_completion.d/xactions
# or, without root:
echo 'source <(xactions completion bash)' >> ~/.bashrc

# zsh
xactions completion zsh > "${fpath[1]}/_xactions" && compinit
# or:
echo 'source <(xactions completion zsh)' >> ~/.zshrc

# fish
xactions completion fish > ~/.config/fish/completions/xactions.fish
```

Regenerate it after upgrading XActions so newly added commands complete.

---

## Authentication

XActions uses your X/Twitter session cookie for authentication. This approach bypasses API rate limits and doesn't require expensive API access.

### xactions login

Set up authentication with your X/Twitter session cookie. Four ways in, fastest first.

**Syntax:**

```bash
xactions login [--from-browser [browser]] [--cookies-file <path>]
```

**Options:**

| Option | Description |
|--------|-------------|
| `--from-browser [browser]` | Read x.com cookies from a locally installed browser: `chrome`, `chromium`, `brave`, `edge`, `arc`, or `firefox` (default `firefox`). |
| `--cookies-file <path>` | Import cookies from a file: Netscape `cookies.txt`, Cookie-Editor / EditThisCookie JSON, Playwright / Puppeteer `storageState`, or a raw `auth_token=...; ct0=...` string. |

With no flags, `xactions login` prompts you to paste `auth_token` and `ct0` by hand.

**1. Read cookies from your browser (no DevTools, no copy/paste):**

```bash
$ xactions login --from-browser firefox
✔ Imported 4 x.com cookies from firefox
  Saved to ~/.xactions/cookies.json (owner-only)
  auth_token + ct0 captured. Session-tier commands are unlocked.
```

`--from-browser` reads the browser's own cookie database. It works headlessly for
Firefox on every platform, and for Chromium-family browsers on Linux (default
keyring-less key) and macOS (via the Keychain). If a Chromium browser seals its
cookies with the system keyring (GNOME Keyring / KWallet), or you are on Windows,
the command prints the exact `--cookies-file` export path to use instead. Nothing
is faked and nothing is sent anywhere.

**2. Import a cookies file you exported:**

```bash
$ xactions login --cookies-file ~/Downloads/x.com_cookies.txt
✔ Imported 4 x.com cookies
  Saved to ~/.xactions/cookies.json (owner-only)
  auth_token + ct0 captured. Session-tier commands are unlocked.
```

Accepted formats (auto-detected):

- **Netscape `cookies.txt`** — what curl, wget, and the "Get cookies.txt LOCALLY" extension write (tab-separated, `#HttpOnly_` prefixes supported).
- **Cookie-Editor / EditThisCookie JSON** — a `[{name, value, domain, ...}]` array.
- **Playwright / Puppeteer `storageState`** — a `{ cookies: [...] }` object.
- **Raw header string** — `auth_token=...; ct0=...`.

Only x.com / twitter.com cookies are extracted; anything else in the export is dropped.

**3. Log in through a real browser window:** run `xactions connect`. It opens a real Chrome window, you log in normally (2FA included), and the session is captured when you finish.

**4. Paste the two cookies by hand:**

```bash
$ xactions login

⚡ XActions Login Setup
...
? Enter your auth_token cookie: ********
? Enter your ct0 cookie (optional, press Enter to skip): ********

✓ Authentication saved!
```

To find them in DevTools: open [x.com](https://x.com) logged in, press `F12`, go to
the **Application** tab (Chrome) or **Storage** tab (Firefox), expand **Cookies** →
`https://x.com`, and copy the values of `auth_token` and `ct0`.

> ⚠️ **Security Note**: Your session is stored locally in `~/.xactions/cookies.json` and `~/.xactions/config.json` with owner-only permissions. Never share these values with anyone.

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

### xactions article

Read the full text of an X long-form Article in one GraphQL request, with no browser.

X's own web client asks for articles with `withArticlePlainText: false` and gets only the short preview back. This command sets it to `true`, so the response carries the whole body. If X still answers with the preview only, the command fails rather than printing a teaser as if it were the article.

**Syntax:**

```bash
xactions article <url> [options]
```

**Arguments:**

| Argument | Description                                                        | Required |
|----------|--------------------------------------------------------------------|----------|
| `url`    | `x.com/i/article/<id>` URL, a status URL, or the numeric id        | Yes      |

**Options:**

| Option            | Alias | Description                                  | Default |
|-------------------|-------|----------------------------------------------|---------|
| `--output <file>` | `-o`  | Write the article as JSON to a file          | stdout  |
| `--json`          |       | Print the full JSON object                   |         |

`--compact` prints `id username date likes views title url text` on one line.

**Examples:**

```bash
# Title, author and the whole body
xactions article https://x.com/i/article/1234567890123456789

# Just the body, for piping
xactions article https://x.com/i/article/1234567890123456789 --json | jq -r .text
```

From Node, the same read is `scrapeArticle(client, url)` from `xactions/scrapers/twitter/http`, and the MCP tool is `x_get_article`.

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

### xactions analyze

Account report from a sample of recent posts: engagement rate, cadence, content mix, best posting hour and weekday. Several usernames print a side-by-side comparison. No login needed.

```bash
xactions analyze <usernames...> [options]
```

| Option | Description |
|--------|-------------|
| `-l, --limit <number>` | Posts to sample per account, clamped to 5..200 (default 50) |
| `-o, --output <file>` | Write the raw report to `.json`, `.csv` or `.xlsx`. Always writes, also alongside `--json` or `--compact` |
| `--json` | Print the raw report as JSON instead of the formatted one |

```bash
xactions analyze NASA
xactions analyze NASA SpaceX --fields username,followers,engagementRate,bestHourUTC --compact
xactions analyze NASA --json -o reports/nasa.json
```

### xactions brief

Research accounts before tagging them in a post: recent posts, the figures they publish with source links, their stats, who they tag, and who else the list keeps mentioning. Timelines are cached for six hours under `$XACTIONS_HOME/cache/brief/`. Full guide: [brief.md](brief.md).

```bash
xactions brief [usernames...] [options]
```

| Option | Description |
|--------|-------------|
| `-f, --file <path>` | Read accounts from a file: one per line or comma separated, `#` for comments |
| `-t, --topic <keywords>` | Comma-separated keywords that make a post on topic |
| `-l, --limit <number>` | Posts to read per account, 10..400 (default 100) |
| `-d, --days <number>` | Only list posts and figures from the last N days (default 30) |
| `--recent <number>` | Recent posts to list per account (default 5) |
| `-o, --output <file>` | Write the brief: `.md` for Markdown, `.json` for the full data |
| `--json` | Print the full brief as JSON instead of Markdown |
| `--refresh` | Ignore cached timelines and fetch everything again |
| `--cache-hours <number>` | Reuse timelines fetched within this many hours, `0` turns the cache off (default 6) |

Exits 0 when every account was read, 2 when some failed (listed under "Not included"), 1 when none could be read. An empty timeline counts as a failure.

```bash
xactions brief coinbasedev base --topic x402
xactions brief --file accounts.txt --topic "x402,agent payments" -o brief.md
xactions brief --file accounts.txt --json | jq -r '.alsoTag[].username'
```

### xactions download

Download photos, videos and GIFs from a profile, a tweet, a search or a community (alias `dl`). Targets: `@user` (media tab), `@user:avatar`, `@user:banner`, `@user:all`, a tweet id or status URL, `search:<query>`, `community:<id>`.

```bash
xactions download <target> [options]
```

| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Where files land (default `./media`) |
| `-f, --filename <template>` | Filename template (default `{username}/{tweet_id}_{num}.{ext}`; `xactions download --help` lists the keys) |
| `-a, --archive [path]` | Record what was downloaded so re-runs skip it (default path: beside the files) |
| `-l, --limit <n>` | How many source items to walk (default 100) |
| `-c, --concurrency <n>` | Parallel downloads (default 4) |
| `-t, --type <type...>` | Only these types: `photo`, `video`, `gif` |
| `--since <date>` / `--until <date>` | Date window, `YYYY-MM-DD` |
| `--overwrite` | Re-download even when the file or archive entry exists |
| `--dry-run` | List what would be downloaded, write nothing |
| `--json` | Print the plan and results as JSON |
| `-q, --quiet` | Summary only, no per-file lines |

Exits 1 when nothing matched or any file failed.

```bash
xactions download @nichxbt --archive
xactions download @nichxbt:all -o ./archive -f '{username}/{kind}/{date}_{media_filename}.{ext}'
xactions download "search:from:nichxbt filter:videos" -t video
xactions download https://x.com/nichxbt/status/123 --dry-run
```

### xactions reputation

AI risk-score an account's posts on four dimensions (professional, hostile, legal, spam) and print a 0-100 reputation score, a grade and the posts worth a look. Needs an LLM key.

```bash
xactions reputation [username] [options]
```

| Option | Description |
|--------|-------------|
| `--replies` | Include the replies tab |
| `--reposts` | Also score posts the account reposted from others |
| `-l, --limit <number>` | Maximum posts to scan (default 60) |
| `--dimensions <list>` | Subset of `professional,hostile,legal,spam` (default all four) |
| `--custom-question <text>` | An extra risk question scored alongside the built-ins |
| `--provider <name>` | `free` (default: free models, no key needed), or your own key with `openrouter`, `openai`, `xai`, `anthropic`, `ollama`, `custom` |
| `--model <name>` | Model override |
| `--api-key <key>` | Your own key for a non-free provider, or its env var (`OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY`) |
| `--base-url <url>` | Chat-completions URL for `custom` |
| `--concurrency <number>` | Posts scored in parallel (default 4) |
| `--top <number>` | How many flagged or review posts to print (default 10) |
| `--json` | Print the report as JSON on stdout |

If no post could be scored (a bad key, an unreachable provider), the command prints the first model error and exits 1 rather than reporting a score.

```bash
xactions reputation nichxbt
xactions reputation nichxbt --replies --limit 200
GROQ_API_KEY=gsk_... xactions reputation nichxbt --json   # a free-tier key adds capacity
```

### xactions engage

Like, repost, and reply across a profile, a search, or a list, with replies from templates or from an LLM given a brief. Needs a logged-in session (`xactions connect`) for anything but `--dry-run`.

```bash
xactions engage [username] [options]
xactions engage --search "<query>" [options]
xactions engage --list <id> [options]
```

| Option | Description |
|--------|-------------|
| `--search <query>` / `--list <id>` | Sweep a search or a list instead of a profile |
| `--mode <Latest\|Top>` | Search ranking (default Latest) |
| `--like` / `--repost` / `--comment` | Actions to take (at least one) |
| `-l, --limit <n>` | Posts to engage this run (default 100) |
| `--replies` / `--reposts` | Include replies / reposts of other accounts |
| `--since <date>` | Only posts on or after this date |
| `--from <handles>` / `--skip-user <handles>` | Author allow and block lists |
| `--keyword <words>` / `--skip-keyword <words>` | Text must contain / must not contain |
| `--min-likes <n>` / `--max-likes <n>` | Like floor and ceiling (0 = no ceiling) |
| `--template <text>` | Reply template, repeatable (`{author}`, `{name}`) |
| `--templates-file <path>` | One template per line |
| `--prompt <brief>` | AI replies: how they should sound |
| `--persona <text>` | Optional persona line for the model |
| `--provider <name>` | `free` (default: free models, no key needed), or your own key with `openrouter`, `openai`, `xai`, `anthropic`, `ollama`, `custom` |
| `--model <name>` | Model override |
| `--api-key <key>` | Your own key for a non-free provider, or its env var (`OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `XAI_API_KEY`, `ANTHROPIC_API_KEY`) |
| `--base-url <url>` | Chat-completions URL for `custom` |
| `--delay <s>` / `--jitter <s>` | Pacing between posts (default 20 ± 10) |
| `--dry-run` | Preview, including generated replies, post nothing |
| `--reset` / `--no-resume` | Forget saved progress / ignore it for this run |
| `--json` | Report as JSON on stdout |

```bash
xactions engage nasa --like --repost --dry-run
xactions engage nasa --like --comment --template "Solid work on this, {name}."
xactions engage --search "open source AI" --like --comment --prompt "curious builder" --max-likes 50
xactions engage --list 1234567890 --like --keyword solana,rust --limit 25
```

Progress is saved per feed in `~/.xactions/engage/`, so a second run skips what the first finished. Full guide, including the browser-console and MCP versions: [engage.md](engage.md).

### xactions info

Display XActions information, version, and links.

**Syntax:**

```bash
xactions info
```

**Example:**

```bash
$ xactions info

⚡ XActions v5.0.0

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
| `GROQ_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY` | No | Comments and posts use free models; these free-tier keys add capacity |

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

## Organization Commands

Run a family of X accounts as a team: roles, approval, cross-posting checked against X's
duplicate-content rule, affiliate disclosure, daily caps, and a hash-chained audit log.
Full guide: [orgs.md](orgs.md).

| Command | Does |
|---|---|
| `xactions org create <org> --owner <name>` | create an organization |
| `xactions org list` | list organizations |
| `xactions org show <org>` | members, accounts, settings |
| `xactions org settings <org> [--two-person on\|off] [--threshold n] [--disclosure tag]` | owner only |
| `xactions org member add <org> <name> --role <role>` | add a member or change their role |
| `xactions org member remove <org> <name>` | remove a member |
| `xactions org account add <org> <handle> (--cookies-file p \| --from-browser [b] \| --from-saved) [--label l] [--kind owned\|affiliate]` | connect an account; the session is checked against the handle |
| `xactions org account remove <org> <handle>` | disconnect and delete the session |
| `xactions org draft <org> --account h --text t [--variant h=t]... [--repost h]... [--at iso]` | draft a post |
| `xactions org edit <org> <id> [--account h] [--text t] [--at iso\|none]` | change a post; it returns to draft |
| `xactions org posts <org> [--status s]` | the queue |
| `xactions org post <org> <id>` | one post in full |
| `xactions org approve <org> <id>` / `reject <org> <id> [--reason r]` | editor or above |
| `xactions org publish <org> [--id id] [--dry-run] [--retry-failed] [--delay s]` | publish what is due |
| `xactions org calendar <org> [--days n]` | posts by day |
| `xactions org stats <org> [--days n]` | per-account and total numbers |
| `xactions org log <org> [--limit n] [--verify]` | the audit log |

Every command takes `--as <member>` (default `$XACTIONS_ORG_MEMBER`, or the only member) and `--json`.

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

Monitors and their history live in memory inside the `xactions monitor` process and are not written to disk, so a separate `xactions report` process cannot see them and exits 1 with that explanation. For a one-off report on an account, use [`xactions analyze`](#xactions-analyze) or [`xactions reputation`](#xactions-reputation).

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

Only these are read. Anything else you may have seen in an older copy of this
page (`XACTIONS_AUTH_TOKEN`, `XACTIONS_CONFIG_DIR`, `XACTIONS_HEADLESS`,
`XACTIONS_TIMEOUT`, `XACTIONS_PROXY`) was never implemented and has no effect.

| Variable | Read by | Effect |
|---|---|---|
| `XACTIONS_HOME` | every command | Where the config, the saved session (`config.json`, `cookies.json`), the brief cache, the query-ID cache and drafts live. Default `~/.xactions`. The MCP server honours the same variable, so one setting points both lanes at the same account |
| `XACTIONS_SESSION_COOKIE` | `persona run`, `workflow run`, the MCP server | An `auth_token` used when no `--token` / `--auth` is passed and nothing is saved |
| `TWITTER_AUTH_TOKEN` | `ai analyze`, `ai generate`, `ai rewrite`, `ai calendar` | Fallback `auth_token` when `xactions login` has not saved one |
| `GROQ_API_KEY`, `NVIDIA_API_KEY`, `OPENROUTER_API_KEY`(`S`) | `ai`, `optimize` and every other AI feature | Optional free-tier keys; each adds a lane to the free models those features use ([Free LLM lanes](ask.md#free-llm-lanes)). `XACTIONS_LLM=off` turns LLM calls off |
| `OPENAI_API_KEY`, `XAI_API_KEY` (or `GROK_API_KEY`), `ANTHROPIC_API_KEY` | `engage`, `reputation`, `ask --provider` | Your own key for the matching `--provider` when `--api-key` / `--key` is not passed. Only used when you name that provider |
| `XACTIONS_DEBUG` | the HTTP scrapers | Log how each request's `x-client-transaction-id` was computed |

### Examples

```bash
# Keep a second account's session, caches and drafts apart from the first
XACTIONS_HOME=~/.xactions-work xactions login --from-browser chrome
XACTIONS_HOME=~/.xactions-work xactions followers nichxbt --limit 200 --compact

# Give the free models a lane of your own (a free Groq key) without passing it on the command line
GROQ_API_KEY=gsk_... xactions reputation nichxbt
```

---

## Configuration

`xactions login` and `xactions connect` write the session under
`$XACTIONS_HOME` (default `~/.xactions`).

### Config File Location

```
~/.xactions/              # or $XACTIONS_HOME
├── config.json           # auth_token and ct0 saved by `xactions login`
├── cookies.json          # the full cookie jar from --from-browser, --cookies-file or `connect` (read first)
├── cache/brief/          # `xactions brief` timelines, six hours
└── personas/             # saved persona configurations
```

### Config File Structure

```json
{
  "authToken": "your_auth_token_here",
  "csrfToken": "your_ct0_here",
  "openrouter_api_key": "optional, used by the ai commands"
}
```

### Manual Configuration

You can manually edit the config file:

```bash
cat "${XACTIONS_HOME:-$HOME/.xactions}/config.json"
```

---

## Troubleshooting

### Common Issues

**1. "Authentication required" error**

```bash
# Solution: Run login command
xactions login
```

**2. Empty results or "No ... returned"**

```bash
# See what works right now and what each failure needs
xactions doctor
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
# Run the persona builder with a visible browser
xactions persona run <id> --no-headless
```

### Debug Mode

Log how each HTTP request was signed:

```bash
XACTIONS_DEBUG=1 xactions tweets nichxbt --limit 5
```

Every command exits non-zero when it fails, so `xactions ... || echo failed`
and `set -e` scripts see the failure.

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

Apache 2.0 License - see [LICENSE](../LICENSE) for details.

---

<p align="center">
  <strong>⚡ XActions</strong><br>
  Built by <a href="https://x.com/nichxbt">nich (@nichxbt)</a><br>
  <a href="https://xactions.app">https://xactions.app</a>
</p>

---

## Skills

### xactions skills

Install the bundled agent skills (the `skills/*/SKILL.md` files) where your coding agent reads them. Resolves the skills directory relative to the package, so it works from a global npm install.

```bash
xactions skills list [--json]
xactions skills show <name> [--json]
xactions skills install [names...] [--all] [--target <target>] [--global] [--json]
xactions skills uninstall [names...] [--all] [--target <target>] [--global] [--json]
```

| Option | Description | Default |
|---|---|---|
| `-a, --all` | Every bundled skill | |
| `-t, --target <target>` | `claude`, `project`, `cursor`, `codex`, `windsurf` | `claude` |
| `-g, --global` | Home directory instead of the current project (`claude` and `codex` only) | |
| `--json` | Report as JSON | |

| Target | Path |
|---|---|
| `claude` | `~/.claude/skills/<id>/` with `--global`, else `./.claude/skills/<id>/` |
| `project` | `./.claude/skills/<id>/` |
| `cursor` | `./.cursor/rules/<id>.mdc` |
| `codex` | `~/.codex/skills/<id>/` or `./.codex/skills/<id>/`, plus a managed block in `./AGENTS.md` |
| `windsurf` | `./.windsurf/rules/<id>.md` |

```bash
xactions skills install --all --global
# Output:
#   + a2a-multi-agent                claude    installed /home/you/.claude/skills/a2a-multi-agent
#   + account-backup                 claude    installed /home/you/.claude/skills/account-backup
#   ...
#   49 installed

xactions skills install account-backup --global
#   = account-backup                 claude    unchanged /home/you/.claude/skills/account-backup

xactions skills list
#   account-backup                 claude (global)
#                                  Export and backup your X/Twitter account data ...
```

Names match a skill id (`account-backup`) or its display name, case-insensitively. Every run is idempotent; `doctor` counts installs per target. The full target table and what each wrapper contains are in [skills.md](skills.md#install-into-your-agent).

---

## Compact output for agents

`--compact` is a global flag for the read commands: `profile`, `tweets`, `search`, `thread`, `followers`, `following`, `non-followers`, `hashtag`, `media`, and `analyze`. It prints one record per line as tab-separated `key=value` pairs with only the essential fields, no colours, no spinner, no box drawing. It costs a fraction of the tokens of `--json` and is trivial to `cut` or `awk`.

```bash
xactions tweets nasa --limit 3 --compact
# id=2092744659667673582	username=NASA	date=2026-08-27T01:23:02.000Z	likes=2958	retweets=665	replies=89	views=467791	text=A partial lunar eclipse will pass over the Americas ...
# id=2092721435663798658	username=NASA	date=2026-08-26T23:50:45.000Z	likes=776	retweets=91	replies=30	views=376104	text=On Aug. 30, @NASARoman is scheduled to lift off ...

xactions profile nasa --compact --fields username,followers,verified
# username=NASA	followers=92350973	verified=false

xactions analyze nasa --compact
# username=NASA	followers=92350972	following=118	postsPerDay=2.78	engagementRate=0.004	medianEngagement=3890	mediaShare=100	bestWeekday=Wednesday
```

`--fields id,text,likes` picks exactly those columns, in that order. The names are the same on every command, so `likes` means likes whether the record came from `tweets`, `search`, or `thread`:

| Kind | Default columns |
|---|---|
| tweets, search, thread, hashtag | `id username date likes retweets replies views text` |
| profile | `id username name followers following tweets verified bio` |
| followers, following, non-followers | `id username name followers verified bio` |
| media | `type url tweetUrl` |
| analyze | `username followers following postsPerDay engagementRate medianEngagement mediaShare bestHourUTC bestWeekday` |

Any raw field of the underlying record can also be named in `--fields` (for example `permanentUrl` or `isRetweet`); a field the record lacks is skipped rather than printed empty. Newlines and tabs inside a value become single spaces so a line is always one record. Dates print as ISO 8601.

`--compact` outranks `--output` and `--google-sheets`, the same way `--json` does. When stdout is a pipe, both `--json` and `--compact` keep the spinner completely silent, so nothing lands on stderr but a real error.

---

## Drafts (approve MCP write calls from the terminal)

When an MCP client runs with `XACTIONS_MCP_REQUIRE_APPROVAL=1`, every write tool call (post, reply, like, follow, DM, delete, ...) is held in `~/.xactions/mcp-drafts.json` instead of running. `xactions drafts` is the terminal side of that queue: read exactly what the agent wanted to do, release it, or drop it. `XACTIONS_HOME` moves the store; the MCP server and this command read the same file.

```bash
xactions drafts list                    # newest first: id, status, age, tool, args
xactions drafts list --status pending   # pending, executed, failed, or all
xactions drafts show 3f9c1a2b           # full arguments, and the result or error once it ran
xactions drafts approve 3f9c1a2b        # run it now, exactly as submitted
xactions drafts approve --all           # every pending draft, oldest first
xactions drafts discard 3f9c1a2b        # delete without running
xactions drafts clear                   # drop executed and failed drafts, keep pending ones
```

```
  ID        STATUS    AGE       TOOL                      ARGS
  3f9c1a2b  pending   4m        x_post_tweet              text="Shipping approval mode today."
  a81d02c7  executed  2h        x_follow_user             username="nasa"

  2 drafts, 1 pending. Approve one with `xactions drafts approve <id>`, everything with `--all`.
```

Approval replays the call through the MCP server's own dispatcher, so an approved draft runs the same code path the live tool would have. A draft that already ran is refused, so nothing posts twice; a failed run keeps the draft with its error so you can read it with `show` and retry by re-creating it. Every sub-command takes `--json`; errors under `--json` come back as `{"error": "..."}` with exit code 1. The MCP server is only loaded by `approve`, so `list`, `show`, `discard` and `clear` are instant.

## Archive (the X data export, without scraping)

X hands you your full history as a zip (Settings > Your account > Download an archive of your data). `xactions archive` reads that zip, or the folder you extracted it to, straight from disk. Nothing here needs a login or the network.

```bash
xactions archive summary twitter-2026-01-01-abc123.zip
xactions archive summary ./twitter-export --sections tweets,likes --top 5 --json
xactions archive export twitter-2026-01-01-abc123.zip --out exports/me
xactions archive export twitter-2026-01-01-abc123.zip --out exports/me --formats json,csv
xactions archive migrate twitter-2026-01-01-abc123.zip --to bluesky
xactions archive migrate twitter-2026-01-01-abc123.zip --to bluesky --execute --handle me.bsky.social --password app-pass
xactions archive migrate twitter-2026-01-01-abc123.zip --to mastodon --execute --instance https://fosstodon.org --token ...
```

| Sub-command | Does |
|-------------|------|
| `summary <zip-or-folder>` | Counts per section, tweet date range, tweets per year, busiest year, top hashtags and mentions, likes and retweets received. `--sections` reads only the named sections (fast on a multi-gigabyte zip), `--top <n>` sizes the hashtag and mention lists. |
| `export <zip-or-folder> --out <dir>` | Writes the archive in the same layout `xactions export` produces: `profile.json`, `tweets.json`, `following.json`, ... plus CSV, Markdown and an `index.html` viewer. `--formats json,csv,md,html` picks a subset. The result works with `xactions diff` and `xactions migrate` unchanged. |
| `migrate <zip-or-folder> --to bluesky\|mastodon` | Stages `tweets.json` and `following.json` from the archive (into `--out`, default `exports/<archive>_migration`) and runs the migration. Dry run by default; `--execute` needs `--handle` and `--password` (Bluesky app password) or `--token` and `--instance` (Mastodon). |

```
✔ Read twitter-2026-01-01-abc123.zip (zip)

  X archive for @nichxbt (zip)
  Account created: 2019-03-01
  Tweets span:     2024-01-01 to 2025-03-16

  Tweets       5 (3 original, 1 replies, 1 retweets, 2 with media)
  Likes        2
  Following    3
  ...
  Top hashtags
    #xactions  3
```

A spinner tracks the scan (`Scanning 4/12 data/tweets.js`, `Parsed tweets (18,204 records) from data/tweets.js`). Under `--json` with stdout piped, the spinner is silent and only the document is printed, so `xactions archive summary me.zip --json | jq .counts` works as expected.

## Doctor: reports, JSON and the checks

```bash
xactions doctor                  # every check, with the fix next to each failure
xactions doctor --json           # every check as JSON
xactions doctor --report         # a redacted Markdown block to paste into an issue
xactions doctor --issue          # the report plus a prefilled new-issue link
xactions doctor --issue --open   # the same, and open the link in your browser
xactions doctor --offline        # skip the checks that reach x.com
xactions doctor --refresh-ids    # rediscover GraphQL query IDs first
```

Every form exits `1` when any check fails and `0` otherwise. `--json`
cannot be combined with `--report` or `--issue`; `--open` implies `--issue`.

**`--json`** prints one document on stdout:

```json
{
  "version": "5.0.0",
  "checks": [
    { "id": "node", "group": "environment", "name": "Node", "status": "ok", "detail": "Node 22.19.0 satisfies >=22.19", "fix": null }
  ],
  "summary": { "ok": 9, "warn": 5, "fail": 0 }
}
```

`status` is `ok`, `warn` or `fail`; `fix` is a string or `null`. The JSON is
not redacted (details carry local paths and the signed-in handle); share
`--report` instead. The ids are stable, in this order:

| id | Group | Checks |
|---|---|---|
| `node` | environment | Node against `engines.node` in package.json |
| `sqlite` | environment | The native `better-sqlite3` module loads and opens a database. A Node upgrade leaves it built for the old ABI; the fix is `npm rebuild better-sqlite3` |
| `home` | environment | `XACTIONS_HOME` (default `~/.xactions`) is writable, or can be created. Doctor never creates it |
| `shadowed-install` | environment | An older `xactions` earlier on PATH is not hiding a newer one, and the one on PATH matches this run |
| `browser` | environment | Puppeteer and Chromium, for `connect` and the browser-driven writes |
| `mcp` | environment | The MCP server loads and lists its tools |
| `skills` | environment | Agent skills installed for Claude, Cursor, Codex or Windsurf |
| `query-ids` | environment | Age of the GraphQL query-ID cache |
| `clock` | environment | This machine's clock against x.com's `Date` header. Warns past 30 seconds, fails past five minutes: signed requests carry a timestamp |
| `guest-profile` | guest | A logged-out profile read |
| `guest-timeline` | guest | A logged-out timeline read |
| `session-saved` | session | A session is saved, and carries `ct0` |
| `session-valid` | session | The saved session still authenticates |
| `accounts` | session | The multi-account pool, if there is one |

`--offline` reports `clock`, `guest-profile`, `guest-timeline` and
`session-valid` as `warn` with the detail `Skipped: --offline`.

**`--report`** prints the XActions version, how it was installed (global
npm, npx, local clone with its commit, project dependency, and Docker when
it runs in a container), the Node version against `engines`, OS and
architecture, which optional packages are present (the browser stack,
`ioredis`, `bull`, `nodemailer`, `exceljs`, the Bluesky and x402 packages),
the guest tier result, whether a session is saved and carries `ct0`, the
query-ID cache age, the MCP self-test, the installed skills count, and a
table of every check. Before it is printed, every environment variable
value, saved cookie and config value, the home directory (shown as `~`),
the OS account name, the hostname and the signed-in handle and id are
removed, and then anything shaped like a URL, a credential, an email
address, an @handle, an account id, a token or an IP address. Version
strings, and values equal to facts the report prints on purpose (npm
exports `npm_package_name=xactions`), are kept.

**`--issue`** prints the report, then a link to the bug form with the title
(the first failing check) and the report field filled in. It opens nothing
unless you pass `--open`, and sends nothing anywhere. When the report is too
long for a link, the link carries the summary and asks you to paste the rest.

Any other command that fails ends with one line on stderr pointing here:

```
If this looks like a bug in XActions, run `xactions doctor --report` and paste the result into a new issue.
```

Usage errors (an unknown command, a missing argument) do not get the line.

## Doctor: query IDs and account pool

`xactions doctor` has two extra lines beyond the environment and session checks:

- **GraphQL query IDs.** X rotates the persisted query IDs of its GraphQL operations whenever it ships a new web bundle, and a stale one answers `404 Query not found`. The line reports how many discovered IDs are cached in `~/.xactions/query-ids.json`, how old they are, and warns past the 24 hour freshness window. `xactions doctor --refresh-ids` discovers the current IDs from x.com before running the checks and reports the refresh result. With no cache, the pinned table in `src/scrapers/twitter/http/endpoints.js` is in use, which is fine until X rotates.
- **Accounts.** If a multi-account pool exists (`~/.xactions/accounts.db`), the line reports how many accounts are configured, how many can serve right now, how many are cooling down on a rate limit (with the next reset), and how many are locked after a 401/403. With no pool it says so as a warning and moves on; doctor never creates one.

```
  ✓ GraphQL query IDs   142 query IDs cached, 3h old (/home/me/.xactions/query-ids.json)
  ! Accounts            No account pool at /home/me/.xactions/accounts.db; every call uses the single saved session
```

---
name: xactions-cli
description: Command-line interface for scraping X/Twitter data. Scrapes profiles, followers, following lists, tweets, search results, hashtags, threads, and media from the terminal. Outputs pretty-printed text, JSON, or CSV. Uses Puppeteer stealth under the hood. Use when running Twitter scraping from the command line, shell scripts, or automated pipelines.
license: MIT
compatibility: Requires Node.js 18+. Install with npm install -g xactions.
metadata:
  author: nichxbt
  version: "3.0"
---

# XActions CLI

Entry point: `src/cli/index.js`. Config stored at `~/.xactions/config.json`.

## Auth

```bash
xactions login    # Interactive prompt for auth_token cookie
xactions logout   # Removes saved cookie
```

## Commands

```bash
xactions profile <username>
xactions followers <username> [-l <limit>] [-o json|csv]
xactions following <username> [-l <limit>] [-o json|csv]
xactions non-followers <username>
xactions tweets <username> [-l <limit>] [-o json|csv]
xactions search "<query>" [-l <limit>] [-o json|csv]
xactions hashtag <tag> [-l <limit>] [-o json|csv]
xactions thread <url>
xactions media <username> [-l <limit>]
xactions info
```

## Output flags

| Flag | Description |
|------|-------------|
| `-l, --limit <n>` | Max items to scrape |
| `-o, --output <format>` | `json` or `csv` — saves to `{username}_{command}.{ext}` |

Default output is pretty-printed to terminal.

## Programmatic use

The CLI wraps the same scraper API available as a library:

```javascript
import { createBrowser, createPage, loginWithCookie,
  scrapeProfile, scrapeFollowers, scrapeFollowing, scrapeTweets,
  searchTweets, scrapeHashtag, scrapeThread, scrapeMedia,
  exportToJSON, exportToCSV } from 'xactions';
```

See the `twitter-scraping` skill for return shapes and API details.

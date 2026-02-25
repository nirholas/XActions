---
name: xactions-cli
description: Command-line interface for scraping X/Twitter data, managing MCP server config, and running automation. Scrapes profiles, followers, tweets, search results, and more from terminal. Outputs text, JSON, or CSV. Uses Puppeteer stealth. Use when running Twitter operations from command line or automated pipelines.
license: MIT
compatibility: Requires Node.js 18+. Install with npm install -g xactions.
metadata:
  author: nichxbt
  version: "4.0"
---

# XActions CLI

Entry point: `src/cli/index.js`. Config stored at `~/.xactions/config.json`.

## Installation

```bash
npm install -g xactions
```

## Authentication

```bash
xactions login    # Interactive prompt for auth_token cookie
xactions logout   # Removes saved cookie
xactions info     # Show current auth status and config
```

Get your auth_token: DevTools (F12) -> Application -> Cookies -> x.com -> copy `auth_token` value.

## Scraping Commands

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
```

## MCP Server Commands

```bash
xactions mcp-config                     # Generate config for Claude Desktop
xactions mcp-config --client cursor     # Generate for Cursor
xactions mcp-config --client windsurf   # Generate for Windsurf
xactions mcp-config --client vscode     # Generate for VS Code
xactions mcp-config --write             # Write config directly to file
```

The `mcp-config` command auto-detects your OS and generates the correct config file path.

## Output Flags

| Flag | Description |
|------|-------------|
| `-l, --limit <n>` | Maximum items to scrape |
| `-o, --output <format>` | `json` or `csv` — saves to `{username}_{command}.{ext}` |

Default output is pretty-printed to terminal with colored formatting.

## Programmatic API

The CLI wraps the same scraper API available as a library:

```javascript
import { createBrowser, createPage, loginWithCookie,
  scrapeProfile, scrapeFollowers, scrapeFollowing, scrapeTweets,
  searchTweets, scrapeHashtag, scrapeThread, scrapeMedia,
  exportToJSON, exportToCSV } from 'xactions';
```

## Examples

```bash
# Scrape a profile
xactions profile elonmusk

# Export followers as CSV
xactions followers nichxbt -l 200 -o csv

# Search tweets and save as JSON
xactions search "AI agents" -l 50 -o json

# Unroll a thread
xactions thread https://x.com/nichxbt/status/1234567890

# Generate Claude Desktop MCP config
xactions mcp-config --write
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not authenticated" | Run `xactions login` first |
| Browser won't launch | Install Chromium: `npx puppeteer browsers install chrome` |
| Scraping returns empty | Account may be private or auth_token expired |
| Command not found | Reinstall: `npm install -g xactions` |
| MCP config path wrong | Use `--client` flag to specify your IDE |

## Related Skills
- **twitter-scraping** — Detailed scraper API documentation
- **xactions-mcp-server** — MCP server setup and tools

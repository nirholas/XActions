# XActions MCP Server Setup Guide

> Use AI agents (Claude, Cursor, Windsurf, GPT) to automate X/Twitter — for free.

---

## 30-Second Quickstart

```bash
# Add to your AI client config, then restart the client
npx xactions-mcp
```

That's it. XActions will auto-install and start the MCP server.

---

## Getting Your auth_token

Most tools require an X/Twitter session cookie for authentication.

1. Go to [x.com](https://x.com) and **log in**
2. Open **DevTools** (F12 or Cmd+Option+I)
3. Go to **Application** → **Cookies** → `https://x.com`
4. Find the cookie named **`auth_token`**
5. Copy its value (a long hex string)

> ⚠️ Treat this like a password. Never share it publicly.

---

## Claude Desktop

### 1. Open config file

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### 2. Add XActions

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

Quit and reopen Claude Desktop. You should see XActions tools listed.

### Auto-generate config

```bash
npx xactions mcp-config
```

This detects your OS and outputs the correct config snippet. Use `--write` to write it directly.

---

## Cursor

Add to your **Cursor Settings** → **MCP Servers**:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

Or add to `.cursor/mcp.json` in your project root.

---

## Windsurf

Add to your **Windsurf Settings** (`~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

---

## VS Code (GitHub Copilot)

Add to your **VS Code** user `settings.json` or `.vscode/mcp.json`:

```json
{
  "mcp": {
    "servers": {
      "xactions": {
        "command": "npx",
        "args": ["-y", "xactions-mcp"],
        "env": {
          "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
        }
      }
    }
  }
}
```

---

## Local Install (Alternative)

If you prefer a local install instead of npx:

```bash
npm install -g xactions
```

Then use `xactions-mcp` as the command instead of `npx`:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "xactions-mcp",
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `XACTIONS_SESSION_COOKIE` | For most tools | Your X/Twitter `auth_token` cookie |
| `OPENROUTER_API_KEY` | For AI tools | Free key from [openrouter.ai](https://openrouter.ai) |
| `XACTIONS_MODE` | No | `local` (default, free) or `remote` |
| `DEBUG` | No | Set to `true` for verbose error stacks |

---

## Available Tools

### Scraping (free, no API key needed)

| Tool | Description |
|------|-------------|
| `x_get_profile` | Get any user's profile (bio, followers, etc.) |
| `x_get_followers` | Scrape a user's followers list |
| `x_get_following` | Scrape who a user follows |
| `x_get_tweets` | Scrape a user's recent tweets |
| `x_search_tweets` | Search tweets by keyword |
| `x_get_thread` | Unroll and read an entire thread |
| `x_download_video` | Extract video download URL from a tweet |

### Analysis

| Tool | Description |
|------|-------------|
| `x_detect_unfollowers` | Snapshot followers to detect unfollowers over time |
| `x_analyze_sentiment` | Sentiment analysis (rule-based or LLM) |
| `x_best_time_to_post` | Find optimal posting times from tweet history |
| `x_competitor_analysis` | Compare metrics across accounts |
| `x_brand_monitor` | Monitor brand mentions with sentiment |

### Actions (require auth_token)

| Tool | Description |
|------|-------------|
| `x_follow` | Follow a user |
| `x_unfollow` | Unfollow a user |
| `x_like` | Like a tweet |
| `x_post_tweet` | Post a tweet |
| `x_post_thread` | Post a multi-tweet thread |
| `x_reply` | Reply to a tweet |
| `x_retweet` | Retweet a tweet |
| `x_bookmark` | Bookmark a tweet |
| `x_send_dm` | Send a direct message |

### AI Tools (require OPENROUTER_API_KEY)

| Tool | Description |
|------|-------------|
| `x_analyze_voice` | Analyze a user's writing style |
| `x_generate_tweet` | Generate tweets in a user's voice |
| `x_summarize_thread` | AI-powered thread summarization |

---

## Example Prompts

Try these with Claude, Cursor, or any MCP-compatible AI:

### Research
> "Get the profile and last 20 tweets from @elonmusk. Summarize the main topics."

### Growth
> "Find everyone I follow who doesn't follow me back. Show me the list sorted by how long ago I followed them."

### Content
> "Analyze @paulg's writing style, then generate 3 tweet ideas about startups in his voice."

### Analytics
> "Compare the follower counts, tweet frequency, and engagement of @openai, @anthropic, and @google."

### Engagement
> "Search for tweets about 'AI agents' from the last day. Like the top 5 most engaging ones."

---

## Troubleshooting

### "Tool not found" or no tools showing

1. Make sure the MCP server is configured correctly in your client
2. Restart your AI client after changing config
3. Check that Node.js 18+ is installed: `node --version`

### "Could not follow/unfollow/post"

Auth is required for action tools. Make sure `XACTIONS_SESSION_COOKIE` is set in your MCP config `env`.

### "OPENROUTER_API_KEY required"

AI tools (voice analysis, tweet generation, thread summarization) need an OpenRouter API key. Get a free one at [openrouter.ai](https://openrouter.ai).

### Server won't start

```bash
# Test manually
node node_modules/xactions/src/mcp/server.js

# Or if globally installed
xactions-mcp
```

### Browser automation errors

XActions uses Puppeteer for browser automation. If you see Chrome/Chromium errors:

```bash
# Install Chromium dependencies (Linux)
npx puppeteer browsers install chrome
```

---

## Links

- **GitHub**: [github.com/nirholas/XActions](https://github.com/nirholas/XActions)
- **npm**: [npmjs.com/package/xactions](https://www.npmjs.com/package/xactions)
- **Dashboard**: [xactions.app](https://xactions.app)
- **Issues**: [github.com/nirholas/XActions/issues](https://github.com/nirholas/XActions/issues)

---

*Built by [@nichxbt](https://x.com/nichxbt). MIT License.*

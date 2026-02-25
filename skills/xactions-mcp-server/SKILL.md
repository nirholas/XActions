---
name: xactions-mcp-server
description: Free MCP server providing 68+ tools for AI agents to automate X/Twitter. Scrapes profiles, followers, tweets. Posts, follows, likes, retweets, downloads videos, analyzes sentiment, monitors brands, manages DMs, runs workflows, and more. Uses local Puppeteer -- no API keys or payments required. Compatible with Claude Desktop, Cursor, Windsurf, VS Code. Use when setting up or using AI agent Twitter automation via MCP.
license: MIT
compatibility: Requires Node.js 18+. Works with Claude Desktop, Cursor, Windsurf, VS Code, and MCP-compatible clients.
metadata:
  author: nichxbt
  version: "4.0"
---

# XActions MCP Server

The definitive free Twitter/X MCP server. 68+ tools for AI agents.

## Quick Start

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["xactions-mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

## Setup

### 1. Get auth_token
DevTools (F12) -> Application -> Cookies -> x.com -> copy `auth_token` value

### 2. Configure your client

**Claude Desktop:**
```bash
xactions mcp-config --client claude --write
```

**Cursor:**
```bash
xactions mcp-config --client cursor --write
```

**Windsurf / VS Code:**
```bash
xactions mcp-config --client windsurf --write
xactions mcp-config --client vscode --write
```

### 3. Restart your client

## Available Tools (68+)

### Scraping
`x_get_profile`, `x_get_followers`, `x_get_following`, `x_get_non_followers`, `x_get_tweets`, `x_search_tweets`, `x_get_thread`, `x_download_video`

### Actions
`x_follow`, `x_unfollow`, `x_unfollow_non_followers`, `x_post_tweet`, `x_like`, `x_retweet`, `x_delete_tweet`, `x_reply`, `x_bookmark`, `x_get_bookmarks`, `x_clear_bookmarks`, `x_auto_like`

### Analysis
`x_detect_unfollowers`, `x_best_time_to_post`, `x_analyze_sentiment`, `x_monitor_reputation`, `x_reputation_report`, `x_competitor_analysis`, `x_brand_monitor`

### Profile & Settings
`x_update_profile`, `x_get_settings`, `x_toggle_protected`, `x_get_blocked`, `x_check_premium`

### Content
`x_post_thread`, `x_create_poll`, `x_schedule_post`, `x_publish_article`

### Discovery
`x_get_trends`, `x_get_explore`

### Messaging
`x_send_dm`, `x_get_conversations`, `x_export_dms`

### AI (requires OPENROUTER_API_KEY)
`x_analyze_voice`, `x_generate_tweet`, `x_rewrite_tweet`, `x_summarize_thread`

### Advanced
- **Streaming:** `x_stream_start/stop/list/pause/resume/status/history`
- **Workflows:** `x_workflow_create/run/list/actions`
- **Social Graph:** `x_graph_build/analyze/recommendations/list`
- **Portability:** `x_export_account/migrate_account/diff_exports`

## Example Prompts

```
"Scrape @nichxbt's profile and last 50 tweets. What topics do they post about most?"

"Find my non-followers and unfollow them"

"Search for tweets about 'AI agents' and analyze the sentiment"

"Post a thread about the top 3 AI trends in 2026"

"Monitor brand mentions of 'XActions' for the last week"
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `XACTIONS_SESSION_COOKIE` | Yes | X auth_token for authentication |
| `OPENROUTER_API_KEY` | No | Enables AI tools (voice analysis, tweet generation) |

## Full Documentation
See `docs/mcp-setup.md` for complete setup guide with troubleshooting.

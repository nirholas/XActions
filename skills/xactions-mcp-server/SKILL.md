---
name: xactions-mcp-server
description: Free MCP server providing 15+ tools for AI agents to automate X/Twitter. Scrapes profiles, followers, and tweets. Posts tweets, follows/unfollows users, likes, retweets, downloads videos. Uses local Puppeteer automation — no API keys or payments required. Compatible with Claude Desktop, Cursor, and MCP-compatible agents. Use when setting up or configuring AI agent Twitter automation via MCP.
license: MIT
compatibility: Requires Node.js 18+. Local mode requires puppeteer. Works with Claude Desktop, Cursor, and MCP-compatible clients.
metadata:
  author: nichxbt
  version: "3.0"
---

# XActions MCP Server

Entry point: `src/mcp/server.js` — communicates via stdio transport.

## Configuration

```json
{
  "mcpServers": {
    "xactions": {
      "command": "node",
      "args": ["node_modules/xactions/src/mcp/server.js"],
      "env": {
        "XACTIONS_MODE": "local",
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `XACTIONS_MODE` | No | `local` | `local` (free, Puppeteer) or `remote` (cloud API) |
| `XACTIONS_SESSION_COOKIE` | Yes (local) | — | `auth_token` cookie from x.com |
| `XACTIONS_API_URL` | No | `https://api.xactions.app` | Remote mode API URL |
| `X402_PRIVATE_KEY` | No | — | Optional wallet key for remote mode micropayments |
| `X402_NETWORK` | No | `base-sepolia` | Optional: `base-sepolia` or `base` |

## Modes

**Local** (default, free): Puppeteer stealth browser automation. No API keys, no payments. Implemented in `src/mcp/local-tools.js`.

**Remote** (optional): Self-hosted XActions cloud API. Optionally supports x402 micropayments. Implemented in `src/mcp/x402-client.js`.

## Tool catalog

### Read operations
| Tool | Params | Returns |
|------|--------|---------|
| `x_login` | `cookie` | Session confirmation |
| `x_get_profile` | `username` | Bio, follower/following counts, verified status |
| `x_get_followers` | `username`, `limit?` (default: 100) | Array of `{ username, displayName, bio }` |
| `x_get_following` | `username`, `limit?` | Array with `followsYou` indicator |
| `x_get_non_followers` | `username` | Accounts not following back |
| `x_get_tweets` | `username`, `limit?` | Array of `{ text, likes, retweets, replies, timestamp, url }` |
| `x_search_tweets` | `query`, `limit?` | Same shape as tweets |
| `x_detect_unfollowers` | `username` | Snapshot comparison results |

### Write operations
| Tool | Params |
|------|--------|
| `x_follow` | `username` |
| `x_unfollow` | `username` |
| `x_unfollow_non_followers` | `username`, `limit?` |
| `x_post_tweet` | `text` |
| `x_like` | `tweet_url` or `tweet_id` |
| `x_retweet` | `tweet_url` or `tweet_id` |
| `x_download_video` | `tweet_url` → returns MP4 URLs |

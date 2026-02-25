# Getting Started with XActions

XActions is the complete X/Twitter automation toolkit. Browser scripts, CLI, Node.js library, MCP server for AI agents, and a web dashboard — all without Twitter API fees.

## Choose Your Interface

| Interface | Best For | Setup Time |
|-----------|----------|------------|
| **Browser Scripts** | Quick one-off tasks, free usage | 30 seconds |
| **CLI** | Power users, scripting, automation | 2 minutes |
| **Node.js Library** | Custom integrations, bots | 5 minutes |
| **MCP Server** | AI agents (Claude, GPT, Cursor) | 3 minutes |
| **Dashboard** | Visual monitoring, team use | 1 minute |
| **Browser Extension** | One-click automation from x.com | 1 minute |

---

## Quick Start: Browser Scripts (Free)

The fastest way to get started — paste a script into your browser console.

### 1. Navigate to x.com

Open [x.com](https://x.com) and log in. For unfollow scripts, go to `x.com/YOUR_USERNAME/following`.

### 2. Open DevTools Console

- **Windows/Linux:** `Ctrl + Shift + J`
- **Mac:** `Cmd + Option + J`

### 3. Copy & Paste a Script

Go to the [src/ folder](https://github.com/nirholas/XActions/tree/main/src) on GitHub, open a script, click **Copy raw file**, paste into the console, and press Enter.

**Popular scripts:**

| Task | Script |
|------|--------|
| Unfollow non-followers | `src/unfollowback.js` |
| Unfollow everyone | `src/unfollowEveryone.js` |
| Detect who unfollowed you | `src/detectUnfollowers.js` |
| Auto-like by keyword | `src/automation/autoLiker.js` |
| Scrape followers | `scripts/scrapeFollowers.js` |

> **Note:** Scripts in `src/automation/` require pasting `src/automation/core.js` first.

---

## Quick Start: CLI

```bash
npm install -g xactions
xactions login          # Saves your auth_token cookie
xactions profile elonmusk --json
xactions followers elonmusk --count 500 --output followers.csv
xactions non-followers myhandle
```

See the full [CLI Reference](cli-reference.md) for all 111 commands.

---

## Quick Start: Node.js Library

```bash
npm install xactions
```

```js
import { scrapeProfile, scrapeFollowers, searchTweets } from 'xactions';

const profile = await scrapeProfile('elonmusk', { cookie: process.env.X_COOKIE });
const followers = await scrapeFollowers('elonmusk', { count: 100, cookie: process.env.X_COOKIE });
const tweets = await searchTweets('javascript', { count: 50, cookie: process.env.X_COOKIE });
```

Multi-platform scraping:

```js
import { scrape } from 'xactions/scrapers';

const profile = await scrape('bluesky', 'profile', 'user.bsky.social');
const tweets = await scrape('mastodon', 'tweets', 'user@mastodon.social');
```

See the full [API Reference](api-reference.md) and [XActions Reference](xactions-reference.md).

---

## Quick Start: MCP Server (AI Agents)

Add XActions to Claude Desktop, Cursor, or any MCP-compatible client:

```json
{
  "mcpServers": {
    "xactions": {
      "command": "npx",
      "args": ["-y", "xactions", "mcp"],
      "env": {
        "XACTIONS_SESSION_COOKIE": "your_auth_token_here"
      }
    }
  }
}
```

Generate this config automatically:

```bash
xactions mcp-config
```

51+ MCP tools available — scraping, posting, engagement, analytics, streaming, and more. See [MCP Setup](mcp-setup.md).

---

## Quick Start: Dashboard

1. Deploy the API server (see [Deployment](deployment.md))
2. Open the dashboard at your deployment URL
3. Connect your browser by pasting the bridge script into your x.com tab
4. Run operations from the visual interface

---

## Quick Start: Browser Extension

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Navigate to x.com — the extension icon activates automatically

See [Extension Guide](extension.md).

---

## Authentication

All interfaces need an X/Twitter session cookie (`auth_token`):

1. Open [x.com](https://x.com) and log in
2. Open DevTools → Application → Cookies → `https://x.com`
3. Find the `auth_token` cookie and copy its value

| Interface | How to Set |
|-----------|------------|
| CLI | `xactions login` (interactive prompt) |
| Node.js | Pass `{ cookie: 'your_token' }` to functions |
| MCP | Set `XACTIONS_SESSION_COOKIE` env var |
| Dashboard | Pasted via bridge script |
| Extension | Reads automatically from x.com tab |

---

## Rate Limits & Safety

X/Twitter enforces aggressive rate limits. All XActions tools include built-in delays, but follow these guidelines:

- **Start small** — test with 10-20 actions before scaling up
- **1-3 second minimum delays** between actions (built into all scripts)
- **Batch large operations** — do 200, wait 15-30 minutes, repeat
- **Don't run multiple scripts simultaneously** on the same account
- **Keep your browser tab open** while operations run (browser scripts only)

---

## What's Next?

| Guide | Description |
|-------|-------------|
| [CLI Reference](cli-reference.md) | All 111 CLI commands |
| [API Reference](api-reference.md) | Node.js library functions |
| [MCP Setup](mcp-setup.md) | AI agent integration |
| [Browser Scripts](browser-scripts.md) | Complete script catalog |
| [Automation](automation.md) | Advanced browser automation framework |
| [Analytics](analytics.md) | Sentiment, reputation, history tracking |
| [Workflows](workflows.md) | Automated multi-step workflows |
| [Streaming](streaming.md) | Real-time tweet/follower/mention streams |
| [Social Graph](social-graph.md) | Network analysis and visualization |
| [Plugins](plugins.md) | Extend XActions with plugins |
| [Deployment](deployment.md) | Deploy to Railway, Fly.io, Docker |
| [Troubleshooting](troubleshooting.md) | Common issues and fixes |

---

*By [@nichxbt](https://x.com/nichxbt) — [GitHub](https://github.com/nirholas/XActions)*

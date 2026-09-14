# Getting Started with XActions

XActions is the complete X/Twitter automation toolkit. Browser scripts, CLI, Node.js library, MCP server for AI agents, and a web dashboard, all without Twitter API fees.

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

The fastest way to get started: paste a script into your browser console.

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
xactions login --from-browser firefox  # Import your session (or: --cookies-file, connect, login)
xactions profile elonmusk --json
xactions followers elonmusk --limit 500 --output followers.csv
xactions non-followers myhandle
```

See the full [CLI Reference](cli-reference.md) for all 56 commands.

Two global flags make the CLI easy to pipe into another program: `--compact`
prints one record per line with no colours or spinners, and `--fields` picks
the columns.

```bash
xactions --compact tweets NASA --limit 5
xactions --compact --fields id,likes,text tweets NASA --limit 5
```

Already have X's own data export? `xactions archive` reads the zip directly, so
you never scrape your own account:

```bash
xactions archive summary twitter-2026-01-01-abc123.zip
xactions archive export twitter-2026-01-01-abc123.zip --out exports/me
```

---

## Quick Start: Node.js Library

```bash
npm install xactions
```

`Scraper` is the HTTP-only client the CLI itself uses. It needs no browser, and
profiles and public timelines work with no login at all. Reads that return
lists (`getFollowers`, `searchTweets`, `getTweets`) are async generators, so
you iterate them with `for await`.

```js
import { Scraper } from 'xactions/client';

const x = new Scraper();

// Guest tier: no login needed.
const profile = await x.getProfile('NASA');
console.log(profile.name, profile.followersCount);

for await (const tweet of x.getTweets('NASA', 20)) {
  console.log(tweet.likes, tweet.text);
}
```

Search, followers, following, likes, bookmarks and DMs are session-tier: run
`xactions login` (or `xactions connect`) first, or pass the two cookies
yourself. Without them X answers those endpoints with a bare `404`.

```js
import { Scraper, SearchMode } from 'xactions/client';

const x = new Scraper();
await x.setCookies(`auth_token=${process.env.X_AUTH_TOKEN}; ct0=${process.env.X_CSRF_TOKEN}`);

for await (const tweet of x.searchTweets('javascript', 50, SearchMode.Latest)) {
  console.log(tweet.text);
}

for await (const follower of x.getFollowers(profile.id, 100)) {
  console.log(follower.username);
}
```

Multi-platform scraping goes through `scrape(platform, action, options)`. The
third argument is always an options object, and Bluesky and Mastodon need no
credentials for public reads:

```js
import { scrape } from 'xactions/scrapers';

const bsky = await scrape('bluesky', 'profile', { username: 'bsky.app' });
const masto = await scrape('mastodon', 'profile', {
  username: 'Gargron',
  instance: 'https://mastodon.social',
});
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

154 MCP tools are available: scraping, posting, engagement, analytics, streaming, and more. See [MCP Setup](mcp-setup.md).

Three flags shape what an agent gets. Run `npx xactions-mcp --help` for the full list.

```bash
npx xactions-mcp --list-groups                 # every tool group and its tools
npx xactions-mcp --tools read,analytics        # expose only these groups (or tool names, or prefix* patterns)
npx xactions-mcp --exclude write,automation    # hide these
npx xactions-mcp --require-approval            # hold every write call as a draft you approve by hand
npx xactions-mcp --http --port 8787            # Streamable HTTP on /mcp instead of stdio
```

`--tools` and `--exclude` also read `XACTIONS_MCP_TOOLS` and
`XACTIONS_MCP_EXCLUDE`, so you can set them in the `env` block above.
With `--require-approval`, a write tool returns a draft id instead of acting,
and nothing happens until you run `xactions drafts approve <id>` in your own
terminal. For `--http`, set `XACTIONS_MCP_TOKEN` and have the client send
`Authorization: Bearer <token>`.

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
4. Navigate to x.com. The extension icon activates automatically.

See [Extension Guide](extension.md).

---

## Authentication

All interfaces need an X/Twitter session cookie (`auth_token`, plus `ct0` for
search, bookmarks, and DMs). The CLI gives you four ways to capture it, fastest
first:

```bash
# 1. Read cookies straight out of your browser (no DevTools, no copy/paste)
xactions login --from-browser firefox     # also: chrome, chromium, brave, edge, arc

# 2. Import a cookies file you already exported
xactions login --cookies-file cookies.txt # Netscape, Cookie-Editor/EditThisCookie JSON,
                                          # Playwright/Puppeteer storageState, or a raw
                                          # "auth_token=...; ct0=..." string

# 3. Log in through a real browser window and let XActions capture the session
xactions connect

# 4. Paste the two cookies by hand
xactions login
```

`--from-browser` works headlessly for Firefox on every platform, and for
Chromium-family browsers on Linux (default keyring-less key) and macOS (via the
Keychain). If your browser seals its cookies with the system keyring (GNOME
Keyring / KWallet) or you are on Windows, XActions tells you the exact export
path to use with `--cookies-file` instead.

To export a cookies file by hand: install the "Get cookies.txt LOCALLY" or
Cookie-Editor extension, open [x.com](https://x.com) while logged in, and export.
Or, in DevTools (Application, then Cookies, then `https://x.com`), copy the
`auth_token` and `ct0` values.

| Interface | How to Set |
|-----------|------------|
| CLI | `xactions login --from-browser <name>`, `--cookies-file <path>`, `xactions connect`, or `xactions login` (paste) |
| Node.js | Pass `{ cookie: 'your_token' }` to functions |
| MCP | Set `XACTIONS_SESSION_COOKIE` env var |
| Dashboard | Pasted via bridge script |
| Extension | Reads automatically from x.com tab |

---

## Rate Limits & Safety

X/Twitter enforces aggressive rate limits. All XActions tools include built-in delays, but follow these guidelines:

- **Start small.** Test with 10-20 actions before scaling up.
- **1-3 second minimum delays** between actions (built into all scripts).
- **Batch large operations.** Do 200, wait 15-30 minutes, repeat.
- **Don't run multiple scripts simultaneously** on the same account.
- **Keep your browser tab open** while operations run (browser scripts only).

The MCP server enforces this for you. Every write tool is charged against a
persistent per-account daily budget (400 follows, 500 likes, 500 DMs, 2,400
posts by default), and a call that would go over is refused before it reaches
X. Ask an agent to call `x_action_budget` to see what is left.

---

## What's Next?

| Guide | Description |
|-------|-------------|
| [CLI Reference](cli-reference.md) | All 56 CLI commands |
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

*By [@nichxbt](https://x.com/nichxbt). [GitHub](https://github.com/nirholas/XActions)*

---

## Where to go next

- **[Tutorials](../tutorials/)**: guided walkthroughs, starting with
  [your first scrape](../tutorials/01-your-first-scrape.md)
- **[Examples](../examples/)**: runnable Node.js programs, each verified
  against the live API
- **[Browser scripts](browser-scripts.md)**: the full catalog of console scripts
- **[Troubleshooting](troubleshooting.md)**: when something does not work

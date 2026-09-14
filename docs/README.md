# XActions Documentation

> Complete documentation for XActions v3.5.0, the X/Twitter automation toolkit.

## Quick Links

| Guide | Description |
|-------|-------------|
| [Getting Started](getting-started.md) | Install, authenticate, run your first command |
| [Ask XActions](ask.md) | Ask anything at xactions.app/ask: sourced answers from the docs and the repo over free LLM lanes |
| [CLI Reference](cli-reference.md) | All 56 `xactions` commands and the subcommands under them |
| [API Reference](api-reference.md) | REST API across 40 route modules |
| [Hosted MCP server](mcp-remote.md) | Point any agent at `https://xactions.app/mcp` and read public X with no API key, no account, no install |
| [MCP Server](mcp-setup.md) | Set up the local MCP server for Claude, Cursor, Windsurf, GPT: 154 tools, write access, your own session |
| [Browser Scripts](browser-scripts.md) | 95 console scripts, generated from the scripts themselves |
| [Search Sweep](search-sweep.md) | Delete, like, repost, or reply to every result of an X search |
| [Engage a profile](engage.md) | Like, repost and reply across a whole profile, from the console or the CLI |
| [Automation Framework](automation.md) | Browser automation system |
| [Scraping Infrastructure](scraping-infrastructure.md) | Proxy rotation, stealth browser, pagination, datasets |
| [Streams](streams.md) | Tweet, follower and mention streams with persistent polling |
| [Notifications](notifications.md) | Email, Slack, Discord, Telegram and webhook delivery |
| [Dashboard](dashboard.md) | Web dashboard guide |
| [Video Downloader](video-downloader.md) | Download X/Twitter videos |
| [Media Archive](media-archive.md) | Bulk-download photos, videos, GIFs, avatars and banners with filename templates and an incremental archive |
| [Configuration](configuration.md) | Personas, niches, environment |
| [Database Schema](database.md) | PostgreSQL models (Prisma) |
| [Browser Extension](extension.md) | Chrome and Edge extension (Manifest V3) |
| [Deployment](deployment.md) | Deploy to Railway, Fly.io, Docker, and more |
| [Architecture](architecture.md) | System design and project structure |
| [Analytics & Monitoring](analytics.md) | Sentiment, reputation, follower tracking |
| [AI Features](ai-api.md) | AI tweet writer, voice analysis, Grok |
| [Skills Reference](skills.md) | 50 agent skills for AI assistants |
| [Plugins](plugins.md) | Extend scrapers, MCP tools and automation with `xactions-plugin-*` packages |
| [Workflows](workflows.md) | Declarative JSON pipelines with triggers, conditions and chained actions |
| [Spaces Agent](spaces-agent.md) | An AI voice agent that joins, listens and speaks in live Spaces |
| [DOM Selectors](dom-selectors.md) | X/Twitter DOM selector reference |
| [Troubleshooting](troubleshooting.md) | Common issues and fixes |
| [x402 payments](x402.md) | Pay per call in USDC on Solana or Base: no API key, no account, and how identity works over x402 and MCP |
| [Portability](portability.md) | Import your X data archive, export and migrate to Bluesky or Mastodon |
| [Audits](audits/2026-08-27-competitive-and-structural-audit.md) | Competitive gap analysis and repo health, with the open backlog |
| [Live site audit](audits/2026-08-27-live-site-feature-audit.md) | Every feature on xactions.app exercised in a real browser, with the root cause of each failure |

Building an agent on top of XActions? Start at [AGENTS.md](../AGENTS.md): it
answers whether to shell out to the CLI or load the MCP server before anything
else, and that choice is the one that costs a session when it is wrong.

## Interfaces

XActions provides **5 interfaces** to the same underlying toolkit:

```
┌─────────────────────────────────────────────────────┐
│                   XActions v3.5.0                   │
├──────────┬──────────┬───────┬──────────┬────────────┤
│  CLI     │  MCP     │  API  │ Dashboard│  Browser   │
│ xactions │ server   │ REST  │   Web UI │  Scripts   │
│  ↕       │   ↕      │  ↕    │    ↕     │     ↕      │
│ Terminal │ AI Agent │ HTTP  │ Browser  │  DevTools  │
└──────────┴──────────┴───────┴──────────┴────────────┘
```

1. **CLI**: `xactions <command>` from your terminal. 56 commands, grouped by task, with 85 subcommands under them.
2. **MCP Server**: 154 tools for Claude, Cursor, Windsurf, GPT. stdio or Streamable HTTP, filterable by tool group.
3. **REST API**: 40 route modules served at `localhost:3001/api`.
4. **Web Dashboard**: full-featured UI at `localhost:3001`.
5. **Browser Scripts**: 95 scripts you paste into DevTools on x.com, no install at all.

## Supported Platforms

| Platform | Scraping | Posting | Following | Export |
|----------|----------|---------|-----------|--------|
| X/Twitter | ✅ | ✅ | ✅ | ✅ |
| Bluesky | ✅ | ✅ | ✅ | ✅ |
| Mastodon | ✅ | ✅ | ✅ | ✅ |
| Threads | ✅ | no | no | ✅ |

## Requirements

Node.js 20 or newer. CI runs the full Vitest suite on Node 20, 22 and 24.

## Version

Current version: **v3.5.0** (August 2026)

---

*by nichxbt, [github.com/nirholas/xactions](https://github.com/nirholas/xactions)*

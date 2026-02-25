# XActions Documentation

> Complete documentation for XActions v3.1.0 — The X/Twitter Automation Toolkit

## Quick Links

| Guide | Description |
|-------|-------------|
| [Getting Started](getting-started.md) | Install, authenticate, run your first command |
| [CLI Reference](cli-reference.md) | All `xactions` CLI commands |
| [API Reference](api-reference.md) | REST API endpoints (170+) |
| [MCP Server](mcp-setup.md) | Set up MCP for Claude, Cursor, GPT |
| [Browser Scripts](browser-scripts.md) | Run scripts in DevTools console |
| [Automation Framework](automation.md) | Browser automation system |
| [Dashboard](dashboard.md) | Web dashboard guide |
| [Video Downloader](video-downloader.md) | Download X/Twitter videos |
| [Configuration](configuration.md) | Personas, niches, environment |
| [Database Schema](database.md) | PostgreSQL models (Prisma) |
| [Browser Extension](extension.md) | Chrome/Edge extension |
| [Deployment](deployment.md) | Deploy to Railway, Fly.io, Docker, etc. |
| [Architecture](architecture.md) | System design and project structure |
| [Analytics & Monitoring](analytics.md) | Sentiment, reputation, follower tracking |
| [AI Features](ai-api.md) | AI tweet writer, voice analysis, Grok |
| [Skills Reference](skills.md) | 31 agent skills for AI assistants |
| [DOM Selectors](dom-selectors.md) | X/Twitter DOM selector reference |
| [Troubleshooting](troubleshooting.md) | Common issues and fixes |

## Interfaces

XActions provides **5 interfaces** to the same underlying toolkit:

```
┌─────────────────────────────────────────────────────┐
│                   XActions v3.1.0                    │
├──────────┬──────────┬───────┬──────────┬────────────┤
│  CLI     │  MCP     │  API  │ Dashboard│  Browser   │
│ xactions │ server   │ REST  │   Web UI │  Scripts   │
│  ↕       │   ↕      │  ↕    │    ↕     │     ↕      │
│ Terminal │ AI Agent │ HTTP  │ Browser  │  DevTools  │
└──────────┴──────────┴───────┴──────────┴────────────┘
```

1. **CLI** — `xactions <command>` from your terminal
2. **MCP Server** — 87 tools for Claude, Cursor, Windsurf, GPT
3. **REST API** — 170+ endpoints at `localhost:3001/api`
4. **Web Dashboard** — Full-featured UI at `localhost:3001`
5. **Browser Scripts** — Paste into DevTools on x.com

## Supported Platforms

| Platform | Scraping | Posting | Following | Export |
|----------|----------|---------|-----------|--------|
| X/Twitter | ✅ | ✅ | ✅ | ✅ |
| Bluesky | ✅ | ✅ | ✅ | ✅ |
| Mastodon | ✅ | ✅ | ✅ | ✅ |
| Threads | ✅ | — | — | ✅ |

## Version

Current version: **v3.1.0** (February 2026)

---

*by nichxbt — [github.com/nirholas/xactions](https://github.com/nirholas/xactions)*

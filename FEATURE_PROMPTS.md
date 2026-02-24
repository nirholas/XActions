# XActions — Feature Build Prompts

Copy-paste these into AI chats (Claude, GPT, Copilot, etc.) to build each feature.
Each prompt is self-contained with full architecture context.

---

## 1. Plugin / Extension System

```
I'm building a plugin system for XActions, an open-source X/Twitter automation toolkit (github.com/nirholas/XActions).

Tech stack: Node.js 18+, ESM modules, Puppeteer, Express, Socket.IO, Prisma (PostgreSQL), MCP server.

Current structure:
- src/automation/ — browser console scripts (paste-and-run, use window.XActions namespace)
- src/scrapers/index.js — Puppeteer-based scrapers (exports: createBrowser, createPage, scrapeProfile, scrapeFollowers, etc.)
- src/mcp/server.js — MCP server with tool definitions for AI agents (uses @modelcontextprotocol/sdk, StdioServerTransport)
- src/cli/index.js — Commander-based CLI with inquirer prompts
- api/ — Express REST API with routes/, services/, middleware/

I want a plugin architecture so community members can create npm packages that extend XActions. Requirements:

1. Create `src/plugins/` with a plugin loader (`loader.js`) and plugin manager (`manager.js`)
2. Plugins should be npm packages named `xactions-plugin-*` or `@xactions/*`
3. A plugin exports a standard interface:
   - `name`, `version`, `description`
   - `actions[]` — browser console actions (added to window.XActions)
   - `scrapers[]` — Puppeteer scraper functions (added to scraper exports)
   - `tools[]` — MCP tool definitions (registered in MCP server)
   - `routes[]` — Express route handlers (mounted in API)
   - `hooks` — lifecycle hooks: onLoad, onUnload, beforeAction, afterAction
4. Add `xactions plugin install <name>`, `xactions plugin list`, `xactions plugin remove <name>` to the CLI
5. Plugins are registered in a local `~/.xactions/plugins.json` config
6. Create a `src/plugins/template/` with an example plugin that adds one scraper and one MCP tool
7. Add plugin discovery to the MCP server so AI agents can see community-added tools

Keep it simple. No complex dependency resolution. Just load ESM modules by convention.
Don't delete or modify existing files unnecessarily — add new files and hook into existing ones minimally.
```

---

## 2. Real-Time Event Streaming

```
I'm adding real-time event streaming to XActions (github.com/nirholas/XActions), an X/Twitter automation toolkit.

Already in the stack:
- Socket.IO initialized in api/realtime/socketHandler.js (auth via JWT, has rooms for agent/dashboard sessions)
- Puppeteer scrapers in src/scrapers/index.js (createBrowser, createPage, scrapeProfile, scrapeTweets, etc.)
- Express API on api/server.js
- Bull job queue in api/services/jobQueue.js
- Redis as a dependency

I want a streaming system where users can subscribe to live events from X/Twitter accounts. The scraper polls on an interval and pushes diffs over Socket.IO.

Build:

1. `src/streaming/` directory with:
   - `streamManager.js` — manages active streams, polling intervals, deduplication
   - `tweetStream.js` — watches a user's tweets, emits new ones
   - `followerStream.js` — watches follower count changes, emits follow/unfollow events
   - `mentionStream.js` — watches mentions of a username

2. Each stream:
   - Polls via Puppeteer scraper at configurable interval (default 60s)
   - Stores last-seen state in Redis for deduplication
   - Emits events via Socket.IO: `stream:tweet`, `stream:follower`, `stream:mention`
   - Has start/stop/status methods
   - Includes backoff on rate limit detection

3. API routes in `api/routes/streams.js`:
   - POST /api/streams — create a stream (type, target username, interval)
   - GET /api/streams — list active streams
   - DELETE /api/streams/:id — stop a stream
   - GET /api/streams/:id/history — recent events

4. Add MCP tools: `x_stream_start`, `x_stream_stop`, `x_stream_list` so AI agents can subscribe to real-time events

5. Socket.IO integration: clients join a room per stream ID, receive events in real-time

Keep Puppeteer instances pooled (max 3 browsers). Use Bull queue for scheduling polls.
```

---

## 3. AI Workflow Builder (Automation Pipelines)

```
I'm adding declarative automation workflows to XActions (github.com/nirholas/XActions).

Current stack: Node.js ESM, Puppeteer scrapers, Express API, MCP server, Bull job queue, Socket.IO, Prisma/PostgreSQL.

Existing automation scripts in src/automation/ are standalone browser console scripts. I want users to define multi-step pipelines as JSON that chain actions together with triggers and conditions.

Build:

1. `src/workflows/` directory with:
   - `engine.js` — workflow execution engine, processes steps sequentially
   - `triggers.js` — event triggers (schedule/cron, webhook, new tweet detected, follower threshold)
   - `actions.js` — wraps existing scraper and automation functions as workflow steps
   - `conditions.js` — conditional logic (if follower count > X, if tweet contains keyword, if sentiment < threshold)
   - `store.js` — workflow persistence (save/load from Prisma DB or JSON files)

2. Workflow definition format (JSON):
   {
     "name": "Competitor Monitor",
     "trigger": { "type": "schedule", "cron": "*/30 * * * *" },
     "steps": [
       { "action": "scrapeProfile", "target": "@competitor", "output": "profile" },
       { "condition": "profile.tweets[0].age < 30m" },
       { "action": "summarize", "input": "profile.tweets[0].text", "provider": "openrouter" },
       { "action": "postTweet", "text": "{{summary}} — my take: {{template}}" }
     ]
   }

3. Available actions should include all existing scrapers + automation functions + AI summarization via OpenRouter/local LLM

4. API routes in `api/routes/workflows.js`:
   - CRUD for workflows
   - POST /api/workflows/:id/run — manual trigger
   - GET /api/workflows/:id/runs — execution history with logs

5. CLI: `xactions workflow create`, `xactions workflow run <name>`, `xactions workflow list`

6. MCP tools: `x_workflow_create`, `x_workflow_run`, `x_workflow_list` for AI agents

7. Add 3 example workflow JSON files in `src/workflows/examples/`:
   - competitor-monitor.json
   - auto-engage-keywords.json
   - follower-growth-report.json

Use Bull queue for scheduled triggers. Store execution logs in Prisma DB.
```

---

## 4. Cross-Platform Support (Bluesky, Threads, Mastodon)

```
I'm adding multi-platform support to XActions (github.com/nirholas/XActions), currently X/Twitter only.

Current scrapers in src/scrapers/index.js use Puppeteer with stealth plugin. They export: createBrowser, createPage, scrapeProfile, scrapeFollowers, scrapeFollowing, scrapeTweets, etc.

I want to add Bluesky, Threads, and Mastodon behind a unified interface.

Build:

1. Restructure scrapers:
   - `src/scrapers/twitter/` — move existing Twitter scrapers here (keep backward compat re-exports in index.js)
   - `src/scrapers/bluesky/` — Bluesky scrapers (use AT Protocol — @atproto/api npm package, no Puppeteer needed, it's open)
   - `src/scrapers/threads/` — Threads scrapers (Puppeteer-based, same approach as Twitter)
   - `src/scrapers/mastodon/` — Mastodon scrapers (use public REST API with fetch, no Puppeteer needed, support any instance URL)
   - `src/scrapers/index.js` — unified interface that dispatches by platform

2. Unified interface:
   import { scrape } from 'xactions/scrapers';
   const profile = await scrape('bluesky', 'profile', { username: 'user.bsky.social' });
   const profile = await scrape('twitter', 'profile', { username: 'elonmusk' });
   // Backward compat: existing scrapeProfile() still works, defaults to Twitter

3. Bluesky: use @atproto/api package. Scrape profiles, posts, followers, feeds. Public data needs no auth.

4. Mastodon: use public REST API (just fetch). Support any instance URL as parameter.

5. Threads: Puppeteer-based scraping similar to Twitter approach.

6. Add `platform` parameter to MCP tools: x_scrape_profile gets an optional platform field, defaults to "twitter"

7. CLI: `xactions scrape profile --platform bluesky --username user.bsky.social`

8. Keep src/scrapers/index.js backward-compatible — all existing Twitter imports must still work unchanged.

Don't break any existing Twitter functionality. Mostly add new files, update index.js exports minimally.
```

---

## 5. Chrome/Firefox Browser Extension

```
I'm building a browser extension for XActions (github.com/nirholas/XActions), an X/Twitter automation toolkit.

Currently, users paste JavaScript into the browser console on x.com. The scripts use:
- window.XActions namespace
- src/automation/core.js as foundation (SELECTORS object with data-testid selectors, CONFIG with delays/limits, helpers: sleep, scrollToBottom, waitForElement, clickElement, etc.)
- Individual scripts in src/automation/ (autoLiker.js, smartUnfollow.js, followEngagers.js, keywordFollow.js, growthSuite.js, etc.)

I want a Chrome/Firefox extension (Manifest V3) that provides a popup UI to run these scripts without console access.

Build in a new `extension/` directory:

1. `extension/manifest.json` — Manifest V3, host permissions for x.com and twitter.com only
2. `extension/popup/` — popup HTML/CSS/JS:
   - Dashboard showing current X account info (scraped from page)
   - Toggle cards for each automation (auto-like, smart unfollow, keyword follow, growth suite, auto-commenter, follow engagers)
   - Settings panel per automation (delays, limits, keywords, bio filters)
   - Live activity log showing actions as they happen
   - Global start/stop controls
3. `extension/content/` — content scripts injected into x.com:
   - Bundles core.js + selected automation into the page context
   - Receives commands from popup via chrome.runtime messaging
   - Reports activity back to popup
4. `extension/background/` — service worker:
   - State management (which automations are active)
   - Badge updates (action count on extension icon)
   - Alarm-based scheduling for pausing/resuming
5. `extension/icons/` — placeholder icons (16, 48, 128px) with "XA" text

Key design decisions:
- Content script injects automation code into page context via script tag (needed for DOM access)
- Popup ↔ content script communication via chrome.runtime.sendMessage
- Settings persist in chrome.storage.local
- Activity count on extension badge
- Works on x.com and twitter.com

Vanilla JS, no framework. Dark theme matching X's aesthetic (#000, #1d9bf0 accent, #e7e9ea text).
No server connection required — fully standalone.
Include README.md with load-as-unpacked instructions for Chrome and temporary-addon for Firefox.
```

---

## 6. Visual Dashboard with Live Automation Controls

```
I'm enhancing the XActions dashboard (github.com/nirholas/XActions) with live automation controls.

Current state:
- dashboard/ has static HTML pages (index.html, run.html, admin.html, about.html, etc.)
- dashboard/js/ has client-side JavaScript
- api/realtime/socketHandler.js provides Socket.IO (auth via JWT, rooms for agent sessions + admin monitoring)
- Socket.IO client is already loaded in dashboard pages
- Dark theme, existing CSS styles

Build these new pages:

1. `dashboard/automations.html` — automation control panel:
   - Grid of automation cards (auto-like, smart unfollow, keyword follow, growth suite, auto-commenter, follow engagers)
   - Each card: name, icon, description, status badge (running/stopped), action count
   - Click card → settings modal (delays, limits, keywords, filters specific to that automation)
   - Start/Stop toggle per card
   - Global emergency stop button

2. `dashboard/monitor.html` — real-time monitoring:
   - Live scrolling activity feed (Socket.IO events: each follow, like, unfollow logged in real time)
   - Charts via Chart.js (CDN): actions/hour over last 24h, follower growth over last 7d, engagement rate trend
   - Account health panel: rate limit proximity bar, daily quota usage, time until quota reset
   - Active automations sidebar with quick stop buttons

3. `dashboard/workflows.html` — visual workflow builder:
   - Canvas area with drag-and-drop blocks
   - Block types: Trigger (schedule, event), Action (scrape, follow, like, post, summarize), Condition (if/else)
   - Connect blocks by dragging lines between them
   - Properties panel on click (configure each block)
   - Save/Load workflow as JSON via API
   - Run button

4. JavaScript files:
   - `dashboard/js/automations.js` — API calls to start/stop automations, Socket.IO status updates
   - `dashboard/js/monitor.js` — real-time event rendering, Chart.js initialization and updates
   - `dashboard/js/workflow-builder.js` — canvas-based drag-and-drop editor, serializes to JSON

5. API routes to add if missing:
   - POST /api/automations/:name/start
   - POST /api/automations/:name/stop
   - GET /api/automations/status

Vanilla JS only. Chart.js from CDN. Dark theme (#000 bg, #1d9bf0 accent, #e7e9ea text). Match existing dashboard styling.
```

---

## 7. Sentiment Analysis & Reputation Monitoring

```
I'm adding sentiment analysis and reputation monitoring to XActions (github.com/nirholas/XActions).

Stack: Node.js 18+ ESM, Puppeteer scrapers (scrapeProfile, scrapeTweets, search), Express API, Bull job queue, Prisma/PostgreSQL, Socket.IO, Redis.

The scrapers can already scrape tweets, replies, mentions, and search results via Puppeteer. I want an AI-powered analytics layer.

Build:

1. `src/analytics/` directory:
   - `sentiment.js` — sentiment analysis engine
     - Built-in rule-based analyzer as default (AFINN-style keyword scoring, negation handling, emoji scoring — zero dependencies, works offline)
     - Optional LLM mode via OpenRouter API (env: OPENROUTER_API_KEY) for nuanced analysis
     - Interface: analyzeSentiment(text) → { score: -1..1, label: 'positive'|'neutral'|'negative', confidence: 0..1, keywords: string[] }
   - `reputation.js` — reputation monitoring
     - Tracks sentiment over time for a username or keyword
     - Scrapes mentions/search periodically via Bull job
     - Computes: rolling average, trend direction (improving/declining/stable), volatility score
     - Detects anomalies: sudden negative spike triggers alert
   - `alerts.js` — alert delivery
     - Threshold alerts (sentiment drops below configurable value)
     - Volume alerts (unusual spike in mentions)
     - Delivery: console log, webhook POST to URL, Socket.IO event
   - `reports.js` — report generation
     - Daily/weekly summary: sentiment distribution pie chart data, top positive/negative tweets, trend data points
     - Export: JSON, formatted Markdown text

2. API routes `api/routes/analytics.js`:
   - POST /api/analytics/sentiment — analyze text or tweet URL
   - POST /api/analytics/monitor — start monitoring a username/keyword
   - GET /api/analytics/monitor/:id — get monitoring results
   - GET /api/analytics/reports/:username — get reputation report
   - DELETE /api/analytics/monitor/:id — stop monitoring

3. CLI:
   - `xactions sentiment "some text or tweet url"` — quick analysis
   - `xactions monitor @username` — start background monitoring
   - `xactions report @username` — generate report

4. MCP tools: `x_analyze_sentiment`, `x_monitor_reputation`, `x_reputation_report`

5. `dashboard/analytics.html`:
   - Sentiment timeline chart (Chart.js)
   - Recent mentions list color-coded by sentiment (green/gray/red)
   - Alert configuration form
   - Word cloud of frequent terms (simple CSS-based, no heavy lib)

Rule-based analyzer must work with zero config or API keys. LLM mode is opt-in.
Bull queue for background monitoring, polling every 15 minutes by default.
```

---

## 8. Account Portability / Twitter Exodus Tool

```
I'm building an account portability and migration tool for XActions (github.com/nirholas/XActions).

Existing Puppeteer scrapers: scrapeProfile, scrapeFollowers, scrapeFollowing, scrapeTweets (in src/scrapers/index.js), plus scripts for bookmarks, likes, DMs in src/ and scripts/ directories.

I want a comprehensive "export your entire Twitter life and optionally migrate to Bluesky/Mastodon" tool.

Build:

1. `src/portability/` directory:
   - `exporter.js` — orchestrates full account export
     - Scrapes: profile info, all tweets (paginated), followers list, following list, bookmarks, likes, lists
     - Output directory: `exports/<username>_<YYYY-MM-DD>/`
     - Output formats per data type: JSON (raw), CSV (spreadsheet), Markdown (readable)
     - Generates `index.html` — self-contained archive viewer (see archive-viewer below)
     - Progress callback: onProgress({ phase, completed, total, currentItem })
     - Handles pagination, rate limits, resume-on-failure (checkpoints in export dir)
   - `importer.js` — imports to other platforms
     - Bluesky: via @atproto/api — create posts from tweets, follow matching users
     - Mastodon: via REST API — create toots from tweets, follow matching users
     - User matching: finds same person on target platform by username similarity + bio matching
     - Dry run mode: shows what would happen without executing
   - `differ.js` — compares two exports
     - New/lost followers since last export
     - Deleted tweets
     - Engagement changes (like/retweet count diffs)
     - Output: summary JSON + readable Markdown report
   - `archive-viewer.js` — generates self-contained HTML archive
     - Single HTML file with embedded CSS + JS
     - Browseable: tweet timeline, follower directory, bookmarks, search
     - Client-side search (no server)
     - Responsive, works offline, looks clean

2. CLI commands:
   - `xactions export @username --format json,csv,html` — full export
   - `xactions export @username --only followers,tweets` — selective
   - `xactions migrate @username --to bluesky --dry-run` — preview
   - `xactions migrate @username --to bluesky` — execute
   - `xactions diff exports/user_2025-01/ exports/user_2025-02/` — compare

3. MCP tools: `x_export_account`, `x_migrate_account`, `x_diff_exports`

4. API routes `api/routes/portability.js`:
   - POST /api/portability/export — start export (Bull queue background job)
   - GET /api/portability/export/:id — check progress
   - GET /api/portability/export/:id/download — download archive
   - POST /api/portability/migrate — start migration

5. The archive viewer HTML should be beautiful — dark theme, card-based tweet display, pagination, profile header with stats. Single file, zero dependencies.

Prioritize: exporter + archive viewer first. Migration can have stubs that log what they would do.
```

---

## Suggested build order

1. **Plugin system** — unlocks community contributions, force multiplier
2. **Browser extension** — unlocks non-developer users, biggest TAM expansion
3. **Workflow builder** — "set it and forget it" automation, sticky retention
4. **Account portability** — viral potential, press-worthy during Twitter controversies
5. **Sentiment analysis** — unique in this space, high value for brands
6. **Real-time streaming** — power-user feature, leverages existing Socket.IO
7. **Cross-platform** — strategic moat, but highest effort
8. **Visual dashboard** — builds on other features, do last

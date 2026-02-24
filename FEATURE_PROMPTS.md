

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

## Phase 1 — Suggested build order

1. **Plugin system** — unlocks community contributions, force multiplier
2. **Browser extension** — unlocks non-developer users, biggest TAM expansion
3. **Workflow builder** — "set it and forget it" automation, sticky retention
4. **Account portability** — viral potential, press-worthy during Twitter controversies
5. **Sentiment analysis** — unique in this space, high value for brands
6. **Real-time streaming** — power-user feature, leverages existing Socket.IO
7. **Cross-platform** — strategic moat, but highest effort
8. **Visual dashboard** — builds on other features, do last

---
---

# Phase 2 — After the foundation is built

These prompts assume Phase 1 is complete: plugin system, browser extension, workflows, cross-platform scrapers, streaming, analytics, portability, and dashboard are all in place.

---

## 9. Social Graph Visualization & Network Mapping

```
I'm adding social graph analysis and visualization to XActions (github.com/nirholas/XActions).

What already exists:
- src/scrapers/ — multi-platform scrapers (Twitter, Bluesky, Mastodon, Threads) with unified interface: scrape(platform, type, opts)
- src/scrapers/twitter/ — scrapeFollowers, scrapeFollowing return user lists with metadata
- src/analytics/ — sentiment.js, reputation.js, alerts.js, reports.js
- src/streaming/ — real-time event streams for tweets, followers, mentions
- src/workflows/ — declarative JSON automation pipelines with engine, triggers, conditions
- api/ — Express REST API with Prisma/PostgreSQL, Bull queue, Socket.IO, Redis
- dashboard/ — static HTML pages with Chart.js, dark theme, existing analytics.html and monitor.html
- extension/ — Manifest V3 browser extension

I want to build a social graph analyzer that maps relationships between accounts, identifies clusters, finds bridge accounts, and visualizes networks.

Build:

1. `src/graph/` directory:
   - `builder.js` — builds graph data structure from scraper data
     - Nodes: accounts (with metadata: followers, following, bio, verification)
     - Edges: follows, mutual follows, interactions (replies, quotes, likes)
     - Crawls N degrees deep from a seed account (configurable depth, default 2)
     - Respects rate limits, checkpoints progress to resume interrupted crawls
   - `analyzer.js` — graph algorithms
     - Mutual connections: who follows you AND you follow back
     - Bridge accounts: users who connect otherwise separate clusters
     - Cluster detection: groups of tightly connected users (community detection)
     - Influence scoring: PageRank-style scoring within the scraped subgraph
     - Ghost followers: accounts that follow but never engage
     - Orbit analysis: inner circle (frequent interactions) vs outer ring (follows only)
   - `visualizer.js` — generates visualization data
     - Exports to D3.js-compatible JSON (nodes + links)
     - Exports to Gephi-compatible GEXF format
     - Generates self-contained HTML visualization (force-directed graph using D3.js embedded)
     - Color coding: clusters, influence score, sentiment toward you
   - `recommendations.js` — actionable insights
     - "Follow these people" — well-connected accounts in your niche you don't follow
     - "Engage with these" — high-influence accounts who follow you but you don't interact with
     - "Watch these" — accounts your competitors all follow but you don't
     - "Safe to unfollow" — accounts with zero engagement overlap

2. API routes `api/routes/graph.js`:
   - POST /api/graph/build — start graph crawl (Bull queue job, takes hours for large networks)
   - GET /api/graph/:id — get graph data
   - GET /api/graph/:id/analysis — get computed metrics
   - GET /api/graph/:id/recommendations — get follow/engage recommendations
   - GET /api/graph/:id/visualization — get D3.js-ready JSON

3. CLI:
   - `xactions graph @username --depth 2` — build graph
   - `xactions graph @username --analyze` — run analysis on existing graph
   - `xactions graph @username --export gephi` — export for Gephi
   - `xactions graph @username --visualize` — generate standalone HTML visualization

4. MCP tools: `x_graph_build`, `x_graph_analyze`, `x_graph_recommendations`

5. `dashboard/graph.html` — interactive graph visualization page
   - D3.js force-directed layout (load from CDN)
   - Click node to see profile details
   - Filter by cluster, influence, engagement
   - Highlight mutual connections
   - Zoom, pan, search

Graph building is expensive — always use Bull queue. Store graph snapshots in DB for comparison over time.
No external graph database — use in-memory adjacency lists, serialize to JSON in PostgreSQL.
```

---

## 10. A/B Testing for Tweets & Content Optimization

```
I'm adding tweet A/B testing and content optimization to XActions (github.com/nirholas/XActions).

What already exists:
- src/scrapers/ — multi-platform scrapers, scrapeTweets returns engagement metrics (likes, retweets, replies, views)
- src/analytics/ — sentiment analysis, reputation monitoring
- src/workflows/ — automation pipelines with triggers and conditions
- src/streaming/ — real-time event streams
- api/ — Express API, Prisma/PostgreSQL, Bull queue
- src/cli/index.js — Commander CLI with inquirer
- src/mcp/server.js — MCP server for AI agents

I want users to test tweet variations and get statistically valid results on what performs best.

Build:

1. `src/experiments/` directory:
   - `experiment.js` — experiment management
     - Create experiment: name, hypothesis, variants (2-5 tweet variations)
     - Each variant is a tweet draft with different text, media, hashtags, or posting time
     - Posts variants at similar times (or tests different times as the variable)
     - Tracks: impressions, likes, retweets, replies, link clicks, profile visits, follower gain
   - `scheduler.js` — intelligent posting scheduler
     - Posts variants at optimal comparison windows (same day of week, similar time)
     - Can test: text variations, hashtag sets, time of day, with/without media, thread vs single
     - Spacing between variants (configurable, default 4 hours)
   - `stats.js` — statistical analysis
     - Engagement rate comparison with confidence intervals
     - Chi-squared test for significance (are results real or noise?)
     - Sample size calculator: "you need N more impressions for 95% confidence"
     - Winner declaration with p-value
   - `insights.js` — pattern detection across experiments
     - "Tweets with questions get 2.3x more replies"
     - "Posts between 9-11am get 40% more impressions"
     - "Threads outperform single tweets by 1.8x for you"
     - Uses historical data from all past tweets, not just experiments
   - `templates.js` — AI-powered variant generation
     - Given a tweet draft, generates N variations using OpenRouter/local LLM
     - Varies: tone, structure, hook, CTA, emoji usage, hashtags
     - Can generate variations optimized for different metrics (engagement vs reach)

2. API routes `api/routes/experiments.js`:
   - POST /api/experiments — create experiment
   - GET /api/experiments — list experiments
   - GET /api/experiments/:id — get results
   - POST /api/experiments/:id/publish — post next variant
   - GET /api/experiments/insights — cross-experiment insights

3. CLI:
   - `xactions experiment create "Tweet text" --variants 3` — auto-generate variants and create experiment
   - `xactions experiment list` — show active experiments
   - `xactions experiment results <id>` — show results with statistics

4. MCP tools: `x_experiment_create`, `x_experiment_results`, `x_content_insights`

5. `dashboard/experiments.html`:
   - Create experiment form (paste tweet, generate variants, review, launch)
   - Results comparison table with bar charts
   - Statistical significance indicator (green = significant, yellow = needs more data)
   - Historical insights panel

The stats module should use no external deps — implement chi-squared and confidence intervals in pure JS.
```

---

## 11. AI Agent Personas & Auto-Engagement Profiles

```
I'm adding AI agent personas to XActions (github.com/nirholas/XActions).

What already exists:
- src/mcp/server.js — MCP server with tools for AI agents
- src/automation/ — auto-liker, auto-commenter, keyword follow, growth suite, etc.
- src/analytics/sentiment.js — sentiment analysis (rule-based + optional LLM)
- src/workflows/ — declarative automation pipelines
- src/streaming/ — real-time tweet/follower/mention streams
- Browser scripts use window.XActions namespace with CONFIG and templates
- api/ — Express API, Prisma/PostgreSQL, Bull queue, Socket.IO

I want users to define AI "personas" — profiles that dictate HOW the automation engages. Instead of generic "Great point!" replies, each persona has a distinct voice, topic expertise, engagement rules, and boundaries.

Build:

1. `src/personas/` directory:
   - `persona.js` — persona definition and management
     - Persona schema: { name, voice, topics, tone, boundaries, replyStyle, engagementRules }
     - voice: writing style description ("casual tech bro", "thoughtful analyst", "witty commentator")
     - topics: areas of expertise and interest ["AI", "crypto", "startups"]
     - tone: "professional" | "casual" | "humorous" | "provocative" | "supportive"
     - boundaries: never discuss, never engage with, block topics
     - replyStyle: { maxLength, useEmojis, askQuestions, addValue, mentionSelf }
     - engagementRules: { likeThreshold, replyThreshold, followBackCriteria, ignorePatterns }
   - `generator.js` — AI-powered reply generation
     - Takes: persona + tweet being replied to + thread context
     - Uses OpenRouter/local LLM to generate on-brand reply
     - Validates reply against persona boundaries before posting
     - Fallback to template-based replies if no LLM key configured
     - Anti-detection: varies sentence structure, avoids repetition across replies
   - `scheduler.js` — engagement scheduling per persona
     - Each persona has active hours, daily limits, cooldown periods
     - Distributes engagement naturally (not all at once)
     - Adjusts behavior based on account health signals
   - `memory.js` — conversation memory
     - Tracks who persona has interacted with, what was said
     - Avoids replying to same user too frequently
     - Builds relationship context: "I've agreed with @user 3 times this week, vary approach"
     - Stores in Redis for fast lookup, PostgreSQL for persistence

2. Pre-built persona templates in `src/personas/templates/`:
   - `thought-leader.json` — shares insights, asks thoughtful questions, engages with data
   - `community-builder.json` — welcomes newcomers, amplifies others, supportive tone
   - `growth-hacker.json` — strategic engagement, targets high-influence accounts, value-add replies
   - `curator.json` — finds and quote-tweets great content in niche, minimal original commentary
   - `contrarian.json` — respectfully challenges popular takes with data/logic

3. API routes `api/routes/personas.js`:
   - CRUD for personas
   - POST /api/personas/:id/activate — start engaging with this persona
   - POST /api/personas/:id/deactivate — stop
   - GET /api/personas/:id/stats — engagement metrics for this persona
   - GET /api/personas/:id/history — interaction log

4. CLI:
   - `xactions persona create --template thought-leader --name "My Brand Voice"`
   - `xactions persona list`
   - `xactions persona activate <name>`
   - `xactions persona stats <name>`

5. MCP tools: `x_persona_create`, `x_persona_activate`, `x_persona_reply` (generate a reply as persona without posting)

6. `dashboard/personas.html`:
   - Persona cards with avatar, voice description, topic tags
   - Activate/deactivate toggles
   - Stats per persona: replies sent, engagement received, follower gain attributed
   - Recent interaction log
   - Edit persona settings

This is the key differentiator — nobody else has persona-driven engagement. The LLM integration via OpenRouter (env: OPENROUTER_API_KEY) is optional but recommended. Template-based fallback must work without any API key.
```

---

## 12. Fake Follower & Bot Detection

```
I'm adding fake follower and bot detection to XActions (github.com/nirholas/XActions).

What already exists:
- src/scrapers/ — multi-platform scrapers, scrapeFollowers/scrapeFollowing return user lists with metadata (bio, follower count, following count, tweet count, join date, profile pic, verification)
- src/analytics/ — sentiment analysis, reputation monitoring
- src/graph/ — social graph builder and analyzer (Phase 2 #9)
- api/ — Express API, Prisma/PostgreSQL, Bull queue
- src/cli/ and src/mcp/ for CLI and AI agent interfaces

I want to analyze followers of any account and detect bots, fake followers, and low-quality accounts.

Build:

1. `src/detection/` directory:
   - `botScore.js` — bot probability scoring
     - Heuristic signals (0-100 score):
       - Default profile pic / no avatar: +20
       - No bio or very short bio: +10
       - Username pattern: random chars, many numbers: +15
       - Following >> followers ratio (>10x): +15
       - Account age < 30 days with high activity: +10
       - Tweet content: all retweets, no originals: +10
       - Posting pattern: suspiciously regular intervals: +10
       - Duplicate/similar tweets: +10
       - Follows thousands, minimal followers: +10
     - Returns: { score, label: 'likely_bot'|'suspicious'|'likely_human', signals: string[] }
   - `audienceAudit.js` — full audience analysis
     - Scans N followers (configurable, default 500, random sample)
     - Computes: % likely bots, % suspicious, % legitimate
     - Compares to industry benchmarks
     - Identifies clusters of fake followers (similar join dates, similar bios)
     - Detects follow-back schemes
   - `trendDetector.js` — detect fake follower purchases
     - Analyzes follower growth timeline
     - Flags sudden spikes (gained 1000 followers in 1 hour = likely purchased)
     - Cross-references spike followers against bot score
   - `cleaner.js` — bulk actions on detected bots
     - Generate block/remove list for detected bots
     - Dry run mode: show what would be blocked
     - Export bot list as CSV
     - Integration with existing blockBots.js and removeFollowers.js

2. API routes `api/routes/detection.js`:
   - POST /api/detection/audit — start audience audit (Bull queue)
   - GET /api/detection/audit/:id — get audit results
   - POST /api/detection/score — score a single user
   - POST /api/detection/clean — block/remove detected bots (with confirmation)

3. CLI:
   - `xactions audit @username` — audit an account's followers
   - `xactions audit @username --depth full` — audit all followers (slow)
   - `xactions score @username` — bot score a single account
   - `xactions clean @myaccount --dry-run` — preview bot removal

4. MCP tools: `x_audit_followers`, `x_bot_score`, `x_clean_bots`

5. `dashboard/audit.html`:
   - Audience quality donut chart (bots / suspicious / legit)
   - Scrollable list of flagged accounts with scores and signals
   - Bulk action buttons (block all, remove all, export CSV)
   - Growth timeline with spike detection markers
   - Compare: "Your audience quality vs @competitor"

All detection is heuristic-based — no external API calls, no ML models, works offline.
Sample-based by default for speed — full audit is opt-in.
```

---

## 13. Smart DM CRM & Outreach Automation

```
I'm adding DM management and outreach automation to XActions (github.com/nirholas/XActions).

What already exists:
- src/sendDirectMessage.js, src/dmManager.js — existing DM scripts
- src/scrapers/ — multi-platform scrapers
- src/personas/ — AI persona system with LLM-powered reply generation (Phase 2 #11)
- src/analytics/sentiment.js — sentiment analysis
- src/workflows/ — automation pipelines
- api/ — Express API, Prisma/PostgreSQL, Bull queue, Socket.IO

I want a lightweight CRM for Twitter DMs — track conversations, automate outreach, manage leads.

Build:

1. `src/crm/` directory:
   - `contacts.js` — contact management
     - Import contacts from: followers list, following list, DM history, CSV upload, manual add
     - Contact schema: { username, name, bio, tags[], notes, sentiment, lastInteraction, status, source }
     - Status: lead | contacted | replied | engaged | converted | archived
     - Tag system: user-defined labels ("potential-collab", "investor", "customer")
   - `outreach.js` — automated outreach campaigns
     - Campaign: { name, template, targets, schedule, followUp }
     - Personalized DMs using templates with {{username}}, {{bio_keyword}}, {{mutual_follows}} variables
     - AI personalization via persona system (optional, use OpenRouter)
     - Follow-up sequences: if no reply after N days, send follow-up (max 2 follow-ups)
     - Respects daily DM limits (configurable, default 20/day)
     - Staggered sending: random delays between DMs
   - `inbox.js` — smart inbox management
     - Categorize incoming DMs: priority (from contacts), spam, automated, personal
     - Auto-archive spam/automated DMs
     - Quick reply templates
     - Sentiment analysis on incoming messages
   - `pipeline.js` — visual pipeline tracking
     - Kanban-style stages: New → Contacted → Replied → Engaged → Converted
     - Move contacts between stages manually or automatically based on interactions
     - Stage metrics: conversion rates, average time in stage

2. API routes `api/routes/crm.js`:
   - CRUD for contacts (with filtering, search, tags)
   - CRUD for campaigns
   - POST /api/crm/campaigns/:id/start — launch campaign
   - GET /api/crm/pipeline — get pipeline with contacts per stage
   - GET /api/crm/inbox — categorized DM inbox

3. CLI:
   - `xactions crm import --from followers` — import followers as contacts
   - `xactions crm campaign create --template "Hey {{username}}..." --targets tag:investors`
   - `xactions crm inbox` — show categorized inbox
   - `xactions crm pipeline` — show pipeline stats

4. MCP tools: `x_crm_add_contact`, `x_crm_campaign_create`, `x_crm_pipeline`, `x_crm_inbox`

5. `dashboard/crm.html`:
   - Contact list with search, filter by tag/status, bulk actions
   - Campaign builder: write template, select targets, set schedule, preview
   - Pipeline kanban board (drag contacts between stages)
   - Inbox view with sentiment badges and quick reply

DMs are sensitive — always default to dry-run mode. Never send without explicit user confirmation.
Daily limits are hard-enforced, not configurable above 50/day.
```

---

## 14. Viral Prediction & Content Intelligence

```
I'm adding viral prediction and content intelligence to XActions (github.com/nirholas/XActions).

What already exists:
- src/scrapers/ — scrapeTweets, scrapeSearch return tweets with engagement metrics
- src/viralTweetDetector.js — existing viral tweet detection script
- src/analytics/ — sentiment analysis, reputation monitoring
- src/experiments/ — A/B testing with statistical analysis (Phase 2 #10)
- src/tweetPerformance.js, src/bestTimeToPost.js — existing analysis scripts
- api/ — Express API, Prisma/PostgreSQL, Bull queue
- Dashboard with Chart.js

I want to predict which tweets will go viral before they do, and give users data-driven content recommendations.

Build:

1. `src/intelligence/` directory:
   - `viralPredictor.js` — early viral detection
     - Monitor a user's timeline or search feed
     - Track engagement velocity: likes/minute, retweets/minute in first 30 min
     - Compare velocity to historical baseline for that account
     - Alert when a tweet is trending 3x+ above baseline = "going viral"
     - Predict final reach based on early velocity curve (simple exponential fit)
   - `contentAnalyzer.js` — analyze what makes content perform
     - Analyze last N tweets from any account
     - Extract features: length, has media, has link, question mark, emoji count, hashtag count, time posted, day of week, thread vs single, tone/sentiment
     - Correlate features with engagement metrics
     - Output: ranked list of content features that drive engagement for this account
     - "Your threads get 3x more engagement than single tweets"
     - "Tuesday 10am is your best posting time"
   - `trendScout.js` — find trending topics early
     - Monitor Twitter search/explore for emerging trends
     - Track hashtag velocity (mentions/hour acceleration)
     - Categorize trends by topic area
     - Alert when a trend related to user's topics is emerging
   - `hookGenerator.js` — AI-powered tweet writing assistant
     - Analyzes user's top-performing tweets for style patterns
     - Given a topic, generates tweet hooks in the user's voice
     - Uses OpenRouter/LLM (optional) or template-based patterns
     - Suggests: hooks, CTAs, thread structures, hashtag combinations
   - `benchmark.js` — competitive benchmarking
     - Compare any two accounts: engagement rate, posting frequency, content mix, growth rate
     - Industry benchmarks: "Your engagement rate is top 15% for accounts your size"
     - Track competitor metrics over time

2. API routes `api/routes/intelligence.js`:
   - POST /api/intelligence/predict — analyze a tweet URL for viral potential
   - GET /api/intelligence/analyze/@username — content performance analysis
   - GET /api/intelligence/trends — current trending topics in user's niche
   - POST /api/intelligence/generate — generate tweet hooks for a topic
   - GET /api/intelligence/benchmark — compare two accounts

3. CLI:
   - `xactions predict <tweet-url>` — viral prediction for a tweet
   - `xactions analyze @username` — content performance report
   - `xactions trends --topics "AI,crypto"` — trending in your niche
   - `xactions hooks "topic"` — generate tweet hooks
   - `xactions benchmark @me @competitor`

4. MCP tools: `x_predict_viral`, `x_analyze_content`, `x_find_trends`, `x_generate_hooks`, `x_benchmark`

5. `dashboard/intelligence.html`:
   - Viral radar: tweets from your feed with velocity indicators (🟢 normal, 🟡 heating up, 🔴 going viral)
   - Content report: feature-engagement correlation charts
   - Trend feed: emerging trends color-coded by relevance to your topics
   - Hook generator form: enter topic, get 5 suggestions
   - Benchmark comparison table

All prediction uses simple math (velocity, averages, ratios) — no ML models needed.
LLM features (hook generator) are optional, fallback to template patterns.
```

---

## 15. Team Workspaces & Multi-User Access

```
I'm adding team/multi-user support to XActions (github.com/nirholas/XActions).

What already exists:
- api/ — Express API with JWT auth, Prisma User model (id, email, username, password, isAdmin)
- api/middleware/auth.js — JWT authentication middleware
- api/routes/auth.js — login, register, token refresh
- dashboard/ — static HTML pages with auth (login.html, admin.html)
- src/personas/ — AI personas (Phase 2)
- src/crm/ — contact and outreach management (Phase 2)
- src/workflows/ — automation pipelines
- Prisma schema in prisma/schema.prisma

I want teams to share automations, workflows, personas, and contacts — with role-based access control.

Build:

1. Prisma schema additions (add to prisma/schema.prisma):
   - Team model: { id, name, slug, plan, createdAt }
   - TeamMember model: { teamId, userId, role: 'owner'|'admin'|'member'|'viewer', invitedAt, joinedAt }
   - Add teamId foreign key to: Workflow, Persona, Contact, Campaign, Experiment
   - Invitation model: { teamId, email, role, token, expiresAt, acceptedAt }

2. `api/routes/teams.js`:
   - POST /api/teams — create team
   - GET /api/teams/:id — get team details
   - POST /api/teams/:id/invite — invite member by email
   - POST /api/teams/join/:token — accept invitation
   - PATCH /api/teams/:id/members/:userId — change role
   - DELETE /api/teams/:id/members/:userId — remove member
   - GET /api/teams/:id/activity — team activity log

3. `api/middleware/team-auth.js` — team authorization middleware
   - Extracts teamId from request (header or query param)
   - Validates user is member of team
   - Checks role permissions: viewer (read), member (read+write), admin (manage), owner (all)
   - Scopes all queries to team: workflows, personas, contacts, experiments

4. Update existing routes to be team-aware:
   - All CRUD routes filter by teamId when present
   - Personal vs team resources: user can have personal workflows AND team workflows
   - Activity logging: who did what, when

5. CLI:
   - `xactions team create "My Team"` — create team
   - `xactions team invite user@email.com --role member`
   - `xactions team switch <team-name>` — switch active team context
   - `xactions team list` — list your teams

6. `dashboard/team.html`:
   - Team management page: members list with roles
   - Invite form
   - Team activity feed
   - Resource overview: how many workflows, personas, contacts the team has

7. `dashboard/js/team.js` — team switching dropdown in header, team context for all API calls

Keep it simple — no billing/plan enforcement, just the access control layer.
Personal resources remain private. Team resources are shared with all members.
Invitation tokens expire after 7 days.
```

---

## 16. Marketplace & Plugin Store

```
I'm adding a plugin marketplace to XActions (github.com/nirholas/XActions).

What already exists:
- src/plugins/ — plugin system with loader.js, manager.js, template/
- Plugins are npm packages named xactions-plugin-* or @xactions/*
- ~/.xactions/plugins.json tracks installed plugins
- src/mcp/server.js discovers and registers plugin tools
- src/cli/index.js has `xactions plugin install/list/remove` commands
- api/ — Express API, Prisma/PostgreSQL
- dashboard/ — static HTML pages

I want a browsable marketplace where users can discover, rate, and install community plugins.

Build:

1. `api/routes/marketplace.js`:
   - GET /api/marketplace — list published plugins (search, filter by category, sort by installs/rating)
   - GET /api/marketplace/:name — plugin details
   - POST /api/marketplace — publish a plugin (auth required)
   - POST /api/marketplace/:name/review — rate and review (1-5 stars + text)
   - GET /api/marketplace/:name/reviews — get reviews
   - POST /api/marketplace/:name/install — record install (for counting, actual install is via CLI)

2. Prisma models:
   - Plugin: { name, displayName, description, author, version, category, npmPackage, readme, downloads, rating, createdAt }
   - PluginReview: { pluginId, userId, rating, text, createdAt }
   - Categories: scraper, automation, analytics, integration, theme, utility

3. Plugin publishing flow:
   - Author creates xactions-plugin-* npm package following template
   - Author runs `xactions plugin publish` which:
     - Validates package.json has required xactions fields
     - Reads README.md
     - POSTs metadata to marketplace API
   - Marketplace stores metadata (not the package itself — npm handles distribution)

4. CLI additions:
   - `xactions marketplace search "keyword"` — search plugins
   - `xactions marketplace info <plugin-name>` — details + reviews
   - `xactions plugin publish` — publish to marketplace
   - `xactions marketplace featured` — curated/featured plugins

5. `dashboard/marketplace.html`:
   - Plugin browser: search bar, category filters, sort by popularity/rating/newest
   - Plugin cards: name, description, author, rating stars, install count, category badge
   - Plugin detail page: full readme, reviews, install command, version history
   - "Install" button (copies CLI command or triggers API)
   - "Publish your plugin" guide

6. Plugin validation:
   - Must have: name, version, description, xactions engine compatibility version
   - Must export at least one of: actions, scrapers, tools, routes
   - README.md required
   - No malicious patterns check (basic static analysis — no eval, no fs.write outside plugin dir)

Keep marketplace lightweight. npm does the heavy lifting for distribution.
The marketplace API just indexes metadata and manages reviews.
```

---

## Phase 2 — Suggested build order

1. **Social graph** (#9) — unique, visual, shareable — nobody in this space has it
2. **Bot detection** (#12) — high demand, works with existing scrapers, standalone value
3. **Viral prediction** (#14) — "early viral alert" is a killer feature, simple math
4. **AI personas** (#11) — key differentiator, makes engagement automation actually smart
5. **A/B testing** (#10) — creators will love this, builds on analytics foundation
6. **DM CRM** (#13) — monetizable, high value for agencies and creators
7. **Team workspaces** (#15) — unlocks B2B use case, needs other features first
8. **Marketplace** (#16) — needs healthy plugin ecosystem first, do last

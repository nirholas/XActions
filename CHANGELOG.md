# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Fixed

#### Hosted API server crash on boot
- `api/routes/teams.js` default-imported `authMiddleware` from a module that only has named exports — in ESM that's a hard `SyntaxError` at startup, not a warning, so the hosted API server crashed before it could ever answer a health check. This is why xactions.app's dashboard pages (graph, analytics, unfollowers, admin, price-correlation) were showing "backend offline." Fixed and verified with a full local Docker build + boot against a real Postgres container: server starts cleanly, migrations run, `/api/health`, register, login, and authenticated reads all respond correctly. Swept the whole `api/`, `src/`, and `worker/` tree for the same class of bug — no other instances found.

#### Browser console scripts: 64 files audited
- Every script in `scripts/twitter/` (beyond the two already rewritten) was read end-to-end and fixed where real bugs were found. Highlights: all scripts using top-level `const CONFIG` broke on re-paste into an already-open DevTools console (a `SyntaxError`, since `const`/`let` bindings persist across console pastes in the same tab) — fixed to `var` everywhere. Added consistent `window.stopX()` abort switches to every long-running loop that lacked one. Fixed stale-DOM bugs in `mass-unblock.js`/`mass-unmute.js` (cached elements pointing at rows already removed from a virtualized list), a wrong-author-attribution bug on quote-tweets in `bookmark-exporter.js`, a duplicate-processing risk in the hashtag/location commenters, several `window.location.href` reloads that silently killed the running script mid-workflow, and wired up half-implemented options (filters, reply templates, video quality selection) that were declared but never actually checked.

### Added

#### Google Cloud Run deployment for the hosted API
- `deploy/gcp/provision-api.sh` + `deploy/gcp/cloudbuild-api.yaml`: one-shot provisioning (Cloud SQL Postgres, Secret Manager, IAM) and build/deploy for the `xactions-api` Cloud Run service, reusing the existing Memorystore Redis instance instead of standing up new infra. `api/services/jobQueue.js`'s Bull queue now namespaces its Redis keys so it can safely share that instance.

#### Cloudflare Workers Deployment
- Full-site Cloudflare deploy: one Worker serves the landing page, dashboard, docs, blog, and static assets from Workers static assets, replacing the Vercel deployment
- Edge API in the Worker: `/api/health`, `/api/ai/health`, `/api/ai/pricing`, `/openapi.json`, `/.well-known/x402`, and the x402 402 payment gate for `/api/ai/*`
- `API_ORIGIN` proxy: heavy API routes (auth, user, unfollowers, video) forward to the Node backend on Railway/Fly/Docker; a clear 503 with setup instructions when unset
- `npm run build:cloudflare` assembles `dist-cloudflare/` from `site/`, `dashboard/`, `public/`, and `llms*.txt`, mirroring the `vercel.json` route table
- `npm run deploy:cloudflare` builds and deploys via `wrangler deploy`

#### Browser extension install page + extension-first account actions
- New `/extension` page: what the extension does, a 30-second load-unpacked install guide (Chrome/Edge/Brave/Firefox), all 11 automations, and why it runs locally (your X login never leaves your browser)
- Wired into the integrations page, footer, and sitemap
- Hosted service no longer executes X account actions server-side: follow/unfollow/like/reply/post routes return `501` pointing to the extension, so the service never custodies your session token or drives your account from a datacenter. Paid reads (scrape, analytics) are unaffected

## [3.3.0] - 2026-07-19

### Improved

#### Site-wide visual glow-up (X.com-clone kept)
- Enhanced the shared styling (common.css, components.css, docs.css, the injected sidebar) so ~400 pages level up at once: accent gradient + glow, depth shadows, active-nav gradient pill, glowing buttons, card hover lift, refined badges/tabs/inputs/code, ambient background glow, and load-in motion. Layout and blue identity unchanged.
- Landing page and every app page got the same treatment in their own styles.

### Fixed

- App pages (agent, graph, monitor, analytics, thread, video, login, admin, team, unfollowers, price-correlation, and more) now degrade gracefully when the hosted API is offline: designed "backend offline" notices and empty states instead of infinite spinners or console error floods. Stopped runaway polling and socket reconnection. Fixed a broken element id, a stuck loading overlay, and graph's cross-origin CORS calls (now same-origin).
- Docs pages that embedded full script source no longer run 20,000px tall (long code scrolls in a capped box).
- Footer column headings no longer render inline with their first link.
- Repaired every broken documentation cross-link (664 .md links plus repo-file links) and rebuilt the sitemap from 47 stale URLs to 535 real ones.

## [3.2.2] - 2026-07-19

### Added

#### xactions.app is live again, on Cloudflare Pages (free)
- `deploy/cloudflare/`: build script + `_redirects` deploying the full site
  (landing page, dashboard app, docs, tutorials, blog, scripts directory)
  to Cloudflare Pages, free of charge (the prior Vercel deployment was
  disabled and the domain has been down)
- Live now at the Pages project URL; `xactions.app` custom domain pending
  the nameserver switch to Cloudflare at the registrar
- `deploy/gcp/` (Cloud Run + nginx) kept as a fallback path for
  environments without Cloudflare access

## [3.2.1] - 2026-07-19

### Fixed

#### Browser script audit (103 bugs across 52 files)
- Full audit of every paste-in-console script in `scripts/twitter/`; report in `docs/audits/2026-07-19-browser-scripts.md`
- Fatal bugs: 6 scripts killed themselves by navigating mid-run; 3 infinite loops; an action script that liked/followed whatever page was open; blind menu clicks that could trigger unintended actions
- Correctness: quoted-tweet ID misattribution (9 scripts), locale-dependent repost/reply detection (8), K/M/B engagement multiplier and NaN bugs, CSV corruption from unquoted dates, React value-tracker bugs that made update-bio and DM sending silently no-op, wrong-DM-recipient matching, false clipboard success claims
- Reliability: end-of-list stall detection that never fired, missing `videoComponent` selectors, unrevoked Blob URLs, setInterval re-entrancy
- `src/cli/index.js`: `await` in a non-async SIGINT handler crashed the whole CLI on load

### Added

#### Cloud Run deployment for xactions.app
- `deploy/gcp/`: Dockerfile, nginx config, and Cloud Build pipeline serving the landing page, dashboard, docs, tutorials, and blog with the same clean-URL routing the Vercel deployment had (Vercel deployment is disabled and the domain has been down)

## [3.2.0] - 2026-07-19

### Added

#### Scraper Toolbox (browser console)
- `scripts/twitter/scraper-toolbox.js`: interactive on-page control panel for scraping any X timeline (profile, search, list, likes, bookmarks, home)
- Start / pause / resume / stop, live progress, draggable panel, settings persisted in localStorage
- Captures X's own GraphQL responses: exact like/repost/reply/view/bookmark counts, full text of long posts, media URLs, language codes; promoted posts skipped
- Live filters applied at export time: keywords (include/exclude), only/skip specific users, min likes/reposts/views, date range, repost/reply/quote/pinned toggles, media, language
- Exports: JSON, CSV, Markdown, TXT, HTML downloads plus clipboard copy (JSON or clear text)
- Console API: `window.XActionsToolbox`
- Docs: `scripts/twitter/README-scraper-toolbox.md`

### Fixed

#### scrape-profile-posts.js (v2.1.0)
- Elapsed time was reported 3x too small (divided by 3000 instead of 1000)
- HTML export table rendered at 300% width; text export separators were 300 chars wide
- Tweet IDs could be attributed to a quoted tweet's URL instead of the post itself
- Pinned posts were counted as reposts; repost/reply detection no longer depends on the English UI
- End-of-timeline detection never triggered when `verbose: false`
- Video attachments using the newer `videoComponent` testid were not detected

## [3.1.0] - 2026-02-25

### Added

#### Plugin System
- Community plugin architecture — create `xactions-plugin-*` npm packages
- Plugin loader, manager, and template in `src/plugins/`
- CLI commands: `xactions plugin install/list/remove`
- MCP server auto-discovers and registers plugin tools

#### Real-Time Streaming
- Live event streams for tweets, followers, and mentions via Socket.IO
- Puppeteer-based polling with Redis deduplication and rate limit backoff
- Browser pool management (max 3 concurrent instances)
- MCP tools: `x_stream_start`, `x_stream_stop`, `x_stream_list`

#### Workflow Engine
- Declarative JSON automation pipelines with triggers, actions, and conditions
- Cron scheduling, webhook triggers, event-based triggers
- 3 example workflows: competitor monitor, auto-engage keywords, follower growth report
- CLI: `xactions workflow create/run/list`
- MCP tools: `x_workflow_create`, `x_workflow_run`, `x_workflow_list`

#### Cross-Platform Scrapers
- Unified scraper interface: `scrape(platform, type, options)`
- Bluesky support via AT Protocol (@atproto/api) — no Puppeteer needed
- Mastodon support via public REST API — any instance URL
- Threads support via Puppeteer
- Backward compatible — existing Twitter imports unchanged

#### Sentiment Analysis & Reputation Monitoring
- Built-in rule-based sentiment analyzer (works offline, zero dependencies)
- Optional LLM mode via OpenRouter for nuanced analysis
- Reputation monitoring with trend detection and anomaly alerts
- Alert delivery via webhook, Socket.IO, or console
- Daily/weekly reputation reports

#### Account Portability
- Full account export: profile, tweets, followers, following, bookmarks, likes
- Output formats: JSON, CSV, Markdown, self-contained HTML archive viewer
- Export diff tool — compare two snapshots to see changes
- Migration stubs for Bluesky and Mastodon

#### Social Graph Analysis
- Graph builder crawls N degrees from seed account
- Algorithms: mutual connections, bridge accounts, cluster detection, influence scoring
- Exports to D3.js JSON and Gephi GEXF formats
- Self-contained HTML visualization with force-directed layout

#### Browser Extension
- Manifest V3 Chrome/Firefox extension
- Popup UI to run automations without console access
- Content script injection, settings persistence, activity badge

#### Dashboard Enhancements
- `automations.html` — automation control panel with start/stop toggles
- `monitor.html` — real-time activity feed with Chart.js visualizations
- `workflows.html` — visual workflow builder
- `analytics.html` — sentiment timeline, mention analysis, alert configuration
- Full docs site generated at `dashboard/docs/`

#### New API Routes
- `/api/streams` — real-time stream management
- `/api/workflows` — workflow CRUD and execution
- `/api/analytics` — sentiment analysis and monitoring
- `/api/portability` — account export and migration
- `/api/graph` — social graph building and analysis
- `/api/automations` — automation start/stop control
- 15+ additional routes for bookmarks, discovery, engagement, posting, etc.

#### New Browser Scripts
- `engagementBooster.js` — systematic engagement with target accounts
- `sentimentAnalyzer.js` — in-browser sentiment scoring
- `shadowbanChecker.js` — detect account restrictions
- `viralTweetDetector.js` — find viral content early
- `followerGrowthTracker.js` — track growth over time
- `tweetScheduleOptimizer.js` — find best posting times
- `welcomeNewFollowers.js` — auto-welcome with templates
- `quoteTweetAutomation.js` — strategic quote tweeting
- `threadComposer.js` — multi-tweet thread builder
- `contentCalendar.js` — plan and schedule content
- `audienceDemographics.js` — analyze follower demographics
- `accountHealthMonitor.js` — monitor account health signals
- `pinTweetManager.js` — manage pinned tweets
- `bulkDeleteTweets.js` — mass delete old tweets
- `autoReply.js` — automated reply with templates

#### Other
- TypeScript type declarations (`types/index.d.ts`)
- Docker support (Dockerfile + docker-compose)
- New npm exports: `xactions/streaming`, `xactions/analytics`, `xactions/plugins`
- `xactions-mcp` and `xactions-agent` bin commands

### Changed
- MCP server expanded from ~200 to 140+ registered tools
- Package exports updated for multi-platform scraper paths
- Dependencies updated: vitest 4.x, puppeteer 24.x, added node-cron, better-sqlite3, exceljs

## [1.0.0] - 2026-02-11

### Added

- Initial release

# Prompt 09: Competitive Feature Build-Out — Beat Phantombuster, Apify, Circleboom, Hypefury, Taplio & snscrape

You are an expert full-stack JavaScript developer working on XActions — an open-source X/Twitter automation toolkit (browser scripts, CLI, Node.js library, MCP server, web dashboard). No API fees — uses browser automation via Puppeteer.

## Context

XActions already has: multi-platform scraping (Twitter/Bluesky/Mastodon/Threads), 49+ MCP tools, CLI, real-time streaming, workflows engine, analytics, automation suite, and an extension. But several paid competitors still dominate specific niches. These prompts close every gap.

## How To Use This File

This file contains **16 independent agent prompts** (09-A through 09-P). Each one builds a specific competitive feature. They can be executed **in any order** — no dependencies between them (unless noted).

Paste each section into a fresh agent chat. Budget: ~$3-10 per prompt.

| Prompt | Feature | Kills Competitor |
|--------|---------|-----------------|
| 09-A | Historical Analytics Database | Followerwonk, Social Blade |
| 09-B | Audience Overlap & Venn Analysis | Followerwonk |
| 09-C | Follower CRM & Segmentation | Circleboom, Followerwonk |
| 09-D | CSV Bulk Operations Import | Phantombuster, Circleboom |
| 09-E | Proxy Rotation & Stealth | Phantombuster, Apify |
| 09-F | Cloud Scheduled Execution | Phantombuster, Apify |
| 09-G | Visual Content Calendar Dashboard | Hypefury, Taplio, Typefully |
| 09-H | Evergreen Content Recycler | Hypefury |
| 09-I | RSS & Webhook Content Ingestion | Hypefury, Taplio |
| 09-J | AI Hashtag & Content Optimizer | Taplio |
| 09-K | Thread Composer with Preview | Typefully |
| 09-L | Notification Integrations (Email/Slack/Discord) | Phantombuster, Circleboom |
| 09-M | Robust Pagination & Retry Engine | Apify |
| 09-N | Team & Multi-User Support | Phantombuster, Taplio |
| 09-O | Dashboard Analytics Visualization | All competitors |
| 09-P | Apify/Phantombuster Export Compatibility | Apify, Phantombuster |

---

## 09-A — Historical Analytics Database

> **Kills:** Social Blade, Followerwonk (historical tracking)
> **Gap:** Analytics are scraped on-demand and exported — no time-series storage, no trend charts.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build a local time-series analytics storage system that automatically snapshots account metrics over time, enabling historical trend analysis.

### Requirements

**1. Create `src/analytics/historyStore.js`**
- Use SQLite via `better-sqlite3` (add to `package.json` dependencies)
- Schema tables:
  - `account_snapshots` — `id`, `username`, `followers_count`, `following_count`, `tweet_count`, `listed_count`, `verified`, `snapshot_at` (ISO timestamp)
  - `tweet_snapshots` — `id`, `tweet_id`, `username`, `likes`, `retweets`, `replies`, `quotes`, `views`, `bookmark_count`, `snapshot_at`
  - `engagement_daily` — `id`, `username`, `date`, `avg_engagement_rate`, `total_impressions`, `total_engagements`, `top_tweet_id`
- Functions:
  - `saveAccountSnapshot(username, data)` — upserts a snapshot
  - `saveTweetSnapshot(username, tweetId, metrics)` — stores per-tweet metrics
  - `saveDailyEngagement(username, stats)` — daily roll-up
  - `getAccountHistory(username, { from, to, interval })` — returns time-series data, `interval` can be `day`, `week`, `month`
  - `getTweetHistory(tweetId, { from, to })` — per-tweet metric history
  - `getGrowthRate(username, days)` — followers gained/lost per day over N days
  - `compareAccounts(usernames[], metric, { from, to })` — multi-account comparison over time
  - `exportHistory(username, format)` — export to JSON or CSV
- Auto-create database file at `~/.xactions/analytics.db` on first use
- All date handling in UTC

**2. Create `src/analytics/autoSnapshot.js`**
- `startAutoSnapshot(username, intervalMinutes)` — uses `setInterval` to periodically call `saveAccountSnapshot` by scraping the profile
- `stopAutoSnapshot(username)`
- `listActiveSnapshots()` — returns running snapshot schedules
- On each snapshot, also run `saveDailyEngagement` if it's the first snapshot of the day
- Graceful shutdown: clear all intervals on `process.exit`

**3. Integrate with existing systems**
- Add CLI commands to `src/cli/commands/`:
  - `xactions history <username>` — show follower/following trend (last 30 days default, `--days N`, `--format json|csv|table`)
  - `xactions history:tweet <tweet-url>` — show tweet metric history
  - `xactions history:compare <user1> <user2> [user3...]` — side-by-side growth comparison
  - `xactions history:snapshot <username>` — take a manual snapshot now
  - `xactions history:auto <username> --interval 60` — start auto-snapshots (default: every 60 min)
  - `xactions history:stop <username>` — stop auto-snapshots
  - `xactions history:export <username> --format csv` — export all historical data
- Add MCP tools to `src/mcp/server.js`:
  - `x_history_snapshot` — take a snapshot
  - `x_history_get` — query historical data
  - `x_history_growth` — growth rate analysis
  - `x_history_compare` — multi-account comparison
  - `x_history_auto_start` / `x_history_auto_stop` — manage auto-snapshots

**4. Console-friendly output**
- Table format for CLI using simple `console.log` with aligned columns
- Include sparkline-style trend indicators: `📈 +142 (3.2%)` or `📉 -23 (-0.5%)`
- Show period-over-period changes: "vs. last week", "vs. last month"

### Rules
- Use `const` over `let`, async/await, `// by nichxbt` credit
- Console logs use emojis for visibility
- Handle missing data gracefully — if only 3 days of data exist, don't error on "30-day trend"
- SQLite DB should auto-migrate (check table existence on init)
- Do NOT use any external charting libraries — keep it terminal/JSON/CSV only

---

## 09-B — Audience Overlap & Venn Analysis

> **Kills:** Followerwonk (compare followers, find overlaps)
> **Gap:** Competitor analysis only compares metrics, doesn't show shared audiences.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build an audience overlap analyzer that finds shared followers between accounts, identifies unique audiences, and generates actionable insights.

### Requirements

**1. Create `src/analytics/audienceOverlap.js`**
- `analyzeOverlap(username1, username2, options)` — core function
  - Scrape followers of both accounts (use existing `scrape('followers', ...)` from `src/scrapers/`)
  - Compute: `shared` (intersection), `uniqueToA`, `uniqueToB`, `overlapPercent`
  - `options`: `{ limit, enrichProfiles, sortBy }` — `enrichProfiles` fetches full profile data for shared users
  - Return object:
    ```js
    {
      accountA: { username, followerCount, uniqueCount },
      accountB: { username, followerCount, uniqueCount },
      shared: { count, percentage, users: [...] },
      uniqueToA: { count, users: [...] },
      uniqueToB: { count, users: [...] },
      insights: [...] // auto-generated text insights
    }
    ```
- `multiOverlap(usernames[], options)` — compare 3+ accounts pairwise
  - Returns a matrix of overlap percentages
  - Identifies "core audience" (users following ALL accounts)
  - Identifies "niche audience" (users following only one account)
- `findSimilarAudience(username, candidateUsernames[])` — rank candidates by audience similarity to target
- `getAudienceInsights(overlapResult)` — generate natural-language insights:
  - "45% of @userA's followers also follow @userB — high audience overlap suggests similar content niche"
  - "Only 3% overlap — these audiences are largely distinct"
  - "Top shared followers tend to have 5K+ followers themselves — influential crossover audience"

**2. Efficient scraping strategy**
- Cache scraped follower lists in memory during a session (don't re-scrape if already fetched)
- Support `--limit` to analyze top-N followers only (faster for large accounts)
- Use Set operations for O(1) membership checks
- Progress logging: `🔍 Scraping @user1 followers... 1,200/5,000`

**3. Integration**
- CLI: `xactions audience:overlap <user1> <user2> [--limit 5000] [--enrich] [--format json|table]`
- CLI: `xactions audience:matrix <user1> <user2> <user3> [--limit 5000]`
- CLI: `xactions audience:similar <target> <candidate1> <candidate2> [...]`
- MCP tools: `x_audience_overlap`, `x_audience_matrix`, `x_audience_similar`
- Export: JSON and CSV of shared/unique user lists

### Rules
- Use existing scrapers — do NOT rewrite scraping logic
- Handle rate limits: pause + retry if scraping stalls
- Memory-conscious: for accounts with 100K+ followers, process in chunks and use streaming Set comparison rather than loading all into arrays
- Author credit: `// by nichxbt`

---

## 09-C — Follower CRM & Segmentation

> **Kills:** Circleboom (smart search, interest cloud), Followerwonk (follower segmentation)
> **Gap:** No tagging, scoring, or categorizing followers.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build a follower CRM system that lets users tag, score, segment, and search their followers with rich filtering.

### Requirements

**1. Create `src/analytics/followerCRM.js`**
- SQLite storage (reuse `~/.xactions/analytics.db` from 09-A, or create if it doesn't exist)
- Schema:
  - `crm_contacts` — `id`, `username`, `display_name`, `bio`, `followers_count`, `following_count`, `tweet_count`, `verified`, `protected`, `follow_date`, `unfollow_date`, `is_follower`, `is_following`, `score`, `last_active`, `profile_image_url`, `location`, `website`, `updated_at`
  - `crm_tags` — `id`, `name`, `color`, `created_at`
  - `crm_contact_tags` — `contact_id`, `tag_id`
  - `crm_notes` — `id`, `contact_id`, `note`, `created_at`
  - `crm_segments` — `id`, `name`, `filter_json`, `created_at`
- Functions:
  - `syncFollowers(username)` — scrape current followers/following, upsert into `crm_contacts`, detect new follows/unfollows
  - `tagContact(username, tagName)` / `untagContact(username, tagName)` — add/remove tags (auto-create tag if new)
  - `addNote(username, note)` — attach a text note to a contact
  - `scoreContact(username, score)` — manual score (0-100)
  - `autoScore(username)` — compute engagement score based on: follower count (weight 0.2), tweet frequency (0.2), follows-back (0.15), account age (0.15), bio completeness (0.1), verified (0.1), interaction history (0.1)
  - `searchContacts(query)` — full-text search across username, display_name, bio, notes
  - `filterContacts(filters)` — rich filtering:
    ```js
    {
      minFollowers: 1000,
      maxFollowers: 50000,
      hasBio: true,
      bioContains: "developer",
      verified: true,
      isFollower: true,
      isFollowing: false,
      tags: ["vip", "potential-collab"],
      minScore: 70,
      location: "San Francisco",
      joinedAfter: "2024-01-01",
      sortBy: "score",
      limit: 50
    }
    ```
  - `createSegment(name, filters)` — save a named filter for reuse
  - `getSegment(name)` — run a saved segment's filter and return results
  - `listSegments()` — list all saved segments with contact counts
  - `bulkTag(filterOrUsernames, tagName)` — tag all contacts matching a filter
  - `getContactTimeline(username)` — show follow/unfollow history, notes, tag changes
  - `exportSegment(name, format)` — export to JSON/CSV

**2. Auto-tagging rules**
- `addAutoTagRule(rule)` — e.g., `{ if: { bioContains: "founder" }, then: { tag: "founder" } }`
- Run auto-tag rules on `syncFollowers` for new contacts
- Built-in rules (optional, user can disable):
  - `>10K followers` → tag "influencer"
  - `bio contains "bot"` or no bio + default avatar + <5 tweets → tag "likely-bot"
  - `follows you but you don't follow back` → tag "fan"
  - `verified` → tag "verified"

**3. Integration**
- CLI commands:
  - `xactions crm:sync <username>` — sync followers into CRM
  - `xactions crm:search <query>` — search contacts
  - `xactions crm:filter --min-followers 1000 --bio-contains "developer" --tag vip`
  - `xactions crm:tag <username> <tag>` — tag a contact
  - `xactions crm:note <username> "Great engagement, potential collab"` — add note
  - `xactions crm:score <username>` — show/compute score
  - `xactions crm:segment:create <name> --filters '{...}'`
  - `xactions crm:segment:list` / `xactions crm:segment:run <name>`
  - `xactions crm:export <segment-name> --format csv`
  - `xactions crm:timeline <username>` — show contact history
- MCP tools: `x_crm_sync`, `x_crm_search`, `x_crm_filter`, `x_crm_tag`, `x_crm_note`, `x_crm_score`, `x_crm_segment`, `x_crm_timeline`

### Rules
- SQLite is the only dependency allowed (reuse `better-sqlite3`)
- All operations must handle 100K+ contacts without memory issues
- Use prepared statements for all queries
- Author credit: `// by nichxbt`

---

## 09-D — CSV Bulk Operations Import

> **Kills:** Phantombuster (spreadsheet input), Circleboom
> **Gap:** Can't upload a CSV of usernames to mass-follow/unfollow/block.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build a CSV/JSON bulk import system that accepts a list of usernames and performs batch operations.

### Requirements

**1. Create `src/bulk/bulkOperations.js`**
- `parseBulkInput(filePath)` — accepts CSV, JSON, or TXT (one username per line)
  - CSV: look for columns named `username`, `handle`, `screen_name`, or `user` (case-insensitive). Strip `@` prefixes.
  - JSON: accept `[{ "username": "..." }]` or `["username1", "username2"]`
  - TXT: one username per line, skip blank lines and comments (`#`)
  - Return: `string[]` of clean usernames
- `bulkExecute(usernames, action, options)` — core executor
  - `action`: `"follow"`, `"unfollow"`, `"block"`, `"unblock"`, `"mute"`, `"unmute"`, `"like-latest"`, `"dm"`, `"scrape-profile"`, `"add-to-list"`
  - `options`: `{ dryRun, delayMs, batchSize, maxRetries, skipErrors, logFile, resumeFrom }`
  - Execute with configurable delay between actions (default 2000ms)
  - Batch processing: process `batchSize` (default 10) then pause for longer cooldown (30s)
  - Progress logging: `[47/200] ✅ Followed @user47 (2.3s)` or `[48/200] ❌ Failed @user48: User not found`
  - Save progress to `~/.xactions/bulk-progress-{timestamp}.json` after each action — enables resume
  - `resumeFrom`: skip already-processed usernames from a previous progress file
  - On completion, print summary: succeeded, failed, skipped, total time
  - Return: `{ succeeded: [...], failed: [...], skipped: [...], duration }`
- `bulkScrape(usernames, options)` — scrape profiles in bulk, return combined JSON/CSV
  - Use existing profile scraper, collect results into a single dataset
  - Support `--output` flag for file export

**2. Dry-run mode**
- `--dry-run` flag: log what would happen without executing
- Output: `[DRY RUN] Would follow @user1`, `[DRY RUN] Would follow @user2`
- Still validates all usernames (format check)

**3. Integration**
- CLI commands:
  - `xactions bulk:follow <file.csv> [--delay 2000] [--batch-size 10] [--dry-run] [--resume <progress-file>]`
  - `xactions bulk:unfollow <file.csv> [options]`
  - `xactions bulk:block <file.csv> [options]`
  - `xactions bulk:mute <file.csv> [options]`
  - `xactions bulk:scrape <file.csv> --output profiles.json [options]`
  - `xactions bulk:dm <file.csv> --message "Hey!" [options]`
  - `xactions bulk:list <file.csv> --list "My List" [options]`
  - `xactions bulk:status <progress-file>` — check progress of a running/completed bulk op
- MCP tools: `x_bulk_import`, `x_bulk_execute`, `x_bulk_status`

**4. Safety**
- Hard cap: 400 follows/day, 1000 unfollows/day, 200 blocks/day (configurable in options)
- Warning prompt if >100 actions without `--force` flag: "⚠️ About to follow 500 users. Use --force to skip this warning."
- Rate limit detection: if 3 consecutive failures, pause for 5 minutes then retry
- Blacklist: never operate on usernames in `~/.xactions/blacklist.txt`

### Rules
- Do NOT add any npm dependencies for CSV parsing — use a simple split-based parser
- Progress files must be human-readable JSON
- All delays use `await sleep(ms)` pattern
- Author credit: `// by nichxbt`

---

## 09-E — Proxy Rotation & Stealth Mode

> **Kills:** Phantombuster (proxy pool), Apify (proxy management)
> **Gap:** All Puppeteer scraping uses a single browser — no proxy support.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Add proxy rotation and browser stealth capabilities to the Puppeteer scraping engine.

### Requirements

**1. Create `src/scraping/proxyManager.js`**
- `ProxyManager` class:
  - `constructor(proxies)` — accepts array of proxy strings: `http://user:pass@host:port`, `socks5://host:port`, or `host:port` (plain HTTP)
  - `loadFromFile(filePath)` — load proxies from a text file (one per line)
  - `loadFromEnv()` — read from `XACTIONS_PROXIES` env var (comma-separated) or `XACTIONS_PROXY_FILE` path
  - `getNext()` — round-robin rotation, returns next proxy
  - `getRandom()` — random selection
  - `markFailed(proxy)` — track failures; after 3 consecutive fails, temporarily blacklist for 10 minutes
  - `markSuccess(proxy)` — reset failure counter
  - `getHealthy()` — return only non-blacklisted proxies
  - `getStats()` — per-proxy success/fail counts, avg response time
  - `testAll()` — test all proxies concurrently (hit a simple endpoint), return healthy ones

**2. Create `src/scraping/stealthBrowser.js`**
- Wraps Puppeteer launch with anti-detection measures:
  - Use `puppeteer-extra` + `puppeteer-extra-plugin-stealth` (add to dependencies)
  - Randomize viewport size within realistic ranges (1280-1920 width, 720-1080 height)
  - Randomize `User-Agent` from a pool of 20+ real browser UA strings
  - Set realistic `navigator.webdriver = false`, `navigator.languages`, `navigator.platform`
  - Random delays on page actions: `click(el, { delay: random(50, 150) })`
  - Human-like mouse movements: move to element before clicking
  - Typing with random inter-key delays (50-150ms)
- `launchStealthBrowser(options)` — returns a Puppeteer browser instance
  - `options`: `{ proxy, headless, userDataDir, viewport, userAgent }`
  - If `proxy` provided, pass `--proxy-server` to Chromium args
  - If proxy has auth, handle via `page.authenticate()`
- `createStealthPage(browser)` — creates a page with all stealth patches applied

**3. Integrate with existing scraper**
- Modify `src/scrapers/twitter/index.js` to accept an optional `{ proxy, stealth }` config
- When stealth mode is enabled, use `launchStealthBrowser` instead of regular `puppeteer.launch`
- When proxy is provided, route through proxy manager
- On scrape failure, try next proxy and retry (up to 3 retries)
- Add `--proxy` and `--stealth` flags to all CLI scraper commands
- Add `--proxy-file` flag to load a proxy list

**4. Config**
- Support `~/.xactions/config.json` keys:
  ```json
  {
    "proxy": {
      "enabled": false,
      "file": "~/.xactions/proxies.txt",
      "rotation": "round-robin",
      "retries": 3
    },
    "stealth": {
      "enabled": false,
      "randomDelay": true,
      "humanTyping": true
    }
  }
  ```

### Rules
- Only `puppeteer-extra` and `puppeteer-extra-plugin-stealth` as new dependencies
- Do NOT break existing non-proxy usage — proxy/stealth must be opt-in
- Author credit: `// by nichxbt`

---

## 09-F — Cloud Scheduled Execution

> **Kills:** Phantombuster (cloud scheduling), Apify (actors + schedules)
> **Gap:** No hosted cron runner, no serverless deployment.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build a local scheduler that can run XActions tasks on cron schedules, with optional webhook triggers, persistent job history, and a simple HTTP API for remote management.

### Requirements

**1. Create `src/scheduler/scheduler.js`**
- Use `node-cron` (add to dependencies) for cron scheduling
- `Scheduler` class:
  - `addJob(config)` — config: `{ name, cron, command, args, enabled, maxRetries, timeout }`
    - `command` is any CLI command string like `"followers elonmusk --limit 100 --output results.json"`
    - Validate cron expression before saving
  - `removeJob(name)` — remove by name
  - `enableJob(name)` / `disableJob(name)` — toggle without removing
  - `listJobs()` — return all jobs with next-run time, last-run status
  - `getJobHistory(name, limit)` — last N runs with start/end time, exit code, output preview
  - `runJobNow(name)` — manually trigger a job immediately
  - Jobs stored in `~/.xactions/scheduler.json`
- Job execution:
  - Run commands via `child_process.execFile` pointing to the CLI entry
  - Capture stdout/stderr, store in `~/.xactions/scheduler-history/` as `{name}_{timestamp}.log`
  - On failure, retry up to `maxRetries` with exponential backoff
  - Timeout: kill process after `timeout` ms (default: 5 minutes)
  - Emit events: `job:start`, `job:complete`, `job:error` (for webhook/notification integration)

**2. Create `src/scheduler/webhookTrigger.js`**
- Simple Express endpoint (reuse existing `api/server.js` pattern):
  - `POST /api/scheduler/trigger/:jobName` — run a job via webhook
  - `GET /api/scheduler/jobs` — list all jobs
  - `GET /api/scheduler/history/:jobName` — job run history
  - Auth: require `Authorization: Bearer <token>` header (token set in config)
- Support incoming webhook payloads — pass payload data as env vars to the job

**3. Integration**
- CLI commands:
  - `xactions schedule:add <name> --cron "0 */6 * * *" --command "followers elonmusk --limit 500"`
  - `xactions schedule:remove <name>`
  - `xactions schedule:list` — show all jobs with next run time
  - `xactions schedule:history <name> [--limit 10]`
  - `xactions schedule:run <name>` — run now
  - `xactions schedule:enable <name>` / `xactions schedule:disable <name>`
  - `xactions scheduler:start` — start the scheduler daemon (foreground, or `--daemon` for background)
  - `xactions scheduler:stop` — stop the daemon
- MCP tools: `x_schedule_add`, `x_schedule_remove`, `x_schedule_list`, `x_schedule_run`, `x_schedule_history`

**4. Pre-built job templates**
- Include example jobs in the README/help output:
  - "Daily follower snapshot" — `"0 9 * * *"` → `history:snapshot myaccount`
  - "Hourly trend monitor" — `"0 * * * *"` → `search "from:competitor" --output latest.json`
  - "Weekly non-follower cleanup" — `"0 10 * * 1"` → `non-followers myaccount --output cleanup.csv`
  - "Every 6 hours: engagement check" — `"0 */6 * * *"` → `history:snapshot myaccount`

### Rules
- Keep the scheduler lightweight — it's a local daemon, not a cloud platform
- Job configs must be human-editable JSON
- Only `node-cron` as a new dependency
- Author credit: `// by nichxbt`

---

## 09-G — Visual Content Calendar Dashboard

> **Kills:** Hypefury, Taplio, Typefully (visual drag-and-drop calendar)
> **Gap:** `schedulePosts.js` exists but no visual calendar in the dashboard.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build a content calendar page in the XActions dashboard — a visual weekly/monthly calendar showing scheduled posts with create/edit/delete capabilities.

### Requirements

**1. Create `dashboard/calendar.html`**
- Static HTML page (no React/Vue — matches existing dashboard pattern)
- **Monthly calendar view** (default):
  - Grid layout, each day cell shows scheduled post count + preview of first 2 posts
  - Click a day to see all posts for that day in a sidebar panel
  - Today highlighted, past days grayed
- **Weekly view** toggle:
  - 7-column layout with hourly time slots
  - Posts shown as colored blocks at their scheduled time
  - Drag to reschedule (update the schedule time via API)
- **Post creation:**
  - Click any empty slot to open compose modal
  - Modal: textarea (280 char counter), image upload, poll option, schedule date/time picker
  - "Schedule" button calls `POST /api/schedule` endpoint
  - "Post Now" button calls `POST /api/tweet` endpoint
- **Post management:**
  - Click any scheduled post to edit or delete
  - Color-coding: blue = scheduled, green = posted, red = failed, yellow = draft
- **Best time indicators:**
  - If best-time-to-post data exists (from `bestTimeToPost.js`), highlight optimal time slots in green
  - Tooltip: "Your audience is most active at this time"
- Navigation: prev/next month buttons, "Today" button, month/year selector

**2. Create `dashboard/js/calendar.js`**
- Pure vanilla JS (no frameworks — match existing `dashboard/js/` patterns)
- Fetch scheduled posts from API: `GET /api/schedule/posts`
- Create/update/delete via API calls
- Responsive: works on desktop (full calendar) and mobile (list view with day selector)
- LocalStorage cache: remember last view (monthly/weekly), last visible date range

**3. API endpoints** (add to `api/routes/`)
- `GET /api/schedule/posts?from=2026-02-01&to=2026-02-28` — list scheduled posts in date range
- `POST /api/schedule/posts` — create scheduled post `{ text, scheduledAt, media?, poll? }`
- `PUT /api/schedule/posts/:id` — update scheduled post
- `DELETE /api/schedule/posts/:id` — delete scheduled post
- `GET /api/schedule/best-times` — return best-time-to-post data for calendar overlay
- Storage: use a JSON file `~/.xactions/scheduled-posts.json` (or SQLite if 09-A is built)

**4. Add navigation link**
- Add "Calendar" link to the dashboard sidebar/nav (in every dashboard HTML file's nav section)
- Use 📅 emoji as icon

### Rules
- No npm dependencies for the frontend — vanilla HTML/CSS/JS only
- Match the existing dashboard visual style (check `dashboard/index.html` for CSS patterns)
- Calendar cells must handle overflow gracefully (scrollable if >4 posts in a day)
- Works offline with cached data
- Author credit: `// by nichxbt`

---

## 09-H — Evergreen Content Recycler

> **Kills:** Hypefury (evergreen queue)
> **Gap:** Posts are one-shot — no content recycling.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build an evergreen content recycler that identifies top-performing tweets and automatically re-posts or queues them for re-sharing.

### Requirements

**1. Create `src/automation/evergreenRecycler.js`**
- `analyzeEvergreenCandidates(username, options)` — scrape user's tweets, rank by engagement rate
  - `options`: `{ minAge: 30, minLikes: 10, minEngagementRate: 0.02, limit: 50, excludeReplies: true, excludeRetweets: true }`
  - `minAge`: only consider tweets older than N days (avoid recycling recent content)
  - Return ranked list with: text, original metrics, engagement rate, suggested re-post time
- `createEvergreenQueue(username, tweets, options)` — build a queue of tweets to recycle
  - `options`: `{ frequency: "daily", timeSlots: ["09:00", "14:00", "19:00"], maxPerDay: 2, variation: true }`
  - `variation`: if true, slightly modify tweets before re-posting (add "🔁", rephrase intro, change emoji)
  - Queue stored in `~/.xactions/evergreen-queue.json`
  - Smart spacing: never re-post the same tweet within 30 days
  - Respect time slots: schedule posts at the specified times
- `runEvergreenCycle()` — check queue, post any tweets due now
  - Mark posted items with timestamp
  - Auto-refill queue when it runs low (re-analyze top tweets)
- `pauseEvergreen()` / `resumeEvergreen()` — pause/resume recycling
- `getEvergreenStats()` — how many recycled, performance comparison (original vs. recycled metrics)

**2. Content variation engine**
- `varyTweet(text)` — make small changes to avoid duplicate detection:
  - Swap synonyms for common words
  - Add/change emoji
  - Rephrase "I think..." → "IMO...", "Here's" → "Check out", etc.
  - Add "(repost)" or "🔁" prefix option
  - Never change @mentions, links, or hashtags
  - Return: `{ original, varied, changeDescription }`

**3. Integration**
- CLI:
  - `xactions evergreen:analyze <username> [--min-likes 10] [--min-age 30] [--limit 50]`
  - `xactions evergreen:queue <username> [--frequency daily] [--max-per-day 2]`
  - `xactions evergreen:run` — execute one cycle
  - `xactions evergreen:stats` — show recycle performance
  - `xactions evergreen:pause` / `xactions evergreen:resume`
- MCP tools: `x_evergreen_analyze`, `x_evergreen_queue`, `x_evergreen_run`, `x_evergreen_stats`

### Rules
- Use existing tweet scraper and poster — don't re-implement
- Never recycle tweets with @mentions (could be contextual conversations)
- Never recycle tweets that contain "breaking", "just", "today", "right now" (time-sensitive)
- Author credit: `// by nichxbt`

---

## 09-I — RSS & Webhook Content Ingestion

> **Kills:** Hypefury (auto-plug, RSS), Taplio
> **Gap:** Can't auto-post from RSS feeds or external sources.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build an RSS feed monitor and incoming webhook system that auto-creates draft tweets or posts from external content sources.

### Requirements

**1. Create `src/automation/rssMonitor.js`**
- `addFeed(config)` — config: `{ name, url, template, autoPost, checkInterval, filters }`
  - `template`: string template like `"📰 {title}\n\n{link}"` or `"New post: {title} by {author}\n{link} #news"`
  - Available template vars: `{title}`, `{link}`, `{description}`, `{author}`, `{pubDate}`, `{categories}`
  - `autoPost`: if true, post immediately; if false, save as draft
  - `checkInterval`: minutes between feed checks (default: 30)
  - `filters`: `{ titleContains, titleExcludes, minLength, maxAge }` — skip items that don't match
- `removeFeed(name)`
- `listFeeds()` — show all feeds with last-check time and item count
- `checkFeed(name)` — manually check one feed now
- `checkAllFeeds()` — check all feeds
- RSS parsing: use built-in `fetch` + simple XML parsing (no heavy dependencies — use a lightweight parser or regex for RSS/Atom)
- Track seen items in `~/.xactions/rss-seen.json` (store GUIDs/links to avoid duplicates)
- On new item: format tweet from template, respect 280 char limit (truncate description if needed, always keep link)

**2. Create `src/automation/webhookIngestion.js`**
- Express endpoint: `POST /api/ingest/webhook`
  - Accept JSON body: `{ text, url, title, source, autoPost }`
  - Or raw text body (treated as tweet text)
  - Auth: require `X-Webhook-Secret` header matching config
  - Format into tweet, either post immediately or save to drafts queue
- Support Zapier/Make/IFTTT payloads:
  - Auto-detect common webhook formats
  - Map common fields to tweet template

**3. Draft queue**
- `getDrafts()` — list all pending drafts from RSS + webhooks
- `postDraft(id)` — post a specific draft
- `deleteDraft(id)` — discard a draft
- `postAllDrafts()` — post all pending drafts with delay between each
- Drafts stored in `~/.xactions/drafts.json`

**4. Integration**
- CLI:
  - `xactions rss:add <name> --url <feed-url> --template "📰 {title}\n{link}" [--auto-post] [--interval 30]`
  - `xactions rss:remove <name>`
  - `xactions rss:list`
  - `xactions rss:check [name]` — check one or all feeds
  - `xactions drafts:list` / `xactions drafts:post <id>` / `xactions drafts:post-all`
- MCP tools: `x_rss_add`, `x_rss_remove`, `x_rss_list`, `x_rss_check`, `x_drafts_list`, `x_drafts_post`

### Rules
- For RSS parsing, use a minimal approach — do NOT add `rss-parser` or similar heavy deps. Use `fetch` + DOMParser or simple regex for `<item>` / `<entry>` extraction
- Handle both RSS 2.0 and Atom feed formats
- Author credit: `// by nichxbt`

---

## 09-J — AI Hashtag & Content Optimizer

> **Kills:** Taplio (AI hashtag suggestions)
> **Gap:** Hashtag analytics exists but doesn't suggest hashtags for new content.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build an AI-powered content optimizer that suggests hashtags, improves tweet text, and predicts performance.

### Requirements

**1. Create `src/ai/contentOptimizer.js`**
- Uses OpenRouter integration (already exists in `src/ai/` or `src/analytics/sentiment.js` pattern)
- `suggestHashtags(tweetText, options)` — suggest relevant hashtags
  - `options`: `{ count: 5, niche, trending, language }`
  - Strategy 1 (offline): analyze existing hashtag analytics data (`src/hashtagAnalytics.js`) for co-occurring tags
  - Strategy 2 (AI): use LLM to suggest contextually relevant hashtags
  - Strategy 3 (hybrid): combine both — AI suggests, hashtagAnalytics validates with real engagement data
  - Return: `[{ hashtag, relevance, avgEngagement, trending }]` sorted by predicted impact
- `optimizeTweet(text, options)` — improve tweet for engagement
  - `options`: `{ tone, audience, goal }` — goal can be "engagement", "clicks", "followers"
  - Return: `{ original, optimized, changes: [...], predictedLift }`
  - Suggestions: hook improvement, CTA addition, emoji usage, length optimization, question framing
- `predictPerformance(text)` — estimate how a tweet will perform
  - Analyze: length, has question, has CTA, has media indicator, hashtag count, emoji count, time of posting
  - Compare against user's historical engagement data (from 09-A if available)
  - Return: `{ predictedLikes, predictedRetweets, predictedReplies, confidence, suggestions }`
- `generateVariations(text, count)` — create N variations of a tweet
  - Different hooks, different lengths, different tones
  - Return: `[{ text, strategy }]`
- `analyzeVoice(username)` — analyze a user's writing style from their recent tweets
  - Scrape last 100 tweets, identify: common phrases, emoji usage, hashtag patterns, avg length, tone
  - Return: `{ voiceProfile }` that can be passed to optimization functions for consistency

**2. Offline fallback**
- When no OpenRouter API key is configured, use rule-based optimization:
  - Hashtag co-occurrence from analytics data
  - Length optimization (tweets between 70-100 chars get highest engagement — suggest trimming)
  - Question detection (add "?" = higher replies)
  - CTA detection (suggest adding one)
  - Hook patterns ("I" statements vs "You" statements, numbers, etc.)

**3. Integration**
- CLI:
  - `xactions optimize <tweet-text> [--tone casual] [--goal engagement]`
  - `xactions hashtags <tweet-text> [--count 5] [--niche tech]`
  - `xactions predict <tweet-text>`
  - `xactions variations <tweet-text> [--count 3]`
  - `xactions voice:analyze <username>`
- MCP tools: `x_optimize_tweet`, `x_suggest_hashtags`, `x_predict_performance`, `x_generate_variations` (extend existing AI tools)

### Rules
- OpenRouter integration must be optional — core features work offline
- Never suggest banned/spammy hashtags
- Author credit: `// by nichxbt`

---

## 09-K — Thread Composer with Preview

> **Kills:** Typefully (thread preview)
> **Gap:** Thread posting exists but no preview or formatting tools.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build a thread composer with live preview, auto-splitting, and formatting tools.

### Requirements

**1. Create `dashboard/thread-composer.html`**
- Standalone page in the dashboard
- **Composer panel (left):**
  - Large textarea for writing the full thread (or paste long text)
  - Auto-split: when text exceeds 280 chars, automatically split at sentence boundaries
  - Manual split: user can insert `---` to force a split point
  - Per-tweet character counter (280 limit) with color: green (<240), yellow (240-270), red (>270)
  - Numbering: optionally prepend "1/" "2/" numbering to each tweet
  - "Add tweet" button to manually add another tweet to the thread
  - Drag-to-reorder tweets
  - Media upload per tweet (show thumbnail preview)
- **Preview panel (right):**
  - Render each tweet as it would appear on X — styled to match X's tweet card design
  - Show thread connector lines between tweets
  - Display character count per tweet
  - Highlight any tweets over 280 chars in red
  - Show total thread length: "Thread: 7 tweets, ~2 min read"
- **Actions:**
  - "Post Thread" — post immediately via API
  - "Schedule Thread" — pick date/time, schedule all tweets
  - "Save Draft" — save to drafts
  - "Copy All" — copy thread as formatted text (for manual posting)
  - "Export" — download as JSON or Markdown

**2. Create `dashboard/js/thread-composer.js`**
- Smart text splitting:
  - Split at sentence boundaries (`.`, `!`, `?` followed by space)
  - If a sentence alone exceeds 280 chars, split at word boundary
  - Keep @mentions and URLs intact (never split mid-URL)
  - Preserve paragraph breaks as split points
- Formatting helpers:
  - Bold simulation: convert `*text*` to Unicode bold (𝗯𝗼𝗹𝗱)
  - Italic simulation: convert `_text_` to Unicode italic (𝘪𝘵𝘢𝘭𝘪𝘤)
  - Strikethrough: `~text~` to Unicode strikethrough (t̶e̶x̶t̶)
  - Monospace: `` `text` `` to Unicode monospace (𝚝𝚎𝚡𝚝)
  - Small caps, fullwidth options
- Live preview updates on every keystroke (debounced at 150ms)

**3. Integration**
- Add "Thread Composer" link to dashboard nav
- API endpoint: `POST /api/thread` — accepts `{ tweets: [{ text, media? }], scheduleAt? }`
- MCP tool: `x_compose_thread` — accepts long text, returns split preview

### Rules
- Vanilla HTML/CSS/JS only — no frameworks
- Match existing dashboard style
- Accessible: keyboard navigation, screen reader labels
- Author credit: `// by nichxbt`

---

## 09-L — Notification Integrations (Email/Slack/Discord)

> **Kills:** Phantombuster (email alerts), Circleboom (Slack)
> **Gap:** Only webhook support, no native integrations.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build a notification hub that sends alerts to email, Slack, Discord, and Telegram.

### Requirements

**1. Create `src/notifications/notifier.js`**
- `Notifier` class:
  - `configure(config)` — set up channels:
    ```js
    {
      email: { enabled: true, smtp: { host, port, user, pass }, to: "you@example.com" },
      slack: { enabled: true, webhookUrl: "https://hooks.slack.com/..." },
      discord: { enabled: true, webhookUrl: "https://discord.com/api/webhooks/..." },
      telegram: { enabled: true, botToken: "...", chatId: "..." }
    }
    ```
  - `send(event)` — send to all enabled channels
    - `event`: `{ type, title, message, data, severity }` — severity: `info`, `warning`, `critical`
    - Format message appropriately per channel (Slack blocks, Discord embeds, email HTML, Telegram Markdown)
  - `sendTo(channel, event)` — send to a specific channel only
  - `test(channel)` — send a test notification

**2. Channel implementations**
- **Email**: use `nodemailer` (add to dependencies) — HTML-formatted emails with XActions branding
- **Slack**: POST to webhook URL with Block Kit formatting (no dependency needed — just `fetch`)
- **Discord**: POST to webhook URL with embed formatting (no dependency needed — just `fetch`)
- **Telegram**: POST to Bot API `sendMessage` endpoint (no dependency needed — just `fetch`)

**3. Pre-built notification triggers**
- Integrate with existing systems (add hooks, don't rewrite):
  - Reputation monitor (`src/analytics/reputation.js`) — "⚠️ Sentiment dropped below threshold"
  - Unfollower detection — "📉 Lost 5 followers today: @user1, @user2..."
  - Bulk operation completion — "✅ Bulk follow complete: 200/200 succeeded"
  - Scheduler job failure — "❌ Scheduled job 'daily-snapshot' failed"
  - Follower milestone — "🎉 You just hit 10,000 followers!"
  - Auto-snapshot growth alert — "📈 Gained 500 followers in 24 hours (unusual spike)"
  - Streaming event — "🔔 @target just posted a tweet matching your keywords"

**4. Integration**
- CLI:
  - `xactions notify:configure` — interactive setup wizard
  - `xactions notify:test <channel>` — send a test message
  - `xactions notify:send "Custom message" [--channel slack] [--severity warning]`
- Config stored in `~/.xactions/config.json` under `notifications` key
- MCP tools: `x_notify_send`, `x_notify_test`, `x_notify_configure`

### Rules
- Only `nodemailer` as a new dependency — all other channels use raw `fetch`
- Never log email passwords or webhook URLs in console output
- Author credit: `// by nichxbt`

---

## 09-M — Robust Pagination & Retry Engine

> **Kills:** Apify (robust pagination, retries, dataset storage)
> **Gap:** Scraping relies on scroll-based DOM extraction — can miss items, no retry on partial results.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build a robust scraping engine with smart pagination, automatic retries, deduplication, and progress tracking that wraps the existing Puppeteer scrapers.

### Requirements

**1. Create `src/scraping/paginationEngine.js`**
- `PaginationEngine` class:
  - `constructor(options)`: `{ maxPages, maxItems, pageTimeout, scrollDelay, retries, deduplicateBy }`
  - `scrapeWithPagination(page, extractFn, options)` — core method:
    - Scroll the page, call `extractFn()` after each scroll to extract new items
    - Deduplicate by `deduplicateBy` field (default: concat of unique fields like username or tweet ID)
    - Detect "stuck" scrolling: if 3 consecutive scrolls yield 0 new items, conclude the list is exhausted
    - Handle "Rate limit" / "Try again" / "Something went wrong" error pages — pause and retry
    - Track progress: items found, pages scrolled, duplicates filtered, errors encountered
    - Support `onProgress` callback: `(stats) => console.log(stats)`
    - Return: `{ items, stats: { total, duplicatesRemoved, pagesScrolled, errorsRecovered, duration } }`
  - `resume(checkpoint)` — resume from a saved checkpoint
    - Checkpoint: last scroll position + items already collected
    - Saved to `~/.xactions/scrape-checkpoints/{id}.json`

**2. Create `src/scraping/retryPolicy.js`**
- `RetryPolicy` class:
  - Configurable per-operation: `{ maxRetries, baseDelay, maxDelay, backoffMultiplier, retryOn }`
  - Default: 3 retries, 2s base delay, 60s max delay, 2x multiplier
  - `retryOn`: array of conditions — `["timeout", "network-error", "rate-limit", "empty-result"]`
  - `execute(fn)` — wrap any async function with retry logic
  - Jitter: add random 0-500ms to delay to avoid thundering herd
  - Circuit breaker: after `maxRetries` consecutive failures, throw with all error details

**3. Create `src/scraping/datasetStore.js`**
- Apify-style dataset storage:
  - `createDataset(name)` — create a named dataset directory
  - `pushData(name, items)` — append items to dataset (stored as JSONL for streaming)
  - `getData(name, { offset, limit })` — read items with pagination
  - `getInfo(name)` — dataset stats: item count, size, created/modified dates
  - `exportDataset(name, format)` — export to JSON, CSV, or JSONL
  - `deleteDataset(name)` — remove dataset
  - Datasets stored in `~/.xactions/datasets/{name}/`
- Auto-save: scraping results automatically saved to a dataset

**4. Integration**
- Wrap existing scrapers in `src/scrapers/twitter/index.js`:
  - Add `{ robust: true }` option to all scrape functions
  - When `robust: true`, use PaginationEngine + RetryPolicy
  - Non-breaking: existing behavior unchanged when `robust` is not set
- CLI flags on all scrape commands:
  - `--robust` — enable robust pagination
  - `--dataset <name>` — save results to a named dataset
  - `--resume` — resume from last checkpoint
  - `--max-retries N` — override retry count
- MCP tools: `x_dataset_list`, `x_dataset_get`, `x_dataset_export`, `x_dataset_delete`

### Rules
- No new npm dependencies — PaginationEngine and RetryPolicy are pure JS
- Datasets use JSONL (one JSON object per line) for append-friendly storage
- Checkpoint files must be small (<1KB) — only store position, not data
- Author credit: `// by nichxbt`

---

## 09-N — Team & Multi-User Support

> **Kills:** Phantombuster (team plans), Taplio (team features)
> **Gap:** Single-user tool only.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Add team/multi-user capabilities to the XActions API server and dashboard.

### Requirements

**1. Create `src/auth/teamManager.js`**
- User roles: `owner`, `admin`, `member`, `viewer`
- `createTeam(name, ownerUsername)` — create a new team
- `inviteUser(teamId, email, role)` — generate invite token
- `acceptInvite(token)` — join team
- `removeUser(teamId, username)`
- `updateRole(teamId, username, newRole)`
- `listTeamMembers(teamId)`
- Storage: `~/.xactions/teams.json` (or SQLite if 09-A is built)

**2. Permission model**
- `owner`: full access + can delete team
- `admin`: full access except team deletion + can manage members
- `member`: can run automations, scrape, view analytics. Cannot manage team settings.
- `viewer`: read-only access to analytics and scraping results. Cannot execute actions.
- `checkPermission(userId, action)` — returns boolean

**3. Shared workspace**
- All team members share:
  - Scheduled posts (calendar shows all team members' posts)
  - Datasets (scraping results)
  - CRM data (if 09-C is built)
  - Drafts queue
  - Bulk operation history
- Activity log: track who did what and when — `{ user, action, target, timestamp }`
  - `getActivityLog(teamId, { from, to, user, action })` — filterable log

**4. API auth**
- Add JWT-based auth to the API server:
  - `POST /api/auth/register` — create account (username + password hash)
  - `POST /api/auth/login` — get JWT token
  - `POST /api/auth/invite` — owner/admin sends invite
  - Middleware: `requireAuth(minRole)` — check JWT + role before route handlers
- Store users in `~/.xactions/users.json` with bcrypt-hashed passwords

**5. Dashboard integration**
- Update `dashboard/login.html` to use JWT auth
- Add team management page: `dashboard/team.html`
  - Show members, invite new members, change roles
  - Activity log viewer
- Show "Posted by @username" on scheduled posts in calendar
- Show user avatar/name in dashboard nav

### Rules
- Use `jsonwebtoken` and `bcryptjs` as new dependencies (both are lightweight)
- Do NOT use a full database — JSON file + in-memory cache is fine for teams <50 users
- Passwords must be hashed — never store plaintext
- Author credit: `// by nichxbt`

---

## 09-O — Dashboard Analytics Visualization

> **Kills:** All competitors (everyone has charts, XActions doesn't)
> **Gap:** Dashboard has minimal functionality, no analytics visualization.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build a rich analytics dashboard page with interactive charts and real-time metrics.

### Requirements

**1. Create `dashboard/analytics.html`**
- **Overview cards row** (top):
  - Total followers (with ↑/↓ change indicator)
  - Following count
  - Engagement rate (avg last 7 days)
  - Total impressions (last 7 days)
  - Each card: large number, smaller comparison text "vs. last week", color-coded trend arrow
- **Follower growth chart**:
  - Line chart showing followers over time (use data from 09-A if available, or scrape on-demand)
  - Toggleable time ranges: 7 days, 30 days, 90 days, 1 year
  - Show milestones (e.g., "Passed 5K")
- **Engagement breakdown chart**:
  - Bar chart: likes, retweets, replies, bookmarks per day
  - Stacked or grouped bars
- **Best time to post heatmap**:
  - 7×24 grid (day of week × hour)
  - Color intensity = engagement level
  - Tooltip on hover: "Tuesday 2pm — avg 3.2% engagement"
- **Top tweets table**:
  - Last 50 tweets sorted by engagement rate
  - Columns: text preview, likes, RT, replies, views, engagement rate, date
  - Click to expand full tweet
- **Audience insights panel** (if CRM data available):
  - Follower location distribution (top 10 locations)
  - Follower size distribution (pie: <1K, 1-10K, 10-100K, 100K+)
  - Tags cloud from CRM data

**2. Create `dashboard/js/analytics.js`**
- Use **Chart.js** via CDN (`<script src="https://cdn.jsdelivr.net/npm/chart.js">`) — single external dependency
- Fetch data from API endpoints
- Responsive: charts resize on window resize
- Dark mode support (check `prefers-color-scheme`)
- Auto-refresh: poll for new data every 5 minutes

**3. API endpoints** (add to `api/routes/`)
- `GET /api/analytics/overview` — current metrics + changes
- `GET /api/analytics/growth?days=30` — follower growth time series
- `GET /api/analytics/engagement?days=30` — daily engagement breakdown
- `GET /api/analytics/best-times` — heatmap data
- `GET /api/analytics/top-tweets?limit=50` — top performing tweets
- `GET /api/analytics/audience` — audience insights

**4. Dashboard navigation**
- Add "Analytics" link to all dashboard pages' nav
- Use 📊 emoji as icon
- Make it the default landing page after login

### Rules
- Chart.js via CDN is the ONLY allowed external frontend dependency
- Match existing dashboard CSS style
- All charts must have loading states (skeleton/spinner)
- Gracefully handle missing data (show "No data yet — run your first analytics scrape" message)
- Author credit: `// by nichxbt`

---

## 09-P — Apify/Phantombuster Export Compatibility

> **Kills:** Lock-in for Apify and Phantombuster users — make switching free.
> **Gap:** No import/export compatibility with competing tools.

You are working on the XActions project (`/workspaces/XActions`).

### Your Task

Build import/export adapters that let users bring their data from Apify and Phantombuster into XActions, and export XActions data in formats those tools understand.

### Requirements

**1. Create `src/compat/apifyAdapter.js`**
- **Import:**
  - `importApifyDataset(filePath)` — read an Apify dataset export (JSON array)
  - Auto-detect dataset type by field names:
    - Twitter profile: fields like `profileUrl`, `fullName`, `biography`, `followersCount`
    - Tweet: fields like `tweetUrl`, `tweetText`, `retweetCount`, `likeCount`
    - Followers list: fields like `userName`, `followsYou`, `followedByYou`
  - Normalize to XActions internal format (match output of XActions scrapers)
  - Return: `{ type, items, fieldMapping, unmappedFields }`
- **Export:**
  - `exportAsApifyDataset(items, type)` — convert XActions scrape results to Apify's expected field names
  - Support: profiles, tweets, followers
  - Output as JSON array (Apify's default format)

**2. Create `src/compat/phantombusterAdapter.js`**
- **Import:**
  - `importPhantomResult(filePath)` — read Phantombuster result CSV/JSON
  - Auto-detect phantom type by fields:
    - "Twitter Followers Collector": `twitterUrl`, `name`, `description`, `followers`
    - "Twitter Following Collector": similar fields
    - "Twitter Profile Scraper": `twitterUrl`, `name`, `bio`, `location`
    - "Twitter Auto Follow/Unfollow": `url`, `action`, `timestamp`
  - Normalize to XActions format
- **Export:**
  - `exportAsPhantomResult(items, phantomType)` — convert XActions data to Phantombuster field format
  - Support CSV output (Phantombuster's default)

**3. Create `src/compat/genericAdapter.js`**
- **Social Blade format:**
  - `exportAsSocialBlade(historyData)` — export historical follower data in Social Blade-compatible CSV
- **Generic CSV intelligence:**
  - `autoDetectCSV(filePath)` — read any CSV, auto-detect which columns are usernames, follower counts, tweet text, etc.
  - Use heuristics: column named "username"/"handle"/"screen_name" → username field
  - Return: `{ detectedType, fieldMapping, items, confidence }`

**4. Integration**
- CLI:
  - `xactions import <file> [--from apify|phantombuster|auto]` — auto-detect and import
  - `xactions export <dataset> --to apify|phantombuster|socialblade|csv|json`
  - `xactions convert <input-file> --from apify --to phantombuster` — direct format conversion
- MCP tools: `x_import_data`, `x_export_compat`, `x_convert_format`

### Rules
- No external dependencies — pure JS CSV/JSON parsing
- Auto-detection must be reliable (test against known field patterns)
- Never lose data during conversion — unmapped fields go into an `_extra` object
- Author credit: `// by nichxbt`
- Include field mapping documentation as comments in each adapter

---

## Execution Notes

- Each prompt (09-A through 09-P) is standalone. Run them in any order.
- If 09-A (Historical Analytics) is built first, many other prompts can leverage its SQLite database — but they all include fallback behavior if it doesn't exist.
- Prompts that modify shared files (like `src/mcp/server.js` for new MCP tools or `api/routes/` for new endpoints) should be validated after each to avoid merge conflicts.
- Budget estimate: ~$3-10 per prompt, ~$50-120 total for all 16.
- After completing all prompts, run the test suite (`npm test`) and verify the dashboard loads cleanly.

# Build 02: Browser-Use AI — Computer Use Agent Tool Library

> **Project**: XActions Browser-Use AI — Standardized browser-action API for computer-use agents (Claude, Operator, browser-use)  
> **Status**: New Build  
> **Priority**: #2 — XActions' browser scripts become the "stdlib" for AI-driven browser automation  
> **Author**: XActions Team  

---

## Executive Summary

Claude's computer use, OpenAI Operator, and open-source projects like `browser-use` are creating a new category: **AI that controls browsers like humans do**. XActions has 80+ browser automation scripts covering every X/Twitter action. This build packages them into a **standardized Browser Action API** — a typed, documented, composable library that any computer-use agent can invoke without understanding DOM selectors or X/Twitter's internal structure.

## Technical Context

### Existing XActions Browser Scripts
- **Core automation**: `src/automation/core.js` — Base functions for DOM interaction, waiting, scrolling
- **Standalone scripts**: `src/unfollowEveryone.js`, `src/unfollowback.js`, `src/detectUnfollowers.js`, `src/blockBots.js`, etc.
- **Scrapers**: `src/scrapers/twitter/`, `src/scrapers/bluesky/`, `src/scrapers/mastodon/`, `src/scrapers/threads/`
- **Browser automation**: `src/automation/` — Full suite of content interaction scripts
- **Agent browser driver**: `src/agents/browserDriver.js` — Puppeteer-based headless browser control
- **Anti-detection**: `src/agents/antiDetection.js` — Evasion of bot detection
- **MCP local tools**: `src/mcp/local-tools.js` — Puppeteer tool implementations for MCP

### Computer-Use Agent Landscape (2026)
1. **Claude Computer Use** — Anthropic's API for agents to control desktops/browsers via screenshots + coordinate clicking
2. **OpenAI Operator** — Browser agent that navigates web apps
3. **browser-use** — Open-source Python framework (30k+ stars) for AI browser control
4. **Playwright MCP** — Microsoft's browser automation via MCP
5. **Stagehand** — Browserbase's AI browser automation SDK

### The Gap
These agents can click buttons and fill forms, but they lack **domain-specific action libraries**. They waste tokens figuring out X/Twitter's DOM structure. XActions can provide:
- Pre-built, tested actions: "follow user", "post tweet", "scrape timeline"
- Stable selectors (updated with X/Twitter UI changes)
- Rate-limit-aware execution
- Anti-detection patterns built in

### Architecture Plan

```
┌──────────────────────────────────────────────────────┐
│              XActions Browser-Use API                 │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │              Action Registry                     │ │
│  │  200+ typed browser actions with schemas         │ │
│  │  Categories: navigate, interact, scrape, post    │ │
│  └─────────────────────┬───────────────────────────┘ │
│                        │                             │
│  ┌─────────┬───────────┼───────────┬──────────────┐  │
│  │         │           │           │              │  │
│  ▼         ▼           ▼           ▼              │  │
│ Puppeteer  Playwright  CDP      browser-use       │  │
│ Adapter    Adapter     Adapter  Adapter            │  │
│  │         │           │           │              │  │
│  └─────────┴───────────┴───────────┴──────────────┘  │
│                        │                             │
│  ┌─────────────────────▼───────────────────────────┐ │
│  │            Execution Engine                      │ │
│  │  Rate limiting • Retry logic • Anti-detection   │ │
│  │  Screenshot capture • Action recording          │ │
│  │  Selector fallback chains • Error recovery      │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │          Protocol Adapters                       │ │
│  │  MCP Tool Provider • A2A Skill Provider         │ │
│  │  REST API • WebSocket • CLI                     │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Key Files to Create
```
src/browser-use/
  index.js              — Main entry point and exports
  actionRegistry.js     — Registry of all browser actions with metadata
  actionExecutor.js     — Core execution engine with retry/rate-limit
  selectorEngine.js     — Resilient selector system with fallbacks
  screenshotCapture.js  — Screenshot and visual state capture
  actionRecorder.js     — Record and replay browser action sequences
  rateController.js     — Rate limiting and delay management
  adapters/
    puppeteer.js        — Puppeteer adapter (primary, from existing code)
    playwright.js       — Playwright adapter
    cdp.js              — Chrome DevTools Protocol direct adapter
    browserUse.js       — browser-use framework integration adapter
  actions/
    navigation.js       — Page navigation actions
    authentication.js   — Login, session management
    tweeting.js         — Post, reply, quote, repost, delete
    engagement.js       — Like, bookmark, follow, unfollow, block, mute
    scraping.js         — Profile, timeline, followers, search results
    media.js            — Upload images/video, download media
    dms.js              — Direct message actions
    spaces.js           — Twitter Spaces actions
    settings.js         — Account settings management
    communities.js      — Community join/leave/post
  protocols/
    mcp-provider.js     — Expose actions as MCP tools
    a2a-provider.js     — Expose actions as A2A skills
    rest-api.js         — REST API server for actions
    websocket.js        — WebSocket interface for real-time control
tests/browser-use/
  actionRegistry.test.js
  actionExecutor.test.js
  selectorEngine.test.js
  adapters.test.js
  actions.test.js
  integration.test.js
```

### Dependencies
```json
{
  "puppeteer": "already in project",
  "playwright": "^1.49.x",
  "@anthropic-ai/sdk": "^0.35.x",
  "sharp": "^0.33.x"
}
```

---

## Agent Build Prompts

---

### Prompt 1: Action Registry — The Complete Action Catalog

```
You are building the Browser Action Registry for XActions — the complete catalog of every browser action an AI agent can perform on X/Twitter.

Create file: src/browser-use/actionRegistry.js

This registry defines every atomic browser action with full metadata: what it does, what inputs it needs, what outputs it produces, and how to categorize/discover it.

Context:
- XActions has existing scripts: unfollowEveryone.js, unfollowback.js, detectUnfollowers.js, blockBots.js, postThread.js, etc.
- Existing scrapers in src/scrapers/twitter/ handle data extraction
- src/mcp/local-tools.js implements 60+ tool functions via Puppeteer
- DOM selectors are documented in docs/dom-selectors.md

Define the ActionDefinition schema:
{
  id: string,                    // e.g., 'tweet.post'
  name: string,                  // Human-readable: 'Post a Tweet'
  description: string,           // Full description
  category: string,              // navigation, authentication, tweeting, engagement, scraping, media, dms, spaces, settings, communities
  subcategory: string,           // e.g., 'compose', 'interact', 'manage'
  tags: string[],                // Searchable tags
  riskLevel: 'safe'|'moderate'|'high',  // safe=read-only, moderate=reversible, high=destructive
  requiresAuth: boolean,
  rateLimit: { maxPerMinute: number, maxPerHour: number, delayMs: number },
  inputSchema: object,           // JSON Schema for parameters
  outputSchema: object,          // JSON Schema for return value
  selectors: string[],           // data-testid selectors this action uses (for debugging)
  examples: Array<{ input, expectedOutput, description }>,
  dependencies: string[],        // Other action IDs this depends on (e.g., 'auth.login')
  platforms: string[],           // ['twitter', 'bluesky', 'mastodon', 'threads']
}

Register at least these action categories with ALL actions in each:

NAVIGATION (10+ actions):
  - navigate.home, navigate.profile, navigate.search, navigate.notifications,
    navigate.messages, navigate.bookmarks, navigate.lists, navigate.communities,
    navigate.spaces, navigate.settings, navigate.tweet, navigate.hashtag

AUTHENTICATION (5+ actions):
  - auth.loginWithCookie, auth.loginWithCredentials, auth.checkSession,
    auth.logout, auth.getSessionStatus

TWEETING (15+ actions):
  - tweet.post, tweet.reply, tweet.quote, tweet.repost, tweet.undo_repost,
    tweet.delete, tweet.pin, tweet.unpin, tweet.postThread, tweet.postWithMedia,
    tweet.postPoll, tweet.schedule, tweet.draft, tweet.edit, tweet.postWithLink

ENGAGEMENT (15+ actions):
  - engage.like, engage.unlike, engage.bookmark, engage.unbookmark,
    engage.follow, engage.unfollow, engage.block, engage.unblock,
    engage.mute, engage.unmute, engage.report, engage.hideReply,
    engage.muteConversation, engage.addToList, engage.removeFromList

SCRAPING (20+ actions):
  - scrape.profile, scrape.tweets, scrape.replies, scrape.media,
    scrape.likes, scrape.followers, scrape.following, scrape.mutualFollowers,
    scrape.searchResults, scrape.trending, scrape.hashtag, scrape.bookmarks,
    scrape.lists, scrape.listMembers, scrape.communities, scrape.spaces,
    scrape.notifications, scrape.dms, scrape.analytics, scrape.tweetDetails

MEDIA (8+ actions):
  - media.uploadImage, media.uploadVideo, media.downloadImage,
    media.downloadVideo, media.getMediaUrl, media.screenshot,
    media.captureTimeline, media.extractAltText

DMS (6+ actions):
  - dm.send, dm.sendImage, dm.read, dm.markRead, dm.delete, dm.getConversations

SPACES (5+ actions):
  - spaces.join, spaces.leave, spaces.create, spaces.schedule, spaces.getActive

SETTINGS (5+ actions):
  - settings.updateBio, settings.updateAvatar, settings.updateHeader,
    settings.updateDisplayName, settings.updateLocation

BULK (10+ actions):
  - bulk.unfollowAll, bulk.unfollowNonFollowers, bulk.deleteAllTweets,
    bulk.unlikeAll, bulk.clearBookmarks, bulk.blockBots,
    bulk.muteByKeywords, bulk.exportFollowers, bulk.exportBookmarks,
    bulk.massBlock

Build these functions:
1. getAction(actionId) — Get action definition by ID
2. getActions(category?) — Get all or by category
3. searchActions(query) — Full-text search across name, description, tags
4. getActionsByRisk(level) — Filter by risk level
5. getActionsByPlatform(platform) — Filter by platform
6. validateActionInput(actionId, params) — Validate params against inputSchema
7. getCategoryStats() — Return { category: count } summary

Export the registry as a singleton.
Author: @author nich (@nichxbt)
```

---

### Prompt 2: Resilient Selector Engine

```
You are building the Selector Engine for XActions Browser-Use — a resilient system that finds DOM elements even when selectors change.

Create file: src/browser-use/selectorEngine.js

Context:
- X/Twitter DOM changes frequently — selectors break regularly
- data-testid attributes are the most stable selectors
- XActions docs/dom-selectors.md has verified selectors
- The engine must be framework-agnostic (work with Puppeteer, Playwright, or raw CDP)

Build:

1. SelectorChain — Ordered fallback strategy for finding elements:
   {
     primary: string,           // Best selector (data-testid)
     fallbacks: string[],       // Alternative selectors in priority order
     visual: {                  // Visual/AI fallback
       description: string,     // "The blue Post button in the compose area"
       ariaLabel: string,       // ARIA label to search for
       role: string,            // ARIA role
       nearText: string,        // Text near the element
       position: string,        // 'top-right', 'bottom-center', etc.
     },
     lastVerified: string,      // ISO date of last successful use
     failCount: number          // Times all selectors failed
   }

2. SELECTOR_DATABASE — Complete mapping of action IDs to selector chains:
   Build from existing docs/dom-selectors.md plus these verified selectors:
   
   Navigation:
     home: '[data-testid="AppTabBar_Home_Link"]'
     search: '[data-testid="AppTabBar_Explore_Link"]'
     notifications: '[data-testid="AppTabBar_Notifications_Link"]'
     messages: '[data-testid="AppTabBar_DirectMessage_Link"]'
     profile: '[data-testid="AppTabBar_Profile_Link"]'
   
   Compose:
     tweetButton: '[data-testid="SideNav_NewTweet_Button"]'
     tweetInput: '[data-testid="tweetTextarea_0"]'
     tweetSubmit: '[data-testid="tweetButton"]'
     mediaButton: '[data-testid="fileInput"]'
     emojiButton: '[data-testid="emojiButton"]'
     pollButton: '[data-testid="pollButton"]'
     scheduleButton: '[data-testid="scheduledButton"]'
   
   Engagement:
     like: '[data-testid="like"]'
     unlike: '[data-testid="unlike"]'
     repost: '[data-testid="retweet"]'
     reply: '[data-testid="reply"]'
     share: '[data-testid="share"]'
     bookmark: '[data-testid="bookmark"]'
     unbookmark: '[data-testid="removeBookmark"]'
   
   Profile:
     followButton: '[data-testid="placementTracking"] [data-testid$="-follow"]'
     unfollowButton: '[data-testid="placementTracking"] [data-testid$="-unfollow"]'
     followingButton: the follow/following toggle
     editProfileButton: '[data-testid="editProfileButton"]'
     userCell: '[data-testid="UserCell"]'
   
   Timeline:
     tweetArticle: 'article[data-testid="tweet"]'
     tweetText: '[data-testid="tweetText"]'
     tweetTime: 'time'
     userAvatar: '[data-testid="Tweet-User-Avatar"]'
   
   (Add 50+ more selectors covering all action categories)

3. SelectorEngine class:
   - constructor(browserAdapter) — Takes a Puppeteer/Playwright page or CDP session
   
   - find(actionId, contextSelector?) — Find element using selector chain:
     a. Try primary selector
     b. On failure, try each fallback in order
     c. On all failures, try visual fallback:
        - Search by aria-label
        - Search by text content (nearText)
        - Search by role
     d. Log which selector worked (update lastVerified)
     e. Log failures (increment failCount)
     f. Return { element, selectorUsed, method: 'primary'|'fallback'|'visual' }
   
   - findAll(actionId) — Find all matching elements
   
   - waitFor(actionId, timeout) — Wait for element to appear (with fallback chain)
   
   - click(actionId) — Find and click an element
   
   - type(actionId, text) — Find an input and type text into it
   
   - getText(actionId) — Find element and return its text content
   
   - isVisible(actionId) — Check if element exists and is visible
   
   - reportBroken(actionId, details) — Report that a selector is broken:
     - Log the failure
     - Write to ~/.xactions/broken-selectors.json for tracking
     - Attempt auto-heal: try generic selectors based on the visual description
   
   - healthCheck() — Test a sample of selectors against the live page, report % working

4. Auto-healing:
   - When a selector fails, attempt to find the element by:
     a. Partial attribute matching: '[data-testid*="tweet"]'
     b. ARIA role + label combo
     c. XPath with text matching
     d. CSS class pattern matching (less stable, last resort)
   - Store newly discovered selectors as "candidate" fallbacks

Export SelectorEngine and SELECTOR_DATABASE.
Author: @author nich (@nichxbt)
```

---

### Prompt 3: Action Executor — Core Execution Engine

```
You are building the Action Executor for XActions Browser-Use — the engine that runs browser actions with retry logic, rate limiting, and error recovery.

Create file: src/browser-use/actionExecutor.js

Context:
- Import actionRegistry from src/browser-use/actionRegistry.js
- Import SelectorEngine from src/browser-use/selectorEngine.js
- X/Twitter enforces aggressive rate limits — all actions need 1-3s delays
- src/agents/antiDetection.js has bot detection evasion patterns
- Actions must be atomic (do one thing) and composable (chain together)

Build:

1. ActionExecutor class:
   constructor(options):
     - page: Puppeteer Page | Playwright Page
     - selectorEngine: SelectorEngine instance
     - rateController: RateController instance (from rateController.js)
     - screenshotOnError: boolean (default true)
     - maxRetries: number (default 3)
     - antiDetection: boolean (default true)
     - timeout: number (default 30000ms per action)
     - onActionStart: callback
     - onActionComplete: callback
     - onActionError: callback

2. execute(actionId, params) — Execute a single action:
   a. Lookup action definition from registry
   b. Validate params against inputSchema
   c. Check rate limits (wait if needed)
   d. Apply anti-detection delays (randomized 500-2000ms jitter)
   e. Execute the action handler with the selector engine
   f. Capture result (scrape actions return data, engagement actions return success/failure)
   g. On failure:
      - Screenshot the page state
      - Retry with exponential backoff (1s, 2s, 4s)
      - Try selector fallbacks
      - If all retries fail, return detailed error with screenshot
   h. Return ActionResult: { success, data, duration, retries, screenshot?, error? }

3. executeSequence(actions) — Execute multiple actions in order:
   actions: Array<{ actionId, params, condition?, onSuccess?, onFailure? }>
   - Execute each action sequentially
   - Pass output of previous action as available context to next
   - Support conditional execution: if condition(previousResult) is false, skip
   - Support onSuccess/onFailure callbacks per step
   - Stop on first failure (configurable: continueOnError)
   - Return SequenceResult: { results: ActionResult[], totalDuration, failedAt? }

4. executeParallel(actions) — Execute independent actions concurrently:
   - Only for actions marked as safe to parallelize (read-only scraping)
   - Respect per-action rate limits even in parallel
   - Return all results when all complete

5. Action handlers — Implement the actual browser interaction for key action categories:

   NAVIGATION handlers:
   - async handleNavigate(page, selectorEngine, { url, waitForSelector })
   - Navigate to URL, wait for page load, wait for target selector

   TWEETING handlers:
   - async handlePostTweet(page, selectorEngine, { text, mediaUrls })
     a. Click compose button (or navigate to compose)
     b. Wait for compose area to be ready
     c. Type text into tweet input
     d. If media: click media button, upload files, wait for upload completion
     e. Click post button
     f. Wait for confirmation (tweet appears in timeline)
     g. Extract and return the new tweet's URL

   ENGAGEMENT handlers:
   - async handleLike(page, selectorEngine, { tweetUrl })
     a. Navigate to tweet (if not already there)
     b. Find the like button
     c. Check if already liked (unlike vs like state)
     d. Click like
     e. Verify state changed

   SCRAPING handlers:
   - async handleScrapeProfile(page, selectorEngine, { username })
     a. Navigate to profile page
     b. Extract: name, handle, bio, location, website, joinDate, followerCount, followingCount, tweetCount, verified, avatar
     c. Return structured data

   - async handleScrapeTweets(page, selectorEngine, { username, count })
     a. Navigate to profile's tweets tab
     b. Scroll and collect tweets until count is reached
     c. For each tweet extract: text, timestamp, likes, reposts, replies, url, media
     d. Return array of tweet objects

   (Implement at least 15 action handlers covering the most important actions)

6. Error recovery patterns:
   - PAGE_CRASHED: Reload page, re-authenticate if needed, retry
   - SELECTOR_NOT_FOUND: Use selector engine fallbacks, screenshot for debugging
   - RATE_LIMITED: Wait with exponential backoff, retry after cooldown
   - AUTH_EXPIRED: Emit 'auth-required' event, pause execution
   - NETWORK_ERROR: Wait 5s, retry up to 3 times

Author: @author nich (@nichxbt)
```

---

### Prompt 4: Rate Controller

```
You are building the Rate Controller for XActions Browser-Use — managing action frequency to avoid rate limits and detection.

Create file: src/browser-use/rateController.js

Context:
- X/Twitter rate limits: ~300 likes/day, ~100 follows/day, ~50 DMs/day, ~2400 tweets/day
- Detection avoidance requires humanlike timing patterns
- Different actions have different limits

Build:

1. RateController class:
   constructor(options):
     - profile: 'conservative' | 'moderate' | 'aggressive' (default 'moderate')
     - customLimits: object (override default limits)
     - persistPath: string (save state for cross-session tracking)

2. Default rate limit profiles:
   conservative: {
     'tweet.post': { perMinute: 1, perHour: 10, perDay: 50, delayMs: [3000, 8000] },
     'engage.like': { perMinute: 3, perHour: 30, perDay: 150, delayMs: [1500, 4000] },
     'engage.follow': { perMinute: 1, perHour: 10, perDay: 50, delayMs: [3000, 8000] },
     'engage.unfollow': { perMinute: 1, perHour: 15, perDay: 100, delayMs: [2000, 6000] },
     'scrape.*': { perMinute: 5, perHour: 100, perDay: 1000, delayMs: [1000, 3000] },
     'dm.send': { perMinute: 1, perHour: 5, perDay: 25, delayMs: [5000, 15000] },
     'engage.repost': { perMinute: 2, perHour: 15, perDay: 100, delayMs: [2000, 5000] },
     'bulk.*': { perMinute: 2, perHour: 20, perDay: 200, delayMs: [2000, 5000] }
   }
   
   moderate: 1.5x conservative limits
   aggressive: 2.5x conservative limits (not recommended)

3. Core methods:
   - checkLimit(actionId) — Returns { allowed: boolean, waitMs: number, remaining: { minute, hour, day } }
   - consume(actionId) — Record an action execution, decrement counters
   - waitForSlot(actionId) — Async wait until the action is allowed, return when ready
   - getDelay(actionId) — Return a randomized delay in the configured range (with humanlike Gaussian distribution)
   - reset(actionId?) — Reset counters (all or specific action)
   - getStats() — Return usage stats: { actionId: { usedMinute, usedHour, usedDay, limitMinute, limitHour, limitDay } }
   - getRemainingBudget() — Return how many of each action type can still be performed today

4. Humanlike timing:
   - gaussianDelay(min, max) — Return a delay with bell curve distribution (most values in the middle)
   - addJitter(baseDelay, jitterPercent) — Add random jitter (±20% default)
   - sessionActivity() — Simulate human browsing sessions:
     Active periods (20-40 min) with rest periods (5-15 min)
     Reduced activity at "night" (configurable timezone)
   - typingDelay(text) — Calculate realistic typing delay for text (50-150ms per character, with occasional pauses)

5. Persistence:
   - Save action counters to ~/.xactions/rate-limits.json every 5 minutes
   - Load on startup to maintain cross-session limits
   - Reset daily counters at midnight (configurable timezone)

6. Window-based rate limiting:
   - Use sliding window counters (not fixed windows) for accuracy
   - Track: per-minute (60s window), per-hour (3600s), per-day (86400s)

Author: @author nich (@nichxbt)
```

---

### Prompt 5: Screenshot Capture and Visual State

```
You are building the Screenshot Capture system for XActions Browser-Use.

Create file: src/browser-use/screenshotCapture.js

This system captures browser state visually — for debugging, audit trails, and as input for vision-capable AI agents (Claude, GPT-4V).

Build:

1. ScreenshotCapture class:
   constructor(options):
     - page: Puppeteer/Playwright page
     - outputDir: string (default ~/.xactions/screenshots/)
     - format: 'png' | 'jpeg' | 'webp' (default 'png')
     - quality: number (for jpeg/webp, default 80)
     - maxHistory: number (max screenshots to keep, default 1000)
     - annotate: boolean (highlight elements, default false)

2. Capture methods:
   - captureFullPage() — Full page screenshot
     Returns: { path, width, height, timestamp, size }
   
   - captureViewport() — Current viewport only
   
   - captureElement(selector) — Screenshot a specific element:
     - Find element using selector engine
     - Scroll into view if needed
     - Capture with optional padding (20px around element)
   
   - captureAction(actionId, phase) — Timed capture during action execution:
     phase: 'before' | 'during' | 'after' | 'error'
     Associates screenshot with an action execution for audit trail
   
   - captureTimeline(username, count) — Capture visible tweets in timeline:
     - Scroll through timeline
     - Capture each tweet as a separate image
     - Return array of { tweetUrl, screenshot, text, timestamp }
   
   - captureDiff(before, after) — Compare two screenshots and highlight differences:
     - Use pixel comparison (without external ML)
     - Highlight changed regions with red outlines
     - Return { diffPath, changedPixels, percentChanged, regions: [{x,y,w,h}] }

3. Annotation:
   - annotateElement(screenshotPath, selector, label) — Draw a box and label around an element:
     - Use sharp (image processing library) to draw rectangles
     - Add text label above the box
     - Return annotated screenshot path
   
   - annotateClickTarget(screenshotPath, x, y, label) — Draw a circle at click coordinates
   
   - annotateSelectorChain(screenshotPath, selectors) — Highlight all found elements

4. Visual state extraction (for AI agents):
   - describeVisualState() — Capture screenshot + generate a structured description:
     {
       url: string,
       title: string,
       visibleElements: [{ selector, text, position, isClickable, isVisible }],
       scrollPosition: { top, left, height, totalHeight },
       forms: [{ selector, inputs: [{ name, type, value }] }],
       screenshot: string (base64 or file path)
     }
     This output can be sent to Claude/GPT-4V for visual reasoning.
   
   - getClickableElements() — Map all clickable elements with coordinates:
     Return array of { selector, text, x, y, width, height }
     This allows vision agents to click by coordinates.

5. Storage and cleanup:
   - Organize screenshots: ~/.xactions/screenshots/YYYY-MM-DD/action-id-timestamp.png
   - Auto-cleanup: delete screenshots older than 7 days
   - getScreenshotHistory(actionId?, date?) — List screenshots with metadata

Author: @author nich (@nichxbt)
```

---

### Prompt 6: Action Recorder — Record and Replay

```
You are building the Action Recorder for XActions Browser-Use — a system that records browser interactions and converts them into replayable action sequences.

Create file: src/browser-use/actionRecorder.js

This lets users (or AI agents) record a browser session and automatically generate an XActions action sequence that can be replayed, shared, or modified.

Build:

1. ActionRecorder class:
   constructor(options):
     - page: Puppeteer/Playwright page
     - actionRegistry: ActionRegistry instance
     - outputFormat: 'json' | 'yaml' | 'js' (default 'json')

2. Recording:
   - startRecording() — Begin intercepting browser events:
     Listen for:
     a. Page navigations (URL changes)
     b. Click events (element + coordinates + selector)
     c. Keyboard input (text typed into inputs)
     d. Scroll events (direction, distance)
     e. File uploads
     f. Network requests (for API call detection)
     
     Use CDP (Chrome DevTools Protocol) to intercept events at browser level.
     Attach via: page.client() in Puppeteer or page.context().newCDPSession(page) in Playwright.
   
   - stopRecording() — Stop intercepting, return RecordedSession
   
   - pauseRecording() / resumeRecording() — Temp pause/resume

3. RecordedSession:
   {
     id: string,
     startedAt: string,
     endedAt: string,
     duration: number,
     events: Array<RecordedEvent>,
     actions: Array<RecognizedAction>,
     url: string (starting URL)
   }

4. Event → Action recognition:
   - recognizeActions(events) — Convert raw browser events into XActions actions:
     Pattern matching rules:
     a. Navigate to x.com/compose/tweet + type text + click post button → tweet.post
     b. Click like button on a tweet → engage.like
     c. Click follow button on a profile → engage.follow
     d. Navigate to profile + scroll + collect data → scrape.profile
     e. Click repost button → engage.repost
     f. Navigate to /messages + type + send → dm.send
     
     Each RecognizedAction: { actionId, params, timestamp, confidence: number }
     Confidence: 1.0 = certain match, 0.5 = probable, < 0.5 = uncertain

5. Export formats:
   - toJSON(session) — Export as JSON action sequence:
     { name, description, actions: [{ actionId, params, delay }] }
   
   - toYAML(session) — Export as YAML workflow:
     name: "Recorded Workflow"
     steps:
       - action: tweet.post
         params: { text: "Hello" }
         delay: 2000
   
   - toJavaScript(session) — Generate executable JS code:
     ```
     import { createExecutor } from 'xactions/browser-use';
     const executor = await createExecutor({ headless: false });
     await executor.execute('tweet.post', { text: 'Hello' });
     ```
   
   - toMCPWorkflow(session) — Generate MCP tool call sequence

6. Replay:
   - replay(session, options) — Replay a recorded session:
     options: { speed: number (1=real-time, 2=2x speed), skipErrors: boolean, dryRun: boolean }
     - Execute each recognized action in order
     - Apply original delays (adjusted by speed factor)
     - Capture before/after screenshots per action
     - Return replay result with per-action success/failure

7. Persistence:
   - save(session, name) — Save to ~/.xactions/recordings/{name}.json
   - load(name) — Load a saved recording
   - list() — List all saved recordings

Author: @author nich (@nichxbt)
```

---

### Prompt 7: Puppeteer Adapter (Primary)

```
You are building the Puppeteer Adapter for XActions Browser-Use — the primary browser control layer.

Create file: src/browser-use/adapters/puppeteer.js

Context:
- XActions already uses Puppeteer extensively (src/agents/browserDriver.js, src/mcp/local-tools.js)
- src/agents/antiDetection.js has stealth configurations
- This adapter wraps Puppeteer's API into XActions' standardized BrowserAdapter interface

Build:

1. BrowserAdapter interface (define the contract all adapters must implement):
   {
     launch(options) — Start browser, return adapter instance
     close() — Close browser
     newPage() — Create new tab
     goto(url) — Navigate
     getUrl() — Current URL
     click(selector) — Click element
     type(selector, text) — Type into element
     waitForSelector(selector, timeout) — Wait for element
     querySelector(selector) — Find element, return handle
     querySelectorAll(selector) — Find all elements
     evaluate(fn, ...args) — Run JS in page context
     screenshot(options) — Take screenshot
     setViewport(width, height) — Set viewport size
     setCookie(cookie) — Set browser cookie
     getCookies() — Get all cookies
     scroll(direction, amount) — Scroll page
     getPageContent() — Get page HTML
     waitForNavigation(timeout) — Wait for page navigation
     on(event, handler) — Event listener
   }

2. PuppeteerAdapter class implementing BrowserAdapter:
   constructor(options):
     - headless: boolean (default true)
     - stealth: boolean (default true, uses antiDetection)
     - userDataDir: string (for persistent sessions)
     - proxy: string (optional)
     - viewport: { width: 1920, height: 1080 }
     - slowMo: number (slow down operations for debugging)
     - executablePath: string (optional, auto-detect Chrome)

3. launch(options):
   - Apply stealth settings from src/agents/antiDetection.js:
     a. Override navigator.webdriver
     b. Set realistic user agent
     c. Override canvas fingerprint
     d. Set WebGL vendor/renderer
     e. Override permissions
     f. Set realistic window dimensions
     g. Override plugin list
   - Launch Puppeteer with these args:
     ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled',
      '--disable-infobars', '--window-size=1920,1080']
   - Create default page with anti-detection applied

4. Enhanced methods beyond the base interface:
   - clickWithHumanBehavior(selector) — Move mouse in arc to element (not straight line), hover briefly, then click
   - typeWithHumanBehavior(selector, text) — Type at variable speed (50-200ms per char) with occasional typos and corrections
   - scrollNaturally(direction, distance) — Smooth scroll with variable speed, occasional pauses
   - waitForNetworkIdle(timeout) — Wait until no network requests for 500ms
   - interceptRequests(patterns) — Intercept and modify/block specific requests
   - emulateDevice(device) — Emulate mobile/tablet (using Puppeteer device descriptors)
   - getAccessibilityTree() — Get the full accessibility tree (for AI reasoning)

5. Session management:
   - saveSession(name) — Save cookies and localStorage to ~/.xactions/sessions/{name}.json
   - loadSession(name) — Restore a saved session
   - isLoggedIn() — Check if currently logged into X/Twitter

6. Error handling:
   - Automatic page crash recovery
   - Timeout handling with configurable defaults
   - Dialog/alert auto-dismiss
   - Memory leak prevention: close unused pages, limit concurrent pages

Author: @author nich (@nichxbt)
```

---

### Prompt 8: Playwright Adapter

```
You are building the Playwright Adapter for XActions Browser-Use — an alternative browser control layer.

Create file: src/browser-use/adapters/playwright.js

This implements the same BrowserAdapter interface as the Puppeteer adapter but uses Playwright, which supports Chromium, Firefox, and WebKit.

Build the PlaywrightAdapter class:

1. Same interface as PuppeteerAdapter (from src/browser-use/adapters/puppeteer.js)

2. Additional Playwright-specific features:
   - browserType: 'chromium' | 'firefox' | 'webkit' (default 'chromium')
   - Support multiple browser contexts (isolated sessions)
   - Built-in tracing: startTrace(), stopTrace() — Generate Playwright trace files
   - Video recording: startRecording(), stopRecording() — Record browser session as video
   - HAR capture: startHAR(), stopHAR() — Capture all network traffic as HAR file
   - Network route interception (Playwright's route API)

3. Anti-detection for Playwright:
   - Same stealth techniques as Puppeteer adapter
   - Use Playwright's addInitScript for stealth injection
   - Configure realistic browser context with:
     locale, timezone, geolocation, permissions, colorScheme

4. Cross-browser testing:
   - runAcrossBrowsers(fn) — Execute a function across Chromium, Firefox, and WebKit
   - This helps verify XActions actions work in all browsers

5. Mobile emulation:
   - Use Playwright's device descriptors (devices['iPhone 15'], devices['Pixel 8'])
   - Support touch events for mobile-specific interactions

Ensure full compatibility with the BrowserAdapter interface.
Include proper Playwright cleanup (browser.close(), context.close()).
Author: @author nich (@nichxbt)
```

---

### Prompt 9: CDP Direct Adapter

```
You are building the Chrome DevTools Protocol (CDP) Direct Adapter for XActions Browser-Use.

Create file: src/browser-use/adapters/cdp.js

This adapter communicates directly with Chrome/Chromium via WebSocket using the Chrome DevTools Protocol, without Puppeteer or Playwright as intermediaries. This is the lightest-weight option and enables connecting to already-running browsers.

Build the CDPAdapter class:

1. Implement the BrowserAdapter interface using raw CDP commands:
   - connect(wsUrl) — Connect to a running Chrome instance via WebSocket:
     a. Connect to chrome://inspect or a specific DevTools WebSocket URL
     b. Exchange CDP messages as JSON over WebSocket
     c. This enables attaching to the user's actual Chrome browser
   
   - launch(options) — Launch a new Chrome process and connect:
     a. Find Chrome/Chromium executable
     b. Launch with --remote-debugging-port=9222
     c. Wait for DevTools WebSocket URL
     d. Connect via WebSocket

2. CDP commands mapped to BrowserAdapter methods:
   - goto(url) → Page.navigate + Page.loadEventFired
   - click(selector) → Runtime.evaluate (querySelector) + Input.dispatchMouseEvent
   - type(selector, text) → Input.dispatchKeyEvent for each character
   - waitForSelector → Runtime.evaluate with polling
   - querySelector → Runtime.evaluate + DOM.querySelector
   - screenshot → Page.captureScreenshot
   - evaluate → Runtime.evaluate
   - setCookie → Network.setCookie
   - getCookies → Network.getCookies
   - scroll → Input.dispatchMouseEvent (wheel)

3. Unique CDP capabilities:
   - attachToExistingTab(tabId) — Attach to a specific browser tab
   - listTabs() — List all open tabs: [{ id, url, title }]
   - interceptNetwork(patterns, handler) — Low-level network interception via Fetch domain
   - captureDOM() — Get full DOM snapshot via DOMSnapshot.captureSnapshot
   - getPerformanceMetrics() — Page.getMetrics for performance monitoring
   - emulateNetworkConditions(profile) — Throttle network (3G, 4G, offline)
   - overrideUserAgent(ua) — Network.setUserAgentOverride
   - getCoverage() — CSS/JS coverage via Profiler domain

4. WebSocket management:
   - Auto-reconnect on disconnect (3 attempts with 1s backoff)
   - Message ID tracking for request/response correlation
   - Event subscription for CDP events (DOM.attributeModified, Network.requestWillBeSent, etc.)

5. This adapter is ideal for:
   - Connecting to the user's open Chrome browser (no new browser needed)
   - Ultra-lightweight browser control (no Puppeteer/Playwright dependency)
   - Advanced browser instrumentation (network, performance, accessibility)

Author: @author nich (@nichxbt)
```

---

### Prompt 10: browser-use Framework Integration Adapter

```
You are building the browser-use framework integration adapter for XActions.

Create file: src/browser-use/adapters/browserUse.js

browser-use (https://github.com/browser-use/browser-use) is a popular open-source framework for AI browser agents (30k+ GitHub stars). This adapter makes XActions actions available as browser-use "tools" that their agents can invoke.

Build:

1. XActionsToolProvider class:
   - constructor(options) — { actionRegistry, actionExecutor, selectorEngine }
   
   - getTools() — Return XActions actions formatted as browser-use tool definitions:
     Each tool: {
       name: string,           // e.g., 'xactions_tweet_post'
       description: string,    // From action registry
       parameters: object,     // JSON Schema from action registry
       execute: async fn       // Calls actionExecutor.execute()
     }
   
   - getCategoryTools(category) — Return tools for a specific category only

2. XActionsController class (browser-use Controller interface):
   - This is a browser-use Controller that injects XActions actions into any browser-use Agent
   
   - register_actions(controller) — Register all XActions actions:
     For each action in the registry:
       @controller.action(description, requires_browser=True)
       async def action_fn(params, browser):
           # Call XActions action executor
   
   - This must generate Python-compatible tool definitions since browser-use is Python
   - Output as JSON that the Python side can consume

3. Bridge server for Python interop:
   - Since XActions is Node.js and browser-use is Python, create a bridge:
     a. HTTP server that accepts tool invocations from Python browser-use
     b. POST /execute — { actionId, params } → execute action, return result
     c. GET /tools — List all available tools in browser-use format
     d. GET /selectors — Get current selector database
   
   - Also create the Python client snippet:
     ```python
     # xactions_tools.py — Paste this into your browser-use project
     import requests
     XACTIONS_URL = "http://localhost:3200"
     
     def get_xactions_tools():
         return requests.get(f"{XACTIONS_URL}/tools").json()
     
     async def execute_xactions(action_id, params):
         return requests.post(f"{XACTIONS_URL}/execute", json={"actionId": action_id, "params": params}).json()
     ```

4. Claude Computer Use integration:
   - formatForClaudeComputerUse() — Format XActions actions as Anthropic tool definitions:
     {
       name: string,
       description: string,
       input_schema: object (Anthropic format)
     }
   
   - handleClaudeToolCall(toolName, toolInput) — Execute a Claude Computer Use tool invocation:
     a. Map tool name to XActions action
     b. Execute via action executor
     c. Return result in Anthropic response format: { type: 'tool_result', content: [...] }
   
   - generateSystemPrompt() — Generate a system prompt for Claude that lists all available XActions tools

5. OpenAI Function Calling integration:
   - formatForOpenAI() — Format as OpenAI function definitions
   - handleOpenAIFunctionCall(name, arguments) — Execute and return result

Author: @author nich (@nichxbt)
```

---

### Prompt 11: MCP and A2A Protocol Providers

```
You are building the protocol providers that expose XActions Browser-Use actions through MCP and A2A.

Create files:
- src/browser-use/protocols/mcp-provider.js
- src/browser-use/protocols/a2a-provider.js

These providers make every registered browser action available as MCP tools and A2A skills.

1. MCP Provider (mcp-provider.js):
   - generateMCPTools(actionRegistry) — Convert all browser actions to MCP tool definitions:
     For each action:
     {
       name: `browser_${action.id.replace('.', '_')}`,  // e.g., 'browser_tweet_post'
       description: action.description + '\n[Browser Action - ' + action.riskLevel + ' risk]',
       inputSchema: action.inputSchema
     }
   
   - handleMCPToolCall(toolName, params, executor) — Execute an MCP tool call:
     a. Strip 'browser_' prefix, convert underscores back to dots
     b. Execute via ActionExecutor
     c. Return MCP-formatted response: { content: [{ type: 'text', text: JSON.stringify(result) }] }
   
   - registerWithMCPServer(mcpServer, actionRegistry, executor) — Register ALL browser actions
     as tools on an existing MCP server instance:
     a. Call mcpServer.setRequestHandler(ListToolsRequestSchema, ...) to include browser tools
     b. Call mcpServer.setRequestHandler(CallToolRequestSchema, ...) to handle browser tool calls
   
   - generateMCPConfig() — Generate MCP server config JSON for Claude Desktop:
     {
       "mcpServers": {
         "xactions-browser": {
           "command": "node",
           "args": ["src/browser-use/protocols/mcp-provider.js"],
           "env": { "XACTIONS_SESSION_COOKIE": "..." }
         }
       }
     }

2. A2A Provider (a2a-provider.js):
   - generateA2ASkills(actionRegistry) — Convert browser actions to A2A skills:
     For each action:
     {
       id: `xactions.browser.${action.id}`,
       name: action.name,
       description: action.description,
       tags: [...action.tags, 'browser-automation', action.category],
       inputSchema: action.inputSchema,
       outputSchema: action.outputSchema
     }
   
   - handleA2ATaskExecution(skillId, message, executor) — Execute an A2A task:
     a. Map skill ID to action ID
     b. Extract params from A2A message parts
     c. Execute via ActionExecutor
     d. Convert result to A2A artifacts (text parts, data parts, file parts for screenshots)
   
   - registerWithA2AServer(a2aServer, actionRegistry, executor) — Register browser actions
     as A2A skills on the existing A2A server from build 01

Both providers should:
- Auto-refresh when new actions are registered
- Include risk level warnings in descriptions
- Log all tool/skill invocations for audit
- Support both local and remote execution modes

Author: @author nich (@nichxbt)
```

---

### Prompt 12: REST API and WebSocket Server

```
You are building the REST API and WebSocket servers for XActions Browser-Use.

Create files:
- src/browser-use/protocols/rest-api.js
- src/browser-use/protocols/websocket.js

These provide HTTP and real-time WebSocket interfaces for controlling browser actions.

1. REST API (rest-api.js):
   Express.js server on port 3200 (configurable via BROWSER_USE_PORT):

   Endpoints:
   - GET /actions — List all registered browser actions with metadata
   - GET /actions/:category — List actions in a category
   - GET /actions/:actionId — Get single action definition with full schema
   - POST /actions/:actionId/execute — Execute an action:
     Body: { params: object }
     Response: { success, data, duration, screenshot?, error? }
   - POST /actions/sequence — Execute a sequence of actions:
     Body: { actions: [{ actionId, params }], continueOnError? }
   - GET /selectors — Get the full selector database
   - GET /selectors/:actionId — Get selectors for a specific action
   - POST /selectors/health — Run selector health check
   - GET /recordings — List saved recordings
   - POST /recordings/start — Start recording
   - POST /recordings/stop — Stop recording, return session
   - POST /recordings/:name/replay — Replay a recording
   - GET /session/status — Check browser session status (logged in, URL, etc.)
   - POST /session/login — Login with cookie
   - GET /screenshots — List recent screenshots
   - GET /screenshots/:id — Get a specific screenshot (serves the image)
   - GET /rate-limits — Get current rate limit status
   - GET /health — Health check

   Include OpenAPI/Swagger spec generation:
   - GET /openapi.json — Auto-generated OpenAPI 3.0 spec from action registry

2. WebSocket Server (websocket.js):
   WebSocket server on same port (upgrade from HTTP):

   - Real-time bidirectional communication
   - Message format: { type: string, payload: object, id: string }
   
   Inbound messages (client → server):
     - { type: 'execute', payload: { actionId, params } } — Execute action
     - { type: 'subscribe', payload: { events: ['action.*', 'screenshot.*'] } } — Subscribe to events
     - { type: 'record.start' } — Start recording
     - { type: 'record.stop' } — Stop recording
     - { type: 'screenshot' } — Capture current state
   
   Outbound messages (server → client):
     - { type: 'action.started', payload: { actionId, params, timestamp } }
     - { type: 'action.completed', payload: { actionId, result, duration } }
     - { type: 'action.failed', payload: { actionId, error, screenshot } }
     - { type: 'screenshot.captured', payload: { path, base64, timestamp } }
     - { type: 'selector.broken', payload: { actionId, selector, attempted } }
     - { type: 'rate.limited', payload: { actionId, waitMs } }
     - { type: 'session.changed', payload: { loggedIn, url } }
   
   Features:
   - Client authentication via token in connection URL
   - Heartbeat ping/pong every 30s
   - Auto-reconnect support (send reconnect token)
   - Multiple simultaneous clients
   - Event filtering (clients only receive subscribed events)

Author: @author nich (@nichxbt)
```

---

### Prompt 13: Browser-Use Module Entry Point

```
You are building the main entry point for the XActions Browser-Use module.

Create file: src/browser-use/index.js

This file exports the entire Browser-Use module and provides a simple API for getting started.

Build:

1. Re-export all submodules:
   - actionRegistry
   - actionExecutor
   - selectorEngine
   - screenshotCapture
   - actionRecorder
   - rateController
   - adapters: { puppeteer, playwright, cdp, browserUse }
   - protocols: { mcp, a2a, rest, websocket }

2. createBrowserAgent(options) — All-in-one factory:
   options: {
     adapter: 'puppeteer' | 'playwright' | 'cdp' (default 'puppeteer'),
     headless: boolean (default true),
     stealth: boolean (default true),
     sessionCookie: string,
     rateLimitProfile: 'conservative' | 'moderate' | 'aggressive',
     screenshotOnError: boolean (default true),
     protocols: {
       mcp: boolean (default false),
       a2a: boolean (default false),
       rest: boolean | number (port, default false),
       websocket: boolean (default false)
     }
   }
   
   Returns: {
     executor: ActionExecutor,
     selectors: SelectorEngine,
     recorder: ActionRecorder,
     screenshots: ScreenshotCapture,
     rateController: RateController,
     page: BrowserAdapter page,
     
     // Convenience methods:
     execute(actionId, params) — Execute a single action
     sequence(actions) — Execute a sequence
     record() — Start recording, return { stop, pause, resume }
     screenshot() — Capture current state
     login(cookie) — Login to X/Twitter
     close() — Cleanup everything
   }

3. Quick-start examples in JSDoc:
   ```
   // Basic usage
   import { createBrowserAgent } from 'xactions/browser-use';
   const agent = await createBrowserAgent({ sessionCookie: 'abc123' });
   await agent.execute('tweet.post', { text: 'Hello from XActions!' });
   await agent.close();
   
   // With REST API for external agents
   const agent = await createBrowserAgent({
     protocols: { rest: 3200 }
   });
   // Now other tools can POST to http://localhost:3200/actions/tweet.post/execute
   
   // Record and replay
   const recording = await agent.record();
   // ... do stuff in the browser ...
   const session = await recording.stop();
   await agent.sequence(session.actions);
   ```

4. CLI integration — Register commands:
   - xactions browser start — Start browser agent with REST API
   - xactions browser actions — List all available actions
   - xactions browser execute <actionId> [params] — Execute an action
   - xactions browser record — Start recording mode
   - xactions browser replay <name> — Replay a recording
   - xactions browser screenshot — Capture current state
   - xactions browser selectors health — Check selector health

5. Standalone mode (node src/browser-use/index.js):
   Parse CLI args and start the browser agent with REST API enabled.
   Log: available actions count, API URL, adapter type.

Author: @author nich (@nichxbt)
```

---

### Prompt 14: Complete Test Suite

```
You are building the test suite for XActions Browser-Use.

Create these test files using vitest:

1. tests/browser-use/actionRegistry.test.js:
   - Test that all action categories are populated (navigation, tweeting, engagement, scraping, media, dms, spaces, settings, bulk)
   - Test getAction returns correct action by ID
   - Test searchActions finds relevant results
   - Test validateActionInput catches invalid params
   - Test getActionsByRisk filters correctly
   - Test getActionsByPlatform returns platform-specific actions
   - Test each action has required fields: id, name, description, category, inputSchema, outputSchema
   - Test no duplicate action IDs

2. tests/browser-use/selectorEngine.test.js:
   - Test SELECTOR_DATABASE has entries for all critical actions
   - Test SelectorEngine.find with primary selector (mock page)
   - Test fallback chain when primary fails
   - Test visual fallback with aria-label
   - Test reportBroken logs and stores broken selectors
   - Test healthCheck returns percentage
   - Mock: Create a fake page object that simulates querySelector behavior

3. tests/browser-use/actionExecutor.test.js:
   - Test execute succeeds for a valid action (mock browser)
   - Test execute retries on failure
   - Test rate limiting pauses execution
   - Test executeSequence runs actions in order
   - Test executeSequence stops on error (when continueOnError=false)
   - Test anti-detection delay is applied
   - Test screenshot is captured on error
   - Test timeout aborts execution

4. tests/browser-use/rateController.test.js:
   - Test all three profiles have correct limits
   - Test checkLimit returns allowed=true when under limit
   - Test checkLimit returns allowed=false and waitMs when over limit
   - Test consume decrements counters
   - Test gaussianDelay returns values in range
   - Test sliding window resets after window passes
   - Test persistence saves and loads state

5. tests/browser-use/adapters.test.js:
   - Test PuppeteerAdapter implements full BrowserAdapter interface
   - Test PlaywrightAdapter implements full BrowserAdapter interface
   - Test CDPAdapter implements full BrowserAdapter interface
   - Test adapter factory creates correct adapter type
   - Mock: Use vitest.mock for puppeteer and playwright modules

6. tests/browser-use/integration.test.js:
   - Full integration: create agent → login → scrape profile → post tweet → verify
   - Test MCP provider generates valid tool definitions
   - Test REST API endpoints return correct responses
   - Test recording roundtrip: start → perform actions → stop → replay
   - Use mocked browser adapters for CI (no real browser needed)

Each file: minimum 8 test cases, use vitest describe/it blocks, mock external dependencies.
Author: @author nich (@nichxbt)
```

---

### Prompt 15: Documentation and Dashboard

```
You are writing the complete documentation and dashboard for XActions Browser-Use.

Create these files:

1. skills/browser-use-ai/SKILL.md:
   - Title: Browser-Use AI — Computer Use Agent Tool Library
   - Description: Standardized browser-action API for AI agents
   - Prerequisites: Node.js 20+, Chrome/Chromium installed
   - Quick Start: 5-line code example to post a tweet
   - Action Categories: Full list with counts
   - Configuration: All options and env vars
   - Adapter Guide: When to use Puppeteer vs Playwright vs CDP
   - Examples:
     a. Basic scraping workflow
     b. Engagement automation sequence
     c. Recording and replaying user sessions
     d. Integrating with Claude Computer Use
     e. Running as REST API for external tools
   - Troubleshooting: 8 common issues and fixes

2. docs/browser-use-api.md:
   - Complete API reference for all public functions
   - Action definition schema reference
   - Selector engine details and how to add custom selectors
   - Rate limit profiles and customization
   - Protocol adapters (MCP, A2A, REST, WebSocket)
   - Code examples for every adapter
   - Security: session cookie handling, anti-detection
   - Contributing: How to add new actions

3. docs/browser-use-actions.md:
   - Complete catalog of ALL registered actions
   - Organized by category
   - For each action: ID, name, description, inputSchema, outputSchema, riskLevel, examples
   - Rate limit info per action

4. dashboard/browser-use.html:
   Static HTML dashboard page:
   - Action Browser: Search/filter all 200+ actions, click to see details
   - Live Executor: Select an action, fill in params, click Execute, see result
   - Session Monitor: Current browser state, URL, logged-in status
   - Recording Studio: Start/stop recording, view timeline, export/replay
   - Selector Health: Visual grid showing selector status (green/yellow/red)
   - Rate Limit Dashboard: Usage bars for each action category, daily budget remaining
   - Screenshot Gallery: Recent screenshots with timestamp and action context
   Style: Match XActions dark theme, vanilla HTML/CSS/JS, responsive

All content must reference real code paths, real action IDs, and real configuration from the XActions codebase. No placeholders or mock data.
Author: @author nich (@nichxbt)
```

---

## Success Criteria

- [ ] 100+ browser actions registered with full schemas and metadata
- [ ] Selector engine with 50+ verified selectors and fallback chains
- [ ] Action executor with retry, rate limiting, and anti-detection
- [ ] Three browser adapters: Puppeteer, Playwright, CDP
- [ ] browser-use framework integration working
- [ ] Claude Computer Use and OpenAI function calling integration
- [ ] MCP and A2A protocol providers exposing all actions
- [ ] REST API with auto-generated OpenAPI spec
- [ ] WebSocket real-time control interface
- [ ] Action recording and replay working
- [ ] Screenshot capture with annotation support
- [ ] Full test suite passing with vitest
- [ ] Dashboard for browsing, executing, and monitoring actions
- [ ] Complete documentation with real code examples

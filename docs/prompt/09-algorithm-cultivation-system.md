# Prompt 09: Build the Algorithm Cultivation & Thought Leadership System

> **Goal:** Build the complete 24/7 LLM-powered thought leadership agent system, from browser scripts to headless autonomous operation.
>
> **Context:** Read these files first:
> - `docs/research/algorithm-cultivation.md` — Full research paper
> - `docs/research/llm-powered-thought-leader.md` — Architecture & implementation guide
> - `src/automation/algorithmTrainer.js` — Existing browser script (874 lines)
> - `src/automation/core.js` — Core utilities (473 lines)
> - `scripts/thoughtLeaderCultivator.js` — Standalone browser script
> - `docs/agents/browser-script-patterns.md` — Pattern reference
> - `docs/agents/selectors.md` — DOM selector reference

---

## Phase 1: Headless Agent Core (Priority: Critical)

### Prompt 1.1: Browser Driver

```
Create src/agents/browserDriver.js — a Puppeteer stealth wrapper for X.com automation.

Requirements:
- Uses puppeteer-extra with stealth plugin
- Session persistence: save/restore cookies from data/session.json
- Session validation: check if logged in by looking for AppTabBar_Profile_Link
- Anti-detection: randomized viewport (1280-1920 x 720-1080), realistic UA, timezone matching
- Human-like mouse movement with Bezier curves (not teleporting)
- Human-like typing with variable character delay (30-100ms)
- Variable scroll velocity with acceleration/deceleration
- Core page actions:
  - navigate(url) — goto with networkidle2, wait for primaryColumn
  - extractTweets() — returns array of { id, text, author, isAd, hasMedia, likeCount }
  - extractUserCells() — returns array of { username, bio, followers, isFollowing }
  - likeTweet(tweetId) — click like button on specific tweet
  - bookmarkTweet(tweetId) — click bookmark
  - retweetTweet(tweetId) — click retweet + confirm
  - replyToTweet(tweetId, text) — click reply, type, post
  - followUser(tweetOrCell) — click follow button
  - searchFor(query, tab) — navigate to search URL (top/latest/people)
  - postTweet(text) — compose and post original tweet
  - postThread(tweets[]) — post multi-tweet thread
  - scrollDown(pixels?) — smooth scroll with variance
  - screenshot(path?) — save screenshot for debugging
  - getTrendingTopics() — extract from explore page
- Error handling: catch navigation timeouts, selector not found, confirmation dialogs
- Export class BrowserDriver

Reference selectors from docs/agents/selectors.md.
Use patterns from docs/agents/browser-script-patterns.md adapted for Puppeteer.
Add logging with emoji prefixes matching XActions convention.
Comment: // by nichxbt
```

### Prompt 1.2: LLM Brain

```
Create src/agents/llmBrain.js — tiered LLM client for intelligent decision-making.

Requirements:
- Supports OpenRouter, OpenAI, and Ollama (local) as providers
- Configuration via constructor: { provider, apiKey, baseUrl, models: { fast, mid, smart } }
- Default models:
  - fast: deepseek/deepseek-chat (scoring, classification: ~$0.14/M tokens)
  - mid: anthropic/claude-3.5-haiku (reply generation: ~$0.80/M tokens)  
  - smart: anthropic/claude-sonnet-4 (content creation: ~$3/M tokens)
- Methods:
  - scoreRelevance(tweetText, nicheKeywords) → number 0-100
    Uses fast model. Returns parsed score. Falls back to 50 on error.
  - generateReply(tweet, persona, threadContext?) → string
    Uses mid model. Persona-consistent, contextual, varied style.
    Rules: no hashtags in replies, no "Great point" openers, 1-2 sentences.
  - generateContent({ type, persona, niche, trends, recentPosts }) → { type, text }
    Uses smart model. Types: 'tweet' (≤280 chars), 'thread' (array of tweets), 'quote' (commentary).
    Must avoid repeating recent posts.
  - analyzeStrategy(metrics) → string (recommendations)
    Uses smart model. Weekly strategic assessment.
  - checkPersonaConsistency(text, persona) → { consistent: bool, issues: string[] }
    Uses fast model. Ensures content matches persona voice.
- Token usage tracking: log cumulative tokens per model per day
- Rate limiting: max 10 calls/minute to any single model
- Retry with exponential backoff on 429/500 errors
- Export class LLMBrain

Add JSDoc comments. Author credit: // by nichxbt
```

### Prompt 1.3: Scheduler

```
Create src/agents/scheduler.js — circadian rhythm activity scheduler with human-like variance.

Requirements:
- Configurable timezone (default: America/New_York)
- Default daily schedule with activities mapped to hours (see research doc)
- Sleep period: 11 PM to 6 AM (zero activity)
- Activity intensity multiplier per hour (0.0-1.0)
- Methods:
  - getNextActivity() → { type, intensity, scheduledFor, query?, username? }
    Returns next activity based on current time + variance
    Types: 'sleep', 'search-engage', 'home-feed', 'influencer-visit',
           'create-content', 'engage-replies', 'explore', 'own-profile', 'search-people'
  - addVariance(minutes) — ±N minutes random offset to all scheduled times
  - isActiveHour() → boolean
  - getActivityMultiplier() → number (current hour's intensity)
  - getDailyPlan() → array of planned activities for today (for logging)
- Variance features:
  - ±15-30 min jitter on session start times
  - ±20% duration variance on sessions
  - 10% chance to skip any given session (humans are inconsistent)
  - Weekend vs weekday patterns (more midday activity on weekends)
  - Occasional "binge" sessions (2x normal duration, 5% chance)
- Export class Scheduler

Author credit: // by nichxbt
```

### Prompt 1.4: Main Agent Orchestrator

```
Create src/agents/thoughtLeaderAgent.js — the main 24/7 orchestrator.

Requirements:
- Imports: BrowserDriver, LLMBrain, Scheduler, better-sqlite3 for db
- Configuration via JSON config file (data/agent-config.json):
  {
    niche: { name, searchTerms[], influencers[], keywords[] },
    persona: { name, handle, tone, expertise[], opinions[], avoid[] },
    llm: { provider, apiKey, models: { fast, mid, smart } },
    schedule: { timezone, sleepHours: [start, end] },
    limits: { dailyLikes, dailyFollows, dailyComments, dailyPosts },
    browser: { headless, sessionPath }
  }
- Main loop:
  1. Launch browser, restore session, validate login
  2. Get next activity from scheduler
  3. If sleep: wait until next active period
  4. Execute activity with appropriate sub-actions
  5. Log all actions to SQLite database
  6. Save session cookies periodically (every 30 min)
  7. Check health (session valid, rate limits OK, no blocks)
  8. Repeat
- Activity handlers:
  - searchAndEngage(query, tab): navigate to search, extract tweets, 
    LLM-score each, engage based on score (>60: like, >80: reply)
  - browseHomeFeed(): scroll home, engage with relevant tweets
  - visitInfluencer(username): go to profile, engage with boost
  - createContent(type): LLM generates tweet/thread, post it
  - engageWithReplies(): check own tweet replies, reply back
  - browseExplore(): trending topics, random engagement
  - visitOwnProfile(): check own profile briefly
  - searchAndFollow(query): search people tab, follow qualifying users
- Error recovery:
  - On navigation timeout: retry once, then skip
  - On session expired: attempt re-login, alert if fails
  - On rate limit (429): pause 15 minutes
  - On unknown error: screenshot + log + continue
- Graceful shutdown on SIGINT/SIGTERM
- CLI arguments: --config <path>, --test (5-min run), --login (headed mode for manual login)
- Logging: structured JSON logs to stdout + file
- Export class ThoughtLeaderAgent + CLI runner

Author credit: // by nichxbt
```

---

## Phase 2: Supporting Components (Priority: High)

### Prompt 2.1: Database & Metrics

```
Create src/agents/database.js — SQLite-based action logging and metrics.

Tables:
- actions (id, type, target_id, metadata JSON, timestamp)
- follows (username, niche, followed_at, unfollowed_at)
- content (id, type, text, posted_at, impressions, likes, replies)
- metrics (date, followers, following, tweets, likes_given, follows_given, comments_given)
- llm_usage (date, model, calls, input_tokens, output_tokens, cost_usd)

Methods:
- logAction(type, targetId, metadata?)
- getActionsToday(type?) → count
- getRecentPosts(limit) → array
- trackFollow(username, niche)
- trackUnfollow(username)
- recordDailyMetrics(data)
- recordLLMUsage(model, inputTokens, outputTokens)
- getGrowthReport(days) → { followers: [], engagement: [], content: [] }
- isDuplicate(type, targetId) → boolean (prevent re-engaging)

Use better-sqlite3 for synchronous, fast, single-file DB.
Author credit: // by nichxbt
```

### Prompt 2.2: Persona Manager

```
Create src/agents/persona.js — manages persona consistency across all generated content.

Requirements:
- Load persona from config
- Provide persona context to LLM calls
- Track persona "voice" examples (append successful posts)
- Methods:
  - getContext() → string (persona description for LLM system prompt)
  - getExamplePosts(n) → string[] (recent posts for style reference)
  - addExample(text, metrics?) — record a post as a style example
  - validateContent(text) → { valid: bool, issues: string[] }
    Checks: under character limit, no banned phrases, no persona violations
  - getRandomCommentStyle() → 'question' | 'agreement' | 'insight' | 'humor' | 'pushback'
    For reply variety
- Persona config format:
  {
    name: "Alex",
    handle: "@alexbuilds", 
    niche: "AI & developer tools",
    tone: "curious, technical but accessible, witty",
    expertise: ["LLM engineering", "devtools", "AI agents"],
    opinions: ["Open source wins", "AI augments devs"],
    avoid: ["corporate jargon", "hashtag spam", "engagement bait"],
    exampleTweets: ["..."]
  }

Author credit: // by nichxbt
```

### Prompt 2.3: Anti-Detection Module

```
Create src/agents/antiDetection.js — human behavior simulation for Puppeteer.

Requirements:
- Mouse movement: Bezier curve paths with overshoot and correction
- Scroll behavior: variable velocity, acceleration/deceleration phases
- Typing: variable speed, occasional typo + backspace (2% chance per char)
- Click timing: pre-click hover, variable click duration
- Viewport randomization per session
- User-agent rotation (pool of 15-20 real Chrome UAs)
- Circadian activity patterns (export for scheduler)
- Session fingerprint generation: { viewport, ua, timezone, locale, colorDepth }
- "Human mistakes": scroll past content then scroll back (5% chance)
- Idle simulation: random mouse micro-movements during read pauses
- Methods:
  - generateFingerprint() → SessionFingerprint
  - moveMouse(page, x, y) — Bezier path
  - humanClick(page, selector) — hover + variance + click
  - humanType(page, selector, text) — variable speed + typos
  - humanScroll(page, pixels) — variable velocity
  - addJitter(baseDuration) → number (Gaussian variance)
  - simulateReading(page, durationMs) — mouse micro-movements during "reading"

Author credit: // by nichxbt
```

---

## Phase 3: Configuration & Setup (Priority: Medium)

### Prompt 3.1: Config Templates

```
Create these config files:

1. config/agent-config.example.json — Full example config with comments explaining each field.
   Include: 3 example niches (AI, crypto, startups), example persona, model defaults.

2. config/niches/ai-engineering.json — Pre-built niche config for AI/ML niche:
   50+ search terms, 20+ influencer handles, keyword clusters.

3. config/niches/web3-crypto.json — Pre-built niche config for crypto/DeFi.

4. config/niches/saas-startups.json — Pre-built niche config for SaaS/startups.

5. config/personas/technical-builder.json — Persona: technical, building-focused, practical.
6. config/personas/thought-leader.json — Persona: opinionated, insight-driven, visionary.
7. config/personas/community-builder.json — Persona: friendly, collaborative, supportive.

Each niche config format:
{
  "name": "AI Engineering",
  "searchTerms": [...],
  "influencers": [...],
  "keywords": [...],
  "topics": [...],
  "hashtagsToFollow": [...]
}

Each persona format:
{
  "name": "",
  "tone": "",
  "expertise": [],
  "opinions": [],
  "avoid": [],
  "exampleTweets": [],
  "replyStyles": { "question": 20, "agreement": 30, "insight": 30, "humor": 15, "pushback": 5 }
}
```

### Prompt 3.2: Setup Script

```
Create src/agents/setup.js — interactive setup wizard for first-time configuration.

Requirements:
- CLI interactive flow using readline or inquirer
- Steps:
  1. Select or create niche (list pre-built, or create custom)
  2. Select or create persona
  3. Configure LLM provider (OpenRouter, OpenAI, Ollama)
  4. Enter API key (validated with test call)
  5. Set timezone
  6. Set activity intensity (gentle/normal/active/grind)
  7. Open browser for manual X.com login → save cookies
  8. Run 2-minute test session to verify everything works
  9. Generate agent-config.json
  10. Print instructions for starting 24/7 operation

- Must handle: missing Chrome, missing deps, invalid API key, failed login
- Log each step with progress indicator
- Save all outputs to data/ directory

Author credit: // by nichxbt
```

---

## Phase 4: Monitoring & Dashboard (Priority: Medium)

### Prompt 4.1: Metrics API Endpoints

```
Add to api/routes/ — new endpoints for the thought leader agent metrics.

Routes:
- GET /api/agent/status — Current agent state (running, phase, uptime)
- GET /api/agent/metrics — Growth metrics (followers, engagement, content stats)
- GET /api/agent/actions — Recent action log (paginated)
- GET /api/agent/llm-usage — LLM token usage and cost breakdown
- POST /api/agent/config — Update agent config (niche, persona, limits)
- POST /api/agent/start — Start the agent
- POST /api/agent/stop — Graceful stop
- GET /api/agent/feed-score — Current feed relevance score (LLM-evaluated)
- GET /api/agent/report — Weekly strategy report (LLM-generated)

Each endpoint reads from the SQLite database.
Authentication: same middleware as existing XActions API.
```

### Prompt 4.2: Dashboard Page

```
Create dashboard/agent.html — monitoring dashboard for the thought leader agent.

Requirements:
- Real-time stats: followers, likes today, follows today, comments today
- Growth chart: follower count over time (Chart.js line chart)
- Activity heatmap: hours active today (24-column colored grid)
- Recent actions feed: scrollable list of recent likes/follows/comments
- LLM cost tracker: daily/weekly/monthly token usage and cost
- Feed relevance score: gauge showing how well the algorithm is trained
- Agent controls: Start/Stop buttons, mode selector (gentle/normal/active)
- Niche editor: view/edit search terms and influencers
- Last 5 screenshots: thumbnail grid from agent debugging screenshots

Match existing XActions dashboard style (dark theme, consistent with other pages).
Use Tailwind CSS classes consistent with existing dashboard pages.
```

---

## Phase 5: Advanced Features (Priority: Low)

### Prompt 5.1: Multi-Account Support

```
Extend src/agents/thoughtLeaderAgent.js to support multiple accounts.

Requirements:
- Each account has its own: session file, database, config, niche, persona
- Account rotation: run one account at a time, rotate every 1-2 hours
- Different IP per account (proxy support)
  - SOCKS5 proxy configuration per account
  - Proxy health checking
- Shared LLM brain (cost efficiency)
- Independent rate limiting per account
- CLI: --account <name> to run single account, --all to rotate

Config format:
{
  "accounts": [
    {
      "name": "ai-account",
      "sessionFile": "data/sessions/ai-account.json",
      "niche": "config/niches/ai-engineering.json",
      "persona": "config/personas/technical-builder.json",
      "proxy": "socks5://user:pass@ip:port"
    }
  ]
}
```

### Prompt 5.2: Content Calendar

```
Create src/agents/contentCalendar.js — scheduled content creation and posting.

Requirements:
- LLM generates a weekly content plan every Sunday
- Content plan includes: topic, type (tweet/thread/quote), scheduled time
- Review queue: generated content held for optional human review
- Auto-post if no review within configurable window (default: 2 hours)
- Variety enforcement: no two consecutive same-type posts
- Trending topic integration: adjust plan based on what's trending
- Performance feedback: track which content types/topics perform best
- Methods:
  - generateWeeklyPlan(niche, persona, pastPerformance) → ContentPlan
  - getNextScheduledPost() → Post | null
  - approvePost(postId) / rejectPost(postId, feedback)
  - regeneratePost(postId, feedback) — LLM rewrites based on feedback
  - getPerformanceReport() → { bestTopics, bestTypes, bestTimes }
```

### Prompt 5.3: Engagement Network

```
Create src/agents/engagementNetwork.js — coordinate multiple agents for amplification.

Requirements:
- Peer discovery: agents register their accounts with a central coordinator
- Engagement rules: 
  - Agents retweet/like each other's content (with realistic delays)
  - Never more than 30% cross-engagement (must remain mostly niche-focused)
  - Stagger engagement (not all agents at once — that's suspicious)
- Content sharing: share trending topics between agents
- Metrics sharing: pool engagement data for better strategy
- Communication: simple HTTP API or Redis pub/sub
- Safety: if one account gets flagged, others reduce cross-engagement

⚠️ This is the most ethically complex feature. Include clear warnings about
coordinated inauthentic behavior risks. Implement conservative defaults.
```

---

## Phase 6: Testing (Priority: High)

### Prompt 6.1: Test Suite

```
Create tests for the agent system:

1. tests/agents/scheduler.test.js
   - Test circadian rhythm (sleep hours return sleep activity)
   - Test variance is within bounds
   - Test weekend vs weekday patterns
   - Test all activity types are represented in a full day

2. tests/agents/llmBrain.test.js  
   - Mock fetch to test API call formatting
   - Test scoreRelevance returns 0-100 and handles JSON parse errors
   - Test generateReply respects persona constraints
   - Test retry logic on 429 errors
   - Test token usage tracking

3. tests/agents/database.test.js
   - Test action logging and retrieval
   - Test duplicate detection
   - Test daily metrics aggregation
   - Test growth report generation

4. tests/agents/persona.test.js
   - Test content validation (length, banned phrases)
   - Test persona context generation
   - Test example post tracking

Use vitest (already configured in the project).
Mock external dependencies (Puppeteer, fetch).
```

---

## Implementation Order

1. **Start with:** Prompt 1.1 (Browser Driver) + 1.2 (LLM Brain) — these are independent
2. **Then:** Prompt 1.3 (Scheduler) + 2.1 (Database) — also independent
3. **Then:** Prompt 1.4 (Orchestrator) — depends on all above
4. **Then:** Prompt 3.1 (Configs) + 3.2 (Setup) — usability
5. **Then:** Prompt 6.1 (Tests) — verification
6. **Then:** Phase 4 (Dashboard) — monitoring
7. **Last:** Phase 5 (Advanced) — only after core is solid

---

## Quick Start (After All Phases Built)

```bash
# Install
npm install

# Setup (interactive wizard)
npx xactions agent setup

# Test run (5 minutes)
npx xactions agent test

# Start 24/7
npx xactions agent start

# Monitor
npx xactions agent status
npx xactions agent report

# Stop
npx xactions agent stop
```

---

*This prompt file is part of the XActions prompt series. See `prompts/00-PROMPT-INDEX.md` for the full index.*

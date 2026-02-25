# Thought Leader Agent — Architecture

> Deep dive into every module, how they compose together, and design decisions.

---

## Table of Contents

- [System Overview](#system-overview)
- [Module Dependency Graph](#module-dependency-graph)
- [Module Reference](#module-reference)
  - [ThoughtLeaderAgent](#thoughtleaderagent)
  - [BrowserDriver](#browserdriver)
  - [LLMBrain](#llmbrain)
  - [Scheduler](#scheduler)
  - [Persona](#persona)
  - [AgentDatabase](#agentdatabase)
  - [AntiDetection](#antidetection)
  - [ContentCalendar](#contentcalendar)
  - [EngagementNetwork](#engagementnetwork)
- [Data Flow](#data-flow)
- [Activity Loop](#activity-loop)
- [Rate Limiting Strategy](#rate-limiting-strategy)
- [Anti-Detection Techniques](#anti-detection-techniques)
- [LLM Tier System](#llm-tier-system)
- [Database Schema](#database-schema)
- [File Layout](#file-layout)

---

## System Overview

The agent is a composition of 7 modules orchestrated by `ThoughtLeaderAgent`:

```
                          ┌──────────────────────┐
                          │  ThoughtLeaderAgent   │
                          │  (src/agents/         │
                          │   thoughtLeaderAgent)  │
                          └──────────┬───────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │              │           │           │              │
   ┌──────┴──────┐ ┌────┴────┐ ┌────┴────┐ ┌───┴────┐ ┌──────┴──────┐
   │BrowserDriver│ │LLMBrain │ │Scheduler│ │Persona │ │AgentDatabase│
   │             │ │         │ │         │ │        │ │             │
   │ Puppeteer + │ │ OpenAI/ │ │Circadian│ │Voice + │ │  SQLite     │
   │ Stealth     │ │OpenRouter│ │ Rhythm  │ │Guardrail│ │  Logging   │
   └──────┬──────┘ └─────────┘ └─────────┘ └────────┘ └─────────────┘
          │
   ┌──────┴──────┐
   │AntiDetection│
   │             │
   │ Bezier mouse│
   │ Human typing│
   │ Jitter      │
   └─────────────┘

   (Optional)
   ┌───────────────┐  ┌──────────────────┐
   │ContentCalendar│  │EngagementNetwork │
   │               │  │                  │
   │ Weekly plan   │  │ Multi-agent      │
   │ Review queue  │  │ content sharing  │
   └───────────────┘  └──────────────────┘
```

---

## Module Dependency Graph

```
thoughtLeaderAgent.js
  ├── browserDriver.js
  │     └── antiDetection.js
  ├── llmBrain.js
  ├── scheduler.js
  ├── persona.js
  ├── database.js
  ├── contentCalendar.js  (optional)
  └── engagementNetwork.js (optional)

setup.js
  ├── browserDriver.js
  └── thoughtLeaderAgent.js

api/routes/agent.js
  └── thoughtLeaderAgent.js (dynamic import on /start)
```

Every module is a standalone class with no circular dependencies. The orchestrator (`ThoughtLeaderAgent`) is the only module that imports all others.

---

## Module Reference

### ThoughtLeaderAgent

**File:** `src/agents/thoughtLeaderAgent.js`

The main orchestrator. Composes all modules and runs the infinite activity loop.

**Responsibilities:**
- Initialize all sub-modules from config
- Run the `start()` → `activityLoop()` → `stop()` lifecycle
- Dispatch activities based on Scheduler decisions
- Enforce rate limits (daily and per-type)
- Handle errors and recovery (browser restart, LLM fallback)
- Process SIGINT/SIGTERM for graceful shutdown

**Key methods:**

| Method | Purpose |
|---|---|
| `start()` | Launch browser, restore session, begin loop |
| `stop()` | Save session, close browser, close DB |
| `_activityLoop()` | Infinite loop: get next activity → execute → sleep |
| `_searchAndEngage()` | Search for niche terms, score tweets, engage with top results |
| `_browseHomeFeed()` | Scroll home feed, like/bookmark/reply to relevant tweets |
| `_visitInfluencer()` | Visit an influencer's profile, study and engage with their content |
| `_createContent()` | Generate and post original tweet or thread |
| `_engageWithReplies()` | Check replies on own posts, respond to build conversation |
| `_browseExplore()` | Visit trending/explore page, create timely content |
| `_visitOwnProfile()` | Check own metrics and record daily stats |
| `_searchAndFollow()` | Find and follow relevant accounts |
| `_canDo(type)` | Check if rate limit allows this action type |
| `_checkLimits()` | Log current rate limit status |

### BrowserDriver

**File:** `src/agents/browserDriver.js`

Puppeteer wrapper with stealth plugin and anti-detection. Every browser action goes through this module.

**Design decisions:**
- Uses `puppeteer-extra` with stealth plugin to bypass bot detection
- All clicks and typing go through `AntiDetection` for human-like behavior
- Session cookies are persisted to `data/session.json` for login persistence
- Screenshots are saved on errors for debugging

**Key selectors used (verified Feb 2026):**

| Element | Selector |
|---|---|
| Tweet article | `article[data-testid="tweet"]` |
| Tweet text | `[data-testid="tweetText"]` |
| Like button | `[data-testid="like"]` |
| Unlike button | `[data-testid="unlike"]` |
| Reply button | `[data-testid="reply"]` |
| Retweet button | `[data-testid="retweet"]` |
| Follow button | `[data-testid="followButton"]` |
| Bookmark button | `[data-testid="bookmark"]` |
| Tweet compose box | `[data-testid="tweetTextarea_0"]` |
| Post button | `[data-testid="tweetButtonInline"]` |
| Profile link | `a[data-testid="AppTabBar_Profile_Link"]` |
| Search input | `[data-testid="SearchBox_Search_Input"]` |
| Primary column | `[data-testid="primaryColumn"]` |
| User cell | `[data-testid="UserCell"]` |

### LLMBrain

**File:** `src/agents/llmBrain.js`

Three-tier LLM client with rate limiting and cost tracking.

**Tier system:**

| Tier | Model (default) | Use Case | Cost/1M tokens |
|---|---|---|---|
| `fast` | deepseek-chat | Scoring, quick checks | ~$0.14 |
| `mid` | claude-3.5-haiku | Reply generation | ~$1.00 |
| `smart` | claude-sonnet-4 | Content creation, strategy | ~$3.00 |

**Retry behavior:**
- 429 (rate limit): Exponential backoff, up to 3 retries
- 500 (server error): Exponential backoff, up to 3 retries
- All other errors: Return graceful defaults (50 for scores, empty for text)

**Rate limiting:**
- Internal: 10 calls per minute per model (configurable)
- External: Respects provider rate limit headers

**Usage tracking:**
- Tracks calls, input tokens, and output tokens per model per day
- Optional `onUsage` callback for database recording
- `getUsageToday()` returns cumulative stats

### Scheduler

**File:** `src/agents/scheduler.js`

Circadian rhythm scheduler that decides what the agent does and when.

**Hourly intensity curve (default):**

```
Hour:  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20 21 22
Mult: .3 .5 .7 .8 1. 1. .8 .7 .8 .7 .6 .7 .8 .9 .8 .6 .3
```

**Activity selection:**
1. Check if current hour is active (not sleep)
2. Generate a daily plan if one doesn't exist for today
3. Return the next unexecuted activity from the plan
4. Activities have jitter (±15-30 min) applied to scheduled times

**Variance features:**
- 10% chance to skip any activity (humans don't do everything)
- ±20% duration variance on each activity
- 5% chance of "binge sessions" (longer than normal engagement)
- Weekend activity reduction (~70% of weekday levels)

### Persona

**File:** `src/agents/persona.js`

Maintains voice consistency across all LLM-generated content.

**Validation rules (from `validateContent`):**

| Rule | Condition | Error |
|---|---|---|
| Empty check | Trimmed text is empty | `"Content is empty"` |
| Length check | > 280 characters (tweets) | `"Exceeds character limit"` |
| Banned phrases | Text contains any `avoid` phrase | `"Contains banned phrase: X"` |
| Bot patterns | Starts with "Great point", "Interesting", "Thanks for sharing" | `"Detected bot pattern"` |
| Hashtag spam | > 3 hashtags | `"Too many hashtags"` |
| Emoji spam | > 5 emojis | `"Too many emojis"` |

**Voice examples:**
- Initialized from `exampleTweets` in config
- `addExample()` lets the system learn from successful posts
- Capped at 50 examples, oldest dropped first
- Sorted by likes (higher-performing examples prioritized)

### AgentDatabase

**File:** `src/agents/database.js`

SQLite storage for action logging, metrics, and LLM usage tracking.

**Tables:**

| Table | Purpose |
|---|---|
| `actions` | Every action the agent takes (likes, follows, comments, posts) |
| `follows` | Follow/unfollow tracking with timestamps |
| `content` | Content created by the agent with performance metrics |
| `metrics` | Daily snapshots (followers, engagement counts) |
| `llm_usage` | LLM token consumption and cost per model per day |

See [Database Schema](#database-schema) section for full DDL.

### AntiDetection

**File:** `src/agents/antiDetection.js`

Makes all browser interactions indistinguishable from human behavior.

**Techniques:**

| Technique | Implementation |
|---|---|
| Mouse movement | Bezier curves with 20-30 intermediate points |
| Click behavior | Hover → pause (50-200ms) → click → hold (50-150ms) |
| Typing speed | Variable per-character delay (50-150ms), occasional pauses |
| Typo simulation | 2% chance per character, types wrong letter then backspaces |
| Scrolling | Acceleration → cruise → deceleration, 5% overshoot chance |
| Reading simulation | Micro mouse movements, occasional small scrolls |
| Fingerprinting | Randomized viewport, UA, timezone, locale per session |
| Circadian patterns | Activity intensity matches natural human rhythms |

**Fingerprint pool:** 20 real Chrome user agents across Windows/Mac/Linux.

### ContentCalendar

**File:** `src/agents/contentCalendar.js`

Weekly content planning and performance tracking.

**Content mix (default):**

| Type | Weight | Description |
|---|---|---|
| `insight` | 30% | Data-backed observations or unique takes |
| `question` | 15% | Engaging questions to the audience |
| `hot_take` | 10% | Contrarian or provocative opinions |
| `tutorial` | 10% | How-to or tips |
| `story` | 10% | Personal narratives or case studies |
| `curated` | 10% | Sharing and commenting on others' content |
| `engagement` | 10% | Polls, "would you rather", community prompts |
| `meta` | 5% | Behind-the-scenes, reflections |

**Lifecycle:**
1. `generateWeeklyPlan()` → Creates slots for each day
2. LLM pre-generates content for each slot
3. Items enter `review` status
4. `getNextToPost()` returns the next due item
5. `markPublished()` moves it to the published archive
6. `recordPerformance()` tracks engagement metrics
7. `getBestContentType()` optimizes future planning

### EngagementNetwork

**File:** `src/agents/engagementNetwork.js`

Multi-agent coordination for content discovery with strict ethical guardrails.

**Ethics policy (defaults):**

| Policy | Default | Description |
|---|---|---|
| `allowSelfRetweet` | `false` | Never coordinate retweets between accounts |
| `allowCoordinatedLiking` | `false` | Never coordinate likes between accounts |
| `allowContentSharing` | `true` | Share content discoveries (not engagement) |
| `allowTrendDiscovery` | `true` | Share trending topics across agents |
| `requireHumanReview` | `true` | Human must approve cross-agent engagement |
| `maxInteractionsPerPair` | `3` | Max daily interactions between any two agents |
| `minDelayBetweenInteractions` | `24h` | Min time between interactions within a pair |

---

## Data Flow

### Engagement Flow (Search & Engage)

```
Scheduler → "search-engage" activity
    │
    ├── Pick random search term from niche.searchTerms
    │
    ├── BrowserDriver.searchFor(term, 'latest')
    │
    ├── BrowserDriver.extractTweets()
    │     └── Returns [{id, text, author, likeCount, ...}]
    │
    ├── For each tweet:
    │     ├── Database.isDuplicate('like', tweet.id) → skip if true
    │     ├── LLMBrain.scoreRelevance(tweet.text, niche.keywords) → 0-100
    │     ├── Skip if score < 60
    │     ├── If score > 75 and _canDo('like'):
    │     │     ├── BrowserDriver.likeTweet(tweet.id)
    │     │     └── Database.logAction('like', tweet.id, {score})
    │     ├── If score > 85 and _canDo('comment'):
    │     │     ├── Persona.getRandomCommentStyle() → 'insight'
    │     │     ├── LLMBrain.generateReply(tweet, persona) → reply text
    │     │     ├── Persona.validateContent(reply) → {valid, issues}
    │     │     ├── BrowserDriver.replyToTweet(tweet.id, reply)
    │     │     └── Database.logAction('comment', tweet.id, {score, reply})
    │     └── Sleep (AntiDetection.addJitter(3000))
    │
    └── Database.logAction('search-engage', null, {term, tweetsScored})
```

### Content Creation Flow

```
Scheduler → "create-content" activity
    │
    ├── Database.getRecentPosts(10) → avoid repetition
    │
    ├── LLMBrain.generateContent({
    │     type: 'tweet',
    │     persona: Persona.getContext(),
    │     niche: config.niche,
    │     recentPosts: [...last 10]
    │   }) → {type, text}
    │
    ├── Persona.validateContent(text) → {valid, issues}
    │     └── If invalid: regenerate or skip
    │
    ├── LLMBrain.checkPersonaConsistency(text, persona)
    │     └── If inconsistent: regenerate or skip
    │
    ├── BrowserDriver.postTweet(text)
    │
    ├── Database.recordContent('tweet', text)
    │
    └── Persona.addExample(text) (if successful)
```

---

## Activity Loop

The main loop runs indefinitely with this structure:

```javascript
while (this._running) {
  const activity = this.scheduler.getNextActivity();

  if (activity.type === 'sleep') {
    await this._interruptibleSleep(activity.duration);
    continue;
  }

  try {
    await this._executeActivity(activity);
    this._consecutiveErrors = 0;
  } catch (error) {
    this._consecutiveErrors++;
    if (this._consecutiveErrors > 5) {
      // Restart browser
      await this.browser.close();
      await this.browser.launch();
    }
  }

  // Random delay between activities (2-8 minutes)
  await this._interruptibleSleep(
    this.antiDetection.addJitter(300000) // ~5 min base
  );
}
```

---

## Rate Limiting Strategy

Three layers of rate limiting prevent detection:

1. **Daily caps** — Hard limits per action type (configurable in `limits`)
2. **Hourly intensity** — Circadian multiplier reduces activity at low-energy hours
3. **Per-action cooldowns** — Random delays between each action (1-5 seconds)

```
dailyLikes: 100
  └── Hourly budget: ~6-12 likes per active hour
       └── Per-like delay: 2-5 seconds
            └── Plus jitter: ±30% variance
```

---

## LLM Tier System

```
┌─────────────────────────────────────────────────────┐
│                    LLM Brain                         │
│                                                      │
│  FAST tier          MID tier          SMART tier     │
│  ───────────       ──────────        ───────────     │
│  deepseek-chat     claude-haiku     claude-sonnet    │
│  ~$0.14/1M         ~$1.00/1M        ~$3.00/1M       │
│                                                      │
│  Used for:         Used for:        Used for:        │
│  • Score tweets    • Replies        • Original posts │
│  • Quick checks    • Short form     • Threads        │
│  • Persona check   • Comments       • Strategy       │
│  • ~200 calls/day  • ~25 calls/day  • ~5 calls/day   │
│                                                      │
│  Total daily cost: ~$0.10 at Normal intensity        │
└─────────────────────────────────────────────────────┘
```

---

## Database Schema

```sql
CREATE TABLE actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,           -- 'like', 'follow', 'comment', 'post', 'explore', 'search-engage'
  target_id TEXT,               -- tweet ID or username
  metadata TEXT,                -- JSON (score, reply text, etc.)
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE follows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  niche TEXT,
  followed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  unfollowed_at DATETIME
);

CREATE TABLE content (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,           -- 'tweet', 'thread', 'reply'
  text TEXT NOT NULL,
  tweet_id TEXT,
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,    -- ISO date (YYYY-MM-DD)
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  likes_given INTEGER DEFAULT 0,
  comments_given INTEGER DEFAULT 0,
  posts_made INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0
);

CREATE TABLE llm_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,           -- ISO date
  model TEXT NOT NULL,
  calls INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  UNIQUE(date, model)
);
```

---

## File Layout

```
src/agents/
  ├── thoughtLeaderAgent.js   # Main orchestrator + CLI entry point
  ├── browserDriver.js        # Puppeteer stealth browser wrapper
  ├── llmBrain.js             # Three-tier LLM client
  ├── scheduler.js            # Circadian rhythm activity planner
  ├── persona.js              # Voice consistency & content validation
  ├── database.js             # SQLite action logging & metrics
  ├── antiDetection.js        # Human behavior simulation
  ├── contentCalendar.js      # Weekly content planning
  ├── engagementNetwork.js    # Multi-agent coordination
  └── setup.js                # Interactive setup wizard

api/routes/
  └── agent.js                # REST API for monitoring & control

dashboard/
  └── agent.html              # Real-time monitoring dashboard

config/
  ├── agent-config.example.json
  ├── niches/
  │   ├── ai-engineering.json
  │   ├── web3-crypto.json
  │   └── saas-startups.json
  └── personas/
      ├── technical-builder.json
      ├── thought-leader.json
      └── community-builder.json

tests/agents/
  ├── scheduler.test.js       # 10 tests
  ├── llmBrain.test.js        # 21 tests
  ├── database.test.js        # 17 tests
  └── persona.test.js         # 16 tests (= 74 total)

data/                         # Runtime data (gitignored)
  ├── agent-config.json       # Your active config
  ├── agent.db                # SQLite database
  ├── session.json            # Browser cookies
  ├── content-calendar.json   # Weekly plans
  └── screenshots/            # Error screenshots
```

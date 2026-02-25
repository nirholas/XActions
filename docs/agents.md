# Thought Leader Agent

> Autonomous AI agent that grows your X/Twitter account 24/7 — LLM-powered content creation, human-like engagement, circadian scheduling, anti-detection, and multi-agent coordination. Replaces Hypefury, Typefully, and tweet schedulers.

## Overview

The Thought Leader Agent (`src/agents/`) is a fully autonomous system that operates your X/Twitter account like a real human thought leader. It:

- **Searches** for niche-relevant conversations and engages authentically
- **Creates** original tweets/threads using tiered LLM models
- **Follows** strategic accounts based on bio relevance scoring
- **Schedules** activity with circadian rhythms, jitter, and weekend adjustments
- **Evades detection** with Bezier-curve mouse movements, realistic typing with typos, and fingerprint randomization

---

## Architecture

```
src/agents/
├── thoughtLeaderAgent.js  → Main orchestrator (738 lines)
├── llmBrain.js            → Tiered LLM client (302 lines)
├── browserDriver.js       → Stealth Puppeteer wrapper (648 lines)
├── contentCalendar.js     → Content planning & scheduling (282 lines)
├── database.js            → SQLite metrics & action logging (301 lines)
├── engagementNetwork.js   → Multi-agent coordination (256 lines)
├── persona.js             → Persona voice & validation (182 lines)
├── scheduler.js           → Circadian activity scheduler (230 lines)
├── setup.js               → Interactive setup wizard (276 lines)
└── antiDetection.js       → Human behavior simulation (282 lines)
```

**3,497 lines total** — 10 modules, zero external orchestration needed.

```
┌──────────────────────────────────────┐
│        ThoughtLeaderAgent            │
│        (Main Event Loop)             │
├────────┬────────┬────────┬───────────┤
│        │        │        │           │
▼        ▼        ▼        ▼           ▼
Browser  LLMBrain Scheduler Database  Persona
Driver                                 │
│                                      │
▼                          ┌───────────┤
Anti-                      │           │
Detection           ContentCalendar  Engagement
                                     Network
                                    (optional)
```

---

## Quick Start

### Interactive Setup

```bash
xactions agent setup
```

8-step wizard:
1. **Niche** — Select from pre-built niches or create custom
2. **Persona** — Select persona or define tone/expertise/opinions
3. **LLM Provider** — OpenRouter, OpenAI, or Ollama (validates API key)
4. **Timezone** — For circadian scheduling
5. **Intensity** — Gentle → Normal → Active → Grind
6. **Login** — Opens browser for manual X.com login (saves session)
7. **Test run** — Optional 2-minute dry run
8. **Summary** — Config saved to `data/agent-config.json`

### Start the Agent

```bash
# Full run
xactions agent start --config data/agent-config.json

# Test mode (5 minutes)
xactions agent start --config data/agent-config.json --test

# Manual login first
xactions agent start --config data/agent-config.json --login
```

### Programmatic Usage

```javascript
import { ThoughtLeaderAgent } from 'xactions/src/agents/thoughtLeaderAgent.js';

const agent = new ThoughtLeaderAgent({
  niche: {
    name: 'AI/ML',
    searchTerms: ['artificial intelligence', 'machine learning', 'LLMs'],
    influencers: ['@kaboroevich', '@ylecun'],
    keywords: ['transformer', 'fine-tuning', 'RAG', 'agents'],
  },
  persona: {
    name: 'AI Researcher',
    handle: 'myhandle',
    tone: 'thoughtful and technical but accessible',
    expertise: ['deep learning', 'NLP', 'AI safety'],
    opinions: ['Open-source models will surpass proprietary ones'],
    avoid: ['politics', 'crypto shilling'],
    exampleTweets: ['The gap between open and closed models shrinks every month...'],
  },
  llm: {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY,
    models: {
      fast: 'deepseek/deepseek-chat',
      mid: 'anthropic/claude-3.5-haiku',
      smart: 'anthropic/claude-sonnet-4',
    },
  },
  schedule: { timezone: 'America/New_York', sleepHours: [23, 6] },
  limits: { dailyLikes: 150, dailyFollows: 80, dailyComments: 25, dailyPosts: 5 },
  browser: { headless: true, sessionPath: 'data/session.json' },
});

await agent.start();

// Check status
const status = agent.getStatus();
// { uptime, niche, persona, todaySummary, limitsRemaining }

// Graceful shutdown
await agent.stop();
```

---

## Configuration

### Full Config Schema

```json
{
  "niche": {
    "name": "AI/ML",
    "searchTerms": ["artificial intelligence", "machine learning"],
    "influencers": ["@kaboroevich", "@ylecun"],
    "keywords": ["transformer", "fine-tuning", "RAG"]
  },
  "persona": {
    "name": "AI Researcher",
    "handle": "myhandle",
    "tone": "thoughtful and technical but accessible",
    "expertise": ["deep learning", "NLP"],
    "opinions": ["Open-source models will surpass proprietary ones"],
    "avoid": ["politics", "crypto"],
    "exampleTweets": ["The gap between open and closed..."],
    "replyStyles": {
      "question": 20,
      "agreement": 30,
      "insight": 30,
      "humor": 15,
      "pushback": 5
    }
  },
  "llm": {
    "provider": "openrouter",
    "apiKey": "sk-...",
    "models": {
      "fast": "deepseek/deepseek-chat",
      "mid": "anthropic/claude-3.5-haiku",
      "smart": "anthropic/claude-sonnet-4"
    }
  },
  "schedule": {
    "timezone": "America/New_York",
    "sleepHours": [23, 6]
  },
  "limits": {
    "dailyLikes": 150,
    "dailyFollows": 80,
    "dailyComments": 25,
    "dailyPosts": 5
  },
  "browser": {
    "headless": true,
    "sessionPath": "data/session.json",
    "proxy": "socks5://proxy:1080"
  },
  "dbPath": "data/agent.db",
  "network": {
    "enabled": false
  }
}
```

### Intensity Presets

| Level | Daily Likes | Follows | Comments | Posts |
|-------|------------|---------|----------|-------|
| Gentle | 50 | 20 | 5 | 2 |
| Normal | 150 | 80 | 25 | 5 |
| Active | 250 | 120 | 40 | 8 |
| Grind | 400 | 200 | 60 | 12 |

---

## Modules

### LLM Brain

Tiered LLM client that uses the right model for each task.

```javascript
import { LLMBrain } from 'xactions/src/agents/llmBrain.js';

const llm = new LLMBrain({
  provider: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY,
  models: {
    fast: 'deepseek/deepseek-chat',
    mid: 'anthropic/claude-3.5-haiku',
    smart: 'anthropic/claude-sonnet-4',
  },
});
```

#### Tier Assignment

| Method | Tier | Model | Use Case |
|--------|------|-------|----------|
| `scoreRelevance(tweet, keywords)` | fast | DeepSeek | Score 0-100 tweet relevance |
| `checkPersonaConsistency(text, persona)` | fast | DeepSeek | Validate voice before posting |
| `generateReply(tweet, persona, context?)` | mid | Claude Haiku | Contextual 1-2 sentence replies |
| `generateContent({ type, persona, niche })` | smart | Claude Sonnet | Original tweets/threads |
| `analyzeStrategy(metrics)` | smart | Claude Sonnet | Growth recommendations |

#### Supported Providers

| Provider | Base URL | Auth |
|----------|---------|------|
| OpenRouter | `https://openrouter.ai/api/v1` | API key + `HTTP-Referer` header |
| OpenAI | `https://api.openai.com/v1` | API key |
| Ollama | `http://localhost:11434/v1` | None |

**Features:** Per-model rate limiting (10/min), automatic retry on 429/5xx, token usage tracking with cost computation.

---

### Browser Driver

Puppeteer-based browser automation with stealth and X/Twitter-specific helpers.

```javascript
import { BrowserDriver } from 'xactions/src/agents/browserDriver.js';

const driver = new BrowserDriver({
  headless: true,
  sessionPath: 'data/session.json',
  proxy: 'socks5://proxy:1080',
});

await driver.launch();
await driver.restoreSession();

if (await driver.isLoggedIn()) {
  await driver.navigate('https://x.com/home');
  const tweets = await driver.extractTweets();

  for (const tweet of tweets) {
    if (!tweet.isAd) {
      await driver.likeTweet(tweet.id);
    }
  }
}

await driver.saveSession();
await driver.close();
```

#### Available Actions

| Method | Description |
|--------|-------------|
| `launch()` / `close()` | Browser lifecycle |
| `saveSession()` / `restoreSession()` | Cookie persistence |
| `isLoggedIn()` | Check auth status |
| `navigate(url)` | Navigate and wait for content |
| `extractTweets()` | Extract `{ id, text, author, isAd, hasMedia, likeCount }` |
| `extractUserCells()` | Extract `{ username, bio, followers, isFollowing }` |
| `likeTweet(id)` | Like a specific tweet |
| `bookmarkTweet(id)` | Bookmark a tweet |
| `retweetTweet(id)` | Retweet with confirmation |
| `replyToTweet(id, text)` | Reply using anti-detection typing |
| `followUser(username?)` | Follow user on current/specified profile |
| `searchFor(query, tab?)` | Search with tab filter |
| `postTweet(text)` | Compose and post tweet |
| `postThread(tweets[])` | Post multi-tweet thread |
| `scrollDown(px?)` | Human-like scrolling |
| `getTrendingTopics()` | Extract trending topics |
| `screenshot(name?)` | Debug screenshot |

All interactions use `data-testid` selectors for stability across X UI updates.

---

### Anti-Detection

Human behavior simulation that makes browser automation indistinguishable from real users.

```javascript
import { AntiDetection } from 'xactions/src/agents/antiDetection.js';

const ad = new AntiDetection();

// Randomized browser fingerprint
const fp = ad.generateFingerprint();
// { viewport, userAgent, timezone, locale, colorDepth }

// Human-like mouse movement (Bezier curves)
await ad.moveMouse(page, 500, 300);

// Click with hover pause + hold duration
await ad.humanClick(page, '[data-testid="like"]');

// Type with variable speed + 2% typo rate
await ad.humanType(page, '[data-testid="tweetTextarea_0"]', 'Hello world');

// Scroll with acceleration/deceleration phases
await ad.humanScroll(page, 800);

// Simulate reading (micro-movements)
await ad.simulateReading(page, 3000);
```

#### Detection Evasion Features

| Feature | Implementation |
|---------|---------------|
| Mouse movement | Cubic Bezier curves, 18-35 steps, 15% overshoot chance |
| Clicking | Hover pause (50-300ms) → mousedown → hold (30-120ms) → mouseup |
| Typing | Variable WPM, 2% typo rate (wrong key → backspace → correct), word pauses |
| Scrolling | 3-phase (accelerate → constant → decelerate), 5% overshoot+correction |
| Reading | Micro-movements (1-5px), occasional small scrolls |
| Fingerprints | 20 real Chrome UAs, 11 timezones, 4 locales, random viewports |
| Timing | Gaussian jitter on all durations |

---

### Scheduler

Circadian activity scheduling that mimics real human patterns.

```javascript
import { Scheduler } from 'xactions/src/agents/scheduler.js';

const scheduler = new Scheduler({
  timezone: 'America/New_York',
  sleepHours: [23, 6],
  searchTerms: ['AI', 'machine learning'],
  influencers: ['@kaboroevich'],
  varianceMinutes: 20,
});

// Get next activity
const activity = scheduler.getNextActivity();
// { type: 'search-engage', query: 'AI', duration: 12, startTime }

// Check if active hours
scheduler.isActiveHour(); // true/false

// Get intensity for current hour (0.0-1.0)
scheduler.getActivityMultiplier(); // 0.8

// Full daily plan
const plan = scheduler.getDailyPlan();
```

#### Daily Activity Types

| Activity | Description | Typical Hours |
|----------|-------------|---------------|
| `home-feed` | Browse and engage with home feed | 7, 14, 18, 21 |
| `search-engage` | Search niche keywords and engage | 8, 10, 15 |
| `influencer-visit` | Visit and engage with influencer content | 9, 16 |
| `create-content` | Generate and post original content | 11, 17 |
| `engage-replies` | Like replies to own tweets | 12, 19 |
| `explore` | Browse Explore page for trends | 13 |
| `own-profile` | Brief self-visit (meta-signal) | 20 |
| `search-people` | Find and follow relevant accounts | 22 |

#### Intensity Curve

```
Hour:  0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
       ░░ ░░ ░░ ░░ ░░ ░░ ▓▓ ▓▓ ▓▓ ██ ██ ██ ▓▓ ▓▓ ██ ██ ██ ▓▓ ▓▓ ▓▓ ██ ▓▓ ▓▓ ░░
       SLEEP (0.0)        |  WAKE → PEAK → LUNCH DIP → AFTERNOON → EVENING → WIND DOWN
```

#### Human-like Variance

- **Gaussian jitter** on all start times
- **±20% duration variance** per session
- **10% random skip** chance on any activity
- **5% binge sessions** (2x normal duration)
- **Weekend adjustment** — wake 1-3 hours later

---

### Content Calendar

Weekly content planning with performance tracking.

```javascript
import { ContentCalendar } from 'xactions/src/agents/contentCalendar.js';

const calendar = new ContentCalendar({
  persona: myPersona,
  niche: myNiche,
  postsPerDay: 3,
  threadPerWeek: 1,
  contentMix: {
    insight: 30,
    question: 15,
    hot_take: 10,
    tutorial: 10,
    story: 10,
    curated: 10,
    engagement: 10,
    meta: 5,
  },
});

// Generate weekly plan
await calendar.generateWeeklyPlan('2025-W03', llm);

// Queue management
calendar.addToQueue({ type: 'insight', text: 'Here is my take...' });
calendar.approveItem(itemId);
const next = calendar.getNextToPost();

// Performance tracking
calendar.recordPerformance(tweetId, { likes: 45, impressions: 3200 });
const bestType = calendar.getBestContentType(); // 'insight'
```

#### Content Mix (Default)

| Type | Weight | Description |
|------|--------|-------------|
| `insight` | 30% | Original analysis or observation |
| `question` | 15% | Engage followers with questions |
| `hot_take` | 10% | Bold/contrarian opinion |
| `tutorial` | 10% | How-to or tip |
| `story` | 10% | Personal story or experience |
| `curated` | 10% | Sharing others' quality content |
| `engagement` | 10% | Polls, "agree or disagree" |
| `meta` | 5% | Behind-the-scenes or meta-commentary |

---

### Database

SQLite-based metrics, action logging, and cost tracking.

```javascript
import { AgentDatabase } from 'xactions/src/agents/database.js';

const db = new AgentDatabase('data/agent.db');

// Log actions
db.logAction('like', 'tweet-123', { score: 85 });
db.logAction('reply', 'tweet-456', { text: 'Great point!' });

// Check limits
const today = db.getActionsToday('like'); // 47

// Prevent duplicate engagement
if (!db.isDuplicate('like', 'tweet-123')) {
  await driver.likeTweet('tweet-123');
}

// Growth report
const report = db.getGrowthReport(30);
// { followers: { start, end, gained }, engagement: {...}, content: {...} }

// LLM cost tracking
db.recordLLMUsage('deepseek/deepseek-chat', 1500, 200);
const cost = db.getLLMCost(7); // Last 7 days total cost
```

#### Database Tables

| Table | Columns | Purpose |
|-------|---------|---------|
| `actions` | type, target_id, metadata, timestamp | All agent actions |
| `follows` | username, niche, followed_at, unfollowed_at | Follow lifecycle |
| `content` | type, text, impressions, likes, replies | Posted content |
| `metrics` | date, followers, following, tweets, daily counts | Daily snapshots |
| `llm_usage` | date, model, input_tokens, output_tokens, cost | LLM spend tracking |

#### LLM Cost Tracking

| Model | Input $/M tokens | Output $/M tokens |
|-------|-------------------|---------------------|
| `deepseek/deepseek-chat` | $0.14 | $0.28 |
| `anthropic/claude-3.5-haiku` | $0.80 | $4.00 |
| `anthropic/claude-sonnet-4` | $3.00 | $15.00 |

Typical daily cost at Normal intensity: ~$0.50-2.00

---

### Persona

Voice definition and content validation.

```javascript
import { Persona } from 'xactions/src/agents/persona.js';

const persona = new Persona({
  name: 'AI Researcher',
  handle: 'myhandle',
  tone: 'thoughtful but accessible',
  expertise: ['deep learning', 'NLP'],
  opinions: ['Open-source wins long-term'],
  avoid: ['politics', 'crypto shilling'],
  exampleTweets: ['The gap between open and closed models...'],
});

// Get LLM system prompt
const context = persona.getContext();

// Validate content before posting
const check = persona.validateContent('Great point! Follow me for more!');
// { valid: false, issues: ['Contains bot-like pattern: "Great point"', 'Contains bot-like pattern: "Follow me"'] }

// Add successful post as voice reference
persona.addExample('Open-source AI just hit a new milestone...', { likes: 340 });
```

#### Bot Pattern Detection

The persona validator rejects content containing:
- "Great point/take/thread/post"
- "Love this"
- "RT if you" / "Like if you"
- "Follow me"
- "Check out my"
- More than 2 hashtags
- More than 4 emojis
- Empty text or >280 characters

---

### Engagement Network

Optional multi-agent coordination with strict ethics enforcement.

```javascript
import { EngagementNetwork } from 'xactions/src/agents/engagementNetwork.js';

const network = new EngagementNetwork({
  maxNetworkSize: 5,
  maxInteractionsPerPair: 3,
  minDelayBetweenInteractions: 24 * 60 * 60 * 1000, // 24 hours
  allowSelfRetweet: false,
  allowCoordinatedLiking: false,
  allowContentSharing: true,
  allowTrendDiscovery: true,
  requireHumanReview: true,
});

// Register agents
network.registerAgent('agent-1', agent1);
network.registerAgent('agent-2', agent2);

// Share discoveries across agents
network.shareDiscovery('agent-1', { url: '...', text: '...', score: 92 });
const discoveries = network.getDiscoveriesForAgent('agent-2');

// Share trending topics
network.shareTrend('agent-1', { hashtag: '#AIagents', volume: 50000 });
const trends = network.getRecentTrends('AI');

// Ethics check before any interaction
const { allowed, violations } = network.checkEthics('agent-1', 'agent-2', 'like');
```

#### Ethics Policy

| Setting | Default | Description |
|---------|---------|-------------|
| `allowSelfRetweet` | `false` | Agents cannot retweet each other |
| `allowCoordinatedLiking` | `false` | No organized like-bombing |
| `allowContentSharing` | `true` | Share quality content discoveries |
| `allowTrendDiscovery` | `true` | Share trending topics |
| `requireHumanReview` | `true` | Queue items for human approval |
| `maxInteractionsPerPair` | 3 | Max interactions between two agents per day |
| `maxNetworkSize` | 5 | Maximum agents in network |

---

## CLI Commands

```bash
# Setup wizard
xactions agent setup

# Start agent
xactions agent start [--config <path>] [--test] [--login]

# Check status
xactions agent status

# View report
xactions agent report [--days 7]

# Test LLM connection
xactions agent test
```

---

## MCP Tools

When using XActions via AI agents (Claude, GPT):

| Tool | Description |
|------|-------------|
| `x_persona_create` | Create a new agent persona |
| `x_persona_list` | List configured personas |
| `x_persona_run` | Start autonomous agent |
| `x_persona_status` | Check running agent status |

---

## Data Persistence

| File | Location | Contents |
|------|----------|----------|
| Config | `data/agent-config.json` | Full agent configuration |
| Session | `data/session.json` | Browser cookies |
| Database | `data/agent.db` | SQLite — actions, metrics, costs |
| Calendar | `data/content-calendar.json` | Weekly plans, queue, performance |
| Network | `data/engagement-network.json` | Discovery sharing, trends |
| Screenshots | `data/screenshots/` | Debug screenshots on errors |

---

## Security & Ethics

- **No credential storage** — session cookies saved locally, no passwords stored
- **Rate limiting** — configurable daily limits enforced per action type
- **Duplicate prevention** — never engages the same tweet twice
- **Content validation** — all outbound content checked for bot patterns
- **Ethics enforcement** — multi-agent coordination prevents artificial engagement
- **Human review** — content queue supports approval workflow
- **Graceful shutdown** — saves session and database on SIGINT/SIGTERM

---

## Tips

- **Start with Gentle intensity** and increase over 1-2 weeks
- **Use OpenRouter** for cheapest multi-model access
- **Run the test mode** (`--test`) before committing to full runs
- **Check `agent report`** daily for the first week to tune content mix
- **Set `avoid` phrases** aggressively — better to miss engagement than post cringe
- **Keep example tweets updated** — add your best-performing posts as voice references
- **Use proxies** for multi-account setups to avoid IP-based detection
- **Monitor LLM costs** with `db.getLLMCost(7)` — DeepSeek is 20x cheaper for scoring tasks

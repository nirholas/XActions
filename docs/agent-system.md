# Thought Leader Agent System

> 24/7 LLM-powered autonomous agent for X/Twitter thought leadership growth. Runs headless with Puppeteer, generates content with LLMs, and behaves like a real human.

## Overview

The agent system is a fully autonomous growth engine that:

- **Browses X.com** like a real user (feed, explore, search, profiles)
- **Engages authentically** — likes, comments, follows, reposts with LLM-generated human-like responses
- **Creates original content** — tweets, threads, and polls based on your persona and niche
- **Avoids detection** — randomized timing, human typing patterns, fingerprint rotation, circadian scheduling
- **Tracks everything** — SQLite database logs all actions, metrics, LLM usage, and costs
- **Schedules intelligently** — respects sleep hours, varies activity levels, uses gaussian randomness

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              ThoughtLeaderAgent (orchestrator)        │
│                                                       │
│  ┌─────────────┐  ┌──────────┐  ┌─────────────────┐ │
│  │ BrowserDriver│  │ LLMBrain │  │   Scheduler     │ │
│  │  (Puppeteer) │  │(OpenRouter│  │ (circadian +    │ │
│  │  + stealth)  │  │  /OpenAI) │  │  gaussian)      │ │
│  └──────┬───────┘  └────┬─────┘  └────────┬────────┘ │
│         │               │                  │          │
│  ┌──────┴───────┐  ┌────┴─────┐  ┌────────┴────────┐ │
│  │AntiDetection │  │ Persona  │  │ AgentDatabase   │ │
│  │(fingerprints,│  │(voice,   │  │ (SQLite, logs,  │ │
│  │ mouse, typing│  │ niche,   │  │  metrics)       │ │
│  │  simulation) │  │ style)   │  │                 │ │
│  └──────────────┘  └──────────┘  └─────────────────┘ │
│                                                       │
│  ┌───────────────┐  ┌──────────────────────────────┐ │
│  │ContentCalendar│  │   EngagementNetwork          │ │
│  │(weekly plans, │  │   (multi-agent coordination, │ │
│  │ auto-publish) │  │    ethics guardrails)        │ │
│  └───────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Run the Setup Wizard

```bash
npx xactions agent setup
# or
npm run agent:setup
```

The wizard walks you through:
- Choosing a niche (AI Engineering, SaaS, Web3, or custom)
- Configuring your persona (name, tone, expertise, opinions)
- Setting up your LLM provider (OpenRouter recommended)
- Defining daily limits and schedule
- Browser settings (headless, proxy)

### 2. Log In to X.com

```bash
npx xactions agent login
# or
npm run agent:login
```

This opens a headed browser — log in manually, then press Enter. Your session cookies are saved to `data/session.json`.

### 3. Test for 5 Minutes

```bash
npx xactions agent test
# or
npm run agent:test
```

Runs the agent for 5 minutes so you can verify behavior before going 24/7.

### 4. Start the Agent

```bash
npx xactions agent start
# or
npm run agent
```

The agent runs continuously, sleeping during configured hours and varying activity intensity throughout the day.

### 5. Check Status & Reports

```bash
# Today's metrics
npx xactions agent status

# Last 7 days growth report
npx xactions agent report

# Last 30 days
npx xactions agent report --days 30
```

## Configuration

The agent reads from `data/agent-config.json`. Copy the example to get started:

```bash
cp config/agent-config.example.json data/agent-config.json
```

### Full Config Reference

```json
{
  "niche": {
    "name": "AI Engineering",
    "searchTerms": ["AI agents", "LLM engineering", "developer tools"],
    "influencers": ["karpathy", "AndrewYNg", "ylecun"],
    "keywords": ["AI", "LLM", "GPT", "Claude", "machine learning"]
  },

  "persona": {
    "name": "Alex",
    "handle": "@alexbuilds",
    "niche": "AI & developer tools",
    "tone": "curious, technical but accessible, witty",
    "expertise": ["LLM engineering", "devtools", "AI agents"],
    "opinions": [
      "Open source wins long-term",
      "Ship fast, iterate faster"
    ],
    "avoid": [
      "corporate jargon", "hashtag spam", "engagement bait"
    ],
    "exampleTweets": [
      "Just spent 3 hours debugging a prompt that was missing one word."
    ],
    "replyStyles": {
      "question": 20,
      "agreement": 25,
      "insight": 35,
      "humor": 15,
      "pushback": 5
    }
  },

  "llm": {
    "provider": "openrouter",
    "apiKey": "",
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
    "sessionPath": "data/session.json"
  }
}
```

### Config Fields

| Field | Type | Description |
|-------|------|-------------|
| `niche.name` | string | Your target niche name |
| `niche.searchTerms` | string[] | Terms the agent searches for on X |
| `niche.influencers` | string[] | Handles to visit and engage with |
| `niche.keywords` | string[] | Keywords for relevance scoring |
| `persona.tone` | string | Writing style description |
| `persona.expertise` | string[] | Topics you're an expert on |
| `persona.opinions` | string[] | Stances the agent should express |
| `persona.avoid` | string[] | Things the agent should never do |
| `persona.replyStyles` | object | Weighted reply type distribution (%) |
| `llm.provider` | string | `openrouter`, `openai`, or `ollama` |
| `llm.apiKey` | string | API key (or use `OPENROUTER_API_KEY` env var) |
| `llm.models.fast` | string | Cheap model for scoring (e.g., DeepSeek) |
| `llm.models.mid` | string | Mid-tier for replies (e.g., Haiku) |
| `llm.models.smart` | string | Best model for original content (e.g., Claude Sonnet) |
| `schedule.timezone` | string | IANA timezone for sleep hours |
| `schedule.sleepHours` | [number, number] | [start, end] hours when agent sleeps (24h) |
| `limits.dailyLikes` | number | Maximum likes per day |
| `limits.dailyFollows` | number | Maximum follows per day |
| `limits.dailyComments` | number | Maximum comments per day |
| `limits.dailyPosts` | number | Maximum original posts per day |
| `browser.headless` | boolean | Run browser without UI (true for servers) |
| `browser.sessionPath` | string | File path to save/load session cookies |
| `browser.proxy` | string | Optional proxy URL |

### Niche Presets

Pre-built configs in `config/niches/`:

| File | Niche |
|------|-------|
| `ai-engineering.json` | AI/ML, LLMs, developer tools |
| `saas-startups.json` | B2B SaaS, startup growth, PLG |
| `web3-crypto.json` | Web3, DeFi, blockchain development |

### Persona Presets

Pre-built personas in `config/personas/`:

| File | Style |
|------|-------|
| `thought-leader.json` | Visionary with strong opinions |
| `technical-builder.json` | Ship-focused engineer |
| `community-builder.json` | Connector and amplifier |

## Components

### ThoughtLeaderAgent

**File:** `src/agents/thoughtLeaderAgent.js`

The main orchestrator that runs the continuous activity loop. Each cycle:

1. Scheduler picks a weighted random activity
2. Agent executes the activity (browse feed, search, engage, create content)
3. Database logs the action
4. Scheduler calculates the next delay (with gaussian randomness)

**Activity Types:**

| Activity | Weight | Description |
|----------|--------|-------------|
| `search_engage` | 25% | Search niche terms, score relevance, engage with high-quality posts |
| `browse_feed` | 25% | Scroll home timeline, like/comment on relevant posts |
| `visit_influencer` | 15% | Visit an influencer's profile, engage with recent posts |
| `create_content` | 10% | Generate and post original tweets/threads |
| `engage_replies` | 10% | Reply to people who engaged with your posts |
| `browse_explore` | 5% | Browse the Explore page for trending content |
| `visit_own_profile` | 5% | Check own profile (trains the algorithm you're interested in your own content) |
| `search_follow` | 5% | Find and follow relevant accounts |

### BrowserDriver

**File:** `src/agents/browserDriver.js`

Puppeteer wrapper with stealth plugins and session management.

**Key methods:**
- `launch()` / `close()` — Browser lifecycle
- `navigate(url)` — Navigate with random delays
- `saveSession()` / `restoreSession()` — Cookie persistence
- `extractTweets()` — Parse tweets from current page
- `extractUsers()` — Parse user cards from current page
- `likeTweet(tweetEl)` / `followUser(userEl)` / `replyToTweet(tweetEl, text)` — Engagement actions
- `composeTweet(text)` — Post a new tweet
- `scrollDown()` — Human-like scrolling

### LLMBrain

**File:** `src/agents/llmBrain.js`

Tiered LLM integration with automatic retry and cost tracking.

**Model tiers:**
| Tier | Use Case | Default Model |
|------|----------|---------------|
| `fast` | Relevance scoring (cheap, high volume) | DeepSeek Chat |
| `mid` | Reply generation (balanced) | Claude 3.5 Haiku |
| `smart` | Original content creation (highest quality) | Claude Sonnet 4 |

**Key methods:**
- `scoreRelevance(tweet, persona)` → `number` (0–100)
- `generateReply(tweet, persona, style)` → `string`
- `generateContent(type, persona, topic)` → `{ text }` or `string[]` for threads
- `checkPersonaConsistency(text, persona)` → `{ consistent, issues }`
- `analyzeWeeklyPerformance(metrics)` → `string` (strategic analysis)

### Scheduler

**File:** `src/agents/scheduler.js`

Human-like activity scheduling with circadian rhythm simulation.

- 24-hour intensity curve (peak at 10am–2pm, minimum at 3am–5am)
- Gaussian random variance on all delays
- Sleep-hour enforcement (agent pauses entirely)
- Weighted random activity selection

### AgentDatabase

**File:** `src/agents/database.js`

SQLite storage via `better-sqlite3` with 5 tables:

| Table | Purpose |
|-------|---------|
| `actions` | Every engagement action (like, follow, comment, etc.) |
| `follows` | Follow/unfollow tracking with timestamps |
| `content` | Original posts with performance metrics |
| `metrics` | Daily aggregate metrics |
| `llm_usage` | Token counts and cost per model per day |

**Key methods:**
- `logAction(type, target, metadata)` — Log any action
- `getTodaySummary()` — Today's action counts
- `getGrowthReport(days)` — Multi-day growth report
- `getLLMCostReport(days)` — LLM spend breakdown

### AntiDetection

**File:** `src/agents/antiDetection.js`

Makes the agent behave like a real human:

- **Mouse movement:** Bezier curve simulation with natural acceleration
- **Typing:** Variable speed with occasional typos and corrections
- **Fingerprints:** 20+ real Chrome user-agent strings, randomized viewport, timezone, language
- **Delays:** Random pauses between actions that follow human patterns

### Persona

**File:** `src/agents/persona.js`

Manages the agent's identity and voice consistency.

- `getContext()` — Returns persona summary for LLM system prompts
- `validateContent(text)` — Checks text against persona rules (avoid list)
- `getRandomCommentStyle()` — Weighted random reply style selection

### ContentCalendar

**File:** `src/agents/contentCalendar.js`

Manages weekly content planning and publishing.

- `generateWeeklyPlan(themes)` — Creates a week of content slots
- `getNextPost()` — Returns the next scheduled post
- `markPublished(postId, tweetId)` — Records publication
- `recordPerformance(tweetId, metrics)` — Tracks post performance
- `getStats()` — Calendar statistics

### EngagementNetwork

**File:** `src/agents/engagementNetwork.js`

Multi-agent coordination with ethical guardrails (optional).

- `registerAgent(id, config)` — Add an agent to the network
- `shareDiscovery(agentId, discovery)` — Share high-value content across agents
- `shareTrend(agentId, trend)` — Share trending topics
- `checkEthics(from, to, type)` — Validate interactions against ethics policy
- `getNetworkStats()` — Network health metrics

**Ethics defaults:** Self-retweet coordination disabled, coordinated liking disabled, human review required.

## CLI Commands

```bash
# Full command reference
xactions agent --help

# Individual commands
xactions agent start [--config <path>]    # Start 24/7 agent
xactions agent test [--config <path>]     # 5-minute test run
xactions agent login                       # Browser login for auth
xactions agent setup                       # Interactive configuration wizard
xactions agent status [--config <path>]   # Today's metrics
xactions agent report [--days <n>]        # Growth report
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter API key (alternative to config file) |
| `OPENAI_API_KEY` | OpenAI API key (if using `openai` provider) |

## Data Files

All agent data is stored in the `data/` directory:

| File | Purpose |
|------|---------|
| `data/agent-config.json` | Agent configuration |
| `data/agent.db` | SQLite database (actions, metrics, costs) |
| `data/session.json` | Browser session cookies |
| `data/content-calendar.json` | Content calendar state |
| `data/engagement-network.json` | Network state (if enabled) |

## Safety & Rate Limits

The agent is designed to stay within X's rate limits:

- Default limits: 150 likes, 80 follows, 25 comments, 5 posts per day
- 1–3 second delays between all actions
- Circadian rhythm reduces activity during off-hours
- Sleep hours pause all activity
- Anti-detection measures prevent automated behavior flags

**Important:** Automated action on X.com may lead to account restrictions. Start with conservative limits and increase gradually. Always use a test account first.

## Testing

```bash
# Run all agent tests
npx vitest run tests/agents/

# Run specific module test
npx vitest run tests/agents/browserDriver.test.js
```

Test files: `database`, `llmBrain`, `persona`, `scheduler`, `browserDriver`, `thoughtLeaderAgent`, `antiDetection`, `contentCalendar`, `engagementNetwork` (120 tests total).

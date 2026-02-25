# Thought Leader Agent — Getting Started

> **24/7 autonomous X/Twitter growth agent** powered by LLMs. No API fees. Open source.
>
> Author: nich ([@nichxbt](https://x.com/nichxbt))

The Thought Leader Agent is XActions' flagship automation system. It runs continuously in the background, engaging with your niche community, building your persona, and growing your audience — all while mimicking natural human behavior.

---

## Table of Contents

- [What It Does](#what-it-does)
- [How It Works](#how-it-works)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Interactive Setup](#interactive-setup)
- [Manual Configuration](#manual-configuration)
- [Running the Agent](#running-the-agent)
- [Monitoring](#monitoring)
- [Stopping the Agent](#stopping-the-agent)
- [Next Steps](#next-steps)

---

## What It Does

The agent performs 8 core activities throughout the day, following a circadian rhythm:

| Activity | Description |
|---|---|
| **Search & Engage** | Finds niche-relevant tweets and engages with likes, bookmarks, and replies |
| **Home Feed Browsing** | Scrolls your home feed, scoring tweets by relevance, and engaging organically |
| **Influencer Visits** | Visits key accounts in your niche, studies their content, engages thoughtfully |
| **Content Creation** | Generates original tweets and threads using your persona voice |
| **Reply Engagement** | Checks replies on your posts and responds to grow conversations |
| **Explore Browsing** | Discovers trending topics and creates timely content |
| **Profile Review** | Visits your own profile to check performance metrics |
| **Search & Follow** | Finds and follows relevant people in your niche |

All activities are scored by an LLM for relevance before engagement. The agent never engages with off-topic content.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                   ThoughtLeaderAgent                         │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Scheduler │  │ LLM Brain│  │  Persona │  │ Database │    │
│  │           │  │          │  │          │  │          │    │
│  │ Circadian │  │ Score    │  │ Voice    │  │ SQLite   │    │
│  │ rhythm    │  │ Generate │  │ Validate │  │ Logging  │    │
│  │ planning  │  │ Analyze  │  │ Maintain │  │ Metrics  │    │
│  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│        │              │             │             │          │
│  ┌─────┴──────────────┴─────────────┴─────────────┴─────┐    │
│  │              Browser Driver (Puppeteer)               │    │
│  │  Anti-Detection · Stealth · Human-like behavior       │    │
│  └───────────────────────┬───────────────────────────────┘    │
└──────────────────────────┼───────────────────────────────────┘
                           │
                      ┌────┴───┐
                      │ X.com  │
                      └────────┘
```

- **Scheduler** decides *when* and *what* to do based on time of day
- **LLM Brain** decides *how* to engage (scoring relevance, generating replies)
- **Persona** ensures all content matches your voice and brand
- **Anti-Detection** makes all browser actions mimic natural human behavior
- **Database** logs every action for rate-limiting, deduplication, and analytics

---

## Requirements

- **Node.js** v18 or higher
- **An LLM provider** — one of:
  - [OpenRouter](https://openrouter.ai) (recommended — $5 credit lasts weeks)
  - [OpenAI](https://platform.openai.com) API key
  - [Ollama](https://ollama.ai) running locally (free, but slower)
- **An X/Twitter account** — logged into a Chrome browser
- **~500MB disk space** for Chromium and SQLite database

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/nirholas/XActions.git
cd XActions
npm install

# 2. Run the interactive setup wizard
node src/agents/setup.js

# 3. Start the agent
node src/agents/thoughtLeaderAgent.js
```

The setup wizard guides you through niche selection, persona configuration, LLM provider setup, and browser login.

---

## Interactive Setup

Run the 8-step setup wizard:

```bash
node src/agents/setup.js
```

### Step 1 — Select Your Niche

Choose from built-in niches or create a custom one:

| Niche | File | Search Terms | Influencers |
|---|---|---|---|
| AI & Engineering | `config/niches/ai-engineering.json` | 50+ | 22 |
| Web3 & Crypto | `config/niches/web3-crypto.json` | 50+ | 20 |
| SaaS & Startups | `config/niches/saas-startups.json` | 50+ | 20 |

Custom niches ask you to provide search terms, influencers, and keywords.

### Step 2 — Select Your Persona

Choose a voice archetype:

| Persona | Style | Best For |
|---|---|---|
| Technical Builder | Practical, code-focused, show-don't-tell | Developers, engineers |
| Thought Leader | Visionary, opinionated, first-principles | Founders, analysts |
| Community Builder | Collaborative, encouraging, inclusive | Community managers |

### Step 3 — Configure LLM Provider

Enter your API key for OpenRouter, OpenAI, or Ollama. The wizard validates your key with a test call.

### Step 4 — Set Timezone

Your timezone determines the agent's active hours (default: 6 AM – 11 PM local time).

### Step 5 — Set Intensity

| Level | Daily Likes | Daily Follows | Daily Comments | Posts |
|---|---|---|---|---|
| Gentle | 50 | 20 | 8 | 2 |
| Normal | 100 | 50 | 15 | 3 |
| Active | 150 | 80 | 25 | 5 |
| Grind | 200 | 100 | 40 | 8 |

### Step 6 — Browser Login

Opens a visible Chromium window. Log into X.com manually. Your session cookies are saved locally to `data/session.json`.

### Step 7 — Test Run (Optional)

Runs the agent for 2 minutes to verify everything works.

### Step 8 — Summary

Displays your config and saves it to `data/agent-config.json`.

---

## Manual Configuration

If you prefer to skip the wizard, copy and edit the example config:

```bash
mkdir -p data
cp config/agent-config.example.json data/agent-config.json
```

Edit `data/agent-config.json`:

```json
{
  "niche": {
    "name": "AI & Engineering",
    "searchTerms": ["AI agents", "LLM engineering", "open source AI"],
    "influencers": ["karpathy", "AndrewYNg"],
    "keywords": ["AI", "LLM", "machine learning"]
  },
  "persona": {
    "name": "Alex",
    "handle": "@alexbuilds",
    "tone": "curious, technical, witty",
    "expertise": ["LLM engineering", "devtools"],
    "opinions": ["Open source wins"],
    "avoid": ["corporate jargon", "hashtag spam"]
  },
  "llm": {
    "provider": "openrouter",
    "apiKey": "sk-or-v1-YOUR-KEY-HERE"
  },
  "schedule": {
    "timezone": "America/New_York",
    "sleepHours": [23, 6]
  },
  "limits": {
    "dailyLikes": 100,
    "dailyFollows": 50,
    "dailyComments": 15,
    "dailyPosts": 3
  }
}
```

See [Config Reference](agent-config-reference.md) for all options.

---

## Running the Agent

### Standard mode (headless, runs indefinitely)

```bash
node src/agents/thoughtLeaderAgent.js
```

### With a custom config path

```bash
node src/agents/thoughtLeaderAgent.js --config /path/to/my-config.json
```

### Test mode (runs for 5 minutes, then stops)

```bash
node src/agents/thoughtLeaderAgent.js --test
```

### Login mode (opens visible browser for manual login)

```bash
node src/agents/thoughtLeaderAgent.js --login
```

### Running with PM2 (recommended for production)

```bash
npm install -g pm2
pm2 start src/agents/thoughtLeaderAgent.js --name "xactions-agent"
pm2 logs xactions-agent
pm2 save  # persist across reboots
```

### Running with Docker

```bash
docker run -d \
  -v $(pwd)/data:/app/data \
  -e OPENROUTER_API_KEY=sk-or-v1-... \
  xactions/agent
```

---

## Monitoring

### Dashboard

Visit `/agent` on your XActions server to see real-time metrics:
- Activity heatmap
- Follower growth chart
- LLM cost tracker
- Live action feed
- Agent controls (start/stop)

### API

```bash
# Agent status
curl http://localhost:3001/api/agent/status

# Today's metrics
curl http://localhost:3001/api/agent/metrics?days=7

# Recent actions
curl http://localhost:3001/api/agent/actions?limit=20

# LLM cost breakdown
curl http://localhost:3001/api/agent/llm-usage?days=30

# Growth report
curl http://localhost:3001/api/agent/report?days=30
```

See [Agent API Reference](agent-api-reference.md) for all endpoints.

### Logs

The agent prints emoji-coded logs to stdout:

| Emoji | Meaning |
|---|---|
| 🤖 | Agent lifecycle (start, stop, activity begin) |
| ✅ | Successful action (like, follow, post) |
| ⚠️ | Warning (rate limit, skipped item) |
| ❌ | Error (browser crash, LLM failure) |
| 📊 | Metrics and reports |
| 💤 | Sleep/idle period |
| 🧠 | LLM decision or generation |

---

## Stopping the Agent

### Keyboard

Press `Ctrl+C` — the agent catches SIGINT, saves the session, and exits cleanly.

### API

```bash
curl -X POST http://localhost:3001/api/agent/stop
```

### PM2

```bash
pm2 stop xactions-agent
```

---

## Next Steps

- **[Config Reference](agent-config-reference.md)** — Every configuration option explained
- **[API Reference](agent-api-reference.md)** — REST API for monitoring and control
- **[Architecture](agent-architecture.md)** — Deep dive into how every module works
- **[Content Calendar](agent-content-calendar.md)** — Weekly content planning system
- **[Advanced Features](agent-advanced.md)** — Multi-account, engagement networks, and more

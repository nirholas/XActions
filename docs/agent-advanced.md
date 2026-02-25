# Thought Leader Agent — Advanced Features

> Content Calendar, Multi-Account support, Engagement Network, and dashboard monitoring.

---

## Table of Contents

- [Content Calendar](#content-calendar)
  - [Generating a Weekly Plan](#generating-a-weekly-plan)
  - [Review Queue](#review-queue)
  - [Auto-Post Integration](#auto-post-integration)
  - [Performance Tracking](#performance-tracking)
- [Dashboard Monitoring](#dashboard-monitoring)
  - [Accessing the Dashboard](#accessing-the-dashboard)
  - [Dashboard Panels](#dashboard-panels)
  - [Real-Time Updates](#real-time-updates)
- [Multi-Account Support](#multi-account-support)
  - [Proxy Configuration](#proxy-configuration)
  - [Account Rotation](#account-rotation)
  - [Shared LLM Brain](#shared-llm-brain)
- [Engagement Network](#engagement-network)
  - [How It Works](#how-it-works)
  - [Ethics Policy](#ethics-policy)
  - [Setting Up a Network](#setting-up-a-network)
  - [Content Discovery Sharing](#content-discovery-sharing)
  - [Trend Sharing](#trend-sharing)
- [Database Queries](#database-queries)
- [Troubleshooting](#troubleshooting)

---

## Content Calendar

The `ContentCalendar` module (`src/agents/contentCalendar.js`) provides structured weekly content planning, a review queue for human oversight, and performance analytics to optimize future content.

### Generating a Weekly Plan

```javascript
import { ContentCalendar } from './src/agents/contentCalendar.js';
import { LLMBrain } from './src/agents/llmBrain.js';

const llm = new LLMBrain({ provider: 'openrouter', apiKey: 'sk-...' });
const calendar = new ContentCalendar({
  persona: { name: 'Alex', tone: 'witty, technical' },
  niche: { name: 'AI Engineering' },
  postsPerDay: 3,
  threadPerWeek: 1,
  contentMix: {
    insight: 0.30,
    question: 0.15,
    hot_take: 0.10,
    tutorial: 0.10,
    story: 0.10,
    curated: 0.10,
    engagement: 0.10,
    meta: 0.05,
  },
});

// Generate next week's plan (LLM pre-generates content)
const plan = await calendar.generateWeeklyPlan('2026-W09', llm);
console.log(`Generated ${Object.values(plan.days).flat().length} posts`);
```

Each day's slots include:
- **Type** — Based on weighted content mix
- **Time** — Optimal posting window (morning, midday, evening)
- **Text** — LLM-generated draft (status: `review`)
- **Thread slot** — One per week on a random weekday

### Review Queue

The review queue lets you approve or reject generated content before it's posted:

```javascript
// Get pending items
const pending = calendar.getQueue();
console.log(`${pending.length} items awaiting review`);

// Approve an item
calendar.approveItem('2026-W09-1-0');

// Reject with reason
calendar.rejectItem('2026-W09-2-1', 'Too promotional');
```

Manual additions:

```javascript
// Add custom content to the queue
calendar.addToQueue({
  id: 'custom-1',
  type: 'hot_take',
  text: 'Most AI wrappers are just expensive grep commands.',
  time: '10:00',
});
```

### Auto-Post Integration

The agent automatically checks the calendar for due content:

```javascript
// In the activity loop:
const nextPost = calendar.getNextToPost();
if (nextPost) {
  const success = await browser.postTweet(nextPost.text);
  if (success) {
    calendar.markPublished(nextPost.id, tweetId);
  }
}
```

### Performance Tracking

Track engagement on published content to optimize future planning:

```javascript
// Record metrics
calendar.recordPerformance('1893456789', {
  impressions: 5400,
  likes: 87,
  replies: 23,
});

// Get aggregated stats by content type
const summary = calendar.getPerformanceSummary();
// { insight: { count: 12, avgLikes: 45 }, question: { count: 5, avgLikes: 67 } }

// Find best content type
const best = calendar.getBestContentType();
// 'question' — highest average likes with 3+ samples

// Overall stats
const stats = calendar.getStats();
// { weeksPlanned: 4, totalPlanned: 84, published: 62, queued: 3 }
```

---

## Dashboard Monitoring

### Accessing the Dashboard

Start the XActions server and navigate to:

```
http://localhost:3001/agent
```

### Dashboard Panels

The agent dashboard (`dashboard/agent.html`) provides 6 monitoring panels:

#### 1. Status Card
- **Running state** — Green/red indicator
- **Uptime** — How long the agent has been running
- **Today's actions** — Likes, follows, comments, posts
- **Start/Stop buttons**

#### 2. Follower Growth Chart
- Line chart (Chart.js) showing follower count over 7/30/90 days
- Hoverable data points with exact counts

#### 3. Activity Heatmap
- 7×24 grid showing hourly activity intensity
- Color-coded: darker = more active
- Reflects the circadian rhythm pattern

#### 4. Live Actions Feed
- Real-time scrolling list of recent actions
- Each entry shows: type (emoji), target, timestamp, relevance score
- Auto-refreshes every 30 seconds

#### 5. LLM Cost Tracker
- Pie chart of token usage by model tier
- Daily/weekly/monthly cost breakdown
- Per-model call count and token totals

#### 6. Today's Schedule
- Timeline view of planned activities
- Shows completed (green), current (blue), upcoming (gray)
- Includes activity type, scheduled time, and duration

### Real-Time Updates

The dashboard polls the API every 30 seconds:

```javascript
// Endpoints polled:
GET /api/agent/status       // Status card
GET /api/agent/actions      // Actions feed
GET /api/agent/metrics      // Growth chart
GET /api/agent/llm-usage    // Cost tracker
GET /api/agent/schedule     // Schedule timeline
```

---

## Multi-Account Support

Run multiple agent instances with different configs and proxies.

### Proxy Configuration

Each account should use a different residential proxy to avoid IP-based detection:

```json
{
  "browser": {
    "headless": true,
    "proxy": "socks5://user:pass@proxy1.example.com:1080",
    "sessionPath": "data/sessions/account1.json"
  },
  "dbPath": "data/databases/account1.db"
}
```

### Account Rotation

Run multiple agents with PM2:

```bash
# Account 1
pm2 start src/agents/thoughtLeaderAgent.js \
  --name "agent-account1" \
  -- --config data/configs/account1.json

# Account 2
pm2 start src/agents/thoughtLeaderAgent.js \
  --name "agent-account2" \
  -- --config data/configs/account2.json

# Account 3
pm2 start src/agents/thoughtLeaderAgent.js \
  --name "agent-account3" \
  -- --config data/configs/account3.json
```

### Shared LLM Brain

All accounts can share a single LLM API key. Token usage is tracked per-agent in separate databases:

```json
{
  "llm": {
    "provider": "openrouter",
    "apiKey": "sk-or-v1-SHARED-KEY"
  },
  "dbPath": "data/databases/account2.db"
}
```

---

## Engagement Network

The `EngagementNetwork` module enables multiple agents to share content discoveries while enforcing strict ethical guardrails.

### How It Works

```
Agent A discovers a great tweet
    │
    ├── shareDiscovery(agentA, { tweetId, text, topic })
    │
    ├── Agent B calls getDiscoveriesForAgent(agentB)
    │     └── Returns the discovery (unseen, from different agent)
    │
    ├── Agent B independently scores the tweet via LLMBrain
    │     └── Only engages if score > 75 (organic decision)
    │
    └── recordEngagement(discoveryId, agentB)
          └── Enforces pair interaction limits
```

The key principle: **agents share discoveries, not engagement instructions**. Each agent independently decides whether to engage based on its own persona and relevance scoring.

### Ethics Policy

The network enforces these rules by default:

| Rule | Default | Why |
|---|---|---|
| Coordinated retweeting | **Blocked** | Artificial amplification violates X ToS |
| Coordinated liking | **Blocked** | Like rings are detectable and penalized |
| Content sharing | **Allowed** | Discovery is natural; engagement is independent |
| Trend sharing | **Allowed** | Multiple accounts posting about trends is normal |
| Human review | **Required** | Manual approval before cross-agent engagement |
| Max pair interactions | **3/day** | Prevents detectable patterns |
| Min delay between interactions | **24 hours** | Prevents clustering |

### Setting Up a Network

```javascript
import { EngagementNetwork } from './src/agents/engagementNetwork.js';

const network = new EngagementNetwork({
  maxInteractionsPerPair: 3,
  minDelayHours: 24,
  maxNetworkSize: 5,
  requireHumanReview: true,
});

// Register agents
network.registerAgent('account1', {
  niche: { name: 'AI Engineering' },
  persona: { name: 'Alex' },
});

network.registerAgent('account2', {
  niche: { name: 'Developer Tools' },
  persona: { name: 'Jordan' },
});

// Check network health
const stats = network.getNetworkStats();
// { totalAgents: 2, activeAgents: 0, totalDiscoveries: 0, ... }
```

### Content Discovery Sharing

```javascript
// Agent 1 finds a great tweet
network.shareDiscovery('account1', {
  tweetId: '1893456789',
  author: 'karpathy',
  text: 'The best way to learn about LLMs is to build one from scratch.',
  topic: 'AI education',
  relevanceScore: 92,
});

// Agent 2 checks for new discoveries
const discoveries = network.getDiscoveriesForAgent('account2', 10);

for (const disc of discoveries) {
  // Mark as seen
  network.markSeen(disc.id, 'account2');

  // Agent 2 independently decides whether to engage
  const score = await llm.scoreRelevance(disc.content.text, niche.keywords);
  if (score > 75) {
    // Check ethics before engaging
    const ethics = network.checkEthics('account1', 'account2', 'like');
    if (ethics.allowed) {
      network.recordEngagement(disc.id, 'account2');
      // ... proceed with engagement
    }
  }
}
```

### Trend Sharing

```javascript
// Agent discovers a trending topic
network.shareTrend('account1', {
  topic: 'Claude 4 release',
  hashtag: '#Claude4',
  context: 'Anthropic just announced Claude 4 with major improvements',
  niches: ['AI Engineering', 'Developer Tools'],
});

// Other agents check for trends
const trends = network.getRecentTrends('AI Engineering', 5);
// Each agent independently creates content about the trend
```

---

## Database Queries

Useful SQLite queries you can run directly on `data/agent.db`:

### Top engaged authors (who do we interact with most?)

```sql
SELECT json_extract(metadata, '$.author') AS author, COUNT(*) AS interactions
FROM actions
WHERE type IN ('like', 'comment')
  AND json_extract(metadata, '$.author') IS NOT NULL
GROUP BY author
ORDER BY interactions DESC
LIMIT 20;
```

### Daily action breakdown

```sql
SELECT DATE(timestamp) AS day,
  SUM(CASE WHEN type = 'like' THEN 1 ELSE 0 END) AS likes,
  SUM(CASE WHEN type = 'follow' THEN 1 ELSE 0 END) AS follows,
  SUM(CASE WHEN type = 'comment' THEN 1 ELSE 0 END) AS comments,
  SUM(CASE WHEN type = 'post' THEN 1 ELSE 0 END) AS posts
FROM actions
GROUP BY day
ORDER BY day DESC
LIMIT 30;
```

### Average relevance score of engaged content

```sql
SELECT AVG(CAST(json_extract(metadata, '$.score') AS REAL)) AS avg_score
FROM actions
WHERE type = 'like'
  AND json_extract(metadata, '$.score') IS NOT NULL;
```

### LLM cost by model (last 30 days)

```sql
SELECT model,
  SUM(calls) AS total_calls,
  SUM(input_tokens) AS total_input,
  SUM(output_tokens) AS total_output
FROM llm_usage
WHERE date >= DATE('now', '-30 days')
GROUP BY model;
```

### Best performing content

```sql
SELECT type, text, likes, impressions, replies,
  ROUND(CAST(likes AS REAL) / NULLIF(impressions, 0) * 100, 2) AS engagement_rate
FROM content
WHERE impressions > 0
ORDER BY engagement_rate DESC
LIMIT 10;
```

---

## Troubleshooting

### Agent won't start

| Symptom | Solution |
|---|---|
| "No config found" | Run `node src/agents/setup.js` or copy `config/agent-config.example.json` to `data/agent-config.json` |
| "Session expired" | Run `node src/agents/thoughtLeaderAgent.js --login` to re-login |
| Browser crash on launch | Install Chromium deps: `npx puppeteer browsers install chrome` |
| "Cannot find module better-sqlite3" | Run `npm install better-sqlite3` |

### Agent runs but doesn't engage

| Symptom | Solution |
|---|---|
| All scores below 60 | Review your `niche.keywords` — they may be too narrow |
| "Rate limit reached" | Lower `limits` values or wait until tomorrow |
| No tweets found | Check `niche.searchTerms` are returning results on X.com |
| LLM errors | Verify your API key: `curl -H "Authorization: Bearer YOUR_KEY" https://openrouter.ai/api/v1/models` |

### High LLM costs

| Symptom | Solution |
|---|---|
| Cost > $1/day | Switch `fast` model to a cheaper option (e.g., `deepseek/deepseek-chat`) |
| Too many scoring calls | Increase the minimum score threshold in the agent config |
| Smart model overuse | Reduce `limits.dailyPosts` to lower content generation calls |

### Browser detection

| Symptom | Solution |
|---|---|
| CAPTCHA appearing | Add a residential proxy in `browser.proxy` |
| Actions silently failing | Session may be expired — re-login with `--login` |
| Account restricted | Reduce `limits` significantly, wait 24-48h before restarting |

# Analytics & Sentiment Analysis

> Built-in sentiment analysis, reputation monitoring, audience insights, price correlation, and automated reporting — all without external APIs.

## Overview

The analytics system provides:

- **Sentiment Analysis** — Rule-based (offline) or LLM-powered analysis of text
- **Reputation Monitoring** — Continuous polling of mentions/keywords with trend tracking
- **Alerts** — Automated alerts on sentiment drops or volume spikes
- **Reports** — Generate comprehensive analytics reports
- **Price Correlation** — Correlate tweet activity with crypto prices
- **Account History** — Track follower growth, engagement, and snapshots over time
- **Audience Overlap** — Find shared audiences between accounts
- **Follower CRM** — Tag, score, segment, and manage follower relationships

---

## Sentiment Analysis

### Quick Start

```javascript
import { analyzeSentiment, analyzeBatch, aggregateResults } from 'xactions/analytics';

// Single text
const result = await analyzeSentiment('XActions is absolutely incredible! Love it 🚀');
console.log(result);
// { score: 0.85, label: 'positive', confidence: 0.92, keywords: ['incredible', 'love'] }

// Batch analysis
const results = await analyzeBatch([
  'Great product, highly recommend!',
  'Terrible experience, total waste of time.',
  'It works fine, nothing special.'
]);

// Aggregate stats
const stats = aggregateResults(results);
console.log(stats);
// { average: 0.15, median: 0.1, distribution: { positive: 1, negative: 1, neutral: 1 }, trend: 'stable' }
```

### Modes

| Mode | How it works | Requirements |
|------|-------------|-------------|
| `rules` (default) | AFINN-style lexicon with negation, intensifiers, emoji scoring | None — works offline |
| `llm` | OpenRouter API with configurable model | `OPENROUTER_API_KEY` env var |

```javascript
// LLM mode
const result = await analyzeSentiment('This is a nuanced political statement.', {
  mode: 'llm',
  apiKey: process.env.OPENROUTER_API_KEY,
  model: 'meta-llama/llama-3.1-8b-instruct:free'
});
```

### Score Range

| Range | Label |
|-------|-------|
| 0.25 to 1.0 | `positive` |
| -0.25 to 0.25 | `neutral` |
| -1.0 to -0.25 | `negative` |

---

## Reputation Monitoring

### Start Monitoring

```javascript
import { createMonitor, getMonitor, getMonitorHistory, stopMonitor } from 'xactions/analytics';

const monitor = createMonitor({
  target: 'elonmusk',            // Username or keyword
  type: 'mentions',              // 'mentions', 'keyword', 'replies'
  intervalMs: 900000,            // 15 minutes (default)
  sentimentMode: 'rules',       // or 'llm'
  alertConfig: {
    sentimentThreshold: -0.3,    // Alert if sentiment drops below
    volumeMultiplier: 3,         // Alert if volume spikes 3x
    webhookUrl: 'https://...',   // Optional webhook for alerts
    socketRoom: 'reputation'     // Optional Socket.IO room
  }
}, {
  page,         // Puppeteer page (authenticated)
  scrapers      // Scraper module
});

// Check status
const status = getMonitor(monitor.id);
console.log(status.stats);
// { totalPolls: 12, totalTweets: 156, rollingAverage: 0.23, trend: 'stable', volatility: 0.08 }

// Get history
const history = getMonitorHistory(monitor.id, { limit: 100 });
// [{ timestamp, score, label, tweetCount, rollingAverage }, ...]

// Stop
stopMonitor(monitor.id);
```

### Monitor Types

| Type | What it tracks |
|------|---------------|
| `mentions` | Tweets mentioning `@target` |
| `keyword` | Tweets containing the target keyword |
| `replies` | Replies to the target's tweets |

---

## Alerts

```javascript
import { checkAlerts, getAlerts, clearAlerts } from 'xactions/analytics';

// Check for new alerts (called automatically by monitors)
const newAlerts = checkAlerts(monitorId);

// Get all alerts
const alerts = getAlerts();
// [{ type: 'sentiment_drop', monitorId, value: -0.45, threshold: -0.3, timestamp }]

// Clear alerts
clearAlerts();
```

---

## Reports

```javascript
import { generateReport } from 'xactions/analytics';

const report = await generateReport({
  username: 'nichxbt',
  period: '7d',        // '24h', '7d', '30d'
  include: ['sentiment', 'engagement', 'growth', 'content']
});
```

---

## Price Correlation

Correlate tweet activity with cryptocurrency prices:

```javascript
import { analyzeTweetPriceCorrelation } from 'xactions/analytics';

const analysis = await analyzeTweetPriceCorrelation({
  username: 'elonmusk',
  coinId: 'dogecoin',    // CoinGecko ID
  days: 30
});

console.log(analysis);
// { correlation, tweetImpact, priceChanges, significantTweets }
```

### Functions

| Function | Description |
|----------|-------------|
| `analyzeTweetPriceCorrelation(opts)` | Full analysis pipeline |
| `alignTweetsWithPrices(tweets, prices)` | Match tweets to price windows |
| `computeCorrelationStats(aligned)` | Pearson correlation computation |
| `fetchCoinGeckoPrices(coinId, days)` | Fetch prices from CoinGecko |
| `fetchGeckoTerminalPrices(poolAddr)` | Fetch from GeckoTerminal |

---

## Account History

Track metrics over time with automatic snapshots:

```javascript
import {
  saveAccountSnapshot, getAccountHistory, getGrowthRate,
  compareAccounts, exportHistory,
  startAutoSnapshot, stopAutoSnapshot
} from 'xactions/analytics';

// Manual snapshot
await saveAccountSnapshot('nichxbt', { followers: 5000, following: 200, tweets: 1200 });

// Auto-snapshot every 6 hours
startAutoSnapshot('nichxbt', { intervalMs: 21600000, authToken: '...' });

// Query history
const history = await getAccountHistory('nichxbt', { since: '2026-01-01' });
const growth = await getGrowthRate('nichxbt', '30d');

// Compare accounts
const comparison = await compareAccounts(['nichxbt', 'elonmusk']);

// Export
await exportHistory('nichxbt', { format: 'csv', outputPath: 'history.csv' });
```

---

## Audience Overlap

```javascript
import { analyzeOverlap, multiOverlap, getAudienceInsights } from 'xactions/analytics';

// Compare two accounts
const overlap = await analyzeOverlap('account1', 'account2', { page, limit: 500 });
// { shared: 142, account1Only: 358, account2Only: 289, overlapPercent: 18.2 }

// Compare multiple accounts
const multi = await multiOverlap(['acc1', 'acc2', 'acc3'], { page });

// Get insights
const insights = await getAudienceInsights('nichxbt', { page });
```

---

## Follower CRM

Manage follower relationships with tagging, scoring, and segmentation:

```javascript
import {
  syncFollowers, tagContact, addNote, autoScore,
  searchContacts, createSegment, exportSegment
} from 'xactions/analytics';

// Sync followers from X
await syncFollowers('nichxbt', { page });

// Tag and score
await tagContact('follower_username', 'vip');
await addNote('follower_username', 'Met at ETH Denver');
await autoScore();  // Compute engagement scores

// Search and segment
const devs = await searchContacts({ tags: ['developer'], minScore: 70 });
await createSegment('high-value-devs', { tags: ['developer'], minScore: 80 });

// Export
await exportSegment('high-value-devs', { format: 'csv' });
```

---

## API Reference

### Sentiment

| Function | Signature | Description |
|----------|-----------|-------------|
| `analyzeSentiment(text, opts?)` | `(string, { mode?, apiKey?, model? }) → Promise<Result>` | Analyze single text |
| `analyzeBatch(texts, opts?)` | `(string[], Object) → Promise<Result[]>` | Batch analysis |
| `aggregateResults(results)` | `(Result[]) → AggregateStats` | Compute averages, trends |

### Reputation

| Function | Signature | Description |
|----------|-----------|-------------|
| `createMonitor(config, deps?)` | `(Object, Object) → Monitor` | Start monitoring |
| `stopMonitor(id)` | `(string) → Object` | Stop a monitor |
| `getMonitor(id)` | `(string) → Monitor\|null` | Get monitor + stats |
| `getMonitorHistory(id, opts?)` | `(string, { limit?, since? }) → DataPoint[]` | Historical data |
| `listMonitors()` | `() → Monitor[]` | All active monitors |
| `removeMonitor(id)` | `(string) → void` | Stop + delete |
| `stopAll()` | `() → void` | Stop all monitors |

### MCP Tools

| Tool | Description |
|------|-------------|
| `x_analyze_sentiment` | Analyze text sentiment |
| `x_monitor_reputation` | Start reputation monitoring |
| `x_reputation_report` | Generate reputation report |
| `x_brand_monitor` | Monitor brand mentions |
| `x_competitor_analysis` | Compare competitors |
| `x_get_analytics` | Account analytics |
| `x_get_post_analytics` | Post-level analytics |
| `x_creator_analytics` | Creator monetization stats |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Only for LLM mode | OpenRouter API key for advanced sentiment |
| `XACTIONS_SESSION_COOKIE` | For scrapers | X/Twitter auth token |
| `REDIS_HOST` | For monitoring | Redis server for state persistence |

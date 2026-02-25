# 📈 History Store & Auto-Snapshots

> Time-series account metrics — track followers, engagement, and growth over days, weeks, or months. Competes with **Circleboom** and **SocialBlade**.

---

## Overview

The History Store records periodic snapshots of any X/Twitter account's metrics into a local SQLite database (`~/.xactions/analytics.db`). It supports:

- **Account snapshots** — followers, following, tweet count, listed count
- **Tweet snapshots** — likes, retweets, replies, quotes, views per tweet
- **Daily engagement roll-ups** — engagement rate, impressions, top tweet
- **Auto-snapshots** — periodic scraping on a configurable schedule
- **Export** — JSON or CSV for external analysis

Available via: **CLI**, **MCP tools**, **API**, **Node.js library**, and **Dashboard**.

---

## Quick Start

### CLI

```bash
# View account history (last 30 days, daily intervals)
unfollowx history elonmusk --days 30 --interval day

# Start auto-snapshotting every 60 minutes
unfollowx snapshot elonmusk --interval 60

# Export history as CSV
unfollowx history elonmusk --export --format csv
```

### MCP (AI Agents)

```
Tool: x_history_get
Args: { "username": "elonmusk", "days": 30 }

Tool: x_history_snapshot
Args: { "username": "elonmusk" }

Tool: x_growth_rate
Args: { "username": "elonmusk", "days": 7 }

Tool: x_compare_accounts
Args: { "usernames": ["elonmusk", "jack"], "metric": "followers_count" }
```

### Node.js

```javascript
import {
  saveAccountSnapshot,
  getAccountHistory,
  getGrowthRate,
  compareAccounts,
  exportHistory
} from 'xactions/src/analytics/historyStore.js';
import { startAutoSnapshot } from 'xactions/src/analytics/autoSnapshot.js';

// Save a manual snapshot
await saveAccountSnapshot('elonmusk', {
  followers_count: 200000000,
  following_count: 800,
  tweet_count: 35000,
  listed_count: 150000,
  verified: true
});

// Get history
const history = getAccountHistory('elonmusk', {
  from: '2025-01-01',
  to: '2025-02-01',
  interval: 'day'   // 'raw' | 'day' | 'week' | 'month'
});

// Growth rate
const growth = getGrowthRate('elonmusk', 30);
// { totalChange: 500000, avgPerDay: 16667, trend: 'growing', percentChange: 0.25 }

// Compare accounts
const comparison = compareAccounts(['elonmusk', 'jack'], 'followers_count');

// Auto-snapshot every 30 minutes
await startAutoSnapshot('elonmusk', 30);
```

### API

```bash
# Get account history
GET /api/analytics/history/elonmusk?days=30&interval=day

# Get growth rate
GET /api/analytics/growth/elonmusk?days=7

# Compare accounts
POST /api/analytics/compare
{ "usernames": ["elonmusk", "jack"], "metric": "followers_count" }

# Export as CSV
GET /api/analytics/export/elonmusk?format=csv
```

---

## Architecture

```
src/analytics/
├── historyStore.js    → SQLite time-series storage + queries
├── autoSnapshot.js    → Periodic auto-snapshot scheduler
└── index.js           → Re-exports

api/routes/history.js  → REST API endpoints
dashboard/analytics-dashboard.html → Chart.js visualization
```

### Database Schema

Stored in `~/.xactions/analytics.db` (SQLite via `better-sqlite3`).

| Table | Purpose | Key Columns |
|---|---|---|
| `account_snapshots` | Per-account metric time-series | `username`, `followers_count`, `following_count`, `tweet_count`, `listed_count`, `snapshot_at` |
| `tweet_snapshots` | Per-tweet metric time-series | `tweet_id`, `username`, `likes`, `retweets`, `replies`, `quotes`, `views`, `snapshot_at` |
| `engagement_daily` | Daily engagement roll-ups | `username`, `date`, `avg_engagement_rate`, `total_impressions`, `total_engagements`, `top_tweet_id` |

---

## Function Reference

### `saveAccountSnapshot(username, data)`

Inserts a new account metrics data point.

| Param | Type | Description |
|---|---|---|
| `username` | `string` | X/Twitter handle |
| `data.followers_count` | `number` | Follower count |
| `data.following_count` | `number` | Following count |
| `data.tweet_count` | `number` | Total tweets |
| `data.listed_count` | `number` | Lists the account appears on |
| `data.verified` | `boolean` | Verified status |

**Returns:** `{ username, snapshot_at }`

### `saveTweetSnapshot(username, tweetId, metrics)`

Stores per-tweet metrics for tracking performance over time.

| Param | Type | Description |
|---|---|---|
| `username` | `string` | Author's handle |
| `tweetId` | `string` | Tweet ID |
| `metrics` | `object` | `{ likes, retweets, replies, quotes, views, bookmark_count }` |

### `saveDailyEngagement(username, stats)`

Upserts a daily engagement summary (replaces if same date exists).

### `getAccountHistory(username, options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `from` | `string` | — | ISO date start |
| `to` | `string` | — | ISO date end |
| `interval` | `string` | `'raw'` | `'raw'`, `'day'`, `'week'`, or `'month'` |

**Returns:** Array of snapshot objects.

### `getTweetHistory(tweetId, options)`

Returns metric history for a specific tweet. Supports `from` and `to` date filters.

### `getGrowthRate(username, days)`

| Param | Type | Default | Description |
|---|---|---|---|
| `username` | `string` | — | X handle |
| `days` | `number` | `30` | Lookback period |

**Returns:** `{ username, days, dataPoints, totalChange, avgPerDay, trend, percentChange, dailyGrowth }`

### `compareAccounts(usernames, metric, options)`

Compares multiple accounts over time on a single metric.

| Param | Type | Default | Description |
|---|---|---|---|
| `usernames` | `string[]` | — | Accounts to compare |
| `metric` | `string` | `'followers_count'` | Metric column name |

**Returns:** `{ metric, usernames, timeSeries, summary }`

### `exportHistory(username, format)`

Exports all data for a user as `json` or `csv`.

---

## Auto-Snapshot Functions

### `startAutoSnapshot(username, intervalMinutes, scrapeFn)`

| Param | Type | Default | Description |
|---|---|---|---|
| `username` | `string` | — | Account to monitor |
| `intervalMinutes` | `number` | `60` | Snapshot interval |
| `scrapeFn` | `Function` | `null` | Custom scrape function (auto-uses Puppeteer if null) |

### `stopAutoSnapshot(username)`

Stops snapshots for a specific user.

### `listActiveSnapshots()`

Returns all active snapshot schedules: `[{ username, intervalMinutes, startedAt }]`

### `stopAllSnapshots()`

Graceful shutdown — stops all active schedules. Automatically called on process exit.

---

## MCP Tools

| Tool | Input | Description |
|---|---|---|
| `x_history_get` | `username`, `days?` | Get account history over time |
| `x_history_snapshot` | `username` | Take an immediate snapshot |
| `x_growth_rate` | `username`, `days?` | Calculate follower growth rate |
| `x_compare_accounts` | `usernames[]`, `metric?` | Compare accounts on a metric |

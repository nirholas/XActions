# ♻️ Evergreen Content Recycler

> Identify top-performing tweets and automatically re-post them on a schedule with content variation. Competes with **Hypefury** and **Publer**.

---

## Overview

The Evergreen Recycler finds your best content and recycles it:

- **Candidate analysis** — ranks tweets by engagement rate, filters time-sensitive content
- **Queue management** — scheduled re-posting with configurable frequency and time slots
- **Content variation** — synonym swaps, emoji rotation, and punctuation changes to avoid duplicate detection
- **Pause/resume** — control the recycler without losing queue state
- **Stats** — track posted vs pending items

Available via: **CLI**, **MCP tools**, and **Node.js library**.

---

## Quick Start

### CLI

```bash
# Analyze evergreen candidates (preview only)
unfollowx evergreen nichxbt --analyze

# Find and queue tweets with 50+ likes, 30+ days old
unfollowx evergreen nichxbt --min-likes 50 --min-age 30

# Run one recycling cycle (posts due items)
unfollowx evergreen nichxbt
```

### MCP (AI Agents)

```
Tool: x_evergreen_analyze
Args: { "username": "nichxbt", "minLikes": 10 }
```

### Node.js

```javascript
import {
  analyzeEvergreenCandidates,
  createEvergreenQueue,
  runEvergreenCycle,
  pauseEvergreen,
  resumeEvergreen,
  getEvergreenStats,
  varyTweet
} from 'xactions/src/automation/evergreenRecycler.js';

// Find candidates
const { candidates } = await analyzeEvergreenCandidates('nichxbt', {
  minAge: 30,
  minLikes: 10,
  minEngagementRate: 0.02,
  limit: 50,
  excludeReplies: true,
  excludeRetweets: true
});

// Create a posting queue
await createEvergreenQueue('nichxbt', candidates, {
  frequency: 'daily',           // 'hourly' | 'daily' | 'weekly'
  timeSlots: ['09:00', '14:00', '19:00'],
  maxPerDay: 2,
  variation: true               // apply content variation
});

// Run one cycle (posts due items)
const result = await runEvergreenCycle();
// { status: 'posted', count: 2 }

// Manage the queue
await pauseEvergreen();
await resumeEvergreen();
const stats = await getEvergreenStats();

// Test content variation
const { varied, changeDescription } = varyTweet('This is amazing! 🔥 Check it out');
// { varied: "This is incredible! 🌟 Check it out", changeDescription: "Swapped 1 synonym, 1 emoji" }
```

---

## How It Works

### 1. Candidate Selection

Tweets are scored and filtered:

| Filter | Default | Description |
|---|---|---|
| `minAge` | 30 days | Only recycle old tweets |
| `minLikes` | 10 | Minimum like count |
| `minEngagementRate` | 0.02 | (likes + retweets + replies) / impressions |
| `excludeReplies` | `true` | Skip reply tweets |
| `excludeRetweets` | `true` | Skip retweets |

Time-sensitive tweets (containing words like "today", "yesterday", "breaking", "just happened") are automatically excluded.

### 2. Content Variation

To avoid X's duplicate-detection:

| Technique | Example |
|---|---|
| Synonym swap | "amazing" → "incredible" |
| Emoji rotation | 🔥 → 🌟 or ✨ |
| Punctuation change | "!" → " !" or "!!" |
| Line break variation | Added/removed line breaks |

### 3. Queue & Scheduling

Queue saved to `~/.xactions/evergreen-queue.json`:

```json
{
  "username": "nichxbt",
  "queue": [
    {
      "tweetId": "1234567890",
      "originalText": "...",
      "scheduledAt": "2026-02-25T14:00:00Z",
      "posted": false
    }
  ],
  "settings": {
    "frequency": "daily",
    "timeSlots": ["09:00", "14:00", "19:00"],
    "maxPerDay": 2
  }
}
```

---

## Function Reference

### `analyzeEvergreenCandidates(username, options)`

Scrapes recent tweets and ranks by engagement rate.

**Returns:** `{ username, candidates: [{ id, text, likes, retweets, replies, engagementRate, age }], total }`

### `createEvergreenQueue(username, tweets, options)`

Creates a posting schedule from candidate tweets.

| Option | Type | Default | Description |
|---|---|---|---|
| `frequency` | `string` | `'daily'` | `'hourly'`, `'daily'`, `'weekly'` |
| `timeSlots` | `string[]` | `['09:00','14:00','19:00']` | Preferred posting times |
| `maxPerDay` | `number` | `2` | Maximum posts per day |
| `variation` | `boolean` | `true` | Apply content variation |

### `runEvergreenCycle()`

Posts all due items in the queue. Returns `{ status, count }` or `{ status: 'idle', dueCount: 0 }`.

### `pauseEvergreen()` / `resumeEvergreen()`

Toggles the recycler on/off without clearing the queue.

### `getEvergreenStats()`

Returns: `{ username, totalQueued, posted, pending, paused, lastPosted, createdAt }`

### `varyTweet(text)`

Applies random content variation.

**Returns:** `{ original, varied, changeDescription }`

---

## MCP Tools

| Tool | Input | Description |
|---|---|---|
| `x_evergreen_analyze` | `username`, `minLikes?` | Find recyclable tweets |

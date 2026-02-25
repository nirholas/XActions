# 🔍 Audience Overlap Analysis

> Find shared followers between accounts, rank audience similarity, and discover niche communities. Competes with **SparkToro** and **Audiense**.

---

## Overview

Audience Overlap scrapes and compares follower lists between X/Twitter accounts to answer:

- **Who follows both accounts?** — shared followers, unique-to-A, unique-to-B
- **How similar are their audiences?** — Jaccard similarity coefficient
- **Which account has the most similar audience?** — rank candidates by overlap
- **What are the cross-pollination opportunities?** — actionable insights

Available via: **CLI**, **MCP tools**, **API**, and **Node.js library**.

---

## Quick Start

### CLI

```bash
# Analyze overlap between two accounts
unfollowx audience elonmusk jack

# Limit to 3000 followers per account
unfollowx audience elonmusk jack --max 3000
```

### MCP (AI Agents)

```
Tool: x_audience_overlap
Args: { "username1": "elonmusk", "username2": "jack" }
```

### Node.js

```javascript
import {
  analyzeOverlap,
  multiOverlap,
  findSimilarAudience,
  getAudienceInsights
} from 'xactions/src/analytics/audienceOverlap.js';

// Two-account overlap
const result = await analyzeOverlap('elonmusk', 'jack', { limit: 5000 });
console.log(result.insights);
// { overlapCount: 1200, jaccardSimilarity: 0.15, ... }

// Multi-account overlap matrix (3+ accounts)
const matrix = await multiOverlap(['elonmusk', 'jack', 'naval'], { limit: 3000 });
// { matrix: [[1, 0.15, 0.08], ...], coreAudience: [...], nicheAudience: [...] }

// Find which account's audience is most similar to yours
const ranking = await findSimilarAudience('myaccount', ['elonmusk', 'jack', 'naval']);
// { rankings: [{ username: 'naval', similarity: 0.22 }, ...] }
```

### API

```bash
# Audience overlap
GET /api/analytics/overlap?username1=elonmusk&username2=jack
```

---

## Architecture

```
src/analytics/
├── audienceOverlap.js → Core overlap analysis + caching
└── index.js           → Re-exports
```

### How It Works

1. Scrapes follower lists for both accounts (with in-memory caching)
2. Uses `Set` intersection/difference for O(n) overlap computation
3. Calculates Jaccard similarity: `|A ∩ B| / |A ∪ B|`
4. Generates natural-language insights

---

## Function Reference

### `analyzeOverlap(username1, username2, options)`

Two-account follower overlap analysis.

| Option | Type | Default | Description |
|---|---|---|---|
| `limit` | `number` | `5000` | Max followers to scrape per account |
| `enrichProfiles` | `boolean` | `false` | Fetch full profile data for shared followers |
| `sortBy` | `string` | `'followers'` | Sort shared followers by this field |

**Returns:**

```javascript
{
  accountA: { username, followers },
  accountB: { username, followers },
  shared: ['user1', 'user2', ...],
  uniqueToA: ['user3', ...],
  uniqueToB: ['user4', ...],
  insights: {
    overlapCount: 1200,
    overlapPercentA: 24.0,
    overlapPercentB: 15.0,
    jaccardSimilarity: 0.15,
    analysis: 'Moderate overlap...'
  }
}
```

### `multiOverlap(usernames, options)`

Pairwise overlap matrix for 3+ accounts.

| Param | Type | Description |
|---|---|---|
| `usernames` | `string[]` | 3+ accounts to compare |
| `options.limit` | `number` | Max followers per account (default: 5000) |

**Returns:** `{ usernames, matrix, coreAudience, nicheAudience }`

- `matrix` — 2D array of Jaccard similarities
- `coreAudience` — users who follow ALL accounts
- `nicheAudience` — users who follow only ONE account

### `findSimilarAudience(username, candidateUsernames, options)`

Ranks candidates by audience similarity to a target account.

**Returns:** `{ target, targetFollowers, rankings: [{ username, similarity, overlap }] }`

### `getAudienceInsights(overlapResult)`

Generates natural-language insights from an overlap result object.

**Returns:** Array of insight strings.

### `clearCache()`

Clears the in-memory follower cache. Use between analyses to force fresh data.

---

## MCP Tools

| Tool | Input | Description |
|---|---|---|
| `x_audience_overlap` | `username1`, `username2` | Analyze follower overlap between two accounts |

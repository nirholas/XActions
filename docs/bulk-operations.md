# 📦 Bulk Operations

> CSV/JSON/TXT import for batch follow, unfollow, block, mute, DM, and scrape — with safety caps, retries, and resume. Competes with **Phantombuster** and **Circleboom**.

---

## Overview

Bulk Operations lets you import a list of usernames from any file format and execute batch actions with production-grade safety:

- **Multi-format import** — CSV, JSON, or plain text (one username per line)
- **10 action types** — follow, unfollow, block, unblock, mute, unmute, like-latest, dm, scrape-profile, add-to-list
- **Daily caps** — prevent account suspension (e.g. max 400 follows/day)
- **Blacklist** — never accidentally follow/unfollow protected accounts
- **Auto-retry** — retries failed actions with backoff
- **Resume** — pick up where you left off after interruption
- **Dry run** — preview what would happen without executing
- **Progress tracking** — real-time progress saved to disk

Available via: **CLI**, **MCP tools**, and **Node.js library**.

---

## Quick Start

### CLI

```bash
# Bulk unfollow from a CSV file
unfollowx bulk unfollow accounts.csv

# Bulk follow with 3s delay and dry run
unfollowx bulk follow targets.json --delay 3000 --dry-run

# Resume an interrupted operation
unfollowx bulk follow targets.csv --resume

# Bulk scrape profiles
unfollowx bulk scrape-profile usernames.txt
```

### MCP (AI Agents)

```
Tool: x_bulk_execute
Args: {
  "usernames": ["user1", "user2", "user3"],
  "action": "follow",
  "dryRun": true
}
```

### Node.js

```javascript
import { parseBulkInput, bulkExecute, bulkScrape } from 'xactions/src/bulk/bulkOperations.js';

// Parse any file format
const usernames = await parseBulkInput('accounts.csv');
// ['user1', 'user2', 'user3', ...]

// Execute bulk operation
const result = await bulkExecute(usernames, 'follow', {
  dryRun: false,
  delayMs: 2000,
  batchSize: 10,
  maxRetries: 2,
  skipErrors: true,
  logFile: 'follow-log.json'
});
// { action: 'follow', total: 100, succeeded: 95, failed: 3, skippedBlacklist: 2, duration: '3m 20s' }

// Bulk scrape to JSON
const { results } = await bulkScrape(usernames, { output: 'profiles.json' });
```

---

## Supported File Formats

### CSV

```csv
username,note
elonmusk,CEO Tesla
jack,Twitter founder
naval,AngelList
```

Detects columns named `username`, `handle`, `screen_name`, or `user`. Falls back to first column.

### JSON

```json
["elonmusk", "jack", "naval"]
```

Or array of objects with a `username` field:

```json
[
  { "username": "elonmusk", "note": "CEO" },
  { "username": "jack" }
]
```

### Plain Text

```
elonmusk
jack
naval
```

---

## Safety Features

### Daily Caps

| Action | Default Cap |
|---|---|
| `follow` | 400/day |
| `unfollow` | 1000/day |
| `block` | 200/day |
| `unblock` | 500/day |
| `mute` | 500/day |
| `unmute` | 500/day |
| `like-latest` | 500/day |
| `dm` | 100/day |
| `scrape-profile` | 5000/day |
| `add-to-list` | 500/day |

### Auto-Pause

Operations pause when:
- **3 consecutive failures** — likely rate-limited
- **Daily cap reached** — prevents over-action
- **Blacklisted user encountered** — skipped automatically

### Resume

Progress is saved to `~/.xactions/bulk-progress-{action}-{timestamp}.json`. Use `--resume` to continue.

---

## Function Reference

### `parseBulkInput(filePath)`

Auto-detects file format and returns a clean array of usernames.

| Param | Type | Description |
|---|---|---|
| `filePath` | `string` | Path to CSV, JSON, or TXT file |

**Returns:** `Promise<string[]>`

### `bulkExecute(usernames, action, options)`

| Param | Type | Default | Description |
|---|---|---|---|
| `usernames` | `string[]` | — | List of usernames |
| `action` | `string` | — | Action type (see supported actions) |
| `options.dryRun` | `boolean` | `false` | Preview without executing |
| `options.delayMs` | `number` | `2000` | Delay between actions (ms) |
| `options.batchSize` | `number` | `10` | Batch size for progress reporting |
| `options.maxRetries` | `number` | `2` | Max retries per action |
| `options.skipErrors` | `boolean` | `true` | Continue on failure |
| `options.logFile` | `string` | — | Path to save action log |
| `options.resumeFrom` | `string` | — | Progress file to resume from |
| `options.force` | `boolean` | `false` | Ignore daily caps |
| `options.message` | `string` | — | DM message template |
| `options.listName` | `string` | — | List name for `add-to-list` |

**Returns:** `{ action, total, succeeded, failed, skippedBlacklist, duration, progressFile }`

### `bulkScrape(usernames, options)`

Scrapes profiles in bulk and saves results.

| Option | Type | Default | Description |
|---|---|---|---|
| `output` | `string` | — | Output file path (JSON or CSV) |
| `delayMs` | `number` | `1500` | Delay between scrapes |

**Returns:** `{ results, count }`

---

## MCP Tools

| Tool | Input | Description |
|---|---|---|
| `x_bulk_execute` | `usernames[]`, `action`, `dryRun?` | Execute batch operations |

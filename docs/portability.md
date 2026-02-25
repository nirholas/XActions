# Account Portability — Export, Migrate & Diff

> Export your full X/Twitter account, migrate to Bluesky/Mastodon, and track changes over time — no API fees.

## Overview

XActions Portability is a complete data ownership toolkit:

- **Export** — Download your entire account (profile, tweets, followers, following, bookmarks, likes) in JSON, CSV, and Markdown
- **Archive Viewer** — Self-contained offline HTML file to browse your data with search, pagination, and dark theme
- **Migrate** — Move your social graph to Bluesky (AT Protocol) or Mastodon (ActivityPub) with user matching
- **Diff** — Compare two exports to see what changed: new followers, lost followers, deleted tweets, engagement shifts

Available via: **CLI**, **API**, **MCP tools** (for AI agents).

---

## Quick Start

### Export your account (CLI)

```bash
# Full export — all data, all formats
unfollowx export @yourname --auth-token YOUR_TOKEN

# Export only tweets and followers in JSON
unfollowx export @yourname --only tweets,followers --formats json --auth-token YOUR_TOKEN

# Limit to 100 items per category
unfollowx export @yourname --limit 100 --auth-token YOUR_TOKEN
```

### Migrate to another platform (CLI)

```bash
# Dry-run migration to Bluesky (shows what would happen)
unfollowx migrate @yourname --platform bluesky --dry-run --auth-token YOUR_TOKEN

# Migrate to Mastodon
unfollowx migrate @yourname --platform mastodon \
  --instance mastodon.social --mastodon-token YOUR_MASTODON_TOKEN \
  --auth-token YOUR_TOKEN
```

### Compare two exports (CLI)

```bash
# Diff two export directories
unfollowx diff exports/user_jan2026 exports/user_feb2026

# Generates a Markdown report showing gained/lost followers, new/deleted tweets, etc.
```

---

## Architecture

```
src/portability/
├── exporter.js        → Full account export orchestrator with checkpoint resume
├── archive-viewer.js  → Self-contained HTML archive generator
├── importer.js        → Bluesky & Mastodon migration (user matching via Dice coefficient)
├── differ.js          → Export comparison engine (followers, tweets, engagement)
└── index.js           → Barrel re-exports

api/routes/portability.js  → REST API endpoints
```

### Export Flow

```
exportAccount({ username, formats, only, limit })
   ├── Phase 1: Scrape profile
   ├── Phase 2: Scrape tweets
   ├── Phase 3: Scrape followers
   ├── Phase 4: Scrape following
   ├── Phase 5: Scrape bookmarks
   └── Phase 6: Scrape likes
         ↓
   Write JSON / CSV / Markdown to exports/<username>_<date>/
         ↓
   Generate archive.html (self-contained offline viewer)
         ↓
   Checkpoint saved after each phase (resume on failure)
```

### Diff Flow

```
diffExports(dirA, dirB)
   ├── Compare followers → gained[], lost[]
   ├── Compare following → added[], removed[]
   ├── Compare tweets → new[], deleted[]
   └── Compare engagement → changes per tweet
         ↓
generateReport(diff) → Markdown summary
```

---

## API Reference

### Export

```http
POST /api/portability/export
Content-Type: application/json

{
  "username": "elonmusk",
  "formats": ["json", "csv"],
  "only": ["profile", "tweets", "followers"],
  "limit": 500,
  "authToken": "your_auth_token"
}
```

**Response:** `{ id: "export_abc123", status: "started" }`

```http
GET /api/portability/export/:id           # Check progress
GET /api/portability/export/:id/download  # Download archive
GET /api/portability/exports              # List all exports
```

### Migrate

```http
POST /api/portability/migrate
Content-Type: application/json

{
  "username": "yourname",
  "platform": "bluesky",
  "dryRun": true,
  "authToken": "your_auth_token"
}
```

### Diff

```http
POST /api/portability/diff
Content-Type: application/json

{
  "dirA": "exports/user_jan2026",
  "dirB": "exports/user_feb2026"
}
```

**Response:** Full diff object with `gained`, `lost`, `added`, `removed`, `newTweets`, `deletedTweets`, `engagementChanges`.

---

## MCP Tools (AI Agents)

| Tool | Description |
|------|-------------|
| `x_export_account` | Export a full X/Twitter account to JSON/CSV/Markdown |
| `x_migrate_account` | Migrate social graph to Bluesky or Mastodon |

### Example (Claude Desktop)

> "Export @nichxbt's full account to JSON and generate an HTML archive"

The AI agent calls `x_export_account` with `{ username: "nichxbt", formats: ["json"], authToken: "..." }`.

---

## Export Formats

| Format | Contents |
|--------|----------|
| **JSON** | `profile.json`, `tweets.json`, `followers.json`, `following.json`, `bookmarks.json`, `likes.json` |
| **CSV** | Same data in spreadsheet-friendly format |
| **Markdown** | Human-readable summaries per category |
| **HTML** | `archive.html` — self-contained dark-theme viewer with search, tabs, and pagination |

### Archive Viewer Features

- **Tabs:** Profile, Tweets, Followers, Following, Bookmarks, Likes
- **Search:** Full-text search across all sections
- **Pagination:** 50 items per page with navigation
- **Dark theme:** Matches X's aesthetic
- **Offline:** No external dependencies, works without internet

---

## Checkpoint Resume

Exports save a `.checkpoint.json` file after each phase. If the browser crashes or the script is interrupted, re-running the export will resume from the last completed phase — no duplicate work.

---

## Migration Details

### Bluesky

- Connects via AT Protocol (`bsky.social`)
- Finds matching accounts using Dice-coefficient string similarity on display names
- Dry-run shows all planned actions before executing
- Requires Bluesky credentials (`handle` + `password`)

### Mastodon

- Connects via Mastodon REST API
- Searches for matching accounts on the target instance
- Supports any Mastodon-compatible instance (Pleroma, Akkoma, etc.)
- Requires instance URL + API token

---

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `formats` | `['json', 'csv', 'md']` | Output formats |
| `only` | all | Subset: `profile`, `tweets`, `followers`, `following`, `bookmarks`, `likes` |
| `limit` | unlimited | Max items per category |
| `outputDir` | `exports/<user>_<date>` | Output directory |
| `dryRun` | `false` | Preview migration without making changes |

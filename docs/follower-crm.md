# 👥 Follower CRM

> Tag, score, segment, and manage followers as contacts — a full customer relationship manager for X/Twitter. Competes with **Audiense** and **Hypefury**.

---

## Overview

The Follower CRM syncs your followers into a local SQLite database and provides:

- **Tagging** — apply custom tags (e.g. `influencer`, `lead`, `fan`)
- **Scoring** — manual or auto-calculated engagement score (0–100)
- **Segments** — saved filter presets for targeted campaigns
- **Notes** — add notes and context to any contact
- **Auto-tag rules** — automatically tag contacts matching criteria
- **Rich filtering** — by followers, bio, location, verified, score, tags
- **Export** — segments as JSON or CSV

Available via: **CLI**, **MCP tools**, **API**, and **Node.js library**.

---

## Quick Start

### CLI

```bash
# Sync followers into CRM
unfollowx crm sync nichxbt

# Tag a contact
unfollowx crm tag elonmusk influencer

# Search contacts
unfollowx crm search "crypto"

# Auto-score all contacts
unfollowx crm score

# View a segment
unfollowx crm segment high-value
```

### MCP (AI Agents)

```
Tool: x_crm_sync
Args: { "username": "nichxbt" }

Tool: x_crm_tag
Args: { "username": "elonmusk", "tag": "influencer" }

Tool: x_crm_search
Args: { "query": "crypto" }

Tool: x_crm_segment
Args: { "name": "high-value" }
```

### Node.js

```javascript
import {
  syncFollowers,
  tagContact,
  scoreContact,
  autoScore,
  searchContacts,
  filterContacts,
  createSegment,
  getSegment,
  exportSegment,
  addAutoTagRule,
  BUILT_IN_RULES
} from 'xactions/src/analytics/followerCRM.js';

// Sync followers to CRM
await syncFollowers('nichxbt');

// Tag contacts
tagContact('elonmusk', 'influencer');
tagContact('naval', 'thought-leader');

// Auto-score a contact
const { score, breakdown } = autoScore('elonmusk');
// { score: 92, breakdown: { followers: 25, verified: 15, ... } }

// Rich filtering
const contacts = filterContacts({
  minFollowers: 10000,
  verified: true,
  isFollower: true,
  minScore: 70,
  sortBy: 'score',
  limit: 50
});

// Create a saved segment
createSegment('vip-followers', {
  minFollowers: 50000,
  isFollower: true,
  minScore: 80
});

// Export segment as CSV
const csv = exportSegment('vip-followers', 'csv');
```

### API

```bash
# Sync followers
POST /api/crm/sync/nichxbt

# Tag a contact
POST /api/crm/tag
{ "username": "elonmusk", "tag": "influencer" }

# Search contacts
GET /api/crm/search?q=crypto

# Get segment
GET /api/crm/segment/high-value

# Auto-score all
POST /api/crm/score
```

---

## Architecture

```
src/analytics/
├── followerCRM.js → CRM engine (SQLite)
└── index.js       → Re-exports

api/routes/crm.js  → REST API endpoints
```

### Database Schema

Stored in `~/.xactions/analytics.db`.

| Table | Purpose |
|---|---|
| `crm_contacts` | All contacts with profile data, scores, follow status |
| `crm_tags` | Tag definitions (name, color) |
| `crm_contact_tags` | Many-to-many: contacts ↔ tags |
| `crm_notes` | Free-text notes per contact |
| `crm_segments` | Saved filter presets |
| `crm_auto_tag_rules` | Conditional auto-tagging rules |

---

## Function Reference

### `syncFollowers(username)`

Scrapes followers and following lists, upserts all contacts into CRM.

**Returns:** `{ synced, followers, following }`

### `tagContact(username, tagName)` / `untagContact(username, tagName)`

Adds or removes a tag. Creates both the contact and tag if they don't exist.

### `addNote(username, note)`

Adds a timestamped note to a contact.

### `scoreContact(username, score)`

Manually sets a contact's score (0–100).

### `autoScore(username)`

Auto-calculates a score based on:

| Factor | Points | Criteria |
|---|---|---|
| Followers | 0–25 | log₁₀(followers) × 5 |
| Bio presence | 0–10 | Has bio text |
| Verified | 0–15 | Blue checkmark |
| Follower ratio | 0–15 | followers > following |
| Tweet volume | 0–10 | log₁₀(tweets) × 2 |
| Mutual follow | 0–10 | Both follow each other |
| Active | 0–15 | Recently active |

**Returns:** `{ username, score, breakdown }`

### `searchContacts(query)`

Full-text search across username, display_name, and bio fields.

### `filterContacts(filters)`

| Filter | Type | Description |
|---|---|---|
| `minFollowers` | `number` | Minimum follower count |
| `maxFollowers` | `number` | Maximum follower count |
| `hasBio` | `boolean` | Has a bio |
| `bioContains` | `string` | Bio includes text (case-insensitive) |
| `verified` | `boolean` | Is verified |
| `isFollower` | `boolean` | Follows you |
| `isFollowing` | `boolean` | You follow them |
| `minScore` | `number` | Minimum CRM score |
| `location` | `string` | Location contains text |
| `tags` | `string[]` | Must have ALL listed tags |
| `sortBy` | `string` | Column to sort by |
| `limit` | `number` | Max results |

### `createSegment(name, filters)` / `getSegment(name)` / `listSegments()`

Create and retrieve saved filter presets. `getSegment` dynamically runs the filter.

### `bulkTag(filterOrUsernames, tagName)`

Bulk-apply a tag to contacts. Pass either a filter object or array of usernames.

### `getContactTimeline(username)`

Returns full contact detail: profile, notes, and tags.

### `exportSegment(name, format)`

Exports segment as `json` or `csv`.

### `addAutoTagRule(rule)`

Adds a conditional auto-tag rule:

```javascript
addAutoTagRule({
  if: { minFollowers: 10000, verified: true },
  then: { tag: 'vip' }
});
```

### Built-in Rules

| Rule | Condition | Tag |
|---|---|---|
| Influencer | `minFollowers: 10000` | `influencer` |
| Verified | `verified: true` | `verified` |
| Fan | `isFollower: true, isFollowing: false` | `fan` |

---

## MCP Tools

| Tool | Input | Description |
|---|---|---|
| `x_crm_sync` | `username` | Sync followers to CRM |
| `x_crm_tag` | `username`, `tag` | Tag a contact |
| `x_crm_search` | `query` | Search contacts |
| `x_crm_segment` | `name` | Get segment members |

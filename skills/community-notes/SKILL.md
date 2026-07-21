---
name: community-notes
description: View, write, rate, and browse Community Notes on X/Twitter posts. Use when users want to interact with Community Notes — reading fact-checks, contributing notes, or rating existing notes as helpful or not.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Community Notes

Browser console script for interacting with X's Community Notes fact-checking system.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| View, write, rate, or browse Community Notes | `src/communityNotes.js` | `x.com/home` or tweet page |

## Quick Start

1. Navigate to a tweet page or `x.com/home`
2. Open DevTools (F12) → Console
3. Edit `CONFIG.action` to choose what to do
4. Paste `src/communityNotes.js` → Enter

## Actions

```js
const CONFIG = {
  action: 'view',   // 'view' | 'write' | 'rate' | 'browse'

  // For 'write':
  tweetUrl: 'https://x.com/user/status/123',  // Tweet to annotate
  noteText: 'Context: this claim is missing...',

  // For 'rate':
  // Script finds existing notes and presents rating options
};
```

| Action | Description |
|--------|-------------|
| `view` | View Community Notes on currently visible tweets |
| `write` | Write a note on a specific tweet (requires `tweetUrl` + `noteText`) |
| `rate` | Rate existing notes as helpful or not helpful |
| `browse` | Browse tweets on your timeline that have Community Notes |

## Prerequisites

- **Writing and rating notes** requires enrollment at `x.com/i/communitynotes`
- Enrollment is open to all users but requires a verified phone number
- New contributors are in "Needs More Ratings" status until they establish a track record

## Notes

- Community Notes are surfaced by X's algorithm based on rater agreement
- Notes only appear publicly when enough raters from diverse viewpoints agree
- Script uses DOM automation on `x.com` — no API key required

## Related Skills

- **content-posting** — Post tweets and threads
- **discovery-explore** — Find trending topics that may have Community Notes
- **analytics-insights** — Analyze tweet performance and sentiment

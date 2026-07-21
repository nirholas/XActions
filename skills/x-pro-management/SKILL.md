---
name: x-pro-management
description: Navigate to X Pro (TweetDeck), set up monitoring columns, and manage multi-column view. Use when users want to use X Pro / TweetDeck features or set up a multi-column dashboard.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# X Pro (TweetDeck) Management

Browser console scripts for navigating and configuring X Pro (formerly TweetDeck).

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Navigate to X Pro + setup columns | `src/xPro.js` | `x.com` or `pro.x.com` |
| Extended X Pro management | `src/xProManager.js` | `pro.x.com` |

## Quick Start

1. Go to `x.com` or `pro.x.com`
2. Open DevTools (F12) → Console
3. Paste `src/xPro.js` → Enter

## Configuration (`xPro.js`)

```js
const CONFIG = {
  autoNavigate: true,          // Navigate to X Pro automatically
  setupColumns: false,          // Attempt to add default monitoring columns
  columnPresets: [              // Column types to add when setupColumns = true
    'home',
    'notifications',
    'mentions',
    'search',
  ],
  searchTerms: [               // Search columns to add
    // 'from:nichxbt',
    // '#xactions',
  ],
  showColumnInfo: true,        // Display info about existing columns
  delayBetweenActions: 2000,  // ms between UI actions
};
```

## Column Types

| Column Type | Description |
|-------------|-------------|
| `home` | Your main For You / Following timeline |
| `notifications` | All notifications |
| `mentions` | Only @mentions |
| `search` | Search results for a term |
| `list` | A Twitter List feed |
| `user` | A specific user's tweets |

## Notes

- X Pro requires an X Premium subscription
- Column setup uses DOM automation — column UI may change; selectors in `src/xPro.js`
- `xProManager.js` provides extended operations including column reordering and removal
- If `autoNavigate: true`, the script will redirect to `pro.x.com` automatically

## Related Skills

- **discovery-explore** — Search and explore without X Pro
- **follower-monitoring** — Monitor accounts from a regular timeline
- **analytics-insights** — Analyze performance without X Pro

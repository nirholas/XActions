---
name: topic-management
description: Browse, follow, and unfollow X Topics. Manage your followed topics list and discover new ones by keyword. Use when users want to follow or unfollow topics on X, or manage their topic feed.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Topic Management

Browser console script for managing X Topics — the interest categories that personalize your timeline.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| List, follow, unfollow, or discover X Topics | `src/topicManager.js` | `x.com/i/topics` or `x.com/settings/your_topics` |

## Quick Start

1. Go to `x.com/i/topics` or `x.com/settings/your_topics`
2. Open DevTools (F12) → Console
3. Set `action` in CONFIG
4. Paste `src/topicManager.js` → Enter

## Configuration

```js
const CONFIG = {
  action: 'list',
  //   'list'        — list all currently followed topics
  //   'follow'      — follow topics matching keywords
  //   'unfollow'    — unfollow topics matching keywords
  //   'unfollowAll' — unfollow all topics
  //   'discover'    — browse suggested topics

  // For 'follow' / 'unfollow':
  keywords: ['crypto', 'AI', 'startups'],  // Topics to match
  caseSensitive: false,
};
```

## Controls

```js
window.XActions.abort()    // Stop the script
window.XActions.status()   // Check progress
```

## Notes

- Navigate to `x.com/i/topics` to browse all topics
- Navigate to `x.com/settings/your_topics` to see topics you already follow
- Topics directly influence your For You timeline recommendations
- Use `unfollowAll` then `follow` with specific keywords to reset your topic preferences

## Related Skills

- **algorithm-cultivation** — Train your algorithm for a specific niche
- **discovery-explore** — Browse trending topics and explore
- **analytics-insights** — Analyze what content your current topics surface

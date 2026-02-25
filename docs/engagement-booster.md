# Engagement Booster — Smart Tweet Engagement

> Systematically engage with tweets from target accounts using smart scoring, speed presets, drip scheduling, and undo rollback — no API fees.

## Overview

The Engagement Booster is a standalone browser automation that finds and engages with tweets based on configurable filters and scoring. It features:

- **Floating control panel** — Start, pause, stop, configure, and undo from a built-in UI
- **Smart scoring** — Prioritize small accounts (who notice you), viral tweets, or recent posts
- **Topic-aware replies** — Keyword-matched reply templates
- **Speed presets** — Stealth (45-90s), Safe (20-45s), Moderate (8-20s), Fast (3-8s)
- **Drip mode** — Spread interactions over time (N tweets every M minutes)
- **Undo rollback** — Unlike/unretweet everything from the current session
- **Persistent history** — Session logs saved to localStorage, survives refresh
- **Author filters** — Target/block users, follower count range, bio keywords, verified-only

Works standalone — does **not** require `core.js`.

---

## Quick Start

1. Navigate to any timeline, user profile, or search results page on [x.com](https://x.com)
2. Open DevTools Console (F12)
3. Paste `src/engagementBooster.js`
4. A floating panel appears in the bottom-right corner
5. Configure via the panel or edit `CONFIG` in the script
6. Click **▶ Start**

---

## Configuration

### Core Settings

```javascript
const CONFIG = {
  maxInteractions: 15,     // Total interactions per run
  dryRun: true,            // Preview mode — logs but doesn't act

  actions: {
    like: true,            // ❤️ Like tweets
    reply: false,          // 💬 Reply with templates
    retweet: false,        // 🔁 Retweet
    bookmark: false,       // 🔖 Bookmark
    follow: false,         // ➕ Follow tweet author
  },
};
```

> **Important:** `dryRun` defaults to `true` — you must set it to `false` for real interactions.

### Reply Templates

Topic-aware templates match tweets containing specific keywords:

```javascript
replyTemplates: [
  { text: '🔥 Great point!', topics: [] },                    // Universal
  { text: 'Solid alpha 🧠', topics: ['alpha', 'insight'] },    // Crypto-focused
  { text: 'Great data — appreciate the transparency 📊', topics: ['data', 'stats', 'chart'] },
],
```

Templates with empty `topics` arrays match any tweet. Templates with keywords only match tweets containing at least one of those words.

### Filters

```javascript
targetUsers: [],          // Only engage with these accounts (empty = all)
blockUsers: [],           // Never interact with these accounts
onlyKeywords: [],         // Tweet must contain one of these keywords
skipKeywords: ['promoted', 'ad', 'giveaway', 'nsfw'],
skipLiked: true,          // Skip already-liked tweets
minLikes: 0,              // Minimum likes on tweet
maxLikes: 0,              // Maximum likes (0 = no limit)

// Author quality filters
onlyVerified: false,
minFollowers: 0,
maxFollowers: 0,          // 0 = no limit
bioKeywords: [],          // Author bio must contain one of these
```

### Speed Presets

```javascript
speedPreset: 'safe',      // 'stealth' | 'safe' | 'moderate' | 'fast'
```

| Preset | Delay | Risk |
|--------|-------|------|
| 🐢 **Stealth** | 45-90s | Very safe |
| 🛡️ **Safe** | 20-45s | Recommended |
| ⚡ **Moderate** | 8-20s | Faster |
| 🔥 **Fast** | 3-8s | Risky — may trigger rate limits |

### Drip Mode

Spread interactions across time instead of doing them all at once:

```javascript
drip: {
  enabled: false,
  intervalMinutes: 30,    // Engage every N minutes
  batchSize: 3,           // Tweets per batch
},
```

### Smart Scoring

```javascript
scoring: {
  enabled: true,
  preferSmallAccounts: true,   // Small accounts notice you more
  preferHighEngagement: false, // Target viral tweets
  preferRecent: true,          // Recent tweets first
},
```

When scoring is enabled, tweets are ranked by a composite score before engagement begins. This ensures the most strategic interactions happen first (before limits are hit).

---

## Panel Controls

The floating panel provides:

| Control | Action |
|---------|--------|
| **▶ Start** | Begin engaging |
| **⏸ Pause** | Pause mid-run |
| **▶ Resume** | Continue after pause |
| **🛑 Stop** | Abort the current run |
| **↩ Undo All** | Unlike/unretweet everything from this session |

The panel shows live stats: tweets scanned, actions taken, current speed, and a log of each action.

---

## Undo Rollback

Every like, retweet, and follow is tracked. Click **↩ Undo All** to reverse all actions from the current session:

- Liked tweets get unliked
- Retweeted tweets get unretweeted
- Bookmarked tweets get unbookmarked
- Follows are not undone (intentional — unfollowing immediately looks suspicious)

---

## Session History

All sessions are saved to `localStorage`:

```javascript
// Each session records:
{
  startedAt: '2026-02-25T14:30:00Z',
  endedAt: '2026-02-25T14:35:00Z',
  actions: [
    { type: 'like', tweetId: '123456', author: '@user', text: '...' },
    { type: 'reply', tweetId: '789012', comment: 'Great take!' },
  ],
  stats: { likes: 12, replies: 3, retweets: 0, bookmarks: 0, follows: 0 }
}
```

History persists across page refreshes.

---

## Rate Limit Detection

The booster monitors the page for Twitter rate limit toasts (`"Rate limit"`, `"Try again"`, `"Too many"`, `"Slow down"`). When detected, it automatically pauses and waits before retrying.

---

## Tips

- **Start with `dryRun: true`** to preview which tweets would be engaged
- **Use `safe` speed preset** until you're comfortable — `fast` can trigger rate limits
- **Enable drip mode** for sustained, low-intensity engagement throughout the day
- **Combine with bio keywords** to only engage with accounts in your niche
- **Use `targetUsers`** when you want to focus on building relationships with specific accounts
- **The undo feature is your safety net** — if something goes wrong, roll back the session

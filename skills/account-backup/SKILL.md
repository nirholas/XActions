---
name: account-backup
description: Export and backup your X/Twitter account data — tweets, likes, bookmarks, followers, and following — as downloadable JSON. Also triggers X's official data archive download. Use when users want to backup, export, or archive their X account data.
license: Apache-2.0
metadata:
  author: nichxbt
  version: "1.0"
---

# Account Backup & Data Export

Browser console scripts for exporting your X/Twitter account data without an API key.

## Script Selection

| Goal | File | Navigate to |
|------|------|-------------|
| Backup profile, tweets, likes, bookmarks, followers/following | `src/backupAccount.js` | `x.com/USERNAME` |
| Trigger X's official data archive download | `src/downloadAccountData.js` | `x.com/settings/download_your_data` |
| Export data via API | `api/routes/portability.js` | API endpoint `/api/portability/export` |

## Quick Start

### Browser backup (no API needed)

1. Navigate to `x.com/USERNAME` (your own profile)
2. Open DevTools (F12) → Console
3. Paste `src/backupAccount.js` → Enter
4. JSON file auto-downloads when complete

### Official X data archive

1. Navigate to `x.com/settings/download_your_data`
2. Open DevTools (F12) → Console
3. Paste `src/downloadAccountData.js` → Enter
4. Script triggers the request and monitors progress (checks every 30s, up to 60 min)

## Configuration (`backupAccount.js`)

```js
const CONFIG = {
  maxTweets: 100,       // Max tweets to scrape
  maxLikes: 100,        // Max likes to scrape
  maxBookmarks: 100,    // Max bookmarks to scrape
  maxFollowing: 200,    // Max following accounts
  maxFollowers: 200,    // Max follower accounts
  scrollDelay: 2000,    // ms between scroll actions
  autoDownload: true,   // Auto-download JSON on completion
  sections: {
    profile: true,
    tweets: true,
    likes: true,
    bookmarks: true,
    following: true,
    followers: true,
  },
};
```

## Output Format

`backupAccount.js` exports a single JSON with:

```json
{
  "meta": { "createdAt": "...", "source": "XActions Backup Tool", "version": "2.0.0" },
  "profile": { ... },
  "tweets": [ ... ],
  "likes": [ ... ],
  "bookmarks": [ ... ],
  "following": [ ... ],
  "followers": [ ... ]
}
```

## Notes

- `backupAccount.js` scrapes live DOM — accuracy improves with higher scroll counts
- `downloadAccountData.js` relies on X's official export, which can take hours to days
- Official export includes full history; browser scrape is limited to visible/scrolled content
- Increase `maxTweets` / `maxFollowers` in CONFIG for deeper exports (slower)

## Related Skills

- **twitter-scraping** — Scrape any profile, not just your own
- **bookmarks-management** — Export and organize bookmarks
- **follower-monitoring** — Track follower changes over time
- **content-cleanup** — Delete tweets and likes after backing up

# 🔄 Auto Repost

Automatically retweet posts matching keyword/user filters from your timeline.

---

## ⚠️ WARNING

> **Automated retweeting can trigger spam detection!**
> - Start with strict filters and small batches
> - Set `dryRun: true` first to preview what would be reposted
> - Use minimum-likes thresholds to only repost quality content

---

## 📋 What It Does

1. Scrolls through the timeline collecting tweets
2. Filters by keywords, specific users, and minimum like count
3. Clicks the retweet button on matching tweets
4. Tracks reposted tweet IDs in localStorage to avoid duplicates
5. Respects configurable session limits

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/home` (or any timeline)
2. Edit CONFIG with your filters
3. Set `dryRun: false` when ready
4. Open console (F12) and paste `src/autoRepost.js`

**Configuration:**
```javascript
const CONFIG = {
  filters: {
    keywords: ['web3', 'open source'],
    fromUsers: ['@elonmusk', '@nichxbt'],
    minLikes: 50,
  },
  limits: {
    maxPerSession: 20,
    scrollCycles: 10,
    delayBetweenReposts: 3000,
  },
  dryRun: true,
};
```

---

## 📁 Files

- `src/autoRepost.js` — Browser console auto-repost script

## ⚠️ Notes

- Keyword matching is case-insensitive and checks tweet text
- `fromUsers` can be with or without the `@` prefix
- Already-reposted tweets (green retweet icon) are automatically skipped
- Repost history persists in `localStorage` under `xactions_auto_repost`

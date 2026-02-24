# 💾 Backup Account

Export your X/Twitter account data (profile, tweets, likes, followers) as a JSON file.

---

## 📋 What It Does

1. Scrapes your profile info (name, bio, followers, following, join date)
2. Scrolls your profile to collect tweets with engagement data
3. Visits your likes page and collects liked tweets
4. Visits your followers page and collects follower usernames
5. Packages everything into a single JSON object
6. Auto-downloads the backup file

---

## 🌐 Browser Console Script

**Steps:**
1. Go to your profile page (`x.com/yourusername`)
2. Open console (F12) and paste `src/backupAccount.js`

**Configuration:**
```javascript
const CONFIG = {
  includeTweets: true,
  includeLikes: true,
  includeFollowers: true,
  scrollCycles: 20,
  delayBetweenScrolls: 1500,
};
```

---

## 📊 Output

Downloads a JSON file like:

```json
{
  "exportDate": "2026-02-15T...",
  "profile": { "name": "...", "bio": "...", "followers": 5000 },
  "tweets": [{ "text": "...", "likes": 42, "retweets": 5 }],
  "likes": [{ "text": "...", "author": "@..." }],
  "followers": ["user1", "user2", ...]
}
```

---

## 📁 Files

- `src/backupAccount.js` — Full account backup script
- `src/downloadAccountData.js` — Trigger X's official data archive
- `scripts/twitter/backup-account.js` — Extended DevTools version

## ⚠️ Notes

- Disable individual sections with `includeTweets: false`, etc.
- Scroll cycles determine how much data is collected (more = slower but more complete)
- For a truly complete backup, also use `src/downloadAccountData.js` to request X's official archive
- Large accounts may take several minutes

# 🧵 Post Thread

Compose and publish a multi-tweet thread on X/Twitter.

---

## 📋 What It Does

1. Opens the compose dialog
2. Types the first tweet
3. Clicks "+" to add subsequent tweets
4. Types each tweet in sequence
5. Posts the entire thread at once

---

## 🌐 Browser Console Script

**Steps:**
1. Go to x.com
2. Edit the thread content in CONFIG
3. Set `dryRun = false` to post
4. Open console (F12) and paste `browser/postThread.js`

**Configuration:**
```javascript
const CONFIG = {
  thread: [
    'First tweet of my thread 🧵',
    'Second tweet with more details...',
    'Third tweet continues the story.',
    'Final tweet wraps it up! 🎉',
  ],
  delayBetweenTweets: 2000,
  dryRun: true,
};
```

---

## ✅ Validation

The script validates before posting:
- Each tweet must be ≤ 280 characters
- Shows character count per tweet in preview
- Dry-run mode lets you review without posting

---

## 📁 Related Scripts

| Script | File | Purpose |
|--------|------|---------|
| Post Thread | `browser/postThread.js` | Multi-tweet thread |
| Schedule Posts | `browser/schedulePosts.js` | Queue future posts |
| Create Poll | `browser/createPoll.js` | Create poll tweets |
| Auto Repost | `browser/autoRepost.js` | Auto-retweet by filter |

## ⚠️ Notes

- Posts are published all at once as a connected thread
- Double-check content in dry-run mode before posting
- If the script fails mid-thread, the compose dialog stays open for manual completion

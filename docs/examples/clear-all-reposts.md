# 🗑️ Clear All Reposts

Remove all your retweets/reposts in bulk.

---

## ⚠️ WARNING

> **This removes all your retweets permanently!**
> - Run with `dryRun: true` first to see the count
> - There is no undo once reposts are removed

---

## 📋 What It Does

1. Goes to your profile page
2. Scrolls through your tweets
3. Finds all retweets (identifiable by the retweet icon state)
4. Clicks "Undo retweet" on each one
5. Confirms the undo action
6. Continues until no more reposts are found

---

## 🌐 Browser Console Script

**Steps:**
1. Go to your profile page (`x.com/yourusername`)
2. Open console (F12) and paste `src/clearAllReposts.js`

**Configuration:**
```javascript
const CONFIG = {
  scrollCycles: 30,
  delayBetweenUnreposts: 1500,
  dryRun: false,
};
```

---

## 📁 Files

- `src/clearAllReposts.js` — Remove all retweets
- `src/unlikeAllPosts.js` — Unlike all liked posts (companion)
- `src/clearAllBookmarks.js` — Clear all bookmarks (companion)

## ⚠️ Notes

- Uses `[data-testid="unretweet"]` and `[data-testid="unretweetConfirm"]` selectors
- May need to run multiple times if you have thousands of retweets
- Rate limiting may slow down the process — delays are built in

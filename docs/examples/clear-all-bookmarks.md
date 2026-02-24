# 🔖 Clear All Bookmarks

Remove all bookmarks from your X/Twitter account.

---

## 📋 What It Does

1. Navigates to your bookmarks page
2. Tries the bulk "Clear all bookmarks" button first
3. If bulk clear isn't available, removes bookmarks one by one
4. Scrolls to find more and repeats

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/i/bookmarks`
2. Open console (F12) and paste `src/clearAllBookmarks.js`

**Configuration:**
```javascript
const CONFIG = {
  scrollCycles: 30,
  delayBetweenRemovals: 1000,
};
```

---

## 📁 Files

- `src/clearAllBookmarks.js` — Clear all bookmarks
- `src/bookmarkOrganizer.js` — Categorize bookmarks first (companion)

## ⚠️ Notes

- The bulk clear option may not be available on all accounts
- If bulk clear fails, the script falls back to removing bookmarks individually
- Consider running `src/bookmarkOrganizer.js` first to export/categorize your bookmarks before deleting
- This action cannot be undone

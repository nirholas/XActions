# 🔖 Bookmark Organizer

Automatically categorize your bookmarks using keyword rules, then export as JSON or CSV.

---

## 📋 What It Does

1. Scrolls through your bookmarks page collecting all bookmarked tweets
2. Applies keyword-based categorization rules
3. Groups bookmarks into categories
4. Displays category counts and summaries
5. Exports organized bookmarks as JSON or CSV

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/i/bookmarks`
2. Edit CONFIG with your categorization rules
3. Open console (F12) and paste `src/bookmarkOrganizer.js`

**Configuration:**
```javascript
const CONFIG = {
  categories: {
    'Tech': ['javascript', 'python', 'react', 'programming', 'code'],
    'Crypto': ['bitcoin', 'ethereum', 'web3', 'defi', 'nft'],
    'News': ['breaking', 'update', 'announced', 'launched'],
    'Humor': ['lol', 'lmao', '😂', 'funny'],
  },
  exportFormat: 'json', // 'json' or 'csv'
  scrollCycles: 20,
  delayBetweenScrolls: 1500,
};
```

---

## 📊 Output

```
🔖 BOOKMARK ORGANIZER
━━━━━━━━━━━━━━━━━━━━

Total bookmarks: 150
📁 Tech: 45 bookmarks
📁 Crypto: 32 bookmarks
📁 News: 18 bookmarks
📁 Humor: 12 bookmarks
📁 Uncategorized: 43 bookmarks
```

---

## 📁 Files

- `src/bookmarkOrganizer.js` — Bookmark organizer and exporter
- `src/clearAllBookmarks.js` — Clear all bookmarks (use after exporting)

## ⚠️ Notes

- Tweets matching multiple categories are placed in the first matching one
- Unmatched bookmarks go into an "Uncategorized" group
- Keyword matching is case-insensitive on tweet text
- CSV export works well with spreadsheet apps for further sorting

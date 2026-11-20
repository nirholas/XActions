# #️⃣ Hashtag Analytics

Analyze hashtag performance — top posts, contributors, and engagement patterns.

---

## 📋 What It Does

1. Navigates to the search results for a given hashtag
2. Scrolls to collect tweets using the hashtag
3. Extracts engagement data (likes, retweets, replies)
4. Identifies top performing posts and top contributors
5. Computes hourly posting distribution
6. Exports full results as JSON

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/search?q=%23yourhashtag` (or any search page)
2. Edit CONFIG with your target hashtag
3. Open console (F12) and paste `browser/hashtagAnalytics.js`

**Configuration:**
```javascript
const CONFIG = {
  hashtag: '#web3',
  scrollCycles: 20,
  delayBetweenScrolls: 1500,
  topN: 10,
};
```

---

## 📊 Output

```
#️⃣ HASHTAG ANALYSIS: #web3
━━━━━━━━━━━━━━━━━━━━━━━━

📊 Stats:
- Total posts collected: 247
- Unique contributors: 189
- Avg engagement: 42 per post

🏆 Top 10 Posts (by engagement)
🔝 Top 10 Contributors (by post count)
📈 Hourly Distribution
```

---

## 📁 Files

- `browser/hashtagAnalytics.js` — Browser console hashtag analysis

## ⚠️ Notes

- Include the `#` in your hashtag config
- The script navigates to the search page if not already there
- Results are limited by how much X shows in search (recent tab)
- Top N defaults to 10 but is configurable
- JSON export includes all raw tweet data for further analysis

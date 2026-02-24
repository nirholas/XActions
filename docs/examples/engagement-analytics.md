# 📊 Engagement Analytics

Analyze likes, retweets, replies, and views across your X/Twitter posts.

---

## 📋 What It Does

1. Scrolls your profile to load recent posts
2. Extracts engagement metrics from each post
3. Calculates totals, averages, and rates
4. Identifies top-performing posts
5. Finds best posting times
6. Exports full report as JSON

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/YOUR_USERNAME`
2. Open browser console (F12 → Console tab)
3. Paste `src/engagementAnalytics.js`
4. Wait for analysis to complete

**Configuration:**
```javascript
const CONFIG = {
  maxPosts: 50,          // Number of posts to analyze
  scrollDelay: 1500,     // Delay between scrolls
  exportResults: true,   // Auto-download JSON report
};
```

---

## 📈 Report Contents

- **Overview**: Total likes, retweets, replies, views, avg engagement rate
- **Top 5 by Likes**: Your most-liked posts
- **Top 5 by Engagement**: Posts with highest total interaction
- **Best Posting Hour**: When your audience engages most
- **Best Posting Day**: Which day of the week performs best

---

## 📁 Related Scripts

| Script | File | Purpose |
|--------|------|---------|
| Engagement Analytics | `src/engagementAnalytics.js` | Full engagement analysis |
| Best Time to Post | `src/bestTimeToPost.js` | Optimal posting time analysis |
| Hashtag Analytics | `src/hashtagAnalytics.js` | Hashtag performance analysis |
| Competitor Analysis | `src/competitorAnalysis.js` | Compare multiple accounts |
| Audit Followers | `src/auditFollowers.js` | Detect fake/bot followers |

## ⚠️ Notes

- Only analyzes posts visible in the browser — increase `maxPosts` for deeper analysis
- Engagement rate = (likes + retweets + replies) / views × 100
- JSON export includes per-post data for further analysis in spreadsheets

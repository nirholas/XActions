# 📊 Competitor Analysis

Compare engagement metrics across multiple X/Twitter accounts side by side.

---

## 📋 What It Does

1. Visits each target profile
2. Scrapes followers, following, tweet count, join date, bio, verified status
3. Scrolls recent tweets to calculate avg likes, retweets, replies, and engagement rate
4. Generates a comparison table and rankings
5. Exports results as JSON

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com` (any page)
2. Edit CONFIG with target usernames
3. Open console (F12) and paste `src/competitorAnalysis.js`

**Configuration:**
```javascript
const CONFIG = {
  accounts: ['elonmusk', 'nichxbt', 'openai'],
  tweetsToAnalyze: 20,
  delayBetweenProfiles: 3000,
};
```

---

## 📊 Output

The script prints a comparison table and rankings:

```
📊 COMPETITOR COMPARISON
┌─────────────┬────────────┬──────────┬──────────┐
│ Account     │ Followers  │ Avg Likes│ Eng Rate │
├─────────────┼────────────┼──────────┼──────────┤
│ @elonmusk   │ 190M       │ 85,000   │ 2.1%     │
│ @openai     │ 3.5M       │ 12,000   │ 1.8%     │
│ @nichxbt    │ 50K        │ 500      │ 3.2%     │
└─────────────┴────────────┴──────────┴──────────┘
```

---

## 📁 Files

- `src/competitorAnalysis.js` — Browser console competitor analysis

## ⚠️ Notes

- The script navigates between profile pages; don't interact while running
- Engagement rate = (avg likes + avg retweets + avg replies) / followers × 100
- Results are also downloadable as JSON via auto-download
- Accuracy depends on how many tweets are visible when scrolling

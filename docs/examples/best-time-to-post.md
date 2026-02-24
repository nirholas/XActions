# ⏰ Best Time to Post

Analyze your tweet history to find the optimal times for maximum engagement.

---

## 📋 What It Does

1. Scrolls through your profile's tweets
2. Extracts timestamps and engagement metrics (likes, retweets, replies)
3. Builds an hour × day-of-week engagement matrix
4. Identifies peak engagement windows
5. Displays a visual bar chart in the console
6. Exports the full matrix as JSON

---

## 🌐 Browser Console Script

**Steps:**
1. Go to your profile page (`x.com/yourusername`)
2. Open console (F12) and paste `src/bestTimeToPost.js`

**Configuration:**
```javascript
const CONFIG = {
  scrollCycles: 30,
  delayBetweenScrolls: 1500,
};
```

---

## 📊 Output

```
⏰ BEST TIMES TO POST
━━━━━━━━━━━━━━━━━━━━■

📅 Top 5 Time Slots:
1. Wednesday 2PM  → avg 1,250 engagements
2. Tuesday 10AM   → avg 1,100 engagements
3. Thursday 6PM   → avg 980 engagements
4. Monday 9AM     → avg 920 engagements
5. Friday 12PM    → avg 870 engagements

📊 Hour Distribution (bar chart in console)
```

---

## 📁 Files

- `src/bestTimeToPost.js` — Browser console timing analysis

## ⚠️ Notes

- Must be on your own profile page to analyze your tweets
- More scroll cycles = more tweets analyzed = more accurate results
- Engagement is weighted: likes × 1 + retweets × 2 + replies × 1.5
- Times are shown in your local timezone
- Results download as JSON for use in other tools

# 🔥 Viral Tweet Scraper

Find top performing tweets by keyword or from any account.

## 📋 What It Does

1. Scans tweets on any search results or profile page
2. Filters by minimum likes/retweets
3. Sorts by engagement
4. Exports to CSV with all metrics

## 🌐 Browser Console Script

```javascript
// Go to: x.com/search?q=YOUR_KEYWORD or x.com/USERNAME
// Open Console (Ctrl+Shift+J) and paste the script from:
// src/scrapers/viralTweets.js
```

## ⚙️ Configuration

```javascript
const CONFIG = {
  MIN_LIKES: 100,           // Minimum likes to be "viral"
  MIN_RETWEETS: 10,         // Minimum retweets
  MAX_TWEETS: 100,          // How many to scan
  SORT_BY: 'likes',         // 'likes', 'retweets', 'replies', 'views'
};
```

## 📊 Output

- Console display of top 20 tweets
- CSV download with all data
- `window.viralTweets` for programmatic access

## 💡 Use Cases

- Find inspiration for your niche
- Analyze what goes viral
- Research competitors' top content
- Build a swipe file

---

*Part of [XActions](https://github.com/nirholas/XActions) by [@nichxbt](https://x.com/nichxbt)*

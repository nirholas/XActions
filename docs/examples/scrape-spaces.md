# 🎙️ Scrape X Spaces

Find and collect data on live, scheduled, and ended X Spaces.

---

## 📋 What It Does

1. Searches for Spaces matching your query
2. Scrolls through timeline and search results
3. Collects Space data: title, host, participant count, status, link
4. Categorizes by status: live, scheduled, ended
5. Exports results as JSON

---

## 🌐 Browser Console Script

**Steps:**
1. Go to `x.com/search?q=yourquery` or `x.com/home`
2. Edit CONFIG with your search query
3. Open console (F12) and paste `src/scrapeSpaces.js`

**Configuration:**
```javascript
const CONFIG = {
  query: 'web3 crypto',
  scrollCycles: 15,
  delayBetweenScrolls: 1500,
  includeEnded: false,
};
```

---

## 📊 Output

```json
{
  "query": "web3 crypto",
  "spaces": [
    {
      "title": "Web3 Builder AMA",
      "host": "@cryptodev",
      "listeners": 342,
      "status": "live",
      "link": "https://x.com/i/spaces/..."
    }
  ],
  "stats": { "live": 3, "scheduled": 5, "ended": 12 }
}
```

---

## 📁 Files

- `src/scrapeSpaces.js` — Browser console Spaces scraper

## ⚠️ Notes

- X Spaces appear in search results and timeline as special cards
- Set `includeEnded: false` to only see live and upcoming Spaces
- Results are limited by what X shows in search
- Space links can be opened directly in a browser

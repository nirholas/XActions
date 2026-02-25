---
title: "Scrape Tweets by Hashtag on X (Twitter) — Free 2026"
description: "Scrape tweets by hashtag on X/Twitter and export to JSON/CSV. Free browser script with engagement metrics. No API key needed."
keywords: ["scrape twitter hashtag", "twitter hashtag scraper free", "export hashtag tweets CSV", "twitter hashtag data extraction", "scrape tweets by hashtag 2026", "twitter hashtag analytics tool", "download hashtag tweets X", "xactions hashtag scraping", "twitter trending hashtag scraper", "hashtag tweet collector free"]
canonical: "https://xactions.app/examples/hashtag-scraping"
author: "nich (@nichxbt)"
date: "2026-02-24"
---

# #️⃣ Scrape Tweets by Hashtag on X (Twitter) — Export to JSON & CSV

> **Collect all tweets containing a specific hashtag on X/Twitter — with engagement metrics, author info, and full text — exported to JSON and CSV.** Free, no API key, no app install.

**Works on:** 🌐 Browser Console · 💻 CLI
**Difficulty:** 🟢 Beginner
**Time:** ⏱️ 2–10 minutes (depends on tweet volume)
**Requirements:** A web browser logged into x.com

> 📖 For the quick-reference version, see [hashtag-scraping.md](../hashtag-scraping.md)

---

## 🎯 Real-World Scenario

You're a crypto marketing manager running a campaign with the hashtag #DeFiSummer. You need to know: How many tweets are using the hashtag? What's the average engagement? Who are the top tweeters? What time of day gets the most traction? The official X analytics dashboard gives you almost nothing — and third-party tools want $200/month for hashtag tracking.

XActions' Hashtag Scraper navigates to any hashtag page, scrolls through results, and collects every tweet with full data: author, text, likes, retweets, replies, views, timestamp, and extracted hashtags. At the end, it exports everything to JSON and CSV so you can analyze it in any spreadsheet or data tool.

**Before XActions:**

```
┌──────────────────────────────────────────────────────────────┐
│  Tracking a Hashtag Campaign (Manual)                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Search #DeFiSummer on X                                     │
│  Scroll through results                                      │
│  Copy-paste interesting tweets into Google Docs               │
│  Manually count likes/retweets for each                      │
│  Try to figure out who posted the most engaging content       │
│                                                              │
│  Data collected: Incomplete, unstructured                    │
│  Time spent: 2 hours                                         │
│  Insights: "I think people liked it?"                        │
└──────────────────────────────────────────────────────────────┘
```

**After XActions:**

```
┌──────────────────────────────────────────────────────────────┐
│  Tracking a Hashtag Campaign (XActions)                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Navigate to x.com/hashtag/DeFiSummer                        │
│  Paste script → press Enter                                  │
│  Script scrolls and collects tweets automatically            │
│  JSON + CSV files download with full data                    │
│                                                              │
│  Data collected: 347 tweets with full metrics                │
│  Time spent: 3 minutes                                       │
│  Insights: Top 5 tweets, avg engagement, top authors         │
└──────────────────────────────────────────────────────────────┘
```

---

## 📋 What This Does (Step by Step)

1. 🔍 **Detects the hashtag** — reads it from the URL (`/hashtag/TAG` or `?q=%23TAG`)
2. 📜 **Scans visible tweets** — extracts all tweet data from the page
3. 📊 **Collects engagement metrics** — likes, retweets, replies, views for each tweet
4. 🏷️ **Extracts hashtags** — finds all `#hashtags` within each tweet's text
5. 📜 **Scrolls for more** — loads additional tweets by scrolling down
6. 🔄 **Deduplicates** — uses tweet IDs to avoid counting duplicates
7. 📈 **Sorts by engagement** — top-liked tweets shown first in the summary
8. 📥 **Exports JSON + CSV** — auto-downloads both formats

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  [Navigate to x.com/hashtag/TAG]                             │
│          │                                                   │
│          ▼                                                   │
│  [For each visible article]                                  │
│          │                                                   │
│          ▼                                                   │
│  [Extract: author, text, likes, RTs, replies, views, time]   │
│          │                                                   │
│          ▼                                                   │
│  [Already seen this tweet ID?] ──Yes──→ [Skip]               │
│          │ No                                                │
│          ▼                                                   │
│  [Add to collection]                                         │
│          │                                                   │
│          ▼                                                   │
│  [Scroll down 800px] → [Wait 1.5s]                           │
│          │                                                   │
│          ▼                                                   │
│  [No new tweets found 5x in a row?] ──Yes──→ [Stop]         │
│          │ No                                                │
│          ▼                                                   │
│  [Repeat scan...]                                            │
│          │                                                   │
│          ▼                                                   │
│  [Sort by likes] → [Print top 5] → [Export JSON + CSV]       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🌐 Method 1: Browser Console (Copy-Paste)

**Best for:** Quick one-off hashtag scrapes. No installs needed.

### Prerequisites

- [x] Logged into your X/Twitter account in a web browser
- [x] On a desktop/laptop (not mobile)

### Step 1: Navigate to the hashtag page

> Go to **`x.com/hashtag/YOUR_HASHTAG`** (e.g., `x.com/hashtag/DeFiSummer`) or search `#YOUR_HASHTAG` and stay on the results page.

```
┌──────────────────────────────────────────────────────────────┐
│ 🔍 x.com/hashtag/DeFiSummer                                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  👤 @defiprotocol                                            │
│  "The #DeFiSummer is just getting started 🔥                │
│   TVL across major protocols up 340% this quarter"           │
│  ❤️ 2,341  🔄 567  💬 89  👁️ 124K                            │
│                                                              │
│  👤 @cryptoanalyst                                           │
│  "#DeFiSummer yields are back. Here's my                    │
│   thread on the top 5 opportunities..."                     │
│  ❤️ 891  🔄 234  💬 67  👁️ 56K                               │
│                                                              │
│  ... hundreds more below                                     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Step 2: Open Developer Console

| OS | Shortcut |
|----|----------|
| **Windows / Linux** | `F12` then click **Console** tab, or `Ctrl + Shift + J` |
| **Mac** | `Cmd + Option + J` |

### Step 3: Paste and Run

```javascript
// ============================================
// XActions - Hashtag Scraper
// by nichxbt — https://xactions.app
// Go to: x.com/hashtag/TAG or search #TAG
// Open console (F12 → Console), paste, Enter
// ============================================

(() => {
  const CONFIG = {
    MAX_TWEETS: 500,       // Max tweets to collect
    SCROLL_DELAY: 1500,    // Delay between scrolls (ms)
    FORMAT: 'both',        // 'json', 'csv', 'both'
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const parseNumber = (str) => {
    if (!str) return 0;
    const num = parseFloat(str.replace(/,/g, ''));
    if (str.includes('K')) return num * 1000;
    if (str.includes('M')) return num * 1000000;
    return num;
  };

  const extractTweet = (article) => {
    try {
      const tweetText = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
      const userName = article.querySelector('[data-testid="User-Name"]')?.textContent || '';
      const handle = userName.match(/@(\w+)/)?.[1] || '';
      const displayName = userName.split('@')[0]?.trim() || '';

      const timeLink = article.querySelector('time')?.closest('a');
      const tweetUrl = timeLink?.href || '';
      const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0] || '';
      const time = article.querySelector('time')?.getAttribute('datetime') || '';

      const buttons = article.querySelectorAll('[role="group"] button');
      let replies = 0, retweets = 0, likes = 0, views = 0;
      buttons.forEach(btn => {
        const label = btn.getAttribute('aria-label') || '';
        const num = parseNumber(label.match(/[\d,.]+[KM]?/)?.[0] || '0');
        if (label.includes('repl')) replies = num;
        else if (label.includes('repost') || label.includes('Retweet')) retweets = num;
        else if (label.includes('like')) likes = num;
        else if (label.includes('view')) views = num;
      });

      const hashtags = tweetText.match(/#\w+/g) || [];

      return { tweetId, handle, displayName, text: tweetText, url: tweetUrl, time, likes, retweets, replies, views, hashtags };
    } catch (e) { return null; }
  };

  const getHashtag = () => {
    const urlMatch = window.location.href.match(/hashtag\/(\w+)/);
    if (urlMatch) return urlMatch[1];
    const searchMatch = window.location.href.match(/q=%23(\w+)/);
    if (searchMatch) return searchMatch[1];
    return 'unknown';
  };

  const run = async () => {
    const hashtag = getHashtag();
    console.log(`#️⃣ Scraping tweets for #${hashtag}...`);

    const tweets = new Map();
    let scrolls = 0;
    let noNewCount = 0;

    while (tweets.size < CONFIG.MAX_TWEETS && noNewCount < 5) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const beforeCount = tweets.size;

      articles.forEach(article => {
        const tweet = extractTweet(article);
        if (tweet && tweet.tweetId && !tweets.has(tweet.tweetId)) {
          tweets.set(tweet.tweetId, tweet);
        }
      });

      const added = tweets.size - beforeCount;
      if (added > 0) { console.log(`#️⃣ Collected ${tweets.size} tweets...`); noNewCount = 0; }
      else { noNewCount++; }

      window.scrollBy(0, 800);
      await sleep(CONFIG.SCROLL_DELAY);
      scrolls++;
      if (scrolls > 100) break;
    }

    const tweetList = Array.from(tweets.values());
    tweetList.sort((a, b) => b.likes - a.likes);

    console.log('\n' + '='.repeat(60));
    console.log(`#️⃣ SCRAPED ${tweetList.length} TWEETS FOR #${hashtag}`);
    console.log('='.repeat(60) + '\n');

    tweetList.slice(0, 5).forEach((t, i) => {
      console.log(`${i + 1}. @${t.handle} (${t.likes} ❤️): "${t.text.slice(0, 60)}..."`);
    });

    if (CONFIG.FORMAT === 'json' || CONFIG.FORMAT === 'both') {
      download(JSON.stringify({ hashtag, tweets: tweetList }, null, 2),
        `hashtag_${hashtag}_${Date.now()}.json`, 'application/json');
      console.log('💾 Downloaded hashtag tweets.json');
    }

    if (CONFIG.FORMAT === 'csv' || CONFIG.FORMAT === 'both') {
      const csv = [
        'Handle,Text,Likes,Retweets,Replies,Views,URL,Time',
        ...tweetList.map(t =>
          `"@${t.handle}","${t.text.replace(/"/g, '""').replace(/\n/g, ' ')}",${t.likes},${t.retweets},${t.replies},${t.views},"${t.url}","${t.time}"`
        )
      ].join('\n');
      download(csv, `hashtag_${hashtag}_${Date.now()}.csv`, 'text/csv');
      console.log('💾 Downloaded hashtag tweets.csv');
    }

    window.scrapedHashtag = { hashtag, tweets: tweetList };
    console.log('\n✅ Done! Access data: window.scrapedHashtag');
  };

  run();
})();
```

### Step 4: Review the output

```
#️⃣ Scraping tweets for #DeFiSummer...
#️⃣ Collected 47 tweets...
#️⃣ Collected 112 tweets...
#️⃣ Collected 189 tweets...
#️⃣ Collected 247 tweets...
#️⃣ Collected 310 tweets...
#️⃣ Collected 347 tweets...

============================================================
#️⃣ SCRAPED 347 TWEETS FOR #DeFiSummer
============================================================

1. @defiprotocol (2341 ❤️): "The #DeFiSummer is just getting started 🔥 TVL across ma..."
2. @cryptoanalyst (891 ❤️): "#DeFiSummer yields are back. Here's my thread on the to..."
3. @web3founder (567 ❤️): "Just deployed our #DeFiSummer liquidity pool. 47% APY o..."
4. @blockchaindev (423 ❤️): "My #DeFiSummer portfolio strategy — a thread 🧵..."
5. @nichxbt (312 ❤️): "Built a hashtag scraper for tracking #DeFiSummer with X..."

💾 Downloaded hashtag tweets.json
💾 Downloaded hashtag tweets.csv

✅ Done! Access data: window.scrapedHashtag
```

---

## 💻 Method 2: CLI

```bash
# Install XActions
npm install -g xactions

# Scrape tweets by hashtag
npx xactions hashtag DeFiSummer --max 500

# Export to CSV
npx xactions hashtag DeFiSummer --format csv --output defi-summer.csv

# Scrape with login (for protected search results)
npx xactions login
npx xactions hashtag YOUR_HASHTAG --max 1000
```

---

## ⚙️ Configuration Reference

| Setting | Default | Description |
|---------|---------|-------------|
| `MAX_TWEETS` | `500` | Maximum tweets to collect before stopping |
| `SCROLL_DELAY` | `1500` | Milliseconds between scroll-downs |
| `FORMAT` | `'both'` | Export format: `'json'`, `'csv'`, or `'both'` |

### Data Fields Collected

| Field | Description | Example |
|-------|-------------|---------|
| `tweetId` | Unique tweet identifier | `"1834567890123456789"` |
| `handle` | Author's username | `"defiprotocol"` |
| `displayName` | Author's display name | `"DeFi Protocol"` |
| `text` | Full tweet text | `"The #DeFiSummer is..."` |
| `url` | Direct link to tweet | `"https://x.com/defi.../status/..."` |
| `time` | ISO timestamp | `"2026-02-24T14:30:00.000Z"` |
| `likes` | Like count | `2341` |
| `retweets` | Retweet/repost count | `567` |
| `replies` | Reply count | `89` |
| `views` | View/impression count | `124000` |
| `hashtags` | All hashtags in tweet | `["#DeFiSummer", "#crypto"]` |

---

## 💡 Pro Tips

1. **Sort the CSV by likes.** Import into Google Sheets → sort by Likes column → instantly see top-performing content for the hashtag.
2. **Track hashtags over time.** Run the scraper daily and compare datasets to see how engagement trends change.
3. **Use window.scrapedHashtag for live analysis.** After scraping, run analysis code directly in the console:
   ```javascript
   // Average likes per tweet
   const avg = window.scrapedHashtag.tweets.reduce((sum, t) => sum + t.likes, 0) / window.scrapedHashtag.tweets.length;
   console.log(`Average likes: ${avg.toFixed(0)}`);
   
   // Top 3 authors by number of tweets
   const authors = {};
   window.scrapedHashtag.tweets.forEach(t => { authors[t.handle] = (authors[t.handle] || 0) + 1; });
   Object.entries(authors).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([h, c]) => console.log(`@${h}: ${c} tweets`));
   ```
4. **Scrape competitor hashtags.** See what's working for competitors and use the insights for your own content strategy.
5. **Combine with Auto-Liker.** After identifying top authors for a hashtag, use the Auto-Liker to engage with their content.

---

## ⚠️ Important Warnings

> **Scroll limit:** The script stops after 100 scrolls or when no new tweets appear 5 times in a row. X limits how far back you can scroll in search results.

> **Data accuracy:** Engagement numbers (likes, retweets) are scraped from the DOM at the time of collection. They may differ from X's API/analytics numbers.

> **Rate limits:** Scrolling too fast may trigger rate limiting. The default 1.5s delay is safe, but avoid reducing it below 1s.

---

## 🔗 Related Features

- [Tweet Scraping Tutorial](tweet-scraping-tutorial.md) — Search and export tweets by keyword (not just hashtags)
- [Auto-Liker Tutorial](auto-liker-tutorial.md) — Auto-engage with tweets after identifying trending hashtags
- [Profile Scraping Tutorial](profile-scraping-tutorial.md) — Get detailed data on top hashtag authors

---

## ❓ FAQ

### What's the difference between hashtag scraping and tweet scraping?
Hashtag scraping targets a specific `#hashtag` page or search. Tweet scraping searches by keywords (without the #). Use hashtag scraping for tracking campaigns; use tweet scraping for broader topic research.

### How many tweets can I scrape?
The default is 500, but you can increase `MAX_TWEETS`. X limits search depth, so you may not get more than ~1,000 tweets even with a higher limit.

### Can I scrape multiple hashtags?
Run the script once per hashtag. Each run produces separate JSON/CSV files. To merge datasets, combine the JSON files or import CSVs into the same spreadsheet.

### Does this work without logging in?
You need to be logged into x.com for the search to return full results. Logged-out searches are severely limited.

### Can I access the data programmatically?
Yes! After the script runs, use `window.scrapedHashtag` to access the full dataset in the console. The object contains `{ hashtag, tweets: [...] }`.

---

<p align="center">
  <b>Built with ❤️ by <a href="https://x.com/nichxbt">@nichxbt</a></b><br>
  <a href="https://xactions.app">xactions.app</a> · <a href="https://github.com/nichxbt/xactions">GitHub</a>
</p>

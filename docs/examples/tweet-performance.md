# 📊 Tweet Performance

Compare your recent tweets side-by-side. Analyze engagement rates, impressions, and identify content patterns that work.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Compare your recent tweets side-by-side. Analyze engagement rates, impressions, and identify content patterns that work.
- Automate repetitive analytics tasks on X/Twitter
- Save time with one-click automation — no API keys needed
- Works in any modern browser (Chrome, Firefox, Edge, Safari)

---

## ⚠️ Important Notes

> **Use responsibly!** All automation should respect X/Twitter's Terms of Service. Use conservative settings and include breaks between sessions.

- This script runs in the **browser DevTools console** — not Node.js
- You must be **logged in** to x.com for the script to work
- Start with **low limits** and increase gradually
- Include **random delays** between actions to appear human
- **Don't run** multiple automation scripts simultaneously

---

## 🌐 Browser Console Usage

**Steps:**
1. Go to `x.com/YOUR_USERNAME`
2. Open browser console (`F12` → Console tab)
3. Copy and paste the script from [`browser/tweetPerformance.js`](https://github.com/nirholas/XActions/blob/main/browser/tweetPerformance.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * 🎯 Tweet Performance Comparator — Production Grade
 * ============================================================
 *
 * @name        tweetPerformance.js
 * @description Compare the performance of your recent tweets
 *              side by side. Ranks by engagement rate, identifies
 *              patterns in your best/worst posts, analyzes
 *              optimal posting characteristics (length, media,
 *              hashtags, time of day).
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME (your profile)
 * 2. Open DevTools Console (F12)
 * 3. Paste and run
 * 4. Auto-scrolls to collect tweet performance data
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxTweets: 50,
    scrollRounds: 5,
    scrollDelay: 2000,
    excludeRetweets: true,
    exportResults: true,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };

  const fmt = (n) => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : String(n);

  const collectTweets = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const tweets = [];
    const seen = new Set();

    for (const article of articles) {
      // Skip retweets
      if (CONFIG.excludeRetweets) {
        const socialContext = article.querySelector('[data-testid="socialContext"]');
        if (socialContext && /reposted|retweeted/i.test(socialContext.textContent)) continue;
      }

      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl ? textEl.textContent.trim() : '';
      if (seen.has(text) && text.length > 0) continue;
      if (text.length > 0) seen.add(text);

      // Engagement metrics
      const groups = article.querySelectorAll('[role="group"] button');
      let replies = 0, retweets = 0, likes = 0, views = 0, bookmarks = 0;

      for (const btn of groups) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const count = parseCount(btn.textContent);
        if (label.includes('repl')) replies = count;
        else if (label.includes('repost') || label.includes('retweet')) retweets = count;
        else if (label.includes('like')) likes = count;
        else if (label.includes('view')) views = count;
        else if (label.includes('bookmark')) bookmarks = count;
      }

      // Fallback: try aria-label parsing for views
      if (views === 0) {
        const viewBtn = article.querySelector('a[href*="/analytics"]');
        if (viewBtn) views = parseCount(viewBtn.textContent);
      }

      // Media detection
      const hasImage = !!article.querySelector('[data-testid="tweetPhoto"]');
      const hasVideo = !!article.querySelector('[data-testid="videoPlayer"]');
      const hasLink = !!article.querySelector('[data-testid="card.wrapper"]');
      const hasPoll = !!article.querySelector('[data-testid="poll"]');

      // Timestamp
      const timeEl = article.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;

      // Hashtags and mentions
      const hashtags = (text.match(/#\w+/g) || []);
      const mentions = (text.match(/@\w+/g) || []);

      const engagement = replies + retweets + likes;
      const engagementRate = views > 0 ? ((engagement / views) * 100) : 0;

      tweets.push({
        text: text.slice(0, 200),
        fullText: text,
        replies, retweets, likes, views, bookmarks, engagement,
        engagementRate: Math.round(engagementRate * 100) / 100,
        hasImage, hasVideo, hasLink, hasPoll,
        timestamp,
        charLength: text.length,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        hashtags, mentions,
        hashtagCount: hashtags.length,
        mentionCount: mentions.length,
      });
    }

    return tweets;
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🎯 TWEET PERFORMANCE COMPARATOR' + ' '.repeat(W - 35) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log(`\n📊 Collecting up to ${CONFIG.maxTweets} tweets...\n`);

    const allTweets = new Map();

    for (let round = 0; round < CONFIG.scrollRounds && allTweets.size < CONFIG.maxTweets; round++) {
      const found = collectTweets();
      for (const t of found) {
        if (allTweets.size >= CONFIG.maxTweets) break;
        const key = t.text || `tweet_${allTweets.size}`;
        if (!allTweets.has(key)) allTweets.set(key, t);
      }
      console.log(`   📜 Round ${round + 1}: ${allTweets.size} tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const tweets = [...allTweets.values()];
    if (tweets.length < 2) {
      console.error('❌ Need at least 2 tweets to compare. Navigate to your profile.');
      return;
    }

    // ── Rankings ─────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🏆 TOP PERFORMING TWEETS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const byEngagement = [...tweets].sort((a, b) => b.engagement - a.engagement);
    const byRate = [...tweets].filter(t => t.views > 100).sort((a, b) => b.engagementRate - a.engagementRate);
    const byViews = [...tweets].sort((a, b) => b.views - a.views);

    console.log('\n  📈 By Total Engagement (likes + RTs + replies):');
    for (const t of byEngagement.slice(0, 5)) {
      console.log(`    ${fmt(t.engagement)} (❤️${fmt(t.likes)} 🔄${fmt(t.retweets)} 💬${fmt(t.replies)}) — "${t.text.slice(0, 80)}..."`);
    }

    console.log('\n  📊 By Engagement Rate (engagement/views):');
    for (const t of byRate.slice(0, 5)) {
      console.log(`    ${t.engagementRate}% (${fmt(t.views)} views) — "${t.text.slice(0, 80)}..."`);
    }

    console.log('\n  👀 By Views:');
    for (const t of byViews.slice(0, 5)) {
      console.log(`    ${fmt(t.views)} views — "${t.text.slice(0, 80)}..."`);
    }

    // ── Pattern Analysis ────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📐 WHAT MAKES YOUR TWEETS PERFORM');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Media impact
    const withMedia = tweets.filter(t => t.hasImage || t.hasVideo);
    const withoutMedia = tweets.filter(t => !t.hasImage && !t.hasVideo);
    const avgMediaEng = withMedia.length > 0 ? withMedia.reduce((s, t) => s + t.engagement, 0) / withMedia.length : 0;
    const avgNoMediaEng = withoutMedia.length > 0 ? withoutMedia.reduce((s, t) => s + t.engagement, 0) / withoutMedia.length : 0;

    console.log(`\n  📸 Media Impact:`);
    console.log(`    With media:    avg ${fmt(Math.round(avgMediaEng))} engagement (${withMedia.length} tweets)`);
    console.log(`    Without media: avg ${fmt(Math.round(avgNoMediaEng))} engagement (${withoutMedia.length} tweets)`);
    if (avgMediaEng > 0 && avgNoMediaEng > 0) {
      const boost = ((avgMediaEng / avgNoMediaEng - 1) * 100).toFixed(0);
      console.log(`    ${boost > 0 ? '📈' : '📉'} Media ${boost > 0 ? 'boost' : 'penalty'}: ${boost}%`);
    }

    // Length analysis
    const shortTweets = tweets.filter(t => t.charLength < 100);
    const medTweets = tweets.filter(t => t.charLength >= 100 && t.charLength < 200);
    const longTweets = tweets.filter(t => t.charLength >= 200);

    const avgEng = (arr) => arr.length > 0 ? Math.round(arr.reduce((s, t) => s + t.engagement, 0) / arr.length) : 0;

    console.log(`\n  📏 Length Impact:`);
    console.log(`    Short (<100):  avg ${fmt(avgEng(shortTweets))} engagement (${shortTweets.length} tweets)`);
    console.log(`    Medium (100-200): avg ${fmt(avgEng(medTweets))} engagement (${medTweets.length} tweets)`);
    console.log(`    Long (200+):   avg ${fmt(avgEng(longTweets))} engagement (${longTweets.length} tweets)`);

    // Hashtag impact
    const withHashtags = tweets.filter(t => t.hashtagCount > 0);
    const noHashtags = tweets.filter(t => t.hashtagCount === 0);
    console.log(`\n  #️⃣ Hashtag Impact:`);
    console.log(`    With hashtags: avg ${fmt(avgEng(withHashtags))} engagement (${withHashtags.length} tweets)`);
    console.log(`    No hashtags:   avg ${fmt(avgEng(noHashtags))} engagement (${noHashtags.length} tweets)`);

    // Time analysis
    const byHour = {};
    for (const t of tweets) {
      if (t.timestamp) {
        const hour = new Date(t.timestamp).getHours();
        if (!byHour[hour]) byHour[hour] = [];
        byHour[hour].push(t);
      }
    }
    if (Object.keys(byHour).length > 2) {
      console.log(`\n  ⏰ Best Posting Hours:`);
      const hourAvgs = Object.entries(byHour)
        .map(([h, arr]) => ({ hour: parseInt(h), avg: avgEng(arr), count: arr.length }))
        .filter(h => h.count >= 2)
        .sort((a, b) => b.avg - a.avg);

      for (const h of hourAvgs.slice(0, 3)) {
        const timeLabel = `${h.hour.toString().padStart(2, '0')}:00`;
        console.log(`    ${timeLabel} — avg ${fmt(h.avg)} engagement (${h.count} tweets)`);
      }
    }

    // ── Averages ────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 AVERAGES ACROSS ALL TWEETS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const avg = (arr, key) => arr.length > 0 ? Math.round(arr.reduce((s, t) => s + t[key], 0) / arr.length) : 0;
    console.log(`\n  ❤️ Avg likes:     ${fmt(avg(tweets, 'likes'))}`);
    console.log(`  🔄 Avg retweets:  ${fmt(avg(tweets, 'retweets'))}`);
    console.log(`  💬 Avg replies:   ${fmt(avg(tweets, 'replies'))}`);
    console.log(`  👀 Avg views:     ${fmt(avg(tweets, 'views'))}`);
    console.log(`  📊 Avg eng rate:  ${(tweets.reduce((s, t) => s + t.engagementRate, 0) / tweets.length).toFixed(2)}%`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (CONFIG.exportResults) {
      const data = {
        summary: {
          totalTweets: tweets.length,
          avgLikes: avg(tweets, 'likes'),
          avgRetweets: avg(tweets, 'retweets'),
          avgViews: avg(tweets, 'views'),
        },
        rankings: {
          byEngagement: byEngagement.slice(0, 10).map(t => ({ text: t.text, engagement: t.engagement, likes: t.likes })),
          byRate: byRate.slice(0, 10).map(t => ({ text: t.text, engagementRate: t.engagementRate, views: t.views })),
        },
        allTweets: tweets,
        analyzedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-performance-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Full results exported as JSON.');
    }
  };

  run();
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `maxTweets` | `50` | Max tweets |
| `scrollRounds` | `5` | Scroll rounds |
| `scrollDelay` | `2000` | Scroll delay |
| `excludeRetweets` | `true` | Exclude retweets |
| `exportResults` | `true` | Export results |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/YOUR_USERNAME`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/tweetPerformance.js`](https://github.com/nirholas/XActions/blob/main/browser/tweetPerformance.js) and paste it into the console.

### Step 4: Customize the CONFIG (optional)

Before running, you can modify the `CONFIG` object at the top of the script to adjust behavior:

```javascript
const CONFIG = {
  // Edit these values before running
  // See Configuration table above for all options
};
```

### Step 5: Run and monitor

Press **Enter** to run the script. Watch the console for real-time progress logs:

- ✅ Green messages = success
- 🔄 Blue messages = in progress
- ⚠️ Yellow messages = warnings
- ❌ Red messages = errors

### Step 6: Export results

Most scripts automatically download results as JSON/CSV when complete. Check your Downloads folder.

---

## 🖥️ CLI Usage

You can also run this via the XActions CLI:

```bash
# Install XActions globally
npm install -g xactions

# Run via CLI
xactions --help
```

---

## 🤖 MCP Server Usage

Use with AI agents (Claude, Cursor, etc.) via the MCP server:

```bash
# Start MCP server
npm run mcp
```

See the [MCP Setup Guide](../mcp-setup.md) for integration with Claude Desktop, Cursor, and other AI tools.

---

## 📁 Source Files

| File | Description |
|------|-------------|
| [`browser/tweetPerformance.js`](https://github.com/nirholas/XActions/blob/main/browser/tweetPerformance.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Account Health Monitor](account-health-monitor.md) | Comprehensive health check for your X/Twitter account |
| [Audience Demographics](audience-demographics.md) | Analyze your follower demographics including bio keywords, locations, account age, and interests |
| [Audience Overlap](audience-overlap.md) | Compare the follower lists of two accounts to find audience overlap |
| [Engagement Leaderboard](engagement-leaderboard.md) | Analyze who engages most with your tweets |
| [Follower Growth Tracker](follower-growth-tracker.md) | Track your follower count over time |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)

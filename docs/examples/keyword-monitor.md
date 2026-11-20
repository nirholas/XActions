# 🔑 Keyword Monitor

Monitor search results and timelines for specific keyword mentions. Alerts you when target keywords appear in new tweets.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Monitor search results and timelines for specific keyword mentions. Alerts you when target keywords appear in new tweets.
- Automate repetitive monitoring tasks on X/Twitter
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
1. Go to `x.com/search`
2. Open browser console (`F12` → Console tab)
3. Copy and paste the script from [`browser/keywordMonitor.js`](https://github.com/nirholas/XActions/blob/main/browser/keywordMonitor.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * 🔍 Keyword Monitor & Alerts — Production Grade
 * ============================================================
 *
 * @name        keywordMonitor.js
 * @description Monitor any X/Twitter search for keyword mentions
 *              in real-time. Scrapes search results, detects new
 *              tweets matching your keywords, tracks mention
 *              frequency, identifies top mentioners, and persists
 *              history in localStorage. Supports auto-refresh
 *              intervals and engagement threshold filters.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * MODE A — Run on existing search page:
 *   1. Go to x.com/search?q=your+keyword
 *   2. Paste and run
 *
 * MODE B — Use the API:
 *   XActions.monitor(['keyword1', 'keyword2'])
 *   XActions.autoRefresh(120000)  // Refresh every 2 min
 *   XActions.stop()
 *   XActions.stats()
 *   XActions.history()
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    keywords: [],              // Will be auto-detected from search URL
    scrollRounds: 4,
    scrollDelay: 1500,
    minLikes: 0,               // Min likes to include in results
    exportResults: true,
    maxHistory: 500,           // Max mentions to keep in history
  };

  const STORAGE_KEY = 'xactions_keyword_monitor';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const loadData = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"mentions":[],"stats":{}}'); }
    catch { return { mentions: [], stats: {} }; }
  };

  const saveData = (data) => {
    // Trim history
    while (data.mentions.length > CONFIG.maxHistory) data.mentions.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  let autoRefreshTimer = null;

  // ── Detect keywords from URL ───────────────────────────────
  const detectKeywords = () => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('q');
    if (q) return [q];
    return CONFIG.keywords;
  };

  // ── Scrape search results ──────────────────────────────────
  const scrapeMentions = async () => {
    const mentions = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.textContent.trim() : '';
        if (!text) continue;

        const fp = text.slice(0, 80);
        if (seen.has(fp)) continue;
        seen.add(fp);

        // Time
        const timeEl = article.querySelector('time');
        const datetime = timeEl ? timeEl.getAttribute('datetime') : null;

        // Author
        const authorLink = article.querySelector('a[href^="/"][role="link"]');
        const authorMatch = authorLink ? (authorLink.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/) : null;
        const author = authorMatch ? authorMatch[1] : 'unknown';

        // Metrics
        const likeBtn = article.querySelector('[data-testid="like"] span') || article.querySelector('[data-testid="unlike"] span');
        const rtBtn = article.querySelector('[data-testid="retweet"] span');
        const replyBtn = article.querySelector('[data-testid="reply"] span');
        const likes = likeBtn ? parseNum(likeBtn.textContent) : 0;
        const rts = rtBtn ? parseNum(rtBtn.textContent) : 0;
        const replies = replyBtn ? parseNum(replyBtn.textContent) : 0;

        if (likes < CONFIG.minLikes) continue;

        // Verified
        const verified = !!article.querySelector('[data-testid="icon-verified"]') || !!article.querySelector('svg[aria-label="Verified"]');

        // Media
        const hasMedia = !!(article.querySelector('[data-testid="tweetPhoto"]') || article.querySelector('video'));

        mentions.push({
          author,
          text: text.slice(0, 200),
          datetime,
          likes, rts, replies,
          totalEng: likes + rts + replies,
          verified,
          hasMedia,
          scrapedAt: new Date().toISOString(),
        });
      }

      console.log(`   📜 Round ${round + 1}: ${mentions.length} mentions`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return mentions;
  };

  // ── Main scan ──────────────────────────────────────────────
  const scan = async () => {
    const keywords = detectKeywords();

    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🔍 KEYWORD MONITOR' + ' '.repeat(W - 21) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (keywords.length === 0) {
      console.log('\n❌ No keywords detected. Either:');
      console.log('   1. Navigate to x.com/search?q=keyword');
      console.log('   2. Or use: XActions.monitor(["keyword1", "keyword2"])');
      return;
    }

    console.log(`\n🔍 Monitoring: ${keywords.join(', ')}`);
    console.log('📊 Scraping mentions...\n');

    const mentions = await scrapeMentions();

    if (mentions.length === 0) {
      console.log('❌ No mentions found. Try different keywords or scroll more.');
      return;
    }

    // Load existing data and find new mentions
    const data = loadData();
    const existingFps = new Set(data.mentions.map(m => m.text.slice(0, 80)));
    const newMentions = mentions.filter(m => !existingFps.has(m.text.slice(0, 80)));

    // Add new mentions to history
    data.mentions.push(...newMentions);

    // ── Display results ─────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  📊 SCAN RESULTS (${mentions.length} total, ${newMentions.length} new)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Top mentions by engagement
    const sorted = [...mentions].sort((a, b) => b.totalEng - a.totalEng);
    console.log('\n━━━ 🔥 TOP MENTIONS (by engagement) ━━━');
    for (const m of sorted.slice(0, 10)) {
      const badge = m.verified ? '✅' : '  ';
      console.log(`  ${badge} @${m.author.padEnd(16)} ${String(m.totalEng).padStart(5)} eng — "${m.text.slice(0, 50)}..."`);
    }

    // New mentions alert
    if (newMentions.length > 0) {
      console.log(`\n━━━ 🆕 NEW MENTIONS (${newMentions.length}) ━━━`);
      for (const m of newMentions.slice(0, 8)) {
        console.log(`  🔔 @${m.author}: "${m.text.slice(0, 60)}..." (${m.totalEng} eng)`);
      }
    }

    // ── Top mentioners ──────────────────────────────────────
    console.log('\n━━━ 👥 TOP MENTIONERS ━━━');
    const authorCounts = {};
    for (const m of mentions) {
      authorCounts[m.author] = (authorCounts[m.author] || 0) + 1;
    }
    const topAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    for (const [author, count] of topAuthors) {
      const bar = '█'.repeat(Math.round(count / Math.max(...Object.values(authorCounts)) * 20));
      console.log(`  @${author.padEnd(16)} ${String(count).padStart(3)} mentions ${bar}`);
    }

    // ── Sentiment quick scan ────────────────────────────────
    console.log('\n━━━ 📊 MENTION SENTIMENT (quick scan) ━━━');
    const positive = ['love', 'great', 'amazing', 'awesome', 'best', 'excellent', 'perfect', 'incredible', 'thank', 'fire', '🔥', '💯', '❤️', '🙌'];
    const negative = ['hate', 'terrible', 'awful', 'worst', 'bad', 'sucks', 'broken', 'scam', 'fake', 'trash', '👎', '🗑️'];

    let posCount = 0, negCount = 0;
    for (const m of mentions) {
      const lower = m.text.toLowerCase();
      if (positive.some(w => lower.includes(w))) posCount++;
      if (negative.some(w => lower.includes(w))) negCount++;
    }
    const neutral = mentions.length - posCount - negCount;

    console.log(`  ✅ Positive: ${posCount} (${((posCount / mentions.length) * 100).toFixed(0)}%)`);
    console.log(`  ❌ Negative: ${negCount} (${((negCount / mentions.length) * 100).toFixed(0)}%)`);
    console.log(`  ⚖️ Neutral:  ${neutral} (${((neutral / mentions.length) * 100).toFixed(0)}%)`);

    // ── Verified mentions ───────────────────────────────────
    const verifiedMentions = mentions.filter(m => m.verified);
    if (verifiedMentions.length > 0) {
      console.log(`\n━━━ ✅ VERIFIED ACCOUNT MENTIONS (${verifiedMentions.length}) ━━━`);
      for (const m of verifiedMentions.slice(0, 5)) {
        console.log(`  ✅ @${m.author}: "${m.text.slice(0, 60)}..." (${m.totalEng} eng)`);
      }
    }

    // ── Media mentions ──────────────────────────────────────
    const mediaMentions = mentions.filter(m => m.hasMedia);
    console.log(`\n  📸 ${mediaMentions.length}/${mentions.length} mentions include media.`);

    // ── Update stats ────────────────────────────────────────
    const kw = keywords.join(',');
    if (!data.stats[kw]) data.stats[kw] = { scans: 0, totalMentions: 0, firstScan: new Date().toISOString() };
    data.stats[kw].scans++;
    data.stats[kw].totalMentions += newMentions.length;
    data.stats[kw].lastScan = new Date().toISOString();

    saveData(data);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (CONFIG.exportResults) {
      const exportData = {
        keywords, mentions, newMentions: newMentions.length,
        topAuthors: topAuthors.slice(0, 20),
        sentiment: { positive: posCount, negative: negCount, neutral },
        scanTime: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-keyword-monitor-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Keyword data exported.');
    }
  };

  // ── Controls ───────────────────────────────────────────────
  window.XActions = window.XActions || {};

  window.XActions.monitor = (keywords) => {
    if (!Array.isArray(keywords) || keywords.length === 0) {
      console.log('❌ Usage: XActions.monitor(["keyword1", "keyword2"])');
      return;
    }
    CONFIG.keywords = keywords;
    // Navigate to search
    const q = encodeURIComponent(keywords.join(' OR '));
    window.location.href = `https://x.com/search?q=${q}&src=typed_query&f=live`;
    console.log(`🔍 Navigating to search for: ${keywords.join(', ')}`);
    console.log('⏳ Wait for page to load, then the scan will run automatically.');
    setTimeout(scan, 5000);
  };

  window.XActions.autoRefresh = (intervalMs = 120000) => {
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    console.log(`🔄 Auto-refreshing every ${(intervalMs / 60000).toFixed(1)} minutes.`);
    autoRefreshTimer = setInterval(() => {
      console.log('\n🔄 Auto-refresh...');
      window.scrollTo(0, 0);
      setTimeout(scan, 2000);
    }, intervalMs);
  };

  window.XActions.stop = () => {
    if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
    console.log('⏹️ Auto-refresh stopped.');
  };

  window.XActions.stats = () => {
    const data = loadData();
    const kws = Object.keys(data.stats);
    if (kws.length === 0) { console.log('📭 No stats yet.'); return; }
    console.log(`\n📊 KEYWORD STATS (${kws.length} tracked keywords):\n`);
    for (const kw of kws) {
      const s = data.stats[kw];
      console.log(`  "${kw}" — ${s.scans} scans, ${s.totalMentions} total new mentions`);
      console.log(`    First: ${s.firstScan} | Last: ${s.lastScan}`);
    }
  };

  window.XActions.history = () => {
    const data = loadData();
    if (data.mentions.length === 0) { console.log('📭 No mention history.'); return; }
    console.log(`\n📋 MENTION HISTORY (${data.mentions.length} stored):\n`);
    for (const m of data.mentions.slice(-15)) {
      console.log(`  @${m.author} (${m.totalEng} eng): "${m.text.slice(0, 60)}..."`);
    }
  };

  window.XActions.reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Keyword history cleared.');
  };

  // Auto-run if on search page
  if (window.location.href.includes('/search')) {
    scan();
  } else {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  🔍 KEYWORD MONITOR — Ready                      ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('\n📋 Commands:');
    console.log('  XActions.monitor(["keyword1", "keyword2"])');
    console.log('  XActions.autoRefresh(120000)');
    console.log('  XActions.stats()');
    console.log('  XActions.history()');
    console.log('  XActions.stop()');
  }
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `keywords` | `[],` | Will be auto-detected from search URL |
| `scrollRounds` | `4` | Scroll rounds |
| `scrollDelay` | `1500` | Scroll delay |
| `minLikes` | `0,` | Min likes to include in results |
| `exportResults` | `true` | Export results |
| `maxHistory` | `500,` | Max mentions to keep in history |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/search`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/keywordMonitor.js`](https://github.com/nirholas/XActions/blob/main/browser/keywordMonitor.js) and paste it into the console.

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
| [`browser/keywordMonitor.js`](https://github.com/nirholas/XActions/blob/main/browser/keywordMonitor.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Continuous Monitor](continuous-monitor.md) | Auto-refresh monitoring for follower/following changes |
| [Trending Topic Monitor](trending-topic-monitor.md) | Monitor trending topics in real-time |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)

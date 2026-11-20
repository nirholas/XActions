# 🔌 Auto-Plug Replies

Automatically reply to viral tweets with your own content plug or CTA. Targets high-engagement tweets in your niche.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Automatically reply to viral tweets with your own content plug or CTA. Targets high-engagement tweets in your niche.
- Automate repetitive engagement tasks on X/Twitter
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
1. Go to `x.com/search or timeline`
2. Open browser console (`F12` → Console tab)
3. Copy and paste the script from [`browser/autoPlugReplies.js`](https://github.com/nirholas/XActions/blob/main/browser/autoPlugReplies.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * 🔌 Auto-Plug Replies — Production Grade
 * ============================================================
 *
 * @name        autoPlugReplies.js
 * @description Automatically reply to your own tweets that go
 *              viral with a "plug" (link, CTA, product pitch).
 *              Monitors your recent tweets for engagement spikes,
 *              and when a tweet exceeds a threshold, posts a
 *              follow-up reply to capitalize on the visibility.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to your profile: x.com/YOUR_USERNAME
 * 2. Open DevTools Console (F12)
 * 3. Configure your plug message and threshold
 * 4. Paste and run
 *
 * Controls:
 *   XActions.setPlug("Check out my new project → link")
 *   XActions.setThreshold(100)   // Min likes to trigger
 *   XActions.scan()              // Manual scan
 *   XActions.autoScan(600000)    // Auto-scan every 10min
 *   XActions.stop()              // Stop auto-scanning
 *   XActions.history()           // View plug history
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    dryRun: true,            // Set false to actually reply
    plugMessage: '🔌 If you liked this, you\'ll love my newsletter → [your link here]',
    viralThreshold: 50,      // Minimum likes to consider "viral enough" to plug
    maxPlugsPerSession: 3,   // Don't over-plug
    replyDelay: 3000,        // Delay before posting reply (ms)
    scrollRounds: 5,
    scrollDelay: 2000,
  };

  const STORAGE_KEY = 'xactions_plug_history';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const SEL = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeBtn: '[data-testid="like"] span',
    unlikeBtn: '[data-testid="unlike"] span',
    replyBtn: '[data-testid="reply"]',
    tweetBox: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  const loadHistory = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };

  const saveHistory = (history) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  };

  let autoScanTimer = null;
  let plugsThisSession = 0;

  // ── Scan for viral tweets ──────────────────────────────────
  const scanForViral = async () => {
    const viralTweets = [];
    const seen = new Set();
    const history = loadHistory();
    const pluggedUrls = new Set(history.map(h => h.tweetUrl));

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll(SEL.tweet);

      for (const article of articles) {
        const timeEl = article.querySelector('time');
        if (!timeEl) continue;

        const tweetLink = article.querySelector('a[href*="/status/"] time')?.closest('a');
        const href = tweetLink ? tweetLink.getAttribute('href') : null;
        if (!href || seen.has(href)) continue;
        seen.add(href);

        // Skip already plugged tweets
        const fullUrl = 'https://x.com' + href;
        if (pluggedUrls.has(fullUrl)) continue;

        // Get like count
        const likeEl = $(SEL.likeBtn, article) || $(SEL.unlikeBtn, article);
        const likes = likeEl ? parseNum(likeEl.textContent) : 0;

        if (likes < CONFIG.viralThreshold) continue;

        // Get tweet text
        const textEl = $(SEL.tweetText, article);
        const text = textEl ? textEl.textContent.trim().slice(0, 100) : '';

        // Check if it already has a self-reply (basic check: look for reply chain)
        const replyBtn = $(SEL.replyBtn, article);
        const replyCount = replyBtn ? parseNum(replyBtn.querySelector('span')?.textContent || '0') : 0;

        viralTweets.push({
          href,
          fullUrl,
          text,
          likes,
          replyCount,
          article,
        });
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return viralTweets.sort((a, b) => b.likes - a.likes);
  };

  // ── Post plug reply ────────────────────────────────────────
  const postPlug = async (tweet) => {
    console.log(`\n  🔌 Plugging on: "${tweet.text.slice(0, 50)}..." (${tweet.likes} likes)`);

    if (CONFIG.dryRun) {
      console.log(`  🏃 [DRY RUN] Would reply: "${CONFIG.plugMessage.slice(0, 60)}..."`);
      return true;
    }

    // Navigate to the tweet
    tweet.article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(1000);

    // Click reply button
    const replyBtn = $(SEL.replyBtn, tweet.article);
    if (!replyBtn) {
      console.log('  ⚠️ Reply button not found.');
      return false;
    }

    replyBtn.click();
    await sleep(2000);

    // Type in the reply box
    const tweetBox = $(SEL.tweetBox);
    if (!tweetBox) {
      console.log('  ⚠️ Reply box not found.');
      return false;
    }

    tweetBox.focus();
    await sleep(300);
    document.execCommand('insertText', false, CONFIG.plugMessage);
    await sleep(CONFIG.replyDelay);

    // Post
    const sendBtn = $(SEL.tweetButton);
    if (!sendBtn) {
      console.log('  ⚠️ Post button not found.');
      return false;
    }

    sendBtn.click();
    await sleep(3000);
    return true;
  };

  // ── Main scan ──────────────────────────────────────────────
  const scan = async () => {
    const W = 58;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🔌 AUTO-PLUG REPLIES' + ' '.repeat(W - 22) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) console.log('\n🏃 DRY RUN mode — no replies will be posted.');
    console.log(`📊 Threshold: ${CONFIG.viralThreshold} likes | Plug: "${CONFIG.plugMessage.slice(0, 50)}..."`);
    console.log('\n🔍 Scanning for viral tweets...\n');

    const viral = await scanForViral();

    if (viral.length === 0) {
      console.log('❌ No tweets above threshold found. Lower viralThreshold or wait.');
      return;
    }

    console.log(`\n📊 Found ${viral.length} viral tweet(s):\n`);

    for (const t of viral) {
      console.log(`  🔥 ${t.likes} likes — "${t.text.slice(0, 60)}..."`);
    }

    // Plug the top ones
    const toPlug = viral.slice(0, CONFIG.maxPlugsPerSession - plugsThisSession);
    if (toPlug.length === 0) {
      console.log(`\n⚠️ Already plugged ${plugsThisSession} tweets this session. Max: ${CONFIG.maxPlugsPerSession}`);
      return;
    }

    console.log(`\n🔌 Plugging ${toPlug.length} tweet(s)...\n`);

    const history = loadHistory();

    for (const tweet of toPlug) {
      const ok = await postPlug(tweet);
      if (ok) {
        plugsThisSession++;
        history.push({
          tweetUrl: tweet.fullUrl,
          tweetText: tweet.text,
          likes: tweet.likes,
          plugMessage: CONFIG.plugMessage,
          pluggedAt: new Date().toISOString(),
          dryRun: CONFIG.dryRun,
        });
        console.log('  ✅ Plugged!');
      } else {
        console.log('  ❌ Failed to plug.');
      }

      await sleep(5000);
    }

    saveHistory(history);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ✅ Plugged: ${toPlug.length} | Session total: ${plugsThisSession}/${CONFIG.maxPlugsPerSession}`);
    if (CONFIG.dryRun) console.log('  🏃 (Dry run — nothing was posted)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  };

  // ── Controls ───────────────────────────────────────────────
  window.XActions = window.XActions || {};

  window.XActions.setPlug = (msg) => {
    if (!msg) { console.log('❌ Usage: XActions.setPlug("your plug message")'); return; }
    CONFIG.plugMessage = msg;
    console.log(`✅ Plug set: "${msg.slice(0, 60)}..."`);
  };

  window.XActions.setThreshold = (n) => {
    if (typeof n !== 'number' || n < 1) { console.log('❌ Threshold must be a positive number.'); return; }
    CONFIG.viralThreshold = n;
    console.log(`✅ Viral threshold set to ${n} likes.`);
  };

  window.XActions.scan = scan;

  window.XActions.autoScan = (intervalMs = 600000) => {
    if (autoScanTimer) clearInterval(autoScanTimer);
    console.log(`🔄 Auto-scanning every ${(intervalMs / 60000).toFixed(1)} minutes.`);
    autoScanTimer = setInterval(scan, intervalMs);
  };

  window.XActions.stop = () => {
    if (autoScanTimer) { clearInterval(autoScanTimer); autoScanTimer = null; }
    console.log('⏹️ Auto-scan stopped.');
  };

  window.XActions.history = () => {
    const history = loadHistory();
    if (history.length === 0) { console.log('📭 No plug history.'); return; }
    console.log(`\n🔌 PLUG HISTORY (${history.length}):\n`);
    for (const h of history.slice(-10)) {
      console.log(`  ${new Date(h.pluggedAt).toLocaleString()} — ${h.likes} likes${h.dryRun ? ' [dry]' : ''}`);
      console.log(`    Tweet: "${h.tweetText.slice(0, 50)}..."`);
    }
  };

  window.XActions.exportHistory = () => {
    const history = loadHistory();
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `xactions-plug-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    console.log('📥 Plug history exported.');
  };

  // Run initial scan
  scan();
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `dryRun` | `true,` | Set false to actually reply |
| `plugMessage` | `'🔌 If you liked this, you\'ll love my newsletter → [your link here]'` | Plug message |
| `viralThreshold` | `50,` | Minimum likes to consider "viral enough" to plug |
| `maxPlugsPerSession` | `3,` | Don't over-plug |
| `replyDelay` | `3000,` | Delay before posting reply (ms) |
| `scrollRounds` | `5` | Scroll rounds |
| `scrollDelay` | `2000` | Scroll delay |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/search or timeline`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/autoPlugReplies.js`](https://github.com/nirholas/XActions/blob/main/browser/autoPlugReplies.js) and paste it into the console.

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
| [`browser/autoPlugReplies.js`](https://github.com/nirholas/XActions/blob/main/browser/autoPlugReplies.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Auto-Reply](auto-reply.md) | Auto-reply to tweets matching your filters |
| [Engagement Booster](engagement-booster.md) | Systematically engage with target accounts by liking, bookmarking, and retweeting their content to build relationships |
| [Engagement Manager](engagement-manager.md) | All-in-one engagement toolkit: like, unlike, reply, bookmark, and manage interactions from a single interface |
| [Quote Tweet Automation](quote-tweet-automation.md) | Auto-retweet with quote-tweet templates |
| [Welcome New Followers](welcome-new-followers.md) | Auto-send welcome DMs to new followers |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)

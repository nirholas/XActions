# 📌 Pin Tweet Manager

Pin and unpin tweets programmatically. Auto-rotate your pinned tweet based on performance or schedule.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Pin and unpin tweets programmatically. Auto-rotate your pinned tweet based on performance or schedule.
- Automate repetitive posting tasks on X/Twitter
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
3. Copy and paste the script from [`browser/pinTweetManager.js`](https://github.com/nirholas/XActions/blob/main/browser/pinTweetManager.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * 📌 Pin Tweet Manager — Production Grade
 * ============================================================
 *
 * @name        pinTweetManager.js
 * @description Pin/unpin tweets, auto-rotate pinned content,
 *              and pin your best-performing tweet.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME
 * 2. Configure action: 'pinBest', 'pinUrl', or 'unpin'
 * 3. Open DevTools Console (F12)
 * 4. Paste and run
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    action: 'pinBest',              // 'pinBest' | 'pinUrl' | 'unpin'
    tweetUrl: '',                   // For 'pinUrl': full URL of tweet to pin
    metric: 'likes',                // For 'pinBest': 'likes', 'retweets', 'engagement', 'views'
    postsToScan: 30,                // How many recent posts to evaluate
    scrollDelay: 1500,
    maxScrolls: 20,
    dryRun: false,
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms + ms * 0.1 * Math.random()));

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };

  (async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📌 PIN TWEET MANAGER' + ' '.repeat(W - 23) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    if (!pathMatch || ['home', 'explore', 'notifications', 'messages', 'i'].includes(pathMatch[1])) {
      console.error('❌ Go to your profile page first!');
      return;
    }
    const username = pathMatch[1];

    // ── Action: Unpin ───────────────────────────────────────

    if (CONFIG.action === 'unpin') {
      console.log('\n🔓 Looking for pinned tweet to unpin...');

      const pinnedArticle = document.querySelector('article[data-testid="tweet"]');
      const socialCtx = pinnedArticle?.querySelector('[data-testid="socialContext"]');
      if (!socialCtx || !/pinned/i.test(socialCtx.textContent)) {
        console.log('ℹ️ No pinned tweet found.');
        return;
      }

      if (CONFIG.dryRun) {
        const text = pinnedArticle.querySelector('[data-testid="tweetText"]')?.textContent || '';
        console.log(`🔍 [DRY] Would unpin: "${text.slice(0, 60)}..."`);
        return;
      }

      const caret = pinnedArticle.querySelector('[data-testid="caret"]');
      if (caret) {
        caret.click();
        await sleep(800);

        const menuItems = document.querySelectorAll('[role="menuitem"]');
        for (const item of menuItems) {
          if (/unpin/i.test(item.textContent)) {
            item.click();
            await sleep(800);
            const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (confirm) confirm.click();
            console.log('✅ Tweet unpinned!');
            return;
          }
        }
        document.body.click();
        console.warn('⚠️ Could not find Unpin option in menu.');
      }
      return;
    }

    // ── Action: Pin Specific URL ────────────────────────────

    if (CONFIG.action === 'pinUrl') {
      if (!CONFIG.tweetUrl) {
        console.error('❌ Set CONFIG.tweetUrl to the full tweet URL.');
        return;
      }

      console.log(`\n📌 Navigating to tweet: ${CONFIG.tweetUrl}`);
      window.location.href = CONFIG.tweetUrl;
      // User needs to re-run after navigation — or use this as guidance
      console.log('⏳ After the page loads, the tweet will be visible.');
      console.log('   Use the ⋯ menu → Pin to your profile.');
      return;
    }

    // ── Action: Pin Best Performing ─────────────────────────

    console.log(`\n📊 Scanning ${CONFIG.postsToScan} recent posts to find best by ${CONFIG.metric}...`);

    const posts = new Map();
    let retries = 0;

    for (let i = 0; i < CONFIG.maxScrolls && posts.size < CONFIG.postsToScan; i++) {
      const prevSize = posts.size;

      document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
        const authorLink = article.querySelector(`a[href="/${username}" i]`);
        if (!authorLink) return;

        const timeLink = article.querySelector('a[href*="/status/"] time')?.closest('a');
        const tweetUrl = timeLink?.getAttribute('href') || '';
        const tweetId = tweetUrl.split('/status/')[1]?.split(/[?/]/)[0];
        if (!tweetId || posts.has(tweetId)) return;

        const text = article.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const likeBtn = article.querySelector('[data-testid="like"], [data-testid="unlike"]');
        const rtBtn = article.querySelector('[data-testid="retweet"], [data-testid="unretweet"]');
        const replyBtn = article.querySelector('[data-testid="reply"]');
        const viewsEl = article.querySelector('a[href*="/analytics"]');

        const likes = parseCount(likeBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');
        const retweets = parseCount(rtBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');
        const replies = parseCount(replyBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');
        const views = parseCount(viewsEl?.textContent || '0');

        const isPinned = !!article.querySelector('[data-testid="socialContext"]')?.textContent?.match(/pinned/i);

        posts.set(tweetId, {
          tweetId, text, likes, retweets, replies, views, tweetUrl, isPinned,
          engagement: likes + retweets + replies,
          article, // Keep DOM reference
        });
      });

      if (posts.size === prevSize) { retries++; if (retries >= 3) break; }
      else retries = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const postsArray = [...posts.values()];
    if (postsArray.length === 0) {
      console.error('❌ No posts found.');
      return;
    }

    // Sort by chosen metric
    postsArray.sort((a, b) => b[CONFIG.metric] - a[CONFIG.metric]);
    const best = postsArray[0];

    console.log(`\n🏆 Best post by ${CONFIG.metric}:`);
    console.log(`   "${best.text.slice(0, 80)}..."`);
    console.log(`   ❤️ ${best.likes} | 🔄 ${best.retweets} | 💬 ${best.replies} | 👁️ ${best.views}`);
    console.log(`   ${best.tweetUrl ? 'https://x.com' + best.tweetUrl : ''}`);

    if (best.isPinned) {
      console.log('\n✅ This tweet is already pinned!');
      return;
    }

    if (CONFIG.dryRun) {
      console.log('\n🔍 [DRY RUN] Would pin this tweet.');
      // Show top 5
      console.log('\n📋 Top 5 candidates:');
      postsArray.slice(0, 5).forEach((p, i) => {
        console.log(`   ${i + 1}. ${CONFIG.metric}: ${p[CONFIG.metric]} — "${p.text.slice(0, 50)}..."`);
      });
      return;
    }

    // Scroll back to the best tweet and pin it
    console.log('\n📌 Pinning best tweet...');
    window.scrollTo(0, 0);
    await sleep(1000);

    // Re-find the article
    let targetArticle = null;
    for (let i = 0; i < 20; i++) {
      for (const article of document.querySelectorAll('article[data-testid="tweet"]')) {
        const link = article.querySelector('a[href*="/status/"]');
        if (link && link.getAttribute('href')?.includes(best.tweetId)) {
          targetArticle = article;
          break;
        }
      }
      if (targetArticle) break;
      window.scrollTo(0, document.body.scrollHeight * (i / 20));
      await sleep(800);
    }

    if (!targetArticle) {
      console.warn('⚠️ Could not re-find tweet in DOM. Navigate manually:');
      console.log(`   https://x.com${best.tweetUrl}`);
      return;
    }

    const caret = targetArticle.querySelector('[data-testid="caret"]');
    if (!caret) {
      console.warn('⚠️ Could not find menu button on tweet.');
      return;
    }

    caret.scrollIntoView({ block: 'center' });
    await sleep(300);
    caret.click();
    await sleep(800);

    const menuItems = document.querySelectorAll('[role="menuitem"]');
    for (const item of menuItems) {
      if (/pin/i.test(item.textContent) && !/unpin/i.test(item.textContent)) {
        item.click();
        await sleep(800);
        const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirm) {
          confirm.click();
          console.log('\n✅ Tweet pinned successfully!');
        }
        return;
      }
    }

    document.body.click();
    console.warn('⚠️ Could not find "Pin" option in menu.');
  })();
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `action` | `'pinBest',` | 'pinBest' | 'pinUrl' | 'unpin' |
| `tweetUrl` | `'',` | For 'pinUrl': full URL of tweet to pin |
| `metric` | `'likes',` | For 'pinBest': 'likes', 'retweets', 'engagement', 'views' |
| `postsToScan` | `30,` | How many recent posts to evaluate |
| `scrollDelay` | `1500` | Scroll delay |
| `maxScrolls` | `20` | Max scrolls |
| `dryRun` | `false` | Dry run |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/YOUR_USERNAME`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/pinTweetManager.js`](https://github.com/nirholas/XActions/blob/main/browser/pinTweetManager.js) and paste it into the console.

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
| [`browser/pinTweetManager.js`](https://github.com/nirholas/XActions/blob/main/browser/pinTweetManager.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Article Publisher](article-publisher.md) | Publish long-form articles on X/Twitter (requires Premium+ subscription) |
| [Content Calendar](content-calendar.md) | Plan and visualize your posting schedule |
| [Content Repurposer](content-repurposer.md) | Transform your existing content: turn single tweets into threads, threads into singles, add hooks, rewrite for different audiences |
| [Poll Creator](poll-creator.md) | Create and manage poll tweets |
| [Post Composer](post-composer.md) | Full content creation suite: compose tweets, threads, polls, and articles with templates and scheduling |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)

# 🔁 Quote Tweet Automation

Auto-retweet with quote-tweet templates. Add your commentary to trending content automatically.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Auto-retweet with quote-tweet templates. Add your commentary to trending content automatically.
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
3. Copy and paste the script from [`browser/quoteTweetAutomation.js`](https://github.com/nirholas/XActions/blob/main/browser/quoteTweetAutomation.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * 🔁 Quote Tweet Automation — Production Grade
 * ============================================================
 *
 * @name        quoteTweetAutomation.js
 * @description Auto-retweet with quote using customizable
 *              templates. Scrape tweets from a timeline/search
 *              and quote-RT them with personalized commentary.
 *              Supports keyword targeting, skip filters,
 *              template rotation, and human-like delays.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to a search result / user timeline / list
 * 2. Open DevTools Console (F12)
 * 3. Configure templates and filters below
 * 4. Paste and run
 *
 * ⚠️ Use responsibly — excessive quote tweeting will get you
 *     flagged. Keep maxQuotes low and delays high.
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxQuotes: 5,            // Keep low to avoid bans
    dryRun: true,            // Set false to actually post (BE CAREFUL)

    // Templates — {author} and {text} get replaced
    templates: [
      '💯 This is so underrated. Everyone needs to see this.',
      '📌 Saving this for later — great insight here.',
      '🔥 Couldn\'t agree more. Well said.',
    ],

    // Only quote tweets containing these keywords (empty = all)
    onlyKeywords: [],

    // Skip tweets containing these keywords
    skipKeywords: ['ad', 'promoted', 'giveaway', 'dm me'],

    // Skip already quote-tweeted (by checking if retweet button is active)
    skipRetweeted: true,

    // Minimum engagement to quote (0 = any)
    minEngagement: 0,

    // Delays (ms) — keep high to appear human
    delayBetween: [45000, 90000], // 45-90 seconds between quotes
    typeDelay: [50, 150],         // Per-character typing speed

    scrollRounds: 3,
    scrollDelay: 2000,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));

  const SEL = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    retweetBtn: '[data-testid="retweet"]',
    unretweetBtn: '[data-testid="unretweet"]',
    quoteOption: ['[data-testid="Dropdown-Item-Quote"]', '[role="menuitem"]'],
    tweetBox: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
  };

  const $ = (sel, ctx = document) => {
    if (Array.isArray(sel)) {
      for (const s of sel) { const el = ctx.querySelector(s); if (el) return el; }
      return null;
    }
    return ctx.querySelector(sel);
  };

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  let aborted = false;
  let paused = false;
  const results = [];

  window.XActions = window.XActions || {};
  window.XActions.pause = () => { paused = true; console.log('⏸️ Paused.'); };
  window.XActions.resume = () => { paused = false; console.log('▶️ Resumed.'); };
  window.XActions.abort = () => { aborted = true; console.log('🛑 Aborting...'); };

  const waitForUnpause = async () => {
    while (paused && !aborted) await sleep(500);
  };

  // ── Collect target tweets ──────────────────────────────────
  const collectTargets = async () => {
    const targets = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll(SEL.tweet);
      for (const article of articles) {
        // Get tweet text
        const textEl = $(SEL.tweetText, article);
        const text = textEl ? textEl.textContent.trim() : '';
        if (!text) continue;

        const fingerprint = text.slice(0, 80);
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);

        // Author
        const authorLink = article.querySelector('a[href^="/"][role="link"] span');
        const author = authorLink ? authorLink.textContent.trim() : 'unknown';

        // Engagement
        const likeBtn = article.querySelector('[data-testid="like"] span') || article.querySelector('[data-testid="unlike"] span');
        const rtBtn = article.querySelector('[data-testid="retweet"] span');
        const likes = likeBtn ? parseNum(likeBtn.textContent) : 0;
        const rts = rtBtn ? parseNum(rtBtn.textContent) : 0;
        const totalEng = likes + rts;

        // Skip filters
        const textLower = text.toLowerCase();
        if (CONFIG.skipKeywords.some(kw => textLower.includes(kw.toLowerCase()))) continue;
        if (CONFIG.onlyKeywords.length > 0 && !CONFIG.onlyKeywords.some(kw => textLower.includes(kw.toLowerCase()))) continue;
        if (totalEng < CONFIG.minEngagement) continue;

        // Skip already retweeted
        if (CONFIG.skipRetweeted && $(SEL.unretweetBtn, article)) continue;

        targets.push({ article, text, author, totalEng });
      }

      console.log(`   📜 Round ${round + 1}: ${targets.length} eligible tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return targets;
  };

  // ── Type text character by character ───────────────────────
  const typeText = async (element, text) => {
    element.focus();
    for (const char of text) {
      const inputEvent = new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: char,
        bubbles: true,
        cancelable: true,
      });
      element.dispatchEvent(inputEvent);

      // Also try direct textContent approach
      document.execCommand('insertText', false, char);
      await sleep(gaussian(CONFIG.typeDelay[0], CONFIG.typeDelay[1]));
    }
  };

  // ── Quote tweet a single article ───────────────────────────
  const quoteTweet = async (target, template) => {
    const { article, text, author } = target;

    // Scroll into view
    article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(1000);

    // Click retweet button to open menu
    const rtBtn = $(SEL.retweetBtn, article);
    if (!rtBtn) {
      console.log('   ⚠️ Retweet button not found, skipping.');
      return false;
    }

    rtBtn.click();
    await sleep(800);

    // Click "Quote" option
    let quoteOpt = null;
    for (const sel of SEL.quoteOption) {
      const opts = document.querySelectorAll(sel);
      for (const opt of opts) {
        if ((opt.textContent || '').toLowerCase().includes('quote')) {
          quoteOpt = opt;
          break;
        }
      }
      if (quoteOpt) break;
    }

    if (!quoteOpt) {
      console.log('   ⚠️ "Quote" option not found in menu. Closing...');
      document.body.click(); // Close menu
      await sleep(300);
      return false;
    }

    quoteOpt.click();
    await sleep(1500);

    // Fill in the quote text
    const tweetBox = $(SEL.tweetBox);
    if (!tweetBox) {
      console.log('   ⚠️ Tweet compose box not found.');
      return false;
    }

    // Replace placeholders
    let quoteText = template
      .replace('{author}', author)
      .replace('{text}', text.slice(0, 50));

    console.log(`   📝 Typing: "${quoteText.slice(0, 60)}..."`);
    await typeText(tweetBox, quoteText);
    await sleep(800);

    // Click tweet button
    if (CONFIG.dryRun) {
      console.log('   🏃 DRY RUN — would post now. Closing dialog...');
      // Close the compose dialog
      const closeBtn = document.querySelector('[data-testid="app-bar-close"]') || document.querySelector('[aria-label="Close"]');
      if (closeBtn) closeBtn.click();
      await sleep(500);
      // Discard draft if prompted
      const discardBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (discardBtn) { discardBtn.click(); await sleep(300); }
      return true;
    }

    const tweetBtn = $(SEL.tweetButton);
    if (!tweetBtn) {
      console.log('   ⚠️ Tweet button not found.');
      return false;
    }

    tweetBtn.click();
    await sleep(2000);
    return true;
  };

  // ── Main ───────────────────────────────────────────────────
  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🔁 QUOTE TWEET AUTOMATION' + ' '.repeat(W - 28) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('\n🏃 DRY RUN mode — no tweets will be posted.');
      console.log('   Set CONFIG.dryRun = false to post for real.\n');
    } else {
      console.log('\n⚠️  LIVE MODE — tweets will actually be posted!');
      console.log('   Use XActions.abort() to stop at any time.\n');
    }

    console.log('🔍 Collecting target tweets...\n');
    const targets = await collectTargets();

    if (targets.length === 0) {
      console.error('❌ No eligible tweets found. Adjust filters or scroll more.');
      return;
    }

    const toProcess = targets.slice(0, CONFIG.maxQuotes);
    console.log(`\n📊 Found ${targets.length} eligible. Processing ${toProcess.length}.\n`);

    let success = 0, fail = 0;

    for (let i = 0; i < toProcess.length; i++) {
      if (aborted) break;
      await waitForUnpause();

      const target = toProcess[i];
      const template = CONFIG.templates[i % CONFIG.templates.length];

      console.log(`\n[${i + 1}/${toProcess.length}] 🔁 Quote-tweeting "${target.text.slice(0, 50)}..." (by ${target.author})`);

      const ok = await quoteTweet(target, template);

      if (ok) {
        success++;
        results.push({
          author: target.author,
          text: target.text.slice(0, 100),
          template,
          engagement: target.totalEng,
          quotedAt: new Date().toISOString(),
        });
      } else {
        fail++;
      }

      if (i < toProcess.length - 1 && !aborted) {
        const delay = gaussian(CONFIG.delayBetween[0], CONFIG.delayBetween[1]);
        console.log(`   ⏳ Waiting ${(delay / 1000).toFixed(0)}s before next...`);
        await sleep(delay);
      }
    }

    // ── Summary ──────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ✅ Quoted: ${success} | ❌ Failed: ${fail}`);
    if (CONFIG.dryRun) console.log('  🏃 (Dry run — nothing was posted)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (results.length > 0) {
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-quote-tweets-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Results exported.');
    }
  };

  run();
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `maxQuotes` | `5,` | Keep low to avoid bans |
| `dryRun` | `true,` | Set false to actually post (BE CAREFUL) |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/search or timeline`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/quoteTweetAutomation.js`](https://github.com/nirholas/XActions/blob/main/browser/quoteTweetAutomation.js) and paste it into the console.

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
| [`browser/quoteTweetAutomation.js`](https://github.com/nirholas/XActions/blob/main/browser/quoteTweetAutomation.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Auto-Plug Replies](auto-plug-replies.md) | Automatically reply to viral tweets with your own content plug or CTA |
| [Auto-Reply](auto-reply.md) | Auto-reply to tweets matching your filters |
| [Engagement Booster](engagement-booster.md) | Systematically engage with target accounts by liking, bookmarking, and retweeting their content to build relationships |
| [Engagement Manager](engagement-manager.md) | All-in-one engagement toolkit: like, unlike, reply, bookmark, and manage interactions from a single interface |
| [Welcome New Followers](welcome-new-followers.md) | Auto-send welcome DMs to new followers |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)

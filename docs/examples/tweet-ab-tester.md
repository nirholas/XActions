# 🧪 Tweet A/B Tester

A/B test tweet variations and track which performs best. Compare engagement rates across different wording, hashtags, and posting times.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- A/B test tweet variations and track which performs best. Compare engagement rates across different wording, hashtags, and posting times.
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
3. Copy and paste the script from [`browser/tweetABTester.js`](https://github.com/nirholas/XActions/blob/main/browser/tweetABTester.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * 🧪 Tweet A/B Tester — Production Grade
 * ============================================================
 *
 * @name        tweetABTester.js
 * @description A/B test tweet performance. Post two variations
 *              of a tweet, track their engagement over time,
 *              and determine a statistical winner. Persists
 *              test data in localStorage. Supports multiple
 *              concurrent tests with unique IDs.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Open x.com in DevTools Console
 * 2. Paste this script
 * 3. Use the interactive API:
 *
 *   XActions.createTest({
 *     name: 'CTA test',
 *     variantA: 'Check out our new tool! 🔥',
 *     variantB: 'We just launched something amazing → link',
 *   })
 *
 *   XActions.measure('CTA test')  // Measure after both are posted
 *   XActions.results('CTA test')  // View results
 *   XActions.listTests()          // List all tests
 *   XActions.deleteTest('CTA test')
 * ============================================================
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'xactions_ab_tests';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const loadTests = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  };

  const saveTests = (tests) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
  };

  window.XActions = window.XActions || {};

  // ── Create A/B test ────────────────────────────────────────
  window.XActions.createTest = (opts) => {
    if (!opts || !opts.name || !opts.variantA || !opts.variantB) {
      console.log('❌ Usage: XActions.createTest({ name: "test", variantA: "text A", variantB: "text B" })');
      return;
    }

    const tests = loadTests();
    if (tests[opts.name]) {
      console.log(`⚠️ Test "${opts.name}" already exists. Use deleteTest() first to recreate.`);
      return;
    }

    tests[opts.name] = {
      name: opts.name,
      variantA: { text: opts.variantA, tweetUrl: null, metrics: [], posted: false },
      variantB: { text: opts.variantB, tweetUrl: null, metrics: [], posted: false },
      createdAt: new Date().toISOString(),
      winner: null,
      status: 'created',
    };
    saveTests(tests);

    const W = 58;
    console.log('\n╔' + '═'.repeat(W) + '╗');
    console.log(`║  🧪 A/B TEST: "${opts.name}"`.padEnd(W + 1) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`\n  📝 Variant A: "${opts.variantA.slice(0, 70)}..."`);
    console.log(`  📝 Variant B: "${opts.variantB.slice(0, 70)}..."`);
    console.log('\n  📋 Next steps:');
    console.log('  1. Post Variant A as a tweet');
    console.log('  2. Post Variant B at the same time of day (next day ideally)');
    console.log(`  3. Run: XActions.setUrl("${opts.name}", "A", "https://x.com/you/status/123")`);
    console.log(`  4. Run: XActions.setUrl("${opts.name}", "B", "https://x.com/you/status/456")`);
    console.log(`  5. Wait 24-48h, then: XActions.measure("${opts.name}")`);
    console.log(`  6. View: XActions.results("${opts.name}")`);
  };

  // ── Set tweet URL for a variant ────────────────────────────
  window.XActions.setUrl = (testName, variant, url) => {
    const tests = loadTests();
    if (!tests[testName]) { console.log(`❌ Test "${testName}" not found.`); return; }
    if (variant !== 'A' && variant !== 'B') { console.log('❌ Variant must be "A" or "B".'); return; }

    const key = variant === 'A' ? 'variantA' : 'variantB';
    tests[testName][key].tweetUrl = url;
    tests[testName][key].posted = true;
    tests[testName].status = 'running';
    saveTests(tests);

    console.log(`✅ Variant ${variant} URL set for "${testName}".`);

    if (tests[testName].variantA.posted && tests[testName].variantB.posted) {
      console.log(`🎯 Both variants posted! Wait 24-48h then run: XActions.measure("${testName}")`);
    }
  };

  // ── Measure engagement from tweet page ─────────────────────
  const measureTweet = async (url) => {
    const origUrl = window.location.href;

    window.location.href = url;
    await sleep(4000);

    const article = document.querySelector('article[data-testid="tweet"]');
    if (!article) {
      console.log('  ⚠️ Could not load tweet. Returning...');
      window.location.href = origUrl;
      await sleep(2000);
      return null;
    }

    const likeBtn = article.querySelector('[data-testid="like"] span') || article.querySelector('[data-testid="unlike"] span');
    const rtBtn = article.querySelector('[data-testid="retweet"] span') || article.querySelector('[data-testid="unretweet"] span');
    const replyBtn = article.querySelector('[data-testid="reply"] span');
    const viewEl = article.querySelector('a[href*="/analytics"] span');

    const metrics = {
      likes: likeBtn ? parseNum(likeBtn.textContent) : 0,
      retweets: rtBtn ? parseNum(rtBtn.textContent) : 0,
      replies: replyBtn ? parseNum(replyBtn.textContent) : 0,
      views: viewEl ? parseNum(viewEl.textContent) : 0,
      measuredAt: new Date().toISOString(),
    };

    metrics.totalEngagement = metrics.likes + metrics.retweets + metrics.replies;
    metrics.engagementRate = metrics.views > 0 ? (metrics.totalEngagement / metrics.views * 100) : 0;

    window.location.href = origUrl;
    await sleep(2000);
    return metrics;
  };

  window.XActions.measure = async (testName) => {
    const tests = loadTests();
    if (!tests[testName]) { console.log(`❌ Test "${testName}" not found.`); return; }

    const test = tests[testName];
    if (!test.variantA.tweetUrl || !test.variantB.tweetUrl) {
      console.log('❌ Both variants need URLs. Use XActions.setUrl() first.');
      return;
    }

    console.log(`\n⏳ Measuring Variant A...`);
    const metricsA = await measureTweet(test.variantA.tweetUrl);
    if (metricsA) {
      test.variantA.metrics.push(metricsA);
      console.log(`  ✅ A: ${metricsA.likes} likes, ${metricsA.retweets} RTs, ${metricsA.replies} replies, ${metricsA.views} views`);
    }

    await sleep(2000);

    console.log(`⏳ Measuring Variant B...`);
    const metricsB = await measureTweet(test.variantB.tweetUrl);
    if (metricsB) {
      test.variantB.metrics.push(metricsB);
      console.log(`  ✅ B: ${metricsB.likes} likes, ${metricsB.retweets} RTs, ${metricsB.replies} replies, ${metricsB.views} views`);
    }

    // Determine winner
    if (metricsA && metricsB) {
      const scoreA = metricsA.engagementRate || (metricsA.totalEngagement / Math.max(metricsA.views, 1));
      const scoreB = metricsB.engagementRate || (metricsB.totalEngagement / Math.max(metricsB.views, 1));

      const diff = Math.abs(scoreA - scoreB);
      const avg = (scoreA + scoreB) / 2;
      const pctDiff = avg > 0 ? (diff / avg * 100) : 0;

      if (pctDiff < 5) {
        test.winner = 'inconclusive';
        console.log('\n🤷 Result: INCONCLUSIVE (< 5% difference). Measure again later.');
      } else if (scoreA > scoreB) {
        test.winner = 'A';
        console.log(`\n🏆 WINNER: Variant A (+${pctDiff.toFixed(1)}% better engagement rate)`);
      } else {
        test.winner = 'B';
        console.log(`\n🏆 WINNER: Variant B (+${pctDiff.toFixed(1)}% better engagement rate)`);
      }
    }

    saveTests(tests);
    console.log(`\n💾 Measurement saved. Run XActions.results("${testName}") for details.`);
  };

  // ── View results ───────────────────────────────────────────
  window.XActions.results = (testName) => {
    const tests = loadTests();
    if (!tests[testName]) { console.log(`❌ Test "${testName}" not found.`); return; }

    const test = tests[testName];
    const W = 58;
    console.log('\n╔' + '═'.repeat(W) + '╗');
    console.log(`║  🧪 A/B TEST RESULTS: "${testName}"`.padEnd(W + 1) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log(`\n  Status: ${test.status} | Winner: ${test.winner || 'pending'}`);
    console.log(`  Created: ${test.createdAt}`);

    for (const variant of ['variantA', 'variantB']) {
      const v = test[variant];
      const label = variant === 'variantA' ? 'A' : 'B';
      const isWinner = test.winner === label;

      console.log(`\n  ┌─ Variant ${label} ${isWinner ? '🏆 WINNER' : ''} ${'─'.repeat(40)}`);
      console.log(`  │ Text: "${v.text.slice(0, 70)}${v.text.length > 70 ? '...' : ''}"`);
      console.log(`  │ URL: ${v.tweetUrl || 'not set'}`);

      if (v.metrics.length > 0) {
        const latest = v.metrics[v.metrics.length - 1];
        console.log(`  │ Latest: ❤️${latest.likes} 🔁${latest.retweets} 💬${latest.replies} 👁️${latest.views}`);
        console.log(`  │ Engagement rate: ${latest.engagementRate.toFixed(2)}%`);
        console.log(`  │ Measurements: ${v.metrics.length}`);

        if (v.metrics.length > 1) {
          const first = v.metrics[0];
          const growth = latest.totalEngagement - first.totalEngagement;
          console.log(`  │ Growth since first measurement: +${growth} engagement`);
        }
      } else {
        console.log('  │ No measurements yet.');
      }
      console.log('  └' + '─'.repeat(W));
    }

    // Side-by-side comparison
    if (test.variantA.metrics.length > 0 && test.variantB.metrics.length > 0) {
      const a = test.variantA.metrics[test.variantA.metrics.length - 1];
      const b = test.variantB.metrics[test.variantB.metrics.length - 1];

      console.log('\n  ┌─ HEAD-TO-HEAD ──────────────────────');
      console.log(`  │ ${'Metric'.padEnd(18)} ${'Variant A'.padEnd(12)} ${'Variant B'.padEnd(12)} Winner`);
      console.log('  │' + '─'.repeat(55));

      const compare = (label, valA, valB) => {
        const w = valA > valB ? 'A 🏆' : valB > valA ? 'B 🏆' : 'Tie';
        console.log(`  │ ${label.padEnd(18)} ${String(valA).padEnd(12)} ${String(valB).padEnd(12)} ${w}`);
      };

      compare('Likes', a.likes, b.likes);
      compare('Retweets', a.retweets, b.retweets);
      compare('Replies', a.replies, b.replies);
      compare('Views', a.views, b.views);
      compare('Eng. Rate %', a.engagementRate.toFixed(2), b.engagementRate.toFixed(2));
      console.log('  └' + '─'.repeat(55));
    }
  };

  // ── List all tests ─────────────────────────────────────────
  window.XActions.listTests = () => {
    const tests = loadTests();
    const names = Object.keys(tests);
    if (names.length === 0) { console.log('📭 No tests. Use XActions.createTest() to start.'); return; }

    console.log(`\n📋 A/B TESTS (${names.length}):\n`);
    for (const name of names) {
      const t = tests[name];
      const measurements = t.variantA.metrics.length + t.variantB.metrics.length;
      const status = t.winner ? `Winner: ${t.winner}` : t.status;
      console.log(`  🧪 "${name}" — ${status} (${measurements} measurements)`);
    }
  };

  // ── Delete test ────────────────────────────────────────────
  window.XActions.deleteTest = (testName) => {
    const tests = loadTests();
    if (!tests[testName]) { console.log(`❌ Test "${testName}" not found.`); return; }
    delete tests[testName];
    saveTests(tests);
    console.log(`🗑️ Test "${testName}" deleted.`);
  };

  // ── Export all test data ───────────────────────────────────
  window.XActions.exportTests = () => {
    const tests = loadTests();
    const blob = new Blob([JSON.stringify(tests, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `xactions-ab-tests-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    console.log('📥 All test data exported.');
  };

  // ── Init ───────────────────────────────────────────────────
  const W = 60;
  console.log('╔' + '═'.repeat(W) + '╗');
  console.log('║  🧪 TWEET A/B TESTER' + ' '.repeat(W - 22) + '║');
  console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
  console.log('╚' + '═'.repeat(W) + '╝');
  console.log('\n📋 Commands:');
  console.log('  XActions.createTest({ name, variantA, variantB })');
  console.log('  XActions.setUrl(testName, "A"|"B", tweetUrl)');
  console.log('  XActions.measure(testName)   // Navigate & measure');
  console.log('  XActions.results(testName)   // View head-to-head');
  console.log('  XActions.listTests()');
  console.log('  XActions.deleteTest(testName)');
  console.log('  XActions.exportTests()');

  const tests = loadTests();
  const count = Object.keys(tests).length;
  if (count > 0) console.log(`\n📊 ${count} existing test(s) loaded from localStorage.`);

})();

```

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/YOUR_USERNAME`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/tweetABTester.js`](https://github.com/nirholas/XActions/blob/main/browser/tweetABTester.js) and paste it into the console.

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
| [`browser/tweetABTester.js`](https://github.com/nirholas/XActions/blob/main/browser/tweetABTester.js) | Main script |

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

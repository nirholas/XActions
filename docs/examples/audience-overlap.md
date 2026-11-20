# 🔗 Audience Overlap

Compare the follower lists of two accounts to find audience overlap. Useful for finding collab partners and competitor analysis.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Compare the follower lists of two accounts to find audience overlap. Useful for finding collab partners and competitor analysis.
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
1. Go to `x.com (any profile)`
2. Open browser console (`F12` → Console tab)
3. Copy and paste the script from [`browser/audienceOverlap.js`](https://github.com/nirholas/XActions/blob/main/browser/audienceOverlap.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * 🔀 Audience Overlap Analyzer — Production Grade
 * ============================================================
 *
 * @name        audienceOverlap.js
 * @description Compare the follower lists of two X/Twitter
 *              accounts to find shared followers, unique-to-each
 *              audiences, and overlap percentage. Useful for
 *              identifying collaboration opportunities, competitor
 *              analysis, and audience expansion targets.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: x.com/ACCOUNT_A/followers
 * 2. Paste script — it will scrape Account A's followers
 * 3. Run: XActions.switchTo('ACCOUNT_B')
 *    → navigates to Account B's followers and scrapes
 * 4. Run: XActions.compare() → see overlap analysis
 *
 * Or use the quick method:
 *   XActions.analyze('accountA', 'accountB')
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    scrollRounds: 8,
    scrollDelay: 2000,
    maxFollowers: 300,   // Per account (browser limitation)
    exportResults: true,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const datasets = { a: null, b: null };

  // ── Scrape visible followers ───────────────────────────────
  const scrapeFollowers = async (label) => {
    const followers = new Map();

    for (let round = 0; round < CONFIG.scrollRounds && followers.size < CONFIG.maxFollowers; round++) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');

      for (const cell of cells) {
        if (followers.size >= CONFIG.maxFollowers) break;

        const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
        if (!link) continue;
        const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
        if (!match || ['home', 'explore', 'notifications', 'messages', 'i'].includes(match[1])) continue;

        const username = match[1].toLowerCase();
        if (followers.has(username)) continue;

        const nameSpans = cell.querySelectorAll('a[href^="/"] span');
        const displayName = nameSpans.length > 0 ? nameSpans[0].textContent.trim() : match[1];

        const verified = !!cell.querySelector('[data-testid="icon-verified"]') || !!cell.querySelector('svg[aria-label="Verified"]');

        // Bio snippet
        const textEls = cell.querySelectorAll('[dir="auto"]');
        let bio = '';
        for (const el of textEls) {
          const text = el.textContent.trim();
          if (text.length > 20 && !text.startsWith('@')) { bio = text.slice(0, 150); break; }
        }

        followers.set(username, { username: match[1], displayName, verified, bio });
      }

      console.log(`   📜 ${label} — Round ${round + 1}: ${followers.size} followers`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return followers;
  };

  // ── Compare two datasets ───────────────────────────────────
  const compareDatasets = () => {
    if (!datasets.a || !datasets.b) {
      console.log('❌ Need both datasets. Use XActions.analyze("accountA", "accountB") or scrape each individually.');
      return;
    }

    const aSet = new Set(datasets.a.followers.keys());
    const bSet = new Set(datasets.b.followers.keys());

    const shared = [...aSet].filter(u => bSet.has(u));
    const onlyA = [...aSet].filter(u => !bSet.has(u));
    const onlyB = [...bSet].filter(u => !aSet.has(u));
    const union = new Set([...aSet, ...bSet]);

    const overlapPct = ((shared.length / union.size) * 100).toFixed(1);
    const overlapOfA = ((shared.length / aSet.size) * 100).toFixed(1);
    const overlapOfB = ((shared.length / bSet.size) * 100).toFixed(1);

    const W = 60;
    console.log('\n╔' + '═'.repeat(W) + '╗');
    console.log('║  🔀 AUDIENCE OVERLAP ANALYSIS' + ' '.repeat(W - 31) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 OVERVIEW');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Account A: @${datasets.a.account} (${aSet.size} followers scraped)`);
    console.log(`  Account B: @${datasets.b.account} (${bSet.size} followers scraped)`);
    console.log(`  Shared followers:    ${shared.length}`);
    console.log(`  Only in A:           ${onlyA.length}`);
    console.log(`  Only in B:           ${onlyB.length}`);
    console.log(`  Total unique:        ${union.size}`);

    // Venn diagram (ASCII)
    console.log('\n  ┌─ VENN DIAGRAM ────────────────────────────────┐');
    const aBarLen = Math.round((onlyA.length / union.size) * 30);
    const sharedBarLen = Math.round((shared.length / union.size) * 30);
    const bBarLen = Math.round((onlyB.length / union.size) * 30);
    console.log(`  │ A only  ${'░'.repeat(aBarLen)}${'█'.repeat(sharedBarLen)}${'▒'.repeat(bBarLen)}  B only │`);
    console.log(`  │ ${onlyA.length}${' '.repeat(Math.max(0, 7 - String(onlyA.length).length))}` +
                `${'░ A only'.padEnd(aBarLen + 9)}` +
                `${'█ shared '.padEnd(sharedBarLen + 9)}` +
                `${'▒ B only'.padEnd(bBarLen + 9).slice(0, bBarLen + 9)}│`);
    console.log('  └─────────────────────────────────────────────────┘');

    // Overlap percentages
    console.log('\n━━━ 📊 OVERLAP METRICS ━━━');
    console.log(`  Jaccard similarity:       ${overlapPct}% (shared / union)`);
    console.log(`  Overlap % of A's base:    ${overlapOfA}%`);
    console.log(`  Overlap % of B's base:    ${overlapOfB}%`);

    // ── Shared followers detail ─────────────────────────────
    if (shared.length > 0) {
      console.log(`\n━━━ 👥 SHARED FOLLOWERS (${shared.length}) ━━━`);
      const sharedDetails = shared.map(u => {
        const aData = datasets.a.followers.get(u);
        return { username: aData.username, displayName: aData.displayName, verified: aData.verified };
      });
      const verifiedShared = sharedDetails.filter(s => s.verified);
      if (verifiedShared.length > 0) {
        console.log(`  ✅ Verified shared followers (${verifiedShared.length}):`);
        for (const v of verifiedShared.slice(0, 10)) {
          console.log(`     ✅ @${v.username} (${v.displayName})`);
        }
      }
      console.log(`  All shared: ${sharedDetails.slice(0, 15).map(s => '@' + s.username).join(', ')}${shared.length > 15 ? '...' : ''}`);
    }

    // ── Unique to each ──────────────────────────────────────
    console.log(`\n━━━ 🅰️ UNIQUE TO @${datasets.a.account} (${onlyA.length}) ━━━`);
    console.log(`  ${onlyA.slice(0, 15).map(u => '@' + (datasets.a.followers.get(u)?.username || u)).join(', ')}${onlyA.length > 15 ? '...' : ''}`);

    console.log(`\n━━━ 🅱️ UNIQUE TO @${datasets.b.account} (${onlyB.length}) ━━━`);
    console.log(`  ${onlyB.slice(0, 15).map(u => '@' + (datasets.b.followers.get(u)?.username || u)).join(', ')}${onlyB.length > 15 ? '...' : ''}`);

    // ── Insights ────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  💡 INSIGHTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (parseFloat(overlapPct) > 50) {
      console.log('  🤝 HIGH OVERLAP: These accounts share most of their audience.');
      console.log('     → Great collaboration partners (co-threads, spaces).');
      console.log('     → Content differentiation is key to avoid redundancy.');
    } else if (parseFloat(overlapPct) > 20) {
      console.log('  📊 MODERATE OVERLAP: Decent shared audience.');
      console.log('     → Cross-promotion would reach new audiences for both.');
      console.log('     → Mutual engagement would be noticed by shared followers.');
    } else {
      console.log('  🔀 LOW OVERLAP: Very different audiences.');
      console.log('     → Great opportunity for cross-pollination!');
      console.log('     → Guest content/collabs would expose each to new audiences.');
    }

    if (onlyB.length > onlyA.length * 2) {
      console.log(`  🎯 @${datasets.b.account} has ${onlyB.length} followers you don't reach.`);
      console.log('     → Consider engaging with their content to attract their audience.');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Export
    if (CONFIG.exportResults) {
      const data = {
        accountA: { account: datasets.a.account, followerCount: aSet.size },
        accountB: { account: datasets.b.account, followerCount: bSet.size },
        overlap: {
          shared: shared.length,
          onlyA: onlyA.length,
          onlyB: onlyB.length,
          jaccardPct: parseFloat(overlapPct),
          overlapOfA: parseFloat(overlapOfA),
          overlapOfB: parseFloat(overlapOfB),
        },
        sharedFollowers: shared.map(u => datasets.a.followers.get(u)?.username || u),
        uniqueToA: onlyA.slice(0, 100).map(u => datasets.a.followers.get(u)?.username || u),
        uniqueToB: onlyB.slice(0, 100).map(u => datasets.b.followers.get(u)?.username || u),
        analyzedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-overlap-${datasets.a.account}-vs-${datasets.b.account}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Overlap analysis exported.');
    }
  };

  // ── Controls ───────────────────────────────────────────────
  window.XActions = window.XActions || {};

  window.XActions.analyze = async (accountA, accountB) => {
    if (!accountA || !accountB) {
      console.log('❌ Usage: XActions.analyze("accountA", "accountB")');
      return;
    }

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  🔀 AUDIENCE OVERLAP ANALYZER                 ║');
    console.log('╚════════════════════════════════════════════════╝');

    // Scrape A
    console.log(`\n📊 Step 1: Scraping @${accountA}'s followers...\n`);
    window.location.href = `https://x.com/${accountA}/followers`;
    await sleep(4000);
    datasets.a = { account: accountA, followers: await scrapeFollowers('A') };
    console.log(`  ✅ @${accountA}: ${datasets.a.followers.size} followers scraped.\n`);

    // Scrape B
    console.log(`📊 Step 2: Scraping @${accountB}'s followers...\n`);
    window.location.href = `https://x.com/${accountB}/followers`;
    await sleep(4000);
    datasets.b = { account: accountB, followers: await scrapeFollowers('B') };
    console.log(`  ✅ @${accountB}: ${datasets.b.followers.size} followers scraped.\n`);

    // Compare
    console.log('📊 Step 3: Comparing...\n');
    compareDatasets();
  };

  window.XActions.scrapeHere = async (label) => {
    if (label !== 'a' && label !== 'b') {
      console.log('❌ Usage: XActions.scrapeHere("a") or XActions.scrapeHere("b")');
      return;
    }
    const match = window.location.href.match(/x\.com\/([A-Za-z0-9_]+)\/followers/);
    const account = match ? match[1] : 'unknown';
    console.log(`📊 Scraping ${label.toUpperCase()} (@${account})...\n`);
    datasets[label] = { account, followers: await scrapeFollowers(label.toUpperCase()) };
    console.log(`  ✅ @${account}: ${datasets[label].followers.size} followers scraped.`);
    if (datasets.a && datasets.b) {
      console.log('  Both datasets ready! Run: XActions.compare()');
    }
  };

  window.XActions.compare = compareDatasets;

  // ── Init ───────────────────────────────────────────────────
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║  🔀 AUDIENCE OVERLAP ANALYZER — Ready             ║');
  console.log('║  by nichxbt — v1.0                                ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('\n📋 Quick method:');
  console.log('  XActions.analyze("accountA", "accountB")');
  console.log('\n📋 Manual method:');
  console.log('  1. Go to x.com/accountA/followers → XActions.scrapeHere("a")');
  console.log('  2. Go to x.com/accountB/followers → XActions.scrapeHere("b")');
  console.log('  3. XActions.compare()');
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `scrollRounds` | `8` | Scroll rounds |
| `scrollDelay` | `2000` | Scroll delay |
| `maxFollowers` | `300,` | Per account (browser limitation) |
| `exportResults` | `true` | Export results |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com (any profile)`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/audienceOverlap.js`](https://github.com/nirholas/XActions/blob/main/browser/audienceOverlap.js) and paste it into the console.

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
| [`browser/audienceOverlap.js`](https://github.com/nirholas/XActions/blob/main/browser/audienceOverlap.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Account Health Monitor](account-health-monitor.md) | Comprehensive health check for your X/Twitter account |
| [Audience Demographics](audience-demographics.md) | Analyze your follower demographics including bio keywords, locations, account age, and interests |
| [Engagement Leaderboard](engagement-leaderboard.md) | Analyze who engages most with your tweets |
| [Follower Growth Tracker](follower-growth-tracker.md) | Track your follower count over time |
| [Sentiment Analyzer](sentiment-analyzer.md) | Analyze tweet sentiment (positive/negative/neutral) using lexicon-based scoring |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)

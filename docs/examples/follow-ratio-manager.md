# ⚖️ Follow Ratio Manager

Monitor and optimize your follower/following ratio. Suggests accounts to unfollow to maintain a healthy ratio.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Monitor and optimize your follower/following ratio. Suggests accounts to unfollow to maintain a healthy ratio.
- Automate repetitive growth tasks on X/Twitter
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
3. Copy and paste the script from [`browser/followRatioManager.js`](https://github.com/nirholas/XActions/blob/main/browser/followRatioManager.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * ⚖️ Follow Ratio Manager — Production Grade
 * ============================================================
 *
 * @name        followRatioManager.js
 * @description Monitor and manage your follow/following ratio.
 *              Scrapes follower and following counts, calculates
 *              your ratio, tracks it over time in localStorage,
 *              identifies who to unfollow to improve your ratio,
 *              and provides actionable recommendations.
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
 * 3. Paste and run
 *
 * Controls:
 *   XActions.setTarget(2.0)        — target ratio (followers/following)
 *   XActions.track()               — take a ratio snapshot
 *   XActions.history()             — view ratio over time
 *   XActions.plan()                — get a plan to reach target
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    targetRatio: 2.0,         // Target followers/following ratio
    scrollRoundsFollowing: 5, // Scroll rounds for following list analysis
    scrollDelay: 2000,
    exportResults: true,
  };

  const STORAGE_KEY = 'xactions_ratio_history';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const loadHistory = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };

  const saveHistory = (history) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  };

  // ── Scrape current stats from profile page ─────────────────
  const scrapeStats = () => {
    // Look for follower/following counts in profile header
    const links = document.querySelectorAll('a[href$="/followers"], a[href$="/following"], a[href$="/verified_followers"]');
    let followers = 0;
    let following = 0;

    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const num = parseNum(link.textContent);

      if (href.endsWith('/followers') || href.endsWith('/verified_followers')) {
        if (num > followers) followers = num; // Take the larger value
      } else if (href.endsWith('/following')) {
        following = num;
      }
    }

    // Fallback: look for aria-labels or spans near "Followers"/"Following"
    if (followers === 0 || following === 0) {
      const spans = document.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent.trim();
        if (text === 'Followers') {
          const parent = span.closest('a') || span.parentElement;
          const numEl = parent?.querySelector('span');
          if (numEl) followers = parseNum(numEl.textContent) || followers;
        }
        if (text === 'Following') {
          const parent = span.closest('a') || span.parentElement;
          const numEl = parent?.querySelector('span');
          if (numEl) following = parseNum(numEl.textContent) || following;
        }
      }
    }

    return { followers, following };
  };

  // ── Ratio assessment ───────────────────────────────────────
  const assessRatio = (ratio) => {
    if (ratio >= 10) return { grade: 'S', label: 'ELITE', emoji: '👑', desc: 'Incredibly strong. You\'re a major account.' };
    if (ratio >= 5) return { grade: 'A+', label: 'EXCELLENT', emoji: '🌟', desc: 'Top-tier creator status.' };
    if (ratio >= 3) return { grade: 'A', label: 'GREAT', emoji: '🔥', desc: 'Strong authority signal.' };
    if (ratio >= 2) return { grade: 'B+', label: 'GOOD', emoji: '✅', desc: 'Healthy ratio. You\'re on the right track.' };
    if (ratio >= 1.5) return { grade: 'B', label: 'DECENT', emoji: '👍', desc: 'Above average but room to grow.' };
    if (ratio >= 1) return { grade: 'C', label: 'BALANCED', emoji: '⚖️', desc: 'Even ratio. Consider selective unfollowing.' };
    if (ratio >= 0.5) return { grade: 'D', label: 'LOW', emoji: '⚠️', desc: 'Following more than your followers. Unfollow inactive accounts.' };
    return { grade: 'F', label: 'POOR', emoji: '🚨', desc: 'Very unbalanced. Aggressive cleanup needed.' };
  };

  // ── Main analysis ──────────────────────────────────────────
  const analyze = () => {
    const stats = scrapeStats();

    if (stats.followers === 0 && stats.following === 0) {
      console.error('❌ Could not read follower/following counts. Make sure you\'re on your profile page.');
      return null;
    }

    const ratio = stats.following > 0 ? (stats.followers / stats.following) : Infinity;
    const assessment = assessRatio(ratio);

    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  ⚖️  FOLLOW RATIO MANAGER' + ' '.repeat(W - 27) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 CURRENT STATUS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  Followers:  ${stats.followers.toLocaleString()}`);
    console.log(`  Following:  ${stats.following.toLocaleString()}`);
    console.log(`  Ratio:      ${ratio.toFixed(2)}:1`);
    console.log(`  Grade:      ${assessment.emoji} ${assessment.grade} — ${assessment.label}`);
    console.log(`  ${assessment.desc}`);

    // Visual ratio bar
    const maxBar = 40;
    const followersBar = Math.min(maxBar, Math.round((stats.followers / Math.max(stats.followers, stats.following)) * maxBar));
    const followingBar = Math.min(maxBar, Math.round((stats.following / Math.max(stats.followers, stats.following)) * maxBar));
    console.log(`\n  Followers: ${'█'.repeat(followersBar)}${'░'.repeat(maxBar - followersBar)} ${stats.followers.toLocaleString()}`);
    console.log(`  Following: ${'█'.repeat(followingBar)}${'░'.repeat(maxBar - followingBar)} ${stats.following.toLocaleString()}`);

    // ── Target analysis ─────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  🎯 TARGET: ${CONFIG.targetRatio}:1 ratio`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (ratio >= CONFIG.targetRatio) {
      console.log(`  ✅ You've already reached your target ratio!`);
      const surplus = Math.floor(stats.followers / CONFIG.targetRatio);
      console.log(`  You could follow up to ${(surplus - stats.following).toLocaleString()} more without dropping below target.`);
    } else {
      // Two paths to target ratio
      const unfollowsNeeded = Math.ceil(stats.following - (stats.followers / CONFIG.targetRatio));
      const followersNeeded = Math.ceil(CONFIG.targetRatio * stats.following - stats.followers);

      console.log('\n  📋 TWO PATHS TO REACH TARGET:\n');
      console.log(`  Path A — Unfollow ${unfollowsNeeded.toLocaleString()} accounts`);
      console.log(`           (Reduce following from ${stats.following.toLocaleString()} to ${(stats.following - unfollowsNeeded).toLocaleString()})`);
      console.log('           → Use unfollowback.js to remove non-followers first');
      console.log('           → Use removeFollowers.js (smart mode) to clean bots');

      console.log(`\n  Path B — Gain ${followersNeeded.toLocaleString()} new followers`);
      console.log('           (Grow followers while keeping following steady)');
      console.log('           → Use engagementBooster.js to increase visibility');
      console.log('           → Use tweetScheduleOptimizer.js for optimal timing');

      console.log(`\n  Path C — Combination (recommended)`);
      const halfUnfollows = Math.ceil(unfollowsNeeded / 2);
      const halfFollowers = Math.ceil(followersNeeded / 2);
      console.log(`           Unfollow ~${halfUnfollows.toLocaleString()} + Gain ~${halfFollowers.toLocaleString()} followers`);

      // Weekly projection
      const weeklyGrowthRate = 0.02; // Assume 2% weekly growth
      const weeksNeeded = Math.ceil(Math.log(CONFIG.targetRatio * stats.following / stats.followers) / Math.log(1 + weeklyGrowthRate));
      if (weeksNeeded > 0 && weeksNeeded < 200) {
        console.log(`\n  ⏱️ At 2% weekly growth: ~${weeksNeeded} weeks to reach target (Path B)`);
      }
    }

    // ── Save snapshot ───────────────────────────────────────
    const history = loadHistory();
    const snapshot = {
      followers: stats.followers,
      following: stats.following,
      ratio: parseFloat(ratio.toFixed(4)),
      grade: assessment.grade,
      timestamp: new Date().toISOString(),
    };
    history.push(snapshot);
    while (history.length > 100) history.shift();
    saveHistory(history);

    // ── Trend analysis ──────────────────────────────────────
    if (history.length >= 2) {
      console.log('\n━━━ 📈 RATIO TREND ━━━');
      const recent = history.slice(-10);
      for (const snap of recent) {
        const bar = '█'.repeat(Math.round(Math.min(snap.ratio, 10) * 3));
        const date = new Date(snap.timestamp).toLocaleDateString();
        console.log(`  ${date.padEnd(12)} ${snap.ratio.toFixed(2)}:1 ${bar}`);
      }

      // Direction
      if (history.length >= 3) {
        const prev = history[history.length - 2];
        const diff = snapshot.ratio - prev.ratio;
        if (diff > 0.01) console.log(`  📈 Ratio improving: +${diff.toFixed(3)} since last check`);
        else if (diff < -0.01) console.log(`  📉 Ratio declining: ${diff.toFixed(3)} since last check`);
        else console.log('  ⏸️ Ratio stable since last check');
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (CONFIG.exportResults) {
      const data = {
        current: { ...stats, ratio: parseFloat(ratio.toFixed(4)), grade: assessment.grade, label: assessment.label },
        target: CONFIG.targetRatio,
        history: history.slice(-30),
        analyzedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-ratio-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Ratio data exported.');
    }

    return { stats, ratio, assessment };
  };

  // ── Controls ───────────────────────────────────────────────
  window.XActions = window.XActions || {};

  window.XActions.setTarget = (ratio) => {
    if (typeof ratio !== 'number' || ratio < 0.1) { console.log('❌ Target must be a positive number.'); return; }
    CONFIG.targetRatio = ratio;
    console.log(`🎯 Target ratio set to ${ratio}:1`);
  };

  window.XActions.track = analyze;

  window.XActions.history = () => {
    const history = loadHistory();
    if (history.length === 0) { console.log('📭 No history. Run XActions.track() first.'); return; }
    console.log(`\n📊 RATIO HISTORY (${history.length} snapshots):\n`);
    for (const snap of history) {
      const date = new Date(snap.timestamp).toLocaleString();
      console.log(`  ${date} — ${snap.ratio.toFixed(2)}:1 (${snap.grade}) [${snap.followers}/${snap.following}]`);
    }
  };

  window.XActions.plan = () => {
    console.log('📊 Re-analyzing...');
    analyze();
  };

  window.XActions.reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    console.log('🗑️ Ratio history cleared.');
  };

  // Run analysis
  analyze();
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `targetRatio` | `2.0,` | Target followers/following ratio |
| `scrollRoundsFollowing` | `5,` | Scroll rounds for following list analysis |
| `scrollDelay` | `2000` | Scroll delay |
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

Copy the entire script from [`browser/followRatioManager.js`](https://github.com/nirholas/XActions/blob/main/browser/followRatioManager.js) and paste it into the console.

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
| [`browser/followRatioManager.js`](https://github.com/nirholas/XActions/blob/main/browser/followRatioManager.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Algorithm Builder](algorithm-builder.md) | Automated account growth engine that trains the X algorithm for your niche |
| [Persona Engine](persona-engine.md) | Define and manage persona configurations for the algorithm builder |
| [Thought Leader Cultivator](thought-leader-cultivator.md) | Train the X algorithm for your niche by simulating natural browsing |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)

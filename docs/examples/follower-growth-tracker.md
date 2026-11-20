# 📈 Follower Growth Tracker

Track your follower count over time. Creates snapshots and shows growth rate, daily changes, and trend direction.

---

## 📋 What It Does

This script provides the following capabilities:

1. **Automated operation** — Runs directly in your browser console on x.com
2. **Configurable settings** — Customize behavior via the CONFIG object
3. **Real-time progress** — Shows live status updates with emoji-coded logs
4. **Rate limiting** — Built-in delays to respect X/Twitter's rate limits
5. **Data export** — Results exported as JSON/CSV for further analysis

**Use cases:**
- Track your follower count over time. Creates snapshots and shows growth rate, daily changes, and trend direction.
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
3. Copy and paste the script from [`browser/followerGrowthTracker.js`](https://github.com/nirholas/XActions/blob/main/browser/followerGrowthTracker.js)
4. Press Enter to run

```javascript
/**
 * ============================================================
 * 📈 Follower Growth Tracker — Production Grade
 * ============================================================
 *
 * @name        followerGrowthTracker.js
 * @description Track follower count over time, detect growth/loss
 *              trends, and calculate velocity. Stores snapshots
 *              in localStorage for long-term historical analysis.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME (or any profile)
 * 2. Open DevTools Console (F12)
 * 3. Paste and run
 * 4. Run again daily/weekly to build trendline
 *
 * Each run takes a snapshot. Over time, you'll see:
 * - Daily/weekly growth rates
 * - Growth velocity changes
 * - Best/worst days
 * - Projected milestones
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    autoSchedule: false,            // If true, auto-runs every intervalMs (keep tab open)
    intervalMs: 3600000,            // 1 hour between auto-snapshots
    exportHistory: true,            // Download full history as JSON
  };

  const parseCount = (str) => {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };

  const fmt = (n) => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : String(n);
  const sign = (n) => n > 0 ? `+${fmt(n)}` : n < 0 ? `-${fmt(Math.abs(n))}` : '0';

  const takeSnapshot = () => {
    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    if (!pathMatch || ['home', 'explore', 'notifications', 'messages', 'i'].includes(pathMatch[1])) return null;
    const username = pathMatch[1];

    let followers = 0, following = 0;
    const links = document.querySelectorAll('a[href*="/followers"], a[href*="/following"]');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const count = parseCount(link.textContent);
      if (href.includes('/following')) following = count;
      else if (href.includes('/followers') && !href.includes('/verified')) followers = count;
    }

    return {
      username,
      followers,
      following,
      ratio: following > 0 ? (followers / following).toFixed(3) : '∞',
      timestamp: new Date().toISOString(),
      epoch: Date.now(),
    };
  };

  const run = () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📈 FOLLOWER GROWTH TRACKER' + ' '.repeat(W - 29) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    const snapshot = takeSnapshot();
    if (!snapshot) {
      console.error('❌ Navigate to a profile page first!');
      return;
    }

    console.log(`\n👤 @${snapshot.username}`);
    console.log(`📊 Current: ${fmt(snapshot.followers)} followers | ${fmt(snapshot.following)} following | ratio: ${snapshot.ratio}`);

    // Load history
    const storageKey = `xactions_growth_${snapshot.username}`;
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch { history = []; }

    // Deduplicate (don't save if last snapshot was < 10 min ago)
    const lastSnap = history[history.length - 1];
    if (lastSnap && (snapshot.epoch - lastSnap.epoch) < 600000) {
      console.log('\nℹ️ Snapshot already taken within last 10 minutes. Showing existing data.\n');
    } else {
      history.push(snapshot);
      localStorage.setItem(storageKey, JSON.stringify(history));
      console.log(`\n💾 Snapshot #${history.length} saved.`);
    }

    if (history.length < 2) {
      console.log('\n📋 First snapshot recorded! Run again later to see growth data.');
      console.log('   Tip: Run daily for best trendline.\n');
      return;
    }

    // ── Analysis ────────────────────────────────────────────

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 GROWTH ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const first = history[0];
    const prev = history[history.length - 2];
    const curr = snapshot;

    // Since last check
    const sinceLast = curr.followers - prev.followers;
    const timeSinceLast = (curr.epoch - prev.epoch) / 3600000; // hours
    console.log(`\n🔄 Since last check (${timeSinceLast.toFixed(1)}h ago):`);
    console.log(`   Followers: ${sign(sinceLast)}`);
    console.log(`   Following: ${sign(curr.following - prev.following)}`);

    // All-time
    const allTimeGrowth = curr.followers - first.followers;
    const totalDays = (curr.epoch - first.epoch) / 86400000;
    console.log(`\n📈 All-time (${totalDays.toFixed(1)} days, ${history.length} snapshots):`);
    console.log(`   Total growth: ${sign(allTimeGrowth)}`);

    if (totalDays > 0) {
      const dailyRate = allTimeGrowth / totalDays;
      const weeklyRate = dailyRate * 7;
      const monthlyRate = dailyRate * 30;
      console.log(`   Daily avg:    ${sign(Math.round(dailyRate))}/day`);
      console.log(`   Weekly avg:   ${sign(Math.round(weeklyRate))}/week`);
      console.log(`   Monthly avg:  ${sign(Math.round(monthlyRate))}/month`);

      // Projections
      console.log('\n🎯 Projections (if trend continues):');
      const milestones = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
      for (const milestone of milestones) {
        if (milestone <= curr.followers) continue;
        if (dailyRate <= 0) {
          console.log(`   ${fmt(milestone)} followers: ❌ Growth stalled — need positive trend`);
          break;
        }
        const daysToMilestone = (milestone - curr.followers) / dailyRate;
        if (daysToMilestone > 3650) break; // 10 years max
        const targetDate = new Date(Date.now() + daysToMilestone * 86400000);
        console.log(`   ${fmt(milestone)} followers: ~${Math.round(daysToMilestone)} days (${targetDate.toLocaleDateString()})`);
        if (milestone >= curr.followers * 10) break; // Stop at 10x current
      }
    }

    // ── Trend Chart (ASCII) ─────────────────────────────────

    if (history.length >= 3) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  📉 GROWTH TRENDLINE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Take last 20 data points
      const recent = history.slice(-20);
      const counts = recent.map(s => s.followers);
      const min = Math.min(...counts);
      const max = Math.max(...counts);
      const range = max - min || 1;
      const chartHeight = 10;
      const chartWidth = Math.min(recent.length, 40);

      for (let row = chartHeight; row >= 0; row--) {
        const threshold = min + (range * row / chartHeight);
        let line = `${fmt(Math.round(threshold)).padStart(6)} │`;
        for (let col = 0; col < chartWidth; col++) {
          const val = counts[Math.floor(col * recent.length / chartWidth)];
          const barHeight = Math.round((val - min) / range * chartHeight);
          line += barHeight >= row ? '█' : ' ';
        }
        console.log(line);
      }
      console.log('       └' + '─'.repeat(chartWidth));

      // Show date range
      const start = new Date(recent[0].timestamp).toLocaleDateString();
      const end = new Date(recent[recent.length - 1].timestamp).toLocaleDateString();
      console.log(`        ${start}${' '.repeat(Math.max(0, chartWidth - start.length - end.length))}${end}`);
    }

    // ── Best/Worst Periods ──────────────────────────────────

    if (history.length >= 3) {
      console.log('\n━━━ 🏆 BEST / WORST PERIODS ━━━');

      let bestGain = -Infinity, worstLoss = Infinity;
      let bestIdx = 0, worstIdx = 0;

      for (let i = 1; i < history.length; i++) {
        const diff = history[i].followers - history[i - 1].followers;
        if (diff > bestGain) { bestGain = diff; bestIdx = i; }
        if (diff < worstLoss) { worstLoss = diff; worstIdx = i; }
      }

      const bestDate = new Date(history[bestIdx].timestamp).toLocaleString();
      const worstDate = new Date(history[worstIdx].timestamp).toLocaleString();

      console.log(`  📈 Best:  ${sign(bestGain)} (${bestDate})`);
      console.log(`  📉 Worst: ${sign(worstLoss)} (${worstDate})`);
    }

    // Export
    if (CONFIG.exportHistory && history.length > 1) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📥 Export: copy(localStorage.getItem("${storageKey}"))`);

      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' }));
      a.download = `xactions-growth-${snapshot.username}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
    }

    console.log('\n💡 Run again tomorrow to build your growth trendline.\n');
  };

  run();

  // Auto-schedule if configured
  if (CONFIG.autoSchedule) {
    console.log(`\n⏰ Auto-snapshot scheduled every ${CONFIG.intervalMs / 60000} minutes.`);
    console.log('   Keep this tab open. Kill with: clearInterval(window._xactionsGrowthInterval)');
    window._xactionsGrowthInterval = setInterval(run, CONFIG.intervalMs);
  }
})();

```

## ⚙️ Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `autoSchedule` | `false,` | If true, auto-runs every intervalMs (keep tab open) |
| `intervalMs` | `3600000,` | 1 hour between auto-snapshots |
| `exportHistory` | `true,` | Download full history as JSON |

---

## 📖 Step-by-Step Tutorial

### Step 1: Navigate to the right page

Open your browser and go to `x.com/YOUR_USERNAME`. Make sure you're logged in to your X/Twitter account.

### Step 2: Open the browser console

- **Chrome/Edge:** Press `F12` or `Ctrl+Shift+J` (Mac: `Cmd+Option+J`)
- **Firefox:** Press `F12` or `Ctrl+Shift+K`
- **Safari:** Enable Developer menu in Preferences → Advanced, then press `Cmd+Option+C`

### Step 3: Paste the script

Copy the entire script from [`browser/followerGrowthTracker.js`](https://github.com/nirholas/XActions/blob/main/browser/followerGrowthTracker.js) and paste it into the console.

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
| [`browser/followerGrowthTracker.js`](https://github.com/nirholas/XActions/blob/main/browser/followerGrowthTracker.js) | Main script |

---

## 🔗 Related Scripts

| Script | Description |
|--------|-------------|
| [Account Health Monitor](account-health-monitor.md) | Comprehensive health check for your X/Twitter account |
| [Audience Demographics](audience-demographics.md) | Analyze your follower demographics including bio keywords, locations, account age, and interests |
| [Audience Overlap](audience-overlap.md) | Compare the follower lists of two accounts to find audience overlap |
| [Engagement Leaderboard](engagement-leaderboard.md) | Analyze who engages most with your tweets |
| [Sentiment Analyzer](sentiment-analyzer.md) | Analyze tweet sentiment (positive/negative/neutral) using lexicon-based scoring |

---

> **Author:** nich ([@nichxbt](https://x.com/nichxbt)) — [XActions on GitHub](https://github.com/nirholas/XActions)

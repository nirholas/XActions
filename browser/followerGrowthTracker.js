// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 📈 Follower Growth Tracker — Production Grade
 * ============================================================
 *
 * @name        followerGrowthTracker.js
 * @title       Follower Growth Tracker
 * @description Snapshot a profile's follower count on each run and report growth, velocity, projections and a trendline from the saved history.
 * @category    analytics
 * @page        x.com/<username>
 * @writes      false
 * @aliases     scripts/followerGrowthTracker.js, scripts/twitter/followers-growth-tracker.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME (or any profile)
 * 2. Open DevTools Console (F12)
 * 3. Paste browser/followerGrowthTracker.js and press Enter
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
    showChart: true,                // Print the ASCII trendline (needs 3+ snapshots)
    maxHistory: 0,                  // Keep only the last N snapshots (0 = keep all)
    onePerDay: false,               // true = replace today's snapshot instead of adding another
    legacyStorageKey: 'xactions_growth_tracker', // Import history saved by the old followers-growth-tracker script ('' = skip)
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
    if (!pathMatch || ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'].includes(pathMatch[1])) return null;
    const username = pathMatch[1];

    let followers = 0, following = 0;
    let verifiedFollowers = 0, foundFollowers = false;
    const links = document.querySelectorAll('a[href*="/followers"], a[href*="/following"]');
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const count = parseCount(link.textContent);
      if (href.includes('/following')) following = count;
      else if (href.includes('/followers') && !href.includes('/verified')) { followers = count; foundFollowers = true; }
      else if (href.endsWith('/verified_followers')) verifiedFollowers = count;
    }
    // Some profiles only link the follower count through /verified_followers
    if (!foundFollowers && verifiedFollowers > 0) { followers = verifiedFollowers; foundFollowers = true; }
    if (!foundFollowers) return { username, missing: true };

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
    if (snapshot.missing) {
      console.warn('⚠️ Could not detect the follower count. Make sure you\'re on a profile page.');
      console.log('   Try scrolling up so the profile header is visible. Nothing was saved.');
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

    // Import history saved by the old followers-growth-tracker script
    // (key `${legacyStorageKey}_<lowercase username>`, entries { date, followers, following })
    if (CONFIG.legacyStorageKey) {
      let legacy = [];
      try {
        legacy = JSON.parse(localStorage.getItem(`${CONFIG.legacyStorageKey}_${snapshot.username.toLowerCase()}`) || '[]');
      } catch { legacy = []; }
      const known = new Set(history.map(h => h.epoch));
      let imported = 0;
      for (const h of Array.isArray(legacy) ? legacy : []) {
        const epoch = new Date(h.date).getTime();
        if (!h.date || Number.isNaN(epoch) || known.has(epoch)) continue;
        history.push({
          username: snapshot.username,
          followers: h.followers || 0,
          following: h.following || 0,
          ratio: h.following > 0 ? (h.followers / h.following).toFixed(3) : '∞',
          timestamp: new Date(epoch).toISOString(),
          epoch,
        });
        known.add(epoch);
        imported++;
      }
      if (imported > 0) {
        history.sort((a, b) => a.epoch - b.epoch);
        localStorage.setItem(storageKey, JSON.stringify(history));
        console.log(`\n📦 Imported ${imported} snapshot(s) from ${CONFIG.legacyStorageKey}_${snapshot.username.toLowerCase()}.`);
      }
    }

    const saveHistory = () => {
      if (CONFIG.maxHistory > 0 && history.length > CONFIG.maxHistory) history = history.slice(-CONFIG.maxHistory);
      localStorage.setItem(storageKey, JSON.stringify(history));
    };

    // Deduplicate (don't save if last snapshot was < 10 min ago)
    const lastSnap = history[history.length - 1];
    const today = snapshot.timestamp.slice(0, 10);
    if (CONFIG.onePerDay && lastSnap && lastSnap.timestamp.slice(0, 10) === today) {
      history[history.length - 1] = snapshot;
      saveHistory();
      console.log('\n📝 Updated today\'s snapshot.');
    } else if (lastSnap && (snapshot.epoch - lastSnap.epoch) < 600000) {
      console.log('\nℹ️ Snapshot already taken within last 10 minutes. Showing existing data.\n');
    } else {
      history.push(snapshot);
      saveHistory();
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
    console.log(`   From: ${new Date(first.timestamp).toLocaleDateString()} (${fmt(first.followers)} followers)`);
    console.log(`   To:   ${new Date(curr.timestamp).toLocaleDateString()} (${fmt(curr.followers)} followers)`);
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

    if (CONFIG.showChart && history.length >= 3) {
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

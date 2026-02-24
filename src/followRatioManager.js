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

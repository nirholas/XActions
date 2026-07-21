// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/followRatioManager.js
// Browser console script for analyzing and optimizing your follow/following ratio
// Paste in DevTools console on x.com/YOUR_USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    targetRatio: 2.0,        // Target followers/following ratio
    scrollDelay: 2000,       // ms between scrolls
    exportResults: true,     // Auto-download JSON
  };
  // =============================================

  const STORAGE_KEY = 'xactions_ratio_history';

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const loadHistory = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
  const saveHistory = (h) => localStorage.setItem(STORAGE_KEY, JSON.stringify(h));

  const scrapeStats = () => {
    const links = document.querySelectorAll('a[href$="/followers"], a[href$="/following"], a[href$="/verified_followers"]');
    let followers = 0, following = 0;
    for (const link of links) {
      const href = link.getAttribute('href') || '';
      const num = parseNum(link.textContent);
      if (href.endsWith('/followers') || href.endsWith('/verified_followers')) { if (num > followers) followers = num; }
      else if (href.endsWith('/following')) following = num;
    }
    return { followers, following };
  };

  const assessRatio = (ratio) => {
    if (ratio >= 10) return { grade: 'S', label: 'ELITE', emoji: '👑' };
    if (ratio >= 5) return { grade: 'A+', label: 'EXCELLENT', emoji: '🌟' };
    if (ratio >= 3) return { grade: 'A', label: 'GREAT', emoji: '🔥' };
    if (ratio >= 2) return { grade: 'B+', label: 'GOOD', emoji: '✅' };
    if (ratio >= 1.5) return { grade: 'B', label: 'DECENT', emoji: '👍' };
    if (ratio >= 1) return { grade: 'C', label: 'BALANCED', emoji: '⚖️' };
    if (ratio >= 0.5) return { grade: 'D', label: 'LOW', emoji: '⚠️' };
    return { grade: 'F', label: 'POOR', emoji: '🚨' };
  };

  const analyze = () => {
    const stats = scrapeStats();
    if (stats.followers === 0 && stats.following === 0) {
      console.error('❌ Could not read counts. Make sure you\'re on your profile page.');
      return;
    }

    const ratio = stats.following > 0 ? (stats.followers / stats.following) : Infinity;
    const assessment = assessRatio(ratio);

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  ⚖️ FOLLOW RATIO MANAGER                      ║');
    console.log('║  by nichxbt — v1.0                            ║');
    console.log('╚════════════════════════════════════════════════╝');

    console.log('\n━━━ 📊 CURRENT STATUS ━━━');
    console.log(`  Followers:  ${stats.followers.toLocaleString()}`);
    console.log(`  Following:  ${stats.following.toLocaleString()}`);
    console.log(`  Ratio:      ${ratio.toFixed(2)}:1`);
    console.log(`  Grade:      ${assessment.emoji} ${assessment.grade} — ${assessment.label}`);

    const maxBar = 30;
    const fBar = Math.min(maxBar, Math.round((stats.followers / Math.max(stats.followers, stats.following)) * maxBar));
    const gBar = Math.min(maxBar, Math.round((stats.following / Math.max(stats.followers, stats.following)) * maxBar));
    console.log(`\n  Followers: ${'█'.repeat(fBar)}${'░'.repeat(maxBar - fBar)} ${stats.followers}`);
    console.log(`  Following: ${'█'.repeat(gBar)}${'░'.repeat(maxBar - gBar)} ${stats.following}`);

    console.log(`\n━━━ 🎯 TARGET: ${CONFIG.targetRatio}:1 ━━━`);
    if (ratio >= CONFIG.targetRatio) {
      const surplus = Math.floor(stats.followers / CONFIG.targetRatio) - stats.following;
      console.log(`  ✅ Target reached! You can follow ${surplus.toLocaleString()} more.`);
    } else {
      const unfollowsNeeded = Math.ceil(stats.following - (stats.followers / CONFIG.targetRatio));
      const followersNeeded = Math.ceil(CONFIG.targetRatio * stats.following - stats.followers);
      console.log(`  Path A: Unfollow ${unfollowsNeeded.toLocaleString()} accounts`);
      console.log(`  Path B: Gain ${followersNeeded.toLocaleString()} followers`);
      console.log(`  Path C: Unfollow ~${Math.ceil(unfollowsNeeded / 2)} + Gain ~${Math.ceil(followersNeeded / 2)} (recommended)`);
    }

    // Save snapshot
    const history = loadHistory();
    history.push({ followers: stats.followers, following: stats.following, ratio: parseFloat(ratio.toFixed(4)), grade: assessment.grade, timestamp: new Date().toISOString() });
    while (history.length > 100) history.shift();
    saveHistory(history);

    // Trend
    if (history.length >= 2) {
      console.log('\n━━━ 📈 RATIO TREND ━━━');
      history.slice(-8).forEach(snap => {
        const bar = '█'.repeat(Math.round(Math.min(snap.ratio, 10) * 3));
        console.log(`  ${new Date(snap.timestamp).toLocaleDateString().padEnd(12)} ${snap.ratio.toFixed(2)}:1 ${bar}`);
      });
      const prev = history[history.length - 2];
      const diff = ratio - prev.ratio;
      if (diff > 0.01) console.log(`  📈 Improving: +${diff.toFixed(3)}`);
      else if (diff < -0.01) console.log(`  📉 Declining: ${diff.toFixed(3)}`);
      else console.log('  ⏸️ Stable');
    }

    console.log('');

    if (CONFIG.exportResults) {
      download({
        current: { ...stats, ratio: parseFloat(ratio.toFixed(4)), grade: assessment.grade },
        target: CONFIG.targetRatio,
        history: history.slice(-30),
        analyzedAt: new Date().toISOString(),
      }, `xactions-ratio-${new Date().toISOString().slice(0, 10)}.json`);
    }
  };

  window.XActions = window.XActions || {};
  window.XActions.track = analyze;
  window.XActions.setTarget = (r) => { CONFIG.targetRatio = r; console.log(`🎯 Target: ${r}:1`); };
  window.XActions.history = () => {
    const h = loadHistory();
    if (h.length === 0) { console.log('📭 No history. Run XActions.track() first.'); return; }
    h.forEach(s => console.log(`  ${new Date(s.timestamp).toLocaleString()} — ${s.ratio.toFixed(2)}:1 (${s.grade}) [${s.followers}/${s.following}]`));
  };
  window.XActions.reset = () => { localStorage.removeItem(STORAGE_KEY); console.log('🗑️ History cleared.'); };

  analyze();
})();

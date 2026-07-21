// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/trendingTopicMonitor.js
// Browser console script for tracking trending topics and detecting rising trends
// Paste in DevTools console on x.com/explore/tabs/trending
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    checkInterval: 300000,   // Auto-refresh interval (ms) — 5 min
    maxChecks: 50,           // Max snapshots to keep
    scrollRounds: 4,         // Scroll rounds per scan
    scrollDelay: 1500,       // ms between scrolls
    watchKeywords: [],       // Alert when trends match
    exportResults: true,     // Auto-download JSON
  };
  // =============================================

  const STORAGE_KEY = 'xactions_trend_history';

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const NICHES = {
    'Tech': ['ai', 'chatgpt', 'openai', 'google', 'apple', 'microsoft', 'nvidia', 'coding', 'crypto', 'bitcoin', 'web3'],
    'Politics': ['trump', 'biden', 'congress', 'election', 'democrat', 'republican', 'government'],
    'Sports': ['nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'fifa', 'ufc', 'f1'],
    'Entertainment': ['movie', 'music', 'album', 'netflix', 'disney', 'grammy', 'oscar'],
    'Business': ['stock', 'market', 'earnings', 'ipo', 'startup', 'economy', 'fed'],
    'Gaming': ['gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'esports'],
  };

  const classifyNiche = (text) => {
    if (!text) return 'Other';
    const lower = text.toLowerCase();
    for (const [niche, kws] of Object.entries(NICHES)) {
      if (kws.some(kw => lower.includes(kw))) return niche;
    }
    return 'Other';
  };

  const loadHistory = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
  const saveSnapshot = (trends) => {
    const h = loadHistory();
    h.push({ timestamp: new Date().toISOString(), trends: trends.map(t => ({ topic: t.topic, rank: t.rank, postCount: t.postCount, niche: t.niche })) });
    while (h.length > CONFIG.maxChecks) h.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  };

  let autoTimer = null;

  const scrapeTrends = async () => {
    const trends = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const cells = document.querySelectorAll('[data-testid="trend"]');
      for (const cell of cells) {
        const spans = cell.querySelectorAll('span');
        let topic = '', tweetCount = '';
        for (const el of spans) {
          const text = el.textContent.trim();
          if (/[\d,.]+[KM]?\s*(posts|tweets)/i.test(text)) tweetCount = text;
          if (text.startsWith('#') || (text.length > 2 && text.length < 80 && !text.includes('·') && !text.includes('Trending') && !/posts|tweets/i.test(text) && !/^\d+$/.test(text))) {
            if (text.length > topic.length) topic = text;
          }
        }
        if (!topic || seen.has(topic.toLowerCase())) continue;
        seen.add(topic.toLowerCase());

        let postCount = 0;
        const cm = tweetCount.match(/([\d,.]+)\s*([KM])?/i);
        if (cm) { postCount = parseFloat(cm[1].replace(/,/g, '')); if (cm[2] === 'K') postCount *= 1000; if (cm[2] === 'M') postCount *= 1000000; }

        trends.push({ rank: trends.length + 1, topic, niche: classifyNiche(topic), postCount, postCountRaw: tweetCount });
      }
      console.log(`   📜 Round ${round + 1}: ${trends.length} trends`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
    return trends;
  };

  const compareWithLast = (trends) => {
    const h = loadHistory();
    if (h.length < 2) { console.log('  📊 Need more snapshots to compare.'); return; }
    const prev = h[h.length - 2];
    const prevMap = new Map(prev.trends.map(t => [t.topic.toLowerCase(), t]));

    const newTrends = [];
    const rising = [];
    for (const t of trends) {
      const p = prevMap.get(t.topic.toLowerCase());
      if (!p) newTrends.push(t);
      else if (t.rank < p.rank) rising.push({ ...t, prevRank: p.rank, change: p.rank - t.rank });
    }

    if (newTrends.length > 0) {
      console.log(`\n  🆕 NEW (${newTrends.length}):`);
      newTrends.slice(0, 8).forEach(t => console.log(`     #${t.rank} ${t.topic} [${t.niche}]`));
    }
    if (rising.length > 0) {
      console.log(`\n  📈 RISING (${rising.length}):`);
      rising.sort((a, b) => b.change - a.change).slice(0, 5).forEach(t => console.log(`     ↑${t.change} ${t.topic} (#${t.prevRank} → #${t.rank})`));
    }
  };

  const run = async () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  📡 TRENDING TOPIC MONITOR                     ║');
    console.log('║  by nichxbt — v1.0                            ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('\n📊 Scraping trends...\n');

    const trends = await scrapeTrends();
    if (trends.length === 0) { console.error('❌ No trends found. Go to x.com/explore/tabs/trending'); return; }

    console.log(`\n━━━ 📡 TRENDING NOW (${trends.length}) ━━━`);
    trends.forEach(t => {
      const count = t.postCountRaw ? ` (${t.postCountRaw})` : '';
      console.log(`  ${String(t.rank).padStart(2)}. [${t.niche.padEnd(14)}] ${t.topic}${count}`);
    });

    // Niche distribution
    const nicheCounts = {};
    trends.forEach(t => nicheCounts[t.niche] = (nicheCounts[t.niche] || 0) + 1);
    console.log('\n━━━ 📊 NICHE DISTRIBUTION ━━━');
    Object.entries(nicheCounts).sort((a, b) => b[1] - a[1]).forEach(([n, c]) => {
      console.log(`  ${n.padEnd(16)} ${c} (${((c / trends.length) * 100).toFixed(0)}%) ${'█'.repeat(Math.round(c / trends.length * 20))}`);
    });

    // Keyword alerts
    if (CONFIG.watchKeywords.length > 0) {
      console.log('\n━━━ 🔔 KEYWORD ALERTS ━━━');
      let found = 0;
      trends.forEach(t => {
        CONFIG.watchKeywords.forEach(kw => {
          if (t.topic.toLowerCase().includes(kw.toLowerCase())) {
            console.log(`  🚨 "${t.topic}" matches "${kw}" (rank #${t.rank})`);
            found++;
          }
        });
      });
      if (found === 0) console.log('  No matches.');
    }

    // Content opportunities
    const highVol = trends.filter(t => t.postCount > 10000).slice(0, 5);
    if (highVol.length > 0) {
      console.log('\n━━━ 💡 CONTENT OPPORTUNITIES ━━━');
      highVol.forEach(t => console.log(`  → ${t.topic} (${t.postCountRaw}) [${t.niche}]`));
    }

    saveSnapshot(trends);
    compareWithLast(trends);
    console.log('');

    if (CONFIG.exportResults) {
      download({ trends, analyzedAt: new Date().toISOString() }, `xactions-trends-${new Date().toISOString().slice(0, 10)}.json`);
    }
  };

  window.XActions = window.XActions || {};
  window.XActions.watch = (kws) => { CONFIG.watchKeywords = kws; console.log(`👁️ Watching: ${kws.join(', ')}`); };
  window.XActions.history = () => {
    const h = loadHistory();
    if (h.length === 0) { console.log('📭 No history.'); return; }
    h.slice(-10).forEach(s => console.log(`  ${new Date(s.timestamp).toLocaleString()} — ${s.trends.length} trends: ${s.trends.slice(0, 3).map(t => t.topic).join(', ')}`));
  };
  window.XActions.compare = () => { const h = loadHistory(); if (h.length < 2) { console.log('Need 2+ snapshots.'); return; } compareWithLast(h[h.length - 1].trends); };
  window.XActions.autoRefresh = (ms) => {
    if (autoTimer) clearInterval(autoTimer);
    const interval = ms || CONFIG.checkInterval;
    console.log(`🔄 Auto-refresh every ${(interval / 60000).toFixed(1)} min.`);
    autoTimer = setInterval(() => { console.log('\n🔄 Refreshing...'); run(); }, interval);
  };
  window.XActions.stop = () => { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } console.log('⏹️ Stopped.'); };

  run();
})();

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 📡 Trending Monitor - XActions
 * ============================================
 *
 * @name         trending-monitor
 * @description  Capture the current X trends (name, post count, category), highlight watched keywords, and optionally re-scan on an interval.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/explore/tabs/trending (or x.com/explore)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) set CONFIG.watchKeywords and CONFIG.repeatIntervalMs
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   Set watchKeywords: ['solana','ai'] and repeatIntervalMs: 300000 to scan
 *   the trends now, flag any trend containing those words, then re-scan every
 *   5 minutes. Each scan prints a ranked table and downloads a JSON snapshot.
 *   To stop the repeating monitor: window.stopTrendingMonitor()
 *
 * ============================================
 */

(async function trendingMonitor() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Highlight any trend whose name contains one of these words (case-insensitive).
    watchKeywords: [],

    // Re-scan interval in ms. Set to 0 for a single one-off scan.
    // 300000 = every 5 minutes. Stop with window.stopTrendingMonitor().
    repeatIntervalMs: 0,

    // Scroll passes per scan to load the full trends list.
    scrollRounds: 4,

    // Delay between scrolls (ms).
    scrollDelay: 1400,

    // Auto-download a JSON snapshot after each scan.
    exportResults: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    trend: '[data-testid="trend"]'
  };

  // ============================================
  // 🗂️ CATEGORY KEYWORDS
  // ============================================
  const CATEGORIES = {
    Tech: ['ai', 'chatgpt', 'openai', 'google', 'apple', 'microsoft', 'nvidia', 'coding', 'crypto', 'bitcoin', 'solana', 'web3', 'ethereum'],
    Politics: ['trump', 'biden', 'congress', 'election', 'democrat', 'republican', 'government', 'senate'],
    Sports: ['nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'fifa', 'ufc', 'f1', 'olympics'],
    Entertainment: ['movie', 'music', 'album', 'netflix', 'disney', 'grammy', 'oscar', 'tour', 'concert'],
    Business: ['stock', 'market', 'earnings', 'ipo', 'startup', 'economy', 'fed', 'inflation'],
    Gaming: ['gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'esports', 'minecraft']
  };

  const classify = (text) => {
    if (!text) return 'Other';
    const lower = text.toLowerCase();
    for (const [category, words] of Object.entries(CATEGORIES)) {
      if (words.some((w) => lower.includes(w))) return category;
    }
    return 'Other';
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const STORAGE_KEY = 'xactions_trends_history';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`)
  };

  const download = (data, filename) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      log.success(`Snapshot downloaded: ${filename}`);
    } catch (e) {
      log.error(`Could not download snapshot: ${e.message}`);
    }
  };

  const parsePostCount = (text) => {
    if (!text) return 0;
    const match = text.match(/([\d,.]+)\s*([KMB])?/i);
    if (!match) return 0;
    let num = parseFloat(match[1].replace(/,/g, ''));
    if (Number.isNaN(num)) return 0;
    const mult = { K: 1e3, M: 1e6, B: 1e9 };
    if (match[2]) num *= mult[match[2].toUpperCase()];
    return Math.round(num);
  };

  const loadHistory = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const saveSnapshot = (trends) => {
    try {
      const history = loadHistory();
      history.push({
        timestamp: new Date().toISOString(),
        trends: trends.map((t) => ({ rank: t.rank, topic: t.topic, postCount: t.postCount, category: t.category }))
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-50)));
    } catch (e) {
      log.warning(`Could not save history: ${e.message}`);
    }
  };

  // Read one trends scan from the DOM. Each trend cell holds several spans;
  // the topic is the longest non-metadata span and the post count is the
  // span that mentions "posts"/"Tweets".
  const scrapeTrends = async () => {
    const trends = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      document.querySelectorAll(SELECTORS.trend).forEach((cell) => {
        let topic = '';
        let postCountRaw = '';
        cell.querySelectorAll('span').forEach((span) => {
          const text = span.textContent.trim();
          if (/[\d,.]+[KMB]?\s*(posts|tweets)/i.test(text)) {
            postCountRaw = text;
            return;
          }
          const isMeta = text.includes('·') || /Trending|Only on X|Promoted/i.test(text) || /posts|tweets/i.test(text) || /^\d+$/.test(text);
          if (!isMeta && text.length > 1 && text.length < 80 && text.length > topic.length) {
            topic = text;
          }
        });
        if (!topic || seen.has(topic.toLowerCase())) return;
        seen.add(topic.toLowerCase());
        trends.push({
          rank: trends.length + 1,
          topic,
          category: classify(topic),
          postCount: parsePostCount(postCountRaw),
          postCountRaw: postCountRaw || null
        });
      });
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
    return trends;
  };

  const compareWithPrevious = (trends) => {
    const history = loadHistory();
    if (history.length < 2) return;
    const prev = history[history.length - 2];
    const prevMap = new Map(prev.trends.map((t) => [t.topic.toLowerCase(), t]));

    const fresh = [];
    const rising = [];
    trends.forEach((t) => {
      const p = prevMap.get(t.topic.toLowerCase());
      if (!p) fresh.push(t);
      else if (t.rank < p.rank) rising.push({ ...t, prevRank: p.rank, change: p.rank - t.rank });
    });

    if (fresh.length > 0) {
      console.log('');
      console.log(`   🆕 NEW since last scan (${fresh.length}):`);
      fresh.slice(0, 8).forEach((t) => console.log(`      #${t.rank} ${t.topic} [${t.category}]`));
    }
    if (rising.length > 0) {
      console.log('');
      console.log(`   📈 RISING (${rising.length}):`);
      rising.sort((a, b) => b.change - a.change).slice(0, 5).forEach((t) => {
        console.log(`      ↑${t.change} ${t.topic} (#${t.prevRank} -> #${t.rank})`);
      });
    }
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const runScan = async (scanNo) => {
    console.log('');
    console.log('━'.repeat(60));
    console.log(`📡 TRENDS SCAN ${scanNo} at ${new Date().toLocaleTimeString()}`);
    console.log('━'.repeat(60));

    const trends = await scrapeTrends();
    if (trends.length === 0) {
      log.error('No trends found. Go to x.com/explore/tabs/trending and make sure trends are visible.');
      return null;
    }

    trends.forEach((t) => {
      const count = t.postCountRaw ? ` (${t.postCountRaw})` : '';
      console.log(`   ${String(t.rank).padStart(2)}. [${t.category.padEnd(13)}] ${t.topic}${count}`);
    });

    // Category distribution.
    const catCounts = {};
    trends.forEach((t) => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });
    console.log('');
    console.log('   📊 CATEGORY MIX:');
    Object.entries(catCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      const bar = '█'.repeat(Math.round((count / trends.length) * 20));
      console.log(`      ${cat.padEnd(14)} ${count} (${((count / trends.length) * 100).toFixed(0)}%) ${bar}`);
    });

    // Watched keyword highlights.
    const matches = [];
    if (CONFIG.watchKeywords.length > 0) {
      trends.forEach((t) => {
        CONFIG.watchKeywords.forEach((kw) => {
          if (t.topic.toLowerCase().includes(kw.toLowerCase())) {
            matches.push({ topic: t.topic, keyword: kw, rank: t.rank, postCount: t.postCount });
          }
        });
      });
      console.log('');
      console.log('   🔔 WATCHED KEYWORDS:');
      if (matches.length === 0) {
        console.log('      No watched keywords in the current trends.');
      } else {
        matches.forEach((m) => console.log(`      🚨 "${m.topic}" matches "${m.keyword}" (rank #${m.rank})`));
      }
    }

    saveSnapshot(trends);
    compareWithPrevious(trends);

    const snapshot = {
      scannedAt: new Date().toISOString(),
      page: window.location.href,
      totalTrends: trends.length,
      watchKeywords: CONFIG.watchKeywords,
      keywordMatches: matches,
      categoryMix: catCounts,
      trends
    };

    if (CONFIG.exportResults) {
      console.log('');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      download(snapshot, `xactions-trends-${stamp}.json`);
    }

    window.xactionsTrends = snapshot;
    return snapshot;
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📡 TRENDING MONITOR - XActions                         ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  if (!/(^|\.)x\.com$/.test(location.hostname) && !/(^|\.)twitter\.com$/.test(location.hostname)) {
    log.warning('Not on x.com. Open x.com/explore/tabs/trending and run again.');
    return;
  }
  if (!/\/explore/.test(location.pathname)) {
    log.warning('You are not on the Explore/Trends page. Go to x.com/explore/tabs/trending for the full list.');
    log.info('Continuing anyway in case trends are rendered in a sidebar.');
  }

  if (CONFIG.watchKeywords.length > 0) log.info(`Watching keywords: ${CONFIG.watchKeywords.join(', ')}`);

  // Stop switch for the repeating monitor.
  let stopped = false;
  window.stopTrendingMonitor = () => {
    stopped = true;
    log.warning('Stop requested. The monitor will exit after the current scan.');
  };

  // First scan always runs.
  await runScan(1);

  if (CONFIG.repeatIntervalMs > 0) {
    log.info(`Repeat mode ON. Re-scanning every ${(CONFIG.repeatIntervalMs / 60000).toFixed(1)} min.`);
    log.info('To stop: window.stopTrendingMonitor()');
    let scanNo = 2;
    while (!stopped) {
      // Sleep in short slices so the stop switch responds quickly.
      const slices = Math.max(1, Math.round(CONFIG.repeatIntervalMs / 1000));
      for (let i = 0; i < slices && !stopped; i++) await sleep(1000);
      if (stopped) break;
      await runScan(scanNo++);
    }
    log.success('Trending monitor stopped.');
  } else {
    log.info('Single scan complete. Set CONFIG.repeatIntervalMs > 0 for continuous monitoring.');
  }

  return window.xactionsTrends;
})();

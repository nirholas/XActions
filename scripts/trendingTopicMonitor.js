// GENERATED FILE: a copy of browser/trendingTopicMonitor.js, written by scripts/build-script-manifest.mjs. Edit browser/trendingTopicMonitor.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 📡 Trending Topic Monitor — Production Grade
 * ============================================================
 *
 * @name        trendingTopicMonitor.js
 * @title       Trending Topic Monitor
 * @description Capture the current trends with post counts and niches, flag watched keywords, compare against past snapshots and optionally re-scan on an interval.
 * @category    monitor
 * @page        x.com/explore/tabs/trending or x.com/explore
 * @writes      false
 * @aliases     scripts/trendingTopicMonitor.js, scripts/twitter/trending-monitor.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/explore/tabs/trending
 *    (or x.com/explore → "Trending" tab)
 * 2. Open DevTools Console (F12)
 * 3. (Optional) set CONFIG.watchKeywords and CONFIG.repeatIntervalMs
 * 4. Paste browser/trendingTopicMonitor.js and run
 *
 * Controls:
 *   XActions.watch(['AI', 'crypto', 'startup'])  — set alert keywords
 *   XActions.history()                            — view trend history
 *   XActions.compare()                            — compare vs last snapshot
 *   XActions.autoRefresh(300000)                  — auto-refresh every 5min
 *                                                   (no argument: CONFIG.checkInterval)
 *   XActions.stop()                               — stop auto-refresh
 *   window.stopTrendingMonitor()                  - same as XActions.stop()
 *   window.xactionsTrends                         - the latest scan snapshot
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    scrollRounds: 4,
    scrollDelay: 1500,
    watchKeywords: [],      // Alert when trends match these
    exportResults: true,
    maxHistory: 50,         // Keep last N snapshots
    checkInterval: 300000,  // Default XActions.autoRefresh() interval (ms)
    repeatIntervalMs: 0,    // Re-scan every N ms after the first scan; 0 = single scan. Stop with window.stopTrendingMonitor()
  };

  const STORAGE_KEY = 'xactions_trend_history';
  // History key used by the older standalone trending monitor; merged in once.
  const LEGACY_STORAGE_KEY = 'xactions_trends_history';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ── Niche classification ───────────────────────────────────
  const NICHE_KEYWORDS = {
    'Tech':       ['ai', 'artificial intelligence', 'chatgpt', 'openai', 'google', 'apple', 'microsoft', 'meta', 'tesla', 'nvidia', 'coding', 'developer', 'software', 'app', 'web3', 'blockchain', 'crypto', 'bitcoin', 'ethereum', 'solana', 'saas'],
    'Politics':   ['trump', 'biden', 'congress', 'senate', 'election', 'vote', 'democrat', 'republican', 'president', 'breaking', 'government', 'policy', 'law'],
    'Sports':     ['nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'baseball', 'game', 'championship', 'playoffs', 'fifa', 'ufc', 'boxing', 'f1', 'premier league', 'olympics'],
    'Entertainment': ['movie', 'film', 'music', 'album', 'concert', 'series', 'netflix', 'disney', 'grammy', 'oscar', 'emmy', 'celebrity', 'singer', 'rapper', 'actor', 'tour'],
    'Business':   ['market', 'stock', 'earnings', 'ipo', 'startup', 'funding', 'recession', 'inflation', 'fed', 'wall street', 'investor', 'economy'],
    'Gaming':     ['game', 'gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'esports', 'twitch', 'streamer', 'dlc', 'minecraft'],
    'Science':    ['nasa', 'space', 'climate', 'research', 'study', 'vaccine', 'health', 'medical', 'discovery', 'quantum'],
    'Culture':    ['meme', 'viral', 'trend', 'tiktok', 'instagram', 'influencer', 'cancel', 'discourse', 'ratio'],
  };

  const classifyNiche = (text) => {
    if (!text) return 'Other';
    const lower = text.toLowerCase();
    for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
      if (keywords.some(kw => lower.includes(kw))) return niche;
    }
    return 'Other';
  };

  // ── Scrape trending topics ─────────────────────────────────
  const scrapeTrends = async () => {
    const trends = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      // Trending items are in div cells
      const cells = document.querySelectorAll('[data-testid="trend"]');

      for (const cell of cells) {
        const textEls = cell.querySelectorAll('span');
        let topic = '';
        let category = '';
        let tweetCount = '';

        for (const el of textEls) {
          const text = el.textContent.trim();
          // Category line (e.g., "Technology · Trending")
          if (text.includes('·') && text.includes('Trending')) {
            category = text.split('·')[0].trim();
          }
          // Tweet count (e.g., "125K posts")
          if (/[\d,.]+[KMB]?\s*(posts|tweets)/i.test(text)) {
            tweetCount = text;
          }
          // Topic: usually the boldest / largest text, starts with # or is prominently displayed.
          // Two-letter trends (AI, F1) count; "Only on X" and "Promoted" labels are metadata.
          if (text.startsWith('#') || (text.length > 1 && text.length < 80 && !text.includes('·') && !text.includes('Trending') && !/Only on X|Promoted/i.test(text) && !/posts|tweets/i.test(text) && !/^\d+$/.test(text))) {
            if (text.length > topic.length) topic = text;
          }
        }

        if (!topic || seen.has(topic.toLowerCase())) continue;
        seen.add(topic.toLowerCase());

        // Parse tweet count
        let postCount = 0;
        const countMatch = tweetCount.match(/([\d,.]+)\s*([KMB])?/i);
        if (countMatch) {
          postCount = parseFloat(countMatch[1].replace(/,/g, ''));
          if (countMatch[2] === 'K') postCount *= 1000;
          if (countMatch[2] === 'M') postCount *= 1000000;
          if (countMatch[2] === 'B') postCount *= 1000000000;
        }

        const niche = classifyNiche(topic);

        trends.push({
          rank: trends.length + 1,
          topic,
          category: category || niche,
          niche,
          postCount,
          postCountRaw: tweetCount,
          scrapedAt: new Date().toISOString(),
        });
      }

      console.log(`   📜 Round ${round + 1}: ${trends.length} trends found`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return trends;
  };

  // ── localStorage history ───────────────────────────────────
  const loadHistory = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };

  // Merge snapshots saved by the older standalone monitor (which stored
  // `category` where this one stores `niche`) into this history, once.
  const migrateLegacyHistory = () => {
    try {
      const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacyRaw) return;
      const legacy = JSON.parse(legacyRaw);
      if (Array.isArray(legacy) && legacy.length > 0) {
        const converted = legacy.map(snap => ({
          timestamp: snap.timestamp,
          trends: (snap.trends || []).map(t => ({ topic: t.topic, rank: t.rank, postCount: t.postCount, niche: t.niche || t.category || classifyNiche(t.topic) })),
        }));
        const merged = [...loadHistory(), ...converted].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        while (merged.length > CONFIG.maxHistory) merged.shift();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        console.log(`📦 Merged ${legacy.length} snapshot(s) from the older trending monitor history.`);
      }
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (e) {
      console.warn(`⚠️ Could not merge older trend history: ${e.message}`);
    }
  };

  const saveSnapshot = (trends) => {
    try {
      const history = loadHistory();
      history.push({
        timestamp: new Date().toISOString(),
        trends: trends.map(t => ({ topic: t.topic, rank: t.rank, postCount: t.postCount, niche: t.niche })),
      });
      // Keep only last N
      while (history.length > CONFIG.maxHistory) history.shift();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn(`⚠️ Could not save trend history: ${e.message}`);
    }
  };

  // ── Compare with last snapshot ─────────────────────────────
  const compareWithLast = (currentTrends) => {
    const history = loadHistory();
    if (history.length < 2) {
      console.log('  📊 Not enough history to compare. Run again later.');
      return;
    }

    const prev = history[history.length - 2];
    const prevTopics = new Map(prev.trends.map(t => [t.topic.toLowerCase(), t]));

    console.log('\n━━━ 📈 TREND CHANGES (vs. last snapshot) ━━━');
    console.log(`  Last snapshot: ${new Date(prev.timestamp).toLocaleString()}\n`);

    const newTrends = [];
    const rising = [];
    const falling = [];

    for (const t of currentTrends) {
      const prevEntry = prevTopics.get(t.topic.toLowerCase());
      if (!prevEntry) {
        newTrends.push(t);
      } else if (t.rank < prevEntry.rank) {
        rising.push({ ...t, prevRank: prevEntry.rank, change: prevEntry.rank - t.rank });
      } else if (t.rank > prevEntry.rank) {
        falling.push({ ...t, prevRank: prevEntry.rank, change: t.rank - prevEntry.rank });
      }
    }

    if (newTrends.length > 0) {
      console.log(`  🆕 NEW TRENDS (${newTrends.length}):`);
      for (const t of newTrends.slice(0, 10)) {
        console.log(`     #${t.rank} ${t.topic} [${t.niche}]`);
      }
    }

    if (rising.length > 0) {
      console.log(`\n  📈 RISING (${rising.length}):`);
      for (const t of rising.sort((a, b) => b.change - a.change).slice(0, 5)) {
        console.log(`     ↑${t.change} ${t.topic} (#${t.prevRank} → #${t.rank})`);
      }
    }

    if (falling.length > 0) {
      console.log(`\n  📉 FALLING (${falling.length}):`);
      for (const t of falling.sort((a, b) => b.change - a.change).slice(0, 5)) {
        console.log(`     ↓${t.change} ${t.topic} (#${t.prevRank} → #${t.rank})`);
      }
    }

    // Dropped off entirely
    const currentTopicSet = new Set(currentTrends.map(t => t.topic.toLowerCase()));
    const dropped = prev.trends.filter(t => !currentTopicSet.has(t.topic.toLowerCase()));
    if (dropped.length > 0) {
      console.log(`\n  ❌ DROPPED OFF (${dropped.length}):`);
      for (const t of dropped.slice(0, 5)) {
        console.log(`     ${t.topic} (was #${t.rank})`);
      }
    }
  };

  // ── Controls ───────────────────────────────────────────────
  let autoRefreshTimer = null;

  window.XActions = window.XActions || {};

  window.XActions.watch = (keywords) => {
    if (!Array.isArray(keywords)) {
      console.log('❌ Usage: XActions.watch(["keyword1", "keyword2"])');
      return;
    }
    CONFIG.watchKeywords = keywords;
    console.log(`👁️ Watching for: ${keywords.join(', ')}`);
  };

  window.XActions.history = () => {
    const history = loadHistory();
    if (history.length === 0) { console.log('📭 No history yet.'); return; }
    console.log(`\n📊 TREND HISTORY (${history.length} snapshots):\n`);
    for (const snap of history.slice(-10)) {
      console.log(`  ${new Date(snap.timestamp).toLocaleString()} — ${snap.trends.length} trends`);
      console.log(`    Top: ${snap.trends.slice(0, 3).map(t => t.topic).join(', ')}`);
    }
  };

  window.XActions.compare = () => {
    const history = loadHistory();
    if (history.length < 2) { console.log('📊 Need at least 2 snapshots.'); return; }
    const latest = history[history.length - 1];
    compareWithLast(latest.trends);
  };

  window.XActions.autoRefresh = (intervalMs) => {
    intervalMs = intervalMs || CONFIG.checkInterval;
    if (autoRefreshTimer) clearInterval(autoRefreshTimer);
    console.log(`🔄 Auto-refreshing every ${(intervalMs / 60000).toFixed(1)} minutes.`);
    autoRefreshTimer = setInterval(() => {
      console.log('\n🔄 Auto-refresh triggered...');
      run();
    }, intervalMs);
  };

  window.XActions.stop = () => {
    if (autoRefreshTimer) { clearInterval(autoRefreshTimer); autoRefreshTimer = null; }
    console.log('⏹️ Auto-refresh stopped.');
  };

  // Stop switch for the repeating monitor (also used by the command center).
  window.stopTrendingMonitor = () => window.XActions.stop();

  // ── Main ───────────────────────────────────────────────────
  let scanCount = 0;

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📡 TRENDING TOPIC MONITOR' + ' '.repeat(W - 28) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    scanCount++;
    console.log(`\n📊 Scan ${scanCount} at ${new Date().toLocaleTimeString()}: scraping trending topics...\n`);
    const trends = await scrapeTrends();

    if (trends.length === 0) {
      console.error('❌ No trends found. Navigate to x.com/explore/tabs/trending first.');
      return;
    }

    // ── Display trends ──────────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  📡 TRENDING NOW (${trends.length} topics)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const t of trends) {
      const countStr = t.postCountRaw ? ` (${t.postCountRaw})` : '';
      const nicheTag = `[${t.niche}]`.padEnd(16);
      console.log(`  ${String(t.rank).padStart(2)}. ${nicheTag} ${t.topic}${countStr}`);
    }

    // ── Niche distribution ──────────────────────────────────
    console.log('\n━━━ 📊 NICHE DISTRIBUTION ━━━');
    const nicheCounts = {};
    for (const t of trends) nicheCounts[t.niche] = (nicheCounts[t.niche] || 0) + 1;
    const sorted = Object.entries(nicheCounts).sort((a, b) => b[1] - a[1]);
    for (const [niche, count] of sorted) {
      const bar = '█'.repeat(Math.round(count / trends.length * 30));
      console.log(`  ${niche.padEnd(16)} ${String(count).padStart(2)} (${((count / trends.length) * 100).toFixed(0)}%) ${bar}`);
    }

    // ── Keyword alerts ──────────────────────────────────────
    const keywordMatches = [];
    if (CONFIG.watchKeywords.length > 0) {
      console.log('\n━━━ 🔔 KEYWORD ALERTS ━━━');
      let found = 0;
      for (const t of trends) {
        for (const kw of CONFIG.watchKeywords) {
          if (t.topic.toLowerCase().includes(kw.toLowerCase())) {
            console.log(`  🚨 MATCH: "${t.topic}" matches keyword "${kw}" (rank #${t.rank})`);
            keywordMatches.push({ topic: t.topic, keyword: kw, rank: t.rank, postCount: t.postCount });
            found++;
          }
        }
      }
      if (found === 0) console.log('  No matches for your watched keywords.');
    }

    // ── Content opportunities ───────────────────────────────
    console.log('\n━━━ 💡 CONTENT OPPORTUNITIES ━━━');
    const highVolume = trends.filter(t => t.postCount > 10000).slice(0, 5);
    if (highVolume.length > 0) {
      console.log('  High-volume trends to potentially ride:');
      for (const t of highVolume) {
        console.log(`    → ${t.topic} (${t.postCountRaw}) [${t.niche}]`);
      }
    }

    // ── Save & Compare ──────────────────────────────────────
    saveSnapshot(trends);
    compareWithLast(trends);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📋 CONTROLS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  XActions.watch(["keyword1", ...])  — set alert keywords');
    console.log('  XActions.history()                  — view past snapshots');
    console.log('  XActions.compare()                  — compare last 2 snapshots');
    console.log('  XActions.autoRefresh(300000)        — refresh every 5min');
    console.log('  XActions.stop()                     — stop auto-refresh');
    console.log('  window.xactionsTrends               - latest scan snapshot');
    console.log('');

    const snapshot = {
      trends,
      analyzedAt: new Date().toISOString(),
      page: window.location.href,
      totalTrends: trends.length,
      watchKeywords: CONFIG.watchKeywords,
      keywordMatches,
      nicheMix: nicheCounts,
    };
    window.xactionsTrends = snapshot;

    // Export
    if (CONFIG.exportResults) {
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-trends-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Trends exported.');
    }
  };

  // ── Page check ─────────────────────────────────────────────
  if (!/(^|\.)x\.com$/.test(location.hostname) && !/(^|\.)twitter\.com$/.test(location.hostname)) {
    console.warn('⚠️ Not on x.com. Open x.com/explore/tabs/trending and run again.');
    return;
  }
  if (!/\/explore/.test(location.pathname)) {
    console.warn('⚠️ You are not on the Explore/Trends page. Go to x.com/explore/tabs/trending for the full list.');
    console.log('ℹ️ Continuing anyway in case trends are rendered in a sidebar.');
  }

  migrateLegacyHistory();

  run().then(() => {
    if (CONFIG.repeatIntervalMs > 0) {
      console.log('ℹ️ Repeat mode ON. To stop: window.stopTrendingMonitor()');
      window.XActions.autoRefresh(CONFIG.repeatIntervalMs);
    }
  });
})();

/**
 * ============================================================
 * 📡 Trending Topic Monitor — Production Grade
 * ============================================================
 *
 * @name        trendingTopicMonitor.js
 * @description Scrape and monitor X/Twitter trending topics in
 *              real-time. Tracks trend velocity (rising/falling),
 *              categorizes by niche, detects opportunities,
 *              persists history in localStorage for comparison,
 *              and alerts on trends matching your keywords.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/explore/tabs/trending
 *    (or x.com/explore → "Trending" tab)
 * 2. Open DevTools Console (F12)
 * 3. Paste and run
 *
 * Controls:
 *   XActions.watch(['AI', 'crypto', 'startup'])  — set alert keywords
 *   XActions.history()                            — view trend history
 *   XActions.compare()                            — compare vs last snapshot
 *   XActions.autoRefresh(300000)                  — auto-refresh every 5min
 *   XActions.stop()                               — stop auto-refresh
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
  };

  const STORAGE_KEY = 'xactions_trend_history';
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // ── Niche classification ───────────────────────────────────
  const NICHE_KEYWORDS = {
    'Tech':       ['ai', 'artificial intelligence', 'chatgpt', 'openai', 'google', 'apple', 'microsoft', 'meta', 'tesla', 'nvidia', 'coding', 'developer', 'software', 'app', 'web3', 'blockchain', 'crypto', 'bitcoin', 'ethereum', 'saas'],
    'Politics':   ['trump', 'biden', 'congress', 'senate', 'election', 'vote', 'democrat', 'republican', 'president', 'breaking', 'government', 'policy', 'law'],
    'Sports':     ['nfl', 'nba', 'mlb', 'soccer', 'football', 'basketball', 'baseball', 'game', 'championship', 'playoffs', 'fifa', 'ufc', 'boxing', 'f1', 'premier league'],
    'Entertainment': ['movie', 'film', 'music', 'album', 'concert', 'series', 'netflix', 'disney', 'grammy', 'oscar', 'emmy', 'celebrity', 'singer', 'rapper', 'actor'],
    'Business':   ['market', 'stock', 'earnings', 'ipo', 'startup', 'funding', 'recession', 'inflation', 'fed', 'wall street', 'investor', 'economy'],
    'Gaming':     ['game', 'gaming', 'playstation', 'xbox', 'nintendo', 'steam', 'esports', 'twitch', 'streamer', 'dlc'],
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
          if (/[\d,.]+[KM]?\s*(posts|tweets)/i.test(text)) {
            tweetCount = text;
          }
          // Topic: usually the boldest / largest text, starts with # or is prominently displayed
          if (text.startsWith('#') || (text.length > 2 && text.length < 80 && !text.includes('·') && !text.includes('Trending') && !/posts|tweets/i.test(text) && !/^\d+$/.test(text))) {
            if (text.length > topic.length) topic = text;
          }
        }

        if (!topic || seen.has(topic.toLowerCase())) continue;
        seen.add(topic.toLowerCase());

        // Parse tweet count
        let postCount = 0;
        const countMatch = tweetCount.match(/([\d,.]+)\s*([KM])?/i);
        if (countMatch) {
          postCount = parseFloat(countMatch[1].replace(/,/g, ''));
          if (countMatch[2] === 'K') postCount *= 1000;
          if (countMatch[2] === 'M') postCount *= 1000000;
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

  const saveSnapshot = (trends) => {
    const history = loadHistory();
    history.push({
      timestamp: new Date().toISOString(),
      trends: trends.map(t => ({ topic: t.topic, rank: t.rank, postCount: t.postCount, niche: t.niche })),
    });
    // Keep only last N
    while (history.length > CONFIG.maxHistory) history.shift();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
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

  window.XActions.autoRefresh = (intervalMs = 300000) => {
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

  // ── Main ───────────────────────────────────────────────────
  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📡 TRENDING TOPIC MONITOR' + ' '.repeat(W - 28) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log('\n📊 Scraping trending topics...\n');
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
    if (CONFIG.watchKeywords.length > 0) {
      console.log('\n━━━ 🔔 KEYWORD ALERTS ━━━');
      let found = 0;
      for (const t of trends) {
        for (const kw of CONFIG.watchKeywords) {
          if (t.topic.toLowerCase().includes(kw.toLowerCase())) {
            console.log(`  🚨 MATCH: "${t.topic}" matches keyword "${kw}" (rank #${t.rank})`);
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
    console.log('');

    // Export
    if (CONFIG.exportResults) {
      const blob = new Blob([JSON.stringify({ trends, analyzedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-trends-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Trends exported.');
    }
  };

  run();
})();

// scripts/keywordMonitor.js
// Browser console script for monitoring timeline keywords and alerting on matches
// Paste in DevTools console on x.com/search?q=keyword or x.com/home
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    keywords: ['AI', 'startup', 'web3'],  // Keywords to monitor
    checkInterval: 120000,   // Auto-refresh interval (ms) — 2 min
    maxAlerts: 50,           // Max alerts to store
    scrollRounds: 4,         // Scroll rounds per scan
    scrollDelay: 1500,       // ms between scrolls
    minLikes: 0,             // Min likes to include
    sound: true,             // Beep on new mentions
    exportResults: true,     // Auto-download JSON
  };
  // =============================================

  const STORAGE_KEY = 'xactions_keyword_monitor';

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

  const loadData = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"mentions":[],"scans":0}'); } catch { return { mentions: [], scans: 0 }; } };
  const saveData = (d) => { while (d.mentions.length > CONFIG.maxAlerts) d.mentions.shift(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); };

  const beep = () => {
    if (!CONFIG.sound) return;
    try { const ctx = new AudioContext(); const o = ctx.createOscillator(); o.connect(ctx.destination); o.frequency.value = 800; o.start(); o.stop(ctx.currentTime + 0.15); } catch {}
  };

  let autoTimer = null;

  const detectKeywords = () => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('q');
    return q ? [q] : CONFIG.keywords;
  };

  const scrapeMentions = async () => {
    const mentions = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      for (const article of articles) {
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.textContent.trim() : '';
        if (!text || seen.has(text.slice(0, 80))) continue;
        seen.add(text.slice(0, 80));

        const authorLink = article.querySelector('a[href^="/"][role="link"]');
        const authorMatch = authorLink ? (authorLink.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/) : null;
        const author = authorMatch ? authorMatch[1] : 'unknown';

        const likeBtn = article.querySelector('[data-testid="like"] span') || article.querySelector('[data-testid="unlike"] span');
        const likes = likeBtn ? parseNum(likeBtn.textContent) : 0;
        if (likes < CONFIG.minLikes) continue;

        const timeEl = article.querySelector('time');
        const datetime = timeEl ? timeEl.getAttribute('datetime') : null;

        mentions.push({ author, text: text.slice(0, 200), datetime, likes, scrapedAt: new Date().toISOString() });
      }
      console.log(`   📜 Round ${round + 1}: ${mentions.length} mentions`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
    return mentions;
  };

  const scan = async () => {
    const keywords = detectKeywords();

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  🔍 KEYWORD MONITOR                            ║');
    console.log('║  by nichxbt — v1.0                            ║');
    console.log('╚════════════════════════════════════════════════╝');

    if (keywords.length === 0) {
      console.log('\n❌ No keywords. Set CONFIG.keywords or navigate to x.com/search?q=keyword');
      return;
    }
    console.log(`\n🔍 Keywords: ${keywords.join(', ')}`);
    console.log('📊 Scanning...\n');

    const mentions = await scrapeMentions();
    if (mentions.length === 0) { console.log('❌ No mentions found.'); return; }

    const data = loadData();
    const existingFps = new Set(data.mentions.map(m => m.text.slice(0, 80)));
    const newMentions = mentions.filter(m => !existingFps.has(m.text.slice(0, 80)));
    data.mentions.push(...newMentions);
    data.scans++;
    saveData(data);

    console.log(`━━━ 📊 RESULTS (${mentions.length} total, ${newMentions.length} new) ━━━\n`);

    // Top by likes
    const sorted = [...mentions].sort((a, b) => b.likes - a.likes);
    console.log('🔥 TOP MENTIONS:');
    sorted.slice(0, 10).forEach(m => console.log(`  @${m.author.padEnd(16)} ${String(m.likes).padStart(5)} ❤️ — "${m.text.slice(0, 50)}..."`));

    // New mentions
    if (newMentions.length > 0) {
      console.log(`\n🆕 NEW (${newMentions.length}):`);
      newMentions.slice(0, 8).forEach(m => console.log(`  🔔 @${m.author}: "${m.text.slice(0, 60)}..."`));
      beep();
    }

    // Top mentioners
    const authorCounts = {};
    mentions.forEach(m => { authorCounts[m.author] = (authorCounts[m.author] || 0) + 1; });
    const topAuthors = Object.entries(authorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log('\n👥 TOP MENTIONERS:');
    topAuthors.forEach(([author, count]) => console.log(`  @${author.padEnd(16)} ${count} mentions`));

    // Quick sentiment
    const pos = ['love', 'great', 'amazing', 'awesome', 'best', '🔥', '💯', '❤️'];
    const neg = ['hate', 'terrible', 'awful', 'worst', 'scam', '👎'];
    let posC = 0, negC = 0;
    mentions.forEach(m => {
      const l = m.text.toLowerCase();
      if (pos.some(w => l.includes(w))) posC++;
      if (neg.some(w => l.includes(w))) negC++;
    });
    console.log(`\n📊 Sentiment: ✅ ${posC} positive | ❌ ${negC} negative | ⚖️ ${mentions.length - posC - negC} neutral`);
    console.log('');

    if (CONFIG.exportResults) {
      download({ keywords, mentions, newMentions: newMentions.length, topAuthors, scanTime: new Date().toISOString() }, `xactions-keyword-${Date.now()}.json`);
    }
  };

  window.XActions = window.XActions || {};
  window.XActions.monitor = (kws) => {
    CONFIG.keywords = kws;
    const q = encodeURIComponent(kws.join(' OR '));
    window.location.href = `https://x.com/search?q=${q}&src=typed_query&f=live`;
    setTimeout(scan, 5000);
  };
  window.XActions.scan = scan;
  window.XActions.autoRefresh = (ms) => {
    if (autoTimer) clearInterval(autoTimer);
    const interval = ms || CONFIG.checkInterval;
    console.log(`🔄 Auto-refreshing every ${(interval / 60000).toFixed(1)} min.`);
    autoTimer = setInterval(() => { console.log('\n🔄 Refreshing...'); window.scrollTo(0, 0); setTimeout(scan, 2000); }, interval);
  };
  window.XActions.stop = () => { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } console.log('⏹️ Stopped.'); };
  window.XActions.history = () => {
    const d = loadData();
    if (d.mentions.length === 0) { console.log('📭 No history.'); return; }
    d.mentions.slice(-15).forEach(m => console.log(`  @${m.author}: "${m.text.slice(0, 60)}..."`));
  };
  window.XActions.reset = () => { localStorage.removeItem(STORAGE_KEY); console.log('🗑️ Cleared.'); };

  if (window.location.href.includes('/search')) scan();
  else {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║  🔍 KEYWORD MONITOR — Ready                    ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('\n📋 XActions.monitor(["kw1","kw2"]) or XActions.scan() on a search page');
  }
})();

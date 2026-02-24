// scripts/contentRepurposer.js
// Browser console script for repurposing top tweets into threads, storms, blog outlines
// Paste in DevTools console on x.com/YOUR_USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxTweets: 30,           // Max tweets to scrape
    scrollRounds: 5,         // Scroll rounds
    scrollDelay: 1800,       // ms between scrolls
    exportResults: true,     // Auto-download JSON
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  let tweets = [];
  const repurposed = [];

  const scrapeTweets = async () => {
    console.log('🔍 Scanning timeline for tweets to repurpose...\n');
    const seen = new Set();
    tweets = [];

    for (let round = 0; round < CONFIG.scrollRounds && tweets.length < CONFIG.maxTweets; round++) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      for (const article of articles) {
        if (tweets.length >= CONFIG.maxTweets) break;
        const textEl = article.querySelector('[data-testid="tweetText"]');
        if (!textEl) continue;
        const text = textEl.textContent.trim();
        if (text.length < 10 || seen.has(text.slice(0, 80))) continue;
        seen.add(text.slice(0, 80));

        const metricsBar = article.querySelector('[role="group"]');
        const metricEls = metricsBar ? metricsBar.querySelectorAll('[data-testid]') : [];
        const metrics = { replies: 0, retweets: 0, likes: 0 };
        for (const el of metricEls) {
          const tid = el.getAttribute('data-testid') || '';
          const val = parseInt((el.textContent || '').replace(/[,\s]/g, ''), 10) || 0;
          if (tid.includes('reply')) metrics.replies = val;
          else if (tid.includes('retweet')) metrics.retweets = val;
          else if (tid.includes('like')) metrics.likes = val;
        }

        const timeLink = article.querySelector('time')?.closest('a');
        const url = timeLink ? 'https://x.com' + timeLink.getAttribute('href') : '';

        tweets.push({ index: tweets.length, text, metrics, url, charCount: text.length, wordCount: text.split(/\s+/).length });
      }
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
    console.log(`✅ Found ${tweets.length} tweets. Use XActions.list() to see them.\n`);
  };

  const splitChunks = (text, maxLen) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let current = '';
    for (const s of sentences) {
      const trimmed = s.trim();
      if ((current + ' ' + trimmed).trim().length <= maxLen) {
        current = (current + ' ' + trimmed).trim();
      } else {
        if (current) chunks.push(current);
        current = trimmed;
      }
    }
    if (current) chunks.push(current);
    return chunks;
  };

  const toThread = (idx) => {
    const t = tweets[idx];
    if (!t) { console.log('❌ Invalid index.'); return; }
    const hook = t.text.split(/\s+/).slice(0, 8).join(' ');
    const chunks = splitChunks(t.text, 260);
    const parts = [{ n: 1, text: `${hook}...\n\nHere's what most people get wrong 🧵👇`, role: 'Hook' }];
    chunks.forEach((c, i) => parts.push({ n: i + 2, text: c, role: `Body ${i + 1}` }));
    parts.push({ n: parts.length + 1, text: `TL;DR:\n\n${t.text.slice(0, 180)}\n\nRT the first tweet ♻️`, role: 'CTA' });

    console.log(`\n🧵 THREAD from tweet #${idx} (${parts.length} parts):`);
    parts.forEach(p => console.log(`  ${p.n}/ [${p.role}] "${p.text.slice(0, 100)}..."`));
    repurposed.push({ type: 'thread', sourceIndex: idx, parts });
  };

  const toSummary = (idx) => {
    const t = tweets[idx];
    if (!t) { console.log('❌ Invalid index.'); return; }
    const first = (t.text.match(/[^.!?]+[.!?]+/) || [t.text.slice(0, 100)])[0].trim();
    const variations = [
      { label: 'Punchy', text: first },
      { label: 'Question', text: `What if ${first.toLowerCase()}` },
      { label: 'Stat', text: `${t.wordCount} words, 1 truth:\n\n${first}` },
    ];
    console.log(`\n📝 SUMMARIES from tweet #${idx}:`);
    variations.forEach(v => console.log(`  [${v.label}] (${v.text.length} chars) "${v.text}"`));
    repurposed.push({ type: 'summary', sourceIndex: idx, variations });
  };

  const toStorm = (idx) => {
    const t = tweets[idx];
    if (!t) { console.log('❌ Invalid index.'); return; }
    const chunks = splitChunks(t.text, 260);
    const total = chunks.length;
    console.log(`\n⛈️ TWEET STORM from tweet #${idx} (${total} tweets):`);
    chunks.forEach((c, i) => console.log(`  ${i + 1}/${total} "${c}"`));
    repurposed.push({ type: 'storm', sourceIndex: idx, parts: chunks.map((c, i) => `${i + 1}/${total} ${c}`) });
  };

  const toQuoteTemplates = (idx) => {
    const t = tweets[idx];
    if (!t) { console.log('❌ Invalid index.'); return; }
    const firstLine = t.text.split(/[.!?\n]/)[0]?.trim() || t.text.slice(0, 60);
    const templates = [
      { style: 'Agreement', text: `This. 100%.\n\n"${firstLine}"\n\nPeople still sleeping on this. 👇` },
      { style: 'Personal', text: `I've been saying this for months.\n\n"${firstLine}"\n\nHere's what I'd add:` },
      { style: 'Contrarian', text: `Hot take: this is only half the story.\n\n"${firstLine}"\n\nWhat's missing:` },
    ];
    console.log(`\n💬 QUOTE TEMPLATES from tweet #${idx}:`);
    templates.forEach(tp => console.log(`  [${tp.style}] "${tp.text}"`));
    repurposed.push({ type: 'quoteTemplates', sourceIndex: idx, templates });
  };

  const listTweets = () => {
    if (tweets.length === 0) { console.log('❌ Run XActions.scan() first.'); return; }
    console.log(`\n📋 TWEETS (${tweets.length}):\n`);
    tweets.forEach(t => console.log(`  [${t.index}] "${t.text.slice(0, 80)}..." — ❤️${t.metrics.likes} 🔄${t.metrics.retweets}`));
  };

  const exportAll = () => {
    if (repurposed.length === 0) { console.log('❌ No repurposed content yet.'); return; }
    download({ tweets: tweets.map(t => ({ index: t.index, text: t.text, metrics: t.metrics, url: t.url })), repurposed, generatedAt: new Date().toISOString() }, `xactions-repurposed-${Date.now()}.json`);
  };

  window.XActions = window.XActions || {};
  window.XActions.scan = scrapeTweets;
  window.XActions.list = listTweets;
  window.XActions.toThread = toThread;
  window.XActions.toSummary = toSummary;
  window.XActions.toStorm = toStorm;
  window.XActions.toQuoteTemplates = toQuoteTemplates;
  window.XActions.all = (idx) => { toThread(idx); toSummary(idx); toStorm(idx); toQuoteTemplates(idx); };
  window.XActions.export = exportAll;

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  ♻️ CONTENT REPURPOSER — Ready                 ║');
  console.log('║  by nichxbt — v1.0                            ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('\n📋 XActions.scan() → .list() → .toThread(i) / .toSummary(i) / .toStorm(i) / .toQuoteTemplates(i) / .all(i)');
  console.log('   XActions.export() to download JSON');
})();

// scripts/businessTools.js
// Browser console script for brand mention monitoring and sentiment analysis
// Paste in DevTools console on x.com/search or any timeline
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    brandName: 'XActions',
    maxTweets: 30,
    scrollDelay: 1500,
    exportResults: true,
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

  const parseMetric = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const POSITIVE_WORDS = ['love', 'great', 'amazing', 'awesome', 'excellent', 'best', 'good', 'fantastic', 'perfect', 'brilliant', 'helpful', 'recommend', '🔥', '❤️', '👏', '💯', '🙌'];
  const NEGATIVE_WORDS = ['hate', 'terrible', 'worst', 'bad', 'awful', 'horrible', 'scam', 'broken', 'trash', 'useless', 'disappointed', 'bug', '💩', '👎', '😡'];

  const analyzeSentiment = (text) => {
    const lower = text.toLowerCase();
    let posScore = 0;
    let negScore = 0;
    for (const w of POSITIVE_WORDS) { if (lower.includes(w)) posScore++; }
    for (const w of NEGATIVE_WORDS) { if (lower.includes(w)) negScore++; }
    if (posScore > negScore) return 'positive';
    if (negScore > posScore) return 'negative';
    return 'neutral';
  };

  const run = async () => {
    console.log(`🏢 Business Tools — Brand Monitor: "${CONFIG.brandName}"`);
    console.log('━'.repeat(50));

    // Navigate to search if not already there
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(CONFIG.brandName)}&f=live`;
    if (!window.location.href.includes('/search')) {
      console.log(`🔍 Navigating to search for "${CONFIG.brandName}"...`);
      window.location.href = searchUrl;
      return; // Page will reload; user re-pastes or script continues after load
    }

    console.log(`🔍 Scanning tweets mentioning "${CONFIG.brandName}"...\n`);

    const mentions = [];
    const seen = new Set();
    let scrollRounds = 0;
    const maxRounds = Math.ceil(CONFIG.maxTweets / 3) + 3;

    while (mentions.length < CONFIG.maxTweets && scrollRounds < maxRounds) {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (const article of articles) {
        if (mentions.length >= CONFIG.maxTweets) break;

        const linkEl = article.querySelector('a[href*="/status/"]');
        const href = linkEl?.href || '';
        if (seen.has(href)) continue;
        seen.add(href);

        const text = article.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || '';
        const authorEl = article.querySelector('[data-testid="User-Name"]');
        const author = authorEl?.querySelector('a')?.textContent?.trim() || '';
        const handle = authorEl?.querySelector('a[href]')?.href?.split('/').pop() || '';
        const timeEl = article.querySelector('time');
        const datetime = timeEl?.getAttribute('datetime') || '';

        const likes = parseMetric(article.querySelector('[data-testid="like"] span')?.textContent);
        const reposts = parseMetric(article.querySelector('[data-testid="retweet"] span')?.textContent);
        const replies = parseMetric(article.querySelector('[data-testid="reply"] span')?.textContent);

        const sentiment = analyzeSentiment(text);
        const totalEngagement = likes + reposts + replies;

        mentions.push({
          url: href,
          text: text.slice(0, 280),
          author,
          handle,
          datetime,
          likes,
          reposts,
          replies,
          totalEngagement,
          sentiment,
        });
      }

      console.log(`📜 Scroll ${scrollRounds + 1}: ${mentions.length}/${CONFIG.maxTweets} mentions found`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrollRounds++;
    }

    if (mentions.length === 0) {
      console.error(`❌ No mentions found for "${CONFIG.brandName}". Try a different keyword.`);
      return;
    }

    console.log(`\n✅ Found ${mentions.length} mentions. Analyzing...\n`);

    // --- Sentiment breakdown ---
    const positive = mentions.filter(m => m.sentiment === 'positive');
    const negative = mentions.filter(m => m.sentiment === 'negative');
    const neutral = mentions.filter(m => m.sentiment === 'neutral');

    console.log('━━━ 💬 SENTIMENT ANALYSIS ━━━');
    console.log(`  ✅ Positive: ${positive.length} (${((positive.length / mentions.length) * 100).toFixed(0)}%)`);
    console.log(`  ❌ Negative: ${negative.length} (${((negative.length / mentions.length) * 100).toFixed(0)}%)`);
    console.log(`  ➖ Neutral:  ${neutral.length} (${((neutral.length / mentions.length) * 100).toFixed(0)}%)`);

    const sentimentBar = (label, count, total, char) => {
      const width = Math.round((count / total) * 30);
      return `  ${label} ${char.repeat(width)} ${count}`;
    };
    console.log('\n' + sentimentBar('👍', positive.length, mentions.length, '█'));
    console.log(sentimentBar('👎', negative.length, mentions.length, '█'));
    console.log(sentimentBar('😐', neutral.length, mentions.length, '░'));

    // --- Engagement stats ---
    const totalEng = mentions.reduce((s, m) => s + m.totalEngagement, 0);
    const avgEng = totalEng / mentions.length;

    console.log('\n━━━ 📊 ENGAGEMENT AROUND BRAND ━━━');
    console.log(`  Total engagement: ${totalEng.toLocaleString()}`);
    console.log(`  Avg per mention: ${avgEng.toFixed(1)}`);

    // --- Top mentions ---
    const topMentions = [...mentions].sort((a, b) => b.totalEngagement - a.totalEngagement).slice(0, 5);
    console.log('\n━━━ 🔥 TOP MENTIONS (by engagement) ━━━');
    for (const m of topMentions) {
      const emoji = m.sentiment === 'positive' ? '✅' : m.sentiment === 'negative' ? '❌' : '➖';
      console.log(`  ${emoji} @${m.handle} (${m.totalEngagement} eng) — "${m.text.slice(0, 70)}..."`);
    }

    // --- Key voices ---
    if (positive.length > 0) {
      const top = [...positive].sort((a, b) => b.totalEngagement - a.totalEngagement)[0];
      console.log(`\n  🌟 Top advocate: @${top.handle} — "${top.text.slice(0, 60)}..."`);
    }
    if (negative.length > 0) {
      const top = [...negative].sort((a, b) => b.totalEngagement - a.totalEngagement)[0];
      console.log(`  ⚠️ Top critic:   @${top.handle} — "${top.text.slice(0, 60)}..."`);
    }

    // --- Export ---
    if (CONFIG.exportResults) {
      const report = {
        brand: CONFIG.brandName,
        summary: {
          totalMentions: mentions.length,
          sentiment: { positive: positive.length, negative: negative.length, neutral: neutral.length },
          totalEngagement: totalEng,
          avgEngagement: avgEng.toFixed(1),
        },
        topMentions: topMentions.map(m => ({ url: m.url, author: m.handle, sentiment: m.sentiment, engagement: m.totalEngagement })),
        mentions,
        scannedAt: new Date().toISOString(),
      };
      download(report, `xactions-brand-monitor-${CONFIG.brandName}-${new Date().toISOString().slice(0, 10)}.json`);
    }

    console.log('\n✅ Brand monitoring complete.');
  };

  run();
})();

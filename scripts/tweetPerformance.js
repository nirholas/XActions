// scripts/tweetPerformance.js
// Browser console script for ranking tweets by engagement and categorizing by type
// Paste in DevTools console on x.com/USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxTweets: 30,
    scrollRounds: 5,
    scrollDelay: 1500,
    excludeRetweets: true,
    exportResults: true,
  };
  // =============================================

  const parseCount = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n);

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const collectTweets = () => {
    const tweets = [];
    const seen = new Set();

    document.querySelectorAll('article[data-testid="tweet"]').forEach(article => {
      if (CONFIG.excludeRetweets) {
        const ctx = article.querySelector('[data-testid="socialContext"]');
        if (ctx && /reposted|retweeted/i.test(ctx.textContent)) return;
      }

      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl ? textEl.textContent.trim() : '';
      if (seen.has(text) && text.length > 0) return;
      if (text.length > 0) seen.add(text);

      const groups = article.querySelectorAll('[role="group"] button');
      let replies = 0, retweets = 0, likes = 0, views = 0;
      for (const btn of groups) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const count = parseCount(btn.textContent);
        if (label.includes('repl')) replies = count;
        else if (label.includes('repost') || label.includes('retweet')) retweets = count;
        else if (label.includes('like')) likes = count;
        else if (label.includes('view')) views = count;
      }
      if (views === 0) {
        const viewBtn = article.querySelector('a[href*="/analytics"]');
        if (viewBtn) views = parseCount(viewBtn.textContent);
      }

      const hasImage = !!article.querySelector('[data-testid="tweetPhoto"]');
      const hasVideo = !!article.querySelector('[data-testid="videoPlayer"]');
      const hasLink = !!article.querySelector('[data-testid="card.wrapper"]');
      const hasPoll = !!article.querySelector('[data-testid="poll"]');
      const type = hasPoll ? 'poll' : hasVideo ? 'video' : hasImage ? 'image' : hasLink ? 'link' : 'text';

      const timeEl = article.querySelector('time');
      const engagement = replies + retweets + likes;
      const engagementRate = views > 0 ? ((engagement / views) * 100) : 0;

      tweets.push({
        text: text.slice(0, 200), type, replies, retweets, likes, views, engagement,
        engagementRate: Math.round(engagementRate * 100) / 100,
        timestamp: timeEl?.getAttribute('datetime') || null,
        hashtags: (text.match(/#\w+/g) || []),
      });
    });
    return tweets;
  };

  const run = async () => {
    console.log('🎯 TWEET PERFORMANCE COMPARATOR — by nichxbt\n');

    const allTweets = new Map();
    for (let round = 0; round < CONFIG.scrollRounds && allTweets.size < CONFIG.maxTweets; round++) {
      const found = collectTweets();
      for (const t of found) {
        if (allTweets.size >= CONFIG.maxTweets) break;
        const key = t.text || `tweet_${allTweets.size}`;
        if (!allTweets.has(key)) allTweets.set(key, t);
      }
      console.log(`   📜 Round ${round + 1}: ${allTweets.size} tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const tweets = [...allTweets.values()];
    if (tweets.length < 2) { console.error('❌ Need at least 2 tweets.'); return; }

    // Rankings
    const byEng = [...tweets].sort((a, b) => b.engagement - a.engagement);
    const byRate = [...tweets].filter(t => t.views > 100).sort((a, b) => b.engagementRate - a.engagementRate);
    const byViews = [...tweets].sort((a, b) => b.views - a.views);

    console.log('\n🏆 TOP BY ENGAGEMENT:');
    byEng.slice(0, 5).forEach(t => console.log(`  ${fmt(t.engagement)} (❤️${fmt(t.likes)} 🔄${fmt(t.retweets)} 💬${fmt(t.replies)}) — "${t.text.slice(0, 80)}..."`));

    console.log('\n📊 TOP BY RATE (eng/views):');
    byRate.slice(0, 5).forEach(t => console.log(`  ${t.engagementRate}% (${fmt(t.views)} views) — "${t.text.slice(0, 80)}..."`));

    console.log('\n👀 TOP BY VIEWS:');
    byViews.slice(0, 5).forEach(t => console.log(`  ${fmt(t.views)} views — "${t.text.slice(0, 80)}..."`));

    // Category breakdown
    const categories = {};
    tweets.forEach(t => { categories[t.type] = categories[t.type] || []; categories[t.type].push(t); });
    const avgEng = (arr) => arr.length > 0 ? Math.round(arr.reduce((s, t) => s + t.engagement, 0) / arr.length) : 0;

    console.log('\n📐 BY CONTENT TYPE:');
    Object.entries(categories).sort((a, b) => avgEng(b[1]) - avgEng(a[1])).forEach(([type, arr]) => {
      console.log(`  ${type.padEnd(8)} avg ${fmt(avgEng(arr))} engagement (${arr.length} tweets)`);
    });

    // Media impact
    const withMedia = tweets.filter(t => ['image', 'video'].includes(t.type));
    const noMedia = tweets.filter(t => t.type === 'text');
    console.log(`\n📸 Media: avg ${fmt(avgEng(withMedia))} eng (${withMedia.length}) vs Text: avg ${fmt(avgEng(noMedia))} eng (${noMedia.length})`);

    // Averages
    const avg = (key) => Math.round(tweets.reduce((s, t) => s + t[key], 0) / tweets.length);
    console.log(`\n📊 AVERAGES: ❤️${fmt(avg('likes'))} 🔄${fmt(avg('retweets'))} 💬${fmt(avg('replies'))} 👀${fmt(avg('views'))}`);

    if (CONFIG.exportResults) {
      download({
        summary: { total: tweets.length, avgLikes: avg('likes'), avgRetweets: avg('retweets'), avgViews: avg('views') },
        rankings: { byEngagement: byEng.slice(0, 10), byRate: byRate.slice(0, 10) },
        allTweets: tweets,
        analyzedAt: new Date().toISOString(),
      }, `xactions-performance-${new Date().toISOString().slice(0, 10)}.json`);
      console.log('\n📥 Results exported as JSON.');
    }
  };

  run();
})();

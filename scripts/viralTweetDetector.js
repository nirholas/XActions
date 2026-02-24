// scripts/viralTweetDetector.js
// Browser console script for detecting tweets with unusually high engagement (viral)
// Paste in DevTools console on x.com (any timeline or search)
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxTweets: 30,
    scrollRounds: 3,
    viralThreshold: 0.05,   // 5% engagement rate = viral
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
      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl ? textEl.textContent.trim() : '';
      if (text.length < 5 || seen.has(text)) return;
      seen.add(text);

      const authorLink = article.querySelector('a[href^="/"][role="link"]');
      const author = authorLink ? (authorLink.getAttribute('href') || '').replace('/', '').split('/')[0] : 'unknown';

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

      const timeEl = article.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;
      const ageHours = timestamp ? Math.max(0.1, (Date.now() - new Date(timestamp).getTime()) / 3600000) : 0;

      const engagement = replies + retweets + likes;
      const engagementRate = views > 0 ? engagement / views : 0;
      const velocity = ageHours > 0 ? engagement / ageHours : 0;

      const hasImage = !!article.querySelector('[data-testid="tweetPhoto"]');
      const hasVideo = !!article.querySelector('[data-testid="videoPlayer"]');

      tweets.push({
        text: text.slice(0, 200), author,
        replies, retweets, likes, views, engagement,
        engagementRate: Math.round(engagementRate * 10000) / 10000,
        velocity: Math.round(velocity),
        ageHours: Math.round(ageHours * 10) / 10,
        timestamp, hasImage, hasVideo,
      });
    });
    return tweets;
  };

  const getViralLevel = (tweet) => {
    let score = 0;
    const threshold = CONFIG.viralThreshold;
    if (tweet.engagementRate >= threshold * 4) score += 3;
    else if (tweet.engagementRate >= threshold * 2) score += 2;
    else if (tweet.engagementRate >= threshold) score += 1;

    if (tweet.velocity > 500) score += 3;
    else if (tweet.velocity > 100) score += 2;
    else if (tweet.velocity > 20) score += 1;

    if (tweet.engagement > 0 && tweet.retweets / tweet.engagement > 0.3) score += 1;

    if (score >= 5) return { level: 'MEGA VIRAL', emoji: '🌋', stars: 5 };
    if (score >= 4) return { level: 'VIRAL', emoji: '🔥', stars: 4 };
    if (score >= 3) return { level: 'GOING VIRAL', emoji: '📈', stars: 3 };
    if (score >= 2) return { level: 'TRENDING', emoji: '⚡', stars: 2 };
    if (score >= 1) return { level: 'HOT', emoji: '🌡️', stars: 1 };
    return { level: 'NORMAL', emoji: '📊', stars: 0 };
  };

  const run = async () => {
    console.log('🎯 VIRAL TWEET DETECTOR — by nichxbt\n');

    const allTweets = new Map();
    for (let round = 0; round < CONFIG.scrollRounds && allTweets.size < CONFIG.maxTweets; round++) {
      const found = collectTweets();
      for (const t of found) {
        if (allTweets.size >= CONFIG.maxTweets) break;
        if (!allTweets.has(t.text)) allTweets.set(t.text, t);
      }
      console.log(`   📜 Round ${round + 1}: ${allTweets.size} tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1500);
    }

    const tweets = [...allTweets.values()];
    if (tweets.length === 0) { console.error('❌ No tweets found!'); return; }

    const classified = tweets.map(t => ({ ...t, viral: getViralLevel(t) }));
    const viralTweets = classified.filter(t => t.viral.stars >= 2);
    const megaViral = classified.filter(t => t.viral.stars >= 4);

    console.log('\n🎯 VIRAL DETECTION RESULTS:');
    console.log(`  🔍 Scanned: ${tweets.length}`);
    console.log(`  🔥 Viral/trending: ${viralTweets.length}`);
    console.log(`  🌋 Mega viral: ${megaViral.length}`);

    const byVelocity = classified.filter(t => t.viral.stars >= 1).sort((a, b) => b.velocity - a.velocity);

    if (byVelocity.length > 0) {
      console.log('\n🏆 HOTTEST TWEETS:');
      byVelocity.slice(0, 10).forEach(t => {
        const stars = '⭐'.repeat(t.viral.stars);
        console.log(`\n  ${t.viral.emoji} ${t.viral.level} ${stars}`);
        console.log(`     @${t.author} | ${fmt(t.velocity)} eng/hr | ${(t.engagementRate * 100).toFixed(2)}% rate | ${t.ageHours}h old`);
        console.log(`     ❤️${fmt(t.likes)} 🔄${fmt(t.retweets)} 💬${fmt(t.replies)} 👀${fmt(t.views)}`);
        console.log(`     "${t.text.slice(0, 100)}..."`);
      });
    } else {
      console.log('\n📊 No viral tweets detected. Try a trending topic.');
    }

    // Viral patterns
    if (viralTweets.length >= 3) {
      const avgLen = Math.round(viralTweets.reduce((s, t) => s + t.text.length, 0) / viralTweets.length);
      const withMedia = viralTweets.filter(t => t.hasImage || t.hasVideo).length;
      console.log('\n📐 VIRAL PATTERNS:');
      console.log(`  Avg length: ${avgLen} chars`);
      console.log(`  With media: ${((withMedia / viralTweets.length) * 100).toFixed(0)}%`);

      const hours = viralTweets.filter(t => t.timestamp).map(t => new Date(t.timestamp).getHours());
      if (hours.length > 0) {
        const hourCounts = {};
        hours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
        const top = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
        console.log(`  Peak viral hour: ${top[0].padStart(2, '0')}:00 (${top[1]} viral tweets)`);
      }
    }

    if (CONFIG.exportResults && classified.length > 0) {
      download({
        summary: { scanned: tweets.length, viral: viralTweets.length, megaViral: megaViral.length },
        tweets: classified.sort((a, b) => b.viral.stars - a.viral.stars || b.velocity - a.velocity),
        analyzedAt: new Date().toISOString(),
        page: window.location.href,
      }, `xactions-viral-${new Date().toISOString().slice(0, 10)}.json`);
      console.log('\n📥 Results exported as JSON.');
    }
  };

  run();
})();

/**
 * ============================================================
 * 🎯 Viral Tweet Detector — Production Grade
 * ============================================================
 *
 * @name        viralTweetDetector.js
 * @description Scan any timeline and identify tweets going viral
 *              in real-time. Calculates velocity (engagement/hour)
 *              and flags tweets with abnormally high engagement
 *              relative to the author's follower count.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to any timeline, search, or explore page on x.com
 * 2. Open DevTools Console (F12)
 * 3. Paste and run
 * 4. Identifies tweets with viral potential
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxTweets: 80,
    scrollRounds: 5,
    scrollDelay: 2000,
    viralThreshold: 2.0,             // Engagement rate % above which = viral
    velocityThreshold: 50,            // Eng/hour above which = going viral
    exportResults: true,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };
  const fmt = (n) => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : String(n);

  const collectTweets = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const tweets = [];
    const seen = new Set();

    for (const article of articles) {
      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl ? textEl.textContent.trim() : '';
      if (text.length < 5) continue;
      if (seen.has(text)) continue;
      seen.add(text);

      const authorLink = article.querySelector('a[href^="/"][role="link"]');
      const author = authorLink ? (authorLink.getAttribute('href') || '').replace('/', '').split('/')[0] : 'unknown';

      // Metrics
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

      // Timestamp
      const timeEl = article.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;
      let ageHours = 0;
      if (timestamp) {
        ageHours = Math.max(0.1, (Date.now() - new Date(timestamp).getTime()) / 3600000);
      }

      const engagement = replies + retweets + likes;
      const engagementRate = views > 0 ? (engagement / views) * 100 : 0;
      const velocity = ageHours > 0 ? engagement / ageHours : 0;

      // Media
      const hasImage = !!article.querySelector('[data-testid="tweetPhoto"]');
      const hasVideo = !!article.querySelector('[data-testid="videoPlayer"]');

      tweets.push({
        text: text.slice(0, 200), author,
        replies, retweets, likes, views, engagement,
        engagementRate: Math.round(engagementRate * 100) / 100,
        velocity: Math.round(velocity),
        ageHours: Math.round(ageHours * 10) / 10,
        timestamp, hasImage, hasVideo,
      });
    }
    return tweets;
  };

  const getViralLevel = (tweet) => {
    let score = 0;
    if (tweet.engagementRate > CONFIG.viralThreshold * 2) score += 3;
    else if (tweet.engagementRate > CONFIG.viralThreshold) score += 2;
    else if (tweet.engagementRate > CONFIG.viralThreshold * 0.5) score += 1;

    if (tweet.velocity > CONFIG.velocityThreshold * 10) score += 3;
    else if (tweet.velocity > CONFIG.velocityThreshold) score += 2;
    else if (tweet.velocity > CONFIG.velocityThreshold * 0.3) score += 1;

    // Retweet ratio (viral tweets tend to get more RTs)
    if (tweet.engagement > 0 && tweet.retweets / tweet.engagement > 0.3) score += 1;

    if (score >= 5) return { level: 'MEGA VIRAL', emoji: '🌋', stars: 5 };
    if (score >= 4) return { level: 'VIRAL', emoji: '🔥', stars: 4 };
    if (score >= 3) return { level: 'GOING VIRAL', emoji: '📈', stars: 3 };
    if (score >= 2) return { level: 'TRENDING', emoji: '⚡', stars: 2 };
    if (score >= 1) return { level: 'HOT', emoji: '🌡️', stars: 1 };
    return { level: 'NORMAL', emoji: '📊', stars: 0 };
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🎯 VIRAL TWEET DETECTOR' + ' '.repeat(W - 26) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log(`\n📊 Scanning up to ${CONFIG.maxTweets} tweets...\n`);

    const allTweets = new Map();

    for (let round = 0; round < CONFIG.scrollRounds && allTweets.size < CONFIG.maxTweets; round++) {
      const found = collectTweets();
      for (const t of found) {
        if (allTweets.size >= CONFIG.maxTweets) break;
        if (!allTweets.has(t.text)) allTweets.set(t.text, t);
      }
      console.log(`   📜 Round ${round + 1}: ${allTweets.size} tweets collected`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    const tweets = [...allTweets.values()];
    if (tweets.length === 0) {
      console.error('❌ No tweets found!');
      return;
    }

    // Classify
    const classified = tweets.map(t => ({ ...t, viral: getViralLevel(t) }));
    const viralTweets = classified.filter(t => t.viral.stars >= 2);
    const megaViral = classified.filter(t => t.viral.stars >= 4);

    // ── Results ─────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🎯 VIRAL DETECTION RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log(`\n  🔍 Scanned: ${tweets.length} tweets`);
    console.log(`  🔥 Viral/trending: ${viralTweets.length}`);
    console.log(`  🌋 Mega viral: ${megaViral.length}`);

    // Sort by velocity (engagement/hour)
    const byVelocity = classified.filter(t => t.viral.stars >= 1).sort((a, b) => b.velocity - a.velocity);

    if (byVelocity.length > 0) {
      console.log('\n  🏆 HOTTEST TWEETS (by velocity):');
      for (const t of byVelocity.slice(0, 10)) {
        const stars = '⭐'.repeat(t.viral.stars);
        console.log(`    ${t.viral.emoji} ${t.viral.level} ${stars}`);
        console.log(`       @${t.author} | ${fmt(t.velocity)} eng/hr | ${t.engagementRate}% rate | ${t.ageHours}h old`);
        console.log(`       ❤️${fmt(t.likes)} 🔄${fmt(t.retweets)} 💬${fmt(t.replies)} 👀${fmt(t.views)}`);
        console.log(`       "${t.text.slice(0, 100)}..."`);
        console.log('');
      }
    } else {
      console.log('\n  📊 No viral tweets detected in this batch.');
      console.log('  Try scrolling on a trending topic or popular search.');
    }

    // Patterns
    if (viralTweets.length >= 3) {
      console.log('\n  📐 VIRAL PATTERNS:');
      const avgLength = Math.round(viralTweets.reduce((s, t) => s + t.text.length, 0) / viralTweets.length);
      const withMedia = viralTweets.filter(t => t.hasImage || t.hasVideo).length;
      const mediaPercent = ((withMedia / viralTweets.length) * 100).toFixed(0);

      console.log(`    Avg length: ${avgLength} chars`);
      console.log(`    With media: ${mediaPercent}% (${withMedia}/${viralTweets.length})`);

      const hours = viralTweets.filter(t => t.timestamp).map(t => new Date(t.timestamp).getHours());
      if (hours.length > 0) {
        const hourCounts = {};
        for (const h of hours) hourCounts[h] = (hourCounts[h] || 0) + 1;
        const topHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
        console.log(`    Peak viral hour: ${topHour[0].padStart(2, '0')}:00 (${topHour[1]} viral tweets)`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (CONFIG.exportResults && classified.length > 0) {
      const data = {
        summary: { scanned: tweets.length, viral: viralTweets.length, megaViral: megaViral.length },
        tweets: classified.sort((a, b) => b.viral.stars - a.viral.stars || b.velocity - a.velocity),
        analyzedAt: new Date().toISOString(),
        page: window.location.href,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-viral-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Full results exported.');
    }
  };

  run();
})();

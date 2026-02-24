/**
 * ============================================================
 * 🎯 Tweet Performance Comparator — Production Grade
 * ============================================================
 *
 * @name        tweetPerformance.js
 * @description Compare the performance of your recent tweets
 *              side by side. Ranks by engagement rate, identifies
 *              patterns in your best/worst posts, analyzes
 *              optimal posting characteristics (length, media,
 *              hashtags, time of day).
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME (your profile)
 * 2. Open DevTools Console (F12)
 * 3. Paste and run
 * 4. Auto-scrolls to collect tweet performance data
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxTweets: 50,
    scrollRounds: 5,
    scrollDelay: 2000,
    excludeRetweets: true,
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
      // Skip retweets
      if (CONFIG.excludeRetweets) {
        const socialContext = article.querySelector('[data-testid="socialContext"]');
        if (socialContext && /reposted|retweeted/i.test(socialContext.textContent)) continue;
      }

      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl ? textEl.textContent.trim() : '';
      if (seen.has(text) && text.length > 0) continue;
      if (text.length > 0) seen.add(text);

      // Engagement metrics
      const groups = article.querySelectorAll('[role="group"] button');
      let replies = 0, retweets = 0, likes = 0, views = 0, bookmarks = 0;

      for (const btn of groups) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const count = parseCount(btn.textContent);
        if (label.includes('repl')) replies = count;
        else if (label.includes('repost') || label.includes('retweet')) retweets = count;
        else if (label.includes('like')) likes = count;
        else if (label.includes('view')) views = count;
        else if (label.includes('bookmark')) bookmarks = count;
      }

      // Fallback: try aria-label parsing for views
      if (views === 0) {
        const viewBtn = article.querySelector('a[href*="/analytics"]');
        if (viewBtn) views = parseCount(viewBtn.textContent);
      }

      // Media detection
      const hasImage = !!article.querySelector('[data-testid="tweetPhoto"]');
      const hasVideo = !!article.querySelector('[data-testid="videoPlayer"]');
      const hasLink = !!article.querySelector('[data-testid="card.wrapper"]');
      const hasPoll = !!article.querySelector('[data-testid="poll"]');

      // Timestamp
      const timeEl = article.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;

      // Hashtags and mentions
      const hashtags = (text.match(/#\w+/g) || []);
      const mentions = (text.match(/@\w+/g) || []);

      const engagement = replies + retweets + likes;
      const engagementRate = views > 0 ? ((engagement / views) * 100) : 0;

      tweets.push({
        text: text.slice(0, 200),
        fullText: text,
        replies, retweets, likes, views, bookmarks, engagement,
        engagementRate: Math.round(engagementRate * 100) / 100,
        hasImage, hasVideo, hasLink, hasPoll,
        timestamp,
        charLength: text.length,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        hashtags, mentions,
        hashtagCount: hashtags.length,
        mentionCount: mentions.length,
      });
    }

    return tweets;
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🎯 TWEET PERFORMANCE COMPARATOR' + ' '.repeat(W - 35) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log(`\n📊 Collecting up to ${CONFIG.maxTweets} tweets...\n`);

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
    if (tweets.length < 2) {
      console.error('❌ Need at least 2 tweets to compare. Navigate to your profile.');
      return;
    }

    // ── Rankings ─────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  🏆 TOP PERFORMING TWEETS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const byEngagement = [...tweets].sort((a, b) => b.engagement - a.engagement);
    const byRate = [...tweets].filter(t => t.views > 100).sort((a, b) => b.engagementRate - a.engagementRate);
    const byViews = [...tweets].sort((a, b) => b.views - a.views);

    console.log('\n  📈 By Total Engagement (likes + RTs + replies):');
    for (const t of byEngagement.slice(0, 5)) {
      console.log(`    ${fmt(t.engagement)} (❤️${fmt(t.likes)} 🔄${fmt(t.retweets)} 💬${fmt(t.replies)}) — "${t.text.slice(0, 80)}..."`);
    }

    console.log('\n  📊 By Engagement Rate (engagement/views):');
    for (const t of byRate.slice(0, 5)) {
      console.log(`    ${t.engagementRate}% (${fmt(t.views)} views) — "${t.text.slice(0, 80)}..."`);
    }

    console.log('\n  👀 By Views:');
    for (const t of byViews.slice(0, 5)) {
      console.log(`    ${fmt(t.views)} views — "${t.text.slice(0, 80)}..."`);
    }

    // ── Pattern Analysis ────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📐 WHAT MAKES YOUR TWEETS PERFORM');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Media impact
    const withMedia = tweets.filter(t => t.hasImage || t.hasVideo);
    const withoutMedia = tweets.filter(t => !t.hasImage && !t.hasVideo);
    const avgMediaEng = withMedia.length > 0 ? withMedia.reduce((s, t) => s + t.engagement, 0) / withMedia.length : 0;
    const avgNoMediaEng = withoutMedia.length > 0 ? withoutMedia.reduce((s, t) => s + t.engagement, 0) / withoutMedia.length : 0;

    console.log(`\n  📸 Media Impact:`);
    console.log(`    With media:    avg ${fmt(Math.round(avgMediaEng))} engagement (${withMedia.length} tweets)`);
    console.log(`    Without media: avg ${fmt(Math.round(avgNoMediaEng))} engagement (${withoutMedia.length} tweets)`);
    if (avgMediaEng > 0 && avgNoMediaEng > 0) {
      const boost = ((avgMediaEng / avgNoMediaEng - 1) * 100).toFixed(0);
      console.log(`    ${boost > 0 ? '📈' : '📉'} Media ${boost > 0 ? 'boost' : 'penalty'}: ${boost}%`);
    }

    // Length analysis
    const shortTweets = tweets.filter(t => t.charLength < 100);
    const medTweets = tweets.filter(t => t.charLength >= 100 && t.charLength < 200);
    const longTweets = tweets.filter(t => t.charLength >= 200);

    const avgEng = (arr) => arr.length > 0 ? Math.round(arr.reduce((s, t) => s + t.engagement, 0) / arr.length) : 0;

    console.log(`\n  📏 Length Impact:`);
    console.log(`    Short (<100):  avg ${fmt(avgEng(shortTweets))} engagement (${shortTweets.length} tweets)`);
    console.log(`    Medium (100-200): avg ${fmt(avgEng(medTweets))} engagement (${medTweets.length} tweets)`);
    console.log(`    Long (200+):   avg ${fmt(avgEng(longTweets))} engagement (${longTweets.length} tweets)`);

    // Hashtag impact
    const withHashtags = tweets.filter(t => t.hashtagCount > 0);
    const noHashtags = tweets.filter(t => t.hashtagCount === 0);
    console.log(`\n  #️⃣ Hashtag Impact:`);
    console.log(`    With hashtags: avg ${fmt(avgEng(withHashtags))} engagement (${withHashtags.length} tweets)`);
    console.log(`    No hashtags:   avg ${fmt(avgEng(noHashtags))} engagement (${noHashtags.length} tweets)`);

    // Time analysis
    const byHour = {};
    for (const t of tweets) {
      if (t.timestamp) {
        const hour = new Date(t.timestamp).getHours();
        if (!byHour[hour]) byHour[hour] = [];
        byHour[hour].push(t);
      }
    }
    if (Object.keys(byHour).length > 2) {
      console.log(`\n  ⏰ Best Posting Hours:`);
      const hourAvgs = Object.entries(byHour)
        .map(([h, arr]) => ({ hour: parseInt(h), avg: avgEng(arr), count: arr.length }))
        .filter(h => h.count >= 2)
        .sort((a, b) => b.avg - a.avg);

      for (const h of hourAvgs.slice(0, 3)) {
        const timeLabel = `${h.hour.toString().padStart(2, '0')}:00`;
        console.log(`    ${timeLabel} — avg ${fmt(h.avg)} engagement (${h.count} tweets)`);
      }
    }

    // ── Averages ────────────────────────────────────────────
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 AVERAGES ACROSS ALL TWEETS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const avg = (arr, key) => arr.length > 0 ? Math.round(arr.reduce((s, t) => s + t[key], 0) / arr.length) : 0;
    console.log(`\n  ❤️ Avg likes:     ${fmt(avg(tweets, 'likes'))}`);
    console.log(`  🔄 Avg retweets:  ${fmt(avg(tweets, 'retweets'))}`);
    console.log(`  💬 Avg replies:   ${fmt(avg(tweets, 'replies'))}`);
    console.log(`  👀 Avg views:     ${fmt(avg(tweets, 'views'))}`);
    console.log(`  📊 Avg eng rate:  ${(tweets.reduce((s, t) => s + t.engagementRate, 0) / tweets.length).toFixed(2)}%`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (CONFIG.exportResults) {
      const data = {
        summary: {
          totalTweets: tweets.length,
          avgLikes: avg(tweets, 'likes'),
          avgRetweets: avg(tweets, 'retweets'),
          avgViews: avg(tweets, 'views'),
        },
        rankings: {
          byEngagement: byEngagement.slice(0, 10).map(t => ({ text: t.text, engagement: t.engagement, likes: t.likes })),
          byRate: byRate.slice(0, 10).map(t => ({ text: t.text, engagementRate: t.engagementRate, views: t.views })),
        },
        allTweets: tweets,
        analyzedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-performance-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Full results exported as JSON.');
    }
  };

  run();
})();

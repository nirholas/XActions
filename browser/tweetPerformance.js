// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🎯 Tweet Performance Comparator — Production Grade
 * ============================================================
 *
 * @name        tweetPerformance.js
 * @title       Tweet Performance Comparator
 * @description Rank your recent posts by engagement, rate and views, and break down what performs by media, content type, length, hashtags and hour.
 * @category    analytics
 * @page        x.com/<you> or x.com/<username>
 * @writes      false
 * @aliases     scripts/tweetPerformance.js, scripts/twitter/tweet-performance.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME (your profile, or any profile)
 * 2. Open DevTools Console (F12)
 * 3. Paste browser/tweetPerformance.js and run
 * 4. Auto-scrolls to collect tweet performance data
 *
 * Set CONFIG.sortBy ('likes' | 'reposts' | 'replies' | 'views' |
 * 'engagement' | 'engagementRate') to also print a top-N table.
 *
 * 🎮 CONTROLS:
 *   window.stopTweetPerformance() - stop scrolling and report
 *   window.xactionsPerformance    - the full report object afterwards
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
    sortBy: '',                 // '' = off; else also print a top-N table ranked by this key
    topN: 10,                   // rows in the sortBy table
    requireProfilePage: false,  // true: refuse to run anywhere but a profile page (otherwise just warn)
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

  // Stop switch for the scroll loop
  let stopped = false;
  window.stopTweetPerformance = () => {
    stopped = true;
    console.log('⚠️ Stop requested. Finishing the current pass, then reporting.');
  };

  const pathHandle = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/)?.[1] || '';
  const RESERVED = ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'];

  // Post ID from the time element's permalink first (quoted-post safe)
  const getTweetId = (article) => {
    const timeAnchor = article.querySelector('time')?.closest('a[href*="/status/"]');
    const anchor = timeAnchor || article.querySelector('a[href*="/status/"]');
    const match = anchor ? anchor.href.match(/\/status\/(\d+)/) : null;
    return match ? match[1] : null;
  };

  const collectTweets = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const tweets = [];
    const seen = new Set();

    for (const article of articles) {
      // Skip retweets
      if (CONFIG.excludeRetweets) {
        const socialContext = article.querySelector('[data-testid="socialContext"]');
        // Text match, or a social context that links to the reposter (language independent)
        if (socialContext && (/reposted|retweeted/i.test(socialContext.textContent) || socialContext.closest('a'))) continue;
      }

      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl ? textEl.textContent.trim() : '';
      if (seen.has(text) && text.length > 0) continue;
      if (text.length > 0) seen.add(text);

      // Engagement metrics. The aria-label holds the exact number even when
      // the visible text is abbreviated (12.3K), so read it first.
      const groups = article.querySelectorAll('[role="group"] button, [role="group"] a');
      let replies = 0, retweets = 0, likes = 0, views = 0, bookmarks = 0;

      for (const btn of groups) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        const labelNum = label.match(/([\d,.]+)/);
        const count = labelNum ? parseCount(labelNum[1]) : parseCount(btn.textContent);
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
      const hasVideo = !!article.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]');
      const hasLink = !!article.querySelector('[data-testid="card.wrapper"]');
      const hasPoll = !!article.querySelector('[data-testid="poll"]');
      const type = hasPoll ? 'poll' : hasVideo ? 'video' : hasImage ? 'image' : hasLink ? 'link' : 'text';
      const id = getTweetId(article);

      // Timestamp
      const timeEl = article.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;

      // Hashtags and mentions
      const hashtags = (text.match(/#\w+/g) || []);
      const mentions = (text.match(/@\w+/g) || []);

      const engagement = replies + retweets + likes;
      const engagementRate = views > 0 ? ((engagement / views) * 100) : 0;

      tweets.push({
        id,
        url: id && pathHandle ? `https://x.com/${pathHandle}/status/${id}` : null,
        type,
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

    if (!pathHandle || RESERVED.includes(pathHandle)) {
      if (CONFIG.requireProfilePage) {
        console.error('❌ Not on a profile page. Go to x.com/<username> (e.g. your own profile) and run again.');
        return;
      }
      console.warn('⚠️ Not on a profile page. Results work best from x.com/<username>.');
    } else {
      console.log(`👤 Profile: @${pathHandle}`);
    }

    const validSorts = ['likes', 'reposts', 'retweets', 'replies', 'views', 'engagement', 'engagementRate'];
    if (CONFIG.sortBy && !validSorts.includes(CONFIG.sortBy)) {
      console.warn(`⚠️ Unknown sortBy "${CONFIG.sortBy}". Falling back to "likes".`);
      CONFIG.sortBy = 'likes';
    }

    console.log(`\n📊 Collecting up to ${CONFIG.maxTweets} tweets...`);
    console.log('💡 To stop early: window.stopTweetPerformance()\n');

    const allTweets = new Map();
    const addFound = () => {
      for (const t of collectTweets()) {
        if (allTweets.size >= CONFIG.maxTweets) break;
        const key = t.id || t.text || `tweet_${allTweets.size}`;
        if (!allTweets.has(key)) allTweets.set(key, t);
      }
    };

    for (let round = 0; round < CONFIG.scrollRounds && allTweets.size < CONFIG.maxTweets && !stopped; round++) {
      addFound();
      console.log(`   📜 Round ${round + 1}: ${allTweets.size} tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
    addFound();

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

    // Content type breakdown
    const byType = {};
    for (const t of tweets) {
      byType[t.type] = byType[t.type] || { count: 0, engagement: 0 };
      byType[t.type].count++;
      byType[t.type].engagement += t.engagement;
    }
    console.log(`\n  📐 By Content Type:`);
    Object.entries(byType)
      .map(([type, d]) => [type, Math.round(d.engagement / d.count), d.count])
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, avgE, count]) => {
        console.log(`    ${type.padEnd(6)} avg ${fmt(avgE)} engagement (${count} tweets)`);
      });

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

    // ── Optional top-N table by CONFIG.sortBy ───────────────
    let ranked = null;
    if (CONFIG.sortBy) {
      const sortKey = CONFIG.sortBy === 'reposts' ? 'retweets' : CONFIG.sortBy;
      ranked = [...tweets].sort((a, b) => b[sortKey] - a[sortKey]);
      console.log(`🏆 TOP ${Math.min(CONFIG.topN, ranked.length)} POSTS BY ${CONFIG.sortBy.toUpperCase()}${pathHandle ? ` (@${pathHandle})` : ''}`);
      console.log(`   #   ❤️ Likes  🔁 RT     💬 Rep    👀 Views   Rate%   Post`);
      console.log('   ' + '─'.repeat(60));
      ranked.slice(0, CONFIG.topN).forEach((t, i) => {
        const preview = (t.text.replace(/\s+/g, ' ').slice(0, 40) || '(no text)');
        console.log(`   ${String(i + 1).padEnd(3)} ${fmt(t.likes).padEnd(9)} ${fmt(t.retweets).padEnd(9)} ${fmt(t.replies).padEnd(9)} ${fmt(t.views).padEnd(10)} ${String(t.engagementRate).padEnd(6)} ${preview}`);
      });
      console.log('');
    }

    const data = {
      profile: pathHandle && !RESERVED.includes(pathHandle) ? pathHandle : null,
      profileUrl: pathHandle && !RESERVED.includes(pathHandle) ? `https://x.com/${pathHandle}` : null,
      summary: {
        totalTweets: tweets.length,
        totalEngagement: tweets.reduce((s, t) => s + t.engagement, 0),
        avgLikes: avg(tweets, 'likes'),
        avgRetweets: avg(tweets, 'retweets'),
        avgReplies: avg(tweets, 'replies'),
        avgViews: avg(tweets, 'views'),
        byType,
      },
      rankings: {
        byEngagement: byEngagement.slice(0, 10).map(t => ({ text: t.text, engagement: t.engagement, likes: t.likes })),
        byRate: byRate.slice(0, 10).map(t => ({ text: t.text, engagementRate: t.engagementRate, views: t.views })),
      },
      allTweets: tweets,
      analyzedAt: new Date().toISOString(),
    };
    if (ranked) {
      data.sortedBy = CONFIG.sortBy;
      data.ranked = ranked;
    }
    window.xactionsPerformance = data;
    console.log('💡 Full report object: window.xactionsPerformance');

    if (CONFIG.exportResults) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-performance-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Full results exported as JSON.');
    }
  };

  run();
})();

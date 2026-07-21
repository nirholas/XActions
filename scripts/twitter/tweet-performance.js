// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🎯 Tweet Performance - XActions
 * ============================================
 *
 * @name         tweet-performance
 * @description  Scrape your recent posts, rank them by engagement, and export a full performance report.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to your profile page (x.com/<you>) or any profile you want to rank
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) set CONFIG.maxPosts and CONFIG.sortBy
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   Set maxPosts: 50, sortBy: 'engagementRate' to pull your last 50 posts and
 *   rank them by engagement per view (best for spotting posts that punched
 *   above their reach). The console prints a top-N table and a JSON file is
 *   downloaded with every post and the summary stats.
 *   To stop the scroll early: window.stopTweetPerformance()
 *
 * ============================================
 */

(async function tweetPerformance() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of posts to collect.
    maxPosts: 30,

    // Ranking key for the printed table:
    // 'likes' | 'reposts' | 'replies' | 'engagementRate'
    // engagementRate = (likes + reposts + replies) / views, as a percentage.
    sortBy: 'likes',

    // How many rows to print in the top table.
    topN: 10,

    // Skip reposts (other people's tweets this account reposted).
    excludeRetweets: true,

    // Max scroll attempts before giving up on loading more posts.
    maxScrollAttempts: 40,

    // Delay between scrolls (ms). Increase if posts load slowly.
    scrollDelay: 1800,

    // Auto-download a JSON report when finished.
    exportResults: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    socialContext: '[data-testid="socialContext"]',
    actionGroup: '[role="group"]',
    photo: '[data-testid="tweetPhoto"]',
    video: '[data-testid="videoPlayer"], [data-testid="videoComponent"]',
    card: '[data-testid="card.wrapper"]',
    poll: '[data-testid="poll"]',
    analytics: 'a[href*="/analytics"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`)
  };

  // Parse "1,234", "12.3K", "4.5M" into an integer.
  const parseCount = (text) => {
    if (!text) return 0;
    const cleaned = text.trim().replace(/,/g, '');
    const match = cleaned.match(/([\d.]+)\s*([KMB])?/i);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (Number.isNaN(num)) return 0;
    const mult = { K: 1e3, M: 1e6, B: 1e9 };
    if (match[2]) num *= mult[match[2].toUpperCase()];
    return Math.round(num);
  };

  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n));

  const download = (data, filename) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      log.success(`Report downloaded: ${filename}`);
    } catch (e) {
      log.error(`Could not download report: ${e.message}`);
    }
  };

  // Extract likes/reposts/replies/views from a tweet's action bar. The action
  // buttons expose aria-labels that hold the real numbers even when the
  // visible text is abbreviated.
  const readMetrics = (article) => {
    let replies = 0;
    let reposts = 0;
    let likes = 0;
    let views = 0;

    const group = article.querySelector(SELECTORS.actionGroup);
    if (group) {
      group.querySelectorAll('button, a').forEach((el) => {
        const label = (el.getAttribute('aria-label') || '').toLowerCase();
        if (!label) return;
        const numMatch = label.match(/([\d,.]+)/);
        const count = numMatch ? parseCount(numMatch[1]) : parseCount(el.textContent);
        if (/repl/.test(label)) replies = count || replies;
        else if (/repost|retweet/.test(label)) reposts = count || reposts;
        else if (/like/.test(label)) likes = count || likes;
        else if (/view/.test(label)) views = count || views;
      });
    }

    if (views === 0) {
      const viewLink = article.querySelector(SELECTORS.analytics);
      if (viewLink) views = parseCount(viewLink.textContent);
    }

    return { replies, reposts, likes, views };
  };

  const getTweetId = (article) => {
    const timeAnchor = article.querySelector('time')?.closest('a[href*="/status/"]');
    const anchor = timeAnchor || article.querySelector('a[href*="/status/"]');
    if (!anchor) return null;
    const match = anchor.href.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  };

  const isRetweet = (article) => {
    const ctx = article.querySelector(SELECTORS.socialContext);
    return !!ctx && ctx.closest('a') !== null;
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🎯 TWEET PERFORMANCE - XActions                        ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  const pathHandle = location.pathname.match(/^\/([A-Za-z0-9_]+)/)?.[1];
  const reserved = ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'];
  if (!pathHandle || reserved.includes(pathHandle)) {
    log.warning('Not on a profile page. Go to x.com/<username> (e.g. your own profile) and run again.');
    return;
  }

  const validSorts = ['likes', 'reposts', 'replies', 'engagementRate'];
  if (!validSorts.includes(CONFIG.sortBy)) {
    log.warning(`Unknown sortBy "${CONFIG.sortBy}". Falling back to "likes".`);
    CONFIG.sortBy = 'likes';
  }

  log.info(`Profile: @${pathHandle}`);
  log.info(`Collecting up to ${CONFIG.maxPosts} posts, ranking by ${CONFIG.sortBy}`);
  log.info('To stop early: window.stopTweetPerformance()');
  console.log('');

  // Stop switch for the scroll loop.
  let stopped = false;
  window.stopTweetPerformance = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current pass, then reporting.');
  };

  const posts = new Map();
  let scrollAttempts = 0;
  let stalls = 0;

  const collect = () => {
    document.querySelectorAll(SELECTORS.tweet).forEach((article) => {
      try {
        if (CONFIG.excludeRetweets && isRetweet(article)) return;
        const id = getTweetId(article);
        if (!id || posts.has(id)) return;

        const text = (article.querySelector(SELECTORS.tweetText)?.textContent || '').trim();
        const metrics = readMetrics(article);
        const hasImage = !!article.querySelector(SELECTORS.photo);
        const hasVideo = !!article.querySelector(SELECTORS.video);
        const hasCard = !!article.querySelector(SELECTORS.card);
        const hasPoll = !!article.querySelector(SELECTORS.poll);
        const type = hasPoll ? 'poll' : hasVideo ? 'video' : hasImage ? 'image' : hasCard ? 'link' : 'text';

        const engagement = metrics.likes + metrics.reposts + metrics.replies;
        const engagementRate = metrics.views > 0
          ? Math.round((engagement / metrics.views) * 10000) / 100
          : 0;
        const timeEl = article.querySelector('time');

        posts.set(id, {
          id,
          url: `https://x.com/${pathHandle}/status/${id}`,
          text: text.slice(0, 280),
          type,
          likes: metrics.likes,
          reposts: metrics.reposts,
          replies: metrics.replies,
          views: metrics.views,
          engagement,
          engagementRate,
          hashtags: text.match(/#\w+/g) || [],
          timestamp: timeEl?.getAttribute('datetime') || null
        });
      } catch (e) {
        log.warning(`Skipped a post: ${e.message}`);
      }
    });
  };

  while (!stopped && posts.size < CONFIG.maxPosts && scrollAttempts < CONFIG.maxScrollAttempts) {
    const before = posts.size;
    collect();
    if (posts.size > before) {
      log.info(`Collected ${posts.size}/${CONFIG.maxPosts} posts`);
      stalls = 0;
    } else {
      stalls++;
      if (stalls >= 5) {
        log.warning('No new posts after several scrolls. Reached the end of what loaded.');
        break;
      }
    }
    if (posts.size >= CONFIG.maxPosts) break;
    window.scrollTo(0, document.body.scrollHeight);
    scrollAttempts++;
    await sleep(CONFIG.scrollDelay);
  }
  collect();

  const tweets = [...posts.values()].slice(0, CONFIG.maxPosts);
  if (tweets.length === 0) {
    log.error('No posts found. Make sure the profile has visible posts and try scrolling once manually.');
    return;
  }

  // Rankings.
  const sortKey = CONFIG.sortBy;
  const ranked = [...tweets].sort((a, b) => b[sortKey] - a[sortKey]);

  const sum = (key) => tweets.reduce((s, t) => s + t[key], 0);
  const avg = (key) => Math.round(sum(key) / tweets.length);
  const totalEngagement = sum('engagement');

  const byType = {};
  tweets.forEach((t) => {
    byType[t.type] = byType[t.type] || { count: 0, engagement: 0 };
    byType[t.type].count++;
    byType[t.type].engagement += t.engagement;
  });

  // ============================================
  // 📊 SUMMARY
  // ============================================
  const labelFor = { likes: '❤️ Likes', reposts: '🔁 Reposts', replies: '💬 Replies', engagementRate: '📊 Eng. rate' };

  console.log('');
  console.log('━'.repeat(64));
  console.log(`🏆 TOP ${Math.min(CONFIG.topN, ranked.length)} POSTS BY ${labelFor[sortKey].toUpperCase()} (@${pathHandle})`);
  console.log('━'.repeat(64));
  console.log(`   #   ❤️ Likes  🔁 RT     💬 Rep    👀 Views   Rate%   Post`);
  console.log('   ' + '─'.repeat(60));
  ranked.slice(0, CONFIG.topN).forEach((t, i) => {
    const preview = (t.text.replace(/\s+/g, ' ').slice(0, 40) || '(no text)');
    console.log(
      `   ${String(i + 1).padEnd(3)} ${fmt(t.likes).padEnd(9)} ${fmt(t.reposts).padEnd(9)} ${fmt(t.replies).padEnd(9)} ${fmt(t.views).padEnd(10)} ${String(t.engagementRate).padEnd(6)} ${preview}`
    );
  });

  console.log('');
  console.log('📊 AVERAGES (across ' + tweets.length + ' posts):');
  console.log(`   ❤️ ${fmt(avg('likes'))} likes   🔁 ${fmt(avg('reposts'))} reposts   💬 ${fmt(avg('replies'))} replies   👀 ${fmt(avg('views'))} views`);

  console.log('');
  console.log('📐 BY CONTENT TYPE (avg engagement):');
  Object.entries(byType)
    .map(([type, d]) => [type, Math.round(d.engagement / d.count), d.count])
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, avgEng, count]) => {
      console.log(`   ${type.padEnd(6)} avg ${fmt(avgEng).padEnd(8)} engagement  (${count} post${count === 1 ? '' : 's'})`);
    });

  const withMedia = tweets.filter((t) => t.type === 'image' || t.type === 'video');
  const textOnly = tweets.filter((t) => t.type === 'text');
  const avgOf = (arr) => (arr.length ? Math.round(arr.reduce((s, t) => s + t.engagement, 0) / arr.length) : 0);
  console.log('');
  console.log(`📸 Media posts avg ${fmt(avgOf(withMedia))} eng (${withMedia.length})  vs  Text posts avg ${fmt(avgOf(textOnly))} eng (${textOnly.length})`);

  const report = {
    profile: pathHandle,
    profileUrl: `https://x.com/${pathHandle}`,
    sortedBy: sortKey,
    analyzedAt: new Date().toISOString(),
    summary: {
      totalPosts: tweets.length,
      totalEngagement,
      avgLikes: avg('likes'),
      avgReposts: avg('reposts'),
      avgReplies: avg('replies'),
      avgViews: avg('views'),
      byType
    },
    ranked,
    posts: tweets
  };

  if (CONFIG.exportResults) {
    console.log('');
    download(report, `xactions-performance-${pathHandle}-${new Date().toISOString().slice(0, 10)}.json`);
  }

  window.xactionsPerformance = report;
  console.log('');
  log.info('Full report object: window.xactionsPerformance');
  log.success('Done.');

  return report;
})();

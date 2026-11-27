// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        timelineScraper.js
 * @title       Timeline Scraper
 * @description Scrape posts from the home timeline and other feeds.
 * @category    scrape
 * @page        x.com/home
 * @writes      false
 */
// browser/timelineScraper.js
// Timeline scraping tools for X/Twitter
// by nichxbt
// 1. Go to x.com/home
// 2. Open Developer Console (F12)
// 3. Paste and run
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const CONFIG = {
    maxTweets: 100,
    scrollDelay: 2000,
    maxRetries: 5,
    actionDelay: 1500,
  };

  // ── Selectors ──────────────────────────────────────────────
  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $userName = '[data-testid="User-Name"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';
  const $retweet = '[data-testid="retweet"], [data-testid="unretweet"]';
  const $reply = '[data-testid="reply"]';
  const $bookmark = '[data-testid="bookmark"], [data-testid="removeBookmark"]';
  const $views = 'a[href*="/analytics"]';
  const $tweetPhoto = '[data-testid="tweetPhoto"]';
  const $videoPlayer = '[data-testid="videoPlayer"]';
  const $poll = '[data-testid="poll"]';
  const $socialContext = '[data-testid="socialContext"]';
  const $cardWrapper = '[data-testid="card.wrapper"]';

  // ── Utilities ──────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (match[2]) num *= { k: 1e3, m: 1e6, b: 1e9 }[match[2].toLowerCase()] || 1;
    return Math.round(num);
  };

  const fmt = (n) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n);

  const getTimestamp = () => new Date().toISOString().slice(0, 10);

  const getCurrentUsername = () => {
    const match = window.location.pathname.match(/^\/([^/]+)/);
    return match ? match[1] : null;
  };

  // ── Tweet Parser ───────────────────────────────────────────
  const parseTweet = (article) => {
    // Extract tweet URL and ID
    const statusLink = article.querySelector('a[href*="/status/"]');
    if (!statusLink) return null;
    const tweetUrl = statusLink.href;
    const idMatch = tweetUrl.match(/\/status\/(\d+)/);
    const tweetId = idMatch ? idMatch[1] : null;
    if (!tweetId) return null;

    // Author info
    const userNameEl = article.querySelector($userName);
    let displayName = '';
    let username = '';
    if (userNameEl) {
      const nameSpans = userNameEl.querySelectorAll('span');
      if (nameSpans.length > 0) displayName = nameSpans[0]?.textContent?.trim() || '';
      const handleLink = userNameEl.querySelector('a[href^="/"]');
      if (handleLink) {
        const href = handleLink.getAttribute('href');
        username = href ? href.replace('/', '') : '';
      }
    }

    // Tweet text
    const textEl = article.querySelector($tweetText);
    const text = textEl ? textEl.textContent.trim() : '';

    // Timestamp
    const timeEl = article.querySelector('time');
    const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;

    // Engagement counts from button group
    const groupButtons = article.querySelectorAll('[role="group"] button');
    let likes = 0, reposts = 0, replies = 0, views = 0, bookmarks = 0;

    for (const btn of groupButtons) {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      const count = parseCount(btn.textContent);
      if (label.includes('repl')) replies = count;
      else if (label.includes('repost') || label.includes('retweet')) reposts = count;
      else if (label.includes('like')) likes = count;
      else if (label.includes('bookmark')) bookmarks = count;
    }

    // Views fallback
    const viewEl = article.querySelector($views);
    if (viewEl) views = parseCount(viewEl.textContent);

    // Media type detection
    const hasImage = !!article.querySelector($tweetPhoto);
    const hasVideo = !!article.querySelector($videoPlayer);
    const hasGif = hasVideo && !!article.querySelector('[data-testid="gifPlayer"], [aria-label*="GIF"]');
    const hasPoll = !!article.querySelector($poll);
    let mediaType = 'none';
    if (hasPoll) mediaType = 'poll';
    else if (hasGif) mediaType = 'GIF';
    else if (hasVideo) mediaType = 'video';
    else if (hasImage) mediaType = 'image';

    // Social context: repost, quote, reply detection
    const socialCtx = article.querySelector($socialContext);
    const isRepost = socialCtx ? /reposted|retweeted/i.test(socialCtx.textContent) : false;
    const hasQuote = !!article.querySelector('[data-testid="quoteTweet"]') ||
                     !!article.querySelector('div[role="link"] article');
    const isQuote = hasQuote;

    // Reply detection: check for "Replying to" text
    const replyIndicator = article.querySelector('div[id^="id__"]');
    const isReply = replyIndicator ? /replying to/i.test(replyIndicator.textContent) : false;

    // URLs in tweet
    const linkEls = textEl ? textEl.querySelectorAll('a[href]') : [];
    const urls = [...linkEls]
      .map(a => a.href)
      .filter(u => u && !u.includes('x.com/hashtag') && !u.startsWith('https://x.com/'));

    return {
      tweetId,
      author: username,
      displayName,
      text,
      timestamp,
      likes,
      reposts,
      replies,
      views,
      bookmarks,
      mediaType,
      tweetUrl,
      isRepost,
      isQuote,
      isReply,
      urls,
    };
  };

  // ── Scroll-and-Scrape Engine ───────────────────────────────
  const scrollAndScrape = async (maxTweets = CONFIG.maxTweets) => {
    const collected = new Map();
    let retries = 0;

    console.log(`🔄 Scraping up to ${maxTweets} tweets...`);

    while (collected.size < maxTweets && retries < CONFIG.maxRetries) {
      const prevSize = collected.size;

      const articles = document.querySelectorAll($tweet);
      for (const article of articles) {
        if (collected.size >= maxTweets) break;
        const tweet = parseTweet(article);
        if (tweet && !collected.has(tweet.tweetId)) {
          collected.set(tweet.tweetId, tweet);
        }
      }

      if (collected.size === prevSize) {
        retries++;
        console.log(`   ⏳ No new tweets found (retry ${retries}/${CONFIG.maxRetries})`);
      } else {
        retries = 0;
        console.log(`   📜 Collected ${collected.size}/${maxTweets} tweets`);
      }

      window.scrollBy(0, 800);
      await sleep(CONFIG.scrollDelay);
    }

    const results = [...collected.values()];
    console.log(`✅ Scraped ${results.length} tweets total`);
    return results;
  };

  // ── Tab Switching Helper ───────────────────────────────────
  const switchTab = async (tabName) => {
    const tabs = document.querySelectorAll('[role="tab"]');
    for (const tab of tabs) {
      if (tab.textContent.trim().toLowerCase() === tabName.toLowerCase()) {
        tab.click();
        console.log(`🔄 Switched to "${tabName}" tab`);
        await sleep(CONFIG.actionDelay);
        return true;
      }
    }
    // Fallback: look for tab links
    const tabLinks = document.querySelectorAll('a[role="tab"]');
    for (const link of tabLinks) {
      if (link.textContent.trim().toLowerCase() === tabName.toLowerCase()) {
        link.click();
        console.log(`🔄 Switched to "${tabName}" tab`);
        await sleep(CONFIG.actionDelay);
        return true;
      }
    }
    console.warn(`⚠️ Could not find "${tabName}" tab`);
    return false;
  };

  // ── 1. Scrape For You Timeline ─────────────────────────────
  const scrapeForYou = async (maxTweets = CONFIG.maxTweets) => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🏠 SCRAPE FOR YOU TIMELINE                                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    if (!window.location.pathname.startsWith('/home')) {
      console.error('❌ Navigate to x.com/home first!');
      return [];
    }

    await switchTab('For you');
    await sleep(CONFIG.actionDelay);
    window.scrollTo(0, 0);
    await sleep(1000);

    const tweets = await scrollAndScrape(maxTweets);
    console.log(`✅ For You timeline: ${tweets.length} tweets scraped`);
    return tweets;
  };

  // ── 2. Scrape Following Timeline ───────────────────────────
  const scrapeFollowing = async (maxTweets = CONFIG.maxTweets) => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  👥 SCRAPE FOLLOWING TIMELINE                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    if (!window.location.pathname.startsWith('/home')) {
      console.error('❌ Navigate to x.com/home first!');
      return [];
    }

    await switchTab('Following');
    await sleep(CONFIG.actionDelay);
    window.scrollTo(0, 0);
    await sleep(1000);

    const tweets = await scrollAndScrape(maxTweets);
    console.log(`✅ Following timeline: ${tweets.length} tweets scraped`);
    return tweets;
  };

  // ── 3. Scrape Profile Timeline ─────────────────────────────
  const scrapeProfile = async (maxTweets = CONFIG.maxTweets) => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  👤 SCRAPE PROFILE TIMELINE                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const username = getCurrentUsername();
    if (!username || ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'].includes(username)) {
      console.error('❌ Navigate to a user profile page first! (x.com/username)');
      return [];
    }

    console.log(`📋 Scraping @${username}'s profile posts...`);

    // Make sure we're on the Posts tab (default)
    await switchTab('Posts');
    await sleep(CONFIG.actionDelay);
    window.scrollTo(0, 0);
    await sleep(1000);

    const tweets = await scrollAndScrape(maxTweets);
    console.log(`✅ @${username} profile: ${tweets.length} tweets scraped`);
    return tweets;
  };

  // ── 4. Scrape Likes Timeline ───────────────────────────────
  const scrapeLikes = async (maxTweets = CONFIG.maxTweets) => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ❤️  SCRAPE LIKES TIMELINE                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const username = getCurrentUsername();
    if (!username || ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'].includes(username)) {
      console.error('❌ Navigate to a user profile page first! (x.com/username)');
      return [];
    }

    // Navigate to likes tab
    const likesUrl = `/${username}/likes`;
    if (!window.location.pathname.endsWith('/likes')) {
      console.log(`🔄 Navigating to x.com${likesUrl}...`);
      window.location.href = `https://x.com${likesUrl}`;
      await sleep(3000);
    }

    window.scrollTo(0, 0);
    await sleep(1000);

    const tweets = await scrollAndScrape(maxTweets);
    console.log(`✅ @${username} likes: ${tweets.length} tweets scraped`);
    return tweets;
  };

  // ── 5. Scrape Media Timeline ───────────────────────────────
  const scrapeMedia = async (maxTweets = CONFIG.maxTweets) => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🖼️  SCRAPE MEDIA TIMELINE                                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const username = getCurrentUsername();
    if (!username || ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'].includes(username)) {
      console.error('❌ Navigate to a user profile page first! (x.com/username)');
      return [];
    }

    // Navigate to media tab
    const mediaUrl = `/${username}/media`;
    if (!window.location.pathname.endsWith('/media')) {
      console.log(`🔄 Navigating to x.com${mediaUrl}...`);
      window.location.href = `https://x.com${mediaUrl}`;
      await sleep(3000);
    }

    window.scrollTo(0, 0);
    await sleep(1000);

    const tweets = await scrollAndScrape(maxTweets);
    console.log(`✅ @${username} media: ${tweets.length} tweets scraped`);
    return tweets;
  };

  // ── 6. Export Timeline Data ────────────────────────────────
  const exportData = (tweets, format = 'json', filename = null) => {
    if (!tweets || tweets.length === 0) {
      console.error('❌ No data to export. Run a scrape function first.');
      return;
    }

    const name = filename || `xactions-timeline-${getTimestamp()}`;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(tweets, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.json`;
      a.click();
      URL.revokeObjectURL(url);
      console.log(`📥 Exported ${tweets.length} tweets as JSON: ${name}.json`);
    } else if (format === 'csv') {
      const headers = [
        'tweetId', 'author', 'displayName', 'text', 'timestamp',
        'likes', 'reposts', 'replies', 'views', 'bookmarks',
        'mediaType', 'tweetUrl', 'isRepost', 'isQuote', 'isReply',
      ];
      const escCsv = (val) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      };
      const rows = tweets.map(t => headers.map(h => escCsv(t[h])).join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      console.log(`📥 Exported ${tweets.length} tweets as CSV: ${name}.csv`);
    } else {
      console.error('❌ Unsupported format. Use "json" or "csv".');
    }
  };

  // ── 7. Timeline Statistics ─────────────────────────────────
  const analyzeTimeline = (tweets) => {
    if (!tweets || tweets.length === 0) {
      console.error('❌ No data to analyze. Run a scrape function first.');
      return null;
    }

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📊 TIMELINE STATISTICS                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    const total = tweets.length;
    const totalLikes = tweets.reduce((s, t) => s + t.likes, 0);
    const totalReposts = tweets.reduce((s, t) => s + t.reposts, 0);
    const totalReplies = tweets.reduce((s, t) => s + t.replies, 0);
    const totalViews = tweets.reduce((s, t) => s + t.views, 0);
    const totalBookmarks = tweets.reduce((s, t) => s + t.bookmarks, 0);
    const totalEngagement = totalLikes + totalReposts + totalReplies;
    const avgEngagement = total > 0 ? (totalEngagement / total).toFixed(1) : 0;
    const avgEngRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : '0.00';

    // Posting frequency
    const timestamps = tweets.filter(t => t.timestamp).map(t => new Date(t.timestamp));
    let postingFrequency = 'N/A';
    if (timestamps.length >= 2) {
      timestamps.sort((a, b) => a - b);
      const spanMs = timestamps[timestamps.length - 1] - timestamps[0];
      const spanDays = spanMs / (1000 * 60 * 60 * 24);
      if (spanDays > 0) {
        const postsPerDay = (timestamps.length / spanDays).toFixed(1);
        postingFrequency = `${postsPerDay} posts/day over ${Math.round(spanDays)} days`;
      }
    }

    // Top authors
    const authorCounts = {};
    tweets.forEach(t => {
      const key = t.author || 'unknown';
      authorCounts[key] = (authorCounts[key] || 0) + 1;
    });
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Most engaged posts
    const byEngagement = [...tweets]
      .sort((a, b) => (b.likes + b.reposts + b.replies) - (a.likes + a.reposts + a.replies))
      .slice(0, 5);

    // Media ratio
    const mediaBreakdown = { image: 0, video: 0, GIF: 0, poll: 0, none: 0 };
    tweets.forEach(t => {
      mediaBreakdown[t.mediaType] = (mediaBreakdown[t.mediaType] || 0) + 1;
    });
    const withMedia = total - mediaBreakdown.none;
    const mediaRatio = total > 0 ? ((withMedia / total) * 100).toFixed(1) : '0';

    // Tweet types
    const repostCount = tweets.filter(t => t.isRepost).length;
    const quoteCount = tweets.filter(t => t.isQuote).length;
    const replyCount = tweets.filter(t => t.isReply).length;
    const originalCount = total - repostCount - quoteCount - replyCount;

    // Best posting hours
    const hourEngagement = {};
    tweets.forEach(t => {
      if (t.timestamp) {
        const hour = new Date(t.timestamp).getHours();
        if (!hourEngagement[hour]) hourEngagement[hour] = { total: 0, count: 0 };
        hourEngagement[hour].total += t.likes + t.reposts + t.replies;
        hourEngagement[hour].count++;
      }
    });
    const bestHours = Object.entries(hourEngagement)
      .map(([h, d]) => ({ hour: h, avgEng: d.count > 0 ? d.total / d.count : 0, count: d.count }))
      .sort((a, b) => b.avgEng - a.avgEng)
      .slice(0, 3);

    // ── Print Report ──────────────────────────────────────
    console.log(`\n📈 OVERVIEW (${total} tweets analyzed)`);
    console.log(`   ❤️  Total likes:      ${fmt(totalLikes)}`);
    console.log(`   🔄 Total reposts:    ${fmt(totalReposts)}`);
    console.log(`   💬 Total replies:    ${fmt(totalReplies)}`);
    console.log(`   👁️  Total views:      ${fmt(totalViews)}`);
    console.log(`   🔖 Total bookmarks:  ${fmt(totalBookmarks)}`);
    console.log(`   📊 Avg engagement:   ${avgEngagement} per tweet`);
    console.log(`   📊 Avg eng. rate:    ${avgEngRate}%`);
    console.log(`   📅 Posting freq:     ${postingFrequency}`);

    console.log('\n📊 TWEET TYPES:');
    console.log(`   📝 Original: ${originalCount} (${((originalCount / total) * 100).toFixed(1)}%)`);
    console.log(`   🔄 Reposts:  ${repostCount} (${((repostCount / total) * 100).toFixed(1)}%)`);
    console.log(`   💬 Quotes:   ${quoteCount} (${((quoteCount / total) * 100).toFixed(1)}%)`);
    console.log(`   ↩️  Replies:  ${replyCount} (${((replyCount / total) * 100).toFixed(1)}%)`);

    console.log(`\n🖼️  MEDIA BREAKDOWN (${mediaRatio}% have media):`);
    console.log(`   🖼️  Images: ${mediaBreakdown.image}`);
    console.log(`   🎥 Videos: ${mediaBreakdown.video}`);
    console.log(`   🎭 GIFs:   ${mediaBreakdown.GIF}`);
    console.log(`   📊 Polls:  ${mediaBreakdown.poll}`);
    console.log(`   📝 Text:   ${mediaBreakdown.none}`);

    console.log('\n👤 TOP AUTHORS:');
    topAuthors.forEach(([author, count], i) => {
      console.log(`   ${i + 1}. @${author} — ${count} tweets`);
    });

    console.log('\n🏆 MOST ENGAGED POSTS:');
    byEngagement.forEach((t, i) => {
      const eng = t.likes + t.reposts + t.replies;
      console.log(`   ${i + 1}. ${fmt(eng)} eng (❤️${fmt(t.likes)} 🔄${fmt(t.reposts)} 💬${fmt(t.replies)}) — @${t.author}`);
      console.log(`      "${t.text.slice(0, 80)}${t.text.length > 80 ? '...' : ''}"`);
    });

    if (bestHours.length > 0) {
      console.log('\n⏰ BEST POSTING HOURS (by avg engagement):');
      bestHours.forEach(({ hour, avgEng, count }) => {
        console.log(`   ${String(hour).padStart(2, '0')}:00 — avg ${fmt(Math.round(avgEng))} engagement (${count} tweets)`);
      });
    }

    const stats = {
      total,
      totalLikes,
      totalReposts,
      totalReplies,
      totalViews,
      totalBookmarks,
      avgEngagement: parseFloat(avgEngagement),
      avgEngagementRate: parseFloat(avgEngRate),
      postingFrequency,
      mediaRatio: parseFloat(mediaRatio),
      mediaBreakdown,
      tweetTypes: { original: originalCount, reposts: repostCount, quotes: quoteCount, replies: replyCount },
      topAuthors: topAuthors.map(([author, count]) => ({ author, count })),
      topEngaged: byEngagement.map(t => ({ author: t.author, text: t.text.slice(0, 100), engagement: t.likes + t.reposts + t.replies, url: t.tweetUrl })),
      bestHours,
    };

    console.log('\n✅ Stats analysis complete. Access via window.XActions.timelineScraper.lastStats');
    return stats;
  };

  // ── Expose API ─────────────────────────────────────────────
  window.XActions = window.XActions || {};
  window.XActions.timelineScraper = {
    scrapeForYou,
    scrapeFollowing,
    scrapeProfile,
    scrapeLikes,
    scrapeMedia,
    exportData,
    analyzeTimeline,
    lastResults: null,
    lastStats: null,

    // Convenience: scrape + store
    run: async (type = 'forYou', maxTweets = CONFIG.maxTweets) => {
      let tweets = [];
      switch (type) {
        case 'forYou': tweets = await scrapeForYou(maxTweets); break;
        case 'following': tweets = await scrapeFollowing(maxTweets); break;
        case 'profile': tweets = await scrapeProfile(maxTweets); break;
        case 'likes': tweets = await scrapeLikes(maxTweets); break;
        case 'media': tweets = await scrapeMedia(maxTweets); break;
        default:
          console.error('❌ Unknown type. Use: forYou, following, profile, likes, media');
          return [];
      }
      window.XActions.timelineScraper.lastResults = tweets;
      return tweets;
    },
  };

  // ── Menu ───────────────────────────────────────────────────
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  📋 TIMELINE SCRAPER — XActions by nichxbt                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('📌 Available commands (via window.XActions.timelineScraper):');
  console.log('');
  console.log('   🏠 scrapeForYou(max)       — Scrape "For You" timeline');
  console.log('   👥 scrapeFollowing(max)     — Scrape "Following" timeline');
  console.log('   👤 scrapeProfile(max)       — Scrape current profile posts');
  console.log('   ❤️  scrapeLikes(max)         — Scrape user likes page');
  console.log('   🖼️  scrapeMedia(max)         — Scrape user media page');
  console.log('   📥 exportData(tweets, fmt)  — Export as "json" or "csv"');
  console.log('   📊 analyzeTimeline(tweets)  — Show timeline statistics');
  console.log('   🚀 run(type, max)           — Quick run (forYou/following/profile/likes/media)');
  console.log('');
  console.log('💡 Examples:');
  console.log('   const t = await XActions.timelineScraper.scrapeForYou(50)');
  console.log('   XActions.timelineScraper.exportData(t, "csv")');
  console.log('   XActions.timelineScraper.analyzeTimeline(t)');
  console.log('   const t = await XActions.timelineScraper.run("following", 200)');
  console.log('');
  console.log('✅ Timeline Scraper loaded. Ready to use.');
})();

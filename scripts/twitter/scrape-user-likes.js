// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 💛 Scrape User Likes - XActions
 * ============================================
 *
 * @name         scrape-user-likes
 * @description  Scroll a user's Likes timeline and export the posts they liked (url, author, text, counts) to JSON and CSV.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to the Likes tab of a profile: x.com/<user>/likes
 *      (X only shows the Likes tab for your own account unless it is public)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   On x.com/<you>/likes the script scrolls your liked posts, prints a running
 *   count ("Collected 120 liked posts..."), then downloads <you>_likes_<date>.json
 *   with each post's url, author, text and like/repost/reply/view counts, and
 *   reports the accounts you like most. To stop early: window.stopScrapeUserLikes().
 *
 * ============================================
 */

(async function scrapeUserLikes() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Stop after collecting this many liked posts (safety cap)
    maxPosts: 1000,

    // How far to scroll each step (pixels)
    scrollStep: 1600,

    // Delay between scrolls (ms). Raise to 2500+ on a slow connection so posts load.
    scrollDelay: 1600,

    // Give up after this many consecutive scrolls with no new posts (end of timeline)
    stallLimit: 6,

    // Hard cap on scroll attempts, independent of stalls
    maxScrollAttempts: 400,

    // Also trigger a browser download of the CSV file (JSON always downloads)
    autoDownloadCsv: false
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userName: '[data-testid="User-Name"]',
    verified: 'svg[aria-label*="Verified"], [data-testid="icon-verified"]',
    photo: '[data-testid="tweetPhoto"]',
    video: '[data-testid="videoPlayer"], [data-testid="videoComponent"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const randomDelay = () => sleep(CONFIG.scrollDelay + Math.floor(Math.random() * 500));

  const log = {
    info: (m) => console.log(`ℹ️ ${m}`),
    success: (m) => console.log(`✅ ${m}`),
    warning: (m) => console.log(`⚠️ ${m}`),
    error: (m) => console.log(`❌ ${m}`),
    count: (n) => console.log(`💛 Collected ${n} liked posts...`)
  };

  const csvCell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

  const parseNumber = (str) => {
    if (!str) return 0;
    const s = str.trim().toUpperCase();
    const num = parseFloat(s.replace(/,/g, '')) || 0;
    if (s.includes('K')) return Math.round(num * 1000);
    if (s.includes('M')) return Math.round(num * 1000000);
    return Math.round(num);
  };

  const download = (content, filename, type) => {
    try {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      log.error(`Download of ${filename} failed: ${e.message}`);
      return false;
    }
  };

  const extractPost = (article) => {
    // The permalink around the timestamp is the post's own URL (not a quoted one).
    const timeEl = article.querySelector('time');
    const permalink = timeEl?.closest('a[href*="/status/"]') || article.querySelector('a[href*="/status/"]');
    const url = permalink ? permalink.href : '';
    const id = url ? (url.split('/status/')[1] || '').split(/[?/]/)[0] : '';
    if (!id) return null;

    // Author handle is reliable from the permalink path: /<handle>/status/<id>
    const handle = (url.match(/x\.com\/([^/]+)\/status/) || [])[1] || '';
    const nameText = article.querySelector(SELECTORS.userName)?.textContent || '';
    const displayName = nameText.split('@')[0].trim();
    const verified = !!article.querySelector(`${SELECTORS.userName} ${SELECTORS.verified}`);

    const text = article.querySelector(SELECTORS.tweetText)?.textContent || '';
    const time = timeEl ? timeEl.getAttribute('datetime') : '';

    const getMetric = (testId) => {
      const el = article.querySelector(`[data-testid="${testId}"]`);
      const span = el?.querySelector('span span');
      return parseNumber(span ? span.textContent : '0');
    };
    const viewsEl = article.querySelector('a[href$="/analytics"]');
    const views = parseNumber(viewsEl ? viewsEl.textContent : '0');

    const hasImage = article.querySelector(SELECTORS.photo) !== null;
    const hasVideo = article.querySelector(SELECTORS.video) !== null;

    return {
      id,
      url,
      author: { handle, displayName, verified },
      text,
      time,
      counts: {
        likes: getMetric('like'),
        retweets: getMetric('retweet'),
        replies: getMetric('reply'),
        views
      },
      hasMedia: hasImage || hasVideo
    };
  };

  // ============================================
  // 🛑 STOP SWITCH
  // ============================================
  let stopped = false;
  window.stopScrapeUserLikes = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current scroll, then exporting what was collected.');
  };

  // ============================================
  // 🚦 PAGE GUARD
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  💛 SCRAPE USER LIKES - XActions                         ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  if (!/\/likes\/?$/.test(window.location.pathname) || /\/status\//.test(window.location.pathname)) {
    log.warning('You are not on a profile Likes page.');
    log.info('Go to x.com/<user>/likes (the Likes tab of a profile), then run this again.');
    return;
  }

  const username = window.location.pathname.split('/')[1] || 'unknown';
  log.info(`Scraping liked posts of @${username}`);
  log.info(`Max posts: ${CONFIG.maxPosts}. To stop early: window.stopScrapeUserLikes()`);

  // ============================================
  // 🎯 MAIN LOOP
  // ============================================
  const posts = new Map();
  const stats = { collected: 0, withMedia: 0, scrolls: 0, errors: 0 };

  let scrollAttempts = 0;
  let stall = 0;

  while (!stopped && posts.size < CONFIG.maxPosts && stall < CONFIG.stallLimit && scrollAttempts < CONFIG.maxScrollAttempts) {
    const before = posts.size;

    document.querySelectorAll(SELECTORS.tweet).forEach((article) => {
      try {
        const p = extractPost(article);
        if (p && p.id && !posts.has(p.id)) posts.set(p.id, p);
      } catch (e) {
        stats.errors++;
      }
    });

    if (posts.size > before) {
      log.count(posts.size);
      stall = 0;
    } else {
      stall++;
    }

    window.scrollBy(0, CONFIG.scrollStep);
    await randomDelay();
    scrollAttempts++;
    stats.scrolls = scrollAttempts;
  }

  const list = Array.from(posts.values()).slice(0, CONFIG.maxPosts);
  stats.collected = list.length;
  stats.withMedia = list.filter((p) => p.hasMedia).length;

  // Most-liked accounts
  const accountCounts = {};
  list.forEach((p) => {
    const h = p.author.handle || 'unknown';
    accountCounts[h] = (accountCounts[h] || 0) + 1;
  });
  const topAccounts = Object.entries(accountCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ============================================
  // 📤 EXPORT
  // ============================================
  const result = {
    profile: username,
    profileUrl: `https://x.com/${username}`,
    scrapedAt: new Date().toISOString(),
    total: list.length,
    topLikedAccounts: topAccounts.map(([handle, count]) => ({ handle, count })),
    posts: list
  };

  const buildCsv = () => {
    const header = 'AuthorHandle,AuthorName,Verified,Text,Likes,Retweets,Replies,Views,HasMedia,URL,Time';
    const rows = list.map((p) => [
      csvCell('@' + p.author.handle),
      csvCell(p.author.displayName),
      p.author.verified,
      csvCell(p.text),
      p.counts.likes,
      p.counts.retweets,
      p.counts.replies,
      p.counts.views,
      p.hasMedia,
      csvCell(p.url),
      csvCell(p.time)
    ].join(','));
    return [header, ...rows].join('\n');
  };

  const csv = buildCsv();
  const dateStr = new Date().toISOString().split('T')[0];

  if (list.length === 0) {
    log.warning('No liked posts were collected. The Likes tab may be empty or hidden (X hides it for other users).');
  } else {
    download(JSON.stringify(result, null, 2), `${username}_likes_${dateStr}.json`, 'application/json');
    log.success(`Downloaded ${username}_likes_${dateStr}.json`);
    if (CONFIG.autoDownloadCsv) {
      download(csv, `${username}_likes_${dateStr}.csv`, 'text/csv');
      log.success(`Downloaded ${username}_likes_${dateStr}.csv`);
    }
  }

  window.scrapedUserLikes = result;
  window.scrapeUserLikesExportCSV = () => {
    download(csv, `${username}_likes_${dateStr}.csv`, 'text/csv');
    return csv;
  };

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 SCRAPE USER LIKES - COMPLETE                         ║
╠══════════════════════════════════════════════════════════╣
║  💛 Liked posts:         ${String(stats.collected).padEnd(30)}║
║  🖼️  With media:          ${String(stats.withMedia).padEnd(30)}║
║  📜 Scrolls:             ${String(stats.scrolls).padEnd(30)}║
║  ❌ Row errors:          ${String(stats.errors).padEnd(30)}║
╚══════════════════════════════════════════════════════════╝
  `);

  if (topAccounts.length > 0) {
    console.log('📊 Most-liked accounts:');
    topAccounts.forEach(([handle, count]) => console.log(`   @${handle}: ${count}`));
  }

  list.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. @${p.author.handle} (${p.counts.likes} ❤️): "${p.text.slice(0, 50)}..."`);
  });
  if (list.length > 5) console.log(`   ... and ${list.length - 5} more`);

  console.log('\n📋 CSV preview (full string via window.scrapeUserLikesExportCSV()):');
  console.log(csv.split('\n').slice(0, 6).join('\n'));
  console.log('\n💡 window.scrapedUserLikes = full data. window.scrapeUserLikesExportCSV() = download + return CSV.');

  return result;
})();

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🔍 Scrape Search - XActions
 * ============================================
 *
 * @name         scrape-search
 * @description  Scroll the current X search results and export every post (text, author, counts, media) to JSON/CSV.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to a search results page, e.g. x.com/search?q=solana&f=live
 *      (the &f=live tab surfaces the newest posts; the Top tab works too)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   Search x.com/search?q=%22gm%22%20three.ws&f=live, set CONFIG.maxPosts = 200 and
 *   CONFIG.includeReplies = false. The script scrolls, collects up to 200 original
 *   posts, downloads a JSON file, and prints a "window.exportCSV()" helper. To stop
 *   early at any time, run window.stopScrapeSearch() in the console.
 *
 * ============================================
 */

(async function scrapeSearch() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of posts to collect before stopping
    maxPosts: 300,

    // Include reply posts in the results (false = original posts only)
    includeReplies: true,

    // Delay between scrolls (ms). Raise if posts load slowly.
    scrollDelay: 1800,

    // Give up after this many scrolls that add no new posts
    noNewPostsThreshold: 6,

    // Hard cap on scroll attempts so the loop can never run forever
    maxScrollAttempts: 400,

    // Auto-download a CSV file too (JSON always downloads)
    downloadCsv: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    primaryColumn: '[data-testid="primaryColumn"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userName: '[data-testid="User-Name"]',
    actionGroup: '[role="group"]',
    photo: '[data-testid="tweetPhoto"] img',
    video: 'video'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (n, total) => console.log(`📊 Collected ${n}/${total} posts...`)
  };

  // Turn an aria-label like "1,234 Likes. Like" into the number 1234.
  const countFromLabel = (label) => {
    if (!label) return 0;
    const raw = (label.match(/[\d.,]+\s*[KMB]?/i) || ['0'])[0].trim().toUpperCase();
    const num = parseFloat(raw.replace(/,/g, '')) || 0;
    if (raw.includes('K')) return Math.round(num * 1e3);
    if (raw.includes('M')) return Math.round(num * 1e6);
    if (raw.includes('B')) return Math.round(num * 1e9);
    return Math.round(num);
  };

  // Read the reply/repost/like counts from the action buttons' aria-labels.
  const getCounts = (article) => {
    const counts = { replies: 0, reposts: 0, likes: 0, views: 0 };
    const group = article.querySelector(SELECTORS.actionGroup);
    const nodes = group ? group.querySelectorAll('[aria-label]') : [];
    nodes.forEach((node) => {
      const label = (node.getAttribute('aria-label') || '').toLowerCase();
      const value = countFromLabel(label);
      if (label.includes('repl')) counts.replies = value;
      else if (label.includes('repost') || label.includes('retweet')) counts.reposts = value;
      else if (label.includes('like')) counts.likes = value;
      else if (label.includes('view')) counts.views = value;
    });
    return counts;
  };

  // Strip the &name= sizing param so image URLs point at the original resolution.
  const toOriginalImage = (url) => {
    if (!url) return url;
    return url.replace(/&name=[^&]*/i, '&name=orig').replace(/\?name=[^&]*/i, '?name=orig');
  };

  const getMediaUrls = (article) => {
    const urls = new Set();
    article.querySelectorAll(SELECTORS.photo).forEach((img) => {
      if (img.src) urls.add(toOriginalImage(img.src));
    });
    article.querySelectorAll(SELECTORS.video).forEach((v) => {
      if (v.src) urls.add(v.src);
      else if (v.poster) urls.add(v.poster);
    });
    return Array.from(urls);
  };

  const isReply = (article) => {
    if (article.querySelector('[data-testid="in-reply-to"]') !== null) return true;
    return Array.from(article.querySelectorAll('div[dir]')).some((el) =>
      (el.textContent || '').startsWith('Replying to'));
  };

  // Build a post object from an article, or null if it has no resolvable id.
  const extractPost = (article) => {
    // The permalink around the timestamp is the post's own URL; the first
    // /status/ link in the article can belong to a quoted post.
    const timeEl = article.querySelector('time');
    const permalink = timeEl ? timeEl.closest('a[href*="/status/"]') : null;
    const anchor = permalink || article.querySelector('a[href*="/status/"]');
    const url = anchor ? anchor.href : '';
    const id = url ? (url.split('/status/')[1] || '').split(/[?/]/)[0] : '';
    if (!id) return null;

    const nameBlock = article.querySelector(SELECTORS.userName);
    const nameText = nameBlock ? nameBlock.textContent : '';
    const handle = (nameText.match(/@(\w+)/) || [, ''])[1];
    const name = nameText.split('@')[0].trim();

    const textEl = article.querySelector(SELECTORS.tweetText);
    const text = textEl ? textEl.textContent : '';

    const counts = getCounts(article);

    return {
      id,
      url,
      author: { handle, name },
      text,
      likes: counts.likes,
      reposts: counts.reposts,
      replies: counts.replies,
      views: counts.views,
      timestamp: timeEl ? timeEl.getAttribute('datetime') : null,
      mediaUrls: getMediaUrls(article),
      isReply: isReply(article),
      scrapedAt: new Date().toISOString()
    };
  };

  const downloadFile = (content, filename, mime) => {
    try {
      const blob = new Blob([content], { type: mime });
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(href);
      return true;
    } catch (e) {
      log.error(`Failed to download ${filename}: ${e.message}`);
      return false;
    }
  };

  const csvCell = (value) => `"${String(value == null ? '' : value).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

  const toCSV = (posts) => {
    const headers = ['id', 'handle', 'name', 'text', 'likes', 'reposts', 'replies', 'views', 'timestamp', 'mediaUrls', 'url'];
    const rows = posts.map((p) => [
      p.id,
      '@' + p.author.handle,
      p.author.name,
      p.text,
      p.likes,
      p.reposts,
      p.replies,
      p.views,
      p.timestamp || '',
      p.mediaUrls.join(' '),
      p.url
    ].map(csvCell).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  // ============================================
  // 🎯 MAIN
  // ============================================
  const query = new URLSearchParams(window.location.search).get('q') || 'search';

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🔍 SCRAPE SEARCH - XActions                            ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: warn and return, never hard-redirect (that kills the script).
  if (!/\/search/.test(window.location.pathname)) {
    log.warning('You are not on a search results page.');
    log.info('Go to x.com/search?q=YOUR+TERM&f=live, then run this script again.');
    return;
  }

  const posts = new Map();

  // Stop switch: run window.stopScrapeSearch() to end the scroll loop.
  let stopped = false;
  window.stopScrapeSearch = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current pass, then exporting.');
  };

  log.info(`Search query: "${query}"`);
  log.info(`Max posts: ${CONFIG.maxPosts} | Include replies: ${CONFIG.includeReplies}`);
  log.info('To stop early: window.stopScrapeSearch()');

  let scrollAttempts = 0;
  let noNewCount = 0;

  while (!stopped && posts.size < CONFIG.maxPosts && scrollAttempts < CONFIG.maxScrollAttempts) {
    const before = posts.size;
    const articles = document.querySelectorAll(SELECTORS.tweet);

    articles.forEach((article) => {
      try {
        const post = extractPost(article);
        if (!post || posts.has(post.id)) return;
        if (!CONFIG.includeReplies && post.isReply) return;
        posts.set(post.id, post);
      } catch (e) {
        log.error(`Skipped a post: ${e.message}`);
      }
    });

    if (posts.size > before) {
      log.progress(posts.size, CONFIG.maxPosts);
      noNewCount = 0;
    } else {
      noNewCount++;
      if (noNewCount >= CONFIG.noNewPostsThreshold) {
        log.warning('No new posts after several scrolls. Reached the end of the results.');
        break;
      }
    }

    if (posts.size >= CONFIG.maxPosts) break;

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollAttempts++;
  }

  const list = Array.from(posts.values()).slice(0, CONFIG.maxPosts);

  // ============================================
  // 📊 SUMMARY + EXPORT
  // ============================================
  if (list.length === 0) {
    log.warning('No posts were found. The results may be empty, or the page had not loaded yet.');
    return;
  }

  const totalLikes = list.reduce((s, p) => s + p.likes, 0);
  const totalReposts = list.reduce((s, p) => s + p.reposts, 0);

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 SCRAPE SEARCH - COMPLETE                            ║
╠══════════════════════════════════════════════════════════╣
║  🔍 Query:        ${String(query.slice(0, 36)).padEnd(37)}║
║  📝 Posts:        ${String(list.length).padEnd(37)}║
║  ❤️  Total likes:  ${String(totalLikes.toLocaleString()).padEnd(37)}║
║  🔄 Total reposts:${String(totalReposts.toLocaleString()).padEnd(37)}║
╚══════════════════════════════════════════════════════════╝
  `);

  list.slice(0, 5).forEach((p, i) => {
    console.log(`${i + 1}. @${p.author.handle} (${p.likes} ❤️): "${p.text.slice(0, 60)}"`);
  });

  const safeQuery = query.replace(/[^a-z0-9]/gi, '_').slice(0, 30) || 'search';
  const stamp = new Date().toISOString().split('T')[0];
  const result = { query, scrapedAt: new Date().toISOString(), count: list.length, posts: list };

  if (downloadFile(JSON.stringify(result, null, 2), `search_${safeQuery}_${stamp}.json`, 'application/json')) {
    log.success('JSON downloaded');
  }
  if (CONFIG.downloadCsv && downloadFile(toCSV(list), `search_${safeQuery}_${stamp}.csv`, 'text/csv')) {
    log.success('CSV downloaded');
  }

  window.scrapedSearch = result;
  window.exportCSV = () => toCSV(list);
  console.log('');
  log.info('window.scrapedSearch holds the full data. window.exportCSV() returns the CSV string.');
  log.success('Done! by nichxbt');

  return result;
})();

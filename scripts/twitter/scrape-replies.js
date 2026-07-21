// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 💬 Scrape Replies - XActions
 * ============================================
 *
 * @name         scrape-replies
 * @description  Scroll the conversation under an open post and export every reply (author, text, counts) to JSON/CSV.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Open a post's status page, e.g. x.com/nichxbt/status/1780000000000000000
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   On x.com/nichxbt/status/1780000000000000000 the script scrolls the replies below the
 *   original post, skips the original post itself, and collects up to CONFIG.maxReplies
 *   replies (author handle/name, text, likes/reposts/replies counts, timestamp). It
 *   downloads JSON + CSV and offers window.exportCSV(). Stop early with
 *   window.stopScrapeReplies().
 *
 * ============================================
 */

(async function scrapeReplies() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of replies to collect before stopping
    maxReplies: 500,

    // Delay between scrolls (ms). Raise if replies load slowly.
    scrollDelay: 1800,

    // Give up after this many scrolls that add no new replies
    noNewRepliesThreshold: 6,

    // Hard cap on scroll attempts so the loop can never run forever
    maxScrollAttempts: 400,

    // Auto-download a CSV file too (JSON always downloads)
    downloadCsv: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
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
    progress: (n, total) => console.log(`📊 Collected ${n}/${total} replies...`)
  };

  const countFromLabel = (label) => {
    if (!label) return 0;
    const raw = (label.match(/[\d.,]+\s*[KMB]?/i) || ['0'])[0].trim().toUpperCase();
    const num = parseFloat(raw.replace(/,/g, '')) || 0;
    if (raw.includes('K')) return Math.round(num * 1e3);
    if (raw.includes('M')) return Math.round(num * 1e6);
    if (raw.includes('B')) return Math.round(num * 1e9);
    return Math.round(num);
  };

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

  const extractReply = (article) => {
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
    const verified = !!article.querySelector(`${SELECTORS.userName} svg[aria-label*="Verified"]`);

    const textEl = article.querySelector(SELECTORS.tweetText);
    const text = textEl ? textEl.textContent : '';

    const counts = getCounts(article);

    return {
      id,
      url,
      author: { handle, name },
      verified,
      text,
      likes: counts.likes,
      reposts: counts.reposts,
      replies: counts.replies,
      views: counts.views,
      timestamp: timeEl ? timeEl.getAttribute('datetime') : null,
      mediaUrls: getMediaUrls(article),
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

  const toCSV = (replies) => {
    const headers = ['id', 'handle', 'name', 'verified', 'text', 'likes', 'reposts', 'replies', 'views', 'timestamp', 'url'];
    const rows = replies.map((r) => [
      r.id, '@' + r.author.handle, r.author.name, r.verified, r.text,
      r.likes, r.reposts, r.replies, r.views, r.timestamp || '', r.url
    ].map(csvCell).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  const getStatusId = () => {
    const match = window.location.pathname.match(/status\/(\d+)/);
    return match ? match[1] : null;
  };

  const getOriginalAuthor = () => {
    const match = window.location.pathname.match(/^\/(\w+)\/status\//);
    return match ? match[1] : null;
  };

  // ============================================
  // 🎯 MAIN
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  💬 SCRAPE REPLIES - XActions                           ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  const statusId = getStatusId();
  const originalAuthor = getOriginalAuthor();

  // Page guard: warn and return, never hard-redirect.
  if (!statusId) {
    log.warning('You are not on a post status page.');
    log.info('Open a post (x.com/<user>/status/<id>), then run this script again.');
    return;
  }

  const replies = new Map();

  // Stop switch: run window.stopScrapeReplies() to end the scroll loop.
  let stopped = false;
  window.stopScrapeReplies = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current pass, then exporting.');
  };

  log.info(`Original post: @${originalAuthor || 'unknown'} / ${statusId}`);
  log.info(`Max replies: ${CONFIG.maxReplies}`);
  log.info('To stop early: window.stopScrapeReplies()');

  let scrollAttempts = 0;
  let noNewCount = 0;

  while (!stopped && replies.size < CONFIG.maxReplies && scrollAttempts < CONFIG.maxScrollAttempts) {
    const before = replies.size;

    document.querySelectorAll(SELECTORS.tweet).forEach((article) => {
      try {
        const reply = extractReply(article);
        if (!reply) return;
        // Skip the original post: it shares the status id in the URL.
        if (reply.id === statusId) return;
        if (!replies.has(reply.id)) replies.set(reply.id, reply);
      } catch (e) {
        log.error(`Skipped a reply: ${e.message}`);
      }
    });

    if (replies.size > before) {
      log.progress(replies.size, CONFIG.maxReplies);
      noNewCount = 0;
    } else {
      noNewCount++;
      if (noNewCount >= CONFIG.noNewRepliesThreshold) {
        log.warning('No new replies after several scrolls. Reached the end of the conversation.');
        break;
      }
    }

    if (replies.size >= CONFIG.maxReplies) break;

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollAttempts++;
  }

  const list = Array.from(replies.values()).slice(0, CONFIG.maxReplies);

  // ============================================
  // 📊 SUMMARY + EXPORT
  // ============================================
  if (list.length === 0) {
    log.warning('No replies were found. The post may have no replies, or the thread had not loaded yet.');
    return;
  }

  const uniqueUsers = new Set(list.map((r) => r.author.handle)).size;
  const verifiedCount = list.filter((r) => r.verified).length;

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 SCRAPE REPLIES - COMPLETE                           ║
╠══════════════════════════════════════════════════════════╣
║  💬 Replies:      ${String(list.length).padEnd(37)}║
║  👥 Unique users: ${String(uniqueUsers).padEnd(37)}║
║  ✓  Verified:     ${String(verifiedCount).padEnd(37)}║
╚══════════════════════════════════════════════════════════╝
  `);

  list.slice(0, 5).forEach((r, i) => {
    console.log(`${i + 1}. @${r.author.handle}${r.verified ? ' ✓' : ''} (${r.likes} ❤️): "${r.text.slice(0, 60)}"`);
  });

  const stamp = new Date().toISOString().split('T')[0];
  const result = {
    originalStatusId: statusId,
    originalAuthor,
    scrapedAt: new Date().toISOString(),
    count: list.length,
    replies: list
  };

  if (downloadFile(JSON.stringify(result, null, 2), `replies_${statusId}_${stamp}.json`, 'application/json')) {
    log.success('JSON downloaded');
  }
  if (CONFIG.downloadCsv && downloadFile(toCSV(list), `replies_${statusId}_${stamp}.csv`, 'text/csv')) {
    log.success('CSV downloaded');
  }

  window.scrapedReplies = result;
  window.exportCSV = () => toCSV(list);
  console.log('');
  log.info('window.scrapedReplies holds the full data. window.exportCSV() returns the CSV string.');
  log.success('Done! by nichxbt');

  return result;
})();

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 📋 Scrape List - XActions
 * ============================================
 *
 * @name         scrape-list
 * @description  Export an X List's timeline posts, or its members, to JSON/CSV.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to a List page:
 *      - timeline mode: x.com/i/lists/1699807431709041070
 *      - members mode:  x.com/i/lists/1699807431709041070/members
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) set CONFIG.mode to 'timeline' or 'members' to match the page
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   On x.com/i/lists/1699807431709041070 with CONFIG.mode = 'timeline', the script scrolls
 *   the List timeline, collects up to CONFIG.maxItems posts (text, author, counts, media),
 *   and downloads JSON + CSV. Switch to the /members tab and set CONFIG.mode = 'members' to
 *   export each member's handle, name, bio, and verified flag instead. Stop early with
 *   window.stopScrapeList().
 *
 * ============================================
 */

(async function scrapeList() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // What to scrape: 'timeline' (the List's posts) or 'members' (the accounts
    // on the List). Match this to the page you are on. Leave 'auto' to detect
    // from the URL (a /members path selects members, otherwise timeline).
    mode: 'auto',

    // Maximum posts (timeline) or members to collect before stopping
    maxItems: 500,

    // Include reply posts in timeline mode (false = original posts only)
    includeReplies: true,

    // Delay between scrolls (ms). Raise if content loads slowly.
    scrollDelay: 1800,

    // Give up after this many scrolls that add nothing new
    noNewItemsThreshold: 6,

    // Hard cap on scroll attempts so the loop can never run forever
    maxScrollAttempts: 500,

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
    video: 'video',
    userCell: '[data-testid="UserCell"]',
    userDescription: '[data-testid="UserDescription"]',
    heading: 'h2[role="heading"], [data-testid="primaryColumn"] h1'
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
    progress: (n, total, noun) => console.log(`📊 Collected ${n}/${total} ${noun}...`)
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

  const isReply = (article) => {
    if (article.querySelector('[data-testid="in-reply-to"]') !== null) return true;
    return Array.from(article.querySelectorAll('div[dir]')).some((el) =>
      (el.textContent || '').startsWith('Replying to'));
  };

  const extractPost = (article) => {
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

  const extractMember = (cell) => {
    const handleAnchor = cell.querySelector('a[href^="/"]');
    const href = handleAnchor ? handleAnchor.getAttribute('href') : '';
    const handle = (href || '').replace(/^\//, '').split('/')[0];
    if (!handle) return null;

    const nameBlock = cell.querySelector(SELECTORS.userName) || cell.querySelector('a[href^="/"]');
    const nameText = nameBlock ? nameBlock.textContent : '';
    const name = nameText.split('@')[0].trim();
    const bioEl = cell.querySelector(SELECTORS.userDescription);
    const verified = !!cell.querySelector('svg[aria-label*="Verified"]');

    return {
      handle,
      name,
      bio: bioEl ? bioEl.textContent : '',
      verified,
      profileUrl: `https://x.com/${handle}`,
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

  const postsToCSV = (posts) => {
    const headers = ['id', 'handle', 'name', 'text', 'likes', 'reposts', 'replies', 'views', 'timestamp', 'mediaUrls', 'url'];
    const rows = posts.map((p) => [
      p.id, '@' + p.author.handle, p.author.name, p.text, p.likes, p.reposts,
      p.replies, p.views, p.timestamp || '', p.mediaUrls.join(' '), p.url
    ].map(csvCell).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  const membersToCSV = (members) => {
    const headers = ['handle', 'name', 'bio', 'verified', 'profileUrl'];
    const rows = members.map((m) => [
      '@' + m.handle, m.name, m.bio, m.verified, m.profileUrl
    ].map(csvCell).join(','));
    return [headers.join(','), ...rows].join('\n');
  };

  const getListId = () => {
    const match = window.location.pathname.match(/lists\/(\d+)/);
    return match ? match[1] : null;
  };

  const getListName = () => {
    const header = document.querySelector(SELECTORS.heading);
    return header ? header.textContent.trim() : 'list';
  };

  // ============================================
  // 🎯 MAIN
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📋 SCRAPE LIST - XActions                              ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: warn and return, never hard-redirect.
  if (!/\/lists\/\d+/.test(window.location.pathname)) {
    log.warning('You are not on an X List page.');
    log.info('Go to x.com/i/lists/<listId> (timeline) or x.com/i/lists/<listId>/members, then run again.');
    return;
  }

  const mode = CONFIG.mode === 'auto'
    ? (/\/members\b/.test(window.location.pathname) ? 'members' : 'timeline')
    : CONFIG.mode;
  if (mode !== 'timeline' && mode !== 'members') {
    log.error(`Invalid CONFIG.mode "${CONFIG.mode}". Use 'timeline', 'members', or 'auto'.`);
    return;
  }

  const listId = getListId();
  const listName = getListName();

  const items = new Map();

  // Stop switch: run window.stopScrapeList() to end the scroll loop.
  let stopped = false;
  window.stopScrapeList = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current pass, then exporting.');
  };

  const noun = mode === 'members' ? 'members' : 'posts';
  log.info(`List: "${listName}" (id ${listId})`);
  log.info(`Mode: ${mode} | Max ${noun}: ${CONFIG.maxItems}`);
  if (mode === 'timeline') log.info(`Include replies: ${CONFIG.includeReplies}`);
  log.info('To stop early: window.stopScrapeList()');

  let scrollAttempts = 0;
  let noNewCount = 0;

  while (!stopped && items.size < CONFIG.maxItems && scrollAttempts < CONFIG.maxScrollAttempts) {
    const before = items.size;

    if (mode === 'members') {
      document.querySelectorAll(SELECTORS.userCell).forEach((cell) => {
        try {
          const member = extractMember(cell);
          if (member && !items.has(member.handle)) items.set(member.handle, member);
        } catch (e) {
          log.error(`Skipped a member: ${e.message}`);
        }
      });
    } else {
      document.querySelectorAll(SELECTORS.tweet).forEach((article) => {
        try {
          const post = extractPost(article);
          if (!post || items.has(post.id)) return;
          if (!CONFIG.includeReplies && post.isReply) return;
          items.set(post.id, post);
        } catch (e) {
          log.error(`Skipped a post: ${e.message}`);
        }
      });
    }

    if (items.size > before) {
      log.progress(items.size, CONFIG.maxItems, noun);
      noNewCount = 0;
    } else {
      noNewCount++;
      if (noNewCount >= CONFIG.noNewItemsThreshold) {
        log.warning(`No new ${noun} after several scrolls. Reached the end.`);
        break;
      }
    }

    if (items.size >= CONFIG.maxItems) break;

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollAttempts++;
  }

  const list = Array.from(items.values()).slice(0, CONFIG.maxItems);

  // ============================================
  // 📊 SUMMARY + EXPORT
  // ============================================
  if (list.length === 0) {
    log.warning(`No ${noun} were found. The List may be empty, or the page had not loaded yet.`);
    return;
  }

  const safeName = listName.replace(/[^a-z0-9]/gi, '_').slice(0, 30) || 'list';
  const stamp = new Date().toISOString().split('T')[0];

  if (mode === 'members') {
    const verified = list.filter((m) => m.verified).length;
    console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 SCRAPE LIST (MEMBERS) - COMPLETE                    ║
╠══════════════════════════════════════════════════════════╣
║  📋 List:         ${String(listName).slice(0, 36).padEnd(37)}║
║  👥 Members:      ${String(list.length).padEnd(37)}║
║  ✓  Verified:     ${String(verified).padEnd(37)}║
╚══════════════════════════════════════════════════════════╝
    `);
    list.slice(0, 5).forEach((m, i) => console.log(`${i + 1}. @${m.handle}${m.verified ? ' ✓' : ''} - ${m.name}`));

    const result = { listId, listName, mode, scrapedAt: new Date().toISOString(), count: list.length, members: list };
    if (downloadFile(JSON.stringify(result, null, 2), `list_${safeName}_members_${stamp}.json`, 'application/json')) log.success('JSON downloaded');
    if (CONFIG.downloadCsv && downloadFile(membersToCSV(list), `list_${safeName}_members_${stamp}.csv`, 'text/csv')) log.success('CSV downloaded');
    window.scrapedList = result;
    window.exportCSV = () => membersToCSV(list);
  } else {
    const totalLikes = list.reduce((s, p) => s + p.likes, 0);
    console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 SCRAPE LIST (TIMELINE) - COMPLETE                   ║
╠══════════════════════════════════════════════════════════╣
║  📋 List:         ${String(listName).slice(0, 36).padEnd(37)}║
║  📝 Posts:        ${String(list.length).padEnd(37)}║
║  ❤️  Total likes:  ${String(totalLikes.toLocaleString()).padEnd(37)}║
╚══════════════════════════════════════════════════════════╝
    `);
    list.slice(0, 5).forEach((p, i) => console.log(`${i + 1}. @${p.author.handle} (${p.likes} ❤️): "${p.text.slice(0, 60)}"`));

    const result = { listId, listName, mode, scrapedAt: new Date().toISOString(), count: list.length, posts: list };
    if (downloadFile(JSON.stringify(result, null, 2), `list_${safeName}_timeline_${stamp}.json`, 'application/json')) log.success('JSON downloaded');
    if (CONFIG.downloadCsv && downloadFile(postsToCSV(list), `list_${safeName}_timeline_${stamp}.csv`, 'text/csv')) log.success('CSV downloaded');
    window.scrapedList = result;
    window.exportCSV = () => postsToCSV(list);
  }

  console.log('');
  log.info('window.scrapedList holds the full data. window.exportCSV() returns the CSV string.');
  log.success('Done! by nichxbt');

  return window.scrapedList;
})();

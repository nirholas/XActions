// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🔁 Scrape Reposters + Quoters - XActions
 * ============================================
 *
 * @name         scrape-retweeters
 * @description  Scroll a post's Reposts and Quotes tabs and export everyone who reposted or quote-tweeted it, each tagged repost or quote, to JSON and CSV.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Open a post's Reposts page: x.com/<user>/status/<id>/retweets
 *      (open the post, tap the reposts count, choose "Reposts")
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   On x.com/nasa/status/1234567890/retweets the script scrapes the reposters,
 *   then switches itself to the /quotes tab in the same page and scrapes the
 *   quote-tweets too, tagging each row repost or quote. It downloads
 *   tweet_1234567890_reposters_<date>.json and prints a CSV string. If the
 *   quotes tab cannot be reached automatically, open x.com/<user>/status/<id>/quotes
 *   and run the script again; results merge across runs for the same post.
 *   To stop early: window.stopScrapeReposters().
 *
 * ============================================
 */

(async function scrapeReposters() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Collect users who reposted (the /retweets tab)
    collectReposts: true,

    // Collect users who quote-tweeted (the /quotes tab)
    collectQuotes: true,

    // Stop after collecting this many entries total (safety cap)
    maxEntries: 5000,

    // How far to scroll each step (pixels)
    scrollStep: 1400,

    // Delay between scrolls (ms). Raise to 2500+ on a slow connection so rows load.
    scrollDelay: 1500,

    // Give up on a tab after this many consecutive scrolls with no new rows
    stallLimit: 6,

    // Hard cap on scroll attempts per tab, independent of stalls
    maxScrollAttempts: 300,

    // Also trigger a browser download of the CSV file (JSON always downloads)
    autoDownloadCsv: false
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    userCell: '[data-testid="UserCell"]',
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userName: '[data-testid="User-Name"]',
    userDescription: '[data-testid="UserDescription"]',
    followsYou: '[data-testid="userFollowIndicator"]',
    verified: 'svg[aria-label*="Verified"], [data-testid="icon-verified"]',
    profileLink: 'a[href^="/"]'
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
    count: (label, n) => console.log(`🔁 Collected ${n} ${label}...`)
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

  // Reposters render as UserCell rows (people).
  const extractUser = (cell) => {
    const anchors = Array.from(cell.querySelectorAll(SELECTORS.profileLink));

    let handle = '';
    for (const a of anchors) {
      const href = a.getAttribute('href') || '';
      const m = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
      if (m) { handle = m[1]; break; }
    }
    if (!handle) {
      const at = anchors.find((a) => a.textContent.trim().startsWith('@'));
      if (at) handle = at.textContent.trim().slice(1).split(/\s/)[0];
    }
    if (!handle) return null;

    let displayName = '';
    const nameAnchor = anchors.find((a) => {
      const t = a.textContent.trim();
      return t && !t.startsWith('@');
    });
    displayName = (nameAnchor && nameAnchor.textContent.trim()) ||
      (cell.querySelector('div[dir="ltr"] span')?.textContent.trim()) || '';

    let bio = cell.querySelector(SELECTORS.userDescription)?.textContent?.trim() || '';
    if (!bio) {
      const auto = cell.querySelector('[dir="auto"]:not([data-testid])')?.textContent?.trim();
      if (auto && auto.length >= 10 && !auto.startsWith('@')) bio = auto;
    }

    return {
      type: 'repost',
      handle,
      displayName,
      bio,
      verified: !!cell.querySelector(SELECTORS.verified),
      followsYou: !!cell.querySelector(SELECTORS.followsYou),
      profileUrl: `https://x.com/${handle}`
    };
  };

  // Quote-tweets render as full article tweets (post + author + counts).
  const extractQuote = (article) => {
    const timeEl = article.querySelector('time');
    const permalink = timeEl?.closest('a[href*="/status/"]') || article.querySelector('a[href*="/status/"]');
    const url = permalink ? permalink.href : '';
    const quoteId = url ? (url.split('/status/')[1] || '').split(/[?/]/)[0] : '';
    if (!quoteId) return null;

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

    return {
      type: 'quote',
      quoteId,
      handle,
      displayName,
      verified,
      text,
      url,
      time,
      replies: getMetric('reply'),
      retweets: getMetric('retweet'),
      likes: getMetric('like'),
      views
    };
  };

  const getTweetId = () => (window.location.pathname.match(/status\/(\d+)/) || [])[1] || null;

  // ============================================
  // 🛑 STOP SWITCH
  // ============================================
  let stopped = false;
  window.stopScrapeReposters = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current scroll, then exporting what was collected.');
  };

  // ============================================
  // 🚦 PAGE GUARD
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🔁 SCRAPE REPOSTERS + QUOTERS - XActions                ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  const tweetId = getTweetId();
  if (!tweetId || !/\/(retweets|quotes)\/?$/.test(window.location.pathname)) {
    log.warning('You are not on a post Reposts or Quotes page.');
    log.info('Open a post, tap its reposts count, and land on x.com/<user>/status/<id>/retweets (or /quotes), then run this again.');
    return;
  }

  log.info(`Scraping reposters and quoters of post ${tweetId}`);
  log.info(`To stop early: window.stopScrapeReposters()`);

  // ============================================
  // 🎯 COLLECTION (merges across tabs and across runs)
  // ============================================
  const items = new Map();
  const stats = { reposts: 0, quotes: 0, verified: 0, scrolls: 0, errors: 0 };

  // Seed from a prior run against the same post so a manual two-tab flow merges.
  const prior = window.__scrapeRepostersData;
  if (prior && prior.tweetId === tweetId && Array.isArray(prior.entries)) {
    prior.entries.forEach((e) => {
      const key = e.type === 'quote' ? `quote:${e.quoteId}` : `repost:${e.handle}`;
      if (!items.has(key)) items.set(key, e);
    });
    if (items.size) log.info(`Merged ${items.size} entries from a previous run on this post.`);
  }

  const harvest = async (kind) => {
    const label = kind === 'repost' ? 'reposters' : 'quotes';
    let scrollAttempts = 0;
    let stall = 0;

    while (!stopped && items.size < CONFIG.maxEntries && stall < CONFIG.stallLimit && scrollAttempts < CONFIG.maxScrollAttempts) {
      const before = items.size;

      if (kind === 'repost') {
        document.querySelectorAll(SELECTORS.userCell).forEach((cell) => {
          try {
            const u = extractUser(cell);
            if (u && u.handle) {
              const key = `repost:${u.handle}`;
              if (!items.has(key)) items.set(key, u);
            }
          } catch (e) { stats.errors++; }
        });
      } else {
        document.querySelectorAll(SELECTORS.tweet).forEach((article) => {
          try {
            const q = extractQuote(article);
            if (q && q.quoteId && q.quoteId !== tweetId) {
              const key = `quote:${q.quoteId}`;
              if (!items.has(key)) items.set(key, q);
            }
          } catch (e) { stats.errors++; }
        });
      }

      if (items.size > before) {
        log.count(label, items.size);
        stall = 0;
      } else {
        stall++;
      }

      window.scrollBy(0, CONFIG.scrollStep);
      await randomDelay();
      scrollAttempts++;
      stats.scrolls++;
    }
  };

  // Switch tabs inside the single-page app (no full reload, script keeps running).
  const goToTab = async (segment) => {
    if (new RegExp(`/${segment}/?$`).test(window.location.pathname)) return true;
    const link = Array.from(document.querySelectorAll('a[href*="/status/"]'))
      .find((a) => new RegExp(`/status/${tweetId}/${segment}$`).test(a.getAttribute('href') || ''));
    if (!link) return false;
    link.click();
    for (let i = 0; i < 40 && !stopped; i++) {
      await sleep(300);
      if (new RegExp(`/${segment}/?$`).test(window.location.pathname)) {
        await sleep(900); // let the first rows render
        return true;
      }
    }
    return new RegExp(`/${segment}/?$`).test(window.location.pathname);
  };

  // Scrape reposts first, then quotes, whichever tab we started on.
  if (CONFIG.collectReposts && !stopped) {
    if (await goToTab('retweets')) {
      window.scrollTo(0, 0);
      await sleep(600);
      await harvest('repost');
    } else {
      log.warning('Could not open the Reposts tab automatically. Open x.com/<user>/status/<id>/retweets and run again to add reposters.');
    }
  }

  if (CONFIG.collectQuotes && !stopped) {
    if (await goToTab('quotes')) {
      window.scrollTo(0, 0);
      await sleep(600);
      await harvest('quote');
    } else {
      log.warning('Could not open the Quotes tab automatically. Open x.com/<user>/status/<id>/quotes and run again to add quote-tweets.');
    }
  }

  const list = Array.from(items.values()).slice(0, CONFIG.maxEntries);
  stats.reposts = list.filter((e) => e.type === 'repost').length;
  stats.quotes = list.filter((e) => e.type === 'quote').length;
  stats.verified = list.filter((e) => e.verified).length;

  // ============================================
  // 📤 EXPORT
  // ============================================
  const result = {
    tweetId,
    scrapedAt: new Date().toISOString(),
    total: list.length,
    reposts: stats.reposts,
    quotes: stats.quotes,
    entries: list
  };

  const buildCsv = () => {
    const header = 'Type,Handle,DisplayName,Verified,FollowsYou,Bio,QuoteId,Text,Likes,Retweets,Replies,Views,URL,Time';
    const rows = list.map((e) => [
      e.type,
      csvCell('@' + (e.handle || '')),
      csvCell(e.displayName),
      !!e.verified,
      e.type === 'repost' ? !!e.followsYou : '',
      csvCell(e.type === 'repost' ? (e.bio || '') : ''),
      csvCell(e.type === 'quote' ? e.quoteId : ''),
      csvCell(e.type === 'quote' ? e.text : ''),
      e.type === 'quote' ? e.likes : '',
      e.type === 'quote' ? e.retweets : '',
      e.type === 'quote' ? e.replies : '',
      e.type === 'quote' ? e.views : '',
      csvCell(e.type === 'quote' ? e.url : (e.profileUrl || '')),
      csvCell(e.type === 'quote' ? e.time : '')
    ].join(','));
    return [header, ...rows].join('\n');
  };

  const csv = buildCsv();
  const dateStr = new Date().toISOString().split('T')[0];

  // Persist for a possible follow-up run on the other tab.
  window.__scrapeRepostersData = { tweetId, entries: list };

  if (list.length === 0) {
    log.warning('No reposters or quoters were collected. The post may have none, or both tabs were unreachable.');
  } else {
    download(JSON.stringify(result, null, 2), `tweet_${tweetId}_reposters_${dateStr}.json`, 'application/json');
    log.success(`Downloaded tweet_${tweetId}_reposters_${dateStr}.json`);
    if (CONFIG.autoDownloadCsv) {
      download(csv, `tweet_${tweetId}_reposters_${dateStr}.csv`, 'text/csv');
      log.success(`Downloaded tweet_${tweetId}_reposters_${dateStr}.csv`);
    }
  }

  window.scrapedReposters = result;
  window.scrapeRepostersExportCSV = () => {
    download(csv, `tweet_${tweetId}_reposters_${dateStr}.csv`, 'text/csv');
    return csv;
  };

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 SCRAPE REPOSTERS + QUOTERS - COMPLETE                ║
╠══════════════════════════════════════════════════════════╣
║  🔁 Reposters:           ${String(stats.reposts).padEnd(30)}║
║  💬 Quote-tweets:        ${String(stats.quotes).padEnd(30)}║
║  ✔️  Verified (either):   ${String(stats.verified).padEnd(30)}║
║  📜 Scrolls:             ${String(stats.scrolls).padEnd(30)}║
║  ❌ Row errors:          ${String(stats.errors).padEnd(30)}║
╚══════════════════════════════════════════════════════════╝
  `);

  list.slice(0, 5).forEach((e, i) => {
    if (e.type === 'quote') {
      console.log(`${i + 1}. [quote] @${e.handle}${e.verified ? ' ✓' : ''} (${e.likes} ❤️): "${e.text.slice(0, 50)}..."`);
    } else {
      console.log(`${i + 1}. [repost] @${e.handle}${e.verified ? ' ✓' : ''} - ${e.displayName}`);
    }
  });
  if (list.length > 5) console.log(`   ... and ${list.length - 5} more`);

  console.log('\n📋 CSV preview (full string via window.scrapeRepostersExportCSV()):');
  console.log(csv.split('\n').slice(0, 6).join('\n'));
  console.log('\n💡 window.scrapedReposters = full data. window.scrapeRepostersExportCSV() = download + return CSV.');

  return result;
})();

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🎙️ Scrape Spaces - XActions
 * ============================================
 *
 * @name         scrape-spaces
 * @description  Scrape Twitter Spaces from the DOM: list a profile's Spaces, or capture a single Space card's title, host, and listeners.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to a profile that hosts Spaces (e.g. https://x.com/<handle>), scroll to
 *      any Space cards, OR open a Space page / listening view directly.
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   On a profile, paste and the script auto-scrolls, collects every Space card it
 *   can see (title, host, listeners, live/scheduled, link) and downloads
 *   spaces_<date>.json and .csv. Inside a live Space it captures the current
 *   title, host, listener count, and the speaker handles instead.
 *   To stop early, run window.stopScrapeSpaces() in the console.
 *
 * ============================================
 */

(async function scrapeSpaces() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of Space cards to collect when listing
    maxSpaces: 50,

    // Maximum scroll attempts when listing Spaces on a profile
    maxScrollAttempts: 60,

    // Stop after this many scrolls with no new Spaces
    noNewThreshold: 4,

    // Delay between scrolls (ms)
    scrollDelay: 1500,

    // Auto-download the results as files when finished
    downloadJSON: true,
    downloadCSV: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    // Markers that we are INSIDE a Space (listening/hosting)
    inSpace: '[data-testid="spaceSpeakers"], [data-testid="audioSpaceInlineTitle"], [aria-label="Space"]',
    // Space title inside an open Space
    spaceTitle: '[data-testid="audioSpaceInlineTitle"], [data-testid="spaceTitle"]',
    // Speaker/participant cells
    userCell: '[data-testid="UserCell"]',
    // A Space card / link anywhere in the timeline
    spaceCard: 'a[href*="/i/spaces/"], [data-testid="placementTracking"] a[href*="/spaces/"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`)
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
      log.error(`Failed to download ${filename}: ${e.message}`);
      return false;
    }
  };

  const handleFromLink = (link) => {
    if (!link) return '';
    const href = link.getAttribute('href') || '';
    const m = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
    return m ? m[1] : '';
  };

  // ============================================
  // 🎯 MAIN
  // ============================================
  let stopped = false;
  window.stopScrapeSpaces = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current pass, then exporting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🎙️ SCRAPE SPACES - XActions                             ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  const insideSpace = document.querySelector(SELECTORS.inSpace) !== null;

  // ------------------------------------------------------------------
  // MODE A: inside a live/open Space -> capture its metadata + speakers
  // ------------------------------------------------------------------
  if (insideSpace) {
    log.info('Detected an open Space. Capturing metadata and speakers...');

    const titleEl = document.querySelector(SELECTORS.spaceTitle);
    const title = titleEl ? titleEl.textContent.trim() : '';

    // Listener count: X renders it as text like "1,234 listening". Find the
    // nearest element whose text mentions listening/tuned in.
    let listeners = '';
    const candidates = document.querySelectorAll('span, div');
    for (const el of candidates) {
      const t = el.textContent.trim();
      if (/^[\d,\.KMB]+\s+(listening|listeners|tuned in)/i.test(t)) { listeners = t; break; }
    }

    const speakers = [];
    document.querySelectorAll(SELECTORS.userCell).forEach(cell => {
      try {
        const handle = handleFromLink(cell.querySelector('a[href^="/"]'));
        const nameEl = cell.querySelector('[dir="ltr"] span, [dir="ltr"]');
        const name = nameEl ? nameEl.textContent.trim() : '';
        if (!handle) return;
        if (!speakers.find(s => s.handle === handle)) {
          speakers.push({ handle, name });
        }
      } catch (e) {
        // Skip malformed cell
      }
    });

    const result = {
      mode: 'space',
      url: window.location.href,
      title,
      listeners,
      host: speakers.length > 0 ? speakers[0].handle : '',
      speakers,
      scrapedAt: new Date().toISOString()
    };

    console.log('');
    console.log(`📋 Title: ${title || '(not found)'}`);
    console.log(`👥 Listeners: ${listeners || '(not found)'}`);
    console.log(`🎤 Speakers captured: ${speakers.length}`);
    if (speakers.length > 0) {
      speakers.slice(0, 10).forEach((s, i) => console.log(`   ${i + 1}. @${s.handle}${s.name ? ` (${s.name})` : ''}`));
    }

    const dateStr = new Date().toISOString().split('T')[0];
    console.log('');
    if (CONFIG.downloadJSON) {
      if (download(JSON.stringify(result, null, 2), `space_${dateStr}.json`, 'application/json')) {
        log.success('JSON downloaded');
      }
    }
    if (CONFIG.downloadCSV) {
      const esc = (v) => `"${String(v).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
      const csv = [
        ['Handle', 'Name'].join(','),
        ...speakers.map(s => [esc(s.handle), esc(s.name)].join(','))
      ].join('\n');
      if (download(csv, `space_speakers_${dateStr}.csv`, 'text/csv')) {
        log.success('CSV (speakers) downloaded');
      }
    }

    window.scrapedSpace = result;
    console.log('\n💡 Access your data: window.scrapedSpace');
    console.log('✅ Script completed! by nichxbt');
    return result;
  }

  // ------------------------------------------------------------------
  // MODE B: on a profile / timeline -> list Space cards
  // ------------------------------------------------------------------
  log.info('No open Space detected. Listing Space cards from the page...');
  log.info(`Max Spaces: ${CONFIG.maxSpaces}`);
  log.info('To stop early: window.stopScrapeSpaces()');
  console.log('');

  const spaces = new Map();
  let scrollAttempts = 0;
  let noNewCount = 0;

  const collectCards = () => {
    document.querySelectorAll(SELECTORS.spaceCard).forEach(card => {
      try {
        const link = card.href || (card.querySelector('a[href*="/spaces/"]') || {}).href || '';
        if (!link) return;
        const idMatch = link.match(/\/spaces\/([A-Za-z0-9]+)/);
        const id = idMatch ? idMatch[1] : link;
        if (spaces.has(id)) return;

        const container = card.closest('article, [data-testid="cellInnerDiv"]') || card;
        const text = (container.textContent || '').trim();
        const lower = text.toLowerCase();
        const isLive = lower.includes('live') && !lower.includes('recorded');

        // Listener/participant count if present in the card text
        const listenersMatch = text.match(/([\d,\.KMB]+)\s+(listening|listeners|tuned in|played)/i);
        const listeners = listenersMatch ? listenersMatch[0] : '';

        // Host handle: first bare profile link in the card container
        let host = '';
        for (const a of container.querySelectorAll('a[href^="/"]')) {
          const h = handleFromLink(a);
          if (h) { host = h; break; }
        }

        spaces.set(id, {
          id,
          title: text.slice(0, 140),
          host,
          listeners,
          isLive,
          link: link.startsWith('http') ? link : `https://x.com${link}`
        });
      } catch (e) {
        // Skip malformed card
      }
    });
  };

  while (!stopped && spaces.size < CONFIG.maxSpaces && scrollAttempts < CONFIG.maxScrollAttempts) {
    const before = spaces.size;
    collectCards();

    const added = spaces.size - before;
    if (added > 0) {
      log.info(`Collected ${spaces.size} Spaces (+${added})`);
      noNewCount = 0;
    } else {
      noNewCount++;
      if (noNewCount >= CONFIG.noNewThreshold) {
        break;
      }
    }

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollAttempts++;
  }
  collectCards();

  const list = Array.from(spaces.values());

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  📊 SCRAPE SPACES - COMPLETE                             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`🎙️ Total Spaces: ${list.length}`);
  console.log(`📜 Scroll attempts: ${scrollAttempts}`);

  if (list.length === 0) {
    log.warning('No Space cards found on this page.');
    log.info('Open a profile that hosts Spaces (scroll to a Space card), or open a Space directly, then rerun.');
    return { spaces: [] };
  }

  list.forEach((s, i) => {
    console.log(`   ${s.isLive ? '🔴' : '⏳'} ${i + 1}. ${s.title.slice(0, 70)}${s.listeners ? ` (${s.listeners})` : ''}`);
  });

  const dateStr = new Date().toISOString().split('T')[0];
  const result = { mode: 'listing', count: list.length, spaces: list, scrapedAt: new Date().toISOString() };

  console.log('');
  if (CONFIG.downloadJSON) {
    if (download(JSON.stringify(result, null, 2), `spaces_${dateStr}.json`, 'application/json')) {
      log.success('JSON downloaded');
    }
  }
  if (CONFIG.downloadCSV) {
    const esc = (v) => `"${String(v).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    const csv = [
      ['Title', 'Host', 'Listeners', 'IsLive', 'Link'].join(','),
      ...list.map(s => [esc(s.title), esc(s.host), esc(s.listeners), s.isLive, esc(s.link)].join(','))
    ].join('\n');
    if (download(csv, `spaces_${dateStr}.csv`, 'text/csv')) {
      log.success('CSV downloaded');
    }
  }

  window.scrapedSpaces = result;
  console.log('\n💡 Access your data: window.scrapedSpaces');
  console.log('✅ Script completed! by nichxbt');

  return result;
})();

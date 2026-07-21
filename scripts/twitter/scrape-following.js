// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 👣 Scrape Following - XActions
 * ============================================
 *
 * @name         scrape-following
 * @description  Scroll the following list of any profile and export everyone it follows (handle, name, bio, verified, follows-you) to JSON and CSV.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/<user>/following (for your own list: x.com/<you>/following)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   On x.com/nasa/following the script auto-scrolls, prints a running count
 *   ("Collected 180 following..."), then downloads nasa_following_<date>.json
 *   and reports how many of them follow you back (mutuals). To stop early:
 *   window.stopScrapeFollowing().
 *
 * ============================================
 */

(async function scrapeFollowing() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Stop after collecting this many accounts (safety cap)
    maxUsers: 5000,

    // How far to scroll each step (pixels)
    scrollStep: 1400,

    // Delay between scrolls (ms). Raise to 2500+ on a slow connection so rows load.
    scrollDelay: 1500,

    // Give up after this many consecutive scrolls with no new accounts (end of list)
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
    userCell: '[data-testid="UserCell"]',
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
    count: (n) => console.log(`👣 Collected ${n} following...`)
  };

  const csvCell = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

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
      handle,
      displayName,
      bio,
      verified: !!cell.querySelector(SELECTORS.verified),
      followsYou: !!cell.querySelector(SELECTORS.followsYou),
      profileUrl: `https://x.com/${handle}`
    };
  };

  // ============================================
  // 🛑 STOP SWITCH
  // ============================================
  let stopped = false;
  window.stopScrapeFollowing = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current scroll, then exporting what was collected.');
  };

  // ============================================
  // 🚦 PAGE GUARD
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  👣 SCRAPE FOLLOWING - XActions                          ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  if (!/\/following\/?$/.test(window.location.pathname)) {
    log.warning('You are not on a following page.');
    log.info('Go to x.com/<user>/following (for example x.com/nasa/following), then run this again.');
    return;
  }

  const username = window.location.pathname.split('/')[1] || 'unknown';
  log.info(`Scraping following list of @${username}`);
  log.info(`Max accounts: ${CONFIG.maxUsers}. To stop early: window.stopScrapeFollowing()`);

  // ============================================
  // 🎯 MAIN LOOP
  // ============================================
  const users = new Map();
  const stats = { collected: 0, verified: 0, mutuals: 0, scrolls: 0, errors: 0 };

  let scrollAttempts = 0;
  let stall = 0;

  while (!stopped && users.size < CONFIG.maxUsers && stall < CONFIG.stallLimit && scrollAttempts < CONFIG.maxScrollAttempts) {
    const before = users.size;
    const cells = document.querySelectorAll(SELECTORS.userCell);

    cells.forEach((cell) => {
      try {
        const u = extractUser(cell);
        if (u && u.handle && !users.has(u.handle)) users.set(u.handle, u);
      } catch (e) {
        stats.errors++;
      }
    });

    if (users.size > before) {
      log.count(users.size);
      stall = 0;
    } else {
      stall++;
    }

    window.scrollBy(0, CONFIG.scrollStep);
    await randomDelay();
    scrollAttempts++;
    stats.scrolls = scrollAttempts;
  }

  const list = Array.from(users.values()).slice(0, CONFIG.maxUsers);
  stats.collected = list.length;
  stats.verified = list.filter((u) => u.verified).length;
  stats.mutuals = list.filter((u) => u.followsYou).length;

  // ============================================
  // 📤 EXPORT
  // ============================================
  const result = {
    profile: username,
    profileUrl: `https://x.com/${username}`,
    scrapedAt: new Date().toISOString(),
    total: list.length,
    mutuals: stats.mutuals,
    following: list
  };

  const buildCsv = () => {
    const header = 'Handle,DisplayName,Bio,Verified,FollowsYou,ProfileURL';
    const rows = list.map((u) => [
      csvCell('@' + u.handle),
      csvCell(u.displayName),
      csvCell(u.bio),
      u.verified,
      u.followsYou,
      csvCell(u.profileUrl)
    ].join(','));
    return [header, ...rows].join('\n');
  };

  const csv = buildCsv();
  const dateStr = new Date().toISOString().split('T')[0];

  if (list.length === 0) {
    log.warning('No accounts were collected. The list may be empty, private, or blocked from view.');
  } else {
    download(JSON.stringify(result, null, 2), `${username}_following_${dateStr}.json`, 'application/json');
    log.success(`Downloaded ${username}_following_${dateStr}.json`);
    if (CONFIG.autoDownloadCsv) {
      download(csv, `${username}_following_${dateStr}.csv`, 'text/csv');
      log.success(`Downloaded ${username}_following_${dateStr}.csv`);
    }
  }

  window.scrapedFollowing = result;
  window.scrapeFollowingExportCSV = () => {
    download(csv, `${username}_following_${dateStr}.csv`, 'text/csv');
    return csv;
  };

  // ============================================
  // 📊 SUMMARY
  // ============================================
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 SCRAPE FOLLOWING - COMPLETE                          ║
╠══════════════════════════════════════════════════════════╣
║  👣 Accounts collected:  ${String(stats.collected).padEnd(30)}║
║  ✔️  Verified:            ${String(stats.verified).padEnd(30)}║
║  🤝 Mutuals (follow you):${String(stats.mutuals).padEnd(30)}║
║  📜 Scrolls:             ${String(stats.scrolls).padEnd(30)}║
║  ❌ Row errors:          ${String(stats.errors).padEnd(30)}║
╚══════════════════════════════════════════════════════════╝
  `);

  list.slice(0, 5).forEach((u, i) => {
    console.log(`${i + 1}. @${u.handle}${u.verified ? ' ✓' : ''} - ${u.displayName}${u.followsYou ? ' (follows you)' : ''}`);
  });
  if (list.length > 5) console.log(`   ... and ${list.length - 5} more`);

  console.log('\n📋 CSV preview (full string via window.scrapeFollowingExportCSV()):');
  console.log(csv.split('\n').slice(0, 6).join('\n'));
  console.log('\n💡 window.scrapedFollowing = full data. window.scrapeFollowingExportCSV() = download + return CSV.');

  return result;
})();

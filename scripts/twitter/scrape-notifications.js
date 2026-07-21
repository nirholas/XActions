// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🔔 Scrape Notifications - XActions
 * ============================================
 *
 * @name         scrape-notifications
 * @description  Export your notifications feed (type, actor handles, text, timestamp) to JSON and CSV.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to https://x.com/notifications (the "All" tab captures the most)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   Leave CONFIG.maxNotifications at 500 and paste. The script auto-scrolls the
 *   notifications feed, dedupes each item, prints a breakdown by type plus your
 *   top interactors, then downloads notifications_<date>.json and .csv.
 *   To stop early, run window.stopScrapeNotifications() in the console.
 *
 * ============================================
 */

(async function scrapeNotifications() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of notifications to collect
    maxNotifications: 500,

    // Maximum scroll attempts before giving up
    maxScrollAttempts: 200,

    // Stop after this many scrolls with no new notifications (end of feed)
    noNewThreshold: 5,

    // Delay between scrolls (ms). Raise if items load slowly.
    scrollDelay: 1500,

    // Auto-download the results as files when finished
    downloadJSON: true,
    downloadCSV: true
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    // Notification rows render as cellInnerDiv; older layouts use article
    row: '[data-testid="cellInnerDiv"], article',
    // Any profile link inside a row (used to extract actor handles)
    profileLink: 'a[href^="/"]',
    // Link to the related tweet, when the notification references one
    statusLink: 'a[href*="/status/"]',
    time: 'time'
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

  // Reserved handles that appear as links but are not actors
  const NON_ACTOR = new Set([
    'home', 'explore', 'notifications', 'messages', 'search', 'settings',
    'i', 'compose', 'hashtag', 'intent'
  ]);

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

  const classifyType = (text) => {
    const t = text.toLowerCase();
    if (t.includes('liked')) return 'like';
    if (t.includes('reposted') || t.includes('retweeted')) return 'retweet';
    if (t.includes('followed')) return 'follow';
    if (t.includes('quoted')) return 'quote';
    if (t.includes('replied') || t.includes('replying to')) return 'reply';
    if (t.includes('mentioned')) return 'mention';
    if (t.includes('there was a login') || t.includes('new login')) return 'security';
    if (t.includes('live') && t.includes('space')) return 'space';
    return 'other';
  };

  const extractActors = (row) => {
    const handles = [];
    row.querySelectorAll(SELECTORS.profileLink).forEach(link => {
      const href = link.getAttribute('href') || '';
      // A bare "/handle" link, no deeper path, is a profile
      const m = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
      if (!m) return;
      const handle = m[1];
      if (NON_ACTOR.has(handle.toLowerCase())) return;
      if (!handles.includes(handle)) handles.push(handle);
    });
    return handles;
  };

  const extractNotification = (row) => {
    const text = (row.textContent || '').trim();
    if (text.length < 4) return null;

    const actors = extractActors(row);
    const statusLink = row.querySelector(SELECTORS.statusLink);
    const tweetUrl = statusLink ? statusLink.href : '';

    const timeEl = row.querySelector(SELECTORS.time);
    const timestamp = timeEl ? (timeEl.getAttribute('datetime') || '') : '';
    const displayTime = timeEl ? timeEl.textContent.trim() : '';

    return {
      type: classifyType(text),
      actors,
      text: text.slice(0, 500),
      tweetUrl,
      timestamp,
      displayTime,
      scrapedAt: new Date().toISOString()
    };
  };

  // ============================================
  // 🎯 MAIN
  // ============================================
  let stopped = false;
  window.stopScrapeNotifications = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current pass, then exporting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🔔 SCRAPE NOTIFICATIONS - XActions                      ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: warn (do not hard-redirect) if we are not on notifications
  if (!window.location.pathname.includes('/notifications')) {
    log.warning('You are not on the notifications page.');
    log.info('Go to https://x.com/notifications, then paste this script again.');
    return;
  }

  log.info(`Max notifications: ${CONFIG.maxNotifications}`);
  log.info('To stop early: window.stopScrapeNotifications()');
  console.log('');

  const notifications = new Map();
  let scrollAttempts = 0;
  let noNewCount = 0;

  while (!stopped && notifications.size < CONFIG.maxNotifications && scrollAttempts < CONFIG.maxScrollAttempts) {
    const rows = document.querySelectorAll(SELECTORS.row);
    const before = notifications.size;

    rows.forEach(row => {
      try {
        const n = extractNotification(row);
        if (!n) return;
        // Dedupe on type + actors + a text fingerprint
        const key = `${n.type}|${n.actors.join(',')}|${n.text.slice(0, 80)}`;
        if (!notifications.has(key)) notifications.set(key, n);
      } catch (e) {
        // One malformed row must not kill the run
      }
    });

    const added = notifications.size - before;
    if (added > 0) {
      log.info(`Collected ${notifications.size} notifications (+${added})`);
      noNewCount = 0;
    } else {
      noNewCount++;
      if (noNewCount >= CONFIG.noNewThreshold) {
        log.warning('No new notifications after several scrolls. Reached the end.');
        break;
      }
    }

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollAttempts++;
  }

  const list = Array.from(notifications.values());

  // ============================================
  // 📊 SUMMARY
  // ============================================
  const byType = {};
  const byActor = {};
  list.forEach(n => {
    byType[n.type] = (byType[n.type] || 0) + 1;
    n.actors.forEach(a => { byActor[a] = (byActor[a] || 0) + 1; });
  });

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  📊 NOTIFICATIONS - COMPLETE                             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`🔔 Total notifications: ${list.length}`);
  console.log(`📜 Scroll attempts: ${scrollAttempts}`);

  if (list.length === 0) {
    log.warning('No notifications found. Your feed may be empty, or the page had not loaded.');
    return { notifications: [] };
  }

  console.log('\n📊 By type:');
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });

  const topActors = Object.entries(byActor).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (topActors.length > 0) {
    console.log('\n👥 Top interactors:');
    topActors.forEach(([user, count]) => console.log(`   @${user}: ${count}`));
  }

  // ============================================
  // 💾 EXPORT
  // ============================================
  const dateStr = new Date().toISOString().split('T')[0];
  const result = {
    exportedAt: new Date().toISOString(),
    count: list.length,
    byType,
    notifications: list
  };

  console.log('');
  if (CONFIG.downloadJSON) {
    if (download(JSON.stringify(result, null, 2), `notifications_${dateStr}.json`, 'application/json')) {
      log.success('JSON downloaded');
    }
  }

  if (CONFIG.downloadCSV) {
    const esc = (v) => `"${String(v).replace(/"/g, '""').replace(/\n/g, ' ')}"`;
    const csv = [
      ['Type', 'Actors', 'Text', 'TweetURL', 'Timestamp', 'DisplayTime'].join(','),
      ...list.map(n => [
        esc(n.type),
        esc(n.actors.join(' ')),
        esc(n.text),
        esc(n.tweetUrl),
        esc(n.timestamp),
        esc(n.displayTime)
      ].join(','))
    ].join('\n');
    if (download(csv, `notifications_${dateStr}.csv`, 'text/csv')) {
      log.success('CSV downloaded');
    }
  }

  window.scrapedNotifications = result;
  console.log('\n💡 Access your data: window.scrapedNotifications');
  console.log('✅ Script completed! by nichxbt');

  return result;
})();

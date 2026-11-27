// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🔔 Notification Manager - XActions
 * ============================================
 *
 * @name        notificationManager.js
 * @title       Notification Manager
 * @description Scrape a categorized summary of your notifications and export it, or mark all notifications as read.
 * @category    monitor
 * @page        x.com/notifications or x.com/notifications/mentions
 * @writes      false
 * @aliases     scripts/manageNotifications.js, scripts/notificationManager.js, scripts/twitter/notification-manager.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @website     https://xactions.app
 *
 * Usage:
 *   1. Go to x.com/notifications
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. Set CONFIG.action to 'markRead' or 'summary'
 *   4. Paste browser/notificationManager.js and press Enter
 *
 * Example:
 *   action: 'markRead' -> opens the notifications overflow (...) menu and clicks
 *   "Mark all as read" if X exposes it, then scrolls the feed so anything left is
 *   marked read on view. action: 'summary' -> scrolls the feed, classifies each
 *   notification (like / repost / follow / mention / quote), prints the counts,
 *   and downloads a JSON + CSV report.
 *
 *   filterType: 'mentions' switches to the Mentions tab and keeps only mentions
 *   and replies; 'verified' keeps only notifications from verified accounts.
 *
 * ============================================
 */

(async function notificationManager() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // 'markRead' -> clear the unread state. 'summary' -> scrape + export.
    action: 'summary',

    // ---- summary options ----
    maxNotifications: 100,   // cap for the summary scrape
    filterType: 'all',       // 'all' | 'mentions' | 'verified'
    separateReplies: false,  // count "replied" as its own 'reply' type instead of 'mention'
    includeLinks: false,     // add the first 5 profile/post links of each notification as `users`
    exportResults: true,     // download JSON + CSV when action is 'summary'
    logJSON: false,          // also print the full JSON report to the console
    copyToClipboard: false,  // also copy the JSON report to the clipboard

    // ---- shared scrolling ----
    maxScrollRounds: 30,
    maxScrollRetries: 5,     // summary stops after N scrolls with nothing new
    scrollDelay: 1500
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    cell: '[data-testid="cellInnerDiv"]',
    notification: '[data-testid="notification"]',
    tweet: 'article[data-testid="tweet"]',
    verified: '[data-testid="icon-verified"]',
    caret: '[data-testid="caret"]',
    menuItem: '[role="menuitem"]',
    confirm: '[data-testid="confirmationSheetConfirm"]',
    mentionsTab: 'a[href="/notifications/mentions"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const download = (blob, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const downloadJSON = (data, filename) =>
    download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);

  const downloadCSV = (rows, filename) => {
    const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const headers = ['type', 'time', 'verified', 'text'];
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push([r.type, r.time, r.isVerified, r.text].map(esc).join(','));
    }
    download(new Blob([lines.join('\n')], { type: 'text/csv' }), filename);
  };

  const classify = (text) => {
    const lc = text.toLowerCase();
    if (lc.includes('liked your') || lc.includes(' liked ')) return 'like';
    if (lc.includes('reposted') || lc.includes('retweeted')) return 'repost';
    if (lc.includes('followed you')) return 'follow';
    if (lc.includes('quoted')) return 'quote';
    if (CONFIG.separateReplies && lc.includes('replied')) return 'reply';
    if (lc.includes('replied') || lc.includes('mentioned') || lc.includes(' tagged ')) return 'mention';
    return 'other';
  };

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`)
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🔔 NOTIFICATION MANAGER - XActions                      ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard
  if (!/\/notifications/.test(window.location.pathname)) {
    log.error('Not on the Notifications page. Go to https://x.com/notifications and re-run.');
    return;
  }

  // ============================================
  // ✅ ACTION: MARK ALL AS READ
  // ============================================
  const markRead = async () => {
    log.info('Attempting to mark all notifications as read...');

    // Try the timeline overflow (...) menu first. X labels it via the caret testid.
    let clickedMenu = false;
    const carets = document.querySelectorAll(SELECTORS.caret);
    // The header caret sits high on the page; take the top-most one.
    const headerCaret = Array.from(carets)
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];

    if (headerCaret) {
      try {
        headerCaret.click();
        await sleep(700);
        const items = document.querySelectorAll(SELECTORS.menuItem);
        for (const item of items) {
          if (/mark all as read/i.test(item.textContent)) {
            item.click();
            clickedMenu = true;
            await sleep(700);
            const confirm = document.querySelector(SELECTORS.confirm);
            if (confirm) { confirm.click(); await sleep(700); }
            log.success('Clicked "Mark all as read".');
            break;
          }
        }
        if (!clickedMenu) {
          // Close the menu we opened.
          document.body.click();
          await sleep(300);
        }
      } catch (e) {
        log.warning(`Overflow menu path failed: ${e.message}`);
      }
    }

    if (!clickedMenu) {
      log.info('No "Mark all as read" menu item found. Falling back to scroll-to-view.');
    }

    // Scrolling the feed makes X mark notifications read server-side on view.
    let seen = 0;
    let rounds = 0;
    let lastHeight = -1;
    while (rounds < CONFIG.maxScrollRounds) {
      seen = document.querySelectorAll(`${SELECTORS.cell}, ${SELECTORS.notification}, ${SELECTORS.tweet}`).length;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      rounds++;
      if (document.body.scrollHeight === lastHeight) break;
      lastHeight = document.body.scrollHeight;
    }
    window.scrollTo(0, 0);

    log.success(`Done. Menu action: ${clickedMenu ? 'yes' : 'no'}. Notifications viewed: ${seen}.`);
    log.info('X marks notifications read as they scroll into view; the blue badge should clear shortly.');
  };

  // ============================================
  // 📊 ACTION: SUMMARY (SCRAPE + EXPORT)
  // ============================================
  const summary = async () => {
    // Switch to the Mentions tab when filtering for mentions
    if (CONFIG.filterType === 'mentions' && !/\/notifications\/mentions/.test(window.location.pathname)) {
      const mentionsTab = document.querySelector(SELECTORS.mentionsTab);
      if (mentionsTab) { mentionsTab.click(); await sleep(2000); }
    }

    log.info(`Scraping up to ${CONFIG.maxNotifications} notifications (filter: ${CONFIG.filterType})...`);
    const seen = new Map();
    let rounds = 0;
    let empty = 0;

    while (seen.size < CONFIG.maxNotifications && rounds < CONFIG.maxScrollRounds && empty < CONFIG.maxScrollRetries) {
      const before = seen.size;
      const cells = document.querySelectorAll(`${SELECTORS.cell}, ${SELECTORS.notification}, ${SELECTORS.tweet}`);
      for (const cell of cells) {
        const text = (cell.textContent || '').trim().slice(0, 280);
        if (!text || text.length < 5) continue;
        const time = cell.querySelector('time')?.getAttribute('datetime') || '';
        const key = text.slice(0, 90) + time;
        if (seen.has(key)) continue;
        const type = classify(text);
        const isVerified = !!cell.querySelector(SELECTORS.verified);
        if (CONFIG.filterType === 'mentions' && type !== 'mention' && type !== 'reply') continue;
        if (CONFIG.filterType === 'verified' && !isVerified) continue;
        const entry = { type, text, time, isVerified };
        if (CONFIG.includeLinks) {
          entry.users = Array.from(cell.querySelectorAll('a[href^="/"]'))
            .map(a => ({ text: (a.textContent || '').trim(), href: a.href }))
            .filter(l => l.href.includes('x.com/'))
            .slice(0, 5);
        }
        seen.set(key, entry);
      }

      if (seen.size === before) empty++;
      else empty = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      rounds++;
      if (rounds % 5 === 0) log.info(`Scraped ${seen.size} notifications...`);
    }
    window.scrollTo(0, 0);

    const all = [...seen.values()].slice(0, CONFIG.maxNotifications);
    if (all.length === 0) {
      log.warning('No notifications found to summarize.');
      return;
    }

    const byType = {};
    for (const n of all) byType[n.type] = (byType[n.type] || 0) + 1;

    console.log(`\n🔔 Total notifications: ${all.length}\n📊 BY TYPE:`);
    const emoji = { like: '❤️', repost: '🔁', follow: '👤', mention: '💬', reply: '↩️', quote: '💭', other: '📌' };
    Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([t, c]) => {
      console.log(`   ${emoji[t] || '📌'} ${t}: ${c}`);
    });

    const report = { exportedAt: new Date().toISOString(), filter: CONFIG.filterType, total: all.length, byType, notifications: all };

    if (CONFIG.logJSON) {
      console.log('\n📦 Full JSON:');
      console.log(JSON.stringify(report, null, 2));
    }

    if (CONFIG.copyToClipboard) {
      try {
        await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
        log.success('Copied to clipboard!');
      } catch (e) {
        log.warning('Could not copy to clipboard.');
      }
    }

    if (CONFIG.exportResults) {
      const date = new Date().toISOString().slice(0, 10);
      downloadJSON(report, `xactions-notifications-${date}.json`);
      downloadCSV(all, `xactions-notifications-${date}.csv`);
    }
  };

  // ============================================
  // 🎯 DISPATCH
  // ============================================
  try {
    if (CONFIG.action === 'markRead') await markRead();
    else if (CONFIG.action === 'summary') await summary();
    else log.error(`Unknown action "${CONFIG.action}". Use 'markRead' or 'summary'.`);
  } catch (error) {
    log.error(`Fatal: ${error.message}`);
  }

  log.success('Script completed! by nichxbt');
})();

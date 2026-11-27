// GENERATED FILE: a copy of browser/manageBookmarks.js, written by scripts/build-script-manifest.mjs. Edit browser/manageBookmarks.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        manageBookmarks.js
 * @title       Manage Bookmarks
 * @description Export your bookmarks as JSON or CSV, or clear all of them with the built-in Clear All button.
 * @category    scrape
 * @page        x.com/i/bookmarks
 * @writes      false
 * @aliases     scripts/bookmarkManager.js, scripts/manageBookmarks.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 * @repository  https://github.com/nirholas/XActions
 *
 * Usage (browser/manageBookmarks.js):
 * 1. Go to https://x.com/i/bookmarks
 * 2. Open the Developer Console (F12)
 * 3. Paste this into the Developer Console and run it
 *
 * The default action is 'export', which only reads. action: 'clear' (or 'clear_all')
 * removes every bookmark and cannot be undone.
 */

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    action: 'export',         // 'export' | 'clear' ('clear_all' is accepted too)
    maxBookmarks: 200,        // Max bookmarks to scrape
    format: 'json',           // 'json' | 'csv'
    scrollDelay: 1500,        // ms between scrolls
    maxScrollRetries: 5,      // Stop after N scrolls with no new items
    downloadFile: true,       // Download the export as a file
    printOutput: false,       // Also print the full JSON/CSV export to the console
    copyToClipboard: false,   // Also copy the JSON/CSV export to the clipboard
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: typeof data === 'string' ? 'text/csv' : 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const scrapeBookmarks = async () => {
    console.log(`📖 Scraping up to ${CONFIG.maxBookmarks} bookmarks...`);
    const bookmarks = new Map();
    let retries = 0;

    while (bookmarks.size < CONFIG.maxBookmarks && retries < CONFIG.maxScrollRetries) {
      const prevSize = bookmarks.size;

      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        const linkEl = tweet.querySelector('a[href*="/status/"]');
        if (!linkEl || bookmarks.has(linkEl.href)) return;

        const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const userLink = tweet.querySelector('a[href^="/"][role="link"]');
        const username = userLink?.href?.match(/x\.com\/([^/]+)/)?.[1] || '';
        const author = tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '';
        const handle = tweet.querySelector('[data-testid="User-Name"] a[tabindex="-1"]')?.textContent || '';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        const likes = tweet.querySelector('[data-testid="like"] span, [data-testid="unlike"] span')?.textContent || '0';
        const hasMedia = !!tweet.querySelector('img[src*="media"], video');

        bookmarks.set(linkEl.href, { text: text.substring(0, 300), url: linkEl.href, username, author, handle, time, likes, hasMedia });
      });

      if (bookmarks.size === prevSize) retries++;
      else retries = 0;

      console.log(`   📚 Found ${bookmarks.size} bookmarks...`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return [...bookmarks.values()];
  };

  const deliver = async (content, filename, label) => {
    if (CONFIG.downloadFile) download(content, filename);
    const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    if (CONFIG.printOutput) {
      console.log(`\n📦 ${label} output:`);
      console.log(text);
    }
    if (CONFIG.copyToClipboard) {
      try {
        await navigator.clipboard.writeText(text);
        console.log(`✅ ${label} copied to clipboard!`);
      } catch (e) {
        console.warn(`⚠️ Could not copy to clipboard (${e.message}). Click the page first so it has focus.`);
      }
    }
  };

  const exportBookmarks = async () => {
    const bookmarks = await scrapeBookmarks();
    const date = new Date().toISOString().slice(0, 10);

    if (CONFIG.format === 'csv') {
      const header = 'URL,Username,Author,Handle,Text,Likes,HasMedia,Time';
      const rows = bookmarks.map(b =>
        `"${b.url}","${b.username}","${b.author.replace(/"/g, '""')}","${b.handle}","${b.text.replace(/"/g, '""')}","${b.likes}","${b.hasMedia}","${b.time}"`
      );
      await deliver([header, ...rows].join('\n'), `xactions-bookmarks-${date}.csv`, 'CSV');
    } else {
      await deliver({ exportedAt: new Date().toISOString(), count: bookmarks.length, bookmarks }, `xactions-bookmarks-${date}.json`, 'JSON');
    }

    console.log(`✅ Exported ${bookmarks.length} bookmarks as ${CONFIG.format.toUpperCase()}`);
  };

  const clearBookmarks = async () => {
    console.log('🗑️ Clearing all bookmarks...');
    console.log('⚠️ This action cannot be undone!');
    await sleep(2000);
    try {
      const moreBtn = document.querySelector('[aria-label="More"]');
      if (moreBtn) { moreBtn.click(); await sleep(1000); }

      const clearBtn = document.querySelector('[data-testid="clearAllBookmarks"]');
      if (!clearBtn) {
        console.log('⚠️ Clear all button not found. Try clearing from the top menu.');
        return;
      }
      clearBtn.click();
      await sleep(1000);

      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (!confirmBtn) {
        console.log('⚠️ Confirmation button not found. Nothing was cleared.');
        return;
      }
      confirmBtn.click();
      await sleep(2000);

      console.log('✅ All bookmarks cleared!');
    } catch (e) {
      console.error('❌ Failed to clear bookmarks:', e.message);
    }
  };

  const run = async () => {
    console.log('🔖 BOOKMARK MANAGER - XActions by nichxbt\n');

    if (!window.location.href.includes('/bookmarks')) {
      console.error('❌ Navigate to x.com/i/bookmarks first!');
      return;
    }

    if (CONFIG.action === 'export') await exportBookmarks();
    else if (CONFIG.action === 'clear' || CONFIG.action === 'clear_all') await clearBookmarks();
    else console.error(`❌ Unknown action: ${CONFIG.action}`);

    console.log('\n🏁 Done!');
  };

  run();
})();

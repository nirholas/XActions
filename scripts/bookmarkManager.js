// scripts/bookmarkManager.js
// Browser console script for exporting and clearing bookmarks on X/Twitter
// Paste in DevTools console on x.com/i/bookmarks
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    action: 'export',         // 'export' | 'clear'
    maxBookmarks: 200,        // Max bookmarks to scrape
    format: 'json',           // 'json' | 'csv'
    scrollDelay: 1500,        // ms between scrolls
    maxScrollRetries: 5,      // Stop after N scrolls with no new items
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
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        const likes = tweet.querySelector('[data-testid="like"] span, [data-testid="unlike"] span')?.textContent || '0';
        const hasMedia = !!tweet.querySelector('img[src*="media"], video');

        bookmarks.set(linkEl.href, { text: text.substring(0, 300), url: linkEl.href, username, time, likes, hasMedia });
      });

      if (bookmarks.size === prevSize) retries++;
      else retries = 0;

      console.log(`   📚 Found ${bookmarks.size} bookmarks...`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    return [...bookmarks.values()];
  };

  const exportBookmarks = async () => {
    const bookmarks = await scrapeBookmarks();
    const date = new Date().toISOString().slice(0, 10);

    if (CONFIG.format === 'csv') {
      const header = 'URL,Username,Text,Likes,HasMedia,Time';
      const rows = bookmarks.map(b =>
        `"${b.url}","${b.username}","${b.text.replace(/"/g, '""')}","${b.likes}","${b.hasMedia}","${b.time}"`
      );
      download([header, ...rows].join('\n'), `xactions-bookmarks-${date}.csv`);
    } else {
      download({ exportedAt: new Date().toISOString(), count: bookmarks.length, bookmarks }, `xactions-bookmarks-${date}.json`);
    }

    console.log(`✅ Exported ${bookmarks.length} bookmarks as ${CONFIG.format.toUpperCase()}`);
  };

  const clearBookmarks = async () => {
    console.log('🗑️ Clearing all bookmarks...');
    try {
      const moreBtn = document.querySelector('[aria-label="More"]');
      if (moreBtn) { moreBtn.click(); await sleep(1000); }

      const clearBtn = document.querySelector('[data-testid="clearAllBookmarks"]');
      if (clearBtn) { clearBtn.click(); await sleep(1000); }

      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirmBtn) { confirmBtn.click(); await sleep(2000); }

      console.log('✅ All bookmarks cleared!');
    } catch (e) {
      console.error('❌ Failed to clear bookmarks:', e.message);
    }
  };

  const run = async () => {
    console.log('🔖 BOOKMARK MANAGER — XActions by nichxbt\n');

    if (!window.location.href.includes('/bookmarks')) {
      console.error('❌ Navigate to x.com/i/bookmarks first!');
      return;
    }

    if (CONFIG.action === 'export') await exportBookmarks();
    else if (CONFIG.action === 'clear') await clearBookmarks();
    else console.error(`❌ Unknown action: ${CONFIG.action}`);

    console.log('\n🏁 Done!');
  };

  run();
})();

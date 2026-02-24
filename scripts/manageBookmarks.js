// scripts/manageBookmarks.js
// Browser console script to export and manage X/Twitter bookmarks
// Paste in DevTools console on x.com/i/bookmarks
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const CONFIG = {
    action: 'export', // 'export' or 'clear_all'
    maxBookmarks: 200,
    format: 'json',   // 'json' or 'csv'
  };

  const exportBookmarks = async () => {
    console.log('🔖 Exporting bookmarks...');

    const bookmarks = [];
    let scrollAttempts = 0;
    const maxScrolls = Math.ceil(CONFIG.maxBookmarks / 3);

    while (bookmarks.length < CONFIG.maxBookmarks && scrollAttempts < maxScrolls) {
      document.querySelectorAll('article[data-testid="tweet"]').forEach(tweet => {
        const text = tweet.querySelector('[data-testid="tweetText"]')?.textContent || '';
        const author = tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '';
        const handle = tweet.querySelector('[data-testid="User-Name"] a[tabindex="-1"]')?.textContent || '';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
        const likes = tweet.querySelector('[data-testid="like"] span')?.textContent || '0';
        const hasMedia = !!(tweet.querySelector('img[src*="media"]') || tweet.querySelector('video'));

        if (link && !bookmarks.find(b => b.link === link)) {
          bookmarks.push({ text: text.substring(0, 500), author, handle, time, link, likes, hasMedia });
        }
      });

      window.scrollBy(0, 1000);
      await sleep(1500);
      scrollAttempts++;

      if (scrollAttempts % 5 === 0) {
        console.log(`  📥 ${bookmarks.length} bookmarks scraped...`);
      }
    }

    console.log(`\n📚 Total: ${bookmarks.length} bookmarks`);

    if (CONFIG.format === 'csv') {
      const csv = 'author,handle,text,link,likes,time,hasMedia\n' +
        bookmarks.map(b => 
          `"${b.author}","${b.handle}","${b.text.replace(/"/g, '""')}","${b.link}","${b.likes}","${b.time}","${b.hasMedia}"`
        ).join('\n');

      console.log('\n📋 CSV output:');
      console.log(csv);

      try {
        await navigator.clipboard.writeText(csv);
        console.log('\n✅ CSV copied to clipboard!');
      } catch (e) {}
    } else {
      const result = {
        bookmarks,
        count: bookmarks.length,
        exportedAt: new Date().toISOString(),
      };

      console.log('\n📦 JSON output:');
      console.log(JSON.stringify(result, null, 2));

      try {
        await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        console.log('\n✅ JSON copied to clipboard!');
      } catch (e) {}
    }

    return bookmarks;
  };

  const clearAllBookmarks = async () => {
    console.log('🗑️ Clearing all bookmarks...');
    console.log('⚠️ This action cannot be undone!');
    await sleep(2000);

    // Look for the more/settings menu
    const moreBtn = document.querySelector('[aria-label="More"]');
    if (moreBtn) {
      moreBtn.click();
      await sleep(1000);
    }

    const clearBtn = document.querySelector('[data-testid="clearAllBookmarks"]');
    if (clearBtn) {
      clearBtn.click();
      await sleep(1000);

      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(2000);
        console.log('✅ All bookmarks cleared!');
      }
    } else {
      console.log('⚠️ Clear all button not found. Try clearing from the top menu.');
    }
  };

  const run = async () => {
    console.log('🔖 XActions Bookmark Manager');
    console.log('============================');

    if (CONFIG.action === 'clear_all') {
      await clearAllBookmarks();
    } else {
      await exportBookmarks();
    }
  };

  run();
})();

// Clear All Bookmarks on X - by nichxbt
// https://github.com/nirholas/xactions
// 1. Go to https://x.com/i/bookmarks
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const $bookmarkButton = '[data-testid="removeBookmark"]';
  const $tweet = 'article[data-testid="tweet"]';
  const $clearAllButton = '[data-testid="clearBookmarks"]'; // If X provides a clear-all
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';

  const CONFIG = {
    maxRemovals: Infinity,
    minDelay: 800,
    maxDelay: 2000,
    scrollDelay: 1500,
    maxRetries: 5,
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  let removed = 0;
  let retries = 0;

  const run = async () => {
    console.log('🔖 CLEAR ALL BOOKMARKS - XActions by nichxbt');

    if (!window.location.href.includes('/bookmarks')) {
      console.error('❌ Navigate to x.com/i/bookmarks first!');
      return;
    }

    // Try using the built-in clear all button first
    const clearAll = document.querySelector($clearAllButton);
    if (clearAll) {
      console.log('🗑️ Found "Clear All" button, using it...');
      clearAll.click();
      await sleep(1000);
      const confirmBtn = document.querySelector($confirmButton);
      if (confirmBtn) {
        confirmBtn.click();
        console.log('✅ All bookmarks cleared via built-in button!');
        return;
      }
    }

    // Manual removal one by one
    console.log('📋 Removing bookmarks one by one...');

    while (removed < CONFIG.maxRemovals && retries < CONFIG.maxRetries) {
      const buttons = document.querySelectorAll($bookmarkButton);

      if (buttons.length === 0) {
        retries++;
        console.log(`⏳ No bookmark buttons found, scrolling... (retry ${retries}/${CONFIG.maxRetries})`);
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
        continue;
      }

      retries = 0;

      for (const btn of buttons) {
        if (removed >= CONFIG.maxRemovals) break;
        try {
          btn.click();
          removed++;
          if (removed % 10 === 0) {
            console.log(`🔖 Removed ${removed} bookmarks so far...`);
          }
          await sleep(randomDelay());
        } catch (e) {
          console.warn('⚠️ Failed to remove a bookmark, continuing...');
        }
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Removed ${removed} bookmarks total.`);
  };

  run();
})();

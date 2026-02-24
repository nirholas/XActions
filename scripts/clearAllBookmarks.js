// scripts/clearAllBookmarks.js
// Browser console script for clearing all bookmarks on X/Twitter
// Paste in DevTools console on x.com/i/bookmarks
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxRemovals: 100,
    keepKeywords: [],         // Keep bookmarks containing these words
    useBulkClear: false,      // Try built-in "Clear all bookmarks" button
    dryRun: true,             // Preview without removing
    delay: 1500,
    scrollDelay: 2000,
    maxEmptyScrolls: 6,
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const run = async () => {
    console.log('🔖 CLEAR ALL BOOKMARKS — XActions by nichxbt');
    console.log(CONFIG.dryRun ? '🔍 DRY RUN — preview only' : '⚠️ LIVE MODE — bookmarks WILL be removed!');

    if (!window.location.href.includes('/bookmarks')) {
      console.error('❌ Navigate to x.com/i/bookmarks first!');
      return;
    }

    // Try bulk clear first
    if (CONFIG.useBulkClear && CONFIG.keepKeywords.length === 0 && !CONFIG.dryRun) {
      const clearAllBtn = document.querySelector('[data-testid="clearBookmarks"], button[aria-label*="Clear all"]');
      if (clearAllBtn) {
        console.log('🗑️ Found "Clear All" button — clicking...');
        clearAllBtn.click();
        await sleep(1000);
        const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirm) {
          confirm.click();
          await sleep(1500);
          console.log('✅ All bookmarks cleared via built-in button!');
          return;
        }
      } else {
        console.log('ℹ️ Bulk clear button not found — falling back to individual removal.');
      }
    }

    console.log(`⚙️ Max: ${CONFIG.maxRemovals} | Keep keywords: ${CONFIG.keepKeywords.length}`);

    const removedLog = [];
    let removed = 0;
    let kept = 0;
    let emptyScrolls = 0;

    while (removed < CONFIG.maxRemovals && emptyScrolls < CONFIG.maxEmptyScrolls) {
      const buttons = document.querySelectorAll('[data-testid="removeBookmark"]');

      if (buttons.length === 0) {
        emptyScrolls++;
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
        continue;
      }
      emptyScrolls = 0;

      for (const btn of buttons) {
        if (removed >= CONFIG.maxRemovals) break;

        const article = btn.closest('article');
        const text = article?.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || '';

        // Keep filter
        if (CONFIG.keepKeywords.length > 0 && CONFIG.keepKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))) {
          kept++;
          continue;
        }

        const preview = text.slice(0, 70).replace(/\n/g, ' ');

        if (CONFIG.dryRun) {
          console.log(`🔍 Would remove bookmark: "${preview}..."`);
          removedLog.push({ text: text.slice(0, 200), dryRun: true });
          removed++;
          continue;
        }

        try {
          btn.click();
          removed++;
          removedLog.push({ text: text.slice(0, 200), timestamp: new Date().toISOString() });

          if (removed % 10 === 0) console.log(`🔖 Removed ${removed} bookmarks...`);
          await sleep(CONFIG.delay);
        } catch (e) {
          console.warn(`⚠️ Error removing bookmark: ${e.message}`);
        }
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Removed: ${removed} | Kept: ${kept}`);
    console.log(`🔍 Dry run: ${CONFIG.dryRun}`);

    if (removedLog.length > 0) {
      download(
        { stats: { removed, kept, dryRun: CONFIG.dryRun }, bookmarks: removedLog },
        `xactions-bookmarks-cleared-${new Date().toISOString().slice(0, 10)}.json`
      );
    }

    if (CONFIG.dryRun && removed > 0) {
      console.log(`\n⚡ Set dryRun = false and re-run to actually remove ${removed} bookmarks.`);
    }
  };

  run();
})();

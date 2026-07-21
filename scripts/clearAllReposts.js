// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/clearAllReposts.js
// Browser console script for removing all reposts/retweets from your profile
// Paste in DevTools console on x.com/YOUR_USERNAME (your profile)
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxRemovals: 50,
    skipKeywords: [],         // Keep reposts containing these words
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
    console.log('🔄 CLEAR ALL REPOSTS — XActions by nichxbt');
    console.log(CONFIG.dryRun ? '🔍 DRY RUN — preview only' : '⚠️ LIVE MODE — reposts WILL be removed!');
    console.log(`⚙️ Max: ${CONFIG.maxRemovals} | Skip keywords: ${CONFIG.skipKeywords.length}`);

    const removedLog = [];
    let removed = 0;
    let skipped = 0;
    let emptyScrolls = 0;

    while (removed < CONFIG.maxRemovals && emptyScrolls < CONFIG.maxEmptyScrolls) {
      const buttons = document.querySelectorAll('[data-testid="unretweet"]');

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

        // Skip filter
        if (CONFIG.skipKeywords.length > 0 && CONFIG.skipKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))) {
          skipped++;
          continue;
        }

        const preview = text.slice(0, 70).replace(/\n/g, ' ');

        if (CONFIG.dryRun) {
          console.log(`🔍 Would remove repost: "${preview}..."`);
          removedLog.push({ text: text.slice(0, 200), dryRun: true });
          removed++;
          continue;
        }

        try {
          btn.click();
          await sleep(500);

          const confirm = document.querySelector('[data-testid="unretweetConfirm"]');
          if (confirm) {
            confirm.click();
            await sleep(300);
          }

          removed++;
          removedLog.push({ text: text.slice(0, 200), timestamp: new Date().toISOString() });

          if (removed % 10 === 0) console.log(`🔄 Removed ${removed} reposts...`);
          await sleep(CONFIG.delay);
        } catch (e) {
          console.warn(`⚠️ Error removing repost: ${e.message}`);
        }
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Removed: ${removed} | Skipped: ${skipped}`);
    console.log(`🔍 Dry run: ${CONFIG.dryRun}`);

    if (removedLog.length > 0) {
      download(
        { stats: { removed, skipped, dryRun: CONFIG.dryRun }, reposts: removedLog },
        `xactions-reposts-cleared-${new Date().toISOString().slice(0, 10)}.json`
      );
    }

    if (CONFIG.dryRun && removed > 0) {
      console.log(`\n⚡ Set dryRun = false and re-run to actually remove ${removed} reposts.`);
    }
  };

  run();
})();

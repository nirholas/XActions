// scripts/unlikeAllPosts.js
// Browser console script for unliking all your liked posts on X/Twitter
// Paste in DevTools console on x.com/YOUR_USERNAME/likes
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxUnlikes: 50,
    skipKeywords: [],         // Keep likes containing these words
    dryRun: true,             // Preview without unliking
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
    console.log('💔 UNLIKE ALL POSTS — XActions by nichxbt');
    console.log(CONFIG.dryRun ? '🔍 DRY RUN — preview only' : '⚠️ LIVE MODE — posts WILL be unliked!');

    if (!window.location.href.includes('/likes')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/likes first!');
      return;
    }

    console.log(`⚙️ Max: ${CONFIG.maxUnlikes} | Skip keywords: ${CONFIG.skipKeywords.length}`);

    const unlikedLog = [];
    let unliked = 0;
    let skipped = 0;
    let emptyScrolls = 0;

    while (unliked < CONFIG.maxUnlikes && emptyScrolls < CONFIG.maxEmptyScrolls) {
      const buttons = document.querySelectorAll('[data-testid="unlike"]');

      if (buttons.length === 0) {
        emptyScrolls++;
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(CONFIG.scrollDelay);
        continue;
      }
      emptyScrolls = 0;

      for (const btn of buttons) {
        if (unliked >= CONFIG.maxUnlikes) break;

        const article = btn.closest('article');
        const text = article?.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || '';
        const authorLink = article?.querySelector('a[href^="/"][role="link"]');
        const author = authorLink?.getAttribute('href')?.replace('/', '') || 'unknown';

        // Skip filter
        if (CONFIG.skipKeywords.length > 0 && CONFIG.skipKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))) {
          skipped++;
          continue;
        }

        const preview = text.slice(0, 60).replace(/\n/g, ' ');

        if (CONFIG.dryRun) {
          console.log(`🔍 Would unlike: @${author} — "${preview}..."`);
          unlikedLog.push({ author, text: text.slice(0, 200), dryRun: true });
          unliked++;
          continue;
        }

        try {
          btn.click();
          unliked++;
          unlikedLog.push({ author, text: text.slice(0, 200), timestamp: new Date().toISOString() });

          if (unliked % 10 === 0) console.log(`💔 Unliked ${unliked} posts...`);
          await sleep(CONFIG.delay);
        } catch (e) {
          console.warn(`⚠️ Error unliking: ${e.message}`);
        }
      }

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Unliked: ${unliked} | Skipped: ${skipped}`);
    console.log(`🔍 Dry run: ${CONFIG.dryRun}`);

    if (unlikedLog.length > 0) {
      download(
        { stats: { unliked, skipped, dryRun: CONFIG.dryRun }, posts: unlikedLog },
        `xactions-unliked-${new Date().toISOString().slice(0, 10)}.json`
      );
    }

    if (CONFIG.dryRun && unliked > 0) {
      console.log(`\n⚡ Set dryRun = false and re-run to actually unlike ${unliked} posts.`);
    }
  };

  run();
})();

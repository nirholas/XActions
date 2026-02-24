// scripts/unfollowEveryone.js
// Browser console script for unfollowing everyone on X/Twitter
// Paste in DevTools console on x.com/USERNAME/following
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxUnfollows: Infinity,   // Cap total unfollows (e.g. 50 for testing)
    whitelist: [],            // Usernames to never unfollow (without @)
    dryRun: false,            // Preview without acting
    delay: 2000,              // ms between unfollows
    scrollDelay: 2000,        // ms to wait after scroll
    maxEmptyScrolls: 8,       // Give up after N scrolls with no new users
    exportOnComplete: true,   // Auto-download JSON results
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

  const getUsername = (cell) => {
    for (const link of cell.querySelectorAll('a[href^="/"]')) {
      const m = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)$/);
      if (m) return m[1];
    }
    return null;
  };

  const run = async () => {
    console.log('🚫 UNFOLLOW EVERYONE — by nichxbt');

    if (!window.location.href.includes('/following')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/following first!');
      return;
    }

    const whiteSet = new Set(CONFIG.whitelist.map(u => u.toLowerCase()));
    const unfollowedList = [];
    let unfollowed = 0, skipped = 0, emptyScrolls = 0;

    console.log(`⚙️ Max: ${CONFIG.maxUnfollows === Infinity ? '∞' : CONFIG.maxUnfollows} | Whitelist: ${whiteSet.size} | Dry run: ${CONFIG.dryRun}`);
    if (CONFIG.dryRun) console.log('⚠️ DRY RUN — no accounts will be unfollowed.\n');

    while (unfollowed < CONFIG.maxUnfollows && emptyScrolls < CONFIG.maxEmptyScrolls) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      let acted = false;

      for (const cell of cells) {
        if (unfollowed >= CONFIG.maxUnfollows) break;

        const username = getUsername(cell);
        if (username && whiteSet.has(username.toLowerCase())) { skipped++; continue; }

        const btn = cell.querySelector('[data-testid$="-unfollow"]');
        if (!btn) continue;

        if (CONFIG.dryRun) {
          console.log(`🔍 [DRY] Would unfollow @${username || '?'}`);
          unfollowed++;
          acted = true;
          unfollowedList.push({ username: username || '?', timestamp: new Date().toISOString(), dryRun: true });
          continue;
        }

        try {
          btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
          await sleep(200);
          btn.click();
          await sleep(600);

          const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirm) {
            confirm.click();
            unfollowed++;
            acted = true;
            unfollowedList.push({ username: username || '?', timestamp: new Date().toISOString() });

            if (unfollowed <= 3 || unfollowed % 5 === 0) {
              console.log(`🚫 #${unfollowed} Unfollowed @${username || '?'}`);
            }
            await sleep(CONFIG.delay);
          } else {
            console.warn(`⚠️ No confirm dialog for @${username || '?'}`);
          }
        } catch (e) {
          console.warn(`⚠️ Error: ${e.message}`);
        }
      }

      if (!acted) emptyScrolls++;
      else emptyScrolls = 0;

      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      await sleep(CONFIG.scrollDelay);
    }

    // Summary
    console.log('\n📊 RESULTS');
    console.log(`   Unfollowed: ${unfollowed}`);
    console.log(`   Skipped:    ${skipped}`);

    if (CONFIG.exportOnComplete && unfollowedList.length > 0) {
      download(
        { unfollowed: unfollowedList, stats: { total: unfollowed, skipped }, exportedAt: new Date().toISOString() },
        `xactions-unfollow-everyone-${new Date().toISOString().slice(0, 10)}.json`
      );
    }

    console.log('✅ Done! Reload & re-run if any were missed.\n');
  };

  run();
})();

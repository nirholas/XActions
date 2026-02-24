// scripts/unfollowback.js
// Browser console script for unfollowing non-followers on X/Twitter
// Paste in DevTools console on x.com/USERNAME/following
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxUnfollows: Infinity,   // Cap total unfollows (set to e.g. 50 for testing)
    whitelist: [],            // Usernames to never unfollow (without @)
    dryRun: true,             // Preview without acting — SET FALSE TO RUN
    delay: 2000,              // ms between unfollows
    scrollDelay: 2000,        // ms to wait after scroll
    maxEmptyScrolls: 6,       // Give up after N scrolls with no new users
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
    const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
    if (link) {
      const m = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
      if (m && !['home', 'explore', 'notifications', 'messages', 'i'].includes(m[1])) return m[1];
    }
    for (const span of cell.querySelectorAll('span')) {
      const m = span.textContent.match(/^@([A-Za-z0-9_]+)$/);
      if (m) return m[1];
    }
    return null;
  };

  const run = async () => {
    console.log('🔙 UNFOLLOW NON-FOLLOWERS — by nichxbt');

    if (!window.location.href.includes('/following')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/following first!');
      return;
    }

    const whiteSet = new Set(CONFIG.whitelist.map(u => u.toLowerCase().replace(/^@/, '')));
    const processed = new Set();
    const unfollowedList = [];
    let unfollowed = 0, scanned = 0, skippedBack = 0, emptyScrolls = 0;

    console.log(`⚙️ Max: ${CONFIG.maxUnfollows === Infinity ? '∞' : CONFIG.maxUnfollows} | Whitelist: ${whiteSet.size} | Dry run: ${CONFIG.dryRun}`);
    if (CONFIG.dryRun) console.log('⚠️ DRY RUN — no accounts will be unfollowed.\n');

    while (unfollowed < CONFIG.maxUnfollows && emptyScrolls < CONFIG.maxEmptyScrolls) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      let foundNew = false;

      for (const cell of cells) {
        if (unfollowed >= CONFIG.maxUnfollows) break;

        const username = getUsername(cell);
        if (!username || processed.has(username.toLowerCase())) continue;
        processed.add(username.toLowerCase());
        foundNew = true;
        scanned++;

        // Check "Follows you" badge
        if (cell.querySelector('[data-testid="userFollowIndicator"]')) {
          skippedBack++;
          continue;
        }

        // Whitelist check
        if (whiteSet.has(username.toLowerCase())) {
          console.log(`🛡️ Whitelisted: @${username}`);
          continue;
        }

        if (CONFIG.dryRun) {
          console.log(`🔍 Would unfollow: @${username}`);
          unfollowedList.push({ username, timestamp: new Date().toISOString(), dryRun: true });
          unfollowed++;
          continue;
        }

        // Click unfollow
        const btn = cell.querySelector('[data-testid$="-unfollow"]');
        if (!btn) continue;

        try {
          btn.click();
          await sleep(500);
          const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirm) confirm.click();
          await sleep(400);

          unfollowed++;
          unfollowedList.push({ username, timestamp: new Date().toISOString() });
          if (unfollowed <= 3 || unfollowed % 5 === 0) {
            console.log(`🔙 #${unfollowed} Unfollowed @${username} (scanned: ${scanned})`);
          }
          await sleep(CONFIG.delay);
        } catch (e) {
          console.warn(`⚠️ Error unfollowing @${username}: ${e.message}`);
        }
      }

      if (!foundNew) emptyScrolls++;
      else emptyScrolls = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    // Summary
    console.log('\n📊 RESULTS');
    console.log(`   Scanned:      ${scanned}`);
    console.log(`   Unfollowed:   ${unfollowed}`);
    console.log(`   Follows back: ${skippedBack}`);

    if (CONFIG.exportOnComplete && unfollowedList.length > 0) {
      download(
        { summary: { scanned, unfollowed, skippedBack, dryRun: CONFIG.dryRun }, accounts: unfollowedList, exportedAt: new Date().toISOString() },
        `xactions-unfollowback-${CONFIG.dryRun ? 'preview' : 'results'}-${new Date().toISOString().slice(0, 10)}.json`
      );
    }

    console.log('✅ Done! Reload & re-run if any were missed.\n');
  };

  run();
})();

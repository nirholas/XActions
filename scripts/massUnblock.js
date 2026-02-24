// scripts/massUnblock.js
// Browser console script for mass unblocking users on X/Twitter
// Paste in DevTools console on x.com/settings/blocked
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxUnblocks: 50,          // Max users to unblock
    keepBlocked: [],          // Keep these users blocked (without @)
    dryRun: true,             // SET FALSE TO EXECUTE
    delay: 1500,              // ms between unblocks
    scrollDelay: 2000,        // ms to wait after scroll
    maxEmptyScrolls: 6,       // Give up after N scrolls with no new users
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

  const keepSet = new Set(CONFIG.keepBlocked.map(u => u.toLowerCase().replace(/^@/, '')));
  const processed = new Set();
  const log = [];
  let unblocked = 0;
  let skipped = 0;
  let errors = 0;

  const getUsername = (cell) => {
    const link = cell.querySelector('a[href^="/"]');
    if (!link) return null;
    const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
    return match ? match[1] : null;
  };

  const run = async () => {
    console.log('🔓 MASS UNBLOCK — XActions by nichxbt');

    if (!window.location.href.includes('/blocked')) {
      console.error('❌ Navigate to x.com/settings/blocked first!');
      return;
    }

    console.log(`⚙️ Max: ${CONFIG.maxUnblocks} | Dry run: ${CONFIG.dryRun} | Keep blocked: ${keepSet.size}`);

    let emptyScrolls = 0;

    while (unblocked < CONFIG.maxUnblocks && emptyScrolls < CONFIG.maxEmptyScrolls) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      let foundNew = false;

      for (const cell of cells) {
        if (unblocked >= CONFIG.maxUnblocks) break;

        const username = getUsername(cell);
        if (!username || processed.has(username.toLowerCase())) continue;
        processed.add(username.toLowerCase());
        foundNew = true;

        if (keepSet.has(username.toLowerCase())) {
          skipped++;
          console.log(`🛡️ Keeping blocked: @${username}`);
          continue;
        }

        if (CONFIG.dryRun) {
          console.log(`🔍 Would unblock: @${username}`);
          log.push({ username, dryRun: true });
          unblocked++;
          continue;
        }

        const btn = cell.querySelector('[data-testid$="-unblock"]') || cell.querySelector('button[aria-label*="Blocked"]');
        if (!btn) { errors++; continue; }

        btn.click();
        await sleep(500);

        const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirmBtn) {
          confirmBtn.click();
          await sleep(400);
        }

        unblocked++;
        log.push({ username, timestamp: new Date().toISOString() });

        if (unblocked % 10 === 0) console.log(`🔓 Progress: ${unblocked} unblocked`);
        await sleep(CONFIG.delay);
      }

      if (!foundNew) emptyScrolls++; else emptyScrolls = 0;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Unblocked: ${unblocked} | Skipped: ${skipped} | Errors: ${errors}`);

    if (log.length > 0) {
      download({ summary: { unblocked, skipped, errors }, accounts: log },
        `xactions-unblocked-${new Date().toISOString().slice(0, 10)}.json`);
    }
  };

  run();
})();

// scripts/massUnmute.js
// Browser console script for mass unmuting users on X/Twitter
// Paste in DevTools console on x.com/settings/muted
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxUnmutes: 50,           // Max users to unmute
    keepMuted: [],            // Keep these users muted (without @)
    dryRun: true,             // SET FALSE TO EXECUTE
    delay: 1500,              // ms between unmutes
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

  const keepSet = new Set(CONFIG.keepMuted.map(u => u.toLowerCase().replace(/^@/, '')));
  const processed = new Set();
  const log = [];
  let unmuted = 0;
  let skipped = 0;
  let errors = 0;

  const getUsername = (cell) => {
    const link = cell.querySelector('a[href^="/"]');
    if (!link) return null;
    const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
    return match ? match[1] : null;
  };

  const run = async () => {
    console.log('🔊 MASS UNMUTE — XActions by nichxbt');

    if (!window.location.href.includes('/muted')) {
      console.error('❌ Navigate to x.com/settings/muted first!');
      return;
    }

    console.log(`⚙️ Max: ${CONFIG.maxUnmutes} | Dry run: ${CONFIG.dryRun} | Keep muted: ${keepSet.size}`);

    let emptyScrolls = 0;

    while (unmuted < CONFIG.maxUnmutes && emptyScrolls < CONFIG.maxEmptyScrolls) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      let foundNew = false;

      for (const cell of cells) {
        if (unmuted >= CONFIG.maxUnmutes) break;

        const username = getUsername(cell);
        if (!username || processed.has(username.toLowerCase())) continue;
        processed.add(username.toLowerCase());
        foundNew = true;

        if (keepSet.has(username.toLowerCase())) {
          skipped++;
          console.log(`🛡️ Keeping muted: @${username}`);
          continue;
        }

        if (CONFIG.dryRun) {
          console.log(`🔍 Would unmute: @${username}`);
          log.push({ username, dryRun: true });
          unmuted++;
          continue;
        }

        const btn = cell.querySelector('[data-testid$="-unmute"]') || cell.querySelector('button[aria-label*="Muted"]');
        if (!btn) { errors++; continue; }

        btn.click();
        unmuted++;
        log.push({ username, timestamp: new Date().toISOString() });

        if (unmuted % 10 === 0) console.log(`🔊 Progress: ${unmuted} unmuted`);
        await sleep(CONFIG.delay);
      }

      if (!foundNew) emptyScrolls++; else emptyScrolls = 0;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log(`\n✅ Done! Unmuted: ${unmuted} | Skipped: ${skipped} | Errors: ${errors}`);

    if (log.length > 0) {
      download({ summary: { unmuted, skipped, errors }, accounts: log },
        `xactions-unmuted-${new Date().toISOString().slice(0, 10)}.json`);
    }
  };

  run();
})();

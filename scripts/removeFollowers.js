// scripts/removeFollowers.js
// Browser console script for removing followers via soft-block on X/Twitter
// Paste in DevTools console on x.com/USERNAME/followers
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    usersToRemove: [],    // Specific usernames to remove (empty = all visible)
    whitelist: [],        // Usernames to never remove (without @)
    maxRemovals: 50,      // Cap total removals
    dryRun: true,         // Preview without acting — SET FALSE TO RUN
    delay: 2500,          // ms between removals
    scrollDelay: 2000,    // ms to wait after scroll
    maxEmptyScrolls: 8,   // Give up after N scrolls with no new users
    exportOnComplete: true,
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
    return null;
  };

  const run = async () => {
    console.log('👋 REMOVE FOLLOWERS (Soft-Block) — by nichxbt');

    if (!window.location.href.includes('/followers')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/followers first!');
      return;
    }

    const targetMode = CONFIG.usersToRemove.length > 0;
    const targetSet = new Set(CONFIG.usersToRemove.map(u => u.toLowerCase().replace(/^@/, '')));
    const whiteSet = new Set(CONFIG.whitelist.map(u => u.toLowerCase().replace(/^@/, '')));
    const processed = new Set();
    const removedList = [];
    let removed = 0, scanned = 0, skipped = 0, emptyScrolls = 0;

    console.log(`⚙️ Mode: ${targetMode ? `list (${targetSet.size} targets)` : 'all visible'} | Max: ${CONFIG.maxRemovals} | Dry run: ${CONFIG.dryRun}`);
    if (CONFIG.dryRun) console.log('⚠️ DRY RUN — no followers will be removed.\n');

    while (removed < CONFIG.maxRemovals && emptyScrolls < CONFIG.maxEmptyScrolls) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      let foundNew = false;

      for (const cell of cells) {
        if (removed >= CONFIG.maxRemovals) break;

        const username = getUsername(cell);
        if (!username) continue;
        const uLower = username.toLowerCase();
        if (processed.has(uLower)) continue;
        processed.add(uLower);
        foundNew = true;
        scanned++;

        // Whitelist
        if (whiteSet.has(uLower)) { skipped++; continue; }

        // Target check
        if (targetMode && !targetSet.has(uLower)) { skipped++; continue; }

        if (CONFIG.dryRun) {
          console.log(`🔍 Would remove: @${username}`);
          removedList.push({ username, timestamp: new Date().toISOString(), dryRun: true });
          removed++;
          continue;
        }

        // Soft-block: click "..." → Block → confirm → Unblock
        try {
          const moreBtn = cell.querySelector('[data-testid="userActions"]') || cell.querySelector('button[aria-label="More"]');
          if (!moreBtn) { console.warn(`⚠️ No actions button for @${username}`); continue; }

          moreBtn.click();
          await sleep(700);

          // Find Block in dropdown
          const menuItems = document.querySelectorAll('[role="menuitem"]');
          let blockBtn = null;
          for (const item of menuItems) {
            if (/\bblock\b/i.test(item.textContent) && !/unblock/i.test(item.textContent)) {
              blockBtn = item;
              break;
            }
          }

          if (!blockBtn) {
            // Try "Remove this follower" option
            for (const item of menuItems) {
              if (/remove/i.test(item.textContent)) { blockBtn = item; break; }
            }
          }

          if (!blockBtn) {
            document.body.click();
            await sleep(300);
            console.warn(`⚠️ No block/remove option for @${username}`);
            continue;
          }

          blockBtn.click();
          await sleep(600);

          // Confirm
          const confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirm) {
            confirm.click();
            await sleep(800);
          }

          // If we blocked, now unblock
          if (/block/i.test(blockBtn.textContent) && !/remove/i.test(blockBtn.textContent)) {
            // Re-open menu on same user to unblock
            const moreBtn2 = cell.querySelector('[data-testid="userActions"]') || cell.querySelector('button[aria-label="More"]');
            if (moreBtn2) {
              moreBtn2.click();
              await sleep(600);
              const items2 = document.querySelectorAll('[role="menuitem"]');
              for (const item of items2) {
                if (/unblock/i.test(item.textContent)) { item.click(); break; }
              }
              await sleep(500);
            }
          }

          removed++;
          removedList.push({ username, timestamp: new Date().toISOString() });
          console.log(`👋 #${removed} Removed @${username}`);
          await sleep(CONFIG.delay);
        } catch (e) {
          console.warn(`⚠️ Error removing @${username}: ${e.message}`);
          document.body.click();
          await sleep(300);
        }
      }

      if (!foundNew) emptyScrolls++;
      else emptyScrolls = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    // Summary
    console.log('\n📊 RESULTS');
    console.log(`   Removed:  ${removed}`);
    console.log(`   Scanned:  ${scanned}`);
    console.log(`   Skipped:  ${skipped}`);

    if (CONFIG.exportOnComplete && removedList.length > 0) {
      download(
        { removed: removedList, stats: { removed, scanned, skipped, dryRun: CONFIG.dryRun }, exportedAt: new Date().toISOString() },
        `xactions-removed-followers-${CONFIG.dryRun ? 'preview' : 'results'}-${new Date().toISOString().slice(0, 10)}.json`
      );
    }

    console.log('✅ Done!\n');
  };

  run();
})();

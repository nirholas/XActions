// scripts/massBlock.js
// Browser console script for mass blocking users on X/Twitter
// Paste in DevTools console on x.com (followers, following, search, or any page with user cells)
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    mode: 'visible',          // 'visible' = block users on page | 'list' = block by username
    usersToBlock: [
      // 'spammer1',
      // 'spammer2',
    ],
    whitelist: [],            // Never block these (without @)
    maxBlocks: 20,            // Max users to block
    dryRun: true,             // SET FALSE TO EXECUTE
    delay: 2000,              // ms between blocks
    scrollDelay: 2000,        // ms to wait after scroll
    maxEmptyScrolls: 5,       // Give up after N scrolls with no new users
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

  const whitelistSet = new Set(CONFIG.whitelist.map(u => u.toLowerCase().replace(/^@/, '')));
  const processed = new Set();
  const results = { blocked: [], skipped: [], failed: [] };
  let blocked = 0;

  const getUsername = (cell) => {
    const link = cell.querySelector('a[href^="/"]');
    if (!link) return null;
    const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
    return match ? match[1] : null;
  };

  const blockVisibleUsers = async () => {
    let emptyScrolls = 0;

    while (blocked < CONFIG.maxBlocks && emptyScrolls < CONFIG.maxEmptyScrolls) {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      let foundNew = false;

      for (const cell of cells) {
        if (blocked >= CONFIG.maxBlocks) break;
        const username = getUsername(cell);
        if (!username || processed.has(username.toLowerCase())) continue;
        processed.add(username.toLowerCase());
        foundNew = true;

        if (whitelistSet.has(username.toLowerCase())) {
          results.skipped.push(username);
          console.log(`🛡️ Whitelisted: @${username}`);
          continue;
        }

        if (CONFIG.dryRun) {
          console.log(`🔍 Would block: @${username}`);
          results.blocked.push({ username, dryRun: true });
          blocked++;
          continue;
        }

        const moreBtn = cell.querySelector('[data-testid="userActions"]');
        if (!moreBtn) { results.failed.push(username); continue; }

        moreBtn.click();
        await sleep(800);

        const menuItems = document.querySelectorAll('[role="menuitem"]');
        let blockItem = null;
        for (const item of menuItems) {
          if (/\bblock\b/i.test(item.textContent)) { blockItem = item; break; }
        }
        if (!blockItem) { document.body.click(); await sleep(300); results.failed.push(username); continue; }

        blockItem.click();
        await sleep(600);

        const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirmBtn) {
          confirmBtn.click();
          await sleep(500);
          blocked++;
          results.blocked.push({ username, timestamp: new Date().toISOString() });
          console.log(`🚫 Blocked @${username} [${blocked}/${CONFIG.maxBlocks}]`);
        } else {
          results.failed.push(username);
        }

        await sleep(CONFIG.delay);
      }

      if (!foundNew) emptyScrolls++; else emptyScrolls = 0;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }
  };

  const blockByList = async () => {
    if (CONFIG.usersToBlock.length === 0) {
      console.error('❌ No users in CONFIG.usersToBlock!');
      return;
    }

    for (const username of CONFIG.usersToBlock) {
      if (blocked >= CONFIG.maxBlocks) break;
      if (whitelistSet.has(username.toLowerCase())) {
        results.skipped.push(username);
        console.log(`🛡️ Whitelisted: @${username}`);
        continue;
      }

      if (CONFIG.dryRun) {
        console.log(`🔍 Would block: @${username}`);
        results.blocked.push({ username, dryRun: true });
        blocked++;
        continue;
      }

      window.location.href = `https://x.com/${username}`;
      await sleep(3500);

      let attempts = 0;
      while (!document.querySelector('[data-testid="userActions"]') && attempts < 10) {
        await sleep(500);
        attempts++;
      }

      const moreBtn = document.querySelector('[data-testid="userActions"]');
      if (!moreBtn) { results.failed.push(username); continue; }

      moreBtn.click();
      await sleep(800);

      const menuItems = document.querySelectorAll('[role="menuitem"]');
      let blockItem = null;
      for (const item of menuItems) {
        if (/\bblock\b/i.test(item.textContent)) { blockItem = item; break; }
      }
      if (!blockItem) { document.body.click(); await sleep(300); results.skipped.push(username); continue; }

      blockItem.click();
      await sleep(600);

      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(500);
        blocked++;
        results.blocked.push({ username, timestamp: new Date().toISOString() });
        console.log(`🚫 Blocked @${username} [${blocked}/${CONFIG.maxBlocks}]`);
      } else {
        results.failed.push(username);
      }

      await sleep(CONFIG.delay);
    }
  };

  const run = async () => {
    console.log('🚫 MASS BLOCK — XActions by nichxbt');
    console.log(`⚙️ Mode: ${CONFIG.mode} | Dry run: ${CONFIG.dryRun} | Max: ${CONFIG.maxBlocks}`);

    if (CONFIG.mode === 'list') await blockByList();
    else await blockVisibleUsers();

    console.log(`\n✅ Done! Blocked: ${blocked} | Skipped: ${results.skipped.length} | Failed: ${results.failed.length}`);

    if (results.blocked.length > 0) {
      download(results, `xactions-blocked-${new Date().toISOString().slice(0, 10)}.json`);
    }
  };

  run();
})();

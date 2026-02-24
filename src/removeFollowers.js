// Remove Followers on X - by nichxbt
// https://github.com/nirholas/xactions
// Remove (soft-block) specific followers without fully blocking them
// 1. Go to https://x.com/YOUR_USERNAME/followers
// 2. Open the Developer Console (F12)
// 3. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    // Usernames to remove (without @), or leave empty to remove all visible
    usersToRemove: [
      // 'username1',
      // 'username2',
    ],
    removeAll: false, // Set to true to remove ALL followers (use with caution!)
    maxRemovals: 50,
    actionDelay: 2500,
    scrollDelay: 2000,
    dryRun: true, // Set to false to actually remove
  };

  const $userCell = '[data-testid="UserCell"]';
  const $moreButton = '[data-testid="userActions"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  let removed = 0;
  const results = { removed: [], failed: [], skipped: [] };

  const run = async () => {
    console.log('👋 REMOVE FOLLOWERS - XActions by nichxbt');
    console.log('ℹ️ Uses soft-block (block then unblock) to remove followers');

    if (!window.location.href.includes('/followers')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/followers first!');
      return;
    }

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually remove');
    }

    if (!CONFIG.removeAll && CONFIG.usersToRemove.length === 0) {
      console.log('❌ No users specified! Edit CONFIG.usersToRemove or set removeAll = true');
      return;
    }

    const targetSet = new Set(CONFIG.usersToRemove.map(u => u.toLowerCase()));
    let scrollAttempts = 0;
    const processedUsers = new Set();

    while (removed < CONFIG.maxRemovals && scrollAttempts < 20) {
      const cells = document.querySelectorAll($userCell);
      let foundNew = false;

      for (const cell of cells) {
        if (removed >= CONFIG.maxRemovals) break;

        const linkEl = cell.querySelector('a[href^="/"]');
        if (!linkEl) continue;
        const username = linkEl.href.replace(/^.*x\.com\//, '').split('/')[0].toLowerCase();
        if (processedUsers.has(username)) continue;
        processedUsers.add(username);
        foundNew = true;

        // Check if this user should be removed
        if (!CONFIG.removeAll && !targetSet.has(username)) continue;

        if (CONFIG.dryRun) {
          console.log(`   🔍 Would remove: @${username}`);
          results.removed.push(username);
          removed++;
          continue;
        }

        try {
          // Click the three-dot menu on the user
          const moreBtn = cell.querySelector($moreButton);
          if (!moreBtn) {
            results.failed.push(username);
            continue;
          }

          moreBtn.click();
          await sleep(800);

          // Look for "Remove this follower" option
          const menuItems = document.querySelectorAll('[role="menuitem"]');
          let removeOption = null;
          for (const item of menuItems) {
            if (item.textContent.toLowerCase().includes('remove')) {
              removeOption = item;
              break;
            }
          }

          if (removeOption) {
            removeOption.click();
            await sleep(500);
            // Confirm if needed
            const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (confirmBtn) confirmBtn.click();
            
            console.log(`👋 Removed @${username}`);
            results.removed.push(username);
            removed++;
          } else {
            // Close menu
            document.body.click();
            results.failed.push(username);
          }

          await sleep(CONFIG.actionDelay);
        } catch (e) {
          document.body.click();
          results.failed.push(username);
        }
      }

      if (!foundNew) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    console.log('\n📊 RESULTS:');
    console.log(`   👋 Removed: ${results.removed.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    console.log(`   📊 Scanned: ${processedUsers.size}`);
  };

  run();
})();

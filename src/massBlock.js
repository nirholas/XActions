// Mass Block Users on X - by nichxbt
// https://github.com/nirholas/xactions
// 1. Go to x.com (any page)
// 2. Edit the USERS_TO_BLOCK array below
// 3. Open the Developer Console (F12)
// 4. Paste this into the Developer Console and run it
//
// Last Updated: 24 February 2026
(() => {
  const CONFIG = {
    // Add usernames (without @) to block
    usersToBlock: [
      // 'spammer1',
      // 'spammer2',
    ],
    actionDelay: 3000,
    dryRun: true, // Set to false to actually block
  };

  const $moreButton = '[data-testid="userActions"]';
  const $blockButton = '[data-testid="block"]';
  const $confirmButton = '[data-testid="confirmationSheetConfirm"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const results = { blocked: [], failed: [], skipped: [] };

  const blockUser = async (username) => {
    try {
      // Navigate to user profile
      window.location.href = `https://x.com/${username}`;
      await sleep(3000);

      // Click the three-dot menu
      const moreBtn = document.querySelector($moreButton);
      if (!moreBtn) {
        console.warn(`⚠️ @${username}: Profile not found or menu missing`);
        results.failed.push(username);
        return;
      }

      moreBtn.click();
      await sleep(1000);

      // Find block option in dropdown
      const blockBtn = document.querySelector($blockButton);
      if (!blockBtn) {
        console.warn(`⚠️ @${username}: Block option not found`);
        results.failed.push(username);
        return;
      }

      blockBtn.click();
      await sleep(1000);

      // Confirm block
      const confirmBtn = document.querySelector($confirmButton);
      if (confirmBtn) {
        confirmBtn.click();
        console.log(`🚫 Blocked @${username}`);
        results.blocked.push(username);
      } else {
        results.failed.push(username);
      }
    } catch (e) {
      console.error(`❌ Error blocking @${username}:`, e.message);
      results.failed.push(username);
    }
  };

  const run = async () => {
    console.log('🚫 MASS BLOCK USERS - XActions by nichxbt');

    if (CONFIG.usersToBlock.length === 0) {
      console.log('❌ No users to block! Edit CONFIG.usersToBlock and add usernames.');
      return;
    }

    console.log(`📋 Users to block: ${CONFIG.usersToBlock.length}`);

    if (CONFIG.dryRun) {
      console.log('⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually block');
      CONFIG.usersToBlock.forEach((u, i) => console.log(`   ${i + 1}. @${u}`));
      return;
    }

    for (const username of CONFIG.usersToBlock) {
      console.log(`\n⏳ Processing @${username}...`);
      await blockUser(username);
      await sleep(CONFIG.actionDelay);
    }

    console.log('\n📊 RESULTS:');
    console.log(`   ✅ Blocked: ${results.blocked.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    if (results.failed.length > 0) {
      console.log(`   Failed users: ${results.failed.join(', ')}`);
    }
  };

  run();
})();

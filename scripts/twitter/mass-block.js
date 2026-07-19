// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * ============================================================
 * 🚫 Mass Block
 * ============================================================
 * 
 * @name        mass-block.js
 * @description Block multiple users from a list
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to x.com (any page)
 * 2. Edit the USERS_TO_BLOCK array below
 * 3. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 4. Paste this script and press Enter
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // List of usernames to block (without @)
  usersToBlock: [
    // 'username1',
    // 'username2',
    // Add usernames here
  ],
  
  // Delay between blocks (ms) - don't go below 2000 to avoid rate limits
  blockDelay: 3000,
  
  // Dry run mode - set to false to actually block
  dryRun: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function massBlock() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Navigate within the SPA. Assigning window.location.href triggers a full
  // page load, which destroys this console script after the first user.
  const spaNavigate = (url) => {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        window.history.pushState({}, '', target.href);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
    } catch (e) {}
    window.location.href = url;
  };

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚫 XActions — Mass Block                                    ║
║  Block multiple users from a list                            ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be blocked             ║' : '║  🔴 LIVE MODE - Accounts WILL be blocked                    ║'}
╚══════════════════════════════════════════════════════════════╝
  `);

  if (CONFIG.usersToBlock.length === 0) {
    console.log('❌ No users to block! Edit CONFIG.usersToBlock and add usernames.');
    console.log('\nExample:');
    console.log('  usersToBlock: [');
    console.log('    "spammer1",');
    console.log('    "spammer2",');
    console.log('  ],');
    return;
  }

  console.log(`📋 Users to block: ${CONFIG.usersToBlock.length}`);
  CONFIG.usersToBlock.forEach((u, i) => {
    console.log(`   ${i + 1}. @${u}`);
  });
  console.log('');

  if (CONFIG.dryRun) {
    console.log('⚠️  DRY RUN MODE - Set CONFIG.dryRun = false to actually block\n');
    return;
  }

  const results = {
    blocked: [],
    failed: [],
    notFound: []
  };

  for (const username of CONFIG.usersToBlock) {
    console.log(`\n⏳ Processing @${username}...`);

    try {
      // Navigate to user's profile (SPA navigation keeps this script alive)
      const profileUrl = `https://x.com/${username}`;
      spaNavigate(profileUrl);
      await sleep(3000); // Wait for page load

      // Find the more button (poll briefly: profiles can render slowly)
      let moreButton = document.querySelector('[data-testid="userActions"]');
      let waited = 0;
      while (!moreButton && waited < 5000) {
        await sleep(500);
        waited += 500;
        moreButton = document.querySelector('[data-testid="userActions"]');
      }

      if (!moreButton) {
        console.log(`   ❌ Could not find user menu for @${username}`);
        results.notFound.push(username);
        continue;
      }

      moreButton.click();
      await sleep(500);

      // Find block option
      const blockOption = document.querySelector('[data-testid="block"]');
      
      if (!blockOption) {
        console.log(`   ❌ Block option not found for @${username}`);
        results.failed.push(username);
        document.body.click(); // Close menu
        continue;
      }

      blockOption.click();
      await sleep(500);

      // Confirm block
      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      
      if (confirmBtn) {
        confirmBtn.click();
        console.log(`   ✅ Blocked @${username}`);
        results.blocked.push(username);
      } else {
        console.log(`   ❌ Could not confirm block for @${username}`);
        results.failed.push(username);
      }

      await sleep(CONFIG.blockDelay);

    } catch (error) {
      console.log(`   ❌ Error blocking @${username}: ${error.message}`);
      results.failed.push(username);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 RESULTS');
  console.log('═'.repeat(60));
  console.log(`\n✅ Blocked: ${results.blocked.length}`);
  results.blocked.forEach(u => console.log(`   @${u}`));
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(u => console.log(`   @${u}`));
  }
  
  if (results.notFound.length > 0) {
    console.log(`\n❓ Not found: ${results.notFound.length}`);
    results.notFound.forEach(u => console.log(`   @${u}`));
  }

  // Save log
  const storageKey = 'xactions_mass_block_log';
  const log = {
    timestamp: new Date().toISOString(),
    ...results
  };
  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
  existing.push(log);
  localStorage.setItem(storageKey, JSON.stringify(existing.slice(-50)));

  console.log('\n💾 Results saved to localStorage');

})();

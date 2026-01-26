/**
 * ============================================================
 * ✅ Mass Unblock
 * ============================================================
 * 
 * @name        mass-unblock.js
 * @description Unblock multiple users
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your blocked accounts: https://x.com/settings/blocked/all
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Unblocks all or selected accounts
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Unblock all blocked accounts (true) or just specific ones (false)
  unblockAll: true,
  
  // If unblockAll is false, specify usernames to unblock
  usersToUnblock: [
    // 'username1',
    // 'username2',
  ],
  
  // Delay between unblocks (ms)
  unblockDelay: 1500,
  
  // Max accounts to unblock per run
  maxUnblocks: 100,
  
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 20,
  
  // Dry run mode
  dryRun: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function massUnblock() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ✅ XActions — Mass Unblock                                  ║
║  Unblock multiple users                                      ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be unblocked           ║' : '║  🔴 LIVE MODE - Accounts WILL be unblocked                  ║'}
╚══════════════════════════════════════════════════════════════╝
  `);

  // Check if on blocked accounts page
  if (!window.location.href.includes('/settings/blocked')) {
    console.error('❌ Please navigate to your blocked accounts page first!');
    console.log('👉 Go to: https://x.com/settings/blocked/all');
    return;
  }

  const $userCell = '[data-testid="UserCell"]';
  const $unblockBtn = '[data-testid$="-unblock"]';

  console.log('🔍 Scanning blocked accounts...\n');

  const blockedUsers = new Map();
  let scrollCount = 0;
  let retries = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < 3) {
    const prevSize = blockedUsers.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const link = cell.querySelector('a[href^="/"]');
      const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!username || blockedUsers.has(username)) return;

      const unblockBtn = cell.querySelector($unblockBtn);
      if (unblockBtn) {
        blockedUsers.set(username, { element: cell, button: unblockBtn });
      }
    });

    if (blockedUsers.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Found ${blockedUsers.size} blocked accounts...`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Found ${blockedUsers.size} blocked accounts\n`);

  if (blockedUsers.size === 0) {
    console.log('🎉 No blocked accounts found!');
    return;
  }

  // Determine which users to unblock
  let toUnblock = [];
  
  if (CONFIG.unblockAll) {
    toUnblock = Array.from(blockedUsers.entries()).slice(0, CONFIG.maxUnblocks);
    console.log(`📋 Will unblock ${toUnblock.length} accounts (all)`);
  } else {
    toUnblock = CONFIG.usersToUnblock
      .filter(u => blockedUsers.has(u))
      .map(u => [u, blockedUsers.get(u)]);
    console.log(`📋 Will unblock ${toUnblock.length} specified accounts`);
    
    const notFound = CONFIG.usersToUnblock.filter(u => !blockedUsers.has(u));
    if (notFound.length > 0) {
      console.log(`⚠️  Not found in blocked list: ${notFound.join(', ')}`);
    }
  }

  if (toUnblock.length === 0) {
    console.log('❌ No accounts to unblock!');
    return;
  }

  console.log('');
  toUnblock.slice(0, 20).forEach(([username], i) => {
    console.log(`   ${i + 1}. @${username}`);
  });
  if (toUnblock.length > 20) {
    console.log(`   ... and ${toUnblock.length - 20} more`);
  }

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE - No unblocks performed');
    console.log('Set CONFIG.dryRun = false to actually unblock');
    console.log('═'.repeat(60));
    return;
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🔄 UNBLOCKING ACCOUNTS');
  console.log('═'.repeat(60));

  let unblocked = 0;

  for (const [username, data] of toUnblock) {
    try {
      data.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);

      data.button.click();
      await sleep(500);

      // Check for confirmation dialog
      const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirmBtn) {
        confirmBtn.click();
        await sleep(300);
      }

      unblocked++;
      console.log(`✅ Unblocked @${username}`);

      await sleep(CONFIG.unblockDelay);
    } catch (e) {
      console.log(`❌ Failed to unblock @${username}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Unblocked ${unblocked}/${toUnblock.length} accounts`);
  console.log('═'.repeat(60));

  // Save log
  const storageKey = 'xactions_unblock_log';
  const log = {
    timestamp: new Date().toISOString(),
    unblocked: toUnblock.slice(0, unblocked).map(([u]) => u)
  };
  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
  existing.push(log);
  localStorage.setItem(storageKey, JSON.stringify(existing.slice(-50)));

  console.log('\n💾 Results saved to localStorage');

})();

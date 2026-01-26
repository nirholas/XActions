/**
 * ============================================================
 * 🔊 Mass Unmute
 * ============================================================
 * 
 * @name        mass-unmute.js
 * @description Unmute multiple users
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to muted accounts: https://x.com/settings/muted/all
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Unmutes all or selected accounts
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Unmute all muted accounts
  unmuteAll: true,
  
  // If unmuteAll is false, specify usernames to unmute
  usersToUnmute: [
    // 'username1',
    // 'username2',
  ],
  
  // Delay between unmutes (ms)
  unmuteDelay: 1000,
  
  // Max accounts to unmute per run
  maxUnmutes: 200,
  
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 30,
  
  // Dry run mode
  dryRun: true
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function massUnmute() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔊 XActions — Mass Unmute                                   ║
║  Unmute multiple users                                       ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be unmuted             ║' : '║  🔴 LIVE MODE - Accounts WILL be unmuted                    ║'}
╚══════════════════════════════════════════════════════════════╝
  `);

  // Check if on muted accounts page
  if (!window.location.href.includes('/settings/muted')) {
    console.error('❌ Please navigate to your muted accounts page first!');
    console.log('👉 Go to: https://x.com/settings/muted/all');
    return;
  }

  const $userCell = '[data-testid="UserCell"]';

  console.log('🔍 Scanning muted accounts...\n');

  const mutedUsers = new Map();
  let scrollCount = 0;
  let retries = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < 3) {
    const prevSize = mutedUsers.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const link = cell.querySelector('a[href^="/"]');
      const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!username || mutedUsers.has(username)) return;

      mutedUsers.set(username, { element: cell });
    });

    if (mutedUsers.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Found ${mutedUsers.size} muted accounts...`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Found ${mutedUsers.size} muted accounts\n`);

  if (mutedUsers.size === 0) {
    console.log('🎉 No muted accounts found!');
    return;
  }

  // Determine which users to unmute
  let toUnmute = [];
  
  if (CONFIG.unmuteAll) {
    toUnmute = Array.from(mutedUsers.entries()).slice(0, CONFIG.maxUnmutes);
    console.log(`📋 Will unmute ${toUnmute.length} accounts (all)`);
  } else {
    toUnmute = CONFIG.usersToUnmute
      .filter(u => mutedUsers.has(u))
      .map(u => [u, mutedUsers.get(u)]);
    console.log(`📋 Will unmute ${toUnmute.length} specified accounts`);
  }

  if (toUnmute.length === 0) {
    console.log('❌ No accounts to unmute!');
    return;
  }

  toUnmute.slice(0, 20).forEach(([username], i) => {
    console.log(`   ${i + 1}. @${username}`);
  });
  if (toUnmute.length > 20) {
    console.log(`   ... and ${toUnmute.length - 20} more`);
  }

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE - No unmutes performed');
    console.log('Set CONFIG.dryRun = false to actually unmute');
    console.log('═'.repeat(60));
    return;
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🔊 UNMUTING ACCOUNTS');
  console.log('═'.repeat(60));

  let unmuted = 0;

  for (const [username, data] of toUnmute) {
    try {
      data.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);

      // Find unmute button in the cell
      const unmuteBtn = data.element.querySelector('[data-testid$="-unmute"], button[aria-label*="Unmute"]');
      
      if (unmuteBtn) {
        unmuteBtn.click();
        await sleep(300);
        unmuted++;
        console.log(`✅ Unmuted @${username}`);
      } else {
        // Try via the more menu
        const moreBtn = data.element.querySelector('[data-testid="userActions"]');
        if (moreBtn) {
          moreBtn.click();
          await sleep(300);
          
          const unmuteOption = document.querySelector('[data-testid="unmute"]');
          if (unmuteOption) {
            unmuteOption.click();
            unmuted++;
            console.log(`✅ Unmuted @${username}`);
          }
          
          document.body.click(); // Close menu
        }
      }

      await sleep(CONFIG.unmuteDelay);
    } catch (e) {
      console.log(`❌ Failed to unmute @${username}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`✅ Unmuted ${unmuted}/${toUnmute.length} accounts`);
  console.log('═'.repeat(60));

  // Save log
  const storageKey = 'xactions_unmute_log';
  const log = {
    timestamp: new Date().toISOString(),
    unmuted: toUnmute.slice(0, unmuted).map(([u]) => u)
  };
  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
  existing.push(log);
  localStorage.setItem(storageKey, JSON.stringify(existing.slice(-50)));

  console.log('\n💾 Results saved to localStorage');

})();

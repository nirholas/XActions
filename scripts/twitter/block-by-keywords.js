/**
 * ============================================================
 * 🚫 Block By Keywords
 * ============================================================
 * 
 * @name        block-by-keywords.js
 * @description Block users with specific keywords in their bio
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to a followers/following page
 * 2. Edit the BLOCK_KEYWORDS array below
 * 3. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 4. Paste this script and press Enter
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Keywords to look for in bio (case-insensitive)
  blockKeywords: [
    'crypto',
    'nft',
    'giveaway',
    'airdrop',
    'onlyfans',
    'dm for promo',
    'follow back',
    'f4f'
  ],
  
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 30,
  maxRetries: 3,
  
  // Delay between blocks
  blockDelay: 2000,
  
  // Dry run - set to false to actually block
  dryRun: true,
  
  // Max accounts to block per run
  maxBlocks: 50
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function blockByKeywords() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🚫 XActions — Block By Keywords                             ║
║  Block users with specific bio keywords                      ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be blocked             ║' : '║  🔴 LIVE MODE - Accounts WILL be blocked                    ║'}
╚══════════════════════════════════════════════════════════════╝
  `);

  if (!window.location.pathname.includes('/followers') && !window.location.pathname.includes('/following')) {
    console.error('❌ Please navigate to a followers or following page first!');
    return;
  }

  console.log('🔍 Looking for users with these keywords in bio:');
  CONFIG.blockKeywords.forEach(kw => console.log(`   • ${kw}`));
  console.log('');

  const $userCell = '[data-testid="UserCell"]';
  const scanned = new Set();
  const matches = [];
  let retries = 0;
  let scrollCount = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = scanned.size;

    document.querySelectorAll($userCell).forEach(cell => {
      // Get username
      const link = cell.querySelector('a[href^="/"]');
      const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!username || scanned.has(username)) return;
      
      scanned.add(username);

      // Get bio
      const bioEl = cell.querySelector('[data-testid="UserDescription"]');
      const bio = (bioEl?.textContent || '').toLowerCase();

      // Check for keywords
      const matchedKeywords = CONFIG.blockKeywords.filter(kw => 
        bio.includes(kw.toLowerCase())
      );

      if (matchedKeywords.length > 0) {
        matches.push({
          username,
          bio: bioEl?.textContent || '',
          keywords: matchedKeywords,
          element: cell
        });
      }
    });

    if (scanned.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scanned.size} | Matches: ${matches.length}`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Scan complete!`);
  console.log(`   Total scanned: ${scanned.size}`);
  console.log(`   Matching users: ${matches.length}\n`);

  if (matches.length === 0) {
    console.log('🎉 No users found with those keywords!');
    return;
  }

  console.log('═'.repeat(60));
  console.log('🎯 USERS WITH MATCHING KEYWORDS');
  console.log('═'.repeat(60));

  matches.forEach((m, i) => {
    console.log(`\n${i + 1}. @${m.username}`);
    console.log(`   Keywords: ${m.keywords.join(', ')}`);
    console.log(`   Bio: "${m.bio.slice(0, 100)}${m.bio.length > 100 ? '...' : ''}"`);
  });

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE - No blocks performed');
    console.log('Set CONFIG.dryRun = false to actually block');
    console.log('═'.repeat(60));
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('🔴 BLOCKING MATCHING USERS');
    console.log('═'.repeat(60));

    let blocked = 0;
    const toBlock = matches.slice(0, CONFIG.maxBlocks);

    for (const user of toBlock) {
      try {
        user.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        const moreButton = user.element.querySelector('[data-testid="userActions"]');
        if (moreButton) {
          moreButton.click();
          await sleep(500);

          const blockOption = document.querySelector('[data-testid="block"]');
          if (blockOption) {
            blockOption.click();
            await sleep(500);

            const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (confirmBtn) {
              confirmBtn.click();
              blocked++;
              console.log(`✅ Blocked @${user.username}`);
            }
          }
        }

        await sleep(CONFIG.blockDelay);
      } catch (e) {
        console.log(`❌ Failed to block @${user.username}`);
      }
    }

    console.log(`\n✅ Blocked ${blocked}/${toBlock.length} accounts`);
  }

  // Save log
  const storageKey = 'xactions_keyword_blocks';
  const log = matches.map(m => ({
    username: m.username,
    keywords: m.keywords,
    timestamp: new Date().toISOString()
  }));
  localStorage.setItem(storageKey, JSON.stringify(log));

  console.log('\n💾 Results saved to localStorage');

})();

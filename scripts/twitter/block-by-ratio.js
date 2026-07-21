// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 📊 Block By Ratio
 * ============================================================
 * 
 * @name        block-by-ratio.js
 * @description Block accounts by follower/following ratio
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to a followers page: https://x.com/USERNAME/followers
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Blocks accounts with suspicious following/follower ratios
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

// `var` (not `const`): a repeated top-level `const` paste in the same
// DevTools tab throws "already been declared" instead of re-running.
var CONFIG = {
  // Maximum following/followers ratio allowed
  // e.g., 50 means following 5000, followers 100 = ratio 50:1 = blocked
  maxRatio: 50,
  
  // Minimum following count to consider (avoid false positives on new accounts)
  minFollowing: 100,
  
  // Minimum followers to not flag (very new accounts)
  minFollowers: 5,
  
  // Scroll settings
  scrollDelay: 2000,
  maxScrolls: 30,
  maxRetries: 3,
  
  // Delay between blocks
  blockDelay: 2000,
  
  // Dry run mode
  dryRun: true,
  
  // Max blocks per run
  maxBlocks: 30
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function blockByRatio() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📊 XActions — Block By Ratio                                ║
║  Block accounts with suspicious following/follower ratios    ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be blocked             ║' : '║  🔴 LIVE MODE - Accounts WILL be blocked                    ║'}
╚══════════════════════════════════════════════════════════════╝
  `);

  console.log(`📊 Threshold: Blocking accounts with ratio > ${CONFIG.maxRatio}:1`);
  console.log(`   (following/followers > ${CONFIG.maxRatio})\n`);

  if (!window.location.pathname.includes('/followers')) {
    console.error('❌ Please navigate to a FOLLOWERS page first!');
    return;
  }

  const $userCell = '[data-testid="UserCell"]';

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '');
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  console.log('🔍 Scanning followers and checking ratios...\n');

  const scanned = new Set();
  const flagged = [];
  let retries = 0;
  let scrollCount = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = scanned.size;

    for (const cell of document.querySelectorAll($userCell)) {
      const link = cell.querySelector('a[href^="/"]');
      const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!username || scanned.has(username)) continue;

      scanned.add(username);

      // Try to get stats from cell text
      const text = cell.textContent;
      
      // Look for following/followers in the cell
      const followingMatch = text.match(/([\d,.]+[KMB]?)\s*Following/i);
      const followersMatch = text.match(/([\d,.]+[KMB]?)\s*Follower/i);

      if (followingMatch && followersMatch) {
        const following = parseCount(followingMatch[1]);
        const followers = parseCount(followersMatch[1]);
        
        if (following >= CONFIG.minFollowing && followers > 0) {
          const ratio = following / followers;
          
          if (ratio > CONFIG.maxRatio || followers < CONFIG.minFollowers) {
            flagged.push({
              username,
              following,
              followers,
              ratio: ratio.toFixed(1),
              element: cell
            });
          }
        }
      }
    }

    if (scanned.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scanned.size} | Flagged: ${flagged.length}`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Scan complete!`);
  console.log(`   Total scanned: ${scanned.size}`);
  console.log(`   Flagged accounts: ${flagged.length}\n`);

  if (flagged.length === 0) {
    console.log('🎉 No accounts with suspicious ratios found!');
    return;
  }

  // Sort by ratio
  flagged.sort((a, b) => parseFloat(b.ratio) - parseFloat(a.ratio));

  console.log('═'.repeat(60));
  console.log('🚨 ACCOUNTS WITH SUSPICIOUS RATIOS');
  console.log('═'.repeat(60));

  flagged.slice(0, 30).forEach((u, i) => {
    console.log(`\n${i + 1}. @${u.username}`);
    console.log(`   Following: ${u.following.toLocaleString()} | Followers: ${u.followers.toLocaleString()}`);
    console.log(`   Ratio: ${u.ratio}:1`);
  });

  if (flagged.length > 30) {
    console.log(`\n... and ${flagged.length - 30} more`);
  }

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE - No blocks performed');
    console.log('Set CONFIG.dryRun = false to actually block');
    console.log('═'.repeat(60));
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('🔴 BLOCKING FLAGGED ACCOUNTS');
    console.log('═'.repeat(60));

    let blocked = 0;
    const toBlock = flagged.slice(0, CONFIG.maxBlocks);

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
              console.log(`✅ Blocked @${user.username} (ratio: ${user.ratio}:1)`);
            }
          }

          // Close menu if still open
          document.body.click();
        }

        await sleep(CONFIG.blockDelay);
      } catch (e) {
        console.log(`❌ Failed to block @${user.username}`);
      }
    }

    console.log(`\n✅ Blocked ${blocked}/${toBlock.length} accounts`);
  }

  // Save log
  const storageKey = 'xactions_ratio_blocks';
  const log = flagged.map(u => ({
    username: u.username,
    ratio: u.ratio,
    following: u.following,
    followers: u.followers,
    timestamp: new Date().toISOString()
  }));
  localStorage.setItem(storageKey, JSON.stringify(log));

  console.log('\n💾 Results saved to localStorage');

})();

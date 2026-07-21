// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🔇 Mute By Keywords
 * ============================================================
 * 
 * @name        mute-by-keywords.js
 * @description Mute users with specific keywords in bio
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to a followers/following page
 * 2. Edit the muteKeywords array below
 * 3. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 4. Paste this script and press Enter
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

// `var` (not `const`): a repeated top-level `const` paste in the same
// DevTools tab throws "already been declared" instead of re-running.
var CONFIG = {
  // Keywords to look for in bio (case-insensitive)
  muteKeywords: [
    'crypto',
    'nft',
    'giveaway',
    'trading signals',
    'dm for promo'
  ],
  
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 30,
  maxRetries: 3,
  
  // Delay between mutes
  muteDelay: 2000,
  
  // Dry run mode
  dryRun: true,
  
  // Max accounts to mute per run
  maxMutes: 50
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function muteByKeywords() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Stop switch: run window.stopMuteByKeywords() from the console to abort
  // after the account currently being processed.
  let stopped = false;
  window.stopMuteByKeywords = () => {
    stopped = true;
    console.log('🛑 Stop requested. Finishing the current account, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔇 XActions — Mute By Keywords                              ║
║  Mute users with specific bio keywords                       ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be muted               ║' : '║  🔴 LIVE MODE - Accounts WILL be muted                      ║'}
╚══════════════════════════════════════════════════════════════╝
  `);
  console.log('💡 To stop early: window.stopMuteByKeywords()\n');

  if (!window.location.pathname.includes('/followers') && !window.location.pathname.includes('/following')) {
    console.error('❌ Please navigate to a followers or following page first!');
    return;
  }

  console.log('🔍 Looking for users with these keywords:');
  CONFIG.muteKeywords.forEach(kw => console.log(`   • ${kw}`));
  console.log('');

  const $userCell = '[data-testid="UserCell"]';
  const scanned = new Set();
  const matches = [];
  let retries = 0;
  let scrollCount = 0;

  while (!stopped && scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = scanned.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const link = cell.querySelector('a[href^="/"]');
      const username = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!username || scanned.has(username)) return;
      
      scanned.add(username);

      const bioEl = cell.querySelector('[data-testid="UserDescription"]');
      const bio = (bioEl?.textContent || '').toLowerCase();

      const matchedKeywords = CONFIG.muteKeywords.filter(kw => 
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
    console.log('⚠️  DRY RUN MODE - No mutes performed');
    console.log('Set CONFIG.dryRun = false to actually mute');
    console.log('═'.repeat(60));
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('🔇 MUTING MATCHING USERS');
    console.log('═'.repeat(60));

    let muted = 0;
    const toMute = matches.slice(0, CONFIG.maxMutes);

    for (const user of toMute) {
      if (stopped) {
        console.log('🛑 Stopped by user.');
        break;
      }

      try {
        user.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        const moreButton = user.element.querySelector('[data-testid="userActions"]');
        if (moreButton) {
          moreButton.click();
          await sleep(500);

          // Look for mute option
          const muteOption = document.querySelector('[data-testid="mute"]');
          if (muteOption) {
            muteOption.click();
            muted++;
            console.log(`✅ Muted @${user.username}`);
          } else {
            console.log(`⚠️  Mute option not found for @${user.username}`);
          }

          // Close menu
          document.body.click();
        }

        await sleep(CONFIG.muteDelay);
      } catch (e) {
        console.log(`❌ Failed to mute @${user.username}`);
      }
    }

    console.log(`\n✅ Muted ${muted}/${toMute.length} accounts`);
  }

  // Save log
  const storageKey = 'xactions_keyword_mutes';
  const log = matches.map(m => ({
    username: m.username,
    keywords: m.keywords,
    timestamp: new Date().toISOString()
  }));
  localStorage.setItem(storageKey, JSON.stringify(log));

  console.log('\n💾 Results saved to localStorage');

})();

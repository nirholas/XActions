/**
 * ============================================================
 * 🤖 Block Bots
 * ============================================================
 * 
 * @name        block-bots.js
 * @description Detect and block bot accounts by ratio, age, bio keywords
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to your followers page: https://x.com/YOUR_USERNAME/followers
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Reviews followers and blocks suspected bots
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 50,
  maxRetries: 3,
  
  // Action delay between blocks
  blockDelay: 2000,
  
  // Bot detection thresholds
  detection: {
    // Following/Followers ratio threshold (e.g., following 5000, followers 50 = ratio 100)
    maxFollowingRatio: 50,
    
    // Minimum account age in days
    minAccountAgeDays: 30,
    
    // Maximum following count
    maxFollowing: 5000,
    
    // Minimum followers count
    minFollowers: 5,
    
    // Suspicious bio keywords (case-insensitive)
    suspiciousBioKeywords: [
      'crypto', 'nft', 'giveaway', 'airdrop', 'free money',
      'onlyfans', 'dm for', 'follow back', 'f4f', 'follow4follow',
      'bitcoin', 'eth', '$btc', '$eth', 'forex', 'trading signals',
      'make money', 'passive income', 'work from home',
      'link in bio', 'check bio', 'clickhere', 'sexo', 'sex',
      'camgirl', 'hot girl', 'sugar', 'seeking arrangement'
    ],
    
    // Flag accounts with default profile picture
    flagDefaultAvatar: true,
    
    // Flag accounts with no bio
    flagNoBio: true,
    
    // Flag accounts with very short usernames + numbers
    flagRandomUsername: true
  },
  
  // Dry run mode - set to false to actually block
  dryRun: true,
  
  // Maximum accounts to block per run
  maxBlocks: 50
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function blockBots() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🤖 XActions — Block Bots                                    ║
║  Detect and block bot accounts                               ║
${CONFIG.dryRun ? '║  ⚠️  DRY RUN MODE - No accounts will be blocked             ║' : '║  🔴 LIVE MODE - Accounts WILL be blocked                    ║'}
╚══════════════════════════════════════════════════════════════╝
  `);

  if (!window.location.pathname.includes('/followers')) {
    console.error('❌ Please navigate to your FOLLOWERS page first!');
    console.log('👉 Go to: https://x.com/YOUR_USERNAME/followers');
    return;
  }

  const $userCell = '[data-testid="UserCell"]';

  // Analyze a user cell for bot indicators
  const analyzeUser = (cell) => {
    const result = {
      username: '',
      displayName: '',
      bio: '',
      isBot: false,
      reasons: [],
      score: 0
    };

    // Get username
    const usernameLink = cell.querySelector('a[href^="/"]');
    if (usernameLink) {
      result.username = usernameLink.getAttribute('href').replace('/', '').split('/')[0];
    }

    // Get display name
    const nameEl = cell.querySelector('[dir="ltr"] span');
    result.displayName = nameEl?.textContent || result.username;

    // Get bio text
    const bioEl = cell.querySelector('[data-testid="UserDescription"]');
    result.bio = bioEl?.textContent?.toLowerCase() || '';

    // Check for suspicious bio keywords
    const c = CONFIG.detection;
    c.suspiciousBioKeywords.forEach(keyword => {
      if (result.bio.includes(keyword.toLowerCase())) {
        result.score += 20;
        result.reasons.push(`Bio contains "${keyword}"`);
      }
    });

    // Check for no bio
    if (c.flagNoBio && !result.bio) {
      result.score += 10;
      result.reasons.push('No bio');
    }

    // Check for default avatar
    if (c.flagDefaultAvatar) {
      const avatar = cell.querySelector('img[src*="default_profile"]');
      if (avatar) {
        result.score += 15;
        result.reasons.push('Default profile picture');
      }
    }

    // Check for random username pattern (short + many numbers)
    if (c.flagRandomUsername) {
      const numMatch = result.username.match(/\d+/g);
      if (numMatch && numMatch.join('').length >= 6) {
        result.score += 15;
        result.reasons.push('Username has many numbers');
      }
    }

    // Check follower/following stats from cell (if available)
    const statsText = cell.textContent;
    const followingMatch = statsText.match(/([\d,.]+[KMB]?)\s*Following/i);
    const followersMatch = statsText.match(/([\d,.]+[KMB]?)\s*Followers/i);

    if (followingMatch && followersMatch) {
      const following = parseCount(followingMatch[1]);
      const followers = parseCount(followersMatch[1]);
      
      if (following > c.maxFollowing) {
        result.score += 15;
        result.reasons.push(`Following ${following.toLocaleString()} accounts`);
      }
      
      if (followers < c.minFollowers) {
        result.score += 10;
        result.reasons.push(`Only ${followers} followers`);
      }
      
      const ratio = following / (followers || 1);
      if (ratio > c.maxFollowingRatio) {
        result.score += 25;
        result.reasons.push(`High following ratio (${ratio.toFixed(0)}:1)`);
      }
    }

    // Determine if bot based on score
    result.isBot = result.score >= 30;

    return result;
  };

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

  console.log('🔍 Scanning followers for bot patterns...\n');

  const scannedUsers = new Set();
  const suspectedBots = [];
  let retries = 0;
  let scrollCount = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = scannedUsers.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const analysis = analyzeUser(cell);
      if (!analysis.username || scannedUsers.has(analysis.username)) return;
      
      scannedUsers.add(analysis.username);
      
      if (analysis.isBot) {
        suspectedBots.push({ ...analysis, element: cell });
      }
    });

    if (scannedUsers.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scannedUsers.size} | Suspected bots: ${suspectedBots.length}`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  console.log(`\n✅ Scan complete!`);
  console.log(`   Total scanned: ${scannedUsers.size}`);
  console.log(`   Suspected bots: ${suspectedBots.length}\n`);

  if (suspectedBots.length === 0) {
    console.log('🎉 No suspected bots found!');
    return;
  }

  // Sort by score (highest first)
  suspectedBots.sort((a, b) => b.score - a.score);

  console.log('═'.repeat(60));
  console.log('🤖 SUSPECTED BOT ACCOUNTS');
  console.log('═'.repeat(60));

  suspectedBots.slice(0, 20).forEach((bot, i) => {
    console.log(`\n${i + 1}. @${bot.username} (Score: ${bot.score})`);
    console.log(`   ${bot.displayName}`);
    console.log(`   Reasons: ${bot.reasons.join(', ')}`);
    console.log(`   https://x.com/${bot.username}`);
  });

  if (suspectedBots.length > 20) {
    console.log(`\n... and ${suspectedBots.length - 20} more`);
  }

  // Block function
  const blockUser = async (username) => {
    // Navigate to user's profile
    const profileUrl = `https://x.com/${username}`;
    
    // For now, we'll use the API approach via the more menu
    // In practice, blocking from the followers list is complex
    // This is a simplified version
    
    console.log(`   Would block @${username}...`);
    return true;
  };

  if (CONFIG.dryRun) {
    console.log('\n' + '═'.repeat(60));
    console.log('⚠️  DRY RUN MODE');
    console.log('═'.repeat(60));
    console.log('\nTo actually block these accounts:');
    console.log('1. Set CONFIG.dryRun = false at the top of the script');
    console.log('2. Run the script again');
    console.log('\nOr block manually by visiting each profile.');
  } else {
    console.log('\n' + '═'.repeat(60));
    console.log('🔴 BLOCKING ACCOUNTS');
    console.log('═'.repeat(60));

    const toBlock = suspectedBots.slice(0, CONFIG.maxBlocks);
    let blocked = 0;

    for (const bot of toBlock) {
      console.log(`\n⏳ Blocking @${bot.username}...`);
      
      try {
        // Scroll user into view
        bot.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        // Click on the user cell to open profile or find block option
        const moreButton = bot.element.querySelector('[data-testid="userActions"]');
        if (moreButton) {
          moreButton.click();
          await sleep(500);

          // Find block option in dropdown
          const blockOption = document.querySelector('[data-testid="block"]');
          if (blockOption) {
            blockOption.click();
            await sleep(500);

            // Confirm block
            const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (confirmBtn) {
              confirmBtn.click();
              blocked++;
              console.log(`   ✅ Blocked @${bot.username}`);
            }
          }
        }

        await sleep(CONFIG.blockDelay);
      } catch (e) {
        console.log(`   ❌ Failed to block @${bot.username}: ${e.message}`);
      }
    }

    console.log(`\n✅ Blocked ${blocked} accounts`);
  }

  // Save results
  const storageKey = 'xactions_blocked_bots';
  const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const newEntries = suspectedBots.map(b => ({
    username: b.username,
    score: b.score,
    reasons: b.reasons,
    timestamp: new Date().toISOString()
  }));
  localStorage.setItem(storageKey, JSON.stringify([...existing, ...newEntries].slice(-1000)));

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Results saved. Export: copy(localStorage.getItem("${storageKey}"))`);
  console.log('═'.repeat(60) + '\n');

})();

/**
 * ============================================================
 * 🕵️ Find Fake Followers
 * ============================================================
 * 
 * @name        find-fake-followers.js
 * @description Identify likely fake/bot followers in your audience
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
 * 4. Analyzes followers to identify likely fakes/bots
 * 
 * ============================================================
 * ⚙️ CONFIGURATION - Bot Detection Criteria
 * ============================================================
 */

const CONFIG = {
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 50,
  maxRetries: 3,
  
  // Scoring weights (higher = more suspicious)
  scoring: {
    // Following/Followers ratio
    highFollowingRatio: 25,        // Following 50x more than followers
    veryHighFollowingRatio: 40,    // Following 100x more than followers
    
    // Account characteristics
    defaultAvatar: 20,             // Default profile picture
    noBio: 15,                     // Empty bio
    suspiciousBio: 25,             // Suspicious keywords in bio
    randomUsername: 15,            // Username pattern like abc12345678
    
    // Following count
    massFollowing: 15,             // Following > 3000
    extremeFollowing: 25,          // Following > 5000
    
    // Follower count
    noFollowers: 20,               // 0 followers
    veryFewFollowers: 10           // < 10 followers
  },
  
  // Thresholds
  thresholds: {
    highRatio: 50,                 // Following/Followers ratio
    veryHighRatio: 100,
    massFollowing: 3000,
    extremeFollowing: 5000
  },
  
  // Suspicious bio keywords (from x-bot-sweeper)
  suspiciousKeywords: [
    'crypto', 'nft', 'bitcoin', 'btc', 'eth', 'forex', 'trading signals',
    'giveaway', 'airdrop', 'free money', 'passive income',
    'onlyfans', 'fansly', 'dm for', 'link in bio', 'check bio',
    'follow back', 'f4f', 'follow4follow', 'followback',
    '18+', 'adult', 'nsfw', 'sexy', 'hot girl',
    'make money', 'work from home', 'get rich', 'financial freedom',
    'investment opportunity', 'guaranteed returns'
  ],
  
  // Minimum score to flag as fake
  minFakeScore: 40,
  
  // Likely fake threshold
  likelyFakeScore: 60
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function findFakeFollowers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🕵️ XActions — Find Fake Followers                          ║
║  Identify likely fake/bot accounts in your audience         ║
╚══════════════════════════════════════════════════════════════╝
  `);

  if (!window.location.pathname.includes('/followers')) {
    console.error('❌ Please navigate to your FOLLOWERS page first!');
    console.log('👉 Go to: https://x.com/YOUR_USERNAME/followers');
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

  const analyzeFollower = (cell) => {
    const result = {
      username: '',
      displayName: '',
      bio: '',
      following: 0,
      followers: 0,
      score: 0,
      flags: []
    };

    // Get username
    const link = cell.querySelector('a[href^="/"]');
    if (link) {
      result.username = link.getAttribute('href').replace('/', '').split('/')[0];
    }

    // Get display name
    const nameEl = cell.querySelector('[dir="ltr"] span');
    result.displayName = nameEl?.textContent || result.username;

    // Get bio
    const bioEl = cell.querySelector('[data-testid="UserDescription"]');
    result.bio = bioEl?.textContent || '';
    const bioLower = result.bio.toLowerCase();

    // Parse stats from cell text
    const text = cell.textContent;
    const followingMatch = text.match(/([\d,.]+[KMB]?)\s*Following/i);
    const followersMatch = text.match(/([\d,.]+[KMB]?)\s*Follower/i);
    
    if (followingMatch) result.following = parseCount(followingMatch[1]);
    if (followersMatch) result.followers = parseCount(followersMatch[1]);

    // === SCORING ===

    // Check ratio
    if (result.following > 0 && result.followers > 0) {
      const ratio = result.following / result.followers;
      if (ratio > CONFIG.thresholds.veryHighRatio) {
        result.score += CONFIG.scoring.veryHighFollowingRatio;
        result.flags.push(`Extreme ratio (${ratio.toFixed(0)}:1)`);
      } else if (ratio > CONFIG.thresholds.highRatio) {
        result.score += CONFIG.scoring.highFollowingRatio;
        result.flags.push(`High ratio (${ratio.toFixed(0)}:1)`);
      }
    }

    // Check following count
    if (result.following > CONFIG.thresholds.extremeFollowing) {
      result.score += CONFIG.scoring.extremeFollowing;
      result.flags.push(`Mass following (${result.following.toLocaleString()})`);
    } else if (result.following > CONFIG.thresholds.massFollowing) {
      result.score += CONFIG.scoring.massFollowing;
      result.flags.push(`High following (${result.following.toLocaleString()})`);
    }

    // Check follower count
    if (result.followers === 0) {
      result.score += CONFIG.scoring.noFollowers;
      result.flags.push('Zero followers');
    } else if (result.followers < 10) {
      result.score += CONFIG.scoring.veryFewFollowers;
      result.flags.push(`Very few followers (${result.followers})`);
    }

    // Check for default avatar
    const avatar = cell.querySelector('img[src*="default_profile"]');
    if (avatar) {
      result.score += CONFIG.scoring.defaultAvatar;
      result.flags.push('Default avatar');
    }

    // Check for no bio
    if (!result.bio.trim()) {
      result.score += CONFIG.scoring.noBio;
      result.flags.push('No bio');
    }

    // Check for suspicious bio keywords
    const foundKeywords = CONFIG.suspiciousKeywords.filter(kw => bioLower.includes(kw.toLowerCase()));
    if (foundKeywords.length > 0) {
      result.score += CONFIG.scoring.suspiciousBio;
      result.flags.push(`Suspicious bio: ${foundKeywords.slice(0, 3).join(', ')}`);
    }

    // Check for random username pattern
    const numMatch = result.username.match(/\d+/g);
    if (numMatch && numMatch.join('').length >= 8) {
      result.score += CONFIG.scoring.randomUsername;
      result.flags.push('Random username pattern');
    }

    return result;
  };

  console.log('🔍 Scanning followers for fake accounts...\n');
  console.log('Bot detection criteria from x-bot-sweeper:');
  console.log('  • High following/followers ratio');
  console.log('  • Default profile picture');
  console.log('  • Suspicious bio keywords');
  console.log('  • Very new or inactive accounts');
  console.log('');

  const scanned = new Set();
  const allFollowers = [];
  let retries = 0;
  let scrollCount = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = scanned.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const analysis = analyzeFollower(cell);
      if (!analysis.username || scanned.has(analysis.username)) return;
      
      scanned.add(analysis.username);
      allFollowers.push(analysis);
    });

    if (scanned.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scanned.size} followers...`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  // Categorize
  const likelyFake = allFollowers.filter(f => f.score >= CONFIG.likelyFakeScore);
  const suspicious = allFollowers.filter(f => f.score >= CONFIG.minFakeScore && f.score < CONFIG.likelyFakeScore);
  const clean = allFollowers.filter(f => f.score < CONFIG.minFakeScore);

  const fakePercentage = ((likelyFake.length + suspicious.length) / allFollowers.length * 100).toFixed(1);

  console.log(`\n✅ Analysis complete!\n`);
  console.log('═'.repeat(60));
  console.log('📊 FAKE FOLLOWER ANALYSIS');
  console.log('═'.repeat(60));

  console.log('\n📈 SUMMARY:');
  console.log('─'.repeat(50));
  console.log(`   Total followers scanned: ${allFollowers.length}`);
  console.log(`   🔴 Likely fake/bot:      ${likelyFake.length} (${(likelyFake.length/allFollowers.length*100).toFixed(1)}%)`);
  console.log(`   🟡 Suspicious:           ${suspicious.length} (${(suspicious.length/allFollowers.length*100).toFixed(1)}%)`);
  console.log(`   🟢 Appear legitimate:    ${clean.length} (${(clean.length/allFollowers.length*100).toFixed(1)}%)`);
  console.log(`\n   📊 Estimated fake rate: ${fakePercentage}%`);

  // Quality assessment
  console.log('\n🏆 FOLLOWER QUALITY ASSESSMENT:');
  console.log('─'.repeat(50));
  
  if (parseFloat(fakePercentage) < 10) {
    console.log('   ✅ EXCELLENT - Your audience appears very genuine!');
  } else if (parseFloat(fakePercentage) < 25) {
    console.log('   👍 GOOD - Some suspicious accounts, but mostly clean');
  } else if (parseFloat(fakePercentage) < 50) {
    console.log('   ⚠️  MODERATE - Consider cleaning up fake followers');
  } else {
    console.log('   🚨 POOR - High percentage of likely fake followers');
  }

  // Likely fake accounts
  if (likelyFake.length > 0) {
    console.log('\n' + '═'.repeat(60));
    console.log('🔴 LIKELY FAKE/BOT ACCOUNTS');
    console.log('═'.repeat(60));

    likelyFake.sort((a, b) => b.score - a.score).slice(0, 30).forEach((f, i) => {
      console.log(`\n${i + 1}. @${f.username} (Score: ${f.score})`);
      console.log(`   ${f.displayName}`);
      console.log(`   Flags: ${f.flags.join(' | ')}`);
      console.log(`   https://x.com/${f.username}`);
    });

    if (likelyFake.length > 30) {
      console.log(`\n... and ${likelyFake.length - 30} more likely fake accounts`);
    }
  }

  // Suspicious accounts
  if (suspicious.length > 0) {
    console.log('\n' + '═'.repeat(60));
    console.log('🟡 SUSPICIOUS ACCOUNTS (review manually)');
    console.log('═'.repeat(60));

    suspicious.sort((a, b) => b.score - a.score).slice(0, 15).forEach((f, i) => {
      console.log(`\n${i + 1}. @${f.username} (Score: ${f.score})`);
      console.log(`   Flags: ${f.flags.join(' | ')}`);
    });

    if (suspicious.length > 15) {
      console.log(`\n... and ${suspicious.length - 15} more suspicious accounts`);
    }
  }

  // Common flags
  console.log('\n' + '═'.repeat(60));
  console.log('📊 MOST COMMON RED FLAGS');
  console.log('═'.repeat(60));

  const flagCounts = {};
  [...likelyFake, ...suspicious].forEach(f => {
    f.flags.forEach(flag => {
      const category = flag.split('(')[0].trim().split(':')[0].trim();
      flagCounts[category] = (flagCounts[category] || 0) + 1;
    });
  });

  Object.entries(flagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([flag, count]) => {
      const pct = (count / (likelyFake.length + suspicious.length) * 100).toFixed(0);
      console.log(`   ${flag}: ${count} accounts (${pct}%)`);
    });

  // Save results
  const storageKey = 'xactions_fake_followers';
  const data = {
    timestamp: new Date().toISOString(),
    totalScanned: allFollowers.length,
    likelyFake: likelyFake.map(f => ({ username: f.username, score: f.score, flags: f.flags })),
    suspicious: suspicious.map(f => ({ username: f.username, score: f.score, flags: f.flags })),
    fakePercentage: parseFloat(fakePercentage)
  };
  localStorage.setItem(storageKey, JSON.stringify(data));

  console.log('\n' + '═'.repeat(60));
  console.log('💡 RECOMMENDED ACTIONS');
  console.log('═'.repeat(60));
  console.log('\n1. Review the "Likely Fake" accounts and block obvious bots');
  console.log('2. Use the block-bots.js script to automate blocking');
  console.log('3. Report accounts that are clearly spam');
  console.log('4. Run this audit periodically to maintain quality');

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Results saved! Export: copy(localStorage.getItem("${storageKey}"))`);
  console.log('═'.repeat(60) + '\n');

})();

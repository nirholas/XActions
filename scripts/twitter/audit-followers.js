/**
 * ============================================================
 * 🔍 Audit Followers
 * ============================================================
 * 
 * @name        audit-followers.js
 * @description Full comprehensive audit of follower quality
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
 * 4. Performs a comprehensive audit of follower quality
 * 
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {
  // Scroll settings
  scrollDelay: 1500,
  maxScrolls: 100,
  maxRetries: 5,
  
  // Analysis thresholds
  thresholds: {
    // Ratio categories
    influencer: 10,        // Followers 10x+ following = influencer
    balanced: 0.5,         // Ratio between 0.5 and 2 = balanced
    aggressive: 0.1,       // Ratio below 0.1 = aggressive follower
    
    // Following counts
    massFollower: 2000,    // Following 2000+
    selectiveFollower: 100 // Following less than 100
  }
};

/**
 * ============================================================
 * 🚀 SCRIPT START
 * ============================================================
 */

(async function auditFollowers() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  🔍 XActions — Audit Followers                               ║
║  Comprehensive follower quality analysis                     ║
╚══════════════════════════════════════════════════════════════╝
  `);

  if (!window.location.pathname.includes('/followers')) {
    console.error('❌ Please navigate to your FOLLOWERS page first!');
    console.log('👉 Go to: https://x.com/YOUR_USERNAME/followers');
    return;
  }

  const username = window.location.pathname.split('/')[1];
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

  console.log(`🔍 Auditing followers for @${username}\n`);
  console.log('⏳ This may take a while for large accounts...\n');

  const followers = [];
  const scanned = new Set();
  let retries = 0;
  let scrollCount = 0;

  while (scrollCount < CONFIG.maxScrolls && retries < CONFIG.maxRetries) {
    const prevSize = scanned.size;

    document.querySelectorAll($userCell).forEach(cell => {
      const link = cell.querySelector('a[href^="/"]');
      const user = link?.getAttribute('href')?.replace('/', '')?.split('/')[0];
      if (!user || scanned.has(user)) return;

      scanned.add(user);

      // Get display name
      const nameEl = cell.querySelector('[dir="ltr"] span');
      const displayName = nameEl?.textContent || user;

      // Get bio
      const bioEl = cell.querySelector('[data-testid="UserDescription"]');
      const bio = bioEl?.textContent || '';

      // Parse stats
      const text = cell.textContent;
      const followingMatch = text.match(/([\d,.]+[KMB]?)\s*Following/i);
      const followersMatch = text.match(/([\d,.]+[KMB]?)\s*Follower/i);
      
      const following = followingMatch ? parseCount(followingMatch[1]) : 0;
      const followerCount = followersMatch ? parseCount(followersMatch[1]) : 0;

      // Check for verified
      const verified = cell.querySelector('svg[aria-label*="Verified"]') !== null;

      // Check for default avatar
      const defaultAvatar = cell.querySelector('img[src*="default_profile"]') !== null;

      followers.push({
        username: user,
        displayName,
        bio,
        following,
        followers: followerCount,
        ratio: followerCount > 0 ? following / followerCount : Infinity,
        verified,
        defaultAvatar,
        hasBio: bio.length > 0
      });
    });

    if (scanned.size === prevSize) retries++;
    else retries = 0;

    console.log(`   Scanned: ${scanned.size} followers...`);

    window.scrollTo(0, document.body.scrollHeight);
    await sleep(CONFIG.scrollDelay);
    scrollCount++;
  }

  if (followers.length === 0) {
    console.error('❌ No followers found!');
    return;
  }

  console.log(`\n✅ Audit complete! Analyzed ${followers.length} followers\n`);

  // === ANALYSIS ===

  // Categorize by type
  const categories = {
    influencers: followers.filter(f => f.followers > 0 && f.followers / (f.following || 1) >= CONFIG.thresholds.influencer),
    balanced: followers.filter(f => {
      const ratio = (f.followers || 1) / (f.following || 1);
      return ratio >= CONFIG.thresholds.balanced && ratio < CONFIG.thresholds.influencer;
    }),
    aggressiveFollowers: followers.filter(f => f.following > CONFIG.thresholds.massFollower),
    verified: followers.filter(f => f.verified),
    defaultAvatars: followers.filter(f => f.defaultAvatar),
    noBio: followers.filter(f => !f.hasBio),
    zeroFollowers: followers.filter(f => f.followers === 0),
    highQuality: followers.filter(f => f.followers >= 1000 && f.hasBio && !f.defaultAvatar)
  };

  // Calculate averages
  const avgFollowing = followers.reduce((sum, f) => sum + f.following, 0) / followers.length;
  const avgFollowers = followers.reduce((sum, f) => sum + f.followers, 0) / followers.length;
  const totalReach = followers.reduce((sum, f) => sum + f.followers, 0);

  const formatNum = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Math.round(n).toString();
  };

  // Output
  console.log('═'.repeat(60));
  console.log(`📊 FOLLOWER AUDIT REPORT: @${username}`);
  console.log('═'.repeat(60));

  console.log('\n📈 OVERVIEW:');
  console.log('─'.repeat(50));
  console.log(`   Total followers analyzed: ${followers.length.toLocaleString()}`);
  console.log(`   Total audience reach:     ${formatNum(totalReach)}`);
  console.log(`   Average following:        ${formatNum(avgFollowing)}`);
  console.log(`   Average followers:        ${formatNum(avgFollowers)}`);

  console.log('\n👥 FOLLOWER COMPOSITION:');
  console.log('─'.repeat(50));
  console.log(`   ⭐ Verified accounts:     ${categories.verified.length} (${(categories.verified.length/followers.length*100).toFixed(1)}%)`);
  console.log(`   🌟 Influencers (10:1+):   ${categories.influencers.length} (${(categories.influencers.length/followers.length*100).toFixed(1)}%)`);
  console.log(`   💎 High-quality:          ${categories.highQuality.length} (${(categories.highQuality.length/followers.length*100).toFixed(1)}%)`);
  console.log(`   ⚖️  Balanced accounts:     ${categories.balanced.length} (${(categories.balanced.length/followers.length*100).toFixed(1)}%)`);
  console.log(`   🔄 Aggressive followers:  ${categories.aggressiveFollowers.length} (${(categories.aggressiveFollowers.length/followers.length*100).toFixed(1)}%)`);

  console.log('\n⚠️  RED FLAGS:');
  console.log('─'.repeat(50));
  console.log(`   🖼️  Default avatars:       ${categories.defaultAvatars.length} (${(categories.defaultAvatars.length/followers.length*100).toFixed(1)}%)`);
  console.log(`   📝 No bio:                ${categories.noBio.length} (${(categories.noBio.length/followers.length*100).toFixed(1)}%)`);
  console.log(`   👻 Zero followers:        ${categories.zeroFollowers.length} (${(categories.zeroFollowers.length/followers.length*100).toFixed(1)}%)`);

  // Quality Score
  const qualityScore = Math.round(
    (categories.highQuality.length * 3 + 
     categories.influencers.length * 2 + 
     categories.verified.length * 5 +
     categories.balanced.length * 1) /
    (followers.length * 3) * 100
  );

  console.log('\n🏆 QUALITY SCORE:');
  console.log('─'.repeat(50));
  const scoreBar = '█'.repeat(Math.round(qualityScore / 5)) + '░'.repeat(20 - Math.round(qualityScore / 5));
  console.log(`   [${scoreBar}] ${qualityScore}/100`);
  
  if (qualityScore >= 80) console.log('   🏆 EXCELLENT - Premium quality audience!');
  else if (qualityScore >= 60) console.log('   👍 GOOD - Solid audience quality');
  else if (qualityScore >= 40) console.log('   ⚠️  MODERATE - Room for improvement');
  else console.log('   🚨 POOR - Consider audience cleanup');

  // Top followers by reach
  if (categories.influencers.length > 0) {
    console.log('\n' + '═'.repeat(60));
    console.log('🌟 YOUR TOP INFLUENTIAL FOLLOWERS');
    console.log('═'.repeat(60));

    const topInfluencers = categories.influencers
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 15);

    topInfluencers.forEach((f, i) => {
      const badge = f.verified ? ' ✓' : '';
      console.log(`\n${i + 1}. ${f.displayName}${badge} (@${f.username})`);
      console.log(`   ${formatNum(f.followers)} followers | ${formatNum(f.following)} following`);
      if (f.bio) console.log(`   "${f.bio.slice(0, 60)}${f.bio.length > 60 ? '...' : ''}"`);
    });
  }

  // Verified followers
  if (categories.verified.length > 0) {
    console.log('\n' + '═'.repeat(60));
    console.log('⭐ VERIFIED FOLLOWERS');
    console.log('═'.repeat(60));

    categories.verified.slice(0, 20).forEach((f, i) => {
      console.log(`   ${i + 1}. @${f.username} — ${formatNum(f.followers)} followers`);
    });
  }

  // Bio keyword analysis
  console.log('\n' + '═'.repeat(60));
  console.log('🏷️  AUDIENCE INTERESTS (Bio Keywords)');
  console.log('═'.repeat(60));

  const keywords = {};
  const interestCategories = {
    tech: ['developer', 'engineer', 'programmer', 'tech', 'software', 'coding', 'ai', 'data'],
    crypto: ['crypto', 'bitcoin', 'btc', 'eth', 'nft', 'web3', 'defi', 'blockchain'],
    business: ['founder', 'ceo', 'entrepreneur', 'startup', 'investor', 'business'],
    marketing: ['marketing', 'growth', 'social media', 'brand', 'digital'],
    creative: ['creator', 'artist', 'designer', 'writer', 'photographer', 'content'],
    finance: ['finance', 'trading', 'forex', 'investment', 'stocks']
  };

  followers.forEach(f => {
    const bioLower = f.bio.toLowerCase();
    Object.entries(interestCategories).forEach(([category, words]) => {
      if (words.some(w => bioLower.includes(w))) {
        keywords[category] = (keywords[category] || 0) + 1;
      }
    });
  });

  const sortedInterests = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1]);

  if (sortedInterests.length > 0) {
    const maxCount = sortedInterests[0][1];
    sortedInterests.forEach(([category, count]) => {
      const bar = '█'.repeat(Math.round(count / maxCount * 20));
      const pct = (count / followers.length * 100).toFixed(1);
      console.log(`   ${category.padEnd(12)} ${bar.padEnd(20)} ${count} (${pct}%)`);
    });
  } else {
    console.log('   Not enough bio data to analyze interests');
  }

  // Save audit results
  const storageKey = `xactions_audit_${username}`;
  const data = {
    username,
    timestamp: new Date().toISOString(),
    totalFollowers: followers.length,
    qualityScore,
    totalReach,
    composition: {
      verified: categories.verified.length,
      influencers: categories.influencers.length,
      highQuality: categories.highQuality.length,
      defaultAvatars: categories.defaultAvatars.length,
      noBio: categories.noBio.length,
      zeroFollowers: categories.zeroFollowers.length
    },
    interests: Object.fromEntries(sortedInterests),
    topInfluencers: categories.influencers
      .sort((a, b) => b.followers - a.followers)
      .slice(0, 50)
      .map(f => ({ username: f.username, followers: f.followers, verified: f.verified }))
  };
  localStorage.setItem(storageKey, JSON.stringify(data));

  // Historical comparison
  console.log('\n' + '═'.repeat(60));
  console.log('💾 AUDIT SAVED');
  console.log('═'.repeat(60));
  console.log(`\n   Run this audit periodically to track audience quality.`);
  console.log(`   Export: copy(localStorage.getItem("${storageKey}"))`);

  console.log('\n' + '═'.repeat(60));
  console.log('💡 RECOMMENDATIONS');
  console.log('═'.repeat(60));

  if (categories.defaultAvatars.length / followers.length > 0.2) {
    console.log('\n⚠️  High number of default avatars - consider removing bots');
  }
  if (categories.zeroFollowers.length / followers.length > 0.1) {
    console.log('\n⚠️  Many followers have 0 followers - possible fake accounts');
  }
  if (categories.influencers.length > 0) {
    console.log(`\n✅ You have ${categories.influencers.length} influencer followers - engage with them!`);
  }
  if (categories.verified.length > 0) {
    console.log(`\n✅ You have ${categories.verified.length} verified followers - great credibility!`);
  }

  console.log('\n' + '═'.repeat(60) + '\n');

})();

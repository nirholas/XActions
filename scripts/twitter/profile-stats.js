/**
 * ============================================================
 * 📊 Profile Stats
 * ============================================================
 * 
 * @name        profile-stats.js
 * @description Get comprehensive profile statistics
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-01-26
 * @repository  https://github.com/nirholas/XActions
 * 
 * ============================================================
 * 📋 USAGE INSTRUCTIONS:
 * 
 * 1. Go to any profile page: https://x.com/USERNAME
 * 2. Open Chrome DevTools (F12 or Cmd+Option+I)
 * 3. Paste this script and press Enter
 * 4. Gets comprehensive profile statistics
 * 
 * ============================================================
 */

(async function profileStats() {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📊 XActions — Profile Stats                                 ║
║  Get comprehensive profile statistics                        ║
╚══════════════════════════════════════════════════════════════╝
  `);

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (match) {
      let num = parseFloat(match[1]);
      const multipliers = { 'K': 1000, 'M': 1000000, 'B': 1000000000 };
      if (match[2]) num *= multipliers[match[2].toUpperCase()];
      return Math.round(num);
    }
    return 0;
  };

  const formatNum = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
    return n.toString();
  };

  const username = window.location.pathname.match(/^\/([^\/]+)/)?.[1];
  if (!username || ['home', 'explore', 'notifications', 'messages', 'i'].includes(username)) {
    console.error('❌ Please navigate to a profile page first!');
    return;
  }

  console.log(`📊 Gathering stats for @${username}...\n`);

  // Gather profile information
  const stats = {
    username,
    timestamp: new Date().toISOString(),
    displayName: '',
    bio: '',
    location: '',
    website: '',
    joinDate: '',
    followers: 0,
    following: 0,
    verified: false,
    profileImage: '',
    bannerImage: ''
  };

  // Display name
  const nameEl = document.querySelector('[data-testid="UserName"]');
  if (nameEl) {
    const nameParts = nameEl.textContent.split('@');
    stats.displayName = nameParts[0].trim();
  }

  // Bio
  const bioEl = document.querySelector('[data-testid="UserDescription"]');
  stats.bio = bioEl?.textContent || '';

  // Location
  const locationEl = document.querySelector('[data-testid="UserLocation"]');
  stats.location = locationEl?.textContent || '';

  // Website
  const urlEl = document.querySelector('[data-testid="UserUrl"] a');
  stats.website = urlEl?.getAttribute('href') || urlEl?.textContent || '';

  // Join date
  const joinEl = document.querySelector('[data-testid="UserJoinDate"]');
  stats.joinDate = joinEl?.textContent || '';

  // Followers/Following
  document.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href') || '';
    const text = link.textContent || '';
    
    if (href.includes('/followers') || href.includes('/verified_followers')) {
      const match = text.match(/([\d,.]+[KMB]?)/);
      if (match) stats.followers = parseCount(match[1]);
    }
    if (href.endsWith('/following')) {
      const match = text.match(/([\d,.]+[KMB]?)/);
      if (match) stats.following = parseCount(match[1]);
    }
  });

  // Verified status
  const verifiedBadge = document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"], [data-testid="UserName"] svg[aria-label*="verified"]');
  stats.verified = verifiedBadge !== null;

  // Profile image
  const profileImg = document.querySelector('a[href$="/photo"] img');
  stats.profileImage = profileImg?.src || '';
  stats.hasDefaultAvatar = stats.profileImage.includes('default_profile');

  // Banner image
  const bannerImg = document.querySelector('a[href$="/header_photo"] img');
  stats.bannerImage = bannerImg?.src || '';
  stats.hasBanner = !!stats.bannerImage;

  // Calculate derived stats
  stats.ratio = stats.following > 0 ? (stats.followers / stats.following).toFixed(2) : 'N/A';

  // Account age (approximate)
  if (stats.joinDate) {
    const joinMatch = stats.joinDate.match(/Joined\s+(\w+)\s+(\d{4})/);
    if (joinMatch) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthIndex = monthNames.findIndex(m => m.startsWith(joinMatch[1]));
      if (monthIndex >= 0) {
        const joinDate = new Date(parseInt(joinMatch[2]), monthIndex, 1);
        const now = new Date();
        const years = (now - joinDate) / (1000 * 60 * 60 * 24 * 365);
        stats.accountAgeYears = years.toFixed(1);
      }
    }
  }

  // Output
  console.log('═'.repeat(60));
  console.log(`📊 PROFILE STATISTICS: @${username}`);
  console.log('═'.repeat(60));

  console.log('\n👤 BASIC INFO:');
  console.log('─'.repeat(50));
  console.log(`   Display Name: ${stats.displayName}`);
  console.log(`   Username:     @${stats.username}`);
  console.log(`   Verified:     ${stats.verified ? '✅ Yes' : '❌ No'}`);
  
  if (stats.bio) {
    console.log(`\n   Bio:`);
    stats.bio.split('\n').forEach(line => {
      console.log(`   "${line}"`);
    });
  }

  if (stats.location) console.log(`\n   📍 Location: ${stats.location}`);
  if (stats.website) console.log(`   🔗 Website:  ${stats.website}`);
  if (stats.joinDate) console.log(`   📅 ${stats.joinDate}`);
  if (stats.accountAgeYears) console.log(`   ⏰ Account Age: ${stats.accountAgeYears} years`);

  console.log('\n📊 METRICS:');
  console.log('─'.repeat(50));
  console.log(`   Followers:  ${formatNum(stats.followers)}`);
  console.log(`   Following:  ${formatNum(stats.following)}`);
  console.log(`   Ratio:      ${stats.ratio} (followers/following)`);

  // Quality indicators
  console.log('\n🔍 PROFILE QUALITY INDICATORS:');
  console.log('─'.repeat(50));
  
  const indicators = [];
  
  if (stats.verified) indicators.push('✅ Verified account');
  else indicators.push('⬜ Not verified');
  
  if (!stats.hasDefaultAvatar) indicators.push('✅ Custom profile picture');
  else indicators.push('⚠️  Default profile picture');
  
  if (stats.hasBanner) indicators.push('✅ Has banner image');
  else indicators.push('⬜ No banner image');
  
  if (stats.bio && stats.bio.length > 50) indicators.push('✅ Detailed bio');
  else if (stats.bio) indicators.push('⚠️  Short bio');
  else indicators.push('❌ No bio');
  
  if (stats.website) indicators.push('✅ Has website link');
  else indicators.push('⬜ No website');
  
  if (stats.location) indicators.push('✅ Location set');
  else indicators.push('⬜ No location');

  const ratio = parseFloat(stats.ratio) || 0;
  if (ratio > 1) indicators.push(`✅ Good follower ratio (${ratio})`);
  else if (ratio > 0.5) indicators.push(`⚠️  Low follower ratio (${ratio})`);
  else if (ratio > 0) indicators.push(`❌ Very low ratio (${ratio})`);

  if (stats.accountAgeYears > 2) indicators.push(`✅ Established account (${stats.accountAgeYears} years)`);
  else if (stats.accountAgeYears > 0.5) indicators.push(`⬜ Newer account (${stats.accountAgeYears} years)`);
  else if (stats.accountAgeYears) indicators.push(`⚠️  Very new account (${stats.accountAgeYears} years)`);

  indicators.forEach(ind => console.log(`   ${ind}`));

  // Score calculation
  let score = 0;
  if (stats.verified) score += 20;
  if (!stats.hasDefaultAvatar) score += 15;
  if (stats.hasBanner) score += 10;
  if (stats.bio && stats.bio.length > 50) score += 15;
  else if (stats.bio) score += 5;
  if (stats.website) score += 10;
  if (stats.location) score += 5;
  if (ratio > 1) score += 15;
  else if (ratio > 0.5) score += 5;
  if (stats.accountAgeYears > 2) score += 10;
  else if (stats.accountAgeYears > 0.5) score += 5;

  console.log('\n📈 PROFILE COMPLETENESS SCORE:');
  console.log('─'.repeat(50));
  const scoreBar = '█'.repeat(Math.round(score / 5)) + '░'.repeat(20 - Math.round(score / 5));
  console.log(`   [${scoreBar}] ${score}/100`);

  if (score >= 80) console.log('   🏆 Excellent profile!');
  else if (score >= 60) console.log('   👍 Good profile');
  else if (score >= 40) console.log('   ⚠️  Profile needs improvement');
  else console.log('   ❌ Incomplete profile');

  // Bio analysis
  if (stats.bio) {
    console.log('\n📝 BIO ANALYSIS:');
    console.log('─'.repeat(50));
    console.log(`   Length: ${stats.bio.length} characters`);
    
    // Check for keywords
    const bioLower = stats.bio.toLowerCase();
    const keywords = {
      'crypto': ['crypto', 'bitcoin', 'btc', 'eth', 'nft', 'defi', 'web3', 'blockchain'],
      'tech': ['developer', 'engineer', 'programmer', 'coder', 'tech', 'ai', 'software'],
      'marketing': ['marketing', 'growth', 'seo', 'social media', 'brand'],
      'creator': ['creator', 'content', 'youtuber', 'podcaster', 'writer'],
      'business': ['founder', 'ceo', 'entrepreneur', 'startup', 'investor']
    };
    
    const foundCategories = [];
    Object.entries(keywords).forEach(([category, words]) => {
      if (words.some(w => bioLower.includes(w))) {
        foundCategories.push(category);
      }
    });
    
    if (foundCategories.length > 0) {
      console.log(`   Categories: ${foundCategories.join(', ')}`);
    }

    // Links in bio
    const links = stats.bio.match(/https?:\/\/\S+/g) || [];
    if (links.length > 0) {
      console.log(`   Links found: ${links.length}`);
    }

    // Hashtags in bio
    const hashtags = stats.bio.match(/#\w+/g) || [];
    if (hashtags.length > 0) {
      console.log(`   Hashtags: ${hashtags.join(' ')}`);
    }
  }

  // Save to localStorage
  const storageKey = `xactions_profile_${username}`;
  const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
  history.push(stats);
  // Keep last 30 snapshots
  const trimmedHistory = history.slice(-30);
  localStorage.setItem(storageKey, JSON.stringify(trimmedHistory));

  // Show historical comparison if available
  if (history.length > 1) {
    const oldest = history[0];
    const followerChange = stats.followers - oldest.followers;
    const daysDiff = (new Date(stats.timestamp) - new Date(oldest.timestamp)) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 0) {
      console.log('\n📈 HISTORICAL COMPARISON:');
      console.log('─'.repeat(50));
      console.log(`   Tracking since: ${new Date(oldest.timestamp).toLocaleDateString()}`);
      console.log(`   Follower change: ${followerChange >= 0 ? '+' : ''}${formatNum(followerChange)}`);
      console.log(`   Daily average: ${(followerChange / daysDiff).toFixed(1)} followers/day`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(`💾 Snapshot saved (${trimmedHistory.length} total)`);
  console.log(`📥 Export: copy(localStorage.getItem("${storageKey}"))`);
  console.log('═'.repeat(60) + '\n');

  // Return stats object for programmatic use
  return stats;

})();

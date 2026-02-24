// scripts/profileManager.js
// Browser console script for scraping profile data from any X/Twitter profile page
// Paste in DevTools console on x.com/USERNAME
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    exportResults: true,      // Download profile data as JSON
  };
  // =============================================

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const parseCount = (text) => {
    if (!text) return 0;
    const clean = text.replace(/,/g, '').trim();
    const num = parseFloat(clean);
    if (clean.includes('K')) return Math.round(num * 1000);
    if (clean.includes('M')) return Math.round(num * 1000000);
    return isNaN(num) ? 0 : num;
  };

  const run = async () => {
    console.log('👤 PROFILE MANAGER — XActions by nichxbt');
    console.log('━'.repeat(45));

    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]+)/);
    const username = pathMatch ? pathMatch[1] : null;

    if (!username || ['home', 'explore', 'notifications', 'messages', 'i', 'settings', 'search'].includes(username)) {
      console.error('❌ Navigate to a profile page first! (x.com/USERNAME)');
      return;
    }

    console.log(`🔍 Scraping profile: @${username}\n`);
    await sleep(1000);

    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;

    // Display name
    const nameEl = document.querySelector('[data-testid="UserName"]');
    const displayName = nameEl?.querySelector('span')?.textContent?.trim() || null;
    console.log(`   📛 Name: ${displayName || '—'}`);

    // Bio
    const bio = getText('[data-testid="UserDescription"]');
    console.log(`   📝 Bio: ${bio ? bio.substring(0, 60) + (bio.length > 60 ? '...' : '') : '—'}`);

    // Location
    const location = getText('[data-testid="UserLocation"]');
    console.log(`   📍 Location: ${location || '—'}`);

    // Website
    const website = getText('[data-testid="UserUrl"]');
    console.log(`   🔗 Website: ${website || '—'}`);

    // Join date
    const joinDate = getText('[data-testid="UserJoinDate"]');
    console.log(`   📅 Joined: ${joinDate || '—'}`);

    // Verified status
    const isVerified = !!document.querySelector('[data-testid="icon-verified"]');
    console.log(`   ✅ Verified: ${isVerified ? 'Yes' : 'No'}`);

    // Follower / Following counts
    const followerEl = document.querySelector('a[href$="/followers"] span');
    const followingEl = document.querySelector('a[href$="/following"] span');
    const followers = followerEl?.textContent?.trim() || '0';
    const following = followingEl?.textContent?.trim() || '0';
    console.log(`   👥 Followers: ${followers}`);
    console.log(`   👣 Following: ${following}`);

    // Avatar
    const avatarUrl = document.querySelector('[data-testid="UserAvatar-Container"] img')?.src || null;

    const profile = {
      username,
      displayName,
      bio,
      location,
      website,
      joinDate,
      isVerified,
      followers: parseCount(followers),
      followersRaw: followers,
      following: parseCount(following),
      followingRaw: following,
      avatarUrl,
      scrapedAt: new Date().toISOString(),
      url: window.location.href,
    };

    console.log('\n' + '━'.repeat(45));
    console.log('✅ Profile data scraped successfully!');

    if (CONFIG.exportResults) {
      download(profile, `profile-${username}-${new Date().toISOString().slice(0, 10)}.json`);
      console.log('📥 Profile exported as JSON');
    }

    console.log('\n💡 Access data: copy(JSON.parse(JSON.stringify(profile)))');
    console.log('');

    // Store in window for easy access
    window.__xactions_profile = profile;
    return profile;
  };

  run();
})();

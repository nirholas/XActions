// scripts/newFollowersAlert.js
// Browser console script for detecting new followers on X/Twitter
// Paste in DevTools console on x.com/USERNAME/followers
// by nichxbt

(() => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // =============================================
  // CONFIGURATION
  // =============================================
  const CONFIG = {
    maxFollowers: 5000,   // Max followers to scan
    scrollDelay: 1500,    // ms between scrolls
    maxRetries: 5,        // Empty scrolls before stopping
  };
  // =============================================

  const STORAGE_KEY = 'xactions_new_followers';

  const run = async () => {
    console.log('🎉 NEW FOLLOWERS ALERT — by nichxbt');

    if (!window.location.pathname.includes('/followers')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/followers first!');
      return;
    }

    const username = window.location.pathname.split('/')[1];
    console.log(`👤 Tracking @${username}\n`);

    // Scrape current followers
    const followers = new Map();
    let prevSize = 0, retries = 0;

    console.log('📜 Scanning followers...');

    while (retries < CONFIG.maxRetries && followers.size < CONFIG.maxFollowers) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);

      for (const cell of document.querySelectorAll('[data-testid="UserCell"]')) {
        const link = cell.querySelector('a[href^="/"]');
        if (!link) continue;
        const user = link.getAttribute('href').replace('/', '').split('/')[0].toLowerCase();
        if (!user || user === username.toLowerCase()) continue;
        if (followers.has(user)) continue;

        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const displayName = nameEl?.textContent || user;
        followers.set(user, displayName);
      }

      console.log(`   Found ${followers.size} followers...`);
      if (followers.size === prevSize) retries++;
      else { retries = 0; prevSize = followers.size; }
    }

    console.log(`\n✅ Total: ${followers.size} followers\n`);

    // Load previous snapshot
    let previous = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) previous = JSON.parse(raw);
    } catch {}

    if (previous && previous.username.toLowerCase() === username.toLowerCase()) {
      const prevUsers = new Set(Object.keys(previous.followers));
      const newFollowers = [];

      followers.forEach((displayName, user) => {
        if (!prevUsers.has(user)) newFollowers.push({ user, displayName });
      });

      const currentUsers = new Set(followers.keys());
      const lostFollowers = Object.keys(previous.followers).filter(u => !currentUsers.has(u));

      console.log(`📊 Comparing with snapshot from ${new Date(previous.timestamp).toLocaleString()}`);
      console.log(`   Previous: ${previous.count} | Current: ${followers.size}`);
      console.log(`   Net change: ${followers.size - previous.count > 0 ? '+' : ''}${followers.size - previous.count}\n`);

      if (newFollowers.length > 0) {
        console.log(`🎉 ${newFollowers.length} NEW FOLLOWERS:\n`);
        newFollowers.forEach((f, i) => {
          console.log(`   ${i + 1}. ${f.displayName} (@${f.user})`);
          console.log(`      https://x.com/${f.user}`);
        });
      } else {
        console.log('📭 No new followers since last check.');
      }

      if (lostFollowers.length > 0) {
        console.log(`\n👋 ${lostFollowers.length} people unfollowed you:`);
        lostFollowers.forEach(u => console.log(`   @${u}`));
      }
    } else {
      console.log('📸 First scan! Saving snapshot...');
      console.log('   Run this script again later to see new followers!');
    }

    // Save snapshot
    const snapshot = {
      username,
      followers: Object.fromEntries(followers),
      timestamp: new Date().toISOString(),
      count: followers.size,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    console.log(`\n💾 Snapshot saved. Run again anytime to track changes!\n`);
  };

  run();
})();

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// scripts/detectUnfollowers.js
// Browser console script for detecting who unfollowed you on X/Twitter
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

  const STORAGE_KEY = 'xactions_followers';

  const download = (data, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.log(`📥 Downloaded: ${filename}`);
  };

  const run = async () => {
    console.log('🔍 DETECT UNFOLLOWERS — by nichxbt');

    if (!window.location.pathname.includes('/followers')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/followers first!');
      console.log('👉 Go to: https://x.com/YOUR_USERNAME/followers');
      return;
    }

    const username = (window.location.pathname.match(/^\/([^/]+)\/followers/) || [])[1] || 'unknown';
    console.log(`👤 Monitoring @${username}\n`);

    // Scrape current followers
    const followers = new Set();
    let prevSize = 0, retries = 0;

    console.log('📜 Scanning followers...');

    while (retries < CONFIG.maxRetries && followers.size < CONFIG.maxFollowers) {
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);

      for (const cell of document.querySelectorAll('[data-testid="UserCell"]')) {
        const link = cell.querySelector('a[href^="/"]');
        if (!link) continue;
        const href = link.getAttribute('href') || '';
        const user = href.replace('/', '').toLowerCase();
        if (user && !user.includes('/')) followers.add(user);
      }

      console.log(`   Found ${followers.size} followers...`);
      if (followers.size === prevSize) retries++;
      else { retries = 0; prevSize = followers.size; }
    }

    const currentList = [...followers];
    console.log(`\n✅ Total: ${currentList.length} followers\n`);

    // Load previous snapshot
    let previous = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) previous = JSON.parse(raw);
    } catch {}

    if (previous && previous.username === username) {
      const prevSet = new Set(previous.followers.map(f => f.toLowerCase()));
      const currSet = new Set(currentList);

      const unfollowed = previous.followers.filter(f => !currSet.has(f.toLowerCase()));
      const newFollowers = currentList.filter(f => !prevSet.has(f.toLowerCase()));

      console.log(`📊 Comparing with snapshot from ${new Date(previous.timestamp).toLocaleString()}`);
      console.log(`   Previous: ${previous.count} | Current: ${currentList.length}`);

      if (unfollowed.length > 0) {
        console.log(`\n🚨 ${unfollowed.length} PEOPLE UNFOLLOWED YOU:\n`);
        unfollowed.forEach((u, i) => console.log(`   ${i + 1}. @${u} — https://x.com/${u}`));

        download(
          { unfollowers: unfollowed, detectedAt: new Date().toISOString(), previousSnapshot: previous.timestamp },
          `xactions-unfollowers-${new Date().toISOString().slice(0, 10)}.json`
        );
      } else {
        console.log('\n✨ No one unfollowed you since last check!');
      }

      if (newFollowers.length > 0) {
        console.log(`\n🎉 ${newFollowers.length} NEW FOLLOWERS:\n`);
        newFollowers.forEach((u, i) => console.log(`   ${i + 1}. @${u} — https://x.com/${u}`));
      }
    } else {
      console.log('📸 First scan! Saving snapshot...');
      console.log('   Run this script again later to detect changes.');
    }

    // Save current snapshot
    const snapshot = { username, followers: currentList, timestamp: new Date().toISOString(), count: currentList.length };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    console.log(`\n💾 Snapshot saved (${currentList.length} followers).`);
    console.log('🔁 Run again anytime to check for changes!\n');
  };

  run();
})();

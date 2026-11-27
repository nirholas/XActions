// GENERATED FILE: a copy of browser/detectUnfollowers.js, written by scripts/build-script-manifest.mjs. Edit browser/detectUnfollowers.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        detectUnfollowers.js
 * @title       Detect Unfollowers
 * @description Snapshot your followers and, on the next run, list who unfollowed you and who is new.
 * @category    monitor
 * @page        x.com/<you>/followers
 * @writes      false
 * @aliases     scripts/detectUnfollowers.js, scripts/twitter/detect-unfollowers.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// DetectUnfollowers.js — Find out who unfollowed you on X (Twitter)
// https://github.com/nirholas/XActions
//
// HOW TO USE:
// 1. Go to https://x.com/YOUR_USERNAME/followers
// 2. Open Developer Console (Ctrl+Shift+J or Cmd+Option+J)
// 3. Paste browser/detectUnfollowers.js and press Enter
// 4. The script will scan your followers and save them
// 5. Run again later to see who unfollowed you!
//
// Data is stored in your browser's localStorage, so it persists between sessions.
// After a comparison the result is on window.unfollowerReport; after a first
// scan the snapshot is on window.followerSnapshot.

(() => {
  const CONFIG = {
    scrollDelay: 1500,               // ms between scrolls
    maxRetries: 5,                   // Scrolls with no new followers before stopping
    maxScrolls: 0,                   // Maximum scroll attempts (0 = no limit)
    maxFollowers: 0,                 // Stop scanning after this many followers (0 = no limit)
    autoDownload: true,              // Download a file when the comparison finds changes
    downloadFormat: 'txt',           // 'txt' = unfollower usernames, 'report' = full text report
                                     // (unfollowers and new followers), 'json' = JSON file
    showDisplayNames: false,         // Print display names next to usernames in the results
    storageKey: 'xactions_my_followers',
    legacyStorageKeys: ['xactions_followers'], // Older snapshot keys read when storageKey has none
  };

  const STORAGE_KEY = CONFIG.storageKey;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // Check we're on the right page
  const isFollowersPage = window.location.pathname.includes('/followers');
  if (!isFollowersPage) {
    console.error('❌ Please navigate to your FOLLOWERS page first!');
    console.log('👉 Go to: https://x.com/YOUR_USERNAME/followers');
    return;
  }

  const getCurrentUsername = () => {
    const match = window.location.pathname.match(/^\/([^/]+)\/followers/);
    return match ? match[1] : 'unknown';
  };

  // username -> display name, filled while scanning
  const displayNames = {};

  const scrapeFollowers = async () => {
    const followers = new Set();
    let previousSize = 0;
    let retries = 0;
    let scrolls = 0;
    const maxRetries = CONFIG.maxRetries;

    console.log('🔍 Scanning your followers...');

    while (retries < maxRetries) {
      if (CONFIG.maxScrolls > 0 && scrolls >= CONFIG.maxScrolls) break;
      if (CONFIG.maxFollowers > 0 && followers.size >= CONFIG.maxFollowers) break;

      // Scroll to load more
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrolls++;

      // Find all user cells and extract usernames
      const userCells = document.querySelectorAll('[data-testid="UserCell"]');
      userCells.forEach(cell => {
        if (CONFIG.maxFollowers > 0 && followers.size >= CONFIG.maxFollowers) return;
        const usernameEl = cell.querySelector('a[href^="/"]');
        if (usernameEl) {
          const href = usernameEl.getAttribute('href');
          const username = href.replace('/', '').toLowerCase();
          if (username && !username.includes('/')) {
            followers.add(username);
            if (!displayNames[username]) {
              const span = cell.querySelector('[dir="ltr"] span');
              const name = span ? span.textContent.trim() : '';
              if (name) displayNames[username] = name;
            }
          }
        }
      });

      console.log(`   Found ${followers.size} followers so far...`);

      if (followers.size === previousSize) {
        retries++;
      } else {
        retries = 0;
        previousSize = followers.size;
      }
    }

    return Array.from(followers);
  };

  // Accepts this script's snapshot ({ username, followers: [...], timestamp, count })
  // and the older scripts/twitter format ({ savedAt, count, followers: { user: name } }).
  const normalizeSnapshot = (data) => {
    if (!data || typeof data !== 'object' || Array.isArray(data) || !data.followers) return null;
    if (Array.isArray(data.followers)) {
      return {
        username: data.username,
        followers: data.followers,
        timestamp: data.timestamp || data.savedAt,
        count: data.count ?? data.followers.length,
        displayNames: data.displayNames || {},
      };
    }
    const followers = Object.keys(data.followers);
    return {
      username: data.username,
      followers,
      timestamp: data.timestamp || data.savedAt,
      count: data.count ?? followers.length,
      displayNames: data.followers,
    };
  };

  const loadPreviousFollowers = (username) => {
    for (const key of [STORAGE_KEY, ...CONFIG.legacyStorageKeys]) {
      try {
        const snapshot = normalizeSnapshot(JSON.parse(localStorage.getItem(key) || 'null'));
        if (!snapshot) continue;
        // Snapshots from the old scripts/twitter version carry no username.
        if (snapshot.username === undefined && key === STORAGE_KEY) snapshot.username = username;
        if (snapshot.username === username) return snapshot;
      } catch (e) {
        console.warn('Could not load previous data:', e);
      }
    }
    return null;
  };

  const saveFollowers = (followers, username) => {
    const names = {};
    followers.forEach(f => { if (displayNames[f]) names[f] = displayNames[f]; });
    const data = {
      username,
      followers,
      timestamp: new Date().toISOString(),
      count: followers.length,
      displayNames: names
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  };

  const compareFollowers = (previous, current) => {
    const prevSet = new Set(previous.map(f => f.toLowerCase()));
    const currSet = new Set(current.map(f => f.toLowerCase()));

    const unfollowed = previous.filter(f => !currSet.has(f.toLowerCase()));
    const newFollowers = current.filter(f => !prevSet.has(f.toLowerCase()));

    return { unfollowed, newFollowers };
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  const downloadFile = (content, type, filename) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const run = async () => {
    const username = getCurrentUsername();
    console.log(`\n🐦 XActions Detector — Monitoring @${username}\n`);

    // Scrape current followers
    const currentFollowers = await scrapeFollowers();
    console.log(`\n✅ Found ${currentFollowers.length} total followers\n`);

    // Check for previous data
    const previousData = loadPreviousFollowers(username);

    if (previousData) {
      const previousNames = previousData.displayNames || {};
      const nameOf = (u) => previousNames[u] || displayNames[u] || previousNames[u.toLowerCase()] || u;
      const label = (u) => (CONFIG.showDisplayNames ? `@${u} (${nameOf(u)})` : `@${u}`);

      console.log(`📊 Comparing with snapshot from ${formatDate(previousData.timestamp)}`);
      console.log(`   Previous count: ${previousData.count}`);
      console.log(`   Current count: ${currentFollowers.length}`);
      console.log('');

      const { unfollowed, newFollowers } = compareFollowers(previousData.followers, currentFollowers);

      if (unfollowed.length > 0) {
        console.log(`\n🚨 ${unfollowed.length} PEOPLE UNFOLLOWED YOU:\n`);
        unfollowed.forEach((u, i) => {
          console.log(`   ${i + 1}. ${label(u)} — https://x.com/${u}`);
        });
      } else {
        console.log('✨ No one unfollowed you since last check!');
      }

      if (newFollowers.length > 0) {
        console.log(`\n🎉 ${newFollowers.length} NEW FOLLOWERS:\n`);
        newFollowers.forEach((u, i) => {
          console.log(`   ${i + 1}. ${label(u)} — https://x.com/${u}`);
        });
      } else {
        console.log('📭 No new followers since last check.');
      }

      const now = new Date().toISOString();
      const day = now.split('T')[0];

      // Offer download
      if (CONFIG.autoDownload) {
        if (CONFIG.downloadFormat === 'report' && (unfollowed.length > 0 || newFollowers.length > 0)) {
          let report = 'UNFOLLOWER DETECTION REPORT\n';
          report += `${'='.repeat(50)}\n`;
          report += `Generated: ${now}\n`;
          report += `Previous snapshot: ${previousData.timestamp}\n`;
          report += `Previous count: ${previousData.count}\n`;
          report += `Current count: ${currentFollowers.length}\n`;
          report += `${'='.repeat(50)}\n\n`;
          if (unfollowed.length > 0) {
            report += `UNFOLLOWERS (${unfollowed.length}):\n`;
            report += `${'-'.repeat(30)}\n`;
            unfollowed.forEach((u, i) => {
              report += `${i + 1}. @${u} (${nameOf(u)})\n`;
              report += `   https://x.com/${u}\n`;
            });
            report += '\n';
          }
          if (newFollowers.length > 0) {
            report += `NEW FOLLOWERS (${newFollowers.length}):\n`;
            report += `${'-'.repeat(30)}\n`;
            newFollowers.forEach((u, i) => {
              report += `${i + 1}. @${u} (${nameOf(u)})\n`;
            });
          }
          downloadFile(report, 'text/plain', `unfollowers_${day}.txt`);
          console.log('\n📥 Downloaded the unfollower report!');
        } else if (CONFIG.downloadFormat === 'json' && unfollowed.length > 0) {
          downloadFile(
            JSON.stringify({ unfollowers: unfollowed, newFollowers, detectedAt: now, previousSnapshot: previousData.timestamp }, null, 2),
            'application/json',
            `xactions-unfollowers-${day}.json`
          );
          console.log('\n📥 Downloaded list of unfollowers!');
        } else if (CONFIG.downloadFormat !== 'report' && CONFIG.downloadFormat !== 'json' && unfollowed.length > 0) {
          downloadFile(unfollowed.join('\n'), 'text/plain', `unfollowers-${day}.txt`);
          console.log('\n📥 Downloaded list of unfollowers!');
        }
      }

      window.unfollowerReport = {
        timestamp: now,
        previous: previousData.count,
        current: currentFollowers.length,
        unfollowers: unfollowed.map(u => ({ username: u, displayName: nameOf(u) })),
        newFollowers: newFollowers.map(u => ({ username: u, displayName: nameOf(u) }))
      };
      console.log('\n💡 Access data via: window.unfollowerReport');
    } else {
      console.log('📸 First scan! Saving snapshot of your followers...');
      console.log('   Run this script again later to detect changes.');
    }

    // Save current state
    const saved = saveFollowers(currentFollowers, username);
    if (!previousData) window.followerSnapshot = saved;
    console.log(`\n💾 Snapshot saved at ${formatDate(saved.timestamp)}`);
    console.log('   Run this script again anytime to check for changes!\n');
  };

  run();
})();

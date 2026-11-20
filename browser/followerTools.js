// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// browser/followerTools.js
// Advanced follower tools for X/Twitter
// by nichxbt
// https://github.com/nirholas/XActions
//
// HOW TO USE:
// 1. Go to https://x.com (must be logged in)
// 2. Open Developer Console (F12 or Ctrl+Shift+J / Cmd+Option+J)
// 3. Paste this script and press Enter
// 4. Call functions via window.XActions.followerTools.*
//
// AVAILABLE TOOLS:
//   togglePostNotifications('username') — Turn on/off bell icon for an account
//   scrapeVerifiedFollowers('username')  — Scrape verified followers tab
//   scrapeSubscribers('username')        — Scrape a creator's subscribers list
//   scrapeMutualFollowers('user1','user2') — Find mutual followers between two accounts
//   scrapeWhoToFollow()                  — Scrape "Who to follow" suggestions
//   scrapeSimilarAccounts('username')    — Scrape "Similar to @user" suggestions
//   restrictAccount('username')          — Restrict an account's interactions
//   scrapeFollowersYouKnow('username')   — Scrape "Followers you know" section
//
// Last Updated: 30 March 2026
(() => {
  'use strict';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const SEL = {
    userCell:       '[data-testid="UserCell"]',
    userName:       '[data-testid="User-Name"]',
    userActions:    '[data-testid="userActions"]',
    confirmBtn:     '[data-testid="confirmationSheetConfirm"]',
    toast:          '[data-testid="toast"]',
    verified:       '[data-testid="icon-verified"]',
    searchInput:    '[data-testid="SearchBox_Search_Input"]',
    backButton:     '[data-testid="app-bar-back"]',
  };

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  // ─── Helpers ───────────────────────────────────────────────

  const extractUserFromCell = (cell) => {
    const data = { username: null, displayName: null, bio: null, verified: false };

    const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
    if (link) {
      const m = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
      if (m && !['home', 'explore', 'notifications', 'messages', 'i', 'settings'].includes(m[1])) {
        data.username = m[1];
      }
    }

    const nameSpans = cell.querySelectorAll('a[href^="/"] span');
    if (nameSpans.length > 0) data.displayName = nameSpans[0].textContent.trim();

    const bioEl = cell.querySelector('[data-testid="UserDescription"]');
    if (bioEl) {
      data.bio = bioEl.textContent.trim();
    } else {
      const autoDir = cell.querySelector('[dir="auto"]:not([data-testid]):not(a [dir="auto"])');
      if (autoDir && autoDir.textContent.trim().length >= 5) {
        data.bio = autoDir.textContent.trim();
      }
    }

    data.verified = !!cell.querySelector(SEL.verified);

    return data;
  };

  const scrollAndCollect = async (maxRetries = 5) => {
    const users = new Map();
    let emptyScrolls = 0;

    while (emptyScrolls < maxRetries) {
      const cells = $$(SEL.userCell);
      let newFound = 0;

      for (const cell of cells) {
        const user = extractUserFromCell(cell);
        if (user.username && !users.has(user.username.toLowerCase())) {
          users.set(user.username.toLowerCase(), user);
          newFound++;
        }
      }

      if (newFound === 0) {
        emptyScrolls++;
      } else {
        emptyScrolls = 0;
      }

      console.log(`🔄 Collected ${users.size} users so far...`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(2000);
    }

    return [...users.values()];
  };

  const navigateTo = async (path) => {
    const target = `https://x.com${path}`;
    if (window.location.href !== target) {
      window.location.href = target;
      // Wait for navigation — caller should re-run after page loads
      await sleep(3000);
    }
  };

  const isOnPage = (pathFragment) => window.location.pathname.includes(pathFragment);

  // ─── 1. Toggle Post Notifications ─────────────────────────

  const togglePostNotifications = async (username) => {
    if (!username) {
      console.error('❌ Usage: XActions.followerTools.togglePostNotifications("username")');
      return;
    }

    username = username.replace(/^@/, '');
    console.log(`🔄 Navigating to @${username}'s profile...`);

    if (!isOnPage(`/${username}`)) {
      window.location.href = `https://x.com/${username}`;
      console.log('⚠️ Navigating to profile. Re-run this function after the page loads.');
      return;
    }

    await sleep(1500);

    // Look for the notification bell button on the profile
    // The bell icon is typically near the follow button on a profile page
    const bellButton = document.querySelector('[aria-label="Notify"]')
      || document.querySelector('[aria-label="Turn on notifications"]')
      || document.querySelector('[aria-label="Turn off notifications"]')
      || document.querySelector('[data-testid="notificationBell"]')
      || document.querySelector('button[aria-label*="notification" i]')
      || document.querySelector('button[aria-label*="notify" i]');

    if (bellButton) {
      const wasOn = bellButton.getAttribute('aria-label')?.toLowerCase().includes('turn off')
        || bellButton.getAttribute('aria-pressed') === 'true';

      bellButton.click();
      await sleep(1000);

      if (wasOn) {
        console.log(`✅ Post notifications turned OFF for @${username}`);
      } else {
        console.log(`✅ Post notifications turned ON for @${username}`);
      }
      return;
    }

    // Fallback: try the ••• user actions menu
    console.log('🔄 Bell icon not found directly, trying user actions menu...');
    const moreButton = $('[data-testid="userActions"]');
    if (!moreButton) {
      console.error('❌ Could not find notification bell or user actions menu. Make sure you follow this user and are on their profile page.');
      return;
    }

    moreButton.click();
    await sleep(800);

    const menuItems = $$('[role="menuitem"]');
    let notifItem = null;
    for (const item of menuItems) {
      const text = item.textContent.toLowerCase();
      if (text.includes('turn on notifications') || text.includes('turn off notifications') || text.includes('notify')) {
        notifItem = item;
        break;
      }
    }

    if (notifItem) {
      const turningOff = notifItem.textContent.toLowerCase().includes('turn off');
      notifItem.click();
      await sleep(1000);
      console.log(`✅ Post notifications ${turningOff ? 'turned OFF' : 'turned ON'} for @${username}`);
    } else {
      // Close menu
      document.body.click();
      console.error('❌ Notification toggle not found in menu. You may need to follow this user first.');
    }
  };

  // ─── 2. Scrape Verified Followers ─────────────────────────

  const scrapeVerifiedFollowers = async (username) => {
    if (!username) {
      console.error('❌ Usage: XActions.followerTools.scrapeVerifiedFollowers("username")');
      return [];
    }

    username = username.replace(/^@/, '');
    const targetPath = `/${username}/verified_followers`;

    if (!isOnPage(targetPath)) {
      window.location.href = `https://x.com${targetPath}`;
      console.log(`⚠️ Navigating to @${username}/verified_followers. Re-run after the page loads.`);
      return [];
    }

    console.log(`🔄 Scraping verified followers of @${username}...`);
    const users = await scrollAndCollect(5);

    console.log(`✅ Found ${users.length} verified followers of @${username}`);
    console.table(users.map(u => ({
      username: `@${u.username}`,
      displayName: u.displayName,
      bio: u.bio ? u.bio.substring(0, 60) + (u.bio.length > 60 ? '...' : '') : '',
      verified: u.verified ? '✓' : '',
    })));

    sessionStorage.setItem(`xactions_verified_followers_${username}`, JSON.stringify(users));
    console.log(`💾 Saved to sessionStorage key: xactions_verified_followers_${username}`);

    return users;
  };

  // ─── 3. Scrape Subscribers ────────────────────────────────

  const scrapeSubscribers = async (username) => {
    if (!username) {
      console.error('❌ Usage: XActions.followerTools.scrapeSubscribers("username")');
      return [];
    }

    username = username.replace(/^@/, '');
    const targetPath = `/${username}/subscribers`;

    if (!isOnPage(targetPath)) {
      window.location.href = `https://x.com${targetPath}`;
      console.log(`⚠️ Navigating to @${username}/subscribers. Re-run after the page loads.`);
      return [];
    }

    console.log(`🔄 Scraping subscribers of @${username}...`);
    const users = await scrollAndCollect(5);

    console.log(`✅ Found ${users.length} subscribers of @${username}`);
    console.table(users.map(u => ({
      username: `@${u.username}`,
      displayName: u.displayName,
      verified: u.verified ? '✓' : '',
    })));

    sessionStorage.setItem(`xactions_subscribers_${username}`, JSON.stringify(users));
    console.log(`💾 Saved to sessionStorage key: xactions_subscribers_${username}`);

    return users;
  };

  // ─── 4. Scrape Mutual Followers ───────────────────────────

  const scrapeMutualFollowers = async (username1, username2) => {
    if (!username1 || !username2) {
      console.error('❌ Usage: XActions.followerTools.scrapeMutualFollowers("user1", "user2")');
      console.log('💡 This compares cached follower lists. Run in two steps:');
      console.log('   Step 1: Go to x.com/user1/followers, run scrapeFollowersYouKnow("user1") or manually scroll');
      console.log('   Step 2: Go to x.com/user2/followers, do the same');
      console.log('   Step 3: Run scrapeMutualFollowers("user1", "user2")');
      return [];
    }

    username1 = username1.replace(/^@/, '').toLowerCase();
    username2 = username2.replace(/^@/, '').toLowerCase();

    // Check if we're on a followers page — scrape current page first
    if (isOnPage('/followers')) {
      console.log('🔄 On a followers page — scraping visible followers first...');
      const currentUsers = await scrollAndCollect(5);
      const pathUser = window.location.pathname.match(/^\/([^/]+)\/followers/);
      if (pathUser) {
        const key = pathUser[1].toLowerCase();
        sessionStorage.setItem(`xactions_followers_${key}`, JSON.stringify(currentUsers));
        console.log(`💾 Cached ${currentUsers.length} followers for @${pathUser[1]}`);
      }
    }

    // Try to load cached data
    const raw1 = sessionStorage.getItem(`xactions_followers_${username1}`);
    const raw2 = sessionStorage.getItem(`xactions_followers_${username2}`);

    if (!raw1) {
      console.error(`❌ No cached followers for @${username1}. Go to x.com/${username1}/followers and run the script there first.`);
      return [];
    }
    if (!raw2) {
      console.error(`❌ No cached followers for @${username2}. Go to x.com/${username2}/followers and run the script there first.`);
      return [];
    }

    const followers1 = JSON.parse(raw1);
    const followers2 = JSON.parse(raw2);
    const set1 = new Set(followers1.map(u => u.username.toLowerCase()));
    const set2 = new Set(followers2.map(u => u.username.toLowerCase()));

    const mutualUsernames = [...set1].filter(u => set2.has(u));
    const mutuals = followers1.filter(u => mutualUsernames.includes(u.username.toLowerCase()));

    console.log(`✅ Found ${mutuals.length} mutual followers between @${username1} and @${username2}`);
    console.table(mutuals.map(u => ({
      username: `@${u.username}`,
      displayName: u.displayName,
      verified: u.verified ? '✓' : '',
    })));

    sessionStorage.setItem(`xactions_mutuals_${username1}_${username2}`, JSON.stringify(mutuals));
    console.log(`💾 Saved to sessionStorage key: xactions_mutuals_${username1}_${username2}`);

    return mutuals;
  };

  // ─── 5. Scrape "Who to Follow" Suggestions ────────────────

  const scrapeWhoToFollow = async () => {
    // Check if we're on the connect_people page
    if (!isOnPage('/i/connect_people')) {
      window.location.href = 'https://x.com/i/connect_people';
      console.log('⚠️ Navigating to Who to Follow page. Re-run after the page loads.');
      return [];
    }

    console.log('🔄 Scraping "Who to Follow" suggestions...');
    const users = await scrollAndCollect(4);

    console.log(`✅ Found ${users.length} suggested accounts to follow`);
    console.table(users.map(u => ({
      username: `@${u.username}`,
      displayName: u.displayName,
      bio: u.bio ? u.bio.substring(0, 60) + (u.bio.length > 60 ? '...' : '') : '',
      verified: u.verified ? '✓' : '',
    })));

    sessionStorage.setItem('xactions_who_to_follow', JSON.stringify(users));
    console.log('💾 Saved to sessionStorage key: xactions_who_to_follow');

    return users;
  };

  // ─── 6. Scrape Similar Accounts ───────────────────────────

  const scrapeSimilarAccounts = async (username) => {
    if (!username) {
      console.error('❌ Usage: XActions.followerTools.scrapeSimilarAccounts("username")');
      return [];
    }

    username = username.replace(/^@/, '');

    // X shows similar accounts at /i/similar_to/USERNAME or via the profile sidebar
    const targetPath = `/i/similar_to/${username}`;

    if (!isOnPage(targetPath)) {
      // First try navigating to the similar_to page
      window.location.href = `https://x.com${targetPath}`;
      console.log(`⚠️ Navigating to similar accounts for @${username}. Re-run after the page loads.`);
      console.log(`💡 If this page doesn't exist, go to @${username}'s profile and look for "Similar to" or "You might like" in the sidebar.`);
      return [];
    }

    console.log(`🔄 Scraping accounts similar to @${username}...`);
    const users = await scrollAndCollect(4);

    if (users.length === 0) {
      console.log('⚠️ No similar accounts found on this page.');
      console.log('💡 Try these alternatives:');
      console.log(`   1. Go to x.com/${username} and look for "Similar to @${username}" in the sidebar`);
      console.log('   2. Check the "Who to follow" section on your home timeline');
      return [];
    }

    console.log(`✅ Found ${users.length} accounts similar to @${username}`);
    console.table(users.map(u => ({
      username: `@${u.username}`,
      displayName: u.displayName,
      bio: u.bio ? u.bio.substring(0, 60) + (u.bio.length > 60 ? '...' : '') : '',
      verified: u.verified ? '✓' : '',
    })));

    sessionStorage.setItem(`xactions_similar_to_${username}`, JSON.stringify(users));
    console.log(`💾 Saved to sessionStorage key: xactions_similar_to_${username}`);

    return users;
  };

  // ─── 7. Restrict Account ──────────────────────────────────

  const restrictAccount = async (username) => {
    if (!username) {
      console.error('❌ Usage: XActions.followerTools.restrictAccount("username")');
      return;
    }

    username = username.replace(/^@/, '');

    if (!isOnPage(`/${username}`)) {
      window.location.href = `https://x.com/${username}`;
      console.log(`⚠️ Navigating to @${username}'s profile. Re-run after the page loads.`);
      return;
    }

    console.log(`🔄 Attempting to restrict @${username}...`);
    await sleep(1500);

    // Open the user actions menu (three dots)
    const moreButton = $('[data-testid="userActions"]');
    if (!moreButton) {
      console.error('❌ Could not find user actions menu on this profile.');
      return;
    }

    moreButton.click();
    await sleep(800);

    // Look for "Restrict" option in the dropdown menu
    const menuItems = $$('[role="menuitem"]');
    let restrictItem = null;
    for (const item of menuItems) {
      const text = item.textContent.toLowerCase();
      if (text.includes('restrict')) {
        restrictItem = item;
        break;
      }
    }

    if (!restrictItem) {
      // Close the menu
      document.body.click();
      await sleep(300);
      console.error('❌ "Restrict" option not found in menu.');
      console.log('💡 The restrict feature may not be available for this account or your account type.');
      console.log('💡 Alternatives: Block (@username) or Mute (@username) are available in the same menu.');
      return;
    }

    restrictItem.click();
    await sleep(1000);

    // Check for confirmation dialog
    const confirmBtn = $(SEL.confirmBtn);
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(800);
    }

    console.log(`✅ @${username} has been restricted.`);
    console.log('ℹ️ Restricted accounts can still see your posts but their replies will be hidden from others.');
  };

  // ─── 8. Scrape "Followers You Know" ───────────────────────

  const scrapeFollowersYouKnow = async (username) => {
    if (!username) {
      console.error('❌ Usage: XActions.followerTools.scrapeFollowersYouKnow("username")');
      return [];
    }

    username = username.replace(/^@/, '');

    // The "followers you know" page is at /{username}/followers_you_follow
    const targetPath = `/${username}/followers_you_follow`;

    if (!isOnPage(targetPath)) {
      // First try to navigate — this path shows followers that you also follow
      window.location.href = `https://x.com${targetPath}`;
      console.log(`⚠️ Navigating to followers you know for @${username}. Re-run after the page loads.`);
      console.log(`💡 If this page doesn't load, go to x.com/${username} and click "Followed by [names] and N others" on their profile.`);
      return [];
    }

    console.log(`🔄 Scraping followers you know for @${username}...`);
    const users = await scrollAndCollect(5);

    console.log(`✅ Found ${users.length} followers you know for @${username}`);
    console.table(users.map(u => ({
      username: `@${u.username}`,
      displayName: u.displayName,
      bio: u.bio ? u.bio.substring(0, 60) + (u.bio.length > 60 ? '...' : '') : '',
      verified: u.verified ? '✓' : '',
    })));

    sessionStorage.setItem(`xactions_followers_you_know_${username}`, JSON.stringify(users));
    console.log(`💾 Saved to sessionStorage key: xactions_followers_you_know_${username}`);

    return users;
  };

  // ─── Expose on window.XActions ─────────────────────────────

  window.XActions = window.XActions || {};
  window.XActions.followerTools = {
    togglePostNotifications,
    scrapeVerifiedFollowers,
    scrapeSubscribers,
    scrapeMutualFollowers,
    scrapeWhoToFollow,
    scrapeSimilarAccounts,
    restrictAccount,
    scrapeFollowersYouKnow,
  };

  // ─── Print Menu ────────────────────────────────────────────

  console.log(`
╔══════════════════════════════════════════════════════════╗
║          🛠️  XActions Follower Tools — Loaded           ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  All functions available at:                             ║
║    window.XActions.followerTools.<function>               ║
║                                                          ║
║  1. togglePostNotifications('username')                  ║
║     ↳ Turn on/off post notifications (bell icon)         ║
║                                                          ║
║  2. scrapeVerifiedFollowers('username')                  ║
║     ↳ Scrape the verified followers tab                  ║
║                                                          ║
║  3. scrapeSubscribers('username')                        ║
║     ↳ Scrape a creator's subscribers list                ║
║                                                          ║
║  4. scrapeMutualFollowers('user1', 'user2')              ║
║     ↳ Find mutual followers between two accounts         ║
║                                                          ║
║  5. scrapeWhoToFollow()                                  ║
║     ↳ Scrape "Who to follow" suggestions                 ║
║                                                          ║
║  6. scrapeSimilarAccounts('username')                    ║
║     ↳ Scrape "Similar to @user" suggestions              ║
║                                                          ║
║  7. restrictAccount('username')                          ║
║     ↳ Restrict an account's interactions                 ║
║                                                          ║
║  8. scrapeFollowersYouKnow('username')                   ║
║     ↳ Scrape "Followers you know" section                ║
║                                                          ║
╠══════════════════════════════════════════════════════════╣
║  💡 Example: XActions.followerTools.scrapeVerified       ║
║     Followers('elonmusk')                                ║
║  📖 Data saved to sessionStorage after each scrape       ║
╚══════════════════════════════════════════════════════════╝
  `);
})();

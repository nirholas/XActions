// GENERATED FILE: a copy of browser/keywordFollow.js, written by scripts/build-script-manifest.mjs. Edit browser/keywordFollow.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🔑 Keyword Search & Follow
 * ============================================================
 *
 * @name        keywordFollow.js
 * @title       Keyword Follow
 * @description Search People results for each keyword and follow the users that pass bio, follower count and account filters, with a cap.
 * @category    grow
 * @page        x.com/search?q=<query>&f=user or x.com/*
 * @writes      true
 * @aliases     src/automation/keywordFollow.js, scripts/twitter/keyword-follow.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Either open a People search yourself, e.g.
 *    https://x.com/search?q=web3%20developer&f=user
 *    (the script works through that query), or stay on any x.com page
 *    and the script searches every entry of CONFIG.KEYWORDS in turn
 * 2. Configure keywords and filters below
 * 3. Paste browser/keywordFollow.js into the DevTools console and press Enter
 *    (src/automation/core.js is optional: when it is pasted first its
 *    logger, storage, rate limiter and selectors are used)
 * 4. Run stopKeywordFollow() to stop
 *
 * 💡 TIP: Use the &f=user parameter to show People results.
 * Follows are tracked so smartUnfollow can remove non-followers later.
 * ============================================================
 */

(() => {
  // ============================================
  // CORE (optional): use core.js when present, built-ins otherwise
  // ============================================
  const Core = window.XActions?.Core;

  const sleep = Core?.sleep || ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
  const randomDelay = Core?.randomDelay || ((min, max) => sleep(Math.floor(Math.random() * (max - min + 1)) + min));
  const log = Core?.log || ((message, type = 'info') => {
    const prefix = { info: '📘', success: '✅', warning: '⚠️', error: '❌', action: '🔧' }[type] || '📘';
    console.log(`${prefix} [${new Date().toLocaleTimeString()}] ${message}`);
  });
  const scrollBy = Core?.scrollBy || ((pixels) => window.scrollBy({ top: pixels, behavior: 'smooth' }));
  const clickElement = Core?.clickElement || (async (element) => {
    if (!element) return false;
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);
      element.click();
      return true;
    } catch (e) {
      log(`Click error: ${e.message}`, 'error');
      return false;
    }
  });
  const waitForElement = Core?.waitForElement || (async (selector, timeout = 10000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await sleep(100);
    }
    return null;
  });
  // Same key layout as core.js storage (xactions_ prefix, JSON values)
  const storage = Core?.storage || {
    get: (key) => {
      try {
        const data = localStorage.getItem('xactions_' + key);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem('xactions_' + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
  // Same keys and windows as core.js rateLimit
  const rateLimit = Core?.rateLimit || {
    check: (action, limit, period = 'hour') => {
      const data = storage.get(`ratelimit_${action}_${period}`) || { count: 0, timestamp: Date.now() };
      const periodMs = period === 'hour' ? 3600000 : 86400000;
      if (Date.now() - data.timestamp > periodMs) {
        data.count = 0;
        data.timestamp = Date.now();
      }
      return data.count < limit;
    },
    increment: (action, period = 'hour') => {
      const key = `ratelimit_${action}_${period}`;
      const data = storage.get(key) || { count: 0, timestamp: Date.now() };
      data.count++;
      storage.set(key, data);
    },
  };
  const SELECTORS = Core?.SELECTORS || {
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    userCell: '[data-testid="UserCell"]',
    userFollowIndicator: '[data-testid="userFollowIndicator"]',
    userDescription: '[data-testid="UserDescription"]',
  };
  const parseCount = Core?.parseCount || ((str) => {
    if (!str) return 0;
    const clean = str.replace(/,/g, '');
    const num = parseFloat(clean);
    if (clean.toUpperCase().includes('K')) return num * 1000;
    if (clean.toUpperCase().includes('M')) return num * 1000000;
    if (clean.toUpperCase().includes('B')) return num * 1000000000;
    return num;
  });
  const extractUserFromCell = Core?.extractUserFromCell || ((cell) => {
    if (!cell) return null;
    try {
      const href = cell.querySelector('a[href^="/"]')?.getAttribute('href') || '';
      const username = (href.match(/^\/([^/]+)$/) || [, href.replace(/^\//, '').split('/')[0] || ''])[1].toLowerCase();
      const displayName = [...cell.querySelectorAll('[data-testid="User-Name"] span')]
        .map((el) => el.textContent.trim())
        .find((t) => t && !t.startsWith('@')) || username;
      let bioStrategy = 'none';
      let bio = cell.querySelector(SELECTORS.userDescription)?.textContent.trim() || '';
      if (bio) {
        bioStrategy = 'testid';
      } else {
        bio = [...cell.querySelectorAll('[dir="auto"]:not([data-testid])')]
          .map((el) => el.textContent.trim())
          .find((t) => t && !t.startsWith('@') && t.length >= 10 && t !== displayName) || '';
        if (bio) bioStrategy = 'dir-auto';
      }
      const followerMatch = (cell.textContent || '').match(/(\d[\d,]*\.?\d*[KMB]?)\s*Follower/i);
      return {
        username,
        displayName,
        bio,
        followers: followerMatch ? parseCount(followerMatch[1]) : 0,
        isFollowing: !!cell.querySelector(SELECTORS.unfollowButton),
        followsYou: !!cell.querySelector(SELECTORS.userFollowIndicator),
        isVerified: !!cell.querySelector('[data-testid="icon-verified"]') || !!cell.querySelector('svg[aria-label*="Verified"]'),
        isProtected: !!cell.querySelector('[data-testid="icon-lock"]'),
        _meta: { bioStrategy },
      };
    } catch (e) {
      log(`extractUserFromCell error: ${e.message}`, 'error');
      return null;
    }
  });

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // Search terms (will search each one)
    KEYWORDS: ['web3 developer', 'solidity engineer', 'crypto founder'],

    // Follow settings
    MAX_FOLLOWS_PER_KEYWORD: 10,
    MAX_FOLLOWS_TOTAL: 20,

    // Filters
    MIN_FOLLOWERS: 100,           // Skip users with fewer followers
    MAX_FOLLOWERS: 100000,        // Skip mega accounts
    MUST_HAVE_BIO: true,          // Skip users without bio
    BIO_KEYWORDS: [],             // Bio must contain one of these (empty = any)
    BIO_BLACKLIST: ['bot', 'automated', 'promo', 'giveaway'], // Skip if bio contains any of these
    SKIP_IF_FOLLOWING: true,      // Skip users you already follow
    SKIP_PROTECTED: true,         // Skip protected (private) accounts
    SKIP_VERIFIED: false,         // Skip verified accounts
    SKIP_FOLLOWS_YOU: false,      // Skip accounts that already follow you

    // Tracking: who you followed, when, and from which keyword
    // (xactions_follow_tracking, read by smart-unfollow)
    TRACK_FOLLOWS: true,

    // Timing
    DELAY_BETWEEN_FOLLOWS: 3000,
    DELAY_BETWEEN_SEARCHES: 10000,
  };

  // ============================================
  // STATE
  // ============================================
  let followCount = 0;
  const followedUsers = new Map(Object.entries(storage.get('followed_users') || {}));

  // Keys written by the scripts/twitter variant of this tool
  const KEYWORD_FOLLOWED_KEY = 'xactions_keyword_followed';
  const TRACKING_KEY = 'xactions_follow_tracking';
  const readJson = (key, fallback) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };
  const keywordFollowed = new Set(readJson(KEYWORD_FOLLOWED_KEY, []));
  const keywordFollowedLower = new Set(Array.from(keywordFollowed, u => String(u).toLowerCase()));
  const trackingData = readJson(TRACKING_KEY, {});

  // ============================================
  // SAVE FOLLOW DATA
  // ============================================
  const saveFollowedUser = (username, keyword) => {
    followedUsers.set(username.toLowerCase(), {
      followedAt: Date.now(),
      followedBack: false,
      checkedAt: null,
    });
    storage.set('followed_users', Object.fromEntries(followedUsers));

    keywordFollowed.add(username);
    keywordFollowedLower.add(username.toLowerCase());
    try {
      localStorage.setItem(KEYWORD_FOLLOWED_KEY, JSON.stringify([...keywordFollowed]));
      if (CONFIG.TRACK_FOLLOWS) {
        trackingData[username] = {
          followedAt: new Date().toISOString(),
          keyword,
        };
        localStorage.setItem(TRACKING_KEY, JSON.stringify(trackingData));
      }
    } catch {
      // storage full or blocked: followed_users above still has it
    }
  };

  // ============================================
  // NAVIGATION
  // ============================================
  // Navigate within the SPA. Assigning window.location.href triggers a full
  // page load, which destroys this console script before it can continue.
  const spaNavigate = (url) => {
    try {
      const target = new URL(url, window.location.href);
      if (target.origin === window.location.origin) {
        window.history.pushState({}, '', target.href);
        window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
        return;
      }
    } catch { /* fall through to a full page load below */ }
    window.location.href = url;
  };

  const searchFor = async (keyword) => {
    log(`Searching for: "${keyword}"`, 'action');

    // Navigate to search
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=user`;
    spaNavigate(searchUrl);

    // Wait for page load
    await sleep(3000);
    await waitForElement(SELECTORS.userCell, 10000);
    await sleep(1000);
  };

  // ============================================
  // USER EXTRACTION
  // ============================================
  const extractUserInfo = (userCell) => {
    return extractUserFromCell(userCell);
  };

  // ============================================
  // FILTERS
  // ============================================
  const passesFilters = (userInfo) => {
    if (!userInfo || !userInfo.username) return false;

    // Already following
    if (CONFIG.SKIP_IF_FOLLOWING && userInfo.isFollowing) {
      return false;
    }

    // Already in our tracked list
    if (followedUsers.has(userInfo.username.toLowerCase())) {
      return false;
    }
    if (keywordFollowedLower.has(userInfo.username.toLowerCase())) {
      return false;
    }

    // Account flags
    if (CONFIG.SKIP_PROTECTED && userInfo.isProtected) return false;
    if (CONFIG.SKIP_VERIFIED && userInfo.isVerified) return false;
    if (CONFIG.SKIP_FOLLOWS_YOU && userInfo.followsYou) return false;

    // Bio requirement
    if (CONFIG.MUST_HAVE_BIO && !userInfo.bio) {
      return false;
    }

    // Bio keywords
    if (CONFIG.BIO_KEYWORDS.length > 0) {
      const bioLower = userInfo.bio.toLowerCase();
      if (!CONFIG.BIO_KEYWORDS.some(kw => bioLower.includes(kw.toLowerCase()))) {
        return false;
      }
    }

    // Bio blacklist
    if (CONFIG.BIO_BLACKLIST.length > 0) {
      const bioLower = (userInfo.bio || '').toLowerCase();
      if (CONFIG.BIO_BLACKLIST.some(kw => bioLower.includes(kw.toLowerCase()))) {
        return false;
      }
    }

    // Follower count (if available)
    if (userInfo.followers > 0) {
      if (userInfo.followers < CONFIG.MIN_FOLLOWERS) return false;
      if (userInfo.followers > CONFIG.MAX_FOLLOWERS) return false;
    }

    return true;
  };

  // ============================================
  // FOLLOW ACTION
  // ============================================
  const followUser = async (userCell, userInfo, keyword) => {
    const followBtn = userCell.querySelector(SELECTORS.followButton);
    if (!followBtn) return false;

    const clicked = await clickElement(followBtn);
    if (clicked) {
      followCount++;
      saveFollowedUser(userInfo.username, keyword);
      rateLimit.increment('follow', 'day');
      log(`Followed @${userInfo.username} (${userInfo.displayName}) - #${followCount}`, 'success');
      return true;
    }
    return false;
  };

  // ============================================
  // MAIN PROCESS
  // ============================================
  const processSearchResults = async (keyword) => {
    let keywordFollows = 0;
    let scrolls = 0;
    const maxScrolls = 20;

    while (keywordFollows < CONFIG.MAX_FOLLOWS_PER_KEYWORD &&
           followCount < CONFIG.MAX_FOLLOWS_TOTAL &&
           scrolls < maxScrolls) {

      // Check rate limit
      if (!rateLimit.check('follow', 100, 'day')) {
        log('Daily follow limit reached', 'warning');
        return;
      }

      const userCells = document.querySelectorAll(SELECTORS.userCell);

      for (const cell of userCells) {
        if (keywordFollows >= CONFIG.MAX_FOLLOWS_PER_KEYWORD) break;
        if (followCount >= CONFIG.MAX_FOLLOWS_TOTAL) break;

        const userInfo = extractUserInfo(cell);
        if (!passesFilters(userInfo)) continue;

        log(`Found match: @${userInfo.username} [bio:${userInfo._meta?.bioStrategy}] - "${userInfo.bio?.substring(0, 50)}..."`, 'info');

        await followUser(cell, userInfo, keyword);
        keywordFollows++;

        await randomDelay(CONFIG.DELAY_BETWEEN_FOLLOWS, CONFIG.DELAY_BETWEEN_FOLLOWS * 1.5);
      }

      // Scroll for more
      scrollBy(600);
      scrolls++;
      await sleep(2000);
    }

    log(`Followed ${keywordFollows} users from "${keyword}"`, 'info');
  };

  const printSummary = () => {
    log(`\n✅ Done! Followed ${followCount} new users.`, 'success');
    log(`Total tracked: ${followedUsers.size} users`, 'info');
    if (CONFIG.TRACK_FOLLOWS) {
      log(`Follow tracking (xactions_follow_tracking): ${Object.keys(trackingData).length} users`, 'info');
    }
    log(`Run smartUnfollow.js later to remove non-followers!`, 'info');
  };

  // ============================================
  // RUN
  // ============================================
  const run = async () => {
    log('🚀 Starting Keyword Follow Bot...', 'info');
    log(`Keywords: ${CONFIG.KEYWORDS.join(', ')}`, 'info');
    log(`Max follows: ${CONFIG.MAX_FOLLOWS_TOTAL}`, 'info');
    log(`Tracking ${followedUsers.size} previously followed users`, 'info');

    for (const keyword of CONFIG.KEYWORDS) {
      if (followCount >= CONFIG.MAX_FOLLOWS_TOTAL) break;

      await searchFor(keyword);
      await processSearchResults(keyword);

      if (CONFIG.KEYWORDS.indexOf(keyword) < CONFIG.KEYWORDS.length - 1) {
        log(`Waiting before next search...`, 'info');
        await sleep(CONFIG.DELAY_BETWEEN_SEARCHES);
      }
    }

    printSummary();
  };

  // If we're on search page, start immediately on its query. Otherwise, navigate first.
  if (window.location.pathname.includes('/search')) {
    const query = new URLSearchParams(window.location.search).get('q') || CONFIG.KEYWORDS[0];
    log(`🔍 Search query: "${query}"`, 'info');
    log(`Max follows: ${CONFIG.MAX_FOLLOWS_TOTAL}`, 'info');
    processSearchResults(query).then(printSummary);
  } else {
    run();
  }

  window.stopKeywordFollow = () => {
    CONFIG.MAX_FOLLOWS_TOTAL = 0;
    log('Stopping...', 'warning');
  };
})();

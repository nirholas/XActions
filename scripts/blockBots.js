// GENERATED FILE: a copy of browser/blockBots.js, written by scripts/build-script-manifest.mjs. Edit browser/blockBots.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        blockBots.js
 * @title       Block Bots
 * @description Detect likely bot accounts in a follower or user list by heuristics and block them, dry run by default.
 * @category    safety
 * @page        x.com/<you>/followers or x.com/<username>/followers
 * @writes      true
 * @aliases     scripts/blockBots.js, scripts/twitter/block-bots.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 */
// Block Bot Accounts on X - by nichxbt
// https://github.com/nirholas/xactions
// 1. Go to x.com/YOUR_USERNAME/followers or any user list
// 2. Open the Developer Console (F12)
// 3. Paste browser/blockBots.js into the Developer Console and run it
//
// Detects & blocks likely bot accounts based on heuristics.
// A user is flagged when it collects at least CONFIG.thresholds.minReasons reasons.
// Results are downloaded as JSON (and, with CONFIG.saveHistory, appended to localStorage "xactions_blocked_bots").
// Last Updated: 26 November 2026
(() => {
  const CONFIG = {
    // Bot detection thresholds
    minFollowersToFollowingRatio: 0.01, // Very low ratio = likely bot
    maxDefaultProfileAge: 30, // Days with default avatar = suspicious
    noTweetThreshold: 0,      // Zero tweets = suspicious
    nameLooksGenerated: true,  // Check for random-looking usernames
    thresholds: {
      minReasons: 2,          // Min reasons to flag as bot
      digitRatio: 0.5,        // Username digit ratio threshold
      longNameDigits: 0.3,    // Digit ratio for usernames > 14 chars
    },
    flagDefaultAvatar: true,  // Default profile picture counts as a reason
    flagNoBio: true,          // Empty bio counts as a reason
    flagManyDigits: false,    // 6+ digits anywhere in the username counts as a reason
    flagBioKeywords: false,   // A suspicious keyword in the bio counts as a reason
    suspiciousBioKeywords: [
      'crypto', 'nft', 'giveaway', 'airdrop', 'free money',
      'onlyfans', 'dm for', 'follow back', 'f4f', 'follow4follow',
      'bitcoin', 'eth', '$btc', '$eth', 'forex', 'trading signals',
      'make money', 'passive income', 'work from home',
      'link in bio', 'check bio', 'clickhere', 'sexo', 'sex',
      'camgirl', 'hot girl', 'sugar', 'seeking arrangement',
    ],
    flagFollowStats: false,   // Use follower/following counts shown in the cell, when X shows them
    maxFollowingRatio: 50,    // following / followers above this counts as a reason
    maxFollowing: 5000,       // following above this counts as a reason
    minFollowers: 5,          // followers below this counts as a reason
    maxBlocks: 10,            // Max bots to block (or to flag, in dry run)
    actionDelay: 3000,        // ms between blocks
    scrollDelay: 2000,
    maxScrollAttempts: 15,    // Give up after N scrolls with no new users
    maxScrolls: 0,            // Hard cap on total scrolls, 0 = no cap
    requireFollowersPage: false, // true: refuse to run anywhere but a /followers page
    saveHistory: false,       // Append detected bots to localStorage "xactions_blocked_bots" (last 1000)
    dryRun: true, // Set to false to actually block
  };

  const $userCell = '[data-testid="UserCell"]';
  const $userName = '[data-testid="User-Name"]';
  const STORAGE_KEY = 'xactions_blocked_bots';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

  // Bio extraction with fallback chain (canonical version: src/automation/core.js → extractUserFromCell)
  const extractBio = (cell) => {
    // Strategy 1: data-testid (most reliable)
    const testId = cell.querySelector('[data-testid="UserDescription"]');
    if (testId?.textContent?.trim()) return testId.textContent.trim();
    // Strategy 2: dir="auto" excluding testid elements
    const autoDir = cell.querySelector('[dir="auto"]:not([data-testid])');
    if (autoDir?.textContent?.trim()?.length >= 10) return autoDir.textContent.trim();
    // Strategy 3: dir="auto" excluding role (variant DOMs)
    const noRole = cell.querySelector('[dir="auto"]:not([role])');
    if (noRole && !noRole.closest('a') && noRole.textContent?.trim()?.length >= 10) return noRole.textContent.trim();
    return '';
  };

  const detected = [];
  const processedUsers = new Set();
  let blocked = 0;

  const looksLikeBot = (userEl) => {
    const nameEl = userEl.querySelector($userName);
    if (!nameEl) return { isBot: false, reasons: [] };

    const fullText = nameEl.textContent || '';
    const reasons = [];
    let score = 0;

    // Check for default/no avatar
    const avatar = userEl.querySelector('img[src*="default_profile"]');
    if (avatar && CONFIG.flagDefaultAvatar) { reasons.push('default avatar'); score += 15; }

    // Check for generated-looking usernames (lots of numbers)
    const usernameMatch = fullText.match(/@(\w+)/);
    if (usernameMatch) {
      const username = usernameMatch[1];
      const digitRatio = (username.match(/\d/g) || []).length / username.length;
      if (digitRatio > CONFIG.thresholds.digitRatio && CONFIG.nameLooksGenerated) {
        reasons.push(`username ${digitRatio * 100}% digits`);
        score += 15;
      }
      if (username.length > 14 && digitRatio > CONFIG.thresholds.longNameDigits) {
        reasons.push('long username with many digits');
        score += 15;
      }
      if (CONFIG.flagManyDigits) {
        const numMatch = username.match(/\d+/g);
        if (numMatch && numMatch.join('').length >= 6) {
          reasons.push('username has many numbers');
          score += 15;
        }
      }
    }

    // Check for no bio
    const bio = extractBio(userEl);
    if (!bio && CONFIG.flagNoBio) {
      reasons.push('no bio');
      score += 10;
    }

    // Check for suspicious bio keywords
    if (CONFIG.flagBioKeywords && bio) {
      const lowerBio = bio.toLowerCase();
      for (const keyword of CONFIG.suspiciousBioKeywords) {
        if (lowerBio.includes(keyword.toLowerCase())) {
          reasons.push(`bio contains "${keyword}"`);
          score += 20;
        }
      }
    }

    // Check for suspiciously low engagement text
    const spans = userEl.querySelectorAll('span');
    for (const span of spans) {
      const t = span.textContent.toLowerCase();
      if (t.includes('0 followers')) { reasons.push('0 followers'); score += 10; }
      if (t.includes('0 following')) { reasons.push('0 following'); score += 10; }
    }

    // Check follower/following counts, when the cell shows them
    if (CONFIG.flagFollowStats) {
      const statsText = userEl.textContent;
      const followingMatch = statsText.match(/([\d,.]+[KMB]?)\s*Following/i);
      const followersMatch = statsText.match(/([\d,.]+[KMB]?)\s*Followers/i);
      if (followingMatch && followersMatch) {
        const following = parseCount(followingMatch[1]);
        const followers = parseCount(followersMatch[1]);
        if (following > CONFIG.maxFollowing) {
          reasons.push(`following ${following.toLocaleString()} accounts`);
          score += 15;
        }
        if (followers < CONFIG.minFollowers) {
          reasons.push(`only ${followers} followers`);
          score += 10;
        }
        const ratio = following / (followers || 1);
        if (ratio > CONFIG.maxFollowingRatio) {
          reasons.push(`high following ratio (${ratio.toFixed(0)}:1)`);
          score += 25;
        }
      }
    }

    return {
      isBot: reasons.length >= CONFIG.thresholds.minReasons,
      reasons,
      score,
      username: usernameMatch ? usernameMatch[1] : 'unknown',
    };
  };

  const blockUser = async (cell, username) => {
    const moreBtn = cell.querySelector('[data-testid="userActions"]');
    if (!moreBtn) return false;

    cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(500);

    moreBtn.click();
    await sleep(800);

    let blockItem = document.querySelector('[data-testid="block"]');
    if (!blockItem) {
      const menuItems = document.querySelectorAll('[role="menuitem"]');
      for (const item of menuItems) {
        if (/\bblock\b/i.test(item.textContent)) { blockItem = item; break; }
      }
    }
    if (!blockItem) { document.body.click(); await sleep(300); return false; }

    blockItem.click();
    await sleep(600);

    const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
    if (!confirmBtn) return false;
    confirmBtn.click();
    await sleep(500);
    console.log(`   🚫 Blocked @${username} [${blocked + 1}/${CONFIG.maxBlocks}]`);
    return true;
  };

  const run = async () => {
    console.log('🤖 BLOCK BOTS - XActions by nichxbt');
    console.log(CONFIG.dryRun ? '⚠️ DRY RUN MODE - Set CONFIG.dryRun = false to actually block' : '🔴 LIVE MODE');
    console.log(`⚙️ Max blocks: ${CONFIG.maxBlocks} | Delay: ${CONFIG.actionDelay}ms`);

    if (CONFIG.requireFollowersPage && !window.location.pathname.includes('/followers')) {
      console.error('❌ Please navigate to your FOLLOWERS page first!');
      console.log('👉 Go to: https://x.com/YOUR_USERNAME/followers');
      return;
    }

    let scrollAttempts = 0;
    let scrollCount = 0;

    while (blocked < CONFIG.maxBlocks && scrollAttempts < CONFIG.maxScrollAttempts
      && (!CONFIG.maxScrolls || scrollCount < CONFIG.maxScrolls)) {
      const userCells = document.querySelectorAll($userCell);
      let foundNew = false;

      for (const cell of userCells) {
        if (blocked >= CONFIG.maxBlocks) break;

        const linkEl = cell.querySelector('a[href^="/"]');
        const userId = linkEl?.href || '';
        if (processedUsers.has(userId)) continue;
        processedUsers.add(userId);
        foundNew = true;

        const result = looksLikeBot(cell);
        if (!result.isBot || result.username === 'unknown') continue;

        detected.push(result);
        console.log(`🤖 Bot detected: @${result.username} — ${result.reasons.join(', ')}`);

        if (CONFIG.dryRun) {
          blocked++;
          continue;
        }

        if (await blockUser(cell, result.username)) {
          blocked++;
          result.blocked = true;
        }
        await sleep(CONFIG.actionDelay);
      }

      if (!foundNew) scrollAttempts++;
      else scrollAttempts = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrollCount++;
    }

    console.log(`\n📊 RESULTS:`);
    console.log(`   🤖 Bots detected: ${detected.length}`);
    if (!CONFIG.dryRun) console.log(`   🚫 Bots blocked: ${blocked}`);
    console.log(`   👤 Users scanned: ${processedUsers.size}`);
    console.log(`   📊 Bot rate: ${((detected.length / Math.max(processedUsers.size, 1)) * 100).toFixed(1)}%`);

    if (detected.length > 0) {
      console.log('\nDetected bots (highest score first):');
      [...detected].sort((a, b) => b.score - a.score).forEach((b, i) => {
        console.log(`   ${i + 1}. @${b.username} (score ${b.score}) — ${b.reasons.join(', ')} — https://x.com/${b.username}`);
      });

      // Export as JSON
      const blob = new Blob([JSON.stringify(detected, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xactions-bots-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      console.log('📥 Bot list downloaded as JSON');

      if (CONFIG.saveHistory) {
        try {
          const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          const newEntries = detected.map(b => ({
            username: b.username,
            score: b.score,
            reasons: b.reasons,
            blocked: !!b.blocked,
            timestamp: new Date().toISOString(),
          }));
          localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, ...newEntries].slice(-1000)));
          console.log(`💾 Results saved. Export: copy(localStorage.getItem("${STORAGE_KEY}"))`);
        } catch (e) {
          console.warn(`⚠️ Could not save history: ${e.message}`);
        }
      }
    }

    if (CONFIG.dryRun && detected.length > 0) {
      console.log('\n⚠️ DRY RUN: nothing was blocked. Set CONFIG.dryRun = false and run again to block these accounts.');
    }
  };

  run();
})();

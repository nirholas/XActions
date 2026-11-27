// GENERATED FILE: a copy of browser/leaveAllCommunities.js, written by scripts/build-script-manifest.mjs. Edit browser/leaveAllCommunities.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🏠 Leave All Communities — Production Grade
 * ============================================================
 *
 * @name        leaveAllCommunities.js
 * @title       Leave All Communities
 * @description Leave every X Community you have joined, with a whitelist, a cap, a dry run and progress that survives reloads.
 * @category    communities
 * @page        x.com/<you>/communities
 * @writes      true
 * @aliases     scripts/leaveAllCommunities.js, scripts/twitter/leave-all-communities.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.1.0
 * @date        2026-11-26
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME/communities
 * 2. Open DevTools Console (F12)
 * 3. Paste browser/leaveAllCommunities.js and run
 *
 * Starts as a DRY RUN capped at 50. Set dryRun: false to leave
 * communities for real. A dry run does not record progress.
 *
 * NOTE: This script persists progress in localStorage so if
 * the page reloads mid-process, you can re-run it and it will
 * skip already-left communities.
 *
 * 🎮 CONTROLS:
 *   window.XActions.pause()  / .resume() / .abort() / .status() / .reset()
 *   window.stopLeaveCommunities()   (same as abort)
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    whitelist: [],                    // Community IDs to keep (from URL)
    dryRun: true,                     // Preview without leaving; set false to leave
    maxLeaves: 50,                    // Cap per run (Infinity = no cap)
    navigationDelay: 3000,
    actionDelay: 2000,
    leaveDelay: 1500,                 // Wait after opening the Joined menu (ms)
    confirmDelay: 2000,               // Wait after confirming a leave (ms)
    maxConsecutiveErrors: 5,
    rateLimitCooldown: 60000,
    exportOnComplete: true,
  };

  const SEL = {
    communityLink: ['a[href^="/i/communities/"]', 'a[href*="/communities/"]'],
    joinedButton:  ['button[aria-label^="Joined"]', 'button[aria-label*="Joined"]'],
    leaveOption:   ['[role="menuitem"]'],        // Will filter by text
    confirmBtn:    ['[data-testid="confirmationSheetConfirm"]'],
    communitiesNav:['a[aria-label="Communities"]', 'a[href*="/communities"]'],
    toast:         ['[data-testid="toast"]', '[role="alert"]'],
  };

  const $ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelector(x); if (e) return e; } return null; };
  const $$ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelectorAll(x); if (e.length) return [...e]; } return []; };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));
  const isRateLimited = () => { const t = $(SEL.toast); return t && /rate limit|try again|too many|slow down/i.test(t.textContent); };

  let paused = false, aborted = false;
  let left = 0, errors = 0, consecutiveErrors = 0;
  const startTime = Date.now();
  const leftLog = [];

  // Persistent storage (survives page reloads)
  const STORAGE_KEY = 'xactions_leave_communities';
  const getLeftIds = () => {
    try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); } catch { return new Set(); }
  };
  const markAsLeft = (id) => {
    const ids = getLeftIds();
    ids.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  };
  const leftIds = getLeftIds();
  const whitelistSet = new Set(CONFIG.whitelist.map(String));
  const skippedIds = new Set();       // This run only: dry-run previews and communities that could not be left

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      console.log(`📊 Left: ${left} (${leftIds.size} total across all runs) | Errors: ${errors}`);
    },
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      console.log('🗑️ Progress reset. Re-run to start fresh.');
    },
  };

  window.stopLeaveCommunities = () => {
    aborted = true;
    console.log('🛑 [Leave Communities] Stop requested. Finishing the current step, then exiting.');
  };

  const shouldContinue = async () => { while (paused && !aborted) await sleep(500); return !aborted; };

  const findNextCommunity = () => {
    const links = $$(SEL.communityLink);
    for (const link of links) {
      const match = (link.href || '').match(/\/i\/communities\/(\d+)/);
      if (match) {
        const id = match[1];
        if (!leftIds.has(id) && !whitelistSet.has(id) && !skippedIds.has(id)) {
          const name = link.textContent?.trim()?.substring(0, 60) || `Community ${id}`;
          return { id, name, element: link, href: link.href };
        }
      }
    }
    return null;
  };

  const leaveCurrent = async (name) => {
    const urlMatch = window.location.href.match(/\/i\/communities\/(\d+)/);
    const communityId = urlMatch ? urlMatch[1] : null;

    // Try clicking "Joined" button (opens dropdown or toggles)
    const joinedBtn = $(SEL.joinedButton);
    if (!joinedBtn) return false;

    joinedBtn.click();
    await sleep(gaussian(CONFIG.leaveDelay, CONFIG.leaveDelay + 400));

    // Look for "Leave" in dropdown menu
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    let leaveBtn = null;
    for (const item of menuItems) {
      if (/leave|exit/i.test(item.textContent)) { leaveBtn = item; break; }
    }

    if (leaveBtn) {
      leaveBtn.click();
      await sleep(gaussian(600, 1000));
    }

    // Confirm
    const confirm = $(SEL.confirmBtn);
    if (confirm) {
      confirm.click();
      await sleep(gaussian(CONFIG.confirmDelay, CONFIG.confirmDelay + 400));
    }

    if (communityId) {
      markAsLeft(communityId);
      leftIds.add(communityId);
      leftLog.push({ id: communityId, ...(name ? { name } : {}), timestamp: new Date().toISOString() });
    }

    return true;
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🏠 LEAVE ALL COMMUNITIES' + ' '.repeat(W - 27) + '║');
    console.log('║  by nichxbt — v2.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log(`📋 Previously left: ${leftIds.size} | Whitelist: ${whitelistSet.size} | Dry run: ${CONFIG.dryRun}`);
    if (CONFIG.dryRun) console.log('   ⚠️ DRY RUN: set CONFIG.dryRun = false to actually leave');
    console.log('   💡 To stop early: window.stopLeaveCommunities()');
    if (leftIds.size > 0) console.log('   ℹ️ Resuming — will skip already-left communities');
    console.log('   💡 Call XActions.reset() to clear progress.\n');

    // Are we inside a community? Leave it first
    const insideCommunity = /\/i\/communities\/\d+/.test(window.location.href);

    if (insideCommunity) {
      const urlMatch = window.location.href.match(/\/i\/communities\/(\d+)/);
      const id = urlMatch ? urlMatch[1] : null;

      if (id && leftIds.has(id)) {
        console.log(`   ℹ️ Already left community ${id}, navigating back...`);
      } else if (id && whitelistSet.has(id)) {
        console.log(`   🛡️ Whitelisted: community ${id}`);
      } else if (CONFIG.dryRun) {
        console.log(`   🔍 Would leave: community ${id}`);
        if (id) { skippedIds.add(id); leftLog.push({ id, timestamp: new Date().toISOString(), dryRun: true }); left++; }
      } else {
        console.log(`   📍 Inside community ${id}, leaving...`);
        if (await leaveCurrent()) {
          left++;
          console.log(`   ✅ Left community ${id}`);
        } else {
          errors++;
          if (id) skippedIds.add(id);
          console.warn(`   ⚠️ "Joined" button not found (admin or load issue). Skipping community ${id}.`);
        }
      }

      // Navigate back to communities list
      const navLink = $(SEL.communitiesNav);
      if (navLink) {
        navLink.click();
        await sleep(CONFIG.navigationDelay);
      } else {
        window.history.back();
        await sleep(CONFIG.navigationDelay);
      }
    }

    // Main loop: find communities and leave them
    let emptyAttempts = 0;

    while (left < CONFIG.maxLeaves && emptyAttempts < 5) {
      if (!(await shouldContinue())) break;
      if (isRateLimited()) { console.warn('🚨 Rate limit!'); await sleep(CONFIG.rateLimitCooldown); continue; }
      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) { console.error('❌ Too many errors.'); break; }

      // Scroll to load more
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(gaussian(2000, 2500));

      const community = findNextCommunity();
      if (!community) {
        emptyAttempts++;
        if (emptyAttempts >= 5) break;
        await sleep(2000);
        continue;
      }

      emptyAttempts = 0;

      if (CONFIG.dryRun) {
        console.log(`   🔍 Would leave: ${community.name} (${community.id})`);
        skippedIds.add(community.id);
        leftLog.push({ id: community.id, name: community.name, timestamp: new Date().toISOString(), dryRun: true });
        left++;
        continue;
      }

      console.log(`   🏠 Entering ${community.name} (${community.id})...`);
      community.element.click();
      await sleep(CONFIG.navigationDelay);

      const success = await leaveCurrent(community.name);
      if (success) {
        left++;
        consecutiveErrors = 0;
        console.log(`   ✅ Left ${community.name} (${community.id}) [${left} total]`);
      } else {
        errors++;
        consecutiveErrors++;
        skippedIds.add(community.id);
        console.warn(`   ⚠️ Failed to leave ${community.name} (${community.id}): "Joined" button not found (admin or load issue). Skipping it.`);
      }

      await sleep(gaussian(CONFIG.actionDelay * 0.8, CONFIG.actionDelay * 1.2));

      // Navigate back
      const navLink = $(SEL.communitiesNav);
      if (navLink) {
        navLink.click();
      } else {
        window.history.back();
      }
      await sleep(CONFIG.navigationDelay);
    }

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('\n╔' + '═'.repeat(50) + '╗');
    console.log('║  📊 LEAVE COMMUNITIES — RESULTS' + ' '.repeat(18) + '║');
    console.log('╠' + '═'.repeat(50) + '╣');
    console.log(`║  Left this run:    ${String(left).padEnd(28)}║`);
    console.log(`║  Total left:       ${String(leftIds.size).padEnd(28)}║`);
    console.log(`║  Errors:           ${String(errors).padEnd(28)}║`);
    console.log(`║  Whitelisted:      ${String(whitelistSet.size).padEnd(28)}║`);
    console.log(`║  Duration:         ${(elapsed + 's').padEnd(28)}║`);
    console.log('╚' + '═'.repeat(50) + '╝');

    if (CONFIG.exportOnComplete && leftLog.length > 0) {
      const blob = new Blob([JSON.stringify({ summary: { leftThisRun: left, totalLeft: leftIds.size, errors, whitelisted: whitelistSet.size, dryRun: CONFIG.dryRun }, communities: leftLog }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-communities-left-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Results exported.');
    }

    if (CONFIG.dryRun && left > 0) {
      console.log(`\n⚡ Set dryRun = false and re-run to actually leave ${left} communities.`);
    }

    console.log('🐬 So long, and thanks for all the communities!');
  };

  run();
})();

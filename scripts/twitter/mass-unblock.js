// GENERATED FILE: a copy of browser/massUnblock.js, written by scripts/build-script-manifest.mjs. Edit browser/massUnblock.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🔓 Mass Unblock Users — Production Grade
 * ============================================================
 *
 * @name        massUnblock.js
 * @title       Mass Unblock
 * @description Unblock all or selected accounts on your blocked list, with a keep-blocked list, a cap and a dry run by default.
 * @category    cleanup
 * @page        x.com/settings/blocked/all
 * @writes      true
 * @aliases     scripts/massUnblock.js, scripts/twitter/mass-unblock.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/settings/blocked/all
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG. It starts as a dry run (dryRun: true) that only lists
 *    who would be unblocked; set dryRun = false to unblock for real.
 *    maxUnblocks (50 by default) caps one run. Put usernames in
 *    usersToUnblock to unblock only those accounts.
 * 4. Paste browser/massUnblock.js and press Enter
 *
 * 🎮 CONTROLS:
 *   window.XActions.pause()  / .resume() / .abort() / .status()
 *   window.stopMassUnblock() - stop after the current account
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxUnblocks: 50,                  // Max accounts to unblock (or list, in dry run) per run
    keepBlocked: [],                  // Keep these users blocked (without @)
    usersToUnblock: [],               // Only unblock these users (without @); empty = everyone not in keepBlocked
    dryRun: true,                     // SET FALSE TO EXECUTE
    minDelay: 1500,
    maxDelay: 2800,
    scrollDelay: 2000,
    maxEmptyScrolls: 6,
    maxScrolls: 0,                    // Hard cap on total scrolls, 0 = no cap
    maxConsecutiveErrors: 10,
    rateLimitCooldown: 60000,
    exportOnComplete: true,
    saveToStorage: false,             // Append each run's unblocked usernames to localStorage "xactions_unblock_log" (last 50 runs)
  };

  const STORAGE_KEY = 'xactions_unblock_log';

  const SEL = {
    unblockBtn:  ['[data-testid$="-unblock"]', 'button[aria-label*="Unblock"]', 'button[aria-label*="Blocked"]'],
    confirmBtn:  ['[data-testid="confirmationSheetConfirm"]'],
    userCell:    ['[data-testid="UserCell"]'],
    toast:       ['[data-testid="toast"]', '[role="alert"]'],
  };

  const $ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelector(x); if (e) return e; } return null; };
  const $$ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelectorAll(x); if (e.length) return [...e]; } return []; };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));
  const isRateLimited = () => { const t = $(SEL.toast); return t && /rate limit|try again|too many|slow down/i.test(t.textContent); };

  let paused = false, aborted = false;
  let unblocked = 0, skipped = 0, errors = 0, consecutiveErrors = 0;
  const startTime = Date.now();
  const unblockedLog = [];
  const processedUsers = new Set();
  const keepSet = new Set(CONFIG.keepBlocked.map(u => u.toLowerCase().replace(/^@/, '')));
  const onlySet = new Set(CONFIG.usersToUnblock.map(u => u.toLowerCase().replace(/^@/, '')));

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`📊 Unblocked: ${unblocked} | Skipped: ${skipped} | Errors: ${errors} | ${el}s`);
    },
  };

  // Stop switch kept from the scripts/twitter variant (also used by the command center Stop button).
  window.stopMassUnblock = () => {
    aborted = true;
    console.log('🛑 Stop requested. Finishing the current account, then exiting.');
  };

  const shouldContinue = async () => { while (paused && !aborted) await sleep(500); return !aborted; };

  const getUsername = (cell) => {
    const link = cell.querySelector('a[href^="/"]');
    if (link) {
      const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
      if (match) return match[1];
    }
    const spans = cell.querySelectorAll('span');
    for (const s of spans) { const m = s.textContent.match(/^@([A-Za-z0-9_]+)$/); if (m) return m[1]; }
    return null;
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🔓 MASS UNBLOCK USERS' + ' '.repeat(W - 24) + '║');
    console.log('║  by nichxbt — v2.1' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(CONFIG.dryRun
      ? '⚠️  DRY RUN MODE - No accounts will be unblocked. Set CONFIG.dryRun = false to unblock.'
      : '🔴 LIVE MODE - Accounts WILL be unblocked');
    console.log('💡 To stop early: window.stopMassUnblock()');

    if (!window.location.href.includes('/blocked')) {
      console.error('❌ Navigate to x.com/settings/blocked/all first!');
      return;
    }

    console.log(`⚙️ Max: ${CONFIG.maxUnblocks} | Dry run: ${CONFIG.dryRun} | Keep blocked: ${keepSet.size} | Only: ${onlySet.size ? onlySet.size + ' listed' : 'all'}`);

    let emptyScrolls = 0;
    let scrolls = 0;
    const seenOnly = new Set();

    while (unblocked < CONFIG.maxUnblocks && emptyScrolls < CONFIG.maxEmptyScrolls) {
      if (CONFIG.maxScrolls > 0 && scrolls >= CONFIG.maxScrolls) break;
      if (onlySet.size > 0 && seenOnly.size >= onlySet.size) break;
      if (!(await shouldContinue())) break;
      if (isRateLimited()) { console.warn('🚨 Rate limit!'); await sleep(CONFIG.rateLimitCooldown); continue; }

      const cells = $$(SEL.userCell);
      let foundNew = false;

      for (const cell of cells) {
        if (!(await shouldContinue())) break;
        if (unblocked >= CONFIG.maxUnblocks) break;
        if (!cell.isConnected) continue;

        const username = getUsername(cell);
        if (!username || processedUsers.has(username.toLowerCase())) continue;
        processedUsers.add(username.toLowerCase());
        foundNew = true;

        if (keepSet.has(username.toLowerCase())) {
          skipped++;
          console.log(`   🛡️ Keeping blocked: @${username}`);
          continue;
        }

        if (onlySet.size > 0) {
          if (!onlySet.has(username.toLowerCase())) continue;
          seenOnly.add(username.toLowerCase());
        }

        const btn = cell.querySelector('[data-testid$="-unblock"]') || cell.querySelector('button[aria-label*="Blocked"]');
        if (!btn) { errors++; consecutiveErrors++; continue; }

        if (CONFIG.dryRun) {
          console.log(`   🔍 Would unblock: @${username}`);
          unblockedLog.push({ username, timestamp: new Date().toISOString(), dryRun: true });
          unblocked++;
          continue;
        }

        try {
          cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(300);
          btn.click();
          await sleep(gaussian(400, 700));
          const confirm = $(SEL.confirmBtn);
          if (confirm) { confirm.click(); await sleep(gaussian(300, 500)); }

          unblocked++;
          consecutiveErrors = 0;
          unblockedLog.push({ username, timestamp: new Date().toISOString() });

          if (unblocked % 10 === 0) {
            const rate = (unblocked / ((Date.now() - startTime) / 60000)).toFixed(1);
            console.log(`🔓 Unblocked ${unblocked} users | ${rate}/min`);
          }
          await sleep(gaussian(CONFIG.minDelay, CONFIG.maxDelay));
        } catch (e) {
          errors++;
          consecutiveErrors++;
          console.log(`   ❌ Failed to unblock @${username}`);
          if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) { console.error('❌ Too many errors.'); break; }
        }
      }

      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) break;
      if (!foundNew) emptyScrolls++; else emptyScrolls = 0;
      window.scrollTo(0, document.body.scrollHeight);
      scrolls++;
      await sleep(gaussian(CONFIG.scrollDelay, CONFIG.scrollDelay + 800));
    }

    if (aborted) console.log('🛑 Stopped by user.');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('\n╔' + '═'.repeat(48) + '╗');
    console.log('║  📊 MASS UNBLOCK — RESULTS' + ' '.repeat(21) + '║');
    console.log('╠' + '═'.repeat(48) + '╣');
    console.log(`║  Unblocked:   ${String(unblocked).padEnd(31)}║`);
    console.log(`║  Skipped:     ${String(skipped).padEnd(31)}║`);
    console.log(`║  Errors:      ${String(errors).padEnd(31)}║`);
    console.log(`║  Duration:    ${(elapsed + 's').padEnd(31)}║`);
    console.log('╚' + '═'.repeat(48) + '╝');

    if (onlySet.size > 0) {
      const notFound = [...onlySet].filter(u => !seenOnly.has(u));
      if (notFound.length > 0) console.log(`⚠️  Not found in blocked list: ${notFound.join(', ')}`);
    }

    if (CONFIG.dryRun) console.log('⚠️  DRY RUN - No unblocks performed. Set CONFIG.dryRun = false to actually unblock.');

    if (CONFIG.saveToStorage && !CONFIG.dryRun) {
      try {
        const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        existing.push({ timestamp: new Date().toISOString(), unblocked: unblockedLog.map(e => e.username) });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-50)));
        console.log(`💾 Results saved to localStorage "${STORAGE_KEY}"`);
      } catch (e) {
        console.warn('⚠️ Could not save to localStorage:', e.message);
      }
    }

    if (CONFIG.exportOnComplete && unblockedLog.length > 0) {
      const blob = new Blob([JSON.stringify({ summary: { unblocked, skipped, errors, dryRun: CONFIG.dryRun }, accounts: unblockedLog }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-unblocked-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Results exported.');
    }
  };

  run();
})();

/**
 * ============================================================
 * 🔓 Mass Unblock Users — Production Grade
 * ============================================================
 *
 * @name        massUnblock.js
 * @description Unblock all or selected users from your blocked
 *              list. Supports whitelist (keep-blocked), rate-limit
 *              detection, pause/resume, progress tracking, export.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/settings/blocked/all
 * 2. Open DevTools Console (F12)
 * 3. Paste and run
 *
 * 🎮 CONTROLS:
 *   window.XActions.pause()  / .resume() / .abort() / .status()
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxUnblocks: Infinity,
    keepBlocked: [],                  // Keep these users blocked (without @)
    dryRun: false,
    minDelay: 1000,
    maxDelay: 2800,
    scrollDelay: 2000,
    maxEmptyScrolls: 6,
    maxConsecutiveErrors: 10,
    rateLimitCooldown: 60000,
    exportOnComplete: true,
  };

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

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`📊 Unblocked: ${unblocked} | Skipped: ${skipped} | Errors: ${errors} | ${el}s`);
    },
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
    console.log('║  by nichxbt — v2.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (!window.location.href.includes('/blocked')) {
      console.error('❌ Navigate to x.com/settings/blocked/all first!');
      return;
    }

    console.log(`⚙️ Max: ${CONFIG.maxUnblocks === Infinity ? '∞' : CONFIG.maxUnblocks} | Dry run: ${CONFIG.dryRun} | Keep blocked: ${keepSet.size}`);

    let emptyScrolls = 0;

    while (unblocked < CONFIG.maxUnblocks && emptyScrolls < CONFIG.maxEmptyScrolls) {
      if (!(await shouldContinue())) break;
      if (isRateLimited()) { console.warn('🚨 Rate limit!'); await sleep(CONFIG.rateLimitCooldown); continue; }

      const cells = $$(SEL.userCell);
      let foundNew = false;

      for (const cell of cells) {
        if (!(await shouldContinue())) break;
        if (unblocked >= CONFIG.maxUnblocks) break;

        const username = getUsername(cell);
        if (!username || processedUsers.has(username.toLowerCase())) continue;
        processedUsers.add(username.toLowerCase());
        foundNew = true;

        if (keepSet.has(username.toLowerCase())) {
          skipped++;
          console.log(`   🛡️ Keeping blocked: @${username}`);
          continue;
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
          if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) { console.error('❌ Too many errors.'); break; }
        }
      }

      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) break;
      if (!foundNew) emptyScrolls++; else emptyScrolls = 0;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(gaussian(CONFIG.scrollDelay, CONFIG.scrollDelay + 800));
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('\n╔' + '═'.repeat(48) + '╗');
    console.log('║  📊 MASS UNBLOCK — RESULTS' + ' '.repeat(21) + '║');
    console.log('╠' + '═'.repeat(48) + '╣');
    console.log(`║  Unblocked:   ${String(unblocked).padEnd(31)}║`);
    console.log(`║  Skipped:     ${String(skipped).padEnd(31)}║`);
    console.log(`║  Errors:      ${String(errors).padEnd(31)}║`);
    console.log(`║  Duration:    ${(elapsed + 's').padEnd(31)}║`);
    console.log('╚' + '═'.repeat(48) + '╝');

    if (CONFIG.exportOnComplete && unblockedLog.length > 0) {
      const blob = new Blob([JSON.stringify({ summary: { unblocked, skipped, errors }, accounts: unblockedLog }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-unblocked-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Results exported.');
    }
  };

  run();
})();

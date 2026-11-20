// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🔊 Mass Unmute Users — Production Grade
 * ============================================================
 *
 * @name        massUnmute.js
 * @description Unmute all or selected users from your muted list.
 *              Supports keep-muted filter, rate-limit detection,
 *              pause/resume, progress tracking, and export.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/settings/muted/all
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
    maxUnmutes: Infinity,
    keepMuted: [],                    // Keep these users muted (without @)
    dryRun: false,
    minDelay: 800,
    maxDelay: 2200,
    scrollDelay: 1800,
    maxEmptyScrolls: 6,
    maxConsecutiveErrors: 10,
    rateLimitCooldown: 60000,
    exportOnComplete: true,
  };

  const SEL = {
    unmuteBtn: ['[data-testid$="-unmute"]', 'button[aria-label*="Unmute"]', 'button[aria-label*="Muted"]'],
    userCell:  ['[data-testid="UserCell"]'],
    toast:     ['[data-testid="toast"]', '[role="alert"]'],
  };

  const $ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelector(x); if (e) return e; } return null; };
  const $$ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelectorAll(x); if (e.length) return [...e]; } return []; };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));
  const isRateLimited = () => { const t = $(SEL.toast); return t && /rate limit|try again|too many|slow down/i.test(t.textContent); };

  let paused = false, aborted = false;
  let unmuted = 0, skipped = 0, errors = 0, consecutiveErrors = 0;
  const startTime = Date.now();
  const unmutedLog = [];
  const processedUsers = new Set();
  const keepSet = new Set(CONFIG.keepMuted.map(u => u.toLowerCase().replace(/^@/, '')));

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`📊 Unmuted: ${unmuted} | Skipped: ${skipped} | Errors: ${errors} | ${el}s`);
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
    console.log('║  🔊 MASS UNMUTE USERS' + ' '.repeat(W - 23) + '║');
    console.log('║  by nichxbt — v2.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (!window.location.href.includes('/muted')) {
      console.error('❌ Navigate to x.com/settings/muted/all first!');
      return;
    }

    console.log(`⚙️ Max: ${CONFIG.maxUnmutes === Infinity ? '∞' : CONFIG.maxUnmutes} | Dry run: ${CONFIG.dryRun} | Keep muted: ${keepSet.size}`);

    let emptyScrolls = 0;

    while (unmuted < CONFIG.maxUnmutes && emptyScrolls < CONFIG.maxEmptyScrolls) {
      if (!(await shouldContinue())) break;
      if (isRateLimited()) { console.warn('🚨 Rate limit!'); await sleep(CONFIG.rateLimitCooldown); continue; }

      const cells = $$(SEL.userCell);
      let foundNew = false;

      for (const cell of cells) {
        if (!(await shouldContinue())) break;
        if (unmuted >= CONFIG.maxUnmutes) break;

        const username = getUsername(cell);
        if (!username || processedUsers.has(username.toLowerCase())) continue;
        processedUsers.add(username.toLowerCase());
        foundNew = true;

        if (keepSet.has(username.toLowerCase())) {
          skipped++;
          continue;
        }

        const btn = cell.querySelector('[data-testid$="-unmute"]') || cell.querySelector('button[aria-label*="Muted"]');
        if (!btn) { errors++; consecutiveErrors++; continue; }

        if (CONFIG.dryRun) {
          console.log(`   🔍 Would unmute: @${username}`);
          unmutedLog.push({ username, timestamp: new Date().toISOString(), dryRun: true });
          unmuted++;
          continue;
        }

        try {
          btn.click();
          unmuted++;
          consecutiveErrors = 0;
          unmutedLog.push({ username, timestamp: new Date().toISOString() });

          if (unmuted % 10 === 0) {
            const rate = (unmuted / ((Date.now() - startTime) / 60000)).toFixed(1);
            console.log(`🔊 Unmuted ${unmuted} users | ${rate}/min`);
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
    console.log('║  📊 MASS UNMUTE — RESULTS' + ' '.repeat(22) + '║');
    console.log('╠' + '═'.repeat(48) + '╣');
    console.log(`║  Unmuted:     ${String(unmuted).padEnd(31)}║`);
    console.log(`║  Skipped:     ${String(skipped).padEnd(31)}║`);
    console.log(`║  Errors:      ${String(errors).padEnd(31)}║`);
    console.log(`║  Duration:    ${(elapsed + 's').padEnd(31)}║`);
    console.log('╚' + '═'.repeat(48) + '╝');

    if (CONFIG.exportOnComplete && unmutedLog.length > 0) {
      const blob = new Blob([JSON.stringify({ summary: { unmuted, skipped, errors }, accounts: unmutedLog }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-unmuted-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Results exported.');
    }
  };

  run();
})();

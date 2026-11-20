// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🚫 Unfollow Everyone — Production Grade
 * ============================================================
 *
 * @name        unfollowEveryone.js
 * @description Unfollow every account you follow on X/Twitter.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     3.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME/following
 * 2. Open DevTools Console (F12)
 * 3. (Optional) Paste src/utils/core.js first for pause/resume
 * 4. Paste this script and press Enter
 *
 * CONTROLS (while running):
 *   XActionsUtils.pause()   — pause the script
 *   XActionsUtils.resume()  — resume the script
 *   XActionsUtils.abort()   — stop entirely
 *
 * ============================================================
 */
(() => {
  'use strict';

  // ══════════════════════════════════════════════════════════
  // ⚙️  CONFIGURATION — Edit these before running
  // ══════════════════════════════════════════════════════════

  const CONFIG = {
    maxUnfollows: Infinity,         // Set to e.g. 50 for testing
    minDelay: 1200,                 // Minimum ms between unfollows
    maxDelay: 3000,                 // Maximum ms between unfollows
    scrollDelay: 2000,              // Delay after scrolling for new content
    confirmDelay: 600,              // Wait after clicking confirm dialog

    whitelist: [                    // NEVER unfollow these usernames (lowercase)
      // 'elonmusk',
      // 'nichxbt',
    ],
    dryRun: false,                  // true = log what WOULD happen, don't act

    maxRetries: 8,                  // Empty scrolls before giving up
    maxConsecutiveErrors: 5,        // Errors in a row before aborting
    rateLimitPauseMs: 60000,        // Cooldown when rate-limited (60s)

    trackUnfollowed: true,          // Persist log to localStorage
    exportOnComplete: true,         // Auto-download JSON when done
  };

  // ══════════════════════════════════════════════════════════
  // 🔧 Inline Utilities (standalone — no dependencies needed)
  // ══════════════════════════════════════════════════════════

  const U = window.XActionsUtils || (() => {
    const sleep = ms => new Promise(r => setTimeout(r, ms + ms * 0.15 * (Math.random() - 0.5)));
    const randomDelay = (lo, hi) => sleep(lo + Math.random() * (hi - lo));

    const SELS = {
      unfollow:   ['[data-testid$="-unfollow"]', 'button[aria-label*="Following @"]'],
      confirmBtn: ['[data-testid="confirmationSheetConfirm"]', '[role="alertdialog"] button:first-child'],
      userCell:   ['[data-testid="UserCell"]', 'div[role="listitem"]'],
    };

    const $ = (key, root = document) => {
      for (const s of (SELS[key] || [key])) { try { const e = root.querySelector(s); if (e) return e; } catch {} } return null;
    };
    const $$ = (key, root = document) => {
      const r = new Set(); for (const s of (SELS[key] || [key])) { try { root.querySelectorAll(s).forEach(e => r.add(e)); } catch {} } return [...r];
    };

    let _p = false, _a = false;
    return {
      sleep, randomDelay, $, $$,
      pause()  { _p = true; console.log('⏸️  PAUSED — call XActionsUtils.resume()'); },
      resume() { _p = false; console.log('▶️  RESUMED'); },
      abort()  { _a = true; _p = false; console.log('🛑 ABORTED'); },
      async shouldContinue() { if (_a) return false; while (_p) { await sleep(500); if (_a) return false; } return true; },
      isRateLimited() {
        for (const sel of ['[data-testid="toast"]', '[role="alert"]']) {
          const el = document.querySelector(sel);
          if (el && /rate.limit|try.again|too.many|slow.down|something.went.wrong/i.test(el.textContent)) return true;
        }
        return false;
      },
      saveState(k, d) { try { localStorage.setItem('xactions_' + k, JSON.stringify({ _ts: Date.now(), data: d })); } catch {} },
      loadState(k, d) { try { const r = JSON.parse(localStorage.getItem('xactions_' + k)); return r?.data ?? d; } catch { return d; } },
      download(data, fn) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        a.download = fn; document.body.appendChild(a); a.click(); a.remove();
        console.log(`📥 Downloaded: ${fn}`);
      },
    };
  })();

  // ══════════════════════════════════════════════════════════
  // 🚀 Main Logic
  // ══════════════════════════════════════════════════════════

  (async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🚫 UNFOLLOW EVERYONE' + ' '.repeat(W - 23) + '║');
    console.log('║  ' + (CONFIG.dryRun ? '🔍 DRY RUN' : '⚡ LIVE').padEnd(W - 2) + '║');
    console.log('║  by nichxbt — v3.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    // Page check
    if (!window.location.href.includes('/following')) {
      console.error('❌ Wrong page! Go to x.com/YOUR_USERNAME/following');
      return;
    }

    console.log(`\n⚙️  Max: ${CONFIG.maxUnfollows === Infinity ? '∞' : CONFIG.maxUnfollows} | ` +
      `Delay: ${CONFIG.minDelay}-${CONFIG.maxDelay}ms | Whitelist: ${CONFIG.whitelist.length} | ` +
      `Dry: ${CONFIG.dryRun}\n`);

    const whiteSet = new Set(CONFIG.whitelist.map(u => u.toLowerCase()));
    const log = CONFIG.trackUnfollowed ? U.loadState('unfollow_everyone_log', []) : [];
    let unfollowed = 0, skipped = 0, errors = 0, consErr = 0, retries = 0;
    const t0 = Date.now();

    const getUser = (cell) => {
      for (const link of cell.querySelectorAll('a[href^="/"]')) {
        const m = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)$/);
        if (m) return m[1];
      }
      return null;
    };

    while (unfollowed < CONFIG.maxUnfollows) {
      if (!(await U.shouldContinue())) break;

      if (U.isRateLimited()) {
        console.warn(`⏳ Rate-limited — cooling down ${CONFIG.rateLimitPauseMs / 1000}s...`);
        await U.sleep(CONFIG.rateLimitPauseMs);
        continue;
      }

      const cells = U.$$('userCell');
      let acted = false;

      for (const cell of cells) {
        if (unfollowed >= CONFIG.maxUnfollows) break;
        if (!(await U.shouldContinue())) break;

        const user = getUser(cell);
        if (user && whiteSet.has(user.toLowerCase())) { skipped++; continue; }

        const btn = U.$('unfollow', cell);
        if (!btn) continue;

        if (CONFIG.dryRun) {
          console.log(`🔍 [DRY] Would unfollow @${user || '?'}`);
          unfollowed++; acted = true; continue;
        }

        try {
          btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
          await U.sleep(200);
          btn.click();
          await U.sleep(CONFIG.confirmDelay);

          const conf = U.$('confirmBtn');
          if (conf) {
            conf.click();
            unfollowed++; consErr = 0; acted = true;

            if (unfollowed <= 3 || unfollowed % 5 === 0) {
              console.log(`🚫 #${unfollowed} Unfollowed @${user || '?'}`);
            }
            if (unfollowed % 25 === 0) {
              const s = ((Date.now() - t0) / 1000).toFixed(0);
              const r = (unfollowed / ((Date.now() - t0) / 60000)).toFixed(1);
              console.log(`📊 ${unfollowed} done | ${skipped} skipped | ${errors} err | ${s}s | ${r}/min`);
            }

            if (CONFIG.trackUnfollowed && user) {
              log.push({ u: user, t: new Date().toISOString() });
              if (unfollowed % 10 === 0) U.saveState('unfollow_everyone_log', log);
            }

            await U.randomDelay(CONFIG.minDelay, CONFIG.maxDelay);
          } else {
            console.warn(`⚠️ No confirm for @${user || '?'}`);
            errors++; consErr++;
            await U.sleep(1500);
          }
        } catch (e) {
          console.warn(`⚠️ Error: ${e.message}`);
          errors++; consErr++;
          await U.sleep(2000);
        }

        if (consErr >= CONFIG.maxConsecutiveErrors) {
          console.error(`❌ ${consErr} consecutive errors — aborting.`);
          break;
        }
      }

      if (consErr >= CONFIG.maxConsecutiveErrors) break;

      if (!acted) {
        retries++;
        if (retries >= CONFIG.maxRetries) {
          console.log(`\n✅ No more accounts found after ${retries} scrolls.`);
          break;
        }
      } else {
        retries = 0;
      }

      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      await U.sleep(CONFIG.scrollDelay);
    }

    // ── Results ──────────────────────────────────────────────

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const rate = unfollowed > 0 ? (unfollowed / ((Date.now() - t0) / 60000)).toFixed(1) : '0';

    console.log('\n╔' + '═'.repeat(W) + '╗');
    console.log('║  ✅ COMPLETE' + ' '.repeat(W - 13) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`  🚫 Unfollowed: ${unfollowed}`);
    console.log(`  ⏭️  Skipped:    ${skipped}`);
    console.log(`  ⚠️  Errors:     ${errors}`);
    console.log(`  ⏱️  Time:       ${elapsed}s (${rate}/min)`);

    if (CONFIG.trackUnfollowed && log.length > 0) {
      U.saveState('unfollow_everyone_log', log);
      console.log(`  💾 Log saved (${log.length} total unfollows)`);
    }

    if (CONFIG.exportOnComplete && log.length > 0 && !CONFIG.dryRun) {
      U.download(
        { unfollowed: log, stats: { total: unfollowed, skipped, errors, elapsed: elapsed + 's' } },
        `xactions-unfollow-${new Date().toISOString().slice(0, 10)}.json`
      );
    }

    console.log('\n  💡 Reload & re-run if any were missed.\n');
  })();
})();

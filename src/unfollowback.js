/**
 * ============================================================
 * 🔙 Unfollow Non-Followers — Production Grade
 * ============================================================
 *
 * @name        unfollowback.js
 * @description Unfollow accounts that do NOT follow you back.
 *              Detects "Follows you" badge per user cell and
 *              only unfollows those missing it. Whitelist
 *              protection, dry-run, rate-limit detection,
 *              pause/resume, full export of unfollowed list.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME/following
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG below (whitelist, dryRun, etc.)
 * 4. Paste and run
 *
 * 🎮 CONTROLS:
 *   window.XActions.pause()   — Pause after current action
 *   window.XActions.resume()  — Resume
 *   window.XActions.abort()   — Stop permanently
 *   window.XActions.status()  — Show progress
 * ============================================================
 */
(() => {
  'use strict';

  // ── Configuration ──────────────────────────────────────────
  const CONFIG = {
    maxUnfollows: Infinity,           // Cap total unfollows
    whitelist: [],                    // Usernames to never unfollow (without @)
    dryRun: true,                     // Preview without unfollowing — SET FALSE TO RUN
    minDelay: 1500,                   // Minimum ms between actions
    maxDelay: 3500,                   // Maximum ms between actions
    scrollDelay: 2000,                // Wait after scroll for DOM to load
    maxConsecutiveErrors: 8,          // Abort after N errors in a row
    maxEmptyScrolls: 6,              // Give up after N scrolls with no new users
    rateLimitCooldown: 60000,         // 60s cooldown on rate limit
    exportOnComplete: true,           // Auto-download JSON results
  };

  // ── Selector Fallback Chains ────────────────────────────────
  const SEL = {
    unfollowBtn: ['[data-testid$="-unfollow"]', 'button[aria-label*="Following @"]'],
    confirmBtn:  ['[data-testid="confirmationSheetConfirm"]', '[role="button"][data-testid="confirmationSheetConfirm"]'],
    userCell:    ['[data-testid="UserCell"]', '[data-testid="cellInnerDiv"]'],
    followsYou:  ['[data-testid="userFollowIndicator"]', 'span[data-testid="userFollowIndicator"]'],
    toast:       ['[data-testid="toast"]', '[role="alert"]'],
  };

  const $ = (sel, ctx = document) => {
    const arr = Array.isArray(sel) ? sel : [sel];
    for (const s of arr) { const el = ctx.querySelector(s); if (el) return el; }
    return null;
  };
  const $$ = (sel, ctx = document) => {
    const arr = Array.isArray(sel) ? sel : [sel];
    for (const s of arr) { const els = ctx.querySelectorAll(s); if (els.length) return [...els]; }
    return [];
  };

  // ── Utilities ──────────────────────────────────────────────
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (min, max) => {
    const u = (Math.random() + Math.random()) / 2;
    return Math.floor(min + u * (max - min));
  };

  const isRateLimited = () => {
    const toast = $(SEL.toast);
    if (!toast) return false;
    const t = toast.textContent.toLowerCase();
    return /rate limit|try again|too many|slow down|limit/.test(t);
  };

  // ── State ──────────────────────────────────────────────────
  let paused = false, aborted = false;
  let unfollowed = 0, scanned = 0, skippedFollowsBack = 0, skippedWhitelist = 0, errors = 0, consecutiveErrors = 0;
  const startTime = Date.now();
  const unfollowedList = [];
  const processedUsers = new Set();
  const whitelistSet = new Set(CONFIG.whitelist.map(u => u.toLowerCase().replace(/^@/, '')));

  // Load previously processed from localStorage
  const STORAGE_KEY = 'xactions_unfollowback';
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.processed) saved.processed.forEach(u => processedUsers.add(u));
  } catch {}

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        processed: [...processedUsers],
        unfollowed: unfollowedList,
        lastRun: new Date().toISOString(),
      }));
    } catch {}
  };

  // ── Controls ──────────────────────────────────────────────
  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused. Call XActions.resume() to continue.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting after current action...'); },
    status() {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const rate = unfollowed > 0 ? (unfollowed / (elapsed / 60)).toFixed(1) : '0';
      console.log(`📊 Unfollowed: ${unfollowed} | Scanned: ${scanned} | Follows back: ${skippedFollowsBack} | Whitelisted: ${skippedWhitelist} | Errors: ${errors} | Rate: ${rate}/min | Elapsed: ${elapsed}s`);
    },
  };

  const shouldContinue = async () => {
    while (paused && !aborted) await sleep(500);
    return !aborted;
  };

  // ── Extract Username from Cell ────────────────────────────
  const getUsername = (cell) => {
    // Try multiple approaches
    const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
    if (link) {
      const href = link.getAttribute('href') || '';
      const match = href.match(/^\/([A-Za-z0-9_]+)/);
      if (match && !['home', 'explore', 'notifications', 'messages', 'i'].includes(match[1])) {
        return match[1];
      }
    }
    // Fallback: find @username text
    const spans = cell.querySelectorAll('span');
    for (const span of spans) {
      const m = span.textContent.match(/^@([A-Za-z0-9_]+)$/);
      if (m) return m[1];
    }
    return null;
  };

  // ── Main Logic ─────────────────────────────────────────────
  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🔙 UNFOLLOW NON-FOLLOWERS' + ' '.repeat(W - 28) + '║');
    console.log('║  by nichxbt — v2.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (!window.location.href.includes('/following')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/following first!');
      return;
    }

    console.log(`\n⚙️ Config:`);
    console.log(`   Max unfollows:  ${CONFIG.maxUnfollows === Infinity ? 'unlimited' : CONFIG.maxUnfollows}`);
    console.log(`   Whitelist:      ${whitelistSet.size > 0 ? [...whitelistSet].join(', ') : 'none'}`);
    console.log(`   Dry run:        ${CONFIG.dryRun ? 'YES (preview only)' : 'NO — LIVE MODE'}`);

    if (CONFIG.dryRun) {
      console.log('\n⚠️  DRY RUN — no accounts will be unfollowed.');
      console.log('   Set CONFIG.dryRun = false to execute.\n');
    }

    let emptyScrolls = 0;

    while (unfollowed < CONFIG.maxUnfollows && emptyScrolls < CONFIG.maxEmptyScrolls) {
      if (!(await shouldContinue())) break;

      // Rate limit check
      if (isRateLimited()) {
        console.warn(`🚨 Rate limit detected! Cooling down ${CONFIG.rateLimitCooldown / 1000}s...`);
        await sleep(CONFIG.rateLimitCooldown);
        continue;
      }

      const cells = $$(SEL.userCell);
      let foundNew = false;

      for (const cell of cells) {
        if (!(await shouldContinue())) break;
        if (unfollowed >= CONFIG.maxUnfollows) break;

        const username = getUsername(cell);
        if (!username || processedUsers.has(username.toLowerCase())) continue;

        processedUsers.add(username.toLowerCase());
        foundNew = true;
        scanned++;

        // Check if follows you back
        const followsYou = $(SEL.followsYou, cell);
        if (followsYou) {
          skippedFollowsBack++;
          continue;
        }

        // Check whitelist
        if (whitelistSet.has(username.toLowerCase())) {
          skippedWhitelist++;
          console.log(`   🛡️ Whitelisted: @${username}`);
          continue;
        }

        // This user doesn't follow back and isn't whitelisted
        if (CONFIG.dryRun) {
          console.log(`   🔍 Would unfollow: @${username}`);
          unfollowedList.push({ username, timestamp: new Date().toISOString(), dryRun: true });
          unfollowed++;
          continue;
        }

        // Click unfollow button
        const unfollowBtn = $(SEL.unfollowBtn, cell);
        if (!unfollowBtn) {
          errors++;
          consecutiveErrors++;
          if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
            console.error(`❌ ${CONFIG.maxConsecutiveErrors} consecutive errors — aborting for safety.`);
            break;
          }
          continue;
        }

        try {
          unfollowBtn.click();
          await sleep(gaussian(400, 800));

          const confirmBtn = $(SEL.confirmBtn);
          if (confirmBtn) {
            confirmBtn.click();
            await sleep(gaussian(300, 600));
          }

          unfollowed++;
          consecutiveErrors = 0;
          unfollowedList.push({ username, timestamp: new Date().toISOString() });

          if (unfollowed % 5 === 0 || unfollowed <= 3) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
            const rate = (unfollowed / (elapsed / 60)).toFixed(1);
            console.log(`   🔙 Unfollowed: @${username}  [${unfollowed} total | ${rate}/min | scanned: ${scanned}]`);
          }

          persist();
          await sleep(gaussian(CONFIG.minDelay, CONFIG.maxDelay));
        } catch (e) {
          errors++;
          consecutiveErrors++;
          console.warn(`   ⚠️ Error unfollowing @${username}: ${e.message}`);
          if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
            console.error(`❌ ${CONFIG.maxConsecutiveErrors} consecutive errors — aborting.`);
            break;
          }
        }
      }

      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) break;

      if (!foundNew) {
        emptyScrolls++;
        if (emptyScrolls >= CONFIG.maxEmptyScrolls) break;
      } else {
        emptyScrolls = 0;
      }

      // Scroll for more
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(gaussian(CONFIG.scrollDelay, CONFIG.scrollDelay + 1000));
    }

    // ── Summary ─────────────────────────────────────────────
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('\n╔' + '═'.repeat(50) + '╗');
    console.log('║  📊 RESULTS' + ' '.repeat(38) + '║');
    console.log('╠' + '═'.repeat(50) + '╣');
    console.log(`║  Scanned:          ${String(scanned).padEnd(29)}║`);
    console.log(`║  Unfollowed:       ${String(unfollowed).padEnd(29)}║`);
    console.log(`║  Follows back:     ${String(skippedFollowsBack).padEnd(29)}║`);
    console.log(`║  Whitelisted:      ${String(skippedWhitelist).padEnd(29)}║`);
    console.log(`║  Errors:           ${String(errors).padEnd(29)}║`);
    console.log(`║  Duration:         ${(elapsed + 's').padEnd(29)}║`);
    console.log('╚' + '═'.repeat(50) + '╝');

    persist();

    if (CONFIG.exportOnComplete && unfollowedList.length > 0) {
      const data = {
        summary: { scanned, unfollowed, skippedFollowsBack, skippedWhitelist, errors, dryRun: CONFIG.dryRun },
        accounts: unfollowedList,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `xactions-unfollowback-${CONFIG.dryRun ? 'preview' : 'results'}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Results exported as JSON.');
    }
  };

  run();
})();

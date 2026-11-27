// GENERATED FILE: a copy of browser/unfollowWDFBLog.js, written by scripts/build-script-manifest.mjs. Edit browser/unfollowWDFBLog.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 📝 Unfollow Non-Followers with Full Log — Production Grade
 * ============================================================
 *
 * @name        unfollowWDFBLog.js
 * @title       Unfollow Non-Followers With Log
 * @description Unfollow accounts that don't follow you back and download a JSON, CSV or text log of every account, with a dry run and a whitelist.
 * @category    cleanup
 * @page        x.com/<you>/following
 * @writes      true
 * @aliases     scripts/unfollowWDFBLog.js, scripts/twitter/unfollow-with-log.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME/following
 * 2. Open DevTools Console (F12)
 * 3. Paste browser/unfollowWDFBLog.js and run. Results auto-download as JSON+CSV.
 *    It starts as a dry run (dryRun: true). With dryRun false it asks for
 *    confirmation before the first unfollow (confirmBeforeStart).
 *
 * 🎮 CONTROLS:
 *   window.XActions.pause()   — Pause
 *   window.XActions.resume()  — Resume
 *   window.XActions.abort()   — Stop
 *   window.XActions.status()  — Progress
 *   window.XActions.export()  — Force export now
 *   window.stopUnfollow()     - Stop after the current account
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxUnfollows: Infinity,
    whitelist: [],
    dryRun: true,
    confirmBeforeStart: true,     // Live mode: ask for confirmation before the first unfollow
    minDelay: 2000,
    maxDelay: 4000,
    scrollDelay: 2000,
    maxConsecutiveErrors: 8,
    maxEmptyScrolls: 6,
    rateLimitCooldown: 60000,
    logLevel: 'verbose',          // 'verbose' | 'normal' | 'quiet'
    exportFormat: 'both',         // 'json' | 'csv' | 'both'
    exportTxt: false,             // Also download a plain-text log (unfollowed + kept mutuals)
    includeTimestamp: true,       // Text log: add the unfollow time to each line
    logKept: false,               // Print each mutual follower that is kept
  };

  const SEL = {
    unfollowBtn: ['[data-testid$="-unfollow"]', 'button[aria-label*="Following @"]'],
    confirmBtn:  ['[data-testid="confirmationSheetConfirm"]'],
    userCell:    ['[data-testid="UserCell"]', '[data-testid="cellInnerDiv"]'],
    followsYou:  ['[data-testid="userFollowIndicator"]'],
    toast:       ['[data-testid="toast"]', '[role="alert"]'],
  };

  const $ = (sel, ctx = document) => {
    for (const s of (Array.isArray(sel) ? sel : [sel])) { const e = ctx.querySelector(s); if (e) return e; }
    return null;
  };
  const $$ = (sel, ctx = document) => {
    for (const s of (Array.isArray(sel) ? sel : [sel])) { const e = ctx.querySelectorAll(s); if (e.length) return [...e]; }
    return [];
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (min, max) => Math.floor(min + ((Math.random() + Math.random()) / 2) * (max - min));

  const isRateLimited = () => {
    const t = $(SEL.toast);
    return t && /rate limit|try again|too many|slow down/i.test(t.textContent);
  };

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const m = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
    return Math.round(n);
  };

  // ── State ──────────────────────────────────────────────────
  let paused = false, aborted = false;
  let unfollowed = 0, scanned = 0, errors = 0, consecutiveErrors = 0;
  const startTime = Date.now();
  const log = [];       // Full log of unfollowed accounts
  const keptList = [];  // Mutual followers seen and kept this run
  const processedUsers = new Set();
  const whitelistSet = new Set(CONFIG.whitelist.map(u => u.toLowerCase().replace(/^@/, '')));

  // Restore from localStorage
  const STORAGE_KEY = 'xactions_unfollowWDFBLog';
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.processed) saved.processed.forEach(u => processedUsers.add(u));
    if (saved.log) saved.log.forEach(entry => log.push(entry));
  } catch {}

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        processed: [...processedUsers],
        log,
        lastRun: new Date().toISOString(),
      }));
    } catch {}
  };

  // ── Controls ──────────────────────────────────────────────
  const showStatus = () => {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const rate = unfollowed > 0 ? (unfollowed / (elapsed / 60)).toFixed(1) : '0';
    console.log(`📊 Unfollowed: ${unfollowed} | Scanned: ${scanned} | Errors: ${errors} | ${rate}/min | ${elapsed}s`);
  };

  const exportNow = () => {
    if (log.length === 0) { console.log('Nothing to export.'); return; }
    const ts = new Date().toISOString().slice(0, 10);
    const tag = CONFIG.dryRun ? 'preview' : 'results';

    if (CONFIG.exportFormat === 'json' || CONFIG.exportFormat === 'both') {
      const data = { summary: { scanned, unfollowed, kept: keptList.length, errors, dryRun: CONFIG.dryRun, exportedAt: new Date().toISOString() }, accounts: log, kept: keptList };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-unfollowlog-${tag}-${ts}.json`;
      document.body.appendChild(a); a.click(); a.remove();
    }

    if (CONFIG.exportFormat === 'csv' || CONFIG.exportFormat === 'both') {
      const header = 'username,displayName,bio,followers,following,unfollowedAt,hasAvatar\n';
      const rows = log.map(r =>
        `"${r.username}","${(r.displayName || '').replace(/"/g, '""')}","${(r.bio || '').replace(/"/g, '""').replace(/\n/g, ' ')}",${r.followers || 0},${r.following || 0},"${r.timestamp}",${r.hasAvatar !== false}`
      ).join('\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-unfollowlog-${tag}-${ts}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
    }

    if (CONFIG.exportTxt) {
      const duration = Math.round((Date.now() - startTime) / 1000 / 60);
      let txt = `UNFOLLOW LOG${CONFIG.dryRun ? ' (DRY RUN PREVIEW)' : ''}\n`;
      txt += `${'='.repeat(50)}\n`;
      txt += `Date: ${new Date(startTime).toISOString()}\n`;
      txt += `Total Unfollowed: ${log.length}\n`;
      txt += `Total Kept (Mutual): ${keptList.length}\n`;
      txt += `Duration: ${duration} minutes\n`;
      txt += `${'='.repeat(50)}\n\n`;
      txt += `UNFOLLOWED ACCOUNTS:\n${'-'.repeat(30)}\n`;
      log.forEach((u, i) => {
        txt += `${i + 1}. @${u.username} (${u.displayName || 'Unknown'})${CONFIG.includeTimestamp ? ` - ${u.timestamp}` : ''}\n`;
      });
      txt += `\n\nKEPT ACCOUNTS (MUTUAL FOLLOWERS):\n${'-'.repeat(30)}\n`;
      keptList.forEach((u, i) => {
        txt += `${i + 1}. @${u.username} (${u.displayName || 'Unknown'})\n`;
      });
      const blob = new Blob([txt], { type: 'text/plain' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-unfollowlog-${tag}-${ts}.txt`;
      document.body.appendChild(a); a.click(); a.remove();
    }

    window.unfollowLog = { unfollowed: log, kept: keptList };
    console.log('📥 Exported. Data also in window.unfollowLog');
  };

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status:  showStatus,
    export:  exportNow,
  };
  window.stopUnfollow = () => {
    aborted = true;
    console.log('🛑 Stopping after the current account...');
  };

  const shouldContinue = async () => {
    while (paused && !aborted) await sleep(500);
    return !aborted;
  };

  // ── Extract Rich User Data from Cell ────────────────────
  const extractUserData = (cell) => {
    const data = { username: null, displayName: null, bio: null, followers: 0, following: 0, hasAvatar: true };

    // Username
    const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
    if (link) {
      const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
      if (match && !['home', 'explore', 'notifications', 'messages', 'i'].includes(match[1])) {
        data.username = match[1];
      }
    }
    if (!data.username) {
      const spans = cell.querySelectorAll('span');
      for (const s of spans) { const m = s.textContent.match(/^@([A-Za-z0-9_]+)$/); if (m) { data.username = m[1]; break; } }
    }

    // Display name (usually first bolded text in cell)
    const nameSpans = cell.querySelectorAll('a[href^="/"] span');
    if (nameSpans.length > 0) data.displayName = nameSpans[0].textContent.trim();

    // Bio (usually in a div after the name links)
    const bioEl = cell.querySelector('[data-testid="UserDescription"]') || cell.querySelector('[dir="auto"]:not(a [dir="auto"])');
    if (bioEl && bioEl.textContent.length > 5) data.bio = bioEl.textContent.trim().slice(0, 300);

    // Default (egg) avatar
    data.hasAvatar = !cell.querySelector('img[src*="default_profile"]');

    return data;
  };

  // ── Main ──────────────────────────────────────────────────
  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  📝 UNFOLLOW NON-FOLLOWERS WITH LOG' + ' '.repeat(W - 37) + '║');
    console.log('║  by nichxbt — v2.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (!window.location.href.includes('/following')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/following first!');
      return;
    }

    console.log(`\n⚙️ Dry run: ${CONFIG.dryRun ? 'YES' : 'NO'}  |  Whitelist: ${whitelistSet.size}  |  Export: ${CONFIG.exportFormat}`);
    if (CONFIG.dryRun) console.log('   ⚠️ Preview only. Set dryRun=false to execute.\n');
    console.log('   💡 To stop early: window.stopUnfollow()');

    if (!CONFIG.dryRun && CONFIG.confirmBeforeStart) {
      const ok = window.confirm(
        '📝 UNFOLLOW WITH LOG\n\n' +
        'This will unfollow accounts that do not follow you back and save a log file.\n\n' +
        'Click OK to start.'
      );
      if (!ok) {
        console.log('❌ Cancelled by user.');
        return;
      }
    }

    let emptyScrolls = 0;

    while (unfollowed < CONFIG.maxUnfollows && emptyScrolls < CONFIG.maxEmptyScrolls) {
      if (!(await shouldContinue())) break;

      if (isRateLimited()) {
        console.warn(`🚨 Rate limit! Cooling down ${CONFIG.rateLimitCooldown / 1000}s...`);
        await sleep(CONFIG.rateLimitCooldown);
        continue;
      }

      const cells = $$(SEL.userCell);
      let foundNew = false;

      for (const cell of cells) {
        if (!(await shouldContinue())) break;
        if (unfollowed >= CONFIG.maxUnfollows) break;

        const userData = extractUserData(cell);
        if (!userData.username) continue;
        const uLower = userData.username.toLowerCase();
        if (processedUsers.has(uLower)) continue;

        processedUsers.add(uLower);
        foundNew = true;
        scanned++;

        // Skip if follows back
        if ($(SEL.followsYou, cell)) {
          keptList.push({ username: userData.username, displayName: userData.displayName });
          if (CONFIG.logKept) console.log(`   💚 Keeping: @${userData.username}${userData.displayName ? ` (${userData.displayName})` : ''}`);
          continue;
        }

        // Skip if whitelisted
        if (whitelistSet.has(uLower)) {
          if (CONFIG.logLevel === 'verbose') console.log(`   🛡️ Whitelisted: @${userData.username}`);
          continue;
        }

        const entry = {
          ...userData,
          timestamp: new Date().toISOString(),
          dryRun: CONFIG.dryRun,
        };

        if (CONFIG.dryRun) {
          if (CONFIG.logLevel !== 'quiet') {
            console.log(`   🔍 Would unfollow: @${userData.username}${userData.displayName ? ` (${userData.displayName})` : ''}${userData.bio ? ` — "${userData.bio.slice(0, 60)}..."` : ''}`);
          }
          log.push(entry);
          unfollowed++;
          continue;
        }

        // Execute unfollow
        const btn = $(SEL.unfollowBtn, cell);
        if (!btn) { errors++; consecutiveErrors++; continue; }

        try {
          btn.click();
          await sleep(gaussian(400, 800));
          const confirm = $(SEL.confirmBtn);
          if (confirm) { confirm.click(); await sleep(gaussian(300, 600)); }

          unfollowed++;
          consecutiveErrors = 0;
          log.push(entry);

          if (CONFIG.logLevel === 'verbose' || unfollowed % 5 === 0) {
            console.log(`   🔙 #${unfollowed} @${userData.username}${userData.displayName ? ` (${userData.displayName})` : ''}`);
          }

          persist();
          await sleep(gaussian(CONFIG.minDelay, CONFIG.maxDelay));
        } catch (e) {
          errors++;
          consecutiveErrors++;
          console.warn(`   ⚠️ Error unfollowing @${userData.username}: ${e.message}`);
          if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
            console.error(`❌ ${CONFIG.maxConsecutiveErrors} consecutive errors — aborting.`);
            break;
          }
        }
      }

      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) break;
      if (!foundNew) emptyScrolls++; else emptyScrolls = 0;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(gaussian(CONFIG.scrollDelay, CONFIG.scrollDelay + 1000));
    }

    // ── Summary ─────────────────────────────────────────────
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('\n╔' + '═'.repeat(52) + '╗');
    console.log('║  📊 FINAL RESULTS' + ' '.repeat(34) + '║');
    console.log('╠' + '═'.repeat(52) + '╣');
    console.log(`║  Scanned:       ${String(scanned).padEnd(33)}║`);
    console.log(`║  Unfollowed:    ${String(unfollowed).padEnd(33)}║`);
    console.log(`║  Kept (mutual): ${String(keptList.length).padEnd(33)}║`);
    console.log(`║  Errors:        ${String(errors).padEnd(33)}║`);
    console.log(`║  Duration:      ${(elapsed + 's').padEnd(33)}║`);
    console.log(`║  Mode:          ${(CONFIG.dryRun ? 'DRY RUN' : 'LIVE').padEnd(33)}║`);
    console.log('╚' + '═'.repeat(52) + '╝');

    persist();
    if (log.length > 0) exportNow();
    else window.unfollowLog = { unfollowed: log, kept: keptList };
    delete window.stopUnfollow;
  };

  run();
})();

/**
 * ============================================================
 * 👋 Remove Followers (Soft-Block) — Production Grade
 * ============================================================
 *
 * @name        removeFollowers.js
 * @description Remove specific or all followers using the
 *              soft-block technique (block → unblock). Includes
 *              smart filtering: remove bots, low-quality, or
 *              inactive followers based on heuristics.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME/followers
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG as needed
 * 4. Paste and run
 *
 * MODES:
 *   'list'  — Remove specific usernames from usersToRemove[]
 *   'all'   — Remove all visible followers
 *   'smart' — Remove based on heuristics (no avatar, no bio, spam)
 *
 * 🎮 CONTROLS:
 *   window.XActions.pause()  / .resume() / .abort() / .status()
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    mode: 'list',                     // 'list' | 'all' | 'smart'
    usersToRemove: [
      // 'spambot123',
    ],
    whitelist: [],                    // Never remove these
    maxRemovals: 50,
    dryRun: true,                     // SET FALSE TO EXECUTE
    minDelay: 2000,
    maxDelay: 4000,
    scrollDelay: 2000,
    maxEmptyScrolls: 8,
    maxConsecutiveErrors: 5,
    rateLimitCooldown: 60000,
    exportOnComplete: true,

    // Smart mode filters (mode='smart')
    smart: {
      noAvatar: true,                 // Remove users with default avatar
      noBio: true,                    // Remove users with empty bio
      followingRatioAbove: 20,        // Remove if following/followers > N
      nameHasNumbers: false,          // Remove if name mostly numbers
    },
  };

  const SEL = {
    userCell:    ['[data-testid="UserCell"]'],
    userActions: ['[data-testid="userActions"]', 'button[aria-label="More"]'],
    confirmBtn:  ['[data-testid="confirmationSheetConfirm"]'],
    toast:       ['[data-testid="toast"]', '[role="alert"]'],
  };

  const $ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelector(x); if (e) return e; } return null; };
  const $$ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelectorAll(x); if (e.length) return [...e]; } return []; };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));
  const isRateLimited = () => { const t = $(SEL.toast); return t && /rate limit|try again|too many|slow down/i.test(t.textContent); };

  let paused = false, aborted = false;
  let removed = 0, scanned = 0, skipped = 0, errors = 0, consecutiveErrors = 0;
  const startTime = Date.now();
  const results = { removed: [], failed: [], skipped: [] };
  const processedUsers = new Set();
  const targetSet = new Set(CONFIG.usersToRemove.map(u => u.toLowerCase().replace(/^@/, '')));
  const whitelistSet = new Set(CONFIG.whitelist.map(u => u.toLowerCase().replace(/^@/, '')));

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`📊 Removed: ${removed}/${CONFIG.maxRemovals} | Scanned: ${scanned} | Skipped: ${skipped} | ${el}s`);
    },
  };

  const shouldContinue = async () => { while (paused && !aborted) await sleep(500); return !aborted; };

  const extractUserData = (cell) => {
    const data = { username: null, displayName: null, bio: null, hasDefaultAvatar: false };

    const link = cell.querySelector('a[href^="/"][role="link"]') || cell.querySelector('a[href^="/"]');
    if (link) {
      const m = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
      if (m && !['home', 'explore', 'notifications', 'messages', 'i'].includes(m[1])) data.username = m[1];
    }

    const nameSpans = cell.querySelectorAll('a[href^="/"] span');
    if (nameSpans.length > 0) data.displayName = nameSpans[0].textContent.trim();

    const bioEl = cell.querySelector('[dir="auto"]:not(a [dir="auto"])');
    if (bioEl) data.bio = bioEl.textContent.trim();

    // Check for default avatar (usually an SVG or specific default image)
    const avatar = cell.querySelector('img[src*="default_profile"]');
    data.hasDefaultAvatar = !!avatar;

    return data;
  };

  const shouldRemoveSmart = (data) => {
    if (CONFIG.smart.noAvatar && data.hasDefaultAvatar) return 'default avatar';
    if (CONFIG.smart.noBio && (!data.bio || data.bio.length < 3)) return 'no bio';
    if (CONFIG.smart.nameHasNumbers && data.displayName) {
      const numRatio = (data.displayName.match(/\d/g) || []).length / data.displayName.length;
      if (numRatio > 0.5) return 'name mostly numbers';
    }
    return null;
  };

  const removeFollower = async (cell, userData) => {
    const moreBtn = cell.querySelector('[data-testid="userActions"]') || cell.querySelector('button[aria-label="More"]');
    if (!moreBtn) { errors++; consecutiveErrors++; results.failed.push(userData.username); return false; }

    moreBtn.click();
    await sleep(gaussian(600, 1000));

    // Find "Remove this follower" in dropdown
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    let removeBtn = null;
    for (const item of menuItems) {
      if (item.textContent.toLowerCase().includes('remove')) { removeBtn = item; break; }
    }

    if (!removeBtn) {
      document.body.click();
      await sleep(300);
      results.failed.push(userData.username);
      errors++;
      consecutiveErrors++;
      return false;
    }

    removeBtn.click();
    await sleep(gaussian(500, 800));

    const confirm = $(SEL.confirmBtn);
    if (confirm) { confirm.click(); await sleep(gaussian(400, 700)); }

    removed++;
    consecutiveErrors = 0;
    results.removed.push({ ...userData, timestamp: new Date().toISOString() });
    return true;
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  👋 REMOVE FOLLOWERS' + ' '.repeat(W - 21) + '║');
    console.log('║  by nichxbt — v2.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (!window.location.href.includes('/followers')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/followers first!');
      return;
    }

    console.log(`⚙️ Mode: ${CONFIG.mode} | Max: ${CONFIG.maxRemovals} | Dry run: ${CONFIG.dryRun}`);
    if (CONFIG.mode === 'list' && targetSet.size === 0) {
      console.error('❌ No users specified! Add usernames to CONFIG.usersToRemove or change mode.');
      return;
    }

    let emptyScrolls = 0;

    while (removed < CONFIG.maxRemovals && emptyScrolls < CONFIG.maxEmptyScrolls) {
      if (!(await shouldContinue())) break;
      if (isRateLimited()) { console.warn('🚨 Rate limit!'); await sleep(CONFIG.rateLimitCooldown); continue; }

      const cells = $$(SEL.userCell);
      let foundNew = false;

      for (const cell of cells) {
        if (!(await shouldContinue())) break;
        if (removed >= CONFIG.maxRemovals) break;

        const userData = extractUserData(cell);
        if (!userData.username) continue;
        const uLower = userData.username.toLowerCase();
        if (processedUsers.has(uLower)) continue;
        processedUsers.add(uLower);
        foundNew = true;
        scanned++;

        // Whitelist check
        if (whitelistSet.has(uLower)) { skipped++; results.skipped.push(userData.username); continue; }

        // Mode logic
        let shouldRemove = false;
        let reason = '';

        if (CONFIG.mode === 'list') {
          shouldRemove = targetSet.has(uLower);
          reason = 'in target list';
        } else if (CONFIG.mode === 'all') {
          shouldRemove = true;
          reason = 'remove all';
        } else if (CONFIG.mode === 'smart') {
          const smartReason = shouldRemoveSmart(userData);
          shouldRemove = !!smartReason;
          reason = smartReason || '';
        }

        if (!shouldRemove) { skipped++; continue; }

        if (CONFIG.dryRun) {
          console.log(`   🔍 Would remove: @${userData.username}${reason ? ` (${reason})` : ''}`);
          results.removed.push({ ...userData, reason, dryRun: true, timestamp: new Date().toISOString() });
          removed++;
          continue;
        }

        const success = await removeFollower(cell, userData);
        if (success) {
          console.log(`   👋 Removed @${userData.username}${reason ? ` (${reason})` : ''} [${removed}/${CONFIG.maxRemovals}]`);
        }

        if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) { console.error('❌ Too many errors.'); break; }
        await sleep(gaussian(CONFIG.minDelay, CONFIG.maxDelay));
      }

      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) break;
      if (!foundNew) emptyScrolls++; else emptyScrolls = 0;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(gaussian(CONFIG.scrollDelay, CONFIG.scrollDelay + 800));
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('\n╔' + '═'.repeat(48) + '╗');
    console.log('║  📊 REMOVE FOLLOWERS — RESULTS' + ' '.repeat(17) + '║');
    console.log('╠' + '═'.repeat(48) + '╣');
    console.log(`║  Removed:     ${String(removed).padEnd(31)}║`);
    console.log(`║  Scanned:     ${String(scanned).padEnd(31)}║`);
    console.log(`║  Skipped:     ${String(skipped).padEnd(31)}║`);
    console.log(`║  Failed:      ${String(results.failed.length).padEnd(31)}║`);
    console.log(`║  Duration:    ${(elapsed + 's').padEnd(31)}║`);
    console.log('╚' + '═'.repeat(48) + '╝');

    if (CONFIG.exportOnComplete && results.removed.length > 0) {
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-removed-followers-${CONFIG.dryRun ? 'preview' : 'results'}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Results exported.');
    }
  };

  run();
})();

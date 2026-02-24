/**
 * ============================================================
 * 🚫 Mass Block Users — Production Grade
 * ============================================================
 *
 * @name        massBlock.js
 * @description Block multiple accounts by username list. Also
 *              supports "block from timeline" mode: blocks every
 *              visible user on the current page (great for
 *              blocking spam replies). Dry-run, rate-limit
 *              detection, full result log with export.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * MODE A — Block by username list:
 *   1. Go to any x.com page
 *   2. Add usernames to CONFIG.usersToBlock
 *   3. Set CONFIG.mode = 'list'
 *   4. Paste and run
 *
 * MODE B — Block visible users on page (e.g. reply spam):
 *   1. Go to a tweet/page with spam replies
 *   2. Set CONFIG.mode = 'visible'
 *   3. Paste and run
 *
 * 🎮 CONTROLS:
 *   window.XActions.pause()  / .resume() / .abort() / .status()
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    mode: 'list',                     // 'list' | 'visible'
    usersToBlock: [
      // 'spammer1',
      // 'spammer2',
    ],
    whitelist: [],                    // Never block these (without @)
    dryRun: true,                     // SET FALSE TO EXECUTE
    actionDelay: 3000,
    navigationDelay: 3500,
    maxConsecutiveErrors: 5,
    rateLimitCooldown: 60000,
    maxVisibleBlocks: 100,            // Cap for 'visible' mode
    scrollInVisibleMode: true,        // Scroll for more users in visible mode
    exportOnComplete: true,
  };

  const SEL = {
    userActions: ['[data-testid="userActions"]', 'button[aria-label="More"]'],
    blockBtn:    ['[data-testid="block"]', '[role="menuitem"] [data-testid="block"]'],
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
  let blocked = 0, errors = 0, consecutiveErrors = 0;
  const startTime = Date.now();
  const results = { blocked: [], failed: [], skipped: [] };
  const whitelistSet = new Set(CONFIG.whitelist.map(u => u.toLowerCase().replace(/^@/, '')));

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      console.log(`📊 Blocked: ${blocked} | Failed: ${results.failed.length} | Skipped: ${results.skipped.length}`);
    },
  };

  const shouldContinue = async () => { while (paused && !aborted) await sleep(500); return !aborted; };

  const blockByNavigation = async (username) => {
    if (whitelistSet.has(username.toLowerCase())) {
      results.skipped.push(username);
      console.log(`   🛡️ Whitelisted: @${username}`);
      return;
    }

    if (CONFIG.dryRun) {
      console.log(`   🔍 Would block: @${username}`);
      results.blocked.push({ username, timestamp: new Date().toISOString(), dryRun: true });
      blocked++;
      return;
    }

    const returnUrl = window.location.href;
    window.location.href = `https://x.com/${username}`;
    await sleep(CONFIG.navigationDelay);

    // Wait for page to load
    let attempts = 0;
    while (!$(SEL.userActions) && attempts < 10) {
      await sleep(500);
      attempts++;
    }

    const moreBtn = $(SEL.userActions);
    if (!moreBtn) {
      console.warn(`   ⚠️ @${username}: Profile not found or menu missing`);
      results.failed.push(username);
      errors++;
      consecutiveErrors++;
      return;
    }

    moreBtn.click();
    await sleep(gaussian(800, 1200));

    // Find block in dropdown
    const blockBtn = $(SEL.blockBtn);
    if (!blockBtn) {
      // Close menu
      document.body.click();
      await sleep(300);
      console.warn(`   ⚠️ @${username}: Block option not found (might be already blocked)`);
      results.skipped.push(username);
      return;
    }

    blockBtn.click();
    await sleep(gaussian(600, 1000));

    const confirmBtn = $(SEL.confirmBtn);
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(gaussian(500, 800));
      console.log(`   🚫 Blocked @${username}`);
      results.blocked.push({ username, timestamp: new Date().toISOString() });
      blocked++;
      consecutiveErrors = 0;
    } else {
      results.failed.push(username);
      errors++;
      consecutiveErrors++;
    }
  };

  const blockVisibleUsers = async () => {
    const processedUsers = new Set();
    let emptyScrolls = 0;

    while (blocked < CONFIG.maxVisibleBlocks && emptyScrolls < 5) {
      if (!(await shouldContinue())) break;
      if (isRateLimited()) { console.warn('🚨 Rate limit!'); await sleep(CONFIG.rateLimitCooldown); continue; }

      const cells = $$(SEL.userCell);
      let foundNew = false;

      for (const cell of cells) {
        if (!(await shouldContinue())) break;
        if (blocked >= CONFIG.maxVisibleBlocks) break;

        const link = cell.querySelector('a[href^="/"]');
        if (!link) continue;
        const username = (link.getAttribute('href') || '').replace('/', '').split('/')[0];
        if (!username || processedUsers.has(username.toLowerCase())) continue;
        processedUsers.add(username.toLowerCase());
        foundNew = true;

        if (whitelistSet.has(username.toLowerCase())) {
          results.skipped.push(username);
          continue;
        }

        const moreBtn = cell.querySelector('[data-testid="userActions"]');
        if (!moreBtn) continue;

        if (CONFIG.dryRun) {
          console.log(`   🔍 Would block: @${username}`);
          results.blocked.push({ username, timestamp: new Date().toISOString(), dryRun: true });
          blocked++;
          continue;
        }

        moreBtn.click();
        await sleep(gaussian(600, 1000));
        const blockBtn = $(SEL.blockBtn);
        if (!blockBtn) { document.body.click(); await sleep(300); continue; }
        blockBtn.click();
        await sleep(gaussian(500, 900));
        const confirm = $(SEL.confirmBtn);
        if (confirm) {
          confirm.click();
          blocked++;
          results.blocked.push({ username, timestamp: new Date().toISOString() });
          console.log(`   🚫 Blocked @${username} [${blocked}/${CONFIG.maxVisibleBlocks}]`);
        }
        await sleep(gaussian(CONFIG.actionDelay * 0.5, CONFIG.actionDelay));
      }

      if (!foundNew) emptyScrolls++; else emptyScrolls = 0;
      if (CONFIG.scrollInVisibleMode) {
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(2000);
      } else break;
    }
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🚫 MASS BLOCK USERS' + ' '.repeat(W - 22) + '║');
    console.log('║  by nichxbt — v2.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log(`⚙️ Mode: ${CONFIG.mode} | Dry run: ${CONFIG.dryRun} | Whitelist: ${whitelistSet.size}`);

    if (CONFIG.mode === 'list') {
      if (CONFIG.usersToBlock.length === 0) {
        console.error('❌ No users to block! Add usernames to CONFIG.usersToBlock.');
        return;
      }
      console.log(`📋 ${CONFIG.usersToBlock.length} users to block\n`);

      for (const username of CONFIG.usersToBlock) {
        if (!(await shouldContinue())) break;
        if (isRateLimited()) { console.warn('🚨 Rate limit!'); await sleep(CONFIG.rateLimitCooldown); }
        if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) { console.error('❌ Too many errors.'); break; }
        await blockByNavigation(username);
        await sleep(gaussian(CONFIG.actionDelay * 0.8, CONFIG.actionDelay * 1.2));
      }
    } else {
      console.log(`📋 Blocking visible users on page (max ${CONFIG.maxVisibleBlocks})\n`);
      await blockVisibleUsers();
    }

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('\n╔' + '═'.repeat(48) + '╗');
    console.log('║  📊 MASS BLOCK — RESULTS' + ' '.repeat(23) + '║');
    console.log('╠' + '═'.repeat(48) + '╣');
    console.log(`║  Blocked:     ${String(blocked).padEnd(31)}║`);
    console.log(`║  Failed:      ${String(results.failed.length).padEnd(31)}║`);
    console.log(`║  Skipped:     ${String(results.skipped.length).padEnd(31)}║`);
    console.log(`║  Duration:    ${(elapsed + 's').padEnd(31)}║`);
    console.log('╚' + '═'.repeat(48) + '╝');

    if (CONFIG.exportOnComplete && results.blocked.length > 0) {
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-blocked-${CONFIG.dryRun ? 'preview' : 'results'}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Results exported.');
    }
  };

  run();
})();

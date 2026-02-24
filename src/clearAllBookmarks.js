/**
 * ============================================================
 * 🔖 Clear All Bookmarks — Production Grade
 * ============================================================
 *
 * @name        clearAllBookmarks.js
 * @description Remove all bookmarked posts. Tries the built-in
 *              "Clear All" button first, then falls back to
 *              individual removal. Supports keyword keep-filters,
 *              rate-limit detection, pause/resume, full export.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/i/bookmarks
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
    maxRemovals: Infinity,
    keepKeywords: [],                 // Keep bookmarks containing these words
    dryRun: false,
    useBulkClear: true,              // Try built-in "Clear all bookmarks" first
    minDelay: 800,
    maxDelay: 2200,
    scrollDelay: 1800,
    maxEmptyScrolls: 6,
    maxConsecutiveErrors: 10,
    rateLimitCooldown: 60000,
    exportOnComplete: true,
  };

  const SEL = {
    removeBookmark: ['[data-testid="removeBookmark"]', 'button[aria-label*="Remove"]'],
    clearAll:       ['[data-testid="clearBookmarks"]', 'button[aria-label*="Clear all"]'],
    confirmBtn:     ['[data-testid="confirmationSheetConfirm"]'],
    tweet:          ['article[data-testid="tweet"]'],
    tweetText:      ['[data-testid="tweetText"]'],
    toast:          ['[data-testid="toast"]', '[role="alert"]'],
  };

  const $ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelector(x); if (e) return e; } return null; };
  const $$ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelectorAll(x); if (e.length) return [...e]; } return []; };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));
  const isRateLimited = () => { const t = $(SEL.toast); return t && /rate limit|try again|too many|slow down/i.test(t.textContent); };

  let paused = false, aborted = false;
  let removed = 0, scanned = 0, kept = 0, errors = 0, consecutiveErrors = 0;
  const startTime = Date.now();
  const removedLog = [];

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`📊 Removed: ${removed} | Kept: ${kept} | Errors: ${errors} | ${el}s`);
    },
  };

  const shouldContinue = async () => { while (paused && !aborted) await sleep(500); return !aborted; };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🔖 CLEAR ALL BOOKMARKS' + ' '.repeat(W - 25) + '║');
    console.log('║  by nichxbt — v2.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (!window.location.href.includes('/bookmarks')) {
      console.error('❌ Navigate to x.com/i/bookmarks first!');
      return;
    }

    // Try bulk clear first
    if (CONFIG.useBulkClear && CONFIG.keepKeywords.length === 0 && !CONFIG.dryRun) {
      const clearAllBtn = $(SEL.clearAll);
      if (clearAllBtn) {
        console.log('🗑️ Found "Clear All" button...');
        clearAllBtn.click();
        await sleep(1000);
        const confirm = $(SEL.confirmBtn);
        if (confirm) {
          confirm.click();
          await sleep(1500);
          console.log('✅ All bookmarks cleared via built-in button!');
          return;
        }
      }
    }

    console.log(`⚙️ Max: ${CONFIG.maxRemovals === Infinity ? '∞' : CONFIG.maxRemovals} | Dry run: ${CONFIG.dryRun} | Keep filters: ${CONFIG.keepKeywords.length}`);

    let emptyScrolls = 0;

    while (removed < CONFIG.maxRemovals && emptyScrolls < CONFIG.maxEmptyScrolls) {
      if (!(await shouldContinue())) break;
      if (isRateLimited()) { console.warn('🚨 Rate limit! Cooling down...'); await sleep(CONFIG.rateLimitCooldown); continue; }

      const buttons = $$(SEL.removeBookmark);
      if (buttons.length === 0) {
        emptyScrolls++;
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(gaussian(CONFIG.scrollDelay, CONFIG.scrollDelay + 800));
        continue;
      }
      emptyScrolls = 0;

      for (const btn of buttons) {
        if (!(await shouldContinue())) break;
        if (removed >= CONFIG.maxRemovals) break;

        const article = btn.closest('article');
        const textEl = article ? $(SEL.tweetText, article) : null;
        const text = textEl ? textEl.textContent.trim() : '';
        scanned++;

        // Keep filter
        if (CONFIG.keepKeywords.length > 0 && CONFIG.keepKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))) {
          kept++;
          continue;
        }

        if (CONFIG.dryRun) {
          console.log(`   🔍 Would remove: "${text.slice(0, 80)}..."`);
          removedLog.push({ text: text.slice(0, 200), timestamp: new Date().toISOString(), dryRun: true });
          removed++;
          continue;
        }

        try {
          btn.click();
          removed++;
          consecutiveErrors = 0;
          removedLog.push({ text: text.slice(0, 200), timestamp: new Date().toISOString() });

          if (removed % 10 === 0) {
            const rate = (removed / ((Date.now() - startTime) / 60000)).toFixed(1);
            console.log(`🔖 Removed ${removed} bookmarks | ${rate}/min`);
          }
          await sleep(gaussian(CONFIG.minDelay, CONFIG.maxDelay));
        } catch (e) {
          errors++;
          consecutiveErrors++;
          if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) { console.error('❌ Too many errors — aborting.'); break; }
        }
      }

      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) break;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(gaussian(CONFIG.scrollDelay, CONFIG.scrollDelay + 800));
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('\n╔' + '═'.repeat(48) + '╗');
    console.log('║  📊 CLEAR BOOKMARKS — RESULTS' + ' '.repeat(18) + '║');
    console.log('╠' + '═'.repeat(48) + '╣');
    console.log(`║  Removed:     ${String(removed).padEnd(31)}║`);
    console.log(`║  Kept:        ${String(kept).padEnd(31)}║`);
    console.log(`║  Errors:      ${String(errors).padEnd(31)}║`);
    console.log(`║  Duration:    ${(elapsed + 's').padEnd(31)}║`);
    console.log('╚' + '═'.repeat(48) + '╝');

    if (CONFIG.exportOnComplete && removedLog.length > 0) {
      const blob = new Blob([JSON.stringify({ summary: { removed, kept, errors }, bookmarks: removedLog }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-bookmarks-cleared-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Log exported.');
    }
  };

  run();
})();

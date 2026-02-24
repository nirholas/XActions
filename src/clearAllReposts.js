/**
 * ============================================================
 * 🔄 Clear All Reposts (Unretweet All) — Production Grade
 * ============================================================
 *
 * @name        clearAllReposts.js
 * @description Remove all reposts/retweets from your profile.
 *              Supports filters (keyword, date range), rate-limit
 *              detection, pause/resume/abort, and full export.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME (your profile page)
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
    dryRun: false,
    skipKeywords: [],                 // Keep reposts containing these words
    minDelay: 1200,
    maxDelay: 3000,
    scrollDelay: 2000,
    maxEmptyScrolls: 6,
    maxConsecutiveErrors: 10,
    rateLimitCooldown: 60000,
    exportOnComplete: true,
  };

  const SEL = {
    unretweet:        ['[data-testid="unretweet"]', 'button[data-testid="unretweet"]'],
    unretweetConfirm: ['[data-testid="unretweetConfirm"]', '[data-testid="confirmationSheetConfirm"]'],
    tweet:            ['article[data-testid="tweet"]', 'article[role="article"]'],
    tweetText:        ['[data-testid="tweetText"]'],
    toast:            ['[data-testid="toast"]', '[role="alert"]'],
  };

  const $ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelector(x); if (e) return e; } return null; };
  const $$ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelectorAll(x); if (e.length) return [...e]; } return []; };
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));
  const isRateLimited = () => { const t = $(SEL.toast); return t && /rate limit|try again|too many|slow down/i.test(t.textContent); };

  let paused = false, aborted = false;
  let removed = 0, scanned = 0, skipped = 0, errors = 0, consecutiveErrors = 0;
  const startTime = Date.now();
  const removedLog = [];

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const el = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`📊 Removed: ${removed} | Scanned: ${scanned} | Skipped: ${skipped} | Errors: ${errors} | ${el}s`);
    },
  };

  const shouldContinue = async () => { while (paused && !aborted) await sleep(500); return !aborted; };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🔄 CLEAR ALL REPOSTS' + ' '.repeat(W - 23) + '║');
    console.log('║  by nichxbt — v2.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    console.log(`⚙️ Max: ${CONFIG.maxRemovals === Infinity ? '∞' : CONFIG.maxRemovals} | Dry run: ${CONFIG.dryRun}`);

    let emptyScrolls = 0;

    while (removed < CONFIG.maxRemovals && emptyScrolls < CONFIG.maxEmptyScrolls) {
      if (!(await shouldContinue())) break;
      if (isRateLimited()) { console.warn('🚨 Rate limit! Cooling down...'); await sleep(CONFIG.rateLimitCooldown); continue; }

      const buttons = $$(SEL.unretweet);
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

        // Keyword skip filter
        if (CONFIG.skipKeywords.length > 0 && CONFIG.skipKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()))) {
          skipped++;
          continue;
        }

        if (CONFIG.dryRun) {
          console.log(`   🔍 Would remove repost: "${text.slice(0, 80)}..."`);
          removedLog.push({ text: text.slice(0, 200), timestamp: new Date().toISOString(), dryRun: true });
          removed++;
          continue;
        }

        try {
          btn.click();
          await sleep(gaussian(400, 700));
          const confirm = $(SEL.unretweetConfirm);
          if (confirm) { confirm.click(); await sleep(gaussian(300, 500)); }

          removed++;
          consecutiveErrors = 0;
          removedLog.push({ text: text.slice(0, 200), timestamp: new Date().toISOString() });

          if (removed % 10 === 0) {
            const rate = (removed / ((Date.now() - startTime) / 60000)).toFixed(1);
            console.log(`🔄 Removed ${removed} reposts | ${rate}/min`);
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
    console.log('║  📊 CLEAR REPOSTS — RESULTS' + ' '.repeat(20) + '║');
    console.log('╠' + '═'.repeat(48) + '╣');
    console.log(`║  Removed:     ${String(removed).padEnd(31)}║`);
    console.log(`║  Scanned:     ${String(scanned).padEnd(31)}║`);
    console.log(`║  Skipped:     ${String(skipped).padEnd(31)}║`);
    console.log(`║  Errors:      ${String(errors).padEnd(31)}║`);
    console.log(`║  Duration:    ${(elapsed + 's').padEnd(31)}║`);
    console.log('╚' + '═'.repeat(48) + '╝');

    if (CONFIG.exportOnComplete && removedLog.length > 0) {
      const blob = new Blob([JSON.stringify({ summary: { removed, scanned, skipped, errors }, reposts: removedLog }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-reposts-cleared-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Log exported.');
    }
  };

  run();
})();

// GENERATED FILE: a copy of browser/unlikeAllPosts.js, written by scripts/build-script-manifest.mjs. Edit browser/unlikeAllPosts.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 💔 Unlike All Posts — Production Grade
 * ============================================================
 *
 * @name        unlikeAllPosts.js
 * @title       Unlike All Posts
 * @description Unlike the posts in your Likes tab, with keyword filters, a cap, a confirmation and a dry run by default.
 * @category    cleanup
 * @page        x.com/<you>/likes
 * @writes      true
 * @aliases     scripts/unlikeAllPosts.js, scripts/twitter/clear-all-likes.js, scripts/twitter/unlike-all.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME/likes
 * 2. Open DevTools Console (F12)
 * 3. Edit CONFIG. It starts as a dry run (dryRun: true) that only lists
 *    what would be unliked; set dryRun = false to unlike for real (a
 *    confirm() dialog asks first). maxUnlikes (50 by default) caps one run.
 * 4. Paste browser/unlikeAllPosts.js and run
 *
 * 🎮 CONTROLS:
 *   window.XActions.pause()  / .resume() / .abort() / .status()
 *   window.stopUnlike() - stop after the current post
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    maxUnlikes: 50,                   // Max posts to unlike (or list, in dry run) per run
    skipKeywords: [],                 // Keep likes containing these words
    onlyKeywords: [],                 // Only unlike if contains these words (empty = all)
    dryRun: true,                     // Preview without unliking. SET FALSE TO EXECUTE
    confirmBeforeStart: true,         // Live runs ask with confirm() before the first unlike
    minDelay: 1500,
    maxDelay: 2500,
    scrollDelay: 2000,
    maxEmptyScrolls: 6,
    maxConsecutiveErrors: 10,
    rateLimitCooldown: 60000,
    exportOnComplete: true,
  };

  const SEL = {
    unlikeBtn: ['[data-testid="unlike"]', 'button[data-testid="unlike"]'],
    tweet:     ['article[data-testid="tweet"]', 'article[role="article"]'],
    tweetText: ['[data-testid="tweetText"]', '[lang]'],
    toast:     ['[data-testid="toast"]', '[role="alert"]'],
  };

  const $ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelector(x); if (e) return e; } return null; };
  const $$ = (s, c = document) => { for (const x of (Array.isArray(s) ? s : [s])) { const e = c.querySelectorAll(x); if (e.length) return [...e]; } return []; };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));
  const isRateLimited = () => { const t = $(SEL.toast); return t && /rate limit|try again|too many|slow down/i.test(t.textContent); };

  let paused = false, aborted = false;
  let unliked = 0, scanned = 0, skipped = 0, errors = 0, consecutiveErrors = 0;
  const startTime = Date.now();
  const unlikedLog = [];
  const seenArticles = new WeakSet();   // posts already counted, so dry runs and skips are not re-counted

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  window.XActions = {
    pause()  { paused = true;  console.log('⏸️ Paused.'); },
    resume() { paused = false; console.log('▶️ Resumed.'); },
    abort()  { aborted = true; console.log('🛑 Aborting...'); },
    status() {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`📊 Unliked: ${unliked} | Scanned: ${scanned} | Skipped: ${skipped} | Errors: ${errors} | ${elapsed}s`);
    },
  };

  // Stop switch kept from scripts/twitter/unlike-all.js (also used by the command center Stop button)
  window.stopUnlike = () => {
    aborted = true;
    console.log('🛑 Stopping after the current unlike...');
  };

  const shouldContinue = async () => { while (paused && !aborted) await sleep(500); return !aborted; };

  const extractTweetInfo = (article) => {
    const textEl = $(SEL.tweetText, article);
    const text = textEl ? textEl.textContent.trim() : '';
    const authorLink = article.querySelector('a[href^="/"][role="link"]');
    const author = authorLink ? (authorLink.getAttribute('href') || '').replace('/', '') : 'unknown';
    return { text: text.slice(0, 200), author };
  };

  const run = async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  💔 UNLIKE ALL POSTS' + ' '.repeat(W - 22) + '║');
    console.log('║  by nichxbt — v2.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (!window.location.href.includes('/likes')) {
      console.error('❌ Navigate to x.com/YOUR_USERNAME/likes first!');
      return;
    }

    console.log(CONFIG.dryRun ? '🔍 DRY RUN: preview only' : '⚠️ LIVE MODE: posts WILL be unliked!');
    console.log(`⚙️ Max: ${CONFIG.maxUnlikes} | Delay: ${CONFIG.minDelay}-${CONFIG.maxDelay}ms | Dry run: ${CONFIG.dryRun} | Filters: skip ${CONFIG.skipKeywords.length}, only ${CONFIG.onlyKeywords.length}`);

    if (!CONFIG.dryRun && CONFIG.confirmBeforeStart) {
      const confirmed = confirm(
        `💔 Unlike All Posts\n\n` +
        `This will unlike up to ${CONFIG.maxUnlikes} posts.\n\n` +
        `⚠️ This action cannot be easily undone!\n\n` +
        `Click OK to proceed or Cancel to abort.`
      );
      if (!confirmed) {
        console.log('🛑 Operation cancelled by user.');
        return;
      }
    }
    console.log('💡 To stop early: window.stopUnlike()');

    let emptyScrolls = 0;

    while (unliked < CONFIG.maxUnlikes && emptyScrolls < CONFIG.maxEmptyScrolls) {
      if (!(await shouldContinue())) break;

      if (isRateLimited()) {
        console.warn(`🚨 Rate limit! Cooling down ${CONFIG.rateLimitCooldown / 1000}s...`);
        await sleep(CONFIG.rateLimitCooldown);
        continue;
      }

      const buttons = $$(SEL.unlikeBtn).filter(b => {
        const art = b.closest('article') || b.closest('[data-testid="tweet"]');
        return !art || !seenArticles.has(art);
      });

      if (buttons.length === 0) {
        emptyScrolls++;
        window.scrollTo(0, document.body.scrollHeight);
        await sleep(gaussian(CONFIG.scrollDelay, CONFIG.scrollDelay + 800));
        continue;
      }

      emptyScrolls = 0;

      for (const btn of buttons) {
        if (!(await shouldContinue())) break;
        if (unliked >= CONFIG.maxUnlikes) break;

        const article = btn.closest('article') || btn.closest('[data-testid="tweet"]');
        if (article) seenArticles.add(article);
        const info = article ? extractTweetInfo(article) : { text: '', author: 'unknown' };
        scanned++;

        // Keyword filters
        const textLower = info.text.toLowerCase();
        if (CONFIG.skipKeywords.length > 0 && CONFIG.skipKeywords.some(kw => textLower.includes(kw.toLowerCase()))) {
          skipped++;
          continue;
        }
        if (CONFIG.onlyKeywords.length > 0 && !CONFIG.onlyKeywords.some(kw => textLower.includes(kw.toLowerCase()))) {
          skipped++;
          continue;
        }

        if (CONFIG.dryRun) {
          console.log(`   🔍 Would unlike: @${info.author} — "${info.text.slice(0, 80)}..."`);
          unlikedLog.push({ ...info, timestamp: new Date().toISOString(), dryRun: true });
          unliked++;
          continue;
        }

        try {
          btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(300);
          btn.click();
          unliked++;
          consecutiveErrors = 0;
          unlikedLog.push({ ...info, timestamp: new Date().toISOString() });

          if (unliked % 10 === 0) {
            const rate = (unliked / ((Date.now() - startTime) / 60000)).toFixed(1);
            console.log(`💔 Unliked ${unliked} posts | ${rate}/min`);
          }

          await sleep(gaussian(CONFIG.minDelay, CONFIG.maxDelay));
        } catch (e) {
          errors++;
          consecutiveErrors++;
          if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) {
            console.error(`❌ ${CONFIG.maxConsecutiveErrors} consecutive errors — aborting.`);
            break;
          }
        }
      }

      if (consecutiveErrors >= CONFIG.maxConsecutiveErrors) break;

      window.scrollTo(0, document.body.scrollHeight);
      await sleep(gaussian(CONFIG.scrollDelay, CONFIG.scrollDelay + 800));
    }

    if (aborted) console.log('🛑 Stopped by user.');

    // Summary
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const avgTime = unliked > 0 && !CONFIG.dryRun ? (elapsed / unliked).toFixed(2) + 's' : '-';
    console.log('\n╔' + '═'.repeat(48) + '╗');
    console.log('║  📊 UNLIKE ALL — RESULTS' + ' '.repeat(23) + '║');
    console.log('╠' + '═'.repeat(48) + '╣');
    console.log(`║  Unliked:     ${String(unliked).padEnd(31)}║`);
    console.log(`║  Scanned:     ${String(scanned).padEnd(31)}║`);
    console.log(`║  Skipped:     ${String(skipped).padEnd(31)}║`);
    console.log(`║  Errors:      ${String(errors).padEnd(31)}║`);
    console.log(`║  Duration:    ${formatTime(Number(elapsed)).padEnd(31)}║`);
    console.log(`║  Avg/unlike:  ${avgTime.padEnd(31)}║`);
    console.log('╚' + '═'.repeat(48) + '╝');

    if (CONFIG.dryRun && unliked > 0) {
      console.log(`\n⚡ Set dryRun = false and re-run to actually unlike ${unliked} posts.`);
    }

    if (CONFIG.exportOnComplete && unlikedLog.length > 0) {
      const blob = new Blob([JSON.stringify({ summary: { unliked, scanned, skipped, errors, dryRun: CONFIG.dryRun }, posts: unlikedLog }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-unliked-${CONFIG.dryRun ? 'preview' : 'log'}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      console.log('📥 Log exported.');
    }
  };

  run();
})();

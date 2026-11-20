// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 🗑️ Bulk Delete Tweets — Production Grade
 * ============================================================
 *
 * @name        bulkDeleteTweets.js
 * @description Delete your tweets by age, keyword, or engagement threshold.
 *              The #1 most-requested Twitter automation feature.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to: https://x.com/YOUR_USERNAME (its tabs work too, e.g. /with_replies)
 * 2. Open DevTools Console (F12)
 * 3. Configure the filters below. This deletes for real: set dryRun = true
 *    for a preview run that removes nothing.
 * 4. Paste this script and press Enter
 *
 * ⚠️ DELETION IS PERMANENT. There is no undo. Export first!
 *    Use browser/backupAccount.js to save your tweets before deleting.
 *
 * CONTROLS:
 *   XActionsUtils.pause()   — pause
 *   XActionsUtils.resume()  — resume
 *   XActionsUtils.abort()   — stop
 * ============================================================
 */
(() => {
  'use strict';

  const CONFIG = {
    // ── Filters (ALL conditions must match for deletion) ────
    filters: {
      olderThanDays: null,          // Delete tweets older than N days (null = ignore)
      beforeDate: null,             // Delete tweets before this date: 'YYYY-MM-DD' (null = ignore)
      afterDate: null,              // Delete tweets after this date: 'YYYY-MM-DD' (null = ignore)
      maxLikes: null,               // Only delete if likes <= this (null = ignore)
      maxRetweets: null,            // Only delete if retweets <= this (null = ignore)
      containsKeywords: [],         // Delete if text contains ANY of these (empty = ignore)
      excludeKeywords: [],          // NEVER delete if text contains ANY of these
      excludePinned: true,          // Skip pinned tweet
      excludeThreads: false,        // Skip tweets that are part of a thread
      onlyRetweets: false,          // Only delete retweets (not original tweets)
      onlyReplies: false,           // Only delete replies
    },

    // ── Limits ──────────────────────────────────────────────
    maxDeletes: Infinity,           // Stop after this many deletions
    scrollCycles: 100,              // Maximum scroll attempts

    // ── Timing ──────────────────────────────────────────────
    // X throttles bursts of deletions and starts failing them silently, so
    // these are deliberately unhurried.
    minDelay: 3000,
    maxDelay: 7000,
    scrollDelay: 4000,
    menuDelay: 1200,

    // ── Safety ──────────────────────────────────────────────
    dryRun: false,                  // false = PERMANENT deletion. true = preview only.
    confirmEvery: 50,               // Pause for user confirmation every N deletes (0 = never)

    // ── Recovery ────────────────────────────────────────────
    maxConsecutiveErrors: 5,
    rateLimitPauseMs: 90000,        // 90s when rate-limited

    // ── Export ──────────────────────────────────────────────
    exportDeleted: true,            // Save deleted tweet data before removal
    exportOnComplete: true,
  };

  // ══════════════════════════════════════════════════════════
  // 🔧 Embedded Utilities
  // ══════════════════════════════════════════════════════════

  const U = window.XActionsUtils || (() => {
    const sleep = ms => new Promise(r => setTimeout(r, ms + ms * 0.15 * (Math.random() - 0.5)));
    const rand = (lo, hi) => sleep(lo + Math.random() * (hi - lo));

    const SELS = {
      tweet:      ['article[data-testid="tweet"]', 'article[role="article"]'],
      tweetText:  ['[data-testid="tweetText"]'],
      caret:      ['[data-testid="caret"]', 'button[aria-label="More"]'],
      like:       ['[data-testid="like"]', '[data-testid="unlike"]'],
      retweet:    ['[data-testid="retweet"]', '[data-testid="unretweet"]'],
      reply:      ['[data-testid="reply"]'],
      confirmBtn: ['[data-testid="confirmationSheetConfirm"]'],
    };

    const $ = (k, r = document) => {
      for (const s of (SELS[k] || [k])) { try { const e = r.querySelector(s); if (e) return e; } catch {} } return null;
    };
    const $$ = (k, r = document) => {
      const set = new Set(); for (const s of (SELS[k] || [k])) { try { r.querySelectorAll(s).forEach(e => set.add(e)); } catch {} } return [...set];
    };

    let _p = false, _a = false;
    return {
      sleep, randomDelay: rand, $, $$,
      pause() { _p = true; console.log('⏸️  PAUSED'); },
      resume() { _p = false; console.log('▶️  RESUMED'); },
      abort() { _a = true; _p = false; console.log('🛑 ABORTED'); },
      async shouldContinue() { if (_a) return false; while (_p) { await sleep(500); if (_a) return false; } return true; },
      isRateLimited() {
        for (const sel of ['[data-testid="toast"]', '[role="alert"]']) {
          const el = document.querySelector(sel);
          if (el && /rate.limit|try.again|too.many|slow.down|something.went/i.test(el.textContent)) return true;
        }
        return false;
      },
      parseCount(str) {
        if (!str || typeof str === 'number') return typeof str === 'number' ? str : 0;
        str = str.replace(/,/g, '').trim();
        const m = str.match(/([\d.]+)\s*([KMBkmb])?/);
        if (!m) return 0;
        let n = parseFloat(m[1]);
        if (m[2]) n *= { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] || 1;
        return Math.round(n);
      },
      download(data, fn) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        a.download = fn; document.body.appendChild(a); a.click(); a.remove();
        console.log(`📥 Downloaded: ${fn}`);
      },
      saveState(k, d) { try { localStorage.setItem('xactions_' + k, JSON.stringify(d)); } catch {} },
      loadState(k, d) { try { return JSON.parse(localStorage.getItem('xactions_' + k)) ?? d; } catch { return d; } },
    };
  })();

  // Expose the fallback so the documented XActionsUtils.pause() / .abort()
  // work when core.js was never pasted. Without this, confirmEvery announces a
  // pause that never happens and the run keeps deleting.
  window.XActionsUtils = window.XActionsUtils || U;

  // ══════════════════════════════════════════════════════════
  // 🚀 Main
  // ══════════════════════════════════════════════════════════

  (async () => {
    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🗑️  BULK DELETE TWEETS' + ' '.repeat(W - 24) + '║');
    console.log('║  ' + (CONFIG.dryRun ? '🔍 DRY RUN — preview only' : '⚠️  LIVE MODE — tweets WILL be deleted!').padEnd(W - 2) + '║');
    console.log('║  by nichxbt — v1.0' + ' '.repeat(W - 21) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    // Live mode deletes for real, so give the run a stoppable head start.
    if (!CONFIG.dryRun) {
      for (let i = 5; i > 0; i--) {
        console.warn(`⚠️  Starting in ${i}s. Call XActionsUtils.abort() now to stop.`);
        await U.sleep(1000);
      }
      if (!(await U.shouldContinue())) { console.log('🛑 Aborted before deleting anything.'); return; }
    }

    // Detect profile. X serves it at /<handle> and its tabs at /<handle>/<tab>,
    // so accept both; a feed, a single status, or a reserved section is not a
    // profile timeline. The signed-in handle comes from the left nav.
    const PROFILE_TABS = ['with_replies', 'media', 'likes', 'highlights', 'articles', 'superfollows', 'affiliates'];
    const RESERVED = ['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings', 'compose',
      'hashtag', 'bookmarks', 'lists', 'topics', 'communities', 'jobs'];
    const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]{1,15})(?:\/([A-Za-z0-9_]+))?\/?$/);
    const pathUser = pathMatch && !RESERVED.includes(pathMatch[1].toLowerCase()) ? pathMatch[1] : null;
    const onProfile = Boolean(pathUser) && (!pathMatch[2] || PROFILE_TABS.includes(pathMatch[2].toLowerCase()));

    const navHref = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href') || '';
    const switcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]')?.textContent || '';
    const ownHandle = (navHref.match(/^\/([A-Za-z0-9_]{1,15})$/) || switcher.match(/@([A-Za-z0-9_]{1,15})/) || [])[1] || null;

    if (!onProfile) {
      console.error(ownHandle
        ? `❌ Run this on your profile timeline: https://x.com/${ownHandle}`
        : '❌ Run this on your profile timeline (x.com/YOUR_USERNAME)');
      return;
    }
    if (ownHandle && pathUser.toLowerCase() !== ownHandle.toLowerCase()) {
      console.error(`❌ This is @${pathUser}'s profile. You can only delete your own posts: https://x.com/${ownHandle}`);
      return;
    }
    const profileUser = ownHandle || pathUser;
    console.log(`\n👤 Profile: @${profileUser}`);

    // Log active filters
    const f = CONFIG.filters;
    console.log('\n📋 Active Filters:');
    if (f.olderThanDays) console.log(`   • Older than ${f.olderThanDays} days`);
    if (f.beforeDate) console.log(`   • Before ${f.beforeDate}`);
    if (f.afterDate) console.log(`   • After ${f.afterDate}`);
    if (f.maxLikes !== null) console.log(`   • Max likes: ${f.maxLikes}`);
    if (f.maxRetweets !== null) console.log(`   • Max retweets: ${f.maxRetweets}`);
    if (f.containsKeywords.length) console.log(`   • Contains: ${f.containsKeywords.join(', ')}`);
    if (f.excludeKeywords.length) console.log(`   • Excludes: ${f.excludeKeywords.join(', ')}`);
    if (f.excludePinned) console.log('   • Skipping pinned tweet');
    if (f.onlyRetweets) console.log('   • Retweets only');
    if (f.onlyReplies) console.log('   • Replies only');
    if (!f.olderThanDays && !f.beforeDate && !f.afterDate && f.maxLikes === null &&
        f.maxRetweets === null && !f.containsKeywords.length && !f.onlyRetweets && !f.onlyReplies) {
      console.log('   ⚠️  NO FILTERS SET — ALL tweets will be deleted!');
    }
    console.log('');

    // Helpers
    const cutoffDate = f.olderThanDays ? new Date(Date.now() - f.olderThanDays * 86400000) : null;
    const beforeDate = f.beforeDate ? new Date(f.beforeDate) : null;
    const afterDate = f.afterDate ? new Date(f.afterDate) : null;

    const shouldDelete = (tweetData) => {
      const { text, likes, retweets, timestamp, isRetweet, isReply, isPinned } = tweetData;

      if (f.excludePinned && isPinned) return false;
      if (f.onlyRetweets && !isRetweet) return false;
      if (f.onlyReplies && !isReply) return false;

      if (timestamp) {
        const d = new Date(timestamp);
        if (cutoffDate && d > cutoffDate) return false;
        if (beforeDate && d > beforeDate) return false;
        if (afterDate && d < afterDate) return false;
      }

      if (f.maxLikes !== null && likes > f.maxLikes) return false;
      if (f.maxRetweets !== null && retweets > f.maxRetweets) return false;

      const lowerText = text.toLowerCase();
      if (f.containsKeywords.length > 0) {
        if (!f.containsKeywords.some(kw => lowerText.includes(kw.toLowerCase()))) return false;
      }
      if (f.excludeKeywords.length > 0) {
        if (f.excludeKeywords.some(kw => lowerText.includes(kw.toLowerCase()))) return false;
      }

      return true;
    };

    const extractTweetData = (article) => {
      const text = U.$('tweetText', article)?.textContent || '';
      const timeEl = article.querySelector('time');
      const timestamp = timeEl?.getAttribute('datetime') || '';
      const tweetLink = article.querySelector('a[href*="/status/"]');
      const tweetUrl = tweetLink?.getAttribute('href') || '';
      const tweetId = tweetUrl.split('/status/')[1]?.split(/[?/]/)[0] || '';

      const likeBtn = U.$('like', article);
      const rtBtn = U.$('retweet', article);
      const likes = U.parseCount(likeBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');
      const retweets = U.parseCount(rtBtn?.getAttribute('aria-label')?.match(/([\d,.]+[KMBkmb]?)/)?.[1] || '0');

      const isRetweet = !!article.querySelector('[data-testid="socialContext"]')?.textContent?.match(/reposted/i);
      const isReply = !!article.querySelector('[data-testid="socialContext"]')?.textContent?.match(/replying/i) ||
                      text.startsWith('@');
      const isPinned = !!article.querySelector('[data-testid="socialContext"]')?.textContent?.match(/pinned/i);

      return { text, timestamp, tweetId, tweetUrl, likes, retweets, isRetweet, isReply, isPinned };
    };

    // State
    const deletedLog = [];
    const processed = new Set();
    let deleted = 0, skippedCount = 0, errors = 0, consErr = 0;
    const t0 = Date.now();

    for (let scroll = 0; scroll < CONFIG.scrollCycles; scroll++) {
      if (deleted >= CONFIG.maxDeletes) break;
      if (!(await U.shouldContinue())) break;

      if (U.isRateLimited()) {
        console.warn(`⏳ Rate-limited — waiting ${CONFIG.rateLimitPauseMs / 1000}s...`);
        await U.sleep(CONFIG.rateLimitPauseMs);
        continue;
      }

      const articles = U.$$('tweet');
      let actedThisScroll = false;

      for (const article of articles) {
        if (deleted >= CONFIG.maxDeletes) break;
        if (!(await U.shouldContinue())) break;

        const data = extractTweetData(article);
        if (!data.tweetId || processed.has(data.tweetId)) continue;
        processed.add(data.tweetId);

        // Check if it belongs to profile owner
        const authorLink = article.querySelector(`a[href="/${profileUser}"]`);
        if (!authorLink && !data.isRetweet) continue;

        if (!shouldDelete(data)) {
          skippedCount++;
          continue;
        }

        if (CONFIG.dryRun) {
          const preview = data.text.slice(0, 60).replace(/\n/g, ' ');
          console.log(`🔍 [DRY] Would delete: "${preview}..." (❤️${data.likes} 🔄${data.retweets})`);
          deletedLog.push(data);
          deleted++;
          actedThisScroll = true;
          continue;
        }

        try {
          // Find and click the "more" menu (caret)
          const caret = U.$('caret', article);
          if (!caret) { skippedCount++; continue; }

          caret.scrollIntoView({ block: 'center', behavior: 'smooth' });
          await U.sleep(300);
          caret.click();
          await U.sleep(CONFIG.menuDelay);

          // Find "Delete" in the dropdown menu
          const menuItems = document.querySelectorAll('[role="menuitem"]');
          let deleteBtn = null;
          for (const item of menuItems) {
            if (/delete/i.test(item.textContent)) {
              deleteBtn = item;
              break;
            }
          }

          if (!deleteBtn) {
            // Might be a retweet — look for "Undo repost"
            for (const item of menuItems) {
              if (/undo repost|undo retweet/i.test(item.textContent)) {
                deleteBtn = item;
                break;
              }
            }
          }

          if (!deleteBtn) {
            // Close menu and skip
            document.body.click();
            await U.sleep(300);
            skippedCount++;
            continue;
          }

          deleteBtn.click();
          await U.sleep(CONFIG.menuDelay);

          // Confirm deletion
          const confirmBtn = U.$('confirmBtn');
          if (confirmBtn) {
            confirmBtn.click();
            deleted++;
            consErr = 0;
            actedThisScroll = true;

            const preview = data.text.slice(0, 50).replace(/\n/g, ' ');
            if (deleted <= 5 || deleted % 10 === 0) {
              console.log(`🗑️ #${deleted}: Deleted "${preview}..." (❤️${data.likes})`);
            }

            if (CONFIG.exportDeleted) {
              deletedLog.push(data);
            }

            // Periodic confirmation
            if (CONFIG.confirmEvery > 0 && deleted % CONFIG.confirmEvery === 0 && deleted > 0) {
              console.log(`\n⏸️  Paused at ${deleted} deletions. Call XActionsUtils.resume() to continue.\n`);
              if (window.XActionsUtils) window.XActionsUtils.pause();
              else { /* wait 10s then continue */ await U.sleep(10000); }
            }

            await U.randomDelay(CONFIG.minDelay, CONFIG.maxDelay);
          } else {
            console.warn('⚠️ No confirm dialog');
            errors++; consErr++;
            await U.sleep(1500);
          }
        } catch (e) {
          console.warn(`⚠️ Error: ${e.message}`);
          errors++; consErr++;
          document.body.click(); // close any open menus
          await U.sleep(2000);
        }

        if (consErr >= CONFIG.maxConsecutiveErrors) {
          console.error(`❌ ${consErr} consecutive errors — stopping.`);
          break;
        }
      }

      if (consErr >= CONFIG.maxConsecutiveErrors) break;

      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      await U.sleep(CONFIG.scrollDelay);

      // Progress update every 5 scrolls
      if (scroll > 0 && scroll % 5 === 0) {
        const s = ((Date.now() - t0) / 1000).toFixed(0);
        console.log(`📊 Scroll ${scroll}: ${deleted} deleted | ${skippedCount} skipped | ${s}s elapsed`);
      }
    }

    // ── Results ──────────────────────────────────────────────

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log('\n╔' + '═'.repeat(W) + '╗');
    console.log('║  ✅ BULK DELETE COMPLETE' + ' '.repeat(W - 25) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`  🗑️  Deleted:    ${deleted}`);
    console.log(`  ⏭️  Skipped:    ${skippedCount}`);
    console.log(`  ⚠️  Errors:     ${errors}`);
    console.log(`  📝 Processed:  ${processed.size}`);
    console.log(`  ⏱️  Time:       ${elapsed}s`);
    console.log(`  🔍 Dry run:    ${CONFIG.dryRun}`);

    if (CONFIG.exportOnComplete && deletedLog.length > 0) {
      U.download(
        { deleted: deletedLog, stats: { count: deleted, skipped: skippedCount, errors, elapsed: elapsed + 's' } },
        `xactions-deleted-tweets-${new Date().toISOString().slice(0, 10)}.json`
      );
    }

    if (CONFIG.dryRun && deleted > 0) {
      console.log(`\n  ⚡ Set dryRun = false and re-run to actually delete ${deleted} tweets.\n`);
    }
  })();
})();

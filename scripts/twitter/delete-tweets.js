// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🗑️ Delete Tweets - XActions
 * ============================================
 *
 * @name         delete-tweets
 * @description  DESTRUCTIVE: bulk-delete your own posts by age, keywords, or performance. Defaults to a safe dry run.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to YOUR OWN profile page (x.com/YOUR_USERNAME)
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter. It starts in DRY RUN and
 *      only LOGS what it would delete. Nothing is removed until you set
 *      CONFIG.dryRun = false and run it again.
 *
 * Example:
 *   olderThanDays: 365, minLikesToKeep: 25, maxDeletes: 50, dryRun: true.
 *   First run: lists up to 50 of your posts older than a year that have fewer
 *   than 25 likes, deleting nothing. Review the list, then set dryRun: false
 *   and re-run to permanently delete them. Deleted posts cannot be recovered.
 *   Run window.stopDeleteTweets() to halt after the current post.
 *
 * ============================================
 */

(async function deleteTweets() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // 🔒 SAFETY: true = preview only (logs what WOULD be deleted, deletes nothing).
    // You MUST set this to false yourself to actually delete. Keep it true first.
    dryRun: true,

    // Only delete posts older than this many days. 0 = any age.
    olderThanDays: 0,

    // Only delete posts whose text contains AT LEAST ONE of these
    // (case-insensitive). Empty array = ignore keywords (matches all).
    containingKeywords: [],

    // Protect high performers: skip any post with at least this many likes.
    // Set to a high number to keep your best posts. 0 = delete regardless.
    minLikesToKeep: 0,

    // Maximum number of posts to delete this run
    maxDeletes: 25,

    // Minimum delay between deletions (ms)
    minDelay: 1500,

    // Maximum delay between deletions (ms)
    maxDelay: 4000,

    // Maximum scroll attempts to load more posts
    maxScrollAttempts: 60,

    // Stop if no new posts appear after this many consecutive scrolls
    noNewPostsThreshold: 5
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    caret: '[data-testid="caret"]',
    likeButton: '[data-testid="like"], [data-testid="unlike"]',
    socialContext: '[data-testid="socialContext"]',
    confirm: '[data-testid="confirmationSheetConfirm"]',
    menuItem: '[role="menuitem"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const scrollDown = () => window.scrollTo(0, document.body.scrollHeight);

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} processed`)
  };

  const parseCount = (str) => {
    if (!str) return 0;
    const m = str.replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
    if (!m) return 0;
    let n = parseFloat(m[1]);
    if (m[2]) n *= { K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase()] || 1;
    return Math.round(n);
  };

  const download = (data, filename) => {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      log.info(`Saved a log of this run: ${filename}`);
    } catch (e) {
      log.warning(`Could not save the run log: ${e.message}`);
    }
  };

  const getTweetId = (tweet) => {
    const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
    if (timeAnchor) {
      const match = timeAnchor.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    const link = tweet.querySelector('a[href*="/status/"]');
    const m = link?.getAttribute('href')?.match(/\/status\/(\d+)/);
    return m ? m[1] : null;
  };

  const getLikes = (tweet) => {
    const el = tweet.querySelector(SELECTORS.likeButton);
    return parseCount(el?.getAttribute('aria-label') || '0');
  };

  const getTimestamp = (tweet) => tweet.querySelector('time')?.getAttribute('datetime') || '';

  const isPinned = (tweet) => /pinned/i.test(tweet.querySelector(SELECTORS.socialContext)?.textContent || '');
  const isRepost = (tweet) => /reposted/i.test(tweet.querySelector(SELECTORS.socialContext)?.textContent || '');

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = {
    deleted: 0,
    wouldDelete: 0,
    skippedTooNew: 0,
    skippedNoKeyword: 0,
    skippedHighPerformer: 0,
    skippedNotYours: 0,
    skippedPinned: 0,
    errors: 0
  };

  const processed = new Set();
  const deleteLog = [];

  // Stop switch: run window.stopDeleteTweets() to abort after the current post.
  let stopped = false;
  window.stopDeleteTweets = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current post, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🗑️  DELETE TWEETS - XActions                            ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: must be on the user's own profile (a /<handle> path, not a
  // reserved section). Warn, do not redirect.
  const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/?$/);
  const reserved = ['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings', 'compose', 'hashtag'];
  if (!pathMatch || reserved.includes(pathMatch[1].toLowerCase())) {
    log.warning('Go to YOUR OWN profile page first (x.com/YOUR_USERNAME), then run this again.');
    return;
  }
  const profileUser = pathMatch[1];
  log.info(`Profile: @${profileUser}`);

  // Loud destructive warning.
  if (CONFIG.dryRun) {
    console.log('%c🔍 DRY RUN - preview only. NOTHING will be deleted.', 'color:#1d9bf0;font-weight:bold;font-size:14px');
    console.log('%c   To actually delete, set CONFIG.dryRun = false and run again.', 'color:#1d9bf0');
  } else {
    console.log('%c⚠️⚠️⚠️ LIVE MODE - posts WILL be PERMANENTLY DELETED. This CANNOT be undone. ⚠️⚠️⚠️', 'color:#f4212e;font-weight:bold;font-size:15px');
  }

  const cutoff = CONFIG.olderThanDays > 0 ? new Date(Date.now() - CONFIG.olderThanDays * 86400000) : null;
  log.info(`Max deletes: ${CONFIG.maxDeletes} | Older than: ${CONFIG.olderThanDays || 'any'} days | Keep >= ${CONFIG.minLikesToKeep} likes`);
  log.info(`Keywords: ${CONFIG.containingKeywords.length ? CONFIG.containingKeywords.join(', ') : 'none (matches all)'}`);
  log.info('To stop early: window.stopDeleteTweets()');

  if (document.querySelector(SELECTORS.tweet) === null) {
    log.warning('No posts visible yet. Wait for your profile to load, then re-run.');
    return;
  }

  let scrollAttempts = 0;
  let noNewPostsCount = 0;

  while (!stopped && stats.deleted < CONFIG.maxDeletes && stats.wouldDelete < CONFIG.maxDeletes && scrollAttempts < CONFIG.maxScrollAttempts) {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    let foundNewPost = false;

    for (const tweet of tweets) {
      if (stopped) break;
      if (CONFIG.dryRun ? stats.wouldDelete >= CONFIG.maxDeletes : stats.deleted >= CONFIG.maxDeletes) break;

      const tweetId = getTweetId(tweet);
      if (!tweetId || processed.has(tweetId)) continue;
      processed.add(tweetId);
      foundNewPost = true;

      try {
        if (isPinned(tweet)) {
          stats.skippedPinned++;
          continue;
        }

        // Ownership: a repost by you counts; otherwise the author link must be you.
        const repost = isRepost(tweet);
        const ownAuthorLink = tweet.querySelector(`a[href="/${profileUser}" i]`);
        if (!repost && !ownAuthorLink) {
          stats.skippedNotYours++;
          continue;
        }

        const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
        const timestamp = getTimestamp(tweet);
        const likes = getLikes(tweet);

        // Filter: age
        if (cutoff && timestamp && new Date(timestamp) > cutoff) {
          stats.skippedTooNew++;
          continue;
        }

        // Filter: keywords
        if (CONFIG.containingKeywords.length > 0) {
          const lower = text.toLowerCase();
          if (!CONFIG.containingKeywords.some(kw => lower.includes(kw.toLowerCase()))) {
            stats.skippedNoKeyword++;
            continue;
          }
        }

        // Filter: protect high performers
        if (CONFIG.minLikesToKeep > 0 && likes >= CONFIG.minLikesToKeep) {
          stats.skippedHighPerformer++;
          continue;
        }

        const preview = text.slice(0, 60).replace(/\n/g, ' ') || (repost ? '(repost)' : '(no text)');

        if (CONFIG.dryRun) {
          stats.wouldDelete++;
          deleteLog.push({ tweetId, text: text.slice(0, 200), likes, timestamp, repost, dryRun: true });
          console.log(`🔍 [DRY] Would delete #${stats.wouldDelete}: "${preview}..." (❤️ ${likes})`);
          continue;
        }

        // LIVE deletion via the post's overflow (caret) menu.
        const caret = tweet.querySelector(SELECTORS.caret);
        if (!caret) continue;

        caret.scrollIntoView({ block: 'center' });
        await sleep(300);
        caret.click();
        await sleep(800);

        const menuItems = document.querySelectorAll(SELECTORS.menuItem);
        let actionBtn = null;
        for (const item of menuItems) {
          if (/delete/i.test(item.textContent) || /undo repost/i.test(item.textContent)) {
            actionBtn = item;
            break;
          }
        }

        if (!actionBtn) {
          document.body.click();
          await sleep(300);
          continue;
        }

        const wasRepost = /undo repost/i.test(actionBtn.textContent);
        actionBtn.click();
        await sleep(800);

        // Deleting an original post asks for confirmation; undo-repost is instant.
        if (!wasRepost) {
          const confirm = document.querySelector(SELECTORS.confirm);
          if (!confirm) {
            document.body.click();
            await sleep(400);
            continue;
          }
          confirm.click();
        }

        stats.deleted++;
        deleteLog.push({ tweetId, text: text.slice(0, 200), likes, timestamp, repost: wasRepost });
        log.success(`Deleted #${stats.deleted}: "${preview}..." (❤️ ${likes})`);
        log.progress(stats.deleted, CONFIG.maxDeletes);
        await randomDelay();
      } catch (error) {
        log.error(`Error processing post: ${error.message}`);
        stats.errors++;
        document.body.click();
        await sleep(800);
      }
    }

    if (!foundNewPost) {
      noNewPostsCount++;
      if (noNewPostsCount >= CONFIG.noNewPostsThreshold) {
        log.warning('No new posts found after multiple scrolls. Stopping.');
        break;
      }
    } else {
      noNewPostsCount = 0;
    }

    scrollDown();
    scrollAttempts++;
    log.info(`Scrolling for more posts... (attempt ${scrollAttempts}/${CONFIG.maxScrollAttempts})`);
    await sleep(2000);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  const totalSkipped = stats.skippedTooNew + stats.skippedNoKeyword + stats.skippedHighPerformer + stats.skippedNotYours + stats.skippedPinned;

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 DELETE TWEETS - COMPLETE                             ║
╠══════════════════════════════════════════════════════════╣
║  🗑️  Deleted:             ${String(stats.deleted).padEnd(29)}║
║  🔍 Would Delete (dry):   ${String(stats.wouldDelete).padEnd(29)}║
║  ⏭️  Total Skipped:       ${String(totalSkipped).padEnd(29)}║
║     └─ Too New:           ${String(stats.skippedTooNew).padEnd(29)}║
║     └─ No Keyword:        ${String(stats.skippedNoKeyword).padEnd(29)}║
║     └─ High Performer:    ${String(stats.skippedHighPerformer).padEnd(29)}║
║     └─ Not Yours:         ${String(stats.skippedNotYours).padEnd(29)}║
║     └─ Pinned:            ${String(stats.skippedPinned).padEnd(29)}║
║  ❌ Errors:               ${String(stats.errors).padEnd(29)}║
║  📜 Scroll Attempts:      ${String(scrollAttempts).padEnd(29)}║
╚══════════════════════════════════════════════════════════╝
  `);

  if (deleteLog.length > 0) {
    download(
      { profile: profileUser, stats, dryRun: CONFIG.dryRun, tweets: deleteLog },
      `xactions-delete-tweets-${new Date().toISOString().slice(0, 10)}.json`
    );
  }

  if (CONFIG.dryRun && stats.wouldDelete > 0) {
    console.log(`%c⚡ Reviewed ${stats.wouldDelete} post(s). Set CONFIG.dryRun = false and re-run to PERMANENTLY delete them.`, 'color:#f4212e;font-weight:bold');
  } else if (CONFIG.dryRun) {
    log.info('Nothing matched your filters. Loosen olderThanDays / keywords / minLikesToKeep.');
  }
  log.success('Script completed! by nichxbt');

  return stats;
})();

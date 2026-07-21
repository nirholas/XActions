// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================
 * 🔄 Auto Repost - XActions
 * ============================================
 *
 * @name         auto-repost
 * @description  Automatically repost (retweet) posts matching your criteria as you scroll a search, hashtag, or profile page.
 * @author       nichxbt
 * @version      1.0.0
 * @date         2026-07-20
 * @website      https://xactions.app
 *
 * Usage:
 *   1. Go to a search or hashtag results page (e.g. x.com/search?q=%23AI&f=live)
 *      or a profile (e.g. x.com/nichxbt). Reposting reads whatever timeline is on screen.
 *   2. Open the browser console (F12 or Cmd+Option+I -> Console)
 *   3. (Optional) edit the CONFIG options at the top of the script
 *   4. Paste this entire script and press Enter
 *
 * Example:
 *   Set maxReposts: 10, onlyWithMedia: true, mustContainKeywords: ['launch', 'shipped'].
 *   On a live search for #buildinpublic, it reposts up to 10 posts that contain
 *   an image or video AND mention "launch" or "shipped", pausing 1.5-4s between each.
 *   Run window.stopAutoRepost() any time to halt after the current post.
 *
 * ============================================
 */

(async function autoRepost() {
  'use strict';

  // ============================================
  // 📝 CONFIGURATION - Customize these options
  // ============================================
  const CONFIG = {
    // Maximum number of posts to repost this run
    maxReposts: 10,

    // Skip promoted/ad posts
    skipAds: true,

    // Skip reply posts (only repost top-level posts)
    skipReplies: true,

    // Only repost posts that contain an image or video
    onlyWithMedia: false,

    // Only repost posts whose text contains AT LEAST ONE of these
    // (case-insensitive). Empty array = no keyword filter (repost everything).
    mustContainKeywords: [],

    // Minimum delay between reposts (ms)
    minDelay: 1500,

    // Maximum delay between reposts (ms)
    maxDelay: 4000,

    // Maximum scroll attempts to find new posts
    maxScrollAttempts: 25,

    // Stop if no new posts appear after this many consecutive scrolls
    noNewPostsThreshold: 5
  };

  // ============================================
  // 🔧 SELECTORS
  // ============================================
  const SELECTORS = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    retweetButton: '[data-testid="retweet"]',
    unretweetButton: '[data-testid="unretweet"]',
    retweetConfirm: '[data-testid="retweetConfirm"]',
    socialContext: '[data-testid="socialContext"]',
    promotedLabel: '[data-testid="placementTracking"]',
    media: '[data-testid="tweetPhoto"], [data-testid="videoPlayer"], [data-testid="videoComponent"]'
  };

  // ============================================
  // 🛠️ HELPERS
  // ============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const randomDelay = () => {
    const delay = Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;
    return sleep(delay);
  };

  const scrollDown = () => window.scrollBy(0, window.innerHeight * 0.7);

  const log = {
    info: (msg) => console.log(`ℹ️ ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️ ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    progress: (current, total) => console.log(`📊 Progress: ${current}/${total} reposted`)
  };

  const isReply = (tweet) => {
    if (tweet.querySelector('[data-testid="in-reply-to"]') !== null) return true;
    return Array.from(tweet.querySelectorAll('div[dir]')).some(el =>
      el.innerText.startsWith('Replying to'));
  };

  const isAd = (tweet) => {
    if (tweet.querySelector(SELECTORS.promotedLabel) !== null) return true;
    return Array.from(tweet.querySelectorAll('span')).some(el => {
      const t = el.textContent.trim();
      return t === 'Ad' || t === 'Promoted';
    });
  };

  const hasMedia = (tweet) => tweet.querySelector(SELECTORS.media) !== null;

  const matchesKeywords = (text) => {
    if (CONFIG.mustContainKeywords.length === 0) return true;
    const lower = text.toLowerCase();
    return CONFIG.mustContainKeywords.some(kw => lower.includes(kw.toLowerCase()));
  };

  const getTweetIdentifier = (tweet) => {
    const timeAnchor = tweet.querySelector('time')?.closest('a[href*="/status/"]');
    if (timeAnchor) {
      const match = timeAnchor.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    const links = tweet.querySelectorAll('a[href*="/status/"]');
    for (const link of links) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
    return text.substring(0, 100);
  };

  // ============================================
  // 🎯 MAIN LOGIC
  // ============================================
  const stats = {
    reposted: 0,
    skippedReplies: 0,
    skippedAds: 0,
    skippedNoMedia: 0,
    skippedNoKeyword: 0,
    alreadyReposted: 0,
    errors: 0
  };

  const processedTweets = new Set();

  // Stop switch: run window.stopAutoRepost() from the console to abort the
  // loop after the post currently being processed.
  let stopped = false;
  window.stopAutoRepost = () => {
    stopped = true;
    log.warning('Stop requested. Finishing the current post, then exiting.');
  };

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🔄 AUTO REPOST - XActions                               ║
║  👤 Author: nichxbt                                      ║
║  🌐 https://xactions.app                                 ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Page guard: reposting reads the rendered timeline. Warn (do not redirect)
  // if there is no post feed on screen.
  const href = window.location.href;
  const looksLikeFeed = /x\.com|twitter\.com/.test(href);
  if (!looksLikeFeed) {
    log.warning('Open x.com on a search, hashtag, or profile page, then run this again.');
    return;
  }
  if (document.querySelector(SELECTORS.tweet) === null) {
    log.warning('No posts visible yet. Go to a search/hashtag results page or a profile, wait for posts to load, then re-run.');
    return;
  }

  log.info(`Max reposts: ${CONFIG.maxReposts}`);
  log.info(`Skip ads: ${CONFIG.skipAds} | Skip replies: ${CONFIG.skipReplies} | Only media: ${CONFIG.onlyWithMedia}`);
  log.info(`Keywords: ${CONFIG.mustContainKeywords.length ? CONFIG.mustContainKeywords.join(', ') : 'none (repost all)'}`);
  log.info('To stop early: window.stopAutoRepost()');

  let scrollAttempts = 0;
  let noNewPostsCount = 0;

  while (!stopped && stats.reposted < CONFIG.maxReposts && scrollAttempts < CONFIG.maxScrollAttempts) {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    let foundNewPost = false;

    for (const tweet of tweets) {
      if (stopped || stats.reposted >= CONFIG.maxReposts) break;

      const tweetId = getTweetIdentifier(tweet);
      if (processedTweets.has(tweetId)) continue;
      processedTweets.add(tweetId);
      foundNewPost = true;

      try {
        if (CONFIG.skipAds && isAd(tweet)) {
          stats.skippedAds++;
          continue;
        }

        if (CONFIG.skipReplies && isReply(tweet)) {
          stats.skippedReplies++;
          continue;
        }

        if (CONFIG.onlyWithMedia && !hasMedia(tweet)) {
          stats.skippedNoMedia++;
          continue;
        }

        const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
        if (!matchesKeywords(text)) {
          stats.skippedNoKeyword++;
          continue;
        }

        // Already reposted? The button flips to unretweet.
        if (tweet.querySelector(SELECTORS.unretweetButton)) {
          stats.alreadyReposted++;
          continue;
        }

        const retweetButton = tweet.querySelector(SELECTORS.retweetButton);
        if (!retweetButton) continue;

        tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(500);

        retweetButton.click();
        await sleep(800);

        const confirm = document.querySelector(SELECTORS.retweetConfirm);
        if (confirm) {
          confirm.click();
          stats.reposted++;
          const preview = text.substring(0, 50).replace(/\n/g, ' ') || '(no text)';
          log.success(`Reposted #${stats.reposted}: "${preview}..."`);
          log.progress(stats.reposted, CONFIG.maxReposts);
          await randomDelay();
        } else {
          // Menu did not open as expected (e.g. quote-only). Close it and move on.
          document.body.click();
          await sleep(400);
        }
      } catch (error) {
        log.error(`Error processing post: ${error.message}`);
        stats.errors++;
        document.body.click();
        await sleep(600);
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
    await sleep(1500);
  }

  // ============================================
  // 📊 SUMMARY
  // ============================================
  const totalSkipped = stats.skippedReplies + stats.skippedAds + stats.skippedNoMedia + stats.skippedNoKeyword;

  console.log(`
╔══════════════════════════════════════════════════════════╗
║  📊 AUTO REPOST - COMPLETE                               ║
╠══════════════════════════════════════════════════════════╣
║  🔄 Total Reposted:    ${String(stats.reposted).padEnd(32)}║
║  ⏭️  Total Skipped:     ${String(totalSkipped).padEnd(32)}║
║     └─ Replies:        ${String(stats.skippedReplies).padEnd(32)}║
║     └─ Ads:            ${String(stats.skippedAds).padEnd(32)}║
║     └─ No Media:       ${String(stats.skippedNoMedia).padEnd(32)}║
║     └─ No Keyword:     ${String(stats.skippedNoKeyword).padEnd(32)}║
║  🔁 Already Reposted:  ${String(stats.alreadyReposted).padEnd(32)}║
║  ❌ Errors:            ${String(stats.errors).padEnd(32)}║
║  📜 Scroll Attempts:   ${String(scrollAttempts).padEnd(32)}║
╚══════════════════════════════════════════════════════════╝
  `);

  if (stats.reposted === 0) {
    log.warning('Nothing reposted. Loosen your filters (keywords/media) or scroll a busier feed.');
  }
  log.success('Script completed! by nichxbt');

  return stats;
})();

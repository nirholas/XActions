// GENERATED FILE: a copy of browser/autoRepost.js, written by scripts/build-script-manifest.mjs. Edit browser/autoRepost.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        autoRepost.js
 * @title       Auto Repost
 * @description Repost timeline or search posts that match keywords, authors, likes and media filters, dry run by default.
 * @category    engage
 * @page        x.com/home or x.com/search?q=<query>&f=live
 * @writes      true
 * @aliases     scripts/autoRepost.js, scripts/twitter/auto-repost.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// Auto Repost (Retweet) on X - by nichxbt
// https://github.com/nirholas/xactions
// Automatically repost tweets matching keywords or from specific users
// 1. Go to x.com/home or x.com/search (a hashtag or profile timeline works too)
// 2. Open the Developer Console (F12)
// 3. Paste browser/autoRepost.js into the Developer Console and run it
//    It starts as a dry run that only lists what it would repost: set
//    CONFIG.dryRun = false to repost for real.
//
// To stop early: window.stopAutoRepost()
//
// Last Updated: 27 November 2026
(() => {
  const CONFIG = {
    // Filter criteria (at least one must match)
    keywords: [
      // 'AI agents',
      // 'open source',
    ],
    fromUsers: [
      // 'elonmusk',
      // 'nichxbt',
    ],
    allowUnfiltered: false, // true = run with no keywords/fromUsers and repost every post that passes the other filters
    maxReposts: 5,
    minDelay: 3000,
    maxDelay: 4000,
    scrollDelay: 2000,
    maxScrollAttempts: 20, // Stop after this many consecutive scrolls with no new posts
    maxTotalScrolls: 0,    // Stop after this many scrolls in total (0 = no limit)
    // Safety
    dryRun: true,          // true = only log what would be reposted. false = repost for real.
    skipReplies: true,
    skipAds: true,         // Skip promoted/ad posts
    skipSensitive: true,
    onlyWithMedia: false,  // Only repost posts that contain an image or video
    minLikes: 5, // Only repost tweets with at least this many likes
  };

  const $tweet = 'article[data-testid="tweet"]';
  const $tweetText = '[data-testid="tweetText"]';
  const $retweetButton = '[data-testid="retweet"]';
  const $retweetConfirm = '[data-testid="retweetConfirm"]';
  const $like = '[data-testid="like"], [data-testid="unlike"]';
  const $promoted = '[data-testid="placementTracking"]';
  const $media = '[data-testid="tweetPhoto"], [data-testid="videoPlayer"], [data-testid="videoComponent"]';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const randomDelay = () => Math.floor(Math.random() * (CONFIG.maxDelay - CONFIG.minDelay + 1)) + CONFIG.minDelay;

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)([KMB])?/i);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (match[2]) num *= { K: 1000, M: 1000000, B: 1000000000 }[match[2].toUpperCase()];
    return Math.round(num);
  };

  let reposted = 0;
  const processedTweets = new Set();
  const stats = {
    skippedReplies: 0,
    skippedAds: 0,
    skippedNoMedia: 0,
    skippedLowLikes: 0,
    skippedNoMatch: 0,
    alreadyReposted: 0,
    errors: 0,
  };

  // Stop switch: run window.stopAutoRepost() from the console to abort the
  // loop after the post currently being processed.
  let stopped = false;
  window.stopAutoRepost = () => {
    stopped = true;
    console.log('⚠️ Stop requested. Finishing the current post, then exiting.');
  };

  // Post ID from the time element's permalink first, so a quoted post's link
  // is never mistaken for the post itself.
  const getTweetId = (tweetEl) => {
    const timeAnchor = tweetEl.querySelector('time')?.closest('a[href*="/status/"]');
    const timeMatch = timeAnchor?.href?.match(/\/status\/(\d+)/);
    if (timeMatch) return timeMatch[1];
    for (const link of tweetEl.querySelectorAll('a[href*="/status/"]')) {
      const match = link.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    return (tweetEl.querySelector($tweetText)?.textContent || '').substring(0, 100);
  };

  const isReply = (tweetEl) => {
    if (tweetEl.querySelector('[data-testid="in-reply-to"]') !== null) return true;
    return Array.from(tweetEl.querySelectorAll('div[dir]')).some(el =>
      el.innerText.startsWith('Replying to'));
  };

  const isAd = (tweetEl) => {
    if (tweetEl.querySelector($promoted) !== null) return true;
    return Array.from(tweetEl.querySelectorAll('span')).some(el => {
      const t = el.textContent.trim();
      return t === 'Ad' || t === 'Promoted';
    });
  };

  const hasMedia = (tweetEl) => tweetEl.querySelector($media) !== null;

  const getUsername = (tweetEl) => {
    const userLink = tweetEl.querySelector('a[href^="/"][role="link"]');
    return userLink?.href?.match(/x\.com\/([^\/]+)/)?.[1] || '';
  };

  const matchesCriteria = (tweetEl) => {
    const textEl = tweetEl.querySelector($tweetText);
    const text = textEl?.textContent?.toLowerCase() || '';

    // Check username
    const username = getUsername(tweetEl).toLowerCase();

    const matchesKeyword = CONFIG.keywords.length === 0 || CONFIG.keywords.some(kw => text.includes(kw.toLowerCase()));
    const matchesUser = CONFIG.fromUsers.length === 0 || CONFIG.fromUsers.some(u => u.toLowerCase() === username);

    // Need at least one filter active and matching
    if (CONFIG.keywords.length > 0 && CONFIG.fromUsers.length > 0) {
      return matchesKeyword || matchesUser;
    }
    if (CONFIG.keywords.length > 0) return matchesKeyword;
    if (CONFIG.fromUsers.length > 0) return matchesUser;
    return true;
  };

  const run = async () => {
    console.log('🔄 AUTO REPOST - XActions by nichxbt');

    if (CONFIG.keywords.length === 0 && CONFIG.fromUsers.length === 0 && !CONFIG.allowUnfiltered) {
      console.error('❌ No filters! Edit CONFIG.keywords or CONFIG.fromUsers (or set CONFIG.allowUnfiltered = true)');
      return;
    }

    // Page guard: reposting reads the rendered timeline.
    if (document.querySelector($tweet) === null) {
      console.warn('⚠️ No posts visible yet. Go to your home timeline, a search/hashtag results page or a profile, wait for posts to load, then re-run.');
      return;
    }

    console.log(`⚙️ Mode: ${CONFIG.dryRun ? '🔍 DRY RUN (nothing is reposted)' : '⚡ LIVE'}`);
    console.log(`🔍 Keywords: ${CONFIG.keywords.join(', ') || 'none'}`);
    console.log(`👤 Users: ${CONFIG.fromUsers.join(', ') || 'none'}`);
    console.log(`🚫 Skip ads: ${CONFIG.skipAds} | Skip replies: ${CONFIG.skipReplies} | Only media: ${CONFIG.onlyWithMedia} | Min likes: ${CONFIG.minLikes}`);
    console.log(`📊 Max reposts: ${CONFIG.maxReposts}`);
    console.log('🛑 To stop early: window.stopAutoRepost()\n');

    let scrollAttempts = 0;
    let totalScrolls = 0;

    while (!stopped && reposted < CONFIG.maxReposts && scrollAttempts < CONFIG.maxScrollAttempts) {
      if (CONFIG.maxTotalScrolls > 0 && totalScrolls >= CONFIG.maxTotalScrolls) break;

      const tweets = document.querySelectorAll($tweet);
      let foundNew = false;

      for (const tweet of tweets) {
        if (stopped || reposted >= CONFIG.maxReposts) break;

        const tweetId = getTweetId(tweet);
        if (!tweetId || processedTweets.has(tweetId)) continue;
        processedTweets.add(tweetId);
        foundNew = true;

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

        // Skip if already retweeted
        if (tweet.querySelector('[data-testid="unretweet"]')) {
          stats.alreadyReposted++;
          continue;
        }

        // Check likes threshold
        const likeEl = tweet.querySelector($like);
        const likes = parseCount(likeEl?.getAttribute('aria-label') || '0');
        if (likes < CONFIG.minLikes) {
          stats.skippedLowLikes++;
          continue;
        }

        if (!matchesCriteria(tweet)) {
          stats.skippedNoMatch++;
          continue;
        }

        const text = tweet.querySelector($tweetText)?.textContent?.substring(0, 50).replace(/\n/g, ' ') || '';
        const username = getUsername(tweet);

        if (CONFIG.dryRun) {
          reposted++;
          console.log(`🔍 [DRY] #${reposted} Would repost @${username}: "${text}..."`);
          continue;
        }

        try {
          const rtBtn = tweet.querySelector($retweetButton);
          if (!rtBtn) continue;

          tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(500);

          rtBtn.click();
          await sleep(800);

          const confirmBtn = document.querySelector($retweetConfirm);
          if (confirmBtn) {
            confirmBtn.click();
            reposted++;
            console.log(`🔄 Reposted (${reposted}/${CONFIG.maxReposts}) @${username}: "${text}..."`);
          } else {
            document.body.click(); // Close menu
          }

          await sleep(randomDelay());
        } catch (e) {
          stats.errors++;
          console.warn(`⚠️ Error: ${e.message}`);
          document.body.click();
        }
      }

      if (!foundNew) scrollAttempts++;
      else scrollAttempts = 0;

      if (stopped) break;
      window.scrollTo(0, document.body.scrollHeight);
      totalScrolls++;
      await sleep(CONFIG.scrollDelay);
    }

    const totalSkipped = stats.skippedReplies + stats.skippedAds + stats.skippedNoMedia + stats.skippedLowLikes + stats.skippedNoMatch;
    console.log(`\n✅ Done! ${CONFIG.dryRun ? 'Would have reposted' : 'Reposted'} ${reposted} tweets.`);
    console.log(`   📜 Scanned: ${processedTweets.size}`);
    console.log(`   ⏭️ Skipped: ${totalSkipped} (replies ${stats.skippedReplies}, ads ${stats.skippedAds}, no media ${stats.skippedNoMedia}, low likes ${stats.skippedLowLikes}, no filter match ${stats.skippedNoMatch})`);
    console.log(`   🔁 Already reposted: ${stats.alreadyReposted}`);
    console.log(`   ❌ Errors: ${stats.errors}`);
    console.log(`   📜 Scrolls: ${totalScrolls}`);
    if (reposted === 0) {
      console.warn('⚠️ Nothing matched. Loosen your filters (keywords, users, likes, media) or scroll a busier feed.');
    } else if (CONFIG.dryRun) {
      console.log(`\n⚡ Set CONFIG.dryRun = false to repost ${reposted} tweets for real.`);
    }

    return { reposted, scanned: processedTweets.size, scrolls: totalScrolls, dryRun: CONFIG.dryRun, ...stats };
  };

  run();
})();

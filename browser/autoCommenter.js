// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * ============================================================
 * 💬 Auto Commenter
 * ============================================================
 *
 * @name        autoCommenter.js
 * @title       Auto Commenter
 * @description Watch a user's profile for new posts and reply to them with a random comment from your list, with an age window and a cap.
 * @category    engage
 * @page        x.com/<username>
 * @writes      true
 * @aliases     src/automation/autoCommenter.js, scripts/twitter/auto-commenter.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * Monitors a user's profile for new posts and auto-comments.
 * Great for engagement, building relationships, never missing a post.
 *
 * 1. Go to the user's profile: x.com/USERNAME
 * 2. Customize the COMMENTS array in CONFIG with your messages
 * 3. Paste browser/autoCommenter.js into the DevTools console and press Enter
 *    (src/automation/core.js is optional: when it is pasted first its
 *    logger, storage and selectors are used)
 * 4. Run stopAutoComment() to stop
 *
 * ⚠️ WARNING: Use responsibly! Spammy comments can get you limited.
 * Keep the delays long and the comments varied.
 * ============================================================
 */

(() => {
  // ============================================
  // CORE (optional): use core.js when present, built-ins otherwise
  // ============================================
  const Core = window.XActions?.Core;

  const sleep = Core?.sleep || ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
  const randomDelay = Core?.randomDelay || ((min, max) => sleep(Math.floor(Math.random() * (max - min + 1)) + min));
  const log = Core?.log || ((message, type = 'info') => {
    const prefix = { info: '📘', success: '✅', warning: '⚠️', error: '❌', action: '🔧' }[type] || '📘';
    console.log(`${prefix} [${new Date().toLocaleTimeString()}] ${message}`);
  });
  const scrollToTop = Core?.scrollToTop || (() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const clickElement = Core?.clickElement || (async (element) => {
    if (!element) return false;
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);
      element.click();
      return true;
    } catch (e) {
      log(`Click error: ${e.message}`, 'error');
      return false;
    }
  });
  const waitForElement = Core?.waitForElement || (async (selector, timeout = 10000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await sleep(100);
    }
    return null;
  });
  // Same key layout as core.js storage (xactions_ prefix, JSON values)
  const storage = Core?.storage || {
    get: (key) => {
      try {
        const data = localStorage.getItem('xactions_' + key);
        return data ? JSON.parse(data) : null;
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem('xactions_' + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
  const SELECTORS = Core?.SELECTORS || {
    replyButton: '[data-testid="reply"]',
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
  };

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // Comments to randomly choose from
    COMMENTS: [
      '🔥',
      'Great point!',
      'This is so true 👏',
      'Interesting take!',
      'Love this perspective',
      '💯',
      'Facts!',
    ],

    // Monitoring settings
    CHECK_INTERVAL_SECONDS: 60,   // How often to check for new posts
    MAX_COMMENTS_PER_SESSION: 5,  // Stop after this many comments
    RUN_ONCE: false,              // true = one scan and stop instead of re-checking every interval
    SCROLLS_PER_CHECK: 0,         // Scroll down the profile this many times per check (0 = visible posts only)
    SCROLL_DELAY_MS: 2000,        // Wait after each scroll

    // Behavior
    ONLY_ORIGINAL_TWEETS: true,   // Skip replies and retweets
    ONLY_WITH_MEDIA: false,       // Only comment on posts with an image or video
    REQUIRE_KEYWORD: false,       // Only comment if post contains keyword
    KEYWORDS: [],                 // Keywords to match (if REQUIRE_KEYWORD is true)

    // Safety
    MIN_POST_AGE_SECONDS: 30,     // Don't comment on posts younger than this
    MAX_POST_AGE_MINUTES: 30,     // Don't comment on posts older than this
    MIN_DELAY_MS: 30000,          // Delay between comments: 30 seconds minimum!
    MAX_DELAY_MS: 60000,
  };

  // ============================================
  // STATE
  // ============================================
  let commentCount = 0;
  let checkCount = 0;
  let isRunning = true;

  // ============================================
  // HELPERS
  // ============================================
  const getUsername = () => {
    const match = window.location.pathname.match(/^\/([^/]+)/);
    return match ? match[1] : 'unknown';
  };

  const RESERVED_PATHS = ['home', 'explore', 'search', 'notifications', 'messages', 'i', 'unknown'];
  const targetUser = getUsername();
  // Per-profile history written by the scripts/twitter variant of this tool
  const PROFILE_STORAGE_KEY = `xactions_commented_${targetUser}`;

  const loadProfileHistory = () => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  };

  const commentedTweets = new Set([...(storage.get('commented_tweets') || []), ...loadProfileHistory()]);
  const profileCommented = new Set(loadProfileHistory());

  const getRandomComment = () => {
    return CONFIG.COMMENTS[Math.floor(Math.random() * CONFIG.COMMENTS.length)];
  };

  const getTweetId = (tweetElement) => {
    // The timestamp's enclosing anchor is the tweet's own permalink; the first
    // /status/ link in the article can belong to a quoted tweet
    const timeEl = tweetElement.querySelector('time');
    const link = (timeEl && timeEl.closest('a[href*="/status/"]')) ||
                 tweetElement.querySelector('a[href*="/status/"]');
    if (link) {
      const match = link.href.match(/status\/(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  };

  const getTweetAge = (tweetElement) => {
    // Try to find the time element
    const timeEl = tweetElement.querySelector('time');
    if (timeEl) {
      const datetime = timeEl.getAttribute('datetime');
      if (datetime) {
        return Date.now() - new Date(datetime).getTime();
      }
    }
    return null;
  };

  const isReply = (tweetElement) => {
    // Structural marker first; English text as fallback
    if (tweetElement.querySelector('[data-testid="in-reply-to"]')) return true;
    return !!tweetElement.textContent?.includes('Replying to');
  };

  const isRetweet = (tweetElement) => {
    return !!tweetElement.closest('article')?.textContent?.includes('reposted');
  };

  const hasMedia = (tweetElement) => {
    return !!(tweetElement.querySelector('[data-testid="tweetPhoto"]') ||
              tweetElement.querySelector('[data-testid="videoPlayer"], [data-testid="videoComponent"]'));
  };

  const matchesKeywords = (text) => {
    if (!CONFIG.REQUIRE_KEYWORD) return true;
    if (CONFIG.KEYWORDS.length === 0) return true;
    const lowerText = text.toLowerCase();
    return CONFIG.KEYWORDS.some(kw => lowerText.includes(kw.toLowerCase()));
  };

  const closeComposer = () => {
    const closeBtn = document.querySelector('[data-testid="app-bar-close"]');
    if (closeBtn) {
      closeBtn.click();
    } else {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    }
  };

  // ============================================
  // COMMENT ACTION
  // ============================================
  const postComment = async (tweetElement) => {
    const tweetId = getTweetId(tweetElement);
    if (!tweetId) return false;

    // Click reply button
    const replyBtn = tweetElement.querySelector(SELECTORS.replyButton);
    if (!replyBtn) {
      log('Reply button not found', 'warning');
      return false;
    }

    await clickElement(replyBtn);
    await sleep(1000);

    // Wait for reply modal/input
    const replyInput = await waitForElement('[data-testid="tweetTextarea_0"]', 5000);
    if (!replyInput) {
      log('Reply input not found', 'warning');
      closeComposer();
      return false;
    }

    // Type the comment
    const comment = getRandomComment();

    // Focus and type
    replyInput.focus();
    await sleep(300);

    // Use execCommand for contenteditable
    document.execCommand('insertText', false, comment);
    await sleep(500);

    // Find and click the Reply/Post button
    const postBtn = await waitForElement('[data-testid="tweetButton"]', 3000);
    if (!postBtn) {
      log('Post button not found', 'warning');
      closeComposer();
      return false;
    }

    // Check if button is enabled
    if (postBtn.disabled || postBtn.getAttribute('aria-disabled') === 'true') {
      log('Post button is disabled', 'warning');
      await sleep(500);
      if (postBtn.disabled || postBtn.getAttribute('aria-disabled') === 'true') {
        log('Post button still disabled, skipping this post', 'warning');
        closeComposer();
        return false;
      }
    }

    await clickElement(postBtn);
    await sleep(1000);

    // Save that we commented
    commentedTweets.add(tweetId);
    storage.set('commented_tweets', Array.from(commentedTweets));
    profileCommented.add(tweetId);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify([...profileCommented]));
    } catch {
      // storage full or blocked: the global history above still has it
    }
    commentCount++;

    log(`💬 Commented "${comment}" on tweet ${tweetId}`, 'success');
    return true;
  };

  // ============================================
  // FIND NEW TWEETS
  // ============================================
  const findNewTweets = () => {
    const tweets = document.querySelectorAll(SELECTORS.tweet);
    const newTweets = [];

    for (const tweet of tweets) {
      const tweetId = getTweetId(tweet);
      if (!tweetId) continue;

      // Skip if already commented
      if (commentedTweets.has(tweetId)) continue;

      // Skip replies/retweets if configured
      if (CONFIG.ONLY_ORIGINAL_TWEETS) {
        if (isReply(tweet) || isRetweet(tweet)) continue;
      }

      if (CONFIG.ONLY_WITH_MEDIA && !hasMedia(tweet)) continue;

      // Check age (posts with no timestamp, such as promoted posts, are skipped)
      const ageMs = getTweetAge(tweet);
      if (ageMs === null) continue;
      const ageSeconds = ageMs / 1000;
      const ageMinutes = ageSeconds / 60;

      if (ageSeconds < CONFIG.MIN_POST_AGE_SECONDS) continue;
      if (ageMinutes > CONFIG.MAX_POST_AGE_MINUTES) continue;

      // Check keywords
      const textEl = tweet.querySelector(SELECTORS.tweetText);
      const text = textEl?.textContent || '';
      if (!matchesKeywords(text)) continue;

      newTweets.push({ element: tweet, tweetId, text: text.substring(0, 50) });
    }

    return newTweets;
  };

  const commentOnVisible = async () => {
    const newTweets = findNewTweets();

    if (newTweets.length > 0) {
      log(`Found ${newTweets.length} new tweets to comment on!`, 'success');

      for (const { element, text } of newTweets) {
        if (!isRunning || commentCount >= CONFIG.MAX_COMMENTS_PER_SESSION) break;
        if (!element.isConnected) continue;

        log(`Commenting on: "${text}..."`, 'action');
        const posted = await postComment(element);
        if (posted && commentCount < CONFIG.MAX_COMMENTS_PER_SESSION) {
          log(`⏳ Waiting ${Math.round(CONFIG.MIN_DELAY_MS / 1000)}-${Math.round(CONFIG.MAX_DELAY_MS / 1000)}s before next comment...`, 'info');
          await randomDelay(CONFIG.MIN_DELAY_MS, CONFIG.MAX_DELAY_MS);
        }
      }
      return true;
    }
    return false;
  };

  // ============================================
  // MAIN LOOP
  // ============================================
  const check = async () => {
    if (!isRunning) return;
    if (commentCount >= CONFIG.MAX_COMMENTS_PER_SESSION) {
      log(`Reached max comments (${CONFIG.MAX_COMMENTS_PER_SESSION}). Stopping.`, 'warning');
      return;
    }

    checkCount++;
    const time = new Date().toLocaleTimeString();
    log(`[${time}] Check #${checkCount}...`, 'info');

    // Refresh the page content
    scrollToTop();
    await sleep(2000);

    // Find new tweets
    let found = await commentOnVisible();

    // Optionally scroll further down the profile
    for (let s = 0; s < CONFIG.SCROLLS_PER_CHECK; s++) {
      if (!isRunning || commentCount >= CONFIG.MAX_COMMENTS_PER_SESSION) break;
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.SCROLL_DELAY_MS);
      if (await commentOnVisible()) found = true;
    }

    if (!found) {
      log('No new tweets found', 'info');
    }

    if (CONFIG.RUN_ONCE) {
      isRunning = false;
      log(`Single scan complete. Total comments posted: ${commentCount}`, 'success');
      return;
    }

    // Schedule next check
    if (isRunning && commentCount < CONFIG.MAX_COMMENTS_PER_SESSION) {
      log(`Next check in ${CONFIG.CHECK_INTERVAL_SECONDS} seconds...`, 'info');
      setTimeout(check, CONFIG.CHECK_INTERVAL_SECONDS * 1000);
    } else if (commentCount >= CONFIG.MAX_COMMENTS_PER_SESSION) {
      log(`Reached max comments (${CONFIG.MAX_COMMENTS_PER_SESSION}). Total comments posted: ${commentCount}`, 'success');
    }
  };

  // ============================================
  // START
  // ============================================
  const run = async () => {
    const username = targetUser;

    if (RESERVED_PATHS.includes(username)) {
      log('Must be on a user\'s profile page! Go to: https://x.com/TARGET_USERNAME', 'error');
      isRunning = false;
      return;
    }

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  💬 XActions Auto Commenter                              ║
║                                                           ║
║  Watching: @${username.padEnd(20)}                        ║
║  Interval: Every ${CONFIG.CHECK_INTERVAL_SECONDS} seconds                         ║
║  Max comments: ${CONFIG.MAX_COMMENTS_PER_SESSION}                                    ║
║                                                           ║
║  Keep this tab open!                                      ║
║  Run stopAutoComment() to stop.                           ║
╚═══════════════════════════════════════════════════════════╝
    `);

    log('Starting auto-commenter...', 'info');
    log(`Comments pool: ${CONFIG.COMMENTS.join(', ')}`, 'info');
    log(`Post age window: ${CONFIG.MIN_POST_AGE_SECONDS}s - ${CONFIG.MAX_POST_AGE_MINUTES}min`, 'info');
    log(`Previously commented on ${commentedTweets.size} tweets`, 'info');

    await check();
  };

  run();

  // Stop function
  window.stopAutoComment = () => {
    isRunning = false;
    log('Stopping auto-commenter...', 'warning');
  };
})();

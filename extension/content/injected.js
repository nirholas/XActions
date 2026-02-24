// XActions Extension — Injected Page Script
// Runs in the actual x.com page context (not content script sandbox)
// Has full access to the page DOM, same as pasting in console
// by nichxbt

(() => {
  if (window.__xactions_injected) return;
  window.__xactions_injected = true;

  // ============================================
  // CORE MODULE (from src/automation/core.js)
  // ============================================
  window.XActions = window.XActions || {};

  window.XActions.Core = (() => {
    const CONFIG = {
      DELAY_SHORT: 500,
      DELAY_MEDIUM: 1500,
      DELAY_LONG: 3000,
      DELAY_BETWEEN_ACTIONS: 2000,
      MAX_ACTIONS_PER_HOUR: 50,
      MAX_FOLLOWS_PER_DAY: 100,
      MAX_LIKES_PER_DAY: 200,
      STORAGE_PREFIX: 'xactions_',
      DEBUG: true,
    };

    const SELECTORS = {
      followButton: '[data-testid$="-follow"]',
      unfollowButton: '[data-testid$="-unfollow"]',
      likeButton: '[data-testid="like"]',
      unlikeButton: '[data-testid="unlike"]',
      retweetButton: '[data-testid="retweet"]',
      replyButton: '[data-testid="reply"]',
      confirmButton: '[data-testid="confirmationSheetConfirm"]',
      tweet: '[data-testid="tweet"]',
      tweetText: '[data-testid="tweetText"]',
      tweetLink: 'a[href*="/status/"]',
      userCell: '[data-testid="UserCell"]',
      userAvatar: '[data-testid="UserAvatar-Container"]',
      userName: '[data-testid="User-Name"]',
      userFollowIndicator: '[data-testid="userFollowIndicator"]',
      tweetInput: '[data-testid="tweetTextarea_0"]',
      searchInput: '[data-testid="SearchBox_Search_Input"]',
      primaryColumn: '[data-testid="primaryColumn"]',
      timeline: 'section[role="region"]',
    };

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const randomDelay = (min, max) => {
      const delay = Math.floor(Math.random() * (max - min + 1)) + min;
      return sleep(delay);
    };

    const log = (message, type = 'info') => {
      const timestamp = new Date().toLocaleTimeString();
      const prefix = { info: '📘', success: '✅', warning: '⚠️', error: '❌', action: '🔧' }[type] || '📘';
      if (CONFIG.DEBUG || type === 'error') {
        console.log(`${prefix} [${timestamp}] ${message}`);
      }
      // Emit to extension
      notify('ACTION_PERFORMED', { action: `[${type}] ${message}` });
    };

    const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    const scrollBy = (pixels) => window.scrollBy({ top: pixels, behavior: 'smooth' });

    const storage = {
      get: (key) => { try { const d = localStorage.getItem(CONFIG.STORAGE_PREFIX + key); return d ? JSON.parse(d) : null; } catch { return null; } },
      set: (key, value) => { try { localStorage.setItem(CONFIG.STORAGE_PREFIX + key, JSON.stringify(value)); return true; } catch { return false; } },
      remove: (key) => localStorage.removeItem(CONFIG.STORAGE_PREFIX + key),
    };

    const waitForElement = async (selector, timeout = 10000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const el = document.querySelector(selector);
        if (el) return el;
        await sleep(100);
      }
      return null;
    };

    const waitForElements = async (selector, minCount = 1, timeout = 10000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const els = document.querySelectorAll(selector);
        if (els.length >= minCount) return Array.from(els);
        await sleep(100);
      }
      return [];
    };

    const clickElement = async (element) => {
      if (!element) return false;
      try {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(300);
        element.click();
        return true;
      } catch { return false; }
    };

    const typeText = async (element, text, delay = 50) => {
      if (!element) return false;
      try {
        element.focus();
        for (const char of text) {
          element.textContent += char;
          element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: char }));
          await sleep(delay);
        }
        return true;
      } catch { return false; }
    };

    const extractUsername = (element) => {
      const link = element.querySelector('a[href^="/"]');
      if (link) {
        const match = link.getAttribute('href').match(/^\/([^/]+)$/);
        if (match) return match[1].toLowerCase();
      }
      return null;
    };

    const extractTweetInfo = (tweetElement) => {
      try {
        const text = tweetElement.querySelector(SELECTORS.tweetText)?.textContent || '';
        const tweetLink = tweetElement.querySelector(SELECTORS.tweetLink)?.href || '';
        const userName = tweetElement.querySelector(SELECTORS.userName)?.textContent || '';
        return { text, tweetLink, userName };
      } catch { return null; }
    };

    const rateLimit = {
      check: (action, limit, period = 'hour') => {
        const key = `ratelimit_${action}_${period}`;
        const data = storage.get(key) || { count: 0, timestamp: Date.now() };
        const periodMs = period === 'hour' ? 3600000 : 86400000;
        if (Date.now() - data.timestamp > periodMs) { data.count = 0; data.timestamp = Date.now(); }
        return data.count < limit;
      },
      increment: (action, period = 'hour') => {
        const key = `ratelimit_${action}_${period}`;
        const data = storage.get(key) || { count: 0, timestamp: Date.now() };
        data.count++;
        storage.set(key, data);
      },
      getRemaining: (action, limit, period = 'hour') => {
        const key = `ratelimit_${action}_${period}`;
        const data = storage.get(key) || { count: 0, timestamp: Date.now() };
        return Math.max(0, limit - data.count);
      },
    };

    // Notify extension bridge
    function notify(type, data) {
      window.postMessage({ source: 'xactions-page', type, ...data }, '*');
    }

    return {
      CONFIG, SELECTORS, sleep, randomDelay, log,
      scrollToBottom, scrollToTop, scrollBy, storage,
      waitForElement, waitForElements, clickElement, typeText,
      extractUsername, extractTweetInfo, rateLimit, notify,
    };
  })();

  // ============================================
  // AUTOMATION REGISTRY
  // ============================================
  const automationRunners = {};
  const automationStopFlags = {};

  function registerAutomation(id, runFn) {
    automationRunners[id] = runFn;
  }

  // ============================================
  // AUTO-LIKER
  // ============================================
  registerAutomation('autoLiker', async (settings) => {
    const { log, sleep, randomDelay, scrollBy, clickElement, SELECTORS, storage, rateLimit } = window.XActions.Core;
    const opts = {
      LIKE_ALL: false,
      KEYWORDS: settings.keywords || [],
      MAX_LIKES: settings.maxActions || 20,
      MAX_SCROLL_DEPTH: 50,
      MIN_DELAY: settings.minDelay || 2000,
      MAX_DELAY: settings.maxDelay || 5000,
      SKIP_REPLIES: true,
      SKIP_ADS: true,
    };

    let likeCount = 0;
    let scrollCount = 0;
    const likedTweets = new Set(storage.get('liked_tweets') || []);

    const matchesKeywords = (text) => {
      if (opts.KEYWORDS.length === 0) return true;
      const lower = text.toLowerCase();
      return opts.KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
    };

    log(`🤍 Auto-Liker started (max: ${opts.MAX_LIKES}, keywords: ${opts.KEYWORDS.length ? opts.KEYWORDS.join(', ') : 'any'})`, 'info');

    while (likeCount < opts.MAX_LIKES && scrollCount < opts.MAX_SCROLL_DEPTH && !automationStopFlags['autoLiker']) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);

      for (const tweet of tweets) {
        if (automationStopFlags['autoLiker']) break;
        if (likeCount >= opts.MAX_LIKES) break;
        if (!rateLimit.check('like', 200, 'day')) { log('⚠️ Daily like limit reached', 'warning'); return; }

        const tweetLink = tweet.querySelector(SELECTORS.tweetLink)?.href || '';
        const tweetId = tweetLink.match(/status\/(\d+)/)?.[1];
        if (!tweetId || likedTweets.has(tweetId)) continue;

        const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
        if (!matchesKeywords(text)) continue;

        // Skip ads
        if (opts.SKIP_ADS && (tweet.querySelector('[data-testid="placementTracking"]') || tweet.textContent?.includes('Promoted'))) continue;

        const likeBtn = tweet.querySelector(SELECTORS.likeButton);
        if (!likeBtn) continue;

        await clickElement(likeBtn);
        likeCount++;
        likedTweets.add(tweetId);
        rateLimit.increment('like', 'day');

        window.postMessage({ source: 'xactions-page', type: 'ACTION_PERFORMED', automationId: 'autoLiker', action: `❤️ Liked tweet ${tweetId} (${likeCount}/${opts.MAX_LIKES})` }, '*');
        log(`❤️ Liked: "${text.substring(0, 50)}..." (${likeCount}/${opts.MAX_LIKES})`, 'success');

        await randomDelay(opts.MIN_DELAY, opts.MAX_DELAY);
      }

      scrollBy(800);
      scrollCount++;
      await sleep(1500);
    }

    storage.set('liked_tweets', Array.from(likedTweets));
    log(`✅ Auto-Liker done! Liked ${likeCount} tweets.`, 'success');
    window.postMessage({ source: 'xactions-page', type: 'AUTOMATION_COMPLETE', automationId: 'autoLiker', summary: `${likeCount} tweets liked` }, '*');
  });

  // ============================================
  // SMART UNFOLLOW
  // ============================================
  registerAutomation('smartUnfollow', async (settings) => {
    const { log, sleep, randomDelay, scrollBy, clickElement, waitForElement, storage, SELECTORS } = window.XActions.Core;
    const opts = {
      DAYS_TO_WAIT: settings.daysToWait || 3,
      MAX_UNFOLLOWS: settings.maxActions || 50,
      WHITELIST: settings.whitelist || [],
      DRY_RUN: settings.dryRun || false,
      DELAY_BETWEEN_UNFOLLOWS: settings.minDelay || 2000,
    };

    let unfollowCount = 0;

    log(`🔄 Smart Unfollow started (max: ${opts.MAX_UNFOLLOWS}, wait: ${opts.DAYS_TO_WAIT}d${opts.DRY_RUN ? ', DRY RUN' : ''})`, 'info');

    // Must be on following page
    const currentPath = window.location.pathname;
    if (!currentPath.endsWith('/following')) {
      log('⚠️ Navigate to your following page first (x.com/YOUR_USERNAME/following)', 'warning');
      window.postMessage({ source: 'xactions-page', type: 'AUTOMATION_ERROR', automationId: 'smartUnfollow', error: 'Navigate to your following page first' }, '*');
      return;
    }

    while (unfollowCount < opts.MAX_UNFOLLOWS && !automationStopFlags['smartUnfollow']) {
      const cells = document.querySelectorAll(SELECTORS.userCell);
      if (cells.length === 0) {
        await sleep(2000);
        scrollBy(600);
        continue;
      }

      for (const cell of cells) {
        if (automationStopFlags['smartUnfollow']) break;
        if (unfollowCount >= opts.MAX_UNFOLLOWS) break;

        const userLink = cell.querySelector('a[href^="/"]');
        const username = userLink?.getAttribute('href')?.replace('/', '') || '';
        if (!username) continue;

        // Check whitelist
        if (opts.WHITELIST.some(w => w.toLowerCase() === username.toLowerCase())) continue;

        // Check if they follow back
        const followsYou = cell.querySelector(SELECTORS.userFollowIndicator);
        if (followsYou) continue; // They follow back, skip

        const unfollowBtn = cell.querySelector(SELECTORS.unfollowButton);
        if (!unfollowBtn) continue;

        if (opts.DRY_RUN) {
          log(`[DRY RUN] Would unfollow @${username}`, 'info');
        } else {
          await clickElement(unfollowBtn);
          await sleep(500);
          const confirmBtn = await waitForElement(SELECTORS.confirmButton, 3000);
          if (confirmBtn) await clickElement(confirmBtn);
        }

        unfollowCount++;
        window.postMessage({ source: 'xactions-page', type: 'ACTION_PERFORMED', automationId: 'smartUnfollow', action: `👋 Unfollowed @${username} (${unfollowCount}/${opts.MAX_UNFOLLOWS})` }, '*');
        log(`👋 Unfollowed @${username} (${unfollowCount}/${opts.MAX_UNFOLLOWS})`, 'success');

        await randomDelay(opts.DELAY_BETWEEN_UNFOLLOWS, opts.DELAY_BETWEEN_UNFOLLOWS * 1.5);
      }

      scrollBy(600);
      await sleep(1500);
    }

    log(`✅ Smart Unfollow done! Unfollowed ${unfollowCount} users.`, 'success');
    window.postMessage({ source: 'xactions-page', type: 'AUTOMATION_COMPLETE', automationId: 'smartUnfollow', summary: `${unfollowCount} users unfollowed` }, '*');
  });

  // ============================================
  // KEYWORD FOLLOW
  // ============================================
  registerAutomation('keywordFollow', async (settings) => {
    const { log, sleep, randomDelay, scrollBy, clickElement, waitForElement, storage, rateLimit, SELECTORS } = window.XActions.Core;
    const opts = {
      KEYWORDS: settings.keywords || ['web3', 'crypto'],
      MAX_FOLLOWS_PER_KEYWORD: settings.maxPerKeyword || 10,
      MAX_FOLLOWS_TOTAL: settings.maxActions || 30,
      MIN_FOLLOWERS: settings.minFollowers || 100,
      MAX_FOLLOWERS: settings.maxFollowers || 100000,
      MUST_HAVE_BIO: settings.mustHaveBio || false,
      DELAY_BETWEEN_FOLLOWS: settings.minDelay || 3000,
    };

    let followCount = 0;
    const followedUsers = new Map(Object.entries(storage.get('followed_users') || {}));

    const saveFollowedUser = (username) => {
      followedUsers.set(username.toLowerCase(), { followedAt: Date.now(), followedBack: false });
      storage.set('followed_users', Object.fromEntries(followedUsers));
    };

    log(`🔍 Keyword Follow started (keywords: ${opts.KEYWORDS.join(', ')}, max: ${opts.MAX_FOLLOWS_TOTAL})`, 'info');

    for (const keyword of opts.KEYWORDS) {
      if (followCount >= opts.MAX_FOLLOWS_TOTAL || automationStopFlags['keywordFollow']) break;

      const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=user`;
      window.location.href = searchUrl;
      await sleep(3000);
      await waitForElement(SELECTORS.userCell, 10000);
      await sleep(1000);

      let keywordFollows = 0;
      let scrollAttempts = 0;

      while (keywordFollows < opts.MAX_FOLLOWS_PER_KEYWORD && followCount < opts.MAX_FOLLOWS_TOTAL && scrollAttempts < 20 && !automationStopFlags['keywordFollow']) {
        const cells = document.querySelectorAll(SELECTORS.userCell);

        for (const cell of cells) {
          if (automationStopFlags['keywordFollow']) break;
          if (keywordFollows >= opts.MAX_FOLLOWS_PER_KEYWORD || followCount >= opts.MAX_FOLLOWS_TOTAL) break;
          if (!rateLimit.check('follow', 100, 'day')) { log('⚠️ Daily follow limit reached', 'warning'); return; }

          const userLink = cell.querySelector('a[href^="/"]');
          const username = userLink?.getAttribute('href')?.replace('/', '') || '';
          if (!username || followedUsers.has(username.toLowerCase())) continue;

          // Check for follow button (not already following)
          const followBtn = cell.querySelector(SELECTORS.followButton);
          if (!followBtn) continue;

          await clickElement(followBtn);
          followCount++;
          keywordFollows++;
          rateLimit.increment('follow', 'day');
          saveFollowedUser(username);

          window.postMessage({ source: 'xactions-page', type: 'ACTION_PERFORMED', automationId: 'keywordFollow', action: `➕ Followed @${username} for "${keyword}" (${followCount}/${opts.MAX_FOLLOWS_TOTAL})` }, '*');
          log(`➕ Followed @${username} (${followCount}/${opts.MAX_FOLLOWS_TOTAL})`, 'success');

          await randomDelay(opts.DELAY_BETWEEN_FOLLOWS, opts.DELAY_BETWEEN_FOLLOWS * 1.5);
        }

        scrollBy(600);
        scrollAttempts++;
        await sleep(1500);
      }
    }

    log(`✅ Keyword Follow done! Followed ${followCount} users.`, 'success');
    window.postMessage({ source: 'xactions-page', type: 'AUTOMATION_COMPLETE', automationId: 'keywordFollow', summary: `${followCount} users followed` }, '*');
  });

  // ============================================
  // FOLLOW ENGAGERS
  // ============================================
  registerAutomation('followEngagers', async (settings) => {
    const { log, sleep, randomDelay, scrollBy, clickElement, waitForElement, storage, rateLimit, SELECTORS } = window.XActions.Core;
    const opts = {
      MODE: settings.mode || 'likers',
      MAX_FOLLOWS: settings.maxActions || 30,
      MIN_FOLLOWERS: settings.minFollowers || 50,
      DELAY_BETWEEN_FOLLOWS: settings.minDelay || 3000,
    };

    let followCount = 0;

    log(`👥 Follow Engagers started (mode: ${opts.MODE}, max: ${opts.MAX_FOLLOWS})`, 'info');

    // Must be on a tweet page
    if (!window.location.pathname.includes('/status/')) {
      log('⚠️ Navigate to a specific tweet first', 'warning');
      window.postMessage({ source: 'xactions-page', type: 'AUTOMATION_ERROR', automationId: 'followEngagers', error: 'Navigate to a specific tweet first' }, '*');
      return;
    }

    // Click on likes to open likers panel
    const likesLink = document.querySelector('a[href$="/likes"]');
    if (likesLink) {
      await clickElement(likesLink);
      await sleep(2000);
    }

    let scrollAttempts = 0;
    while (followCount < opts.MAX_FOLLOWS && scrollAttempts < 30 && !automationStopFlags['followEngagers']) {
      const cells = document.querySelectorAll(SELECTORS.userCell);

      for (const cell of cells) {
        if (automationStopFlags['followEngagers']) break;
        if (followCount >= opts.MAX_FOLLOWS) break;
        if (!rateLimit.check('follow', 100, 'day')) { log('⚠️ Daily follow limit reached', 'warning'); return; }

        const followBtn = cell.querySelector(SELECTORS.followButton);
        if (!followBtn) continue;

        const userLink = cell.querySelector('a[href^="/"]');
        const username = userLink?.getAttribute('href')?.replace('/', '') || 'unknown';

        await clickElement(followBtn);
        followCount++;
        rateLimit.increment('follow', 'day');

        window.postMessage({ source: 'xactions-page', type: 'ACTION_PERFORMED', automationId: 'followEngagers', action: `➕ Followed @${username} (${followCount}/${opts.MAX_FOLLOWS})` }, '*');
        log(`➕ Followed engager @${username} (${followCount}/${opts.MAX_FOLLOWS})`, 'success');

        await randomDelay(opts.DELAY_BETWEEN_FOLLOWS, opts.DELAY_BETWEEN_FOLLOWS * 1.5);
      }

      scrollBy(600);
      scrollAttempts++;
      await sleep(1500);
    }

    log(`✅ Follow Engagers done! Followed ${followCount} users.`, 'success');
    window.postMessage({ source: 'xactions-page', type: 'AUTOMATION_COMPLETE', automationId: 'followEngagers', summary: `${followCount} engagers followed` }, '*');
  });

  // ============================================
  // AUTO-COMMENTER
  // ============================================
  registerAutomation('autoCommenter', async (settings) => {
    const { log, sleep, randomDelay, scrollToTop, clickElement, waitForElement, storage, SELECTORS } = window.XActions.Core;
    const opts = {
      COMMENTS: settings.comments || ['🔥', 'Great point!', 'Interesting take!', 'Love this!', '💯'],
      CHECK_INTERVAL_SECONDS: settings.checkInterval || 60,
      MAX_COMMENTS: settings.maxActions || 5,
      ONLY_ORIGINAL_TWEETS: true,
      KEYWORDS: settings.keywords || [],
    };

    let commentCount = 0;
    let checkCount = 0;
    const commentedTweets = new Set(storage.get('commented_tweets') || []);

    const getRandomComment = () => opts.COMMENTS[Math.floor(Math.random() * opts.COMMENTS.length)];

    log(`💬 Auto-Commenter started (max: ${opts.MAX_COMMENTS}, interval: ${opts.CHECK_INTERVAL_SECONDS}s)`, 'info');

    while (commentCount < opts.MAX_COMMENTS && !automationStopFlags['autoCommenter']) {
      checkCount++;
      scrollToTop();
      await sleep(2000);

      const tweets = document.querySelectorAll(SELECTORS.tweet);

      for (const tweet of tweets) {
        if (automationStopFlags['autoCommenter']) break;
        if (commentCount >= opts.MAX_COMMENTS) break;

        const tweetLink = tweet.querySelector(SELECTORS.tweetLink)?.href || '';
        const tweetId = tweetLink.match(/status\/(\d+)/)?.[1];
        if (!tweetId || commentedTweets.has(tweetId)) continue;

        const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
        if (opts.KEYWORDS.length > 0 && !opts.KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()))) continue;

        // Click reply button
        const replyBtn = tweet.querySelector(SELECTORS.replyButton);
        if (!replyBtn) continue;

        await clickElement(replyBtn);
        await sleep(1500);

        // Type comment
        const replyBox = await waitForElement(SELECTORS.tweetInput, 5000);
        if (!replyBox) continue;

        const comment = getRandomComment();
        replyBox.focus();
        document.execCommand('insertText', false, comment);
        await sleep(500);

        // Find and click the reply submit button
        const submitBtn = document.querySelector('[data-testid="tweetButtonInline"]') || document.querySelector('[data-testid="tweetButton"]');
        if (submitBtn) {
          await clickElement(submitBtn);
          commentCount++;
          commentedTweets.add(tweetId);
          storage.set('commented_tweets', Array.from(commentedTweets));

          window.postMessage({ source: 'xactions-page', type: 'ACTION_PERFORMED', automationId: 'autoCommenter', action: `💬 Commented "${comment}" on tweet ${tweetId} (${commentCount}/${opts.MAX_COMMENTS})` }, '*');
          log(`💬 Commented on tweet: "${comment}" (${commentCount}/${opts.MAX_COMMENTS})`, 'success');
        }

        await randomDelay(3000, 6000);
      }

      if (commentCount < opts.MAX_COMMENTS && !automationStopFlags['autoCommenter']) {
        log(`⏱️ Check ${checkCount} done. Waiting ${opts.CHECK_INTERVAL_SECONDS}s...`, 'info');
        await sleep(opts.CHECK_INTERVAL_SECONDS * 1000);
      }
    }

    log(`✅ Auto-Commenter done! Posted ${commentCount} comments.`, 'success');
    window.postMessage({ source: 'xactions-page', type: 'AUTOMATION_COMPLETE', automationId: 'autoCommenter', summary: `${commentCount} comments posted` }, '*');
  });

  // ============================================
  // GROWTH SUITE
  // ============================================
  registerAutomation('growthSuite', async (settings) => {
    const { log, sleep, randomDelay, scrollBy, clickElement, waitForElement, storage, rateLimit, SELECTORS } = window.XActions.Core;
    const opts = {
      KEYWORDS: settings.keywords || ['web3', 'crypto', 'AI'],
      enableFollow: settings.enableFollow !== false,
      enableLike: settings.enableLike !== false,
      enableUnfollow: settings.enableUnfollow !== false,
      maxFollows: settings.maxFollows || 20,
      maxLikes: settings.maxLikes || 30,
      maxUnfollows: settings.maxUnfollows || 15,
      UNFOLLOW_AFTER_DAYS: settings.daysToWait || 3,
      SESSION_DURATION_MINUTES: settings.sessionMinutes || 30,
      DELAY: settings.minDelay || 3000,
    };

    const endTime = Date.now() + opts.SESSION_DURATION_MINUTES * 60 * 1000;
    const state = { follows: 0, likes: 0, unfollows: 0 };

    log(`🚀 Growth Suite started! Session: ${opts.SESSION_DURATION_MINUTES}min`, 'info');
    log(`   Follow: ${opts.enableFollow}, Like: ${opts.enableLike}, Unfollow: ${opts.enableUnfollow}`, 'info');

    // Phase 1: Like tweets in feed
    if (opts.enableLike && !automationStopFlags['growthSuite']) {
      log('📌 Phase 1: Liking tweets in feed...', 'action');
      let scrolls = 0;
      while (state.likes < opts.maxLikes && scrolls < 30 && Date.now() < endTime && !automationStopFlags['growthSuite']) {
        const tweets = document.querySelectorAll(SELECTORS.tweet);
        for (const tweet of tweets) {
          if (automationStopFlags['growthSuite'] || state.likes >= opts.maxLikes || Date.now() >= endTime) break;
          const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
          if (opts.KEYWORDS.length > 0 && !opts.KEYWORDS.some(kw => text.toLowerCase().includes(kw.toLowerCase()))) continue;
          const likeBtn = tweet.querySelector(SELECTORS.likeButton);
          if (!likeBtn) continue;
          await clickElement(likeBtn);
          state.likes++;
          window.postMessage({ source: 'xactions-page', type: 'ACTION_PERFORMED', automationId: 'growthSuite', action: `❤️ Liked tweet (${state.likes}/${opts.maxLikes})` }, '*');
          await randomDelay(opts.DELAY, opts.DELAY * 1.5);
        }
        scrollBy(600);
        scrolls++;
        await sleep(1500);
      }
    }

    log(`✅ Growth Suite done! Likes: ${state.likes}, Follows: ${state.follows}, Unfollows: ${state.unfollows}`, 'success');
    window.postMessage({ source: 'xactions-page', type: 'AUTOMATION_COMPLETE', automationId: 'growthSuite', summary: `${state.likes} likes, ${state.follows} follows, ${state.unfollows} unfollows` }, '*');
  });

  // ============================================
  // ACCOUNT INFO SCRAPER
  // ============================================
  function scrapeAccountInfo() {
    try {
      // Try to get account info from the page
      const nameEl = document.querySelector('[data-testid="UserName"]') || document.querySelector('div[dir="ltr"] > span');
      const avatarEl = document.querySelector('[data-testid="UserAvatar-Container"] img') || document.querySelector('img[alt][src*="profile_images"]');

      // Try nav sidebar for logged-in user
      const sidebarAvatar = document.querySelector('div[data-testid="SideNav_AccountSwitcher_Button"] img');
      const sidebarName = document.querySelector('div[data-testid="SideNav_AccountSwitcher_Button"]');

      return {
        name: nameEl?.textContent || sidebarName?.querySelector('span')?.textContent || 'Unknown',
        avatar: avatarEl?.src || sidebarAvatar?.src || '',
        handle: window.location.pathname.split('/')[1] || '',
        url: window.location.href,
      };
    } catch {
      return { name: 'Unknown', avatar: '', handle: '', url: window.location.href };
    }
  }

  // ============================================
  // MESSAGE LISTENER (from content script bridge)
  // ============================================
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== 'xactions-extension') return;

    const msg = event.data;

    switch (msg.type) {
      case 'RUN_AUTOMATION': {
        const runner = automationRunners[msg.automationId];
        if (runner) {
          automationStopFlags[msg.automationId] = false;
          try {
            await runner(msg.settings || {});
          } catch (err) {
            console.error(`XActions automation error (${msg.automationId}):`, err);
            window.postMessage({ source: 'xactions-page', type: 'AUTOMATION_ERROR', automationId: msg.automationId, error: err.message }, '*');
          }
        }
        break;
      }

      case 'STOP_AUTOMATION':
        automationStopFlags[msg.automationId] = true;
        break;

      case 'STOP_ALL':
      case 'PAUSE_ALL':
        Object.keys(automationStopFlags).forEach(k => automationStopFlags[k] = true);
        Object.keys(automationRunners).forEach(k => automationStopFlags[k] = true);
        break;

      case 'RESUME_ALL':
        // Resuming would need re-running, handled by popup
        break;

      case 'GET_ACCOUNT_INFO':
        window.postMessage({ source: 'xactions-page', type: 'ACCOUNT_INFO', data: scrapeAccountInfo() }, '*');
        break;
    }
  });

  console.log('✅ XActions automation engine injected');
})();

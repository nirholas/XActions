// GENERATED FILE: a copy of browser/algorithmBuilder.js, written by scripts/build-script-manifest.mjs. Edit browser/algorithmBuilder.js instead, then run: npm run browser:build
// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * @name        algorithmBuilder.js
 * @title       Algorithm Builder
 * @description Train the X algorithm around your niche with human-paced search, like, reply, repost and follow cycles, with a dry run and daily caps.
 * @category    grow
 * @page        x.com/home
 * @writes      true
 * @aliases     scripts/algorithmBuilder.js, src/automation/algorithmBuilder.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-27
 */
// XActions Automation — Algorithm Builder
// https://github.com/nirholas/XActions
//
// Runs on its own. If src/automation/core.js was pasted first, its helpers,
// selectors, storage and rate limiter are used; otherwise built-in
// equivalents with the same storage keys are used.
//
// 24/7 automation that builds up your X algorithm around specific topics/niches.
// Mimics natural human behavior: search → scroll → like → comment → follow → browse.
// Includes LLM-powered comment generation via OpenRouter or any compatible endpoint.
//
// HOW TO USE:
// 1. Go to x.com/home (logged in on a fresh or existing account)
// 2. Edit CONFIG.NICHE_CONFIG with your topics, keywords, target accounts
// 3. (Optional) Set CONFIG.LLM_CONFIG.API_KEY for AI-generated comments
// 4. CONFIG.dryRun is true by default: it logs what it would do and clicks
//    nothing. Set it to false to engage for real.
// 5. Paste browser/algorithmBuilder.js and press Enter
// 6. The script runs continuously — stop with window.stopAlgoBuilder()
//    (set CONFIG.singleSession = true to stop after one work session)
//
// ⚠️  Use responsibly. This interacts with real accounts.
//     Spammy behavior will get your account limited or suspended.
//
// by nichxbt

(() => {
  window.XActions = window.XActions || {};

  // ─── Helpers: core.js when present, built-in equivalents otherwise ───
  const Core = window.XActions.Core || {};
  const sleep = Core.sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const randomDelay = Core.randomDelay || ((min, max) => sleep(Math.floor(Math.random() * (max - min + 1)) + min));
  const log = Core.log || ((message, type = 'info') => {
    const prefix = { info: '📘', success: '✅', warning: '⚠️', error: '❌', action: '🔧' }[type] || '📘';
    console.log(`${prefix} [${new Date().toLocaleTimeString()}] ${message}`);
  });
  const scrollBy = Core.scrollBy || ((pixels) => window.scrollBy({ top: pixels, behavior: 'smooth' }));
  const scrollToTop = Core.scrollToTop || (() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const waitForElement = Core.waitForElement || (async (selector, timeout = 10000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await sleep(100);
    }
    return null;
  });
  const clickElement = Core.clickElement || (async (element) => {
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
  const SELECTORS = Core.SELECTORS || {
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    retweetButton: '[data-testid="retweet"]',
    replyButton: '[data-testid="reply"]',
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    tweetLink: 'a[href*="/status/"]',
    userCell: '[data-testid="UserCell"]',
    userName: '[data-testid="User-Name"]',
    userFollowIndicator: '[data-testid="userFollowIndicator"]',
    userDescription: '[data-testid="UserDescription"]',
    primaryColumn: '[data-testid="primaryColumn"]',
  };
  // Same localStorage prefix as core.js, so state and daily counts are shared.
  const storage = Core.storage || {
    get: (key) => {
      try {
        const data = localStorage.getItem('xactions_' + key);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        log(`Storage get error: ${e.message}`, 'error');
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem('xactions_' + key, JSON.stringify(value));
        return true;
      } catch (e) {
        log(`Storage set error: ${e.message}`, 'error');
        return false;
      }
    },
    remove: (key) => {
      try {
        localStorage.removeItem('xactions_' + key);
      } catch (e) {
        log(`Storage remove error: ${e.message}`, 'error');
      }
    },
  };
  const rateLimit = Core.rateLimit || {
    check: (action, limit, period = 'hour') => {
      const data = storage.get(`ratelimit_${action}_${period}`) || { count: 0, timestamp: Date.now() };
      const periodMs = period === 'hour' ? 3600000 : 86400000;
      if (Date.now() - data.timestamp > periodMs) {
        data.count = 0;
        data.timestamp = Date.now();
      }
      return data.count < limit;
    },
    increment: (action, period = 'hour') => {
      const key = `ratelimit_${action}_${period}`;
      const data = storage.get(key) || { count: 0, timestamp: Date.now() };
      data.count++;
      storage.set(key, data);
    },
  };
  const parseCount = (str) => {
    if (!str) return 0;
    const clean = str.replace(/,/g, '');
    const num = parseFloat(clean);
    if (clean.toUpperCase().includes('K')) return num * 1000;
    if (clean.toUpperCase().includes('M')) return num * 1000000;
    if (clean.toUpperCase().includes('B')) return num * 1000000000;
    return num;
  };
  const extractTweetInfo = Core.extractTweetInfo || ((tweetElement) => {
    try {
      const text = tweetElement.querySelector(SELECTORS.tweetText)?.textContent || '';
      const tweetLink = tweetElement.querySelector(SELECTORS.tweetLink)?.href || '';
      const userName = tweetElement.querySelector(SELECTORS.userName)?.textContent || '';
      return { text, tweetLink, userName };
    } catch {
      return null;
    }
  });
  const extractUserFromCell = Core.extractUserFromCell || ((cell) => {
    if (!cell) return null;
    try {
      const href = cell.querySelector('a[href^="/"]')?.getAttribute('href') || '';
      const username = (href.match(/^\/([^/]+)$/) || [, ''])[1].toLowerCase();
      const bio = cell.querySelector(SELECTORS.userDescription)?.textContent.trim() ||
        [...cell.querySelectorAll('[dir="auto"]:not([data-testid])')]
          .map((el) => el.textContent.trim())
          .find((t) => t && !t.startsWith('@') && t.length >= 10) || '';
      const followerMatch = (cell.textContent || '').match(/(\d[\d,]*\.?\d*[KMB]?)\s*Follower/i);
      return {
        username,
        bio,
        followers: followerMatch ? parseCount(followerMatch[1]) : 0,
        isFollowing: !!cell.querySelector(SELECTORS.unfollowButton),
        followsYou: !!cell.querySelector(SELECTORS.userFollowIndicator),
        isVerified: !!cell.querySelector('[data-testid="icon-verified"]') || !!cell.querySelector('svg[aria-label*="Verified"]'),
        isProtected: !!cell.querySelector('[data-testid="icon-lock"]'),
      };
    } catch (e) {
      log(`extractUserFromCell error: ${e.message}`, 'error');
      return null;
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  // CONFIG: the run options, plus the niche, LLM and behaviour sections
  // ════════════════════════════════════════════════════════════════════════

  const CONFIG = {
    // true = preview: log what would be liked, replied to, reposted and
    // followed, click nothing, and leave the daily counters untouched.
    dryRun: true,

    // Stop after one work session instead of taking a break and continuing
    // 24/7. Also stops once every per-session and daily cap is reached.
    singleSession: false,

    // Download a JSON log of this run's actions when the builder stops.
    exportOnStop: false,

    // ════════════════════════════════════════════════════════════════════════
    // NICHE CONFIGURATION — Edit these to match your niche / topics
    // ════════════════════════════════════════════════════════════════════════

    NICHE_CONFIG: {
      // Your niche identity (used for LLM persona)
      PERSONA: 'a crypto & web3 builder who shares alpha and builds in public',

      // Search keywords — the builder cycles through these
      KEYWORDS: [
        'web3 builder',
        'crypto alpha',
        'DeFi yield',
        'solana ecosystem',
        'onchain analytics',
      ],

      // Target accounts to engage with (their posts & engagers)
      TARGET_ACCOUNTS: [
        // '@nichxbt',
        // '@VitalikButerin',
      ],

      // Bio keywords — only follow users whose bio contains at least one
      // Leave empty to follow anyone relevant
      BIO_KEYWORDS: ['crypto', 'web3', 'defi', 'nft', 'blockchain', 'builder', 'dev', 'founder'],

      // Topics to engage with on Explore page
      EXPLORE_TOPICS: ['Technology', 'Crypto', 'Business'],
    },

    // ════════════════════════════════════════════════════════════════════════
    // LLM CONFIGURATION — For AI-generated comments
    // ════════════════════════════════════════════════════════════════════════

    LLM_CONFIG: {
      // Set to true to enable LLM comments (requires API_KEY)
      ENABLED: false,

      // OpenRouter (default) or any OpenAI-compatible endpoint
      API_URL: 'https://openrouter.ai/api/v1/chat/completions',
      API_KEY: '', // Set your OpenRouter or OpenAI API key here

      // Model to use (OpenRouter format)
      // Free model router. Individual :free ids get retired; this alias does not.
      MODEL: 'openrouter/free',

      // System prompt — shapes how comments sound
      SYSTEM_PROMPT: `You are a witty, knowledgeable person in the {niche} space on Twitter/X.
Generate a short, authentic reply to the tweet below.
Rules:
- 1-2 sentences max, casual Twitter tone
- No hashtags, no emojis unless very natural
- Be specific to the tweet's content, not generic
- Sound like a real person, not a bot or marketer
- Occasionally ask a genuine question
- Never start with "Great post!" or similar generic openers
- Match the energy of the original tweet (serious → thoughtful, funny → witty)`,

      // Max tokens for the response
      MAX_TOKENS: 80,

      // Temperature (higher = more creative, lower = more focused)
      TEMPERATURE: 0.9,

      // Probability of using LLM vs fallback (0-1). If LLM fails, fallback is always used.
      LLM_PROBABILITY: 0.7,
    },

    // ════════════════════════════════════════════════════════════════════════
    // BEHAVIOR CONFIGURATION — Mimics natural human patterns
    // ════════════════════════════════════════════════════════════════════════

    BEHAVIOR: {
      // ─── Session timing ───
      // Work session length (minutes)
      SESSION_MIN_MINUTES: 20,
      SESSION_MAX_MINUTES: 45,

      // Break between sessions (minutes)
      BREAK_MIN_MINUTES: 5,
      BREAK_MAX_MINUTES: 20,

      // ─── Peak hours (UTC) — more active during these hours ───
      PEAK_HOURS_START: 13,  // 1 PM UTC (≈ 8 AM EST)
      PEAK_HOURS_END: 23,    // 11 PM UTC (≈ 6 PM EST)

      // ─── Action probabilities per tweet encountered (0-1) ───
      LIKE_PROBABILITY: 0.35,
      COMMENT_PROBABILITY: 0.08,
      RETWEET_PROBABILITY: 0.05,
      FOLLOW_PROBABILITY: 0.15,   // follow the tweet author

      // ─── During off-peak, multiply probabilities by this ───
      OFF_PEAK_MULTIPLIER: 0.4,

      // ─── Delays (milliseconds) ───
      MIN_ACTION_DELAY: 2500,
      MAX_ACTION_DELAY: 6000,
      SCROLL_DELAY_MIN: 2000,
      SCROLL_DELAY_MAX: 4000,
      PAGE_LOAD_WAIT: 3000,
      TYPING_DELAY: 60,           // per character
      PRE_ACTION_PAUSE_MIN: 500,  // pause before acting (simulates reading)
      PRE_ACTION_PAUSE_MAX: 3000,

      // ─── Per-session limits ───
      MAX_LIKES_PER_SESSION: 25,
      MAX_COMMENTS_PER_SESSION: 5,
      MAX_FOLLOWS_PER_SESSION: 10,
      MAX_RETWEETS_PER_SESSION: 5,

      // ─── Per-day hard limits ───
      MAX_LIKES_PER_DAY: 150,
      MAX_COMMENTS_PER_DAY: 25,
      MAX_FOLLOWS_PER_DAY: 80,
      MAX_RETWEETS_PER_DAY: 30,

      // ─── Scroll behavior ───
      SCROLL_PIXELS_MIN: 300,
      SCROLL_PIXELS_MAX: 800,
      MAX_SCROLLS_PER_FEED: 15,

      // ─── Engagement filters ───
      MIN_TWEET_LIKES: 2,          // only engage with tweets that have at least N likes
      MAX_FOLLOWERS_TO_FOLLOW: 50000,  // don't follow huge accounts (they won't follow back)
      MIN_FOLLOWERS_TO_FOLLOW: 10,     // skip brand new accounts
      SKIP_PROTECTED_ACCOUNTS: true,
      SKIP_VERIFIED_FOR_FOLLOW: false,
    },
  };
  const { NICHE_CONFIG, LLM_CONFIG, BEHAVIOR } = CONFIG;

  // ════════════════════════════════════════════════════════════════════════
  // FALLBACK COMMENTS — Used when LLM is disabled or fails
  // ════════════════════════════════════════════════════════════════════════

  const FALLBACK_COMMENTS = [
    'This is a really solid take',
    'Needed to hear this today',
    'Been thinking about this a lot lately',
    'The data backs this up too',
    'Underrated perspective',
    'More people need to see this',
    'This is exactly what I\'ve been saying',
    'Hard agree on this one',
    'Interesting — what made you think of this?',
    'Curious to see how this plays out',
    'This tracks with what I\'ve been researching',
    'Solid thread, bookmarking this',
    'Real ones know',
    'This is the kind of content I\'m here for',
    'Facts. The market hasn\'t priced this in yet',
    'W take',
    'Saving this for later',
    'This is a masterclass honestly',
    'Respect for putting this out there',
    'Based',
  ];

  // ════════════════════════════════════════════════════════════════════════
  // STATE — Persisted across page refreshes via localStorage
  // ════════════════════════════════════════════════════════════════════════

  const STATE_KEY = 'algo_builder';

  const defaultState = () => ({
    isRunning: true,
    totalSessions: 0,
    totalLikes: 0,
    totalComments: 0,
    totalFollows: 0,
    totalRetweets: 0,
    totalSearches: 0,
    keywordIndex: 0,
    targetAccountIndex: 0,
    activityCycleIndex: 0,
    sessionStartedAt: null,
    lastBreakAt: null,
    engagedTweets: [],        // last 500 tweet IDs we interacted with
    followedUsers: [],        // last 500 usernames we followed
    commentedTweets: [],      // last 500 tweet IDs we commented on
    sessionStats: { likes: 0, comments: 0, follows: 0, retweets: 0 },
    startedAt: Date.now(),
    lastActivityAt: Date.now(),
  });

  let state = { ...defaultState(), ...(storage.get(STATE_KEY) || {}) };

  // Always reset session stats and ensure running
  state.sessionStats = { likes: 0, comments: 0, follows: 0, retweets: 0 };
  state.isRunning = true;
  state.sessionStartedAt = Date.now();

  const saveState = () => {
    state.lastActivityAt = Date.now();
    // Keep arrays trimmed
    if (state.engagedTweets.length > 500) state.engagedTweets = state.engagedTweets.slice(-500);
    if (state.followedUsers.length > 500) state.followedUsers = state.followedUsers.slice(-500);
    if (state.commentedTweets.length > 500) state.commentedTweets = state.commentedTweets.slice(-500);
    storage.set(STATE_KEY, state);
  };

  // ════════════════════════════════════════════════════════════════════════
  // UTILITY HELPERS
  // ════════════════════════════════════════════════════════════════════════

  let isRunning = true; // local flag checked in loops

  const isPeakHours = () => {
    const hour = new Date().getUTCHours();
    return hour >= BEHAVIOR.PEAK_HOURS_START && hour < BEHAVIOR.PEAK_HOURS_END;
  };

  const getActionProbability = (base) => {
    return isPeakHours() ? base : base * BEHAVIOR.OFF_PEAK_MULTIPLIER;
  };

  const shouldAct = (probability) => Math.random() < getActionProbability(probability);

  const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  const humanDelay = () => randomDelay(BEHAVIOR.MIN_ACTION_DELAY, BEHAVIOR.MAX_ACTION_DELAY);
  const scrollDelay = () => randomDelay(BEHAVIOR.SCROLL_DELAY_MIN, BEHAVIOR.SCROLL_DELAY_MAX);
  const readingPause = () => randomDelay(BEHAVIOR.PRE_ACTION_PAUSE_MIN, BEHAVIOR.PRE_ACTION_PAUSE_MAX);

  const canLike = () =>
    state.sessionStats.likes < BEHAVIOR.MAX_LIKES_PER_SESSION &&
    rateLimit.check('algo_like', BEHAVIOR.MAX_LIKES_PER_DAY, 'day');

  const canComment = () =>
    state.sessionStats.comments < BEHAVIOR.MAX_COMMENTS_PER_SESSION &&
    rateLimit.check('algo_comment', BEHAVIOR.MAX_COMMENTS_PER_DAY, 'day');

  const canFollow = () =>
    state.sessionStats.follows < BEHAVIOR.MAX_FOLLOWS_PER_SESSION &&
    rateLimit.check('algo_follow', BEHAVIOR.MAX_FOLLOWS_PER_DAY, 'day');

  const canRetweet = () =>
    state.sessionStats.retweets < BEHAVIOR.MAX_RETWEETS_PER_SESSION &&
    rateLimit.check('algo_retweet', BEHAVIOR.MAX_RETWEETS_PER_DAY, 'day');

  // This run's actions, downloaded on stop when CONFIG.exportOnStop is set.
  const runLog = [];

  // A dry run counts toward the session caps, so the preview stops where a
  // live run would, but leaves the persisted totals and daily counters alone.
  const recordAction = (type, detail = {}) => {
    runLog.push({ action: type, ...detail, dryRun: CONFIG.dryRun, timestamp: new Date().toISOString() });
    state.sessionStats[type]++;
    if (CONFIG.dryRun) return;
    state[`total${type.charAt(0).toUpperCase() + type.slice(1)}s`]++;
    rateLimit.increment(`algo_${type}`, 'day');
    saveState();
  };

  const navigateTo = async (url) => {
    window.location.href = url;
    await sleep(BEHAVIOR.PAGE_LOAD_WAIT);
    // Wait for primary column to render
    await waitForElement(SELECTORS.primaryColumn, 8000);
    await sleep(1000);
  };

  const getTweetId = (tweetEl) => {
    const link = tweetEl.querySelector('a[href*="/status/"]');
    return link ? link.href.match(/status\/(\d+)/)?.[1] : null;
  };

  const getTweetLikeCount = (tweetEl) => {
    // Try to read the like count from the like button's aria-label
    const likeBtn = tweetEl.querySelector(SELECTORS.likeButton) ||
                    tweetEl.querySelector(SELECTORS.unlikeButton);
    if (likeBtn) {
      const label = likeBtn.getAttribute('aria-label') || '';
      const match = label.match(/(\d[\d,]*)/);
      if (match) return parseInt(match[1].replace(/,/g, ''), 10);
    }
    return 0;
  };

  const isAlreadyLiked = (tweetEl) => !!tweetEl.querySelector(SELECTORS.unlikeButton);

  const getTweetAuthorUsername = (tweetEl) => {
    const links = tweetEl.querySelectorAll('a[href^="/"]');
    for (const link of links) {
      const href = link.getAttribute('href');
      const match = href?.match(/^\/([A-Za-z0-9_]+)$/);
      if (match && !['home', 'explore', 'search', 'notifications', 'messages', 'i'].includes(match[1])) {
        return match[1].toLowerCase();
      }
    }
    return null;
  };

  // ════════════════════════════════════════════════════════════════════════
  // LLM COMMENT GENERATION
  // ════════════════════════════════════════════════════════════════════════

  const generateLLMComment = async (tweetText) => {
    if (!LLM_CONFIG.ENABLED || !LLM_CONFIG.API_KEY) return null;
    if (Math.random() > LLM_CONFIG.LLM_PROBABILITY) return null;

    try {
      const systemPrompt = LLM_CONFIG.SYSTEM_PROMPT.replace('{niche}', NICHE_CONFIG.PERSONA);

      const response = await fetch(LLM_CONFIG.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LLM_CONFIG.API_KEY}`,
          'HTTP-Referer': 'https://github.com/nirholas/XActions',
          'X-Title': 'XActions Algorithm Builder',
        },
        body: JSON.stringify({
          model: LLM_CONFIG.MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Reply to this tweet:\n\n"${tweetText.substring(0, 500)}"` },
          ],
          max_tokens: LLM_CONFIG.MAX_TOKENS,
          temperature: LLM_CONFIG.TEMPERATURE,
        }),
      });

      if (!response.ok) {
        log(`LLM API error: ${response.status}`, 'warning');
        return null;
      }

      const data = await response.json();
      let comment = data.choices?.[0]?.message?.content?.trim();

      if (!comment) return null;

      // Clean up: remove quotes, limit length
      comment = comment.replace(/^["']|["']$/g, '').trim();
      if (comment.length > 280) comment = comment.substring(0, 277) + '...';
      if (comment.length < 2) return null;

      log(`🤖 LLM generated: "${comment}"`, 'info');
      return comment;
    } catch (err) {
      log(`LLM error: ${err.message}`, 'warning');
      return null;
    }
  };

  const getComment = async (tweetText) => {
    // Try LLM first
    const llmComment = await generateLLMComment(tweetText);
    if (llmComment) return llmComment;

    // Fallback to curated comments
    return FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)];
  };

  // ════════════════════════════════════════════════════════════════════════
  // CORE ACTIONS
  // ════════════════════════════════════════════════════════════════════════

  const likeTweet = async (tweetEl) => {
    if (isAlreadyLiked(tweetEl)) return false;
    const likeBtn = tweetEl.querySelector(SELECTORS.likeButton);
    if (!likeBtn) return false;

    await readingPause();
    if (CONFIG.dryRun) {
      recordAction('like', { tweetId: getTweetId(tweetEl) });
      log(`🏃 [DRY] Would like tweet ${getTweetId(tweetEl) || ''}`, 'info');
      return true;
    }
    const success = await clickElement(likeBtn);
    if (success) {
      recordAction('like', { tweetId: getTweetId(tweetEl) });
      log(`❤️  Liked tweet`, 'success');
    }
    return success;
  };

  const retweetTweet = async (tweetEl) => {
    const rtBtn = tweetEl.querySelector(SELECTORS.retweetButton);
    if (!rtBtn) return false;

    await readingPause();
    if (CONFIG.dryRun) {
      recordAction('retweet', { tweetId: getTweetId(tweetEl) });
      log(`🏃 [DRY] Would repost tweet ${getTweetId(tweetEl) || ''}`, 'info');
      return true;
    }
    await clickElement(rtBtn);
    await sleep(800);

    // Click "Repost" in the menu
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    for (const item of menuItems) {
      if (item.textContent.includes('Repost')) {
        await clickElement(item);
        recordAction('retweet', { tweetId: getTweetId(tweetEl) });
        log(`🔁 Retweeted`, 'success');
        return true;
      }
    }
    // Close menu if repost not found
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return false;
  };

  const commentOnTweet = async (tweetEl, tweetText) => {
    const tweetId = getTweetId(tweetEl);
    if (!tweetId || state.commentedTweets.includes(tweetId)) return false;

    const comment = await getComment(tweetText);
    if (!comment) return false;

    // Click reply button
    const replyBtn = tweetEl.querySelector(SELECTORS.replyButton);
    if (!replyBtn) return false;

    await readingPause();
    if (CONFIG.dryRun) {
      recordAction('comment', { tweetId, text: comment });
      log(`🏃 [DRY] Would reply: "${comment.substring(0, 50)}..."`, 'info');
      return true;
    }
    await clickElement(replyBtn);
    await sleep(1200);

    // Type into reply box
    const replyInput = await waitForElement('[data-testid="tweetTextarea_0"]', 5000);
    if (!replyInput) {
      log('Reply input not found', 'warning');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    }

    replyInput.focus();
    await sleep(400);

    // Type character by character for human feel
    for (const char of comment) {
      document.execCommand('insertText', false, char);
      await sleep(BEHAVIOR.TYPING_DELAY + randomBetween(-20, 40));
    }
    await sleep(600);

    // Click post button
    const postBtn = await waitForElement('[data-testid="tweetButton"]', 3000);
    if (!postBtn) {
      log('Post button not found', 'warning');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    }

    // Wait for button to become enabled
    if (postBtn.disabled || postBtn.getAttribute('aria-disabled') === 'true') {
      await sleep(800);
    }

    await clickElement(postBtn);
    await sleep(1200);

    state.commentedTweets.push(tweetId);
    recordAction('comment', { tweetId, text: comment });
    log(`💬 Commented: "${comment.substring(0, 50)}..."`, 'success');
    return true;
  };

  const followUser = async (tweetEl) => {
    // Find a follow button associated with this tweet's author
    // First try the user cell approach
    const username = getTweetAuthorUsername(tweetEl);
    if (!username) return false;
    if (state.followedUsers.includes(username)) return false;

    // Look for follow button in the tweet
    const followBtn = tweetEl.querySelector(SELECTORS.followButton);
    if (!followBtn) return false;

    // Check if we already follow
    if (tweetEl.querySelector(SELECTORS.unfollowButton)) return false;

    await readingPause();
    if (CONFIG.dryRun) {
      recordAction('follow', { username });
      log(`🏃 [DRY] Would follow @${username}`, 'info');
      return true;
    }
    const success = await clickElement(followBtn);
    if (success) {
      state.followedUsers.push(username);
      recordAction('follow', { username });
      log(`➕ Followed @${username}`, 'success');
    }
    return success;
  };

  // ════════════════════════════════════════════════════════════════════════
  // ACTIVITY CYCLES — Each cycle mimics a different natural browsing pattern
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Cycle 1: Search & Engage — Search a keyword, scroll results, interact
   */
  const cycleSearchEngage = async () => {
    const keyword = NICHE_CONFIG.KEYWORDS[state.keywordIndex % NICHE_CONFIG.KEYWORDS.length];
    state.keywordIndex++;
    state.totalSearches++;
    saveState();

    log(`🔍 Searching: "${keyword}"`, 'action');

    // Search top results first
    const searchUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=top`;
    await navigateTo(searchUrl);

    await engageWithFeed('search-top');

    if (!isRunning) return;

    // Then switch to Latest tab
    log(`🔍 Switching to Latest for: "${keyword}"`, 'action');
    const latestUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=live`;
    await navigateTo(latestUrl);

    await engageWithFeed('search-latest');
  };

  /**
   * Cycle 2: Browse Home Feed — Scroll home timeline, engage naturally
   */
  const cycleBrowseHome = async () => {
    log('🏠 Browsing home feed', 'action');
    await navigateTo('https://x.com/home');

    // Try to click "For you" tab if available
    const tabs = document.querySelectorAll('[role="tab"]');
    for (const tab of tabs) {
      if (tab.textContent.includes('For you')) {
        await clickElement(tab);
        await sleep(1500);
        break;
      }
    }

    await engageWithFeed('home');
  };

  /**
   * Cycle 3: Target Account — Visit a target account's posts, engage
   */
  const cycleTargetAccount = async () => {
    if (NICHE_CONFIG.TARGET_ACCOUNTS.length === 0) {
      // No targets configured — fall back to home feed
      await cycleBrowseHome();
      return;
    }

    const target = NICHE_CONFIG.TARGET_ACCOUNTS[
      state.targetAccountIndex % NICHE_CONFIG.TARGET_ACCOUNTS.length
    ].replace('@', '');
    state.targetAccountIndex++;
    saveState();

    log(`🎯 Visiting target: @${target}`, 'action');
    await navigateTo(`https://x.com/${target}`);

    await engageWithFeed('target-account');
  };

  /**
   * Cycle 4: Explore Page — Browse trending/explore for topic discovery
   */
  const cycleExplore = async () => {
    log('🌍 Browsing Explore', 'action');
    await navigateTo('https://x.com/explore');
    await sleep(2000);

    // Try to click a trending topic
    const trendLinks = document.querySelectorAll('[data-testid="trend"] a, [data-testid="cellInnerDiv"] a[href*="/search"]');
    if (trendLinks.length > 0) {
      const randomTrend = trendLinks[randomBetween(0, Math.min(trendLinks.length - 1, 5))];
      log(`📈 Clicking trending topic`, 'action');
      await clickElement(randomTrend);
      await sleep(BEHAVIOR.PAGE_LOAD_WAIT);
      await engageWithFeed('explore-trend');
    } else {
      // Just scroll explore
      for (let i = 0; i < 5 && isRunning; i++) {
        scrollBy(randomBetween(BEHAVIOR.SCROLL_PIXELS_MIN, BEHAVIOR.SCROLL_PIXELS_MAX));
        await scrollDelay();
      }
    }
  };

  /**
   * Cycle 5: Search People — Find and follow people in the niche
   */
  const cycleSearchPeople = async () => {
    const keyword = NICHE_CONFIG.KEYWORDS[
      randomBetween(0, NICHE_CONFIG.KEYWORDS.length - 1)
    ];
    log(`👥 Searching people: "${keyword}"`, 'action');

    const peopleUrl = `https://x.com/search?q=${encodeURIComponent(keyword)}&src=typed_query&f=user`;
    await navigateTo(peopleUrl);

    // Follow relevant people from search results
    const maxScrolls = randomBetween(5, 10);
    let followsThisCycle = 0;

    for (let i = 0; i < maxScrolls && isRunning && canFollow(); i++) {
      const cells = document.querySelectorAll(SELECTORS.userCell);

      for (const cell of cells) {
        if (!isRunning || !canFollow() || followsThisCycle >= 5) break;

        const userInfo = extractUserFromCell(cell);
        if (!userInfo || !userInfo.username) continue;
        if (state.followedUsers.includes(userInfo.username)) continue;
        if (userInfo.isFollowing) continue;
        if (BEHAVIOR.SKIP_PROTECTED_ACCOUNTS && userInfo.isProtected) continue;

        // Check follower count range
        if (userInfo.followers < BEHAVIOR.MIN_FOLLOWERS_TO_FOLLOW) continue;
        if (userInfo.followers > BEHAVIOR.MAX_FOLLOWERS_TO_FOLLOW) continue;

        // Check bio keywords (if configured)
        if (NICHE_CONFIG.BIO_KEYWORDS.length > 0 && userInfo.bio) {
          const bioLower = userInfo.bio.toLowerCase();
          const hasBioMatch = NICHE_CONFIG.BIO_KEYWORDS.some(kw => bioLower.includes(kw.toLowerCase()));
          if (!hasBioMatch) continue;
        }

        // Follow this user
        const followBtn = cell.querySelector(SELECTORS.followButton);
        if (followBtn) {
          await readingPause();
          if (CONFIG.dryRun) {
            recordAction('follow', { username: userInfo.username, followers: userInfo.followers });
            followsThisCycle++;
            log(`🏃 [DRY] Would follow @${userInfo.username} (${userInfo.followers} followers)`, 'info');
            await humanDelay();
            continue;
          }
          const success = await clickElement(followBtn);
          if (success) {
            state.followedUsers.push(userInfo.username);
            recordAction('follow', { username: userInfo.username, followers: userInfo.followers });
            followsThisCycle++;
            log(`➕ Followed @${userInfo.username} (${userInfo.followers} followers)`, 'success');
            await humanDelay();
          }
        }
      }

      scrollBy(randomBetween(BEHAVIOR.SCROLL_PIXELS_MIN, BEHAVIOR.SCROLL_PIXELS_MAX));
      await scrollDelay();
    }
  };

  /**
   * Cycle 6: Visit Own Profile — Makes you look active, check your own posts
   */
  const cycleOwnProfile = async () => {
    log('👤 Visiting own profile', 'action');

    // Click the profile link in sidebar
    const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    if (profileLink) {
      await clickElement(profileLink);
    } else {
      // Fallback: try to find username from page
      await navigateTo('https://x.com/home');
      await sleep(1500);
      const pLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
      if (pLink) await clickElement(pLink);
    }

    await sleep(BEHAVIOR.PAGE_LOAD_WAIT);

    // Scroll through own profile briefly
    for (let i = 0; i < randomBetween(2, 5) && isRunning; i++) {
      scrollBy(randomBetween(300, 600));
      await scrollDelay();
    }

    // Scroll back to top
    scrollToTop();
    await sleep(1000);
  };

  // ════════════════════════════════════════════════════════════════════════
  // FEED ENGAGEMENT ENGINE — Scrolls a feed and engages with posts
  // ════════════════════════════════════════════════════════════════════════

  const engageWithFeed = async (source) => {
    const maxScrolls = randomBetween(
      Math.floor(BEHAVIOR.MAX_SCROLLS_PER_FEED * 0.5),
      BEHAVIOR.MAX_SCROLLS_PER_FEED
    );
    let processedThisScroll = new Set();

    for (let scroll = 0; scroll < maxScrolls && isRunning; scroll++) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);

      for (const tweetEl of tweets) {
        if (!isRunning) break;

        const tweetId = getTweetId(tweetEl);
        if (!tweetId) continue;
        if (processedThisScroll.has(tweetId)) continue;
        if (state.engagedTweets.includes(tweetId)) continue;
        processedThisScroll.add(tweetId);

        const info = extractTweetInfo(tweetEl);
        if (!info || !info.text) continue;

        const likeCount = getTweetLikeCount(tweetEl);

        // Skip low-engagement tweets (unless from search-latest)
        if (source !== 'search-latest' && likeCount < BEHAVIOR.MIN_TWEET_LIKES) continue;

        // ─── Decide what actions to take on this tweet ───
        let didSomething = false;

        // Like
        if (canLike() && shouldAct(BEHAVIOR.LIKE_PROBABILITY)) {
          const liked = await likeTweet(tweetEl);
          if (liked) didSomething = true;
          await humanDelay();
        }

        // Comment (less frequent, more impactful)
        if (canComment() && shouldAct(BEHAVIOR.COMMENT_PROBABILITY) && info.text.length > 20) {
          const commented = await commentOnTweet(tweetEl, info.text);
          if (commented) didSomething = true;
          await humanDelay();
        }

        // Retweet (rare)
        if (canRetweet() && shouldAct(BEHAVIOR.RETWEET_PROBABILITY)) {
          const retweeted = await retweetTweet(tweetEl);
          if (retweeted) didSomething = true;
          await humanDelay();
        }

        // Follow author (if bio matches niche)
        if (canFollow() && shouldAct(BEHAVIOR.FOLLOW_PROBABILITY)) {
          await followUser(tweetEl);
          await humanDelay();
        }

        if (didSomething && !CONFIG.dryRun) {
          state.engagedTweets.push(tweetId);
          saveState();
        }
      }

      // Scroll down naturally
      scrollBy(randomBetween(BEHAVIOR.SCROLL_PIXELS_MIN, BEHAVIOR.SCROLL_PIXELS_MAX));
      await scrollDelay();

      // Occasionally pause longer (reading behavior)
      if (Math.random() < 0.15) {
        const longPause = randomBetween(5000, 12000);
        log(`📖 Reading pause (${Math.round(longPause / 1000)}s)`, 'info');
        await sleep(longPause);
      }
    }
  };

  // ════════════════════════════════════════════════════════════════════════
  // SESSION MANAGER — Handles work/break cycles for 24/7 operation
  // ════════════════════════════════════════════════════════════════════════

  const isSessionExpired = () => {
    if (!state.sessionStartedAt) return false;
    const sessionLength = randomBetween(
      BEHAVIOR.SESSION_MIN_MINUTES,
      BEHAVIOR.SESSION_MAX_MINUTES
    ) * 60 * 1000;
    return Date.now() - state.sessionStartedAt > sessionLength;
  };

  const takeBreak = async () => {
    const breakMinutes = randomBetween(BEHAVIOR.BREAK_MIN_MINUTES, BEHAVIOR.BREAK_MAX_MINUTES);
    log(`😴 Taking a ${breakMinutes} minute break...`, 'info');
    logSessionSummary();

    state.lastBreakAt = Date.now();
    saveState();

    // Sleep in 30-second increments so we can check if stopped
    const breakMs = breakMinutes * 60 * 1000;
    const startBreak = Date.now();
    while (Date.now() - startBreak < breakMs && isRunning) {
      await sleep(30000);
    }

    // Reset session
    state.sessionStartedAt = Date.now();
    state.sessionStats = { likes: 0, comments: 0, follows: 0, retweets: 0 };
    state.totalSessions++;
    saveState();

    log(`⚡ Back from break! Starting session #${state.totalSessions + 1}`, 'success');
  };

  // Every per-session or daily cap is used up: nothing left to do this session.
  const sessionCapsReached = () => !canLike() && !canComment() && !canFollow() && !canRetweet();

  const logSessionSummary = () => {
    const s = state.sessionStats;
    const elapsed = Math.round((Date.now() - state.sessionStartedAt) / 60000);
    log(`📊 Session summary (${elapsed}m): ❤️${s.likes} 💬${s.comments} ➕${s.follows} 🔁${s.retweets}`, 'info');
  };

  // ════════════════════════════════════════════════════════════════════════
  // ACTIVITY CYCLE SCHEDULER — Natural activity rotation
  // ════════════════════════════════════════════════════════════════════════

  // Weighted cycle selection (search is most common, own profile least)
  const ACTIVITY_CYCLES = [
    { fn: cycleSearchEngage,  weight: 30, name: 'Search & Engage' },
    { fn: cycleBrowseHome,    weight: 25, name: 'Browse Home' },
    { fn: cycleTargetAccount, weight: 15, name: 'Target Account' },
    { fn: cycleExplore,       weight: 10, name: 'Explore' },
    { fn: cycleSearchPeople,  weight: 15, name: 'Search People' },
    { fn: cycleOwnProfile,    weight: 5,  name: 'Own Profile' },
  ];

  const pickNextCycle = () => {
    const totalWeight = ACTIVITY_CYCLES.reduce((sum, c) => sum + c.weight, 0);
    let random = Math.random() * totalWeight;
    for (const cycle of ACTIVITY_CYCLES) {
      random -= cycle.weight;
      if (random <= 0) return cycle;
    }
    return ACTIVITY_CYCLES[0];
  };

  // ════════════════════════════════════════════════════════════════════════
  // MAIN LOOP
  // ════════════════════════════════════════════════════════════════════════

  const run = async () => {
    // ─── Startup banner ───
    console.log(`
╔═══════════════════════════════════════════════════╗
║       ⚡ XActions Algorithm Builder ⚡            ║
╠═══════════════════════════════════════════════════╣
║  Building your algorithm around:                  ║
║  ${NICHE_CONFIG.KEYWORDS.slice(0, 3).join(', ').substring(0, 47).padEnd(47)}  ║
║                                                   ║
║  LLM Comments: ${(LLM_CONFIG.ENABLED ? '✅ Enabled' : '❌ Disabled').padEnd(33)}  ║
║  Peak Hours: ${(`${BEHAVIOR.PEAK_HOURS_START}:00 - ${BEHAVIOR.PEAK_HOURS_END}:00 UTC`).padEnd(35)}  ║
║                                                   ║
║  Stop: window.stopAlgoBuilder()                   ║
║  Stats: window.algoStats()                        ║
╚═══════════════════════════════════════════════════╝
    `);

    if (CONFIG.dryRun) {
      log('🏃 DRY RUN: nothing will be liked, replied to, reposted or followed. Set CONFIG.dryRun = false to engage for real.', 'warning');
    }
    log(`🎯 Session limits: ${BEHAVIOR.MAX_LIKES_PER_SESSION} likes, ${BEHAVIOR.MAX_COMMENTS_PER_SESSION} replies, ${BEHAVIOR.MAX_RETWEETS_PER_SESSION} reposts, ${BEHAVIOR.MAX_FOLLOWS_PER_SESSION} follows`, 'info');

    log(`🚀 Starting Algorithm Builder — Session #${state.totalSessions + 1}`, 'success');
    log(`📍 Current time: ${new Date().toLocaleTimeString()} (${isPeakHours() ? 'PEAK' : 'off-peak'} hours)`, 'info');

    while (isRunning) {
      try {
        // singleSession: one work session, then stop instead of a break
        if (CONFIG.singleSession && (isSessionExpired() || sessionCapsReached())) {
          log('🏁 Session complete (CONFIG.singleSession), stopping', 'info');
          break;
        }

        // Check if session needs a break
        if (isSessionExpired()) {
          await takeBreak();
          if (!isRunning) break;
        }

        // Pick and run next activity cycle
        const cycle = pickNextCycle();
        log(`\n🔄 Activity: ${cycle.name}`, 'action');

        await cycle.fn();

        if (!isRunning) break;

        // Inter-cycle delay (natural pause between activities)
        const interDelay = randomBetween(3000, 8000);
        await sleep(interDelay);

      } catch (err) {
        log(`Error in main loop: ${err.message}`, 'error');
        // Don't crash — wait and retry
        await sleep(5000);
      }
    }

    log('🛑 Algorithm Builder stopped', 'warning');
    logSessionSummary();
    logOverallStats();
    if (CONFIG.dryRun) log('🏃 (Dry run: nothing executed)', 'info');
    if (CONFIG.exportOnStop) exportRunLog();
  };

  // Download this run's actions as JSON (CONFIG.exportOnStop).
  const exportRunLog = () => {
    if (runLog.length === 0) {
      log('Nothing to export: no actions this run', 'info');
      return;
    }
    const filename = `xactions-algorithm-builder-${Date.now()}.json`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({
      keywords: NICHE_CONFIG.KEYWORDS,
      dryRun: CONFIG.dryRun,
      session: { ...state.sessionStats },
      engaged: runLog,
      timestamp: new Date().toISOString(),
    }, null, 2)], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    log(`📥 Downloaded: ${filename}`, 'success');
  };

  // ════════════════════════════════════════════════════════════════════════
  // STATS & CONTROL
  // ════════════════════════════════════════════════════════════════════════

  const logOverallStats = () => {
    const runtime = Math.round((Date.now() - state.startedAt) / 3600000 * 10) / 10;
    console.log(`
╔═══════════════════════════════════════════════════╗
║       📊 Algorithm Builder — All Time Stats       ║
╠═══════════════════════════════════════════════════╣
║  Runtime:    ${`${runtime} hours`.padEnd(37)}║
║  Sessions:   ${`${state.totalSessions + 1}`.padEnd(37)}║
║  Searches:   ${`${state.totalSearches}`.padEnd(37)}║
║  ❤️  Likes:    ${`${state.totalLikes}`.padEnd(35)}║
║  💬 Comments: ${`${state.totalComments}`.padEnd(35)}║
║  ➕ Follows:  ${`${state.totalFollows}`.padEnd(35)}║
║  🔁 Retweets: ${`${state.totalRetweets}`.padEnd(35)}║
║  Engaged:    ${`${state.engagedTweets.length} unique tweets`.padEnd(37)}║
╚═══════════════════════════════════════════════════╝
    `);
  };

  // ─── Public API ───

  window.stopAlgoBuilder = () => {
    isRunning = false;
    state.isRunning = false;
    saveState();
    log('🛑 Stopping after current action...', 'warning');
  };

  window.algoStats = () => {
    logOverallStats();
    return {
      session: { ...state.sessionStats },
      total: {
        likes: state.totalLikes,
        comments: state.totalComments,
        follows: state.totalFollows,
        retweets: state.totalRetweets,
        searches: state.totalSearches,
        sessions: state.totalSessions + 1,
      },
      followed: state.followedUsers.slice(-20),
      isPeakHours: isPeakHours(),
      sessionAge: Math.round((Date.now() - state.sessionStartedAt) / 60000) + 'm',
      totalRuntime: Math.round((Date.now() - state.startedAt) / 3600000 * 10) / 10 + 'h',
    };
  };

  window.algoReset = () => {
    storage.remove(STATE_KEY);
    log('🗑️  State cleared. Refresh to start fresh.', 'warning');
  };

  window.algoConfig = () => {
    console.log('NICHE_CONFIG:', NICHE_CONFIG);
    console.log('LLM_CONFIG:', { ...LLM_CONFIG, API_KEY: LLM_CONFIG.API_KEY ? '***' : '(not set)' });
    console.log('BEHAVIOR:', BEHAVIOR);
  };

  // Expose on XActions namespace
  window.XActions.AlgoBuilder = {
    stop: window.stopAlgoBuilder,
    stats: window.algoStats,
    reset: window.algoReset,
    config: window.algoConfig,
    state,
    NICHE_CONFIG,
    LLM_CONFIG,
    BEHAVIOR,
  };

  // ─── Start ───
  run();
})();

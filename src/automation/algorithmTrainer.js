// XActions Automation - Algorithm Trainer
// https://github.com/nirholas/XActions
// by nichxbt
//
// REQUIRES: Paste core.js first!
//
// Trains your X/Twitter algorithm by simulating natural browsing behavior
// in your chosen niche(s). Searches topics, scrolls feeds, likes posts,
// follows viral accounts, comments on content, visits your own profile —
// all with human-like timing and randomness.
//
// HOW TO USE:
// 1. Open x.com (logged into your account)
// 2. Paste core.js, then paste this script
// 3. Configure NICHES, PERSONA, and BEHAVIOR below
// 4. Let it run — it cycles continuously through training phases
//
// STOP: Type stopTrainer() in console
//
// ⚠️ This runs long sessions. Leave the tab open and active.
// ⚠️ Use responsibly — aggressive automation can get accounts limited.

(() => {
  if (!window.XActions?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  const {
    log, sleep, randomDelay, scrollBy, scrollToTop, scrollToBottom,
    clickElement, waitForElement, waitForElements, typeText,
    storage, rateLimit, SELECTORS, extractTweetInfo,
  } = window.XActions.Core;

  // ============================================
  // 🎯 CONFIGURATION — EDIT THIS
  // ============================================
  const NICHES = {
    // Define your niches with search terms and comment templates.
    // The trainer picks a random niche each cycle.
    topics: [
      {
        name: 'AI & Machine Learning',
        searchTerms: [
          'AI agents', 'machine learning', 'LLM', 'GPT',
          'artificial intelligence startups', 'AI engineering',
        ],
        // Comments rotated randomly when engaging with posts in this niche
        comments: [
          '🔥 this is the future',
          'Super insightful, thanks for sharing',
          'Great breakdown 👏',
          'Been thinking about this a lot lately',
          'Underrated take',
          'This is going to be huge',
          '💯',
          'Saving this',
          'Solid thread',
        ],
        // Accounts whose content to prioritize (optional)
        influencers: [
          // 'kaborobot', 'AndrewYNg', 'ylecun',
        ],
      },
      {
        name: 'Web3 & Crypto',
        searchTerms: [
          'web3 builder', 'crypto alpha', 'DeFi', 'onchain',
          'solana ecosystem', 'ethereum developer',
        ],
        comments: [
          'Bullish on this',
          'Great alpha, appreciate it 🫡',
          'This is why I love crypto Twitter',
          'Bookmarked 🔖',
          'Need more takes like this',
          'The builders always win',
          'Interesting perspective',
        ],
        influencers: [],
      },
      {
        name: 'Startups & Business',
        searchTerms: [
          'startup founder', 'SaaS growth', 'bootstrapped',
          'product market fit', 'YC startup', 'indie hacker',
        ],
        comments: [
          'Great insights for founders 🚀',
          'This resonates hard',
          'Underrated advice',
          'Needed to hear this today',
          'Facts. More people need to see this.',
          'Building in public at its best 👏',
        ],
        influencers: [],
      },
    ],
  };

  const PERSONA = {
    // Your X handle (used for profile visits and self-awareness)
    MY_USERNAME: '',  // e.g. 'nichxbt' — leave empty to auto-detect

    // How aggressive should the trainer be?
    // 'chill'   = minimal engagement, mostly scrolling & reading
    // 'normal'  = balanced mix of likes, follows, occasional comments
    // 'active'  = high engagement, more follows + comments + bookmarks
    INTENSITY: 'normal',
  };

  const BEHAVIOR = {
    // -------- SESSION --------
    CYCLE_DURATION_MINUTES: 45,     // How long one full cycle runs
    BREAK_BETWEEN_CYCLES_MIN: 5,    // Break between cycles (minutes)
    BREAK_BETWEEN_CYCLES_MAX: 15,
    MAX_CYCLES: 0,                  // 0 = run forever

    // -------- PER-CYCLE LIMITS --------
    MAX_LIKES_PER_CYCLE: 25,
    MAX_FOLLOWS_PER_CYCLE: 15,
    MAX_COMMENTS_PER_CYCLE: 5,
    MAX_BOOKMARKS_PER_CYCLE: 8,
    MAX_RETWEETS_PER_CYCLE: 3,

    // -------- DAILY LIMITS (safety) --------
    MAX_LIKES_PER_DAY: 150,
    MAX_FOLLOWS_PER_DAY: 80,
    MAX_COMMENTS_PER_DAY: 30,

    // -------- FOLLOW FILTERS --------
    FOLLOW_MIN_FOLLOWERS: 100,
    FOLLOW_MAX_FOLLOWERS: 500000,
    FOLLOW_MUST_HAVE_BIO: true,
    FOLLOW_SKIP_PRIVATE: true,

    // -------- HUMAN SIM TIMING (ms) --------
    MIN_ACTION_DELAY: 2000,
    MAX_ACTION_DELAY: 6000,
    MIN_SCROLL_PAUSE: 1500,
    MAX_SCROLL_PAUSE: 4000,
    MIN_READ_TIME: 3000,           // Time spent "reading" a post
    MAX_READ_TIME: 8000,
    PAGE_LOAD_WAIT: 3000,

    // -------- ENGAGEMENT PROBABILITY --------
    // Percent chance (0-100) of acting on any given qualifying post.
    // Lower = more selective = more human.
    LIKE_CHANCE: 40,
    FOLLOW_CHANCE: 25,
    COMMENT_CHANCE: 8,
    BOOKMARK_CHANCE: 15,
    RETWEET_CHANCE: 5,
  };

  // ============================================
  // INTENSITY PRESETS (override probability)
  // ============================================
  const INTENSITY_PRESETS = {
    chill:  { LIKE_CHANCE: 20, FOLLOW_CHANCE: 10, COMMENT_CHANCE: 3,  BOOKMARK_CHANCE: 10, RETWEET_CHANCE: 2  },
    normal: { LIKE_CHANCE: 40, FOLLOW_CHANCE: 25, COMMENT_CHANCE: 8,  BOOKMARK_CHANCE: 15, RETWEET_CHANCE: 5  },
    active: { LIKE_CHANCE: 60, FOLLOW_CHANCE: 40, COMMENT_CHANCE: 15, BOOKMARK_CHANCE: 25, RETWEET_CHANCE: 10 },
  };

  // Apply preset
  if (INTENSITY_PRESETS[PERSONA.INTENSITY]) {
    Object.assign(BEHAVIOR, INTENSITY_PRESETS[PERSONA.INTENSITY]);
  }

  // ============================================
  // STATE
  // ============================================
  const state = {
    isRunning: true,
    currentCycle: 0,
    cycleStartTime: 0,
    phase: 'init',
    stats: {
      likes: 0, follows: 0, comments: 0, bookmarks: 0, retweets: 0,
      searches: 0, profileVisits: 0, scrolls: 0,
    },
    cycleStats: {
      likes: 0, follows: 0, comments: 0, bookmarks: 0, retweets: 0,
    },
  };

  // Persistent tracking
  const tracked = {
    likedTweets: new Set(storage.get('algo_liked') || []),
    followedUsers: new Map(Object.entries(storage.get('algo_followed') || {})),
    commentedTweets: new Set(storage.get('algo_commented') || []),
    bookmarkedTweets: new Set(storage.get('algo_bookmarked') || []),
    searchHistory: storage.get('algo_searches') || [],
  };

  const saveTracked = () => {
    storage.set('algo_liked', Array.from(tracked.likedTweets));
    storage.set('algo_followed', Object.fromEntries(tracked.followedUsers));
    storage.set('algo_commented', Array.from(tracked.commentedTweets));
    storage.set('algo_bookmarked', Array.from(tracked.bookmarkedTweets));
    storage.set('algo_searches', tracked.searchHistory.slice(-200));
  };

  // ============================================
  // UTILITY HELPERS
  // ============================================

  const myUsername = () => {
    if (PERSONA.MY_USERNAME) return PERSONA.MY_USERNAME.toLowerCase();
    // Auto-detect from nav
    const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    if (profileLink) {
      const href = profileLink.getAttribute('href');
      return href?.replace('/', '').toLowerCase() || '';
    }
    return '';
  };

  const chance = (percent) => Math.random() * 100 < percent;

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const humanDelay = () => randomDelay(BEHAVIOR.MIN_ACTION_DELAY, BEHAVIOR.MAX_ACTION_DELAY);
  const scrollPause = () => randomDelay(BEHAVIOR.MIN_SCROLL_PAUSE, BEHAVIOR.MAX_SCROLL_PAUSE);
  const readTime = () => randomDelay(BEHAVIOR.MIN_READ_TIME, BEHAVIOR.MAX_READ_TIME);

  const isCycleExpired = () => {
    return (Date.now() - state.cycleStartTime) / 60000 >= BEHAVIOR.CYCLE_DURATION_MINUTES;
  };

  const canDo = (action) => {
    if (!state.isRunning) return false;
    const cycleLimits = {
      likes: BEHAVIOR.MAX_LIKES_PER_CYCLE,
      follows: BEHAVIOR.MAX_FOLLOWS_PER_CYCLE,
      comments: BEHAVIOR.MAX_COMMENTS_PER_CYCLE,
      bookmarks: BEHAVIOR.MAX_BOOKMARKS_PER_CYCLE,
      retweets: BEHAVIOR.MAX_RETWEETS_PER_CYCLE,
    };
    const dailyLimits = {
      likes: BEHAVIOR.MAX_LIKES_PER_DAY,
      follows: BEHAVIOR.MAX_FOLLOWS_PER_DAY,
      comments: BEHAVIOR.MAX_COMMENTS_PER_DAY,
    };

    if (state.cycleStats[action] >= cycleLimits[action]) return false;
    if (dailyLimits[action] && !rateLimit.check(`algo_${action}`, dailyLimits[action], 'day')) return false;
    return true;
  };

  const recordAction = (action) => {
    state.stats[action]++;
    state.cycleStats[action]++;
    rateLimit.increment(`algo_${action}`, 'day');
  };

  const getTweetId = (tweet) => {
    const link = tweet.querySelector('a[href*="/status/"]');
    return link?.href?.match(/status\/(\d+)/)?.[1] || null;
  };

  const isAd = (tweet) => {
    return !!tweet.querySelector('[data-testid="placementTracking"]') ||
           !!tweet.textContent?.includes('Promoted');
  };

  // ============================================
  // NAVIGATION
  // ============================================

  const navigateTo = async (url) => {
    log(`🧭 Navigating to ${url}`, 'action');
    window.location.href = url;
    await sleep(BEHAVIOR.PAGE_LOAD_WAIT);
    // Wait for primary column to load
    await waitForElement(SELECTORS.primaryColumn, 15000);
    await sleep(1000);
  };

  const goHome = async () => {
    await navigateTo('https://x.com/home');
  };

  const goSearch = async (query) => {
    const encoded = encodeURIComponent(query);
    await navigateTo(`https://x.com/search?q=${encoded}&src=typed_query`);
    state.stats.searches++;
    tracked.searchHistory.push({ q: query, at: Date.now() });
    saveTracked();
  };

  const goSearchLatest = async (query) => {
    const encoded = encodeURIComponent(query);
    await navigateTo(`https://x.com/search?q=${encoded}&src=typed_query&f=live`);
  };

  const goProfile = async (username) => {
    await navigateTo(`https://x.com/${username}`);
    state.stats.profileVisits++;
  };

  const goExplore = async () => {
    await navigateTo('https://x.com/explore');
  };

  // ============================================
  // ACTIONS
  // ============================================

  const doLike = async (tweet) => {
    const tweetId = getTweetId(tweet);
    if (!tweetId || tracked.likedTweets.has(tweetId)) return false;
    if (!canDo('likes')) return false;

    const likeBtn = tweet.querySelector(SELECTORS.likeButton);
    if (!likeBtn) return false;

    await clickElement(likeBtn);
    tracked.likedTweets.add(tweetId);
    recordAction('likes');
    saveTracked();
    log(`❤️ Liked tweet ${tweetId}`, 'success');
    return true;
  };

  const doBookmark = async (tweet) => {
    const tweetId = getTweetId(tweet);
    if (!tweetId || tracked.bookmarkedTweets.has(tweetId)) return false;
    if (!canDo('bookmarks')) return false;

    const bookmarkBtn = tweet.querySelector('[data-testid="bookmark"]');
    if (!bookmarkBtn) return false;

    await clickElement(bookmarkBtn);
    tracked.bookmarkedTweets.add(tweetId);
    recordAction('bookmarks');
    saveTracked();
    log(`🔖 Bookmarked tweet ${tweetId}`, 'success');
    return true;
  };

  const doRetweet = async (tweet) => {
    const tweetId = getTweetId(tweet);
    if (!tweetId) return false;
    if (!canDo('retweets')) return false;

    const rtBtn = tweet.querySelector(SELECTORS.retweetButton);
    if (!rtBtn) return false;

    await clickElement(rtBtn);
    await sleep(600);
    const confirmRt = await waitForElement('[data-testid="retweetConfirm"]', 2000);
    if (confirmRt) {
      await clickElement(confirmRt);
      recordAction('retweets');
      log(`🔁 Retweeted ${tweetId}`, 'success');
      return true;
    }
    // Close menu if confirm didn't appear
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return false;
  };

  const doComment = async (tweet, niche) => {
    const tweetId = getTweetId(tweet);
    if (!tweetId || tracked.commentedTweets.has(tweetId)) return false;
    if (!canDo('comments')) return false;

    const replyBtn = tweet.querySelector(SELECTORS.replyButton);
    if (!replyBtn) return false;

    await clickElement(replyBtn);
    await sleep(1200);

    const replyInput = await waitForElement('[data-testid="tweetTextarea_0"]', 5000);
    if (!replyInput) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    }

    const comment = pick(niche.comments);
    replyInput.focus();
    await sleep(300);
    document.execCommand('insertText', false, comment);
    await sleep(600);

    const postBtn = await waitForElement('[data-testid="tweetButton"]', 3000);
    if (!postBtn || postBtn.disabled || postBtn.getAttribute('aria-disabled') === 'true') {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    }

    await clickElement(postBtn);
    await sleep(1000);

    tracked.commentedTweets.add(tweetId);
    recordAction('comments');
    saveTracked();
    log(`💬 Commented "${comment}" on ${tweetId}`, 'success');
    return true;
  };

  const doFollow = async (tweet) => {
    if (!canDo('follows')) return false;

    // Find the user link in the tweet to get username
    const userLink = tweet.querySelector('a[href^="/"][role="link"]');
    if (!userLink) return false;
    const username = userLink.getAttribute('href')?.replace('/', '').toLowerCase();
    if (!username || tracked.followedUsers.has(username)) return false;
    if (username === myUsername()) return false;

    // Find a follow button within or near the tweet
    // We need to visit the profile to follow — too complex in-feed.
    // Instead, look for follow buttons in user cells on search/people pages.
    return false; // Handled separately in followFromPeoplePage
  };

  const followFromUserCell = async (cell) => {
    if (!canDo('follows')) return false;

    const link = cell.querySelector('a[href^="/"]');
    const username = link?.getAttribute('href')?.replace('/', '').toLowerCase();
    if (!username || tracked.followedUsers.has(username)) return false;
    if (username === myUsername()) return false;

    // Check for existing follow
    const unfollowBtn = cell.querySelector(SELECTORS.unfollowButton);
    if (unfollowBtn) return false; // Already following

    // Apply filters
    const bio = cell.querySelector('[data-testid="UserDescription"]')?.textContent || '';
    if (BEHAVIOR.FOLLOW_MUST_HAVE_BIO && !bio.trim()) return false;

    const isProtected = !!cell.querySelector('[data-testid="icon-lock"]');
    if (BEHAVIOR.FOLLOW_SKIP_PRIVATE && isProtected) return false;

    // Follower count check (if visible)
    const cellText = cell.textContent || '';
    const followerMatch = cellText.match(/(\d[\d,]*\.?\d*[KMB]?)\s*Follower/i);
    if (followerMatch) {
      const count = parseFollowerCount(followerMatch[1]);
      if (count < BEHAVIOR.FOLLOW_MIN_FOLLOWERS || count > BEHAVIOR.FOLLOW_MAX_FOLLOWERS) return false;
    }

    const followBtn = cell.querySelector('[data-testid$="-follow"]');
    if (!followBtn) return false;

    await clickElement(followBtn);
    tracked.followedUsers.set(username, { at: Date.now(), niche: state.currentNiche });
    recordAction('follows');
    saveTracked();
    log(`➕ Followed @${username}`, 'success');
    return true;
  };

  const parseFollowerCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '');
    const num = parseFloat(str);
    if (str.toUpperCase().includes('K')) return num * 1000;
    if (str.toUpperCase().includes('M')) return num * 1000000;
    if (str.toUpperCase().includes('B')) return num * 1000000000;
    return num;
  };

  // ============================================
  // TRAINING PHASES
  // ============================================

  /**
   * Phase 1: SEARCH & BROWSE TOP RESULTS
   * Searches a term, scrolls through "Top" results, engages with posts.
   */
  const phaseSearchTop = async (niche) => {
    const term = pick(niche.searchTerms);
    log(`🔍 Phase: Search Top — "${term}"`, 'info');
    state.phase = `search-top: ${term}`;

    await goSearch(term);
    await sleep(2000);

    // Scroll and engage with top results
    await scrollAndEngage(niche, { scrolls: randomInt(8, 15) });
  };

  /**
   * Phase 2: SEARCH & BROWSE LATEST (RECENT) RESULTS
   * Same search but "Latest" tab — catch fresh content.
   */
  const phaseSearchLatest = async (niche) => {
    const term = pick(niche.searchTerms);
    log(`🕐 Phase: Search Latest — "${term}"`, 'info');
    state.phase = `search-latest: ${term}`;

    await goSearchLatest(term);
    await sleep(2000);

    await scrollAndEngage(niche, { scrolls: randomInt(6, 12) });
  };

  /**
   * Phase 3: SEARCH PEOPLE & FOLLOW
   * Search for people in the niche and follow qualifying accounts.
   */
  const phaseSearchPeople = async (niche) => {
    const term = pick(niche.searchTerms);
    log(`👥 Phase: Search People — "${term}"`, 'info');
    state.phase = `search-people: ${term}`;

    const encoded = encodeURIComponent(term);
    await navigateTo(`https://x.com/search?q=${encoded}&src=typed_query&f=user`);
    await sleep(2000);

    const maxScrolls = randomInt(5, 10);
    for (let i = 0; i < maxScrolls && state.isRunning && !isCycleExpired(); i++) {
      const cells = document.querySelectorAll(SELECTORS.userCell);
      for (const cell of cells) {
        if (!canDo('follows')) break;
        if (chance(BEHAVIOR.FOLLOW_CHANCE)) {
          await followFromUserCell(cell);
          await humanDelay();
        }
      }
      scrollBy(randomInt(400, 700));
      await scrollPause();
    }
  };

  /**
   * Phase 4: HOME FEED ENGAGEMENT
   * Go to home timeline, scroll and engage — this reinforces the algorithm.
   */
  const phaseHomeFeed = async (niche) => {
    log('🏠 Phase: Home Feed', 'info');
    state.phase = 'home-feed';

    await goHome();
    await sleep(2000);

    await scrollAndEngage(niche, { scrolls: randomInt(10, 20) });
  };

  /**
   * Phase 5: INFLUENCER ENGAGEMENT
   * Visit niche influencers' profiles and engage with their posts.
   */
  const phaseInfluencerVisit = async (niche) => {
    if (!niche.influencers || niche.influencers.length === 0) return;

    const influencer = pick(niche.influencers);
    log(`⭐ Phase: Influencer Visit — @${influencer}`, 'info');
    state.phase = `influencer: @${influencer}`;

    await goProfile(influencer);
    await sleep(2000);

    // Scroll and engage with their posts (higher engagement probability)
    const savedLikeChance = BEHAVIOR.LIKE_CHANCE;
    const savedCommentChance = BEHAVIOR.COMMENT_CHANCE;
    BEHAVIOR.LIKE_CHANCE = Math.min(80, BEHAVIOR.LIKE_CHANCE * 2);
    BEHAVIOR.COMMENT_CHANCE = Math.min(30, BEHAVIOR.COMMENT_CHANCE * 2);

    await scrollAndEngage(niche, { scrolls: randomInt(5, 10) });

    // Restore chances
    BEHAVIOR.LIKE_CHANCE = savedLikeChance;
    BEHAVIOR.COMMENT_CHANCE = savedCommentChance;
  };

  /**
   * Phase 6: PROFILE VISIT (OWN)
   * Visit your own profile — X tracks this as "active user" behavior.
   * Also checks own recent posts briefly.
   */
  const phaseOwnProfile = async () => {
    const me = myUsername();
    if (!me) return;

    log(`👤 Phase: Own Profile Visit`, 'info');
    state.phase = 'own-profile';

    await goProfile(me);
    await sleep(2000);

    // Scroll through own posts briefly (3-5 scrolls)
    for (let i = 0; i < randomInt(3, 5); i++) {
      scrollBy(randomInt(300, 600));
      await scrollPause();
    }

    // Occasionally scroll to top and pause (like checking own profile)
    scrollToTop();
    await readTime();
  };

  /**
   * Phase 7: EXPLORE PAGE
   * Browse trending/explore to appear as a normal user.
   */
  const phaseExplore = async (niche) => {
    log('🌍 Phase: Explore', 'info');
    state.phase = 'explore';

    await goExplore();
    await sleep(2000);

    // Click a random trending topic if available
    const trends = document.querySelectorAll('[data-testid="trend"]');
    if (trends.length > 0) {
      const trend = pick(Array.from(trends));
      await clickElement(trend);
      await sleep(2000);
      await scrollAndEngage(niche, { scrolls: randomInt(4, 8) });
    } else {
      // Just scroll explore page
      for (let i = 0; i < randomInt(3, 6); i++) {
        scrollBy(randomInt(400, 700));
        await scrollPause();
      }
    }
  };

  /**
   * Phase 8: IDLE / DWELL (human simulation)
   * Just sit on a page and do nothing for a bit. Real humans do this.
   */
  const phaseIdle = async () => {
    const idleSeconds = randomInt(15, 45);
    log(`😴 Phase: Idle (${idleSeconds}s dwell)`, 'info');
    state.phase = 'idle';
    await sleep(idleSeconds * 1000);
  };

  // ============================================
  // SCROLL & ENGAGE ENGINE
  // ============================================

  const scrollAndEngage = async (niche, { scrolls = 10 } = {}) => {
    let processedSet = new Set();

    for (let s = 0; s < scrolls && state.isRunning && !isCycleExpired(); s++) {
      const tweets = document.querySelectorAll(SELECTORS.tweet);

      for (const tweet of tweets) {
        if (!state.isRunning || isCycleExpired()) break;

        const tweetId = getTweetId(tweet);
        if (!tweetId || processedSet.has(tweetId)) continue;
        processedSet.add(tweetId);

        // Skip ads
        if (isAd(tweet)) continue;

        // Simulate reading the post
        tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await readTime();

        // Get tweet text for relevance
        const textEl = tweet.querySelector(SELECTORS.tweetText);
        const text = textEl?.textContent || '';

        // --- LIKE ---
        if (canDo('likes') && chance(BEHAVIOR.LIKE_CHANCE) && !tracked.likedTweets.has(tweetId)) {
          await doLike(tweet);
          await humanDelay();
        }

        // --- BOOKMARK ---
        if (canDo('bookmarks') && chance(BEHAVIOR.BOOKMARK_CHANCE) && !tracked.bookmarkedTweets.has(tweetId)) {
          await doBookmark(tweet);
          await humanDelay();
        }

        // --- COMMENT ---
        if (canDo('comments') && chance(BEHAVIOR.COMMENT_CHANCE) && !tracked.commentedTweets.has(tweetId)) {
          // Only comment on posts with some substance
          if (text.length > 30) {
            await doComment(tweet, niche);
            await humanDelay();
          }
        }

        // --- RETWEET (rare) ---
        if (canDo('retweets') && chance(BEHAVIOR.RETWEET_CHANCE)) {
          await doRetweet(tweet);
          await humanDelay();
        }
      }

      // Scroll down
      scrollBy(randomInt(400, 800));
      state.stats.scrolls++;
      await scrollPause();

      // Occasional longer pause (reading behavior)
      if (chance(20)) {
        await readTime();
      }
    }
  };

  // ============================================
  // CYCLE ORCHESTRATOR
  // ============================================

  const runCycle = async (niche) => {
    state.currentNiche = niche.name;
    state.cycleStartTime = Date.now();
    state.cycleStats = { likes: 0, follows: 0, comments: 0, bookmarks: 0, retweets: 0 };

    log(`\n${'═'.repeat(50)}`, 'info');
    log(`🔄 CYCLE ${state.currentCycle + 1} — Niche: ${niche.name}`, 'info');
    log(`${'═'.repeat(50)}`, 'info');

    // Build a randomized phase sequence for natural behavior.
    // Not every phase runs every cycle — that would be robotic.
    const phases = [];

    // Always search (core training)
    phases.push(() => phaseSearchTop(niche));

    // Usually search latest too
    if (chance(75)) phases.push(() => phaseSearchLatest(niche));

    // Follow people ~60% of cycles
    if (chance(60)) phases.push(() => phaseSearchPeople(niche));

    // Home feed most cycles
    if (chance(80)) phases.push(() => phaseHomeFeed(niche));

    // Influencer visit if configured
    if (niche.influencers?.length > 0 && chance(50)) {
      phases.push(() => phaseInfluencerVisit(niche));
    }

    // Own profile occasionally
    if (chance(40)) phases.push(() => phaseOwnProfile());

    // Explore sometimes
    if (chance(30)) phases.push(() => phaseExplore(niche));

    // Sprinkle idle phases between
    const withIdles = [];
    for (const phase of phases) {
      withIdles.push(phase);
      if (chance(35)) withIdles.push(() => phaseIdle());
    }

    // Execute phases in sequence
    for (const phase of withIdles) {
      if (!state.isRunning || isCycleExpired()) break;
      try {
        await phase();
      } catch (err) {
        log(`Phase error: ${err.message}`, 'error');
        await sleep(3000);
      }
    }

    state.currentCycle++;
    logCycleSummary();
  };

  // ============================================
  // REPORTING
  // ============================================

  const logCycleSummary = () => {
    const cs = state.cycleStats;
    const s = state.stats;
    const elapsed = ((Date.now() - state.cycleStartTime) / 60000).toFixed(1);

    log(`\n📊 CYCLE ${state.currentCycle} SUMMARY (${elapsed} min)`, 'info');
    log(`   ❤️  Likes: ${cs.likes}  |  ➕ Follows: ${cs.follows}  |  💬 Comments: ${cs.comments}`, 'info');
    log(`   🔖 Bookmarks: ${cs.bookmarks}  |  🔁 Retweets: ${cs.retweets}`, 'info');
    log(`\n📈 ALL-TIME TOTALS`, 'info');
    log(`   ❤️  ${s.likes} likes  |  ➕ ${s.follows} follows  |  💬 ${s.comments} comments`, 'info');
    log(`   🔍 ${s.searches} searches  |  👤 ${s.profileVisits} profile visits  |  📜 ${s.scrolls} scrolls`, 'info');
    log(`   📦 Tracked: ${tracked.likedTweets.size} liked, ${tracked.followedUsers.size} followed, ${tracked.commentedTweets.size} commented\n`, 'info');
  };

  // ============================================
  // MAIN LOOP
  // ============================================

  const run = async () => {
    log('🧠 XActions Algorithm Trainer starting...', 'info');
    log(`📋 ${NICHES.topics.length} niche(s) configured`, 'info');
    log(`⚡ Intensity: ${PERSONA.INTENSITY}`, 'info');
    log(`⏱️  Cycle duration: ${BEHAVIOR.CYCLE_DURATION_MINUTES} min`, 'info');
    log(`🛑 Stop with: stopTrainer()\n`, 'info');

    if (NICHES.topics.length === 0) {
      log('❌ No niches configured! Add topics to NICHES.topics[] and re-run.', 'error');
      return;
    }

    while (state.isRunning) {
      // Check max cycles
      if (BEHAVIOR.MAX_CYCLES > 0 && state.currentCycle >= BEHAVIOR.MAX_CYCLES) {
        log(`🏁 Reached max cycles (${BEHAVIOR.MAX_CYCLES}). Stopping.`, 'warning');
        break;
      }

      // Pick a niche for this cycle (rotate through, with some randomness)
      const nicheIndex = state.currentCycle % NICHES.topics.length;
      const niche = chance(20) ? pick(NICHES.topics) : NICHES.topics[nicheIndex];

      await runCycle(niche);

      if (!state.isRunning) break;

      // Break between cycles (human rest period)
      const breakMin = randomInt(BEHAVIOR.BREAK_BETWEEN_CYCLES_MIN, BEHAVIOR.BREAK_BETWEEN_CYCLES_MAX);
      log(`☕ Taking a ${breakMin}-minute break before next cycle...`, 'info');
      
      for (let i = 0; i < breakMin * 60 && state.isRunning; i++) {
        await sleep(1000);
      }
    }

    log('\n🏁 Algorithm Trainer stopped.', 'warning');
    logCycleSummary();
  };

  // ============================================
  // HELPER
  // ============================================
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  // ============================================
  // CONTROL API
  // ============================================

  window.stopTrainer = () => {
    state.isRunning = false;
    log('🛑 Stopping trainer after current action...', 'warning');
  };

  window.trainerStatus = () => {
    log(`\n📡 TRAINER STATUS`, 'info');
    log(`   Running: ${state.isRunning}`, 'info');
    log(`   Cycle: ${state.currentCycle} | Phase: ${state.phase}`, 'info');
    log(`   Niche: ${state.currentNiche || 'N/A'}`, 'info');
    logCycleSummary();
    return state;
  };

  window.trainerReset = () => {
    storage.remove('algo_liked');
    storage.remove('algo_followed');
    storage.remove('algo_commented');
    storage.remove('algo_bookmarked');
    storage.remove('algo_searches');
    log('🧹 All trainer tracking data cleared.', 'warning');
  };

  // ============================================
  // START
  // ============================================
  run();

})();

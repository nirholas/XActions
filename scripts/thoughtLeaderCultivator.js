// XActions - Thought Leader Algorithm Cultivator (Standalone)
// https://github.com/nirholas/XActions
// by nichxbt
//
// STANDALONE VERSION — no dependencies required.
// Paste this directly into DevTools console on x.com
//
// Trains your X/Twitter algorithm to surface content in your target niche.
// Simulates human browsing: search → scroll → like → follow → comment → repeat.
// Designed for fresh accounts to build up algorithmic feed + niche authority.
//
// HOW TO USE:
// 1. Log into x.com on the account you want to train
// 2. Open DevTools (F12), paste this entire script into Console
// 3. Configure YOUR_NICHE, YOUR_PERSONA, and TARGETS below
// 4. Press Enter — the trainer starts automatically
// 5. Leave the tab open and active
//
// STOP: Type stopCultivator() in console
// STATUS: Type cultivatorStatus() in console
// RESET: Type cultivatorReset() in console
//
// ⚠️ Start slow on new accounts. Use 'gentle' mode for the first week.
// ⚠️ Never run on multiple tabs simultaneously.

(() => {
  'use strict';

  // ============================================================
  // 🎯 YOUR NICHE — Edit these to match your target topics
  // ============================================================
  const YOUR_NICHE = {
    // Primary topics the algorithm should learn
    searchTerms: [
      'AI agents',
      'LLM engineering',
      'developer tools',
      'open source AI',
      'machine learning engineering',
      'AI startups',
      'prompt engineering',
      'RAG retrieval augmented generation',
    ],

    // Comments rotated when engaging. Keep them varied and natural.
    // The script picks randomly + adds slight variation.
    comments: [
      '🔥 solid take',
      'this is it',
      'underrated perspective',
      'been thinking about this a lot',
      'great breakdown',
      'saving this for later',
      '💯 agree',
      'this needs more visibility',
      'super insightful',
      'the builders always win',
      'needed to hear this',
      'exactly right',
      'interesting angle',
      'more people need to see this',
      'bookmarking this thread',
      'great thread 🧵',
      'really well said',
      'this is underrated',
    ],

    // Niche influencers to prioritize engaging with (optional)
    // Add their handles WITHOUT the @ symbol
    influencers: [
      // 'karpathy',
      // 'AndrewYNg',
      // 'ylecun',
    ],
  };

  // ============================================================
  // 👤 YOUR PERSONA — How aggressive should the trainer be?
  // ============================================================
  const YOUR_PERSONA = {
    // Your username (auto-detected if empty)
    username: '',

    // 'gentle'  → First week of a new account (mostly browsing)
    // 'normal'  → Daily balanced engagement
    // 'active'  → Building momentum, higher engagement
    // 'grind'   → Maximum growth mode (use with caution)
    mode: 'normal',
  };

  // ============================================================
  // ⚙️ TARGETS — Per-session and daily limits
  // ============================================================
  const TARGETS = {
    // Session duration in minutes before auto-stop
    SESSION_MINUTES: 60,

    // Per-session limits
    MAX_LIKES: 30,
    MAX_FOLLOWS: 15,
    MAX_COMMENTS: 5,
    MAX_BOOKMARKS: 10,
    MAX_RETWEETS: 3,
    MAX_SEARCHES: 8,

    // Daily safety limits (tracked in localStorage)
    DAILY_LIKES: 150,
    DAILY_FOLLOWS: 80,
    DAILY_COMMENTS: 25,
  };

  // Mode presets (override engagement probabilities)
  const MODES = {
    gentle:  { likePct: 15, followPct: 8,  commentPct: 2,  bookmarkPct: 8,  rtPct: 1  },
    normal:  { likePct: 35, followPct: 20, commentPct: 7,  bookmarkPct: 12, rtPct: 4  },
    active:  { likePct: 55, followPct: 35, commentPct: 12, bookmarkPct: 20, rtPct: 8  },
    grind:   { likePct: 70, followPct: 45, commentPct: 18, bookmarkPct: 30, rtPct: 12 },
  };

  const mode = MODES[YOUR_PERSONA.mode] || MODES.normal;

  // ============================================================
  // INTERNALS — Don't edit below unless you know what you're doing
  // ============================================================

  // DOM Selectors (verified Jan 2026)
  const S = {
    tweet:       'article[data-testid="tweet"]',
    tweetText:   '[data-testid="tweetText"]',
    like:        '[data-testid="like"]',
    unlike:      '[data-testid="unlike"]',
    reply:       '[data-testid="reply"]',
    retweet:     '[data-testid="retweet"]',
    rtConfirm:   '[data-testid="retweetConfirm"]',
    bookmark:    '[data-testid="bookmark"]',
    follow:      '[data-testid$="-follow"]',
    unfollow:    '[data-testid$="-unfollow"]',
    userCell:    '[data-testid="UserCell"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    tweetInput:  '[data-testid="tweetTextarea_0"]',
    tweetBtn:    '[data-testid="tweetButton"]',
    confirm:     '[data-testid="confirmationSheetConfirm"]',
    primaryCol:  '[data-testid="primaryColumn"]',
    trend:       '[data-testid="trend"]',
    profileLink: 'a[data-testid="AppTabBar_Profile_Link"]',
  };

  // Utility functions
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const chance = (pct) => Math.random() * 100 < pct;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

  // Human-like delays (Gaussian-ish via multiple randoms)
  const humanDelay = () => sleep(rand(2000, 6000));
  const scrollPause = () => sleep(rand(1500, 4000));
  const readPause = () => sleep(rand(3000, 8000));
  const quickPause = () => sleep(rand(500, 1500));

  // Logging
  const ICONS = { info: 'ℹ️', ok: '✅', warn: '⚠️', err: '❌', act: '🎯' };
  const log = (msg, type = 'info') => {
    const ts = new Date().toLocaleTimeString();
    const icon = ICONS[type] || '•';
    console.log(`${icon} [${ts}] ${msg}`);
  };

  // Storage helpers
  const STORE_PREFIX = 'xc_';
  const store = {
    get: (k) => { try { return JSON.parse(localStorage.getItem(STORE_PREFIX + k)); } catch { return null; } },
    set: (k, v) => localStorage.setItem(STORE_PREFIX + k, JSON.stringify(v)),
    rm: (k) => localStorage.removeItem(STORE_PREFIX + k),
  };

  // Daily rate tracker
  const dailyKey = (action) => `daily_${action}_${new Date().toDateString().replace(/\s/g, '_')}`;
  const getDailyCount = (action) => store.get(dailyKey(action)) || 0;
  const incDaily = (action) => store.set(dailyKey(action), getDailyCount(action) + 1);
  const canDoDaily = (action, limit) => getDailyCount(action) < limit;

  // State
  const state = {
    running: true,
    phase: 'init',
    startTime: Date.now(),
    likes: 0, follows: 0, comments: 0, bookmarks: 0, retweets: 0, searches: 0,
    scrolls: 0, profileVisits: 0,
  };

  // Persistent tracking (across sessions)
  const liked = new Set(store.get('liked') || []);
  const followed = new Set(store.get('followed') || []);
  const commented = new Set(store.get('commented') || []);
  const bookmarked = new Set(store.get('bookmarked') || []);

  const saveSets = () => {
    store.set('liked', [...liked].slice(-2000));
    store.set('followed', [...followed].slice(-2000));
    store.set('commented', [...commented].slice(-500));
    store.set('bookmarked', [...bookmarked].slice(-1000));
  };

  // ============================================================
  // DOM HELPERS
  // ============================================================

  const waitFor = (selector, timeout = 10000) => new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve(el);
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) { clearInterval(interval); resolve(el); }
    }, 200);
    setTimeout(() => { clearInterval(interval); resolve(null); }, timeout);
  });

  const scrollBy = (px) => {
    window.scrollBy({ top: px, behavior: 'smooth' });
    state.scrolls++;
  };

  const clickEl = async (el) => {
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await quickPause();
    el.click();
    return true;
  };

  const getTweetId = (tweet) => {
    const link = tweet.querySelector('a[href*="/status/"]');
    return link?.href?.match(/status\/(\d+)/)?.[1] || null;
  };

  const isAd = (tweet) => {
    return !!tweet.querySelector('[data-testid="placementTracking"]') ||
           tweet.textContent?.includes('Promoted');
  };

  const getMyUsername = () => {
    if (YOUR_PERSONA.username) return YOUR_PERSONA.username.toLowerCase();
    const link = document.querySelector(S.profileLink);
    return link?.getAttribute('href')?.replace('/', '').toLowerCase() || '';
  };

  const isExpired = () => (Date.now() - state.startTime) / 60000 >= TARGETS.SESSION_MINUTES;

  const canLike = () => state.likes < TARGETS.MAX_LIKES && canDoDaily('likes', TARGETS.DAILY_LIKES);
  const canFollow = () => state.follows < TARGETS.MAX_FOLLOWS && canDoDaily('follows', TARGETS.DAILY_FOLLOWS);
  const canComment = () => state.comments < TARGETS.MAX_COMMENTS && canDoDaily('comments', TARGETS.DAILY_COMMENTS);
  const canBookmark = () => state.bookmarks < TARGETS.MAX_BOOKMARKS;
  const canRetweet = () => state.retweets < TARGETS.MAX_RETWEETS;

  // ============================================================
  // NAVIGATION
  // ============================================================

  const nav = async (url) => {
    log(`🧭 → ${url}`, 'act');
    window.location.href = url;
    await sleep(3500);
    await waitFor(S.primaryCol, 15000);
    await sleep(1500);
  };

  const goHome = () => nav('https://x.com/home');
  const goExplore = () => nav('https://x.com/explore');
  const goProfile = (user) => { state.profileVisits++; return nav(`https://x.com/${user}`); };

  const goSearch = async (query, tab = 'top') => {
    const encoded = encodeURIComponent(query);
    const suffix = tab === 'latest' ? '&f=live' : tab === 'people' ? '&f=user' : '';
    await nav(`https://x.com/search?q=${encoded}&src=typed_query${suffix}`);
    state.searches++;
  };

  // ============================================================
  // ACTIONS
  // ============================================================

  const doLike = async (tweet) => {
    const id = getTweetId(tweet);
    if (!id || liked.has(id) || !canLike()) return false;
    const btn = tweet.querySelector(S.like);
    if (!btn) return false;
    await clickEl(btn);
    liked.add(id);
    state.likes++;
    incDaily('likes');
    saveSets();
    log(`❤️ Liked ${id} (${state.likes}/${TARGETS.MAX_LIKES})`, 'ok');
    return true;
  };

  const doBookmark = async (tweet) => {
    const id = getTweetId(tweet);
    if (!id || bookmarked.has(id) || !canBookmark()) return false;
    const btn = tweet.querySelector(S.bookmark);
    if (!btn) return false;
    await clickEl(btn);
    bookmarked.add(id);
    state.bookmarks++;
    saveSets();
    log(`🔖 Bookmarked ${id}`, 'ok');
    return true;
  };

  const doRetweet = async (tweet) => {
    if (!canRetweet()) return false;
    const btn = tweet.querySelector(S.retweet);
    if (!btn) return false;
    await clickEl(btn);
    await sleep(700);
    const confirm = await waitFor(S.rtConfirm, 2000);
    if (confirm) {
      await clickEl(confirm);
      state.retweets++;
      log(`🔁 Retweeted`, 'ok');
      return true;
    }
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return false;
  };

  const doComment = async (tweet) => {
    const id = getTweetId(tweet);
    if (!id || commented.has(id) || !canComment()) return false;

    // Only comment on substantial posts
    const text = tweet.querySelector(S.tweetText)?.textContent || '';
    if (text.length < 30) return false;

    const replyBtn = tweet.querySelector(S.reply);
    if (!replyBtn) return false;
    await clickEl(replyBtn);
    await sleep(1500);

    const input = await waitFor(S.tweetInput, 5000);
    if (!input) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    }

    // Pick a comment and add slight variation
    let comment = pick(YOUR_NICHE.comments);
    // 30% chance to add a period or extra emoji
    if (chance(30)) comment += pick(['.', '!', ' 👀', ' 🙌', ' 💪', '']);

    input.focus();
    await sleep(300);
    document.execCommand('insertText', false, comment);
    await sleep(800);

    const postBtn = await waitFor(S.tweetBtn, 3000);
    if (!postBtn || postBtn.disabled || postBtn.getAttribute('aria-disabled') === 'true') {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return false;
    }

    await clickEl(postBtn);
    await sleep(1200);

    commented.add(id);
    state.comments++;
    incDaily('comments');
    saveSets();
    log(`💬 Commented "${comment}" on ${id} (${state.comments}/${TARGETS.MAX_COMMENTS})`, 'ok');
    return true;
  };

  const doFollowFromCell = async (cell) => {
    if (!canFollow()) return false;

    const link = cell.querySelector('a[href^="/"]');
    const username = link?.getAttribute('href')?.replace('/', '').toLowerCase();
    if (!username || followed.has(username)) return false;
    if (username === getMyUsername()) return false;

    // Already following?
    if (cell.querySelector(S.unfollow)) return false;

    // Must have a bio
    const bio = cell.querySelector('[data-testid="UserDescription"]')?.textContent || '';
    if (!bio.trim()) return false;

    const followBtn = cell.querySelector(S.follow);
    if (!followBtn) return false;

    await clickEl(followBtn);
    followed.add(username);
    state.follows++;
    incDaily('follows');
    saveSets();
    log(`➕ Followed @${username} (${state.follows}/${TARGETS.MAX_FOLLOWS})`, 'ok');
    return true;
  };

  // ============================================================
  // SCROLL & ENGAGE ENGINE
  // ============================================================

  const scrollAndEngage = async ({ maxScrolls = 10, boostEngagement = false } = {}) => {
    const seen = new Set();
    const engageMult = boostEngagement ? 1.8 : 1.0;

    for (let s = 0; s < maxScrolls && state.running && !isExpired(); s++) {
      const tweets = document.querySelectorAll(S.tweet);

      for (const tweet of tweets) {
        if (!state.running || isExpired()) break;

        const id = getTweetId(tweet);
        if (!id || seen.has(id)) continue;
        seen.add(id);

        if (isAd(tweet)) continue;

        // Simulate reading — scroll tweet into view and pause
        tweet.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await readPause();

        // Probabilistic engagement
        if (canLike() && chance(mode.likePct * engageMult)) {
          await doLike(tweet);
          await humanDelay();
        }

        if (canBookmark() && chance(mode.bookmarkPct * engageMult)) {
          await doBookmark(tweet);
          await humanDelay();
        }

        if (canComment() && chance(mode.commentPct * engageMult)) {
          await doComment(tweet);
          await humanDelay();
        }

        if (canRetweet() && chance(mode.rtPct * engageMult)) {
          await doRetweet(tweet);
          await humanDelay();
        }
      }

      // Scroll down
      scrollBy(rand(400, 800));
      await scrollPause();

      // Occasional longer pause (real reading behavior)
      if (chance(20)) await readPause();
    }
  };

  // ============================================================
  // TRAINING PHASES
  // ============================================================

  // Phase: Search top results for a niche term
  const phaseSearchTop = async () => {
    const term = pick(YOUR_NICHE.searchTerms);
    log(`🔍 Search (Top): "${term}"`, 'act');
    state.phase = `search-top: ${term}`;
    await goSearch(term, 'top');
    await scrollAndEngage({ maxScrolls: rand(8, 15) });
  };

  // Phase: Search latest/most recent results
  const phaseSearchLatest = async () => {
    const term = pick(YOUR_NICHE.searchTerms);
    log(`🕐 Search (Latest): "${term}"`, 'act');
    state.phase = `search-latest: ${term}`;
    await goSearch(term, 'latest');
    await scrollAndEngage({ maxScrolls: rand(6, 12) });
  };

  // Phase: Search people and follow qualifying accounts
  const phaseSearchPeople = async () => {
    const term = pick(YOUR_NICHE.searchTerms);
    log(`👥 Search People: "${term}"`, 'act');
    state.phase = `search-people: ${term}`;
    await goSearch(term, 'people');
    await sleep(2000);

    for (let i = 0; i < rand(5, 10) && state.running && !isExpired(); i++) {
      const cells = document.querySelectorAll(S.userCell);
      for (const cell of cells) {
        if (!canFollow()) break;
        if (chance(mode.followPct)) {
          await doFollowFromCell(cell);
          await humanDelay();
        }
      }
      scrollBy(rand(400, 700));
      await scrollPause();
    }
  };

  // Phase: Scroll home feed (reinforces algorithm training)
  const phaseHomeFeed = async () => {
    log('🏠 Home Feed', 'act');
    state.phase = 'home-feed';
    await goHome();
    await scrollAndEngage({ maxScrolls: rand(10, 20) });
  };

  // Phase: Visit an influencer's profile and engage heavily
  const phaseInfluencer = async () => {
    if (!YOUR_NICHE.influencers?.length) return;
    const user = pick(YOUR_NICHE.influencers);
    log(`⭐ Influencer: @${user}`, 'act');
    state.phase = `influencer: @${user}`;
    await goProfile(user);
    await scrollAndEngage({ maxScrolls: rand(5, 10), boostEngagement: true });
  };

  // Phase: Visit own profile (active user signal)
  const phaseOwnProfile = async () => {
    const me = getMyUsername();
    if (!me) return;
    log('👤 Own Profile', 'act');
    state.phase = 'own-profile';
    await goProfile(me);
    for (let i = 0; i < rand(3, 5); i++) {
      scrollBy(rand(300, 600));
      await scrollPause();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    await readPause();
  };

  // Phase: Browse explore/trending
  const phaseExplore = async () => {
    log('🌍 Explore', 'act');
    state.phase = 'explore';
    await goExplore();
    await sleep(2000);

    const trends = document.querySelectorAll(S.trend);
    if (trends.length > 0) {
      const trend = pick([...trends]);
      await clickEl(trend);
      await sleep(2000);
      await scrollAndEngage({ maxScrolls: rand(4, 8) });
    } else {
      for (let i = 0; i < rand(3, 6); i++) {
        scrollBy(rand(400, 700));
        await scrollPause();
      }
    }
  };

  // Phase: Idle dwell (humans do this — just sits)
  const phaseIdle = async () => {
    const secs = rand(15, 45);
    log(`😴 Idle ${secs}s`, 'info');
    state.phase = 'idle';
    await sleep(secs * 1000);
  };

  // ============================================================
  // MAIN SESSION RUNNER
  // ============================================================

  const run = async () => {
    log('', 'info');
    log('══════════════════════════════════════════════════', 'info');
    log('🧠 THOUGHT LEADER CULTIVATOR — Starting', 'info');
    log(`📋 Niche: ${YOUR_NICHE.searchTerms.length} search terms`, 'info');
    log(`⚡ Mode: ${YOUR_PERSONA.mode}`, 'info');
    log(`⏱️  Session: ${TARGETS.SESSION_MINUTES} min`, 'info');
    log(`🛑 Stop: stopCultivator()`, 'info');
    log('══════════════════════════════════════════════════', 'info');
    log('', 'info');

    // Build randomized phase sequence
    while (state.running && !isExpired()) {
      // Core: always do at least one search
      const phases = [phaseSearchTop];

      // Randomize the rest
      if (chance(75)) phases.push(phaseSearchLatest);
      if (chance(60)) phases.push(phaseSearchPeople);
      if (chance(80)) phases.push(phaseHomeFeed);
      if (YOUR_NICHE.influencers?.length && chance(50)) phases.push(phaseInfluencer);
      if (chance(40)) phases.push(phaseOwnProfile);
      if (chance(30)) phases.push(phaseExplore);

      // Add idle breaks between phases
      const withIdles = [];
      for (const phase of shuffle(phases)) {
        withIdles.push(phase);
        if (chance(35)) withIdles.push(phaseIdle);
      }

      // Execute
      for (const phase of withIdles) {
        if (!state.running || isExpired()) break;
        try {
          await phase();
        } catch (e) {
          log(`Phase error: ${e.message}`, 'err');
          await sleep(3000);
        }
      }

      // After a full rotation, take a brief break
      if (state.running && !isExpired()) {
        const breakMin = rand(2, 8);
        log(`☕ Break: ${breakMin} min`, 'info');
        await sleep(breakMin * 60000);
      }
    }

    // Session complete
    log('', 'info');
    log('══════════════════════════════════════════════════', 'info');
    log('🏁 SESSION COMPLETE', 'info');
    printStats();
    log('══════════════════════════════════════════════════', 'info');
  };

  // ============================================================
  // REPORTING
  // ============================================================

  const printStats = () => {
    const elapsed = ((Date.now() - state.startTime) / 60000).toFixed(1);
    log(`⏱️  Duration: ${elapsed} min`, 'info');
    log(`❤️  Likes: ${state.likes}  |  ➕ Follows: ${state.follows}  |  💬 Comments: ${state.comments}`, 'info');
    log(`🔖 Bookmarks: ${state.bookmarks}  |  🔁 Retweets: ${state.retweets}`, 'info');
    log(`🔍 Searches: ${state.searches}  |  👤 Profile visits: ${state.profileVisits}  |  📜 Scrolls: ${state.scrolls}`, 'info');
    log(`📦 All-time: ${liked.size} liked, ${followed.size} followed, ${commented.size} commented`, 'info');
  };

  // ============================================================
  // CONTROL API
  // ============================================================

  window.stopCultivator = () => {
    state.running = false;
    log('🛑 Stopping after current action...', 'warn');
  };

  window.cultivatorStatus = () => {
    log(`📡 Running: ${state.running} | Phase: ${state.phase}`, 'info');
    printStats();
    return state;
  };

  window.cultivatorReset = () => {
    ['liked', 'followed', 'commented', 'bookmarked'].forEach(k => store.rm(k));
    log('🧹 All tracking data cleared', 'warn');
  };

  // ============================================================
  // START
  // ============================================================
  run();

})();

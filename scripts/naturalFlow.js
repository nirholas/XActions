// scripts/naturalFlow.js
// Simulates a natural X/Twitter browsing session:
//   → scroll home timeline, like keyword-matched posts
//   → occasionally reply to a few
//   → follow some interesting authors
//   → visit your own profile, scroll your posts
//   → check notifications
//   → come back to timeline
//
// Paste in DevTools console on x.com/home
// by nichxbt

(() => {
  'use strict';

  // =============================================
  // ⬇️ CONFIGURE YOUR SESSION
  // =============================================
  const CONFIG = {
    // — Keywords: only engage with posts containing these (empty = engage with all)
    keywords: ['crypto', 'bitcoin', 'web3', 'defi', 'nft'],

    // — Timeline browsing
    timeline: {
      scrolls: 12,            // Number of scroll cycles on home feed
      maxLikes: 15,            // Max posts to like on home timeline
      likeChance: 0.6,         // 60% chance of liking a keyword match
    },

    // — Replies
    replies: {
      enabled: true,
      max: 3,                  // Reply to at most 3 posts per session
      chance: 0.15,            // 15% chance of replying to a liked post
      templates: [
        '🔥 This is solid',
        'Really interesting take on this',
        'Great thread, appreciate the insight 🙏',
        'Couldn\'t agree more — this needed to be said',
        '📌 Saving this one. Great breakdown.',
        'Bullish on this perspective 💯',
      ],
    },

    // — Follow users
    follows: {
      enabled: true,
      max: 4,                  // Max new follows per session
      chance: 0.2,             // 20% chance of following an author you liked
      minFollowers: 100,       // Only follow accounts with this many+ followers
    },

    // — Self-profile visit
    selfProfile: {
      enabled: true,
      username: '',            // Your @handle (auto-detected if blank)
      scrolls: 4,             // How far to scroll your own profile
    },

    // — Notifications check
    notifications: {
      enabled: true,
      pauseSeconds: 8,         // How long to "read" notifications
    },

    // — Safety
    dryRun: true,              // ⚠️ Set false to actually click things
    skipKeywords: ['promoted', 'ad', 'giveaway', 'sponsor'],

    // — Timing (human-like)
    delays: {
      betweenActions: [3000, 7000],     // 3-7s between likes/follows
      betweenPhases: [8000, 15000],     // 8-15s between phases (timeline → profile, etc.)
      readingPause: [2000, 6000],       // Time spent "reading" a tweet
      scrollPause: [1500, 3000],        // Pause after scrolling
      replyTyping: [3000, 6000],        // Simulated typing time
    },
  };

  // =============================================
  // INTERNALS
  // =============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => Math.floor(a + Math.random() * (b - a));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (pct) => Math.random() < pct;
  const delay = (key) => sleep(rand(...CONFIG.delays[key]));

  const SEL = {
    tweet:       'article[data-testid="tweet"]',
    tweetText:   '[data-testid="tweetText"]',
    likeBtn:     '[data-testid="like"]',
    unlikeBtn:   '[data-testid="unlike"]',
    replyBtn:    '[data-testid="reply"]',
    tweetBox:    '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    followBtn:   '[data-testid$="-follow"]',
    unfollowBtn: '[data-testid$="-unfollow"]',
    toast:       '[data-testid="toast"]',
    userCell:    '[data-testid="UserCell"]',
    notification:'[data-testid="notification"]',
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  let aborted = false;
  window.XActions = window.XActions || {};
  window.XActions.stop = () => { aborted = true; console.log('🛑 Stopping after current action...'); };

  const stats = { liked: 0, replied: 0, followed: 0, scrolled: 0, skipped: 0 };
  const log = [];
  const seen = new Set();

  const isRateLimited = () => {
    for (const el of document.querySelectorAll(`${SEL.toast}, [role="alert"]`)) {
      if (/rate limit|try again|too many|slow down/i.test(el.textContent)) return true;
    }
    return false;
  };

  const checkRateLimit = async () => {
    if (isRateLimited()) {
      console.log('   🚨 Rate limited — pausing 120s...');
      await sleep(120000);
      return isRateLimited(); // still limited?
    }
    return false;
  };

  const matchesKeywords = (text) => {
    if (CONFIG.keywords.length === 0) return true;
    const lower = text.toLowerCase();
    return CONFIG.keywords.some(kw => lower.includes(kw.toLowerCase()));
  };

  const shouldSkip = (text) => {
    const lower = text.toLowerCase();
    return CONFIG.skipKeywords.some(kw => lower.includes(kw.toLowerCase()));
  };

  const getAuthor = (article) => {
    const link = article.querySelector('a[href^="/"][role="link"]');
    if (!link) return null;
    const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
    if (!match) return null;
    const name = match[1];
    if (['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings'].includes(name)) return null;
    return name;
  };

  const getMyUsername = () => {
    if (CONFIG.selfProfile.username) return CONFIG.selfProfile.username;
    // Try to auto-detect from the nav sidebar
    const navLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    if (navLink) {
      const match = navLink.getAttribute('href')?.match(/^\/([A-Za-z0-9_]+)/);
      if (match) return match[1];
    }
    return null;
  };

  // =============================================
  // ACTIONS
  // =============================================

  const doLike = async (article, text) => {
    const btn = $(SEL.likeBtn, article);
    if (!btn) return false;
    if ($(SEL.unlikeBtn, article)) return false; // already liked

    article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await delay('readingPause'); // "read" the tweet first

    if (CONFIG.dryRun) {
      console.log(`   ❤️ [DRY] Like: "${text.slice(0, 55)}..."`);
    } else {
      btn.click();
      await sleep(400);
    }
    stats.liked++;
    return true;
  };

  const doReply = async (article, author) => {
    const replyBtn = $(SEL.replyBtn, article);
    if (!replyBtn) return false;

    const replyText = pick(CONFIG.replies.templates);

    if (CONFIG.dryRun) {
      console.log(`   💬 [DRY] Reply to @${author}: "${replyText}"`);
      stats.replied++;
      return true;
    }

    replyBtn.click();
    await sleep(1500);

    const tweetBox = $(SEL.tweetBox);
    if (!tweetBox) { console.log('   ⚠️ Reply box not found'); return false; }

    tweetBox.focus();
    await delay('replyTyping'); // simulate typing
    document.execCommand('insertText', false, replyText);
    await sleep(800);

    const sendBtn = $(SEL.tweetButton);
    if (!sendBtn) { console.log('   ⚠️ Send button not found'); return false; }

    sendBtn.click();
    await sleep(2000);
    stats.replied++;
    return true;
  };

  const doFollow = async (author) => {
    // Navigate to a profile hover card isn't reliable — we track authors
    // and follow them via the UserCell if visible, or via the profile page later
    // For timeline, we look for follow buttons near the author's tweet
    // This is a best-effort approach
    if (CONFIG.dryRun) {
      console.log(`   ➕ [DRY] Follow @${author}`);
      stats.followed++;
      return true;
    }

    // Open the author's profile in the same tab, click follow, then go back
    const currentUrl = window.location.href;
    console.log(`   ➕ Visiting @${author} to follow...`);
    window.location.href = `https://x.com/${author}`;

    // Wait for profile to load
    let loaded = false;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const followBtn = document.querySelector('[data-testid$="-follow"]:not([data-testid$="-unfollow"])');
      if (followBtn) { loaded = true; break; }
      // Check if already following
      if (document.querySelector('[data-testid$="-unfollow"]')) {
        console.log(`   ℹ️ Already following @${author}`);
        window.location.href = currentUrl;
        await sleep(3000);
        return false;
      }
    }

    if (loaded) {
      const followBtn = document.querySelector('[data-testid$="-follow"]:not([data-testid$="-unfollow"])');
      if (followBtn) {
        followBtn.click();
        await sleep(1000);
        stats.followed++;
        console.log(`   ✅ Followed @${author}`);
      }
    }

    // Go back to where we were
    await sleep(rand(2000, 4000));
    window.history.back();
    await sleep(3000);
    return true;
  };

  // =============================================
  // PHASES — each mimics a stage of natural browsing
  // =============================================

  // ── Phase 1: Scroll home timeline, like + engage ───────────
  const phaseTimeline = async () => {
    console.log('\n📱 PHASE 1 — Scrolling home timeline...');
    console.log(`   Keywords: ${CONFIG.keywords.length ? CONFIG.keywords.join(', ') : 'everything'}`);

    const authorsToFollow = [];

    for (let scroll = 0; scroll < CONFIG.timeline.scrolls && !aborted; scroll++) {
      const articles = document.querySelectorAll(SEL.tweet);

      for (const article of articles) {
        if (aborted) break;
        if (stats.liked >= CONFIG.timeline.maxLikes) break;
        if (await checkRateLimit()) { aborted = true; break; }

        const textEl = $(SEL.tweetText, article);
        const text = textEl ? textEl.textContent.trim() : '';
        const link = article.querySelector('a[href*="/status/"]')?.href || '';
        const id = link || text.slice(0, 80);
        if (!id || seen.has(id)) continue;
        seen.add(id);

        if (shouldSkip(text)) { stats.skipped++; continue; }
        if (!matchesKeywords(text)) { stats.skipped++; continue; }

        const author = getAuthor(article);

        // --- Like ---
        if (chance(CONFIG.timeline.likeChance)) {
          const liked = await doLike(article, text);
          if (liked) {
            log.push({ action: 'like', author, text: text.slice(0, 100), ts: Date.now() });
            await delay('betweenActions');

            // --- Maybe reply ---
            if (CONFIG.replies.enabled && stats.replied < CONFIG.replies.max && chance(CONFIG.replies.chance)) {
              await doReply(article, author);
              log.push({ action: 'reply', author, ts: Date.now() });
              await delay('betweenActions');
            }

            // --- Queue follow ---
            if (CONFIG.follows.enabled && author && stats.followed < CONFIG.follows.max && chance(CONFIG.follows.chance)) {
              if (!authorsToFollow.includes(author)) authorsToFollow.push(author);
            }
          }
        } else {
          // Just "scroll past" — simulate reading
          article.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(rand(500, 1500));
        }
      }

      if (stats.liked >= CONFIG.timeline.maxLikes) break;

      // Natural scroll
      window.scrollBy(0, rand(600, 1200));
      stats.scrolled++;
      console.log(`   📜 Scroll ${scroll + 1}/${CONFIG.timeline.scrolls} — ${stats.liked} liked, ${stats.skipped} skipped`);
      await delay('scrollPause');
    }

    console.log(`   ✅ Timeline done: ${stats.liked} liked, ${stats.replied} replied`);

    // --- Follow queued authors ---
    if (authorsToFollow.length > 0 && !aborted) {
      console.log(`\n   👥 Following ${authorsToFollow.length} interesting accounts...`);
      for (const author of authorsToFollow.slice(0, CONFIG.follows.max - stats.followed)) {
        if (aborted) break;
        await doFollow(author);
        log.push({ action: 'follow', author, ts: Date.now() });
        await delay('betweenActions');
      }
    }
  };

  // ── Phase 2: Visit own profile, scroll ─────────────────────
  const phaseSelfProfile = async () => {
    if (!CONFIG.selfProfile.enabled) return;

    const username = getMyUsername();
    if (!username) {
      console.log('\n👤 PHASE 2 — Skipping self-profile (couldn\'t detect username)');
      console.log('   Tip: set CONFIG.selfProfile.username manually');
      return;
    }

    console.log(`\n👤 PHASE 2 — Visiting your profile (@${username})...`);

    if (!CONFIG.dryRun) {
      window.location.href = `https://x.com/${username}`;
      // Wait for page load
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        if (document.querySelectorAll(SEL.tweet).length > 0) break;
      }
      await sleep(2000);
    } else {
      console.log(`   🏃 [DRY] Would navigate to x.com/${username}`);
    }

    // Scroll own posts
    for (let i = 0; i < CONFIG.selfProfile.scrolls; i++) {
      if (CONFIG.dryRun) {
        console.log(`   📜 [DRY] Scroll own profile ${i + 1}/${CONFIG.selfProfile.scrolls}`);
      } else {
        window.scrollBy(0, rand(400, 900));
      }
      await delay('scrollPause');
      // Just browsing, no actions on own posts
    }

    console.log(`   ✅ Scrolled own profile (${CONFIG.selfProfile.scrolls} scrolls)`);
    log.push({ action: 'self_profile', username, ts: Date.now() });
  };

  // ── Phase 3: Check notifications ───────────────────────────
  const phaseNotifications = async () => {
    if (!CONFIG.notifications.enabled) return;

    console.log('\n🔔 PHASE 3 — Checking notifications...');

    if (!CONFIG.dryRun) {
      window.location.href = 'https://x.com/notifications';
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        if (document.querySelector(SEL.notification) || window.location.pathname.includes('notifications')) break;
      }
      await sleep(2000);
    } else {
      console.log(`   🏃 [DRY] Would navigate to notifications`);
    }

    // Just "read" — no automated actions on notifications
    console.log(`   👀 Reading notifications for ${CONFIG.notifications.pauseSeconds}s...`);
    await sleep(CONFIG.notifications.pauseSeconds * 1000);

    // Scroll a bit
    for (let i = 0; i < 3; i++) {
      if (!CONFIG.dryRun) window.scrollBy(0, rand(300, 600));
      await sleep(rand(1000, 2000));
    }

    console.log('   ✅ Notifications checked');
    log.push({ action: 'notifications', ts: Date.now() });
  };

  // ── Phase 4: Return to timeline ────────────────────────────
  const phaseReturnHome = async () => {
    console.log('\n🏠 PHASE 4 — Returning to home timeline...');
    if (!CONFIG.dryRun) {
      window.location.href = 'https://x.com/home';
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        if (document.querySelectorAll(SEL.tweet).length > 0) break;
      }
      await sleep(2000);
    } else {
      console.log('   🏃 [DRY] Would navigate to home');
    }

    // Brief final scroll
    for (let i = 0; i < 3; i++) {
      if (!CONFIG.dryRun) window.scrollBy(0, rand(400, 800));
      await sleep(rand(1500, 3000));
    }

    console.log('   ✅ Back on home timeline');
  };

  // =============================================
  // MAIN RUNNER
  // =============================================
  const run = async () => {
    const W = 52;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🌊 NATURAL FLOW — Human-Like Session        ║');
    console.log('║  by nichxbt — XActions                        ║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('\n🏃 DRY RUN — nothing will be clicked. Set dryRun: false for live mode.');
    } else {
      console.log('\n⚠️ LIVE MODE — will click, like, reply, follow for real!');
    }
    console.log(`   Keywords: ${CONFIG.keywords.length ? CONFIG.keywords.join(', ') : 'all posts'}`);
    console.log(`   Plan: ${CONFIG.timeline.maxLikes} likes, ${CONFIG.replies.max} replies, ${CONFIG.follows.max} follows`);
    console.log(`   ℹ️ XActions.stop() to abort at any time`);
    console.log('');

    const startTime = Date.now();

    // ── Execute phases ──
    try {
      // Phase 1: Home timeline engagement
      await phaseTimeline();
      if (aborted) throw 'aborted';

      await delay('betweenPhases');

      // Phase 2: Visit own profile
      await phaseSelfProfile();
      if (aborted) throw 'aborted';

      await delay('betweenPhases');

      // Phase 3: Check notifications
      await phaseNotifications();
      if (aborted) throw 'aborted';

      await delay('betweenPhases');

      // Phase 4: Return to timeline
      await phaseReturnHome();
    } catch (e) {
      if (e !== 'aborted') console.error('❌ Error:', e);
    }

    // ── Session summary ──
    const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
    console.log('\n' + '━'.repeat(52));
    console.log('  🌊 NATURAL FLOW — SESSION SUMMARY');
    console.log('━'.repeat(52));
    console.log(`  ❤️  Liked:      ${stats.liked}`);
    console.log(`  💬  Replied:    ${stats.replied}`);
    console.log(`  ➕  Followed:   ${stats.followed}`);
    console.log(`  📜  Scrolls:    ${stats.scrolled}`);
    console.log(`  ⏭️  Skipped:    ${stats.skipped}`);
    console.log(`  ⏱️  Duration:   ${elapsed} min`);
    if (CONFIG.dryRun) console.log('  🏃  (Dry run — no real actions taken)');
    console.log('━'.repeat(52));

    const uniqueAuthors = new Set(log.filter(l => l.author).map(l => l.author));
    console.log(`  Engaged with ${uniqueAuthors.size} unique accounts\n`);

    // Export log
    if (log.length > 0) {
      try {
        const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `xactions-natural-flow-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        console.log('📥 Session log exported.\n');
      } catch {}
    }
  };

  // ── IMPORTANT: Navigation kills script context ──
  // For phases that navigate (self-profile, notifications, return home),
  // in LIVE mode the script will stop after the first navigation.
  // Two options:
  //   A) Use dryRun: true to preview the full flow safely
  //   B) For live mode, only enable the timeline phase (disable selfProfile
  //      & notifications) OR re-paste the script on each page
  //
  // For a fully automated multi-page flow, use the sessionStorage-based
  // resume approach (see scripts/multiAccountTimelineLiker.js for the pattern).

  // ── Resume support for multi-page live mode ──
  const STATE_KEY = 'xactions_natural_flow';

  const getState = () => {
    try { return JSON.parse(sessionStorage.getItem(STATE_KEY)); } catch { return null; }
  };
  const setState = (s) => sessionStorage.setItem(STATE_KEY, JSON.stringify(s));
  const clearState = () => sessionStorage.removeItem(STATE_KEY);

  const runWithResume = async () => {
    let state = getState() || { phase: 1, stats: { liked: 0, replied: 0, followed: 0, scrolled: 0, skipped: 0 }, log: [] };

    // Restore stats from previous phases
    Object.assign(stats, state.stats);
    log.push(...state.log);

    const W = 52;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🌊 NATURAL FLOW — Human-Like Session        ║');
    console.log('║  by nichxbt — XActions                        ║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('\n🏃 DRY RUN — previewing the full session.');
      // In dry-run, just run everything sequentially (no navigation)
      await run();
      clearState();
      return;
    }

    console.log(`\n⚠️ LIVE MODE — Phase ${state.phase}/4`);
    console.log(`   ℹ️ XActions.stop() to abort\n`);

    const startTime = Date.now();

    try {
      if (state.phase === 1) {
        // Make sure we're on home
        if (!window.location.pathname.includes('/home') && window.location.pathname !== '/') {
          window.location.href = 'https://x.com/home';
          return;
        }
        console.log('\n📱 PHASE 1 — Home timeline engagement');
        await phaseTimeline();
        state.phase = 2;
        state.stats = { ...stats };
        state.log = [...log];
        setState(state);

        if (!aborted && CONFIG.selfProfile.enabled) {
          const username = getMyUsername();
          if (username) {
            console.log(`\n   ➡️ Next: visiting your profile. Re-paste after page loads.`);
            await sleep(rand(5000, 10000));
            window.location.href = `https://x.com/${username}`;
            return; // script dies here — re-paste to continue
          }
        }
        state.phase = 3; // skip self-profile
        setState(state);
      }

      if (state.phase === 2) {
        console.log('\n👤 PHASE 2 — Browsing own profile');
        // We should already be on our profile
        for (let i = 0; i < CONFIG.selfProfile.scrolls; i++) {
          window.scrollBy(0, rand(400, 900));
          await delay('scrollPause');
        }
        console.log(`   ✅ Scrolled own profile`);
        log.push({ action: 'self_profile', ts: Date.now() });

        state.phase = 3;
        state.stats = { ...stats };
        state.log = [...log];
        setState(state);

        if (!aborted && CONFIG.notifications.enabled) {
          console.log(`\n   ➡️ Next: notifications. Re-paste after page loads.`);
          await sleep(rand(5000, 10000));
          window.location.href = 'https://x.com/notifications';
          return;
        }
        state.phase = 4;
        setState(state);
      }

      if (state.phase === 3) {
        console.log('\n🔔 PHASE 3 — Checking notifications');
        await sleep(CONFIG.notifications.pauseSeconds * 1000);
        for (let i = 0; i < 3; i++) {
          window.scrollBy(0, rand(300, 600));
          await sleep(rand(1000, 2000));
        }
        console.log('   ✅ Notifications checked');
        log.push({ action: 'notifications', ts: Date.now() });

        state.phase = 4;
        state.stats = { ...stats };
        state.log = [...log];
        setState(state);

        console.log(`\n   ➡️ Heading back home. Re-paste after page loads.`);
        await sleep(rand(3000, 6000));
        window.location.href = 'https://x.com/home';
        return;
      }

      if (state.phase === 4) {
        console.log('\n🏠 PHASE 4 — Back on home timeline');
        for (let i = 0; i < 3; i++) {
          window.scrollBy(0, rand(400, 800));
          await sleep(rand(1500, 3000));
        }
        console.log('   ✅ Final browse complete');
      }
    } catch (e) {
      if (e !== 'aborted') console.error('❌ Error:', e);
    }

    // ── Final summary ──
    const elapsed = ((Date.now() - startTime) / 60000).toFixed(1);
    console.log('\n' + '━'.repeat(52));
    console.log('  🌊 NATURAL FLOW — SESSION COMPLETE');
    console.log('━'.repeat(52));
    console.log(`  ❤️  Liked:      ${stats.liked}`);
    console.log(`  💬  Replied:    ${stats.replied}`);
    console.log(`  ➕  Followed:   ${stats.followed}`);
    console.log(`  📜  Scrolls:    ${stats.scrolled}`);
    console.log(`  ⏭️  Skipped:    ${stats.skipped}`);
    console.log(`  ⏱️  Duration:   ${elapsed} min (this phase)`);
    console.log('━'.repeat(52));

    const uniqueAuthors = new Set(log.filter(l => l.author).map(l => l.author));
    console.log(`  Engaged with ${uniqueAuthors.size} unique accounts\n`);

    // Export
    if (log.length > 0) {
      try {
        const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `xactions-natural-flow-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        console.log('📥 Session log exported.\n');
      } catch {}
    }

    clearState();
    console.log('🎉 Natural session complete! Clear sessionStorage to reset.\n');
  };

  runWithResume();
})();

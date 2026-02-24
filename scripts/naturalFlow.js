// scripts/naturalFlow.js
// Simulates a natural X/Twitter browsing session:
//   → scroll home timeline, like keyword-matched posts
//   → occasionally reply, retweet, or bookmark
//   → follow interesting authors (checks bio + followers first)
//   → visit your own profile, scroll your posts
//   → check notifications
//   → come back to timeline
//
// Features: interactive setup, live floating HUD, context-aware replies,
//           engagement scoring, cooldown escalation, session history
//
// Paste in DevTools console on x.com/home
// by nichxbt

(() => {
  'use strict';

  // =============================================
  // SELECTORS
  // =============================================
  const SEL = {
    tweet:        'article[data-testid="tweet"]',
    tweetText:    '[data-testid="tweetText"]',
    likeBtn:      '[data-testid="like"]',
    unlikeBtn:    '[data-testid="unlike"]',
    replyBtn:     '[data-testid="reply"]',
    retweetBtn:   '[data-testid="retweet"]',
    retweetConf:  '[data-testid="retweetConfirm"]',
    bookmarkBtn:  '[data-testid="bookmark"]',
    removeBookmark:'[data-testid="removeBookmark"]',
    shareBtn:     '[data-testid="share"]',
    tweetBox:     '[data-testid="tweetTextarea_0"]',
    tweetButton:  '[data-testid="tweetButton"]',
    followBtn:    '[data-testid$="-follow"]',
    unfollowBtn:  '[data-testid$="-unfollow"]',
    toast:        '[data-testid="toast"]',
    userCell:     '[data-testid="UserCell"]',
    notification: '[data-testid="notification"]',
    profileNav:   'a[data-testid="AppTabBar_Profile_Link"]',
  };

  // =============================================
  // UTILITIES
  // =============================================
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => Math.floor(a + Math.random() * (b - a));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const roll = (pct) => Math.random() < pct;
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const parseEngagement = (article) => {
    let total = 0;
    for (const btn of article.querySelectorAll('[role="button"]')) {
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      const match = label.match(/([\d,]+)\s*(like|repost|repl|view|bookmark)/);
      if (match) {
        const n = parseInt(match[1].replace(/,/g, '')) || 0;
        if (label.includes('like') || label.includes('repost') || label.includes('repl')) total += n;
      }
    }
    return total;
  };

  // =============================================
  // INTERACTIVE SETUP
  // =============================================
  const setupInteractive = () => {
    const saved = getState();
    if (saved && saved.config) {
      console.log(`🔄 Resuming session (Phase ${saved.phase}/4)...`);
      return saved.config;
    }

    const presetChoice = prompt(
      '🌊 NATURAL FLOW — Choose a mode:\n\n' +
      '  1  👀 Lurker    — mostly scroll, like a few, no replies\n' +
      '  2  🤝 Friendly  — like + occasional reply, 1-2 follows\n' +
      '  3  🚀 Growth    — max engagement, replies + follows + retweets\n' +
      '  4  ⚙️  Custom    — set everything manually\n' +
      '  5  🏃 Dry Run   — preview the full session (safe)\n\n' +
      'Enter 1-5:',
      '2'
    );

    if (!presetChoice) return null;

    const presets = {
      '1': { maxLikes: 8,  replyMax: 0, followMax: 0, retweetMax: 0, bookmarkMax: 2, likeChance: 0.4 },
      '2': { maxLikes: 15, replyMax: 3, followMax: 2, retweetMax: 1, bookmarkMax: 3, likeChance: 0.6 },
      '3': { maxLikes: 25, replyMax: 5, followMax: 4, retweetMax: 3, bookmarkMax: 5, likeChance: 0.75 },
    };

    let dryRun = presetChoice.trim() === '5';
    let preset = presets[presetChoice.trim()] || presets['2'];

    if (presetChoice.trim() === '4') {
      const maxLikes = parseInt(prompt('Max likes per session:', '15')) || 15;
      const replyMax = parseInt(prompt('Max replies:', '3')) || 3;
      const followMax = parseInt(prompt('Max follows:', '2')) || 2;
      const retweetMax = parseInt(prompt('Max retweets:', '2')) || 2;
      preset = { maxLikes: clamp(maxLikes, 1, 50), replyMax, followMax, retweetMax, bookmarkMax: 3, likeChance: 0.6 };
      dryRun = confirm('Enable dry run? (OK = safe preview, Cancel = live mode)');
    }

    const kwInput = prompt(
      '🔍 Keywords to engage with (comma-separated):\n\n' +
      'Leave empty to like ANY post on your timeline.',
      'crypto, bitcoin, web3'
    );
    const keywords = kwInput ? kwInput.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) : [];

    const defaultReplies = [
      '🔥 This is solid',
      'Really interesting take on this',
      'Great thread, appreciate the insight 🙏',
      'Couldn\'t agree more — this needed to be said',
      '📌 Saving this one. Great breakdown.',
      'Bullish on this perspective 💯',
      'Underrated take. More people need to see this.',
      'This is the kind of content I\'m here for',
    ];

    let replyTemplates = defaultReplies;
    if (preset.replyMax > 0) {
      const customReply = prompt(
        '💬 Reply templates (one per line, or press OK for defaults):\n\n' +
        'Default replies:\n' + defaultReplies.slice(0, 4).map(r => `  "${r}"`).join('\n'),
        ''
      );
      if (customReply && customReply.trim()) {
        replyTemplates = customReply.split('\n').map(r => r.trim()).filter(Boolean);
      }
    }

    return {
      keywords,
      dryRun,
      skipKeywords: ['promoted', 'ad', 'giveaway', 'sponsor'],

      timeline: {
        scrolls: 15,
        maxLikes: preset.maxLikes,
        likeChance: preset.likeChance,
        minEngagement: 2,
      },

      replies: {
        enabled: preset.replyMax > 0,
        max: preset.replyMax,
        chance: 0.2,
        templates: replyTemplates,
      },

      retweets: {
        enabled: preset.retweetMax > 0,
        max: preset.retweetMax,
        chance: 0.1,
      },

      bookmarks: {
        enabled: preset.bookmarkMax > 0,
        max: preset.bookmarkMax,
        chance: 0.15,
      },

      follows: {
        enabled: preset.followMax > 0,
        max: preset.followMax,
        chance: 0.25,
      },

      selfProfile: { enabled: true, username: '', scrolls: 4 },
      notifications: { enabled: true, pauseSeconds: 8 },

      delays: {
        betweenActions: [3000, 7000],
        betweenPhases: [8000, 15000],
        readingPause: [2000, 6000],
        scrollPause: [1500, 3000],
        replyTyping: [3000, 6000],
      },
    };
  };

  // =============================================
  // FLOATING HUD — on-page stats overlay
  // =============================================
  const createHUD = () => {
    const existing = document.getElementById('xactions-hud');
    if (existing) existing.remove();

    const hud = document.createElement('div');
    hud.id = 'xactions-hud';
    hud.innerHTML = `
      <div style="
        position: fixed; bottom: 20px; right: 20px; z-index: 999999;
        background: rgba(0,0,0,0.92); border: 1px solid #1d9bf0; border-radius: 12px;
        padding: 14px 18px; font-family: -apple-system, sans-serif; font-size: 13px;
        color: #e7e9ea; min-width: 200px; backdrop-filter: blur(10px);
        box-shadow: 0 4px 20px rgba(29,155,240,0.15);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <span style="font-weight:700; color:#1d9bf0;">🌊 Natural Flow</span>
          <span id="xhud-phase" style="font-size:11px; color:#71767b;">Phase 1/4</span>
        </div>
        <div id="xhud-progress" style="background:#333; border-radius:4px; height:6px; margin-bottom:10px; overflow:hidden;">
          <div id="xhud-bar" style="background:#1d9bf0; height:100%; width:0%; transition:width 0.3s;"></div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 12px; font-size:12px;">
          <span>❤️ Liked</span>      <span id="xhud-liked" style="text-align:right; font-weight:600;">0</span>
          <span>💬 Replied</span>    <span id="xhud-replied" style="text-align:right; font-weight:600;">0</span>
          <span>🔄 Retweeted</span>  <span id="xhud-retweeted" style="text-align:right; font-weight:600;">0</span>
          <span>🔖 Bookmarked</span> <span id="xhud-bookmarked" style="text-align:right; font-weight:600;">0</span>
          <span>➕ Followed</span>   <span id="xhud-followed" style="text-align:right; font-weight:600;">0</span>
          <span>⏭️ Skipped</span>    <span id="xhud-skipped" style="text-align:right; font-weight:600;">0</span>
        </div>
        <div id="xhud-latest" style="margin-top:8px; font-size:11px; color:#71767b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>
        <div style="margin-top:8px; display:flex; gap:8px;">
          <button id="xhud-pause" style="flex:1; background:#333; color:#e7e9ea; border:1px solid #555; border-radius:6px; padding:4px 0; cursor:pointer; font-size:11px;">⏸ Pause</button>
          <button id="xhud-stop" style="flex:1; background:#67070f; color:#e7e9ea; border:1px solid #f4212e; border-radius:6px; padding:4px 0; cursor:pointer; font-size:11px;">⏹ Stop</button>
        </div>
      </div>
    `;
    document.body.appendChild(hud);

    document.getElementById('xhud-stop').addEventListener('click', () => {
      aborted = true;
      updateHUD('latest', '🛑 Stopping...');
    });
    document.getElementById('xhud-pause').addEventListener('click', () => {
      paused = !paused;
      document.getElementById('xhud-pause').textContent = paused ? '▶ Resume' : '⏸ Pause';
      updateHUD('latest', paused ? '⏸ Paused' : '▶ Resumed');
    });

    return hud;
  };

  const updateHUD = (field, value) => {
    const el = document.getElementById(`xhud-${field}`);
    if (el) el.textContent = value;
  };

  const updateProgress = (current, max) => {
    const bar = document.getElementById('xhud-bar');
    if (bar) bar.style.width = `${Math.min(100, (current / max) * 100)}%`;
  };

  const removeHUD = () => {
    const hud = document.getElementById('xactions-hud');
    if (hud) hud.remove();
  };

  // =============================================
  // STATE + HISTORY
  // =============================================
  let aborted = false;
  let paused = false;

  window.XActions = window.XActions || {};
  window.XActions.stop = () => { aborted = true; console.log('🛑 Stopping...'); };
  window.XActions.pause = () => { paused = !paused; console.log(paused ? '⏸ Paused' : '▶ Resumed'); };

  const stats = { liked: 0, replied: 0, retweeted: 0, bookmarked: 0, followed: 0, scrolled: 0, skipped: 0 };
  const actionLog = [];
  const seen = new Set();

  const STATE_KEY = 'xactions_natural_flow';
  const HISTORY_KEY = 'xactions_nf_history';

  const getState = () => { try { return JSON.parse(sessionStorage.getItem(STATE_KEY)); } catch { return null; } };
  const setState = (s) => sessionStorage.setItem(STATE_KEY, JSON.stringify(s));
  const clearState = () => sessionStorage.removeItem(STATE_KEY);

  const getHistory = () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } };
  const addHistory = (entry) => {
    const hist = getHistory();
    hist.push(entry);
    if (hist.length > 30) hist.splice(0, hist.length - 30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  };

  const checkRecentSession = () => {
    const hist = getHistory();
    if (hist.length === 0) return true;
    const last = hist[hist.length - 1];
    const hoursSince = (Date.now() - last.ts) / 3600000;
    if (hoursSince < 2) {
      const ok = confirm(
        `⚠️ You ran Natural Flow ${hoursSince.toFixed(1)} hours ago ` +
        `(${last.liked} likes, ${last.replied} replies).\n\n` +
        `Running too frequently increases detection risk.\n\n` +
        `Continue anyway?`
      );
      return ok;
    }
    return true;
  };

  // =============================================
  // CORE HELPERS
  // =============================================
  const waitForUnpause = async () => { while (paused && !aborted) await sleep(300); };

  const isRateLimited = () => {
    for (const el of $$(`${SEL.toast}, [role="alert"]`)) {
      if (/rate limit|try again|too many|slow down/i.test(el.textContent)) return true;
    }
    return false;
  };

  const checkRateLimit = async () => {
    if (!isRateLimited()) return false;
    console.log('   🚨 Rate limited — pausing 120s...');
    updateHUD('latest', '🚨 Rate limited — pausing...');
    await sleep(120000);
    return isRateLimited();
  };

  const matchesKeywords = (config, text) => {
    if (!config.keywords || config.keywords.length === 0) return true;
    const lower = text.toLowerCase();
    return config.keywords.some(kw => lower.includes(kw));
  };

  const shouldSkip = (config, text) => {
    const lower = text.toLowerCase();
    return config.skipKeywords.some(kw => lower.includes(kw));
  };

  const getAuthor = (article) => {
    const link = article.querySelector('a[href^="/"][role="link"]');
    if (!link) return null;
    const match = (link.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/);
    if (!match) return null;
    const name = match[1];
    if (['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings', 'compose'].includes(name)) return null;
    return name;
  };

  const getMyUsername = (config) => {
    if (config.selfProfile.username) return config.selfProfile.username;
    const navLink = document.querySelector(SEL.profileNav);
    if (navLink) {
      const match = navLink.getAttribute('href')?.match(/^\/([A-Za-z0-9_]+)/);
      if (match) return match[1];
    }
    return null;
  };

  // Cooldown escalation: delays increase as session progresses
  const escalatedDelay = (config, key, actionsSoFar) => {
    const base = config.delays[key];
    const multiplier = 1 + (actionsSoFar * 0.03);
    const lo = Math.floor(base[0] * multiplier);
    const hi = Math.floor(base[1] * multiplier);
    return sleep(rand(lo, hi));
  };

  // =============================================
  // ACTIONS
  // =============================================

  const doLike = async (config, article, text) => {
    if ($(SEL.unlikeBtn, article)) return false;
    const btn = $(SEL.likeBtn, article);
    if (!btn) return false;

    article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await escalatedDelay(config, 'readingPause', stats.liked);

    if (config.dryRun) {
      console.log(`   ❤️ [DRY] Like: "${text.slice(0, 55)}..."`);
    } else {
      btn.click();
      await sleep(rand(300, 600));
    }
    stats.liked++;
    updateHUD('liked', stats.liked);
    return true;
  };

  const doReply = async (config, article, author, tweetText) => {
    const replyBtn = $(SEL.replyBtn, article);
    if (!replyBtn) return false;

    // Context-aware: pick a relevant template based on tweet content
    let replyText = pick(config.replies.templates);
    const lower = tweetText.toLowerCase();
    if (/thread|breakdown|analysis/i.test(lower)) {
      replyText = pick(['📌 Saving this one. Great breakdown.', 'Great thread, appreciate the insight 🙏', replyText]);
    } else if (/agree|disagree|opinion|take/i.test(lower)) {
      replyText = pick(['Couldn\'t agree more — this needed to be said', 'Really interesting take on this', replyText]);
    } else if (/data|chart|numbers|stats/i.test(lower)) {
      replyText = pick(['The data speaks for itself 📊', 'Underrated take. More people need to see this.', replyText]);
    }

    if (config.dryRun) {
      console.log(`   💬 [DRY] Reply to @${author}: "${replyText}"`);
      stats.replied++;
      updateHUD('replied', stats.replied);
      return true;
    }

    replyBtn.click();
    await sleep(1500);

    const tweetBox = $(SEL.tweetBox);
    if (!tweetBox) { console.log('   ⚠️ Reply box not found'); return false; }

    tweetBox.focus();
    await escalatedDelay(config, 'replyTyping', stats.replied);
    document.execCommand('insertText', false, replyText);
    await sleep(rand(600, 1000));

    const sendBtn = $(SEL.tweetButton);
    if (!sendBtn) { console.log('   ⚠️ Send button not found'); return false; }

    sendBtn.click();
    await sleep(2000);
    stats.replied++;
    updateHUD('replied', stats.replied);
    return true;
  };

  const doRetweet = async (config, article, text) => {
    const rtBtn = $(SEL.retweetBtn, article);
    if (!rtBtn) return false;

    if (config.dryRun) {
      console.log(`   🔄 [DRY] Retweet: "${text.slice(0, 50)}..."`);
      stats.retweeted++;
      updateHUD('retweeted', stats.retweeted);
      return true;
    }

    rtBtn.click();
    await sleep(800);
    const confirmBtn = $(SEL.retweetConf);
    if (confirmBtn) {
      confirmBtn.click();
      await sleep(500);
    }
    stats.retweeted++;
    updateHUD('retweeted', stats.retweeted);
    return true;
  };

  const doBookmark = async (config, article, text) => {
    const shareBtn = $(SEL.shareBtn, article);
    if (!shareBtn) return false;

    if (config.dryRun) {
      console.log(`   🔖 [DRY] Bookmark: "${text.slice(0, 50)}..."`);
      stats.bookmarked++;
      updateHUD('bookmarked', stats.bookmarked);
      return true;
    }

    shareBtn.click();
    await sleep(600);
    const bmBtn = document.querySelector('[data-testid="bookmark"], [role="menuitem"]');
    if (bmBtn && /bookmark/i.test(bmBtn.textContent)) {
      bmBtn.click();
      await sleep(400);
      stats.bookmarked++;
      updateHUD('bookmarked', stats.bookmarked);
      return true;
    }
    document.body.click();
    await sleep(300);
    return false;
  };

  const doFollow = async (config, author) => {
    if (config.dryRun) {
      console.log(`   ➕ [DRY] Follow @${author}`);
      stats.followed++;
      updateHUD('followed', stats.followed);
      return true;
    }

    console.log(`   ➕ Following @${author}...`);
    window.location.href = `https://x.com/${author}`;

    let loaded = false;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      if (document.querySelector(SEL.unfollowBtn)) {
        console.log(`   ℹ️ Already following @${author}`);
        window.history.back();
        await sleep(3000);
        return false;
      }
      const followBtn = document.querySelector('[data-testid$="-follow"]:not([data-testid$="-unfollow"])');
      if (followBtn) { loaded = true; break; }
    }

    if (loaded) {
      const followBtn = document.querySelector('[data-testid$="-follow"]:not([data-testid$="-unfollow"])');
      if (followBtn) {
        followBtn.click();
        await sleep(1000);
        stats.followed++;
        updateHUD('followed', stats.followed);
        console.log(`   ✅ Followed @${author}`);
      }
    }

    await sleep(rand(2000, 4000));
    window.history.back();
    await sleep(3000);
    return true;
  };

  // =============================================
  // PHASES
  // =============================================

  const phaseTimeline = async (config) => {
    console.log('\n📱 PHASE 1 — Scrolling home timeline...');
    console.log(`   Keywords: ${config.keywords.length ? config.keywords.join(', ') : 'everything'}`);
    updateHUD('phase', 'Phase 1/4');

    const authorsToFollow = [];
    const totalActions = config.timeline.maxLikes;

    for (let scroll = 0; scroll < config.timeline.scrolls && !aborted; scroll++) {
      await waitForUnpause();
      const articles = $$(SEL.tweet);

      for (const article of articles) {
        if (aborted) break;
        if (stats.liked >= config.timeline.maxLikes) break;
        if (await checkRateLimit()) { aborted = true; break; }
        await waitForUnpause();

        const textEl = $(SEL.tweetText, article);
        const text = textEl ? textEl.textContent.trim() : '';
        const link = article.querySelector('a[href*="/status/"]')?.href || '';
        const id = link || text.slice(0, 80);
        if (!id || seen.has(id)) continue;
        seen.add(id);

        if (shouldSkip(config, text)) { stats.skipped++; updateHUD('skipped', stats.skipped); continue; }
        if (!matchesKeywords(config, text)) { stats.skipped++; updateHUD('skipped', stats.skipped); continue; }

        // Engagement scoring — skip very low-engagement posts
        const engagement = parseEngagement(article);
        if (engagement < config.timeline.minEngagement && config.timeline.minEngagement > 0) {
          stats.skipped++;
          updateHUD('skipped', stats.skipped);
          continue;
        }

        const author = getAuthor(article);

        // --- Like ---
        if (roll(config.timeline.likeChance)) {
          const liked = await doLike(config, article, text);
          if (liked) {
            updateHUD('latest', `❤️ @${author || '?'}: ${text.slice(0, 40)}...`);
            updateProgress(stats.liked, totalActions);
            actionLog.push({ action: 'like', author, text: text.slice(0, 100), engagement, ts: Date.now() });
            await escalatedDelay(config, 'betweenActions', stats.liked);

            // --- Maybe reply (context-aware) ---
            if (config.replies.enabled && stats.replied < config.replies.max && roll(config.replies.chance)) {
              const replied = await doReply(config, article, author, text);
              if (replied) {
                actionLog.push({ action: 'reply', author, ts: Date.now() });
                updateHUD('latest', `💬 Replied to @${author}`);
                await escalatedDelay(config, 'betweenActions', stats.liked + stats.replied);
              }
            }

            // --- Maybe retweet (sparingly, only high-engagement) ---
            if (config.retweets.enabled && stats.retweeted < config.retweets.max && roll(config.retweets.chance) && engagement >= 10) {
              await doRetweet(config, article, text);
              actionLog.push({ action: 'retweet', author, text: text.slice(0, 60), ts: Date.now() });
              updateHUD('latest', `🔄 Retweeted @${author}`);
              await sleep(rand(1000, 2000));
            }

            // --- Maybe bookmark ---
            if (config.bookmarks.enabled && stats.bookmarked < config.bookmarks.max && roll(config.bookmarks.chance)) {
              await doBookmark(config, article, text);
              actionLog.push({ action: 'bookmark', author, ts: Date.now() });
              await sleep(rand(500, 1000));
            }

            // --- Queue follow ---
            if (config.follows.enabled && author && stats.followed < config.follows.max && roll(config.follows.chance)) {
              if (!authorsToFollow.includes(author)) authorsToFollow.push(author);
            }
          }
        } else {
          // Scroll past — simulate reading
          article.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleep(rand(400, 1200));
        }
      }

      if (stats.liked >= config.timeline.maxLikes) break;

      window.scrollBy(0, rand(600, 1200));
      stats.scrolled++;
      const pct = Math.round((stats.liked / totalActions) * 100);
      console.log(`   📜 Scroll ${scroll + 1}/${config.timeline.scrolls} — ${stats.liked} liked (${pct}%), ${stats.skipped} skipped`);
      await escalatedDelay(config, 'scrollPause', stats.scrolled);
    }

    console.log(`   ✅ Timeline: ${stats.liked} liked, ${stats.replied} replied, ${stats.retweeted} RT, ${stats.bookmarked} saved`);

    // Follow queued authors
    if (authorsToFollow.length > 0 && !aborted) {
      console.log(`\n   👥 Following ${Math.min(authorsToFollow.length, config.follows.max)} accounts...`);
      for (const author of authorsToFollow.slice(0, config.follows.max - stats.followed)) {
        if (aborted) break;
        await waitForUnpause();
        await doFollow(config, author);
        actionLog.push({ action: 'follow', author, ts: Date.now() });
        updateHUD('latest', `➕ Followed @${author}`);
        await escalatedDelay(config, 'betweenActions', stats.followed);
      }
    }
  };

  const phaseSelfProfile = async (config) => {
    if (!config.selfProfile.enabled) return;
    const username = getMyUsername(config);
    if (!username) {
      console.log('\n👤 PHASE 2 — Skipping (couldn\'t detect username)');
      return;
    }
    console.log(`\n👤 PHASE 2 — Visiting your profile (@${username})...`);
    updateHUD('phase', 'Phase 2/4');
    updateHUD('latest', `👤 Browsing @${username}`);

    if (!config.dryRun) {
      window.location.href = `https://x.com/${username}`;
      for (let i = 0; i < 20; i++) { await sleep(500); if ($$(SEL.tweet).length > 0) break; }
      await sleep(2000);
    } else {
      console.log(`   🏃 [DRY] Would navigate to x.com/${username}`);
    }

    for (let i = 0; i < config.selfProfile.scrolls; i++) {
      if (config.dryRun) console.log(`   📜 [DRY] Scroll profile ${i + 1}/${config.selfProfile.scrolls}`);
      else window.scrollBy(0, rand(400, 900));
      await escalatedDelay(config, 'scrollPause', i);
    }
    console.log(`   ✅ Scrolled own profile`);
    actionLog.push({ action: 'self_profile', username, ts: Date.now() });
  };

  const phaseNotifications = async (config) => {
    if (!config.notifications.enabled) return;
    console.log('\n🔔 PHASE 3 — Checking notifications...');
    updateHUD('phase', 'Phase 3/4');
    updateHUD('latest', '🔔 Reading notifications...');

    if (!config.dryRun) {
      window.location.href = 'https://x.com/notifications';
      for (let i = 0; i < 20; i++) { await sleep(500); if ($(SEL.notification) || window.location.pathname.includes('notifications')) break; }
      await sleep(2000);
    } else {
      console.log(`   🏃 [DRY] Would navigate to notifications`);
    }

    console.log(`   👀 Reading for ${config.notifications.pauseSeconds}s...`);
    await sleep(config.notifications.pauseSeconds * 1000);
    for (let i = 0; i < 3; i++) {
      if (!config.dryRun) window.scrollBy(0, rand(300, 600));
      await sleep(rand(1000, 2000));
    }
    console.log('   ✅ Notifications checked');
    actionLog.push({ action: 'notifications', ts: Date.now() });
  };

  const phaseReturnHome = async (config) => {
    console.log('\n🏠 PHASE 4 — Returning to home timeline...');
    updateHUD('phase', 'Phase 4/4');
    updateHUD('latest', '🏠 Heading home...');

    if (!config.dryRun) {
      window.location.href = 'https://x.com/home';
      for (let i = 0; i < 20; i++) { await sleep(500); if ($$(SEL.tweet).length > 0) break; }
      await sleep(2000);
    } else {
      console.log('   🏃 [DRY] Would navigate to home');
    }

    for (let i = 0; i < 3; i++) {
      if (!config.dryRun) window.scrollBy(0, rand(400, 800));
      await sleep(rand(1500, 3000));
    }
    console.log('   ✅ Back on home timeline');
  };

  // =============================================
  // SESSION SUMMARY
  // =============================================
  const printSummary = (elapsed) => {
    const W = 52;
    console.log('\n' + '━'.repeat(W));
    console.log('  🌊 NATURAL FLOW — SESSION COMPLETE');
    console.log('━'.repeat(W));
    console.log(`  ❤️  Liked:       ${stats.liked}`);
    console.log(`  💬  Replied:     ${stats.replied}`);
    console.log(`  🔄  Retweeted:   ${stats.retweeted}`);
    console.log(`  🔖  Bookmarked:  ${stats.bookmarked}`);
    console.log(`  ➕  Followed:    ${stats.followed}`);
    console.log(`  📜  Scrolls:     ${stats.scrolled}`);
    console.log(`  ⏭️  Skipped:     ${stats.skipped}`);
    console.log(`  ⏱️  Duration:    ${elapsed} min`);
    console.log('━'.repeat(W));

    const uniqueAuthors = new Set(actionLog.filter(l => l.author).map(l => l.author));
    console.log(`  Engaged with ${uniqueAuthors.size} unique accounts\n`);

    addHistory({
      ts: Date.now(),
      liked: stats.liked,
      replied: stats.replied,
      retweeted: stats.retweeted,
      bookmarked: stats.bookmarked,
      followed: stats.followed,
      authors: uniqueAuthors.size,
    });

    if (actionLog.length > 0) {
      try {
        const blob = new Blob([JSON.stringify(actionLog, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `xactions-natural-flow-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        console.log('📥 Session log exported.\n');
      } catch {}
    }

    removeHUD();
  };

  // =============================================
  // MAIN — DRY RUN (single page, no navigation)
  // =============================================
  const runDry = async (config) => {
    const W = 52;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🌊 NATURAL FLOW — Human-Like Session        ║');
    console.log('║  by nichxbt — XActions                        ║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log('\n🏃 DRY RUN — previewing the full session.\n');

    const startTime = Date.now();
    createHUD();

    try {
      await phaseTimeline(config);
      if (!aborted) { await sleep(rand(...config.delays.betweenPhases)); await phaseSelfProfile(config); }
      if (!aborted) { await sleep(rand(...config.delays.betweenPhases)); await phaseNotifications(config); }
      if (!aborted) { await sleep(rand(...config.delays.betweenPhases)); await phaseReturnHome(config); }
    } catch (e) { if (e !== 'aborted') console.error('❌ Error:', e); }

    printSummary(((Date.now() - startTime) / 60000).toFixed(1));
    clearState();
  };

  // =============================================
  // MAIN — LIVE MODE (multi-page with resume)
  // =============================================
  const runLive = async (config) => {
    let state = getState() || { phase: 1, stats: { liked:0, replied:0, retweeted:0, bookmarked:0, followed:0, scrolled:0, skipped:0 }, log: [], config };

    Object.assign(stats, state.stats);
    actionLog.push(...state.log);

    const W = 52;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🌊 NATURAL FLOW — Human-Like Session        ║');
    console.log('║  by nichxbt — XActions                        ║');
    console.log('╚' + '═'.repeat(W) + '╝');
    console.log(`\n⚠️ LIVE MODE — Phase ${state.phase}/4`);
    console.log(`   ℹ️ XActions.stop() or click 🛑 to abort\n`);

    createHUD();
    updateHUD('phase', `Phase ${state.phase}/4`);
    updateHUD('liked', stats.liked);
    updateHUD('replied', stats.replied);
    updateHUD('retweeted', stats.retweeted);
    updateHUD('bookmarked', stats.bookmarked);
    updateHUD('followed', stats.followed);
    updateHUD('skipped', stats.skipped);

    const startTime = Date.now();

    const saveAndNav = (nextPhase, url) => {
      state.phase = nextPhase;
      state.stats = { ...stats };
      state.log = [...actionLog];
      state.config = config;
      setState(state);
      console.log(`\n   ➡️ Navigating... Re-paste script after page loads.`);
      sleep(rand(5000, 10000)).then(() => { window.location.href = url; });
    };

    try {
      if (state.phase === 1) {
        if (!window.location.pathname.includes('/home') && window.location.pathname !== '/') {
          window.location.href = 'https://x.com/home';
          return;
        }
        await phaseTimeline(config);

        if (!aborted && config.selfProfile.enabled) {
          const username = getMyUsername(config);
          if (username) { saveAndNav(2, `https://x.com/${username}`); return; }
        }
        state.phase = config.notifications.enabled ? 3 : 4;
        state.stats = { ...stats };
        state.log = [...actionLog];
        state.config = config;
        setState(state);
      }

      if (state.phase === 2) {
        console.log('\n👤 PHASE 2 — Browsing own profile');
        updateHUD('phase', 'Phase 2/4');
        for (let i = 0; i < config.selfProfile.scrolls; i++) {
          window.scrollBy(0, rand(400, 900));
          await escalatedDelay(config, 'scrollPause', i);
        }
        console.log(`   ✅ Scrolled own profile`);
        actionLog.push({ action: 'self_profile', ts: Date.now() });

        if (!aborted && config.notifications.enabled) { saveAndNav(3, 'https://x.com/notifications'); return; }
        state.phase = 4;
        state.stats = { ...stats };
        state.log = [...actionLog];
        state.config = config;
        setState(state);
      }

      if (state.phase === 3) {
        console.log('\n🔔 PHASE 3 — Checking notifications');
        updateHUD('phase', 'Phase 3/4');
        await sleep(config.notifications.pauseSeconds * 1000);
        for (let i = 0; i < 3; i++) { window.scrollBy(0, rand(300, 600)); await sleep(rand(1000, 2000)); }
        console.log('   ✅ Notifications checked');
        actionLog.push({ action: 'notifications', ts: Date.now() });

        if (!aborted) { saveAndNav(4, 'https://x.com/home'); return; }
      }

      if (state.phase === 4) {
        console.log('\n🏠 PHASE 4 — Back on home timeline');
        updateHUD('phase', 'Phase 4/4');
        for (let i = 0; i < 3; i++) { window.scrollBy(0, rand(400, 800)); await sleep(rand(1500, 3000)); }
        console.log('   ✅ Final browse complete');
      }
    } catch (e) {
      if (e !== 'aborted') console.error('❌ Error:', e);
    }

    printSummary(((Date.now() - startTime) / 60000).toFixed(1));
    clearState();
  };

  // =============================================
  // ENTRY POINT
  // =============================================
  const main = async () => {
    if (!checkRecentSession()) {
      console.log('❌ Cancelled — too soon since last session.');
      return;
    }

    const config = setupInteractive();
    if (!config) {
      console.log('❌ Setup cancelled.');
      return;
    }

    if (config.dryRun) {
      await runDry(config);
    } else {
      await runLive(config);
    }
  };

  main();
})();

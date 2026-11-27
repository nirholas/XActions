// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Delete, like, repost, or reply to every post an X search returns, e.g. from:you @someone
// Paste in DevTools console on x.com/search?q=...
// by nichxbt
//
// The use case that built it: "I replied to @someone 400 times over two years and I want
// every one of those replies gone." X gives you no bulk tool for that, but its search does
// find them: from:you @someone. This sweeps that result set and applies the action you pick.
//
//   https://x.com/search?q=from%3Ayou%20%40someone&src=typed_query&f=live
//
// Actions: delete (your own posts only), like, repost, reply. Delete is exclusive: a post
// you are about to remove is not one you also want to like.
//
// Two things about X search that this script works around, and you should know about:
//   1. Search returns a slice, not the whole set. One pass never finds everything.
//      CONFIG.passes re-runs the query and sweeps again until a pass finds nothing new.
//   2. The search index lags deletions by minutes. A post you just deleted can still be
//      listed. Every id is remembered, so a later pass skips it instead of erroring.
// Use &f=live (the Latest tab). Top ranking hides most of your older replies.
//
// AI replies from the console: x.com's Content-Security-Policy only lets the page reach a
// short list of hosts, and https://api.x.ai is on it. So provider 'xai' (Grok) works from
// the console with your xAI key. For OpenAI/Anthropic/OpenRouter/Ollama install the
// XActions browser extension (extension/) and set provider 'bridge'.
//
// A floating panel appears when you paste. Everything below can be changed there.
// Dry run is ON by default. Read one pass of the log, then turn it off.
//
// DELETION IS PERMANENT. Export your posts first with scripts/backupAccount.js.

/**
 * ============================================================
 * 🔍 Search Sweep
 * ============================================================
 *
 * @name        searchSweep.js
 * @description Delete, like, repost or reply to every post an X search returns.
 * @title       Search Sweep
 * @category    cleanup
 * @page        x.com/search?q=<query>
 * @writes      true
 * @aliases     scripts/searchSweep.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-08-27
 * @repository  https://github.com/nirholas/XActions
 * ============================================================
 */
(() => {
  'use strict';

  if (document.getElementById('xsw-panel')) {
    console.log('🔍 Search sweep already loaded. Use the panel, or window.XSearchSweep.');
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION (the panel edits this live)
  // ═══════════════════════════════════════════════════════════

  const CONFIG = {
    dryRun: true,                  // Log what would happen, touch nothing. SET FALSE TO RUN.

    // The search. Leave `raw` empty and the pieces below are assembled into a query;
    // fill `raw` and it is used verbatim, so any X search operator works.
    query: {
      from: 'me',                  // 'me' = the signed-in account. Or a handle. '' = anyone.
      mentions: '',                // Handle the post must mention, e.g. 'nichxbt'
      to: '',                      // Handle the post must be a direct reply to
      contains: '',                // Extra words or operators, e.g. 'filter:replies -filter:links'
      latest: true,                // Latest tab (f=live). Top ranking hides old posts.
      raw: '',                     // Full query, overrides everything above
    },

    actions: {
      delete: true,                // Your own posts only. Permanent. Exclusive with the rest.
      like: false,
      repost: false,
      reply: false,
    },

    maxPosts: 0,                   // 0 = every result. Set e.g. 25 for a first live run.
    passes: 6,                     // Re-run the query this many times. Search returns a slice per pass.
    stopAfterEmptyPasses: 2,       // Give up once this many passes in a row act on nothing.

    filters: {
      olderThanDays: null,         // Only act on posts older than N days (null = any age)
      beforeDate: null,            // Only before this date: 'YYYY-MM-DD'
      afterDate: null,             // Only after this date: 'YYYY-MM-DD'
      maxLikes: null,              // Protect high performers: skip if likes > this
      maxReposts: null,            // Skip if reposts > this
      excludeKeywords: [],         // Never touch a post containing any of these
      excludePinned: true,         // Never touch your pinned post
      includeReposts: false,       // Also act on posts you reposted (delete undoes the repost)
    },

    // Pacing. 'safe' is what a fast human looks like. Faster presets get accounts limited.
    speed: 'safe',                 // 'stealth' | 'safe' | 'moderate' | 'fast'
    restEvery: 25,                 // After this many posts, take a longer break
    restForSeconds: 120,           // Length of that break
    maxConsecutiveFailures: 4,     // Back off after this many failures in a row
    backoffSeconds: 300,           // How long to back off (X soft-limits clear in 5-15 min)

    reply: {
      mode: 'templates',           // 'templates' | 'ai'
      templates: [
        'Following up on this one, {name}. Did the thinking here hold up?',
        'Still curious about this, {author}. What changed since?',
      ],
      prompt: 'Reply as a thoughtful person continuing an existing conversation. Be specific to the post, add one idea or one honest question, keep it under two sentences, no hype words.',
      persona: '',
      provider: 'xai',             // 'xai' (works from the console) | 'bridge' (XActions extension)
      apiKey: '',                  // xAI key. Stored only if "remember" is ticked in the panel.
      model: 'grok-3-mini',
      bridgeProvider: 'openrouter',
      bridgeBaseUrl: '',
      temperature: 0.9,
      allowHashtags: false,
      allowEmoji: true,
      fallbackToTemplates: true,
    },

    exportOnFinish: true,          // Download a JSON record of everything acted on
  };

  // Deletes tolerate a tighter cadence than replies: one is a menu click, the other is a
  // published post that X weighs much more heavily when it decides to limit an account.
  const SPEEDS = {
    stealth:  { between: [12000, 24000], action: [2500, 5000] },
    safe:     { between: [4000, 9000],   action: [1500, 3200] },
    moderate: { between: [2500, 5000],   action: [1100, 2400] },
    fast:     { between: [1300, 2600],   action: [800, 1600]  },
  };
  const REPLY_PACE_MULTIPLIER = 3;

  const SEL = {
    article: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userName: '[data-testid="User-Name"]',
    socialContext: '[data-testid="socialContext"]',
    caret: '[data-testid="caret"]',
    menu: '[role="menu"]',
    menuItem: '[role="menuitem"]',
    confirmSheet: '[data-testid="confirmationSheetConfirm"]',
    like: '[data-testid="like"]',
    unlike: '[data-testid="unlike"]',
    retweet: '[data-testid="retweet"]',
    unretweet: '[data-testid="unretweet"]',
    retweetConfirm: '[data-testid="retweetConfirm"]',
    unretweetConfirm: '[data-testid="unretweetConfirm"]',
    reply: '[data-testid="reply"]',
    tweetBox: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    closeModal: '[data-testid="app-bar-close"]',
    toast: '[data-testid="toast"]',
    searchBox: '[data-testid="SearchBox_Search_Input"]',
    emptyState: '[data-testid="empty_state_header_text"]',
    retryButton: '[data-testid="primaryColumn"] [role="button"]',
    placement: '[data-testid="placementTracking"]',
    profileLink: 'a[data-testid="AppTabBar_Profile_Link"]',
    accountSwitcher: '[data-testid="SideNav_AccountSwitcher_Button"]',
  };

  const GENERIC_OPENERS = [
    'great post', 'great point', 'great thread', 'great take', 'love this', 'this is so true',
    'so true', 'well said', "couldn't agree more", 'could not agree more', 'thanks for sharing',
    'thank you for sharing', 'interesting take', 'interesting perspective', 'as an ai', 'as a language model',
  ];

  // ═══════════════════════════════════════════════════════════
  // WHO AM I, AND AM I ON A SEARCH PAGE
  // ═══════════════════════════════════════════════════════════

  const ownHandle = (() => {
    const href = document.querySelector(SEL.profileLink)?.getAttribute('href') || '';
    const fromNav = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
    if (fromNav) return fromNav[1].toLowerCase();
    const switcher = document.querySelector(SEL.accountSwitcher)?.textContent || '';
    const fromSwitcher = switcher.match(/@([A-Za-z0-9_]{1,15})/);
    return fromSwitcher ? fromSwitcher[1].toLowerCase() : null;
  })();

  const onSearchPage = () => /^\/search\/?$/.test(location.pathname);

  if (!onSearchPage()) {
    console.error(
      '❌ Open an X search first, then paste this again. For example:\n' +
      `   https://x.com/search?q=${encodeURIComponent(`from:${ownHandle || 'yourhandle'} @someone`)}&src=typed_query&f=live`,
    );
    return;
  }

  const currentQuery = () => new URLSearchParams(location.search).get('q') || '';
  const currentTab = () => new URLSearchParams(location.search).get('f') || 'top';

  // Seed the panel from whatever the user already searched for, so pasting on a search
  // they built by hand does not silently replace it with the defaults above.
  (() => {
    const q = currentQuery();
    if (!q) return;
    CONFIG.query.raw = q;
    CONFIG.query.latest = currentTab() === 'live';
  })();

  const STORAGE_KEY = 'xactions_search_sweep';
  const KEY_STORAGE = 'xactions_engage_ai_key';   // Shared with engageProfile on purpose

  const persisted = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {}; } catch { return {}; }
  })();

  const STATE = {
    running: false,
    paused: false,
    stopRequested: false,
    done: new Map(Object.entries(persisted.done || {})),  // tweetId -> { deleted, liked, reposted, replied, at }
    seenThisPass: new Set(),
    pass: 0,
    processed: 0,
    deleted: 0,
    liked: 0,
    reposted: 0,
    replied: 0,
    skipped: 0,
    failed: 0,
    consecutiveFailures: 0,
    startedAt: null,
    results: [],
    recentReplies: [],
    lastTemplate: -1,
    query: '',
  };

  const savedKey = (() => { try { return localStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; } })();
  if (savedKey && !CONFIG.reply.apiKey) CONFIG.reply.apiKey = savedKey;

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        updatedAt: Date.now(),
        query: STATE.query,
        done: Object.fromEntries(STATE.done),
      }));
    } catch (err) {
      addLog(`Could not save progress: ${err.message}`, 'warn');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = ([min, max]) => Math.floor(min + ((Math.random() + Math.random()) / 2) * (max - min));
  const speed = () => SPEEDS[CONFIG.speed] || SPEEDS.safe;
  const betweenRange = () => {
    const [lo, hi] = speed().between;
    const scale = CONFIG.actions.reply ? REPLY_PACE_MULTIPLIER : 1;
    return [lo * scale, hi * scale];
  };
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const waitFor = async (sel, timeout = 6000, root = document) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = root.querySelector(sel);
      if (el) return el;
      await sleep(120);
    }
    return null;
  };

  const waitForGone = async (sel, timeout = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (!document.querySelector(sel)) return true;
      await sleep(120);
    }
    return false;
  };

  const waitUntil = async (test, timeout = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (test()) return true;
      await sleep(150);
    }
    return false;
  };

  const pressEscape = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    const close = $(SEL.closeModal);
    if (close) close.click();
  };

  /** A toast that means X is pushing back, not just informing. */
  const throttleToast = () => {
    const toast = $(SEL.toast);
    if (!toast) return null;
    const text = toast.textContent || '';
    return /rate limit|try again later|too many|temporarily|unable to|something went wrong|limit/i.test(text) ? text.trim() : null;
  };

  const afterClickCheck = async () => {
    const toast = throttleToast();
    if (toast) throw new Error(`X pushed back: "${toast}"`);
  };

  // ═══════════════════════════════════════════════════════════
  // THE SEARCH ITSELF
  // ═══════════════════════════════════════════════════════════

  const buildQuery = () => {
    const q = CONFIG.query;
    if (q.raw && q.raw.trim()) return q.raw.trim();
    const handle = (h) => String(h || '').trim().replace(/^@/, '');
    const parts = [];
    const from = handle(q.from) === 'me' ? ownHandle : handle(q.from);
    if (from) parts.push(`from:${from}`);
    if (handle(q.mentions)) parts.push(`@${handle(q.mentions)}`);
    if (handle(q.to)) parts.push(`to:${handle(q.to)}`);
    if (q.contains && q.contains.trim()) parts.push(q.contains.trim());
    return parts.join(' ');
  };

  const searchUrl = (q) =>
    `/search?q=${encodeURIComponent(q)}&src=typed_query${CONFIG.query.latest ? '&f=live' : ''}`;

  /**
   * Type a query into X's own search box and submit it. This keeps the SPA alive, which a
   * location.href assignment would not: a page load throws away this script mid-run.
   */
  const submitViaSearchBox = async (q) => {
    const box = await waitFor(SEL.searchBox, 4000);
    if (!box) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    box.focus();
    setter.call(box, '');
    box.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(150);
    setter.call(box, q);
    box.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(350);
    for (const type of ['keydown', 'keypress', 'keyup']) {
      box.dispatchEvent(new KeyboardEvent(type, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }));
    }
    const landed = await waitUntil(() => onSearchPage() && currentQuery().trim() === q.trim(), 8000);
    box.blur();
    return landed;
  };

  /** Click the Latest / Top tab. They are X's own router links, so no page load. */
  const clickTab = async (want) => {
    const links = $$('[role="tablist"] a[href*="/search"], nav[role="navigation"] a[href*="/search"]');
    const target = links.find((a) => {
      const f = new URLSearchParams((a.getAttribute('href') || '').split('?')[1] || '').get('f') || 'top';
      return f === want;
    });
    if (!target) return false;
    if (target.getAttribute('aria-selected') === 'true' && currentTab() === want) return true;
    target.click();
    return waitUntil(() => currentTab() === want, 6000);
  };

  const goToQuery = async (q) => {
    if (!q) throw new Error('Empty query. Set from/mentions in the panel, or paste a raw query.');
    if (currentQuery().trim() !== q.trim()) {
      const ok = await submitViaSearchBox(q);
      if (!ok) {
        throw new Error(`Could not drive X's search box. Open this URL yourself and paste the script again: https://x.com${searchUrl(q)}`);
      }
      await sleep(1200);
    }
    const wantTab = CONFIG.query.latest ? 'live' : 'top';
    if (currentTab() !== wantTab) {
      const switched = await clickTab(wantTab);
      if (!switched && CONFIG.query.latest) {
        addLog('Could not switch to the Latest tab. Top ranking hides older posts, so expect fewer results.', 'warn');
      }
      await sleep(1200);
    }
    return true;
  };

  /**
   * Force X to re-run the current query. Deleting from a result list does not refresh it,
   * and the index needs a fresh request to drop what is gone and surface the next slice.
   * Toggling to the other tab and back is X's own router doing the refetch.
   */
  const refreshResults = async () => {
    const want = CONFIG.query.latest ? 'live' : 'top';
    const other = want === 'live' ? 'top' : 'live';
    window.scrollTo({ top: 0 });
    await sleep(600);
    const bounced = await clickTab(other);
    if (!bounced) return false;
    await sleep(1800);
    const back = await clickTab(want);
    await sleep(2200);
    return back;
  };

  // ═══════════════════════════════════════════════════════════
  // READING RESULTS
  // ═══════════════════════════════════════════════════════════

  const parseCount = (raw) => {
    if (!raw) return 0;
    const m = String(raw).replace(/,/g, '').match(/([\d.]+)\s*([KMBkmb])?/);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    const scale = m[2] ? { k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()] : 1;
    return Math.round(n * (scale || 1));
  };

  const readArticle = (article) => {
    // The permalink is the anchor wrapping the timestamp. Taking the first /status/ link
    // instead would pick up the quoted post on a quote tweet and act on the wrong author.
    const statusLinks = $$('a[href*="/status/"]', article)
      .filter((a) => /^\/[A-Za-z0-9_]+\/status\/\d+/.test(a.getAttribute('href') || ''));
    const permalink = statusLinks.find((a) => a.querySelector('time')) || statusLinks[0];
    const link = permalink?.getAttribute('href') || '';
    if (!link) return null;
    const id = (link.match(/\/status\/(\d+)/) || [])[1];
    const author = ((link.match(/^\/([A-Za-z0-9_]+)\/status\//) || [])[1] || '').toLowerCase();
    if (!id || !author) return null;

    const nameEl = $(SEL.userName, article);
    const nameSpans = nameEl ? $$('span', nameEl).map((s) => s.textContent.trim()).filter(Boolean) : [];
    const authorName = nameSpans.find((t) => t && !t.startsWith('@')) || '';

    const social = ($(SEL.socialContext, article)?.textContent || '').toLowerCase();
    const isRepost = /reposted|retweeted/.test(social);
    const isPinned = /pinned/.test(social);
    const isReply = /replying to/i.test(article.textContent || '');
    const isAd = !!$(SEL.placement, article) || $$('span', article).some((s) => s.textContent.trim() === 'Ad');

    const time = $('time', article)?.getAttribute('datetime') || '';
    const text = $(SEL.tweetText, article)?.textContent?.trim() || '';
    const quotedText = $$(SEL.tweetText, article)[1]?.textContent?.trim() || '';
    const hasMedia = !!$('[data-testid="tweetPhoto"], [data-testid="videoPlayer"], video', article);

    return {
      id,
      url: `https://x.com${link.split('?')[0]}`,
      author,
      authorName,
      text,
      quotedText,
      hasMedia,
      timestamp: time,
      likes: parseCount($(`${SEL.like}, ${SEL.unlike}`, article)?.getAttribute('aria-label')),
      reposts: parseCount($(`${SEL.retweet}, ${SEL.unretweet}`, article)?.getAttribute('aria-label')),
      isRepost,
      isPinned,
      isReply,
      isAd,
      isMine: !!ownHandle && author === ownHandle,
      liked: !!$(SEL.unlike, article),
      reposted: !!$(SEL.unretweet, article),
    };
  };

  const eligible = (info) => {
    if (!info) return { ok: false, why: 'unreadable' };
    if (info.isAd) return { ok: false, why: 'ad' };
    const f = CONFIG.filters;
    if (f.excludePinned && info.isPinned) return { ok: false, why: 'pinned' };
    if (info.isRepost && !f.includeReposts) return { ok: false, why: 'repost' };
    if (CONFIG.actions.delete && !info.isMine) return { ok: false, why: 'not yours' };
    if (!info.text && !info.hasMedia) return { ok: false, why: 'empty' };

    if (info.timestamp) {
      const posted = new Date(info.timestamp);
      if (f.olderThanDays && posted > new Date(Date.now() - f.olderThanDays * 86400000)) {
        return { ok: false, why: `newer than ${f.olderThanDays}d` };
      }
      if (f.beforeDate && posted >= new Date(f.beforeDate)) return { ok: false, why: `not before ${f.beforeDate}` };
      if (f.afterDate && posted <= new Date(f.afterDate)) return { ok: false, why: `not after ${f.afterDate}` };
    }
    if (f.maxLikes !== null && f.maxLikes !== '' && info.likes > Number(f.maxLikes)) {
      return { ok: false, why: `${info.likes} likes` };
    }
    if (f.maxReposts !== null && f.maxReposts !== '' && info.reposts > Number(f.maxReposts)) {
      return { ok: false, why: `${info.reposts} reposts` };
    }
    const lower = `${info.text}\n${info.quotedText}`.toLowerCase();
    const blocked = (f.excludeKeywords || []).filter(Boolean).find((k) => lower.includes(String(k).toLowerCase()));
    if (blocked) return { ok: false, why: `excluded by "${blocked}"` };

    return { ok: true };
  };

  // ═══════════════════════════════════════════════════════════
  // REPLY TEXT
  // ═══════════════════════════════════════════════════════════

  const fillTemplate = (t, info) => t
    .replace(/\{author\}/g, `@${info.author}`)
    .replace(/\{name\}/g, info.authorName || `@${info.author}`);

  const nextTemplate = (info) => {
    const list = CONFIG.reply.templates.filter((t) => t && t.trim());
    if (list.length === 0) return '';
    let idx;
    if (list.length === 1) idx = 0;
    else { do { idx = Math.floor(Math.random() * list.length); } while (idx === STATE.lastTemplate); }
    STATE.lastTemplate = idx;
    return fillTemplate(list[idx], info);
  };

  const systemPrompt = () => {
    const c = CONFIG.reply;
    return [
      c.persona ? c.persona.trim() : 'You are a real person replying to posts on X (Twitter).',
      '',
      'Your brief from the account owner, which you follow exactly:',
      `"""${(c.prompt || 'Reply naturally and specifically to the post.').trim()}"""`,
      '',
      'Hard rules:',
      '- Under 280 characters. One to two short sentences unless the brief asks for more.',
      '- Respond to what THIS post actually says. Reference a concrete detail from it.',
      '- Never open with "Great post", "Love this", "So true", "Thanks for sharing", or any generic praise.',
      '- No hashtags' + (c.allowHashtags ? ' unless the brief asks for them.' : '.'),
      c.allowEmoji ? '- Emoji only where a person would naturally use one. Never more than one.' : '- No emoji.',
      '- No links, no mentions of being an AI, no disclaimers, no quotation marks around the reply.',
      '- Do not repeat the post back. Add something: a reaction, a question, a related fact.',
      '- Match the register of the post: serious gets thoughtful, funny gets witty, technical gets precise.',
      '',
      'Output ONLY the reply text. No preamble, no labels, no markdown.',
    ].join('\n');
  };

  const userPrompt = (info) => {
    const parts = [`Post by @${info.author}${info.authorName ? ` (${info.authorName})` : ''}:`, `"""${info.text}"""`];
    if (info.quotedText) parts.push('', 'It quotes this post:', `"""${info.quotedText}"""`);
    if (info.hasMedia) parts.push('', '(The post has an image or video attached that you cannot see. Do not pretend to describe it.)');
    if (STATE.recentReplies.length) {
      parts.push('', 'Replies you already posted in this session. Do not reuse their openers or structure:');
      for (const r of STATE.recentReplies.slice(-5)) parts.push(`- ${r}`);
    }
    parts.push('', 'Write the reply now.');
    return parts.join('\n');
  };

  const sanitize = (raw) => {
    if (!raw) return '';
    let t = String(raw).trim();
    t = t.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
    const unquote = (s) => { const m = s.match(/^["“'‘](.*)["”'’]$/s); return m ? m[1].trim() : s; };
    t = unquote(t);
    t = t.replace(/^(reply|comment|response|answer)\s*[:-]\s*/i, '').trim();
    t = unquote(t);
    if (!CONFIG.reply.allowHashtags) t = t.replace(/(^|\s)#[\w]+/g, '$1');
    t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if ([...t].length > 280) {
      const clipped = [...t].slice(0, 280).join('');
      const end = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('! '), clipped.lastIndexOf('? '));
      t = (end > 140 ? clipped.slice(0, end + 1) : clipped.slice(0, clipped.lastIndexOf(' ') || 280)).trim();
    }
    return t;
  };

  const isGeneric = (t) => {
    const lower = (t || '').toLowerCase().replace(/^[^a-z]+/, '');
    return lower.length < 2 || GENERIC_OPENERS.some((o) => lower.startsWith(o));
  };

  /** Direct call to xAI. The only LLM host x.com's CSP lets the page reach. */
  const completeViaXai = async (messages) => {
    const c = CONFIG.reply;
    if (!c.apiKey) throw new Error('No xAI API key. Paste one in the panel (console.x.ai) or switch provider to bridge.');
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.apiKey}` },
      body: JSON.stringify({ model: c.model || 'grok-3-mini', messages, temperature: c.temperature, max_tokens: 160 }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`xAI ${res.status}: ${detail.slice(0, 200)}`);
    }
    const data = await res.json();
    return (data.choices?.[0]?.message?.content || '').trim();
  };

  /** Through the XActions extension, which can reach any provider. */
  const completeViaBridge = (messages) => new Promise((resolve, reject) => {
    if (!window.__xactions_bridge_loaded) {
      reject(new Error('XActions extension not detected on this tab. Install extension/ and reload, or use provider xai.'));
      return;
    }
    const c = CONFIG.reply;
    const id = `xsw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const timer = setTimeout(() => { cleanup(); reject(new Error('Extension bridge timed out after 45s')); }, 45000);
    const onMessage = (event) => {
      if (event.source !== window || !event.data || event.data.source !== 'xactions-extension') return;
      if (event.data.type !== 'LLM_RESPONSE' || event.data.id !== id) return;
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(String(event.data.text || '').trim());
    };
    const cleanup = () => { clearTimeout(timer); window.removeEventListener('message', onMessage); };
    window.addEventListener('message', onMessage);
    window.postMessage({
      source: 'xactions-page',
      type: 'LLM_REQUEST',
      id,
      request: {
        provider: c.bridgeProvider,
        apiKey: c.apiKey,
        baseUrl: c.bridgeBaseUrl,
        model: c.model,
        messages,
        temperature: c.temperature,
        maxTokens: 160,
      },
    }, '*');
  });

  const aiReply = async (info) => {
    const complete = CONFIG.reply.provider === 'bridge' ? completeViaBridge : completeViaXai;
    let last = '';
    for (let attempt = 1; attempt <= 2; attempt++) {
      const messages = [
        { role: 'system', content: systemPrompt() },
        { role: 'user', content: userPrompt(info) },
      ];
      if (attempt === 2 && last) {
        messages.push({ role: 'assistant', content: last });
        messages.push({ role: 'user', content: 'That reads as generic. Rewrite it so it references a specific detail from the post and opens differently. Output only the reply.' });
      }
      let raw;
      try {
        raw = await complete(messages);
      } catch (err) {
        if (/Content Security Policy|Failed to fetch|NetworkError/i.test(err.message)) {
          throw new Error(`Blocked by x.com's CSP: ${err.message}. Use provider 'xai' or the extension bridge.`, { cause: err });
        }
        throw err;
      }
      const text = sanitize(raw);
      last = text;
      if (text && !isGeneric(text) && !STATE.recentReplies.includes(text)) return text;
    }
    return last;
  };

  const buildReply = async (info) => {
    if (CONFIG.reply.mode === 'ai') {
      try {
        const text = await aiReply(info);
        if (text) return { text, source: 'ai' };
        throw new Error('model returned nothing usable');
      } catch (err) {
        addLog(`  🤖 AI reply failed: ${err.message}`, 'warn');
        if (!CONFIG.reply.fallbackToTemplates) return null;
      }
    }
    const text = nextTemplate(info);
    return text ? { text, source: 'template' } : null;
  };

  // ═══════════════════════════════════════════════════════════
  // ACTIONS (each verifies the DOM changed, and watches for throttling)
  // ═══════════════════════════════════════════════════════════

  const openCaretMenu = async (article) => {
    const caret = $(SEL.caret, article);
    if (!caret) throw new Error('post menu button missing');
    caret.click();
    const menu = await waitFor(SEL.menu, 5000);
    if (!menu) { pressEscape(); throw new Error('post menu did not open'); }
    await sleep(jitter([250, 600]));
    return menu;
  };

  const menuItemMatching = (pattern) =>
    $$(SEL.menuItem).find((item) => pattern.test((item.textContent || '').trim()));

  /**
   * Delete one of your own posts. A repost is not deletable, it is undone, and X labels
   * that menu entry differently, so both wordings are accepted.
   */
  const doDelete = async (article, info) => {
    if (!info.isMine) throw new Error(`@${info.author} is not you, refusing to delete`);
    if (CONFIG.dryRun) return 'dry';

    await openCaretMenu(article);
    const item = menuItemMatching(/^\s*delete\b/i)
      || menuItemMatching(/\bdelete post\b/i)
      || (info.isRepost ? menuItemMatching(/undo repost|undo retweet/i) : null);
    if (!item) {
      pressEscape();
      throw new Error('no Delete entry in the menu (not your post, or X changed the menu)');
    }
    const isUndoRepost = /undo repost|undo retweet/i.test(item.textContent || '');
    item.click();
    await sleep(jitter([400, 900]));

    if (!isUndoRepost) {
      const confirm = await waitFor(SEL.confirmSheet, 5000);
      if (!confirm) { pressEscape(); throw new Error('delete confirmation never appeared'); }
      confirm.click();
      const closed = await waitForGone(SEL.confirmSheet, 8000);
      if (!closed) { pressEscape(); throw new Error('confirmation stayed open, delete was probably rejected'); }
    }

    await sleep(jitter([600, 1200]));
    await afterClickCheck();
    // X usually pulls the row out of the timeline. It sometimes leaves it until the next
    // fetch, so a still-connected article is not a failure, only worth noting.
    const gone = await waitUntil(() => !article.isConnected, 3000);
    return gone ? 'done' : 'done-stale';
  };

  const doLike = async (article, info) => {
    if (info.liked) return 'already';
    const btn = $(SEL.like, article);
    if (!btn) throw new Error('like button missing');
    if (CONFIG.dryRun) return 'dry';
    btn.click();
    await sleep(jitter(speed().action));
    await afterClickCheck();
    if (!$(SEL.unlike, article)) throw new Error('like did not register');
    return 'done';
  };

  const doRepost = async (article, info) => {
    if (info.reposted) return 'already';
    const btn = $(SEL.retweet, article);
    if (!btn) throw new Error('repost button missing');
    if (CONFIG.dryRun) return 'dry';
    btn.click();
    const confirm = await waitFor(SEL.retweetConfirm, 4000);
    if (!confirm) { pressEscape(); throw new Error('repost menu did not open'); }
    await sleep(jitter([400, 900]));
    confirm.click();
    await sleep(jitter(speed().action));
    await afterClickCheck();
    if (!$(SEL.unretweet, article)) throw new Error('repost did not register');
    return 'done';
  };

  const doReply = async (article, info) => {
    const reply = await buildReply(info);
    if (!reply) return { status: 'skipped', text: '' };
    if (CONFIG.dryRun) return { status: 'dry', text: reply.text, source: reply.source };

    const btn = $(SEL.reply, article);
    if (!btn) throw new Error('reply button missing');
    btn.click();
    const box = await waitFor(SEL.tweetBox, 6000);
    if (!box) { pressEscape(); throw new Error('reply composer did not open'); }
    await sleep(jitter([500, 1000]));
    box.focus();
    document.execCommand('insertText', false, reply.text);
    await sleep(jitter([600, 1200]));

    if (!(box.textContent || '').trim()) { pressEscape(); throw new Error('could not type into the composer'); }

    const send = await waitFor(SEL.tweetButton, 3000);
    if (!send || send.getAttribute('aria-disabled') === 'true' || send.disabled) {
      pressEscape();
      throw new Error('post button not enabled');
    }
    send.click();
    const closed = await waitForGone(SEL.tweetBox, 10000);
    await afterClickCheck();
    if (!closed) { pressEscape(); throw new Error('composer stayed open, reply probably rejected'); }
    STATE.recentReplies.push(reply.text);
    if (STATE.recentReplies.length > 30) STATE.recentReplies.shift();
    return { status: 'done', text: reply.text, source: reply.source };
  };

  // ═══════════════════════════════════════════════════════════
  // THE SWEEP
  // ═══════════════════════════════════════════════════════════

  const waitWhilePaused = async () => {
    while (STATE.paused && !STATE.stopRequested) await sleep(300);
  };

  const countdown = async (seconds, label) => {
    for (let s = seconds; s > 0 && !STATE.stopRequested; s--) {
      setStatus(`${label} ${s}s`);
      await sleep(1000);
      await waitWhilePaused();
    }
  };

  const wantedActions = () => {
    if (CONFIG.actions.delete) return ['delete'];
    return ['like', 'repost', 'reply'].filter((a) => CONFIG.actions[a]);
  };

  const alreadyDone = (info) => {
    const record = STATE.done.get(info.id);
    if (!record) return false;
    return wantedActions().every((a) => {
      if (a === 'delete') return record.deleted;
      if (a === 'like') return record.liked || info.liked;
      if (a === 'repost') return record.reposted || info.reposted;
      return record.replied;
    });
  };

  const processArticle = async (article, info) => {
    const record = STATE.done.get(info.id) || { deleted: false, liked: false, reposted: false, replied: false, at: 0 };
    const result = { id: info.id, url: info.url, author: info.author, at: info.timestamp, text: info.text.slice(0, 200), actions: [], errors: [] };
    let failed = false;

    highlight(article);
    article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(jitter([400, 900]));
    addLog(`📝 @${info.author} ${info.timestamp ? info.timestamp.slice(0, 10) : ''}: "${info.text.slice(0, 70)}${info.text.length > 70 ? '…' : ''}"`);

    const step = async (name, fn) => {
      try {
        const out = await fn();
        const status = typeof out === 'string' ? out : out.status;
        const label = status === 'dry' ? '[DRY] would ' : '';
        if (status === 'done' || status === 'done-stale' || status === 'dry') {
          result.actions.push(name);
          if (name === 'delete') addLog(`  🗑️ ${label}delete${status === 'done-stale' ? ' (still listed, search index lags)' : ''}`);
          if (name === 'like') addLog(`  ❤️ ${label}like`);
          if (name === 'repost') addLog(`  🔁 ${label}repost`);
          if (name === 'reply') { result.reply = out.text; addLog(`  💬 ${label}reply (${out.source}): "${out.text}"`); }
          if (status !== 'dry') {
            if (name === 'delete') { STATE.deleted++; record.deleted = true; }
            if (name === 'like') { STATE.liked++; record.liked = true; }
            if (name === 'repost') { STATE.reposted++; record.reposted = true; }
            if (name === 'reply') { STATE.replied++; record.replied = true; }
          }
        } else if (status === 'already') {
          addLog(`  ${name}: already done, skipping`, 'dim');
          if (name === 'like') record.liked = true;
          if (name === 'repost') record.reposted = true;
        } else if (status === 'skipped') {
          addLog('  reply: nothing to post (no template and no AI text)', 'warn');
        }
        await sleep(jitter(speed().action));
      } catch (err) {
        failed = true;
        result.errors.push(`${name}: ${err.message}`);
        addLog(`  ⚠️ ${name} failed: ${err.message}`, 'warn');
        if (/pushed back/i.test(err.message)) throw err;
      }
    };

    for (const action of wantedActions()) {
      if (STATE.stopRequested) break;
      if (action === 'delete') await step('delete', () => doDelete(article, info));
      if (action === 'like') await step('like', () => doLike(article, info));
      if (action === 'repost') await step('repost', () => doRepost(article, info));
      if (action === 'reply') await step('reply', () => doReply(article, info));
      if (action === 'delete' && !article.isConnected) break;
    }

    record.at = Date.now();
    if (!CONFIG.dryRun) { STATE.done.set(info.id, record); persist(); }
    if (failed) { STATE.failed++; STATE.consecutiveFailures++; } else STATE.consecutiveFailures = 0;
    unhighlight();
    return result;
  };

  const clickRetryIfShown = () => {
    const btn = $$(SEL.retryButton).find((b) => /retry|try again/i.test(b.textContent || ''));
    if (btn) { btn.click(); return true; }
    return false;
  };

  /** One top-to-bottom walk of the result list currently loaded. */
  const sweepOnePass = async () => {
    STATE.seenThisPass = new Set();
    let acted = 0;
    let idleRounds = 0;
    let sinceRest = 0;

    window.scrollTo({ top: 0 });
    await sleep(1200);

    while (!STATE.stopRequested) {
      await waitWhilePaused();
      if (STATE.stopRequested) break;
      if (CONFIG.maxPosts && STATE.processed >= CONFIG.maxPosts) { addLog(`Reached maxPosts (${CONFIG.maxPosts}).`); break; }

      if (STATE.consecutiveFailures >= CONFIG.maxConsecutiveFailures) {
        addLog(`🛑 ${STATE.consecutiveFailures} failures in a row. X is probably throttling. Backing off ${CONFIG.backoffSeconds}s.`, 'warn');
        await countdown(CONFIG.backoffSeconds, '⏳ Backing off');
        STATE.consecutiveFailures = 0;
        if (STATE.stopRequested) break;
      }

      const fresh = [];
      for (const article of $$(SEL.article)) {
        const info = readArticle(article);
        if (!info || STATE.seenThisPass.has(info.id)) continue;
        STATE.seenThisPass.add(info.id);
        if (alreadyDone(info)) { STATE.skipped++; continue; }
        const check = eligible(info);
        if (!check.ok) { STATE.skipped++; addLog(`  · skip ${info.id} (${check.why})`, 'dim'); continue; }
        fresh.push({ article, info });
      }

      if (fresh.length === 0) {
        if ($(SEL.emptyState)) { addLog('X reports no results for this query.'); break; }
        idleRounds++;
        if (clickRetryIfShown()) { addLog('Result list errored, clicked retry', 'warn'); await sleep(3000); }
        if (idleRounds >= 6) { addLog('No new results after 6 scrolls. End of this pass.'); break; }
        window.scrollBy({ top: Math.round(window.innerHeight * 0.9), behavior: 'smooth' });
        await sleep(jitter([1500, 2600]));
        continue;
      }
      idleRounds = 0;

      for (const { article, info } of fresh) {
        await waitWhilePaused();
        if (STATE.stopRequested) break;
        if (CONFIG.maxPosts && STATE.processed >= CONFIG.maxPosts) break;
        if (!article.isConnected) { STATE.seenThisPass.delete(info.id); continue; }

        let result;
        try {
          result = await processArticle(article, info);
        } catch (err) {
          STATE.failed++;
          STATE.consecutiveFailures = CONFIG.maxConsecutiveFailures;
          result = { id: info.id, url: info.url, errors: [err.message] };
          addLog(`  ${err.message}`, 'warn');
          pressEscape();
        }
        STATE.results.push(result);
        STATE.processed++;
        if (result.actions && result.actions.length) acted++;
        sinceRest++;
        updateStats();

        if (CONFIG.restEvery && sinceRest >= CONFIG.restEvery) {
          sinceRest = 0;
          addLog(`☕ Resting ${CONFIG.restForSeconds}s after ${CONFIG.restEvery} posts`);
          await countdown(CONFIG.restForSeconds, '☕ Resting');
        } else {
          await countdown(Math.round(jitter(betweenRange()) / 1000), '⏱ Next post in');
        }
        if (STATE.consecutiveFailures >= CONFIG.maxConsecutiveFailures) break;
      }

      window.scrollBy({ top: Math.round(window.innerHeight * 0.8), behavior: 'smooth' });
      await sleep(jitter([1200, 2200]));
    }

    return acted;
  };

  const sweep = async () => {
    STATE.running = true;
    STATE.stopRequested = false;
    STATE.startedAt = Date.now();
    STATE.results = [];
    STATE.pass = 0;
    STATE.processed = 0; STATE.deleted = 0; STATE.liked = 0; STATE.reposted = 0; STATE.replied = 0;
    STATE.skipped = 0; STATE.failed = 0; STATE.consecutiveFailures = 0;
    setButtons('running');

    const actions = wantedActions();
    if (actions.length === 0) {
      addLog('Nothing to do: no action is ticked.', 'warn');
      STATE.running = false; setButtons('idle'); return;
    }

    try {
      STATE.query = buildQuery();
      addLog(`🚀 Sweeping search: ${STATE.query}${CONFIG.dryRun ? ' (DRY RUN, nothing is touched)' : ''}`);
      addLog(`   actions=${actions.join('+')} tab=${CONFIG.query.latest ? 'Latest' : 'Top'} speed=${CONFIG.speed} passes=${CONFIG.passes} max=${CONFIG.maxPosts || '∞'}`);
      if (STATE.done.size) addLog(`   ${STATE.done.size} posts from earlier runs will be skipped`);

      if (CONFIG.actions.delete && !CONFIG.dryRun) {
        if (!ownHandle) {
          addLog('Could not read the signed-in handle from the sidebar. Every delete would be refused, so stopping here.', 'warn');
          return;
        }
        if (!/\bfrom:/i.test(STATE.query)) {
          addLog(`This query has no from: operator. Only your own posts can be deleted, so everything else will be skipped. Consider from:${ownHandle}.`, 'warn');
        }
        addLog('⚠️ LIVE DELETE. This is permanent. Hit Stop in the next 5 seconds to cancel.', 'warn');
        await countdown(5, '⚠️ Deleting in');
        if (STATE.stopRequested) { addLog('Stopped before anything was deleted.'); return; }
      }

      await goToQuery(STATE.query);

      let emptyPasses = 0;
      for (let pass = 1; pass <= Math.max(1, CONFIG.passes); pass++) {
        if (STATE.stopRequested) break;
        if (CONFIG.maxPosts && STATE.processed >= CONFIG.maxPosts) break;
        STATE.pass = pass;
        setStatus(`Pass ${pass}/${CONFIG.passes}`);
        addLog(`── Pass ${pass}/${CONFIG.passes} ──`, 'dim');

        const acted = await sweepOnePass();
        addLog(`   Pass ${pass}: acted on ${acted} post${acted === 1 ? '' : 's'}`);

        emptyPasses = acted === 0 ? emptyPasses + 1 : 0;
        if (emptyPasses >= CONFIG.stopAfterEmptyPasses) {
          addLog(`Nothing left to act on after ${emptyPasses} passes. Search is exhausted.`);
          break;
        }
        if (pass < CONFIG.passes && !STATE.stopRequested) {
          addLog('🔄 Re-running the query for the next slice of results...', 'dim');
          const refreshed = await refreshResults();
          if (!refreshed) { addLog('Could not re-run the query, stopping after this pass.', 'warn'); break; }
        }
      }
    } catch (err) {
      addLog(`❌ ${err.message}`, 'warn');
    } finally {
      STATE.running = false;
      STATE.paused = false;
      unhighlight();
      setButtons('idle');
      persist();
      summarize();
      if (CONFIG.exportOnFinish && STATE.results.length) exportResults();
    }
  };

  const summarize = () => {
    const mins = ((Date.now() - (STATE.startedAt || Date.now())) / 60000).toFixed(1);
    addLog('════════════════════════════════');
    addLog(`✅ ${STATE.stopRequested ? 'Stopped' : 'Finished'} in ${mins} min: ${STATE.processed} posts over ${STATE.pass} pass${STATE.pass === 1 ? '' : 'es'}`);
    addLog(`   🗑️ ${STATE.deleted} deleted · ❤️ ${STATE.liked} liked · 🔁 ${STATE.reposted} reposted · 💬 ${STATE.replied} replied · skipped ${STATE.skipped} · failed ${STATE.failed}`);
    if (CONFIG.dryRun) addLog('   Dry run: nothing was touched. Untick "Dry run" and start again.', 'warn');
    else if (STATE.deleted) addLog('   X search can keep listing deleted posts for a few minutes. Re-run later to catch stragglers.', 'dim');
    setStatus(STATE.stopRequested ? 'Stopped' : 'Done');
  };

  const exportResults = () => {
    const payload = {
      query: STATE.query,
      ranAt: new Date().toISOString(),
      dryRun: CONFIG.dryRun,
      actions: wantedActions(),
      stats: {
        processed: STATE.processed, deleted: STATE.deleted, liked: STATE.liked,
        reposted: STATE.reposted, replied: STATE.replied, skipped: STATE.skipped, failed: STATE.failed,
      },
      posts: STATE.results,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `xactions-search-sweep-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    addLog(`📥 Exported ${STATE.results.length} rows`);
  };

  // ═══════════════════════════════════════════════════════════
  // PANEL
  // ═══════════════════════════════════════════════════════════

  const css = `
    #xsw-panel{position:fixed;right:16px;bottom:16px;width:390px;max-height:88vh;display:flex;flex-direction:column;z-index:2147483000;background:#0f1419;color:#e7e9ea;border:1px solid #2f3336;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;transition:transform .2s ease,opacity .2s ease}
    #xsw-panel.xsw-min .xsw-body,#xsw-panel.xsw-min .xsw-foot{display:none}
    #xsw-panel *{box-sizing:border-box}
    .xsw-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #2f3336;cursor:move;user-select:none}
    .xsw-head b{font-size:14px;flex:1}
    .xsw-head button{background:transparent;border:0;color:#8b98a5;font-size:16px;cursor:pointer;padding:2px 6px;border-radius:6px;transition:background .15s,color .15s}
    .xsw-head button:hover{background:#1d2226;color:#fff}
    .xsw-head button:focus-visible,#xsw-panel .xsw-btn:focus-visible,#xsw-panel .xsw-chip:focus-visible{outline:2px solid #1d9bf0;outline-offset:2px}
    .xsw-body{overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
    .xsw-body::-webkit-scrollbar{width:5px}.xsw-body::-webkit-scrollbar-thumb{background:#2f3336;border-radius:4px}
    .xsw-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .xsw-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .xsw-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .xsw-label{color:#8b98a5;font-size:12px;display:block;margin-bottom:3px}
    .xsw-chips{display:flex;flex-wrap:wrap;gap:6px}
    .xsw-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border:1px solid #2f3336;border-radius:999px;cursor:pointer;user-select:none;transition:background .15s,border-color .15s,opacity .15s}
    .xsw-chip:hover{border-color:#536471}
    .xsw-chip.on{background:#1d9bf0;border-color:#1d9bf0;color:#fff}
    .xsw-chip.on.danger{background:#f4212e;border-color:#f4212e}
    .xsw-chip.locked{opacity:.35;cursor:not-allowed}
    .xsw-chip input{display:none}
    #xsw-panel input[type=text],#xsw-panel input[type=password],#xsw-panel input[type=number],#xsw-panel select,#xsw-panel textarea{width:100%;background:#16181c;color:#e7e9ea;border:1px solid #2f3336;border-radius:8px;padding:7px 9px;font:inherit;outline:none;transition:border-color .15s}
    #xsw-panel input:focus,#xsw-panel select:focus,#xsw-panel textarea:focus{border-color:#1d9bf0}
    #xsw-panel textarea{resize:vertical;min-height:54px}
    .xsw-section{border:1px solid #2f3336;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px}
    .xsw-section>b{font-size:12px;color:#8b98a5;text-transform:uppercase;letter-spacing:.04em}
    .xsw-toggle{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer}
    .xsw-toggle input{accent-color:#1d9bf0;width:16px;height:16px}
    .xsw-danger-on{border-color:#f4212e}
    .xsw-query{background:#16181c;border-radius:8px;padding:7px 9px;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;color:#1d9bf0;word-break:break-word}
    .xsw-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:5px}
    .xsw-stat{background:#16181c;border-radius:10px;padding:8px 4px;text-align:center}
    .xsw-stat b{display:block;font-size:16px}
    .xsw-stat span{font-size:10px;color:#8b98a5}
    .xsw-bar{height:6px;background:#16181c;border-radius:3px;overflow:hidden}
    .xsw-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#1d9bf0,#7856ff);transition:width .3s}
    .xsw-status{font-size:12px;color:#8b98a5;min-height:16px}
    .xsw-log{background:#000;border-radius:10px;padding:8px;height:158px;overflow:auto;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word}
    .xsw-log::-webkit-scrollbar{width:4px}.xsw-log::-webkit-scrollbar-thumb{background:#2f3336}
    .xsw-log .warn{color:#ffd166}.xsw-log .dim{color:#536471}
    .xsw-foot{display:flex;gap:8px;padding:12px 14px;border-top:1px solid #2f3336}
    .xsw-btn{flex:1;padding:9px 10px;border-radius:999px;border:1px solid #2f3336;background:#16181c;color:#e7e9ea;font-weight:600;cursor:pointer;transition:background .15s,transform .05s}
    .xsw-btn:hover:not(:disabled){background:#1d2226}.xsw-btn:active:not(:disabled){transform:scale(.98)}
    .xsw-btn:disabled{opacity:.4;cursor:not-allowed}
    .xsw-btn.primary{background:#1d9bf0;border-color:#1d9bf0;color:#fff}.xsw-btn.primary:hover:not(:disabled){background:#1a8cd8}
    .xsw-btn.danger{background:#f4212e;border-color:#f4212e;color:#fff}.xsw-btn.danger:hover:not(:disabled){background:#d81b28}
    .xsw-hint{font-size:11px;color:#8b98a5}
    .xsw-hint a{color:#1d9bf0}
    .xsw-target{outline:2px solid #1d9bf0!important;outline-offset:2px;border-radius:12px}
    @media (max-width:480px){#xsw-panel{right:8px;left:8px;width:auto}}
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'xsw-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'XActions search sweep');
  panel.innerHTML = `
    <div class="xsw-head" id="xsw-drag">
      <b>🔍 Search sweep</b>
      <button id="xsw-min" title="Minimise" aria-label="Minimise panel">_</button>
      <button id="xsw-close" title="Close" aria-label="Close panel">✕</button>
    </div>
    <div class="xsw-body">
      <div class="xsw-section">
        <b>Search</b>
        <div class="xsw-grid">
          <label><span class="xsw-label">From</span><input type="text" id="xsw-from" placeholder="me" value="${esc(CONFIG.query.from)}"></label>
          <label><span class="xsw-label">Mentions</span><input type="text" id="xsw-mentions" placeholder="someone" value="${esc(CONFIG.query.mentions)}"></label>
        </div>
        <label><span class="xsw-label">Extra operators</span><input type="text" id="xsw-contains" placeholder="filter:replies -filter:links" value="${esc(CONFIG.query.contains)}"></label>
        <label><span class="xsw-label">Or a raw query (wins over the fields above)</span><input type="text" id="xsw-raw" placeholder="from:me @someone" value="${esc(CONFIG.query.raw)}"></label>
        <label class="xsw-toggle"><span>Latest tab (f=live)</span><input type="checkbox" id="xsw-latest" ${CONFIG.query.latest ? 'checked' : ''}></label>
        <div class="xsw-query" id="xsw-preview"></div>
        <button class="xsw-btn" id="xsw-run-query">Run this search now</button>
      </div>

      <div class="xsw-section" id="xsw-actions-section">
        <b>Do what</b>
        <div class="xsw-chips">
          <label class="xsw-chip danger ${CONFIG.actions.delete ? 'on' : ''}" id="xsw-chip-delete" tabindex="0"><input type="checkbox" id="xsw-a-delete" ${CONFIG.actions.delete ? 'checked' : ''}>🗑️ Delete</label>
          <label class="xsw-chip ${CONFIG.actions.like ? 'on' : ''}" id="xsw-chip-like" tabindex="0"><input type="checkbox" id="xsw-a-like" ${CONFIG.actions.like ? 'checked' : ''}>❤️ Like</label>
          <label class="xsw-chip ${CONFIG.actions.repost ? 'on' : ''}" id="xsw-chip-repost" tabindex="0"><input type="checkbox" id="xsw-a-repost" ${CONFIG.actions.repost ? 'checked' : ''}>🔁 Repost</label>
          <label class="xsw-chip ${CONFIG.actions.reply ? 'on' : ''}" id="xsw-chip-reply" tabindex="0"><input type="checkbox" id="xsw-a-reply" ${CONFIG.actions.reply ? 'checked' : ''}>💬 Reply</label>
        </div>
        <div class="xsw-hint" id="xsw-actions-hint"></div>
        <label class="xsw-toggle" id="xsw-dry-wrap"><span><b>Dry run</b> (touch nothing)</span><input type="checkbox" id="xsw-dry" ${CONFIG.dryRun ? 'checked' : ''}></label>
      </div>

      <div class="xsw-section">
        <b>Pacing</b>
        <div class="xsw-grid3">
          <label><span class="xsw-label">Max posts</span><input type="number" id="xsw-max" min="0" value="${CONFIG.maxPosts}"></label>
          <label><span class="xsw-label">Passes</span><input type="number" id="xsw-passes" min="1" max="30" value="${CONFIG.passes}"></label>
          <label><span class="xsw-label">Speed</span>
            <select id="xsw-speed">
              ${Object.keys(SPEEDS).map((s) => `<option value="${s}" ${CONFIG.speed === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="xsw-hint">Search returns a slice per request. Each extra pass re-runs the query for the next slice.</div>
      </div>

      <div class="xsw-section">
        <b>Only touch posts that</b>
        <div class="xsw-grid3">
          <label><span class="xsw-label">Older than (d)</span><input type="number" id="xsw-older" min="0" value="${CONFIG.filters.olderThanDays ?? ''}"></label>
          <label><span class="xsw-label">Likes at most</span><input type="number" id="xsw-maxlikes" min="0" value="${CONFIG.filters.maxLikes ?? ''}"></label>
          <label><span class="xsw-label">Reposts at most</span><input type="number" id="xsw-maxreposts" min="0" value="${CONFIG.filters.maxReposts ?? ''}"></label>
        </div>
        <label><span class="xsw-label">Never touch posts containing (comma separated)</span><input type="text" id="xsw-exclude" value="${esc(CONFIG.filters.excludeKeywords.join(', '))}"></label>
        <label class="xsw-toggle"><span>Include reposts</span><input type="checkbox" id="xsw-incl-reposts" ${CONFIG.filters.includeReposts ? 'checked' : ''}></label>
      </div>

      <div class="xsw-section" id="xsw-reply-section">
        <b>Reply text</b>
        <label><span class="xsw-label">Source</span>
          <select id="xsw-reply-mode">
            <option value="templates" ${CONFIG.reply.mode === 'templates' ? 'selected' : ''}>Templates</option>
            <option value="ai" ${CONFIG.reply.mode === 'ai' ? 'selected' : ''}>AI written</option>
          </select>
        </label>
        <label><span class="xsw-label">Templates, one per line. {author} and {name} are filled in.</span><textarea id="xsw-templates">${esc(CONFIG.reply.templates.join('\n'))}</textarea></label>
        <label><span class="xsw-label">AI brief</span><textarea id="xsw-prompt">${esc(CONFIG.reply.prompt)}</textarea></label>
        <div class="xsw-grid">
          <label><span class="xsw-label">Provider</span>
            <select id="xsw-provider">
              <option value="xai" ${CONFIG.reply.provider === 'xai' ? 'selected' : ''}>xAI (works here)</option>
              <option value="bridge" ${CONFIG.reply.provider === 'bridge' ? 'selected' : ''}>Extension bridge</option>
            </select>
          </label>
          <label><span class="xsw-label">Model</span><input type="text" id="xsw-model" value="${esc(CONFIG.reply.model)}"></label>
        </div>
        <label><span class="xsw-label">API key</span><input type="password" id="xsw-key" placeholder="xai-..." value="${esc(CONFIG.reply.apiKey)}"></label>
        <label class="xsw-toggle"><span>Remember key in this browser</span><input type="checkbox" id="xsw-remember" ${savedKey ? 'checked' : ''}></label>
        <button class="xsw-btn" id="xsw-test-ai">Test on a visible post</button>
      </div>

      <div class="xsw-stats">
        <div class="xsw-stat"><b id="xsw-s-processed">0</b><span>seen</span></div>
        <div class="xsw-stat"><b id="xsw-s-deleted">0</b><span>deleted</span></div>
        <div class="xsw-stat"><b id="xsw-s-engaged">0</b><span>engaged</span></div>
        <div class="xsw-stat"><b id="xsw-s-skipped">0</b><span>skipped</span></div>
        <div class="xsw-stat"><b id="xsw-s-failed">0</b><span>failed</span></div>
      </div>
      <div class="xsw-bar"><i id="xsw-bar"></i></div>
      <div class="xsw-status" id="xsw-status" role="status" aria-live="polite">Idle</div>
      <div class="xsw-log" id="xsw-log" aria-live="polite"></div>
    </div>
    <div class="xsw-foot">
      <button class="xsw-btn primary" id="xsw-start">Start</button>
      <button class="xsw-btn" id="xsw-pause" disabled>Pause</button>
      <button class="xsw-btn danger" id="xsw-stop" disabled>Stop</button>
      <button class="xsw-btn" id="xsw-export">Export</button>
    </div>
  `;
  document.body.appendChild(panel);

  const el = (id) => document.getElementById(id);

  function addLog(message, kind = '') {
    const box = el('xsw-log');
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const line = document.createElement('div');
    if (kind) line.className = kind;
    line.textContent = `${time}  ${message}`;
    box.appendChild(line);
    while (box.childElementCount > 500) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
    const method = kind === 'warn' ? 'warn' : 'log';
    console[method](`[search sweep] ${message}`);
  }

  function setStatus(text) { el('xsw-status').textContent = text; }

  function updateStats() {
    el('xsw-s-processed').textContent = STATE.processed;
    el('xsw-s-deleted').textContent = STATE.deleted;
    el('xsw-s-engaged').textContent = STATE.liked + STATE.reposted + STATE.replied;
    el('xsw-s-skipped').textContent = STATE.skipped;
    el('xsw-s-failed').textContent = STATE.failed;
    const pct = CONFIG.maxPosts
      ? Math.min(100, (STATE.processed / CONFIG.maxPosts) * 100)
      : Math.min(100, (STATE.pass / Math.max(1, CONFIG.passes)) * 100);
    el('xsw-bar').style.width = `${pct}%`;
  }

  function setButtons(mode) {
    const running = mode === 'running';
    el('xsw-start').disabled = running;
    el('xsw-pause').disabled = !running;
    el('xsw-stop').disabled = !running;
    el('xsw-pause').textContent = 'Pause';
  }

  let highlighted = null;
  function highlight(article) {
    unhighlight();
    article.classList.add('xsw-target');
    highlighted = article;
  }
  function unhighlight() {
    if (highlighted) highlighted.classList.remove('xsw-target');
    highlighted = null;
  }

  // ── Panel <-> CONFIG ──────────────────────────────────────

  const numberOrNull = (id) => {
    const raw = el(id).value.trim();
    return raw === '' ? null : Number(raw);
  };

  function readPanel() {
    CONFIG.query.from = el('xsw-from').value.trim();
    CONFIG.query.mentions = el('xsw-mentions').value.trim();
    CONFIG.query.contains = el('xsw-contains').value.trim();
    CONFIG.query.raw = el('xsw-raw').value.trim();
    CONFIG.query.latest = el('xsw-latest').checked;

    CONFIG.actions.delete = el('xsw-a-delete').checked;
    CONFIG.actions.like = el('xsw-a-like').checked;
    CONFIG.actions.repost = el('xsw-a-repost').checked;
    CONFIG.actions.reply = el('xsw-a-reply').checked;
    CONFIG.dryRun = el('xsw-dry').checked;

    CONFIG.maxPosts = Math.max(0, Number(el('xsw-max').value) || 0);
    CONFIG.passes = Math.max(1, Number(el('xsw-passes').value) || 1);
    CONFIG.speed = el('xsw-speed').value;

    CONFIG.filters.olderThanDays = numberOrNull('xsw-older');
    CONFIG.filters.maxLikes = numberOrNull('xsw-maxlikes');
    CONFIG.filters.maxReposts = numberOrNull('xsw-maxreposts');
    CONFIG.filters.excludeKeywords = el('xsw-exclude').value.split(',').map((s) => s.trim()).filter(Boolean);
    CONFIG.filters.includeReposts = el('xsw-incl-reposts').checked;

    CONFIG.reply.mode = el('xsw-reply-mode').value;
    CONFIG.reply.templates = el('xsw-templates').value.split('\n').map((s) => s.trim()).filter(Boolean);
    CONFIG.reply.prompt = el('xsw-prompt').value.trim();
    CONFIG.reply.provider = el('xsw-provider').value;
    CONFIG.reply.model = el('xsw-model').value.trim();
    CONFIG.reply.apiKey = el('xsw-key').value.trim();

    try {
      if (el('xsw-remember').checked && CONFIG.reply.apiKey) localStorage.setItem(KEY_STORAGE, CONFIG.reply.apiKey);
      else if (!el('xsw-remember').checked) localStorage.removeItem(KEY_STORAGE);
    } catch { /* private mode, keep the key in memory only */ }
  }

  function syncPanel() {
    // Delete and the engagement actions are mutually exclusive: a post you are removing is
    // not one you also want to like.
    const deleting = el('xsw-a-delete').checked;
    for (const name of ['like', 'repost', 'reply']) {
      const input = el(`xsw-a-${name}`);
      const chip = el(`xsw-chip-${name}`);
      if (deleting && input.checked) input.checked = false;
      chip.classList.toggle('locked', deleting);
      chip.classList.toggle('on', input.checked);
    }
    el('xsw-chip-delete').classList.toggle('on', deleting);

    readPanel();

    el('xsw-preview').textContent = buildQuery() || '(empty query)';
    el('xsw-reply-section').style.display = CONFIG.actions.reply ? '' : 'none';
    el('xsw-dry-wrap').classList.toggle('xsw-danger-on', !CONFIG.dryRun);

    const chosen = wantedActions();
    el('xsw-actions-hint').textContent = chosen.length === 0
      ? 'Pick at least one action.'
      : deleting
        ? `Deletes only your own posts (@${ownHandle || 'unknown'}). Permanent, no undo.`
        : `Will ${chosen.join(', ')} every matching result.`;
    updateStats();
  }

  for (const id of ['xsw-from', 'xsw-mentions', 'xsw-contains', 'xsw-raw', 'xsw-latest', 'xsw-max',
    'xsw-passes', 'xsw-speed', 'xsw-older', 'xsw-maxlikes', 'xsw-maxreposts', 'xsw-exclude',
    'xsw-incl-reposts', 'xsw-dry', 'xsw-reply-mode', 'xsw-templates', 'xsw-prompt', 'xsw-provider',
    'xsw-model', 'xsw-key', 'xsw-remember']) {
    el(id).addEventListener('input', syncPanel);
    el(id).addEventListener('change', syncPanel);
  }
  for (const name of ['delete', 'like', 'repost', 'reply']) {
    const chip = el(`xsw-chip-${name}`);
    el(`xsw-a-${name}`).addEventListener('change', syncPanel);
    chip.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const input = el(`xsw-a-${name}`);
      if (chip.classList.contains('locked')) return;
      input.checked = !input.checked;
      syncPanel();
    });
  }

  // ── Buttons ───────────────────────────────────────────────

  el('xsw-min').addEventListener('click', () => panel.classList.toggle('xsw-min'));
  el('xsw-close').addEventListener('click', () => {
    STATE.stopRequested = true;
    unhighlight();
    panel.remove();
    style.remove();
    delete window.XSearchSweep;
  });

  el('xsw-run-query').addEventListener('click', async () => {
    syncPanel();
    const q = buildQuery();
    if (!q) { addLog('Nothing to search for. Fill in From or Mentions, or paste a raw query.', 'warn'); return; }
    setStatus('Running search...');
    try {
      await goToQuery(q);
      STATE.query = q;
      addLog(`🔎 Showing: ${q}`);
      setStatus('Search loaded');
    } catch (err) {
      addLog(err.message, 'warn');
      setStatus('Search failed');
    }
  });

  el('xsw-start').addEventListener('click', () => {
    if (STATE.running) return;
    syncPanel();
    if (wantedActions().length === 0) { addLog('Pick at least one action first.', 'warn'); return; }
    if (CONFIG.actions.delete && !CONFIG.dryRun) {
      const ok = window.confirm(
        `Permanently delete every post @${ownHandle || '?'} has that matches:\n\n  ${buildQuery()}\n\n` +
        `This cannot be undone. ${CONFIG.maxPosts ? `At most ${CONFIG.maxPosts} posts this run.` : 'There is no limit set on this run.'}`,
      );
      if (!ok) { addLog('Cancelled. Nothing was deleted.'); return; }
    }
    sweep();
  });

  el('xsw-pause').addEventListener('click', () => {
    STATE.paused = !STATE.paused;
    el('xsw-pause').textContent = STATE.paused ? 'Resume' : 'Pause';
    setStatus(STATE.paused ? 'Paused' : 'Running');
    addLog(STATE.paused ? '⏸ Paused' : '▶ Resumed');
  });

  el('xsw-stop').addEventListener('click', () => {
    STATE.stopRequested = true;
    STATE.paused = false;
    setStatus('Stopping after the current post...');
    addLog('🛑 Stopping after the current post');
  });

  el('xsw-export').addEventListener('click', () => {
    if (!STATE.results.length) { addLog('Nothing to export yet.', 'warn'); return; }
    exportResults();
  });

  el('xsw-test-ai').addEventListener('click', async () => {
    syncPanel();
    const first = $$(SEL.article).map(readArticle).find((info) => info && eligible(info).ok);
    if (!first) { addLog('No usable post on screen to test with. Scroll so one is visible.', 'warn'); return; }
    setStatus('Asking the model...');
    try {
      const text = await aiReply(first);
      addLog(`🧪 For "${first.text.slice(0, 60)}…" the model wrote: "${text}"`);
      setStatus('AI test ok');
    } catch (err) {
      addLog(`🧪 AI test failed: ${err.message}`, 'warn');
      setStatus('AI test failed');
    }
  });

  // ── Drag ──────────────────────────────────────────────────

  (() => {
    const head = el('xsw-drag');
    let drag = null;
    head.addEventListener('mousedown', (event) => {
      if (event.target.tagName === 'BUTTON') return;
      const rect = panel.getBoundingClientRect();
      drag = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
      event.preventDefault();
    });
    window.addEventListener('mousemove', (event) => {
      if (!drag) return;
      panel.style.left = `${Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, event.clientX - drag.dx))}px`;
      panel.style.top = `${Math.max(0, Math.min(window.innerHeight - 40, event.clientY - drag.dy))}px`;
    });
    window.addEventListener('mouseup', () => { drag = null; });
  })();

  // Alt+Shift+S start/stop, Alt+Shift+P pause
  window.addEventListener('keydown', (event) => {
    if (!event.altKey || !event.shiftKey) return;
    const key = event.key.toLowerCase();
    if (key === 's') { event.preventDefault(); (STATE.running ? el('xsw-stop') : el('xsw-start')).click(); }
    if (key === 'p' && STATE.running) { event.preventDefault(); el('xsw-pause').click(); }
  });

  // ═══════════════════════════════════════════════════════════
  // CONSOLE API
  // ═══════════════════════════════════════════════════════════

  window.XSearchSweep = {
    config: CONFIG,
    state: STATE,
    query: buildQuery,
    goTo: (q) => goToQuery(q || buildQuery()),
    /** Every result currently on screen, with the verdict the filters give it. */
    preview: () => $$(SEL.article)
      .map(readArticle)
      .filter(Boolean)
      .map((info) => ({ ...info, verdict: eligible(info), alreadyDone: alreadyDone(info) })),
    start: () => el('xsw-start').click(),
    pause: () => el('xsw-pause').click(),
    stop: () => el('xsw-stop').click(),
    export: exportResults,
    testAi: () => el('xsw-test-ai').click(),
    forget: () => { STATE.done.clear(); persist(); addLog('Cleared the memory of earlier runs.'); },
  };

  syncPanel();
  addLog(`Loaded${ownHandle ? ` as @${ownHandle}` : ''}. ${STATE.done.size ? `${STATE.done.size} posts from earlier runs will be skipped.` : ''}`);
  addLog('Dry run is ON. Read one pass of the log, then untick it. Alt+Shift+S starts and stops.', 'dim');
  if (!ownHandle) addLog('Could not read your handle from the sidebar. Deletes will be refused until it can.', 'warn');
})();

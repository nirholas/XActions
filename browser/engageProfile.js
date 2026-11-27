// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// Like, repost, and comment on every post in a feed: a profile, a search, a list, a hashtag, or home
// Paste in DevTools console on x.com/USERNAME, a search, a list, a hashtag, or x.com/home
// by nichxbt
//
// What it does: walks the feed you have open, top to bottom, and for every post it has
// not touched yet it likes, reposts, and/or replies. Comments come from your templates
// or from an LLM given a one-line brief ("be supportive, ask a follow-up question").
// Progress is saved per feed, so a reload picks up where it stopped.
//
// Works on: a profile (x.com/USERNAME), a profile's replies (/with_replies), search
// results, a list (x.com/i/lists/ID), a hashtag, and your home timeline. On feeds that
// mix authors, the author and keyword filters in the panel are what keep a sweep aimed.
//
// AI comments from the console:
//   x.com's Content-Security-Policy only lets the page talk to a short list of hosts,
//   and https://api.x.ai is on it. So `provider: 'xai'` (Grok) works straight from the
//   console with your xAI key. OpenRouter, OpenAI, Anthropic and Ollama are blocked by
//   that CSP; for those install the XActions browser extension (extension/) and set
//   `provider: 'bridge'`, or run `npx xactions engage USERNAME --comment --prompt "..."`
//   from a terminal, which has no such restriction.
//
// A floating panel appears when you paste. Everything below can also be changed there.
// Start in dry run. Read the log. Then switch it off.

/**
 * ============================================================
 * ⚡ Engage Profile
 * ============================================================
 *
 * @name        engageProfile.js
 * @description Like, repost and comment on every post of one profile, with comments from your templates or from an LLM.
 * @title       Engage Profile
 * @category    engage
 * @page        x.com/<username>
 * @writes      true
 * @aliases     scripts/engageProfile.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-08-27
 * @repository  https://github.com/nirholas/XActions
 * ============================================================
 */
(() => {
  'use strict';

  if (document.getElementById('xep-panel')) {
    console.log('⚡ Profile sweep already loaded. Use the panel, or window.XEngage.');
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION (the panel edits this live)
  // ═══════════════════════════════════════════════════════════

  const CONFIG = {
    dryRun: true,                  // Log what would happen, touch nothing. SET FALSE TO RUN.

    actions: {
      like: true,
      repost: true,
      comment: true,
    },

    maxPosts: 0,                   // 0 = the whole feed. Set e.g. 50 for a first run.
    includeReplies: false,         // Also engage replies (a profile's /with_replies tab, or replies in a search)
    includeReposts: false,         // Also engage posts that are reposts of someone else
    skipAlreadyEngaged: true,      // Skip a post for an action you already did on it

    // Filters. They matter most on feeds that mix authors: search, lists, hashtags, home.
    onlyFrom: [],                  // Only these authors, e.g. ['nasa', 'nichxbt']. Empty = anyone.
    skipUsers: [],                 // Never these authors
    keywords: [],                  // Post must contain one of these words. Empty = any post.
    skipKeywords: [],              // Skip posts containing any of these words
    minLikes: 0,                   // Only posts with at least this many likes
    maxLikes: 0,                   // Only posts with at most this many likes (0 = no ceiling)
    skipVerified: false,           // Skip blue-check accounts (they notice you least)

    // Pacing. 'safe' is what a fast human looks like. Faster presets get accounts limited.
    speed: 'safe',                 // 'stealth' | 'safe' | 'moderate' | 'fast'
    restEvery: 20,                 // After this many posts, take a longer break
    restForSeconds: 90,            // Length of that break
    maxConsecutiveFailures: 3,     // Back off after this many failed actions in a row
    backoffSeconds: 300,           // How long to back off (X soft-limits usually clear in 5-15 min)

    comments: {
      mode: 'templates',           // 'templates' | 'ai'

      // Template mode. {author} becomes @handle, {name} the display name.
      templates: [
        'Been following your work for a while, this one lands. What pushed you to write it up now?',
        'The part about the details here is what most people skip. Appreciate you spelling it out.',
        'Saving this. Curious how you would apply it at a smaller scale, {name}?',
        'Strong take. The counterargument I keep hearing is timing. How do you think about that?',
        'This matches what I have seen too. The second-order effects are the interesting part.',
      ],

      // AI mode. The brief is the only thing most people need to change.
      prompt: 'Reply as a thoughtful builder who genuinely follows this account. Be specific to the post, add one idea or one honest question, keep it under two sentences, no hype words.',
      persona: '',                 // Optional: 'You are @yourhandle, a founder building X.'
      provider: 'xai',             // 'xai' (works from the console) | 'bridge' (XActions extension, any provider)
      apiKey: '',                  // xAI key for provider 'xai'. Stored only if "remember" is ticked in the panel.
      model: 'grok-3-mini',        // xAI model. For 'bridge' this is the bridge provider's model.
      bridgeProvider: 'openrouter', // For 'bridge': openrouter | openai | anthropic | ollama | xai | custom
      bridgeBaseUrl: '',           // Ignored by the extension: set a custom URL in the extension popup
      temperature: 0.9,
      allowHashtags: false,
      allowEmoji: true,
      fallbackToTemplates: true,   // If the model fails for a post, use a template instead of skipping
    },
  };

  const SPEEDS = {
    stealth:  { between: [45000, 90000], action: [2500, 5000] },
    safe:     { between: [15000, 35000], action: [1800, 3500] },
    moderate: { between: [7000, 15000],  action: [1200, 2500] },
    fast:     { between: [3000, 7000],   action: [900, 1800]  },
  };

  const SEL = {
    article: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    userName: '[data-testid="User-Name"]',
    socialContext: '[data-testid="socialContext"]',
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
    retryButton: '[data-testid="primaryColumn"] [role="button"]',
    placement: '[data-testid="placementTracking"]',
  };

  const GENERIC_OPENERS = [
    'great post', 'great point', 'great thread', 'great take', 'love this', 'this is so true',
    'so true', 'well said', "couldn't agree more", 'could not agree more', 'thanks for sharing',
    'thank you for sharing', 'interesting take', 'interesting perspective', 'as an ai', 'as a language model',
  ];

  // ═══════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════

  /**
   * Work out which feed is on screen.
   *
   * The sweep behaves the same everywhere, but three things depend on the
   * feed: what to call it in the panel, which progress file to use, and
   * whether a post by someone other than the page owner counts as a repost.
   * Reserved first path segments (i, home, search, explore, ...) are what
   * separate a profile from every other page X serves under one slug.
   */
  const RESERVED = new Set([
    'i', 'home', 'explore', 'search', 'notifications', 'messages', 'settings',
    'compose', 'bookmarks', 'hashtag', 'topics', 'lists', 'communities',
    'jobs', 'about', 'tos', 'privacy', 'login', 'signup', 'intent',
  ]);

  const target = (() => {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);

    const profile = path.match(/^\/([A-Za-z0-9_]{1,15})(?:\/(with_replies|media|highlights|likes))?\/?$/);
    if (profile && !RESERVED.has(profile[1].toLowerCase())) {
      const handle = profile[1].toLowerCase();
      const tab = profile[2] || 'posts';
      return { kind: 'profile', handle, tab, label: `@${handle}${tab === 'with_replies' ? ' + replies' : ''}`, key: `profile_${handle}` };
    }

    const list = path.match(/^\/i\/lists\/(\d+)/);
    if (list) return { kind: 'list', listId: list[1], label: `list ${list[1]}`, key: `list_${list[1]}` };

    const hashtag = path.match(/^\/hashtag\/([^/?]+)/);
    if (hashtag) {
      const tag = decodeURIComponent(hashtag[1]).toLowerCase();
      return { kind: 'hashtag', tag, label: `#${tag}`, key: `hashtag_${tag.replace(/[^a-z0-9]/g, '')}` };
    }

    if (path === '/search') {
      const query = params.get('q') || '';
      const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'query';
      return { kind: 'search', query, label: `search "${query}"`, key: `search_${slug}` };
    }

    if (path === '/home') return { kind: 'home', label: 'your home timeline', key: 'home' };
    if (path === '/notifications' || path.startsWith('/notifications/')) {
      return { kind: 'notifications', label: 'your notifications', key: 'notifications' };
    }
    if (path === '/i/bookmarks') return { kind: 'bookmarks', label: 'your bookmarks', key: 'bookmarks' };

    return null;
  })();

  if (!target) {
    console.error([
      '❌ This page has no post feed to sweep. Open one of:',
      '   x.com/USERNAME                 a profile',
      '   x.com/USERNAME/with_replies    a profile including its replies',
      '   x.com/search?q=...             search results',
      '   x.com/i/lists/ID               a list',
      '   x.com/hashtag/TAG              a hashtag',
      '   x.com/home                     your timeline',
    ].join('\n'));
    return;
  }
  if (target.tab === 'with_replies') CONFIG.includeReplies = true;
  // On a mixed feed every post is by someone else, so treating "not the page
  // owner" as a repost would filter the entire page out.
  const MIXED_FEED = target.kind !== 'profile';
  if (MIXED_FEED) CONFIG.includeReposts = true;

  const STORAGE_KEY = `xactions_engage_${target.key}`;
  const KEY_STORAGE = 'xactions_engage_ai_key';

  const persisted = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {}; } catch { return {}; }
  })();

  const STATE = {
    running: false,
    paused: false,
    stopRequested: false,
    done: new Map(Object.entries(persisted.done || {})),  // tweetId -> { liked, reposted, commented, at }
    seenThisRun: new Set(),
    processed: 0,
    liked: 0,
    reposted: 0,
    commented: 0,
    skipped: 0,
    failed: 0,
    consecutiveFailures: 0,
    startedAt: null,
    undoStack: [],
    results: [],
    recentComments: [],
    lastTemplate: -1,
  };

  // Your own handle, read from the sidebar account switcher. A home-timeline
  // sweep that replies to your own posts looks unhinged, and X counts it.
  const me = (() => {
    const link = document.querySelector('[data-testid="AppTabBar_Profile_Link"], [data-testid="SideNav_AccountSwitcher_Button"] a[href^="/"]');
    const href = link?.getAttribute('href') || '';
    const m = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
    return m ? m[1].toLowerCase() : '';
  })();

  const savedKey = (() => { try { return localStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; } })();
  if (savedKey && !CONFIG.comments.apiKey) CONFIG.comments.apiKey = savedKey;

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        target: target.key,
        updatedAt: Date.now(),
        done: Object.fromEntries(STATE.done),
      }));
    } catch (e) {
      log(`Could not save progress: ${e.message}`, 'warn');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = ([min, max]) => Math.floor(min + ((Math.random() + Math.random()) / 2) * (max - min));
  const speed = () => SPEEDS[CONFIG.speed] || SPEEDS.safe;
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

  // ═══════════════════════════════════════════════════════════
  // TWEET READING
  // ═══════════════════════════════════════════════════════════

  const readArticle = (article) => {
    // The permalink is the anchor wrapping the timestamp. Picking that rather
    // than the first /status/ link in the DOM is what makes this work on a
    // mixed feed: a quoted post inside the article also carries a status link,
    // and engaging the quote instead of the post is a silent wrong action.
    const timeAnchor = $('time', article)?.closest('a[href*="/status/"]');
    const statusLinks = $$('a[href*="/status/"]', article)
      .map((a) => a.getAttribute('href') || '')
      .filter((h) => /^\/[A-Za-z0-9_]+\/status\/\d+/.test(h));
    const ownLink = timeAnchor?.getAttribute('href') || statusLinks[0];
    if (!ownLink) return null;
    const idMatch = ownLink.match(/\/status\/(\d+)/);
    const authorMatch = ownLink.match(/^\/([A-Za-z0-9_]+)\/status\//);
    if (!idMatch) return null;

    const nameEl = $(SEL.userName, article);
    const nameSpans = nameEl ? $$('span', nameEl).map((s) => s.textContent.trim()).filter(Boolean) : [];
    const authorName = nameSpans.find((t) => !t.startsWith('@')) || '';
    const author = (authorMatch ? authorMatch[1] : '').toLowerCase();

    const social = ($(SEL.socialContext, article)?.textContent || '').toLowerCase();
    const isRepost = /reposted|retweeted/.test(social)
      || (target.kind === 'profile' && author !== target.handle);
    const isVerified = !!$('[data-testid="icon-verified"]', article)
      || !!$('svg[aria-label*="Verified"]', article);
    const isPinned = /pinned/.test(social);
    const isReply = /replying to/i.test(article.textContent || '') && !isRepost;
    const isAd = !!$(SEL.placement, article) || $$('span', article).some((s) => s.textContent.trim() === 'Ad');

    const text = $(SEL.tweetText, article)?.textContent?.trim() || '';
    const hasMedia = !!$('[data-testid="tweetPhoto"], [data-testid="videoPlayer"], video', article);
    const quotedText = $$('[data-testid="tweetText"]', article)[1]?.textContent?.trim() || '';

    return {
      id: idMatch[1],
      url: `https://x.com${ownLink.split('?')[0]}`,
      author,
      authorName,
      text,
      quotedText,
      hasMedia,
      isRepost,
      isPinned,
      isReply,
      isAd,
      isVerified,
      likes: (() => {
        const label = $('[data-testid="like"], [data-testid="unlike"]', article)?.getAttribute('aria-label') || '';
        const n = label.match(/([\d,.]+)\s*(K|M)?\s*(likes?|Like)/i);
        if (!n) return 0;
        const base = parseFloat(n[1].replace(/,/g, '')) || 0;
        return n[2] === 'M' ? base * 1e6 : n[2] === 'K' ? base * 1e3 : base;
      })(),
      liked: !!$(SEL.unlike, article),
      reposted: !!$(SEL.unretweet, article),
    };
  };

  const listHas = (list, value) => list.some((entry) => String(entry).replace(/^@/, '').toLowerCase() === value);
  const textHas = (list, text) => list.some((word) => text.includes(String(word).toLowerCase()));

  const eligible = (info) => {
    if (!info) return { ok: false, why: 'unreadable' };
    if (info.isAd) return { ok: false, why: 'ad' };
    if (info.isRepost && !CONFIG.includeReposts) return { ok: false, why: 'repost' };
    if (info.isReply && !CONFIG.includeReplies) return { ok: false, why: 'reply' };
    if (me && info.author === me) return { ok: false, why: 'your own post' };
    if (CONFIG.skipUsers.length && listHas(CONFIG.skipUsers, info.author)) return { ok: false, why: `@${info.author} is on the skip list` };
    if (CONFIG.onlyFrom.length && !listHas(CONFIG.onlyFrom, info.author)) return { ok: false, why: `@${info.author} is not on the only-from list` };
    if (CONFIG.skipVerified && info.isVerified) return { ok: false, why: 'verified account' };
    const lowerText = info.text.toLowerCase();
    if (CONFIG.keywords.length && !textHas(CONFIG.keywords, lowerText)) return { ok: false, why: 'no keyword match' };
    if (CONFIG.skipKeywords.length && textHas(CONFIG.skipKeywords, lowerText)) return { ok: false, why: 'matched a skip keyword' };
    if (CONFIG.minLikes && info.likes < CONFIG.minLikes) return { ok: false, why: `only ${info.likes} likes` };
    if (CONFIG.maxLikes && info.likes > CONFIG.maxLikes) return { ok: false, why: `${info.likes} likes, above the ceiling` };
    if (!info.text && !info.hasMedia) return { ok: false, why: 'empty' };
    return { ok: true };
  };

  // ═══════════════════════════════════════════════════════════
  // COMMENT SOURCES
  // ═══════════════════════════════════════════════════════════

  const fillTemplate = (t, info) => t
    .replace(/\{author\}/g, `@${info.author}`)
    .replace(/\{name\}/g, info.authorName || `@${info.author}`);

  const nextTemplate = (info) => {
    const list = CONFIG.comments.templates.filter((t) => t && t.trim());
    if (list.length === 0) return '';
    let idx;
    if (list.length === 1) idx = 0;
    else {
      do { idx = Math.floor(Math.random() * list.length); } while (idx === STATE.lastTemplate);
    }
    STATE.lastTemplate = idx;
    return fillTemplate(list[idx], info);
  };

  const systemPrompt = () => {
    const c = CONFIG.comments;
    return [
      c.persona ? c.persona.trim() : 'You are a real person replying to posts on X (Twitter).',
      '',
      'Your brief from the account owner, which you follow exactly:',
      `"""${(c.prompt || 'Reply naturally and specifically to the post.').trim()}"""`,
      '',
      'Hard rules:',
      '- Under 280 characters. One to two short sentences unless the brief asks for more.',
      '- Respond to what THIS post actually says. Quote or reference a concrete detail from it.',
      '- Never open with "Great post", "Love this", "So true", "Thanks for sharing", or any generic praise.',
      '- No hashtags' + (c.allowHashtags ? ' unless the brief asks for them.' : '.'),
      c.allowEmoji ? '- Emoji only where a person would naturally use one. Never more than one.' : '- No emoji.',
      '- No links, no mentions of being an AI, no disclaimers, no quotation marks around the reply.',
      '- Do not repeat the post back. Add something: a reaction, a question, a related fact, a joke.',
      '- Match the register of the post: serious gets thoughtful, funny gets witty, technical gets precise.',
      '',
      'Output ONLY the reply text. No preamble, no labels, no markdown.',
    ].join('\n');
  };

  const userPrompt = (info) => {
    const parts = [`Post by @${info.author}${info.authorName ? ` (${info.authorName})` : ''}:`, `"""${info.text}"""`];
    if (info.quotedText) parts.push('', 'It quotes this post:', `"""${info.quotedText}"""`);
    if (info.hasMedia) parts.push('', '(The post has an image or video attached that you cannot see. Do not pretend to describe it.)');
    if (STATE.recentComments.length) {
      parts.push('', 'Replies you already posted in this session. Do not reuse their openers or structure:');
      for (const r of STATE.recentComments.slice(-5)) parts.push(`- ${r}`);
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
    if (!CONFIG.comments.allowHashtags) t = t.replace(/(^|\s)#[\w]+/g, '$1');
    t = t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if ([...t].length > 280) {
      const clipped = [...t].slice(0, 280).join('');
      const end = Math.max(clipped.lastIndexOf('. '), clipped.lastIndexOf('! '), clipped.lastIndexOf('? '));
      t = end > 140 ? clipped.slice(0, end + 1) : clipped.slice(0, clipped.lastIndexOf(' ') || 280);
      t = t.trim();
    }
    return t;
  };

  const isGeneric = (t) => {
    const lower = (t || '').toLowerCase().replace(/^[^a-z]+/, '');
    return lower.length < 2 || GENERIC_OPENERS.some((o) => lower.startsWith(o));
  };

  /** Direct call to xAI. The only LLM host x.com's CSP lets the page reach. */
  const completeViaXai = async (messages) => {
    const c = CONFIG.comments;
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
    const c = CONFIG.comments;
    const id = `xep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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

  const aiComment = async (info) => {
    const complete = CONFIG.comments.provider === 'bridge' ? completeViaBridge : completeViaXai;
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
          throw new Error(`Blocked by x.com's CSP: ${err.message}. Use provider 'xai', the extension bridge, or the CLI (npx xactions engage).`, { cause: err });
        }
        throw err;
      }
      const text = sanitize(raw);
      last = text;
      if (text && !isGeneric(text) && !STATE.recentComments.includes(text)) return text;
    }
    return last;
  };

  const buildComment = async (info) => {
    if (CONFIG.comments.mode === 'ai') {
      try {
        const text = await aiComment(info);
        if (text) return { text, source: 'ai' };
        throw new Error('model returned nothing usable');
      } catch (err) {
        addLog(`  🤖 AI comment failed: ${err.message}`, 'warn');
        if (!CONFIG.comments.fallbackToTemplates) return null;
      }
    }
    const text = nextTemplate(info);
    return text ? { text, source: 'template' } : null;
  };

  // ═══════════════════════════════════════════════════════════
  // ACTIONS (each verifies the DOM changed, and watches for throttling)
  // ═══════════════════════════════════════════════════════════

  const afterClickCheck = async () => {
    const toast = throttleToast();
    if (toast) throw new Error(`X pushed back: "${toast}"`);
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

  const doComment = async (article, info) => {
    const comment = await buildComment(info);
    if (!comment) return { status: 'skipped', text: '' };
    if (CONFIG.dryRun) return { status: 'dry', text: comment.text, source: comment.source };

    const btn = $(SEL.reply, article);
    if (!btn) throw new Error('reply button missing');
    btn.click();
    const box = await waitFor(SEL.tweetBox, 6000);
    if (!box) { pressEscape(); throw new Error('reply composer did not open'); }
    await sleep(jitter([500, 1000]));
    box.focus();
    document.execCommand('insertText', false, comment.text);
    await sleep(jitter([600, 1200]));

    const typed = (box.textContent || '').trim();
    if (!typed) { pressEscape(); throw new Error('could not type into the composer'); }

    const send = await waitFor(SEL.tweetButton, 3000);
    if (!send || send.getAttribute('aria-disabled') === 'true' || send.disabled) {
      pressEscape();
      throw new Error('post button not enabled');
    }
    send.click();
    const closed = await waitForGone(SEL.tweetBox, 8000);
    await afterClickCheck();
    if (!closed) { pressEscape(); throw new Error('composer stayed open, reply probably rejected'); }
    STATE.recentComments.push(comment.text);
    if (STATE.recentComments.length > 30) STATE.recentComments.shift();
    return { status: 'done', text: comment.text, source: comment.source };
  };

  const undoAll = async () => {
    if (STATE.undoStack.length === 0) { addLog('Nothing to undo.', 'warn'); return; }
    addLog(`↩ Undoing ${STATE.undoStack.length} likes/reposts (replies are left in place, delete those by hand)...`, 'warn');
    let undone = 0;
    for (const entry of [...STATE.undoStack].reverse()) {
      const article = entry.article.isConnected ? entry.article : null;
      if (!article) continue;
      article.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(600);
      try {
        if (entry.type === 'like') { $(SEL.unlike, article)?.click(); undone++; }
        if (entry.type === 'repost') {
          $(SEL.unretweet, article)?.click();
          const c = await waitFor(SEL.unretweetConfirm, 3000);
          if (c) { c.click(); undone++; }
        }
        const rec = STATE.done.get(entry.id);
        if (rec) { rec[entry.type === 'like' ? 'liked' : 'reposted'] = false; STATE.done.set(entry.id, rec); }
      } catch (e) {
        addLog(`  undo failed on ${entry.id}: ${e.message}`, 'warn');
      }
      await sleep(jitter([1200, 2500]));
    }
    STATE.undoStack = [];
    persist();
    addLog(`↩ Undid ${undone} actions.`);
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

  const processArticle = async (article, info) => {
    const record = STATE.done.get(info.id) || { liked: false, reposted: false, commented: false, at: 0 };
    const wants = {
      like: CONFIG.actions.like && !(CONFIG.skipAlreadyEngaged && (record.liked || info.liked)),
      repost: CONFIG.actions.repost && !(CONFIG.skipAlreadyEngaged && (record.reposted || info.reposted)),
      comment: CONFIG.actions.comment && !(CONFIG.skipAlreadyEngaged && record.commented),
    };
    if (!wants.like && !wants.repost && !wants.comment) {
      STATE.skipped++;
      return { id: info.id, skipped: 'already engaged' };
    }

    highlight(article);
    article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(jitter([500, 1100]));
    addLog(`📝 ${info.id} @${info.author}: "${info.text.slice(0, 70)}${info.text.length > 70 ? '…' : ''}"`);

    const result = { id: info.id, url: info.url, text: info.text.slice(0, 140), actions: [], errors: [] };
    let failed = false;

    const step = async (name, fn) => {
      try {
        const out = await fn();
        const status = typeof out === 'string' ? out : out.status;
        if (status === 'done' || status === 'dry') {
          result.actions.push(name);
          if (typeof out !== 'string' && out.text) result.comment = out.text;
          const label = status === 'dry' ? '[DRY] would ' : '';
          if (name === 'like') addLog(`  ❤️ ${label}like`);
          if (name === 'repost') addLog(`  🔁 ${label}repost`);
          if (name === 'comment') addLog(`  💬 ${label}reply (${out.source}): "${out.text}"`);
          if (status === 'done') {
            if (name === 'like') { STATE.liked++; record.liked = true; STATE.undoStack.push({ type: 'like', id: info.id, article }); }
            if (name === 'repost') { STATE.reposted++; record.reposted = true; STATE.undoStack.push({ type: 'repost', id: info.id, article }); }
            if (name === 'comment') { STATE.commented++; record.commented = true; }
          }
        } else if (status === 'already') {
          addLog(`  ${name}: already done, skipping`);
          if (name === 'like') record.liked = true;
          if (name === 'repost') record.reposted = true;
        } else if (status === 'skipped') {
          addLog(`  ${name}: nothing to post (no template and no AI text)`, 'warn');
        }
        await sleep(jitter(speed().action));
      } catch (err) {
        failed = true;
        result.errors.push(`${name}: ${err.message}`);
        addLog(`  ⚠️ ${name} failed: ${err.message}`, 'warn');
        if (/pushed back/i.test(err.message)) throw err;
      }
    };

    if (wants.like) await step('like', () => doLike(article, info));
    if (wants.repost) await step('repost', () => doRepost(article, info));
    if (wants.comment) await step('comment', () => doComment(article, info));

    record.at = Date.now();
    if (!CONFIG.dryRun) { STATE.done.set(info.id, record); persist(); }
    if (failed) { STATE.failed++; STATE.consecutiveFailures++; }
    else STATE.consecutiveFailures = 0;
    unhighlight();
    return result;
  };

  const clickRetryIfShown = () => {
    const btn = $$(SEL.retryButton).find((b) => /retry|try again/i.test(b.textContent || ''));
    if (btn) { btn.click(); return true; }
    return false;
  };

  const sweep = async () => {
    STATE.running = true;
    STATE.stopRequested = false;
    STATE.startedAt = Date.now();
    STATE.results = [];
    STATE.seenThisRun = new Set();
    STATE.processed = 0; STATE.liked = 0; STATE.reposted = 0; STATE.commented = 0; STATE.skipped = 0; STATE.failed = 0;
    STATE.consecutiveFailures = 0;
    setButtons('running');
    addLog(`🚀 Sweeping ${target.label}${CONFIG.dryRun ? ' (DRY RUN, nothing is touched)' : ''}`);
    addLog(`   like=${CONFIG.actions.like} repost=${CONFIG.actions.repost} comment=${CONFIG.actions.comment} (${CONFIG.comments.mode}) speed=${CONFIG.speed} max=${CONFIG.maxPosts || '∞'}`);
    if (STATE.done.size) addLog(`   ${STATE.done.size} posts already done from earlier runs will be skipped`);

    window.scrollTo({ top: 0 });
    await sleep(1200);

    let idleRounds = 0;
    let sinceRest = 0;
    try {
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
          if (!info || STATE.seenThisRun.has(info.id)) continue;
          STATE.seenThisRun.add(info.id);
          const check = eligible(info);
          if (!check.ok) { addLog(`  · skip ${info.id} (${check.why})`, 'dim'); continue; }
          fresh.push({ article, info });
        }

        if (fresh.length === 0) {
          idleRounds++;
          if (clickRetryIfShown()) { addLog('Timeline errored, clicked retry', 'warn'); await sleep(3000); }
          if (idleRounds >= 6) { addLog('No new posts after 6 scrolls. End of profile.'); break; }
          window.scrollBy({ top: Math.round(window.innerHeight * 0.9), behavior: 'smooth' });
          await sleep(jitter([1500, 2600]));
          continue;
        }
        idleRounds = 0;

        for (const { article, info } of fresh) {
          await waitWhilePaused();
          if (STATE.stopRequested) break;
          if (CONFIG.maxPosts && STATE.processed >= CONFIG.maxPosts) break;
          if (!article.isConnected) { STATE.seenThisRun.delete(info.id); continue; }

          let result;
          try {
            result = await processArticle(article, info);
          } catch (err) {
            STATE.failed++;
            STATE.consecutiveFailures = CONFIG.maxConsecutiveFailures;
            result = { id: info.id, errors: [err.message] };
            addLog(`  ${err.message}`, 'warn');
            pressEscape();
          }
          STATE.results.push(result);
          if (!result.skipped) {
            STATE.processed++;
            sinceRest++;
            updateStats();
            if (CONFIG.restEvery && sinceRest >= CONFIG.restEvery) {
              sinceRest = 0;
              addLog(`☕ Resting ${CONFIG.restForSeconds}s after ${CONFIG.restEvery} posts`);
              await countdown(CONFIG.restForSeconds, '☕ Resting');
            } else {
              const wait = jitter(speed().between);
              await countdown(Math.round(wait / 1000), '⏱ Next post in');
            }
          } else {
            updateStats();
          }
          if (STATE.consecutiveFailures >= CONFIG.maxConsecutiveFailures) break;
        }

        window.scrollBy({ top: Math.round(window.innerHeight * 0.8), behavior: 'smooth' });
        await sleep(jitter([1200, 2200]));
      }
    } finally {
      STATE.running = false;
      STATE.paused = false;
      unhighlight();
      setButtons('idle');
      persist();
      summarize();
    }
  };

  const summarize = () => {
    const mins = ((Date.now() - STATE.startedAt) / 60000).toFixed(1);
    addLog('════════════════════════════════');
    addLog(`✅ ${STATE.stopRequested ? 'Stopped' : 'Finished'} in ${mins} min: ${STATE.processed} posts`);
    addLog(`   ❤️ ${STATE.liked} liked · 🔁 ${STATE.reposted} reposted · 💬 ${STATE.commented} replied · skipped ${STATE.skipped} · failed ${STATE.failed}`);
    if (CONFIG.dryRun) addLog('   Dry run: nothing was actually posted. Untick "Dry run" and start again.', 'warn');
    setStatus(STATE.stopRequested ? 'Stopped' : 'Done');
  };

  // ═══════════════════════════════════════════════════════════
  // PANEL
  // ═══════════════════════════════════════════════════════════

  const css = `
    #xep-panel{position:fixed;right:16px;bottom:16px;width:380px;max-height:86vh;display:flex;flex-direction:column;z-index:2147483000;background:#0f1419;color:#e7e9ea;border:1px solid #2f3336;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;transition:transform .2s ease,opacity .2s ease}
    #xep-panel.xep-min .xep-body,#xep-panel.xep-min .xep-foot{display:none}
    #xep-panel *{box-sizing:border-box}
    .xep-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #2f3336;cursor:move;user-select:none}
    .xep-head b{font-size:14px;flex:1}
    .xep-head button{background:transparent;border:0;color:#8b98a5;font-size:16px;cursor:pointer;padding:2px 6px;border-radius:6px}
    .xep-head button:hover{background:#1d2226;color:#fff}
    .xep-body{overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
    .xep-body::-webkit-scrollbar{width:5px}.xep-body::-webkit-scrollbar-thumb{background:#2f3336;border-radius:4px}
    .xep-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
    .xep-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .xep-label{color:#8b98a5;font-size:12px}
    .xep-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid #2f3336;border-radius:999px;cursor:pointer;user-select:none;transition:background .15s,border-color .15s}
    .xep-chip:hover{border-color:#536471}
    .xep-chip.on{background:#1d9bf0;border-color:#1d9bf0;color:#fff}
    .xep-chip input{display:none}
    #xep-panel input[type=text],#xep-panel input[type=password],#xep-panel input[type=number],#xep-panel select,#xep-panel textarea{width:100%;background:#16181c;color:#e7e9ea;border:1px solid #2f3336;border-radius:8px;padding:7px 9px;font:inherit;outline:none;transition:border-color .15s}
    #xep-panel input:focus,#xep-panel select:focus,#xep-panel textarea:focus{border-color:#1d9bf0}
    #xep-panel textarea{resize:vertical;min-height:58px}
    .xep-section{border:1px solid #2f3336;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px}
    .xep-section>b{font-size:12px;color:#8b98a5;text-transform:uppercase;letter-spacing:.04em}
    .xep-toggle{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer}
    .xep-toggle input{accent-color:#1d9bf0;width:16px;height:16px}
    .xep-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
    .xep-stat{background:#16181c;border-radius:10px;padding:8px 6px;text-align:center}
    .xep-stat b{display:block;font-size:17px}
    .xep-stat span{font-size:11px;color:#8b98a5}
    .xep-bar{height:6px;background:#16181c;border-radius:3px;overflow:hidden}
    .xep-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#1d9bf0,#7856ff);transition:width .3s}
    .xep-status{font-size:12px;color:#8b98a5;min-height:16px}
    .xep-log{background:#000;border-radius:10px;padding:8px;height:150px;overflow:auto;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word}
    .xep-log::-webkit-scrollbar{width:4px}.xep-log::-webkit-scrollbar-thumb{background:#2f3336}
    .xep-log .warn{color:#ffd166}.xep-log .dim{color:#536471}
    .xep-foot{display:flex;gap:8px;padding:12px 14px;border-top:1px solid #2f3336}
    .xep-btn{flex:1;padding:9px 10px;border-radius:999px;border:1px solid #2f3336;background:#16181c;color:#e7e9ea;font-weight:600;cursor:pointer;transition:background .15s,transform .05s}
    .xep-btn:hover:not(:disabled){background:#1d2226}.xep-btn:active:not(:disabled){transform:scale(.98)}
    .xep-btn:disabled{opacity:.4;cursor:not-allowed}
    .xep-btn.primary{background:#1d9bf0;border-color:#1d9bf0;color:#fff}.xep-btn.primary:hover:not(:disabled){background:#1a8cd8}
    .xep-btn.danger{border-color:#f4212e;color:#f4212e}.xep-btn.danger:hover:not(:disabled){background:rgba(244,33,46,.12)}
    .xep-hint{font-size:11px;color:#8b98a5}
    .xep-hint a{color:#1d9bf0;text-decoration:none}
    .xep-hide{display:none!important}
  `;

  const panel = document.createElement('div');
  panel.id = 'xep-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'XActions profile sweep');
  panel.innerHTML = `
    <style>${css}</style>
    <div class="xep-head" id="xep-drag">
      <span aria-hidden="true">⚡</span><b>Sweep ${esc(target.label)}</b>
      <button id="xep-min" title="Minimize" aria-label="Minimize">–</button>
      <button id="xep-close" title="Close panel" aria-label="Close">✕</button>
    </div>
    <div class="xep-body">
      <div class="xep-stats">
        <div class="xep-stat"><b id="xep-sPosts">0</b><span>posts</span></div>
        <div class="xep-stat"><b id="xep-sLiked">0</b><span>liked</span></div>
        <div class="xep-stat"><b id="xep-sReposted">0</b><span>reposted</span></div>
        <div class="xep-stat"><b id="xep-sCommented">0</b><span>replied</span></div>
      </div>
      <div class="xep-bar"><i id="xep-progress"></i></div>
      <div class="xep-status" id="xep-status" aria-live="polite">Ready. ${STATE.done.size ? `${STATE.done.size} posts done in earlier runs.` : 'Start in dry run.'}</div>

      <div class="xep-section">
        <b>Actions</b>
        <div class="xep-row">
          <label class="xep-chip ${CONFIG.actions.like ? 'on' : ''}"><input type="checkbox" id="xep-like" ${CONFIG.actions.like ? 'checked' : ''}>❤️ Like</label>
          <label class="xep-chip ${CONFIG.actions.repost ? 'on' : ''}"><input type="checkbox" id="xep-repost" ${CONFIG.actions.repost ? 'checked' : ''}>🔁 Repost</label>
          <label class="xep-chip ${CONFIG.actions.comment ? 'on' : ''}"><input type="checkbox" id="xep-comment" ${CONFIG.actions.comment ? 'checked' : ''}>💬 Reply</label>
        </div>
        <div class="xep-grid">
          <label><span class="xep-label">Max posts (0 = all)</span><input type="number" id="xep-max" min="0" value="${CONFIG.maxPosts}"></label>
          <label><span class="xep-label">Speed</span>
            <select id="xep-speed">
              <option value="stealth">Stealth (45-90s)</option>
              <option value="safe">Safe (15-35s)</option>
              <option value="moderate">Moderate (7-15s)</option>
              <option value="fast">Fast (3-7s)</option>
            </select></label>
        </div>
        <label class="xep-toggle"><span>Include replies</span><input type="checkbox" id="xep-replies" ${CONFIG.includeReplies ? 'checked' : ''}></label>
        <label class="xep-toggle"><span>Include reposts${MIXED_FEED ? ' (on by default here: this feed mixes authors)' : ' of other accounts'}</span><input type="checkbox" id="xep-reposts" ${CONFIG.includeReposts ? 'checked' : ''}></label>
        <label class="xep-toggle"><span>Skip posts already engaged</span><input type="checkbox" id="xep-skipDone" ${CONFIG.skipAlreadyEngaged ? 'checked' : ''}></label>
        <label class="xep-toggle"><span><b>Dry run</b> (log only, touch nothing)</span><input type="checkbox" id="xep-dry" ${CONFIG.dryRun ? 'checked' : ''}></label>
      </div>

      <div class="xep-section">
        <b>Filters</b>
        <div class="xep-hint">Aimed at mixed feeds (search, lists, hashtags, home). Leave blank on a profile sweep.</div>
        <div class="xep-grid">
          <label><span class="xep-label">Only from (handles)</span><input type="text" id="xep-onlyFrom" value="${esc(CONFIG.onlyFrom.join(', '))}" placeholder="nasa, nichxbt"></label>
          <label><span class="xep-label">Never these handles</span><input type="text" id="xep-skipUsers" value="${esc(CONFIG.skipUsers.join(', '))}" placeholder="spammer1"></label>
        </div>
        <div class="xep-grid">
          <label><span class="xep-label">Must contain</span><input type="text" id="xep-keywords" value="${esc(CONFIG.keywords.join(', '))}" placeholder="solana, rust"></label>
          <label><span class="xep-label">Must not contain</span><input type="text" id="xep-skipKeywords" value="${esc(CONFIG.skipKeywords.join(', '))}" placeholder="giveaway, airdrop"></label>
        </div>
        <div class="xep-grid">
          <label><span class="xep-label">Min likes</span><input type="number" id="xep-minLikes" min="0" value="${CONFIG.minLikes}"></label>
          <label><span class="xep-label">Max likes (0 = any)</span><input type="number" id="xep-maxLikes" min="0" value="${CONFIG.maxLikes}"></label>
        </div>
        <label class="xep-toggle"><span>Skip verified accounts</span><input type="checkbox" id="xep-skipVerified" ${CONFIG.skipVerified ? 'checked' : ''}></label>
      </div>

      <div class="xep-section" id="xep-commentSection">
        <b>Replies</b>
        <label><span class="xep-label">Source</span>
          <select id="xep-mode">
            <option value="templates">My templates (one per line)</option>
            <option value="ai">AI, written per post from a brief</option>
          </select></label>
        <div id="xep-templatesWrap">
          <textarea id="xep-templates" rows="4" spellcheck="false">${esc(CONFIG.comments.templates.join('\n'))}</textarea>
          <div class="xep-hint">{author} becomes @handle, {name} the display name. Never the same one twice in a row.</div>
        </div>
        <div id="xep-aiWrap" class="xep-hide">
          <label><span class="xep-label">Brief: how should the replies sound?</span><textarea id="xep-prompt" rows="3">${esc(CONFIG.comments.prompt)}</textarea></label>
          <label><span class="xep-label">Persona (optional)</span><input type="text" id="xep-persona" value="${esc(CONFIG.comments.persona)}" placeholder="You are @you, a founder building ..."></label>
          <div class="xep-grid">
            <label><span class="xep-label">Provider</span>
              <select id="xep-provider">
                <option value="xai">xAI Grok (works from console)</option>
                <option value="bridge">XActions extension (any provider)</option>
              </select></label>
            <label><span class="xep-label">Model</span><input type="text" id="xep-model" value="${esc(CONFIG.comments.model)}"></label>
          </div>
          <div class="xep-grid xep-hide" id="xep-bridgeWrap">
            <label><span class="xep-label">Bridge provider</span>
              <select id="xep-bridgeProvider">
                <option value="openrouter">OpenRouter</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="xai">xAI</option>
                <option value="ollama">Ollama (local)</option>
                <option value="custom">Custom URL</option>
              </select></label>
            <p class="xep-label">Custom URL: set it in the XActions extension popup (Settings, Custom AI provider). The extension no longer takes a URL from the page.</p>
          </div>
          <label><span class="xep-label">API key</span><input type="password" id="xep-key" value="${esc(CONFIG.comments.apiKey)}" autocomplete="off" placeholder="xai-..."></label>
          <label class="xep-toggle"><span>Remember key in this browser</span><input type="checkbox" id="xep-rememberKey" ${savedKey ? 'checked' : ''}></label>
          <label class="xep-toggle"><span>Fall back to templates if the model fails</span><input type="checkbox" id="xep-fallback" ${CONFIG.comments.fallbackToTemplates ? 'checked' : ''}></label>
          <div class="xep-row"><button class="xep-btn" id="xep-testAi">Test on the first post</button></div>
          <div class="xep-hint">Grok works straight from the console (x.com's CSP allows api.x.ai). Other providers need the <a href="https://github.com/nirholas/XActions/tree/main/extension" target="_blank" rel="noopener">XActions extension</a> or <code>npx xactions engage</code>.</div>
        </div>
      </div>

      <div class="xep-log" id="xep-log" aria-live="polite"></div>
      <div class="xep-row">
        <button class="xep-btn" id="xep-export">⬇ Export log</button>
        <button class="xep-btn" id="xep-reset">Reset progress</button>
      </div>
    </div>
    <div class="xep-foot">
      <button class="xep-btn primary" id="xep-start">▶ Start</button>
      <button class="xep-btn" id="xep-pause" disabled>⏸ Pause</button>
      <button class="xep-btn danger" id="xep-stop" disabled>🛑 Stop</button>
      <button class="xep-btn" id="xep-undo" title="Unlike and un-repost everything from this session">↩</button>
    </div>
  `;
  document.body.appendChild(panel);

  const el = (id) => document.getElementById(id);
  const logEl = el('xep-log');

  function addLog(message, kind) {
    const line = document.createElement('div');
    if (kind) line.className = kind;
    line.textContent = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} ${message}`;
    logEl.appendChild(line);
    while (logEl.childElementCount > 400) logEl.removeChild(logEl.firstChild);
    logEl.scrollTop = logEl.scrollHeight;
    if (kind === 'warn') console.warn(`⚠️ ${message}`); else if (kind !== 'dim') console.log(`⚡ ${message}`);
  }
  function log(message, kind) { addLog(message, kind); }

  function setStatus(text) { el('xep-status').textContent = text; }

  function updateStats() {
    el('xep-sPosts').textContent = STATE.processed;
    el('xep-sLiked').textContent = STATE.liked;
    el('xep-sReposted').textContent = STATE.reposted;
    el('xep-sCommented').textContent = STATE.commented;
    const total = CONFIG.maxPosts || Math.max(STATE.processed + 1, STATE.seenThisRun.size);
    el('xep-progress').style.width = `${Math.min(100, Math.round((STATE.processed / total) * 100))}%`;
  }

  function setButtons(mode) {
    el('xep-start').disabled = mode === 'running';
    el('xep-pause').disabled = mode !== 'running';
    el('xep-stop').disabled = mode !== 'running';
    el('xep-pause').textContent = STATE.paused ? '▶ Resume' : '⏸ Pause';
  }

  let highlighted = null;
  function highlight(article) {
    unhighlight();
    highlighted = article;
    article.style.outline = '2px solid #1d9bf0';
    article.style.outlineOffset = '-2px';
    article.style.boxShadow = '0 0 24px rgba(29,155,240,.25)';
    article.style.transition = 'box-shadow .3s';
  }
  function unhighlight() {
    if (!highlighted) return;
    highlighted.style.outline = ''; highlighted.style.outlineOffset = ''; highlighted.style.boxShadow = '';
    highlighted = null;
  }

  const readPanel = () => {
    CONFIG.actions.like = el('xep-like').checked;
    CONFIG.actions.repost = el('xep-repost').checked;
    CONFIG.actions.comment = el('xep-comment').checked;
    CONFIG.maxPosts = Math.max(0, parseInt(el('xep-max').value, 10) || 0);
    CONFIG.speed = el('xep-speed').value;
    CONFIG.includeReplies = el('xep-replies').checked;
    CONFIG.includeReposts = el('xep-reposts').checked;
    CONFIG.skipAlreadyEngaged = el('xep-skipDone').checked;
    CONFIG.dryRun = el('xep-dry').checked;
    const list = (id) => el(id).value.split(/[,\n]/).map((s) => s.trim().replace(/^@/, '')).filter(Boolean);
    CONFIG.onlyFrom = list('xep-onlyFrom');
    CONFIG.skipUsers = list('xep-skipUsers');
    CONFIG.keywords = list('xep-keywords');
    CONFIG.skipKeywords = list('xep-skipKeywords');
    CONFIG.minLikes = Math.max(0, parseInt(el('xep-minLikes').value, 10) || 0);
    CONFIG.maxLikes = Math.max(0, parseInt(el('xep-maxLikes').value, 10) || 0);
    CONFIG.skipVerified = el('xep-skipVerified').checked;
    const c = CONFIG.comments;
    c.mode = el('xep-mode').value;
    c.templates = el('xep-templates').value.split('\n').map((s) => s.trim()).filter(Boolean);
    c.prompt = el('xep-prompt').value.trim();
    c.persona = el('xep-persona').value.trim();
    c.provider = el('xep-provider').value;
    c.model = el('xep-model').value.trim();
    c.bridgeProvider = el('xep-bridgeProvider').value;
    // The custom URL lives in the extension's own settings now; a page
    // script can no longer choose where the extension sends requests.
    c.apiKey = el('xep-key').value.trim();
    c.fallbackToTemplates = el('xep-fallback').checked;
    try {
      if (el('xep-rememberKey').checked && c.apiKey) localStorage.setItem(KEY_STORAGE, c.apiKey);
      else localStorage.removeItem(KEY_STORAGE);
    } catch { /* storage unavailable, key stays in memory only */ }
  };

  const syncVisibility = () => {
    const ai = el('xep-mode').value === 'ai';
    el('xep-templatesWrap').classList.toggle('xep-hide', ai && !el('xep-fallback').checked);
    el('xep-aiWrap').classList.toggle('xep-hide', !ai);
    el('xep-bridgeWrap').classList.toggle('xep-hide', el('xep-provider').value !== 'bridge');
    el('xep-commentSection').classList.toggle('xep-hide', !el('xep-comment').checked);
    el('xep-key').placeholder = el('xep-provider').value === 'bridge' ? 'provider key (blank for Ollama)' : 'xai-...';
  };

  el('xep-speed').value = CONFIG.speed;
  el('xep-mode').value = CONFIG.comments.mode;
  el('xep-provider').value = CONFIG.comments.provider;
  el('xep-bridgeProvider').value = CONFIG.comments.bridgeProvider;
  syncVisibility();

  for (const id of ['xep-like', 'xep-repost', 'xep-comment']) {
    el(id).addEventListener('change', (e) => { e.target.closest('.xep-chip').classList.toggle('on', e.target.checked); syncVisibility(); });
  }
  for (const id of ['xep-mode', 'xep-provider', 'xep-fallback']) el(id).addEventListener('change', syncVisibility);
  el('xep-provider').addEventListener('change', () => {
    const v = el('xep-provider').value;
    if (v === 'xai' && !/grok/i.test(el('xep-model').value)) el('xep-model').value = 'grok-3-mini';
    if (v === 'bridge' && /grok/i.test(el('xep-model').value)) el('xep-model').value = '';
  });

  el('xep-start').addEventListener('click', () => {
    readPanel();
    if (!CONFIG.actions.like && !CONFIG.actions.repost && !CONFIG.actions.comment) { addLog('Pick at least one action.', 'warn'); return; }
    if (CONFIG.actions.comment && CONFIG.comments.mode === 'templates' && CONFIG.comments.templates.length === 0) { addLog('Add at least one reply template, or switch to AI.', 'warn'); return; }
    if (CONFIG.actions.comment && CONFIG.comments.mode === 'ai' && CONFIG.comments.provider === 'xai' && !CONFIG.comments.apiKey) { addLog('AI mode with xAI needs an API key (console.x.ai).', 'warn'); return; }
    logEl.textContent = '';
    sweep();
  });
  el('xep-pause').addEventListener('click', () => {
    STATE.paused = !STATE.paused;
    setButtons('running');
    addLog(STATE.paused ? '⏸ Paused' : '▶ Resumed');
    if (STATE.paused) setStatus('Paused');
  });
  el('xep-stop').addEventListener('click', () => { STATE.stopRequested = true; STATE.paused = false; addLog('🛑 Stopping after the current post...', 'warn'); });
  el('xep-undo').addEventListener('click', () => { if (!STATE.running) undoAll(); else addLog('Stop the run before undoing.', 'warn'); });
  el('xep-min').addEventListener('click', () => panel.classList.toggle('xep-min'));
  el('xep-close').addEventListener('click', () => { if (STATE.running) STATE.stopRequested = true; panel.remove(); });
  el('xep-reset').addEventListener('click', () => {
    STATE.done.clear();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* nothing to clear */ }
    addLog(`Cleared saved progress for ${target.label}. Every post is eligible again.`);
  });
  el('xep-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({
      target: target.label, feed: target.kind, exportedAt: new Date().toISOString(), dryRun: CONFIG.dryRun, config: { ...CONFIG, comments: { ...CONFIG.comments, apiKey: CONFIG.comments.apiKey ? '[redacted]' : '' } },
      stats: { processed: STATE.processed, liked: STATE.liked, reposted: STATE.reposted, commented: STATE.commented, skipped: STATE.skipped, failed: STATE.failed },
      results: STATE.results,
    }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `xactions-engage-${target.key}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    addLog('⬇ Exported session log');
  });
  el('xep-testAi').addEventListener('click', async () => {
    readPanel();
    const first = $$(SEL.article).map(readArticle).find((i) => i && eligible(i).ok);
    if (!first) { addLog('No post visible to test on. Scroll so one is on screen.', 'warn'); return; }
    setStatus('Asking the model...');
    try {
      const text = await aiComment(first);
      addLog(`🧪 For "${first.text.slice(0, 60)}…" the model wrote: "${text}"`);
      setStatus('AI test ok');
    } catch (err) {
      addLog(`🧪 AI test failed: ${err.message}`, 'warn');
      setStatus('AI test failed');
    }
  });

  // Drag
  (() => {
    const head = el('xep-drag');
    let drag = null;
    head.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const r = panel.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      panel.style.left = `${Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, e.clientX - drag.dx))}px`;
      panel.style.top = `${Math.max(0, Math.min(window.innerHeight - 40, e.clientY - drag.dy))}px`;
    });
    window.addEventListener('mouseup', () => { drag = null; });
  })();

  // Keyboard: Alt+Shift+S start/stop, Alt+Shift+P pause
  window.addEventListener('keydown', (e) => {
    if (!e.altKey || !e.shiftKey) return;
    if (e.key.toLowerCase() === 's') { e.preventDefault(); (STATE.running ? el('xep-stop') : el('xep-start')).click(); }
    if (e.key.toLowerCase() === 'p' && STATE.running) { e.preventDefault(); el('xep-pause').click(); }
  });

  // ═══════════════════════════════════════════════════════════
  // CONSOLE API
  // ═══════════════════════════════════════════════════════════

  /**
   * What the sweep sees on the page right now: every post it can read, and
   * for each one whether it would be engaged or why it would not.
   *
   * This is the answer to "why is it skipping everything?", which is
   * otherwise guesswork: run XEngage.inspect() in the console and the reason
   * per post is right there. It reads the DOM and changes nothing.
   *
   * @returns {Array<object>} one row per visible post
   */
  const inspect = () => {
    readPanel();
    return $$(SEL.article).map((article) => {
      const info = readArticle(article);
      if (!info) return { id: null, eligible: false, why: 'unreadable' };
      const check = eligible(info);
      const record = STATE.done.get(info.id);
      return {
        id: info.id,
        author: info.author,
        text: info.text.slice(0, 80),
        likes: info.likes,
        liked: info.liked,
        reposted: info.reposted,
        isRepost: info.isRepost,
        isReply: info.isReply,
        isVerified: info.isVerified,
        doneEarlier: record ? { ...record } : null,
        eligible: check.ok,
        why: check.why || null,
      };
    });
  };

  window.XEngage = {
    config: CONFIG,
    state: STATE,
    inspect,
    start: () => el('xep-start').click(),
    pause: () => el('xep-pause').click(),
    stop: () => el('xep-stop').click(),
    undo: undoAll,
    reset: () => el('xep-reset').click(),
    export: () => el('xep-export').click(),
    testAi: () => el('xep-testAi').click(),
  };

  addLog(`Loaded on ${target.label} (${target.kind}). ${STATE.done.size ? `${STATE.done.size} posts done earlier.` : ''}`);
  addLog('Dry run is ON. Read one pass of the log, then untick it. Alt+Shift+S starts/stops, Alt+Shift+P pauses.', 'dim');
  if (MIXED_FEED) addLog('This feed mixes authors. Set the author and keyword filters before you turn dry run off.', 'warn');
  if (!me) addLog('Could not read your own handle from the sidebar, so a post of yours in this feed could be engaged.', 'dim');
})();

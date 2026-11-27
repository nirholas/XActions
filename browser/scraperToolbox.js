// Copyright (c) 2024-2026 nich (@nichxbt). All rights reserved.
/**
 * ============================================================
 * 🧰 XActions Scraper Toolbox
 * ============================================================
 *
 * @name        scraperToolbox.js
 * @description On-page scraping control panel with start, pause and stop, live filters and one-click exports.
 * @title       Scraper Toolbox
 * @category    scrape
 * @page        x.com/*
 * @writes      false
 * @aliases     scripts/twitter/scraper-toolbox.js
 *              timelines. Start/pause/stop, live filters, user exclusions,
 *              keyword rules, and one-click exports (JSON/CSV/MD/TXT/HTML,
 *              clipboard). Captures data from X's own GraphQL responses,
 *              so engagement numbers are exact and long posts are complete.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.1.0
 * @date        2026-11-26
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE
 * ============================================================
 *
 * 1. Open x.com and go to any timeline you want to scrape:
 *    a profile, search results, a list, Likes, Bookmarks, or Home.
 *
 * 2. Open DevTools (F12 or Cmd+Option+I) and click "Console".
 *
 * 3. Paste this ENTIRE script and press Enter.
 *
 * 4. A floating toolbox panel appears (top right). Set your filters,
 *    then press ▶ Start. Pause, resume, or stop any time.
 *
 * 5. Export from the panel whenever you like. Filters are applied at
 *    export time, so you can scrape once and re-export with different
 *    filters without scraping again.
 *
 * HOW IT CAPTURES DATA
 * The toolbox listens to the GraphQL responses the X web app itself
 * receives (UserTweets, SearchTimeline, HomeTimeline, ...) while it
 * auto-scrolls. That means:
 *   - exact like/repost/reply/view/bookmark counts (not "1.2K")
 *   - full text of long posts (no "Show more" truncation)
 *   - media URLs, video length, language, quote/reply/repost structure
 *   - who each post replies to (reply-to post ID and handle), with the
 *     parent post itself linked in when it was captured
 *   - the quoted post (text, author, follower count, engagement)
 *   - follower counts for every author
 * Anything already on screen before you pasted the script is picked up
 * by a DOM sweep as a fallback (marked source:"dom", approximate counts).
 *
 * REPLIES AND THEIR PARENTS
 * A profile's Replies tab sends each parent post along with the reply, so
 * those link up on their own. Search results do not. Press "Fetch missing
 * parents" (or call .resolveParents()) after a run: the toolbox opens each
 * missing parent inside the page, reads it from X's response, and returns
 * to where you were. Deleted or protected parents are marked unavailable.
 *
 * QUOTE POSTS OF ONE POST
 * Open x.com/<handle>/status/<id>/quotes and run the toolbox there.
 *
 * Console API (after pasting): window.XActionsToolbox
 *   .tweets()      all captured tweets
 *   .matched()     tweets passing current filters, with parent context
 *   .export('json'|'csv'|'markdown'|'text'|'html')
 *   .build(format) the same export as a string, without downloading
 *   .copy('json'|'text')
 *   .missingParents()   replies whose parent post is not captured yet
 *   .resolveParents({ delay, timeout, limit })   fetch them in-page
 *   .start() .pause() .stop() .clear() .destroy()
 */

(function xactionsScraperToolbox() {
  'use strict';

  // Re-pasting the script replaces any live instance cleanly
  if (window.XActionsToolbox && typeof window.XActionsToolbox.destroy === 'function') {
    try { window.XActionsToolbox.destroy(); } catch (e) { /* ignore */ }
  }

  const VERSION = '1.1.0';
  const LS_KEY = 'xactions_toolbox_config_v1';
  const TAG = '[XActions Toolbox]';

  // ==========================================
  // CONFIG (edited live from the panel; persisted in localStorage)
  // ==========================================

  const DEFAULT_CONFIG = {
    targetCount: 300,        // stop after this many MATCHING tweets (0 = no limit)
    scrollDelay: 1800,       // ms between scrolls
    maxScrolls: 400,         // hard cap on scroll attempts
    stallLimit: 8,           // stop after N scrolls with nothing new
    autoDownloadJson: false, // download JSON automatically when a run finishes
    filters: {
      includeKeywords: [],   // keep only tweets containing at least one (empty = all)
      excludeKeywords: [],   // drop tweets containing any
      onlyUsers: [],         // keep only tweets authored by these handles (empty = all)
      excludeUsers: [],      // drop tweets authored by (or reposted from) these handles
      minLikes: 0,
      minRetweets: 0,
      minViews: 0,
      daysBack: 0,           // 0 = no date limit
      excludeRetweets: false,
      excludeReplies: false,
      excludeQuotes: false,
      excludePinned: false,
      mediaFilter: 'all',    // 'all' | 'with-media' | 'without-media'
      lang: ''               // BCP-47 code from the tweet payload, e.g. 'en' (empty = all)
    },
    ui: { top: 80, left: null } // panel position (left null = stick to right edge)
  };

  function loadConfig() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return structuredClone(DEFAULT_CONFIG);
      const saved = JSON.parse(raw);
      return {
        ...structuredClone(DEFAULT_CONFIG),
        ...saved,
        filters: { ...structuredClone(DEFAULT_CONFIG.filters), ...(saved.filters || {}) },
        ui: { ...structuredClone(DEFAULT_CONFIG.ui), ...(saved.ui || {}) }
      };
    } catch (e) {
      return structuredClone(DEFAULT_CONFIG);
    }
  }

  function saveConfig() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(config)); } catch (e) { /* storage full/blocked */ }
  }

  const config = loadConfig();

  // ==========================================
  // STATE
  // ==========================================

  const state = {
    status: 'idle',        // idle | running | paused | done
    startedAt: null,
    elapsedBefore: 0,      // accumulated ms across pause cycles
    scrolls: 0,
    stalls: 0,
    lastChangeCount: 0,
    retries: 0,            // consecutive Retry-button clicks in the current stall
    resolving: false,      // true while resolveParents() is visiting parent posts
    lastDetailFor: '',     // focal post id of the latest TweetDetail response
    rateLimitedAt: 0,      // time of the latest 429 from X's GraphQL API
    destroyed: false
  };

  /** id -> normalized tweet record. Map preserves capture order. */
  const store = new Map();

  /**
   * id -> record for every post seen anywhere: timeline items, quoted and
   * reposted posts, and the posts resolveParents() visits. Parent lookups
   * read this, so a parent counts as captured without being exported as a
   * timeline item of its own.
   */
  const seen = new Map();

  /** id -> reason, for parents X answered as deleted, withheld or protected. */
  const unavailable = new Map();

  // ==========================================
  // SMALL UTILITIES
  // ==========================================

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function csvList(str) {
    return String(str || '')
      .split(',')
      .map((s) => s.trim().replace(/^@/, ''))
      .filter(Boolean);
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function csvCell(v) {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function parseApprox(str) {
    if (!str) return 0;
    const s = String(str).trim().toUpperCase().replace(/,/g, '');
    const n = parseFloat(s);
    if (Number.isNaN(n)) return 0;
    if (s.includes('K')) return Math.round(n * 1e3);
    if (s.includes('M')) return Math.round(n * 1e6);
    if (s.includes('B')) return Math.round(n * 1e9);
    return Math.round(n);
  }

  function fmtInt(n) { return Number(n || 0).toLocaleString(); }

  function fmtElapsed(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Clipboard API needs page focus; fall back to a hidden textarea
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e2) {
        return false;
      }
    }
  }

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function pageLabel() {
    const path = location.pathname.replace(/^\/+|\/+$/g, '');
    if (!path || path === 'home') return 'home';
    if (path.startsWith('search')) return 'search';
    if (path.startsWith('i/bookmarks')) return 'bookmarks';
    return path.split('/')[0];
  }

  // ==========================================
  // GRAPHQL INTERCEPTION
  // ==========================================
  // The X web app fetches timelines from /i/api/graphql/<hash>/<Operation>.
  // We wrap fetch (and XHR as a safety net), clone matching responses, and
  // walk the JSON for Tweet objects. No extra requests are ever made; we
  // only read what the page already downloaded.

  const GQL_URL = /\/i\/api\/graphql\//;
  const origFetch = window.fetch;
  const origXhrOpen = XMLHttpRequest.prototype.open;
  const origXhrSend = XMLHttpRequest.prototype.send;

  function installInterceptor() {
    window.fetch = async function patchedFetch(...args) {
      const res = await origFetch.apply(this, args);
      try {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';
        if (GQL_URL.test(url)) {
          const status = res.status;
          res.clone().json()
            .then((payload) => ingestGraphql(payload, { url, status }))
            .catch(() => { /* not JSON */ });
        }
      } catch (e) { /* never break the page's own fetch */ }
      return res;
    };

    XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
      this.__xatUrl = url;
      return origXhrOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function patchedSend(...args) {
      if (this.__xatUrl && GQL_URL.test(String(this.__xatUrl))) {
        const url = String(this.__xatUrl);
        this.addEventListener('load', () => {
          try {
            ingestGraphql(JSON.parse(this.responseText), { url, status: this.status });
          } catch (e) { /* not JSON */ }
        });
      }
      return origXhrSend.apply(this, args);
    };
  }

  /** "SearchTimeline", "UserTweetsAndReplies", "TweetDetail", ... from a GraphQL URL. */
  function operationName(url) {
    const match = String(url || '').match(/\/graphql\/[^/]+\/([A-Za-z0-9_]+)/);
    return match ? match[1] : '';
  }

  /** The post a TweetDetail request asked for, read from its `variables` query parameter. */
  function focalTweetId(url) {
    try {
      const vars = new URL(url, location.origin).searchParams.get('variables');
      const parsed = vars ? JSON.parse(vars) : null;
      return parsed && parsed.focalTweetId ? String(parsed.focalTweetId) : '';
    } catch (e) {
      return '';
    }
  }

  function removeInterceptor() {
    window.fetch = origFetch;
    XMLHttpRequest.prototype.open = origXhrOpen;
    XMLHttpRequest.prototype.send = origXhrSend;
  }

  /**
   * Recursively collect Tweet result objects from a GraphQL payload.
   * Subtrees under a promoted entry (ads) are skipped entirely.
   * Recursion stops at each Tweet node; nested quoted/reposted tweets are
   * handled inside normalizeGraphqlTweet so they are not double-counted
   * as standalone timeline items.
   */
  function collectTweetNodes(node, out) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const item of node) collectTweetNodes(item, out); return; }
    if (typeof node.entryId === 'string' && node.entryId.includes('promoted')) return;
    const candidate = node.__typename === 'TweetWithVisibilityResults' ? node.tweet : node;
    if (candidate && candidate.rest_id && candidate.legacy && typeof candidate.legacy.full_text === 'string') {
      out.push(candidate);
      return;
    }
    for (const key of Object.keys(node)) collectTweetNodes(node[key], out);
  }

  /** A number when the payload carries one, otherwise null (never a guessed 0). */
  function countOrNull(...values) {
    for (const v of values) if (typeof v === 'number' && Number.isFinite(v)) return v;
    return null;
  }

  /**
   * The author fields from a GraphQL user result. X is moving User fields out
   * of `legacy` into `core`, `verification` and `relationship_counts`, and
   * sends either shape depending on the endpoint, so both are read.
   */
  function userFromResult(userResult) {
    const u = (userResult && (userResult.result || userResult)) || null;
    if (!u) return { id: '', handle: '', name: '', verified: false, followers: null, following: null };
    const legacy = u.legacy || {};
    const core = u.core || {};
    const counts = u.relationship_counts || {};
    return {
      id: u.rest_id || '',
      handle: core.screen_name || legacy.screen_name || '',
      name: core.name || legacy.name || '',
      verified: !!(u.is_blue_verified || (u.verification && u.verification.verified) || legacy.verified),
      followers: countOrNull(legacy.followers_count, counts.followers),
      following: countOrNull(legacy.friends_count, counts.following)
    };
  }

  /** Unwrap TweetWithVisibilityResults; null for tombstones and unavailable posts. */
  function tweetNode(result) {
    if (!result) return null;
    const node = result.__typename === 'TweetWithVisibilityResults' ? result.tweet : result;
    return node && node.rest_id && node.legacy ? node : null;
  }

  /**
   * The compact form of a post used for linked context (parent, quoted,
   * reposted): enough to judge it without opening it.
   */
  function summarize(rec) {
    if (!rec) return null;
    return {
      id: rec.id,
      url: rec.url,
      author: rec.author,
      text: rec.text,
      createdAt: rec.createdAt,
      metrics: rec.metrics,
      media: rec.media,
      inReplyTo: rec.inReplyTo || null,
      quoted: rec.quoted || null
    };
  }

  /**
   * @param {object} raw     a Tweet node with rest_id and legacy
   * @param {object} opts
   * @param {string} [opts.nested]  'retweet' | 'quote' when raw is embedded in another post
   * @param {object[]} [opts.sink]  receives every embedded record, so they reach `seen`
   */
  function normalizeGraphqlTweet(raw, opts = {}) {
    const legacy = raw.legacy || {};
    const author = userFromResult(raw.core && raw.core.user_results);

    // Long posts store the untruncated body in note_tweet
    const noteText = raw.note_tweet && raw.note_tweet.note_tweet_results &&
      raw.note_tweet.note_tweet_results.result && raw.note_tweet.note_tweet_results.result.text;
    const text = noteText || legacy.full_text || '';

    const mediaEntities = (legacy.extended_entities && legacy.extended_entities.media) ||
      (legacy.entities && legacy.entities.media) || [];
    const media = mediaEntities.map((m) => {
      const entry = { type: m.type, url: m.media_url_https || m.url || '' };
      if (m.video_info && Array.isArray(m.video_info.variants)) {
        const best = m.video_info.variants
          .filter((v) => v.content_type === 'video/mp4')
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (best) entry.videoUrl = best.url;
        if (typeof m.video_info.duration_millis === 'number') entry.durationMs = m.video_info.duration_millis;
      }
      return entry;
    });

    // A repost carries its original, and that original may quote a third post,
    // so a quote is kept unless this node is itself a quote (one level deep).
    const rtNode = tweetNode(legacy.retweeted_status_result && legacy.retweeted_status_result.result);
    const retweetOf = rtNode ? normalizeGraphqlTweet(rtNode, { nested: 'retweet', sink: opts.sink }) : null;

    const qNode = opts.nested === 'quote'
      ? null
      : tweetNode(raw.quoted_status_result && raw.quoted_status_result.result);
    const quoted = qNode ? normalizeGraphqlTweet(qNode, { nested: 'quote', sink: opts.sink }) : null;

    const inReplyTo = legacy.in_reply_to_status_id_str
      ? {
        id: legacy.in_reply_to_status_id_str,
        handle: legacy.in_reply_to_screen_name || '',
        userId: legacy.in_reply_to_user_id_str || ''
      }
      : null;

    const record = {
      id: raw.rest_id,
      url: author.handle ? `https://x.com/${author.handle}/status/${raw.rest_id}` : `https://x.com/i/status/${raw.rest_id}`,
      author,
      text,
      lang: legacy.lang || '',
      createdAt: legacy.created_at ? new Date(legacy.created_at).toISOString() : null,
      conversationId: legacy.conversation_id_str || '',
      inReplyTo,
      metrics: {
        likes: legacy.favorite_count || 0,
        retweets: legacy.retweet_count || 0,
        replies: legacy.reply_count || 0,
        quotes: legacy.quote_count || 0,
        bookmarks: legacy.bookmark_count || 0,
        views: raw.views && raw.views.count ? parseInt(raw.views.count, 10) : 0
      },
      media,
      type: {
        isRetweet: !!retweetOf,
        isReply: !!legacy.in_reply_to_status_id_str,
        isQuote: !!legacy.is_quote_status && !retweetOf,
        isPinned: false // set from the DOM sweep when visible
      },
      entities: {
        hashtags: ((legacy.entities && legacy.entities.hashtags) || []).map((h) => '#' + h.text),
        mentions: ((legacy.entities && legacy.entities.user_mentions) || []).map((m) => '@' + m.screen_name),
        urls: ((legacy.entities && legacy.entities.urls) || []).map((u) => u.expanded_url || u.url).filter(Boolean)
      },
      sensitive: !!legacy.possibly_sensitive,
      source: 'graphql',
      operation: opts.operation || '',
      approx: false,
      scrapedAt: new Date().toISOString()
    };
    record.retweetOf = retweetOf ? summarize(retweetOf) : null;
    record.quoted = quoted ? summarize(quoted) : null;
    if (opts.nested && opts.sink) opts.sink.push(record);
    return record;
  }

  /**
   * @param {object} payload  parsed GraphQL response body
   * @param {object} [meta]
   * @param {string} [meta.url]     request URL, for the operation name and TweetDetail's focal post
   * @param {number} [meta.status]  HTTP status
   */
  function ingestGraphql(payload, meta = {}) {
    if (state.destroyed) return;
    const operation = operationName(meta.url);
    if (meta.status === 429) {
      state.rateLimitedAt = Date.now();
      log('X answered 429 (rate limited). Slow down: raise the scroll delay and wait a few minutes.');
    }
    const nodes = [];
    try { collectTweetNodes(payload, nodes); } catch (e) { return; }
    let added = 0;
    for (const node of nodes) {
      try {
        const embedded = [];
        const rec = normalizeGraphqlTweet(node, { operation, sink: embedded });
        for (const e of embedded) if (e.id && !seen.has(e.id)) seen.set(e.id, e);
        if (!rec.id || (!rec.text && rec.media.length === 0)) continue;
        seen.set(rec.id, rec);
        // While resolving parents, the pages visited are context only: their
        // replies and suggestions must not join the export.
        if (state.resolving) continue;
        const existing = store.get(rec.id);
        if (!existing || existing.source === 'dom') {
          if (existing && existing.type.isPinned) rec.type.isPinned = true;
          store.set(rec.id, rec);
          added++;
        }
      } catch (e) { /* one malformed node never aborts the batch */ }
    }
    // A TweetDetail answer without its focal post means X will not show it
    // (deleted, withheld, or from a protected account).
    if (operation === 'TweetDetail' && meta.status !== 429) {
      const focal = focalTweetId(meta.url);
      if (focal) {
        state.lastDetailFor = focal;
        if (!seen.has(focal)) unavailable.set(focal, 'X returned no post (deleted, withheld or protected)');
      }
    }
    if (added > 0) {
      updateStats();
      previewLatest();
    }
  }

  /** A post from anywhere in the capture: timeline items first, then context. */
  function lookup(id) {
    return (id && (store.get(id) || seen.get(id))) || null;
  }

  /**
   * A record with its reply context attached: the parent post when it was
   * captured, and parentStatus 'captured' | 'missing' | 'unavailable'
   * (null for posts that are not replies).
   */
  function withContext(t) {
    if (!t.inReplyTo) return { ...t, parent: null, parentStatus: null };
    const parent = lookup(t.inReplyTo.id);
    if (parent) return { ...t, parent: summarize(parent), parentStatus: 'captured' };
    return {
      ...t,
      parent: null,
      parentStatus: unavailable.has(t.inReplyTo.id) ? 'unavailable' : 'missing'
    };
  }

  // ==========================================
  // DOM SWEEP (fallback for tweets rendered before injection)
  // ==========================================

  function domSweep() {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    let added = 0;
    articles.forEach((tweet) => {
      try {
        const timeEl = tweet.querySelector('time');
        if (!timeEl) return;
        const link = timeEl.closest('a[href*="/status/"]');
        if (!link) return;
        const match = link.href.match(/\/([^/]+)\/status\/(\d+)/);
        if (!match) return;
        const [, handle, id] = match;

        const socialContext = tweet.querySelector('[data-testid="socialContext"]');
        const isRetweet = !!socialContext && socialContext.closest('a') !== null;
        const isPinned = !!socialContext && !isRetweet;

        const existing = store.get(id);
        if (existing) {
          // GraphQL records can't see pinned status; the DOM can
          if (isPinned && !existing.type.isPinned) { existing.type.isPinned = true; }
          return;
        }

        const textEl = tweet.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.innerText : '';
        const metric = (testId) => {
          const el = tweet.querySelector(`[data-testid="${testId}"]`);
          const span = el && el.querySelector('span span');
          return parseApprox(span ? span.innerText : '0');
        };
        const viewsEl = tweet.querySelector('a[href*="/analytics"]');
        const nameEl = tweet.querySelector('[data-testid="User-Name"]');

        store.set(id, {
          id,
          url: `https://x.com/${handle}/status/${id}`,
          author: {
            id: '',
            handle,
            name: nameEl ? nameEl.innerText.split('\n')[0] : handle,
            verified: !!tweet.querySelector('[data-testid="icon-verified"]'),
            followers: null,
            following: null
          },
          text,
          lang: '',
          createdAt: timeEl.getAttribute('datetime'),
          conversationId: '',
          inReplyTo: null,
          metrics: {
            likes: metric('like') || metric('unlike'),
            retweets: metric('retweet') || metric('unretweet'),
            replies: metric('reply'),
            quotes: 0,
            bookmarks: 0,
            views: parseApprox(viewsEl ? viewsEl.innerText : '0')
          },
          media: [],
          type: {
            isRetweet,
            isReply: false,
            isQuote: !!tweet.querySelector('div[role="link"] time'),
            isPinned
          },
          entities: {
            hashtags: (text.match(/#[\w]+/g) || []),
            mentions: (text.match(/@[\w]+/g) || []),
            urls: (text.match(/https?:\/\/[^\s]+/g) || [])
          },
          retweetOf: null,
          quoted: null,
          sensitive: false,
          source: 'dom',
          operation: '',
          approx: true,
          scrapedAt: new Date().toISOString()
        });
        added++;
      } catch (e) { /* skip malformed article */ }
    });
    if (added > 0) { updateStats(); previewLatest(); }
    return added;
  }

  // ==========================================
  // FILTERS
  // ==========================================

  function matchesFilters(t) {
    const f = config.filters;
    const text = (t.text || '').toLowerCase();
    const handle = (t.author.handle || '').toLowerCase();

    if (f.onlyUsers.length && !f.onlyUsers.some((u) => u.toLowerCase() === handle)) return false;
    if (f.excludeUsers.length) {
      const rtHandle = t.retweetOf ? (t.retweetOf.author.handle || '').toLowerCase() : '';
      if (f.excludeUsers.some((u) => {
        const lower = u.toLowerCase();
        return lower === handle || (rtHandle && lower === rtHandle);
      })) return false;
    }
    if (f.includeKeywords.length && !f.includeKeywords.some((k) => text.includes(k.toLowerCase()))) return false;
    if (f.excludeKeywords.length && f.excludeKeywords.some((k) => text.includes(k.toLowerCase()))) return false;

    if (f.daysBack > 0 && t.createdAt) {
      const cutoff = Date.now() - f.daysBack * 86400000;
      if (new Date(t.createdAt).getTime() < cutoff) return false;
    }
    if (t.metrics.likes < f.minLikes) return false;
    if (t.metrics.retweets < f.minRetweets) return false;
    if (f.minViews > 0 && t.metrics.views < f.minViews) return false;

    if (f.excludeRetweets && t.type.isRetweet) return false;
    if (f.excludeReplies && t.type.isReply) return false;
    if (f.excludeQuotes && t.type.isQuote) return false;
    if (f.excludePinned && t.type.isPinned) return false;

    if (f.mediaFilter === 'with-media' && t.media.length === 0) return false;
    if (f.mediaFilter === 'without-media' && t.media.length > 0) return false;

    if (f.lang && t.lang && t.lang !== f.lang) return false;

    return true;
  }

  function allTweets() { return Array.from(store.values()); }

  function matchedTweets() {
    return allTweets()
      .filter(matchesFilters)
      .sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });
  }

  // ==========================================
  // EXPORTS
  // ==========================================

  function buildStats(tweets) {
    const stats = {
      total: tweets.length,
      totalLikes: 0, totalRetweets: 0, totalReplies: 0, totalViews: 0,
      avgLikes: 0, avgRetweets: 0,
      withMedia: 0, retweets: 0, replies: 0, quotes: 0,
      topHashtags: {}, topMentions: {}
    };
    for (const t of tweets) {
      stats.totalLikes += t.metrics.likes;
      stats.totalRetweets += t.metrics.retweets;
      stats.totalReplies += t.metrics.replies;
      stats.totalViews += t.metrics.views;
      if (t.media.length) stats.withMedia++;
      if (t.type.isRetweet) stats.retweets++;
      if (t.type.isReply) stats.replies++;
      if (t.type.isQuote) stats.quotes++;
      for (const h of t.entities.hashtags) stats.topHashtags[h.toLowerCase()] = (stats.topHashtags[h.toLowerCase()] || 0) + 1;
      for (const m of t.entities.mentions) stats.topMentions[m.toLowerCase()] = (stats.topMentions[m.toLowerCase()] || 0) + 1;
    }
    if (tweets.length) {
      stats.avgLikes = Math.round(stats.totalLikes / tweets.length);
      stats.avgRetweets = Math.round(stats.totalRetweets / tweets.length);
    }
    return stats;
  }

  /** Matched posts with their reply context attached, newest first. */
  function exportTweets() { return matchedTweets().map(withContext); }

  /** How many matched replies have their parent captured, missing or unavailable. */
  function parentCounts(tweets) {
    const counts = { replies: 0, captured: 0, missing: 0, unavailable: 0 };
    for (const t of tweets) {
      if (!t.inReplyTo) continue;
      counts.replies++;
      if (lookup(t.inReplyTo.id)) counts.captured++;
      else if (unavailable.has(t.inReplyTo.id)) counts.unavailable++;
      else counts.missing++;
    }
    return counts;
  }

  function exportBundle() {
    const tweets = exportTweets();
    return {
      source: pageLabel(),
      pageUrl: location.href,
      scrapedAt: new Date().toISOString(),
      toolboxVersion: VERSION,
      filters: config.filters,
      totalCaptured: store.size,
      totalMatched: tweets.length,
      parents: parentCounts(tweets),
      statistics: buildStats(tweets),
      tweets
    };
  }

  function toJSON() { return JSON.stringify(exportBundle(), null, 2); }

  // The first 20 columns are the 1.0 layout, unchanged, so existing
  // spreadsheets keep working. Context columns are appended after them.
  const CSV_HEADERS = ['id', 'date', 'author', 'text', 'likes', 'retweets', 'replies', 'quotes', 'bookmarks', 'views',
    'lang', 'isRetweet', 'isReply', 'isQuote', 'isPinned', 'mediaCount', 'mediaUrls', 'hashtags', 'url', 'source',
    'authorId', 'authorName', 'authorFollowers', 'authorVerified', 'conversationId', 'operation',
    'mediaTypes', 'videoDurationMs', 'links',
    'replyToId', 'replyToHandle', 'parentStatus', 'parentText', 'parentAuthorFollowers', 'parentLikes', 'parentDate', 'parentUrl',
    'quotedId', 'quotedAuthor', 'quotedAuthorFollowers', 'quotedText', 'quotedLikes', 'quotedUrl',
    'retweetOfId', 'retweetOfAuthor', 'retweetOfAuthorFollowers'];

  function toCSV() {
    const rows = exportTweets().map((t) => {
      const p = t.parent;
      const q = t.quoted;
      const rt = t.retweetOf;
      const videoMs = t.media.reduce((sum, m) => sum + (m.durationMs || 0), 0);
      return [
        t.id,
        t.createdAt || '',
        '@' + t.author.handle,
        csvCell(t.text),
        t.metrics.likes, t.metrics.retweets, t.metrics.replies, t.metrics.quotes, t.metrics.bookmarks, t.metrics.views,
        t.lang,
        t.type.isRetweet, t.type.isReply, t.type.isQuote, t.type.isPinned,
        t.media.length,
        csvCell(t.media.map((m) => m.videoUrl || m.url).join(' ')),
        csvCell(t.entities.hashtags.join(' ')),
        t.url,
        t.source,
        t.author.id || '',
        csvCell(t.author.name),
        t.author.followers ?? '',
        t.author.verified,
        t.conversationId || '',
        t.operation || '',
        csvCell(t.media.map((m) => m.type).join(' ')),
        videoMs || '',
        csvCell(t.entities.urls.join(' ')),
        t.inReplyTo ? t.inReplyTo.id : '',
        t.inReplyTo && t.inReplyTo.handle ? '@' + t.inReplyTo.handle : '',
        t.parentStatus || '',
        csvCell(p ? p.text : ''),
        p ? (p.author.followers ?? '') : '',
        p ? p.metrics.likes : '',
        p ? (p.createdAt || '') : '',
        p ? p.url : '',
        q ? q.id : '',
        q ? '@' + q.author.handle : '',
        q ? (q.author.followers ?? '') : '',
        csvCell(q ? q.text : ''),
        q ? q.metrics.likes : '',
        q ? q.url : '',
        rt ? rt.id : '',
        rt ? '@' + rt.author.handle : '',
        rt ? (rt.author.followers ?? '') : ''
      ].join(',');
    });
    return [CSV_HEADERS.join(','), ...rows].join('\n');
  }

  /** One-line "replying to" and "quoting" context for the text-style exports. */
  function contextLines(t) {
    const lines = [];
    if (t.inReplyTo) {
      const who = t.inReplyTo.handle ? '@' + t.inReplyTo.handle : 'a post';
      if (t.parent) lines.push(`Replying to ${who}: ${t.parent.text.replace(/\s+/g, ' ')}`);
      else lines.push(`Replying to ${who} (parent ${t.parentStatus}: https://x.com/i/status/${t.inReplyTo.id})`);
    }
    if (t.quoted) lines.push(`Quoting @${t.quoted.author.handle}: ${t.quoted.text.replace(/\s+/g, ' ')}`);
    return lines;
  }

  function toMarkdown() {
    const bundle = exportBundle();
    const s = bundle.statistics;
    let md = `# X posts export (${bundle.source})\n\n`;
    md += `> Scraped ${bundle.scrapedAt} from ${bundle.pageUrl}\n`;
    md += `> ${bundle.totalMatched} matching posts (of ${bundle.totalCaptured} captured)\n\n`;
    md += `## Statistics\n\n| Metric | Value |\n|--------|-------|\n`;
    md += `| Total likes | ${fmtInt(s.totalLikes)} |\n| Total reposts | ${fmtInt(s.totalRetweets)} |\n`;
    md += `| Total views | ${fmtInt(s.totalViews)} |\n| Avg likes | ${fmtInt(s.avgLikes)} |\n| With media | ${s.withMedia} |\n\n`;
    md += `## Posts\n\n`;
    for (const [i, t] of bundle.tweets.entries()) {
      md += `### ${i + 1}. @${t.author.handle} (${t.createdAt ? t.createdAt.slice(0, 10) : 'unknown date'})\n\n`;
      for (const line of contextLines(t)) md += `> ${line}\n`;
      if (t.inReplyTo || t.quoted) md += '\n';
      md += `${t.text}\n\n`;
      md += `Likes ${fmtInt(t.metrics.likes)} | Reposts ${fmtInt(t.metrics.retweets)} | Replies ${fmtInt(t.metrics.replies)} | Views ${fmtInt(t.metrics.views)}\n\n`;
      md += `[View post](${t.url})\n\n---\n\n`;
    }
    return md;
  }

  function toPlainText() {
    const tweets = exportTweets();
    const sep = '='.repeat(60);
    let txt = `X POSTS EXPORT (${pageLabel()})\n${sep}\n`;
    txt += `Scraped: ${new Date().toISOString()}\nMatching posts: ${tweets.length} (of ${store.size} captured)\n\n`;
    tweets.forEach((t, i) => {
      txt += `[${i + 1}] @${t.author.handle}${t.createdAt ? ' | ' + t.createdAt : ''}\n`;
      txt += `${'-'.repeat(60)}\n`;
      for (const line of contextLines(t)) txt += `${line}\n`;
      txt += `${t.text}\n\n`;
      txt += `Likes: ${fmtInt(t.metrics.likes)} | Reposts: ${fmtInt(t.metrics.retweets)} | Replies: ${fmtInt(t.metrics.replies)} | Views: ${fmtInt(t.metrics.views)}\n`;
      txt += `URL: ${t.url}\n${sep}\n\n`;
    });
    return txt;
  }

  function toHTML() {
    const bundle = exportBundle();
    const s = bundle.statistics;
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>X posts export (${escapeHtml(bundle.source)})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; color: #0f1419; }
    h1 { color: #1d9bf0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #ddd; vertical-align: top; }
    th { background: #1d9bf0; color: white; position: sticky; top: 0; }
    tr:hover { background: #f5f8fa; }
    .stats { background: #f5f8fa; padding: 16px 20px; border-radius: 10px; }
    .tweet-text { max-width: 480px; white-space: pre-wrap; }
    .ctx { color: #536471; font-size: 12px; border-left: 3px solid #cfd9de; padding-left: 8px; margin-bottom: 6px; }
    a { color: #1d9bf0; text-decoration: none; }
    a:hover { text-decoration: underline; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
  </style>
</head>
<body>
  <h1>X posts export</h1>
  <p>Source: ${escapeHtml(bundle.pageUrl)}<br>Scraped: ${bundle.scrapedAt}</p>
  <div class="stats">
    <strong>Statistics:</strong>
    ${bundle.totalMatched} posts |
    Likes: ${fmtInt(s.totalLikes)} |
    Reposts: ${fmtInt(s.totalRetweets)} |
    Views: ${fmtInt(s.totalViews)} |
    Avg likes: ${fmtInt(s.avgLikes)}
  </div>
  <table>
    <thead><tr><th>#</th><th>Date</th><th>Author</th><th>Post</th><th>Likes</th><th>Reposts</th><th>Replies</th><th>Views</th><th>Link</th></tr></thead>
    <tbody>`;
    bundle.tweets.forEach((t, i) => {
      html += `
      <tr>
        <td>${i + 1}</td>
        <td>${t.createdAt ? t.createdAt.slice(0, 10) : ''}</td>
        <td>@${escapeHtml(t.author.handle)}</td>
        <td class="tweet-text">${contextLines(t).map((line) => `<div class="ctx">${escapeHtml(line)}</div>`).join('')}${escapeHtml(t.text)}</td>
        <td class="num">${fmtInt(t.metrics.likes)}</td>
        <td class="num">${fmtInt(t.metrics.retweets)}</td>
        <td class="num">${fmtInt(t.metrics.replies)}</td>
        <td class="num">${fmtInt(t.metrics.views)}</td>
        <td><a href="${escapeHtml(t.url)}" target="_blank" rel="noopener">View</a></td>
      </tr>`;
    });
    html += `
    </tbody>
  </table>
  <p style="margin-top: 40px; color: #888; font-size: 12px;">
    Generated by <a href="https://github.com/nirholas/XActions">XActions Scraper Toolbox</a> v${VERSION} by @nichxbt
  </p>
</body>
</html>`;
    return html;
  }

  const EXPORTERS = {
    json: { build: toJSON, ext: 'json', mime: 'application/json' },
    csv: { build: toCSV, ext: 'csv', mime: 'text/csv' },
    markdown: { build: toMarkdown, ext: 'md', mime: 'text/markdown' },
    text: { build: toPlainText, ext: 'txt', mime: 'text/plain' },
    html: { build: toHTML, ext: 'html', mime: 'text/html' }
  };

  /** The export as a string, for the console API. */
  function buildAs(format) {
    const exporter = EXPORTERS[format];
    if (!exporter) throw new Error(`Unknown export format "${format}". Use one of: ${Object.keys(EXPORTERS).join(', ')}.`);
    return exporter.build();
  }

  function exportAs(format) {
    const exporter = EXPORTERS[format];
    if (!exporter) { log(`Unknown export format: ${format}`); return; }
    const count = matchedTweets().length;
    if (count === 0) { log('Nothing to export yet (0 matching posts).'); return; }
    const name = `${pageLabel()}_posts_${new Date().toISOString().slice(0, 10)}.${exporter.ext}`;
    downloadFile(exporter.build(), name, exporter.mime);
    log(`Exported ${count} posts as ${name}`);
  }

  async function copyAs(kind) {
    const count = matchedTweets().length;
    if (count === 0) { log('Nothing to copy yet (0 matching posts).'); return; }
    const content = kind === 'text' ? toPlainText() : toJSON();
    const ok = await copyText(content);
    log(ok ? `Copied ${count} posts to clipboard (${kind === 'text' ? 'plain text' : 'JSON'}).`
           : 'Clipboard copy failed. Click the page once, then retry.');
  }

  // ==========================================
  // PANEL UI
  // ==========================================

  const PANEL_ID = 'xactions-toolbox';
  let panel, els = {};

  const PANEL_HTML = `
  <style>
    #${PANEL_ID} {
      position: fixed;
      width: 340px;
      max-height: 92vh;
      background: #15202b;
      color: #e7e9ea;
      border: 1px solid #38444d;
      border-radius: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      z-index: 2147483647;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
      display: flex;
      flex-direction: column;
      user-select: none;
    }
    #${PANEL_ID} * { box-sizing: border-box; }
    #${PANEL_ID} .xat-header {
      background: #1d9bf0; color: #fff;
      padding: 10px 14px; cursor: move;
      display: flex; align-items: center; justify-content: space-between;
      font-weight: 700; font-size: 14px;
      border-radius: 15px 15px 0 0;
      flex: 0 0 auto;
    }
    #${PANEL_ID} .xat-header .xat-hbtns { display: flex; gap: 4px; }
    #${PANEL_ID} .xat-header button {
      background: rgba(255,255,255,0.15); border: none; color: #fff;
      width: 24px; height: 24px; border-radius: 6px; cursor: pointer;
      font-size: 13px; line-height: 1; transition: background 0.15s;
    }
    #${PANEL_ID} .xat-header button:hover { background: rgba(255,255,255,0.3); }
    #${PANEL_ID} .xat-body { padding: 12px 14px; overflow-y: auto; flex: 1 1 auto; }
    #${PANEL_ID} .xat-body::-webkit-scrollbar { width: 8px; }
    #${PANEL_ID} .xat-body::-webkit-scrollbar-thumb { background: #38444d; border-radius: 4px; }

    #${PANEL_ID} .xat-statusrow { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    #${PANEL_ID} .xat-chip {
      padding: 2px 10px; border-radius: 999px; font-weight: 700; font-size: 11px;
      background: #38444d; text-transform: uppercase; letter-spacing: 0.5px;
    }
    #${PANEL_ID} .xat-chip.running { background: #00ba7c; color: #04120c; }
    #${PANEL_ID} .xat-chip.paused { background: #ffd400; color: #1a1400; }
    #${PANEL_ID} .xat-chip.done { background: #1d9bf0; color: #041018; }
    #${PANEL_ID} .xat-elapsed { color: #8899a6; font-variant-numeric: tabular-nums; margin-left: auto; }

    #${PANEL_ID} .xat-counts {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 8px 0;
    }
    #${PANEL_ID} .xat-count {
      background: #192734; border-radius: 10px; padding: 8px 6px; text-align: center;
    }
    #${PANEL_ID} .xat-count b { display: block; font-size: 17px; font-variant-numeric: tabular-nums; }
    #${PANEL_ID} .xat-count span { color: #8899a6; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; }

    #${PANEL_ID} .xat-progress { height: 6px; background: #38444d; border-radius: 3px; overflow: hidden; margin: 4px 0 10px; }
    #${PANEL_ID} .xat-progress-bar { height: 100%; width: 0%; background: #1d9bf0; border-radius: 3px; transition: width 0.3s ease; }

    #${PANEL_ID} .xat-controls { display: grid; grid-template-columns: 1fr 1fr 1fr 44px; gap: 6px; margin-bottom: 10px; }
    #${PANEL_ID} .xat-btn {
      border: none; border-radius: 10px; padding: 9px 0; font-weight: 700; font-size: 13px;
      cursor: pointer; color: #fff; background: #38444d; transition: filter 0.15s, transform 0.05s;
    }
    #${PANEL_ID} .xat-btn:hover:not(:disabled) { filter: brightness(1.2); }
    #${PANEL_ID} .xat-btn:active:not(:disabled) { transform: scale(0.97); }
    #${PANEL_ID} .xat-btn:disabled { opacity: 0.4; cursor: default; }
    #${PANEL_ID} .xat-btn.xat-start { background: #00ba7c; color: #04120c; }
    #${PANEL_ID} .xat-btn.xat-pause { background: #ffd400; color: #1a1400; }
    #${PANEL_ID} .xat-btn.xat-stop { background: #f4212e; }

    #${PANEL_ID} details { margin-bottom: 8px; border: 1px solid #38444d; border-radius: 10px; }
    #${PANEL_ID} summary {
      cursor: pointer; padding: 8px 10px; font-weight: 700; color: #e7e9ea; list-style: none;
      display: flex; justify-content: space-between; align-items: center;
    }
    #${PANEL_ID} summary::after { content: '▾'; color: #8899a6; }
    #${PANEL_ID} details[open] summary::after { content: '▴'; }
    #${PANEL_ID} .xat-fields { padding: 2px 10px 10px; display: grid; gap: 7px; }
    #${PANEL_ID} .xat-field { display: grid; gap: 3px; }
    #${PANEL_ID} .xat-field label { color: #8899a6; font-size: 11px; }
    #${PANEL_ID} .xat-field input[type="text"], #${PANEL_ID} .xat-field input[type="number"], #${PANEL_ID} .xat-field select {
      background: #192734; color: #e7e9ea; border: 1px solid #38444d; border-radius: 8px;
      padding: 6px 8px; font-size: 12px; width: 100%; outline: none;
    }
    #${PANEL_ID} .xat-field input:focus, #${PANEL_ID} .xat-field select:focus { border-color: #1d9bf0; }
    #${PANEL_ID} .xat-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
    #${PANEL_ID} .xat-checks { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 8px; }
    #${PANEL_ID} .xat-checks label {
      display: flex; align-items: center; gap: 6px; color: #e7e9ea; font-size: 12px; cursor: pointer;
    }
    #${PANEL_ID} .xat-checks input { accent-color: #1d9bf0; }

    #${PANEL_ID} .xat-exports { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin-bottom: 6px; }
    #${PANEL_ID} .xat-exports .xat-btn { padding: 7px 0; font-size: 11px; background: #192734; border: 1px solid #38444d; }
    #${PANEL_ID} .xat-copyrow { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px; }
    #${PANEL_ID} .xat-copyrow .xat-btn { background: #192734; border: 1px solid #38444d; font-size: 12px; }
    #${PANEL_ID} .xat-parentrow { display: grid; gap: 6px; margin-bottom: 8px; }
    #${PANEL_ID} .xat-parentrow span { color: #8899a6; font-size: 11.5px; }
    #${PANEL_ID} .xat-parentrow .xat-btn { background: #192734; border: 1px solid #38444d; font-size: 12px; }
    #${PANEL_ID} .xat-btn:focus-visible { outline: 2px solid #1d9bf0; outline-offset: 2px; }

    #${PANEL_ID} .xat-preview {
      background: #192734; border-radius: 10px; padding: 8px 10px; margin-bottom: 8px;
      color: #8899a6; font-size: 11.5px; max-height: 62px; overflow: hidden;
    }
    #${PANEL_ID} .xat-preview b { color: #e7e9ea; }
    #${PANEL_ID} .xat-log {
      background: #0d1319; border-radius: 10px; padding: 8px 10px;
      font-size: 11px; color: #8899a6; max-height: 76px; overflow-y: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    #${PANEL_ID} .xat-footer {
      padding: 6px 14px 10px; color: #536471; font-size: 10.5px; text-align: center; flex: 0 0 auto;
    }
    #${PANEL_ID} .xat-footer a { color: #1d9bf0; text-decoration: none; }
    #${PANEL_ID}.xat-min .xat-body, #${PANEL_ID}.xat-min .xat-footer { display: none; }
  </style>
  <div class="xat-header" id="xat-drag">
    <span>🧰 Scraper Toolbox</span>
    <span class="xat-hbtns">
      <button id="xat-minimize" title="Minimize" aria-label="Minimize panel">▁</button>
      <button id="xat-close" title="Close and restore page (data is kept until reload)" aria-label="Close panel">✕</button>
    </span>
  </div>
  <div class="xat-body">
    <div class="xat-statusrow">
      <span class="xat-chip" id="xat-status">idle</span>
      <span id="xat-page" style="color:#8899a6"></span>
      <span class="xat-elapsed" id="xat-elapsed">0s</span>
    </div>
    <div class="xat-counts">
      <div class="xat-count"><b id="xat-captured">0</b><span>captured</span></div>
      <div class="xat-count"><b id="xat-matched">0</b><span>matching</span></div>
      <div class="xat-count"><b id="xat-scrolls">0</b><span>scrolls</span></div>
    </div>
    <div class="xat-progress"><div class="xat-progress-bar" id="xat-bar"></div></div>
    <div class="xat-controls">
      <button class="xat-btn xat-start" id="xat-start">▶ Start</button>
      <button class="xat-btn xat-pause" id="xat-pausebtn" disabled>⏸ Pause</button>
      <button class="xat-btn xat-stop" id="xat-stopbtn" disabled>⏹ Stop</button>
      <button class="xat-btn" id="xat-clear" title="Clear all captured data">🗑</button>
    </div>

    <details open>
      <summary>Scraping</summary>
      <div class="xat-fields">
        <div class="xat-2col">
          <div class="xat-field">
            <label for="xat-target">Target posts (0 = no limit)</label>
            <input type="number" id="xat-target" min="0" step="10">
          </div>
          <div class="xat-field">
            <label for="xat-delay">Scroll delay (ms)</label>
            <input type="number" id="xat-delay" min="400" step="100">
          </div>
        </div>
        <div class="xat-2col">
          <div class="xat-field">
            <label for="xat-maxscrolls">Max scrolls</label>
            <input type="number" id="xat-maxscrolls" min="1" step="10">
          </div>
          <div class="xat-field">
            <label for="xat-stall">Stop after N empty scrolls</label>
            <input type="number" id="xat-stall" min="2" step="1">
          </div>
        </div>
        <div class="xat-checks">
          <label><input type="checkbox" id="xat-autojson"> Auto-download JSON when done</label>
        </div>
      </div>
    </details>

    <details>
      <summary>Filters</summary>
      <div class="xat-fields">
        <div class="xat-field">
          <label for="xat-inc">Must contain keywords (comma separated)</label>
          <input type="text" id="xat-inc" placeholder="e.g. ai, launch, update">
        </div>
        <div class="xat-field">
          <label for="xat-exc">Exclude keywords</label>
          <input type="text" id="xat-exc" placeholder="e.g. giveaway, promo">
        </div>
        <div class="xat-field">
          <label for="xat-onlyusers">Only these users (@handles)</label>
          <input type="text" id="xat-onlyusers" placeholder="empty = everyone on this timeline">
        </div>
        <div class="xat-field">
          <label for="xat-skipusers">Skip these users (@handles)</label>
          <input type="text" id="xat-skipusers" placeholder="e.g. @spamacct, @bot123">
        </div>
        <div class="xat-2col">
          <div class="xat-field">
            <label for="xat-minlikes">Min likes</label>
            <input type="number" id="xat-minlikes" min="0">
          </div>
          <div class="xat-field">
            <label for="xat-minrts">Min reposts</label>
            <input type="number" id="xat-minrts" min="0">
          </div>
        </div>
        <div class="xat-2col">
          <div class="xat-field">
            <label for="xat-minviews">Min views</label>
            <input type="number" id="xat-minviews" min="0">
          </div>
          <div class="xat-field">
            <label for="xat-days">Last N days (0 = all)</label>
            <input type="number" id="xat-days" min="0">
          </div>
        </div>
        <div class="xat-2col">
          <div class="xat-field">
            <label for="xat-media">Media</label>
            <select id="xat-media">
              <option value="all">All posts</option>
              <option value="with-media">With media only</option>
              <option value="without-media">Text only</option>
            </select>
          </div>
          <div class="xat-field">
            <label for="xat-lang">Language code (e.g. en)</label>
            <input type="text" id="xat-lang" placeholder="empty = all">
          </div>
        </div>
        <div class="xat-checks">
          <label><input type="checkbox" id="xat-nort"> No reposts</label>
          <label><input type="checkbox" id="xat-noreply"> No replies</label>
          <label><input type="checkbox" id="xat-noquote"> No quotes</label>
          <label><input type="checkbox" id="xat-nopin"> No pinned</label>
        </div>
      </div>
    </details>

    <details open>
      <summary>Export</summary>
      <div class="xat-fields">
        <div class="xat-exports">
          <button class="xat-btn" data-export="json">JSON</button>
          <button class="xat-btn" data-export="csv">CSV</button>
          <button class="xat-btn" data-export="markdown">MD</button>
          <button class="xat-btn" data-export="text">TXT</button>
          <button class="xat-btn" data-export="html">HTML</button>
        </div>
        <div class="xat-copyrow">
          <button class="xat-btn" id="xat-copyjson">📋 Copy JSON</button>
          <button class="xat-btn" id="xat-copytext">📋 Copy clear text</button>
        </div>
        <div class="xat-parentrow">
          <span id="xat-parentinfo">No replies captured yet.</span>
          <button class="xat-btn" id="xat-parents" disabled title="Open each missing parent post in this tab, read it, then come back">⤴ Fetch missing parents</button>
        </div>
      </div>
    </details>

    <div class="xat-preview" id="xat-preview">No posts captured yet. Press ▶ Start, or just scroll the page yourself.</div>
    <div class="xat-log" id="xat-log"></div>
  </div>
  <div class="xat-footer">
    <a href="https://github.com/nirholas/XActions" target="_blank" rel="noopener">XActions</a> Scraper Toolbox v${VERSION}
  </div>`;

  function buildPanel() {
    const existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();

    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = PANEL_HTML;
    document.body.appendChild(panel);

    if (config.ui.left !== null) {
      panel.style.left = config.ui.left + 'px';
      panel.style.top = config.ui.top + 'px';
    } else {
      panel.style.right = '20px';
      panel.style.top = config.ui.top + 'px';
    }

    const $ = (id) => panel.querySelector('#' + id);
    els = {
      status: $('xat-status'), page: $('xat-page'), elapsed: $('xat-elapsed'),
      captured: $('xat-captured'), matched: $('xat-matched'), scrolls: $('xat-scrolls'),
      bar: $('xat-bar'),
      start: $('xat-start'), pause: $('xat-pausebtn'), stop: $('xat-stopbtn'), clear: $('xat-clear'),
      target: $('xat-target'), delay: $('xat-delay'), maxscrolls: $('xat-maxscrolls'), stall: $('xat-stall'),
      autojson: $('xat-autojson'),
      inc: $('xat-inc'), exc: $('xat-exc'), onlyusers: $('xat-onlyusers'), skipusers: $('xat-skipusers'),
      minlikes: $('xat-minlikes'), minrts: $('xat-minrts'), minviews: $('xat-minviews'), days: $('xat-days'),
      media: $('xat-media'), lang: $('xat-lang'),
      nort: $('xat-nort'), noreply: $('xat-noreply'), noquote: $('xat-noquote'), nopin: $('xat-nopin'),
      preview: $('xat-preview'), log: $('xat-log'),
      parentInfo: $('xat-parentinfo'), parents: $('xat-parents')
    };

    els.page.textContent = '/' + pageLabel();
    applyConfigToUI();

    // Controls
    els.start.addEventListener('click', start);
    els.pause.addEventListener('click', togglePause);
    els.stop.addEventListener('click', stop);
    els.clear.addEventListener('click', clearData);
    $('xat-minimize').addEventListener('click', () => panel.classList.toggle('xat-min'));
    $('xat-close').addEventListener('click', destroy);
    $('xat-copyjson').addEventListener('click', () => copyAs('json'));
    $('xat-copytext').addEventListener('click', () => copyAs('text'));
    els.parents.addEventListener('click', () => {
      if (state.resolving) cancelResolve();
      else resolveParents();
    });
    panel.querySelectorAll('[data-export]').forEach((btn) =>
      btn.addEventListener('click', () => exportAs(btn.dataset.export)));

    // Any input change re-reads config, persists it, and refreshes counters
    panel.querySelectorAll('input, select').forEach((el) =>
      el.addEventListener('change', () => { readConfigFromUI(); saveConfig(); updateStats(); }));

    // Drag
    const header = $('xat-drag');
    let drag = null;
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      const rect = panel.getBoundingClientRect();
      drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
      e.preventDefault();
    });
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    function onDragMove(e) {
      if (!drag) return;
      const left = Math.max(0, Math.min(window.innerWidth - 60, e.clientX - drag.dx));
      const top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - drag.dy));
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
      panel.style.right = 'auto';
    }
    function onDragEnd() {
      if (!drag) return;
      drag = null;
      const rect = panel.getBoundingClientRect();
      config.ui.left = Math.round(rect.left);
      config.ui.top = Math.round(rect.top);
      saveConfig();
    }
    panel.__dragCleanup = () => {
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
    };
  }

  function applyConfigToUI() {
    const f = config.filters;
    els.target.value = config.targetCount;
    els.delay.value = config.scrollDelay;
    els.maxscrolls.value = config.maxScrolls;
    els.stall.value = config.stallLimit;
    els.autojson.checked = config.autoDownloadJson;
    els.inc.value = f.includeKeywords.join(', ');
    els.exc.value = f.excludeKeywords.join(', ');
    els.onlyusers.value = f.onlyUsers.map((u) => '@' + u).join(', ');
    els.skipusers.value = f.excludeUsers.map((u) => '@' + u).join(', ');
    els.minlikes.value = f.minLikes;
    els.minrts.value = f.minRetweets;
    els.minviews.value = f.minViews;
    els.days.value = f.daysBack;
    els.media.value = f.mediaFilter;
    els.lang.value = f.lang;
    els.nort.checked = f.excludeRetweets;
    els.noreply.checked = f.excludeReplies;
    els.noquote.checked = f.excludeQuotes;
    els.nopin.checked = f.excludePinned;
  }

  function readConfigFromUI() {
    const num = (el, min, fallback) => {
      const v = parseInt(el.value, 10);
      return Number.isFinite(v) && v >= min ? v : fallback;
    };
    config.targetCount = num(els.target, 0, DEFAULT_CONFIG.targetCount);
    config.scrollDelay = num(els.delay, 400, DEFAULT_CONFIG.scrollDelay);
    config.maxScrolls = num(els.maxscrolls, 1, DEFAULT_CONFIG.maxScrolls);
    config.stallLimit = num(els.stall, 2, DEFAULT_CONFIG.stallLimit);
    config.autoDownloadJson = els.autojson.checked;
    const f = config.filters;
    f.includeKeywords = csvList(els.inc.value);
    f.excludeKeywords = csvList(els.exc.value);
    f.onlyUsers = csvList(els.onlyusers.value);
    f.excludeUsers = csvList(els.skipusers.value);
    f.minLikes = num(els.minlikes, 0, 0);
    f.minRetweets = num(els.minrts, 0, 0);
    f.minViews = num(els.minviews, 0, 0);
    f.daysBack = num(els.days, 0, 0);
    f.mediaFilter = els.media.value;
    f.lang = els.lang.value.trim().toLowerCase();
    f.excludeRetweets = els.nort.checked;
    f.excludeReplies = els.noreply.checked;
    f.excludeQuotes = els.noquote.checked;
    f.excludePinned = els.nopin.checked;
  }

  // ==========================================
  // UI UPDATES
  // ==========================================

  function setStatus(status) {
    state.status = status;
    if (!els.status) return;
    els.status.textContent = status;
    els.status.className = 'xat-chip ' + status;
    const running = status === 'running';
    const paused = status === 'paused';
    els.start.disabled = running || paused;
    els.pause.disabled = !running && !paused;
    els.pause.textContent = paused ? '▶ Resume' : '⏸ Pause';
    els.stop.disabled = !running && !paused;
    if (state.resolving) els.start.disabled = true;
    updateParentInfo();
  }

  function updateStats() {
    if (!els.captured) return;
    const matched = matchedTweets().length;
    els.captured.textContent = fmtInt(store.size);
    els.matched.textContent = fmtInt(matched);
    els.scrolls.textContent = fmtInt(state.scrolls);
    const target = config.targetCount;
    els.bar.style.width = target > 0 ? Math.min(100, (matched / target) * 100) + '%' : (store.size > 0 ? '100%' : '0%');
    updateParentInfo();
  }

  function updateParentInfo() {
    if (!els.parentInfo) return;
    const c = parentCounts(allTweets().filter(matchesFilters));
    const busy = state.status === 'running' || state.status === 'paused';
    if (state.resolving) {
      els.parentInfo.textContent = `Fetching parents: ${c.missing} left. Capture of this page is paused.`;
      els.parents.textContent = '⏹ Stop fetching';
      els.parents.disabled = false;
      return;
    }
    els.parents.textContent = '⤴ Fetch missing parents';
    if (c.replies === 0) {
      els.parentInfo.textContent = 'No replies among the matching posts.';
    } else {
      const extra = c.unavailable ? `, ${c.unavailable} unavailable` : '';
      els.parentInfo.textContent = `Replies: ${c.replies}. Parent captured for ${c.captured}, missing ${c.missing}${extra}.`;
    }
    els.parents.disabled = busy || c.missing === 0;
  }

  function previewLatest() {
    if (!els.preview) return;
    let t = null;
    for (const v of store.values()) t = v; // last inserted record
    if (!t) return;
    const snippet = (t.text || '(media only)').replace(/\s+/g, ' ').slice(0, 120);
    els.preview.innerHTML = `<b>@${escapeHtml(t.author.handle)}</b> · ${escapeHtml(snippet)}`;
  }

  function log(msg) {
    console.log(`${TAG} ${msg}`);
    if (!els.log) return;
    const line = document.createElement('div');
    line.textContent = `${new Date().toTimeString().slice(0, 8)} ${msg}`;
    els.log.prepend(line);
    while (els.log.children.length > 40) els.log.lastChild.remove();
  }

  // ==========================================
  // SCROLL ENGINE
  // ==========================================

  let runToken = 0; // invalidates a running loop after stop/clear/destroy

  async function start() {
    if (state.status === 'running' || state.status === 'paused') return;
    if (state.resolving) { log('Fetching parents is in progress. Stop it first, then start a run.'); return; }
    readConfigFromUI();
    saveConfig();
    state.scrolls = 0;
    state.stalls = 0;
    state.retries = 0;
    state.startedAt = Date.now();
    state.elapsedBefore = 0;
    state.lastChangeCount = store.size;
    setStatus('running');
    log(`Run started on /${pageLabel()} (target: ${config.targetCount || 'unlimited'}).`);
    const token = ++runToken;

    domSweep(); // catch what's already rendered

    while (token === runToken && !state.destroyed) {
      if (state.status === 'paused') { await sleep(250); continue; }
      if (state.status !== 'running') break;

      const matched = matchedTweets().length;
      if (config.targetCount > 0 && matched >= config.targetCount) {
        finishRun(`Target reached: ${matched} matching posts.`);
        break;
      }
      if (state.scrolls >= config.maxScrolls) {
        finishRun(`Max scrolls (${config.maxScrolls}) reached with ${matched} matching posts.`);
        break;
      }

      // Scroll with light jitter so loading keeps up
      const el = document.scrollingElement || document.documentElement;
      el.scrollTop = el.scrollHeight;
      state.scrolls++;
      await sleep(config.scrollDelay + Math.floor(Math.random() * 400));
      if (token !== runToken || state.destroyed) break;

      domSweep();

      if (store.size === state.lastChangeCount) {
        // A rate-limited timeline shows a Retry button instead of more posts,
        // which would otherwise look like the end of the results.
        if (state.retries < MAX_RETRY_CLICKS && clickRetryIfPresent()) {
          state.retries++;
          log(`X showed a Retry button (attempt ${state.retries}/${MAX_RETRY_CLICKS}). Clicked it; waiting before the next scroll.`);
          await sleep(config.scrollDelay * 3);
          continue;
        }
        state.stalls++;
        if (state.stalls >= config.stallLimit) {
          if (state.retries >= MAX_RETRY_CLICKS) {
            finishRun(`Stopped: X kept refusing to load more after ${MAX_RETRY_CLICKS} retries (rate limited). Wait a few minutes, then press Start to continue.`);
            break;
          }
          finishRun(`End of timeline: nothing new after ${config.stallLimit} scrolls (${matchedTweets().length} matching posts).`);
          break;
        }
      } else {
        state.stalls = 0;
        state.retries = 0;
        state.lastChangeCount = store.size;
      }
      updateStats();
    }
  }

  const MAX_RETRY_CLICKS = 5;

  /** Click X's "Retry" / "Try again" button on the page (never one in the panel). */
  function clickRetryIfPresent() {
    const btn = Array.from(document.querySelectorAll('button, [role="button"]'))
      .find((b) => !(panel && panel.contains(b)) &&
        /^(retry|try again)$/i.test((b.innerText || b.textContent || '').trim()));
    if (!btn) return false;
    btn.click();
    return true;
  }

  // ==========================================
  // PARENT RESOLUTION
  // ==========================================
  // Search results carry a reply's parent only as an id. To get the post
  // itself the toolbox opens it the way a click would: an in-app route
  // change, which makes the page request TweetDetail, which the interceptor
  // reads. No request is made by hand, so nothing needs signing.

  let resolveToken = 0;

  /** Replies among the matching posts whose parent is not captured, one entry per parent. */
  function missingParents() {
    const byParent = new Map();
    for (const t of matchedTweets()) {
      if (!t.inReplyTo || lookup(t.inReplyTo.id) || unavailable.has(t.inReplyTo.id)) continue;
      const entry = byParent.get(t.inReplyTo.id) || {
        parentId: t.inReplyTo.id,
        parentHandle: t.inReplyTo.handle,
        parentUrl: `https://x.com/${t.inReplyTo.handle || 'i'}/status/${t.inReplyTo.id}`,
        replyIds: []
      };
      entry.replyIds.push(t.id);
      byParent.set(t.inReplyTo.id, entry);
    }
    return Array.from(byParent.values());
  }

  /** Change the route inside X's single-page app, as clicking a link does. */
  function spaNavigate(path) {
    history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }

  async function waitFor(check, timeoutMs, token) {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      if (token !== resolveToken || state.destroyed) return false;
      if (check()) return true;
      await sleep(250);
    }
    return check();
  }

  /**
   * Visit every missing parent post in this tab and read it from X's own
   * TweetDetail response, then return to the page the run started on.
   *
   * @param {object} [opts]
   * @param {number} [opts.delay]    ms to wait between posts (default: the scroll delay, at least 2500)
   * @param {number} [opts.timeout]  ms to wait for each post (default 15000)
   * @param {number} [opts.limit]    visit at most this many parents (default: all)
   * @returns {Promise<{resolved: number, unavailable: number, failed: string[], remaining: number}>}
   */
  async function resolveParents(opts = {}) {
    const result = { resolved: 0, unavailable: 0, failed: [], remaining: 0 };
    if (state.status === 'running' || state.status === 'paused') {
      log('Stop the scroll run first, then fetch parents.');
      result.remaining = missingParents().length;
      return result;
    }
    if (state.resolving) { log('Already fetching parents.'); return result; }

    const delay = Number.isFinite(opts.delay) ? opts.delay : Math.max(config.scrollDelay, 2500);
    const timeout = Number.isFinite(opts.timeout) ? opts.timeout : 15000;
    const limit = Number.isFinite(opts.limit) && opts.limit > 0 ? opts.limit : Infinity;
    const queue = missingParents().slice(0, limit);
    if (queue.length === 0) {
      log('Every matching reply already has its parent.');
      return result;
    }

    const home = location.pathname + location.search;
    const token = ++resolveToken;
    let silentInARow = 0;
    state.resolving = true;
    setStatus(state.status);
    log(`Fetching ${queue.length} parent post${queue.length === 1 ? '' : 's'}, one every ${Math.round(delay / 1000)}s.`);

    try {
      for (const item of queue) {
        if (token !== resolveToken || state.destroyed) break;
        if (lookup(item.parentId) || unavailable.has(item.parentId)) {
          if (lookup(item.parentId)) result.resolved++;
          continue;
        }
        state.lastDetailFor = '';
        spaNavigate(`/${item.parentHandle || 'i'}/status/${item.parentId}`);
        const answered = await waitFor(
          () => !!lookup(item.parentId) || unavailable.has(item.parentId),
          timeout,
          token
        );
        if (token !== resolveToken || state.destroyed) break;

        if (lookup(item.parentId)) {
          result.resolved++;
          silentInARow = 0;
        } else if (unavailable.has(item.parentId)) {
          result.unavailable++;
          silentInARow = 0;
        } else {
          result.failed.push(item.parentId);
          // No TweetDetail at all means the route change did not load the post.
          silentInARow = state.lastDetailFor ? 0 : silentInARow + 1;
          if (!answered && state.rateLimitedAt > Date.now() - timeout) {
            log('X is rate limiting post pages. Stopped; wait a few minutes and press Fetch again.');
            break;
          }
          if (silentInARow >= 2) {
            log('X did not load posts through in-page navigation. Stopped. The list is in XActionsToolbox.missingParents().');
            break;
          }
        }
        updateParentInfo();
        await sleep(delay + Math.floor(Math.random() * 600));
      }
    } finally {
      state.resolving = false;
      if (!state.destroyed) {
        spaNavigate(home);
        setStatus(state.status);
        updateStats();
      }
    }

    result.remaining = missingParents().length;
    log(`Parents: ${result.resolved} fetched, ${result.unavailable} unavailable, ${result.failed.length} failed, ${result.remaining} still missing.`);
    return result;
  }

  function cancelResolve() {
    if (!state.resolving) return;
    resolveToken++;
    log('Stopping after the current post...');
  }

  function togglePause() {
    if (state.status === 'running') {
      state.elapsedBefore += Date.now() - state.startedAt;
      setStatus('paused');
      log('Paused. Capture stays live; scrolling is halted.');
    } else if (state.status === 'paused') {
      state.startedAt = Date.now();
      setStatus('running');
      log('Resumed.');
    }
  }

  function stop() {
    if (state.status !== 'running' && state.status !== 'paused') return;
    runToken++;
    finishRun(`Stopped manually with ${matchedTweets().length} matching posts.`);
  }

  function finishRun(message) {
    if (state.status === 'paused') state.startedAt = Date.now();
    state.elapsedBefore += Date.now() - state.startedAt;
    setStatus('done');
    updateStats();
    log(message);
    log('Adjust filters freely, then export: results always reflect current filters.');
    if (config.autoDownloadJson && matchedTweets().length > 0) exportAs('json');
  }

  function clearData() {
    runToken++;
    resolveToken++;
    store.clear();
    seen.clear();
    unavailable.clear();
    state.scrolls = 0;
    state.stalls = 0;
    state.elapsedBefore = 0;
    state.startedAt = null;
    setStatus('idle');
    updateStats();
    if (els.preview) els.preview.textContent = 'Cleared. Press ▶ Start to scrape again.';
    log('All captured data cleared.');
  }

  // ==========================================
  // TICKER
  // ==========================================

  const ticker = setInterval(() => {
    if (state.destroyed || !els.elapsed) return;
    let ms = state.elapsedBefore;
    if (state.status === 'running' && state.startedAt) ms += Date.now() - state.startedAt;
    els.elapsed.textContent = fmtElapsed(ms);
  }, 500);

  // ==========================================
  // LIFECYCLE
  // ==========================================

  function destroy() {
    state.destroyed = true;
    runToken++;
    resolveToken++;
    clearInterval(ticker);
    removeInterceptor();
    if (panel) {
      if (panel.__dragCleanup) panel.__dragCleanup();
      panel.remove();
      panel = null;
    }
    delete window.XActionsToolbox;
    console.log(`${TAG} Closed. fetch/XHR restored. Paste the script again to reopen.`);
  }

  // ==========================================
  // BOOT
  // ==========================================

  if (!/(^|\.)x\.com$|(^|\.)twitter\.com$/.test(location.hostname)) {
    console.warn(`${TAG} This script must run on x.com. Open a profile or timeline there and paste again.`);
    return;
  }

  installInterceptor();
  buildPanel();
  setStatus('idle');
  updateStats();
  log(`Toolbox v${VERSION} ready on /${pageLabel()}. Capture is live even before you press Start.`);

  window.XActionsToolbox = {
    version: VERSION,
    tweets: allTweets,
    matched: exportTweets,
    export: exportAs,
    build: buildAs,
    copy: copyAs,
    missingParents,
    resolveParents,
    cancelResolve,
    start,
    pause: togglePause,
    stop,
    clear: clearData,
    destroy,
    config
  };
})();

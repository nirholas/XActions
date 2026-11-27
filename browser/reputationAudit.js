// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// AI-score your own timeline for professional, hostile, legal, and spam risk, get a shareable score card, and clean up what it flags
// Paste in DevTools console on x.com/USERNAME (your own profile, or /with_replies)
// by nichxbt
//
// What it does: reads your recent posts, sends each one to an LLM with a strict
// rubric ("would this embarrass you to an employer", "is this hostile", "legal
// exposure", "low-value spam"), and turns the verdicts into one 0-100 reputation
// score with a letter grade. It renders that as a PNG card you can download or
// copy straight to your clipboard, in the same spirit as a "wrapped" recap card,
// except it is a real risk audit, not a joke. Flagged and borderline posts get a
// one-click cleanup pass, reusing the same verified-delete logic as
// scripts/searchSweep.js.
//
// Nothing is deleted by scanning. Scanning only reads and scores. Cleanup is a
// separate, explicit step with its own dry run.
//
// AI scoring from the console: x.com's Content-Security-Policy only lets the
// page talk to a short list of hosts, and https://api.x.ai is on it, so
// provider 'xai' (Grok) works straight from the console with your key. For
// OpenAI/Anthropic/OpenRouter/Ollama, install the XActions browser extension
// (extension/) and set provider 'bridge'.
//
// A floating panel appears when you paste. Everything below can also be
// changed there.

/**
 * ============================================================
 * 🛡️ Reputation Audit
 * ============================================================
 *
 * @name        reputationAudit.js
 * @description AI-score your own posts for professional, hostile, legal and spam risk, then optionally delete what was flagged.
 * @title       Reputation Audit
 * @category    analytics
 * @page        x.com/<you>
 * @writes      true
 * @aliases     scripts/reputationAudit.js
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     1.0.0
 * @date        2026-08-28
 * @repository  https://github.com/nirholas/XActions
 * ============================================================
 */
(() => {
  'use strict';

  if (document.getElementById('xra-panel')) {
    console.log('🛡️ Reputation audit already loaded. Use the panel, or window.XReputationAudit.');
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION (the panel edits this live)
  // ═══════════════════════════════════════════════════════════

  const CONFIG = {
    scan: {
      maxPosts: 60,          // How many of your recent posts to score. Each one is an LLM call.
      includeReposts: false, // Score posts you reposted from others, not just your own
      excludePinned: true,
    },

    dimensions: {
      professional: true,    // Would this embarrass you to an employer, client, or partner?
      hostile: true,         // Is this a personal attack on someone?
      legal: true,           // Defamation, doxxing, threats, leaked confidential info?
      spam: true,            // Low-effort filler that adds nothing?
    },
    customQuestion: '',      // An extra risk question specific to you, scored alongside the above

    ai: {
      provider: 'xai',       // 'xai' (works from the console) | 'bridge' (XActions extension, any provider)
      apiKey: '',            // xAI key. Stored only if "remember" is ticked in the panel.
      model: 'grok-3-mini',
      bridgeProvider: 'openrouter',
      bridgeBaseUrl: '',
      concurrency: 3,        // Posts scored in parallel. X.com does not rate-limit reads, the LLM provider might.
    },

    cleanup: {
      dryRun: true,          // false = PERMANENT deletion of whatever you select in the flagged list.
      minDelay: 3000,
      maxDelay: 7000,
      menuDelay: 1200,
    },

    // Posts already scored are cached (by id + rubric) so re-running the scan
    // after a cleanup, or the next day, does not re-bill the same post twice.
    useCache: true,
    cacheDays: 14,
  };

  // Overall score at/above this is worth removing. Below it but at/above the
  // review line is worth a human look. Mirrors src/ai/reputationScorer.js.
  const FLAG_THRESHOLD = 70;
  const REVIEW_THRESHOLD = 40;

  const DIMENSION_META = {
    professional: { label: 'Professional', emoji: '💼', question: 'Would this embarrass the author in front of a current or future employer, client, or business partner?' },
    hostile: { label: 'Hostile', emoji: '⚔️', question: 'Is this hostile, harassing, or likely to read as a personal attack on someone named or clearly identifiable in it?' },
    legal: { label: 'Legal exposure', emoji: '⚖️', question: 'Could this create legal exposure: defamation, doxxing, a threat, leaked confidential information, or a promise the author cannot keep?' },
    spam: { label: 'Low value', emoji: '🗑️', question: 'Is this low-effort spam, an engagement-bait template, or filler that adds nothing and flatters no one either?' },
  };

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
    closeModal: '[data-testid="app-bar-close"]',
    toast: '[data-testid="toast"]',
    placement: '[data-testid="placementTracking"]',
    profileLink: 'a[data-testid="AppTabBar_Profile_Link"]',
    accountSwitcher: '[data-testid="SideNav_AccountSwitcher_Button"]',
    retryButton: '[data-testid="primaryColumn"] [role="button"]',
  };

  // ═══════════════════════════════════════════════════════════
  // WHO AM I, AND AM I ON A PROFILE
  // ═══════════════════════════════════════════════════════════

  const ownHandle = (() => {
    const href = document.querySelector(SEL.profileLink)?.getAttribute('href') || '';
    const fromNav = href.match(/^\/([A-Za-z0-9_]{1,15})$/);
    if (fromNav) return fromNav[1].toLowerCase();
    const switcher = document.querySelector(SEL.accountSwitcher)?.textContent || '';
    const fromSwitcher = switcher.match(/@([A-Za-z0-9_]{1,15})/);
    return fromSwitcher ? fromSwitcher[1].toLowerCase() : null;
  })();

  const PROFILE_TABS = ['with_replies', 'media', 'likes', 'highlights', 'articles', 'superfollows', 'affiliates'];
  const RESERVED = ['home', 'explore', 'notifications', 'messages', 'i', 'search', 'settings', 'compose',
    'hashtag', 'bookmarks', 'lists', 'topics', 'communities', 'jobs'];
  const pathMatch = location.pathname.match(/^\/([A-Za-z0-9_]{1,15})(?:\/([A-Za-z0-9_]+))?\/?$/);
  const pathUser = pathMatch && !RESERVED.includes(pathMatch[1].toLowerCase()) ? pathMatch[1] : null;
  const onProfile = Boolean(pathUser) && (!pathMatch[2] || PROFILE_TABS.includes(pathMatch[2].toLowerCase()));

  if (!onProfile) {
    console.error(ownHandle
      ? `❌ Run this on your profile timeline: https://x.com/${ownHandle} (or /with_replies to include replies)`
      : '❌ Run this on your own profile timeline (x.com/YOUR_USERNAME).');
    return;
  }
  if (ownHandle && pathUser.toLowerCase() !== ownHandle.toLowerCase()) {
    console.error(`❌ This audits your OWN reputation, not @${pathUser}'s. Run it on https://x.com/${ownHandle}.`);
    return;
  }
  const profileUser = ownHandle || pathUser;

  const STORAGE_KEY = `xactions_reputation_${profileUser}`;
  const CACHE_KEY = `xactions_reputation_cache_${profileUser}`;
  const KEY_STORAGE = 'xactions_engage_ai_key'; // Shared with engageProfile/searchSweep on purpose

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = ([min, max]) => Math.floor(min + Math.random() * (max - min));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clampScore = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

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

  const throttleToast = () => {
    const toast = $(SEL.toast);
    if (!toast) return null;
    const text = toast.textContent || '';
    return /rate limit|try again later|too many|temporarily|unable to|something went wrong|limit/i.test(text) ? text.trim() : null;
  };

  const cache = (() => {
    if (!CONFIG.useCache) return { get: () => null, set: () => {}, clear: () => {} };
    let store;
    try { store = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { store = {}; }
    const maxAge = CONFIG.cacheDays * 86400000;
    const rubricKey = () => Object.keys(CONFIG.dimensions).filter((k) => CONFIG.dimensions[k]).sort().join(',') + '|' + CONFIG.customQuestion.trim();
    return {
      get(id) {
        const hit = store[id];
        if (!hit || hit.rubric !== rubricKey() || Date.now() - hit.at > maxAge) return null;
        return hit.result;
      },
      set(id, result) {
        store[id] = { result, rubric: rubricKey(), at: Date.now() };
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(store)); } catch { /* storage full or private mode: cache is best-effort */ }
      },
      clear() {
        store = {};
        try { localStorage.removeItem(CACHE_KEY); } catch { /* nothing to clean up */ }
      },
    };
  })();

  // ═══════════════════════════════════════════════════════════
  // READING YOUR POSTS
  // ═══════════════════════════════════════════════════════════

  const readArticle = (article) => {
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
      id, url: `https://x.com${link.split('?')[0]}`, author, authorName, text, quotedText, hasMedia,
      timestamp: time, isRepost, isPinned, isReply, isAd, isMine: author === profileUser.toLowerCase(),
    };
  };

  const eligible = (info) => {
    if (!info || !info.isMine) return false;
    if (info.isAd) return false;
    if (CONFIG.scan.excludePinned && info.isPinned) return false;
    if (info.isRepost && !CONFIG.scan.includeReposts) return false;
    return Boolean(info.text) || info.hasMedia;
  };

  /**
   * Scroll and collect up to maxPosts eligible posts. Returns { article, info }
   * pairs so the cleanup step can act on the live DOM node later without a
   * second lookup.
   */
  const collectPosts = async (onProgress) => {
    const found = [];
    const seen = new Set();
    let idleRounds = 0;

    window.scrollTo({ top: 0 });
    await sleep(1000);

    while (found.length < CONFIG.scan.maxPosts && idleRounds < 6) {
      let addedThisRound = false;
      for (const article of $$(SEL.article)) {
        if (found.length >= CONFIG.scan.maxPosts) break;
        const info = readArticle(article);
        if (!info || seen.has(info.id)) continue;
        seen.add(info.id);
        if (!eligible(info)) continue;
        found.push({ article, info });
        addedThisRound = true;
        if (onProgress) onProgress(found.length);
      }
      idleRounds = addedThisRound ? 0 : idleRounds + 1;
      if (found.length >= CONFIG.scan.maxPosts) break;
      const retry = $$(SEL.retryButton).find((b) => /retry|try again/i.test(b.textContent || ''));
      if (retry) { retry.click(); await sleep(2500); }
      window.scrollBy({ top: Math.round(window.innerHeight * 0.9), behavior: 'smooth' });
      await sleep(jitter([1200, 2200]));
    }
    return found;
  };

  // ═══════════════════════════════════════════════════════════
  // AI RISK SCORING
  // ═══════════════════════════════════════════════════════════

  const activeDimensions = () => {
    const keys = Object.keys(DIMENSION_META).filter((k) => CONFIG.dimensions[k]);
    const dims = keys.map((k) => ({ key: k, ...DIMENSION_META[k] }));
    if (CONFIG.customQuestion.trim()) dims.push({ key: 'custom', label: 'Custom', emoji: '🔎', question: CONFIG.customQuestion.trim() });
    return dims;
  };

  const buildRiskSystemPrompt = (dims) => {
    const schema = dims.map((d) => `    "${d.key}": { "score": <0-100 integer>, "reason": "<one short clause, under 15 words>" }`).join(',\n');
    return [
      'You are a careful, unsentimental reviewer scoring a single social media post for risk before its author decides whether to keep it public.',
      '',
      'Score each dimension below from 0 (no risk at all) to 100 (severe, obvious risk). Judge the post as written, not the author\'s intent. A post with no signal for a dimension scores near 0 on it, not a defensive middle value.',
      '',
      'Dimensions:',
      ...dims.map((d) => `- ${d.key}: ${d.question}`),
      '',
      'Respond with ONLY a single JSON object, no markdown fences, no commentary, in exactly this shape:',
      '{', schema, '}',
      '',
      'Every dimension key above must appear. Scores are integers. Reasons are short and specific to this post, never generic.',
    ].join('\n');
  };

  const buildRiskUserPrompt = (info) => {
    const parts = [`Post${info.isReply ? ' (a reply)' : ''} by @${info.author}:`, `"""${(info.text || '').trim()}"""`];
    if (info.quotedText) parts.push('', 'It quotes:', `"""${info.quotedText.trim()}"""`);
    if (info.hasMedia) parts.push('', '(It also has an image or video attached that you cannot see. Score the text only.)');
    parts.push('', 'Score it now, as JSON only.');
    return parts.join('\n');
  };

  const extractJsonObject = (raw) => {
    const text = String(raw || '').trim();
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : text;
    try { return JSON.parse(candidate); } catch { /* fall through to brace-scan below */ }
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) throw new Error(`No JSON object found in the model's response: "${text.slice(0, 120)}"`);
    return JSON.parse(candidate.slice(start, end + 1));
  };

  const parseRiskResponse = (raw, dims) => {
    const parsed = extractJsonObject(raw);
    const dimensions = {};
    for (const { key, label } of dims) {
      const entry = parsed[key];
      if (!entry || typeof entry !== 'object') throw new Error(`Model response is missing dimension "${key}" (${label})`);
      dimensions[key] = { score: clampScore(entry.score), reason: String(entry.reason || '').trim().slice(0, 200) };
    }
    let worstDimension = dims[0].key;
    let overall = 0;
    for (const [key, { score }] of Object.entries(dimensions)) {
      if (score > overall) { overall = score; worstDimension = key; }
    }
    const verdict = overall >= FLAG_THRESHOLD ? 'flagged' : overall >= REVIEW_THRESHOLD ? 'review' : 'clean';
    return { dimensions, overall, verdict, worstDimension };
  };

  /** Direct call to xAI. The only LLM host x.com's CSP lets the page reach. */
  const completeViaXai = async (messages) => {
    const c = CONFIG.ai;
    if (!c.apiKey) throw new Error('No xAI API key. Paste one in the panel (console.x.ai) or switch provider to bridge.');
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${c.apiKey}` },
      body: JSON.stringify({ model: c.model || 'grok-3-mini', messages, temperature: 0, max_tokens: 400 }),
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
    const c = CONFIG.ai;
    const id = `xra-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
      source: 'xactions-page', type: 'LLM_REQUEST', id,
      request: { provider: c.bridgeProvider, apiKey: c.apiKey, baseUrl: c.bridgeBaseUrl, model: c.model, messages, temperature: 0, maxTokens: 400 },
    }, '*');
  });

  const scoreOnePost = async (info, dims) => {
    const cached = cache.get(info.id);
    if (cached) return { ...cached, fromCache: true };
    const complete = CONFIG.ai.provider === 'bridge' ? completeViaBridge : completeViaXai;
    const messages = [
      { role: 'system', content: buildRiskSystemPrompt(dims) },
      { role: 'user', content: buildRiskUserPrompt(info) },
    ];
    const raw = await complete(messages);
    const result = parseRiskResponse(raw, dims);
    cache.set(info.id, result);
    return result;
  };

  /** Score every post with bounded concurrency. One failure never aborts the batch. */
  const scoreAll = async (entries, dims, onProgress) => {
    const results = new Array(entries.length);
    const concurrency = Math.max(1, Math.min(CONFIG.ai.concurrency, 6, entries.length));
    let cursor = 0;
    let done = 0;
    async function worker() {
      while (cursor < entries.length) {
        const i = cursor++;
        try {
          results[i] = await scoreOnePost(entries[i].info, dims);
        } catch (err) {
          results[i] = { error: err.message };
        }
        done++;
        if (onProgress) onProgress(done, entries.length, results[i]);
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));
    return results;
  };

  // ═══════════════════════════════════════════════════════════
  // AGGREGATION
  // ═══════════════════════════════════════════════════════════

  const scoreToGrade = (score) => {
    const s = clampScore(score);
    if (s >= 97) return 'A+';
    if (s >= 90) return 'A';
    if (s >= 80) return 'B';
    if (s >= 65) return 'C';
    if (s >= 45) return 'D';
    return 'F';
  };

  const gradeColor = (grade) => ({
    'A+': '#00ba7c', A: '#00ba7c', B: '#7ac943', C: '#ffd166', D: '#ff9f1c', F: '#f4212e',
  }[grade] || '#8b98a5');

  /**
   * Roll scored posts into one report: overall score, grade, per-dimension
   * averages, and the posts worth acting on. The overall reputation score
   * blends the average risk (typical post) with the single worst post, so
   * one severe outlier still pulls the grade down.
   */
  const buildReport = (entries, scores) => {
    const paired = entries.map((e, i) => ({ ...e, score: scores[i] })).filter((p) => p.score && !p.score.error);
    const errors = scores.filter((s) => s && s.error).length;

    if (paired.length === 0) {
      return { scanned: entries.length, scoredOk: 0, errors, reputationScore: 100, grade: 'A+', verdictCounts: { clean: 0, review: 0, flagged: 0 }, dimensionAverages: {}, dimensionPeaks: {}, worstPosts: [] };
    }

    const verdictCounts = { clean: 0, review: 0, flagged: 0 };
    const dimensionTotals = {};
    const dimensionCounts = {};
    const dimensionPeaks = {};
    let riskTotal = 0;
    for (const { score } of paired) {
      verdictCounts[score.verdict] = (verdictCounts[score.verdict] || 0) + 1;
      riskTotal += score.overall;
      for (const [key, { score: dScore }] of Object.entries(score.dimensions)) {
        dimensionTotals[key] = (dimensionTotals[key] || 0) + dScore;
        dimensionCounts[key] = (dimensionCounts[key] || 0) + 1;
        dimensionPeaks[key] = Math.max(dimensionPeaks[key] || 0, dScore);
      }
    }
    // Averages alone hide what the report exists to surface: one post at 92
    // among four clean ones averages to 18, which reads green next to an F.
    // The peak is kept so the bars can be coloured by the worst single post.
    const dimensionAverages = {};
    for (const key of Object.keys(dimensionTotals)) dimensionAverages[key] = Math.round(dimensionTotals[key] / dimensionCounts[key]);

    const avgRisk = riskTotal / paired.length;
    const worstRisk = Math.max(...paired.map((p) => p.score.overall));
    const reputationScore = clampScore(100 - (avgRisk * 0.6 + worstRisk * 0.4));

    const worstPosts = [...paired].sort((a, b) => b.score.overall - a.score.overall).filter((p) => p.score.overall >= REVIEW_THRESHOLD);

    return { scanned: entries.length, scoredOk: paired.length, errors, reputationScore, grade: scoreToGrade(reputationScore), verdictCounts, dimensionAverages, dimensionPeaks, worstPosts };
  };

  // ═══════════════════════════════════════════════════════════
  // THE SHAREABLE SCORE CARD (canvas, downloadable, copyable)
  // ═══════════════════════════════════════════════════════════

  const CARD_W = 1200;
  const CARD_H = 675;

  /** Rounded-rect path, since CanvasRenderingContext2D.roundRect is not on every engine yet. */
  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  const drawGauge = (ctx, cx, cy, radius, score, color) => {
    const start = Math.PI * 0.75;
    const end = Math.PI * 2.25;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 22;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, end);
    ctx.stroke();

    const sweep = start + (end - start) * (score / 100);
    const gradient = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, '#1d9bf0');
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, start, sweep);
    ctx.stroke();
    // Restore, or the 22px round cap leaks into the footer rule and draws it
    // as a fat pill instead of a hairline.
    ctx.restore();
  };

  /**
   * Render the report as a 1200x675 PNG, X's own card aspect ratio. Returns
   * the canvas so callers can either turn it into a download or a clipboard
   * write without rendering twice.
   */
  const renderCard = (report) => {
    const canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    const ctx = canvas.getContext('2d');
    const color = gradeColor(report.grade);

    const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    bg.addColorStop(0, '#0b0f14');
    bg.addColorStop(1, '#141c26');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < CARD_W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CARD_H); ctx.stroke(); }
    for (let y = 0; y < CARD_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CARD_W, y); ctx.stroke(); }

    ctx.fillStyle = '#e7e9ea';
    ctx.font = '600 26px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    ctx.fillText('🛡️ XActions Reputation Score', 48, 64);
    ctx.fillStyle = '#8b98a5';
    ctx.font = '400 18px -apple-system, sans-serif';
    ctx.fillText(`@${profileUser}  ·  ${report.scoredOk} posts scanned  ·  ${new Date().toLocaleDateString()}`, 48, 92);

    drawGauge(ctx, 220, 340, 130, report.reputationScore, color);
    ctx.fillStyle = color;
    ctx.font = '700 92px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(report.reputationScore), 220, 355);
    ctx.font = '700 34px -apple-system, sans-serif';
    ctx.fillText(report.grade, 220, 400);
    ctx.textAlign = 'left';

    const barsX = 470;
    let barsY = 190;
    ctx.font = '600 16px -apple-system, sans-serif';
    ctx.fillStyle = '#8b98a5';
    ctx.fillText('RISK BREAKDOWN', barsX, barsY);
    barsY += 30;

    // Colour by the PEAK, not the average. A single 92 among four clean posts
    // averages to 18, and a green bar next to an F grade reads as a bug.
    const dims = Object.entries(report.dimensionAverages);
    const barW = 620;
    for (const [key, avg] of dims) {
      const meta = DIMENSION_META[key] || { label: key, emoji: '🔎' };
      const peak = report.dimensionPeaks?.[key] ?? avg;
      ctx.fillStyle = '#e7e9ea';
      ctx.font = '500 16px -apple-system, sans-serif';
      ctx.fillText(`${meta.emoji} ${meta.label}`, barsX, barsY);
      ctx.fillStyle = '#8b98a5';
      ctx.textAlign = 'right';
      ctx.fillText(peak === avg ? `${avg}` : `avg ${avg} · worst ${peak}`, barsX + barW, barsY);
      ctx.textAlign = 'left';
      barsY += 12;
      const riskColor = (n) => (n >= FLAG_THRESHOLD ? '#f4212e' : n >= REVIEW_THRESHOLD ? '#ffd166' : '#00ba7c');
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, barsX, barsY, barW, 12, 6);
      ctx.fill();
      // Faint fill to the peak, solid fill to the average, so both read at once.
      ctx.fillStyle = `${riskColor(peak)}55`;
      roundRect(ctx, barsX, barsY, Math.max(12, barW * (peak / 100)), 12, 6);
      ctx.fill();
      ctx.fillStyle = riskColor(peak);
      roundRect(ctx, barsX, barsY, Math.max(12, barW * (avg / 100)), 12, 6);
      ctx.fill();
      barsY += 40;
    }

    barsY += 10;
    ctx.fillStyle = '#8b98a5';
    ctx.font = '600 16px -apple-system, sans-serif';
    ctx.fillText('VERDICT', barsX, barsY);
    barsY += 34;
    const chips = [
      [`✅ ${report.verdictCounts.clean} clean`, '#00ba7c'],
      [`👀 ${report.verdictCounts.review} review`, '#ffd166'],
      [`🚩 ${report.verdictCounts.flagged} flagged`, '#f4212e'],
    ];
    let chipX = barsX;
    for (const [label, chipColor] of chips) {
      ctx.font = '600 18px -apple-system, sans-serif';
      const w = ctx.measureText(label).width + 32;
      ctx.fillStyle = `${chipColor}22`;
      roundRect(ctx, chipX, barsY - 24, w, 36, 18);
      ctx.fill();
      ctx.fillStyle = chipColor;
      ctx.fillText(label, chipX + 16, barsY);
      chipX += w + 12;
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(48, CARD_H - 56);
    ctx.lineTo(CARD_W - 48, CARD_H - 56);
    ctx.stroke();
    ctx.fillStyle = '#536471';
    ctx.font = '400 15px -apple-system, sans-serif';
    ctx.fillText('Free & open source · scripts/reputationAudit.js · github.com/nirholas/XActions', 48, CARD_H - 28);
    ctx.textAlign = 'right';
    ctx.fillText('xactions.app', CARD_W - 48, CARD_H - 28);
    ctx.textAlign = 'left';

    return canvas;
  };

  const cardFilename = (report) => `xactions-reputation-${profileUser}-${report.reputationScore}-${new Date().toISOString().slice(0, 10)}.png`;

  const downloadCard = (canvas, report) => {
    canvas.toBlob((blob) => {
      if (!blob) { addLog('Could not render the card image.', 'warn'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = cardFilename(report);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      addLog('📥 Downloaded the score card');
    }, 'image/png');
  };

  const copyCard = async (canvas) => {
    if (!navigator.clipboard || !window.ClipboardItem) {
      addLog('This browser cannot copy images to the clipboard. Use Download instead.', 'warn');
      return false;
    }
    return new Promise((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) { resolve(false); return; }
        try {
          await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
          addLog('📋 Copied the score card. Paste it straight into a new post.');
          resolve(true);
        } catch (err) {
          addLog(`Could not copy the image: ${err.message}`, 'warn');
          resolve(false);
        }
      }, 'image/png');
    });
  };

  // ═══════════════════════════════════════════════════════════
  // CLEANUP: delete what got flagged (reuses searchSweep's verified-delete logic)
  // ═══════════════════════════════════════════════════════════

  const openCaretMenu = async (article) => {
    const caret = $(SEL.caret, article);
    if (!caret) throw new Error('post menu button missing');
    caret.scrollIntoView({ block: 'center', behavior: 'smooth' });
    await sleep(300);
    caret.click();
    const menu = await waitFor(SEL.menu, 5000);
    if (!menu) { pressEscape(); throw new Error('post menu did not open'); }
    await sleep(jitter([250, 600]));
    return menu;
  };

  const menuItemMatching = (pattern) => $$(SEL.menuItem).find((item) => pattern.test((item.textContent || '').trim()));

  const deleteOnePost = async (article, info) => {
    if (!info.isMine) throw new Error(`@${info.author} is not you, refusing to delete`);
    await openCaretMenu(article);
    const item = menuItemMatching(/^\s*delete\b/i) || menuItemMatching(/\bdelete post\b/i)
      || (info.isRepost ? menuItemMatching(/undo repost|undo retweet/i) : null);
    if (!item) { pressEscape(); throw new Error('no Delete entry in the menu'); }
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
    const toast = throttleToast();
    if (toast) throw new Error(`X pushed back: "${toast}"`);
    return true;
  };

  const runCleanup = async (selected) => {
    if (selected.length === 0) { addLog('Nothing selected to clean up.', 'warn'); return; }
    const c = CONFIG.cleanup;
    addLog(`${c.dryRun ? '🔍 DRY RUN: ' : '⚠️ LIVE: '}cleaning up ${selected.length} flagged post${selected.length === 1 ? '' : 's'}`);
    let done = 0, failed = 0;
    for (const { article, info } of selected) {
      if (!article.isConnected) { addLog(`  · ${info.id} is no longer on screen, skip`, 'dim'); continue; }
      if (c.dryRun) { addLog(`  🔍 [DRY] would delete "${info.text.slice(0, 60)}${info.text.length > 60 ? '…' : ''}"`); done++; continue; }
      try {
        await deleteOnePost(article, info);
        addLog(`  🗑️ deleted "${info.text.slice(0, 60)}${info.text.length > 60 ? '…' : ''}"`);
        done++;
      } catch (err) {
        addLog(`  ⚠️ ${info.id}: ${err.message}`, 'warn');
        failed++;
      }
      await sleep(jitter([c.minDelay, c.maxDelay]));
    }
    addLog(`Cleanup ${c.dryRun ? 'preview' : 'run'} done: ${done} ${c.dryRun ? 'would delete' : 'deleted'}, ${failed} failed.`);
    return { done, failed };
  };

  // ═══════════════════════════════════════════════════════════
  // THE SCAN
  // ═══════════════════════════════════════════════════════════

  const STATE = {
    running: false,
    entries: [],
    scores: [],
    report: null,
    canvas: null,
    selectedForCleanup: new Set(),
  };

  const persistSummary = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        at: Date.now(),
        reputationScore: STATE.report?.reputationScore,
        grade: STATE.report?.grade,
        scanned: STATE.report?.scanned,
      }));
    } catch { /* best-effort */ }
  };

  const runScan = async () => {
    if (STATE.running) return;
    STATE.running = true;
    setButtons('running');
    const dims = activeDimensions();
    if (dims.length === 0) { addLog('Pick at least one dimension to score against.', 'warn'); STATE.running = false; setButtons('idle'); return; }

    try {
      addLog(`🚀 Scanning @${profileUser} for up to ${CONFIG.scan.maxPosts} posts across ${dims.map((d) => d.key).join(', ')}`);
      setStatus('Collecting posts…');
      STATE.entries = await collectPosts((n) => setStatus(`Collecting posts… ${n}/${CONFIG.scan.maxPosts}`));
      if (STATE.entries.length === 0) {
        addLog('No eligible posts found on this timeline. Try scrolling down manually first, or /with_replies.', 'warn');
        return;
      }
      addLog(`📝 Collected ${STATE.entries.length} posts. Scoring…`);

      setStatus(`Scoring 0/${STATE.entries.length}…`);
      STATE.scores = await scoreAll(STATE.entries, dims, (done, total, result) => {
        setStatus(`Scoring ${done}/${total}…`);
        if (result?.error) addLog(`  ⚠️ scoring failed for one post: ${result.error}`, 'warn');
        updateProgress(done, total);
      });

      STATE.report = buildReport(STATE.entries, STATE.scores);
      persistSummary();
      renderReport();
      addLog(`✅ Done. Reputation score ${STATE.report.reputationScore}/100 (${STATE.report.grade}). ${STATE.report.verdictCounts.flagged} flagged, ${STATE.report.verdictCounts.review} worth a look.`);
      setStatus('Scan complete');
    } catch (err) {
      addLog(`❌ ${err.message}`, 'warn');
      setStatus('Scan failed');
    } finally {
      STATE.running = false;
      setButtons('idle');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // PANEL
  // ═══════════════════════════════════════════════════════════

  const css = `
    #xra-panel{position:fixed;right:16px;bottom:16px;width:400px;max-height:88vh;display:flex;flex-direction:column;z-index:2147483000;background:#0f1419;color:#e7e9ea;border:1px solid #2f3336;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.55);font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;transition:transform .2s ease,opacity .2s ease}
    #xra-panel.xra-min .xra-body,#xra-panel.xra-min .xra-foot{display:none}
    #xra-panel *{box-sizing:border-box}
    .xra-head{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid #2f3336;cursor:move;user-select:none}
    .xra-head b{font-size:14px;flex:1}
    .xra-head button{background:transparent;border:0;color:#8b98a5;font-size:16px;cursor:pointer;padding:2px 6px;border-radius:6px;transition:background .15s,color .15s}
    .xra-head button:hover{background:#1d2226;color:#fff}
    .xra-head button:focus-visible,#xra-panel .xra-btn:focus-visible,#xra-panel .xra-chip:focus-visible{outline:2px solid #1d9bf0;outline-offset:2px}
    .xra-body{overflow:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px}
    .xra-body::-webkit-scrollbar{width:5px}.xra-body::-webkit-scrollbar-thumb{background:#2f3336;border-radius:4px}
    .xra-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .xra-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .xra-label{color:#8b98a5;font-size:12px;display:block;margin-bottom:3px}
    .xra-chips{display:flex;flex-wrap:wrap;gap:6px}
    .xra-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border:1px solid #2f3336;border-radius:999px;cursor:pointer;user-select:none;transition:background .15s,border-color .15s}
    .xra-chip:hover{border-color:#536471}
    .xra-chip.on{background:#1d9bf0;border-color:#1d9bf0;color:#fff}
    .xra-chip input{display:none}
    #xra-panel input[type=text],#xra-panel input[type=password],#xra-panel input[type=number],#xra-panel select,#xra-panel textarea{width:100%;background:#16181c;color:#e7e9ea;border:1px solid #2f3336;border-radius:8px;padding:7px 9px;font:inherit;outline:none;transition:border-color .15s}
    #xra-panel input:focus,#xra-panel select:focus,#xra-panel textarea:focus{border-color:#1d9bf0}
    .xra-section{border:1px solid #2f3336;border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px}
    .xra-section>b{font-size:12px;color:#8b98a5;text-transform:uppercase;letter-spacing:.04em}
    .xra-toggle{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer}
    .xra-toggle input{accent-color:#1d9bf0;width:16px;height:16px}
    .xra-score{display:flex;align-items:center;gap:16px;padding:8px 0}
    .xra-score canvas{width:96px;height:96px}
    .xra-score-num{font-size:40px;font-weight:800;line-height:1}
    .xra-score-grade{font-size:16px;font-weight:700;color:#8b98a5}
    .xra-bars{display:flex;flex-direction:column;gap:8px}
    .xra-bar-row{display:flex;align-items:center;gap:8px;font-size:12px}
    .xra-bar-row .xra-bar-label{width:120px;color:#8b98a5;flex-shrink:0}
    .xra-bar-track{position:relative;flex:1;height:8px;background:rgba(255,255,255,.08);border-radius:4px;overflow:hidden}
    .xra-bar-fill,.xra-bar-peak{position:absolute;left:0;top:0;height:100%;border-radius:4px;transition:width .3s}
    .xra-bar-peak{opacity:.33}
    .xra-flagged{display:flex;flex-direction:column;gap:6px;max-height:220px;overflow:auto}
    .xra-flagged::-webkit-scrollbar{width:4px}.xra-flagged::-webkit-scrollbar-thumb{background:#2f3336}
    .xra-flag-item{display:flex;gap:8px;padding:8px;border:1px solid #2f3336;border-radius:10px;align-items:flex-start}
    .xra-flag-item input{margin-top:3px;accent-color:#f4212e}
    .xra-flag-text{flex:1;font-size:12px}
    .xra-flag-text .why{color:#8b98a5;margin-top:2px}
    .xra-flag-badge{font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;flex-shrink:0}
    .xra-status{font-size:12px;color:#8b98a5;min-height:16px}
    .xra-log{background:#000;border-radius:10px;padding:8px;height:120px;overflow:auto;font:11px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;word-break:break-word}
    .xra-log::-webkit-scrollbar{width:4px}.xra-log::-webkit-scrollbar-thumb{background:#2f3336}
    .xra-log .warn{color:#ffd166}.xra-log .dim{color:#536471}
    .xra-bar{height:6px;background:#16181c;border-radius:3px;overflow:hidden}
    .xra-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#1d9bf0,#7856ff);transition:width .3s}
    .xra-foot{display:flex;gap:8px;padding:12px 14px;border-top:1px solid #2f3336;flex-wrap:wrap}
    .xra-btn{flex:1;min-width:80px;padding:9px 10px;border-radius:999px;border:1px solid #2f3336;background:#16181c;color:#e7e9ea;font-weight:600;cursor:pointer;transition:background .15s,transform .05s}
    .xra-btn:hover:not(:disabled){background:#1d2226}.xra-btn:active:not(:disabled){transform:scale(.98)}
    .xra-btn:disabled{opacity:.4;cursor:not-allowed}
    .xra-btn.primary{background:#1d9bf0;border-color:#1d9bf0;color:#fff}.xra-btn.primary:hover:not(:disabled){background:#1a8cd8}
    .xra-btn.danger{background:#f4212e;border-color:#f4212e;color:#fff}.xra-btn.danger:hover:not(:disabled){background:#d81b28}
    .xra-hint{font-size:11px;color:#8b98a5}
    .xra-empty{font-size:12px;color:#536471;text-align:center;padding:16px 0}
    @media (max-width:480px){#xra-panel{right:8px;left:8px;width:auto}}
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const dimensionChip = (key) => {
    const meta = DIMENSION_META[key];
    return `<label class="xra-chip ${CONFIG.dimensions[key] ? 'on' : ''}" id="xra-chip-${key}" tabindex="0"><input type="checkbox" id="xra-d-${key}" ${CONFIG.dimensions[key] ? 'checked' : ''}>${meta.emoji} ${meta.label}</label>`;
  };

  const panel = document.createElement('div');
  panel.id = 'xra-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'XActions reputation audit');
  panel.innerHTML = `
    <div class="xra-head" id="xra-drag">
      <b>🛡️ Reputation audit</b>
      <button id="xra-min" title="Minimise" aria-label="Minimise panel">_</button>
      <button id="xra-close" title="Close" aria-label="Close panel">✕</button>
    </div>
    <div class="xra-body">
      <div class="xra-section">
        <b>Score against</b>
        <div class="xra-chips">${Object.keys(DIMENSION_META).map(dimensionChip).join('')}</div>
        <label><span class="xra-label">Custom risk question (optional)</span><input type="text" id="xra-custom" placeholder="Does this reveal my employer or home city?" value="${esc(CONFIG.customQuestion)}"></label>
      </div>

      <div class="xra-section">
        <b>Scan</b>
        <div class="xra-grid">
          <label><span class="xra-label">Max posts</span><input type="number" id="xra-max" min="5" max="500" value="${CONFIG.scan.maxPosts}"></label>
          <label><span class="xra-label">Concurrency</span><input type="number" id="xra-concurrency" min="1" max="6" value="${CONFIG.ai.concurrency}"></label>
        </div>
        <label class="xra-toggle"><span>Include reposts</span><input type="checkbox" id="xra-incl-reposts" ${CONFIG.scan.includeReposts ? 'checked' : ''}></label>
        <div class="xra-hint">Tip: open x.com/${esc(profileUser)}/with_replies first to include replies, the biggest source of reputation risk for most accounts.</div>
      </div>

      <div class="xra-section">
        <b>AI provider</b>
        <div class="xra-grid">
          <label><span class="xra-label">Provider</span>
            <select id="xra-provider">
              <option value="xai" ${CONFIG.ai.provider === 'xai' ? 'selected' : ''}>xAI (works here)</option>
              <option value="bridge" ${CONFIG.ai.provider === 'bridge' ? 'selected' : ''}>Extension bridge</option>
            </select>
          </label>
          <label><span class="xra-label">Model</span><input type="text" id="xra-model" value="${esc(CONFIG.ai.model)}"></label>
        </div>
        <label><span class="xra-label">API key</span><input type="password" id="xra-key" placeholder="xai-..." value="${esc(CONFIG.ai.apiKey)}"></label>
        <label class="xra-toggle"><span>Remember key in this browser</span><input type="checkbox" id="xra-remember"></label>
      </div>

      <div class="xra-section" id="xra-report-section" style="display:none">
        <b>Your reputation score</b>
        <div class="xra-score">
          <canvas id="xra-gauge" width="96" height="96"></canvas>
          <div>
            <div class="xra-score-num" id="xra-score-num">-</div>
            <div class="xra-score-grade" id="xra-score-grade"></div>
          </div>
        </div>
        <div class="xra-bars" id="xra-bars"></div>
        <div class="xra-hint" id="xra-verdict-line"></div>
        <div class="xra-btn-row" style="display:flex;gap:8px">
          <button class="xra-btn" id="xra-download">Download card</button>
          <button class="xra-btn" id="xra-copy">Copy image</button>
        </div>
      </div>

      <div class="xra-section" id="xra-flagged-section" style="display:none">
        <b>Worth a second look</b>
        <div class="xra-flagged" id="xra-flagged-list"></div>
        <label class="xra-toggle"><span><b>Cleanup dry run</b> (touch nothing)</span><input type="checkbox" id="xra-cleanup-dry" checked></label>
        <button class="xra-btn danger" id="xra-cleanup">Clean up selected</button>
      </div>

      <div class="xra-bar"><i id="xra-bar"></i></div>
      <div class="xra-status" id="xra-status" role="status" aria-live="polite">Idle</div>
      <div class="xra-log" id="xra-log" aria-live="polite"></div>
    </div>
    <div class="xra-foot">
      <button class="xra-btn primary" id="xra-scan">Scan</button>
      <button class="xra-btn" id="xra-export">Export JSON</button>
    </div>
  `;
  document.body.appendChild(panel);

  const el = (id) => document.getElementById(id);

  function addLog(message, kind = '') {
    const box = el('xra-log');
    const time = new Date().toLocaleTimeString([], { hour12: false });
    const line = document.createElement('div');
    if (kind) line.className = kind;
    line.textContent = `${time}  ${message}`;
    box.appendChild(line);
    while (box.childElementCount > 400) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
    console[kind === 'warn' ? 'warn' : 'log'](`[reputation audit] ${message}`);
  }

  function setStatus(text) { el('xra-status').textContent = text; }
  function updateProgress(done, total) { el('xra-bar').style.width = `${total ? Math.min(100, (done / total) * 100) : 0}%`; }
  function setButtons(mode) {
    const running = mode === 'running';
    el('xra-scan').disabled = running;
    el('xra-scan').textContent = running ? 'Scanning…' : 'Scan';
  }

  function drawMiniGauge(score, color) {
    const canvas = el('xra-gauge');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 96, 96);
    const start = Math.PI * 0.75, end = Math.PI * 2.25;
    ctx.lineCap = 'round'; ctx.lineWidth = 9;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.arc(48, 48, 38, start, end); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.arc(48, 48, 38, start, start + (end - start) * (score / 100)); ctx.stroke();
  }

  function renderReport() {
    const report = STATE.report;
    if (!report) return;
    const color = gradeColor(report.grade);

    el('xra-report-section').style.display = '';
    el('xra-score-num').textContent = report.reputationScore;
    el('xra-score-num').style.color = color;
    el('xra-score-grade').textContent = `${report.grade} grade`;
    drawMiniGauge(report.reputationScore, color);

    el('xra-bars').innerHTML = Object.entries(report.dimensionAverages).map(([key, avg]) => {
      const meta = DIMENSION_META[key] || { label: key, emoji: '🔎' };
      const peak = report.dimensionPeaks?.[key] ?? avg;
      const barColor = peak >= FLAG_THRESHOLD ? '#f4212e' : peak >= REVIEW_THRESHOLD ? '#ffd166' : '#00ba7c';
      const label = peak === avg ? `${avg}` : `${avg} / ${peak}`;
      const title = peak === avg ? `${meta.label}: ${avg}` : `${meta.label}: ${avg} average, ${peak} on the worst post`;
      return `<div class="xra-bar-row" title="${esc(title)}"><span class="xra-bar-label">${meta.emoji} ${esc(meta.label)}</span><div class="xra-bar-track"><div class="xra-bar-peak" style="width:${peak}%;background:${barColor}"></div><div class="xra-bar-fill" style="width:${avg}%;background:${barColor}"></div></div><span>${label}</span></div>`;
    }).join('');

    el('xra-verdict-line').textContent = `${report.verdictCounts.clean} clean · ${report.verdictCounts.review} worth a look · ${report.verdictCounts.flagged} flagged` + (report.errors ? ` · ${report.errors} failed to score` : '');

    STATE.selectedForCleanup = new Set(report.worstPosts.filter((p) => p.score.verdict === 'flagged').map((p) => p.info.id));
    const flaggedSection = el('xra-flagged-section');
    if (report.worstPosts.length === 0) {
      flaggedSection.style.display = '';
      el('xra-flagged-list').innerHTML = '<div class="xra-empty">Nothing flagged. Your timeline reads clean against this rubric.</div>';
    } else {
      flaggedSection.style.display = '';
      el('xra-flagged-list').innerHTML = report.worstPosts.map(({ info, score }) => {
        const badgeColor = score.verdict === 'flagged' ? '#f4212e' : '#ffd166';
        const worst = score.dimensions[score.worstDimension];
        const meta = DIMENSION_META[score.worstDimension] || { label: score.worstDimension, emoji: '🔎' };
        return `<div class="xra-flag-item">
          <input type="checkbox" data-id="${esc(info.id)}" ${score.verdict === 'flagged' ? 'checked' : ''}>
          <div class="xra-flag-text">
            <div>${esc(info.text.slice(0, 90))}${info.text.length > 90 ? '…' : ''}</div>
            <div class="why">${meta.emoji} ${esc(meta.label)}: ${esc(worst.reason)}</div>
          </div>
          <span class="xra-flag-badge" style="background:${badgeColor}22;color:${badgeColor}">${score.overall}</span>
        </div>`;
      }).join('');
      $$('#xra-flagged-list input[type=checkbox]').forEach((box) => {
        box.addEventListener('change', () => {
          if (box.checked) STATE.selectedForCleanup.add(box.dataset.id);
          else STATE.selectedForCleanup.delete(box.dataset.id);
        });
      });
    }

    STATE.canvas = renderCard(report);
  }

  // ── Panel <-> CONFIG ──────────────────────────────────────

  function readPanel() {
    for (const key of Object.keys(DIMENSION_META)) CONFIG.dimensions[key] = el(`xra-d-${key}`).checked;
    CONFIG.customQuestion = el('xra-custom').value.trim();
    CONFIG.scan.maxPosts = Math.max(5, Number(el('xra-max').value) || 60);
    CONFIG.ai.concurrency = Math.max(1, Math.min(6, Number(el('xra-concurrency').value) || 3));
    CONFIG.scan.includeReposts = el('xra-incl-reposts').checked;
    CONFIG.ai.provider = el('xra-provider').value;
    CONFIG.ai.model = el('xra-model').value.trim();
    CONFIG.ai.apiKey = el('xra-key').value.trim();
    CONFIG.cleanup.dryRun = el('xra-cleanup-dry').checked;
    try {
      if (el('xra-remember').checked && CONFIG.ai.apiKey) localStorage.setItem(KEY_STORAGE, CONFIG.ai.apiKey);
      else if (!el('xra-remember').checked) localStorage.removeItem(KEY_STORAGE);
    } catch { /* private mode, keep the key in memory only */ }
  }

  function syncChips() {
    for (const key of Object.keys(DIMENSION_META)) el(`xra-chip-${key}`).classList.toggle('on', el(`xra-d-${key}`).checked);
  }

  for (const id of ['xra-custom', 'xra-max', 'xra-concurrency', 'xra-incl-reposts', 'xra-provider', 'xra-model', 'xra-key', 'xra-remember', 'xra-cleanup-dry']) {
    el(id).addEventListener('input', readPanel);
    el(id).addEventListener('change', readPanel);
  }
  for (const key of Object.keys(DIMENSION_META)) {
    const chip = el(`xra-chip-${key}`);
    el(`xra-d-${key}`).addEventListener('change', () => { readPanel(); syncChips(); });
    chip.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      const input = el(`xra-d-${key}`);
      input.checked = !input.checked;
      readPanel(); syncChips();
    });
  }

  const savedKey = (() => { try { return localStorage.getItem(KEY_STORAGE) || ''; } catch { return ''; } })();
  if (savedKey) { CONFIG.ai.apiKey = savedKey; el('xra-key').value = savedKey; el('xra-remember').checked = true; }

  // ── Buttons ───────────────────────────────────────────────

  el('xra-min').addEventListener('click', () => panel.classList.toggle('xra-min'));
  el('xra-close').addEventListener('click', () => {
    panel.remove();
    style.remove();
    delete window.XReputationAudit;
  });

  el('xra-scan').addEventListener('click', () => { readPanel(); runScan(); });

  el('xra-download').addEventListener('click', () => {
    if (!STATE.canvas) { addLog('Scan first.', 'warn'); return; }
    downloadCard(STATE.canvas, STATE.report);
  });
  el('xra-copy').addEventListener('click', () => {
    if (!STATE.canvas) { addLog('Scan first.', 'warn'); return; }
    copyCard(STATE.canvas);
  });

  el('xra-cleanup').addEventListener('click', async () => {
    readPanel();
    if (!STATE.report) { addLog('Scan first.', 'warn'); return; }
    const selected = STATE.report.worstPosts.filter((p) => STATE.selectedForCleanup.has(p.info.id));
    if (selected.length === 0) { addLog('Nothing checked in the list above.', 'warn'); return; }
    if (!CONFIG.cleanup.dryRun) {
      const ok = window.confirm(`Permanently delete ${selected.length} post${selected.length === 1 ? '' : 's'}? This cannot be undone.`);
      if (!ok) { addLog('Cancelled. Nothing was deleted.'); return; }
    }
    el('xra-cleanup').disabled = true;
    try {
      await runCleanup(selected);
    } finally {
      el('xra-cleanup').disabled = false;
    }
  });

  el('xra-export').addEventListener('click', () => {
    if (!STATE.report) { addLog('Nothing to export yet. Scan first.', 'warn'); return; }
    const payload = {
      username: profileUser,
      ranAt: new Date().toISOString(),
      report: STATE.report,
      posts: STATE.entries.map((e, i) => ({ id: e.info.id, url: e.info.url, text: e.info.text, score: STATE.scores[i] })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `xactions-reputation-${profileUser}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    addLog(`📥 Exported ${STATE.entries.length} rows`);
  });

  // ── Drag ──────────────────────────────────────────────────

  (() => {
    const head = el('xra-drag');
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

  // Alt+Shift+R scans, mirroring Alt+Shift+S in the other sweep panels.
  window.addEventListener('keydown', (event) => {
    if (!event.altKey || !event.shiftKey || event.key.toLowerCase() !== 'r') return;
    event.preventDefault();
    if (!STATE.running) el('xra-scan').click();
  });

  // ═══════════════════════════════════════════════════════════
  // CONSOLE API
  // ═══════════════════════════════════════════════════════════

  window.XReputationAudit = {
    config: CONFIG,
    state: STATE,
    scan: () => el('xra-scan').click(),
    downloadCard: () => el('xra-download').click(),
    copyCard: () => el('xra-copy').click(),
    cleanup: () => el('xra-cleanup').click(),
    export: () => el('xra-export').click(),
    clearCache: () => { cache.clear(); addLog('Cleared the scoring cache. The next scan re-scores every post.'); },
    /** Every post currently on screen, with the eligibility verdict, before spending on the AI provider. */
    preview: () => $$(SEL.article).map(readArticle).filter(Boolean).map((info) => ({ ...info, eligible: eligible(info) })),
    /** Parse a raw model completion the way scoring does, for testing a provider/prompt without a live scan. */
    parseRiskResponse,
    buildRiskSystemPrompt,
    buildRiskUserPrompt,
  };

  syncChips();
  addLog(`Loaded on @${profileUser}. Pick your rubric and hit Scan.`);
  addLog('Scanning only reads and scores. Cleanup is a separate step with its own dry run. Alt+Shift+R scans.', 'dim');
})();

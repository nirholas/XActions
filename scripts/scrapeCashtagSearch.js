// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * X Cashtag Search Scraper — Browser Console Script
 * 
 * USAGE:
 * 1. Go to x.com and search for a cashtag (e.g. "$pump-sdk") in the search bar
 * 2. Select the "Latest" tab for chronological results
 * 3. Open DevTools (F12) → Console
 * 4. Paste this entire script and press Enter
 * 5. Use the floating control panel to manage scraping
 *
 * FEATURES:
 * - Auto-scrolls and extracts all posts from cashtag search results
 * - Optional date range filtering (start/end date)
 * - Extracts replies for each post (click-through scraping)
 * - Built-in sentiment analysis for case study research
 * - Floating control panel: Pause, Resume, Stop, Export JSON, Export CSV, Download
 * - Deduplication by post ID
 * - Progress counter in real-time
 *
 * CONFIG (edit before pasting if needed):
 */
const SCRAPER_CONFIG = {
  /** Set to filter posts ON or AFTER this date (inclusive). null = no limit */
  startDate: null, // e.g. '2026-01-01' or new Date('2026-01-01')
  /** Set to filter posts ON or BEFORE this date (inclusive). null = no limit */
  endDate: null,   // e.g. '2026-03-09' or new Date('2026-03-09')
  /** Scroll delay in ms between scroll steps (lower = faster, higher = safer) */
  scrollDelay: 1500,
  /** Max posts to collect (0 = unlimited) */
  maxPosts: 0,
  /** Also scrape replies for each post (slower but thorough) */
  scrapeReplies: true,
  /** Max replies to collect per post */
  maxRepliesPerPost: 50,
  /** Delay between opening each post for reply scraping (ms) */
  replyDelay: 2000,
};

// ============================================================================
// DO NOT EDIT BELOW — Script logic
// ============================================================================

(function XCashtagScraper() {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  const state = {
    running: false,
    paused: false,
    posts: new Map(),       // id → post object
    replies: new Map(),     // parentId → [reply objects]
    scrollCount: 0,
    phase: 'idle',         // idle | scrolling | scraping-replies | done
    startDate: SCRAPER_CONFIG.startDate ? new Date(SCRAPER_CONFIG.startDate) : null,
    endDate: SCRAPER_CONFIG.endDate ? new Date(SCRAPER_CONFIG.endDate) : null,
    reachedEnd: false,
    abortController: null,
  };

  // Normalise dates to start/end of day
  if (state.startDate) state.startDate.setHours(0, 0, 0, 0);
  if (state.endDate) state.endDate.setHours(23, 59, 59, 999);

  // ── Sentiment helpers ──────────────────────────────────────────────────────
  const BULLISH = [
    'moon','bullish','pump','buy','long','rocket','ath','gains','profit',
    'green','breakout','surge','accumulate','hodl','wagmi','send it','lfg',
    'undervalued','gem','100x','alpha','bullrun','rally','huge','massive',
    'explode','soar','🚀','🔥','💎','🙌'
  ];
  const BEARISH = [
    'crash','bearish','dump','sell','short','rekt','scam','rug','loss','red',
    'down','fear','dead','ngmi','panic','liquidated','ponzi','bubble','fraud',
    'overvalued','collapse','plummet','tank','🐻','📉','💀'
  ];

  function scoreSentiment(text) {
    if (!text) return { score: 0, label: 'neutral', confidence: 0 };
    const lower = text.toLowerCase();
    let bull = 0, bear = 0;
    for (const w of BULLISH) if (lower.includes(w)) bull++;
    for (const w of BEARISH) if (lower.includes(w)) bear++;
    const total = bull + bear;
    if (total === 0) return { score: 0, label: 'neutral', confidence: 0 };
    const score = (bull - bear) / total; // -1 to 1
    const label = score > 0.2 ? 'bullish' : score < -0.2 ? 'bearish' : 'neutral';
    const confidence = Math.min(total / 5, 1);
    return { score: +score.toFixed(3), label, confidence: +confidence.toFixed(2) };
  }

  function extractTickers(text) {
    if (!text) return [];
    const m = text.match(/\$[A-Za-z][A-Za-z0-9_-]{0,19}\b/g);
    return m ? [...new Set(m)] : [];
  }

  // ── DOM Parsing ────────────────────────────────────────────────────────────
  function parseRelativeTime(timeStr) {
    if (!timeStr) return null;
    // X shows absolute dates like "Jan 5" or "Jan 5, 2026", or relative "2h", "3m"
    const absolute = Date.parse(timeStr);
    if (!isNaN(absolute)) return new Date(absolute);
    const now = Date.now();
    const match = timeStr.match(/^(\d+)(s|m|h|d)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      const unit = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[match[2]];
      return new Date(now - n * unit);
    }
    return null;
  }

  function extractPostsFromDOM() {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const newPosts = [];
    for (const article of articles) {
      try {
        // Post ID from the permalink
        const timeEl = article.querySelector('time');
        const linkEl = timeEl ? timeEl.closest('a') : null;
        const href = linkEl ? linkEl.getAttribute('href') : null;
        if (!href) continue;
        const idMatch = href.match(/\/status\/(\d+)/);
        if (!idMatch) continue;
        const id = idMatch[1];
        if (state.posts.has(id)) continue;

        // Timestamp
        const datetime = timeEl ? timeEl.getAttribute('datetime') : null;
        const postDate = datetime ? new Date(datetime) : parseRelativeTime(timeEl?.textContent?.trim());

        // Date filtering
        if (postDate) {
          if (state.startDate && postDate < state.startDate) {
            state.reachedEnd = true;
            continue;
          }
          if (state.endDate && postDate > state.endDate) continue;
        }

        // Author
        const userLinks = article.querySelectorAll('a[role="link"]');
        let username = '';
        let displayName = '';
        for (const ul of userLinks) {
          const h = ul.getAttribute('href');
          if (h && h.match(/^\/[A-Za-z0-9_]+$/) && !h.includes('/status/')) {
            username = h.replace('/', '');
            const nameSpan = ul.querySelector('span');
            if (nameSpan) displayName = nameSpan.textContent?.trim() || '';
            break;
          }
        }

        // Text content
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const text = textEl ? textEl.textContent?.trim() : '';

        // Engagement metrics
        const getMetric = (testid) => {
          const el = article.querySelector(`[data-testid="${testid}"]`);
          if (!el) return 0;
          const raw = el.getAttribute('aria-label') || el.textContent || '0';
          const nums = raw.match(/[\d,]+/);
          return nums ? parseInt(nums[0].replace(/,/g, ''), 10) : 0;
        };

        const likes = getMetric('like');
        const retweets = getMetric('retweet');
        const replyCount = getMetric('reply');
        const bookmarks = getMetric('bookmark');

        // Views
        const analyticsLink = article.querySelector('a[href*="/analytics"]');
        let views = 0;
        if (analyticsLink) {
          const viewText = analyticsLink.getAttribute('aria-label') || analyticsLink.textContent || '0';
          const vn = viewText.match(/[\d,]+/);
          views = vn ? parseInt(vn[0].replace(/,/g, ''), 10) : 0;
        }

        // Media
        const hasImage = !!article.querySelector('[data-testid="tweetPhoto"]');
        const hasVideo = !!article.querySelector('[data-testid="videoPlayer"]');

        // Sentiment
        const sentiment = scoreSentiment(text);
        const tickers = extractTickers(text);

        const post = {
          id,
          url: `https://x.com${href}`,
          username,
          displayName,
          text,
          timestamp: postDate ? postDate.toISOString() : null,
          likes,
          retweets,
          replies: replyCount,
          bookmarks,
          views,
          hasImage,
          hasVideo,
          tickers,
          sentiment,
          scrapedAt: new Date().toISOString(),
        };

        state.posts.set(id, post);
        newPosts.push(post);
      } catch (e) {
        // Skip malformed articles
      }
    }
    return newPosts;
  }

  // ── Reply Scraping ─────────────────────────────────────────────────────────
  // Uses X's SPA router — click into thread view, scrape, press Back.
  // This keeps the script alive (no full page reload).

  function parseReplyArticle(article, parentId) {
    try {
      const timeEl = article.querySelector('time');
      const linkEl = timeEl ? timeEl.closest('a') : null;
      const href = linkEl ? linkEl.getAttribute('href') : null;
      if (!href) return null;
      const idMatch = href.match(/\/status\/(\d+)/);
      if (!idMatch) return null;
      const replyId = idMatch[1];
      if (replyId === parentId) return null; // skip the parent post itself

      const datetime = timeEl ? timeEl.getAttribute('datetime') : null;
      const replyDate = datetime ? new Date(datetime) : null;

      const userLinks = article.querySelectorAll('a[role="link"]');
      let username = '';
      for (const ul of userLinks) {
        const h = ul.getAttribute('href');
        if (h && h.match(/^\/[A-Za-z0-9_]+$/) && !h.includes('/status/')) {
          username = h.replace('/', '');
          break;
        }
      }

      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl ? textEl.textContent?.trim() : '';
      const sentiment = scoreSentiment(text);
      const tickers = extractTickers(text);

      const getMetric = (testid) => {
        const el = article.querySelector(`[data-testid="${testid}"]`);
        if (!el) return 0;
        const raw = el.getAttribute('aria-label') || el.textContent || '0';
        const nums = raw.match(/[\d,]+/);
        return nums ? parseInt(nums[0].replace(/,/g, ''), 10) : 0;
      };

      return {
        id: replyId,
        parentId,
        url: `https://x.com${href}`,
        username,
        text,
        timestamp: replyDate ? replyDate.toISOString() : null,
        likes: getMetric('like'),
        retweets: getMetric('retweet'),
        replies: getMetric('reply'),
        tickers,
        sentiment,
        scrapedAt: new Date().toISOString(),
      };
    } catch (e) {
      return null;
    }
  }

  async function scrapeRepliesForPost(post) {
    if (!SCRAPER_CONFIG.scrapeReplies) return [];
    const replies = [];
    const seenIds = new Set();
    
    try {
      // Click the post text/time area to navigate into thread view via SPA router
      // Find the article for this post by matching its status link
      const allArticles = document.querySelectorAll('article[data-testid="tweet"]');
      let targetArticle = null;
      for (const a of allArticles) {
        const link = a.querySelector(`a[href*="/status/${post.id}"]`);
        if (link) { targetArticle = a; break; }
      }
      if (!targetArticle) return [];

      // Click the tweet text to enter thread view (SPA navigation, no reload)
      const clickTarget = targetArticle.querySelector('[data-testid="tweetText"]')
                       || targetArticle.querySelector('time');
      if (!clickTarget) return [];
      clickTarget.click();

      // Wait for thread view to load
      await sleep(SCRAPER_CONFIG.replyDelay);

      // Scroll through the thread to collect replies
      let prevHeight = 0;
      let scrollAttempts = 0;
      const maxScrolls = Math.ceil(SCRAPER_CONFIG.maxRepliesPerPost / 5);

      while (scrollAttempts < maxScrolls && replies.length < SCRAPER_CONFIG.maxRepliesPerPost) {
        if (state.paused) await waitForResume();
        if (!state.running) break;

        const threadArticles = document.querySelectorAll('article[data-testid="tweet"]');
        for (const article of threadArticles) {
          if (replies.length >= SCRAPER_CONFIG.maxRepliesPerPost) break;
          const reply = parseReplyArticle(article, post.id);
          if (reply && !seenIds.has(reply.id)) {
            seenIds.add(reply.id);
            replies.push(reply);
          }
        }

        window.scrollTo(0, document.body.scrollHeight);
        await sleep(1200);

        const newHeight = document.body.scrollHeight;
        if (newHeight === prevHeight) break;
        prevHeight = newHeight;
        scrollAttempts++;
      }

      // Navigate back to search results (SPA back button)
      window.history.back();
      await sleep(SCRAPER_CONFIG.replyDelay);

      // Wait for search results to re-render
      let retries = 0;
      while (retries < 10) {
        const searchInput = document.querySelector('input[data-testid="SearchBox_Search_Input"]');
        if (searchInput) break;
        await sleep(500);
        retries++;
      }
    } catch (e) {
      console.warn(`[Scraper] Failed to scrape replies for ${post.id}:`, e.message);
      // Try to go back if something went wrong
      try { window.history.back(); } catch (_) {}
      await sleep(SCRAPER_CONFIG.replyDelay);
    }

    return replies;
  }

  // ── Utilities ──────────────────────────────────────────────────────────────
  function sleep(ms) {
    return new Promise(resolve => {
      const id = setTimeout(resolve, ms);
      // Allow abort
      if (state.abortController) {
        state.abortController.signal.addEventListener('abort', () => {
          clearTimeout(id);
          resolve();
        }, { once: true });
      }
    });
  }

  function waitForResume() {
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (!state.paused || !state.running) {
          clearInterval(check);
          resolve();
        }
      }, 300);
    });
  }

  // ── Export helpers ─────────────────────────────────────────────────────────
  function buildExportData() {
    const posts = [...state.posts.values()].sort((a, b) =>
      (b.timestamp || '').localeCompare(a.timestamp || '')
    );
    const allReplies = [];
    for (const [, reps] of state.replies) {
      allReplies.push(...reps);
    }
    
    // Aggregate sentiment
    const sentiments = posts.map(p => p.sentiment.score);
    const avgSentiment = sentiments.length
      ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
      : 0;

    // Top tickers
    const tickerCounts = {};
    for (const p of posts) {
      for (const t of p.tickers) {
        tickerCounts[t] = (tickerCounts[t] || 0) + 1;
      }
    }
    const topTickers = Object.entries(tickerCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([ticker, count]) => ({ ticker, count }));

    return {
      meta: {
        query: document.querySelector('input[data-testid="SearchBox_Search_Input"]')?.value || 'unknown',
        scrapedAt: new Date().toISOString(),
        totalPosts: posts.length,
        totalReplies: allReplies.length,
        dateRange: {
          start: state.startDate ? state.startDate.toISOString() : null,
          end: state.endDate ? state.endDate.toISOString() : null,
        },
        aggregateSentiment: {
          score: +avgSentiment.toFixed(3),
          label: avgSentiment > 0.1 ? 'bullish' : avgSentiment < -0.1 ? 'bearish' : 'neutral',
          distribution: {
            bullish: posts.filter(p => p.sentiment.label === 'bullish').length,
            neutral: posts.filter(p => p.sentiment.label === 'neutral').length,
            bearish: posts.filter(p => p.sentiment.label === 'bearish').length,
          },
        },
        topTickers,
      },
      posts,
      replies: allReplies,
    };
  }

  function downloadJSON() {
    const data = buildExportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const query = data.meta.query.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `x-cashtag-${query}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    log(`Exported ${data.meta.totalPosts} posts + ${data.meta.totalReplies} replies as JSON`);
  }

  function downloadCSV() {
    const data = buildExportData();
    const rows = [
      ['type','id','parentId','url','username','text','timestamp','likes','retweets','replies','bookmarks','views','tickers','sentiment_score','sentiment_label'].join(',')
    ];
    
    const escape = (s) => `"${String(s || '').replace(/"/g, '""')}"`;
    
    for (const p of data.posts) {
      rows.push([
        'post', p.id, '', escape(p.url), escape(p.username), escape(p.text),
        p.timestamp || '', p.likes, p.retweets, p.replies, p.bookmarks || 0, p.views,
        escape(p.tickers.join(' ')), p.sentiment.score, p.sentiment.label
      ].join(','));
    }
    for (const r of data.replies) {
      rows.push([
        'reply', r.id, r.parentId, escape(r.url), escape(r.username), escape(r.text),
        r.timestamp || '', r.likes, r.retweets, r.replies, '', '',
        escape(r.tickers.join(' ')), r.sentiment.score, r.sentiment.label
      ].join(','));
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const query = data.meta.query.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `x-cashtag-${query}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    log(`Exported ${data.meta.totalPosts} posts + ${data.meta.totalReplies} replies as CSV`);
  }

  // ── Logging ────────────────────────────────────────────────────────────────
  function log(msg) {
    console.log(`%c[X-Scraper] ${msg}`, 'color: #1d9bf0; font-weight: bold;');
    updatePanel();
  }

  // ── Control Panel UI ──────────────────────────────────────────────────────
  let panelEl = null;

  function createPanel() {
    if (panelEl) panelEl.remove();

    panelEl = document.createElement('div');
    panelEl.id = 'x-scraper-panel';
    panelEl.innerHTML = `
      <style>
        #x-scraper-panel {
          position: fixed;
          top: 12px;
          right: 12px;
          z-index: 999999;
          background: #15202b;
          border: 1px solid #38444d;
          border-radius: 16px;
          padding: 16px;
          width: 320px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #e7e9ea;
          box-shadow: 0 4px 24px rgba(0,0,0,0.5);
          cursor: move;
          user-select: none;
        }
        #x-scraper-panel * { box-sizing: border-box; }
        #x-scraper-panel h3 {
          margin: 0 0 8px 0;
          font-size: 15px;
          color: #1d9bf0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        #x-scraper-panel .stats {
          font-size: 13px;
          color: #8899a6;
          margin-bottom: 10px;
          line-height: 1.6;
        }
        #x-scraper-panel .stats b { color: #e7e9ea; }
        #x-scraper-panel .btn-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 8px;
        }
        #x-scraper-panel button {
          flex: 1 1 auto;
          min-width: 70px;
          padding: 7px 10px;
          border: 1px solid #38444d;
          border-radius: 9999px;
          background: #1d2935;
          color: #e7e9ea;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        #x-scraper-panel button:hover { background: #22303c; }
        #x-scraper-panel button.primary { 
          background: #1d9bf0; 
          border-color: #1d9bf0; 
          color: #fff; 
        }
        #x-scraper-panel button.primary:hover { background: #1a8cd8; }
        #x-scraper-panel button.danger { 
          background: #67070f; 
          border-color: #67070f; 
          color: #fff; 
        }
        #x-scraper-panel button.danger:hover { background: #8b1a1a; }
        #x-scraper-panel button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        #x-scraper-panel .date-row {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
        }
        #x-scraper-panel .date-row label {
          font-size: 11px;
          color: #8899a6;
          display: block;
          margin-bottom: 2px;
        }
        #x-scraper-panel .date-row input {
          width: 100%;
          padding: 5px 8px;
          border: 1px solid #38444d;
          border-radius: 8px;
          background: #1d2935;
          color: #e7e9ea;
          font-size: 12px;
        }
        #x-scraper-panel .log-area {
          max-height: 80px;
          overflow-y: auto;
          font-size: 11px;
          color: #8899a6;
          border-top: 1px solid #38444d;
          padding-top: 6px;
          margin-top: 6px;
        }
        #x-scraper-panel .sentiment-bar {
          height: 6px;
          border-radius: 3px;
          background: #38444d;
          overflow: hidden;
          margin-top: 4px;
        }
        #x-scraper-panel .sentiment-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s;
        }
        #x-scraper-panel .minimize-btn {
          position: absolute;
          top: 8px;
          right: 12px;
          background: none;
          border: none;
          color: #8899a6;
          font-size: 16px;
          cursor: pointer;
          min-width: unset;
          padding: 2px 6px;
          flex: unset;
        }
      </style>
      <button class="minimize-btn" id="xsp-minimize">−</button>
      <h3>🔍 X Cashtag Scraper</h3>
      <div class="date-row">
        <div style="flex:1">
          <label>Start Date</label>
          <input type="date" id="xsp-start-date" />
        </div>
        <div style="flex:1">
          <label>End Date</label>
          <input type="date" id="xsp-end-date" />
        </div>
      </div>
      <div class="stats" id="xsp-stats">
        Status: <b>Ready</b><br>
        Posts: <b>0</b> &nbsp;|&nbsp; Replies: <b>0</b><br>
        Scrolls: <b>0</b>
      </div>
      <div id="xsp-sentiment-section" style="margin-bottom:8px;display:none">
        <div style="font-size:12px;color:#8899a6;">
          Sentiment: <b id="xsp-sentiment-label">neutral</b> 
          (<span id="xsp-sentiment-score">0.000</span>)
        </div>
        <div class="sentiment-bar">
          <div class="sentiment-fill" id="xsp-sentiment-fill" 
               style="width:50%;background:#8899a6;"></div>
        </div>
      </div>
      <div class="btn-row">
        <button class="primary" id="xsp-start">▶ Start</button>
        <button id="xsp-pause" disabled>⏸ Pause</button>
        <button class="danger" id="xsp-stop" disabled>⏹ Stop</button>
      </div>
      <div class="btn-row">
        <button id="xsp-export-json" disabled>📋 JSON</button>
        <button id="xsp-export-csv" disabled>📊 CSV</button>
        <button id="xsp-download" disabled>⬇ Download</button>
      </div>
      <div class="log-area" id="xsp-log"></div>
    `;
    document.body.appendChild(panelEl);

    // Draggable
    let isDragging = false, startX, startY, origX, origY;
    panelEl.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = panelEl.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panelEl.style.left = (origX + e.clientX - startX) + 'px';
      panelEl.style.top = (origY + e.clientY - startY) + 'px';
      panelEl.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { isDragging = false; });

    // Minimize/expand
    let minimized = false;
    document.getElementById('xsp-minimize').addEventListener('click', () => {
      minimized = !minimized;
      const els = panelEl.querySelectorAll('.stats,.btn-row,.date-row,.log-area,#xsp-sentiment-section');
      els.forEach(el => el.style.display = minimized ? 'none' : '');
      document.getElementById('xsp-minimize').textContent = minimized ? '+' : '−';
    });

    // Date inputs
    const startInput = document.getElementById('xsp-start-date');
    const endInput = document.getElementById('xsp-end-date');
    if (state.startDate) startInput.value = state.startDate.toISOString().slice(0, 10);
    if (state.endDate) endInput.value = state.endDate.toISOString().slice(0, 10);
    startInput.addEventListener('change', () => {
      state.startDate = startInput.value ? new Date(startInput.value + 'T00:00:00') : null;
    });
    endInput.addEventListener('change', () => {
      state.endDate = endInput.value ? new Date(endInput.value + 'T23:59:59') : null;
    });

    // Button handlers
    document.getElementById('xsp-start').addEventListener('click', startScraping);
    document.getElementById('xsp-pause').addEventListener('click', togglePause);
    document.getElementById('xsp-stop').addEventListener('click', stopScraping);
    document.getElementById('xsp-export-json').addEventListener('click', downloadJSON);
    document.getElementById('xsp-export-csv').addEventListener('click', downloadCSV);
    document.getElementById('xsp-download').addEventListener('click', () => {
      downloadJSON();
      downloadCSV();
    });
  }

  function panelLog(msg) {
    const logEl = document.getElementById('xsp-log');
    if (!logEl) return;
    const line = document.createElement('div');
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.prepend(line);
    // Keep last 50 log lines
    while (logEl.children.length > 50) logEl.removeChild(logEl.lastChild);
  }

  function updatePanel() {
    const statsEl = document.getElementById('xsp-stats');
    if (!statsEl) return;

    const totalReplies = [...state.replies.values()].reduce((s, r) => s + r.length, 0);
    const statusText = state.phase === 'idle' ? 'Ready' 
      : state.paused ? 'Paused'
      : state.phase === 'scrolling' ? 'Scrolling & Collecting...'
      : state.phase === 'scraping-replies' ? 'Scraping Replies...'
      : 'Done';

    statsEl.innerHTML = `
      Status: <b>${statusText}</b><br>
      Posts: <b>${state.posts.size}</b> &nbsp;|&nbsp; Replies: <b>${totalReplies}</b><br>
      Scrolls: <b>${state.scrollCount}</b>
    `;

    // Sentiment bar
    const sentSection = document.getElementById('xsp-sentiment-section');
    if (state.posts.size > 0 && sentSection) {
      sentSection.style.display = '';
      const posts = [...state.posts.values()];
      const avg = posts.reduce((s, p) => s + p.sentiment.score, 0) / posts.length;
      const pct = ((avg + 1) / 2 * 100).toFixed(0);
      const color = avg > 0.1 ? '#00ba7c' : avg < -0.1 ? '#f4212e' : '#8899a6';
      const label = avg > 0.1 ? 'bullish' : avg < -0.1 ? 'bearish' : 'neutral';
      document.getElementById('xsp-sentiment-label').textContent = label;
      document.getElementById('xsp-sentiment-label').style.color = color;
      document.getElementById('xsp-sentiment-score').textContent = avg.toFixed(3);
      const fill = document.getElementById('xsp-sentiment-fill');
      fill.style.width = pct + '%';
      fill.style.background = color;
    }

    // Button states
    const isActive = state.running;
    const hasData = state.posts.size > 0;
    const setDisabled = (id, d) => { const el = document.getElementById(id); if (el) el.disabled = d; };
    setDisabled('xsp-start', isActive);
    setDisabled('xsp-pause', !isActive);
    setDisabled('xsp-stop', !isActive && !hasData);
    setDisabled('xsp-export-json', !hasData);
    setDisabled('xsp-export-csv', !hasData);
    setDisabled('xsp-download', !hasData);

    // Update pause button text
    const pauseBtn = document.getElementById('xsp-pause');
    if (pauseBtn) {
      pauseBtn.textContent = state.paused ? '▶ Resume' : '⏸ Pause';
    }
  }

  // ── Main Scraping Loop ─────────────────────────────────────────────────────
  async function startScraping() {
    if (state.running) return;
    state.running = true;
    state.paused = false;
    state.phase = 'scrolling';
    state.reachedEnd = false;
    state.abortController = new AbortController();

    log('Scraping started — scrolling to collect posts...');
    panelLog('Started scraping');
    updatePanel();

    // Phase 1: Scroll and collect posts
    let noNewPostsCount = 0;
    const maxNoNew = 10; // stop after 10 scrolls with no new posts

    while (state.running && !state.reachedEnd) {
      if (state.paused) {
        await waitForResume();
        if (!state.running) break;
      }

      const prevCount = state.posts.size;
      const newPosts = extractPostsFromDOM();

      if (newPosts.length > 0) {
        panelLog(`+${newPosts.length} posts (total: ${state.posts.size})`);
        noNewPostsCount = 0;
      } else {
        noNewPostsCount++;
        if (noNewPostsCount >= maxNoNew) {
          log(`No new posts after ${maxNoNew} scrolls, finishing scroll phase`);
          panelLog('Reached end of results');
          break;
        }
      }

      // Check max posts limit
      if (SCRAPER_CONFIG.maxPosts > 0 && state.posts.size >= SCRAPER_CONFIG.maxPosts) {
        log(`Reached max posts limit (${SCRAPER_CONFIG.maxPosts})`);
        panelLog(`Max limit: ${SCRAPER_CONFIG.maxPosts}`);
        break;
      }

      // Scroll down
      window.scrollTo(0, document.body.scrollHeight);
      state.scrollCount++;
      updatePanel();
      await sleep(SCRAPER_CONFIG.scrollDelay);
    }

    if (!state.running) {
      state.phase = 'done';
      updatePanel();
      return;
    }

    // Phase 2: Scrape replies (optional)
    if (SCRAPER_CONFIG.scrapeReplies && state.running) {
      state.phase = 'scraping-replies';
      updatePanel();
      log(`Scraping replies for ${state.posts.size} posts...`);
      panelLog(`Starting reply scraping for ${state.posts.size} posts`);

      const postsArray = [...state.posts.values()];
      let i = 0;
      for (const post of postsArray) {
        if (!state.running) break;
        if (state.paused) {
          await waitForResume();
          if (!state.running) break;
        }

        i++;
        if (post.replies === 0) continue; // skip posts with no replies

        panelLog(`Replies ${i}/${postsArray.length}: @${post.username}`);
        const replies = await scrapeRepliesForPost(post);
        if (replies.length > 0) {
          state.replies.set(post.id, replies);
          panelLog(`Got ${replies.length} replies for post ${post.id}`);
        }
        updatePanel();
      }
    }

    // Done
    state.running = false;
    state.phase = 'done';
    const totalReplies = [...state.replies.values()].reduce((s, r) => s + r.length, 0);
    log(`✅ Scraping complete! ${state.posts.size} posts, ${totalReplies} replies`);
    panelLog('Scraping complete!');
    updatePanel();
  }

  function togglePause() {
    if (!state.running) return;
    state.paused = !state.paused;
    log(state.paused ? 'Paused' : 'Resumed');
    panelLog(state.paused ? 'Paused' : 'Resumed');
    updatePanel();
  }

  function stopScraping() {
    state.running = false;
    state.paused = false;
    if (state.abortController) state.abortController.abort();
    state.phase = 'done';
    log('Stopped');
    panelLog('Stopped by user');
    updatePanel();
  }

  // ── Initialize ─────────────────────────────────────────────────────────────
  // Clean up any previous instance 
  const existingPanel = document.getElementById('x-scraper-panel');
  if (existingPanel) existingPanel.remove();

  createPanel();
  log('Panel ready. Set date filters if needed then click Start.');
  panelLog('Scraper loaded');
  console.log(
    '%c[X-Scraper] Ready! Use the floating panel in the top-right corner.',
    'color: #1d9bf0; font-size: 14px; font-weight: bold;'
  );
})();

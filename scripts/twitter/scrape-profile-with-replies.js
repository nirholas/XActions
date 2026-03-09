/**
 * ============================================================
 * 🐦 X/Twitter Profile + Replies Scraper
 * ============================================================
 *
 * Scrapes a user's posts (including their replies) from the
 * /with_replies tab, then navigates into each post to collect
 * all reply comments from other users.
 *
 * Perfect for case studies and sentiment analysis.
 *
 * by nichxbt — https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📖 HOW TO USE:
 * ============================================================
 *
 * 1. Open Chrome/Edge/Firefox and go to the target profile's
 *    "with_replies" page, e.g.:
 *    https://x.com/nichxbt/with_replies
 *
 * 2. Open DevTools (F12 or Cmd+Opt+I)
 *
 * 3. Go to the Console tab
 *
 * 4. If you see a warning about pasting, type:
 *    allow pasting
 *    and press Enter
 *
 * 5. Copy this ENTIRE script and paste it into the console
 *
 * 6. Press Enter to run
 *
 * 7. A floating control panel will appear. Use it to:
 *    - Monitor progress in real time
 *    - Pause / Resume scraping
 *    - Export data at any point (JSON, CSV, Markdown)
 *    - Stop scraping early
 *
 * 8. When scraping completes (or you stop it), exports are
 *    triggered automatically based on CONFIG.export settings.
 *
 * ============================================================
 * ⚙️ CONFIGURATION
 * ============================================================
 */

const CONFIG = {

  // ==========================================
  // 📊 SCRAPING SETTINGS
  // ==========================================

  // Maximum number of the user's posts to collect from the profile feed.
  // Set to Infinity to scrape everything until the feed ends.
  targetPostCount: 50,

  // Maximum replies to collect PER POST when drilling into a thread.
  // Set higher for thorough sentiment analysis; lower for speed.
  maxRepliesPerPost: 50,

  // Maximum scroll attempts on the profile feed before giving up.
  maxFeedScrollAttempts: 200,

  // Maximum scroll attempts inside a single post's thread.
  maxThreadScrollAttempts: 30,

  // Delay between scrolls (ms). Increase if content doesn't load.
  scrollDelay: 2000,

  // Delay after navigating into/out of a post (ms). Lets the page settle.
  navigationDelay: 3000,

  // ==========================================
  // 🎯 POST RANGE FILTER
  // ==========================================
  // Limit scraping to a range of posts by ID or URL.
  // Leave null to scrape from the top of the feed.

  range: {
    // Start collecting posts AFTER this post (exclusive).
    // Accepts a post ID (e.g. '1234567890') or full URL.
    // null = start from the very first post in the feed.
    startPostId: null,

    // Stop collecting posts AFTER this post (inclusive).
    // Accepts a post ID or full URL.
    // null = scrape until targetPostCount or feed end.
    endPostId: null,
  },

  // ==========================================
  // 🔍 CONTENT FILTERS
  // ==========================================

  filters: {
    // Only include posts containing at least one of these words.
    // Empty array = include all.
    whitelist: [],

    // Exclude posts containing any of these words.
    blacklist: [],

    // Only posts from the last N days. 0 = no date limit.
    daysBack: 0,

    // Minimum engagement thresholds. 0 = no minimum.
    minLikes: 0,
    minRetweets: 0,

    // true = skip retweets from the feed
    excludeRetweets: false,
  },

  // ==========================================
  // 📤 EXPORT SETTINGS
  // ==========================================

  export: {
    json: true,
    csv: true,
    markdown: false,
    text: false,
    html: false,
  },

  // ==========================================
  // 🖥️ CONTROL PANEL
  // ==========================================

  panel: {
    // Show the floating control panel
    enabled: true,

    // Panel start position from top-right corner
    top: 20,
    right: 20,
  },

  // ==========================================
  // 🔧 GENERAL
  // ==========================================

  // Copy primary export (JSON) to clipboard on completion
  copyToClipboard: true,

  // Show verbose progress in console
  verbose: true,

  // Also scrape replies for the user's own reply-tweets
  // (when the user replied to someone else's post).
  // If false, only scrapes replies on the user's original posts.
  scrapeRepliesOnUserReplies: true,
};

/**
 * ============================================================
 * 🚀 SCRIPT START — DO NOT MODIFY BELOW UNLESS YOU KNOW
 *    WHAT YOU'RE DOING
 * ============================================================
 */

(async function XProfileRepliesScraper() {
  'use strict';

  // ─── State ──────────────────────────────────────────────
  const state = {
    phase: 'init',          // 'init' | 'feed' | 'replies' | 'done'
    paused: false,
    stopped: false,
    posts: [],              // collected profile posts
    currentPostIndex: -1,   // index of post currently being reply-scraped
    totalReplies: 0,
    startTime: Date.now(),
    feedScrolls: 0,
    reachedStart: !CONFIG.range.startPostId,  // if no start filter, we're already past it
    reachedEnd: false,
    originalUrl: window.location.href,
    errors: [],
  };

  const seenPostIds = new Set();

  // ─── Helpers ────────────────────────────────────────────

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /** Wait while paused, checking every 200ms. */
  async function waitWhilePaused() {
    while (state.paused && !state.stopped) {
      await sleep(200);
    }
  }

  /** Extract post ID from a URL or raw ID string. */
  function normalizePostId(input) {
    if (!input) return null;
    input = String(input).trim();
    // Full URL: https://x.com/user/status/1234567890
    const match = input.match(/\/status\/(\d+)/);
    if (match) return match[1];
    // Raw numeric ID
    if (/^\d+$/.test(input)) return input;
    return null;
  }

  /** Parse engagement strings like '1.2K', '3M'. */
  function parseEngagement(str) {
    if (!str || str === '') return 0;
    str = str.trim().toUpperCase();
    if (str.includes('K')) return Math.round(parseFloat(str) * 1_000);
    if (str.includes('M')) return Math.round(parseFloat(str) * 1_000_000);
    return parseInt(str.replace(/,/g, ''), 10) || 0;
  }

  function extractHashtags(text) {
    return (text.match(/#[\w]+/g) || []);
  }

  function extractMentions(text) {
    return (text.match(/@[\w]+/g) || []);
  }

  function extractUrls(text) {
    return (text.match(/https?:\/\/[^\s]+/g) || []);
  }

  function elapsed() {
    return ((Date.now() - state.startTime) / 1000).toFixed(1);
  }

  function log(msg) {
    if (CONFIG.verbose) console.log(msg);
  }

  // Normalize range IDs
  const startId = normalizePostId(CONFIG.range.startPostId);
  const endId = normalizePostId(CONFIG.range.endPostId);

  // ─── DOM extraction helpers ─────────────────────────────

  /**
   * Extract data from a single tweet article element.
   * Returns null if it can't be parsed.
   */
  function extractTweetFromElement(article) {
    try {
      const linkEl = article.querySelector('a[href*="/status/"]');
      if (!linkEl) return null;
      const url = linkEl.href;
      const id = url.split('/status/')[1]?.split(/[?/]/)[0];
      if (!id) return null;

      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl ? textEl.innerText : '';

      const timeEl = article.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : null;
      const displayTime = timeEl ? timeEl.innerText : '';

      const metric = (testId) => {
        const el = article.querySelector(`[data-testid="${testId}"]`);
        const span = el?.querySelector('span span');
        return span ? span.innerText : '0';
      };

      const replies = metric('reply');
      const retweets = metric('retweet');
      const likes = metric('like');

      const viewsEl = article.querySelector('a[href*="/analytics"]');
      const views = viewsEl ? viewsEl.innerText : '0';

      const hasImage = !!article.querySelector('[data-testid="tweetPhoto"]');
      const hasVideo = !!article.querySelector('[data-testid="videoPlayer"]');
      const hasCard = !!article.querySelector('[data-testid="card.wrapper"]');

      const socialCtx = article.querySelector('[data-testid="socialContext"]')?.innerText || '';
      const isRetweet = socialCtx.includes('reposted');
      const isReply = !!article.querySelector('[data-testid="tweetText"]')
        ?.closest('article')
        ?.querySelector('div[id] > div > div > div > div > a[href*="/status/"]');

      // Get the author handle from the tweet
      const authorEl = article.querySelector('div[data-testid="User-Name"] a[href^="/"]');
      const authorHandle = authorEl ? authorEl.getAttribute('href').replace('/', '') : '';
      const authorNameEl = article.querySelector('div[data-testid="User-Name"] span');
      const authorName = authorNameEl ? authorNameEl.innerText : '';

      return {
        id,
        url,
        text,
        author: {
          handle: authorHandle,
          name: authorName,
        },
        timestamp,
        displayTime,
        metrics: { replies, retweets, likes, views },
        media: { hasImage, hasVideo, hasCard },
        type: { isRetweet, isReply: socialCtx.includes('Replying to') },
        extracted: {
          hashtags: extractHashtags(text),
          mentions: extractMentions(text),
          urls: extractUrls(text),
        },
        scrapedAt: new Date().toISOString(),
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Check whether a post passes all content filters.
   */
  function passesFilters(tweet) {
    const text = tweet.text.toLowerCase();

    if (CONFIG.filters.whitelist.length > 0) {
      if (!CONFIG.filters.whitelist.some(w => text.includes(w.toLowerCase()))) return false;
    }
    if (CONFIG.filters.blacklist.length > 0) {
      if (CONFIG.filters.blacklist.some(w => text.includes(w.toLowerCase()))) return false;
    }
    if (CONFIG.filters.daysBack > 0 && tweet.timestamp) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - CONFIG.filters.daysBack);
      if (new Date(tweet.timestamp) < cutoff) return false;
    }
    if (parseEngagement(tweet.metrics.likes) < CONFIG.filters.minLikes) return false;
    if (parseEngagement(tweet.metrics.retweets) < CONFIG.filters.minRetweets) return false;
    if (CONFIG.filters.excludeRetweets && tweet.type.isRetweet) return false;

    return true;
  }

  // ─── Control Panel UI ──────────────────────────────────

  let panelEl = null;
  let statusEl = null;
  let postsCountEl = null;
  let repliesCountEl = null;
  let phaseEl = null;
  let elapsedEl = null;
  let progressBarEl = null;
  let currentPostEl = null;
  let logAreaEl = null;

  function createPanel() {
    if (!CONFIG.panel.enabled) return;

    // Remove existing panel if re-running
    const existing = document.getElementById('x-scraper-panel');
    if (existing) existing.remove();

    panelEl = document.createElement('div');
    panelEl.id = 'x-scraper-panel';
    panelEl.innerHTML = `
      <style>
        #x-scraper-panel {
          position: fixed;
          top: ${CONFIG.panel.top}px;
          right: ${CONFIG.panel.right}px;
          width: 360px;
          max-height: 90vh;
          background: #15202b;
          color: #e7e9ea;
          border: 1px solid #38444d;
          border-radius: 16px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          z-index: 999999;
          box-shadow: 0 8px 30px rgba(0,0,0,0.5);
          overflow: hidden;
          user-select: none;
        }
        #x-scraper-panel * { box-sizing: border-box; }
        .xsp-header {
          background: #1d9bf0;
          padding: 12px 16px;
          cursor: move;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 700;
          font-size: 14px;
        }
        .xsp-header span { display: flex; align-items: center; gap: 6px; }
        .xsp-body { padding: 12px 16px; }
        .xsp-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          border-bottom: 1px solid #38444d22;
        }
        .xsp-row .label { color: #8899a6; }
        .xsp-row .value { font-weight: 600; font-variant-numeric: tabular-nums; }
        .xsp-progress {
          margin: 10px 0;
          height: 6px;
          background: #38444d;
          border-radius: 3px;
          overflow: hidden;
        }
        .xsp-progress-bar {
          height: 100%;
          background: #1d9bf0;
          border-radius: 3px;
          transition: width 0.3s ease;
          width: 0%;
        }
        .xsp-current {
          padding: 6px 8px;
          margin: 8px 0;
          background: #192734;
          border-radius: 8px;
          font-size: 12px;
          color: #8899a6;
          max-height: 40px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .xsp-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-top: 10px;
        }
        .xsp-btn {
          padding: 8px 12px;
          border: none;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: opacity 0.2s;
          text-align: center;
        }
        .xsp-btn:hover { opacity: 0.85; }
        .xsp-btn:active { transform: scale(0.97); }
        .xsp-btn-pause { background: #ffd166; color: #15202b; }
        .xsp-btn-resume { background: #06d6a0; color: #15202b; }
        .xsp-btn-stop { background: #ef476f; color: #fff; }
        .xsp-btn-export { background: #1d9bf0; color: #fff; }
        .xsp-btn-download { background: #8338ec; color: #fff; }
        .xsp-btn-full { grid-column: 1 / -1; }
        .xsp-log {
          margin-top: 10px;
          max-height: 100px;
          overflow-y: auto;
          font-size: 11px;
          color: #8899a6;
          background: #192734;
          border-radius: 8px;
          padding: 6px 8px;
        }
        .xsp-log div { padding: 1px 0; }
        .xsp-log .warn { color: #ffd166; }
        .xsp-log .err { color: #ef476f; }
        .xsp-log .ok { color: #06d6a0; }
        .xsp-minimize {
          background: none;
          border: none;
          color: #fff;
          font-size: 18px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
      </style>

      <div class="xsp-header" id="xsp-drag-handle">
        <span>🐦 X Scraper</span>
        <div style="display:flex;gap:4px;">
          <button class="xsp-minimize" id="xsp-minimize" title="Minimize">−</button>
          <button class="xsp-minimize" id="xsp-close" title="Close panel">×</button>
        </div>
      </div>

      <div class="xsp-body" id="xsp-body">
        <div class="xsp-row">
          <span class="label">Phase</span>
          <span class="value" id="xsp-phase">Initializing…</span>
        </div>
        <div class="xsp-row">
          <span class="label">Status</span>
          <span class="value" id="xsp-status">Running</span>
        </div>
        <div class="xsp-row">
          <span class="label">Posts collected</span>
          <span class="value" id="xsp-posts">0 / ${CONFIG.targetPostCount === Infinity ? '∞' : CONFIG.targetPostCount}</span>
        </div>
        <div class="xsp-row">
          <span class="label">Replies collected</span>
          <span class="value" id="xsp-replies">0</span>
        </div>
        <div class="xsp-row">
          <span class="label">Elapsed</span>
          <span class="value" id="xsp-elapsed">0s</span>
        </div>

        <div class="xsp-progress">
          <div class="xsp-progress-bar" id="xsp-progress-bar"></div>
        </div>

        <div class="xsp-current" id="xsp-current">Preparing…</div>

        <div class="xsp-buttons">
          <button class="xsp-btn xsp-btn-pause" id="xsp-pause">⏸ Pause</button>
          <button class="xsp-btn xsp-btn-stop" id="xsp-stop">⏹ Stop</button>
          <button class="xsp-btn xsp-btn-export" id="xsp-export">📦 Export Now</button>
          <button class="xsp-btn xsp-btn-download" id="xsp-download">💾 Download</button>
          <button class="xsp-btn xsp-btn-export xsp-btn-full" id="xsp-pause-export" style="background:#118ab2;">⏸ Pause & Export</button>
        </div>

        <div class="xsp-log" id="xsp-log"></div>
      </div>
    `;

    document.body.appendChild(panelEl);

    // Cache elements
    statusEl = document.getElementById('xsp-status');
    postsCountEl = document.getElementById('xsp-posts');
    repliesCountEl = document.getElementById('xsp-replies');
    phaseEl = document.getElementById('xsp-phase');
    elapsedEl = document.getElementById('xsp-elapsed');
    progressBarEl = document.getElementById('xsp-progress-bar');
    currentPostEl = document.getElementById('xsp-current');
    logAreaEl = document.getElementById('xsp-log');

    // ── Dragging ──
    let isDragging = false, dragX, dragY;
    const handle = document.getElementById('xsp-drag-handle');
    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      dragX = e.clientX - panelEl.offsetLeft;
      dragY = e.clientY - panelEl.offsetTop;
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panelEl.style.left = (e.clientX - dragX) + 'px';
      panelEl.style.right = 'auto';
      panelEl.style.top = (e.clientY - dragY) + 'px';
    });
    document.addEventListener('mouseup', () => { isDragging = false; });

    // ── Minimize ──
    const body = document.getElementById('xsp-body');
    document.getElementById('xsp-minimize').addEventListener('click', () => {
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });

    // ── Close ──
    document.getElementById('xsp-close').addEventListener('click', () => {
      panelEl.style.display = panelEl.style.display === 'none' ? 'block' : 'none';
    });

    // ── Buttons ──
    document.getElementById('xsp-pause').addEventListener('click', () => {
      if (state.paused) {
        state.paused = false;
        updateStatus('Running');
        panelLog('▶ Resumed', 'ok');
        document.getElementById('xsp-pause').textContent = '⏸ Pause';
        document.getElementById('xsp-pause').className = 'xsp-btn xsp-btn-pause';
      } else {
        state.paused = true;
        updateStatus('Paused');
        panelLog('⏸ Paused', 'warn');
        document.getElementById('xsp-pause').textContent = '▶ Resume';
        document.getElementById('xsp-pause').className = 'xsp-btn xsp-btn-resume';
      }
    });

    document.getElementById('xsp-stop').addEventListener('click', () => {
      state.stopped = true;
      state.paused = false;
      updateStatus('Stopped');
      panelLog('⏹ Stopped by user', 'warn');
    });

    document.getElementById('xsp-export').addEventListener('click', () => {
      panelLog('📦 Exporting…', 'ok');
      exportAllFormats();
    });

    document.getElementById('xsp-download').addEventListener('click', () => {
      panelLog('💾 Downloading…', 'ok');
      downloadAllFormats();
    });

    document.getElementById('xsp-pause-export').addEventListener('click', () => {
      state.paused = true;
      updateStatus('Paused');
      document.getElementById('xsp-pause').textContent = '▶ Resume';
      document.getElementById('xsp-pause').className = 'xsp-btn xsp-btn-resume';
      panelLog('⏸ Paused & exporting…', 'warn');
      exportAllFormats();
    });

    // Timer
    setInterval(() => {
      if (elapsedEl) elapsedEl.textContent = elapsed() + 's';
    }, 1000);
  }

  function updateStatus(s) {
    if (statusEl) statusEl.textContent = s;
  }

  function updatePhase(p) {
    if (phaseEl) phaseEl.textContent = p;
    state.phase = p;
  }

  function updatePostsCount() {
    const target = CONFIG.targetPostCount === Infinity ? '∞' : CONFIG.targetPostCount;
    if (postsCountEl) postsCountEl.textContent = `${state.posts.length} / ${target}`;
  }

  function updateRepliesCount() {
    if (repliesCountEl) repliesCountEl.textContent = String(state.totalReplies);
  }

  function updateProgress(pct) {
    if (progressBarEl) progressBarEl.style.width = Math.min(100, pct).toFixed(1) + '%';
  }

  function updateCurrent(msg) {
    if (currentPostEl) currentPostEl.textContent = msg;
  }

  function panelLog(msg, cls = '') {
    log(msg);
    if (!logAreaEl) return;
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.textContent = `[${elapsed()}s] ${msg}`;
    logAreaEl.prepend(d);
    // Keep log under 200 entries
    while (logAreaEl.children.length > 200) logAreaEl.lastChild.remove();
  }

  // ─── Export helpers ─────────────────────────────────────

  function buildResult() {
    const profileMatch = state.originalUrl.match(/x\.com\/([^\/]+)/);
    const profileName = profileMatch ? profileMatch[1] : 'unknown';

    const totalReplyCount = state.posts.reduce((sum, p) => sum + (p.replies_scraped?.length || 0), 0);

    return {
      profile: profileName,
      profileUrl: `https://x.com/${profileName}`,
      scrapedAt: new Date().toISOString(),
      duration: elapsed() + 's',
      totalPosts: state.posts.length,
      totalRepliesScraped: totalReplyCount,
      config: {
        targetPostCount: CONFIG.targetPostCount,
        maxRepliesPerPost: CONFIG.maxRepliesPerPost,
        startPostId: startId,
        endPostId: endId,
        filters: CONFIG.filters,
      },
      posts: state.posts,
    };
  }

  function downloadFile(content, filename, mimeType) {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('Download failed:', e);
      return false;
    }
  }

  function toCSV(result) {
    // Posts CSV
    const postHeaders = ['PostID', 'URL', 'Author', 'Date', 'Text', 'Likes', 'Retweets', 'Replies', 'Views', 'IsRetweet', 'IsReply', 'Hashtags', 'RepliesScraped'];
    const postRows = result.posts.map(p => [
      p.id,
      p.url,
      p.author?.handle || '',
      p.displayTime,
      '"' + (p.text || '').replace(/"/g, '""').replace(/\n/g, ' ') + '"',
      parseEngagement(p.metrics.likes),
      parseEngagement(p.metrics.retweets),
      parseEngagement(p.metrics.replies),
      parseEngagement(p.metrics.views),
      p.type.isRetweet,
      p.type.isReply,
      '"' + (p.extracted?.hashtags || []).join(' ') + '"',
      (p.replies_scraped || []).length,
    ].join(','));

    // Replies CSV
    const replyHeaders = ['ParentPostID', 'ReplyID', 'URL', 'Author', 'AuthorHandle', 'Date', 'Text', 'Likes', 'Retweets', 'Replies', 'Views'];
    const replyRows = [];
    result.posts.forEach(p => {
      (p.replies_scraped || []).forEach(r => {
        replyRows.push([
          p.id,
          r.id,
          r.url,
          '"' + (r.author?.name || '').replace(/"/g, '""') + '"',
          r.author?.handle || '',
          r.displayTime,
          '"' + (r.text || '').replace(/"/g, '""').replace(/\n/g, ' ') + '"',
          parseEngagement(r.metrics?.likes),
          parseEngagement(r.metrics?.retweets),
          parseEngagement(r.metrics?.replies),
          parseEngagement(r.metrics?.views),
        ].join(','));
      });
    });

    const postsCSV = [postHeaders.join(','), ...postRows].join('\n');
    const repliesCSV = [replyHeaders.join(','), ...replyRows].join('\n');

    return { postsCSV, repliesCSV };
  }

  function toMarkdown(result) {
    let md = `# X Posts & Replies — @${result.profile}\n\n`;
    md += `> Scraped: ${result.scrapedAt}  \n`;
    md += `> Posts: ${result.totalPosts} | Replies: ${result.totalRepliesScraped}  \n`;
    md += `> Duration: ${result.duration}\n\n`;

    result.posts.forEach((p, i) => {
      md += `---\n\n`;
      md += `## Post ${i + 1} — ${p.displayTime}\n\n`;
      md += `**@${p.author?.handle || '?'}**: ${p.text}\n\n`;
      md += `❤️ ${p.metrics.likes} | 🔄 ${p.metrics.retweets} | 💬 ${p.metrics.replies} | 👁️ ${p.metrics.views}  \n`;
      md += `[View post](${p.url})\n\n`;

      if (p.replies_scraped?.length > 0) {
        md += `### Replies (${p.replies_scraped.length})\n\n`;
        p.replies_scraped.forEach((r, j) => {
          md += `> **${j + 1}. @${r.author?.handle || '?'}** (${r.displayTime}): ${r.text}  \n`;
          md += `> ❤️ ${r.metrics?.likes || 0} | 💬 ${r.metrics?.replies || 0}  \n\n`;
        });
      }
    });

    return md;
  }

  function toPlainText(result) {
    let txt = `X POSTS & REPLIES — @${result.profile}\n`;
    txt += `${'='.repeat(60)}\n`;
    txt += `Scraped: ${result.scrapedAt}\n`;
    txt += `Posts: ${result.totalPosts} | Replies: ${result.totalRepliesScraped}\n\n`;

    result.posts.forEach((p, i) => {
      txt += `${'─'.repeat(60)}\n`;
      txt += `POST ${i + 1} — @${p.author?.handle || '?'} — ${p.displayTime}\n`;
      txt += `${'─'.repeat(60)}\n`;
      txt += `${p.text}\n\n`;
      txt += `Likes: ${p.metrics.likes} | RTs: ${p.metrics.retweets} | Replies: ${p.metrics.replies} | Views: ${p.metrics.views}\n`;
      txt += `URL: ${p.url}\n\n`;

      if (p.replies_scraped?.length > 0) {
        txt += `  REPLIES (${p.replies_scraped.length}):\n`;
        p.replies_scraped.forEach((r, j) => {
          txt += `  ${j + 1}. @${r.author?.handle || '?'} (${r.displayTime}): ${r.text}\n`;
          txt += `     Likes: ${r.metrics?.likes || 0}\n\n`;
        });
      }
      txt += '\n';
    });

    return txt;
  }

  function toHTML(result) {
    const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>X Posts — @${esc(result.profile)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; background: #f7f9fa; color: #0f1419; }
  h1 { color: #1d9bf0; }
  .meta { color: #536471; margin-bottom: 24px; }
  .post { background: #fff; border: 1px solid #eff3f4; border-radius: 16px; padding: 16px; margin-bottom: 16px; }
  .post-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
  .handle { font-weight: 700; color: #1d9bf0; }
  .post-text { margin: 8px 0; white-space: pre-wrap; }
  .metrics { color: #536471; font-size: 13px; }
  .replies { margin-top: 12px; padding-left: 16px; border-left: 3px solid #1d9bf0; }
  .reply { padding: 8px 0; border-bottom: 1px solid #eff3f4; }
  .reply:last-child { border-bottom: none; }
  .reply-handle { font-weight: 600; color: #536471; }
  a { color: #1d9bf0; text-decoration: none; }
  a:hover { text-decoration: underline; }
</style>
</head>
<body>
<h1>🐦 X Posts &amp; Replies — @${esc(result.profile)}</h1>
<div class="meta">
  Scraped: ${esc(result.scrapedAt)} | Posts: ${result.totalPosts} | Replies: ${result.totalRepliesScraped} | Duration: ${esc(result.duration)}
</div>
`;

    result.posts.forEach((p, i) => {
      html += `<div class="post">
  <div class="post-header">
    <span class="handle">@${esc(p.author?.handle)}</span>
    <span>${esc(p.displayTime)}</span>
  </div>
  <div class="post-text">${esc(p.text)}</div>
  <div class="metrics">❤️ ${esc(p.metrics.likes)} | 🔄 ${esc(p.metrics.retweets)} | 💬 ${esc(p.metrics.replies)} | 👁️ ${esc(p.metrics.views)} — <a href="${esc(p.url)}" target="_blank">View</a></div>
`;
      if (p.replies_scraped?.length > 0) {
        html += `  <div class="replies"><strong>Replies (${p.replies_scraped.length})</strong>\n`;
        p.replies_scraped.forEach(r => {
          html += `    <div class="reply">
      <span class="reply-handle">@${esc(r.author?.handle)}</span> <span style="color:#536471;font-size:12px;">${esc(r.displayTime)}</span><br>
      ${esc(r.text)}<br>
      <span style="color:#536471;font-size:12px;">❤️ ${esc(r.metrics?.likes || '0')}</span>
    </div>\n`;
        });
        html += `  </div>\n`;
      }
      html += `</div>\n`;
    });

    html += `</body></html>`;
    return html;
  }

  function exportAllFormats() {
    const result = buildResult();
    const dateStr = new Date().toISOString().split('T')[0];
    const profileName = result.profile;

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📦 EXPORTING DATA                                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    if (CONFIG.export.json) {
      const json = JSON.stringify(result, null, 2);
      console.log(`📎 JSON: ${(json.length / 1024).toFixed(1)} KB`);
      if (CONFIG.copyToClipboard) {
        navigator.clipboard.writeText(json).then(
          () => panelLog('📋 JSON copied to clipboard', 'ok'),
          () => panelLog('⚠ Clipboard copy failed', 'warn')
        );
      }
    }

    if (CONFIG.export.csv) {
      const { postsCSV, repliesCSV } = toCSV(result);
      console.log(`📎 Posts CSV: ${(postsCSV.length / 1024).toFixed(1)} KB`);
      console.log(`📎 Replies CSV: ${(repliesCSV.length / 1024).toFixed(1)} KB`);
    }

    console.log('✅ Export data ready! Use 💾 Download to save files.');
    panelLog('📦 Export complete', 'ok');

    // Store on window for console access
    window.__xScraperResult = result;
    console.log('💡 Tip: Access data via window.__xScraperResult');

    return result;
  }

  function downloadAllFormats() {
    const result = buildResult();
    const dateStr = new Date().toISOString().split('T')[0];
    const profileName = result.profile;
    let count = 0;

    if (CONFIG.export.json) {
      downloadFile(JSON.stringify(result, null, 2), `${profileName}-posts-replies-${dateStr}.json`, 'application/json');
      count++;
    }
    if (CONFIG.export.csv) {
      const { postsCSV, repliesCSV } = toCSV(result);
      downloadFile(postsCSV, `${profileName}-posts-${dateStr}.csv`, 'text/csv');
      downloadFile(repliesCSV, `${profileName}-replies-${dateStr}.csv`, 'text/csv');
      count += 2;
    }
    if (CONFIG.export.markdown) {
      downloadFile(toMarkdown(result), `${profileName}-posts-replies-${dateStr}.md`, 'text/markdown');
      count++;
    }
    if (CONFIG.export.text) {
      downloadFile(toPlainText(result), `${profileName}-posts-replies-${dateStr}.txt`, 'text/plain');
      count++;
    }
    if (CONFIG.export.html) {
      downloadFile(toHTML(result), `${profileName}-posts-replies-${dateStr}.html`, 'text/html');
      count++;
    }

    panelLog(`💾 Downloaded ${count} file(s)`, 'ok');
  }

  // ─── Phase 1: Scrape profile feed ──────────────────────

  async function scrapeProfileFeed() {
    updatePhase('📜 Scraping profile feed…');
    panelLog('Phase 1: Collecting posts from feed');

    let noNewCount = 0;
    let prevCount = 0;

    while (
      state.posts.length < CONFIG.targetPostCount &&
      state.feedScrolls < CONFIG.maxFeedScrollAttempts &&
      !state.stopped &&
      !state.reachedEnd
    ) {
      await waitWhilePaused();
      if (state.stopped) break;

      // Extract visible tweets
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      let newThisRound = 0;

      for (const article of articles) {
        if (state.posts.length >= CONFIG.targetPostCount || state.reachedEnd) break;

        const tweet = extractTweetFromElement(article);
        if (!tweet || seenPostIds.has(tweet.id)) continue;
        seenPostIds.add(tweet.id);

        // ── Range: Start filter ──
        if (!state.reachedStart) {
          if (startId && tweet.id === startId) {
            state.reachedStart = true;
            panelLog(`🎯 Reached start post ${startId}`, 'ok');
          }
          continue; // skip posts before startId
        }

        // ── Range: End filter ──
        if (endId && tweet.id === endId) {
          state.reachedEnd = true;
          panelLog(`🏁 Reached end post ${endId}`, 'ok');
        }

        // Apply content filters
        if (!passesFilters(tweet)) continue;

        // Initialize reply storage
        tweet.replies_scraped = [];

        state.posts.push(tweet);
        newThisRound++;
        updatePostsCount();
      }

      if (newThisRound > 0) {
        noNewCount = 0;
        const pct = CONFIG.targetPostCount === Infinity
          ? 50 // indeterminate
          : (state.posts.length / CONFIG.targetPostCount) * 50;
        updateProgress(pct);
        updateCurrent(`Collected ${state.posts.length} posts…`);
      } else {
        noNewCount++;
        if (noNewCount >= 8) {
          panelLog('⚠ No new posts after 8 scrolls. Feed may have ended.', 'warn');
          break;
        }
      }

      prevCount = state.posts.length;

      // Scroll
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      state.feedScrolls++;
    }

    panelLog(`✅ Feed done: ${state.posts.length} posts collected`, 'ok');
  }

  // ─── Phase 2: Scrape replies for each post ─────────────

  /**
   * Navigate to a tweet's page by simulating a click on the timestamp link,
   * which triggers X's SPA client-side routing (no full page reload).
   */
  async function navigateToTweet(postUrl) {
    // Find the tweet article with this URL and click its timestamp link
    const links = document.querySelectorAll('a[href*="/status/"]');
    let targetLink = null;

    for (const link of links) {
      if (link.href === postUrl) {
        // Prefer the time element link (more reliable for navigation)
        const time = link.querySelector('time');
        if (time) {
          targetLink = link;
          break;
        }
      }
    }

    if (targetLink) {
      targetLink.click();
    } else {
      // Fallback: direct navigation
      window.location.href = postUrl;
    }

    await sleep(CONFIG.navigationDelay);
  }

  async function navigateBack() {
    window.history.back();
    await sleep(CONFIG.navigationDelay);
  }

  /**
   * Once on a tweet detail page, extract replies from the thread.
   * Replies appear as articles below the main tweet.
   */
  async function scrapeThreadReplies(parentPostId) {
    const replies = [];
    const seenReplyIds = new Set();
    let scrollAttempts = 0;
    let noNewCount = 0;

    // Wait for tweet thread to load
    await sleep(1000);

    while (
      replies.length < CONFIG.maxRepliesPerPost &&
      scrollAttempts < CONFIG.maxThreadScrollAttempts &&
      !state.stopped
    ) {
      await waitWhilePaused();
      if (state.stopped) break;

      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      let newThisRound = 0;

      // The first article is usually the main tweet itself; replies follow.
      // We identify replies as tweets whose ID differs from parentPostId.
      for (const article of articles) {
        const tweet = extractTweetFromElement(article);
        if (!tweet) continue;
        if (tweet.id === parentPostId) continue; // skip the main tweet
        if (seenReplyIds.has(tweet.id)) continue;

        seenReplyIds.add(tweet.id);
        replies.push(tweet);
        newThisRound++;
        state.totalReplies++;
        updateRepliesCount();

        if (replies.length >= CONFIG.maxRepliesPerPost) break;
      }

      if (newThisRound > 0) {
        noNewCount = 0;
      } else {
        noNewCount++;
        if (noNewCount >= 4) break; // no more replies loading
      }

      // Scroll to load more replies
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
      scrollAttempts++;
    }

    return replies;
  }

  async function scrapeAllReplies() {
    updatePhase('💬 Scraping replies…');
    panelLog(`Phase 2: Scraping replies for ${state.posts.length} posts`);

    for (let i = 0; i < state.posts.length; i++) {
      if (state.stopped) break;
      await waitWhilePaused();

      const post = state.posts[i];
      state.currentPostIndex = i;

      // Skip user-reply tweets if configured
      if (!CONFIG.scrapeRepliesOnUserReplies && post.type.isReply) {
        panelLog(`⏭ Skipping reply-tweet ${i + 1}/${state.posts.length}`);
        continue;
      }

      const replyCountNum = parseEngagement(post.metrics.replies);
      if (replyCountNum === 0) {
        panelLog(`⏭ Post ${i + 1}/${state.posts.length} — 0 replies, skipping`);
        continue;
      }

      updateCurrent(`Post ${i + 1}/${state.posts.length}: scraping replies (${post.metrics.replies} reported)…`);
      panelLog(`💬 Post ${i + 1}/${state.posts.length} — scraping replies…`);

      const progressBase = 50;
      const progressPerPost = 50 / state.posts.length;
      updateProgress(progressBase + progressPerPost * i);

      try {
        // Navigate to the tweet
        await navigateToTweet(post.url);
        await sleep(1000);

        // Check we landed on the right page
        const onTweet = window.location.href.includes('/status/');
        if (!onTweet) {
          panelLog(`⚠ Navigation failed for post ${i + 1}, retrying direct…`, 'warn');
          window.location.href = post.url;
          await sleep(CONFIG.navigationDelay + 1000);
        }

        // Scrape replies
        const replies = await scrapeThreadReplies(post.id);
        post.replies_scraped = replies;

        panelLog(`   → ${replies.length} replies collected`, 'ok');

        // Navigate back to profile
        await navigateBack();

        // Wait for feed to re-render
        await sleep(1000);

        // We may need to scroll back to where we were. Wait for articles to load.
        let attempts = 0;
        while (attempts < 5) {
          const hasArticles = document.querySelectorAll('article[data-testid="tweet"]').length > 0;
          if (hasArticles) break;
          await sleep(1000);
          attempts++;
        }

      } catch (err) {
        panelLog(`⚠ Error on post ${i + 1}: ${err.message}`, 'err');
        state.errors.push({ postId: post.id, error: err.message });

        // Try to get back to the profile
        try {
          if (!window.location.href.includes(state.originalUrl.split('x.com/')[1]?.split('/')[0])) {
            window.location.href = state.originalUrl;
            await sleep(CONFIG.navigationDelay);
          }
        } catch (_) {
          // ignore
        }
      }
    }

    panelLog(`✅ Replies done: ${state.totalReplies} replies total`, 'ok');
  }

  // ─── Main ──────────────────────────────────────────────

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  🐦 X Profile + Replies Scraper                            ║');
  console.log('║  by nichxbt — https://github.com/nirholas/XActions          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  // Verify we're on the right page
  if (!window.location.href.includes('x.com/')) {
    console.error('❌ This script must be run on x.com. Navigate to a profile page first.');
    return;
  }

  const profileMatch = window.location.pathname.match(/^\/([^\/]+)/);
  const profileName = profileMatch ? profileMatch[1] : 'unknown';

  console.log(`🎯 Profile: @${profileName}`);
  console.log(`📊 Target: ${CONFIG.targetPostCount === Infinity ? '∞' : CONFIG.targetPostCount} posts`);
  console.log(`💬 Max replies per post: ${CONFIG.maxRepliesPerPost}`);
  if (startId) console.log(`🏁 Start after post: ${startId}`);
  if (endId) console.log(`🏁 Stop at post: ${endId}`);
  console.log('');

  // Ensure we're on with_replies
  if (!window.location.href.includes('/with_replies')) {
    console.log('💡 Tip: Navigate to /with_replies to include the user\'s replies too.');
    console.log(`   https://x.com/${profileName}/with_replies`);
    console.log('');
  }

  // Create control panel
  createPanel();
  panelLog('🚀 Scraper initialized');

  try {
    // Phase 1: Collect posts from the profile feed
    await scrapeProfileFeed();

    if (state.stopped) {
      panelLog('Stopped during feed scraping', 'warn');
    }

    if (state.posts.length === 0) {
      panelLog('⚠ No posts found! Check that you\'re on the right profile page.', 'err');
      updatePhase('⚠ No posts found');
      updateStatus('Done (no posts)');
      return;
    }

    // Phase 2: Scrape replies for each post
    if (!state.stopped) {
      // Scroll back to top before navigating into posts
      window.scrollTo(0, 0);
      await sleep(1000);
      await scrapeAllReplies();
    }

    // Done
    updatePhase('✅ Complete');
    updateStatus('Done');
    updateProgress(100);

    const result = buildResult();

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ SCRAPING COMPLETE!                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`👤 Profile: @${result.profile}`);
    console.log(`📊 Posts collected: ${result.totalPosts}`);
    console.log(`💬 Replies collected: ${result.totalRepliesScraped}`);
    console.log(`⏱️ Duration: ${result.duration}`);
    console.log('');

    // Stats
    let totalLikes = 0, totalRetweets = 0;
    result.posts.forEach(p => {
      totalLikes += parseEngagement(p.metrics.likes);
      totalRetweets += parseEngagement(p.metrics.retweets);
    });
    console.log('📈 ─── POST STATISTICS ───');
    console.log(`   Total Likes: ${totalLikes.toLocaleString()}`);
    console.log(`   Total Retweets: ${totalRetweets.toLocaleString()}`);
    console.log(`   Avg Likes/Post: ${result.totalPosts > 0 ? Math.round(totalLikes / result.totalPosts).toLocaleString() : 0}`);
    console.log(`   Avg Replies Scraped/Post: ${result.totalPosts > 0 ? (result.totalRepliesScraped / result.totalPosts).toFixed(1) : 0}`);
    console.log('');

    if (state.errors.length > 0) {
      console.log(`⚠️ ${state.errors.length} error(s) occurred:`);
      state.errors.forEach(e => console.log(`   Post ${e.postId}: ${e.error}`));
      console.log('');
    }

    // Top posts by reply count
    const byReplies = [...result.posts].sort((a, b) =>
      (b.replies_scraped?.length || 0) - (a.replies_scraped?.length || 0)
    ).slice(0, 5);

    if (byReplies.length > 0) {
      console.log('🏆 ─── TOP POSTS (by replies scraped) ───');
      byReplies.forEach((p, i) => {
        console.log(`   ${i + 1}. [${p.replies_scraped?.length || 0} replies] ${p.text?.substring(0, 60)}…`);
        console.log(`      ${p.url}`);
      });
      console.log('');
    }

    // Auto-export
    panelLog('Running auto-export…', 'ok');
    downloadAllFormats();

    // Store on window
    window.__xScraperResult = result;
    console.log('💡 Access full data: window.__xScraperResult');
    console.log('💡 Re-download: Use the 💾 Download button on the panel');

  } catch (fatalErr) {
    console.error('❌ Fatal error:', fatalErr);
    panelLog(`❌ Fatal: ${fatalErr.message}`, 'err');
    updatePhase('❌ Error');
    updateStatus('Error');

    // Still try to export whatever we have
    if (state.posts.length > 0) {
      panelLog('Attempting partial export…', 'warn');
      downloadAllFormats();
      window.__xScraperResult = buildResult();
    }
  }

})();

/**
 * ============================================================
 * 🚀 Engagement Booster v2 — Production Grade
 * ============================================================
 *
 * @name        engagementBooster.js
 * @description Systematically engage with tweets from target
 *              accounts to boost mutual engagement. Features a
 *              floating control panel, smart engagement scoring,
 *              retweet & bookmark support, drip scheduling, undo
 *              rollback, persistent session history, and speed
 *              presets. Works standalone or with core.js.
 * @author      nichxbt (https://x.com/nichxbt)
 * @version     2.0.0
 * @date        2026-02-24
 * @repository  https://github.com/nirholas/XActions
 *
 * ============================================================
 * 📋 USAGE:
 *
 * 1. Go to any timeline, search, or user profile on x.com
 * 2. Open DevTools Console (F12)
 * 3. Paste and run — a floating panel will appear
 * 4. Configure via the panel (or edit CONFIG below)
 * 5. Click ▶ Start
 *
 * Controls: ⏸ Pause · ▶ Resume · 🛑 Stop · ↩ Undo All
 *
 * ⚠️ Keep rates low. Twitter WILL flag excessive activity.
 * ============================================================
 */
(() => {
  'use strict';

  // Prevent double-inject
  if (document.getElementById('xeb-panel')) {
    console.log('⚡ Engagement Booster already running');
    return;
  }

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════

  const CONFIG = {
    maxInteractions: 15,
    dryRun: true,

    actions: {
      like: true,
      reply: false,
      retweet: false,
      bookmark: false,
      follow: false,
    },

    // Topic-aware reply templates: templates with `topics` match tweets containing those words
    replyTemplates: [
      { text: '🔥 Great point!', topics: [] },
      { text: '💯 Couldn\'t agree more.', topics: [] },
      { text: '📌 Bookmarking this.', topics: [] },
      { text: 'Really useful, thanks for sharing! 🙌', topics: [] },
      { text: 'Solid alpha 🧠', topics: ['alpha', 'insight', 'thread', 'deep dive'] },
      { text: 'This is the kind of content I come here for 👏', topics: ['guide', 'tutorial', 'explained', 'breakdown'] },
      { text: 'Great data — appreciate the transparency 📊', topics: ['data', 'stats', 'numbers', 'chart', 'graph'] },
    ],

    targetUsers: [],
    blockUsers: [],           // Never interact with these accounts
    onlyKeywords: [],
    skipKeywords: ['promoted', 'ad', 'giveaway', 'nsfw'],
    skipLiked: true,
    minLikes: 0,
    maxLikes: 0,              // 0 = no max — helps target smaller accounts

    // Author quality filters
    onlyVerified: false,
    minFollowers: 0,
    maxFollowers: 0,          // 0 = no max — caps at big accounts
    bioKeywords: [],          // Author bio must contain one of these

    // Speed presets: 'stealth' | 'safe' | 'moderate' | 'fast'
    speedPreset: 'safe',

    // Drip mode: spread interactions over time
    drip: {
      enabled: false,
      intervalMinutes: 30,    // Engage every N minutes
      batchSize: 3,           // Tweets per batch
    },

    scrollRounds: 5,
    scrollDelay: 2000,

    // Smart engagement scoring
    scoring: {
      enabled: true,
      preferSmallAccounts: true,   // Smaller accounts notice you more
      preferHighEngagement: false,  // Tweets with lots of engagement (viral)
      preferRecent: true,           // Most recent tweets first
    },
  };

  // ═══════════════════════════════════════════════════════════
  // SPEED PRESETS
  // ═══════════════════════════════════════════════════════════

  const SPEED_PRESETS = {
    stealth: { delay: [45000, 90000], label: '🐢 Stealth', desc: '45-90s — very safe' },
    safe:    { delay: [20000, 45000], label: '🛡️ Safe',    desc: '20-45s — recommended' },
    moderate:{ delay: [8000,  20000], label: '⚡ Moderate', desc: '8-20s — faster' },
    fast:    { delay: [3000,  8000],  label: '🔥 Fast',    desc: '3-8s — risky' },
  };

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const gaussian = (a, b) => Math.floor(a + ((Math.random() + Math.random()) / 2) * (b - a));
  const fmtNum = (n) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);

  const SEL = {
    tweet: 'article[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    likeBtn: '[data-testid="like"]',
    unlikeBtn: '[data-testid="unlike"]',
    retweetBtn: '[data-testid="retweet"]',
    unretweetBtn: '[data-testid="unretweet"]',
    replyBtn: '[data-testid="reply"]',
    tweetBox: '[data-testid="tweetTextarea_0"]',
    tweetButton: '[data-testid="tweetButton"]',
    bookmarkBtn: '[data-testid="bookmark"]',
    removeBookmarkBtn: '[data-testid="removeBookmark"]',
    confirmBtn: '[data-testid="confirmationSheetConfirm"]',
    toast: '[data-testid="toast"]',
    userDescription: '[data-testid="UserDescription"]',
  };

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const parseNum = (text) => {
    if (!text) return 0;
    text = text.trim().replace(/,/g, '');
    if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
    if (text.endsWith('M')) return Math.round(parseFloat(text) * 1000000);
    return parseInt(text) || 0;
  };

  const isRateLimited = () => {
    for (const el of document.querySelectorAll(`${SEL.toast}, [role="alert"]`)) {
      const text = (el.textContent || '').toLowerCase();
      if (/rate limit|try again|too many|slow down/.test(text)) return true;
    }
    return false;
  };

  // ═══════════════════════════════════════════════════════════
  // PERSISTENT SESSION HISTORY (localStorage)
  // ═══════════════════════════════════════════════════════════

  const STORAGE_KEY = 'xactions_engagement_history';

  const loadHistory = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  };

  const saveHistory = (session) => {
    const history = loadHistory();
    history.push(session);
    // Keep last 50 sessions
    if (history.length > 50) history.splice(0, history.length - 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  };

  const getHistoryStats = () => {
    const history = loadHistory();
    let totalLikes = 0, totalReplies = 0, totalRetweets = 0, totalBookmarks = 0, uniqueAuthors = new Set();
    for (const s of history) {
      totalLikes += s.liked || 0;
      totalReplies += s.replied || 0;
      totalRetweets += s.retweeted || 0;
      totalBookmarks += s.bookmarked || 0;
      (s.authors || []).forEach(a => uniqueAuthors.add(a));
    }
    return { sessions: history.length, totalLikes, totalReplies, totalRetweets, totalBookmarks, uniqueAuthors: uniqueAuthors.size };
  };

  // ═══════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════

  const STATE = {
    status: 'idle',  // idle | scanning | running | paused | done | error
    aborted: false,
    paused: false,
    liked: 0,
    replied: 0,
    retweeted: 0,
    bookmarked: 0,
    failed: 0,
    processed: 0,
    total: 0,
    startTime: null,
    undoStack: [],   // { type, article, author } for rollback
    results: [],
    eligible: [],
    dripTimer: null,
    logs: [],
  };

  const addLog = (msg, type = 'info') => {
    STATE.logs.push({ msg, type, time: new Date() });
    if (STATE.logs.length > 200) STATE.logs.shift();
    console.log(msg);
    updatePanel();
  };

  const waitForUnpause = async () => {
    while (STATE.paused && !STATE.aborted) await sleep(500);
  };

  // ═══════════════════════════════════════════════════════════
  // FLOATING UI PANEL
  // ═══════════════════════════════════════════════════════════

  const createPanel = () => {
    const panel = document.createElement('div');
    panel.id = 'xeb-panel';
    panel.innerHTML = `
      <style>
        #xeb-panel {
          position: fixed; top: 60px; right: 16px; z-index: 999999;
          width: 320px; background: #16181c; border: 1px solid #2f3336;
          border-radius: 16px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #e7e9ea; box-shadow: 0 8px 32px rgba(0,0,0,0.6); user-select: none;
          transition: opacity 0.2s;
        }
        #xeb-panel * { box-sizing: border-box; }
        #xeb-panel.xeb-minimized .xeb-body { display: none; }
        .xeb-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; border-bottom: 1px solid #2f3336; cursor: grab;
        }
        .xeb-header:active { cursor: grabbing; }
        .xeb-title { font-weight: 700; font-size: 14px; }
        .xeb-badge {
          font-size: 10px; padding: 2px 8px; border-radius: 999px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .xeb-badge.idle { background: #2f3336; color: #71767b; }
        .xeb-badge.scanning { background: #1d4ed8; color: #93c5fd; }
        .xeb-badge.running { background: #15803d; color: #86efac; }
        .xeb-badge.paused { background: #a16207; color: #fde68a; }
        .xeb-badge.done { background: #1d9bf0; color: #fff; }
        .xeb-badge.error { background: #dc2626; color: #fca5a5; }
        .xeb-header-btns { display: flex; gap: 4px; }
        .xeb-header-btns button {
          background: none; border: none; color: #71767b; cursor: pointer;
          font-size: 16px; padding: 2px 6px; border-radius: 4px;
        }
        .xeb-header-btns button:hover { background: #2f3336; color: #e7e9ea; }
        .xeb-body { max-height: 480px; overflow-y: auto; }
        .xeb-body::-webkit-scrollbar { width: 4px; }
        .xeb-body::-webkit-scrollbar-thumb { background: #2f3336; border-radius: 4px; }
        .xeb-tabs {
          display: flex; border-bottom: 1px solid #2f3336;
        }
        .xeb-tab {
          flex: 1; padding: 8px 0; text-align: center; font-size: 12px;
          font-weight: 600; color: #71767b; cursor: pointer; border: none;
          background: none; border-bottom: 2px solid transparent; transition: all 0.15s;
        }
        .xeb-tab:hover { color: #e7e9ea; }
        .xeb-tab.active { color: #1d9bf0; border-bottom-color: #1d9bf0; }
        .xeb-pane { display: none; padding: 12px 16px; }
        .xeb-pane.active { display: block; }

        /* Config pane */
        .xeb-field { margin-bottom: 10px; }
        .xeb-field label { display: block; font-size: 11px; color: #71767b; margin-bottom: 4px; font-weight: 600; }
        .xeb-field input[type="text"], .xeb-field input[type="number"], .xeb-field select {
          width: 100%; padding: 6px 10px; background: #000; border: 1px solid #2f3336;
          border-radius: 8px; color: #e7e9ea; font-size: 13px; outline: none;
        }
        .xeb-field input:focus, .xeb-field select:focus { border-color: #1d9bf0; }
        .xeb-row { display: flex; gap: 8px; }
        .xeb-row .xeb-field { flex: 1; }
        .xeb-toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 4px 0;
        }
        .xeb-toggle-row span { font-size: 13px; }
        .xeb-toggle {
          position: relative; width: 36px; height: 20px; cursor: pointer;
        }
        .xeb-toggle input { opacity: 0; width: 0; height: 0; }
        .xeb-toggle .xeb-slider {
          position: absolute; inset: 0; background: #2f3336; border-radius: 10px; transition: 0.2s;
        }
        .xeb-toggle .xeb-slider::before {
          content: ''; position: absolute; left: 2px; top: 2px;
          width: 16px; height: 16px; background: #71767b; border-radius: 50%; transition: 0.2s;
        }
        .xeb-toggle input:checked + .xeb-slider { background: #1d9bf0; }
        .xeb-toggle input:checked + .xeb-slider::before { transform: translateX(16px); background: #fff; }

        /* Progress pane */
        .xeb-progress-bar {
          width: 100%; height: 6px; background: #2f3336; border-radius: 3px; overflow: hidden; margin: 8px 0;
        }
        .xeb-progress-fill { height: 100%; background: #1d9bf0; border-radius: 3px; transition: width 0.3s; }
        .xeb-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0; }
        .xeb-stat {
          background: #000; border-radius: 10px; padding: 8px 12px; text-align: center;
        }
        .xeb-stat-val { font-size: 20px; font-weight: 700; color: #e7e9ea; }
        .xeb-stat-label { font-size: 10px; color: #71767b; text-transform: uppercase; letter-spacing: 0.5px; }
        .xeb-current {
          font-size: 12px; color: #71767b; padding: 4px 0; overflow: hidden;
          text-overflow: ellipsis; white-space: nowrap;
        }
        .xeb-log {
          max-height: 120px; overflow-y: auto; font-size: 11px; padding: 8px;
          background: #000; border-radius: 8px; margin-top: 8px;
        }
        .xeb-log::-webkit-scrollbar { width: 3px; }
        .xeb-log::-webkit-scrollbar-thumb { background: #2f3336; border-radius: 3px; }
        .xeb-log-entry { padding: 2px 0; color: #71767b; }
        .xeb-log-entry.success { color: #22c55e; }
        .xeb-log-entry.warn { color: #eab308; }
        .xeb-log-entry.error { color: #ef4444; }

        /* History pane */
        .xeb-history-stat { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .xeb-history-stat span:first-child { color: #71767b; }
        .xeb-history-stat span:last-child { font-weight: 600; }
        .xeb-empty { color: #71767b; font-size: 12px; text-align: center; padding: 16px 0; }

        /* Buttons */
        .xeb-actions { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #2f3336; }
        .xeb-btn {
          flex: 1; padding: 8px 0; border: none; border-radius: 999px; font-size: 13px;
          font-weight: 700; cursor: pointer; transition: all 0.15s; text-align: center;
        }
        .xeb-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .xeb-btn-primary { background: #1d9bf0; color: #fff; }
        .xeb-btn-primary:hover:not(:disabled) { background: #1a8cd8; }
        .xeb-btn-warn { background: #2f3336; color: #fde68a; }
        .xeb-btn-warn:hover:not(:disabled) { background: #3a3d42; }
        .xeb-btn-danger { background: #2f3336; color: #ef4444; }
        .xeb-btn-danger:hover:not(:disabled) { background: #3a3d42; }
        .xeb-btn-ghost { background: none; color: #71767b; border: 1px solid #2f3336; }
        .xeb-btn-ghost:hover:not(:disabled) { background: #2f3336; color: #e7e9ea; }
      </style>

      <div class="xeb-header" id="xeb-drag">
        <span class="xeb-title">🚀 Engagement Booster</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="xeb-badge idle" id="xeb-status">IDLE</span>
          <div class="xeb-header-btns">
            <button id="xeb-minimize" title="Minimize">─</button>
            <button id="xeb-close" title="Close">✕</button>
          </div>
        </div>
      </div>

      <div class="xeb-body">
        <div class="xeb-tabs">
          <button class="xeb-tab active" data-tab="config">⚙️ Config</button>
          <button class="xeb-tab" data-tab="progress">📊 Progress</button>
          <button class="xeb-tab" data-tab="history">📜 History</button>
        </div>

        <!-- CONFIG TAB -->
        <div class="xeb-pane active" data-pane="config">
          <div class="xeb-field">
            <label>TARGET USERS (comma-separated, blank = any)</label>
            <input type="text" id="xeb-targetUsers" placeholder="@user1, @user2" />
          </div>
          <div class="xeb-field">
            <label>KEYWORDS (comma-separated, blank = any)</label>
            <input type="text" id="xeb-keywords" placeholder="web3, AI, crypto" />
          </div>
          <div class="xeb-row">
            <div class="xeb-field">
              <label>MAX INTERACTIONS</label>
              <input type="number" id="xeb-maxInteractions" value="15" min="1" max="200" />
            </div>
            <div class="xeb-field">
              <label>SPEED</label>
              <select id="xeb-speed">
                <option value="stealth">🐢 Stealth (45-90s)</option>
                <option value="safe" selected>🛡️ Safe (20-45s)</option>
                <option value="moderate">⚡ Moderate (8-20s)</option>
                <option value="fast">🔥 Fast (3-8s)</option>
              </select>
            </div>
          </div>
          <div class="xeb-row">
            <div class="xeb-field">
              <label>MIN LIKES</label>
              <input type="number" id="xeb-minLikes" value="0" min="0" />
            </div>
            <div class="xeb-field">
              <label>MAX LIKES (0 = no cap)</label>
              <input type="number" id="xeb-maxLikes" value="0" min="0" />
            </div>
          </div>

          <div style="border-top:1px solid #2f3336; margin:8px 0; padding-top:8px;">
            <label style="font-size:11px;color:#71767b;font-weight:600;margin-bottom:6px;display:block;">ACTIONS</label>
            <div class="xeb-toggle-row"><span>❤️ Like</span><label class="xeb-toggle"><input type="checkbox" id="xeb-actLike" checked /><span class="xeb-slider"></span></label></div>
            <div class="xeb-toggle-row"><span>🔁 Retweet</span><label class="xeb-toggle"><input type="checkbox" id="xeb-actRetweet" /><span class="xeb-slider"></span></label></div>
            <div class="xeb-toggle-row"><span>🔖 Bookmark</span><label class="xeb-toggle"><input type="checkbox" id="xeb-actBookmark" /><span class="xeb-slider"></span></label></div>
            <div class="xeb-toggle-row"><span>💬 Reply</span><label class="xeb-toggle"><input type="checkbox" id="xeb-actReply" /><span class="xeb-slider"></span></label></div>
            <div class="xeb-toggle-row"><span>👤 Follow</span><label class="xeb-toggle"><input type="checkbox" id="xeb-actFollow" /><span class="xeb-slider"></span></label></div>
          </div>

          <div style="border-top:1px solid #2f3336; margin:8px 0; padding-top:8px;">
            <div class="xeb-field">
              <label>BLOCK USERS (never engage, comma-separated)</label>
              <input type="text" id="xeb-blockUsers" placeholder="@spammer1, @bot2" />
            </div>
            <div class="xeb-field">
              <label>SKIP KEYWORDS (comma-separated)</label>
              <input type="text" id="xeb-skipKeywords" value="promoted, ad, giveaway, nsfw" />
            </div>
          </div>

          <div style="border-top:1px solid #2f3336; margin:8px 0; padding-top:8px;">
            <label style="font-size:11px;color:#71767b;font-weight:600;margin-bottom:6px;display:block;">SMART FEATURES</label>
            <div class="xeb-toggle-row"><span>🎯 Smart scoring</span><label class="xeb-toggle"><input type="checkbox" id="xeb-scoring" checked /><span class="xeb-slider"></span></label></div>
            <div class="xeb-toggle-row"><span>🏃 Dry run</span><label class="xeb-toggle"><input type="checkbox" id="xeb-dryRun" checked /><span class="xeb-slider"></span></label></div>
            <div class="xeb-toggle-row"><span>⏰ Drip mode</span><label class="xeb-toggle"><input type="checkbox" id="xeb-drip" /><span class="xeb-slider"></span></label></div>
          </div>

          <div id="xeb-dripConfig" style="display:none; padding-top:4px;">
            <div class="xeb-row">
              <div class="xeb-field">
                <label>INTERVAL (min)</label>
                <input type="number" id="xeb-dripInterval" value="30" min="5" />
              </div>
              <div class="xeb-field">
                <label>BATCH SIZE</label>
                <input type="number" id="xeb-dripBatch" value="3" min="1" max="10" />
              </div>
            </div>
          </div>
        </div>

        <!-- PROGRESS TAB -->
        <div class="xeb-pane" data-pane="progress">
          <div class="xeb-current" id="xeb-currentAction">Waiting to start...</div>
          <div class="xeb-progress-bar"><div class="xeb-progress-fill" id="xeb-progressFill" style="width:0%"></div></div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:#71767b;">
            <span id="xeb-progressText">0 / 0</span>
            <span id="xeb-eta" style="color:#1d9bf0;"></span>
            <span id="xeb-elapsed">0:00</span>
          </div>

          <div class="xeb-stats">
            <div class="xeb-stat"><div class="xeb-stat-val" id="xeb-sLiked">0</div><div class="xeb-stat-label">Liked</div></div>
            <div class="xeb-stat"><div class="xeb-stat-val" id="xeb-sRetweeted">0</div><div class="xeb-stat-label">Retweeted</div></div>
            <div class="xeb-stat"><div class="xeb-stat-val" id="xeb-sBookmarked">0</div><div class="xeb-stat-label">Bookmarked</div></div>
            <div class="xeb-stat"><div class="xeb-stat-val" id="xeb-sReplied">0</div><div class="xeb-stat-label">Replied</div></div>
          </div>

          <div class="xeb-log" id="xeb-log"></div>
        </div>

        <!-- HISTORY TAB -->
        <div class="xeb-pane" data-pane="history">
          <div id="xeb-historyContent"></div>
        </div>
      </div>

      <div class="xeb-actions" id="xeb-actionBar">
        <button class="xeb-btn xeb-btn-primary" id="xeb-startBtn">▶ Start</button>
        <button class="xeb-btn xeb-btn-warn" id="xeb-pauseBtn" disabled>⏸ Pause</button>
        <button class="xeb-btn xeb-btn-danger" id="xeb-stopBtn" disabled>🛑 Stop</button>
      </div>
    `;

    document.body.appendChild(panel);
    return panel;
  };

  // ═══════════════════════════════════════════════════════════
  // PANEL LOGIC
  // ═══════════════════════════════════════════════════════════

  const panel = createPanel();

  // Drag support
  let dragOffset = { x: 0, y: 0 };
  const dragHandle = document.getElementById('xeb-drag');
  dragHandle.addEventListener('mousedown', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const rect = panel.getBoundingClientRect();
    dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const onMove = (ev) => {
      panel.style.left = (ev.clientX - dragOffset.x) + 'px';
      panel.style.top = (ev.clientY - dragOffset.y) + 'px';
      panel.style.right = 'auto';
    };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // Minimize / Close
  document.getElementById('xeb-minimize').addEventListener('click', () => panel.classList.toggle('xeb-minimized'));
  document.getElementById('xeb-close').addEventListener('click', () => {
    if (STATE.status === 'running') {
      if (!confirm('Engagement Booster is running. Stop and close?')) return;
      STATE.aborted = true;
    }
    clearInterval(STATE.dripTimer);
    panel.remove();
  });

  // Tabs
  for (const tab of panel.querySelectorAll('.xeb-tab')) {
    tab.addEventListener('click', () => {
      panel.querySelectorAll('.xeb-tab').forEach(t => t.classList.remove('active'));
      panel.querySelectorAll('.xeb-pane').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      panel.querySelector(`[data-pane="${tab.dataset.tab}"]`).classList.add('active');
      if (tab.dataset.tab === 'history') renderHistory();
    });
  }

  // Drip toggle
  document.getElementById('xeb-drip').addEventListener('change', (e) => {
    document.getElementById('xeb-dripConfig').style.display = e.target.checked ? 'block' : 'none';
  });

  // ═══════════════════════════════════════════════════════════
  // UPDATE PANEL
  // ═══════════════════════════════════════════════════════════

  let updateTimer = null;

  const updatePanel = () => {
    const badge = document.getElementById('xeb-status');
    if (!badge) return;
    badge.textContent = STATE.status.toUpperCase();
    badge.className = `xeb-badge ${STATE.status}`;

    const pct = STATE.total > 0 ? Math.round((STATE.processed / STATE.total) * 100) : 0;
    const fill = document.getElementById('xeb-progressFill');
    if (fill) fill.style.width = pct + '%';

    const txt = document.getElementById('xeb-progressText');
    if (txt) txt.textContent = `${STATE.processed} / ${STATE.total}`;

    const el = document.getElementById('xeb-elapsed');
    if (el && STATE.startTime) {
      const sec = Math.floor((Date.now() - STATE.startTime) / 1000);
      el.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    }

    const ids = { 'xeb-sLiked': STATE.liked, 'xeb-sRetweeted': STATE.retweeted, 'xeb-sBookmarked': STATE.bookmarked, 'xeb-sReplied': STATE.replied };
    for (const [id, val] of Object.entries(ids)) {
      const e = document.getElementById(id);
      if (e) e.textContent = val;
    }

    // Live log
    const logEl = document.getElementById('xeb-log');
    if (logEl) {
      const recent = STATE.logs.slice(-30);
      logEl.innerHTML = recent.map(l => {
        const t = l.time.toLocaleTimeString('en', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `<div class="xeb-log-entry ${l.type}">${t} ${l.msg}</div>`;
      }).join('');
      logEl.scrollTop = logEl.scrollHeight;
    }
  };

  const startUpdateTimer = () => {
    updateTimer = setInterval(updatePanel, 1000);
  };

  const stopUpdateTimer = () => {
    clearInterval(updateTimer);
    updatePanel();
  };

  // ═══════════════════════════════════════════════════════════
  // HISTORY
  // ═══════════════════════════════════════════════════════════

  const renderHistory = () => {
    const container = document.getElementById('xeb-historyContent');
    if (!container) return;
    const stats = getHistoryStats();
    if (stats.sessions === 0) {
      container.innerHTML = '<div class="xeb-empty">No sessions yet. Start boosting!</div>';
      return;
    }
    container.innerHTML = `
      <div class="xeb-history-stat"><span>Sessions</span><span>${stats.sessions}</span></div>
      <div class="xeb-history-stat"><span>❤️ Total liked</span><span>${fmtNum(stats.totalLikes)}</span></div>
      <div class="xeb-history-stat"><span>🔁 Total retweeted</span><span>${fmtNum(stats.totalRetweets)}</span></div>
      <div class="xeb-history-stat"><span>🔖 Total bookmarked</span><span>${fmtNum(stats.totalBookmarks)}</span></div>
      <div class="xeb-history-stat"><span>💬 Total replied</span><span>${fmtNum(stats.totalReplies)}</span></div>
      <div class="xeb-history-stat"><span>👥 Unique accounts</span><span>${fmtNum(stats.uniqueAuthors)}</span></div>
      <div style="margin-top:12px;">
        <button class="xeb-btn xeb-btn-ghost" style="width:100%;padding:6px;" id="xeb-exportHistory">📥 Export all history (JSON)</button>
      </div>
      <div style="margin-top:6px;">
        <button class="xeb-btn xeb-btn-ghost" style="width:100%;padding:6px;color:#ef4444;" id="xeb-clearHistory">🗑️ Clear history</button>
      </div>
    `;
    document.getElementById('xeb-exportHistory')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(loadHistory(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-engagement-history-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
    });
    document.getElementById('xeb-clearHistory')?.addEventListener('click', () => {
      if (confirm('Clear all engagement history?')) {
        localStorage.removeItem(STORAGE_KEY);
        renderHistory();
      }
    });
  };

  // ═══════════════════════════════════════════════════════════
  // READ CONFIG FROM PANEL
  // ═══════════════════════════════════════════════════════════

  const readConfigFromPanel = () => {
    const val = (id) => document.getElementById(id)?.value?.trim() || '';
    const num = (id) => parseInt(document.getElementById(id)?.value) || 0;
    const chk = (id) => document.getElementById(id)?.checked || false;

    CONFIG.targetUsers = val('xeb-targetUsers').split(',').map(u => u.trim().replace(/^@/, '')).filter(Boolean);
    CONFIG.onlyKeywords = val('xeb-keywords').split(',').map(k => k.trim()).filter(Boolean);
    CONFIG.maxInteractions = num('xeb-maxInteractions') || 15;
    CONFIG.speedPreset = val('xeb-speed') || 'safe';
    CONFIG.minLikes = num('xeb-minLikes');
    CONFIG.maxLikes = num('xeb-maxLikes');

    CONFIG.actions.like = chk('xeb-actLike');
    CONFIG.actions.retweet = chk('xeb-actRetweet');
    CONFIG.actions.bookmark = chk('xeb-actBookmark');
    CONFIG.actions.reply = chk('xeb-actReply');
    CONFIG.actions.follow = chk('xeb-actFollow');
    CONFIG.blockUsers = val('xeb-blockUsers').split(',').map(u => u.trim().replace(/^@/, '')).filter(Boolean);
    CONFIG.skipKeywords = val('xeb-skipKeywords').split(',').map(k => k.trim()).filter(Boolean);

    CONFIG.scoring.enabled = chk('xeb-scoring');
    CONFIG.dryRun = chk('xeb-dryRun');
    CONFIG.drip.enabled = chk('xeb-drip');
    CONFIG.drip.intervalMinutes = num('xeb-dripInterval') || 30;
    CONFIG.drip.batchSize = num('xeb-dripBatch') || 3;
  };

  // ═══════════════════════════════════════════════════════════
  // SMART ENGAGEMENT SCORING
  // ═══════════════════════════════════════════════════════════

  const scoreTweet = (tweet) => {
    if (!CONFIG.scoring.enabled) return 0;
    let score = 0;

    // Prefer smaller accounts (higher chance of follow-back / notice)
    if (CONFIG.scoring.preferSmallAccounts) {
      if (tweet.likes < 5) score += 30;
      else if (tweet.likes < 20) score += 20;
      else if (tweet.likes < 100) score += 10;
      else score += 2;
    }

    // Prefer high engagement (viral content)
    if (CONFIG.scoring.preferHighEngagement) {
      if (tweet.likes > 100) score += 25;
      else if (tweet.likes > 50) score += 15;
      else score += 5;
    }

    // Prefer recent tweets (higher in DOM = more recent)
    if (CONFIG.scoring.preferRecent) {
      score += Math.max(0, 20 - (tweet.domIndex * 2));
    }

    // Bonus: tweet has meaningful text (not just links/media)
    if (tweet.text.length > 50) score += 10;
    if (tweet.text.length > 140) score += 5;

    // Penalty: very short / empty
    if (tweet.text.length < 20) score -= 10;

    return score;
  };

  // ═══════════════════════════════════════════════════════════
  // COLLECT ELIGIBLE TWEETS
  // ═══════════════════════════════════════════════════════════

  const collectEligible = async () => {
    STATE.status = 'scanning';
    updatePanel();
    addLog('🔍 Scanning for eligible tweets...', 'info');

    const eligible = [];
    const seen = new Set();

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      if (STATE.aborted) break;
      const articles = $$(SEL.tweet);
      let domIndex = 0;

      for (const article of articles) {
        const textEl = $(SEL.tweetText, article);
        const text = textEl ? textEl.textContent.trim() : '';
        const fingerprint = text.slice(0, 80);
        if (seen.has(fingerprint)) continue;
        seen.add(fingerprint);

        // Author extraction
        const authorLink = article.querySelector('a[href^="/"][role="link"]');
        const authorMatch = authorLink ? (authorLink.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/) : null;
        const author = authorMatch ? authorMatch[1] : null;
        if (!author || ['home', 'explore', 'notifications', 'messages', 'i'].includes(author)) continue;

        // Filter: target users
        if (CONFIG.targetUsers.length > 0 && !CONFIG.targetUsers.some(u => u.toLowerCase() === author.toLowerCase())) continue;

        // Filter: keywords
        const textLower = text.toLowerCase();
        if (CONFIG.skipKeywords.some(kw => textLower.includes(kw.toLowerCase()))) continue;
        if (CONFIG.onlyKeywords.length > 0 && !CONFIG.onlyKeywords.some(kw => textLower.includes(kw.toLowerCase()))) continue;

        // Filter: skip already liked
        if (CONFIG.skipLiked && $(SEL.unlikeBtn, article)) continue;

        // Filter: engagement range
        const likeEl = article.querySelector('[data-testid="like"] span');
        const likes = likeEl ? parseNum(likeEl.textContent) : 0;
        if (likes < CONFIG.minLikes) continue;
        if (CONFIG.maxLikes > 0 && likes > CONFIG.maxLikes) continue;

        // Filter: verified
        if (CONFIG.onlyVerified) {
          const verified = article.querySelector('[data-testid="icon-verified"]');
          if (!verified) continue;
        }

        eligible.push({ article, text, author, likes, domIndex: domIndex++ });
      }

      addLog(`📜 Round ${round + 1}/${CONFIG.scrollRounds}: ${eligible.length} eligible`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    // Apply smart scoring and sort
    if (CONFIG.scoring.enabled) {
      for (const t of eligible) t.score = scoreTweet(t);
      eligible.sort((a, b) => b.score - a.score);
      addLog(`🎯 Smart scoring applied — top tweet score: ${eligible[0]?.score || 0}`);
    }

    return eligible;
  };

  // ═══════════════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════════════

  const likeTweet = async (article) => {
    const btn = $(SEL.likeBtn, article);
    if (!btn) return false;
    if (CONFIG.dryRun) { addLog('  ❤️ [DRY] Would like'); return true; }
    btn.click();
    await sleep(500);
    return !!$(SEL.unlikeBtn, article);
  };

  const unlikeTweet = async (article) => {
    const btn = $(SEL.unlikeBtn, article);
    if (!btn) return false;
    btn.click();
    await sleep(500);
    return !!$(SEL.likeBtn, article);
  };

  const retweetTweet = async (article) => {
    const btn = $(SEL.retweetBtn, article);
    if (!btn) return false;
    if (CONFIG.dryRun) { addLog('  🔁 [DRY] Would retweet'); return true; }
    btn.click();
    await sleep(800);
    // Confirm retweet in the popup menu
    const confirm = document.querySelector('[data-testid="retweetConfirm"]');
    if (confirm) { confirm.click(); await sleep(500); }
    return !!$(SEL.unretweetBtn, article);
  };

  const unretweetTweet = async (article) => {
    const btn = $(SEL.unretweetBtn, article);
    if (!btn) return false;
    btn.click();
    await sleep(800);
    const confirm = document.querySelector('[data-testid="unretweetConfirm"]');
    if (confirm) { confirm.click(); await sleep(500); }
    return !!$(SEL.retweetBtn, article);
  };

  const bookmarkTweet = async (article) => {
    const btn = $(SEL.bookmarkBtn, article);
    if (!btn) return false;
    if (CONFIG.dryRun) { addLog('  🔖 [DRY] Would bookmark'); return true; }
    btn.click();
    await sleep(500);
    return true;  // Bookmarks don't visually toggle the same way
  };

  const replyToTweet = async (article, template, author) => {
    const replyBtn = $(SEL.replyBtn, article);
    if (!replyBtn) return false;
    const replyText = template.replace('{author}', `@${author}`);
    if (CONFIG.dryRun) { addLog(`  💬 [DRY] Would reply: "${replyText}"`); return true; }
    replyBtn.click();
    await sleep(1500);
    const tweetBox = $(SEL.tweetBox);
    if (!tweetBox) { addLog('  ⚠️ Reply box not found', 'warn'); return false; }
    tweetBox.focus();
    document.execCommand('insertText', false, replyText);
    await sleep(800);
    const sendBtn = $(SEL.tweetButton);
    if (!sendBtn) { addLog('  ⚠️ Send button not found', 'warn'); return false; }
    sendBtn.click();
    await sleep(2000);
    return true;
  };

  // ═══════════════════════════════════════════════════════════
  // UNDO / ROLLBACK
  // ═══════════════════════════════════════════════════════════

  const undoAll = async () => {
    if (STATE.undoStack.length === 0) {
      addLog('Nothing to undo.', 'warn');
      return;
    }
    const count = STATE.undoStack.length;
    addLog(`↩ Undoing ${count} actions...`, 'warn');
    let undone = 0;

    for (const action of [...STATE.undoStack].reverse()) {
      try {
        // Scroll the article into view if it's still in the DOM
        if (!document.body.contains(action.article)) {
          addLog(`  ⚠️ @${action.author} tweet no longer in DOM, skipping`, 'warn');
          continue;
        }
        action.article.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(600);

        if (action.type === 'like') {
          const ok = await unlikeTweet(action.article);
          if (ok) undone++;
        } else if (action.type === 'retweet') {
          const ok = await unretweetTweet(action.article);
          if (ok) undone++;
        }
        // Bookmarks and replies can't be easily undone
        await sleep(gaussian(1000, 2500));
      } catch { /* swallow */ }
    }

    STATE.undoStack.length = 0;
    addLog(`✅ Undone ${undone}/${count} actions`, 'success');
    updatePanel();
  };

  // ═══════════════════════════════════════════════════════════
  // PROCESS ONE TWEET
  // ═══════════════════════════════════════════════════════════

  const processTweet = async (target, index, total) => {
    const preview = target.text.slice(0, 40) + (target.text.length > 40 ? '…' : '');
    const el = document.getElementById('xeb-currentAction');
    if (el) el.textContent = `@${target.author}: "${preview}"`;

    addLog(`[${index + 1}/${total}] @${target.author} (${target.likes}❤️${target.score !== undefined ? ` score:${target.score}` : ''})`);

    target.article.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(800);

    const result = { author: target.author, text: target.text.slice(0, 120), actions: [], score: target.score };

    // Like
    if (CONFIG.actions.like) {
      const ok = await likeTweet(target.article);
      if (ok) {
        STATE.liked++;
        result.actions.push('liked');
        if (!CONFIG.dryRun) STATE.undoStack.push({ type: 'like', article: target.article, author: target.author });
      } else STATE.failed++;
      await sleep(gaussian(400, 1000));
    }

    // Retweet
    if (CONFIG.actions.retweet) {
      const ok = await retweetTweet(target.article);
      if (ok) {
        STATE.retweeted++;
        result.actions.push('retweeted');
        if (!CONFIG.dryRun) STATE.undoStack.push({ type: 'retweet', article: target.article, author: target.author });
      } else STATE.failed++;
      await sleep(gaussian(400, 1000));
    }

    // Bookmark
    if (CONFIG.actions.bookmark) {
      const ok = await bookmarkTweet(target.article);
      if (ok) {
        STATE.bookmarked++;
        result.actions.push('bookmarked');
        if (!CONFIG.dryRun) STATE.undoStack.push({ type: 'bookmark', article: target.article, author: target.author });
      } else STATE.failed++;
      await sleep(gaussian(300, 700));
    }

    // Reply
    if (CONFIG.actions.reply) {
      const template = CONFIG.replyTemplates[index % CONFIG.replyTemplates.length];
      const ok = await replyToTweet(target.article, template, target.author);
      if (ok) {
        STATE.replied++;
        result.actions.push('replied');
      } else STATE.failed++;
    }

    result.timestamp = new Date().toISOString();
    STATE.results.push(result);
    STATE.processed++;
    updatePanel();
    return result;
  };

  // ═══════════════════════════════════════════════════════════
  // MAIN RUN LOOP
  // ═══════════════════════════════════════════════════════════

  const run = async () => {
    readConfigFromPanel();

    // Reset state
    Object.assign(STATE, {
      status: 'scanning', aborted: false, paused: false,
      liked: 0, replied: 0, retweeted: 0, bookmarked: 0, failed: 0,
      processed: 0, total: 0, startTime: Date.now(), undoStack: [], results: [], logs: [],
    });
    startUpdateTimer();

    const preset = SPEED_PRESETS[CONFIG.speedPreset] || SPEED_PRESETS.safe;
    addLog(`🚀 Engagement Booster v2 — by nichxbt`);
    addLog(`⚡ Speed: ${preset.label} (${preset.desc})`);
    if (CONFIG.dryRun) addLog('🏃 Dry run — no real interactions', 'warn');

    const eligible = await collectEligible();

    if (eligible.length === 0) {
      addLog('❌ No eligible tweets found. Adjust filters.', 'error');
      STATE.status = 'error';
      stopUpdateTimer();
      setButtonStates('idle');
      return;
    }

    const toProcess = eligible.slice(0, CONFIG.maxInteractions);
    STATE.total = toProcess.length;
    STATE.status = 'running';
    addLog(`📊 Found ${eligible.length} eligible → processing ${toProcess.length}`);
    updatePanel();

    // ── DRIP MODE ──
    if (CONFIG.drip.enabled) {
      addLog(`⏰ Drip mode: ${CONFIG.drip.batchSize} every ${CONFIG.drip.intervalMinutes}min`);
      let batchStart = 0;

      const runBatch = async () => {
        if (STATE.aborted || batchStart >= toProcess.length) {
          clearInterval(STATE.dripTimer);
          finalize(toProcess);
          return;
        }
        const batch = toProcess.slice(batchStart, batchStart + CONFIG.drip.batchSize);
        addLog(`⏰ Drip batch: ${batchStart + 1}–${batchStart + batch.length}`);
        for (let i = 0; i < batch.length; i++) {
          if (STATE.aborted) break;
          await waitForUnpause();
          if (isRateLimited()) { addLog('🚨 Rate limited! Pausing batch.', 'error'); break; }
          await processTweet(batch[i], batchStart + i, toProcess.length);
          if (i < batch.length - 1) {
            const delay = gaussian(preset.delay[0], preset.delay[1]);
            addLog(`⏳ ${(delay / 1000).toFixed(0)}s...`);
            await sleep(delay);
          }
        }
        batchStart += CONFIG.drip.batchSize;
        updatePanel();
      };

      await runBatch();
      STATE.dripTimer = setInterval(runBatch, CONFIG.drip.intervalMinutes * 60 * 1000);
      return; // finalize is called inside runBatch when done
    }

    // ── NORMAL MODE ──
    for (let i = 0; i < toProcess.length; i++) {
      if (STATE.aborted) break;
      await waitForUnpause();

      if (isRateLimited()) {
        addLog('🚨 Rate limited! Waiting 120s...', 'error');
        await sleep(120000);
        if (isRateLimited()) { addLog('🛑 Still limited. Stopping.', 'error'); break; }
      }

      await processTweet(toProcess[i], i, toProcess.length);

      if (i < toProcess.length - 1 && !STATE.aborted) {
        const delay = gaussian(preset.delay[0], preset.delay[1]);
        addLog(`⏳ ${(delay / 1000).toFixed(0)}s...`);
        await sleep(delay);
      }
    }

    finalize(toProcess);
  };

  // ═══════════════════════════════════════════════════════════
  // FINALIZE
  // ═══════════════════════════════════════════════════════════

  const finalize = (toProcess) => {
    STATE.status = 'done';
    stopUpdateTimer();
    setButtonStates('done');

    const uniqueAuthors = [...new Set(STATE.results.map(r => r.author))];
    addLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    addLog(`✅ Done! ${STATE.processed} tweets processed`);
    addLog(`❤️ ${STATE.liked} liked · 🔁 ${STATE.retweeted} RT · 🔖 ${STATE.bookmarked} saved · 💬 ${STATE.replied} replied`);
    addLog(`👥 ${uniqueAuthors.length} unique accounts`);
    if (STATE.failed > 0) addLog(`❌ ${STATE.failed} failed`, 'warn');
    if (CONFIG.dryRun) addLog('🏃 Dry run — nothing was posted', 'warn');
    if (STATE.undoStack.length > 0) addLog(`↩ ${STATE.undoStack.length} actions can be undone`);

    // Save to history
    saveHistory({
      date: new Date().toISOString(),
      dryRun: CONFIG.dryRun,
      liked: STATE.liked,
      replied: STATE.replied,
      retweeted: STATE.retweeted,
      bookmarked: STATE.bookmarked,
      failed: STATE.failed,
      total: STATE.processed,
      authors: uniqueAuthors,
      speed: CONFIG.speedPreset,
    });

    // Auto-export results
    if (STATE.results.length > 0 && !CONFIG.dryRun) {
      const blob = new Blob([JSON.stringify(STATE.results, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `xactions-engagement-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      addLog('📥 Results exported');
    }
  };

  // ═══════════════════════════════════════════════════════════
  // BUTTON HANDLERS
  // ═══════════════════════════════════════════════════════════

  const setButtonStates = (mode) => {
    const start = document.getElementById('xeb-startBtn');
    const pause = document.getElementById('xeb-pauseBtn');
    const stop = document.getElementById('xeb-stopBtn');

    if (mode === 'running') {
      start.disabled = true;
      pause.disabled = false;
      stop.disabled = false;
    } else if (mode === 'paused') {
      start.disabled = true;
      pause.textContent = '▶ Resume';
      pause.disabled = false;
      stop.disabled = false;
    } else if (mode === 'done' || mode === 'idle') {
      start.disabled = false;
      start.textContent = mode === 'done' ? '🔄 Restart' : '▶ Start';
      pause.disabled = true;
      pause.textContent = '⏸ Pause';
      stop.disabled = true;

      // Show undo button if there are actions to undo
      if (STATE.undoStack.length > 0) {
        const actionBar = document.getElementById('xeb-actionBar');
        if (actionBar && !document.getElementById('xeb-undoBtn')) {
          const undoBtn = document.createElement('button');
          undoBtn.id = 'xeb-undoBtn';
          undoBtn.className = 'xeb-btn xeb-btn-warn';
          undoBtn.textContent = `↩ Undo (${STATE.undoStack.length})`;
          undoBtn.addEventListener('click', async () => {
            undoBtn.disabled = true;
            undoBtn.textContent = '↩ Undoing...';
            await undoAll();
            undoBtn.remove();
          });
          actionBar.appendChild(undoBtn);
        }
      }
    }
  };

  document.getElementById('xeb-startBtn').addEventListener('click', () => {
    setButtonStates('running');
    // Switch to progress tab
    panel.querySelectorAll('.xeb-tab').forEach(t => t.classList.remove('active'));
    panel.querySelectorAll('.xeb-pane').forEach(p => p.classList.remove('active'));
    panel.querySelector('[data-tab="progress"]').classList.add('active');
    panel.querySelector('[data-pane="progress"]').classList.add('active');
    run();
  });

  document.getElementById('xeb-pauseBtn').addEventListener('click', () => {
    if (STATE.paused) {
      STATE.paused = false;
      STATE.status = 'running';
      setButtonStates('running');
      addLog('▶ Resumed', 'success');
    } else {
      STATE.paused = true;
      STATE.status = 'paused';
      setButtonStates('paused');
      addLog('⏸ Paused', 'warn');
    }
  });

  document.getElementById('xeb-stopBtn').addEventListener('click', () => {
    STATE.aborted = true;
    addLog('🛑 Stopping...', 'error');
  });

  // Expose API for console access
  window.XActions = window.XActions || {};
  window.XActions.engagementBooster = {
    pause: () => { STATE.paused = true; STATE.status = 'paused'; addLog('⏸ Paused'); },
    resume: () => { STATE.paused = false; STATE.status = 'running'; addLog('▶ Resumed'); },
    abort: () => { STATE.aborted = true; addLog('🛑 Aborting...'); },
    undo: undoAll,
    history: getHistoryStats,
    state: STATE,
    config: CONFIG,
  };

  addLog('🚀 Engagement Booster v2 ready');
  addLog('Configure settings and click ▶ Start');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  🚀 ENGAGEMENT BOOSTER v2                ║');
  console.log('║  by nichxbt — floating panel active      ║');
  console.log('║  Console: XActions.engagementBooster.*    ║');
  console.log('╚══════════════════════════════════════════╝');

  // ── Export Helpers ─────────────────────────────────────────
  const exportResults = (format) => {
    if (results.length === 0) { showToast('No results to export', 'warning'); return; }
    const dateStr = new Date().toISOString().slice(0, 10);
    if (format === 'json' || format === 'both') {
      const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `xactions-engagement-${dateStr}.json`);
    }
    if (format === 'csv' || format === 'both') {
      const headers = ['timestamp', 'author', 'text', 'score', 'actions'];
      const rows = results.map(r =>
        [r.timestamp, r.author, `"${(r.text || '').replace(/"/g, '""')}"`, r.score || '', r.actions.join('+')]
      );
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      downloadBlob(blob, `xactions-engagement-${dateStr}.csv`);
    }
    showToast(`📥 Exported ${results.length} results`, 'success');
  };

  const downloadBlob = (blob, filename) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  };

  // ── Sound Cue ──────────────────────────────────────────────
  const playCompletionSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 chord
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + 0.7);
      });
    } catch { /* AudioContext not available — skip */ }
  };

  // ── Collect eligible tweets ────────────────────────────────
  const collectEligible = async () => {
    stats.phase = '🔍 Scanning timeline...';
    updatePanel();

    const eligible = [];
    const seen = new Set();
    const prevSession = loadSession();
    const alreadyProcessed = new Set(prevSession ? prevSession.fingerprints : []);

    // Restore previous results
    if (prevSession && prevSession.results) {
      results.push(...prevSession.results);
      showToast(`♻️ Resumed: ${prevSession.results.length} prior results`, 'info');
    }

    for (let round = 0; round < CONFIG.scrollRounds; round++) {
      stats.phase = `🔍 Scanning (round ${round + 1}/${CONFIG.scrollRounds})`;
      updatePanel();

      const articles = document.querySelectorAll(SEL.tweet);
      for (const article of articles) {
        const textEl = $(SEL.tweetText, article);
        const text = textEl ? textEl.textContent.trim() : '';
        const fingerprint = text.slice(0, 80);
        if (seen.has(fingerprint)) continue;
        if (alreadyProcessed.has(fingerprint)) continue; // session resume: skip already done
        seen.add(fingerprint);

        // Author
        const authorLink = article.querySelector('a[href^="/"][role="link"]');
        const authorMatch = authorLink ? (authorLink.getAttribute('href') || '').match(/^\/([A-Za-z0-9_]+)/) : null;
        const author = authorMatch ? authorMatch[1] : null;
        if (!author || ['home', 'explore', 'notifications', 'messages', 'i'].includes(author)) continue;

        // Filter: blocklist
        if (CONFIG.blockUsers.length > 0 && CONFIG.blockUsers.some(u => u.toLowerCase() === author.toLowerCase())) continue;

        // Filter: target users
        if (CONFIG.targetUsers.length > 0 && !CONFIG.targetUsers.some(u => u.toLowerCase() === author.toLowerCase())) continue;

        // Filter: keywords
        const textLower = text.toLowerCase();
        if (CONFIG.skipKeywords.some(kw => textLower.includes(kw.toLowerCase()))) continue;
        if (CONFIG.onlyKeywords.length > 0 && !CONFIG.onlyKeywords.some(kw => textLower.includes(kw.toLowerCase()))) continue;

        // Filter: skip already liked
        if (CONFIG.skipLiked && $(SEL.unlikeBtn, article)) continue;

        // Engagement metrics
        const likeEl = article.querySelector('[data-testid="like"] span, [data-testid="unlike"] span');
        const likes = likeEl ? parseNum(likeEl.textContent) : 0;
        if (likes < CONFIG.minLikes) continue;

        const replyCountEl = article.querySelector('[data-testid="reply"] span');
        const replies = replyCountEl ? parseNum(replyCountEl.textContent) : 0;

        const rtEl = article.querySelector('[data-testid="retweet"] span, [data-testid="unretweet"] span');
        const retweets = rtEl ? parseNum(rtEl.textContent) : 0;

        const tweet = { article, text, author, likes, replies, retweets, fingerprint };
        tweet.score = scoreTweet(tweet);

        // Filter: minimum engagement score
        if (tweet.score < CONFIG.minEngagementScore) continue;

        eligible.push(tweet);
      }

      console.log(`   📜 Round ${round + 1}: ${eligible.length} eligible tweets`);
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(CONFIG.scrollDelay);
    }

    // Sort by engagement score (highest first)
    eligible.sort((a, b) => b.score - a.score);
    return eligible;
  };

  // ── Like a tweet ───────────────────────────────────────────
  const likeTweet = async (article) => {
    const btn = $(SEL.likeBtn, article);
    if (!btn) return false;
    if (CONFIG.dryRun) { console.log('     ❤️ [DRY RUN] Would like.'); return true; }
    btn.click();
    await sleep(500);
    return !!$(SEL.unlikeBtn, article);
  };

  // ── Retweet a tweet ────────────────────────────────────────
  const retweetTweet = async (article) => {
    if ($(SEL.unretweetBtn, article)) return false; // already retweeted
    const btn = $(SEL.retweetBtn, article);
    if (!btn) return false;
    if (CONFIG.dryRun) { console.log('     🔁 [DRY RUN] Would retweet.'); return true; }
    btn.click();
    await sleep(600);
    // Click "Repost" in the popup menu
    const menuItem = document.querySelector('[data-testid="retweetConfirm"]');
    if (menuItem) { menuItem.click(); await sleep(500); return true; }
    return false;
  };

  // ── Bookmark a tweet ───────────────────────────────────────
  const bookmarkTweet = async (article) => {
    const shareBtn = article.querySelector('[data-testid="bookmark"]');
    if (!shareBtn) return false;
    if (CONFIG.dryRun) { console.log('     🔖 [DRY RUN] Would bookmark.'); return true; }
    shareBtn.click();
    await sleep(500);
    return true;
  };

  // ── Follow a user from tweet ───────────────────────────────
  const followUserFromTweet = async (author) => {
    if (CONFIG.dryRun) { console.log(`     👤 [DRY RUN] Would follow @${author}.`); return true; }
    // Navigate approach: check if there's a follow button visible
    // This is best-effort — the follow button may not be on the tweet itself
    try {
      const userCell = document.querySelector(`[data-testid="UserCell"] a[href="/${author}"]`);
      if (userCell) {
        const followBtn = userCell.closest('[data-testid="UserCell"]')?.querySelector('[data-testid$="-follow"]');
        if (followBtn) { followBtn.click(); await sleep(500); return true; }
      }
      // Fallback: open caret menu → follow (not always available on-tweet)
      return false;
    } catch { return false; }
  };

  // ── Reply to a tweet ───────────────────────────────────────
  const replyToTweet = async (article, tweetText, author) => {
    const replyBtn = $(SEL.replyBtn, article);
    if (!replyBtn) return false;

    const template = pickReplyTemplate(tweetText);
    const replyText = template.replace('{author}', `@${author}`).replace('{topic}', '');

    if (CONFIG.dryRun) {
      console.log(`     💬 [DRY RUN] Would reply: "${replyText}"`);
      return true;
    }

    replyBtn.click();
    await sleep(1500);

    const tweetBox = $(SEL.tweetBox);
    if (!tweetBox) { console.log('     ⚠️ Reply box not found.'); return false; }

    tweetBox.focus();
    document.execCommand('insertText', false, replyText);
    await sleep(800);

    const sendBtn = $(SEL.tweetButton);
    if (!sendBtn) { console.log('     ⚠️ Reply button not found.'); return false; }

    sendBtn.click();
    await sleep(2000);
    return true;
  };

  // ── Main ───────────────────────────────────────────────────
  const run = async () => {
    initToasts();
    injectPanel();

    const W = 60;
    console.log('╔' + '═'.repeat(W) + '╗');
    console.log('║  🚀 ENGAGEMENT BOOSTER v2.0' + ' '.repeat(W - 29) + '║');
    console.log('║  by nichxbt' + ' '.repeat(W - 14) + '║');
    console.log('╚' + '═'.repeat(W) + '╝');

    if (CONFIG.dryRun) {
      console.log('\n🏃 DRY RUN mode — no interactions will happen.');
    } else {
      console.log('\n⚠️ LIVE MODE — will actually interact with tweets!');
    }

    const enabledActions = Object.entries(CONFIG.actions).filter(([, v]) => v).map(([k]) => k);
    console.log(`   Actions: ${enabledActions.join(' + ')}`);
    if (CONFIG.targetUsers.length > 0) console.log(`   Targeting: ${CONFIG.targetUsers.join(', ')}`);
    if (CONFIG.blockUsers.length > 0) console.log(`   Blocking: ${CONFIG.blockUsers.join(', ')}`);
    if (CONFIG.onlyKeywords.length > 0) console.log(`   Keywords: ${CONFIG.onlyKeywords.join(', ')}`);

    showToast('🔍 Scanning for tweets...', 'info');
    const eligible = await collectEligible();

    if (eligible.length === 0) {
      stats.phase = '❌ No eligible tweets found';
      updatePanel();
      showToast('No eligible tweets found. Adjust filters.', 'error');
      console.error('❌ No eligible tweets found. Adjust filters.');
      return;
    }

    const toProcess = eligible.slice(0, CONFIG.maxInteractions);
    stats.total = toProcess.length;
    stats.phase = `⚡ Processing ${toProcess.length} tweets`;
    updatePanel();

    console.log(`\n📊 Found ${eligible.length} eligible (scored & sorted). Processing top ${toProcess.length}.\n`);
    showToast(`Found ${eligible.length} tweets — processing top ${toProcess.length}`, 'success');

    const processedFingerprints = new Set();

    for (let i = 0; i < toProcess.length; i++) {
      if (aborted) break;
      await waitForUnpause();

      // Exponential backoff on rate limits
      if (isRateLimited()) {
        rateLimitStreak++;
        const backoff = Math.min(120000 * Math.pow(1.5, rateLimitStreak - 1), 600000); // max 10 minutes
        const backoffSec = Math.round(backoff / 1000);
        stats.phase = `🚨 Rate limited — cooling ${backoffSec}s`;
        updatePanel();
        showToast(`Rate limited! Waiting ${backoffSec}s (attempt #${rateLimitStreak})`, 'error');
        console.log(`🚨 Rate limited! Backoff: ${backoffSec}s (streak ${rateLimitStreak})`);
        await sleep(backoff);
        if (isRateLimited()) {
          console.log('🛑 Still rate limited. Stopping.');
          showToast('Still rate limited — stopping.', 'error');
          break;
        }
      } else {
        rateLimitStreak = 0;
      }

      const target = toProcess[i];
      stats.phase = `⚡ ${i + 1}/${toProcess.length} — @${target.author}`;
      updatePanel();

      console.log(`\n[${i + 1}/${toProcess.length}] @${target.author}: "${target.text.slice(0, 50)}..." (score: ${target.score}, ❤️${target.likes})`);

      target.article.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightTweet(target.article);
      await sleep(800);

      const result = { author: target.author, text: target.text.slice(0, 100), score: target.score, actions: [], timestamp: '' };

      // Like
      if (CONFIG.actions.like) {
        const ok = await likeTweet(target.article);
        if (ok) { stats.liked++; result.actions.push('liked'); }
        else stats.failed++;
        await sleep(gaussian(500, 1500));
      }

      // Retweet
      if (CONFIG.actions.retweet) {
        const ok = await retweetTweet(target.article);
        if (ok) { stats.retweeted++; result.actions.push('retweeted'); }
        else stats.failed++;
        await sleep(gaussian(500, 1200));
      }

      // Bookmark
      if (CONFIG.actions.bookmark) {
        const ok = await bookmarkTweet(target.article);
        if (ok) { stats.bookmarked++; result.actions.push('bookmarked'); }
        else stats.failed++;
        await sleep(gaussian(400, 800));
      }

      // Reply
      if (CONFIG.actions.reply) {
        const ok = await replyToTweet(target.article, target.text, target.author);
        if (ok) { stats.replied++; result.actions.push('replied'); }
        else stats.failed++;
        await sleep(gaussian(1000, 2000));
      }

      // Follow
      if (CONFIG.actions.follow) {
        const ok = await followUserFromTweet(target.author);
        if (ok) { stats.followed++; result.actions.push('followed'); }
        // Don't count follow failure as "failed" — it's often unavailable
        await sleep(gaussian(300, 600));
      }

      result.timestamp = new Date().toISOString();
      results.push(result);
      processedFingerprints.add(target.fingerprint);
      stats.processed = i + 1;
      updatePanel();

      // Save session after each interaction
      saveSession(processedFingerprints);

      unhighlightTweet();

      if (i < toProcess.length - 1 && !aborted) {
        const delay = gaussian(CONFIG.delayBetween[0], CONFIG.delayBetween[1]);
        console.log(`   ⏳ Waiting ${(delay / 1000).toFixed(0)}s...`);
        stats.phase = `⏳ Cooldown ${(delay / 1000).toFixed(0)}s`;
        updatePanel();
        await sleep(delay);
      }
    }

    unhighlightTweet();

    // ── Summary ──────────────────────────────────────────────
    stats.phase = aborted ? '🛑 Stopped' : '✅ Complete';
    updatePanel();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  📊 ENGAGEMENT BOOSTER v2.0 RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  ❤️  Liked:      ${stats.liked}`);
    console.log(`  💬 Replied:    ${stats.replied}`);
    console.log(`  🔁 Retweeted:  ${stats.retweeted}`);
    console.log(`  🔖 Bookmarked: ${stats.bookmarked}`);
    console.log(`  👤 Followed:   ${stats.followed}`);
    console.log(`  ❌ Failed:     ${stats.failed}`);
    if (CONFIG.dryRun) console.log('  🏃 (Dry run — nothing was posted)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const uniqueAuthors = new Set(results.map(r => r.author));
    console.log(`  Engaged with ${uniqueAuthors.size} unique accounts.`);

    const totalActions = stats.liked + stats.replied + stats.retweeted + stats.bookmarked + stats.followed;
    showToast(`✅ Done! ${totalActions} actions on ${uniqueAuthors.size} accounts`, 'success');

    // Auto-export
    if (results.length > 0) {
      exportResults(CONFIG.exportFormat);
    }

    // Clear session on completion
    clearSession();

    // Sound cue
    playCompletionSound();
  };

  run();
})();

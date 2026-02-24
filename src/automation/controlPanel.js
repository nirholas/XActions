// XActions Control Panel — Floating UI for Browser Automations
// https://github.com/nirholas/XActions
//
// REQUIRES: Paste core.js first!
//
// This creates a draggable floating panel on x.com that lets you:
// - Start / Pause / Resume / Restart automations
// - Configure inputs (keywords, users, limits, time limits)
// - Queue multi-target tasks (like 500 on @nichxbt, then 500 on @doi)
// - Export results (JSON / CSV)
// - Share configurations as copy-paste JSON
// - See live progress & activity log
//
// by nichxbt

(() => {
  if (!window.XActions?.Core) {
    console.error('❌ Core module not loaded! Paste core.js first.');
    return;
  }

  // Prevent double-inject
  if (document.getElementById('xa-panel')) {
    console.log('⚡ Panel already open');
    return;
  }

  const { log, sleep, randomDelay, scrollBy, clickElement, SELECTORS, storage, rateLimit } = window.XActions.Core;

  // ========================================================================
  // PANEL STATE
  // ========================================================================

  const PANEL = {
    status: 'idle',        // idle | running | paused | done | error
    taskIndex: 0,          // current task in queue
    actionCount: 0,        // total actions this session
    startTime: null,
    pauseResolve: null,    // resolve function when unpausing
    abortController: null, // AbortController for current run
    logs: [],
    results: [],           // collected results for export
  };

  const TASK_QUEUE = [];   // Array of task objects

  // ========================================================================
  // AVAILABLE AUTOMATIONS
  // ========================================================================

  const AUTOMATIONS = {
    'like-timeline': {
      label: '❤️ Like Timeline',
      description: 'Like posts on a user\'s timeline or your home feed',
      inputs: [
        { key: 'target', label: 'Target @username (blank = home feed)', type: 'text', default: '' },
        { key: 'limit', label: 'Max likes', type: 'number', default: 50 },
        { key: 'keywords', label: 'Only posts with keywords (comma-sep, blank = all)', type: 'text', default: '' },
        { key: 'skipReplies', label: 'Skip replies', type: 'checkbox', default: true },
        { key: 'alsoRetweet', label: 'Also retweet', type: 'checkbox', default: false },
        { key: 'minDelay', label: 'Min delay (ms)', type: 'number', default: 2000 },
        { key: 'maxDelay', label: 'Max delay (ms)', type: 'number', default: 5000 },
      ],
      run: runLikeTimeline,
    },
    'follow-engagers': {
      label: '👥 Follow Engagers',
      description: 'Follow people who engage with a target account\'s posts',
      inputs: [
        { key: 'target', label: 'Target @username', type: 'text', default: '' },
        { key: 'limit', label: 'Max follows', type: 'number', default: 30 },
        { key: 'bioKeywords', label: 'Bio must contain (comma-sep, blank = all)', type: 'text', default: '' },
        { key: 'minDelay', label: 'Min delay (ms)', type: 'number', default: 2000 },
        { key: 'maxDelay', label: 'Max delay (ms)', type: 'number', default: 5000 },
      ],
      run: runFollowEngagers,
    },
    'unfollow': {
      label: '🚫 Smart Unfollow',
      description: 'Unfollow accounts that don\'t follow you back',
      inputs: [
        { key: 'limit', label: 'Max unfollows', type: 'number', default: 50 },
        { key: 'keepVerified', label: 'Keep verified accounts', type: 'checkbox', default: true },
        { key: 'keepKeywords', label: 'Keep if bio contains (comma-sep)', type: 'text', default: '' },
        { key: 'minDelay', label: 'Min delay (ms)', type: 'number', default: 2000 },
        { key: 'maxDelay', label: 'Max delay (ms)', type: 'number', default: 5000 },
      ],
      run: runSmartUnfollow,
    },
    'scrape-followers': {
      label: '📋 Scrape Followers',
      description: 'Collect follower usernames, bios, and stats',
      inputs: [
        { key: 'target', label: 'Target @username', type: 'text', default: '' },
        { key: 'limit', label: 'Max to collect', type: 'number', default: 200 },
      ],
      run: runScrapeFollowers,
    },
    'algo-builder': {
      label: '🧠 Algorithm Builder',
      description: '24/7 niche algorithm builder — search, engage, follow, comment (LLM)',
      inputs: [
        { key: 'keywords', label: 'Niche keywords (comma-sep)', type: 'text', default: 'web3 builder, crypto alpha' },
        { key: 'persona', label: 'Your persona (for LLM comments)', type: 'text', default: 'a crypto & web3 builder' },
        { key: 'bioKeywords', label: 'Bio filter keywords (comma-sep, blank = all)', type: 'text', default: 'crypto, web3, defi, builder' },
        { key: 'targetAccounts', label: 'Target @accounts (comma-sep)', type: 'text', default: '' },
        { key: 'llmApiKey', label: 'OpenRouter API key (blank = no LLM)', type: 'text', default: '' },
        { key: 'sessionMinutes', label: 'Session length (min)', type: 'number', default: 30 },
      ],
      run: runAlgoBuilder,
    },
  };

  // ========================================================================
  // CSS
  // ========================================================================

  const CSS = `
    #xa-panel{position:fixed;top:60px;right:16px;width:380px;max-height:calc(100vh - 80px);background:#16181c;border:1px solid #2f3336;border-radius:16px;color:#e7e9ea;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;z-index:999999;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,.6);font-size:13px;overflow:hidden}
    #xa-panel *{box-sizing:border-box;margin:0;padding:0}
    #xa-panel-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#000;cursor:grab;user-select:none;border-bottom:1px solid #2f3336}
    #xa-panel-header:active{cursor:grabbing}
    .xa-title{font-weight:700;font-size:15px;display:flex;align-items:center;gap:6px}
    .xa-title span{color:#1d9bf0}
    .xa-close{background:none;border:none;color:#71767b;font-size:18px;cursor:pointer;padding:4px 8px;border-radius:50%;transition:all .15s}
    .xa-close:hover{background:#2f3336;color:#e7e9ea}
    #xa-panel-body{overflow-y:auto;flex:1;padding:0}
    .xa-section{padding:12px 16px;border-bottom:1px solid #2f3336}
    .xa-section:last-child{border-bottom:none}
    .xa-section-title{font-size:12px;font-weight:600;color:#71767b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
    .xa-select{width:100%;background:#000;border:1px solid #2f3336;border-radius:8px;color:#e7e9ea;padding:8px 12px;font-size:13px;cursor:pointer;outline:none;margin-bottom:8px}
    .xa-select:focus{border-color:#1d9bf0}
    .xa-select option{background:#000;color:#e7e9ea}
    .xa-desc{color:#71767b;font-size:12px;margin-bottom:10px}
    .xa-input-group{margin-bottom:8px}
    .xa-input-group label{display:flex;align-items:center;gap:6px;color:#e7e9ea;font-size:12px;margin-bottom:4px;font-weight:500}
    .xa-input-group input[type=text],.xa-input-group input[type=number]{width:100%;background:#000;border:1px solid #2f3336;border-radius:8px;color:#e7e9ea;padding:7px 10px;font-size:13px;outline:none;transition:border .15s}
    .xa-input-group input:focus{border-color:#1d9bf0}
    .xa-input-group input[type=checkbox]{accent-color:#1d9bf0;width:16px;height:16px;cursor:pointer}
    .xa-checkbox-row{display:flex;align-items:center;gap:8px;padding:4px 0}
    .xa-checkbox-row label{cursor:pointer;font-size:13px;color:#e7e9ea}
    .xa-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 16px;border-radius:9999px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
    .xa-btn:disabled{opacity:.4;cursor:not-allowed}
    .xa-btn-primary{background:#1d9bf0;color:#fff}.xa-btn-primary:hover:not(:disabled){background:#1a8cd8}
    .xa-btn-danger{background:#f4212e;color:#fff}.xa-btn-danger:hover:not(:disabled){background:#c91a25}
    .xa-btn-outline{background:transparent;border:1px solid #2f3336;color:#e7e9ea}.xa-btn-outline:hover:not(:disabled){background:#2f3336}
    .xa-btn-sm{padding:5px 12px;font-size:12px}
    .xa-btn-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
    .xa-status{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;font-size:13px;font-weight:600}
    .xa-status-idle{background:#2f3336;color:#71767b}
    .xa-status-running{background:rgba(29,155,240,.15);color:#1d9bf0}
    .xa-status-paused{background:rgba(255,212,0,.15);color:#ffd400}
    .xa-status-done{background:rgba(0,186,124,.15);color:#00ba7c}
    .xa-status-error{background:rgba(244,33,46,.15);color:#f4212e}
    .xa-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    .xa-dot-idle{background:#71767b}
    .xa-dot-running{background:#1d9bf0;animation:xa-pulse 1.5s infinite}
    .xa-dot-paused{background:#ffd400}
    .xa-dot-done{background:#00ba7c}
    .xa-dot-error{background:#f4212e}
    @keyframes xa-pulse{0%,100%{opacity:1}50%{opacity:.3}}
    .xa-progress{margin-top:6px}
    .xa-progress-bar{height:4px;background:#2f3336;border-radius:2px;overflow:hidden}
    .xa-progress-fill{height:100%;background:#1d9bf0;border-radius:2px;transition:width .3s}
    .xa-progress-text{display:flex;justify-content:space-between;font-size:11px;color:#71767b;margin-top:4px}
    .xa-log{max-height:140px;overflow-y:auto;background:#000;border:1px solid #2f3336;border-radius:8px;padding:8px;font-family:"Cascadia Code",Consolas,monospace;font-size:11px;line-height:1.5}
    .xa-log-entry{color:#71767b;word-break:break-word}
    .xa-log-entry.success{color:#00ba7c}
    .xa-log-entry.error{color:#f4212e}
    .xa-log-entry.warning{color:#ffd400}
    .xa-log-entry.action{color:#1d9bf0}
    .xa-queue-item{display:flex;align-items:center;gap:8px;padding:6px 10px;background:#000;border:1px solid #2f3336;border-radius:8px;margin-bottom:4px;font-size:12px}
    .xa-queue-item.active{border-color:#1d9bf0;background:rgba(29,155,240,.08)}
    .xa-queue-item.done{opacity:.5}
    .xa-queue-num{width:20px;height:20px;border-radius:50%;background:#2f3336;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0}
    .xa-queue-item.active .xa-queue-num{background:#1d9bf0;color:#fff}
    .xa-queue-item.done .xa-queue-num{background:#00ba7c;color:#fff}
    .xa-queue-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .xa-queue-remove{background:none;border:none;color:#71767b;cursor:pointer;font-size:14px;padding:2px 4px}
    .xa-queue-remove:hover{color:#f4212e}
    .xa-time-limit{display:flex;align-items:center;gap:8px}
    .xa-time-limit input{width:70px}
    .xa-time-limit span{color:#71767b;font-size:12px}
    .xa-tabs{display:flex;border-bottom:1px solid #2f3336}
    .xa-tab{flex:1;padding:10px;text-align:center;font-size:12px;font-weight:600;color:#71767b;cursor:pointer;border-bottom:2px solid transparent;transition:all .15s}
    .xa-tab:hover{color:#e7e9ea;background:rgba(255,255,255,.03)}
    .xa-tab.active{color:#1d9bf0;border-bottom-color:#1d9bf0}
    .xa-tab-content{display:none}.xa-tab-content.active{display:block}
    .xa-minimize #xa-panel-body,.xa-minimize .xa-tabs{display:none}
    .xa-minimize{max-height:48px!important}
  `;

  // ========================================================================
  // PANEL HTML
  // ========================================================================

  function buildHTML() {
    return `
    <div id="xa-panel-header">
      <div class="xa-title"><span>⚡</span> XActions Panel</div>
      <div style="display:flex;gap:4px">
        <button class="xa-close" id="xa-minimize" title="Minimize">─</button>
        <button class="xa-close" id="xa-close-panel" title="Close">✕</button>
      </div>
    </div>

    <div class="xa-tabs">
      <div class="xa-tab active" data-tab="config">Configure</div>
      <div class="xa-tab" data-tab="queue">Queue</div>
      <div class="xa-tab" data-tab="log">Log</div>
    </div>

    <div id="xa-panel-body">
      <!-- CONFIG TAB -->
      <div class="xa-tab-content active" id="xa-tab-config">
        <!-- Status -->
        <div class="xa-section">
          <div id="xa-status" class="xa-status xa-status-idle">
            <div class="xa-dot xa-dot-idle"></div>
            <span>Idle — configure and start</span>
          </div>
          <div class="xa-progress" id="xa-progress" style="display:none">
            <div class="xa-progress-bar"><div class="xa-progress-fill" id="xa-progress-fill" style="width:0%"></div></div>
            <div class="xa-progress-text"><span id="xa-progress-count">0/0</span><span id="xa-progress-time">0s</span></div>
          </div>
        </div>

        <!-- Automation Selector -->
        <div class="xa-section">
          <div class="xa-section-title">Automation</div>
          <select class="xa-select" id="xa-automation">
            ${Object.entries(AUTOMATIONS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
          </select>
          <div class="xa-desc" id="xa-auto-desc">${AUTOMATIONS[Object.keys(AUTOMATIONS)[0]].description}</div>
        </div>

        <!-- Dynamic Inputs -->
        <div class="xa-section" id="xa-inputs-section">
          <div class="xa-section-title">Settings</div>
          <div id="xa-inputs"></div>
        </div>

        <!-- Time Limit -->
        <div class="xa-section">
          <div class="xa-section-title">Time Limit (optional)</div>
          <div class="xa-time-limit">
            <input type="number" id="xa-time-limit" min="0" value="0" class="xa-input-group" style="background:#000;border:1px solid #2f3336;border-radius:8px;color:#e7e9ea;padding:7px 10px;font-size:13px;outline:none;width:70px">
            <span>minutes (0 = no limit)</span>
          </div>
        </div>

        <!-- Controls -->
        <div class="xa-section">
          <div class="xa-btn-row">
            <button class="xa-btn xa-btn-primary" id="xa-start">▶ Start</button>
            <button class="xa-btn xa-btn-outline" id="xa-pause" disabled>⏸ Pause</button>
            <button class="xa-btn xa-btn-danger xa-btn-sm" id="xa-stop" disabled>⏹ Stop</button>
          </div>
          <div class="xa-btn-row" style="margin-top:6px">
            <button class="xa-btn xa-btn-outline xa-btn-sm" id="xa-add-queue">＋ Add to Queue</button>
            <button class="xa-btn xa-btn-outline xa-btn-sm" id="xa-export">📤 Export</button>
            <button class="xa-btn xa-btn-outline xa-btn-sm" id="xa-share">🔗 Share Config</button>
          </div>
        </div>
      </div>

      <!-- QUEUE TAB -->
      <div class="xa-tab-content" id="xa-tab-queue">
        <div class="xa-section">
          <div class="xa-section-title">Task Queue</div>
          <div id="xa-queue-list"></div>
          <div id="xa-queue-empty" class="xa-desc" style="text-align:center;padding:16px 0">No tasks queued. Configure an automation and click "Add to Queue".</div>
          <div class="xa-btn-row" style="margin-top:8px">
            <button class="xa-btn xa-btn-primary xa-btn-sm" id="xa-run-queue" disabled>▶ Run Queue</button>
            <button class="xa-btn xa-btn-outline xa-btn-sm" id="xa-clear-queue">🗑 Clear</button>
          </div>
        </div>
      </div>

      <!-- LOG TAB -->
      <div class="xa-tab-content" id="xa-tab-log">
        <div class="xa-section">
          <div class="xa-section-title">Activity Log</div>
          <div class="xa-log" id="xa-log"></div>
          <div class="xa-btn-row" style="margin-top:8px">
            <button class="xa-btn xa-btn-outline xa-btn-sm" id="xa-clear-log">Clear</button>
            <button class="xa-btn xa-btn-outline xa-btn-sm" id="xa-export-log">Export Log</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ========================================================================
  // INJECT PANEL
  // ========================================================================

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = 'xa-panel';
  panel.innerHTML = buildHTML();
  document.body.appendChild(panel);

  // ========================================================================
  // DRAG SUPPORT
  // ========================================================================

  {
    const header = panel.querySelector('#xa-panel-header');
    let dragging = false, offsetX = 0, offsetY = 0;
    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.xa-close')) return;
      dragging = true;
      offsetX = e.clientX - panel.getBoundingClientRect().left;
      offsetY = e.clientY - panel.getBoundingClientRect().top;
      panel.style.transition = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const x = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, e.clientX - offsetX));
      const y = Math.max(0, Math.min(window.innerHeight - 48, e.clientY - offsetY));
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      panel.style.right = 'auto';
    });
    document.addEventListener('mouseup', () => { dragging = false; panel.style.transition = ''; });
  }

  // ========================================================================
  // DOM REFS
  // ========================================================================

  const $ = (sel) => panel.querySelector(sel);
  const $$ = (sel) => panel.querySelectorAll(sel);

  const els = {
    automation: $('#xa-automation'),
    desc: $('#xa-auto-desc'),
    inputs: $('#xa-inputs'),
    status: $('#xa-status'),
    progress: $('#xa-progress'),
    progressFill: $('#xa-progress-fill'),
    progressCount: $('#xa-progress-count'),
    progressTime: $('#xa-progress-time'),
    timeLimit: $('#xa-time-limit'),
    startBtn: $('#xa-start'),
    pauseBtn: $('#xa-pause'),
    stopBtn: $('#xa-stop'),
    addQueueBtn: $('#xa-add-queue'),
    exportBtn: $('#xa-export'),
    shareBtn: $('#xa-share'),
    queueList: $('#xa-queue-list'),
    queueEmpty: $('#xa-queue-empty'),
    runQueueBtn: $('#xa-run-queue'),
    clearQueueBtn: $('#xa-clear-queue'),
    logEl: $('#xa-log'),
    clearLogBtn: $('#xa-clear-log'),
    exportLogBtn: $('#xa-export-log'),
  };

  // ========================================================================
  // PANEL LOG
  // ========================================================================

  function panelLog(msg, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const entry = { time, msg, type };
    PANEL.logs.push(entry);
    const div = document.createElement('div');
    div.className = `xa-log-entry ${type}`;
    div.textContent = `[${time}] ${msg}`;
    els.logEl.appendChild(div);
    els.logEl.scrollTop = els.logEl.scrollHeight;
    // Also log to real console
    log(msg, type);
  }

  // ========================================================================
  // STATUS UPDATES
  // ========================================================================

  function setStatus(status, text) {
    PANEL.status = status;
    els.status.className = `xa-status xa-status-${status}`;
    const dot = els.status.querySelector('.xa-dot');
    dot.className = `xa-dot xa-dot-${status}`;
    els.status.querySelector('span').textContent = text;

    els.startBtn.disabled = status === 'running';
    els.pauseBtn.disabled = status !== 'running' && status !== 'paused';
    els.stopBtn.disabled = status === 'idle' || status === 'done';
    els.pauseBtn.textContent = status === 'paused' ? '▶ Resume' : '⏸ Pause';
  }

  function updateProgress(current, total) {
    els.progress.style.display = 'block';
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    els.progressFill.style.width = pct + '%';
    els.progressCount.textContent = `${current}/${total}`;
    if (PANEL.startTime) {
      const elapsed = Math.round((Date.now() - PANEL.startTime) / 1000);
      const min = Math.floor(elapsed / 60);
      const sec = elapsed % 60;
      els.progressTime.textContent = min > 0 ? `${min}m ${sec}s` : `${sec}s`;
    }
  }

  // ========================================================================
  // INPUT RENDERING
  // ========================================================================

  function renderInputs() {
    const key = els.automation.value;
    const auto = AUTOMATIONS[key];
    if (!auto) return;

    els.desc.textContent = auto.description;
    els.inputs.innerHTML = '';

    for (const inp of auto.inputs) {
      const div = document.createElement('div');
      div.className = 'xa-input-group';

      if (inp.type === 'checkbox') {
        div.innerHTML = `
          <div class="xa-checkbox-row">
            <input type="checkbox" id="xa-inp-${inp.key}" ${inp.default ? 'checked' : ''}>
            <label for="xa-inp-${inp.key}">${inp.label}</label>
          </div>`;
      } else {
        div.innerHTML = `
          <label for="xa-inp-${inp.key}">${inp.label}</label>
          <input type="${inp.type}" id="xa-inp-${inp.key}" value="${inp.default}" placeholder="${inp.label}">`;
      }
      els.inputs.appendChild(div);
    }
  }

  function getInputValues() {
    const key = els.automation.value;
    const auto = AUTOMATIONS[key];
    const values = {};
    for (const inp of auto.inputs) {
      const el = $(`#xa-inp-${inp.key}`);
      if (!el) continue;
      if (inp.type === 'checkbox') {
        values[inp.key] = el.checked;
      } else if (inp.type === 'number') {
        values[inp.key] = parseInt(el.value) || inp.default;
      } else {
        values[inp.key] = el.value;
      }
    }
    values.timeLimit = parseInt(els.timeLimit.value) || 0;
    return values;
  }

  // ========================================================================
  // PAUSE / ABORT HELPERS
  // ========================================================================

  async function checkPauseAbort(signal) {
    if (signal?.aborted) throw new Error('Aborted');
    if (PANEL.status === 'paused') {
      panelLog('⏸ Paused — click Resume to continue', 'warning');
      await new Promise((resolve) => { PANEL.pauseResolve = resolve; });
      if (signal?.aborted) throw new Error('Aborted');
    }
  }

  function checkTimeLimit() {
    const limit = parseInt(els.timeLimit.value) || 0;
    if (limit > 0 && PANEL.startTime) {
      const elapsed = (Date.now() - PANEL.startTime) / 60000;
      if (elapsed >= limit) {
        panelLog(`⏰ Time limit reached (${limit}m)`, 'warning');
        return true;
      }
    }
    return false;
  }

  // ========================================================================
  // AUTOMATION RUNNERS
  // ========================================================================

  async function runLikeTimeline(config, signal) {
    const target = config.target?.replace(/^@/, '').trim();
    const limit = config.limit || 50;
    const keywords = config.keywords ? config.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) : [];
    const skipReplies = config.skipReplies !== false;
    const alsoRetweet = config.alsoRetweet || false;
    const minDelay = config.minDelay || 2000;
    const maxDelay = config.maxDelay || 5000;

    // Navigate to target
    if (target) {
      panelLog(`📍 Navigating to @${target}'s timeline...`, 'action');
      window.location.href = `https://x.com/${target}`;
      await sleep(3000);
      // Wait for timeline to load
      await waitForTimeline();
    }

    let liked = 0;
    let scrolls = 0;
    const maxScrolls = limit * 3; // generous scroll budget
    const processed = new Set();

    panelLog(`🚀 Like Timeline: ${keywords.length ? keywords.join(', ') : 'all posts'}, limit ${limit}`, 'info');

    while (liked < limit && scrolls < maxScrolls) {
      await checkPauseAbort(signal);
      if (checkTimeLimit()) break;

      const tweets = document.querySelectorAll(SELECTORS.tweet);
      for (const tweet of tweets) {
        if (liked >= limit) break;
        await checkPauseAbort(signal);
        if (checkTimeLimit()) break;

        const tweetId = getTweetId(tweet);
        if (tweetId && processed.has(tweetId)) continue;
        if (tweetId) processed.add(tweetId);

        // Already liked
        if (tweet.querySelector(SELECTORS.unlikeButton)) continue;
        // Skip replies
        if (skipReplies && tweet.textContent?.includes('Replying to')) continue;
        // Skip ads
        if (tweet.querySelector('[data-testid="placementTracking"]')) continue;

        // Keyword filter
        const text = tweet.querySelector(SELECTORS.tweetText)?.textContent || '';
        if (keywords.length > 0 && !keywords.some(kw => text.toLowerCase().includes(kw))) continue;

        // Like it
        const likeBtn = tweet.querySelector(SELECTORS.likeButton);
        if (likeBtn) {
          await clickElement(likeBtn);
          liked++;
          PANEL.actionCount++;
          PANEL.results.push({ type: 'like', tweetId, text: text.slice(0, 100), timestamp: new Date().toISOString() });
          rateLimit.increment('like', 'day');
          updateProgress(liked, limit);
          panelLog(`❤️ Liked #${liked}: "${text.slice(0, 50)}..."`, 'success');

          if (alsoRetweet) {
            await sleep(800);
            const rtBtn = tweet.querySelector(SELECTORS.retweetButton);
            if (rtBtn) {
              await clickElement(rtBtn);
              await sleep(500);
              const confirmRt = document.querySelector('[data-testid="retweetConfirm"]');
              if (confirmRt) await clickElement(confirmRt);
              panelLog('  ↳ Also retweeted', 'action');
            }
          }

          await randomDelay(minDelay, maxDelay);
        }
      }

      scrollBy(800);
      scrolls++;
      await randomDelay(1500, 2500);
    }

    panelLog(`✅ Done! Liked ${liked} tweets.`, 'success');
    return { liked, scrolls };
  }

  async function runFollowEngagers(config, signal) {
    const target = config.target?.replace(/^@/, '').trim();
    const limit = config.limit || 30;
    const bioKeywords = config.bioKeywords ? config.bioKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) : [];
    const minDelay = config.minDelay || 2000;
    const maxDelay = config.maxDelay || 5000;

    if (!target) { panelLog('❌ Target username required', 'error'); return { followed: 0 }; }

    panelLog(`📍 Navigating to @${target}'s followers...`, 'action');
    window.location.href = `https://x.com/${target}/followers`;
    await sleep(3000);
    await waitForTimeline();

    let followed = 0;
    let scrolls = 0;
    const processed = new Set();

    while (followed < limit && scrolls < limit * 3) {
      await checkPauseAbort(signal);
      if (checkTimeLimit()) break;

      const cells = document.querySelectorAll(SELECTORS.userCell);
      for (const cell of cells) {
        if (followed >= limit) break;
        await checkPauseAbort(signal);

        const user = window.XActions.Core.extractUserFromCell(cell);
        if (!user || !user.username || processed.has(user.username)) continue;
        processed.add(user.username);
        if (user.isFollowing) continue;

        // Bio filter
        if (bioKeywords.length > 0 && !bioKeywords.some(kw => (user.bio || '').toLowerCase().includes(kw))) continue;

        const followBtn = cell.querySelector(SELECTORS.followButton);
        if (followBtn) {
          await clickElement(followBtn);
          followed++;
          PANEL.actionCount++;
          PANEL.results.push({ type: 'follow', username: user.username, bio: user.bio, timestamp: new Date().toISOString() });
          rateLimit.increment('follow', 'day');
          updateProgress(followed, limit);
          panelLog(`👥 Followed #${followed}: @${user.username}`, 'success');
          await randomDelay(minDelay, maxDelay);
        }
      }

      scrollBy(600);
      scrolls++;
      await randomDelay(1500, 2500);
    }

    panelLog(`✅ Done! Followed ${followed} users.`, 'success');
    return { followed, scrolls };
  }

  async function runSmartUnfollow(config, signal) {
    const limit = config.limit || 50;
    const keepVerified = config.keepVerified !== false;
    const keepKeywords = config.keepKeywords ? config.keepKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) : [];
    const minDelay = config.minDelay || 2000;
    const maxDelay = config.maxDelay || 5000;

    // Get current username from page
    const myHandle = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]')?.getAttribute('href')?.replace('/', '') || '';

    if (!myHandle) {
      panelLog('📍 Navigating to your following list... (make sure you\'re logged in)', 'action');
    }

    const followingUrl = myHandle ? `https://x.com/${myHandle}/following` : 'https://x.com/following';
    window.location.href = followingUrl;
    await sleep(3000);
    await waitForTimeline();

    let unfollowed = 0;
    let scrolls = 0;
    const processed = new Set();

    while (unfollowed < limit && scrolls < limit * 3) {
      await checkPauseAbort(signal);
      if (checkTimeLimit()) break;

      const cells = document.querySelectorAll(SELECTORS.userCell);
      for (const cell of cells) {
        if (unfollowed >= limit) break;
        await checkPauseAbort(signal);

        const user = window.XActions.Core.extractUserFromCell(cell);
        if (!user || !user.username || processed.has(user.username)) continue;
        processed.add(user.username);

        // Skip if they follow you back
        if (user.followsYou) continue;
        // Keep verified
        if (keepVerified && user.isVerified) continue;
        // Keep keyword matches
        if (keepKeywords.length > 0 && keepKeywords.some(kw => (user.bio || '').toLowerCase().includes(kw))) continue;

        const unfollowBtn = cell.querySelector(SELECTORS.unfollowButton);
        if (unfollowBtn) {
          await clickElement(unfollowBtn);
          await sleep(500);
          const confirmBtn = document.querySelector(SELECTORS.confirmButton);
          if (confirmBtn) await clickElement(confirmBtn);
          unfollowed++;
          PANEL.actionCount++;
          PANEL.results.push({ type: 'unfollow', username: user.username, bio: user.bio, timestamp: new Date().toISOString() });
          updateProgress(unfollowed, limit);
          panelLog(`🚫 Unfollowed #${unfollowed}: @${user.username}`, 'success');
          await randomDelay(minDelay, maxDelay);
        }
      }

      scrollBy(600);
      scrolls++;
      await randomDelay(1500, 2500);
    }

    panelLog(`✅ Done! Unfollowed ${unfollowed} users.`, 'success');
    return { unfollowed, scrolls };
  }

  async function runScrapeFollowers(config, signal) {
    const target = config.target?.replace(/^@/, '').trim();
    const limit = config.limit || 200;

    if (!target) { panelLog('❌ Target username required', 'error'); return { collected: 0 }; }

    panelLog(`📍 Navigating to @${target}'s followers...`, 'action');
    window.location.href = `https://x.com/${target}/followers`;
    await sleep(3000);
    await waitForTimeline();

    const collected = [];
    let scrolls = 0;
    const seen = new Set();

    while (collected.length < limit && scrolls < limit * 2) {
      await checkPauseAbort(signal);
      if (checkTimeLimit()) break;

      const cells = document.querySelectorAll(SELECTORS.userCell);
      for (const cell of cells) {
        if (collected.length >= limit) break;
        const user = window.XActions.Core.extractUserFromCell(cell);
        if (!user || !user.username || seen.has(user.username)) continue;
        seen.add(user.username);
        collected.push(user);
        PANEL.results.push({ type: 'scrape', ...user, timestamp: new Date().toISOString() });
        updateProgress(collected.length, limit);
      }

      scrollBy(600);
      scrolls++;
      await randomDelay(1000, 2000);

      if (scrolls % 10 === 0) {
        panelLog(`📋 Collected ${collected.length}/${limit} followers...`, 'info');
      }
    }

    panelLog(`✅ Done! Scraped ${collected.length} followers.`, 'success');
    return { collected: collected.length, data: collected };
  }

  // ─── Algorithm Builder (panel-integrated) ───
  async function runAlgoBuilder(config, signal) {
    const keywords = (config.keywords || '').split(',').map(k => k.trim()).filter(Boolean);
    const persona = config.persona || 'a knowledgeable person on Twitter';
    const bioKw = (config.bioKeywords || '').split(',').map(k => k.trim()).filter(Boolean);
    const targets = (config.targetAccounts || '').split(',').map(k => k.trim().replace(/^@/, '')).filter(Boolean);
    const llmKey = config.llmApiKey || '';
    const sessionMin = config.sessionMinutes || 30;

    if (keywords.length === 0) { panelLog('❌ At least one keyword required', 'error'); return; }

    panelLog(`🧠 Algorithm Builder started — ${keywords.length} keywords, LLM ${llmKey ? '✅' : '❌'}`, 'action');

    const FALLBACK = [
      'Solid take', 'Been thinking about this', 'This is underrated',
      'Hard agree', 'More people need to see this', 'Facts',
      'Interesting perspective', 'Saving this', 'Real ones know',
    ];

    const llmComment = async (text) => {
      if (!llmKey) return null;
      if (Math.random() > 0.7) return null;
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${llmKey}` },
          body: JSON.stringify({
            model: 'google/gemini-flash-1.5',
            messages: [
              { role: 'system', content: `You are ${persona} on Twitter. Reply in 1-2 casual sentences. No hashtags. Be specific to the tweet.` },
              { role: 'user', content: `Reply to: "${text.substring(0, 500)}"` },
            ],
            max_tokens: 80, temperature: 0.9,
          }),
        });
        if (!res.ok) return null;
        const d = await res.json();
        return d.choices?.[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, '') || null;
      } catch { return null; }
    };

    const getComment = async (text) => (await llmComment(text)) || FALLBACK[Math.floor(Math.random() * FALLBACK.length)];

    const engageFeed = async (source) => {
      const maxScrolls = 8 + Math.floor(Math.random() * 8);
      const seen = new Set();
      let actions = 0;

      for (let s = 0; s < maxScrolls; s++) {
        await checkPauseAbort(signal);
        if (checkTimeLimit()) return actions;

        const tweets = document.querySelectorAll(SELECTORS.tweet);
        for (const tw of tweets) {
          await checkPauseAbort(signal);
          const tid = getTweetId(tw);
          if (!tid || seen.has(tid)) continue;
          seen.add(tid);

          const info = window.XActions.Core.extractTweetInfo(tw);
          if (!info?.text) continue;

          // Like (35% chance)
          if (Math.random() < 0.35 && !tw.querySelector('[data-testid="unlike"]')) {
            const btn = tw.querySelector(SELECTORS.likeButton);
            if (btn) {
              await randomDelay(500, 2000);
              await clickElement(btn);
              actions++;
              PANEL.actionCount++;
              PANEL.results.push({ type: 'like', tweet: tid, source, timestamp: new Date().toISOString() });
              panelLog(`❤️ Liked (${source})`, 'success');
              await randomDelay(2000, 5000);
            }
          }

          // Comment (8% chance)
          if (Math.random() < 0.08 && info.text.length > 20) {
            const comment = await getComment(info.text);
            const replyBtn = tw.querySelector(SELECTORS.replyButton);
            if (replyBtn && comment) {
              await clickElement(replyBtn);
              await sleep(1200);
              const input = await waitForElement('[data-testid="tweetTextarea_0"]', 5000);
              if (input) {
                input.focus();
                await sleep(300);
                for (const ch of comment) { document.execCommand('insertText', false, ch); await sleep(50 + Math.random() * 40); }
                await sleep(600);
                const post = await waitForElement('[data-testid="tweetButton"]', 3000);
                if (post) {
                  await clickElement(post);
                  await sleep(1200);
                  actions++;
                  PANEL.actionCount++;
                  PANEL.results.push({ type: 'comment', tweet: tid, comment, source, timestamp: new Date().toISOString() });
                  panelLog(`💬 "${comment.substring(0, 40)}..."`, 'success');
                }
              } else {
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
              }
              await randomDelay(3000, 6000);
            }
          }

          // Follow author (15% chance)
          if (Math.random() < 0.15) {
            const fBtn = tw.querySelector(SELECTORS.followButton);
            if (fBtn) {
              await randomDelay(500, 2000);
              await clickElement(fBtn);
              actions++;
              PANEL.actionCount++;
              panelLog(`➕ Followed (${source})`, 'success');
              await randomDelay(2000, 5000);
            }
          }
        }

        scrollBy(300 + Math.floor(Math.random() * 500));
        await randomDelay(1500, 4000);
        if (Math.random() < 0.15) await sleep(5000 + Math.random() * 7000); // reading pause
      }
      return actions;
    };

    // ─── Main cycle loop ───
    const sessionEnd = Date.now() + sessionMin * 60 * 1000;
    let kwIdx = 0;
    let tgtIdx = 0;
    let totalActions = 0;
    const cycles = ['search', 'home', 'target', 'explore', 'people', 'profile'];
    let cycleIdx = 0;

    while (Date.now() < sessionEnd) {
      await checkPauseAbort(signal);
      if (checkTimeLimit()) break;

      const cycle = cycles[cycleIdx % cycles.length];
      cycleIdx++;

      try {
        if (cycle === 'search') {
          const kw = keywords[kwIdx % keywords.length]; kwIdx++;
          panelLog(`🔍 Searching: "${kw}"`, 'action');
          window.location.href = `https://x.com/search?q=${encodeURIComponent(kw)}&src=typed_query&f=top`;
          await sleep(3000); await waitForTimeline();
          totalActions += await engageFeed('search-top');

          await checkPauseAbort(signal);
          window.location.href = `https://x.com/search?q=${encodeURIComponent(kw)}&src=typed_query&f=live`;
          await sleep(3000); await waitForTimeline();
          totalActions += await engageFeed('search-latest');

        } else if (cycle === 'home') {
          panelLog('🏠 Browsing home feed', 'action');
          window.location.href = 'https://x.com/home';
          await sleep(3000); await waitForTimeline();
          totalActions += await engageFeed('home');

        } else if (cycle === 'target' && targets.length > 0) {
          const t = targets[tgtIdx % targets.length]; tgtIdx++;
          panelLog(`🎯 Visiting @${t}`, 'action');
          window.location.href = `https://x.com/${t}`;
          await sleep(3000); await waitForTimeline();
          totalActions += await engageFeed('target');

        } else if (cycle === 'explore') {
          panelLog('🌍 Browsing Explore', 'action');
          window.location.href = 'https://x.com/explore';
          await sleep(3000);
          for (let i = 0; i < 5; i++) { scrollBy(400 + Math.random() * 300); await randomDelay(1500, 3000); }

        } else if (cycle === 'people') {
          const kw = keywords[Math.floor(Math.random() * keywords.length)];
          panelLog(`👥 Searching people: "${kw}"`, 'action');
          window.location.href = `https://x.com/search?q=${encodeURIComponent(kw)}&f=user`;
          await sleep(3000); await waitForTimeline();
          const cells = document.querySelectorAll(SELECTORS.userCell);
          let pFollows = 0;
          for (const cell of cells) {
            if (pFollows >= 5) break;
            const user = window.XActions.Core.extractUserFromCell(cell);
            if (!user?.username || user.isFollowing) continue;
            if (bioKw.length > 0 && user.bio) {
              const bl = user.bio.toLowerCase();
              if (!bioKw.some(k => bl.includes(k.toLowerCase()))) continue;
            }
            const fb = cell.querySelector(SELECTORS.followButton);
            if (fb) {
              await randomDelay(1000, 3000);
              await clickElement(fb);
              pFollows++; totalActions++;
              PANEL.actionCount++;
              panelLog(`➕ Followed @${user.username}`, 'success');
            }
          }

        } else if (cycle === 'profile') {
          panelLog('👤 Visiting own profile', 'action');
          const pLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
          if (pLink) { await clickElement(pLink); await sleep(3000); }
          for (let i = 0; i < 3; i++) { scrollBy(400); await randomDelay(1000, 2000); }
        }
      } catch (err) {
        panelLog(`⚠️ ${err.message}`, 'warning');
      }

      // Inter-cycle pause
      await randomDelay(3000, 8000);
      updateProgress(Math.min(cycleIdx, cycles.length * 3), cycles.length * 3);
    }

    panelLog(`✅ Algorithm Builder done! ${totalActions} actions across ${cycleIdx} cycles`, 'success');
    return { totalActions, cycles: cycleIdx };
  }

  // ========================================================================
  // HELPERS
  // ========================================================================

  function getTweetId(tweet) {
    const link = tweet.querySelector('a[href*="/status/"]');
    if (link) {
      const m = link.href.match(/status\/(\d+)/);
      return m ? m[1] : null;
    }
    return null;
  }

  async function waitForTimeline() {
    for (let i = 0; i < 30; i++) {
      if (document.querySelector(SELECTORS.tweet) || document.querySelector(SELECTORS.userCell)) return;
      await sleep(500);
    }
    panelLog('⚠️ Timeline took too long to load', 'warning');
  }

  // ========================================================================
  // RUN SINGLE TASK
  // ========================================================================

  async function runTask(autoKey, config) {
    const auto = AUTOMATIONS[autoKey];
    if (!auto) { panelLog(`❌ Unknown automation: ${autoKey}`, 'error'); return; }

    const controller = new AbortController();
    PANEL.abortController = controller;
    PANEL.startTime = Date.now();
    PANEL.actionCount = 0;
    setStatus('running', `Running: ${auto.label}`);
    updateProgress(0, config.limit || 50);
    panelLog(`▶ Starting ${auto.label}`, 'action');

    try {
      await auto.run(config, controller.signal);
      if (PANEL.status !== 'idle') setStatus('done', `Done — ${PANEL.actionCount} actions`);
    } catch (err) {
      if (err.message === 'Aborted') {
        panelLog('⏹ Stopped by user', 'warning');
        setStatus('idle', 'Stopped');
      } else {
        panelLog(`❌ Error: ${err.message}`, 'error');
        setStatus('error', `Error: ${err.message.slice(0, 40)}`);
      }
    } finally {
      PANEL.abortController = null;
      els.progress.style.display = 'none';
    }
  }

  // ========================================================================
  // QUEUE RUNNER
  // ========================================================================

  async function runQueue() {
    if (TASK_QUEUE.length === 0) return;
    panelLog(`📋 Running queue: ${TASK_QUEUE.length} task(s)`, 'action');

    for (let i = 0; i < TASK_QUEUE.length; i++) {
      PANEL.taskIndex = i;
      renderQueue(); // highlight current
      const task = TASK_QUEUE[i];

      await runTask(task.autoKey, task.config);

      task.status = 'done';
      renderQueue();

      // If stopped, don't continue
      if (PANEL.status === 'idle' || PANEL.status === 'error') break;

      // Brief pause between tasks
      if (i < TASK_QUEUE.length - 1) {
        panelLog('⏳ Pausing 3s between tasks...', 'info');
        await sleep(3000);
      }
    }

    panelLog(`🏁 Queue finished!`, 'success');
    setStatus('done', `Queue done — ${PANEL.actionCount} total actions`);
  }

  // ========================================================================
  // QUEUE RENDERING
  // ========================================================================

  function renderQueue() {
    if (TASK_QUEUE.length === 0) {
      els.queueList.innerHTML = '';
      els.queueEmpty.style.display = 'block';
      els.runQueueBtn.disabled = true;
      return;
    }
    els.queueEmpty.style.display = 'none';
    els.runQueueBtn.disabled = false;
    els.queueList.innerHTML = TASK_QUEUE.map((task, i) => {
      const auto = AUTOMATIONS[task.autoKey];
      const cls = task.status === 'done' ? 'done' : (i === PANEL.taskIndex && PANEL.status === 'running' ? 'active' : '');
      const target = task.config.target ? `@${task.config.target.replace(/^@/,'')}` : '';
      const detail = [target, task.config.limit ? `${task.config.limit} max` : ''].filter(Boolean).join(' · ');
      return `<div class="xa-queue-item ${cls}">
        <div class="xa-queue-num">${i + 1}</div>
        <div class="xa-queue-name">${auto?.label || task.autoKey} ${detail ? `<span style="color:#71767b">— ${detail}</span>` : ''}</div>
        <button class="xa-queue-remove" data-idx="${i}" title="Remove">✕</button>
      </div>`;
    }).join('');

    els.queueList.querySelectorAll('.xa-queue-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        TASK_QUEUE.splice(parseInt(btn.dataset.idx), 1);
        renderQueue();
      });
    });
  }

  // ========================================================================
  // EXPORT / SHARE
  // ========================================================================

  function exportResults(format = 'json') {
    if (PANEL.results.length === 0) {
      panelLog('Nothing to export yet', 'warning');
      return;
    }

    let content, mime, ext;
    if (format === 'csv') {
      const headers = Object.keys(PANEL.results[0]);
      const rows = PANEL.results.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','));
      content = [headers.join(','), ...rows].join('\n');
      mime = 'text/csv';
      ext = 'csv';
    } else {
      content = JSON.stringify(PANEL.results, null, 2);
      mime = 'application/json';
      ext = 'json';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xactions_export_${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    panelLog(`📤 Exported ${PANEL.results.length} results as ${ext.toUpperCase()}`, 'success');
  }

  function shareConfig() {
    const autoKey = els.automation.value;
    const config = getInputValues();
    const shareData = {
      version: 1,
      automation: autoKey,
      config,
      queue: TASK_QUEUE.map(t => ({ autoKey: t.autoKey, config: t.config })),
    };

    const json = JSON.stringify(shareData, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      panelLog('🔗 Config copied to clipboard! Share it with others.', 'success');
    }).catch(() => {
      // Fallback
      prompt('Copy this config:', json);
    });
  }

  // ========================================================================
  // EVENT HANDLERS
  // ========================================================================

  // Tabs
  $$('.xa-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.xa-tab').forEach(t => t.classList.remove('active'));
      $$('.xa-tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      $(`#xa-tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Automation selector
  els.automation.addEventListener('change', renderInputs);

  // Start
  els.startBtn.addEventListener('click', () => {
    const autoKey = els.automation.value;
    const config = getInputValues();
    PANEL.results = [];
    runTask(autoKey, config);
  });

  // Pause / Resume
  els.pauseBtn.addEventListener('click', () => {
    if (PANEL.status === 'running') {
      setStatus('paused', 'Paused');
    } else if (PANEL.status === 'paused') {
      setStatus('running', 'Resuming...');
      if (PANEL.pauseResolve) {
        PANEL.pauseResolve();
        PANEL.pauseResolve = null;
      }
    }
  });

  // Stop
  els.stopBtn.addEventListener('click', () => {
    if (PANEL.abortController) PANEL.abortController.abort();
    if (PANEL.pauseResolve) { PANEL.pauseResolve(); PANEL.pauseResolve = null; }
    setStatus('idle', 'Stopped');
  });

  // Add to queue
  els.addQueueBtn.addEventListener('click', () => {
    const autoKey = els.automation.value;
    const config = getInputValues();
    TASK_QUEUE.push({ autoKey, config, status: 'pending' });
    renderQueue();
    panelLog(`＋ Added "${AUTOMATIONS[autoKey].label}" to queue`, 'info');
    // Flash queue tab
    const queueTab = $$('.xa-tab')[1];
    queueTab.style.color = '#1d9bf0';
    setTimeout(() => { queueTab.style.color = ''; }, 1000);
  });

  // Run queue
  els.runQueueBtn.addEventListener('click', () => {
    PANEL.results = [];
    PANEL.taskIndex = 0;
    TASK_QUEUE.forEach(t => t.status = 'pending');
    runQueue();
  });

  // Clear queue
  els.clearQueueBtn.addEventListener('click', () => {
    TASK_QUEUE.length = 0;
    renderQueue();
  });

  // Export
  els.exportBtn.addEventListener('click', () => {
    if (PANEL.results.length === 0) {
      panelLog('Nothing to export', 'warning');
      return;
    }
    // Quick format selection
    const format = confirm('Export as CSV?\n\nOK = CSV, Cancel = JSON') ? 'csv' : 'json';
    exportResults(format);
  });

  // Share
  els.shareBtn.addEventListener('click', shareConfig);

  // Clear log
  els.clearLogBtn.addEventListener('click', () => {
    PANEL.logs = [];
    els.logEl.innerHTML = '';
  });

  // Export log
  els.exportLogBtn.addEventListener('click', () => {
    const content = PANEL.logs.map(l => `[${l.time}] [${l.type}] ${l.msg}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xactions_log_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Minimize
  $('#xa-minimize').addEventListener('click', () => {
    panel.classList.toggle('xa-minimize');
    $('#xa-minimize').textContent = panel.classList.contains('xa-minimize') ? '□' : '─';
  });

  // Close
  $('#xa-close-panel').addEventListener('click', () => {
    if (PANEL.abortController) PANEL.abortController.abort();
    if (PANEL.pauseResolve) { PANEL.pauseResolve(); PANEL.pauseResolve = null; }
    panel.remove();
    style.remove();
    delete window.XActions.Panel;
    panelLog('Panel closed', 'info');
  });

  // ========================================================================
  // INITIAL RENDER
  // ========================================================================

  renderInputs();
  renderQueue();

  // Expose to namespace
  window.XActions.Panel = {
    PANEL,
    TASK_QUEUE,
    AUTOMATIONS,
    addTask: (autoKey, config) => {
      TASK_QUEUE.push({ autoKey, config, status: 'pending' });
      renderQueue();
    },
    runQueue,
    exportResults,
    shareConfig,
    close: () => { $('#xa-close-panel').click(); },
  };

  panelLog('⚡ XActions Panel ready!', 'success');
  console.log('⚡ XActions Panel injected. Use window.XActions.Panel to control programmatically.');
  console.log('');
  console.log('QUICK START:');
  console.log('  1. Pick an automation from the dropdown');
  console.log('  2. Configure keywords, targets, limits');
  console.log('  3. Click Start — or Add to Queue for multi-target runs');
  console.log('');
  console.log('MULTI-TARGET EXAMPLE (programmatic):');
  console.log('  XActions.Panel.addTask("like-timeline", { target: "nichxbt", limit: 500, keywords: "" });');
  console.log('  XActions.Panel.addTask("like-timeline", { target: "doi", limit: 500, keywords: "" });');
  console.log('  XActions.Panel.runQueue();');

})();

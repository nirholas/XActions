/**
 * ============================================================
 * 🛠️ XActions Core Utilities
 * ============================================================
 * 
 * Shared infrastructure for all XActions browser console scripts.
 * Paste this FIRST before running any XActions script, OR scripts
 * that include these utilities inline will work standalone.
 * 
 * This module provides:
 * - Rate-limit detection & exponential backoff
 * - Selector fallback chains (survives X DOM updates)
 * - Pause/resume/abort controls
 * - Progress tracking with ETA
 * - Human-like delays with jitter
 * - localStorage state persistence with versioning
 * - JSON/CSV export with auto-download
 * - Error classification & recovery
 * - Session statistics
 * - Dry-run mode infrastructure
 * 
 * @author nichxbt (https://x.com/nichxbt)
 * @version 2.0.0
 * @date 2026-02-24
 * @repository https://github.com/nirholas/XActions
 * @license MIT
 */

window.XActionsUtils = (() => {
  'use strict';

  // ==========================================================================
  // Constants
  // ==========================================================================

  const VERSION = '2.0.0';
  const STORAGE_PREFIX = 'xactions_';

  // ==========================================================================
  // Selector Fallback Chains
  // ==========================================================================
  // When X updates their DOM, only ONE selector in the chain needs to work.
  // We try each in order and return the first match.

  const SELECTORS = {
    tweet:          ['article[data-testid="tweet"]', 'article[role="article"]', '[data-testid="cellInnerDiv"] article'],
    tweetText:      ['[data-testid="tweetText"]', '[lang][dir] span', 'article span[dir="auto"]'],
    like:           ['[data-testid="like"]', 'button[aria-label*="Like"]', '[role="button"][data-testid*="like"]'],
    unlike:         ['[data-testid="unlike"]', 'button[aria-label*="Liked"]'],
    retweet:        ['[data-testid="retweet"]', 'button[aria-label*="Repost"]'],
    unretweet:      ['[data-testid="unretweet"]', 'button[aria-label*="Undo repost"]'],
    retweetConfirm: ['[data-testid="retweetConfirm"]', '[data-testid="unretweetConfirm"]', '[role="menuitem"]'],
    reply:          ['[data-testid="reply"]', 'button[aria-label*="Reply"]'],
    bookmark:       ['[data-testid="bookmark"]', 'button[aria-label*="Bookmark"]'],
    unbookmark:     ['[data-testid="removeBookmark"]', 'button[aria-label*="Remove Bookmark"]'],
    share:          ['[data-testid="share"]', 'button[aria-label*="Share"]'],
    caret:          ['[data-testid="caret"]', 'button[aria-label="More"]', '[data-testid="tweet"] button:last-of-type'],
    follow:         ['[data-testid$="-follow"]', 'button[aria-label*="Follow @"]'],
    unfollow:       ['[data-testid$="-unfollow"]', 'button[aria-label*="Following @"]'],
    confirmBtn:     ['[data-testid="confirmationSheetConfirm"]', 'button[data-testid="confirmationSheetConfirm"]', '[role="alertdialog"] button:nth-child(1)'],
    cancelBtn:      ['[data-testid="confirmationSheetCancel"]', '[role="alertdialog"] button:last-child'],
    backBtn:        ['[data-testid="app-bar-back"]', 'button[aria-label="Back"]'],
    userCell:       ['[data-testid="UserCell"]', '[data-testid="user"]', 'div[role="listitem"]'],
    userName:       ['[data-testid="User-Name"]', '[data-testid="UserCell"] a[href^="/"]'],
    followIndicator:['[data-testid="userFollowIndicator"]', 'span:has-text("Follows you")'],
    tweetBox:       ['[data-testid="tweetTextarea_0"]', '[role="textbox"][data-testid]', 'div[contenteditable="true"][role="textbox"]'],
    tweetButton:    ['[data-testid="tweetButtonInline"]', '[data-testid="tweetButton"]', 'button[data-testid*="tweet"]'],
    muteLink:       ['[data-testid="muteLink"]', '[role="menuitem"] span:has-text("Mute")'],
    blockLink:      ['[data-testid="block"]', '[role="menuitem"] span:has-text("Block")'],
    reportLink:     ['[role="menuitem"] span:has-text("Report")'],
    trend:          ['[data-testid="trend"]', '[data-testid="trendItem"]'],
    notification:   ['[data-testid="notification"]', 'article[data-testid="tweet"]'],
    dmCompose:      ['[data-testid="dmComposerTextInput"]', '[role="textbox"][data-testid*="dm"]'],
    dmSend:         ['[data-testid="dmComposerSendButton"]', 'button[data-testid*="send"]'],
  };

  /**
   * Query with fallback chain.
   * Tries each selector in order; returns first match or null.
   */
  function $(selectorKey, root = document) {
    const chain = SELECTORS[selectorKey] || [selectorKey];
    for (const sel of chain) {
      try {
        const el = root.querySelector(sel);
        if (el) return el;
      } catch { /* invalid selector, skip */ }
    }
    return null;
  }

  /**
   * QueryAll with fallback chain — aggregates matches from all selectors,
   * deduplicates by DOM identity.
   */
  function $$(selectorKey, root = document) {
    const chain = SELECTORS[selectorKey] || [selectorKey];
    const seen = new Set();
    const results = [];
    for (const sel of chain) {
      try {
        root.querySelectorAll(sel).forEach(el => {
          if (!seen.has(el)) {
            seen.add(el);
            results.push(el);
          }
        });
      } catch { /* skip */ }
    }
    return results;
  }

  // ==========================================================================
  // Timing — Human-Like Delays
  // ==========================================================================

  /**
   * Sleep with jitter. Real humans don't operate at exact intervals.
   */
  function sleep(ms) {
    const jitter = ms * 0.2 * (Math.random() - 0.5); // ±10%
    return new Promise(r => setTimeout(r, Math.max(50, ms + jitter)));
  }

  /**
   * Random delay between min and max, with Gaussian-like distribution
   * (sum of two uniforms approximates normal — more natural than flat uniform).
   */
  function randomDelay(min = 1000, max = 3000) {
    const mid = (min + max) / 2;
    const spread = (max - min) / 2;
    const gaussApprox = (Math.random() + Math.random()) / 2; // [0,1] centered ~0.5
    const delay = mid + spread * (gaussApprox - 0.5) * 2;
    return sleep(Math.max(min, Math.min(max, delay)));
  }

  // ==========================================================================
  // Rate-Limit Detection & Backoff
  // ==========================================================================

  const rateLimitState = {
    consecutiveFailures: 0,
    lastActionTime: 0,
    backoffMs: 0,
    totalPauses: 0,
  };

  /**
   * Detect if X is rate-limiting us.
   * Checks for: error toasts, disabled buttons, HTTP 429 spinners, "try again" messages.
   */
  function isRateLimited() {
    const indicators = [
      '[data-testid="toast"]',
      '[role="alert"]',
    ];
    for (const sel of indicators) {
      const el = document.querySelector(sel);
      if (el) {
        const text = el.textContent.toLowerCase();
        if (text.includes('rate limit') || text.includes('try again') ||
            text.includes('something went wrong') || text.includes('too many') ||
            text.includes('limit') || text.includes('slow down')) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Exponential backoff with jitter.
   * Call this after every action. If rate-limited, waits longer and longer.
   * Resets after successful actions.
   */
  async function backoff(actionSucceeded) {
    if (actionSucceeded) {
      rateLimitState.consecutiveFailures = 0;
      rateLimitState.backoffMs = 0;
      return;
    }

    rateLimitState.consecutiveFailures++;
    rateLimitState.totalPauses++;

    // Exponential: 5s, 10s, 20s, 40s, 80s, capped at 120s
    const base = 5000;
    const exp = Math.min(rateLimitState.consecutiveFailures, 5);
    rateLimitState.backoffMs = base * Math.pow(2, exp - 1);
    const jitter = rateLimitState.backoffMs * 0.3 * Math.random();
    const waitMs = rateLimitState.backoffMs + jitter;

    console.warn(
      `⏳ Rate limit detected — backing off for ${(waitMs / 1000).toFixed(0)}s ` +
      `(attempt #${rateLimitState.consecutiveFailures})`
    );
    await sleep(waitMs);
  }

  // ==========================================================================
  // Progress Tracker
  // ==========================================================================

  class ProgressTracker {
    constructor(taskName, total = null) {
      this.taskName = taskName;
      this.total = total;
      this.completed = 0;
      this.failed = 0;
      this.skipped = 0;
      this.startTime = Date.now();
      this.lastLogTime = 0;
      this.logInterval = 5000; // Don't spam console — max once per 5s
    }

    tick(status = 'completed') {
      if (status === 'completed') this.completed++;
      else if (status === 'failed') this.failed++;
      else if (status === 'skipped') this.skipped++;
      this._maybeLog();
    }

    get processed() {
      return this.completed + this.failed + this.skipped;
    }

    get elapsedMs() {
      return Date.now() - this.startTime;
    }

    get etaMs() {
      if (this.processed === 0 || !this.total) return null;
      const rate = this.processed / this.elapsedMs;
      const remaining = this.total - this.processed;
      return remaining / rate;
    }

    _formatTime(ms) {
      if (!ms || ms < 0) return '??';
      const s = Math.floor(ms / 1000);
      if (s < 60) return `${s}s`;
      if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
      return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    }

    _maybeLog() {
      const now = Date.now();
      if (now - this.lastLogTime < this.logInterval) return;
      this.lastLogTime = now;
      this.log();
    }

    log() {
      const pct = this.total ? ((this.processed / this.total) * 100).toFixed(1) : '?';
      const eta = this._formatTime(this.etaMs);
      const elapsed = this._formatTime(this.elapsedMs);
      const parts = [
        `📊 ${this.taskName}:`,
        `${this.completed} done`,
      ];
      if (this.failed > 0) parts.push(`${this.failed} failed`);
      if (this.skipped > 0) parts.push(`${this.skipped} skipped`);
      if (this.total) parts.push(`${this.processed}/${this.total} (${pct}%)`);
      parts.push(`⏱️ ${elapsed}`);
      if (this.total && this.etaMs) parts.push(`ETA: ${eta}`);
      console.log(parts.join(' | '));
    }

    summary() {
      const elapsed = this._formatTime(this.elapsedMs);
      return {
        task: this.taskName,
        completed: this.completed,
        failed: this.failed,
        skipped: this.skipped,
        total: this.processed,
        elapsed,
        ratePerMinute: this.elapsedMs > 0
          ? ((this.completed / this.elapsedMs) * 60000).toFixed(1)
          : 0,
      };
    }
  }

  // ==========================================================================
  // Pause / Resume / Abort Controls
  // ==========================================================================

  let _paused = false;
  let _aborted = false;

  function pause() {
    _paused = true;
    console.log('⏸️  PAUSED — call XActionsUtils.resume() to continue');
  }

  function resume() {
    _paused = false;
    console.log('▶️  RESUMED');
  }

  function abort() {
    _aborted = true;
    _paused = false;
    console.log('🛑 ABORTED — script will stop after current action');
  }

  function reset() {
    _paused = false;
    _aborted = false;
    rateLimitState.consecutiveFailures = 0;
    rateLimitState.backoffMs = 0;
  }

  /**
   * Check if script should continue. Call this in every loop iteration.
   * Handles pause state by waiting, and abort by returning false.
   */
  async function shouldContinue() {
    if (_aborted) return false;
    while (_paused) {
      await sleep(1000);
      if (_aborted) return false;
    }
    // Check for rate limiting
    if (isRateLimited()) {
      await backoff(false);
    }
    return true;
  }

  // ==========================================================================
  // State Persistence (localStorage)
  // ==========================================================================

  /**
   * Save state to localStorage with timestamp and version.
   */
  function saveState(key, data) {
    try {
      const wrapped = {
        _v: VERSION,
        _ts: new Date().toISOString(),
        data,
      };
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(wrapped));
      return true;
    } catch (e) {
      console.warn(`⚠️ Failed to save state "${key}":`, e.message);
      return false;
    }
  }

  /**
   * Load state from localStorage.
   */
  function loadState(key, defaultValue = null) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return defaultValue;
      const parsed = JSON.parse(raw);
      return parsed.data !== undefined ? parsed.data : parsed;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Remove state.
   */
  function clearState(key) {
    localStorage.removeItem(STORAGE_PREFIX + key);
  }

  /**
   * Track processed item IDs to avoid re-processing.
   */
  function createProcessedTracker(key) {
    const storageKey = `processed_${key}`;
    const set = new Set(loadState(storageKey, []));

    return {
      has(id)   { return set.has(id); },
      add(id)   { set.add(id); saveState(storageKey, [...set]); },
      size()    { return set.size; },
      clear()   { set.clear(); clearState(storageKey); },
      toArray() { return [...set]; },
    };
  }

  // ==========================================================================
  // Export / Download
  // ==========================================================================

  /**
   * Auto-download data as a file (JSON or CSV).
   */
  function download(data, filename, format = 'json') {
    let blob;
    if (format === 'csv' && Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      const rows = [
        headers.join(','),
        ...data.map(row =>
          headers.map(h => {
            const val = row[h];
            if (val === null || val === undefined) return '';
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(',')
        ),
      ];
      blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    } else {
      blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      if (!filename.endsWith('.json')) filename += '.json';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`📥 Downloaded: ${filename}`);
  }

  // ==========================================================================
  // Count Parsing (1.2K → 1200, 3.5M → 3500000)
  // ==========================================================================

  function parseCount(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    str = str.replace(/,/g, '').trim();
    const match = str.match(/([\d.]+)\s*([KMBkmb])?/);
    if (!match) return 0;
    let num = parseFloat(match[1]);
    if (match[2]) {
      const multipliers = { k: 1e3, m: 1e6, b: 1e9 };
      num *= multipliers[match[2].toLowerCase()] || 1;
    }
    return Math.round(num);
  }

  /**
   * Format number in short form (1200 → 1.2K).
   */
  function formatCount(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return String(Math.round(n));
  }

  // ==========================================================================
  // DOM Helpers
  // ==========================================================================

  /**
   * Wait for an element to appear (up to timeout ms). Returns element or null.
   */
  async function waitFor(selectorKey, timeoutMs = 10000, root = document) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = $(selectorKey, root);
      if (el) return el;
      await sleep(250);
    }
    return null;
  }

  /**
   * Scroll to bottom and wait for new content.
   */
  async function scrollAndWait(delayMs = 1500) {
    const prevHeight = document.body.scrollHeight;
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    await sleep(delayMs);
    return document.body.scrollHeight > prevHeight;
  }

  /**
   * Extract username from a user cell or link element.
   */
  function extractUsername(el) {
    if (!el) return null;
    const link = el.querySelector('a[href^="/"]') || el.closest('a[href^="/"]');
    if (!link) return null;
    const href = link.getAttribute('href') || '';
    const match = href.match(/^\/([A-Za-z0-9_]+)/);
    return match ? match[1] : null;
  }

  /**
   * Safely click an element with retry.
   */
  async function safeClick(el, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        if (!el || !el.isConnected) return false;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        await sleep(200);
        el.click();
        return true;
      } catch (e) {
        if (i === retries - 1) return false;
        await sleep(500);
      }
    }
    return false;
  }

  /**
   * Safely type into an input/contenteditable with realistic keystroke delays.
   */
  async function safeType(el, text) {
    if (!el) return false;
    el.focus();
    await sleep(200);

    // Clear existing content
    document.execCommand('selectAll', false, null);
    await sleep(100);
    document.execCommand('delete', false, null);
    await sleep(100);

    // Type character by character for contenteditable
    if (el.getAttribute('contenteditable') === 'true' || el.role === 'textbox') {
      for (const char of text) {
        document.execCommand('insertText', false, char);
        await sleep(30 + Math.random() * 50); // 30-80ms per character
      }
    } else {
      // Regular input
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    await sleep(200);
    return true;
  }

  // ==========================================================================
  // Logging — Box-Drawn Headers
  // ==========================================================================

  function logHeader(title, subtitle = '') {
    const width = 60;
    console.log('╔' + '═'.repeat(width) + '╗');
    console.log('║  ' + title.padEnd(width - 2) + '║');
    if (subtitle) {
      console.log('║  ' + subtitle.padEnd(width - 2) + '║');
    }
    console.log('║  ' + `by nichxbt — v${VERSION}`.padEnd(width - 2) + '║');
    console.log('╚' + '═'.repeat(width) + '╝');
  }

  function logSection(title) {
    console.log('\n' + '━'.repeat(60));
    console.log(`  ${title}`);
    console.log('━'.repeat(60));
  }

  function logSummary(stats) {
    logSection('📊 SUMMARY');
    for (const [key, val] of Object.entries(stats)) {
      console.log(`  ${key}: ${val}`);
    }
    console.log('━'.repeat(60) + '\n');
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validate that user is on the correct page.
   */
  function requirePage(pathPattern, message) {
    const url = window.location.href;
    const patterns = Array.isArray(pathPattern) ? pathPattern : [pathPattern];
    const match = patterns.some(p => {
      if (typeof p === 'string') return url.includes(p);
      if (p instanceof RegExp) return p.test(url);
      return false;
    });
    if (!match) {
      console.error(`❌ Wrong page! ${message || ''}`);
      console.log(`📍 Current: ${url}`);
      console.log(`📍 Expected: ${patterns.join(' or ')}`);
      return false;
    }
    return true;
  }

  /**
   * Validate CONFIG has required fields.
   */
  function validateConfig(config, schema) {
    const errors = [];
    for (const [key, rules] of Object.entries(schema)) {
      const value = config[key];
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`Missing required field: ${key}`);
        continue;
      }
      if (value !== undefined && rules.type && typeof value !== rules.type) {
        errors.push(`${key} must be ${rules.type}, got ${typeof value}`);
      }
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${key} must be >= ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${key} must be <= ${rules.max}`);
      }
    }
    if (errors.length > 0) {
      console.error('❌ CONFIG validation failed:');
      errors.forEach(e => console.error(`   • ${e}`));
      return false;
    }
    return true;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  return {
    VERSION,
    SELECTORS,

    // Selectors
    $, $$,

    // Timing
    sleep, randomDelay,

    // Rate limiting
    isRateLimited, backoff,
    getRateLimitState: () => ({ ...rateLimitState }),

    // Progress
    ProgressTracker,

    // Controls
    pause, resume, abort, reset, shouldContinue,
    isPaused: () => _paused,
    isAborted: () => _aborted,

    // State
    saveState, loadState, clearState, createProcessedTracker,

    // Export
    download,

    // Parsing
    parseCount, formatCount,

    // DOM
    waitFor, scrollAndWait, extractUsername, safeClick, safeType,

    // Logging
    logHeader, logSection, logSummary,

    // Validation
    requirePage, validateConfig,
  };
})();

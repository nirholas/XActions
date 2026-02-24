// XActions Automation Framework - Core Utilities
// https://github.com/nirholas/XActions
//
// This is the foundation module. Paste this FIRST, then paste any automation script.
// All automations depend on this core module.

window.XActions = window.XActions || {};

window.XActions.Core = (() => {
  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    // Timing (in milliseconds)
    DELAY_SHORT: 500,
    DELAY_MEDIUM: 1500,
    DELAY_LONG: 3000,
    DELAY_BETWEEN_ACTIONS: 2000,
    
    // Limits (to avoid rate limiting)
    MAX_ACTIONS_PER_HOUR: 50,
    MAX_FOLLOWS_PER_DAY: 100,
    MAX_LIKES_PER_DAY: 200,
    
    // Storage keys prefix
    STORAGE_PREFIX: 'xactions_',
    
    // Debug mode
    DEBUG: true,
  };

  // ============================================
  // SELECTORS (X/Twitter DOM elements)
  // ============================================
  const SELECTORS = {
    // Buttons
    followButton: '[data-testid$="-follow"]',
    unfollowButton: '[data-testid$="-unfollow"]',
    likeButton: '[data-testid="like"]',
    unlikeButton: '[data-testid="unlike"]',
    retweetButton: '[data-testid="retweet"]',
    replyButton: '[data-testid="reply"]',
    confirmButton: '[data-testid="confirmationSheetConfirm"]',
    
    // Tweet elements
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    tweetLink: 'a[href*="/status/"]',
    
    // User elements
    userCell: '[data-testid="UserCell"]',
    userAvatar: '[data-testid="UserAvatar-Container"]',
    userName: '[data-testid="User-Name"]',
    userFollowIndicator: '[data-testid="userFollowIndicator"]',
    userDescription: '[data-testid="UserDescription"]',
    userLink: 'a[href^="/"]',
    verifiedBadge: '[data-testid="icon-verified"]',
    protectedIcon: '[data-testid="icon-lock"]',
    
    // Input elements
    tweetInput: '[data-testid="tweetTextarea_0"]',
    searchInput: '[data-testid="SearchBox_Search_Input"]',
    
    // Navigation
    primaryColumn: '[data-testid="primaryColumn"]',
    timeline: 'section[role="region"]',
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  
  const randomDelay = (min, max) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return sleep(delay);
  };

  const log = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: '📘',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      action: '🔧',
    }[type] || '📘';
    
    if (CONFIG.DEBUG || type === 'error') {
      console.log(`${prefix} [${timestamp}] ${message}`);
    }
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollBy = (pixels) => {
    window.scrollBy({ top: pixels, behavior: 'smooth' });
  };

  // ============================================
  // STORAGE FUNCTIONS
  // ============================================
  
  const storage = {
    get: (key) => {
      try {
        const data = localStorage.getItem(CONFIG.STORAGE_PREFIX + key);
        return data ? JSON.parse(data) : null;
      } catch (e) {
        log(`Storage get error: ${e.message}`, 'error');
        return null;
      }
    },
    
    set: (key, value) => {
      try {
        localStorage.setItem(CONFIG.STORAGE_PREFIX + key, JSON.stringify(value));
        return true;
      } catch (e) {
        log(`Storage set error: ${e.message}`, 'error');
        return false;
      }
    },
    
    remove: (key) => {
      localStorage.removeItem(CONFIG.STORAGE_PREFIX + key);
    },
    
    list: () => {
      return Object.keys(localStorage)
        .filter(k => k.startsWith(CONFIG.STORAGE_PREFIX))
        .map(k => k.replace(CONFIG.STORAGE_PREFIX, ''));
    },
    
    clear: () => {
      storage.list().forEach(key => storage.remove(key));
    },
  };

  // ============================================
  // DOM HELPER FUNCTIONS
  // ============================================
  
  const waitForElement = async (selector, timeout = 10000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await sleep(100);
    }
    return null;
  };

  const waitForElements = async (selector, minCount = 1, timeout = 10000) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const elements = document.querySelectorAll(selector);
      if (elements.length >= minCount) return Array.from(elements);
      await sleep(100);
    }
    return [];
  };

  const clickElement = async (element) => {
    if (!element) return false;
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(300);
      element.click();
      return true;
    } catch (e) {
      log(`Click error: ${e.message}`, 'error');
      return false;
    }
  };

  const typeText = async (element, text, delay = 50) => {
    if (!element) return false;
    try {
      element.focus();
      for (const char of text) {
        const event = new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: char,
        });
        element.textContent += char;
        element.dispatchEvent(event);
        await sleep(delay);
      }
      return true;
    } catch (e) {
      log(`Type error: ${e.message}`, 'error');
      return false;
    }
  };

  // ============================================
  // USER EXTRACTION
  // ============================================
  
  const extractUsername = (element) => {
    // Try to find username from various sources
    const link = element.querySelector('a[href^="/"]');
    if (link) {
      const href = link.getAttribute('href');
      const match = href.match(/^\/([^/]+)$/);
      if (match) return match[1].toLowerCase();
    }
    return null;
  };

  const extractTweetInfo = (tweetElement) => {
    try {
      const text = tweetElement.querySelector(SELECTORS.tweetText)?.textContent || '';
      const links = Array.from(tweetElement.querySelectorAll('a[href]'))
        .map(a => a.href)
        .filter(href => href && !href.includes('x.com'));
      const tweetLink = tweetElement.querySelector(SELECTORS.tweetLink)?.href || '';
      const userName = tweetElement.querySelector(SELECTORS.userName)?.textContent || '';
      
      return { text, links, tweetLink, userName };
    } catch (e) {
      return null;
    }
  };

  // ============================================
  // USER CELL EXTRACTION
  // ============================================

  const extractUserFromCell = (cell) => {
    if (!cell) return null;
    try {
      // === USERNAME (handle) ===
      // Strategy 1: href attribute parsing (most reliable)
      let username = '';
      const link = cell.querySelector('a[href^="/"]');
      if (link) {
        const href = link.getAttribute('href');
        const match = href.match(/^\/([^/]+)$/);
        if (match) username = match[1].toLowerCase();
        // Fallback: split approach for nested paths
        if (!username) {
          const parts = href.replace(/^\//, '').split('/');
          if (parts[0] && !['i', 'search', 'explore', 'settings', 'messages'].includes(parts[0])) {
            username = parts[0].toLowerCase();
          }
        }
      }

      // === DISPLAY NAME ===
      // Strategy 1: data-testid (most stable)
      let displayName = '';
      const nameTestId = cell.querySelector('[data-testid="User-Name"]');
      if (nameTestId) {
        // The first text node before @ is the display name
        const spans = nameTestId.querySelectorAll('span');
        for (const span of spans) {
          const text = span.textContent.trim();
          if (text && !text.startsWith('@') && text.length > 0) {
            displayName = text;
            break;
          }
        }
      }
      // Strategy 2: dir="ltr" > span (common fallback)
      if (!displayName) {
        const ltrSpan = cell.querySelector('[dir="ltr"] > span');
        if (ltrSpan) displayName = ltrSpan.textContent.trim();
      }
      // Strategy 3: first non-@ span with reasonable length
      if (!displayName) {
        const spans = cell.querySelectorAll('span');
        for (const span of spans) {
          const text = span.textContent.trim();
          if (text && !text.startsWith('@') && text.length >= 2 && text.length < 50) {
            displayName = text;
            break;
          }
        }
      }
      if (!displayName) displayName = username;

      // === BIO ===
      // Strategy 1: data-testid="UserDescription" (most reliable, Twitter's own test ID)
      let bio = '';
      let bioStrategy = 'none';
      const bioTestId = cell.querySelector(SELECTORS.userDescription || '[data-testid="UserDescription"]');
      if (bioTestId) { bio = bioTestId.textContent.trim(); bioStrategy = 'testid'; }

      // Strategy 2: dir="auto" excluding testid elements (catches variant DOMs)
      if (!bio) {
        const autoDir = cell.querySelector('[dir="auto"]:not([data-testid])');
        if (autoDir) {
          const text = autoDir.textContent.trim();
          // Validate: must not look like a username or display name
          if (text && !text.startsWith('@') && text.length >= 10 && text !== displayName) {
            bio = text;
            bioStrategy = 'dir-auto';
          }
        }
      }

      // Strategy 3: dir="auto" excluding role attributes (another variant)
      if (!bio) {
        const candidates = cell.querySelectorAll('[dir="auto"]:not([role])');
        for (const el of candidates) {
          if (el.closest('a')) continue; // Skip elements inside links
          const text = el.textContent.trim();
          if (text && !text.startsWith('@') && text.length >= 10 && text !== displayName) {
            bio = text;
            bioStrategy = 'dir-no-role';
            break;
          }
        }
      }

      // Strategy 4: span iteration (last resort, used when DOM structure changes significantly)
      if (!bio) {
        const spans = cell.querySelectorAll('span');
        for (const span of spans) {
          if (span.closest('a')) continue;
          const text = span.textContent.trim();
          if (text.startsWith('@') || text.length < 15) continue;
          if (text === displayName) continue;
          // Skip follower/following count patterns
          if (/^\d[\d,.]*[KMB]?\s*(followers?|following)/i.test(text)) continue;
          bio = text;
          bioStrategy = 'span-scan';
          break;
        }
      }

      // === FOLLOWER COUNT ===
      let followers = 0;
      const cellText = cell.textContent || '';
      const followerMatch = cellText.match(/(\d[\d,]*\.?\d*[KMB]?)\s*Follower/i);
      if (followerMatch) {
        followers = parseCount(followerMatch[1]);
      }

      // === FLAGS ===
      const isFollowing = !!cell.querySelector(SELECTORS.unfollowButton);
      const followsYou = !!cell.querySelector(SELECTORS.userFollowIndicator);
      const isVerified = !!cell.querySelector('[data-testid="icon-verified"]') || 
                         !!cell.querySelector('svg[aria-label*="Verified"]');
      const isProtected = !!cell.querySelector('[data-testid="icon-lock"]');

      // === RECORD EXTRACTION DIAGNOSTICS ===
      const nameStrategy = nameTestId ? 'testid' : (displayName ? (cell.querySelector('[dir="ltr"] > span') ? 'dir-ltr' : 'span-scan') : 'none');
      if (bio) extractionStats.record('bio', bioStrategy);
      if (displayName) extractionStats.record('name', nameStrategy);

      // === EXTRACTION METADATA (for debugging) ===
      const _meta = {
        bioStrategy,
        nameStrategy,
      };

      return { username, displayName, bio, followers, isFollowing, followsYou, isVerified, isProtected, _meta };
    } catch (e) {
      log(`extractUserFromCell error: ${e.message}`, 'error');
      return null;
    }
  };

  // ============================================
  // EXTRACTION DIAGNOSTICS
  // ============================================

  const extractionStats = {
    _stats: { bio: {}, name: {} },

    record: (field, strategy) => {
      if (!extractionStats._stats[field]) extractionStats._stats[field] = {};
      extractionStats._stats[field][strategy] = (extractionStats._stats[field][strategy] || 0) + 1;
    },

    report: () => {
      const stats = extractionStats._stats;
      log('📊 Extraction Strategy Report:', 'info');
      for (const [field, strategies] of Object.entries(stats)) {
        const total = Object.values(strategies).reduce((a, b) => a + b, 0);
        log(`  ${field}: ${total} extractions`, 'info');
        for (const [strategy, count] of Object.entries(strategies)) {
          const pct = ((count / total) * 100).toFixed(1);
          const bar = '█'.repeat(Math.round(pct / 5));
          log(`    ${strategy}: ${count} (${pct}%) ${bar}`, strategy === 'testid' ? 'success' : 'warning');
        }
      }
      // Alert if primary strategy usage drops below 50%
      const bioStats = stats.bio || {};
      const bioTotal = Object.values(bioStats).reduce((a, b) => a + b, 0);
      const testidCount = bioStats.testid || 0;
      if (bioTotal > 10 && (testidCount / bioTotal) < 0.5) {
        log('⚠️ WARNING: Primary bio selector (data-testid) working less than 50% of the time. Twitter may have changed their DOM!', 'warning');
      }
    },

    reset: () => {
      extractionStats._stats = { bio: {}, name: {} };
    },
  };

  const parseCount = (str) => {
    if (!str) return 0;
    str = str.replace(/,/g, '');
    const num = parseFloat(str);
    if (str.toUpperCase().includes('K')) return num * 1000;
    if (str.toUpperCase().includes('M')) return num * 1000000;
    if (str.toUpperCase().includes('B')) return num * 1000000000;
    return num;
  };

  // ============================================
  // RATE LIMITING
  // ============================================
  
  const rateLimit = {
    _counts: {},
    
    check: (action, limit, period = 'hour') => {
      const key = `ratelimit_${action}_${period}`;
      const data = storage.get(key) || { count: 0, timestamp: Date.now() };
      
      const periodMs = period === 'hour' ? 3600000 : 86400000;
      if (Date.now() - data.timestamp > periodMs) {
        data.count = 0;
        data.timestamp = Date.now();
      }
      
      return data.count < limit;
    },
    
    increment: (action, period = 'hour') => {
      const key = `ratelimit_${action}_${period}`;
      const data = storage.get(key) || { count: 0, timestamp: Date.now() };
      data.count++;
      storage.set(key, data);
    },
    
    getRemaining: (action, limit, period = 'hour') => {
      const key = `ratelimit_${action}_${period}`;
      const data = storage.get(key) || { count: 0, timestamp: Date.now() };
      return Math.max(0, limit - data.count);
    },
  };

  // ============================================
  // ACTION QUEUE
  // ============================================
  
  const actionQueue = {
    _queue: [],
    _running: false,
    
    add: (action, ...args) => {
      actionQueue._queue.push({ action, args });
      if (!actionQueue._running) actionQueue._process();
    },
    
    _process: async () => {
      actionQueue._running = true;
      while (actionQueue._queue.length > 0) {
        const { action, args } = actionQueue._queue.shift();
        try {
          await action(...args);
        } catch (e) {
          log(`Queue action error: ${e.message}`, 'error');
        }
        await randomDelay(CONFIG.DELAY_BETWEEN_ACTIONS, CONFIG.DELAY_BETWEEN_ACTIONS * 1.5);
      }
      actionQueue._running = false;
    },
    
    clear: () => {
      actionQueue._queue = [];
    },
    
    length: () => actionQueue._queue.length,
  };

  // ============================================
  // EXPOSE PUBLIC API
  // ============================================
  
  return {
    CONFIG,
    SELECTORS,
    sleep,
    randomDelay,
    log,
    scrollToBottom,
    scrollToTop,
    scrollBy,
    storage,
    waitForElement,
    waitForElements,
    clickElement,
    typeText,
    extractUsername,
    extractTweetInfo,
    extractUserFromCell,
    parseCount,
    rateLimit,
    actionQueue,
    extractionStats,
  };
})();

console.log('✅ XActions Core loaded! Ready for automation scripts.');

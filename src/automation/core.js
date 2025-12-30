// UnfollowX Automation Framework - Core Utilities
// https://github.com/nirholas/UnfollowX
//
// This is the foundation module. Paste this FIRST, then paste any automation script.
// All automations depend on this core module.

window.UnfollowX = window.UnfollowX || {};

window.UnfollowX.Core = (() => {
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
    STORAGE_PREFIX: 'unfollowx_',
    
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
        .filter(href => href && !href.includes('twitter.com'));
      const tweetLink = tweetElement.querySelector(SELECTORS.tweetLink)?.href || '';
      const userName = tweetElement.querySelector(SELECTORS.userName)?.textContent || '';
      
      return { text, links, tweetLink, userName };
    } catch (e) {
      return null;
    }
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
    rateLimit,
    actionQueue,
  };
})();

console.log('✅ UnfollowX Core loaded! Ready for automation scripts.');

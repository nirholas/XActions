// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions — Browser Driver
// Puppeteer stealth wrapper for X.com automation
// by nichxbt

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { AntiDetection } from './antiDetection.js';

puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── DOM Selectors (from docs/agents/selectors.md, verified Jan 2026) ────────
const S = {
  // Common
  tweet: 'article[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  userCell: '[data-testid="UserCell"]',
  confirmDialog: '[data-testid="confirmationSheetConfirm"]',
  searchInput: '[data-testid="SearchBox_Search_Input"]',
  primaryColumn: '[data-testid="primaryColumn"]',
  profileLink: 'a[data-testid="AppTabBar_Profile_Link"]',
  toast: '[data-testid="toast"]',

  // Posting & Compose
  composeButton: 'a[data-testid="SideNav_NewTweet_Button"]',
  tweetTextarea: '[data-testid="tweetTextarea_0"]',
  postButton: '[data-testid="tweetButton"]',
  inlinePostButton: '[data-testid="tweetButtonInline"]',
  threadAddButton: '[data-testid="addButton"]',

  // Engagement
  like: '[data-testid="like"]',
  unlike: '[data-testid="unlike"]',
  reply: '[data-testid="reply"]',
  retweet: '[data-testid="retweet"]',
  retweetConfirm: '[data-testid="retweetConfirm"]',
  bookmark: '[data-testid="bookmark"]',
  removeBookmark: '[data-testid="removeBookmark"]',

  // Following
  follow: '[data-testid$="-follow"]',
  unfollow: '[data-testid$="-unfollow"]',
  userFollowIndicator: '[data-testid="userFollowIndicator"]',
  userName: '[data-testid="User-Name"]',
  userDescription: '[data-testid="UserDescription"]',

  // Discovery
  trend: '[data-testid="trend"]',
};

/**
 * Puppeteer-based browser driver for X.com automation with stealth and anti-detection.
 */
class BrowserDriver {
  /**
   * @param {Object} [config]
   * @param {boolean} [config.headless=true]
   * @param {string} [config.sessionPath='data/session.json']
   * @param {string} [config.screenshotDir='data/screenshots']
   * @param {string} [config.proxy] - SOCKS5 or HTTP proxy URL
   */
  constructor(config = {}) {
    this.headless = config.headless !== false;
    this.sessionPath = config.sessionPath || path.resolve('data', 'session.json');
    this.screenshotDir = config.screenshotDir || path.resolve('data', 'screenshots');
    this.proxy = config.proxy || null;

    /** @type {import('puppeteer').Browser|null} */
    this.browser = null;
    /** @type {import('puppeteer').Page|null} */
    this.page = null;
    this.antiDetection = new AntiDetection();
    this._fingerprint = null;
  }

  // ─── Lifecycle ────────────────────────────────────────────────

  /**
   * Launch the browser with stealth settings.
   */
  async launch() {
    this._fingerprint = this.antiDetection.generateFingerprint();

    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      `--window-size=${this._fingerprint.viewport.width},${this._fingerprint.viewport.height}`,
    ];
    if (this.proxy) args.push(`--proxy-server=${this.proxy}`);

    this.browser = await puppeteer.launch({
      headless: this.headless ? 'new' : false,
      args,
      defaultViewport: this._fingerprint.viewport,
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent(this._fingerprint.userAgent);

    // Override timezone and locale
    await this.page.emulateTimezone(this._fingerprint.timezone);

    // Set extra headers
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': `${this._fingerprint.locale},en;q=0.9`,
    });

    console.log(`🌐 Browser launched (${this._fingerprint.viewport.width}x${this._fingerprint.viewport.height}, headless=${this.headless})`);
  }

  /**
   * Close the browser cleanly.
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('🔴 Browser closed');
    }
  }

  // ─── Session Management ───────────────────────────────────────

  /**
   * Save current cookies to the session file.
   */
  async saveSession() {
    if (!this.page) return;
    try {
      const cookies = await this.page.cookies();
      const dir = path.dirname(this.sessionPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.sessionPath, JSON.stringify(cookies, null, 2));
      console.log(`💾 Session saved (${cookies.length} cookies)`);
    } catch (err) {
      console.log(`⚠️ Failed to save session: ${err.message}`);
    }
  }

  /**
   * Restore cookies from the session file.
   * @returns {boolean} True if session was restored
   */
  async restoreSession() {
    if (!this.page) return false;
    try {
      if (!fs.existsSync(this.sessionPath)) {
        console.log('📭 No session file found');
        return false;
      }
      const cookies = JSON.parse(fs.readFileSync(this.sessionPath, 'utf-8'));
      if (!Array.isArray(cookies) || cookies.length === 0) return false;
      await this.page.setCookie(...cookies);
      console.log(`🔑 Session restored (${cookies.length} cookies)`);
      return true;
    } catch (err) {
      console.log(`⚠️ Failed to restore session: ${err.message}`);
      return false;
    }
  }

  /**
   * Check if currently logged in by looking for the profile link.
   * @returns {Promise<boolean>}
   */
  async isLoggedIn() {
    if (!this.page) return false;
    try {
      await this.navigate('https://x.com/home');
      const profileLink = await this.page.$(S.profileLink);
      const loggedIn = profileLink !== null;
      console.log(loggedIn ? '✅ Session valid — logged in' : '❌ Not logged in');
      return loggedIn;
    } catch {
      return false;
    }
  }

  // ─── Navigation ───────────────────────────────────────────────

  /**
   * Navigate to a URL, waiting for the primary column to load.
   * @param {string} url
   * @param {number} [timeout=30000]
   */
  async navigate(url, timeout = 30000) {
    if (!this.page) throw new Error('Browser not launched');
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout });
      // Wait for primary column (main content area)
      await this.page.waitForSelector(S.primaryColumn, { timeout: 10000 }).catch(() => {});
      await sleep(rand(500, 1500));
      console.log(`📍 Navigated to ${url}`);
    } catch (err) {
      console.log(`⚠️ Navigation timeout: ${url} — ${err.message}`);
      throw err;
    }
  }

  // ─── Tweet Extraction ─────────────────────────────────────────

  /**
   * Extract tweets visible on the current page.
   * @returns {Promise<Array<{ id: string, text: string, author: string, isAd: boolean, hasMedia: boolean, likeCount: number }>>}
   */
  async extractTweets() {
    if (!this.page) return [];
    try {
      const tweets = await this.page.$$eval(S.tweet, (articles) => {
        return articles.map((article) => {
          // Tweet text
          const textEl = article.querySelector('[data-testid="tweetText"]');
          const text = textEl ? textEl.innerText.trim() : '';

          // Author username from link
          const links = article.querySelectorAll('a[href^="/"]');
          let author = '';
          for (const link of links) {
            const href = link.getAttribute('href');
            if (href && /^\/[a-zA-Z0-9_]+$/.test(href)) {
              author = href.slice(1);
              break;
            }
          }

          // Tweet ID from status link
          let id = '';
          const statusLinks = article.querySelectorAll('a[href*="/status/"]');
          for (const link of statusLinks) {
            const match = link.getAttribute('href')?.match(/\/status\/(\d+)/);
            if (match) { id = match[1]; break; }
          }

          // Is ad?
          const isAd = article.innerHTML.includes('Promoted') || article.innerHTML.includes('Ad');

          // Has media?
          const hasMedia = article.querySelector('img[src*="media"], video') !== null;

          // Like count
          const likeBtn = article.querySelector('[data-testid="like"], [data-testid="unlike"]');
          const likeLabel = likeBtn?.getAttribute('aria-label') || '';
          const likeMatch = likeLabel.match(/(\d+)/);
          const likeCount = likeMatch ? parseInt(likeMatch[1], 10) : 0;

          return { id, text, author, isAd, hasMedia, likeCount };
        }).filter((t) => t.text && t.id);
      });

      console.log(`📰 Extracted ${tweets.length} tweets`);
      return tweets;
    } catch (err) {
      console.log(`⚠️ Tweet extraction failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Extract user cells (follower/following lists, search people results).
   * @returns {Promise<Array<{ username: string, bio: string, followers: string, isFollowing: boolean }>>}
   */
  async extractUserCells() {
    if (!this.page) return [];
    try {
      const users = await this.page.$$eval(S.userCell, (cells) => {
        return cells.map((cell) => {
          // Username from link
          const links = cell.querySelectorAll('a[href^="/"]');
          let username = '';
          for (const link of links) {
            const href = link.getAttribute('href');
            if (href && /^\/[a-zA-Z0-9_]+$/.test(href)) {
              username = href.slice(1);
              break;
            }
          }

          // Bio
          const descEl = cell.querySelector('[data-testid="UserDescription"]');
          const bio = descEl ? descEl.innerText.trim() : '';

          // Follower count (approximate from display text)
          const allText = cell.innerText;
          const followMatch = allText.match(/([\d,.]+[KMB]?)\s*[Ff]ollowers/);
          const followers = followMatch ? followMatch[1] : '';

          // Is following (has unfollow button)
          const isFollowing = cell.querySelector('[data-testid$="-unfollow"]') !== null;

          return { username, bio, followers, isFollowing };
        }).filter((u) => u.username);
      });

      console.log(`👥 Extracted ${users.length} user cells`);
      return users;
    } catch (err) {
      console.log(`⚠️ User cell extraction failed: ${err.message}`);
      return [];
    }
  }

  // ─── Engagement Actions ───────────────────────────────────────

  /**
   * Like a specific tweet by its article element or ID.
   * @param {string} tweetId
   * @returns {Promise<boolean>}
   */
  async likeTweet(tweetId) {
    try {
      const liked = await this.page.evaluate((id, likeSelector) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        for (const article of articles) {
          const link = article.querySelector(`a[href*="/status/${id}"]`);
          if (link) {
            const btn = article.querySelector(likeSelector);
            if (btn) { btn.click(); return true; }
          }
        }
        return false;
      }, tweetId, S.like);

      if (liked) {
        await sleep(rand(300, 800));
        console.log(`❤️ Liked tweet ${tweetId}`);
      }
      return liked;
    } catch (err) {
      console.log(`⚠️ Like failed for ${tweetId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Bookmark a specific tweet.
   * @param {string} tweetId
   * @returns {Promise<boolean>}
   */
  async bookmarkTweet(tweetId) {
    try {
      const bookmarked = await this.page.evaluate((id, bookmarkSelector) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        for (const article of articles) {
          const link = article.querySelector(`a[href*="/status/${id}"]`);
          if (link) {
            const btn = article.querySelector(bookmarkSelector);
            if (btn) { btn.click(); return true; }
          }
        }
        return false;
      }, tweetId, S.bookmark);

      if (bookmarked) {
        await sleep(rand(300, 800));
        console.log(`🔖 Bookmarked tweet ${tweetId}`);
      }
      return bookmarked;
    } catch (err) {
      console.log(`⚠️ Bookmark failed for ${tweetId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Retweet a tweet (click retweet + confirm).
   * @param {string} tweetId
   * @returns {Promise<boolean>}
   */
  async retweetTweet(tweetId) {
    try {
      // Click the retweet button on the tweet
      const clicked = await this.page.evaluate((id, rtSelector) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        for (const article of articles) {
          const link = article.querySelector(`a[href*="/status/${id}"]`);
          if (link) {
            const btn = article.querySelector(rtSelector);
            if (btn) { btn.click(); return true; }
          }
        }
        return false;
      }, tweetId, S.retweet);

      if (!clicked) return false;

      // Wait for confirmation menu and click retweet confirm
      await sleep(rand(500, 1000));
      const confirmBtn = await this.page.$(S.retweetConfirm);
      if (confirmBtn) {
        await this.antiDetection.humanClick(this.page, S.retweetConfirm);
        await sleep(rand(300, 800));
        console.log(`🔁 Retweeted ${tweetId}`);
        return true;
      }
      return false;
    } catch (err) {
      console.log(`⚠️ Retweet failed for ${tweetId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Reply to a specific tweet.
   * @param {string} tweetId
   * @param {string} text - Reply text
   * @returns {Promise<boolean>}
   */
  async replyToTweet(tweetId, text) {
    try {
      // Click the reply button on the tweet
      const clicked = await this.page.evaluate((id, replySelector) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        for (const article of articles) {
          const link = article.querySelector(`a[href*="/status/${id}"]`);
          if (link) {
            const btn = article.querySelector(replySelector);
            if (btn) { btn.click(); return true; }
          }
        }
        return false;
      }, tweetId, S.reply);

      if (!clicked) return false;

      // Wait for reply composer to appear
      await sleep(rand(800, 1500));
      await this.page.waitForSelector(S.tweetTextarea, { timeout: 5000 });

      // Type the reply with human-like behavior
      await this.antiDetection.humanType(this.page, S.tweetTextarea, text);
      await sleep(rand(500, 1000));

      // Click the post button
      const postBtn = await this.page.$(S.postButton);
      if (postBtn) {
        await this.antiDetection.humanClick(this.page, S.postButton);
        await sleep(rand(1000, 2000));
        console.log(`💬 Replied to ${tweetId}: "${text.slice(0, 50)}..."`);
        return true;
      }
      return false;
    } catch (err) {
      console.log(`⚠️ Reply failed for ${tweetId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Follow a user from their profile or a user cell.
   * @param {string} [username] - If provided, navigates to their profile first
   * @returns {Promise<boolean>}
   */
  async followUser(username) {
    try {
      if (username) {
        await this.navigate(`https://x.com/${username}`);
        await sleep(rand(1000, 2000));
      }

      const followBtn = await this.page.$(S.follow);
      if (!followBtn) {
        console.log(`ℹ️ No follow button found${username ? ` for @${username}` : ''}`);
        return false;
      }

      await this.antiDetection.humanClick(this.page, S.follow);
      await sleep(rand(500, 1000));

      // Handle confirmation dialog if it appears
      const confirm = await this.page.$(S.confirmDialog);
      if (confirm) {
        await this.antiDetection.humanClick(this.page, S.confirmDialog);
        await sleep(rand(300, 500));
      }

      console.log(`➕ Followed${username ? ` @${username}` : ''}`);
      return true;
    } catch (err) {
      console.log(`⚠️ Follow failed${username ? ` for @${username}` : ''}: ${err.message}`);
      return false;
    }
  }

  // ─── Search ───────────────────────────────────────────────────

  /**
   * Search for a query on X.com.
   * @param {string} query
   * @param {'top'|'latest'|'people'|'photos'|'videos'} [tab='top']
   */
  async searchFor(query, tab = 'top') {
    const encodedQuery = encodeURIComponent(query);
    const tabMap = {
      top: '',
      latest: '&f=live',
      people: '&f=user',
      photos: '&f=image',
      videos: '&f=video',
    };
    const url = `https://x.com/search?q=${encodedQuery}${tabMap[tab] || ''}`;
    await this.navigate(url);
    console.log(`🔍 Searched: "${query}" (${tab})`);
  }

  // ─── Content Posting ──────────────────────────────────────────

  /**
   * Post a new tweet.
   * @param {string} text
   * @returns {Promise<boolean>}
   */
  async postTweet(text) {
    try {
      await this.navigate('https://x.com/compose/post');
      await sleep(rand(1000, 2000));

      await this.page.waitForSelector(S.tweetTextarea, { timeout: 5000 });
      await this.antiDetection.humanType(this.page, S.tweetTextarea, text);
      await sleep(rand(800, 1500));

      // Click post
      await this.antiDetection.humanClick(this.page, S.postButton);
      await sleep(rand(1500, 3000));

      console.log(`📝 Posted tweet: "${text.slice(0, 50)}..."`);
      return true;
    } catch (err) {
      console.log(`⚠️ Failed to post tweet: ${err.message}`);
      return false;
    }
  }

  /**
   * Post a multi-tweet thread.
   * @param {string[]} tweets - Array of tweet texts
   * @returns {Promise<boolean>}
   */
  async postThread(tweets) {
    if (!tweets || tweets.length === 0) return false;

    try {
      await this.navigate('https://x.com/compose/post');
      await sleep(rand(1000, 2000));

      for (let i = 0; i < tweets.length; i++) {
        if (i > 0) {
          // Click "Add" button to add another tweet to the thread
          const addBtn = await this.page.$(S.threadAddButton);
          if (!addBtn) {
            console.log(`⚠️ Thread add button not found at tweet ${i + 1}`);
            break;
          }
          await this.antiDetection.humanClick(this.page, S.threadAddButton);
          await sleep(rand(500, 1000));
        }

        // Find the active textarea (last one in the thread)
        const textareas = await this.page.$$('[data-testid^="tweetTextarea_"]');
        const activeTextarea = textareas[textareas.length - 1];
        if (!activeTextarea) break;

        const selector = `[data-testid="tweetTextarea_${i}"]`;
        await this.page.waitForSelector(selector, { timeout: 3000 }).catch(() => {});
        await this.antiDetection.humanType(this.page, selector, tweets[i]);
        await sleep(rand(600, 1200));
      }

      // Post the thread
      await this.antiDetection.humanClick(this.page, S.postButton);
      await sleep(rand(2000, 4000));

      console.log(`🧵 Posted thread (${tweets.length} tweets)`);
      return true;
    } catch (err) {
      console.log(`⚠️ Failed to post thread: ${err.message}`);
      return false;
    }
  }

  // ─── Scrolling & Navigation ───────────────────────────────────

  /**
   * Scroll down with human-like behavior.
   * @param {number} [pixels] - Pixels to scroll (default: random 300-800)
   */
  async scrollDown(pixels) {
    const amount = pixels || rand(300, 800);
    await this.antiDetection.humanScroll(this.page, amount);
    await sleep(rand(500, 1500));
  }

  /**
   * Take a screenshot for debugging.
   * @param {string} [filename] - Custom filename (default: timestamp)
   * @returns {Promise<string>} Path to saved screenshot
   */
  async screenshot(filename) {
    if (!this.page) return '';
    try {
      if (!fs.existsSync(this.screenshotDir)) {
        fs.mkdirSync(this.screenshotDir, { recursive: true });
      }
      const name = filename || `screenshot-${Date.now()}.png`;
      const filepath = path.join(this.screenshotDir, name);
      await this.page.screenshot({ path: filepath, fullPage: false });
      console.log(`📸 Screenshot saved: ${filepath}`);
      return filepath;
    } catch (err) {
      console.log(`⚠️ Screenshot failed: ${err.message}`);
      return '';
    }
  }

  /**
   * Get trending topics from the Explore page.
   * @returns {Promise<string[]>}
   */
  async getTrendingTopics() {
    try {
      await this.navigate('https://x.com/explore/tabs/trending');
      await sleep(rand(1500, 3000));

      const trends = await this.page.$$eval(S.trend, (items) => {
        return items.map((item) => {
          const text = item.innerText.trim();
          // Extract the trend name (usually first meaningful line)
          const lines = text.split('\n').filter((l) => l.trim());
          return lines.find((l) => !l.match(/trending|tweets|posts/i) && l.length > 2) || lines[0] || '';
        }).filter(Boolean);
      });

      console.log(`📈 Found ${trends.length} trending topics`);
      return trends.slice(0, 20);
    } catch (err) {
      console.log(`⚠️ Failed to get trending topics: ${err.message}`);
      return [];
    }
  }
}

export { BrowserDriver };

/**
 * XActions Client — Scraper Class
 *
 * Main entry point for programmatic Twitter/X access via internal GraphQL API.
 * No Puppeteer required — uses HTTP-only requests.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import * as fs from 'node:fs/promises';
import * as usersApi from './api/users.js';
import * as tweetsApi from './api/tweets.js';
import * as searchApi from './api/search.js';
import * as trendsApi from './api/trends.js';
import * as listsApi from './api/lists.js';
import * as dmsApi from './api/dms.js';
import { ScraperError, AuthenticationError } from './errors.js';
import { validateUsername, validateTweetId, validateTweetText, validateCount } from './validation.js';
import { TokenManager } from './auth/TokenManager.js';

/**
 * Search mode enum for Twitter search.
 * @enum {string}
 */
export const SearchMode = Object.freeze({
  Top: 'Top',
  Latest: 'Latest',
  Photos: 'Photos',
  Videos: 'Videos',
});

/**
 * Lightweight HTTP wrapper that delegates to fetch.
 * In Track 03 this will be replaced by the full HttpClient.
 * @private
 */
class SimpleHttp {
  constructor(tokenManager, options = {}) {
    this._tokenManager = tokenManager;
    this._fetchFn = options.fetch || globalThis.fetch;
    this._proxy = options.proxy || null;
    this._transform = options.transform || null;
    this._cookies = null;
    this._authenticated = false;
  }

  /**
   * Make a GET request.
   * @param {string} url
   * @returns {Promise<any>}
   */
  async get(url) {
    await this._tokenManager.getGuestToken();
    const headers = this._tokenManager.getHeaders(this._authenticated);
    if (this._cookies) {
      headers['Cookie'] = this._cookies;
    }

    let req = { method: 'GET', headers };
    if (this._transform) req = this._transform(req) || req;

    const res = await this._fetchFn(url, req);
    if (!res.ok) {
      if (res.status === 429) {
        const reset = res.headers?.get?.('x-rate-limit-reset');
        throw new ScraperError(
          `Rate limited (${res.status})`,
          'RATE_LIMITED',
          url,
          res.status,
          reset ? new Date(Number(reset) * 1000) : null,
        );
      }
      throw new ScraperError(`HTTP ${res.status}: ${res.statusText}`, 'HTTP_ERROR', url, res.status);
    }
    return res.json();
  }

  /**
   * Make a POST request.
   * @param {string} url
   * @param {any} body
   * @param {Object} [extraHeaders]
   * @returns {Promise<any>}
   */
  async post(url, body, extraHeaders = {}) {
    await this._tokenManager.getGuestToken();
    const headers = {
      ...this._tokenManager.getHeaders(this._authenticated),
      ...extraHeaders,
    };
    if (this._cookies) {
      headers['Cookie'] = this._cookies;
    }
    if (typeof body === 'object' && !extraHeaders['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const payload = typeof body === 'string' ? body : JSON.stringify(body);

    let req = { method: 'POST', headers, body: payload };
    if (this._transform) req = this._transform(req) || req;

    const res = await this._fetchFn(url, req);
    if (!res.ok) {
      if (res.status === 429) {
        throw new ScraperError('Rate limited', 'RATE_LIMITED', url, res.status);
      }
      throw new ScraperError(`HTTP ${res.status}: ${res.statusText}`, 'HTTP_ERROR', url, res.status);
    }
    return res.json();
  }
}

/**
 * Scraper — the main entry point for programmatic Twitter/X access.
 *
 * @example
 * ```js
 * import { Scraper } from 'xactions/client';
 *
 * const scraper = new Scraper();
 * await scraper.loadCookies('./cookies.json');
 *
 * const profile = await scraper.getProfile('nichxbt');
 * console.log(profile.followersCount);
 *
 * for await (const tweet of scraper.getTweets('nichxbt', 10)) {
 *   console.log(tweet.text);
 * }
 * ```
 */
export class Scraper {
  /**
   * Create a new Scraper instance.
   *
   * @param {Object} [options={}]
   * @param {string|Array} [options.cookies] - Cookie string or array
   * @param {string} [options.proxy] - Proxy URL
   * @param {Function} [options.fetch] - Custom fetch function
   * @param {Function} [options.transform] - Request transform function
   */
  constructor(options = {}) {
    /** @private */
    this._auth = new TokenManager(options.fetch || globalThis.fetch);
    /** @private */
    this._http = new SimpleHttp(this._auth, options);
    /** @private */
    this._isLoggedIn = false;
    /** @private */
    this._userIdCache = new Map();
    /** @private */
    this._options = options;

    if (options.cookies) {
      this._http._cookies =
        typeof options.cookies === 'string'
          ? options.cookies
          : Array.isArray(options.cookies)
            ? options.cookies.map((c) => `${c.name}=${c.value}`).join('; ')
            : '';
      // Extract ct0 (CSRF token) from cookies
      const ct0Match = this._http._cookies.match(/ct0=([^;]+)/);
      if (ct0Match) {
        this._auth.setCsrfToken(ct0Match[1]);
        this._http._authenticated = true;
        this._isLoggedIn = true;
      }
    }
  }

  // =========================================================================
  // Authentication
  // =========================================================================

  /**
   * Log in to Twitter with credentials.
   *
   * @param {Object} credentials
   * @param {string} credentials.username
   * @param {string} credentials.password
   * @param {string} [credentials.email]
   * @returns {Promise<void>}
   */
  async login(credentials) {
    // Full login flow implemented in Track 02.
    // For now, throw a helpful error directing users to cookie-based auth.
    throw new ScraperError(
      'Interactive login requires Track 02 (auth module). Use loadCookies() or setCookies() instead.',
      'NOT_IMPLEMENTED',
    );
  }

  /**
   * Log out and clear cookies.
   *
   * @returns {Promise<void>}
   */
  async logout() {
    this._isLoggedIn = false;
    this._http._cookies = null;
    this._http._authenticated = false;
    this._auth.invalidateGuestToken();
    this._auth.setCsrfToken(null);
    this._userIdCache.clear();
  }

  /**
   * Check if the scraper is authenticated.
   *
   * @returns {Promise<boolean>}
   */
  async isLoggedIn() {
    return this._isLoggedIn;
  }

  /**
   * Get current cookies as an array.
   *
   * @returns {Promise<Array<{name: string, value: string}>>}
   */
  async getCookies() {
    if (!this._http._cookies) return [];
    return this._http._cookies.split('; ').map((pair) => {
      const [name, ...rest] = pair.split('=');
      return { name: name.trim(), value: rest.join('=') };
    });
  }

  /**
   * Set cookies for authenticated requests.
   *
   * @param {string|Array<{name: string, value: string}>} cookies
   * @returns {Promise<void>}
   */
  async setCookies(cookies) {
    if (typeof cookies === 'string') {
      this._http._cookies = cookies;
    } else if (Array.isArray(cookies)) {
      this._http._cookies = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    }

    // Extract ct0 CSRF token
    const ct0Match = (this._http._cookies || '').match(/ct0=([^;]+)/);
    if (ct0Match) {
      this._auth.setCsrfToken(ct0Match[1]);
      this._http._authenticated = true;
      this._isLoggedIn = true;
    }
  }

  /**
   * Save cookies to a JSON file.
   *
   * @param {string} filePath - Path to save cookies
   * @returns {Promise<void>}
   */
  async saveCookies(filePath) {
    const cookies = await this.getCookies();
    await fs.writeFile(filePath, JSON.stringify(cookies, null, 2), 'utf-8');
  }

  /**
   * Load cookies from a JSON file.
   *
   * @param {string} filePath - Path to cookie file
   * @returns {Promise<void>}
   */
  async loadCookies(filePath) {
    const raw = await fs.readFile(filePath, 'utf-8');
    const cookies = JSON.parse(raw);
    await this.setCookies(cookies);
  }

  // =========================================================================
  // Users
  // =========================================================================

  /**
   * Get a user profile by username.
   *
   * @param {string} username - Twitter handle (with or without @)
   * @returns {Promise<import('./models/Profile.js').Profile>}
   */
  async getProfile(username) {
    const clean = validateUsername(username);
    return usersApi.getUserByScreenName(this._http, clean);
  }

  /**
   * Get current authenticated user profile.
   *
   * @returns {Promise<import('./models/Profile.js').Profile>}
   */
  async me() {
    this._requireAuth();
    // Resolve authenticated user via the twid cookie (format: "u%3D<userId>")
    const cookies = await this.getCookies();
    const twidCookie = cookies.find((c) => c.name === 'twid');
    if (twidCookie) {
      const userId = decodeURIComponent(twidCookie.value).replace('u=', '');
      return usersApi.getUserById(this._http, userId);
    }
    throw new ScraperError('Cannot determine authenticated user ID', 'AUTH_REQUIRED');
  }

  /**
   * Get followers of a user.
   *
   * @param {string} userId - Twitter user ID
   * @param {number} [count=100] - Maximum number of followers to return
   * @returns {AsyncGenerator<import('./models/Profile.js').Profile>}
   */
  async *getFollowers(userId, count = 100) {
    const validCount = validateCount(count, 1, 10000);
    yield* usersApi.getFollowers(this._http, userId, validCount);
  }

  /**
   * Get users that a user is following.
   *
   * @param {string} userId - Twitter user ID
   * @param {number} [count=100] - Maximum number of following to return
   * @returns {AsyncGenerator<import('./models/Profile.js').Profile>}
   */
  async *getFollowing(userId, count = 100) {
    const validCount = validateCount(count, 1, 10000);
    yield* usersApi.getFollowing(this._http, userId, validCount);
  }

  /**
   * Follow a user.
   *
   * @param {string} username - Twitter handle
   * @returns {Promise<void>}
   */
  async followUser(username) {
    this._requireAuth();
    const userId = await this._resolveUserId(username);
    return usersApi.followUser(this._http, userId);
  }

  /**
   * Unfollow a user.
   *
   * @param {string} username - Twitter handle
   * @returns {Promise<void>}
   */
  async unfollowUser(username) {
    this._requireAuth();
    const userId = await this._resolveUserId(username);
    return usersApi.unfollowUser(this._http, userId);
  }

  // =========================================================================
  // Tweets
  // =========================================================================

  /**
   * Get a single tweet by ID.
   *
   * @param {string} id - Tweet ID
   * @returns {Promise<import('./models/Tweet.js').Tweet>}
   */
  async getTweet(id) {
    const validId = validateTweetId(id);
    return tweetsApi.getTweet(this._http, validId);
  }

  /**
   * Get tweets from a user's timeline.
   *
   * @param {string} username - Twitter handle
   * @param {number} [count=100] - Maximum number of tweets
   * @returns {AsyncGenerator<import('./models/Tweet.js').Tweet>}
   */
  async *getTweets(username, count = 100) {
    const clean = validateUsername(username);
    const userId = await this._resolveUserId(clean);
    yield* tweetsApi.getTweets(this._http, userId, count);
  }

  /**
   * Get tweets and replies from a user's timeline.
   *
   * @param {string} username - Twitter handle
   * @param {number} [count=100] - Maximum number of tweets + replies
   * @returns {AsyncGenerator<import('./models/Tweet.js').Tweet>}
   */
  async *getTweetsAndReplies(username, count = 100) {
    const clean = validateUsername(username);
    const userId = await this._resolveUserId(clean);
    yield* tweetsApi.getTweetsAndReplies(this._http, userId, count);
  }

  /**
   * Get tweets a user has liked.
   *
   * @param {string} username - Twitter handle
   * @param {number} [count=100] - Maximum number of liked tweets
   * @returns {AsyncGenerator<import('./models/Tweet.js').Tweet>}
   */
  async *getLikedTweets(username, count = 100) {
    const clean = validateUsername(username);
    const userId = await this._resolveUserId(clean);
    yield* tweetsApi.getLikedTweets(this._http, userId, count);
  }

  /**
   * Get the latest tweet from a user.
   *
   * @param {string} username - Twitter handle
   * @returns {Promise<import('./models/Tweet.js').Tweet|null>}
   */
  async getLatestTweet(username) {
    const clean = validateUsername(username);
    const userId = await this._resolveUserId(clean);
    return tweetsApi.getLatestTweet(this._http, userId);
  }

  /**
   * Send a tweet.
   *
   * @param {string} text - Tweet text
   * @param {Object} [options={}]
   * @param {string[]} [options.mediaIds] - Media entity IDs to attach
   * @param {string} [options.replyTo] - Tweet ID to reply to
   * @returns {Promise<import('./models/Tweet.js').Tweet>}
   */
  async sendTweet(text, options = {}) {
    this._requireAuth();
    validateTweetText(text);
    return tweetsApi.sendTweet(this._http, text, options);
  }

  /**
   * Send a quote tweet.
   *
   * @param {string} text - Tweet text
   * @param {string} quotedTweetId - ID of tweet to quote
   * @param {string[]} [mediaIds] - Media entity IDs to attach
   * @returns {Promise<import('./models/Tweet.js').Tweet>}
   */
  async sendQuoteTweet(text, quotedTweetId, mediaIds) {
    this._requireAuth();
    validateTweetText(text);
    validateTweetId(quotedTweetId);
    return tweetsApi.sendQuoteTweet(this._http, text, quotedTweetId, mediaIds);
  }

  /**
   * Delete a tweet.
   *
   * @param {string} id - Tweet ID
   * @returns {Promise<void>}
   */
  async deleteTweet(id) {
    this._requireAuth();
    const validId = validateTweetId(id);
    return tweetsApi.deleteTweet(this._http, validId);
  }

  /**
   * Like a tweet.
   *
   * @param {string} id - Tweet ID
   * @returns {Promise<void>}
   */
  async likeTweet(id) {
    this._requireAuth();
    const validId = validateTweetId(id);
    return tweetsApi.likeTweet(this._http, validId);
  }

  /**
   * Unlike a tweet.
   *
   * @param {string} id - Tweet ID
   * @returns {Promise<void>}
   */
  async unlikeTweet(id) {
    this._requireAuth();
    const validId = validateTweetId(id);
    return tweetsApi.unlikeTweet(this._http, validId);
  }

  /**
   * Retweet a tweet.
   *
   * @param {string} id - Tweet ID
   * @returns {Promise<void>}
   */
  async retweet(id) {
    this._requireAuth();
    const validId = validateTweetId(id);
    return tweetsApi.retweet(this._http, validId);
  }

  /**
   * Unretweet a tweet.
   *
   * @param {string} id - Tweet ID
   * @returns {Promise<void>}
   */
  async unretweet(id) {
    this._requireAuth();
    const validId = validateTweetId(id);
    return tweetsApi.unretweet(this._http, validId);
  }

  // =========================================================================
  // Search
  // =========================================================================

  /**
   * Search tweets.
   *
   * @param {string} query - Search query (supports advanced operators)
   * @param {number} [count=100] - Maximum number of results
   * @param {string} [mode='Latest'] - SearchMode: 'Top', 'Latest', 'Photos', 'Videos'
   * @returns {AsyncGenerator<import('./models/Tweet.js').Tweet>}
   */
  async *searchTweets(query, count = 100, mode = SearchMode.Latest) {
    yield* searchApi.searchTweets(this._http, query, count, mode);
  }

  /**
   * Search profiles.
   *
   * @param {string} query - Search query
   * @param {number} [count=100] - Maximum number of results
   * @returns {AsyncGenerator<import('./models/Profile.js').Profile>}
   */
  async *searchProfiles(query, count = 100) {
    yield* searchApi.searchProfiles(this._http, query, count);
  }

  // =========================================================================
  // Trends
  // =========================================================================

  /**
   * Get trending topics.
   *
   * @param {string} [category='trending'] - Category: 'trending', 'for_you', 'news', 'sports', 'entertainment'
   * @returns {Promise<Array<{name: string, tweetCount: string, url: string, context: string}>>}
   */
  async getTrends(category = 'trending') {
    return trendsApi.getTrends(this._http, category);
  }

  /**
   * Get available explore tabs.
   *
   * @returns {Promise<Array<{id: string, label: string}>>}
   */
  async getExploreTabs() {
    return trendsApi.getExploreTabs(this._http);
  }

  // =========================================================================
  // Lists
  // =========================================================================

  /**
   * Get tweets from a list.
   *
   * @param {string} listId - Twitter list ID
   * @param {number} [count=100] - Maximum number of tweets
   * @returns {AsyncGenerator<import('./models/Tweet.js').Tweet>}
   */
  async *getListTweets(listId, count = 100) {
    yield* listsApi.getListTweets(this._http, listId, count);
  }

  /**
   * Get members of a list.
   *
   * @param {string} listId - Twitter list ID
   * @param {number} [count=100] - Maximum number of members
   * @returns {AsyncGenerator<import('./models/Profile.js').Profile>}
   */
  async *getListMembers(listId, count = 100) {
    yield* listsApi.getListMembers(this._http, listId, count);
  }

  /**
   * Get list details by ID.
   *
   * @param {string} listId - Twitter list ID
   * @returns {Promise<{id: string, name: string, description: string, memberCount: number, subscriberCount: number, createdAt: string}|null>}
   */
  async getListById(listId) {
    return listsApi.getListById(this._http, listId);
  }

  // =========================================================================
  // Direct Messages
  // =========================================================================

  /**
   * Send a DM to a conversation.
   *
   * @param {string} conversationId - DM conversation ID
   * @param {string} text - Message text
   * @returns {Promise<{id: string, text: string, createdAt: string}>}
   */
  async sendDm(conversationId, text) {
    this._requireAuth();
    return dmsApi.sendDm(this._http, conversationId, text);
  }

  /**
   * Send a DM to a user by ID (creates conversation if needed).
   *
   * @param {string} userId - Target user ID
   * @param {string} text - Message text
   * @returns {Promise<{id: string, text: string, createdAt: string}>}
   */
  async sendDmToUser(userId, text) {
    this._requireAuth();
    return dmsApi.sendDmToUser(this._http, userId, text);
  }

  /**
   * Get DM conversations.
   *
   * @param {number} [count=50] - Maximum conversations to return
   * @returns {AsyncGenerator<{id: string, type: string, participants: string[], lastMessage: string, updatedAt: string}>}
   */
  async *getDmConversations(count = 50) {
    this._requireAuth();
    yield* dmsApi.getDmConversations(this._http, count);
  }

  /**
   * Get messages in a DM conversation.
   *
   * @param {string} conversationId - Conversation ID
   * @param {number} [count=50] - Maximum messages to return
   * @returns {AsyncGenerator<import('./models/Message.js').Message>}
   */
  async *getDmMessages(conversationId, count = 50) {
    this._requireAuth();
    yield* dmsApi.getDmMessages(this._http, conversationId, count);
  }

  // =========================================================================
  // Internal Helpers
  // =========================================================================

  /**
   * Ensure the scraper is authenticated.
   * @private
   * @throws {AuthenticationError}
   */
  _requireAuth() {
    if (!this._isLoggedIn) {
      throw new AuthenticationError(
        'Not authenticated. Call loadCookies() or setCookies() first.',
        'AUTH_REQUIRED',
      );
    }
  }

  /**
   * Resolve a username to a user ID, with caching.
   * @private
   * @param {string} username - Cleaned username
   * @returns {Promise<string>}
   */
  async _resolveUserId(username) {
    if (this._userIdCache.has(username)) {
      return this._userIdCache.get(username);
    }
    const userId = await usersApi.getUserIdByScreenName(this._http, username);
    this._userIdCache.set(username, userId);
    return userId;
  }
}

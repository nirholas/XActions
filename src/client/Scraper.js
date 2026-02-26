/**
 * XActions Client — Scraper Class
 * The main entry point for programmatic Twitter access via HTTP (no Puppeteer).
 *
 * Compatible with the API surface of the-convocation/twitter-scraper and
 * agent-twitter-client (ElizaOS). Uses Twitter's internal GraphQL API.
 *
 * Usage:
 *   import { Scraper, SearchMode } from 'xactions/client';
 *
 *   const scraper = new Scraper();
 *   await scraper.loadCookies('./cookies.json');
 *   const profile = await scraper.getProfile('elonmusk');
 *   for await (const tweet of scraper.getTweets('elonmusk', 20)) {
 *     console.log(tweet.text);
 *   }
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import fs from 'fs/promises';
import * as usersApi from './api/users.js';
import * as tweetsApi from './api/tweets.js';
import * as searchApi from './api/search.js';
import * as trendsApi from './api/trends.js';
import * as listsApi from './api/lists.js';
import * as dmsApi from './api/dms.js';
import { TokenManager } from './auth/TokenManager.js';
import { BEARER_TOKEN, DEFAULT_FEATURES } from './api/graphqlQueries.js';
import {
  ScraperError,
  AuthenticationError,
  RateLimitError,
  TwitterApiError,
} from './errors.js';
import {
  validateUsername,
  validateTweetId,
  validateTweetText,
  validateCount,
  validateUserId,
  validateListId,
} from './validation.js';

/**
 * Search mode constants for searchTweets.
 * @enum {string}
 */
export const SearchMode = Object.freeze({
  Top: 'Top',
  Latest: 'Latest',
  Photos: 'Photos',
  Videos: 'Videos',
});

// ============================================================================
// Lightweight HTTP Client (inline, replaced by Track 03)
// ============================================================================

/**
 * Minimal HTTP client that wraps fetch with Twitter auth headers.
 * This is a simple implementation that will be replaced by the full
 * HttpClient from Track 03 (src/client/http/HttpClient.js).
 * @private
 */
class SimpleHttpClient {
  constructor(tokenManager, options = {}) {
    this._tokenManager = tokenManager;
    this._cookies = [];
    this._authenticated = false;
    this._fetchFn = options.fetch || globalThis.fetch;
    this._proxy = options.proxy || null;
    this._transform = options.transform || null;
  }

  /**
   * Make a GET request.
   * @param {string} url
   * @returns {Promise<Object>} Parsed JSON response
   */
  async get(url) {
    const headers = this._tokenManager.getHeaders(this._authenticated);
    if (this._cookies.length > 0) {
      headers['Cookie'] = this._cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    }

    let request = { method: 'GET', headers, redirect: 'follow' };
    if (this._transform) request = this._transform(request) || request;

    const response = await this._fetchFn(url, request);
    return this._handleResponse(response, url);
  }

  /**
   * Make a POST request.
   * @param {string} url
   * @param {Object|URLSearchParams} body
   * @param {Object} [options]
   * @returns {Promise<Object>} Parsed JSON response
   */
  async post(url, body, options = {}) {
    const headers = this._tokenManager.getHeaders(this._authenticated);
    if (this._cookies.length > 0) {
      headers['Cookie'] = this._cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    }

    let bodyStr;
    if (body instanceof URLSearchParams) {
      bodyStr = body.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (options.contentType === 'application/x-www-form-urlencoded') {
      bodyStr = body.toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      bodyStr = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
    }

    let request = { method: 'POST', headers, body: bodyStr, redirect: 'follow' };
    if (this._transform) request = this._transform(request) || request;

    const response = await this._fetchFn(url, request);
    return this._handleResponse(response, url);
  }

  /**
   * Handle API response — parse JSON and check for errors.
   * @private
   */
  async _handleResponse(response, url) {
    // Extract rate limit info
    const rateLimit = {
      limit: parseInt(response.headers?.get?.('x-rate-limit-limit'), 10) || null,
      remaining: parseInt(response.headers?.get?.('x-rate-limit-remaining'), 10) || null,
      reset: parseInt(response.headers?.get?.('x-rate-limit-reset'), 10) || null,
    };

    if (response.status === 429) {
      const resetAt = rateLimit.reset ? new Date(rateLimit.reset * 1000) : null;
      throw new RateLimitError('Rate limit exceeded', {
        endpoint: url,
        retryAfter: rateLimit.reset ? rateLimit.reset - Math.floor(Date.now() / 1000) : 60,
        limit: rateLimit.limit,
        remaining: 0,
        resetAt,
      });
    }

    if (response.status === 401 || response.status === 403) {
      // Guest token might be expired
      if (!this._authenticated) {
        this._tokenManager.invalidateGuestToken();
      }
      const text = await response.text().catch(() => '');
      throw new AuthenticationError(
        `Authentication failed: HTTP ${response.status}`,
        response.status === 401 ? 'AUTH_FAILED' : 'AUTH_REQUIRED',
        { endpoint: url, httpStatus: response.status },
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        throw new ScraperError(`HTTP ${response.status}: ${text.slice(0, 200)}`, 'API_ERROR', {
          endpoint: url,
          httpStatus: response.status,
        });
      }
      throw TwitterApiError.fromResponse(body, { endpoint: url, httpStatus: response.status });
    }

    const data = await response.json();

    // Check for GraphQL-level errors
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      // Some responses have both data and errors — only throw if there's no usable data
      if (!data.data) {
        throw TwitterApiError.fromResponse(data, { endpoint: url, httpStatus: response.status });
      }
    }

    return data;
  }

  /**
   * Set cookies array and update auth state.
   * @param {Array<{name: string, value: string}>} cookies
   */
  setCookies(cookies) {
    this._cookies = cookies || [];
    // Check for ct0 (CSRF token) and auth_token
    const ct0 = cookies.find((c) => c.name === 'ct0');
    const authToken = cookies.find((c) => c.name === 'auth_token');
    if (ct0) {
      this._tokenManager.setCsrfToken(ct0.value);
    }
    this._authenticated = !!(ct0 && authToken);
  }

  /**
   * Get current cookies.
   * @returns {Array}
   */
  getCookies() {
    return this._cookies;
  }
}

// ============================================================================
// Scraper Class
// ============================================================================

/**
 * The main entry point for programmatic Twitter/X access.
 * Wraps Twitter's internal GraphQL API without requiring Puppeteer or a browser.
 */
export class Scraper {
  /**
   * @param {Object} [options={}]
   * @param {string|Array} [options.cookies] - Cookies string or array
   * @param {string} [options.proxy] - Proxy URL (http/https/socks5)
   * @param {Function} [options.fetch] - Custom fetch implementation
   * @param {Function} [options.transform] - Request transform function
   */
  constructor(options = {}) {
    /** @private */
    this._tokenManager = new TokenManager(options.fetch);
    /** @private */
    this._http = new SimpleHttpClient(this._tokenManager, options);
    /** @private */
    this._isLoggedIn = false;
    /** @private - Maps username → userId for caching */
    this._userIdCache = new Map();
    /** @private */
    this._options = options;

    // If cookies provided in constructor, load them immediately
    if (options.cookies) {
      if (Array.isArray(options.cookies)) {
        this._http.setCookies(options.cookies);
        this._isLoggedIn = this._http._authenticated;
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // Authentication
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Log in to Twitter with credentials.
   * Note: This is a placeholder — full login flow is implemented in Track 02 (Auth System).
   * For now, use cookie-based auth via setCookies() or loadCookies().
   *
   * @param {{username: string, password: string, email?: string}} credentials
   * @returns {Promise<void>}
   */
  async login(credentials) {
    throw new ScraperError(
      'Username/password login is not yet implemented. Use setCookies() or loadCookies() for cookie-based auth. Full login will be available in the Auth System track.',
      'AUTH_FAILED',
    );
  }

  /**
   * Log out by clearing all auth state.
   *
   * @returns {Promise<void>}
   */
  async logout() {
    this._http.setCookies([]);
    this._isLoggedIn = false;
    this._tokenManager.setCsrfToken(null);
    this._tokenManager.invalidateGuestToken();
  }

  /**
   * Check whether the scraper is currently authenticated.
   *
   * @returns {Promise<boolean>}
   */
  async isLoggedIn() {
    return this._isLoggedIn || this._http._authenticated;
  }

  /**
   * Get the current cookies.
   *
   * @returns {Promise<Array<{name: string, value: string}>>}
   */
  async getCookies() {
    return this._http.getCookies();
  }

  /**
   * Set cookies for authentication.
   *
   * @param {Array<{name: string, value: string}>} cookies
   * @returns {Promise<void>}
   */
  async setCookies(cookies) {
    let parsed = cookies;
    if (typeof cookies === 'string') {
      // Parse cookie string format: "name=value; name2=value2"
      parsed = cookies.split(';').map((pair) => {
        const [name, ...rest] = pair.trim().split('=');
        return { name: name.trim(), value: rest.join('=').trim() };
      }).filter((c) => c.name);
    }
    this._http.setCookies(parsed);
    this._isLoggedIn = this._http._authenticated;
  }

  /**
   * Save current cookies to a JSON file.
   *
   * @param {string} filePath - Absolute or relative file path
   * @returns {Promise<void>}
   */
  async saveCookies(filePath) {
    const cookies = this._http.getCookies();
    await fs.writeFile(filePath, JSON.stringify(cookies, null, 2), 'utf-8');
  }

  /**
   * Load cookies from a JSON file.
   *
   * @param {string} filePath - Path to cookies JSON file
   * @returns {Promise<void>}
   */
  async loadCookies(filePath) {
    const raw = await fs.readFile(filePath, 'utf-8');
    const cookies = JSON.parse(raw);
    await this.setCookies(cookies);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Users
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Get a user's profile by screen name.
   *
   * @param {string} username - Twitter handle (with or without @)
   * @returns {Promise<import('./models/Profile.js').Profile>}
   */
  async getProfile(username) {
    const cleaned = validateUsername(username);
    await this._ensureGuestToken();
    return usersApi.getUserByScreenName(this._http, cleaned);
  }

  /**
   * Get the authenticated user's profile.
   *
   * @returns {Promise<import('./models/Profile.js').Profile>}
   */
  async me() {
    this._requireAuth();
    // The authenticated user's ID can be extracted from cookies or a verify_credentials call
    // As a workaround, try using the auth_token cookie holder
    const cookies = this._http.getCookies();
    const twidCookie = cookies.find((c) => c.name === 'twid');
    if (twidCookie) {
      // twid cookie value is u%3D<userId>
      const match = decodeURIComponent(twidCookie.value).match(/u=(\d+)/);
      if (match) {
        return usersApi.getUserById(this._http, match[1]);
      }
    }
    throw new ScraperError('Cannot determine authenticated user ID. Ensure cookies include twid.', 'AUTH_REQUIRED');
  }

  /**
   * Get a user's followers.
   *
   * @param {string} userId - Numeric user ID
   * @param {number} [count=100] - Maximum number of followers to yield
   * @yields {import('./models/Profile.js').Profile}
   */
  async *getFollowers(userId, count = 100) {
    const validatedId = validateUserId(userId);
    const validatedCount = validateCount(count, 1, 10000);
    await this._ensureGuestToken();
    yield* usersApi.getFollowers(this._http, validatedId, validatedCount);
  }

  /**
   * Get accounts a user follows.
   *
   * @param {string} userId - Numeric user ID
   * @param {number} [count=100] - Maximum number of following to yield
   * @yields {import('./models/Profile.js').Profile}
   */
  async *getFollowing(userId, count = 100) {
    const validatedId = validateUserId(userId);
    const validatedCount = validateCount(count, 1, 10000);
    await this._ensureGuestToken();
    yield* usersApi.getFollowing(this._http, validatedId, validatedCount);
  }

  /**
   * Follow a user.
   *
   * @param {string} username - Twitter handle (with or without @)
   * @returns {Promise<void>}
   */
  async followUser(username) {
    this._requireAuth();
    const cleaned = validateUsername(username);
    const userId = await this._resolveUserId(cleaned);
    return usersApi.followUser(this._http, userId);
  }

  /**
   * Unfollow a user.
   *
   * @param {string} username - Twitter handle (with or without @)
   * @returns {Promise<void>}
   */
  async unfollowUser(username) {
    this._requireAuth();
    const cleaned = validateUsername(username);
    const userId = await this._resolveUserId(cleaned);
    return usersApi.unfollowUser(this._http, userId);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tweets
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Get a single tweet by ID.
   *
   * @param {string} id - Numeric tweet ID
   * @returns {Promise<import('./models/Tweet.js').Tweet>}
   */
  async getTweet(id) {
    const validated = validateTweetId(id);
    await this._ensureGuestToken();
    return tweetsApi.getTweet(this._http, validated);
  }

  /**
   * Get tweets from a user's timeline.
   *
   * @param {string} username - Twitter handle (with or without @)
   * @param {number} [count=40] - Maximum number of tweets to yield
   * @yields {import('./models/Tweet.js').Tweet}
   */
  async *getTweets(username, count = 40) {
    const cleaned = validateUsername(username);
    const validatedCount = validateCount(count, 1, 10000);
    await this._ensureGuestToken();
    const userId = await this._resolveUserId(cleaned);
    yield* tweetsApi.getTweets(this._http, userId, validatedCount);
  }

  /**
   * Get tweets and replies from a user's timeline.
   *
   * @param {string} username - Twitter handle (with or without @)
   * @param {number} [count=40] - Maximum number of tweets to yield
   * @yields {import('./models/Tweet.js').Tweet}
   */
  async *getTweetsAndReplies(username, count = 40) {
    const cleaned = validateUsername(username);
    const validatedCount = validateCount(count, 1, 10000);
    await this._ensureGuestToken();
    const userId = await this._resolveUserId(cleaned);
    yield* tweetsApi.getTweetsAndReplies(this._http, userId, validatedCount);
  }

  /**
   * Get a user's liked tweets.
   *
   * @param {string} username - Twitter handle (with or without @)
   * @param {number} [count=40] - Maximum number of liked tweets to yield
   * @yields {import('./models/Tweet.js').Tweet}
   */
  async *getLikedTweets(username, count = 40) {
    const cleaned = validateUsername(username);
    const validatedCount = validateCount(count, 1, 10000);
    await this._ensureGuestToken();
    const userId = await this._resolveUserId(cleaned);
    yield* tweetsApi.getLikedTweets(this._http, userId, validatedCount);
  }

  /**
   * Get the latest tweet from a user.
   *
   * @param {string} username - Twitter handle (with or without @)
   * @returns {Promise<import('./models/Tweet.js').Tweet|null>}
   */
  async getLatestTweet(username) {
    const cleaned = validateUsername(username);
    await this._ensureGuestToken();
    const userId = await this._resolveUserId(cleaned);
    return tweetsApi.getLatestTweet(this._http, userId);
  }

  /**
   * Post a new tweet.
   *
   * @param {string} text - Tweet text (max 280 characters)
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
   * Post a quote tweet.
   *
   * @param {string} text - Tweet text
   * @param {string} quotedTweetId - ID of the tweet to quote
   * @param {string[]} [mediaIds=[]] - Media entity IDs to attach
   * @returns {Promise<import('./models/Tweet.js').Tweet>}
   */
  async sendQuoteTweet(text, quotedTweetId, mediaIds = []) {
    this._requireAuth();
    validateTweetText(text);
    validateTweetId(quotedTweetId);
    return tweetsApi.sendQuoteTweet(this._http, text, quotedTweetId, mediaIds);
  }

  /**
   * Delete a tweet.
   *
   * @param {string} id - Numeric tweet ID
   * @returns {Promise<void>}
   */
  async deleteTweet(id) {
    this._requireAuth();
    const validated = validateTweetId(id);
    return tweetsApi.deleteTweet(this._http, validated);
  }

  /**
   * Like a tweet.
   *
   * @param {string} id - Numeric tweet ID
   * @returns {Promise<void>}
   */
  async likeTweet(id) {
    this._requireAuth();
    const validated = validateTweetId(id);
    return tweetsApi.likeTweet(this._http, validated);
  }

  /**
   * Unlike a tweet.
   *
   * @param {string} id - Numeric tweet ID
   * @returns {Promise<void>}
   */
  async unlikeTweet(id) {
    this._requireAuth();
    const validated = validateTweetId(id);
    return tweetsApi.unlikeTweet(this._http, validated);
  }

  /**
   * Retweet a tweet.
   *
   * @param {string} id - Numeric tweet ID
   * @returns {Promise<void>}
   */
  async retweet(id) {
    this._requireAuth();
    const validated = validateTweetId(id);
    return tweetsApi.retweet(this._http, validated);
  }

  /**
   * Unretweet (remove retweet of) a tweet.
   *
   * @param {string} id - Numeric tweet ID
   * @returns {Promise<void>}
   */
  async unretweet(id) {
    this._requireAuth();
    const validated = validateTweetId(id);
    return tweetsApi.unretweet(this._http, validated);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Search
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Search tweets.
   *
   * @param {string} query - Search query (supports advanced operators like from:, since:, etc.)
   * @param {number} [count=40] - Maximum number of tweets to yield
   * @param {string} [mode='Latest'] - Search mode: 'Top', 'Latest', 'Photos', 'Videos'
   * @yields {import('./models/Tweet.js').Tweet}
   */
  async *searchTweets(query, count = 40, mode = SearchMode.Latest) {
    if (!query || typeof query !== 'string') {
      throw new ScraperError('Search query is required', 'INVALID_INPUT');
    }
    const validatedCount = validateCount(count, 1, 10000);
    await this._ensureGuestToken();
    yield* searchApi.searchTweets(this._http, query, validatedCount, mode);
  }

  /**
   * Search user profiles.
   *
   * @param {string} query - Search query
   * @param {number} [count=40] - Maximum number of profiles to yield
   * @yields {import('./models/Profile.js').Profile}
   */
  async *searchProfiles(query, count = 40) {
    if (!query || typeof query !== 'string') {
      throw new ScraperError('Search query is required', 'INVALID_INPUT');
    }
    const validatedCount = validateCount(count, 1, 10000);
    await this._ensureGuestToken();
    yield* searchApi.searchProfiles(this._http, query, validatedCount);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Trends
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Get current trending topics.
   *
   * @returns {Promise<Array<{name: string, tweetCount: string, url: string, context: string}>>}
   */
  async getTrends() {
    await this._ensureGuestToken();
    return trendsApi.getTrends(this._http);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Lists
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Get tweets from a Twitter List.
   *
   * @param {string} listId - Numeric list ID
   * @param {number} [count=40] - Maximum number of tweets to yield
   * @yields {import('./models/Tweet.js').Tweet}
   */
  async *getListTweets(listId, count = 40) {
    const validated = validateListId(listId);
    const validatedCount = validateCount(count, 1, 10000);
    await this._ensureGuestToken();
    yield* listsApi.getListTweets(this._http, validated, validatedCount);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Direct Messages
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Send a direct message to a user.
   *
   * @param {string} userId - Target user's numeric ID
   * @param {string} text - Message text
   * @returns {Promise<void>}
   */
  async sendDm(userId, text) {
    this._requireAuth();
    validateUserId(userId);
    if (!text || typeof text !== 'string') {
      throw new ScraperError('DM text is required', 'INVALID_INPUT');
    }
    await dmsApi.sendDmToUser(this._http, userId, text);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Ensure a guest token is available for unauthenticated requests.
   * @private
   */
  async _ensureGuestToken() {
    if (this._http._authenticated) return; // Uses CSRF token instead
    await this._tokenManager.getGuestToken();
  }

  /**
   * Throw if not authenticated.
   * @private
   */
  _requireAuth() {
    if (!this._http._authenticated && !this._isLoggedIn) {
      throw new AuthenticationError(
        'Not authenticated. Call setCookies() or loadCookies() first.',
        'AUTH_REQUIRED',
      );
    }
  }

  /**
   * Resolve a username to a numeric user ID, with caching.
   * @private
   * @param {string} username - Cleaned username (without @)
   * @returns {Promise<string>}
   */
  async _resolveUserId(username) {
    const cached = this._userIdCache.get(username.toLowerCase());
    if (cached) return cached;

    const userId = await usersApi.getUserIdByScreenName(this._http, username);
    this._userIdCache.set(username.toLowerCase(), userId);
    return userId;
  }
}

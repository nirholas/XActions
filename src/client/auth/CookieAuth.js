/**
 * XActions Client — Cookie Authentication
 * Main authentication class that combines CookieJar, CredentialAuth, and TokenManager.
 * This is the primary auth interface used by the Scraper class.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { CookieJar } from './CookieJar.js';
import { CredentialAuth } from './CredentialAuth.js';
import { TokenManager } from './TokenManager.js';
import {
  updateJarFromResponse,
  extractCsrfToken,
  extractUserId,
} from './CookieParser.js';
import { AuthenticationError } from '../errors.js';

const DEFAULT_COOKIE_PATH = join(homedir(), '.xactions', 'cookies.json');

/**
 * Main authentication class for the Scraper.
 * Manages cookies, tokens, and login flows.
 */
export class CookieAuth {
  /**
   * @param {Object} http - HttpClient or fetch function
   */
  constructor(http) {
    /** @private */
    this._http = http;
    /** @type {CookieJar} */
    this._cookieJar = new CookieJar();
    /** @type {TokenManager} */
    this._tokenManager = new TokenManager(
      http.fetch ? http.fetch.bind(http) : http,
    );
    /** @type {CredentialAuth} */
    this._credentialAuth = new CredentialAuth(http, this._tokenManager);
    /** @type {string|null} */
    this._authenticatedUserId = null;
  }

  /**
   * Login with username and password.
   *
   * @param {Object} credentials
   * @param {string} credentials.username
   * @param {string} credentials.password
   * @param {string} [credentials.email]
   * @param {string} [credentials.twoFactorCode]
   * @param {Function} [credentials.onTwoFactorRequired]
   * @returns {Promise<void>}
   * @throws {AuthenticationError}
   */
  async login({ username, password, email, twoFactorCode, onTwoFactorRequired }) {
    const cookies = await this._credentialAuth.login(username, password, email, {
      twoFactorCode,
      onTwoFactorRequired,
    });

    // Update our cookie jar with login cookies
    for (const cookie of cookies.getAll()) {
      this._cookieJar.set(cookie);
    }

    // Extract CSRF token from ct0 cookie
    const csrfToken = extractCsrfToken(this._cookieJar);
    if (csrfToken) {
      this._tokenManager.setCsrfToken(csrfToken);
    }

    // Extract user ID from twid cookie
    const userId = extractUserId(this._cookieJar);
    if (userId) {
      this._authenticatedUserId = userId;
    }

    console.log(`✅ Logged in as @${username}`);
  }

  /**
   * Login using existing cookies (no password required).
   * Accepts CookieJar, Array<Cookie>, or JSON string.
   *
   * @param {CookieJar|Array|string} cookies
   * @returns {Promise<void>}
   * @throws {AuthenticationError}
   */
  async loginWithCookies(cookies) {
    if (typeof cookies === 'string') {
      try {
        const parsed = JSON.parse(cookies);
        this._cookieJar = CookieJar.fromJSON(parsed);
      } catch {
        throw new AuthenticationError('Invalid cookie JSON string', 'INVALID_COOKIES');
      }
    } else if (cookies instanceof CookieJar) {
      this._cookieJar = cookies.clone();
    } else if (Array.isArray(cookies)) {
      this._cookieJar = new CookieJar(cookies);
    } else {
      throw new AuthenticationError('Invalid cookies format', 'INVALID_COOKIES');
    }

    // Extract CSRF token
    const csrfToken = extractCsrfToken(this._cookieJar);
    if (csrfToken) {
      this._tokenManager.setCsrfToken(csrfToken);
    }

    // Extract user ID
    const userId = extractUserId(this._cookieJar);
    if (userId) {
      this._authenticatedUserId = userId;
    }

    // Validate the session
    await this._validateSession();
  }

  /**
   * Validate the current session by calling verify_credentials.
   * @private
   * @throws {AuthenticationError}
   */
  async _validateSession() {
    try {
      const fetchFn = this._http.fetch ? this._http.fetch.bind(this._http) : this._http;
      const response = await fetchFn(
        'https://x.com/i/api/1.1/account/verify_credentials.json',
        {
          method: 'GET',
          headers: this.getHeaders(),
        },
      );

      if (!response.ok) {
        throw new AuthenticationError(
          'Cookie session is invalid or expired',
          'INVALID_COOKIES',
          { httpStatus: response.status },
        );
      }

      const data = await response.json();
      if (data.id_str) {
        this._authenticatedUserId = data.id_str;
      }

      // Update cookies from response
      updateJarFromResponse(this._cookieJar, response);
    } catch (err) {
      if (err instanceof AuthenticationError) throw err;
      throw new AuthenticationError(
        'Failed to validate session: ' + err.message,
        'INVALID_COOKIES',
      );
    }
  }

  /**
   * Check if the user is authenticated.
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!(
      this._authenticatedUserId &&
      this._cookieJar.has('auth_token') &&
      !this._cookieJar.isExpired('auth_token')
    );
  }

  /**
   * Get the authenticated user's ID.
   * @returns {string}
   * @throws {AuthenticationError}
   */
  getAuthenticatedUserId() {
    if (!this._authenticatedUserId) {
      throw new AuthenticationError('Not authenticated', 'AUTH_REQUIRED');
    }
    return this._authenticatedUserId;
  }

  /**
   * Get the current CookieJar.
   * @returns {CookieJar}
   */
  getCookies() {
    return this._cookieJar;
  }

  /**
   * Replace the cookie jar contents.
   * @param {Array<import('./CookieJar.js').Cookie>} cookies
   */
  setCookies(cookies) {
    this._cookieJar = new CookieJar(cookies);
    const csrfToken = extractCsrfToken(this._cookieJar);
    if (csrfToken) {
      this._tokenManager.setCsrfToken(csrfToken);
    }
    const userId = extractUserId(this._cookieJar);
    if (userId) {
      this._authenticatedUserId = userId;
    }
  }

  /**
   * Save cookies to a JSON file.
   * @param {string} [filePath] - Defaults to ~/.xactions/cookies.json
   * @param {Object} [options]
   * @param {boolean} [options.encrypt]
   * @param {string} [options.password]
   */
  async saveCookies(filePath = DEFAULT_COOKIE_PATH, options = {}) {
    // Encryption support will be added via Encryption.js
    await this._cookieJar.saveToFile(filePath);
  }

  /**
   * Load cookies from a JSON file.
   * @param {string} [filePath] - Defaults to ~/.xactions/cookies.json
   */
  async loadCookies(filePath = DEFAULT_COOKIE_PATH) {
    const jar = await CookieJar.loadFromFile(filePath);
    if (jar.size > 0) {
      this._cookieJar = jar;
      const csrfToken = extractCsrfToken(this._cookieJar);
      if (csrfToken) {
        this._tokenManager.setCsrfToken(csrfToken);
      }
      const userId = extractUserId(this._cookieJar);
      if (userId) {
        this._authenticatedUserId = userId;
      }
    }
  }

  /**
   * Build headers for authenticated Twitter API requests.
   * @returns {Object}
   */
  getHeaders() {
    const isAuth = this.isAuthenticated();
    return {
      ...this._tokenManager.getHeaders(isAuth),
      Cookie: this._cookieJar.toCookieString(),
      ...(isAuth && this._cookieJar.getValue('ct0')
        ? { 'x-csrf-token': this._cookieJar.getValue('ct0') }
        : {}),
    };
  }

  /**
   * Refresh the CSRF token from the latest ct0 cookie.
   */
  async refreshCsrf() {
    const ct0 = this._cookieJar.getValue('ct0');
    if (ct0) {
      this._tokenManager.setCsrfToken(ct0);
    }
  }

  /**
   * Logout and clear all auth state.
   */
  logout() {
    this._cookieJar.clear();
    this._authenticatedUserId = null;
    this._tokenManager.setCsrfToken(null);
    this._tokenManager.invalidateGuestToken();
  }

  /**
   * Get the TokenManager instance.
   * @returns {TokenManager}
   */
  getTokenManager() {
    return this._tokenManager;
  }

  /**
   * Update cookie jar from an HTTP response.
   * Should be called after every API request.
   * @param {Response} response
   */
  updateFromResponse(response) {
    updateJarFromResponse(this._cookieJar, response);
    // Refresh CSRF if ct0 changed
    const ct0 = this._cookieJar.getValue('ct0');
    if (ct0) {
      this._tokenManager.setCsrfToken(ct0);
    }
  }
}

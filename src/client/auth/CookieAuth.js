/**
 * XActions Client — Cookie-Based Authentication
 *
 * Manages authentication via browser cookies (ct0, auth_token, twid).
 * This is the primary auth method: export cookies from a logged-in browser session,
 * then load them for programmatic access.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { CookieJar } from './CookieJar.js';
import { extractCsrfToken, extractUserId, extractAuthToken, updateJarFromResponse } from './CookieParser.js';
import { AuthenticationError } from '../errors.js';

/**
 * Cookie-based authentication manager.
 * Loads cookies from file or array, validates them, and provides auth headers.
 */
export class CookieAuth {
  /**
   * @param {import('./TokenManager.js').TokenManager} tokenManager
   */
  constructor(tokenManager) {
    /** @private */
    this._tokenManager = tokenManager;
    /** @type {CookieJar} */
    this.jar = new CookieJar();
    /** @private */
    this._authenticated = false;
  }

  /**
   * Check if the auth state is valid (has both ct0 and auth_token).
   *
   * @returns {boolean}
   */
  isAuthenticated() {
    const ct0 = this.jar.getValue('ct0');
    const authToken = this.jar.getValue('auth_token');
    return !!(ct0 && authToken);
  }

  /**
   * Get the authenticated user's ID from the twid cookie.
   *
   * @returns {string|null}
   */
  getAuthenticatedUserId() {
    return extractUserId(this.jar);
  }

  /**
   * Set cookies from an array of {name, value} objects or a cookie string.
   *
   * @param {Array<{name: string, value: string}>|string} cookies
   */
  setCookies(cookies) {
    if (typeof cookies === 'string') {
      // Parse "name=value; name2=value2" format
      const pairs = cookies.split(';').map((pair) => {
        const [name, ...rest] = pair.trim().split('=');
        return { name: name.trim(), value: rest.join('=').trim() };
      }).filter((c) => c.name);
      for (const c of pairs) {
        this.jar.set(c);
      }
    } else if (Array.isArray(cookies)) {
      for (const c of cookies) {
        if (c && c.name) this.jar.set(c);
      }
    }

    this._syncTokens();
  }

  /**
   * Get cookies as a flat array of {name, value} for the SimpleHttpClient.
   *
   * @returns {Array<{name: string, value: string}>}
   */
  getCookies() {
    return this.jar.getAll().map((c) => ({ name: c.name, value: c.value }));
  }

  /**
   * Get the Cookie header string for HTTP requests.
   *
   * @returns {string}
   */
  getCookieString() {
    return this.jar.toCookieString();
  }

  /**
   * Save cookies to a JSON file.
   *
   * @param {string} filePath
   * @returns {Promise<void>}
   */
  async saveCookies(filePath) {
    await this.jar.saveToFile(filePath);
  }

  /**
   * Load cookies from a JSON file.
   *
   * @param {string} filePath
   * @returns {Promise<void>}
   */
  async loadCookies(filePath) {
    this.jar = await CookieJar.loadFromFile(filePath);
    this._syncTokens();
  }

  /**
   * Update the jar from a fetch response's Set-Cookie headers.
   *
   * @param {Response} response
   */
  updateFromResponse(response) {
    updateJarFromResponse(this.jar, response);
    this._syncTokens();
  }

  /**
   * Clear all cookies and reset auth state.
   */
  clear() {
    this.jar.clear();
    this._authenticated = false;
    this._tokenManager.setCsrfToken(null);
  }

  /**
   * Sync token manager with current cookie state.
   * @private
   */
  _syncTokens() {
    const ct0 = extractCsrfToken(this.jar);
    if (ct0) {
      this._tokenManager.setCsrfToken(ct0);
    }
    this._authenticated = this.isAuthenticated();
  }
}

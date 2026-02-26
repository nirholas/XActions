/**
 * XActions Client — Token Manager
 * Manages bearer token, guest token, and CSRF token for Twitter API requests.
 *
 * Twitter requires:
 *   1. Bearer token (public, hardcoded) — used in every request
 *   2. Guest token (dynamic, ~3-hour TTL) — for unauthenticated access
 *   3. CSRF token (ct0 cookie) — for authenticated requests
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { BEARER_TOKEN } from '../api/graphqlQueries.js';
import { ScraperError, RateLimitError } from '../errors.js';

const GUEST_TOKEN_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Manages authentication tokens for Twitter API access.
 */
export class TokenManager {
  /**
   * @param {Function} [fetchFn=fetch] - Fetch implementation to use for token requests
   */
  constructor(fetchFn) {
    /** @type {string} */
    this.bearerToken = BEARER_TOKEN;
    /** @type {string|null} */
    this.guestToken = null;
    /** @type {number|null} */
    this.guestTokenExpiresAt = null;
    /** @type {string|null} */
    this.csrfToken = null;
    /** @private */
    this._fetch = fetchFn || globalThis.fetch;
    /** @private */
    this._activating = null;
  }

  /**
   * Activate a new guest token from Twitter's API.
   *
   * @returns {Promise<string>} The new guest token
   * @throws {ScraperError} If activation fails
   */
  async activateGuestToken() {
    // Deduplicate concurrent activations
    if (this._activating) return this._activating;

    this._activating = (async () => {
      try {
        const response = await this._fetch('https://api.x.com/1.1/guest/activate.json', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new RateLimitError('Guest token rate limited');
          }
          throw new ScraperError(
            `Failed to activate guest token: HTTP ${response.status}`,
            'TOKEN_ERROR',
            { httpStatus: response.status },
          );
        }

        const data = await response.json();
        if (!data.guest_token) {
          throw new ScraperError('No guest_token in activate response', 'TOKEN_ERROR');
        }

        this.guestToken = data.guest_token;
        this.guestTokenExpiresAt = Date.now() + GUEST_TOKEN_TTL_MS;
        return this.guestToken;
      } finally {
        this._activating = null;
      }
    })();

    return this._activating;
  }

  /**
   * Get a valid guest token, activating a new one if needed.
   *
   * @returns {Promise<string>} Valid guest token
   */
  async getGuestToken() {
    if (this.isGuestTokenValid()) return this.guestToken;
    return this.activateGuestToken();
  }

  /**
   * Build the HTTP headers that Twitter expects for API requests.
   *
   * @param {boolean} [authenticated=false] - Whether to send authenticated headers (CSRF + auth type)
   * @returns {Object} Headers object
   */
  getHeaders(authenticated = false) {
    const headers = {
      Authorization: `Bearer ${this.bearerToken}`,
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
      'Content-Type': 'application/json',
    };

    if (authenticated && this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
      headers['x-twitter-auth-type'] = 'OAuth2Session';
    } else if (this.guestToken) {
      headers['x-guest-token'] = this.guestToken;
      headers['x-twitter-auth-type'] = '';
    }

    return headers;
  }

  /**
   * Set the CSRF token (extracted from the ct0 cookie).
   *
   * @param {string} token - CSRF token value
   */
  setCsrfToken(token) {
    this.csrfToken = token || null;
  }

  /**
   * Check whether the current guest token is still valid.
   *
   * @returns {boolean}
   */
  isGuestTokenValid() {
    return !!(this.guestToken && this.guestTokenExpiresAt && Date.now() < this.guestTokenExpiresAt);
  }

  /**
   * Invalidate the current guest token, forcing a refresh on the next request.
   */
  invalidateGuestToken() {
    this.guestToken = null;
    this.guestTokenExpiresAt = null;
  }
}

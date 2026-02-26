/**
 * XActions Client — Token Manager
 *
 * Manages bearer tokens and guest tokens for Twitter API access.
 * Twitter requires a public bearer token for all requests and a guest
 * token for unauthenticated access.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { BEARER_TOKEN } from '../api/graphqlQueries.js';
import { AuthenticationError, RateLimitError } from '../errors.js';

/** Guest tokens expire after approximately 3 hours. */
const GUEST_TOKEN_TTL_MS = 3 * 60 * 60 * 1000;

/**
 * Manages authentication tokens for Twitter API requests.
 */
export class TokenManager {
  /**
   * @param {Function} [fetchFn] - Custom fetch implementation (defaults to globalThis.fetch)
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
    this._fetchFn = fetchFn || globalThis.fetch;
    /** @private - Prevents concurrent guest token requests */
    this._activatingPromise = null;
  }

  /**
   * Activate a new guest token from Twitter.
   *
   * @returns {Promise<string>} The guest token
   * @throws {AuthenticationError} If activation fails
   */
  async activateGuestToken() {
    const response = await this._fetchFn('https://api.x.com/1.1/guest/activate.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
      },
    });

    if (response.status === 429) {
      throw new RateLimitError('Rate limited while activating guest token', {
        endpoint: 'guest/activate',
      });
    }

    if (!response.ok) {
      throw new AuthenticationError(
        `Failed to activate guest token: HTTP ${response.status}`,
        'AUTH_FAILED',
        { endpoint: 'guest/activate', httpStatus: response.status },
      );
    }

    const data = await response.json();
    if (!data.guest_token) {
      throw new AuthenticationError(
        'Guest token activation returned empty token',
        'AUTH_FAILED',
      );
    }

    this.guestToken = data.guest_token;
    this.guestTokenExpiresAt = Date.now() + GUEST_TOKEN_TTL_MS;
    return this.guestToken;
  }

  /**
   * Get a valid guest token, activating one if needed.
   * Prevents concurrent activation requests.
   *
   * @returns {Promise<string>}
   */
  async getGuestToken() {
    if (this.isGuestTokenValid()) {
      return this.guestToken;
    }

    // Deduplicate concurrent requests
    if (this._activatingPromise) {
      return this._activatingPromise;
    }

    this._activatingPromise = this.activateGuestToken().finally(() => {
      this._activatingPromise = null;
    });

    return this._activatingPromise;
  }

  /**
   * Check if the current guest token is still valid.
   *
   * @returns {boolean}
   */
  isGuestTokenValid() {
    if (!this.guestToken) return false;
    if (!this.guestTokenExpiresAt) return false;
    return Date.now() < this.guestTokenExpiresAt;
  }

  /**
   * Invalidate the current guest token, forcing a refresh on next use.
   */
  invalidateGuestToken() {
    this.guestToken = null;
    this.guestTokenExpiresAt = null;
  }

  /**
   * Set the CSRF token (from ct0 cookie after login).
   *
   * @param {string|null} token
   */
  setCsrfToken(token) {
    this.csrfToken = token || null;
  }

  /**
   * Build the HTTP headers required for Twitter API requests.
   *
   * @param {boolean} [authenticated=false] - Whether this is an authenticated request
   * @returns {Object} Headers object
   */
  getHeaders(authenticated = false) {
    const headers = {
      Authorization: `Bearer ${this.bearerToken}`,
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
    };

    if (authenticated && this.csrfToken) {
      headers['x-csrf-token'] = this.csrfToken;
      headers['x-twitter-auth-type'] = 'OAuth2Session';
    } else if (this.guestToken) {
      headers['x-guest-token'] = this.guestToken;
    }

    return headers;
  }
}

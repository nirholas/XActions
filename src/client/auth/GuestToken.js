/**
 * XActions Client — GuestToken
 *
 * Manages Twitter guest tokens for unauthenticated API access.
 * Guest tokens allow reading public data without logging in.
 * They expire after ~3 hours and must be rotated.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { BEARER_TOKEN } from '../api/graphqlQueries.js';

const ACTIVATE_URL = 'https://api.x.com/1.1/guest/activate.json';

/** Default guest token TTL: 3 hours */
const DEFAULT_MAX_AGE = 3 * 60 * 60 * 1000;

// ============================================================================
// GuestToken Class
// ============================================================================

/**
 * Manages guest token lifecycle for unauthenticated Twitter API access.
 */
export class GuestToken {
  /**
   * @param {Object} [options]
   * @param {number} [options.maxAge=10800000] - Token TTL in ms (default 3h)
   * @param {Function} [options.fetch] - Custom fetch implementation
   */
  constructor(options = {}) {
    /** @private */
    this._maxAge = options.maxAge || DEFAULT_MAX_AGE;
    /** @private @type {string|null} */
    this._token = null;
    /** @private @type {number|null} */
    this._activatedAt = null;
    /** @private */
    this._fetchFn = options.fetch || globalThis.fetch;
  }

  /**
   * Activate a new guest token.
   * POST https://api.x.com/1.1/guest/activate.json
   *
   * @returns {Promise<string>} The activated guest token
   * @throws {Error} If activation fails
   */
  async activate() {
    const response = await this._fetchFn(ACTIVATE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
      },
    });

    // Handle rate limiting with one retry
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));

      const retryResponse = await this._fetchFn(ACTIVATE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
        },
      });

      if (retryResponse.status === 429) {
        throw new Error(`Guest token activation rate limited after retry (429)`);
      }

      if (!retryResponse.ok) {
        const text = await retryResponse.text().catch(() => '');
        throw new Error(`Guest token activation failed on retry: HTTP ${retryResponse.status} — ${text.slice(0, 200)}`);
      }

      const retryData = await retryResponse.json();
      this._token = retryData.guest_token;
      this._activatedAt = Date.now();
      return this._token;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Guest token activation failed: HTTP ${response.status} — ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    this._token = data.guest_token;
    this._activatedAt = Date.now();
    return this._token;
  }

  /**
   * Get the current guest token (may be null or expired).
   * @returns {string|null}
   */
  getToken() {
    return this._token;
  }

  /**
   * Check if the current token is expired or not set.
   * @returns {boolean}
   */
  isExpired() {
    if (!this._token || !this._activatedAt) return true;
    return Date.now() - this._activatedAt > this._maxAge;
  }

  /**
   * Ensure a valid guest token exists, activating a new one if expired.
   * @returns {Promise<string>} A valid guest token
   */
  async ensureValid() {
    if (this.isExpired()) {
      await this.activate();
    }
    return this._token;
  }

  /**
   * Get headers for unauthenticated (guest) requests.
   * @returns {{ 'x-guest-token': string, Authorization: string }}
   */
  getHeaders() {
    return {
      'x-guest-token': this._token || '',
      'Authorization': `Bearer ${BEARER_TOKEN}`,
    };
  }

  /**
   * Clear the stored token, forcing re-activation on next use.
   */
  reset() {
    this._token = null;
    this._activatedAt = null;
  }
}

export default GuestToken;

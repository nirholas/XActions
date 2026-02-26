/**
 * XActions Client — Token Manager
 *
 * Coordinates bearer token, guest token, and CSRF token for Twitter API requests.
 * Twitter requires two tokens for unauthenticated (guest) access:
 *   1. Bearer token (hardcoded, public) — embedded in Twitter's web client JS
 *   2. Guest token (dynamic, per session) — obtained from activate.json endpoint
 *
 * For authenticated requests, a CSRF token (ct0 cookie) replaces the guest token.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { BEARER_TOKEN } from '../api/graphqlQueries.js';

const ACTIVATE_URL = 'https://api.x.com/1.1/guest/activate.json';

/** Guest tokens last approximately 3 hours */
const GUEST_TOKEN_MAX_AGE = 3 * 60 * 60 * 1000;

// ============================================================================
// TokenManager Class
// ============================================================================

/**
 * Manages authentication tokens for Twitter API requests.
 * Handles guest token lifecycle (activation, expiry, rotation) and
 * provides properly formatted HTTP headers for both guest and authenticated modes.
 */
export class TokenManager {
  /**
   * @param {Function} [fetchFn] - Custom fetch implementation (defaults to globalThis.fetch)
   */
  constructor(fetchFn) {
    /** @type {string} The public Twitter bearer token */
    this.bearerToken = BEARER_TOKEN;
    /** @type {string|null} Current guest token */
    this.guestToken = null;
    /** @type {number|null} Timestamp when guest token expires */
    this.guestTokenExpiresAt = null;
    /** @type {string|null} CSRF token for authenticated requests (from ct0 cookie) */
    this.csrfToken = null;
    /** @private */
    this._fetchFn = fetchFn || globalThis.fetch;
  }

  /**
   * Activate a new guest token from Twitter's activation endpoint.
   * POST https://api.x.com/1.1/guest/activate.json
   *
   * Guest tokens are rate-limited. If you get a 429, this method waits
   * and retries once before throwing.
   *
   * @returns {Promise<string>} The activated guest token
   * @throws {Error} If activation fails or is rate-limited
   */
  async activateGuestToken() {
    const response = await this._fetchFn(ACTIVATE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.bearerToken}` },
    });

    // Handle rate limiting with one retry
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));

      const retryResponse = await this._fetchFn(ACTIVATE_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.bearerToken}` },
      });

      if (!retryResponse.ok) {
        const text = await retryResponse.text().catch(() => '');
        throw new Error(
          `Guest token activation rate limited: HTTP ${retryResponse.status} — ${text.slice(0, 200)}`,
        );
      }

      const retryData = await retryResponse.json();
      this.guestToken = retryData.guest_token;
      this.guestTokenExpiresAt = Date.now() + GUEST_TOKEN_MAX_AGE;
      return this.guestToken;
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Guest token activation failed: HTTP ${response.status} — ${text.slice(0, 200)}`,
      );
    }

    const data = await response.json();
    this.guestToken = data.guest_token;
    this.guestTokenExpiresAt = Date.now() + GUEST_TOKEN_MAX_AGE;
    return this.guestToken;
  }

  /**
   * Get a valid guest token, activating a new one if the current token
   * is missing or expired.
   *
   * @returns {Promise<string>} A valid guest token
   */
  async getGuestToken() {
    if (this.isGuestTokenValid()) return this.guestToken;
    return this.activateGuestToken();
  }

  /**
   * Build the HTTP headers that Twitter expects for API requests.
   *
   * @param {boolean} [authenticated=false] - Whether this is an authenticated request
   * @returns {Object} Headers object ready for fetch()
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
    }

    return headers;
  }

  /**
   * Set the CSRF token (extracted from the ct0 cookie after login).
   *
   * @param {string|null} token - CSRF token value, or null to clear
   */
  setCsrfToken(token) {
    this.csrfToken = token;
  }

  /**
   * Check if the current guest token exists and hasn't expired.
   *
   * @returns {boolean}
   */
  isGuestTokenValid() {
    return !!(
      this.guestToken &&
      this.guestTokenExpiresAt &&
      Date.now() < this.guestTokenExpiresAt
    );
  }

  /**
   * Invalidate the current guest token, forcing re-activation on next request.
   */
  invalidateGuestToken() {
    this.guestToken = null;
    this.guestTokenExpiresAt = null;
  }
}

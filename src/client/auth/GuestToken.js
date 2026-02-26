/**
 * XActions Client — GuestToken
 *
 * Manages Twitter guest tokens for unauthenticated API access.
 * Guest tokens allow limited read-only access to public data without login.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Constants
// ============================================================================

/** Twitter's public bearer token — embedded in the web client JavaScript */
const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

/** Guest token activation endpoint */
const ACTIVATE_URL = 'https://api.x.com/1.1/guest/activate.json';

/** Default token lifespan: 3 hours */
const DEFAULT_MAX_AGE = 3 * 60 * 60 * 1000;

// ============================================================================
// GuestToken Class
// ============================================================================

/**
 * Manages Twitter guest tokens for unauthenticated API access.
 *
 * Usage:
 *   const guest = new GuestToken();
 *   await guest.ensureValid();
 *   const headers = guest.getHeaders();
 */
export class GuestToken {
  /** @type {string|null} */
  #token;

  /** @type {number|null} */
  #activatedAt;

  /** @type {number} Max age in ms before token is considered expired */
  #maxAge;

  /**
   * @param {Object} [options]
   * @param {number} [options.maxAge=10800000] - Token lifespan in ms (default: 3 hours)
   */
  constructor(options = {}) {
    this.#token = null;
    this.#activatedAt = null;
    this.#maxAge = options.maxAge ?? DEFAULT_MAX_AGE;
  }

  /**
   * Activate a new guest token from Twitter.
   * POST https://api.x.com/1.1/guest/activate.json with bearer auth.
   *
   * @returns {Promise<string>} The activated guest token
   * @throws {Error} If activation fails
   */
  async activate() {
    const response = await fetch(ACTIVATE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
      },
    });

    // Handle rate limiting — retry once after Retry-After delay
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
      const waitMs = retryAfter * 1000;
      await new Promise(resolve => setTimeout(resolve, waitMs));

      const retryResponse = await fetch(ACTIVATE_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
        },
      });

      if (retryResponse.status === 429) {
        throw new Error(
          `Guest token activation rate limited (429). Retry-After: ${retryAfter}s. Try again later.`
        );
      }

      if (!retryResponse.ok) {
        const body = await retryResponse.text().catch(() => '');
        throw new Error(
          `Guest token activation failed on retry: HTTP ${retryResponse.status} — ${body}`
        );
      }

      const retryData = await retryResponse.json();
      this.#token = retryData.guest_token;
      this.#activatedAt = Date.now();
      return this.#token;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Guest token activation failed: HTTP ${response.status} — ${body}`
      );
    }

    const data = await response.json();
    if (!data.guest_token) {
      throw new Error('Guest token activation response missing guest_token field');
    }

    this.#token = data.guest_token;
    this.#activatedAt = Date.now();
    return this.#token;
  }

  /**
   * Get the current guest token.
   * @returns {string|null} Token string or null if not activated
   */
  getToken() {
    return this.#token;
  }

  /**
   * Check if the current token is expired or not yet activated.
   * @returns {boolean}
   */
  isExpired() {
    if (!this.#token || !this.#activatedAt) return true;
    return Date.now() - this.#activatedAt >= this.#maxAge;
  }

  /**
   * Ensure the token is valid — activates a new one if expired.
   * @returns {Promise<string>} Valid guest token
   */
  async ensureValid() {
    if (this.isExpired()) {
      await this.activate();
    }
    return this.#token;
  }

  /**
   * Get headers for unauthenticated (guest) requests.
   * @returns {{ 'x-guest-token': string, 'Authorization': string }}
   */
  getHeaders() {
    return {
      'x-guest-token': this.#token || '',
      'Authorization': `Bearer ${BEARER_TOKEN}`,
    };
  }

  /**
   * Clear the stored token, forcing re-activation on next ensureValid().
   */
  reset() {
    this.#token = null;
    this.#activatedAt = null;
  }
}

export default GuestToken;

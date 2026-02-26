/**
 * Guest Token Manager — Unauthenticated access to Twitter's public API
 *
 * Acquires and manages guest tokens that enable scraping public profiles,
 * tweets, and search results without any login credentials.
 *
 * Guest tokens are obtained via POST to Twitter's guest/activate endpoint
 * using the public bearer token embedded in Twitter's web client JS bundle.
 *
 * Features:
 *   - Token acquisition with caching (tokens valid ~3 hours)
 *   - Concurrent-safe activation (thundering-herd prevention)
 *   - Token pool with round-robin rotation for rate-limit distribution
 *   - Per-token rate-limit tracking with auto-rotation
 *   - User-Agent rotation
 *
 * @module scrapers/twitter/http/guest
 * @author nich (@nichxbt)
 * @license MIT
 */

// ============================================================================
// Constants
// ============================================================================

/**
 * Public bearer token embedded in Twitter's web client JS bundle.
 * Same token used by the-convocation/twitter-scraper, d60/twikit, and others.
 */
const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

/** Guest token expiry window — 2.5 hours (tokens actually expire at ~3h) */
const TOKEN_TTL_MS = 2.5 * 60 * 60 * 1000;

/** Rate-limit window (15 minutes in ms) */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Per-endpoint default rate limits for guest tokens.
 * Guest tokens have stricter limits than authenticated sessions.
 */
const GUEST_RATE_LIMITS = {
  search: 50,
  profile: 100,
  tweet: 100,
};

/** Realistic Chrome user agents for rotation */
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

// ============================================================================
// Helpers
// ============================================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Pick a random user agent from the pool.
 * @returns {string}
 */
const randomUserAgent = () =>
  USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// ============================================================================
// GuestToken — wraps a single token with metadata
// ============================================================================

/**
 * Single guest token with metadata for expiry and rate-limit tracking.
 */
class GuestToken {
  /** @type {string} */
  value;

  /** @type {number} Unix ms timestamp when token was created */
  createdAt;

  /**
   * Per-endpoint rate-limit state.
   * @type {Map<string, { remaining: number, resetAt: number }>}
   */
  rateLimits = new Map();

  /**
   * @param {string} value  The raw guest token string
   * @param {number} [createdAt]  Override creation timestamp (ms)
   */
  constructor(value, createdAt = Date.now()) {
    this.value = value;
    this.createdAt = createdAt;
  }

  /** @returns {boolean} true if the token has exceeded its TTL */
  isExpired() {
    return Date.now() - this.createdAt >= TOKEN_TTL_MS;
  }

  /**
   * Record a rate-limit observation from response headers.
   * @param {string} endpoint  Logical endpoint name (search|profile|tweet)
   * @param {number} remaining  Remaining requests in window
   * @param {number} resetAt    Unix ms timestamp when window resets
   */
  recordRateLimit(endpoint, remaining, resetAt) {
    this.rateLimits.set(endpoint, { remaining, resetAt });
  }

  /**
   * Check whether this token has available capacity for an endpoint.
   * @param {string} endpoint  Logical endpoint name
   * @returns {boolean}
   */
  hasCapacity(endpoint) {
    const rl = this.rateLimits.get(endpoint);
    if (!rl) return true;
    // If the window has reset, capacity is available
    if (Date.now() >= rl.resetAt) return true;
    return rl.remaining > 0;
  }
}

// ============================================================================
// GuestTokenManager
// ============================================================================

/**
 * Manages guest token lifecycle: acquisition, caching, pooling, rate-limit
 * distribution, and header construction.
 *
 * @example
 * ```js
 * const guest = new GuestTokenManager();
 * const headers = await guest.getHeaders();
 * const res = await fetch(url, { headers });
 * ```
 *
 * @example Token pool usage
 * ```js
 * const guest = new GuestTokenManager({ poolSize: 3 });
 * // Pool will auto-fill on first use, or pre-fill:
 * await guest.fillPool();
 * const token = guest.getNextToken('search');
 * ```
 */
export class GuestTokenManager {
  // -- Private state ---------------------------------------------------------

  /** @type {GuestToken|null} Current primary token */
  #currentToken = null;

  /** @type {Promise<GuestToken>|null} In-flight activation (thundering-herd guard) */
  #activationPromise = null;

  /** @type {GuestToken[]} Pool of guest tokens for rate-limit distribution */
  #pool = [];

  /** @type {number} Round-robin index into the pool */
  #poolIndex = 0;

  /** @type {number} Desired pool size (0 = no pool, single-token mode) */
  #poolSize;

  /** @type {typeof globalThis.fetch} Fetch implementation */
  #fetch;

  /** @type {string} Bearer token to use */
  #bearerToken;

  // -- Constructor -----------------------------------------------------------

  /**
   * @param {object} [options]
   * @param {number}   [options.poolSize=0]      Number of tokens to maintain in the pool. 0 = single-token mode.
   * @param {typeof globalThis.fetch} [options.fetch]  Custom fetch implementation.
   * @param {string}   [options.bearerToken]     Override the default bearer token.
   */
  constructor(options = {}) {
    this.#poolSize = options.poolSize ?? 0;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#bearerToken = options.bearerToken ?? BEARER_TOKEN;
  }

  // -- Public API ------------------------------------------------------------

  /**
   * Activate a new guest token from Twitter's API.
   *
   * POST https://api.x.com/1.1/guest/activate.json
   * Response: { guest_token: "1234567890" }
   *
   * @returns {Promise<GuestToken>} The newly acquired token
   * @throws {Error} If the activation request fails
   */
  async activate() {
    const res = await this.#fetch(
      'https://api.x.com/1.1/guest/activate.json',
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.#bearerToken}`,
          'content-type': 'application/x-www-form-urlencoded',
        },
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Guest token activation failed: HTTP ${res.status} — ${body}`,
      );
    }

    const data = await res.json();

    if (!data.guest_token) {
      throw new Error(
        `Guest token activation returned unexpected payload: ${JSON.stringify(data)}`,
      );
    }

    const token = new GuestToken(String(data.guest_token));
    this.#currentToken = token;
    return token;
  }

  /**
   * Get a valid guest token — cached if still fresh, otherwise auto-activates.
   *
   * Concurrent-safe: if multiple callers invoke this simultaneously while the
   * token is expired, only a single activation request is made (thundering-herd
   * prevention via promise deduplication).
   *
   * @returns {Promise<string>} The guest token string
   */
  async getToken() {
    if (this.isExpired()) {
      if (!this.#activationPromise) {
        this.#activationPromise = this.activate().finally(() => {
          this.#activationPromise = null;
        });
      }
      await this.#activationPromise;
    }
    return this.#currentToken.value;
  }

  /**
   * Build unauthenticated request headers for Twitter's API.
   *
   * Includes:
   *   - authorization: Bearer {BEARER_TOKEN}
   *   - x-guest-token: {token}
   *   - x-twitter-active-user: yes
   *   - x-twitter-client-language: en
   *   - User-Agent (rotated)
   *
   * @returns {Promise<Record<string, string>>}
   */
  async getHeaders() {
    const token = await this.getToken();
    return {
      authorization: `Bearer ${this.#bearerToken}`,
      'x-guest-token': token,
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
      'user-agent': randomUserAgent(),
    };
  }

  /**
   * Check whether the current primary token is expired or absent.
   * @returns {boolean}
   */
  isExpired() {
    if (!this.#currentToken) return true;
    return this.#currentToken.isExpired();
  }

  // -- Token Pool ------------------------------------------------------------

  /**
   * Add a pre-fetched token to the pool.
   *
   * @param {string} tokenValue  Raw guest token string
   * @param {number} [createdAt] Override creation timestamp (ms)
   */
  addToken(tokenValue, createdAt) {
    this.#pool.push(new GuestToken(String(tokenValue), createdAt));
  }

  /**
   * Get the next available token from the pool using round-robin.
   *
   * If an `endpoint` is specified, tokens that are rate-limited for that
   * endpoint are skipped. If all tokens are exhausted, returns `null`.
   *
   * @param {string} [endpoint]  Logical endpoint name for rate-limit awareness
   * @returns {GuestToken|null}
   */
  getNextToken(endpoint) {
    this.removeExpired();

    if (this.#pool.length === 0) return null;

    const poolSize = this.#pool.length;

    // Try up to poolSize rotations to find one with capacity
    for (let i = 0; i < poolSize; i++) {
      const idx = this.#poolIndex % poolSize;
      this.#poolIndex = idx + 1;
      const token = this.#pool[idx];

      if (!endpoint || token.hasCapacity(endpoint)) {
        return token;
      }
    }

    // All tokens rate-limited for this endpoint
    return null;
  }

  /**
   * Remove expired tokens from the pool.
   * @returns {number} Number of tokens removed
   */
  removeExpired() {
    const before = this.#pool.length;
    this.#pool = this.#pool.filter((t) => !t.isExpired());
    // Clamp the round-robin index so it doesn't go out of bounds
    if (this.#pool.length > 0) {
      this.#poolIndex = this.#poolIndex % this.#pool.length;
    } else {
      this.#poolIndex = 0;
    }
    return before - this.#pool.length;
  }

  /**
   * Fill the pool up to the configured `poolSize` by activating new tokens.
   * Useful for pre-warming the pool before heavy scraping.
   *
   * @returns {Promise<number>} Number of tokens added
   */
  async fillPool() {
    const needed = Math.max(0, this.#poolSize - this.#pool.length);
    let added = 0;

    for (let i = 0; i < needed; i++) {
      const token = await this.activate();
      this.#pool.push(token);
      added++;
      // Small delay between activations to avoid burst-triggering rate limits
      if (i < needed - 1) await sleep(500);
    }

    return added;
  }

  /**
   * Record rate-limit information for a token from API response headers.
   *
   * @param {GuestToken|string} token     Token instance or raw token string
   * @param {string}            endpoint  Logical endpoint name (search|profile|tweet)
   * @param {object}            headers   Response headers (or Headers instance)
   */
  recordRateLimit(token, endpoint, headers) {
    const target = typeof token === 'string'
      ? this.#pool.find((t) => t.value === token) ?? this.#currentToken
      : token;

    if (!target) return;

    const remaining = parseInt(
      headers['x-rate-limit-remaining'] ??
        headers.get?.('x-rate-limit-remaining'),
      10,
    );
    const resetEpoch = parseInt(
      headers['x-rate-limit-reset'] ?? headers.get?.('x-rate-limit-reset'),
      10,
    );

    if (Number.isNaN(remaining) || Number.isNaN(resetEpoch)) return;

    // Twitter sends reset as Unix seconds — convert to ms
    target.recordRateLimit(endpoint, remaining, resetEpoch * 1000);
  }

  // -- Accessors (for testing / introspection) -------------------------------

  /** @returns {number} Current pool size */
  get poolLength() {
    return this.#pool.length;
  }

  /** @returns {GuestToken|null} The current primary token (read-only) */
  get currentToken() {
    return this.#currentToken;
  }
}

// ============================================================================
// Exports
// ============================================================================

export {
  GuestToken,
  BEARER_TOKEN,
  TOKEN_TTL_MS,
  RATE_LIMIT_WINDOW_MS,
  GUEST_RATE_LIMITS,
  USER_AGENTS,
  randomUserAgent,
};

export default GuestTokenManager;

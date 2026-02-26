/**
 * Adaptive Rate Limiter with Exponential Backoff
 *
 * Tracks per-endpoint rate limits using Twitter's response headers
 * (x-rate-limit-remaining, x-rate-limit-reset). Enforces proactive
 * throttling so requests never hit 429 in steady state.
 *
 * Strategies:
 *   - 'wait'  → sleep until the reset window opens (default)
 *   - 'error' → throw RateLimitError immediately
 *   - custom  → { shouldWait(endpoint, info): boolean, getDelay(endpoint, info): number }
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { RATE_LIMITS } from '../../scrapers/twitter/http/endpoints.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WINDOW_MS = 15 * 60 * 1000; // Twitter uses 15-minute windows
const MIN_REMAINING_BUFFER = 5;   // stop sending when ≤5 remaining
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 64_000;
const JITTER_FACTOR = 0.3;        // ±30% jitter on delays

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class RateLimitError extends Error {
  /**
   * @param {string} endpoint
   * @param {object} info
   * @param {number} [info.resetAt]
   * @param {number} [info.remaining]
   * @param {number} [info.limit]
   */
  constructor(endpoint, { resetAt, remaining, limit } = {}) {
    const resetDate = resetAt ? new Date(resetAt * 1000).toISOString() : 'unknown';
    super(`Rate limited on ${endpoint} — resets at ${resetDate} (${remaining ?? '?'}/${limit ?? '?'} remaining)`);
    this.name = 'RateLimitError';
    this.endpoint = endpoint;
    this.resetAt = resetAt;
    this.remaining = remaining;
    this.limit = limit;
  }
}

// ---------------------------------------------------------------------------
// Bucket — per-endpoint state
// ---------------------------------------------------------------------------

class RateBucket {
  constructor(endpoint, knownLimit) {
    this.endpoint = endpoint;
    this.limit = knownLimit ?? RATE_LIMITS.DEFAULT;
    this.remaining = this.limit;
    this.resetAt = 0;          // Unix epoch seconds
    this.consecutiveHits = 0;  // 429 streak — drives backoff exponent
    this.lastRequestAt = 0;
  }

  /** Update from Twitter response headers */
  update(headers) {
    const remaining = headers?.['x-rate-limit-remaining'];
    const reset = headers?.['x-rate-limit-reset'];
    const limit = headers?.['x-rate-limit-limit'];

    if (remaining !== undefined) this.remaining = parseInt(remaining, 10);
    if (reset !== undefined) this.resetAt = parseInt(reset, 10);
    if (limit !== undefined) this.limit = parseInt(limit, 10);

    this.lastRequestAt = Date.now();

    // Reset consecutive 429 counter on successful request
    if (this.remaining > 0) {
      this.consecutiveHits = 0;
    }
  }

  /** Record a 429 hit */
  recordHit() {
    this.consecutiveHits++;
    this.remaining = 0;
  }

  /** Is the current window exhausted? */
  isExhausted() {
    if (this.remaining <= MIN_REMAINING_BUFFER) {
      const now = Math.floor(Date.now() / 1000);
      return this.resetAt > now;
    }
    return false;
  }

  /** Milliseconds until the rate window resets (0 if already open) */
  msUntilReset() {
    const nowSec = Math.floor(Date.now() / 1000);
    if (this.resetAt <= nowSec) return 0;
    return (this.resetAt - nowSec) * 1000;
  }

  /** Exponential backoff delay based on consecutive 429s */
  backoffMs() {
    if (this.consecutiveHits === 0) return 0;
    const exp = Math.min(this.consecutiveHits, 6); // cap at 2^6 = 64s
    const base = BASE_BACKOFF_MS * Math.pow(2, exp);
    const jitter = base * JITTER_FACTOR * (Math.random() * 2 - 1);
    return Math.min(base + jitter, MAX_BACKOFF_MS);
  }
}

// ---------------------------------------------------------------------------
// RateLimiter
// ---------------------------------------------------------------------------

export class RateLimiter {
  /**
   * @param {object} [options]
   * @param {'wait'|'error'|object} [options.strategy='wait'] - How to handle rate limits
   * @param {boolean} [options.proactive=true] - Throttle before hitting 429
   * @param {boolean} [options.debug=false]
   * @param {Record<string, number>} [options.limits] - Override per-endpoint limits
   */
  constructor(options = {}) {
    this.strategy = options.strategy ?? 'wait';
    this.proactive = options.proactive ?? true;
    this.debug = options.debug ?? false;
    this.limits = { ...RATE_LIMITS, ...options.limits };

    /** @type {Map<string, RateBucket>} */
    this._buckets = new Map();

    /** @type {Map<string, Promise<void>>} */
    this._waitQueues = new Map();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Call before making a request. Blocks (or throws) if the endpoint is rate-limited.
   *
   * @param {string} endpoint - Operation name (e.g. 'FavoriteTweet', 'UserByScreenName')
   * @returns {Promise<void>}
   */
  async acquire(endpoint) {
    const bucket = this._getBucket(endpoint);

    // Proactive throttling: if we know the window is exhausted, act before the request
    if (this.proactive && bucket.isExhausted()) {
      await this._handleLimit(endpoint, bucket);
    }

    // If another request is already waiting on this endpoint, queue behind it
    const pending = this._waitQueues.get(endpoint);
    if (pending) {
      await pending;
    }
  }

  /**
   * Call after receiving a response. Updates bucket state from headers.
   *
   * @param {string} endpoint
   * @param {number} status - HTTP status code
   * @param {Record<string, string>} [headers] - Response headers
   */
  async update(endpoint, status, headers) {
    const bucket = this._getBucket(endpoint);

    if (status === 429) {
      bucket.recordHit();
      bucket.update(headers);
      if (this.debug) {
        console.log(`⚡ [RateLimiter] 429 on ${endpoint} — consecutive: ${bucket.consecutiveHits}, resets: ${new Date(bucket.resetAt * 1000).toISOString()}`);
      }
      await this._handleLimit(endpoint, bucket);
    } else {
      bucket.update(headers);
      if (this.debug && bucket.remaining <= 10) {
        console.log(`⚡ [RateLimiter] ${endpoint}: ${bucket.remaining}/${bucket.limit} remaining`);
      }
    }
  }

  /**
   * Get current state for an endpoint.
   *
   * @param {string} endpoint
   * @returns {{ remaining: number, limit: number, resetAt: number, exhausted: boolean }}
   */
  getState(endpoint) {
    const bucket = this._getBucket(endpoint);
    return {
      remaining: bucket.remaining,
      limit: bucket.limit,
      resetAt: bucket.resetAt,
      exhausted: bucket.isExhausted(),
      consecutiveHits: bucket.consecutiveHits,
    };
  }

  /**
   * Check if an endpoint is currently rate-limited (without blocking).
   *
   * @param {string} endpoint
   * @returns {boolean}
   */
  isLimited(endpoint) {
    return this._getBucket(endpoint).isExhausted();
  }

  /**
   * Reset all tracked state.
   */
  reset() {
    this._buckets.clear();
    this._waitQueues.clear();
  }

  /**
   * Get a snapshot of all tracked endpoints.
   *
   * @returns {Array<{ endpoint: string, remaining: number, limit: number, resetAt: number, exhausted: boolean }>}
   */
  snapshot() {
    return [...this._buckets.entries()].map(([endpoint, bucket]) => ({
      endpoint,
      remaining: bucket.remaining,
      limit: bucket.limit,
      resetAt: bucket.resetAt,
      exhausted: bucket.isExhausted(),
    }));
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  /**
   * @param {string} endpoint
   * @returns {RateBucket}
   */
  _getBucket(endpoint) {
    if (!this._buckets.has(endpoint)) {
      this._buckets.set(endpoint, new RateBucket(endpoint, this.limits[endpoint] ?? this.limits.DEFAULT));
    }
    return this._buckets.get(endpoint);
  }

  /**
   * Handle a rate limit based on configured strategy.
   *
   * @param {string} endpoint
   * @param {RateBucket} bucket
   * @returns {Promise<void>}
   */
  async _handleLimit(endpoint, bucket) {
    const info = {
      resetAt: bucket.resetAt,
      remaining: bucket.remaining,
      limit: bucket.limit,
      consecutiveHits: bucket.consecutiveHits,
    };

    // Custom strategy
    if (typeof this.strategy === 'object' && this.strategy !== null) {
      if (this.strategy.shouldWait?.(endpoint, info) === false) {
        throw new RateLimitError(endpoint, info);
      }
      const customDelay = this.strategy.getDelay?.(endpoint, info);
      if (customDelay > 0) {
        await this._sleep(endpoint, customDelay);
        return;
      }
    }

    // Built-in 'error' strategy
    if (this.strategy === 'error') {
      throw new RateLimitError(endpoint, info);
    }

    // Built-in 'wait' strategy (default)
    const resetDelay = bucket.msUntilReset();
    const backoff = bucket.backoffMs();
    const delay = Math.max(resetDelay, backoff, 1000); // at least 1s

    if (this.debug) {
      console.log(`⏳ [RateLimiter] Waiting ${Math.round(delay / 1000)}s for ${endpoint} (reset: ${Math.round(resetDelay / 1000)}s, backoff: ${Math.round(backoff / 1000)}s)`);
    }

    await this._sleep(endpoint, delay);
  }

  /**
   * Sleep with deduplication — multiple callers on the same endpoint share one timer.
   *
   * @param {string} endpoint
   * @param {number} ms
   * @returns {Promise<void>}
   */
  _sleep(endpoint, ms) {
    if (this._waitQueues.has(endpoint)) {
      return this._waitQueues.get(endpoint);
    }

    const promise = new Promise(resolve => setTimeout(resolve, ms)).then(() => {
      this._waitQueues.delete(endpoint);
    });

    this._waitQueues.set(endpoint, promise);
    return promise;
  }
}

export default RateLimiter;

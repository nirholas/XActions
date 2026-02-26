/**
 * XActions Client — Error Classes
 * Comprehensive error hierarchy for all Twitter API and scraper errors.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Base Error
// ============================================================================

/**
 * Base error class for all XActions scraper errors.
 */
export class ScraperError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {string} [code='SCRAPER_ERROR'] - Machine-readable error code
   * @param {Object} [options={}]
   * @param {string} [options.endpoint] - The API endpoint that produced the error
   * @param {number} [options.httpStatus] - HTTP status code
   * @param {Date|null} [options.rateLimitReset] - When the rate limit resets
   */
  constructor(message, code = 'SCRAPER_ERROR', options = {}) {
    super(message);
    this.name = 'ScraperError';
    /** @type {string} */
    this.code = code;
    /** @type {string|undefined} */
    this.endpoint = options.endpoint;
    /** @type {number|undefined} */
    this.httpStatus = options.httpStatus;
    /** @type {Date|null} */
    this.rateLimitReset = options.rateLimitReset || null;
  }

  toString() {
    let str = `${this.name} [${this.code}]: ${this.message}`;
    if (this.endpoint) str += ` (endpoint: ${this.endpoint})`;
    if (this.httpStatus) str += ` (HTTP ${this.httpStatus})`;
    return str;
  }
}

// ============================================================================
// Authentication Errors
// ============================================================================

/**
 * Thrown when authentication fails or is required.
 */
export class AuthenticationError extends ScraperError {
  /**
   * @param {string} message
   * @param {'AUTH_FAILED'|'AUTH_REQUIRED'|'ACCOUNT_SUSPENDED'|'ACCOUNT_LOCKED'|'INVALID_TOKEN'|'PROTECTED_TWEETS'} [code='AUTH_FAILED']
   * @param {Object} [options]
   */
  constructor(message, code = 'AUTH_FAILED', options = {}) {
    super(message, code, options);
    this.name = 'AuthenticationError';
  }
}

// ============================================================================
// Rate Limit Errors
// ============================================================================

/**
 * Thrown when a Twitter rate limit is hit.
 */
export class RateLimitError extends ScraperError {
  /**
   * @param {string} message
   * @param {Object} [options={}]
   * @param {number} [options.retryAfter] - Seconds until retry is safe
   * @param {number} [options.limit] - Total requests allowed in window
   * @param {number} [options.remaining] - Requests remaining in window
   * @param {Date|null} [options.resetAt] - When the limit resets
   * @param {string} [options.endpoint]
   * @param {number} [options.httpStatus]
   */
  constructor(message, options = {}) {
    super(message, 'RATE_LIMITED', options);
    this.name = 'RateLimitError';
    /** @type {number|undefined} */
    this.retryAfter = options.retryAfter;
    /** @type {number|undefined} */
    this.limit = options.limit;
    /** @type {number|undefined} */
    this.remaining = options.remaining;
    /** @type {Date|null} */
    this.resetAt = options.resetAt || null;
  }
}

// ============================================================================
// Not Found Errors
// ============================================================================

/**
 * Thrown when a requested resource does not exist.
 */
export class NotFoundError extends ScraperError {
  /**
   * @param {string} message
   * @param {'USER_NOT_FOUND'|'TWEET_NOT_FOUND'|'LIST_NOT_FOUND'} [code='NOT_FOUND']
   * @param {Object} [options]
   */
  constructor(message, code = 'NOT_FOUND', options = {}) {
    super(message, code, options);
    this.name = 'NotFoundError';
  }
}

// ============================================================================
// Twitter API Errors
// ============================================================================

/**
 * Maps Twitter's internal error codes to structured error classes.
 * @type {Record<number, {ErrorClass: typeof ScraperError, code: string, message: string}>}
 */
const TWITTER_ERROR_MAP = {
  34:  { ErrorClass: NotFoundError, code: 'NOT_FOUND', message: 'Resource not found' },
  50:  { ErrorClass: NotFoundError, code: 'USER_NOT_FOUND', message: 'User not found' },
  63:  { ErrorClass: AuthenticationError, code: 'ACCOUNT_SUSPENDED', message: 'Account suspended' },
  64:  { ErrorClass: AuthenticationError, code: 'ACCOUNT_SUSPENDED', message: 'Account suspended' },
  88:  { ErrorClass: RateLimitError, code: 'RATE_LIMITED', message: 'Rate limit exceeded' },
  89:  { ErrorClass: AuthenticationError, code: 'INVALID_TOKEN', message: 'Invalid or expired token' },
  130: { ErrorClass: ScraperError, code: 'OVER_CAPACITY', message: 'Twitter is over capacity' },
  131: { ErrorClass: ScraperError, code: 'INTERNAL_ERROR', message: 'Twitter internal error' },
  135: { ErrorClass: AuthenticationError, code: 'AUTH_FAILED', message: 'Could not authenticate you' },
  144: { ErrorClass: NotFoundError, code: 'TWEET_NOT_FOUND', message: 'Tweet not found' },
  179: { ErrorClass: AuthenticationError, code: 'PROTECTED_TWEETS', message: 'Protected tweets' },
  185: { ErrorClass: RateLimitError, code: 'RATE_LIMITED', message: 'User-level tweet limit reached' },
  187: { ErrorClass: ScraperError, code: 'DUPLICATE_TWEET', message: 'Status is a duplicate' },
  326: { ErrorClass: AuthenticationError, code: 'ACCOUNT_LOCKED', message: 'Account locked' },
  349: { ErrorClass: ScraperError, code: 'DM_NOT_ALLOWED', message: 'Cannot send DM to this user' },
  385: { ErrorClass: ScraperError, code: 'REPLY_RESTRICTED', message: 'Reply restricted by author' },
};

/**
 * Thrown for general Twitter API errors.
 */
export class TwitterApiError extends ScraperError {
  /**
   * @param {string} message
   * @param {Object} [options={}]
   * @param {number} [options.twitterErrorCode]
   * @param {string} [options.twitterMessage]
   * @param {string} [options.endpoint]
   * @param {number} [options.httpStatus]
   */
  constructor(message, options = {}) {
    super(message, 'API_ERROR', options);
    this.name = 'TwitterApiError';
    /** @type {number|undefined} */
    this.twitterErrorCode = options.twitterErrorCode;
    /** @type {string|undefined} */
    this.twitterMessage = options.twitterMessage;
  }

  /**
   * Create an error from a Twitter API error response body.
   *
   * Twitter returns errors in multiple formats:
   *   a. { errors: [{ code: 88, message: "Rate limit exceeded" }] }
   *   b. { data: { errors: [{ message: "..." }] } }  (GraphQL)
   *   c. { error: "Not authorized." }
   *
   * @param {Object} body - Parsed JSON response body
   * @param {Object} [context={}]
   * @returns {ScraperError}
   */
  static fromResponse(body, context = {}) {
    if (!body || typeof body !== 'object') {
      return new TwitterApiError('Unknown Twitter API error', context);
    }

    // Format a: { errors: [{ code, message }] }
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      const first = body.errors[0];
      const code = first.code;
      const message = first.message || 'Unknown error';

      const mapped = TWITTER_ERROR_MAP[code];
      if (mapped) {
        return new mapped.ErrorClass(mapped.message, mapped.code || 'API_ERROR', {
          ...context,
          twitterErrorCode: code,
          twitterMessage: message,
        });
      }

      return new TwitterApiError(message, {
        ...context,
        twitterErrorCode: code,
        twitterMessage: message,
      });
    }

    // Format b: GraphQL errors
    if (body.data?.errors && Array.isArray(body.data.errors) && body.data.errors.length > 0) {
      const first = body.data.errors[0];
      return new TwitterApiError(first.message || 'GraphQL error', {
        ...context,
        twitterMessage: first.message,
      });
    }

    // Format c: { error: "string" }
    if (typeof body.error === 'string') {
      if (body.error.toLowerCase().includes('not authorized')) {
        return new AuthenticationError(body.error, 'AUTH_FAILED', context);
      }
      return new TwitterApiError(body.error, context);
    }

    return new TwitterApiError('Unknown Twitter API error', context);
  }
}

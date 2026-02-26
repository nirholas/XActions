/**
 * XActions Client — Error Classes
 * Comprehensive error hierarchy for the HTTP-only Scraper client.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

// ============================================================================
// Base Error
// ============================================================================

/**
 * Base error class for all Scraper client errors.
 */
export class ScraperError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {Object} [options]
   * @param {string} [options.endpoint]
   * @param {number} [options.httpStatus]
   * @param {Date|null} [options.rateLimitReset]
   */
  constructor(message, code, options = {}) {
    super(message);
    this.name = 'ScraperError';
    this.code = code;
    this.endpoint = options.endpoint || null;
    this.httpStatus = options.httpStatus || null;
    this.rateLimitReset = options.rateLimitReset || null;
  }

  toString() {
    const parts = [`[${this.name}] ${this.code}: ${this.message}`];
    if (this.endpoint) parts.push(`  endpoint: ${this.endpoint}`);
    if (this.httpStatus) parts.push(`  httpStatus: ${this.httpStatus}`);
    if (this.rateLimitReset) parts.push(`  rateLimitReset: ${this.rateLimitReset.toISOString()}`);
    return parts.join('\n');
  }
}

// ============================================================================
// Authentication Errors
// ============================================================================

export class AuthenticationError extends ScraperError {
  /**
   * @param {string} message
   * @param {'AUTH_FAILED'|'AUTH_REQUIRED'|'ACCOUNT_SUSPENDED'|'ACCOUNT_LOCKED'} code
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

export class RateLimitError extends ScraperError {
  /**
   * @param {string} message
   * @param {Object} [options]
   * @param {number} [options.retryAfter]
   * @param {number} [options.limit]
   * @param {number} [options.remaining]
   * @param {Date} [options.resetAt]
   */
  constructor(message, options = {}) {
    super(message, 'RATE_LIMITED', {
      endpoint: options.endpoint,
      httpStatus: 429,
      rateLimitReset: options.resetAt || null,
    });
    this.name = 'RateLimitError';
    this.retryAfter = options.retryAfter || null;
    this.limit = options.limit || null;
    this.remaining = options.remaining || 0;
    this.resetAt = options.resetAt || null;
  }
}

// ============================================================================
// Not Found Errors
// ============================================================================

export class NotFoundError extends ScraperError {
  /**
   * @param {string} message
   * @param {'USER_NOT_FOUND'|'TWEET_NOT_FOUND'|'LIST_NOT_FOUND'} code
   * @param {Object} [options]
   */
  constructor(message, code = 'USER_NOT_FOUND', options = {}) {
    super(message, code, { ...options, httpStatus: options.httpStatus || 404 });
    this.name = 'NotFoundError';
  }
}

// ============================================================================
// Twitter API Error
// ============================================================================

export class TwitterApiError extends ScraperError {
  /**
   * @param {string} message
   * @param {Object} [options]
   * @param {number} [options.twitterErrorCode]
   * @param {string} [options.twitterMessage]
   */
  constructor(message, options = {}) {
    super(message, 'API_ERROR', options);
    this.name = 'TwitterApiError';
    this.twitterErrorCode = options.twitterErrorCode || null;
    this.twitterMessage = options.twitterMessage || null;
  }
}

// ============================================================================
// Error Mapping
// ============================================================================

/**
 * Map Twitter API error codes to typed errors.
 *
 * @param {Array<{code: number, message: string}>} errors
 * @param {Object} [context]
 * @returns {ScraperError}
 */
export function mapTwitterErrors(errors, context = {}) {
  if (!errors || !errors.length) {
    return new TwitterApiError('Unknown Twitter API error', context);
  }
  const err = errors[0];
  const code = err.code;
  const msg = err.message || 'Unknown error';

  switch (code) {
    case 34:
    case 50:
      return new NotFoundError(msg, 'USER_NOT_FOUND', context);
    case 63:
    case 64:
      return new AuthenticationError(msg, 'ACCOUNT_SUSPENDED', context);
    case 88:
      return new RateLimitError(msg, context);
    case 179:
      return new AuthenticationError(msg, 'AUTH_REQUIRED', context);
    case 220:
      return new AuthenticationError(msg, 'AUTH_FAILED', context);
    case 326:
      return new AuthenticationError(msg, 'ACCOUNT_LOCKED', context);
    case 349:
      return new TwitterApiError(`DM not allowed: ${msg}`, { ...context, twitterErrorCode: code, twitterMessage: msg });
    default:
      return new TwitterApiError(msg, { ...context, twitterErrorCode: code, twitterMessage: msg });
  }
}

/**/**































































































































































































}  }      return new TwitterApiError(msg, { ...context, twitterErrorCode: code, twitterMessage: msg });    default:      return new TwitterApiError(`DM not allowed: ${msg}`, { ...context, twitterErrorCode: code, twitterMessage: msg });    case 349:      return new AuthenticationError(msg, 'ACCOUNT_LOCKED', context);    case 326:      return new AuthenticationError(msg, 'AUTH_FAILED', context);    case 220:      return new AuthenticationError(msg, 'AUTH_REQUIRED', context);    case 179:      return new RateLimitError(msg, context);    case 88:      return new AuthenticationError(msg, 'ACCOUNT_SUSPENDED', context);    case 64:    case 63:      return new NotFoundError(msg, 'USER_NOT_FOUND', context);    case 50:    case 34:  switch (code) {  const msg = err.message || 'Unknown error';  const code = err.code;  const err = errors[0];  }    return new TwitterApiError('Unknown Twitter API error', context);  if (!errors || !errors.length) {export function mapTwitterErrors(errors, context = {}) { */ * @returns {ScraperError} * @param {Object} [context] - Additional context (endpoint, httpStatus) * @param {Array<{code: number, message: string}>} errors - Twitter errors array *  * 349  — DM not possible (user has DMs disabled) * 326  — Account locked * 220  — Credentials do not allow access * 187  — Duplicate status * 185  — Daily status update limit reached * 179  — Sorry, you are not authorized to see this status * 131  — Internal error * 130  — Over capacity *  88  — Rate limit exceeded *  64  — Account suspended *  63  — User has been suspended *  50  — User not found *  34  — Sorry, that page does not exist * Common Twitter error codes: *  * Twitter error code → typed error./**// ============================================================================// Error Mapping// ============================================================================}  }    this.twitterMessage = options.twitterMessage || null;    this.twitterErrorCode = options.twitterErrorCode || null;    this.name = 'TwitterApiError';    super(message, 'API_ERROR', options);  constructor(message, options = {}) {   */   * @param {string} [options.twitterMessage] - Twitter error message   * @param {number} [options.twitterErrorCode] - Twitter internal error code   * @param {Object} [options]   * @param {string} message  /**export class TwitterApiError extends ScraperError { */ * Wraps raw Twitter API error responses./**// ============================================================================// Twitter API Error// ============================================================================}  }    this.name = 'NotFoundError';    super(message, code, { ...options, httpStatus: options.httpStatus || 404 });  constructor(message, code = 'USER_NOT_FOUND', options = {}) {   */   * @param {Object} [options]   * @param {'USER_NOT_FOUND'|'TWEET_NOT_FOUND'|'LIST_NOT_FOUND'} code   * @param {string} message  /**export class NotFoundError extends ScraperError { */ * Thrown when the requested resource does not exist./**// ============================================================================// Not Found Errors// ============================================================================}  }    this.resetAt = options.resetAt || null;    this.remaining = options.remaining || 0;    this.limit = options.limit || null;    this.retryAfter = options.retryAfter || null;    this.name = 'RateLimitError';    });      rateLimitReset: options.resetAt || null,      httpStatus: 429,      endpoint: options.endpoint,    super(message, 'RATE_LIMITED', {  constructor(message, options = {}) {   */   * @param {Date} [options.resetAt] - Exact reset timestamp   * @param {number} [options.remaining] - Remaining requests in window   * @param {number} [options.limit] - Request limit ceiling   * @param {number} [options.retryAfter] - Seconds until retry is safe   * @param {Object} [options]   * @param {string} message  /**export class RateLimitError extends ScraperError { */ * Thrown when Twitter rate-limits the request./**// ============================================================================// Rate Limit Errors// ============================================================================}  }    this.name = 'AuthenticationError';    super(message, code, options);  constructor(message, code = 'AUTH_FAILED', options = {}) {   */   * @param {Object} [options]   * @param {'AUTH_FAILED'|'AUTH_REQUIRED'|'ACCOUNT_SUSPENDED'|'ACCOUNT_LOCKED'} code   * @param {string} message  /**export class AuthenticationError extends ScraperError { */ * Thrown when authentication fails or is required./**// ============================================================================// Authentication Errors// ============================================================================}  }    return parts.join('\n');    if (this.rateLimitReset) parts.push(`  rateLimitReset: ${this.rateLimitReset.toISOString()}`);    if (this.httpStatus) parts.push(`  httpStatus: ${this.httpStatus}`);    if (this.endpoint) parts.push(`  endpoint: ${this.endpoint}`);    const parts = [`[${this.name}] ${this.code}: ${this.message}`];  toString() {   */   * @returns {string} Formatted error string  /**  }    this.rateLimitReset = options.rateLimitReset || null;    this.httpStatus = options.httpStatus || null;    this.endpoint = options.endpoint || null;    this.code = code;    this.name = 'ScraperError';    super(message);  constructor(message, code, options = {}) {   */   * @param {Date|null} [options.rateLimitReset] - When the rate limit resets   * @param {number} [options.httpStatus] - HTTP status code from Twitter   * @param {string} [options.endpoint] - The API endpoint that triggered the error   * @param {Object} [options]   * @param {string} code - Machine-readable error code   * @param {string} message - Human-readable error description  /**export class ScraperError extends Error { */ * Base error class for all Scraper client errors./**// ============================================================================// Base Error// ============================================================================ */ * @license MIT * @author nich (@nichxbt) * * Comprehensive error hierarchy for the HTTP-only Scraper client. * XActions Client — Error Classes * XActions Client — Error Classes
 * Comprehensive error hierarchy for the HTTP-only Scraper client.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Base Error
// ============================================================================

/**
 * Base error class for all Scraper-related errors.
 */
export class ScraperError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {string} [code='SCRAPER_ERROR'] - Machine-readable error code
   * @param {Object} [options]
   * @param {string} [options.endpoint] - The API endpoint that caused the error
   * @param {number} [options.httpStatus] - HTTP status code from the response
   * @param {Date|null} [options.rateLimitReset] - When the rate limit resets
   */
  constructor(message, code = 'SCRAPER_ERROR', options = {}) {
    super(message);
    this.name = 'ScraperError';
    this.code = code;
    this.endpoint = options.endpoint || null;
    this.httpStatus = options.httpStatus || null;
    this.rateLimitReset = options.rateLimitReset || null;
  }

  /**
   * @returns {string} Formatted error string
   */
  toString() {
    const parts = [`[${this.code}] ${this.message}`];
    if (this.endpoint) parts.push(`Endpoint: ${this.endpoint}`);
    if (this.httpStatus) parts.push(`HTTP ${this.httpStatus}`);
    if (this.rateLimitReset) parts.push(`Rate limit resets: ${this.rateLimitReset.toISOString()}`);
    return parts.join(' | ');
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
   * @param {'AUTH_FAILED'|'AUTH_REQUIRED'|'ACCOUNT_SUSPENDED'|'ACCOUNT_LOCKED'} [code='AUTH_FAILED']
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
 * Thrown when Twitter rate limit is exceeded.
 */
export class RateLimitError extends ScraperError {
  /**
   * @param {string} message
   * @param {Object} [options]
   * @param {number} [options.retryAfter] - Seconds until the rate limit resets
   * @param {number} [options.limit] - Maximum number of requests allowed
   * @param {number} [options.remaining] - Requests remaining in the window
   * @param {Date} [options.resetAt] - When the rate limit resets
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

/**
 * Thrown when a requested resource is not found.
 */
export class NotFoundError extends ScraperError {
  /**
   * @param {string} message
   * @param {'USER_NOT_FOUND'|'TWEET_NOT_FOUND'|'LIST_NOT_FOUND'} [code='USER_NOT_FOUND']
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

/**
 * Maps Twitter's internal error codes to specific error classes.
 * @type {Record<number, {ErrorClass: typeof ScraperError, code: string, message: string}>}
 */
const TWITTER_ERROR_MAP = {
  34: { ErrorClass: NotFoundError, code: 'USER_NOT_FOUND', message: 'Resource not found' },
  50: { ErrorClass: NotFoundError, code: 'USER_NOT_FOUND', message: 'User not found' },
  63: { ErrorClass: AuthenticationError, code: 'ACCOUNT_SUSPENDED', message: 'Account suspended' },
  64: { ErrorClass: AuthenticationError, code: 'ACCOUNT_SUSPENDED', message: 'Account suspended' },
  88: { ErrorClass: RateLimitError, code: 'RATE_LIMITED', message: 'Rate limit exceeded' },
  89: { ErrorClass: AuthenticationError, code: 'AUTH_FAILED', message: 'Invalid or expired token' },
  131: { ErrorClass: ScraperError, code: 'INTERNAL_ERROR', message: 'Twitter internal error' },
  144: { ErrorClass: NotFoundError, code: 'TWEET_NOT_FOUND', message: 'Tweet not found' },
  179: { ErrorClass: AuthenticationError, code: 'AUTH_REQUIRED', message: 'Not authorized to view this resource' },
  326: { ErrorClass: AuthenticationError, code: 'ACCOUNT_LOCKED', message: 'Account locked' },
  349: { ErrorClass: ScraperError, code: 'DM_RESTRICTED', message: 'Cannot send DM to this user' },
};

/**
 * Thrown for generic Twitter API errors with mapping to specific error types.
 */
export class TwitterApiError extends ScraperError {
  /**
   * @param {string} message
   * @param {Object} [options]
   * @param {number} [options.twitterErrorCode] - Twitter's internal error code
   * @param {string} [options.twitterMessage] - Twitter's error message
   * @param {string} [options.endpoint]
   * @param {number} [options.httpStatus]
   */
  constructor(message, options = {}) {
    super(message, 'API_ERROR', options);
    this.name = 'TwitterApiError';
    this.twitterErrorCode = options.twitterErrorCode || null;
    this.twitterMessage = options.twitterMessage || null;
  }

  /**
   * Create the most specific error type from a Twitter API error response.
   * Maps known Twitter error codes to ScraperError subclasses.
   *
   * @param {Object} errorPayload - A single error object from Twitter's errors array
   * @param {Object} [context] - Additional context (endpoint, httpStatus)
   * @returns {ScraperError}
   */
  static fromTwitterError(errorPayload, context = {}) {
    const code = errorPayload.code || errorPayload.error_code;
    const msg = errorPayload.message || errorPayload.detail || 'Unknown Twitter error';
    const mapping = TWITTER_ERROR_MAP[code];

    if (mapping) {
      if (mapping.ErrorClass === RateLimitError) {
        return new RateLimitError(msg, { endpoint: context.endpoint });
      }
      return new mapping.ErrorClass(msg, mapping.code, {
        endpoint: context.endpoint,
        httpStatus: context.httpStatus,
      });
    }

    return new TwitterApiError(msg, {
      twitterErrorCode: code,
      twitterMessage: msg,
      endpoint: context.endpoint,
      httpStatus: context.httpStatus,
    });
  }

  /**
   * Parse a full Twitter API error response (may contain multiple errors).
   * Returns the most relevant error.
   *
   * @param {Object} responseBody - The parsed JSON response body
   * @param {Object} [context] - Additional context (endpoint, httpStatus)
   * @returns {ScraperError}
   */
  static fromResponse(responseBody, context = {}) {
    const errors = responseBody?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return TwitterApiError.fromTwitterError(errors[0], context);
    }
    return new TwitterApiError(
      responseBody?.detail || responseBody?.message || 'Unknown API error',
      { endpoint: context.endpoint, httpStatus: context.httpStatus },
    );
  }
}

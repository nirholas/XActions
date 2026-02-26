/**
 * XActions Client — Error Classes
 * Comprehensive error hierarchy for Twitter API interactions.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// Base Error
// ============================================================================

/**
 * Base error class for all XActions client errors.
 */
export class ScraperError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {string} [code='SCRAPER_ERROR'] - Machine-readable error code
   * @param {Object} [details={}] - Additional error context
   */
  constructor(message, code = 'SCRAPER_ERROR', details = {}) {
    super(message);
    this.name = 'ScraperError';
    this.code = code;
    this.endpoint = details.endpoint || null;
    this.httpStatus = details.httpStatus || null;
    this.rateLimitReset = details.rateLimitReset || null;
    this.timestamp = new Date();
  }

  /** @returns {string} Formatted error string */
  toString() {
    const parts = [`[${this.code}] ${this.message}`];
    if (this.endpoint) parts.push(`endpoint=${this.endpoint}`);
    if (this.httpStatus) parts.push(`http=${this.httpStatus}`);
    return parts.join(' | ');
  }

  /** @returns {Object} JSON-serializable error representation */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      endpoint: this.endpoint,
      httpStatus: this.httpStatus,
      rateLimitReset: this.rateLimitReset,
      timestamp: this.timestamp.toISOString(),
    };
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
   * @param {string} [code='AUTH_FAILED'] - AUTH_FAILED | AUTH_REQUIRED | ACCOUNT_SUSPENDED | ACCOUNT_LOCKED
   * @param {Object} [details={}]
   */
  constructor(message, code = 'AUTH_FAILED', details = {}) {
    super(message, code, details);
    this.name = 'AuthenticationError';
  }
}

// ============================================================================
// Rate Limit Errors
// ============================================================================

/**
 * Thrown when Twitter rate limits are exceeded.
 */
export class RateLimitError extends ScraperError {
  /**
   * @param {string} [message='Rate limit exceeded']
   * @param {Object} [details={}]
   */
  constructor(message = 'Rate limit exceeded', details = {}) {
    super(message, 'RATE_LIMITED', details);
    this.name = 'RateLimitError';
    this.retryAfter = details.retryAfter || null;
    this.limit = details.limit || null;
    this.remaining = details.remaining || 0;
    this.resetAt = details.resetAt || null;
  }

  /**
   * Milliseconds until rate limit resets.
   * @returns {number}
   */
  get retryAfterMs() {
    if (this.resetAt) return Math.max(0, this.resetAt.getTime() - Date.now());
    if (this.retryAfter) return this.retryAfter * 1000;
    return 60_000;
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
   * @param {string} [code='NOT_FOUND'] - USER_NOT_FOUND | TWEET_NOT_FOUND | LIST_NOT_FOUND
   * @param {Object} [details={}]
   */
  constructor(message, code = 'NOT_FOUND', details = {}) {
    super(message, code, details);
    this.name = 'NotFoundError';
  }
}

// ============================================================================
// Twitter API Error
// ============================================================================

/**
 * Wraps raw Twitter API errors with structured metadata.
 */
export class TwitterApiError extends ScraperError {
  /**
   * @param {string} message
   * @param {Object} [details={}]
   */
  constructor(message, details = {}) {
    super(message, 'API_ERROR', details);
    this.name = 'TwitterApiError';
    this.twitterErrorCode = details.twitterErrorCode || null;
    this.twitterMessage = details.twitterMessage || null;
  }
}

// ============================================================================
// Error Mapping
// ============================================================================

/** @private Twitter API error code → XActions error mapping */
const TWITTER_ERROR_MAP = {
  34: (msg) => new NotFoundError(msg || 'Resource not found', 'NOT_FOUND'),
  50: (msg) => new NotFoundError(msg || 'User not found', 'USER_NOT_FOUND'),
  63: (msg) => new AuthenticationError(msg || 'Account suspended', 'ACCOUNT_SUSPENDED'),
  64: (msg) => new AuthenticationError(msg || 'Account suspended', 'ACCOUNT_SUSPENDED'),
  88: (msg) => new RateLimitError(msg || 'Rate limit exceeded'),
  89: (msg) => new AuthenticationError(msg || 'Invalid or expired token', 'AUTH_FAILED'),
  130: (msg) => new TwitterApiError(msg || 'Twitter over capacity', { twitterErrorCode: 130 }),
  131: (msg) => new TwitterApiError(msg || 'Internal error', { twitterErrorCode: 131 }),
  135: (msg) => new AuthenticationError(msg || 'Could not authenticate', 'AUTH_FAILED'),
  144: (msg) => new NotFoundError(msg || 'Tweet not found', 'TWEET_NOT_FOUND'),
  179: (msg) => new AuthenticationError(msg || 'Protected tweets', 'AUTH_REQUIRED'),
  185: (msg) => new RateLimitError(msg || 'Tweet update limit'),
  187: (msg) => new TwitterApiError(msg || 'Duplicate tweet', { twitterErrorCode: 187 }),
  326: (msg) => new AuthenticationError(msg || 'Account locked', 'ACCOUNT_LOCKED'),
  349: (msg) => new TwitterApiError(msg || 'DM not allowed', { twitterErrorCode: 349 }),
  385: (msg) => new TwitterApiError(msg || 'Reply restricted', { twitterErrorCode: 385 }),
};

/**
 * Convert a raw Twitter API error response into a typed XActions error.
 *
 * @param {Object} data - Parsed Twitter API response body
 * @param {number} [httpStatus] - HTTP status code
 * @param {string} [endpoint] - API endpoint that returned the error
 * @returns {ScraperError|null} Typed error, or null if no error detected
 */
export function detectTwitterError(data, httpStatus, endpoint) {
  if (!data) return null;

  // Format A: { errors: [{ code, message }] }
  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const err = data.errors[0];
    const code = err.code;
    const message = err.message;
    const factory = TWITTER_ERROR_MAP[code];
    if (factory) {
      const error = factory(message);
      error.endpoint = endpoint;
      error.httpStatus = httpStatus;
      return error;
    }
    return new TwitterApiError(message || 'Unknown Twitter error', {
      twitterErrorCode: code,
      twitterMessage: message,
      endpoint,
      httpStatus,
    });
  }

  // Format B: GraphQL { data: { errors: [{ message }] } }
  if (data.data?.errors?.length > 0) {
    const msg = data.data.errors[0].message;
    return new TwitterApiError(msg || 'GraphQL error', { endpoint, httpStatus });
  }

  // Format C: { error: "Not authorized." }
  if (typeof data.error === 'string') {
    return new AuthenticationError(data.error, 'AUTH_FAILED', { endpoint, httpStatus });
  }

  return null;
}

/**
 * Extract rate limit info from HTTP response headers.
 *
 * @param {Headers|Object} headers - Response headers
 * @returns {{ limit: number, remaining: number, resetAt: Date }|null}
 */
export function extractRateLimitHeaders(headers) {
  const get = (name) =>
    typeof headers.get === 'function' ? headers.get(name) : headers[name];

  const limit = get('x-rate-limit-limit');
  const remaining = get('x-rate-limit-remaining');
  const reset = get('x-rate-limit-reset');

  if (!limit && !remaining && !reset) return null;

  return {
    limit: limit ? parseInt(limit, 10) : null,
    remaining: remaining ? parseInt(remaining, 10) : 0,
    resetAt: reset ? new Date(parseInt(reset, 10) * 1000) : null,
  };
}

/**
 * Detect shadow rate limiting — Twitter returns 200 OK but empty data.
 *
 * @param {Object} data - Parsed response data
 * @param {string} endpoint - Endpoint name for context
 * @returns {boolean}
 */
export function detectShadowRateLimit(data, endpoint) {
  if (!data) return false;

  const timeline =
    data?.data?.user?.result?.timeline_v2?.timeline ||
    data?.data?.search_by_raw_query?.search_timeline?.timeline;

  if (timeline) {
    const instructions = timeline.instructions || [];
    const addEntries = instructions.find((i) => i.type === 'TimelineAddEntries');
    if (addEntries && (!addEntries.entries || addEntries.entries.length === 0)) {
      return true;
    }
  }

  return false;
}

/**
 * Parse a JSON response body, handling non-JSON responses gracefully.
 *
 * @param {Response} response - Fetch Response object
 * @returns {Promise<{ data: Object, headers: Headers, status: number }>}
 * @throws {TwitterApiError} If response is not valid JSON
 */
export async function parseJsonResponse(response) {
  const status = response.status;
  const headers = response.headers;

  let data;
  try {
    const text = await response.text();
    if (!text || text.trim().length === 0) {
      if (status >= 200 && status < 300) return { data: {}, headers, status };
      throw new TwitterApiError(`Empty response with status ${status}`, { httpStatus: status });
    }
    data = JSON.parse(text);
  } catch (err) {
    if (err instanceof TwitterApiError) throw err;
    throw new TwitterApiError(`Non-JSON response: ${err.message}`, { httpStatus: status });
  }

  return { data, headers, status };
}

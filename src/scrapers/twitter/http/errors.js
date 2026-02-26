/**
 * Twitter HTTP Scraper — Error Classes
 *
 * Structured error hierarchy for all HTTP-based Twitter operations.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

/**
 * Base error for all Twitter API errors.
 */
export class TwitterApiError extends Error {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {number} [options.status] - HTTP status code
   * @param {object} [options.data] - Raw response data
   * @param {string} [options.endpoint] - The endpoint that errored
   */
  constructor(message, { status, data, endpoint } = {}) {
    super(message);
    this.name = 'TwitterApiError';
    this.status = status;
    this.data = data;
    this.endpoint = endpoint;
  }
}

/**
 * Thrown when the request is rate-limited (HTTP 429 or Twitter spam error).
 */
export class RateLimitError extends TwitterApiError {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {number} [options.resetAt] - Unix timestamp (ms) when limit resets
   * @param {number} [options.limit] - Max requests allowed
   * @param {number} [options.remaining] - Remaining requests
   */
  constructor(message, { resetAt, limit, remaining, ...rest } = {}) {
    super(message, rest);
    this.name = 'RateLimitError';
    this.resetAt = resetAt;
    this.limit = limit;
    this.remaining = remaining;
  }
}

/**
 * Thrown when authentication is missing or invalid (HTTP 401/403).
 */
export class AuthError extends TwitterApiError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'AuthError';
  }
}

/**
 * Thrown when the requested resource is not found (HTTP 404).
 */
export class NotFoundError extends TwitterApiError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'NotFoundError';
  }
}

/**
 * Thrown on network-level failures (connection refused, timeout, DNS).
 */
export class NetworkError extends TwitterApiError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'NetworkError';
  }
}

/**
 * Parse Twitter API error responses and throw the appropriate error class.
 *
 * @param {object} response - Parsed JSON response body
 * @param {number} status - HTTP status code
 * @param {string} [endpoint] - Endpoint path for context
 * @returns {{ handled: boolean, result?: object }} — If handled idempotently, returns result
 * @throws {RateLimitError|AuthError|NotFoundError|TwitterApiError}
 */
export function parseTwitterErrors(response, status, endpoint) {
  const errors = response?.errors || [];
  const errorMessages = errors.map((e) => e.message || '').join('; ');

  // Idempotent cases — not real errors
  for (const err of errors) {
    const msg = (err.message || '').toLowerCase();
    if (
      msg.includes('already favorited') ||
      msg.includes('already retweeted') ||
      msg.includes('already bookmarked') ||
      msg.includes('you have already') ||
      msg.includes('not found in') // "RetweetId not found in list of retweets" => already un-retweeted
    ) {
      return { handled: true, result: { success: true } };
    }
  }

  // Rate limiting
  for (const err of errors) {
    const msg = (err.message || '').toLowerCase();
    if (
      msg.includes('rate limit') ||
      msg.includes('to protect our users from spam') ||
      msg.includes('too many requests')
    ) {
      throw new RateLimitError(err.message || 'Rate limited', { status, endpoint });
    }
  }

  // Not-found
  for (const err of errors) {
    const msg = (err.message || '').toLowerCase();
    if (
      msg.includes('cannot find specified user') ||
      msg.includes('user not found') ||
      msg.includes('could not find') ||
      msg.includes('no status found') ||
      msg.includes('_missing')
    ) {
      throw new NotFoundError(err.message || 'Not found', { status, endpoint, data: response });
    }
  }

  // Suspended user
  for (const err of errors) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('suspended')) {
      throw new TwitterApiError(err.message, { status, endpoint, data: response });
    }
  }

  // Generic API error (non-idempotent)
  if (errors.length > 0) {
    throw new TwitterApiError(errorMessages || 'Twitter API error', {
      status,
      endpoint,
      data: response,
    });
  }

  return { handled: false };
}

/**
 * XActions Client — Input Validation
 * Validators used by Scraper class methods before making API calls.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { ScraperError } from './errors.js';

/**
 * Validate and clean a Twitter username.
 * Strips leading @, checks length and character requirements.
 *
 * @param {string} username - Raw username input
 * @returns {string} Cleaned username (no @)
 * @throws {ScraperError} If username is invalid
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    throw new ScraperError('Username is required', 'INVALID_INPUT');
  }
  const cleaned = username.startsWith('@') ? username.slice(1) : username;
  if (cleaned.length === 0 || cleaned.length > 15) {
    throw new ScraperError(
      `Invalid username "${username}": must be 1-15 characters`,
      'INVALID_INPUT',
    );
  }
  if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
    throw new ScraperError(
      `Invalid username "${username}": only letters, numbers, and underscores allowed`,
      'INVALID_INPUT',
    );
  }
  return cleaned;
}

/**
 * Validate a tweet ID (numeric string).
 *
 * @param {string} id - Tweet ID
 * @returns {string} Validated tweet ID
 * @throws {ScraperError} If ID is invalid
 */
export function validateTweetId(id) {
  if (!id || typeof id !== 'string') {
    throw new ScraperError('Tweet ID is required', 'INVALID_INPUT');
  }
  const cleaned = id.trim();
  if (!/^\d+$/.test(cleaned)) {
    throw new ScraperError(
      `Invalid tweet ID "${id}": must be numeric`,
      'INVALID_INPUT',
    );
  }
  if (cleaned.length < 1 || cleaned.length > 25) {
    throw new ScraperError(
      `Invalid tweet ID "${id}": unexpected length`,
      'INVALID_INPUT',
    );
  }
  return cleaned;
}

/**
 * Validate tweet text content.
 *
 * @param {string} text - Tweet content
 * @param {Object} [options={}]
 * @param {boolean} [options.allowLongTweets=false] - Allow up to 25000 chars
 * @returns {string} Validated text
 * @throws {ScraperError} If text is invalid
 */
export function validateTweetText(text, options = {}) {
  if (!text || typeof text !== 'string') {
    throw new ScraperError('Tweet text is required', 'INVALID_INPUT');
  }
  const maxLength = options.allowLongTweets ? 25000 : 280;
  if (text.length > maxLength) {
    throw new ScraperError(
      `Tweet text exceeds ${maxLength} characters (got ${text.length})`,
      'INVALID_INPUT',
    );
  }
  return text;
}

/**
 * Validate a numeric count parameter.
 *
 * @param {number} count - Count value
 * @param {number} [min=1] - Minimum allowed
 * @param {number} [max=10000] - Maximum allowed
 * @returns {number} Validated count
 * @throws {ScraperError} If count is out of range
 */
export function validateCount(count, min = 1, max = 10000) {
  const num = Number(count);
  if (!Number.isFinite(num) || num < min || num > max) {
    throw new ScraperError(
      `Count must be between ${min} and ${max}, got ${count}`,
      'INVALID_INPUT',
    );
  }
  return Math.floor(num);
}

/**
 * Validate a URL string.
 *
 * @param {string} url - URL to validate
 * @returns {string} Validated URL
 * @throws {ScraperError} If URL is invalid
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new ScraperError('URL is required', 'INVALID_INPUT');
  }
  try {
    new URL(url);
    return url;
  } catch {
    throw new ScraperError(`Invalid URL: ${url}`, 'INVALID_INPUT');
  }
}

/**
 * Validate a list ID.
 *
 * @param {string} listId - List ID
 * @returns {string} Validated list ID
 * @throws {ScraperError} If list ID is invalid
 */
export function validateListId(listId) {
  if (!listId || typeof listId !== 'string') {
    throw new ScraperError('List ID is required', 'INVALID_INPUT');
  }
  const cleaned = listId.trim();
  if (!/^\d+$/.test(cleaned)) {
    throw new ScraperError(
      `Invalid list ID "${listId}": must be numeric`,
      'INVALID_INPUT',
    );
  }
  return cleaned;
}

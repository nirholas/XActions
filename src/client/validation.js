/**
 * XActions Client — Input Validation
 * Validators for usernames, tweet IDs, URLs, etc.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { ScraperError } from './errors.js';

/**
 * Validate and clean a Twitter username.
 * Strips leading @, enforces 1-15 alphanumeric + underscore chars.
 *
 * @param {string} username
 * @returns {string} Cleaned username
 * @throws {ScraperError}
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    throw new ScraperError('Username is required', 'INVALID_INPUT');
  }
  let cleaned = username.trim();
  if (cleaned.startsWith('@')) cleaned = cleaned.slice(1);
  if (cleaned.length < 1 || cleaned.length > 15) {
    throw new ScraperError('Username must be 1-15 characters', 'INVALID_INPUT');
  }
  if (!/^[A-Za-z0-9_]+$/.test(cleaned)) {
    throw new ScraperError('Username may only contain letters, numbers, and underscores', 'INVALID_INPUT');
  }
  return cleaned;
}

/**
 * Validate a numeric tweet ID string.
 *
 * @param {string} id
 * @returns {string}
 * @throws {ScraperError}
 */
export function validateTweetId(id) {
  if (!id || typeof id !== 'string') {
    throw new ScraperError('Tweet ID is required', 'INVALID_INPUT');
  }
  const cleaned = id.trim();
  if (!/^\d{1,20}$/.test(cleaned)) {
    throw new ScraperError('Tweet ID must be a numeric string (1-20 digits)', 'INVALID_INPUT');
  }
  return cleaned;
}

/**
 * Validate tweet text length.
 *
 * @param {string} text
 * @param {number} [maxLength=280]
 * @returns {string}
 * @throws {ScraperError}
 */
export function validateTweetText(text, maxLength = 25000) {
  if (!text || typeof text !== 'string') {
    throw new ScraperError('Tweet text is required', 'INVALID_INPUT');
  }
  if (text.length > maxLength) {
    throw new ScraperError(`Tweet text exceeds maximum length of ${maxLength} characters`, 'INVALID_INPUT');
  }
  return text;
}

/**
 * Validate a count parameter.
 *
 * @param {number} count
 * @param {number} [min=1]
 * @param {number} [max=10000]
 * @returns {number}
 * @throws {ScraperError}
 */
export function validateCount(count, min = 1, max = 10000) {
  const num = Number(count);
  if (isNaN(num) || num < min || num > max) {
    throw new ScraperError(`Count must be a number between ${min} and ${max}`, 'INVALID_INPUT');
  }
  return Math.floor(num);
}

/**
 * Validate a numeric user ID.
 *
 * @param {string} userId
 * @returns {string}
 * @throws {ScraperError}
 */
export function validateUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    throw new ScraperError('User ID is required', 'INVALID_INPUT');
  }
  const cleaned = userId.trim();
  if (!/^\d+$/.test(cleaned)) {
    throw new ScraperError('User ID must be a numeric string', 'INVALID_INPUT');
  }
  return cleaned;
}

/**
 * Validate a numeric list ID.
 *
 * @param {string} listId
 * @returns {string}
 * @throws {ScraperError}
 */
export function validateListId(listId) {
  if (!listId || typeof listId !== 'string') {
    throw new ScraperError('List ID is required', 'INVALID_INPUT');
  }
  const cleaned = listId.trim();
  if (!/^\d+$/.test(cleaned)) {
    throw new ScraperError('List ID must be a numeric string', 'INVALID_INPUT');
  }
  return cleaned;
}

/**
 * Validate a URL string.
 *
 * @param {string} url
 * @returns {string}
 * @throws {ScraperError}
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new ScraperError('URL is required', 'INVALID_INPUT');
  }
  try {
    new URL(url);
    return url;
  } catch {
    throw new ScraperError('Invalid URL', 'INVALID_INPUT');
  }
}

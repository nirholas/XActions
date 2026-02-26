/**/**







































































































































}  return str;  }    throw new ScraperError('User ID must be a numeric string', 'INVALID_INPUT');  if (!str || !/^\d{1,20}$/.test(str)) {  const str = String(id).trim();export function validateUserId(id) { */ * @throws {ScraperError} If ID is invalid * @returns {string} Validated user ID * @param {string} id - User ID * * Validate a user ID (numeric string)./**}  return str;  }    throw new ScraperError('List ID must be a numeric string', 'INVALID_INPUT');  if (!str || !/^\d{1,20}$/.test(str)) {  const str = String(id).trim();export function validateListId(id) { */ * @throws {ScraperError} If ID is invalid * @returns {string} Validated list ID * @param {string} id - List ID * * Validate a list ID (numeric string)./**}  }    throw new ScraperError('Invalid URL', 'INVALID_INPUT');  } catch {    return parsed.href;    }      throw new Error('bad protocol');    if (!['http:', 'https:'].includes(parsed.protocol)) {    const parsed = new URL(url);  try {  }    throw new ScraperError('URL is required', 'INVALID_INPUT');  if (typeof url !== 'string' || !url.trim()) {export function validateUrl(url) { */ * @throws {ScraperError} If URL is invalid * @returns {string} Validated URL * @param {string} url - URL to validate * * Validate a URL string./**}  return Math.floor(n);  }    throw new ScraperError(`Count must be a number between ${min} and ${max}`, 'INVALID_INPUT');  if (!Number.isFinite(n) || n < min || n > max) {  const n = Number(count);export function validateCount(count, min = 1, max = 10000) { */ * @throws {ScraperError} If count is out of range * @returns {number} Validated count * @param {number} [max=10000] - Maximum allowed value * @param {number} [min=1] - Minimum allowed value * @param {number} count - The count value * * Validate a numeric count within a range./**}  return text;  }    throw new ScraperError(`Tweet text exceeds maximum length of ${maxLength} characters`, 'INVALID_INPUT');  if (text.length > maxLength) {  const maxLength = options.longTweet ? 25000 : 280;  }    throw new ScraperError('Tweet text is required', 'INVALID_INPUT');  if (typeof text !== 'string' || !text.trim()) {export function validateTweetText(text, options = {}) { */ * @throws {ScraperError} If text is invalid * @returns {string} Validated text * @param {boolean} [options.longTweet=false] - Allow long tweets (up to 25000 chars) * @param {Object} [options] * @param {string} text - Tweet text * * Validate tweet text length./**}  return str;  }    throw new ScraperError('Tweet ID must be a numeric string (1-20 digits)', 'INVALID_INPUT');  if (!str || !/^\d{1,20}$/.test(str)) {  const str = String(id).trim();export function validateTweetId(id) { */ * @throws {ScraperError} If ID is invalid * @returns {string} Validated tweet ID * @param {string} id - Tweet ID * * Validate a tweet ID (numeric string)./**}  return cleaned;  }    throw new ScraperError('Username may only contain letters, numbers, and underscores', 'INVALID_INPUT');  if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {  }    throw new ScraperError('Username must be 1-15 characters', 'INVALID_INPUT');  if (cleaned.length === 0 || cleaned.length > 15) {  const cleaned = username.trim().replace(/^@/, '');  }    throw new ScraperError('Username is required', 'INVALID_INPUT');  if (typeof username !== 'string' || !username.trim()) {export function validateUsername(username) { */ * @throws {ScraperError} If username is invalid * @returns {string} Cleaned username without @ * @param {string} username - Raw username input * * Strips leading @, enforces 1-15 chars, alphanumeric + underscore only. * Validate and clean a Twitter username./**import { ScraperError } from './errors.js'; */ * @license MIT * @author nich (@nichxbt) - https://github.com/nirholas * * Validates and sanitizes user input before API calls. * XActions Client — Input Validation * XActions Client — Input Validation
 * Validators used by the Scraper class before making API calls.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { ScraperError } from './errors.js';

/**
 * Validate and clean a Twitter username.
 * Strips leading @ sign, checks length and character constraints.
 *
 * @param {string} username - Raw username input
 * @returns {string} Cleaned username (no @)
 * @throws {ScraperError} If username is invalid
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    throw new ScraperError('Username is required', 'INVALID_INPUT');
  }
  let cleaned = username.trim();
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.slice(1);
  }
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
 * Validate a tweet ID string.
 *
 * @param {string} id - Tweet ID
 * @returns {string} Validated tweet ID
 * @throws {ScraperError} If the ID is invalid
 */
export function validateTweetId(id) {
  if (!id || typeof id !== 'string') {
    throw new ScraperError('Tweet ID is required', 'INVALID_INPUT');
  }
  const cleaned = id.trim();
  if (!/^\d{1,20}$/.test(cleaned)) {
    throw new ScraperError(
      `Invalid tweet ID "${id}": must be a numeric string`,
      'INVALID_INPUT',
    );
  }
  return cleaned;
}

/**
 * Validate tweet text content.
 *
 * @param {string} text - Tweet text
 * @param {Object} [options]
 * @param {boolean} [options.longTweet=false] - Allow up to 25 000 chars (premium)
 * @returns {string} Validated text
 * @throws {ScraperError} If text exceeds limit or is empty
 */
export function validateTweetText(text, options = {}) {
  if (!text || typeof text !== 'string') {
    throw new ScraperError('Tweet text is required', 'INVALID_INPUT');
  }
  const maxLen = options.longTweet ? 25000 : 280;
  if (text.length > maxLen) {
    throw new ScraperError(
      `Tweet text exceeds maximum length of ${maxLen} characters (got ${text.length})`,
      'INVALID_INPUT',
    );
  }
  return text;
}

/**
 * Validate a numeric count within a range.
 *
 * @param {number} count - The count to validate
 * @param {number} [min=1] - Minimum allowed
 * @param {number} [max=10000] - Maximum allowed
 * @returns {number} Validated count
 * @throws {ScraperError} If count is out of range
 */
export function validateCount(count, min = 1, max = 10000) {
  const num = Number(count);
  if (!Number.isFinite(num) || num < min || num > max) {
    throw new ScraperError(
      `Invalid count ${count}: must be between ${min} and ${max}`,
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
 * @throws {ScraperError} If URL is malformed
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    throw new ScraperError('URL is required', 'INVALID_INPUT');
  }
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('bad protocol');
    }
    return parsed.href;
  } catch {
    throw new ScraperError(`Invalid URL "${url}"`, 'INVALID_INPUT');
  }
}

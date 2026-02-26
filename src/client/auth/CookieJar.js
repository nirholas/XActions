/**
 * XActions Client — CookieJar
 * Lightweight cookie storage for Twitter session cookies.
 * Handles serialization, deserialization, and file persistence.
 *
 * Twitter's critical cookies:
 *   - auth_token — session token (persists across restarts)
 *   - ct0 — CSRF token (changes frequently)
 *   - twid — user ID in format u%3D1234567890
 *   - guest_id — guest session ID
 *   - personalization_id — tracking cookie
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';

/**
 * @typedef {Object} Cookie
 * @property {string} name
 * @property {string} value
 * @property {string} domain
 * @property {string} path
 * @property {Date|null} expires
 * @property {boolean} httpOnly
 * @property {boolean} secure
 * @property {string} sameSite
 */

/**
 * Lightweight cookie jar for Twitter session cookies.
 * Not a full HTTP cookie spec implementation — just enough for Twitter's auth.
 */
export class CookieJar {
  /**
   * @param {Array<Cookie>} [cookies=[]] - Initial cookies
   */
  constructor(cookies = []) {
    /** @type {Map<string, Cookie>} */
    this._cookies = new Map();
    for (const cookie of cookies) {
      this._cookies.set(cookie.name, this._normalizeCookie(cookie));
    }
  }

  /**
   * Normalize a cookie object to ensure all fields exist.
   * @private
   * @param {Partial<Cookie>} cookie
   * @returns {Cookie}
   */
  _normalizeCookie(cookie) {
    return {
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain || '.x.com',
      path: cookie.path || '/',
      expires: cookie.expires ? new Date(cookie.expires) : null,
      httpOnly: cookie.httpOnly ?? false,
      secure: cookie.secure ?? true,
      sameSite: cookie.sameSite || 'None',
    };
  }

  /**
   * Add or update a cookie by name.
   * @param {Partial<Cookie>} cookie
   */
  set(cookie) {
    if (!cookie || !cookie.name) return;
    this._cookies.set(cookie.name, this._normalizeCookie(cookie));
  }

  /**
   * Get a cookie by name.
   * @param {string} name
   * @returns {Cookie|null}
   */
  get(name) {
    return this._cookies.get(name) || null;
  }

  /**
   * Get the value of a cookie by name.
   * @param {string} name
   * @returns {string|null}
   */
  getValue(name) {
    const cookie = this._cookies.get(name);
    return cookie ? cookie.value : null;
  }

  /**
   * Get all cookies as an array.
   * @returns {Array<Cookie>}
   */
  getAll() {
    return Array.from(this._cookies.values());
  }

  /**
   * Check if a cookie exists by name.
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this._cookies.has(name);
  }

  /**
   * Remove a cookie by name.
   * @param {string} name
   */
  remove(name) {
    this._cookies.delete(name);
  }

  /**
   * Remove all cookies.
   */
  clear() {
    this._cookies.clear();
  }

  /**
   * Get the number of stored cookies.
   * @returns {number}
   */
  get size() {
    return this._cookies.size;
  }

  /**
   * Format cookies as an HTTP Cookie header string.
   * @returns {string} "name1=value1; name2=value2"
   */
  toCookieString() {
    const parts = [];
    for (const cookie of this._cookies.values()) {
      parts.push(`${cookie.name}=${cookie.value}`);
    }
    return parts.join('; ');
  }

  /**
   * Serialize to a JSON-safe array.
   * @returns {Array<Object>}
   */
  toJSON() {
    return this.getAll().map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expires ? c.expires.toISOString() : null,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
    }));
  }

  /**
   * Deserialize from a JSON array.
   * @param {Array<Object>} json
   * @returns {CookieJar}
   */
  static fromJSON(json) {
    if (!Array.isArray(json)) return new CookieJar();
    return new CookieJar(
      json.map((c) => ({
        ...c,
        expires: c.expires ? new Date(c.expires) : null,
      })),
    );
  }

  /**
   * Save cookies to a JSON file.
   * Creates parent directories if needed.
   * @param {string} filePath
   */
  async saveToFile(filePath) {
    const dir = dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(this.toJSON(), null, 2), 'utf8');
  }

  /**
   * Load cookies from a JSON file.
   * Returns an empty CookieJar if the file does not exist.
   * @param {string} filePath
   * @returns {Promise<CookieJar>}
   */
  static async loadFromFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const json = JSON.parse(data);
      return CookieJar.fromJSON(json);
    } catch {
      return new CookieJar();
    }
  }

  /**
   * Check if a specific cookie has expired.
   * @param {string} name
   * @returns {boolean}
   */
  isExpired(name) {
    const cookie = this._cookies.get(name);
    if (!cookie || !cookie.expires) return false;
    return cookie.expires.getTime() < Date.now();
  }

  /**
   * Remove all expired cookies.
   */
  removeExpired() {
    const now = Date.now();
    for (const [name, cookie] of this._cookies) {
      if (cookie.expires && cookie.expires.getTime() < now) {
        this._cookies.delete(name);
      }
    }
  }

  /**
   * Clone this cookie jar.
   * @returns {CookieJar}
   */
  clone() {
    return CookieJar.fromJSON(this.toJSON());
  }
}

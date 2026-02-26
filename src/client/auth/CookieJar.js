/**
 * XActions Client — CookieJar
 *
 * A lightweight cookie jar that stores, serializes, and deserializes Twitter
 * session cookies. Not a full HTTP cookie spec implementation — just enough
 * for Twitter's auth cookies (auth_token, ct0, twid, guest_id, personalization_id).
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
 * @property {string} [domain='.x.com']
 * @property {string} [path='/']
 * @property {Date|null} [expires=null]
 * @property {boolean} [httpOnly=false]
 * @property {boolean} [secure=false]
 * @property {string} [sameSite='Lax']
 */

// ============================================================================
// CookieJar Class
// ============================================================================

/**
 * Lightweight cookie jar for Twitter session cookies.
 */
export class CookieJar {
  /**
   * @param {Array<Cookie>} [cookies] - Optional initial cookies
   */
  constructor(cookies) {
    /** @private @type {Map<string, Cookie>} */
    this._cookies = new Map();

    if (Array.isArray(cookies)) {
      for (const c of cookies) {
        if (c && c.name) this.set(c);
      }
    }
  }

  /**
   * Add or update a cookie by name.
   *
   * @param {Cookie|{name: string, value: string}} cookie
   */
  set(cookie) {
    if (!cookie || !cookie.name) return;

    this._cookies.set(cookie.name, {
      name: cookie.name,
      value: cookie.value ?? '',
      domain: cookie.domain || '.x.com',
      path: cookie.path || '/',
      expires: cookie.expires ? new Date(cookie.expires) : null,
      httpOnly: Boolean(cookie.httpOnly),
      secure: Boolean(cookie.secure),
      sameSite: cookie.sameSite || 'Lax',
    });
  }

  /**
   * Get a cookie by name.
   *
   * @param {string} name
   * @returns {Cookie|null}
   */
  get(name) {
    return this._cookies.get(name) || null;
  }

  /**
   * Get all cookies as an array.
   *
   * @returns {Array<Cookie>}
   */
  getAll() {
    return Array.from(this._cookies.values());
  }

  /**
   * Get just the value of a cookie by name.
   *
   * @param {string} name
   * @returns {string|null}
   */
  getValue(name) {
    const cookie = this._cookies.get(name);
    return cookie ? cookie.value : null;
  }

  /**
   * Remove a cookie by name.
   *
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
   * Check if a cookie exists.
   *
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this._cookies.has(name);
  }

  /**
   * Format as HTTP Cookie header value: "name1=value1; name2=value2".
   *
   * @returns {string}
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
   *
   * @returns {Array<Cookie>}
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
   *
   * @param {Array<Cookie>} json
   * @returns {CookieJar}
   */
  static fromJSON(json) {
    if (!Array.isArray(json)) return new CookieJar();
    return new CookieJar(json);
  }

  /**
   * Save cookies to a JSON file.
   * Creates the directory if it doesn't exist.
   *
   * @param {string} filePath
   * @returns {Promise<void>}
   */
  async saveToFile(filePath) {
    await fs.mkdir(dirname(filePath), { recursive: true });
    const data = JSON.stringify(this.toJSON(), null, 2);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  /**
   * Load cookies from a JSON file.
   * Returns an empty CookieJar if the file doesn't exist.
   *
   * @param {string} filePath
   * @returns {Promise<CookieJar>}
   */
  static async loadFromFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const json = JSON.parse(content);
      return CookieJar.fromJSON(json);
    } catch (err) {
      if (err.code === 'ENOENT') return new CookieJar();
      throw err;
    }
  }

  /**
   * Check if a specific cookie has expired.
   *
   * @param {string} name
   * @returns {boolean}
   */
  isExpired(name) {
    const cookie = this._cookies.get(name);
    if (!cookie) return true;
    if (!cookie.expires) return false;
    return cookie.expires.getTime() < Date.now();
  }

  /**
   * Remove all expired cookies.
   */
  removeExpired() {
    const now = Date.now();
    for (const [name, cookie] of this._cookies.entries()) {
      if (cookie.expires && cookie.expires.getTime() < now) {
        this._cookies.delete(name);
      }
    }
  }

  /**
   * Get the number of stored cookies.
   *
   * @returns {number}
   */
  get size() {
    return this._cookies.size;
  }
}

export default CookieJar;

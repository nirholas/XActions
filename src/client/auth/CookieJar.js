/**
 * XActions Client — CookieJar
 *
 * Lightweight cookie jar that stores, serializes, and deserializes Twitter session cookies.
 * Not a full HTTP cookie spec implementation — just enough for Twitter's auth cookies.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * @typedef {Object} Cookie
 * @property {string} name
 * @property {string} value
 * @property {string} [domain='.x.com']
 * @property {string} [path='/']
 * @property {Date|null} [expires=null]
 * @property {boolean} [httpOnly=false]
 * @property {boolean} [secure=true]
 * @property {string} [sameSite='Lax']
 */

/**
 * Stores and manages cookies for Twitter API authentication.
 */
export class CookieJar {
  /**
   * @param {Array<Cookie>} [cookies] - Optional initial cookies
   */
  constructor(cookies) {
    /** @type {Map<string, Cookie>} */
    this._cookies = new Map();

    if (Array.isArray(cookies)) {
      for (const cookie of cookies) {
        if (cookie && cookie.name) {
          this.set(cookie);
        }
      }
    }
  }

  /**
   * Add or update a cookie.
   * @param {Cookie} cookie
   */
  set(cookie) {
    this._cookies.set(cookie.name, {
      name: cookie.name,
      value: cookie.value || '',
      domain: cookie.domain || '.x.com',
      path: cookie.path || '/',
      expires: cookie.expires ? new Date(cookie.expires) : null,
      httpOnly: cookie.httpOnly || false,
      secure: cookie.secure !== false,
      sameSite: cookie.sameSite || 'Lax',
    });
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
   * Get all cookies as an array.
   * @returns {Array<Cookie>}
   */
  getAll() {
    return [...this._cookies.values()];
  }

  /**
   * Get just the value of a cookie.
   * @param {string} name
   * @returns {string|null}
   */
  getValue(name) {
    const cookie = this._cookies.get(name);
    return cookie ? cookie.value : null;
  }

  /**
   * Check if a cookie exists.
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
   * Get the number of cookies.
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
   * Check if a cookie has expired.
   * @param {string} name
   * @returns {boolean}
   */
  isExpired(name) {
    const cookie = this._cookies.get(name);
    if (!cookie) return true;
    if (!cookie.expires) return false; // No expiry = session cookie, not expired
    return new Date() > cookie.expires;
  }

  /**
   * Remove all expired cookies.
   */
  removeExpired() {
    const now = new Date();
    for (const [name, cookie] of this._cookies) {
      if (cookie.expires && now > cookie.expires) {
        this._cookies.delete(name);
      }
    }
  }

  /**
   * Serialize cookies to a JSON-safe array.
   * @returns {Array<Object>}
   */
  toJSON() {
    return this.getAll().map((cookie) => ({
      ...cookie,
      expires: cookie.expires ? cookie.expires.toISOString() : null,
    }));
  }

  /**
   * Deserialize from a JSON array.
   * @param {Array<Object>} json
   * @returns {CookieJar}
   */
  static fromJSON(json) {
    if (!Array.isArray(json)) {
      // Handle { cookies: [...] } format
      if (json && Array.isArray(json.cookies)) {
        json = json.cookies;
      } else if (json && typeof json === 'object') {
        // Handle { name: value } plain object format
        const cookies = Object.entries(json).map(([name, value]) => ({
          name,
          value: String(value),
          domain: '.x.com',
          path: '/',
        }));
        return new CookieJar(cookies);
      } else {
        return new CookieJar();
      }
    }
    return new CookieJar(
      json.map((c) => ({
        ...c,
        expires: c.expires ? new Date(c.expires) : null,
      })),
    );
  }

  /**
   * Save cookies to a JSON file.
   * Creates parent directories as needed.
   * @param {string} filePath
   */
  async saveToFile(filePath) {
    await mkdir(dirname(filePath), { recursive: true });
    const data = JSON.stringify(this.toJSON(), null, 2);
    await writeFile(filePath, data, 'utf-8');
  }

  /**
   * Load cookies from a JSON file.
   * Returns empty CookieJar if file doesn't exist.
   * @param {string} filePath
   * @returns {Promise<CookieJar>}
   */
  static async loadFromFile(filePath) {
    try {
      const raw = await readFile(filePath, 'utf-8');
      const json = JSON.parse(raw);
      return CookieJar.fromJSON(json);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return new CookieJar();
      }
      throw err;
    }
  }

  /**
   * Clone this CookieJar.
   * @returns {CookieJar}
   */
  clone() {
    return CookieJar.fromJSON(this.toJSON());
  }

  /**
   * Iterator support.
   * @returns {IterableIterator<Cookie>}
   */
  [Symbol.iterator]() {
    return this._cookies.values();
  }
}

/**
 * XActions Client — CookieAuth
 *
 * Cookie management class that stores, serializes, and loads Twitter session cookies.
 * Supports file persistence, environment variable loading, and cookie string parsing.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { homedir } from 'node:os';
import { join } from 'node:path';

// ============================================================================
// Constants
// ============================================================================

/** Default cookie storage path */
const DEFAULT_COOKIE_PATH = join(homedir(), '.xactions', 'cookies.json');

/** Environment variable name for session cookie */
const ENV_SESSION_COOKIE = 'XACTIONS_SESSION_COOKIE';

// ============================================================================
// CookieAuth Class
// ============================================================================

/**
 * Manages Twitter session cookies — storage, serialization, persistence.
 *
 * Usage:
 *   const auth = new CookieAuth();
 *   auth.set('auth_token', 'abc123');
 *   auth.set('ct0', 'xyz789');
 *   await auth.save('cookies.json');
 *
 * Twitter's critical cookies:
 *   - auth_token — session token (persists across restarts)
 *   - ct0 — CSRF token (changes frequently, must match x-csrf-token header)
 *   - guest_id — guest session ID (optional)
 *   - twid — user ID in format u%3D1234567890 (optional)
 *   - personalization_id — tracking cookie (optional)
 */
export class CookieAuth {
  /** @type {Map<string, string>} */
  #cookies;

  /** @type {string|null} */
  #username;

  /** @type {string|null} */
  #created;

  /**
   * Creates a new CookieAuth instance.
   * @param {Object} [options]
   * @param {Record<string, string>} [options.cookies] - Initial cookies
   * @param {string} [options.username] - Associated Twitter username
   */
  constructor(options = {}) {
    this.#cookies = new Map();
    this.#username = options.username || null;
    this.#created = new Date().toISOString();

    if (options.cookies) {
      for (const [name, value] of Object.entries(options.cookies)) {
        this.#cookies.set(name, String(value));
      }
    }
  }

  /**
   * Set a cookie value.
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @returns {CookieAuth} this (for chaining)
   */
  set(name, value) {
    this.#cookies.set(name, String(value));
    return this;
  }

  /**
   * Get a cookie value.
   * @param {string} name - Cookie name
   * @returns {string|undefined} Cookie value or undefined if not set
   */
  get(name) {
    return this.#cookies.get(name);
  }

  /**
   * Check if a cookie exists.
   * @param {string} name - Cookie name
   * @returns {boolean}
   */
  has(name) {
    return this.#cookies.has(name);
  }

  /**
   * Delete a cookie.
   * @param {string} name - Cookie name
   * @returns {boolean} true if the cookie existed and was removed
   */
  delete(name) {
    return this.#cookies.delete(name);
  }

  /**
   * Remove all cookies.
   * @returns {CookieAuth} this (for chaining)
   */
  clear() {
    this.#cookies.clear();
    return this;
  }

  /**
   * Get all cookies as a plain object.
   * @returns {Record<string, string>}
   */
  getAll() {
    const obj = {};
    for (const [name, value] of this.#cookies) {
      obj[name] = value;
    }
    return obj;
  }

  /**
   * Get the number of stored cookies.
   * @returns {number}
   */
  get size() {
    return this.#cookies.size;
  }

  /**
   * Get or set the associated username.
   * @returns {string|null}
   */
  get username() {
    return this.#username;
  }

  set username(value) {
    this.#username = value || null;
  }

  /**
   * Format cookies as an HTTP Cookie header string.
   * @returns {string} "name1=value1; name2=value2"
   */
  toString() {
    const parts = [];
    for (const [name, value] of this.#cookies) {
      parts.push(`${name}=${value}`);
    }
    return parts.join('; ');
  }

  /**
   * Check if the session is authenticated.
   * Returns true only if both auth_token AND ct0 are present.
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.#cookies.has('auth_token') && this.#cookies.has('ct0') &&
      this.#cookies.get('auth_token') !== '' && this.#cookies.get('ct0') !== '';
  }

  /**
   * Get headers required for authenticated Twitter API requests.
   * @returns {{ Cookie: string, 'x-csrf-token': string }}
   */
  getAuthHeaders() {
    return {
      'Cookie': this.toString(),
      'x-csrf-token': this.get('ct0') || '',
    };
  }

  /**
   * Extract the authenticated user ID from the twid cookie.
   * twid format: "u%3D1234567890" → decodeURIComponent → "u=1234567890" → "1234567890"
   * @returns {string|null}
   */
  getUserId() {
    const twid = this.get('twid');
    if (!twid) return null;
    try {
      const decoded = decodeURIComponent(twid);
      return decoded.replace('u=', '');
    } catch {
      return null;
    }
  }

  /**
   * Serialize cookies to a JSON-safe object.
   * @returns {{ cookies: Record<string, string>, created: string, username: string|null }}
   */
  toJSON() {
    return {
      cookies: this.getAll(),
      created: this.#created,
      username: this.#username,
    };
  }

  /**
   * Save cookies to a JSON file.
   * Creates the directory if it doesn't exist.
   * @param {string} [filePath] - Path to save to (default: ~/.xactions/cookies.json)
   * @returns {Promise<void>}
   */
  async save(filePath = DEFAULT_COOKIE_PATH) {
    const dir = dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const data = JSON.stringify(this.toJSON(), null, 2);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  /**
   * Load cookies from a JSON file.
   * @param {string} [filePath] - Path to load from (default: ~/.xactions/cookies.json)
   * @returns {Promise<CookieAuth>} New CookieAuth instance with loaded cookies
   * @throws {Error} If the file doesn't exist or is invalid JSON
   */
  static async load(filePath = DEFAULT_COOKIE_PATH) {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);

    if (!data || typeof data.cookies !== 'object') {
      throw new Error(`Invalid cookie file format: ${filePath}`);
    }

    const auth = new CookieAuth({
      cookies: data.cookies,
      username: data.username || null,
    });
    auth.#created = data.created || new Date().toISOString();
    return auth;
  }

  /**
   * Create a CookieAuth instance from the XACTIONS_SESSION_COOKIE environment variable.
   * The env var should contain the auth_token value.
   * @returns {CookieAuth}
   */
  static fromEnv() {
    const auth = new CookieAuth();
    const sessionCookie = process.env[ENV_SESSION_COOKIE];
    if (sessionCookie) {
      auth.set('auth_token', sessionCookie);
    }
    return auth;
  }

  /**
   * Create a CookieAuth instance from a plain object.
   * @param {Record<string, string>} obj - { auth_token: '...', ct0: '...', ... }
   * @returns {CookieAuth}
   */
  static fromObject(obj) {
    return new CookieAuth({ cookies: obj });
  }

  /**
   * Parse a "name=value; name2=value2" cookie string into a CookieAuth instance.
   * @param {string} cookieString - HTTP Cookie header value
   * @returns {CookieAuth}
   */
  static parse(cookieString) {
    const auth = new CookieAuth();
    if (!cookieString || typeof cookieString !== 'string') {
      return auth;
    }

    const pairs = cookieString.split(';');
    for (const pair of pairs) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const name = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (name) {
        auth.set(name, value);
      }
    }

    return auth;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Auto-detect the best cookie source and create a CookieAuth instance.
 *
 * Priority:
 *   1. options.cookies (object) → fromObject
 *   2. options.cookieString → parse
 *   3. options.filePath → load from file
 *   4. options.authToken → set auth_token directly
 *   5. XACTIONS_SESSION_COOKIE env var → fromEnv
 *   6. Default cookie file (~/.xactions/cookies.json) → try to load
 *   7. Empty CookieAuth
 *
 * @param {Object} [options]
 * @param {Record<string, string>} [options.cookies] - Cookie object
 * @param {string} [options.cookieString] - Cookie header string
 * @param {string} [options.filePath] - Path to cookie JSON file
 * @param {string} [options.authToken] - Single auth_token value
 * @returns {Promise<CookieAuth>}
 */
export async function createCookieAuth(options = {}) {
  if (options.cookies) {
    return CookieAuth.fromObject(options.cookies);
  }

  if (options.cookieString) {
    return CookieAuth.parse(options.cookieString);
  }

  if (options.filePath) {
    return CookieAuth.load(options.filePath);
  }

  if (options.authToken) {
    const auth = new CookieAuth();
    auth.set('auth_token', options.authToken);
    return auth;
  }

  if (process.env[ENV_SESSION_COOKIE]) {
    return CookieAuth.fromEnv();
  }

  // Try default cookie file
  try {
    return await CookieAuth.load();
  } catch {
    // No saved cookies found — return empty instance
    return new CookieAuth();
  }
}

export default CookieAuth;

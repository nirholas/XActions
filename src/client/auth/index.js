// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Client — Auth Module Index
 *
 * Barrel exports for the authentication system.
 * Provides convenience factory functions for quick setup.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

export { CookieAuth } from './CookieAuth.js';
export { GuestToken } from './GuestToken.js';
export { TokenManager } from './TokenManager.js';
export { CredentialAuth } from './CredentialAuth.js';

// ============================================================================
// Convenience: createAuth()
// ============================================================================

/**
 * Turn a plain `{ auth_token, ct0, ... }` map into `{ name, value }` pairs,
 * dropping empty values.
 * @param {Record<string, string>} map
 * @returns {Array<{name: string, value: string}>}
 */
function cookiePairs(map) {
  return Object.entries(map)
    .filter(([, value]) => value != null && value !== '')
    .map(([name, value]) => ({ name, value: String(value) }));
}

/**
 * Create a complete auth context from the available options.
 *
 * Priority:
 *   1. options.cookies — plain object { auth_token, ct0, ... }
 *   2. options.cookieString — HTTP Cookie header string
 *   3. options.authToken — a bare auth_token value
 *   4. options.file — path to a cookies.json file
 *   5. XACTIONS_SESSION_COOKIE env var (a cookie header, or a bare auth_token)
 *
 * @param {Object} [options]
 * @param {Object} [options.cookies] - Plain cookie object
 * @param {string} [options.cookieString] - Cookie header string
 * @param {string} [options.file] - Path to saved cookies JSON file
 * @param {string} [options.authToken] - Direct auth_token value
 * @param {Function} [options.fetch] - Custom fetch implementation
 * @returns {Promise<{ cookieAuth: CookieAuth, guestToken: GuestToken, tokenManager: TokenManager, credentialAuth: CredentialAuth }>}
 */
export async function createAuth(options = {}) {
  const { CookieAuth } = await import('./CookieAuth.js');
  const { GuestToken } = await import('./GuestToken.js');
  const { TokenManager } = await import('./TokenManager.js');
  const { CredentialAuth } = await import('./CredentialAuth.js');

  const tokenManager = new TokenManager(options.fetch);
  const cookieAuth = new CookieAuth(tokenManager);

  // Load the session from the best available source
  const envCookie = process.env.XACTIONS_SESSION_COOKIE;
  if (options.cookies) {
    cookieAuth.setCookies(cookiePairs(options.cookies));
  } else if (options.cookieString) {
    cookieAuth.setCookies(options.cookieString);
  } else if (options.authToken) {
    cookieAuth.setCookies([{ name: 'auth_token', value: options.authToken }]);
  } else if (options.file) {
    await cookieAuth.loadCookies(options.file);
  } else if (envCookie) {
    cookieAuth.setCookies(envCookie.includes('=') ? envCookie : [{ name: 'auth_token', value: envCookie }]);
  }

  const guestToken = new GuestToken({ fetch: options.fetch });
  const credentialAuth = new CredentialAuth(cookieAuth, tokenManager);
  if (options.fetch) credentialAuth.setFetch(options.fetch);

  return { cookieAuth, guestToken, tokenManager, credentialAuth };
}

// ============================================================================
// Convenience: login()
// ============================================================================

/**
 * One-liner login function. Creates auth objects, performs login, and optionally saves cookies.
 *
 * The credential flow does not answer two-factor challenges; an account with
 * 2FA enabled should import its browser cookies instead (`xactions connect`).
 *
 * @param {Object} options
 * @param {string} options.username - Twitter username (without @)
 * @param {string} options.password - Account password
 * @param {string} [options.email] - Email for verification prompts
 * @param {string} [options.cookieFile] - Path to save cookies after successful login
 * @param {Function} [options.fetch] - Custom fetch implementation
 * @returns {Promise<{ cookieAuth: CookieAuth, tokenManager: TokenManager }>}
 */
export async function login({ username, password, email, cookieFile, fetch: fetchFn } = {}) {
  const auth = await createAuth({ fetch: fetchFn });

  await auth.credentialAuth.login({ username, password, email });

  if (cookieFile) {
    await auth.cookieAuth.saveCookies(cookieFile);
  }

  return {
    cookieAuth: auth.cookieAuth,
    tokenManager: auth.tokenManager,
  };
}

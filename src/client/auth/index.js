// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Client — Auth Module Index
 *
 * Barrel exports for the authentication system.
 * Provides convenience factory functions for quick setup.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

export { CookieAuth } from './CookieAuth.js';
export { GuestToken } from './GuestToken.js';
export { TokenManager } from './TokenManager.js';
export { CredentialAuth } from './CredentialAuth.js';

// ============================================================================
// Convenience: createAuth()
// ============================================================================

/**
 * Create a complete auth context from the available options.
 *
 * Priority:
 *   1. options.cookies — plain object { auth_token, ct0, ... }
 *   2. options.cookieString — HTTP Cookie header string
 *   3. options.file — path to a cookies.json file
 *   4. XACTIONS_SESSION_COOKIE env var
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

  // Populate CookieAuth from the best available source
  if (options.cookies) {
    cookieAuth.setCookies(Object.entries(options.cookies).map(([name, value]) => ({ name, value })));
  } else if (options.cookieString) {
    cookieAuth.setCookies(options.cookieString);
  } else if (options.authToken) {
    cookieAuth.setCookies([{ name: 'auth_token', value: options.authToken }]);
  } else if (options.file) {
    await cookieAuth.loadCookies(options.file);
  } else if (process.env.XACTIONS_SESSION_COOKIE) {
    cookieAuth.setCookies([{ name: 'auth_token', value: process.env.XACTIONS_SESSION_COOKIE }]);
  }

  const guestToken = new GuestToken({ fetch: options.fetch });
  const credentialAuth = new CredentialAuth(cookieAuth, tokenManager);

  if (options.fetch) {
    credentialAuth.setFetch(options.fetch);
  }

  return { cookieAuth, guestToken, tokenManager, credentialAuth };
}

// ============================================================================
// Convenience: login()
// ============================================================================

/**
 * One-liner login function. Creates auth objects, performs login, and optionally saves cookies.
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

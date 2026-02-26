/**
 * XActions Client — Auth Module Index
 *
 * Barrel exports for the authentication system.
 * Provides convenience factory functions for quick setup.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

export { CookieAuth, createCookieAuth } from './CookieAuth.js';
export { GuestToken } from './GuestToken.js';
export { TokenManager } from './TokenManager.js';
export { CredentialAuth } from './CredentialAuth.js';
export { TwoFactorAuth } from './TwoFactorAuth.js';

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
 * @returns {Promise<{ cookieAuth: CookieAuth, guestToken: GuestToken, tokenManager: TokenManager, credentialAuth: CredentialAuth, twoFactorAuth: TwoFactorAuth }>}
 */
export async function createAuth(options = {}) {
  const { CookieAuth } = await import('./CookieAuth.js');
  const { GuestToken } = await import('./GuestToken.js');
  const { TokenManager } = await import('./TokenManager.js');
  const { CredentialAuth } = await import('./CredentialAuth.js');
  const { TwoFactorAuth } = await import('./TwoFactorAuth.js');

  // Create CookieAuth from the best available source
  let cookieAuth;
  if (options.cookies) {
    cookieAuth = CookieAuth.fromObject(options.cookies);
  } else if (options.cookieString) {
    cookieAuth = CookieAuth.parse(options.cookieString);
  } else if (options.authToken) {
    cookieAuth = CookieAuth.fromObject({ auth_token: options.authToken });
  } else if (options.file) {
    cookieAuth = await CookieAuth.load(options.file);
  } else {
    cookieAuth = CookieAuth.fromEnv();
  }

  const guestToken = new GuestToken({ fetch: options.fetch });
  const tokenManager = new TokenManager({ cookieAuth, guestToken, fetch: options.fetch });
  const credentialAuth = new CredentialAuth({ cookieAuth, tokenManager });
  const twoFactorAuth = new TwoFactorAuth({ tokenManager });

  if (options.fetch) {
    credentialAuth.setFetch(options.fetch);
    twoFactorAuth.setFetch(options.fetch);
  }

  return { cookieAuth, guestToken, tokenManager, credentialAuth, twoFactorAuth };
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
 * @param {string} [options.twoFactorCode] - TOTP or SMS 2FA code (if known in advance)
 * @param {string} [options.cookieFile] - Path to save cookies after successful login
 * @param {Function} [options.fetch] - Custom fetch implementation
 * @returns {Promise<{ cookieAuth: CookieAuth, tokenManager: TokenManager }>}
 */
export async function login({ username, password, email, twoFactorCode, cookieFile, fetch: fetchFn } = {}) {
  const auth = await createAuth({ fetch: fetchFn });

  try {
    await auth.credentialAuth.login({ username, password, email });
  } catch (err) {
    if (err.code === 'TWO_FACTOR_REQUIRED' && twoFactorCode) {
      await auth.credentialAuth.submitTwoFactor({
        flowToken: err.flowToken,
        code: twoFactorCode,
      });
    } else {
      throw err;
    }
  }

  if (cookieFile) {
    await auth.cookieAuth.save(cookieFile);
  }

  return {
    cookieAuth: auth.cookieAuth,
    tokenManager: auth.tokenManager,
  };
}

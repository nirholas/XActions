/**
 * XActions Client — Session Validator
 *
 * Validates stored cookies against Twitter's API and handles session refresh.
 * Detects expired, locked, and suspended sessions.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { AuthenticationError, ScraperError } from '../errors.js';

const VERIFY_CREDENTIALS_URL = 'https://api.x.com/1.1/account/verify_credentials.json';

// ============================================================================
// SessionValidator Class
// ============================================================================

/**
 * Validates and refreshes Twitter authentication sessions.
 */
export class SessionValidator {
  /**
   * @param {Object} options
   * @param {import('./TokenManager.js').TokenManager} options.tokenManager - Token manager for headers
   * @param {import('./CookieAuth.js').CookieAuth} options.cookieAuth - Cookie auth for session data
   * @param {Function} [options.fetch] - Custom fetch implementation
   */
  constructor({ tokenManager, cookieAuth, fetch: fetchFn }) {
    /** @private */
    this._tokenManager = tokenManager;
    /** @private */
    this._cookieAuth = cookieAuth;
    /** @private */
    this._fetch = fetchFn || globalThis.fetch;
  }

  /**
   * Validate the current session by making a lightweight API call.
   *
   * @returns {Promise<{ valid: boolean, reason?: string, user?: Object }>}
   */
  async validate() {
    try {
      const headers = this._tokenManager.getHeaders(true);
      const response = await this._fetch(VERIFY_CREDENTIALS_URL, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const user = await response.json();
        return {
          valid: true,
          user: {
            id: user.id_str,
            username: user.screen_name,
            displayName: user.name,
            profileImageUrl: user.profile_image_url_https || null,
          },
        };
      }

      // Handle specific HTTP status codes
      if (response.status === 401) {
        return { valid: false, reason: 'expired' };
      }

      if (response.status === 403) {
        const body = await response.json().catch(() => ({}));
        const errors = body.errors || [];
        const errorCode = errors[0]?.code;

        if (errorCode === 326) {
          return { valid: false, reason: 'locked' };
        }
        if (errorCode === 64) {
          return { valid: false, reason: 'suspended' };
        }
        return { valid: false, reason: 'expired' };
      }

      // 429 = rate limited — session may still be valid
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('retry-after') || '60', 10);
        await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 10) * 1000));

        // Retry once
        const retryResponse = await this._fetch(VERIFY_CREDENTIALS_URL, {
          method: 'GET',
          headers: this._tokenManager.getHeaders(true),
        });

        if (retryResponse.ok) {
          const user = await retryResponse.json();
          return {
            valid: true,
            user: {
              id: user.id_str,
              username: user.screen_name,
              displayName: user.name,
              profileImageUrl: user.profile_image_url_https || null,
            },
          };
        }

        if (retryResponse.status === 429) {
          // Still rate limited but session is likely valid
          return { valid: true, user: null };
        }

        return { valid: false, reason: 'expired' };
      }

      return { valid: false, reason: 'expired' };
    } catch (err) {
      // Network errors ≠ invalid session
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.name === 'TypeError') {
        throw new ScraperError(
          `Network error during session validation: ${err.message}`,
          'NETWORK_ERROR',
        );
      }
      throw err;
    }
  }

  /**
   * Validate the session and refresh the CSRF token from the response.
   * Twitter rotates ct0 periodically — this keeps it fresh.
   *
   * @returns {Promise<{ valid: boolean, reason?: string, user?: Object }>}
   */
  async validateAndRefreshCsrf() {
    const headers = this._tokenManager.getHeaders(true);
    const response = await this._fetch(VERIFY_CREDENTIALS_URL, {
      method: 'GET',
      headers,
    });

    // Extract updated ct0 from Set-Cookie headers
    if (typeof response.headers.getSetCookie === 'function') {
      for (const setCookie of response.headers.getSetCookie()) {
        const mainPart = setCookie.split(';')[0].trim();
        const eqIndex = mainPart.indexOf('=');
        if (eqIndex === -1) continue;
        const name = mainPart.slice(0, eqIndex).trim();
        const value = mainPart.slice(eqIndex + 1).trim();
        if (name === 'ct0' && value) {
          this._cookieAuth.set('ct0', value);
          this._tokenManager.refreshCsrf(value);
        }
      }
    }

    if (response.ok) {
      const user = await response.json();
      return {
        valid: true,
        user: {
          id: user.id_str,
          username: user.screen_name,
          displayName: user.name,
          profileImageUrl: user.profile_image_url_https || null,
        },
      };
    }

    if (response.status === 401) {
      return { valid: false, reason: 'expired' };
    }

    return { valid: false, reason: 'expired' };
  }

  /**
   * Get the currently logged-in user's profile information.
   *
   * @returns {Promise<{ id: string, username: string, displayName: string, profileImageUrl: string|null }>}
   * @throws {AuthenticationError} If not authenticated
   */
  async getLoggedInUser() {
    const result = await this.validate();
    if (!result.valid) {
      throw new AuthenticationError(
        `Session is not valid: ${result.reason}`,
        result.reason === 'expired' ? 'AUTH_REQUIRED' : 'AUTH_FAILED',
      );
    }
    return result.user;
  }

  /**
   * Check if an error indicates an expired session.
   *
   * @param {Error} error - The error to check
   * @returns {boolean} True if the error indicates session expiration
   */
  isSessionExpired(error) {
    // 401 always means expired
    if (error?.httpStatus === 401) return true;

    // Specific auth error codes
    if (error?.code === 'AUTH_REQUIRED' || error?.code === 'AUTH_FAILED') return true;

    // Twitter error code 89 = invalid/expired token
    if (error?.twitterErrorCode === 89) return true;

    // 429 and 500 are NOT session expiration
    if (error?.httpStatus === 429 || error?.httpStatus === 500) return false;

    return false;
  }
}

export default SessionValidator;

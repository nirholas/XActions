/**
 * XActions Client — Two-Factor Authentication
 * Handles TOTP and SMS-based 2FA for Twitter login flows.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

export class TwoFactorAuth {
  constructor({ tokenManager } = {}) {
    this.tokenManager = tokenManager;
    this._fetch = globalThis.fetch;
  }

  setFetch(fetchFn) {
    this._fetch = fetchFn;
  }

  /**
   * Submit a 2FA code to complete login.
   * @param {Object} options
   * @param {string} options.flowToken - Flow token from the login challenge
   * @param {string} options.code - TOTP or SMS code
   */
  async submitCode({ flowToken, code }) {
    if (!flowToken || !code) {
      throw new Error('TwoFactorAuth.submitCode requires flowToken and code');
    }
    // Placeholder — the actual Twitter 2FA flow requires the LoginJsInstrumentationSubtask
    // and DenyLoginSubtask handling which varies by account settings.
    throw new Error('TwoFactorAuth.submitCode is not yet implemented');
  }
}

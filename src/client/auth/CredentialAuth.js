/**
 * XActions Client — Credential Authentication
 *
 * Implements Twitter's internal login flow using the onboarding/task.json endpoint.
 * This is a multi-step flow where each step returns a flow_token and subtasks.
 *
 * Login Flow:
 *   Step 1: POST /1.1/onboarding/task.json → Initialize (flow_name: "login")
 *   Step 2: JS Instrumentation subtask (if required)
 *   Step 3: Submit username (LoginEnterUserIdentifierSSO)
 *   Step 4: Submit email if alternate identifier requested
 *   Step 5: Submit password (LoginEnterPassword)
 *   Step 6: Account duplication check (if required)
 *   Step 7: Handle 2FA if required, or extract cookies on success
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { AuthenticationError, ScraperError } from '../errors.js';
import { BEARER_TOKEN } from '../api/graphqlQueries.js';

const TASK_URL = 'https://api.x.com/1.1/onboarding/task.json';

/**
 * Subtask version map required by Twitter's login flow.
 * @type {Object}
 */
const SUBTASK_VERSIONS = {
  action_list: 2,
  alert_dialog: 1,
  app_download_cta: 1,
  check_logged_in_account: 1,
  choice_selection: 3,
  contacts_live_sync_permission_prompt: 0,
  cta: 7,
  email_verification: 2,
  end_flow: 0,
  enter_date: 1,
  enter_email: 2,
  enter_password: 5,
  enter_phone: 2,
  enter_recaptcha: 1,
  enter_text: 5,
  enter_username: 2,
  generic_urt: 3,
  in_app_notification: 1,
  interest_picker: 3,
  js_instrumentation: 1,
  menu_dialog: 1,
  notifications_permission_prompt: 2,
  open_account: 2,
  open_home_timeline: 1,
  open_link: 1,
  phone_verification: 4,
  privacy_options: 1,
  security_key: 3,
  select_avatar: 4,
  select_banner: 2,
  settings_list: 7,
  show_code: 1,
  sign_up: 2,
  sign_up_review: 4,
  tweet_selection_urt: 1,
  update_users: 1,
  upload_media: 1,
  user_recommendations_list: 4,
  user_recommendations_urt: 1,
  wait_spinner: 3,
  web_modal: 1,
};

// ============================================================================
// CredentialAuth Class
// ============================================================================

/**
 * Handles username/password authentication via Twitter's internal onboarding API.
 */
export class CredentialAuth {
  /**
   * @param {Object} options
   * @param {import('./CookieAuth.js').CookieAuth} options.cookieAuth - Cookie auth instance to store results
   * @param {import('./TokenManager.js').TokenManager} options.tokenManager - Token manager for headers
   */
  constructor({ cookieAuth, tokenManager }) {
    /** @private */
    this._cookieAuth = cookieAuth;
    /** @private */
    this._tokenManager = tokenManager;
    /** @private @type {string|null} */
    this._flowToken = null;
    /** @private */
    this._fetch = globalThis.fetch;
  }

  /**
   * Set a custom fetch implementation.
   *
   * @param {Function} fetchFn
   */
  setFetch(fetchFn) {
    this._fetch = fetchFn;
  }

  /**
   * Execute the full login flow.
   *
   * @param {Object} credentials
   * @param {string} credentials.username - Twitter username (without @)
   * @param {string} credentials.password - Account password
   * @param {string} [credentials.email] - Email for alternative identifier verification
   * @returns {Promise<{ success: boolean, username: string }>}
   * @throws {AuthenticationError} On login failure
   */
  async login({ username, password, email }) {
    if (!username || !password) {
      throw new AuthenticationError(
        'Username and password are required',
        'AUTH_FAILED',
      );
    }

    // Ensure we have a guest token for the login flow
    await this._tokenManager.getGuestToken();

    // Step 1: Initialize login flow
    const initResponse = await this._initLoginFlow();
    this._flowToken = initResponse.flow_token;

    // Step 2: JS Instrumentation (if required)
    const subtasks = this._getSubtaskIds(initResponse);
    if (subtasks.includes('LoginJsInstrumentationSubtask')) {
      const jsResponse = await this._submitJsInstrumentation();
      this._flowToken = jsResponse.flow_token;
    }

    // Step 3: Submit username
    const usernameResponse = await this._submitUsername(username);
    this._flowToken = usernameResponse.flow_token;

    // Step 4: Handle alternative identifier (email verification)
    const usernameSubtasks = this._getSubtaskIds(usernameResponse);
    if (usernameSubtasks.includes('LoginEnterAlternateIdentifierSubtask')) {
      if (!email) {
        throw new AuthenticationError(
          'Twitter requires email verification. Provide the email parameter.',
          'EMAIL_VERIFICATION_REQUIRED',
        );
      }
      const emailResponse = await this._submitAlternateIdentifier(email);
      this._flowToken = emailResponse.flow_token;
    }

    // Step 5: Submit password
    const passwordResponse = await this._submitPassword(password);
    this._flowToken = passwordResponse.flow_token;

    // Check for errors and 2FA
    const pwSubtasks = this._getSubtaskIds(passwordResponse);

    if (pwSubtasks.includes('LoginTwoFactorAuthChallenge')) {
      const error = new AuthenticationError(
        'Two-factor authentication required. Use submitTwoFactor() with the returned flowToken.',
        'TWO_FACTOR_REQUIRED',
      );
      error.flowToken = this._flowToken;
      throw error;
    }

    if (pwSubtasks.includes('LoginAcid')) {
      throw new AuthenticationError(
        'Email verification required by Twitter. Check your email.',
        'EMAIL_VERIFICATION_REQUIRED',
      );
    }

    if (pwSubtasks.includes('DenyLoginSubtask')) {
      throw new AuthenticationError(
        'Login denied by Twitter. The account may need manual verification.',
        'LOGIN_DENIED',
      );
    }

    // Step 6: Account duplication check (if required)
    if (pwSubtasks.includes('AccountDuplicationCheck')) {
      const dupResponse = await this._submitAccountDuplicationCheck();
      this._flowToken = dupResponse.flow_token;
    }

    // Step 7: Extract cookies from the successful login response
    this._extractAndStoreCookies(passwordResponse);

    // Verify we actually got authenticated
    if (!this._cookieAuth.isAuthenticated()) {
      throw new AuthenticationError(
        'Login completed but no auth cookies were received',
        'AUTH_FAILED',
      );
    }

    // Update CSRF token in token manager
    const ct0 = this._cookieAuth.getCsrfToken();
    if (ct0) {
      this._tokenManager.setCsrfToken(ct0);
    }

    // Set the username
    this._cookieAuth.setUsername(username);

    console.log(`✅ Logged in as @${username}`);
    return { success: true, username };
  }

  /**
   * Submit a two-factor authentication code.
   *
   * @param {Object} options
   * @param {string} options.flowToken - The flow token from the TWO_FACTOR_REQUIRED error
   * @param {string} options.code - The 2FA code (6-digit TOTP or SMS code)
   * @returns {Promise<{ success: boolean }>}
   * @throws {AuthenticationError} If 2FA code is invalid
   */
  async submitTwoFactor({ flowToken, code }) {
    if (!flowToken || !code) {
      throw new AuthenticationError(
        'flowToken and code are required for 2FA',
        'AUTH_FAILED',
      );
    }

    this._flowToken = flowToken;

    const response = await this._executeSubtask({
      subtask_id: 'LoginTwoFactorAuthChallenge',
      enter_text: {
        text: code,
        link: 'next_link',
      },
    });

    const subtasks = this._getSubtaskIds(response);

    if (subtasks.includes('LoginSuccessSubtask')) {
      this._extractAndStoreCookies(response);
      return { success: true };
    }

    // Check for account duplication after 2FA
    if (subtasks.includes('AccountDuplicationCheck')) {
      this._flowToken = response.flow_token;
      await this._submitAccountDuplicationCheck();
      this._extractAndStoreCookies(response);
      return { success: true };
    }

    throw new AuthenticationError(
      'Invalid two-factor authentication code',
      'INVALID_2FA_CODE',
    );
  }

  // ==========================================================================
  // Private: Login Flow Steps
  // ==========================================================================

  /**
   * Step 1: Initialize the login flow.
   * @private
   * @returns {Promise<Object>} Flow response with flow_token
   */
  async _initLoginFlow() {
    const guestToken = this._tokenManager._guestTokenManager
      ? this._tokenManager._guestTokenManager.getToken()
      : this._tokenManager.guestToken;

    const response = await this._fetch(`${TASK_URL}?flow_name=login`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': this._tokenManager.getUserAgent(),
        'x-guest-token': guestToken || '',
      },
      body: JSON.stringify({
        input_flow_data: {
          flow_context: {
            debug_overrides: {},
            start_location: { location: 'manual_link' },
          },
        },
        subtask_versions: SUBTASK_VERSIONS,
      }),
    });

    return this._handleResponse(response);
  }

  /**
   * Step 2: Submit JS instrumentation (browser fingerprint stub).
   * @private
   */
  async _submitJsInstrumentation() {
    return this._executeSubtask({
      subtask_id: 'LoginJsInstrumentationSubtask',
      js_instrumentation: {
        response: '{}',
        link: 'next_link',
      },
    });
  }

  /**
   * Step 3: Submit the username.
   * @private
   * @param {string} username
   */
  async _submitUsername(username) {
    return this._executeSubtask({
      subtask_id: 'LoginEnterUserIdentifierSSO',
      settings_list: {
        setting_responses: [
          {
            key: 'user_identifier',
            response_data: {
              text_data: { result: username },
            },
          },
        ],
        link: 'next_link',
      },
    });
  }

  /**
   * Step 4: Submit alternative identifier (email).
   * @private
   * @param {string} email
   */
  async _submitAlternateIdentifier(email) {
    return this._executeSubtask({
      subtask_id: 'LoginEnterAlternateIdentifierSubtask',
      enter_text: {
        text: email,
        link: 'next_link',
      },
    });
  }

  /**
   * Step 5: Submit the password.
   * @private
   * @param {string} password
   */
  async _submitPassword(password) {
    return this._executeSubtask({
      subtask_id: 'LoginEnterPassword',
      enter_password: {
        password,
        link: 'next_link',
      },
    });
  }

  /**
   * Step 6: Submit account duplication check.
   * @private
   */
  async _submitAccountDuplicationCheck() {
    return this._executeSubtask({
      subtask_id: 'AccountDuplicationCheck',
      check_logged_in_account: {
        link: 'AccountDuplicationCheck_false',
      },
    });
  }

  // ==========================================================================
  // Private: Helpers
  // ==========================================================================

  /**
   * Execute a subtask in the login flow.
   * @private
   * @param {Object} subtaskInput - The subtask input object
   * @returns {Promise<Object>} Parsed JSON response
   */
  async _executeSubtask(subtaskInput) {
    const guestToken = this._tokenManager._guestTokenManager
      ? this._tokenManager._guestTokenManager.getToken()
      : this._tokenManager.guestToken;

    const response = await this._fetch(TASK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': this._tokenManager.getUserAgent(),
        'x-guest-token': guestToken || '',
      },
      body: JSON.stringify({
        flow_token: this._flowToken,
        subtask_inputs: [subtaskInput],
      }),
    });

    const data = await this._handleResponse(response);
    this._flowToken = data.flow_token || this._flowToken;
    return data;
  }

  /**
   * Handle the HTTP response from the login flow.
   * @private
   * @param {Response} response
   * @returns {Promise<Object>}
   */
  async _handleResponse(response) {
    // Store any Set-Cookie headers
    this._extractCookiesFromResponse(response);

    if (!response.ok) {
      let body;
      try {
        body = await response.json();
      } catch {
        body = await response.text().catch(() => '');
      }

      // Check for specific Twitter error codes
      if (response.status === 400 && body?.errors) {
        const error = body.errors[0];
        if (error?.code === 399) {
          throw new AuthenticationError(
            'Invalid credentials. Check your username and password.',
            'INVALID_CREDENTIALS',
          );
        }
      }

      if (response.status === 403) {
        throw new AuthenticationError(
          'Access denied. The account may be locked or suspended.',
          'ACCOUNT_LOCKED',
        );
      }

      if (response.status === 429) {
        throw new AuthenticationError(
          'Rate limited. Wait a few minutes before trying again.',
          'RATE_LIMITED',
        );
      }

      throw new ScraperError(
        `Login flow failed: HTTP ${response.status}`,
        'AUTH_FAILED',
        { httpStatus: response.status },
      );
    }

    return response.json();
  }

  /**
   * Extract subtask IDs from a flow response.
   * @private
   * @param {Object} response - Parsed flow response
   * @returns {string[]} Array of subtask IDs
   */
  _getSubtaskIds(response) {
    if (!response?.subtasks) return [];
    return response.subtasks.map((s) => s.subtask_id).filter(Boolean);
  }

  /**
   * Extract Set-Cookie headers from a response and store in CookieAuth.
   * @private
   * @param {Response} response - Fetch response
   */
  _extractCookiesFromResponse(response) {
    // Try getSetCookie() (Node.js 20+ / undici)
    if (typeof response.headers.getSetCookie === 'function') {
      const setCookies = response.headers.getSetCookie();
      for (const cookie of setCookies) {
        this._parseSingleSetCookie(cookie);
      }
      return;
    }

    // Fallback: try raw set-cookie header (may be combined)
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      // Multiple cookies may be joined with ", " but we need to be careful
      // since cookie values can contain commas. Split on ", " followed by a word char and "="
      const parts = setCookie.split(/,\s*(?=[a-zA-Z_][a-zA-Z0-9_]*=)/);
      for (const part of parts) {
        this._parseSingleSetCookie(part);
      }
    }
  }

  /**
   * Parse a single Set-Cookie header value and store in CookieAuth.
   * @private
   * @param {string} setCookie - A single Set-Cookie header value
   */
  _parseSingleSetCookie(setCookie) {
    if (!setCookie) return;
    // Extract name=value (first part before ";")
    const mainPart = setCookie.split(';')[0].trim();
    const eqIndex = mainPart.indexOf('=');
    if (eqIndex === -1) return;
    const name = mainPart.slice(0, eqIndex).trim();
    const value = mainPart.slice(eqIndex + 1).trim();
    if (name) {
      this._cookieAuth.set(name, value);
    }
  }

  /**
   * Extract cookies from the response and store them.
   * Also looks in the response body for any cookie data.
   * @private
   * @param {Object} responseData - Parsed JSON response
   */
  _extractAndStoreCookies(responseData) {
    // The cookies are primarily extracted from Set-Cookie headers during _handleResponse.
    // This method does any final verification.
    // Check if we have the critical cookies
    if (!this._cookieAuth.has('auth_token') || !this._cookieAuth.has('ct0')) {
      // Try to look in the response body for cookie hints
      // Some Twitter responses include cookie data in the subtask results
      if (responseData?.subtasks) {
        for (const subtask of responseData.subtasks) {
          if (subtask.subtask_id === 'LoginSuccessSubtask' && subtask.open_account) {
            // Success subtask may contain user data
            break;
          }
        }
      }
    }
  }
}

export default CredentialAuth;

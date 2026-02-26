/**
 * XActions Client — Credential-Based Authentication
 *
 * Implements Twitter's multi-step login flow using username, password, and email.
 * This replicates the same flow that twikit and agent-twitter-client use.
 *
 * Twitter's login flow uses the onboarding/task.json endpoint and proceeds through
 * multiple "subtasks" — each step sends data and receives the next subtask to complete.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import { BEARER_TOKEN } from '../api/graphqlQueries.js';
import { AuthenticationError } from '../errors.js';
import { updateJarFromResponse, extractCsrfToken } from './CookieParser.js';

const LOGIN_URL = 'https://api.x.com/1.1/onboarding/task.json';

/**
 * Credential-based authentication — username/password login flow.
 */
export class CredentialAuth {
  /**
   * @param {import('./CookieAuth.js').CookieAuth} cookieAuth - Cookie auth to store resulting session
   * @param {import('./TokenManager.js').TokenManager} tokenManager
   */
  constructor(cookieAuth, tokenManager) {
    /** @private */
    this._cookieAuth = cookieAuth;
    /** @private */
    this._tokenManager = tokenManager;
    /** @private */
    this._fetchFn = globalThis.fetch;
  }

  /**
   * Set a custom fetch function.
   * @param {Function} fn
   */
  setFetch(fn) {
    this._fetchFn = fn;
  }

  /**
   * Perform the full login flow.
   *
   * @param {{username: string, password: string, email?: string}} credentials
   * @returns {Promise<void>}
   * @throws {AuthenticationError}
   */
  async login({ username, password, email }) {
    if (!username || !password) {
      throw new AuthenticationError('Username and password are required', 'AUTH_FAILED');
    }

    // Step 1: Get a guest token
    const guestToken = await this._tokenManager.activateGuestToken();

    // Step 2: Initiate the login flow
    let flowToken = await this._initiateLoginFlow(guestToken);

    // Step 3: Submit username (LoginJsInstrumentationSubtask first, then LoginEnterUserIdentifierSSO)
    flowToken = await this._submitInstrumentation(guestToken, flowToken);
    flowToken = await this._submitUsername(guestToken, flowToken, username);

    // Step 4: Handle challenges (email verification, etc.)
    // Twitter may ask for alternate identifier (email) before password
    if (flowToken._subtask === 'LoginEnterAlternateIdentifierSubtask') {
      if (!email) {
        throw new AuthenticationError(
          'Twitter requires email verification. Provide email in credentials.',
          'AUTH_FAILED',
        );
      }
      flowToken = await this._submitAlternateIdentifier(guestToken, flowToken.token, email);
    }

    // Step 5: Submit password
    flowToken = await this._submitPassword(guestToken, flowToken.token || flowToken, password);

    // Step 6: Handle account duplication check if needed
    if (flowToken._subtask === 'AccountDuplicationCheck') {
      flowToken = await this._handleDuplicationCheck(guestToken, flowToken.token);
    }

    // Login should be complete — cookies should now contain auth_token, ct0, twid
    if (!this._cookieAuth.isAuthenticated()) {
      throw new AuthenticationError(
        'Login completed but auth cookies were not set. The flow may have additional challenges.',
        'AUTH_FAILED',
      );
    }
  }

  /**
   * @private
   */
  async _initiateLoginFlow(guestToken) {
    const response = await this._post(guestToken, LOGIN_URL, {
      input_flow_data: {
        flow_context: {
          debug_overrides: {},
          start_location: { location: 'manual_link' },
        },
      },
      subtask_versions: {},
    }, { params: { flow_name: 'login' } });

    return this._extractFlowToken(response);
  }

  /**
   * @private
   */
  async _submitInstrumentation(guestToken, flowToken) {
    const response = await this._post(guestToken, LOGIN_URL, {
      flow_token: flowToken.token || flowToken,
      subtask_inputs: [{
        subtask_id: 'LoginJsInstrumentationSubtask',
        js_instrumentation: { response: '{}', link: 'next_link' },
      }],
    });
    return this._extractFlowToken(response);
  }

  /**
   * @private
   */
  async _submitUsername(guestToken, flowToken, username) {
    const response = await this._post(guestToken, LOGIN_URL, {
      flow_token: flowToken.token || flowToken,
      subtask_inputs: [{
        subtask_id: 'LoginEnterUserIdentifierSSO',
        settings_list: {
          setting_responses: [{
            key: 'user_identifier',
            response_data: { text_data: { result: username } },
          }],
          link: 'next_link',
        },
      }],
    });
    return this._extractFlowToken(response);
  }

  /**
   * @private
   */
  async _submitAlternateIdentifier(guestToken, flowToken, email) {
    const response = await this._post(guestToken, LOGIN_URL, {
      flow_token: flowToken,
      subtask_inputs: [{
        subtask_id: 'LoginEnterAlternateIdentifierSubtask',
        enter_text: { text: email, link: 'next_link' },
      }],
    });
    return this._extractFlowToken(response);
  }

  /**
   * @private
   */
  async _submitPassword(guestToken, flowToken, password) {
    const response = await this._post(guestToken, LOGIN_URL, {
      flow_token: flowToken,
      subtask_inputs: [{
        subtask_id: 'LoginEnterPassword',
        enter_password: { password, link: 'next_link' },
      }],
    });
    return this._extractFlowToken(response);
  }

  /**
   * @private
   */
  async _handleDuplicationCheck(guestToken, flowToken) {
    const response = await this._post(guestToken, LOGIN_URL, {
      flow_token: flowToken,
      subtask_inputs: [{
        subtask_id: 'AccountDuplicationCheck',
        check_logged_in_account: { link: 'AccountDuplicationCheck_false' },
      }],
    });
    return this._extractFlowToken(response);
  }

  /**
   * Make a POST to the login flow endpoint.
   * @private
   */
  async _post(guestToken, url, body, options = {}) {
    let finalUrl = url;
    if (options.params) {
      const qs = new URLSearchParams(options.params);
      finalUrl = `${url}?${qs}`;
    }

    const headers = {
      Authorization: `Bearer ${BEARER_TOKEN}`,
      'Content-Type': 'application/json',
      'x-guest-token': guestToken,
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
    };

    // Include cookies if we have any (flow sets cookies as it proceeds)
    const cookieStr = this._cookieAuth.getCookieString();
    if (cookieStr) {
      headers['Cookie'] = cookieStr;
    }

    const csrf = extractCsrfToken(this._cookieAuth.jar);
    if (csrf) {
      headers['x-csrf-token'] = csrf;
    }

    const response = await this._fetchFn(finalUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      redirect: 'follow',
    });

    // Update cookies from response
    this._cookieAuth.updateFromResponse(response);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.errors?.[0]?.message || `Login failed: HTTP ${response.status}`;
      throw new AuthenticationError(errorMsg, 'AUTH_FAILED', {
        httpStatus: response.status,
        endpoint: 'onboarding/task',
      });
    }

    return response.json();
  }

  /**
   * Extract flow token and current subtask from response.
   * @private
   */
  _extractFlowToken(data) {
    const flowToken = data.flow_token;
    if (!flowToken) {
      throw new AuthenticationError('Login flow returned no flow_token', 'AUTH_FAILED');
    }

    // Detect what subtask is next
    const subtasks = data.subtasks || [];
    const nextSubtask = subtasks[0]?.subtask_id || null;

    return { token: flowToken, _subtask: nextSubtask };
  }
}

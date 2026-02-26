/**
 * Twitter/X Authentication Manager
 *
 * Handles all token lifecycle operations:
 * - Guest token acquisition & caching
 * - Cookie-based authenticated sessions
 * - Username/password login flow (multi-step)
 * - Session validation & refresh
 * - Cookie persistence (JSON, compatible with the-convocation/twitter-scraper)
 *
 * Uses native fetch — no Puppeteer dependency.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import fs from 'fs/promises';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Bearer token — embedded in Twitter's web client JS bundle (public)
// Same token used by the-convocation/twitter-scraper, d60/twikit, etc.
// ---------------------------------------------------------------------------
const BEARER_TOKEN =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

// ---------------------------------------------------------------------------
// Base URLs
// ---------------------------------------------------------------------------
const API_BASE = 'https://api.x.com';
const WEB_BASE = 'https://x.com';

// ---------------------------------------------------------------------------
// User-Agent pool for rotation
// ---------------------------------------------------------------------------
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
];

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

/**
 * Authentication-specific error.
 * Thrown for expired sessions, invalid cookies, login failures, etc.
 */
export class AuthError extends Error {
  /**
   * @param {string} message
   * @param {object} [details]
   * @param {number} [details.status] — HTTP status code
   * @param {string} [details.subtask] — Login subtask that failed
   * @param {object} [details.response] — Raw API response
   */
  constructor(message, details = {}) {
    super(message);
    this.name = 'AuthError';
    this.status = details.status ?? null;
    this.subtask = details.subtask ?? null;
    this.response = details.response ?? null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sleep for `ms` milliseconds. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pick a random user-agent string. */
const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/**
 * Parse a semicolon-delimited cookie string (as copied from browser DevTools)
 * into an object mapping cookie names to values.
 *
 * Handles formats:
 *   "auth_token=abc; ct0=def; twid=u%3D123"
 *   "auth_token=abc;ct0=def"          (no space)
 *
 * @param {string} cookieString
 * @returns {Record<string, string>}
 */
export function parseCookieString(cookieString) {
  if (!cookieString || typeof cookieString !== 'string') return {};
  const cookies = {};
  const pairs = cookieString.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (name) cookies[name] = value;
  }
  return cookies;
}

/**
 * Build the cookie header string from a cookies object.
 * @param {Record<string, string>} cookies
 * @returns {string}
 */
function buildCookieHeader(cookies) {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

// ---------------------------------------------------------------------------
// Guest token cache lifetime (2.5 hours — tokens expire at ~3 h)
// ---------------------------------------------------------------------------
const GUEST_TOKEN_TTL_MS = 2.5 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Encryption helpers for cookie persistence
// ---------------------------------------------------------------------------
const ALGO = 'aes-256-gcm';
const IV_LEN = 16;
const TAG_LEN = 16;

function encrypt(plaintext, key) {
  const keyBuf = crypto.scryptSync(key, 'xactions-salt', 32);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, keyBuf, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(ciphertext, key) {
  const buf = Buffer.from(ciphertext, 'base64');
  const keyBuf = crypto.scryptSync(key, 'xactions-salt', 32);
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, keyBuf, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc, undefined, 'utf8') + decipher.final('utf8');
}

// ============================================================================
// TwitterAuth
// ============================================================================

export class TwitterAuth {
  /** @type {Record<string, string>} All cookies for the session */
  #cookies = {};

  /** @type {{ token: string, expiresAt: number } | null} */
  #guestToken = null;

  /** @type {Promise<{ guestToken: string, expiresAt: number }> | null} */
  #guestActivationPromise = null;

  /** @type {{ username: string, password: string, email: string } | null} */
  #credentials = null;

  /** @type {{ id: string, username: string, name: string } | null} */
  #user = null;

  /** @type {string} */
  #userAgent;

  /** @type {string | null} Optional encryption key for cookie persistence */
  #encryptionKey;

  /** @type {typeof globalThis.fetch} */
  #fetch;

  /**
   * @param {object} [options]
   * @param {string}  [options.encryptionKey] — AES-256 key for encrypting persisted cookies
   * @param {typeof globalThis.fetch} [options.fetch] — Custom fetch (for testing / proxies)
   * @param {string}  [options.userAgent] — Fixed user-agent (default: random rotation)
   */
  constructor(options = {}) {
    this.#encryptionKey = options.encryptionKey ?? null;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#userAgent = options.userAgent ?? randomUA();
  }

  // ========================================================================
  // 1. Guest Token
  // ========================================================================

  /**
   * Acquire an anonymous guest token from Twitter.
   * Caches the token and auto-refreshes when expired.
   *
   * @returns {Promise<{ guestToken: string, expiresAt: number }>}
   */
  async getGuestToken() {
    // Return cached token if still valid
    if (this.#guestToken && Date.now() < this.#guestToken.expiresAt) {
      return { guestToken: this.#guestToken.token, expiresAt: this.#guestToken.expiresAt };
    }

    // Prevent thundering herd — only one activation at a time
    if (!this.#guestActivationPromise) {
      this.#guestActivationPromise = this.#activateGuestToken().finally(() => {
        this.#guestActivationPromise = null;
      });
    }

    return this.#guestActivationPromise;
  }

  /**
   * Internal: POST to guest/activate.json.
   * @returns {Promise<{ guestToken: string, expiresAt: number }>}
   */
  async #activateGuestToken() {
    const res = await this.#fetch(`${API_BASE}/1.1/guest/activate.json`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${BEARER_TOKEN}`,
        'user-agent': this.#userAgent,
      },
    });

    if (!res.ok) {
      throw new AuthError(`Guest token activation failed (HTTP ${res.status})`, {
        status: res.status,
        response: await res.text().catch(() => null),
      });
    }

    const data = await res.json();
    if (!data.guest_token) {
      throw new AuthError('Guest token activation returned no token', { response: data });
    }

    const expiresAt = Date.now() + GUEST_TOKEN_TTL_MS;
    this.#guestToken = { token: data.guest_token, expiresAt };

    return { guestToken: data.guest_token, expiresAt };
  }

  // ========================================================================
  // 2. Cookie-based Login
  // ========================================================================

  /**
   * Set up an authenticated session from a browser cookie string.
   *
   * @param {string} cookieString — e.g. "auth_token=xxx; ct0=yyy; twid=u%3D123"
   * @returns {Promise<{ id: string, username: string, name: string }>}
   * @throws {AuthError} if cookies are invalid or session is expired
   */
  async loginWithCookies(cookieString) {
    const parsed = parseCookieString(cookieString);

    if (!parsed.auth_token) {
      throw new AuthError('Cookie string missing required "auth_token" cookie');
    }
    if (!parsed.ct0) {
      throw new AuthError('Cookie string missing required "ct0" (CSRF) cookie');
    }

    this.#cookies = parsed;

    const validation = await this.validateSession();
    if (!validation.valid) {
      this.#cookies = {};
      throw new AuthError(`Cookie session invalid: ${validation.reason}`, {
        status: validation.status,
      });
    }

    this.#user = validation.user;
    return { ...validation.user };
  }

  // ========================================================================
  // 3. Credential-based Login
  // ========================================================================

  /**
   * Full username/password login flow using Twitter's multi-step onboarding API.
   *
   * Implements the subtask chain:
   *   1. LoginJsInstrumentationSubtask (init)
   *   2. LoginEnterUserIdentifierSSO (username)
   *   3. LoginEnterPassword (password)
   *   4. LoginAcid (email verification if needed)
   *   5. AccountDuplicationCheck
   *   6. LoginTwoFactorAuthChallenge (2FA if enabled)
   *
   * @param {string} username
   * @param {string} password
   * @param {string} [email] — Required if Twitter prompts for email verification
   * @returns {Promise<{ id: string, username: string, name: string }>}
   * @throws {AuthError}
   */
  async loginWithCredentials(username, password, email = '') {
    this.#credentials = { username, password, email };

    const ONBOARDING_URL = `${WEB_BASE}/i/api/1.1/onboarding/task.json`;

    // -- Step 1: Init the login flow -----------------------------------------
    let flowToken = await this.#loginFlowInit(ONBOARDING_URL);

    // -- Step 2: JS Instrumentation subtask ----------------------------------
    flowToken = await this.#loginSubtask(ONBOARDING_URL, flowToken, {
      subtask_id: 'LoginJsInstrumentationSubtask',
      js_instrumentation: { response: '{}', link: 'next_link' },
    });

    // -- Step 3: Submit username ---------------------------------------------
    flowToken = await this.#loginSubtask(ONBOARDING_URL, flowToken, {
      subtask_id: 'LoginEnterUserIdentifierSSO',
      settings_list: {
        setting_responses: [
          {
            key: 'user_identifier',
            response_data: { text_data: { result: username } },
          },
        ],
        link: 'next_link',
      },
    });

    // -- Step 4: Submit password ---------------------------------------------
    flowToken = await this.#loginSubtask(ONBOARDING_URL, flowToken, {
      subtask_id: 'LoginEnterPassword',
      enter_password: { password, link: 'next_link' },
    });

    // -- Step 5: Handle AccountDuplicationCheck if present -------------------
    flowToken = await this.#handleDuplicationCheck(ONBOARDING_URL, flowToken);

    // -- Step 6: Handle LoginAcid (email verification) if needed -------------
    flowToken = await this.#handleAcidChallenge(ONBOARDING_URL, flowToken, email);

    // -- Step 7: Handle 2FA if needed ----------------------------------------
    // (Will throw AuthError if 2FA is required — user must handle manually)
    flowToken = await this.#handle2FA(ONBOARDING_URL, flowToken);

    // -- Extract cookies from the successful login response ------------------
    // At this point the server sets cookies via Set-Cookie headers.
    // In Node with native fetch, cookies are not automatically saved,
    // so we parse them from the last response (stored in #lastLoginResponse).
    this.#extractLoginCookies();

    if (!this.#cookies.auth_token || !this.#cookies.ct0) {
      throw new AuthError(
        'Login flow completed but no auth cookies were returned. Twitter may require captcha verification.',
      );
    }

    // Validate the new session
    const validation = await this.validateSession();
    if (!validation.valid) {
      throw new AuthError(`Login succeeded but session validation failed: ${validation.reason}`);
    }

    this.#user = validation.user;
    return { ...validation.user };
  }

  /** @type {Response | null} */
  #lastLoginResponse = null;

  /** @type {Array<{flowToken: string, subtasks: Array}>} */
  #loginFlowState = [];

  /**
   * Init the login flow — POST with flow_name to get first flow_token.
   */
  async #loginFlowInit(url) {
    const res = await this.#fetch(url, {
      method: 'POST',
      headers: {
        ...this.#baseHeaders(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        input_flow_data: {
          flow_context: {
            debug_overrides: {},
            start_location: { location: 'manual_link' },
          },
        },
        subtask_versions: {
          action_list: 2,
          alert_dialog: 1,
          app_download_cta: 1,
          check_logged_in_account: 1,
          choice_selection: 3,
          contacts_live_sync_permission_prompt: 0,
          cta: 7,
          email_verification: 2,
          end_flow: 1,
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
        },
      }),
    });

    if (!res.ok) {
      throw new AuthError(`Login flow init failed (HTTP ${res.status})`, {
        status: res.status,
        response: await res.text().catch(() => null),
      });
    }

    this.#lastLoginResponse = res;
    const data = await res.json();
    this.#loginFlowState.push({ flowToken: data.flow_token, subtasks: data.subtasks ?? [] });
    return data.flow_token;
  }

  /**
   * Submit a subtask in the login flow.
   * Returns the next flow_token.
   */
  async #loginSubtask(url, flowToken, subtaskInput) {
    const res = await this.#fetch(url, {
      method: 'POST',
      headers: {
        ...this.#baseHeaders(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        flow_token: flowToken,
        subtask_inputs: [subtaskInput],
      }),
    });

    this.#lastLoginResponse = res;

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AuthError(
        `Login subtask "${subtaskInput.subtask_id}" failed (HTTP ${res.status})`,
        {
          status: res.status,
          subtask: subtaskInput.subtask_id,
          response: body,
        },
      );
    }

    const data = await res.json();
    this.#loginFlowState.push({ flowToken: data.flow_token, subtasks: data.subtasks ?? [] });
    return data.flow_token;
  }

  /**
   * Check if the latest flow state contains a given subtask_id.
   */
  #hasSubtask(subtaskId) {
    const latest = this.#loginFlowState[this.#loginFlowState.length - 1];
    if (!latest) return false;
    return latest.subtasks.some((s) => s.subtask_id === subtaskId);
  }

  /**
   * Handle AccountDuplicationCheck subtask (auto-accept).
   */
  async #handleDuplicationCheck(url, flowToken) {
    if (!this.#hasSubtask('AccountDuplicationCheck')) return flowToken;

    return this.#loginSubtask(url, flowToken, {
      subtask_id: 'AccountDuplicationCheck',
      check_logged_in_account: { link: 'AccountDuplicationCheck_false' },
    });
  }

  /**
   * Handle LoginAcid (email verification) subtask.
   */
  async #handleAcidChallenge(url, flowToken, email) {
    if (!this.#hasSubtask('LoginAcid')) return flowToken;

    if (!email) {
      throw new AuthError(
        'Twitter requires email verification (LoginAcid) but no email was provided',
        { subtask: 'LoginAcid' },
      );
    }

    return this.#loginSubtask(url, flowToken, {
      subtask_id: 'LoginAcid',
      enter_text: { text: email, link: 'next_link' },
    });
  }

  /**
   * Handle LoginTwoFactorAuthChallenge — throws because we can't auto-solve 2FA.
   */
  async #handle2FA(url, flowToken) {
    if (!this.#hasSubtask('LoginTwoFactorAuthChallenge')) return flowToken;

    throw new AuthError(
      'Two-factor authentication is required. Disable 2FA or use cookie-based login.',
      { subtask: 'LoginTwoFactorAuthChallenge' },
    );
  }

  /**
   * Extract Set-Cookie headers from the last login response.
   * In Node native fetch, we must read them manually.
   */
  #extractLoginCookies() {
    if (!this.#lastLoginResponse) return;

    const setCookies = this.#lastLoginResponse.headers.getSetCookie?.() ?? [];

    for (const header of setCookies) {
      // Each header looks like: "name=value; Path=/; Domain=.x.com; ..."
      const idx = header.indexOf('=');
      if (idx === -1) continue;
      const semi = header.indexOf(';');
      const name = header.slice(0, idx).trim();
      const value = header.slice(idx + 1, semi === -1 ? undefined : semi).trim();
      if (name) this.#cookies[name] = value;
    }
  }

  // ========================================================================
  // 4. Session Validation
  // ========================================================================

  /**
   * Validate the current authenticated session.
   *
   * @returns {Promise<{ valid: boolean, user: { id: string, username: string, name: string } | null, reason: string, status?: number }>}
   */
  async validateSession() {
    if (!this.#cookies.auth_token || !this.#cookies.ct0) {
      return { valid: false, user: null, reason: 'Missing auth_token or ct0 cookies' };
    }

    try {
      const res = await this.#fetch(
        `${WEB_BASE}/i/api/1.1/account/verify_credentials.json`,
        {
          method: 'GET',
          headers: this.getHeaders(true),
          redirect: 'manual',
        },
      );

      if (!res.ok) {
        return {
          valid: false,
          user: null,
          reason: `verify_credentials returned HTTP ${res.status}`,
          status: res.status,
        };
      }

      const data = await res.json();
      if (!data.id_str && !data.id) {
        return { valid: false, user: null, reason: 'Response missing user ID' };
      }

      const user = {
        id: String(data.id_str ?? data.id),
        username: data.screen_name ?? '',
        name: data.name ?? '',
      };
      return { valid: true, user, reason: 'ok' };
    } catch (err) {
      return { valid: false, user: null, reason: `Network error: ${err.message}` };
    }
  }

  // ========================================================================
  // 5. Session Refresh
  // ========================================================================

  /**
   * Refresh an expired session.
   * - If credentials are stored, re-login.
   * - If cookie-only, throw AuthError (user must re-import cookies).
   *
   * @returns {Promise<{ id: string, username: string, name: string }>}
   * @throws {AuthError}
   */
  async refreshSession() {
    if (this.#credentials) {
      const { username, password, email } = this.#credentials;
      return this.loginWithCredentials(username, password, email);
    }

    throw new AuthError('Session expired, re-import cookies');
  }

  // ========================================================================
  // 6. Cookie Persistence
  // ========================================================================

  /**
   * Save the current cookies to a JSON file on disk.
   * Format is compatible with the-convocation/twitter-scraper cookie files.
   *
   * If an encryption key was provided at construction, sensitive cookie values
   * (auth_token, ct0, kdt) are encrypted with AES-256-GCM.
   *
   * @param {string} filePath
   */
  async saveCookies(filePath) {
    const cookieArray = Object.entries(this.#cookies).map(([name, value]) => ({
      name,
      value,
      domain: '.x.com',
      path: '/',
      secure: true,
      httpOnly: name === 'auth_token' || name === 'kdt',
      sameSite: 'None',
    }));

    let payload;
    if (this.#encryptionKey) {
      const sensitive = ['auth_token', 'ct0', 'kdt'];
      const encrypted = cookieArray.map((c) => {
        if (sensitive.includes(c.name)) {
          return { ...c, value: encrypt(c.value, this.#encryptionKey), encrypted: true };
        }
        return c;
      });
      payload = JSON.stringify(encrypted, null, 2);
    } else {
      payload = JSON.stringify(cookieArray, null, 2);
    }

    await fs.writeFile(filePath, payload, 'utf8');
  }

  /**
   * Load cookies from a JSON file and validate the session.
   * Returns false if the file doesn't exist or the session is expired.
   *
   * @param {string} filePath
   * @returns {Promise<boolean>} true if session is active
   */
  async loadCookies(filePath) {
    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch {
      return false;
    }

    let cookieArray;
    try {
      cookieArray = JSON.parse(raw);
    } catch {
      return false;
    }

    if (!Array.isArray(cookieArray)) return false;

    const cookies = {};
    for (const c of cookieArray) {
      if (!c.name) continue;
      let val = c.value;
      if (c.encrypted && this.#encryptionKey) {
        try {
          val = decrypt(val, this.#encryptionKey);
        } catch {
          return false; // wrong key or corrupted
        }
      }
      cookies[c.name] = val;
    }

    if (!cookies.auth_token || !cookies.ct0) return false;

    this.#cookies = cookies;

    const validation = await this.validateSession();
    if (!validation.valid) {
      this.#cookies = {};
      return false;
    }

    this.#user = validation.user;
    return true;
  }

  // ========================================================================
  // 7. Header Generation
  // ========================================================================

  /**
   * Build the full set of request headers for Twitter API calls.
   *
   * @param {boolean} [authenticated=false] — If true, include auth cookies.
   *   If false, include guest token headers.
   * @returns {Record<string, string>}
   */
  getHeaders(authenticated = false) {
    const headers = {
      ...this.#baseHeaders(),
      accept: 'application/json',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/json',
    };

    if (authenticated) {
      headers.authorization = `Bearer ${BEARER_TOKEN}`;
      headers.cookie = buildCookieHeader(this.#cookies);
      headers['x-csrf-token'] = this.#cookies.ct0 ?? '';
      headers['x-twitter-auth-type'] = 'OAuth2Session';
      headers['x-twitter-active-user'] = 'yes';
      headers['x-twitter-client-language'] = 'en';
    } else {
      headers.authorization = `Bearer ${BEARER_TOKEN}`;
      if (this.#guestToken) {
        headers['x-guest-token'] = this.#guestToken.token;
      }
      headers['x-twitter-active-user'] = 'yes';
      headers['x-twitter-client-language'] = 'en';
    }

    return headers;
  }

  // ========================================================================
  // Accessors
  // ========================================================================

  /** Check if we have an authenticated session (auth_token present). */
  isAuthenticated() {
    return Boolean(this.#cookies.auth_token && this.#cookies.ct0);
  }

  /** Get the CSRF token from cookies. */
  getCsrfToken() {
    return this.#cookies.ct0 ?? null;
  }

  /** Get the current user info (null if not logged in). */
  getUser() {
    return this.#user ? { ...this.#user } : null;
  }

  /** Get the current cookies as a header string. */
  getCookieString() {
    return buildCookieHeader(this.#cookies);
  }

  /** Get a copy of the cookies object. */
  getCookies() {
    return { ...this.#cookies };
  }

  /**
   * Directly set cookies from an object (for internal / testing use).
   * @param {Record<string, string>} cookies
   */
  setCookies(cookies) {
    this.#cookies = { ...cookies };
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  /**
   * Common base headers included in every request.
   * @returns {Record<string, string>}
   */
  #baseHeaders() {
    return {
      authorization: `Bearer ${BEARER_TOKEN}`,
      'user-agent': this.#userAgent,
    };
  }
}

export default TwitterAuth;

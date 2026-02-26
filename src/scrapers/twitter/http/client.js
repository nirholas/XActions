/**
 * Twitter HTTP Client Core
 *
 * Foundation layer for all HTTP-based Twitter scraper operations.
 * Handles request construction, headers, cookie management, rate-limit
 * detection, retry with exponential back-off, and proxy support.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import {
  BEARER_TOKEN,
  GRAPHQL_BASE,
  REST_BASE,
  DEFAULT_FEATURES,
  USER_AGENTS,
} from './endpoints.js';
import {
  TwitterApiError,
  RateLimitError,
  AuthError,
  NotFoundError,
  NetworkError,
} from './errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pickUserAgent(agents) {
  return agents[Math.floor(Math.random() * agents.length)];
}

// ---------------------------------------------------------------------------
// Rate Limit Strategies
// ---------------------------------------------------------------------------

export class WaitingRateLimitStrategy {
  async onRateLimit({ resetAt }) {
    const waitMs = Math.max((resetAt || Date.now() + 60_000) - Date.now(), 1000);
    await sleep(waitMs);
  }
}

export class ErrorRateLimitStrategy {
  async onRateLimit({ resetAt, endpoint }) {
    throw new RateLimitError(
      `Rate limited on ${endpoint}, resets at ${new Date(resetAt || Date.now())}`,
      { resetAt }
    );
  }
}

// ---------------------------------------------------------------------------
// TwitterHttpClient
// ---------------------------------------------------------------------------

export class TwitterHttpClient {
  /**
   * @param {object} [options]
   * @param {string} [options.cookies] - Cookie string (`name=val; name2=val2`)
   * @param {string} [options.proxy] - Proxy URL (http(s)://, socks5://)
   * @param {'wait'|'error'|object} [options.rateLimitStrategy='error']
   * @param {number} [options.maxRetries=3]
   * @param {string|'rotate'} [options.userAgent]
   * @param {function} [options.fetch] - Custom fetch implementation
   */
  constructor(options = {}) {
    this._cookies = {};
    this._proxy = options.proxy || null;
    this._maxRetries = options.maxRetries ?? 3;
    this._fetch = options.fetch || globalThis.fetch;
    this._userAgents = USER_AGENTS;

    if (options.userAgent && options.userAgent !== 'rotate') {
      this._userAgents = [options.userAgent];
    }

    // Rate-limit strategy
    if (options.rateLimitStrategy === 'wait') {
      this._rateLimitStrategy = new WaitingRateLimitStrategy();
    } else if (
      options.rateLimitStrategy &&
      typeof options.rateLimitStrategy === 'object' &&
      typeof options.rateLimitStrategy.onRateLimit === 'function'
    ) {
      this._rateLimitStrategy = options.rateLimitStrategy;
    } else {
      this._rateLimitStrategy = new ErrorRateLimitStrategy();
    }

    if (options.cookies) {
      this.setCookies(options.cookies);
    }
  }

  // ---- Cookie management --------------------------------------------------

  /**
   * Parse and store cookies from a browser-exported cookie string.
   * @param {string} cookieString - `auth_token=xxx; ct0=yyy; ...`
   */
  setCookies(cookieString) {
    if (!cookieString) return;
    const pairs = cookieString.split(';').map((p) => p.trim()).filter(Boolean);
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx === -1) continue;
      const name = pair.slice(0, eqIdx).trim();
      const value = pair.slice(eqIdx + 1).trim();
      this._cookies[name] = value;
    }
  }

  getCsrfToken() {
    return this._cookies.ct0 || '';
  }

  isAuthenticated() {
    return Boolean(this._cookies.auth_token);
  }

  setProxy(proxyUrl) {
    this._proxy = proxyUrl;
  }

  // ---- Header construction ------------------------------------------------

  /**
   * Build request headers.
   * @param {boolean} [authenticated=true]
   * @returns {object}
   */
  _buildHeaders(authenticated = true) {
    const headers = {
      authorization: `Bearer ${decodeURIComponent(BEARER_TOKEN)}`,
      'user-agent': pickUserAgent(this._userAgents),
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/json',
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
    };

    if (authenticated && this.isAuthenticated()) {
      headers['x-csrf-token'] = this.getCsrfToken();
      headers['x-twitter-auth-type'] = 'OAuth2Session';
      // Rebuild cookie string
      headers.cookie = Object.entries(this._cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    }

    return headers;
  }

  // ---- Core request -------------------------------------------------------

  /**
   * Send an HTTP request with retry logic.
   *
   * @param {string} url
   * @param {object} [options]
   * @param {string} [options.method='GET']
   * @param {object|string} [options.body]
   * @param {object} [options.headers]
   * @param {boolean} [options.authenticated=true]
   * @returns {Promise<object>} Parsed JSON
   */
  async request(url, options = {}) {
    const method = options.method || 'GET';
    const authenticated = options.authenticated !== false;
    const headers = { ...this._buildHeaders(authenticated), ...options.headers };
    const body =
      options.body && typeof options.body !== 'string'
        ? JSON.stringify(options.body)
        : options.body;

    let lastError;
    for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
      try {
        const res = await this._fetch(url, { method, headers, body });

        // Rate-limit detection from headers
        const remaining = parseInt(res.headers?.get?.('x-rate-limit-remaining') ?? '', 10);
        const resetTs = parseInt(res.headers?.get?.('x-rate-limit-reset') ?? '', 10) * 1000;

        if (res.status === 429) {
          const rlErr = { resetAt: resetTs || Date.now() + 60_000, endpoint: url, retryCount: attempt };
          await this._rateLimitStrategy.onRateLimit(rlErr);
          continue; // retry after strategy handles it
        }

        if (res.status === 401 || res.status === 403) {
          throw new AuthError(`Authentication failed (${res.status})`, { status: res.status, endpoint: url });
        }
        if (res.status === 404) {
          throw new NotFoundError('Resource not found', { status: 404, endpoint: url });
        }

        const json = await res.json?.() ?? {};

        if (res.status >= 400) {
          throw new TwitterApiError(`HTTP ${res.status}`, { status: res.status, endpoint: url, data: json });
        }

        return json;
      } catch (err) {
        lastError = err;
        // Don't retry auth / not-found / explicit API errors
        if (
          err instanceof AuthError ||
          err instanceof NotFoundError ||
          (err instanceof TwitterApiError && !(err instanceof RateLimitError))
        ) {
          throw err;
        }
        // Network-level retry
        if (attempt < this._maxRetries) {
          const jitter = Math.random() * 500;
          await sleep(2 ** attempt * 1000 + jitter);
        }
      }
    }
    if (lastError instanceof RateLimitError || lastError instanceof TwitterApiError) throw lastError;
    throw new NetworkError(lastError?.message || 'Request failed after retries', { endpoint: url });
  }

  // ---- GraphQL helpers ----------------------------------------------------

  /**
   * Execute a GraphQL query (GET) or mutation (POST).
   *
   * @param {string} queryId
   * @param {string} operationName
   * @param {object} variables
   * @param {object} [options]
   * @param {object} [options.features]
   * @param {boolean} [options.mutation=false] - If true, sends POST
   * @returns {Promise<object>}
   */
  async graphql(queryId, operationName, variables, options = {}) {
    const features = options.features || DEFAULT_FEATURES;
    const isMutation = options.mutation === true;

    if (isMutation) {
      const url = `${GRAPHQL_BASE}/${queryId}/${operationName}`;
      return this.request(url, {
        method: 'POST',
        body: { variables, features, queryId },
      });
    }

    const params = new URLSearchParams({
      variables: JSON.stringify(variables),
      features: JSON.stringify(features),
    });
    const url = `${GRAPHQL_BASE}/${queryId}/${operationName}?${params}`;
    return this.request(url);
  }

  // ---- REST helper --------------------------------------------------------

  /**
   * Execute a REST API call (typically POST with form data).
   *
   * @param {string} path — e.g. `/1.1/friendships/create.json`
   * @param {object} [options]
   * @param {string} [options.method='POST']
   * @param {object} [options.body] - Will be sent as x-www-form-urlencoded for REST
   * @returns {Promise<object>}
   */
  async rest(path, options = {}) {
    const url = `${REST_BASE}${path}`;
    const method = options.method || 'POST';
    const headers = {
      'content-type': 'application/x-www-form-urlencoded',
    };

    let body;
    if (options.body && typeof options.body === 'object') {
      body = new URLSearchParams(options.body).toString();
    } else {
      body = options.body;
    }

    return this.request(url, { method, headers, body });
  }
}

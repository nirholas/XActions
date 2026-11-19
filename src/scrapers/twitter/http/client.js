// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Twitter HTTP Client Core
 *
 * Foundation layer for all HTTP-based Twitter scraper operations.
 * Handles request construction, headers, cookie management, rate-limit
 * detection, retry with exponential back-off, and proxy support.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import {
  BEARER_TOKEN,
  GRAPHQL_BASE,
  REST_BASE,
  DEFAULT_FEATURES,
  USER_AGENTS,
  buildGraphQLUrl,
  graphqlRequestMethod,
} from './endpoints.js';
import {
  TwitterApiError,
  RateLimitError,
  AuthError,
  NotFoundError,
  NetworkError,
} from './errors.js';
import {
  resolveOperation,
  refreshQueryIds,
  maybeRefreshInBackground,
  isStaleQueryIdError,
} from './queryIds.js';
import { getTransactionId, isTransactionIdEnabled } from './transactionId.js';
import { withHttp2, fetchWithDispatcher, isPlatformFetch } from '../../../utils/http2.js';

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

/**
 * A response body as JSON. A success with no body (204, or X's upload APPEND
 * step) is `{}`: parsing it as JSON would fail, and the retry that followed
 * would send the write a second time.
 *
 * @param {Response} res
 * @returns {Promise<object>}
 */
async function readBody(res) {
  if (res.status === 204 || res.status === 205) return {};
  if (typeof res.text === 'function') {
    const text = await res.text();
    if (!text.trim()) return {};
    return JSON.parse(text);
  }
  return (await res.json?.()) ?? {};
}

/**
 * An error response body, for diagnosis only: JSON when it parses, otherwise
 * the first part of the raw text (Cloudflare answers with an HTML page).
 * Never throws.
 *
 * @param {Response} res
 * @returns {Promise<object|null>}
 */
async function readErrorBody(res) {
  try {
    if (typeof res.text === 'function') {
      const text = await res.text();
      if (!text.trim()) return null;
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text.slice(0, 500) };
      }
    }
    return (await res.json?.()) ?? null;
  } catch {
    return null;
  }
}

/**
 * Walk a response for the first timeline `instructions` array.
 * @param {object} obj
 * @returns {Array|null}
 */
function findInstructions(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (Array.isArray(obj.instructions)) return obj.instructions;
  for (const key of Object.keys(obj)) {
    const result = findInstructions(obj[key]);
    if (result) return result;
  }
  return null;
}

/**
 * Every entry an instruction carries: `TimelineAddEntries.entries`,
 * `TimelineAddToModule.moduleItems`, and the single `entry` of
 * `TimelineReplaceEntry` / `TimelinePinEntry`.
 * @param {object} instruction
 * @returns {object[]}
 */
function instructionEntries(instruction) {
  const out = [];
  if (Array.isArray(instruction?.entries)) out.push(...instruction.entries);
  if (Array.isArray(instruction?.moduleItems)) out.push(...instruction.moduleItems);
  if (instruction?.entry && typeof instruction.entry === 'object') out.push(instruction.entry);
  return out;
}

const entryIdOf = (entry) => entry?.entryId || entry?.entry_id || '';

/**
 * The bottom cursor of a timeline response. From page two on, x.com delivers
 * it through a `TimelineReplaceEntry` instruction (`instruction.entry`), not
 * inside `TimelineAddEntries`; reading only the latter ends pagination after
 * the second page.
 * @param {object} json
 * @returns {string|null}
 */
export function extractBottomCursor(json) {
  const instructions = findInstructions(json);
  if (!instructions) return null;
  for (const instruction of instructions) {
    for (const entry of instructionEntries(instruction)) {
      const id = entryIdOf(entry);
      if (id.startsWith('cursor-bottom') || entry?.content?.cursorType === 'Bottom') {
        const value = entry.content?.value || entry.content?.itemContent?.value || null;
        if (value) return value;
      }
    }
  }
  return null;
}

/**
 * How many non-cursor entries a timeline response carries. A page with none
 * is the end of the timeline, whatever cursor it hands back.
 * @param {object} json
 * @returns {number}
 */
export function countTimelineItems(json) {
  const instructions = findInstructions(json);
  if (!instructions) return 0;
  let n = 0;
  for (const instruction of instructions) {
    for (const entry of instructionEntries(instruction)) {
      const id = entryIdOf(entry);
      if (id.startsWith('cursor-') || entry?.content?.cursorType) continue;
      n++;
    }
  }
  return n;
}

/** Error codes that mean the request was never sent, so resending is safe. */
const NEVER_SENT_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT']);

/**
 * Did this network error happen before the request reached the server?
 * fetch wraps the socket error, so the code is on `cause`.
 * @param {unknown} err
 * @returns {boolean}
 */
function neverSent(err) {
  const code = err?.cause?.code || err?.code;
  return NEVER_SENT_CODES.has(code);
}

export class TwitterHttpClient {
  /**
   * @param {object} [options]
   * @param {string} [options.cookies] - Cookie string (`name=val; name2=val2`)
   * @param {string} [options.proxy] - Proxy URL (http(s)://, socks5://)
   * @param {'wait'|'error'|object} [options.rateLimitStrategy='error']
   * @param {number} [options.maxRetries=3]
   * @param {string|'rotate'} [options.userAgent]
   * @param {function} [options.fetch] - Custom fetch implementation
   * @param {function} [options.onResponse] - Called after every HTTP response with
   *   `{ url, status, remaining, resetAt }`, where `remaining` / `resetAt` come
   *   from the `x-rate-limit-remaining` / `x-rate-limit-reset` headers (null when
   *   absent, `resetAt` in ms). The account pool uses this to track per-account,
   *   per-operation rate-limit windows without wrapping fetch.
   * @param {boolean} [options.autoRefreshQueryIds] - Re-discover GraphQL query IDs
   *   from x.com's bundles when a call fails with a stale-ID error, and in the
   *   background when the on-disk cache is older than 24h. Defaults to true,
   *   except under vitest where it defaults to false so unit tests never reach
   *   the network unless they opt in.
   * @param {boolean} [options.transactionId] - Sign every request with an
   *   `x-client-transaction-id` header, the way x.com's own web client does.
   *   Defaults to on outside vitest, and can be switched off globally with
   *   `XACTIONS_TRANSACTION_ID=0` for debugging. Signing never blocks a
   *   request: if the keys cannot be obtained the request goes out unsigned.
   */
  constructor(options = {}) {
    this._cookies = {};
    this._proxy = options.proxy || null;
    this._maxRetries = options.maxRetries ?? 3;
    this._fetch = options.fetch || globalThis.fetch;
    this._onResponse = typeof options.onResponse === 'function' ? options.onResponse : null;
    this._proxyDispatcher = null;
    this._userAgents = USER_AGENTS;
    this._autoRefreshQueryIds = options.autoRefreshQueryIds ?? !process.env.VITEST;
    this._transactionId = options.transactionId;

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

    this._debug = options.debug || false;

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
    this._proxyDispatcher = null;
  }

  /**
   * Build the fetch init, choosing the dispatcher for it: the proxy agent when
   * `options.proxy` is set, otherwise the shared HTTP/2 agent. `request()`
   * sends it with `fetchWithDispatcher`, which pairs the dispatcher with
   * undici's own fetch. A custom `options.fetch` is left alone: it owns its
   * own transport.
   *
   * HTTP/2 matters here for the same reason it matters in a browser: X's edge
   * answers some operations with a Cloudflare challenge when they arrive over
   * HTTP/1.1, and `UserByRestId` did so on every attempt until this client
   * started negotiating h2.
   * @private
   */
  async _requestInit(method, headers, body) {
    const init = { method, headers, body };
    if (!isPlatformFetch(this._fetch)) return init;
    if (this._proxy) {
      if (!this._proxyDispatcher) {
        let undici;
        try {
          undici = await import('undici');
        } catch {
          throw new NetworkError(
            `A proxy was configured (${this._proxy}) but the "undici" package is not installed; run "npm install undici" to route requests through it.`,
            { endpoint: this._proxy }
          );
        }
        this._proxyDispatcher = new undici.ProxyAgent(this._proxy);
      }
      init.dispatcher = this._proxyDispatcher;
      return init;
    }
    return withHttp2(init, this._fetch);
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

  /**
   * Attach `x-client-transaction-id` to a request's headers, in place.
   *
   * x.com's web client signs every GraphQL and internal REST call with this
   * header; sessions that omit it look unlike any real browser. Generation is
   * best-effort by design, so a signing failure leaves the headers untouched
   * and the request still goes out.
   *
   * @param {string} method
   * @param {string} url
   * @param {object} headers Mutated in place
   * @private
   */
  async _signRequest(method, url, headers) {
    if (!isTransactionIdEnabled({ enabled: this._transactionId })) return;
    const id = await getTransactionId(method, url, {
      enabled: this._transactionId,
      fetch: this._fetch,
    });
    if (id) {
      headers['x-client-transaction-id'] = id;
    } else if (this._debug) {
      console.log(`[TwitterHttpClient] ${method} ${url} → sent unsigned (no transaction keys)`);
    }
  }

  // ---- Core request -------------------------------------------------------

  /**
   * Send an HTTP request with retry logic.
   *
   * @param {string} url
   * @param {object} [options]
   * @param {string} [options.method='GET']
   * @param {object|string|URLSearchParams|FormData} [options.body] An object is
   *   sent as JSON, URLSearchParams as a form, FormData as multipart.
   * @param {object} [options.headers]
   * @param {boolean} [options.authenticated=true]
   * @param {boolean} [options.idempotent] - Whether the request may be sent
   *   again after a 5xx. Defaults to true for GET/HEAD and false otherwise, so
   *   a write is never repeated; GraphQL read queries that X requires as POST
   *   pass true.
   * @returns {Promise<object>} Parsed JSON; `{}` for a success with no body
   */
  async request(url, options = {}) {
    const method = options.method || 'GET';
    const idempotent = options.idempotent ?? (method === 'GET' || method === 'HEAD');
    const authenticated = options.authenticated !== false;
    const headers = { ...this._buildHeaders(authenticated), ...options.headers };
    let body = options.body;
    if (body instanceof URLSearchParams) {
      headers['content-type'] = 'application/x-www-form-urlencoded';
      body = body.toString();
    } else if (typeof FormData !== 'undefined' && body instanceof FormData) {
      // fetch writes the multipart boundary into the content type itself.
      delete headers['content-type'];
    } else if (body && typeof body !== 'string') {
      body = JSON.stringify(body);
    }

    const callerSigned = Boolean(headers['x-client-transaction-id']);

    let lastError;
    for (let attempt = 0; attempt <= this._maxRetries; attempt++) {
      const startTime = Date.now();
      try {
        // Signed per attempt, not per call: the value encodes the current
        // second, and x.com's web client never replays one. A caller that
        // supplied its own header keeps it.
        if (!callerSigned) await this._signRequest(method, url, headers);
        const res = await fetchWithDispatcher(this._fetch, url, await this._requestInit(method, headers, body));
        const elapsed = Date.now() - startTime;
        if (this._debug) {
          console.log(`[TwitterHttpClient] ${method} ${url} → ${res.status} (${elapsed}ms)`);
        }

        // Rate-limit detection from headers
        const remaining = parseInt(res.headers?.get?.('x-rate-limit-remaining') ?? '', 10);
        const resetTs = parseInt(res.headers?.get?.('x-rate-limit-reset') ?? '', 10) * 1000;

        if (this._onResponse) {
          this._onResponse({
            url,
            status: res.status,
            remaining: Number.isNaN(remaining) ? null : remaining,
            resetAt: Number.isNaN(resetTs) ? null : resetTs,
          });
        }

        if (res.status === 429) {
          const rlErr = { resetAt: resetTs || Date.now() + 60_000, endpoint: url, retryCount: attempt };
          await this._rateLimitStrategy.onRateLimit(rlErr);
          continue; // retry after strategy handles it
        }

        if (res.status === 401 || res.status === 403) {
          // The body tells an account that is really dead (suspended,
          // locked) from an edge block or a refused write; the account
          // pool reads it before deciding to lock the account.
          const data = await readErrorBody(res);
          throw new AuthError(`Authentication failed (${res.status})`, { status: res.status, endpoint: url, data });
        }
        if (res.status === 404) {
          throw new NotFoundError('Resource not found', { status: 404, endpoint: url });
        }

        if (res.status >= 400) {
          const data = await readErrorBody(res);
          const apiErr = new TwitterApiError(`HTTP ${res.status}`, { status: res.status, endpoint: url, data });
          // A 5xx is X's side failing (over capacity, a timed-out backend).
          // Reads go round the back-off schedule; a write is never sent twice.
          if (res.status >= 500 && idempotent && attempt < this._maxRetries) {
            lastError = apiErr;
            if (this._debug) {
              console.log(`[TwitterHttpClient] ${method} ${url} → ${res.status}, retrying`);
            }
            await sleep(2 ** attempt * 1000 + Math.random() * 500);
            continue;
          }
          throw apiErr;
        }

        let json;
        try {
          json = await readBody(res);
        } catch (parseErr) {
          // A write that succeeded with an unreadable body must not be
          // retried: the retry would perform it a second time.
          if (!idempotent) {
            throw new TwitterApiError(`Unreadable response body (${parseErr.message})`, { status: res.status, endpoint: url });
          }
          throw parseErr;
        }

        return json;
      } catch (err) {
        const elapsed = Date.now() - startTime;
        if (this._debug) {
          console.log(`[TwitterHttpClient] ${method} ${url} → ERROR (${elapsed}ms): ${err.message}`);
        }
        lastError = err;
        // A RateLimitError here can only come from the rate-limit strategy
        // choosing to throw; surface it at once so a pooled client can rotate
        // to another account instead of burning the back-off schedule.
        if (err instanceof RateLimitError) throw err;
        // Don't retry auth / not-found / explicit API errors
        if (
          err instanceof AuthError ||
          err instanceof NotFoundError ||
          (err instanceof TwitterApiError && !(err instanceof RateLimitError))
        ) {
          throw err;
        }
        // A write is resent only when the error proves it never left this
        // machine (DNS failure, connection refused). A reset or timeout can
        // land after X has already applied the write, and resending it would
        // post, follow or reply a second time.
        if (!idempotent && !neverSent(err)) {
          throw new NetworkError(err?.message || 'Request failed', { endpoint: url });
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
   * Execute a GraphQL query (usually GET; operation-specific POST where X
   * requires it) or mutation (POST).
   *
   * @param {string} queryId
   * @param {string} operationName
   * @param {object} variables
   * @param {object} [options]
   * @param {object} [options.features]
   * @param {Record<string, boolean>} [options.fieldToggles] - Sent as the
   *   `fieldToggles` parameter (query string on GET, body on POST). Omitted
   *   from the request when not given.
   * @param {boolean} [options.mutation=false] - If true, sends POST
   * @returns {Promise<object>}
   */
  async graphql(queryId, operationName, variables, options = {}) {
    const features = options.features || DEFAULT_FEATURES;
    const fieldToggles = options.fieldToggles;
    const isMutation = options.mutation === true;

    // The caller's queryId is the hardcoded table value. Prefer the ID
    // discovered from x.com's live bundles when one is cached; otherwise the
    // caller's ID is used as given, so offline behaviour is unchanged.
    const resolved = resolveOperation(operationName);
    const resolvedId = resolved.source === 'cache' ? resolved.queryId : queryId;

    if (this._autoRefreshQueryIds) {
      maybeRefreshInBackground({ fetch: this._fetch });
    }

    try {
      return await this._graphqlOnce(resolvedId, operationName, variables, features, isMutation, fieldToggles);
    } catch (err) {
      if (!this._autoRefreshQueryIds || !this._isStaleQueryIdFailure(err)) throw err;
      const freshId = await this._refreshedQueryId(operationName);
      if (!freshId || freshId === resolvedId) throw err;
      if (this._debug) {
        console.log(`[TwitterHttpClient] ${operationName}: query ID ${resolvedId} is stale, retrying with ${freshId}`);
      }
      return this._graphqlOnce(freshId, operationName, variables, features, isMutation, fieldToggles);
    }
  }

  /**
   * One GraphQL round-trip with a fixed query ID.
   * @private
   */
  async _graphqlOnce(queryId, operationName, variables, features, isMutation, fieldToggles) {
    // Field toggles go in the body of a POST next to variables and features,
    // and are left out entirely when the caller set none, so a request made
    // without them is byte-for-byte what it was before they were supported.
    const body = fieldToggles
      ? { variables, features, fieldToggles, queryId }
      : { variables, features, queryId };

    if (isMutation) {
      const url = `${GRAPHQL_BASE}/${queryId}/${operationName}`;
      // Mutations don't paginate: return raw JSON
      return this.request(url, { method: 'POST', body });
    }

    const method = graphqlRequestMethod(operationName);
    const url = method === 'POST'
      ? `${GRAPHQL_BASE}/${queryId}/${operationName}`
      : buildGraphQLUrl(queryId, operationName, variables, features, fieldToggles);
    const json = await this.request(
      url,
      method === 'POST' ? { method, body, idempotent: true } : undefined,
    );

    // x.com answers every GraphQL query with the envelope { data, errors }.
    // Consumers read `response.data.user`, `response.data.tweetResult` and so
    // on, so the envelope is stripped here. Returning the raw body would put
    // the payload one level too deep and every parser would see undefined.
    // A body with no `data` key is passed through unchanged.
    const payload = json && typeof json === 'object' && 'data' in json ? json.data : json;

    // Extract bottom cursor for pagination (queries only)
    const cursor = this._extractCursor(json);
    return { data: payload, errors: json?.errors, cursor };
  }

  /**
   * A 404 on a GraphQL URL, or a 400 whose body names the persisted query,
   * means the query ID no longer exists on x.com's side.
   * @private
   */
  _isStaleQueryIdFailure(err) {
    if (err instanceof NotFoundError) return true;
    return err instanceof TwitterApiError && isStaleQueryIdError(err.status, err.data);
  }

  /**
   * Fetch for query-ID discovery: this client's own transport, carrying this
   * client's session cookies on x.com navigations.
   *
   * Discovery passes its fetch straight through, so it never picks up the
   * jar on disk, and X only inlines the webpack manifest in the HTML a
   * signed-in session gets. Without the cookies on the entry navigation the
   * refresh finds no bundle, fails, and leaves the stale ID in place.
   * @private
   * @returns {typeof globalThis.fetch}
   */
  _discoveryFetch() {
    const cookie = Object.entries(this._cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    if (!cookie) return this._fetch;
    const base = this._fetch.bind(this);
    return (url, opts = {}) => {
      const headers = opts.headers ?? {};
      let host = '';
      try {
        host = new URL(url).hostname;
      } catch {
        host = '';
      }
      const sameSite =
        host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com');
      const alreadySet = typeof headers.cookie === 'string' && headers.cookie.length > 0;
      if (!sameSite || alreadySet) return base(url, opts);
      return base(url, { ...opts, headers: { ...headers, cookie } });
    };
  }

  /**
   * Re-discover query IDs from the live bundles and return the operation's
   * new ID, or null if discovery failed (offline, blocked, no bundle).
   * @private
   */
  async _refreshedQueryId(operationName) {
    try {
      await refreshQueryIds({ fetch: this._discoveryFetch() });
    } catch (err) {
      if (this._debug) {
        console.log(`[TwitterHttpClient] query ID refresh failed: ${err.message}`);
      }
      return null;
    }
    return resolveOperation(operationName).queryId;
  }

  /**
   * Auto-paginating async generator over a GraphQL query.
   *
   * @param {string} queryId
   * @param {string} operationName
   * @param {object} variables
   * @param {object} [options]
   * @param {object} [options.features]
   * @param {number} [options.limit=Infinity] - Stop after this many items
   * @param {function} [options.onProgress] - Called with `{ fetched, limit }`
   * @yields {{ data: object, cursor: string|null }}
   */
  async *graphqlPaginate(queryId, operationName, variables, options = {}) {
    const limit = options.limit ?? Infinity;
    let cursor = null;
    let fetched = 0;
    let emptyPages = 0;

    while (fetched < limit) {
      const vars = cursor ? { ...variables, cursor } : { ...variables };
      const result = await this.graphql(queryId, operationName, vars, options);

      yield result;
      fetched += 1;

      if (options.onProgress) {
        options.onProgress({ fetched, limit: limit === Infinity ? null : limit });
      }

      // A cursor that comes back unchanged means the page did not advance.
      // With the default limit of Infinity, continuing would request the same
      // page from x.com forever, so treat it as the end of the list, as the
      // relationship, tweet and search loops already do.
      if (!result.cursor || result.cursor === cursor) break;
      cursor = result.cursor;
      // Past the end of some timelines X keeps handing out fresh cursors on
      // pages that carry nothing else; two such pages in a row end the list.
      emptyPages = countTimelineItems(result.data) === 0 ? emptyPages + 1 : 0;
      if (emptyPages >= 2) break;
    }
  }

  // ---- Cursor extraction --------------------------------------------------

  /**
   * Extract the "bottom" cursor from a Twitter timeline GraphQL response.
   * Twitter nests cursors in timeline instruction entries with entryId
   * starting with "cursor-bottom".
   *
   * @param {object} json
   * @returns {string|null}
   * @private
   */
  _extractCursor(json) {
    try {
      return extractBottomCursor(json);
    } catch {
      return null;
    }
  }

  /**
   * Recursively search the response for a timeline instructions array.
   * @param {object} obj
   * @returns {Array|null}
   * @private
   */
  _findInstructions(obj) {
    return findInstructions(obj);
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

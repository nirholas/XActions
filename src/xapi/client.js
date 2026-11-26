// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * A client for the official X API v2, driven entirely by the generated
 * operation catalog. Every one of the API's operations is callable by its
 * operationId with no hand-written wrapper, and a new endpoint X publishes is
 * callable as soon as `npm run sync:xapi` regenerates the catalog.
 *
 * What it does for you:
 *
 *   - checks the params against the catalog before any request (required,
 *     unknown, allowed values, patterns, ranges), so a typo costs nothing
 *   - picks a credential the operation accepts: OAuth 2.0 user token, then
 *     OAuth 1.0a, then the app-only bearer token, unless you name one
 *   - refreshes an expiring OAuth 2.0 token before the call, and once more
 *     on a 401, and hands the new token to `onTokenRefresh` to persist
 *   - reads the x-rate-limit-* headers into every result, waits out a 429
 *     when the reset is near, and retries 5xx and network failures with
 *     backoff
 *   - follows `meta.next_token` for paginated operations
 *   - keeps streaming operations open, detects a stalled connection by the
 *     missing keep-alive, and reconnects with the backoff X recommends
 *   - uploads media in chunks through the v2 media endpoints
 *
 * This is the paid, keyed lane. The rest of XActions reads X without an API
 * key; use this when you have a developer account and want the official,
 * terms-compliant contract (and the endpoints only it has: filtered stream,
 * compliance jobs, usage, webhooks, Account Activity, analytics).
 *
 * @module xactions/xapi/client
 */

import { OPERATIONS, SOURCE } from './catalog.generated.js';
import { XApiError } from './errors.js';
import { oauth1Header } from './oauth1.js';
import { fetchBearerToken, refreshAccessToken } from './oauth2.js';
import { rateLimitsFor } from './rate-limits.js';

const BY_ID = new Map(OPERATIONS.map((op) => [op.id, op]));
const BY_ID_LOWER = new Map(OPERATIONS.map((op) => [op.id.toLowerCase(), op]));

/**
 * The spec has been renaming `tweet.fields` to `post.fields` operation by
 * operation. Accept either spelling and send the one the operation declares.
 */
const PARAM_ALIASES = Object.freeze({ 'tweet.fields': 'post.fields', 'post.fields': 'tweet.fields' });

const REFRESH_SKEW_MS = 60_000;
const STREAM_STALL_MS = 30_000;

const sleepDefault = (ms, signal) =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new Error('aborted'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(signal.reason ?? new Error('aborted'));
    }, { once: true });
  });

// ---------------------------------------------------------------------------
// Catalog lookups
// ---------------------------------------------------------------------------

function editDistance(a, b) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Closest operation ids to a mistyped one. */
export function suggestOperations(id, limit = 5) {
  const q = String(id).toLowerCase();
  return OPERATIONS.map((op) => {
    const lower = op.id.toLowerCase();
    const score = lower.includes(q) || q.includes(lower) ? 0 : editDistance(q, lower);
    return { id: op.id, score };
  })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((s) => s.id);
}

/**
 * Find an operation by id (case-insensitive) or by "METHOD /path".
 * @returns {import('./types.js').XApiOperation}
 */
export function getOperation(idOrRoute) {
  const key = String(idOrRoute).trim();
  const found = BY_ID.get(key) ?? BY_ID_LOWER.get(key.toLowerCase());
  if (found) return found;
  const m = key.match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\/\S+)$/i);
  if (m) {
    const method = m[1].toUpperCase();
    const route = m[2].replace(/:([A-Za-z_]+)/g, '{$1}');
    const op = OPERATIONS.find((o) => o.method === method && o.path === route);
    if (op) return op;
  }
  throw new XApiError(`Unknown X API operation "${key}"`, { code: 'unknown_operation', suggestions: suggestOperations(key) });
}

/**
 * Search the catalog. Matches id, label, path and tag.
 * @param {object} [filter]
 * @param {string} [filter.query]
 * @param {string} [filter.tag]
 * @param {boolean} [filter.write]
 * @param {boolean} [filter.streaming]
 * @param {'bearer'|'oauth2'|'oauth1'} [filter.auth]
 */
export function listOperations({ query, tag, write, streaming, auth } = {}) {
  const words = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return OPERATIONS.filter((op) => {
    if (tag && op.tag.toLowerCase() !== String(tag).toLowerCase()) return false;
    if (write !== undefined && op.write !== write) return false;
    if (streaming !== undefined && op.streaming !== streaming) return false;
    if (auth === 'bearer' && !op.auth.bearer) return false;
    if (auth === 'oauth2' && !op.auth.oauth2User) return false;
    if (auth === 'oauth1' && !op.auth.oauth1User) return false;
    if (!words.length) return true;
    const hay = `${op.id} ${op.label} ${op.method} ${op.path} ${op.tag}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** Every tag with its operation count. */
export function listTags() {
  const counts = new Map();
  for (const op of OPERATIONS) counts.set(op.tag, (counts.get(op.tag) ?? 0) + 1);
  return [...counts].map(([tag, count]) => ({ tag, count })).sort((a, b) => a.tag.localeCompare(b.tag));
}

/** An operation plus its published rate limits, for display. */
export function describeOperation(idOrRoute) {
  const op = getOperation(idOrRoute);
  return { ...op, rateLimits: rateLimitsFor(op.method, op.path) };
}

// ---------------------------------------------------------------------------
// Validation and request building
// ---------------------------------------------------------------------------

/**
 * Field lists and expansions are where X's spec and its live behaviour drift
 * apart most (new fields ship before the spec catches up, renamed ones keep
 * working for a while). A value outside the published list there is reported
 * as a warning and still sent; everywhere else it is refused.
 */
const ADVISORY_ENUM = (name) => name.endsWith('.fields') || name === 'expansions';

function checkScalar(name, value, spec, issues) {
  const type = spec.type;
  if (type === 'integer' || type === 'number') {
    const n = Number(value);
    if (!Number.isFinite(n) || (type === 'integer' && !Number.isInteger(n))) {
      issues.push(`${name} must be ${type === 'integer' ? 'an integer' : 'a number'}, got ${JSON.stringify(value)}`);
      return;
    }
    if (spec.minimum !== undefined && n < spec.minimum) issues.push(`${name} must be at least ${spec.minimum}, got ${n}`);
    if (spec.maximum !== undefined && n > spec.maximum) issues.push(`${name} must be at most ${spec.maximum}, got ${n}`);
  } else if (type === 'boolean') {
    if (!['true', 'false', true, false].includes(value)) issues.push(`${name} must be true or false`);
  }
  const s = String(value);
  if (spec.enum && !spec.enum.map(String).includes(s)) {
    const shown = spec.enum.length > 12 ? `${spec.enum.slice(0, 12).join(', ')}, ...` : spec.enum.join(', ');
    issues.push(`${name}: "${s}" is not allowed. Allowed: ${shown}`);
  }
  if (spec.pattern && !new RegExp(spec.pattern).test(s)) issues.push(`${name}: "${s}" does not match ${spec.pattern}`);
  if (spec.minLength !== undefined && s.length < spec.minLength) issues.push(`${name} must be at least ${spec.minLength} characters`);
  if (spec.maxLength !== undefined && s.length > spec.maxLength) issues.push(`${name} must be at most ${spec.maxLength} characters`);
}

function toList(value) {
  if (Array.isArray(value)) return value.map(String);
  return String(value).split(',').map((s) => s.trim()).filter(Boolean);
}

/**
 * Check params against an operation and return the normalised pieces.
 * Throws XApiError(invalid_params) listing every problem at once.
 */
export function prepareParams(op, params = {}) {
  const issues = [];
  const warnings = [];
  const declared = new Map(op.params.map((p) => [p.name, p]));
  const values = {};
  for (const [rawName, value] of Object.entries(params)) {
    if (value === undefined || value === null || rawName === 'body') continue;
    let name = rawName;
    if (!declared.has(name) && PARAM_ALIASES[name] && declared.has(PARAM_ALIASES[name])) name = PARAM_ALIASES[name];
    if (!declared.has(name)) {
      const close = [...declared.keys()].filter((k) => editDistance(k, rawName) <= 3);
      issues.push(`unknown parameter "${rawName}"${close.length ? ` (did you mean ${close.join(' or ')}?)` : ''}. Accepted: ${[...declared.keys()].join(', ') || 'none'}`);
      continue;
    }
    values[name] = value;
  }
  for (const p of op.params) {
    if (p.required && (values[p.name] === undefined || values[p.name] === '')) issues.push(`missing required parameter "${p.name}"`);
  }

  const path = {};
  const query = new URLSearchParams();
  const headers = {};
  for (const [name, value] of Object.entries(values)) {
    const p = declared.get(name);
    if (p.type === 'array') {
      const list = toList(value);
      if (p.minItems !== undefined && list.length < p.minItems) issues.push(`${name} needs at least ${p.minItems} value(s)`);
      if (p.maxItems !== undefined && list.length > p.maxItems) issues.push(`${name} takes at most ${p.maxItems} values, got ${list.length}`);
      if (ADVISORY_ENUM(name) && p.items?.enum) {
        const unknown = list.filter((item) => !p.items.enum.includes(item));
        if (unknown.length) warnings.push(`${name}: ${unknown.join(', ')} not in the published list for ${op.id}; sent anyway`);
        for (const item of list) checkScalar(name, item, { ...p.items, enum: undefined }, issues);
      } else {
        for (const item of list) checkScalar(name, item, p.items ?? {}, issues);
      }
      if (p.in === 'query') {
        if (p.explode) for (const item of list) query.append(name, item);
        else query.set(name, list.join(','));
      } else if (p.in === 'path') path[name] = list.join(',');
      else headers[name] = list.join(',');
    } else {
      checkScalar(name, value, p, issues);
      if (p.in === 'path') path[name] = String(value);
      else if (p.in === 'query') query.set(name, String(value));
      else if (p.in === 'header') headers[name] = String(value);
    }
  }
  if (issues.length) {
    throw new XApiError(`Invalid parameters for ${op.id}: ${issues.join('; ')}`, { code: 'invalid_params', operationId: op.id, issues });
  }
  const resolvedPath = op.path.replace(/\{([^}]+)\}/g, (_, n) => encodeURIComponent(path[n]));
  return { path: resolvedPath, query, headers, warnings };
}

function checkBody(op, body) {
  if (!op.body) {
    if (body !== undefined) throw new XApiError(`${op.id} takes no request body`, { code: 'invalid_params', operationId: op.id });
    return;
  }
  if (body === undefined) {
    if (op.body.required) {
      const req = (op.body.properties ?? []).filter((p) => p.required).map((p) => p.name);
      throw new XApiError(`${op.id} needs a request body${req.length ? ` with ${req.join(', ')}` : ''}`, { code: 'invalid_params', operationId: op.id });
    }
    return;
  }
  const isPlainObject = body && typeof body === 'object' && !(body instanceof FormData) && !ArrayBuffer.isView(body) && !(body instanceof ArrayBuffer);
  if (!isPlainObject || !op.body.properties?.length || op.body.oneOf) return;
  const issues = [];
  for (const prop of op.body.properties) if (prop.required && body[prop.name] === undefined) issues.push(`body is missing "${prop.name}"`);
  const known = new Set(op.body.properties.map((p) => p.name));
  for (const key of Object.keys(body)) if (!known.has(key)) issues.push(`body has unknown property "${key}". Accepted: ${[...known].join(', ')}`);
  for (const prop of op.body.properties) {
    const v = body[prop.name];
    if (v === undefined || prop.type === 'object' || prop.type === 'array') continue;
    checkScalar(`body.${prop.name}`, v, prop, issues);
  }
  if (issues.length) throw new XApiError(`Invalid body for ${op.id}: ${issues.join('; ')}`, { code: 'invalid_params', operationId: op.id, issues });
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/** Read the rate-limit headers X sends on every response. */
export function readRateLimit(headers) {
  const num = (k) => {
    const v = headers.get(k);
    return v === null || v === '' ? null : Number(v);
  };
  const reset = num('x-rate-limit-reset');
  const out = {
    limit: num('x-rate-limit-limit'),
    remaining: num('x-rate-limit-remaining'),
    reset,
    resetAt: reset ? new Date(reset * 1000).toISOString() : null,
  };
  const userReset = num('x-user-limit-24hour-reset');
  if (userReset !== null || num('x-user-limit-24hour-remaining') !== null) {
    out.user24h = { limit: num('x-user-limit-24hour-limit'), remaining: num('x-user-limit-24hour-remaining'), reset: userReset };
  }
  const appReset = num('x-app-limit-24hour-reset');
  if (appReset !== null || num('x-app-limit-24hour-remaining') !== null) {
    out.app24h = { limit: num('x-app-limit-24hour-limit'), remaining: num('x-app-limit-24hour-remaining'), reset: appReset };
  }
  return out;
}

function problemFrom(body, status) {
  if (!body || typeof body !== 'object') return { title: `HTTP ${status}`, detail: typeof body === 'string' ? body.slice(0, 500) : undefined };
  if (body.title || body.detail || body.type) return { title: body.title, detail: body.detail, type: body.type, errors: body.errors };
  if (Array.isArray(body.errors) && body.errors.length) {
    const first = body.errors[0];
    return { title: first.title ?? first.message ?? `HTTP ${status}`, detail: first.detail ?? first.message, type: first.type, errors: body.errors };
  }
  if (body.error) return { title: body.error, detail: body.error_description };
  return { title: `HTTP ${status}` };
}

/** Merge one page's `includes` into an accumulator, deduplicated by key. */
export function mergeIncludes(target, includes) {
  for (const [kind, items] of Object.entries(includes ?? {})) {
    const list = (target[kind] ||= []);
    const seen = new Set(list.map((x) => x.id ?? x.media_key ?? JSON.stringify(x)));
    for (const item of items) {
      const key = item.id ?? item.media_key ?? JSON.stringify(item);
      if (!seen.has(key)) {
        seen.add(key);
        list.push(item);
      }
    }
  }
  return target;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class XApiClient {
  /**
   * @param {object} [options]
   * @param {string} [options.bearerToken]        app-only token (X_BEARER_TOKEN)
   * @param {{apiKey: string, apiSecret: string}} [options.appKeys]  fetches the bearer token on first use
   * @param {object} [options.oauth2]             user-context OAuth 2.0
   * @param {string} options.oauth2.accessToken
   * @param {string} [options.oauth2.refreshToken]
   * @param {number} [options.oauth2.expiresAt]   epoch ms
   * @param {string[]} [options.oauth2.scopes]
   * @param {string} [options.oauth2.clientId]    needed to refresh
   * @param {string} [options.oauth2.clientSecret]
   * @param {object} [options.oauth1]             user-context OAuth 1.0a
   * @param {string} options.oauth1.consumerKey
   * @param {string} options.oauth1.consumerSecret
   * @param {string} options.oauth1.token
   * @param {string} options.oauth1.tokenSecret
   * @param {(token: object) => void|Promise<void>} [options.onTokenRefresh]
   * @param {string} [options.baseUrl]            default https://api.x.com
   * @param {typeof globalThis.fetch} [options.fetch]
   * @param {number} [options.maxRetries]         server error and network retries, default 3
   * @param {number} [options.maxRateLimitWaitMs] longest rate-limit wait before throwing, default 15 minutes
   * @param {string} [options.userAgent]
   * @param {(ms: number, signal?: AbortSignal) => Promise<void>} [options.sleep]
   * @param {() => number} [options.now]           clock in epoch ms, for tests
   */
  constructor(options = {}) {
    this.bearerToken = options.bearerToken ?? null;
    this.appKeys = options.appKeys ?? null;
    this.oauth2 = options.oauth2?.accessToken ? { ...options.oauth2 } : null;
    this.oauth1 = options.oauth1?.consumerKey && options.oauth1?.token ? { ...options.oauth1 } : null;
    this.onTokenRefresh = options.onTokenRefresh ?? null;
    this.baseUrl = (options.baseUrl ?? SOURCE.server ?? 'https://api.x.com').replace(/\/$/, '');
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.maxRetries = options.maxRetries ?? 3;
    this.maxRateLimitWaitMs = options.maxRateLimitWaitMs ?? 15 * 60_000;
    this.userAgent = options.userAgent ?? 'xactions-xapi';
    this.sleep = options.sleep ?? sleepDefault;
    this.now = options.now ?? (() => Date.now());
  }

  /**
   * Build a client from environment variables:
   *
   *   X_BEARER_TOKEN                          app-only
   *   X_API_KEY + X_API_SECRET                app keys (bearer fetched on demand; with the two below, OAuth 1.0a)
   *   X_ACCESS_TOKEN + X_ACCESS_TOKEN_SECRET  OAuth 1.0a user context
   *   X_OAUTH2_ACCESS_TOKEN [+ X_OAUTH2_REFRESH_TOKEN, X_CLIENT_ID, X_CLIENT_SECRET]  OAuth 2.0 user context
   *
   * The TWITTER_* spellings of each are accepted too.
   */
  static fromEnv(env = process.env, extra = {}) {
    const pick = (...names) => names.map((n) => env[n]).find((v) => v && String(v).trim()) ?? undefined;
    const apiKey = pick('X_API_KEY', 'X_CONSUMER_KEY', 'TWITTER_API_KEY', 'TWITTER_CONSUMER_KEY');
    const apiSecret = pick('X_API_SECRET', 'X_CONSUMER_SECRET', 'TWITTER_API_SECRET', 'TWITTER_CONSUMER_SECRET', 'TWITTER_API_SECRET_KEY');
    const token = pick('X_ACCESS_TOKEN', 'TWITTER_ACCESS_TOKEN');
    const tokenSecret = pick('X_ACCESS_TOKEN_SECRET', 'X_ACCESS_SECRET', 'TWITTER_ACCESS_TOKEN_SECRET', 'TWITTER_ACCESS_SECRET');
    const oauth2Access = pick('X_OAUTH2_ACCESS_TOKEN', 'X_USER_ACCESS_TOKEN', 'TWITTER_OAUTH2_ACCESS_TOKEN');
    return new XApiClient({
      bearerToken: pick('X_BEARER_TOKEN', 'TWITTER_BEARER_TOKEN', 'XAPI_BEARER_TOKEN'),
      appKeys: apiKey && apiSecret ? { apiKey, apiSecret } : undefined,
      oauth1: apiKey && apiSecret && token && tokenSecret ? { consumerKey: apiKey, consumerSecret: apiSecret, token, tokenSecret } : undefined,
      oauth2: oauth2Access
        ? {
            accessToken: oauth2Access,
            refreshToken: pick('X_OAUTH2_REFRESH_TOKEN', 'TWITTER_OAUTH2_REFRESH_TOKEN'),
            clientId: pick('X_CLIENT_ID', 'TWITTER_CLIENT_ID'),
            clientSecret: pick('X_CLIENT_SECRET', 'TWITTER_CLIENT_SECRET'),
          }
        : undefined,
      baseUrl: pick('X_API_BASE_URL'),
      ...extra,
    });
  }

  /** Which credentials are configured, without revealing any of them. */
  credentials() {
    return {
      bearer: Boolean(this.bearerToken || this.appKeys),
      oauth2: Boolean(this.oauth2),
      oauth2Scopes: this.oauth2?.scopes ?? null,
      oauth2Refreshable: Boolean(this.oauth2?.refreshToken && this.oauth2?.clientId),
      oauth1: Boolean(this.oauth1),
    };
  }

  /**
   * Choose how to sign a call to `op`.
   * @param {import('./types.js').XApiOperation} op
   * @param {'bearer'|'oauth2'|'oauth1'} [prefer]
   */
  chooseAuth(op, prefer) {
    const has = { oauth2: Boolean(this.oauth2), oauth1: Boolean(this.oauth1), bearer: Boolean(this.bearerToken || this.appKeys) };
    const accepts = { oauth2: Boolean(op.auth.oauth2User), oauth1: op.auth.oauth1User, bearer: op.auth.bearer };
    const order = prefer ? [prefer] : ['oauth2', 'oauth1', 'bearer'];
    for (const kind of order) if (has[kind] && accepts[kind]) return kind;

    const accepted = Object.entries(accepts).filter(([, v]) => v).map(([k]) => k);
    const how = {
      bearer: 'X_BEARER_TOKEN (app-only)',
      oauth2: `an OAuth 2.0 user token with ${(op.auth.oauth2User ?? []).join(', ') || 'the listed scopes'} (xactions xapi auth login)`,
      oauth1: 'X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET (OAuth 1.0a)',
    };
    const why = prefer && has[prefer] ? `${op.id} does not accept ${prefer}.` : `No credential that ${op.id} accepts is configured.`;
    throw new XApiError(`${why} It accepts: ${accepted.map((k) => how[k]).join('; or ')}`, { code: 'auth_required', operationId: op.id });
  }

  async ensureBearer() {
    if (this.bearerToken) return this.bearerToken;
    this.bearerToken = await fetchBearerToken({ ...this.appKeys, fetch: this.fetch });
    return this.bearerToken;
  }

  async refreshOAuth2() {
    const o = this.oauth2;
    const token = await refreshAccessToken({ clientId: o.clientId, clientSecret: o.clientSecret, refreshToken: o.refreshToken, fetch: this.fetch, now: this.now() });
    this.oauth2 = { ...o, ...token };
    if (this.onTokenRefresh) await this.onTokenRefresh({ ...this.oauth2 });
    return this.oauth2;
  }

  canRefresh() {
    return Boolean(this.oauth2?.refreshToken && this.oauth2?.clientId);
  }

  async authorize(kind, method, url) {
    if (kind === 'bearer') return `Bearer ${await this.ensureBearer()}`;
    if (kind === 'oauth2') {
      if (this.oauth2.expiresAt && this.oauth2.expiresAt - REFRESH_SKEW_MS <= this.now() && this.canRefresh()) await this.refreshOAuth2();
      return `Bearer ${this.oauth2.accessToken}`;
    }
    return oauth1Header({ method, url, credentials: this.oauth1 });
  }

  /**
   * Build everything needed to send one request, without sending it.
   * Useful for `--dry-run` and for tests.
   */
  build(idOrRoute, params = {}, options = {}) {
    const op = getOperation(idOrRoute);
    const { path, query, headers, warnings } = prepareParams(op, params);
    const body = options.body ?? params.body;
    checkBody(op, body);
    const qs = query.toString();
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ''}`;
    let auth = null;
    try {
      auth = this.chooseAuth(op, options.auth);
    } catch (err) {
      // A dry run may describe a request this machine has no credential for yet.
      if (options.requireAuth !== false || err.code !== 'auth_required') throw err;
    }
    return { op, url, headers, body, auth, warnings };
  }

  /**
   * Call one operation.
   *
   * @param {string} idOrRoute   operationId, or "METHOD /2/path"
   * @param {Record<string, any>} [params]  path and query params by name; `body` may ride along here
   * @param {object} [options]
   * @param {any} [options.body]
   * @param {'bearer'|'oauth2'|'oauth1'} [options.auth]
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<import('./types.js').XApiResult>}
   */
  async call(idOrRoute, params = {}, options = {}) {
    const plan = this.build(idOrRoute, params, options);
    if (plan.op.streaming) {
      throw new XApiError(`${plan.op.id} is a stream. Use client.stream("${plan.op.id}", ...)`, { code: 'invalid_params', operationId: plan.op.id });
    }
    return this.send(plan, options);
  }

  async send(plan, options = {}) {
    const { op, url, headers: extraHeaders, body, auth, warnings } = plan;
    let attempt = 0;
    let refreshed = false;
    for (;;) {
      const headers = { 'user-agent': this.userAgent, accept: 'application/json', ...extraHeaders };
      let payload;
      if (body !== undefined) {
        if (body instanceof FormData) payload = body;
        else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
          payload = body;
          headers['content-type'] = 'application/octet-stream';
        } else {
          payload = JSON.stringify(body);
          headers['content-type'] = 'application/json';
        }
      }
      headers.authorization = await this.authorize(auth, op.method, url);

      let res;
      try {
        res = await this.fetch(url, { method: op.method, headers, body: payload, signal: options.signal });
      } catch (cause) {
        if (options.signal?.aborted) throw cause;
        if (attempt < this.maxRetries) {
          await this.sleep(Math.min(1000 * 2 ** attempt, 16_000), options.signal);
          attempt++;
          continue;
        }
        throw new XApiError(`${op.id}: network error: ${cause.message}`, { code: 'network_error', operationId: op.id, cause });
      }

      const rateLimit = readRateLimit(res.headers);
      const text = await res.text();
      let json = null;
      if (text) {
        try {
          json = JSON.parse(text);
        } catch {
          json = text;
        }
      }

      if (res.ok) {
        const out = { status: res.status, data: json?.data ?? null, rateLimit, auth, body: json };
        if (json?.includes) out.includes = json.includes;
        if (json?.meta) out.meta = json.meta;
        if (json?.errors) out.errors = json.errors;
        if (warnings?.length) out.warnings = warnings;
        return out;
      }

      if (res.status === 401 && auth === 'oauth2' && !refreshed && this.canRefresh()) {
        refreshed = true;
        await this.refreshOAuth2();
        continue;
      }
      if (res.status === 429) {
        const capped = problemFrom(json, 429);
        if (/\/usage-capped$/.test(capped.type ?? '')) {
          // A spend or volume cap, not a window: the reset header will not lift it.
          throw new XApiError(`${op.id}: usage cap reached${capped.detail ? ` (${capped.detail})` : ''}. Raise the cap or add credits in the developer console.`, { code: 'usage_capped', status: 429, operationId: op.id, rateLimit, ...capped, body: json });
        }
        const resetMs = rateLimit.reset ? rateLimit.reset * 1000 - this.now() + 1000 : null;
        const retryAfter = Number(res.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : resetMs ?? 60_000 * 2 ** attempt;
        if (waitMs <= this.maxRateLimitWaitMs && attempt < this.maxRetries) {
          await this.sleep(Math.max(waitMs, 0), options.signal);
          attempt++;
          continue;
        }
        const p = problemFrom(json, 429);
        throw new XApiError(`${op.id}: rate limited until ${rateLimit.resetAt ?? 'unknown'}`, { code: 'rate_limited', status: 429, operationId: op.id, rateLimit, ...p, body: json });
      }
      if (res.status >= 500 && attempt < this.maxRetries) {
        await this.sleep(Math.min(1000 * 2 ** attempt, 16_000), options.signal);
        attempt++;
        continue;
      }
      const p = problemFrom(json, res.status);
      const code = res.status === 401 || res.status === 403 ? 'auth_required' : 'http_error';
      const hint = res.status === 403 && auth === 'bearer' && (op.auth.oauth2User || op.auth.oauth1User) ? ' (this endpoint may need user context: try OAuth 2.0 or OAuth 1.0a)' : '';
      throw new XApiError(`${op.id}: ${res.status} ${p.title ?? ''}${p.detail && p.detail !== p.title ? `: ${p.detail}` : ''}${hint}`.trim(), {
        code,
        status: res.status,
        operationId: op.id,
        rateLimit,
        ...p,
        body: json,
      });
    }
  }

  /**
   * Walk every page of a paginated operation.
   *
   * @param {string} idOrRoute
   * @param {Record<string, any>} [params]
   * @param {object} [options]
   * @param {number} [options.maxPages]
   * @param {AbortSignal} [options.signal]
   * @returns {AsyncGenerator<import('./types.js').XApiResult>}
   */
  async *paginate(idOrRoute, params = {}, options = {}) {
    const op = getOperation(idOrRoute);
    if (!op.pagination) {
      yield await this.call(op.id, params, options);
      return;
    }
    let token = params[op.pagination];
    let pages = 0;
    for (;;) {
      const page = await this.call(op.id, { ...params, [op.pagination]: token }, options);
      yield page;
      pages++;
      token = page.meta?.next_token;
      if (!token || (options.maxPages && pages >= options.maxPages)) return;
    }
  }

  /**
   * Collect up to `limit` items across pages into one result.
   * @returns {Promise<{data: any[], includes: Record<string, any[]>, meta: object, errors: any[], pages: number, rateLimit: import('./types.js').XApiRateLimit|null, warnings?: string[]}>}
   */
  async collect(idOrRoute, params = {}, options = {}) {
    const limit = options.limit ?? Infinity;
    const data = [];
    const includes = {};
    const errors = [];
    let pages = 0;
    let last = null;
    for await (const page of this.paginate(idOrRoute, params, options)) {
      pages++;
      last = page;
      const items = Array.isArray(page.data) ? page.data : page.data ? [page.data] : [];
      for (const item of items) {
        if (data.length >= limit) break;
        data.push(item);
      }
      mergeIncludes(includes, page.includes);
      if (page.errors) errors.push(...page.errors);
      if (data.length >= limit) break;
    }
    const meta = { ...(last?.meta ?? {}), result_count: data.length };
    return { data, includes, meta, errors, pages, rateLimit: last?.rateLimit ?? null, ...(last?.warnings ? { warnings: last.warnings } : {}) };
  }

  /**
   * Hold a streaming operation open and yield each JSON message.
   *
   * Keep-alive newlines are swallowed. If nothing (not even a keep-alive)
   * arrives for `stallMs`, the connection is treated as dead and reopened.
   * Reconnects back off the way X's streaming guidance describes: network
   * drops linearly from 250 ms to 16 s, HTTP errors exponentially from 5 s
   * to 320 s, and 429 exponentially from 60 s.
   *
   * @param {string} idOrRoute
   * @param {Record<string, any>} [params]
   * @param {object} [options]
   * @param {AbortSignal} [options.signal]
   * @param {boolean} [options.reconnect]   default true
   * @param {number} [options.maxReconnects] default Infinity
   * @param {number} [options.stallMs]      default 30000
   * @param {'bearer'|'oauth2'|'oauth1'} [options.auth]
   * @param {(event: {type: string, attempt?: number, waitMs?: number, status?: number, error?: string}) => void} [options.onEvent]
   */
  async *stream(idOrRoute, params = {}, options = {}) {
    const plan = this.build(idOrRoute, params, options);
    if (!plan.op.streaming) throw new XApiError(`${plan.op.id} is not a stream. Use client.call()`, { code: 'invalid_params', operationId: plan.op.id });
    const reconnect = options.reconnect ?? true;
    const maxReconnects = options.maxReconnects ?? Infinity;
    const stallMs = options.stallMs ?? STREAM_STALL_MS;
    const emit = options.onEvent ?? (() => {});
    let failures = 0;

    while (!options.signal?.aborted) {
      const controller = new AbortController();
      const onAbort = () => controller.abort(options.signal.reason);
      options.signal?.addEventListener('abort', onAbort, { once: true });
      let stallTimer = null;
      const arm = () => {
        clearTimeout(stallTimer);
        stallTimer = setTimeout(() => controller.abort(new Error('stalled')), stallMs);
      };
      let wait;
      try {
        const headers = { 'user-agent': this.userAgent, ...plan.headers, authorization: await this.authorize(plan.auth, 'GET', plan.url) };
        arm();
        const res = await this.fetch(plan.url, { method: 'GET', headers, signal: controller.signal });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            json = text;
          }
          const p = problemFrom(json, res.status);
          if (res.status === 401 || res.status === 403 || res.status === 400 || res.status === 404) {
            throw new XApiError(`${plan.op.id}: ${res.status} ${p.title ?? ''}${p.detail && p.detail !== p.title ? `: ${p.detail}` : ''}`.trim(), {
              code: res.status === 400 || res.status === 404 ? 'http_error' : 'auth_required',
              status: res.status,
              operationId: plan.op.id,
              ...p,
              body: json,
            });
          }
          emit({ type: 'http_error', status: res.status, error: p.title });
          wait = res.status === 429 ? 60_000 * 2 ** Math.min(failures, 6) : Math.min(5000 * 2 ** failures, 320_000);
        } else {
          emit({ type: 'connected', attempt: failures });
          failures = 0;
          const decoder = new TextDecoder();
          let buffer = '';
          for await (const chunk of res.body) {
            arm();
            buffer += decoder.decode(chunk, { stream: true });
            let idx;
            while ((idx = buffer.search(/\r?\n/)) !== -1) {
              const line = buffer.slice(0, idx).trim();
              buffer = buffer.slice(buffer[idx] === '\r' ? idx + 2 : idx + 1);
              if (!line) continue;
              let message;
              try {
                message = JSON.parse(line);
              } catch {
                emit({ type: 'unparsable', error: line.slice(0, 200) });
                continue;
              }
              yield message;
            }
          }
          emit({ type: 'disconnected' });
          wait = 250;
        }
      } catch (err) {
        if (err instanceof XApiError) throw err;
        if (options.signal?.aborted) return;
        const stalled = controller.signal.reason?.message === 'stalled';
        emit({ type: stalled ? 'stalled' : 'network_error', error: err.message });
        wait = Math.min(250 * (failures + 1), 16_000);
      } finally {
        clearTimeout(stallTimer);
        options.signal?.removeEventListener('abort', onAbort);
        // Also runs when the consumer stops iterating: close the socket so the process can exit.
        controller.abort(new Error('closed'));
      }
      failures++;
      if (!reconnect || failures > maxReconnects) {
        throw new XApiError(`${plan.op.id}: stream closed after ${failures} attempt(s)`, { code: 'stream_error', operationId: plan.op.id });
      }
      emit({ type: 'reconnecting', attempt: failures, waitMs: wait });
      try {
        await this.sleep(wait, options.signal);
      } catch {
        return;
      }
    }
  }

  /**
   * Upload media through the v2 chunked endpoints and wait for processing.
   *
   * @param {Uint8Array|ArrayBuffer} bytes
   * @param {object} options
   * @param {string} options.mediaType       for example image/png or video/mp4
   * @param {string} [options.mediaCategory] tweet_image, tweet_video, tweet_gif, dm_image, ...
   * @param {number} [options.chunkSize]     default 4 MiB
   * @param {string[]} [options.additionalOwners]
   * @param {number} [options.maxWaitMs]     processing wait cap, default 10 min
   * @param {'oauth2'|'oauth1'} [options.auth]
   * @returns {Promise<{mediaId: string, mediaKey?: string, processing?: object}>}
   */
  async uploadMedia(bytes, options) {
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const chunkSize = options.chunkSize ?? 4 * 1024 * 1024;
    const category = options.mediaCategory ?? (options.mediaType.startsWith('video/') ? 'tweet_video' : options.mediaType === 'image/gif' ? 'tweet_gif' : 'tweet_image');
    const auth = options.auth;
    const init = await this.call(
      'initializeMediaUpload',
      {},
      {
        auth,
        body: {
          media_type: options.mediaType,
          total_bytes: data.byteLength,
          media_category: category,
          ...(options.additionalOwners?.length ? { additional_owners: options.additionalOwners } : {}),
        },
      },
    );
    const mediaId = init.data?.id ?? init.data?.media_id_string;
    if (!mediaId) throw new XApiError('initializeMediaUpload returned no media id', { code: 'http_error', operationId: 'initializeMediaUpload', body: init.body });

    for (let offset = 0, segment = 0; offset < data.byteLength; offset += chunkSize, segment++) {
      const form = new FormData();
      form.append('segment_index', String(segment));
      form.append('media', new Blob([data.slice(offset, offset + chunkSize)], { type: 'application/octet-stream' }), 'chunk');
      await this.call('appendMediaUpload', { id: mediaId }, { auth, body: form });
    }

    let result = await this.call('finalizeMediaUpload', { id: mediaId }, { auth });
    let info = result.data?.processing_info;
    const deadline = this.now() + (options.maxWaitMs ?? 10 * 60_000);
    while (info && (info.state === 'pending' || info.state === 'in_progress')) {
      if (this.now() > deadline) throw new XApiError(`Media ${mediaId} still processing after the wait limit`, { code: 'http_error', operationId: 'getMediaUploadStatus' });
      await this.sleep(Math.max(1, info.check_after_secs ?? 2) * 1000);
      result = await this.call('getMediaUploadStatus', { media_id: mediaId, command: 'STATUS' }, { auth });
      info = result.data?.processing_info;
    }
    if (info?.state === 'failed') {
      throw new XApiError(`Media ${mediaId} failed processing: ${info.error?.message ?? 'unknown reason'}`, { code: 'http_error', operationId: 'getMediaUploadStatus', body: result.body });
    }
    return { mediaId: String(mediaId), mediaKey: result.data?.media_key, processing: info ?? undefined };
  }
}

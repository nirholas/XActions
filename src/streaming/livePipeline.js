// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Live Pipeline: real-time events from x.com's own event pipeline
 *
 * x.com's web client keeps one long-lived connection open to
 * `https://api.x.com/live_pipeline/events` and receives newline-delimited JSON
 * frames on it: tweet engagement counters, DM conversation updates, and DM
 * typing indicators. Subscriptions are changed mid-session by POSTing to
 * `https://api.x.com/1.1/live_pipeline/update_subscriptions` with the session
 * id returned in the first frame, so topics can be added and removed without
 * dropping the connection.
 *
 * This is not a WebSocket. The endpoint answers an `Upgrade: websocket`
 * request with the same HTTP/2 response it gives a plain GET (401 without a
 * session, never a 101), and the browser client reads it as a chunked
 * response. This module therefore speaks the transport x.com actually serves:
 * a streaming GET whose body is read line by line. Every other property the
 * caller cares about (push delivery with no polling interval, live
 * subscription changes, automatic reconnect) is unchanged.
 *
 * The pipeline needs a logged-in session. A guest token is rejected, so a
 * client without an `auth_token` cookie fails fast with LivePipelineAuthError
 * instead of opening a connection that can only 401.
 *
 * Protocol facts (endpoint paths, parameter names, frame keys, topic shapes)
 * were read from d60/twikit (MIT) and verified against the live endpoint.
 * No twikit code is reproduced here: see THIRD-PARTY-NOTICES.md.
 *
 * @module streaming/livePipeline
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import { API_BASE } from '../scrapers/twitter/http/endpoints.js';
import { AuthError, NetworkError, TwitterApiError } from '../scrapers/twitter/http/errors.js';
import { randomUserAgent } from '../scrapers/twitter/http/guest.js';

// ============================================================================
// Constants
// ============================================================================

/** Long-lived event stream. One connection carries every subscribed topic. */
export const LIVE_PIPELINE_EVENTS_URL = `${API_BASE}/live_pipeline/events`;

/** Mid-session subscription changes. Keyed by the `LivePipeline-Session` header. */
export const LIVE_PIPELINE_SUBSCRIPTIONS_URL = `${API_BASE}/1.1/live_pipeline/update_subscriptions`;

/** Every value `event.type` can take. */
export const LIVE_EVENT_TYPES = Object.freeze([
  'engagement',
  'dm',
  'typing',
  'config',
  'unknown',
]);

/** Defaults for the reconnect schedule. Overridable per pipeline. */
export const DEFAULT_RECONNECT = Object.freeze({
  enabled: true,
  minDelayMs: 1_000,
  maxDelayMs: 60_000,
  factor: 2,
  jitter: 0.3,
  maxAttempts: Infinity,
  // A reconnected stream has to stay up this long before the attempt counter
  // (and so the backoff) resets; null means maxDelayMs.
  stableAfterMs: null,
});

/** How long to wait for the session config frame before calling the open failed. */
const DEFAULT_OPEN_TIMEOUT_MS = 20_000;

/** Floor for the silence watchdog when the server advertises a short heartbeat. */
const MIN_HEARTBEAT_TIMEOUT_MS = 15_000;

/** Watchdog fires after this multiple of the advertised heartbeat interval. */
const HEARTBEAT_TIMEOUT_FACTOR = 3;

/** Re-assert subscriptions at this fraction of the advertised TTL. */
const SUBSCRIPTION_REFRESH_RATIO = 0.8;

// ============================================================================
// Errors
// ============================================================================

/**
 * Any live-pipeline failure that is not an authentication failure.
 * `code` is one of: `not_open`, `no_config`, `open_timeout`, `http_error`,
 * `no_body`, `parse_error`, `handler_error`, `heartbeat_timeout`,
 * `stream_closed`, `reconnect_exhausted`.
 */
export class LivePipelineError extends TwitterApiError {
  constructor(message, { code = 'live_pipeline_error', ...rest } = {}) {
    super(message, rest);
    this.name = 'LivePipelineError';
    this.code = code;
  }
}

/**
 * The session cannot open the pipeline: no `auth_token` cookie, or x.com
 * rejected the cookies with 401/403. Guest tokens never work here.
 */
export class LivePipelineAuthError extends AuthError {
  constructor(message, options = {}) {
    super(message, options);
    this.name = 'LivePipelineAuthError';
    this.code = 'auth_required';
  }
}

// ============================================================================
// Topics
// ============================================================================

/**
 * Topic builders. A topic string is what the pipeline subscribes to, and it is
 * echoed back on every frame it produces.
 */
export const Topic = Object.freeze({
  /**
   * Engagement counters (likes, retweets, quotes, replies, views) for one post.
   * @param {string|number} tweetId
   * @returns {string} e.g. `/tweet_engagement/1234567890`
   */
  tweetEngagement(tweetId) {
    return `/tweet_engagement/${requireId(tweetId, 'tweetId')}`;
  },

  /**
   * New messages in one DM conversation. A conversation id is either a group
   * id (`1234567890`) or `partnerId-yourId` (`1234567890-9876543210`).
   *
   * DM topics are only accepted on the opening connection: x.com answers a
   * mid-session subscribe for a DM topic with an entry in the subscription
   * error list. Pass them to `createLivePipeline({ topics })`.
   *
   * @param {string} conversationId
   * @returns {string} e.g. `/dm_update/1234567890-9876543210`
   */
  dmUpdate(conversationId) {
    return `/dm_update/${requireId(conversationId, 'conversationId')}`;
  },

  /**
   * Typing indicators in one DM conversation. Same mid-session limit as
   * `dmUpdate`.
   * @param {string} conversationId
   * @returns {string} e.g. `/dm_typing/1234567890-9876543210`
   */
  dmTyping(conversationId) {
    return `/dm_typing/${requireId(conversationId, 'conversationId')}`;
  },
});

/**
 * Split a topic string into its kind and id.
 * @param {string} topic
 * @returns {{ kind: string|null, id: string|null }}
 */
export function parseTopic(topic) {
  if (typeof topic !== 'string') return { kind: null, id: null };
  const match = /^\/([a-z_]+)\/(.+)$/.exec(topic.trim());
  if (!match) return { kind: null, id: null };
  return { kind: match[1], id: match[2] };
}

function requireId(value, name) {
  const id = String(value ?? '').trim();
  if (!id) throw new TypeError(`${name} is required to build a live-pipeline topic`);
  return id;
}

function normalizeTopics(topics) {
  if (topics == null) return [];
  const list = Array.isArray(topics) || topics instanceof Set ? [...topics] : [topics];
  const seen = new Set();
  for (const raw of list) {
    const topic = String(raw ?? '').trim();
    if (topic) seen.add(topic);
  }
  return [...seen];
}

// ============================================================================
// Frame normalisation
// ============================================================================

/**
 * A frame carries one `payload` object whose keys name the events inside it.
 * Each key becomes one typed event, so a frame with both `dm_update` and
 * `dm_typing` yields two events.
 *
 * @param {object} frame - Parsed JSON frame, `{ topic?, payload }`
 * @param {object} [options]
 * @param {string} [options.receivedAt] - ISO timestamp stamped on every event
 * @returns {Array<{ type: string, topic: string|null, payload: object, receivedAt: string, raw: object }>}
 */
export function normalizeFrame(frame, { receivedAt = new Date().toISOString() } = {}) {
  if (!frame || typeof frame !== 'object') {
    return [makeEvent('unknown', null, { value: frame }, receivedAt, frame)];
  }

  const topic = typeof frame.topic === 'string' ? frame.topic : null;
  const payload = frame.payload && typeof frame.payload === 'object' ? frame.payload : null;

  if (!payload) {
    return [makeEvent('unknown', topic, { ...frame }, receivedAt, frame)];
  }

  const events = [];
  for (const [name, body] of Object.entries(payload)) {
    events.push(makeEvent(...describePayload(name, body, topic), receivedAt, frame));
  }
  if (events.length === 0) {
    events.push(makeEvent('unknown', topic, { ...frame }, receivedAt, frame));
  }
  return events;
}

/**
 * Map one payload key to `[type, topic, payload]`.
 * @returns {[string, string|null, object]}
 */
function describePayload(name, body, topic) {
  const data = body && typeof body === 'object' ? body : { value: body };
  const { id } = parseTopic(topic);

  switch (name) {
    case 'config':
      return ['config', topic, {
        kind: 'session',
        sessionId: data.session_id ?? null,
        subscriptionTtlMillis: toNumber(data.subscription_ttl_millis),
        heartbeatMillis: toNumber(data.heartbeat_millis),
      }];

    case 'subscriptions':
      return ['config', topic, {
        kind: 'subscriptions',
        errors: Array.isArray(data.errors) ? data.errors : [],
      }];

    case 'tweet_engagement':
      return ['engagement', topic, {
        tweetId: id,
        likeCount: toNumber(data.like_count),
        retweetCount: toNumber(data.retweet_count),
        quoteCount: toNumber(data.quote_count),
        replyCount: toNumber(data.reply_count),
        viewCount: toNumber(data.view_count_info?.count),
        viewCountState: data.view_count_info?.state ?? null,
      }];

    case 'dm_update':
      return ['dm', topic, {
        conversationId: data.conversation_id ?? id,
        userId: data.user_id ?? null,
      }];

    case 'dm_typing':
      return ['typing', topic, {
        conversationId: data.conversation_id ?? id,
        userId: data.user_id ?? null,
      }];

    default:
      return ['unknown', topic, { name, data }];
  }
}

function makeEvent(type, topic, payload, receivedAt, raw) {
  return { type, topic, payload, receivedAt, raw };
}

/** Counter fields arrive as strings on some frames and numbers on others. */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// ============================================================================
// Backoff
// ============================================================================

/**
 * Exponential backoff with symmetric jitter.
 *
 * `attempt` is 1 for the first retry after a drop. The un-jittered delay is
 * `minDelayMs * factor^(attempt-1)`, capped at `maxDelayMs`; jitter then
 * spreads it over `+/- jitter` of that value, so a fleet of clients that lost
 * the same connection does not reconnect in lockstep.
 *
 * @param {number} attempt
 * @param {object} [options]
 * @param {number} [options.minDelayMs=1000]
 * @param {number} [options.maxDelayMs=60000]
 * @param {number} [options.factor=2]
 * @param {number} [options.jitter=0.3] - Fraction of the delay, 0 disables jitter
 * @param {function} [options.random=Math.random]
 * @returns {number} Delay in ms
 */
export function computeBackoffDelay(attempt, options = {}) {
  const {
    minDelayMs = DEFAULT_RECONNECT.minDelayMs,
    maxDelayMs = DEFAULT_RECONNECT.maxDelayMs,
    factor = DEFAULT_RECONNECT.factor,
    jitter = DEFAULT_RECONNECT.jitter,
    random = Math.random,
  } = options;

  const step = Math.max(1, attempt);
  const base = Math.min(minDelayMs * factor ** (step - 1), maxDelayMs);
  const spread = 1 - jitter + 2 * jitter * random();
  return Math.max(0, Math.round(base * spread));
}

// ============================================================================
// Transport helpers
// ============================================================================

/** Iterate a fetch body as chunks, whether or not it is async-iterable. */
async function* iterateBody(body) {
  if (typeof body[Symbol.asyncIterator] === 'function') {
    yield* body;
    return;
  }
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      if (value) yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

function createDeferred() {
  const deferred = { settled: false };
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = (value) => {
      if (deferred.settled) return;
      deferred.settled = true;
      resolve(value);
    };
    deferred.reject = (err) => {
      if (deferred.settled) return;
      deferred.settled = true;
      reject(err);
    };
  });
  return deferred;
}

/**
 * Build the headers for the event stream from the client's own header builder,
 * so the bearer token, cookie jar, CSRF token and User-Agent rotation are the
 * ones every other XActions request already uses.
 */
function buildStreamHeaders(client) {
  const headers = { ...client._buildHeaders(true) };
  // The stream is a GET with no body; sending a JSON content-type on it is
  // the one deviation from what the web client sends.
  delete headers['content-type'];
  if (!headers['user-agent']) headers['user-agent'] = randomUserAgent();
  return headers;
}

function assertClient(client) {
  if (
    !client ||
    typeof client._buildHeaders !== 'function' ||
    typeof client.isAuthenticated !== 'function' ||
    typeof client.request !== 'function'
  ) {
    throw new TypeError(
      'createLivePipeline requires a TwitterHttpClient (src/scrapers/twitter/http/client.js) as `client`'
    );
  }
}

// ============================================================================
// LivePipeline
// ============================================================================

class LivePipeline {
  constructor(options) {
    const {
      client,
      topics,
      onEvent,
      onError,
      reconnect,
      fetch: fetchImpl,
      eventsUrl = LIVE_PIPELINE_EVENTS_URL,
      subscriptionsUrl = LIVE_PIPELINE_SUBSCRIPTIONS_URL,
      openTimeoutMs = DEFAULT_OPEN_TIMEOUT_MS,
      heartbeatTimeoutMs = null,
    } = options;

    assertClient(client);

    this._client = client;
    this._fetch = fetchImpl || client._fetch || globalThis.fetch;
    this._eventsUrl = eventsUrl;
    this._subscriptionsUrl = subscriptionsUrl;
    this._openTimeoutMs = openTimeoutMs;
    this._configuredHeartbeatTimeoutMs = heartbeatTimeoutMs;
    this._heartbeatTimeoutMs = heartbeatTimeoutMs;

    this._onEvent = typeof onEvent === 'function' ? onEvent : null;
    this._onError = typeof onError === 'function' ? onError : null;

    this._reconnect =
      reconnect === false
        ? { ...DEFAULT_RECONNECT, enabled: false }
        : { ...DEFAULT_RECONNECT, ...(reconnect || {}) };

    this._topics = new Set(normalizeTopics(topics));
    this._sessionId = null;
    this._state = 'idle'; // idle | connecting | open | closing | closed
    this._controller = null;
    this._reader = null;
    this._ready = null;
    this._readDone = Promise.resolve({ ok: true });
    this._loopPromise = null;
    this._heartbeatTimer = null;
    this._openTimer = null;
    this._subscriptionTimer = null;
    this._sleepTimer = null;
    this._sleepResolve = null;

    this._stats = {
      connects: 0,
      reconnects: 0,
      frames: 0,
      events: 0,
      malformedFrames: 0,
      lastFrameAt: null,
      lastError: null,
    };
  }

  // -- Public surface -------------------------------------------------------

  get sessionId() {
    return this._sessionId;
  }

  get topics() {
    return [...this._topics];
  }

  get state() {
    return this._state;
  }

  get isOpen() {
    return this._state === 'open';
  }

  get stats() {
    return { ...this._stats, topics: this._topics.size };
  }

  /**
   * Open the stream and resolve once x.com has sent the session config frame.
   * Rejects (without retrying) when the connection cannot be established, so
   * a caller can fall back to another transport. Reconnect with backoff only
   * governs a session that opened and later dropped.
   *
   * @returns {Promise<{ sessionId: string, topics: string[] }>}
   */
  async open() {
    if (this._state === 'open') {
      return { sessionId: this._sessionId, topics: this.topics };
    }
    if (this._state === 'connecting') {
      throw new LivePipelineError('open() is already in flight', { code: 'not_open' });
    }
    if (!this._client.isAuthenticated()) {
      throw new LivePipelineAuthError(
        'The live pipeline needs a logged-in session: set auth_token and ct0 cookies on the client. Guest tokens are rejected by this endpoint.',
        { endpoint: this._eventsUrl }
      );
    }

    this._state = 'connecting';
    try {
      await this._connect();
    } catch (err) {
      this._state = 'closed';
      this._stats.lastError = err.message;
      this._clearTimers();
      this._abort('open failed');
      await this._readDone.catch(() => {});
      throw err;
    }

    this._state = 'open';
    this._supervise();
    return { sessionId: this._sessionId, topics: this.topics };
  }

  /**
   * Add topics to the running session without reconnecting.
   * @param {string|string[]|Set<string>} topics
   * @returns {Promise<{ topics: string[], errors: any[], raw: object }|null>}
   */
  async subscribe(topics) {
    const list = normalizeTopics(topics);
    if (list.length === 0) return null;
    const result = await this._postSubscriptions(list, []);
    for (const topic of list) this._topics.add(topic);
    return { ...result, topics: this.topics };
  }

  /**
   * Drop topics from the running session without reconnecting.
   * @param {string|string[]|Set<string>} topics
   * @returns {Promise<{ topics: string[], errors: any[], raw: object }|null>}
   */
  async unsubscribe(topics) {
    const list = normalizeTopics(topics);
    if (list.length === 0) return null;
    const result = await this._postSubscriptions([], list);
    for (const topic of list) this._topics.delete(topic);
    return { ...result, topics: this.topics };
  }

  /**
   * Shut the connection down. Resolves once the read loop and the reconnect
   * supervisor have both finished, so nothing is left running after it.
   * @returns {Promise<void>}
   */
  async close() {
    if (this._state === 'closed' || this._state === 'idle') {
      this._state = 'closed';
      return;
    }
    this._state = 'closing';
    this._clearTimers();
    this._wakeSleep();
    this._abort('closed by caller');

    await this._readDone.catch(() => {});
    if (this._loopPromise) await this._loopPromise.catch(() => {});

    this._state = 'closed';
    this._sessionId = null;
  }

  // -- Connection -----------------------------------------------------------

  /**
   * One connection attempt. Resolves when the config frame arrives; the read
   * loop keeps running in the background afterwards.
   */
  async _connect() {
    const controller = new AbortController();
    this._controller = controller;
    this._ready = createDeferred();

    const url = this._buildEventsUrl();
    const headers = buildStreamHeaders(this._client);

    let res;
    try {
      res = await this._fetch(url, { method: 'GET', headers, signal: controller.signal });
    } catch (err) {
      throw new NetworkError(`live_pipeline connection failed: ${err.message}`, { endpoint: url });
    }

    if (res.status === 401 || res.status === 403) {
      throw new LivePipelineAuthError(
        `The live pipeline rejected this session (HTTP ${res.status}). Refresh the auth_token and ct0 cookies and try again.`,
        { status: res.status, endpoint: url }
      );
    }
    if (res.status >= 400) {
      throw new LivePipelineError(`live_pipeline responded HTTP ${res.status}`, {
        code: 'http_error',
        status: res.status,
        endpoint: url,
      });
    }
    if (!res.body) {
      throw new LivePipelineError('live_pipeline response carried no readable body', {
        code: 'no_body',
        endpoint: url,
      });
    }

    this._stats.connects += 1;
    this._armHeartbeat();

    this._readDone = this._readStream(res)
      .then(() => ({ ok: true }))
      .catch((err) => ({ ok: false, err }));

    this._readDone.then((result) => {
      if (this._ready.settled) return;
      this._ready.reject(
        result.ok
          ? new LivePipelineError('the stream ended before the session config frame arrived', {
              code: 'no_config',
              endpoint: url,
            })
          : result.err
      );
    });

    this._openTimer = setTimeout(() => {
      this._ready.reject(
        new LivePipelineError(
          `no session config frame within ${this._openTimeoutMs}ms`,
          { code: 'open_timeout', endpoint: url }
        )
      );
      this._abort('open timeout');
    }, this._openTimeoutMs);
    if (typeof this._openTimer.unref === 'function') this._openTimer.unref();

    try {
      await this._ready.promise;
    } finally {
      clearTimeout(this._openTimer);
      this._openTimer = null;
    }
  }

  _buildEventsUrl() {
    const url = new URL(this._eventsUrl);
    // Every topic rides on the opening request, which is also how a reconnect
    // re-subscribes: the set carried here is the live set, including topics
    // added later through subscribe().
    url.searchParams.set('topics', this.topics.join(','));
    return url.toString();
  }

  /** Read the body, split it into lines, and turn each line into events. */
  async _readStream(res) {
    const decoder = new TextDecoder();
    let buffer = '';

    const consume = (chunk) => {
      this._armHeartbeat();
      buffer += decoder.decode(chunk, { stream: true });

      let index = buffer.indexOf('\n');
      while (index >= 0) {
        const line = buffer.slice(0, index);
        buffer = buffer.slice(index + 1);
        this._handleLine(line);
        index = buffer.indexOf('\n');
      }
    };

    const body = res.body;
    if (typeof body.getReader === 'function') {
      // Holding the reader lets close() cancel it directly, so shutting down
      // never waits on a transport that ignores the abort signal.
      const reader = body.getReader();
      this._reader = reader;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) consume(value);
        }
      } finally {
        this._reader = null;
        try {
          reader.releaseLock();
        } catch {
          // The reader is already released when the stream was cancelled.
        }
      }
    } else {
      for await (const chunk of iterateBody(body)) consume(chunk);
    }

    const tail = buffer + decoder.decode();
    if (tail.trim()) this._handleLine(tail);
  }

  _handleLine(rawLine) {
    const line = rawLine.replace(/\r$/, '').trim();
    // A blank line is the pipeline's keepalive. It carries no event, and the
    // watchdog has already been re-armed by the chunk that delivered it.
    if (!line) return;

    let frame;
    try {
      frame = JSON.parse(line);
    } catch {
      this._stats.malformedFrames += 1;
      this._emitError(
        new LivePipelineError(`could not parse a live_pipeline frame: ${line.slice(0, 200)}`, {
          code: 'parse_error',
        }),
        { willRetry: false, fatal: false }
      );
      return;
    }

    this._stats.frames += 1;
    this._stats.lastFrameAt = new Date().toISOString();

    for (const event of normalizeFrame(frame)) {
      if (event.type === 'config' && event.payload.kind === 'session') {
        this._applyConfig(event.payload);
      }
      this._stats.events += 1;
      this._deliver(event);
    }
  }

  _applyConfig(config) {
    if (config.sessionId) this._sessionId = config.sessionId;

    if (this._configuredHeartbeatTimeoutMs == null && config.heartbeatMillis) {
      this._heartbeatTimeoutMs = Math.max(
        MIN_HEARTBEAT_TIMEOUT_MS,
        config.heartbeatMillis * HEARTBEAT_TIMEOUT_FACTOR
      );
      this._armHeartbeat();
    }

    this._scheduleSubscriptionRefresh(config.subscriptionTtlMillis);
    if (this._ready) this._ready.resolve({ sessionId: this._sessionId });
  }

  _deliver(event) {
    if (!this._onEvent) return;
    try {
      this._onEvent(event);
    } catch (err) {
      this._emitError(
        new LivePipelineError(`onEvent handler threw: ${err.message}`, { code: 'handler_error' }),
        { willRetry: false, fatal: false }
      );
    }
  }

  // -- Reconnect supervision ------------------------------------------------

  /** Watch the open connection and reconnect it, with backoff, when it drops. */
  _supervise() {
    this._loopPromise = (async () => {
      let attempt = 0;
      let cause = await this._waitForDrop();

      for (;;) {
        this._clearTimers();
        if (this._isStopping()) return;

        const fatal =
          !this._reconnect.enabled ||
          cause instanceof LivePipelineAuthError ||
          attempt >= this._reconnect.maxAttempts;

        if (fatal) {
          this._fail(cause);
          return;
        }

        attempt += 1;
        const delayMs = computeBackoffDelay(attempt, this._reconnect);
        this._stats.lastError = cause.message;
        this._emitError(cause, { willRetry: true, fatal: false, attempt, delayMs });

        await this._sleep(delayMs);
        if (this._isStopping()) return;

        try {
          this._state = 'connecting';
          await this._connect();
          this._state = 'open';
          this._stats.reconnects += 1;
          const connectedAt = Date.now();
          cause = await this._waitForDrop();
          // The backoff only starts over once a connection has proved itself
          // by staying up for a while. Resetting on the config frame alone
          // let a server that accepts and then drops at once be redialled at
          // the minimum delay forever (maxAttempts is Infinity by default).
          if (Date.now() - connectedAt >= this._stableAfterMs()) attempt = 0;
        } catch (err) {
          cause = err;
        }
      }
    })();
  }

  /** How long a reconnected stream must stay up before the backoff resets. */
  _stableAfterMs() {
    return this._reconnect.stableAfterMs ?? this._reconnect.maxDelayMs;
  }

  async _waitForDrop() {
    const result = await this._readDone;
    if (result.ok) {
      return new LivePipelineError('live_pipeline closed the stream', { code: 'stream_closed' });
    }
    return result.err;
  }

  _isStopping() {
    return this._state === 'closing' || this._state === 'closed';
  }

  _fail(cause) {
    this._state = 'closed';
    this._sessionId = null;
    this._stats.lastError = cause.message;
    const error =
      cause instanceof LivePipelineAuthError
        ? cause
        : new LivePipelineError(`live_pipeline gave up reconnecting: ${cause.message}`, {
            code: 'reconnect_exhausted',
          });
    this._emitError(error, { willRetry: false, fatal: true });
  }

  _emitError(error, info) {
    if (!this._onError) return;
    try {
      this._onError(error, info);
    } catch {
      // A throwing error handler must not take the pipeline down with it.
    }
  }

  // -- Subscriptions --------------------------------------------------------

  async _postSubscriptions(subscribeTopics, unsubscribeTopics) {
    if (!this._sessionId) {
      throw new LivePipelineError(
        'subscriptions can only be changed on an open session: call open() first',
        { code: 'not_open' }
      );
    }

    const body = new URLSearchParams({
      sub_topics: subscribeTopics.join(','),
      unsub_topics: unsubscribeTopics.join(','),
    }).toString();

    const json = await this._client.request(this._subscriptionsUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'LivePipeline-Session': this._sessionId,
      },
      body,
    });

    const errors = Array.isArray(json?.subscriptions?.errors) ? json.subscriptions.errors : [];
    return { errors, raw: json };
  }

  /** Re-assert the current topics before the server's TTL drops them. */
  _scheduleSubscriptionRefresh(ttlMillis) {
    clearTimeout(this._subscriptionTimer);
    this._subscriptionTimer = null;
    if (!ttlMillis || ttlMillis <= 0) return;

    const every = Math.max(1_000, Math.round(ttlMillis * SUBSCRIPTION_REFRESH_RATIO));
    this._subscriptionTimer = setTimeout(() => {
      if (!this.isOpen || this._topics.size === 0) return;
      this._postSubscriptions(this.topics, [])
        .catch((err) => {
          this._emitError(
            new LivePipelineError(`subscription refresh failed: ${err.message}`, {
              code: 'http_error',
            }),
            { willRetry: false, fatal: false }
          );
        })
        .finally(() => {
          if (this.isOpen) this._scheduleSubscriptionRefresh(ttlMillis);
        });
    }, every);
    if (typeof this._subscriptionTimer.unref === 'function') this._subscriptionTimer.unref();
  }

  // -- Timers ---------------------------------------------------------------

  /** Restart the silence watchdog. Fires when no bytes arrive for too long. */
  _armHeartbeat() {
    clearTimeout(this._heartbeatTimer);
    const timeout = this._heartbeatTimeoutMs;
    if (!timeout || this._isStopping()) {
      this._heartbeatTimer = null;
      return;
    }
    this._heartbeatTimer = setTimeout(() => {
      this._emitError(
        new LivePipelineError(`no live_pipeline traffic for ${timeout}ms`, {
          code: 'heartbeat_timeout',
        }),
        { willRetry: this._reconnect.enabled, fatal: false }
      );
      this._abort('heartbeat timeout');
    }, timeout);
    if (typeof this._heartbeatTimer.unref === 'function') this._heartbeatTimer.unref();
  }

  _sleep(ms) {
    return new Promise((resolve) => {
      this._sleepResolve = resolve;
      this._sleepTimer = setTimeout(() => {
        this._sleepTimer = null;
        this._sleepResolve = null;
        resolve();
      }, ms);
      if (typeof this._sleepTimer.unref === 'function') this._sleepTimer.unref();
    });
  }

  _wakeSleep() {
    if (this._sleepTimer) {
      clearTimeout(this._sleepTimer);
      this._sleepTimer = null;
    }
    if (this._sleepResolve) {
      const resolve = this._sleepResolve;
      this._sleepResolve = null;
      resolve();
    }
  }

  _clearTimers() {
    clearTimeout(this._heartbeatTimer);
    clearTimeout(this._openTimer);
    clearTimeout(this._subscriptionTimer);
    this._heartbeatTimer = null;
    this._openTimer = null;
    this._subscriptionTimer = null;
  }

  _abort(reason) {
    if (this._controller && !this._controller.signal.aborted) {
      this._controller.abort(new Error(reason));
    }
    if (this._reader) {
      this._reader.cancel(reason).catch(() => {
        // The stream is already gone; the read loop is ending either way.
      });
    }
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a live-pipeline client. The connection is not opened until `open()`
 * is awaited, so handlers and topics can be set up first.
 *
 * @param {object} options
 * @param {import('../scrapers/twitter/http/client.js').TwitterHttpClient} options.client
 *   Logged-in HTTP client. Its cookie jar, CSRF token and headers are reused as-is.
 * @param {string[]|Set<string>} [options.topics] - Topics for the opening request. Build them with `Topic`.
 * @param {(event: {type: string, topic: string|null, payload: object, receivedAt: string, raw: object}) => void} [options.onEvent]
 * @param {(error: Error, info: {fatal: boolean, willRetry: boolean, attempt?: number, delayMs?: number}) => void} [options.onError]
 * @param {object|false} [options.reconnect] - `false` disables reconnect; otherwise
 *   `{ enabled, minDelayMs, maxDelayMs, factor, jitter, maxAttempts, stableAfterMs, random }`.
 *   `stableAfterMs` (default maxDelayMs) is how long a reconnected stream must
 *   stay up before the backoff starts over from minDelayMs.
 * @param {typeof globalThis.fetch} [options.fetch] - Transport override (tests, proxies).
 * @param {string} [options.eventsUrl] - Override the events endpoint.
 * @param {string} [options.subscriptionsUrl] - Override the subscriptions endpoint.
 * @param {number} [options.openTimeoutMs=20000] - How long to wait for the config frame.
 * @param {number} [options.heartbeatTimeoutMs] - Silence watchdog; defaults to
 *   three times the heartbeat interval the server advertises.
 * @returns {LivePipeline}
 *
 * @example
 * ```js
 * import { TwitterHttpClient } from 'xactions/scrapers/twitter/http';
 * import { createLivePipeline, Topic } from 'xactions/streaming';
 *
 * const client = new TwitterHttpClient({ cookies: process.env.X_COOKIES });
 * const pipeline = createLivePipeline({
 *   client,
 *   topics: [Topic.tweetEngagement('1234567890')],
 *   onEvent: (event) => console.log(event.type, event.payload),
 *   onError: (err, info) => console.error(err.message, info),
 * });
 *
 * await pipeline.open();
 * await pipeline.subscribe(Topic.tweetEngagement('9876543210'));
 * // ... later
 * await pipeline.close();
 * ```
 */
export function createLivePipeline(options = {}) {
  return new LivePipeline(options);
}

export { LivePipeline };

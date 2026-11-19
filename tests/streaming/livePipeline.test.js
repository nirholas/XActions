// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: live pipeline transport
 *
 * Everything here is offline. The end-to-end cases run against a local
 * newline-delimited JSON server on 127.0.0.1 that speaks the same frame
 * format x.com's live_pipeline does; the timing cases drive an injected
 * transport with fake timers so no wall-clock time is spent.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createServer } from 'node:http';

import { TwitterHttpClient } from '../../src/scrapers/twitter/http/client.js';
import {
  createLivePipeline,
  computeBackoffDelay,
  normalizeFrame,
  parseTopic,
  Topic,
  LivePipelineError,
  LivePipelineAuthError,
  LIVE_EVENT_TYPES,
  LIVE_PIPELINE_EVENTS_URL,
  LIVE_PIPELINE_SUBSCRIPTIONS_URL,
} from '../../src/streaming/livePipeline.js';

const COOKIES = 'auth_token=test-auth-token; ct0=test-csrf-token';

// ---------------------------------------------------------------------------
// Local pipeline server
// ---------------------------------------------------------------------------

/**
 * A local stand-in for api.x.com/live_pipeline. It answers the event stream
 * with chunked NDJSON and the subscription endpoint with a payload frame.
 */
async function startPipelineServer({ ttlMillis = 0, heartbeatMillis = 0 } = {}) {
  const connections = [];
  const posts = [];
  const sockets = new Set();

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');

    if (req.method === 'POST') {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        posts.push({
          path: url.pathname,
          body: Buffer.concat(chunks).toString('utf8'),
          headers: req.headers,
        });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ subscriptions: { errors: [] } }));
      });
      return;
    }

    const connection = {
      path: url.pathname,
      topics: url.searchParams.get('topics'),
      headers: req.headers,
      sessionId: `session-${connections.length + 1}`,
      send(frame) {
        res.write(`${JSON.stringify(frame)}\n`);
      },
      sendRaw(text) {
        res.write(text);
      },
      drop() {
        res.end();
      },
    };
    connections.push(connection);

    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    connection.send({
      payload: {
        config: {
          session_id: connection.sessionId,
          subscription_ttl_millis: ttlMillis,
          heartbeat_millis: heartbeatMillis,
        },
      },
    });
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  return {
    connections,
    posts,
    eventsUrl: `http://127.0.0.1:${port}/live_pipeline/events`,
    subscriptionsUrl: `http://127.0.0.1:${port}/1.1/live_pipeline/update_subscriptions`,
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

/** Poll a predicate until it holds, so tests never depend on a fixed sleep. */
async function waitFor(predicate, { timeoutMs = 5_000, label = 'condition' } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await predicate();
    if (value) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

/** An injected transport whose body this test pushes frames into by hand. */
function makeInjectedConnection(status = 200) {
  const encoder = new TextEncoder();
  let controller;
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });
  return {
    response: new Response(stream, { status }),
    push(frame) {
      controller.enqueue(encoder.encode(`${JSON.stringify(frame)}\n`));
    },
    end() {
      controller.close();
    },
  };
}

let openServers = [];
let openPipelines = [];

function trackServer(server) {
  openServers.push(server);
  return server;
}

function trackPipeline(pipeline) {
  openPipelines.push(pipeline);
  return pipeline;
}

afterEach(async () => {
  vi.useRealTimers();
  for (const pipeline of openPipelines) await pipeline.close().catch(() => {});
  for (const server of openServers) await server.close().catch(() => {});
  openPipelines = [];
  openServers = [];
});

// ---------------------------------------------------------------------------
// Topics
// ---------------------------------------------------------------------------

describe('topics', () => {
  it('builds the topic strings the pipeline subscribes to', () => {
    expect(Topic.tweetEngagement('1749528513')).toBe('/tweet_engagement/1749528513');
    expect(Topic.dmUpdate('17544932482-174455537996')).toBe('/dm_update/17544932482-174455537996');
    expect(Topic.dmTyping('17544932482-174455537996')).toBe('/dm_typing/17544932482-174455537996');
  });

  it('refuses an empty id instead of building a topic that cannot match', () => {
    expect(() => Topic.tweetEngagement('')).toThrow(TypeError);
    expect(() => Topic.dmUpdate('   ')).toThrow(TypeError);
  });

  it('parses a topic back into its kind and id', () => {
    expect(parseTopic('/tweet_engagement/42')).toEqual({ kind: 'tweet_engagement', id: '42' });
    expect(parseTopic('/dm_typing/1-2')).toEqual({ kind: 'dm_typing', id: '1-2' });
    expect(parseTopic('nonsense')).toEqual({ kind: null, id: null });
  });

  it('points at x.com by default', () => {
    expect(LIVE_PIPELINE_EVENTS_URL).toBe('https://api.x.com/live_pipeline/events');
    expect(LIVE_PIPELINE_SUBSCRIPTIONS_URL).toBe(
      'https://api.x.com/1.1/live_pipeline/update_subscriptions'
    );
  });
});

// ---------------------------------------------------------------------------
// Frame parsing
// ---------------------------------------------------------------------------

describe('normalizeFrame', () => {
  it('turns a session config frame into a config event', () => {
    const [event] = normalizeFrame({
      payload: {
        config: { session_id: 'abc', subscription_ttl_millis: '300000', heartbeat_millis: 5000 },
      },
    });

    expect(event.type).toBe('config');
    expect(event.payload).toEqual({
      kind: 'session',
      sessionId: 'abc',
      subscriptionTtlMillis: 300000,
      heartbeatMillis: 5000,
    });
    expect(typeof event.receivedAt).toBe('string');
    expect(event.raw.payload.config.session_id).toBe('abc');
  });

  it('turns a subscription acknowledgement into a config event carrying its errors', () => {
    const [event] = normalizeFrame({ payload: { subscriptions: { errors: [{ code: 1 }] } } });
    expect(event.type).toBe('config');
    expect(event.payload.kind).toBe('subscriptions');
    expect(event.payload.errors).toEqual([{ code: 1 }]);
  });

  it('turns tweet engagement into numbers and carries the tweet id from the topic', () => {
    const [event] = normalizeFrame({
      topic: '/tweet_engagement/1749528513',
      payload: {
        tweet_engagement: {
          like_count: '12',
          retweet_count: '3',
          quote_count: 1,
          reply_count: 0,
          view_count_info: { count: '4096', state: 'EnabledWithCount' },
        },
      },
    });

    expect(event.type).toBe('engagement');
    expect(event.topic).toBe('/tweet_engagement/1749528513');
    expect(event.payload).toEqual({
      tweetId: '1749528513',
      likeCount: 12,
      retweetCount: 3,
      quoteCount: 1,
      replyCount: 0,
      viewCount: 4096,
      viewCountState: 'EnabledWithCount',
    });
  });

  it('leaves an absent engagement counter null rather than guessing zero', () => {
    const [event] = normalizeFrame({
      topic: '/tweet_engagement/9',
      payload: { tweet_engagement: { like_count: '5' } },
    });
    expect(event.payload.likeCount).toBe(5);
    expect(event.payload.retweetCount).toBeNull();
    expect(event.payload.viewCount).toBeNull();
    expect(event.payload.viewCountState).toBeNull();
  });

  it('maps DM updates and typing indicators to their own types', () => {
    const [update] = normalizeFrame({
      topic: '/dm_update/1-2',
      payload: { dm_update: { conversation_id: '1-2', user_id: '99' } },
    });
    expect(update.type).toBe('dm');
    expect(update.payload).toEqual({ conversationId: '1-2', userId: '99' });

    const [typing] = normalizeFrame({
      topic: '/dm_typing/1-2',
      payload: { dm_typing: { conversation_id: '1-2', user_id: '99' } },
    });
    expect(typing.type).toBe('typing');
    expect(typing.payload).toEqual({ conversationId: '1-2', userId: '99' });
  });

  it('emits one event per payload key when a frame carries several', () => {
    const events = normalizeFrame({
      topic: '/dm_update/1-2',
      payload: {
        dm_update: { conversation_id: '1-2', user_id: '99' },
        dm_typing: { conversation_id: '1-2', user_id: '99' },
      },
    });
    expect(events.map((e) => e.type).sort()).toEqual(['dm', 'typing']);
  });

  it('classifies an unrecognised payload key as unknown and keeps the raw frame', () => {
    const frame = { topic: '/something/1', payload: { brand_new_event: { a: 1 } } };
    const [event] = normalizeFrame(frame);
    expect(event.type).toBe('unknown');
    expect(event.payload).toEqual({ name: 'brand_new_event', data: { a: 1 } });
    expect(event.raw).toBe(frame);
  });

  it('never produces a type outside the documented set', () => {
    const samples = [
      { payload: { config: {} } },
      { payload: { subscriptions: {} } },
      { payload: { tweet_engagement: {} } },
      { payload: { dm_update: {} } },
      { payload: { dm_typing: {} } },
      { payload: { mystery: {} } },
      { payload: {} },
      { topic: '/x/1' },
      null,
    ];
    for (const sample of samples) {
      for (const event of normalizeFrame(sample)) {
        expect(LIVE_EVENT_TYPES).toContain(event.type);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Backoff
// ---------------------------------------------------------------------------

describe('computeBackoffDelay', () => {
  it('doubles each attempt and stops at the cap', () => {
    const opts = { minDelayMs: 1000, maxDelayMs: 8000, factor: 2, jitter: 0, random: () => 0.5 };
    expect(computeBackoffDelay(1, opts)).toBe(1000);
    expect(computeBackoffDelay(2, opts)).toBe(2000);
    expect(computeBackoffDelay(3, opts)).toBe(4000);
    expect(computeBackoffDelay(4, opts)).toBe(8000);
    expect(computeBackoffDelay(9, opts)).toBe(8000);
  });

  it('spreads the delay across the jitter band', () => {
    const opts = { minDelayMs: 1000, maxDelayMs: 60000, factor: 2, jitter: 0.3 };
    expect(computeBackoffDelay(1, { ...opts, random: () => 0 })).toBe(700);
    expect(computeBackoffDelay(1, { ...opts, random: () => 0.5 })).toBe(1000);
    expect(computeBackoffDelay(1, { ...opts, random: () => 1 })).toBe(1300);

    for (let i = 0; i < 50; i++) {
      const delay = computeBackoffDelay(3, opts);
      expect(delay).toBeGreaterThanOrEqual(2800);
      expect(delay).toBeLessThanOrEqual(5200);
    }
  });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('authentication', () => {
  it('refuses to open without a logged-in session, and never touches the network', async () => {
    const fetchSpy = vi.fn();
    const client = new TwitterHttpClient({ cookies: 'guest_id=v1%3A123', fetch: fetchSpy });
    const pipeline = trackPipeline(createLivePipeline({ client, topics: [Topic.tweetEngagement('1')] }));

    await expect(pipeline.open()).rejects.toBeInstanceOf(LivePipelineAuthError);
    await expect(pipeline.open()).rejects.toThrow(/logged-in session/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(pipeline.isOpen).toBe(false);
  });

  it('reports a rejected cookie jar as an auth error rather than retrying it', async () => {
    const fetchSpy = vi.fn(async () => new Response('{}', { status: 401 }));
    const client = new TwitterHttpClient({ cookies: COOKIES, fetch: fetchSpy });
    const pipeline = trackPipeline(
      createLivePipeline({ client, topics: [Topic.tweetEngagement('1')] })
    );

    await expect(pipeline.open()).rejects.toBeInstanceOf(LivePipelineAuthError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('will not change subscriptions before the session is open', async () => {
    const client = new TwitterHttpClient({ cookies: COOKIES, fetch: vi.fn() });
    const pipeline = trackPipeline(createLivePipeline({ client }));
    await expect(pipeline.subscribe(Topic.tweetEngagement('1'))).rejects.toMatchObject({
      name: 'LivePipelineError',
      code: 'not_open',
    });
  });
});

// ---------------------------------------------------------------------------
// End to end against a local server
// ---------------------------------------------------------------------------

describe('streaming against a local pipeline server', () => {
  it('opens, reports the session id, and delivers typed events', async () => {
    const server = trackServer(await startPipelineServer());
    const client = new TwitterHttpClient({ cookies: COOKIES });
    const events = [];

    const pipeline = trackPipeline(
      createLivePipeline({
        client,
        topics: [Topic.tweetEngagement('1749528513')],
        eventsUrl: server.eventsUrl,
        subscriptionsUrl: server.subscriptionsUrl,
        onEvent: (event) => events.push(event),
      })
    );

    const opened = await pipeline.open();
    expect(opened.sessionId).toBe('session-1');
    expect(pipeline.isOpen).toBe(true);
    expect(server.connections[0].topics).toBe('/tweet_engagement/1749528513');
    expect(server.connections[0].headers['x-csrf-token']).toBe('test-csrf-token');
    expect(server.connections[0].headers.cookie).toContain('auth_token=test-auth-token');
    expect(server.connections[0].headers['content-type']).toBeUndefined();

    server.connections[0].send({
      topic: '/tweet_engagement/1749528513',
      payload: { tweet_engagement: { like_count: '7', retweet_count: '2' } },
    });

    await waitFor(() => events.some((e) => e.type === 'engagement'), { label: 'engagement event' });
    const engagement = events.find((e) => e.type === 'engagement');
    expect(engagement.payload.tweetId).toBe('1749528513');
    expect(engagement.payload.likeCount).toBe(7);
    expect(events[0].type).toBe('config');

    await pipeline.close();
    expect(pipeline.isOpen).toBe(false);
    expect(pipeline.state).toBe('closed');
  });

  it('keeps reading after a malformed line and reports it once', async () => {
    const server = trackServer(await startPipelineServer());
    const client = new TwitterHttpClient({ cookies: COOKIES });
    const events = [];
    const errors = [];

    const pipeline = trackPipeline(
      createLivePipeline({
        client,
        topics: [Topic.tweetEngagement('5')],
        eventsUrl: server.eventsUrl,
        onEvent: (event) => events.push(event),
        onError: (err, info) => errors.push({ err, info }),
      })
    );
    await pipeline.open();

    server.connections[0].sendRaw('not json at all\n');
    server.connections[0].sendRaw('\n');
    server.connections[0].send({
      topic: '/tweet_engagement/5',
      payload: { tweet_engagement: { like_count: '1' } },
    });

    await waitFor(() => events.some((e) => e.type === 'engagement'), { label: 'engagement event' });
    expect(errors).toHaveLength(1);
    expect(errors[0].err).toBeInstanceOf(LivePipelineError);
    expect(errors[0].err.code).toBe('parse_error');
    expect(errors[0].info.fatal).toBe(false);
    expect(pipeline.stats.malformedFrames).toBe(1);
  });

  it('posts the documented body to update_subscriptions and tracks the topic set', async () => {
    const server = trackServer(await startPipelineServer());
    const client = new TwitterHttpClient({ cookies: COOKIES });

    const pipeline = trackPipeline(
      createLivePipeline({
        client,
        topics: [Topic.tweetEngagement('111')],
        eventsUrl: server.eventsUrl,
        subscriptionsUrl: server.subscriptionsUrl,
      })
    );
    await pipeline.open();

    const added = await pipeline.subscribe([Topic.tweetEngagement('222'), Topic.tweetEngagement('222')]);
    expect(added.errors).toEqual([]);
    expect(added.topics.sort()).toEqual(['/tweet_engagement/111', '/tweet_engagement/222']);

    const removed = await pipeline.unsubscribe(Topic.tweetEngagement('111'));
    expect(removed.topics).toEqual(['/tweet_engagement/222']);

    expect(server.posts).toHaveLength(2);
    expect(server.posts[0].path).toBe('/1.1/live_pipeline/update_subscriptions');
    expect(server.posts[0].headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(server.posts[0].headers['livepipeline-session']).toBe('session-1');

    const subscribeBody = new URLSearchParams(server.posts[0].body);
    expect(subscribeBody.get('sub_topics')).toBe('/tweet_engagement/222');
    expect(subscribeBody.get('unsub_topics')).toBe('');

    const unsubscribeBody = new URLSearchParams(server.posts[1].body);
    expect(unsubscribeBody.get('sub_topics')).toBe('');
    expect(unsubscribeBody.get('unsub_topics')).toBe('/tweet_engagement/111');

    expect(await pipeline.subscribe([])).toBeNull();
    expect(server.posts).toHaveLength(2);
  });

  it('reconnects after a drop and re-subscribes every live topic', async () => {
    const server = trackServer(await startPipelineServer());
    const client = new TwitterHttpClient({ cookies: COOKIES });
    const errors = [];

    const pipeline = trackPipeline(
      createLivePipeline({
        client,
        topics: [Topic.tweetEngagement('111')],
        eventsUrl: server.eventsUrl,
        subscriptionsUrl: server.subscriptionsUrl,
        reconnect: { minDelayMs: 5, maxDelayMs: 20, jitter: 0 },
        onError: (err, info) => errors.push({ err, info }),
      })
    );

    await pipeline.open();
    await pipeline.subscribe(Topic.tweetEngagement('222'));

    server.connections[0].drop();

    await waitFor(() => server.connections.length === 2, { label: 'reconnect' });
    await waitFor(() => pipeline.sessionId === 'session-2', { label: 'new session id' });

    const resubscribed = server.connections[1].topics.split(',').sort();
    expect(resubscribed).toEqual(['/tweet_engagement/111', '/tweet_engagement/222']);
    expect(pipeline.stats.reconnects).toBe(1);
    expect(errors[0].info).toMatchObject({ willRetry: true, fatal: false, attempt: 1 });
  });
});

// ---------------------------------------------------------------------------
// Backoff timing and give-up behaviour
// ---------------------------------------------------------------------------

describe('reconnect timing', () => {
  it('waits the computed backoff before dialling again', async () => {
    vi.useFakeTimers();

    const connections = [makeInjectedConnection(), makeInjectedConnection()];
    let call = 0;
    const fetchImpl = vi.fn(async () => connections[call++].response);
    const client = new TwitterHttpClient({ cookies: COOKIES, fetch: fetchImpl });
    const errors = [];

    const pipeline = trackPipeline(
      createLivePipeline({
        client,
        topics: [Topic.tweetEngagement('1')],
        fetch: fetchImpl,
        reconnect: { minDelayMs: 1000, maxDelayMs: 30000, jitter: 0.3, random: () => 0.5 },
        onError: (err, info) => errors.push({ err, info }),
      })
    );

    const opening = pipeline.open();
    await vi.advanceTimersByTimeAsync(0);
    connections[0].push({ payload: { config: { session_id: 's1', heartbeat_millis: 0 } } });
    await opening;
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    connections[0].end();
    await vi.advanceTimersByTimeAsync(0);

    expect(errors).toHaveLength(1);
    expect(errors[0].info).toMatchObject({ willRetry: true, attempt: 1, delayMs: 1000 });

    await vi.advanceTimersByTimeAsync(999);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    connections[1].push({ payload: { config: { session_id: 's2', heartbeat_millis: 0 } } });
    await vi.advanceTimersByTimeAsync(0);
    expect(pipeline.sessionId).toBe('s2');
    expect(pipeline.stats.reconnects).toBe(1);
  });

  it('keeps backing off when each reconnect drops right after its config frame', async () => {
    vi.useFakeTimers();

    // Every connection sends its config frame and then closes at once.
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      const conn = makeInjectedConnection();
      const n = ++call;
      queueMicrotask(() => {
        conn.push({ payload: { config: { session_id: `s${n}`, heartbeat_millis: 0 } } });
        if (n > 1) conn.end();
      });
      if (n === 1) firstConn = conn;
      return conn.response;
    });
    let firstConn;
    const client = new TwitterHttpClient({ cookies: COOKIES, fetch: fetchImpl });
    const errors = [];

    const pipeline = trackPipeline(
      createLivePipeline({
        client,
        topics: [Topic.tweetEngagement('1')],
        fetch: fetchImpl,
        reconnect: { minDelayMs: 1000, maxDelayMs: 60000, jitter: 0 },
        onError: (err, info) => errors.push({ err, info }),
      })
    );

    const opening = pipeline.open();
    await vi.advanceTimersByTimeAsync(0);
    await opening;
    firstConn.end();

    // 1s + 2s + 4s + 8s of backoff: four short-lived reconnects.
    await vi.advanceTimersByTimeAsync(15_100);
    const retries = errors.filter((e) => e.info.willRetry).map((e) => e.info.delayMs);
    expect(retries.slice(0, 5)).toEqual([1000, 2000, 4000, 8000, 16000]);
    // Not ~15 dials at the 1 s floor.
    expect(fetchImpl.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it('starts the backoff over once a reconnected stream has stayed up', async () => {
    vi.useFakeTimers();

    const conns = [];
    const fetchImpl = vi.fn(async () => {
      const conn = makeInjectedConnection();
      conns.push(conn);
      queueMicrotask(() => conn.push({ payload: { config: { session_id: `s${conns.length}`, heartbeat_millis: 0 } } }));
      return conn.response;
    });
    const client = new TwitterHttpClient({ cookies: COOKIES, fetch: fetchImpl });
    const errors = [];

    const pipeline = trackPipeline(
      createLivePipeline({
        client,
        topics: [Topic.tweetEngagement('1')],
        fetch: fetchImpl,
        reconnect: { minDelayMs: 1000, maxDelayMs: 5000, jitter: 0 },
        onError: (err, info) => errors.push({ err, info }),
      })
    );

    const opening = pipeline.open();
    await vi.advanceTimersByTimeAsync(0);
    await opening;

    conns[0].end();
    await vi.advanceTimersByTimeAsync(1000); // reconnect #1 after 1 s
    expect(conns).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(6000); // healthy for longer than maxDelayMs
    conns[1].end();
    await vi.advanceTimersByTimeAsync(0);

    const delays = errors.filter((e) => e.info.willRetry).map((e) => e.info.delayMs);
    expect(delays).toEqual([1000, 1000]);
  });

  it('gives up with a fatal error once the attempt budget is spent', async () => {
    vi.useFakeTimers();

    const first = makeInjectedConnection();
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      if (call++ === 0) return first.response;
      throw new Error('connect ECONNREFUSED');
    });
    const client = new TwitterHttpClient({ cookies: COOKIES, fetch: fetchImpl });
    const errors = [];

    const pipeline = trackPipeline(
      createLivePipeline({
        client,
        topics: [Topic.tweetEngagement('1')],
        fetch: fetchImpl,
        reconnect: { minDelayMs: 100, maxDelayMs: 100, jitter: 0, maxAttempts: 2 },
        onError: (err, info) => errors.push({ err, info }),
      })
    );

    const opening = pipeline.open();
    await vi.advanceTimersByTimeAsync(0);
    first.push({ payload: { config: { session_id: 's1', heartbeat_millis: 0 } } });
    await opening;

    first.end();
    await vi.advanceTimersByTimeAsync(1000);

    const fatal = errors.filter((e) => e.info.fatal);
    expect(fatal).toHaveLength(1);
    expect(fatal[0].err.code).toBe('reconnect_exhausted');
    expect(pipeline.state).toBe('closed');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('does not reconnect when reconnect is disabled', async () => {
    vi.useFakeTimers();

    const first = makeInjectedConnection();
    const fetchImpl = vi.fn(async () => first.response);
    const client = new TwitterHttpClient({ cookies: COOKIES, fetch: fetchImpl });
    const errors = [];

    const pipeline = trackPipeline(
      createLivePipeline({
        client,
        topics: [Topic.tweetEngagement('1')],
        fetch: fetchImpl,
        reconnect: false,
        onError: (err, info) => errors.push({ err, info }),
      })
    );

    const opening = pipeline.open();
    await vi.advanceTimersByTimeAsync(0);
    first.push({ payload: { config: { session_id: 's1', heartbeat_millis: 0 } } });
    await opening;

    first.end();
    await vi.advanceTimersByTimeAsync(5000);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(errors.at(-1).info.fatal).toBe(true);
    expect(pipeline.state).toBe('closed');
  });
});

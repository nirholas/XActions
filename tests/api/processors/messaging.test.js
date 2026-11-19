// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests for the messaging processors (api/services/processors/messaging.processors.js):
 * DMs, snapshots, monitors and their ticks, webhooks, notifications, and the
 * automation suite.
 *
 * The real processors, HTTP client, Scraper, parsers, action caps and signed
 * webhook delivery all run. Only the boundaries are replaced: fetch answers
 * the way x.com, upload.x.com, a webhook receiver and an LLM provider do; DNS
 * answers with fixed addresses; the Redis store is the in-process
 * MemoryStore; and the queue scheduler records the ticks it is asked for.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { JobInputError, createJobContext, isPermanentFailure } from '../../../api/services/processors/context.js';
import {
  MONITOR_TICK,
  MemoryStore,
  WEBHOOK_EVENTS,
  assertPublicUrl,
  createMessaging,
  handleMonitorAction,
  sessionOwnerKey,
} from '../../../api/services/processors/messaging.processors.js';
import { verifyWebhookSignature } from '../../../src/notifications/webhook.js';

const SESSION = 'auth_token=tok; ct0=csrf';
const OWNER = sessionOwnerKey(SESSION);
const OTHER_SESSION = 'auth_token=other; ct0=csrf2';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6, 7, 8]);
const LLM_KEYS = ['OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'XAI_API_KEY', 'GROK_API_KEY'];

let home;
const savedEnv = {};

beforeAll(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-messaging-'));
  for (const key of ['XACTIONS_HOME', 'XACTIONS_ACTION_CAPS', 'XACTIONS_WEBHOOK_SECRET', ...LLM_KEYS]) savedEnv[key] = process.env[key];
  process.env.XACTIONS_HOME = home;
  delete process.env.XACTIONS_ACTION_CAPS;
  delete process.env.XACTIONS_WEBHOOK_SECRET;
  for (const key of LLM_KEYS) delete process.env[key];
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  fs.rmSync(home, { recursive: true, force: true });
});

afterEach(() => {
  delete process.env.XACTIONS_ACTION_CAPS;
  for (const key of LLM_KEYS) delete process.env[key];
  vi.unstubAllGlobals();
});

// ── x.com payload builders, shaped for the parsers the processors call ──

function rawUser(id, username, extra = {}) {
  return {
    __typename: 'User',
    rest_id: id,
    legacy: {
      screen_name: username,
      name: extra.name ?? username.toUpperCase(),
      description: extra.bio ?? '',
      followers_count: extra.followers ?? 0,
      friends_count: extra.following ?? 0,
      statuses_count: extra.tweets ?? 10,
      favourites_count: 3,
      location: '',
    },
  };
}

function rawTweet(id, text, author, extra = {}) {
  return {
    __typename: 'Tweet',
    rest_id: id,
    core: { user_results: { result: rawUser(author.rest_id, author.legacy.screen_name) } },
    legacy: {
      full_text: text,
      created_at: extra.createdAt ?? 'Mon Sep 28 12:00:00 +0000 2026',
      favorite_count: extra.likes ?? 0,
      retweet_count: extra.retweets ?? 0,
      reply_count: extra.replies ?? 0,
      quote_count: 0,
      bookmark_count: 0,
      lang: 'en',
      entities: {},
      ...(extra.replyTo ? { in_reply_to_status_id_str: extra.replyTo } : {}),
    },
    views: { count: String(extra.views ?? 100) },
  };
}

const tweetTimeline = (tweets) => ({
  instructions: [{
    type: 'TimelineAddEntries',
    entries: tweets.map((t) => ({ entryId: `tweet-${t.rest_id}`, content: { itemContent: { tweet_results: { result: t } } } })),
  }],
});

const userTimeline = (users) => ({
  instructions: [{
    type: 'TimelineAddEntries',
    entries: users.map((u) => ({ entryId: `user-${u.rest_id}`, content: { itemContent: { user_results: { result: u } } } })),
  }],
});

function response(status, body, headers = {}) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body === undefined ? '' : JSON.stringify(body));
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: (name) => headers[name.toLowerCase()] ?? null, getSetCookie: () => [] },
    json: async () => JSON.parse(buffer.toString('utf8')),
    text: async () => buffer.toString('utf8'),
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  };
}

/** A small x.com (plus webhook receiver, media host and LLM) the fetch boundary answers from. */
function createWorld() {
  const me = rawUser('100', 'me', { followers: 2, following: 1 });
  const w = {
    me,
    users: new Map([['me', me]]),
    followers: new Map(),
    following: new Map(),
    timelines: new Map(),
    tweets: new Map(),
    search: () => [],
    searches: [],
    writes: [],
    dms: [],
    dmStatus: null,
    uploads: [],
    hooks: [],
    hookStatus: 200,
    llm: null,
    llmRequests: [],
    failures: {},
    inbox: null,
    conversations: {},
    calls: [],
  };
  w.addUser = (id, username, extra) => {
    const user = rawUser(id, username, extra);
    w.users.set(username, user);
    return user;
  };
  w.addTweet = (id, text, author, extra) => {
    const tweet = rawTweet(id, text, author, extra);
    w.tweets.set(id, tweet);
    return tweet;
  };

  w.fetch = async (url, init = {}) => {
    const method = init.method || 'GET';
    w.calls.push({ url, method });
    const u = new URL(url);

    if (u.hostname === 'hooks.example.com') {
      w.hooks.push({ url, headers: init.headers, body: init.body });
      return response(w.hookStatus, {});
    }
    if (u.hostname === 'media.example.com') return response(200, PNG, { 'content-type': 'image/png', 'content-length': String(PNG.length) });
    if (u.hostname === 'openrouter.ai') {
      const body = JSON.parse(init.body);
      w.llmRequests.push({ body, headers: init.headers });
      return response(200, { model: 'test-model', choices: [{ message: { content: w.llm(body) } }] });
    }
    if (u.hostname === 'upload.x.com') {
      const params = Object.fromEntries(
        method === 'GET' ? u.searchParams : init.body instanceof FormData ? init.body.entries() : new URLSearchParams(init.body),
      );
      w.uploads.push({ ...params, headers: init.headers });
      if (params.command === 'APPEND') return response(204, undefined);
      return response(200, { media_id_string: 'm77' });
    }
    if (url.includes('/guest/activate.json')) return response(200, { guest_token: 'g1' });
    if (url.includes('/account/verify_credentials.json')) return response(200, { id_str: '100', screen_name: 'me', name: 'Me' });
    if (url.includes('/dm/new2.json')) {
      const body = JSON.parse(init.body);
      w.dms.push(body);
      if (w.dmStatus) return response(w.dmStatus, {});
      return response(200, {
        entries: [{ message: { id: `dm${w.dms.length}`, time: '1790000000000', conversation_id: body.conversation_id, message_data: { text: body.text } } }],
      });
    }
    if (url.includes('/dm/inbox_initial_state.json')) return response(w.inbox ? 200 : 401, w.inbox || {});
    const conversation = url.match(/\/dm\/conversation\/([^.]+)\.json/);
    if (conversation) return response(200, w.conversations[conversation[1]]);

    const op = u.pathname.split('/').pop();
    const variables = method === 'GET'
      ? JSON.parse(u.searchParams.get('variables') || '{}')
      : JSON.parse(init.body || '{}').variables || {};
    if (w.failures[op]) return response(w.failures[op], { errors: [{ message: 'failure' }] });

    switch (op) {
      case 'UserByScreenName': {
        const user = w.users.get(String(variables.screen_name).toLowerCase());
        return response(200, { data: user ? { user: { result: user } } : {} });
      }
      case 'UserTweets':
        return response(200, { data: { user: { result: { timeline: { timeline: tweetTimeline(w.timelines.get(variables.userId) || []) } } } } });
      case 'SearchTimeline':
        w.searches.push(variables.rawQuery);
        return response(200, { data: { search_by_raw_query: { search_timeline: { timeline: tweetTimeline(w.search(variables.rawQuery)) } } } });
      case 'Followers':
      case 'Following': {
        const list = (op === 'Followers' ? w.followers : w.following).get(variables.userId) || [];
        return response(200, { data: { user: { result: { timeline: { timeline: userTimeline(list) } } } } });
      }
      case 'TweetResultByRestId': {
        const tweet = w.tweets.get(variables.tweetId);
        return response(200, { data: tweet ? { tweetResult: { result: tweet } } : { tweetResult: {} } });
      }
      case 'CreateTweet':
        w.writes.push({ op, variables });
        return response(200, { data: { create_tweet: { tweet_results: { result: { rest_id: `new${w.writes.length}`, legacy: { full_text: variables.tweet_text } } } } } });
      case 'FavoriteTweet':
      case 'CreateRetweet':
        w.writes.push({ op, variables });
        return response(200, { data: { done: true } });
      case 'CreateScheduledTweet':
        w.writes.push({ op, variables });
        return response(200, { data: { tweet: { rest_id: `sch${w.writes.length}` } } });
      default:
        throw new Error(`unplanned request ${method} ${url}`);
    }
  };
  return w;
}

/** The processors over a world, a memory store and a recording scheduler. */
function harness() {
  const world = createWorld();
  const store = new MemoryStore();
  const scheduled = [];
  const lookup = async (host) => [{ address: host.startsWith('internal.') ? '10.0.0.5' : '93.184.216.34', family: 4 }];
  const messaging = createMessaging({
    store,
    fetch: world.fetch,
    lookup,
    scheduler: { schedule: async (tick, delayMs) => { scheduled.push({ tick, delayMs }); } },
  });

  let counter = 0;
  const run = async (type, config, { session = SESSION, key = 'sessionCookie', id } = {}) => {
    const progress = [];
    const opId = id || `op-${++counter}`;
    const ctx = createJobContext(
      { id: opId, name: type, data: { type, id: opId, sessionHash: sessionOwnerKey(session).slice(8), config: { [key]: session, ...config } }, progress: (p) => progress.push(p) },
      { fetch: world.fetch },
    );
    try {
      return await messaging.processors[type].run(ctx);
    } finally {
      await ctx.dispose();
    }
  };
  const tick = async (entry = scheduled[scheduled.length - 1]) => {
    const { tick: t } = entry;
    const ctx = createJobContext(
      { id: 'tick', name: MONITOR_TICK, data: { type: MONITOR_TICK, id: 'tick', monitorId: t.monitorId, ownerKey: t.ownerKey, generation: t.generation, config: {} } },
      { fetch: world.fetch },
    );
    return messaging.processors[MONITOR_TICK].run(ctx);
  };
  return { world, store, scheduled, messaging, run, tick };
}

/** A minimal Express response. */
function fakeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

// ── Direct messages ─────────────────────────────────────────────────────────

describe('sendDM', () => {
  it('resolves the recipient and sends through dm/new2 on the lower-first conversation id', async () => {
    const h = harness();
    h.world.addUser('42', 'alice', { name: 'Alice' });
    const result = await h.run('sendDM', { username: '@Alice', message: 'hello there' });

    expect(result).toMatchObject({ success: true, recipient: { id: '42', username: 'alice' }, messageId: 'dm1', conversationId: '42-100', messageLength: 11, media: null });
    expect(h.world.dms[0]).toMatchObject({ conversation_id: '42-100', recipient_ids: false, text: 'hello there', dm_users: false });
    expect(h.world.dms[0].request_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
    const ledger = JSON.parse(fs.readFileSync(path.join(home, 'action-ledger.json'), 'utf8'));
    expect(ledger.accounts[OWNER.toLowerCase()].dm.length).toBeGreaterThan(0);
  });

  it('uploads a mediaUrl in DM chunks and attaches it', async () => {
    const h = harness();
    h.world.addUser('42', 'alice');
    const result = await h.run('sendDM', { username: 'alice', message: 'look', mediaUrl: 'https://media.example.com/a.png' });

    expect(result.media).toEqual({ mediaId: 'm77', mediaType: 'image/png', bytes: PNG.length });
    expect(h.world.uploads.map((u) => u.command)).toEqual(['INIT', 'APPEND', 'FINALIZE']);
    expect(h.world.uploads[0]).toMatchObject({ media_type: 'image/png', media_category: 'dm_image', total_bytes: String(PNG.length) });
    expect(Buffer.from(await h.world.uploads[1].media.arrayBuffer()).equals(PNG)).toBe(true);
    expect(h.world.uploads[0].headers['x-csrf-token']).toBe('csrf');
    expect(h.world.dms[0].media_id).toBe('m77');
  });

  it('refuses media on a private address, an unknown user, and a missing message', async () => {
    const h = harness();
    h.world.addUser('42', 'alice');
    await expect(h.run('sendDM', { username: 'alice', message: 'x', mediaUrl: 'https://internal.example.com/a.png' })).rejects.toThrow(/private or local address/);
    await expect(h.run('sendDM', { username: 'ghost', message: 'x' })).rejects.toThrow(JobInputError);
    await expect(h.run('sendDM', { username: 'alice' })).rejects.toThrow('message is required');
    expect(h.world.dms).toHaveLength(0);
  });

  it('turns X refusing the conversation into a permanent input error', async () => {
    const h = harness();
    h.world.addUser('42', 'alice');
    h.world.dmStatus = 403;
    const err = await h.run('sendDM', { username: 'alice', message: 'hi' }).catch((e) => e);
    expect(err).toBeInstanceOf(JobInputError);
    expect(err.message).toMatch(/does not accept direct messages/);
    expect(isPermanentFailure(err)).toBe(true);
  });
});

describe('getDMConversations and exportDMs', () => {
  function withInbox(h) {
    h.world.inbox = {
      inbox_initial_state: {
        inbox_timelines: { trusted: { status: 'AT_END' } },
        conversations: {
          '42-100': { type: 'ONE_TO_ONE', participants: [{ user_id: '42' }, { user_id: '100' }], sort_timestamp: '1790000000000' },
        },
        entries: [],
      },
    };
    h.world.conversations['42-100'] = {
      conversation_timeline: {
        status: 'AT_END',
        entries: [
          { message: { id: '2', time: '1790000002000', message_data: { text: '=SUM(A1) "quoted"', sender_id: '42', recipient_id: '100' } } },
          { message: { id: '1', time: '1790000001000', message_data: { text: 'hi', sender_id: '100', recipient_id: '42' } } },
        ],
      },
    };
  }

  it('lists conversations through the Scraper', async () => {
    const h = harness();
    withInbox(h);
    const result = await h.run('getDMConversations', { limit: 5 });
    expect(result.count).toBe(1);
    expect(result.conversations[0]).toMatchObject({ id: '42-100', participants: ['42', '100'] });
  });

  it('exports messages as CSV with formula cells neutralised, and as JSON and text', async () => {
    const h = harness();
    withInbox(h);
    const csv = await h.run('exportDMs', { format: 'csv', limit: 10 });
    expect(csv).toMatchObject({ format: 'csv', conversationCount: 1, messageCount: 2, truncated: false });
    const lines = csv.content.split('\n');
    expect(lines[0]).toBe('conversation_id,message_id,created_at,sender_id,recipient_id,text,media_urls');
    expect(lines[1]).toContain('"\'=SUM(A1) ""quoted"""');

    const json = await h.run('exportDMs', { format: 'json', limit: 1 });
    expect(json.messages).toHaveLength(1);
    expect(json.truncated).toBe(true);

    const txt = await h.run('exportDMs', { format: 'txt' });
    expect(txt.content).toContain('== Conversation 42-100 (participants: 42, 100) ==');
    await expect(h.run('exportDMs', { format: 'xml' })).rejects.toThrow('format must be json, csv or txt');
  });

  it('fails when X rejects the inbox read', async () => {
    const h = harness();
    await expect(h.run('getDMConversations', {})).rejects.toThrow(/HTTP 401/);
  });
});

// ── Snapshots ───────────────────────────────────────────────────────────────

describe('monitorAccount / monitorFollowers / monitorFollowing', () => {
  function account(h) {
    const target = h.world.addUser('7', 'target', { followers: 2, following: 1, bio: 'first' });
    h.world.followers.set('7', [rawUser('1', 'ann'), rawUser('2', 'bob')]);
    h.world.following.set('7', [rawUser('3', 'cat')]);
    return target;
  }

  it('snapshots an account and reports what changed at the next snapshot', async () => {
    const h = harness();
    const target = account(h);
    const first = await h.run('monitorAccount', { username: 'target', includeFollowers: true, includeFollowing: true, includeStats: true });
    expect(first).toMatchObject({ isFirstSnapshot: true, changes: null, followers: { total: 2, captured: 2, complete: true } });

    target.legacy.description = 'second';
    target.legacy.followers_count = 2;
    h.world.followers.set('7', [rawUser('9', 'dan'), rawUser('1', 'ann')]);
    const second = await h.run('monitorAccount', { username: 'target', includeFollowers: true, includeFollowing: true, includeStats: true });
    expect(second.isFirstSnapshot).toBe(false);
    expect(second.previousSnapshot.id).toBe(first.snapshotId);
    expect(second.changes.profile).toEqual([{ field: 'bio', from: 'first', to: 'second' }]);
    expect(second.changes.followers.gained.map((u) => u.username)).toEqual(['dan']);
    expect(second.changes.followers.lost).toEqual([{ id: '2', username: 'bob' }]);
    expect(second.changes.following).toMatchObject({ added: [], removed: [], netChange: 0 });

    const other = await h.run('monitorAccount', { username: 'target' }, { session: OTHER_SESSION });
    expect(other.isFirstSnapshot).toBe(true);
    expect((await h.messaging.snapshots.accounts(OWNER))[0]).toMatchObject({ username: 'target', snapshotCount: 2 });
  });

  it('diffs followers, and does not claim losses from a partial capture', async () => {
    const h = harness();
    account(h);
    const baseline = await h.run('monitorFollowers', { username: 'target', compareWithPrevious: true });
    expect(baseline).toMatchObject({ isBaseline: true, total: 2, complete: true });

    h.world.followers.set('7', [rawUser('9', 'dan', { name: 'Dan' }), rawUser('1', 'ann')]);
    const diff = await h.run('monitorFollowers', { username: 'target', compareWithPrevious: true });
    expect(diff.gained).toEqual([expect.objectContaining({ id: '9', username: 'dan', name: 'Dan' })]);
    expect(diff.lost).toEqual([{ id: '2', username: 'bob' }]);
    expect(diff.lossesKnown).toBe(true);

    h.world.users.get('target').legacy.followers_count = 5000;
    const partial = await h.run('monitorFollowers', { username: 'target', limit: 1 });
    expect(partial.complete).toBe(false);
    expect(partial.lost).toEqual([]);
    expect(partial.lossesKnown).toBe(false);

    const following = await h.run('monitorFollowing', { username: 'target' });
    expect(following).toMatchObject({ list: 'following', isBaseline: true, total: 1 });
    await expect(h.run('monitorFollowers', { username: 'nobody_here' })).rejects.toThrow('does not exist');
  });
});

// ── Monitors ────────────────────────────────────────────────────────────────

describe('monitors', () => {
  it('monitorKeyword takes a baseline, keeps polling after the job, delivers signed events, and stops', async () => {
    const h = harness();
    const author = h.world.addUser('50', 'poster');
    let results = [rawTweet('1001', 'first mention of xactions', author)];
    h.world.search = () => results;

    const hook = await h.run('webhookCreate', { url: 'https://hooks.example.com/in', events: ['keyword_match'] });
    const started = await h.run('monitorKeyword', { keyword: 'xactions', interval: '30s' }, { id: 'mon-1' });

    expect(started).toMatchObject({ monitorId: 'mon-1', type: 'monitorKeyword', status: 'running', intervalMs: 60_000 });
    expect(started.adjusted).toEqual({ requestedIntervalMs: 30_000, intervalMs: 60_000 });
    expect(started.firstReading.events).toBe(1);
    expect(started.firstReading.sample[0]).toMatchObject({ type: 'keyword_match', baseline: true });
    expect(started.links.stop).toEqual({ method: 'POST', endpoint: '/api/ai/monitor/keyword', body: { action: 'stop', monitorId: 'mon-1' } });
    expect(h.scheduled).toHaveLength(1);
    expect(h.scheduled[0]).toMatchObject({ delayMs: 60_000, tick: { monitorId: 'mon-1', ownerKey: OWNER, generation: 1, seq: 1 } });
    expect(h.world.hooks).toHaveLength(0);

    results = [rawTweet('1002', 'xactions again', author), ...results];
    const polled = await h.tick();
    expect(polled).toMatchObject({ status: 'running', events: 1 });
    expect(h.scheduled).toHaveLength(2);

    expect(h.world.hooks).toHaveLength(1);
    const delivery = h.world.hooks[0];
    const payload = JSON.parse(delivery.body);
    expect(payload.events.map((e) => e.data.tweet.id)).toEqual(['1002']);
    expect(payload.events[0].data.matched).toEqual(['xactions']);
    expect(verifyWebhookSignature(delivery.body, delivery.headers, hook.secret, { toleranceSeconds: 0 }).valid).toBe(true);

    const status = await h.messaging.monitors.status(OWNER, 'mon-1');
    expect(status.stats).toMatchObject({ polls: 2, events: 2 });
    expect(status.events.map((e) => e.data.tweet.id)).toEqual(['1002', '1001']);
    expect(status.stats.lastDelivery.results[0]).toMatchObject({ status: 'delivered', httpStatus: 200, webhookId: hook.webhookId });

    const stopped = await h.messaging.monitors.stop(OWNER, 'mon-1');
    expect(stopped.status).toBe('stopped');
    expect(await h.tick()).toMatchObject({ skipped: true });
    expect((await h.store.get(`${OWNER}:monitor:mon-1`)).auth).toBeUndefined();
    expect(await h.messaging.monitors.get(sessionOwnerKey(OTHER_SESSION), 'mon-1')).toBeNull();
  });

  it('followerAlerts reports new and lost followers to the webhookUrl', async () => {
    const h = harness();
    h.world.addUser('7', 'target', { followers: 2 });
    h.world.followers.set('7', [rawUser('1', 'ann'), rawUser('2', 'bob')]);
    const started = await h.run('followerAlerts', { username: 'target', webhookUrl: 'https://hooks.example.com/alerts' });
    expect(started.firstReading.summary.followersList).toEqual({ total: 2, captured: 2, complete: true });
    expect(started.intervalMs).toBe(5 * 60_000);

    h.world.followers.set('7', [rawUser('3', 'cat'), rawUser('1', 'ann')]);
    await h.tick();
    const payload = JSON.parse(h.world.hooks[0].body);
    expect(payload.event).toBe('monitor.events');
    expect(payload.events.map((e) => [e.type, e.data.user.username])).toEqual([['new_follower', 'cat'], ['unfollower', 'bob']]);
    await expect(h.run('followerAlerts', { username: 'target', webhookUrl: 'https://internal.example.com/x' })).rejects.toThrow(/private/);
  });

  it('trackEngagement samples metrics with deltas and completes when its window ends', async () => {
    const h = harness();
    const author = h.world.addUser('50', 'poster');
    const tweet = h.world.addTweet('2001', 'a post', author, { likes: 5 });
    const started = await h.run('trackEngagement', { tweetIds: ['https://x.com/poster/status/2001'], interval: '1h', duration: '24h' });
    expect(started.params.tweetIds).toEqual(['2001']);
    expect(started.firstReading.sample[0].data).toMatchObject({ tweetId: '2001', delta: null, metrics: { likes: 5 } });

    tweet.legacy.favorite_count = 9;
    await h.tick();
    const events = await h.messaging.monitors.events(OWNER, started.monitorId, { limit: 1 });
    expect(events[0].data.delta.likes).toBe(4);

    const record = await h.store.get(`${OWNER}:monitor:${started.monitorId}`);
    await h.store.set(`${OWNER}:monitor:${started.monitorId}`, { ...record, endsAt: new Date(Date.now() - 1000).toISOString() });
    expect(await h.tick()).toMatchObject({ status: 'completed' });
    expect((await h.messaging.monitors.get(OWNER, started.monitorId)).statusReason).toBe('the tracking window ended');
    await expect(h.run('trackEngagement', { tweetIds: ['1'], interval: '1h', duration: '10m' })).rejects.toThrow('at least one interval');
  });

  it('reputationMonitor scores mentions and raises one alert on a downturn', async () => {
    const h = harness();
    const author = h.world.addUser('50', 'critic');
    h.world.search = (q) => {
      expect(q).toBe('@brand -from:brand');
      return Array.from({ length: 12 }, (_, i) => rawTweet(String(3000 + i), 'this is terrible, awful and broken, worst scam', author));
    };
    const started = await h.run('reputationMonitor', { username: 'brand', interval: '1h' });
    expect(started.firstReading.summary.sentiment.average).toBeLessThan(-0.3);
    const alerts = started.firstReading.sample.filter((e) => e.type === 'reputation_alert');
    expect(alerts).toHaveLength(1);
    expect(started.firstReading.sample.find((e) => e.type === 'mention').data.sentiment.label).toBe('negative');
  });

  it('streams stop at maxItems, and pause and resume through their own jobs', async () => {
    const h = harness();
    const author = h.world.addUser('50', 'poster');
    h.world.search = () => [rawTweet('4002', '#launch two', author), rawTweet('4001', '#launch one', author)];

    const small = await h.run('streamStart', { streamType: 'hashtag', hashtag: '#launch', intervalSeconds: 30, maxItems: 1 });
    expect(small).toMatchObject({ status: 'completed', statusReason: 'collected 1 items (maxItems)' });
    expect(small.firstReading.sample.map((e) => e.data.tweet.id)).toEqual(['4001']);
    expect(h.world.searches[0]).toBe('#launch');

    const stream = await h.run('streamStart', { streamType: 'keyword', keyword: 'launch', intervalSeconds: 45, maxItems: 100 }, { id: 'stream-1' });
    expect(stream).toMatchObject({ status: 'running', intervalMs: 45_000 });
    expect(stream.links.history).toEqual({ method: 'POST', endpoint: '/api/ai/streams/history', body: { streamId: 'stream-1' } });

    const paused = await h.run('streamPause', { streamId: 'stream-1' });
    expect(paused.status).toBe('paused');
    expect(await h.tick()).toMatchObject({ skipped: true, reason: 'the monitor is paused' });
    const resumed = await h.run('streamResume', { streamId: 'stream-1' });
    expect(resumed.status).toBe('running');
    expect(h.scheduled.at(-1)).toMatchObject({ delayMs: 1000, tick: { generation: 3 } });
    await expect(h.run('streamPause', { streamId: 'stream-1' }, { session: OTHER_SESSION })).rejects.toThrow('No stream stream-1');
    await expect(h.run('streamStart', { streamType: 'mentions' })).rejects.toThrow('username must be an X username');
  });

  it('continuousMonitor watches the session\'s own followers and following; keywordMonitor ORs keywords', async () => {
    const h = harness();
    h.world.followers.set('100', [rawUser('1', 'ann'), rawUser('2', 'bob')]);
    h.world.following.set('100', [rawUser('3', 'cat')]);
    const cm = await h.run('continuousMonitor', { intervalMs: 1000 }, { key: 'session' });
    expect(cm).toMatchObject({ params: { username: 'me', trackFollowing: true }, intervalMs: 300_000 });
    h.world.following.set('100', [rawUser('4', 'dog'), rawUser('3', 'cat')]);
    await h.tick();
    const events = await h.messaging.monitors.events(OWNER, cm.monitorId);
    expect(events.map((e) => [e.type, e.data.user.username])).toEqual([['followed', 'dog']]);

    const author = h.world.addUser('50', 'poster');
    h.world.search = () => [rawTweet('5001', 'Open Source wins', author)];
    const km = await h.run('keywordMonitor', { keywords: ['open source', 'agents'], webhookUrl: 'https://hooks.example.com/k' }, { key: 'session' });
    expect(h.world.searches.at(-1)).toBe('("open source" OR agents) -filter:retweets');
    expect(km.firstReading.sample[0].data.matched).toEqual(['open source']);
    expect(km.links.status.endpoint).toBe('/api/ai/automation/keyword-monitor');
  });

  it('backs off after an X failure and stops for good when the session is rejected', async () => {
    const h = harness();
    const author = h.world.addUser('50', 'poster');
    h.world.search = () => [rawTweet('6001', 'x', author)];
    const started = await h.run('monitorKeyword', { keyword: 'x', interval: '1m' });

    h.world.failures.SearchTimeline = 500;
    const failed = await h.tick();
    expect(failed.error).toMatch(/500/);
    expect(h.scheduled.at(-1).delayMs).toBe(120_000);

    h.world.failures.SearchTimeline = 401;
    expect(await h.tick()).toMatchObject({ status: 'failed' });
    const view = await h.messaging.monitors.get(OWNER, started.monitorId);
    expect(view.status).toBe('failed');
    expect(view.stats.consecutiveErrors).toBe(2);
  });

  it('caps running monitors per owner', async () => {
    const h = harness();
    const author = h.world.addUser('50', 'poster');
    h.world.search = () => [rawTweet('6101', 'x', author)];
    for (let i = 0; i < 25; i++) await h.run('monitorKeyword', { keyword: `k${i}` });
    await expect(h.run('monitorKeyword', { keyword: 'one more' })).rejects.toThrow(/limit is 25/);
    expect((await h.run('monitorKeyword', { keyword: 'theirs' }, { session: OTHER_SESSION })).status).toBe('running');
  });

  it('refuses to start a monitor for a caller with no identity', async () => {
    const h = harness();
    const ctx = createJobContext({ id: 'x', data: { type: 'monitorKeyword', config: { keyword: 'a' } } }, { fetch: h.world.fetch });
    await expect(h.messaging.processors.monitorKeyword.run(ctx)).rejects.toThrow(/needs an identity/);
  });
});

describe('handleMonitorAction', () => {
  it('reads, pauses and stops a monitor for the session that owns it', async () => {
    const h = harness();
    const author = h.world.addUser('50', 'poster');
    h.world.search = () => [rawTweet('7001', 'hit', author)];
    await h.run('reputationMonitor', { username: 'brand' }, { id: 'rep-1' });
    const call = async (body, session = SESSION, type = 'reputationMonitor') => {
      const res = fakeRes();
      const handled = await handleMonitorAction({ body }, res, { type, session, api: h.messaging.monitors });
      return { handled, res };
    };

    const status = await call({ action: 'status', monitorId: 'rep-1', limit: 5 });
    expect(status.res.body.data).toMatchObject({ monitorId: 'rep-1', status: 'running' });
    expect(status.res.body.data.events).toHaveLength(1);
    expect((await call({ action: 'list' })).res.body.data.count).toBe(1);
    expect((await call({ action: 'pause', monitorId: 'rep-1' })).res.body.data.status).toBe('paused');
    expect((await call({ action: 'status', monitorId: 'rep-1' }, OTHER_SESSION)).res.statusCode).toBe(404);
    expect((await call({ action: 'stop', monitorId: 'rep-1' }, SESSION, 'monitorKeyword')).res.statusCode).toBe(404);
    expect((await call({ action: 'stop' })).res.statusCode).toBe(400);
    expect((await call({ action: 'stop', monitorId: 'rep-1' })).res.body.data.status).toBe('stopped');
    expect((await call({ action: 'resume', monitorId: 'rep-1' })).res.statusCode).toBe(409);
    expect((await call({ action: 'start' })).handled).toBe(false);
  });
});

// ── Webhooks and notifications ──────────────────────────────────────────────

describe('webhooks and notifications', () => {
  it('creates, tests and deletes a signed webhook per owner', async () => {
    const h = harness();
    const created = await h.run('webhookCreate', { url: 'https://hooks.example.com/w' });
    expect(created.events).toEqual([...WEBHOOK_EVENTS]);
    expect(created.secret).toMatch(/^whsec_/);
    expect(await h.messaging.webhooks.list(OWNER)).toEqual([expect.not.objectContaining({ secret: expect.anything() })]);
    expect(await h.messaging.webhooks.list(sessionOwnerKey(OTHER_SESSION))).toEqual([]);

    const tested = await h.run('webhookTest', { webhookId: created.webhookId });
    expect(tested).toMatchObject({ delivered: true, delivery: { status: 'delivered', signed: true, httpStatus: 200 } });
    const sent = h.world.hooks[0];
    expect(JSON.parse(sent.body).event).toBe('webhook.test');
    expect(verifyWebhookSignature(sent.body, sent.headers, created.secret).valid).toBe(true);

    await expect(h.run('webhookTest', { webhookId: created.webhookId }, { session: OTHER_SESSION })).rejects.toThrow('No webhook');
    await expect(h.run('webhookCreate', { url: 'https://hooks.example.com/w', events: ['dm'] })).rejects.toThrow('Unknown event(s): dm');
    await expect(h.run('webhookCreate', { url: 'http://127.0.0.1:8080/hook' })).rejects.toThrow(/private or local/);
    await expect(h.run('webhookCreate', { url: 'ftp://hooks.example.com/w' })).rejects.toThrow(/http or https/);

    expect(await h.run('webhookDelete', { webhookId: created.webhookId })).toMatchObject({ deleted: true });
    expect(await h.messaging.webhooks.list(OWNER)).toEqual([]);
  });

  it('delivers a notification to a webhook and fails without retries when it cannot', async () => {
    const h = harness();
    const ok = await h.run('sendNotification', { webhookUrl: 'https://hooks.example.com/n', event: 'deploy', data: { ok: true } });
    expect(ok).toMatchObject({ success: true, channel: 'webhook', delivery: { status: 'delivered' } });
    expect(JSON.parse(h.world.hooks[0].body)).toMatchObject({ event: 'deploy', data: { ok: true } });

    h.world.hookStatus = 500;
    const err = await h.run('sendNotification', { webhookUrl: 'https://hooks.example.com/n' }).catch((e) => e);
    expect(err.message).toMatch(/not delivered after 3 attempt/);
    expect(isPermanentFailure(err)).toBe(true);
    await expect(h.run('sendNotification', { webhookUrl: 'https://hooks.example.com/n', channel: 'email' })).rejects.toThrow('channel must be');
  });

  it('posts Slack notifications through the Notifier', async () => {
    const h = harness();
    const posted = [];
    vi.stubGlobal('fetch', async (url, init) => {
      posted.push({ url, body: JSON.parse(init.body) });
      return response(200, {});
    });
    const result = await h.run('sendNotification', { webhookUrl: 'https://hooks.example.com/slack', channel: 'slack', event: 'milestone', data: { message: '1k followers' } });
    expect(result).toMatchObject({ channel: 'slack', delivery: { status: 'sent' } });
    expect(posted[0].body.blocks[1].text.text).toBe('1k followers');
  });

  it('assertPublicUrl refuses local hosts by IP', async () => {
    await expect(assertPublicUrl('http://[::1]/x', 'url')).rejects.toThrow(/private/);
    await expect(assertPublicUrl('http://169.254.169.254/latest', 'url')).rejects.toThrow(/private/);
    await expect(assertPublicUrl('not a url', 'url')).rejects.toThrow('not a valid URL');
  });
});

// ── Automation ──────────────────────────────────────────────────────────────

describe('automation', () => {
  it('autoReply replies to matching posts once, skipping its own and handled ones', { timeout: 20_000 }, async () => {
    const h = harness();
    const alice = h.world.addUser('42', 'alice', { name: 'Alice' });
    const bob = h.world.addUser('43', 'bob', { name: 'Bob' });
    h.world.search = () => [
      rawTweet('8003', 'I love agents', alice),
      rawTweet('8002', 'agents are cool', h.world.me),
      rawTweet('8001', 'agents everywhere', bob),
    ];
    const result = await h.run('autoReply', { keywords: 'agents', replyTemplate: 'Thanks {name} (@{username}) for talking {keyword}!', limit: 5, delayMs: 0 }, { key: 'session' });
    expect(result).toMatchObject({ searched: 3, candidates: 2, attempted: 2, succeeded: 2, failed: 0 });
    expect(h.world.searches[0]).toBe('agents -from:me -filter:retweets -filter:replies');
    expect(h.world.writes.map((w) => [w.variables.reply.in_reply_to_tweet_id, w.variables.tweet_text])).toEqual([
      ['8003', 'Thanks ALICE (@alice) for talking agents!'],
      ['8001', 'Thanks BOB (@bob) for talking agents!'],
    ]);

    const again = await h.run('autoReply', { keywords: ['agents'], replyTemplate: 'x', delayMs: 0 }, { key: 'session' });
    expect(again).toMatchObject({ candidates: 0, attempted: 0 });

    const dry = await harness().run('autoReply', { keywords: ['agents'], replyTemplate: 'x', dryRun: true }, { key: 'session' });
    expect(dry.dryRun).toBe(true);
    await expect(h.run('autoReply', { keywords: [], replyTemplate: 'x' }, { key: 'session' })).rejects.toThrow('keywords is required');
  });

  it('autoRepost stops at the daily cap without reposting; quoteTweetAuto quotes with the template', async () => {
    const h = harness();
    const alice = h.world.addUser('42', 'alice');
    h.world.search = () => [rawTweet('8101', 'news', alice)];
    process.env.XACTIONS_ACTION_CAPS = JSON.stringify({ repost: 0 });
    const capped = await h.run('autoRepost', { keywords: 'news', delayMs: 0 }, { key: 'session' });
    expect(capped.attempted).toBe(0);
    expect(capped.stoppedReason).toMatch(/Daily cap reached for "repost"/);
    expect(h.world.writes).toHaveLength(0);

    const quoted = await h.run('quoteTweetAuto', { keywords: 'news', commentTemplate: 'Worth reading, @{username}', limit: 1 }, { key: 'session' });
    expect(quoted.succeeded).toBe(1);
    expect(h.world.writes[0].variables).toMatchObject({ tweet_text: 'Worth reading, @alice', attachment_url: 'https://x.com/i/web/status/8101' });
  });

  it('plugReplies plugs only the account\'s own posts above minLikes', async () => {
    const h = harness();
    const alice = h.world.addUser('42', 'alice');
    h.world.addTweet('9001', 'not mine', alice, { likes: 900 });
    h.world.timelines.set('100', [
      rawTweet('9102', 'viral', h.world.me, { likes: 150 }),
      rawTweet('9101', 'quiet', h.world.me, { likes: 3 }),
    ]);
    await expect(h.run('plugReplies', { tweetUrl: 'https://x.com/alice/status/9001', plugText: 'try it' }, { key: 'session' })).rejects.toThrow(/your own posts/);

    const result = await h.run('plugReplies', { plugText: 'Try XActions', minLikes: 100 }, { key: 'session' });
    expect(result).toMatchObject({ scanned: 2, eligible: 1, succeeded: 1 });
    expect(h.world.writes[0].variables).toMatchObject({ tweet_text: 'Try XActions', reply: { in_reply_to_tweet_id: '9102' } });
    expect(result.outcomes.find((o) => o.tweetId === '9101')).toMatchObject({ status: 'skipped' });
    const second = await h.run('plugReplies', { plugText: 'Try XActions', minLikes: 100 }, { key: 'session' });
    expect(second.outcomes.find((o) => o.tweetId === '9102').reason).toBe('already plugged');
  });

  it('engagementBooster likes round-robin within the daily budget', { timeout: 20_000 }, async () => {
    const h = harness();
    const a = h.world.addUser('42', 'alice');
    const b = h.world.addUser('43', 'bob');
    h.world.timelines.set('42', [rawTweet('9201', 'a1', a), rawTweet('9200', 'a0', a)]);
    h.world.timelines.set('43', [rawTweet('9301', 'b1', b)]);
    const result = await h.run('engagementBooster', { targetAccounts: ['alice', 'bob', 'ghost'], actionsPerDay: 2, delayMs: 0 }, { key: 'session' });
    expect(result).toMatchObject({ budget: 2, succeeded: 2 });
    expect(h.world.writes.map((w) => w.variables.tweet_id)).toEqual(['9201', '9301']);
    expect(result.outcomes.find((o) => o.author === 'ghost')).toMatchObject({ status: 'skipped', reason: 'account not found' });
    const spent = await h.run('engagementBooster', { targetAccounts: ['alice'], actionsPerDay: 2 }, { key: 'session' });
    expect(spent).toMatchObject({ budget: 0, attempted: 0 });
    expect(spent.nextActionAt).toBeTruthy();
  });

  it('welcomeFollowers records a baseline, then DMs followers who arrive after it', async () => {
    const h = harness();
    h.world.followers.set('100', [rawUser('1', 'ann')]);
    const first = await h.run('welcomeFollowers', { messageTemplate: 'Welcome {name}!' }, { key: 'session' });
    expect(first).toMatchObject({ baseline: true, followersRecorded: 1, attempted: 0 });
    expect(h.world.dms).toHaveLength(0);

    h.world.followers.set('100', [rawUser('5', 'eve', { name: 'Eve' }), rawUser('1', 'ann')]);
    const second = await h.run('welcomeFollowers', { messageTemplate: 'Welcome {name}!', delayMs: 0 }, { key: 'session' });
    expect(second).toMatchObject({ baseline: false, newFollowers: 1, succeeded: 1 });
    expect(h.world.dms[0]).toMatchObject({ conversation_id: '5-100', text: 'Welcome Eve!' });
    const third = await h.run('welcomeFollowers', { messageTemplate: 'Welcome {name}!' }, { key: 'session' });
    expect(third).toMatchObject({ newFollowers: 0, attempted: 0 });
  });

  it('customerService answers mentions with the template for their trigger', async () => {
    const h = harness();
    const alice = h.world.addUser('42', 'alice');
    h.world.search = (q) => {
      expect(q).toBe('@me -from:me');
      return [rawTweet('9401', '@me my REFUND please', alice), rawTweet('9400', '@me nice work', alice)];
    };
    const result = await h.run('customerService', {
      triggerKeywords: ['refund', 'broken'],
      responseTemplates: { refund: 'Hi @{username}, DM us your order number.' },
      delayMs: 0,
    }, { key: 'session' });
    expect(result).toMatchObject({ scanned: 2, matched: 1, succeeded: 1 });
    expect(h.world.writes[0].variables).toMatchObject({ tweet_text: 'Hi @alice, DM us your order number.', reply: { in_reply_to_tweet_id: '9401' } });
  });

  it('evergreenRecycle schedules the best old posts on X, one per slot', { timeout: 20_000 }, async () => {
    const h = harness();
    const old = 'Mon Jan 05 12:00:00 +0000 2026';
    h.world.timelines.set('100', [
      rawTweet('9503', 'Evergreen advice that still holds', h.world.me, { likes: 40, createdAt: old }),
      rawTweet('9502', 'Breaking: something today', h.world.me, { likes: 90, createdAt: old }),
      rawTweet('9501', 'Also timeless thinking', h.world.me, { likes: 20, createdAt: old }),
      // Relative to now: a fixed date here silently ages past minAge.
      rawTweet('9500', 'too new', h.world.me, { likes: 99, createdAt: new Date(Date.now() - 86_400_000).toUTCString() }),
    ]);
    const result = await h.run('evergreenRecycle', { minAge: 30, minEngagement: 10, limit: 2 }, { key: 'session' });
    expect(result).toMatchObject({ candidates: 2, succeeded: 2 });
    expect(result.outcomes.map((o) => o.tweetId)).toEqual(['9503', '9501']);
    const [first, second] = h.world.writes.map((w) => w.variables);
    expect(second.execute_at - first.execute_at).toBe(86_400);
    expect(new Date(first.execute_at * 1000).getUTCHours()).toBe(15);
    const again = await h.run('evergreenRecycle', { minAge: 30, minEngagement: 10, limit: 2 }, { key: 'session' });
    expect(again.candidates).toBe(0);
  });

  it('contentRepurpose names the missing LLM key, then repurposes through the configured provider', async () => {
    const h = harness();
    const alice = h.world.addUser('42', 'alice');
    h.world.addTweet('9601', 'Ship small, ship often.', alice);
    await expect(h.run('contentRepurpose', { tweetIds: ['9601'] }, { key: 'session' })).rejects.toThrow(/OPENROUTER_API_KEY/);

    process.env.OPENROUTER_API_KEY = 'sk-test';
    h.world.llm = () => '```json\n{"posts": ["Ship small.", "Ship often."]}\n```';
    const result = await h.run('contentRepurpose', { tweetIds: '9601, 9999', format: 'thread' }, { key: 'session' });
    expect(result).toMatchObject({ format: 'thread', model: 'test-model', count: 1 });
    expect(result.results[0].output).toEqual({ posts: ['Ship small.', 'Ship often.'], overLimit: [] });
    expect(result.results[1]).toEqual({ tweetId: '9999', error: 'post not found or unavailable' });
    expect(h.world.llmRequests[0].headers.Authorization).toBe('Bearer sk-test');
    await expect(h.run('contentRepurpose', { tweetIds: ['9601'], format: 'poem' }, { key: 'session' })).rejects.toThrow('format must be one of');
  });

  it('contentCalendar plans posts at the hours the account does best', async () => {
    const h = harness();
    process.env.OPENROUTER_API_KEY = 'sk-test';
    h.world.timelines.set('100', [
      rawTweet('9703', 'a', h.world.me, { likes: 50, createdAt: 'Mon Sep 21 18:00:00 +0000 2026' }),
      rawTweet('9702', 'b', h.world.me, { likes: 60, createdAt: 'Tue Sep 22 18:30:00 +0000 2026' }),
      rawTweet('9701', 'c', h.world.me, { likes: 1, createdAt: 'Wed Sep 23 07:00:00 +0000 2026' }),
    ]);
    h.world.llm = () => JSON.stringify([
      { day: 2, slot: 1, topic: 'tools', format: 'tip', text: 'Day two tip' },
      { day: 1, slot: 1, topic: 'intro', format: 'story', text: 'Day one story' },
    ]);
    const result = await h.run('contentCalendar', { niche: 'indie hacking', tweetsPerDay: 1, days: 2 }, { key: 'session' });
    expect(result.timing).toMatchObject({ source: 'history', hoursUtc: [18] });
    expect(result.calendar.map((c) => c.text)).toEqual(['Day one story', 'Day two tip']);
    expect(new Date(result.calendar[0].scheduledFor).getUTCHours()).toBe(18);
    expect(Date.parse(result.calendar[1].scheduledFor) - Date.parse(result.calendar[0].scheduledFor)).toBe(86_400_000);
    expect(h.world.llmRequests[0].body.messages[1].content).toContain('indie hacking');
  });
});

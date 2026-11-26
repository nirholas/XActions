// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import { describe, expect, it } from 'vitest';
import { XApiClient, XApiError, readRateLimit } from '../../src/xapi/index.js';
import { jsonResponse, recordingSleep, scriptedFetch, streamResponse } from './helpers.js';

const NOW = 1_800_000_000_000;

function client(responses, options = {}) {
  const scripted = scriptedFetch(responses);
  const { sleep, waits } = recordingSleep();
  const c = new XApiClient({ fetch: scripted.fetch, sleep, now: () => NOW, ...options });
  return { c, calls: scripted.calls, waits, remaining: scripted.remaining };
}

describe('credential choice', () => {
  it('signs user-context operations with OAuth 2.0 first, then OAuth 1.0a, then the app bearer', () => {
    const all = new XApiClient({
      bearerToken: 'B',
      oauth2: { accessToken: 'U2' },
      oauth1: { consumerKey: 'k', consumerSecret: 's', token: 't', tokenSecret: 'ts' },
    });
    expect(all.build('getUsersByUsername', { username: 'x' }).auth).toBe('oauth2');
    expect(all.build('getUsersByUsername', { username: 'x' }, { auth: 'bearer' }).auth).toBe('bearer');
    const oneA = new XApiClient({ bearerToken: 'B', oauth1: { consumerKey: 'k', consumerSecret: 's', token: 't', tokenSecret: 'ts' } });
    expect(oneA.build('getUsersByUsername', { username: 'x' }).auth).toBe('oauth1');
    expect(new XApiClient({ bearerToken: 'B' }).build('getUsersByUsername', { username: 'x' }).auth).toBe('bearer');
  });

  it('refuses an operation that needs a user when only an app bearer is set', () => {
    const app = new XApiClient({ bearerToken: 'B' });
    expect(() => app.build('getUsersMe', {})).toThrow(XApiError);
    try {
      app.build('getUsersMe', {});
    } catch (err) {
      expect(err.code).toBe('auth_required');
      expect(err.message).toMatch(/xactions xapi auth login/);
    }
  });

  it('fetches and caches an app bearer token from the API key and secret', async () => {
    const { c, calls } = client([
      jsonResponse(200, { token_type: 'bearer', access_token: 'APP' }),
      jsonResponse(200, { data: { id: '1' } }),
      jsonResponse(200, { data: { id: '2' } }),
    ], { appKeys: { apiKey: 'key', apiSecret: 'secret' } });
    await c.call('getUsersByUsername', { username: 'a' });
    await c.call('getUsersByUsername', { username: 'b' });
    expect(calls[0].url).toBe('https://api.x.com/oauth2/token');
    expect(calls[0].headers.authorization ?? calls[0].headers.Authorization).toBe(`Basic ${Buffer.from('key:secret').toString('base64')}`);
    expect(calls.filter((x) => x.url.includes('/oauth2/token'))).toHaveLength(1);
    expect(calls[2].headers.authorization).toBe('Bearer APP');
  });
});

describe('call', () => {
  it('sends the request and returns data, includes, meta and the rate limit', async () => {
    const reset = Math.floor(NOW / 1000) + 600;
    const { c, calls } = client([
      jsonResponse(200, { data: [{ id: '1' }], includes: { users: [{ id: 'u' }] }, meta: { result_count: 1 } }, {
        'x-rate-limit-limit': '450',
        'x-rate-limit-remaining': '449',
        'x-rate-limit-reset': String(reset),
      }),
    ], { bearerToken: 'B' });
    const result = await c.call('searchPostsRecent', { query: 'from:XDevelopers', max_results: 10 });
    expect(calls[0].url).toBe('https://api.x.com/2/tweets/search/recent?query=from%3AXDevelopers&max_results=10');
    expect(calls[0].headers.authorization).toBe('Bearer B');
    expect(result.data).toEqual([{ id: '1' }]);
    expect(result.includes.users[0].id).toBe('u');
    expect(result.meta.result_count).toBe(1);
    expect(result.rateLimit).toMatchObject({ limit: 450, remaining: 449, reset });
    expect(result.auth).toBe('bearer');
  });

  it('sends a JSON body for writes', async () => {
    const { c, calls } = client([jsonResponse(201, { data: { id: '9', text: 'hi' } })], { oauth2: { accessToken: 'U' } });
    const result = await c.call('createPosts', {}, { body: { text: 'hi' } });
    expect(calls[0].method).toBe('POST');
    expect(calls[0].headers['content-type']).toBe('application/json');
    expect(JSON.parse(calls[0].body)).toEqual({ text: 'hi' });
    expect(result.status).toBe(201);
  });

  it('waits out a 429 until the reset when it is close, then retries', async () => {
    const reset = Math.floor(NOW / 1000) + 30;
    const { c, waits } = client([
      jsonResponse(429, { title: 'Too Many Requests' }, { 'x-rate-limit-reset': String(reset), 'x-rate-limit-remaining': '0' }),
      jsonResponse(200, { data: { id: '1' } }),
    ], { bearerToken: 'B' });
    const result = await c.call('getUsersByUsername', { username: 'a' });
    expect(result.data.id).toBe('1');
    expect(waits[0]).toBe(31_000);
  });

  it('throws rate_limited when the reset is beyond the wait cap', async () => {
    const reset = Math.floor(NOW / 1000) + 3600;
    const { c, waits } = client([
      jsonResponse(429, { title: 'Too Many Requests' }, { 'x-rate-limit-reset': String(reset), 'x-rate-limit-remaining': '0' }),
    ], { bearerToken: 'B', maxRateLimitWaitMs: 60_000 });
    await expect(c.call('getUsersByUsername', { username: 'a' })).rejects.toMatchObject({ code: 'rate_limited', status: 429 });
    expect(waits).toEqual([]);
  });

  it('does not wait out a 429 that reports a usage cap, since the window reset will not lift it', async () => {
    const reset = Math.floor(NOW / 1000) + 30;
    const { c, waits, remaining } = client([
      jsonResponse(429, { title: 'UsageCapExceeded', detail: 'Usage cap exceeded: Monthly product cap', type: 'https://api.x.com/2/problems/usage-capped' }, { 'x-rate-limit-reset': String(reset) }),
      jsonResponse(200, { data: { id: '1' } }),
    ], { bearerToken: 'B' });
    await expect(c.call('getUsersByUsername', { username: 'a' })).rejects.toMatchObject({ code: 'usage_capped', status: 429 });
    expect(waits).toEqual([]);
    expect(remaining()).toBe(1);
  });

  it('retries 5xx and network errors with backoff', async () => {
    const { c, waits } = client([
      jsonResponse(503, { title: 'Service Unavailable' }),
      new TypeError('fetch failed'),
      jsonResponse(200, { data: { id: '1' } }),
    ], { bearerToken: 'B' });
    expect((await c.call('getUsersByUsername', { username: 'a' })).data.id).toBe('1');
    expect(waits).toEqual([1000, 2000]);
  });

  it('turns an API problem into an XApiError with its title and detail', async () => {
    const { c } = client([jsonResponse(404, { title: 'Not Found Error', detail: 'Could not find user', type: 'https://api.x.com/2/problems/resource-not-found' })], { bearerToken: 'B' });
    await expect(c.call('getUsersByUsername', { username: 'nobody' })).rejects.toMatchObject({
      code: 'http_error',
      status: 404,
      title: 'Not Found Error',
      detail: 'Could not find user',
    });
  });

  it('refreshes an expired OAuth 2.0 token once on 401 and reports the new token', async () => {
    const refreshed = [];
    const { c, calls } = client([
      jsonResponse(401, { title: 'Unauthorized' }),
      jsonResponse(200, { token_type: 'bearer', access_token: 'NEW', refresh_token: 'R2', expires_in: 7200, scope: 'tweet.read users.read offline.access' }),
      jsonResponse(200, { data: { id: 'me' } }),
    ], { oauth2: { accessToken: 'OLD', refreshToken: 'R1', clientId: 'cid' }, onTokenRefresh: (t) => refreshed.push(t) });
    const result = await c.call('getUsersMe', {});
    expect(result.data.id).toBe('me');
    expect(calls[1].url).toBe('https://api.x.com/2/oauth2/token');
    expect(String(calls[1].body)).toContain('grant_type=refresh_token');
    expect(String(calls[1].body)).toContain('refresh_token=R1');
    expect(calls[2].headers.authorization).toBe('Bearer NEW');
    expect(refreshed[0]).toMatchObject({ accessToken: 'NEW', refreshToken: 'R2' });
  });
});

describe('pagination', () => {
  it('follows meta.next_token with the parameter the operation uses, and stops at the limit', async () => {
    const { c, calls } = client([
      jsonResponse(200, { data: [{ id: '1' }, { id: '2' }], meta: { next_token: 'p2pageTOKEN00000' } }),
      jsonResponse(200, { data: [{ id: '3' }, { id: '4' }], meta: { next_token: 'p3pageTOKEN00000' } }),
    ], { bearerToken: 'B' });
    const result = await c.collect('getUsersFollowers', { id: '42', max_results: 2 }, { limit: 3 });
    expect(result.data.map((u) => u.id)).toEqual(['1', '2', '3']);
    expect(result.pages).toBe(2);
    expect(new URL(calls[1].url).searchParams.get('pagination_token')).toBe('p2pageTOKEN00000');
  });

  it('honours maxPages', async () => {
    const { c, remaining } = client([
      jsonResponse(200, { data: [{ id: '1' }], meta: { next_token: 'p2pageTOKEN00000' } }),
      jsonResponse(200, { data: [{ id: '2' }], meta: { next_token: 'p3pageTOKEN00000' } }),
    ], { bearerToken: 'B' });
    const pages = [];
    for await (const page of c.paginate('getUsersFollowers', { id: '42' }, { maxPages: 1 })) pages.push(page);
    expect(pages).toHaveLength(1);
    expect(remaining()).toBe(1);
  });
});

describe('streams', () => {
  it('yields each JSON line, skips keep-alives, and reconnects after a drop', async () => {
    const events = [];
    const { c, waits } = client([
      streamResponse(['{"data":{"id":"1"}}\r\n', '\r\n', '{"data":{"id":', '"2"}}\r\n']),
      streamResponse(['{"data":{"id":"3"}}\r\n']),
    ], { bearerToken: 'B' });
    const seen = [];
    for await (const m of c.stream('streamPostsSample', {}, { onEvent: (e) => events.push(e.type) })) {
      seen.push(m.data.id);
      if (seen.length === 3) break;
    }
    expect(seen).toEqual(['1', '2', '3']);
    expect(events).toContain('reconnecting');
    expect(waits[0]).toBe(250);
  });

  it('gives up after maxReconnects and backs off exponentially on HTTP errors', async () => {
    const { c, waits } = client([
      jsonResponse(503, { title: 'Service Unavailable' }),
      jsonResponse(503, { title: 'Service Unavailable' }),
    ], { bearerToken: 'B' });
    const run = async () => {
      for await (const _ of c.stream('streamPostsSample', {}, { maxReconnects: 1 })) { /* drain */ }
    };
    await expect(run()).rejects.toMatchObject({ code: 'stream_error' });
    expect(waits).toEqual([5000]);
  });

  it('does not retry a stream the credentials cannot open', async () => {
    const { c } = client([jsonResponse(403, { title: 'Forbidden', detail: 'client-not-enrolled' })], { bearerToken: 'B' });
    const run = async () => {
      for await (const _ of c.stream('streamPostsSample', {})) { /* drain */ }
    };
    await expect(run()).rejects.toMatchObject({ code: 'auth_required', status: 403 });
  });
});

describe('media upload', () => {
  it('initializes, appends in chunks, finalizes, and polls processing', async () => {
    const { c, calls, waits } = client([
      jsonResponse(200, { data: { id: '1880028106020515840', media_key: '7_1880028106020515840' } }),
      jsonResponse(200, {}),
      jsonResponse(200, {}),
      jsonResponse(200, { data: { id: '1880028106020515840', media_key: '7_1880028106020515840', processing_info: { state: 'pending', check_after_secs: 1 } } }),
      jsonResponse(200, { data: { id: '1880028106020515840', media_key: '7_1880028106020515840', processing_info: { state: 'succeeded' } } }),
    ], { oauth2: { accessToken: 'U' } });
    const result = await c.uploadMedia(new Uint8Array(10), { mediaType: 'video/mp4', mediaCategory: 'tweet_video', chunkSize: 6 });
    expect(result).toMatchObject({ mediaId: '1880028106020515840', mediaKey: '7_1880028106020515840' });
    expect(calls.map((x) => `${x.method} ${new URL(x.url).pathname}`)).toEqual([
      'POST /2/media/upload/initialize',
      'POST /2/media/upload/1880028106020515840/append',
      'POST /2/media/upload/1880028106020515840/append',
      'POST /2/media/upload/1880028106020515840/finalize',
      'GET /2/media/upload',
    ]);
    expect(JSON.parse(calls[0].body)).toMatchObject({ media_type: 'video/mp4', total_bytes: 10, media_category: 'tweet_video' });
    expect(calls[1].body).toBeInstanceOf(FormData);
    expect(calls[2].body.get('segment_index')).toBe('1');
    expect(waits).toEqual([1000]);
  });
});

describe('readRateLimit', () => {
  it('reads the 15 minute and 24 hour headers', () => {
    const rl = readRateLimit(new Headers({
      'x-rate-limit-limit': '100',
      'x-rate-limit-remaining': '7',
      'x-rate-limit-reset': '1800000000',
      'x-user-limit-24hour-limit': '17',
      'x-user-limit-24hour-remaining': '3',
    }));
    expect(rl).toMatchObject({ limit: 100, remaining: 7, reset: 1800000000, resetAt: new Date(1800000000 * 1000).toISOString() });
    expect(JSON.stringify(rl)).toContain('17');
  });
});

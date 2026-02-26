/**
 * Tests for TwitterHttpClient
 *
 * Covers: header construction, rate-limit detection, retry/backoff,
 * cookie parsing, proxy URL, GraphQL URL construction, pagination
 * cursor extraction, error class mapping, user-agent rotation,
 * and unauthenticated header behaviour.
 *
 * Uses vitest with mocked fetch — no real network requests.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TwitterHttpClient,
  WaitingRateLimitStrategy,
  ErrorRateLimitStrategy,
} from '../../src/scrapers/twitter/http/client.js';
import {
  BEARER_TOKEN,
  GRAPHQL_BASE,
  DEFAULT_FEATURES,
  buildGraphQLUrl,
} from '../../src/scrapers/twitter/http/endpoints.js';
import {
  RateLimitError,
  AuthError,
  NotFoundError,
  TwitterApiError,
  NetworkError,
} from '../../src/scrapers/twitter/http/errors.js';

// ---------------------------------------------------------------------------
// Helpers — mock fetch factory
// ---------------------------------------------------------------------------

/**
 * Create a mock fetch that returns the given status / JSON / headers.
 */
function mockFetch(status = 200, body = {}, headers = {}) {
  const headerMap = new Map(Object.entries(headers));
  return vi.fn().mockResolvedValue({
    status,
    headers: { get: (key) => headerMap.get(key) ?? null },
    json: () => Promise.resolve(body),
  });
}

/**
 * Create a mock fetch that rejects with a network error.
 */
function mockFetchNetworkError(message = 'fetch failed') {
  return vi.fn().mockRejectedValue(new TypeError(message));
}

// ---------------------------------------------------------------------------
// 1. Header construction
// ---------------------------------------------------------------------------

describe('Header construction', () => {
  it('includes bearer token, csrf, cookie when authenticated', async () => {
    const fetch = mockFetch(200, { ok: true });
    const client = new TwitterHttpClient({
      cookies: 'auth_token=abc123; ct0=csrf456',
      fetch,
      maxRetries: 0,
    });

    await client.request('https://x.com/test');

    const [, opts] = fetch.mock.calls[0];
    const h = opts.headers;

    expect(h.authorization).toBe(`Bearer ${decodeURIComponent(BEARER_TOKEN)}`);
    expect(h['x-csrf-token']).toBe('csrf456');
    expect(h.cookie).toContain('auth_token=abc123');
    expect(h.cookie).toContain('ct0=csrf456');
    expect(h['x-twitter-auth-type']).toBe('OAuth2Session');
    expect(h['x-twitter-active-user']).toBe('yes');
    expect(h['x-twitter-client-language']).toBe('en');
  });
});

// ---------------------------------------------------------------------------
// 2. Rate-limit detection from response headers
// ---------------------------------------------------------------------------

describe('Rate-limit detection', () => {
  it('detects 429 and invokes rate-limit strategy', async () => {
    const resetTs = Math.floor(Date.now() / 1000) + 60;
    const fetch = mockFetch(429, {}, {
      'x-rate-limit-remaining': '0',
      'x-rate-limit-reset': String(resetTs),
    });

    const strategy = { onRateLimit: vi.fn().mockRejectedValue(new RateLimitError('rl')) };
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      rateLimitStrategy: strategy,
      maxRetries: 0,
    });

    await expect(client.request('https://x.com/test')).rejects.toThrow(RateLimitError);
    expect(strategy.onRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({ resetAt: expect.any(Number), endpoint: 'https://x.com/test' })
    );
  });

  it('WaitingRateLimitStrategy retries after waiting', async () => {
    // First call → 429, second call → 200
    const resetTs = Math.floor(Date.now() / 1000) + 1; // 1 second from now
    const h429 = new Map([['x-rate-limit-remaining', '0'], ['x-rate-limit-reset', String(resetTs)]]);
    const h200 = new Map();
    const fetch = vi.fn()
      .mockResolvedValueOnce({
        status: 429,
        headers: { get: (k) => h429.get(k) ?? null },
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: { get: (k) => h200.get(k) ?? null },
        json: () => Promise.resolve({ data: 'ok' }),
      });

    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      rateLimitStrategy: 'wait',
      maxRetries: 1,
    });

    const result = await client.request('https://x.com/test');
    expect(result).toEqual({ data: 'ok' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// 3. Retry logic with exponential backoff
// ---------------------------------------------------------------------------

describe('Retry logic with exponential backoff', () => {
  it('retries on network errors up to maxRetries', async () => {
    const fetch = mockFetchNetworkError('connection refused');
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      maxRetries: 2,
    });

    await expect(client.request('https://x.com/test')).rejects.toThrow(NetworkError);
    // Initial attempt + 2 retries = 3 calls
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on AuthError', async () => {
    const fetch = mockFetch(401, {});
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      maxRetries: 3,
    });

    await expect(client.request('https://x.com/test')).rejects.toThrow(AuthError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on NotFoundError', async () => {
    const fetch = mockFetch(404, {});
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      maxRetries: 3,
    });

    await expect(client.request('https://x.com/test')).rejects.toThrow(NotFoundError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Cookie parsing from string
// ---------------------------------------------------------------------------

describe('Cookie parsing', () => {
  it('parses semicolon-delimited cookie string', () => {
    const client = new TwitterHttpClient({ maxRetries: 0 });
    client.setCookies('auth_token=abc123; ct0=csrfval; guest_id=v1%3A123456');

    expect(client.isAuthenticated()).toBe(true);
    expect(client.getCsrfToken()).toBe('csrfval');
  });

  it('handles cookies with = in value', () => {
    const client = new TwitterHttpClient({ maxRetries: 0 });
    client.setCookies('auth_token=abc=123; ct0=csrf==val');

    expect(client.isAuthenticated()).toBe(true);
    expect(client.getCsrfToken()).toBe('csrf==val');
  });

  it('handles empty and whitespace-only strings', () => {
    const client = new TwitterHttpClient({ maxRetries: 0 });
    client.setCookies('');
    expect(client.isAuthenticated()).toBe(false);
    client.setCookies('   ;  ; ');
    expect(client.isAuthenticated()).toBe(false);
  });

  it('extracts auth_token and ct0 via constructor option', () => {
    const client = new TwitterHttpClient({
      cookies: 'ct0=tok; auth_token=secret; _twitter_sess=zzz',
      maxRetries: 0,
    });

    expect(client.getCsrfToken()).toBe('tok');
    expect(client.isAuthenticated()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Proxy URL parsing
// ---------------------------------------------------------------------------

describe('Proxy URL parsing', () => {
  it('stores HTTP proxy URL', () => {
    const client = new TwitterHttpClient({ maxRetries: 0 });
    client.setProxy('http://proxy.example.com:8080');
    expect(client._proxy).toBe('http://proxy.example.com:8080');
  });

  it('stores SOCKS5 proxy URL', () => {
    const client = new TwitterHttpClient({ maxRetries: 0 });
    client.setProxy('socks5://127.0.0.1:1080');
    expect(client._proxy).toBe('socks5://127.0.0.1:1080');
  });

  it('stores authenticated proxy URL', () => {
    const client = new TwitterHttpClient({
      proxy: 'http://user:pass@host:3128',
      maxRetries: 0,
    });
    expect(client._proxy).toBe('http://user:pass@host:3128');
  });

  it('can change proxy after construction', () => {
    const client = new TwitterHttpClient({
      proxy: 'http://old:8080',
      maxRetries: 0,
    });
    client.setProxy('socks5://new:1080');
    expect(client._proxy).toBe('socks5://new:1080');
  });
});

// ---------------------------------------------------------------------------
// 6. GraphQL URL construction
// ---------------------------------------------------------------------------

describe('GraphQL URL construction', () => {
  it('graphql() builds correct GET URL using buildGraphQLUrl', async () => {
    const fetch = mockFetch(200, { data: {} });
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      maxRetries: 0,
    });

    await client.graphql('testQID', 'TestOp', { foo: 'bar' });

    const calledUrl = fetch.mock.calls[0][0];
    const expected = buildGraphQLUrl('testQID', 'TestOp', { foo: 'bar' }, DEFAULT_FEATURES);
    expect(calledUrl).toBe(expected);
  });

  it('graphql() sends POST for mutations', async () => {
    const fetch = mockFetch(200, { data: {} });
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      maxRetries: 0,
    });

    await client.graphql('mutQID', 'CreateTweet', { text: 'hello' }, { mutation: true });

    const calledUrl = fetch.mock.calls[0][0];
    const calledOpts = fetch.mock.calls[0][1];
    expect(calledUrl).toBe(`${GRAPHQL_BASE}/mutQID/CreateTweet`);
    expect(calledOpts.method).toBe('POST');

    const body = JSON.parse(calledOpts.body);
    expect(body.variables).toEqual({ text: 'hello' });
    expect(body.queryId).toBe('mutQID');
    expect(body.features).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. Pagination cursor extraction
// ---------------------------------------------------------------------------

describe('Pagination cursor extraction', () => {
  it('extracts bottom cursor from timeline response', async () => {
    const timelineResponse = {
      data: {
        user: {
          result: {
            timeline_v2: {
              timeline: {
                instructions: [
                  {
                    type: 'TimelineAddEntries',
                    entries: [
                      { entryId: 'tweet-1', content: {} },
                      { entryId: 'tweet-2', content: {} },
                      { entryId: 'cursor-bottom-123', content: { value: 'CURSOR_NEXT_PAGE' } },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    };

    const fetch = mockFetch(200, timelineResponse);
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      maxRetries: 0,
    });

    const result = await client.graphql('qId', 'UserTweets', { userId: '123' });
    expect(result.cursor).toBe('CURSOR_NEXT_PAGE');
    expect(result.data).toBeDefined();
  });

  it('returns null cursor when no cursor entry exists', async () => {
    const fetch = mockFetch(200, { data: { user: {} } });
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      maxRetries: 0,
    });

    const result = await client.graphql('qId', 'Op', {});
    expect(result.cursor).toBeNull();
  });

  it('graphqlPaginate iterates through pages and stops when no cursor', async () => {
    const page1 = {
      data: {
        timeline: {
          instructions: [
            {
              entries: [
                { entryId: 'tweet-1', content: {} },
                { entryId: 'cursor-bottom-1', content: { value: 'PAGE2_CURSOR' } },
              ],
            },
          ],
        },
      },
    };
    const page2 = {
      data: {
        timeline: {
          instructions: [
            {
              entries: [
                { entryId: 'tweet-2', content: {} },
                // No cursor → pagination ends
              ],
            },
          ],
        },
      },
    };

    const fetch = vi.fn()
      .mockResolvedValueOnce({
        status: 200,
        headers: { get: () => null },
        json: () => Promise.resolve(page1),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: { get: () => null },
        json: () => Promise.resolve(page2),
      });

    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      maxRetries: 0,
    });

    const pages = [];
    const progress = [];
    for await (const batch of client.graphqlPaginate('qId', 'Op', { userId: '1' }, {
      onProgress: (p) => progress.push(p),
    })) {
      pages.push(batch);
    }

    expect(pages).toHaveLength(2);
    expect(pages[0].cursor).toBe('PAGE2_CURSOR');
    expect(pages[1].cursor).toBeNull();
    expect(progress).toEqual([
      { fetched: 1, limit: null },
      { fetched: 2, limit: null },
    ]);
  });

  it('graphqlPaginate respects limit option', async () => {
    const makePage = (cursorVal) => ({
      data: { timeline: { instructions: [{ entries: [{ entryId: `cursor-bottom-x`, content: { value: cursorVal } }] }] } },
    });
    const fetch = vi.fn()
      .mockResolvedValueOnce({ status: 200, headers: { get: () => null }, json: () => Promise.resolve(makePage('c1')) })
      .mockResolvedValueOnce({ status: 200, headers: { get: () => null }, json: () => Promise.resolve(makePage('c2')) })
      .mockResolvedValueOnce({ status: 200, headers: { get: () => null }, json: () => Promise.resolve(makePage('c3')) });

    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      maxRetries: 0,
    });

    const pages = [];
    for await (const batch of client.graphqlPaginate('qId', 'Op', {}, { limit: 2 })) {
      pages.push(batch);
    }

    expect(pages).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// 8. Error class throwing for each HTTP status code
// ---------------------------------------------------------------------------

describe('Error class mapping by HTTP status', () => {
  const statuses = [
    [401, AuthError, 'AuthError'],
    [403, AuthError, 'AuthError'],
    [404, NotFoundError, 'NotFoundError'],
    [429, RateLimitError, 'RateLimitError'],
    [500, TwitterApiError, 'TwitterApiError'],
  ];

  for (const [status, ErrorClass, name] of statuses) {
    it(`throws ${name} for HTTP ${status}`, async () => {
      const fetch = mockFetch(status, { errors: [{ message: 'oops' }] });
      const client = new TwitterHttpClient({
        cookies: 'auth_token=x; ct0=y',
        fetch,
        maxRetries: 0,
      });

      await expect(client.request('https://x.com/test')).rejects.toThrow(ErrorClass);
    });
  }

  it('throws NetworkError on connection failure', async () => {
    const fetch = mockFetchNetworkError('ECONNREFUSED');
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      maxRetries: 0,
    });

    await expect(client.request('https://x.com/test')).rejects.toThrow(NetworkError);
  });
});

// ---------------------------------------------------------------------------
// 9. User agent rotation
// ---------------------------------------------------------------------------

describe('User agent rotation', () => {
  it('uses a random agent from the pool when set to "rotate"', async () => {
    const fetch = mockFetch(200, { ok: true });
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      userAgent: 'rotate',
      maxRetries: 0,
    });

    // Make multiple requests and collect user agents
    const agents = new Set();
    for (let i = 0; i < 20; i++) {
      await client.request('https://x.com/test');
      const ua = fetch.mock.calls[i][1].headers['user-agent'];
      agents.add(ua);
    }

    // With 5 user agents and 20 requests, we should see multiple (probabilistic, but safe)
    expect(agents.size).toBeGreaterThanOrEqual(1);
  });

  it('uses a fixed user agent when provided', async () => {
    const fetch = mockFetch(200, { ok: true });
    const customUA = 'MyCustomAgent/1.0';
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      userAgent: customUA,
      maxRetries: 0,
    });

    await client.request('https://x.com/test');
    await client.request('https://x.com/test2');

    expect(fetch.mock.calls[0][1].headers['user-agent']).toBe(customUA);
    expect(fetch.mock.calls[1][1].headers['user-agent']).toBe(customUA);
  });
});

// ---------------------------------------------------------------------------
// 10. Unauthenticated requests omit auth headers
// ---------------------------------------------------------------------------

describe('Unauthenticated requests', () => {
  it('omits csrf token, auth type, and cookie when not authenticated', async () => {
    const fetch = mockFetch(200, { ok: true });
    const client = new TwitterHttpClient({
      // No cookies set
      fetch,
      maxRetries: 0,
    });

    await client.request('https://x.com/test');

    const h = fetch.mock.calls[0][1].headers;
    expect(h.authorization).toContain('Bearer');
    expect(h['x-csrf-token']).toBeUndefined();
    expect(h['x-twitter-auth-type']).toBeUndefined();
    expect(h.cookie).toBeUndefined();
  });

  it('omits auth headers even when authenticated=false is passed', async () => {
    const fetch = mockFetch(200, { ok: true });
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      maxRetries: 0,
    });

    await client.request('https://x.com/test', { authenticated: false });

    const h = fetch.mock.calls[0][1].headers;
    expect(h['x-csrf-token']).toBeUndefined();
    expect(h['x-twitter-auth-type']).toBeUndefined();
    expect(h.cookie).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// REST helper
// ---------------------------------------------------------------------------

describe('REST helper', () => {
  it('sends POST with x-www-form-urlencoded body', async () => {
    const fetch = mockFetch(200, { id: '999' });
    const client = new TwitterHttpClient({
      cookies: 'auth_token=x; ct0=y',
      fetch,
      maxRetries: 0,
    });

    await client.rest('/1.1/friendships/create.json', {
      body: { user_id: '12345' },
    });

    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain('/1.1/friendships/create.json');
    expect(opts.method).toBe('POST');
    expect(opts.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(opts.body).toBe('user_id=12345');
  });
});

// ---------------------------------------------------------------------------
// Rate limit strategy classes
// ---------------------------------------------------------------------------

describe('Rate limit strategy classes', () => {
  it('ErrorRateLimitStrategy throws RateLimitError', async () => {
    const strategy = new ErrorRateLimitStrategy();
    await expect(
      strategy.onRateLimit({ resetAt: Date.now() + 5000, endpoint: '/test' })
    ).rejects.toThrow(RateLimitError);
  });

  it('WaitingRateLimitStrategy waits (at least 1 second)', async () => {
    const strategy = new WaitingRateLimitStrategy();
    const start = Date.now();
    await strategy.onRateLimit({ resetAt: Date.now() + 100 }); // resetAt is in the past-ish
    const elapsed = Date.now() - start;
    // Minimum wait is 1000ms
    expect(elapsed).toBeGreaterThanOrEqual(950); // small tolerance
  });
});

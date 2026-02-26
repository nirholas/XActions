/**
 * Tests for Twitter Engagement Operations via HTTP
 *
 * Uses vitest with mocked fetch — no real network requests.
 *
 * @see src/scrapers/twitter/http/engagement.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GRAPHQL, GRAPHQL_BASE, REST, REST_BASE } from '../src/scrapers/twitter/http/endpoints.js';
import { TwitterHttpClient } from '../src/scrapers/twitter/http/client.js';
import {
  likeTweet,
  unlikeTweet,
  retweet,
  unretweet,
  followUser,
  unfollowUser,
  followByUsername,
  blockUser,
  unblockUser,
  muteUser,
  unmuteUser,
  bookmarkTweet,
  unbookmarkTweet,
  pinTweet,
  unpinTweet,
  bulkUnfollow,
  bulkLike,
  bulkBlock,
} from '../src/scrapers/twitter/http/engagement.js';
import { AuthError, RateLimitError } from '../src/scrapers/twitter/http/errors.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock Response-like object. */
function mockResponse(body = {}, status = 200, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    headers: {
      get: (key) => headers[key] ?? null,
    },
  };
}

/** Create an authenticated client with a mocked fetch. */
function createClient(fetchImpl) {
  const client = new TwitterHttpClient({
    cookies: 'auth_token=tok123; ct0=csrf456',
    fetch: fetchImpl,
    maxRetries: 0, // No retries in tests for speed
  });
  return client;
}

// ===========================================================================
// 1. Like request body format
// ===========================================================================

describe('likeTweet', () => {
  it('sends a GraphQL POST mutation with correct body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ data: {} }));
    const client = createClient(fetchMock);

    await likeTweet(client, '12345');

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain(GRAPHQL_BASE);
    expect(url).toContain(GRAPHQL.FavoriteTweet.queryId);
    expect(url).toContain('FavoriteTweet');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.variables).toEqual({ tweet_id: '12345' });
  });
});

// ===========================================================================
// 2. Unlike request body format
// ===========================================================================

describe('unlikeTweet', () => {
  it('sends a GraphQL POST mutation with correct body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ data: {} }));
    const client = createClient(fetchMock);

    await unlikeTweet(client, '67890');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain(GRAPHQL.UnfavoriteTweet.queryId);
    expect(url).toContain('UnfavoriteTweet');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.variables).toEqual({ tweet_id: '67890' });
  });
});

// ===========================================================================
// 3. Follow uses REST endpoint (not GraphQL)
// ===========================================================================

describe('followUser', () => {
  it('sends a REST POST to /1.1/friendships/create.json', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ id_str: '111' }));
    const client = createClient(fetchMock);

    await followUser(client, '111');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`${REST_BASE}${REST.friendshipsCreate}`);
    expect(url).toContain('/1.1/friendships/create.json');
    expect(url).not.toContain('graphql');
    expect(opts.method).toBe('POST');
    // REST body is URL-encoded
    expect(opts.body).toContain('user_id=111');
  });

  it('unfollowUser sends POST to /1.1/friendships/destroy.json', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ id_str: '222' }));
    const client = createClient(fetchMock);

    await unfollowUser(client, '222');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/1.1/friendships/destroy.json');
  });
});

// ===========================================================================
// 4. Bulk unfollow respects delay between calls
// ===========================================================================

describe('bulkUnfollow', () => {
  it('introduces delay between unfollow calls', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ id_str: '1' }));
    const client = createClient(fetchMock);

    const start = Date.now();
    await bulkUnfollow(client, ['1', '2', '3'], { delayMs: 100 });
    const elapsed = Date.now() - start;

    // 3 users → 2 delays of ~100ms each → at least ~150ms (with jitter variance)
    expect(elapsed).toBeGreaterThanOrEqual(100);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('returns correct result shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ id_str: '1' }));
    const client = createClient(fetchMock);

    const result = await bulkUnfollow(client, ['1', '2'], { delayMs: 10 });
    expect(result).toHaveProperty('unfollowed', 2);
    expect(result).toHaveProperty('failed');
    expect(result.failed).toEqual([]);
  });
});

// ===========================================================================
// 5. Bulk unfollow progress callback
// ===========================================================================

describe('bulkUnfollow progress callback', () => {
  it('calls onProgress for each user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}));
    const client = createClient(fetchMock);
    const progressCalls = [];

    await bulkUnfollow(client, ['a', 'b', 'c'], {
      delayMs: 10,
      onProgress: (info) => progressCalls.push(info),
    });

    expect(progressCalls).toHaveLength(3);
    expect(progressCalls[0]).toMatchObject({ completed: 1, total: 3, currentId: 'a' });
    expect(progressCalls[1]).toMatchObject({ completed: 2, total: 3, currentId: 'b' });
    expect(progressCalls[2]).toMatchObject({ completed: 3, total: 3, currentId: 'c' });
  });
});

// ===========================================================================
// 6. Idempotent handling (already liked → success)
// ===========================================================================

describe('idempotent handling', () => {
  it('returns success when tweet is already favorited', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        errors: [{ message: 'You have already favorited this Tweet', code: 139 }],
      }),
    );
    const client = createClient(fetchMock);

    const result = await likeTweet(client, '999');
    expect(result).toEqual({ success: true });
  });

  it('returns success when tweet is already retweeted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        errors: [{ message: 'You have already retweeted this Tweet', code: 327 }],
      }),
    );
    const client = createClient(fetchMock);

    const result = await retweet(client, '888');
    expect(result).toEqual({ success: true });
  });
});

// ===========================================================================
// 7. Rate-limit error handling
// ===========================================================================

describe('rate-limit error handling', () => {
  it('throws RateLimitError on "To protect our users from spam" message', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        errors: [{ message: 'To protect our users from spam and other malicious activity', code: 326 }],
      }),
    );
    const client = createClient(fetchMock);

    await expect(likeTweet(client, '777')).rejects.toThrow(RateLimitError);
  });

  it('throws RateLimitError on HTTP 429', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({}, 429, { 'x-rate-limit-reset': String(Math.floor(Date.now() / 1000) + 60) }),
    );
    const client = createClient(fetchMock);

    await expect(likeTweet(client, '666')).rejects.toThrow(RateLimitError);
  });
});

// ===========================================================================
// 8. Auth check before operations
// ===========================================================================

describe('auth check', () => {
  it('throws AuthError when client is not authenticated', async () => {
    const fetchMock = vi.fn();
    const client = new TwitterHttpClient({ fetch: fetchMock, maxRetries: 0 });
    // NOT setting cookies → isAuthenticated() returns false

    await expect(likeTweet(client, '123')).rejects.toThrow(AuthError);
    await expect(followUser(client, '456')).rejects.toThrow(AuthError);
    await expect(bookmarkTweet(client, '789')).rejects.toThrow(AuthError);
    await expect(bulkUnfollow(client, ['1'])).rejects.toThrow(AuthError);

    // fetch should never have been called
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Additional coverage: remaining operations
// ===========================================================================

describe('retweet / unretweet', () => {
  it('retweet sends CreateRetweet mutation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ data: {} }));
    const client = createClient(fetchMock);
    await retweet(client, '555');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(GRAPHQL.CreateRetweet.queryId);
  });

  it('unretweet sends DeleteRetweet mutation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ data: {} }));
    const client = createClient(fetchMock);
    await unretweet(client, '555');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(GRAPHQL.DeleteRetweet.queryId);
  });
});

describe('block / unblock', () => {
  it('blockUser sends REST POST to blocks/create', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}));
    const client = createClient(fetchMock);
    await blockUser(client, '333');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/1.1/blocks/create.json');
    expect(opts.body).toContain('user_id=333');
  });

  it('unblockUser sends REST POST to blocks/destroy', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}));
    const client = createClient(fetchMock);
    await unblockUser(client, '333');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/1.1/blocks/destroy.json');
  });
});

describe('mute / unmute', () => {
  it('muteUser sends REST POST to mutes/users/create', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}));
    const client = createClient(fetchMock);
    await muteUser(client, '444');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/1.1/mutes/users/create.json');
  });

  it('unmuteUser sends REST POST to mutes/users/destroy', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}));
    const client = createClient(fetchMock);
    await unmuteUser(client, '444');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/1.1/mutes/users/destroy.json');
  });
});

describe('bookmarks', () => {
  it('bookmarkTweet sends CreateBookmark mutation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ data: {} }));
    const client = createClient(fetchMock);
    await bookmarkTweet(client, '111');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(GRAPHQL.CreateBookmark.queryId);
  });

  it('unbookmarkTweet sends DeleteBookmark mutation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ data: {} }));
    const client = createClient(fetchMock);
    await unbookmarkTweet(client, '111');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(GRAPHQL.DeleteBookmark.queryId);
  });
});

describe('pin / unpin', () => {
  it('pinTweet sends REST POST to account/pin_tweet', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}));
    const client = createClient(fetchMock);
    await pinTweet(client, '999');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('/1.1/account/pin_tweet.json');
    expect(opts.body).toContain('id=999');
  });

  it('unpinTweet sends REST POST to account/unpin_tweet', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}));
    const client = createClient(fetchMock);
    await unpinTweet(client, '999');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/1.1/account/unpin_tweet.json');
  });
});

describe('followByUsername', () => {
  it('resolves username to ID then calls follow REST endpoint', async () => {
    const fetchMock = vi.fn()
      // First call: GraphQL UserByScreenName
      .mockResolvedValueOnce(
        mockResponse({ data: { user: { result: { rest_id: '42' } } } }),
      )
      // Second call: REST friendships/create
      .mockResolvedValueOnce(mockResponse({ id_str: '42' }));

    const client = createClient(fetchMock);
    await followByUsername(client, 'nichxbt');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [firstUrl] = fetchMock.mock.calls[0];
    expect(firstUrl).toContain('UserByScreenName');

    const [secondUrl] = fetchMock.mock.calls[1];
    expect(secondUrl).toContain('/1.1/friendships/create.json');
  });
});

describe('bulkLike', () => {
  it('likes multiple tweets and returns correct result shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ data: {} }));
    const client = createClient(fetchMock);

    const result = await bulkLike(client, ['a', 'b'], { delayMs: 10 });
    expect(result).toHaveProperty('liked', 2);
    expect(result.failed).toEqual([]);
  });
});

describe('bulkBlock', () => {
  it('blocks multiple users and returns correct result shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}));
    const client = createClient(fetchMock);

    const result = await bulkBlock(client, ['x', 'y'], { delayMs: 10 });
    expect(result).toHaveProperty('blocked', 2);
    expect(result.failed).toEqual([]);
  });
});

describe('bulk dryRun', () => {
  it('does not call fetch when dryRun is true', async () => {
    const fetchMock = vi.fn();
    const client = createClient(fetchMock);

    const result = await bulkUnfollow(client, ['1', '2'], { dryRun: true, delayMs: 10 });
    expect(result.unfollowed).toBe(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

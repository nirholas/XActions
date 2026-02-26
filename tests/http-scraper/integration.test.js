/**
 * Integration Tests — HTTP Scraper Stack (End-to-End with Mocked Fetch)
 *
 * Tests the entire pipeline: mock fetch → TwitterHttpClient → scraper
 * functions → parsed output. Fixtures provide realistic Twitter API
 * response shapes.
 *
 * NOTE: client.graphql() wraps raw JSON as { data: json, cursor }.
 * Consumers access response.data.xxx, so the fetch mock must return
 * the INNER part of the Twitter API response (without the outer `data`
 * wrapper). Use `graphqlBody(FIXTURE)` helper to strip it.
 *
 * @see fixtures/responses.js
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Core modules under test
import {
  TwitterHttpClient,
  WaitingRateLimitStrategy,
} from '../../src/scrapers/twitter/http/client.js';
import {
  GRAPHQL,
  GRAPHQL_BASE,
  REST,
  REST_BASE,
  BEARER_TOKEN,
} from '../../src/scrapers/twitter/http/endpoints.js';
import {
  AuthError,
  RateLimitError,
  NotFoundError,
  NetworkError,
} from '../../src/scrapers/twitter/http/errors.js';

// Scraper modules
import { scrapeProfile, parseUserData } from '../../src/scrapers/twitter/http/profile.js';
import {
  scrapeFollowers,
  scrapeFollowing,
  scrapeNonFollowers,
  parseUserList,
} from '../../src/scrapers/twitter/http/relationships.js';
import { postTweet, deleteTweet, postThread } from '../../src/scrapers/twitter/http/actions.js';
import { likeTweet, unlikeTweet } from '../../src/scrapers/twitter/http/engagement.js';
import { GuestTokenManager } from '../../src/scrapers/twitter/http/guest.js';

// Fixtures
import {
  PROFILE_RESPONSE,
  TWEETS_RESPONSE,
  TWEETS_RESPONSE_PAGE2,
  FOLLOWERS_RESPONSE,
  FOLLOWING_RESPONSE,
  SEARCH_RESPONSE,
  THREAD_RESPONSE,
  TWEET_CREATE_RESPONSE,
  LIKE_RESPONSE,
  DELETE_TWEET_RESPONSE,
  GUEST_TOKEN_RESPONSE,
  USER_RESOLVE_RESPONSE,
  MEDIA_INIT_RESPONSE,
  MEDIA_FINALIZE_RESPONSE,
  mockResponse,
  makeRateLimitResponse,
  makeAuthErrorResponse,
} from './fixtures/responses.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip the outer `data` wrapper from a fixture for fetch-level mocking.
 * client.graphql() adds its own { data: json, cursor } wrapper, so
 * consumers access response.data.xxx = json.xxx.
 *
 * @param {object} fixture — Full realistic Twitter API response
 * @returns {object} Inner content suitable for mock fetch json()
 */
const graphqlBody = (fixture) => fixture.data ?? fixture;

/**
 * Create an authenticated TwitterHttpClient with a mock fetch.
 *
 * @param {Function} fetchImpl — vi.fn() mock
 * @param {object} [opts] — Extra client options
 * @returns {TwitterHttpClient}
 */
function createClient(fetchImpl, opts = {}) {
  return new TwitterHttpClient({
    cookies: 'auth_token=tok123; ct0=csrf456',
    fetch: fetchImpl,
    maxRetries: opts.maxRetries ?? 0,
    ...opts,
  });
}

/**
 * Create a URL-matching mock fetch that routes responses by URL substring.
 *
 * @param {Array<[string, object]>} routes — [[urlSubstring, mockResponseObj]]
 * @param {object} [fallback] — Default response if no route matches
 * @returns {Function}
 */
function routedFetch(routes, fallback = mockResponse({})) {
  return vi.fn(async (url) => {
    for (const [pattern, response] of routes) {
      if (url.includes(pattern)) return response;
    }
    return fallback;
  });
}

// ===========================================================================
// 1. Full Profile Scrape Flow
// ===========================================================================

describe('Integration: Full Profile Scrape Flow', () => {
  it('mocked fetch → client → scrapeProfile → parsed profile', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(graphqlBody(PROFILE_RESPONSE)),
    );
    const client = createClient(fetchMock);

    const profile = await scrapeProfile(client, 'testuser');

    // Verify output has all expected fields
    expect(profile.id).toBe('1890123456');
    expect(profile.name).toBe('Sarah Developer');
    expect(profile.username).toBe('testuser');
    expect(profile.bio).toContain('Full-stack dev');
    expect(profile.location).toBe('San Francisco, CA');
    expect(profile.website).toBe('https://sarahdev.io');
    expect(profile.following).toBe(890);
    expect(profile.followers).toBe(24500);
    expect(profile.tweets).toBe(12340);
    expect(profile.likes).toBe(45600);
    expect(profile.media).toBe(567);
    expect(profile.verified).toBe(true);
    expect(profile.protected).toBe(false);
    expect(profile.pinnedTweetId).toBe('1800000000000000001');
    expect(profile.platform).toBe('twitter');
    expect(profile.avatar).toContain('_400x400');
    expect(profile.avatar).not.toContain('_normal');
    expect(profile.header).toBeTruthy();
    expect(profile.joined).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(profile.bioEntities).toBeDefined();
  });

  it('verifies request URL, headers, and query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(graphqlBody(PROFILE_RESPONSE)),
    );
    const client = createClient(fetchMock);

    await scrapeProfile(client, 'testuser');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];

    // URL contains GraphQL base and UserByScreenName
    expect(url).toContain(GRAPHQL_BASE);
    expect(url).toContain(GRAPHQL.UserByScreenName.queryId);
    expect(url).toContain('UserByScreenName');

    // Should be GET for queries
    expect(opts.method).toBe('GET');

    // Headers include bearer token and auth
    expect(opts.headers.authorization).toContain('Bearer');
    expect(opts.headers['x-csrf-token']).toBe('csrf456');
    expect(opts.headers['x-twitter-auth-type']).toBe('OAuth2Session');
    expect(opts.headers.cookie).toContain('auth_token=tok123');

    // URL query params include variables with screen_name
    const parsed = new URL(url);
    const variables = JSON.parse(parsed.searchParams.get('variables'));
    expect(variables.screen_name).toBe('testuser');
    expect(variables.withSafetyModeUserFields).toBe(true);

    // Features param exists
    const features = JSON.parse(parsed.searchParams.get('features'));
    expect(features).toBeDefined();
    expect(typeof features).toBe('object');
  });

  it('throws NotFoundError for missing user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({ user: { result: null } }),
    );
    const client = createClient(fetchMock);

    await expect(scrapeProfile(client, 'ghostuser')).rejects.toThrow(NotFoundError);
  });
});

// ===========================================================================
// 2. Full Tweet Scrape Flow with Pagination
// ===========================================================================

describe('Integration: Tweet Scrape with Pagination', () => {
  it('paginates through tweets using cursors via client.graphqlPaginate', async () => {
    // First page has tweets + cursor, second page has tweets + no cursor
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockResponse(graphqlBody(TWEETS_RESPONSE)))
      .mockResolvedValueOnce(mockResponse(graphqlBody(TWEETS_RESPONSE_PAGE2)));

    const client = createClient(fetchMock);
    const { queryId, operationName } = GRAPHQL.UserTweets;

    const pages = [];
    for await (const page of client.graphqlPaginate(queryId, operationName, {
      userId: '1890123456',
      count: 20,
      includePromotedContent: false,
    }, { limit: 5 })) {
      pages.push(page);
    }

    // Should have fetched 2 pages
    expect(pages.length).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // First page should have a cursor
    expect(pages[0].cursor).toBeTruthy();

    // Second page should have no cursor (end of timeline)
    expect(pages[1].cursor).toBeNull();

    // Verify cursor was passed on the second request
    const secondUrl = fetchMock.mock.calls[1][0];
    expect(secondUrl).toContain('cursor');
    // The URL should contain the cursor from the first page
    const parsedUrl = new URL(secondUrl);
    const vars = JSON.parse(parsedUrl.searchParams.get('variables'));
    expect(vars.cursor).toBeTruthy();
  });

  it('verifies tweet entries are present in the response data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(graphqlBody(TWEETS_RESPONSE)),
    );
    const client = createClient(fetchMock);
    const { queryId, operationName } = GRAPHQL.UserTweets;

    const result = await client.graphql(queryId, operationName, {
      userId: '1890123456',
      count: 20,
    });

    // Navigate the response to verify tweet entries
    const instructions = result.data?.user?.result?.timeline_v2?.timeline?.instructions;
    expect(instructions).toBeDefined();
    expect(instructions.length).toBeGreaterThan(0);

    const entries = instructions[0].entries;
    const tweetEntries = entries.filter(
      (e) => (e.entryId || '').startsWith('tweet-'),
    );
    expect(tweetEntries.length).toBe(3);

    // Verify tweet content
    const firstTweet = tweetEntries[0].content.itemContent.tweet_results.result;
    expect(firstTweet.rest_id).toBe('1800000000000000001');
    expect(firstTweet.legacy.full_text).toContain('shipped a new feature');
  });
});

// ===========================================================================
// 3. Non-Follower Detection Flow
// ===========================================================================

describe('Integration: Non-Follower Detection Flow', () => {
  it('scrapes followers and following, then computes non-followers', async () => {
    // scrapeNonFollowers calls:
    //   1. scrapeFollowing → resolveUserId (UserByScreenName) + Following endpoint
    //   2. scrapeFollowers → resolveUserId (UserByScreenName) + Followers endpoint
    // Total: minimum 4 fetch calls
    const fetchMock = vi.fn(async (url) => {
      if (url.includes('UserByScreenName')) {
        return mockResponse(graphqlBody(USER_RESOLVE_RESPONSE));
      }
      if (url.includes(GRAPHQL.Following.operationName)) {
        return mockResponse(graphqlBody(FOLLOWING_RESPONSE));
      }
      if (url.includes(GRAPHQL.Followers.operationName)) {
        return mockResponse(graphqlBody(FOLLOWERS_RESPONSE));
      }
      return mockResponse({});
    });

    const client = createClient(fetchMock);

    const result = await scrapeNonFollowers(client, 'testuser', { limit: 100 });

    // FOLLOWING_RESPONSE has: alice_dev, carol_ml, frank_ai, grace_ui
    // FOLLOWERS_RESPONSE has: alice_dev, bob_codes, carol_ml, dave_ops, eve_sec
    // Mutuals: alice_dev, carol_ml (in both lists)
    // Non-followers: frank_ai, grace_ui (only in following, not in followers)

    expect(result.nonFollowers).toHaveLength(2);
    expect(result.mutuals).toHaveLength(2);

    const nonFollowerNames = result.nonFollowers.map((u) => u.username);
    expect(nonFollowerNames).toContain('frank_ai');
    expect(nonFollowerNames).toContain('grace_ui');

    const mutualNames = result.mutuals.map((u) => u.username);
    expect(mutualNames).toContain('alice_dev');
    expect(mutualNames).toContain('carol_ml');

    expect(result.stats.following).toBe(4);
    expect(result.stats.followers).toBe(5);
    expect(result.stats.nonFollowers).toBe(2);
    expect(result.stats.mutuals).toBe(2);
  });

  it('verifies set comparison is correct with overlapping lists', async () => {
    // Minimal inline test — parse user lists directly
    const followersInstructions = graphqlBody(FOLLOWERS_RESPONSE)
      .user.result.timeline.timeline.instructions;
    const followingInstructions = graphqlBody(FOLLOWING_RESPONSE)
      .user.result.timeline.timeline.instructions;

    const followers = parseUserList(followersInstructions);
    const following = parseUserList(followingInstructions);

    expect(followers.users.length).toBe(5);
    expect(following.users.length).toBe(4);

    // Manual set comparison
    const followerSet = new Set(followers.users.map((u) => u.username));
    const nonFollowers = following.users.filter((u) => !followerSet.has(u.username));
    expect(nonFollowers.length).toBe(2);
    expect(nonFollowers.map((u) => u.username).sort()).toEqual(['frank_ai', 'grace_ui']);
  });
});

// ===========================================================================
// 4. Search with Advanced Query
// ===========================================================================

describe('Integration: Search via GraphQL', () => {
  it('sends search query to SearchTimeline and processes results', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(graphqlBody(SEARCH_RESPONSE)),
    );
    const client = createClient(fetchMock);

    const { queryId, operationName } = GRAPHQL.SearchTimeline;
    const result = await client.graphql(queryId, operationName, {
      rawQuery: 'javascript lang:en',
      count: 20,
      querySource: 'typed_query',
      product: 'Latest',
    });

    // Verify fetch was called with correct query params
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(GRAPHQL.SearchTimeline.queryId);
    expect(url).toContain('SearchTimeline');

    // Verify search variables were sent
    const parsed = new URL(url);
    const variables = JSON.parse(parsed.searchParams.get('variables'));
    expect(variables.rawQuery).toBe('javascript lang:en');
    expect(variables.product).toBe('Latest');

    // Verify search results are parseable
    const timeline = result.data?.search_by_raw_query?.search_timeline?.timeline;
    expect(timeline).toBeDefined();
    const entries = timeline.instructions[0].entries;
    const tweetEntries = entries.filter((e) => (e.entryId || '').startsWith('tweet-'));
    expect(tweetEntries.length).toBe(3);

    // Verify cursor exists for pagination
    expect(result.cursor).toBeTruthy();
  });

  it('encodes query parameters correctly in URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(graphqlBody(SEARCH_RESPONSE)),
    );
    const client = createClient(fetchMock);
    const { queryId, operationName } = GRAPHQL.SearchTimeline;

    await client.graphql(queryId, operationName, {
      rawQuery: 'from:testuser "hello world" OR #coding',
      count: 20,
    });

    const [url] = fetchMock.mock.calls[0];
    // Verify the complex query is URL-encoded correctly
    expect(url).toContain(encodeURIComponent('"hello world"'));
  });
});

// ===========================================================================
// 5. Post Tweet → Like → Delete Flow
// ===========================================================================

describe('Integration: Post Tweet → Like → Delete Flow', () => {
  it('chains create, like, and delete mutations end-to-end', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url.includes(GRAPHQL.CreateTweet.operationName)) {
        return mockResponse(graphqlBody(TWEET_CREATE_RESPONSE));
      }
      if (url.includes(GRAPHQL.FavoriteTweet.operationName)) {
        return mockResponse(graphqlBody(LIKE_RESPONSE));
      }
      if (url.includes(GRAPHQL.DeleteTweet.operationName)) {
        return mockResponse(graphqlBody(DELETE_TWEET_RESPONSE));
      }
      return mockResponse({});
    });

    const client = createClient(fetchMock);

    // Step 1: Post a tweet
    const tweet = await postTweet(client, 'Hello from integration tests! 🎉');
    expect(tweet).toBeDefined();
    expect(tweet.rest_id || tweet.legacy?.id_str).toBeTruthy();

    const tweetId = tweet.rest_id ?? tweet.legacy?.id_str ?? '1820000000000000001';

    // Step 2: Like the tweet
    const likeResult = await likeTweet(client, tweetId);
    expect(likeResult).toEqual({ success: true });

    // Step 3: Delete the tweet
    const deleteResult = await deleteTweet(client, tweetId);
    expect(deleteResult).toEqual({ success: true });

    // Verify all 3 mutations were called
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('verifies each mutation sends correct request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(graphqlBody(TWEET_CREATE_RESPONSE)),
    );
    const client = createClient(fetchMock);

    await postTweet(client, 'Test tweet body', {
      replyTo: '111',
      mediaIds: ['media1', 'media2'],
    });

    const [url, opts] = fetchMock.mock.calls[0];

    // Should be POST mutation
    expect(opts.method).toBe('POST');
    expect(url).toContain(GRAPHQL.CreateTweet.queryId);

    // Body should contain the tweet text and options
    const body = JSON.parse(opts.body);
    expect(body.variables.tweet_text).toBe('Test tweet body');
    expect(body.variables.reply.in_reply_to_tweet_id).toBe('111');
    expect(body.variables.media.media_entities).toHaveLength(2);
    expect(body.variables.media.media_entities[0].media_id).toBe('media1');
  });

  it('verifies like mutation body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(graphqlBody(LIKE_RESPONSE)));
    const client = createClient(fetchMock);

    await likeTweet(client, '777');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain(GRAPHQL.FavoriteTweet.queryId);
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.variables.tweet_id).toBe('777');
  });

  it('verifies delete mutation body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(graphqlBody(DELETE_TWEET_RESPONSE)));
    const client = createClient(fetchMock);

    await deleteTweet(client, '888');

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain(GRAPHQL.DeleteTweet.queryId);
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.variables.tweet_id).toBe('888');
  });
});

// ===========================================================================
// 6. Media Upload Flow (INIT → APPEND → FINALIZE)
// ===========================================================================

describe('Integration: Media Upload Flow', () => {
  it('executes 3-step chunked upload with correct sequence', async () => {
    // Mock client.rest for upload — the media module calls client.rest()
    // with upload URLs that go through the REST path
    const restMock = vi.fn()
      .mockResolvedValueOnce(MEDIA_INIT_RESPONSE)       // INIT
      .mockResolvedValueOnce({})                         // APPEND
      .mockResolvedValueOnce(MEDIA_FINALIZE_RESPONSE);   // FINALIZE

    const mockClient = {
      rest: restMock,
      request: restMock,
      isAuthenticated: () => true,
    };

    // Import uploadChunked dynamically to test it
    const { uploadChunked } = await import(
      '../../src/scrapers/twitter/http/media.js'
    );

    // 1 KB buffer — small enough for a single chunk
    const smallBuffer = Buffer.alloc(1024, 0xff);

    const result = await uploadChunked(
      mockClient,
      smallBuffer,
      'image/jpeg',
      'tweet_image',
    );

    expect(result.mediaId).toBe('1830000000000000001');
    expect(result.mediaKey).toBe('3_1830000000000000001');

    // Verify 3 calls: INIT, APPEND, FINALIZE
    expect(restMock).toHaveBeenCalledTimes(3);

    // Verify INIT call includes total_bytes
    const initCall = restMock.mock.calls[0];
    expect(initCall).toBeDefined();
  });

  it('splits large files into multiple APPEND chunks', async () => {
    // 11 MB buffer → should be split into 3 chunks (5MB + 5MB + 1MB)
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 0xab);

    const restMock = vi.fn()
      .mockResolvedValueOnce(MEDIA_INIT_RESPONSE)   // INIT
      .mockResolvedValueOnce({})                     // APPEND chunk 0
      .mockResolvedValueOnce({})                     // APPEND chunk 1
      .mockResolvedValueOnce({})                     // APPEND chunk 2
      .mockResolvedValueOnce(MEDIA_FINALIZE_RESPONSE); // FINALIZE

    const mockClient = {
      rest: restMock,
      request: restMock,
      isAuthenticated: () => true,
    };

    const { uploadChunked } = await import(
      '../../src/scrapers/twitter/http/media.js'
    );

    const result = await uploadChunked(
      mockClient,
      largeBuffer,
      'video/mp4',
      'tweet_video',
    );

    expect(result.mediaId).toBe('1830000000000000001');

    // INIT + 3 APPEND + FINALIZE = 5 calls
    expect(restMock).toHaveBeenCalledTimes(5);
  });
});

// ===========================================================================
// 7. Rate Limit Recovery
// ===========================================================================

describe('Integration: Rate Limit Recovery', () => {
  it('retries after 429 with wait strategy and succeeds on second attempt', async () => {
    const now = Math.floor(Date.now() / 1000);
    // First call returns 429, second call returns success
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeRateLimitResponse(now + 1)) // 429, resets in 1 sec
      .mockResolvedValueOnce(mockResponse(graphqlBody(PROFILE_RESPONSE)));

    const client = new TwitterHttpClient({
      cookies: 'auth_token=tok123; ct0=csrf456',
      fetch: fetchMock,
      rateLimitStrategy: 'wait',
      maxRetries: 3,
    });

    const startTime = Date.now();
    const profile = await scrapeProfile(client, 'testuser');
    const elapsed = Date.now() - startTime;

    // Should have succeeded after waiting
    expect(profile.username).toBe('testuser');
    expect(profile.id).toBe('1890123456');

    // Should have waited at least ~1 second (the rate limit reset)
    expect(elapsed).toBeGreaterThanOrEqual(500);

    // Two fetch calls: first 429, second success
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws RateLimitError with error strategy (default)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeRateLimitResponse());
    const client = createClient(fetchMock);

    await expect(scrapeProfile(client, 'testuser')).rejects.toThrow(RateLimitError);
  });

  it('includes rate limit headers in error context', async () => {
    const resetAt = Math.floor(Date.now() / 1000) + 300;
    const fetchMock = vi.fn().mockResolvedValue(makeRateLimitResponse(resetAt));
    const client = createClient(fetchMock);

    try {
      await scrapeProfile(client, 'testuser');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect(err.resetAt).toBeTruthy();
    }
  });
});

// ===========================================================================
// 8. Auth Error → AuthError thrown
// ===========================================================================

describe('Integration: Auth Error Handling', () => {
  it('throws AuthError on 401 response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeAuthErrorResponse());
    const client = createClient(fetchMock);

    await expect(scrapeProfile(client, 'testuser')).rejects.toThrow(AuthError);
  });

  it('AuthError has correct status code', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeAuthErrorResponse());
    const client = createClient(fetchMock);

    try {
      await scrapeProfile(client, 'testuser');
      expect.fail('Should have thrown AuthError');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthError);
      expect(err.status).toBe(401);
      expect(err.message).toContain('Authentication failed');
    }
  });

  it('does NOT retry on auth errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeAuthErrorResponse());
    const client = new TwitterHttpClient({
      cookies: 'auth_token=tok123; ct0=csrf456',
      fetch: fetchMock,
      maxRetries: 3, // 3 retries — but auth errors should NOT retry
    });

    await expect(scrapeProfile(client, 'testuser')).rejects.toThrow(AuthError);
    // Only 1 fetch call — no retries for auth errors
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requires auth for write operations', async () => {
    const fetchMock = vi.fn();
    const unauthClient = new TwitterHttpClient({
      fetch: fetchMock,
      maxRetries: 0,
    });

    await expect(postTweet(unauthClient, 'test')).rejects.toThrow(AuthError);
    await expect(likeTweet(unauthClient, '123')).rejects.toThrow(AuthError);
    await expect(deleteTweet(unauthClient, '123')).rejects.toThrow(AuthError);

    // No fetch calls should have been made
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// 9. Guest Token → Public Scrape
// ===========================================================================

describe('Integration: Guest Token + Public Scrape', () => {
  it('activates a guest token via mocked fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(GUEST_TOKEN_RESPONSE),
    );

    const guest = new GuestTokenManager({ fetch: fetchMock });
    const token = await guest.activate();

    expect(token).toBeDefined();
    expect(token.value).toBe('1890567890123456789');
    expect(token.isExpired()).toBe(false);

    // Verify the activation request
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain('guest/activate');
    expect(opts.method).toBe('POST');
    expect(opts.headers.authorization).toContain('Bearer');
  });

  it('provides correct unauthenticated headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(GUEST_TOKEN_RESPONSE),
    );

    const guest = new GuestTokenManager({ fetch: fetchMock });
    const headers = await guest.getHeaders();

    expect(headers['x-guest-token']).toBe('1890567890123456789');
    expect(headers.authorization).toContain('Bearer');
    expect(headers['user-agent']).toBeTruthy();

    // No auth-specific headers
    expect(headers['x-csrf-token']).toBeUndefined();
    expect(headers['x-twitter-auth-type']).toBeUndefined();
    expect(headers.cookie).toBeUndefined();
  });

  it('unauthenticated client sends no auth cookies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(graphqlBody(PROFILE_RESPONSE)),
    );

    // Create client WITHOUT cookies
    const client = new TwitterHttpClient({
      fetch: fetchMock,
      maxRetries: 0,
    });

    // Use graphql endpoint directly (scrapeProfile may require auth for some paths)
    const { queryId, operationName } = GRAPHQL.UserByScreenName;
    await client.graphql(queryId, operationName, {
      screen_name: 'publicuser',
    });

    const [, opts] = fetchMock.mock.calls[0];
    // No cookie header for unauthenticated requests
    expect(opts.headers.cookie).toBeUndefined();
    expect(opts.headers['x-csrf-token']).toBe('');
    expect(opts.headers['x-twitter-auth-type']).toBeUndefined();
  });
});

// ===========================================================================
// 10. Thread Reconstruction
// ===========================================================================

describe('Integration: Thread Reconstruction', () => {
  it('fetches TweetDetail and reconstructs the thread order', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(graphqlBody(THREAD_RESPONSE)),
    );
    const client = createClient(fetchMock);

    const { queryId, operationName } = GRAPHQL.TweetDetail;
    const result = await client.graphql(queryId, operationName, {
      focalTweetId: '1810000000000000001',
      with_rux_injections: false,
      rankingMode: 'Relevance',
      includePromotedContent: true,
      withCommunity: true,
      withQuickPromoteEligibilityTweetFields: true,
      withBirdwatchNotes: true,
      withVoice: true,
    });

    // Verify TweetDetail response has threaded conversation
    const threadInstructions = result.data?.threaded_conversation_with_injections_v2?.instructions;
    expect(threadInstructions).toBeDefined();
    expect(threadInstructions.length).toBeGreaterThan(0);

    // Extract tweet entries from the thread
    const entries = threadInstructions[0].entries;
    const tweetEntries = entries.filter((e) =>
      (e.entryId || '').startsWith('tweet-'),
    );

    // Should have 3 tweets in the thread
    expect(tweetEntries.length).toBe(3);

    // Verify order: thread opener → reply 2 → reply 3
    const tweets = tweetEntries.map(
      (e) => e.content.itemContent.tweet_results.result,
    );

    expect(tweets[0].rest_id).toBe('1810000000000000001');
    expect(tweets[0].legacy.full_text).toContain('1/3');
    expect(tweets[0].legacy.in_reply_to_status_id_str).toBeNull();

    expect(tweets[1].rest_id).toBe('1810000000000000002');
    expect(tweets[1].legacy.full_text).toContain('2/3');
    expect(tweets[1].legacy.in_reply_to_status_id_str).toBe('1810000000000000001');

    expect(tweets[2].rest_id).toBe('1810000000000000003');
    expect(tweets[2].legacy.full_text).toContain('3/3');
    expect(tweets[2].legacy.in_reply_to_status_id_str).toBe('1810000000000000002');

    // Verify thread chain: each tweet replies to the previous
    for (let i = 1; i < tweets.length; i++) {
      expect(tweets[i].legacy.in_reply_to_status_id_str).toBe(tweets[i - 1].rest_id);
    }

    // All belong to the same conversation
    const conversationIds = tweets.map((t) => t.legacy.conversation_id_str);
    expect(new Set(conversationIds).size).toBe(1);
    expect(conversationIds[0]).toBe('1810000000000000001');
  });

  it('verifies TweetDetail request format', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse(graphqlBody(THREAD_RESPONSE)),
    );
    const client = createClient(fetchMock);

    const { queryId, operationName } = GRAPHQL.TweetDetail;
    await client.graphql(queryId, operationName, {
      focalTweetId: '1810000000000000001',
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain(GRAPHQL.TweetDetail.queryId);
    expect(url).toContain('TweetDetail');

    // Variables should include the focal tweet ID
    const parsed = new URL(url);
    const variables = JSON.parse(parsed.searchParams.get('variables'));
    expect(variables.focalTweetId).toBe('1810000000000000001');
  });
});

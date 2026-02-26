/**
 * Tests for Twitter HTTP Actions — postTweet, postThread, deleteTweet,
 * replyToTweet, quoteTweet, schedulePost.
 *
 * All tests use mocked client — no real network requests.
 *
 * @author nichxbt
 * @license MIT
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  postTweet,
  postThread,
  deleteTweet,
  replyToTweet,
  quoteTweet,
  schedulePost,
} from '../../src/scrapers/twitter/http/actions.js';
import { GRAPHQL, DEFAULT_FEATURES } from '../../src/scrapers/twitter/http/endpoints.js';
import { AuthError, TwitterApiError } from '../../src/scrapers/twitter/http/errors.js';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build a mock TwitterHttpClient.
 * @param {object} [overrides]
 * @param {boolean} [overrides.authenticated=true]
 * @param {object} [overrides.graphqlResult] — default result from graphql()
 * @param {object} [overrides.requestResult] — default result from request()
 * @returns {object}
 */
function createMockClient({
  authenticated = true,
  graphqlResult = null,
  requestResult = null,
} = {}) {
  const defaultTweetResult = {
    data: {
      create_tweet: {
        tweet_results: {
          result: {
            rest_id: '1234567890',
            legacy: { id_str: '1234567890', full_text: 'test tweet' },
          },
        },
      },
    },
  };

  return {
    isAuthenticated: vi.fn().mockReturnValue(authenticated),
    getCsrfToken: vi.fn().mockReturnValue('mock_csrf_token'),
    graphql: vi.fn().mockResolvedValue(graphqlResult ?? defaultTweetResult),
    request: vi.fn().mockResolvedValue(
      requestResult ?? { data: { create_scheduled_tweet: { id: 'sched_999' } } },
    ),
  };
}

// ============================================================================
// postTweet
// ============================================================================

describe('postTweet', () => {
  let client;

  beforeEach(() => {
    client = createMockClient();
  });

  it('should construct correct POST body for a simple tweet', async () => {
    await postTweet(client, 'Hello world');

    expect(client.graphql).toHaveBeenCalledOnce();

    const [queryId, operationName, variables, options] = client.graphql.mock.calls[0];
    expect(queryId).toBe(GRAPHQL.CreateTweet.queryId);
    expect(operationName).toBe('CreateTweet');
    expect(options.mutation).toBe(true);
    expect(variables).toEqual({
      tweet_text: 'Hello world',
      dark_request: false,
      media: { media_entities: [], possibly_sensitive: false },
      semantic_annotation_ids: [],
    });
  });

  it('should include reply variables when replyTo is set', async () => {
    await postTweet(client, 'reply text', { replyTo: '111' });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.reply).toEqual({
      in_reply_to_tweet_id: '111',
      exclude_reply_user_ids: [],
    });
  });

  it('should include exclude_reply_user_ids when provided', async () => {
    await postTweet(client, 'reply text', {
      replyTo: '111',
      excludeReplyUserIds: ['u1', 'u2'],
    });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.reply.exclude_reply_user_ids).toEqual(['u1', 'u2']);
  });

  it('should set attachment_url for quote tweets', async () => {
    await postTweet(client, 'my take', { quoteTweetId: '555' });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.attachment_url).toBe('https://x.com/i/web/status/555');
  });

  it('should attach media entities when mediaIds provided', async () => {
    await postTweet(client, 'pic', { mediaIds: ['m1', 'm2'] });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.media.media_entities).toEqual([
      { media_id: 'm1', tagged_users: [] },
      { media_id: 'm2', tagged_users: [] },
    ]);
  });

  it('should mark media as sensitive when requested', async () => {
    await postTweet(client, 'nsfw', { sensitive: true });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.media.possibly_sensitive).toBe(true);
  });

  it('should return parsed tweet result', async () => {
    const result = await postTweet(client, 'hello');

    expect(result.rest_id).toBe('1234567890');
    expect(result.legacy.full_text).toBe('test tweet');
  });

  it('should pass DEFAULT_FEATURES to graphql call', async () => {
    await postTweet(client, 'hello');

    const options = client.graphql.mock.calls[0][3];
    expect(options.features).toEqual(DEFAULT_FEATURES);
  });
});

// ============================================================================
// Auth checks
// ============================================================================

describe('authentication enforcement', () => {
  let unauthClient;

  beforeEach(() => {
    unauthClient = createMockClient({ authenticated: false });
  });

  it('postTweet should throw AuthError when not authenticated', async () => {
    await expect(postTweet(unauthClient, 'test')).rejects.toThrow(AuthError);
  });

  it('postThread should throw AuthError when not authenticated', async () => {
    await expect(postThread(unauthClient, [{ text: 'a' }])).rejects.toThrow(AuthError);
  });

  it('deleteTweet should throw AuthError when not authenticated', async () => {
    await expect(deleteTweet(unauthClient, '123')).rejects.toThrow(AuthError);
  });

  it('schedulePost should throw AuthError when not authenticated', async () => {
    await expect(schedulePost(unauthClient, 'test', Date.now())).rejects.toThrow(AuthError);
  });

  it('replyToTweet should throw AuthError when not authenticated', async () => {
    await expect(replyToTweet(unauthClient, '123', 'hi')).rejects.toThrow(AuthError);
  });

  it('quoteTweet should throw AuthError when not authenticated', async () => {
    await expect(quoteTweet(unauthClient, '123', 'hi')).rejects.toThrow(AuthError);
  });
});

// ============================================================================
// Tweet text validation
// ============================================================================

describe('tweet text validation', () => {
  let client;

  beforeEach(() => {
    client = createMockClient();
  });

  it('should reject empty string', async () => {
    await expect(postTweet(client, '')).rejects.toThrow(TwitterApiError);
  });

  it('should reject text exceeding 280 characters', async () => {
    const longText = 'x'.repeat(281);
    await expect(postTweet(client, longText)).rejects.toThrow(/exceeds maximum length/);
  });

  it('should allow text up to 280 characters', async () => {
    const text = 'x'.repeat(280);
    await expect(postTweet(client, text)).resolves.toBeDefined();
  });

  it('should allow up to 25000 chars with premium flag', async () => {
    const text = 'x'.repeat(1000);
    await expect(postTweet(client, text, { premium: true })).resolves.toBeDefined();
  });

  it('should reject text exceeding 25000 chars even with premium', async () => {
    const text = 'x'.repeat(25001);
    await expect(postTweet(client, text, { premium: true })).rejects.toThrow(
      /exceeds maximum length/,
    );
  });

  it('should reject non-string text', async () => {
    await expect(postTweet(client, null)).rejects.toThrow(TwitterApiError);
    await expect(postTweet(client, undefined)).rejects.toThrow(TwitterApiError);
    await expect(postTweet(client, 42)).rejects.toThrow(TwitterApiError);
  });
});

// ============================================================================
// postThread
// ============================================================================

describe('postThread', () => {
  let client;
  let callIndex;

  beforeEach(() => {
    callIndex = 0;
    client = createMockClient();

    // Each call returns a different tweet ID so we can verify chaining
    client.graphql.mockImplementation(async () => {
      const id = `tweet_${++callIndex}`;
      return {
        data: {
          create_tweet: {
            tweet_results: {
              result: {
                rest_id: id,
                legacy: { id_str: id, full_text: `text_${callIndex}` },
              },
            },
          },
        },
      };
    });
  });

  it('should post all tweets in the thread', async () => {
    const tweets = [{ text: 'First' }, { text: 'Second' }, { text: 'Third' }];
    const results = await postThread(client, tweets);

    expect(results).toHaveLength(3);
    expect(client.graphql).toHaveBeenCalledTimes(3);
  });

  it('should chain replies — each tweet replies to the previous', async () => {
    const tweets = [{ text: 'A' }, { text: 'B' }, { text: 'C' }];
    await postThread(client, tweets);

    // First tweet — no reply
    const firstVars = client.graphql.mock.calls[0][2];
    expect(firstVars.reply).toBeUndefined();

    // Second tweet — replies to tweet_1
    const secondVars = client.graphql.mock.calls[1][2];
    expect(secondVars.reply.in_reply_to_tweet_id).toBe('tweet_1');

    // Third tweet — replies to tweet_2
    const thirdVars = client.graphql.mock.calls[2][2];
    expect(thirdVars.reply.in_reply_to_tweet_id).toBe('tweet_2');
  });

  it('should pass mediaIds per tweet', async () => {
    const tweets = [
      { text: 'pic', mediaIds: ['m1'] },
      { text: 'no pic' },
    ];
    await postThread(client, tweets);

    const firstVars = client.graphql.mock.calls[0][2];
    expect(firstVars.media.media_entities).toEqual([
      { media_id: 'm1', tagged_users: [] },
    ]);

    const secondVars = client.graphql.mock.calls[1][2];
    expect(secondVars.media.media_entities).toEqual([]);
  });

  it('should return array of created tweet objects', async () => {
    const tweets = [{ text: 'A' }, { text: 'B' }];
    const results = await postThread(client, tweets);

    expect(results[0].rest_id).toBe('tweet_1');
    expect(results[1].rest_id).toBe('tweet_2');
  });

  it('should reject an empty tweets array', async () => {
    await expect(postThread(client, [])).rejects.toThrow(TwitterApiError);
  });

  it('should reject non-array input', async () => {
    await expect(postThread(client, 'not an array')).rejects.toThrow(TwitterApiError);
  });
});

// ============================================================================
// deleteTweet
// ============================================================================

describe('deleteTweet', () => {
  let client;

  beforeEach(() => {
    client = createMockClient();
  });

  it('should send correct mutation with tweet_id variable', async () => {
    await deleteTweet(client, '999');

    expect(client.graphql).toHaveBeenCalledOnce();
    const [queryId, operationName, variables, options] = client.graphql.mock.calls[0];
    expect(queryId).toBe(GRAPHQL.DeleteTweet.queryId);
    expect(operationName).toBe('DeleteTweet');
    expect(variables).toEqual({ tweet_id: '999' });
    expect(options.mutation).toBe(true);
  });

  it('should return { success: true }', async () => {
    const result = await deleteTweet(client, '999');
    expect(result).toEqual({ success: true });
  });

  it('should throw when tweetId is missing', async () => {
    await expect(deleteTweet(client, '')).rejects.toThrow(TwitterApiError);
    await expect(deleteTweet(client, null)).rejects.toThrow(TwitterApiError);
    await expect(deleteTweet(client, undefined)).rejects.toThrow(TwitterApiError);
  });
});

// ============================================================================
// replyToTweet
// ============================================================================

describe('replyToTweet', () => {
  let client;

  beforeEach(() => {
    client = createMockClient();
  });

  it('should set replyTo in variables via postTweet', async () => {
    await replyToTweet(client, '111', 'reply text');

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.reply.in_reply_to_tweet_id).toBe('111');
    expect(variables.tweet_text).toBe('reply text');
  });

  it('should forward excludeReplyUserIds', async () => {
    await replyToTweet(client, '111', 'hi', { excludeReplyUserIds: ['u1'] });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.reply.exclude_reply_user_ids).toEqual(['u1']);
  });

  it('should forward mediaIds', async () => {
    await replyToTweet(client, '111', 'hi', { mediaIds: ['m1'] });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.media.media_entities).toEqual([
      { media_id: 'm1', tagged_users: [] },
    ]);
  });
});

// ============================================================================
// quoteTweet
// ============================================================================

describe('quoteTweet', () => {
  let client;

  beforeEach(() => {
    client = createMockClient();
  });

  it('should set quoteTweetId as attachment_url', async () => {
    await quoteTweet(client, '555', 'my take');

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.attachment_url).toBe('https://x.com/i/web/status/555');
    expect(variables.tweet_text).toBe('my take');
  });

  it('should forward additional options', async () => {
    await quoteTweet(client, '555', 'take', { mediaIds: ['m1'] });

    const variables = client.graphql.mock.calls[0][2];
    expect(variables.media.media_entities).toHaveLength(1);
    expect(variables.attachment_url).toBe('https://x.com/i/web/status/555');
  });
});

// ============================================================================
// schedulePost
// ============================================================================

describe('schedulePost', () => {
  let client;

  beforeEach(() => {
    client = createMockClient();
  });

  it('should send correct request with Date object', async () => {
    const futureDate = new Date('2026-03-01T12:00:00Z');
    await schedulePost(client, 'scheduled tweet', futureDate);

    expect(client.request).toHaveBeenCalledOnce();
    const [url, options] = client.request.mock.calls[0];
    expect(url).toContain('CreateScheduledTweet');
    expect(options.method).toBe('POST');

    const body = options.body;
    expect(body.variables.post_tweet_request.status).toBe('scheduled tweet');
    expect(body.variables.execute_at).toBe(Math.floor(futureDate.getTime() / 1000));
  });

  it('should normalise Unix seconds timestamp', async () => {
    const unixSeconds = 1740830400; // some future time
    await schedulePost(client, 'tweet', unixSeconds);

    const body = client.request.mock.calls[0][1].body;
    expect(body.variables.execute_at).toBe(unixSeconds);
  });

  it('should normalise Unix milliseconds timestamp to seconds', async () => {
    const unixMs = 1740830400000;
    await schedulePost(client, 'tweet', unixMs);

    const body = client.request.mock.calls[0][1].body;
    expect(body.variables.execute_at).toBe(1740830400);
  });

  it('should return scheduledTweetId from response', async () => {
    const result = await schedulePost(client, 'tweet', Date.now());
    expect(result).toEqual({ scheduledTweetId: 'sched_999' });
  });

  it('should pass mediaIds when provided', async () => {
    await schedulePost(client, 'tweet', Date.now(), { mediaIds: ['m1', 'm2'] });

    const body = client.request.mock.calls[0][1].body;
    expect(body.variables.post_tweet_request.media_ids).toEqual(['m1', 'm2']);
  });

  it('should validate tweet text', async () => {
    const longText = 'x'.repeat(281);
    await expect(schedulePost(client, longText, Date.now())).rejects.toThrow(
      /exceeds maximum length/,
    );
  });

  it('should require authentication', async () => {
    const unauth = createMockClient({ authenticated: false });
    await expect(schedulePost(unauth, 'test', Date.now())).rejects.toThrow(AuthError);
  });
});

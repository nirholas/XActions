// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, 2.0.
/**
 * Tests — client mutation transports (src/client/api/tweets.js, users.js)
 *
 * These tests lock current mutation URL shape and body of each mutation.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  sendTweet,
  sendQuoteTweet,
  deleteTweet,
  likeTweet,
  unlikeTweet,
  retweet,
  unretweet,
} from '../../src/client/api/tweets.js';
import { followUser, unfollowUser } from '../../src/client/api/users.js';
import { GRAPHQL_ENDPOINTS } from '../../src/client/api/graphqlQueries.js';
import { GRAPHQL_BASE } from '../../src/scrapers/twitter/http/endpoints.js';

const TWEET_RESULT = { data: { create_tweet: { tweet_results: { result: { rest_id: '42', core: {} } } } } };

/** Minimal http double: records post calls, returns a canned body. */
function mockHttp(body = {}) {
  return { post: vi.fn().mockResolvedValue(body) };
}

function lastCall(http) {
  const [url, body, options] = http.post.mock.calls[0];
  return { url, body, options };
}

describe('tweet mutations build a GraphQL POST URL and body', () => {
  const cases = [
    ['sendTweet', (http) => sendTweet(http, 'hello'), 'CreateTweet'],
    ['sendQuoteTweet', (http) => sendQuoteTweet(http, 'q', '123'), 'CreateTweet'],
    ['deleteTweet', (http) => deleteTweet(http, '123'), 'DeleteTweet'],
    ['likeTweet', (http) => likeTweet(http, '123'), 'FavoriteTweet'],
    ['unlikeTweet', (http) => unlikeTweet(http, '123'), 'UnfavoriteTweet'],
    ['retweet', (http) => retweet(http, '123'), 'CreateRetweet'],
    ['unretweet', (http) => unretweet(http, '123'), 'DeleteRetweet'],
  ];

  it.each(cases)('%s posts to the endpoint URL without calling a url() factory', async (name, run, endpointName) => {
    const http = mockHttp(TWEET_RESULT);
    await run(http);

    const endpoint = GRAPHQL_ENDPOINTS[endpointName];
    const { url, body } = lastCall(http);
    expect(url).toBe(`${GRAPHQL_BASE}/${endpoint.queryId}/${endpoint.operationName}`);
    expect(body.queryId).toBe(endpoint.queryId);
    expect(body.variables).toBeTypeOf('object');
  });

  it('sendTweet puts the text in variables.tweet_text', async () => {
    const http = mockHttp(TWEET_RESULT);
    await sendTweet(http, 'hello world');
    expect(lastCall(http).body.variables.tweet_text).toBe('hello world');
  });

  it('sendTweet reply sets in_reply_to_tweet_id', async () => {
    const http = mockHttp(TWEET_RESULT);
    await sendTweet(http, 'a reply', { replyTo: '999' });
    expect(lastCall(http).body.variables.reply).toEqual({
      in_reply_to_tweet_id: '999',
      exclude_reply_user_ids: [],
    });
  });

  it('likeTweet sends only the tweet_id variable', async () => {
    const http = mockHttp();
    await likeTweet(http, '123');
    expect(lastCall(http).body.variables).toEqual({ tweet_id: '123' });
  });

  it('unretweet uses source_tweet_id', async () => {
    const http = mockHttp();
    await unretweet(http, '123');
    expect(lastCall(http).body.variables).toEqual({ source_tweet_id: '123', dark_request: false });
  });
});

describe('followUser/unfollowUser send the minimal REST body X accepts', () => {
  it('followUser posts only user_id to friendships/create', async () => {
    const http = mockHttp({ id_str: '11348282' });
    await followUser(http, '11348282');

    const { url, body, options } = lastCall(http);
    expect(url).toContain('/1.1/friendships/create.json');
    expect(body).toBe('user_id=11348282');
    expect(options['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('unfollowUser posts only user_id to friendships/destroy', async () => {
    const http = mockHttp({ id_str: '11348282' });
    await unfollowUser(http, '11348282');

    const { url, body } = lastCall(http);
    expect(url).toContain('/1.1/friendships/destroy.json');
    expect(body).toBe('user_id=11348282');
  });
});

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests — src/client/api/graphqlQueries.js
 *
 * The repo carried two independent tables of X GraphQL query IDs, and they
 * drifted: 11 of the client's IDs went stale while the shared endpoint map
 * stayed current, so every `Scraper.getProfile()` call answered
 * `HTTP 404 {"message":"Query not found"}`. The client now derives its IDs
 * from the shared map. These tests fail the moment a second copy reappears.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect } from 'vitest';
import { GRAPHQL_ENDPOINTS, BEARER_TOKEN, buildGraphQLUrl } from '../../src/client/api/graphqlQueries.js';
import {
  GRAPHQL,
  BEARER_TOKEN as SHARED_BEARER_TOKEN,
  POST_QUERY_OPERATIONS,
  graphqlRequestMethod,
} from '../../src/scrapers/twitter/http/endpoints.js';
import { getFollowers, getUserByScreenName } from '../../src/client/api/users.js';
import { searchTweets } from '../../src/client/api/search.js';

describe('GraphQL query ID registry', () => {
  it('shares one bearer token with the HTTP scraper', () => {
    expect(BEARER_TOKEN).toBe(SHARED_BEARER_TOKEN);
  });

  it('never disagrees with the shared endpoint map', () => {
    const drifted = [];

    for (const [name, endpoint] of Object.entries(GRAPHQL_ENDPOINTS)) {
      const shared = GRAPHQL[name];
      if (!shared) continue; // REST-only entries have no shared counterpart
      if (endpoint.queryId !== shared.queryId) {
        drifted.push(`${name}: client=${endpoint.queryId} shared=${shared.queryId}`);
      }
    }

    expect(drifted, `Query IDs drifted from src/scrapers/twitter/http/endpoints.js:\n${drifted.join('\n')}`)
      .toEqual([]);
  });

  it('gives every GraphQL endpoint a query ID and operation name', () => {
    for (const [name, endpoint] of Object.entries(GRAPHQL_ENDPOINTS)) {
      if (endpoint.isRest) {
        expect(typeof endpoint.url, `${name} is REST and needs a url()`).toBe('function');
        continue;
      }
      expect(endpoint.queryId, `${name} has no query ID`).toBeTruthy();
      expect(endpoint.operationName, `${name} has no operation name`).toBeTruthy();
    }
  });

  it('builds a GraphQL URL containing the current query ID', () => {
    const url = buildGraphQLUrl(GRAPHQL_ENDPOINTS.UserByScreenName, { screen_name: 'nasa' });

    expect(url).toContain(GRAPHQL.UserByScreenName.queryId);
    expect(url).toContain('/UserByScreenName');
    expect(decodeURIComponent(url)).toContain('"screen_name":"nasa"');
  });

  it('builds REST URLs from their url() factory', () => {
    expect(buildGraphQLUrl(GRAPHQL_ENDPOINTS.Trends)).toBe('https://x.com/i/api/2/guide.json');
  });
});

// #99: X serves Followers and SearchTimeline only over POST and answers a GET
// with a bare 404. The http scraper switched in #42; this client did not, so
// `xactions followers` and `xactions search` failed with `HTTP 404:`.
describe('GraphQL transport', () => {
  /** Records each request and answers with an empty timeline. */
  function recorder() {
    const calls = [];
    const empty = { data: {} };
    return {
      calls,
      async get(url) { calls.push({ method: 'GET', url }); return empty; },
      async post(url, body) { calls.push({ method: 'POST', url, body }); return empty; },
    };
  }

  it('sends Followers as POST with variables, features and queryId in the body', async () => {
    const http = recorder();
    for await (const _ of getFollowers(http, '11348282', 5)) { /* drain */ }

    expect(http.calls).toHaveLength(1);
    const [call] = http.calls;
    expect(call.method).toBe('POST');
    expect(call.url).toBe(`https://x.com/i/api/graphql/${GRAPHQL_ENDPOINTS.Followers.queryId}/Followers`);
    expect(call.body.queryId).toBe(GRAPHQL_ENDPOINTS.Followers.queryId);
    expect(call.body.variables).toMatchObject({ userId: '11348282', count: 20 });
    expect(call.body.features).toBeTypeOf('object');
  });

  it('sends SearchTimeline as POST', async () => {
    const http = recorder();
    for await (const _ of searchTweets(http, 'from:nasa', 5)) { /* drain */ }

    expect(http.calls.map((c) => c.method)).toEqual(['POST']);
    expect(http.calls[0].url).toMatch(/\/SearchTimeline$/);
    expect(http.calls[0].body.variables.rawQuery).toBe('from:nasa');
  });

  it('keeps GET reads as GET with variables in the query string', async () => {
    const http = recorder();
    await getUserByScreenName(http, 'nasa').catch(() => {}); // empty body is fine; we only check transport

    expect(http.calls[0].method).toBe('GET');
    expect(decodeURIComponent(http.calls[0].url)).toContain('"screen_name":"nasa"');
  });

  it('declares the same transport as the shared map for every read', () => {
    const wrong = [];
    for (const [name, endpoint] of Object.entries(GRAPHQL_ENDPOINTS)) {
      if (endpoint.isRest) continue;
      const postQuery = POST_QUERY_OPERATIONS.has(endpoint.operationName);
      if (postQuery && endpoint.method !== 'POST') wrong.push(`${name} must be POST`);
      if (!postQuery && endpoint.method === 'GET' && graphqlRequestMethod(endpoint.operationName) !== 'GET') {
        wrong.push(`${name} must not be GET`);
      }
    }
    expect(wrong).toEqual([]);
  });
});

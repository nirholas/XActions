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

import { describe, it, expect, vi } from 'vitest';
import {
  GRAPHQL_ENDPOINTS,
  BEARER_TOKEN,
  buildGraphQLUrl,
  graphqlRequest,
  DEFAULT_FEATURES,
} from '../../src/client/api/graphqlQueries.js';
import { GRAPHQL, BEARER_TOKEN as SHARED_BEARER_TOKEN } from '../../src/scrapers/twitter/http/endpoints.js';

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

describe('graphqlRequest', () => {
  it('POSTs variables/features/queryId body to the GraphQL endpoint', async () => {
    const post = vi.fn(async () => ({}));
    const http = { get: vi.fn(), post };

    await graphqlRequest(http, GRAPHQL_ENDPOINTS.SearchTimeline, { rawQuery: 'nix' });

    expect(post).toHaveBeenCalledTimes(1);
    const [url, body] = post.mock.calls[0];
    expect(url).toContain(`/graphql/${GRAPHQL.SearchTimeline.queryId}/SearchTimeline`);
    expect(body.variables).toEqual({ rawQuery: 'nix' });
    expect(body.queryId).toBe(GRAPHQL.SearchTimeline.queryId);
    expect(body.features).toEqual(DEFAULT_FEATURES);
    expect(http.get).not.toHaveBeenCalled();
  });

  it('merges endpoint defaultVariables with caller variables', async () => {
    const post = vi.fn(async () => ({}));
    const http = { get: vi.fn(), post };

    await graphqlRequest(http, GRAPHQL_ENDPOINTS.SearchTimeline, { rawQuery: 'nix' });

    const body = post.mock.calls[0][1];
    expect(body.variables).toEqual({ rawQuery: 'nix' });
  });

  it('keeps REST endpoints on GET via their url() factory', async () => {
    const get = vi.fn(async () => ({}));
    const http = { get, post: vi.fn() };

    await graphqlRequest(http, GRAPHQL_ENDPOINTS.Trends);

    expect(get).toHaveBeenCalledWith('https://x.com/i/api/2/guide.json');
    expect(http.post).not.toHaveBeenCalled();
  });

  it('fails fast when handed a REST POST endpoint', async () => {
    const http = { get: vi.fn(), post: vi.fn() };

    await expect(graphqlRequest(http, GRAPHQL_ENDPOINTS.CreateFollow)).rejects.toThrow(
      /must call http directly/,
    );
    expect(http.get).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
  });

  it('sends GET-endpoint queries as GET with query-param variables', async () => {
    const get = vi.fn(async () => ({}));
    const http = { get, post: vi.fn() };

    await graphqlRequest(http, GRAPHQL_ENDPOINTS.UserByScreenName, { screen_name: 'nasa' });

    const url = get.mock.calls[0][0];
    expect(url).toContain(`/graphql/${GRAPHQL.UserByScreenName.queryId}/UserByScreenName`);
    expect(decodeURIComponent(url)).toContain('"screen_name":"nasa"');
    expect(http.post).not.toHaveBeenCalled();
  });

  it('locks the transport map so random endpoints conversion fails loudly', () => {
    const methods = Object.fromEntries(
      Object.entries(GRAPHQL_ENDPOINTS).map(([name, ep]) => [name, ep.method]),
    );

    // Guest-reachable endpoints must stay GET — X rejects guest POSTs outright.
    expect(methods.UserByScreenName).toBe('GET');
    expect(methods.UserByRestId).toBe('GET');
    expect(methods.UserTweets).toBe('GET');
    expect(methods.TweetDetail).toBe('GET');

    // Endpoints X 404s on GET must be POST.
    expect(methods.SearchTimeline).toBe('POST');
    expect(methods.Followers).toBe('POST');
    expect(methods.Following).toBe('POST');
    expect(methods.UserTweetsAndReplies).toBe('POST');
    expect(methods.Likes).toBe('POST');
    expect(methods.ListMembers).toBe('POST');
    expect(methods.ListLatestTweetsTimeline).toBe('POST');
    expect(methods.ListByRestId).toBe('POST');

    // Every GraphQL entry has an explicit method.
    for (const [name, ep] of Object.entries(GRAPHQL_ENDPOINTS)) {
      if (ep.isRest) continue;
      expect(['GET', 'POST'], `${name} must declare GET or POST`).toContain(ep.method);
    }
  });
});

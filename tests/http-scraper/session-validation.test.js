// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests for the endpoint-drift fixes (2026-08):
 *
 * 1. validateSession() probes UserByScreenName GraphQL instead of the
 *    retired /1.1/account/verify_credentials.json (HTTP 404 for all callers).
 * 2. client.graphql() unwraps X's top-level `data` key so consumers can read
 *    response.data.<payload> directly.
 *
 * All tests use mocked fetch - no real network requests.
 *
 * @author mayconfrr
 * @license MIT
 */

import { describe, it, expect, vi } from 'vitest';
import { TwitterAuth, parseTwidCookie } from '../../src/scrapers/twitter/http/auth.js';
import { TwitterHttpClient } from '../../src/scrapers/twitter/http/client.js';
import { GRAPHQL } from '../../src/scrapers/twitter/http/endpoints.js';

/** Build a minimal mock Response. */
function mockResponse(body, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

const PROBE_BODY = {
  data: {
    user: {
      result: {
        __typename: 'User',
        rest_id: '999',
        legacy: { name: 'Probe Target', screen_name: 'x' },
      },
    },
  },
};

describe('validateSession probes a live GraphQL endpoint', () => {
  it('does NOT call the retired verify_credentials.json endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(PROBE_BODY));
    const auth = new TwitterAuth({ fetch: fetchMock });
    auth.setCookies({ auth_token: 'at', ct0: 'ct' });

    await auth.validateSession();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('/i/api/graphql/');
    expect(url).toContain(GRAPHQL.UserByScreenName.queryId);
    expect(url).not.toContain('verify_credentials');
  });

  it('treats HTTP 404 from the probe as unverifiable, not dead session', async () => {
    // verify_credentials used to 404 and fail every login; any non-auth
    // status must no longer hard-fail validation.
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}, { status: 404 }));
    const auth = new TwitterAuth({ fetch: fetchMock });
    auth.setCookies({ auth_token: 'at', ct0: 'ct' });

    const result = await auth.validateSession();

    expect(result.valid).toBe(true);
    expect(result.user).toBeNull();
    expect(result.status).toBe(404);
  });

  it('rejects an expired cookie on HTTP 401 from the probe', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}, { status: 401 }));
    const auth = new TwitterAuth({ fetch: fetchMock });
    auth.setCookies({ auth_token: 'dead', ct0: 'ct' });

    const result = await auth.validateSession();

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('401');
  });

  it('rejects a CSRF mismatch on HTTP 403 from the probe', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({}, { status: 403 }));
    const auth = new TwitterAuth({ fetch: fetchMock });
    auth.setCookies({ auth_token: 'at', ct0: 'wrong' });

    const result = await auth.validateSession();

    expect(result.valid).toBe(false);
  });

  it('derives identity from the twid cookie when present', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(PROBE_BODY));
    const auth = new TwitterAuth({ fetch: fetchMock });
    auth.setCookies({ auth_token: 'at', ct0: 'ct', twid: 'u%3D12345' });

    const result = await auth.validateSession();

    expect(result.valid).toBe(true);
    expect(result.user).toEqual({ id: '12345', username: '', name: '' });
  });
});

describe('parseTwidCookie', () => {
  it('decodes URL-encoded twid values', () => {
    expect(parseTwidCookie('u%3D12345')).toBe('12345');
  });

  it('accepts already-decoded values', () => {
    expect(parseTwidCookie('u=678')).toBe('678');
  });

  it('returns null for malformed or missing values', () => {
    expect(parseTwidCookie('zz')).toBeNull();
    expect(parseTwidCookie('u=')).toBeNull();
    expect(parseTwidCookie(undefined)).toBeNull();
  });
});

describe('client.graphql() unwraps the response payload', () => {
  function clientWith(jsonBody) {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => jsonBody,
      text: async () => JSON.stringify(jsonBody),
    });
    return new TwitterHttpClient({ cookies: 'auth_token=a; ct0=b', fetch: fetchImpl, maxRetries: 0 });
  }

  it("returns X's data payload as .data, not wrapped again", async () => {
    const raw = { data: { user: { result: { __typename: 'User' } } } };
    const client = clientWith(raw);

    const response = await client.graphql(GRAPHQL.UserByScreenName.queryId, 'UserByScreenName', {
      screen_name: 'testuser',
    });

    // The bug: consumers had to read response.data.data.user.result
    expect(response.data?.user?.result?.__typename).toBe('User');
    expect(response.data?.data).toBeUndefined();
  });

  it('yields null data rather than throwing on an empty payload', async () => {
    const client = clientWith({});
    const response = await client.graphql(GRAPHQL.UserByRestId.queryId, 'UserByRestId', { userId: '1' });
    expect(response.data).toBeNull();
  });
});

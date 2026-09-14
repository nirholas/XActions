// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests for GraphQL query-ID discovery
 *
 * Covers: operation extraction from bundle text, chunk-manifest parsing,
 * chunk selection, cache precedence (cache > discovered > hardcoded), the
 * hardcoded fallback when nothing is cached, and the HTTP client's
 * refresh-once-and-retry behaviour on a stale-ID 404 / 400.
 *
 * Uses vitest with a fake fetch served from fixtures. No real network.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  extractOperations,
  parseChunkManifest,
  parseMainBundleUrl,
  selectChunks,
  discoverQueryIds,
  refreshQueryIds,
  getQueryId,
  resolveOperation,
  queryIdStatus,
  isCacheStale,
  isStaleQueryIdError,
  maybeRefreshInBackground,
  configureQueryIds,
  resetQueryIdState,
  resolveCachePath,
  hardcodedQueryIds,
  CACHE_FILENAME,
} from '../../src/scrapers/twitter/http/queryIds.js';
import { GRAPHQL, resolveGraphQL } from '../../src/scrapers/twitter/http/endpoints.js';
import { TwitterHttpClient } from '../../src/scrapers/twitter/http/client.js';
import { NotFoundError, TwitterApiError } from '../../src/scrapers/twitter/http/errors.js';
import { GRAPHQL_ENDPOINTS } from '../../src/client/api/graphqlQueries.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const HOME_HTML = fs.readFileSync(path.join(fixtures, 'x-home.html'), 'utf8');
const MAIN_JS = fs.readFileSync(path.join(fixtures, 'x-main.js'), 'utf8');
const CHUNK_JS = fs.readFileSync(path.join(fixtures, 'x-chunk-bookmarks.js'), 'utf8');

const MAIN_URL = 'https://abs.twimg.com/responsive-web/client-web/main.dd01e8d41baf20e2a.js';
const BOOKMARKS_CHUNK_URL =
  'https://abs.twimg.com/responsive-web/client-web/shared~bundle.BookmarkFolders~bundle.Bookmarks.9de452aa8a4ecd8ba.js';

/** Live IDs baked into the fixtures (what x.com served on 2026-08-27). */
const LIVE = {
  UserByScreenName: 'Gb-d6r0vxPOADdG62OEBpQ',
  TweetDetail: 'XMOz5h24KAZ86qKffKTLdQ',
  SearchTimeline: 'hyPfJYJ_XAtDYoslQc-Rgg',
  Bookmarks: 'iblrFnKr6PZUR-dWpfXG6g',
  Favoriters: 'yObihOW0q78g0PONS3QWVw',
};

function textResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(body),
    json: () => Promise.resolve(JSON.parse(body)),
  };
}

/**
 * Fake fetch that serves x.com/home, the main bundle, and one feature chunk
 * from fixtures; anything else is a 404 with an empty body.
 */
function bundleFetch(overrides = {}) {
  return vi.fn(async (url) => {
    if (url in overrides) return overrides[url]();
    if (url === 'https://x.com/home') return textResponse(200, HOME_HTML);
    if (url === MAIN_URL) return textResponse(200, MAIN_JS);
    if (url === BOOKMARKS_CHUNK_URL) return textResponse(200, CHUNK_JS);
    if (url.startsWith('https://abs.twimg.com/')) return textResponse(404, '');
    return textResponse(404, '{}');
  });
}

let cacheDir;

beforeEach(() => {
  cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-queryids-'));
  configureQueryIds({ cacheDir });
});

afterEach(() => {
  configureQueryIds({});
  resetQueryIdState();
  fs.rmSync(cacheDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. Extraction
// ---------------------------------------------------------------------------

describe('extractOperations', () => {
  it('pulls every {queryId, operationName, operationType} triple out of a bundle', () => {
    const ops = extractOperations(MAIN_JS);
    const byName = Object.fromEntries(ops.map((o) => [o.operationName, o]));

    expect(byName.UserByScreenName).toEqual({
      queryId: LIVE.UserByScreenName,
      operationName: 'UserByScreenName',
      operationType: 'query',
    });
    expect(byName.CreateTweet.operationType).toBe('mutation');
    expect(ops.length).toBe(7);
  });

  it('ignores descriptors with an unknown operationType', () => {
    const names = extractOperations(MAIN_JS).map((o) => o.operationName);
    expect(names).not.toContain('Broken');
  });

  it('returns an empty list for non-bundle text', () => {
    expect(extractOperations('<html></html>')).toEqual([]);
    expect(extractOperations(undefined)).toEqual([]);
  });
});

describe('parseMainBundleUrl / parseChunkManifest', () => {
  it('finds the main bundle URL in page HTML', () => {
    expect(parseMainBundleUrl(HOME_HTML)).toBe(MAIN_URL);
    expect(parseMainBundleUrl('<html>no bundles here</html>')).toBeNull();
  });

  it('joins the runtime name map and hash map into chunk URLs', () => {
    const { base, chunks } = parseChunkManifest(HOME_HTML);
    expect(base).toBe('https://abs.twimg.com/responsive-web/client-web/');
    expect(chunks.length).toBe(13);

    const bookmarks = chunks.find((c) => c.name === 'shared~bundle.BookmarkFolders~bundle.Bookmarks');
    expect(bookmarks.url).toBe(BOOKMARKS_CHUNK_URL);

    // Unnamed numeric chunks are addressed by id
    const numeric = chunks.find((c) => c.id === '573');
    expect(numeric.name).toBe('573');
    expect(numeric.url).toBe('https://abs.twimg.com/responsive-web/client-web/573.a753297a73c0f9e5a.js');
  });

  it('returns no chunks when the runtime is absent', () => {
    expect(parseChunkManifest('<html></html>').chunks).toEqual([]);
  });
});

describe('selectChunks', () => {
  it('core scope keeps only the chunks that carry operations XActions uses', () => {
    const { chunks } = parseChunkManifest(HOME_HTML);
    const names = selectChunks(chunks, 'core').map((c) => c.name).sort();
    expect(names).toEqual([
      'bundle.LoggedInMain',
      'bundle.UserProfile',
      'loader.UserHandler',
      'ondemand.HoverCard',
      'shared~bundle.BookmarkFolders~bundle.Bookmarks',
      'shared~bundle.LoggedInMain~bundle.HomeTimeline~bundle.Compose',
      'shared~bundle.QuoteTweetActivity~bundle.TweetActivity',
    ]);
  });

  it('full scope skips only i18n and country tables', () => {
    const { chunks } = parseChunkManifest(HOME_HTML);
    const names = selectChunks(chunks, 'full').map((c) => c.name);
    expect(names).not.toContain('i18n/th');
    expect(names).not.toContain('ondemand.countries-zh');
    expect(names).toContain('bundle.NotABot');
    expect(names).toContain('573');
  });
});

// ---------------------------------------------------------------------------
// 2. Discovery + cache
// ---------------------------------------------------------------------------

describe('discoverQueryIds', () => {
  it('fetches the page, main bundle and core chunks, then persists a cache with fetchedAt', async () => {
    const fetch = bundleFetch();
    const result = await discoverQueryIds({ fetch, cacheDir });

    expect(result.count).toBe(10);
    expect(result.operations.UserByScreenName.queryId).toBe(LIVE.UserByScreenName);
    expect(result.operations.Bookmarks.queryId).toBe(LIVE.Bookmarks);
    expect(result.source.entryUrl).toBe('https://x.com/home');
    expect(result.source.mainBundle).toBe(MAIN_URL);
    expect(result.source.chunksFailed.length).toBe(6);

    const file = path.join(cacheDir, CACHE_FILENAME);
    expect(result.cachePath).toBe(file);
    const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(Date.parse(onDisk.fetchedAt)).toBeGreaterThan(Date.now() - 60_000);
    expect(onDisk.operations.TweetDetail.queryId).toBe(LIVE.TweetDetail);

    // The page was fetched with browser navigation headers
    const [, homeOpts] = fetch.mock.calls.find(([u]) => u === 'https://x.com/home');
    expect(homeOpts.headers['sec-fetch-mode']).toBe('navigate');
    expect(homeOpts.headers.accept).toContain('text/html');
  });

  it('falls through the entry-page list when a page has no bundle', async () => {
    const fetch = bundleFetch({
      'https://x.com/home': () => textResponse(200, '<html>new shell, no bundles</html>'),
      'https://x.com/i/flow/login': () => textResponse(200, HOME_HTML),
    });
    const result = await discoverQueryIds({ fetch, cacheDir });
    expect(result.source.entryUrl).toBe('https://x.com/i/flow/login');
    expect(result.count).toBe(10);
  });

  it('throws, and leaves no cache, when no page yields a bundle', async () => {
    const fetch = vi.fn(async () => textResponse(403, 'blocked'));
    await expect(discoverQueryIds({ fetch, cacheDir })).rejects.toThrow(/Could not locate x.com client bundle/);
    expect(fs.existsSync(path.join(cacheDir, CACHE_FILENAME))).toBe(false);
  });

  it('does not persist when persist:false', async () => {
    await discoverQueryIds({ fetch: bundleFetch(), cacheDir, persist: false });
    expect(fs.existsSync(path.join(cacheDir, CACHE_FILENAME))).toBe(false);
    expect(queryIdStatus({ cacheDir }).cached).toBe(false);
  });
});

describe('refreshQueryIds', () => {
  it('shares one in-flight discovery between concurrent callers', async () => {
    const fetch = bundleFetch();
    const [a, b] = await Promise.all([refreshQueryIds({ fetch, cacheDir }), refreshQueryIds({ fetch, cacheDir })]);
    expect(a).toBe(b);
    expect(fetch.mock.calls.filter(([u]) => u === 'https://x.com/home').length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 3. Precedence and fallback
// ---------------------------------------------------------------------------

describe('getQueryId / resolveOperation precedence', () => {
  it('uses the hardcoded table when nothing is cached (offline behaviour unchanged)', () => {
    const r = resolveOperation('TweetDetail', { cacheDir });
    expect(r).toEqual({
      queryId: GRAPHQL.TweetDetail.queryId,
      operationName: 'TweetDetail',
      operationType: null,
      source: 'hardcoded',
    });
    expect(getQueryId('TweetDetail')).toBe(GRAPHQL.TweetDetail.queryId);
    expect(queryIdStatus()).toMatchObject({ cached: false, fetchedAt: null, count: 0, stale: true });
  });

  it('accepts a hardcoded-table key as well as an operationName', () => {
    // GRAPHQL.Likes is the "who liked this tweet" query, operationName Favoriters
    expect(resolveOperation('Likes').operationName).toBe('Favoriters');
    expect(getQueryId('Likes')).toBe(GRAPHQL.Likes.queryId);
    expect(getQueryId('Favoriters')).toBe(GRAPHQL.Likes.queryId);
    expect(hardcodedQueryIds().Favoriters).toBe(GRAPHQL.Likes.queryId);
  });

  it('returns null for an operation nobody knows', () => {
    expect(getQueryId('NoSuchOperation')).toBeNull();
    expect(resolveOperation('NoSuchOperation').source).toBe('unknown');
  });

  it('prefers a persisted cache over the hardcoded table, read from disk by a fresh process state', () => {
    fs.writeFileSync(
      resolveCachePath(cacheDir),
      JSON.stringify({
        version: 1,
        fetchedAt: new Date().toISOString(),
        operations: { TweetDetail: { queryId: 'cachedTweetDetailId', operationType: 'query' } },
      }),
    );
    resetQueryIdState();

    expect(resolveOperation('TweetDetail')).toMatchObject({ queryId: 'cachedTweetDetailId', source: 'cache' });
    // Operations the cache lacks still fall back to the table
    expect(resolveOperation('SearchTimeline')).toMatchObject({
      queryId: GRAPHQL.SearchTimeline.queryId,
      source: 'hardcoded',
    });
    expect(queryIdStatus()).toMatchObject({ cached: true, count: 1, stale: false });
  });

  it('prefers freshly discovered IDs over the hardcoded table, and the endpoint helpers see them', async () => {
    const pinnedBefore = GRAPHQL.UserByScreenName.queryId;
    expect(resolveGraphQL('UserByScreenName').source).toBe('hardcoded');
    expect(GRAPHQL_ENDPOINTS.UserByScreenName.queryId).toBe(pinnedBefore);

    await refreshQueryIds({ fetch: bundleFetch(), cacheDir });

    expect(getQueryId('UserByScreenName')).toBe(LIVE.UserByScreenName);
    expect(resolveGraphQL('UserByScreenName')).toEqual({
      queryId: LIVE.UserByScreenName,
      operationName: 'UserByScreenName',
      source: 'cache',
    });
    // The client-side registry reads live on every access
    expect(GRAPHQL_ENDPOINTS.UserByScreenName.queryId).toBe(LIVE.UserByScreenName);
    expect(GRAPHQL_ENDPOINTS.Likes.queryId).toBe(LIVE.Favoriters);
    // The hardcoded table itself is untouched by discovery
    expect(GRAPHQL.UserByScreenName.queryId).toBe(pinnedBefore);
  });

  it('ignores a corrupt cache file', () => {
    fs.writeFileSync(resolveCachePath(cacheDir), '{not json');
    resetQueryIdState();
    expect(resolveOperation('TweetDetail').source).toBe('hardcoded');
    expect(queryIdStatus().cached).toBe(false);
  });

  it('honours XACTIONS_HOME for the cache location', () => {
    configureQueryIds({});
    const prev = process.env.XACTIONS_HOME;
    process.env.XACTIONS_HOME = cacheDir;
    try {
      expect(resolveCachePath()).toBe(path.join(cacheDir, CACHE_FILENAME));
    } finally {
      if (prev === undefined) delete process.env.XACTIONS_HOME;
      else process.env.XACTIONS_HOME = prev;
    }
  });
});

describe('isCacheStale / maybeRefreshInBackground', () => {
  it('treats a cache older than 24h as stale and refreshes it once in the background', async () => {
    fs.writeFileSync(
      resolveCachePath(cacheDir),
      JSON.stringify({
        version: 1,
        fetchedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        operations: { TweetDetail: { queryId: 'oldId', operationType: 'query' } },
      }),
    );
    resetQueryIdState();
    expect(isCacheStale()).toBe(true);
    expect(isCacheStale({ maxAgeMs: 48 * 60 * 60 * 1000 })).toBe(false);

    const fetch = bundleFetch();
    expect(maybeRefreshInBackground({ fetch, cacheDir })).toBe(true);
    // Second call within the hour does not start another refresh
    expect(maybeRefreshInBackground({ fetch, cacheDir })).toBe(false);

    await refreshQueryIds({ fetch, cacheDir });
    expect(getQueryId('TweetDetail')).toBe(LIVE.TweetDetail);
    expect(isCacheStale()).toBe(false);
  });

  it('does nothing when the cache is fresh', async () => {
    await refreshQueryIds({ fetch: bundleFetch(), cacheDir });
    const fetch = vi.fn();
    expect(maybeRefreshInBackground({ fetch, cacheDir })).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('isStaleQueryIdError', () => {
  it('matches a 404 and a 400 that names the persisted query', () => {
    expect(isStaleQueryIdError(404)).toBe(true);
    expect(isStaleQueryIdError(400, { errors: [{ message: 'PersistedQueryNotFound' }] })).toBe(true);
    expect(isStaleQueryIdError(400, { message: 'Query not found' })).toBe(true);
    expect(isStaleQueryIdError(400, { errors: [{ message: 'Bad variables' }] })).toBe(false);
    expect(isStaleQueryIdError(500, { message: 'Query not found' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Client: refresh once and retry on a stale ID
// ---------------------------------------------------------------------------

describe('TwitterHttpClient stale query ID handling', () => {
  // A pinned ID from an older release, modelled as the live ID with a different final character.
  const stale = (op) => LIVE[op].slice(0, -1) + (LIVE[op].endsWith('0') ? '1' : '0');
  const staleUrl = (op) => `https://x.com/i/api/graphql/${stale(op)}/${op}`;
  const liveUrl = (op) => `https://x.com/i/api/graphql/${LIVE[op]}/${op}`;

  it('on a 404 refreshes the IDs from x.com and retries once with the new ID', async () => {
    const payload = { data: { user: { result: { rest_id: '1' } } } };
    const fetch = bundleFetch({
      [staleUrl('UserByScreenName')]: () => textResponse(404, '{"errors":[{"message":"Query not found"}]}'),
      [liveUrl('UserByScreenName')]: () => textResponse(200, JSON.stringify(payload)),
    });
    // Route on the URL prefix: the GraphQL GET carries query params
    const routed = vi.fn((url, opts) => fetch(url.split('?')[0], opts));

    const client = new TwitterHttpClient({ fetch: routed, maxRetries: 0, autoRefreshQueryIds: true });
    const result = await client.graphql(stale('UserByScreenName'), 'UserByScreenName', { screen_name: 'nichxbt' });

    // graphql() strips x.com's { data } envelope: result.data is the payload
    expect(result.data).toEqual(payload.data);
    const graphqlCalls = routed.mock.calls.map(([u]) => u.split('?')[0]).filter((u) => u.includes('/i/api/graphql/'));
    expect(graphqlCalls).toEqual([staleUrl('UserByScreenName'), liveUrl('UserByScreenName')]);
    expect(routed.mock.calls.filter(([u]) => u === 'https://x.com/home').length).toBe(1);
    // The refreshed ID is now cached for later calls
    expect(getQueryId('UserByScreenName')).toBe(LIVE.UserByScreenName);
  });

  it('on a 400 naming the persisted query, refreshes and retries once', async () => {
    const payload = { data: { tweetResult: {} } };
    const fetch = bundleFetch({
      [staleUrl('TweetDetail')]: () =>
        textResponse(400, '{"errors":[{"message":"PersistedQueryNotFound: unknown operation"}]}'),
      [liveUrl('TweetDetail')]: () => textResponse(200, JSON.stringify(payload)),
    });
    const routed = vi.fn((url, opts) => fetch(url.split('?')[0], opts));
    const client = new TwitterHttpClient({ fetch: routed, maxRetries: 0, autoRefreshQueryIds: true });

    const result = await client.graphql(stale('TweetDetail'), 'TweetDetail', { focalTweetId: '1' });
    expect(result.data).toEqual(payload.data);
    const graphqlCalls = routed.mock.calls.map(([u]) => u.split('?')[0]).filter((u) => u.includes('/i/api/graphql/'));
    expect(graphqlCalls).toEqual([staleUrl('TweetDetail'), liveUrl('TweetDetail')]);
  });

  it('rethrows the original error when discovery fails (offline)', async () => {
    const routed = vi.fn(async (url) => {
      if (url.includes('/i/api/graphql/')) return textResponse(404, '{}');
      throw new TypeError('fetch failed');
    });
    const client = new TwitterHttpClient({ fetch: routed, maxRetries: 0, autoRefreshQueryIds: true });

    await expect(client.graphql(GRAPHQL.TweetDetail.queryId, 'TweetDetail', {})).rejects.toBeInstanceOf(NotFoundError);
    const graphqlCalls = routed.mock.calls.filter(([u]) => u.includes('/i/api/graphql/'));
    expect(graphqlCalls.length).toBe(1);
  });

  it('does not retry when the refreshed ID is the same as the one that failed', async () => {
    await refreshQueryIds({ fetch: bundleFetch(), cacheDir });
    const fetch = bundleFetch({
      [liveUrl('TweetDetail')]: () => textResponse(404, '{}'),
    });
    const routed = vi.fn((url, opts) => fetch(url.split('?')[0], opts));
    const client = new TwitterHttpClient({ fetch: routed, maxRetries: 0, autoRefreshQueryIds: true });

    await expect(client.graphql(GRAPHQL.TweetDetail.queryId, 'TweetDetail', {})).rejects.toBeInstanceOf(NotFoundError);
    const graphqlCalls = routed.mock.calls.map(([u]) => u.split('?')[0]).filter((u) => u.includes('/i/api/graphql/'));
    expect(graphqlCalls).toEqual([liveUrl('TweetDetail')]);
  });

  it('never refreshes or retries when autoRefreshQueryIds is off', async () => {
    const routed = vi.fn(async () => textResponse(400, '{"errors":[{"message":"Query not found"}]}'));
    const client = new TwitterHttpClient({ fetch: routed, maxRetries: 0, autoRefreshQueryIds: false });
    await expect(client.graphql(GRAPHQL.TweetDetail.queryId, 'TweetDetail', {})).rejects.toBeInstanceOf(TwitterApiError);
    expect(routed).toHaveBeenCalledTimes(1);
  });

  it('uses the cached ID instead of the hardcoded one the caller passes', async () => {
    await refreshQueryIds({ fetch: bundleFetch(), cacheDir });
    const routed = vi.fn(async () => textResponse(200, '{"data":{}}'));
    const client = new TwitterHttpClient({ fetch: routed, maxRetries: 0, autoRefreshQueryIds: false });

    await client.graphql(GRAPHQL.SearchTimeline.queryId, 'SearchTimeline', { rawQuery: 'x' });
    expect(routed.mock.calls[0][0]).toContain(`/i/api/graphql/${LIVE.SearchTimeline}/SearchTimeline`);
    expect(routed.mock.calls[0][1].method).toBe('POST');
  });
});

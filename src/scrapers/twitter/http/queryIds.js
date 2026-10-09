// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * GraphQL Query ID Discovery
 *
 * Every GraphQL call to x.com is addressed by a persisted query ID
 * (`/i/api/graphql/<queryId>/<operationName>`). X rotates those IDs whenever
 * it ships a new web bundle, and a stale ID answers `404 Query not found`.
 * That is the single most common way a no-API client breaks.
 *
 * This module does what the web client does: it loads an x.com page, reads the
 * webpack chunk manifest the page inlines, downloads the bundles that carry
 * GraphQL operation descriptors, and extracts every
 * `{queryId, operationName, operationType}` triple it finds. Results are
 * persisted to `~/.xactions/query-ids.json` (or `$XACTIONS_HOME/query-ids.json`)
 * so later processes start from fresh IDs without touching the network.
 *
 * Resolution order for any operation: cached/discovered ID, then the
 * hardcoded table in `endpoints.js`. Offline behaviour is therefore unchanged:
 * with no cache and no network the hardcoded IDs are used exactly as before.
 *
 * Bundle layout observed 2026-08 (subject to change, all of it is parsed
 * defensively):
 *   - `https://x.com/` is a server-rendered shell. Since 2026-10 a logged-out
 *     visitor gets the newer `x-web` shell, which ships no classic bundles at
 *     all, while a signed-in session still gets the classic client:
 *     `vendor.<hash>a.js`, `main.<hash>a.js`, plus an inline webpack runtime.
 *     Discovery attaches the saved session for exactly that reason
 *     (`sessionFetch()` below).
 *   - The runtime's chunk URL builder is
 *     `p.u=e=>""+({<id>:"<name>",...}[e]||e)+"."+({<id>:"<hash>",...})[e]+"a.js"`
 *     with `p.p="https://abs.twimg.com/responsive-web/client-web/"`.
 *   - `main.*.js` holds ~100 operations (UserByScreenName, TweetDetail,
 *     SearchTimeline, UserTweets, Followers, CreateTweet, ...). The rest are
 *     spread over named feature chunks (`bundle.*`, `ondemand.*`, `loader.*`,
 *     `shared~*`); a full sweep is ~1000 files / 130 MB, so the default scope
 *     fetches main plus the chunks known to carry the operations XActions uses.
 *
 * @module scrapers/twitter/http/queryIds
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

// The query-ID cache is a Node convenience, not a requirement: the pinned table
// and an in-memory refresh are enough on their own. Cloudflare Workers and
// Pages Functions have no filesystem and reject a bundle that imports node:fs
// at all, so the modules are pulled in at runtime, behind a Node check, through
// a specifier a bundler cannot resolve statically. On any other runtime the
// three stay null and every cache operation becomes a no-op.
const NODE_MODULES = ['node:fs', 'node:path', 'node:os'];
let fs = null;
let path = null;
let os = null;

if (typeof process !== 'undefined' && process.versions?.node) {
  try {
    const loaded = await Promise.all(NODE_MODULES.map((name) => import(/* @vite-ignore */ name)));
    [fs, path, os] = loaded.map((module) => module.default ?? module);
  } catch {
    fs = null;
    path = null;
    os = null;
  }
}

/**
 * Whether this runtime can persist the cache to disk.
 * @returns {boolean}
 */
export function hasFilesystem() {
  return Boolean(fs && path && os);
}

/** Sentinel path used when there is no filesystem, so callers still get a string. */
const MEMORY_CACHE_PATH = 'memory:query-ids.json';
import { GRAPHQL } from './endpoints.js';
import { browserNavigationHeaders } from './guest.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CACHE_FILENAME = 'query-ids.json';

/** Cache entries older than this trigger a background refresh. */
export const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Never start more than one background refresh per process in this window. */
const BACKGROUND_RETRY_INTERVAL_MS = 60 * 60 * 1000;

/** Pages that still ship the classic client bundles, tried in order. */
export const ENTRY_URLS = [
  'https://x.com/home',
  'https://x.com/i/flow/login',
  'https://twitter.com/home',
  'https://x.com/',
];

export const BUNDLE_BASE = 'https://abs.twimg.com/responsive-web/client-web/';

/**
 * Feature chunks fetched in the default (`core`) scope, on top of `main`.
 * Matched against chunk names from the manifest. Each pattern is there for a
 * concrete operation the hardcoded table needs and `main` does not carry:
 *   - LoggedInMain / HoverCard: ListMembers, ListLatestTweetsTimeline, ListByRestId
 *   - LoggedInMain~HomeTimeline~Compose: HomeTimeline, HomeLatestTimeline
 *   - BookmarkFolders~Bookmarks: Bookmarks
 *   - TweetActivity / TweetEditHistory: Favoriters, Retweeters
 *   - UserProfile / UserHandler: profile-page operations
 */
export const CORE_CHUNK_PATTERNS = [
  /^bundle\.LoggedInMain$/,
  /^ondemand\.HoverCard$/,
  /^bundle\.UserProfile$/,
  /^loader\.UserHandler$/,
  /^bundle\.TweetEditHistory$/,
  /^bundle\.Bookmarks$/,
  /^bundle\.HomeTimeline$/,
  /^shared~.*HomeTimeline.*Compose/,
  /^shared~bundle\.BookmarkFolders~bundle\.Bookmarks$/,
  /^shared~.*TweetActivity/,
];

/** Chunks that never carry operations and are skipped even in `full` scope. */
const NEVER_FETCH = [/^i18n\//, /^ondemand\.countries-/, /^vendor$/, /^main$/];

const OPERATION_RE =
  /queryId:"([A-Za-z0-9_-]+)",operationName:"([A-Za-z0-9_]+)",operationType:"(query|mutation|subscription)"/g;

const MAIN_BUNDLE_RE = /https:\/\/abs\.twimg\.com\/responsive-web\/client-web(?:-legacy)?\/main\.([a-z0-9]+)\.js/;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const state = {
  /** @type {Record<string, {queryId: string, operationType: string}>|null} */
  operations: null,
  /** @type {string|null} ISO timestamp of the discovery that produced `operations` */
  fetchedAt: null,
  /** @type {string|null} Cache path the in-memory state was loaded from */
  loadedFrom: null,
  /** @type {Promise<object>|null} In-flight refresh, shared by every caller */
  inflight: null,
  /** @type {number} Epoch ms of the last background refresh attempt */
  lastBackgroundAttempt: 0,
  /** @type {{cacheDir?: string, fetch?: typeof globalThis.fetch}} */
  config: {},
};

/**
 * Hardcoded fallback: operationName -> queryId, from the endpoint table.
 * Built on first use, not at module load: `endpoints.js` imports this module
 * too, so whichever of the two is imported first sees the other's bindings
 * uninitialised until both bodies have run.
 */
let hardcodedTable = null;
function hardcoded() {
  if (!hardcodedTable) {
    hardcodedTable = Object.freeze(
      Object.fromEntries(Object.values(GRAPHQL).map((e) => [e.operationName, e.queryId])),
    );
  }
  return hardcodedTable;
}

// ---------------------------------------------------------------------------
// Paths and cache I/O
// ---------------------------------------------------------------------------

/**
 * Directory the cache lives in: `$XACTIONS_HOME`, else `~/.xactions`.
 *
 * Under vitest, with no explicit directory, this points at a per-run temp
 * directory instead of the developer's home: unit tests must not pick up
 * whatever `~/.xactions/query-ids.json` happens to hold on the machine.
 *
 * @param {string} [override]
 * @returns {string}
 */
export function resolveCacheDir(override) {
  if (override) return override;
  if (state.config.cacheDir) return state.config.cacheDir;
  if (!hasFilesystem()) return 'memory:';
  if (process.env.XACTIONS_HOME) return process.env.XACTIONS_HOME;
  if (process.env.VITEST) return path.join(os.tmpdir(), `xactions-vitest-${process.pid}`);
  return path.join(os.homedir(), '.xactions');
}

/**
 * @param {string} [cacheDir]
 * @returns {string}
 */
export function resolveCachePath(cacheDir) {
  if (!hasFilesystem()) return MEMORY_CACHE_PATH;
  return path.join(resolveCacheDir(cacheDir), CACHE_FILENAME);
}

/**
 * Read the on-disk cache. Returns null when absent or unreadable.
 *
 * @param {string} [cacheDir]
 * @returns {{operations: Record<string, {queryId: string, operationType: string}>, fetchedAt: string, source?: object}|null}
 */
export function loadCache(cacheDir) {
  if (!hasFilesystem()) return null;
  const file = resolveCachePath(cacheDir);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!parsed || typeof parsed !== 'object' || !parsed.operations || typeof parsed.operations !== 'object') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Write the cache atomically (temp file + rename).
 *
 * @param {object} payload
 * @param {string} [cacheDir]
 * @returns {string|null} The path written, or null where there is no filesystem
 */
export function saveCache(payload, cacheDir) {
  if (!hasFilesystem()) return null;
  const file = resolveCachePath(cacheDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
  fs.renameSync(tmp, file);
  return file;
}

function ensureLoaded(cacheDir) {
  const file = resolveCachePath(cacheDir);
  if (state.operations && state.loadedFrom === file) return;
  const cached = loadCache(cacheDir);
  if (cached) {
    state.operations = cached.operations;
    state.fetchedAt = cached.fetchedAt ?? null;
  } else {
    state.operations = null;
    state.fetchedAt = null;
  }
  state.loadedFrom = file;
}

// ---------------------------------------------------------------------------
// Pure parsers (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Extract every GraphQL operation descriptor from a bundle's source text.
 *
 * @param {string} js
 * @returns {Array<{queryId: string, operationName: string, operationType: string}>}
 */
export function extractOperations(js) {
  const out = [];
  if (typeof js !== 'string') return out;
  for (const m of js.matchAll(OPERATION_RE)) {
    out.push({ queryId: m[1], operationName: m[2], operationType: m[3] });
  }
  return out;
}

/**
 * Parse the inline webpack runtime's chunk manifest out of page HTML.
 *
 * Returns the public path plus a list of `{id, name, hash, url}` for every
 * chunk the runtime can load. `name` is the chunk id itself for unnamed
 * numeric chunks.
 *
 * @param {string} html
 * @returns {{base: string, chunks: Array<{id: string, name: string, hash: string, url: string}>}}
 */
export function parseChunkManifest(html) {
  const base = (html.match(/p\.p="(https:\/\/abs\.twimg\.com\/responsive-web\/client-web(?:-legacy)?\/)"/) || [])[1] || BUNDLE_BASE;

  const start = html.indexOf('.u=e=>');
  if (start === -1) return { base, chunks: [] };
  const end = html.indexOf('a.js"', start);
  if (end === -1) return { base, chunks: [] };
  const fn = html.slice(start, end + 5);

  const pivot = fn.indexOf('||e)');
  if (pivot === -1) return { base, chunks: [] };
  const namePart = fn.slice(0, pivot);
  const hashPart = fn.slice(pivot);

  const names = new Map();
  for (const m of namePart.matchAll(/(\d+):"([^"]+)"/g)) names.set(m[1], m[2]);
  const chunks = [];
  for (const m of hashPart.matchAll(/(\d+):"([a-f0-9]{8,32})"/g)) {
    const id = m[1];
    const name = names.get(id) ?? id;
    chunks.push({ id, name, hash: m[2], url: `${base}${name}.${m[2]}a.js` });
  }
  return { base, chunks };
}

/**
 * Find the main bundle URL in page HTML.
 *
 * @param {string} html
 * @returns {string|null}
 */
export function parseMainBundleUrl(html) {
  const m = html.match(MAIN_BUNDLE_RE);
  return m ? m[0] : null;
}

/**
 * Choose which manifest chunks to download.
 *
 * @param {Array<{name: string, url: string}>} chunks
 * @param {'core'|'full'} [scope='core']
 * @returns {Array<{name: string, url: string}>}
 */
export function selectChunks(chunks, scope = 'core') {
  const allowed = chunks.filter((c) => !NEVER_FETCH.some((re) => re.test(c.name)));
  if (scope === 'full') return allowed;
  return allowed.filter((c) => CORE_CHUNK_PATTERNS.some((re) => re.test(c.name)));
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

async function fetchText(fetchFn, url, headers) {
  const res = await fetchFn(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(30_000) });
  if (!res || !res.ok) {
    throw new Error(`GET ${url} answered HTTP ${res?.status ?? 'no response'}`);
  }
  return res.text();
}

/**
 * Cookie header built from the jar `xactions login` / `xactions connect`
 * writes, or null when there is no jar to read.
 *
 * @returns {string|null}
 */
function savedSessionCookie() {
  if (!hasFilesystem()) return null;
  try {
    const jar = JSON.parse(fs.readFileSync(path.join(resolveCacheDir(), 'cookies.json'), 'utf8'));
    if (!Array.isArray(jar)) return null;
    const cookie = jar
      .filter((entry) => entry && entry.name && entry.value)
      .map((entry) => `${entry.name}=${entry.value}`)
      .join('; ');
    return cookie || null;
  } catch {
    return null;
  }
}

/**
 * The fetch used when a caller supplies none.
 *
 * Since X stopped shipping the classic client to logged-out visitors, the
 * webpack manifest only appears in the HTML a signed-in browser gets: a guest
 * navigation of `https://x.com/home` now redirects into the login flow, whose
 * shell has no bundle in it. Discovery therefore carries the saved session on
 * x.com and twitter.com navigations; everywhere else, and whenever there is no
 * jar, this is the global fetch unchanged.
 *
 * @returns {typeof globalThis.fetch}
 */
function sessionFetch() {
  const cookie = savedSessionCookie();
  if (!cookie) return globalThis.fetch;
  const base = globalThis.fetch.bind(globalThis);
  return (url, opts = {}) => {
    const headers = opts.headers ?? {};
    const host = (() => {
      try {
        return new URL(url, 'https://x.com').hostname;
      } catch {
        return '';
      }
    })();
    const sameSite = host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com');
    const alreadySet = typeof headers.cookie === 'string' && headers.cookie.length > 0;
    if (!sameSite || alreadySet) return base(url, opts);
    return base(url, { ...opts, headers: { ...headers, cookie } });
  };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(lanes);
  return results;
}

/**
 * Discover current GraphQL query IDs from x.com's live web bundles.
 *
 * Does not touch module state or the cache unless `persist` is true (the
 * default), so it can be used as a pure probe.
 *
 * @param {object} [options]
 * @param {typeof globalThis.fetch} [options.fetch] Custom fetch (proxying, tests)
 * @param {string} [options.cacheDir] Where to persist (default `~/.xactions`)
 * @param {boolean} [options.persist=true] Write the cache file and update memory
 * @param {'core'|'full'} [options.scope='core'] Which feature chunks to sweep
 * @param {string[]} [options.entryUrls] Pages to try for the bundle manifest
 * @param {number} [options.concurrency=8]
 * @returns {Promise<{operations: Record<string, {queryId: string, operationType: string}>, fetchedAt: string, count: number, source: {entryUrl: string, mainBundle: string, chunksFetched: number, chunksFailed: string[], bytes: number}, cachePath: string|null}>}
 */
export async function discoverQueryIds(options = {}) {
  const fetchFn = options.fetch ?? state.config.fetch ?? sessionFetch();
  if (typeof fetchFn !== 'function') throw new Error('discoverQueryIds needs a fetch implementation');
  const scope = options.scope === 'full' ? 'full' : 'core';
  const entryUrls = options.entryUrls ?? ENTRY_URLS;
  const concurrency = options.concurrency ?? 8;

  let html = null;
  let entryUrl = null;
  let mainBundle = null;
  const entryErrors = [];
  for (const url of entryUrls) {
    try {
      const text = await fetchText(fetchFn, url, browserNavigationHeaders());
      const main = parseMainBundleUrl(text);
      if (!main) {
        entryErrors.push(`${url}: no main bundle in HTML`);
        continue;
      }
      html = text;
      entryUrl = url;
      mainBundle = main;
      break;
    } catch (err) {
      entryErrors.push(`${url}: ${err.message}`);
    }
  }
  if (!html) {
    throw new Error(`Could not locate x.com client bundle. ${entryErrors.join('; ')}`);
  }

  const manifest = parseChunkManifest(html);
  const chunks = selectChunks(manifest.chunks, scope);
  const targets = [{ name: 'main', url: mainBundle }, ...chunks];

  const operations = {};
  const chunksFailed = [];
  let bytes = 0;
  const bundleHeaders = { 'user-agent': browserNavigationHeaders()['user-agent'], accept: '*/*' };

  await mapWithConcurrency(targets, concurrency, async (target) => {
    try {
      const js = await fetchText(fetchFn, target.url, bundleHeaders);
      bytes += js.length;
      for (const op of extractOperations(js)) {
        operations[op.operationName] = { queryId: op.queryId, operationType: op.operationType };
      }
    } catch (err) {
      chunksFailed.push(`${target.name}: ${err.message}`);
    }
  });

  const count = Object.keys(operations).length;
  if (count === 0) {
    throw new Error(`Fetched ${targets.length} bundle(s) from ${entryUrl} but found no GraphQL operations`);
  }

  const fetchedAt = new Date().toISOString();
  const payload = {
    version: 1,
    fetchedAt,
    source: {
      entryUrl,
      mainBundle,
      scope,
      chunksFetched: targets.length - chunksFailed.length,
      chunksFailed,
      bytes,
    },
    operations,
  };

  let cachePath = null;
  if (options.persist !== false) {
    cachePath = saveCache(payload, options.cacheDir);
    state.operations = operations;
    state.fetchedAt = fetchedAt;
    state.loadedFrom = cachePath;
  }

  return { operations, fetchedAt, count, source: payload.source, cachePath };
}

/**
 * Refresh the cache from x.com. Concurrent callers share one in-flight
 * discovery.
 *
 * @param {Parameters<typeof discoverQueryIds>[0]} [options]
 * @returns {Promise<Awaited<ReturnType<typeof discoverQueryIds>>>}
 */
export function refreshQueryIds(options = {}) {
  if (!state.inflight) {
    state.inflight = discoverQueryIds({ ...options, persist: true }).finally(() => {
      state.inflight = null;
    });
  }
  return state.inflight;
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Map a name to its GraphQL operationName. Accepts either an operationName
 * (`Favoriters`) or a key of the hardcoded table (`Likes`).
 *
 * @param {string} name
 * @returns {string}
 */
export function toOperationName(name) {
  if (GRAPHQL[name]) return GRAPHQL[name].operationName;
  return name;
}

/**
 * Look up the best-known query ID for an operation.
 *
 * Order: in-memory/cached discovery, then the hardcoded table. Synchronous,
 * never touches the network.
 *
 * @param {string} name operationName or hardcoded-table key
 * @param {object} [options]
 * @param {string} [options.cacheDir]
 * @returns {string|null}
 */
export function getQueryId(name, options = {}) {
  return resolveOperation(name, options).queryId;
}

/**
 * Resolve an operation to the `{queryId, operationName}` pair a request needs.
 *
 * @param {string} name operationName or hardcoded-table key
 * @param {object} [options]
 * @param {string} [options.cacheDir]
 * @returns {{queryId: string|null, operationName: string, operationType: string|null, source: 'cache'|'hardcoded'|'unknown'}}
 */
export function resolveOperation(name, options = {}) {
  const operationName = toOperationName(name);
  ensureLoaded(options.cacheDir);
  const discovered = state.operations?.[operationName];
  if (discovered?.queryId) {
    return { queryId: discovered.queryId, operationName, operationType: discovered.operationType ?? null, source: 'cache' };
  }
  const hard = hardcoded()[operationName];
  if (hard) {
    return { queryId: hard, operationName, operationType: null, source: 'hardcoded' };
  }
  return { queryId: null, operationName, operationType: null, source: 'unknown' };
}

/**
 * Whether the cache is missing or older than `maxAgeMs`.
 *
 * @param {object} [options]
 * @param {number} [options.maxAgeMs=DEFAULT_MAX_AGE_MS]
 * @param {string} [options.cacheDir]
 * @returns {boolean}
 */
export function isCacheStale(options = {}) {
  ensureLoaded(options.cacheDir);
  if (!state.operations || !state.fetchedAt) return true;
  const age = Date.now() - Date.parse(state.fetchedAt);
  return !(age >= 0 && age < (options.maxAgeMs ?? DEFAULT_MAX_AGE_MS));
}

/**
 * Kick off a refresh in the background if the cache is stale, at most once
 * per hour per process. Never throws and never blocks the caller.
 *
 * @param {Parameters<typeof discoverQueryIds>[0] & {maxAgeMs?: number}} [options]
 * @returns {boolean} true if a refresh was started
 */
export function maybeRefreshInBackground(options = {}) {
  if (!isCacheStale(options)) return false;
  const now = Date.now();
  if (now - state.lastBackgroundAttempt < BACKGROUND_RETRY_INTERVAL_MS) return false;
  state.lastBackgroundAttempt = now;
  refreshQueryIds(options).catch(() => {});
  return true;
}

/**
 * Snapshot for diagnostics (`xactions doctor`).
 *
 * @param {object} [options]
 * @param {string} [options.cacheDir]
 * @returns {{cached: boolean, fetchedAt: string|null, count: number, cachePath: string, stale: boolean}}
 */
export function queryIdStatus(options = {}) {
  ensureLoaded(options.cacheDir);
  return {
    cached: Boolean(state.operations),
    fetchedAt: state.fetchedAt,
    count: state.operations ? Object.keys(state.operations).length : 0,
    cachePath: resolveCachePath(options.cacheDir),
    stale: isCacheStale(options),
  };
}

/**
 * Whether an HTTP failure looks like a stale persisted query rather than a
 * missing resource or a bad request.
 *
 * @param {number} status
 * @param {object} [body] Parsed JSON error body, if any
 * @returns {boolean}
 */
export function isStaleQueryIdError(status, body) {
  if (status === 404) return true;
  if (status !== 400) return false;
  const messages = [];
  if (typeof body?.message === 'string') messages.push(body.message);
  if (Array.isArray(body?.errors)) {
    for (const e of body.errors) if (typeof e?.message === 'string') messages.push(e.message);
  }
  return messages.some((m) => /persisted\s*query|query\s*not\s*found|unknown\s*operation|operation\s*not\s*found|queryId/i.test(m));
}

/**
 * Process-wide defaults: cache directory and fetch implementation used when a
 * call does not pass its own. Pass `{}` to reset.
 *
 * @param {{cacheDir?: string, fetch?: typeof globalThis.fetch}} config
 */
export function configureQueryIds(config = {}) {
  state.config = { ...config };
  state.operations = null;
  state.fetchedAt = null;
  state.loadedFrom = null;
  state.lastBackgroundAttempt = 0;
}

/**
 * Drop in-memory state so the next lookup re-reads the cache file.
 */
export function resetQueryIdState() {
  state.operations = null;
  state.fetchedAt = null;
  state.loadedFrom = null;
  state.inflight = null;
  state.lastBackgroundAttempt = 0;
}

/**
 * The hardcoded operationName -> queryId table, for diagnostics and tests.
 * @returns {Readonly<Record<string, string>>}
 */
export function hardcodedQueryIds() {
  return hardcoded();
}

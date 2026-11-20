// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
//
// The transaction-ID algorithm in this file (key-byte index extraction, the
// cubic-bezier animation key, and the SHA-256 + XOR payload assembly) is
// adapted from x-client-transaction-id by Lami:
//
//   MIT License. Copyright (c) 2025 Lami
//   https://github.com/Lqm1/x-client-transaction-id
//
//   Permission is hereby granted, free of charge, to any person obtaining a
//   copy of this software and associated documentation files (the "Software"),
//   to deal in the Software without restriction, including without limitation
//   the rights to use, copy, modify, merge, publish, distribute, sublicense,
//   and/or sell copies of the Software, and to permit persons to whom the
//   Software is furnished to do so, subject to the following conditions:
//
//   The above copyright notice and this permission notice shall be included in
//   all copies or substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
//   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
//   THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
//   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
//   FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//   DEALINGS IN THE SOFTWARE.
//
// The pre-extracted `{animationKey, verification}` pair dictionary consumed by
// the fast path is published by fa0311 under the MIT licence:
// https://github.com/fa0311/x-client-transaction-id-pair-dict
/**
 * `x-client-transaction-id` request signing
 *
 * x.com's web client attaches an `x-client-transaction-id` header to every
 * GraphQL and internal REST call. The value is derived per request from the
 * HTTP method, the request path, the current time, and two secrets the page
 * itself carries:
 *
 *   1. A base64 verification key, served in the
 *      `<meta name="twitter-site-verification">` tag on x.com/home.
 *   2. An "animation key", computed by walking one of the four
 *      `loading-x-anim-*` SVG paths on that same page along a cubic-bezier
 *      curve. Which path, which row of it, and where along the curve are all
 *      decided by byte indices that live inside the `ondemand.s` webpack
 *      chunk.
 *
 * The pair is stable until x.com ships a new bundle, so it is extracted once,
 * cached on disk under `$XACTIONS_HOME` (default `~/.xactions`), and reused.
 * Signing a request after that is one SHA-256 over a short string.
 *
 * Resolution order when the cache is cold:
 *
 *   1. **Pair dictionary (fast path).** A published list of known-good
 *      `{animationKey, verification}` pairs. One 5 KB fetch, no bundle
 *      parsing, no obfuscated-JavaScript regex. The header only has to be
 *      internally consistent, so a harvested pair signs just as well as the
 *      page's own.
 *   2. **Live parse (fallback).** Load x.com/home, read the verification key
 *      and the animation paths out of the HTML, resolve the `ondemand.s`
 *      chunk through the same webpack manifest parser query-ID discovery
 *      already uses, and extract the key-byte indices from it. Roughly 300 KB
 *      of traffic, and the authoritative answer.
 *
 * Every failure degrades to `null`: a request that cannot be signed still goes
 * out, unsigned, exactly as it did before this module existed.
 *
 * Turn signing off with `XACTIONS_TRANSACTION_ID=0` (or `off`/`false`/`no`),
 * or per client with `new TwitterHttpClient({ transactionId: false })`. Force
 * a source with `XACTIONS_TXID_SOURCE=live` or `=pairs`.
 *
 * @module scrapers/twitter/http/transactionId
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';

import { parseChunkManifest, resolveCacheDir, ENTRY_URLS, BUNDLE_BASE } from './queryIds.js';
import { browserNavigationHeaders } from './guest.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CACHE_FILENAME = 'transaction-keys.json';

/** Cached keys older than this are refreshed (x.com rotates them per deploy). */
export const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** After a failed initialisation, do not try again for this long. */
export const FAILURE_BACKOFF_MS = 10 * 60 * 1000;

/** The webpack chunk that carries the key-byte indices. */
export const ON_DEMAND_CHUNK_NAME = 'ondemand.s';

/** Published `{animationKey, verification}` pairs (fa0311, MIT). */
export const PAIR_DICTIONARY_URL =
  'https://raw.githubusercontent.com/fa0311/x-client-transaction-id-pair-dict/main/pair.json';

/** Literal the web client folds into the hashed payload. */
export const DEFAULT_KEYWORD = 'obfiowerehiring';

/** Constant byte the web client appends before the XOR pass. */
export const ADDITIONAL_RANDOM_NUMBER = 3;

/** The epoch the encoded timestamp counts from (2023-05-01T07:00:00Z). */
export const TRANSACTION_EPOCH_MS = 1682924400 * 1000;

/** Cubic-bezier sampling window, in the web client's own arbitrary units. */
const TOTAL_TIME = 4096;

/** `(t[30], 16)` style index reads inside the ondemand chunk. */
const INDICES_RE = /\(\w\[(\d{1,2})\],\s*16\)/g;

const VERIFICATION_META_RE =
  /<meta[^>]*name=["']twitter-site-verification["'][^>]*content=["']([^"']+)["']/i;
const VERIFICATION_META_REVERSED_RE =
  /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter-site-verification["']/i;
const ANIMATION_FRAME_RE = /id=["']loading-x-anim-(\d+)["']/g;
const D_ATTRIBUTE_RE = /\sd=["']([^"']+)["']/g;

const NETWORK_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const state = {
  /** @type {{key: string, animationKey: string, source: string, fetchedAt: string}|null} */
  keys: null,
  /** @type {string|null} Cache path the in-memory keys were loaded from */
  loadedFrom: null,
  /** @type {Promise<object|null>|null} In-flight initialisation, shared by every caller */
  inflight: null,
  /** @type {number} Epoch ms of the last failed initialisation */
  lastFailureAt: 0,
  /** @type {{cacheDir?: string, fetch?: typeof globalThis.fetch, enabled?: boolean, source?: string}} */
  config: {},
};

// ---------------------------------------------------------------------------
// Enablement
// ---------------------------------------------------------------------------

const FALSEY_RE = /^(0|off|false|no)$/i;

/**
 * Whether signing is switched on.
 *
 * Explicit call option wins, then process configuration, then
 * `XACTIONS_TRANSACTION_ID`. Defaults to on outside vitest; unit tests must
 * not reach x.com unless they opt in.
 *
 * @param {object} [options]
 * @param {boolean} [options.enabled]
 * @returns {boolean}
 */
export function isTransactionIdEnabled(options = {}) {
  if (typeof options.enabled === 'boolean') return options.enabled;
  if (typeof state.config.enabled === 'boolean') return state.config.enabled;
  const raw = process.env.XACTIONS_TRANSACTION_ID;
  if (raw != null && raw !== '') return !FALSEY_RE.test(raw.trim());
  return !process.env.VITEST;
}

/**
 * Which discovery lane to try first: `pairs` (default) or `live`.
 *
 * @param {object} [options]
 * @param {'pairs'|'live'} [options.source]
 * @returns {'pairs'|'live'}
 */
function resolveSource(options = {}) {
  const raw = options.source ?? state.config.source ?? process.env.XACTIONS_TXID_SOURCE;
  return raw === 'live' ? 'live' : 'pairs';
}

// ---------------------------------------------------------------------------
// Paths and cache I/O
// ---------------------------------------------------------------------------

/**
 * Absolute path of the key cache.
 *
 * @param {string} [cacheDir]
 * @returns {string}
 */
export function resolveCachePath(cacheDir) {
  return path.join(cacheDir ?? state.config.cacheDir ?? resolveCacheDir(), CACHE_FILENAME);
}

/**
 * Read the on-disk key cache. Returns null when absent, unreadable, or
 * missing either key.
 *
 * @param {string} [cacheDir]
 * @returns {{key: string, animationKey: string, fetchedAt: string, source?: string}|null}
 */
export function loadCache(cacheDir) {
  try {
    const parsed = JSON.parse(fs.readFileSync(resolveCachePath(cacheDir), 'utf8'));
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.key !== 'string' || !parsed.key) return null;
    if (typeof parsed.animationKey !== 'string' || !parsed.animationKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Write the key cache atomically (temp file + rename).
 *
 * @param {object} payload
 * @param {string} [cacheDir]
 * @returns {string} The path written
 */
export function saveCache(payload, cacheDir) {
  const file = resolveCachePath(cacheDir);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2));
  fs.renameSync(tmp, file);
  return file;
}

function ensureLoaded(cacheDir) {
  const file = resolveCachePath(cacheDir);
  if (state.keys && state.loadedFrom === file) return;
  const cached = loadCache(cacheDir);
  state.keys = cached
    ? {
        key: cached.key,
        animationKey: cached.animationKey,
        source: cached.source ?? 'cache',
        fetchedAt: cached.fetchedAt ?? null,
      }
    : null;
  state.loadedFrom = file;
}

function isFresh(keys, maxAgeMs = DEFAULT_MAX_AGE_MS) {
  if (!keys?.fetchedAt) return false;
  const age = Date.now() - Date.parse(keys.fetchedAt);
  return age >= 0 && age < maxAgeMs;
}

// ---------------------------------------------------------------------------
// Pure extractors (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Pull the base64 site-verification key out of x.com page HTML.
 *
 * @param {string} html
 * @returns {string|null}
 */
export function extractVerificationKey(html) {
  if (typeof html !== 'string') return null;
  const match = html.match(VERIFICATION_META_RE) || html.match(VERIFICATION_META_REVERSED_RE);
  return match ? match[1] : null;
}

/**
 * Pull the four `loading-x-anim-*` animation paths out of x.com page HTML, in
 * document order.
 *
 * Each animation is an `<svg id="loading-x-anim-N"><g><path/><path d="M .. C ..
 * "/></g></svg>`; the second path in the group carries the curve data. Read
 * with a regex rather than a DOM so no HTML parser has to be shipped just to
 * read four attributes.
 *
 * @param {string} html
 * @returns {string[]}
 */
export function extractAnimationPaths(html) {
  if (typeof html !== 'string') return [];
  const frames = [];
  ANIMATION_FRAME_RE.lastIndex = 0;
  let match;
  while ((match = ANIMATION_FRAME_RE.exec(html)) !== null) {
    const closing = html.indexOf('</svg>', match.index);
    const block = closing === -1 ? html.slice(match.index) : html.slice(match.index, closing);
    const paths = [...block.matchAll(D_ATTRIBUTE_RE)].map((m) => m[1]);
    if (paths.length >= 2) frames.push({ index: Number(match[1]), d: paths[1] });
  }
  frames.sort((a, b) => a.index - b.index);
  return frames.map((frame) => frame.d);
}

/**
 * Extract the key-byte indices from the `ondemand.s` chunk source.
 *
 * The chunk reads its own key bytes as `parseInt(t[<n>], 16)`, obfuscated to
 * `(t[30], 16)`. The first index selects the animation row; the rest multiply
 * together into the point on the curve to sample.
 *
 * @param {string} js
 * @returns {{rowIndex: number, keyByteIndices: number[]}|null}
 */
export function extractKeyByteIndices(js) {
  if (typeof js !== 'string') return null;
  const found = [];
  INDICES_RE.lastIndex = 0;
  let match;
  while ((match = INDICES_RE.exec(js)) !== null) found.push(parseInt(match[1], 10));
  if (found.length < 2) return null;
  return { rowIndex: found[0], keyByteIndices: found.slice(1) };
}

/**
 * Split one SVG path's curve data into rows of integers.
 *
 * @param {string} d
 * @returns {number[][]}
 */
export function pathToFrameRows(d) {
  if (typeof d !== 'string') return [];
  return d.substring(9).split('C').map((segment) => {
    const cleaned = segment.replace(/[^\d]+/g, ' ').trim();
    return cleaned === '' ? [] : cleaned.split(/\s+/).map((n) => parseInt(n, 10));
  });
}

/**
 * Decode a base64 key into its bytes.
 *
 * @param {string} key
 * @returns {number[]}
 */
export function keyToBytes(key) {
  return Array.from(Buffer.from(key, 'base64'));
}

// ---------------------------------------------------------------------------
// Animation key (adapted from x-client-transaction-id, MIT, (c) 2025 Lami)
// ---------------------------------------------------------------------------

/** @returns {number} -1 for odd inputs, 0 for even. */
const isOdd = (n) => (n % 2 ? -1.0 : 0.0);

/**
 * The web client's own float-to-hex routine, including its quirks: the
 * integer loop recomputes from the original value, and the fraction is
 * expanded until it hits zero.
 *
 * @param {number} x
 * @returns {string}
 */
export function floatToHex(x) {
  const digits = [];
  let quotient = Math.floor(x);
  let fraction = x - quotient;

  while (quotient > 0) {
    quotient = Math.floor(x / 16);
    const remainder = Math.floor(x - quotient * 16);
    digits.unshift(remainder > 9 ? String.fromCharCode(remainder + 55) : String(remainder));
    x = quotient;
  }

  if (fraction === 0) return digits.join('');

  digits.push('.');
  while (fraction > 0) {
    fraction *= 16;
    const whole = Math.floor(fraction);
    fraction -= whole;
    digits.push(whole > 9 ? String.fromCharCode(whole + 55) : String(whole));
  }
  return digits.join('');
}

const bezier = (a, b, m) => 3.0 * a * (1 - m) * (1 - m) * m + 3.0 * b * (1 - m) * m * m + m * m * m;

/**
 * Sample a cubic-bezier curve, given its four control values, at `time`.
 *
 * @param {number[]} curves
 * @param {number} time
 * @returns {number}
 */
export function cubicValue(curves, time) {
  if (time <= 0.0) {
    let startGradient = 0;
    if (curves[0] > 0.0) startGradient = curves[1] / curves[0];
    else if (curves[1] === 0.0 && curves[2] > 0.0) startGradient = curves[3] / curves[2];
    return startGradient * time;
  }
  if (time >= 1.0) {
    let endGradient = 0;
    if (curves[2] < 1.0) endGradient = (curves[3] - 1.0) / (curves[2] - 1.0);
    else if (curves[2] === 1.0 && curves[0] < 1.0) endGradient = (curves[1] - 1.0) / (curves[0] - 1.0);
    return 1.0 + endGradient * (time - 1.0);
  }

  let start = 0.0;
  let end = 1.0;
  let mid = 0.0;
  while (start < end) {
    mid = (start + end) / 2;
    const estimate = bezier(curves[0], curves[2], mid);
    if (Math.abs(time - estimate) < 0.00001) return bezier(curves[1], curves[3], mid);
    if (estimate < time) start = mid;
    else end = mid;
  }
  return bezier(curves[1], curves[3], mid);
}

const interpolateNum = (from, to, f) =>
  typeof from === 'number' && typeof to === 'number' ? from * (1 - f) + to * f : 0;

const interpolate = (from, to, f) => from.map((value, i) => interpolateNum(value, to[i], f));

const rotationToMatrix = (degrees) => {
  const radians = (degrees * Math.PI) / 180;
  return [Math.cos(radians), -Math.sin(radians), Math.sin(radians), Math.cos(radians)];
};

const solve = (value, min, max, floor) => {
  const result = (value * (max - min)) / 255 + min;
  return floor ? Math.floor(result) : Math.round(result * 100) / 100;
};

/**
 * Turn one row of curve data into its animation-key fragment.
 *
 * @param {number[]} frames One row from {@link pathToFrameRows}
 * @param {number} targetTime Normalised position along the curve
 * @returns {string}
 */
export function animate(frames, targetTime) {
  const fromColor = frames.slice(0, 3).concat(1).map(Number);
  const toColor = frames.slice(3, 6).concat(1).map(Number);
  const toRotation = [solve(frames[6], 60.0, 360.0, true)];
  const curves = frames.slice(7).map((item, i) => solve(item, isOdd(i), 1.0, false));

  const value = cubicValue(curves, targetTime);
  const color = interpolate(fromColor, toColor, value).map((n) => (n > 0 ? n : 0));
  const rotation = interpolate([0.0], toRotation, value);
  const matrix = rotationToMatrix(rotation[0]);

  const parts = color.slice(0, -1).map((n) => Math.round(n).toString(16));
  for (const entry of matrix) {
    let rounded = Math.round(entry * 100) / 100;
    if (rounded < 0) rounded = -rounded;
    const hex = floatToHex(rounded);
    parts.push(hex.startsWith('.') ? `0${hex}`.toLowerCase() : hex || '0');
  }
  parts.push('0', '0');

  return parts.join('').replace(/[.-]/g, '');
}

/**
 * Compute the animation key for a verification key, given the indices from
 * the ondemand chunk and the animation paths from the page.
 *
 * @param {object} input
 * @param {number[]} input.keyBytes
 * @param {number} input.rowIndex
 * @param {number[]} input.keyByteIndices
 * @param {string[]} input.paths
 * @returns {string|null} null when the page markup no longer lines up
 */
export function computeAnimationKey({ keyBytes, rowIndex, keyByteIndices, paths }) {
  if (!Array.isArray(keyBytes) || keyBytes.length === 0) return null;
  if (!Array.isArray(paths) || paths.length === 0) return null;

  const d = paths[keyBytes[5] % paths.length];
  if (typeof d !== 'string') return null;

  const row = keyBytes[rowIndex] % 16;
  const frameTime = Math.round(keyByteIndices.reduce((acc, i) => acc * (keyBytes[i] % 16), 1) / 10) * 10;

  const rows = pathToFrameRows(d);
  const frames = rows[row];
  if (!Array.isArray(frames) || frames.length < 8) return null;

  return animate(frames, frameTime / TOTAL_TIME);
}

// ---------------------------------------------------------------------------
// Transaction ID assembly
// ---------------------------------------------------------------------------

/**
 * Reduce a URL or path to the pathname x.com signs: no origin, no query, no
 * fragment.
 *
 * @param {string} target
 * @returns {string}
 */
export function normalizeSignedPath(target) {
  if (typeof target !== 'string' || target === '') return '/';
  try {
    return new URL(target).pathname;
  } catch {
    const withoutHash = target.split('#')[0];
    const withoutQuery = withoutHash.split('?')[0];
    return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
  }
}

/**
 * Build one `x-client-transaction-id` value.
 *
 * Pure and deterministic once `timeNow` and `randomByte` are pinned, which is
 * what the tests do; in production both come from the clock and the RNG, as
 * they do in the browser.
 *
 * @param {object} input
 * @param {string} input.key Base64 verification key
 * @param {string} input.animationKey
 * @param {string} input.method HTTP method
 * @param {string} input.path Request path or full URL
 * @param {number} [input.timeNow] Seconds since {@link TRANSACTION_EPOCH_MS}
 * @param {number} [input.randomByte] 0-255 XOR mask
 * @returns {Promise<string>}
 */
export async function generateTransactionId({ key, animationKey, method, path: target, timeNow, randomByte }) {
  const seconds = timeNow ?? Math.floor((Date.now() - TRANSACTION_EPOCH_MS) / 1000);
  const timeBytes = [
    seconds & 0xff,
    (seconds >> 8) & 0xff,
    (seconds >> 16) & 0xff,
    (seconds >> 24) & 0xff,
  ];

  const signedPath = normalizeSignedPath(target);
  const verb = String(method || 'GET').toUpperCase();
  const payload = `${verb}!${signedPath}!${seconds}${DEFAULT_KEYWORD}${animationKey}`;

  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload)),
  );

  const mask = randomByte ?? Math.floor(Math.random() * 256);
  const bytes = [
    ...keyToBytes(key),
    ...timeBytes,
    ...Array.from(digest).slice(0, 16),
    ADDITIONAL_RANDOM_NUMBER,
  ];

  const out = Uint8Array.from([mask, ...bytes.map((b) => b ^ mask)]);
  return Buffer.from(out).toString('base64').replace(/=/g, '');
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

async function fetchText(fetchFn, url, headers) {
  const res = await fetchFn(url, {
    headers,
    redirect: 'follow',
    signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
  });
  if (!res || !res.ok) throw new Error(`GET ${url} answered HTTP ${res?.status ?? 'no response'}`);
  return res.text();
}

function resolveFetch(options = {}) {
  const fetchFn = options.fetch ?? state.config.fetch ?? globalThis.fetch;
  if (typeof fetchFn !== 'function') throw new Error('transaction-ID discovery needs a fetch implementation');
  return fetchFn;
}

/**
 * Fast path: take a known-good `{animationKey, verification}` pair from the
 * published dictionary. One small fetch, no bundle parsing.
 *
 * @param {object} [options]
 * @param {typeof globalThis.fetch} [options.fetch]
 * @param {string} [options.pairUrl]
 * @returns {Promise<{key: string, animationKey: string, source: 'pairs', pairUrl: string}>}
 */
export async function discoverFromPairDictionary(options = {}) {
  const fetchFn = resolveFetch(options);
  const pairUrl = options.pairUrl ?? process.env.XACTIONS_TXID_PAIRS_URL ?? PAIR_DICTIONARY_URL;
  const text = await fetchText(fetchFn, pairUrl, { accept: 'application/json' });

  let pairs;
  try {
    pairs = JSON.parse(text);
  } catch (err) {
    throw new Error(`Pair dictionary at ${pairUrl} is not JSON: ${err.message}`, { cause: err });
  }
  if (!Array.isArray(pairs) || pairs.length === 0) {
    throw new Error(`Pair dictionary at ${pairUrl} held no pairs`);
  }

  const usable = pairs.filter(
    (pair) => typeof pair?.verification === 'string' && typeof pair?.animationKey === 'string',
  );
  if (usable.length === 0) {
    throw new Error(`Pair dictionary at ${pairUrl} held no usable {animationKey, verification} entry`);
  }

  // Any consistent pair signs; spreading the choice across the dictionary
  // keeps every XActions install from presenting the same key.
  const chosen = usable[Math.floor(Math.random() * usable.length)];
  return { key: chosen.verification, animationKey: chosen.animationKey, source: 'pairs', pairUrl };
}

/**
 * Resolve the `ondemand.s` chunk URL out of page HTML, reusing the webpack
 * manifest parser that query-ID discovery already runs on the same markup.
 *
 * @param {string} html
 * @returns {string|null}
 */
export function resolveOnDemandChunkUrl(html) {
  const manifest = parseChunkManifest(html);
  const chunk = manifest.chunks.find((entry) => entry.name === ON_DEMAND_CHUNK_NAME);
  if (!chunk) return null;
  return chunk.url.startsWith('http') ? chunk.url : `${BUNDLE_BASE}${chunk.url}`;
}

/**
 * Fallback: read the keys out of x.com's live page and bundle.
 *
 * @param {object} [options]
 * @param {typeof globalThis.fetch} [options.fetch]
 * @param {string[]} [options.entryUrls]
 * @returns {Promise<{key: string, animationKey: string, source: 'live', entryUrl: string, chunkUrl: string}>}
 */
export async function discoverFromLiveBundles(options = {}) {
  const fetchFn = resolveFetch(options);
  const entryUrls = options.entryUrls ?? ENTRY_URLS;

  const failures = [];
  for (const entryUrl of entryUrls) {
    let html;
    try {
      html = await fetchText(fetchFn, entryUrl, browserNavigationHeaders());
    } catch (err) {
      failures.push(`${entryUrl}: ${err.message}`);
      continue;
    }

    const key = extractVerificationKey(html);
    if (!key) {
      failures.push(`${entryUrl}: no twitter-site-verification meta tag`);
      continue;
    }
    const paths = extractAnimationPaths(html);
    if (paths.length === 0) {
      failures.push(`${entryUrl}: no loading-x-anim frames`);
      continue;
    }
    const chunkUrl = resolveOnDemandChunkUrl(html);
    if (!chunkUrl) {
      failures.push(`${entryUrl}: no ${ON_DEMAND_CHUNK_NAME} chunk in the webpack manifest`);
      continue;
    }

    let indices;
    try {
      const js = await fetchText(fetchFn, chunkUrl, {
        'user-agent': browserNavigationHeaders()['user-agent'],
        accept: '*/*',
      });
      indices = extractKeyByteIndices(js);
    } catch (err) {
      failures.push(`${chunkUrl}: ${err.message}`);
      continue;
    }
    if (!indices) {
      failures.push(`${chunkUrl}: no key-byte indices`);
      continue;
    }

    const animationKey = computeAnimationKey({ keyBytes: keyToBytes(key), ...indices, paths });
    if (!animationKey) {
      failures.push(`${entryUrl}: animation frames did not line up with the key bytes`);
      continue;
    }

    return { key, animationKey, source: 'live', entryUrl, chunkUrl };
  }

  throw new Error(`Could not read x.com transaction keys. ${failures.join('; ')}`);
}

/**
 * Make sure a usable `{key, animationKey}` pair is in memory, discovering and
 * caching one if needed. Concurrent callers share one initialisation.
 *
 * Never throws: a failure is recorded, backed off, and reported as null.
 *
 * @param {object} [options]
 * @param {string} [options.cacheDir]
 * @param {typeof globalThis.fetch} [options.fetch]
 * @param {'pairs'|'live'} [options.source]
 * @param {number} [options.maxAgeMs]
 * @param {boolean} [options.force] Ignore a fresh cache and rediscover
 * @returns {Promise<{key: string, animationKey: string, source: string, fetchedAt: string}|null>}
 */
export function initializeTransactionId(options = {}) {
  if (!options.force) {
    ensureLoaded(options.cacheDir);
    if (isFresh(state.keys, options.maxAgeMs)) return Promise.resolve(state.keys);
    if (Date.now() - state.lastFailureAt < FAILURE_BACKOFF_MS) {
      return Promise.resolve(state.keys ?? null);
    }
  }

  if (!state.inflight) {
    state.inflight = discoverAndCache(options).finally(() => {
      state.inflight = null;
    });
  }
  return state.inflight;
}

async function discoverAndCache(options) {
  const primary = resolveSource(options);
  const lanes = primary === 'live'
    ? [discoverFromLiveBundles, discoverFromPairDictionary]
    : [discoverFromPairDictionary, discoverFromLiveBundles];

  const failures = [];
  for (const lane of lanes) {
    try {
      const discovered = await lane(options);
      const fetchedAt = new Date().toISOString();
      const payload = { version: 1, fetchedAt, ...discovered };
      try {
        state.loadedFrom = saveCache(payload, options.cacheDir);
      } catch {
        // A read-only home directory is not a reason to refuse to sign; the
        // keys stay in memory for the life of the process.
        state.loadedFrom = resolveCachePath(options.cacheDir);
      }
      state.keys = {
        key: discovered.key,
        animationKey: discovered.animationKey,
        source: discovered.source,
        fetchedAt,
      };
      state.lastFailureAt = 0;
      return state.keys;
    } catch (err) {
      failures.push(`${lane.name}: ${err.message}`);
    }
  }

  state.lastFailureAt = Date.now();
  if (state.keys) return state.keys; // stale keys still sign correctly
  if (process.env.XACTIONS_DEBUG) {
    console.error(`[transactionId] could not obtain signing keys. ${failures.join('; ')}`);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sign one request.
 *
 * @param {string} method HTTP method
 * @param {string} target Request path or full URL
 * @param {object} [options]
 * @param {boolean} [options.enabled] Override the on/off switch
 * @param {string} [options.cacheDir]
 * @param {typeof globalThis.fetch} [options.fetch]
 * @param {'pairs'|'live'} [options.source]
 * @returns {Promise<string|null>} The header value, or null when signing is
 *   off or unavailable. A null means the caller sends the request unsigned.
 *
 * @example
 * ```js
 * const id = await getTransactionId('GET', 'https://x.com/i/api/graphql/abc/UserByScreenName?variables=%7B%7D');
 * if (id) headers['x-client-transaction-id'] = id;
 * ```
 */
export async function getTransactionId(method, target, options = {}) {
  if (!isTransactionIdEnabled(options)) return null;
  try {
    const keys = await initializeTransactionId(options);
    if (!keys) return null;
    return await generateTransactionId({
      key: keys.key,
      animationKey: keys.animationKey,
      method,
      path: target,
    });
  } catch (err) {
    if (process.env.XACTIONS_DEBUG) {
      console.error(`[transactionId] signing ${method} ${target} failed: ${err.message}`);
    }
    return null;
  }
}

/**
 * Snapshot for diagnostics (`xactions doctor`).
 *
 * @param {object} [options]
 * @param {string} [options.cacheDir]
 * @returns {{enabled: boolean, cached: boolean, source: string|null, fetchedAt: string|null, stale: boolean, cachePath: string, preferredSource: string}}
 */
export function transactionIdStatus(options = {}) {
  ensureLoaded(options.cacheDir);
  return {
    enabled: isTransactionIdEnabled(options),
    cached: Boolean(state.keys),
    source: state.keys?.source ?? null,
    fetchedAt: state.keys?.fetchedAt ?? null,
    stale: !isFresh(state.keys, options.maxAgeMs),
    cachePath: resolveCachePath(options.cacheDir),
    preferredSource: resolveSource(options),
  };
}

/**
 * Process-wide defaults. Pass `{}` to reset.
 *
 * @param {{cacheDir?: string, fetch?: typeof globalThis.fetch, enabled?: boolean, source?: 'pairs'|'live'}} config
 */
export function configureTransactionId(config = {}) {
  state.config = { ...config };
  resetTransactionIdState();
}

/**
 * Drop in-memory keys so the next call re-reads the cache file.
 */
export function resetTransactionIdState() {
  state.keys = null;
  state.loadedFrom = null;
  state.inflight = null;
  state.lastFailureAt = 0;
}

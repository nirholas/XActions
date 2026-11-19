// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The download engine: turns a stream of media items into files on disk.
 *
 * What it guarantees, and why each one is here:
 *
 *   resume       Bytes land in `<name>.part` and are only renamed once the
 *                file is whole, so an interrupted run never leaves a truncated
 *                JPEG that looks complete. A retry sends `Range:` and
 *                continues from what is already on disk instead of starting
 *                the 40 MB video again.
 *   dedup        Identical bytes reached through different URLs are
 *                hard-linked to the first copy (see media/archive.js), so a
 *                photo pulled from a retweet, a quote and the author's media
 *                tab occupies the space of one file while still appearing at
 *                all three paths.
 *   concurrency  A fixed pool, because X rate limits per account and an
 *                unbounded fan-out is how a scrape gets an account locked.
 *   honesty      Every item ends as `downloaded`, `skipped`, `deduped` or
 *                `failed` with the reason attached. A summary that counts a
 *                failure as a success is worse than no summary.
 *
 * @module media/download
 * by nichxbt
 */

import { createWriteStream } from 'node:fs';
import { link, mkdir, rename, stat, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

import { hashBytes } from './archive.js';
import { DEFAULT_TEMPLATE, renderTemplate, resolveWithin } from './template.js';

/** Statuses an item can finish in. */
export const OUTCOMES = Object.freeze(['downloaded', 'skipped', 'deduped', 'failed', 'planned']);

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Does this file already exist, and how big is it? */
async function sizeOf(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? info.size : -1;
  } catch {
    return -1;
  }
}

/**
 * Fetch one URL to a path, resuming a partial `.part` file when one is there.
 *
 * @returns {Promise<{ bytes: number, hash: string }>}
 */
async function fetchToFile(url, target, { signal, timeoutMs, onProgress }) {
  const partial = `${target}.part`;
  const already = await sizeOf(partial);
  const headers = { accept: '*/*' };
  if (already > 0) headers.range = `bytes=${already}-`;

  // `timeoutMs` is an idle timeout, not a deadline for the whole body: it is
  // re-armed on every chunk, so a 40 MB video on a slow link finishes while a
  // connection that stops sending is cut off. A stall is retryable; the next
  // attempt resumes from the `.part` with a Range request.
  const controller = new AbortController();
  let stalled = false;
  let timer;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { stalled = true; controller.abort(); }, timeoutMs);
  };
  arm();
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const res = await fetch(url, { headers, signal: controller.signal });

    // 416 means the server thinks we already have the whole file: the `.part`
    // is complete, so finish it rather than failing the item.
    if (res.status === 416 && already > 0) {
      await rename(partial, target);
      const { readFile } = await import('node:fs/promises');
      const bytes = await readFile(target);
      return { bytes: bytes.length, hash: hashBytes(bytes) };
    }
    if (!res.ok) {
      const error = new Error(`HTTP ${res.status}`);
      error.status = res.status;
      error.retryable = RETRYABLE_STATUS.has(res.status);
      throw error;
    }

    const resuming = res.status === 206 && already > 0;
    if (already > 0 && !resuming) await unlink(partial).catch(() => {});

    const total = Number(res.headers.get('content-length') || 0) + (resuming ? already : 0);
    let received = resuming ? already : 0;

    await mkdir(dirname(target), { recursive: true });
    const sink = createWriteStream(partial, { flags: resuming ? 'a' : 'w' });
    const source = Readable.fromWeb(res.body);
    source.on('data', (chunk) => {
      arm();
      received += chunk.length;
      onProgress?.({ received, total });
    });
    await pipeline(source, sink);

    await rename(partial, target);
    const { readFile } = await import('node:fs/promises');
    const bytes = await readFile(target);
    return { bytes: bytes.length, hash: hashBytes(bytes) };
  } catch (error) {
    if (stalled && !signal?.aborted) {
      const stall = new Error(`no data for ${timeoutMs} ms`);
      stall.retryable = true;
      throw stall;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Download one item, with retries and archive awareness.
 *
 * @param {object} item
 * @param {object} ctx  { outputDir, template, archive, overwrite, dryRun, retries, timeoutMs, signal, onProgress }
 *   `timeoutMs` is how long a connection may go without sending a byte.
 * @returns {Promise<object>} the item plus `{ outcome, path, bytes, hash, reason }`
 */
export async function downloadItem(item, ctx) {
  const {
    outputDir,
    template = DEFAULT_TEMPLATE,
    archive,
    overwrite = false,
    dryRun = false,
    retries = 3,
    timeoutMs = 60000,
    signal,
    onProgress,
  } = ctx;

  const relativePath = renderTemplate(template, item);
  const target = resolveWithin(outputDir, relativePath);
  const result = { ...item, path: target, relativePath };

  if (archive?.has(item) && !overwrite) {
    return { ...result, outcome: 'skipped', reason: 'in archive' };
  }
  if (!overwrite) {
    const existing = await sizeOf(target);
    if (existing > 0) return { ...result, outcome: 'skipped', reason: 'file exists' };
  }
  if (dryRun) return { ...result, outcome: 'planned' };

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) return { ...result, outcome: 'failed', reason: 'aborted' };
    try {
      const { bytes, hash } = await fetchToFile(item.url, target, {
        signal,
        timeoutMs,
        onProgress: onProgress ? (p) => onProgress({ ...p, item }) : undefined,
      });

      // Identical bytes already on disk under another name: keep both paths,
      // store one copy.
      // The link is made under a temporary name and renamed over the target,
      // so the downloaded file is only replaced once its twin is in place: a
      // link that fails (across filesystems, or the twin was deleted) leaves
      // the downloaded copy exactly where it was.
      const twin = archive?.hashPath(hash);
      if (twin && twin !== target) {
        const staged = `${target}.link-${process.pid}-${Date.now()}`;
        let linked = false;
        try {
          await link(twin, staged);
          await rename(staged, target);
          linked = true;
        } catch {
          // Hard links fail across filesystems; the downloaded copy is already
          // correct, so keep it rather than failing the item.
          await unlink(staged).catch(() => {});
        }
        if (linked) {
          await archive.record({ item, hash, path: target, bytes, url: item.url });
          return { ...result, outcome: 'deduped', bytes, hash, reason: `same bytes as ${twin}` };
        }
      }

      await archive?.record({ item, hash, path: target, bytes, url: item.url });
      return { ...result, outcome: 'downloaded', bytes, hash };
    } catch (error) {
      lastError = error;
      // A caller's abort is final; a stall carries retryable=true from
      // fetchToFile; any other AbortError is treated as final too.
      const retryable = error.retryable ?? (error.name === 'AbortError' ? false : true);
      if (!retryable || attempt === retries || signal?.aborted) break;
      await sleep(Math.min(2 ** attempt * 500, 8000));
    }
  }

  return { ...result, outcome: 'failed', reason: lastError?.message || 'unknown error' };
}

/**
 * Run a set of items through a fixed-size worker pool.
 *
 * @param {Array<object>} items
 * @param {object} ctx  as downloadItem, plus `{ concurrency, onResult }`
 * @returns {Promise<{ results: Array<object>, summary: Record<string, number> }>}
 */
export async function downloadAll(items, ctx = {}) {
  const { concurrency = 4, onResult } = ctx;
  const results = [];
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      if (ctx.signal?.aborted) return;
      const index = cursor++;
      const result = await downloadItem(items[index], ctx);
      results[index] = result;
      onResult?.(result, index, items.length);
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, worker));

  const summary = { downloaded: 0, skipped: 0, deduped: 0, failed: 0, planned: 0, bytes: 0 };
  for (const result of results) {
    if (!result) continue;
    summary[result.outcome] = (summary[result.outcome] || 0) + 1;
    summary.bytes += result.bytes || 0;
  }
  return { results: results.filter(Boolean), summary };
}

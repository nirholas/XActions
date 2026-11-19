// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Resumable Scrape Checkpoints
 *
 * A checkpoint is one small JSON file, written atomically after every page,
 * that remembers where a paginated GraphQL scrape got to:
 *
 *   { cursor, count, updatedAt, meta }
 *
 * A follower scrape with `--limit 50000` that dies at page 400 (network drop,
 * rate-limit wall, Ctrl-C) restarts from the saved bottom cursor instead of
 * page one, and the `count` already collected is subtracted from the limit,
 * so the same command finishes the job. Borrowed from the CSV-resume idea in
 * Altimis/Scweet, minus the CSV.
 *
 * The items themselves are appended, one JSON line per item, to a sidecar
 * file next to the checkpoint (`<name>.items.jsonl`), so the resumed run
 * returns everything both runs collected, not only its own share. A
 * checkpoint written before the sidecar existed still resumes; it just has
 * no earlier items to hand back.
 *
 * Files live under `$XACTIONS_HOME/checkpoints/` (default `~/.xactions`).
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { resolveCacheDir } from './queryIds.js';

const CHECKPOINT_DIRNAME = 'checkpoints';

/**
 * Turn an arbitrary key (`followers:elonmusk`) into a safe file name.
 * @param {string} key
 * @returns {string}
 */
function fileNameFor(key) {
  const safe = String(key).replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');
  return `${safe || 'checkpoint'}.json`;
}

/**
 * Path of the item sidecar for a checkpoint file.
 * @param {string} filePath
 * @returns {string}
 */
function itemsPathFor(filePath) {
  return filePath.replace(/\.json$/, '') + '.items.jsonl';
}

/**
 * Write `data` to `filePath` atomically: the JSON goes to a temp file in the
 * same directory first and is renamed over the target, so a crash mid-write
 * leaves either the old checkpoint or the new one, never a torn file.
 * @param {string} filePath
 * @param {object} data
 */
function writeAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

/**
 * Create a checkpoint handle.
 *
 * @param {object} options
 * @param {string} options.key - Identifies the scrape, e.g. `followers:elonmusk`.
 *   Two runs with the same key share one checkpoint.
 * @param {string} [options.dir] - Directory for the file. Defaults to
 *   `$XACTIONS_HOME/checkpoints`.
 * @returns {{
 *   key: string,
 *   path: string,
 *   itemsPath: string,
 *   save: (state: { cursor: string|null, count?: number, meta?: object, items?: number }) => object,
 *   resume: () => ({ cursor: string|null, count: number, updatedAt: string, meta: object, items: number|null }|null),
 *   appendItems: (items: object[]) => void,
 *   loadItems: (max?: number) => object[],
 *   replaceItems: (items: object[]) => void,
 *   clearItems: () => void,
 *   clear: () => void,
 *   exists: () => boolean,
 * }}
 */
export function createCheckpoint({ key, dir } = {}) {
  if (!key || typeof key !== 'string') {
    throw new Error('createCheckpoint requires a string `key` (for example "followers:elonmusk").');
  }
  const directory = dir || path.join(resolveCacheDir(), CHECKPOINT_DIRNAME);
  const filePath = path.join(directory, fileNameFor(key));
  const itemsPath = itemsPathFor(filePath);

  return {
    key,
    path: filePath,
    itemsPath,

    /**
     * Persist the position after a page. Returns the record written.
     */
    save({ cursor = null, count = 0, meta = {}, items } = {}) {
      const record = {
        key,
        cursor: cursor || null,
        count: Number(count) || 0,
        updatedAt: new Date().toISOString(),
        meta: meta && typeof meta === 'object' ? meta : {},
      };
      // How many sidecar lines belong to this position (see appendItems).
      if (Number.isFinite(items)) record.items = items;
      writeAtomic(filePath, record);
      return record;
    },

    /**
     * Read the saved position, or null when there is none (or the file is
     * unreadable, which is treated the same as absent: a scrape must never
     * refuse to start because of a damaged checkpoint).
     */
    resume() {
      let text;
      try {
        text = fs.readFileSync(filePath, 'utf8');
      } catch {
        return null;
      }
      try {
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') return null;
        return {
          cursor: parsed.cursor || null,
          count: Number(parsed.count) || 0,
          updatedAt: parsed.updatedAt || null,
          meta: parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {},
          items: Number.isFinite(parsed.items) ? parsed.items : null,
        };
      } catch {
        return null;
      }
    },

    /**
     * Append collected items to the sidecar, one JSON line each. Called before
     * `save()` moves the cursor past them, so a crash between the two leaves
     * extra lines, which `loadItems(count)` ignores, never missing ones.
     */
    appendItems(items) {
      if (!Array.isArray(items) || items.length === 0) return;
      fs.mkdirSync(path.dirname(itemsPath), { recursive: true });
      fs.appendFileSync(itemsPath, items.map((item) => JSON.stringify(item)).join('\n') + '\n');
    },

    /**
     * Items saved by earlier runs, at most `max` of them. A torn last line
     * (a crash mid-append) is skipped.
     */
    loadItems(max = Infinity) {
      let text;
      try {
        text = fs.readFileSync(itemsPath, 'utf8');
      } catch {
        return [];
      }
      const items = [];
      for (const line of text.split('\n')) {
        if (items.length >= max) break;
        if (!line.trim()) continue;
        try {
          items.push(JSON.parse(line));
        } catch {
          // torn write: ignore
        }
      }
      return items;
    },

    /**
     * Rewrite the sidecar to hold exactly `items`, atomically. A resumed run
     * calls this so lines a crash left past the saved position are dropped
     * before new ones are appended after them.
     */
    replaceItems(items) {
      fs.mkdirSync(path.dirname(itemsPath), { recursive: true });
      const tmp = `${itemsPath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmp, items.map((item) => JSON.stringify(item) + '\n').join(''));
      fs.renameSync(tmp, itemsPath);
    },

    clearItems() {
      fs.rmSync(itemsPath, { force: true });
    },

    clear() {
      fs.rmSync(filePath, { force: true });
      fs.rmSync(itemsPath, { force: true });
    },

    exists() {
      return fs.existsSync(filePath);
    },
  };
}

/**
 * Bind an optional checkpoint to one pagination loop.
 *
 * Every paginated scraper (`scrapeFollowers`, `scrapeTweets`, `searchTweets`,
 * ...) calls this once before its loop. With no checkpoint it is a no-op
 * pass-through; with one, it resumes the cursor, shrinks the limit by what
 * earlier runs already collected, hands back the items those runs saved,
 * records the cursor (and the new items) after each page, and deletes the
 * files when the scrape completes.
 *
 * A resumed run whose limit was already met by earlier runs makes no
 * request: `limit` is 0, `items` holds what was saved, and `complete()`
 * keeps the checkpoint, so a later run with a larger limit still continues
 * from where the scrape stopped rather than from page one.
 *
 * @param {object|null|undefined} checkpoint - Handle from `createCheckpoint`.
 * @param {object} initial
 * @param {string|null} [initial.cursor] - Explicit cursor passed by the caller;
 *   a saved checkpoint cursor takes precedence over it.
 * @param {number} initial.limit - Requested item limit for the whole scrape.
 * @param {object} [initial.meta] - Stored alongside the cursor (username, query, ...).
 * @returns {{
 *   cursor: string|null,
 *   limit: number,
 *   resumed: boolean,
 *   items: object[],
 *   record: (cursor: string|null, fetchedThisRun: number, collected?: object[]) => void,
 *   complete: () => void,
 *   result: (collected: object[], requestedLimit?: number) => object[],
 * }}
 */
export function bindCheckpoint(checkpoint, { cursor = null, limit = Infinity, meta = {} } = {}) {
  if (!checkpoint || typeof checkpoint.resume !== 'function') {
    return {
      cursor,
      limit,
      resumed: false,
      items: [],
      record() {},
      complete() {},
      result: (collected) => collected.slice(0, limit),
    };
  }

  const saved = checkpoint.resume();
  const baseCount = saved ? saved.count : 0;
  const remaining = Number.isFinite(limit) ? Math.max(limit - baseCount, 0) : limit;
  const canStoreItems = typeof checkpoint.appendItems === 'function';

  // Items from earlier runs. A fresh scrape drops any sidecar left without a
  // checkpoint, so it never inherits another run's items.
  let items = [];
  if (canStoreItems) {
    if (saved) {
      items = checkpoint.loadItems(saved.items ?? baseCount);
      checkpoint.replaceItems?.(items);
    } else {
      checkpoint.clearItems?.();
    }
  }

  // Items of this run already written to the sidecar.
  let appended = 0;
  const limitMetByEarlierRuns = Boolean(saved) && remaining === 0;

  return {
    cursor: saved?.cursor || cursor,
    limit: remaining,
    resumed: Boolean(saved),
    items,
    record(nextCursor, fetchedThisRun, collected) {
      const storing = canStoreItems && Array.isArray(collected);
      if (storing && collected.length > appended) {
        checkpoint.appendItems(collected.slice(appended));
        appended = collected.length;
      }
      checkpoint.save({
        cursor: nextCursor,
        count: baseCount + (Number(fetchedThisRun) || 0),
        meta: { ...(saved?.meta || {}), ...meta },
        ...(storing ? { items: items.length + appended } : {}),
      });
    },
    complete() {
      if (limitMetByEarlierRuns) return;
      checkpoint.clear();
    },
    /**
     * The scrape's answer: earlier runs' items followed by this run's.
     * @param {object[]} collected - This run's items
     * @param {number} [requestedLimit] - The caller's full limit
     */
    result(collected, requestedLimit = limit) {
      return [...items, ...collected].slice(0, requestedLimit);
    },
  };
}

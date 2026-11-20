// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Processor registry.
 *
 * Every `*.processors.js` file in this directory default-exports a map from
 * job type to its definition:
 *
 *   export default {
 *     likeTweet: {
 *       run: async (ctx) => ({ success: true }),   // required
 *       concurrency: 3,                              // optional, default 2
 *       write: true,                                 // acts on the account
 *       description: 'Like one post',                // optional
 *       quiet: false,                                // true: no per-run log lines (frequent internal jobs)
 *       ownQueue: false,                             // true: a queue of its own (see below)
 *     },
 *   };
 *
 * The queue registers exactly these types, and refuses to enqueue any other,
 * so a route can never accept (or charge for) work that nothing will run.
 *
 * Most types share one queue, each held to its own `concurrency` there. A job
 * waiting for its type's limit holds one of that queue's slots, so a type that
 * runs one at a time (`concurrency: 1`) gets a queue of its own, and so does
 * one that declares `ownQueue: true`. Declare it on a type that can run for
 * hours at a limit above one; each such queue costs one Redis connection.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** A job type with no processor on this server. */
export class UnsupportedOperationError extends Error {
  constructor(type) {
    super(`The "${type}" operation is not available on this server.`);
    this.name = 'UnsupportedOperationError';
    this.code = 'UNSUPPORTED_OPERATION';
    this.status = 501;
    this.type = type;
  }
}

const cache = new Map();

/**
 * Load and validate every processor module in a directory.
 *
 * @param {string} [dir]
 * @returns {Promise<Map<string, { run: Function, concurrency: number, write: boolean, quiet: boolean, ownQueue: boolean, description: string, source: string }>>}
 */
export async function loadProcessors(dir = HERE) {
  if (cache.has(dir)) return cache.get(dir);

  const load = (async () => {
    const processors = new Map();
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.processors.js')).sort();
    for (const file of files) {
      const mod = await import(pathToFileURL(path.join(dir, file)).href);
      for (const [type, def] of Object.entries(mod.default || {})) {
        if (typeof def?.run !== 'function') {
          throw new Error(`${file}: processor "${type}" has no run(ctx) function`);
        }
        if (processors.has(type)) {
          throw new Error(`${file}: processor "${type}" is already defined in ${processors.get(type).source}`);
        }
        processors.set(type, {
          run: def.run,
          concurrency: def.concurrency ?? 2,
          write: Boolean(def.write),
          quiet: Boolean(def.quiet),
          ownQueue: Boolean(def.ownQueue),
          description: def.description || '',
          source: file,
        });
      }
    }
    return processors;
  })();

  cache.set(dir, load);
  return load;
}

/**
 * Throw unless the type has a processor.
 * @param {Map} processors
 * @param {string} type
 */
export function assertRunnable(processors, type) {
  if (!type || !processors.has(type)) throw new UnsupportedOperationError(type);
}

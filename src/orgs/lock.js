// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * A cross-process lock for the organization files.
 *
 * Two members can run `xactions org` against the same directory at once (a
 * cron `publish` while an editor approves). A temp-file rename keeps each
 * write whole, but without a lock the last writer wins and the other change
 * is lost. The lock is a sibling `<file>.lock` opened with O_EXCL, which is
 * atomic on every local filesystem Node supports; a lock older than
 * `staleMs` belongs to a process that died holding it and is taken over.
 * Critical sections are a JSON read and write, so waits are milliseconds.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { closeSync, mkdirSync, openSync, statSync, unlinkSync, writeSync } from 'node:fs';
import { dirname } from 'node:path';

const sleeper = new Int32Array(new SharedArrayBuffer(4));

/**
 * Run `fn` while holding an exclusive lock on `target`. `fn` must be
 * synchronous; the lock is released when it returns or throws.
 *
 * @template T
 * @param {string} target
 * @param {() => T} fn
 * @param {{timeoutMs?: number, staleMs?: number}} [options]
 * @returns {T}
 */
export function withLock(target, fn, { timeoutMs = 10_000, staleMs = 30_000 } = {}) {
  const lockPath = `${target}.lock`;
  mkdirSync(dirname(lockPath), { recursive: true });
  const deadline = Date.now() + timeoutMs;
  let fd;
  for (;;) {
    try {
      fd = openSync(lockPath, 'wx', 0o600);
      break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    try {
      if (Date.now() - statSync(lockPath).mtimeMs > staleMs) {
        unlinkSync(lockPath);
        continue;
      }
    } catch (error) {
      if (error.code === 'ENOENT') continue;
      throw error;
    }
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${lockPath}; if no other xactions process is running, delete it.`);
    Atomics.wait(sleeper, 0, 0, 25);
  }
  try {
    writeSync(fd, String(process.pid));
    return fn();
  } finally {
    closeSync(fd);
    try {
      unlinkSync(lockPath);
    } catch {
      // Already taken over as stale; nothing to release.
    }
  }
}

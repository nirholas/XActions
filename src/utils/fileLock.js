// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * A cross-process lock for the small JSON stores under XACTIONS_HOME.
 *
 * The draft store and the action ledger are read, changed and written back
 * by more than one process at a time: Claude Desktop and Claude Code each
 * start their own `npx xactions-mcp`, and `xactions drafts approve` runs next
 * to both. A temp-file rename keeps each write whole, but without a lock the
 * last writer wins and the other process's change is gone: charges vanish
 * from the ledger and a draft created mid-approve disappears.
 *
 * The lock is a sibling `<file>.lock` created with O_EXCL, which is atomic on
 * every local filesystem Node supports. A lock older than `staleMs` belongs to
 * a process that died inside the critical section and is taken over. The
 * critical sections it guards are a JSON read and write, so they take
 * milliseconds and the wait is a short synchronous sleep.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { closeSync, mkdirSync, openSync, statSync, unlinkSync, writeSync } from 'node:fs';
import { dirname } from 'node:path';

const sleeper = new Int32Array(new SharedArrayBuffer(4));

function sleepSync(ms) {
  Atomics.wait(sleeper, 0, 0, ms);
}

/**
 * Run `fn` while holding an exclusive lock on `target`. `fn` must be
 * synchronous: the lock is released as soon as it returns.
 *
 * @template T
 * @param {string} target the file being protected
 * @param {() => T} fn
 * @param {{ timeoutMs?: number, staleMs?: number }} [options]
 * @returns {T}
 */
export function withFileLock(target, fn, { timeoutMs = 10_000, staleMs = 30_000 } = {}) {
  const lockPath = `${target}.lock`;
  mkdirSync(dirname(lockPath), { recursive: true });
  const deadline = Date.now() + timeoutMs;

  let fd;
  for (;;) {
    try {
      fd = openSync(lockPath, 'wx');
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
      // Released between our open and our stat: try again straight away.
      if (error.code === 'ENOENT') continue;
      throw error;
    }

    if (Date.now() > deadline) {
      throw new Error(`Timed out after ${timeoutMs} ms waiting for ${lockPath}. If no other xactions process is running, delete it.`);
    }
    sleepSync(5 + Math.floor(Math.random() * 20));
  }

  try {
    writeSync(fd, String(process.pid));
    return fn();
  } finally {
    closeSync(fd);
    try {
      unlinkSync(lockPath);
    } catch {
      // Already taken over as stale; nothing left to release.
    }
  }
}

export default withFileLock;

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The organization's audit log: who did what, to which account, and when.
 *
 * One JSON object per line in `audit.jsonl`. Each entry carries the SHA-256
 * of the entry before it, so the file is a hash chain: editing, deleting or
 * reordering any past line breaks every hash after it, and `verifyAudit()`
 * reports the first line that no longer matches. It does not stop someone
 * with write access to the file from rewriting the whole chain, but it does
 * stop a quiet edit to one line, which is the realistic failure in a shared
 * team directory.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { withLock as withFileLock } from './lock.js';

/** Hash of the entry before the first one. */
export const GENESIS = '0'.repeat(64);

function hashEntry(entry) {
  const { hash: _ignored, ...body } = entry;
  return createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

/**
 * Read every entry, oldest first. A blank file is an empty log.
 * @param {string} file
 * @returns {object[]}
 */
export function readAudit(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`Audit log ${file} line ${index + 1} is not JSON`);
      }
    });
}

/**
 * Append one entry under a lock, chained to the last one.
 * @param {string} file
 * @param {{actor: string, action: string, details?: object}} event
 * @param {{now?: number}} [options]
 * @returns {object} the entry as written
 */
export function appendAudit(file, { actor, action, details = {} }, { now = Date.now() } = {}) {
  return withFileLock(file, () => {
    const entries = readAudit(file);
    const last = entries.at(-1);
    const entry = {
      seq: (last?.seq ?? 0) + 1,
      at: new Date(now).toISOString(),
      actor,
      action,
      details,
      prev: last?.hash ?? GENESIS,
    };
    entry.hash = hashEntry(entry);
    appendFileSync(file, JSON.stringify(entry) + '\n', { encoding: 'utf8', mode: 0o600 });
    return entry;
  });
}

/**
 * Check the chain end to end.
 * @param {string} file
 * @returns {{ok: true, entries: number} | {ok: false, entries: number, brokenAt: number, reason: string}}
 */
export function verifyAudit(file) {
  const entries = readAudit(file);
  let prev = GENESIS;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.seq !== i + 1) return { ok: false, entries: entries.length, brokenAt: i + 1, reason: `expected seq ${i + 1}, found ${entry.seq}` };
    if (entry.prev !== prev) return { ok: false, entries: entries.length, brokenAt: i + 1, reason: 'prev does not match the hash of the entry before it' };
    if (hashEntry(entry) !== entry.hash) return { ok: false, entries: entries.length, brokenAt: i + 1, reason: 'contents do not match the recorded hash' };
    prev = entry.hash;
  }
  return { ok: true, entries: entries.length };
}

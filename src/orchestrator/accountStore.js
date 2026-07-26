// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Orchestrator Account Store
 *
 * JSON-backed store for the multi-account fleet. Loads, validates and
 * normalises account records from `~/.xactions/accounts.json`, and
 * serialises every status write through an in-process mutex + atomic
 * rename so concurrent account workers can never interleave a
 * read-modify-write cycle or truncate the store mid-write.
 *
 * Record shape:
 * ```json
 * {
 *   "handle": "someuser",
 *   "cookies": "auth_token=...; ct0=...",
 *   "proxyUrl": "http://user:pass@host:port",
 *   "userAgent": "...",
 *   "status": "active",
 *   "lastUsed": null
 * }
 * ```
 *
 * `updateAccountStatus` is the only persistence seam — swapping JSON for
 * Prisma later means reimplementing that function and `saveAccounts`,
 * nothing else.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.xactions');

/**
 * Absolute path to the fleet account store.
 * @type {string}
 */
export const ACCOUNTS_FILE = path.join(CONFIG_DIR, 'accounts.json');

const AUTH_TOKEN_RE = /(^|;\s*)auth_token=[^;\s]+/;
const CT0_RE = /(^|;\s*)ct0=[^;\s]+/;

const EXAMPLE_RECORD = `[
  {
    "handle": "someuser",
    "cookies": "auth_token=...; ct0=...",
    "proxyUrl": "http://user:pass@host:port",
    "userAgent": "Mozilla/5.0 ...",
    "status": "active",
    "lastUsed": null
  }
]`;

// ---------------------------------------------------------------------------
// Write serialization — one in-process promise chain for all mutations
// ---------------------------------------------------------------------------

let writeQueue = Promise.resolve();

/**
 * Run `fn` after every previously queued mutation has settled.
 * Guarantees read-modify-write cycles never interleave across the
 * in-flight account workers.
 *
 * @param {() => Promise<any>} fn
 * @returns {Promise<any>}
 */
const serialize = (fn) => {
  const next = writeQueue.then(fn, fn);
  writeQueue = next.catch(() => {});
  return next;
};

/**
 * Write the store atomically: temp file in the same directory, then rename.
 * A crash mid-write leaves the previous store intact.
 *
 * @param {Object[]} accounts
 * @returns {Promise<void>}
 */
async function writeAccountsFile(accounts) {
  await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const tmpFile = `${ACCOUNTS_FILE}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try {
    // mode 0o600 explicitly: this file holds live session cookies. Without it the
    // temp file is created 0644 (0666 & umask) and the rename SILENTLY DOWNGRADES
    // an operator-hardened `chmod 600 accounts.json` to world-readable on the very
    // first status write.
    await fs.writeFile(tmpFile, `${JSON.stringify(accounts, null, 2)}\n`, { encoding: 'utf-8', mode: 0o600 });
    await fs.chmod(tmpFile, 0o600);
    await fs.rename(tmpFile, ACCOUNTS_FILE);
  } catch (err) {
    await fs.rm(tmpFile, { force: true }).catch(() => {});
    throw err;
  }
}

/**
 * Read + parse the store without touching the write queue.
 * @returns {Promise<Object[]>}
 */
async function readAccountsFile() {
  let raw;
  try {
    raw = await fs.readFile(ACCOUNTS_FILE, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // The parser's message quotes surrounding file text, which here would be a
    // cookie fragment — report the position only.
    throw new Error(
      `❌ Account store is not valid JSON: ${ACCOUNTS_FILE} (parse failed at position ${err.message.match(/position (\d+)/)?.[1] ?? 'unknown'}). ` +
        'Fix or restore the file; refusing to continue with an empty fleet.',
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `❌ Account store must be a JSON array of account records: ${ACCOUNTS_FILE} ` +
        `(got ${parsed === null ? 'null' : typeof parsed}).`,
    );
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load every account record from `~/.xactions/accounts.json`.
 *
 * A missing file is a normal first-run state — returns `[]` after printing
 * a hint. Malformed JSON or a non-array top level throws: a corrupt store
 * must be loud, never silently degraded to an empty fleet.
 *
 * @returns {Promise<Object[]>} Raw (un-normalised) account records.
 * @throws {Error} If the file exists but is unparseable or not an array.
 */
export async function loadAccounts() {
  const accounts = await readAccountsFile();

  if (accounts === null) {
    console.log(`⚠️  No account store found at ${ACCOUNTS_FILE}`);
    console.log('⚠️  Create it with an array of account records, e.g.:');
    console.log(EXAMPLE_RECORD);
    return [];
  }

  return accounts;
}

/**
 * Validate a single account record.
 *
 * Cookie values are never echoed into `errors` — only the name of the
 * missing piece is reported.
 *
 * @param {Object} account — Raw account record.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAccount(account) {
  const errors = [];

  if (!account || typeof account !== 'object' || Array.isArray(account)) {
    return { valid: false, errors: ['account must be an object'] };
  }

  // handle — required; it is the self-target for read tasks
  const handle = typeof account.handle === 'string' ? account.handle.replace(/^@/, '').trim() : '';
  if (typeof account.handle !== 'string') {
    errors.push('handle is required and must be a string');
  } else if (handle.length === 0) {
    errors.push('handle must not be empty');
  }

  // cookies — required; must carry both auth_token and ct0
  if (typeof account.cookies !== 'string') {
    errors.push('cookies is required and must be a string');
  } else if (account.cookies.trim().length === 0) {
    errors.push('cookies must not be empty');
  } else {
    if (!AUTH_TOKEN_RE.test(account.cookies)) {
      errors.push('cookies is missing the auth_token entry');
    }
    if (!CT0_RE.test(account.cookies)) {
      errors.push('cookies is missing the ct0 entry');
    }
  }

  // proxyUrl — optional, but must parse when present
  if (account.proxyUrl !== undefined && account.proxyUrl !== null && account.proxyUrl !== '') {
    if (typeof account.proxyUrl !== 'string') {
      errors.push('proxyUrl must be a string when present');
    } else {
      try {
        new URL(account.proxyUrl);
      } catch {
        errors.push('proxyUrl is not a parseable URL');
      }
    }
  }

  // userAgent — optional string
  if (account.userAgent !== undefined && account.userAgent !== null && typeof account.userAgent !== 'string') {
    errors.push('userAgent must be a string when present');
  }

  // status — optional string
  if (account.status !== undefined && account.status !== null && typeof account.status !== 'string') {
    errors.push('status must be a string when present');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Normalise an account record: lowercase `@`-stripped handle, defaulted
 * `status` and `lastUsed`. Shallow copy — the original is untouched.
 *
 * @param {Object} account — Raw account record.
 * @returns {Object} Normalised copy.
 */
export function normalizeAccount(account) {
  if (!account || typeof account !== 'object') return { handle: '', status: 'invalid', lastUsed: null };

  const handle = typeof account.handle === 'string' ? account.handle.replace(/^@/, '').trim().toLowerCase() : account.handle;

  return {
    ...account,
    handle,
    status: account.status ?? 'active',
    lastUsed: account.lastUsed ?? null,
  };
}

/**
 * Persist the full account list, backing up any existing store first. Routed
 * through the same write mutex + atomic rename as `updateAccountStatus`, and
 * writes 0600 so a store of live cookies is never world-readable. Used by import.
 *
 * @param {Object[]} accounts
 * @returns {Promise<void>}
 */
export async function saveAccounts(accounts) {
  if (!Array.isArray(accounts)) {
    throw new Error('❌ saveAccounts expects an array of account records.');
  }
  return serialize(async () => {
    try {
      const prev = await fs.readFile(ACCOUNTS_FILE, 'utf-8');
      await fs.writeFile(`${ACCOUNTS_FILE}.bak-${Date.now()}`, prev, { mode: 0o600 });
    } catch { /* no previous store */ }
    await writeAccountsFile(accounts);
  });
}

/**
 * Update one account's status in the store.
 *
 * The entire read-modify-write cycle runs inside the in-process mutex, so
 * up to 40 concurrent workers calling this cannot clobber each other. An
 * unknown handle logs a warning and resolves — a status update must never
 * kill a fleet run.
 *
 * This is the sole persistence seam for per-account state; a future
 * JSON→Prisma swap replaces the body and keeps this signature.
 *
 * @param {string} handle — Account handle (`@` and case insensitive).
 * @param {string} status — New status, e.g. 'active' | 'expired' | 'banned'.
 * @param {Object} [extra] — Extra fields merged into the record, e.g. `{ reason: 'expired' }`.
 * @returns {Promise<void>}
 */
export async function updateAccountStatus(handle, status, extra = {}) {
  const target = typeof handle === 'string' ? handle.replace(/^@/, '').trim().toLowerCase() : '';

  return serialize(async () => {
    if (!target) {
      console.log('⚠️  updateAccountStatus called without a handle — skipping.');
      return;
    }

    const accounts = await readAccountsFile();
    if (accounts === null) {
      console.log(`⚠️  No account store at ${ACCOUNTS_FILE} — cannot update @${target}.`);
      return;
    }

    const index = accounts.findIndex(
      (acc) =>
        typeof acc?.handle === 'string' &&
        acc.handle.replace(/^@/, '').trim().toLowerCase() === target,
    );

    if (index === -1) {
      console.log(`⚠️  Account @${target} not found in ${ACCOUNTS_FILE} — status update skipped.`);
      return;
    }

    accounts[index] = {
      ...accounts[index],
      ...extra,
      status,
      lastUsed: new Date().toISOString(),
    };

    await writeAccountsFile(accounts);
  });
}

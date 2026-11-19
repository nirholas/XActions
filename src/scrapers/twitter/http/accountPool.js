// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Account Pool and Pooled Client
 *
 * One X session gets roughly 50 GraphQL calls per operation per 15 minutes.
 * A follower scrape of any real size needs more than that, so this module
 * spreads calls over several accounts the way vladkens/twscrape does:
 *
 * - Every account is a row in `$XACTIONS_HOME/accounts.db` (SQLite through
 *   the already-installed `better-sqlite3`), with its cookies, optional proxy,
 *   lock state, and last-used time. Rate-limit windows are tracked per
 *   account per GraphQL operation from the `x-rate-limit-remaining` and
 *   `x-rate-limit-reset` headers of every response, so the state survives
 *   process restarts and is shared between processes on the same machine.
 * - `acquire(operation)` hands out the least-recently-used account that is
 *   unlocked, not leased, and not inside a rate-limit window for that
 *   operation. When every account is cooling down it waits for the earliest
 *   reset (bounded by `maxWaitMs`), and throws a clear error when nothing can
 *   ever serve.
 * - `createPooledClient(pool)` looks like a single `TwitterHttpClient`
 *   (`graphql`, `request`, `rest`, `graphqlPaginate`, `isAuthenticated`) and
 *   rotates accounts on its own for reads: a 429 or a spent window moves the
 *   same call to the next account, and a 401, or a 403 whose body says the
 *   account is suspended or locked, locks the account and moves on. Any other
 *   403 (a Cloudflare page, a refused write) is rethrown and locks nothing.
 *   Writes are never rotated: a mutation retried on the next account would be
 *   posted as a different user.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { TwitterHttpClient } from './client.js';
import { REST_BASE, graphqlRequestMethod } from './endpoints.js';
import { AuthError, RateLimitError, TwitterApiError } from './errors.js';
import { resolveCacheDir } from './queryIds.js';
import { parseCookieInput } from '../../../client/auth/cookieImport.js';

const DB_FILENAME = 'accounts.db';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Thrown when the pool cannot hand out an account: none configured, all
 * locked, or the wait for the next reset exceeds `maxWaitMs`.
 */
export class AccountPoolError extends TwitterApiError {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {string} [options.operation]
   * @param {number|null} [options.nextResetAt] - Earliest reset among cooling accounts (ms)
   */
  constructor(message, { operation, nextResetAt = null } = {}) {
    super(message, { endpoint: operation });
    this.name = 'AccountPoolError';
    this.operation = operation;
    this.nextResetAt = nextResetAt;
  }
}

// ---------------------------------------------------------------------------
// Cookie normalisation
// ---------------------------------------------------------------------------

/**
 * Accept every cookie shape a caller might have and return one header string.
 *
 * - `"auth_token=...; ct0=..."`, Netscape cookies.txt text, Cookie-Editor JSON,
 *   Playwright storageState (all through `parseCookieInput`)
 * - an array of `{ name, value }` objects
 * - a `{ auth_token, ct0, ... }` map
 *
 * @param {string|Array<{name:string,value:string}>|Record<string,string>} input
 * @returns {string}
 */
export function normalizeCookies(input) {
  if (typeof input === 'string') {
    const parsed = parseCookieInput(input);
    return parsed.map((c) => `${c.name}=${c.value}`).join('; ');
  }
  if (Array.isArray(input)) {
    return input
      .filter((c) => c && c.name && c.value != null)
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
  }
  if (input && typeof input === 'object') {
    return Object.entries(input)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
  throw new Error('Unsupported cookie input: pass a cookie string, an array of { name, value }, or a { auth_token, ct0 } object.');
}

/**
 * Build the cookie string for an account definition.
 * @param {object} account
 * @returns {string}
 */
function cookiesFromAccount(account) {
  if (account.cookies) return normalizeCookies(account.cookies);
  if (account.authToken && account.ct0) {
    return `auth_token=${account.authToken}; ct0=${account.ct0}`;
  }
  throw new Error(
    `Account "${account.name}" needs either \`cookies\` or both \`authToken\` and \`ct0\`.`,
  );
}

/**
 * Operation name for a request URL: the GraphQL operation for
 * `/i/api/graphql/<id>/<Operation>`, the path for REST calls.
 * @param {string} url
 * @returns {string}
 */
export function operationFromUrl(url) {
  try {
    const { pathname } = new URL(url);
    const gql = pathname.match(/\/graphql\/[^/]+\/([^/?]+)/);
    if (gql) return gql[1];
    return pathname;
  } catch {
    return String(url);
  }
}

// ---------------------------------------------------------------------------
// SQLite schema
// ---------------------------------------------------------------------------

/**
 * Restrict a file to its owner, when it exists. The store holds session
 * cookies for every account, so it must not be world-readable.
 * @param {string} file
 */
function chmodOwnerOnly(file) {
  try {
    fs.chmodSync(file, 0o600);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

function openDatabase(storePath) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true, mode: 0o700 });
  // Create the file owner-only before SQLite opens it; SQLite gives the
  // -wal and -shm files the database file's permissions.
  fs.closeSync(fs.openSync(storePath, 'a', 0o600));
  chmodOwnerOnly(storePath);
  const db = new Database(storePath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      name        TEXT PRIMARY KEY,
      cookies     TEXT NOT NULL,
      proxy       TEXT,
      locked      INTEGER NOT NULL DEFAULT 0,
      lock_reason TEXT,
      locked_at   INTEGER,
      last_used   INTEGER NOT NULL DEFAULT 0,
      added_at    INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rate_limits (
      account     TEXT NOT NULL,
      operation   TEXT NOT NULL,
      remaining   INTEGER,
      reset_at    INTEGER,
      updated_at  INTEGER NOT NULL,
      PRIMARY KEY (account, operation),
      FOREIGN KEY (account) REFERENCES accounts(name) ON DELETE CASCADE
    );
  `);
  // Soft locks (a CSRF mismatch, say) expire; hard locks (suspended) do not.
  const columns = db.prepare('PRAGMA table_info(accounts)').all().map((c) => c.name);
  if (!columns.includes('lock_until')) {
    db.exec('ALTER TABLE accounts ADD COLUMN lock_until INTEGER');
  }
  db.pragma('foreign_keys = ON');
  chmodOwnerOnly(`${storePath}-wal`);
  chmodOwnerOnly(`${storePath}-shm`);
  return db;
}

// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

/**
 * Create (or reopen) an account pool.
 *
 * @param {object} [options]
 * @param {Array<{name:string, cookies?:any, authToken?:string, ct0?:string, proxy?:string}>} [options.accounts]
 *   Accounts to upsert on creation. Accounts already in the store stay there.
 * @param {string} [options.storePath] - SQLite file. Defaults to
 *   `$XACTIONS_HOME/accounts.db` (`~/.xactions/accounts.db`).
 * @param {object} [options.clientOptions] - Passed to every account's
 *   `TwitterHttpClient` (`fetch`, `userAgent`, `maxRetries`, `debug`, ...).
 * @param {number} [options.maxWaitMs=900000] - Default upper bound `acquire`
 *   will wait for a rate-limit reset (15 minutes, one full X window).
 * @param {function} [options.now] - Clock, for tests.
 */
export function createAccountPool(options = {}) {
  const storePath = options.storePath || path.join(resolveCacheDir(), DB_FILENAME);
  const clientOptions = options.clientOptions || {};
  const defaultMaxWaitMs = options.maxWaitMs ?? 15 * 60_000;
  const now = options.now || (() => Date.now());

  const db = openDatabase(storePath);
  const clients = new Map(); // name -> TwitterHttpClient
  const leased = new Set(); // names currently handed out by acquire()

  const stmts = {
    upsert: db.prepare(`
      INSERT INTO accounts (name, cookies, proxy, added_at)
      VALUES (@name, @cookies, @proxy, @added_at)
      ON CONFLICT(name) DO UPDATE SET cookies = excluded.cookies, proxy = excluded.proxy
    `),
    remove: db.prepare('DELETE FROM accounts WHERE name = ?'),
    get: db.prepare('SELECT * FROM accounts WHERE name = ?'),
    all: db.prepare('SELECT * FROM accounts ORDER BY added_at ASC, name ASC'),
    touch: db.prepare('UPDATE accounts SET last_used = ? WHERE name = ?'),
    lock: db.prepare('UPDATE accounts SET locked = 1, lock_reason = ?, locked_at = ?, lock_until = ? WHERE name = ?'),
    unlock: db.prepare('UPDATE accounts SET locked = 0, lock_reason = NULL, locked_at = NULL, lock_until = NULL WHERE name = ?'),
    expireLocks: db.prepare(
      'UPDATE accounts SET locked = 0, lock_reason = NULL, locked_at = NULL, lock_until = NULL WHERE locked = 1 AND lock_until IS NOT NULL AND lock_until <= ?',
    ),
    limitFor: db.prepare('SELECT * FROM rate_limits WHERE account = ? AND operation = ?'),
    limitsFor: db.prepare('SELECT * FROM rate_limits WHERE account = ?'),
    setLimit: db.prepare(`
      INSERT INTO rate_limits (account, operation, remaining, reset_at, updated_at)
      VALUES (@account, @operation, @remaining, @reset_at, @updated_at)
      ON CONFLICT(account, operation) DO UPDATE SET
        remaining = excluded.remaining, reset_at = excluded.reset_at, updated_at = excluded.updated_at
    `),
    candidates: db.prepare('SELECT * FROM accounts WHERE locked = 0 ORDER BY last_used ASC, added_at ASC, name ASC'),
  };

  /**
   * Whether `row` can serve `operation` right now, and if not, when it can.
   * @returns {{ ready: boolean, resetAt: number|null }}
   */
  function availability(row, operation) {
    const limit = stmts.limitFor.get(row.name, operation);
    if (!limit) return { ready: true, resetAt: null };
    const t = now();
    if (limit.reset_at && limit.reset_at <= t) return { ready: true, resetAt: null };
    if (limit.remaining != null && limit.remaining <= 0) {
      return { ready: false, resetAt: limit.reset_at || t + 60_000 };
    }
    return { ready: true, resetAt: null };
  }

  function clientFor(row) {
    let client = clients.get(row.name);
    if (client && client._poolCookies === row.cookies && client._poolProxy === (row.proxy || null)) {
      return client;
    }
    client = new TwitterHttpClient({
      ...clientOptions,
      cookies: row.cookies,
      proxy: row.proxy || clientOptions.proxy || null,
      rateLimitStrategy: 'error',
      onResponse: (info) => {
        pool.recordResponse(row.name, operationFromUrl(info.url), info);
        clientOptions.onResponse?.({ ...info, account: row.name });
      },
    });
    client._poolCookies = row.cookies;
    client._poolProxy = row.proxy || null;
    clients.set(row.name, client);
    return client;
  }

  function rowToInfo(row) {
    const t = now();
    const limits = {};
    for (const l of stmts.limitsFor.all(row.name)) {
      limits[l.operation] = {
        remaining: l.remaining,
        resetAt: l.reset_at,
        coolingDown: Boolean(l.remaining != null && l.remaining <= 0 && l.reset_at && l.reset_at > t),
      };
    }
    return {
      name: row.name,
      proxy: row.proxy || null,
      locked: Boolean(row.locked),
      lockReason: row.lock_reason || null,
      lockedAt: row.locked_at || null,
      lockedUntil: row.lock_until || null,
      lastUsed: row.last_used || null,
      addedAt: row.added_at,
      leased: leased.has(row.name),
      limits,
    };
  }

  const pool = {
    storePath,

    // ---- Management (CLI-facing) ----------------------------------------

    /**
     * Add or update an account. Cookies may be any format `parseCookieInput`
     * understands, an array of `{ name, value }`, a map, or `authToken` + `ct0`.
     */
    add(account) {
      if (!account || !account.name) throw new Error('add() requires an account with a `name`.');
      const cookies = cookiesFromAccount(account);
      if (!/(^|;\s*)auth_token=/.test(cookies)) {
        throw new Error(`Account "${account.name}" has no auth_token cookie; it cannot make authenticated calls.`);
      }
      stmts.upsert.run({
        name: account.name,
        cookies,
        proxy: account.proxy || null,
        added_at: now(),
      });
      clients.delete(account.name);
      return pool.get(account.name);
    },

    /**
     * Import accounts from cookie-file text (any supported export format).
     * @param {string} name
     * @param {string} text - Contents of cookies.txt / JSON export / header string
     * @param {object} [extra] - `{ proxy }`
     */
    importCookies(name, text, extra = {}) {
      return pool.add({ name, cookies: text, proxy: extra.proxy });
    },

    remove(name) {
      const result = stmts.remove.run(name);
      clients.delete(name);
      leased.delete(name);
      return result.changes > 0;
    },

    get(name) {
      stmts.expireLocks.run(now());
      const row = stmts.get.get(name);
      return row ? rowToInfo(row) : null;
    },

    list() {
      stmts.expireLocks.run(now());
      return stmts.all.all().map(rowToInfo);
    },

    size() {
      return stmts.all.all().length;
    },

    // ---- Lock state --------------------------------------------------------

    /**
     * Take an account out of rotation.
     * @param {string} name
     * @param {string} [reason]
     * @param {object} [opts]
     * @param {number} [opts.ttlMs] - Unlock automatically after this long;
     *   omitted, the lock stays until `unlock()`.
     */
    markLocked(name, reason = 'locked', opts = {}) {
      const t = now();
      const until = Number.isFinite(opts.ttlMs) && opts.ttlMs > 0 ? t + opts.ttlMs : null;
      stmts.lock.run(String(reason), t, until, name);
      leased.delete(name);
    },

    unlock(name) {
      stmts.unlock.run(name);
    },

    // ---- Rate-limit tracking ---------------------------------------------

    /**
     * Record a response's rate-limit headers for `(account, operation)`.
     * A 429 with no reset header is treated as a spent window that reopens in
     * 15 minutes, which is X's window length.
     */
    recordResponse(name, operation, { status, remaining, resetAt } = {}) {
      const t = now();
      let rem = remaining;
      let reset = resetAt;
      if (status === 429) {
        rem = 0;
        reset = reset || t + 15 * 60_000;
      }
      if (rem == null && reset == null) return;
      stmts.setLimit.run({
        account: name,
        operation,
        remaining: rem == null ? null : Number(rem),
        reset_at: reset == null ? null : Number(reset),
        updated_at: t,
      });
    },

    /**
     * Mark an operation's window as spent for an account (used on a thrown
     * RateLimitError, whose `resetAt` came from the 429 response).
     */
    markRateLimited(name, operation, resetAt) {
      pool.recordResponse(name, operation, { status: 429, remaining: 0, resetAt: resetAt || null });
    },

    // ---- Leasing -----------------------------------------------------------

    /**
     * Lease the least-recently-used account that can serve `operation`.
     *
     * @param {string} operation - GraphQL operation name (`Followers`, ...)
     * @param {object} [opts]
     * @param {number} [opts.maxWaitMs] - Longest wait for a reset before throwing
     * @param {Iterable<string>} [opts.exclude] - Account names to skip
     * @returns {Promise<{ name: string, client: TwitterHttpClient, release: () => void }>}
     * @throws {AccountPoolError}
     */
    async acquire(operation, opts = {}) {
      const maxWaitMs = opts.maxWaitMs ?? defaultMaxWaitMs;
      const exclude = new Set(opts.exclude || []);
      const startedAt = now();

      for (;;) {
        stmts.expireLocks.run(now());
        const rows = stmts.candidates.all().filter((r) => !exclude.has(r.name) && !leased.has(r.name));
        if (rows.length === 0) {
          const total = stmts.all.all().length;
          const message =
            total === 0
              ? 'The account pool is empty. Add an account with pool.add({ name, cookies }) or `xactions accounts add`.'
              : `No account can serve ${operation}: every account is locked, excluded, or already in use.`;
          throw new AccountPoolError(message, { operation });
        }

        let earliestReset = null;
        for (const row of rows) {
          const { ready, resetAt } = availability(row, operation);
          if (ready) {
            leased.add(row.name);
            stmts.touch.run(now(), row.name);
            const client = clientFor(row);
            let released = false;
            return {
              name: row.name,
              client,
              release: () => {
                if (released) return;
                released = true;
                leased.delete(row.name);
              },
            };
          }
          if (earliestReset == null || resetAt < earliestReset) earliestReset = resetAt;
        }

        const waitMs = Math.max(earliestReset - now(), 0) + 250;
        const elapsed = now() - startedAt;
        if (elapsed + waitMs > maxWaitMs) {
          throw new AccountPoolError(
            `Every account is rate-limited on ${operation}; the next window opens at ${new Date(earliestReset).toISOString()}, beyond the ${maxWaitMs}ms wait budget.`,
            { operation, nextResetAt: earliestReset },
          );
        }
        await sleep(waitMs);
      }
    },

    release(nameOrLease) {
      if (nameOrLease && typeof nameOrLease === 'object' && typeof nameOrLease.release === 'function') {
        nameOrLease.release();
        return;
      }
      leased.delete(nameOrLease);
    },

    // ---- Introspection -----------------------------------------------------

    stats() {
      const accounts = pool.list();
      const t = now();
      const coolingDown = (a) => Object.values(a.limits).some((l) => l.coolingDown);
      return {
        storePath,
        total: accounts.length,
        locked: accounts.filter((a) => a.locked).length,
        leased: accounts.filter((a) => a.leased).length,
        available: accounts.filter((a) => !a.locked && !a.leased && !coolingDown(a)).length,
        coolingDown: accounts.filter((a) => !a.locked && coolingDown(a)).length,
        nextResetAt: accounts
          .flatMap((a) => Object.values(a.limits))
          .filter((l) => l.coolingDown && l.resetAt > t)
          .reduce((min, l) => (min == null || l.resetAt < min ? l.resetAt : min), null),
        accounts,
      };
    },

    close() {
      db.close();
      clients.clear();
      leased.clear();
    },
  };

  for (const account of options.accounts || []) {
    pool.add(account);
  }

  return pool;
}

// ---------------------------------------------------------------------------
// Pooled client
// ---------------------------------------------------------------------------

/**
 * X error codes that mean the account itself cannot serve: it is suspended,
 * locked, or its session is gone. Only these (or a 401) lock an account.
 * A 403 without one of them is a Cloudflare page, a refused write, a
 * protected target: nothing a different account changes for good.
 */
const DEAD_ACCOUNT_CODES = new Map([
  [32, 'could not authenticate'],
  [64, 'suspended'],
  [89, 'invalid or expired token'],
  [326, 'locked'],
]);

/**
 * Codes that mean this session's cookies are out of step rather than the
 * account being gone: 353 is a ct0/CSRF mismatch. The account is parked for
 * `softLockMs` and comes back on its own.
 */
const SOFT_LOCK_CODES = new Map([[353, 'CSRF token mismatch']]);

/** Default time a soft-locked account sits out. */
const DEFAULT_SOFT_LOCK_MS = 60 * 60_000;

function errorCodes(err) {
  const errors = Array.isArray(err?.data?.errors) ? err.data.errors : [];
  return errors.map((e) => Number(e?.code)).filter(Number.isFinite);
}

/**
 * What an auth failure says about the account that got it.
 * @param {Error} err
 * @returns {{ lock: 'hard'|'soft', reason: string }|null} null when the
 *   error is not about the account
 */
export function classifyAuthFailure(err) {
  if (!(err instanceof AuthError)) return null;
  const codes = errorCodes(err);
  for (const code of codes) {
    if (DEAD_ACCOUNT_CODES.has(code)) return { lock: 'hard', reason: `${DEAD_ACCOUNT_CODES.get(code)} (code ${code})` };
  }
  for (const code of codes) {
    if (SOFT_LOCK_CODES.has(code)) return { lock: 'soft', reason: `${SOFT_LOCK_CODES.get(code)} (code ${code})` };
  }
  if (err.status === 401) return { lock: 'hard', reason: 'unauthorized' };
  return null;
}

/**
 * A drop-in for `TwitterHttpClient` that spreads calls across a pool.
 *
 * Reads rotate: a rate limit or a dead account moves the call to the next
 * account. Writes (GraphQL mutations, any non-GET REST call) never do; the
 * error is recorded against the account and rethrown, so a post is never
 * sent from an account other than the one it started on.
 *
 * @param {ReturnType<typeof createAccountPool>} pool
 * @param {object} [options]
 * @param {number} [options.maxAccounts] - Most accounts one call may try
 *   before the last error is rethrown. Defaults to the pool size at call time.
 * @param {number} [options.maxWaitMs] - Passed to `pool.acquire`.
 * @param {number} [options.softLockMs=3600000] - How long an account with a
 *   CSRF mismatch sits out before it is tried again.
 * @param {function} [options.onRotate] - `({ from, operation, reason, error })`
 */
export function createPooledClient(pool, options = {}) {
  const softLockMs = options.softLockMs ?? DEFAULT_SOFT_LOCK_MS;

  /**
   * @param {string} operation - Rate-limit key, the same one `onResponse` records under
   * @param {function} fn
   * @param {{ rotate?: boolean }} [opts] - false for writes
   */
  async function run(operation, fn, { rotate = true } = {}) {
    const tried = new Set();
    const budget = rotate ? options.maxAccounts ?? Math.max(pool.size(), 1) : 1;
    let lastError = null;

    while (tried.size < budget) {
      const lease = await pool.acquire(operation, { maxWaitMs: options.maxWaitMs, exclude: tried });
      tried.add(lease.name);
      try {
        return await fn(lease.client);
      } catch (err) {
        lastError = err;
        let reason;
        if (err instanceof RateLimitError) {
          pool.markRateLimited(lease.name, operation, err.resetAt);
          reason = 'rate-limited';
        } else {
          const verdict = classifyAuthFailure(err);
          if (!verdict) throw err;
          pool.markLocked(
            lease.name,
            `HTTP ${err.status} on ${operation}: ${verdict.reason}`,
            verdict.lock === 'soft' ? { ttlMs: softLockMs } : {},
          );
          reason = 'locked';
        }
        if (!rotate) throw err;
        options.onRotate?.({ from: lease.name, operation, reason, error: err });
      } finally {
        lease.release();
      }
    }
    throw lastError || new AccountPoolError(`No account could serve ${operation}.`, { operation });
  }

  /** Whether a raw request is a read that is safe to send from another account. */
  function isReadRequest(url, method) {
    if (method === 'GET' || method === 'HEAD') return true;
    // GraphQL read queries X only accepts as POST (Followers, SearchTimeline).
    const op = operationFromUrl(url);
    return /\/graphql\//.test(String(url)) && graphqlRequestMethod(op) === 'POST';
  }

  const pooled = {
    pool,

    isAuthenticated() {
      return pool.list().some((a) => !a.locked);
    },

    graphql(queryId, operationName, variables, opts = {}) {
      return run(operationName, (client) => client.graphql(queryId, operationName, variables, opts), {
        rotate: opts.mutation !== true,
      });
    },

    request(url, opts = {}) {
      const method = (opts.method || 'GET').toUpperCase();
      return run(operationFromUrl(url), (client) => client.request(url, opts), {
        rotate: isReadRequest(url, method),
      });
    },

    rest(path, opts = {}) {
      // Keyed the way onResponse records it (the URL pathname), so a REST
      // window spent on one call is seen by the next acquire.
      const method = (opts.method || 'POST').toUpperCase();
      return run(operationFromUrl(`${REST_BASE}${path}`), (client) => client.rest(path, opts), {
        rotate: method === 'GET',
      });
    },

    graphqlPaginate(queryId, operationName, variables, opts = {}) {
      return TwitterHttpClient.prototype.graphqlPaginate.call(pooled, queryId, operationName, variables, opts);
    },
  };

  return pooled;
}

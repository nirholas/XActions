// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Account Vault — a per-platform credential store agents can manage.
 *
 * `~/.xactions/accounts.db` (resolved through `resolveCacheDir()`, so
 * `$XACTIONS_HOME` is honoured) already holds the Twitter-only `accounts`
 * pool table managed by `accountPool.js`. This module adds a second,
 * independent table in the same file — `vault_accounts` — keyed by
 * `(platform, name)` and holding a credentials JSON blob plus an optional
 * proxy. It never touches the pool's `accounts`/`rate_limits` tables, so
 * the two stores can evolve separately.
 *
 * Platforms: `twitter` (aliases `x`), `bluesky` (`bsky`), `mastodon`
 * (`masto`). `threads` is rejected up front — its scraper is anonymous by
 * design, so there are no credentials to store.
 *
 * Masking contract: `list`/`get`/`add`/`remove`/`use` results carry platform,
 * name, proxy *host* and timestamps only. Raw credentials never appear in a
 * return value; `test` returns `{ ok, reason }` where `reason` is a status
 * line, never a token.
 *
 * `use` is the only bridge back to a live session, and only for twitter:
 * it backs up the current `cookies.json` to `cookies.json.bak` and writes
 * the stored jar (mode 0600) into `~/.xactions/` — the hardcoded session
 * directory the CLI reads (`src/cli/index.js` CONFIG_DIR) — plus the
 * auth_token/ct0 mirror into config.json that `xactions login` performs.
 * Bluesky/Mastodon rows are stored credentials waiting for the
 * multiplatform-wiring work; activating them is a later goal.<|end_message|><|message_model|>Edit<|content_invoke_tool_json|>{
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { resolveCacheDir } from '../scrapers/twitter/http/queryIds.js';
import { parseCookieInput } from '../client/auth/cookieImport.js';

const DB_FILENAME = 'accounts.db';
const DEFAULT_BSKY_SERVICE = 'https://public.api.bsky.app';
const TEST_TIMEOUT_MS = 20_000;

/** Platforms the vault stores credentials for, in display order. */
export const SUPPORTED_PLATFORMS = Object.freeze(['twitter', 'bluesky', 'mastodon']);

const PLATFORM_ALIASES = Object.freeze({
  twitter: 'twitter',
  x: 'twitter',
  bluesky: 'bluesky',
  bsky: 'bluesky',
  mastodon: 'mastodon',
  masto: 'mastodon',
});

/** Error type for every vault rejection, so callers can catch one class. */
export class AccountVaultError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AccountVaultError';
  }
}

// ---------------------------------------------------------------------------
// Platform + credential normalisation
// ---------------------------------------------------------------------------

/**
 * Canonical platform name, or a thrown error naming what is supported.
 * Threads gets its own message because it is a real scraper platform — it
 * is rejected here for a different reason (no credentials exist to store).
 *
 * @param {string} input
 * @returns {'twitter'|'bluesky'|'mastodon'}
 */
export function normalizePlatform(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (raw === 'threads') {
    throw new AccountVaultError(
      'Threads has no stored credentials — its scraper is anonymous by design. ' +
        `Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}.`,
    );
  }
  const platform = PLATFORM_ALIASES[raw];
  if (!platform) {
    throw new AccountVaultError(
      `Unknown platform "${input}". Supported platforms: ${SUPPORTED_PLATFORMS.join(', ')}.`,
    );
  }
  return platform;
}

/**
 * Turn any cookie shape `login --cookies-file` accepts into the parsed
 * array form `cookies.json` stores: a header/cookies.txt/storageState
 * string through `parseCookieInput`, an array of `{name, value}` objects,
 * or a `{ auth_token, ct0, ... }` map.
 *
 * @param {string|Array<object>|Record<string,string>} input
 * @returns {Array<object>}
 */
function cookieArray(input) {
  if (typeof input === 'string') return parseCookieInput(input);

  if (Array.isArray(input)) {
    const cookies = input
      .filter((c) => c && c.name && c.value != null)
      .map((c) => ({ ...c, name: String(c.name), value: String(c.value) }));
    if (cookies.length === 0) {
      throw new AccountVaultError('Twitter credentials contained no usable cookies.');
    }
    return cookies;
  }

  if (input && typeof input === 'object') {
    const cookies = Object.entries(input)
      .filter(([, v]) => v != null && v !== '')
      .map(([name, value]) => ({ name, value: String(value) }));
    if (cookies.length === 0) {
      throw new AccountVaultError('Twitter credentials contained no usable cookies.');
    }
    return cookies;
  }

  throw new AccountVaultError(
    'Twitter credentials must be a cookie string (cookies.txt, Cookie-Editor JSON, ' +
      'Playwright storageState, or "auth_token=...; ct0=..."), a cookie array, or a { auth_token, ct0 } map.',
  );
}

/**
 * Validate and shape the credentials blob for one platform. Returns the
 * object stored as JSON in `vault_accounts.credentials`.
 *
 * @param {'twitter'|'bluesky'|'mastodon'} platform
 * @param {object} credentials
 * @returns {object}
 */
function normalizeCredentials(platform, credentials = {}) {
  if (platform === 'twitter') {
    // Accept `{ cookies: <payload> }` or the payload itself.
    const payload = credentials && typeof credentials === 'object' && 'cookies' in credentials
      ? credentials.cookies
      : credentials;
    const cookies = cookieArray(payload);
    if (!cookies.some((c) => c.name === 'auth_token' && c.value)) {
      throw new AccountVaultError(
        'Twitter credentials are missing auth_token — export a logged-in x.com session ' +
          '(cookies.txt, Cookie-Editor JSON, Playwright storageState, or "auth_token=...; ct0=...").',
      );
    }
    return { cookies };
  }

  if (platform === 'bluesky') {
    const identifier = String(credentials.identifier || '').trim();
    const password = String(credentials.password || '');
    const missing = [
      ...(!identifier ? ['identifier'] : []),
      ...(!password ? ['password (app password, not account password)'] : []),
    ];
    if (missing.length > 0) {
      throw new AccountVaultError(`Bluesky credentials are missing: ${missing.join(', ')}.`);
    }
    const out = { identifier, password };
    if (credentials.service) out.service = String(credentials.service).trim().replace(/\/+$/, '');
    return out;
  }

  // mastodon
  const instance = String(credentials.instance || '').trim().replace(/\/+$/, '');
  const accessToken = String(credentials.accessToken || '').trim();
  const missing = [
    ...(!instance ? ['instance'] : []),
    ...(!accessToken ? ['accessToken'] : []),
  ];
  if (missing.length > 0) {
    throw new AccountVaultError(`Mastodon credentials are missing: ${missing.join(', ')}.`);
  }
  return {
    instance: /^https?:\/\//i.test(instance) ? instance : `https://${instance}`,
    accessToken,
  };
}

/**
 * Host (with port) of a proxy URL, credentials stripped — the only part of
 * the proxy `list` is allowed to show.
 *
 * @param {string|null} proxy
 * @returns {string|null}
 */
function proxyHost(proxy) {
  if (!proxy) return null;
  try {
    return new URL(proxy).host;
  } catch {
    try {
      return new URL(`http://${proxy}`).host;
    } catch {
      return null;
    }
  }
}

/**
 * The directory the CLI reads the live X session from. `src/cli/index.js`
 * hardcodes `os.homedir()/.xactions` (CONFIG_DIR/COOKIE_FILE), so `use`
 * must write there regardless of `$XACTIONS_HOME` — the vault DB honours
 * `resolveCacheDir()`, the session jar does not.
 *
 * @returns {string}
 */
function sessionDir() {
  return path.join(os.homedir(), '.xactions');
}

/**
 * Mirror auth_token/ct0 into config.json — the fallback session path
 * `loadSavedSession` reads when the jar is missing. Mirrors
 * `saveImportedSession` in src/cli/index.js: other config keys are
 * preserved, modes stay owner-only.
 *
 * @param {string} dir
 * @param {Array<object>} cookies
 */
function mirrorSessionTokens(dir, cookies) {
  const authToken = cookies.find((c) => c.name === 'auth_token')?.value;
  const csrfToken = cookies.find((c) => c.name === 'ct0')?.value;

  const configPath = path.join(dir, 'config.json');
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    // Missing or unreadable config starts empty; other keys are preserved
    // whenever the file parsed.
  }
  if (authToken) config.authToken = authToken;
  if (csrfToken) config.csrfToken = csrfToken;
  else delete config.csrfToken;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  fs.chmodSync(configPath, 0o600);
}

// ---------------------------------------------------------------------------
// Live credential checks (network — injectable for tests)
// ---------------------------------------------------------------------------

/**
 * Twitter: one authenticated GraphQL call. NotificationsTimeline requires a
 * logged-in session, so a dead cookie jar fails here even though public
 * profile reads would still answer as a guest. UserByRestId is deliberately
 * not used — it is 403-blocked upstream regardless of session health.
 *
 * @param {string} cookieHeader
 * @param {string|null} proxy
 * @returns {Promise<{ok: boolean, reason: string}>}
 */
async function defaultTwitterTest(cookieHeader, proxy) {
  const { createHttpScraper } = await import('../scrapers/twitter/http/index.js');
  const scraper = await createHttpScraper({
    cookies: cookieHeader,
    proxy: proxy || undefined,
  });
  await scraper.scrapeNotifications({ limit: 1 });
  return { ok: true, reason: 'session accepted by X' };
}

/**
 * Bluesky: the real login call. `createAgent` cannot be used for this — it
 * swallows login failures into a fetch fallback client that never
 * authenticates, so a bad password would look like a pass.
 *
 * @param {object} creds `{ identifier, password, service? }`
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<{ok: boolean, reason: string}>}
 */
async function blueskyTest(creds, fetchImpl) {
  const service = String(creds.service || DEFAULT_BSKY_SERVICE).replace(/\/+$/, '');
  const res = await fetchImpl(`${service}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: creds.identifier, password: creds.password }),
    signal: AbortSignal.timeout(TEST_TIMEOUT_MS),
  });
  if (res.ok) return { ok: true, reason: 'login succeeded' };
  let detail = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    const message = body?.message || body?.error;
    if (message) detail += `: ${message}`;
  } catch {
    // Status alone is still a usable reason.
  }
  return { ok: false, reason: detail };
}

/**
 * Mastodon: `verify_credentials` is the endpoint built for exactly this.
 *
 * @param {object} creds `{ instance, accessToken }`
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<{ok: boolean, reason: string}>}
 */
async function mastodonTest(creds, fetchImpl) {
  const res = await fetchImpl(`${creds.instance}/api/v1/accounts/verify_credentials`, {
    headers: { Authorization: `Bearer ${creds.accessToken}` },
    signal: AbortSignal.timeout(TEST_TIMEOUT_MS),
  });
  if (res.ok) return { ok: true, reason: 'token accepted' };
  return { ok: false, reason: `HTTP ${res.status}` };
}

// ---------------------------------------------------------------------------
// Vault
// ---------------------------------------------------------------------------

function openVaultDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS vault_accounts (
      platform    TEXT NOT NULL,
      name        TEXT NOT NULL,
      credentials TEXT NOT NULL,
      proxy       TEXT,
      locked      INTEGER NOT NULL DEFAULT 0,
      added_at    INTEGER NOT NULL,
      last_used   INTEGER,
      PRIMARY KEY (platform, name)
    );
  `);
  // Credentials sit in the WAL until a checkpoint, so the sidecar files get
  // the same owner-only mode as the main database file.
  for (const sidecar of ['', '-wal', '-shm']) {
    try {
      fs.chmodSync(`${dbPath}${sidecar}`, 0o600);
    } catch {
      // Best effort: the sidecar may not exist yet or the filesystem may not
      // support POSIX modes.
    }
  }
  return db;
}

/**
 * Re-assert owner-only mode on the database sidecars. WAL writes happen on
 * every mutation, and better-sqlite3 can recreate the sidecars, so each
 * write path calls this after its statements.
 * @param {string} dbPath
 */
function tightenDbSidecarModes(dbPath) {
  for (const sidecar of ['', '-wal', '-shm']) {
    try {
      fs.chmodSync(`${dbPath}${sidecar}`, 0o600);
    } catch {
      // Sidecar absent or non-POSIX filesystem — nothing to tighten.
    }
  }
}

/**
 * Create (or reopen) the vault.
 *
 * @param {object} [options]
 * @param {string} [options.dbPath] - SQLite file. Defaults to
 *   `accounts.db` inside `resolveCacheDir()` (`$XACTIONS_HOME` or
 *   `~/.xactions`) — the same file the Twitter account pool uses, but a
 *   different table.
 * @param {typeof fetch} [options.fetchImpl] - fetch for the bluesky/mastodon
 *   credential checks; injectable for tests.
 * @param {(cookieHeader: string, proxy: string|null) => Promise<{ok: boolean, reason: string}>} [options.twitterTest]
 *   The twitter credential check; injectable for tests.
 */
export function createAccountVault(options = {}) {
  const dbPath = options.dbPath || path.join(resolveCacheDir(), DB_FILENAME);
  if (dbPath.startsWith('memory:')) {
    throw new AccountVaultError('The account vault needs a filesystem-backed XActions home.');
  }
  const fetchImpl = options.fetchImpl || fetch;
  const twitterTest = options.twitterTest || defaultTwitterTest;

  const db = openVaultDb(dbPath);

  const stmts = {
    upsert: db.prepare(`
      INSERT INTO vault_accounts (platform, name, credentials, proxy, added_at)
      VALUES (@platform, @name, @credentials, @proxy, @added_at)
      ON CONFLICT(platform, name) DO UPDATE SET
        credentials = excluded.credentials,
        proxy = excluded.proxy
    `),
    get: db.prepare('SELECT * FROM vault_accounts WHERE platform = ? AND name = ?'),
    byName: db.prepare('SELECT * FROM vault_accounts WHERE name = ? ORDER BY platform ASC'),
    listAll: db.prepare('SELECT * FROM vault_accounts ORDER BY platform ASC, name ASC'),
    listByPlatform: db.prepare('SELECT * FROM vault_accounts WHERE platform = ? ORDER BY name ASC'),
    remove: db.prepare('DELETE FROM vault_accounts WHERE platform = ? AND name = ?'),
    touch: db.prepare('UPDATE vault_accounts SET last_used = ? WHERE platform = ? AND name = ?'),
  };

  /**
   * Masked public shape of a row — the only shape that leaves the vault.
   * @param {object} row
   */
  function maskRow(row) {
    return {
      platform: row.platform,
      name: row.name,
      proxy: proxyHost(row.proxy),
      addedAt: new Date(row.added_at).toISOString(),
      lastUsedAt: row.last_used ? new Date(row.last_used).toISOString() : null,
      locked: Boolean(row.locked),
    };
  }

  /**
   * Find a row without throwing on a miss. Throws only when `name` alone
   * matches rows on several platforms.
   * @returns {object|null}
   */
  function findEntry({ platform, name } = {}) {
    const accountName = String(name || '').trim();
    if (!accountName) throw new AccountVaultError('Account name is required.');

    if (platform) {
      return stmts.get.get(normalizePlatform(platform), accountName) || null;
    }
    const rows = stmts.byName.all(accountName);
    if (rows.length > 1) {
      throw new AccountVaultError(
        `"${accountName}" exists on multiple platforms (${rows.map((r) => r.platform).join(', ')}) — pass platform to disambiguate.`,
      );
    }
    return rows[0] || null;
  }

  /** findEntry that turns a miss into a clear error. */
  function resolveEntry({ platform, name } = {}) {
    const row = findEntry({ platform, name });
    if (!row) {
      const where = platform ? ` on ${normalizePlatform(platform)}` : '';
      throw new AccountVaultError(`No account named "${String(name || '').trim()}"${where} in the vault.`);
    }
    return row;
  }

  return {
    /**
     * Upsert an account. Re-adding the same `(platform, name)` replaces its
     * credentials and proxy but keeps the original `added_at`.
     *
     * @param {object} input
     * @param {string} input.platform - twitter|x, bluesky|bsky, mastodon|masto
     * @param {string} input.name
     * @param {object} input.credentials - platform-shaped credential fields
     * @param {string} [input.proxy]
     * @returns {Promise<object>} masked summary with `replaced`
     */
    async add({ platform: rawPlatform, name, credentials, proxy } = {}) {
      const platform = normalizePlatform(rawPlatform);
      const accountName = String(name || '').trim();
      if (!accountName) throw new AccountVaultError('Account name is required.');

      const normalized = normalizeCredentials(platform, credentials);
      const proxyValue = proxy != null && String(proxy).trim() !== '' ? String(proxy).trim() : null;
      const replaced = Boolean(stmts.get.get(platform, accountName));

      stmts.upsert.run({
        platform,
        name: accountName,
        credentials: JSON.stringify(normalized),
        proxy: proxyValue,
        added_at: Date.now(),
      });
      tightenDbSidecarModes(dbPath);

      return { platform, name: accountName, proxy: proxyHost(proxyValue), replaced };
    },

    /**
     * One masked entry, or null when nothing matches. Throws on an
     * ambiguous name (same name on several platforms, no platform given).
     */
    async get({ platform, name } = {}) {
      const row = findEntry({ platform, name });
      return row ? maskRow(row) : null;
    },

    /**
     * Masked entries, optionally filtered to one platform.
     * @param {{platform?: string}} [filter]
     * @returns {Promise<object[]>}
     */
    async list({ platform } = {}) {
      const rows = platform
        ? stmts.listByPlatform.all(normalizePlatform(platform))
        : stmts.listAll.all();
      return rows.map(maskRow);
    },

    /**
     * Delete an account. Throws when nothing matches.
     * @returns {Promise<object>}
     */
    async remove({ platform, name } = {}) {
      const row = resolveEntry({ platform, name });
      stmts.remove.run(row.platform, row.name);
      tightenDbSidecarModes(dbPath);
      return { removed: true, platform: row.platform, name: row.name };
    },

    /**
     * Activate a stored twitter account as the live X session: the current
     * `~/.xactions/cookies.json` is backed up to `cookies.json.bak`, then the
     * stored jar is written owner-only there (plus the config.json token
     * mirror) — the hardcoded session path the CLI reads. Other platforms
     * throw — they have no live-session concept yet.
     *
     * @returns {Promise<object>}
     */
    async use({ platform, name } = {}) {
      const row = resolveEntry({ platform, name });
      if (row.platform !== 'twitter') {
        throw new AccountVaultError(
          `Only twitter accounts can be activated as the live X session — "${row.name}" is a ${row.platform} account (stored credentials only).`,
        );
      }
      const cookies = JSON.parse(row.credentials).cookies;
      // The CLI reads the live session from ~/.xactions (hardcoded in
      // src/cli/index.js), so write there even when the vault DB itself
      // lives under $XACTIONS_HOME.
      const sessionDirectory = sessionDir();
      fs.mkdirSync(sessionDirectory, { recursive: true, mode: 0o700 });
      const cookiePath = path.join(sessionDirectory, 'cookies.json');
      const backup = fs.existsSync(cookiePath);
      if (backup) fs.copyFileSync(cookiePath, `${cookiePath}.bak`);
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2), { mode: 0o600 });
      fs.chmodSync(cookiePath, 0o600);
      mirrorSessionTokens(sessionDirectory, cookies);

      stmts.touch.run(Date.now(), row.platform, row.name);
      tightenDbSidecarModes(dbPath);
      return { activated: row.name, platform: 'twitter', cookies: cookies.length, backup };
    },

    /**
     * Light authenticated check per platform. Never returns credentials —
     * `{ ok, reason }` only, and a failed check does not lock or remove the
     * row (the vault never locks; that is the pool's job).
     *
     * @returns {Promise<{platform: string, name: string, ok: boolean, reason: string}>}
     */
    async test({ platform, name } = {}) {
      const row = resolveEntry({ platform, name });
      const creds = JSON.parse(row.credentials);

      let result;
      try {
        if (row.platform === 'twitter') {
          const header = (creds.cookies || []).map((c) => `${c.name}=${c.value}`).join('; ');
          result = await twitterTest(header, row.proxy);
        } else if (row.platform === 'bluesky') {
          result = await blueskyTest(creds, fetchImpl);
        } else {
          result = await mastodonTest(creds, fetchImpl);
        }
      } catch (error) {
        result = { ok: false, reason: error.message };
      }

      // last_used only records successful checks — a failed check is not a use.
      if (result.ok) {
        stmts.touch.run(Date.now(), row.platform, row.name);
        tightenDbSidecarModes(dbPath);
      }
      return { platform: row.platform, name: row.name, ...result };
    },

    /** Close the underlying SQLite handle. */
    close() {
      db.close();
    },
  };
}

export default { createAccountVault, AccountVaultError, SUPPORTED_PLATFORMS, normalizePlatform };

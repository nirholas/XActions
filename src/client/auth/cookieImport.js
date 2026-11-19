// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Client - Cookie Import
 *
 * Painless login, the way `bird`, `twitter-cli`, and gallery-dl's
 * `--cookies-from-browser` do it. Two ways in:
 *
 *   1. parseCookieInput(text)   parses a cookie export you already have, in
 *      any of the common formats (Netscape cookies.txt, Cookie-Editor /
 *      EditThisCookie JSON arrays, Playwright / Puppeteer storageState, or a
 *      raw `auth_token=...; ct0=...` header string).
 *   2. readBrowserCookies(name) reads x.com cookies straight out of a locally
 *      installed browser's cookie database (Firefox everywhere, Chromium-family
 *      browsers on Linux with the default keyring key and on macOS via the
 *      Keychain).
 *
 * Both return the same shape: an array of
 * `{ name, value, domain, path, secure, httpOnly, expires }` objects, already
 * filtered to X/Twitter cookies, ready to hand to CookieJar / CookieAuth or to
 * write as a `cookies.json` the rest of XActions reads.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

// better-sqlite3 is a CommonJS native addon, so it is loaded through a CJS
// require bound to this module rather than a static ESM import.
const require = createRequire(import.meta.url);

// ============================================================================
// Domain filtering
// ============================================================================

/**
 * Cookie domains that belong to an X/Twitter session. A cookie whose domain
 * matches one of these (as a suffix) is kept; anything else in an export is
 * dropped so an unrelated site's cookies never leak into a session file.
 */
const X_DOMAINS = ['x.com', 'twitter.com'];

/**
 * The cookies X actually needs. auth_token authenticates and ct0 is the CSRF
 * token X requires before it treats a session as logged in.
 */
const REQUIRED_COOKIES = ['auth_token', 'ct0'];

/**
 * True when a domain belongs to X/Twitter. A leading dot and case are ignored.
 *
 * @param {string|undefined} domain
 * @returns {boolean}
 */
function isXDomain(domain) {
  if (!domain) return false;
  const host = String(domain).replace(/^\./, '').toLowerCase();
  return X_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * Normalize one parsed cookie into the shape the rest of the toolkit uses.
 * Returns null for entries with no usable name.
 *
 * @param {Record<string, any>} raw
 * @returns {{name: string, value: string, domain: string, path: string, secure: boolean, httpOnly: boolean, expires: string|null}|null}
 */
function normalizeCookie(raw) {
  if (!raw) return null;
  const name = (raw.name ?? raw.Name ?? '').toString().trim();
  if (!name) return null;

  const value = (raw.value ?? raw.Value ?? '').toString();
  const domain = (raw.domain ?? raw.Domain ?? raw.host ?? raw.host_key ?? '').toString();
  const cookiePath = (raw.path ?? raw.Path ?? '/').toString() || '/';

  const secure = Boolean(raw.secure ?? raw.Secure ?? raw.isSecure ?? false);
  const httpOnly = Boolean(raw.httpOnly ?? raw.HttpOnly ?? raw.httponly ?? raw.isHttpOnly ?? false);

  let expires = null;
  const rawExpiry =
    raw.expires ?? raw.Expires ?? raw.expirationDate ?? raw.expiry ?? raw.expires_utc ?? raw.expiresUtc;
  if (rawExpiry !== undefined && rawExpiry !== null && rawExpiry !== '') {
    expires = normalizeExpiry(rawExpiry);
  }

  return { name, value, domain, path: cookiePath, secure, httpOnly, expires };
}

/**
 * Turn any of the expiry encodings we see (unix seconds, unix millis, an ISO
 * string, a Date) into an ISO string, or null when it cannot be read.
 *
 * @param {number|string|Date} value
 * @returns {string|null}
 */
function normalizeExpiry(value) {
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? null : value.toISOString();

  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    let n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    // Heuristic on magnitude: seconds (~1e9), millis (~1e12), or Chrome's
    // microseconds since 1601 (~1.3e17).
    if (n > 1e16) {
      // Chrome/WebKit epoch: microseconds since 1601-01-01.
      n = n / 1000 - 11644473600000;
    } else if (n > 1e12) {
      // Already milliseconds since 1970.
    } else {
      // Seconds since 1970.
      n = n * 1000;
    }
    const d = new Date(n);
    return Number.isNaN(d.valueOf()) ? null : d.toISOString();
  }

  const d = new Date(value);
  return Number.isNaN(d.valueOf()) ? null : d.toISOString();
}

/**
 * Rank of a cookie's domain when two cookies share a name: x.com is the live
 * site, twitter.com cookies are leftovers from before the move.
 *
 * @param {string} domain
 * @returns {number}
 */
function domainRank(domain) {
  const host = String(domain || '').replace(/^\./, '').toLowerCase();
  if (host === 'x.com' || host.endsWith('.x.com')) return 2;
  if (host === 'twitter.com' || host.endsWith('.twitter.com')) return 1;
  return 0;
}

/**
 * Keep only X/Twitter cookies from a parsed list. Header strings carry no
 * domain, so when nothing has a domain the whole list is kept (the caller
 * supplied exactly the cookies they meant to).
 *
 * Expired cookies are dropped, and when a name appears more than once (an
 * export holding both `.x.com` and `.twitter.com` copies, typically an old
 * auth_token beside the current one) the x.com copy wins, then the one that
 * expires last. Before this the last line of the file won, which could pair
 * a stale twitter.com auth_token with a current x.com ct0.
 *
 * @param {Array<Record<string, any>>} cookies
 * @param {object} [options]
 * @param {number} [options.now] - Clock in ms, for tests
 * @returns {Array<{name: string, value: string, domain: string, path: string, secure: boolean, httpOnly: boolean, expires: string|null}>}
 */
function filterXCookies(cookies, { now = Date.now() } = {}) {
  const normalized = cookies.map(normalizeCookie).filter(Boolean);
  const anyHasDomain = normalized.some((c) => c.domain);
  const scoped = anyHasDomain ? normalized.filter((c) => isXDomain(c.domain)) : normalized;
  const live = scoped.filter((c) => !c.expires || Date.parse(c.expires) > now);

  const byName = new Map();
  for (const cookie of live) {
    const current = byName.get(cookie.name);
    if (!current) {
      byName.set(cookie.name, cookie);
      continue;
    }
    const rankDiff = domainRank(cookie.domain) - domainRank(current.domain);
    const expiry = (c) => (c.expires ? Date.parse(c.expires) : Infinity);
    if (rankDiff > 0 || (rankDiff === 0 && expiry(cookie) >= expiry(current))) {
      byName.set(cookie.name, cookie);
    }
  }
  return [...byName.values()];
}

// ============================================================================
// Format detection
// ============================================================================

/**
 * Identify which cookie export format a blob of text is.
 *
 * @param {string} text
 * @returns {'json-array'|'storage-state'|'netscape'|'header'|'unknown'}
 */
export function detectCookieFormat(text) {
  if (typeof text !== 'string') return 'unknown';
  const trimmed = text.trim();
  if (!trimmed) return 'unknown';

  // JSON first: an array is Cookie-Editor / EditThisCookie; an object with a
  // `cookies` array is Playwright / Puppeteer storageState.
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return 'json-array';
      if (parsed && Array.isArray(parsed.cookies)) return 'storage-state';
      if (parsed && typeof parsed === 'object') return 'json-array';
    } catch {
      // Not valid JSON; fall through to the line-based formats.
    }
  }

  // Netscape cookies.txt: tab-separated rows, often with a `# Netscape` banner
  // or `#HttpOnly_` domain prefixes. Detect by a tab-delimited 7-field row.
  const lines = trimmed.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const body = line.startsWith('#HttpOnly_') ? line.slice('#HttpOnly_'.length) : line;
    if (line.startsWith('#') && !line.startsWith('#HttpOnly_')) continue;
    if (body.split('\t').length >= 7) return 'netscape';
  }

  // Header string: `name=value; name2=value2`.
  if (/(^|;)\s*[^=;\s]+=/.test(trimmed)) return 'header';

  return 'unknown';
}

// ============================================================================
// Format parsers
// ============================================================================

/**
 * Parse a Netscape `cookies.txt` file (the format curl, wget, and the
 * "cookies.txt" browser extensions write). Tab-separated, seven fields:
 *
 *   domain  includeSubdomains  path  secure  expiry  name  value
 *
 * A leading `#HttpOnly_` on the domain field marks an HttpOnly cookie; any
 * other `#`-prefixed line is a comment.
 *
 * @param {string} text
 * @returns {Array<Record<string, any>>}
 */
function parseNetscape(text) {
  const out = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\r$/, '');
    if (!line.trim()) continue;

    let httpOnly = false;
    let body = line;
    if (body.startsWith('#HttpOnly_')) {
      httpOnly = true;
      body = body.slice('#HttpOnly_'.length);
    } else if (body.startsWith('#')) {
      continue;
    }

    const fields = body.split('\t');
    if (fields.length < 7) continue;

    const [domain, , cookiePath, secure, expiry, name, ...valueParts] = fields;
    out.push({
      name,
      value: valueParts.join('\t'),
      domain,
      path: cookiePath || '/',
      secure: String(secure).toUpperCase() === 'TRUE',
      httpOnly,
      expires: expiry && expiry !== '0' ? Number(expiry) : null,
    });
  }
  return out;
}

/**
 * Parse a raw Cookie header string: `auth_token=abc; ct0=def`.
 *
 * @param {string} text
 * @returns {Array<Record<string, any>>}
 */
function parseHeaderString(text) {
  const out = [];
  for (const pair of text.split(/;|\n/)) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!name) continue;
    // No domain in a header string; leave it blank so filterXCookies keeps it.
    out.push({ name, value, domain: '', path: '/' });
  }
  return out;
}

/**
 * Parse a JSON array from Cookie-Editor / EditThisCookie, or a bare object.
 *
 * @param {unknown} parsed
 * @returns {Array<Record<string, any>>}
 */
function parseJsonArray(parsed) {
  if (Array.isArray(parsed)) return parsed;
  // A single cookie object, or an object map keyed by name.
  if (parsed && typeof parsed === 'object') {
    if (parsed.name) return [parsed];
    return Object.entries(parsed).map(([name, value]) =>
      value && typeof value === 'object' ? { name, ...value } : { name, value },
    );
  }
  return [];
}

// ============================================================================
// Public: parseCookieInput
// ============================================================================

/**
 * Parse cookie text in any supported format into X/Twitter cookies.
 *
 * @param {string} text - The raw cookie export.
 * @param {object} [options]
 * @param {'json-array'|'storage-state'|'netscape'|'header'|'auto'} [options.format='auto']
 *   Force a format instead of auto-detecting.
 * @returns {Array<{name: string, value: string, domain: string, path: string, secure: boolean, httpOnly: boolean, expires: string|null}>}
 * @throws {Error} When the text is empty or no X/Twitter cookies are found.
 */
export function parseCookieInput(text, options = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('No cookie text to parse. Pass the contents of a cookies file or a cookie header string.');
  }

  const format = options.format && options.format !== 'auto' ? options.format : detectCookieFormat(text);

  let raw;
  switch (format) {
    case 'netscape':
      raw = parseNetscape(text);
      break;
    case 'header':
      raw = parseHeaderString(text);
      break;
    case 'json-array':
      raw = parseJsonArray(JSON.parse(text.trim()));
      break;
    case 'storage-state': {
      const parsed = JSON.parse(text.trim());
      raw = Array.isArray(parsed.cookies) ? parsed.cookies : [];
      break;
    }
    default:
      throw new Error(
        'Could not recognize the cookie format. Supported: Netscape cookies.txt, ' +
          'Cookie-Editor / EditThisCookie JSON, Playwright / Puppeteer storageState, ' +
          'or a raw "auth_token=...; ct0=..." header string.',
      );
  }

  const cookies = filterXCookies(raw);
  if (cookies.length === 0) {
    throw new Error(
      'No X/Twitter cookies found in that input. Make sure you exported cookies for x.com ' +
        '(or twitter.com) while logged in, and that auth_token is present.',
    );
  }
  return cookies;
}

// ============================================================================
// Browser cookie databases
// ============================================================================

/**
 * @typedef {'chrome'|'chromium'|'brave'|'edge'|'arc'|'firefox'} BrowserName
 */

/** Chromium-family browsers (share the same on-disk cookie DB + encryption). */
const CHROMIUM_BROWSERS = new Set(['chrome', 'chromium', 'brave', 'edge', 'arc']);

/**
 * Per-browser user-data directories per platform. `undefined` means that
 * browser is not distributed for that platform.
 *
 * @param {BrowserName} browser
 * @returns {string[]} Candidate user-data directories, most likely first.
 */
function chromiumUserDataDirs(browser) {
  const home = os.homedir();
  const platform = process.platform;

  const linux = {
    chrome: ['google-chrome', 'google-chrome-beta', 'google-chrome-unstable'],
    chromium: ['chromium'],
    brave: ['BraveSoftware/Brave-Browser'],
    edge: ['microsoft-edge'],
    arc: [],
  };
  const mac = {
    chrome: ['Google/Chrome'],
    chromium: ['Chromium'],
    brave: ['BraveSoftware/Brave-Browser'],
    edge: ['Microsoft Edge'],
    arc: ['Arc/User Data'],
  };

  if (platform === 'linux') {
    return (linux[browser] || []).map((d) => path.join(home, '.config', d));
  }
  if (platform === 'darwin') {
    return (mac[browser] || []).map((d) => path.join(home, 'Library', 'Application Support', d));
  }
  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const win = {
      chrome: ['Google/Chrome/User Data'],
      chromium: ['Chromium/User Data'],
      brave: ['BraveSoftware/Brave-Browser/User Data'],
      edge: ['Microsoft/Edge/User Data'],
      arc: ['Arc/User Data'],
    };
    return (win[browser] || []).map((d) => path.join(localAppData, d));
  }
  return [];
}

/**
 * Find the Cookies SQLite file inside a Chromium user-data dir. Chrome moved it
 * from `Default/Cookies` to `Default/Network/Cookies` in v96, so check both,
 * and check the top-level too for non-default profile layouts.
 *
 * @param {string} userDataDir
 * @returns {string|null}
 */
function findChromiumCookieDb(userDataDir) {
  const candidates = [
    path.join(userDataDir, 'Default', 'Network', 'Cookies'),
    path.join(userDataDir, 'Default', 'Cookies'),
    path.join(userDataDir, 'Network', 'Cookies'),
    path.join(userDataDir, 'Cookies'),
  ];
  for (const c of candidates) {
    if (fsSync.existsSync(c)) return c;
  }
  return null;
}

/**
 * Locate a Firefox `cookies.sqlite`. Firefox stores each profile under a random
 * suffix, so read profiles.ini when present, otherwise glob for a *.default*
 * profile that has a cookies.sqlite.
 *
 * @returns {string|null}
 */
function findFirefoxCookieDb() {
  const home = os.homedir();
  const roots =
    process.platform === 'darwin'
      ? [path.join(home, 'Library', 'Application Support', 'Firefox')]
      : process.platform === 'win32'
        ? [path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Mozilla', 'Firefox')]
        : [path.join(home, '.mozilla', 'firefox'), path.join(home, 'snap/firefox/common/.mozilla/firefox')];

  for (const root of roots) {
    if (!fsSync.existsSync(root)) continue;

    // Prefer the default profile named in profiles.ini / installs.ini.
    const iniPath = path.join(root, 'profiles.ini');
    if (fsSync.existsSync(iniPath)) {
      try {
        const ini = fsSync.readFileSync(iniPath, 'utf-8');
        const paths = [...ini.matchAll(/^Path=(.+)$/gm)].map((m) => m[1].trim());
        const defaults = [...ini.matchAll(/^Default=(.+)$/gm)].map((m) => m[1].trim());
        const ordered = [...defaults, ...paths];
        for (const rel of ordered) {
          const abs = path.isAbsolute(rel) ? rel : path.join(root, rel);
          const db = path.join(abs, 'cookies.sqlite');
          if (fsSync.existsSync(db)) return db;
        }
      } catch {
        // Fall through to globbing.
      }
    }

    // Glob: any profile directory with a cookies.sqlite, default-* first.
    try {
      const entries = fsSync.readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory());
      entries.sort((a, b) => {
        const ad = /default/i.test(a.name) ? 0 : 1;
        const bd = /default/i.test(b.name) ? 0 : 1;
        return ad - bd;
      });
      for (const entry of entries) {
        const db = path.join(root, entry.name, 'cookies.sqlite');
        if (fsSync.existsSync(db)) return db;
      }
    } catch {
      // Nothing readable here; try the next root.
    }
  }
  return null;
}

/**
 * Copy a possibly-locked SQLite DB to a private temp file and open it
 * read-only. A running browser holds a write lock, and even a read-only open
 * can trip on the WAL, so working off a copy is the reliable path.
 *
 * @param {string} dbPath
 * @returns {{ db: import('better-sqlite3').Database, cleanup: () => void }}
 */
function openSqliteCopy(dbPath) {
  const Database = requireBetterSqlite();
  const tmp = path.join(os.tmpdir(), `xactions-cookies-${process.pid}-${Date.now()}.sqlite`);
  fsSync.copyFileSync(dbPath, tmp);
  // Copy the WAL/SHM sidecars too when present so recent writes are visible.
  for (const suffix of ['-wal', '-shm']) {
    if (fsSync.existsSync(dbPath + suffix)) {
      try {
        fsSync.copyFileSync(dbPath + suffix, tmp + suffix);
      } catch {
        // A missing sidecar is fine; the main file is enough.
      }
    }
  }
  const db = new Database(tmp, { readonly: true, fileMustExist: true });
  const cleanup = () => {
    try {
      db.close();
    } catch {
      // Already closed.
    }
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fsSync.unlinkSync(tmp + suffix);
      } catch {
        // Nothing to remove.
      }
    }
  };
  return { db, cleanup };
}

/** Cached better-sqlite3 constructor. */
let _Database = null;

/**
 * Load the better-sqlite3 constructor once, turning its native-module load
 * failure into an actionable message rather than a raw stack.
 *
 * @returns {typeof import('better-sqlite3')}
 */
function requireBetterSqlite() {
  if (_Database) return _Database;
  try {
    _Database = require('better-sqlite3');
    return _Database;
  } catch (err) {
    throw new Error(
      `better-sqlite3 is required to read browser cookie databases but failed to load: ${err.message}. ` +
        'Reinstall dependencies (npm install) or use `--cookies-file` with an exported cookies.txt instead.',
    );
  }
}

// ============================================================================
// Chromium decryption (Linux + macOS)
// ============================================================================

/**
 * Derive the AES key a Chromium browser uses to encrypt cookies.
 *
 *  - Linux: PBKDF2-SHA1 of the password "peanuts" (the default when no keyring
 *    is configured), salt "saltysalt", 1 iteration, 16-byte key.
 *  - macOS: PBKDF2-SHA1 of the browser's Keychain password ("<Browser> Safe
 *    Storage"), salt "saltysalt", 1003 iterations, 16-byte key.
 *
 * @param {BrowserName} browser
 * @returns {{ key: Buffer, source: string }}
 */
function chromiumAesKey(browser) {
  const salt = Buffer.from('saltysalt');
  if (process.platform === 'darwin') {
    const password = macKeychainPassword(browser);
    const key = crypto.pbkdf2Sync(password, salt, 1003, 16, 'sha1');
    return { key, source: 'macOS Keychain' };
  }
  // Linux default keyring-less key.
  const key = crypto.pbkdf2Sync('peanuts', salt, 1, 16, 'sha1');
  return { key, source: 'Linux default (peanuts)' };
}

/**
 * Read a Chromium browser's "Safe Storage" password from the macOS Keychain.
 *
 * @param {BrowserName} browser
 * @returns {string}
 */
function macKeychainPassword(browser) {
  const serviceName = {
    chrome: 'Chrome Safe Storage',
    chromium: 'Chromium Safe Storage',
    brave: 'Brave Safe Storage',
    edge: 'Microsoft Edge Safe Storage',
    arc: 'Arc Safe Storage',
  }[browser];

  try {
    const out = execFileSync('security', ['find-generic-password', '-w', '-s', serviceName], {
      encoding: 'utf-8',
    });
    return out.trim();
  } catch (err) {
    throw new Error(
      `Could not read the ${serviceName} password from the macOS Keychain (${err.message}). ` +
        'Approve the Keychain prompt if one appeared, or export cookies to a file and use `--cookies-file`.',
    );
  }
}

/**
 * Decrypt one Chromium `encrypted_value`. Handles the v10 (Linux default key)
 * and v11 (keyring) prefixes; both use AES-128-CBC with a 16-space IV. Newer
 * Chrome prepends a 32-byte SHA-256 domain hash to the plaintext, which is
 * stripped when detected.
 *
 * @param {Buffer} encrypted
 * @param {Buffer} key
 * @returns {string|null} The plaintext value, or null when it cannot be decrypted.
 */
function decryptChromiumValue(encrypted, key) {
  if (!encrypted || encrypted.length === 0) return null;

  const prefix = encrypted.slice(0, 3).toString('latin1');

  // No prefix: value is already plaintext (rare, but happens on some Linux
  // installs where encryption is disabled).
  if (prefix !== 'v10' && prefix !== 'v11') {
    return encrypted.toString('utf-8');
  }

  const iv = Buffer.alloc(16, ' ');
  const body = encrypted.slice(3);
  try {
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    decipher.setAutoPadding(false);
    let decrypted = Buffer.concat([decipher.update(body), decipher.final()]);

    // Strip PKCS#7 padding manually (we disabled auto-padding to tolerate the
    // domain-hash prefix some builds add).
    const pad = decrypted[decrypted.length - 1];
    if (pad > 0 && pad <= 16 && pad <= decrypted.length) {
      decrypted = decrypted.slice(0, decrypted.length - pad);
    }

    // Chrome v10.5+ prepends a 32-byte SHA-256 of the domain. Detect it: a
    // clean cookie value is printable, so if the first 32 bytes contain control
    // bytes, drop them.
    if (decrypted.length > 32) {
      const head = decrypted.slice(0, 32);
      const hasControl = head.some((b) => b < 0x09 || (b > 0x0d && b < 0x20));
      if (hasControl) decrypted = decrypted.slice(32);
    }

    return decrypted.toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * Read X/Twitter cookies from a Chromium-family browser's cookie database.
 *
 * @param {BrowserName} browser
 * @returns {Array<{name: string, value: string, domain: string, path: string, secure: boolean, httpOnly: boolean, expires: string|null}>}
 * @throws {Error} With an actionable message on unsupported platforms or a failed key derivation.
 */
function readChromiumCookies(browser) {
  if (process.platform === 'win32') {
    throw new Error(
      `Reading ${browser} cookies directly is not supported on Windows (the cookie key is sealed with DPAPI). ` +
        'Export your x.com cookies with the "Get cookies.txt LOCALLY" or Cookie-Editor extension, then run ' +
        '`xactions login --cookies-file <path>`.',
    );
  }
  if (process.platform !== 'linux' && process.platform !== 'darwin') {
    throw new Error(
      `Reading ${browser} cookies directly is not supported on ${process.platform}. ` +
        'Export your x.com cookies to a file and run `xactions login --cookies-file <path>`.',
    );
  }

  const userDataDirs = chromiumUserDataDirs(browser);
  let dbPath = null;
  for (const dir of userDataDirs) {
    const found = findChromiumCookieDb(dir);
    if (found) {
      dbPath = found;
      break;
    }
  }
  if (!dbPath) {
    throw new Error(
      `Could not find a ${browser} cookie database on this machine. Is ${browser} installed and have you ` +
        'logged in to x.com in it? Otherwise export cookies to a file and use `xactions login --cookies-file <path>`.',
    );
  }

  const { key, source } = chromiumAesKey(browser);
  const { db, cleanup } = openSqliteCopy(dbPath);
  try {
    const rows = db
      .prepare(
        "SELECT host_key, name, value, encrypted_value, path, is_secure, is_httponly, expires_utc " +
          'FROM cookies WHERE host_key LIKE ? OR host_key LIKE ?',
      )
      .all('%x.com', '%twitter.com');

    const cookies = [];
    let undecryptable = 0;
    for (const row of rows) {
      let value = row.value;
      if ((!value || value.length === 0) && row.encrypted_value && row.encrypted_value.length > 0) {
        value = decryptChromiumValue(Buffer.from(row.encrypted_value), key);
        if (value === null) {
          undecryptable += 1;
          continue;
        }
      }
      cookies.push({
        name: row.name,
        value: value || '',
        domain: row.host_key,
        path: row.path || '/',
        secure: Boolean(row.is_secure),
        httpOnly: Boolean(row.is_httponly),
        expires: row.expires_utc ? normalizeExpiry(row.expires_utc) : null,
      });
    }

    const filtered = filterXCookies(cookies);
    const haveRequired = REQUIRED_COOKIES.every((n) => filtered.some((c) => c.name === n));
    if (!haveRequired) {
      if (undecryptable > 0 && process.platform === 'linux') {
        throw new Error(
          `Found ${browser} cookies for x.com but could not decrypt them with the ${source} key. ` +
            `This browser is using your system keyring (GNOME Keyring / KWallet) to encrypt cookies, which ` +
            `cannot be read headlessly. Export your x.com cookies with the "Get cookies.txt LOCALLY" or ` +
            `Cookie-Editor extension and run \`xactions login --cookies-file <path>\`.`,
        );
      }
      throw new Error(
        `Read ${browser} cookies but did not find a logged-in x.com session (auth_token + ct0 missing). ` +
          'Log in to x.com in that browser first, or export cookies to a file and use `--cookies-file`.',
      );
    }
    return filtered;
  } finally {
    cleanup();
  }
}

/**
 * Read X/Twitter cookies from a Firefox `cookies.sqlite` (values are stored in
 * plaintext, so no key derivation is needed).
 *
 * @returns {Array<{name: string, value: string, domain: string, path: string, secure: boolean, httpOnly: boolean, expires: string|null}>}
 * @throws {Error} With an actionable message when no profile or session is found.
 */
function readFirefoxCookies() {
  const dbPath = findFirefoxCookieDb();
  if (!dbPath) {
    throw new Error(
      'Could not find a Firefox profile with a cookies database on this machine. Is Firefox installed and ' +
        'have you logged in to x.com in it? Otherwise export cookies to a file and use `xactions login --cookies-file <path>`.',
    );
  }

  const { db, cleanup } = openSqliteCopy(dbPath);
  try {
    const rows = db
      .prepare(
        'SELECT host, name, value, path, isSecure, isHttpOnly, expiry FROM moz_cookies ' +
          'WHERE host LIKE ? OR host LIKE ?',
      )
      .all('%x.com', '%twitter.com');

    const cookies = rows.map((row) => ({
      name: row.name,
      value: row.value || '',
      domain: row.host,
      path: row.path || '/',
      secure: Boolean(row.isSecure),
      httpOnly: Boolean(row.isHttpOnly),
      expires: row.expiry ? normalizeExpiry(row.expiry) : null,
    }));

    const filtered = filterXCookies(cookies);
    const haveRequired = REQUIRED_COOKIES.every((n) => filtered.some((c) => c.name === n));
    if (!haveRequired) {
      throw new Error(
        'Read Firefox cookies but did not find a logged-in x.com session (auth_token + ct0 missing). ' +
          'Log in to x.com in Firefox first, or export cookies to a file and use `--cookies-file`.',
      );
    }
    return filtered;
  } finally {
    cleanup();
  }
}

// ============================================================================
// Public: readBrowserCookies
// ============================================================================

/**
 * Read x.com cookies straight out of a locally installed browser.
 *
 * Supported without any export step:
 *   - Firefox on every platform (cookies are plaintext).
 *   - Chromium-family browsers (chrome, chromium, brave, edge, arc) on Linux
 *     when the browser uses the default keyring-less key, and on macOS via the
 *     Keychain.
 *
 * Everything else (Windows Chromium, or a Linux Chromium sealed by the system
 * keyring) throws an Error whose message names the exact `--cookies-file`
 * export path to use instead. Nothing is faked.
 *
 * @param {BrowserName} browser
 * @returns {Array<{name: string, value: string, domain: string, path: string, secure: boolean, httpOnly: boolean, expires: string|null}>}
 * @throws {Error} On an unknown browser name or an unsupported platform/browser combo.
 */
export function readBrowserCookies(browser) {
  const name = String(browser || '').toLowerCase().trim();
  if (name === 'firefox') return readFirefoxCookies();
  if (CHROMIUM_BROWSERS.has(name)) return readChromiumCookies(/** @type {BrowserName} */ (name));

  throw new Error(
    `Unknown browser "${browser}". Supported: chrome, chromium, brave, edge, arc, firefox.`,
  );
}

/** Browsers readBrowserCookies understands, for CLI validation and help text. */
export const SUPPORTED_BROWSERS = ['chrome', 'chromium', 'brave', 'edge', 'arc', 'firefox'];

export default { parseCookieInput, detectCookieFormat, readBrowserCookies, SUPPORTED_BROWSERS };

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests for the cookie import module: the painless-login parsers and the
 * browser cookie database readers.
 *
 * Every case is offline: text formats use inline fixtures, and the browser
 * readers run against real SQLite databases built in a temp HOME with the same
 * schema and (for Chromium) the same AES-128-CBC encryption the real browsers
 * use. No network, no mocks.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

import {
  parseCookieInput,
  detectCookieFormat,
  readBrowserCookies,
  SUPPORTED_BROWSERS,
} from '../../../src/client/auth/cookieImport.js';

// ============================================================================
// detectCookieFormat
// ============================================================================

describe('detectCookieFormat', () => {
  it('identifies a Netscape cookies.txt', () => {
    const text = '# Netscape HTTP Cookie File\n.x.com\tTRUE\t/\tTRUE\t2099999999\tauth_token\tabc';
    expect(detectCookieFormat(text)).toBe('netscape');
  });

  it('identifies a #HttpOnly_ prefixed Netscape row', () => {
    const text = '#HttpOnly_.x.com\tTRUE\t/\tTRUE\t2099999999\tauth_token\tabc';
    expect(detectCookieFormat(text)).toBe('netscape');
  });

  it('identifies a Cookie-Editor JSON array', () => {
    const text = JSON.stringify([{ name: 'auth_token', value: 'abc', domain: '.x.com' }]);
    expect(detectCookieFormat(text)).toBe('json-array');
  });

  it('identifies a Playwright storageState object', () => {
    const text = JSON.stringify({ cookies: [{ name: 'ct0', value: 'x', domain: '.x.com' }], origins: [] });
    expect(detectCookieFormat(text)).toBe('storage-state');
  });

  it('identifies a raw header string', () => {
    expect(detectCookieFormat('auth_token=abc; ct0=def')).toBe('header');
  });

  it('returns unknown for empty input', () => {
    expect(detectCookieFormat('')).toBe('unknown');
    expect(detectCookieFormat('   ')).toBe('unknown');
    expect(detectCookieFormat(null)).toBe('unknown');
  });
});

// ============================================================================
// parseCookieInput: Netscape
// ============================================================================

describe('parseCookieInput: Netscape cookies.txt', () => {
  it('parses tab-separated rows and #HttpOnly_ prefixes', () => {
    const text = [
      '# Netscape HTTP Cookie File',
      '#HttpOnly_.x.com\tTRUE\t/\tTRUE\t2099999999\tauth_token\tSECRETAUTH',
      '.x.com\tTRUE\t/\tTRUE\t2099999999\tct0\tSECRETCT0',
    ].join('\n');

    const cookies = parseCookieInput(text);
    const byName = Object.fromEntries(cookies.map((c) => [c.name, c]));

    expect(byName.auth_token.value).toBe('SECRETAUTH');
    expect(byName.auth_token.httpOnly).toBe(true);
    expect(byName.auth_token.secure).toBe(true);
    expect(byName.ct0.value).toBe('SECRETCT0');
    expect(byName.ct0.httpOnly).toBe(false);
  });

  it('drops non-X domains and comment lines', () => {
    const text = [
      '# comment',
      '.x.com\tTRUE\t/\tTRUE\t2099999999\tauth_token\tabc',
      '.google.com\tTRUE\t/\tFALSE\t0\tjunk\tnope',
    ].join('\n');

    const cookies = parseCookieInput(text);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].name).toBe('auth_token');
  });

  it('keeps twitter.com cookies too', () => {
    const text = '.twitter.com\tTRUE\t/\tTRUE\t2099999999\tauth_token\tabc';
    const cookies = parseCookieInput(text);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].domain).toBe('.twitter.com');
  });

  it('converts the unix-seconds expiry to ISO', () => {
    const text = '.x.com\tTRUE\t/\tTRUE\t2099999999\tauth_token\tabc';
    const cookies = parseCookieInput(text);
    expect(cookies[0].expires).toBe(new Date(2099999999 * 1000).toISOString());
  });
});

// ============================================================================
// parseCookieInput: JSON array (Cookie-Editor / EditThisCookie)
// ============================================================================

describe('parseCookieInput: Cookie-Editor / EditThisCookie JSON', () => {
  it('parses an array with expirationDate seconds', () => {
    const text = JSON.stringify([
      { name: 'auth_token', value: 'abc', domain: '.x.com', secure: true, httpOnly: true, expirationDate: 2099999999.5 },
      { name: 'ct0', value: 'def', domain: '.x.com' },
      { name: 'unrelated', value: 'z', domain: '.github.com' },
    ]);

    const cookies = parseCookieInput(text);
    expect(cookies.map((c) => c.name).sort()).toEqual(['auth_token', 'ct0']);
    const auth = cookies.find((c) => c.name === 'auth_token');
    expect(auth.value).toBe('abc');
    expect(auth.secure).toBe(true);
    expect(auth.httpOnly).toBe(true);
    expect(auth.expires).toBe(new Date(2099999999.5 * 1000).toISOString());
  });

  it('respects a forced format even if detection would differ', () => {
    const text = JSON.stringify([{ name: 'auth_token', value: 'abc', domain: '.x.com' }]);
    const cookies = parseCookieInput(text, { format: 'json-array' });
    expect(cookies[0].value).toBe('abc');
  });
});

// ============================================================================
// parseCookieInput: Playwright / Puppeteer storageState
// ============================================================================

describe('parseCookieInput: Playwright / Puppeteer storageState', () => {
  it('reads the cookies array out of a storageState object', () => {
    const text = JSON.stringify({
      cookies: [
        { name: 'auth_token', value: 'abc', domain: '.x.com', path: '/', secure: true, httpOnly: true, expires: 2099999999 },
        { name: 'ct0', value: 'def', domain: 'x.com' },
      ],
      origins: [],
    });

    const cookies = parseCookieInput(text);
    expect(cookies.map((c) => c.name).sort()).toEqual(['auth_token', 'ct0']);
    expect(cookies.find((c) => c.name === 'ct0').domain).toBe('x.com');
  });

  it('handles a Puppeteer cookies dump under the same shape', () => {
    const text = JSON.stringify({
      cookies: [{ name: 'auth_token', value: 'xyz', domain: '.x.com', expires: -1 }],
    });
    const cookies = parseCookieInput(text);
    expect(cookies).toHaveLength(1);
    expect(cookies[0].expires).toBeNull();
  });
});

// ============================================================================
// parseCookieInput: raw header string
// ============================================================================

describe('parseCookieInput: raw header string', () => {
  it('splits a "name=value; name2=value2" header', () => {
    const cookies = parseCookieInput('auth_token=abc123; ct0=def456; guest_id=v1%3A9');
    expect(cookies.map((c) => c.name)).toEqual(['auth_token', 'ct0', 'guest_id']);
    expect(cookies[0].value).toBe('abc123');
  });

  it('keeps all header cookies since none carry a domain', () => {
    const cookies = parseCookieInput('auth_token=abc; something=else');
    expect(cookies).toHaveLength(2);
  });

  it('tolerates values that contain = signs', () => {
    const cookies = parseCookieInput('auth_token=ab=cd; ct0=xy');
    expect(cookies.find((c) => c.name === 'auth_token').value).toBe('ab=cd');
  });
});

// ============================================================================
// parseCookieInput: error handling
// ============================================================================

describe('parseCookieInput: errors', () => {
  it('throws on empty input', () => {
    expect(() => parseCookieInput('')).toThrow(/No cookie text/);
  });

  it('throws when no X/Twitter cookies are present', () => {
    const text = JSON.stringify([{ name: 'sid', value: 'x', domain: '.github.com' }]);
    expect(() => parseCookieInput(text)).toThrow(/No X\/Twitter cookies/);
  });
});

// ============================================================================
// readBrowserCookies: real SQLite fixtures in a temp HOME
// ============================================================================

describe('parseCookieInput: expired and duplicate cookies', () => {
  const past = 1600000000; // 2020
  const future = 2099999999; // 2036

  it('drops expired cookies and keeps session cookies', () => {
    const cookies = parseCookieInput(
      JSON.stringify({
        cookies: [
          { name: 'auth_token', value: 'a', domain: '.x.com', expires: -1 },
          { name: 'ct0', value: 'old', domain: '.x.com', expires: past },
          { name: 'twid', value: 'u%3D1', domain: '.x.com', expires: future },
        ],
      }),
    );
    expect(cookies.map((c) => c.name).sort()).toEqual(['auth_token', 'twid']);
  });

  it('prefers the x.com copy over a twitter.com duplicate, wherever it appears in the file', () => {
    const text = [
      '# Netscape HTTP Cookie File',
      `#HttpOnly_.x.com\tTRUE\t/\tTRUE\t${future}\tauth_token\tNEWTOKEN`,
      `.x.com\tTRUE\t/\tTRUE\t${future}\tct0\tNEWCT0`,
      `#HttpOnly_.twitter.com\tTRUE\t/\tTRUE\t${future}\tauth_token\tOLDTOKEN`,
      `.twitter.com\tTRUE\t/\tTRUE\t${future}\tct0\tOLDCT0`,
    ].join('\n');
    const byName = Object.fromEntries(parseCookieInput(text).map((c) => [c.name, c.value]));
    expect(byName).toEqual({ auth_token: 'NEWTOKEN', ct0: 'NEWCT0' });
  });

  it('drops an expired x.com cookie in favour of a live twitter.com one', () => {
    const text = [
      `.x.com\tTRUE\t/\tTRUE\t${past}\tauth_token\tDEAD`,
      `.twitter.com\tTRUE\t/\tTRUE\t${future}\tauth_token\tLIVE`,
    ].join('\n');
    expect(parseCookieInput(text).map((c) => c.value)).toEqual(['LIVE']);
  });

  it('feeds deduplicated cookies to the account pool', async () => {
    const { normalizeCookies } = await import('../../../src/scrapers/twitter/http/accountPool.js');
    const text = [
      `#HttpOnly_.x.com\tTRUE\t/\tTRUE\t${future}\tauth_token\tNEWTOKEN`,
      `#HttpOnly_.twitter.com\tTRUE\t/\tTRUE\t${past}\tauth_token\tOLDTOKEN`,
      `.x.com\tTRUE\t/\tTRUE\t${future}\tct0\tNEWCT0`,
    ].join('\n');
    expect(normalizeCookies(text)).toBe('auth_token=NEWTOKEN; ct0=NEWCT0');
  });
});

describe('readBrowserCookies', () => {
  let home;
  let origHome;

  beforeEach(() => {
    home = path.join(tmpdir(), `xactions-home-${randomUUID()}`);
    fs.mkdirSync(home, { recursive: true });
    origHome = process.env.HOME;
    process.env.HOME = home;
  });

  afterEach(() => {
    process.env.HOME = origHome;
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('rejects an unknown browser name', () => {
    expect(() => readBrowserCookies('safari')).toThrow(/Unknown browser/);
  });

  it('exposes the supported browser list', () => {
    expect(SUPPORTED_BROWSERS).toEqual(['chrome', 'chromium', 'brave', 'edge', 'arc', 'firefox']);
  });

  it('gives an actionable message when no Firefox profile exists', () => {
    expect(() => readBrowserCookies('firefox')).toThrow(/--cookies-file/);
  });

  it('reads a Firefox cookies.sqlite (plaintext values)', () => {
    const profile = path.join(home, '.mozilla/firefox/abcd.default-release');
    fs.mkdirSync(profile, { recursive: true });
    fs.writeFileSync(
      path.join(home, '.mozilla/firefox/profiles.ini'),
      '[Profile0]\nName=default\nIsRelative=1\nPath=abcd.default-release\nDefault=1\n',
    );

    const db = new Database(path.join(profile, 'cookies.sqlite'));
    db.exec(
      'CREATE TABLE moz_cookies (id INTEGER PRIMARY KEY, host TEXT, name TEXT, value TEXT, path TEXT, expiry INTEGER, isSecure INTEGER, isHttpOnly INTEGER)',
    );
    const ins = db.prepare(
      'INSERT INTO moz_cookies (host,name,value,path,expiry,isSecure,isHttpOnly) VALUES (?,?,?,?,?,?,?)',
    );
    ins.run('.x.com', 'auth_token', 'FFAUTH', '/', 2099999999, 1, 1);
    ins.run('.x.com', 'ct0', 'FFCT0', '/', 2099999999, 1, 0);
    ins.run('.google.com', 'junk', 'x', '/', 0, 0, 0);
    db.close();

    const cookies = readBrowserCookies('firefox');
    const byName = Object.fromEntries(cookies.map((c) => [c.name, c.value]));
    expect(byName).toEqual({ auth_token: 'FFAUTH', ct0: 'FFCT0' });
  });

  it('reads and decrypts a Chromium Cookies DB (v10 / Linux default key)', () => {
    // Only the Linux default "peanuts" key is decryptable headlessly. On macOS
    // this path needs the Keychain, which is not available in CI, so skip.
    if (process.platform !== 'linux') return;

    const key = crypto.pbkdf2Sync('peanuts', Buffer.from('saltysalt'), 1, 16, 'sha1');
    const iv = Buffer.alloc(16, ' ');
    const encrypt = (plaintext) => {
      const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
      return Buffer.concat([Buffer.from('v10'), cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
    };

    const dir = path.join(home, '.config/chromium/Default');
    fs.mkdirSync(dir, { recursive: true });
    const db = new Database(path.join(dir, 'Cookies'));
    db.exec(
      'CREATE TABLE cookies (host_key TEXT, name TEXT, value TEXT, encrypted_value BLOB, path TEXT, expires_utc INTEGER, is_secure INTEGER, is_httponly INTEGER)',
    );
    const ins = db.prepare(
      'INSERT INTO cookies (host_key,name,value,encrypted_value,path,expires_utc,is_secure,is_httponly) VALUES (?,?,?,?,?,?,?,?)',
    );
    ins.run('.x.com', 'auth_token', '', encrypt('CHROMEAUTH'), '/', 14000000000000000, 1, 1);
    ins.run('.x.com', 'ct0', '', encrypt('CHROMECT0'), '/', 14000000000000000, 1, 0);
    ins.run('.google.com', 'junk', '', encrypt('nope'), '/', 14000000000000000, 0, 0);
    db.close();

    const cookies = readBrowserCookies('chromium');
    const byName = Object.fromEntries(cookies.map((c) => [c.name, c.value]));
    expect(byName).toEqual({ auth_token: 'CHROMEAUTH', ct0: 'CHROMECT0' });
    // The Chrome microsecond-since-1601 expiry should normalize to an ISO string.
    const auth = cookies.find((c) => c.name === 'auth_token');
    expect(typeof auth.expires).toBe('string');
    expect(Number.isNaN(Date.parse(auth.expires))).toBe(false);
  });

  it('reports missing auth_token as a login prompt, not a silent empty result', () => {
    if (process.platform !== 'linux') return;

    const key = crypto.pbkdf2Sync('peanuts', Buffer.from('saltysalt'), 1, 16, 'sha1');
    const iv = Buffer.alloc(16, ' ');
    const encrypt = (plaintext) => {
      const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
      return Buffer.concat([Buffer.from('v10'), cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()]);
    };

    const dir = path.join(home, '.config/google-chrome/Default');
    fs.mkdirSync(dir, { recursive: true });
    const db = new Database(path.join(dir, 'Cookies'));
    db.exec(
      'CREATE TABLE cookies (host_key TEXT, name TEXT, value TEXT, encrypted_value BLOB, path TEXT, expires_utc INTEGER, is_secure INTEGER, is_httponly INTEGER)',
    );
    // Only a non-auth cookie is present, so the required-cookie guard should fire.
    db.prepare(
      'INSERT INTO cookies (host_key,name,value,encrypted_value,path,expires_utc,is_secure,is_httponly) VALUES (?,?,?,?,?,?,?,?)',
    ).run('.x.com', 'guest_id', '', encrypt('v1%3A9'), '/', 14000000000000000, 0, 0);
    db.close();

    expect(() => readBrowserCookies('chrome')).toThrow(/did not find a logged-in x\.com session/);
  });
});

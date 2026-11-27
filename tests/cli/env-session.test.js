// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The CLI's HTTP reads take the session from XACTIONS_SESSION_COOKIE (and
 * XACTIONS_CSRF_TOKEN for ct0) when it is set, ahead of a saved one, the same
 * rule `loadSavedSession` documents for the MCP server and the browser paths.
 * Without it, `docker run -e XACTIONS_SESSION_COOKIE ... followers` ran
 * logged out while the MCP server in the same image was logged in.
 *
 * Offline: only session resolution runs, against a temporary XACTIONS_HOME.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-env-session-'));
process.env.HOME = home;
process.env.XACTIONS_HOME = home;

/** Cookie values of the right shape that no account has ever had. */
const ENV_AUTH = '1'.repeat(40);
const ENV_CT0 = 'e'.repeat(32);
const SAVED_AUTH = '2'.repeat(40);
const SAVED_CT0 = 'd'.repeat(32);

let createHttpScraper;
let loadSavedCookieString;

const byName = (cookies) => Object.fromEntries(cookies.map((c) => [c.name, c.value]));

beforeAll(async () => {
  ({ createHttpScraper, loadSavedCookieString } = await import('../../src/cli/index.js'));
});

beforeEach(() => {
  delete process.env.XACTIONS_SESSION_COOKIE;
  delete process.env.XACTIONS_CSRF_TOKEN;
  fs.rmSync(path.join(home, 'cookies.json'), { force: true });
});

afterAll(() => {
  delete process.env.XACTIONS_SESSION_COOKIE;
  delete process.env.XACTIONS_CSRF_TOKEN;
  fs.rmSync(home, { recursive: true, force: true });
});

function saveJar() {
  fs.writeFileSync(path.join(home, 'cookies.json'), JSON.stringify([
    { name: 'auth_token', value: SAVED_AUTH, domain: '.x.com' },
    { name: 'ct0', value: SAVED_CT0, domain: '.x.com' },
  ]));
}

describe('session from the environment', () => {
  it('createHttpScraper uses XACTIONS_SESSION_COOKIE and XACTIONS_CSRF_TOKEN with nothing saved', async () => {
    process.env.XACTIONS_SESSION_COOKIE = ENV_AUTH;
    process.env.XACTIONS_CSRF_TOKEN = ENV_CT0;
    const scraper = await createHttpScraper();
    expect(byName(await scraper.getCookies())).toEqual({ auth_token: ENV_AUTH, ct0: ENV_CT0 });
    expect(await scraper.isLoggedIn()).toBe(true);
  });

  it('the environment wins over a saved cookie jar', async () => {
    saveJar();
    process.env.XACTIONS_SESSION_COOKIE = ENV_AUTH;
    const scraper = await createHttpScraper();
    expect(byName(await scraper.getCookies()).auth_token).toBe(ENV_AUTH);
    expect(await loadSavedCookieString()).toBe(`auth_token=${ENV_AUTH}`);
  });

  it('loadSavedCookieString carries ct0 from XACTIONS_CSRF_TOKEN', async () => {
    process.env.XACTIONS_SESSION_COOKIE = ENV_AUTH;
    process.env.XACTIONS_CSRF_TOKEN = ENV_CT0;
    expect(await loadSavedCookieString()).toBe(`auth_token=${ENV_AUTH}; ct0=${ENV_CT0}`);
  });

  it('without the variable, the saved jar is used as before', async () => {
    saveJar();
    const scraper = await createHttpScraper();
    expect(byName(await scraper.getCookies())).toEqual({ auth_token: SAVED_AUTH, ct0: SAVED_CT0 });
    expect(await loadSavedCookieString()).toBe(`auth_token=${SAVED_AUTH}; ct0=${SAVED_CT0}`);
  });
});

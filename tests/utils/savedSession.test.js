// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Reading the saved X session. The browser path used to look only at the
 * environment, ran logged out when nobody had exported the variable, and
 * reported follows that never happened.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadSavedSession, sessionDir } from '../../src/utils/savedSession.js';

let dir;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'xactions-session-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('loadSavedSession', () => {
  it('returns null when nothing is saved', async () => {
    expect(await loadSavedSession({ dir, env: {} })).toBeNull();
  });

  it('ignores a cookie jar that is not an array', async () => {
    writeFileSync(join(dir, 'cookies.json'), JSON.stringify({ auth_token: 'nope' }));
    expect(await loadSavedSession({ dir, env: {} })).toBeNull();
  });

  it('reads auth_token and ct0 from the cookie jar', async () => {
    writeFileSync(
      join(dir, 'cookies.json'),
      JSON.stringify([
        { name: 'auth_token', value: 'abc123' },
        { name: 'ct0', value: 'ct0value' },
        { name: 'kdt', value: 'irrelevant' },
      ]),
    );
    const session = await loadSavedSession({ dir, env: {} });
    expect(session).toEqual({ authToken: 'abc123', ct0: 'ct0value', source: 'cookies.json' });
  });

  it('survives a jar entry without a value', async () => {
    writeFileSync(
      join(dir, 'cookies.json'),
      JSON.stringify([{ name: 'auth_token', value: '' }, { name: 'ct0', value: 'ct0value' }]),
    );
    expect(await loadSavedSession({ dir, env: {} })).toBeNull();
  });

  it('falls back to config.json when there is no jar', async () => {
    writeFileSync(join(dir, 'config.json'), JSON.stringify({ authToken: 'fromConfig', csrfToken: 'csrf' }));
    const session = await loadSavedSession({ dir, env: {} });
    expect(session).toEqual({ authToken: 'fromConfig', ct0: 'csrf', source: 'config.json' });
  });

  it('prefers the environment over anything on disk', async () => {
    writeFileSync(
      join(dir, 'cookies.json'),
      JSON.stringify([{ name: 'auth_token', value: 'disk' }, { name: 'ct0', value: 'diskct0' }]),
    );
    const session = await loadSavedSession({
      dir,
      env: { XACTIONS_SESSION_COOKIE: 'envToken', XACTIONS_CSRF_TOKEN: 'envCt0' },
    });
    expect(session).toEqual({ authToken: 'envToken', ct0: 'envCt0', source: 'environment' });
  });

  it('reports the jar as the source even when ct0 is missing', async () => {
    writeFileSync(join(dir, 'cookies.json'), JSON.stringify([{ name: 'auth_token', value: 'only' }]));
    const session = await loadSavedSession({ dir, env: {} });
    expect(session).toEqual({ authToken: 'only', ct0: null, source: 'cookies.json' });
  });
});

describe('sessionDir', () => {
  const prevHome = process.env.XACTIONS_HOME;

  afterEach(() => {
    if (prevHome === undefined) delete process.env.XACTIONS_HOME;
    else process.env.XACTIONS_HOME = prevHome;
  });

  it('honours an explicit override', () => {
    expect(sessionDir('/somewhere')).toBe('/somewhere');
  });

  it('honours XACTIONS_HOME', () => {
    process.env.XACTIONS_HOME = '/custom/home';
    expect(sessionDir()).toBe('/custom/home');
  });

  it('stays out of the real home directory under the test runner', () => {
    delete process.env.XACTIONS_HOME;
    expect(sessionDir()).toContain('xactions-vitest-');
  });
});

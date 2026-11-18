// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions account vault tests — offline: network checks are injected fakes,
// the CLI runs against a temp XACTIONS_HOME.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createAccountVault,
  AccountVaultError,
  normalizePlatform,
  SUPPORTED_PLATFORMS,
} from '../src/vault/accountVault.js';
import { toolMap } from '../src/mcp/local-tools.js';

const CLI = fileURLToPath(new URL('../src/cli/index.js', import.meta.url));
const TWITTER_COOKIES = 'auth_token=tok-abc; ct0=csrf-123';
const BSKY_CREDS = { identifier: 'alice.bsky.social', password: 'app-pass-xyz' };
const MASTO_CREDS = { instance: 'mastodon.social', accessToken: 'masto-tok' };

/** Fake fetch that answers per-host so bluesky/mastodon tests never touch net. */
function fakeFetch(handlers = {}) {
  return async (url) => {
    for (const [match, responder] of Object.entries(handlers)) {
      if (String(url).includes(match)) {
        const { status = 200, body = {} } = typeof responder === 'function' ? responder() : responder;
        return { ok: status >= 200 && status < 300, status, json: async () => body };
      }
    }
    return { ok: false, status: 599, json: async () => ({}) };
  };
}

function makeVault(home, overrides = {}) {
  return createAccountVault({
    dbPath: path.join(home, 'accounts.db'),
    cacheDir: home,
    fetchImpl: fakeFetch({
      'createSession': { status: 200, body: { accessJwt: 'jwt' } },
      'verify_credentials': { status: 200, body: { acct: 'alice' } },
    }),
    twitterTest: async () => ({ ok: true, reason: 'session accepted by X' }),
    ...overrides,
  });
}

describe('accountVault', () => {
  let home;
  let previousHome;
  let previousHomeDir;

  beforeEach(async () => {
    home = await fsp.mkdtemp(path.join(os.tmpdir(), 'xactions-vault-'));
    previousHome = process.env.XACTIONS_HOME;
    previousHomeDir = process.env.HOME;
    process.env.XACTIONS_HOME = home;
    process.env.HOME = home;
  });

  afterEach(async () => {
    if (previousHome === undefined) delete process.env.XACTIONS_HOME;
    else process.env.XACTIONS_HOME = previousHome;
    if (previousHomeDir === undefined) delete process.env.HOME;
    else process.env.HOME = previousHomeDir;
    await fsp.rm(home, { recursive: true, force: true });
  });

  describe('normalizePlatform', () => {
    it('accepts canonical names and aliases', () => {
      expect(normalizePlatform('twitter')).toBe('twitter');
      expect(normalizePlatform('x')).toBe('twitter');
      expect(normalizePlatform('bluesky')).toBe('bluesky');
      expect(normalizePlatform('bsky')).toBe('bluesky');
      expect(normalizePlatform('mastodon')).toBe('mastodon');
      expect(normalizePlatform('masto')).toBe('mastodon');
    });

    it('rejects threads naming the supported platforms', () => {
      expect(() => normalizePlatform('threads')).toThrow(AccountVaultError);
      expect(() => normalizePlatform('threads')).toThrow(/twitter, bluesky, mastodon/);
      expect(() => normalizePlatform('threads')).toThrow(/anonymous/i);
    });

    it('rejects unknown platforms listing the valid ones', () => {
      expect(() => normalizePlatform('myspace')).toThrow(/Unknown platform/);
      expect(() => normalizePlatform('myspace')).toThrow(/twitter, bluesky, mastodon/);
    });
  });

  describe('add', () => {
    it('stores twitter cookies from a header string and masks the result', async () => {
      const vault = makeVault(home);
      const result = await vault.add({
        platform: 'twitter', name: 'a1',
        credentials: { cookies: TWITTER_COOKIES },
        proxy: 'http://user:pass@proxy.example.com:8080',
      });
      expect(result).toMatchObject({ platform: 'twitter', name: 'a1', proxy: 'proxy.example.com:8080', replaced: false });
      expect(JSON.stringify(result)).not.toContain('tok-abc');
      expect(JSON.stringify(result)).not.toContain('pass@');
      vault.close();
    });

    it('rejects twitter credentials without auth_token and writes nothing', async () => {
      const vault = makeVault(home);
      await expect(
        vault.add({ platform: 'twitter', name: 'bad', credentials: { cookies: 'ct0=only' } })
      ).rejects.toThrow(/auth_token/);
      expect(await vault.list()).toHaveLength(0);
      vault.close();
    });

    it('rejects bluesky missing fields, naming them', async () => {
      const vault = makeVault(home);
      await expect(
        vault.add({ platform: 'bluesky', name: 'b1', credentials: { identifier: 'a.bsky.social' } })
      ).rejects.toThrow(/password/);
      await expect(
        vault.add({ platform: 'bluesky', name: 'b2', credentials: { password: 'x' } })
      ).rejects.toThrow(/identifier/);
      vault.close();
    });

    it('rejects mastodon missing instance or accessToken', async () => {
      const vault = makeVault(home);
      await expect(
        vault.add({ platform: 'mastodon', name: 'm1', credentials: { accessToken: 'tok' } })
      ).rejects.toThrow(/instance/);
      await expect(
        vault.add({ platform: 'mastodon', name: 'm2', credentials: { instance: 'masto.social' } })
      ).rejects.toThrow(/accessToken/);
      vault.close();
    });

    it('rejects threads credentials up front', async () => {
      const vault = makeVault(home);
      await expect(
        vault.add({ platform: 'threads', name: 't1', credentials: {} })
      ).rejects.toThrow(/anonymous|no stored credentials/i);
      vault.close();
    });

    it('upserts on duplicate (platform, name) keeping added_at', async () => {
      const vault = makeVault(home);
      await vault.add({ platform: 'bluesky', name: 'b1', credentials: BSKY_CREDS });
      await new Promise((r) => setTimeout(r, 5));
      const second = await vault.add({
        platform: 'bsky', name: 'b1',
        credentials: { ...BSKY_CREDS, password: 'new-pass' },
      });
      expect(second.replaced).toBe(true);
      const listed = await vault.list();
      expect(listed).toHaveLength(1);
      vault.close();
    });
  });

  describe('list / get / remove', () => {
    it('list returns masked rows only — no credential material anywhere', async () => {
      const vault = makeVault(home);
      await vault.add({ platform: 'twitter', name: 'a1', credentials: { cookies: TWITTER_COOKIES }, proxy: 'http://u:p@px.local:3128' });
      await vault.add({ platform: 'bluesky', name: 'b1', credentials: BSKY_CREDS });
      await vault.add({ platform: 'mastodon', name: 'm1', credentials: MASTO_CREDS });

      const rows = await vault.list();
      expect(rows.map((r) => r.name).sort()).toEqual(['a1', 'b1', 'm1']);
      const json = JSON.stringify(rows);
      for (const secret of ['tok-abc', 'csrf-123', 'app-pass-xyz', 'masto-tok', 'alice.bsky.social', 'u:p@']) {
        expect(json).not.toContain(secret);
      }
      const a1 = rows.find((r) => r.name === 'a1');
      expect(a1.proxy).toBe('px.local:3128');
      vault.close();
    });

    it('filters list by platform', async () => {
      const vault = makeVault(home);
      await vault.add({ platform: 'twitter', name: 'a1', credentials: { cookies: TWITTER_COOKIES } });
      await vault.add({ platform: 'bluesky', name: 'b1', credentials: BSKY_CREDS });
      const rows = await vault.list({ platform: 'x' });
      expect(rows).toHaveLength(1);
      expect(rows[0].platform).toBe('twitter');
      vault.close();
    });

    it('remove misses throw and hits return the removed row', async () => {
      const vault = makeVault(home);
      await expect(vault.remove({ name: 'ghost' })).rejects.toThrow(/No account named/);
      await vault.add({ platform: 'bluesky', name: 'b1', credentials: BSKY_CREDS });
      const removed = await vault.remove({ name: 'b1' });
      expect(removed).toMatchObject({ removed: true, platform: 'bluesky', name: 'b1' });
      expect(await vault.list()).toHaveLength(0);
      vault.close();
    });

    it('ambiguous name across platforms requires platform', async () => {
      const vault = makeVault(home);
      await vault.add({ platform: 'twitter', name: 'same', credentials: { cookies: TWITTER_COOKIES } });
      await vault.add({ platform: 'bluesky', name: 'same', credentials: BSKY_CREDS });
      await expect(vault.get({ name: 'same' })).rejects.toThrow(/multiple platforms/);
      const one = await vault.get({ name: 'same', platform: 'bluesky' });
      expect(one.platform).toBe('bluesky');
      vault.close();
    });
  });

  describe('use', () => {
    it('writes cookies.json mode 0600 and backs up an existing one', async () => {
      const vault = makeVault(home);
      await vault.add({ platform: 'twitter', name: 'a1', credentials: { cookies: TWITTER_COOKIES } });

      // `use` writes to ~/.xactions (HOME redirect) — where the CLI reads.
      const sessionHome = path.join(home, '.xactions');
      fs.mkdirSync(sessionHome, { recursive: true });
      fs.writeFileSync(path.join(sessionHome, 'cookies.json'), JSON.stringify([{ name: 'old', value: '1' }]), { mode: 0o600 });

      const result = await vault.use({ name: 'a1' });
      expect(result).toMatchObject({ activated: 'a1', platform: 'twitter', backup: true });

      const jar = JSON.parse(fs.readFileSync(path.join(sessionHome, 'cookies.json'), 'utf8'));
      expect(jar.some((c) => c.name === 'auth_token' && c.value === 'tok-abc')).toBe(true);
      expect(fs.statSync(path.join(sessionHome, 'cookies.json')).mode & 0o777).toBe(0o600);
      expect(fs.existsSync(path.join(sessionHome, 'cookies.json.bak'))).toBe(true);

      // Tokens mirrored into config.json like `xactions login` does.
      const config = JSON.parse(fs.readFileSync(path.join(sessionHome, 'config.json'), 'utf8'));
      expect(config.authToken).toBe('tok-abc');
      expect(config.csrfToken).toBe('csrf-123');
      vault.close();
    });

    it('rejects non-twitter accounts', async () => {
      const vault = makeVault(home);
      await vault.add({ platform: 'bluesky', name: 'b1', credentials: BSKY_CREDS });
      await expect(vault.use({ name: 'b1' })).rejects.toThrow(/Only twitter/);
      vault.close();
    });
  });

  describe('test', () => {
    it('returns ok:true with a reason and touches last_used', async () => {
      const vault = makeVault(home);
      await vault.add({ platform: 'bluesky', name: 'b1', credentials: BSKY_CREDS });
      const result = await vault.test({ name: 'b1' });
      expect(result).toMatchObject({ platform: 'bluesky', name: 'b1', ok: true });
      expect(result.reason).toBeTruthy();
      const [row] = await vault.list();
      expect(row.lastUsedAt).toBeTruthy();
      vault.close();
    });

    it('returns ok:false on bad credentials without locking or removing', async () => {
      const vault = makeVault(home, {
        fetchImpl: fakeFetch({ 'createSession': { status: 401, body: { message: 'AuthenticationRequired' } } }),
      });
      await vault.add({ platform: 'bluesky', name: 'b1', credentials: BSKY_CREDS });
      const result = await vault.test({ name: 'b1' });
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('401');
      expect(await vault.list()).toHaveLength(1);
      vault.close();
    });

    it('mastodon test hits verify_credentials with the bearer token', async () => {
      let seenAuth;
      const vault = makeVault(home, {
        fetchImpl: async (url, init) => {
          if (String(url).includes('verify_credentials')) {
            seenAuth = init.headers.Authorization;
            return { ok: true, status: 200, json: async () => ({ acct: 'alice' }) };
          }
          return { ok: false, status: 599, json: async () => ({}) };
        },
      });
      await vault.add({ platform: 'mastodon', name: 'm1', credentials: MASTO_CREDS });
      const result = await vault.test({ name: 'm1' });
      expect(result.ok).toBe(true);
      expect(seenAuth).toBe('Bearer masto-tok');
      vault.close();
    });

    it('twitter test delegates to the injected checker with a cookie header', async () => {
      let seenHeader;
      const vault = makeVault(home, {
        twitterTest: async (header, proxy) => {
          seenHeader = header;
          return { ok: false, reason: 'HTTP 403' };
        },
      });
      await vault.add({ platform: 'twitter', name: 'a1', credentials: { cookies: TWITTER_COOKIES } });
      const result = await vault.test({ name: 'a1' });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('HTTP 403');
      expect(seenHeader).toContain('auth_token=tok-abc');
      vault.close();
    });
  });

  describe('MCP handlers', () => {
    it('x_accounts_add prefers credentials_file so secrets stay out of args', async () => {
      const credsFile = path.join(home, 'bsky.json');
      fs.writeFileSync(credsFile, JSON.stringify(BSKY_CREDS));
      const result = await toolMap.x_accounts_add({
        platform: 'bluesky', name: 'mcp-b1', credentials_file: credsFile,
      });
      expect(result).toMatchObject({ platform: 'bluesky', name: 'mcp-b1', replaced: false });
      const rows = await toolMap.x_accounts_list({});
      const row = rows.find((r) => r.name === 'mcp-b1');
      expect(row).toBeTruthy();
      expect(JSON.stringify(rows)).not.toContain('app-pass-xyz');
    });

    it('x_accounts_add reads cookies_file for twitter', async () => {
      const cookieFile = path.join(home, 'cookies.txt');
      fs.writeFileSync(cookieFile, TWITTER_COOKIES);
      const result = await toolMap.x_accounts_add({
        platform: 'twitter', name: 'mcp-t1', cookies_file: cookieFile,
      });
      expect(result.platform).toBe('twitter');
    });

    it('x_accounts_add surfaces a clear error for a missing file', async () => {
      await expect(
        toolMap.x_accounts_add({ platform: 'bluesky', name: 'x', credentials_file: '/no/such/file.json' })
      ).rejects.toThrow(/cannot read credentials_file/);
    });
  });
});

describe('xactions accounts CLI', () => {
  let home;

  function cli(args) {
    return execFileSync(process.execPath, [CLI, ...args], {
      env: { ...process.env, XACTIONS_HOME: home, HOME: home, FORCE_COLOR: '0' },
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  function cliError(args) {
    try {
      cli(args);
      return null;
    } catch (error) {
      return { status: error.status, stderr: error.stderr, stdout: error.stdout };
    }
  }

  beforeEach(async () => {
    home = await fsp.mkdtemp(path.join(os.tmpdir(), 'xactions-acctcli-'));
  });

  afterEach(async () => {
    await fsp.rm(home, { recursive: true, force: true });
  });

  it('add twitter via cookies-file then list shows name and proxy host, no secrets', async () => {
    const cookieFile = path.join(home, 'cookies.txt');
    fs.writeFileSync(cookieFile, TWITTER_COOKIES);

    cli(['accounts', 'add', 'a1', '--platform', 'twitter', '--cookies-file', cookieFile, '--proxy', 'http://u:p@px.local:8080', '--json']);
    const out = cli(['accounts', 'list', '--json']);
    const rows = JSON.parse(out);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ platform: 'twitter', name: 'a1', proxy: 'px.local:8080' });
    expect(out).not.toContain('tok-abc');
    expect(out).not.toContain('u:p@');
  });

  it('use activates the twitter account session (cookies.json written)', async () => {
    const cookieFile = path.join(home, 'cookies.txt');
    fs.writeFileSync(cookieFile, TWITTER_COOKIES);
    cli(['accounts', 'add', 'a1', '--platform', 'twitter', '--cookies-file', cookieFile]);
    cli(['accounts', 'use', 'a1']);
    const jar = JSON.parse(fs.readFileSync(path.join(home, '.xactions', 'cookies.json'), 'utf8'));
    expect(jar.some((c) => c.name === 'auth_token' && c.value === 'tok-abc')).toBe(true);
  });

  it('threads add fails naming the supported platforms', async () => {
    const err = cliError(['accounts', 'add', 't1', '--platform', 'threads', '--json']);
    expect(err.status).not.toBe(0);
    const payload = JSON.parse(err.stdout || err.stderr);
    expect(payload.error).toMatch(/anonymous|no stored credentials/i);
    expect(payload.error).toContain('twitter');
  });

  it('remove of a missing account exits non-zero', async () => {
    const err = cliError(['accounts', 'remove', 'ghost', '--json']);
    expect(err.status).not.toBe(0);
    expect(JSON.parse(err.stdout).error).toMatch(/No account named/);
  });

  it('bare `accounts` lists like `accounts list`', async () => {
    const cookieFile = path.join(home, 'cookies.txt');
    fs.writeFileSync(cookieFile, TWITTER_COOKIES);
    cli(['accounts', 'add', 'a1', '--platform', 'x', '--cookies-file', cookieFile]);
    const out = cli(['accounts']);
    expect(out).toContain('a1');
    expect(out).toContain('twitter');
  });
});

describe('SUPPORTED_PLATFORMS', () => {
  it('is exactly twitter, bluesky, mastodon', () => {
    expect([...SUPPORTED_PLATFORMS]).toEqual(['twitter', 'bluesky', 'mastodon']);
  });
});

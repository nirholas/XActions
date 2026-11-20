// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Two properties matter here, and they pull in opposite directions.
 *
 * The pool has to stay current, which is why it is generated rather than typed;
 * and a session has to stay consistent, because a client that claims to be
 * Chrome on Windows and then Firefox on macOS from one IP inside one cookie jar
 * is more conspicuous than any single stale string.
 *
 * Everything here runs offline against a committed copy of
 * fa0311/latest-user-agent (MIT).
 *
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  retargetPlatform,
  extractVersion,
  buildProfiles,
  readFixtures,
  sync,
  DEFAULT_PROFILE_ID as GENERATOR_DEFAULT_PROFILE_ID,
} from '../../../scripts/sync-user-agents.mjs';

import {
  USER_AGENTS,
  USER_AGENT_PROFILES,
  USER_AGENT_SOURCE,
  BROWSER_VERSIONS,
  DEFAULT_USER_AGENT,
  randomUserAgent,
  rotateUserAgent,
  rotateProfile,
  sessionUserAgent,
  sessionProfile,
  profileById,
  configureUserAgent,
  resetUserAgentSession,
  isRotationEnabled,
  clientHintHeaders,
  profileHeaders,
} from '../../../src/client/auth/userAgent.js';

const FIXTURES = path.resolve(process.cwd(), 'tests/fixtures/upstream/user-agents');
const FROZEN_NOW = '2026-08-27T00:00:00.000Z';

let tmpDir;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'xactions-user-agents-'));
});

afterAll(async () => {
  if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('sync-user-agents: building profiles from upstream', () => {
  let fixture;

  beforeAll(async () => {
    fixture = await readFixtures(FIXTURES);
  });

  it('swaps the platform token in a Chromium string and leaves the version alone', () => {
    const linux = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';
    expect(retargetPlatform(linux, 'Windows NT 10.0; Win64; x64')).toBe(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    );
  });

  it('keeps the Gecko rv: fragment, which belongs to the version and not the platform', () => {
    const linux = 'Mozilla/5.0 (X11; Linux x86_64; rv:153.0) Gecko/20100101 Firefox/153.0';
    expect(retargetPlatform(linux, 'Macintosh; Intel Mac OS X 10.15')).toBe(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:153.0) Gecko/20100101 Firefox/153.0',
    );
  });

  it('refuses a string it does not recognise rather than guessing', () => {
    expect(() => retargetPlatform('curl/8.4.0', 'Windows NT 10.0; Win64; x64')).toThrow(/Unrecognised/);
  });

  it('reads the version each browser reports', () => {
    const { agents } = fixture;
    expect(extractVersion('chrome', agents.chrome)).toMatch(/^\d+\./);
    expect(extractVersion('firefox', agents.firefox)).toMatch(/^\d+\./);
    expect(extractVersion('edge', agents.edge)).toMatch(/^\d+\./);
    expect(() => extractVersion('chrome', 'Mozilla/5.0 (X11; Linux x86_64)')).toThrow(/Could not read/);
  });

  it('covers Windows, macOS and Linux from upstream Linux-only data', () => {
    const { profiles } = buildProfiles(fixture.agents, fixture.headers);
    expect(profiles.map((p) => p.id)).toEqual([
      'chrome-windows',
      'chrome-macos',
      'chrome-linux',
      'edge-windows',
      'firefox-windows',
      'firefox-macos',
      'firefox-linux',
    ]);
    expect(new Set(profiles.map((p) => p.userAgent)).size).toBe(profiles.length);
  });

  it('gives every Chromium profile client hints that agree with its own User-Agent', () => {
    const { profiles } = buildProfiles(fixture.agents, fixture.headers);
    for (const profile of profiles.filter((p) => p.engine === 'chromium')) {
      const version = profile.version.split('.')[0];
      expect(profile.secChUa, profile.id).toContain(`v="${version}"`);
      expect(profile.secChUaMobile).toBe('?0');
      expect(profile.secChUaPlatform).toMatch(/^"(Windows|macOS|Linux)"$/);
    }
  });

  it('gives Gecko profiles no client hints at all, because Firefox sends none', () => {
    const { profiles } = buildProfiles(fixture.agents, fixture.headers);
    for (const profile of profiles.filter((p) => p.engine === 'gecko')) {
      expect(profile.secChUa, profile.id).toBeNull();
      expect(profile.secChUaPlatform).toBeNull();
    }
  });

  it('says which browser is missing instead of writing a broken pool', () => {
    const { chrome, ...withoutChrome } = fixture.agents;
    expect(chrome).toBeTypeOf('string');
    expect(() => buildProfiles(withoutChrome, fixture.headers)).toThrow(/no "chrome" entry/);
  });
});

describe('sync-user-agents: generation and --check', () => {
  it('writes a module carrying the profiles, the versions and the provenance', async () => {
    const out = path.join(tmpDir, 'generated.js');
    await sync({ fixtures: FIXTURES, out, now: FROZEN_NOW });
    const mod = await import(pathToFileURL(out).href);

    expect(mod.PROFILES.length).toBe(7);
    expect(mod.DEFAULT_PROFILE_ID).toBe(GENERATOR_DEFAULT_PROFILE_ID);
    expect(mod.USER_AGENT_STRINGS.length).toBe(mod.PROFILES.length);
    expect(mod.VERSIONS.chrome).toMatch(/^\d+\./);
    expect(mod.UPSTREAM.repo).toBe('fa0311/latest-user-agent');
    expect(mod.UPSTREAM.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(mod.UPSTREAM.fetchedAt).toBe(FROZEN_NOW);

    const text = await fs.readFile(out, 'utf8');
    expect(text).toContain('fa0311/latest-user-agent');
    expect(text).toContain('MIT');
    expect(text).toContain('GENERATED FILE');
  });

  it('is deterministic', async () => {
    const a = path.join(tmpDir, 'det-a.js');
    const b = path.join(tmpDir, 'det-b.js');
    await sync({ fixtures: FIXTURES, out: a, now: FROZEN_NOW });
    await sync({ fixtures: FIXTURES, out: b, now: FROZEN_NOW });
    expect(await fs.readFile(b, 'utf8')).toBe(await fs.readFile(a, 'utf8'));
  });

  it('passes --check when the committed pool matches, clock movement included', async () => {
    const out = path.join(tmpDir, 'check-clean.js');
    await sync({ fixtures: FIXTURES, out, now: FROZEN_NOW });
    const report = await sync({ fixtures: FIXTURES, out, check: true, now: '2026-11-05T09:00:00.000Z' });
    expect(report.upToDate).toBe(true);
    expect(report.written).toBe(false);
  });

  it('fails --check when a browser shipped a new version, and leaves the file alone', async () => {
    const out = path.join(tmpDir, 'check-stale.js');
    await sync({ fixtures: FIXTURES, out, now: FROZEN_NOW });
    const before = await fs.readFile(out, 'utf8');

    const bumped = path.join(tmpDir, 'bumped-fixtures');
    await fs.mkdir(bumped, { recursive: true });
    await fs.copyFile(path.join(FIXTURES, 'header.json'), path.join(bumped, 'header.json'));
    await fs.copyFile(path.join(FIXTURES, 'meta.json'), path.join(bumped, 'meta.json'));
    const agents = JSON.parse(await fs.readFile(path.join(FIXTURES, 'output.json'), 'utf8'));
    const current = extractVersion('chrome', agents.chrome);
    const next = `${Number(current.split('.')[0]) + 1}.0.0.0`;
    agents.chrome = agents.chrome.replace(`Chrome/${current}`, `Chrome/${next}`);
    await fs.writeFile(path.join(bumped, 'output.json'), JSON.stringify(agents, null, 2));

    const report = await sync({ fixtures: bumped, out, check: true, now: FROZEN_NOW });
    expect(report.upToDate).toBe(false);
    expect(report.versionDiff).toContainEqual({ browser: 'chrome', from: current, to: next });
    expect(await fs.readFile(out, 'utf8')).toBe(before);
  });
});

describe('userAgent.js: one identity per session', () => {
  beforeEach(() => resetUserAgentSession());
  afterEach(() => {
    delete process.env.XACTIONS_ROTATE_USER_AGENT;
    resetUserAgentSession();
  });

  it('returns the same User-Agent every time it is asked', () => {
    const first = sessionUserAgent();
    for (let i = 0; i < 50; i++) expect(sessionUserAgent()).toBe(first);
  });

  it('holds the same profile object, not just the same string', () => {
    expect(sessionProfile()).toBe(sessionProfile());
    expect(sessionProfile().userAgent).toBe(sessionUserAgent());
  });

  it('no longer rotates on every call, which is what randomUserAgent used to do', () => {
    const first = randomUserAgent();
    for (let i = 0; i < 50; i++) expect(randomUserAgent()).toBe(first);
  });

  it('picks a new profile after an explicit reset', () => {
    const picks = new Set();
    for (let i = 0; i < 200; i++) {
      resetUserAgentSession();
      picks.add(sessionUserAgent());
    }
    expect(picks.size).toBeGreaterThan(1);
  });

  it('rotates when a caller asks for it on the call', () => {
    const picks = new Set();
    for (let i = 0; i < 200; i++) picks.add(randomUserAgent({ rotate: true }));
    expect(picks.size).toBeGreaterThan(1);
    expect(sessionUserAgent()).toBe(sessionUserAgent());
  });

  it('rotates for the whole process when configured to', () => {
    configureUserAgent({ rotate: true });
    expect(isRotationEnabled()).toBe(true);
    const picks = new Set();
    for (let i = 0; i < 200; i++) picks.add(randomUserAgent());
    expect(picks.size).toBeGreaterThan(1);
  });

  it('rotates when the environment asks, and not otherwise', () => {
    expect(isRotationEnabled()).toBe(false);
    process.env.XACTIONS_ROTATE_USER_AGENT = '1';
    expect(isRotationEnabled()).toBe(true);
    configureUserAgent({ rotate: false });
    expect(isRotationEnabled()).toBe(false);
  });

  it('pins a named profile for the session', () => {
    configureUserAgent({ profileId: 'firefox-macos' });
    expect(sessionProfile().id).toBe('firefox-macos');
    expect(sessionUserAgent()).toContain('Firefox/');
    expect(sessionUserAgent()).toContain('Mac OS X');
  });

  it('names the profiles on offer when asked for one that does not exist', () => {
    expect(() => profileById('netscape-navigator')).toThrow(/Unknown user-agent profile/);
    expect(() => configureUserAgent({ profileId: 'netscape-navigator' })).toThrow(/chrome-windows/);
  });

  it('rotateUserAgent always leaves the session profile untouched', () => {
    const held = sessionUserAgent();
    for (let i = 0; i < 20; i++) rotateUserAgent();
    expect(sessionUserAgent()).toBe(held);
    expect(USER_AGENTS).toContain(rotateProfile().userAgent);
  });
});

describe('userAgent.js: the exports other modules depend on', () => {
  beforeEach(() => resetUserAgentSession());

  it('keeps USER_AGENTS a non-empty list of browser strings', () => {
    expect(Array.isArray(USER_AGENTS) || Object.isFrozen(USER_AGENTS)).toBe(true);
    expect(USER_AGENTS.length).toBeGreaterThan(1);
    for (const ua of USER_AGENTS) expect(ua).toMatch(/^Mozilla\/5\.0 \(/);
  });

  it('keeps DEFAULT_USER_AGENT a member of the pool', () => {
    expect(USER_AGENTS).toContain(DEFAULT_USER_AGENT);
    expect(DEFAULT_USER_AGENT).toBe(profileById('chrome-windows').userAgent);
  });

  it('keeps randomUserAgent answering with something from the pool', () => {
    expect(USER_AGENTS).toContain(randomUserAgent());
    expect(USER_AGENTS).toContain(randomUserAgent({ rotate: true }));
  });

  it('ships versions current enough not to be a signal in themselves', () => {
    expect(Number(BROWSER_VERSIONS.chrome.split('.')[0])).toBeGreaterThanOrEqual(140);
    expect(Number(BROWSER_VERSIONS.firefox.split('.')[0])).toBeGreaterThanOrEqual(140);
    expect(USER_AGENT_PROFILES.length).toBe(USER_AGENTS.length);
  });

  it('publishes where the pool came from', () => {
    expect(USER_AGENT_SOURCE.repo).toBe('fa0311/latest-user-agent');
    expect(USER_AGENT_SOURCE.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(Number.isNaN(Date.parse(USER_AGENT_SOURCE.fetchedAt))).toBe(false);
  });

  it('hands out headers that agree with the User-Agent they accompany', () => {
    const chrome = profileById('chrome-macos');
    expect(clientHintHeaders(chrome)['sec-ch-ua-platform']).toBe('"macOS"');
    expect(clientHintHeaders(profileById('firefox-linux'))).toEqual({});

    const headers = profileHeaders(chrome);
    expect(headers['user-agent']).toBe(chrome.userAgent);
    expect(headers['accept-language']).toBe(chrome.acceptLanguage);
    expect(headers['sec-ch-ua']).toBe(chrome.secChUa);
  });

  it('defaults header building to the session profile', () => {
    configureUserAgent({ profileId: 'edge-windows' });
    expect(profileHeaders()['user-agent']).toBe(profileById('edge-windows').userAgent);
    resetUserAgentSession();
  });
});

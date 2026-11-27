// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The checks `xactions doctor` gained for the bug report: Node against
 * `engines`, the native SQLite module, a writable XACTIONS_HOME, clock skew,
 * a stale install shadowing a newer one, and how XActions was installed.
 * Pure describers over plain inputs, plus the real filesystem in a temp dir.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  compareVersions,
  satisfiesRange,
  describeNode,
  describeClockSkew,
  detectInstall,
  describeShadowing,
  findInstallsOnPath,
  checkHome,
  checkSqlite,
  optionalDepsInventory,
} from '../../src/cli/doctor/checks.js';

describe('compareVersions', () => {
  it('orders by major, minor and patch, ignoring a leading v', () => {
    expect(compareVersions('22.19.0', '22.9.5')).toBeGreaterThan(0);
    expect(compareVersions('v5.0.0', '5.0.0')).toBe(0);
    expect(compareVersions('4.9.9', '5.0.0')).toBeLessThan(0);
    expect(compareVersions('5.0.0-beta.1', '5.0.0')).toBeLessThan(0);
  });
});

describe('satisfiesRange', () => {
  it('handles the comparators package.json engines use', () => {
    expect(satisfiesRange('22.19.0', '>=22.19')).toBe(true);
    expect(satisfiesRange('22.18.1', '>=22.19')).toBe(false);
    expect(satisfiesRange('24.1.0', '^22.19 || >=24')).toBe(true);
    expect(satisfiesRange('23.0.0', '^22.19 || >=24')).toBe(false);
    expect(satisfiesRange('22.20.0', '>=22.19 <23')).toBe(true);
    expect(satisfiesRange('20.1.0', '~20.1')).toBe(true);
    expect(satisfiesRange('20.2.0', '~20.1')).toBe(false);
  });

  it('returns null for a range it cannot read', () => {
    expect(satisfiesRange('22.0.0', 'lts/*')).toBeNull();
  });
});

describe('describeNode', () => {
  it('passes a runtime inside engines', () => {
    expect(describeNode('22.19.0', '>=22.19')).toMatchObject({ status: 'ok', detail: 'Node 22.19.0 satisfies >=22.19' });
  });

  it('fails an older runtime with the version to install', () => {
    const result = describeNode('20.11.1', '>=22.19');
    expect(result.status).toBe('fail');
    expect(result.detail).toContain('>=22.19');
    expect(result.fix).toContain('22.19');
  });

  it('warns rather than guessing when engines cannot be read', () => {
    expect(describeNode('22.0.0', 'lts/*').status).toBe('warn');
  });
});

describe('describeClockSkew', () => {
  const now = Date.parse('2026-11-26T12:00:00Z');

  it('passes a clock within 30 seconds of x.com', () => {
    expect(describeClockSkew({ serverDate: 'Thu, 26 Nov 2026 12:00:10 GMT', localMs: now, rttMs: 200 }).status).toBe('ok');
  });

  it('warns past 30 seconds and fails past five minutes, with the time-sync fix', () => {
    const warn = describeClockSkew({ serverDate: 'Thu, 26 Nov 2026 11:59:00 GMT', localMs: now, rttMs: 0 });
    expect(warn.status).toBe('warn');
    expect(warn.detail).toMatch(/60s ahead/);
    const fail = describeClockSkew({ serverDate: 'Thu, 26 Nov 2026 12:10:00 GMT', localMs: now, rttMs: 0 });
    expect(fail.status).toBe('fail');
    expect(fail.detail).toMatch(/600s behind/);
    expect(fail.fix).toMatch(/time sync|automatically/i);
  });

  it('warns when x.com sent no usable date', () => {
    expect(describeClockSkew({ serverDate: null, localMs: now, rttMs: 0 }).status).toBe('warn');
  });
});

describe('detectInstall', () => {
  const base = { execPath: '/usr/local/bin/node', platform: 'linux', env: {}, inContainer: false, hasGit: false };

  it('recognises npx by its cache directory', () => {
    expect(detectInstall({ ...base, packageRoot: '/home/a/.npm/_npx/9f1c/node_modules/xactions' }).method).toBe('npx');
  });

  it('recognises a global install under the Node prefix', () => {
    expect(detectInstall({ ...base, packageRoot: '/usr/local/lib/node_modules/xactions' }).method).toBe('global');
    expect(
      detectInstall({ ...base, packageRoot: '/home/a/.nvm/versions/node/v22.19.0/lib/node_modules/xactions', execPath: '/home/a/.nvm/versions/node/v22.19.0/bin/node' }).method,
    ).toBe('global');
    expect(
      detectInstall({ ...base, platform: 'win32', execPath: 'C:\\Program Files\\nodejs\\node.exe', env: { APPDATA: 'C:\\Users\\a\\AppData\\Roaming' }, packageRoot: 'C:\\Users\\a\\AppData\\Roaming\\npm\\node_modules\\xactions' }).method,
    ).toBe('global');
  });

  it('recognises a local clone and a project dependency', () => {
    expect(detectInstall({ ...base, packageRoot: '/home/a/src/XActions', hasGit: true }).method).toBe('local-clone');
    expect(detectInstall({ ...base, packageRoot: '/home/a/app/node_modules/xactions' }).method).toBe('dependency');
    expect(detectInstall({ ...base, packageRoot: '/opt/xactions' }).method).toBe('source');
  });

  it('says Docker on top of whichever method ran inside the container', () => {
    const result = detectInstall({ ...base, inContainer: true, packageRoot: '/usr/local/lib/node_modules/xactions' });
    expect(result).toMatchObject({ method: 'global', container: true, label: 'Docker (global npm)' });
  });
});

describe('describeShadowing', () => {
  const running = { version: '5.0.0', root: '/usr/lib/node_modules/xactions' };

  it('passes when the xactions on PATH is this install', () => {
    expect(describeShadowing({ running, installs: [{ bin: '/usr/bin/xactions', root: running.root, version: '5.0.0' }] }).status).toBe('ok');
  });

  it('passes, with a note, when nothing is on PATH', () => {
    const result = describeShadowing({ running, installs: [] });
    expect(result.status).toBe('ok');
    expect(result.detail).toMatch(/not on PATH/);
  });

  it('warns when an older install comes first on PATH and a newer one later', () => {
    const result = describeShadowing({
      running,
      installs: [
        { bin: '/usr/local/bin/xactions', root: '/usr/local/lib/node_modules/xactions', version: '4.2.0' },
        { bin: '/usr/bin/xactions', root: running.root, version: '5.0.0' },
      ],
    });
    expect(result.status).toBe('warn');
    expect(result.detail).toContain('4.2.0');
    expect(result.detail).toContain('5.0.0');
    expect(result.fix).toMatch(/npm uninstall -g xactions|PATH/);
  });

  it('warns when this run is newer than the xactions on PATH', () => {
    const result = describeShadowing({
      running: { version: '5.0.0', root: '/home/a/.npm/_npx/1/node_modules/xactions' },
      installs: [{ bin: '/usr/local/bin/xactions', root: '/usr/local/lib/node_modules/xactions', version: '4.0.0' }],
    });
    expect(result.status).toBe('warn');
    expect(result.fix).toContain('npm install -g xactions@latest');
  });

  it('warns when this run is older than the xactions on PATH', () => {
    const result = describeShadowing({
      running: { version: '4.0.0', root: '/home/a/.npm/_npx/1/node_modules/xactions' },
      installs: [{ bin: '/usr/local/bin/xactions', root: '/usr/local/lib/node_modules/xactions', version: '5.0.0' }],
    });
    expect(result.status).toBe('warn');
    expect(result.fix).toContain('npx xactions@latest');
  });
});

describe('filesystem checks', () => {
  let dir;

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xactions-checks-'));
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('finds each xactions on PATH, in PATH order, with its version', async () => {
    const make = async (name, version) => {
      const root = path.join(dir, name, 'lib', 'node_modules', 'xactions');
      await fs.mkdir(path.join(root, 'src', 'cli'), { recursive: true });
      await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'xactions', version }));
      await fs.writeFile(path.join(root, 'src', 'cli', 'index.js'), '');
      const bin = path.join(dir, name, 'bin');
      await fs.mkdir(bin, { recursive: true });
      await fs.symlink(path.join(root, 'src', 'cli', 'index.js'), path.join(bin, 'xactions'));
      return { bin, root };
    };
    const old = await make('old', '4.2.0');
    const fresh = await make('fresh', '5.0.0');
    const empty = path.join(dir, 'empty');
    await fs.mkdir(empty);
    const installs = await findInstallsOnPath({
      pathEnv: [old.bin, empty, fresh.bin, old.bin].join(path.delimiter),
      platform: process.platform === 'win32' ? 'linux' : process.platform,
    });
    expect(installs.map((i) => i.version)).toEqual(['4.2.0', '5.0.0']);
    expect(installs[0].root).toBe(await fs.realpath(old.root));
  });

  it('passes a writable home and one that does not exist yet', async () => {
    expect((await checkHome(dir)).status).toBe('ok');
    const later = await checkHome(path.join(dir, 'not-yet', 'home'));
    expect(later.status).toBe('ok');
    expect(later.detail).toMatch(/created/);
  });

  it('fails a home that is a file, or sits under one', async () => {
    const file = path.join(dir, 'a-file');
    await fs.writeFile(file, '');
    expect((await checkHome(file)).status).toBe('fail');
    const under = await checkHome(path.join(file, 'home'));
    expect(under.status).toBe('fail');
    expect(under.fix).toContain('XACTIONS_HOME');
  });

  it('loads the native SQLite module this install ships', async () => {
    const result = await checkSqlite();
    expect(result.status).toBe('ok');
    expect(result.detail).toMatch(/SQLite \d+\.\d+/);
  });

  it('lists every optional package optionalDeps.js knows, present or not', () => {
    const inventory = optionalDepsInventory();
    const names = inventory.map((d) => d.name);
    for (const name of ['puppeteer', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth', 'bull', 'nodemailer', 'exceljs', 'ioredis']) {
      expect(names).toContain(name);
    }
    for (const dep of inventory) {
      expect(typeof dep.present).toBe('boolean');
      if (dep.present) expect(dep.version).toMatch(/^\d+\.\d+/);
      else expect(dep.version).toBeNull();
    }
  });
});

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: library modules that double as scripts only act as scripts when they
 * are the process entry point.
 *
 * A module that exits, prompts or installs a process.exit signal handler when
 * merely imported ends the host process of whoever imported it: an MCP client,
 * the API server, a user's script. These run each import in a child process so
 * the host's signal handlers and argv are the module's to see, not Vitest's.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isEntryPoint } from '../../src/utils/entryPoint.js';

const root = new URL('../..', import.meta.url).pathname;
const moduleUrl = (rel) => pathToFileURL(join(root, rel)).href;

let dir;
beforeAll(() => { dir = mkdtempSync(join(tmpdir(), 'xactions-entry-')); });
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/** Run a script file in a fresh node; returns { status, stdout, stderr }. */
function runScript(name, body, args = []) {
  const file = join(dir, name);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
  return spawnSync(process.execPath, [file, ...args], { encoding: 'utf8', timeout: 60000, cwd: dir });
}

describe('isEntryPoint', () => {
  const self = moduleUrl('src/utils/entryPoint.js');

  it('matches the module node was started with', () => {
    expect(isEntryPoint(self, join(root, 'src/utils/entryPoint.js'))).toBe(true);
  });

  it('matches without the .js extension, as `node src/a2a/index` is run', () => {
    expect(isEntryPoint(self, join(root, 'src/utils/entryPoint'))).toBe(true);
  });

  it('matches through a symlink, as npm installs a bin', () => {
    const link = join(dir, 'bin-link');
    symlinkSync(join(root, 'src/utils/entryPoint.js'), link);
    expect(isEntryPoint(self, link)).toBe(true);
  });

  it('does not match an unrelated script that shares the file name', () => {
    const other = join(dir, 'entryPoint.js');
    writeFileSync(other, '');
    expect(isEntryPoint(self, other)).toBe(false);
  });

  it('is false with no script path (a REPL, `node -e`)', () => {
    expect(isEntryPoint(self, undefined)).toBe(false);
  });
});

describe('importing does not act as a script', () => {
  it('src/mcp/server.js installs no SIGINT/SIGTERM handler on import', () => {
    const r = runScript('import-mcp.mjs', `
      await import(${JSON.stringify(moduleUrl('src/mcp/server.js'))});
      console.log(JSON.stringify([process.listenerCount('SIGINT'), process.listenerCount('SIGTERM')]));
      process.exit(0);
    `);
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout.trim().split('\n').pop())).toEqual([0, 0]);
  });

  it('no published entry point installs a SIGINT/SIGTERM/exit handler on import', () => {
    // A signal listener replaces Node's default "exit on Ctrl+C / SIGTERM", so
    // one installed at import time keeps the host running after it is told to
    // stop: an API server under `docker stop`, a user's script under Ctrl+C.
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const entries = Object.entries(pkg.exports)
      .filter(([key, target]) => !key.includes('*') && typeof target === 'string' && target.endsWith('.js'))
      .map(([key, target]) => [key, moduleUrl(target)]);
    expect(entries.length).toBeGreaterThan(5);
    const r = runScript('import-entries.mjs', `
      const counts = {};
      for (const [key, url] of ${JSON.stringify(entries)}) {
        const before = ['SIGINT', 'SIGTERM', 'exit'].map((s) => process.listenerCount(s));
        await import(url);
        const added = ['SIGINT', 'SIGTERM', 'exit'].map((s, i) => process.listenerCount(s) - before[i]);
        if (added.some((n) => n !== 0)) counts[key] = added;
      }
      console.log(JSON.stringify(counts));
      process.exit(0);
    `);
    expect(r.status, r.stderr).toBe(0);
    expect(JSON.parse(r.stdout.trim().split('\n').pop())).toEqual({});
  });

  it('src/agents/setup.js does not start the wizard for a host script named setup.js', () => {
    const r = runScript('setup.js', `
      await import(${JSON.stringify(moduleUrl('src/agents/setup.js'))});
      console.log('host still running');
      process.exit(0);
    `);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('host still running');
    expect(r.stdout).not.toMatch(/Setup Wizard|Step 1/i);
  });

  it('src/a2a/server.js does not start a server for a host script under an a2a/server path', () => {
    const r = runScript('a2a/server-host.mjs', `
      await import(${JSON.stringify(moduleUrl('src/a2a/server.js'))});
      console.log('host still running');
      process.exit(0);
    `);
    // Run from a path containing "a2a/server": the old guard was a substring test.
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('host still running');
  });
});

describe('the xactions-agent bin runs when invoked through its npm symlink', () => {
  it('reports a missing config and exits 1, instead of exiting 0 silently', () => {
    const link = join(dir, 'xactions-agent');
    symlinkSync(join(root, 'src/agents/thoughtLeaderAgent.js'), link);
    const missing = join(dir, 'no-such-config.json');
    const r = spawnSync(process.execPath, [link, '--config', missing], { encoding: 'utf8', timeout: 60000 });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain(`Config file not found: ${missing}`);
  });
});

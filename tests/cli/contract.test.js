// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The CLI's exit-code and output contract, exercised offline against the real
 * binary: a failure exits non-zero, a bad numeric flag is refused before any
 * work, XACTIONS_HOME moves the session, and importing the module does not
 * run it.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('../../src/cli/index.js', import.meta.url));

let home;

/** Run the real binary with HOME and XACTIONS_HOME in a temp directory. */
function run(args, env = {}) {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    env: { ...process.env, HOME: home, XACTIONS_HOME: path.join(home, 'xh'), FORCE_COLOR: '0', ...env },
    encoding: 'utf-8',
    timeout: 30_000,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-cli-contract-'));
});

afterEach(() => {
  fs.rmSync(home, { recursive: true, force: true });
});

describe('numeric options', () => {
  it('refuses a non-numeric --limit before doing any work', () => {
    const { status, stderr } = run(['tweets', 'nasa', '--limit', 'abc']);
    expect(status).toBe(1);
    expect(stderr).toMatch(/--limit <number>' expects a non-negative number, got "abc"/);
  });

  it('refuses a non-numeric monitor --interval instead of polling every millisecond', () => {
    const { status, stderr } = run(['monitor', 'nasa', '--interval', 'abc']);
    expect(status).toBe(1);
    expect(stderr).toContain('--interval <seconds>');
  });
});

describe('failures exit non-zero', () => {
  it('rejects an unknown search --filter instead of silently searching Latest', () => {
    const { status, stderr } = run(['search', 'x402', '--filter', 'bogus']);
    expect(status).toBe(1);
    expect(stderr).toContain('latest, top, people, photos, videos');
  });

  it('report explains that monitors live only in the monitor process', () => {
    const { status, stderr } = run(['report', 'nasa']);
    expect(status).toBe(1);
    expect(stderr).toContain('in memory only');
  });

  it('migrate exits 1 for an unknown platform and for a missing export', () => {
    expect(run(['migrate', 'nasa', '--to', 'myspace']).status).toBe(1);
    expect(run(['migrate', 'nasa', '--to', 'bluesky']).status).toBe(1);
  });

  it('graph analyze exits 1 for a graph that does not exist', () => {
    expect(run(['graph', 'analyze', 'no-such-graph']).status).toBe(1);
  });

  it('a command whose catch prints an error exits 1 (convert of a missing file)', () => {
    const { status, stderr } = run(['convert', path.join(home, 'missing.json')]);
    expect(status).toBe(1);
    expect(stderr).toContain('ENOENT');
  });

  it('ai analyze points at `xactions login`, not a command that does not exist', () => {
    const { status, stderr } = run(['ai', 'analyze', 'nasa'], { TWITTER_AUTH_TOKEN: '' });
    expect(status).toBe(1);
    expect(stderr).toContain('xactions login');
    expect(stderr).not.toContain('config --token');
  });
});

describe('-o into a directory that does not exist', () => {
  it('creates the parent before the command runs', () => {
    const out = path.join(home, 'new', 'nested', 'sentiment.json');
    const { status } = run(['sentiment', 'what a great launch', '-o', out]);
    expect(status).toBe(0);
    expect(JSON.parse(fs.readFileSync(out, 'utf-8'))).toHaveProperty('label');
  });
});

describe('XACTIONS_HOME', () => {
  it('moves the CLI config, not just the MCP server session', () => {
    const { status } = run(['logout']);
    expect(status).toBe(0);
    expect(fs.existsSync(path.join(home, 'xh', 'config.json'))).toBe(true);
    expect(fs.existsSync(path.join(home, '.xactions'))).toBe(false);
  });
});

describe('importing xactions/cli', () => {
  it('does not parse argv or exit the host, and exports the program', () => {
    const script = `import(${JSON.stringify(CLI)}).then((m) => { console.log('alive', typeof m.program.parse, m.program.commands.length > 40); });`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, 'tweets', '--limit', 'abc'], {
      env: { ...process.env, HOME: home, XACTIONS_HOME: path.join(home, 'xh') },
      encoding: 'utf-8',
      timeout: 30_000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe('alive function true');
  });

  it('still runs through a symlinked bin, the way npm installs it', () => {
    const link = path.join(home, 'xactions');
    fs.symlinkSync(CLI, link);
    const result = spawnSync(process.execPath, [link, '--version'], { encoding: 'utf-8', timeout: 30_000 });
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });
});

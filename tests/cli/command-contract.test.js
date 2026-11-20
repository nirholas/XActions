// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Every registered CLI command, as a contract.
 *
 * The command tree is walked from the exported commander program, so a
 * command added tomorrow is covered without editing this file:
 *
 * - every command and option is described, and every leaf has an action;
 * - `<command> --help` exits 0 and documents each of the command's options;
 * - a missing required argument, an unknown option and an unknown command
 *   exit 1 before any action runs;
 * - every option whose placeholder promises a number refuses a non-number
 *   (and a negative, unless its default is negative) before any work.
 *
 * The tree is driven in-process with commander's exitOverride, so nothing
 * here can reach the network: the parse is refused before an action starts.
 * A handful of the same cases are then run against the real binary to prove
 * the exit codes are what a shell sees.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CommanderError } from 'commander';

const CLI = fileURLToPath(new URL('../../src/cli/index.js', import.meta.url));

// The CLI resolves its config directory at import time, so the sandbox has to
// exist before the dynamic import in beforeAll.
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-cli-commands-'));
process.env.HOME = home;
process.env.XACTIONS_HOME = path.join(home, 'xh');
process.env.FORCE_COLOR = '0';

const NUMERIC_PLACEHOLDER = /<(number|n|ms|seconds|minutes|days)>/;

let program;
let VERSION;
let out = '';
let err = '';

/** Every command under `root`, depth first, with its full path. */
function walk(root, prefix = []) {
  return root.commands.flatMap((cmd) => {
    const p = [...prefix, cmd.name()];
    return [{ path: p, cmd }, ...walk(cmd, p)];
  });
}

/** Placeholder values for a command's required arguments. */
function requiredArgs(cmd) {
  return cmd.registeredArguments.filter((a) => a.required).map((a) => `contract-${a.name()}`);
}

/** Placeholder values for a command's mandatory options (`--to` on migrate). */
function mandatoryFlags(cmd) {
  return cmd.options.filter((o) => o.mandatory).map((o) => `${o.long}=contract`);
}

/**
 * Parse argv against the real program. Resolves with the CommanderError the
 * parse ended in (help, version and every refusal end in one under
 * exitOverride), or null when an action ran to completion.
 */
async function parse(argv) {
  out = '';
  err = '';
  try {
    await program.parseAsync(argv, { from: 'user' });
    return null;
  } catch (error) {
    if (error instanceof CommanderError) return error;
    throw error;
  }
}

let tree;

beforeAll(async () => {
  ({ program } = await import('../../src/cli/index.js'));
  ({ VERSION } = await import('../../src/version.js'));
  tree = walk(program);
  // exitOverride and output capture on every command, not just the root:
  // commander only copies settings into subcommands created after the call.
  for (const cmd of [program, ...tree.map((t) => t.cmd)]) {
    cmd.exitOverride();
    cmd.configureOutput({
      writeOut: (s) => { out += s; },
      writeErr: (s) => { err += s; },
      outputError: (s) => { err += s; },
    });
  }
  // An action reaching process.exit would end the worker; make it loud.
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code}) called from an action during a contract test`);
  });
});

afterEach(() => {
  process.exitCode = undefined;
});

afterAll(() => {
  vi.restoreAllMocks();
  fs.rmSync(home, { recursive: true, force: true });
});

describe('the command tree', () => {
  it('registers the read commands AGENTS.md documents', () => {
    const names = new Set(program.commands.map((c) => c.name()));
    for (const name of ['profile', 'tweets', 'search', 'followers', 'following', 'non-followers', 'thread', 'article', 'analyze', 'media', 'hashtag', 'brief']) {
      expect(names.has(name), name).toBe(true);
    }
    expect(tree.length).toBeGreaterThan(100);
  });

  it('every command has a description', () => {
    expect(tree.filter((t) => !t.cmd.description()?.trim()).map((t) => t.path.join(' '))).toEqual([]);
  });

  it('every option has a description', () => {
    const missing = tree.flatMap((t) => t.cmd.options.filter((o) => !o.description?.trim()).map((o) => `${t.path.join(' ')} ${o.flags}`));
    expect(missing).toEqual([]);
  });

  it('every leaf command has an action', () => {
    const leaves = tree.filter((t) => t.cmd.commands.length === 0);
    expect(leaves.filter((t) => !t.cmd._actionHandler).map((t) => t.path.join(' '))).toEqual([]);
  });

  it('no two siblings share a name or alias', () => {
    const clashes = [];
    for (const parent of [program, ...tree.map((t) => t.cmd)]) {
      const seen = new Set();
      for (const child of parent.commands) {
        for (const n of [child.name(), ...child.aliases()]) {
          if (seen.has(n)) clashes.push(`${parent.name()} ${n}`);
          seen.add(n);
        }
      }
    }
    expect(clashes).toEqual([]);
  });

  it('declares --compact and --fields once, on the root, so every command inherits them', () => {
    expect(program.options.map((o) => o.long)).toEqual(expect.arrayContaining(['--compact', '--fields']));
    const shadowed = tree.filter((t) => t.cmd.options.some((o) => o.long === '--compact' || o.long === '--fields'));
    expect(shadowed.map((t) => t.path.join(' '))).toEqual([]);
  });
});

describe('--help', () => {
  it('the root help and --version exit 0', async () => {
    const help = await parse(['--help']);
    expect(help.exitCode).toBe(0);
    expect(out).toContain('profile');
    const version = await parse(['--version']);
    expect(version.code).toBe('commander.version');
    expect(version.exitCode).toBe(0);
    expect(out.trim()).toBe(VERSION);
  });

  it('every command prints its usage and options and exits 0', async () => {
    const failures = [];
    for (const { path: p, cmd } of tree) {
      const result = await parse([...p, '--help']);
      if (result?.code !== 'commander.helpDisplayed' || result.exitCode !== 0) {
        failures.push(`${p.join(' ')}: ${result?.code} ${result?.exitCode}`);
        continue;
      }
      if (!out.includes(`Usage: xactions ${p.join(' ')}`)) failures.push(`${p.join(' ')}: no usage line`);
      for (const option of cmd.options) {
        if (!out.includes(option.long ?? option.short)) failures.push(`${p.join(' ')}: help omits ${option.flags}`);
      }
      if (err) failures.push(`${p.join(' ')}: wrote to stderr: ${err}`);
    }
    expect(failures).toEqual([]);
  });
});

describe('refusals exit 1 before any action runs', () => {
  it('an unknown command, with a suggestion for a near miss', async () => {
    const result = await parse(['profil', 'nasa']);
    expect(result.code).toBe('commander.unknownCommand');
    expect(result.exitCode).toBe(1);
    expect(err).toMatch(/unknown command 'profil'/);
    expect(err).toMatch(/Did you mean profile\?/);
  });

  it('an unknown subcommand of a command group', async () => {
    const result = await parse(['drafts', 'explode']);
    expect(result.exitCode).toBe(1);
    expect(err).toMatch(/unknown command 'explode'/);
  });

  it('an unknown option on a read command', async () => {
    const result = await parse(['tweets', 'nasa', '--limt', '5']);
    expect(result.code).toBe('commander.unknownOption');
    expect(result.exitCode).toBe(1);
    expect(err).toMatch(/--limt/);
  });

  it('every command with a required argument refuses to run without it', async () => {
    const failures = [];
    const withArgs = tree.filter((t) => t.cmd.commands.length === 0 && t.cmd.registeredArguments.some((a) => a.required));
    expect(withArgs.length).toBeGreaterThan(60);
    for (const { path: p, cmd } of withArgs) {
      const result = await parse([...p, ...mandatoryFlags(cmd)]);
      const first = cmd.registeredArguments.find((a) => a.required).name();
      if (result?.code !== 'commander.missingArgument' || result.exitCode !== 1) failures.push(`${p.join(' ')}: ${result?.code}`);
      else if (!err.includes(`missing required argument '${first}'`)) failures.push(`${p.join(' ')}: message "${err.trim()}"`);
    }
    expect(failures).toEqual([]);
  });

  it('every numeric option refuses a value that is not a number', async () => {
    const failures = [];
    let checked = 0;
    for (const { path: p, cmd } of tree) {
      for (const option of cmd.options.filter((o) => NUMERIC_PLACEHOLDER.test(o.flags))) {
        for (const bad of ['abc', '12abc', '', 'NaN', 'Infinity']) {
          checked++;
          const result = await parse([...p, ...requiredArgs(cmd), ...mandatoryFlags(cmd), `${option.long}=${bad}`]);
          if (result?.exitCode !== 1 || !err.includes(`expects a`) || !err.includes(`got "${bad}"`)) {
            failures.push(`${p.join(' ')} ${option.long}=${bad}: ${result?.code ?? 'ran'} ${err.trim()}`);
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(150);
    expect(failures).toEqual([]);
  });

  it('every numeric option refuses a negative, unless its default is negative', async () => {
    const failures = [];
    for (const { path: p, cmd } of tree) {
      for (const option of cmd.options.filter((o) => NUMERIC_PLACEHOLDER.test(o.flags))) {
        if (Number(option.defaultValue) < 0) continue;
        const result = await parse([...p, ...requiredArgs(cmd), ...mandatoryFlags(cmd), `${option.long}=-3`]);
        if (result?.exitCode !== 1 || !err.includes('expects a non-negative number, got "-3"')) {
          failures.push(`${p.join(' ')} ${option.long}: ${result?.code ?? 'ran'} ${err.trim()}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('a refused parse leaves no state behind for the next one', async () => {
    // commander reuses the program across parses; a refused --limit must not
    // carry into the next parse of the same command.
    await parse(['tweets', 'nasa', '--limit=abc']);
    const result = await parse(['tweets', '--help']);
    expect(result.exitCode).toBe(0);
    const tweets = program.commands.find((c) => c.name() === 'tweets');
    expect(tweets.getOptionValue('limit')).toBe('50');
  });
});

describe('the real binary', () => {
  /** Run the CLI with HOME and XACTIONS_HOME in the sandbox. */
  function run(args) {
    const result = spawnSync(process.execPath, [CLI, ...args], {
      env: { ...process.env, HOME: home, XACTIONS_HOME: path.join(home, 'xh'), FORCE_COLOR: '0' },
      encoding: 'utf-8',
      timeout: 30_000,
    });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  }

  it('exits 0 for --help, and 1 for an unknown command, a missing argument and a negative --limit', () => {
    const help = run(['search', '--help']);
    expect(help.status).toBe(0);
    expect(help.stdout).toContain('--filter');
    expect(help.stderr).toBe('');

    const unknown = run(['frobnicate']);
    expect(unknown.status).toBe(1);
    expect(unknown.stderr).toContain("unknown command 'frobnicate'");
    expect(unknown.stdout).toBe('');

    const missing = run(['profile']);
    expect(missing.status).toBe(1);
    expect(missing.stderr).toContain("missing required argument 'username'");

    const negative = run(['followers', 'nasa', '--limit', '-5']);
    expect(negative.status).toBe(1);
    expect(negative.stderr).toContain('expects a non-negative number, got "-5"');
  });
});

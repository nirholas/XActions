// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The CLI commands that need no network, run in-process: the session
 * commands (`login --cookies-file`, `login --from-browser`, `logout`), the
 * config generator (`mcp-config`), and the informational and local-analysis
 * commands (`info`, `platforms`, `sentiment`).
 *
 * Each case asserts the exit code and where the output went, and for the
 * commands that write, what landed on disk and with which permissions. HOME
 * and XACTIONS_HOME point into a temporary directory, and the global fetch
 * throws, so nothing here touches the real account or the network.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { CommanderError } from 'commander';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-cli-offline-'));
const xhome = path.join(home, 'xh');
process.env.HOME = home;
process.env.XACTIONS_HOME = xhome;
process.env.FORCE_COLOR = '0';

const COOKIE_FILE = path.join(xhome, 'cookies.json');
const CONFIG_FILE = path.join(xhome, 'config.json');

/** A cookie value of the right shape that no account has ever had. */
const AUTH = '0'.repeat(40);
const CT0 = 'f'.repeat(32);

let program;
let VERSION;
let stdout = '';
let stderr = '';

async function cli(argv) {
  stdout = '';
  stderr = '';
  process.exitCode = undefined;
  let code;
  try {
    await program.parseAsync(argv, { from: 'user' });
    code = process.exitCode ?? 0;
  } catch (error) {
    if (!(error instanceof CommanderError)) throw error;
    code = error.exitCode;
  }
  process.exitCode = undefined;
  return { code, stdout, stderr };
}

/** Write a file into the sandbox and return its path. */
function sandboxFile(name, text) {
  const file = path.join(home, name);
  fs.writeFileSync(file, text);
  return file;
}

const mode = (file) => fs.statSync(file).mode & 0o777;

beforeAll(async () => {
  vi.stubGlobal('fetch', async (url) => {
    throw new Error(`network access in an offline CLI test: ${url}`);
  });
  ({ program } = await import('../../src/cli/index.js'));
  ({ VERSION } = await import('../../src/version.js'));
  for (const cmd of [program, ...program.commands]) cmd.exitOverride();
  vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new Error(`process.exit(${code}) called during an in-process CLI test`);
  });
});

beforeEach(() => {
  fs.rmSync(xhome, { recursive: true, force: true });
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => { stdout += String(chunk); return true; });
  // ora writes its succeed/fail lines straight to stderr.
  vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => { stderr += String(chunk); return true; });
  vi.spyOn(console, 'log').mockImplementation((...args) => { stdout += `${args.join(' ')}\n`; });
  vi.spyOn(console, 'error').mockImplementation((...args) => { stderr += `${args.join(' ')}\n`; });
});

afterEach(() => {
  for (const fn of [process.stdout.write, process.stderr.write, console.log, console.error]) vi.mocked(fn).mockRestore();
  process.exitCode = undefined;
});

afterAll(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  fs.rmSync(home, { recursive: true, force: true });
});

describe('login --cookies-file', () => {
  it('imports a Netscape cookies.txt, keeping only x.com cookies, owner-only', async () => {
    const file = sandboxFile('cookies.txt', [
      '# Netscape HTTP Cookie File',
      `.x.com\tTRUE\t/\tTRUE\t0\tauth_token\t${AUTH}`,
      `.x.com\tTRUE\t/\tTRUE\t0\tct0\t${CT0}`,
      '.example.com\tTRUE\t/\tFALSE\t0\tsession\tnot-for-x',
    ].join('\n'));
    const result = await cli(['login', '--cookies-file', file]);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stderr).toMatch(/Imported 2 x\.com cookies/);
    expect(result.stdout).toMatch(/auth_token \+ ct0 captured/);

    const jar = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
    expect(jar.map((c) => c.name).sort()).toEqual(['auth_token', 'ct0']);
    expect(mode(COOKIE_FILE)).toBe(0o600);
    expect(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))).toEqual({ authToken: AUTH, csrfToken: CT0 });
    expect(mode(CONFIG_FILE)).toBe(0o600);
    expect(mode(xhome)).toBe(0o700);
  });

  it('imports a raw header string and warns that ct0 is missing', async () => {
    const file = sandboxFile('header.txt', `auth_token=${AUTH}`);
    const result = await cli(['login', '--cookies-file', file]);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/No ct0 found/);
    expect(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))).toEqual({ authToken: AUTH });
  });

  it('a re-import without ct0 drops the stale ct0 from config', async () => {
    await cli(['login', '--cookies-file', sandboxFile('both.txt', `auth_token=${AUTH}; ct0=${CT0}`)]);
    await cli(['login', '--cookies-file', sandboxFile('auth.txt', `auth_token=${AUTH}`)]);
    expect(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))).toEqual({ authToken: AUTH });
  });

  it('imports a Playwright storageState', async () => {
    const file = sandboxFile('state.json', JSON.stringify({
      cookies: [
        { name: 'auth_token', value: AUTH, domain: '.x.com', path: '/', secure: true, httpOnly: true, expires: -1 },
        { name: 'ct0', value: CT0, domain: '.x.com', path: '/', secure: true, httpOnly: false, expires: -1 },
      ],
      origins: [],
    }));
    const result = await cli(['login', '--cookies-file', file]);
    expect(result.code).toBe(0);
    expect(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))).toEqual({ authToken: AUTH, csrfToken: CT0 });
  });

  describe('with - for stdin', () => {
    const realStdin = Object.getOwnPropertyDescriptor(process, 'stdin');
    const pipeIn = (text, isTTY = false) => {
      const stream = Readable.from([Buffer.from(text)]);
      stream.isTTY = isTTY;
      Object.defineProperty(process, 'stdin', { value: stream, configurable: true });
    };
    afterEach(() => Object.defineProperty(process, 'stdin', realStdin));

    // `docker run -i ... login --cookies-file - < cookies.txt` imports a file
    // the container user could not read through a bind mount.
    it('reads the cookies from stdin and saves them the same as a file', async () => {
      pipeIn([
        `.x.com\tTRUE\t/\tTRUE\t0\tauth_token\t${AUTH}`,
        `.x.com\tTRUE\t/\tTRUE\t0\tct0\t${CT0}`,
      ].join('\n'));
      const result = await cli(['login', '--cookies-file', '-']);
      expect(result.code, result.stderr).toBe(0);
      expect(result.stderr).toMatch(/Imported 2 x\.com cookies from stdin/);
      const jar = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf-8'));
      expect(jar.find((c) => c.name === 'auth_token').value).toBe(AUTH);
      expect(mode(COOKIE_FILE)).toBe(0o600);
    });

    it('exits 1 instead of waiting when stdin is a terminal', async () => {
      pipeIn('', true);
      const result = await cli(['login', '--cookies-file', '-']);
      expect(result.code).toBe(1);
      expect(result.stderr).toMatch(/stdin is a terminal/);
      expect(fs.existsSync(COOKIE_FILE)).toBe(false);
    });
  });

  it('exits 1 for a file that does not exist, and saves nothing', async () => {
    const result = await cli(['login', '--cookies-file', path.join(home, 'missing.txt')]);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/ENOENT/);
    expect(fs.existsSync(COOKIE_FILE)).toBe(false);
  });

  it('exits 1 for a file with no x.com cookies in it', async () => {
    const file = sandboxFile('other.txt', '.example.com\tTRUE\t/\tFALSE\t0\tsession\tabc');
    const result = await cli(['login', '--cookies-file', file]);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/No X\/Twitter cookies found/);
    expect(fs.existsSync(COOKIE_FILE)).toBe(false);
  });

  it('exits 1 for text in no recognised format', async () => {
    const result = await cli(['login', '--cookies-file', sandboxFile('junk.txt', 'just some words')]);
    expect(result.code).toBe(1);
    expect(fs.existsSync(COOKIE_FILE)).toBe(false);
  });
});

describe('login --from-browser', () => {
  it('exits 1 for a browser it cannot read, naming the supported ones', async () => {
    const result = await cli(['login', '--from-browser', 'netscape-navigator']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/Unknown browser "netscape-navigator"/);
    expect(result.stderr).toMatch(/chrome, chromium, brave, edge, arc, firefox/);
  });
});

describe('logout', () => {
  it('removes the cookie jar and both tokens, keeping other config', async () => {
    await cli(['login', '--cookies-file', sandboxFile('both.txt', `auth_token=${AUTH}; ct0=${CT0}`)]);
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...config, theme: 'dark' }));

    const result = await cli(['logout']);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/Logged out/);
    expect(fs.existsSync(COOKIE_FILE)).toBe(false);
    expect(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))).toEqual({ theme: 'dark' });
  });

  it('succeeds when there was no session to remove', async () => {
    const result = await cli(['logout']);
    expect(result.code).toBe(0);
    expect(JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))).toEqual({});
  });
});

describe('mcp-config', () => {
  /** The JSON block mcp-config prints between its headings. */
  function printedConfig(text) {
    return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  }

  it('prints a Claude Desktop config that runs xactions-mcp, and writes nothing', async () => {
    const result = await cli(['mcp-config']);
    expect(result.code).toBe(0);
    const config = printedConfig(result.stdout.split('Tip:')[0]);
    expect(config.mcpServers.xactions).toMatchObject({ command: 'npx', args: ['-y', 'xactions-mcp'] });
    expect(fs.existsSync(path.join(home, '.config', 'Claude'))).toBe(false);
  });

  it('uses VS Code\'s mcp.servers shape for --client vscode', async () => {
    const result = await cli(['mcp-config', '--client', 'vscode']);
    expect(result.code).toBe(0);
    expect(printedConfig(result.stdout.split('Tip:')[0]).mcp.servers.xactions.command).toBe('npx');
  });

  it('--write merges into an existing config without dropping other servers', async () => {
    const target = path.join(home, '.cursor', 'mcp.json');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify({ mcpServers: { other: { command: 'other-server' } } }));

    const result = await cli(['mcp-config', '--client', 'cursor', '--write']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`Config written to ${target}`);
    const written = JSON.parse(fs.readFileSync(target, 'utf-8'));
    expect(Object.keys(written.mcpServers).sort()).toEqual(['other', 'xactions']);
    expect(written.mcpServers.other).toEqual({ command: 'other-server' });
  });

  it('exits 1 for an unknown --client instead of printing another client\'s config', async () => {
    const result = await cli(['mcp-config', '--client', 'emacs', '--write']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/Unknown --client "emacs"\. Use one of: claude, cursor, windsurf, vscode\./);
    expect(result.stdout).toBe('');
  });

  it('--docker runs the CLI image over stdio with the state volume, and keeps the cookie out of argv', async () => {
    const result = await cli(['mcp-config', '--docker']);
    expect(result.code, result.stderr).toBe(0);
    const entry = printedConfig(result.stdout.split('Tip:')[0]).mcpServers.xactions;
    expect(entry.command).toBe('docker');
    expect(entry.args).toEqual([
      'run', '-i', '--rm',
      '-v', 'xactions:/data',
      '-e', 'XACTIONS_SESSION_COOKIE',
      'ghcr.io/nirholas/xactions-cli:latest',
      'mcp',
    ]);
    // `-e NAME` with no value forwards the client's variable, so the cookie
    // never appears in the docker command line that `ps` shows.
    expect(entry.args.join(' ')).not.toContain('your_auth_token_here');
    expect(entry.env).toEqual({ XACTIONS_SESSION_COOKIE: 'your_auth_token_here' });
  });

  it('--docker --image swaps in another image, in the VS Code shape too', async () => {
    const result = await cli(['mcp-config', '--docker', '--image', 'xactions-cli:dev', '--client', 'vscode']);
    expect(result.code, result.stderr).toBe(0);
    const entry = printedConfig(result.stdout.split('Tip:')[0]).mcp.servers.xactions;
    expect(entry.command).toBe('docker');
    expect(entry.args.slice(-2)).toEqual(['xactions-cli:dev', 'mcp']);
  });

  it('--docker --write merges the docker entry into the client config', async () => {
    const target = path.join(home, '.codeium', 'windsurf', 'mcp_config.json');
    const result = await cli(['mcp-config', '--docker', '--client', 'windsurf', '--write']);
    expect(result.code, result.stderr).toBe(0);
    const written = JSON.parse(fs.readFileSync(target, 'utf-8'));
    expect(written.mcpServers.xactions.command).toBe('docker');
  });

  it('exits 1 for --image without --docker instead of ignoring it', async () => {
    const result = await cli(['mcp-config', '--image', 'xactions-cli:dev']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/--image only applies with --docker/);
    expect(result.stdout).toBe('');
  });
});

describe('mcp', () => {
  it('hands its arguments to the MCP server, so `xactions mcp --help` prints the server usage', async () => {
    const result = await cli(['mcp', '--help']);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain('Usage: xactions-mcp [options]');
    expect(result.stdout).toContain('--http');
  });

  it('passes server flags through untouched: `xactions mcp --list-groups` lists the tool groups', async () => {
    const result = await cli(['mcp', '--list-groups']);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/^read \(\d+\)$/m);
    expect(result.stdout).toContain('always available:');
  });
});

describe('info, platforms, sentiment', () => {
  it('info reports the installed version', async () => {
    const result = await cli(['info']);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(`XActions v${VERSION}`);
  });

  it('platforms lists every platform the scraper registry has', async () => {
    const result = await cli(['platforms']);
    expect(result.code).toBe(0);
    for (const name of ['twitter', 'bluesky', 'mastodon', 'threads']) expect(result.stdout).toContain(name);
  });

  it('sentiment labels text locally and writes the result with -o', async () => {
    const out = path.join(home, 'out', 'sentiment.json');
    const result = await cli(['sentiment', 'I love this, what a fantastic launch', '-o', out]);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toMatch(/POSITIVE/);
    expect(JSON.parse(fs.readFileSync(out, 'utf-8'))).toMatchObject({ label: 'positive' });
  });

  it('sentiment labels negative text', async () => {
    const result = await cli(['sentiment', 'this is terrible, broken and awful']);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/NEGATIVE/);
  });
});

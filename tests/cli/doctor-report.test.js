// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * `xactions doctor --report` and `--issue`: the redaction guarantee first,
 * then what the report must still say once everything private is gone.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { renderReport, issueUrl, readSessionSecrets, reportTitle } from '../../src/cli/doctor/report.js';
import { scrub, collectSecrets } from '../../src/cli/doctor/redact.js';

const AUTH_TOKEN = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678';
const CT0 = 'f00dfacecafe0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567';
const BEARER = 'AAAAAAAAAAAAAAAAAAAAAMLheAAAAAAA0%2BuSeid%2BULvsea4JtiGRiSDSJSI%3DEUifiRBkKG5E2XzMDjRfl76ZC9Ub0wnz4XsNiRVBChTYbJcE3F';
const PROXY = 'http://proxyuser:proxypass@10.1.2.3:3128';
const SOCKS = 'socks5://corp-proxy.internal:1080';
const HOME = '/home/alice-secret';
const XHOME = '/srv/vault-7731/.xactions-custom';
const OS_USER = 'alice-secret';
const HOSTNAME = 'alices-laptop';
const HANDLE = 'secret_handle';
const ACCOUNT_ID = '1490123456789012345';
const UNKNOWN_ID = '1888888888888888888';
const LLM_KEY = 'gsk_live_7f3kQ9zLm2Pp8Rr4Tt6Vv0Xx';
const WEBHOOK = 'whsec_super_secret_value_123';
const EMAIL = 'alice@example.com';
const CONFIG_SECRET = 'cfg-only-value-55aa66bb';

/** Every string that must never reach the report or the issue URL. */
const SECRETS = [
  AUTH_TOKEN, CT0, BEARER, PROXY, SOCKS, HOME, XHOME, OS_USER, HOSTNAME, HANDLE, ACCOUNT_ID,
  UNKNOWN_ID, LLM_KEY, WEBHOOK, EMAIL, CONFIG_SECRET,
  'proxyuser', 'proxypass', '10.1.2.3', 'corp-proxy', 'vault-7731', 'alice',
  // Fragments of the bearer token, in case it is split on its percent escapes.
  'AAAAAAAAAAAAAAAAAAAAAMLheAAAAAAA0', 'EUifiRBkKG5E2XzMDjRfl76ZC9Ub0wnz4XsNiRVBChTYbJcE3F',
];

const ENV = {
  HOME,
  USER: OS_USER,
  XACTIONS_HOME: XHOME,
  XACTIONS_SESSION_COOKIE: AUTH_TOKEN,
  XACTIONS_CSRF_TOKEN: CT0,
  X_BEARER_TOKEN: BEARER,
  HTTPS_PROXY: PROXY,
  ALL_PROXY: SOCKS,
  GROQ_API_KEY: LLM_KEY,
  XACTIONS_WEBHOOK_SECRET: WEBHOOK,
  // The official Node image sets this. A version is not a secret, and
  // removing it would erase the Node line the report exists to carry.
  NODE_VERSION: '22.19.0',
  // npm and npx export the package.json of the project they run in. These
  // equal public facts the report prints and must not erase them, while the
  // proxy npm was configured with must still go.
  npm_package_name: 'xactions',
  npm_package_engines_node: '>=22.19',
  npm_config_https_proxy: PROXY,
};

/**
 * A doctor run on a machine full of secrets: every free-text detail carries
 * one, the way real error messages and paths do.
 */
function secretState(sessionValues = [AUTH_TOKEN, CT0]) {
  return {
    version: '5.0.0',
    install: { label: `global npm`, root: `${HOME}/.nvm/versions/node/v22.19.0/lib/node_modules/xactions` },
    node: { version: '22.19.0', engines: '>=22.19' },
    os: { platform: 'linux', release: '6.8.0-45-generic', arch: 'x64' },
    optionalDeps: [
      { name: 'puppeteer', present: true, version: '25.11.0' },
      { name: 'puppeteer-extra', present: true, version: '3.3.6' },
      { name: 'bull', present: false, version: null },
      { name: '@atproto/api', present: true, version: '0.32.0' },
    ],
    env: ENV,
    homedir: HOME,
    username: OS_USER,
    hostname: HOSTNAME,
    sessionValues,
    checks: [
      { id: 'node', group: 'environment', name: 'Node', status: 'ok', detail: 'Node 22.19.0 satisfies >=22.19', fix: null },
      { id: 'home', group: 'environment', name: 'XACTIONS_HOME', status: 'ok', detail: `${XHOME} is writable`, fix: null },
      {
        id: 'shadowed-install', group: 'environment', name: 'Install on PATH', status: 'warn',
        detail: `xactions on PATH is 4.2.0 at ${HOME}/.nvm/versions/node/v20.1.0/lib/node_modules/xactions, older than this 5.0.0`,
        fix: 'npm install -g xactions@latest',
      },
      {
        id: 'mcp', group: 'environment', name: 'MCP server', status: 'ok', detail: 'MCP server exposes 165 tools', fix: null,
        facts: { tools: 165 },
      },
      { id: 'skills', group: 'environment', name: 'Skills', status: 'ok', detail: '12 skill installs found', fix: null, facts: { total: 12 } },
      {
        id: 'query-ids', group: 'environment', name: 'GraphQL query IDs', status: 'ok',
        detail: `140 query IDs cached, 5h old (${XHOME}/query-ids.json)`, fix: null,
        facts: { cached: true, count: 140, age: '5h old' },
      },
      {
        id: 'guest-profile', group: 'guest', name: 'Profile read', status: 'fail',
        detail: `request to https://x.com/i/api/graphql/abc/UserByScreenName?variables=%7B%22screen_name%22%3A%22${HANDLE}%22%7D failed via ${PROXY}, then ${SOCKS}`,
        fix: 'Check your network and any proxy.',
      },
      {
        id: 'guest-timeline', group: 'guest', name: 'Timeline read', status: 'fail',
        detail: `HTTP 403 with cookie: auth_token=${AUTH_TOKEN}; ct0=${CT0} and Authorization: Bearer ${BEARER}`,
        fix: null,
      },
      {
        id: 'session-saved', group: 'session', name: 'Session saved', status: 'ok',
        detail: `Both cookies present in ${XHOME}/cookies.json`, fix: null,
        facts: { saved: true, ct0: true, source: 'cookies.json' },
      },
      {
        id: 'session-valid', group: 'session', name: 'Session valid', status: 'ok',
        detail: `Signed in as @${HANDLE} (id ${ACCOUNT_ID}), contact ${EMAIL}, also saw user ${UNKNOWN_ID}`, fix: null,
        secrets: [HANDLE, ACCOUNT_ID],
      },
      {
        id: 'accounts', group: 'session', name: 'Accounts', status: 'warn',
        detail: `No account pool at ${HOME}/.xactions/accounts.db, webhook ${WEBHOOK}, key ${LLM_KEY}, host ${HOSTNAME}, config ${CONFIG_SECRET}`,
        fix: null,
      },
    ],
  };
}

/**
 * @param {string} text
 */
function expectNoSecrets(text) {
  for (const secret of SECRETS) {
    expect(text, `leaked ${secret}`).not.toContain(secret);
    expect(text.toLowerCase(), `leaked ${secret} in another case`).not.toContain(secret.toLowerCase());
  }
}

describe('doctor --report redaction', () => {
  let dir;

  beforeAll(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'xactions-report-'));
    await fs.writeFile(
      path.join(dir, 'cookies.json'),
      JSON.stringify([
        { name: 'auth_token', value: AUTH_TOKEN },
        { name: 'ct0', value: CT0 },
        { name: 'twid', value: `u%3D${ACCOUNT_ID}` },
      ]),
    );
    await fs.writeFile(
      path.join(dir, 'config.json'),
      JSON.stringify({ authToken: AUTH_TOKEN, csrfToken: CT0, nested: { other: CONFIG_SECRET } }),
    );
  });

  afterAll(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('reads every saved cookie and config value as a secret', async () => {
    const values = await readSessionSecrets(dir);
    expect(values).toEqual(expect.arrayContaining([AUTH_TOKEN, CT0, `u%3D${ACCOUNT_ID}`, CONFIG_SECRET]));
  });

  it('reads nothing, and does not throw, when no session is saved', async () => {
    expect(await readSessionSecrets(path.join(dir, 'missing'))).toEqual([]);
  });

  it('leaves no cookie, token, username, account id, proxy URL, home path or env value in the report', async () => {
    const report = renderReport(secretState(await readSessionSecrets(dir)));
    expectNoSecrets(report);
  });

  it('redacts even when the saved session was not read', () => {
    expectNoSecrets(renderReport(secretState([])));
  });

  it('leaves nothing in the prefilled issue URL either', async () => {
    const state = secretState(await readSessionSecrets(dir));
    const report = renderReport(state);
    const url = issueUrl({ bugsUrl: 'https://github.com/nirholas/xactions/issues', title: reportTitle(state), report });
    expectNoSecrets(url);
    expectNoSecrets(decodeURIComponent(url));
  });

  it('keeps what a maintainer needs', () => {
    const report = renderReport(secretState());
    expect(report.startsWith('### xactions doctor report')).toBe(true);
    expect(report).toContain('| xactions | 5.0.0 |');
    expect(report).toContain('5.0.0');
    expect(report).toContain('global npm');
    expect(report).toContain('22.19.0');
    expect(report).toContain('>=22.19');
    expect(report).toContain('linux 6.8.0-45-generic');
    expect(report).toContain('x64');
    expect(report).toContain('puppeteer 25.11.0');
    expect(report).toContain('@atproto/api 0.32.0');
    expect(report).toMatch(/missing[^\n]*bull/i);
    expect(report).toMatch(/Guest tier[^\n]*fail/);
    expect(report).toMatch(/Session[^\n]*saved, carries ct0/);
    expect(report).toMatch(/Query-ID cache[^\n]*140 IDs, 5h old/);
    expect(report).toMatch(/MCP self-test[^\n]*ok, 165 tools/);
    expect(report).toMatch(/Skills installed[^\n]*12/);
    for (const id of ['node', 'home', 'shadowed-install', 'guest-profile', 'session-valid', 'accounts']) {
      expect(report).toContain(`\`${id}\``);
    }
    // Home paths stay readable as ~ rather than vanishing.
    expect(report).toContain('~/.xactions/accounts.db');
  });

  it('says when no session is saved, and when one lacks ct0', () => {
    const state = secretState();
    state.checks.find((c) => c.id === 'session-saved').facts = { saved: false, ct0: false, source: null };
    expect(renderReport(state)).toMatch(/Session[^\n]*none saved/);
    state.checks.find((c) => c.id === 'session-saved').facts = { saved: true, ct0: false, source: 'config.json' };
    expect(renderReport(state)).toMatch(/Session[^\n]*saved, no ct0/);
  });

  it('keeps table cells intact when a detail holds a pipe or a newline', () => {
    const state = secretState();
    state.checks[0].detail = 'one | two\nthree';
    const row = renderReport(state).split('\n').find((line) => line.startsWith('| `node`'));
    expect(row).toBe('| `node` | ok | one \\| two three |');
  });
});

describe('scrub', () => {
  it('maps the home directory to ~ in both slash styles', () => {
    const secrets = collectSecrets({ env: {}, homedir: 'C:\\Users\\Alice', username: 'Alice', hostname: 'box' });
    expect(scrub('C:\\Users\\Alice\\.xactions\\x and C:/Users/Alice/.xactions/y', secrets)).toBe('~\\.xactions\\x and ~/.xactions/y');
  });

  it('does not treat shared system account names as personal', () => {
    const secrets = collectSecrets({ env: {}, homedir: '/home/node', username: 'node', hostname: 'h' });
    expect(scrub('node_modules and node 22', secrets)).toBe('node_modules and node 22');
  });

  it('leaves scoped package names alone while removing handles', () => {
    expect(scrub('@x402/core loaded for @someone', [])).toBe('@x402/core loaded for @[redacted]');
  });

  it('keeps the host of a known URL and drops its path and query', () => {
    expect(scrub('GET https://x.com/i/api/graphql/abc/UserByScreenName?variables=1 failed', [])).toBe(
      'GET https://x.com/[path removed] failed',
    );
    expect(scrub('via https://proxy.corp.example:8443/pac', [])).toBe('via [redacted-url]');
  });
});

describe('issueUrl', () => {
  const bugsUrl = 'https://github.com/nirholas/xactions/issues';

  it('targets the bug form and prefills the title and the doctor report field', () => {
    const url = new URL(issueUrl({ bugsUrl, title: '[bug] title', report: '### report' }));
    expect(url.origin + url.pathname).toBe('https://github.com/nirholas/xactions/issues/new');
    expect(url.searchParams.get('template')).toBe('bug_report.yml');
    expect(url.searchParams.get('title')).toBe('[bug] title');
    expect(url.searchParams.get('doctor-report')).toBe('### report');
  });

  it('stays under the length GitHub accepts, asking for a paste instead', () => {
    const report = `### head\n${'x'.repeat(20000)}`;
    const url = issueUrl({ bugsUrl, title: 't', report });
    expect(url.length).toBeLessThanOrEqual(8000);
    expect(new URL(url).searchParams.get('doctor-report')).toMatch(/too long for a link/);
  });

  it('titles the issue after the first failing check', () => {
    const state = secretState();
    expect(reportTitle(state)).toMatch(/^\[bug\] guest-profile: /);
    expectNoSecrets(reportTitle(state));
    state.checks.forEach((c) => { c.status = 'ok'; });
    expect(reportTitle(state)).toBe('[bug] ');
  });
});

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The MCP lane's safety guarantees, each pinned to the way it used to fail:
 * the draft store and action ledger under concurrent writers, all-or-nothing
 * multi-class charges, bulk tools charged per action, the dry-run rule the
 * ledger and x_engage share, the `writes` selector, filtered drafts, the
 * HTTP Host check, the x402 path gate, and the per-call browser lock.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// Never launch Chrome against x.com from a test: a replay fails fast instead.
process.env.PUPPETEER_EXECUTABLE_PATH = '/nonexistent/xactions-test-chrome';

const ROOT = resolve(import.meta.dirname, '../..');
const prev = {
  home: process.env.XACTIONS_HOME,
  caps: process.env.XACTIONS_ACTION_CAPS,
  account: process.env.XACTIONS_ACCOUNT,
};

let home;
let server;
let drafts;
let caps;
let groups;
let localTools;

beforeAll(async () => {
  server = await import('../../src/mcp/server.js');
  drafts = await import('../../src/mcp/drafts.js');
  caps = await import('../../src/mcp/action-caps.js');
  groups = await import('../../src/mcp/tool-groups.js');
  localTools = await import('../../src/mcp/local-tools.js');
});

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'xactions-lane-'));
  process.env.XACTIONS_HOME = home;
  delete process.env.XACTIONS_ACTION_CAPS;
  delete process.env.XACTIONS_ACCOUNT;
});

afterAll(() => {
  for (const [key, env] of [['home', 'XACTIONS_HOME'], ['caps', 'XACTIONS_ACTION_CAPS'], ['account', 'XACTIONS_ACCOUNT']]) {
    if (prev[key] === undefined) delete process.env[env];
    else process.env[env] = prev[key];
  }
});

async function connect(overrides = {}) {
  const srv = server.createMcpServer({ tools: '', exclude: '', ...overrides });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await srv.connect(serverTransport);
  const client = new Client({ name: 'lane-safety', version: '0.0.0' });
  await client.connect(clientTransport);
  return { client, close: async () => { await client.close(); await srv.close(); } };
}

const parseText = (result) => JSON.parse(result.content[0].text);

/** Run a node script as a separate process and wait for it to exit 0. */
function runNode(source, env) {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', source], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`exit ${code}: ${stderr}`))));
  });
}

describe('draft approval', () => {
  it('runs the held tool through the real backend from a fresh process', async () => {
    const draft = drafts.createDraft('x_like', { url: 'https://x.com/x/status/1' });
    const done = await server.approveDraftChecked(draft.id);
    expect(done.status).toBe('failed');
    // The backend was reached (Puppeteer refused the fake binary); it was not
    // the null backend `xactions drafts approve` used to hit.
    expect(done.error).not.toMatch(/Cannot read properties of null/);
  });

  it('runs a draft once when two approvals race', async () => {
    const draft = drafts.createDraft('x_reply', { text: 'once' });
    let runs = 0;
    const slow = async () => { runs += 1; await new Promise((r) => setTimeout(r, 50)); return { ok: true }; };
    const results = await Promise.allSettled([
      drafts.approveDraft(draft.id, slow),
      drafts.approveDraft(draft.id, slow),
    ]);
    expect(runs).toBe(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(drafts.getDraft(draft.id).status).toBe('executed');
  });

  it('keeps a draft created while another one is executing', async () => {
    const first = drafts.createDraft('x_reply', { text: 'first' });
    let second;
    await drafts.approveDraft(first.id, async () => {
      second = drafts.createDraft('x_reply', { text: 'second' });
      return { ok: true };
    });
    expect(drafts.getDraft(second.id)?.status).toBe('pending');
    expect(drafts.getDraft(first.id).status).toBe('executed');
  });

  it('records `{ success: false }` as a failed draft', async () => {
    const draft = drafts.createDraft('x_like', { url: 'u' });
    const done = await drafts.approveDraft(draft.id, async () => ({ success: false, message: 'Could not like tweet' }));
    expect(done.status).toBe('failed');
    expect(done.error).toBe('Could not like tweet');
  });

  it('refuses to approve a draft whose tool the server filters out', async () => {
    const draft = drafts.createDraft('x_send_dm', { username: 'someone', message: 'hi' });
    const { client, close } = await connect({ tools: 'read,drafts' });
    try {
      const res = await client.callTool({ name: 'x_approve_draft', arguments: { id: draft.id } });
      expect(res.isError).toBe(true);
      expect(parseText(res).error).toMatch(/disabled by this server's tool filter/);
      expect(drafts.getDraft(draft.id).status).toBe('pending');
      expect(caps.remaining().classes.dm.used).toBe(0);
    } finally {
      await close();
    }
  });
});

describe('action ledger', () => {
  it('counts every charge when several processes write it at once', async () => {
    const script = `
      const caps = await import(${JSON.stringify(join(ROOT, 'src/mcp/action-caps.js'))});
      for (let i = 0; i < 60; i++) caps.checkAndRecord('racer', 'like');
    `;
    const env = { XACTIONS_HOME: home, XACTIONS_ACTION_CAPS: JSON.stringify({ like: 100000 }) };
    await Promise.all([runNode(script, env), runNode(script, env), runNode(script, env)]);
    process.env.XACTIONS_ACTION_CAPS = env.XACTIONS_ACTION_CAPS;
    expect(caps.remaining('racer').classes.like.used).toBe(180);
  }, 30000);

  it('records nothing when one class of a multi-class charge is refused', () => {
    process.env.XACTIONS_ACTION_CAPS = JSON.stringify({ like: 100, reply: 0 });
    expect(() => caps.checkAndRecordMany('sweeper', [
      { actionClass: 'like', count: 50 },
      { actionClass: 'reply', count: 50 },
    ])).toThrow(caps.ActionCapExceededError);
    expect(caps.remaining('sweeper').classes.like.used).toBe(0);
  });

  it('caps accounts named after Object.prototype members across restarts', () => {
    process.env.XACTIONS_ACTION_CAPS = JSON.stringify({ follow: 1 });
    for (const name of ['constructor', 'toString', '__proto__']) {
      caps.checkAndRecord(name, 'follow');
      expect(() => caps.checkAndRecord(name, 'follow')).toThrow(caps.ActionCapExceededError);
    }
    const onDisk = JSON.parse(readFileSync(caps.getLedgerPath(), 'utf8'));
    expect(Object.keys(onDisk.accounts).sort()).toEqual(['__proto__', 'constructor', 'tostring']);
    expect(Object.prototype).not.toHaveProperty('follow');
  });
});

describe('what a call is charged', () => {
  it('charges bulk tools for every action they can take', () => {
    const { resolveActionCharge } = groups;
    expect(resolveActionCharge('x_auto_like', { maxLikes: 500 })).toEqual({ actionClass: 'like', count: 500 });
    expect(resolveActionCharge('x_auto_like', {})).toEqual({ actionClass: 'like', count: 20 });
    expect(resolveActionCharge('x_unfollow_non_followers', {})).toEqual({ actionClass: 'unfollow', count: 100 });
    expect(resolveActionCharge('x_unfollow_non_followers', { dryRun: true })).toBeNull();
    expect(resolveActionCharge('x_auto_retweet', { limit: 7 })).toEqual({ actionClass: 'repost', count: 7 });
    expect(resolveActionCharge('x_follow', { username: 'a' })).toEqual({ actionClass: 'follow', count: 1 });
  });

  it('treats a missing or null dryRun as a preview and any other falsy value as live', () => {
    const { resolveActionCharge, isLiveRun } = groups;
    for (const dryRun of [undefined, null, true]) {
      expect(isLiveRun(dryRun)).toBe(false);
      expect(resolveActionCharge('x_engage', { dryRun })).toBeNull();
    }
    for (const dryRun of [false, 0, '']) {
      expect(isLiveRun(dryRun)).toBe(true);
      expect(resolveActionCharge('x_engage', { dryRun, limit: 5 })).toEqual([{ actionClass: 'like', count: 5 }]);
    }
  });
});

describe('tool filter', () => {
  it('`writes` selects every write tool across groups', () => {
    const filter = groups.createToolFilter({ exclude: 'writes', tools: server.TOOLS });
    const exposedWrites = server.TOOLS.map((t) => t.name).filter((n) => groups.isWriteTool(n) && filter.isAllowed(n));
    expect(exposedWrites).toEqual([]);
    expect(filter.isAllowed('x_get_profile')).toBe(true);
    for (const name of ['x_engage', 'x_auto_like', 'x_bulk_execute', 'x_persona_run']) {
      expect(filter.isAllowed(name)).toBe(false);
    }
  });
});

describe('HTTP transport Host check', () => {
  const check = (middleware, host) => {
    let status = 200;
    const res = { status(code) { status = code; return { json() {} }; } };
    let passed = false;
    middleware({ headers: { host } }, res, () => { passed = true; });
    return passed ? 200 : status;
  };

  it('answers only loopback names when open', () => {
    const mw = server.hostValidationFor({});
    expect(check(mw, '127.0.0.1:8787')).toBe(200);
    expect(check(mw, 'evil.example')).toBe(403);
  });

  it('accepts the configured hostnames of a hosted server', () => {
    const mw = server.hostValidationFor({ allowedHosts: 'mcp.example.com' });
    expect(check(mw, 'mcp.example.com')).toBe(200);
    expect(check(mw, 'evil.example')).toBe(403);
  });

  it('accepts any Host behind a bearer token', () => {
    expect(check(server.hostValidationFor({ token: 's3cret' }), 'mcp.example.com')).toBe(200);
  });
});

describe('x402 gate', () => {
  it('gates /mcp/ and /MCP the way Express routes them', async () => {
    const prevPay = process.env.X402_PAY_TO_ADDRESS;
    try {
      const { createMcpPaymentMiddleware } = await import('../../src/mcp/x402-mcp.js');
      const mw = createMcpPaymentMiddleware();
      // Unconfigured: everything passes, in production too.
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      let passed = 0;
      for (const path of ['/mcp', '/mcp/', '/MCP']) {
        await mw({ method: 'POST', path, headers: {} }, {}, () => { passed += 1; });
      }
      process.env.NODE_ENV = prevEnv;
      expect(passed).toBe(3);
    } finally {
      if (prevPay === undefined) delete process.env.X402_PAY_TO_ADDRESS;
      else process.env.X402_PAY_TO_ADDRESS = prevPay;
    }
  });
});

describe('browser lock', () => {
  it('serialises calls that reach the browser and leaves the rest alone', async () => {
    const order = [];
    const { withToolContext } = localTools;
    // Two calls race for the page: the second only starts once the first is done.
    const call = (label, ms) => withToolContext(async () => {
      await localTools.holdBrowser();
      order.push(`${label}:start`);
      await new Promise((r) => setTimeout(r, ms));
      order.push(`${label}:end`);
    });
    // An HTTP-only call never takes the lock and finishes first.
    const httpOnly = withToolContext(async () => { order.push('http'); });
    await Promise.all([call('a', 40), call('b', 1), httpOnly]);
    expect(order.indexOf('a:end')).toBeLessThan(order.indexOf('b:start'));
    expect(order.indexOf('http')).toBeLessThan(order.indexOf('a:end'));
  });

  it('is reentrant for a tool that calls another tool', async () => {
    const { withToolContext } = localTools;
    const inner = () => withToolContext(async () => { await localTools.holdBrowser(); return 'inner'; });
    const outer = withToolContext(async () => { await localTools.holdBrowser(); return inner(); });
    await expect(Promise.race([outer, new Promise((_, no) => setTimeout(() => no(new Error('deadlock')), 1000))]))
      .resolves.toBe('inner');
  });
});

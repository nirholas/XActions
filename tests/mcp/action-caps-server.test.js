// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Daily action caps on the wire: a real MCP client over the SDK's in-memory
 * transport, so what is asserted is what Claude Desktop or Cursor would see
 * when an agent runs into its follow budget.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

let createMcpServer;
let TOOLS;
let draftsMod;
let home;
// An approved draft really reaches the local backend now. Point Puppeteer at
// a binary that does not exist so a replay fails in milliseconds instead of
// launching Chrome against x.com from the test run. The server is imported
// dynamically below, after this is set.
process.env.PUPPETEER_EXECUTABLE_PATH = '/nonexistent/xactions-test-chrome';

const prevHome = process.env.XACTIONS_HOME;
const prevCaps = process.env.XACTIONS_ACTION_CAPS;
const prevAccount = process.env.XACTIONS_ACCOUNT;

async function connect(overrides = {}) {
  const server = createMcpServer({ tools: '', exclude: '', ...overrides });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'caps-test', version: '0.0.0' });
  await client.connect(clientTransport);
  return { client, close: async () => { await client.close(); await server.close(); } };
}

const parseText = (result) => JSON.parse(result.content[0].text);

beforeAll(async () => {
  const mod = await import('../../src/mcp/server.js');
  createMcpServer = mod.createMcpServer;
  TOOLS = mod.TOOLS;
  draftsMod = await import('../../src/mcp/drafts.js');
});

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'xactions-caps-mcp-'));
  process.env.XACTIONS_HOME = home;
  process.env.XACTIONS_ACTION_CAPS = JSON.stringify({ follow: 2, like: 1, mute: 3 });
  delete process.env.XACTIONS_ACCOUNT;
});

afterAll(() => {
  if (prevHome === undefined) delete process.env.XACTIONS_HOME; else process.env.XACTIONS_HOME = prevHome;
  if (prevCaps === undefined) delete process.env.XACTIONS_ACTION_CAPS; else process.env.XACTIONS_ACTION_CAPS = prevCaps;
  if (prevAccount === undefined) delete process.env.XACTIONS_ACCOUNT; else process.env.XACTIONS_ACCOUNT = prevAccount;
  if (home) rmSync(home, { recursive: true, force: true });
});

describe('x_action_budget', () => {
  it('is declared, grouped as a read tool, and reports every class', async () => {
    expect(TOOLS.some((t) => t.name === 'x_action_budget')).toBe(true);
    const groups = await import('../../src/mcp/tool-groups.js');
    expect(groups.groupOf('x_action_budget')).toBe('read');

    const { client, close } = await connect({ account: 'brand' });
    try {
      const body = parseText(await client.callTool({ name: 'x_action_budget', arguments: {} }));
      expect(body.account).toBe('brand');
      expect(body.windowHours).toBe(24);
      expect(Object.keys(body.classes).sort()).toEqual(
        ['block', 'delete', 'dm', 'follow', 'like', 'mute', 'post', 'reply', 'repost', 'unfollow']
      );
      expect(body.classes.follow).toEqual({ cap: 2, used: 0, remaining: 2, resetAt: null });
      expect(body.classes.post.cap).toBe(2400);
    } finally {
      await close();
    }
  });
});

describe('cap enforcement in CallTool', () => {
  it('charges each write call, refuses over the cap, and never reaches the backend for the refused call', async () => {
    const { client, close } = await connect({ account: 'brand' });
    try {
      // The first two attempts reach the local backend and fail there (no
      // browser session in the test process). That failure proves the call
      // was dispatched, and each one is charged to the ledger.
      for (let i = 0; i < 2; i++) {
        const res = await client.callTool({ name: 'x_follow', arguments: { username: 'nichxbt' } });
        expect(res.isError).toBe(true);
        expect(parseText(res).code).not.toBe('ACTION_CAP_EXCEEDED');
      }

      const refused = await client.callTool({ name: 'x_follow', arguments: { username: 'nichxbt' } });
      expect(refused.isError).toBe(true);
      const body = parseText(refused);
      expect(body.code).toBe('ACTION_CAP_EXCEEDED');
      expect(body).toMatchObject({ tool: 'x_follow', account: 'brand', actionClass: 'follow', cap: 2, used: 2 });
      expect(typeof body.resetAt).toBe('string');
      expect(body.hint).toMatch(/XACTIONS_ACTION_CAPS/);

      const budget = parseText(await client.callTool({ name: 'x_action_budget', arguments: {} }));
      expect(budget.classes.follow).toMatchObject({ used: 2, remaining: 0 });
      expect(budget.classes.follow.resetAt).toBe(body.resetAt);

      // A different class is still open
      const like = await client.callTool({ name: 'x_like', arguments: { url: 'https://x.com/x/status/1' } });
      expect(parseText(like).code).not.toBe('ACTION_CAP_EXCEEDED');
      const like2 = await client.callTool({ name: 'x_like', arguments: { url: 'https://x.com/x/status/1' } });
      expect(parseText(like2).code).toBe('ACTION_CAP_EXCEEDED');

      // Read tools are never charged
      const read = await client.callTool({ name: 'x_list_platforms', arguments: {} });
      expect(read.isError).toBeFalsy();
      const ledger = JSON.parse(readFileSync(join(home, 'action-ledger.json'), 'utf8'));
      expect(Object.keys(ledger.accounts.brand).sort()).toEqual(['follow', 'like']);
    } finally {
      await close();
    }
  });

  it('bulk tools are charged per username and a dry run is free', async () => {
    const { client, close } = await connect({ account: 'brand' });
    try {
      const dry = await client.callTool({
        name: 'x_bulk_execute',
        arguments: { action: 'mute', usernames: ['a', 'b', 'c', 'd'], dryRun: true },
      });
      expect(parseText(dry).code).not.toBe('ACTION_CAP_EXCEEDED');

      const refused = await client.callTool({
        name: 'x_bulk_execute',
        arguments: { action: 'mute', usernames: ['a', 'b', 'c', 'd'] },
      });
      const body = parseText(refused);
      expect(body.code).toBe('ACTION_CAP_EXCEEDED');
      expect(body).toMatchObject({ actionClass: 'mute', cap: 3, used: 0 });
    } finally {
      await close();
    }
  });

  it('caps persist across a server restart on the same XACTIONS_HOME', async () => {
    const first = await connect({ account: 'brand' });
    await first.client.callTool({ name: 'x_follow', arguments: { username: 'one' } });
    await first.client.callTool({ name: 'x_follow', arguments: { username: 'two' } });
    await first.close();

    const second = await connect({ account: 'brand' });
    try {
      const res = await second.client.callTool({ name: 'x_follow', arguments: { username: 'three' } });
      expect(parseText(res).code).toBe('ACTION_CAP_EXCEEDED');
    } finally {
      await second.close();
    }
  });

  it('reads the account from XACTIONS_ACCOUNT and falls back to "default"', async () => {
    process.env.XACTIONS_ACCOUNT = 'EnvAccount';
    const a = await connect();
    try {
      expect(parseText(await a.client.callTool({ name: 'x_action_budget', arguments: {} })).account).toBe('envaccount');
    } finally {
      await a.close();
    }
    delete process.env.XACTIONS_ACCOUNT;
    const b = await connect({ account: '' });
    try {
      const body = parseText(await b.client.callTool({ name: 'x_action_budget', arguments: { account: 'default' } }));
      expect(body.account).toBe('default');
    } finally {
      await b.close();
    }
  });
});

describe('cap enforcement with the approval gate', () => {
  it('holding a draft costs nothing; approving it is charged, and a refused approval stays pending', async () => {
    const { client, close } = await connect({ account: 'brand', requireApproval: true });
    try {
      const ids = [];
      for (let i = 0; i < 3; i++) {
        const held = parseText(await client.callTool({ name: 'x_follow', arguments: { username: `u${i}` } }));
        expect(held.held).toBe(true);
        ids.push(held.draftId);
      }
      let budget = parseText(await client.callTool({ name: 'x_action_budget', arguments: {} }));
      expect(budget.classes.follow.used).toBe(0);

      // The agent cannot approve its own held writes, and is not offered the tool
      const tools = (await client.listTools()).tools.map((t) => t.name);
      expect(tools).not.toContain('x_approve_draft');
      const selfApproved = await client.callTool({ name: 'x_approve_draft', arguments: { id: ids[0] } });
      expect(selfApproved.isError).toBe(true);
      expect(parseText(selfApproved).approve).toBe(`xactions drafts approve ${ids[0]}`);
      expect(draftsMod.getDraft(ids[0]).status).toBe('pending');

      // A person approves (what `xactions drafts approve` runs). Two run, and
      // fail at the backend, which is the dispatch proof; both are charged.
      const { approveDraftChecked } = await import('../../src/mcp/server.js');
      for (const id of ids.slice(0, 2)) {
        const draft = await approveDraftChecked(id, { account: 'brand' });
        expect(draft.status).toBe('failed');
      }
      budget = parseText(await client.callTool({ name: 'x_action_budget', arguments: {} }));
      expect(budget.classes.follow.used).toBe(2);

      // The third is refused by the cap and remains approvable later
      const refused = await approveDraftChecked(ids[2], { account: 'brand' }).catch((e) => e);
      expect(refused.code).toBe('ACTION_CAP_EXCEEDED');
      expect(draftsMod.getDraft(ids[2]).status).toBe('pending');
    } finally {
      await close();
    }
  });
});

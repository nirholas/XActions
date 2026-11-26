// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The x_api_* MCP tools on the wire: a real MCP client over the SDK's
 * in-memory transport, with fetch stubbed so no request leaves the machine.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { groupOf, isWriteTool, resolveActionCharge } from '../../src/mcp/tool-groups.js';
import { jsonResponse } from './helpers.js';

process.env.PUPPETEER_EXECUTABLE_PATH = '/nonexistent/xactions-test-chrome';

const CREDENTIAL_KEYS = Object.keys(process.env).filter((k) => /^(X|TWITTER)_/.test(k));
const saved = Object.fromEntries([...CREDENTIAL_KEYS, 'XACTIONS_HOME'].map((k) => [k, process.env[k]]));
let createMcpServer;
let home;

async function connect(overrides = {}) {
  const server = createMcpServer({ tools: '', exclude: '', ...overrides });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'xapi-test', version: '0.0.0' });
  await client.connect(clientTransport);
  return { client, close: async () => { await client.close(); await server.close(); } };
}

const call = async (client, name, args) => {
  const result = await client.callTool({ name, arguments: args });
  return { isError: Boolean(result.isError), body: JSON.parse(result.content[0].text) };
};

beforeAll(async () => {
  ({ createMcpServer } = await import('../../src/mcp/server.js'));
});

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'xactions-xapi-mcp-'));
  process.env.XACTIONS_HOME = home;
  for (const k of CREDENTIAL_KEYS) delete process.env[k];
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.X_BEARER_TOKEN;
  rmSync(home, { recursive: true, force: true });
});

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe('x_api tool policy', () => {
  it('groups every x_api tool together and gates only the write tool', () => {
    for (const name of ['x_api_list_operations', 'x_api_describe', 'x_api_get', 'x_api_stream_sample', 'x_api_write']) {
      expect(groupOf(name)).toBe('xapi');
    }
    expect(isWriteTool('x_api_write')).toBe(true);
    expect(isWriteTool('x_api_get')).toBe(false);
  });

  it('charges the daily cap by what the operation does', () => {
    expect(resolveActionCharge('x_api_write', { operation: 'createPosts', body: { text: 'hi' } })).toEqual({ actionClass: 'post', count: 1 });
    expect(resolveActionCharge('x_api_write', { operation: 'createPosts', body: { text: 'hi', reply: { in_reply_to_tweet_id: '1' } } })).toEqual({ actionClass: 'reply', count: 1 });
    expect(resolveActionCharge('x_api_write', { operation: 'POST /2/users/{id}/following' })).toEqual({ actionClass: 'follow', count: 1 });
    expect(resolveActionCharge('x_api_write', { operation: 'likePost' })).toEqual({ actionClass: 'like', count: 1 });
    expect(resolveActionCharge('x_api_write', { operation: 'createPosts', dryRun: true })).toBeNull();
    expect(resolveActionCharge('x_api_write', { operation: 'createLists' })).toBeNull();
  });
});

describe('x_api tools over MCP', () => {
  it('lists the tools and searches the catalog without any keys', async () => {
    const { client, close } = await connect();
    try {
      const { tools } = await client.listTools();
      expect(tools.map((t) => t.name).filter((n) => n.startsWith('x_api_')).sort()).toEqual([
        'x_api_describe', 'x_api_get', 'x_api_list_operations', 'x_api_stream_sample', 'x_api_write',
      ]);
      const list = await call(client, 'x_api_list_operations', { query: 'followers', limit: 3 });
      expect(list.isError).toBe(false);
      expect(JSON.stringify(list.body)).toContain('getUsersFollowers');
      const described = await call(client, 'x_api_describe', { operation: 'createPosts' });
      expect(JSON.stringify(described.body)).toContain('https://docs.x.com/');
    } finally {
      await close();
    }
  });

  it('keeps reads and writes on their own tools and explains a missing credential', async () => {
    const { client, close } = await connect();
    try {
      const wrongTool = await call(client, 'x_api_get', { operation: 'createPosts' });
      expect(wrongTool.isError).toBe(true);
      expect(wrongTool.body.error).toMatch(/Use x_api_write/);
      const noKey = await call(client, 'x_api_get', { operation: 'getUsersByUsername', params: { username: 'XDevelopers' } });
      expect(noKey.isError).toBe(true);
      expect(noKey.body.code).toBe('auth_required');
      const plan = await call(client, 'x_api_write', { operation: 'createPosts', body: { text: 'hi' }, dryRun: true });
      expect(plan.body).toMatchObject({ dryRun: true, method: 'POST', url: 'https://api.x.com/2/tweets', auth: 'none configured' });
    } finally {
      await close();
    }
  });

  it('sends a keyed read to api.x.com and returns the data', async () => {
    process.env.X_BEARER_TOKEN = 'test-bearer';
    const requests = [];
    vi.stubGlobal('fetch', async (url, init) => {
      requests.push({ url: String(url), auth: init.headers.authorization });
      return jsonResponse(200, { data: { id: '2244994945', username: 'XDevelopers' } });
    });
    const { client, close } = await connect();
    try {
      const result = await call(client, 'x_api_get', { operation: 'getUsersByUsername', params: { username: 'XDevelopers' } });
      expect(result.isError).toBe(false);
      expect(JSON.stringify(result.body)).toContain('2244994945');
      expect(requests).toEqual([{ url: 'https://api.x.com/2/users/by/username/XDevelopers', auth: 'Bearer test-bearer' }]);
    } finally {
      await close();
    }
  });

  it('holds x_api_write as a draft when the approval gate is on', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { client, close } = await connect({ requireApproval: true });
    try {
      const held = await client.callTool({ name: 'x_api_write', arguments: { operation: 'createPosts', body: { text: 'hi' } } });
      expect(held.content[0].text).toMatch(/draft/i);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });
});

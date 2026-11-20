// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
// XActions - organization MCP tools over a real MCP client. Offline.

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { addAccount, createOrg, getPost, setMember } from '../../src/orgs/index.js';

let createMcpServer;
let groups;

beforeAll(async () => {
  ({ createMcpServer } = await import('../../src/mcp/server.js'));
  groups = await import('../../src/mcp/tool-groups.js');
});

async function connect(overrides = {}) {
  const server = createMcpServer(overrides);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'orgs-test', version: '0.0.0' });
  await client.connect(clientTransport);
  return { client, close: async () => { await client.close(); await server.close(); } };
}

const parse = (result) => JSON.parse(result.content[0].text);

describe('organization MCP tools', () => {
  let home;
  let previous;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-orgs-mcp-'));
    previous = process.env.XACTIONS_HOME;
    process.env.XACTIONS_HOME = home;
    createOrg({ slug: 'newsroom', name: 'Newsroom', owner: 'ed' });
    setMember('newsroom', 'ed', { name: 'agent', role: 'writer' });
    for (const handle of ['newsroom', 'nrbreaking']) {
      addAccount('newsroom', 'ed', { handle, cookies: [{ name: 'auth_token', value: 'a' }, { name: 'ct0', value: 'c' }] });
    }
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.XACTIONS_HOME;
    else process.env.XACTIONS_HOME = previous;
    fs.rmSync(home, { recursive: true, force: true });
  });

  it('groups every org tool under orgs and offers no way to approve or publish', async () => {
    const { client, close } = await connect({ tools: 'orgs' });
    try {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name).filter((n) => n.startsWith('x_org_')).sort();
      expect(names).toEqual(['x_org_calendar', 'x_org_draft', 'x_org_list', 'x_org_queue']);
      for (const n of names) expect(groups.isWriteTool(n)).toBe(false);
    } finally {
      await close();
    }
  });

  it('drafts as a member and reads the draft back from the queue', async () => {
    const { client, close } = await connect();
    try {
      const drafted = parse(await client.callTool({
        name: 'x_org_draft',
        arguments: {
          org: 'newsroom',
          member: 'agent',
          account: 'nrbreaking',
          text: 'BREAKING: council approves the new transit budget',
          reposts: ['newsroom'],
          note: 'Source: council livestream, 14:02',
        },
      }));
      expect(drafted.post.status).toBe('draft');
      expect(drafted.next).toMatch(/xactions org approve newsroom p_/);
      expect(getPost('newsroom', drafted.post.id).createdBy).toBe('agent');

      const queue = parse(await client.callTool({ name: 'x_org_queue', arguments: { org: 'newsroom', member: 'agent', status: 'draft' } }));
      expect(queue.posts.map((p) => p.id)).toEqual([drafted.post.id]);
      expect(queue.accounts.map((a) => a.handle)).toEqual(['newsroom', 'nrbreaking']);

      const list = parse(await client.callTool({ name: 'x_org_list', arguments: {} }));
      expect(list.orgs).toEqual([{ slug: 'newsroom', name: 'Newsroom', accounts: 2, members: 2 }]);
    } finally {
      await close();
    }
  });

  it('returns the content refusal to the agent as an error', async () => {
    const { client, close } = await connect();
    try {
      const result = await client.callTool({
        name: 'x_org_draft',
        arguments: {
          org: 'newsroom',
          member: 'agent',
          account: 'newsroom',
          text: 'Polls close at 8pm tonight',
          variants: [{ account: 'nrbreaking', text: 'Polls close at 8pm tonight!' }],
        },
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/too alike/);
    } finally {
      await close();
    }
  });
});

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * MCP server: handler coverage, tool filtering, and the draft-approval gate.
 *
 * Coverage: every entry in TOOLS must resolve to a real implementation. A
 * tool that is declared but never dispatched (x_list_platforms was one for
 * months) shows up in every client's tool list and then fails on first use.
 *
 * Filtering and the gate are exercised through a real MCP Client over the
 * SDK's in-memory transport, so what is asserted is the wire behaviour a
 * Claude Desktop or Cursor session would see, not internal helpers.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// An approved draft really reaches the local backend now. Point Puppeteer at
// a binary that does not exist so a replay fails in milliseconds instead of
// launching Chrome against x.com from the test run. The server is imported
// dynamically below, after this is set.
process.env.PUPPETEER_EXECUTABLE_PATH = '/nonexistent/xactions-test-chrome';

const here = dirname(fileURLToPath(import.meta.url));
const serverSource = readFileSync(join(here, '../../src/mcp/server.js'), 'utf8');

let TOOLS;
let createMcpServer;
let localToolMap;
let groups;
let draftsMod;

/** Connect a fresh client to a fresh server built with the given overrides. */
async function connect(overrides = {}) {
  const server = createMcpServer(overrides);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'coverage-test', version: '0.0.0' });
  await client.connect(clientTransport);
  return { client, server, close: async () => { await client.close(); await server.close(); } };
}

function parseText(result) {
  return JSON.parse(result.content[0].text);
}

beforeAll(async () => {
  const mod = await import('../../src/mcp/server.js');
  TOOLS = mod.TOOLS;
  createMcpServer = mod.createMcpServer;
  localToolMap = (await import('../../src/mcp/local-tools.js')).toolMap;
  groups = await import('../../src/mcp/tool-groups.js');
  draftsMod = await import('../../src/mcp/drafts.js');
});

describe('handler coverage', () => {
  it('every declared tool resolves to an implementation', () => {
    // Implementations come from three places: local-tools exports, a
    // `case 'x_name':` in one of the executeXxxTool switches, or the
    // draft/platform handlers added alongside their definitions.
    const caseNames = new Set(
      [...serverSource.matchAll(/case '(x_[a-z0-9_]+)'/g)].map((m) => m[1])
    );
    // Tools dispatched by an explicit `if (name === 'x_...')` branch before
    // the backend switches, so a new one needs no edit here.
    const dispatchedByName = new Set(
      [...serverSource.matchAll(/name === '(x_[a-z0-9_]+)'/g)].map((m) => m[1])
    );
    const implemented = new Set([
      ...Object.keys(localToolMap),
      ...caseNames,
      ...dispatchedByName,
      ...groups.ALWAYS_AVAILABLE_TOOLS,
    ]);

    const missing = TOOLS.map((t) => t.name).filter((n) => !implemented.has(n));
    expect(missing, `tools with no handler: ${missing.join(', ')}`).toEqual([]);
  });

  it('x_list_platforms is dispatched explicitly, not left to the localTools fallback', () => {
    expect(serverSource).toMatch(/name === 'x_list_platforms'/);
    expect(serverSource).toMatch(/async function executePlatformTool/);
  });

  it('every tool has a description of at least 40 characters', () => {
    const short = TOOLS.filter((t) => (t.description || '').trim().length < 40);
    expect(short.map((t) => `${t.name} (${t.description.length})`)).toEqual([]);
  });

  it('every tool belongs to a named group', () => {
    const orphans = TOOLS.filter((t) => groups.groupOf(t.name) === 'other');
    expect(orphans.map((t) => t.name)).toEqual([]);
  });

  it('every write tool in the gate register is a declared tool or a known local export', () => {
    const declared = new Set([...TOOLS.map((t) => t.name), ...Object.keys(localToolMap)]);
    const unknown = [...groups.WRITE_TOOLS].filter((n) => !declared.has(n));
    expect(unknown).toEqual([]);
  });

  it('the four draft tools are declared and always allowed', () => {
    for (const name of groups.ALWAYS_AVAILABLE_TOOLS) {
      expect(TOOLS.some((t) => t.name === name), name).toBe(true);
    }
    const filter = groups.createToolFilter({ include: 'read', exclude: 'drafts', tools: TOOLS });
    for (const name of groups.ALWAYS_AVAILABLE_TOOLS) {
      expect(filter.isAllowed(name), name).toBe(true);
    }
  });
});

describe('x_list_platforms', () => {
  it('lists every scraper platform with its capabilities and the adapter registry', async () => {
    const { client, close } = await connect();
    try {
      const res = await client.callTool({ name: 'x_list_platforms', arguments: {} });
      expect(res.isError).toBeFalsy();
      const body = parseText(res);
      const names = body.platforms.map((p) => p.name).sort();
      expect(names).toEqual(['bluesky', 'mastodon', 'threads', 'twitter']);
      const twitter = body.platforms.find((p) => p.name === 'twitter');
      expect(twitter.aliases).toContain('x');
      expect(twitter.capabilities).toEqual(expect.arrayContaining(['profile', 'followers', 'posts', 'search', 'thread']));
      const bluesky = body.platforms.find((p) => p.name === 'bluesky');
      expect(bluesky.capabilities).toContain('feed');
      expect(Array.isArray(body.adapters)).toBe(true);
      expect(body.adapters.length).toBeGreaterThan(0);
      expect(typeof body.defaultAdapter).toBe('string');
    } finally {
      await close();
    }
  });
});

describe('tool filtering', () => {
  it('exposes every tool when no filter is configured', async () => {
    const { client, close } = await connect({ tools: '', exclude: '' });
    try {
      const { tools } = await client.listTools();
      expect(tools.length).toBe(TOOLS.length);
    } finally {
      await close();
    }
  });

  it('honours an include list of groups and tool names in ListTools', async () => {
    const { client, close } = await connect({ tools: 'read, x_analyze_sentiment', exclude: '' });
    try {
      const { tools } = await client.listTools();
      const names = new Set(tools.map((t) => t.name));
      expect(names.has('x_get_profile')).toBe(true);
      expect(names.has('x_analyze_sentiment')).toBe(true);
      expect(names.has('x_post_tweet')).toBe(false);
      expect(names.has('x_send_dm')).toBe(false);
      for (const n of groups.ALWAYS_AVAILABLE_TOOLS) expect(names.has(n)).toBe(true);
      const expected = groups.buildGroups(TOOLS).read.length + 1 + groups.ALWAYS_AVAILABLE_TOOLS.length;
      expect(tools.length).toBe(expected);
    } finally {
      await close();
    }
  });

  it('exclude wins over include and supports prefix patterns', async () => {
    const { client, close } = await connect({ tools: 'read,write', exclude: 'dm,x_post_*' });
    try {
      const { tools } = await client.listTools();
      const names = new Set(tools.map((t) => t.name));
      expect(names.has('x_get_profile')).toBe(true);
      expect(names.has('x_follow')).toBe(true);
      expect(names.has('x_post_tweet')).toBe(false);
      expect(names.has('x_post_thread')).toBe(false);
      expect(names.has('x_send_dm')).toBe(false);
    } finally {
      await close();
    }
  });

  it('refuses to call a filtered tool with an actionable error', async () => {
    const { client, close } = await connect({ tools: 'read', exclude: '' });
    try {
      const res = await client.callTool({ name: 'x_post_tweet', arguments: { text: 'hello' } });
      expect(res.isError).toBe(true);
      const body = parseText(res);
      expect(body.error).toMatch(/disabled by the server's tool filter/);
      expect(body.group).toBe('write');
      expect(body.hint).toMatch(/XACTIONS_MCP_TOOLS/);
    } finally {
      await close();
    }
  });

  it('reads XACTIONS_MCP_TOOLS and XACTIONS_MCP_EXCLUDE from the environment', async () => {
    const prev = { t: process.env.XACTIONS_MCP_TOOLS, e: process.env.XACTIONS_MCP_EXCLUDE };
    process.env.XACTIONS_MCP_TOOLS = 'lists';
    process.env.XACTIONS_MCP_EXCLUDE = 'x_get_list_members';
    const { client, close } = await connect();
    try {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name).sort();
      expect(names).toEqual(['x_get_lists', ...groups.ALWAYS_AVAILABLE_TOOLS].sort());
    } finally {
      await close();
      if (prev.t === undefined) delete process.env.XACTIONS_MCP_TOOLS; else process.env.XACTIONS_MCP_TOOLS = prev.t;
      if (prev.e === undefined) delete process.env.XACTIONS_MCP_EXCLUDE; else process.env.XACTIONS_MCP_EXCLUDE = prev.e;
    }
  });

  it('reports unknown selection tokens instead of silently matching nothing', () => {
    const filter = groups.createToolFilter({ include: 'read,nonsense_group', tools: TOOLS });
    expect(filter.unknown).toEqual(['nonsense_group']);
    expect(filter.isAllowed('x_get_profile')).toBe(true);
  });
});

describe('draft approval gate', () => {
  let home;
  const prevHome = process.env.XACTIONS_HOME;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'xactions-mcp-drafts-'));
    process.env.XACTIONS_HOME = home;
  });

  afterAll(() => {
    if (prevHome === undefined) delete process.env.XACTIONS_HOME; else process.env.XACTIONS_HOME = prevHome;
    if (home) rmSync(home, { recursive: true, force: true });
  });

  it('does not execute a write tool; it stores a draft and returns the id', async () => {
    const { client, close } = await connect({ requireApproval: true, tools: '', exclude: '' });
    try {
      const res = await client.callTool({ name: 'x_post_tweet', arguments: { text: 'held for review' } });
      expect(res.isError).toBeFalsy();
      const body = parseText(res);
      expect(body.held).toBe(true);
      expect(body.tool).toBe('x_post_tweet');
      expect(typeof body.draftId).toBe('string');

      const file = join(home, 'mcp-drafts.json');
      expect(existsSync(file)).toBe(true);
      const stored = JSON.parse(readFileSync(file, 'utf8'));
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({ id: body.draftId, tool: 'x_post_tweet', args: { text: 'held for review' }, status: 'pending' });
      expect(typeof stored[0].createdAt).toBe('string');

      const list = parseText(await client.callTool({ name: 'x_list_drafts', arguments: {} }));
      expect(list.pending).toBe(1);
      expect(list.drafts[0].id).toBe(body.draftId);

      const status = parseText(await client.callTool({ name: 'x_draft_status', arguments: { id: body.draftId } }));
      expect(status.status).toBe('pending');

      const discarded = parseText(await client.callTool({ name: 'x_discard_draft', arguments: { id: body.draftId } }));
      expect(discarded.discarded).toBe(true);
      expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual([]);
    } finally {
      await close();
    }
  });

  it('lets read tools through untouched while approval mode is on', async () => {
    const { client, close } = await connect({ requireApproval: true, tools: '', exclude: '' });
    try {
      const res = await client.callTool({ name: 'x_list_platforms', arguments: {} });
      expect(res.isError).toBeFalsy();
      expect(parseText(res).platforms.length).toBe(4);
      expect(draftsMod.listDrafts()).toEqual([]);
    } finally {
      await close();
    }
  });

  it('approving a draft replays the stored call through the real dispatcher', async () => {
    const { client, close } = await connect({ requireApproval: true, tools: '', exclude: '' });
    try {
      const held = parseText(await client.callTool({ name: 'x_like', arguments: { url: 'https://x.com/x/status/1' } }));
      // No browser session exists in the test process, so the replay reaches
      // the local backend and fails there. That failure is the proof the call
      // was actually attempted, and it must be recorded on the draft.
      // In approval mode the agent is refused; a person approves.
      const self = await client.callTool({ name: 'x_approve_draft', arguments: { id: held.draftId } });
      expect(self.isError).toBe(true);
      expect(draftsMod.getDraft(held.draftId).status).toBe('pending');

      const { approveDraftChecked } = await import('../../src/mcp/server.js');
      const draft = await approveDraftChecked(held.draftId);
      expect(draft.status).toBe('failed');
      expect(typeof draft.error).toBe('string');
      expect(typeof draft.executedAt).toBe('string');

      // A draft that already ran cannot be approved a second time
      await expect(approveDraftChecked(held.draftId)).rejects.toThrow(/only pending drafts/);
    } finally {
      await close();
    }
  });

  it('drafts.js approves through any executor and records the result', async () => {
    const draft = draftsMod.createDraft('x_reply', { url: 'https://x.com/x/status/2', text: 'ok' });
    const seen = [];
    const done = await draftsMod.approveDraft(draft.id, async (tool, args) => {
      seen.push([tool, args]);
      return { posted: true };
    });
    expect(seen).toEqual([['x_reply', { url: 'https://x.com/x/status/2', text: 'ok' }]]);
    expect(done.status).toBe('executed');
    expect(done.result).toEqual({ posted: true });
    expect(draftsMod.listDrafts({ status: 'executed' }).map((d) => d.id)).toEqual([draft.id]);
    expect(draftsMod.pruneDrafts()).toBe(1);
    expect(draftsMod.listDrafts()).toEqual([]);
  });

  it('is off by default so existing setups keep executing immediately', async () => {
    const prev = process.env.XACTIONS_MCP_REQUIRE_APPROVAL;
    delete process.env.XACTIONS_MCP_REQUIRE_APPROVAL;
    const { client, close } = await connect({ tools: '', exclude: '' });
    try {
      const res = await client.callTool({ name: 'x_follow', arguments: { username: 'nichxbt' } });
      // Executes (and fails for lack of a browser session) rather than being held
      expect(res.isError).toBe(true);
      expect(parseText(res).held).toBeUndefined();
      expect(draftsMod.listDrafts()).toEqual([]);
    } finally {
      await close();
      if (prev !== undefined) process.env.XACTIONS_MCP_REQUIRE_APPROVAL = prev;
    }
  });
});

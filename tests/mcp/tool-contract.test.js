// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The MCP tool table as a contract.
 *
 * Three layers, each catching a failure the others cannot:
 *
 * 1. Every entry in TOOLS is a well-formed tool definition: a conforming,
 *    unique name, a description, and an input schema a client can validate
 *    against (types that exist, arrays that say what they hold, required
 *    keys that are declared, defaults inside their enum).
 * 2. Every tool name is routed to a handler that actually knows it. The
 *    routing is read from dispatchTool's own branches, so a prefix that
 *    swallows a tool belonging elsewhere (x_schedule_post fell into the
 *    scheduler queue's switch and failed on every call) is caught here
 *    rather than by the first user to call it.
 * 3. Invalid input over a real MCP client and the SDK's in-memory transport
 *    comes back as a structured error result, never a thrown exception, a
 *    protocol error, or a "success" carrying an error message.
 *
 * Nothing here reaches X: fetch is replaced with one that throws, and
 * Puppeteer is pointed at a binary that does not exist.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

// Set before the server module is imported (dynamically, in beforeAll): it
// reads XACTIONS_HOME (drafts, the action ledger) and HOME (plugins config).
const home = mkdtempSync(join(tmpdir(), 'xactions-mcp-contract-'));
process.env.HOME = home;
process.env.XACTIONS_HOME = join(home, 'xh');
process.env.PUPPETEER_EXECUTABLE_PATH = '/nonexistent/xactions-test-chrome';
for (const key of ['XACTIONS_SESSION_COOKIE', 'XACTIONS_MCP_TOOLS', 'XACTIONS_MCP_EXCLUDE', 'XACTIONS_MCP_REQUIRE_APPROVAL', 'XACTIONS_MODE']) {
  delete process.env[key];
}

const here = dirname(fileURLToPath(import.meta.url));
const serverSource = readFileSync(join(here, '../../src/mcp/server.js'), 'utf8');

const JSON_SCHEMA_TYPES = new Set(['string', 'number', 'integer', 'boolean', 'array', 'object', 'null']);

let server;
let TOOLS;
let localToolMap;
let ALWAYS_AVAILABLE_TOOLS;

/**
 * Problems with one JSON-Schema node and everything under it.
 * @param {unknown} schema
 * @param {string} at - path for the message
 * @returns {string[]}
 */
function schemaProblems(schema, at) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return [`${at}: not a schema object`];
  const problems = [];
  const types = Array.isArray(schema.type) ? schema.type : schema.type ? [schema.type] : [];
  if (!types.length && !schema.enum && !schema.oneOf && !schema.anyOf && !('const' in schema)) {
    problems.push(`${at}: has no type, enum, const, oneOf or anyOf`);
  }
  for (const t of types) if (!JSON_SCHEMA_TYPES.has(t)) problems.push(`${at}: unknown type "${t}"`);
  if (schema.description !== undefined && typeof schema.description !== 'string') problems.push(`${at}: description is not a string`);
  if (schema.enum !== undefined) {
    if (!Array.isArray(schema.enum) || schema.enum.length === 0) problems.push(`${at}: enum is not a non-empty array`);
    else if (schema.default !== undefined && !schema.enum.includes(schema.default)) problems.push(`${at}: default ${JSON.stringify(schema.default)} is not in its enum`);
  }
  if (types.includes('array')) {
    if (!schema.items) problems.push(`${at}: array without items`);
    else problems.push(...schemaProblems(schema.items, `${at}[]`));
  }
  if (schema.properties !== undefined) {
    if (typeof schema.properties !== 'object' || Array.isArray(schema.properties)) problems.push(`${at}: properties is not an object`);
    else for (const [key, child] of Object.entries(schema.properties)) problems.push(...schemaProblems(child, `${at}.${key}`));
  }
  if (schema.required !== undefined) {
    if (!Array.isArray(schema.required)) problems.push(`${at}: required is not an array`);
    else {
      for (const key of schema.required) {
        if (typeof key !== 'string') problems.push(`${at}: required entry ${JSON.stringify(key)} is not a string`);
        else if (!schema.properties || !(key in schema.properties)) problems.push(`${at}: required "${key}" is not in properties`);
      }
      if (new Set(schema.required).size !== schema.required.length) problems.push(`${at}: required has duplicates`);
    }
  }
  for (const key of ['oneOf', 'anyOf']) {
    if (schema[key] !== undefined) schema[key].forEach((s, i) => problems.push(...schemaProblems(s, `${at}.${key}[${i}]`)));
  }
  return problems;
}

/**
 * Source of a top-level function in server.js, up to the next top-level
 * declaration.
 * @param {string} name
 * @returns {string}
 */
function functionSource(name) {
  const start = serverSource.indexOf(`\nasync function ${name}(`);
  if (start < 0) throw new Error(`server.js no longer defines ${name}()`);
  const rest = serverSource.slice(start + 1);
  const end = rest.slice(1).search(/\n(?:async function |function |export |let |const |\/\*\*)/);
  return rest.slice(0, end + 1);
}

/**
 * dispatchTool's routing table, read from its source: each
 * `if (<condition>) { return await executeX(` branch becomes a predicate over
 * the tool name, in order. The conditions only reference `name`, the local
 * `xeepyTools` list, and ALWAYS_AVAILABLE_TOOLS.
 */
function dispatchRoutes() {
  const body = functionSource('dispatchTool');
  const xeepyLiteral = body.match(/const xeepyTools = (\[[^\]]*\]);/);
  if (!xeepyLiteral) throw new Error('dispatchTool no longer declares xeepyTools');
  const xeepyTools = JSON.parse(xeepyLiteral[1].replace(/'/g, '"').replace(/,\s*\]/, ']'));
  const routes = [...body.matchAll(/if \(([^{}]*?)\) \{\s*return await (\w+)\(/g)].map(([, condition, handler]) => {
    const test = new Function('name', 'xeepyTools', 'ALWAYS_AVAILABLE_TOOLS', `return (${condition});`);
    return { handler, matches: (name) => Boolean(test(name, xeepyTools, ALWAYS_AVAILABLE_TOOLS)) };
  });
  return routes;
}

/** Connect a fresh client to a fresh server built with the given overrides. */
async function connect(overrides = {}) {
  const srv = server.createMcpServer({ tools: '', exclude: '', ...overrides });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await srv.connect(serverTransport);
  const client = new Client({ name: 'contract-test', version: '0.0.0' });
  await client.connect(clientTransport);
  return { client, close: async () => { await client.close(); await srv.close(); } };
}

beforeAll(async () => {
  // Any code path that tries the network fails fast and visibly.
  vi.stubGlobal('fetch', async (url) => {
    throw new Error(`network access in a contract test: ${url}`);
  });
  server = await import('../../src/mcp/server.js');
  TOOLS = server.TOOLS;
  localToolMap = (await import('../../src/mcp/local-tools.js')).toolMap;
  ({ ALWAYS_AVAILABLE_TOOLS } = await import('../../src/mcp/tool-groups.js'));
});

afterAll(() => {
  vi.unstubAllGlobals();
  rmSync(home, { recursive: true, force: true });
});

describe('tool definitions', () => {
  it('names are unique and every one matches ^x_[a-z0-9_]+$', () => {
    const names = TOOLS.map((t) => t.name);
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([]);
    expect(names.filter((n) => !/^x_[a-z0-9_]+$/.test(n))).toEqual([]);
  });

  it('declares only name, description and inputSchema (plus optional annotations)', () => {
    const allowed = new Set(['name', 'description', 'inputSchema', 'annotations', 'title', 'outputSchema']);
    const extra = TOOLS.flatMap((t) => Object.keys(t).filter((k) => !allowed.has(k)).map((k) => `${t.name}.${k}`));
    expect(extra).toEqual([]);
  });

  it('every description is a non-empty string', () => {
    const bad = TOOLS.filter((t) => typeof t.description !== 'string' || !t.description.trim());
    expect(bad.map((t) => t.name)).toEqual([]);
  });

  it('every inputSchema is an object schema with a valid property tree', () => {
    const problems = TOOLS.flatMap((t) => {
      const s = t.inputSchema;
      if (!s || s.type !== 'object') return [`${t.name}: inputSchema.type is not "object"`];
      return schemaProblems(s, t.name);
    });
    expect(problems).toEqual([]);
  });

  it('survives a JSON round trip unchanged, so tools/list serves exactly TOOLS', async () => {
    expect(JSON.parse(JSON.stringify(TOOLS))).toEqual(TOOLS);
    const { client, close } = await connect();
    try {
      const { tools } = await client.listTools();
      const byName = new Map(tools.map((t) => [t.name, t]));
      for (const tool of TOOLS) {
        expect(byName.get(tool.name)?.inputSchema, tool.name).toEqual(tool.inputSchema);
      }
    } finally {
      await close();
    }
  });
});

describe('dispatch routing', () => {
  it('reads a non-trivial routing table out of dispatchTool', () => {
    // Guards the reader: if a refactor changes the branch shape, the routing
    // test below must fail loudly rather than pass over an empty table.
    const routes = dispatchRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(12);
    expect(routes.find((r) => r.matches('x_list_drafts'))?.handler).toBe('executeDraftTool');
    expect(routes.find((r) => r.matches('x_graph_build'))?.handler).toBe('executeGraphTool');
  });

  it('routes every declared tool to a handler whose switch has a case for it', () => {
    const routes = dispatchRoutes();
    const misrouted = [];
    for (const { name } of TOOLS) {
      const route = routes.find((r) => r.matches(name));
      if (!route) {
        // Falls through to plugins, then the local backend (or remote API).
        if (!localToolMap[name]) misrouted.push(`${name}: reaches the local backend, which has no ${name}`);
        continue;
      }
      const body = functionSource(route.handler);
      // Single-purpose handlers (x_ask, x_list_platforms...) have no switch.
      if (!/switch \(name\)/.test(body)) continue;
      if (body.includes(`case '${name}'`)) continue;
      // executeXeepyTool tries localTools[name] before its own switch.
      if (route.handler === 'executeXeepyTool' && localToolMap[name]) continue;
      misrouted.push(`${name}: routed to ${route.handler}, which has no case for it`);
    }
    expect(misrouted).toEqual([]);
  });

  it('every case label in a routed handler is reachable through dispatchTool', () => {
    // A case the router never sends there is dead code, and usually means the
    // tool it was written for is being routed somewhere else.
    const routes = dispatchRoutes();
    const handlers = [...new Set(routes.map((r) => r.handler))];
    const declared = new Set(TOOLS.map((t) => t.name));
    const unreachable = [];
    for (const handler of handlers) {
      for (const [, name] of functionSource(handler).matchAll(/case '(x_[a-z0-9_]+)'/g)) {
        if (!declared.has(name)) continue;
        if (routes.find((r) => r.matches(name))?.handler !== handler) unreachable.push(`${handler}: case '${name}'`);
      }
    }
    expect(unreachable).toEqual([]);
  });
});

describe('invalid input returns a structured error', () => {
  let client;
  let close;

  beforeAll(async () => {
    // Bring the local backend up the way `xactions drafts approve` does, so
    // calls that fall through to local-tools reach the real implementation.
    const { createDraft } = await import('../../src/mcp/drafts.js');
    const draft = createDraft('x_list_platforms', {});
    const done = await server.approveDraftChecked(draft.id);
    expect(done.status).toBe('executed');
    ({ client, close } = await connect());
  });

  afterAll(async () => {
    await close?.();
  });

  /**
   * Call a tool; assert it neither threw nor succeeded, and return the error
   * text. Two failure shapes are part of the contract: `{ error }` from the
   * server's handlers and `{ success: false, message }` from browser tools.
   */
  async function callExpectingError(name, args) {
    const res = await client.callTool({ name, arguments: args });
    expect(res.isError, `${name} should report isError`).toBe(true);
    expect(res.content?.[0]?.type).toBe('text');
    const body = JSON.parse(res.content[0].text);
    const text = typeof body.error === 'string' ? body.error : body.success === false ? body.message : undefined;
    expect(typeof text, `${name} error body ${res.content[0].text}`).toBe('string');
    expect(text.length).toBeGreaterThan(0);
    return text;
  }

  const cases = [
    ['x_draft_status', {}, /"id" is required/],
    ['x_approve_draft', {}, /"id" is required/],
    ['x_discard_draft', {}, /"id" is required/],
    ['x_draft_status', { id: 'no-such-draft' }, /no-such-draft/],
    ['x_ask', {}, /"question" is required/],
    ['x_ask', { question: '   ' }, /"question" is required/],
    ['x_download_media', {}, /"target" is required/],
    ['x_persona_create', {}, /"name" is required/],
    ['x_persona_create', { name: 'contract' }, /"preset" is required/],
    ['x_graph_build', {}, /"username" is required/],
    ['x_graph_build', { username: '@' }, /"username" is required/],
    ['x_stream_start', {}, /Invalid stream type/],
    ['x_stream_start', { type: 'telepathy', username: 'nasa' }, /Invalid stream type "telepathy"/],
    ['x_analyze_sentiment', {}, /Either "text" \(string\) or "texts" \(array\) is required/],
    ['x_monitor_reputation', { action: 'explode' }, /Unknown action "explode"/],
    ['x_monitor_reputation', { action: 'stop' }, /"monitorId" is required/],
    ['x_reputation_report', {}, /"username" is required/],
    ['x_account_brief', { usernames: [] }, /No valid usernames/],
    ['x_account_brief', { usernames: ['!!!', 'way_too_long_for_a_handle'] }, /No valid usernames/],
    ['x_account_brief', { usernames: Array.from({ length: 26 }, (_, i) => `user${i}`) }, /26 accounts is more than one call/],
    ['x_schedule_post', { text: 'contract', scheduledAt: 'next tuesday-ish' }, /not a valid date\/time/],
    ['x_schedule_post', { text: 'contract', scheduledAt: '2001-01-01T00:00:00Z' }, /in the past/],
  ];

  it.each(cases)('%s %j', async (name, args, message) => {
    const error = await callExpectingError(name, args);
    expect(error).toMatch(message);
    expect(error).not.toMatch(/Unknown (\w+ )?tool/);
  });

  it('an unknown tool name is an "Unknown tool" error, not a crash', async () => {
    expect(await callExpectingError('x_no_such_tool', {})).toBe('Unknown tool: x_no_such_tool');
  });

  it('an unknown tool under a filter says unknown, without a group or hint', async () => {
    const filtered = await connect({ tools: 'read' });
    try {
      const res = await filtered.client.callTool({ name: 'x_no_such_tool', arguments: {} });
      expect(res.isError).toBe(true);
      const body = JSON.parse(res.content[0].text);
      expect(body).toEqual({ error: 'Unknown tool: x_no_such_tool' });
    } finally {
      await filtered.close();
    }
  });

  it('a call with no arguments object is treated as empty arguments', async () => {
    const res = await client.callTool({ name: 'x_list_drafts' });
    expect(res.isError).toBeFalsy();
    expect(JSON.parse(res.content[0].text)).toMatchObject({ count: expect.any(Number) });
  });

  it('the server keeps answering after a run of failed calls', async () => {
    const res = await client.callTool({ name: 'x_list_platforms', arguments: {} });
    expect(res.isError).toBeFalsy();
    expect(JSON.parse(res.content[0].text).platforms.length).toBeGreaterThan(0);
  });
});

describe('failure reported in the return value', () => {
  it('reportsFailure recognises both failure shapes and nothing else', async () => {
    const { reportsFailure } = await import('../../src/mcp/drafts.js');
    expect(reportsFailure({ success: false, message: 'no' })).toBe(true);
    expect(reportsFailure({ error: 'no' })).toBe(true);
    expect(reportsFailure({ success: true, error: 'partial' })).toBe(false);
    expect(reportsFailure({ error: '' })).toBe(false);
    expect(reportsFailure({ error: undefined, runId: 'r1' })).toBe(false);
    expect(reportsFailure([{ error: 'per-item' }])).toBe(false);
    expect(reportsFailure(null)).toBe(false);
    expect(reportsFailure('error')).toBe(false);
  });

  it('a draft whose tool returns { error } is recorded as failed, not executed', async () => {
    const drafts = await import('../../src/mcp/drafts.js');
    const draft = drafts.createDraft('x_unfollow_all', {});
    const done = await drafts.approveDraft(draft.id, async () => ({ error: 'Must set confirm: true to mass unfollow everyone' }));
    expect(done.status).toBe('failed');
    expect(done.error).toMatch(/confirm: true/);
    drafts.discardDraft(draft.id);
  });
});

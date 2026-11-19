// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests — A2A server hardening: authentication by default, loopback bind,
 * CORS allowlist, write permissions, action caps, the approval gate, SSRF
 * refusal, background execution for tasks/sendSubscribe, and stream lifecycle.
 *
 * @author nich (@nichxbt)
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-a2a-sec-'));
const saved = {};
for (const k of ['XACTIONS_HOME', 'XACTIONS_ACTION_CAPS', 'XACTIONS_MCP_REQUIRE_APPROVAL', 'XACTIONS_ACCOUNT',
  'XACTIONS_A2A_ALLOW_UNAUTHENTICATED', 'XACTIONS_A2A_ALLOW_PRIVATE', 'A2A_HOST', 'A2A_CORS_ORIGINS']) {
  saved[k] = process.env[k];
  delete process.env[k];
}
process.env.XACTIONS_HOME = HOME;
process.env.XACTIONS_ACCOUNT = 'sectest';

const { createA2AServer } = await import('../../src/a2a/server.js');
const { createBridge } = await import('../../src/a2a/bridge.js');
const { generateApiKey, generateToken, validateToken, createOutboundAuth, PERMISSION_PRESETS } = await import('../../src/a2a/auth.js');
const { connectToAgentStream } = await import('../../src/a2a/streaming.js');
const { assertSafeOutboundUrl } = await import('../../src/a2a/urlGuard.js');
const { createTextPart, createDataPart } = await import('../../src/a2a/types.js');

afterAll(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  fs.rmSync(HOME, { recursive: true, force: true });
});

const quiet = { enableLogging: false, enableRateLimit: false, mode: 'local' };

function rpc(text, method = 'tasks/send', extra = {}) {
  return JSON.stringify({
    jsonrpc: '2.0', id: 1, method,
    params: { message: { role: 'user', parts: [{ type: 'text', text }] }, ...extra },
  });
}

async function startServer(options = {}) {
  const agent = createA2AServer({ ...quiet, ...options });
  const calls = [];
  agent.bridge.getToolResult = async (tool, params) => { calls.push({ tool, params }); return { ok: true }; };
  const server = await agent.start(0);
  const { port } = server.address();
  return { agent, calls, server, base: `http://127.0.0.1:${port}` };
}

describe('default A2A server', () => {
  let ctx, readKey, writeKey;

  beforeAll(async () => {
    ctx = await startServer();
    readKey = (await generateApiKey('reader', PERMISSION_PRESETS.readonly)).key;
    writeKey = (await generateApiKey('writer', PERMISSION_PRESETS.standard)).key;
  });
  afterAll(() => ctx.agent.shutdown());

  it('binds to loopback only', () => {
    expect(ctx.server.address().address).toBe('127.0.0.1');
  });

  it('refuses an unauthenticated task and runs nothing', async () => {
    const res = await fetch(`${ctx.base}/a2a/tasks`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: rpc('post a tweet saying "pwned"'),
    });
    expect(res.status).toBe(401);
    expect(ctx.calls).toHaveLength(0);
  });

  it('keeps the agent card public', async () => {
    const res = await fetch(`${ctx.base}/.well-known/agent.json`);
    expect(res.status).toBe(200);
  });

  it('refuses a cross-origin preflight', async () => {
    const res = await fetch(`${ctx.base}/a2a/tasks`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' },
    });
    expect(res.status).toBe(403);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('lets a read-only key read but not write', async () => {
    const read = await fetch(`${ctx.base}/a2a/tasks`, {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `ApiKey ${readKey}` },
      body: rpc('get profile for nasa'),
    });
    expect((await read.json()).result.status.state).toBe('completed');

    const before = ctx.calls.length;
    const write = await fetch(`${ctx.base}/a2a/tasks`, {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `ApiKey ${readKey}` },
      body: rpc('post a tweet saying "not allowed"'),
    });
    const task = (await write.json()).result;
    expect(task.status.state).toBe('failed');
    expect(task.status.message).toMatch(/Permission denied/);
    expect(ctx.calls.length).toBe(before);
  });

  it('runs a write for a key with the write permission', async () => {
    const res = await fetch(`${ctx.base}/a2a/tasks`, {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `ApiKey ${writeKey}` },
      body: rpc('follow @nasa'),
    });
    expect((await res.json()).result.status.state).toBe('completed');
    expect(ctx.calls.at(-1)).toEqual({ tool: 'x_follow', params: { username: 'nasa' } });
  });

  it('refuses a push callback on a private address', async () => {
    for (const url of ['http://127.0.0.1:6379/', 'http://169.254.169.254/latest/meta-data/', 'file:///etc/passwd']) {
      const res = await fetch(`${ctx.base}/a2a/tasks`, {
        method: 'POST', headers: { 'content-type': 'application/json', Authorization: `ApiKey ${writeKey}` },
        body: rpc('get profile for nasa', 'tasks/send', { pushNotification: { url } }),
      });
      expect(res.status).toBe(400);
    }
  });

  it('keeps discovery to admins and refuses private agent URLs', async () => {
    const denied = await fetch(`${ctx.base}/a2a/agents/discover`, {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `ApiKey ${writeKey}` },
      body: JSON.stringify({ urls: ['https://example.com'] }),
    });
    expect(denied.status).toBe(403);

    const token = await generateToken('admin-agent', ['admin']);
    const res = await fetch(`${ctx.base}/a2a/agents/discover`, {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ urls: ['http://127.0.0.1:22', 'http://[::1]:8080'] }),
    });
    const { results } = await res.json();
    expect(results.every((r) => r.status === 'failed' && /private or local/.test(r.error))).toBe(true);
  });

  it('runs a tasks/sendSubscribe task in the background', async () => {
    const before = ctx.calls.length;
    const res = await fetch(`${ctx.base}/a2a/tasks`, {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `ApiKey ${readKey}` },
      body: rpc('get profile for spacex', 'tasks/sendSubscribe'),
    });
    const { result } = await res.json();
    for (let i = 0; i < 50 && ctx.agent.taskStore.tasks.get(result.id).status.state !== 'completed'; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    expect(ctx.agent.taskStore.tasks.get(result.id).status.state).toBe('completed');
    expect(ctx.calls.length).toBe(before + 1);
  });

  it('404s a stream for an unknown task and opens none', async () => {
    const res = await fetch(`${ctx.base}/a2a/tasks/does-not-exist/stream`, { headers: { Authorization: `ApiKey ${readKey}` } });
    expect(res.status).toBe(404);
    expect(ctx.agent.streamManager.size).toBe(0);
  });

  it('closes a stream after the task is done', async () => {
    let release;
    ctx.agent.bridge.getToolResult = () => new Promise((r) => { release = r; });
    const res = await fetch(`${ctx.base}/a2a/tasks`, {
      method: 'POST', headers: { 'content-type': 'application/json', Authorization: `ApiKey ${readKey}` },
      body: rpc('get profile for blueorigin', 'tasks/sendSubscribe'),
    });
    const { result } = await res.json();
    const stream = await fetch(`${ctx.base}/a2a/tasks/${result.id}/stream`, { headers: { Authorization: `ApiKey ${readKey}` } });
    expect(stream.status).toBe(200);
    while (!release) await new Promise((r) => setTimeout(r, 5));
    release({ ok: true });
    const body = await stream.text(); // resolves only when the server ends the response
    expect(body).toContain('event: done');
    expect(ctx.agent.streamManager.size).toBe(0);

    // A finished task answers with its final state at once.
    const again = await fetch(`${ctx.base}/a2a/tasks/${result.id}/stream`, { headers: { Authorization: `ApiKey ${readKey}` } });
    expect(await again.text()).toContain('"finalState":"completed"');
  });
});

describe('opt-outs and allowlists', () => {
  it('serves anonymous callers only when explicitly asked', async () => {
    const ctx = await startServer({ enableAuth: false });
    try {
      const res = await fetch(`${ctx.base}/a2a/health`);
      expect(res.status).toBe(200);
    } finally {
      ctx.agent.shutdown();
    }
  });

  it('echoes an allowlisted origin instead of a wildcard', async () => {
    const ctx = await startServer({ corsOrigins: ['https://app.example'] });
    try {
      const res = await fetch(`${ctx.base}/a2a/tasks`, {
        method: 'OPTIONS', headers: { Origin: 'https://app.example', 'Access-Control-Request-Method': 'POST' },
      });
      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('https://app.example');
    } finally {
      ctx.agent.shutdown();
    }
  });
});

describe('bridge write gate', () => {
  beforeEach(() => fs.rmSync(path.join(HOME, 'action-ledger.json'), { force: true }));
  afterEach(() => { delete process.env.XACTIONS_ACTION_CAPS; });

  it('charges writes against the daily action caps', async () => {
    process.env.XACTIONS_ACTION_CAPS = JSON.stringify({ follow: 1 });
    const bridge = createBridge({ mode: 'local' });
    const calls = [];
    bridge.getToolResult = async (tool) => { calls.push(tool); return { ok: true }; };
    const first = await bridge.execute('xactions.x_follow', [createDataPart({ username: 'a' })]);
    const second = await bridge.execute('xactions.x_follow', [createDataPart({ username: 'b' })]);
    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.error).toMatch(/Daily cap reached/);
    expect(calls).toEqual(['x_follow']);
  });

  it('holds writes as drafts in approval mode and never runs them', async () => {
    const bridge = createBridge({ mode: 'local', requireApproval: true });
    const calls = [];
    bridge.getToolResult = async (tool) => { calls.push(tool); return { ok: true }; };
    const result = await bridge.execute(null, [createTextPart('post a tweet saying "wait for me"')]);
    expect(calls).toEqual([]);
    expect(result.held).toBe(true);
    const draft = result.artifacts[0].data;
    expect(draft.tool).toBe('x_post_tweet');
    const stored = JSON.parse(fs.readFileSync(path.join(HOME, 'mcp-drafts.json'), 'utf8'));
    expect(stored.find((d) => d.id === draft.draftId)?.status).toBe('pending');
  });

  it('lets reads through approval mode', async () => {
    const bridge = createBridge({ mode: 'local', requireApproval: true });
    bridge.getToolResult = async () => ({ ok: true });
    const result = await bridge.execute('xactions.x_get_profile', [createDataPart({ username: 'nasa' })]);
    expect(result.success).toBe(true);
    expect(result.held).toBeUndefined();
  });

  it('reads "unfollow @nasa" as an unfollow, never a follow', () => {
    const bridge = createBridge({ mode: 'local' });
    expect(bridge.parseNaturalLanguage('unfollow @nasa')).toEqual({ tool: 'x_unfollow', params: { username: 'nasa' } });
    expect(bridge.parseNaturalLanguage('please unfollow nasa now').tool).toBe('x_unfollow');
    expect(bridge.parseNaturalLanguage('unfollow all non-followers').tool).toBe('x_unfollow_non_followers');
    expect(bridge.parseNaturalLanguage('follow @nasa').tool).toBe('x_follow');
  });
});

describe('auth storage', () => {
  it('rejects a token whose signature was altered', async () => {
    const token = await generateToken('agent', ['read']);
    const [h, p, sig] = token.split('.');
    const flipped = `${h}.${p}.${sig.slice(0, -1)}${sig.endsWith('A') ? 'B' : 'A'}`;
    expect((await validateToken(token)).valid).toBe(true);
    expect((await validateToken(flipped)).valid).toBe(false);
    expect((await validateToken(`${h}.${p}.x`)).valid).toBe(false);
  });

  it('writes outbound credentials readable by the owner only', async () => {
    await createOutboundAuth('https://agent.example', { type: 'bearer', value: 'secret' });
    const mode = fs.statSync(path.join(HOME, 'a2a', 'outbound-auth.json')).mode & 0o777;
    expect(mode).toBe(0o600);
  });
});

describe('assertSafeOutboundUrl', () => {
  const lookup = (address) => async () => [{ address }];

  it('refuses names that resolve inside', async () => {
    await expect(assertSafeOutboundUrl('https://internal.example', { lookup: lookup('10.1.2.3') })).rejects.toThrow(/private/);
    await expect(assertSafeOutboundUrl('https://mapped.example', { lookup: lookup('::ffff:127.0.0.1') })).rejects.toThrow(/private/);
  });

  it('accepts public hosts and honours the opt-out', async () => {
    await expect(assertSafeOutboundUrl('https://public.example', { lookup: lookup('93.184.216.34') })).resolves.toBeInstanceOf(URL);
    await expect(assertSafeOutboundUrl('http://127.0.0.1:9', { allowPrivate: true })).resolves.toBeInstanceOf(URL);
    await expect(assertSafeOutboundUrl('gopher://x', { allowPrivate: true })).rejects.toThrow(/http or https/);
  });
});

describe('connectToAgentStream', () => {
  it('assembles events split across chunks, waits before reconnecting, and stops after done', async () => {
    const http = await import('node:http');
    let connections = 0;
    const times = [];
    const srv = http.createServer((req, res) => {
      connections++;
      times.push(Date.now());
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      if (connections === 1) {
        // Clean close before done, with an event split across two writes.
        res.write('event: status\ndata: {"sta');
        setTimeout(() => { res.write('te":"working"}\n\n'); res.end(); }, 20);
      } else {
        res.write('event: done\ndata: {"finalState":"completed"}\n\n');
        // Leave the connection open: the client must stop on its own.
      }
    });
    await new Promise((r) => srv.listen(0, '127.0.0.1', r));
    const { port } = srv.address();
    const client = connectToAgentStream(`http://127.0.0.1:${port}`, 't1', { initialRetryMs: 100 });
    const events = [];
    for await (const e of client.events) events.push(e);
    client.disconnect();
    srv.closeAllConnections();
    srv.close();
    expect(events).toEqual([
      { event: 'status', data: { state: 'working' } },
      { event: 'done', data: { finalState: 'completed' } },
    ]);
    expect(connections).toBe(2);
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(100);
  });
});

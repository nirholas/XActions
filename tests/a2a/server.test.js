// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests — src/a2a/server.js (HTTP integration)
 * @author nich (@nichxbt)
 */

import { createA2AServer } from '../../src/a2a/server.js';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { VERSION } from '../../src/version.js';

let agent, server;
const PORT = 31999; // high port to avoid conflicts
const BASE = `http://localhost:${PORT}`;
// tasks/sendSubscribe runs the task in the background. The tool call is held
// open here so a test sees the task mid-flight and nothing reaches X.
const pendingToolCalls = [];

beforeAll(async () => {
  // These tests exercise the HTTP surface, not auth: they opt out explicitly.
  // tests/a2a/security.test.js covers the default, authenticated server.
  agent = createA2AServer({
    port: PORT,
    enableAuth: false,
    enableRateLimit: false,
    enableLogging: false,
    mode: 'local',
  });
  agent.bridge.getToolResult = () => new Promise((resolve) => pendingToolCalls.push(resolve));
  server = await agent.start(PORT);
});

afterAll(() => {
  for (const resolve of pendingToolCalls) resolve({ ok: true });
  agent.shutdown();
});

describe('GET /.well-known/agent.json', () => {
  it('returns the agent card', async () => {
    const res = await fetch(`${BASE}/.well-known/agent.json`);
    expect(res.status).toBe(200);
    const card = await res.json();
    expect(card.name).toContain('XActions');
    expect(card.url).toBeDefined();
    expect(card.version).toBe(VERSION);
    expect(Array.isArray(card.skills)).toBe(true);
  });
});

describe('GET /a2a/health', () => {
  it('returns health status', async () => {
    const res = await fetch(`${BASE}/a2a/health`);
    expect(res.status).toBe(200);
    const health = await res.json();
    expect(health.status).toBe('healthy');
    expect(health.agent).toContain('XActions');
    expect(typeof health.uptime).toBe('number');
    expect(typeof health.skills).toBe('number');
  });
});

describe('GET /a2a/skills', () => {
  it('returns skills list', async () => {
    const res = await fetch(`${BASE}/a2a/skills`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.skills)).toBe(true);
    expect(data.total).toBeGreaterThan(0);
  });

  it('filters skills by query', async () => {
    const res = await fetch(`${BASE}/a2a/skills?q=profile`);
    const data = await res.json();
    expect(data.skills.length).toBeGreaterThan(0);
    expect(data.skills.some(s => s.id.includes('profile') || s.description?.includes('profile'))).toBe(true);
  });

  it('limits results', async () => {
    const res = await fetch(`${BASE}/a2a/skills?limit=3`);
    const data = await res.json();
    expect(data.skills.length).toBeLessThanOrEqual(3);
  });
});

describe('POST /a2a/tasks', () => {
  it('rejects non-JSON-RPC requests', async () => {
    const res = await fetch(`${BASE}/a2a/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params: {} }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('rejects missing message', async () => {
    const res = await fetch(`${BASE}/a2a/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'tasks/send', params: {}, id: 'test-1' }),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error.message).toContain('message');
  });

  it('creates a task with tasks/sendSubscribe', async () => {
    const res = await fetch(`${BASE}/a2a/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tasks/sendSubscribe',
        params: {
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'get profile for XActions' }],
          },
        },
        id: 'test-sub-1',
      }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result).toBeDefined();
    expect(data.result.id).toBeDefined();
    expect(data.result.status.state).toBe('submitted');
  });
});

describe('GET /a2a/tasks/:taskId', () => {
  it('returns 404 for unknown task', async () => {
    const res = await fetch(`${BASE}/a2a/tasks/nonexistent`);
    expect(res.status).toBe(404);
  });

  it('retrieves a created task', async () => {
    // Create task first
    const createRes = await fetch(`${BASE}/a2a/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tasks/sendSubscribe',
        params: {
          message: { role: 'user', parts: [{ type: 'text', text: 'test task' }] },
        },
        id: 'get-test',
      }),
    });
    const created = await createRes.json();
    const taskId = created.result.id;

    const res = await fetch(`${BASE}/a2a/tasks/${taskId}`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result.id).toBe(taskId);
  });
});

describe('POST /a2a/tasks/:taskId/cancel', () => {
  it('cancels a submitted task', async () => {
    const createRes = await fetch(`${BASE}/a2a/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tasks/sendSubscribe',
        params: {
          message: { role: 'user', parts: [{ type: 'text', text: 'get profile for cancellable' }] },
        },
        id: 'cancel-test',
      }),
    });
    const created = await createRes.json();
    const taskId = created.result.id;

    const cancelRes = await fetch(`${BASE}/a2a/tasks/${taskId}/cancel`, { method: 'POST' });
    expect(cancelRes.status).toBe(200);
    const data = await cancelRes.json();
    expect(data.result.status.state).toBe('canceled');
  });
});

describe('CORS', () => {
  it('answers a preflight with no Origin but grants no wildcard', async () => {
    const res = await fetch(`${BASE}/a2a/health`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('refuses a browser request from an origin that is not on the allowlist', async () => {
    const res = await fetch(`${BASE}/a2a/health`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
    expect(res.status).toBe(403);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('start()', () => {
  it('rejects when the port is already taken instead of reporting it is listening', async () => {
    const other = createA2AServer({ enableAuth: false, enableRateLimit: false, enableLogging: false, mode: 'local' });
    await expect(other.start(PORT)).rejects.toMatchObject({ code: 'EADDRINUSE' });
    other.shutdown();
  });
});

describe('startup output', () => {
  /** Start a server on a free port and return everything it printed. */
  async function printedBy(options) {
    const lines = [];
    const record = (...args) => { lines.push(args.join(' ')); };
    const log = vi.spyOn(console, 'log').mockImplementation(record);
    const warn = vi.spyOn(console, 'warn').mockImplementation(record);
    const agent = createA2AServer({ enableRateLimit: false, mode: 'local', ...options });
    try {
      await agent.start(0, options.host);
    } finally {
      agent.shutdown();
      log.mockRestore();
      warn.mockRestore();
    }
    return lines.join('\n');
  }

  it('prints the banner and the auth-off notice by default', async () => {
    const out = await printedBy({ enableAuth: false });
    expect(out).toContain('XActions A2A Agent listening on');
    expect(out).toContain('A2A authentication is OFF');
  });

  it('prints neither with enableLogging: false', async () => {
    const out = await printedBy({ enableAuth: false, enableLogging: false });
    expect(out).not.toContain('listening on');
    expect(out).not.toContain('authentication is OFF');
  });

  it('still warns that an unauthenticated server is reachable from other machines', async () => {
    const out = await printedBy({ enableAuth: false, enableLogging: false, host: '0.0.0.0' });
    expect(out).toContain('reachable from other machines');
    expect(out).toContain('Authentication is OFF');
  });
});

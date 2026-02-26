/**
 * Tests — src/a2a/server.js (HTTP integration)
 * @author nich (@nichxbt)
 */

import { createA2AServer } from '../../src/a2a/server.js';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

let agent, server;
const PORT = 31999; // high port to avoid conflicts
const BASE = `http://localhost:${PORT}`;

beforeAll(async () => {
  agent = createA2AServer({
    port: PORT,
    enableAuth: false,
    enableRateLimit: false,
    enableLogging: false,
    mode: 'local',
  });
  server = await agent.start(PORT);
});

afterAll(() => {
  agent.shutdown();
});

describe('GET /.well-known/agent.json', () => {
  it('returns the agent card', async () => {
    const res = await fetch(`${BASE}/.well-known/agent.json`);
    expect(res.status).toBe(200);
    const card = await res.json();
    expect(card.name).toContain('XActions');
    expect(card.url).toBeDefined();
    expect(card.version).toBe('1.0.0');
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
          message: { role: 'user', parts: [{ type: 'text', text: 'cancellable' }] },
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
  it('returns CORS headers on OPTIONS', async () => {
    const res = await fetch(`${BASE}/a2a/health`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});

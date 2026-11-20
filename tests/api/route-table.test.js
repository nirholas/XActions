// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: every route the Express API actually mounts, not only the documented ones
 *
 * tests/api/contract.test.js walks the OpenAPI spec, so a router that is
 * mounted but never documented goes unchecked. That is how /api/optimizer/*
 * stayed open to anonymous callers (spending the operator's OpenRouter key)
 * and answered 500 to an empty body, until 2026-11-20.
 *
 * This reads the route table from the routers server.js really mounts
 * (`app.use('/api/<x>', <router>)`, then each router's own stack) and
 * holds two rules over all of it:
 *
 *   1. An unauthenticated request with no body never gets a 5xx.
 *   2. A route that answers anything other than 401/403 without credentials
 *      must be listed in PUBLIC_ROUTES below. Making a route public is a
 *      decision someone has to write down here, not an accident.
 *
 * Same environment as the contract suite: no Postgres, no Redis, no network,
 * rate limiting off, x402 unconfigured.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import request from 'supertest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.resolve(__dirname, '../../api');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'route-table-test-jwt-secret';
process.env.SESSION_SECRET = 'route-table-test-session-secret';
process.env.DATABASE_URL = 'postgresql://user:password@127.0.0.1:1/xactions?schema=public';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '1';
process.env.XACTIONS_NO_TELEMETRY = '1';
delete process.env.X402_PAY_TO_ADDRESS;
delete process.env.ADMIN_API_KEY;
// No key, so nothing here can reach OpenRouter even if a route is open.
delete process.env.OPENROUTER_API_KEY;

/**
 * Routes that answer without a signed-in user, on purpose. Each group says why.
 * Paths are as mounted, with Express `:params`.
 */
const PUBLIC_ROUTES = new Set([
  // Paid over x402 (the middleware gates them when configured), plus free discovery.
  'GET /api/ai', 'GET /api/ai/health',
  'GET /api/scripts', 'GET /api/scripts/src/:name', 'GET /api/scripts/automation/:name', 'POST /api/scripts/run',
  // A2A agent card / skill discovery.
  'GET /api/a2a/skills',
  // Ask and Chat run on the free LLM lanes (src/ask/lanes.js), not the operator's key.
  'GET /api/ask/health', 'POST /api/ask',
  'GET /api/chat/health', 'POST /api/chat/context', 'POST /api/chat',
  // Pricing and licence information.
  'GET /api/billing/plans',
  'GET /api/license', 'POST /api/license/validate', 'GET /api/license/tiers',
  // Getting a session in the first place.
  'POST /api/auth/register', 'POST /api/auth/login', 'POST /api/auth/refresh',
  'GET /api/twitter/login', 'GET /api/twitter/callback',
  // Free public tools on xactions.app (thread reader, video downloader).
  // /summarize spends the operator's key and caps its input for that reason.
  'POST /api/thread/unroll', 'POST /api/thread/summarize',
  'GET /api/thread/:tweetId', 'GET /api/thread/:tweetId/text', 'GET /api/thread/:tweetId/markdown',
  'POST /api/video/extract', 'GET /api/video/download', 'POST /api/video/extract-form',
]);

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

let app;
let httpServer;
let io;
let routes;

/** Read `app.use('/api/<x>', <ident>)` and `import <ident> from './routes/...'` from server.js. */
async function mountedRouters() {
  const source = await readFile(path.join(API_DIR, 'server.js'), 'utf8');
  const imports = new Map();
  for (const m of source.matchAll(/import\s+(\w+)\s+from\s+'(\.\/routes\/[^']+)'/g)) imports.set(m[1], m[2]);
  const mounts = [];
  for (const m of source.matchAll(/app\.use\(\s*'(\/api\/[\w-]+)'\s*,\s*(\w+)\s*\)/g)) {
    if (imports.has(m[2])) mounts.push({ prefix: m[1], specifier: imports.get(m[2]) });
  }
  return mounts;
}

/** Flatten a router's own routes (and routers it mounts at a plain path) into METHOD + path. */
function routesOf(router, prefix) {
  const out = [];
  for (const layer of router.stack ?? []) {
    if (layer.route) {
      const paths = Array.isArray(layer.route.path) ? layer.route.path : [layer.route.path];
      for (const p of paths) {
        if (typeof p !== 'string') continue;
        for (const method of Object.keys(layer.route.methods)) {
          if (METHODS.includes(method)) out.push({ method, path: prefix + (p === '/' ? '' : p) });
        }
      }
    }
  }
  return out;
}

function sampleUrl(routePath) {
  return routePath.replace(/:(\w+)\??/g, (_, name) => (/id$/i.test(name) ? '1234567890' : 'sample'));
}

beforeAll(async () => {
  const server = await import('../../api/server.js');
  ({ app, httpServer, io } = server.createApp({ rateLimiting: false }));
  routes = [];
  for (const { prefix, specifier } of await mountedRouters()) {
    // /api/ai is the paid x402 surface, covered route by route through the
    // OpenAPI spec in contract.test.js and by the x402 suites.
    if (prefix === '/api/ai') continue;
    const mod = await import(pathToFileURL(path.join(API_DIR, specifier)).href);
    routes.push(...routesOf(mod.default, prefix));
  }
});

afterAll(async () => {
  if (io) await new Promise((resolve) => io.close(resolve));
  if (httpServer?.listening) await new Promise((resolve) => httpServer.close(resolve));
});

describe('the mounted route table', () => {
  it('is read from server.js, not from the spec', () => {
    expect(routes.length).toBeGreaterThan(150);
    expect(routes).toContainEqual({ method: 'post', path: '/api/optimizer/hashtags' });
  });

  it('answers every unauthenticated, bodyless request without a 5xx, and refuses it unless the route is listed as public', async () => {
    const crashed = [];
    const unlistedPublic = [];
    const answered = new Set();

    const probe = async ({ method, path: routePath }) => {
      const label = `${method.toUpperCase()} ${routePath}`;
      let res;
      try {
        res = await request(app)[method](sampleUrl(routePath)).timeout(4000);
      } catch (error) {
        // Still working at the deadline: dispatched to a handler that drives a
        // browser or calls X. It got past auth, so it has to be public.
        if (error.timeout) {
          if (!PUBLIC_ROUTES.has(label)) unlistedPublic.push(`${label} -> still running after 4s`);
          answered.add(label);
          return;
        }
        throw error;
      }
      answered.add(label);
      const noDatabase = /Can't reach database server|ECONNREFUSED|database unavailable/i.test(JSON.stringify(res.body ?? ''));
      if (res.status >= 500 && !noDatabase) crashed.push(`${label} -> ${res.status} ${JSON.stringify(res.body)}`);
      if (![401, 403].includes(res.status) && !PUBLIC_ROUTES.has(label)) {
        unlistedPublic.push(`${label} -> ${res.status} ${JSON.stringify(res.body).slice(0, 120)}`);
      }
    };

    const queue = [...routes];
    await Promise.all(Array.from({ length: 8 }, async () => {
      for (let next = queue.pop(); next; next = queue.pop()) await probe(next);
    }));

    expect(crashed.sort(), `routes that crash on an empty unauthenticated request:\n${crashed.join('\n')}`).toEqual([]);
    expect(unlistedPublic.sort(), `routes that answer without credentials but are not in PUBLIC_ROUTES:\n${unlistedPublic.join('\n')}`).toEqual([]);

    // Keep the allowlist honest: every entry must still be a mounted route.
    const stale = [...PUBLIC_ROUTES].filter((r) => !r.startsWith('GET /api/ai') && !answered.has(r));
    expect(stale, `PUBLIC_ROUTES entries that are no longer mounted:\n${stale.join('\n')}`).toEqual([]);
  }, 180000);
});

describe('/api/optimizer', () => {
  it.each(['optimize', 'hashtags', 'predict', 'variations'])('POST /api/optimizer/%s needs a signed-in user', async (name) => {
    const res = await request(app).post(`/api/optimizer/${name}`).send({ text: 'hello world' });
    expect(res.status).toBe(401);
  });
});

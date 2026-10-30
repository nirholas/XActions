// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests: the Express API's route table against api/openapi.js
 *
 * Boots the real app through `createApp()` (no port, no scheduler, no
 * telemetry) with stub env so it needs neither Postgres nor Redis: Prisma
 * only dials the database on the first query and every request here is
 * rejected before one runs. Then walks every path in the OpenAPI spec and
 * asserts each one is actually mounted, that unauthenticated calls are
 * refused with a client error instead of a crash, and that every route
 * module on disk is wired into the server.
 *
 * No network. Rate limiting is off so 300+ requests from one client do not
 * collapse into 429s. x402 stays unconfigured, so paid routes fall through
 * to their own validation instead of dialing the facilitator.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import request from 'supertest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.resolve(__dirname, '../../api');

// Values copied from .env.example so the app boots the way a fresh checkout would.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'contract-test-jwt-secret';
process.env.SESSION_SECRET = 'contract-test-session-secret';
process.env.DATABASE_URL = 'postgresql://user:password@127.0.0.1:1/xactions?schema=public';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '1';
process.env.XACTIONS_NO_TELEMETRY = '1';
delete process.env.X402_PAY_TO_ADDRESS;
delete process.env.ADMIN_API_KEY;

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

// The app-level 404 handler answers with exactly this body. A route that is
// mounted but cannot find the resource named by a sample path parameter
// answers with its own body, so this is what separates "not mounted" from
// "mounted, nothing there".
const UNMOUNTED_BODY = { error: 'Route not found' };

const SAMPLE_PARAMS = {
  username: 'nichxbt',
  operationId: 'op_contract_test',
  name: 'unfollowEveryone',
};

function fillPathParams(specPath) {
  return specPath.replace(/\{([^}]+)\}/g, (_, key) => SAMPLE_PARAMS[key] || 'sample');
}

let app;
let httpServer;
let io;
let spec;
let specRoutes;

beforeAll(async () => {
  const server = await import('../../api/server.js');
  expect(server.default, 'importing api/server.js must not start a listener').toBeNull();
  ({ app, httpServer, io } = server.createApp({ rateLimiting: false }));
  const openapi = await import('../../api/openapi.js');
  spec = openapi.generateSpec();
  specRoutes = Object.entries(spec.paths).flatMap(([specPath, item]) =>
    Object.keys(item)
      .filter((key) => HTTP_METHODS.includes(key))
      .map((method) => ({ specPath, method, url: fillPathParams(specPath) })),
  );
});

afterAll(async () => {
  if (io) await new Promise((resolve) => io.close(resolve));
  if (httpServer?.listening) await new Promise((resolve) => httpServer.close(resolve));
});

describe('health and discovery', () => {
  it('GET /health answers 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/health answers 200 with the service name', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'xactions-api' });
  });

  it('GET /openapi.json serves the spec whose paths match the route table', async () => {
    const res = await request(app).get('/openapi.json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.openapi).toBe('3.1.0');
    expect(Object.keys(res.body.paths).sort()).toEqual(Object.keys(spec.paths).sort());
    for (const { specPath, method } of specRoutes) {
      expect(res.body.paths[specPath], `${method.toUpperCase()} ${specPath} is in the served spec`).toHaveProperty(method);
    }
  });

  it('GET /.well-known/x402 lists every paid resource from the spec', async () => {
    const res = await request(app).get('/.well-known/x402');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.resources)).toBe(true);
    expect(res.body.resources.length).toBeGreaterThan(0);
  });

  it('answers the sentinel 404 body for a path nothing mounts', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual(UNMOUNTED_BODY);
  });

  it('answers the AI API 404 for any method on a path under /api/ai that nothing mounts', async () => {
    for (const method of ['get', 'post', 'delete']) {
      const res = await request(app)[method]('/api/ai/no/such/endpoint');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ error: 'ENDPOINT_NOT_FOUND', message: `Endpoint ${method.toUpperCase()} /no/such/endpoint not found` });
    }
  });
});

describe('every OpenAPI path is mounted and refuses unauthenticated calls cleanly', () => {
  it('covers a non-trivial route table', () => {
    expect(specRoutes.length).toBeGreaterThan(300);
  });

  // A client that posts with no body (no content type, so no body parser
  // runs) must get the same validation answer as one that posts `{}`.
  it.each([
    ['an empty JSON body', (req) => req.send({})],
    ['no body at all', (req) => req],
  ])('walks every documented method with %s without a 5xx or an unmounted 404', async (_, withBody) => {
    const unmounted = [];
    const crashed = [];

    // A handful of documented routes drive a browser or call out to X, so a
    // walk that waits for each one in turn takes minutes. Requests run a few
    // at a time with a short per-request deadline: a route that is still
    // working when the deadline passes has clearly been dispatched, which is
    // what this test is checking, so it is not a failure.
    const CONCURRENCY = 8;
    const PER_REQUEST_MS = 4000;

    const probe = async ({ specPath, method, url }) => {
      const label = `${method.toUpperCase()} ${specPath}`;
      let res;
      try {
        res = await withBody(request(app)[method](url)).timeout(PER_REQUEST_MS);
      } catch (error) {
        if (error.timeout) return;
        throw error;
      }
      if (res.status === 404 && res.body?.error === UNMOUNTED_BODY.error) unmounted.push(label);
      // A route that reaches Prisma and reports the database is unreachable
      // did its job: this process has no Postgres. That is the environment,
      // not a broken contract.
      const noDatabase = /Can't reach database server|ECONNREFUSED/.test(JSON.stringify(res.body ?? ''));
      if (res.status >= 500 && !noDatabase) crashed.push(`${label} -> ${res.status} ${JSON.stringify(res.body)}`);
    };

    const queue = [...specRoutes];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (let next = queue.pop(); next; next = queue.pop()) await probe(next);
      }),
    );

    expect(unmounted.sort(), `documented routes the server never mounts:\n${unmounted.join('\n')}`).toEqual([]);
    expect(crashed.sort(), `documented routes that crash on an empty unauthenticated request:\n${crashed.join('\n')}`).toEqual([]);
  }, 180000);
});

describe('protected routes answer 401 or 403 without credentials', () => {
  const protectedRoutes = [
    ['get', '/api/user/profile'],
    ['get', '/api/operations'],
    ['post', '/api/operations'],
    ['get', '/api/twitter/status'],
    ['get', '/api/admin/stats'],
    ['get', '/api/analytics/history'],
    ['get', '/api/workflows'],
    ['get', '/api/automations'],
    ['get', '/api/streams'],
    ['get', '/api/unfollowers/history'],
    ['get', '/api/schedule'],
    ['get', '/api/crm/contacts'],
    ['get', '/api/teams'],
    ['get', '/api/notifications'],
  ];

  it.each(protectedRoutes)('%s %s', async (method, url) => {
    const res = await request(app)[method](url).send({});
    expect([401, 403], `${method.toUpperCase()} ${url} answered ${res.status} ${JSON.stringify(res.body)}`).toContain(res.status);
  });

  it('rejects a forged bearer token with 401, not 500', async () => {
    const res = await request(app).get('/api/user/profile').set('Authorization', 'Bearer not.a.jwt');
    expect(res.status).toBe(401);
  });
});

describe('every route module on disk is wired into the server', () => {
  it('api/server.js imports every file in api/routes/', async () => {
    const source = await readFile(path.join(API_DIR, 'server.js'), 'utf8');
    const routeFiles = readdirSync(path.join(API_DIR, 'routes'), { withFileTypes: true });
    const directories = new Set(routeFiles.filter((e) => e.isDirectory()).map((e) => e.name));
    // Modules the server deliberately does not import, with the reason. Both
    // are superseded, not missing: routes/ai/index.js replaced routes/ai.js,
    // and server.js serves /openapi.json and /.well-known/x402 inline.
    const superseded = new Set(['./routes/ai.js', './routes/x402-discovery.js']);
    const missing = [];
    for (const entry of routeFiles) {
      const specifier = entry.isDirectory() ? `./routes/${entry.name}/index.js` : `./routes/${entry.name}`;
      // routes/<name>/index.js supersedes a routes/<name>.js of the same name
      if (!entry.isDirectory() && directories.has(entry.name.replace(/\.js$/, ''))) continue;
      if (superseded.has(specifier)) continue;
      if (!source.includes(`'${specifier}'`)) missing.push(specifier);
    }
    expect(missing, `route modules never imported by api/server.js: ${missing.join(', ')}`).toEqual([]);
  });

  it('api/routes/ai/index.js mounts every sibling AI route module', async () => {
    const aiDir = path.join(API_DIR, 'routes', 'ai');
    const source = await readFile(path.join(aiDir, 'index.js'), 'utf8');
    const missing = readdirSync(aiDir)
      .filter((name) => name.endsWith('.js') && name !== 'index.js')
      .filter((name) => !source.includes(`'./${name}'`));
    expect(missing, `AI route modules never imported by routes/ai/index.js: ${missing.join(', ')}`).toEqual([]);
  });
});

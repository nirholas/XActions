// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Authorization regressions for the API server: token types, OAuth state
 * binding, per-user ownership, operator-only routes and outbound URL checks.
 *
 * Each block reproduces a vulnerability found in the real app and asserts it
 * stays closed. The app is booted through createApp() as in security.test.js.
 * These cases need signed-in users, so Prisma is replaced by an in-memory
 * table store (the same approach stripe-billing.test.js takes); no Postgres or
 * Redis is needed.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import express from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import request from 'supertest';
import { db } from '../fixtures/memoryPrisma.js';

const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-authz-'));
process.env.HOME = HOME;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'authz-test-jwt-secret';
process.env.SESSION_SECRET = 'authz-test-session-secret';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '1';
process.env.XACTIONS_NO_TELEMETRY = '1';
process.env.XACTIONS_QUEUE_TIMEOUT_MS = '500';
delete process.env.DATABASE_URL; // workflows use the file store under HOME
delete process.env.XACTIONS_LICENSE_KEY;

// Prisma is the in-memory table store in tests/fixtures/memoryPrisma.js.
vi.mock('@prisma/client', () => import('../fixtures/memoryPrisma.js'));

// Monitors poll X through a browser on creation; there is none here.
vi.mock('../../src/scrapers/index.js', async (importOriginal) => ({
  ...(await importOriginal()),
  createBrowser: async () => {
    throw new Error('no browser in tests');
  },
}));

// ── Fixtures ────────────────────────────────────────────────────────────────
const alice = { id: 'user_alice', username: 'alice', email: 'alice@example.com', isAdmin: false };
const bob = { id: 'user_bob', username: 'bob', email: 'bob@example.com', isAdmin: false };
const admin = { id: 'user_admin', username: 'root', email: 'root@example.com', isAdmin: true };

const SECRET = process.env.JWT_SECRET;
const sessionFor = (user) => jwt.sign({ userId: user.id, username: user.username, typ: 'session' }, SECRET, { expiresIn: '1h' });
const bearer = (user) => ({ Authorization: `Bearer ${sessionFor(user)}` });

/** The value a Set-Cookie header gives a cookie, or null. */
function cookieFrom(res, name) {
  for (const line of [res.headers['set-cookie'] || []].flat()) {
    const [pair] = line.split(';');
    if (pair.startsWith(`${name}=`)) return { value: decodeURIComponent(pair.slice(name.length + 1)), line };
  }
  return null;
}

let app;
let io;

beforeAll(async () => {
  db.table('user').push({ ...alice }, { ...bob }, { ...admin });
  const server = await import('../../api/server.js');
  ({ app, io } = server.createApp({ rateLimiting: false }));
});

afterAll(async () => {
  const { stopAll } = await import('../../src/analytics/reputation.js');
  stopAll();
  io?.close();
  fs.rmSync(HOME, { recursive: true, force: true });
});

// ── 2. Token types ──────────────────────────────────────────────────────────
describe('only a session token is a session', () => {
  it('an OAuth state value signed with the same secret is refused as a bearer token and on refresh', async () => {
    // The shape /api/twitter/connect used to sign and hand back.
    const oldState = jwt.sign({ codeVerifier: 'v', flow: 'connect', userId: alice.id }, SECRET, { expiresIn: '10m' });
    expect((await request(app).get('/api/user/me').set('Authorization', `Bearer ${oldState}`)).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').send({ token: oldState })).status).toBe(401);

    // And the state /api/twitter/connect signs now.
    const connect = await request(app).get('/api/twitter/connect').set(bearer(alice));
    expect(connect.status).toBe(200);
    const { state } = connect.body;
    expect(jwt.decode(state).typ).toBe('oauth_state');
    expect((await request(app).get('/api/user/me').set('Authorization', `Bearer ${state}`)).status).toBe(401);
    expect((await request(app).post('/api/auth/refresh').send({ token: state })).status).toBe(401);
  });

  it('session tokens work, and untyped tokens from before the change still do until they expire', async () => {
    expect((await request(app).get('/api/user/me').set(bearer(alice))).body.username).toBe('alice');
    const legacy = jwt.sign({ userId: alice.id, username: 'alice' }, SECRET, { expiresIn: '1h' });
    expect((await request(app).get('/api/user/me').set('Authorization', `Bearer ${legacy}`)).status).toBe(200);

    const refreshed = await request(app).post('/api/auth/refresh').send({ token: legacy });
    expect(refreshed.status).toBe(200);
    expect(jwt.decode(refreshed.body.token)).toMatchObject({ userId: alice.id, typ: 'session' });
  });
});

// ── 3. OAuth state bound to the browser ─────────────────────────────────────
describe('Sign in with X is bound to the browser that started it', () => {
  const nonce = crypto.randomBytes(16).toString('hex');

  it('refuses a login without the page nonce', async () => {
    for (const url of ['/api/twitter/login', '/api/twitter/login?nonce=short', '/api/twitter/login?nonce=has%20space%20in%20it%20xx']) {
      const res = await request(app).get(url);
      expect(res.status, url).toBe(302);
      expect(res.headers.location, url).toMatch(/\/login\?error=invalid_state$/);
    }
  });

  it('keeps the PKCE verifier out of the URL, in an httpOnly SameSite=Lax cookie', async () => {
    const res = await request(app).get(`/api/twitter/login?nonce=${nonce}`);
    expect(res.status).toBe(302);
    const authorize = new URL(res.headers.location);
    const cookie = cookieFrom(res, 'xactions_oauth');
    expect(cookie.line).toMatch(/HttpOnly/i);
    expect(cookie.line).toMatch(/SameSite=Lax/i);
    expect(cookie.line).toMatch(/Path=\/api\/twitter\/callback/);
    const state = authorize.searchParams.get('state');
    expect(state).not.toContain(cookie.value);
    expect(JSON.stringify(jwt.decode(state))).not.toContain(cookie.value);
    expect(authorize.searchParams.get('code_challenge')).toBe(crypto.createHash('sha256').update(cookie.value).digest('base64url'));
  });

  it('a callback URL opened in another browser (no cookie, or another flow\'s cookie) is refused', async () => {
    const started = await request(app).get(`/api/twitter/login?nonce=${nonce}`);
    const state = new URL(started.headers.location).searchParams.get('state');
    const other = cookieFrom(await request(app).get(`/api/twitter/login?nonce=${nonce}`), 'xactions_oauth').value;

    const post = vi.spyOn(axios, 'post');
    try {
      for (const cookie of [undefined, `xactions_oauth=${other}`]) {
        const req = request(app).get(`/api/twitter/callback?code=abc&state=${encodeURIComponent(state)}`);
        const res = await (cookie ? req.set('Cookie', cookie) : req);
        expect(res.headers.location).toMatch(/\/login\?error=invalid_state$/);
      }
      expect(post).not.toHaveBeenCalled();
    } finally {
      post.mockRestore();
    }
  });

  it('the success redirect carries the token and the nonce the login page sent', async () => {
    const started = await request(app).get(`/api/twitter/login?nonce=${nonce}`);
    const state = new URL(started.headers.location).searchParams.get('state');
    const verifier = cookieFrom(started, 'xactions_oauth').value;

    // X's token and users/me endpoints, answered locally.
    const post = vi.spyOn(axios, 'post').mockResolvedValueOnce({ data: { access_token: 'at', refresh_token: 'rt', expires_in: 7200 } });
    const get = vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: { data: { id: 'tw_123', username: 'xperson' } } });
    try {
      const res = await request(app)
        .get(`/api/twitter/callback?code=abc&state=${encodeURIComponent(state)}`)
        .set('Cookie', `xactions_oauth=${verifier}`);
      expect(res.status).toBe(302);
      const location = new URL(res.headers.location);
      expect(location.pathname).toBe('/login');
      expect(location.searchParams.get('oauth')).toBe('success');
      const fragment = new URLSearchParams(location.hash.slice(1));
      expect(fragment.get('nonce')).toBe(nonce);
      expect(jwt.decode(fragment.get('token')).typ).toBe('session');
      // The verifier went to X from the cookie, and the cookie is cleared.
      expect(String(post.mock.calls[0][1])).toContain(`code_verifier=${verifier}`);
      expect(cookieFrom(res, 'xactions_oauth').line).toMatch(/Expires=Thu, 01 Jan 1970/);
    } finally {
      post.mockRestore();
      get.mockRestore();
    }
  });
});

// ── Operator-only routes (1, 5, 14) ─────────────────────────────────────────
describe('operator-only routes', () => {
  it('graph ids cannot leave the graphs directory, and graphs are the operator\'s', async () => {
    const config = path.join(HOME, '.xactions', 'config.json');
    fs.mkdirSync(path.dirname(config), { recursive: true });
    fs.writeFileSync(config, '{"keep":true}');

    expect((await request(app).get('/api/graph').set(bearer(alice))).status).toBe(403);
    expect((await request(app).delete('/api/graph/..%2Fconfig').set(bearer(alice))).status).toBe(403);
    for (const id of ['..%2Fconfig', '..%2F..%2Fetc%2Fpasswd', 'a.b', '%2E%2E']) {
      expect((await request(app).delete(`/api/graph/${id}`).set(bearer(admin))).status, id).toBe(400);
      expect((await request(app).get(`/api/graph/${id}/analysis`).set(bearer(admin))).status, id).toBe(400);
    }
    expect(fs.readFileSync(config, 'utf8')).toBe('{"keep":true}');
  });

  it('portability (arbitrary dirA/dirB/exportDir paths, shared exports) is the operator\'s', async () => {
    expect((await request(app).post('/api/portability/diff').set(bearer(alice)).send({ dirA: '/etc', dirB: '/root' })).status).toBe(403);
    expect((await request(app).get('/api/portability/exports').set(bearer(alice))).status).toBe(403);
    expect((await request(app).post('/api/portability/migrate').set(bearer(alice)).send({ username: 'x', platform: 'bluesky', exportDir: '/' })).status).toBe(403);
  });

  it('the operator\'s stored X sessions are not listed to other users', async () => {
    expect((await request(app).get('/api/twitter/status').set(bearer(alice))).status).toBe(403);
  });
});

// ── 4. Outbound URLs ────────────────────────────────────────────────────────
describe('webhook URLs cannot reach the server\'s own network', () => {
  it('refuses IPv6 spellings that carry a private IPv4 address', async () => {
    const { assertPublicUrl, isPrivateAddress } = await import('../../api/utils/publicUrl.js');
    for (const host of ['[::7f00:1]', '[::127.0.0.1]', '[::ffff:0:7f00:1]', '[::ffff:7f00:1]', '[64:ff9b::7f00:1]', '[64:ff9b::a9fe:a9fe]', '[2002:a9fe:a9fe::]', '[64:ff9b:1::1]', '[2001::1]']) {
      await expect(assertPublicUrl(`http://${host}/x`, 'webhookUrl'), host).rejects.toThrow(/private or local/);
    }
    for (const address of ['2606:4700:4700::1111', '64:ff9b::5db8:d822', '::ffff:5db8:d822', '93.184.216.34']) {
      expect(isPrivateAddress(address), address).toBe(false);
    }
  });

  it('a monitor or unfollower schedule with a private webhook is refused when saved', async () => {
    const monitor = await request(app).post('/api/analytics/monitor').set(bearer(alice))
      .send({ target: '@someone', alertConfig: { webhookUrl: 'http://[::ffff:7f00:1]:8080/hook' } });
    expect(monitor.status).toBe(400);

    const schedule = await request(app).post('/api/unfollowers/schedule').set(bearer(alice))
      .send({ interval: 'daily', webhookUrl: 'http://169.254.169.254/latest/meta-data/' });
    expect(schedule.status).toBe(400);
  });

  it('a stored private webhook is checked again before delivery, and scan events go to the owner only', async () => {
    let hits = 0;
    const listener = createServer((req, res) => {
      hits++;
      res.end('ok');
    });
    await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
    db.table('unfollowerSchedule').push({ userId: alice.id, webhookUrl: `http://127.0.0.1:${listener.address().port}/hook` });

    const rooms = [];
    const fakeIo = {
      emit: () => {
        throw new Error('broadcast to every socket');
      },
      to: (room) => ({ emit: (event) => rooms.push([room, event]) }),
    };
    try {
      const { checkAndAlert } = await import('../../api/services/unfollowerAlerts.js');
      const lost = Array.from({ length: 12 }, (_, i) => ({ username: `gone${i}` }));
      const alerts = await checkAndAlert(fakeIo, alice.id, { gained: [], lost, totalFollowers: 100, scanDate: new Date(), isFirstScan: false });
      expect(alerts.map((a) => a.type)).toContain('mass_unfollow');
      expect(rooms).toEqual([[`user:${alice.id}`, `unfollower:alerts:${alice.id}`], [`user:${alice.id}`, 'unfollower:scan-complete']]);
      expect(hits).toBe(0);
    } finally {
      listener.close();
    }
  });
});

// ── 6, 12. Socket rooms and pairing ids ─────────────────────────────────────
describe('sockets', () => {
  it('a signed-in socket joins its own user room and gets an unguessable pairing id', async () => {
    const joined = [];
    const emitted = [];
    const socket = {
      id: 'sock1',
      role: 'dashboard',
      user: alice,
      handshake: { auth: {} },
      join: (room) => joined.push(room),
      emit: (event, data) => emitted.push([event, data]),
      on: () => {},
    };
    io.of('/').listeners('connection')[0](socket);
    expect(joined).toContain(`user:${alice.id}`);
    const created = emitted.find(([event]) => event === 'session:created')[1];
    expect(created.sessionId).toMatch(/^session_[0-9a-f]{32}$/);
    expect(created.sessionId).not.toContain(alice.id);
    // The script it hands out navigates x.com without reloading the page.
    expect(() => new Function(created.agentScript)).not.toThrow();
    expect(created.agentScript).not.toContain('window.location.href =');
  });
});

// ── 7. Monitor ownership ────────────────────────────────────────────────────
describe('reputation monitors belong to whoever created them', () => {
  it('another user cannot list, read, report on or delete them', async () => {
    const created = await request(app).post('/api/analytics/monitor').set(bearer(alice)).send({ target: '@alicewatch' });
    expect(created.status).toBe(201);
    const { id } = created.body;

    expect((await request(app).get('/api/analytics/monitor').set(bearer(bob))).body.count).toBe(0);
    expect((await request(app).get(`/api/analytics/monitor/${id}`).set(bearer(bob))).status).toBe(404);
    expect((await request(app).get('/api/analytics/reports/alicewatch').set(bearer(bob))).status).toBe(404);
    expect((await request(app).delete(`/api/analytics/monitor/${id}`).set(bearer(bob))).status).toBe(404);

    expect((await request(app).get('/api/analytics/monitor').set(bearer(alice))).body.monitors.map((m) => m.id)).toEqual([id]);
    expect((await request(app).get('/api/analytics/monitor').set(bearer(admin))).body.count).toBeGreaterThanOrEqual(1);
    expect((await request(app).delete(`/api/analytics/monitor/${id}`).set(bearer(alice))).status).toBe(200);
  });
});

// ── 8. Username changes ─────────────────────────────────────────────────────
describe('PATCH /api/user/profile', () => {
  it('refuses a username that is someone\'s email, malformed, or still holds team roles', async () => {
    for (const username of ['bob@example.com', 'a', 'has space', 'x'.repeat(31), { $ne: null }]) {
      const res = await request(app).patch('/api/user/profile').set(bearer(alice)).send({ username });
      expect(res.status, JSON.stringify(username)).toBe(400);
    }
    expect((await request(app).patch('/api/user/profile').set(bearer(alice)).send({ username: 'bob' })).status).toBe(400);

    const { createTeam } = await import('../../src/auth/teamManager.js');
    await createTeam('Ops', 'formername');
    expect((await request(app).patch('/api/user/profile').set(bearer(alice)).send({ username: 'formername' })).status).toBe(400);

    const ok = await request(app).patch('/api/user/profile').set(bearer(alice)).send({ username: 'alice_2' });
    expect(ok.status).toBe(200);
    expect(ok.body.username).toBe('alice_2');
  });
});

// ── 10. Branding ────────────────────────────────────────────────────────────
describe('branding middleware', () => {
  it('injects only into HTML and keeps res.send synchronous', async () => {
    const { brandingMiddleware } = await import('../../api/services/licensing.js');
    const mini = express();
    mini.use(brandingMiddleware());
    let returned;
    mini.get('/html', (req, res) => {
      returned = res.send('<html><body>hi</body></html>');
      expect(returned).toBe(res);
    });
    mini.get('/json', (req, res) => res.json({ note: '</body>' }));
    mini.get('/text', (req, res) => res.type('text/plain').send('a</body>'));

    expect((await request(mini).get('/html')).text).toContain('xactions-branding');
    const json = await request(mini).get('/json');
    expect(json.body).toEqual({ note: '</body>' });
    expect((await request(mini).get('/text')).text).toBe('a</body>');
  });
});

// ── 11. Anonymous AI status and cancel ──────────────────────────────────────
describe('AI status and cancel endpoints resolve only AI job ids', () => {
  it('a dashboard operation id is not found, and no Operation row is read or changed', async () => {
    db.table('operation').push({ id: 'cmop0dashboard0row000001', userId: bob.id, type: 'unfollowEveryone', status: 'processing', config: '{}' });
    const before = db.calls.length;
    const status = await request(app).get('/api/ai/action/status/cmop0dashboard0row000001');
    const cancel = await request(app).post('/api/ai/action/cancel/cmop0dashboard0row000001').set('X-Session-Cookie', 'any-session');
    expect(status.status).toBe(404);
    expect(cancel.status).toBe(404);
    expect(db.calls.slice(before).filter(([model]) => model === 'operation')).toEqual([]);
    expect(db.table('operation')[0].status).toBe('processing');
  });
});

// ── 13. Workflow webhooks ───────────────────────────────────────────────────
describe('workflow webhook triggers', () => {
  it('take no session but need the workflow\'s own secret, and ids are chosen by the server', async () => {
    const created = await request(app).post('/api/workflows').set(bearer(alice)).send({
      name: 'on-hook',
      trigger: { type: 'webhook', webhookId: 'wh-chosen-by-caller', secret: 'weak' },
      steps: [{ action: 'scrapeProfile', params: { username: 'nobody' } }],
    });
    expect(created.status).toBe(201);
    const { webhookId, secret } = created.body.trigger;
    expect(webhookId).toMatch(/^wh-[0-9a-f]{32}$/);
    expect(secret).toMatch(/^[0-9a-f]{64}$/);

    const hook = `/api/workflows/webhook/${webhookId}`;
    expect((await request(app).post(hook).send({})).status).toBe(401);
    expect((await request(app).post(hook).set('X-Webhook-Secret', 'weak').send({})).status).toBe(401);
    expect((await request(app).post(hook).set(bearer(bob)).send({})).status).toBe(401);
    expect((await request(app).post('/api/workflows/webhook/wh-chosen-by-caller').set('X-Webhook-Secret', secret).send({})).status).toBe(401);
    expect((await request(app).post(hook).set('X-Webhook-Secret', secret).send({ hello: 1 })).status).toBe(200);
  });
});

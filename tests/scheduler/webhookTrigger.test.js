// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests — scheduler job execution (CLI resolution, retry on non-zero exit)
 * and the webhook trigger's secret handling.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import { Scheduler, getScheduler, CLI_PATH } from '../../src/scheduler/scheduler.js';
import { mountWebhookRoutes, secretsMatch } from '../../src/scheduler/webhookTrigger.js';

afterEach(() => vi.restoreAllMocks());

describe('job execution', () => {
  it('runs the CLI that ships with this module, not one from the working directory', () => {
    expect(path.isAbsolute(CLI_PATH)).toBe(true);
    expect(CLI_PATH.endsWith(path.join('src', 'cli', 'index.js'))).toBe(true);
    expect(fs.existsSync(CLI_PATH)).toBe(true);
    expect(CLI_PATH.startsWith(process.cwd() + path.sep + 'bin')).toBe(false);
  });

  it('rejects when the command exits non-zero', async () => {
    const scheduler = new Scheduler();
    await expect(scheduler._runCommand('definitely-not-a-command-xyz', [], 60000))
      .rejects.toMatchObject({ exitCode: expect.any(Number) });
  }, 60000);

  it('retries a failing command and records the final failure', async () => {
    const scheduler = new Scheduler();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(fsp, 'writeFile').mockResolvedValue();
    vi.spyOn(scheduler, '_retryDelay').mockReturnValue(0);
    let attempts = 0;
    vi.spyOn(scheduler, '_runCommand').mockImplementation(async () => {
      attempts++;
      throw Object.assign(new Error('exited with code 3'), { exitCode: 3, stdout: 'out', stderr: 'boom' });
    });
    const job = { config: { name: 'flaky', command: 'x', args: [], maxRetries: 2, timeout: 1000 } };
    const result = await scheduler._executeJob(job);
    expect(attempts).toBe(3);
    expect(result.status).toBe('failed');
    expect(result.exitCode).toBe(3);
    expect(job.lastStatus).toBe('failed');
  });

  it('succeeds on a retry after a non-zero exit', async () => {
    const scheduler = new Scheduler();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(fsp, 'writeFile').mockResolvedValue();
    vi.spyOn(scheduler, '_retryDelay').mockReturnValue(0);
    let attempts = 0;
    vi.spyOn(scheduler, '_runCommand').mockImplementation(async () => {
      attempts++;
      if (attempts === 1) throw Object.assign(new Error('exited with code 1'), { exitCode: 1 });
      return { exitCode: 0, stdout: 'ok', stderr: '', error: false };
    });
    const result = await scheduler._executeJob({ config: { name: 'once', command: 'x', args: [], maxRetries: 2, timeout: 1000 } });
    expect(attempts).toBe(2);
    expect(result.status).toBe('success');
  });
});

describe('scheduler storage', () => {
  it('keeps jobs and history under XACTIONS_HOME, resolved at call time', async () => {
    const os = await import('node:os');
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-sched-home-'));
    const saved = process.env.XACTIONS_HOME;
    process.env.XACTIONS_HOME = home;
    try {
      vi.spyOn(console, 'log').mockImplementation(() => {});
      const scheduler = new Scheduler();
      expect(fs.existsSync(path.join(home, 'scheduler-history'))).toBe(true);
      scheduler.addJob({ name: 'home-test', cron: '0 0 1 1 *', command: 'echo', webhookSecret: 'persisted-secret-value' });
      const stored = JSON.parse(fs.readFileSync(path.join(home, 'scheduler.json'), 'utf8'));
      expect(stored.jobs[0]).toMatchObject({ name: 'home-test', webhookSecret: 'persisted-secret-value' });
      scheduler.jobs.get('home-test').cronTask?.stop();
    } finally {
      if (saved === undefined) delete process.env.XACTIONS_HOME; else process.env.XACTIONS_HOME = saved;
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});

describe('webhook trigger', () => {
  const SECRET = 'a-long-enough-webhook-secret';
  let server, base, scheduler, ran;

  beforeAll(async () => {
    scheduler = getScheduler();
    vi.spyOn(scheduler, '_save').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    ran = [];
    scheduler.runJobNow = async (name) => { ran.push(name); return { status: 'success' }; };
    scheduler.addJob({ name: 'wh-open', cron: '0 0 1 1 *', command: 'echo' });
    scheduler.addJob({ name: 'wh-locked', cron: '0 0 1 1 *', command: 'echo', webhookSecret: SECRET });
    const app = express();
    app.use(express.json());
    mountWebhookRoutes(app);
    server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(() => {
    for (const name of ['wh-open', 'wh-locked']) {
      scheduler.jobs.get(name)?.cronTask?.stop();
      scheduler.jobs.delete(name);
    }
    delete scheduler.runJobNow;
    server.close();
  });

  it('persists the secret with the job', () => {
    expect(scheduler.jobs.get('wh-locked').config.webhookSecret).toBe(SECRET);
    expect(() => scheduler.addJob({ name: 'wh-short', cron: '0 0 1 1 *', command: 'echo', webhookSecret: 'short' })).toThrow(/16 characters/);
  });

  it('refuses to trigger a job that has no secret', async () => {
    const res = await fetch(`${base}/api/webhooks/trigger/wh-open`, { method: 'POST' });
    expect(res.status).toBe(403);
    expect(ran).not.toContain('wh-open');
  });

  it('refuses a wrong or missing secret', async () => {
    for (const headers of [{}, { 'X-Webhook-Secret': 'wrong-secret-of-some-length' }]) {
      const res = await fetch(`${base}/api/webhooks/trigger/wh-locked`, { method: 'POST', headers });
      expect(res.status).toBe(403);
    }
    expect(ran).toEqual([]);
  });

  it('triggers with the secret in a header, a bearer token, or the legacy query parameter', async () => {
    const tries = [
      fetch(`${base}/api/webhooks/trigger/wh-locked`, { method: 'POST', headers: { 'X-Webhook-Secret': SECRET } }),
      fetch(`${base}/api/webhooks/trigger/wh-locked`, { method: 'POST', headers: { Authorization: `Bearer ${SECRET}` } }),
      fetch(`${base}/api/webhooks/trigger/wh-locked?secret=${encodeURIComponent(SECRET)}`, { method: 'POST' }),
    ];
    for (const res of await Promise.all(tries)) expect(res.status).toBe(200);
    expect(ran).toEqual(['wh-locked', 'wh-locked', 'wh-locked']);
  });

  it('compares secrets without short-circuiting on length', () => {
    expect(secretsMatch(SECRET, SECRET)).toBe(true);
    expect(secretsMatch('x', SECRET)).toBe(false);
    expect(secretsMatch('', '')).toBe(false);
    expect(secretsMatch(undefined, SECRET)).toBe(false);
  });

  it('generates a secret on request', () => {
    const { webhookSecret } = scheduler.setWebhookSecret('wh-open');
    expect(webhookSecret.length).toBeGreaterThanOrEqual(16);
    scheduler.jobs.get('wh-open').config.webhookSecret = undefined;
  });
});

describe('webhook listing and ingest', () => {
  const INGEST = 'an-ingest-secret-long-enough';
  const servers = [];

  async function serve(options) {
    const app = express();
    app.use(express.json());
    mountWebhookRoutes(app, options);
    const server = await new Promise((r) => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
    servers.push(server);
    return `http://127.0.0.1:${server.address().port}`;
  }

  afterAll(() => servers.forEach((s) => s.close()));

  const ingest = (base, headers = {}) => fetch(`${base}/api/webhooks/ingest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ source: 'zapier', event: 'new_follower', data: { username: 'x' } }),
  });

  it('no longer lists job names to anyone who asks', async () => {
    const base = await serve({ ingestSecret: INGEST });
    expect((await fetch(`${base}/api/webhooks`)).status).toBe(404);
  });

  it('refuses ingest when no secret is configured, or the secret is wrong or missing', async () => {
    const received = [];
    const scheduler = getScheduler();
    const listener = (e) => received.push(e);
    scheduler.on('webhook:received', listener);
    try {
      const saved = process.env.XACTIONS_SCHEDULER_INGEST_SECRET;
      delete process.env.XACTIONS_SCHEDULER_INGEST_SECRET;
      const open = await serve();
      if (saved !== undefined) process.env.XACTIONS_SCHEDULER_INGEST_SECRET = saved;
      expect((await ingest(open, { 'X-Webhook-Secret': INGEST })).status).toBe(403);

      const locked = await serve({ ingestSecret: INGEST });
      expect((await ingest(locked)).status).toBe(403);
      expect((await ingest(locked, { 'X-Webhook-Secret': 'wrong-secret-of-some-length' })).status).toBe(403);
      expect(received).toEqual([]);

      expect((await ingest(locked, { 'X-Webhook-Secret': INGEST })).status).toBe(200);
      expect((await ingest(locked, { Authorization: `Bearer ${INGEST}` })).status).toBe(200);
      expect(received).toHaveLength(2);
      expect(received[0]).toMatchObject({ source: 'zapier', event: 'new_follower', data: { username: 'x' } });
    } finally {
      scheduler.off('webhook:received', listener);
    }
  });

  it('refuses a short ingest secret at mount time', () => {
    expect(() => mountWebhookRoutes(express(), { ingestSecret: 'short' })).toThrow(/16 characters/);
  });
});

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Tests — src/notifications/notifier.js: channel targeting, per-channel
 * timeouts, concurrent delivery, and Telegram plain-text messages.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, afterAll, afterEach, vi } from 'vitest';
import { createServer } from 'node:http';
import { Notifier } from '../../src/notifications/notifier.js';

const servers = [];
afterAll(() => servers.forEach((s) => { s.closeAllConnections?.(); s.close(); }));
afterEach(() => vi.restoreAllMocks());

function listen(handler) {
  return new Promise((resolve) => {
    const server = createServer(handler);
    servers.push(server);
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
}

describe('Notifier', () => {
  it('sends a test only to the channel being tested', async () => {
    const hits = [];
    const base = await listen((req, res) => { hits.push(req.url); res.writeHead(200).end('ok'); });
    const notifier = new Notifier();
    notifier.config = {
      slack: { enabled: true, webhookUrl: `${base}/slack` },
      discord: { enabled: true, webhookUrl: `${base}/discord` },
    };
    const results = await notifier.test('discord');
    expect(Object.keys(results)).toEqual(['discord']);
    expect(hits).toEqual(['/discord']);
  });

  it('times out a hung channel without holding up the others', async () => {
    const base = await listen((req, res) => {
      if (req.url === '/hang') return; // never answers
      res.writeHead(200).end('ok');
    });
    const notifier = new Notifier({ timeoutMs: 300 });
    notifier.config = {
      slack: { enabled: true, webhookUrl: `${base}/hang` },
      discord: { enabled: true, webhookUrl: `${base}/fine` },
    };
    const started = Date.now();
    const results = await notifier.send({ title: 't', message: 'm' });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(results.discord).toEqual({ status: 'sent', channel: 'discord' });
    expect(results.slack.error).toMatch(/did not answer within 300 ms/);
  });

  it('sends Telegram messages as plain text so underscores cannot get them rejected', async () => {
    const bodies = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      bodies.push({ url: String(url), body: JSON.parse(init.body), signal: init.signal });
      return new Response('{"ok":true}', { status: 200 });
    });
    const notifier = new Notifier();
    notifier.config = { telegram: { enabled: true, botToken: 'TOKEN', chatId: '42' } };
    const results = await notifier.send({ title: 'New follower @some_user', message: 'snake_case_name joined' });
    expect(results.telegram.status).toBe('sent');
    expect(bodies[0].body.parse_mode).toBeUndefined();
    expect(bodies[0].body.text).toContain('@some_user');
    expect(bodies[0].body.text).toContain('snake_case_name joined');
    expect(bodies[0].signal).toBeInstanceOf(AbortSignal);
  });
});

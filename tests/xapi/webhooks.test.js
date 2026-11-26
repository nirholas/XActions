// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import crypto from 'node:crypto';
import http from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { SIGNATURE_HEADER, createWebhookHandler, crcResponse, verifySignature } from '../../src/xapi/index.js';

const SECRET = 'consumer-secret';
const sign = (data) => `sha256=${crypto.createHmac('sha256', SECRET).update(data).digest('base64')}`;

describe('CRC and signatures', () => {
  it('answers a CRC challenge with the HMAC-SHA256 of the token', () => {
    expect(crcResponse('challenge', SECRET)).toEqual({ response_token: sign('challenge') });
    expect(() => crcResponse('', SECRET)).toThrow();
  });

  it('accepts the right signature and rejects a wrong or missing one', () => {
    const body = '{"for_user_id":"1"}';
    expect(verifySignature(body, sign(body), SECRET)).toBe(true);
    expect(verifySignature(Buffer.from(body), sign(body), SECRET)).toBe(true);
    expect(verifySignature(`${body} `, sign(body), SECRET)).toBe(false);
    expect(verifySignature(body, undefined, SECRET)).toBe(false);
    expect(verifySignature(body, 'sha256=short', SECRET)).toBe(false);
  });
});

describe('createWebhookHandler over node:http', () => {
  let server;
  afterEach(() => new Promise((resolve) => (server ? server.close(resolve) : resolve())));

  async function start(onEvent) {
    server = http.createServer(createWebhookHandler({ consumerSecret: SECRET, onEvent }));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  }

  it('answers CRC, refuses unsigned posts and delivers signed events', async () => {
    const events = [];
    const base = await start((e) => events.push(e));

    const crc = await fetch(`${base}/webhook?crc_token=abc`);
    expect(await crc.json()).toEqual({ response_token: sign('abc') });

    const body = JSON.stringify({ tweet_create_events: [{ id_str: '1' }] });
    const unsigned = await fetch(`${base}/webhook`, { method: 'POST', body });
    expect(unsigned.status).toBe(401);
    expect(events).toHaveLength(0);

    const signed = await fetch(`${base}/webhook`, { method: 'POST', body, headers: { [SIGNATURE_HEADER]: sign(body) } });
    expect(signed.status).toBe(200);
    expect(events).toEqual([{ tweet_create_events: [{ id_str: '1' }] }]);
  });
});

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Scraper's HTTP layer: guest tokens are only for guests, a rejected guest
 * token is replaced once, and the `proxy` option actually routes traffic.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import { Scraper } from '../../src/client/index.js';
import { AuthenticationError } from '../../src/client/errors.js';

const USER_BODY = JSON.stringify({
  data: { user: { result: { __typename: 'User', rest_id: '1', legacy: { screen_name: 'someone', name: 'Someone' } } } },
});

/** Fake fetch: `plan(url, init, n)` answers each request. Records every call. */
function recordingFetch(plan) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url: String(url), headers: init.headers || {} });
    return plan(String(url), init, calls.length);
  };
  fetch.calls = calls;
  return fetch;
}

const isActivation = (url) => url.includes('guest/activate');

describe('Scraper guest tokens', () => {
  it('never activates a guest token for a logged-in session', async () => {
    const fetch = recordingFetch((url) =>
      isActivation(url) ? new Response('rate limited', { status: 429, headers: { 'retry-after': '0' } }) : new Response(USER_BODY),
    );
    const scraper = new Scraper({ cookies: 'auth_token=AAA; ct0=BBB', fetch, transactionId: false });
    const profile = await scraper.getProfile('someone');
    expect(profile.username).toBe('someone');
    expect(fetch.calls.filter((c) => isActivation(c.url))).toHaveLength(0);
    expect(fetch.calls[0].headers['x-guest-token']).toBeUndefined();
    expect(fetch.calls[0].headers['x-csrf-token']).toBe('BBB');
  });

  it('replaces a guest token X rejects and retries once', async () => {
    let activations = 0;
    let reads = 0;
    const fetch = recordingFetch((url) => {
      if (isActivation(url)) {
        activations++;
        return new Response(JSON.stringify({ guest_token: `gt${activations}` }));
      }
      reads++;
      return reads === 1 ? new Response('', { status: 403 }) : new Response(USER_BODY);
    });
    const scraper = new Scraper({ fetch, transactionId: false });
    const profile = await scraper.getProfile('someone');
    expect(profile.username).toBe('someone');
    const readCalls = fetch.calls.filter((c) => !isActivation(c.url));
    expect(readCalls.map((c) => c.headers['x-guest-token'])).toEqual(['gt1', 'gt2']);
  });

  it('gives up after one retry and drops the rejected token', async () => {
    let activations = 0;
    const fetch = recordingFetch((url) => {
      if (isActivation(url)) {
        activations++;
        return new Response(JSON.stringify({ guest_token: `gt${activations}` }));
      }
      return new Response('', { status: 429 });
    });
    const scraper = new Scraper({ fetch, transactionId: false });
    const err = await scraper.getProfile('someone').catch((e) => e);
    expect(err.httpStatus).toBe(429);
    expect(activations).toBe(2);
    expect(fetch.calls.filter((c) => !isActivation(c.url))).toHaveLength(2);
    expect(scraper._auth.guestToken).toBeNull();
  });

  it('does not retry a logged-in session on 401', async () => {
    const fetch = recordingFetch(() => new Response('', { status: 401 }));
    const scraper = new Scraper({ cookies: 'auth_token=AAA; ct0=BBB', fetch, transactionId: false });
    await expect(scraper.getProfile('someone')).rejects.toBeInstanceOf(AuthenticationError);
    expect(fetch.calls).toHaveLength(1);
  });
});

describe('Scraper proxy option', () => {
  let target;
  let proxy;
  let targetPort;
  let proxyPort;
  const proxyLog = [];
  const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
  const close = (server) => new Promise((resolve) => server.close(() => resolve()));

  beforeAll(async () => {
    target = http.createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      if (req.url.includes('guest/activate')) {
        res.end(JSON.stringify({ guest_token: 'gt-proxied' }));
        return;
      }
      res.end(JSON.stringify({ path: req.url, guest: req.headers['x-guest-token'] ?? null }));
    });
    targetPort = await listen(target);
    // Plain-http forward proxy: absolute-form requests relayed upstream.
    proxy = http.createServer((req, res) => {
      proxyLog.push(`${req.method} ${req.url}`);
      const upstream = http.request(req.url, { method: req.method, headers: req.headers }, (up) => {
        res.writeHead(up.statusCode, up.headers);
        up.pipe(res);
      });
      upstream.on('error', () => res.destroy());
      req.pipe(upstream);
    });
    proxyPort = await listen(proxy);
  });

  afterAll(async () => {
    await Promise.all([close(target), close(proxy)]);
  });

  it('routes requests through the configured proxy', async () => {
    proxyLog.length = 0;
    const scraper = new Scraper({ cookies: 'auth_token=AAA; ct0=BBB', proxy: `http://127.0.0.1:${proxyPort}`, transactionId: false });
    const data = await scraper._http.get(`http://127.0.0.1:${targetPort}/via-proxy`);
    expect(data.path).toBe('/via-proxy');
    expect(proxyLog.some((line) => line.endsWith(`127.0.0.1:${targetPort}/via-proxy`))).toBe(true);
    await scraper._http._proxyDispatcher.close();
  });

  it('sends guest-token activation through the proxy too', async () => {
    proxyLog.length = 0;
    const scraper = new Scraper({ proxy: `http://127.0.0.1:${proxyPort}`, transactionId: false });
    const res = await scraper._auth._fetchFn(`http://127.0.0.1:${targetPort}/1.1/guest/activate.json`, { method: 'POST', headers: {} });
    expect(await res.json()).toEqual({ guest_token: 'gt-proxied' });
    expect(proxyLog.some((line) => line.startsWith('POST ') && line.includes('guest/activate'))).toBe(true);
    await scraper._http._proxyDispatcher.close();
  });
});

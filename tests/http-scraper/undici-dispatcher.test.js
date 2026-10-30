// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * undici dispatcher interop tests.
 *
 * The HTTP client builds its dispatchers (the HTTP/2 Agent and the proxy
 * ProxyAgent) from the npm `undici` package. Node's built-in fetch bundles its
 * own undici, and across majors the two do not interoperate (undici 8 rejects
 * Node 24's built-in fetch with "invalid onRequestStart method"), so requests
 * go out through `fetchWithDispatcher`, which pairs the dispatcher with
 * undici's own fetch. These tests drive that path end to end against real
 * local servers: an h2 TLS server, a plain HTTP target, and a CONNECT proxy.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import http2 from 'node:http2';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { Agent, ProxyAgent } from 'undici';
import { TwitterHttpClient } from '../../src/scrapers/twitter/http/client.js';
import { fetchWithDispatcher, http2Dispatcher, isPlatformFetch, withHttp2 } from '../../src/utils/http2.js';

const listen = (server) =>
  new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => server.close(() => resolve()));

let tmpDir;
let cert;
let key;
let h2Server;
let h2Port;
let target;
let targetPort;
let proxy;
let proxyPort;
const proxyLog = [];
const proxySockets = new Set();

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xactions-undici-'));
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes',
    '-keyout', path.join(tmpDir, 'key.pem'), '-out', path.join(tmpDir, 'cert.pem'),
    '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=IP:127.0.0.1,DNS:localhost',
  ], { stdio: 'ignore' });
  key = fs.readFileSync(path.join(tmpDir, 'key.pem'));
  cert = fs.readFileSync(path.join(tmpDir, 'cert.pem'));

  h2Server = http2.createSecureServer({ key, cert, allowHTTP1: true }, (req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ httpVersion: req.httpVersion }));
  });
  h2Port = await listen(h2Server);

  target = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    res.setHeader('content-type', 'application/json');
    res.setHeader('x-rate-limit-remaining', '42');
    res.end(JSON.stringify({
      path: req.url,
      ua: req.headers['user-agent'] ?? null,
      contentType: req.headers['content-type'] ?? null,
      body,
    }));
  });
  targetPort = await listen(target);

  // A minimal forward proxy: https targets arrive as CONNECT tunnels, plain
  // http targets as absolute-form requests that are relayed upstream.
  proxy = http.createServer((req, res) => {
    proxyLog.push(`${req.method} ${req.url}`);
    const upstream = http.request(req.url, { method: req.method, headers: req.headers }, (up) => {
      res.writeHead(up.statusCode, up.headers);
      up.pipe(res);
    });
    upstream.on('error', () => res.destroy());
    req.pipe(upstream);
  });
  proxy.on('connect', (req, clientSocket, head) => {
    proxyLog.push(`CONNECT ${req.url}`);
    const [host, port] = req.url.split(':');
    const upstream = net.connect(Number(port), host, () => {
      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      upstream.write(head);
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });
    for (const s of [upstream, clientSocket]) {
      proxySockets.add(s);
      s.on('error', () => {});
      s.on('close', () => proxySockets.delete(s));
    }
  });
  proxyPort = await listen(proxy);
});

afterAll(async () => {
  for (const s of proxySockets) s.destroy();
  const shared = await http2Dispatcher();
  await shared?.close();
  await Promise.all([close(h2Server), close(target), close(proxy)]);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('undici dispatchers sent with fetchWithDispatcher', () => {
  it('negotiates HTTP/2 with an undici Agent', async () => {
    const agent = new Agent({ allowH2: true, connect: { ca: cert } });
    try {
      const res = await fetchWithDispatcher(globalThis.fetch, `https://127.0.0.1:${h2Port}/h2`, {
        dispatcher: agent,
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ httpVersion: '2.0' });
    } finally {
      await agent.close();
    }
  });

  it('sends the shared Agent with the platform fetch selected', async () => {
    expect(isPlatformFetch(globalThis.fetch)).toBe(true);
    const shared = await http2Dispatcher();
    const res = await fetchWithDispatcher(globalThis.fetch, `http://127.0.0.1:${targetPort}/paired`, {
      dispatcher: shared,
    });
    expect(await res.json()).toMatchObject({ path: '/paired' });
  });

  it('leaves a custom fetch on the caller-chosen transport', async () => {
    const custom = vi.fn(async () => new Response('{}'));
    const shared = await http2Dispatcher();
    expect(isPlatformFetch(custom)).toBe(false);
    expect((await withHttp2({}, custom)).dispatcher).toBeUndefined();
    await fetchWithDispatcher(custom, 'http://example.invalid/', { dispatcher: shared });
    expect(custom).toHaveBeenCalledWith('http://example.invalid/', { dispatcher: shared });
  });

  it('recognises the running Node release\'s built-in fetch as the platform fetch', () => {
    // If this fails on a new Node release, its fetch source changed: update
    // NODE_FETCH_SOURCE in src/utils/http2.js, or requests silently drop to h1.
    expect(isPlatformFetch(globalThis.fetch)).toBe(true);
    expect(isPlatformFetch(async function fetch(input, init) { return [input, init]; })).toBe(false);
  });

  it('calls a replaced global fetch directly, without a dispatcher', async () => {
    const stub = vi.fn(async () => new Response('{"stubbed":true}'));
    vi.stubGlobal('fetch', stub);
    try {
      expect(isPlatformFetch(globalThis.fetch)).toBe(false);
      const client = new TwitterHttpClient({ maxRetries: 0 });
      const data = await client.request('https://api.x.com/stubbed', { authenticated: false });
      expect(data).toEqual({ stubbed: true });
      expect(stub).toHaveBeenCalledTimes(1);
      expect(stub.mock.calls[0][1].dispatcher).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('withHttp2 attaches the shared Agent and the request goes through it', async () => {
    const init = await withHttp2({ method: 'GET' }, globalThis.fetch);
    const shared = await http2Dispatcher();
    expect(shared).toBeInstanceOf(Agent);
    expect(init.dispatcher).toBe(shared);

    const dispatch = vi.spyOn(shared, 'dispatch');
    try {
      const res = await fetchWithDispatcher(globalThis.fetch, `http://127.0.0.1:${targetPort}/shared`, init);
      expect(await res.json()).toMatchObject({ path: '/shared' });
      expect(dispatch).toHaveBeenCalled();
    } finally {
      dispatch.mockRestore();
    }
  });

  it('TwitterHttpClient.request goes through the shared HTTP/2 Agent', async () => {
    const shared = await http2Dispatcher();
    const dispatch = vi.spyOn(shared, 'dispatch');
    const seen = [];
    try {
      const client = new TwitterHttpClient({ maxRetries: 0, onResponse: (r) => seen.push(r) });
      const data = await client.request(`http://127.0.0.1:${targetPort}/client`, { authenticated: false });
      expect(data.path).toBe('/client');
      expect(data.ua).toBeTruthy();
      expect(dispatch).toHaveBeenCalled();
      expect(seen[0]).toMatchObject({ status: 200, remaining: 42 });
    } finally {
      dispatch.mockRestore();
    }
  });

  it('TwitterHttpClient.request sends a multipart FormData body through the Agent', async () => {
    const client = new TwitterHttpClient({ maxRetries: 0 });
    const form = new FormData();
    form.set('command', 'APPEND');
    form.set('media', new Blob([Buffer.from('chunk-bytes')], { type: 'application/octet-stream' }), 'blob');
    const data = await client.request(`http://127.0.0.1:${targetPort}/upload`, {
      method: 'POST',
      body: form,
      authenticated: false,
    });
    expect(data.path).toBe('/upload');
    expect(data.contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(data.body).toContain('name="command"');
    expect(data.body).toContain('APPEND');
    expect(data.body).toContain('chunk-bytes');
  });

  it('TwitterHttpClient.request with a proxy routes through the ProxyAgent', async () => {
    proxyLog.length = 0;
    const client = new TwitterHttpClient({ maxRetries: 0, proxy: `http://127.0.0.1:${proxyPort}` });
    const data = await client.request(`http://127.0.0.1:${targetPort}/proxied`, { authenticated: false });
    expect(data.path).toBe('/proxied');
    expect(client._proxyDispatcher).toBeInstanceOf(ProxyAgent);
    expect(proxyLog.some((line) => line.endsWith(`127.0.0.1:${targetPort}/proxied`))).toBe(true);
    await client._proxyDispatcher.close();
  });

  it('a ProxyAgent tunnels an https request through CONNECT', async () => {
    proxyLog.length = 0;
    const agent = new ProxyAgent({ uri: `http://127.0.0.1:${proxyPort}`, requestTls: { ca: cert } });
    try {
      const res = await fetchWithDispatcher(globalThis.fetch, `https://127.0.0.1:${h2Port}/tunnel`, {
        dispatcher: agent,
      });
      expect(res.status).toBe(200);
      expect(proxyLog).toContain(`CONNECT 127.0.0.1:${h2Port}`);
    } finally {
      await agent.close();
    }
  });
});

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * publicFetch connects to the address that passed the public check, so a
 * hostname cannot pass the check with one answer and be fetched at another
 * (DNS rebinding).
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import http from 'node:http';
import { pinnedDispatcher, publicFetch, PublicUrlError } from '../../src/utils/publicUrl.js';
import { fetchWithDispatcher } from '../../src/utils/http2.js';

const servers = [];
afterEach(() => { while (servers.length) servers.pop().close(); });

function listen(handler) {
  const server = http.createServer(handler).listen(0, '127.0.0.1');
  servers.push(server);
  return new Promise((resolve) => server.once('listening', () => resolve(server.address().port)));
}

describe('publicFetch', () => {
  it('connects to the pinned address whatever the hostname resolves to', async () => {
    const port = await listen((req, res) => res.end(`host=${req.headers.host}`));
    const dispatcher = await pinnedDispatcher('127.0.0.1', 4);
    // `.invalid` never resolves; reaching the server proves no lookup happened.
    const res = await fetchWithDispatcher(globalThis.fetch, `http://rebind.invalid:${port}/`, { dispatcher });
    expect(await res.text()).toBe(`host=rebind.invalid:${port}`);
    await dispatcher.close();
  });

  it('refuses a host that resolves to a private address before any request', async () => {
    const fetch = vi.fn();
    const lookup = vi.fn(async () => [{ address: '169.254.169.254', family: 4 }]);
    await expect(publicFetch('https://metadata.example/latest', {}, { lookup, fetch }))
      .rejects.toBeInstanceOf(PublicUrlError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('resolves once and does not follow redirects', async () => {
    const fetch = vi.fn(async () => new Response('ok'));
    const lookup = vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]);
    await publicFetch('https://hooks.example/x', { method: 'POST' }, { lookup, fetch });
    expect(lookup).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://hooks.example/x');
    expect(init.redirect).toBe('manual');
    expect(init.method).toBe('POST');
  });
});

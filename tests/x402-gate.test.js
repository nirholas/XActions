// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * x402: the gate that decides whether a paid call is served, and the limits
 * that decide whether a payment is signed.
 *
 * The existing x402 suite exercises a mock middleware defined inside the test
 * file, so it could not have caught either of the things asserted here: a gate
 * that accepted any `X-PAYMENT` header as proof of payment, and a client that
 * signed whatever amount a server asked for. Both are checked against the real
 * modules, with the facilitator and the chain stubbed at the fetch boundary.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

/** A 402-worthy request for a priced operation. */
function aiRequest({ payment, path = '/api/ai/scrape/profile', method = 'POST' } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (payment) headers.set('x-payment', Buffer.from(JSON.stringify(payment)).toString('base64'));
  return new Request(`https://xactions.app${path}`, { method, headers });
}

/** The payload a client attaches after signing. */
const signedPayment = (network = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp') => ({
  x402Version: 1,
  scheme: 'exact',
  network,
  payload: { signature: 'sig', authorization: { from: 'payer', value: '1000' } },
});

beforeEach(() => {
  vi.resetModules();
  process.env = {
    ...ORIGINAL_ENV,
    NODE_ENV: 'production',
    X402_PAY_TO_ADDRESS: '0x1111111111111111111111111111111111111111',
    X402_PAY_TO_ADDRESS_SOLANA: '2DdJ6AxTpdaSsZcbJ9AJV113oBNPBP5WM8L4HTBFnFv6',
  };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('worker x402 gate', () => {
  /**
   * Drive the worker's fetch handler with a stubbed facilitator and origin.
   *
   * @param {object} options
   * @param {Request} options.request
   * @param {(body: object) => object} [options.verify] - Facilitator /verify answer
   * @param {string} [options.apiOrigin]
   */
  async function callWorker({ request, verify = () => ({ isValid: true, payer: '0xpayer' }), apiOrigin = 'https://origin.example' }) {
    const calls = { verify: 0, origin: 0 };
    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.endsWith('/verify')) {
        calls.verify += 1;
        const body = JSON.parse(init.body);
        return new Response(JSON.stringify(verify(body)), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/supported')) {
        return new Response(JSON.stringify({ kinds: [] }), { status: 200 });
      }
      if (url.startsWith(apiOrigin)) {
        calls.origin += 1;
        return new Response(JSON.stringify({ profile: { username: 'nasa' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      throw new Error(`unexpected fetch: ${url}`);
    }));

    const worker = (await import('../worker/index.js')).default;
    const response = await worker.fetch(request, {
      API_ORIGIN: apiOrigin,
      NODE_ENV: 'production',
      X402_PAY_TO_ADDRESS: process.env.X402_PAY_TO_ADDRESS,
      X402_PAY_TO_ADDRESS_SOLANA: process.env.X402_PAY_TO_ADDRESS_SOLANA,
      ASSETS: { fetch: async () => new Response('asset', { status: 200 }) },
    });
    return { response, calls };
  }

  it('answers 402 with payable terms when no payment is attached', async () => {
    const { response, calls } = await callWorker({ request: aiRequest() });
    expect(response.status).toBe(402);

    const body = await response.json();
    expect(body.accepts.length).toBeGreaterThan(0);
    for (const accept of body.accepts) {
      expect(accept.payTo, 'a 402 must name an address that can actually receive').toBeTruthy();
      expect(accept.amount).toMatch(/^\d+$/);
    }
    expect(response.headers.get('payment-required')).toBeTruthy();
    expect(calls.origin, 'nothing may reach the origin unpaid').toBe(0);
  });

  it('does NOT treat the presence of a header as payment', async () => {
    // The regression this whole file exists for: `X-PAYMENT: anything` used to
    // be proxied straight through, making every priced endpoint free.
    const request = new Request('https://xactions.app/api/ai/scrape/profile', {
      method: 'POST',
      headers: { 'x-payment': 'not-a-real-payment' },
    });
    const { response, calls } = await callWorker({ request });
    expect(response.status).toBe(402);
    expect(calls.origin).toBe(0);
  });

  it('refuses a payment the facilitator rejects, and repeats its reason', async () => {
    const { response, calls } = await callWorker({
      request: aiRequest({ payment: signedPayment() }),
      verify: () => ({ isValid: false, invalidReason: 'insufficient_funds' }),
    });
    expect(response.status).toBe(402);
    expect((await response.json()).message).toContain('insufficient_funds');
    expect(calls.verify).toBe(1);
    expect(calls.origin).toBe(0);
  });

  it('refuses when the facilitator cannot be reached, rather than serving free', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.endsWith('/verify')) throw new Error('connect ECONNREFUSED');
      if (url.startsWith('https://origin.example')) throw new Error('origin must not be reached');
      return new Response('{}', { status: 200 });
    }));
    const worker = (await import('../worker/index.js')).default;
    const response = await worker.fetch(aiRequest({ payment: signedPayment() }), {
      API_ORIGIN: 'https://origin.example',
      NODE_ENV: 'production',
      X402_PAY_TO_ADDRESS: process.env.X402_PAY_TO_ADDRESS,
      X402_PAY_TO_ADDRESS_SOLANA: process.env.X402_PAY_TO_ADDRESS_SOLANA,
      ASSETS: { fetch: async () => new Response('asset') },
    });
    expect(response.status).toBe(402);
    expect((await response.json()).message).toMatch(/facilitator unreachable/i);
  });

  it('refuses a payment on a chain that was never offered', async () => {
    const { response, calls } = await callWorker({
      request: aiRequest({ payment: signedPayment('eip155:1') }),
    });
    expect(response.status).toBe(402);
    expect((await response.json()).error).toBe('unsupported_network');
    expect(calls.verify, 'an unoffered chain is refused before the facilitator is asked').toBe(0);
  });

  it('serves the request once the facilitator confirms the payment', async () => {
    const { response, calls } = await callWorker({
      request: aiRequest({ payment: signedPayment() }),
    });
    expect(response.status).toBe(200);
    expect(calls.verify).toBe(1);
    expect(calls.origin).toBe(1);
  });

  it('verifies against the terms it published, not the ones the client sent', async () => {
    let seen = null;
    await callWorker({
      request: aiRequest({ payment: signedPayment() }),
      verify: (body) => { seen = body.paymentRequirements; return { isValid: true }; },
    });
    // A client claiming "$0.000001 on Base to my own address" must be checked
    // against our terms for the chain it picked, or it can pay itself.
    expect(seen.payTo).toBe(process.env.X402_PAY_TO_ADDRESS_SOLANA);
    expect(seen.amount).toBe('1000'); // $0.001 in 6-decimal USDC
    expect(seen.network).toMatch(/^solana:/);
  });

  it('leaves free endpoints free', async () => {
    for (const path of ['/api/ai/health', '/api/ai/pricing']) {
      const { response } = await callWorker({ request: aiRequest({ path, method: 'GET' }) });
      expect(response.status, `${path} must not be gated`).toBe(200);
    }
  });
});

describe('x402 client spend limits', () => {
  /** Build a client with the wallet unset, so nothing can actually sign. */
  async function client(overrides = {}) {
    const { createX402Client } = await import('../src/mcp/x402-client.js');
    return createX402Client({ apiUrl: 'https://api.example', ...overrides });
  }

  /** A 402 the server controls entirely: amount, recipient, chain. */
  function serverDemand({ amount = '1000', payTo = '0xseller' } = {}) {
    const requirements = {
      x402Version: 2,
      accepts: [{ scheme: 'exact', network: 'eip155:8453', amount, maxAmountRequired: amount, payTo, asset: '0xusdc' }],
    };
    return new Response(JSON.stringify({ error: 'Payment required' }), {
      status: 402,
      headers: {
        'content-type': 'application/json',
        'x-payment-required': Buffer.from(JSON.stringify(requirements)).toString('base64'),
      },
    });
  }

  it('refuses a call priced above the per-call limit', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => serverDemand({ amount: '5000000' }))); // $5.00
    const api = await client({ privateKey: '0x' + '1'.repeat(64), maxPriceUsd: 1 });
    await expect(api.execute('x_get_profile', { username: 'nasa' }))
      .rejects.toThrow(/over the \$1 per-call limit/);
  });

  it('refuses once the session budget is spent', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => serverDemand({ amount: '600000' }))); // $0.60
    const api = await client({ privateKey: '0x' + '1'.repeat(64), maxPriceUsd: 1, maxTotalUsd: 1 });
    // The first call clears the limits and fails later, at signing, with no
    // wallet able to reach a chain; the second is refused by the budget itself.
    await api.execute('x_get_profile', { username: 'nasa' }).catch(() => {});
    await expect(api.execute('x_get_profile', { username: 'nasa' }))
      .rejects.toThrow(/already paid|budget/i);
  });

  it('refuses an address that is not on the allowlist', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => serverDemand({ payTo: '0xstranger' })));
    const api = await client({ privateKey: '0x' + '1'.repeat(64), allowedPayees: ['0xknown'] });
    await expect(api.execute('x_get_profile', { username: 'nasa' }))
      .rejects.toThrow(/not in X402_ALLOWED_PAYEES/);
  });

  it('refuses a 402 whose amount it cannot read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => serverDemand({ amount: 'lots' })));
    const api = await client({ privateKey: '0x' + '1'.repeat(64) });
    await expect(api.execute('x_get_profile', { username: 'nasa' }))
      .rejects.toThrow(/did not state an amount/);
  });
});

describe('server config honesty', () => {
  it('refuses to start the EVM middleware when only a Solana address is configured', async () => {
    // The middleware registers the EVM scheme only. With no EVM address it used
    // to advertise Base terms with payTo:"" — payable to nobody.
    process.env.X402_PAY_TO_ADDRESS = '';
    const { x402Middleware } = await import('../api/middleware/x402.js');

    const req = { path: '/api/ai/scrape/profile', method: 'POST', headers: {} };
    let status = null;
    let body = null;
    const res = {
      status(code) { status = code; return this; },
      json(payload) { body = payload; return this; },
      setHeader() {},
    };
    let passedThrough = false;
    await x402Middleware(req, res, () => { passedThrough = true; });

    expect(passedThrough, 'a paid route must not be served free').toBe(false);
    expect(status).toBe(503);
    expect(body.error).toMatch(/unavailable/i);
  });

  it('asks the configured facilitator what it supports, not the library default', async () => {
    // HTTPFacilitatorClient takes { url }. It was handed the bare URL string,
    // read config.url as undefined and fell back to https://x402.org/facilitator,
    // which settles testnets only: in production every paid route answered 503
    // missing_facilitator whatever X402_FACILITATOR_URL said.
    process.env.X402_FACILITATOR_URL = 'https://facilitator.example.test';
    const asked = [];
    vi.stubGlobal('fetch', vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      asked.push(url);
      return new Response(JSON.stringify({
        kinds: [{ x402Version: 2, scheme: 'exact', network: 'eip155:8453' }],
        extensions: [],
        signers: {},
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));
    const { x402Middleware } = await import('../api/middleware/x402.js');

    const req = {
      path: '/api/ai/scrape/profile', originalUrl: '/api/ai/scrape/profile', url: '/api/ai/scrape/profile',
      method: 'POST', headers: { host: 'xactions.app' }, protocol: 'https', body: {},
      get(name) { return this.headers[name.toLowerCase()]; }, header(name) { return this.get(name); },
    };
    const res = {
      statusCode: 200, headersSent: false,
      status(code) { this.statusCode = code; return this; },
      json() { return this; }, send() { return this; }, end() { return this; },
      setHeader() {}, getHeader() {}, set() { return this; }, header() { return this; },
    };
    await x402Middleware(req, res, () => {});

    expect(asked.length, 'the middleware never asked a facilitator').toBeGreaterThan(0);
    expect(asked.every((u) => u.startsWith('https://facilitator.example.test/'))).toBe(true);
    expect(asked.some((u) => u.includes('x402.org'))).toBe(false);
  });

  it('advertises only the network it will actually accept', async () => {
    const { x402Pricing } = await import('../api/middleware/x402.js');
    const { NETWORK } = await import('../api/config/x402-config.js');
    let body = null;
    x402Pricing({}, { json: (payload) => { body = payload; } });
    expect(body.networks.map((n) => n.network)).toEqual([NETWORK]);
  });
});

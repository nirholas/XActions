// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The edge payment gate (src/edge/x402.js) answers a payment in the protocol
 * version it was made in.
 *
 * A v2 client reads the CAIP-2 terms from the PAYMENT-REQUIRED header and pays
 * with a v2 payload. The gate used to hand the facilitator the v1 view of the
 * terms (network "solana") with that payload, which the facilitator refuses
 * with "x402Version 2 requires CAIP-2 network format", so every current x402
 * client failed against xactions.app while the older v1 script succeeded.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withX402, encodeBase64Json } from '../../src/edge/x402.js';

const SOLANA = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const env = {
  NODE_ENV: 'production',
  X402_FACILITATOR_URL: 'https://facilitator.test',
  X402_NETWORK: 'eip155:8453',
  X402_PAY_TO_ADDRESS: '0xaC718534d58dD3C358779b7751faeC840DC81e56',
  X402_PAY_TO_ADDRESS_SOLANA: 'XACTx23ziev2QoDACrMBcsYoCzEKVm7QycPVCQnaKpZ',
};

let calls;
beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      const path = new URL(url).pathname;
      const body = init?.body ? JSON.parse(init.body) : null;
      calls.push({ path, body });
      if (path === '/supported') {
        return Response.json({
          kinds: [
            { x402Version: 2, scheme: 'exact', network: SOLANA, extra: { feePayer: 'FeePayer1111111111111111111111111111111111' } },
            { x402Version: 2, scheme: 'exact', network: 'eip155:8453' },
          ],
        });
      }
      if (path === '/verify') return Response.json({ isValid: true, payer: 'payer' });
      if (path === '/settle') return Response.json({ success: true, transaction: 'tx', network: body.paymentRequirements.network });
      throw new Error(`unexpected fetch ${url}`);
    }),
  );
});
afterEach(() => vi.unstubAllGlobals());

const handler = withX402({ price: '$0.001', description: 'test' }, async () => Response.json({ ok: true }));
const call = (headers = {}) =>
  handler({ request: new Request('https://xactions.app/api/ai/scrape/profile', { method: 'POST', headers }), env });

describe('edge x402 gate', () => {
  it('publishes v1 terms in the body and CAIP-2 terms in the header', async () => {
    const res = await call();
    expect(res.status).toBe(402);
    const v1 = await res.json();
    const v2 = JSON.parse(Buffer.from(res.headers.get('payment-required'), 'base64').toString());
    expect(v1.accepts.map((a) => a.network)).toContain('solana');
    expect(v2.accepts.map((a) => a.network)).toContain(SOLANA);
  });

  it('verifies and settles a v2 payment against the CAIP-2 terms, as v2', async () => {
    const payload = { x402Version: 2, accepted: { scheme: 'exact', network: SOLANA }, payload: {} };
    const res = await call({ 'payment-signature': encodeBase64Json(payload) });
    expect(res.status).toBe(200);
    for (const path of ['/verify', '/settle']) {
      const { body } = calls.find((c) => c.path === path);
      expect(body.x402Version, path).toBe(2);
      expect(body.paymentRequirements.network, path).toBe(SOLANA);
    }
  });

  it('still verifies and settles a v1 payment against the v1 terms, as v1', async () => {
    const payload = { x402Version: 1, scheme: 'exact', network: 'solana', payload: {} };
    const res = await call({ 'x-payment': encodeBase64Json(payload) });
    expect(res.status).toBe(200);
    for (const path of ['/verify', '/settle']) {
      const { body } = calls.find((c) => c.path === path);
      expect(body.x402Version, path).toBe(1);
      expect(body.paymentRequirements.network, path).toBe('solana');
    }
  });
});

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * GET /api/ai/pricing on the Pages deployment.
 *
 * The price list is a promise to an agent: anything on it can be bought here.
 * Without a backend only the edge resources are served, so only they may be
 * listed, at the price the gate charges.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect } from 'vitest';
import { onRequestGet } from '../../functions/api/ai/pricing.js';
import { PAID_RESOURCES } from '../../src/edge/paidResources.js';
import { AI_OPERATION_PRICES } from '../../api/config/x402-config.js';

const request = new Request('https://xactions.app/api/ai/pricing');
const pricingFor = async (env) => (await (await onRequestGet({ request, env })).json()).pricing;

describe('GET /api/ai/pricing', () => {
  it('lists only the edge resources when no backend is configured', async () => {
    const pricing = await pricingFor({});
    expect(Object.keys(pricing).sort()).toEqual(PAID_RESOURCES.map((r) => r.operation).sort());
  });

  it('publishes the price the gate charges for each edge resource', async () => {
    const pricing = await pricingFor({});
    for (const resource of PAID_RESOURCES) {
      expect(pricing[resource.operation]).toBe(resource.price);
      expect(AI_OPERATION_PRICES[resource.operation], `${resource.operation} drifted from x402-config`).toBe(
        resource.price,
      );
    }
  });

  it('lists the full table when a backend serves the other routes', async () => {
    const pricing = await pricingFor({ XACTIONS_API_ORIGIN: 'https://api.example' });
    expect(pricing).toEqual(AI_OPERATION_PRICES);
  });
});

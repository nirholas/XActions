// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * GET /api/ai/pricing
 *
 * Per-operation USDC prices for the paid endpoints this deployment can serve.
 *
 * Without a backend, that is only the edge resources in `PAID_RESOURCES`, the
 * same list `/api/ai/health` and `/.well-known/x402` publish. The full table in
 * `api/config/x402-config.js` prices more than 300 Node routes, and on a site
 * with no `XACTIONS_API_ORIGIN` every one of them answers 503. Publishing those
 * prices sent agents to buy endpoints that do not exist here.
 *
 * With `XACTIONS_API_ORIGIN` set, the catch-all proxies those routes to a Node
 * backend that gates and serves them, so the full table is true and is served.
 *
 * @author nichxbt
 */

import { loadApiModules } from '../../../src/edge/apiModules.js';
import { PAID_RESOURCES } from '../../../src/edge/paidResources.js';
import { corsHeaders, jsonResponse, preflightResponse } from '../../../src/video/edgeHttp.js';

export async function onRequestOptions({ request }) {
  return preflightResponse(request);
}

export async function onRequestGet({ request, env }) {
  if (env.XACTIONS_API_ORIGIN) {
    const api = await loadApiModules(env);
    return jsonResponse({ pricing: api.AI_OPERATION_PRICES }, 200, corsHeaders(request));
  }
  const pricing = Object.fromEntries(PAID_RESOURCES.map((resource) => [resource.operation, resource.price]));
  return jsonResponse({ pricing }, 200, corsHeaders(request));
}

// A discovery crawler probes with HEAD before it does anything else. Pages
// routes an unclaimed method to functions/api/[[path]].js, whose 503 made every
// endpoint here look like it needed a backend that was not deployed.
export const onRequestHead = onRequestGet;

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Cloudflare Worker entry for xactions.app
 *
 * Serves the whole site from Workers static assets (see
 * scripts/build-cloudflare.mjs) and handles the dynamic surface natively:
 *
 *   /api/health, /api/ai/health, /api/ai/pricing  -> answered at the edge
 *   /openapi.json, /.well-known/x402              -> x402 discovery, at the edge
 *   /api/ai/<cat>/<op> without an X-PAYMENT header -> 402 payment challenge
 *   /thread/*                                     -> rewritten to /thread
 *   every other /api/*                            -> proxied to API_ORIGIN
 *                                                    (the Node backend: Railway,
 *                                                    Fly, or Docker self-host)
 *
 * Vars (wrangler.toml [vars] or dashboard):
 *   API_ORIGIN            origin of the full Node API (empty = 503 for heavy routes)
 *   NODE_ENV              "production" selects mainnet x402 defaults
 *   X402_PAY_TO_ADDRESS / X402_NETWORK / X402_FACILITATOR_URL   optional overrides
 */

import { Buffer } from 'node:buffer';

const ALLOWED_ORIGINS = new Set([
  'https://xactions.app',
  'https://www.xactions.app',
]);

// x402-config.js and openapi.js read process.env at module scope, so they are
// imported lazily after the Worker env has been copied onto process.env.
let apiModules;
function loadApiModules(env) {
  if (!apiModules) {
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === 'string') process.env[key] = value;
    }
    apiModules = Promise.all([
      import('../api/config/x402-config.js'),
      import('../api/openapi.js'),
    ]).then(([x402, openapi]) => ({ ...x402, ...openapi }));
  }
  return apiModules;
}

function corsHeaders(request) {
  const origin = request.headers.get('origin');
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://xactions.app';
  return {
    'access-control-allow-origin': allowed,
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, x-payment',
    'access-control-allow-credentials': 'true',
    vary: 'origin',
  };
}

function json(data, status = 200, extraHeaders = {}) {
  // Edge API responses are dynamic (live pricing, health, x402 config) — never
  // let Cloudflare or a client cache them, so a redeploy is reflected instantly.
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extraHeaders },
  });
}

/**
 * Inline x402 payment gate for /api/ai/* — same behavior as api/serverless.js.
 * Returns a 402 Response for unpaid priced operations, or null to pass through.
 */
function x402Gate(request, url, api) {
  const path = url.pathname;
  if (!path.startsWith('/api/ai/')) return null;
  if (path === '/api/ai/' || path === '/api/ai/health' || path === '/api/ai/pricing') return null;
  if (request.headers.get('x-payment')) return null;
  if (!api.isX402Configured()) return null;

  const match = path.match(/^\/api\/ai\/([^/]+)\/([^/]+)/);
  const operation = match ? `${match[1]}:${match[2]}` : null;
  const price = operation ? api.AI_OPERATION_PRICES[operation] : null;
  if (!price) return null; // free or unknown endpoint

  const dollarAmount = parseFloat(price.replace('$', ''));
  const maxAmount = Math.round(dollarAmount * 1_000_000).toString();
  const asset =
    (api.SUPPORTED_NETWORKS[api.NETWORK] && api.SUPPORTED_NETWORKS[api.NETWORK].usdc) ||
    api.SUPPORTED_NETWORKS['eip155:8453'].usdc;

  const payload = {
    x402Version: 2,
    resource: {
      url: `${url.origin}${path}`,
      method: request.method,
      description: `XActions AI API - ${operation}`,
      mimeType: 'application/json',
    },
    accepts: [
      {
        scheme: 'exact',
        network: api.NETWORK,
        amount: maxAmount,
        asset,
        payTo: api.PAY_TO_ADDRESS,
        maxTimeoutSeconds: 300,
        extra: { name: 'USD Coin', version: '2' },
      },
    ],
  };

  return new Response(null, {
    status: 402,
    headers: {
      'payment-required': Buffer.from(JSON.stringify(payload)).toString('base64'),
      'content-type': 'application/json',
      ...corsHeaders(request),
    },
  });
}

// X account actions (follow / unfollow / like / reply / post / DM / host a
// Space) require the user's logged-in X session. The hosted service does not
// custody session tokens or drive accounts server-side — those actions run in
// the browser extension instead. Reads (scrape, analytics, search) are fine to
// run server-side and just proxy to API_ORIGIN.
const ACCOUNT_ACTION_RE =
  /^\/api\/(ai\/(action|engagement|posting|messages)\/|automations|operations|engagement\b)/;

function requiresExtension(path) {
  if (ACCOUNT_ACTION_RE.test(path)) return true;
  // Space writes need a session; spaces reads (list/status/transcript) do not.
  if (/^\/api\/ai\/spaces\/(host|join|leave)\b/.test(path)) return true;
  return false;
}

function extensionResponse(request) {
  return json(
    {
      error: 'account_action_requires_extension',
      message:
        'X account actions (follow, unfollow, like, reply, post) run in the ' +
        'XActions browser extension, in your own logged-in session — the ' +
        'hosted service never stores your X credentials or acts on your ' +
        'account server-side.',
      extension: 'https://xactions.app/extension',
      docs: 'https://github.com/nirholas/XActions/blob/main/docs/extension.md',
    },
    501,
    corsHeaders(request)
  );
}

async function proxyToOrigin(request, url, env) {
  const origin = env.API_ORIGIN;
  if (!origin) {
    return json(
      {
        error: 'API origin not configured',
        message:
          'This route needs the full Node backend (database, analytics, scraping). ' +
          'Set the API_ORIGIN var on the Worker to your Railway/Fly/Docker deployment URL.',
      },
      503,
      corsHeaders(request)
    );
  }

  const target = new URL(url.pathname + url.search, origin);
  const upstream = await fetch(new Request(target, request));
  const response = new Response(upstream.body, upstream);
  if (!response.headers.get('access-control-allow-origin')) {
    for (const [key, value] of Object.entries(corsHeaders(request))) {
      response.headers.set(key, value);
    }
  }
  return response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // /thread/<id> renders the same client-side page as /thread. Rewrite to
    // the clean URL (not /thread.html — the assets layer would 307 that back
    // to /thread and drop the id from the address bar).
    if (path.startsWith('/thread/')) {
      return env.ASSETS.fetch(new Request(new URL('/thread', url), request));
    }

    const isDiscovery = path === '/openapi.json' || path === '/.well-known/x402';
    if (!path.startsWith('/api/') && !isDiscovery) {
      return env.ASSETS.fetch(request);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const api = await loadApiModules(env);

    if (path === '/openapi.json') return json(api.generateSpec());
    if (path === '/.well-known/x402') return json(api.generateWellKnown());

    if (path === '/api/health') {
      return json(
        {
          status: 'ok',
          service: 'xactions-api',
          edge: 'cloudflare',
          timestamp: new Date().toISOString(),
        },
        200,
        corsHeaders(request)
      );
    }

    if (path === '/api/ai/health') {
      return json(
        {
          service: 'XActions AI API',
          status: 'operational',
          timestamp: new Date().toISOString(),
          x402: {
            enabled: api.isX402Configured(),
            version: 2,
            facilitator: api.FACILITATOR_URL,
            payTo: api.PAY_TO_ADDRESS,
          },
        },
        200,
        corsHeaders(request)
      );
    }

    if (path === '/api/ai/pricing') {
      return json({ pricing: api.AI_OPERATION_PRICES }, 200, corsHeaders(request));
    }

    // Account actions run in the extension, not server-side — answer before the
    // payment gate so an agent is never charged for something the hosted
    // service will not execute.
    if (requiresExtension(path)) return extensionResponse(request);

    const paymentChallenge = x402Gate(request, url, api);
    if (paymentChallenge) return paymentChallenge;

    return proxyToOrigin(request, url, env);
  },
};

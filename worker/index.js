// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Cloudflare Worker entry for xactions.app
 *
 * Serves the whole site from Workers static assets (see
 * scripts/build-cloudflare.mjs) and handles the dynamic surface natively:
 *
 *   /api/health, /api/ai/health, /api/ai/pricing  -> answered at the edge
 *   /openapi.json, /.well-known/x402              -> x402 discovery, at the edge
 *   /api/ai/<cat>/<op>                            -> x402 gate: 402 without a
 *                                                    payment, and the payment is
 *                                                    verified with the facilitator
 *                                                    before anything is served
 *   /thread/*                                     -> rewritten to /thread
 *   /api/ask, /api/ask/health                     -> Ask XActions, answered at the
 *                                                    edge (docs index + free LLM lanes)
 *   /api/chat, /api/chat/context, /api/chat/health -> XActions Chat, answered at the
 *                                                    edge (guest X reads + free LLM lanes)
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
import { ask, createSearcher, SUGGESTED_QUESTIONS } from '../src/ask/engine.js';
import { createActionMatcher } from '../src/ask/actions.js';
import { buildLaneChain } from '../src/ask/lanes.js';
import { chat, SUGGESTED_PROMPTS } from '../src/chat/engine.js';
import { CONTEXT_BUDGET, MAX_ITEMS, resolveAttachment } from '../src/chat/context.js';
import { edgeReader } from '../src/chat/reader.js';
import { statusForError } from '../src/edge/twitterClient.js';
import { verifyPayment } from '../src/edge/x402.js';

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
 * Decode the payment payload a client attached, from either header spelling.
 *
 * @param {Request} request
 * @returns {object|null} the decoded payload, or null when there is none
 */
function attachedPayment(request) {
  for (const name of ['x-payment', 'payment-signature']) {
    const raw = request.headers.get(name);
    if (!raw) continue;
    try {
      return JSON.parse(atob(raw));
    } catch {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * x402 payment gate for /api/ai/*.
 *
 * Returns a Response to send back (a 402 challenge, or a rejection), or null to
 * let the request continue to the origin.
 *
 * The presence of an `X-PAYMENT` header is not proof of payment: anyone can set
 * a header. This gate previously passed any request carrying one straight
 * through to the origin, which made the whole paid surface free to anybody who
 * sent `X-PAYMENT: x`. The payload is now decoded and checked with the
 * facilitator against the exact terms this edge published, and a payment that
 * does not verify is refused with the facilitator's own reason. A facilitator
 * that cannot be reached is a refusal too: failing open on a payment gate is
 * how an outage turns into free service.
 *
 * Settlement stays with the origin, which owns the work and must not charge for
 * a response it failed to produce.
 *
 * @param {Request} request
 * @param {URL} url
 * @param {object} api - the loaded x402 config module
 * @returns {Promise<Response|null>}
 */
async function x402Gate(request, url, api) {
  const path = url.pathname;
  if (!path.startsWith('/api/ai/')) return null;
  if (path === '/api/ai/' || path === '/api/ai/health' || path === '/api/ai/pricing') return null;
  if (!api.isX402Configured()) return null;

  // Derived from the whole path, not the first two segments: a three-segment
  // route read as its first two is an operation with no price, and a priced
  // endpoint served free.
  const operation = api.operationForPath(path);
  const price = operation ? api.AI_OPERATION_PRICES[operation] : null;
  if (!price) return null; // free or unknown endpoint

  const resource = `${url.origin}${path}`;
  const description = `XActions AI API - ${operation}`;
  const accepts = api.buildAccepts({ price, resource, description });
  if (accepts.length === 0) {
    // Priced, but no chain is configured to receive. Serving it free would be
    // worse than saying so.
    return json(
      {
        error: 'payment_unavailable',
        message: 'This endpoint is priced but no receiving address is configured for any supported chain.',
      },
      503,
      corsHeaders(request),
    );
  }

  const payload = {
    x402Version: 2,
    resource: { url: resource, method: request.method, description, mimeType: 'application/json' },
    accepts,
  };

  const attached = attachedPayment(request);
  if (!attached) {
    return new Response(JSON.stringify({ x402Version: 2, error: 'Payment required', ...payload }), {
      status: 402,
      headers: {
        'payment-required': Buffer.from(JSON.stringify(payload)).toString('base64'),
        'content-type': 'application/json',
        ...corsHeaders(request),
      },
    });
  }

  // Check the payment against the terms for the chain the client chose. A
  // client cannot pay on a chain we never offered, or against terms we never
  // published, because the requirements come from `accepts`, not from them.
  const chosen =
    accepts.find((entry) => api.sameNetwork(entry.network, attached.network)) ||
    (attached.network ? null : accepts[0]);
  if (!chosen) {
    return json(
      {
        error: 'unsupported_network',
        message: `This resource is not offered on ${attached.network || 'the chain in the payment'}.`,
        accepts,
      },
      402,
      corsHeaders(request),
    );
  }

  const facilitator = api.FACILITATOR_URL;
  let verification;
  try {
    verification = await verifyPayment(facilitator, attached, chosen);
  } catch (error) {
    verification = { isValid: false, invalidReason: `facilitator unreachable: ${error.message}` };
  }

  if (!verification?.isValid) {
    return json(
      {
        error: 'invalid_payment',
        message: verification?.invalidReason || 'The facilitator rejected this payment.',
        accepts,
      },
      402,
      corsHeaders(request),
    );
  }

  return null;
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


// Ask XActions runs entirely at the edge: the retrieval index is a static
// asset (/data/ask-index.json) and every LLM lane is reached with fetch.
let askSearcher = null;
async function loadAskSearcher(env, url) {
  if (!askSearcher) {
    askSearcher = Promise.all([
      env.ASSETS.fetch(new Request(new URL('/data/ask-index.json', url))),
      env.ASSETS.fetch(new Request(new URL('/data/ask-actions.json', url))),
    ]).then(async ([indexRes, actionsRes]) => {
      if (!indexRes.ok) throw new Error(`ask index asset HTTP ${indexRes.status}`);
      if (!actionsRes.ok) throw new Error(`ask actions asset HTTP ${actionsRes.status}`);
      const [index, catalog] = await Promise.all([indexRes.json(), actionsRes.json()]);
      return {
        searcher: createSearcher(index),
        matcher: createActionMatcher(catalog),
        digest: index.digest,
        counts: index.counts,
        actionCounts: catalog.counts,
      };
    });
    askSearcher.catch(() => { askSearcher = null; });
  }
  return askSearcher;
}

async function handleAsk(request, url, env) {
  const cors = corsHeaders(request);
  if (url.pathname === '/api/ask/health') {
    try {
      const { searcher, matcher, digest, counts, actionCounts } = await loadAskSearcher(env, url);
      return json({ status: 'ok', edge: 'cloudflare', index: { chunks: searcher.size, digest, counts }, actions: { total: matcher.size, counts: actionCounts }, lanes: buildLaneChain(env).map((l) => l.name), suggested: SUGGESTED_QUESTIONS }, 200, cors);
    } catch (error) {
      return json({ status: 'error', message: error.message }, 503, cors);
    }
  }
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const { question, history, byok } = body || {};
  if (typeof question !== 'string' || !question.trim()) {
    return json({ error: 'INVALID_INPUT', message: 'question is required' }, 400, cors);
  }
  let searcher;
  let matcher;
  try {
    ({ searcher, matcher } = await loadAskSearcher(env, url));
  } catch (error) {
    return json({ error: 'INDEX_UNAVAILABLE', message: error.message }, 503, cors);
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        await ask({
          question,
          history: Array.isArray(history) ? history : [],
          searcher,
          matcher,
          env,
          byok: byok && typeof byok === 'object' ? byok : undefined,
          onEvent: send,
          signal: request.signal,
        });
      } catch (error) {
        send({ type: 'error', message: error.message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', ...cors },
  });
}

// XActions Chat runs at the edge too: attachments resolve through the
// guest-token readers in src/edge/, answers stream through the Ask lanes.
async function handleChat(request, url, env) {
  const cors = corsHeaders(request);
  if (url.pathname === '/api/chat/health') {
    return json({ status: 'ok', edge: 'cloudflare', lanes: buildLaneChain(env).map((l) => l.name), budget: CONTEXT_BUDGET, maxItems: MAX_ITEMS, suggested: SUGGESTED_PROMPTS }, 200, cors);
  }
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);
  let body;
  try { body = await request.json(); } catch { body = {}; }

  if (url.pathname === '/api/chat/context') {
    const input = typeof body?.input === 'string' ? body.input.slice(0, 300) : '';
    try {
      return json(await resolveAttachment(input, edgeReader), 200, { 'cache-control': 'no-store', ...cors });
    } catch (error) {
      return json({ error: 'CONTEXT_FAILED', message: error.message }, error.status || statusForError(error), cors);
    }
  }

  const { question, history, items, byok } = body || {};
  if (typeof question !== 'string' || !question.trim()) {
    return json({ error: 'INVALID_INPUT', message: 'question is required' }, 400, cors);
  }
  if (!Array.isArray(items) || !items.length) {
    return json({ error: 'NO_CONTEXT', message: 'Attach an account, a post or a thread first.' }, 400, cors);
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      try {
        await chat({
          question,
          history: Array.isArray(history) ? history : [],
          items,
          env,
          byok: byok && typeof byok === 'object' ? byok : undefined,
          onEvent: send,
          signal: request.signal,
        });
      } catch (error) {
        send({ type: 'error', message: error.message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', ...cors },
  });
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

    if (path === '/api/ask' || path === '/api/ask/health') return handleAsk(request, url, env);
    if (path === '/api/chat' || path === '/api/chat/context' || path === '/api/chat/health') return handleChat(request, url, env);

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

    const paymentChallenge = await x402Gate(request, url, api);
    if (paymentChallenge) return paymentChallenge;

    return proxyToOrigin(request, url, env);
  },
};

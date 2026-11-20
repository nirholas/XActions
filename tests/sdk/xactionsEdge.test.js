// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * xactions-edge SDK tests.
 *
 * The client is driven against the real MCP server core rather than a hand-made
 * transcript: `fetch` is redirected into `handleMessage`, so a change to the
 * protocol on either side fails here instead of in production.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createClient, McpClient, PaymentRequiredError, XActionsError, DEFAULT_ENDPOINT } from '../../packages/xactions-edge/index.js';
import { handlePayload, buildResourceIndex } from '../../src/mcp/edgeServer.js';

const POST_ID = '2092648130856571283';

const SYNDICATION_POST = {
  __typename: 'Tweet',
  id_str: POST_ID,
  text: 'Falcon Heavy in the hangar',
  created_at: '2026-08-26T12:00:00.000Z',
  favorite_count: 10926,
  conversation_count: 345,
  user: { id_str: '34743251', screen_name: 'SpaceX', name: 'SpaceX' },
  entities: {},
  mediaDetails: [],
};

const ctx = {
  getSearcher: async () => ({
    search: () => [{ t: 'Unfollow everyone', u: 'https://xactions.app/scripts/unfollow', p: 'browser/unfollowEveryone.js', k: 'script', x: 'Paste this in the console.', score: 5 }],
  }),
  getResources: async () => buildResourceIndex({
    chunks: Array.from({ length: 150 }, (_, i) => ({ t: `Doc ${i}`, u: `https://xactions.app/${i}`, p: `docs/${i}.md`, k: 'doc', x: `body ${i}` })),
  }),
};

/**
 * A transport that runs the real server. `upstream` decides what x.com
 * answers, so a test can make a tool succeed or fail for a real reason.
 */
function serveMcp({ upstream, transportStatus } = {}) {
  const requests = [];
  vi.stubGlobal('fetch', async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;

    if (!url.endsWith('/mcp')) {
      if (upstream) return upstream(url);
      return new Response('', { status: 503 });
    }

    requests.push(JSON.parse(init.body));
    if (transportStatus) {
      const status = Array.isArray(transportStatus) ? transportStatus.shift() ?? 200 : transportStatus;
      if (status !== 200) return new Response('', { status });
    }

    const response = await handlePayload(JSON.parse(init.body), ctx);
    if (response === null) return new Response(null, { status: 202 });
    return new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  return requests;
}

const twitterUp = () => (url) => {
  if (url.includes('cdn.syndication.twimg.com')) return new Response(JSON.stringify(SYNDICATION_POST), { status: 200 });
  return new Response('', { status: 503 });
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('client construction', () => {
  it('defaults to the hosted endpoint', () => {
    expect(new McpClient().endpoint).toBe(DEFAULT_ENDPOINT);
    expect(DEFAULT_ENDPOINT).toBe('https://xactions.app/mcp');
  });

  it('accepts an injected fetch for runtimes without a global', () => {
    const client = new McpClient({ fetch: async () => new Response('{}'), endpoint: 'https://example.test/mcp' });
    expect(client.endpoint).toBe('https://example.test/mcp');
  });
});

describe('handshake', () => {
  it('initializes once and reuses it across calls', async () => {
    const requests = serveMcp({ upstream: twitterUp() });
    const x = createClient();

    await x.post(POST_ID);
    await x.post(POST_ID);

    const methods = requests.map((request) => request.method);
    expect(methods.filter((method) => method === 'initialize')).toHaveLength(1);
    expect(methods.filter((method) => method === 'notifications/initialized')).toHaveLength(1);
    expect(methods.filter((method) => method === 'tools/call')).toHaveLength(2);
  });

  it('sends the protocol version the server understands', async () => {
    const requests = serveMcp();
    const info = await createClient().info();
    expect(requests[0].params.protocolVersion).toBe('2025-06-18');
    expect(info.protocolVersion).toBe('2025-06-18');
    expect(info.serverInfo.name).toBe('xactions');
  });
});

describe('convenience methods', () => {
  it('unwraps a post to the object the caller wanted', async () => {
    serveMcp({ upstream: twitterUp() });
    const post = await createClient().post(`https://x.com/SpaceX/status/${POST_ID}`);
    expect(post.id).toBe(POST_ID);
    expect(post.author.username).toBe('SpaceX');
    expect(post.metrics.likes).toBe(10926);
  });

  it('returns docs results with expanded field names', async () => {
    serveMcp();
    const results = await createClient().docs('unfollow');
    expect(results[0]).toMatchObject({ title: 'Unfollow everyone', url: 'https://xactions.app/scripts/unfollow', kind: 'script' });
  });

  it('lists tools through the friendly surface', async () => {
    serveMcp();
    const tools = await createClient().tools();
    expect(tools.map((tool) => tool.name)).toContain('x_thread');
  });
});

describe('errors', () => {
  it('turns a tool failure into a typed error carrying the tool\'s wording', async () => {
    serveMcp({ upstream: twitterUp() });
    const error = await createClient().post('https://x.com/SpaceX').catch((e) => e);
    expect(error).toBeInstanceOf(XActionsError);
    expect(error.tool).toBe('x_post');
    expect(error.code).toBeNull();
    expect(error.message).toMatch(/post ID or an x\.com status URL/);
  });

  it('marks a rate-limit failure retryable', async () => {
    serveMcp({
      upstream: (url) => (url.includes('syndication') ? new Response('', { status: 429 }) : new Response('', { status: 429 })),
    });
    const error = await createClient().post(POST_ID).catch((e) => e);
    expect(error.retryable).toBe(true);
  });

  it('raises an unknown tool as a protocol error with a code', async () => {
    serveMcp();
    const error = await createClient().mcp.call('x_nope').catch((e) => e);
    expect(error.code).toBe(-32602);
  });

  it('retries a 503 and succeeds on the next attempt', async () => {
    serveMcp({ upstream: twitterUp(), transportStatus: [503, 200, 200, 200] });
    const post = await createClient({ retries: 3 }).post(POST_ID);
    expect(post.id).toBe(POST_ID);
  });

  it('does not retry a 400', async () => {
    serveMcp({ transportStatus: 400 });
    const error = await createClient({ retries: 3 }).info().catch((e) => e);
    expect(error.status).toBe(400);
    expect(error.retryable).toBe(false);
  });
});

describe('priced tools', () => {
  /** The exact body the live server answers a priced tool with. */
  const X402_BODY = JSON.stringify({
    x402Version: 1,
    error: 'Payment required: x_profile costs $0.001000',
    resource: { url: 'https://xactions.app/mcp#x_profile', method: 'POST' },
    accepts: [
      { scheme: 'exact', network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', maxAmountRequired: '1000', asset: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', payTo: '2DdJ6AxTpdaSsZcbJ9AJV113oBNPBP5WM8L4HTBFnFv6', resource: 'https://xactions.app/mcp#x_profile' },
      { scheme: 'exact', network: 'eip155:8453', maxAmountRequired: '1000', asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', payTo: '0xB4C61215E4a42A36E7344Bc512273F00372360CF', resource: 'https://xactions.app/mcp#x_profile' },
    ],
  });

  /** A server that gates one tool behind payment, the way production does. */
  function servePriced() {
    vi.stubGlobal('fetch', async (input, init = {}) => {
      const url = typeof input === 'string' ? input : input.url;
      if (!url.endsWith('/mcp')) return new Response('', { status: 503 });
      if (!init.body) {
        return new Response(JSON.stringify({
          tools: [{ name: 'x_profile', price: '$0.001000' }, { name: 'x_post', price: null }],
        }), { status: 200 });
      }
      const message = JSON.parse(init.body);
      if (message.method === 'tools/call' && message.params.name === 'x_profile') {
        return new Response(JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          result: { content: [{ type: 'text', text: X402_BODY }], isError: true },
        }), { status: 200 });
      }
      return new Response(JSON.stringify(await handlePayload(message, ctx)), { status: 200 });
    });
  }

  it('raises a typed payment error carrying the terms to settle', async () => {
    servePriced();
    const error = await createClient().profile('nasa').catch((e) => e);

    expect(error).toBeInstanceOf(PaymentRequiredError);
    expect(error).toBeInstanceOf(XActionsError);
    expect(error.status).toBe(402);
    expect(error.price).toBe('$0.001');
    expect(error.amount).toBeCloseTo(0.001);
    expect(error.chains).toEqual(['Solana', 'Base']);
    expect(error.accepts).toHaveLength(2);
    expect(error.resource).toBe('https://xactions.app/mcp#x_profile');
    expect(error.retryable).toBe(false);
  });

  it('says what it costs and where to pay, in the message', async () => {
    servePriced();
    const error = await createClient().profile('nasa').catch((e) => e);
    expect(error.message).toContain('x_profile costs $0.001 in USDC');
    expect(error.message).toContain('Solana or Base');
    expect(error.message).toContain('/docs/guides/x402');
  });

  it('reads the price list so a caller can budget before it starts', async () => {
    servePriced();
    expect(await createClient().prices()).toEqual({ x_profile: '$0.001000', x_post: null });
  });

  it('never asks for payment on a free tool', async () => {
    servePriced();
    // Both rails are down in this stub, so the call fails. The point is which
    // failure: an unpriced tool must never come back as a payment demand.
    const post = await createClient().post(POST_ID).catch((e) => e);
    expect(post).toBeInstanceOf(XActionsError);
    expect(post).not.toBeInstanceOf(PaymentRequiredError);
  });
});

describe('raw MCP surface', () => {
  it('follows resource pagination to the end', async () => {
    serveMcp();
    const resources = await createClient().mcp.listResources();
    expect(resources).toHaveLength(150);
    expect(resources[0].uri).toBe('xactions://doc/docs/0.md');
  });

  it('reads a resource back as text', async () => {
    serveMcp();
    const body = await createClient().mcp.readResource('xactions://doc/docs/7.md');
    expect(body).toContain('body 7');
  });

  it('renders a prompt', async () => {
    serveMcp();
    const prompt = await createClient().mcp.getPrompt('audit_account', { handle: 'nasa' });
    expect(prompt.messages[0].content.text).toContain('@nasa');
  });

  it('returns the full MCP result when asked for raw', async () => {
    serveMcp({ upstream: twitterUp() });
    const result = await createClient().mcp.call('x_post', { post: POST_ID }, { raw: true });
    expect(result.content[0].type).toBe('text');
    expect(result.structuredContent.post.id).toBe(POST_ID);
  });
});

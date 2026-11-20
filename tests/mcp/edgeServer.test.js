// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Protocol conformance for the hosted MCP server core.
 *
 * These run the real handler over real JSON-RPC messages. The two tools that
 * would otherwise reach x.com are driven through a fetch stub carrying response
 * bodies captured from the live endpoints, so the parsers under test are the
 * ones that ship.
 *
 * @author nich (@nichxbt)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  handleMessage,
  handlePayload,
  buildResourceIndex,
  negotiateProtocol,
  JSON_RPC_ERRORS,
  LATEST_PROTOCOL_VERSION,
  SUPPORTED_PROTOCOL_VERSIONS,
} from '../../src/mcp/edgeServer.js';
import { EDGE_TOOLS } from '../../src/mcp/edgeTools.js';
import { EDGE_PROMPTS } from '../../src/mcp/edgePrompts.js';

const TWEET_ID = '2092648130856571283';

const SYNDICATION_POST = {
  __typename: 'Tweet',
  id_str: TWEET_ID,
  text: 'Falcon Heavy in the hangar at pad 39A',
  created_at: '2026-08-26T12:00:00.000Z',
  lang: 'en',
  favorite_count: 10926,
  conversation_count: 345,
  user: { id_str: '34743251', screen_name: 'SpaceX', name: 'SpaceX', profile_image_url_https: 'https://pbs.twimg.com/a_normal.jpg', is_blue_verified: true },
  entities: { hashtags: [{ text: 'Starship' }], urls: [], user_mentions: [], symbols: [] },
  mediaDetails: [],
};

/** Fetch stub that only knows the syndication rail, so GraphQL falls through to it. */
function stubTwitter() {
  vi.stubGlobal('fetch', async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.includes('cdn.syndication.twimg.com')) {
      return new Response(JSON.stringify(SYNDICATION_POST), { status: 200 });
    }
    return new Response('', { status: 503 });
  });
}

const ctx = {
  // The real searcher returns raw index chunks, with the short keys the asset
  // uses. Anything richer here would test a shape that never ships.
  getSearcher: async () => ({
    search: (query) => (query.includes('nothing') ? [] : [
      { t: 'Video Downloader', u: 'https://xactions.app/docs/video-downloader', p: 'docs/video-downloader.md', k: 'doc', x: 'Download videos from any public post.', score: 9.1 },
    ]),
  }),
  getResources: async () => buildResourceIndex({
    chunks: [
      { t: 'Video Downloader', u: 'https://xactions.app/docs/video-downloader', p: 'docs/video-downloader.md', k: 'doc', x: 'part one' },
      { t: 'Video Downloader', u: 'https://xactions.app/docs/video-downloader', p: 'docs/video-downloader.md', k: 'doc', x: 'part two' },
      { t: 'Unfollow everyone', u: 'https://xactions.app/scripts/unfollow', p: 'browser/unfollowEveryone.js', k: 'script', x: 'a script' },
    ],
  }),
};

const rpc = (method, params, id = 1) => handleMessage({ jsonrpc: '2.0', id, method, params }, ctx);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('initialize', () => {
  it('echoes a protocol version it supports', async () => {
    for (const version of SUPPORTED_PROTOCOL_VERSIONS) {
      const response = await rpc('initialize', { protocolVersion: version, capabilities: {} });
      expect(response.result.protocolVersion).toBe(version);
    }
  });

  it('answers an unknown protocol version with its own', async () => {
    const response = await rpc('initialize', { protocolVersion: '1999-01-01', capabilities: {} });
    expect(response.result.protocolVersion).toBe(LATEST_PROTOCOL_VERSION);
    expect(negotiateProtocol(undefined)).toBe(LATEST_PROTOCOL_VERSION);
  });

  it('declares exactly the capabilities it implements', async () => {
    const { result } = await rpc('initialize', { protocolVersion: LATEST_PROTOCOL_VERSION });
    expect(Object.keys(result.capabilities).sort()).toEqual(['prompts', 'resources', 'tools']);
    expect(result.serverInfo.name).toBe('xactions');
    expect(result.instructions).toMatch(/no API key/i);
  });
});

describe('notifications', () => {
  it('returns nothing to send for a notification', async () => {
    expect(await handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }, ctx)).toBeNull();
    expect(await handleMessage({ jsonrpc: '2.0', method: 'notifications/cancelled' }, ctx)).toBeNull();
  });

  it('does not answer an unknown notification either', async () => {
    expect(await handleMessage({ jsonrpc: '2.0', method: 'notifications/made_up' }, ctx)).toBeNull();
  });
});

describe('tools', () => {
  it('lists every tool with a usable schema', async () => {
    const { result } = await rpc('tools/list');
    expect(result.tools).toHaveLength(EDGE_TOOLS.length);
    for (const tool of result.tools) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(tool.description.length).toBeGreaterThan(60);
      expect(tool.inputSchema.type).toBe('object');
      expect(Array.isArray(tool.inputSchema.required)).toBe(true);
      expect(tool.annotations.readOnlyHint).toBe(true);
    }
  });

  it('runs a tool and returns both prose and structured output', async () => {
    stubTwitter();
    const { result } = await rpc('tools/call', { name: 'x_post', arguments: { post: `https://x.com/SpaceX/status/${TWEET_ID}` } });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('@SpaceX');
    expect(result.structuredContent.post.id).toBe(TWEET_ID);
    expect(result.structuredContent.post.metrics.likes).toBe(10926);
    expect(result.structuredContent.post.entities.hashtags).toEqual(['Starship']);
  });

  it('reports bad input as a tool result, not a protocol error', async () => {
    const { result, error } = await rpc('tools/call', { name: 'x_post', arguments: { post: 'not-a-post' } });
    expect(error).toBeUndefined();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/post ID or an x\.com status URL/);
  });

  it('rejects an unknown tool at the protocol level', async () => {
    const { error } = await rpc('tools/call', { name: 'x_delete_everything', arguments: {} });
    expect(error.code).toBe(JSON_RPC_ERRORS.INVALID_PARAMS);
  });

  it('searches the docs without touching the network', async () => {
    const { result } = await rpc('tools/call', { name: 'xactions_docs', arguments: { query: 'how do I download a video' } });
    expect(result.isError).toBe(false);
    expect(result.structuredContent.results).toHaveLength(1);
    expect(result.structuredContent.results[0]).toMatchObject({
      title: 'Video Downloader',
      url: 'https://xactions.app/docs/video-downloader',
      kind: 'doc',
      text: 'Download videos from any public post.',
    });
    expect(result.content[0].text).toContain('https://xactions.app/docs/video-downloader');
  });

  it('says so plainly when the docs have no match', async () => {
    const { result } = await rpc('tools/call', { name: 'xactions_docs', arguments: { query: 'nothing at all' } });
    expect(result.structuredContent.results).toEqual([]);
    expect(result.content[0].text).toMatch(/Nothing in the XActions docs matched/);
  });
});

describe('resources', () => {
  it('collapses index chunks into one resource per source file', async () => {
    const { result } = await rpc('resources/list');
    expect(result.resources).toHaveLength(2);
    expect(result.resources.map((r) => r.uri)).toEqual([
      'xactions://doc/docs/video-downloader.md',
      'xactions://script/browser/unfollowEveryone.js',
    ]);
    expect(result.nextCursor).toBeUndefined();
  });

  it('reads a resource back with every chunk in order', async () => {
    const { result } = await rpc('resources/read', { uri: 'xactions://doc/docs/video-downloader.md' });
    expect(result.contents[0].mimeType).toBe('text/markdown');
    expect(result.contents[0].text).toContain('part one');
    expect(result.contents[0].text).toContain('part two');
  });

  it('rejects an unknown resource URI', async () => {
    const { error } = await rpc('resources/read', { uri: 'xactions://doc/nope.md' });
    expect(error.code).toBe(JSON_RPC_ERRORS.INVALID_PARAMS);
  });

  it('paginates a corpus larger than one page', async () => {
    const chunks = Array.from({ length: 250 }, (_, i) => ({ t: `Doc ${i}`, u: `https://x/${i}`, p: `docs/${i}.md`, k: 'doc', x: 'body' }));
    const big = { getResources: async () => buildResourceIndex({ chunks }) };
    const first = await handleMessage({ jsonrpc: '2.0', id: 1, method: 'resources/list' }, big);
    expect(first.result.resources).toHaveLength(100);
    expect(first.result.nextCursor).toBe('100');
    const last = await handleMessage({ jsonrpc: '2.0', id: 2, method: 'resources/list', params: { cursor: '200' } }, big);
    expect(last.result.resources).toHaveLength(50);
    expect(last.result.nextCursor).toBeUndefined();
  });
});

describe('prompts', () => {
  it('lists every prompt with its arguments', async () => {
    const { result } = await rpc('prompts/list');
    expect(result.prompts).toHaveLength(EDGE_PROMPTS.length);
    expect(result.prompts.map((p) => p.name)).toContain('audit_account');
  });

  it('renders a prompt with the argument substituted', async () => {
    const { result } = await rpc('prompts/get', { name: 'audit_account', arguments: { handle: 'nasa', goal: 'reach engineers' } });
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.text).toContain('@nasa');
    expect(result.messages[0].content.text).toContain('reach engineers');
  });

  it('refuses a prompt that is missing a required argument', async () => {
    const { error } = await rpc('prompts/get', { name: 'audit_account', arguments: {} });
    expect(error.code).toBe(JSON_RPC_ERRORS.INVALID_PARAMS);
    expect(error.message).toMatch(/handle/);
  });

  it('rejects an unknown prompt', async () => {
    const { error } = await rpc('prompts/get', { name: 'nope' });
    expect(error.code).toBe(JSON_RPC_ERRORS.INVALID_PARAMS);
  });
});

describe('JSON-RPC framing', () => {
  it('answers ping', async () => {
    expect((await rpc('ping')).result).toEqual({});
  });

  it('reports an unknown method', async () => {
    const { error } = await rpc('does/not/exist');
    expect(error.code).toBe(JSON_RPC_ERRORS.METHOD_NOT_FOUND);
  });

  it('rejects a message that is not a JSON-RPC object', async () => {
    expect((await handleMessage('nope', ctx)).error.code).toBe(JSON_RPC_ERRORS.INVALID_REQUEST);
    expect((await handleMessage({ jsonrpc: '2.0', id: 1 }, ctx)).error.code).toBe(JSON_RPC_ERRORS.INVALID_REQUEST);
  });

  it('answers a batch with one response per request and none for notifications', async () => {
    const responses = await handlePayload([
      { jsonrpc: '2.0', id: 1, method: 'ping' },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    ], ctx);
    expect(responses).toHaveLength(2);
    expect(responses.map((r) => r.id)).toEqual([1, 2]);
  });

  it('returns nothing to send for a batch of only notifications', async () => {
    expect(await handlePayload([{ jsonrpc: '2.0', method: 'notifications/initialized' }], ctx)).toBeNull();
  });

  it('rejects an empty batch', async () => {
    const response = await handlePayload([], ctx);
    expect(response.error.code).toBe(JSON_RPC_ERRORS.INVALID_REQUEST);
  });
});

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import { describe, expect, it } from 'vitest';
import {
  buildCatalog,
  labelFromOperationId,
  parseDocsMap,
  parseLimitCell,
  parseRateLimits,
  renderCatalog,
  renderEndpointsDoc,
} from '../../scripts/sync-x-api.mjs';

const spec = {
  openapi: '3.0.0',
  info: { title: 'Fixture API', version: '9.9' },
  servers: [{ url: 'https://api.example.test' }],
  components: {
    securitySchemes: {
      BearerToken: { type: 'http', scheme: 'bearer' },
      OAuth2UserToken: { type: 'oauth2', flows: { authorizationCode: { authorizationUrl: 'https://a.test/authorize', tokenUrl: 'https://a.test/token', scopes: { 'tweet.read': 'x', 'users.read': 'x', 'tweet.write': 'x' } } } },
      UserToken: { type: 'http', scheme: 'OAuth' },
    },
    parameters: {
      UserFields: { name: 'user.fields', in: 'query', schema: { type: 'array', items: { type: 'string', enum: ['id', 'name', 'username', 'created_at'] } }, explode: false },
    },
  },
  paths: {
    '/2/users/{id}': {
      get: {
        operationId: 'getUsersById',
        tags: ['Users'],
        summary: 'Prose that must not be copied',
        description: 'More prose that must not be copied',
        security: [{ BearerToken: [] }, { OAuth2UserToken: ['tweet.read', 'users.read'] }, { UserToken: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, description: 'prose', schema: { type: 'string', pattern: '^[0-9]{1,19}$' } },
          { $ref: '#/components/parameters/UserFields' },
        ],
      },
    },
    '/2/tweets': {
      post: {
        operationId: 'createPosts',
        tags: ['Posts'],
        security: [{ OAuth2UserToken: ['tweet.read', 'tweet.write', 'users.read'] }, { UserToken: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['text'], properties: { text: { type: 'string', description: 'prose' }, reply_settings: { type: 'string', enum: ['following', 'mentionedUsers'] } } } } } },
      },
    },
    '/2/openapi.json': { get: { operationId: 'getOpenApiSpec', tags: ['General'] } },
  },
};

describe('sync-x-api generator', () => {
  it('maps reference pages to their method and route', () => {
    const docs = 'Source: https://docs.x.com/x-api/users/get-user-by-id\n\nGET /2/users/{id}\nmore text\nSource: https://docs.x.com/x-api/posts/create-post\n\nPOST /2/tweets\n';
    const map = parseDocsMap(docs, '');
    expect(map.get('GET /2/users/{id}')).toBe('https://docs.x.com/x-api/users/get-user-by-id');
    expect(map.get('POST /2/tweets')).toBe('https://docs.x.com/x-api/posts/create-post');
  });

  it('keeps interface facts, drops prose, and skips the spec route itself', () => {
    const catalog = buildCatalog(spec, new Map([['GET /2/users/{id}', 'https://docs.x.com/x-api/users/get-user-by-id']]));
    expect(catalog.operations.map((op) => op.id).sort()).toEqual(['createPosts', 'getUsersById']);
    const get = catalog.operations.find((op) => op.id === 'getUsersById');
    expect(get).toMatchObject({ method: 'GET', path: '/2/users/{id}', tag: 'Users', write: false, docsUrl: 'https://docs.x.com/x-api/users/get-user-by-id' });
    expect(get.auth).toEqual({ bearer: true, oauth2User: ['tweet.read', 'users.read'], oauth1User: true });
    expect(get.params.find((p) => p.name === 'id')).toMatchObject({ in: 'path', required: true, pattern: '^[0-9]{1,19}$' });
    expect(get.params.find((p) => p.name === 'user.fields').items.enum).toContain('username');
    const post = catalog.operations.find((op) => op.id === 'createPosts');
    expect(post.write).toBe(true);
    expect(post.body.required).toBe(true);
    expect(post.body.properties.find((p) => p.name === 'text').required).toBe(true);
    expect(JSON.stringify(catalog)).not.toMatch(/prose/i);
  });

  it('renders an importable module that pools enum lists', async () => {
    const catalog = buildCatalog(spec, new Map());
    const source = renderCatalog(catalog, { title: 't', version: '9.9', server: 'https://api.example.test', specUrl: 'u', specSha256: 'h', docsUrl: 'd', fetchedAt: '2026-01-01T00:00:00.000Z' });
    expect(source).toContain('const E = [');
    const mod = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    expect(mod.OPERATIONS).toHaveLength(2);
    expect(mod.SOURCE.version).toBe('9.9');
    expect(mod.OPERATIONS.find((op) => op.id === 'getUsersById').params[1].items.enum).toEqual(['id', 'name', 'username', 'created_at']);
  });

  it('derives readable labels from operation ids', () => {
    expect(labelFromOperationId('getUsersFollowers')).toBe('get users followers');
    expect(labelFromOperationId('createDirectMessagesByParticipantId')).toBe('create direct messages by participant id');
  });

  it('parses rate limit cells and tables, numbers only', () => {
    expect(parseLimitCell('3,500/15min')).toEqual([{ requests: 3500, windowSeconds: 900 }]);
    expect(parseLimitCell('1/sec, 300/15min')).toEqual([{ requests: 1, windowSeconds: 1 }, { requests: 300, windowSeconds: 900 }]);
    expect(parseLimitCell('1,000/24hrs')).toEqual([{ requests: 1000, windowSeconds: 86400 }]);
    expect(parseLimitCell('\u2014')).toEqual([]);
    const docs = [
      'Source: https://docs.x.com/x-api/fundamentals/rate-limits',
      '',
      '| Method | Endpoint | Per App | Per User |',
      '| :- | :- | :- | :- |',
      '| GET | `/2/tweets/:id` | 450/15min | 900/15min |',
      '| POST | `/2/tweets` | \u2014 | 100/15min, 10,000/24hrs |',
      'Source: https://docs.x.com/other',
      '| GET | `/2/ignored` | 1/15min | 1/15min |',
    ].join('\n');
    expect(parseRateLimits(docs)).toEqual([
      { method: 'POST', path: '/2/tweets', limits: [{ scope: 'user', requests: 100, windowSeconds: 900 }, { scope: 'user', requests: 10000, windowSeconds: 86400 }] },
      { method: 'GET', path: '/2/tweets/{id}', limits: [{ scope: 'app', requests: 450, windowSeconds: 900 }, { scope: 'user', requests: 900, windowSeconds: 900 }] },
    ]);
  });

  it('renders the endpoint reference with auth, limits and links', () => {
    const catalog = buildCatalog(spec, new Map([['GET /2/users/{id}', 'https://docs.x.com/x-api/users/get-user-by-id']]));
    const md = renderEndpointsDoc(catalog, { version: '9.9', fetchedAt: '2026-01-01T00:00:00.000Z' }, [
      { method: 'GET', path: '/2/users/{user_id}', limits: [{ scope: 'app', requests: 300, windowSeconds: 900 }] },
    ]);
    expect(md).toContain('### `getUsersById`');
    expect(md).toContain('- Auth: B, U2, U1; scopes `tweet.read` `users.read`');
    expect(md).toContain('- Rate limit: 300/15m app');
    expect(md).toContain('- Reference: https://docs.x.com/x-api/users/get-user-by-id');
    expect(md).toContain('not affiliated');
  });
});

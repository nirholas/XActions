// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AUTHORIZE_URL,
  buildAuthorizeUrl,
  clearTokens,
  clientFromStore,
  createPkcePair,
  exchangeCode,
  loadTokens,
  normalizeToken,
  oauth1Header,
  percentEncode,
  saveTokens,
  signatureBaseString,
  tokenFilePath,
} from '../../src/xapi/index.js';
import { jsonResponse, scriptedFetch } from './helpers.js';

describe('OAuth 1.0a', () => {
  // RFC 5849 section 1.2 worked example.
  const rfc = {
    method: 'GET',
    url: 'http://photos.example.net/photos?file=vacation.jpg&size=original',
    credentials: { consumerKey: 'dpf43f3p2l4k3l03', consumerSecret: 'kd94hf93k423kf44', token: 'nnch734d00sl2jdk', tokenSecret: 'pfkkdhi9sl3r4s00' },
    nonce: 'chapoH',
    timestamp: 137131202,
  };

  it('reproduces the RFC 5849 signature from its base string', () => {
    // The RFC request omits the optional oauth_version, so sign exactly its parameter set.
    const params = [
      ['file', 'vacation.jpg'],
      ['size', 'original'],
      ['oauth_consumer_key', rfc.credentials.consumerKey],
      ['oauth_token', rfc.credentials.token],
      ['oauth_signature_method', 'HMAC-SHA1'],
      ['oauth_timestamp', String(rfc.timestamp)],
      ['oauth_nonce', rfc.nonce],
    ];
    const base = signatureBaseString(rfc.method, rfc.url, params);
    const key = `${rfc.credentials.consumerSecret}&${rfc.credentials.tokenSecret}`;
    expect(crypto.createHmac('sha1', key).update(base).digest('base64')).toBe('MdpQcU8iPSUjWoN/UDMsK2sui9I=');
  });

  it('builds a header whose signature covers every oauth_* value it sends', () => {
    const header = oauth1Header(rfc);
    expect(header.startsWith('OAuth ')).toBe(true);
    const fields = Object.fromEntries([...header.matchAll(/(\w+)="([^"]*)"/g)].map(([, k, v]) => [k, decodeURIComponent(v)]));
    expect(fields).toMatchObject({ oauth_version: '1.0', oauth_nonce: 'chapoH', oauth_timestamp: '137131202', oauth_token: 'nnch734d00sl2jdk' });
    const { oauth_signature: signature, ...signed } = fields;
    const base = signatureBaseString('GET', rfc.url, [...Object.entries(signed), ['file', 'vacation.jpg'], ['size', 'original']]);
    const key = `${rfc.credentials.consumerSecret}&${rfc.credentials.tokenSecret}`;
    expect(signature).toBe(crypto.createHmac('sha1', key).update(base).digest('base64'));
  });

  it('percent-encodes the RFC 3986 reserved set', () => {
    expect(percentEncode("Ladies + Gentlemen!*'()")).toBe('Ladies%20%2B%20Gentlemen%21%2A%27%28%29');
  });

  it('sorts parameters and strips the query from the base URL', () => {
    const base = signatureBaseString('post', 'https://api.x.com/2/tweets?b=2&a=1', [['b', '2'], ['a', '1']]);
    expect(base).toBe('POST&https%3A%2F%2Fapi.x.com%2F2%2Ftweets&a%3D1%26b%3D2');
  });
});

describe('OAuth 2.0 with PKCE', () => {
  it('derives an S256 challenge from the verifier', () => {
    const { verifier, challenge, method } = createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(challenge).toBe(crypto.createHash('sha256').update(verifier).digest('base64url'));
    expect(method).toBe('S256');
  });

  it('builds the authorize URL and refuses scopes the API does not have', () => {
    const url = new URL(buildAuthorizeUrl({ clientId: 'cid', redirectUri: 'http://127.0.0.1:3219/callback', scopes: ['tweet.read', 'users.read'], state: 's', codeChallenge: 'c' }));
    expect(`${url.origin}${url.pathname}`).toBe(AUTHORIZE_URL);
    expect(url.searchParams.get('scope')).toBe('tweet.read users.read');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(() => buildAuthorizeUrl({ clientId: 'cid', redirectUri: 'x', scopes: ['tweet.everything'], state: 's', codeChallenge: 'c' })).toThrow(/Unknown OAuth 2.0 scope/);
  });

  it('exchanges a code: public clients send client_id, confidential ones use Basic auth', async () => {
    const pub = scriptedFetch([jsonResponse(200, { access_token: 'A', refresh_token: 'R', expires_in: 7200, scope: 'tweet.read users.read', token_type: 'bearer' })]);
    const token = await exchangeCode({ clientId: 'cid', code: 'C', redirectUri: 'http://127.0.0.1:3219/callback', codeVerifier: 'V', fetch: pub.fetch });
    expect(token).toMatchObject({ accessToken: 'A', refreshToken: 'R', scopes: ['tweet.read', 'users.read'] });
    const body = new URLSearchParams(String(pub.calls[0].body));
    expect(body.get('client_id')).toBe('cid');
    expect(body.get('code_verifier')).toBe('V');
    expect(body.get('grant_type')).toBe('authorization_code');

    const conf = scriptedFetch([jsonResponse(200, { access_token: 'A', expires_in: 7200, token_type: 'bearer' })]);
    await exchangeCode({ clientId: 'cid', clientSecret: 'sec', code: 'C', redirectUri: 'r', codeVerifier: 'V', fetch: conf.fetch });
    const auth = conf.calls[0].headers.authorization ?? conf.calls[0].headers.Authorization;
    expect(auth).toBe(`Basic ${Buffer.from('cid:sec').toString('base64')}`);
  });

  it('turns expires_in into an absolute expiry', () => {
    expect(normalizeToken({ access_token: 'A', expires_in: 100 }, 1000).expiresAt).toBe(101_000);
  });
});

describe('token store', () => {
  let home;
  let env;
  beforeEach(async () => {
    home = await fs.mkdtemp(path.join(os.tmpdir(), 'xapi-tokens-'));
    env = { XACTIONS_HOME: home };
  });
  afterEach(async () => {
    await fs.rm(home, { recursive: true, force: true });
  });

  it('writes the token owner-only and never the client secret', async () => {
    const file = await saveTokens({ accessToken: 'A', refreshToken: 'R', clientId: 'cid', clientSecret: 'never' }, env);
    expect(file).toBe(tokenFilePath(env));
    const raw = await fs.readFile(file, 'utf8');
    expect(raw).not.toContain('never');
    if (process.platform !== 'win32') expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
    expect(await loadTokens(env)).toMatchObject({ accessToken: 'A', refreshToken: 'R', clientId: 'cid' });
    expect(await clearTokens(env)).toBe(true);
    expect(await loadTokens(env)).toBeNull();
  });

  it('builds a client from the stored token and persists refreshes', async () => {
    await saveTokens({ accessToken: 'OLD', refreshToken: 'R1', clientId: 'cid', expiresAt: 1 }, env);
    const scripted = scriptedFetch([
      jsonResponse(200, { access_token: 'NEW', refresh_token: 'R2', expires_in: 7200, token_type: 'bearer' }),
      jsonResponse(200, { data: { id: 'me' } }),
    ]);
    const c = await clientFromStore(env, { fetch: scripted.fetch });
    expect(c.credentials().oauth2).toBe(true);
    await c.call('getUsersMe', {});
    expect(scripted.calls[1].headers.authorization).toBe('Bearer NEW');
    expect(await loadTokens(env)).toMatchObject({ accessToken: 'NEW', refreshToken: 'R2', clientId: 'cid' });
  });

  it('lets an environment token win over the file', async () => {
    await saveTokens({ accessToken: 'FILE' }, env);
    const c = await clientFromStore({ ...env, X_OAUTH2_ACCESS_TOKEN: 'ENV' });
    expect(c.oauth2.accessToken).toBe('ENV');
  });
});

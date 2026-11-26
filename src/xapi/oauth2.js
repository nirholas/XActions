// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * OAuth 2.0 for the X API: the authorization code flow with PKCE for user
 * context, token refresh, revocation, and the app-only bearer token exchange.
 *
 * A public client (a CLI, a desktop app) sends only its client ID. A
 * confidential client (a server with a client secret) authenticates the token
 * request with HTTP Basic. Both are supported: pass `clientSecret` when the
 * app in the developer console is a confidential client.
 *
 * @module xactions/xapi/oauth2
 */

import crypto from 'node:crypto';
import { OAUTH2 } from './catalog.generated.js';
import { XApiError } from './errors.js';

export const AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize';
export const TOKEN_URL = OAUTH2.tokenUrl;
export const REVOKE_URL = 'https://api.x.com/2/oauth2/revoke';
export const BEARER_TOKEN_URL = 'https://api.x.com/oauth2/token';

/** Every scope name the catalog knows, for validation and `--scopes all`. */
export const SCOPES = OAUTH2.scopes;

/** A read-oriented starting set that also keeps a refresh token. */
export const DEFAULT_SCOPES = Object.freeze(['tweet.read', 'users.read', 'offline.access']);

const base64url = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * A fresh PKCE verifier and its S256 challenge.
 * @returns {{verifier: string, challenge: string, method: 'S256'}}
 */
export function createPkcePair() {
  const verifier = base64url(crypto.randomBytes(48));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge, method: 'S256' };
}

/** An unguessable `state` value to tie the callback to this attempt. */
export function createState() {
  return base64url(crypto.randomBytes(24));
}

/**
 * The URL to send the user to.
 *
 * @param {object} args
 * @param {string} args.clientId
 * @param {string} args.redirectUri   must match a callback URL registered on the app
 * @param {string[]} [args.scopes]
 * @param {string} args.state
 * @param {string} args.codeChallenge
 * @param {string} [args.authorizeUrl]
 */
export function buildAuthorizeUrl({ clientId, redirectUri, scopes = DEFAULT_SCOPES, state, codeChallenge, authorizeUrl = AUTHORIZE_URL }) {
  if (!clientId) throw new XApiError('OAuth 2.0 needs a client ID (X_CLIENT_ID)', { code: 'auth_required' });
  const unknown = scopes.filter((s) => !SCOPES.includes(s));
  if (unknown.length) throw new XApiError(`Unknown OAuth 2.0 scope: ${unknown.join(', ')}`, { code: 'invalid_params', issues: unknown });
  const url = new URL(authorizeUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

function basic(clientId, clientSecret) {
  return `Basic ${Buffer.from(`${encodeURIComponent(clientId)}:${encodeURIComponent(clientSecret)}`).toString('base64')}`;
}

async function tokenRequest(url, form, { clientId, clientSecret, fetch: fetchImpl = globalThis.fetch }) {
  const headers = { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' };
  const body = new URLSearchParams(form);
  if (clientSecret) headers.authorization = basic(clientId, clientSecret);
  else body.set('client_id', clientId);
  let res;
  try {
    res = await fetchImpl(url, { method: 'POST', headers, body: body.toString() });
  } catch (cause) {
    throw new XApiError(`Could not reach ${url}: ${cause.message}`, { code: 'network_error', cause });
  }
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const detail = json?.error_description ?? json?.detail ?? json?.error ?? text.slice(0, 300);
    throw new XApiError(`Token request failed (${res.status}): ${detail}`, { code: res.status === 401 ? 'auth_required' : 'http_error', status: res.status, body: json ?? text });
  }
  return json ?? {};
}

/**
 * Normalise a token response into what the client stores.
 * @returns {{accessToken: string, refreshToken: string|null, expiresAt: number|null, scopes: string[], tokenType: string}}
 */
export function normalizeToken(json, now = Date.now()) {
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in ? now + Number(json.expires_in) * 1000 : null,
    scopes: typeof json.scope === 'string' ? json.scope.split(/\s+/).filter(Boolean) : [],
    tokenType: json.token_type ?? 'bearer',
  };
}

/** Trade the authorization code for tokens. */
export async function exchangeCode({ clientId, clientSecret, code, redirectUri, codeVerifier, fetch, tokenUrl = TOKEN_URL }) {
  const json = await tokenRequest(
    tokenUrl,
    { grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: codeVerifier },
    { clientId, clientSecret, fetch },
  );
  return normalizeToken(json);
}

/** Use a refresh token (needs the offline.access scope at authorization). */
export async function refreshAccessToken({ clientId, clientSecret, refreshToken, fetch, tokenUrl = TOKEN_URL, now = Date.now() }) {
  if (!refreshToken) throw new XApiError('No refresh token. Authorize again with the offline.access scope.', { code: 'auth_required' });
  const json = await tokenRequest(tokenUrl, { grant_type: 'refresh_token', refresh_token: refreshToken }, { clientId, clientSecret, fetch });
  const token = normalizeToken(json, now);
  if (!token.refreshToken) token.refreshToken = refreshToken;
  return token;
}

/** Revoke an access or refresh token. */
export async function revokeToken({ clientId, clientSecret, token, tokenTypeHint = 'access_token', fetch, revokeUrl = REVOKE_URL }) {
  await tokenRequest(revokeUrl, { token, token_type_hint: tokenTypeHint }, { clientId, clientSecret, fetch });
  return true;
}

/**
 * Exchange the app's API key and secret for an app-only bearer token
 * (client credentials grant). The developer console also shows this token
 * directly, so most users can paste it into X_BEARER_TOKEN instead.
 */
export async function fetchBearerToken({ apiKey, apiSecret, fetch: fetchImpl = globalThis.fetch, url = BEARER_TOKEN_URL }) {
  let res;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { authorization: basic(apiKey, apiSecret), 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: 'grant_type=client_credentials',
    });
  } catch (cause) {
    throw new XApiError(`Could not reach ${url}: ${cause.message}`, { code: 'network_error', cause });
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) {
    throw new XApiError(`Bearer token request failed (${res.status})`, { code: 'auth_required', status: res.status, body: json });
  }
  return json.access_token;
}

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * OAuth 1.0a request signing (RFC 5849, HMAC-SHA1), the user-context scheme
 * the X API calls "UserToken". Needs the app's consumer key and secret plus
 * the user's access token and secret, all four from the developer console.
 *
 * Query parameters and application/x-www-form-urlencoded body parameters are
 * part of the signature. JSON and multipart bodies are not (RFC 5849 section
 * 3.4.1.3.1), which is what the X API expects for v2 JSON endpoints.
 *
 * @module xactions/xapi/oauth1
 */

import crypto from 'node:crypto';

/** RFC 3986 percent-encoding, stricter than encodeURIComponent. */
export function percentEncode(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * Build the signature base string.
 *
 * @param {string} method
 * @param {string} url             with or without a query string
 * @param {Array<[string, string]>} params  oauth_* plus query plus form params
 */
export function signatureBaseString(method, url, params) {
  const u = new URL(url);
  const base = `${u.protocol}//${u.host.toLowerCase()}${u.pathname}`;
  const normalized = params
    .map(([k, v]) => [percentEncode(k), percentEncode(v)])
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [method.toUpperCase(), percentEncode(base), percentEncode(normalized)].join('&');
}

/**
 * Produce the Authorization header value for one request.
 *
 * @param {object} args
 * @param {string} args.method
 * @param {string} args.url                    full URL including any query string
 * @param {Record<string, string>} [args.form] urlencoded body params, if the body is a form
 * @param {object} args.credentials
 * @param {string} args.credentials.consumerKey
 * @param {string} args.credentials.consumerSecret
 * @param {string} [args.credentials.token]
 * @param {string} [args.credentials.tokenSecret]
 * @param {string} [args.nonce]      fixed only in tests
 * @param {string|number} [args.timestamp]  fixed only in tests
 * @returns {string}
 */
export function oauth1Header({ method, url, form, credentials, nonce, timestamp }) {
  const { consumerKey, consumerSecret, token, tokenSecret } = credentials;
  if (!consumerKey || !consumerSecret) throw new TypeError('OAuth 1.0a needs consumerKey and consumerSecret');
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: nonce ?? crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(timestamp ?? Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
  };
  if (token) oauth.oauth_token = token;

  const u = new URL(url);
  const params = [...Object.entries(oauth), ...u.searchParams.entries(), ...Object.entries(form ?? {})];
  const base = signatureBaseString(method, url, params);
  const key = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret ?? '')}`;
  oauth.oauth_signature = crypto.createHmac('sha1', key).update(base).digest('base64');

  return (
    'OAuth ' +
    Object.keys(oauth)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauth[k])}"`)
      .join(', ')
  );
}

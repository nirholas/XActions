// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Proxied Fetch Factory
 *
 * Builds per-account WHATWG fetch wrappers that route through an HTTP(S) or
 * SOCKS proxy using undici dispatchers injected per call. Never falls back to a
 * direct connection: a broken proxy throws so the caller can park the account.
 *
 * @author nich (@nichxbt)
 * @license MIT
 */

import { ProxyAgent } from 'undici';

const HTTP_PROTOCOLS = ['http:', 'https:'];
const SOCKS_PROTOCOLS = ['socks:', 'socks4:', 'socks5:', 'socks5h:'];
const IP_ECHO_URL = 'https://api.ipify.org?format=json';

/**
 * Per-request ceiling. `TwitterHttpClient.request()` passes no `signal`, so
 * without this a half-open proxy — one that answers the self-test but blackholes
 * x.com — would hold a fleet slot for undici's 300s header timeout × 4 attempts
 * (~20 minutes), silently, while the concurrency cap starves the rest of the run.
 */
const REQUEST_TIMEOUT_MS = 45_000;

/**
 * Strip credentials from a proxy URL so they never reach a log line or report.
 *
 * @param {string|null|undefined} proxyUrl
 * @returns {string|null}
 */
export function redactProxy(proxyUrl) {
  if (!proxyUrl) return null;
  try {
    const url = new URL(proxyUrl);
    return `${url.protocol}//${url.username ? '***@' : ''}${url.host}`;
  } catch {
    return '<unparseable proxy url>';
  }
}

/**
 * Build an undici Dispatcher for a proxy URL.
 *
 * @param {string|null|undefined} proxyUrl - e.g. http://user:pass@host:8080 or socks5://host:1080
 * @returns {Promise<import('undici').Dispatcher|null>} dispatcher, or null when no proxy is configured
 * @throws {Error} when the URL is unparseable, the scheme is unsupported, or fetch-socks is missing
 */
export const buildDispatcher = async (proxyUrl) => {
  if (!proxyUrl) return null;

  let url;
  try {
    url = new URL(proxyUrl);
  } catch {
    throw new Error(`❌ Invalid proxy URL (expected scheme://[user:pass@]host:port)`);
  }

  if (HTTP_PROTOCOLS.includes(url.protocol)) {
    // undici's ProxyAgent understands credentials embedded in the URL.
    return new ProxyAgent(proxyUrl);
  }

  if (SOCKS_PROTOCOLS.includes(url.protocol)) {
    let socksDispatcher;
    try {
      ({ socksDispatcher } = await import('fetch-socks'));
    } catch (err) {
      throw new Error(
        `❌ SOCKS proxy requires the "fetch-socks" package (${url.protocol}//${url.host}). ` +
          `Run: npm install fetch-socks — original error: ${err.message}`
      );
    }

    const options = {
      type: url.protocol === 'socks4:' ? 4 : 5,
      host: url.hostname,
      port: Number(url.port),
    };
    if (url.username) options.userId = decodeURIComponent(url.username);
    if (url.password) options.password = decodeURIComponent(url.password);

    return socksDispatcher(options);
  }

  throw new Error(
    `❌ Unsupported proxy scheme "${url.protocol}" — supported: ${[...HTTP_PROTOCOLS, ...SOCKS_PROTOCOLS].join(', ')}`
  );
};

/**
 * Create a fetch function bound to a proxy (or the plain global fetch when none).
 *
 * @param {string|null|undefined} proxyUrl - proxy URL, or falsy for explicit proxy-less mode
 * @returns {Promise<Function>} fetch(url, init) returning a real Response; carries .dispatcher/.proxyUrl
 * @throws {Error} when the proxy cannot be built (never silently goes direct)
 */
export const makeProxiedFetch = async (proxyUrl) => {
  if (!proxyUrl) {
    const directFetch = (url, init = {}) =>
      globalThis.fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    directFetch.dispatcher = null;
    directFetch.proxyUrl = null;
    return directFetch;
  }

  const dispatcher = await buildDispatcher(proxyUrl);
  const proxiedFetch = (url, init = {}) =>
    globalThis.fetch(url, {
      ...init,
      dispatcher,
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  proxiedFetch.dispatcher = dispatcher;
  proxiedFetch.proxyUrl = proxyUrl;
  return proxiedFetch;
};

/**
 * Query the public egress IP seen by a given fetch implementation.
 *
 * @param {Function} fetchImpl - fetch function to probe with (e.g. globalThis.fetch for baseline)
 * @param {{ timeoutMs?: number }} [options] - abort timeout in milliseconds
 * @returns {Promise<string>} the egress IPv4/IPv6 address
 * @throws {Error} on network failure, non-2xx status, or a malformed payload
 */
export const fetchPublicIp = async (fetchImpl, { timeoutMs = 15000 } = {}) => {
  const res = await fetchImpl(IP_ECHO_URL, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`ip echo returned HTTP ${res.status}`);
  const data = await res.json();
  if (!data || !data.ip) throw new Error('ip echo returned no "ip" field');
  return data.ip;
};

/**
 * Verify a proxy actually routes traffic away from the local egress IP.
 *
 * @param {string} proxyUrl - proxy URL to test
 * @param {{ baselineIp?: string, timeoutMs?: number }} [options] - un-proxied IP to compare against
 * @returns {Promise<{ok: boolean, ip: string|null, baselineIp: string|null, proxyUrl: string, error: string|null}>}
 */
export const proxySelfTest = async (proxyUrl, { baselineIp = null, timeoutMs = 15000 } = {}) => {
  let fetchImpl = null;
  try {
    fetchImpl = await makeProxiedFetch(proxyUrl);
    const ip = await fetchPublicIp(fetchImpl, { timeoutMs });

    if (baselineIp && ip === baselineIp) {
      console.log(`⚠️ Proxy self-test failed for ${redactProxy(proxyUrl)}: egress IP equals baseline ${ip}`);
      return {
        ok: false,
        ip,
        baselineIp,
        proxyUrl,
        error: 'proxy not routing (egress IP equals baseline)',
      };
    }

    console.log(`✅ Proxy self-test passed for ${redactProxy(proxyUrl)} (egress IP ${ip})`);
    return { ok: true, ip, baselineIp, proxyUrl, error: null };
  } catch (err) {
    console.log(`❌ Proxy self-test error for ${redactProxy(proxyUrl)}: ${err.message}`);
    return { ok: false, ip: null, baselineIp, proxyUrl, error: err.message };
  } finally {
    await closeFetch(fetchImpl);
  }
};

/**
 * Close the undici pool behind a fetch function so the process can exit cleanly.
 *
 * @param {Function|null|undefined} fetchFn - fetch function produced by makeProxiedFetch
 * @returns {Promise<void>} resolves even when teardown fails
 */
export const closeFetch = async (fetchFn) => {
  try {
    await fetchFn?.dispatcher?.close?.();
  } catch (err) {
    console.log(`⚠️ Failed to close proxy dispatcher: ${err.message}`);
  }
};

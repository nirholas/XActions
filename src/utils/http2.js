// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * HTTP/2 dispatcher for requests to X.
 *
 * Node's fetch speaks HTTP/1.1 unless told otherwise, and X's edge treats that
 * as a bot signal on some operations: `UserByRestId` answered a plain h1 call
 * with a Cloudflare challenge page (HTML, `server: cloudflare`) every single
 * time, while the identical request over h2 returned the profile. A browser
 * negotiates h2, so this is the client matching the traffic it imitates.
 *
 * The dispatcher is opt-out with `XACTIONS_HTTP2=0`, and it is only attached
 * to requests that go through the global fetch: a caller that supplies its own
 * fetch owns its own transport and is left alone. Servers without h2 negotiate
 * http/1.1 over ALPN, so nothing is lost on hosts that do not support it.
 *
 * @module utils/http2
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

/** @type {Promise<object|null>|null} Shared agent, created once per process. */
let agentPromise = null;

const FALSEY_RE = /^(0|off|false|no)$/i;

/**
 * Whether HTTP/2 has been switched off for this process.
 * @returns {boolean}
 */
export function isHttp2Disabled() {
  return FALSEY_RE.test(process.env.XACTIONS_HTTP2 ?? '');
}

/**
 * The shared HTTP/2-capable dispatcher, or null when it cannot be built
 * (no `undici` installed, or `XACTIONS_HTTP2=0`).
 *
 * Resolves once and is reused: an undici `Agent` pools connections, so
 * building one per request would defeat the point.
 *
 * @returns {Promise<object|null>}
 */
export function http2Dispatcher() {
  if (isHttp2Disabled()) return Promise.resolve(null);
  if (!agentPromise) {
    agentPromise = import('undici')
      .then(({ Agent }) => new Agent({ allowH2: true }))
      .catch(() => null);
  }
  return agentPromise;
}

/**
 * Attach the HTTP/2 dispatcher to a fetch init, unless the caller already
 * chose one. Mutates and returns `init`.
 *
 * @param {object} init - fetch init, mutated in place
 * @param {typeof globalThis.fetch} fetchFn - the fetch this init is for
 * @returns {Promise<object>} The same init
 */
export async function withHttp2(init, fetchFn) {
  if (fetchFn !== globalThis.fetch) return init;
  if (init.dispatcher) return init;
  const dispatcher = await http2Dispatcher();
  if (dispatcher) init.dispatcher = dispatcher;
  return init;
}

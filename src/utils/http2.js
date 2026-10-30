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
 * to requests that go through the platform fetch (Node's built-in global
 * fetch): a caller that supplies its own fetch, or code that has replaced the
 * global one (a test stub, an interceptor), owns its own transport and is left
 * alone. Servers without h2 negotiate http/1.1 over ALPN, so nothing is lost
 * on hosts that do not support it.
 *
 * A dispatcher built from the `undici` package must be sent with that same
 * package's fetch, never Node's global one: Node bundles its own undici, and
 * the two speak different dispatch-handler APIs across majors (Node 24's
 * built-in fetch, undici 7, fails every request on an undici 8 Agent with
 * "invalid onRequestStart method"). `fetchWithDispatcher` makes that pairing.
 *
 * @module utils/http2
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

/** @type {Promise<object|null>|null} The `undici` module, or null when not installed. */
let undiciPromise = null;

/** @type {Promise<object|null>|null} Shared agent, created once per process. */
let agentPromise = null;

/**
 * Node's built-in fetch, recognised by its source. Identity alone is not
 * enough: a test stub or an interceptor (vi.stubGlobal, MSW) replaces the
 * global, sometimes before this module first loads, and must keep receiving
 * the request. tests/http-scraper/undici-dispatcher.test.js fails if a Node
 * release changes this signature.
 */
const NODE_FETCH_SOURCE = /^function fetch\(input, init = undefined\)/;

function loadUndici() {
  if (!undiciPromise) undiciPromise = import('undici').catch(() => null);
  return undiciPromise;
}

const FALSEY_RE = /^(0|off|false|no)$/i;

/**
 * Whether `fetchFn` is the platform fetch (the global fetch, still Node's
 * built-in one), the only one this module routes through an undici dispatcher.
 * @param {Function} fetchFn
 * @returns {boolean}
 */
export function isPlatformFetch(fetchFn) {
  return (
    typeof fetchFn === 'function' &&
    fetchFn === globalThis.fetch &&
    NODE_FETCH_SOURCE.test(Function.prototype.toString.call(fetchFn))
  );
}

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
    agentPromise = loadUndici()
      .then((undici) => (undici ? new undici.Agent({ allowH2: true }) : null))
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
  if (!isPlatformFetch(fetchFn)) return init;
  if (init.dispatcher) return init;
  const dispatcher = await http2Dispatcher();
  if (dispatcher) init.dispatcher = dispatcher;
  return init;
}

/**
 * Send a request, pairing an undici dispatcher with undici's own fetch.
 *
 * When `fetchFn` is the platform fetch and `init.dispatcher` was built from the
 * installed `undici` package (the HTTP/2 agent, a ProxyAgent), the request goes
 * through `undici.fetch` so dispatcher and fetch share one version. Anything
 * else (a custom or replaced fetch, no dispatcher, a dispatcher from another
 * undici copy) is sent with `fetchFn` unchanged.
 *
 * undici's fetch only recognises its own FormData class and would send Node's
 * global one as the text "[object FormData]", so such a body is encoded to
 * multipart bytes first, with the boundary carried in the content type.
 *
 * @param {typeof globalThis.fetch} fetchFn - the fetch the caller configured
 * @param {string|URL} url
 * @param {object} init - fetch init, possibly carrying a `dispatcher`
 * @returns {Promise<Response>}
 */
export async function fetchWithDispatcher(fetchFn, url, init) {
  if (isPlatformFetch(fetchFn) && init?.dispatcher) {
    const undici = await loadUndici();
    if (undici && init.dispatcher instanceof undici.Dispatcher) {
      return undici.fetch(url, await encodeForeignFormData(init, undici.FormData));
    }
  }
  return fetchFn(url, init);
}

/**
 * Replace a FormData body that is not `OwnFormData` with its multipart encoding.
 * Returns `init` untouched when there is nothing to convert.
 * @param {object} init
 * @param {Function} OwnFormData - the FormData class the target fetch understands
 * @returns {Promise<object>}
 */
async function encodeForeignFormData(init, OwnFormData) {
  const { body } = init;
  if (typeof FormData === 'undefined' || !(body instanceof FormData) || body instanceof OwnFormData) {
    return init;
  }
  const encoded = new Response(body);
  const headers = new Headers(init.headers);
  headers.set('content-type', encoded.headers.get('content-type'));
  return {
    ...init,
    headers: Object.fromEntries(headers),
    body: new Uint8Array(await encoded.arrayBuffer()),
  };
}

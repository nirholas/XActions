// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * x402 payment gate for the edge API.
 *
 * There is no account, no API key and no login on the paid endpoints. The
 * payment is the authentication: an unpaid request gets HTTP 402 with the terms,
 * the caller signs a stablecoin transfer with its own wallet and retries with
 * the signed payload, and the server verifies and settles it through a
 * facilitator. The payer's address is the only identity involved, and it arrives
 * as a byproduct of the payment rather than as a separate credential.
 *
 * Two protocol versions are on the wire in the wild, so both are spoken:
 *
 *   v1  JSON body `{ x402Version: 1, accepts: [...] }`, request header
 *       `X-PAYMENT`, response header `X-PAYMENT-RESPONSE`
 *   v2  base64 `PAYMENT-REQUIRED` header, request header `PAYMENT-SIGNATURE`,
 *       response header `PAYMENT-RESPONSE`
 *
 * A challenge carries both, and a payment is read from whichever header the
 * client used, so an older x402 client and a current one both work unchanged.
 *
 * Every entry in `accepts` is a chain the operator will take money on. Solana is
 * listed first: sub-second finality and fees around $0.00025 are what make a
 * $0.001 API call viable at all.
 *
 * @module src/edge/x402
 * @author nichxbt
 */

import { corsHeaders } from '../video/edgeHttp.js';
import { loadApiModules } from './apiModules.js';
import { getSupported, settleable } from './facilitator.js';

/** Header pairs, newest first. Order matters only for which one we read first. */
const PAYMENT_REQUEST_HEADERS = ['payment-signature', 'x-payment'];

/** Default facilitator. Overridden with X402_FACILITATOR_URL. */
/**
 * PayAI's facilitator: no key, and it settles Base and Solana mainnet, which the
 * x402.org reference facilitator does not (that one is testnet-only). Override
 * with X402_FACILITATOR_URL.
 */
export const DEFAULT_FACILITATOR = 'https://facilitator.payai.network';

/**
 * base64 for a JSON value, without Buffer, so this runs unchanged on the edge.
 * @param {unknown} value
 * @returns {string}
 */
export function encodeBase64Json(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Decode a base64 JSON header value. Returns null on anything malformed rather
 * than throwing, because the value comes from an untrusted client.
 * @param {string|null} header
 * @returns {object|null}
 */
export function decodeBase64Json(header) {
  if (!header) return null;
  try {
    const binary = atob(header.trim());
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/**
 * The payment payload a client attached, from either protocol version's header.
 * @param {Request} request
 * @returns {{ payload: object, header: string }|null}
 */
export function readPayment(request) {
  for (const name of PAYMENT_REQUEST_HEADERS) {
    const raw = request.headers.get(name);
    if (!raw) continue;
    const payload = decodeBase64Json(raw);
    if (payload) return { payload, header: name };
  }
  return null;
}

/**
 * Build the PaymentRequired document for a priced resource.
 *
 * Each `accepts` entry carries both `amount` (v2) and `maxAmountRequired` (v1)
 * so a client of either generation reads the same number.
 *
 * @param {object} options
 * @param {object} options.api - The loaded x402 config module.
 * @param {string} options.price - Dollar string, e.g. '$0.001'.
 * @param {string} options.resource - Absolute URL of the paid resource.
 * @param {string} options.description
 * @param {string} [options.error] - Why payment is being asked for.
 * @returns {object|null} null when no chain is configured to receive.
 */
export function buildPaymentRequired({ api, price, resource, description, error, method = 'POST', supported }) {
  const configured = api.buildAccepts({ price, resource, description });
  const accepts = supported ? settleable(configured, supported, api.toV1Network) : configured;
  if (!accepts.length) return null;
  return {
    x402Version: 1,
    error: error || 'Payment required',
    resource: { url: resource, method, description, mimeType: 'application/json' },
    // v1 names a chain `base` or `solana`; CAIP-2 arrived with v2. A v1 client
    // handed `eip155:8453` treats the whole challenge as unparseable, so the
    // body speaks v1 and the PAYMENT-REQUIRED header speaks v2.
    accepts: accepts.map((entry) => ({
      ...entry,
      network: api.toV1Network(entry.network),
      amount: entry.amount,
      maxAmountRequired: entry.amount,
    })),
    // The CAIP-2 view of the same terms, for a client that reads v2.
    'x-x402-v2': {
      x402Version: 2,
      resource: { url: resource, method, description, mimeType: 'application/json' },
      accepts,
    },
  };
}

/**
 * The 402 response: v1 JSON body plus the v2 `PAYMENT-REQUIRED` header.
 * @param {Request} request
 * @param {object} paymentRequired
 * @returns {Response}
 */
export function paymentRequiredResponse(request, paymentRequired) {
  const { 'x-x402-v2': v2, ...v1 } = paymentRequired;
  return new Response(JSON.stringify(v1), {
    status: 402,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'payment-required': encodeBase64Json(v2 || v1),
      ...corsHeaders(request),
    },
  });
}

/**
 * Ask the facilitator whether a payment payload satisfies the requirements.
 * @param {string} facilitator
 * @param {object} paymentPayload
 * @param {object} paymentRequirements - In the same protocol version as the payload.
 * @param {number} [x402Version] - The payload's version; v2 requirements name CAIP-2 networks.
 * @returns {Promise<{ isValid: boolean, payer?: string, invalidReason?: string }>}
 */
export async function verifyPayment(facilitator, paymentPayload, paymentRequirements, x402Version = 1) {
  const response = await fetch(`${facilitator.replace(/\/+$/, '')}/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ x402Version, paymentPayload, paymentRequirements }),
  });
  if (!response.ok) {
    // Pass the facilitator's own words through. "HTTP 400" tells a caller
    // nothing they can act on; "invalid transaction signature" does.
    const detail = await response.text().catch(() => '');
    return {
      isValid: false,
      invalidReason: `facilitator /verify HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`,
    };
  }
  return response.json();
}

/**
 * Broadcast the payment. Called only after the work succeeded, so a caller is
 * never charged for a response they did not get.
 * @param {string} facilitator
 * @param {object} paymentPayload
 * @param {object} paymentRequirements - In the same protocol version as the payload.
 * @param {number} [x402Version]
 * @returns {Promise<{ success: boolean, transaction?: string, network?: string, payer?: string, errorReason?: string }>}
 */
export async function settlePayment(facilitator, paymentPayload, paymentRequirements, x402Version = 1) {
  const response = await fetch(`${facilitator.replace(/\/+$/, '')}/settle`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ x402Version, paymentPayload, paymentRequirements }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return {
      success: false,
      errorReason: `facilitator /settle HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`,
    };
  }
  return response.json();
}

/**
 * Match the client's chosen terms against the ones we published, so a client
 * cannot pay a cent on a chain we never offered and claim it covered a dollar.
 * @param {object[]} accepts
 * @param {object} paymentPayload
 * @returns {object|null}
 */
export function matchRequirements(accepts, paymentPayload, sameNetwork) {
  const chosen = paymentPayload?.accepted || paymentPayload;
  const network = chosen?.network;
  const scheme = chosen?.scheme || 'exact';
  return (
    accepts.find(
      (entry) => entry.scheme === scheme && sameNetwork(entry.network, network),
    ) || null
  );
}

/**
 * Wrap a handler so it costs money.
 *
 * The order is deliberate: verify, then run the work, then settle. Settling
 * last means a failure inside the handler costs the caller nothing, and the
 * receipt returned in `PAYMENT-RESPONSE` always corresponds to a response the
 * caller actually received.
 *
 * When no receiving address is configured the endpoint stays free rather than
 * refusing: an operator self-hosting XActions without x402 gets a working API.
 *
 * @param {object} options
 * @param {string} options.price - Dollar string, e.g. '$0.001'.
 * @param {string} options.description
 * @param {(context: object) => Promise<Response>} handler
 * @returns {(context: object) => Promise<Response>}
 */
export function withX402({ price, description }, handler) {
  return async function paid(context) {
    const { request, env } = context;
    const api = await loadApiModules(env);
    const cors = corsHeaders(request);

    if (!api.isX402Configured()) return handler({ ...context, payment: null });

    const url = new URL(request.url);
    // Query parameters are inputs, not part of the resource identity: an agent
    // that reads the terms for ?username=nasa must be able to reuse them.
    const resource = `${url.origin}${url.pathname}`;
    const facilitator = env.X402_FACILITATOR_URL || api.FACILITATOR_URL || DEFAULT_FACILITATOR;
    const supported = await getSupported(facilitator);
    const paymentRequired = buildPaymentRequired({
      api,
      price,
      resource,
      description,
      method: request.method,
      supported,
    });
    if (!paymentRequired) return handler({ ...context, payment: null });

    const attached = readPayment(request);
    if (!attached) return paymentRequiredResponse(request, paymentRequired);

    // Answer a payment in the protocol version it was made in. A v2 client pays
    // against the CAIP-2 terms from the PAYMENT-REQUIRED header; handing the
    // facilitator the v1 view (network "solana") with a v2 payload is refused
    // with "x402Version 2 requires CAIP-2 network format".
    const version = attached.payload?.x402Version === 2 ? 2 : 1;
    const published = version === 2 ? paymentRequired['x-x402-v2'].accepts : paymentRequired.accepts;
    const requirements = matchRequirements(published, attached.payload, api.sameNetwork);
    if (!requirements) {
      return paymentRequiredResponse(request, {
        ...paymentRequired,
        error: 'Payment names a network or scheme this resource does not accept',
      });
    }

    const verification = await verifyPayment(facilitator, attached.payload, requirements, version);
    if (!verification.isValid) {
      return paymentRequiredResponse(request, {
        ...paymentRequired,
        error: verification.invalidReason || 'Payment could not be verified',
      });
    }

    const response = await handler({ ...context, payment: { payer: verification.payer, requirements } });
    if (response.status >= 400) return response;

    const settlement = await settlePayment(facilitator, attached.payload, requirements, version);
    if (!settlement.success) {
      return new Response(
        JSON.stringify({
          error: 'settlement_failed',
          message: settlement.errorReason || 'The facilitator could not settle this payment.',
        }),
        { status: 502, headers: { 'content-type': 'application/json', ...cors } },
      );
    }

    const receipt = encodeBase64Json(settlement);
    const headers = new Headers(response.headers);
    headers.set('x-payment-response', receipt);
    headers.set('payment-response', receipt);
    return new Response(response.body, { status: response.status, headers });
  };
}

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Helpers for receiving X API webhooks (Account Activity API v2 and the
 * X Activity API webhook delivery).
 *
 * Two checks matter:
 *
 *   1. The CRC challenge. When a webhook is registered, and periodically
 *      after that, X sends GET <your url>?crc_token=<token>. Answer with
 *      JSON {"response_token": "sha256=<base64 HMAC-SHA256 of the token,
 *      keyed with the app's consumer secret>"}, or X marks the webhook
 *      invalid.
 *   2. The signature on each delivery. Every POST carries
 *      x-twitter-webhooks-signature: sha256=<base64 HMAC-SHA256 of the raw
 *      request body, same key>. Compare it in constant time before trusting
 *      the payload.
 *
 * @module xactions/xapi/webhooks
 */

import crypto from 'node:crypto';

export const SIGNATURE_HEADER = 'x-twitter-webhooks-signature';

function hmac(secret, data) {
  return `sha256=${crypto.createHmac('sha256', secret).update(data).digest('base64')}`;
}

/**
 * The body to answer a CRC challenge with.
 * @param {string} crcToken
 * @param {string} consumerSecret
 * @returns {{response_token: string}}
 */
export function crcResponse(crcToken, consumerSecret) {
  if (!crcToken) throw new TypeError('crc_token is required');
  if (!consumerSecret) throw new TypeError('the app consumer secret is required to answer a CRC challenge');
  return { response_token: hmac(consumerSecret, crcToken) };
}

/**
 * Check a delivery's signature header against its raw body.
 * @param {string|Buffer} rawBody  the exact bytes received, before JSON parsing
 * @param {string|undefined|null} signature  the x-twitter-webhooks-signature header
 * @param {string} consumerSecret
 */
export function verifySignature(rawBody, signature, consumerSecret) {
  if (!signature || !consumerSecret) return false;
  const expected = Buffer.from(hmac(consumerSecret, rawBody));
  const given = Buffer.from(String(signature));
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/**
 * A plain Node `(req, res)` handler that answers CRC challenges, rejects
 * unsigned deliveries, and passes verified events to `onEvent`. Works with
 * node:http directly and with Express (mount it before any body parser, or
 * pass the raw body on `req.rawBody`).
 *
 * @param {object} options
 * @param {string} options.consumerSecret
 * @param {(event: any, req: any) => void|Promise<void>} options.onEvent
 * @param {number} [options.maxBytes]  default 5 MB
 */
export function createWebhookHandler({ consumerSecret, onEvent, maxBytes = 5 * 1024 * 1024 }) {
  if (!consumerSecret) throw new TypeError('consumerSecret is required');
  const send = (res, status, body) => {
    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  };
  return async function xWebhookHandler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET') {
      const token = url.searchParams.get('crc_token');
      if (!token) return send(res, 400, { error: 'missing crc_token' });
      return send(res, 200, crcResponse(token, consumerSecret));
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });

    let raw = req.rawBody;
    if (raw === undefined) {
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > maxBytes) return send(res, 413, { error: 'payload too large' });
        chunks.push(chunk);
      }
      raw = Buffer.concat(chunks);
    }
    if (!verifySignature(raw, req.headers[SIGNATURE_HEADER], consumerSecret)) return send(res, 401, { error: 'bad signature' });
    let event;
    try {
      event = JSON.parse(Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw));
    } catch {
      return send(res, 400, { error: 'body is not JSON' });
    }
    await onEvent(event, req);
    return send(res, 200, { ok: true });
  };
}

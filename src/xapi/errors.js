// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The one error type the X API layer throws.
 *
 * `code` is stable and meant for branching:
 *
 *   unknown_operation  no operation with that id (see `suggestions`)
 *   invalid_params     the call was rejected locally before any request
 *   auth_required      no configured credential is accepted by the operation
 *   rate_limited       429, and the reset is further away than the client will wait
 *   usage_capped       429 for a spend or volume cap; waiting for the reset will not help
 *   http_error         any other non-2xx answer (see `status`, `type`, `title`, `detail`)
 *   network_error      the request never got an answer
 *   stream_error       a stream could not be kept open
 *
 * @module xactions/xapi/errors
 */

export class XApiError extends Error {
  /**
   * @param {string} message
   * @param {object} [details]
   * @param {string} [details.code]
   * @param {number} [details.status]
   * @param {string} [details.operationId]
   * @param {string} [details.type]     the problem type URI X answered with
   * @param {string} [details.title]
   * @param {string} [details.detail]
   * @param {any[]}  [details.errors]
   * @param {object} [details.rateLimit]
   * @param {string[]} [details.suggestions]
   * @param {string[]} [details.issues] what was wrong with the params
   * @param {any} [details.body]
   * @param {unknown} [details.cause]
   */
  constructor(message, details = {}) {
    super(message, details.cause ? { cause: details.cause } : undefined);
    this.name = 'XApiError';
    this.code = details.code ?? 'http_error';
    for (const key of ['status', 'operationId', 'type', 'title', 'detail', 'errors', 'rateLimit', 'suggestions', 'issues', 'body']) {
      if (details[key] !== undefined) this[key] = details[key];
    }
  }

  /** A plain object for logs, the CLI's --json output and MCP results. */
  toJSON() {
    const out = { name: this.name, code: this.code, message: this.message };
    for (const key of ['status', 'operationId', 'type', 'title', 'detail', 'errors', 'rateLimit', 'suggestions', 'issues']) {
      if (this[key] !== undefined) out[key] = this[key];
    }
    return out;
  }
}

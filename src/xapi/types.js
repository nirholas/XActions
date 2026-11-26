// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * JSDoc shapes for the official X API v2 layer. No runtime code.
 *
 * @module xactions/xapi/types
 */

/**
 * One parameter of an operation, reduced to its interface facts.
 *
 * @typedef {object} XApiParam
 * @property {string} name
 * @property {'path'|'query'|'header'} in
 * @property {boolean} required
 * @property {string} [type]       string, integer, number, boolean or array
 * @property {string} [format]     for example date-time or int32
 * @property {string} [pattern]    a regular expression the value must match
 * @property {Array<string|number>} [enum]
 * @property {number} [minimum]
 * @property {number} [maximum]
 * @property {number} [minLength]
 * @property {number} [maxLength]
 * @property {number} [minItems]
 * @property {number} [maxItems]
 * @property {{type?: string, enum?: Array<string>, pattern?: string}} [items]
 * @property {unknown} [default]
 */

/**
 * @typedef {object} XApiBodyProperty
 * @property {string} name
 * @property {boolean} required
 * @property {string} [type]
 * @property {Array<string|number>} [enum]
 * @property {XApiBodyProperty[]} [properties]
 */

/**
 * @typedef {object} XApiOperation
 * @property {string} id              the operationId X's spec gives it, for example getPostsById
 * @property {string} label           a lower-case reading of the id
 * @property {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} method
 * @property {string} path            OpenAPI style, for example /2/tweets/{id}
 * @property {string} tag             the API area, for example Posts or Users
 * @property {boolean} streaming      true for long-lived newline-delimited JSON streams
 * @property {boolean} write          true for every method other than GET
 * @property {'pagination_token'|'next_token'|null} pagination  which query parameter takes meta.next_token
 * @property {{bearer: boolean, oauth2User: string[]|null, oauth1User: boolean}} auth
 * @property {XApiParam[]} params
 * @property {{contentTypes: string[], required: boolean, type?: string, properties?: XApiBodyProperty[]}|null} body
 * @property {string|null} docsUrl    the official reference page
 */

/**
 * @typedef {object} XApiRateLimit
 * @property {number|null} limit
 * @property {number|null} remaining
 * @property {number|null} reset      unix seconds
 * @property {string|null} resetAt    ISO time
 */

/**
 * What every non-streaming call resolves to.
 *
 * @typedef {object} XApiResult
 * @property {number} status
 * @property {any} data
 * @property {Record<string, any[]>} [includes]
 * @property {Record<string, any>} [meta]
 * @property {any[]} [errors]         partial errors X returned alongside data
 * @property {XApiRateLimit} rateLimit
 * @property {'bearer'|'oauth2'|'oauth1'} auth   which credential signed the call
 * @property {string[]} [warnings]  field or expansion names sent that the published spec does not list
 * @property {any} body               the full parsed response body
 */

export {};

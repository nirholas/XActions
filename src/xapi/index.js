// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The official X API v2 lane of XActions.
 *
 *   import { XApiClient } from 'xactions/xapi';
 *   const x = XApiClient.fromEnv();
 *   const { data } = await x.call('getUsersByUsername', { username: 'XDevelopers', 'user.fields': 'public_metrics' });
 *   for await (const page of x.paginate('getUsersFollowers', { id: data.id, max_results: 1000 })) { ... }
 *   for await (const post of x.stream('streamPosts', { 'tweet.fields': 'created_at' })) { ... }
 *
 * See docs/x-api/README.md.
 *
 * @module xactions/xapi
 */

export { XApiClient, getOperation, listOperations, listTags, describeOperation, suggestOperations, prepareParams, readRateLimit, mergeIncludes } from './client.js';
export { XApiError } from './errors.js';
export { OPERATIONS, OAUTH2, SOURCE } from './catalog.generated.js';
export { RATE_LIMITS, rateLimitsFor } from './rate-limits.js';
export { oauth1Header, signatureBaseString, percentEncode } from './oauth1.js';
export {
  AUTHORIZE_URL,
  TOKEN_URL,
  REVOKE_URL,
  SCOPES,
  DEFAULT_SCOPES,
  createPkcePair,
  createState,
  buildAuthorizeUrl,
  exchangeCode,
  refreshAccessToken,
  revokeToken,
  fetchBearerToken,
  normalizeToken,
} from './oauth2.js';
export { crcResponse, verifySignature, createWebhookHandler, SIGNATURE_HEADER } from './webhooks.js';
export { loadTokens, saveTokens, clearTokens, tokenFilePath, clientFromStore } from './token-store.js';

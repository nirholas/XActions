// TypeScript declarations for `xactions/xapi`, the official X API v2 lane.
// Runtime source: src/xapi/index.js. tests/types/xapi-exports.test.js pins
// the declared names to the runtime exports in both directions.

// ── Catalog ─────────────────────────────────────────────────────────────────

export type XApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type XApiAuthKind = 'bearer' | 'oauth2' | 'oauth1';

export type XApiErrorCode =
  | 'unknown_operation'
  | 'invalid_params'
  | 'auth_required'
  | 'rate_limited'
  | 'usage_capped'
  | 'http_error'
  | 'network_error'
  | 'stream_error';

export interface XApiParam {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  type?: string;
  format?: string;
  pattern?: string;
  enum?: ReadonlyArray<string | number>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  items?: { type?: string; enum?: ReadonlyArray<string | number>; pattern?: string; format?: string };
  default?: unknown;
}

export interface XApiBodyProperty {
  name: string;
  required: boolean;
  type?: string;
  enum?: ReadonlyArray<string | number>;
  properties?: ReadonlyArray<XApiBodyProperty>;
}

export interface XApiOperation {
  id: string;
  label: string;
  method: XApiMethod;
  path: string;
  tag: string;
  streaming: boolean;
  write: boolean;
  pagination: 'pagination_token' | 'next_token' | null;
  auth: {
    bearer: boolean;
    oauth2User: ReadonlyArray<string> | null;
    oauth1User: boolean;
  };
  params: ReadonlyArray<XApiParam>;
  body: {
    contentTypes: ReadonlyArray<string>;
    required: boolean;
    type?: string;
    properties?: ReadonlyArray<XApiBodyProperty>;
  } | null;
  docsUrl: string | null;
}

export interface XApiPublishedLimit {
  scope: 'app' | 'user';
  requests: number;
  windowSeconds: number;
}

export interface XApiRateLimitEntry {
  method: string;
  path: string;
  limits: ReadonlyArray<XApiPublishedLimit>;
}

export interface XApiOperationDescription extends XApiOperation {
  rateLimits: ReadonlyArray<XApiPublishedLimit>;
}

export declare const OPERATIONS: ReadonlyArray<XApiOperation>;

export declare const OAUTH2: Readonly<{
  authorizationUrl: string;
  tokenUrl: string;
  scopes: ReadonlyArray<string>;
}>;

export declare const SOURCE: Readonly<{
  title: string;
  version: string;
  server: string;
  specUrl: string;
  specSha256: string;
  docsUrl: string;
  fetchedAt: string;
  operations: number;
  scopes: number;
}>;

export declare const RATE_LIMITS: ReadonlyArray<XApiRateLimitEntry>;

/** Published limits for one route, or an empty list when none is published. */
export declare function rateLimitsFor(method: string, routePath: string): ReadonlyArray<XApiPublishedLimit>;

// ── Catalog lookups ─────────────────────────────────────────────────────────

/** Look up an operation by id (`getUsersByUsername`) or route (`GET /2/users/by/username/:username`). Throws XApiError `unknown_operation`. */
export declare function getOperation(idOrRoute: string): XApiOperation;

export interface ListOperationsFilter {
  query?: string;
  tag?: string;
  write?: boolean;
  streaming?: boolean;
  auth?: XApiAuthKind;
}

export declare function listOperations(filter?: ListOperationsFilter): XApiOperation[];
export declare function listTags(): Array<{ tag: string; count: number }>;
export declare function describeOperation(idOrRoute: string): XApiOperationDescription;
export declare function suggestOperations(id: string, limit?: number): string[];

export interface PreparedParams {
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  warnings: string[];
}

/** Validate params against an operation locally. Throws XApiError `invalid_params`. */
export declare function prepareParams(op: XApiOperation, params?: Record<string, unknown>): PreparedParams;

// ── Results and rate limits ─────────────────────────────────────────────────

export interface XApiDailyLimit {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
}

export interface XApiRateLimit {
  limit: number | null;
  remaining: number | null;
  /** Epoch seconds. */
  reset: number | null;
  resetAt: string | null;
  user24h?: XApiDailyLimit;
  app24h?: XApiDailyLimit;
}

export declare function readRateLimit(headers: { get(name: string): string | null }): XApiRateLimit;

export type XApiIncludes = Record<string, any[]>;

/** Merge one page's `includes` into `target`, deduplicated by id or media_key. Returns `target`. */
export declare function mergeIncludes(target: XApiIncludes, includes: XApiIncludes | null | undefined): XApiIncludes;

export interface XApiResult<T = any> {
  status: number;
  data: T;
  includes?: XApiIncludes;
  meta?: Record<string, any>;
  errors?: any[];
  rateLimit: XApiRateLimit | null;
  auth: XApiAuthKind;
  warnings?: string[];
  body: any;
}

export interface XApiCollected<T = any> {
  data: T[];
  includes: XApiIncludes;
  meta: Record<string, any>;
  errors: any[];
  pages: number;
  rateLimit: XApiRateLimit | null;
  warnings?: string[];
}

// ── Errors ──────────────────────────────────────────────────────────────────

export interface XApiErrorDetails {
  code?: XApiErrorCode;
  status?: number;
  operationId?: string;
  type?: string;
  title?: string;
  detail?: string;
  errors?: any[];
  rateLimit?: XApiRateLimit | null;
  suggestions?: string[];
  issues?: string[];
  body?: any;
  cause?: unknown;
}

export declare class XApiError extends Error {
  constructor(message: string, details?: XApiErrorDetails);
  name: 'XApiError';
  code: XApiErrorCode;
  status?: number;
  operationId?: string;
  type?: string;
  title?: string;
  detail?: string;
  errors?: any[];
  rateLimit?: XApiRateLimit | null;
  suggestions?: string[];
  issues?: string[];
  body?: any;
  toJSON(): Record<string, unknown>;
}

// ── Credentials ─────────────────────────────────────────────────────────────

export interface XApiOAuth2Token {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  scopes?: string[];
  tokenType?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface XApiOAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  token: string;
  tokenSecret: string;
}

export interface XApiClientOptions {
  /** App-only bearer token. */
  bearerToken?: string;
  /** App key and secret: a bearer token is fetched on demand. */
  appKeys?: { apiKey: string; apiSecret: string };
  /** User-context OAuth 2.0 token. Add clientId (and clientSecret for a confidential client) to refresh. */
  oauth2?: XApiOAuth2Token;
  /** User-context OAuth 1.0a. */
  oauth1?: XApiOAuth1Credentials;
  onTokenRefresh?: (token: XApiOAuth2Token) => void | Promise<void>;
  /** Default https://api.x.com */
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  /** 5xx and network retries. Default 3. */
  maxRetries?: number;
  /** Longest 429 wait before throwing `rate_limited`. Default 15 minutes. */
  maxRateLimitWaitMs?: number;
  userAgent?: string;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
}

export interface XApiCredentialSummary {
  bearer: boolean;
  oauth2: boolean;
  oauth2Scopes: string[] | null;
  oauth2Refreshable: boolean;
  oauth1: boolean;
}

export interface XApiBuildOptions {
  body?: unknown;
  auth?: XApiAuthKind;
  requireAuth?: boolean;
}

export interface XApiCallOptions extends XApiBuildOptions {
  signal?: AbortSignal;
}

export interface XApiRequestPlan {
  op: XApiOperation;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  auth: XApiAuthKind;
  warnings: string[];
}

export interface XApiPaginateOptions extends XApiCallOptions {
  maxPages?: number;
}

export interface XApiCollectOptions extends XApiPaginateOptions {
  limit?: number;
}

export interface XApiStreamEvent {
  type: string;
  attempt?: number;
  waitMs?: number;
  status?: number;
  error?: string;
}

export interface XApiStreamOptions {
  signal?: AbortSignal;
  /** Default true. */
  reconnect?: boolean;
  /** Default Infinity. */
  maxReconnects?: number;
  /** Silence (not even a keep-alive) longer than this reopens the stream. Default 30000. */
  stallMs?: number;
  onEvent?: (event: XApiStreamEvent) => void;
  auth?: XApiAuthKind;
}

export interface XApiUploadOptions {
  /** For example image/png or video/mp4. */
  mediaType: string;
  /** tweet_image, tweet_video, tweet_gif, dm_image, ... Inferred from mediaType when omitted. */
  mediaCategory?: string;
  /** Default 4 MiB. */
  chunkSize?: number;
  additionalOwners?: string[];
  /** Processing wait cap. Default 10 minutes. */
  maxWaitMs?: number;
  auth?: 'oauth2' | 'oauth1';
}

export declare class XApiClient {
  constructor(options?: XApiClientOptions);

  /**
   * Reads X_BEARER_TOKEN, X_API_KEY + X_API_SECRET, X_ACCESS_TOKEN + X_ACCESS_TOKEN_SECRET,
   * X_OAUTH2_ACCESS_TOKEN (+ X_OAUTH2_REFRESH_TOKEN, X_CLIENT_ID, X_CLIENT_SECRET) and X_API_BASE_URL.
   * The TWITTER_* spellings are accepted too.
   */
  static fromEnv(env?: Record<string, string | undefined>, extra?: XApiClientOptions): XApiClient;

  bearerToken: string | null;
  appKeys: { apiKey: string; apiSecret: string } | null;
  oauth2: XApiOAuth2Token | null;
  oauth1: XApiOAuth1Credentials | null;
  onTokenRefresh: ((token: XApiOAuth2Token) => void | Promise<void>) | null;
  baseUrl: string;
  maxRetries: number;
  maxRateLimitWaitMs: number;
  userAgent: string;

  /** Which credentials are configured, without revealing any of them. */
  credentials(): XApiCredentialSummary;
  chooseAuth(op: XApiOperation, prefer?: XApiAuthKind): XApiAuthKind;
  ensureBearer(): Promise<string>;
  refreshOAuth2(): Promise<XApiOAuth2Token>;
  canRefresh(): boolean;
  authorize(kind: XApiAuthKind, method: string, url: string): Promise<string>;

  /** Everything needed to send one request, without sending it. */
  build(idOrRoute: string, params?: Record<string, unknown>, options?: XApiBuildOptions): XApiRequestPlan;
  call<T = any>(idOrRoute: string, params?: Record<string, unknown>, options?: XApiCallOptions): Promise<XApiResult<T>>;
  send<T = any>(plan: XApiRequestPlan, options?: { signal?: AbortSignal }): Promise<XApiResult<T>>;
  paginate<T = any>(idOrRoute: string, params?: Record<string, unknown>, options?: XApiPaginateOptions): AsyncGenerator<XApiResult<T>, void, unknown>;
  collect<T = any>(idOrRoute: string, params?: Record<string, unknown>, options?: XApiCollectOptions): Promise<XApiCollected<T>>;
  stream<T = any>(idOrRoute: string, params?: Record<string, unknown>, options?: XApiStreamOptions): AsyncGenerator<T, void, unknown>;
  uploadMedia(bytes: Uint8Array | ArrayBuffer, options: XApiUploadOptions): Promise<{ mediaId: string; mediaKey?: string; processing?: Record<string, any> }>;
}

// ── OAuth 1.0a ──────────────────────────────────────────────────────────────

export declare function percentEncode(value: string | number): string;
export declare function signatureBaseString(method: string, url: string, params: Array<[string, string]>): string;
export declare function oauth1Header(args: {
  method: string;
  url: string;
  form?: Record<string, string>;
  credentials: { consumerKey: string; consumerSecret: string; token?: string; tokenSecret?: string };
  nonce?: string;
  timestamp?: string | number;
}): string;

// ── OAuth 2.0 ───────────────────────────────────────────────────────────────

export interface XApiTokenResponse {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  scopes: string[];
  tokenType: string;
}

export declare const AUTHORIZE_URL: string;
export declare const TOKEN_URL: string;
export declare const REVOKE_URL: string;
export declare const SCOPES: ReadonlyArray<string>;
export declare const DEFAULT_SCOPES: ReadonlyArray<string>;

export declare function createPkcePair(): { verifier: string; challenge: string; method: 'S256' };
export declare function createState(): string;
export declare function buildAuthorizeUrl(args: {
  clientId: string;
  redirectUri: string;
  scopes?: ReadonlyArray<string>;
  state: string;
  codeChallenge: string;
  authorizeUrl?: string;
}): string;
export declare function exchangeCode(args: {
  clientId: string;
  clientSecret?: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  fetch?: typeof globalThis.fetch;
  tokenUrl?: string;
}): Promise<XApiTokenResponse>;
export declare function refreshAccessToken(args: {
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
  fetch?: typeof globalThis.fetch;
  tokenUrl?: string;
  now?: number;
}): Promise<XApiTokenResponse>;
export declare function revokeToken(args: {
  clientId: string;
  clientSecret?: string;
  token: string;
  tokenTypeHint?: 'access_token' | 'refresh_token';
  fetch?: typeof globalThis.fetch;
  revokeUrl?: string;
}): Promise<true>;
export declare function fetchBearerToken(args: {
  apiKey: string;
  apiSecret: string;
  fetch?: typeof globalThis.fetch;
  url?: string;
}): Promise<string>;
export declare function normalizeToken(json: Record<string, any>, now?: number): XApiTokenResponse;

// ── Webhooks (Account Activity) ─────────────────────────────────────────────

export declare const SIGNATURE_HEADER: 'x-twitter-webhooks-signature';
export declare function crcResponse(crcToken: string, consumerSecret: string): { response_token: string };
export declare function verifySignature(rawBody: string | Uint8Array, signature: string | null | undefined, consumerSecret: string): boolean;

/** A Node (req, res) handler: answers the CRC GET, verifies and parses each POST, then calls onEvent. */
export declare function createWebhookHandler(options: {
  consumerSecret: string;
  onEvent: (event: any, req: any) => void | Promise<void>;
  /** Default 5 MB. */
  maxBytes?: number;
}): (req: any, res: any) => Promise<void>;

// ── Token store (~/.xactions/xapi-oauth2.json) ──────────────────────────────

export interface XApiStoredToken {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  scopes: string[];
  clientId?: string;
  savedAt?: string;
}

export declare function tokenFilePath(env?: Record<string, string | undefined>): string;
export declare function loadTokens(env?: Record<string, string | undefined>): Promise<XApiStoredToken | null>;
/** Writes the token with mode 0600. The client secret is never written. Returns the file path. */
export declare function saveTokens(token: XApiOAuth2Token, env?: Record<string, string | undefined>): Promise<string>;
export declare function clearTokens(env?: Record<string, string | undefined>): Promise<boolean>;
/** XApiClient.fromEnv, topped up with the stored OAuth 2.0 token. Refreshed tokens are written back. */
export declare function clientFromStore(env?: Record<string, string | undefined>, extra?: XApiClientOptions): Promise<XApiClient>;

// ═══════════════════════════════════════════════════════════════════════════════
// XActions Client — Auth Module TypeScript Declarations
// by nichxbt
// ═══════════════════════════════════════════════════════════════════════════════

// ── CookieAuth ──────────────────────────────────────────────────────────────

export interface CookieEntry {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export declare class CookieAuth {
  jar: CookieJar;

  constructor(tokenManager: TokenManager);

  isAuthenticated(): boolean;
  getAuthenticatedUserId(): string | null;
  setCookies(cookies: CookieEntry[] | string): void;
  getCookies(): Array<{ name: string; value: string }>;
  getCookieString(): string;
  saveCookies(filePath: string): Promise<void>;
  loadCookies(filePath: string): Promise<void>;
  updateFromResponse(response: Response): void;
  clear(): void;
}

// ── CookieJar ───────────────────────────────────────────────────────────────

export declare class CookieJar {
  constructor();

  set(cookie: CookieEntry): void;
  get(name: string): CookieEntry | undefined;
  getValue(name: string): string | undefined;
  has(name: string): boolean;
  delete(name: string): boolean;
  clear(): void;
  getAll(): CookieEntry[];
  toCookieString(): string;
  toJSON(): CookieEntry[];
  saveToFile(filePath: string): Promise<void>;
  static loadFromFile(filePath: string): Promise<CookieJar>;

  [Symbol.iterator](): Iterator<CookieEntry>;
}

// ── GuestToken ──────────────────────────────────────────────────────────────

export interface GuestTokenOptions {
  fetch?: typeof globalThis.fetch;
  maxAge?: number;
}

export declare class GuestToken {
  constructor(options?: GuestTokenOptions);

  activate(): Promise<string>;
  getToken(): string | null;
  isExpired(): boolean;
  ensureValid(): Promise<string>;
  getHeaders(): Record<string, string>;
  reset(): void;
}

// ── TokenManager ────────────────────────────────────────────────────────────

export interface TokenManagerOptions {
  cookieAuth?: CookieAuth;
  guestToken?: GuestToken;
}

export declare class TokenManager {
  constructor(options?: TokenManagerOptions | Function);

  getHeaders(authenticated?: boolean): Record<string, string>;
  getGuestHeaders(): Record<string, string>;
  isAuthenticated(): boolean;
  ensureAuth(): void;
  refreshCsrf(token: string): void;
  getUserAgent(): string;

  // Legacy API
  activateGuestToken(): Promise<string>;
  getGuestToken(): string | null;
  setCsrfToken(token: string | null): void;
  isGuestTokenValid(): boolean;
  invalidateGuestToken(): void;
}

// ── CredentialAuth ──────────────────────────────────────────────────────────

export interface LoginCredentials {
  username: string;
  password: string;
  email?: string;
}

export interface FlowToken {
  token: string;
  _subtask: string | null;
}

export declare class CredentialAuth {
  constructor(cookieAuth: CookieAuth, tokenManager: TokenManager);

  setFetch(fn: typeof globalThis.fetch): void;
  login(credentials: LoginCredentials): Promise<void>;
}

// ── TwoFactorAuth ───────────────────────────────────────────────────────────

export interface TwoFactorOptions {
  fetch?: typeof globalThis.fetch;
}

export declare class TwoFactorAuth {
  constructor(cookieAuth: CookieAuth, tokenManager: TokenManager, options?: TwoFactorOptions);

  submitTotp(flowToken: string, code: string): Promise<FlowToken>;
  submitSmsCode(flowToken: string, code: string): Promise<FlowToken>;
  requestSmsCode(flowToken: string): Promise<FlowToken>;
  detectMethod(subtasks: Array<{ subtask_id: string }>): '2fa_totp' | '2fa_sms' | null;
}

// ── SessionValidator ────────────────────────────────────────────────────────

export interface ValidateResult {
  valid: boolean;
  reason?: 'expired' | 'locked' | 'suspended';
  user?: {
    id: string;
    username: string;
    displayName: string;
    profileImageUrl: string | null;
  } | null;
}

export interface SessionValidatorOptions {
  tokenManager: TokenManager;
  cookieAuth: CookieAuth;
  fetch?: typeof globalThis.fetch;
}

export declare class SessionValidator {
  constructor(options: SessionValidatorOptions);

  validate(): Promise<ValidateResult>;
  validateAndRefreshCsrf(): Promise<ValidateResult>;
  getLoggedInUser(): Promise<{
    id: string;
    username: string;
    displayName: string;
    profileImageUrl: string | null;
  }>;
  isSessionExpired(error: any): boolean;
}

// ── Storage ─────────────────────────────────────────────────────────────────

export interface SessionInfo {
  cookies: Record<string, string>;
  created: string;
  lastUsed: string;
}

export interface ConfigData {
  sessions: Record<string, SessionInfo>;
  activeSession: string | null;
}

export declare function getDefaultCookiePath(): string;
export declare function saveCookiesToConfig(username: string, cookieAuth: CookieAuth): Promise<void>;
export declare function loadCookiesFromConfig(username?: string): Promise<CookieAuth | null>;
export declare function listSessions(): Promise<string[]>;
export declare function deleteSession(username: string): Promise<boolean>;
export declare function getActiveSession(): Promise<string | null>;

// ── Auth Index (Factories) ──────────────────────────────────────────────────

export interface CreateAuthOptions {
  cookieString?: string;
  cookieArray?: CookieEntry[];
  cookieFile?: string;
  username?: string;
  fetch?: typeof globalThis.fetch;
}

export interface AuthContext {
  cookieAuth: CookieAuth;
  tokenManager: TokenManager;
  guestToken: GuestToken;
  credentialAuth: CredentialAuth;
  twoFactor: TwoFactorAuth;
  sessionValidator: SessionValidator;
}

export declare function createAuth(options?: CreateAuthOptions): Promise<AuthContext>;

export interface LoginOptions {
  username: string;
  password: string;
  email?: string;
  twoFactorCode?: string;
  cookieFile?: string;
}

export declare function login(options: LoginOptions): Promise<AuthContext>;

// ── GraphQL Queries ─────────────────────────────────────────────────────────

export declare const BEARER_TOKEN: string;
export declare const API_BASE: string;
export declare const GRAPHQL_BASE: string;

export interface QueryDefinition {
  queryId: string;
  operationName: string;
}

export declare const QUERY_IDS: Record<string, QueryDefinition>;

export interface GraphqlFeatures {
  [key: string]: boolean;
}

export declare const DEFAULT_FEATURES: GraphqlFeatures;

export declare function buildGraphqlUrl(queryId: string, operationName: string, variables: Record<string, any>, features?: GraphqlFeatures): string;
export declare function buildGraphqlMutation(queryId: string, operationName: string): string;

// ── Errors ──────────────────────────────────────────────────────────────────

export declare class ScraperError extends Error {
  code: string;
  details?: Record<string, any>;
  constructor(message: string, code?: string, details?: Record<string, any>);
}

export declare class AuthenticationError extends ScraperError {
  constructor(message: string, code?: string, details?: Record<string, any>);
}

export declare class RateLimitError extends ScraperError {
  retryAfter?: number;
  constructor(message: string, retryAfter?: number, details?: Record<string, any>);
}

export declare class NotFoundError extends ScraperError {
  constructor(message: string, details?: Record<string, any>);
}

export declare class TwitterApiError extends ScraperError {
  httpStatus: number;
  twitterErrorCode?: number;
  endpoint?: string;
  constructor(message: string, options: {
    httpStatus: number;
    code?: string;
    twitterErrorCode?: number;
    endpoint?: string;
    details?: Record<string, any>;
  });
}

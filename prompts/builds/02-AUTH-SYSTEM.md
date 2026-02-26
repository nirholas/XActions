# Track 02 — Cookie Auth + Session Persistence# Track 02 — Cookie Auth + Credential Login System










































































































































































































































































































































































































































































































































































































































































































































































































































































































































```"console.log(h.Authorization ? '✅ Headers generated' : '❌ Failed');const h = tm.getHeaders(false);const tm = new TokenManager(fetch);import { TokenManager } from './src/client/auth/TokenManager.js';node -e "# TokenManager headers"console.log(jar2.getValue('auth_token') === 'test123' ? '✅ CookieJar works' : '❌ Failed');const jar2 = CookieJar.fromJSON(json);const json = jar.toJSON();jar.set({ name: 'auth_token', value: 'test123', domain: '.x.com', path: '/' });const jar = new CookieJar();import { CookieJar } from './src/client/auth/CookieJar.js';node -e "# CookieJar serializationnode -e "import { CookieAuth, CookieJar, TokenManager } from './src/client/auth/index.js'; console.log('✅ Auth module loads')"# Auth module loads```bash## Validation---```Include working code examples for every section. Reference file paths in the codebase.    - "TWO_FACTOR_REQUIRED" — pass twoFactorCode option    - "ACCOUNT_LOCKED" — your account needs manual unlock on x.com    - "RATE_LIMITED" — wait or switch accounts    - "SESSION_EXPIRED" — re-login or get fresh cookies    - "LOGIN_DENIED" — account may need email verification on x.com first11. Troubleshooting10. API Reference — All auth classes and methods   - Use environment variables for credentials   - Rotate sessions periodically   - Use encrypted storage   - Never commit cookies.json9. Security Best Practices   - Session expiry handling   - Keep-alive   - Auto-refresh8. Session Management   - Rotating proxies   - SOCKS5 proxy   - HTTP proxy7. Proxy Support   - Token refresh   - Auth flow   - Setting up developer app6. OAuth 2.0 for API v2 (optional)   - Interactive with callback   - Automatic with TOTP code5. Two-Factor Authentication   - Rotating accounts for rate limit management   - Switching between accounts   - Adding accounts4. Multi-Account   - scraper.setCookies([{ name: 'auth_token', value: '...', domain: '.x.com' }])   - Copy auth_token value   - Get cookies from browser DevTools: Application → Cookies → x.com3. Cookie-Only Login (no password)   - Encrypted: scraper.saveCookies('cookies.enc', { encrypt: true, password: 'secret' })   - Load: scraper.loadCookies('cookies.json')   - Save: scraper.saveCookies('cookies.json')2. Cookie Persistence      - Code example: scraper.login({ username, password, email })1. Quick Start — Login with credentialsSections:Create docs/auth.md with complete authentication documentation.```### Prompt 15: Auth Documentation and Examples```These utilities support both unit tests (with formatted-but-fake data) and integration tests (with real API calls).   - This IS a real API call, used for integration testing   - Return connection status   - Make a real verify_credentials call6. async function testAuthConnection(scraper: Scraper) → { authenticated: boolean, userId: string, username: string, cookieCount: number }   - Used for testing CredentialAuth parsing without hitting Twitter   - Generate realistic Twitter login flow response objects5. function createLoginFlowResponse(step: string, subtasks: string[]) → object   - Generate a realistic flow_token for testing login flow parsing4. function generateMockFlowToken() → string   - Return validation report   - Validate format of each cookie value   - Check that all required Twitter cookies are present3. async function validateCookieFormat(cookies: CookieJar) → { valid: boolean, errors: string[] }   - Pre-configured with bearer token and a guest token format2. function createTestTokenManager() → TokenManager   - These are properly formatted but won't work against real Twitter   - twid: u%3D1234567890   - ct0: a valid-format CSRF token (hex string, 160 chars)    - auth_token: a valid-format token (hex string, 40 chars)   - Uses test values that match Twitter's cookie format   - Create a CookieJar with realistic cookie structure1. function createTestCookieJar() → CookieJarExport:Utilities for testing auth flows without real Twitter credentials. NOT mock data — these are real utility functions for testing.Create src/client/auth/testUtils.js.```### Prompt 14: Auth Testing Utilities```This bridges the new Scraper auth system with the existing Express API server.});  res.json(profile);  const profile = await req.scraper.getProfile(req.params.username);router.get('/profile/:username', requireAuth(), async (req, res) => {Usage in api/routes/:   - Return 429 if account is rate-limited   - Track per-account rate limits3. function rateLimitByAccount() → Express middleware   - Attach to req.scraper   - Load specific account from AccountManager2. function requireAccount(accountName) → Express middleware   - If not authenticated, return 401   - Attach scraper instance to req.scraper   - Verify session is valid   - Load Scraper with saved cookies   - options: { cookiePath, accountName }   - Check for auth cookie or Authorization header1. function requireAuth(options = {}) → Express middlewareExport:Express middleware that uses the Scraper auth system to protect API routes. Integrates with the existing api/ Express server.Create src/client/auth/middleware.js.```### Prompt 13: Auth Middleware for Express API```});  console.warn(`Rate limited on ${endpoint}, retry in ${retryAfter}s`);scraper.on('rate:limited', ({ endpoint, retryAfter }) => {scraper.on('login', ({ username }) => console.log(`Logged in as @${username}`));const scraper = new Scraper();This allows consumers to implement custom logging, monitoring, or retry logic:- scraper.on('rate:limited', callback)- scraper.on('login', callback)Update Scraper class to expose auth events:- Expose on(), off(), once() on the CookieAuth class- this._events = new AuthEvents()Update CookieAuth to extend AuthEvents (or compose it):- On errors, emit 'error'- After session refresh, emit 'session:refresh'- After logout, emit 'logout'  - After successful login, emit 'login'Usage in CookieAuth:Import Node.js EventEmitter (from 'events').- 'account:switched' → { from, to }- 'error' → { code, message, endpoint }- 'token:refreshed' → { type: 'guest'|'csrf'|'oauth2' }- 'rate:limited' → { endpoint, retryAfter, remaining }- 'cookies:loaded' → { filePath }- 'cookies:saved' → { filePath }- 'session:expired' → { userId }- 'session:refresh' → { userId, success: boolean }- 'logout' → { userId, username }- 'login' → { userId, username, method: 'credentials'|'cookies' }Events:Export class AuthEvents extends EventEmitter:An event emitter for auth lifecycle events. Allows the Scraper consumer to react to auth changes.Create src/client/auth/AuthEvents.js.```### Prompt 12: Auth Event System```Use only Node.js built-in crypto for PKCE (crypto.randomBytes, crypto.createHash).This enables the v2 API hybrid mode (Track 07). The Scraper class will have an optional scraper.v2 namespace that uses OAuth2 when configured.    - Load saved tokens10. async loadTokens(filePath) → void   - Save { accessToken, refreshToken, tokenExpiresAt, clientId } to JSON9. async saveTokens(filePath) → void   - Revoke the current access token   - POST https://api.twitter.com/2/oauth2/revoke8. async revokeToken() → void7. getHeaders() → { Authorization: `Bearer ${accessToken}` }   - Otherwise throw AuthenticationError('OAUTH2_TOKEN_EXPIRED')   - If expired but refreshToken exists, refresh and return   - If valid, return accessToken6. async ensureToken() → string   - Check if accessToken exists and not expired (with 5-minute buffer)5. isTokenValid() → boolean   - POST same endpoint with grant_type: 'refresh_token'4. async refreshAccessToken() → { accessToken, refreshToken, expiresIn }   - Store tokens   - Body: { code, grant_type: 'authorization_code', client_id, redirect_uri, code_verifier }   - POST https://api.twitter.com/2/oauth2/token3. async exchangeCode(code, codeVerifier) → { accessToken, refreshToken, expiresIn }     response_type=code&client_id=...&redirect_uri=...&scope=...&state=...&code_challenge=...&code_challenge_method=S256   - Build URL: https://twitter.com/i/oauth2/authorize?   - Generate code_challenge = base64url(sha256(code_verifier))   - Generate PKCE code_verifier (random 43-128 chars, base64url)2. getAuthorizationUrl(state?) → { url: string, codeVerifier: string, state: string }   - Default scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access']1. constructor({ clientId, clientSecret, redirectUri, scopes })Methods:- tokenExpiresAt: number|null- refreshToken: string|null- accessToken: string|null- scopes: string[]- redirectUri: string- clientSecret: string (optional for public clients)- clientId: stringProperties:Export class OAuth2Auth:For users who want to use Twitter's official API v2 (optional, for polls, analytics, etc.), implement OAuth 2.0 with PKCE.Create src/client/auth/OAuth2Auth.js.```### Prompt 11: OAuth 2.0 PKCE Flow (For v2 API)```Keep this simple — use Node.js built-in fetch with undici dispatcher for proxy support (no extra npm dependencies if possible). If external deps are needed, use 'undici' which is already bundled with Node.js 18+.- The login flow must also use the proxy (some users need proxies to access Twitter)- All requests routed through the proxy- The HttpClient should accept a proxyManagerIntegration with HttpClient:  - Switch to next proxy in list (for rotating proxy pools)- rotateProxy(proxyList: string[]) → void  - Return true if reachable  - Make a test request through the proxy- async testConnection() → boolean- getProxyUrl() → string  - For SOCKS: use socks-proxy-agent pattern (Node.js 18+ has built-in proxy support via undici)  - For HTTP proxies: use http-proxy-agent pattern  - Return appropriate proxy agent for fetch- getAgent() → http.Agent  - Support schemes: http, https, socks4, socks5  - Parse proxy URL: http://user:pass@host:port or socks5://host:port- constructor(proxyConfig)Methods:Export class ProxyManager:2. Create src/client/auth/ProxyManager.js:   }     proxy: string | { url: string, username?: string, password?: string }   options: {   constructor(http, options = {})1. Update CookieAuth constructor to accept proxy config:Add proxy support to the authentication flow:Update src/client/auth/CookieAuth.js and the HttpClient integration to support authenticated proxies.```### Prompt 10: Proxy Authentication Support```Use only Node.js built-in crypto module (no external dependencies).- Auto-detect encrypted files on load- loadCookies(filePath, { password: '...' })- saveCookies(filePath, { encrypt: true, password: '...' })Update CookieAuth to support encrypted storage:   - Check if file has .enc extension or encrypted header bytes5. function isEncryptedFile(filePath) → boolean   - Read file, decrypt, return CookieJar4. async function loadEncryptedCookies(filePath, password) → CookieJar   - Encrypt and write to file with .enc extension3. async function saveEncryptedCookies(cookieJar, filePath, password) → void   - If decryption fails (wrong password), throw AuthenticationError('DECRYPTION_FAILED')   - Parse JSON → CookieJar.fromJSON()   - Decrypt data   - Derive key from password using same scrypt params   - Extract salt, iv, authTag from buffer2. async function decryptCookies(encrypted: Buffer, password: string) → CookieJar   - Return: Buffer containing [salt (16 bytes) | iv (12 bytes) | authTag (16 bytes) | encryptedData]   - Encrypt the JSON-serialized cookies   - Generate random 16-byte salt and 12-byte IV   - Derive key from password using scrypt (N=16384, r=8, p=1, keyLen=32)   - Algorithm: AES-256-GCM   - Use Node.js crypto module1. async function encryptCookies(cookieJar: CookieJar, password: string) → BufferExport:Stored cookies contain sensitive auth tokens. This module provides optional encryption for cookie files.Create src/client/auth/Encryption.js.```### Prompt 9: Auth Encryption at Rest```This is real file system persistence. Use fs/promises. Create directories as needed. Handle missing files gracefully.    meta.json    cookies.json  alt1/    meta.json              → { name, userId, username, addedAt, lastUsedAt }    cookies.json           → CookieJar serialized  main/  active.json              → { "active": "main" }~/.xactions/accounts/File structure on disk:   - Useful for distributing rate-limited operations across accounts   - Yield each account in sequence9. async rotateAccounts() → AsyncGenerator<{ name, auth: CookieAuth }>   - Create and return a new CookieAuth instance with those cookies   - Load cookies for named account8. async switchAccount(name) → CookieAuth   - Read from {_accountsDir}/active.json7. async getActiveAccount() → string|null   - Save to {_accountsDir}/active.json   - Set this._activeAccount6. async setActiveAccount(name) → void   - Load cookies for a specific account5. async getAccountCookies(name) → CookieJar   - List all saved accounts with metadata4. async listAccounts() → Array<{ name, username, userId, lastUsedAt }>   - Delete {_accountsDir}/{name}/ directory3. async removeAccount(name) → void     { name, userId, username, addedAt, lastUsedAt }   - Extract and save metadata: {_accountsDir}/{name}/meta.json   - Save cookies to {_accountsDir}/{name}/cookies.json2. async addAccount(name, cookies: CookieJar) → void1. constructor(basePath?)Methods:- _activeAccount: string|null- _accountsDir: string (default: ~/.xactions/accounts/)Properties:Export class AccountManager:Support managing multiple Twitter accounts with saved credentials/cookies. Stored in ~/.xactions/accounts/.Create src/client/auth/AccountManager.js.```### Prompt 8: Multi-Account Support```Integration: The HttpClient calls sessionManager.recordActivity() after each successful request and sessionManager.ensureSession() before requests that require auth.   - Requires stored credentials (username/password) or throws   - Useful if cookies are about to expire   - Force full re-authentication9. async rotateSession() → void   - Return ms since last activity8. getSessionAge() → number   - If not authenticated, do nothing   - If refresh fails, throw AuthenticationError('SESSION_EXPIRED')   - If session is stale, refresh it7. async ensureSession() → void   - Called by HttpClient after each successful request   - Update _lastActivity to now6. recordActivity() → void   - Clear the periodic timer5. stopKeepAlive() → void   - Only if autoRefresh is true   - Interval: this._refreshInterval   - Start periodic timer that calls refreshSession()4. startKeepAlive() → void   - Return true if _lastActivity is older than _refreshInterval3. isSessionStale() → boolean   - Update _lastActivity timestamp   - If 401/403, session expired, return false   - If successful (200), update cookies from response, return true     GET https://x.com/i/api/1.1/account/verify_credentials.json   - Make a lightweight authenticated request to validate session:2. async refreshSession() → boolean   - options: { refreshInterval, autoRefresh, cookieSavePath }1. constructor(auth, options = {})Methods:- _autoRefresh: boolean- _keepAliveTimer: NodeJS.Timer|null- _refreshInterval: number (default: 30 minutes in ms)- _lastActivity: number (timestamp)- _auth: CookieAuthProperties:Export class SessionManager:Twitter sessions expire after extended inactivity. This module handles session refresh and keep-alive.Create src/client/auth/SessionManager.js.```### Prompt 7: Session Refresh and Keep-Alive```- Too many attempts → 'TWO_FACTOR_LOCKED'- Expired TOTP window → 'TWO_FACTOR_EXPIRED'- Invalid TOTP code → 'INVALID_2FA_CODE'Add proper error handling for:If no 2FA handler is provided and 2FA is required, throw AuthenticationError with code 'TWO_FACTOR_REQUIRED' and include instructions in the message.  }    onTwoFactorRequired?: async () => string,    twoFactorCode?: string,  options: {async login(username, password, email, options = {}) → CookieJarUpdate the login() method signature to accept optional onTwoFactorRequired callback:  This is for CLI/interactive use where each challenge can be resolved by prompting the user.  }    onDenied: (reason) => void,                   // login denied notification    onCaptchaRequired: async (url) => string,     // return captcha solution    onEmailVerification: async () => string,      // return email    onTwoFactorRequired: async () => string,     // return TOTP code  {  callbacks shape:async loginInteractive(username, password, email, callbacks = {}) → CookieJarAlso add method for handling the flow interactively:  - Continue with remaining steps    }]}        enter_text: { text: totpCode, link: 'next_link' }        subtask_id: 'LoginTwoFactorAuthChallenge',    { flow_token, subtask_inputs: [{  - When 2FA challenge appears, submit the code:  - Run normal login flow through password stepasync loginWithTwoFactor(username, password, email, totpCode) → CookieJarAdd method:When Twitter's login flow returns 'LoginTwoFactorAuthChallenge' subtask, the user needs to provide a TOTP code.Update src/client/auth/CredentialAuth.js to support two-factor authentication (2FA).```### Prompt 6: Two-Factor Auth Support```Note: Node.js fetch() does NOT expose Set-Cookie headers by default for security. The HttpClient must use undici or node-fetch which do expose them, OR use the workaround of extracting cookies from the raw response. Document this caveat clearly.The HttpClient (Track 03) must call updateJarFromResponse() after every request. Add a response interceptor hook in the HttpClient that CookieAuth can register with.Integration with HttpClient:   - Get auth_token cookie value6. function extractAuthToken(jar: CookieJar) → string|null   - twid format: "u%3D1234567890" → decodeURIComponent → "u=1234567890" → "1234567890"   - Get twid cookie, decode, extract user ID5. function extractUserId(jar: CookieJar) → string|null   - Get ct0 cookie value (this is the CSRF token)4. function extractCsrfToken(jar: CookieJar) → string|null   - Critical: after every Twitter API request, call this to keep ct0 current   - Update jar with new/changed cookies   - Parse each one   - Extract Set-Cookie headers from fetch Response3. function updateJarFromResponse(jar: CookieJar, response: Response) → void   - Parse multiple Set-Cookie headers2. function parseSetCookieHeaders(headers: string[]) → Cookie[]   - Handle quoted values   - Handle multiple attributes separated by "; "   - Handle attributes case-insensitively   - Extract: name, value, domain, path, expires, httpOnly, secure, sameSite   - Parse a single Set-Cookie header value1. function parseSetCookieHeader(header: string) → CookieExport:When making HTTP requests to Twitter, the response includes Set-Cookie headers. This module parses them and updates the CookieJar.Create src/client/auth/CookieParser.js.```### Prompt 5: Cookie Extraction from HTTP Responses```Call _ensureAuth() at the start of every method that needs auth.}  }    this._pendingCookies = null;    await this._auth.loginWithCookies(this._pendingCookies);  if (this._pendingCookies) {async _ensureAuth() {Add a _ensureAuth() private method:}  }    this._pendingCookies = options.cookies;    // Will be loaded asynchronously on first authenticated request  if (options.cookies) {  // If cookies provided in constructor, load them    this._userIdCache = new Map();  this._auth = new CookieAuth(this._http);  });    transform: options.transform,    fetch: options.fetch,    proxy: options.proxy,  this._http = new HttpClient({constructor(options = {}) {Update src/client/Scraper.js constructor to properly initialize auth:}  return auth;  await auth.login({ username, password, email });  const auth = new CookieAuth(http);export async function createAuthFromCredentials(http, { username, password, email }) {}  return auth;  await auth.loadCookies(filePath);  const auth = new CookieAuth(http);export async function createAuthFromCookieFile(http, filePath) {Also create a convenience function:export { TokenManager } from './TokenManager.js';export { CredentialAuth } from './CredentialAuth.js';export { CookieJar } from './CookieJar.js';export { CookieAuth } from './CookieAuth.js';Create src/client/auth/index.js that exports all auth components:```### Prompt 4: Auth Module Index```Default cookie save path: ~/.xactions/cookies.json (using os.homedir())    - Invalidate tokens    - Reset _authenticatedUserId    - Clear cookie jar12. logout() → void    - Update tokenManager and cookieJar    - Extract latest ct0 from response cookies after any request11. async refreshCsrf() → void      }        'x-csrf-token': this._cookieJar.getValue('ct0'),        'Cookie': this._cookieJar.toCookieString(),        ...this._tokenManager.getHeaders(this.isAuthenticated()),      {    - Return authentication-aware headers:10. getHeaders() → object   - Call loginWithCookies with loaded cookies   - Load cookies from file9. async loadCookies(filePath) → void   - Delegate to this._cookieJar.saveToFile(filePath)8. async saveCookies(filePath) → void   - Replace cookie jar contents7. setCookies(cookies) → void   - Return this._cookieJar6. getCookies() → CookieJar   - Return _authenticatedUserId or throw if not authenticated5. getAuthenticatedUserId() → string   - Return true if auth_token cookie exists and not expired and _authenticatedUserId is set4. isAuthenticated() → boolean   - If validation fails, throw AuthenticationError('INVALID_COOKIES')   - Validate by making a test request (call /1.1/account/verify_credentials.json)   - Extract twid → set user ID   - Extract ct0 → set CSRF token   - Populate this._cookieJar   - Accept either: CookieJar, Array<Cookie>, or JSON string3. async loginWithCookies(cookies) → void   - Log: console.log('✅ Logged in as @' + username)   - Set this._authenticatedUserId   - Extract twid cookie to get user ID: decodeURIComponent(twid).replace('u=', '')   - Extract ct0 from cookies and set on TokenManager as CSRF token   - Store returned cookies in this._cookieJar   - Call this._credentialAuth.login(username, password, email)2. async login({ username, password, email }) → void   - _authenticatedUserId = null   - Create CredentialAuth(http, tokenManager)   - Create CookieJar (empty)   - Create TokenManager1. constructor(http)Methods:- _authenticatedUserId: string|null- _http: HttpClient- _tokenManager: TokenManager- _credentialAuth: CredentialAuth- _cookieJar: CookieJarProperties:Export class CookieAuth:This is the main authentication class that the Scraper uses. It combines CookieJar, CredentialAuth, and TokenManager.Create src/client/auth/CookieAuth.js.```### Prompt 3: CookieAuth Main Class```This is the actual Twitter login flow. Every step matches what happens when you log in on x.com. The flow_token chains steps together. All subtask IDs are real.   - Updates this._flowToken from response   - Returns parsed JSON response   - Helper that POSTs to task.json with flow_token and subtask_inputs3. async _executeSubtask(flowToken, subtaskInput) → response   - Account locked → throw AuthenticationError('ACCOUNT_LOCKED')   - Account suspended → throw AuthenticationError('ACCOUNT_SUSPENDED')   - Wrong password → error code 399 → throw AuthenticationError('INVALID_CREDENTIALS')   - 'DenyLoginSubtask' → throw AuthenticationError('LOGIN_DENIED')   - 'LoginTwoFactorAuthChallenge' → throw AuthenticationError('TWO_FACTOR_REQUIRED')   - 'LoginAcid' subtask → email verification required, throw AuthenticationError('EMAIL_VERIFICATION_REQUIRED')   Error handling:   - Return populated CookieJar   - Extract auth_token, ct0, twid cookies   - Extract cookies from response headers (Set-Cookie)   - Look for 'LoginSuccessSubtask' in response subtasks   Step 7: Success   - POST with: { flow_token, subtask_inputs: [{ subtask_id: 'AccountDuplicationCheck', check_logged_in_account: { link: 'AccountDuplicationCheck_false' } }] }   - If 'AccountDuplicationCheck' subtask appears:   Step 6: Account duplication check (if required)   - POST with: { flow_token, subtask_inputs: [{ subtask_id: 'LoginEnterPassword', enter_password: { password: password, link: 'next_link' } }] }   Step 5: Enter password   - Need to submit email: { flow_token, subtask_inputs: [{ subtask_id: 'LoginEnterAlternateIdentifierSubtask', enter_text: { text: email, link: 'next_link' } }] }   - If subtask 'LoginEnterAlternateIdentifierSubtask' appears:   Step 4: Handle alternative identifier (email verification)   - POST with: { flow_token, subtask_inputs: [{ subtask_id: 'LoginEnterUserIdentifierSSO', settings_list: { setting_responses: [{ key: 'user_identifier', response_data: { text_data: { result: username } } }], link: 'next_link' } }] }   Step 3: Enter username     { flow_token, subtask_inputs: [{ subtask_id: 'LoginJsInstrumentationSubtask', js_instrumentation: { response: '{}', link: 'next_link' } }] }   - POST same endpoint with:   - If subtask 'LoginJsInstrumentationSubtask' is in response:   Step 2: JS instrumentation (may be required)   - Extract flow_token from response   - Query params: flow_name=login     }       }         wait_spinner: 3, web_modal: 1         user_recommendations_list: 4, user_recommendations_urt: 1,         tweet_selection_urt: 1, update_users: 1, upload_media: 1,         show_code: 1, sign_up: 2, sign_up_review: 4,         select_avatar: 4, select_banner: 2, settings_list: 7,         phone_verification: 4, privacy_options: 1, security_key: 3,         open_account: 2, open_home_timeline: 1, open_link: 1,         js_instrumentation: 1, menu_dialog: 1, notifications_permission_prompt: 2,         generic_urt: 3, in_app_notification: 1, interest_picker: 3,         enter_recaptcha: 1, enter_text: 5, enter_username: 2,         enter_email: 2, enter_password: 5, enter_phone: 2,         email_verification: 2, end_flow: 0, enter_date: 1,         contacts_live_sync_permission_prompt: 0, cta: 7,         check_logged_in_account: 1, choice_selection: 3,         action_list: 2, alert_dialog: 1, app_download_cta: 1,       subtask_versions: {       },         }           start_location: { location: 'manual_link' }           debug_overrides: {},         flow_context: {       input_flow_data: {   - Body: {   - Headers: guest token headers from TokenManager   - POST https://api.x.com/1.1/onboarding/task.json   Step 1: Initialize login flow   Full login flow implementation:2. async login(username, password, email) → CookieJar1. constructor(http, tokenManager)Methods:- _flowToken: string|null- _tokenManager: TokenManager reference- _http: HttpClient referenceProperties:Export class CredentialAuth:Twitter's login uses a multi-step "task" flow via POST https://api.x.com/1.1/onboarding/task.json. Each step returns a flow_token and a list of subtasks. The client must complete each subtask in sequence.Create src/client/auth/CredentialAuth.js.```### Prompt 2: Twitter Login Flow Implementation```All methods are synchronous except saveToFile and loadFromFile. ESM export. @author nich (@nichxbt).- personalization_id — tracking cookie- guest_id — guest session ID- twid — user ID in format u%3D1234567890- ct0 — CSRF token (changes frequently)- auth_token — the session token (persists across restarts)Twitter's critical cookies:    - Remove all expired cookies15. removeExpired() → void    - Check if a specific cookie has expired14. isExpired(name: string) → boolean    - Return empty CookieJar if file doesn't exist (don't crash)    - Read JSON from file, create CookieJar13. static async loadFromFile(filePath: string) → CookieJar    - Create directory if needed (mkdir -p)    - Write JSON to file using fs/promises12. async saveToFile(filePath: string) → void    - Deserialize from JSON array11. static fromJSON(json: Array<Cookie>) → CookieJar    - Serialize to JSON-safe array10. toJSON() → Array<Cookie>   - Format as HTTP Cookie header value: "name1=value1; name2=value2"9. toCookieString() → string8. has(name: string) → boolean   - Remove all cookies7. clear() → void   - Remove cookie by name6. remove(name: string) → void   - Shorthand: return just the value5. getValue(name: string) → string|null   - Return all cookies as array4. getAll() → Array<Cookie>   - Get cookie by name3. get(name: string) → Cookie|null   - Add or update a cookie by name2. set(cookie: Cookie) → void   - Initialize from optional array1. constructor(cookies?: Array<Cookie>)Methods:}  sameSite: string  secure: boolean,  httpOnly: boolean,  expires: Date|null,    path: string,  domain: string,  value: string,  name: string,{Cookie shape:- _cookies: Map<string, Cookie> — keyed by nameProperties:Export class CookieJar:A lightweight cookie jar that stores, serializes, and deserializes Twitter session cookies. Not a full HTTP cookie spec implementation — just enough for Twitter's auth cookies.Create src/client/auth/CookieJar.js.```### Prompt 1: CookieJar Implementation## Prompts---```  CookieJar.js            ← Cookie storage with serialize/deserialize  TokenManager.js         ← Bearer + guest + CSRF token management (Track 01 Prompt 13)  CredentialAuth.js       ← Username/password login flow via task.json  CookieAuth.js          ← Main auth class (login, cookie management)src/client/auth/```## Architecture---Twitter's login flow uses a multi-step "onboarding/task.json" flow with subtask transitions.- **the-convocation/twitter-scraper**: Same pattern, cookie persistence via JSON- **agent-twitter-client**: `scraper.login('username', 'password')` → `scraper.getCookies()` → `scraper.setCookies(cookies)`- **twikit**: `client.login(auth_info_1=USERNAME, auth_info_2=EMAIL, password=PASSWORD, cookies_file='cookies.json')`Study competitor auth flows:```src/cli/index.js                   — Existing CLI auth commandssrc/mcp/server.js                  — How MCP server handles auth tokenssrc/scrapers/twitter/index.js      — loginWithCookie() function (line ~95, Puppeteer-based)src/auth/teamManager.js            — Existing auth-adjacent code (team management)```## Research Before Starting---> Every top X/Twitter repo (twikit, agent-twitter-client, twitter-scraper) has robust cookie-based authentication with JSON persistence. XActions currently uses sessionStorage (lost on tab close) and has no programmatic login flow. This track builds a complete auth system.
> Build a production-grade authentication system that supports cookie persistence, username/password login via Twitter's internal onboarding flow, and guest token management. This is the #1 prerequisite — every other track depends on authenticated sessions.

---

## Research Before Starting

Read these files to understand existing auth patterns:

```
src/scrapers/twitter/index.js     — Current cookie injection via Puppeteer (lines 80-140)
src/mcp/server.js                 — SESSION_COOKIE env var usage (line 48)
src/mcp/local-tools.js            — How MCP tools pass cookies to scrapers
src/cli/index.js                  — CLI config storage (~/.xactions/config.json)
api/routes/session-auth.js        — Express session auth route
api/middleware/auth.js             — JWT auth middleware
.env.example                      — XACTIONS_SESSION_COOKIE env var
```

Study competitor auth implementations:

- `the-convocation/twitter-scraper` — Cookie jar with JSON serialization, guest token rotation
- `agent-twitter-client` (ElizaOS) — Username/password login, cookie persistence, 2FA support
- `d60/twikit` — Python: login(), save_cookies(), load_cookies(), guest token pool

---

## Architecture

```
src/client/auth/
  CookieAuth.js           ← Cookie jar: parse, store, serialize, load from file/env
  CredentialAuth.js        ← Username/password login via Twitter onboarding API
  GuestToken.js            ← Guest token activation + rotation
  TokenManager.js          ← Bearer + csrf token management, token refresh
  TwoFactorAuth.js         ← TOTP (authenticator app) and SMS 2FA handling
  index.js                 ← Re-exports all auth modules
```

### Twitter's Internal Login Flow

The login uses Twitter's `onboarding/task.json` endpoint with a multi-step flow:

```
Step 1: POST /1.1/onboarding/task.json  → flow_token (flow_name: "login")
Step 2: POST /1.1/onboarding/task.json  → Submit username (LoginJsInstrumentationSubtask)
Step 3: POST /1.1/onboarding/task.json  → Submit username (LoginEnterUserIdentifierSSO)
Step 4: POST /1.1/onboarding/task.json  → Submit password (LoginEnterPassword)
Step 5: POST /1.1/onboarding/task.json  → Handle 2FA if required (LoginTwoFactorAuthChallenge)
Step 6: Extract auth_token + ct0 from response cookies → Store in CookieAuth
```

### Cookie Format

Twitter uses these cookies for authenticated requests:

```
auth_token     — Main session cookie (hex string, ~40 chars)
ct0            — CSRF token (must be sent as both cookie and x-csrf-token header)
guest_id       — Guest identification (optional)
personalization_id — Personalization tracking (optional)
```

---

## Prompts

### Prompt 1: CookieAuth Class — Cookie Jar with File Persistence

```
You are building the XActions authentication system. Create src/client/auth/CookieAuth.js — a cookie management class that stores, serializes, and loads Twitter session cookies.

Requirements:
- ESM module (import/export), @author nich (@nichxbt), @license MIT
- Class CookieAuth with these methods:
  - constructor() — initializes empty cookie map
  - set(name, value) — set a cookie
  - get(name) — get a cookie value, returns undefined if not set
  - has(name) — returns boolean
  - delete(name) — remove a cookie
  - clear() — remove all cookies
  - getAll() — returns plain object { name: value, ... }
  - toString() — returns cookie header string: "auth_token=abc; ct0=xyz; ..."
  - isAuthenticated() — returns true if auth_token AND ct0 are both set
  - getAuthHeaders() — returns object with Cookie header and x-csrf-token header:
    { 'Cookie': this.toString(), 'x-csrf-token': this.get('ct0') }
  - async save(filePath) — serialize all cookies to JSON file using fs/promises
  - static async load(filePath) — deserialize from JSON file, returns new CookieAuth instance
  - static fromEnv() — creates instance from XACTIONS_SESSION_COOKIE env var (auth_token value)
  - static fromObject(obj) — creates instance from { auth_token: '...', ct0: '...' } object
  - static parse(cookieString) — parse a "name=value; name2=value2" string into CookieAuth

The cookie file format should be:
{
  "cookies": { "auth_token": "...", "ct0": "...", ... },
  "created": "2026-01-01T00:00:00Z",
  "username": null
}

Include JSDoc for every method. Export both the class and a singleton factory:
export function createCookieAuth(options) that auto-detects source (file, env, or object).

File: src/client/auth/CookieAuth.js
```

### Prompt 2: GuestToken — Token Activation and Rotation

```
Create src/client/auth/GuestToken.js — manages Twitter guest tokens for unauthenticated API access.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Uses the public bearer token: "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
- Class GuestToken with:
  - constructor({ maxAge = 3 * 60 * 60 * 1000 }) — default 3hr TTL
  - async activate() — POST to https://api.x.com/1.1/guest/activate.json with bearer auth, stores guest_token and timestamp
  - getToken() — returns current guest_token string
  - isExpired() — returns true if token is older than maxAge or not set
  - async ensureValid() — calls activate() if expired, returns token
  - getHeaders() — returns { 'x-guest-token': token, 'Authorization': 'Bearer ...' }
  - reset() — clears stored token, forcing re-activation on next ensureValid()

Use native fetch (Node 18+). No external dependencies.
Include proper error handling — if activation fails, throw with the HTTP status and response body.
Guest tokens are rate-limited; if 429 is returned, wait the Retry-After header duration and retry once.

Export: export default GuestToken and export { GuestToken }
File: src/client/auth/GuestToken.js
```

### Prompt 3: TokenManager — Bearer + CSRF Coordination

```
Create src/client/auth/TokenManager.js — coordinates bearer tokens, CSRF tokens, and guest tokens for all API requests.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Class TokenManager with:
  - constructor({ cookieAuth, guestToken }) — accepts CookieAuth and GuestToken instances
  - getHeaders() — returns complete headers object for authenticated requests:
    {
      'Authorization': 'Bearer <public_bearer_token>',
      'x-csrf-token': cookieAuth.get('ct0'),
      'Cookie': cookieAuth.toString(),
      'Content-Type': 'application/json',
      'User-Agent': '<realistic Chrome UA string>',
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-client-language': 'en',
    }
  - getGuestHeaders() — returns headers for unauthenticated requests (uses guest token instead of cookies)
  - isAuthenticated() — delegates to cookieAuth.isAuthenticated()
  - async ensureAuth() — throws if not authenticated, auto-refreshes guest token if in guest mode
  - refreshCsrf(newCt0) — updates the ct0 token (Twitter rotates it)
  - getUserAgent() — returns a realistic, randomized Chrome User-Agent string (pick from pool of 5 recent Chrome versions)

The bearer token is the public one embedded in Twitter's web client:
"AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"

Import CookieAuth from './CookieAuth.js' and GuestToken from './GuestToken.js'.
Export: export default TokenManager and export { TokenManager }
File: src/client/auth/TokenManager.js
```

### Prompt 4: CredentialAuth — Username/Password Login

```
Create src/client/auth/CredentialAuth.js — implements Twitter's internal login flow using the onboarding/task.json endpoint.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Class CredentialAuth with:
  - constructor({ cookieAuth, tokenManager }) — accepts auth dependencies
  - async login({ username, password, email }) — executes the full login flow:
    1. Activate a guest token
    2. POST /1.1/onboarding/task.json with flow_name "login" → get flow_token
    3. Submit JS instrumentation subtask (LoginJsInstrumentationSubtask)
    4. Submit username (LoginEnterUserIdentifierSSO subtask)
    5. If Twitter requests email verification (LoginEnterAlternateIdentifierSubtask), submit email
    6. Submit password (LoginEnterPassword subtask)
    7. If 2FA is required, throw Error with code 'TWO_FACTOR_REQUIRED' and attach the flow_token
    8. Extract auth_token and ct0 from Set-Cookie response headers
    9. Store in cookieAuth, return { success: true, username }
  - async submitTwoFactor({ flowToken, code }) — submit TOTP or SMS code:
    1. POST /1.1/onboarding/task.json with LoginTwoFactorAuthChallenge subtask
    2. Extract cookies, store in cookieAuth
    3. Return { success: true }

Each step POSTs to https://api.x.com/1.1/onboarding/task.json with:
- Headers: Bearer token, guest token, content-type json
- Body: { flow_token, subtask_inputs: [{ subtask_id, ... }] }

Parse Set-Cookie headers to extract auth_token and ct0 after the final step.
Handle error responses: AccountSuspended, WrongPassword, InvalidUsername — throw descriptive errors.
No external dependencies beyond native fetch.

File: src/client/auth/CredentialAuth.js
```

### Prompt 5: TwoFactorAuth — TOTP and SMS 2FA Handling

```
Create src/client/auth/TwoFactorAuth.js — handles two-factor authentication for Twitter login.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Class TwoFactorAuth with:
  - constructor({ tokenManager }) — stores token manager reference
  - async submitTotp({ flowToken, code }) — submit a 6-digit TOTP code from authenticator app
    POST to /1.1/onboarding/task.json with:
    subtask_id: "LoginTwoFactorAuthChallenge"
    subtask_inputs: [{ subtask_id: "LoginTwoFactorAuthChallenge", enter_text: { text: code } }]
  - async submitSmsCode({ flowToken, code }) — submit SMS verification code (same endpoint, same format)
  - async requestSmsCode({ flowToken }) — request Twitter to resend SMS code
    Uses subtask_id: "LoginAcid" with action "resend"
  - detectMethod(taskResponse) — inspects the task response to determine if 2FA is TOTP, SMS, or backup code
    Returns: { method: 'totp' | 'sms' | 'backup', flowToken: '...' }

Parse the response after submission:
- If subtask "LoginSuccessSubtask" appears → return { success: true, cookies: extractedCookies }
- If subtask "LoginAcid" with error → throw with descriptive message
- Extract auth_token and ct0 from the response Set-Cookie headers

File: src/client/auth/TwoFactorAuth.js
```

### Prompt 6: Auth Module Index — Clean Re-exports

```
Create src/client/auth/index.js — the barrel export file for the auth module.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Re-export all auth classes:
  export { CookieAuth, createCookieAuth } from './CookieAuth.js';
  export { GuestToken } from './GuestToken.js';
  export { TokenManager } from './TokenManager.js';
  export { CredentialAuth } from './CredentialAuth.js';
  export { TwoFactorAuth } from './TwoFactorAuth.js';

- Export a convenience factory function:
  export async function createAuth(options = {}) {
    // If options.cookies (file path) → load from file
    // If options.cookieString → parse from string
    // If options.authToken → create from single auth_token
    // If process.env.XACTIONS_SESSION_COOKIE → load from env
    // Returns: { cookieAuth, guestToken, tokenManager, credentialAuth, twoFactorAuth }
  }

- Export a one-liner login function:
  export async function login({ username, password, email, twoFactorCode, cookieFile }) {
    // Creates all auth objects
    // Calls credentialAuth.login()
    // If 2FA required and twoFactorCode provided, submits it
    // If cookieFile provided, saves cookies
    // Returns: { cookieAuth, tokenManager }
  }

File: src/client/auth/index.js
```

### Prompt 7: Cookie Persistence Integration with CLI

```
Update the auth system to integrate with XActions CLI cookie storage.

Read src/cli/index.js (lines 23-46) to understand the existing config pattern:
- CONFIG_DIR = ~/.xactions/
- CONFIG_FILE = ~/.xactions/config.json

Create src/client/auth/storage.js with:
- async function getDefaultCookiePath() — returns ~/.xactions/cookies.json
- async function saveCookiesToConfig(cookieAuth, username) — saves cookies into ~/.xactions/config.json under a "sessions" key, keyed by username
- async function loadCookiesFromConfig(username) — loads cookies from ~/.xactions/config.json for a specific username, returns CookieAuth instance
- async function listSessions() — returns array of { username, createdAt, isValid } from stored sessions
- async function deleteSession(username) — removes a session from config
- async function getActiveSession() — returns the most recently used session

The config.json format becomes:
{
  "sessions": {
    "nichxbt": {
      "cookies": { "auth_token": "...", "ct0": "..." },
      "created": "2026-01-01T00:00:00Z",
      "lastUsed": "2026-02-26T00:00:00Z"
    }
  },
  "activeSession": "nichxbt",
  ...existing config fields preserved...
}

Merge with existing config data — never overwrite non-session fields.
File: src/client/auth/storage.js
```

### Prompt 8: Session Validation and Auto-Refresh

```
Create src/client/auth/SessionValidator.js — validates that stored cookies are still active and handles session refresh.

Requirements:
- ESM module, @author nich (@nichxbt), @license MIT
- Class SessionValidator with:
  - constructor({ tokenManager, cookieAuth })
  - async validate() — makes a lightweight authenticated request to verify the session:
    GET https://api.x.com/1.1/account/verify_credentials.json
    with auth headers from tokenManager.getHeaders()
    Returns: { valid: true, user: { id, username, displayName } } or { valid: false, reason: 'expired' | 'suspended' | 'locked' }
  - async validateAndRefreshCsrf() — validates session and extracts updated ct0 from response cookies
    Twitter rotates ct0 periodically; this keeps it fresh
  - async getLoggedInUser() — returns { id, username, displayName, profileImageUrl } from verify_credentials
  - isSessionExpired(error) — checks if an API error means the session is expired (401 status, specific error codes)

Handle these error scenarios:
- 401 → session expired, return { valid: false, reason: 'expired' }
- 403 with error code 326 → account locked, return { valid: false, reason: 'locked' }
- 403 with error code 64 → account suspended, return { valid: false, reason: 'suspended' }
- 429 → rate limited, retry after delay, don't treat as invalid
- Network error → throw, don't treat as invalid session

File: src/client/auth/SessionValidator.js
```

### Prompt 9: Auth Integration Tests — Real Cookie Flows

```
Create tests/client/auth/cookieAuth.test.js — comprehensive tests for the CookieAuth class.

Requirements:
- Use vitest (import { describe, it, expect, beforeEach, afterEach } from 'vitest')
- Test file operations with a temp directory (use os.tmpdir() + crypto.randomUUID())
- Clean up temp files in afterEach

Test cases (minimum 20):
1. constructor creates empty cookie jar
2. set/get stores and retrieves cookies
3. has returns true for set cookies, false for unset
4. delete removes a cookie
5. clear removes all cookies
6. getAll returns plain object
7. toString produces valid cookie header string
8. toString with no cookies returns empty string
9. isAuthenticated returns false when missing auth_token
10. isAuthenticated returns false when missing ct0
11. isAuthenticated returns true when both present
12. getAuthHeaders includes Cookie and x-csrf-token
13. save writes JSON to file with correct format
14. load reads JSON from file and returns CookieAuth instance
15. load throws on missing file
16. fromEnv creates from XACTIONS_SESSION_COOKIE env var
17. fromObject creates from plain object
18. parse creates from cookie header string
19. parse handles whitespace and edge cases
20. save/load roundtrip preserves all cookies
21. fromEnv with no env var returns unauthenticated instance

No mock data — use real cookie-format strings for test data.
File: tests/client/auth/cookieAuth.test.js
```

### Prompt 10: Auth Integration Tests — Guest Token

```
Create tests/client/auth/guestToken.test.js — tests for GuestToken class.

Requirements:
- Use vitest
- Mock native fetch using vitest.fn() — do NOT use real network calls
- But mock realistic Twitter API responses (actual JSON shapes)

Test cases:
1. activate() sends POST with correct bearer token
2. activate() stores token and timestamp
3. getToken() returns null before activation
4. getToken() returns token after activation
5. isExpired() returns true before activation
6. isExpired() returns false after fresh activation
7. isExpired() returns true after maxAge elapsed (use vi.advanceTimersByTime)
8. ensureValid() activates if expired
9. ensureValid() reuses token if still valid
10. getHeaders() includes x-guest-token and Authorization
11. reset() clears the stored token
12. activate() throws on non-200 response
13. activate() retries once on 429 with Retry-After header
14. activate() throws on second 429
15. constructor respects custom maxAge

File: tests/client/auth/guestToken.test.js
```

### Prompt 11: Auth Integration Tests — Credential Login

```
Create tests/client/auth/credentialAuth.test.js — tests for the full login flow.

Requirements:
- Use vitest
- Mock fetch to simulate Twitter's multi-step onboarding flow
- Each login step returns a flow_token and the next subtask

Test cases:
1. login() sends initial request with flow_name "login"
2. login() submits username in correct subtask format
3. login() submits password in correct subtask format
4. login() extracts auth_token from Set-Cookie headers
5. login() extracts ct0 from Set-Cookie headers
6. login() stores cookies in CookieAuth
7. login() returns { success: true, username }
8. login() handles email verification step (LoginEnterAlternateIdentifierSubtask)
9. login() throws TWO_FACTOR_REQUIRED when 2FA is needed, includes flowToken
10. submitTwoFactor() submits TOTP code correctly
11. submitTwoFactor() extracts cookies after successful 2FA
12. login() throws on wrong password (specific Twitter error)
13. login() throws on suspended account
14. login() throws on invalid username
15. Full flow: login() → TWO_FACTOR_REQUIRED → submitTwoFactor() → success

Mock the fetch responses to match Twitter's actual response shapes:
- Each step returns: { flow_token: "...", status: "...", subtasks: [...] }
- Final step includes Set-Cookie: auth_token=xxx; ct0=yyy

File: tests/client/auth/credentialAuth.test.js
```

### Prompt 12: Auth Integration Tests — Session Validator

```
Create tests/client/auth/sessionValidator.test.js — tests for session validation.

Requirements:
- Use vitest, mock fetch

Test cases:
1. validate() sends GET to verify_credentials with correct headers
2. validate() returns { valid: true, user: {...} } for 200 response
3. validate() returns { valid: false, reason: 'expired' } for 401
4. validate() returns { valid: false, reason: 'locked' } for 403/326
5. validate() returns { valid: false, reason: 'suspended' } for 403/64
6. validate() retries on 429 before declaring invalid
7. validate() throws on network error (not invalid session)
8. validateAndRefreshCsrf() updates ct0 from response cookies
9. getLoggedInUser() returns user profile data
10. isSessionExpired() correctly identifies 401 errors
11. isSessionExpired() returns false for 429 errors
12. isSessionExpired() returns false for 500 errors

Use realistic Twitter API response shapes for verify_credentials:
{
  "id_str": "123456789",
  "screen_name": "testuser",
  "name": "Test User",
  "profile_image_url_https": "https://pbs.twimg.com/..."
}

File: tests/client/auth/sessionValidator.test.js
```

### Prompt 13: Auth TypeScript Definitions

```
Create types/client/auth.d.ts — TypeScript type definitions for the entire auth module.

Requirements:
- Covers every class, method, and factory function
- Uses proper TypeScript with overloads where appropriate

Contents:
- interface CookieData { cookies: Record<string, string>; created: string; username: string | null; }
- class CookieAuth { set, get, has, delete, clear, getAll, toString, isAuthenticated, getAuthHeaders, save, static load, static fromEnv, static fromObject, static parse }
- class GuestToken { activate, getToken, isExpired, ensureValid, getHeaders, reset }
- class TokenManager { getHeaders, getGuestHeaders, isAuthenticated, ensureAuth, refreshCsrf, getUserAgent }
- class CredentialAuth { login, submitTwoFactor }
- class TwoFactorAuth { submitTotp, submitSmsCode, requestSmsCode, detectMethod }
- class SessionValidator { validate, validateAndRefreshCsrf, getLoggedInUser, isSessionExpired }
- interface LoginResult { success: boolean; username: string; }
- interface ValidationResult { valid: boolean; reason?: 'expired' | 'suspended' | 'locked'; user?: UserInfo; }
- interface UserInfo { id: string; username: string; displayName: string; profileImageUrl?: string; }
- function createAuth(options): Promise<AuthContext>
- function login(options): Promise<{ cookieAuth: CookieAuth; tokenManager: TokenManager; }>
- interface AuthContext { cookieAuth: CookieAuth; guestToken: GuestToken; tokenManager: TokenManager; credentialAuth: CredentialAuth; twoFactorAuth: TwoFactorAuth; }

File: types/client/auth.d.ts
```

### Prompt 14: Wire Auth into Scraper Class and Package Exports

```
This prompt wires the auth module into the package.

1. Update src/index.js — add these exports after the existing scraper exports:
   export { CookieAuth, GuestToken, TokenManager, CredentialAuth, TwoFactorAuth, createAuth, login } from './client/auth/index.js';

2. Update package.json — add to the "exports" map:
   "./auth": "./src/client/auth/index.js"

3. Update types/index.d.ts — add at the bottom:
   export * from './client/auth';

After this, users can do:
   import { login, CookieAuth } from 'xactions';
   // or
   import { login } from 'xactions/auth';

Read the existing src/index.js and package.json before editing to preserve all existing exports.
Do NOT remove or modify any existing exports — only add new ones.
```

### Prompt 15: Auth README and Usage Documentation

```
Create docs/auth.md — comprehensive documentation for the authentication system.

Structure:
1. Overview — what auth methods are supported
2. Quick Start — 5-line login example
3. Cookie Authentication — using auth_token from browser
   - How to get auth_token from browser DevTools
   - Using XACTIONS_SESSION_COOKIE env var
   - Loading from file
4. Username/Password Login — programmatic login flow
   - Basic login
   - Handling 2FA (TOTP and SMS)
   - Error handling (wrong password, suspended, locked)
5. Session Management — multiple accounts
   - Saving/loading sessions
   - Listing sessions
   - Switching active session
6. Session Validation — checking if session is alive
7. Guest Mode — unauthenticated access with guest tokens
8. Security Best Practices
   - Never commit cookies to git
   - Use env vars in production
   - Rotate sessions periodically
9. API Reference — every class and method with examples
10. Troubleshooting — common auth errors and fixes

Include real code examples (not pseudocode) for every section.
Reference the actual file paths in src/client/auth/.
Include a table of all auth-related env vars.

File: docs/auth.md
```

---

## Validation

After all 15 prompts are complete, verify:

```bash
# All files exist
ls src/client/auth/{CookieAuth,GuestToken,TokenManager,CredentialAuth,TwoFactorAuth,SessionValidator,storage,index}.js
ls tests/client/auth/{cookieAuth,guestToken,credentialAuth,sessionValidator}.test.js
ls types/client/auth.d.ts
ls docs/auth.md

# Tests pass
npx vitest run tests/client/auth/

# TypeScript types are valid
npx tsc --noEmit types/client/auth.d.ts

# Package exports work
node -e "import('xactions/auth').then(m => console.log(Object.keys(m)))"
```

# Track 11 — CORS Proxy & Frontend Embedding

> Build a lightweight CORS proxy server that allows the XActions HTTP scraper to be embedded in browser-based applications (dashboards, browser extensions, third-party web apps). The proxy transforms Twitter GraphQL requests to bypass CORS restrictions, handles authentication forwarding, and provides a drop-in fetch wrapper for frontend JavaScript.

---

## Research Before Starting

```
api/server.js                       — Existing Express server (add proxy routes here)
api/middleware/                      — Existing middleware (rate limiting, auth)
api/config/                         — Server configuration
dashboard/                          — Static HTML frontend (consumer of the proxy)
dashboard/js/                       — Frontend JavaScript
extension/                          — Browser extension (another consumer)
src/client/http/HttpClient.js       — Node.js HTTP client (requests to mirror)
src/client/http/graphql.js          — GraphQL query IDs
docker-compose.yml                  — Container config
Dockerfile                          — Docker build
fly.toml                            — Fly.io deployment
railway.json                        — Railway deployment
render.yaml                         — Render deployment
vercel.json                         — Vercel config
wrangler.toml                       — Cloudflare Workers config
```

Study existing CORS proxy solutions:
- `nicxbt/cors-anywhere` — popular open-source CORS proxy
- Cloudflare Workers as CORS proxy pattern
- Twitter's own CORS policy and preflight headers

---

## Architecture

```
src/proxy/
  index.js                  ← Module entry, exports ProxyServer + middleware
  server.js                 ← Standalone CORS proxy server
  middleware.js              ← Express middleware for embedding in existing server
  transformer.js             ← Request/response transformer
  allowlist.js               ← Origin allowlist management
  cache.js                   ← Response caching layer
  headers.js                 ← CORS header management
  health.js                  ← Health check endpoint

src/client/browser/
  index.js                   ← Bundle entry for browser
  fetch.js                   ← Drop-in fetch wrapper (uses proxy)
  scraper.js                 ← Browser-compatible Scraper class
  config.js                  ← Proxy URL configuration

dashboard/js/
  xactions-embed.js          ← Pre-built embeddable script for dashboard

api/routes/
  proxy.js                   ← Proxy routes mounted on existing API server

workers/
  cors-proxy.js              ← Cloudflare Worker version
```

---

## Prompts

### Prompt 1: CORS Header Manager

```
Create src/proxy/headers.js — manages CORS headers for proxy responses.

Requirements:
- Class CorsHeaders:
  - constructor(options = {})
    - allowedOrigins: string[] — default ["*"]
    - allowedMethods: string[] — default ["GET", "POST", "OPTIONS"]
    - allowedHeaders: string[] — include standard + Twitter-specific
    - maxAge: number — preflight cache duration (default 86400 = 24hr)
    - exposeHeaders: string[] — rate limit headers to expose
    - credentials: boolean — default false

  - getHeaders(origin: string) → object
    Returns CORS headers:
    - Access-Control-Allow-Origin (respects allowedOrigins)
    - Access-Control-Allow-Methods
    - Access-Control-Allow-Headers
    - Access-Control-Max-Age
    - Access-Control-Expose-Headers (x-rate-limit-remaining, x-rate-limit-reset)
    - Access-Control-Allow-Credentials (if enabled)

  - isOriginAllowed(origin: string) → boolean
    - Checks against allowedOrigins
    - Supports wildcards: "*.xactions.app"
    - Always allows null origin (for non-browser requests)

  - getPreflightHeaders(origin: string) → object
    - Full set of preflight response headers

  - applyToResponse(res: object, origin: string) → void
    - Sets all CORS headers on Express response object

Standard CORS headers for Twitter GraphQL:
  Allowed headers: authorization, content-type, x-csrf-token, x-twitter-auth-type, x-twitter-active-user, cookie
  Exposed headers: x-rate-limit-limit, x-rate-limit-remaining, x-rate-limit-reset

File: src/proxy/headers.js
```

### Prompt 2: Origin Allowlist

```
Create src/proxy/allowlist.js — origin allowlist for proxy security.

Requirements:
- Class OriginAllowlist:
  - constructor(options = {})
    - origins: string[] — explicitly allowed origins
    - patterns: string[] — glob patterns ("*.xactions.app")
    - allowLocalhost: boolean — default true (for development)
    - allowExtensions: boolean — default true (chrome-extension://)
    - maxOriginsPerIp: number — default 5 (anti-abuse)

  - add(origin: string) → void
  - remove(origin: string) → void
  - check(origin: string, ip: string) → { allowed: boolean, reason?: string }
    Checks:
    1. Exact match in origins list
    2. Pattern match against patterns
    3. Localhost check (127.0.0.1, localhost, ::1)
    4. Extension check (chrome-extension://, moz-extension://)
    5. Per-IP origin count (prevent one IP from using many origins)
  - getAll() → string[]

  - @static fromEnv() → OriginAllowlist
    Reads XACTIONS_ALLOWED_ORIGINS env var (comma-separated)

  - @static default() → OriginAllowlist
    Returns allowlist with: localhost, *.xactions.app, chrome-extension://*

File: src/proxy/allowlist.js
```

### Prompt 3: Request/Response Transformer

```
Create src/proxy/transformer.js — transforms requests and responses for proxy.

Requirements:
- Class RequestTransformer:
  - transformRequest(clientReq: object) → object
    Takes a proxy request and produces the Twitter API request:
    - Maps proxy URL path to Twitter API URL
      /proxy/graphql/:queryId/:operationName → https://x.com/i/api/graphql/:queryId/:operationName
      /proxy/1.1/:endpoint → https://api.x.com/1.1/:endpoint
      /proxy/2/:endpoint → https://api.x.com/2/:endpoint
    - Forwards auth headers (cookie, x-csrf-token, authorization)
    - Adds required Twitter headers (x-twitter-active-user, x-twitter-auth-type)
    - Adds realistic User-Agent
    - Strips origin/referer (replaced with https://x.com)
    Returns: { url, method, headers, body }

  - transformResponse(twitterRes: object) → object
    Takes a Twitter API response and produces the proxy response:
    - Passes through response body unchanged
    - Extracts rate limit headers
    - Removes Twitter's restrictive CORS headers
    - Adds proxy CORS headers
    Returns: { status, headers, body }

  - buildTwitterUrl(path: string) → string
  - stripSensitiveHeaders(headers: object) → object
    Removes: set-cookie (unless configured), server, x-connection-hash

File: src/proxy/transformer.js
```

### Prompt 4: Response Cache

```
Create src/proxy/cache.js — in-memory response cache for proxy.

Requirements:
- Class ProxyCache:
  - constructor(options = {})
    - maxSize: number — max cached entries (default 1000)
    - defaultTtl: number — default TTL in ms (default 60000 = 1min)
    - ttlByEndpoint: object — per-endpoint TTL overrides

  - get(key: string) → { hit: boolean, data?: object, age?: number }
  - set(key: string, data: object, ttl?: number) → void
  - delete(key: string) → void
  - clear() → void
  - size() → number
  - stats() → { hits: number, misses: number, hitRate: number, entries: number }

  - getCacheKey(method: string, url: string, params: object) → string
    - Hash of method + url + sorted params
    - Only cache GET requests
    - Exclude auth headers from key

  - isStale(key: string) → boolean
  - prune() → number — removes expired entries, returns count

Default TTL by endpoint:
  - UserByScreenName: 5 min (profiles don't change fast)
  - UserTweets: 1 min
  - TweetDetail: 5 min
  - SearchTimeline: 30 sec (real-time)
  - Followers/Following: 2 min
  - guest/activate.json: 30 min

Use LRU eviction when maxSize reached.

File: src/proxy/cache.js
```

### Prompt 5: Proxy Express Middleware

```
Create src/proxy/middleware.js — Express middleware for adding proxy routes to any Express app.

Requirements:
- Function createProxyMiddleware(options = {}) → Router
  Returns an Express Router with:

  OPTIONS * → preflight handler (responds with CORS headers)

  POST /proxy/graphql/:queryId/:operationName
  GET  /proxy/graphql/:queryId/:operationName
    1. Check origin allowlist
    2. Check cache (GET only)
    3. Transform request → Twitter API
    4. Forward via fetch/httpx
    5. Transform response
    6. Cache response (GET only)
    7. Add CORS headers
    8. Return response

  GET /proxy/1.1/:path(*)
  POST /proxy/1.1/:path(*)
    Same but targets api.x.com/1.1/

  GET /proxy/health
    Returns { status: "ok", cached: N, uptime: N }

  Options:
    - allowedOrigins: string[]
    - cache: boolean (default true)
    - rateLimit: { window: ms, max: number } per IP
    - authMode: "passthrough" | "server-side"
      passthrough: client sends auth headers through proxy
      server-side: proxy uses server-configured credentials
    - serverCredentials: { authToken, ct0 } (for server-side auth)
    - timeout: number (default 15000)

File: src/proxy/middleware.js
```

### Prompt 6: Standalone Proxy Server

```
Create src/proxy/server.js — standalone CORS proxy server.

Requirements:
- Standalone Express server that can run independently
- Configuration via environment variables:
    PORT (default 3001)
    XACTIONS_ALLOWED_ORIGINS (comma-separated)
    XACTIONS_CACHE_ENABLED (default true)
    XACTIONS_RATE_LIMIT_WINDOW (default 900000 = 15 min)
    XACTIONS_RATE_LIMIT_MAX (default 300)
    XACTIONS_AUTH_MODE (passthrough | server-side)
    XACTIONS_AUTH_TOKEN (for server-side mode)
    XACTIONS_CT0 (for server-side mode)
    XACTIONS_LOG_LEVEL (debug | info | warn | error)

- Endpoints:
    All routes from middleware.js
    GET / → { name: "XActions CORS Proxy", version, endpoints: [...] }
    GET /health → { status, cache, rateLimit, uptime }
    GET /stats → { requests, cache, rateLimit } (optional, behind API key)

- Logging via console with timestamps and request IDs
- Graceful shutdown (SIGTERM/SIGINT)

Add to package.json:
  "proxy": "node src/proxy/server.js"

Create src/proxy/index.js — exports:
  export { createProxyMiddleware } from './middleware.js';
  export { ProxyServer } from './server.js';
  export { CorsHeaders } from './headers.js';
  export { OriginAllowlist } from './allowlist.js';
  export { ProxyCache } from './cache.js';
  export { RequestTransformer } from './transformer.js';

Files: src/proxy/server.js, src/proxy/index.js
```

### Prompt 7: API Server Integration

```
Create api/routes/proxy.js — mount the CORS proxy on the existing API server.

Requirements:
- Import createProxyMiddleware from src/proxy/middleware.js
- Create router with:
  router.use('/proxy', createProxyMiddleware({
    allowedOrigins: process.env.XACTIONS_ALLOWED_ORIGINS?.split(',') || ['*'],
    cache: true,
    rateLimit: { window: 900000, max: 300 },
    authMode: process.env.XACTIONS_AUTH_MODE || 'passthrough'
  }));

- Add to api/server.js:
  import proxyRoutes from './routes/proxy.js';
  app.use(proxyRoutes);

- Add /proxy/docs endpoint that returns OpenAPI-style JSON describing proxy endpoints
- Log proxy requests separately from API requests

Files: api/routes/proxy.js, api/server.js (update)
```

### Prompt 8: Browser Fetch Wrapper

```
Create src/client/browser/fetch.js — drop-in fetch wrapper for browser use.

Requirements:
- Function createProxyFetch(proxyUrl: string, options = {}) → Function
  Returns a fetch-compatible function that routes through the CORS proxy:
  
  const xfetch = createProxyFetch('https://proxy.xactions.app');
  const res = await xfetch('https://x.com/i/api/graphql/...', {
    headers: { cookie: '...', 'x-csrf-token': '...' }
  });

  Implementation:
  - Rewrites URL: https://x.com/i/api/graphql/... → {proxyUrl}/proxy/graphql/...
  - Rewrites URL: https://api.x.com/1.1/... → {proxyUrl}/proxy/1.1/...
  - Forwards all headers
  - Returns standard Response object

- Function createProxyFetchWithRetry(proxyUrl, options) → Function
  Same but with:
  - 3 retries on network error
  - Exponential backoff
  - 429 handling with Retry-After

- Export for both ESM and UMD:
  - ESM: import { createProxyFetch } from 'xactions/browser'
  - UMD: window.XActions.createProxyFetch (for script tag)

File: src/client/browser/fetch.js
```

### Prompt 9: Browser Scraper Class

```
Create src/client/browser/scraper.js — browser-compatible Scraper class.

Requirements:
- Class BrowserScraper:
  - constructor(proxyUrl: string, options = {})
  - Same API as src/client/Scraper.js but uses proxy fetch:
    - login(cookies) — cookie object or string
    - getProfile(username) → Promise<object>
    - getTweet(tweetId) → Promise<object>
    - getTweets(username, limit) → AsyncGenerator
    - getFollowers(username, limit) → AsyncGenerator
    - searchTweets(query, limit) → AsyncGenerator
    - sendTweet(text, options) → Promise<object>
    - like(tweetId) → Promise<boolean>
    - follow(username) → Promise<boolean>

  Internally uses createProxyFetch, not direct HTTP.
  
  Pagination uses same cursor logic.
  Parsers are shared with Node.js.

Create src/client/browser/index.js:
  export { BrowserScraper } from './scraper.js';
  export { createProxyFetch, createProxyFetchWithRetry } from './fetch.js';

Create src/client/browser/config.js:
  export const DEFAULT_PROXY_URL = 'http://localhost:3001';
  export const PRODUCTION_PROXY_URL = 'https://proxy.xactions.app';

Files: src/client/browser/scraper.js, src/client/browser/index.js, src/client/browser/config.js
```

### Prompt 10: Dashboard Embed Script

```
Create dashboard/js/xactions-embed.js — pre-built embeddable script for the dashboard.

Requirements:
- Self-contained UMD bundle (no imports needed)
- Exposes window.XActions:
  - XActions.Scraper — BrowserScraper class
  - XActions.createFetch — createProxyFetch function
  - XActions.version — package version
  - XActions.configure({ proxyUrl }) — set default proxy URL

Usage in HTML:
  <script src="/js/xactions-embed.js"></script>
  <script>
    XActions.configure({ proxyUrl: 'https://proxy.xactions.app' });
    const scraper = new XActions.Scraper();
    scraper.login({ auth_token: '...', ct0: '...' });
    
    const profile = await scraper.getProfile('elonmusk');
    document.getElementById('followers').textContent = profile.followers;
  </script>

Include:
- Minified inline versions of: proxy fetch, browser scraper, parsers, pagination
- Error handling with user-friendly messages
- CDN-friendly (no external dependencies)
- <2KB gzipped for the entire embed

File: dashboard/js/xactions-embed.js
```

### Prompt 11: Cloudflare Worker CORS Proxy

```
Create workers/cors-proxy.js — Cloudflare Worker version of the CORS proxy.

Requirements:
- Single-file Worker, compatible with wrangler (already configured in wrangler.toml)
- Handles:
  - OPTIONS → preflight with CORS headers
  - GET/POST /graphql/:queryId/:operationName → proxy to x.com
  - GET/POST /1.1/:path → proxy to api.x.com
  - GET / → JSON info page
  - GET /health → health check

- Uses Cloudflare's fetch API (no Node.js dependencies)
- Rate limiting via Worker KV (if available) or in-memory
- Origin allowlist from environment variables
- Response caching via Cache API (Cloudflare-native)
- Streaming responses (no buffering)

Update wrangler.toml if needed:
  [vars]
  ALLOWED_ORIGINS = "*"
  RATE_LIMIT_MAX = "300"

File: workers/cors-proxy.js
```

### Prompt 12: Tests — Proxy Core

```
Create tests/proxy/headers.test.js:
1. Default CORS headers include all required fields
2. Origin allowlist check
3. Wildcard origin matching
4. Preflight headers include max-age
5. Twitter-specific headers exposed

Create tests/proxy/transformer.test.js:
6. GraphQL URL transformation
7. REST 1.1 URL transformation
8. Auth header forwarding
9. Sensitive header stripping
10. User-Agent replacement
11. Origin/Referer replacement

Create tests/proxy/cache.test.js:
12. Cache set/get roundtrip
13. TTL expiration
14. LRU eviction at maxSize
15. Cache key generation (params order-independent)

Files: tests/proxy/headers.test.js, tests/proxy/transformer.test.js, tests/proxy/cache.test.js
```

### Prompt 13: Tests — Proxy Middleware and Browser

```
Create tests/proxy/middleware.test.js:
1. OPTIONS request returns preflight headers
2. GET graphql proxies to Twitter and returns response
3. Blocked origin returns 403
4. Rate limiting returns 429 after threshold
5. Cached response served from cache

Create tests/proxy/browser-fetch.test.js:
6. URL rewrite: x.com → proxy URL
7. Header forwarding
8. Retry on network error
9. 429 handling with backoff

Create tests/proxy/browser-scraper.test.js:
10. BrowserScraper constructs with proxy URL
11. login(cookies) sets auth state
12. getProfile returns parsed profile
13. getTweets yields paginated tweets
14. sendTweet sends via proxy
15. Error propagation from proxy

Files: tests/proxy/middleware.test.js, tests/proxy/browser-fetch.test.js, tests/proxy/browser-scraper.test.js
```

### Prompt 14: Deployment Configs and Docker

```
1. Update Dockerfile to include proxy server:
   - Add EXPOSE 3001 (proxy port)
   - Add CMD option to run proxy alongside API

2. Update docker-compose.yml:
   Add proxy service:
     xactions-proxy:
       build: .
       command: node src/proxy/server.js
       ports: ["3001:3001"]
       environment:
         - XACTIONS_ALLOWED_ORIGINS=*
         - XACTIONS_CACHE_ENABLED=true

3. Update fly.toml — add proxy service definition
4. Update render.yaml — add proxy service
5. Update railway.json — add proxy service

6. Create .env.example with all proxy environment variables documented

Files: Dockerfile (update), docker-compose.yml (update), fly.toml (update), render.yaml (update), railway.json (update), .env.example
```

### Prompt 15: CORS Proxy Documentation

```
Create docs/cors-proxy.md — complete documentation for the CORS proxy.

Structure:
1. Overview — what it does, why it's needed
2. Quick Start
   - Standalone: npm run proxy
   - With API server: auto-mounted at /proxy
   - Docker: docker compose up proxy
   - Cloudflare Worker: wrangler deploy
3. Architecture diagram (ASCII)
4. Configuration — all env vars with descriptions
5. Authentication Modes
   - Passthrough: browser → proxy → Twitter (browser handles auth)
   - Server-side: browser → proxy (proxy uses stored credentials)
6. Security
   - Origin allowlist
   - Rate limiting
   - No credential logging
   - IP-based throttling
7. Browser Integration
   - Script tag embed
   - ESM import
   - BrowserScraper class usage
8. Dashboard Integration
   - How the dashboard uses the proxy
   - Live examples
9. Caching
   - How it works
   - TTL by endpoint
   - Cache stats
10. Deployment
    - Docker
    - Fly.io
    - Render
    - Railway
    - Cloudflare Workers
    - Vercel Edge Functions
11. API Reference — all proxy endpoints
12. Troubleshooting — common issues

File: docs/cors-proxy.md
```

---

## Validation

```bash
# Proxy server starts
node src/proxy/server.js &
curl -i http://localhost:3001/health    # 200 OK

# CORS preflight works
curl -i -X OPTIONS http://localhost:3001/proxy/graphql/test/Test \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
# Should return Access-Control-Allow-Origin

# Proxy forwards requests (with auth)
curl http://localhost:3001/proxy/graphql/{queryId}/UserByScreenName \
  -H "Cookie: auth_token=...; ct0=..." \
  -H "x-csrf-token: ..."
# Should return Twitter profile data

# Tests pass
npx vitest run tests/proxy/

# Browser embed loads
# Open dashboard/index.html, check console for XActions global

# Cloudflare Worker deploys
wrangler deploy workers/cors-proxy.js --dry-run
```

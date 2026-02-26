# Track 11 — CORS Proxy & Browser Embedding

> XActions' Scraper class runs in Node.js, but many developers want to use it from browser-based apps (React, Vue, Next.js dashboards) or Edge/Cloudflare Workers. Twitter's API blocks browser requests due to CORS. This track builds a lightweight proxy server and a fetch-compatible browser client that routes through it.

---

## Research Before Starting

```
api/server.js                  — Existing Express.js server
api/routes/                    — Existing API routes
api/middleware/                — Existing middleware (auth, rate limit)
src/client/                    — New Scraper class (from Tracks 01-03)
dashboard/                     — Static HTML frontend (potential consumer)
wrangler.toml                  — Cloudflare Workers config exists
vercel.json                    — Vercel config exists
fly.toml                       — Fly.io config exists
```

Study patterns from:
- cors-anywhere (npm) — simple CORS proxy
- cloudflare-cors-anywhere — edge CORS proxy
- twikit's approach (Python, no browser support)
- the-convocation/twitter-scraper (Node only, no browser)

---

## Prompts

### Prompt 1: CORS Proxy Server Core

```
Create src/proxy/server.js — standalone CORS proxy server.

import express from 'express';
import cors from 'cors';
import { Scraper } from '../client/index.js';

const app = express();

1. CORS configuration:
   - Default: allow all origins (development mode)
   - Production: XACTIONS_ALLOWED_ORIGINS env var (comma-separated list)
   - Preflight: allow GET, POST, OPTIONS
   - Expose headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
   - Max age: 86400 (24h preflight cache)

2. Request parsing:
   - express.json() for POST bodies
   - express.urlencoded({ extended: true })

3. Health endpoint:
   GET /health → { status: "ok", version, uptime, authenticated }

4. Auth middleware:
   - Optional API key via X-API-Key header or ?api_key= query param
   - If XACTIONS_API_KEY env var set, require matching key
   - If not set, proxy runs open (development mode)
   - Rate limit per API key (or per IP if no key)

5. Scraper singleton:
   - Create one Scraper instance on startup
   - Load cookies from XACTIONS_COOKIE_FILE or XACTIONS_COOKIES env var
   - Reconnect if session expires
   - Expose isAuthenticated status on /health

6. Server startup:
   const PORT = process.env.PORT || 3001;
   app.listen(PORT, () => console.log(`🌐 XActions CORS Proxy running on port ${PORT}`));

Export app for testing and for mounting as sub-app in the main api/server.js.
```

### Prompt 2: REST API Routes — Read Endpoints

```
Create src/proxy/routes/read.js — public read endpoints that work without auth.

All routes return JSON, handle errors uniformly.

GET /api/v1/profile/:username
  → scraper.getProfile(username) → Profile JSON
  Response: { data: { id, username, name, bio, followers_count, ... }, meta: { cached, timestamp } }

GET /api/v1/tweet/:id
  → scraper.getTweet(id) → Tweet JSON
  Response: { data: { id, text, likes, retweets, ... }, meta: { timestamp } }

GET /api/v1/tweets/:username?count=20&cursor=
  → scraper.getTweets(username, { count }) → paginated Tweet array
  Response: { data: [tweets], meta: { count, cursor, has_more } }

GET /api/v1/search?q=query&count=20&mode=Latest&cursor=
  → scraper.searchTweets(query, { count, mode }) → paginated results
  Response: { data: [tweets], meta: { query, count, cursor, has_more } }

GET /api/v1/followers/:username?count=100&cursor=
  → scraper.getFollowers(username, { count }) → paginated Profile array

GET /api/v1/following/:username?count=100&cursor=
  → scraper.getFollowing(username, { count }) → paginated Profile array

GET /api/v1/trends
  → scraper.getTrends() → string array

GET /api/v1/list/:listId/tweets?count=50&cursor=
  → scraper.getListTweets(listId, { count }) → paginated Tweet array

For paginated endpoints:
- Accept cursor query param for pagination
- Return next cursor in meta.cursor
- Collect one page worth of results from AsyncGenerator
- Include meta.has_more boolean

Error responses:
  { error: { code: "NOT_FOUND", message: "User @x not found", status: 404 } }
  { error: { code: "RATE_LIMITED", message: "...", status: 429, retry_after: 60 } }
```

### Prompt 3: REST API Routes — Write Endpoints

```
Create src/proxy/routes/write.js — authenticated write endpoints.

All require proxy auth (API key) AND scraper auth (cookies).

POST /api/v1/tweet
  Body: { text: string, reply_to?: string, media_ids?: string[] }
  → scraper.sendTweet(text, { replyTo, mediaIds }) → created Tweet
  Response: { data: tweet, meta: { url } }

POST /api/v1/like/:tweetId
  → scraper.likeTweet(tweetId)
  Response: { data: { success: true, tweet_id } }

DELETE /api/v1/like/:tweetId
  → scraper.unlikeTweet(tweetId)

POST /api/v1/retweet/:tweetId
  → scraper.retweetTweet(tweetId)

DELETE /api/v1/retweet/:tweetId
  → scraper.unretweetTweet(tweetId)

POST /api/v1/follow/:username
  → scraper.followUser(username)

DELETE /api/v1/follow/:username
  → scraper.unfollowUser(username)

DELETE /api/v1/tweet/:tweetId
  → scraper.deleteTweet(tweetId)

GET /api/v1/me
  → scraper.me() → authenticated user Profile

Middleware chain for write routes:
1. requireApiKey — verify X-API-Key header
2. requireAuth — verify scraper is authenticated (has cookies)
3. validateBody — check required fields present
4. rateLimit — stricter rate limit for writes (10 req/min)
```

### Prompt 4: Rate Limiting Middleware

```
Create src/proxy/middleware/rateLimit.js — per-client rate limiting for the proxy.

Track requests per API key (or IP if no key).

class ProxyRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60_000;   // 1 minute window
    this.maxRequests = options.maxRequests || 60;  // 60 req/min default
    this.store = new Map();  // key → { count, resetAt }
  }

  middleware() {
    return (req, res, next) => {
      const key = req.apiKey || req.ip;
      const bucket = this._getBucket(key);
      
      if (bucket.count >= this.maxRequests) {
        res.set('Retry-After', Math.ceil((bucket.resetAt - Date.now()) / 1000));
        return res.status(429).json({
          error: { code: 'PROXY_RATE_LIMITED', message: '...', retry_after: ... }
        });
      }
      
      bucket.count++;
      res.set('X-RateLimit-Limit', this.maxRequests);
      res.set('X-RateLimit-Remaining', this.maxRequests - bucket.count);
      res.set('X-RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));
      next();
    };
  }
}

Create rate limit tiers:
- readLimiter: 60 requests/minute (profile, tweet, search)
- writeLimiter: 10 requests/minute (post, like, follow)
- searchLimiter: 30 requests/minute (search is expensive)
- healthLimiter: 10 requests/minute

Also add request logging middleware:
- Log: timestamp, method, path, apiKey (masked), status, duration
- Write to stdout in JSON format for log aggregation
```

### Prompt 5: Browser Client SDK

```
Create src/proxy/client/xactions-browser.js — fetch-based SDK for browsers.

/**
 * XActions Browser Client
 * Use in React, Vue, Next.js, or any browser environment.
 * Routes requests through the XActions CORS Proxy.
 */
class XActionsClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3001';
    this.apiKey = options.apiKey || null;
    this.timeout = options.timeout || 30000;
  }

  // --- Read methods ---
  async getProfile(username) { ... }
  async getTweet(tweetId) { ... }
  async getTweets(username, { count, cursor } = {}) { ... }
  async searchTweets(query, { count, mode, cursor } = {}) { ... }
  async getFollowers(username, { count, cursor } = {}) { ... }
  async getFollowing(username, { count, cursor } = {}) { ... }
  async getTrends() { ... }
  
  // --- Write methods (require API key) ---
  async sendTweet(text, { replyTo, mediaIds } = {}) { ... }
  async likeTweet(tweetId) { ... }
  async unlikeTweet(tweetId) { ... }
  async retweet(tweetId) { ... }
  async followUser(username) { ... }
  async unfollowUser(username) { ... }

  // --- Auto-pagination helper ---
  async *paginateAll(method, ...args) {
    let cursor = null;
    do {
      const result = await this[method](...args, { cursor });
      for (const item of result.data) yield item;
      cursor = result.meta.cursor;
    } while (cursor);
  }

  // --- Internal ---
  async _fetch(path, { method, body, params } = {}) {
    const url = new URL(path, this.baseUrl);
    if (params) Object.entries(params).forEach(([k,v]) => v != null && url.searchParams.set(k, v));
    
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const res = await fetch(url.toString(), {
        method: method || 'GET',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      
      const data = await res.json();
      if (!res.ok) throw new XActionsError(data.error.message, data.error);
      return data;
    } finally {
      clearTimeout(timer);
    }
  }
}

class XActionsError extends Error {
  constructor(message, { code, status, retry_after } = {}) { ... }
}

// UMD export for CDN usage + ES module export
export { XActionsClient, XActionsError };
if (typeof window !== 'undefined') window.XActionsClient = XActionsClient;
```

### Prompt 6: Browser Client — npm Package Build

```
Create build tooling to publish the browser client as a separate lightweight package.

1. Create src/proxy/client/package.json:
   {
     "name": "@xactions/browser",
     "version": "0.1.0",
     "description": "XActions browser client — X/Twitter data in any web app",
     "main": "dist/xactions-browser.cjs.js",
     "module": "dist/xactions-browser.esm.js",
     "browser": "dist/xactions-browser.umd.js",
     "types": "dist/xactions-browser.d.ts",
     "exports": {
       ".": {
         "import": "./dist/xactions-browser.esm.js",
         "require": "./dist/xactions-browser.cjs.js",
         "browser": "./dist/xactions-browser.umd.js"
       }
     },
     "files": ["dist/"],
     "scripts": {
       "build": "rollup -c",
       "prepublishOnly": "npm run build"
     },
     "peerDependencies": {},
     "devDependencies": { "rollup": "^4.0", "@rollup/plugin-terser": "^0.4" }
   }

2. Create src/proxy/client/rollup.config.js:
   - Input: xactions-browser.js
   - Output formats: ESM, CJS, UMD (global name: XActions)
   - Minified UMD for CDN (~5KB gzipped target)
   - Source maps

3. Create src/proxy/client/xactions-browser.d.ts — full TypeScript declarations:
   export interface Profile { id: string; username: string; ... }
   export interface Tweet { id: string; text: string; ... }
   export class XActionsClient { ... }
   export class XActionsError extends Error { ... }

4. Create CDN-ready HTML snippet for docs:
   <script src="https://unpkg.com/@xactions/browser/dist/xactions-browser.umd.js"></script>
   <script>
     const client = new XActions.XActionsClient({ baseUrl: 'https://your-proxy.com' });
     client.getProfile('elonmusk').then(console.log);
   </script>
```

### Prompt 7: Caching Layer

```
Create src/proxy/middleware/cache.js — response caching for the proxy.

class ProxyCache {
  constructor(options = {}) {
    this.store = new Map();
    this.ttl = {
      profile: options.profileTtl || 300_000,    // 5 min
      tweet: options.tweetTtl || 600_000,         // 10 min
      search: options.searchTtl || 60_000,        // 1 min
      trends: options.trendsTtl || 300_000,       // 5 min
      followers: options.followersTtl || 300_000, // 5 min
    };
    this.maxSize = options.maxSize || 1000;
  }

  middleware(category) {
    return (req, res, next) => {
      const key = this._buildKey(req);
      const cached = this.get(key);
      
      if (cached) {
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Age', Math.floor((Date.now() - cached.timestamp) / 1000));
        return res.json(cached.data);
      }
      
      // Intercept res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        if (res.statusCode === 200) {
          this.set(key, data, this.ttl[category]);
        }
        res.set('X-Cache', 'MISS');
        return originalJson(data);
      };
      next();
    };
  }

  get(key) { ... }      // Check TTL, evict if expired
  set(key, data, ttl) { ... }  // LRU eviction if maxSize exceeded
  invalidate(pattern) { ... }  // Regex-based cache invalidation
  clear() { ... }
  stats() { ... }       // { size, hits, misses, hitRate }
}

Cache invalidation rules:
- POST /tweet → invalidate user's tweet cache
- POST /like → invalidate tweet cache
- POST /follow → invalidate follower caches
- Manual: DELETE /api/v1/cache?pattern=profile:*

Add cache stats to /health endpoint.
```

### Prompt 8: WebSocket Real-time Streaming

```
Create src/proxy/realtime/ws.js — WebSocket support for real-time data streaming.

import { WebSocketServer } from 'ws';

class RealtimeServer {
  constructor(server, scraper) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.scraper = scraper;
    this.subscriptions = new Map();  // clientId → Set of subscription configs
  }

  start() {
    this.wss.on('connection', (ws, req) => {
      const clientId = crypto.randomUUID();
      ws.clientId = clientId;
      
      // Authenticate via query param or first message
      ws.on('message', (data) => this._handleMessage(ws, JSON.parse(data)));
      ws.on('close', () => this._cleanup(clientId));
    });
  }

  _handleMessage(ws, msg) {
    switch (msg.type) {
      case 'subscribe:search':
        // Poll search every N seconds, push new results
        this._subscribeSearch(ws, msg.query, msg.interval || 30);
        break;
      case 'subscribe:user':
        // Monitor user for new tweets
        this._subscribeUser(ws, msg.username, msg.interval || 60);
        break;
      case 'subscribe:trends':
        // Push trend updates
        this._subscribeTrends(ws, msg.interval || 300);
        break;
      case 'unsubscribe':
        this._unsubscribe(ws, msg.subscriptionId);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
    }
  }

  async _subscribeSearch(ws, query, intervalSec) {
    const seenIds = new Set();
    const id = crypto.randomUUID();
    const timer = setInterval(async () => {
      try {
        const tweets = [];
        for await (const tweet of this.scraper.searchTweets(query, { count: 20 })) {
          if (!seenIds.has(tweet.id)) {
            seenIds.add(tweet.id);
            tweets.push(tweet);
          }
        }
        if (tweets.length > 0) {
          ws.send(JSON.stringify({ type: 'tweets', subscriptionId: id, data: tweets }));
        }
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', subscriptionId: id, error: err.message }));
      }
    }, intervalSec * 1000);
    
    this.subscriptions.get(ws.clientId)?.add({ id, timer });
    ws.send(JSON.stringify({ type: 'subscribed', subscriptionId: id }));
  }
}

Browser client addition — add to XActionsClient:
  connectWebSocket() → returns WebSocket with typed event handlers
  subscribe(type, params) → returns subscription handle
  unsubscribe(subscriptionId)
  onTweet(callback), onTrend(callback)
```

### Prompt 9: Cloudflare Workers Deployment

```
Create src/proxy/workers/worker.js — Cloudflare Workers edge proxy.

A lightweight version of the CORS proxy that runs on Cloudflare's edge network.

export default {
  async fetch(request, env) {
    // CORS headers
    if (request.method === 'OPTIONS') return handlePreflight(request);
    
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Route matching
    if (path === '/health') return handleHealth(env);
    if (path.startsWith('/api/v1/')) return handleApi(request, env, path);
    
    return new Response('Not Found', { status: 404 });
  }
};

Key differences from Express version:
- No Scraper instance — Workers are stateless
- Use env.TWITTER_COOKIES KV binding for cookie storage
- Direct fetch to Twitter API (Workers bypass CORS)
- Cache API instead of in-memory cache
- Rate limiting via Durable Objects or KV

async function handleApi(request, env, path) {
  // Parse route: /api/v1/profile/:username
  // Build Twitter GraphQL request
  // Forward with proper headers (bearer token, cookies from KV)
  // Transform response to XActions format
  // Cache with Cache API
}

Update wrangler.toml:
  name = "xactions-proxy"
  main = "src/proxy/workers/worker.js"
  [vars]
  ALLOWED_ORIGINS = "*"
  [kv_namespaces]
  [[kv_namespaces]]
  binding = "CACHE"
  [[kv_namespaces]]  
  binding = "CONFIG"

Create src/proxy/workers/twitter-api.js:
  Helper functions to call Twitter's internal API directly from Workers.
  Reuse constants (bearer token, endpoints) from src/client/api/endpoints.js.
```

### Prompt 10: Docker Deployment

```
Create deployment configurations for the CORS proxy.

1. Update Dockerfile to include proxy mode:
   Add build arg XACTIONS_MODE=full|proxy|api
   If proxy: only install proxy dependencies, expose port 3001
   CMD ["node", "src/proxy/server.js"]

2. Create docker-compose.proxy.yml:
   services:
     proxy:
       build:
         args: { XACTIONS_MODE: proxy }
       ports: ["3001:3001"]
       environment:
         - XACTIONS_COOKIE_FILE=/data/cookies.json
         - XACTIONS_API_KEY=${XACTIONS_API_KEY}
         - XACTIONS_ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-*}
       volumes:
         - ./data:/data
       restart: unless-stopped
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
         interval: 30s
         timeout: 10s
         retries: 3

3. Create fly.proxy.toml — Fly.io config for proxy:
   [build]
   dockerfile = "Dockerfile"
   [build.args]
   XACTIONS_MODE = "proxy"
   [[services]]
   internal_port = 3001
   protocol = "tcp"
   [[services.ports]]
   port = 443
   handlers = ["tls", "http"]

4. Create render.proxy.yaml — Render config

5. Create src/proxy/deploy/railway.json — Railway config

6. Create docs/deployment-proxy.md — deployment guide:
   - Docker (local, compose)
   - Fly.io (one-click)
   - Railway (one-click)
   - Render (one-click)
   - Cloudflare Workers
   - Vercel Edge Functions
   - Self-hosted (systemd service)
```

### Prompt 11: Request Transform and Security

```
Create src/proxy/middleware/security.js — security hardening for the proxy.

1. Request sanitization:
   - Strip dangerous headers from incoming requests
   - Validate username format (alphanumeric + underscore only)
   - Validate tweet IDs (numeric only)
   - Sanitize search queries (max 500 chars, strip HTML)
   - Block SQL injection patterns in query parameters

2. Response sanitization:
   - Strip internal Twitter data (device info, IP-related fields)
   - Remove session tokens from responses
   - Ensure no cookie values leak to clients

3. CORS hardening for production:
   function createCorsConfig(allowedOrigins) {
     return cors({
       origin: (origin, callback) => {
         if (!origin) return callback(null, true);  // Allow non-browser
         if (allowedOrigins.includes('*')) return callback(null, true);
         if (allowedOrigins.includes(origin)) return callback(null, true);
         callback(new Error('CORS not allowed'));
       },
       credentials: false,
       maxAge: 86400,
     });
   }

4. Request signing (optional):
   - HMAC signature verification for API keys
   - Timestamp-based request expiry (prevent replay attacks)
   - Nonce tracking for write operations

5. Abuse prevention:
   - Block rapid sequential follows/unfollows (anti-spam)
   - Detect and block scraping patterns (sequential user IDs)
   - Temporary ban after repeated auth failures
   - Honeypot endpoints that trigger bans

6. Helmet integration:
   - CSP headers
   - HSTS
   - X-Frame-Options
   - X-Content-Type-Options
```

### Prompt 12: OpenAPI Specification

```
Create src/proxy/openapi.yaml — full OpenAPI 3.1 specification for the proxy API.

openapi: "3.1.0"
info:
  title: XActions CORS Proxy API
  version: "1.0.0"
  description: "REST API for X/Twitter data. No Twitter API key required."
  license: { name: MIT }
  contact: { name: nichxbt, url: "https://github.com/nirholas/XActions" }

servers:
  - url: http://localhost:3001
    description: Local development
  - url: https://proxy.xactions.dev
    description: Production

Document every endpoint:
- Path, method, description
- Parameters (path, query) with types and validation
- Request body schemas (for POST endpoints)
- Response schemas with examples
- Error response schemas
- Rate limit headers
- Authentication (API key)

Components:
  schemas:
    Profile, Tweet, Media, Poll, Trend
    PaginatedResponse, ErrorResponse
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key

Also:
1. Create src/proxy/routes/docs.js — serve Swagger UI at /docs
   Use swagger-ui-express
   
2. Create src/proxy/routes/openapi.js — serve spec at /openapi.json

3. Add to proxy server startup: mount /docs and /openapi.json
```

### Prompt 13: Integration with Main API Server

```
Mount the CORS proxy as a sub-module of the existing Express API server.

1. Update api/server.js:
   - Import proxy app from src/proxy/server.js
   - Mount at /proxy prefix: app.use('/proxy', proxyApp)
   - Share Scraper instance between main API and proxy
   - Unified health check combining both

2. Create src/proxy/index.js — clean export:
   export { createProxyApp } from './server.js';
   export { XActionsClient } from './client/xactions-browser.js';
   export { RealtimeServer } from './realtime/ws.js';

3. Update package.json exports:
   "./proxy": "./src/proxy/index.js",
   "./proxy/client": "./src/proxy/client/xactions-browser.js"

4. Update src/index.js to include proxy exports:
   export * from './proxy/index.js';

5. Create src/proxy/README.md — standalone docs for the proxy module:
   - Architecture diagram (Browser → Proxy → Twitter)
   - Quick start (run proxy, use browser client)
   - Configuration (env vars)
   - Deployment options
   - API reference (link to /docs)

6. Update dashboard to use browser client:
   - dashboard/js/api.js — replace any direct API calls with XActionsClient
   - Add proxy URL configuration in dashboard settings
```

### Prompt 14: MCP and CLI Integration

```
Add proxy management commands to MCP server and CLI.

MCP Tools (add to src/mcp/server.js):

1. x_proxy_start — Start the CORS proxy server
   Params: { port?: number, allowedOrigins?: string[] }
   Returns: { url, status, authenticated }

2. x_proxy_status — Check proxy health
   Returns: { status, uptime, cacheStats, rateLimitStats, activeConnections }

3. x_proxy_config — Update proxy configuration at runtime
   Params: { allowedOrigins?, cacheTtl?, rateLimit? }

4. x_proxy_cache_clear — Clear proxy cache
   Params: { pattern?: string }

CLI Commands (add to src/cli/proxy.js):

xactions proxy start [--port 3001] [--origins "*"] [--no-cache]
  Start the CORS proxy server

xactions proxy status
  Show proxy health, cache stats, connections

xactions proxy config --origins "https://myapp.com,https://staging.myapp.com"
  Update allowed origins

xactions proxy cache clear [--pattern "profile:*"]
  Clear cache entries

xactions proxy logs [--tail 100] [--follow]
  View proxy request logs

xactions proxy deploy [--target fly|railway|cloudflare]
  Deploy proxy to cloud (interactive setup)
```

### Prompt 15: Proxy Test Suite

```
Create comprehensive tests for the CORS proxy.

tests/proxy/server.test.js (10 tests):
1. GET /health returns 200 with status
2. GET /api/v1/profile/:username returns profile JSON
3. GET /api/v1/tweet/:id returns tweet JSON
4. GET /api/v1/search?q=test returns search results
5. POST /api/v1/tweet requires API key
6. POST /api/v1/tweet with API key creates tweet
7. Rate limit returns 429 after exceeding limit
8. CORS headers present on all responses
9. Invalid username returns 400
10. Server handles Scraper errors gracefully

tests/proxy/cache.test.js (5 tests):
1. First request is MISS, second is HIT
2. Cache expires after TTL
3. Cache invalidation on write
4. LRU eviction when maxSize exceeded
5. Cache stats accurate

tests/proxy/security.test.js (5 tests):
1. SQL injection patterns blocked
2. XSS in query params sanitized
3. Missing API key blocked on write endpoints
4. Invalid API key returns 401
5. CORS blocked for non-allowed origin in production mode

tests/proxy/client.test.js (5 tests):
1. XActionsClient.getProfile fetches correctly
2. XActionsClient.searchTweets paginates
3. XActionsClient handles errors
4. XActionsClient timeout works
5. XActionsClient auto-pagination yields all results

tests/proxy/websocket.test.js (5 tests):
1. WebSocket connects and receives pong
2. Subscribe to search delivers new tweets
3. Unsubscribe stops delivery
4. Client disconnect cleans up subscriptions
5. Multiple simultaneous subscriptions work

Use supertest for HTTP tests, ws for WebSocket tests.
Mock the Scraper instance for unit tests.
```

---

## Validation

```bash
# Start proxy
node src/proxy/server.js &

# Test endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/v1/profile/x
curl http://localhost:3001/api/v1/trends
curl http://localhost:3001/docs

# Test browser client
node -e "import('./src/proxy/client/xactions-browser.js').then(m => new m.XActionsClient().getProfile('x').then(console.log))"

# Run tests
npx vitest run tests/proxy/

# Build browser client
cd src/proxy/client && npm run build && ls dist/
```

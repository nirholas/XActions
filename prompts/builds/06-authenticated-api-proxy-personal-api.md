# Build 06: Authenticated API Proxy — Personal Twitter API

> **Project**: XActions Personal API — Self-hosted Twitter API replacement with OpenAPI spec, rate limiting, caching, webhooks  
> **Status**: New Build  
> **Priority**: #6 — Turn browser automation into a clean, authenticated API anyone can call  
> **Author**: XActions Team  

---

## Executive Summary

Twitter's API costs $100-42,000/month. XActions does everything without the API — but currently you still need browser scripts or CLI. This build creates a **self-hosted Personal Twitter API** — a clean REST API with OpenAPI spec, API key auth, rate limiting, caching, and webhooks. Developers and AI agents can just call `POST /api/v1/tweets` instead of figuring out browser automation. Think of it as "your own Twitter API" running locally or on a VPS.

## Technical Context

### Existing API Infrastructure
- **Express Server**: `api/server.js` — Full Express.js backend already exists
- **Routes**: `api/routes/` — Existing route structure (analytics, scrapers, health, automation, agents)
- **Middleware**: `api/middleware/` — Auth, rate limiting, error handling already exist
- **Services**: `api/services/` — Service layer pattern established
- **MCP Server**: `src/mcp/server.js` — 60+ tools that already do everything (scraping, posting, following)
- **Scrapers**: `src/scrapers/twitter/` — Data collection already built

### Architecture Plan

```
┌──────────────────────────────────────────────────────┐
│              XActions Personal API                    │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │     API Gateway (Express.js, port 3000)          │ │
│  │  OpenAPI 3.1 spec • Swagger UI • CORS           │ │
│  └─────────────────┬───────────────────────────────┘ │
│                    │                                 │
│  ┌─────────────────▼───────────────────────────────┐ │
│  │     Auth & Rate Limiting Layer                   │ │
│  │  API keys • Bearer tokens • Per-key limits      │ │
│  │  Tiered plans: free(100/hr) • pro(1000/hr)      │ │
│  └─────────────────┬───────────────────────────────┘ │
│                    │                                 │
│  ┌─────────────────▼───────────────────────────────┐ │
│  │     Response Cache (SQLite + Memory)             │ │
│  │  TTL-based • ETag support • Cache invalidation  │ │
│  └─────────────────┬───────────────────────────────┘ │
│                    │                                 │
│  ┌─────────────────▼───────────────────────────────┐ │
│  │     Service Layer                                │ │
│  │  Tweets • Users • Followers • Search • Media    │ │
│  │  Analytics • Engagement • Communities            │ │
│  └─────────────────┬───────────────────────────────┘ │
│                    │                                 │
│  ┌─────────────────▼───────────────────────────────┐ │
│  │     Browser Automation Engine                    │ │
│  │  Puppeteer (local) • Remote browser (cloud)     │ │
│  │  Queue-based execution • Anti-detection          │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │     Webhooks & Streaming                         │ │
│  │  Event subscriptions • SSE • Polling             │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Key Files to Create
```
src/api/
  openapi.yaml            — OpenAPI 3.1 specification
  server.js               — API server entry point
  auth/
    apiKeys.js            — API key generation, validation, storage
    rateLimiter.js        — Per-key rate limiting with tiers
    middleware.js         — Auth middleware chain
  cache/
    responseCache.js      — SQLite + in-memory response cache
    cacheMiddleware.js    — Express middleware for caching
  routes/
    tweets.js             — POST/GET/DELETE tweets
    users.js              — GET user profiles, search users
    followers.js          — GET followers/following, POST follow/unfollow
    engagement.js         — POST like/unlike/repost, GET engagement data
    search.js             — GET search tweets, users, hashtags
    media.js              — GET media/video downloads
    analytics.js          — GET account analytics
    communities.js        — GET/POST communities
    graph.js              — GET graph intelligence endpoints
    webhooks.js           — GET/POST/DELETE webhook subscriptions
    health.js             — GET /health, /version, /usage
  services/
    tweetService.js       — Tweet CRUD operations via browser automation
    userService.js        — User profile operations
    followerService.js    — Follower management
    engagementService.js  — Engagement operations
    searchService.js      — Search operations
    mediaService.js       — Media download operations
    webhookService.js     — Webhook management and delivery
  queue/
    actionQueue.js        — Queue for browser actions with concurrency control
    workerPool.js         — Browser instance pool management
tests/api/
  auth.test.js
  routes.test.js
  cache.test.js
  queue.test.js
  integration.test.js
```

---

## Agent Build Prompts

---

### Prompt 1: OpenAPI 3.1 Specification

```
You are building the OpenAPI specification for the XActions Personal API.

Create file: src/api/openapi.yaml

This defines every endpoint, request/response schema, auth, and error format.

Build the complete OpenAPI 3.1 spec:

info:
  title: XActions Personal Twitter API
  version: 1.0.0
  description: Self-hosted Twitter API replacement. No official API needed.
  license: MIT

servers:
  - url: http://localhost:3000/api/v1
  - url: https://{your-domain}/api/v1

security:
  - ApiKeyAuth: []
  - BearerAuth: []

securitySchemes:
  ApiKeyAuth:
    type: apiKey
    in: header
    name: X-API-Key
  BearerAuth:
    type: http
    scheme: bearer

Define these endpoint groups with full request/response schemas, examples, and error codes:

TWEETS:
  POST /tweets — Post a tweet
    body: { text, media?: string[], replyTo?: string, quoteTweetId?: string }
    response: { id, text, createdAt, url }
  GET /tweets/{id} — Get tweet details
    response: { id, text, author, likes, reposts, replies, createdAt, media }
  DELETE /tweets/{id} — Delete a tweet
  GET /tweets/search — Search tweets
    query: q, limit, since, until, from, minLikes
    response: { tweets[], nextCursor }
  POST /tweets/{id}/like — Like a tweet
  DELETE /tweets/{id}/like — Unlike a tweet
  POST /tweets/{id}/repost — Repost a tweet
  POST /tweets/{id}/reply — Reply to a tweet
    body: { text }
  GET /tweets/{id}/likers — Get accounts that liked
  GET /tweets/{id}/reposters — Get accounts that reposted

USERS:
  GET /users/{username} — Get user profile
    response: { id, username, displayName, bio, followers, following, tweets, verified, joined, avatar, banner, location, url }
  GET /users/{username}/tweets — Get user's tweets
    query: limit, cursor, includeReplies, includeReposts
  GET /users/search — Search users
    query: q, limit

FOLLOWERS:
  GET /users/{username}/followers — Get followers list
    query: limit, cursor
    response: { users[], nextCursor, total }
  GET /users/{username}/following — Get following list
  POST /users/{username}/follow — Follow a user
  DELETE /users/{username}/follow — Unfollow a user
  GET /users/{username}/followers/check/{targetUsername} — Check if following

ENGAGEMENT:
  GET /users/{username}/analytics — Get engagement analytics
    response: { avgLikes, avgReplies, avgReposts, engagementRate, bestTime, topTweets }
  GET /tweets/{id}/analytics — Get tweet analytics

MEDIA:
  GET /media/video — Download video
    query: tweetUrl
    response: { url, quality, duration }
  GET /media/images/{tweetId} — Get images from tweet

GRAPH:
  GET /graph/{username}/health — Network health score
  GET /graph/{username}/bots — Bot analysis
  GET /graph/{username}/communities — Community detection
  GET /graph/{username}/influence — Influence mapping

WEBHOOKS:
  POST /webhooks — Subscribe to events
    body: { url, events: ['follower.gained','follower.lost','tweet.engagement'], secret }
  GET /webhooks — List subscriptions
  DELETE /webhooks/{id} — Remove subscription
  POST /webhooks/test/{id} — Send test event

SYSTEM:
  GET /health — API health check
  GET /usage — Current usage/rate limit stats
  GET /version — Version info

Error Schemas:
  400: { error: 'bad_request', message }
  401: { error: 'unauthorized', message }
  403: { error: 'forbidden', message }
  404: { error: 'not_found', message }
  429: { error: 'rate_limit_exceeded', message, retryAfter }
  500: { error: 'internal_error', message }

Include realistic examples for every endpoint.
Author: @author nich (@nichxbt)
```

---

### Prompt 2: API Key Authentication System

```
You are building the API key authentication system for XActions Personal API.

Create file: src/api/auth/apiKeys.js

This manages API key generation, storage, validation, and permission scoping.

Build:

1. ApiKeyManager class:
   constructor(options):
     - dbPath: string (default ~/.xactions/api-keys.db)
     - Uses better-sqlite3

2. Database schema:
   api_keys:
     id TEXT PRIMARY KEY,           -- UUID
     key TEXT UNIQUE,               -- The actual API key (xact_...)
     keyHash TEXT,                  -- SHA-256 hash for secure comparison
     name TEXT,                     -- Human-readable name ("My App", "Claude Agent")
     tier TEXT DEFAULT 'free',      -- 'free', 'pro', 'unlimited'
     permissions TEXT,              -- JSON array: ['read', 'write', 'admin']
     rateLimit INTEGER,            -- Requests per hour (overrides tier default)
     createdAt TEXT,
     lastUsedAt TEXT,
     expiresAt TEXT,               -- Optional expiration
     enabled BOOLEAN DEFAULT 1,
     metadata TEXT                 -- JSON for extra data
   
   api_key_usage:
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     keyId TEXT,
     endpoint TEXT,
     method TEXT,
     statusCode INTEGER,
     responseTime INTEGER,         -- ms
     ip TEXT,
     userAgent TEXT,
     timestamp TEXT

3. Key generation:
   - generateKey(options) — Create a new API key:
     options: { name, tier, permissions, rateLimit?, expiresAt? }
     Key format: xact_{tier}_{32 random hex chars}
     Example: xact_pro_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
     Store SHA-256 hash (never store plaintext after generation)
     Return: { id, key, name, tier, permissions, createdAt } (key shown once)
   
   - revokeKey(id) — Disable an API key
   - listKeys() — List all keys (without showing the key value)
   - rotateKey(id) — Generate new key, revoke old one

4. Validation:
   - validateKey(apiKey) — Validate and return key info:
     a. Hash the provided key
     b. Look up by hash
     c. Check enabled, not expired
     d. Update lastUsedAt
     e. Return: { valid: true, id, tier, permissions, rateLimit } or { valid: false, reason }
   
   - checkPermission(keyId, permission) — Check specific permission

5. Usage tracking:
   - logUsage(keyId, { endpoint, method, statusCode, responseTime, ip, userAgent })
   - getUsage(keyId, period) — Usage stats per key
   - getUsageReport() — Overall API usage report

6. Tier definitions:
   free: { requestsPerHour: 100, permissions: ['read'] }
   pro: { requestsPerHour: 1000, permissions: ['read', 'write'] }
   unlimited: { requestsPerHour: Infinity, permissions: ['read', 'write', 'admin'] }

Author: @author nich (@nichxbt)
```

---

### Prompt 3: Rate Limiter

```
You are building the rate limiter for XActions Personal API.

Create file: src/api/auth/rateLimiter.js

This provides per-key, per-endpoint rate limiting using a sliding window algorithm.

Build:

1. RateLimiter class:
   constructor(options):
     - windowMs: number (default 3600000 — 1 hour)
     - defaultLimit: number (100)
     - store: 'memory' | 'sqlite' (default 'memory')
     - db: SQLite instance (if store is 'sqlite')

2. Sliding window algorithm:
   - checkLimit(keyId, endpoint?) — Check if request is allowed:
     a. Get current window for this key
     b. Count requests in the sliding window (last windowMs ms)
     c. Compare to key's rate limit
     d. Return: {
         allowed: boolean,
         remaining: number,
         limit: number,
         resetAt: Date,
         retryAfter?: number (seconds until next request allowed)
       }
   
   - recordRequest(keyId, endpoint) — Record a request
   - resetLimit(keyId) — Reset a key's counter

3. Multi-tier support:
   - Per-key limits (override tier defaults)
   - Per-endpoint limits (some endpoints like POST /tweets get stricter limits)
   - Global limit (total requests across all keys)
   - Burst allowance: allow 2x limit in short bursts, then throttle

4. Rate limit headers:
   - getHeaders(limitInfo) — Return standard rate limit headers:
     X-RateLimit-Limit
     X-RateLimit-Remaining
     X-RateLimit-Reset
     Retry-After (only when rate limited)

5. Express middleware:
   - rateLimitMiddleware(options) — Express middleware:
     a. Extract API key from request
     b. Look up key tier and limit
     c. Check limit
     d. If allowed: add headers, next()
     e. If not: return 429 with Retry-After header

Author: @author nich (@nichxbt)
```

---

### Prompt 4: Auth Middleware Chain

```
You are building the auth middleware for XActions Personal API.

Create file: src/api/auth/middleware.js

This chains authentication, rate limiting, and permission checking.

Build:

1. Authentication middleware:
   - authenticate() — Express middleware:
     a. Extract API key from:
        - Header: X-API-Key
        - Header: Authorization: Bearer <key>
        - Query param: ?api_key=<key> (least preferred)
     b. Validate key with ApiKeyManager
     c. If invalid: return 401
     d. If expired: return 401
     e. If valid: attach key info to req.apiKey
     f. Pass to next middleware

2. Permission middleware:
   - requirePermission(permission) — Middleware factory:
     permissions: 'read', 'write', 'admin'
     a. Check req.apiKey.permissions includes permission
     b. If not: return 403 { error: 'forbidden', message: 'Requires [permission] permission' }
     
   - requireTier(minTier) — Middleware factory:
     tiers ranked: free < pro < unlimited
     a. Check req.apiKey.tier >= minTier
     b. If not: return 403

3. Rate limit middleware:
   - rateLimit() — Apply rate limiting based on key tier
   - Uses RateLimiter under the hood
   - Returns 429 when exceeded

4. Usage logging:
   - logRequest() — After response, log usage to database

5. Chained middleware:
   - secureEndpoint(options) — All-in-one middleware chain:
     options: { permission?, tier?, rateLimit? }
     Chains: authenticate → requirePermission → rateLimit → logRequest
   
   Export as default middleware chain:
   [authenticate(), rateLimit(), logRequest()]

6. Development mode:
   - If XACTIONS_API_DEV=true, skip auth entirely
   - Log warning about dev mode being enabled

Author: @author nich (@nichxbt)
```

---

### Prompt 5: Response Cache

```
You are building the response cache for XActions Personal API.

Create file: src/api/cache/responseCache.js

This caches API responses to reduce browser automation load and improve response times.

Build:

1. ResponseCache class:
   constructor(options):
     - ttl: number (default 300000 — 5 minutes)
     - maxSize: number (default 10000 entries)
     - store: 'memory' | 'sqlite'
     - dbPath: string

2. Two-tier caching:
   
   Memory cache (L1):
     - LRU cache (Map-based, max 1000 entries)
     - Fast reads: <1ms
     - Lost on restart
   
   SQLite cache (L2):
     - Persistent across restarts
     - Table: response_cache (key TEXT PRIMARY KEY, value TEXT, headers TEXT, etag TEXT, cachedAt TEXT, expiresAt TEXT, hitCount INTEGER)

3. Cache operations:
   - get(key) — Lookup:
     a. Check L1 memory cache
     b. If miss: check L2 SQLite cache
     c. If found but expired: return null, delete stale entry
     d. If found and valid: promote to L1, return { data, headers, etag }
     e. If miss: return null
   
   - set(key, data, options) — Store:
     options: { ttl, etag, headers }
     a. Store in L1
     b. Store in L2
     c. If L1 exceeds maxSize: evict least recently used
   
   - invalidate(pattern) — Remove matching entries:
     pattern: glob or regex
     e.g., invalidate('/users/nichxbt/*') removes all entries for that user
   
   - invalidateAll() — Clear everything
   - getStats() — { hits, misses, hitRate, size, memorySize, sqliteSize }

4. Cache key generation:
   - generateCacheKey(req) — Create unique key from request:
     key = METHOD:path:sortedQueryParams:apiKeyId
     e.g., "GET:/users/nichxbt:limit=10&cursor=abc:key_123"

5. TTL strategy per endpoint:
   - GET /users/{username}: 5 minutes
   - GET /users/{username}/followers: 15 minutes
   - GET /tweets/{id}: 2 minutes
   - GET /tweets/search: 1 minute
   - GET /graph/*: 30 minutes
   - POST/DELETE: never cache, invalidate related entries

6. Create Express middleware — src/api/cache/cacheMiddleware.js:
   - cacheMiddleware(options) — Express middleware:
     a. Only cache GET requests
     b. Generate cache key
     c. Check ETag in If-None-Match header → 304 Not Modified
     d. Check cache → return cached response with headers
     e. If miss: wrap res.json() to capture response and cache it
     f. Add Cache-Control, ETag, X-Cache-Hit headers

Author: @author nich (@nichxbt)
```

---

### Prompt 6: Action Queue and Worker Pool

```
You are building the action queue and browser worker pool for XActions Personal API.

Create file: src/api/queue/actionQueue.js
Create file: src/api/queue/workerPool.js

API requests translate to browser automation actions. These must be queued and executed with concurrency control.

Build:

1. ActionQueue class (actionQueue.js):
   constructor(options):
     - concurrency: number (default 2 — max simultaneous browser actions)
     - maxQueueSize: number (default 1000)
     - timeout: number (default 30000ms per action)
     - priorityLevels: 3 (high, normal, low)

2. Queue operations:
   - enqueue(action) — Add action to queue:
     action: {
       id: string (UUID),
       type: string ('scrape_profile', 'post_tweet', 'get_followers', ...),
       params: object,
       priority: 'high' | 'normal' | 'low',
       keyId: string (which API key initiated this),
       timeout: number,
       callback: function (called with result)
     }
     Return: Promise<result> — Resolves when action completes
   
   - dequeue() — Get next action (highest priority first, then FIFO)
   - cancel(actionId) — Cancel a pending action
   - getStatus(actionId) — Check action status: 'pending' | 'running' | 'completed' | 'failed'
   - getQueueLength() — Current queue size
   - drain() — Wait for all pending actions to complete

3. Action execution:
   - processQueue() — Main loop:
     a. While there are pending actions and available workers:
     b. Dequeue highest priority action
     c. Acquire a browser worker from pool
     d. Execute action with timeout
     e. Return worker to pool
     f. Resolve the action's promise with result or error
   
   - executeAction(worker, action) — Run a single action:
     Map action type to handler:
     'scrape_profile' → worker.scrapeProfile(params.username)
     'post_tweet' → worker.postTweet(params.text, params.options)
     'get_followers' → worker.getFollowers(params.username, params.limit)
     'follow_user' → worker.follow(params.username)
     'unfollow_user' → worker.unfollow(params.username)
     'like_tweet' → worker.like(params.tweetId)
     'search_tweets' → worker.searchTweets(params.query, params.options)
     'get_tweet' → worker.getTweet(params.tweetId)
     'download_video' → worker.downloadVideo(params.tweetUrl)
     etc.

4. WorkerPool class (workerPool.js):
   constructor(options):
     - maxWorkers: number (default 2)
     - browserType: 'puppeteer' (default)
     - headless: boolean (default true)
     - authCookies: string

5. Worker management:
   - initialize() — Launch browser instances:
     a. Start Puppeteer browsers
     b. Set auth cookies
     c. Navigate to x.com to verify auth
     d. Mark workers as ready
   
   - acquire() — Get an available worker:
     If all busy: wait until one is free
     Return: { browser, page, release() }
   
   - release(worker) — Return worker to pool
   
   - destroy() — Close all browsers
   
   - healthCheck() — Verify all workers are functional:
     If a worker is stuck: kill and restart it

6. Queue monitoring:
   - on('action.queued', callback)
   - on('action.started', callback)
   - on('action.completed', callback)
   - on('action.failed', callback)
   - getStats() — { queued, running, completed, failed, avgExecutionTime }

Author: @author nich (@nichxbt)
```

---

### Prompt 7: Tweet Routes and Service

```
You are building the tweet routes and service for XActions Personal API.

Create file: src/api/routes/tweets.js
Create file: src/api/services/tweetService.js

Build:

1. TweetService (tweetService.js):
   constructor(options):
     - queue: ActionQueue instance

   Methods:
   - postTweet(text, options) — Post a tweet:
     options: { media, replyTo, quoteTweetId }
     Queue 'post_tweet' action
     Return: { id, text, url, createdAt }
   
   - getTweet(tweetId) — Get tweet data:
     Queue 'get_tweet' action
     Return: { id, text, author, likes, reposts, replies, createdAt, media, url }
   
   - deleteTweet(tweetId) — Delete a tweet
   
   - searchTweets(query, options) — Search tweets:
     options: { limit, since, until, from, minLikes, cursor }
     Queue 'search_tweets' action
     Return: { tweets[], nextCursor, total }
   
   - likeTweet(tweetId) — Like a tweet
   - unlikeTweet(tweetId) — Unlike
   - repostTweet(tweetId) — Repost
   - replyToTweet(tweetId, text) — Reply
   
   - getTweetLikers(tweetId, limit) — Get who liked
   - getTweetReposters(tweetId, limit) — Get who reposted

2. Tweet Routes (tweets.js) — Express Router:
   
   POST /api/v1/tweets
     auth: write permission
     body: { text, media?, replyTo?, quoteTweetId? }
     Validate: text required, max 280 chars
     Call tweetService.postTweet()
     Return 201: { data: tweet }
   
   GET /api/v1/tweets/:id
     auth: read permission
     Call tweetService.getTweet()
     Return 200: { data: tweet }
   
   DELETE /api/v1/tweets/:id
     auth: write permission
     Call tweetService.deleteTweet()
     Return 204
   
   GET /api/v1/tweets/search
     auth: read permission
     query: q (required), limit, since, until, from, minLikes, cursor
     Validate: q required
     Call tweetService.searchTweets()
     Return 200: { data: tweets[], pagination: { nextCursor, total } }
   
   POST /api/v1/tweets/:id/like
     auth: write permission
     Call tweetService.likeTweet()
     Return 200: { data: { liked: true } }
   
   DELETE /api/v1/tweets/:id/like
     auth: write permission
     Return 200: { data: { liked: false } }
   
   POST /api/v1/tweets/:id/repost
     auth: write permission
     Return 200: { data: { reposted: true } }
   
   POST /api/v1/tweets/:id/reply
     auth: write permission
     body: { text }
     Return 201: { data: reply }
   
   GET /api/v1/tweets/:id/likers
     auth: read
     Return 200: { data: users[], pagination }
   
   GET /api/v1/tweets/:id/reposters
     auth: read
     Return 200: { data: users[], pagination }

All routes:
- Use consistent response format: { data, pagination?, meta?: { cached, responseTime } }
- Use consistent error format: { error: string, message: string, statusCode: number }
- Apply auth middleware
- Handle errors with try/catch → next(error)

Author: @author nich (@nichxbt)
```

---

### Prompt 8: User and Follower Routes/Services

```
You are building the user and follower routes and services for XActions Personal API.

Create files:
  src/api/routes/users.js
  src/api/routes/followers.js
  src/api/services/userService.js
  src/api/services/followerService.js

Build:

1. UserService (userService.js):
   - getProfile(username) — Get user profile
   - getUserTweets(username, options) — { limit, cursor, includeReplies, includeReposts }
   - searchUsers(query, limit) — Search users

2. FollowerService (followerService.js):
   - getFollowers(username, limit, cursor) — Paginated follower list
   - getFollowing(username, limit, cursor) — Paginated following list  
   - follow(username) — Follow a user
   - unfollow(username) — Unfollow a user
   - checkFollowing(username, target) — Check if username follows target
   - getMutualFollowers(username1, username2) — Common followers
   - getFollowersNotFollowingBack(username) — Non-followers
   - bulkFollow(usernames) — Follow multiple users with delays
   - bulkUnfollow(usernames) — Unfollow multiple users

3. User Routes (users.js):
   GET /api/v1/users/:username
     response: { data: { id, username, displayName, bio, followersCount, followingCount, tweetCount, verified, joinedDate, avatar, banner, location, url } }
   
   GET /api/v1/users/:username/tweets
     query: limit, cursor, includeReplies, includeReposts
     response: { data: tweets[], pagination }
   
   GET /api/v1/users/search
     query: q, limit
     response: { data: users[] }

4. Follower Routes (followers.js):
   GET /api/v1/users/:username/followers
     query: limit (default 50, max 200), cursor
     response: { data: users[], pagination: { nextCursor, total } }
   
   GET /api/v1/users/:username/following
     Same structure
   
   POST /api/v1/users/:username/follow
     auth: write
     response: { data: { following: true } }
   
   DELETE /api/v1/users/:username/follow
     auth: write
     response: { data: { following: false } }
   
   GET /api/v1/users/:username/followers/check/:target
     response: { data: { isFollowing: boolean } }
   
   GET /api/v1/users/:username/followers/mutual/:otherUsername
     response: { data: users[] }
   
   GET /api/v1/users/:username/followers/not-following-back
     auth: read
     response: { data: users[], count }
   
   POST /api/v1/users/:username/followers/bulk-follow
     auth: write, pro tier
     body: { usernames: string[] }
     response: { data: { queued: number, estimatedTime: string } }
   
   POST /api/v1/users/:username/followers/bulk-unfollow
     auth: write, pro tier
     body: { usernames: string[] }
     response: same

Author: @author nich (@nichxbt)
```

---

### Prompt 9: Engagement, Search, Media, and Analytics Routes

```
You are building the remaining service routes for XActions Personal API.

Create files:
  src/api/routes/engagement.js
  src/api/routes/search.js
  src/api/routes/media.js
  src/api/routes/analyticsApi.js
  src/api/services/engagementService.js
  src/api/services/searchService.js
  src/api/services/mediaService.js

Build:

1. Engagement Routes:
   GET /api/v1/users/:username/analytics
     Summary analytics for an account
     response: { data: { avgLikes, avgReplies, avgReposts, engagementRate, bestPostingTime, topTweets } }
   
   GET /api/v1/tweets/:id/analytics
     Per-tweet analytics
     response: { data: { impressions, likes, replies, reposts, quotes, engagementRate } }

2. Search Routes:
   GET /api/v1/search/tweets
     query: q, limit, since, until, from, minLikes, minReposts, lang
     response: { data: tweets[], pagination }
   
   GET /api/v1/search/users
     query: q, limit
     response: { data: users[] }
   
   GET /api/v1/search/hashtags
     query: q, limit
     response: { data: Array<{ tag, tweetCount, trending }> }

3. Media Routes:
   GET /api/v1/media/video
     query: tweetUrl (required)
     response: { data: { url, quality, duration, thumbnail } }
   
   GET /api/v1/media/images/:tweetId
     response: { data: Array<{ url, width, height }> }
   
   GET /api/v1/media/avatar/:username
     response: { data: { url, urlHighRes } }

4. Analytics API Routes:
   GET /api/v1/analytics/:username/growth
     query: period (7d, 30d, 90d)
     response: { data: { followers: { start, end, change }, following: same, engagement: same, daily: Array<{ date, followers, engagement }> } }
   
   GET /api/v1/analytics/:username/best-times
     response: { data: Array<{ day, hour, avgEngagement }> }
   
   GET /api/v1/analytics/:username/top-tweets
     query: period, metric (likes|replies|reposts)
     response: { data: tweets[] }

5. Services implement the logic, queueing browser actions through actionQueue.
   Each service follows the same pattern as tweetService.

Author: @author nich (@nichxbt)
```

---

### Prompt 10: Graph Intelligence and Community Routes

```
You are building the graph intelligence and community API routes for XActions Personal API.

Create files:
  src/api/routes/graph.js
  src/api/routes/communities.js

Build:

1. Graph Intelligence Routes:
   GET /api/v1/graph/:username/health
     Run networkHealth.computeHealthScore()
     response: { data: { overall, grade, components, recommendations } }
   
   GET /api/v1/graph/:username/bots
     Run botDetector.analyzeFollowers()
     response: { data: { total, humans, suspicious, likelyBots, definiteBots, botPercentage, qualityScore, worstOffenders } }
   
   GET /api/v1/graph/:username/influence
     Run influenceMapper.computeInfluenceScore()
     response: { data: { score, reach, engagement, authority, activity } }
   
   GET /api/v1/graph/:username/influence/path/:target
     Run influenceMapper.findInfluencePath()
     response: { data: { path, hops, pathStrength } }
   
   GET /api/v1/graph/:username/communities
     Run communityDetector.detectCommunities()
     response: { data: { communities, modularity } }
   
   GET /api/v1/graph/:username/pods
     Run podDetector.detectPods()
     response: { data: { pods, totalPods, engagementInflation } }
   
   GET /api/v1/graph/:username/anomalies
     Run anomalyDetector.detectFollowerAnomalies()
     response: { data: { anomalies, healthScore, growthTrend } }
   
   GET /api/v1/graph/:username/report
     query: type (account|competitor|community|bot)
     Run reportGenerator.generateAccountReport()
     response: { data: { markdown, html } }
   
   POST /api/v1/graph/:username/monitor
     auth: pro tier
     body: { interval, alerts }
     Start real-time monitoring
     response: { data: { monitorId, status: 'started' } }
   
   DELETE /api/v1/graph/:username/monitor
     Stop monitoring

2. Community Routes:
   GET /api/v1/communities
     List user's communities
   
   GET /api/v1/communities/:communityId
     Get community details
   
   POST /api/v1/communities/:communityId/join
     auth: write
   
   DELETE /api/v1/communities/:communityId/leave
     auth: write

Author: @author nich (@nichxbt)
```

---

### Prompt 11: Webhook System

```
You are building the webhook system for XActions Personal API.

Create files:
  src/api/routes/webhooks.js
  src/api/services/webhookService.js

Build:

1. WebhookService class:
   constructor(options):
     - dbPath: string
     - maxSubscriptionsPerKey: number (default 10)

2. Database schema:
   webhook_subscriptions:
     id TEXT PRIMARY KEY,
     keyId TEXT,                  -- API key that created this
     url TEXT,                    -- Webhook delivery URL
     events TEXT,                 -- JSON array of event types
     secret TEXT,                 -- HMAC signing secret
     enabled BOOLEAN DEFAULT 1,
     createdAt TEXT,
     lastDeliveryAt TEXT,
     failureCount INTEGER DEFAULT 0,
     metadata TEXT
   
   webhook_deliveries:
     id TEXT PRIMARY KEY,
     subscriptionId TEXT,
     event TEXT,
     payload TEXT,
     responseCode INTEGER,
     responseBody TEXT,
     deliveredAt TEXT,
     success BOOLEAN

3. Subscription management:
   - subscribe(keyId, { url, events, secret }) — Create subscription:
     Validate URL is reachable (HEAD request)
     Validate events are valid event types
     Store subscription
     Return: { id, url, events, createdAt }
   
   - unsubscribe(id, keyId) — Remove subscription (only owner can delete)
   - listSubscriptions(keyId) — List key's subscriptions
   - updateSubscription(id, keyId, updates) — Update events or URL

4. Event delivery:
   - deliverEvent(event, payload) — Deliver to all matching subscriptions:
     For each subscription where events includes event:
     a. Create JSON payload: {
          id: UUID,
          event: string,
          timestamp: ISO string,
          data: payload
        }
     b. Sign with HMAC-SHA256 using subscription secret
     c. POST to subscription URL:
        Headers:
          Content-Type: application/json
          X-XActions-Event: event
          X-XActions-Signature: sha256=<hex HMAC>
          X-XActions-Delivery: delivery_id
     d. Record delivery result
     e. If fails (non-2xx): increment failureCount
     f. If failureCount > 10: disable subscription, log warning
   
   - retryDelivery(deliveryId) — Retry a failed delivery

5. Supported events:
   - follower.gained
   - follower.lost
   - tweet.posted
   - tweet.deleted
   - tweet.engagement (like, reply, repost exceeds threshold)
   - mention.received
   - anomaly.detected
   - health.changed
   - monitor.alert

6. Routes:
   POST /api/v1/webhooks
     auth: pro tier, write permission
     body: { url, events, secret }
     Return 201
   
   GET /api/v1/webhooks
     auth: read
     Return 200: subscriptions[]
   
   DELETE /api/v1/webhooks/:id
     auth: write
     Return 204
   
   PATCH /api/v1/webhooks/:id
     auth: write
     body: { events?, url?, enabled? }
   
   POST /api/v1/webhooks/:id/test
     Send test event to webhook URL
     Return 200: { delivered: boolean, responseCode }
   
   GET /api/v1/webhooks/:id/deliveries
     Return delivery history

Author: @author nich (@nichxbt)
```

---

### Prompt 12: API Server Entry Point

```
You are building the API server entry point for XActions Personal API.

Create file: src/api/server.js

This wires together all routes, middleware, auth, and services into a working Express server.

Build:

1. Express server setup:
   import express from 'express';
   import cors from 'cors';
   import { readFileSync } from 'fs';
   import swaggerUi from 'swagger-ui-express';
   import YAML from 'yaml';
   
   // Import all route modules
   // Import auth middleware
   // Import services and queue

2. Initialization:
   async function createServer(options) {
     options: {
       port: number (default 3000, from PORT env),
       authCookies: string (from XACTIONS_AUTH env),
       maxWorkers: number (default 2),
       enableSwagger: boolean (default true)
     }
     
     a. Initialize APIKeyManager
     b. Initialize RateLimiter
     c. Initialize ResponseCache
     d. Initialize WorkerPool with authCookies
     e. Initialize ActionQueue with WorkerPool
     f. Initialize all services with ActionQueue
     g. Create Express app
   }

3. Middleware chain:
   app.use(cors())
   app.use(express.json())
   app.use(requestLogger())  — Log all requests
   
   // Swagger UI at /docs
   if (enableSwagger) {
     const spec = YAML.parse(readFileSync('src/api/openapi.yaml', 'utf8'));
     app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec));
   }

4. Mount routes:
   app.use('/api/v1/tweets', authenticate(), rateLimit(), tweetRoutes);
   app.use('/api/v1/users', authenticate(), rateLimit(), userRoutes);
   app.use('/api/v1/users', authenticate(), rateLimit(), followerRoutes);
   app.use('/api/v1/search', authenticate(), rateLimit(), searchRoutes);
   app.use('/api/v1/media', authenticate(), rateLimit(), mediaRoutes);
   app.use('/api/v1/analytics', authenticate(), rateLimit(), analyticsRoutes);
   app.use('/api/v1/graph', authenticate(), rateLimit(), graphRoutes);
   app.use('/api/v1/communities', authenticate(), rateLimit(), communityRoutes);
   app.use('/api/v1/webhooks', authenticate(), rateLimit(), webhookRoutes);
   
   // Public routes (no auth)
   app.get('/health', (req, res) => healthCheck(res));
   app.get('/version', (req, res) => res.json({ version, uptime }));
   
   // API key management (admin only)
   app.post('/admin/keys', authenticate(), requireTier('unlimited'), createKey);
   app.get('/admin/keys', authenticate(), requireTier('unlimited'), listKeys);
   app.delete('/admin/keys/:id', authenticate(), requireTier('unlimited'), revokeKey);

5. Error handling:
   app.use(notFoundHandler);  // 404
   app.use(errorHandler);     // 500 with error format

6. Graceful shutdown:
   Handle SIGTERM/SIGINT:
   - Stop accepting new requests
   - Drain action queue
   - Close browser workers
   - Close database connections
   - Exit

7. CLI integration:
   Export createServer for programmatic use
   If run directly: createServer().then(app => app.listen(port))
   
   Add to CLI: xactions api start [--port 3000] [--workers 2]
   Add to CLI: xactions api keys create [--name "My App"] [--tier pro]
   Add to CLI: xactions api keys list
   Add to CLI: xactions api keys revoke <id>

Author: @author nich (@nichxbt)
```

---

### Prompt 13: Health and System Routes

```
You are building the health, system, and admin routes for XActions Personal API.

Create file: src/api/routes/health.js

Build:

1. Health check:
   GET /health
     No auth required
     Return: {
       status: 'ok' | 'degraded' | 'down',
       version: string,
       uptime: number (seconds),
       checks: {
         database: { status, responseTime },
         browserPool: { status, availableWorkers, totalWorkers },
         actionQueue: { status, pending, running },
         cache: { status, hitRate, size },
         memory: { heapUsed, heapTotal, rss }
       }
     }

2. Usage stats:
   GET /api/v1/usage
     auth: read
     Return per-key usage:
     {
       data: {
         requestsThisHour: number,
         requestsToday: number,
         requestsThisMonth: number,
         rateLimit: { limit, remaining, resetAt },
         topEndpoints: Array<{ endpoint, count }>,
         avgResponseTime: number
       }
     }

3. System info:
   GET /version
     No auth
     Return: { version, nodeVersion, platform, features: string[] }

4. Admin routes:
   POST /admin/keys — Generate API key
     body: { name, tier, permissions }
     Return: { data: { id, key, name, tier } }
   
   GET /admin/keys — List all keys
     Return: { data: Array<{ id, name, tier, lastUsed, requestCount }> }
   
   DELETE /admin/keys/:id — Revoke key
   
   GET /admin/stats — System-wide stats
     Return: { totalRequests, activeKeys, cacheHitRate, avgResponseTime, uptime, queueDepth }
   
   POST /admin/cache/clear — Clear response cache
   POST /admin/workers/restart — Restart browser workers

Author: @author nich (@nichxbt)
```

---

### Prompt 14: Complete Test Suite

```
You are building the test suite for XActions Personal API.

Create test files using vitest:

1. tests/api/auth.test.js:
   - Test API key generation (xact_ prefix, correct format)
   - Test key validation succeeds for valid key
   - Test key validation fails for invalid key
   - Test key validation fails for expired key
   - Test key validation fails for disabled key
   - Test permission checking (read, write, admin)
   - Test tier checking
   - Test rate limiting (allow under limit, block over limit)
   - Test rate limit headers are correct
   - Test usage logging records requests

2. tests/api/cache.test.js:
   - Test cache set and get
   - Test cache miss returns null
   - Test TTL expiration
   - Test cache invalidation by pattern
   - Test LRU eviction when maxSize exceeded
   - Test ETag matching returns 304
   - Test cache stats tracking (hits, misses)

3. tests/api/routes.test.js:
   Use supertest to test routes:
   - Test GET /health returns 200 with status
   - Test GET /api/v1/users/:username returns profile (mock browser action)
   - Test POST /api/v1/tweets returns 201 (mock)
   - Test authentication required (401 without key)
   - Test rate limiting (429 when exceeded)
   - Test permission denied (403 for wrong tier)
   - Test 404 for unknown routes
   - Test error format is consistent

4. tests/api/queue.test.js:
   - Test action enqueuing (returns Promise)
   - Test priority ordering (high before normal)
   - Test concurrency limit (max 2 simultaneous)
   - Test timeout handling
   - Test cancel removes action from queue
   - Test queue stats are accurate

5. tests/api/integration.test.js:
   Full integration test:
   - Create server with mock browser pool
   - Generate API key
   - Make authenticated request
   - Verify caching works
   - Verify rate limiting works
   - Verify webhook delivery

Mock all browser automation — tests should run fast without a real browser.

Author: @author nich (@nichxbt)
```

---

### Prompt 15: Documentation and Dashboard

```
You are writing the documentation and dashboard page for XActions Personal API.

Create these files:

1. docs/personal-api.md:
   Complete documentation:
   - What is it: Self-hosted Twitter API replacement
   - Why: $0 vs $100-42,000/month for official API
   - Quick start: 5 commands to get running
   - Authentication: API key generation and usage
   - Rate limiting: Tiers and limits explained
   - Endpoint reference: Every endpoint with examples
   - Examples:
     curl: posting tweet, getting followers, searching
     JavaScript (fetch): same examples
     Python (requests): same examples
     AI agent (Claude/GPT): how to use with function calling
   - Webhooks: Setup and event types
   - Caching: How it works, TTL values
   - Self-hosting: Deploy to VPS, Railway, Fly.io
   - Security: Best practices
   - Troubleshooting

2. docs/personal-api-reference.md:
   Every endpoint in detail:
   - Method, path, auth required, tier required
   - Request parameters (body, query, path)
   - Response schema
   - Example request and response
   - Error codes

3. skills/personal-api/SKILL.md:
   Skill file for agents

4. dashboard/api.html:
   API management dashboard:
   - API key management (generate, list, revoke)
   - Usage stats and charts
   - Rate limit status
   - Webhook management
   - Swagger UI embed
   - Test endpoint form (try any endpoint from the browser)
   - Server status (health check, worker status)
   Match existing dashboard design from dashboard/index.html

All documentation references real code paths from the implementation.
Author: @author nich (@nichxbt)
```

---

## Success Criteria

- [ ] OpenAPI 3.1 specification defines every endpoint
- [ ] API key auth with tiers (free/pro/unlimited) works end-to-end
- [ ] Rate limiting respects per-key limits
- [ ] Response caching reduces browser automation load
- [ ] Action queue manages browser automation concurrency
- [ ] All tweet CRUD operations work via API
- [ ] User profile and follower management works
- [ ] Search, media, and analytics endpoints work
- [ ] Graph intelligence accessible via API
- [ ] Webhooks deliver events reliably
- [ ] Swagger UI serves at /docs
- [ ] Health check and admin routes work
- [ ] Full test suite passes with vitest
- [ ] Documentation complete with examples
- [ ] Dashboard provides API management UI

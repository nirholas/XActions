# Track 03 — Rate Limiting + Adaptive Backoff# Track 03 — Rate Limiting + Adaptive Backoff

















































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































```npx vitest run tests/client/http.test.js# Tests pass"console.log(rl.getEndpointStatus('/graphql/abc/UserTweets').remaining === 45 ? '✅ RateLimiter works' : '❌ Failed');rl.updateFromHeaders('/graphql/abc/UserTweets', new Headers({ 'x-rate-limit-limit': '50', 'x-rate-limit-remaining': '45', 'x-rate-limit-reset': String(Math.floor(Date.now()/1000) + 900) }));const rl = new RateLimiter();import { RateLimiter } from './src/client/http/RateLimiter.js';node -e "# Rate limiter worksnode -e "import { HttpClient, RateLimiter, RetryHandler } from './src/client/http/index.js'; console.log('✅ HTTP module loads')"# Module loads```bash## Validation---```All tests use vitest with real implementations (no mocks for the rate limiter, queue, etc. — only mock fetch). Import from the actual source files.    - Verify p50, p95, p99 are within expected ranges    - Record 100 requests with known durations15. 'HttpMetrics calculates percentiles correctly'    - Verify TimeoutError thrown    - Execute function that takes 500ms    - Create timeout of 100ms14. 'TimeoutManager aborts long requests'    - Verify first retry delay matches reset time difference    - Provide headers with x-rate-limit-reset13. 'TwitterOptimizedBackoff uses rate limit reset time'    - Verify delays stay within maxDelay    - Verify delays are increasing    - Call calculate(0), calculate(1), calculate(2)    - For each strategy12. 'BackoffStrategies produce increasing delays'    - Verify correct error class is thrown    - For each Twitter error code (34, 88, 326, etc.)11. 'ResponseHandler maps Twitter error codes correctly'    - Verify: rate limiter updated, response parsed, metrics recorded    - Call httpClient.get()    - Mock fetch to return successful response with rate limit headers    - Create HttpClient with all components10. 'HttpClient full pipeline processes request correctly'   - Both callers receive same result   - Verify fn only called once   - Call deduplicate with same key twice simultaneously   - Create Deduplicator9. 'Deduplicator merges concurrent identical requests'   - Verify state becomes CLOSED   - Execute successful request   - Verify state becomes HALF_OPEN   - Advance time past resetTimeout   - Trip the breaker8. 'CircuitBreaker recovers after timeout'   - Verify next request throws CircuitBreakerError   - Verify state becomes OPEN   - Execute 3 failing requests for same endpoint   - Create CircuitBreaker with threshold=37. 'CircuitBreaker trips after threshold failures'   - Verify high priority request processed before normal ones   - Enqueue: normal(0), normal(0), high(1)6. 'RequestQueue processes by priority'   - Verify: max 2 active at any time (track with counter)   - Enqueue 5 requests that each take 100ms   - Create RequestQueue with concurrency=25. 'RequestQueue respects concurrency limit'   - Verify: fn called once, NotFoundError thrown   - Mock fn that fails with 4044. 'RetryHandler does not retry on 404'   - Verify: fn called 3 times, result returned, delays increase   - Mock fn that fails with 429 twice then succeeds   - Create RetryHandler with maxRetries=33. 'RetryHandler retries on 429 with exponential backoff'   - Verify backoffMultiplier decreased toward 1   - Call recordSuccess 10 times   - Verify backoffMultiplier increased   - Call recordRateLimit 3 times   - Create RateLimiter2. 'RateLimiter adaptive backoff increases on rate limits'   - Simulate remaining=0, verify waitForSlot adds appropriate delay   - Verify getEndpointStatus returns correct values   - Simulate updateFromHeaders with limit=15, remaining=10, reset=now+900   - Create RateLimiter1. 'RateLimiter tracks per-endpoint limits'Tests:Integration tests for the HTTP client stack. Use vitest (already configured in the project).Create tests/client/http.test.js.```### Prompt 15: HTTP Client Integration Tests```this._metrics.recordRequest(endpoint, duration, response.status);const duration = Date.now() - start;// ... fetch ...const start = Date.now();Integration: HttpClient records every request:Percentile calculation: use a sorted array of recent durations and index-based percentile lookup. Not a full t-digest but accurate enough for monitoring.8. toJSON() → serializable object7. reset() → void   - Return time-bucketed data for charting6. getTimeSeries(endpoint, intervalMs = 60000) → Array<{ timestamp, count, avgDuration, errors }>   }     mostErrors,     fastestEndpoint,     slowestEndpoint,     p95Latency,     requestsPerMinute,     rateLimitRate,     errorRate,      avgDuration,      totalRequests, 5. getOverview() → {    - Return all endpoint stats4. getAllStats() → Map<endpoint, Stats>   - Return metrics for a specific endpoint3. getEndpointStats(endpoint) → Stats   - Update rolling averages and percentiles   - Record a completed request2. recordRequest(endpoint, duration, status, error?) → void   - options: { historySize, enabled }1. constructor(options = {})Methods:  Stats: { count, totalDuration, avgDuration, p50, p95, p99, errors, rateLimits, lastHour: { count, errors } }- _endpointStats: Map<endpoint, Stats>- _requests: CircularBuffer (last 10000 entries)Properties:Export class HttpMetrics:Collects detailed performance metrics for monitoring and optimization.Create src/client/http/Metrics.js.```### Prompt 14: Performance Metrics Collector```new RetryHandler({ strategy: 'twitter' })Integration: RetryHandler accepts a strategy option:  - name: 'exponential' | 'linear' | 'fibonacci' | 'decorrelated' | 'twitter'function createBackoffStrategy(name, options) → strategyExport factory:- context: { error, headers, rateLimitReset }- calculate(attempt, context) → number (delay in ms)Each strategy implements:   - Falls back to exponential if no rate limit headers available     - Third retry: reset time + 30 seconds     - Second retry: reset time + 5 seconds     - First retry: wait until rate limit reset time (from headers)   - Custom strategy tuned for Twitter's rate limit behavior:5. class TwitterOptimizedBackoff   - Better distribution of retry timing to avoid thundering herd   - delay = min(maxDelay, random_between(baseDelay, previousDelay * 3))   - AWS-style decorrelated jitter4. class DecorrelatedJitterBackoff   - Slower initial growth than exponential   - Fibonacci: 1, 1, 2, 3, 5, 8, 13, 21...   - delay(attempt) = baseDelay * fibonacci(attempt) + jitter3. class FibonacciBackoff   - Gentler, for endpoints with slow recovery   - delay(attempt) = baseDelay * (attempt + 1) + jitter2. class LinearBackoff   - The default strategy   - delay(attempt) = baseDelay * Math.pow(2, attempt) + jitter1. class ExponentialBackoffExport:Multiple backoff strategies that can be plugged into the RetryHandler.Create src/client/http/BackoffStrategies.js.```### Prompt 13: Backoff Strategy Configuration```Also add a dashboard widget: update dashboard/status.html to fetch and display rate limit status with a visual traffic light per endpoint (green = healthy, yellow = low remaining, red = rate limited/circuit open).Register this route in api/server.js alongside existing routes.  - Admin only  - Reset all rate limit counters and circuit breakersPOST /api/rate-limits/reset  - Response: Array of { method, endpoint, status, duration, timestamp }  - Returns recent request historyGET /api/rate-limits/history    }      }        SearchTimeline: { state: 'OPEN', failures: 5, reopensAt: '...' },        UserByScreenName: { state: 'CLOSED', failures: 0 },      circuitBreakers: {      },        rateLimitHits: 3,        totalRequests: 342,        requestsPerMinute: 15,        backoffMultiplier: 1.2,      global: {      },        ...        SearchTimeline: { limit: 20, remaining: 0, resetAt: '...', state: 'OPEN' },        UserByScreenName: { limit: 50, remaining: 42, resetAt: '...', state: 'CLOSED' },      endpoints: {  - Response: {  - Returns current rate limit status for all endpointsGET /api/rate-limitsExport router with:An Express route that exposes rate limit status through the XActions API dashboard.Create api/routes/rateLimit.js.```### Prompt 12: Rate Limit Dashboard Endpoint```The factory provides sensible defaults that match what Twitter expects. Conservative rate limiting, low concurrency, adaptive backoff — all tuned for Twitter's behavior.}  return client;  });    },      ttl: options.dedupTtl || 5000,      enabled: options.deduplication !== false,    deduplication: {    },      failureThreshold: options.failureThreshold || 5,      enabled: options.circuitBreaker !== false,    circuitBreaker: {    },      level: options.logLevel || process.env.XACTIONS_LOG_LEVEL || 'warn',      enabled: options.debug || process.env.XACTIONS_DEBUG === 'true',    logging: {    },      baseDelay: options.retryBaseDelay || 1000,      maxRetries: options.maxRetries || 3,    retry: {    },      adaptiveMode: options.adaptiveMode !== false,      globalDelay: options.globalDelay || 500,    rateLimiting: {    maxConcurrency: options.maxConcurrency || 2,    timeout: options.timeout || 30000,    transform: options.transform,    proxy: options.proxy,    fetch: options.fetch,  const client = new HttpClient({export function createHttpClient(options = {}) {// Factoryexport { TimeoutManager } from './TimeoutManager.js';export { Deduplicator } from './Deduplicator.js';export { ConnectionPool } from './ConnectionPool.js';export { HttpLogger } from './Logger.js';export { CircuitBreaker } from './CircuitBreaker.js';export { ResponseHandler } from './ResponseHandler.js';export { RequestQueue } from './RequestQueue.js';export { RetryHandler } from './RetryHandler.js';export { RateLimiter } from './RateLimiter.js';export { HttpClient } from './HttpClient.js';Export all HTTP modules and a factory function:Create src/client/http/index.js.```### Prompt 11: HTTP Client Index and Factory```Create TimeoutError extending ScraperError with code 'TIMEOUT'.}  clear();} finally {  return response;  const response = await this._fetch(url, { ...init, signal });try {);  options.timeout || this._timeoutManager.getTimeoutForEndpoint(url)const { signal, clear } = this._timeoutManager.createTimeout(Integration with HttpClient._doFetch():   - Clean up AbortController on success or failure   - If timeout fires, reject with TimeoutError   - Execute fn() with a timeout4. withTimeout(fn, ms) → Promise     - Default → NORMAL     - /onboarding/task.json → SLOW (login flow has multiple round trips)     - /media/upload.json → SLOW     - /graphql/*/SearchTimeline → NORMAL     - /graphql/*/UserByScreenName → FAST   - Map URL patterns to appropriate timeout:3. getTimeoutForEndpoint(url) → number   - Return signal for fetch() and clear function for cleanup   - Set timeout   - Create AbortController2. createTimeout(ms) → { signal: AbortSignal, clear: () => void }1. constructor(defaultTimeout = 30000)Methods:- INFINITE: 0 (long-polling, streaming)- SLOW: 60000ms (media upload, login flow)- NORMAL: 30000ms (search, timeline pagination)- FAST: 10000ms (profile lookups, single tweet)Default timeout presets:Export class TimeoutManager:Manages request timeouts using AbortController. Different operations need different timeouts.Create src/client/http/TimeoutManager.js.```### Prompt 10: Timeout and Abort Controller Manager```Usage: When multiple MCP tools or CLI commands simultaneously request the same profile, only one HTTP call is made.- Dedup key = URL + serialized params- POST/DELETE requests are never deduplicated- GET requests are deduplication candidatesIntegration with HttpClient:6. getStats() → { inflightCount, cacheSize, cacheHits, cacheMisses }   - Clear both inflight and cache5. clear() → void   - Remove from cache4. invalidate(key) → void   - Create a deterministic hash: method + url + sorted(JSON.stringify(params))3. generateKey(method, url, params) → string   return promise;   this._inflight.set(key, promise);   });     throw err;     this._inflight.delete(key);   }).catch(err => {     return data;     this._cache.set(key, { data, expiresAt: Date.now() + this._ttl });     this._inflight.delete(key);   const promise = fn().then(data => {   }     this._cache.delete(key);     if (cached.expiresAt > Date.now()) return cached.data;     const cached = this._cache.get(key);   if (this._cache.has(key)) {   }     return this._inflight.get(key);   if (this._inflight.has(key)) {   Implementation:      - Otherwise: execute fn(), store promise in _inflight, on resolve store in _cache   - If key is in _cache and not expired: return cached result   - If key is in _inflight (another request is pending): await the existing promise   - key: unique identifier for the request (e.g., URL + params hash)2. async deduplicate(key, fn) → result   - options: { ttl, cacheEnabled }1. constructor(options = {})Methods:- _cache: Map<string, { data, expiresAt }>- _ttl: number (default: 5000ms — cache dedup for 5 seconds)- _inflight: Map<string, Promise>Properties:Export class Deduplicator:Prevent duplicate concurrent requests for the same resource. If two callers request the same profile simultaneously, only one HTTP request is made.Create src/client/http/Deduplicator.js.```### Prompt 9: Request Deduplication```Use Node.js built-in http/https Agent with keepAlive: true. For undici-based approach (better performance), use undici.Pool. Choose based on Node.js version availability.- On process exit: pool.drain()- For undici: use undici.Pool directly for connection management- Pass pool agent to fetch: fetch(url, { agent: this._pool.getAgent() })Integration with HttpClient:   - Configure proxy for all pooled connections6. setProxy(proxyUrl) → void   - Called on scraper.logout() or process exit   - Close all idle connections5. drain() → void   - Reduces latency for first request   - Pre-establish connections to x.com and api.x.com4. async warmup() → void   - Connection statistics per host3. getConnectionInfo() → Map<host, { active, pending, idle }>   - Return the connection pool agent for use with fetch2. getAgent() → http.Agent   - Create http.Agent or undici.Agent with keepAlive settings   - options: { maxConnections, keepAliveTimeout, proxy }1. constructor(options = {})Methods:- _connections: Map<host, ConnectionInfo>- _keepAliveTimeout: number (default: 30000ms)- _maxConnections: number (default: 6 per host)- _agent: http.Agent or undici.AgentProperties:Export class ConnectionPool:Manage persistent HTTP connections for better performance. Twitter benefits from connection reuse (fewer TLS handshakes).Create src/client/http/ConnectionPool.js.```### Prompt 8: Connection Pool Manager```- XACTIONS_REDACT=false — disables redaction (for development)- XACTIONS_LOG_LEVEL=debug — sets level- XACTIONS_DEBUG=true — enables loggingEnvironment variables:- On retry: logRetry()- On rate limit: logRateLimit()- After fetch: logResponse()- Before fetch: logRequest()Integration: HttpClient calls logger methods in the _request pipeline:- push(item), toArray(), size, clear()- Fixed-size array that overwrites oldest entriesCreate CircularBuffer class (internal):    - Replace sensitive header values with '[REDACTED]'10. _redact(headers) → object   - '/i/api/graphql/abc123/UserByScreenName?variables=...' → 'UserByScreenName'9. _shortenUrl(url) → string8. getStats() → { totalRequests, avgDuration, errorRate, rateLimitHits }   - Return recent request history7. getHistory() → Array<{ method, url, status, duration, timestamp }>   - Level: warn (OPEN), info (HALF_OPEN, CLOSED)6. logCircuitBreaker(endpoint, state, reason) → void   - Format: `🔄 Retry ${attempt}/${maxRetries} for ${endpoint} in ${delay}ms: ${error.message}`   - Level: warn5. logRetry(attempt, maxRetries, url, error, delay) → void   - Format: `⚠️ Rate limit: ${remaining}/${limit} for ${endpoint}, resets in ${resetIn}s`   - Level: warn4. logRateLimit(url, remaining, limit, resetAt) → void   - Include rate limit headers if present: `[RL: ${remaining}/${limit}, reset: ${resetIn}s]`   - Format: `← ${status} ${shortenUrl(url)} ${duration}ms ${bodySize}b`   - Level: debug (2xx), warn (4xx), error (5xx)3. logResponse(method, url, status, headers, duration, bodySize) → void   - Store in history   - Format: `→ ${method} ${shortenUrl(url)} [${timestamp}]`   - Redact: Authorization header value, Cookie header value, password fields in body   - Level: debug2. logRequest(method, url, headers, body) → void   - options: { enabled, level, redactSensitive, logFn, historySize }1. constructor(options = {})Methods:- _history: CircularBuffer (last 100 requests)- _logFn: function (default: console)- _redactSensitive: boolean (default: true)- _level: 'none' | 'error' | 'warn' | 'info' | 'debug' | 'trace'- _enabled: boolean (default: process.env.XACTIONS_DEBUG === 'true')Properties:Export class HttpLogger:Structured logging for HTTP requests and responses. Critical for debugging rate limit issues and API changes.Create src/client/http/Logger.js.```### Prompt 7: Request/Response Logging```This gives a 3-layer resilience stack: Circuit Breaker → Retry Handler → Rate Limiter.}  );    endpoint    ),      { url, method }      () => this._doFetch(method, url, body, options),    () => this._retryHandler.execute(  return this._circuitBreaker.execute(  const endpoint = this._rateLimiter._extractEndpoint(url);async _request(method, url, body, options) {Wrap the retry handler inside the circuit breaker:Integration with HttpClient:   - Manually close the breaker7. forceClose(endpoint) → void   - Manually trip the breaker (e.g., when you know Twitter is down)6. forceOpen(endpoint) → void   - Reset specific endpoint or all5. reset(endpoint?) → void4. getStatus() → Map<endpoint, { state, failures, lastFailure, nextAttemptAt }>3. getState(endpoint) → 'CLOSED' | 'OPEN' | 'HALF_OPEN'     - If failures >= threshold: trip to OPEN     - On failure: increment failure count     - Execute normally   - If CLOSED:     - On failure: reopen circuit     - On success: close circuit, reset counters     - Allow limited requests   - If HALF_OPEN:     - If no, throw CircuitBreakerError('Circuit is OPEN for ${endpoint}')     - If yes, transition to HALF_OPEN     - Check if resetTimeout has passed   - If OPEN for this endpoint:   Per-endpoint circuit:2. async execute(fn, endpoint) → result1. constructor(options = {})Methods:- _perEndpoint: Map<string, CircuitState> (per-endpoint circuit breakers)- _lastFailureTime: number- _halfOpenMaxAttempts: number (default: 3 — test requests in HALF_OPEN)- _resetTimeout: number (default: 30000ms — how long to stay OPEN)- _failureThreshold: number (default: 5 — consecutive failures to trip)- _successCount: number- _failureCount: number- _state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'Properties:States: CLOSED (normal), OPEN (blocking), HALF_OPEN (testing)Export class CircuitBreaker:Prevents cascading failures when Twitter is having issues. If too many requests fail, stop sending requests for a cool-down period.Create src/client/http/CircuitBreaker.js.```### Prompt 6: Circuit Breaker Pattern```Integration: HttpClient calls parseJsonResponse then detectTwitterError on every response. If error, throw. If shadow rate limit detected, log warning and signal rate limiter.   - Return normalized error info   - Parse various Twitter error response formats5. function parseErrorResponse(response) → { code, message, subCode }   - Return null if headers not present   - Parse resetAt as Date from Unix timestamp   - Extract x-rate-limit-* headers4. function extractRateLimitHeaders(headers) → { limit, remaining, resetAt }|null   - This is heuristic-based and endpoint-specific   - Check if timeline instruction is missing when expected   - Check if response has entries/results section but it's unexpectedly empty   - Shadow rate limiting: Twitter returns 200 OK but with empty data3. function detectShadowRateLimit(data, endpoint) → boolean   - Return null if no errors detected     385 → TwitterApiError('REPLY_RESTRICTED')     349 → TwitterApiError('DM_NOT_ALLOWED')     326 → AuthenticationError('ACCOUNT_LOCKED')     187 → TwitterApiError('DUPLICATE_TWEET')     185 → RateLimitError('UPDATE_LIMIT')     179 → AuthenticationError('PROTECTED_TWEETS')     144 → NotFoundError('TWEET_NOT_FOUND')     135 → AuthenticationError('AUTH_FAILED')     131 → TwitterApiError('INTERNAL_ERROR')     130 → TwitterApiError('OVER_CAPACITY')     89 → AuthenticationError('INVALID_TOKEN')     88 → RateLimitError     64 → AuthenticationError('ACCOUNT_SUSPENDED')     63 → AuthenticationError('ACCOUNT_SUSPENDED')     50 → NotFoundError('USER_NOT_FOUND')     34 → NotFoundError   - Map error codes to specific error classes:     c. { error: "Not authorized." }     b. { data: { errors: [{ message: "..." }] } }  (GraphQL errors)     a. { errors: [{ code: 88, message: "Rate limit exceeded" }] }   - Twitter returns errors in multiple formats:2. function detectTwitterError(data) → Error|null   - Return parsed data along with headers and status code   - If not JSON (HTML error page, empty), throw TwitterApiError with raw text   - Try to parse response body as JSON1. function parseJsonResponse(response) → { data, headers, status }Export:Centralized response parsing and error detection for Twitter API responses.Create src/client/http/ResponseHandler.js.```### Prompt 5: HTTP Client Response Handling```This prevents scenarios where many concurrent searchTweets calls flood Twitter and trigger rate limits.- 2: Critical (auth flow, token refresh)- 1: High (post tweet, follow user — user-initiated actions)- 0: Normal (scraping, searching)Priority levels:    - Return number of items in queue (not including active)10. size() → number   - Wait for all queued and active requests to complete9. async drain() → void   - Process waiting requests if limit increased   - Update concurrency limit8. setConcurrency(n) → void7. getStatus() → { active, queued, concurrency, paused, totalProcessed }   - Return count of cleared requests   - Reject all queued (not active) requests with 'QUEUE_CLEARED'6. clear() → number   - Process pending items   - Set _paused = false5. resume() → void   - Don't interrupt in-flight requests, but don't start new ones   - Set _paused = true4. pause() → void     - Call _processNext() to process waiting requests     - Resolve/reject the enqueue Promise     - Decrement active count   - Execute, then:   - Increment active count   - Dequeue highest priority   - Sort queue by priority (descending)   - If queue is empty, return   - If active >= concurrency, return   - If paused, return3. _processNext() → void   - Otherwise wait in queue   - If under concurrency limit, execute immediately   - Return a Promise that resolves when the request completes   - Higher priority values are processed first   - Add request function to queue2. async enqueue(fn, priority = 0) → result   - Default concurrency: 2 (low to be safe with Twitter)   - options: { concurrency, autoStart }1. constructor(options = {})Methods:- _totalQueued: number- _totalProcessed: number- _paused: boolean- _active: number (count of in-flight requests)- _queue: Array<{ fn, resolve, reject, priority }>- _concurrency: number (default: 2 — max simultaneous requests)Properties:Export class RequestQueue:Controls concurrency of outbound requests. Prevents flooding Twitter with parallel requests.Create src/client/http/RequestQueue.js.```### Prompt 4: Request Queue with Concurrency Control```}  );    { url, method }    async () => { /* actual fetch logic */ },  return this._retryHandler.execute(async _request(method, url, body, options) {The _request method wraps the actual fetch call in retryHandler.execute():Integration with HttpClient:6. getRetryStats() → { totalRetries, successfulRetries, failedAfterRetries }   - For specialized retry needs   - Return new handler with custom shouldRetry function5. withCustomRetryLogic(shouldRetryFn) → RetryHandler   - Special case for 503: use longer base delay (server overloaded)   - Special case for 429: use Retry-After header if present, or rate limit reset time   - Add jitter: delay * (1 + (Math.random() - 0.5) * 2 * _jitterFactor)   - Cap at _maxDelay   - Base: _baseDelay * Math.pow(2, attempt)4. calculateDelay(attempt, error) → number (ms)   - Return false for client errors (400, 404)   - Return false for auth errors (401, 403 non-rate-limit)   - Return true if error instanceof RateLimitError   - Return true if error.code is in _retryableErrors   - Return true if error.status is in _retryableStatuses   - Return false if attempt >= _maxRetries3. shouldRetry(error, attempt) → boolean   }     }       await sleep(delay);       console.warn(`⚠️ Retry ${attempt + 1}/${_maxRetries} for ${context.url} in ${delay}ms: ${error.message}`);       const delay = this.calculateDelay(attempt, error);       if (!this.shouldRetry(error, attempt)) throw error;     } catch (error) {       return result;       const result = await fn();     try {   for (let attempt = 0; attempt <= _maxRetries; attempt++) {   Implementation:      - context: { url, method, attempt, endpoint }   - fn: async function that makes the HTTP request2. async execute(fn, context = {}) → result   - Merge options with defaults1. constructor(options = {})Methods:- _retryableErrors: Set<string> (default: {'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'UND_ERR_SOCKET'})- _retryableStatuses: Set<number> (default: {408, 429, 500, 502, 503, 504})- _jitterFactor: number (default: 0.25, adds ±25% randomness)- _maxDelay: number (default: 60000ms)- _baseDelay: number (default: 1000ms)- _maxRetries: number (default: 3)Properties:Export class RetryHandler:Handles automatic retries with exponential backoff and jitter for transient failures.Create src/client/http/RetryHandler.js.```### Prompt 3: Retry Handler with Exponential Backoff```The adaptive mode is what sets this apart: the limiter learns Twitter's actual limits from response headers and adjusts in real-time, rather than using fixed delays.- Guest token: 180 per 15 minutes- Write operations (create tweet, follow): 15 per 15 minutes- Search: 20 requests per 15 minutes- GraphQL endpoints: 50 requests per 15 minutesDefault conservative limits (applied when no header data):   - '/1.1/friendships/create.json' → 'friendships/create'   - '/1.1/guest/activate.json' → 'guest/activate'   - '/i/api/graphql/xxx/UserByScreenName' → 'UserByScreenName'   - Extract meaningful endpoint key from URL9. _extractEndpoint(url) → string   - Clear all stored limits8. reset() → void7. getOverallStatus() → { totalEndpoints, rateLimitedEndpoints, backoffMultiplier, requestsPerMinute }6. getEndpointStatus(url) → { limit, remaining, resetAt, requestsInLastMinute }   - Slowly reduce _backoffMultiplier: Math.max(1, _backoffMultiplier * 0.9)   - Called on successful response5. recordSuccess(url) → void   - Emit 'rate:limited' event   - Increase _backoffMultiplier by 2x   - Set remaining = 0 for endpoint   - Called when 429 is received4. recordRateLimit(url) → void   - If remaining is healthy (> 50% of limit), decrease _backoffMultiplier toward 1   - If remaining is low (< 10% of limit), increase _backoffMultiplier   - Update _limits Map   - Read x-rate-limit-limit, x-rate-limit-remaining, x-rate-limit-reset   - Extract endpoint key3. updateFromHeaders(url, headers) → void   - Record request time in endpoint's requestTimes array   - Await the computed delay   - Apply adaptive throttling based on recent success rate   - Apply global delay: ensure _globalDelay * _backoffMultiplier has passed since last request     - If no limit data yet, apply default conservative rate     - If remaining > 0, proceed     - If remaining === 0 and resetAt is in future, wait until resetAt   - Check per-endpoint limit:   - Extract endpoint key from URL (e.g., '/graphql/xxx/UserTweets' → 'UserTweets')2. async waitForSlot(url) → void   - Default maxRequestsPerMinute: 100   - Default globalDelay: 500ms   - options: { globalDelay, adaptiveMode, maxRequestsPerMinute }1. constructor(options = {})Methods:- _backoffMultiplier: number (starts at 1, increases on rate limits, decreases on success)- _adaptiveMode: boolean (default: true)- _lastRequestTime: number- _globalDelay: number (minimum ms between any two requests, default: 500)  EndpointLimit: { limit, remaining, resetAt, lastUpdated, requestTimes: number[] }- _limits: Map<string, EndpointLimit>Properties:Export class RateLimiter:Twitter has different rate limits per endpoint, and they change dynamically. This rate limiter tracks per-endpoint limits and adapts.Create src/client/http/RateLimiter.js.```### Prompt 2: Adaptive Rate Limiter```The HttpClient is the ONLY place network requests are made. All API modules go through it.    - Include all required Twitter headers    - For POST: send as JSON body    - For GET: encode as query params    - Build full URL with variables and features encoded    - endpoint: key from GRAPHQL_ENDPOINTS    - Convenience method for Twitter GraphQL calls10. async graphql(endpoint, variables = {}, features = {}) → response9. getStats() → { totalRequests, failedRequests, rateLimited, retries }   - Set _cookieJar for auto-updating cookies from responses8. setCookieJar(jar: CookieJar) → void   - Set _auth reference7. setAuth(auth: CookieAuth) → void   - fn(response, url) → response — modify/inspect response6. addResponseInterceptor(fn) → void   - fn(url, init) → { url, init } — modify request before sending5. addRequestInterceptor(fn) → void   l. Return parsed data   k. Check for Twitter error object in response: { errors: [{ code, message }] }   j. Parse JSON response      - Throw TwitterApiError   i. If other error (5xx):      - Throw AuthenticationError   h. If 401/403 (auth issue):      - Throw RateLimitError with retry info      - Record in rate limiter   g. If 429 (rate limited):      - Run response interceptors      - Update cookie jar from Set-Cookie headers      - Update rate limiter from response headers   f. On response:   e. Make fetch call with timeout (AbortController)      - Run transform.request() if configured      - Add Content-Type for POST      - Add auth headers if _auth is set: this._auth.getHeaders()      - Start with _baseHeaders   d. Build headers:   c. Queue the request: await this._requestQueue.enqueue(async () => { ... })   b. Wait for rate limiter clearance: await this._rateLimiter.waitForSlot(url)   a. Run request interceptors: transform url, headers, body   Full request pipeline:4. async _request(method, url, body, options = {}) → response   - Call _request('POST', url, body, options)3. async post(url, body = {}, options = {}) → parsed JSON response   - Call _request('GET', fullUrl, null, options)   - Build URL with query params (URLSearchParams)2. async get(url, params = {}, options = {}) → parsed JSON response   - Default timeout: 30000ms   - Create RateLimiter, RetryHandler, RequestQueue   - Set _fetch to options.fetch || globalThis.fetch   - options: { fetch, proxy, transform, timeout, maxConcurrency }1. constructor(options = {})Methods:- _stats: { totalRequests: 0, failedRequests: 0, rateLimited: 0, retries: 0 }- _cookieJar: CookieJar|null- _baseHeaders: object- _proxy: ProxyManager|null- _interceptors: { request: [], response: [] }- _auth: null (set by CookieAuth after construction)- _requestQueue: RequestQueue (from Prompt 4)- _retryHandler: RetryHandler (from Prompt 3)- _rateLimiter: RateLimiter (from Prompt 2)- _fetch: function (default: global fetch)Properties:Export class HttpClient:The main HTTP client used by all Scraper operations. Wraps fetch() with interceptors, auth headers, rate limiting, and retry logic.Create src/client/http/HttpClient.js.```### Prompt 1: HttpClient Core## Prompts---```  RequestQueue.js        ← Request queuing with concurrency control  RetryHandler.js        ← Exponential backoff with jitter  RateLimiter.js         ← Adaptive rate limiter with per-endpoint tracking  HttpClient.js          ← Main HTTP client with interceptorssrc/client/http/```## Architecture---- Empty responses with 200 OK — shadow rate limiting (returns empty data)- `x-rate-limit-reset` header — Unix timestamp when limit resets- `x-rate-limit-remaining` header — requests remaining- `x-rate-limit-limit` header — max requests allowed- HTTP 403 Forbidden — may be soft rate limit or auth issue- HTTP 429 Too Many Requests — explicit rate limit hitTwitter rate limit signals:```api/middleware/                     — Existing Express rate limitingsrc/mcp/server.js                  — HTTP requests in MCP toolssrc/scrapers/twitter/index.js      — Current randomDelay(1000, 3000) pattern```## Research Before Starting---> Twitter's frontend API has dynamic, undocumented rate limits that change frequently. The top repos (the-convocation/twitter-scraper) handle this with sophisticated detection and backoff. XActions currently uses fixed "1-3s delays" which is fragile. This track builds a production-grade rate limiting and HTTP client layer.
> Build a production-grade rate limiter that tracks Twitter's per-endpoint rate limits from response headers, implements exponential backoff with jitter, queues requests to avoid bursts, and provides real-time rate limit visibility. This is critical infrastructure — every API call flows through it.

---

## Research Before Starting

Read these files:

```
src/scrapers/twitter/index.js     — Current randomDelay() helper (line 30), no real rate limiting
src/scraping/proxyManager.js      — Existing proxy rotation (potential integration point)
src/automation/quotaSupervisor.js  — Existing quota tracking for browser automations
src/mcp/server.js                 — MCP tools that will use rate limiting
api/middleware/auth.js             — Express rate limiting middleware (app-level, not Twitter API)
```

Study competitor rate limiting:

- `the-convocation/twitter-scraper` — Per-endpoint limit tracking from x-rate-limit headers
- `agent-twitter-client` — Backoff on 429, configurable delays
- `d60/twikit` — Rate limit handling with wait_until_reset

### Twitter Rate Limit Headers

Every Twitter API response includes:

```
x-rate-limit-limit: 50          ← Max requests in window
x-rate-limit-remaining: 47      ← Requests remaining
x-rate-limit-reset: 1708900000  ← Unix timestamp when window resets
```

On 429 (Too Many Requests):

```
Retry-After: 120                ← Seconds to wait
x-rate-limit-remaining: 0
```

---

## Architecture

```
src/client/http/
  RateLimiter.js          ← Per-endpoint rate limit tracking
  BackoffStrategy.js      ← Exponential backoff with jitter
  RequestQueue.js         ← Priority queue with concurrency control
  index.js                ← Re-exports
```

---

## Prompts

### Prompt 1: RateLimiter — Per-Endpoint Limit Tracking

```
Create src/client/http/RateLimiter.js — tracks Twitter's rate limits per endpoint from response headers.

Requirements:
- ESM module, @author nich (@nichxbt), @license Apache-2.0
- Class RateLimiter with:
  - constructor({ defaultLimit = 50, defaultWindowMs = 15 * 60 * 1000 })
  - update(endpoint, headers) — extract x-rate-limit-limit, x-rate-limit-remaining, x-rate-limit-reset from response headers object and store per endpoint
  - canRequest(endpoint) — returns true if remaining > 0 or window has reset (compare reset timestamp with Date.now())
  - getWaitTime(endpoint) — if remaining === 0, returns milliseconds until reset; otherwise returns 0
  - getStatus(endpoint) — returns { limit, remaining, resetAt: Date, windowMs } or null if not tracked
  - getAllStatus() — returns Map of all tracked endpoints and their status
  - isRateLimited(endpoint) — returns true if remaining === 0 AND reset is in the future
  - async waitForReset(endpoint) — if rate limited, sleeps until reset time + 1 second buffer, then returns
  - consume(endpoint) — decrements remaining by 1 (for pre-flight tracking before request is made)
  - reset(endpoint) — clears tracking for an endpoint
  - resetAll() — clears all tracking

Internal storage: Map<string, { limit: number, remaining: number, resetAt: number }>
Normalize endpoint keys — strip query parameters, keep only the path.
Example: "https://x.com/i/api/graphql/abc123/UserByScreenName?variables=..." → "/graphql/abc123/UserByScreenName"

File: src/client/http/RateLimiter.js
```

### Prompt 2: BackoffStrategy — Exponential Backoff with Jitter

```
Create src/client/http/BackoffStrategy.js — implements retry logic with exponential backoff and full jitter.

Requirements:
- ESM module, @author nich (@nichxbt), @license Apache-2.0
- Class BackoffStrategy with:
  - constructor({ baseDelay = 1000, maxDelay = 60000, maxRetries = 5, jitterFactor = 1.0 })
  - getDelay(attempt) — returns delay in ms using exponential backoff with full jitter:
    delay = min(maxDelay, baseDelay * 2^attempt)
    jittered = random(0, delay * jitterFactor)
    Return Math.floor(jittered)
  - shouldRetry(attempt, error) — returns true if:
    - attempt < maxRetries AND
    - error is retryable (429, 500, 502, 503, 504, network errors, ECONNRESET, ETIMEDOUT)
  - async wait(attempt) — sleeps for getDelay(attempt) milliseconds
  - async execute(fn) — retry loop:
    1. Call fn()
    2. If success, return result
    3. If error and shouldRetry, wait then retry
    4. If error and not retryable, throw immediately
    5. After maxRetries exhausted, throw last error with all attempt details
  - reset() — creates new instance with same config (for reuse)
  - getStats() — returns { totalAttempts, totalDelayMs, lastError }

Static factory methods:
  - BackoffStrategy.aggressive() — baseDelay: 500, maxDelay: 30000, maxRetries: 3
  - BackoffStrategy.conservative() — baseDelay: 2000, maxDelay: 120000, maxRetries: 7
  - BackoffStrategy.twitter() — optimized for Twitter API: baseDelay: 1000, maxDelay: 60000, maxRetries: 5

Also export a standalone function:
  export async function withRetry(fn, options) — shorthand wrapper

File: src/client/http/BackoffStrategy.js
```

### Prompt 3: RequestQueue — Concurrency-Controlled Priority Queue

```
Create src/client/http/RequestQueue.js — queues HTTP requests with concurrency limits and priority levels.

Requirements:
- ESM module, @author nich (@nichxbt), @license Apache-2.0
- Class RequestQueue with:
  - constructor({ concurrency = 3, intervalMs = 1000, intervalCap = 10, rateLimiter = null })
    - concurrency: max parallel requests
    - intervalMs: time window for intervalCap
    - intervalCap: max requests per intervalMs window (burst protection)
    - rateLimiter: optional RateLimiter instance to check before dispatching
  - async add(fn, { priority = 0, endpoint = null } = {}) — add a request function to the queue:
    - priority: higher number = executed first
    - endpoint: optional endpoint string for rate limit checking
    - Returns a promise that resolves with fn's return value
  - size — getter, returns number of pending requests
  - pending — getter, returns number of currently executing requests
  - async onIdle() — returns promise that resolves when queue is empty and all requests complete
  - pause() — stop dispatching new requests
  - resume() — resume dispatching
  - clear() — remove all pending requests (running requests continue)
  - isPaused — getter
  - on(event, handler) — simple event emitter for: 'active', 'idle', 'error', 'completed'

Implementation:
- Use a sorted array (by priority) for the pending queue
- Track active count, dispatch when active < concurrency and intervalCap not exceeded
- Use setTimeout for interval tracking
- When rateLimiter is provided, check canRequest(endpoint) before dispatching

No external dependencies (no p-queue) — implement from scratch.
File: src/client/http/RequestQueue.js
```

### Prompt 4: HttpClient — Fetch Wrapper with Rate Limiting

```
Create src/client/http/HttpClient.js — the primary HTTP client that wraps native fetch with rate limiting, retries, and request queuing.

Requirements:
- ESM module, @author nich (@nichxbt), @license Apache-2.0
- Class HttpClient with:
  - constructor({ tokenManager, rateLimiter = new RateLimiter(), backoff = BackoffStrategy.twitter(), queue = new RequestQueue(), timeout = 30000 })
  - async request(url, options = {}) — the main request method:
    1. Merge auth headers from tokenManager (if authenticated)
    2. Check rateLimiter.canRequest(url) — if limited, wait for reset
    3. Queue the request via requestQueue.add()
    4. Execute fetch with AbortController timeout
    5. Update rateLimiter from response headers
    6. If 429: extract Retry-After header, backoff, and retry
    7. If 401: mark session as expired, throw AuthError
    8. If 200-299: parse JSON and return { data, headers, status }
    9. If other error: throw HttpError with status, body, endpoint
  - async get(url, params = {}) — GET with query string building
  - async post(url, body = {}) — POST with JSON body
  - async graphql(queryId, operationName, variables = {}, features = {}) — Twitter GraphQL request:
    Builds URL: https://x.com/i/api/graphql/{queryId}/{operationName}
    Encodes variables and features as URL query params
    Returns parsed data from response
  - getStats() — returns { totalRequests, rateLimitHits, retryCount, avgResponseTime }
  - setProxy(proxyUrl) — configure HTTP proxy for requests

Custom error classes:
  - class HttpError extends Error { status, body, endpoint, retryable }
  - class AuthError extends HttpError (for 401s)
  - class RateLimitError extends HttpError { resetAt, retryAfter }

Import RateLimiter, BackoffStrategy, RequestQueue from their files in the same directory.
Import TokenManager from '../auth/TokenManager.js'.
Use native fetch. Support AbortController for timeouts.

File: src/client/http/HttpClient.js
```

### Prompt 5: HttpClient GraphQL Helpers

```
Create src/client/http/graphql.js — GraphQL query ID registry and variable builders for Twitter's internal API.

Requirements:
- ESM module, @author nich (@nichxbt), @license Apache-2.0

Export a QUERIES object mapping operation names to their query IDs:
(These are actual query IDs from Twitter's web client — they change periodically but these are current as of 2026)

const QUERIES = {
  // User operations
  UserByScreenName: 'xc8f1g7BYqr6VTzTbvNlGw',
  UserByRestId: 'oPppcargziU1lDQXSoYTJA',
  UserTweets: 'E3opETHurmVJflFsUBVuUQ',
  UserTweetsAndReplies: 'bt4TKuFz4T7Ckk-VvQKSfg',
  UserMedia: 'iHFHj-Bqv4HLFdcPkOqL4A',
  UserLikes: 'eSSNbhECHHRKPHE_AT-MoA',
  Followers: 'rRXFSG5vR6drKr5M37YOTw',
  Following: 'iSicc7LrzWGBgDPL0tM_TQ',
  
  // Tweet operations
  TweetDetail: '0hWvDhmW8YQ-S_ib3azIrw',
  TweetResultByRestId: 'V3vfsYzNEyD9tsf4xoFRgw',
  CreateTweet: 'a1p9RWpkYKBjWv_I3WzS-A',
  DeleteTweet: 'VaenaVgh5q5ih7kvyVjgtg',
  FavoriteTweet: 'lI07N6Otwv1PhnEgXILM7A',
  UnfavoriteTweet: 'ZYKSe-w7KEslx3JhSIk5LA',
  CreateRetweet: 'ojPdsZsimiJrUGLR1sjVzA',
  DeleteRetweet: 'iQtK4dl5hBmXewYZuEOKVw',
  
  // Search
  SearchTimeline: 'HgiQ8gAE7WAXY5Uf6OKahA',
  
  // Lists
  ListLatestTweetsTimeline: 'ZBbXfJaSHmCHceF0FdB2tw',
  ListMembers: 'BQp2IEdy68gH5JiYC4vQCg',
  
  // Bookmarks
  Bookmarks: 'j5KExvXGpBA_VtO5MYw9Bw',
  CreateBookmark: 'aaDnft_xZw5z7JfC4DKclg',
  DeleteBookmark: 'Wlmlj2-xISo1cpQq-eCoPQ',
  
  // DMs
  DmInboxTimeline: 'sWF10MXz05LO-D7PVHE5qg',
  
  // Trends
  GenericTimelineById: 'eiib0Cq9jCuvuaT3bWoGHw',
};

Export helper functions:
- buildGraphQLUrl(queryId, operationName) → full URL string
- encodeGraphQLVariables(variables) → URL-encoded JSON string
- encodeGraphQLFeatures(features) → URL-encoded JSON string with default feature flags
- getDefaultFeatures() → returns the standard feature flags object that Twitter expects:
  { responsive_web_graphql_exclude_directive_enabled: true, verified_phone_label_enabled: false, ... }

File: src/client/http/graphql.js
```

### Prompt 6: Rate Limit Presets per Endpoint

```
Create src/client/http/rateLimitPresets.js — known rate limits for Twitter endpoints so we can pre-populate the rate limiter without waiting for the first response.

Requirements:
- ESM module, @author nich (@nichxbt), @license Apache-2.0

Export RATE_LIMITS — a Map of endpoint patterns to their known limits:

const RATE_LIMITS = new Map([
  // Authenticated endpoints (per 15-minute window)
  ['UserByScreenName', { limit: 95, window: 15 * 60 * 1000 }],
  ['UserTweets', { limit: 50, window: 15 * 60 * 1000 }],
  ['TweetDetail', { limit: 150, window: 15 * 60 * 1000 }],
  ['SearchTimeline', { limit: 50, window: 15 * 60 * 1000 }],
  ['Followers', { limit: 50, window: 15 * 60 * 1000 }],
  ['Following', { limit: 50, window: 15 * 60 * 1000 }],
  ['CreateTweet', { limit: 300, window: 3 * 60 * 60 * 1000 }],  // per 3 hours
  ['FavoriteTweet', { limit: 500, window: 24 * 60 * 60 * 1000 }], // per day
  ['CreateRetweet', { limit: 300, window: 3 * 60 * 60 * 1000 }],
  
  // Guest endpoints (much lower limits)
  ['guest/UserByScreenName', { limit: 20, window: 15 * 60 * 1000 }],
  ['guest/TweetDetail', { limit: 20, window: 15 * 60 * 1000 }],
  ['guest/SearchTimeline', { limit: 20, window: 15 * 60 * 1000 }],
  
  // Action rate limits (daily caps)
  ['follow', { limit: 400, window: 24 * 60 * 60 * 1000 }],
  ['unfollow', { limit: 400, window: 24 * 60 * 60 * 1000 }],
  ['dm', { limit: 500, window: 24 * 60 * 60 * 1000 }],
]);

Export helper functions:
- getPreset(operationName, isGuest = false) → returns { limit, window } or null
- applyPresets(rateLimiter, isGuest = false) → pre-populates a RateLimiter instance with known limits
- isWriteOperation(operationName) → returns true for Create/Delete/Favorite operations

File: src/client/http/rateLimitPresets.js
```

### Prompt 7: HTTP Module Index

```
Create src/client/http/index.js — barrel exports for the HTTP module.

Requirements:
- ESM module, @author nich (@nichxbt), @license Apache-2.0
- Re-export everything:
  export { RateLimiter } from './RateLimiter.js';
  export { BackoffStrategy, withRetry } from './BackoffStrategy.js';
  export { RequestQueue } from './RequestQueue.js';
  export { HttpClient, HttpError, AuthError, RateLimitError } from './HttpClient.js';
  export { QUERIES, buildGraphQLUrl, encodeGraphQLVariables, encodeGraphQLFeatures, getDefaultFeatures } from './graphql.js';
  export { RATE_LIMITS, getPreset, applyPresets, isWriteOperation } from './rateLimitPresets.js';

- Export a convenience factory:
  export function createHttpClient(options = {}) {
    // Creates RateLimiter, BackoffStrategy, RequestQueue, and HttpClient
    // options: { tokenManager, concurrency, timeout, aggressive, conservative }
    // Returns configured HttpClient instance
  }

File: src/client/http/index.js
```

### Prompt 8: Rate Limiter Tests

```
Create tests/client/http/rateLimiter.test.js — comprehensive tests for RateLimiter.

Requirements:
- Use vitest with vi.useFakeTimers() for time-dependent tests

Test cases (minimum 15):
1. constructor creates empty tracking map
2. update() extracts rate limit headers correctly
3. update() normalizes endpoint URLs (strips query params)
4. canRequest() returns true for untracked endpoints
5. canRequest() returns true when remaining > 0
6. canRequest() returns false when remaining === 0 and reset in future
7. canRequest() returns true when remaining === 0 but reset in past
8. getWaitTime() returns 0 for untracked endpoints
9. getWaitTime() returns milliseconds until reset for limited endpoints
10. getStatus() returns null for untracked endpoints
11. getStatus() returns correct data for tracked endpoints
12. isRateLimited() returns correct boolean
13. waitForReset() sleeps until reset time
14. consume() decrements remaining
15. reset() clears tracking for one endpoint
16. resetAll() clears all tracking
17. getAllStatus() returns map of all tracked endpoints

File: tests/client/http/rateLimiter.test.js
```

### Prompt 9: BackoffStrategy Tests

```
Create tests/client/http/backoffStrategy.test.js — tests for exponential backoff.

Requirements:
- Use vitest with vi.useFakeTimers()

Test cases:
1. getDelay() returns 0 for attempt 0 with baseDelay 0
2. getDelay() increases exponentially
3. getDelay() never exceeds maxDelay
4. getDelay() applies jitter (multiple calls return different values)
5. shouldRetry() returns true for 429 errors
6. shouldRetry() returns true for 500/502/503/504 errors
7. shouldRetry() returns true for network errors (ECONNRESET, ETIMEDOUT)
8. shouldRetry() returns false for 400/401/403/404 errors
9. shouldRetry() returns false when attempt >= maxRetries
10. execute() returns result on first successful try
11. execute() retries on retryable error and eventually succeeds
12. execute() throws after maxRetries exhausted
13. execute() throws immediately on non-retryable error
14. Static factory aggressive() has correct config
15. Static factory conservative() has correct config

File: tests/client/http/backoffStrategy.test.js
```

### Prompt 10: RequestQueue Tests

```
Create tests/client/http/requestQueue.test.js — tests for the request queue.

Requirements:
- Use vitest with vi.useFakeTimers()

Test cases:
1. add() executes function and returns result
2. add() respects concurrency limit (only N run simultaneously)
3. add() executes higher priority items first
4. size getter returns pending count
5. pending getter returns active count
6. onIdle() resolves when all work completes
7. pause() stops dispatching new requests
8. resume() dispatches paused requests
9. clear() removes pending requests
10. isPaused returns correct state
11. Interval cap prevents burst (only N per interval)
12. Integrates with RateLimiter — delays when rate limited
13. Error in function rejects the add() promise
14. on('error') fires when a request fails
15. on('completed') fires after each request

File: tests/client/http/requestQueue.test.js
```

### Prompt 11: HttpClient Tests

```
Create tests/client/http/httpClient.test.js — integration tests for the HTTP client.

Requirements:
- Use vitest, mock fetch globally

Test cases:
1. request() sends correct auth headers from TokenManager
2. request() parses JSON response
3. request() updates rate limiter from response headers
4. request() retries on 429 with backoff
5. request() throws AuthError on 401
6. request() throws RateLimitError on 429 after retries exhausted
7. request() throws HttpError on 500
8. request() times out with AbortController
9. get() builds query string correctly
10. post() sends JSON body with Content-Type header
11. graphql() builds correct URL from queryId and operationName
12. graphql() encodes variables in query string
13. graphql() includes default feature flags
14. getStats() returns accurate request counts
15. setProxy() configures proxy (verify it's stored, actual proxy test optional)

Mock TokenManager to return predictable headers.
Mock fetch to return controlled responses.

File: tests/client/http/httpClient.test.js
```

### Prompt 12: GraphQL Query Registry Tests

```
Create tests/client/http/graphql.test.js — tests for GraphQL helpers.

Requirements:
- Use vitest

Test cases:
1. QUERIES has all expected operation names
2. buildGraphQLUrl() produces correct URL format
3. encodeGraphQLVariables() JSON-encodes and URL-encodes variables
4. encodeGraphQLFeatures() includes default features
5. getDefaultFeatures() returns object with expected keys
6. Query IDs are non-empty strings
7. buildGraphQLUrl handles special characters in queryId
8. All QUERIES values are strings (not undefined)

File: tests/client/http/graphql.test.js
```

### Prompt 13: Rate Limit TypeScript Definitions

```
Create types/client/http.d.ts — TypeScript type definitions for the HTTP module.

Contents:
- class RateLimiter { update, canRequest, getWaitTime, getStatus, getAllStatus, isRateLimited, waitForReset, consume, reset, resetAll }
- interface RateLimitStatus { limit: number; remaining: number; resetAt: Date; windowMs: number; }
- class BackoffStrategy { getDelay, shouldRetry, wait, execute, reset, getStats; static aggressive, conservative, twitter }
- function withRetry<T>(fn: () => Promise<T>, options?: BackoffOptions): Promise<T>
- class RequestQueue { add, size, pending, onIdle, pause, resume, clear, isPaused, on }
- class HttpClient { request, get, post, graphql, getStats, setProxy }
- class HttpError extends Error { status: number; body: any; endpoint: string; retryable: boolean; }
- class AuthError extends HttpError
- class RateLimitError extends HttpError { resetAt: Date; retryAfter: number; }
- interface RequestOptions { priority?: number; endpoint?: string; timeout?: number; }
- const QUERIES: Record<string, string>
- function buildGraphQLUrl(queryId: string, operationName: string): string
- function createHttpClient(options?: HttpClientOptions): HttpClient

File: types/client/http.d.ts
```

### Prompt 14: Wire HTTP Module into Package

```
Wire the HTTP module into XActions package exports.

1. Update src/index.js — add after existing auth exports:
   export { HttpClient, RateLimiter, BackoffStrategy, RequestQueue, HttpError, AuthError, RateLimitError, createHttpClient } from './client/http/index.js';

2. Update package.json — add to "exports":
   "./http": "./src/client/http/index.js"

3. Update types/index.d.ts — add:
   export * from './client/http';

Read existing files before editing. Preserve all existing exports — only add new ones.
```

### Prompt 15: Rate Limiting Documentation

```
Create docs/rate-limiting.md — comprehensive documentation for the rate limiting system.

Structure:
1. Overview — how XActions handles Twitter's rate limits automatically
2. How Twitter Rate Limits Work — headers, windows, endpoint-specific limits
3. Automatic Rate Limit Handling — what happens by default with zero config
4. Configuration — customizing backoff strategy, concurrency, queue behavior
5. Rate Limit Presets — table of all known Twitter endpoint limits
6. Monitoring — how to check current rate limit status in real-time
7. Advanced: Request Queuing — priority, concurrency control, burst protection
8. Advanced: Custom Backoff Strategies — creating your own retry logic
9. Error Handling — RateLimitError, AuthError, HttpError hierarchy
10. Best Practices for High-Volume Operations
    - Scraping: use conservative backoff, low concurrency
    - Posting: respect daily caps, use scheduling
    - Monitoring: use guest tokens for lighter limits
11. API Reference — every class and method
12. Troubleshooting — "Why am I still getting 429?" scenarios

Include real code examples. Reference actual file paths.

File: docs/rate-limiting.md
```

---

## Validation

After all 15 prompts:

```bash
ls src/client/http/{RateLimiter,BackoffStrategy,RequestQueue,HttpClient,graphql,rateLimitPresets,index}.js
ls tests/client/http/{rateLimiter,backoffStrategy,requestQueue,httpClient,graphql}.test.js
ls types/client/http.d.ts
ls docs/rate-limiting.md

npx vitest run tests/client/http/
```

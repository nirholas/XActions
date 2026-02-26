# Build 01-02 — HTTP Client Core

> **Agent Role:** Implementer  
> **Depends on:** 01-graphql-endpoint-map.md, Track 03 error classes  
> **Creates:** `src/scrapers/twitter/http/client.js`  
> **No mock data. No stubs. Complete working code.**

---

## Task

Build the core HTTP client that all Twitter HTTP scraper functions use. This is the foundation layer — it handles request construction, header management, cookie persistence, proxy support, rate-limit detection, and retry logic.

---

## File: `src/scrapers/twitter/http/client.js`

### Class: `TwitterHttpClient`

```javascript
export class TwitterHttpClient {
  constructor(options = {}) {
    // options.cookies — cookie string or tough-cookie jar
    // options.proxy — HTTP/SOCKS5 proxy URL
    // options.rateLimitStrategy — 'wait' | 'error' | custom function
    // options.maxRetries — default 3
    // options.userAgent — custom user agent or 'rotate'
    // options.fetch — custom fetch function (for CycleTLS, edge runtimes)
  }
}
```

### Required Methods

1. **`async request(url, options)`** — Core request method
   - Adds required headers: `authorization` (bearer), `x-csrf-token`, `cookie`, `x-twitter-auth-type`, `x-twitter-active-user`, `x-twitter-client-language`
   - Handles proxy routing
   - Detects rate limits (HTTP 429, `x-rate-limit-*` headers)
   - Implements exponential backoff retry (configurable)
   - Rotates user agents if configured
   - Logs request timing for debugging
   - Returns parsed JSON response

2. **`async graphql(queryId, operationName, variables, features)`** — GraphQL helper
   - Uses `buildGraphQLUrl()` from endpoints.js
   - Automatically includes DEFAULT_FEATURES
   - Handles cursor-based pagination (accept `cursor` in variables, return `{ data, cursor }`)
   - For mutations, sends POST with JSON body instead of GET

3. **`async graphqlPaginate(queryId, operationName, variables, options)`** — Auto-pagination
   - Wraps `graphql()` in a loop following cursors
   - Yields results via async generator: `for await (const batch of client.graphqlPaginate(...))`
   - Respects `limit` option
   - Emits `onProgress({ fetched, limit })` callbacks
   - Handles Twitter's "bottom cursor" pagination pattern

4. **`async rest(path, options)`** — REST API helper
   - For non-GraphQL endpoints (e.g., guest token, media upload)
   - Same header/auth/retry logic as `request()`

5. **`setCookies(cookieString)`** — Set cookies from browser export
   - Parses `name=value; name2=value2` format
   - Extracts `auth_token` and `ct0` automatically
   - Stores in internal cookie jar

6. **`getCsrfToken()`** — Extract ct0 from cookies
   - Returns the csrf token needed for write operations

7. **`isAuthenticated()`** — Check if we have valid auth
   - Returns true if `auth_token` cookie is present

8. **`setProxy(proxyUrl)`** — Set HTTP/SOCKS5 proxy
   - Supports `http://`, `https://`, `socks5://` schemes
   - Supports authenticated proxies: `http://user:pass@host:port`

### Rate Limiting

Implement the `RateLimitStrategy` pattern from the-convocation/twitter-scraper:

```javascript
// Built-in strategies
export class WaitingRateLimitStrategy {
  async onRateLimit({ resetAt, endpoint, retryCount }) {
    const waitMs = resetAt - Date.now();
    await sleep(Math.max(waitMs, 1000));
  }
}

export class ErrorRateLimitStrategy {
  async onRateLimit({ resetAt, endpoint, retryCount }) {
    throw new RateLimitError(`Rate limited on ${endpoint}, resets at ${new Date(resetAt)}`);
  }
}
```

Parse rate-limit headers:
- `x-rate-limit-limit` — max requests
- `x-rate-limit-remaining` — remaining requests
- `x-rate-limit-reset` — Unix timestamp when limit resets

### Error Handling

Import and throw structured errors from `src/scrapers/twitter/http/errors.js` (Track 03):
- `RateLimitError` — 429 responses
- `AuthError` — 401/403 responses
- `NotFoundError` — 404 responses  
- `TwitterApiError` — All other API errors
- `NetworkError` — Connection failures, timeouts

### Dependencies

- `undici` or Node.js built-in `fetch` (Node 18+)
- `tough-cookie` for cookie management (optional peer dep)
- No Puppeteer import anywhere in this file

---

## Test File: `tests/http-scraper/client.test.js`

Write tests that:
1. Test header construction (bearer token, csrf, cookies present)
2. Test rate-limit detection from response headers
3. Test retry logic with exponential backoff (mock fetch)
4. Test cookie parsing from string
5. Test proxy URL parsing
6. Test GraphQL URL construction
7. Test pagination cursor extraction
8. Test error class throwing for each HTTP status code
9. Test user agent rotation
10. Test that unauthenticated requests omit auth headers

Use `vitest` with mocked `fetch` — do not make real network requests in tests.

---

## Integration Points

- Used by: `05-scrape-profile-http.md` through `13-dm-http.md`
- Imports from: `./endpoints.js`, `./errors.js`
- Exported from: `src/scrapers/twitter/http/index.js`

---

## Acceptance Criteria

- [ ] All methods implemented with complete logic (no TODOs)
- [ ] Rate-limit strategy is pluggable
- [ ] Exponential backoff with jitter implemented
- [ ] Cookie parsing handles real browser cookie exports
- [ ] Proxy support works for HTTP and SOCKS5
- [ ] All 10 test cases pass
- [ ] Zero Puppeteer dependencies
- [ ] Works with Node.js 18+ built-in fetch

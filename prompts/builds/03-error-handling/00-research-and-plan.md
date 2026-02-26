# Build 03-00 — Research & Plan: Error Handling

> **Agent Role:** Researcher  
> **Creates:** Architecture document for error handling across XActions  
> **Output:** Detailed findings + architecture plan (no code yet)

---

## Task

Research the entire XActions codebase to map every unhandled error path, missing try/catch, and unstructured error response. Produce a comprehensive architecture plan for a unified error handling system.

---

## Files to Read

```
src/scrapers/twitter/index.js     — 952 lines, 20 exported Puppeteer functions, ZERO try/catch
src/scrapers/index.js             — 362 lines, unified multi-platform dispatcher
src/client/errors.js              — 396 lines, scaffolded but mostly empty error classes
src/client/validation.js          — 262 lines, scaffolded but mostly empty validators
src/utils/core.js                 — 675 lines, browser IIFE with basic isRateLimited()/backoff()
src/mcp/server.js                 — 3,899 lines, 140+ MCP tools, unstructured error handling
src/cli/index.js                  — 2,983 lines, 100+ CLI commands
api/server.js                     — Express server entry
api/middleware/                    — Existing middleware (check for error handlers)
api/routes/                       — API routes (check error patterns)
api/services/                     — Service layer (check error patterns)
src/automation/*.js               — 20 automation scripts (check error handling)
src/auth/teamManager.js           — 271 lines, team auth with permission matrix
tests/                            — 21 test files (check error testing patterns)
package.json                      — Dependencies (check for error/retry libraries)
```

---

## Research Questions

1. **Scraper errors:** How many of the 20 functions in `src/scrapers/twitter/index.js` have try/catch? What happens when Puppeteer times out, selector is missing, or page navigation fails?

2. **MCP error responses:** How does `src/mcp/server.js` handle errors in tool handlers? Are errors returned as MCP error objects or do they crash the server?

3. **CLI error output:** How does `src/cli/index.js` handle errors? Does it show stack traces to users? Are errors color-coded?

4. **API error middleware:** Does `api/middleware/` have an error handler? What format are error responses in?

5. **Rate limiting:** Does any code currently detect Twitter's 429 responses or `x-rate-limit-*` headers? How does `src/utils/core.js`'s `isRateLimited()` work (browser DOM check vs HTTP headers)?

6. **Auth errors:** What happens when cookies expire mid-scrape? When Twitter returns 401? When login fails?

7. **Network errors:** Are DNS failures, connection timeouts, or TLS errors caught anywhere?

8. **Validation:** Is user input validated before scraping? What about CLI arguments?

9. **Existing patterns:** Does `src/client/errors.js` have any usable code, or is it entirely scaffolding?

10. **Dependencies:** Are there retry/backoff/circuit-breaker libraries in `package.json`?

---

## Expected Output

### 1. Error Audit Table

| File | Line(s) | Issue | Severity |
|------|---------|-------|----------|
| `src/scrapers/twitter/index.js` | 44-952 | Zero try/catch on any Puppeteer call | Critical |
| ... | ... | ... | ... |

### 2. Error Class Hierarchy Diagram

```
XActionsError (base)
├── AuthError
│   ├── AUTH_EXPIRED
│   ├── AUTH_INVALID
│   └── AUTH_2FA_REQUIRED
├── RateLimitError
│   └── RATE_LIMITED
├── TwitterApiError
│   └── TWITTER_API_ERROR
├── NetworkError
│   ├── NETWORK_TIMEOUT
│   ├── NETWORK_DNS
│   └── NETWORK_CONNECTION
├── ScraperError
│   ├── SCRAPER_NAVIGATION
│   ├── SCRAPER_SELECTOR_MISSING
│   └── SCRAPER_TIMEOUT
├── ValidationError
│   └── VALIDATION_*
└── ConfigError
    └── CONFIG_*
```

### 3. Architecture Decisions

- Where error classes live (`src/client/errors.js`)
- How retry wraps existing functions (decorator pattern)
- How rate limiting integrates with HTTP client
- How CLI/MCP/API each format errors differently
- How circuit breaker protects against cascading failures

### 4. Implementation Order

Map to builds 01-15 with dependencies.

---

## Acceptance Criteria

- [ ] Every file in the research list has been read
- [ ] Error audit table lists every unhandled error path
- [ ] Error hierarchy covers all known failure modes
- [ ] Architecture plan is specific to XActions (not generic)
- [ ] Implementation order matches build prompts 01-15

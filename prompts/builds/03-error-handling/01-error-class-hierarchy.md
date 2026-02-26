# Build 03-01 — Error Class Hierarchy

> **Agent Role:** Implementer  
> **Depends on:** Nothing (foundation module)  
> **Creates:** `src/client/errors.js`  
> **Tests:** `tests/errors/error-classes.test.js`

---

## Task

Replace the scaffolded `src/client/errors.js` (currently 396 lines of mostly empty code) with a complete, production-ready error class hierarchy used by every module in XActions.

---

## File: `src/client/errors.js`

### Base Class

```javascript
export class XActionsError extends Error {
  constructor(message, { code, statusCode, retryable, cause, context } = {}) {
    super(message, { cause });
    this.name = 'XActionsError';
    this.code = code || 'UNKNOWN_ERROR';
    this.statusCode = statusCode || 500;
    this.retryable = retryable || false;
    this.context = context || {};
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      context: this.context,
      timestamp: this.timestamp,
      ...(this.cause && { cause: this.cause.message }),
    };
  }
}
```

### Error Subclasses

1. **`AuthError`** — Authentication/authorization failures
   - Codes: `AUTH_EXPIRED`, `AUTH_INVALID`, `AUTH_2FA_REQUIRED`, `AUTH_SUSPENDED`, `AUTH_LOCKED`
   - `statusCode`: 401
   - `retryable`: true for AUTH_EXPIRED (cookie refresh may fix), false for others
   - Extra fields: `expiredAt` (Date), `accountStatus` (string)

2. **`RateLimitError`** — Twitter rate limit hit
   - Code: `RATE_LIMITED`
   - `statusCode`: 429
   - `retryable`: true
   - Extra fields: `resetAt` (Date), `retryAfterMs` (number), `endpoint` (string), `limit` (number), `remaining` (number)
   - Computed: `getWaitTime()` returns milliseconds until reset

3. **`TwitterApiError`** — Twitter API returned error JSON
   - Code: `TWITTER_API_ERROR`
   - Extra fields: `twitterErrors` (array from API), `twitterErrorCode` (number)
   - `retryable`: depends on error code (130 = over capacity → retryable; 187 = duplicate → not)

4. **`NetworkError`** — Transport-level failure
   - Codes: `NETWORK_TIMEOUT`, `NETWORK_DNS`, `NETWORK_CONNECTION`, `NETWORK_TLS`, `NETWORK_RESET`
   - `statusCode`: 503
   - `retryable`: true
   - Extra fields: `originalCode` (e.g. `ECONNREFUSED`), `url` (string)

5. **`ScraperError`** — Puppeteer/browser automation failure
   - Codes: `SCRAPER_NAVIGATION`, `SCRAPER_SELECTOR_MISSING`, `SCRAPER_TIMEOUT`, `SCRAPER_CRASH`, `SCRAPER_BLOCKED`
   - `statusCode`: 502
   - `retryable`: true for SCRAPER_TIMEOUT, false for SCRAPER_BLOCKED
   - Extra fields: `selector` (string), `pageUrl` (string)

6. **`ValidationError`** — Input validation failure
   - Codes: `VALIDATION_USERNAME`, `VALIDATION_TWEET_ID`, `VALIDATION_COOKIES`, `VALIDATION_OPTIONS`, `VALIDATION_CONTENT`
   - `statusCode`: 400
   - `retryable`: false
   - Extra fields: `field` (string), `expected` (string), `received` (any)

7. **`ConfigError`** — Configuration/environment error
   - Codes: `CONFIG_MISSING`, `CONFIG_INVALID`, `CONFIG_FILE_READ`
   - `statusCode`: 500
   - `retryable`: false
   - Extra fields: `configKey` (string), `filePath` (string)

### Type Guard Functions

```javascript
export function isXActionsError(err) {
  return err instanceof XActionsError;
}

export function isRetryable(err) {
  return err instanceof XActionsError && err.retryable === true;
}

export function isRateLimited(err) {
  return err instanceof RateLimitError;
}

export function isAuthError(err) {
  return err instanceof AuthError;
}

export function isNetworkError(err) {
  return err instanceof NetworkError;
}
```

### Factory Functions

```javascript
export function fromHttpResponse(response, body) {
  // Convert HTTP status + body to appropriate error class
  // 401 → AuthError, 429 → RateLimitError, 404 → NotFoundError, etc.
}

export function fromPuppeteerError(err, context) {
  // Convert Puppeteer TimeoutError → ScraperError(SCRAPER_TIMEOUT)
  // Convert Puppeteer navigation error → ScraperError(SCRAPER_NAVIGATION)
  // Convert Puppeteer protocol error → ScraperError(SCRAPER_CRASH)
}

export function fromNodeError(err) {
  // Convert ECONNREFUSED → NetworkError(NETWORK_CONNECTION)
  // Convert ENOTFOUND → NetworkError(NETWORK_DNS)
  // Convert ETIMEDOUT → NetworkError(NETWORK_TIMEOUT)
  // Convert ECONNRESET → NetworkError(NETWORK_RESET)
}
```

---

## File: `tests/errors/error-classes.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import {
  XActionsError, AuthError, RateLimitError, TwitterApiError,
  NetworkError, ScraperError, ValidationError, ConfigError,
  isXActionsError, isRetryable, isRateLimited,
  fromHttpResponse, fromPuppeteerError, fromNodeError,
} from '../../src/client/errors.js';
```

Test suites:
1. Each error class constructs with correct defaults
2. `toJSON()` serializes all fields including `cause`
3. `instanceof` chains work (`new AuthError() instanceof XActionsError`)
4. Type guards return correct booleans
5. `RateLimitError.getWaitTime()` calculates correctly
6. `fromHttpResponse()` maps status codes to correct classes
7. `fromPuppeteerError()` wraps Puppeteer errors
8. `fromNodeError()` wraps Node.js system errors
9. Error codes match expected constants
10. `retryable` is correct for each subclass

---

## Acceptance Criteria

- [ ] All 8 error classes implemented with complete constructors
- [ ] `toJSON()` method on every class
- [ ] 5 type guard functions exported
- [ ] 3 factory functions for HTTP/Puppeteer/Node errors
- [ ] Every error code is a string constant
- [ ] JSDoc on every class and method
- [ ] Tests cover all classes and factory functions
- [ ] `import { XActionsError } from 'xactions'` works (re-export from src/index.js)

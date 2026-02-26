# Build 03-15 — Error Handling Tests

> **Agent Role:** Implementer  
> **Depends on:** All modules in 03-error-handling/  
> **Creates:** `tests/errors/integration.test.js`, `tests/errors/validation.test.js`  
> **Verifies:** `tests/errors/error-classes.test.js`, `tests/errors/retry-engine.test.js`, `tests/errors/rate-limit.test.js`, `tests/errors/circuit-breaker.test.js`

---

## Task

Create comprehensive integration tests that verify the entire error handling stack works end-to-end: errors are thrown → caught → retried → recovered → formatted for each output channel (CLI, MCP, API).

---

## File: `tests/errors/validation.test.js`

```javascript
import { describe, it, expect } from 'vitest';
import {
  validateUsername, validateTweetId, validateCookies,
  validateScrapeOptions, validateTweetContent, createValidator,
} from '../../src/client/validation.js';
import { ValidationError } from '../../src/client/errors.js';
```

### Test Suites

1. **validateUsername** — valid inputs: `'testuser'`, `'@testuser'`, `'Test_User123'`; invalid: `''`, `'a'.repeat(16)`, `'user!name'`, `123`, `null`
2. **validateTweetId** — valid: `'1234567890'`, `1234567890`; invalid: `'abc'`, `''`, `-1`, `'12345678901234567890123'`
3. **validateCookies** — valid: string format, object, array; invalid: missing auth_token, missing ct0, empty
4. **validateScrapeOptions** — valid: `{ limit: 50 }`, `{ cursor: 'abc' }`; invalid: `{ limit: -1 }`, `{ limit: 99999 }`, `{ cursor: 123 }`
5. **validateTweetContent** — valid: `'Hello world'`; invalid: `''`, `'x'.repeat(281)`, media not array
6. **createValidator** — test schema with required/type/min/max/pattern/enum rules

---

## File: `tests/errors/integration.test.js`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
```

### Integration Test Suites

1. **Error → Retry → Success Flow**
   - Create a function that fails twice then succeeds
   - Wrap with `retry()`
   - Verify it returns on third attempt
   - Verify `telemetry.recordRetry()` was called

2. **Error → Retry → Exhausted → Formatted**
   - Create a function that always throws `NetworkError`
   - Wrap with `retry({ maxRetries: 2 })`
   - Verify it throws after 3 attempts
   - Pass to `formatCliError()` — verify color-coded output
   - Pass to `formatMcpError()` — verify structured JSON

3. **RateLimit → Wait → Retry → Success**
   - Mock `RateLimitManager` with `waitIfNeeded()` that resolves after delay
   - Throw `RateLimitError` with `resetAt` 5s in future
   - Verify `RateLimitRecovery` waits then returns `recovered: true`

4. **Auth → Recovery → Cookie Refresh**
   - Throw `AuthError(AUTH_EXPIRED)`
   - `AuthRecovery.recover()` → mock cookie refresh succeeds
   - Verify recovery chain returns `recovered: true`

5. **Circuit Breaker Integration**
   - Send 5 failing requests through `CircuitBreaker`
   - Verify 6th request gets `CircuitOpenError` immediately
   - Wait for reset timeout
   - Verify probe request goes through
   - Verify `telemetry.recordCircuitEvent()` was called

6. **Fallback Chain Integration**
   - HTTP scraper throws `NetworkError`
   - `FallbackChain` tries Puppeteer → succeeds
   - Verify result has `source: 'puppeteer'`

7. **Validation → API Error Response**
   - Throw `ValidationError` in Express route handler
   - Verify API middleware returns 400 JSON with field/expected/received

8. **Full Scraper Error Wrapping**
   - Mock Puppeteer `TimeoutError`
   - Call wrapped scraper function
   - Verify `ScraperError(SCRAPER_TIMEOUT)` is thrown
   - Verify retry was attempted

9. **Timeout Management**
   - Create `TimeoutController`
   - Wrap a slow promise with 100ms timeout
   - Verify `NetworkError(NETWORK_TIMEOUT)` is thrown

10. **Telemetry Report**
    - Run several operations that produce errors
    - Call `telemetry.getReport()`
    - Verify counters match expected values

---

## Running All Error Tests

```bash
# Run all error handling tests
npm run test -- tests/errors/

# Expected output:
# ✓ tests/errors/error-classes.test.js (10 tests)
# ✓ tests/errors/retry-engine.test.js (13 tests)
# ✓ tests/errors/rate-limit.test.js (10 tests)
# ✓ tests/errors/circuit-breaker.test.js (10 tests)
# ✓ tests/errors/validation.test.js (6 suites)
# ✓ tests/errors/integration.test.js (10 tests)
```

---

## Acceptance Criteria

- [ ] 6 validation test suites covering all validators
- [ ] 10 integration test scenarios
- [ ] Tests verify error flow across modules (throw → catch → retry → recover → format)
- [ ] No external dependencies (all mocked)
- [ ] `npm run test -- tests/errors/` passes
- [ ] Tests cover CLI, MCP, and API error formatting
- [ ] Telemetry is verified in integration tests

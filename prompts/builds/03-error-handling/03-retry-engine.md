# Build 03-03 — Retry Engine

> **Agent Role:** Implementer  
> **Depends on:** 03-01 (error classes), 03-02 (error codes)  
> **Creates:** `src/client/retry.js`, `tests/errors/retry-engine.test.js`

---

## Task

Create a generic async retry engine with exponential backoff, jitter, AbortSignal support, and callback hooks. This is the core retry primitive used by the HTTP scraper, Puppeteer scraper, and all network operations.

---

## File: `src/client/retry.js`

### `retry(fn, options)` — Core Retry Function

```javascript
/**
 * @param {() => Promise<T>} fn - Async function to retry
 * @param {RetryOptions} [options]
 * @returns {Promise<RetryResult<T>>}
 *
 * @typedef {Object} RetryOptions
 * @property {number} [maxRetries=3] - Maximum retry attempts (0 = no retries)
 * @property {number} [baseDelay=1000] - Base delay in ms
 * @property {number} [maxDelay=30000] - Maximum delay cap in ms
 * @property {number} [backoffFactor=2] - Exponential backoff multiplier
 * @property {boolean} [jitter=true] - Add random jitter to prevent thundering herd
 * @property {(error: Error) => boolean} [retryOn] - Predicate: should we retry this error?
 * @property {(error: Error, attempt: number, delay: number) => void} [onRetry] - Called before each retry
 * @property {AbortSignal} [signal] - AbortSignal for cancellation
 * @property {string} [operationName] - Name for logging/telemetry
 *
 * @typedef {Object} RetryResult
 * @property {T} result - The successful result
 * @property {number} attempts - Total attempts (1 = succeeded first try)
 * @property {number} totalDelay - Total ms spent waiting between retries
 */
export async function retry(fn, options = {}) {
  // Implementation:
  // 1. Default retryOn: check isRetryable(error) from errors.js
  // 2. Loop up to maxRetries + 1 attempts
  // 3. On failure: check retryOn predicate, check signal.aborted
  // 4. Calculate delay: min(baseDelay * backoffFactor^attempt, maxDelay)
  // 5. If jitter: delay += Math.random() * baseDelay
  // 6. Call onRetry callback with error, attempt number, calculated delay
  // 7. await sleep(delay)
  // 8. On success: return { result, attempts, totalDelay }
  // 9. On final failure: throw last error with attempt count in context
}
```

### `retryable(fn, options)` — Decorator

```javascript
/**
 * Wraps an async function so every call automatically retries on failure.
 * @param {Function} fn - Async function to wrap
 * @param {RetryOptions} options - Retry configuration
 * @returns {Function} Wrapped function with same signature
 */
export function retryable(fn, options = {}) {
  return async function retried(...args) {
    const { result } = await retry(() => fn.apply(this, args), options);
    return result;
  };
}
```

### `sleep(ms, signal)` — Cancellable Sleep

```javascript
/**
 * @param {number} ms - Milliseconds to sleep
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<void>}
 */
export function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Aborted'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new Error('Aborted'));
    }, { once: true });
  });
}
```

### `calculateDelay(attempt, options)` — Exported for Testing

```javascript
export function calculateDelay(attempt, { baseDelay = 1000, maxDelay = 30000, backoffFactor = 2, jitter = true } = {}) {
  let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
  if (jitter) delay += Math.random() * baseDelay;
  return Math.round(delay);
}
```

---

## File: `tests/errors/retry-engine.test.js`

### Test Suites

1. **Basic retry** — Function succeeds first try → returns `{ attempts: 1, totalDelay: 0 }`
2. **Retry on transient failure** — Fails twice, succeeds third → `{ attempts: 3 }`
3. **Exhausted retries** — Fails all attempts → throws last error with context
4. **Exponential backoff timing** — Mock `Date.now()`, verify delays: 1s, 2s, 4s
5. **Max delay cap** — With `maxDelay: 5000`, delay never exceeds 5s
6. **Custom retryOn predicate** — Only retry `NetworkError`, not `ValidationError`
7. **Default retryOn uses isRetryable()** — Retries RateLimitError, not ValidationError
8. **onRetry callback** — Verify called with (error, attempt, delay) before each retry
9. **AbortSignal cancellation** — Abort mid-retry → throws immediately
10. **retryable decorator** — Wraps function, preserves `this` context and arguments
11. **calculateDelay** — Verify exponential growth and jitter range
12. **Zero retries** — `maxRetries: 0` → single attempt, no retry
13. **Jitter disabled** — `jitter: false` → deterministic delays

---

## Acceptance Criteria

- [ ] `retry()` implements exponential backoff with jitter
- [ ] `retryable()` decorator preserves function signatures
- [ ] AbortSignal support for cancellation
- [ ] Default `retryOn` uses `isRetryable()` from error classes
- [ ] `onRetry` callback fires before each retry wait
- [ ] `sleep()` is cancellable via AbortSignal
- [ ] Return value includes `attempts` and `totalDelay` metrics
- [ ] 13+ test cases covering all paths
- [ ] No external dependencies (pure JS implementation)

# Build 03-13 — Timeout Management

> **Agent Role:** Implementer  
> **Depends on:** 03-01 (error classes — `NetworkError`)  
> **Creates:** `src/client/timeout.js`

---

## Task

Create a timeout management system with cancellable timeouts, named timeout tracking, and integration with `AbortController` for fetch cancellation.

---

## File: `src/client/timeout.js`

### `withTimeout(promise, ms, options)`

```javascript
import { NetworkError } from './errors.js';

/**
 * Race a promise against a timeout.
 *
 * @param {Promise<T>} promise - The promise to timeout-guard
 * @param {number} ms - Timeout in milliseconds
 * @param {Object} [options]
 * @param {string} [options.operation] - Operation name for error message
 * @param {AbortController} [options.controller] - AbortController to abort on timeout
 * @returns {Promise<T>}
 * @throws {NetworkError} NETWORK_TIMEOUT if the promise doesn't resolve in time
 *
 * @example
 * const profile = await withTimeout(
 *   scraper.scrapeProfile('testuser'),
 *   30000,
 *   { operation: 'scrapeProfile' }
 * );
 */
export async function withTimeout(promise, ms, options = {}) {
  const controller = options.controller || new AbortController();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new NetworkError(
        `Operation timed out after ${ms}ms${options.operation ? ` (${options.operation})` : ''}`,
        { code: 'NETWORK_TIMEOUT', context: { timeoutMs: ms, operation: options.operation } }
      ));
    }, ms);

    promise
      .then(result => { clearTimeout(timer); resolve(result); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}
```

### `TimeoutController`

```javascript
/**
 * Manages multiple named timeouts for complex multi-step operations.
 *
 * @example
 * const tc = new TimeoutController({
 *   request: 30000,
 *   pageLoad: 60000,
 *   scrapeOperation: 120000,
 *   upload: 300000,
 * });
 *
 * await tc.wrap('request', fetch(url));
 * await tc.wrap('pageLoad', page.goto(url));
 */
export class TimeoutController {
  constructor(timeouts = {}) {
    this._timeouts = {
      request: 30_000,
      pageLoad: 60_000,
      scrapeOperation: 120_000,
      upload: 300_000,
      ...timeouts,
    };
    this._active = new Map(); // name → AbortController
  }

  /** Wrap a promise with the named timeout */
  async wrap(name, promise) {
    const ms = this._timeouts[name];
    if (!ms) throw new Error(`Unknown timeout name: ${name}`);
    const controller = new AbortController();
    this._active.set(name, controller);
    try {
      return await withTimeout(promise, ms, { operation: name, controller });
    } finally {
      this._active.delete(name);
    }
  }

  /** Get the timeout value for a named operation */
  getTimeout(name) { return this._timeouts[name]; }

  /** Set a custom timeout for an operation */
  setTimeout(name, ms) { this._timeouts[name] = ms; }

  /** Cancel all active timeouts */
  cancelAll() {
    for (const [name, controller] of this._active) {
      controller.abort();
    }
    this._active.clear();
  }

  /** Get list of currently active (running) timeouts */
  getActive() {
    return Array.from(this._active.keys());
  }
}
```

### Default Timeout Constants

```javascript
export const DEFAULT_TIMEOUTS = Object.freeze({
  request: 30_000,        // Single HTTP request
  pageLoad: 60_000,       // Puppeteer page navigation
  scrapeOperation: 120_000, // Full scrape operation (may include pagination)
  upload: 300_000,        // Media upload (large files)
  login: 45_000,          // Authentication flow
  guestToken: 10_000,     // Guest token activation
  healthCheck: 5_000,     // Health check ping
});
```

---

## Acceptance Criteria

- [ ] `withTimeout()` races promise against timer
- [ ] Throws `NetworkError` with code `NETWORK_TIMEOUT`
- [ ] Integrates with `AbortController` for fetch cancellation
- [ ] `TimeoutController` manages named timeouts
- [ ] Default timeouts for all common operations
- [ ] `cancelAll()` aborts all active operations
- [ ] Clean error messages include operation name and timeout value

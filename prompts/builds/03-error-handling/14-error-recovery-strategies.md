# Build 03-14 — Error Recovery Strategies

> **Agent Role:** Implementer  
> **Depends on:** 03-01 (errors), 03-03 (retry), 03-04 (rate limit), 03-05 (circuit breaker), 03-10 (fallback)  
> **Creates:** `src/client/recovery.js`

---

## Task

Create composable error recovery strategies that automatically handle common failure modes: cookie refresh on auth errors, smart waiting on rate limits, exponential backoff on network errors, and adapter switching on scraper errors.

---

## File: `src/client/recovery.js`

### Base Class

```javascript
/**
 * @abstract
 */
export class RecoveryStrategy {
  constructor(name) { this.name = name; }

  /**
   * Attempt to recover from an error.
   * @param {Error} error - The error to recover from
   * @param {Object} context - Operation context (operation name, args, etc.)
   * @returns {Promise<{ recovered: boolean, action: string, delay?: number }>}
   */
  async recover(error, context) {
    throw new Error('RecoveryStrategy.recover() must be implemented');
  }

  /** Check if this strategy applies to the given error */
  canHandle(error) { return false; }
}
```

### Concrete Strategies

```javascript
/**
 * On AuthError(AUTH_EXPIRED): attempt to refresh cookies from stored credentials.
 */
export class AuthRecovery extends RecoveryStrategy {
  constructor(cookieStore) { /* cookieStore provides refreshCookies() */ }

  canHandle(error) { return isAuthError(error) && error.code === 'AUTH_EXPIRED'; }

  async recover(error, context) {
    // 1. Try to refresh cookies from cookie store
    // 2. If refresh succeeds: return { recovered: true, action: 'cookies_refreshed' }
    // 3. If refresh fails: return { recovered: false, action: 'refresh_failed' }
  }
}

/**
 * On RateLimitError: wait until rate limit resets, then retry.
 */
export class RateLimitRecovery extends RecoveryStrategy {
  constructor(rateLimitManager) { /* ... */ }

  canHandle(error) { return isRateLimited(error); }

  async recover(error, context) {
    const waitMs = error.getWaitTime();
    if (waitMs > 300_000) {
      return { recovered: false, action: 'wait_too_long', delay: waitMs };
    }
    await sleep(waitMs);
    return { recovered: true, action: 'waited_for_reset', delay: waitMs };
  }
}

/**
 * On NetworkError: exponential backoff retry.
 */
export class NetworkRecovery extends RecoveryStrategy {
  constructor(options = { maxRetries: 3, baseDelay: 2000 }) { /* ... */ }

  canHandle(error) { return isNetworkError(error); }

  async recover(error, context) {
    // Use retry engine with exponential backoff
    // Return recovered: true if request eventually succeeds
  }
}

/**
 * On ScraperError: switch to a different scraper adapter.
 * Puppeteer → Playwright → HTTP
 */
export class ScraperRecovery extends RecoveryStrategy {
  constructor(adapterRegistry) { /* ... */ }

  canHandle(error) { return error.code?.startsWith('SCRAPER_'); }

  async recover(error, context) {
    // Get current adapter, try next in priority list
    // Return recovered: true with new adapter name
  }
}
```

### `RecoveryChain`

```javascript
/**
 * Ordered list of recovery strategies. Attempts each in order until one recovers.
 *
 * @example
 * const chain = createDefaultRecoveryChain({ cookieStore, rateLimitManager });
 * try {
 *   result = await scraper.scrapeProfile(username);
 * } catch (error) {
 *   const recovery = await chain.attempt(error, { operation: 'scrapeProfile' });
 *   if (recovery.recovered) {
 *     result = await scraper.scrapeProfile(username); // retry after recovery
 *   }
 * }
 */
export class RecoveryChain {
  constructor(strategies = []) { this._strategies = strategies; }

  /** Attempt recovery using the first matching strategy */
  async attempt(error, context) {
    for (const strategy of this._strategies) {
      if (strategy.canHandle(error)) {
        const result = await strategy.recover(error, context);
        if (result.recovered) return { ...result, strategy: strategy.name };
      }
    }
    return { recovered: false, action: 'no_strategy_matched' };
  }

  /** Add a strategy to the chain */
  add(strategy) { this._strategies.push(strategy); return this; }
}
```

### `createDefaultRecoveryChain(deps)`

```javascript
/**
 * Pre-configured recovery chain for standard XActions operations.
 * Order: AuthRecovery → RateLimitRecovery → NetworkRecovery → ScraperRecovery
 */
export function createDefaultRecoveryChain({ cookieStore, rateLimitManager, adapterRegistry } = {}) {
  return new RecoveryChain([
    new AuthRecovery(cookieStore),
    new RateLimitRecovery(rateLimitManager),
    new NetworkRecovery(),
    new ScraperRecovery(adapterRegistry),
  ]);
}
```

---

## Acceptance Criteria

- [ ] `RecoveryStrategy` base class with `canHandle()` and `recover()` interface
- [ ] 4 concrete strategies: Auth, RateLimit, Network, Scraper
- [ ] `RecoveryChain` tries strategies in order until one succeeds
- [ ] `createDefaultRecoveryChain()` pre-configured for XActions
- [ ] AuthRecovery attempts cookie refresh
- [ ] RateLimitRecovery waits for reset (with max wait limit)
- [ ] NetworkRecovery uses exponential backoff
- [ ] ScraperRecovery switches adapter

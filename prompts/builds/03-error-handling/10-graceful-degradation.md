# Build 03-10 — Graceful Degradation

> **Agent Role:** Implementer  
> **Depends on:** 03-01 (error classes), 03-03 (retry engine)  
> **Creates:** `src/client/fallback.js`

---

## Task

Create a fallback and graceful degradation layer that allows operations to return partial results when some steps fail, and chains multiple strategies (HTTP → Puppeteer → cached) for maximum resilience.

---

## File: `src/client/fallback.js`

### `withFallback(primary, fallback, options)`

```javascript
/**
 * Try primary function, fall back to secondary on failure.
 *
 * @param {() => Promise<T>} primary - Primary async function
 * @param {() => Promise<T>} fallback - Fallback async function
 * @param {Object} [options]
 * @param {(error: Error) => boolean} [options.shouldFallback] - Predicate for when to fall back
 * @param {(error: Error) => void} [options.onFallback] - Callback when falling back
 * @returns {Promise<{ result: T, source: 'primary' | 'fallback', error?: Error }>}
 */
export async function withFallback(primary, fallback, options = {}) {
  try {
    return { result: await primary(), source: 'primary' };
  } catch (primaryError) {
    if (options.shouldFallback && !options.shouldFallback(primaryError)) {
      throw primaryError;
    }
    options.onFallback?.(primaryError);
    try {
      return { result: await fallback(), source: 'fallback', error: primaryError };
    } catch (fallbackError) {
      // Throw primary error with fallback error as context
      primaryError.context = { ...primaryError.context, fallbackError: fallbackError.message };
      throw primaryError;
    }
  }
}
```

### `FallbackChain`

```javascript
/**
 * Ordered list of strategies — try each in sequence until one succeeds.
 *
 * @example
 * const chain = new FallbackChain([
 *   { name: 'http', fn: () => httpScraper.scrapeProfile(username) },
 *   { name: 'puppeteer', fn: () => puppeteerScraper.scrapeProfile(page, username) },
 *   { name: 'cache', fn: () => cache.get(`profile:${username}`) },
 * ]);
 * const { result, source } = await chain.execute();
 */
export class FallbackChain {
  constructor(strategies) { /* ... */ }

  async execute() {
    // Try each strategy in order
    // Return { result, source: strategy.name, errors: [...failed] }
    // If all fail, throw AggregateError with all errors
  }

  /** Add a strategy to the chain */
  addStrategy(name, fn) { /* ... */ }
}
```

### `degradedResponse(partialData, errors)`

```javascript
/**
 * Create a response that includes partial data and error metadata.
 * Used when some parts of a multi-step operation succeed but others fail.
 *
 * @param {Object} partialData - Successfully scraped fields
 * @param {Error[]} errors - Errors from failed steps
 * @returns {{ data: Object, degraded: true, errors: Array, completeness: number }}
 *
 * @example
 * // Profile scrape: got username/bio but follower count timed out
 * return degradedResponse(
 *   { username: 'test', bio: 'Hello' },
 *   [new ScraperError('Follower count timeout', { code: 'SCRAPER_TIMEOUT' })]
 * );
 */
export function degradedResponse(partialData, errors) {
  const totalFields = Object.keys(partialData).length + errors.length;
  const completeness = Object.keys(partialData).length / totalFields;
  return {
    data: partialData,
    degraded: true,
    errors: errors.map(e => ({ code: e.code, message: e.message, field: e.context?.field })),
    completeness: Math.round(completeness * 100) / 100,
  };
}
```

### XActions-Specific Fallback Configurations

```javascript
/**
 * Pre-configured fallback chain for profile scraping:
 * HTTP API → Puppeteer → Guest token public scrape
 */
export function createProfileFallbackChain(username, { httpScraper, puppeteerPage, guestScraper } = {}) {
  const strategies = [];
  if (httpScraper) strategies.push({ name: 'http', fn: () => httpScraper.scrapeProfile(username) });
  if (puppeteerPage) strategies.push({ name: 'puppeteer', fn: () => puppeteerScraper.scrapeProfile(puppeteerPage, username) });
  if (guestScraper) strategies.push({ name: 'guest', fn: () => guestScraper.scrapeProfile(username) });
  return new FallbackChain(strategies);
}
```

---

## Acceptance Criteria

- [ ] `withFallback()` tries primary, then fallback on failure
- [ ] `FallbackChain` supports N strategies in priority order
- [ ] `degradedResponse()` returns partial data with completeness score
- [ ] Pre-configured chains for profile/tweet scraping
- [ ] All errors from failed strategies are captured and returned
- [ ] Predicate controls when to fall back vs rethrow

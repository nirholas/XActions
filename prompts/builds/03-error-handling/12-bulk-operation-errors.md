# Build 03-12 — Bulk Operation Error Handling

> **Creates:** `src/utils/bulkRunner.js`
> **Depends on:** Track 03 Builds 01, 02, 03 (errors, retry, rate limiter)

---

## Task

Build error handling for bulk operations (mass unfollow, bulk scrape, batch follow). Bulk ops must continue on individual failures, collect partial results, respect rate limits, and provide progress reporting.

---

## File: `src/utils/bulkRunner.js`

### Implementation

```javascript
import { RateLimitError, XActionsError } from './errors.js';
import { RateLimitManager } from './rateLimiter.js';
import { logger } from './errorLogger.js';

export class BulkRunner {
  #rateLimiter;
  #concurrency;
  #delayBetween;
  #onProgress;
  #onError;
  #abortController;

  constructor(options = {}) {
    this.#rateLimiter = options.rateLimiter || new RateLimitManager();
    this.#concurrency = options.concurrency ?? 1; // Serial by default for Twitter
    this.#delayBetween = options.delayBetween ?? 2000; // 2s between actions
    this.#onProgress = options.onProgress || (() => {});
    this.#onError = options.onError || (() => {});
    this.#abortController = new AbortController();
  }

  /**
   * Run a function for each item in the list.
   * Continues on failure, collects all results.
   */
  async run(items, fn, options = {}) {
    const results = {
      total: items.length,
      succeeded: [],
      failed: [],
      skipped: [],
      startedAt: new Date().toISOString(),
      completedAt: null,
      aborted: false,
    };

    const maxFailures = options.maxConsecutiveFailures ?? 5;
    let consecutiveFailures = 0;

    for (let i = 0; i < items.length; i++) {
      if (this.#abortController.signal.aborted) {
        results.skipped.push(...items.slice(i).map(item => ({
          item,
          reason: 'Operation aborted',
        })));
        results.aborted = true;
        break;
      }

      const item = items[i];

      try {
        // Proactive rate limit check
        await this.#rateLimiter.throttle(options.endpoint || 'default');

        const result = await fn(item, i);
        results.succeeded.push({ item, result });
        consecutiveFailures = 0;

        this.#onProgress({
          current: i + 1,
          total: items.length,
          succeeded: results.succeeded.length,
          failed: results.failed.length,
          item,
          status: 'success',
        });
      } catch (error) {
        consecutiveFailures++;

        const failureRecord = {
          item,
          error: error.message,
          errorType: error.constructor.name,
          index: i,
        };
        results.failed.push(failureRecord);

        this.#onError(error, item, i);
        logger.warn(error, { bulkOp: true, index: i, item });

        this.#onProgress({
          current: i + 1,
          total: items.length,
          succeeded: results.succeeded.length,
          failed: results.failed.length,
          item,
          status: 'failed',
          error: error.message,
        });

        // Handle rate limiting — wait and continue
        if (error instanceof RateLimitError) {
          const waitMs = error.retryAfterMs || 15 * 60 * 1000;
          console.log(`⏳ Rate limited. Waiting ${Math.ceil(waitMs / 1000)}s...`);
          await sleep(waitMs);
          consecutiveFailures = 0; // Rate limit wait counts as recovery
          i--; // Retry this item
          continue;
        }

        // Too many consecutive failures — abort
        if (consecutiveFailures >= maxFailures) {
          console.error(`🛑 ${maxFailures} consecutive failures. Aborting bulk operation.`);
          results.skipped.push(...items.slice(i + 1).map(item => ({
            item,
            reason: `Aborted after ${maxFailures} consecutive failures`,
          })));
          results.aborted = true;
          break;
        }
      }

      // Delay between actions
      if (i < items.length - 1) {
        const jitter = Math.random() * 1000;
        await sleep(this.#delayBetween + jitter);
      }
    }

    results.completedAt = new Date().toISOString();
    return results;
  }

  abort() {
    this.#abortController.abort();
  }
}

/**
 * Simplified bulk runner for common use cases.
 */
export async function bulkScrape(items, scrapeFn, options = {}) {
  const runner = new BulkRunner({
    delayBetween: options.delay ?? 2000,
    onProgress: options.onProgress,
    onError: options.onError,
  });

  return runner.run(items, scrapeFn, {
    endpoint: options.endpoint,
    maxConsecutiveFailures: options.maxConsecutiveFailures ?? 5,
  });
}

export async function bulkAction(items, actionFn, options = {}) {
  const runner = new BulkRunner({
    delayBetween: options.delay ?? 3000, // Slower for write operations
    onProgress: options.onProgress,
    onError: options.onError,
  });

  return runner.run(items, actionFn, {
    endpoint: options.endpoint,
    maxConsecutiveFailures: options.maxConsecutiveFailures ?? 3,
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Progress Reporter

```javascript
export class ProgressReporter {
  #startTime;
  #lastReport;

  constructor() {
    this.#startTime = Date.now();
    this.#lastReport = 0;
  }

  report(progress) {
    const now = Date.now();
    if (now - this.#lastReport < 1000) return; // Rate limit reporting to 1/sec
    this.#lastReport = now;

    const elapsed = (now - this.#startTime) / 1000;
    const rate = progress.current / elapsed;
    const eta = (progress.total - progress.current) / rate;

    const pct = Math.round((progress.current / progress.total) * 100);
    const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));

    console.log(
      `[${bar}] ${pct}% | ${progress.succeeded}✓ ${progress.failed}✗ | ` +
      `${progress.current}/${progress.total} | ETA: ${Math.ceil(eta)}s`
    );
  }
}
```

---

## Tests: `tests/errors/bulkRunner.test.js`

1. Test successful bulk run returns all items in succeeded
2. Test individual failures don't stop bulk operation
3. Test consecutive failure limit triggers abort
4. Test rate limit error pauses and retries
5. Test abort() stops operation mid-run
6. Test progress callback receives correct counts
7. Test error callback receives error and item
8. Test skipped items tracked when aborted
9. Test delay between operations is respected
10. Test bulkScrape convenience function works

---

## Acceptance Criteria
- [ ] Bulk operations continue on individual failures
- [ ] Results include succeeded, failed, and skipped arrays
- [ ] Rate limit errors trigger wait-and-retry
- [ ] Consecutive failure threshold aborts operation
- [ ] Manual abort support via AbortController
- [ ] Progress reporting with ETA
- [ ] All 10 tests pass

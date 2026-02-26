# Build 03-11 — Error Telemetry

> **Agent Role:** Implementer  
> **Depends on:** 03-01 (error classes), 03-05 (circuit breaker)  
> **Creates:** `src/client/error-telemetry.js`

---

## Task

Create a local-only error telemetry system that collects error statistics, retry success rates, endpoint failure patterns, and circuit breaker trips. No external services — all data stays local for diagnostics and dashboard display.

---

## File: `src/client/error-telemetry.js`

### `ErrorTelemetry` Singleton

```javascript
/**
 * Local error statistics collector.
 *
 * @example
 * import { telemetry } from '../client/error-telemetry.js';
 * telemetry.record('scrapeProfile', new RateLimitError(...));
 * telemetry.recordRetry('scrapeProfile', { attempts: 3, success: true });
 * console.log(telemetry.getReport());
 */
class ErrorTelemetry {
  constructor() {
    // Time-windowed buckets: 1min, 5min, 1hr
    // Per-error-code counters
    // Per-endpoint counters
    // Retry success/failure counters
  }

  /** Record an error occurrence */
  record(operation, error) {
    // Increment counters by error.code, operation, category
    // Store timestamp for time-window calculations
  }

  /** Record a retry attempt result */
  recordRetry(operation, { attempts, success, totalDelay }) {
    // Track retry success rate, average attempts, average delay
  }

  /** Record a circuit breaker state change */
  recordCircuitEvent(circuitName, event) {
    // Track trips, recoveries, rejections
  }

  /** Get full telemetry report */
  getReport() {
    return {
      errors: {
        total: /* ... */,
        byCode: /* { RATE_LIMITED: 12, AUTH_EXPIRED: 3, ... } */,
        byCategory: /* { 'rate-limit': 12, auth: 3, ... } */,
        byOperation: /* { scrapeProfile: 5, scrapeTweets: 8, ... } */,
      },
      retries: {
        total: /* ... */,
        successRate: /* 0.85 */,
        averageAttempts: /* 2.3 */,
        averageDelay: /* 4500 */,
      },
      circuits: {
        trips: /* ... */,
        recoveries: /* ... */,
        currentOpen: /* ['SearchTimeline'] */,
      },
      windows: {
        '1m': /* { errors: 2, retries: 1 } */,
        '5m': /* { errors: 8, retries: 5 } */,
        '1h': /* { errors: 45, retries: 30 } */,
      },
      uptime: /* ms since telemetry started */,
    };
  }

  /** Get health score for an endpoint (0-1) */
  getEndpointHealth(endpoint) {
    // success / (success + failure) over last 5 minutes
  }

  /** Reset all counters */
  reset() { /* ... */ }

  /** Export to JSON for dashboard/API consumption */
  toJSON() { return this.getReport(); }
}

export const telemetry = new ErrorTelemetry();
```

### Time-Window Implementation

```javascript
class TimeWindowCounter {
  constructor(windowMs) {
    // Ring buffer of timestamped events
    // Prune events older than windowMs on each access
  }

  increment(key) { /* ... */ }
  getCount(key) { /* ... */ }
  getCounts() { /* all key → count pairs */ }
}
```

---

## Integration Points

- `retry()` in `src/client/retry.js` → call `telemetry.recordRetry()` on completion
- `CircuitBreaker` in `src/client/circuit-breaker.js` → call `telemetry.recordCircuitEvent()` on state change
- `wrapScraperFunction` in `src/scrapers/twitter/error-wrapper.js` → call `telemetry.record()` on error
- API endpoint `GET /api/telemetry` → return `telemetry.getReport()`
- CLI `xactions status` → show error stats summary

---

## Acceptance Criteria

- [ ] Singleton instance exported as `telemetry`
- [ ] Per-error-code, per-operation, per-category counters
- [ ] Time-windowed stats (1min, 5min, 1hr)
- [ ] Retry success rate tracking
- [ ] Circuit breaker event tracking
- [ ] Endpoint health score (0-1)
- [ ] `getReport()` returns complete structured data
- [ ] No external dependencies or network calls
- [ ] Memory-bounded (prune old events)

# Build 03-04 — Rate Limit Manager

> **Agent Role:** Implementer  
> **Depends on:** 03-01 (error classes), 03-02 (error codes)  
> **Creates:** `src/client/rate-limit.js`, `tests/errors/rate-limit.test.js`

---

## Task

Create a per-endpoint rate limit tracker that parses Twitter's rate limit headers, enforces proactive throttling with a token bucket algorithm, and persists state across sessions.

---

## File: `src/client/rate-limit.js`

### `RateLimitManager` Class

```javascript
/**
 * Tracks and enforces Twitter API rate limits per endpoint.
 *
 * Twitter rate limit headers:
 *   x-rate-limit-limit: 15         (max requests in window)
 *   x-rate-limit-remaining: 12     (remaining in window)
 *   x-rate-limit-reset: 1700000000 (UTC epoch when window resets)
 *
 * @example
 * const limiter = new RateLimitManager();
 * await limiter.waitIfNeeded('/graphql/UserByScreenName');
 * const response = await fetch(url);
 * limiter.recordResponse('/graphql/UserByScreenName', response);
 */
export class RateLimitManager {
  constructor(options = {}) {
    // options.defaultLimits — per-endpoint defaults as { endpoint: { limit, windowMs } }
    // options.persistPath — file path for saving state (optional)
    // options.onRateLimited — callback when a limit is hit
    // Internal: Map<endpoint, { limit, remaining, resetAt, lastRequest }>
  }
```

### Methods

1. **`recordResponse(endpoint, response)`** — Extract `x-rate-limit-*` headers from fetch Response, update internal state
2. **`checkLimit(endpoint)`** — Returns `{ allowed: boolean, waitMs: number, resetAt: Date, remaining: number, limit: number }`
3. **`waitIfNeeded(endpoint)`** — If `!allowed`, sleep until reset. Returns `{ waited: boolean, waitedMs: number }`
4. **`getState()`** — Return full state map for all tracked endpoints
5. **`getEndpointState(endpoint)`** — Return state for one endpoint
6. **`reset(endpoint)`** — Clear state for an endpoint (or all if no arg)
7. **`save()`** — Persist state to `options.persistPath` as JSON
8. **`load()`** — Load state from `options.persistPath`

### Default Rate Limits

```javascript
const DEFAULT_LIMITS = Object.freeze({
  // Read endpoints — 15 requests per 15 minutes
  '/graphql/UserByScreenName': { limit: 15, windowMs: 900_000 },
  '/graphql/UserTweets': { limit: 15, windowMs: 900_000 },
  '/graphql/Followers': { limit: 15, windowMs: 900_000 },
  '/graphql/Following': { limit: 15, windowMs: 900_000 },
  '/graphql/SearchTimeline': { limit: 15, windowMs: 900_000 },
  '/graphql/TweetDetail': { limit: 15, windowMs: 900_000 },
  '/graphql/Likes': { limit: 15, windowMs: 900_000 },

  // Write endpoints — stricter limits
  '/graphql/CreateTweet': { limit: 50, windowMs: 86_400_000 },
  '/graphql/FavoriteTweet': { limit: 50, windowMs: 86_400_000 },
  '/graphql/CreateRetweet': { limit: 50, windowMs: 86_400_000 },

  // Guest/public — more generous
  '/1.1/guest/activate.json': { limit: 100, windowMs: 900_000 },
});
```

### Token Bucket (Proactive Throttling)

```javascript
class TokenBucket {
  constructor(capacity, refillRate, refillIntervalMs) {
    // capacity: max tokens
    // refillRate: tokens added per interval
    // refillIntervalMs: interval between refills
  }

  tryConsume(tokens = 1) {
    // Refill based on elapsed time, then consume
    // Returns: { consumed: boolean, waitMs: number }
  }
}
```

Integrate `TokenBucket` into `RateLimitManager` — each endpoint gets a bucket initialized from `DEFAULT_LIMITS` or response headers.

---

## File: `tests/errors/rate-limit.test.js`

### Test Suites

1. **Parse rate limit headers** — Mock Response with `x-rate-limit-*` headers, verify state update
2. **Proactive blocking** — When `remaining` is 0, `checkLimit()` returns `allowed: false`
3. **Wait calculation** — `resetAt` in future → correct `waitMs`
4. **Token bucket refill** — After `windowMs`, tokens are restored
5. **Unknown endpoint** — Defaults to conservative limit
6. **State persistence** — `save()` writes JSON, `load()` restores state
7. **Callback fires** — `onRateLimited` called when limit hit
8. **Multiple endpoints** — Independent tracking per endpoint
9. **Stale state cleanup** — Past `resetAt` → state is cleared
10. **waitIfNeeded() sleeps correctly** — Mock timer, verify sleep duration

---

## Acceptance Criteria

- [ ] Parses all three `x-rate-limit-*` headers from fetch Response
- [ ] Token bucket proactive throttling per endpoint
- [ ] Default limits for all known Twitter endpoints
- [ ] `waitIfNeeded()` automatically sleeps until reset
- [ ] State persists to disk (optional, for cross-session continuity)
- [ ] Callback hook when rate limit is hit
- [ ] No external dependencies
- [ ] 10+ test cases

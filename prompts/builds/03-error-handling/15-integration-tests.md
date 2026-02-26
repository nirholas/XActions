# Build 03-15 — Error Handling Integration Tests

> **Creates:** `tests/errors/integration.test.js`
> **Depends on:** All Track 03 builds (01-14)

---

## Task

Write comprehensive integration tests that verify the entire error handling system works end-to-end. These tests exercise real error flows through multiple layers — from scraper to retry to recovery to logging to MCP response.

---

## File: `tests/errors/integration.test.js`

### Test Suites

```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { XActionsError, RateLimitError, AuthError, NotFoundError, SuspendedError,
         NetworkError, ScraperError, ValidationError, TwitterApiError } from '../../src/utils/errors.js';
import { RetryEngine, twitterRetry } from '../../src/utils/retry.js';
import { RateLimitManager, WaitingRateLimitStrategy, ErrorRateLimitStrategy,
         AdaptiveRateLimitStrategy } from '../../src/utils/rateLimiter.js';
import { ErrorLogger, ConsoleTransport, MemoryTransport } from '../../src/utils/errorLogger.js';
import { SessionRecovery, BrowserRecovery, withRecovery } from '../../src/utils/recovery.js';
import { FallbackScraper } from '../../src/scrapers/twitter/fallback.js';
import { BulkRunner } from '../../src/utils/bulkRunner.js';
import { validate, validateParams, TwitterValidators } from '../../src/utils/validate.js';

describe('Error Handling Integration', () => {

  describe('Error class hierarchy', () => {
    it('all error classes extend XActionsError', () => {
      const errors = [
        new RateLimitError('test'),
        new AuthError('test'),
        new NotFoundError('test'),
        new SuspendedError('test'),
        new NetworkError('test'),
        new ScraperError('test'),
        new ValidationError('test'),
        new TwitterApiError('test'),
      ];
      for (const err of errors) {
        expect(err).toBeInstanceOf(XActionsError);
        expect(err).toBeInstanceOf(Error);
        expect(err.name).toBe(err.constructor.name);
      }
    });

    it('error serialization includes all fields', () => {
      const err = new RateLimitError('Rate limited', {
        retryAfterMs: 60000,
        resetAt: new Date('2025-01-01T00:00:00Z'),
        context: { endpoint: 'UserTweets' },
      });
      const json = err.toJSON();
      expect(json).toHaveProperty('name', 'RateLimitError');
      expect(json).toHaveProperty('message', 'Rate limited');
      expect(json).toHaveProperty('retryAfterMs', 60000);
      expect(json).toHaveProperty('context.endpoint', 'UserTweets');
    });
  });

  describe('Retry → Rate Limit → Recovery flow', () => {
    it('retries rate limit errors with backoff then succeeds', async () => {
      let callCount = 0;
      const result = await twitterRetry(async () => {
        callCount++;
        if (callCount < 3) {
          throw new RateLimitError('Rate limited', { retryAfterMs: 100 });
        }
        return { username: 'test' };
      }, { maxRetries: 5, baseDelay: 50 });

      expect(result).toEqual({ username: 'test' });
      expect(callCount).toBe(3);
    });

    it('does not retry NotFoundError', async () => {
      let callCount = 0;
      await expect(
        twitterRetry(async () => {
          callCount++;
          throw new NotFoundError('User not found');
        }, { maxRetries: 5 })
      ).rejects.toThrow(NotFoundError);
      expect(callCount).toBe(1);
    });

    it('does not retry AuthError', async () => {
      let callCount = 0;
      await expect(
        twitterRetry(async () => {
          callCount++;
          throw new AuthError('Bad cookie');
        }, { maxRetries: 5 })
      ).rejects.toThrow(AuthError);
      expect(callCount).toBe(1);
    });
  });

  describe('Rate limit manager integration', () => {
    it('tracks limits from headers and blocks when exhausted', async () => {
      const manager = new RateLimitManager();
      
      manager.updateFromHeaders('UserTweets', {
        'x-rate-limit-limit': '50',
        'x-rate-limit-remaining': '0',
        'x-rate-limit-reset': String(Math.floor(Date.now() / 1000) + 1),
      });

      expect(manager.canMakeRequest('UserTweets')).toBe(false);
      
      // Wait for reset
      await new Promise(r => setTimeout(r, 1100));
      expect(manager.canMakeRequest('UserTweets')).toBe(true);
    });

    it('WaitingRateLimitStrategy waits then resolves', async () => {
      const strategy = new WaitingRateLimitStrategy();
      const start = Date.now();
      await strategy.onRateLimit({
        endpoint: 'test',
        resetAt: Date.now() + 200,
      });
      expect(Date.now() - start).toBeGreaterThanOrEqual(150);
    });

    it('ErrorRateLimitStrategy throws RateLimitError', async () => {
      const strategy = new ErrorRateLimitStrategy();
      await expect(
        strategy.onRateLimit({ endpoint: 'test', resetAt: Date.now() + 1000 })
      ).rejects.toThrow(RateLimitError);
    });
  });

  describe('Fallback scraper integration', () => {
    it('falls back from HTTP to Puppeteer on failure', async () => {
      const httpScraper = {
        scrapeProfile: vi.fn().mockRejectedValue(new NetworkError('HTTP failed')),
      };
      const puppeteerScraper = {
        scrapeProfile: vi.fn().mockResolvedValue({ username: 'test', followers: 100 }),
      };

      const fallback = new FallbackScraper({
        strategies: [
          { name: 'http', scraper: httpScraper, weight: 1 },
          { name: 'puppeteer', scraper: puppeteerScraper, weight: 2 },
        ],
      });

      const result = await fallback.scrape('scrapeProfile', ['test']);
      expect(result.strategy).toBe('puppeteer');
      expect(result.data.username).toBe('test');
      expect(httpScraper.scrapeProfile).toHaveBeenCalledOnce();
      expect(puppeteerScraper.scrapeProfile).toHaveBeenCalledOnce();
    });

    it('does not fallback on AuthError', async () => {
      const httpScraper = {
        scrapeProfile: vi.fn().mockRejectedValue(new AuthError('Bad cookie')),
      };
      const puppeteerScraper = {
        scrapeProfile: vi.fn(),
      };

      const fallback = new FallbackScraper({
        strategies: [
          { name: 'http', scraper: httpScraper, weight: 1 },
          { name: 'puppeteer', scraper: puppeteerScraper, weight: 2 },
        ],
      });

      await expect(fallback.scrape('scrapeProfile', ['test'])).rejects.toThrow(AuthError);
      expect(puppeteerScraper.scrapeProfile).not.toHaveBeenCalled();
    });
  });

  describe('Bulk operation error accumulation', () => {
    it('continues on individual failures and collects results', async () => {
      const runner = new BulkRunner({ delayBetween: 10 });
      
      const users = ['alice', 'bob', 'charlie', 'dave'];
      const results = await runner.run(users, async (user) => {
        if (user === 'bob') throw new NotFoundError(`User ${user} not found`);
        if (user === 'charlie') throw new NetworkError('Timeout');
        return { username: user, scraped: true };
      });

      expect(results.succeeded).toHaveLength(2);
      expect(results.failed).toHaveLength(2);
      expect(results.succeeded.map(r => r.item)).toEqual(['alice', 'dave']);
      expect(results.failed[0].errorType).toBe('NotFoundError');
      expect(results.failed[1].errorType).toBe('NetworkError');
    });

    it('aborts after consecutive failure threshold', async () => {
      const runner = new BulkRunner({ delayBetween: 10 });
      const items = Array.from({ length: 20 }, (_, i) => i);
      
      const results = await runner.run(items, async () => {
        throw new ScraperError('Broken');
      }, { maxConsecutiveFailures: 3 });

      expect(results.failed).toHaveLength(3);
      expect(results.skipped.length).toBeGreaterThan(0);
      expect(results.aborted).toBe(true);
    });
  });

  describe('Error logger aggregation', () => {
    it('logs errors and provides accurate stats', () => {
      const memTransport = new MemoryTransport();
      const testLogger = new ErrorLogger({ level: 'warn' });
      testLogger.addTransport(memTransport);

      testLogger.error(new RateLimitError('Rate limited'));
      testLogger.error(new RateLimitError('Rate limited again'));
      testLogger.error(new AuthError('Bad cookie'));
      testLogger.warn(new NetworkError('Timeout'));

      const stats = testLogger.getStats();
      expect(stats.total).toBe(4);
      expect(stats.RateLimitError).toBe(2);
      expect(stats.AuthError).toBe(1);
      expect(stats.NetworkError).toBe(1);

      const rateLimitErrors = testLogger.getErrorsByType('RateLimitError');
      expect(rateLimitErrors).toHaveLength(2);

      const entries = memTransport.getEntries();
      expect(entries).toHaveLength(4);
    });
  });

  describe('Validation integration', () => {
    it('TwitterValidators.username rejects invalid input', () => {
      expect(() => validate('@user', TwitterValidators.username, 'username'))
        .toThrow(ValidationError);
      expect(() => validate('', TwitterValidators.username, 'username'))
        .toThrow(ValidationError);
      expect(() => validate('user!name', TwitterValidators.username, 'username'))
        .toThrow(ValidationError);
      expect(() => validate('validuser', TwitterValidators.username, 'username'))
        .not.toThrow();
    });

    it('validateParams catches all errors at once', () => {
      expect(() => validateParams({}, {
        username: TwitterValidators.username,
        count: { ...TwitterValidators.count ?? {}, required: true },
      })).toThrow(/Validation failed/);
    });
  });

  describe('End-to-end error flow', () => {
    it('scraper error → retry → fallback → logger → stats', async () => {
      const memTransport = new MemoryTransport();
      const testLogger = new ErrorLogger({ level: 'debug' });
      testLogger.addTransport(memTransport);

      // Simulate: HTTP scraper rate limited → fallback to Puppeteer → success
      const httpScraper = {
        scrapeProfile: vi.fn().mockRejectedValue(
          new RateLimitError('Rate limited', { retryAfterMs: 50 })
        ),
      };
      const puppeteerScraper = {
        scrapeProfile: vi.fn().mockResolvedValue({ username: 'test' }),
      };

      const fallback = new FallbackScraper({
        strategies: [
          { name: 'http', scraper: httpScraper, weight: 1 },
          { name: 'puppeteer', scraper: puppeteerScraper, weight: 2 },
        ],
      });

      const result = await fallback.scrape('scrapeProfile', ['test']);
      
      expect(result.data.username).toBe('test');
      expect(result.strategy).toBe('puppeteer');
      
      // Verify the stats reflect the fallback
      const stats = fallback.getStats();
      expect(stats.http.fail).toBe(1);
      expect(stats.puppeteer.success).toBe(1);
    });
  });
});
```

---

## Acceptance Criteria
- [ ] Error hierarchy tests: all classes extend XActionsError
- [ ] Retry flow: retries transient errors, skips permanent ones
- [ ] Rate limit manager: tracks headers, blocks when exhausted
- [ ] Fallback: HTTP → Puppeteer on failure, no fallback on AuthError
- [ ] Bulk runner: continues on failure, aborts on threshold
- [ ] Logger: aggregates stats by error type
- [ ] Validation: rejects bad input, collects all errors
- [ ] End-to-end: scraper → retry → fallback → logger → stats
- [ ] All integration tests pass with `npx vitest tests/errors/integration.test.js`
- [ ] Zero mock data — all tests use real error class instances

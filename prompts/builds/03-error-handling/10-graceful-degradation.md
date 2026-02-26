# Build 03-10 — Graceful Degradation (HTTP → Puppeteer Fallback)

> **Creates:** `src/scrapers/twitter/fallback.js`
> **Depends on:** Track 01 (HTTP scraper), Track 03 Builds 01-09

---

## Task

Build a fallback system that tries fast HTTP scraping first, then falls back to Puppeteer when HTTP fails (rate limited, requires auth, TLS blocked). This is a core architectural piece tying together Track 01 and Track 03.

---

## File: `src/scrapers/twitter/fallback.js`

### Implementation

```javascript
import { httpScraper } from './http.js';
import * as puppeteerScraper from './index.js';
import { RateLimitError, AuthError, NetworkError, ScraperError } from '../../utils/errors.js';
import { logger } from '../../utils/errorLogger.js';

export class FallbackScraper {
  #strategies;
  #stats = { http: { success: 0, fail: 0 }, puppeteer: { success: 0, fail: 0 } };

  constructor(options = {}) {
    this.#strategies = options.strategies ?? [
      { name: 'http', scraper: httpScraper, weight: 1 },
      { name: 'puppeteer', scraper: puppeteerScraper, weight: 2 },
    ];
  }

  async scrape(method, args, options = {}) {
    const errors = [];
    
    for (const strategy of this.#strategies) {
      const fn = strategy.scraper[method];
      if (!fn) continue;

      try {
        const start = Date.now();
        const result = await fn(...args);
        const duration = Date.now() - start;
        
        this.#stats[strategy.name].success++;
        logger.log('debug', new Error(`${strategy.name}.${method} succeeded in ${duration}ms`), {
          strategy: strategy.name, method, duration,
        });
        
        return { data: result, strategy: strategy.name, duration };
      } catch (error) {
        this.#stats[strategy.name].fail++;
        errors.push({ strategy: strategy.name, error });
        
        logger.warn(error, {
          strategy: strategy.name,
          method,
          willFallback: strategy !== this.#strategies[this.#strategies.length - 1],
        });

        // Don't fallback for non-retryable errors
        if (error instanceof AuthError && !options.forceFallback) {
          throw error; // Auth errors affect all strategies
        }
        
        // Continue to next strategy
        continue;
      }
    }

    // All strategies failed
    const lastError = errors[errors.length - 1]?.error;
    throw new ScraperError(
      `All scraping strategies failed for ${method}: ${errors.map(e => `${e.strategy}: ${e.error.message}`).join('; ')}`,
      {
        cause: lastError,
        context: { method, strategies: errors.map(e => e.strategy), args: args.slice(0, 2) },
      }
    );
  }

  // Convenience methods
  async scrapeProfile(username, options = {}) {
    return this.scrape('scrapeProfile', [username], options);
  }

  async scrapeFollowers(username, options = {}) {
    return this.scrape('scrapeFollowers', [username, options], options);
  }

  async scrapeFollowing(username, options = {}) {
    return this.scrape('scrapeFollowing', [username, options], options);
  }

  async scrapeTweets(username, options = {}) {
    return this.scrape('scrapeTweets', [username, options], options);
  }

  async searchTweets(query, options = {}) {
    return this.scrape('searchTweets', [query, options], options);
  }

  async scrapeThread(tweetId, options = {}) {
    return this.scrape('scrapeThread', [tweetId], options);
  }

  async scrapeLikes(username, options = {}) {
    return this.scrape('scrapeLikes', [username, options], options);
  }

  async scrapeHashtag(hashtag, options = {}) {
    return this.scrape('scrapeHashtag', [hashtag, options], options);
  }

  async scrapeMedia(username, options = {}) {
    return this.scrape('scrapeMedia', [username, options], options);
  }

  async scrapeTrending(options = {}) {
    return this.scrape('scrapeTrending', [options], options);
  }

  getStats() {
    return { ...this.#stats };
  }

  getPreferredStrategy(method) {
    // Analyze stats to pick the best strategy for a given method
    const sorted = Object.entries(this.#stats)
      .map(([name, s]) => ({
        name,
        successRate: s.success / (s.success + s.fail || 1),
        total: s.success + s.fail,
      }))
      .sort((a, b) => b.successRate - a.successRate);
    return sorted[0]?.name || 'http';
  }
}

// Default instance
export const scraper = new FallbackScraper();
```

### Smart strategy selection

```javascript
export class SmartFallbackScraper extends FallbackScraper {
  #methodStats = new Map(); // method -> { http: { success, fail, avgMs }, puppeteer: ... }

  async scrape(method, args, options = {}) {
    // If we have enough data, pick the fastest reliable strategy first
    const methodStat = this.#methodStats.get(method);
    if (methodStat && this.#hasEnoughData(methodStat)) {
      const best = this.#pickBest(methodStat);
      // Reorder strategies to try best first
      // ... implementation
    }

    return super.scrape(method, args, options);
  }

  #hasEnoughData(stat) {
    return Object.values(stat).some(s => (s.success + s.fail) >= 5);
  }

  #pickBest(stat) {
    let best = null;
    let bestScore = -1;
    for (const [name, s] of Object.entries(stat)) {
      const total = s.success + s.fail;
      if (total < 3) continue;
      const reliability = s.success / total;
      const speed = 1 / (s.avgMs || 1000);
      const score = reliability * 0.7 + speed * 0.3;
      if (score > bestScore) {
        bestScore = score;
        best = name;
      }
    }
    return best;
  }
}
```

---

## Tests: `tests/errors/fallback-scraper.test.js`

1. Test HTTP success returns data with `strategy: 'http'`
2. Test HTTP failure falls back to Puppeteer
3. Test AuthError is NOT retried with fallback (throws immediately)
4. Test all strategies fail → aggregated ScraperError
5. Test stats track success/fail per strategy
6. Test SmartFallbackScraper picks fastest reliable strategy
7. Test getPreferredStrategy returns based on success rate
8. Test convenience methods (scrapeProfile, etc.) work

---

## Acceptance Criteria
- [ ] FallbackScraper tries HTTP first, then Puppeteer
- [ ] Non-retryable errors (AuthError) skip fallback
- [ ] All strategy errors aggregated in final error
- [ ] Stats tracking per strategy per method
- [ ] SmartFallbackScraper learns from history
- [ ] Convenience wrappers for all scraper methods
- [ ] All 8 tests pass

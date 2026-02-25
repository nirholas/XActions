# Scraping Infrastructure

> Enterprise-grade scraping toolkit: proxy rotation, stealth browser, pagination engine, retry policies, and dataset storage — replaces Phantombuster, Apify, and similar SaaS tools.

## Overview

The scraping infrastructure (`src/scraping/`) provides three production-grade modules that work together to make scraping reliable at scale:

- **ProxyManager** — Proxy rotation with health tracking and auto-blacklisting
- **StealthBrowser** — Anti-detection Puppeteer wrapper with fingerprint randomization
- **PaginationEngine** — Smart scroll-based pagination with deduplication, checkpointing, and retry

These modules power all XActions scrapers internally and are also available as standalone imports.

---

## Architecture

```
src/scraping/
├── proxyManager.js       → Proxy rotation, health tracking, auto-blacklist
├── stealthBrowser.js     → Anti-detection Puppeteer with fingerprint randomization
└── paginationEngine.js   → Pagination, deduplication, checkpoints, retry, datasets
```

Data directories:
- `~/.xactions/datasets/` — Stored scraping datasets
- `~/.xactions/scrape-checkpoints/` — Pagination checkpoints for resume

---

## Quick Start

```javascript
import { ProxyManager } from 'xactions/src/scraping/proxyManager.js';
import { launchStealthBrowser, createStealthPage } from 'xactions/src/scraping/stealthBrowser.js';
import { PaginationEngine, RetryPolicy } from 'xactions/src/scraping/paginationEngine.js';

// 1. Set up proxies (optional)
const proxies = new ProxyManager(['http://proxy1:8080', 'http://proxy2:8080']);
await proxies.testAll();

// 2. Launch stealth browser
const proxy = proxies.getNext();
const browser = await launchStealthBrowser({ proxy, headless: true });
const page = await createStealthPage(browser, { proxy });

// 3. Scrape with pagination
const engine = new PaginationEngine({
  maxPages: 50,
  maxItems: 1000,
  scrollDelay: 1500,
  retries: 3,
  deduplicateBy: 'id',
  onProgress: (stats) => console.log(`${stats.total} items...`),
});

const result = await engine.scrapeWithPagination(page, async (page) => {
  return page.evaluate(() => {
    return [...document.querySelectorAll('[data-testid="tweet"]')].map(el => ({
      id: el.querySelector('a[href*="/status/"]')?.href,
      text: el.querySelector('[data-testid="tweetText"]')?.textContent,
    }));
  });
});

console.log(`Scraped ${result.items.length} items in ${result.stats.duration}ms`);
await browser.close();
```

---

## Proxy Manager

### Creating

```javascript
import { ProxyManager } from 'xactions/src/scraping/proxyManager.js';

// From array
const pm = new ProxyManager([
  'http://user:pass@proxy1.example.com:8080',
  'socks5://proxy2.example.com:1080',
  '192.168.1.100:3128',
]);

// From file (one proxy per line)
const pm2 = new ProxyManager();
await pm2.loadFromFile('/path/to/proxies.txt');

// From environment variables
const pm3 = new ProxyManager();
pm3.loadFromEnv();
// Reads: XACTIONS_PROXIES (comma-separated) and XACTIONS_PROXY_FILE
```

### Rotation Strategies

```javascript
// Round-robin (deterministic)
const proxy = pm.getNext();

// Random selection
const proxy = pm.getRandom();
```

### Health Tracking

The proxy manager automatically tracks success/failure rates:

```javascript
// Mark results after each request
pm.markSuccess(proxy.url, responseTimeMs);
pm.markFailed(proxy.url);

// 3 consecutive failures → 10 minute blacklist (automatic)
// Blacklisted proxies are excluded from getNext()/getRandom()

// Get health stats
const stats = pm.getStats();
// [{ url, successes, failures, avgResponseTime, blacklisted }]

// Get only healthy proxies
const healthy = pm.getHealthy();
```

### Testing

```javascript
const results = await pm.testAll();
// Tests all proxies concurrently against httpbin.org
// Returns: [{ proxy, status: 'ok'|'failed', time }]
```

### Supported Formats

| Format | Example |
|--------|---------|
| HTTP | `http://proxy:8080` |
| HTTP with auth | `http://user:pass@proxy:8080` |
| SOCKS5 | `socks5://proxy:1080` |
| SOCKS4 | `socks4://proxy:1080` |
| host:port | `192.168.1.1:3128` |
| user:pass@host:port | `admin:secret@proxy:8080` |

---

## Stealth Browser

Anti-detection Puppeteer wrapper that evades bot detection.

### Features

- **puppeteer-extra-plugin-stealth** integration (with graceful fallback)
- 20 rotating user-agent strings (Chrome, Firefox, Safari, Windows, Mac, Linux)
- Random viewport dimensions (1280-1920 × 720-1080)
- WebDriver flag override (`navigator.webdriver = false`)
- Language, plugins, platform spoofing
- Proxy authentication support
- No-sandbox mode for Docker/CI

### Launch Browser

```javascript
import { launchStealthBrowser, createStealthPage } from 'xactions/src/scraping/stealthBrowser.js';

const browser = await launchStealthBrowser({
  proxy: 'http://proxy:8080',   // Optional
  headless: true,               // Default: true
  userDataDir: '/tmp/chrome1',  // Optional: persistent profile
  viewport: { width: 1920, height: 1080 }, // Optional: custom size
  userAgent: 'Mozilla/5.0...',  // Optional: override UA
});

const page = await createStealthPage(browser, {
  proxy: { url: 'http://proxy:8080', username: 'user', password: 'pass' },
  userAgent: 'Custom UA', // Optional override
});
```

### Anti-Detection Patches

Applied automatically on every page:

| Patch | What it does |
|-------|-------------|
| `navigator.webdriver` | Returns `false` instead of `true` |
| `navigator.languages` | Returns `['en-US', 'en']` |
| `navigator.plugins` | Returns fake plugin list |
| `navigator.platform` | Matches user-agent OS |
| User-Agent | Random selection from 20 real browser UAs |
| Viewport | Random dimensions within realistic range |

---

## Pagination Engine

Handles infinite-scroll pages with deduplication, error recovery, and checkpointing.

### Basic Usage

```javascript
import { PaginationEngine } from 'xactions/src/scraping/paginationEngine.js';

const engine = new PaginationEngine({
  maxPages: 100,        // Max scroll iterations
  maxItems: 5000,       // Stop after this many items
  pageTimeout: 30000,   // 30s timeout per scroll
  scrollDelay: 1500,    // Delay between scrolls (ms)
  retries: 3,           // Retries on error
  deduplicateBy: 'id',  // Deduplicate items by this field
  onProgress: (stats) => console.log(stats),
});

const { items, stats } = await engine.scrapeWithPagination(page, extractFn);
```

### Deduplication

```javascript
// By field name
new PaginationEngine({ deduplicateBy: 'url' });

// By custom function
new PaginationEngine({
  deduplicateBy: (item) => `${item.username}:${item.tweetId}`,
});
```

### Checkpointing

Save progress and resume later:

```javascript
// Save checkpoint mid-scrape
const checkpointPath = await engine.saveCheckpoint('my-scrape-001');
// Saved to ~/.xactions/scrape-checkpoints/my-scrape-001.json

// Resume from checkpoint
const engine2 = new PaginationEngine({ maxItems: 5000 });
await engine2.resume(checkpointPath);
const { items } = await engine2.scrapeWithPagination(page, extractFn);
```

### Error Recovery

The engine automatically handles:
- **Stuck detection** — Stops after 3 consecutive empty scrolls
- **Error page detection** — Pauses 60s on "Rate limit" or "Something went wrong"
- **Scroll errors** — Retries with 5s delay

### Stats

```javascript
const { items, stats } = await engine.scrapeWithPagination(page, extractFn);

console.log(stats);
// {
//   total: 2500,
//   duplicatesRemoved: 340,
//   pagesScrolled: 85,
//   errorsRecovered: 2,
//   duration: 128000
// }
```

---

## Retry Policy

Standalone retry utility with exponential backoff.

```javascript
import { RetryPolicy } from 'xactions/src/scraping/paginationEngine.js';

const retry = new RetryPolicy({
  maxRetries: 3,
  baseDelay: 2000,       // Initial delay: 2s
  maxDelay: 60000,       // Cap at 60s
  backoffMultiplier: 2,  // Double each time: 2s → 4s → 8s
  retryOn: ['timeout', 'network-error', 'rate-limit', 'empty-result'],
});

const result = await retry.execute(async () => {
  const response = await fetch('https://api.example.com/data');
  if (!response.ok) throw new Error('Request failed');
  return response.json();
});
```

### Error Classification

| Error Type | Triggered By | Retried? |
|-----------|-------------|----------|
| `timeout` | AbortError, TimeoutError | ✅ |
| `network-error` | ECONNREFUSED, ENOTFOUND, fetch failures | ✅ |
| `rate-limit` | 429 status, "Rate limit" in message | ✅ |
| `empty-result` | Custom "empty" errors | ✅ |
| Other | Unrecognized errors | ❌ (thrown immediately) |

---

## Dataset Storage

The PaginationEngine stores results in `~/.xactions/datasets/` as JSON files, compatible with the Apify dataset format.

### CLI

```bash
# List datasets
xactions dataset list

# Export a dataset
xactions dataset export my-scrape --format json --output data.json
xactions dataset export my-scrape --format csv --output data.csv

# Delete
xactions dataset delete my-scrape
```

### API

```http
GET    /api/datasets/                    # List
GET    /api/datasets/:name               # Get items
GET    /api/datasets/:name/export?format=json
DELETE /api/datasets/:name
```

---

## Scraper Adapters

XActions includes adapter wrappers for multiple scraping backends (`src/scrapers/adapters/`):

| Adapter | Uses | Best For |
|---------|------|----------|
| `puppeteer` | Puppeteer + stealth | Default — full JavaScript rendering |
| `playwright` | Playwright | Alternative to Puppeteer |
| `cheerio` | cheerio | Static HTML (fastest) |
| `got-jsdom` | got + jsdom | Lightweight JS rendering |
| `crawlee` | Crawlee framework | Large-scale crawling |
| `selenium` | selenium-webdriver | Legacy compatibility |

All adapters implement the same `BaseScraper` interface:

```javascript
import { createScraper } from 'xactions/src/scrapers/adapters/index.js';

const scraper = createScraper('puppeteer'); // or 'playwright', 'cheerio', etc.
await scraper.init();
const data = await scraper.scrape(url, options);
await scraper.close();
```

---

## Cross-Platform Scrapers

XActions scrapers support multiple social platforms:

| Platform | Module | Features |
|----------|--------|----------|
| Twitter/X | `src/scrapers/twitter/` | Profiles, followers, tweets, search, media |
| Bluesky | `src/scrapers/bluesky/` | Profiles, followers, posts |
| Mastodon | `src/scrapers/mastodon/` | Profiles, followers, toots (any instance) |
| Threads | `src/scrapers/threads/` | Profiles, followers, posts |

```javascript
import scrapers from 'xactions/scrapers';

// Twitter (default)
const profile = await scrapers.scrapeProfile(page, 'nichxbt');

// Bluesky
import bluesky from 'xactions/scrapers/bluesky';
const bskyProfile = await bluesky.getProfile('nichxbt.bsky.social');

// Mastodon
import mastodon from 'xactions/scrapers/mastodon';
const mastoProfile = await mastodon.getProfile('user', 'https://mastodon.social');
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `XACTIONS_PROXIES` | Comma-separated proxy list |
| `XACTIONS_PROXY_FILE` | Path to proxy list file |
| `XACTIONS_SESSION_COOKIE` | Default X/Twitter auth token |
| `PUPPETEER_EXECUTABLE_PATH` | Custom Chrome path |

---

## Tips

- **Start without proxies** — Most use cases don't need them for moderate volumes
- **Use checkpointing** for large scrapes (>1000 items) — resume if interrupted
- **Set `deduplicateBy`** to avoid counting the same item twice during scrolling
- **Monitor `stats.errorsRecovered`** — high values indicate rate limiting
- **Rotate user data dirs** for multi-account scraping to maintain separate cookies
- **Use the stealth browser** even without proxies — the anti-detection patches alone reduce block rates significantly

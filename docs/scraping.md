# Scraping Infrastructure

Low-level scraping modules for anti-detection browsing, smart pagination with resume, and proxy rotation. These power all XActions scrapers and automation behind the scenes.

## Architecture

```
src/scraping/
├── stealthBrowser.js     # Anti-detection Puppeteer with fingerprint randomization
├── paginationEngine.js   # Smart scroll-and-extract with checkpoints
└── proxyManager.js       # Proxy rotation with health tracking
```

## Stealth Browser

Anti-detection Puppeteer wrapper. Tries `puppeteer-extra` + stealth plugin first, falls back to vanilla Puppeteer.

```javascript
import { launchStealthBrowser } from 'xactions/src/scraping/stealthBrowser.js';

const browser = await launchStealthBrowser({
  proxy: 'http://user:pass@proxy.example.com:8080',
  headless: true,
  userDataDir: '/tmp/xactions-browser',
  viewport: { width: 1920, height: 1080 },
  userAgent: 'custom-ua-string'  // or omit for random selection
});
```

### Anti-Detection Features

- Randomized user-agent from a pool of 20 realistic strings (Chrome, Firefox, Safari on Win/Mac/Linux)
- Fingerprint randomization (canvas, WebGL, audio context)
- Stealth plugin patches (navigator.webdriver, chrome.runtime, etc.)
- Randomized viewport within realistic ranges
- Configurable proxy support

## Pagination Engine

Smart scroll-and-extract loop with deduplication, retries, checkpoint/resume, and progress tracking.

```javascript
import { PaginationEngine } from 'xactions/src/scraping/paginationEngine.js';

const engine = new PaginationEngine({
  maxPages: 50,
  maxItems: 1000,
  pageTimeout: 30000,    // 30s per page
  scrollDelay: 1500,     // 1.5s between scrolls
  retries: 3,
  deduplicateBy: 'id',   // Field to deduplicate on
  onProgress: (stats) => console.log(`${stats.total} items scraped`)
});

const results = await engine.scrapeWithPagination(page, extractFn, {
  checkpointFile: '/tmp/checkpoint.json'  // Resume from last position
});
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `maxPages` | `100` | Maximum scroll pages |
| `maxItems` | `Infinity` | Stop after N items collected |
| `pageTimeout` | `30000` | Timeout per scroll page (ms) |
| `scrollDelay` | `1000` | Delay between scroll actions (ms) |
| `retries` | `3` | Retry failed pages |
| `deduplicateBy` | — | Field name for dedup (e.g., 'id', 'username') |
| `checkpointFile` | — | File path for checkpoint/resume |

### Stats

After scraping, `engine.stats` contains:

```javascript
{
  total: 847,
  duplicatesRemoved: 23,
  pagesScrolled: 42,
  errorsRecovered: 2,
  duration: 63000
}
```

### Checkpoint / Resume

If a `checkpointFile` is provided, the engine saves progress periodically. If the scrape is interrupted, re-running with the same checkpoint file resumes from the last saved position.

## Proxy Manager

Proxy rotation with health tracking, auto-blacklisting of failing proxies, and load balancing.

```javascript
import { ProxyManager } from 'xactions/src/scraping/proxyManager.js';

const manager = new ProxyManager();

// Load proxies from different sources
manager.loadFromEnv();  // XACTIONS_PROXIES or XACTIONS_PROXY_FILE
// or
await manager.loadFromFile('/path/to/proxies.txt');
// or
manager.addProxy('http://user:pass@proxy1.example.com:8080');

// Get a healthy proxy (auto-rotating)
const proxy = manager.getProxy();

// Report success/failure (updates health tracking)
manager.reportSuccess(proxy);
manager.reportFailure(proxy);

// Get pool status
const stats = manager.getStats();
```

### Proxy Format

One proxy per line in text files:

```
http://user:pass@proxy1.example.com:8080
socks5://user:pass@proxy2.example.com:1080
http://proxy3.example.com:3128
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `XACTIONS_PROXIES` | Comma-separated proxy URLs |
| `XACTIONS_PROXY_FILE` | Path to a proxy list file |

### Health Tracking

Each proxy tracks:

| Metric | Description |
|--------|-------------|
| `successes` | Total successful requests |
| `failures` | Total failed requests |
| `consecutiveFailures` | Current failure streak |
| `blacklistedUntil` | Timestamp when proxy re-enters rotation |
| `totalTime` | Cumulative request time |
| `requests` | Total request count |

Proxies with too many consecutive failures are automatically blacklisted for a cooldown period.

## Usage with Other Modules

These modules are used internally by all XActions scrapers:

```javascript
// src/scrapers/ uses stealthBrowser + paginationEngine
// src/streaming/ uses browserPool (which wraps stealthBrowser)
// src/mcp/local-tools.js uses stealthBrowser for MCP operations
```

You typically don't need to use these directly unless building custom scrapers.

# Scraper Framework Adapters

XActions scrapers support multiple scraping frameworks via a pluggable adapter system.

## Available Adapters

| Adapter | Package | JS Execution | Browser Required | Best For |
|---------|---------|:---:|:---:|----------|
| **Puppeteer** (default) | `puppeteer-extra` | ✅ | ✅ | Anti-detection, stealth scraping on x.com |
| **Playwright** | `playwright` | ✅ | ✅ | Multi-browser, CI/CD, auto-wait, tracing |
| **Crawlee** | `crawlee` | ✅ | ✅ | Production-scale crawling, proxy rotation, auto-retry |
| **Got-Scraping + JSDOM** | `got-scraping` + `jsdom` | ✅* | ❌ | TLS fingerprint bypass, DOM API without a browser |
| **Selenium** | `selenium-webdriver` | ✅ | ✅ | Enterprise environments, cross-language, Selenium Grid |
| **Cheerio** | `cheerio` | ❌ | ❌ | Lightweight parsing, APIs, static pages |

\* *JSDOM supports basic inline JS — not full browser rendering*

## Quick Start

### Default (Puppeteer) — no changes needed

```js
import { createBrowser, createPage, scrapeProfile } from 'xactions/scrapers';

const browser = await createBrowser();
const page = await createPage(browser);
const profile = await scrapeProfile(page, 'nichxbt');
await browser.close();
```

All existing code works exactly as before. Puppeteer is the default.

### Using Playwright

```bash
npm install playwright
npx playwright install chromium
```

```js
import { createBrowser, createPage, scrapeProfile } from 'xactions/scrapers';

const browser = await createBrowser({ adapter: 'playwright' });
const page = await createPage(browser);
const profile = await scrapeProfile(page, 'nichxbt');
// page is an adapter page — scraper functions that use page.evaluate() work automatically
```

Playwright benefits:
- Multi-browser: pass `{ adapter: 'playwright', browser: 'firefox' }` or `'webkit'`
- Auto-wait: Playwright waits for elements automatically
- Tracing: record full traces for debugging
- Better CI support: works reliably in Docker/GitHub Actions

### Using Cheerio (HTTP-only)

```bash
npm install cheerio
```

```js
import { getAdapter } from 'xactions/scrapers';

const adapter = await getAdapter('cheerio');
const browser = await adapter.launch();
const page = await adapter.newPage(browser);
await adapter.goto(page, 'https://example.com');

// Query elements in a Cheerio-like way
const titles = await adapter.queryAll(page, 'h1', (els, $) =>
  els.map((i, el) => $(el).text()).get()
);

// Fetch JSON APIs directly
const data = await adapter.fetchJSON('https://api.example.com/data');
```

> **Note:** Cheerio cannot execute JavaScript. Most x.com pages require JS rendering,
> so Cheerio is best for pre-rendered content, RSS feeds, APIs, or pages you've cached.

### Using Crawlee (Production Crawling)

```bash
npm install crawlee puppeteer  # or: npm install crawlee playwright
```

```js
import { getAdapter } from 'xactions/scrapers';

// Simple adapter usage (like other adapters)
const adapter = await getAdapter('crawlee');
const browser = await adapter.launch({ browserPlugin: 'puppeteer' });
const page = await adapter.newPage(browser);
await adapter.goto(page, 'https://x.com/nichxbt');
const html = await adapter.getContent(page);
await adapter.closeBrowser(browser);

// Crawlee-native mode: use the full crawling framework
// with auto-retry, proxy rotation, request queuing
const crawler = await adapter.createCrawler({
  maxRequestsPerCrawl: 50,
  maxConcurrency: 3,
  proxyUrls: ['http://proxy1:8080', 'http://proxy2:8080'],
  requestHandler: async ({ page, request }) => {
    const title = await page.title();
    console.log(`[${request.url}] ${title}`);
  },
});
await crawler.run(['https://x.com/user1', 'https://x.com/user2']);
```

Crawlee benefits:
- Auto-retry with exponential backoff on failures
- Proxy rotation across a pool of proxies
- Session management: rotate identities automatically
- Request queue: crawl thousands of URLs reliably
- Uses Puppeteer or Playwright under the hood

### Using Got-Scraping + JSDOM (TLS Fingerprinting)

```bash
npm install got-scraping jsdom
```

```js
import { getAdapter } from 'xactions/scrapers';

const adapter = await getAdapter('got-jsdom');
const browser = await adapter.launch({
  fingerprint: 'chrome',     // Mimic Chrome's TLS fingerprint
  runScripts: false,          // Set to 'dangerously' for JS execution
});
const page = await adapter.newPage(browser);
await adapter.goto(page, 'https://example.com');

// Full DOM API — querySelector, textContent, etc.
const titles = await adapter.queryAll(page, 'h1',
  (elements) => elements.map(el => el.textContent)
);

// Evaluate JS against the JSDOM window
const count = await adapter.evaluate(page,
  () => document.querySelectorAll('a').length
);

// Raw HTTP with browser TLS fingerprints (bypass bot detection)
const data = await adapter.fetchJSON('https://api.example.com/data');

// Switch fingerprint mid-session
adapter.setFingerprint(browser, 'firefox');
```

Got-JSDOM benefits:
- Browser-like TLS/HTTP2 fingerprints without launching a browser
- Much lighter than Puppeteer/Playwright (~50MB vs ~300MB+)
- JSDOM provides full DOM API (querySelector, innerHTML, etc.)
- Optional inline JS execution
- Perfect for APIs that inspect TLS handshake signatures

### Using Selenium

```bash
npm install selenium-webdriver chromedriver
# For Firefox: npm install selenium-webdriver geckodriver
```

```js
import { getAdapter } from 'xactions/scrapers';

const adapter = await getAdapter('selenium');
const browser = await adapter.launch({
  browser: 'chrome',          // 'chrome', 'firefox', 'edge', 'safari'
  headless: true,
  // seleniumServer: 'http://grid:4444/wd/hub',  // Remote Selenium Grid
});
const page = await adapter.newPage(browser);
await adapter.goto(page, 'https://x.com/nichxbt');

// Works like other adapters
const title = await adapter.evaluate(page, () => document.title);
await adapter.screenshot(page, { path: 'screenshot.png' });

// Selenium-specific: open multiple tabs
const tab2 = await adapter.newTab(browser);
await adapter.goto(tab2, 'https://x.com/another_user');

// Selenium-specific: async script execution
const result = await adapter.executeAsyncScript(page, `
  const callback = arguments[arguments.length - 1];
  setTimeout(() => callback(document.title), 1000);
`);

await adapter.closeBrowser(browser);
```

Selenium benefits:
- Works with Selenium Grid for distributed scraping
- Cross-browser: Chrome, Firefox, Edge, Safari
- Enterprise-standard: familiar to QA/testing teams
- Cross-language ecosystem (same Grid, different clients)

## Global Configuration

### Environment Variable

```bash
export XACTIONS_SCRAPER_ADAPTER=playwright
```

### Programmatic

```js
import { setDefaultAdapter } from 'xactions/scrapers';

setDefaultAdapter('playwright');

// Now all createBrowser() calls without explicit adapter use Playwright
const browser = await createBrowser();
```

## Adapter API

All adapters implement the same interface:

```js
const adapter = await getAdapter('playwright');

// Lifecycle
const browser = await adapter.launch({ headless: true });
const page = await adapter.newPage(browser);
await adapter.goto(page, url, { waitUntil: 'networkidle' });
await adapter.closePage(page);
await adapter.closeBrowser(browser);

// Page operations
await adapter.evaluate(page, () => document.title);      // Browser adapters only
await adapter.queryAll(page, 'a', mapFn);                // All adapters
await adapter.getContent(page);                           // Get HTML
await adapter.setCookie(page, { name, value, domain });
await adapter.scroll(page);
await adapter.screenshot(page, { path: 'shot.png' });
await adapter.waitForSelector(page, '[data-testid="tweet"]');
```

## Checking Availability

```js
import { checkAvailability, getAdapterInfo } from 'xactions/scrapers';

// Quick check
const status = await checkAvailability();
// { puppeteer: { available: true }, playwright: { available: false, message: '...' }, ... }

// Detailed info
const info = await getAdapterInfo();
// [{ name: 'puppeteer', description: '...', supportsJavaScript: true, available: true }, ...]
```

## Auto-Fallback

```js
import { getAvailableAdapter } from 'xactions/scrapers';

// Tries: preferred → default → puppeteer → playwright → crawlee → got-jsdom → selenium → cheerio
const adapter = await getAvailableAdapter('playwright');
```

## Custom Adapters

Create your own adapter by extending `BaseAdapter`:

```js
import { BaseAdapter, registerAdapter } from 'xactions/scrapers';

class MyCustomAdapter extends BaseAdapter {
  name = 'my-custom';
  description = 'My custom scraping adapter';
  supportsJavaScript = true;
  requiresBrowser = false;

  async checkDependencies() {
    try {
      await import('my-scraping-lib');
      return { available: true };
    } catch {
      return { available: false, message: 'npm install my-scraping-lib' };
    }
  }

  async launch(options = {}) { /* ... */ }
  async newPage(browser) { /* ... */ }
  async goto(page, url, options) { /* ... */ }
  async evaluate(page, fn, ...args) { /* ... */ }
  async queryAll(page, selector, mapFn) { /* ... */ }
  async closePage(page) { /* ... */ }
  async closeBrowser(browser) { /* ... */ }
  // ... implement all methods from BaseAdapter
}

registerAdapter('my-custom', MyCustomAdapter);
```

## Adapter Comparison

### Puppeteer (Default)

- ✅ Best anti-detection with stealth plugin
- ✅ Mature ecosystem, most XActions code tested with it
- ✅ Already installed as a dependency
- ❌ Chromium only
- ❌ Heavier than HTTP-based scraping

### Playwright

- ✅ Multi-browser (Chromium, Firefox, WebKit)
- ✅ Built-in auto-wait, less flaky tests
- ✅ Trace recording for debugging
- ✅ Resource blocking for faster scraping
- ✅ Better CI/Docker support
- ❌ No stealth plugin (though you can configure it manually)
- ❌ Separate install: `npx playwright install`

### Crawlee (Apify)

- ✅ Best-in-class crawling framework
- ✅ Auto-retry with backoff on errors
- ✅ Proxy rotation built in
- ✅ Session management (rotate identities)
- ✅ Request queuing for large crawl jobs
- ✅ Uses Puppeteer or Playwright under the hood
- ❌ Heavier dependency
- ❌ Learning curve if you want native Crawlee features

### Got-Scraping + JSDOM

- ✅ Browser TLS fingerprints without a browser
- ✅ Bypasses TLS-based bot detection
- ✅ Full DOM API (querySelector, etc.) via JSDOM
- ✅ Much lighter than browser-based adapters
- ✅ Optional inline JS execution
- ❌ JSDOM JS execution is limited (no canvas, webgl, etc.)
- ❌ Cannot render complex SPAs

### Selenium

- ✅ Enterprise standard, industry-proven
- ✅ Selenium Grid for distributed/remote scraping
- ✅ Cross-browser: Chrome, Firefox, Edge, Safari
- ✅ Cross-language: same Grid works with Python/Java/C# clients
- ❌ Slower than Puppeteer/Playwright
- ❌ No stealth/anti-detection built in
- ❌ More setup required (drivers)

### Cheerio/HTTP

- ✅ Extremely fast (no browser)
- ✅ Minimal memory usage
- ✅ Works everywhere, no binary dependencies
- ✅ Great for APIs, RSS, static HTML
- ❌ No JavaScript execution
- ❌ Cannot scrape JS-rendered pages (most of x.com)

## Choosing an Adapter

```
Do you need to scrape x.com (JavaScript-heavy)?
├── Yes → Do you need proxy rotation or large-scale crawling?
│   ├── Yes → Use Crawlee
│   └── No → Do you need multi-browser support?
│       ├── Yes → Use Playwright
│       └── No → Use Puppeteer (default, best anti-detection)
└── No → Does the target check TLS fingerprints?
    ├── Yes → Use Got-Scraping + JSDOM
    └── No → Is it a JSON API or static HTML?
        ├── Yes → Use Cheerio (fastest)
        └── No → Use Got-Scraping + JSDOM

Using Selenium Grid or enterprise infra? → Use Selenium
```

## Aliases

| Alias | Resolves To |
|-------|-------------|
| `pptr` | Puppeteer |
| `pw` | Playwright |
| `http` | Cheerio |
| `got` | Got-JSDOM |
| `jsdom` | Got-JSDOM |
| `apify` | Crawlee |

## File Structure

```
src/scrapers/
├── adapters/
│   ├── index.js          # Adapter registry & factory
│   ├── base.js           # Abstract base adapter interface
│   ├── puppeteer.js      # Puppeteer + stealth
│   ├── playwright.js     # Playwright (Chromium/Firefox/WebKit)
│   ├── crawlee.js        # Crawlee (Apify) smart crawling
│   ├── got-jsdom.js      # Got-Scraping + JSDOM
│   ├── selenium.js       # Selenium WebDriver
│   └── cheerio.js        # HTTP/Cheerio (lightweight)
├── index.js              # Main scraper module (backward compatible)
├── bookmarkExporter.js
├── threadUnroller.js
├── videoDownloader.js
└── viralTweets.js
```

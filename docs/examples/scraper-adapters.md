# Scraper Framework Adapters

XActions scrapers support multiple scraping frameworks via a pluggable adapter system.

## Available Adapters

| Adapter | Package | JS Execution | Browser Required | Best For |
|---------|---------|:---:|:---:|----------|
| **Puppeteer** (default) | `puppeteer-extra` | ✅ | ✅ | Anti-detection, stealth scraping on x.com |
| **Playwright** | `playwright` | ✅ | ✅ | Multi-browser, CI/CD, auto-wait, tracing |
| **Cheerio** | `cheerio` | ❌ | ❌ | Lightweight parsing, APIs, static pages |

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

// Tries: preferred → default → puppeteer → playwright → cheerio
const adapter = await getAvailableAdapter('playwright');
```

## Custom Adapters

Create your own adapter by extending `BaseAdapter`:

```js
import { BaseAdapter, registerAdapter } from 'xactions/scrapers';

class SeleniumAdapter extends BaseAdapter {
  name = 'selenium';
  description = 'Selenium WebDriver adapter';
  supportsJavaScript = true;
  requiresBrowser = true;

  async checkDependencies() {
    try {
      await import('selenium-webdriver');
      return { available: true };
    } catch {
      return { available: false, message: 'npm install selenium-webdriver' };
    }
  }

  async launch(options = {}) { /* ... */ }
  async newPage(browser) { /* ... */ }
  async goto(page, url, options) { /* ... */ }
  async evaluate(page, fn, ...args) { /* ... */ }
  // ... implement all methods from BaseAdapter
}

registerAdapter('selenium', SeleniumAdapter);
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

### Cheerio/HTTP

- ✅ Extremely fast (no browser)
- ✅ Minimal memory usage
- ✅ Works everywhere, no binary dependencies
- ✅ Great for APIs, RSS, static HTML
- ❌ No JavaScript execution
- ❌ Cannot scrape JS-rendered pages (most of x.com)

## File Structure

```
src/scrapers/
├── adapters/
│   ├── index.js          # Adapter registry & factory
│   ├── base.js           # Abstract base adapter interface
│   ├── puppeteer.js      # Puppeteer adapter
│   ├── playwright.js     # Playwright adapter
│   └── cheerio.js        # HTTP/Cheerio adapter
├── index.js              # Main scraper module (backward compatible)
├── bookmarkExporter.js
├── threadUnroller.js
├── videoDownloader.js
└── viralTweets.js
```

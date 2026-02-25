# 🕵️ Stealth Scraping & Proxy Rotation

> Anti-detection browser automation with proxy rotation and fingerprint randomization. Competes with **Apify** anti-bot evasion.

---

## Overview

XActions includes a stealth scraping layer that wraps Puppeteer with:

- **Proxy rotation** — round-robin, random selection, health tracking, auto-blacklisting
- **Stealth browser** — puppeteer-extra with stealth plugin + custom fingerprint patches
- **20 real user agents** — rotated per session
- **Human-like interaction** — randomized mouse movement, typing delays
- **WebDriver detection bypass** — navigator flags, plugins, WebGL, permissions

Available via: **Node.js library**.

---

## Quick Start

### Proxy Manager

```javascript
import ProxyManager from 'xactions/src/scraping/proxyManager.js';

const pm = new ProxyManager([
  'http://user:pass@proxy1.example.com:8080',
  'http://user:pass@proxy2.example.com:8080',
  'socks5://proxy3.example.com:1080'
]);

// Or load from file / environment
await pm.loadFromFile('./proxies.txt');
pm.loadFromEnv(); // reads XACTIONS_PROXIES or XACTIONS_PROXY_FILE

// Get next proxy (round-robin)
const proxy = pm.getNext();
// { url: 'http://...', host: 'proxy1.example.com', port: 8080, protocol: 'http', auth: { username: 'user', password: 'pass' } }

// Health tracking
pm.markSuccess(proxy, 250); // 250ms response time
pm.markFailed(proxy);       // 3 consecutive failures → 10min blacklist

// Test all proxies
const results = await pm.testAll();
// [{ proxy: '...', status: 'ok', time: 250 }, { proxy: '...', status: 'failed' }]
```

### Stealth Browser

```javascript
import {
  launchStealthBrowser,
  createStealthPage,
  stealthClick,
  stealthType
} from 'xactions/src/scraping/stealthBrowser.js';

// Launch with proxy
const browser = await launchStealthBrowser({
  proxy: 'http://user:pass@proxy.example.com:8080',
  headless: true
});

// Create a stealth-patched page
const page = await createStealthPage(browser, {
  proxy: 'http://user:pass@proxy.example.com:8080'
});

// Navigate normally
await page.goto('https://x.com');

// Human-like interactions
await stealthClick(page, '[data-testid="loginButton"]');
await stealthType(page, 'input[name="text"]', 'myusername');

await browser.close();
```

### Combined Usage

```javascript
import ProxyManager from 'xactions/src/scraping/proxyManager.js';
import { launchStealthBrowser, createStealthPage } from 'xactions/src/scraping/stealthBrowser.js';

const pm = new ProxyManager();
await pm.loadFromFile('./proxies.txt');

const proxy = pm.getNext();
const browser = await launchStealthBrowser({ proxy: proxy.url });
const page = await createStealthPage(browser, { proxy: proxy.url });

try {
  await page.goto('https://x.com/elonmusk');
  pm.markSuccess(proxy, Date.now() - start);
} catch (err) {
  pm.markFailed(proxy);
  // Retry with next proxy...
}
```

---

## Architecture

```
src/scraping/
├── proxyManager.js    → Proxy pool + health monitoring
├── stealthBrowser.js  → Anti-detection Puppeteer wrapper
└── paginationEngine.js → (see Pagination Engine docs)
```

---

## Proxy Manager Reference

### `new ProxyManager(proxies?)`

| Param | Type | Description |
|---|---|---|
| `proxies` | `Array<string \| object>` | Initial proxy list (URLs or `{ url, host, port, auth }` objects) |

### Methods

| Method | Description |
|---|---|
| `loadFromFile(path)` | Load proxies from text file (one per line) |
| `loadFromEnv()` | Load from `XACTIONS_PROXIES` (comma-separated) or `XACTIONS_PROXY_FILE` |
| `getNext()` | Round-robin selection (skips blacklisted) |
| `getRandom()` | Random selection from healthy proxies |
| `markFailed(proxy)` | Record failure — 3 consecutive → 10min blacklist |
| `markSuccess(proxy, responseTime?)` | Record success, reset failure counter |
| `getHealthy()` | Get all non-blacklisted proxies |
| `getStats()` | Per-proxy stats: successes, failures, avg response time |
| `testAll()` | Concurrently test all proxies against httpbin.org |

### Environment Variables

| Variable | Description |
|---|---|
| `XACTIONS_PROXIES` | Comma-separated proxy URLs |
| `XACTIONS_PROXY_FILE` | Path to proxy file |

---

## Stealth Browser Reference

### `launchStealthBrowser(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `proxy` | `string` | — | Proxy URL |
| `headless` | `boolean` | `true` | Run headless |
| `userDataDir` | `string` | — | Persistent browser profile |
| `viewport` | `object` | — | Custom viewport `{ width, height }` |
| `userAgent` | `string` | random | Override user agent |

Uses `puppeteer-extra` with `puppeteer-extra-plugin-stealth` if available, falls back to standard Puppeteer.

### `createStealthPage(browser, options)`

Creates a page with anti-detection patches:

- `navigator.webdriver` → `false`
- `navigator.plugins` → realistic plugin array
- `navigator.platform` → randomized
- `WebGLRenderingContext` → spoofed vendor/renderer
- `navigator.permissions.query` → no `denied`
- Random user agent from pool of 20

### `stealthClick(page, selector)`

Human-like click: moves mouse in a curve to element, then clicks with random delay.

### `stealthType(page, selector, text)`

Human-like typing: random inter-key delay (50–150ms), occasional pauses.

---

## User Agent Pool

20 realistic user agents covering:
- Chrome 120–123 (Windows, Mac, Linux)
- Firefox 121–123 (Windows, Mac)
- Safari 17 (Mac)
- Edge 120 (Windows)

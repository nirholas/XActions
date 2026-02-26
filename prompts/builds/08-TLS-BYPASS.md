# Track 08 — Cloudflare TLS Bypass

> Twitter uses Cloudflare TLS fingerprinting to detect and block automated requests. Standard Node.js `fetch` and `axios` have inconsistent TLS fingerprints that trigger 403 Forbidden responses. This track integrates optional TLS fingerprint spoofing via CycleTLS or custom TLS client configuration, matching what `the-convocation/twitter-scraper` (Go — native TLS control) achieves naturally. This is critical for production reliability.

---

## Research Before Starting

```
src/client/http/HttpClient.js        — HTTP client (Track 03) — TLS plugs in here
src/client/http/RateLimiter.js        — Rate limiter (Track 03) — works alongside TLS
src/client/auth/TokenManager.js       — Auth headers (Track 02)
src/client/Scraper.js                 — Main class, constructor accepts options
src/scrapers/twitter/index.js         — Puppeteer scrapers (bypass TLS via real browser)
package.json                          — Current dependencies
```

Study:
- `the-convocation/twitter-scraper` — Go, uses `utls` library for TLS fingerprint
- `CycleTLS` — npm package that proxies requests through a Go binary with Chrome TLS fingerprint
- `tls-client` — npm package (Python port concept) for custom TLS
- Cloudflare TLS fingerprinting — JA3/JA4 hash detection
- `undici` — Node.js built-in HTTP client, limited TLS control

### Why TLS Matters

Twitter/Cloudflare uses JA3 fingerprinting:
1. Standard Node.js (OpenSSL) has a distinct TLS fingerprint
2. This fingerprint doesn't match any real browser
3. Cloudflare flags non-browser TLS fingerprints → 403 Forbidden
4. Go scrapers bypass this because Go's TLS stack can spoof Chrome's JA3
5. Puppeteer bypasses this because it's a real browser

Solutions (in priority order):
1. **CycleTLS** — Go binary that proxies requests with Chrome TLS, available as npm package
2. **Custom cipher suite ordering** — Reorder Node.js TLS ciphers to approximate Chrome
3. **undici with custom TLS** — Node.js undici client with modified connect options
4. **Proxy rotation** — Use residential/datacenter proxies that have clean TLS fingerprints

---

## Architecture

```
src/client/http/
  TlsClient.js         ← Main TLS client abstraction
  CycleTlsAdapter.js   ← CycleTLS integration (optional dep)
  UndiciAdapter.js      ← undici with custom TLS config
  NativeTlsConfig.js   ← Node.js native TLS cipher reordering
  FingerprintManager.js ← JA3 fingerprint generation and rotation
  index.js              ← Smart auto-selection of best available TLS strategy
```

The TLS layer is **optional** — if CycleTLS isn't installed, the system falls back to native fetch with optimized cipher suites. This avoids adding a heavy Go binary as a required dependency.

---

## Prompts

### Prompt 1: TLS Client Abstraction

```
Create src/client/http/TlsClient.js.

This is the abstract interface for TLS-aware HTTP clients. Different implementations (CycleTLS, undici, native) implement this interface.

Export class TlsClient:

Properties:
- _strategy: 'cycletls' | 'undici' | 'native' | 'none'
- _client: the underlying HTTP client instance
- _fingerprint: JA3 fingerprint string or profile name
- _initialized: boolean

Constructor(options = {}):
- options.strategy: preferred TLS strategy (auto-detect by default)
- options.fingerprint: 'chrome' | 'firefox' | 'safari' | custom JA3 string
- options.proxy: proxy URL
- options.timeout: request timeout (default: 30000ms)

Methods:

1. async initialize() → void
   - Auto-detect best available TLS strategy:
     a. Try importing 'cycletls' → use CycleTLS
     b. Try importing 'undici' → use undici with custom TLS
     c. Fall back to native fetch with cipher reordering
   - Initialize the underlying client

2. async request(url, options = {}) → { status, headers, body, ok }
   - Unified request method that delegates to the active strategy
   - options.method, options.headers, options.body
   - Returns normalized response regardless of backend
   - All strategies return the same response shape

3. async close() → void
   - Clean up resources (CycleTLS needs explicit close)

4. getStrategy() → string
   - Return the active TLS strategy name

5. getFingerprint() → string
   - Return the current JA3 fingerprint

6. isAvailable() → boolean
   - Return true if TLS client is initialized

7. setProxy(proxyUrl) → void
   - Update proxy for subsequent requests

Static:
8. static async detectBestStrategy() → string
   - Check which TLS libraries are available
   - Return 'cycletls' > 'undici' > 'native'

ESM export. @author nich (@nichxbt). @license MIT.
All methods fully implemented.
```

### Prompt 2: CycleTLS Adapter

```
Create src/client/http/CycleTlsAdapter.js.

CycleTLS is a Go-based TLS client that runs as a sidecar process and proxies HTTP requests with a spoofed Chrome TLS fingerprint. This adapter wraps it for the XActions HTTP layer.

Import: CycleTLS is an optional dependency — the import must be dynamic and wrapped in try/catch.

Export class CycleTlsAdapter:

Properties:
- _cycleTls: CycleTLS instance
- _ja3: string — JA3 fingerprint to use
- _userAgent: string — matching user agent
- _proxy: string|null

Constructor(options = {}):
- options.ja3: custom JA3 string (default: Chrome 120 JA3)
- options.userAgent: matching user agent string
- options.proxy: proxy URL

Built-in JA3 fingerprints:
- CHROME_120: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513,29-23-24,0'
- CHROME_124: (updated fingerprint)
- FIREFOX_121: (Firefox fingerprint)
- SAFARI_17: (Safari fingerprint)

Matching user agents per fingerprint:
- CHROME_120_UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

Methods:

1. async initialize() → void
   - Dynamically import 'cycletls': const { default: initCycleTLS } = await import('cycletls')
   - Create CycleTLS instance: this._cycleTls = await initCycleTLS()
   - If import fails, throw error with install instructions

2. async request(url, options = {}) → response
   - Call this._cycleTls(url, {
       body: options.body,
       headers: { ...options.headers, 'User-Agent': this._userAgent },
       ja3: this._ja3,
       userAgent: this._userAgent,
       proxy: this._proxy || undefined,
       timeout: options.timeout || 30,
       disableRedirect: options.disableRedirect || false,
     }, options.method || 'GET')
   - CycleTLS returns: { status, body, headers }
   - Normalize: parse body as JSON if content-type is application/json
   - Return { status, headers, body, ok: status >= 200 && status < 300 }

3. async close() → void
   - Call this._cycleTls.exit()
   - Set this._cycleTls = null

4. static isAvailable() → boolean
   - Try require.resolve('cycletls') or dynamic import check
   - Return true if CycleTLS is installed

Include usage comment:
// To enable CycleTLS: npm install cycletls
// This adds a ~50MB Go binary — only install if you need TLS bypass
```

### Prompt 3: Undici TLS Adapter

```
Create src/client/http/UndiciAdapter.js.

Node.js's undici HTTP client allows some customization of TLS settings. While it can't fully spoof JA3 fingerprints (OpenSSL limitations), it can optimize cipher suite ordering to appear less obviously automated.

Export class UndiciAdapter:

Properties:
- _client: undici Client or Pool
- _ciphers: string — OpenSSL cipher string
- _proxy: string|null

Constructor(options = {}):
- options.ciphers: custom cipher string
- options.proxy: proxy URL

Cipher configurations that approximate browser ordering:
CHROME_CIPHERS = [
  'TLS_AES_128_GCM_SHA256',
  'TLS_AES_256_GCM_SHA384',
  'TLS_CHACHA20_POLY1305_SHA256',
  'ECDHE-ECDSA-AES128-GCM-SHA256',
  'ECDHE-RSA-AES128-GCM-SHA256',
  'ECDHE-ECDSA-AES256-GCM-SHA384',
  'ECDHE-RSA-AES256-GCM-SHA384',
  'ECDHE-ECDSA-CHACHA20-POLY1305',
  'ECDHE-RSA-CHACHA20-POLY1305',
  'ECDHE-RSA-AES128-SHA',
  'ECDHE-RSA-AES256-SHA',
  'AES128-GCM-SHA256',
  'AES256-GCM-SHA384',
].join(':');

Methods:

1. async initialize() → void
   - Import undici: const { Client, Pool, ProxyAgent } = await import('undici')
   - Create a Pool with custom TLS connect options:
     new Pool('https://x.com', {
       connections: 10,
       connect: {
         ciphers: this._ciphers,
         honorCipherOrder: false,  // Let server pick (mimics browser)
         minVersion: 'TLSv1.2',
         maxVersion: 'TLSv1.3',
         // ALPN protocols
         ALPNProtocols: ['h2', 'http/1.1'],
       }
     })
   - If proxy configured, create ProxyAgent

2. async request(url, options = {}) → response
   - Use this._client.request({
       origin: new URL(url).origin,
       path: new URL(url).pathname + new URL(url).search,
       method: options.method || 'GET',
       headers: options.headers || {},
       body: options.body || null,
     })
   - Read response body
   - Return normalized { status, headers, body, ok }

3. async close() → void
   - await this._client.close()

4. static isAvailable() → boolean
   - undici is built into Node.js 18+, so likely always available
   - Try import check

Note: undici TLS customization is limited compared to CycleTLS but better than default fetch. It reduces the probability of Cloudflare blocks by ~60-70% based on community reports.
```

### Prompt 4: Native TLS Configuration

```
Create src/client/http/NativeTlsConfig.js.

For environments where neither CycleTLS nor undici customization is available, this module optimizes the native Node.js TLS stack and provides HTTP headers that minimize detection.

Export class NativeTlsConfig:

Methods:

1. static configureTlsDefaults() → void
   - Set process-wide TLS options using tls module:
     import tls from 'tls';
     tls.DEFAULT_CIPHERS = CHROME_CIPHERS;
     tls.DEFAULT_MIN_VERSION = 'TLSv1.2';
   - This affects all subsequent HTTPS connections in the process
   - Warning: this is process-global — only call once at startup

2. static getHeaders(fingerprint = 'chrome') → object
   - Return headers that match the target browser fingerprint
   - Chrome headers:
     {
       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
       'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
       'Accept-Language': 'en-US,en;q=0.9',
       'Accept-Encoding': 'gzip, deflate, br',
       'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
       'Sec-Ch-Ua-Mobile': '?0',
       'Sec-Ch-Ua-Platform': '"Windows"',
       'Sec-Fetch-Dest': 'document',
       'Sec-Fetch-Mode': 'navigate',
       'Sec-Fetch-Site': 'none',
       'Sec-Fetch-User': '?1',
       'Upgrade-Insecure-Requests': '1',
       'Cache-Control': 'max-age=0',
     }
   - Rotate between Chrome, Firefox, Safari profiles to avoid pattern detection

3. static getRandomBrowserProfile() → { headers, userAgent, fingerprint }
   - Randomly select from a pool of realistic browser profiles
   - Pool includes different OS + browser combinations:
     * Chrome/Windows, Chrome/Mac, Chrome/Linux
     * Firefox/Windows, Firefox/Mac
     * Safari/Mac
   - Rotate to reduce fingerprint consistency across requests

4. static request(url, options = {}) → response
   - Make request using native fetch with optimized headers
   - Configure global agent with custom TLS settings:
     import https from 'https';
     const agent = new https.Agent({
       ciphers: CHROME_CIPHERS,
       honorCipherOrder: false,
       minVersion: 'TLSv1.2',
     });
   - Return normalized { status, headers, body, ok }

5. static validateJa3(ja3String) → boolean
   - Parse JA3 string and check it's well-formed
   - Format: TLSVersion,Ciphers,Extensions,EllipticCurves,EllipticCurvePointFormats

This is the baseline fallback — it won't defeat advanced Cloudflare detection but reduces casual blocking.
```

### Prompt 5: JA3 Fingerprint Manager

```
Create src/client/http/FingerprintManager.js.

Manages a library of JA3/JA4 fingerprints and helps select appropriate ones.

Export class FingerprintManager:

Properties:
- _fingerprints: Map<string, FingerprintProfile>
- _activeProfile: string
- _rotationEnabled: boolean
- _requestCount: number

Built-in fingerprint database (class constant):
PROFILES = {
  'chrome-120-win': {
    ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513,29-23-24,0',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    headers: { 'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120"', ... },
    platform: 'windows',
    browser: 'chrome',
    version: '120'
  },
  'chrome-120-mac': { ... },
  'chrome-124-win': { ... },
  'firefox-121-win': {
    ja3: '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-34-51-43-13-45-28-41,29-23-24-25-256-257,0',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    headers: { ... },
    ...
  },
  'safari-17-mac': { ... },
}

Methods:

1. constructor(options = {}):
   - options.profile: initial profile name (default: 'chrome-120-win')
   - options.rotation: enable automatic rotation (default: false)
   - options.rotateEvery: rotate every N requests (default: 100)

2. getProfile(name) → FingerprintProfile
   - Return the named profile

3. getActiveProfile() → FingerprintProfile
   - Return the currently active fingerprint profile

4. setProfile(name) → void
   - Switch to named profile

5. rotate() → FingerprintProfile
   - Switch to next profile in rotation
   - Cycling through profiles avoids consistent fingerprint detection

6. shouldRotate() → boolean
   - Check if rotation is due based on request count

7. onRequest() → FingerprintProfile
   - Increment request count
   - If shouldRotate(), call rotate()
   - Return current profile

8. getAllProfiles() → string[]
   - List available profile names

9. addProfile(name, profile) → void
   - Add custom profile

10. static computeJa3Hash(ja3String) → string
    - Compute MD5 hash of JA3 string (standard JA3 hash format)
    - Used for logging and comparison
```

### Prompt 6: TLS Client Integration with HttpClient

```
Update src/client/http/HttpClient.js (from Track 03) to integrate the TLS layer.

Add TLS support:

1. In constructor, accept options.tls:
   - options.tls: 'auto' | 'cycletls' | 'undici' | 'native' | 'none' (default: 'auto')
   - options.fingerprint: 'chrome' | 'firefox' | 'safari' | custom JA3

2. Add method async _initializeTls() → void
   - If options.tls === 'none', skip TLS customization (use plain fetch)
   - If 'auto', call TlsClient.detectBestStrategy()
   - Initialize the appropriate TLS adapter
   - Store as this._tlsClient

3. Modify the request() method:
   - If TLS client available, use it instead of plain fetch:
     const response = this._tlsClient 
       ? await this._tlsClient.request(url, { method, headers, body })
       : await fetch(url, { method, headers, body });
   - Merge TLS fingerprint headers with request headers
   - Use FingerprintManager to get appropriate headers

4. Add method getTlsStrategy() → string
   - Return the active TLS strategy

5. Add method rotateTlsFingerprint() → void
   - Rotate to a different browser fingerprint
   - Useful when getting 403s

6. In error handling, detect TLS-related failures:
   - 403 Forbidden from Cloudflare → might be TLS fingerprint issue
   - Try rotating fingerprint and retrying
   - Log warning: "403 from Cloudflare detected — TLS fingerprint rotation recommended"

Ensure backward compatibility:
- Default behavior (no TLS options) works exactly as before
- TLS enhancement is opt-in via constructor options
- Auto-mode gracefully degrades if no TLS libraries installed
```

### Prompt 7: TLS HTTP Index and Auto-Selection

```
Create src/client/http/tls/index.js (or update src/client/http/index.js) to auto-select and export the best TLS strategy.

Export:

1. async function createTlsClient(options = {}) → TlsClient
   - Factory function that creates and initializes the best available TLS client
   - Auto-detection order: CycleTLS > undici > native
   - Returns initialized, ready-to-use TlsClient instance
   - Catches initialization errors and falls back gracefully

2. function getTlsCapabilities() → { cycletls: boolean, undici: boolean, native: boolean }
   - Check which TLS strategies are available in the current environment
   - Useful for diagnostics

3. async function testTlsConnection(strategy) → { success: boolean, ja3Hash: string, blockedByCloudflare: boolean }
   - Make a test request to a JA3 fingerprint checking service
   - https://ja3er.com/json or similar
   - Return the detected JA3 hash and whether it would be blocked
   - Useful for users to verify their TLS setup works

4. function recommendTlsStrategy() → { strategy: string, reason: string }
   - Recommend the best strategy for the user's environment
   - Consider: OS, Node.js version, installed packages

Also export all adapters:
export { TlsClient } from './TlsClient.js';
export { CycleTlsAdapter } from './CycleTlsAdapter.js';
export { UndiciAdapter } from './UndiciAdapter.js';
export { NativeTlsConfig } from './NativeTlsConfig.js';
export { FingerprintManager } from './FingerprintManager.js';
```

### Prompt 8: Anti-Detection Header Rotation

```
Create src/client/http/HeaderRotator.js.

Beyond TLS fingerprinting, Cloudflare also examines HTTP headers for consistency. This module generates realistic, rotating header sets that match the TLS fingerprint being used.

Export class HeaderRotator:

Properties:
- _headerSets: Map<string, HeaderSet[]> — multiple header variations per browser
- _currentIndex: Map<string, number> — current rotation index per browser
- _lastRotation: Date

Methods:

1. constructor()
   - Pre-populate header sets for each browser profile

2. getHeaders(browser = 'chrome', context = 'api') → object
   - Return headers matching the browser profile
   - context: 'api' (JSON API calls), 'page' (HTML page loads), 'media' (media uploads)
   - Different contexts use different Accept headers:
     * api: 'application/json, text/javascript, */*; q=0.01'
     * page: 'text/html,application/xhtml+xml,...'
     * media: '*/*'

3. rotateHeaders(browser) → object
   - Advance to next header variation for the browser
   - Small variations: sec-ch-ua-platform rotation (Windows/Mac/Linux), 
     Accept-Language variations (en-US,en;q=0.9 vs en-US,en;q=0.8,fr;q=0.7)

4. addJitter(headers) → object
   - Add slight random variations to headers:
     * Randomize quality values in Accept
     * Vary Accept-Language weights slightly
     * Add or remove optional headers occasionally
   - Makes each request slightly unique

5. getOrderedHeaders(headers) → Array<[string, string]>
   - Return headers in the correct order for the browser
   - Chrome sends headers in a specific order
   - Firefox sends in different order
   - Header order is part of fingerprinting

6. static validateHeaderConsistency(headers, ja3) → { consistent: boolean, issues: string[] }
   - Check that headers match the TLS fingerprint
   - e.g., Firefox user-agent with Chrome JA3 = inconsistent
   - Return list of consistency issues

Header sets (examples):

CHROME_API_HEADERS = {
  'Accept': '*/*',
  'Accept-Encoding': 'gzip, deflate, br',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  'Origin': 'https://x.com',
  'Referer': 'https://x.com/',
  'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  'X-Twitter-Active-User': 'yes',
  'X-Twitter-Client-Language': 'en',
};
```

### Prompt 9: Cloudflare Challenge Detector

```
Create src/client/http/CloudflareDetector.js.

Detect when Cloudflare is challenging or blocking requests, and provide appropriate responses.

Export class CloudflareDetector:

Methods:

1. static isCloudflareChallenge(response) → boolean
   - Check response for Cloudflare challenge indicators:
     * Status 403 with 'cf-' headers (cf-ray, cf-cache-status)
     * Status 503 with Cloudflare challenge page HTML
     * Response body contains 'Attention Required!' or 'cf-browser-verification'
     * Headers contain 'cf-challenge' or 'server: cloudflare'

2. static isCloudflareCaptcha(response) → boolean
   - Detect Cloudflare CAPTCHA challenge (more severe than JS challenge)
   - Body contains 'cf-captcha-container' or hCaptcha elements

3. static isRayIdBlocked(response) → boolean
   - Check for Cloudflare Ray ID in error responses
   - Ray ID in 'cf-ray' header

4. static getCloudflareInfo(response) → { blocked: boolean, challengeType, rayId, retryable }
   - Extract all Cloudflare-related info from response
   - challengeType: 'none' | 'js' | 'captcha' | 'block'
   - retryable: whether rotating fingerprint might help

5. static getSuggestedAction(info) → { action, message }
   - Based on Cloudflare challenge info, suggest next steps:
     * 'rotate_tls' — try different TLS fingerprint
     * 'use_proxy' — switch to a different proxy/IP
     * 'wait' — temporary block, wait and retry
     * 'captcha' — need manual intervention or CAPTCHA solver
     * 'abort' — IP/account is blocked, change approach

6. static async solveJsChallenge(response, http) → { cookies: Array, solved: boolean }
   - Attempt to solve simple Cloudflare JS challenges
   - Parse the challenge JavaScript
   - Execute the computation
   - Submit the solution
   - Note: This only works for simple JS challenges, not CAPTCHAs
   - This is a best-effort implementation — CAPTCHAs require external solvers

Integration with HttpClient:
- After any request returns 403/503, run CloudflareDetector
- If challenge detected, log warning and attempt recovery:
  a. Rotate TLS fingerprint
  b. Retry request
  c. If still blocked, report to caller with detailed error
```

### Prompt 10: TLS Configuration for Scraper

```
Update src/client/Scraper.js to expose TLS configuration options.

Add to constructor options:
  options.tls: {
    strategy: 'auto' | 'cycletls' | 'undici' | 'native' | 'none',
    fingerprint: 'chrome' | 'firefox' | 'safari' | string (custom JA3),
    rotateFingerprint: boolean (auto-rotate on 403),
    headerRotation: boolean (randomize headers),
  }

Add methods:

1. getTlsInfo() → { strategy, fingerprint, ja3Hash }
   - Return current TLS configuration for diagnostics

2. rotateTlsFingerprint() → void
   - Manually rotate TLS fingerprint
   - Useful when starting to get 403s

3. setTlsStrategy(strategy, options) → Promise<void>
   - Switch TLS strategy at runtime
   - Reinitialize HTTP client with new TLS settings

4. async testTlsConnection() → { success, detectedFingerpint, blockedByCloudflare }
   - Test if current TLS config can reach Twitter
   - Make a lightweight request to Twitter's CDN

Modify internal error handling:
- When a 403 is received from Cloudflare:
  a. If rotateFingerprint enabled, automatically rotate and retry
  b. Emit event: 'tls:cloudflare_blocked'
  c. Log: "Cloudflare TLS block detected. Strategy: {strategy}. Rotating fingerprint..."
- When CycleTLS process crashes:
  a. Restart it automatically
  b. Fall back to next strategy
  c. Emit event: 'tls:fallback'

Default behavior:
- If no TLS options specified, use 'auto' (best available)
- Always try NativeTlsConfig at minimum (0 cost, some benefit)
```

### Prompt 11: TLS Diagnostic Tool

```
Create src/client/http/TlsDiagnostic.js.

A diagnostic utility that helps users troubleshoot TLS issues with Twitter.

Export class TlsDiagnostic:

Methods:

1. static async runDiagnostics(options = {}) → DiagnosticReport
   - Run a comprehensive TLS diagnostic:
   
   a. Check available TLS strategies:
      - CycleTLS installed? version?
      - undici available? version?
      - Node.js version and OpenSSL version
   
   b. Test each strategy against Twitter:
      - For each available strategy, make a simple request to https://x.com
      - Record: success/failure, response status, response time, detected headers
   
   c. Check JA3 fingerprint:
      - Request to https://ja3er.com/json (or similar) to see detected JA3
      - Compare against known browser fingerprints
   
   d. Test proxy if configured:
      - Verify proxy is reachable
      - Check proxy TLS fingerprint
   
   Return DiagnosticReport:
   {
     nodeVersion, opensslVersion, platform,
     strategies: { cycletls: { available, version, testResult }, undici: { ... }, native: { ... } },
     recommended: string,
     twitterReachable: boolean,
     ja3Hash: string,
     cloudflareStatus: 'passed' | 'challenged' | 'blocked',
     timestamp: Date
   }

2. static formatReport(report) → string
   - Format diagnostic report as readable text
   - Include colored status indicators
   - Recommend actions based on findings

3. static async quickTest() → { ok: boolean, strategy: string, latency: number }
   - Quick pass/fail test — can we reach Twitter's API?
   - Use the best available TLS strategy
   - Return result in under 5 seconds
```

### Prompt 12: TLS TypeScript Definitions

```
Update types/index.d.ts with TLS-related type definitions.

Add:

export interface TlsOptions {
  strategy?: 'auto' | 'cycletls' | 'undici' | 'native' | 'none';
  fingerprint?: 'chrome' | 'firefox' | 'safari' | string;
  rotateFingerprint?: boolean;
  headerRotation?: boolean;
}

export interface TlsInfo {
  strategy: string;
  fingerprint: string;
  ja3Hash: string;
}

export interface FingerprintProfile {
  ja3: string;
  userAgent: string;
  headers: Record<string, string>;
  platform: string;
  browser: string;
  version: string;
}

export interface DiagnosticReport {
  nodeVersion: string;
  opensslVersion: string;
  platform: string;
  strategies: {
    cycletls: { available: boolean; version?: string; testResult?: 'pass' | 'fail' };
    undici: { available: boolean; version?: string; testResult?: 'pass' | 'fail' };
    native: { available: boolean; testResult?: 'pass' | 'fail' };
  };
  recommended: string;
  twitterReachable: boolean;
  ja3Hash: string | null;
  cloudflareStatus: 'passed' | 'challenged' | 'blocked';
  timestamp: Date;
}

export class TlsClient {
  constructor(options?: TlsOptions);
  initialize(): Promise<void>;
  request(url: string, options?: RequestOptions): Promise<HttpResponse>;
  close(): Promise<void>;
  getStrategy(): string;
  getFingerprint(): string;
  isAvailable(): boolean;
}

export class FingerprintManager {
  constructor(options?: { profile?: string; rotation?: boolean; rotateEvery?: number });
  getActiveProfile(): FingerprintProfile;
  setProfile(name: string): void;
  rotate(): FingerprintProfile;
  getAllProfiles(): string[];
}

export class TlsDiagnostic {
  static runDiagnostics(options?: object): Promise<DiagnosticReport>;
  static quickTest(): Promise<{ ok: boolean; strategy: string; latency: number }>;
}

Update ScraperOptions to include:
  tls?: TlsOptions;
```

### Prompt 13: TLS MCP Tools

```
Update src/mcp/local-tools.js to add TLS diagnostic tools.

Add:

1. x_tls_diagnostics — Run TLS diagnostics
   Input: {}
   - Call TlsDiagnostic.runDiagnostics()
   - Return formatted diagnostic report

2. x_tls_quick_test — Quick TLS connection test
   Input: {}
   - Call TlsDiagnostic.quickTest()
   - Return { ok, strategy, latency }

3. x_tls_set_strategy — Change TLS strategy
   Input: { strategy: string }
   - Update Scraper TLS configuration
   - Return { previousStrategy, newStrategy }

4. x_tls_fingerprints — List available TLS fingerprints
   Input: {}
   - Return FingerprintManager.getAllProfiles()

These tools help AI agents diagnose and fix connectivity issues when Twitter blocks requests.
```

### Prompt 14: TLS CLI Commands

```
Update src/cli/index.js to add TLS commands.

Add a 'tls' command group:

1. xactions tls test
   - Run TlsDiagnostic.quickTest()
   - Show pass/fail with strategy and latency
   - Color-coded output: green for pass, red for fail

2. xactions tls diagnose
   - Run TlsDiagnostic.runDiagnostics()
   - Display full diagnostic report with recommendations
   - Table format for strategy comparison

3. xactions tls fingerprints
   - List available fingerprint profiles
   - Show which one is currently active

4. xactions tls install
   - Help user install CycleTLS for best TLS bypass
   - Run: npm install cycletls
   - Verify installation
   - Run quick test with new strategy

5. xactions tls benchmark
   - Test all available strategies against Twitter
   - Measure latency and success rate (10 requests each)
   - Display comparison table
   - Recommend best strategy

Use chalk for colored output, ora for spinners during tests.
```

### Prompt 15: TLS Tests

```
Create tests/client/tls.test.js using vitest.

Tests:

TlsClient:
1. constructor sets default strategy to 'auto'
2. detectBestStrategy returns available strategy
3. request delegates to active adapter
4. close cleans up resources

NativeTlsConfig:
5. getHeaders returns complete Chrome header set
6. getHeaders('firefox') returns Firefox headers
7. getRandomBrowserProfile returns different profiles on repeated calls
8. CHROME_CIPHERS is a valid OpenSSL cipher string

FingerprintManager:
9. constructor with 'chrome-120-win' sets correct JA3
10. rotate cycles through profiles
11. shouldRotate returns true after rotateEvery requests
12. addProfile adds custom profile
13. computeJa3Hash returns 32-char MD5 hex string

HeaderRotator:
14. getHeaders('chrome', 'api') returns appropriate Accept header
15. getHeaders('chrome', 'page') returns HTML Accept header
16. addJitter produces slightly different headers each call
17. validateHeaderConsistency detects Chrome UA with Firefox JA3 mismatch

CloudflareDetector:
18. isCloudflareChallenge detects 403 with cf-ray header
19. isCloudflareChallenge returns false for normal 403
20. getSuggestedAction returns 'rotate_tls' for JS challenge
21. getSuggestedAction returns 'captcha' for CAPTCHA challenge

CycleTlsAdapter:
22. isAvailable returns false when cycletls not installed (in test env)
23. constructor stores JA3 fingerprint

UndiciAdapter:
24. CHROME_CIPHERS contains expected cipher suites
25. isAvailable returns true (built into Node.js 18+)

Integration:
26. HttpClient with tls='native' uses NativeTlsConfig headers
27. HttpClient with tls='none' uses plain fetch
28. Scraper.getTlsInfo() returns current configuration

Use vitest mocks for HTTP requests (vi.fn() to mock fetch and TLS clients).
Test fixtures for mock Cloudflare responses.
```

---

## Validation

After all 15 prompts are complete, verify:

```bash
# TLS modules load
node -e "
import { TlsClient, FingerprintManager, NativeTlsConfig } from './src/client/http/TlsClient.js';
import { CloudflareDetector } from './src/client/http/CloudflareDetector.js';
import { HeaderRotator } from './src/client/http/HeaderRotator.js';
console.log('✅ TLS modules load');
"

# Fingerprint manager works
node -e "
import { FingerprintManager } from './src/client/http/FingerprintManager.js';
const fm = new FingerprintManager({ profile: 'chrome-120-win' });
const p = fm.getActiveProfile();
console.log('✅ Profile:', p.browser, p.version, p.platform);
console.log('✅ JA3 length:', p.ja3.length);
"

# TLS detection
node -e "
import { TlsClient } from './src/client/http/TlsClient.js';
const strategy = await TlsClient.detectBestStrategy();
console.log('✅ Best TLS strategy:', strategy);
"

# Scraper TLS config
node -e "
import { Scraper } from './src/client/index.js';
const s = new Scraper({ tls: { strategy: 'native', fingerprint: 'chrome' } });
console.log('✅ Scraper TLS info:', s.getTlsInfo());
"

# Types exist
grep -c "TlsOptions" types/index.d.ts
grep -c "FingerprintProfile" types/index.d.ts

# Tests pass
npx vitest run tests/client/tls.test.js
```

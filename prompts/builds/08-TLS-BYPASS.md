# Track 08 — CycleTLS / TLS Fingerprint Bypass

> the-convocation/twitter-scraper uses CycleTLS to mimic real browser TLS fingerprints and bypass Cloudflare bot detection. XActions relies on Puppeteer (real browser) which works but is heavyweight (200+ MB). This track adds a lightweight TLS fingerprint bypass using CycleTLS or similar technique for the programmatic HTTP client.

---

## Research Before Starting

```
src/client/http/HttpClient.js  — HTTP client from Track 03
src/client/http/index.js       — HTTP module exports
```

The problem:
- Node.js `fetch` and `undici` have distinctive TLS fingerprints (JA3/JA4 hashes)
- Cloudflare and Twitter detect these as bot traffic
- CycleTLS is a Go binary + Node.js wrapper that uses Chrome/Firefox TLS fingerprints
- Alternative: `tls-client` (Python) or custom undici TLS configuration

CycleTLS:
```
npm install cycletls
```
- Spawns a Go binary that handles HTTP requests with spoofed TLS
- Supports JA3 string specification
- Returns standard { status, body, headers }

---

## Prompts

### Prompt 1: TLS Fingerprint Manager

```
Create src/client/tls/FingerprintManager.js.

Manages TLS fingerprint profiles that mimic real browsers.

export class FingerprintManager {
  constructor(options = {}) {
    this.rotationEnabled = options.rotate !== false;
    this.currentIndex = 0;
  }

  // JA3 fingerprints for common browsers (real, verified)
  static FINGERPRINTS = {
    chrome_131: {
      ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513,29-23-24,0',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      headers: {
        'sec-ch-ua': '"Chromium";v="131", "Not A(Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
      },
    },
    firefox_133: {
      ja3: '771,4865-4867-4866-49195-49199-52393-52392-49196-49200-49162-49161-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-34-51-43-13-45-28-27,29-23-24-25-256-257,0',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
      headers: {},
    },
    safari_18: {
      ja3: '771,4865-4866-4867-49196-49195-52393-49200-49199-52392-49162-49161-49172-49171-157-156-53-47,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513,29-23-24,0',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
      headers: {},
    },
    edge_131: {
      ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513,29-23-24,0',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      headers: {
        'sec-ch-ua': '"Microsoft Edge";v="131", "Chromium";v="131", "Not A(Brand";v="24"',
      },
    },
    android_chrome: {
      ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513,29-23-24,0',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      headers: {
        'sec-ch-ua-mobile': '?1',
        'sec-ch-ua-platform': '"Android"',
      },
    },
  };

  getFingerprint() {
    const profiles = Object.values(FingerprintManager.FINGERPRINTS);
    if (this.rotationEnabled) {
      const fp = profiles[this.currentIndex % profiles.length];
      this.currentIndex++;
      return fp;
    }
    return profiles[0]; // Default to Chrome
  }

  getFingerprintByName(name) {
    return FingerprintManager.FINGERPRINTS[name] || null;
  }
}
```

### Prompt 2: CycleTLS Adapter

```
Create src/client/tls/CycleTlsAdapter.js.

Adapter that uses CycleTLS Go binary for HTTP requests with spoofed TLS.

export class CycleTlsAdapter {
  constructor(fingerprintManager) {
    this.fingerprintManager = fingerprintManager || new FingerprintManager();
    this.cycleTls = null;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      const { default: initCycleTLS } = await import('cycletls');
      this.cycleTls = await initCycleTLS();
      this.initialized = true;
    } catch (error) {
      if (error.code === 'ERR_MODULE_NOT_FOUND' || error.code === 'MODULE_NOT_FOUND') {
        throw new Error(
          'CycleTLS not installed. Install with: npm install cycletls\n' +
          'Or use the standard HTTP client (slower but works without CycleTLS).'
        );
      }
      throw error;
    }
  }

  async fetch(url, options = {}) {
    await this.init();
    
    const fingerprint = this.fingerprintManager.getFingerprint();
    
    const cycleTlsOptions = {
      ja3: fingerprint.ja3,
      userAgent: fingerprint.userAgent,
      headers: {
        ...fingerprint.headers,
        ...options.headers,
      },
      body: options.body || '',
      proxy: options.proxy || '',
      timeout: options.timeout || 30,
      disableRedirect: options.disableRedirect || false,
      headerOrder: [
        'host', 'connection', 'content-length', 'sec-ch-ua',
        'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'user-agent',
        'content-type', 'accept', 'origin', 'sec-fetch-site',
        'sec-fetch-mode', 'sec-fetch-dest', 'referer',
        'accept-encoding', 'accept-language', 'cookie',
      ],
    };

    const method = (options.method || 'GET').toUpperCase();
    
    const response = await this.cycleTls(url, cycleTlsOptions, method.toLowerCase());
    
    // Normalize CycleTLS response → standard format
    return {
      status: response.status,
      headers: new Headers(response.headers),
      body: typeof response.body === 'string' ? response.body : JSON.stringify(response.body),
      json: () => typeof response.body === 'string' ? JSON.parse(response.body) : response.body,
      text: () => typeof response.body === 'string' ? response.body : JSON.stringify(response.body),
      ok: response.status >= 200 && response.status < 300,
    };
  }

  async close() {
    if (this.cycleTls?.exit) {
      await this.cycleTls.exit();
    }
    this.initialized = false;
  }
}
```

### Prompt 3: Native TLS Configuration (No CycleTLS Fallback)

```
Create src/client/tls/NativeTlsAdapter.js.

For environments where CycleTLS can't run (e.g., serverless, Docker), configure Node.js TLS to be less detectable.

import { Agent } from 'undici';

export class NativeTlsAdapter {
  constructor(fingerprintManager) {
    this.fingerprintManager = fingerprintManager || new FingerprintManager();
    this.agent = null;
  }

  init() {
    // Configure undici Agent with TLS options that reduce fingerprint uniqueness
    this.agent = new Agent({
      connect: {
        // Randomize cipher suite order to vary JA3
        // These are the real Chrome cipher suites
        ciphers: [
          'TLS_AES_128_GCM_SHA256',
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256',
          'ECDHE-ECDSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-ECDSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-ECDSA-CHACHA20-POLY1305',
          'ECDHE-RSA-CHACHA20-POLY1305',
        ].join(':'),
        // Enable HTTP/2
        ALPNProtocols: ['h2', 'http/1.1'],
        // Set minimum TLS version to match browsers
        minVersion: 'TLSv1.2',
        maxVersion: 'TLSv1.3',
        // Randomize session tickets
        rejectUnauthorized: true,
      },
      keepAliveTimeout: 30000,
      keepAliveMaxTimeout: 60000,
      pipelining: 1,
    });
  }

  async fetch(url, options = {}) {
    if (!this.agent) this.init();
    
    const fingerprint = this.fingerprintManager.getFingerprint();
    
    const headers = {
      'User-Agent': fingerprint.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      ...fingerprint.headers,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      dispatcher: this.agent,
    });

    return response;
  }

  close() {
    this.agent?.close();
  }
}

Note: NativeTlsAdapter is less effective than CycleTLS because Node.js TLS fingerprint is partially determined by the engine, not just configuration.
Still significantly better than default Node.js fetch which has an instantly identifiable JA3.
```

### Prompt 4: TLS Adapter Factory

```
Create src/client/tls/AdapterFactory.js.

Auto-select the best TLS adapter based on environment.

export async function createTlsAdapter(options = {}) {
  const { adapter: preferredAdapter = 'auto', fingerprint } = options;
  const fingerprintManager = new FingerprintManager(fingerprint);
  
  if (preferredAdapter === 'cycletls') {
    const adapter = new CycleTlsAdapter(fingerprintManager);
    await adapter.init();
    return adapter;
  }
  
  if (preferredAdapter === 'native') {
    const adapter = new NativeTlsAdapter(fingerprintManager);
    adapter.init();
    return adapter;
  }
  
  // Auto-detect: try CycleTLS first, fall back to native
  if (preferredAdapter === 'auto') {
    try {
      // Check if cycletls is available
      await import('cycletls');
      const adapter = new CycleTlsAdapter(fingerprintManager);
      await adapter.init();
      console.log('🔒 Using CycleTLS for enhanced TLS fingerprint spoofing');
      return adapter;
    } catch {
      // CycleTLS not available
      console.log('🔒 Using native TLS adapter (install cycletls for better stealth)');
      const adapter = new NativeTlsAdapter(fingerprintManager);
      adapter.init();
      return adapter;
    }
  }
  
  // Direct adapter instance
  if (preferredAdapter && typeof preferredAdapter.fetch === 'function') {
    return preferredAdapter;
  }
  
  throw new Error(`Unknown TLS adapter: ${preferredAdapter}`);
}

// Convenience: Check if CycleTLS is available without importing
export async function isCycleTlsAvailable() {
  try {
    await import('cycletls');
    return true;
  } catch {
    return false;
  }
}
```

### Prompt 5: HttpClient TLS Integration

```
Update src/client/http/HttpClient.js to use TLS adapters.

The HttpClient should route requests through the TLS adapter when configured:

class HttpClient {
  constructor(options = {}) {
    // ... existing constructor
    this.tlsAdapter = null;
    this.useTls = options.tls !== false; // Default: enabled if adapter available
  }

  async initTls(options = {}) {
    if (this.tlsAdapter) return;
    this.tlsAdapter = await createTlsAdapter(options);
  }

  async request(url, options = {}) {
    // If TLS adapter is configured, use it
    if (this.tlsAdapter) {
      const response = await this.tlsAdapter.fetch(url, {
        method: options.method || 'GET',
        headers: this.buildHeaders(options),
        body: options.body,
        proxy: this.proxy,
        timeout: options.timeout,
      });
      
      // Process response through standard pipeline
      return this.processResponse(response, url, options);
    }
    
    // Fallback to standard fetch
    return this.standardFetch(url, options);
  }

  // Lazy TLS initialization on first request
  async ensureTls() {
    if (!this.tlsAdapter && this.useTls) {
      try {
        await this.initTls();
      } catch {
        this.useTls = false; // Disable TLS if init fails
      }
    }
  }
}

Ensure backward compatibility — existing code that doesn't configure TLS still works with standard fetch.
```

### Prompt 6: Proxy Support

```
Create src/client/tls/ProxyManager.js.

Manage HTTP/SOCKS proxies for requests:

export class ProxyManager {
  constructor(options = {}) {
    this.proxies = [];        // Pool of proxy URLs
    this.currentIndex = 0;
    this.rotation = options.rotation || 'round-robin'; // 'round-robin' | 'random' | 'sticky'
    this.healthCheck = options.healthCheck !== false;
    this.healthy = new Set();
    this.unhealthy = new Map(); // proxy → { since, retryAt }
  }

  addProxy(url) {
    // Validate proxy URL format
    // http://host:port, socks5://host:port, http://user:pass@host:port
    const parsed = new URL(url);
    if (!['http:', 'https:', 'socks4:', 'socks5:'].includes(parsed.protocol)) {
      throw new Error(`Unsupported proxy protocol: ${parsed.protocol}`);
    }
    this.proxies.push(url);
    this.healthy.add(url);
  }

  addProxies(urls) {
    urls.forEach(u => this.addProxy(u));
  }

  getProxy() {
    const healthyProxies = this.proxies.filter(p => this.healthy.has(p));
    if (healthyProxies.length === 0) {
      // Try to recover unhealthy proxies
      this.recoverProxies();
      if (this.healthy.size === 0) return null;
    }
    
    switch (this.rotation) {
      case 'round-robin':
        return healthyProxies[this.currentIndex++ % healthyProxies.length];
      case 'random':
        return healthyProxies[Math.floor(Math.random() * healthyProxies.length)];
      case 'sticky':
        return healthyProxies[0]; // Always use first healthy
      default:
        return healthyProxies[0];
    }
  }

  markUnhealthy(proxy, reason) {
    this.healthy.delete(proxy);
    this.unhealthy.set(proxy, { since: Date.now(), retryAt: Date.now() + 60000, reason });
  }

  markHealthy(proxy) {
    this.unhealthy.delete(proxy);
    this.healthy.add(proxy);
  }

  async healthCheckAll() {
    // Test each proxy by making a request to a known endpoint
    for (const proxy of this.proxies) {
      try {
        const adapter = new NativeTlsAdapter();
        adapter.init();
        const response = await adapter.fetch('https://httpbin.org/ip', { proxy });
        if (response.ok) this.markHealthy(proxy);
        else this.markUnhealthy(proxy, `Status: ${response.status}`);
      } catch (e) {
        this.markUnhealthy(proxy, e.message);
      }
    }
  }

  getStats() {
    return {
      total: this.proxies.length,
      healthy: this.healthy.size,
      unhealthy: this.unhealthy.size,
      proxies: this.proxies.map(p => ({
        url: p.replace(/:\/\/(.*):(.*)@/, '://***:***@'), // Mask credentials
        healthy: this.healthy.has(p),
      })),
    };
  }
}
```

### Prompt 7: Cookie Jar Proxy and TLS Integration

```
Update src/client/auth/CookieAuth.js to support proxy-aware cookies.

When using proxies, cookies need to be managed per-session, not per-proxy:

class CookieAuth {
  // ... existing code

  // Ensure cookies are sent through proxy correctly
  getHeaders(options = {}) {
    const headers = {
      ...this.tokenManager.getHeaders(this.isAuthenticated),
    };
    
    if (this.isAuthenticated) {
      headers['Cookie'] = this.cookieJar.toCookieString();
      
      // x-csrf-token must match ct0 cookie
      const ct0 = this.cookieJar.get('ct0');
      if (ct0) headers['x-csrf-token'] = ct0;
    }
    
    // Referer/Origin must be x.com even through proxy
    headers['Referer'] = 'https://x.com/';
    headers['Origin'] = 'https://x.com';
    
    return headers;
  }
}

Also update HttpClient to integrate proxy selection:

class HttpClient {
  constructor(options = {}) {
    // ...
    this.proxyManager = options.proxyManager || null;
  }

  async request(url, options = {}) {
    const proxy = this.proxyManager?.getProxy();
    
    try {
      const response = await this.doRequest(url, { ...options, proxy });
      if (proxy) this.proxyManager.markHealthy(proxy);
      return response;
    } catch (error) {
      if (proxy && isProxyError(error)) {
        this.proxyManager.markUnhealthy(proxy, error.message);
        // Retry with different proxy
        const nextProxy = this.proxyManager.getProxy();
        if (nextProxy && nextProxy !== proxy) {
          return this.doRequest(url, { ...options, proxy: nextProxy });
        }
      }
      throw error;
    }
  }
}
```

### Prompt 8: Browser Header Ordering

```
Create src/client/tls/headerOrder.js.

Real browsers send headers in a specific order. Random ordering is a fingerprinting signal.

// Chrome sends headers in this exact order:
export const CHROME_HEADER_ORDER = [
  'host',
  'connection',
  'content-length',
  'sec-ch-ua',
  'x-csrf-token',
  'sec-ch-ua-mobile',
  'authorization',
  'user-agent',
  'x-twitter-auth-type',
  'x-twitter-client-language',
  'x-twitter-active-user',
  'sec-ch-ua-platform',
  'content-type',
  'accept',
  'origin',
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-dest',
  'referer',
  'accept-encoding',
  'accept-language',
  'cookie',
];

export function orderHeaders(headers, order = CHROME_HEADER_ORDER) {
  // Return new object with keys in the specified order
  // Keys not in the order list go at the end
  const ordered = {};
  const headerMap = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), { original: k, value: v }])
  );
  
  for (const key of order) {
    const entry = headerMap.get(key);
    if (entry) {
      ordered[entry.original] = entry.value;
      headerMap.delete(key);
    }
  }
  
  // Remaining headers
  for (const [, entry] of headerMap) {
    ordered[entry.original] = entry.value;
  }
  
  return ordered;
}

// Firefox header order differs:
export const FIREFOX_HEADER_ORDER = [
  'host',
  'user-agent',
  'accept',
  'accept-language',
  'accept-encoding',
  'content-type',
  'content-length',
  'origin',
  'connection',
  'referer',
  'cookie',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'authorization',
  'x-csrf-token',
];

Integrate into CycleTlsAdapter and NativeTlsAdapter — both should order headers before sending.
```

### Prompt 9: Anti-Detection Evasion Suite

```
Create src/client/tls/evasion.js.

Additional anti-detection techniques beyond TLS fingerprinting:

export class EvasionSuite {
  constructor(options = {}) {
    this.enableTimingJitter = options.timingJitter !== false;
    this.enableHeaderRandomization = options.headerRandomization !== false;
  }

  // Add realistic timing jitter to requests
  async applyTimingJitter() {
    if (!this.enableTimingJitter) return;
    
    // Human browsing has variable inter-request timing
    // Short burst of fast requests, then pauses
    const patterns = [
      { min: 200, max: 800, weight: 0.3 },   // Fast browsing
      { min: 1000, max: 3000, weight: 0.5 },  // Normal browsing
      { min: 3000, max: 8000, weight: 0.15 }, // Reading content
      { min: 8000, max: 20000, weight: 0.05 }, // Deep reading/idle
    ];
    
    const delay = this.weightedRandomDelay(patterns);
    await sleep(delay);
  }

  // Vary Accept-Language to match fingerprint locale
  getAcceptLanguage(profile = 'en-us') {
    const locales = {
      'en-us': 'en-US,en;q=0.9',
      'en-gb': 'en-GB,en-US;q=0.9,en;q=0.8',
      'mixed': 'en-US,en;q=0.9,ja;q=0.8,zh-CN;q=0.7',
    };
    return locales[profile] || locales['en-us'];
  }

  // Add platform-consistent Sec-CH-UA hints
  getClientHints(browser) {
    // Must be consistent with User-Agent
  }

  // Randomize non-critical headers slightly
  randomizeHeaders(headers) {
    if (!this.enableHeaderRandomization) return headers;
    
    const result = { ...headers };
    
    // Occasionally omit optional headers (like real browsers)
    if (Math.random() < 0.1) delete result['DNT'];
    
    // Vary Accept quality values slightly
    if (result['Accept'] && Math.random() < 0.2) {
      result['Accept'] = result['Accept'].replace('q=0.9', `q=0.${8 + Math.floor(Math.random() * 2)}`);
    }
    
    return result;
  }

  weightedRandomDelay(patterns) {
    const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const pattern of patterns) {
      random -= pattern.weight;
      if (random <= 0) {
        return pattern.min + Math.random() * (pattern.max - pattern.min);
      }
    }
    return patterns[0].min;
  }
}
```

### Prompt 10: JA3/JA4 Fingerprint Verification

```
Create src/client/tls/verify.js.

Tools to verify that TLS fingerprinting is working:

export async function verifyFingerprint(adapter) {
  // Use a JA3 checking service to verify our fingerprint
  const services = [
    'https://tls.browserleaks.com/json',
    'https://ja3er.com/json',
    'https://check.ja3.zone/',
  ];
  
  for (const serviceUrl of services) {
    try {
      const response = await adapter.fetch(serviceUrl);
      const data = await response.json();
      
      return {
        service: serviceUrl,
        ja3Hash: data.ja3_hash || data.ja3 || data.hash,
        ja3Text: data.ja3_text || data.ja3_full,
        tlsVersion: data.tls_version,
        cipherSuites: data.cipher_suites,
        extensions: data.extensions,
        httpVersion: data.http_version || data.protocol,
        ip: data.ip,
      };
    } catch {
      continue; // Try next service
    }
  }
  
  throw new Error('Could not verify TLS fingerprint — all verification services unreachable');
}

export async function compareFingerprints(adapter1, adapter2) {
  const [fp1, fp2] = await Promise.all([
    verifyFingerprint(adapter1),
    verifyFingerprint(adapter2),
  ]);
  
  return {
    adapter1: fp1,
    adapter2: fp2,
    same: fp1.ja3Hash === fp2.ja3Hash,
    differences: findDifferences(fp1, fp2),
  };
}

// Verify fingerprint matches a known browser
export function matchesBrowserProfile(fingerprint, browserName) {
  const expected = FingerprintManager.FINGERPRINTS[browserName];
  if (!expected) return { matches: false, reason: 'Unknown browser profile' };
  
  // Compare JA3 hashes
  const expectedHash = crypto.createHash('md5').update(expected.ja3).digest('hex');
  return {
    matches: fingerprint.ja3Hash === expectedHash,
    expectedHash,
    actualHash: fingerprint.ja3Hash,
  };
}
```

### Prompt 11: HTTP/2 Fingerprint Matching

```
Create src/client/tls/http2Fingerprint.js.

Beyond TLS/JA3, HTTP/2 settings also fingerprint clients. Browsers send specific SETTINGS frames.

export class Http2FingerprintConfig {
  // Chrome HTTP/2 SETTINGS (in order):
  static CHROME = {
    HEADER_TABLE_SIZE: 65536,
    ENABLE_PUSH: 0,
    MAX_CONCURRENT_STREAMS: 1000,
    INITIAL_WINDOW_SIZE: 6291456,
    MAX_HEADER_LIST_SIZE: 262144,
    // Window update: 15663105
  };

  // Firefox HTTP/2 SETTINGS:
  static FIREFOX = {
    HEADER_TABLE_SIZE: 65536,
    INITIAL_WINDOW_SIZE: 131072,
    MAX_FRAME_SIZE: 16384,
  };

  // Akamai HTTP/2 fingerprint string (Akamai h2 fingerprint format):
  // SETTINGS[1:65536;3:1000;4:6291456;6:262144]|WINDOW_UPDATE[15663105]|PRIORITY[0:3:0:201,...]
  static getAkamaiFingerprint(browser = 'chrome') {
    if (browser === 'chrome') {
      return '1:65536;3:1000;4:6291456;6:262144|15663105|0:1:256:0,3:3:0:201,5:3:0:201,7:3:0:201,9:3:0:201,11:3:0:201,13:3:0:201';
    }
    if (browser === 'firefox') {
      return '1:65536;4:131072;5:16384|12517377|3:0:0:201,5:0:0:101,7:0:0:1,9:0:7:1,11:0:3:1,13:0:0:241';
    }
  }
}

// Configure undici or CycleTLS with correct HTTP/2 settings
export function getHttp2Settings(browser = 'chrome') {
  const settings = Http2FingerprintConfig[browser.toUpperCase()];
  if (!settings) return Http2FingerprintConfig.CHROME;
  return settings;
}

Note: CycleTLS handles HTTP/2 fingerprinting automatically. This is needed only for the native adapter.
When using undici directly, pass these settings to the HTTP/2 session configuration.
```

### Prompt 12: TLS Module Index

```
Create src/client/tls/index.js.

export { FingerprintManager } from './FingerprintManager.js';
export { CycleTlsAdapter } from './CycleTlsAdapter.js';
export { NativeTlsAdapter } from './NativeTlsAdapter.js';
export { createTlsAdapter, isCycleTlsAvailable } from './AdapterFactory.js';
export { ProxyManager } from './ProxyManager.js';
export { orderHeaders, CHROME_HEADER_ORDER, FIREFOX_HEADER_ORDER } from './headerOrder.js';
export { EvasionSuite } from './evasion.js';
export { verifyFingerprint, compareFingerprints, matchesBrowserProfile } from './verify.js';
export { Http2FingerprintConfig, getHttp2Settings } from './http2Fingerprint.js';

Update src/client/index.js:
export * as tls from './tls/index.js';

Update package.json:
- Add cycletls to optionalDependencies (not dependencies):
  "optionalDependencies": {
    "cycletls": "^1.0.26"
  }
- Add exports: "./tls": "./src/client/tls/index.js"
```

### Prompt 13: Scraper TLS Integration

```
Update src/client/Scraper.js to use TLS by default.

class Scraper {
  constructor(options = {}) {
    // ...existing code
    
    // TLS configuration
    this.tlsConfig = {
      adapter: options.tls?.adapter || 'auto',
      fingerprint: options.tls?.fingerprint || {},
      proxy: options.tls?.proxy || options.proxy,
    };
  }

  async init() {
    // Initialize TLS adapter
    try {
      this.httpClient.tlsAdapter = await createTlsAdapter(this.tlsConfig);
    } catch {
      // Silently fall back to standard fetch
    }
    
    // Initialize proxy if configured
    if (this.tlsConfig.proxy) {
      this.httpClient.proxyManager = new ProxyManager();
      if (Array.isArray(this.tlsConfig.proxy)) {
        this.httpClient.proxyManager.addProxies(this.tlsConfig.proxy);
      } else {
        this.httpClient.proxyManager.addProxy(this.tlsConfig.proxy);
      }
    }
  }
}

Usage:
const scraper = new Scraper({
  tls: {
    adapter: 'cycletls',           // or 'native' or 'auto'
    fingerprint: { rotate: true }, // Rotate browser fingerprints
  },
  proxy: 'socks5://localhost:1080',
  // Or multiple proxies:
  proxy: ['http://proxy1:8080', 'http://proxy2:8080'],
});

await scraper.init();
const profile = await scraper.getProfile('elonmusk');
```

### Prompt 14: MCP and CLI TLS Tools

```
Add to MCP (src/mcp/local-tools.js):

x_tls_verify:
  description: "Check TLS fingerprint of current HTTP client"
  handler: Run verifyFingerprint, return JA3 hash and browser match

x_tls_set_adapter:
  params: { adapter: 'cycletls' | 'native' | 'auto' }
  handler: Switch TLS adapter

x_proxy_add:
  params: { url: string }
  handler: Add proxy to rotation pool

x_proxy_status:
  handler: Return proxy pool health stats

Add CLI commands:

xactions tls verify
  → Show current JA3 fingerprint and browser match
  → Color-coded: green = matches browser, red = detectable as bot

xactions tls test
  → Make test request to x.com, show if it passes Cloudflare

xactions proxy add <url>
  → Add proxy to pool

xactions proxy test [url]
  → Test proxy connectivity and speed

xactions proxy list
  → Show all proxies with health status
```

### Prompt 15: TLS Tests

```
Create tests/client/tls.test.js.

15 tests:
1. FingerprintManager returns valid JA3 string for chrome_131
2. FingerprintManager.getFingerprint rotates through profiles
3. FingerprintManager.getFingerprintByName returns null for unknown
4. CycleTlsAdapter.init throws helpful error when cycletls not installed
5. NativeTlsAdapter.init creates undici Agent with correct cipher config
6. createTlsAdapter('native') returns NativeTlsAdapter
7. createTlsAdapter('auto') falls back to native when cycletls missing
8. orderHeaders puts Chrome headers in correct order
9. orderHeaders preserves headers not in the order list
10. ProxyManager rotates proxies round-robin
11. ProxyManager.markUnhealthy excludes proxy from rotation
12. ProxyManager.getProxy returns null when all unhealthy
13. EvasionSuite.weightedRandomDelay returns values within expected range
14. EvasionSuite.randomizeHeaders preserves required headers
15. Http2FingerprintConfig.getAkamaiFingerprint returns non-empty string for chrome and firefox

Integration test (gated):
- CycleTlsAdapter.fetch to https://api.ipify.org returns valid IP
- verifyFingerprint returns JA3 hash
```

---

## Validation

```bash
node -e "import('./src/client/tls/index.js').then(m => console.log('✅ TLS module loaded'))"
npx vitest run tests/client/tls.test.js
```

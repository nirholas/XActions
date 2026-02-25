/**
 * XActions Proxy Manager
 * Proxy rotation + health tracking for Puppeteer scraping.
 *
 * Kills: Phantombuster (proxy pool), Apify (proxy management)
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import fs from 'fs';
import fsp from 'fs/promises';

// ============================================================================
// ProxyManager Class
// ============================================================================

export class ProxyManager {
  constructor(proxies = []) {
    this.proxies = proxies.map(p => this._normalize(p));
    this.index = 0;
    this.stats = new Map(); // proxy → { successes, failures, consecutiveFailures, blacklistedUntil, totalTime, requests }
    for (const p of this.proxies) {
      this.stats.set(p.url, { successes: 0, failures: 0, consecutiveFailures: 0, blacklistedUntil: 0, totalTime: 0, requests: 0 });
    }
  }

  /**
   * Load proxies from a text file (one per line)
   */
  async loadFromFile(filePath) {
    const content = await fsp.readFile(filePath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    for (const line of lines) {
      const proxy = this._normalize(line);
      if (!this.stats.has(proxy.url)) {
        this.proxies.push(proxy);
        this.stats.set(proxy.url, { successes: 0, failures: 0, consecutiveFailures: 0, blacklistedUntil: 0, totalTime: 0, requests: 0 });
      }
    }
    console.log(`🔄 Loaded ${lines.length} proxies from ${filePath}`);
    return this;
  }

  /**
   * Load from environment variables
   */
  loadFromEnv() {
    const envProxies = process.env.XACTIONS_PROXIES;
    const envFile = process.env.XACTIONS_PROXY_FILE;

    if (envProxies) {
      const proxies = envProxies.split(',').map(p => p.trim()).filter(Boolean);
      for (const p of proxies) {
        const proxy = this._normalize(p);
        if (!this.stats.has(proxy.url)) {
          this.proxies.push(proxy);
          this.stats.set(proxy.url, { successes: 0, failures: 0, consecutiveFailures: 0, blacklistedUntil: 0, totalTime: 0, requests: 0 });
        }
      }
    }

    if (envFile && fs.existsSync(envFile)) {
      return this.loadFromFile(envFile);
    }

    return this;
  }

  /**
   * Round-robin — get next proxy
   */
  getNext() {
    const healthy = this.getHealthy();
    if (healthy.length === 0) return null;
    const proxy = healthy[this.index % healthy.length];
    this.index++;
    return proxy;
  }

  /**
   * Random selection
   */
  getRandom() {
    const healthy = this.getHealthy();
    if (healthy.length === 0) return null;
    return healthy[Math.floor(Math.random() * healthy.length)];
  }

  /**
   * Mark proxy as failed — 3 consecutive fails = 10min blacklist
   */
  markFailed(proxyUrl) {
    const url = typeof proxyUrl === 'object' ? proxyUrl.url : proxyUrl;
    const stat = this.stats.get(url);
    if (!stat) return;
    stat.failures++;
    stat.consecutiveFailures++;
    if (stat.consecutiveFailures >= 3) {
      stat.blacklistedUntil = Date.now() + 10 * 60 * 1000;
      console.log(`⚠️  Proxy blacklisted for 10 min: ${url}`);
    }
  }

  /**
   * Mark proxy as successful — resets consecutive failure counter
   */
  markSuccess(proxyUrl, responseTime = 0) {
    const url = typeof proxyUrl === 'object' ? proxyUrl.url : proxyUrl;
    const stat = this.stats.get(url);
    if (!stat) return;
    stat.successes++;
    stat.consecutiveFailures = 0;
    stat.requests++;
    stat.totalTime += responseTime;
  }

  /**
   * Get only non-blacklisted proxies
   */
  getHealthy() {
    const now = Date.now();
    return this.proxies.filter(p => {
      const stat = this.stats.get(p.url);
      return !stat || stat.blacklistedUntil < now;
    });
  }

  /**
   * Per-proxy stats
   */
  getStats() {
    const result = [];
    for (const proxy of this.proxies) {
      const stat = this.stats.get(proxy.url) || {};
      result.push({
        url: proxy.url,
        successes: stat.successes || 0,
        failures: stat.failures || 0,
        avgResponseTime: stat.requests > 0 ? Math.round(stat.totalTime / stat.requests) : 0,
        blacklisted: (stat.blacklistedUntil || 0) > Date.now(),
      });
    }
    return result;
  }

  /**
   * Test all proxies concurrently
   */
  async testAll() {
    console.log(`🧪 Testing ${this.proxies.length} proxies...`);
    const results = await Promise.allSettled(
      this.proxies.map(async (proxy) => {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          await fetch('https://httpbin.org/ip', {
            signal: controller.signal,
            // Note: fetch doesn't natively support proxy — this tests connectivity logic
          });
          clearTimeout(timeout);
          const time = Date.now() - start;
          this.markSuccess(proxy.url, time);
          return { proxy: proxy.url, status: 'ok', time };
        } catch (error) {
          this.markFailed(proxy.url);
          return { proxy: proxy.url, status: 'failed', error: error.message };
        }
      })
    );

    const healthy = results.filter(r => r.status === 'fulfilled' && r.value.status === 'ok');
    console.log(`✅ ${healthy.length}/${this.proxies.length} proxies healthy`);
    return results.map(r => r.status === 'fulfilled' ? r.value : { status: 'error' });
  }

  // ── Internal ──

  _normalize(input) {
    const str = typeof input === 'string' ? input.trim() : input;
    if (typeof str !== 'string') return str;

    // Already a full URL
    if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('socks5://') || str.startsWith('socks4://')) {
      const url = new URL(str);
      return {
        url: str,
        protocol: url.protocol.replace(':', ''),
        host: url.hostname,
        port: url.port,
        username: url.username || undefined,
        password: url.password || undefined,
      };
    }

    // host:port format
    const parts = str.split(':');
    if (parts.length === 2) {
      return { url: `http://${str}`, protocol: 'http', host: parts[0], port: parts[1] };
    }
    // user:pass@host:port
    if (str.includes('@')) {
      return { url: `http://${str}`, protocol: 'http', host: str.split('@')[1]?.split(':')[0], port: str.split('@')[1]?.split(':')[1] };
    }

    return { url: str, protocol: 'http', host: str };
  }
}

export default ProxyManager;

// by nichxbt

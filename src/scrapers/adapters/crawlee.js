/**
 * XActions Scraper Adapter — Crawlee
 * 
 * Adapter wrapping Crawlee (by Apify) — the best-in-class Node.js crawling framework.
 * Adds smart request queuing, automatic retries, proxy rotation, session management,
 * and anti-blocking measures on top of Puppeteer or Playwright.
 * 
 * Best for: production-scale scraping, rotating proxies, managing large crawl jobs,
 * automatic retry/error handling, respecting rate limits.
 * 
 * Crawlee can use either Puppeteer or Playwright as its underlying browser.
 * 
 * Install: npm install crawlee
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

import { BaseAdapter } from './base.js';

export class CrawleeAdapter extends BaseAdapter {
  name = 'crawlee';
  description = 'Crawlee (Apify) — smart crawling with auto-retry, proxy rotation, session management, request queuing';
  supportsJavaScript = true;
  requiresBrowser = true;

  #crawlee = null;

  async #getCrawlee() {
    if (!this.#crawlee) {
      this.#crawlee = await import('crawlee');
    }
    return this.#crawlee;
  }

  async checkDependencies() {
    try {
      await import('crawlee');
      return { available: true };
    } catch (e) {
      return {
        available: false,
        message: 'Install crawlee: npm install crawlee',
      };
    }
  }

  /**
   * Launch a Crawlee browser pool.
   * 
   * Options:
   *   - browserPlugin: 'puppeteer' (default) or 'playwright'
   *   - proxyUrls: string[] of proxy URLs for rotation
   *   - maxConcurrency: max concurrent pages (default 1)
   *   - sessionPoolOptions: Crawlee session pool config
   */
  async launch(options = {}) {
    const crawlee = await this.#getCrawlee();
    const browserPlugin = options.browserPlugin || 'puppeteer';

    let launcherClass;
    let launchContext = {
      launchOptions: {
        headless: options.headless !== false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          ...(options.args || []),
        ],
      },
    };

    // Determine which browser to use under Crawlee
    if (browserPlugin === 'playwright') {
      try {
        const { PlaywrightCrawler } = crawlee;
        launcherClass = PlaywrightCrawler;
      } catch {
        throw new Error('Crawlee with Playwright requires: npm install crawlee playwright');
      }
    } else {
      try {
        const { PuppeteerCrawler } = crawlee;
        launcherClass = PuppeteerCrawler;
      } catch {
        throw new Error('Crawlee with Puppeteer requires: npm install crawlee puppeteer');
      }
    }

    // Build proxy configuration if provided
    let proxyConfiguration = null;
    if (options.proxyUrls?.length) {
      proxyConfiguration = new crawlee.ProxyConfiguration({
        proxyUrls: options.proxyUrls,
      });
    }

    // For the adapter pattern, we don't create a full crawler — we use the BrowserPool directly
    // This gives us raw page access while benefiting from Crawlee's browser management
    let BrowserPool, PuppeteerPlugin, PlaywrightPlugin;
    try {
      const bp = await import('@crawlee/browser-pool');
      BrowserPool = bp.BrowserPool;
      PuppeteerPlugin = bp.PuppeteerPlugin;
      PlaywrightPlugin = bp.PlaywrightPlugin;
    } catch {
      // Fallback: crawlee re-exports these
      BrowserPool = crawlee.BrowserPool;
      PuppeteerPlugin = crawlee.PuppeteerPlugin;
      PlaywrightPlugin = crawlee.PlaywrightPlugin;
    }

    let plugin;
    if (browserPlugin === 'playwright') {
      const pw = await import('playwright');
      plugin = new PlaywrightPlugin(pw.chromium, {
        launchOptions: launchContext.launchOptions,
      });
    } else {
      const pptr = await import('puppeteer');
      plugin = new PuppeteerPlugin(pptr.default, {
        launchOptions: launchContext.launchOptions,
      });
    }

    const browserPool = new BrowserPool({
      browserPlugins: [plugin],
      maxOpenPagesPerBrowser: options.maxPagesPerBrowser || 3,
      retireBrowserAfterPageCount: options.retireAfter || 20,
    });

    return {
      _native: browserPool,
      _adapter: this.name,
      _browserPlugin: browserPlugin,
      _proxyConfiguration: proxyConfiguration,
      _crawlee: crawlee,
    };
  }

  async newPage(browser, options = {}) {
    const page = await browser._native.newPage();
    const nativePage = page;

    // Set viewport and UA on the underlying page
    if (browser._browserPlugin === 'playwright') {
      // Playwright pages from BrowserPool
    } else {
      // Puppeteer pages
      try {
        const width = options.viewport?.width || 1280 + Math.floor(Math.random() * 100);
        const height = options.viewport?.height || 800;
        await nativePage.setViewport({ width, height });
        await nativePage.setUserAgent(
          options.userAgent ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );
      } catch {
        // BrowserPool page may not support these directly
      }
    }

    return {
      _native: nativePage,
      _adapter: this.name,
      _browserPool: browser._native,
    };
  }

  async goto(page, url, options = {}) {
    const waitUntilMap = {
      load: 'load',
      domcontentloaded: 'domcontentloaded',
      networkidle: 'networkidle2',
      networkidle0: 'networkidle0',
      networkidle2: 'networkidle2',
    };
    const waitUntil = waitUntilMap[options.waitUntil] || options.waitUntil || 'networkidle2';
    await page._native.goto(url, { waitUntil, timeout: options.timeout || 30000 });
  }

  async evaluate(page, fn, ...args) {
    return page._native.evaluate(fn, ...args);
  }

  async queryAll(page, selector, mapFn) {
    if (mapFn) {
      return page._native.$$eval(selector, mapFn);
    }
    return page._native.$$(selector);
  }

  async getContent(page) {
    return page._native.content();
  }

  async setCookie(page, cookie) {
    // Try Puppeteer style first, fallback to Playwright style
    if (typeof page._native.setCookie === 'function') {
      await page._native.setCookie(cookie);
    } else if (page._native.context) {
      await page._native.context().addCookies([{
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false,
      }]);
    }
  }

  async scroll(page, options = {}) {
    if (options.y !== undefined) {
      await page._native.evaluate((y) => window.scrollBy(0, y), options.y);
    } else {
      await page._native.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }
  }

  async screenshot(page, options = {}) {
    return page._native.screenshot(options);
  }

  async waitForSelector(page, selector, options = {}) {
    await page._native.waitForSelector(selector, { timeout: options.timeout || 30000 });
  }

  async closePage(page) {
    if (page._browserPool) {
      // Return page to pool instead of closing browser
      try {
        await page._native.close();
      } catch {
        // Page may already be closed
      }
    } else {
      await page._native.close();
    }
  }

  async closeBrowser(browser) {
    await browser._native.destroy();
  }

  /**
   * Crawlee-specific: Create a full PuppeteerCrawler or PlaywrightCrawler
   * for batch crawling jobs with automatic queuing, retry, and proxy rotation.
   * 
   * This is the "Crawlee way" — you define a requestHandler and let Crawlee
   * manage the crawl lifecycle.
   * 
   * @param {Object} options
   * @param {Function} options.requestHandler - async (context) => { ... }
   * @param {string[]} [options.startUrls] - URLs to crawl
   * @param {number} [options.maxRequestsPerCrawl] - Limit total requests
   * @param {number} [options.maxConcurrency] - Concurrent pages
   * @param {string[]} [options.proxyUrls] - Proxy URLs for rotation
   * @returns {Object} Crawler instance with run() method
   */
  async createCrawler(options = {}) {
    const crawlee = await this.#getCrawlee();
    const { PuppeteerCrawler, ProxyConfiguration } = crawlee;

    const crawlerOptions = {
      requestHandler: options.requestHandler,
      maxRequestsPerCrawl: options.maxRequestsPerCrawl || 100,
      maxConcurrency: options.maxConcurrency || 1,
      launchContext: {
        launchOptions: {
          headless: options.headless !== false,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    };

    if (options.proxyUrls?.length) {
      crawlerOptions.proxyConfiguration = new ProxyConfiguration({
        proxyUrls: options.proxyUrls,
      });
    }

    return new PuppeteerCrawler(crawlerOptions);
  }

  getNativePage(page) {
    return page._native;
  }

  getNativeBrowser(browser) {
    return browser._native;
  }
}

export default CrawleeAdapter;

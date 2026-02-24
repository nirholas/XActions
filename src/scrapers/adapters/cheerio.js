/**
 * XActions Scraper Adapter — HTTP/Cheerio
 * 
 * Lightweight adapter using HTTP requests + Cheerio for HTML parsing.
 * No browser required — much faster and uses far less memory.
 * 
 * Best for: scraping public pages that don't need JS, quick data extraction,
 * CI/CD environments without browser binaries.
 * 
 * Limitation: Cannot execute JavaScript in page context. Pages that require
 * client-side JS rendering (most of x.com) need a browser adapter instead.
 * This adapter is ideal for pre-rendered pages, APIs, or cached/static content.
 * 
 * Install: npm install cheerio
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

import { BaseAdapter } from './base.js';

export class CheerioAdapter extends BaseAdapter {
  name = 'cheerio';
  description = 'HTTP + Cheerio — lightweight HTML parsing, no browser needed, fast but no JS execution';
  supportsJavaScript = false;
  requiresBrowser = false;

  #cheerio = null;

  async #getCheerio() {
    if (!this.#cheerio) {
      this.#cheerio = await import('cheerio');
    }
    return this.#cheerio;
  }

  async checkDependencies() {
    try {
      await import('cheerio');
      return { available: true };
    } catch (e) {
      return {
        available: false,
        message: 'Install cheerio: npm install cheerio',
      };
    }
  }

  async launch(options = {}) {
    // No browser to launch — just store config
    return {
      _native: null,
      _adapter: this.name,
      _options: {
        headers: {
          'User-Agent': options.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          ...options.headers,
        },
        proxy: options.proxy || null,
        timeout: options.timeout || 30000,
      },
      _cookies: new Map(),
    };
  }

  async newPage(browser, options = {}) {
    const cheerio = await this.#getCheerio();
    return {
      _native: null,     // Will hold the cheerio $ instance after navigation
      _adapter: this.name,
      _browser: browser,  // Reference to "browser" for config
      _html: '',
      _url: '',
      _cookies: new Map(browser._cookies),
      _headers: { ...browser._options.headers },
      _cheerio: cheerio,
    };
  }

  async goto(page, url, options = {}) {
    const cookieStr = Array.from(page._cookies.entries())
      .map(([name, val]) => `${name}=${val}`)
      .join('; ');

    const headers = { ...page._headers };
    if (cookieStr) headers['Cookie'] = cookieStr;

    const fetchOptions = {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(page._browser._options.timeout),
    };

    // Support proxy via environment (https_proxy) — direct proxy support
    // would need a package like undici/proxy-agent
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} — ${url}`);
    }

    page._html = await response.text();
    page._url = url;
    page._native = page._cheerio.load(page._html);
  }

  async evaluate(page, fn, ...args) {
    // Cheerio cannot execute JS in a page context.
    // Instead, provide the parsed $ (cheerio instance) to a compatible evaluator.
    throw new Error(
      'CheerioAdapter does not support evaluate() — use queryAll() or getContent() instead, ' +
      'or switch to a browser adapter (puppeteer/playwright) for JS-heavy pages.'
    );
  }

  /**
   * Query elements with Cheerio and optionally map them.
   * The mapFn receives a Cheerio-wrapped element and the Cheerio instance.
   * 
   * @param {Object} page
   * @param {string} selector
   * @param {Function} [mapFn] - (elements$, $) => array — receives Cheerio collection
   * @returns {Promise<Array>}
   */
  async queryAll(page, selector, mapFn) {
    if (!page._native) {
      throw new Error('No page loaded — call goto() first');
    }
    const $ = page._native;
    const elements = $(selector);

    if (mapFn) {
      // mapFn gets the cheerio elements array and $ context
      return mapFn(elements, $);
    }

    // Return array of element outer HTML
    const results = [];
    elements.each((_, el) => {
      results.push($.html(el));
    });
    return results;
  }

  async getContent(page) {
    return page._html;
  }

  async setCookie(page, cookie) {
    page._cookies.set(cookie.name, cookie.value);
    // Also set on browser for new pages
    page._browser._cookies.set(cookie.name, cookie.value);
  }

  async scroll(page, options = {}) {
    // No-op for HTTP adapter — pages are fetched fully
  }

  async screenshot(page, options = {}) {
    // Can't screenshot without a browser, but we can save the HTML
    if (options.path) {
      const fs = await import('fs/promises');
      await fs.writeFile(options.path.replace(/\.(png|jpg)$/, '.html'), page._html);
    }
    return Buffer.from(page._html);
  }

  async waitForSelector(page, selector, options = {}) {
    if (!page._native) {
      throw new Error('No page loaded');
    }
    const $ = page._native;
    if ($(selector).length === 0) {
      throw new Error(`Selector "${selector}" not found in static HTML`);
    }
  }

  async closePage(page) {
    page._native = null;
    page._html = '';
  }

  async closeBrowser(browser) {
    // Nothing to close
    browser._cookies.clear();
  }

  /**
   * Cheerio-specific: Parse arbitrary HTML string
   * @param {string} html
   * @returns {Object} Cheerio $ instance
   */
  async parseHTML(html) {
    const cheerio = await this.#getCheerio();
    return cheerio.load(html);
  }

  /**
   * Make a raw HTTP request (useful for APIs, JSON endpoints)
   * @param {string} url
   * @param {Object} [options] - fetch() options
   * @returns {Promise<*>} Parsed JSON or text
   */
  async fetchJSON(url, options = {}) {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'XActions/3.0 (https://xactions.app)',
        ...options.headers,
      },
      ...options,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }
}

export default CheerioAdapter;

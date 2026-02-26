/**
 * XActions Scraper Adapter — HTTP (GraphQL)
 * 
 * Adapter that wraps the Twitter HTTP/GraphQL scraper into the adapter
 * interface, so users can switch between Puppeteer and HTTP with a single
 * config change: `createBrowser({ adapter: 'http' })`.
 * 
 * No browser binary required. 10x faster. Works in serverless/edge.
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

import { BaseAdapter } from './base.js';

export class HttpAdapter extends BaseAdapter {
  name = 'http';
  description = 'Direct HTTP/GraphQL — no browser needed, 10x faster, works in serverless/edge';
  supportsJavaScript = false;
  requiresBrowser = false;

  async checkDependencies() {
    // The HTTP scraper has no external deps beyond what's in the project
    try {
      await import('../twitter/http/client.js');
      return { available: true };
    } catch (e) {
      return {
        available: false,
        message: 'HTTP scraper modules not found. Ensure src/scrapers/twitter/http/ is present.',
      };
    }
  }

  /**
   * "Launch" for HTTP means creating a client instance (no browser to spawn).
   * @param {Object} options
   * @param {string} [options.cookies] - Browser cookie string for auth
   * @param {string} [options.proxy] - HTTP/SOCKS5 proxy URL
   * @param {'wait'|'error'} [options.rateLimitStrategy] - Rate limit handling
   * @returns {Promise<Object>} Browser-like object wrapping the HTTP scraper
   */
  async launch(options = {}) {
    const { createHttpScraper } = await import('../twitter/http/index.js');
    const scraper = await createHttpScraper(options);
    return {
      _native: scraper.client,
      _adapter: this.name,
      _scraper: scraper,
      ...scraper,
    };
  }

  /**
   * HTTP doesn't have pages — return the scraper itself as the "page".
   * @param {Object} browser - Object returned by launch()
   * @param {Object} [options] - Ignored for HTTP
   * @returns {Promise<Object>}
   */
  async newPage(browser, options = {}) {
    return {
      _native: browser._scraper,
      _adapter: this.name,
      ...browser._scraper,
    };
  }

  async goto(page, url, options = {}) {
    // HTTP adapter doesn't navigate — scraping is done via direct API calls.
    // This is a no-op to satisfy the interface.
  }

  async evaluate(page, fn, ...args) {
    throw new Error('HttpAdapter: evaluate() is not supported — HTTP adapter does not run JavaScript in a page context');
  }

  async queryAll(page, selector, mapFn) {
    throw new Error('HttpAdapter: queryAll() is not supported — use scraper methods (scrapeProfile, scrapeTweets, etc.) instead');
  }

  async getContent(page) {
    throw new Error('HttpAdapter: getContent() is not supported — use scraper methods instead');
  }

  /**
   * Set a cookie on the HTTP client.
   * @param {Object} page - Page-like object from newPage()
   * @param {Object} cookie - Cookie to set
   * @param {string} cookie.name
   * @param {string} cookie.value
   */
  async setCookie(page, cookie) {
    const client = page._native?.client || page.client;
    if (client && typeof client.setCookies === 'function') {
      client.setCookies(`${cookie.name}=${cookie.value}`);
    }
  }

  async scroll(page, options = {}) {
    // No-op — HTTP adapter doesn't have a viewport to scroll
  }

  async screenshot(page, options = {}) {
    throw new Error('HttpAdapter: screenshot() is not supported — HTTP adapter has no visual output');
  }

  async waitForSelector(page, selector, options = {}) {
    // No-op — HTTP adapter doesn't render DOM
  }

  async closePage(page) {
    // No-op — nothing to close
  }

  async closeBrowser(browser) {
    // No-op — no browser process to terminate
  }

  /**
   * Get the underlying HTTP scraper object for direct access.
   * @param {Object} browser - Object returned by launch()
   * @returns {Object} The scraper with all bound methods
   */
  getScraper(browser) {
    return browser._scraper;
  }
}

export default HttpAdapter;

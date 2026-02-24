/**
 * XActions Scraper Adapter — Got-Scraping + JSDOM
 * 
 * HTTP scraping with browser-like TLS fingerprints + full DOM API emulation.
 * 
 * got-scraping: HTTP client that mimics real browser TLS/HTTP2 fingerprints,
 * making requests look identical to Chrome, Firefox, or Safari to bypass
 * bot detection that inspects TLS handshake signatures.
 * 
 * JSDOM: Full DOM implementation in Node.js — supports querySelector, innerHTML,
 * textContent, and most DOM APIs. Unlike Cheerio, JSDOM can optionally execute
 * basic JavaScript (inline scripts, timers) for light JS rendering.
 * 
 * Best for: bypassing TLS fingerprint detection without a full browser, parsing
 * pages that need basic DOM APIs, server-rendered pages with light JS.
 * 
 * Install: npm install got-scraping jsdom
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

import { BaseAdapter } from './base.js';

export class GotJsdomAdapter extends BaseAdapter {
  name = 'got-jsdom';
  description = 'Got-Scraping + JSDOM — browser TLS fingerprints, full DOM API, optional light JS execution';
  supportsJavaScript = true; // JSDOM can run basic scripts
  requiresBrowser = false;

  #gotScraping = null;
  #jsdom = null;

  async #getGotScraping() {
    if (!this.#gotScraping) {
      this.#gotScraping = await import('got-scraping');
    }
    return this.#gotScraping;
  }

  async #getJSDOM() {
    if (!this.#jsdom) {
      this.#jsdom = await import('jsdom');
    }
    return this.#jsdom;
  }

  async checkDependencies() {
    const missing = [];
    try { await import('got-scraping'); } catch { missing.push('got-scraping'); }
    try { await import('jsdom'); } catch { missing.push('jsdom'); }

    if (missing.length) {
      return {
        available: false,
        message: `Install missing packages: npm install ${missing.join(' ')}`,
      };
    }
    return { available: true };
  }

  /**
   * Launch creates a configured HTTP session context.
   * 
   * Options:
   *   - headerGeneratorOptions: got-scraping header generation config
   *   - proxyUrl: single proxy URL
   *   - fingerprint: 'chrome' | 'firefox' | 'safari' (browser to mimic)
   *   - runScripts: 'dangerously' | 'outside-only' | false (JSDOM script execution)
   */
  async launch(options = {}) {
    const { gotScraping } = await this.#getGotScraping();

    // Create a got-scraping instance with session-level defaults
    const sessionOptions = {
      headerGeneratorOptions: {
        browsers: [{ name: options.fingerprint || 'chrome' }],
        ...options.headerGeneratorOptions,
      },
    };

    if (options.proxyUrl) {
      sessionOptions.proxyUrl = options.proxyUrl;
    }

    return {
      _native: gotScraping,
      _adapter: this.name,
      _sessionOptions: sessionOptions,
      _cookies: new Map(),
      _runScripts: options.runScripts || false,
      _fingerprint: options.fingerprint || 'chrome',
    };
  }

  async newPage(browser, options = {}) {
    return {
      _native: null,           // JSDOM instance, set after goto()
      _adapter: this.name,
      _browser: browser,
      _dom: null,              // JSDOM dom object
      _window: null,           // JSDOM window
      _document: null,         // JSDOM document
      _html: '',
      _url: '',
      _cookies: new Map(browser._cookies),
      _headers: {
        'User-Agent': options.userAgent ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    };
  }

  async goto(page, url, options = {}) {
    const { gotScraping } = await this.#getGotScraping();
    const { JSDOM } = await this.#getJSDOM();

    // Build cookie header
    const cookieStr = Array.from(page._cookies.entries())
      .map(([name, val]) => `${name}=${val}`)
      .join('; ');

    const requestOptions = {
      ...page._browser._sessionOptions,
      headers: {
        ...page._headers,
        ...(cookieStr ? { Cookie: cookieStr } : {}),
      },
      timeout: { request: options.timeout || 30000 },
      followRedirect: true,
    };

    if (page._browser._sessionOptions.proxyUrl) {
      requestOptions.proxyUrl = page._browser._sessionOptions.proxyUrl;
    }

    const response = await gotScraping({
      url,
      ...requestOptions,
    });

    page._html = response.body;
    page._url = url;

    // Parse with JSDOM
    const jsdomOptions = {
      url,
      contentType: 'text/html',
      pretendToBeVisual: true,
      resources: 'usable',
    };

    // Enable script execution if configured
    if (page._browser._runScripts) {
      jsdomOptions.runScripts = page._browser._runScripts;
    }

    page._dom = new JSDOM(page._html, jsdomOptions);
    page._window = page._dom.window;
    page._document = page._dom.window.document;
    page._native = page._dom;

    // Extract cookies from response
    const setCookies = response.headers['set-cookie'];
    if (setCookies) {
      const cookieArray = Array.isArray(setCookies) ? setCookies : [setCookies];
      for (const cookie of cookieArray) {
        const [nameValue] = cookie.split(';');
        const [name, ...valueParts] = nameValue.split('=');
        if (name && valueParts.length) {
          page._cookies.set(name.trim(), valueParts.join('=').trim());
        }
      }
    }
  }

  /**
   * Execute JavaScript against the JSDOM window.
   * 
   * Note: JSDOM's JS execution is limited. For full browser JS, use
   * puppeteer/playwright. This handles basic DOM manipulation and queries.
   * 
   * The function runs with the JSDOM window and document in scope.
   */
  async evaluate(page, fn, ...args) {
    if (!page._window) {
      throw new Error('No page loaded — call goto() first');
    }

    // If runScripts is enabled, we can eval in the JSDOM context
    if (page._browser._runScripts) {
      const fnStr = typeof fn === 'function' ? `(${fn.toString()})(${args.map(a => JSON.stringify(a)).join(',')})` : fn;
      return page._dom.window.eval(fnStr);
    }

    // Otherwise, run the function with window/document available
    // This simulates page.evaluate by providing DOM access
    if (typeof fn === 'function') {
      // Create a context with window-like globals
      const { window } = page._dom;
      const { document } = window;

      // Execute with JSDOM's document context
      // We wrap in an async IIFE to support async functions
      const wrappedFn = new Function('window', 'document', 'navigator', ...args.map((_, i) => `__arg${i}`),
        `const result = (${fn.toString()})(${args.map((_, i) => `__arg${i}`).join(',')});
         return result;`
      );
      return wrappedFn(window, document, window.navigator, ...args);
    }

    throw new Error('evaluate() requires a function when runScripts is not enabled');
  }

  async queryAll(page, selector, mapFn) {
    if (!page._document) {
      throw new Error('No page loaded — call goto() first');
    }

    const elements = page._document.querySelectorAll(selector);

    if (mapFn) {
      // For JSDOM, mapFn gets a NodeList and the document
      return mapFn(Array.from(elements), page._document);
    }

    return Array.from(elements);
  }

  async getContent(page) {
    if (page._dom) {
      return page._dom.serialize();
    }
    return page._html;
  }

  async setCookie(page, cookie) {
    page._cookies.set(cookie.name, cookie.value);
    page._browser._cookies.set(cookie.name, cookie.value);
  }

  async scroll(page, options = {}) {
    // JSDOM doesn't have a real viewport, but we can simulate scroll events
    if (page._window) {
      page._window.scrollY = options.y || page._document.body.scrollHeight;
      page._window.dispatchEvent(new page._window.Event('scroll'));
    }
  }

  async screenshot(page, options = {}) {
    // Can't take visual screenshots, save HTML instead
    const html = page._dom ? page._dom.serialize() : page._html;
    if (options.path) {
      const fs = await import('fs/promises');
      await fs.writeFile(options.path.replace(/\.(png|jpg|jpeg)$/, '.html'), html);
    }
    return Buffer.from(html);
  }

  async waitForSelector(page, selector, options = {}) {
    if (!page._document) {
      throw new Error('No page loaded');
    }

    const el = page._document.querySelector(selector);
    if (!el) {
      throw new Error(`Selector "${selector}" not found in DOM`);
    }
  }

  async closePage(page) {
    if (page._dom) {
      page._dom.window.close();
      page._dom = null;
      page._window = null;
      page._document = null;
    }
    page._html = '';
  }

  async closeBrowser(browser) {
    browser._cookies.clear();
  }

  /**
   * Got-Scraping specific: Make a raw HTTP request with browser TLS fingerprints.
   * Useful for API endpoints or when you need the raw response.
   * 
   * @param {string} url
   * @param {Object} [options] - got-scraping options
   * @returns {Promise<Object>} Response with body, statusCode, headers
   */
  async fetch(url, options = {}) {
    const { gotScraping } = await this.#getGotScraping();
    return gotScraping({ url, ...options });
  }

  /**
   * Got-Scraping specific: Make a JSON API request with browser fingerprints.
   */
  async fetchJSON(url, options = {}) {
    const { gotScraping } = await this.#getGotScraping();
    const response = await gotScraping({
      url,
      responseType: 'json',
      headers: {
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    return response.body;
  }

  /**
   * Got-Scraping specific: Switch the TLS fingerprint being mimicked.
   * @param {'chrome'|'firefox'|'safari'} browser
   */
  setFingerprint(browser, fingerprint) {
    browser._fingerprint = fingerprint;
    browser._sessionOptions.headerGeneratorOptions.browsers = [{ name: fingerprint }];
  }

  getNativePage(page) {
    return page._dom;
  }

  getNativeBrowser(browser) {
    return browser._native;
  }
}

export default GotJsdomAdapter;

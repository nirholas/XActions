/**
 * XActions Scraper Adapter — Base Class
 * 
 * Abstract interface that all scraper framework adapters must implement.
 * This enables XActions to work with Puppeteer, Playwright, HTTP/Cheerio,
 * or any other scraping framework.
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

/**
 * @typedef {Object} AdapterBrowser
 * @property {Function} newPage - Create a new page/context
 * @property {Function} close - Close the browser
 * @property {*} _native - The underlying native browser instance
 */

/**
 * @typedef {Object} AdapterPage
 * @property {Function} goto - Navigate to a URL
 * @property {Function} evaluate - Execute JS in page context (browser adapters)
 * @property {Function} querySelectorAll - Query DOM elements
 * @property {Function} setCookie - Set a cookie
 * @property {Function} setViewport - Set viewport size
 * @property {Function} setUserAgent - Set user agent string
 * @property {Function} scroll - Scroll the page
 * @property {Function} close - Close the page
 * @property {*} _native - The underlying native page instance
 */

export class BaseAdapter {
  /** @type {string} Adapter name */
  name = 'base';

  /** @type {string} Adapter description */
  description = 'Abstract base adapter';

  /** @type {boolean} Whether this adapter supports JavaScript execution */
  supportsJavaScript = false;

  /** @type {boolean} Whether this adapter needs a browser binary */
  requiresBrowser = false;

  /**
   * Check if this adapter's dependencies are available
   * @returns {Promise<{ available: boolean, message?: string }>}
   */
  async checkDependencies() {
    throw new Error(`${this.name}: checkDependencies() not implemented`);
  }

  /**
   * Launch a browser instance (or equivalent context)
   * @param {Object} options
   * @param {boolean} [options.headless=true] - Run in headless mode
   * @param {string[]} [options.args] - Additional browser arguments
   * @param {Object} [options.proxy] - Proxy configuration
   * @returns {Promise<AdapterBrowser>}
   */
  async launch(options = {}) {
    throw new Error(`${this.name}: launch() not implemented`);
  }

  /**
   * Create a new page with realistic settings
   * @param {AdapterBrowser} browser
   * @param {Object} [options]
   * @param {string} [options.userAgent] - Custom user agent
   * @param {{ width: number, height: number }} [options.viewport] - Viewport size
   * @returns {Promise<AdapterPage>}
   */
  async newPage(browser, options = {}) {
    throw new Error(`${this.name}: newPage() not implemented`);
  }

  /**
   * Navigate to a URL
   * @param {AdapterPage} page
   * @param {string} url
   * @param {Object} [options]
   * @param {string} [options.waitUntil] - Wait until condition ('load', 'domcontentloaded', 'networkidle')
   * @param {number} [options.timeout] - Navigation timeout in ms
   * @returns {Promise<void>}
   */
  async goto(page, url, options = {}) {
    throw new Error(`${this.name}: goto() not implemented`);
  }

  /**
   * Execute JavaScript in page context
   * Only available for browser-based adapters (supportsJavaScript === true)
   * @param {AdapterPage} page
   * @param {Function|string} fn - Function or string to evaluate
   * @param {...*} args - Arguments to pass to the function
   * @returns {Promise<*>} Result of evaluation
   */
  async evaluate(page, fn, ...args) {
    throw new Error(`${this.name}: evaluate() not implemented — this adapter does not support JS execution`);
  }

  /**
   * Query all matching elements and extract data
   * Works for both browser and HTTP adapters
   * @param {AdapterPage} page
   * @param {string} selector - CSS selector
   * @param {Function} [mapFn] - Function to map each element (receives element)
   * @returns {Promise<Array>}
   */
  async queryAll(page, selector, mapFn) {
    throw new Error(`${this.name}: queryAll() not implemented`);
  }

  /**
   * Get the full HTML content of the page
   * @param {AdapterPage} page
   * @returns {Promise<string>}
   */
  async getContent(page) {
    throw new Error(`${this.name}: getContent() not implemented`);
  }

  /**
   * Set a cookie on the page/context
   * @param {AdapterPage} page
   * @param {Object} cookie
   * @param {string} cookie.name
   * @param {string} cookie.value
   * @param {string} cookie.domain
   * @param {string} [cookie.path]
   * @param {boolean} [cookie.httpOnly]
   * @param {boolean} [cookie.secure]
   * @returns {Promise<void>}
   */
  async setCookie(page, cookie) {
    throw new Error(`${this.name}: setCookie() not implemented`);
  }

  /**
   * Scroll the page
   * @param {AdapterPage} page
   * @param {Object} [options]
   * @param {number} [options.x=0] - Horizontal scroll
   * @param {number} [options.y] - Vertical scroll (defaults to bottom)
   * @returns {Promise<void>}
   */
  async scroll(page, options = {}) {
    throw new Error(`${this.name}: scroll() not implemented`);
  }

  /**
   * Take a screenshot
   * @param {AdapterPage} page
   * @param {Object} [options]
   * @param {string} [options.path] - File path to save
   * @param {boolean} [options.fullPage] - Capture full page
   * @returns {Promise<Buffer>}
   */
  async screenshot(page, options = {}) {
    throw new Error(`${this.name}: screenshot() not implemented`);
  }

  /**
   * Wait for a selector to appear
   * @param {AdapterPage} page
   * @param {string} selector
   * @param {Object} [options]
   * @param {number} [options.timeout=30000]
   * @returns {Promise<void>}
   */
  async waitForSelector(page, selector, options = {}) {
    throw new Error(`${this.name}: waitForSelector() not implemented`);
  }

  /**
   * Close a page
   * @param {AdapterPage} page
   * @returns {Promise<void>}
   */
  async closePage(page) {
    throw new Error(`${this.name}: closePage() not implemented`);
  }

  /**
   * Close a browser instance
   * @param {AdapterBrowser} browser
   * @returns {Promise<void>}
   */
  async closeBrowser(browser) {
    throw new Error(`${this.name}: closeBrowser() not implemented`);
  }

  /**
   * Get adapter info
   * @returns {Object}
   */
  getInfo() {
    return {
      name: this.name,
      description: this.description,
      supportsJavaScript: this.supportsJavaScript,
      requiresBrowser: this.requiresBrowser,
    };
  }
}

export default BaseAdapter;

/**
 * XActions Scraper Adapter — Playwright
 * 
 * Adapter wrapping Playwright for browser automation.
 * Supports Chromium, Firefox, and WebKit.
 * Better auto-wait, trace recording, and CI support than Puppeteer.
 * 
 * Install: npm install playwright
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

import { BaseAdapter } from './base.js';

export class PlaywrightAdapter extends BaseAdapter {
  name = 'playwright';
  description = 'Playwright — multi-browser (Chromium/Firefox/WebKit), auto-wait, better CI support';
  supportsJavaScript = true;
  requiresBrowser = true;

  #playwright = null;

  async #getPlaywright() {
    if (!this.#playwright) {
      this.#playwright = await import('playwright');
    }
    return this.#playwright;
  }

  async checkDependencies() {
    try {
      await import('playwright');
      return { available: true };
    } catch (e) {
      return {
        available: false,
        message: 'Install playwright: npm install playwright && npx playwright install chromium',
      };
    }
  }

  async launch(options = {}) {
    const pw = await this.#getPlaywright();
    const browserType = options.browser || 'chromium'; // 'chromium', 'firefox', 'webkit'
    const launcher = pw[browserType] || pw.chromium;

    const launchOptions = {
      headless: options.headless !== false,
      args: [
        '--disable-blink-features=AutomationControlled',
        ...(options.args || []),
      ],
    };

    if (options.proxy) {
      launchOptions.proxy = {
        server: options.proxy.server,
        username: options.proxy.username,
        password: options.proxy.password,
      };
    }

    const browser = await launcher.launch(launchOptions);
    return { _native: browser, _adapter: this.name, _browserType: browserType };
  }

  async newPage(browser, options = {}) {
    const width = options.viewport?.width || 1280 + Math.floor(Math.random() * 100);
    const height = options.viewport?.height || 800;

    const contextOptions = {
      viewport: { width, height },
      userAgent: options.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    // Playwright uses browser contexts for isolation
    const context = await browser._native.newContext(contextOptions);
    const page = await context.newPage();

    return { _native: page, _context: context, _adapter: this.name };
  }

  async goto(page, url, options = {}) {
    const waitUntilMap = {
      load: 'load',
      domcontentloaded: 'domcontentloaded',
      networkidle: 'networkidle',
      networkidle0: 'networkidle',
      networkidle2: 'networkidle',
    };
    const waitUntil = waitUntilMap[options.waitUntil] || options.waitUntil || 'networkidle';
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
    // Playwright sets cookies on the browser context
    const context = page._context || page._native.context();
    await context.addCookies([{
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      httpOnly: cookie.httpOnly || false,
      secure: cookie.secure || false,
    }]);
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
    if (page._context) {
      await page._context.close();
    } else {
      await page._native.close();
    }
  }

  async closeBrowser(browser) {
    await browser._native.close();
  }

  /**
   * Start tracing (Playwright-specific — useful for debugging)
   */
  async startTracing(page, options = {}) {
    const context = page._context || page._native.context();
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      ...options,
    });
  }

  /**
   * Stop tracing and save
   */
  async stopTracing(page, path = 'trace.zip') {
    const context = page._context || page._native.context();
    await context.tracing.stop({ path });
  }

  /**
   * Route interception (Playwright-specific)
   * Block images, CSS, fonts to speed up scraping
   */
  async blockResources(page, resourceTypes = ['image', 'stylesheet', 'font']) {
    await page._native.route('**/*', (route) => {
      if (resourceTypes.includes(route.request().resourceType())) {
        route.abort();
      } else {
        route.continue();
      }
    });
  }

  getNativePage(page) {
    return page._native;
  }

  getNativeBrowser(browser) {
    return browser._native;
  }
}

export default PlaywrightAdapter;

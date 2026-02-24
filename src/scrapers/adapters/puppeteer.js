/**
 * XActions Scraper Adapter — Puppeteer
 * 
 * Adapter wrapping puppeteer-extra with stealth plugin.
 * This is the default adapter — matches the original XActions scraper behavior.
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

import { BaseAdapter } from './base.js';

export class PuppeteerAdapter extends BaseAdapter {
  name = 'puppeteer';
  description = 'Puppeteer with stealth plugin — full browser automation, JS execution, best anti-detection';
  supportsJavaScript = true;
  requiresBrowser = true;

  #puppeteer = null;

  async #getPuppeteer() {
    if (!this.#puppeteer) {
      const puppeteer = await import('puppeteer-extra');
      const StealthPlugin = await import('puppeteer-extra-plugin-stealth');
      puppeteer.default.use(StealthPlugin.default());
      this.#puppeteer = puppeteer.default;
    }
    return this.#puppeteer;
  }

  async checkDependencies() {
    try {
      await import('puppeteer-extra');
      await import('puppeteer-extra-plugin-stealth');
      return { available: true };
    } catch (e) {
      return {
        available: false,
        message: 'Install puppeteer: npm install puppeteer puppeteer-extra puppeteer-extra-plugin-stealth',
      };
    }
  }

  async launch(options = {}) {
    const puppeteer = await this.#getPuppeteer();
    const browser = await puppeteer.launch({
      headless: options.headless !== false ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        ...(options.args || []),
      ],
      ...(options.proxy ? { args: [...(options.args || []), `--proxy-server=${options.proxy.server}`] } : {}),
      ...options,
    });
    return { _native: browser, _adapter: this.name };
  }

  async newPage(browser, options = {}) {
    const page = await browser._native.newPage();
    const width = options.viewport?.width || 1280 + Math.floor(Math.random() * 100);
    const height = options.viewport?.height || 800;
    await page.setViewport({ width, height });

    if (options.userAgent) {
      await page.setUserAgent(options.userAgent);
    } else {
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
    }

    return { _native: page, _adapter: this.name };
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
    await page._native.setCookie(cookie);
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
    await page._native.close();
  }

  async closeBrowser(browser) {
    await browser._native.close();
  }

  /**
   * Get the native Puppeteer page for direct access (backward compat / advanced usage)
   */
  getNativePage(page) {
    return page._native;
  }

  /**
   * Get the native Puppeteer browser for direct access
   */
  getNativeBrowser(browser) {
    return browser._native;
  }
}

export default PuppeteerAdapter;

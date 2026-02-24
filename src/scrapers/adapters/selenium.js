/**
 * XActions Scraper Adapter — Selenium WebDriver
 * 
 * Adapter wrapping Selenium WebDriver for browser automation.
 * Selenium is the original browser automation framework — mature, cross-language,
 * widely used in enterprise and testing environments.
 * 
 * Supports: Chrome (via chromedriver), Firefox (via geckodriver), Edge, Safari.
 * 
 * Best for: teams already using Selenium, enterprise environments, cross-language
 * automation suites, when you need to reuse existing Selenium infrastructure.
 * 
 * Install: npm install selenium-webdriver
 * Plus a driver: npm install chromedriver  (or geckodriver for Firefox)
 * 
 * @author nich (@nichxbt)
 * @license MIT
 */

import { BaseAdapter } from './base.js';

export class SeleniumAdapter extends BaseAdapter {
  name = 'selenium';
  description = 'Selenium WebDriver — classic browser automation, cross-browser, enterprise-grade, cross-language ecosystem';
  supportsJavaScript = true;
  requiresBrowser = true;

  #selenium = null;

  async #getSelenium() {
    if (!this.#selenium) {
      this.#selenium = await import('selenium-webdriver');
    }
    return this.#selenium;
  }

  async checkDependencies() {
    try {
      await import('selenium-webdriver');
      return { available: true };
    } catch (e) {
      return {
        available: false,
        message: 'Install selenium: npm install selenium-webdriver chromedriver',
      };
    }
  }

  /**
   * Launch a Selenium WebDriver browser.
   * 
   * Options:
   *   - browser: 'chrome' (default), 'firefox', 'edge', 'safari'
   *   - headless: boolean (default true)
   *   - seleniumServer: URL of remote Selenium Grid (optional)
   */
  async launch(options = {}) {
    const selenium = await this.#getSelenium();
    const { Builder, Capabilities } = selenium;
    const browserName = options.browser || 'chrome';

    let builder = new Builder().forBrowser(browserName);

    // Connect to remote Selenium Grid if specified
    if (options.seleniumServer) {
      builder = builder.usingServer(options.seleniumServer);
    }

    // Configure browser-specific options
    if (browserName === 'chrome') {
      try {
        const chrome = await import('selenium-webdriver/chrome.js');
        const chromeOptions = new chrome.Options();
        
        if (options.headless !== false) {
          chromeOptions.addArguments('--headless=new');
        }
        chromeOptions.addArguments(
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          ...(options.args || []),
        );
        
        if (options.proxy) {
          chromeOptions.addArguments(`--proxy-server=${options.proxy.server}`);
        }

        // Anti-detection
        chromeOptions.excludeSwitches('enable-automation');
        chromeOptions.addArguments('--disable-infobars');
        
        builder = builder.setChromeOptions(chromeOptions);
      } catch {
        // chromedriver not available, try basic config
      }
    } else if (browserName === 'firefox') {
      try {
        const firefox = await import('selenium-webdriver/firefox.js');
        const firefoxOptions = new firefox.Options();

        if (options.headless !== false) {
          firefoxOptions.addArguments('--headless');
        }
        if (options.proxy) {
          firefoxOptions.setPreference('network.proxy.type', 1);
          firefoxOptions.setPreference('network.proxy.http', options.proxy.server);
        }
        
        builder = builder.setFirefoxOptions(firefoxOptions);
      } catch {
        // geckodriver not available
      }
    }

    const driver = await builder.build();

    return {
      _native: driver,
      _adapter: this.name,
      _browserName: browserName,
    };
  }

  /**
   * newPage in Selenium opens a new tab/window (or reuses the main one).
   * Selenium doesn't have the same page concept as Puppeteer — the driver IS the page.
   */
  async newPage(browser, options = {}) {
    const driver = browser._native;

    // Set viewport via window size
    const width = options.viewport?.width || 1280 + Math.floor(Math.random() * 100);
    const height = options.viewport?.height || 800;
    await driver.manage().window().setRect({ width, height });

    // Selenium uses a single driver, but we can open new windows for multiple "pages"
    // For the first page, we reuse the existing window
    return {
      _native: driver,
      _adapter: this.name,
      _windowHandle: await driver.getWindowHandle(),
      _isNewWindow: false,
    };
  }

  async goto(page, url, options = {}) {
    const driver = page._native;
    
    // Switch to this page's window handle
    await driver.switchTo().window(page._windowHandle);

    await driver.get(url);

    // Wait for page load state
    const waitUntil = options.waitUntil || 'networkidle';
    const timeout = options.timeout || 30000;

    if (waitUntil === 'load' || waitUntil === 'networkidle' || waitUntil === 'networkidle2') {
      // Wait for document.readyState === 'complete'
      const selenium = await this.#getSelenium();
      const { until } = selenium;
      await driver.wait(async () => {
        const state = await driver.executeScript('return document.readyState');
        return state === 'complete';
      }, timeout);
    }
  }

  async evaluate(page, fn, ...args) {
    const driver = page._native;
    await driver.switchTo().window(page._windowHandle);

    if (typeof fn === 'function') {
      const script = `return (${fn.toString()}).apply(null, arguments);`;
      return driver.executeScript(script, ...args);
    }
    return driver.executeScript(fn, ...args);
  }

  async queryAll(page, selector, mapFn) {
    const driver = page._native;
    await driver.switchTo().window(page._windowHandle);

    const selenium = await this.#getSelenium();
    const { By } = selenium;

    if (mapFn) {
      // Use executeScript to run the mapFn in the browser context, similar to $$eval
      const script = `
        const elements = document.querySelectorAll(arguments[0]);
        const fn = ${mapFn.toString()};
        return fn(Array.from(elements));
      `;
      return driver.executeScript(script, selector);
    }

    return driver.findElements(By.css(selector));
  }

  async getContent(page) {
    const driver = page._native;
    await driver.switchTo().window(page._windowHandle);
    return driver.getPageSource();
  }

  async setCookie(page, cookie) {
    const driver = page._native;
    await driver.switchTo().window(page._windowHandle);

    // Selenium requires being on the cookie's domain first
    await driver.manage().addCookie({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      httpOnly: cookie.httpOnly || false,
      secure: cookie.secure || false,
    });
  }

  async scroll(page, options = {}) {
    const driver = page._native;
    await driver.switchTo().window(page._windowHandle);

    if (options.y !== undefined) {
      await driver.executeScript(`window.scrollBy(0, ${options.y})`);
    } else {
      await driver.executeScript('window.scrollTo(0, document.body.scrollHeight)');
    }
  }

  async screenshot(page, options = {}) {
    const driver = page._native;
    await driver.switchTo().window(page._windowHandle);

    const base64 = await driver.takeScreenshot();
    const buffer = Buffer.from(base64, 'base64');

    if (options.path) {
      const fs = await import('fs/promises');
      await fs.writeFile(options.path, buffer);
    }
    return buffer;
  }

  async waitForSelector(page, selector, options = {}) {
    const driver = page._native;
    await driver.switchTo().window(page._windowHandle);

    const selenium = await this.#getSelenium();
    const { By, until } = selenium;

    await driver.wait(
      until.elementLocated(By.css(selector)),
      options.timeout || 30000
    );
  }

  async closePage(page) {
    if (page._isNewWindow) {
      const driver = page._native;
      await driver.switchTo().window(page._windowHandle);
      await driver.close();
    }
    // Don't close the main window — that would quit the driver
  }

  async closeBrowser(browser) {
    await browser._native.quit();
  }

  /**
   * Selenium-specific: Open a new tab/window and return a page for it.
   * Use this to manage multiple pages in the same Selenium session.
   */
  async newTab(browser) {
    const driver = browser._native;
    const selenium = await this.#getSelenium();

    // Open new tab
    await driver.switchTo().newWindow('tab');
    const handle = await driver.getWindowHandle();

    return {
      _native: driver,
      _adapter: this.name,
      _windowHandle: handle,
      _isNewWindow: true,
    };
  }

  /**
   * Selenium-specific: Get all window handles.
   */
  async getWindowHandles(browser) {
    return browser._native.getAllWindowHandles();
  }

  /**
   * Selenium-specific: Execute async script (for scripts that use callbacks).
   */
  async executeAsyncScript(page, script, ...args) {
    const driver = page._native;
    await driver.switchTo().window(page._windowHandle);
    return driver.executeAsyncScript(script, ...args);
  }

  /**
   * Selenium-specific: Wait for a custom condition.
   */
  async waitFor(page, conditionFn, timeout = 30000) {
    const driver = page._native;
    await driver.switchTo().window(page._windowHandle);
    await driver.wait(conditionFn, timeout);
  }

  getNativePage(page) {
    return page._native;
  }

  getNativeBrowser(browser) {
    return browser._native;
  }
}

export default SeleniumAdapter;

/**
 * XActions Stealth Browser
 * Anti-detection Puppeteer wrapper with fingerprint randomization.
 *
 * Kills: Phantombuster (stealth scraping), Apify
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

// ============================================================================
// User-Agent Pool
// ============================================================================

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

// ============================================================================
// Stealth Browser
// ============================================================================

/**
 * Launch a stealth-configured Puppeteer browser
 */
export async function launchStealthBrowser(options = {}) {
  const { proxy, headless = true, userDataDir, viewport, userAgent } = options;

  let puppeteer;
  try {
    // Try puppeteer-extra with stealth plugin first
    const puppeteerExtra = await import('puppeteer-extra');
    const StealthPlugin = await import('puppeteer-extra-plugin-stealth');
    puppeteerExtra.default.use(StealthPlugin.default());
    puppeteer = puppeteerExtra.default;
    console.log('🥷 Stealth plugin loaded');
  } catch {
    // Fallback to regular puppeteer
    puppeteer = (await import('puppeteer')).default;
    console.log('⚠️  puppeteer-extra not available, using basic stealth patches');
  }

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--disable-dev-shm-usage',
    '--lang=en-US,en',
  ];

  if (proxy) {
    const proxyUrl = typeof proxy === 'object' ? proxy.url : proxy;
    args.push(`--proxy-server=${proxyUrl}`);
  }

  const vp = viewport || {
    width: randomInt(1280, 1920),
    height: randomInt(720, 1080),
  };

  const launchOptions = {
    headless: headless ? 'new' : false,
    args,
    defaultViewport: vp,
  };

  if (userDataDir) launchOptions.userDataDir = userDataDir;

  const browser = await puppeteer.launch(launchOptions);
  return browser;
}

/**
 * Create a stealth-configured page with all patches applied
 */
export async function createStealthPage(browser, options = {}) {
  const { proxy, userAgent } = options;
  const page = await browser.newPage();

  // Set random user agent
  const ua = userAgent || USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  await page.setUserAgent(ua);

  // Proxy authentication
  if (proxy && typeof proxy === 'object' && proxy.username && proxy.password) {
    await page.authenticate({ username: proxy.username, password: proxy.password });
  }

  // Anti-detection patches
  await page.evaluateOnNewDocument(() => {
    // Override webdriver flag
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // Override languages
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

    // Override plugins length
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });

    // Override platform
    const platforms = ['Win32', 'MacIntel', 'Linux x86_64'];
    Object.defineProperty(navigator, 'platform', {
      get: () => platforms[Math.floor(Math.random() * platforms.length)],
    });

    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) =>
      parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters);

    // WebGL vendor and renderer
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function (parameter) {
      if (parameter === 37445) return 'Intel Inc.';
      if (parameter === 37446) return 'Intel Iris OpenGL Engine';
      return getParameter.call(this, parameter);
    };
  });

  // Set realistic viewport
  const viewport = page.viewport();
  if (viewport) {
    await page.setViewport({
      ...viewport,
      deviceScaleFactor: Math.random() > 0.5 ? 2 : 1,
    });
  }

  return page;
}

/**
 * Human-like click — moves mouse to element before clicking
 */
export async function stealthClick(page, selector, options = {}) {
  const element = await page.$(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);

  const box = await element.boundingBox();
  if (!box) throw new Error(`Element has no bounding box: ${selector}`);

  // Move to element with slight randomization
  const x = box.x + box.width * (0.3 + Math.random() * 0.4);
  const y = box.y + box.height * (0.3 + Math.random() * 0.4);

  await page.mouse.move(x, y, { steps: randomInt(5, 15) });
  await sleep(randomInt(50, 150));
  await page.mouse.click(x, y, { delay: randomInt(50, 150) });
}

/**
 * Human-like typing with random inter-key delays
 */
export async function stealthType(page, selector, text) {
  await stealthClick(page, selector);
  await sleep(randomInt(100, 300));

  for (const char of text) {
    await page.keyboard.type(char, { delay: randomInt(50, 150) });
  }
}

// ============================================================================
// Helpers
// ============================================================================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// by nichxbt

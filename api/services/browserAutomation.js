const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class BrowserAutomation {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
      });
    }
    return this.browser;
  }

  async createPage(sessionCookie) {
    const browser = await this.initialize();
    const page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set cookies if provided
    if (sessionCookie) {
      try {
        const cookies = JSON.parse(sessionCookie);
        await page.setCookie(...cookies);
      } catch (error) {
        // If it's a string cookie, try to parse it
        const cookieObj = this.parseCookieString(sessionCookie);
        if (cookieObj) {
          await page.setCookie(cookieObj);
        }
      }
    }

    return page;
  }

  parseCookieString(cookieString) {
    // Parse cookie string like "auth_token=abc123; Domain=.x.com; Path=/"
    const parts = cookieString.split(';').map(s => s.trim());
    const [nameValue] = parts;
    const [name, value] = nameValue.split('=');

    if (!name || !value) return null;

    const cookie = {
      name: name.trim(),
      value: value.trim(),
      domain: '.x.com',
      path: '/',
      httpOnly: true,
      secure: true
    };

    return cookie;
  }

  async navigateToTwitter(page, url = 'https://x.com') {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await this.randomDelay(1000, 2000);
  }

  async checkAuthentication(page) {
    try {
      // Check if we're logged in by looking for profile link
      await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
      
      // If redirected to login, we're not authenticated
      if (page.url().includes('/login') || page.url().includes('/i/flow/login')) {
        return false;
      }

      // Check for navigation bar (only visible when logged in)
      const navBar = await page.$('nav[role="navigation"]');
      return navBar !== null;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }

  async getFollowing(page, username, limit = 1000) {
    const following = [];
    
    await page.goto(`https://x.com/${username}/following`, { 
      waitUntil: 'networkidle2' 
    });

    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrolls = Math.ceil(limit / 20); // ~20 users per scroll

    while (following.length < limit && scrollAttempts < maxScrolls) {
      // Extract user data from current view
      const users = await page.evaluate(() => {
        const userCells = document.querySelectorAll('[data-testid="UserCell"]');
        return Array.from(userCells).map(cell => {
          const link = cell.querySelector('a[role="link"]');
          const username = link?.href.split('/').pop();
          const displayName = cell.querySelector('[dir="ltr"] span')?.textContent;
          return { username, displayName };
        }).filter(u => u.username);
      });

      users.forEach(user => {
        if (!following.find(f => f.username === user.username)) {
          following.push(user);
        }
      });

      // Scroll to load more
      previousHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await this.randomDelay(2000, 3000);

      const newHeight = await page.evaluate('document.body.scrollHeight');
      if (newHeight === previousHeight) {
        break; // No more content
      }

      scrollAttempts++;
    }

    return following.slice(0, limit);
  }

  async getFollowers(page, username, limit = 1000) {
    const followers = [];
    
    await page.goto(`https://x.com/${username}/followers`, { 
      waitUntil: 'networkidle2' 
    });

    let previousHeight = 0;
    let scrollAttempts = 0;
    const maxScrolls = Math.ceil(limit / 20);

    while (followers.length < limit && scrollAttempts < maxScrolls) {
      const users = await page.evaluate(() => {
        const userCells = document.querySelectorAll('[data-testid="UserCell"]');
        return Array.from(userCells).map(cell => {
          const link = cell.querySelector('a[role="link"]');
          const username = link?.href.split('/').pop();
          const displayName = cell.querySelector('[dir="ltr"] span')?.textContent;
          return { username, displayName };
        }).filter(u => u.username);
      });

      users.forEach(user => {
        if (!followers.find(f => f.username === user.username)) {
          followers.push(user);
        }
      });

      previousHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await this.randomDelay(2000, 3000);

      const newHeight = await page.evaluate('document.body.scrollHeight');
      if (newHeight === previousHeight) {
        break;
      }

      scrollAttempts++;
    }

    return followers.slice(0, limit);
  }

  async unfollowUser(page, username) {
    try {
      await page.goto(`https://x.com/${username}`, { 
        waitUntil: 'networkidle2',
        timeout: 15000 
      });

      // Wait for the "Following" button
      const followingButton = await page.waitForSelector(
        '[data-testid*="unfollow"], [data-testid$="-unfollow"]',
        { timeout: 5000 }
      ).catch(() => null);

      if (!followingButton) {
        return { success: false, error: 'Following button not found' };
      }

      // Click unfollow button
      await followingButton.click();
      await this.randomDelay(500, 1000);

      // Confirm unfollow in popup
      const confirmButton = await page.waitForSelector(
        '[data-testid="confirmationSheetConfirm"]',
        { timeout: 3000 }
      ).catch(() => null);

      if (confirmButton) {
        await confirmButton.click();
        await this.randomDelay(1000, 2000);
      }

      return { success: true, username };
    } catch (error) {
      return { success: false, username, error: error.message };
    }
  }

  async randomDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = new BrowserAutomation();

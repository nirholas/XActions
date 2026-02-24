/**
 * XActions Threads Scrapers
 * Puppeteer-based scrapers for Meta Threads (threads.net)
 * 
 * Uses the same Puppeteer stealth approach as Twitter scrapers.
 * Threads has limited public API, so we scrape the web interface.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// ============================================================================
// Core Utilities
// ============================================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 3000) => sleep(min + Math.random() * (max - min));

const THREADS_BASE = 'https://www.threads.net';

/**
 * Create a browser instance for Threads scraping
 */
export async function createBrowser(options = {}) {
  return puppeteer.launch({
    headless: options.headless !== false ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
    ],
    ...options,
  });
}

/**
 * Create a page with realistic settings
 */
export async function createPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280 + Math.floor(Math.random() * 100), height: 800 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  return page;
}

// ============================================================================
// Profile Scraper
// ============================================================================

/**
 * Scrape a Threads profile
 * @param {Page} page - Puppeteer page instance
 * @param {string} username - Threads username (without @)
 * @returns {Object} Normalized profile data
 */
export async function scrapeProfile(page, username) {
  const handle = username.replace(/^@/, '');
  await page.goto(`${THREADS_BASE}/@${handle}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await randomDelay(2000, 4000);

  const profile = await page.evaluate((baseUrl) => {
    // Threads uses meta tags for profile info
    const getMeta = (name) => {
      const el = document.querySelector(`meta[property="${name}"], meta[name="${name}"]`);
      return el?.getAttribute('content') || null;
    };

    const title = getMeta('og:title') || document.title || '';
    const description = getMeta('og:description') || getMeta('description') || '';
    const image = getMeta('og:image') || null;

    // Try to parse follower count from description
    // Format often: "X followers. Bio text."
    const followerMatch = description.match(/([\d.]+[KkMm]?)\s*[Ff]ollowers?/);
    const followers = followerMatch ? followerMatch[1] : null;

    // Extract name from title: "Name (@handle) on Threads"
    const nameMatch = title.match(/^(.+?)\s*\(/);
    const name = nameMatch ? nameMatch[1].trim() : title.split('(')[0]?.trim() || null;

    // Extract bio text (after "followers." part)
    const bioMatch = description.match(/followers?\.\s*(.*)/i);
    const bio = bioMatch ? bioMatch[1].trim() : description || null;

    // Try to get stats from visible DOM
    const statElements = document.querySelectorAll('span[title]');
    let followersFromDom = null;
    for (const el of statElements) {
      const text = el.textContent || '';
      if (/follower/i.test(el.parentElement?.textContent || '')) {
        followersFromDom = text;
        break;
      }
    }

    return {
      name,
      username: null, // Will be set from input
      bio,
      avatar: image,
      followers: followersFromDom || followers,
      url: window.location.href,
      platform: 'threads',
    };
  }, THREADS_BASE);

  profile.username = handle;
  return profile;
}

// ============================================================================
// Posts Scraper
// ============================================================================

/**
 * Scrape posts from a Threads user's profile
 */
export async function scrapeTweets(page, username, options = {}) {
  const { limit = 50, onProgress } = options;
  const handle = username.replace(/^@/, '');

  await page.goto(`${THREADS_BASE}/@${handle}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await randomDelay(2000, 4000);

  const posts = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (posts.size < limit && retries < maxRetries) {
    const postData = await page.evaluate(() => {
      // Threads uses article or div-based post containers
      // Selectors may need updating as Threads evolves
      const articles = document.querySelectorAll(
        'article, [data-pressable-container="true"], div[role="article"]'
      );

      return Array.from(articles).map((article) => {
        // Get post text
        const textEls = article.querySelectorAll('span[dir="auto"], div[dir="auto"]');
        const texts = Array.from(textEls)
          .map((el) => el.textContent?.trim())
          .filter((t) => t && t.length > 5);
        const text = texts[0] || null;

        // Get timestamp
        const timeEl = article.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime') || timeEl?.textContent || null;

        // Get post link
        const links = article.querySelectorAll('a[href*="/post/"]');
        const postLink = links[0]?.getAttribute('href') || null;

        // Get engagement stats
        const spans = article.querySelectorAll('span');
        let likes = '0';
        let replies = '0';
        for (const span of spans) {
          const t = span.textContent || '';
          if (/like/i.test(span.parentElement?.textContent || '') && /^\d/.test(t)) {
            likes = t;
          }
          if (/repl/i.test(span.parentElement?.textContent || '') && /^\d/.test(t)) {
            replies = t;
          }
        }

        // Get media
        const images = Array.from(article.querySelectorAll('img[src*="scontent"]'))
          .map((img) => img.src)
          .filter((src) => !src.includes('profile'));
        const hasVideo = !!article.querySelector('video');

        const id = postLink || text?.slice(0, 50) || null;

        return {
          id,
          text,
          timestamp,
          likes,
          replies,
          url: postLink ? `https://www.threads.net${postLink}` : null,
          media: {
            images,
            hasVideo,
          },
          platform: 'threads',
        };
      }).filter((p) => p.id && p.text);
    });

    const prevSize = posts.size;
    postData.forEach((p) => posts.set(p.id, p));

    if (onProgress) {
      onProgress({ scraped: posts.size, limit });
    }

    if (posts.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 3000);
  }

  return Array.from(posts.values()).slice(0, limit);
}

// ============================================================================
// Search Posts
// ============================================================================

/**
 * Search Threads by query
 */
export async function searchTweets(page, query, options = {}) {
  const { limit = 30, onProgress } = options;

  await page.goto(`${THREADS_BASE}/search?q=${encodeURIComponent(query)}&serp_type=default`, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });
  await randomDelay(2000, 4000);

  const posts = new Map();
  let retries = 0;
  const maxRetries = 8;

  while (posts.size < limit && retries < maxRetries) {
    const postData = await page.evaluate(() => {
      const articles = document.querySelectorAll(
        'article, [data-pressable-container="true"], div[role="article"]'
      );

      return Array.from(articles).map((article) => {
        const textEls = article.querySelectorAll('span[dir="auto"], div[dir="auto"]');
        const texts = Array.from(textEls)
          .map((el) => el.textContent?.trim())
          .filter((t) => t && t.length > 5);
        const text = texts[0] || null;

        const timeEl = article.querySelector('time');
        const timestamp = timeEl?.getAttribute('datetime') || timeEl?.textContent || null;

        const links = article.querySelectorAll('a[href*="/post/"]');
        const postLink = links[0]?.getAttribute('href') || null;

        // Try to get author
        const authorLink = article.querySelector('a[href^="/@"]');
        const author = authorLink?.getAttribute('href')?.replace('/@', '')?.split('/')[0] || null;

        const id = postLink || text?.slice(0, 50) || null;

        return {
          id,
          text,
          author,
          timestamp,
          url: postLink ? `https://www.threads.net${postLink}` : null,
          platform: 'threads',
        };
      }).filter((p) => p.id && p.text);
    });

    const prevSize = posts.size;
    postData.forEach((p) => posts.set(p.id, p));

    if (onProgress) {
      onProgress({ scraped: posts.size, limit });
    }

    if (posts.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 3000);
  }

  return Array.from(posts.values()).slice(0, limit);
}

// ============================================================================
// Followers Scraper (limited — Threads doesn't expose full follower lists easily)
// ============================================================================

/**
 * Scrape followers for a Threads user
 * Note: Threads doesn't expose follower lists publicly like Twitter.
 * This returns limited data from the profile page.
 */
export async function scrapeFollowers(page, username, options = {}) {
  const profile = await scrapeProfile(page, username);
  console.warn(
    '⚠️ Threads does not expose full follower lists publicly. ' +
    'Only the follower count from the profile is available.'
  );
  return {
    followers: profile.followers,
    username: profile.username,
    note: 'Threads does not expose individual follower profiles publicly',
    platform: 'threads',
  };
}

/**
 * Scrape following for a Threads user
 * Note: Same limitation as followers.
 */
export async function scrapeFollowing(page, username, options = {}) {
  const profile = await scrapeProfile(page, username);
  console.warn(
    '⚠️ Threads does not expose full following lists publicly. ' +
    'Limited data available.'
  );
  return {
    username: profile.username,
    note: 'Threads does not expose individual following profiles publicly',
    platform: 'threads',
  };
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  createBrowser,
  createPage,
  scrapeProfile,
  scrapeFollowers,
  scrapeFollowing,
  scrapeTweets,
  searchTweets,
};

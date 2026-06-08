// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * XActions Facebook Scrapers
 * Puppeteer-based scrapers for Facebook (facebook.com)
 *
 * Uses the same Puppeteer stealth approach as Twitter and Threads scrapers.
 *
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license BSL 1.1
 */

// by nichxbt

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// ============================================================================
// Core Utilities
// ============================================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 3000) => sleep(min + Math.random() * (max - min));

const FACEBOOK_BASE = 'https://www.facebook.com';

/**
 * Create a browser instance for Facebook scraping
 * @param {Object} options - Browser launch options
 * @returns {Promise<Browser>} Puppeteer browser instance
 */
export async function createBrowser(options = {}) {
  const { args: extraArgs = [], headless, ...rest } = options;
  const stealthArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-web-security',
  ];
  return puppeteer.launch({
    headless: headless !== undefined ? headless : 'new',
    // Merge caller args with stealth defaults instead of clobbering them
    args: [...stealthArgs, ...extraArgs],
    ...rest,
  });
}

/**
 * Create a page with realistic settings
 * @param {Browser} browser - Puppeteer browser instance
 * @returns {Promise<Page>} Puppeteer page instance
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
// Profile Normalizer (pure — testable without Puppeteer)
// ============================================================================

// ============================================================================
// Handle Normalization (shared — used by scrapeProfile and scrapeTweets)
// ============================================================================

/**
 * Normalize a Facebook handle input to a clean handle string.
 * Accepts: handle, @handle, full facebook.com URL.
 * Preserves profile.php?id=<n> identifiers.
 * @param {string} input
 * @returns {string} Normalized handle
 */
export function normalizeHandle(input) {
  if (typeof input !== 'string' || !input.trim()) {
    throw new Error('❌ Facebook handle is required (handle, @handle, or facebook.com URL)');
  }
  let handle = input;
  if (handle.startsWith('https://') || handle.startsWith('http://')) {
    handle = handle.replace(/^https?:\/\/(www\.)?facebook\.com\//, '').replace(/\/$/, '');
  }
  handle = handle.replace(/^@/, '');
  if (/^profile\.php\?id=\d+/i.test(handle)) {
    // Preserve only the canonical profile.php?id=<digits>, dropping any &trailing params
    const m = handle.match(/^profile\.php\?id=\d+/i);
    handle = m[0];
  } else {
    handle = handle.split('/')[0].split('?')[0];
  }
  return handle;
}

// ============================================================================
// Post Normalizer (pure — testable without Puppeteer)
// ============================================================================

/**
 * Normalize a raw post object from page.evaluate into the standard post shape.
 * @param {Object} raw - Raw post fields from page.evaluate
 * @returns {Object} Normalized post
 */
export function normalizePost(raw) {
  const { id, text, timestamp, likes, comments, postUrl, images, hasVideo } = raw;
  return {
    id: id || null,
    text: text || null,
    timestamp: timestamp || null,
    likes: likes || '0',
    comments: comments || '0',
    url: postUrl || null,
    media: {
      images: images || [],
      hasVideo: hasVideo || false,
    },
    platform: 'facebook',
  };
}

/**
 * Normalize raw meta/DOM values into the standard profile shape.
 * @param {Object} raw - Raw values from page.evaluate
 * @param {string} inputHandle - The handle provided by the caller
 * @returns {Object} Normalized profile
 */
export function normalizeProfile(raw, inputHandle) {
  const { ogTitle, ogDescription, ogImage, domFollowers, pageUrl } = raw;

  // Parse name from og:title: "Name | Facebook" or "Name (username) | Facebook"
  let name = null;
  if (ogTitle) {
    name = ogTitle.replace(/\s*[\||\-–—]\s*Facebook.*$/i, '').trim() || null;
  }

  // Parse follower count best-effort.
  // ogDescription is free text → regex-extract the count.
  // domFollowers is already the extracted count (e.g. "1.2M") → use directly.
  let followers = null;
  if (ogDescription) {
    const match = ogDescription.match(/([\d,.]+[KkMmBb]?)\s*(followers?|people follow)/i);
    if (match) followers = match[1];
  }
  if (!followers && domFollowers) {
    followers = domFollowers;
  }

  // Parse bio from og:description — strip leading follower count line
  let bio = null;
  if (ogDescription) {
    bio = ogDescription.replace(/^[\d,.]+[KkMmBb]?\s*(followers?|people follow)[^.]*\.\s*/i, '').trim() || null;
  }

  return {
    name,
    username: inputHandle,
    bio,
    avatar: ogImage || null,
    followers,
    url: pageUrl || `${FACEBOOK_BASE}/${inputHandle}`,
    platform: 'facebook',
  };
}

/**
 * Login to Facebook using c_user and xs cookies
 * @param {Page} page - Puppeteer page instance
 * @param {Object} cookies - Cookie object with c_user and xs
 * @param {string} cookies.c_user - Facebook user ID cookie (numeric, 15-17 digits)
 * @param {string} cookies.xs - Facebook session token cookie
 * @throws {Error} If either cookie is missing or empty
 */
export async function loginWithCookie(page, { c_user, xs }) {
  if (!c_user || !xs) {
    throw new Error('❌ Facebook login requires both c_user and xs cookies');
  }

  await page.setCookie(
    {
      name: 'c_user',
      value: c_user,
      domain: '.facebook.com',
      httpOnly: true,
      secure: true,
    },
    {
      name: 'xs',
      value: xs,
      domain: '.facebook.com',
      httpOnly: true,
      secure: true,
    }
  );

  await page.goto(FACEBOOK_BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await randomDelay(2000, 4000);
}

// ============================================================================
// Profile Scraper
// ============================================================================

/**
 * Scrape a public Facebook profile or page
 * @param {Page} page - Puppeteer page instance
 * @param {string} username - Handle (zuck), @handle, or full facebook.com URL
 * @returns {Object} Normalized profile data
 */
export async function scrapeProfile(page, username) {
  const handle = normalizeHandle(username);

  const url = `${FACEBOOK_BASE}/${handle}`;
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await randomDelay(2000, 4000);

  const raw = await page.evaluate(() => {
    const getMeta = (prop) => {
      const el = document.querySelector(`meta[property="${prop}"], meta[name="${prop}"]`);
      return el?.getAttribute('content') || null;
    };

    // DOM fallback for followers — capture just the count (group 1), not the full match
    let domFollowers = null;
    const allText = document.body?.innerText || '';
    const followerMatch = allText.match(/([\d,.]+[KkMmBb]?)\s*followers?/i);
    if (followerMatch) domFollowers = followerMatch[1];

    return {
      ogTitle: getMeta('og:title'),
      ogDescription: getMeta('og:description'),
      ogImage: getMeta('og:image'),
      domFollowers,
      pageUrl: window.location.href,
    };
  });

  // Detect blocked/non-existent profile — og:title missing or a Facebook login wall.
  // NOTE: login-wall detection is English-biased ("Facebook", "Log into Facebook").
  // Non-English login walls may not be caught here — see deferred-work.md. Prefer
  // running authenticated (authCookie) so profile pages render fully.
  const title = raw.ogTitle?.trim() || '';
  const isLoginWall = !title
    || /^facebook$/i.test(title)
    || /^log\s+in\s+(to\s+)?facebook/i.test(title)
    || /^log\s*into\s+facebook/i.test(title)
    || /^facebook[\s–—-]+log/i.test(title);
  if (isLoginWall) {
    throw new Error(`❌ Facebook profile not found or blocked: "${handle}"`);
  }

  return normalizeProfile(raw, handle);
}

// ============================================================================
// Follower Normalizer (pure — testable without Puppeteer)
// ============================================================================

/**
 * Normalize a raw follower row into the standard follower shape.
 * @param {Object} raw
 * @returns {{ name, username, url, platform }}
 */
export function normalizeFollower(raw) {
  const { name, username, url } = raw;
  return {
    name: name || null,
    username: username || null,
    url: url || null,
    platform: 'facebook',
  };
}

// ============================================================================
// Followers Scraper
// ============================================================================

/**
 * Scrape followers of a Facebook profile or page.
 * Returns an array when the list is publicly accessible (Pages),
 * or a note object when restricted (personal profiles).
 *
 * @param {Page} page - Puppeteer page instance
 * @param {string} username - Handle, @handle, or full facebook.com URL
 * @param {Object} options
 * @param {number} [options.limit=100] - Max followers to return
 * @param {Function} [options.onProgress] - Called each scroll: ({ scraped, limit })
 * @param {number} [options.maxRetries=10] - Stop after N consecutive empty scrolls
 * @param {Function} [options.delay=randomDelay] - Injectable delay seam (pass `() => {}` in tests)
 * @returns {Promise<Array|Object>} Follower array OR { note, username, platform } if restricted
 */
export async function scrapeFollowers(page, username, options = {}) {
  const { limit = 100, onProgress, maxRetries = 10, delay = randomDelay } = options;
  const handle = normalizeHandle(username);
  const followersUrl = `${FACEBOOK_BASE}/${handle}/followers`;

  await page.goto(followersUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000, 4000);

  const isExposed = await page.evaluate(() => {
    const listItems = document.querySelectorAll('[role="listitem"]');
    const bodyText = document.body?.innerText?.slice(0, 2000) || '';
    const hasFollowerHeading = /followers?/i.test(bodyText);
    return listItems.length > 0 || hasFollowerHeading;
  });

  if (!isExposed) {
    return {
      note: 'Facebook follower list is not publicly exposed for this profile. Only Pages with public follower settings expose individual follower data.',
      username: handle,
      platform: 'facebook',
    };
  }

  const followers = new Map();
  let retries = 0;

  while (followers.size < limit && retries < maxRetries) {
    const rawFollowers = await page.evaluate(() => {
      const items = document.querySelectorAll('[role="listitem"]');
      return Array.from(items).map((item) => {
        const linkEl = item.querySelector('a[href*="facebook.com"], a[href^="/"]');
        const nameEl = item.querySelector('span, strong');
        const href = linkEl?.getAttribute('href') || null;
        const name = nameEl?.textContent?.trim() || null;
        let url = null;
        let username = null;
        if (href) {
          url = href.startsWith('http') ? href : `https://www.facebook.com${href}`;
          const match = url.match(/facebook\.com\/([^/?&#]+)/);
          username = match ? match[1] : null;
        }
        const id = url || name;
        return { id, name, username, url };
      }).filter((f) => f.id);
    });

    const prevSize = followers.size;
    rawFollowers.forEach((raw) => {
      if (!followers.has(raw.id)) {
        followers.set(raw.id, normalizeFollower({ name: raw.name, username: raw.username, url: raw.url }));
      }
    });

    if (onProgress) onProgress({ scraped: followers.size, limit });
    if (followers.size === prevSize) { retries++; } else { retries = 0; }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(1500, 3000);
  }

  return Array.from(followers.values()).slice(0, limit);
}

// ============================================================================
// Posts Scraper
// ============================================================================

/**
 * Scrape recent posts from a Facebook profile or page
 * @param {Page} page - Puppeteer page instance
 * @param {string} username - Handle, @handle, or full facebook.com URL
 * @param {Object} options
 * @param {number} [options.limit=50] - Max posts to return
 * @param {Function} [options.onProgress] - Called each scroll: ({ scraped, limit })
 * @returns {Promise<Array>} Normalized post array
 */
export async function scrapeTweets(page, username, options = {}) {
  const {
    limit = 50,
    onProgress,
    maxRetries = 10,
    // Injectable delay seam — defaults to human-like jitter, override (e.g. () => {})
    // in tests to keep the scroll loop fast and browser-free.
    delay = randomDelay,
  } = options;
  const handle = normalizeHandle(username);
  const profileUrl = `${FACEBOOK_BASE}/${handle}`;

  await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  await delay(2000, 4000);

  const posts = new Map();
  let retries = 0;

  while (posts.size < limit && retries < maxRetries) {
    const rawPosts = await page.evaluate(() => {
      const articles = document.querySelectorAll('[role="article"]');
      return Array.from(articles).map((article) => {
        // Text content
        const textEls = article.querySelectorAll('[dir="auto"]');
        const texts = Array.from(textEls)
          .map((el) => el.textContent?.trim())
          .filter((t) => t && t.length > 5);
        const text = texts[0] || null;

        // Timestamp
        const timeEl = article.querySelector('abbr, time');
        const timestamp = timeEl?.getAttribute('data-utime') || timeEl?.getAttribute('datetime') || timeEl?.textContent?.trim() || null;

        // Post URL
        const linkEls = article.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"], a[href*="story_fbid"]');
        const postLink = linkEls[0]?.getAttribute('href') || null;
        const postUrl = postLink
          ? postLink.startsWith('http') ? postLink : `https://www.facebook.com${postLink}`
          : null;

        // Engagement — prefer aria-label on reaction/comment buttons
        const allText = article.textContent || '';
        const likesMatch = allText.match(/([\d,.]+[KkMm]?)\s*(like|reaction)/i);
        const commentsMatch = allText.match(/([\d,.]+[KkMm]?)\s*comment/i);
        const likes = likesMatch ? likesMatch[1] : '0';
        const comments = commentsMatch ? commentsMatch[1] : '0';

        // Media
        const images = Array.from(article.querySelectorAll('img'))
          .map((img) => img.src)
          .filter((src) => src && !src.includes('static') && !src.includes('emoji') && src.startsWith('http'));
        const hasVideo = !!article.querySelector('video');

        const id = postUrl || text?.slice(0, 60) || null;

        return { id, text, timestamp, likes, comments, postUrl, images, hasVideo };
      }).filter((p) => p.id);
    });

    const prevSize = posts.size;
    rawPosts.forEach((raw) => {
      if (!posts.has(raw.id)) {
        posts.set(raw.id, normalizePost(raw));
      }
    });

    if (onProgress) onProgress({ scraped: posts.size, limit });

    if (posts.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(1500, 3000);
  }

  return Array.from(posts.values()).slice(0, limit);
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  createBrowser,
  createPage,
  loginWithCookie,
  scrapeProfile,
  scrapeFollowers,
  scrapeTweets,
};

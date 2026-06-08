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
    name = ogTitle.replace(/\s*[\||-]\s*Facebook.*$/i, '').trim() || null;
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
  // Normalize input to a handle
  let handle = username;
  if (handle.startsWith('https://') || handle.startsWith('http://')) {
    // Extract handle from full URL: https://www.facebook.com/zuck → zuck
    handle = handle.replace(/^https?:\/\/(www\.)?facebook\.com\//, '').replace(/\/$/, '');
  }
  handle = handle.replace(/^@/, '');

  // profile.php?id=<numeric> is a first-class Facebook identifier — keep it whole.
  // Otherwise strip any subpath (zuck/photos → zuck) and query string (zuck?fref=nf → zuck)
  // so the handle stays clean for both navigation and the returned username field.
  if (!/^profile\.php\?id=\d+/i.test(handle)) {
    handle = handle.split('/')[0].split('?')[0];
  }

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
  if (!title || /^facebook$/i.test(title) || /^log\s*in(to)?\s+facebook|^facebook\s*[–-]\s*log\s*in/i.test(title)) {
    throw new Error(`❌ Facebook profile not found or blocked: "${handle}"`);
  }

  return normalizeProfile(raw, handle);
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  createBrowser,
  createPage,
  loginWithCookie,
  scrapeProfile,
};

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Twitter Scrapers
 * Puppeteer-based scrapers for X/Twitter
 * 
 * Moved from src/scrapers/index.js to support multi-platform architecture.
 * All original exports are preserved for backward compatibility.
 * 
 * Supports multiple frameworks via the adapter option:
 *   createBrowser({ adapter: 'playwright' })  // Use Playwright
 *   createBrowser({ adapter: 'puppeteer' })   // Use Puppeteer (default)
 *   createBrowser()                            // Legacy Puppeteer (no adapter wrapping)
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';

puppeteer.use(StealthPlugin());

// ============================================================================
// Core Utilities
// ============================================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 3000) => sleep(min + Math.random() * (max - min));

/**
 * Create a browser instance with stealth settings.
 * 
 * Supports adapter mode:
 *   const browser = await createBrowser({ adapter: 'playwright' });
 *   const browser = await createBrowser({ adapter: 'puppeteer' });
 *   const browser = await createBrowser(); // Legacy Puppeteer
 * 
 * @param {Object} [options]
 * @param {string} [options.adapter] - Framework adapter: 'puppeteer', 'playwright', 'cheerio'
 * @param {boolean} [options.headless] - Run headless (default: true)
 * @returns {Promise<Object>} Browser instance
 */
export async function createBrowser(options = {}) {
  if (options.adapter) {
    const { getAdapter } = await import('../adapters/index.js');
    const adapter = await getAdapter(options.adapter);
    const { adapter: _, ...adapterOptions } = options;
    return adapter.launch(adapterOptions);
  }

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
 * Create a page with realistic settings.
 * Works with both native Puppeteer browsers and adapter browsers.
 * 
 * @param {Object} browser - Browser instance (native or adapter)
 * @param {Object} [options]
 * @returns {Promise<Object>} Page instance
 */
export async function createPage(browser, options = {}) {
  if (browser._adapter) {
    const { getAdapter } = await import('../adapters/index.js');
    const adapter = await getAdapter(browser._adapter);
    return adapter.newPage(browser, options);
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1280 + Math.floor(Math.random() * 100), height: 800 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  return page;
}

/**
 * Login with session cookie.
 * Works with both native Puppeteer pages and adapter pages.
 */
export async function loginWithCookie(page, authToken) {
  if (page._adapter) {
    const { getAdapter } = await import('../adapters/index.js');
    const adapter = await getAdapter(page._adapter);
    await adapter.setCookie(page, {
      name: 'auth_token',
      value: authToken,
      domain: '.x.com',
      path: '/',
      httpOnly: true,
      secure: true,
    });
    await adapter.goto(page, 'https://x.com/home', { waitUntil: 'networkidle' });
    return page;
  }

  await page.setCookie({
    name: 'auth_token',
    value: authToken,
    domain: '.x.com',
    path: '/',
    httpOnly: true,
    secure: true,
  });
  await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
  return page;
}

/**
 * Resolve the adapter instance for a page, if it was created via createBrowser({ adapter }).
 * Returns null for native Puppeteer pages so callers can fall back to direct page.* calls.
 */
async function getPageAdapter(page) {
  if (!page._adapter) return null;
  const { getAdapter } = await import('../adapters/index.js');
  return getAdapter(page._adapter);
}

// ============================================================================
// Profile Scraper
// ============================================================================

/**
 * Scrape profile information for a user
 */
export async function scrapeProfile(page, username) {
  const adapter = await getPageAdapter(page);
  if (adapter) {
    await adapter.goto(page, `https://x.com/${username}`, { waitUntil: 'networkidle' });
  } else {
    await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  }
  await randomDelay();

  const evaluateFn = () => {
    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
    const getAttr = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) || null;

    const headerStyle = document.querySelector('[data-testid="UserProfileHeader_Items"]')
      ?.closest('div')?.previousElementSibling?.querySelector('img')?.src;

    const avatar = document.querySelector('[data-testid="UserAvatar-Container-unknown"] img, [data-testid*="UserAvatar"] img')?.src;

    const nameSection = document.querySelector('[data-testid="UserName"]');
    const fullText = nameSection?.textContent || '';
    const usernameMatch = fullText.match(/@(\w+)/);

    const followingLink = document.querySelector('a[href$="/following"]');
    const followersLink = document.querySelector('a[href$="/verified_followers"], a[href$="/followers"]');

    return {
      name: fullText.split('@')[0]?.trim() || null,
      username: usernameMatch?.[1] || null,
      bio: getText('[data-testid="UserDescription"]'),
      location: getText('[data-testid="UserLocation"]'),
      website: getAttr('[data-testid="UserUrl"]', 'href') || getAttr('[data-testid="UserUrl"] a', 'href'),
      joined: getText('[data-testid="UserJoinDate"]'),
      birthday: getText('[data-testid="UserBirthday"]'),
      following: followingLink?.querySelector('span')?.textContent || null,
      followers: followersLink?.querySelector('span')?.textContent || null,
      avatar: avatar || null,
      header: headerStyle || null,
      verified: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"]'),
      protected: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Protected"]'),
      platform: 'twitter',
    };
  };

  const profile = adapter
    ? await adapter.evaluate(page, evaluateFn)
    : await page.evaluate(evaluateFn);

  return profile;
}

// ============================================================================
// Followers Scraper
// ============================================================================

/**
 * Scrape followers for a user
 */
export async function scrapeFollowers(page, username, options = {}) {
  const { limit = 1000, onProgress } = options;
  const adapter = await getPageAdapter(page);

  if (adapter) {
    await adapter.goto(page, `https://x.com/${username}/followers`, { waitUntil: 'networkidle' });
  } else {
    await page.goto(`https://x.com/${username}/followers`, { waitUntil: 'networkidle2' });
  }
  await randomDelay();

  const followers = new Map();
  let retries = 0;
  const maxRetries = 10;

  const extractUsers = () => {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    return Array.from(cells).map((cell) => {
      const link = cell.querySelector('a[href^="/"]');
      const nameEl = cell.querySelector('[dir="ltr"] > span');
      const bioEl = cell.querySelector('[data-testid="UserDescription"]');
      const verifiedEl = cell.querySelector('svg[aria-label*="Verified"]');
      const avatarEl = cell.querySelector('img[src*="profile_images"]');

      const href = link?.getAttribute('href') || '';
      const username = href.split('/')[1];

      return {
        username,
        name: nameEl?.textContent || null,
        bio: bioEl?.textContent || null,
        verified: !!verifiedEl,
        avatar: avatarEl?.src || null,
        platform: 'twitter',
      };
    }).filter(u => u.username && !u.username.includes('?'));
  };
  const scrollToBottom = () => window.scrollTo(0, document.body.scrollHeight);

  while (followers.size < limit && retries < maxRetries) {
    const users = adapter
      ? await adapter.evaluate(page, extractUsers)
      : await page.evaluate(extractUsers);

    const prevSize = followers.size;
    users.forEach((u) => followers.set(u.username, u));

    if (onProgress) {
      onProgress({ scraped: followers.size, limit });
    }

    if (followers.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    if (adapter) {
      await adapter.evaluate(page, scrollToBottom);
    } else {
      await page.evaluate(scrollToBottom);
    }
    await randomDelay(1500, 3000);
  }

  return Array.from(followers.values()).slice(0, limit);
}

// ============================================================================
// Following Scraper
// ============================================================================

/**
 * Scrape accounts a user is following
 */
export async function scrapeFollowing(page, username, options = {}) {
  const { limit = 1000, onProgress } = options;
  const adapter = await getPageAdapter(page);

  if (adapter) {
    await adapter.goto(page, `https://x.com/${username}/following`, { waitUntil: 'networkidle' });
  } else {
    await page.goto(`https://x.com/${username}/following`, { waitUntil: 'networkidle2' });
  }
  await randomDelay();

  const following = new Map();
  let retries = 0;
  const maxRetries = 10;

  const extractUsers = () => {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    return Array.from(cells).map((cell) => {
      const link = cell.querySelector('a[href^="/"]');
      const nameEl = cell.querySelector('[dir="ltr"] > span');
      const bioEl = cell.querySelector('[data-testid="UserDescription"]');
      const followsBackEl = cell.querySelector('[data-testid="userFollowIndicator"]');

      const href = link?.getAttribute('href') || '';
      const username = href.split('/')[1];

      return {
        username,
        name: nameEl?.textContent || null,
        bio: bioEl?.textContent || null,
        followsBack: !!followsBackEl,
        platform: 'twitter',
      };
    }).filter(u => u.username && !u.username.includes('?'));
  };
  const scrollToBottom = () => window.scrollTo(0, document.body.scrollHeight);

  while (following.size < limit && retries < maxRetries) {
    const users = adapter
      ? await adapter.evaluate(page, extractUsers)
      : await page.evaluate(extractUsers);

    const prevSize = following.size;
    users.forEach((u) => following.set(u.username, u));

    if (onProgress) {
      onProgress({ scraped: following.size, limit });
    }

    if (following.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    if (adapter) {
      await adapter.evaluate(page, scrollToBottom);
    } else {
      await page.evaluate(scrollToBottom);
    }
    await randomDelay(1500, 3000);
  }

  return Array.from(following.values()).slice(0, limit);
}

// ============================================================================
// Tweet Scraper
// ============================================================================

/**
 * Scrape tweets from a user's profile
 */
export async function scrapeTweets(page, username, options = {}) {
  const { limit = 100, includeReplies = false, onProgress } = options;
  
  const url = includeReplies
    ? `https://x.com/${username}/with_replies`
    : `https://x.com/${username}`;

  const adapter = await getPageAdapter(page);
  if (adapter) {
    await adapter.goto(page, url, { waitUntil: 'networkidle' });
  } else {
    await page.goto(url, { waitUntil: 'networkidle2' });
  }
  await randomDelay();

  const tweets = new Map();
  let retries = 0;
  const maxRetries = 10;

  const extractTweets = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    return Array.from(articles).map((article) => {
      const textEl = article.querySelector('[data-testid="tweetText"]');
      const timeEl = article.querySelector('time');
      const likesEl = article.querySelector('[data-testid="like"] span span');
      const retweetsEl = article.querySelector('[data-testid="retweet"] span span');
      const repliesEl = article.querySelector('[data-testid="reply"] span span');
      const viewsEl = article.querySelector('a[href*="/analytics"] span span');
      const linkEl = article.querySelector('a[href*="/status/"]');

      const images = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img')).map(i => i.src);
      const video = article.querySelector('[data-testid="videoPlayer"]') ? true : false;

      const quotedEl = article.querySelector('[data-testid="quoteTweet"]');

      return {
        id: linkEl?.href?.match(/status\/(\d+)/)?.[1] || null,
        text: textEl?.textContent || null,
        timestamp: timeEl?.getAttribute('datetime') || null,
        likes: likesEl?.textContent || '0',
        retweets: retweetsEl?.textContent || '0',
        replies: repliesEl?.textContent || '0',
        views: viewsEl?.textContent || null,
        url: linkEl?.href || null,
        media: {
          images,
          hasVideo: video,
        },
        isQuote: !!quotedEl,
        isRetweet: !!article.querySelector('[data-testid="socialContext"]'),
        platform: 'twitter',
      };
    }).filter(t => t.id);
  };
  const scrollToBottom = () => window.scrollTo(0, document.body.scrollHeight);

  while (tweets.size < limit && retries < maxRetries) {
    const tweetData = adapter
      ? await adapter.evaluate(page, extractTweets)
      : await page.evaluate(extractTweets);

    const prevSize = tweets.size;
    tweetData.forEach((t) => tweets.set(t.id, t));

    if (onProgress) {
      onProgress({ scraped: tweets.size, limit });
    }

    if (tweets.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    if (adapter) {
      await adapter.evaluate(page, scrollToBottom);
    } else {
      await page.evaluate(scrollToBottom);
    }
    await randomDelay(1500, 3000);
  }

  return Array.from(tweets.values()).slice(0, limit);
}

// ============================================================================
// Search Scraper
// ============================================================================

/**
 * Search tweets by query
 */
export async function searchTweets(page, query, options = {}) {
  const { limit = 100, filter = 'latest', onProgress } = options;
  
  const filterMap = {
    latest: 'live',
    top: 'top',
    people: 'user',
    photos: 'image',
    videos: 'video',
  };
  
  const encodedQuery = encodeURIComponent(query);
  const f = filterMap[filter] || 'live';

  const searchUrl = `https://x.com/search?q=${encodedQuery}&src=typed_query&f=${f}`;
  const adapter = await getPageAdapter(page);
  if (adapter) {
    await adapter.goto(page, searchUrl, { waitUntil: 'networkidle' });
  } else {
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
  }
  await randomDelay();

  const tweets = new Map();
  let retries = 0;
  const maxRetries = 10;

  const extractTweets = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    return Array.from(articles).map((article) => {
      const textEl = article.querySelector('[data-testid="tweetText"]');
      const authorLink = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
      const timeEl = article.querySelector('time');
      const linkEl = article.querySelector('a[href*="/status/"]');
      const likesEl = article.querySelector('[data-testid="like"] span span');

      return {
        id: linkEl?.href?.match(/status\/(\d+)/)?.[1] || null,
        text: textEl?.textContent || null,
        author: authorLink?.href?.split('/')[3] || null,
        timestamp: timeEl?.getAttribute('datetime') || null,
        likes: likesEl?.textContent || '0',
        url: linkEl?.href || null,
        platform: 'twitter',
      };
    }).filter(t => t.id);
  };
  const scrollToBottom = () => window.scrollTo(0, document.body.scrollHeight);

  while (tweets.size < limit && retries < maxRetries) {
    const tweetData = adapter
      ? await adapter.evaluate(page, extractTweets)
      : await page.evaluate(extractTweets);

    const prevSize = tweets.size;
    tweetData.forEach((t) => tweets.set(t.id, t));

    if (onProgress) {
      onProgress({ scraped: tweets.size, limit });
    }

    if (tweets.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    if (adapter) {
      await adapter.evaluate(page, scrollToBottom);
    } else {
      await page.evaluate(scrollToBottom);
    }
    await randomDelay(1500, 3000);
  }

  return Array.from(tweets.values()).slice(0, limit);
}

// ============================================================================
// Thread Scraper
// ============================================================================

/**
 * Scrape a full tweet thread
 */
export async function scrapeThread(page, tweetUrl) {
  const adapter = await getPageAdapter(page);
  if (adapter) {
    await adapter.goto(page, tweetUrl, { waitUntil: 'networkidle' });
  } else {
    await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
  }
  await randomDelay();

  const scrollToBottom = () => window.scrollTo(0, document.body.scrollHeight);
  for (let i = 0; i < 5; i++) {
    if (adapter) {
      await adapter.evaluate(page, scrollToBottom);
    } else {
      await page.evaluate(scrollToBottom);
    }
    await randomDelay(1000, 2000);
  }

  const extractThread = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const mainTweetId = window.location.pathname.match(/status\/(\d+)/)?.[1];

    const mainArticle = Array.from(articles).find(a =>
      a.querySelector(`a[href*="/status/${mainTweetId}"]`)
    );
    const mainAuthor = mainArticle?.querySelector('[data-testid="User-Name"] a')?.href?.split('/')[3];

    return Array.from(articles)
      .map((article) => {
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const authorLink = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
        const timeEl = article.querySelector('time');
        const linkEl = article.querySelector('a[href*="/status/"]');

        const author = authorLink?.href?.split('/')[3];

        return {
          id: linkEl?.href?.match(/status\/(\d+)/)?.[1] || null,
          text: textEl?.textContent || null,
          author,
          timestamp: timeEl?.getAttribute('datetime') || null,
          url: linkEl?.href || null,
          isMainAuthor: author === mainAuthor,
          platform: 'twitter',
        };
      })
      .filter(t => t.id && t.isMainAuthor);
  };

  const thread = adapter
    ? await adapter.evaluate(page, extractThread)
    : await page.evaluate(extractThread);

  return thread;
}

// ============================================================================
// Likes Scraper
// ============================================================================

/**
 * Scrape users who liked a tweet
 */
export async function scrapeLikes(page, tweetUrl, options = {}) {
  const { limit = 100 } = options;
  
  const likesUrl = tweetUrl.replace(/\/status\//, '/status/') + '/likes';
  const adapter = await getPageAdapter(page);
  if (adapter) {
    await adapter.goto(page, likesUrl, { waitUntil: 'networkidle' });
  } else {
    await page.goto(likesUrl, { waitUntil: 'networkidle2' });
  }
  await randomDelay();

  const users = new Map();
  let retries = 0;
  const maxRetries = 10;

  const extractUsers = () => {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    return Array.from(cells).map((cell) => {
      const link = cell.querySelector('a[href^="/"]');
      const nameEl = cell.querySelector('[dir="ltr"] > span');
      const bioEl = cell.querySelector('[data-testid="UserDescription"]');

      const href = link?.getAttribute('href') || '';
      const username = href.split('/')[1];

      return {
        username,
        name: nameEl?.textContent || null,
        bio: bioEl?.textContent || null,
      };
    }).filter(u => u.username && !u.username.includes('?'));
  };
  const scrollToBottom = () => window.scrollTo(0, document.body.scrollHeight);

  while (users.size < limit && retries < maxRetries) {
    const userData = adapter
      ? await adapter.evaluate(page, extractUsers)
      : await page.evaluate(extractUsers);

    const prevSize = users.size;
    userData.forEach((u) => users.set(u.username, u));

    if (users.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    if (adapter) {
      await adapter.evaluate(page, scrollToBottom);
    } else {
      await page.evaluate(scrollToBottom);
    }
    await randomDelay(1500, 3000);
  }

  return Array.from(users.values()).slice(0, limit);
}

// ============================================================================
// Hashtag Scraper
// ============================================================================

/**
 * Scrape tweets for a hashtag
 */
export async function scrapeHashtag(page, hashtag, options = {}) {
  const { limit = 100, filter = 'latest' } = options;
  
  const tag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
  return searchTweets(page, `#${tag}`, { limit, filter });
}

// ============================================================================
// Media Scraper
// ============================================================================

/**
 * Scrape media (images/videos) from a user
 */
export async function scrapeMedia(page, username, options = {}) {
  const { limit = 100 } = options;
  const adapter = await getPageAdapter(page);

  if (adapter) {
    await adapter.goto(page, `https://x.com/${username}/media`, { waitUntil: 'networkidle' });
  } else {
    await page.goto(`https://x.com/${username}/media`, { waitUntil: 'networkidle2' });
  }
  await randomDelay();

  const media = [];
  let retries = 0;
  const maxRetries = 10;

  const extractMedia = () => {
    const items = document.querySelectorAll('article[data-testid="tweet"]');
    return Array.from(items).flatMap((article) => {
      const images = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img'))
        .map(img => ({
          type: 'image',
          url: img.src.replace(/&name=\w+/, '&name=large'),
        }));

      const videos = article.querySelector('[data-testid="videoPlayer"]')
        ? [{ type: 'video', url: article.querySelector('a[href*="/status/"]')?.href }]
        : [];

      const tweetUrl = article.querySelector('a[href*="/status/"]')?.href;

      return [...images, ...videos].map(m => ({
        ...m,
        tweetUrl,
      }));
    });
  };
  const scrollToBottom = () => window.scrollTo(0, document.body.scrollHeight);

  while (media.length < limit && retries < maxRetries) {
    const newMedia = adapter
      ? await adapter.evaluate(page, extractMedia)
      : await page.evaluate(extractMedia);

    const prevLength = media.length;
    newMedia.forEach((m) => {
      if (!media.find(existing => existing.url === m.url)) {
        media.push(m);
      }
    });

    if (media.length === prevLength) {
      retries++;
    } else {
      retries = 0;
    }

    if (adapter) {
      await adapter.evaluate(page, scrollToBottom);
    } else {
      await page.evaluate(scrollToBottom);
    }
    await randomDelay(1500, 3000);
  }

  return media.slice(0, limit);
}

// ============================================================================
// List Scraper
// ============================================================================

/**
 * Scrape members of a Twitter list
 */
export async function scrapeListMembers(page, listUrl, options = {}) {
  const { limit = 500 } = options;
  const adapter = await getPageAdapter(page);

  const membersUrl = listUrl.endsWith('/members') ? listUrl : `${listUrl}/members`;
  if (adapter) {
    await adapter.goto(page, membersUrl, { waitUntil: 'networkidle' });
  } else {
    await page.goto(membersUrl, { waitUntil: 'networkidle2' });
  }
  await randomDelay();

  const members = new Map();
  let retries = 0;
  const maxRetries = 10;

  const extractUsers = () => {
    const cells = document.querySelectorAll('[data-testid="UserCell"]');
    return Array.from(cells).map((cell) => {
      const link = cell.querySelector('a[href^="/"]');
      const nameEl = cell.querySelector('[dir="ltr"] > span');
      const bioEl = cell.querySelector('[data-testid="UserDescription"]');

      const href = link?.getAttribute('href') || '';
      const username = href.split('/')[1];

      return {
        username,
        name: nameEl?.textContent || null,
        bio: bioEl?.textContent || null,
      };
    }).filter(u => u.username && !u.username.includes('?'));
  };
  const scrollToBottom = () => window.scrollTo(0, document.body.scrollHeight);

  while (members.size < limit && retries < maxRetries) {
    const users = adapter
      ? await adapter.evaluate(page, extractUsers)
      : await page.evaluate(extractUsers);

    const prevSize = members.size;
    users.forEach((u) => members.set(u.username, u));

    if (members.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    if (adapter) {
      await adapter.evaluate(page, scrollToBottom);
    } else {
      await page.evaluate(scrollToBottom);
    }
    await randomDelay(1500, 3000);
  }

  return Array.from(members.values()).slice(0, limit);
}

// ============================================================================
// Bookmarks Scraper
// ============================================================================

/**
 * Scrape bookmarked tweets (requires login)
 */
export async function scrapeBookmarks(page, options = {}) {
  const { limit = 100, scrollDelay = 2000 } = options;
  const adapter = await getPageAdapter(page);

  if (adapter) {
    await adapter.goto(page, 'https://x.com/i/bookmarks', { waitUntil: 'networkidle' });
  } else {
    await page.goto('https://x.com/i/bookmarks', { waitUntil: 'networkidle2' });
  }
  await randomDelay(2000, 3000);

  const bookmarks = [];
  const seen = new Set();
  let scrolls = 0;
  const maxScrolls = Math.ceil(limit / 5);

  const mapArticles = (articles) =>
    articles.map((article) => {
      const text = article.querySelector('[data-testid="tweetText"]')?.innerText || '';
      const author = article.querySelector('[data-testid="User-Name"] a')?.getAttribute('href')?.replace('/', '') || '';
      const time = article.querySelector('time')?.getAttribute('datetime') || '';
      const likes = article.querySelector('[data-testid="like"] span')?.innerText || '0';
      const retweets = article.querySelector('[data-testid="retweet"] span')?.innerText || '0';
      const link = article.querySelector('a[href*="/status/"]')?.getAttribute('href') || '';
      return { author, text, time, likes, retweets, link: link ? `https://x.com${link}` : '', platform: 'twitter' };
    });
  const scrollBy = () => window.scrollBy(0, window.innerHeight * 2);

  while (bookmarks.length < limit && scrolls < maxScrolls) {
    const tweets = adapter
      ? await adapter.queryAll(page, 'article[data-testid="tweet"]', mapArticles)
      : await page.$$eval('article[data-testid="tweet"]', mapArticles);

    for (const tweet of tweets) {
      const key = tweet.link || tweet.text.slice(0, 80);
      if (!seen.has(key) && key) {
        seen.add(key);
        bookmarks.push(tweet);
      }
    }

    if (adapter) {
      await adapter.evaluate(page, scrollBy);
    } else {
      await page.evaluate(scrollBy);
    }
    await sleep(scrollDelay);
    scrolls++;
  }

  return bookmarks.slice(0, limit);
}

// ============================================================================
// Notifications Scraper
// ============================================================================

/**
 * Scrape recent notifications (requires login)
 */
export async function scrapeNotifications(page, options = {}) {
  const { limit = 50, tab = 'all', scrollDelay = 2000 } = options;
  const adapter = await getPageAdapter(page);

  const url = tab === 'mentions'
    ? 'https://x.com/notifications/mentions'
    : 'https://x.com/notifications';

  if (adapter) {
    await adapter.goto(page, url, { waitUntil: 'networkidle' });
  } else {
    await page.goto(url, { waitUntil: 'networkidle2' });
  }
  await randomDelay(2000, 3000);

  const notifications = [];
  const seen = new Set();
  let scrolls = 0;
  const maxScrolls = Math.ceil(limit / 5);

  const mapItems = (els) =>
    els.map((el) => {
      const text = el.innerText || '';
      const time = el.querySelector('time')?.getAttribute('datetime') || '';
      const links = Array.from(el.querySelectorAll('a[href*="/status/"]')).map(a => a.getAttribute('href'));
      return { text: text.slice(0, 280), time, links: links.map(l => `https://x.com${l}`), platform: 'twitter' };
    });
  const scrollBy = () => window.scrollBy(0, window.innerHeight * 2);

  while (notifications.length < limit && scrolls < maxScrolls) {
    const items = adapter
      ? await adapter.queryAll(page, 'article[data-testid="tweet"], [data-testid="notification"]', mapItems)
      : await page.$$eval('article[data-testid="tweet"], [data-testid="notification"]', mapItems);

    for (const item of items) {
      const key = item.text.slice(0, 100) + item.time;
      if (!seen.has(key) && key.trim()) {
        seen.add(key);
        notifications.push(item);
      }
    }

    if (adapter) {
      await adapter.evaluate(page, scrollBy);
    } else {
      await page.evaluate(scrollBy);
    }
    await sleep(scrollDelay);
    scrolls++;
  }

  return notifications.slice(0, limit);
}

// ============================================================================
// Trending Scraper
// ============================================================================

/**
 * Scrape trending topics from the Explore page
 */
export async function scrapeTrending(page, options = {}) {
  const { limit = 30 } = options;
  const adapter = await getPageAdapter(page);

  if (adapter) {
    await adapter.goto(page, 'https://x.com/explore/tabs/trending', { waitUntil: 'networkidle' });
  } else {
    await page.goto('https://x.com/explore/tabs/trending', { waitUntil: 'networkidle2' });
  }
  await randomDelay(2000, 3000);

  const scrollBy = () => window.scrollBy(0, window.innerHeight);
  for (let i = 0; i < 3; i++) {
    if (adapter) {
      await adapter.evaluate(page, scrollBy);
    } else {
      await page.evaluate(scrollBy);
    }
    await sleep(1500);
  }

  const mapTrends = (els) =>
    els.map((el) => {
      const spans = el.querySelectorAll('span');
      const texts = Array.from(spans).map(s => s.innerText).filter(Boolean);
      const category = texts[0] || '';
      const topic = texts.find(t => t.startsWith('#') || t.length > 3) || texts[1] || '';
      const posts = texts.find(t => /posts|tweets/i.test(t)) || '';
      return { category, topic, posts, platform: 'twitter' };
    });

  const trends = adapter
    ? await adapter.queryAll(page, '[data-testid="trend"]', mapTrends)
    : await page.$$eval('[data-testid="trend"]', mapTrends);

  return trends.slice(0, limit);
}

// ============================================================================
// Community Members Scraper
// ============================================================================

/**
 * Scrape members of an X Community
 */
export async function scrapeCommunityMembers(page, communityUrl, options = {}) {
  const { limit = 100, scrollDelay = 2000 } = options;
  const adapter = await getPageAdapter(page);

  const membersUrl = communityUrl.endsWith('/members')
    ? communityUrl
    : `${communityUrl}/members`;

  if (adapter) {
    await adapter.goto(page, membersUrl, { waitUntil: 'networkidle' });
  } else {
    await page.goto(membersUrl, { waitUntil: 'networkidle2' });
  }
  await randomDelay(2000, 3000);

  const members = [];
  const seen = new Set();
  let scrolls = 0;
  const maxScrolls = Math.ceil(limit / 10);

  const mapUsers = (cells) =>
    cells.map((cell) => {
      const name = cell.querySelector('[dir="ltr"] span')?.innerText || '';
      const handle = cell.querySelector('a[href^="/"]')?.getAttribute('href')?.replace('/', '') || '';
      const bio = cell.querySelector('[data-testid="userDescription"]')?.innerText || '';
      return { name, handle, bio, platform: 'twitter' };
    });
  const scrollBy = () => window.scrollBy(0, window.innerHeight * 2);

  while (members.length < limit && scrolls < maxScrolls) {
    const users = adapter
      ? await adapter.queryAll(page, '[data-testid="UserCell"]', mapUsers)
      : await page.$$eval('[data-testid="UserCell"]', mapUsers);

    for (const user of users) {
      if (!seen.has(user.handle) && user.handle) {
        seen.add(user.handle);
        members.push(user);
      }
    }

    if (adapter) {
      await adapter.evaluate(page, scrollBy);
    } else {
      await page.evaluate(scrollBy);
    }
    await sleep(scrollDelay);
    scrolls++;
  }

  return members.slice(0, limit);
}

// ============================================================================
// Spaces Scraper
// ============================================================================

/**
 * Scrape X Spaces from search results
 */
export async function scrapeSpaces(page, query, options = {}) {
  const { limit = 20, scrollDelay = 2000 } = options;
  const adapter = await getPageAdapter(page);

  const spacesSearchUrl = `https://x.com/search?q=${encodeURIComponent(query)}&f=top`;
  if (adapter) {
    await adapter.goto(page, spacesSearchUrl, { waitUntil: 'networkidle' });
  } else {
    await page.goto(spacesSearchUrl, { waitUntil: 'networkidle2' });
  }
  await randomDelay(2000, 3000);

  const spaces = [];
  const seen = new Set();
  let scrolls = 0;
  const maxScrolls = Math.ceil(limit / 3);

  const mapSpaces = (links) =>
    links.map((link) => {
      const href = link.getAttribute('href') || '';
      const card = link.closest('div[data-testid]') || link.parentElement;
      const title = card?.querySelector('span')?.innerText || '';
      return {
        title,
        link: href.startsWith('http') ? href : `https://x.com${href}`,
        platform: 'twitter',
      };
    });
  const scrollBy = () => window.scrollBy(0, window.innerHeight * 2);

  while (spaces.length < limit && scrolls < maxScrolls) {
    const found = adapter
      ? await adapter.queryAll(page, 'a[href*="/i/spaces/"]', mapSpaces)
      : await page.$$eval('a[href*="/i/spaces/"]', mapSpaces);

    for (const space of found) {
      if (!seen.has(space.link) && space.link) {
        seen.add(space.link);
        spaces.push(space);
      }
    }

    if (adapter) {
      await adapter.evaluate(page, scrollBy);
    } else {
      await page.evaluate(scrollBy);
    }
    await sleep(scrollDelay);
    scrolls++;
  }

  return spaces.slice(0, limit);
}

// ============================================================================
// Export Utilities
// ============================================================================

/**
 * Export data to JSON file
 */
export async function exportToJSON(data, filename) {
  await fs.writeFile(filename, JSON.stringify(data, null, 2));
  return filename;
}

/**
 * Export data to CSV file
 */
export async function exportToCSV(data, filename) {
  if (!data.length) return filename;
  
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(h => {
        const val = row[h];
        if (typeof val === 'string') {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val ?? '';
      }).join(',')
    ),
  ];
  
  await fs.writeFile(filename, csvRows.join('\n'));
  return filename;
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
  scrapeFollowing,
  scrapeTweets,
  searchTweets,
  scrapeThread,
  scrapeLikes,
  scrapeHashtag,
  scrapeMedia,
  scrapeListMembers,
  scrapeBookmarks,
  scrapeNotifications,
  scrapeTrending,
  scrapeCommunityMembers,
  scrapeSpaces,
  exportToJSON,
  exportToCSV,
};

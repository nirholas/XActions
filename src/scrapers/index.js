/**
 * XActions Scrapers
 * No-API-required scrapers for X/Twitter data
 * 
 * Uses Puppeteer with stealth mode to avoid detection.
 * All scrapers include human-like delays and rate limiting.
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
 * Create a browser instance with stealth settings
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

/**
 * Login with session cookie
 */
export async function loginWithCookie(page, authToken) {
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

// ============================================================================
// Profile Scraper
// ============================================================================

/**
 * Scrape profile information for a user
 * @param {Page} page - Puppeteer page instance
 * @param {string} username - Twitter username (without @)
 * @returns {Object} Profile data
 */
export async function scrapeProfile(page, username) {
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const profile = await page.evaluate(() => {
    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
    const getAttr = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) || null;

    // Get header image
    const headerStyle = document.querySelector('[data-testid="UserProfileHeader_Items"]')
      ?.closest('div')?.previousElementSibling?.querySelector('img')?.src;

    // Get avatar
    const avatar = document.querySelector('[data-testid="UserAvatar-Container-unknown"] img, [data-testid*="UserAvatar"] img')?.src;

    // Parse name and username
    const nameSection = document.querySelector('[data-testid="UserName"]');
    const fullText = nameSection?.textContent || '';
    const usernameMatch = fullText.match(/@(\w+)/);

    // Get stats
    const followingLink = document.querySelector('a[href$="/following"]');
    const followersLink = document.querySelector('a[href$="/verified_followers"], a[href$="/followers"]');

    return {
      name: fullText.split('@')[0]?.trim() || null,
      username: usernameMatch?.[1] || null,
      bio: getText('[data-testid="UserDescription"]'),
      location: getText('[data-testid="UserLocation"]'),
      website: getAttr('[data-testid="UserUrl"] a', 'href'),
      joined: getText('[data-testid="UserJoinDate"]'),
      birthday: getText('[data-testid="UserBirthday"]'),
      following: followingLink?.querySelector('span')?.textContent || null,
      followers: followersLink?.querySelector('span')?.textContent || null,
      avatar: avatar || null,
      header: headerStyle || null,
      verified: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"]'),
      protected: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Protected"]'),
    };
  });

  return profile;
}

// ============================================================================
// Followers Scraper
// ============================================================================

/**
 * Scrape followers for a user
 * @param {Page} page - Puppeteer page instance  
 * @param {string} username - Twitter username
 * @param {Object} options - Scraping options
 * @returns {Array} List of follower objects
 */
export async function scrapeFollowers(page, username, options = {}) {
  const { limit = 1000, onProgress } = options;
  
  await page.goto(`https://x.com/${username}/followers`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const followers = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (followers.size < limit && retries < maxRetries) {
    const users = await page.evaluate(() => {
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
        };
      }).filter(u => u.username && !u.username.includes('?'));
    });

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

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
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
  
  await page.goto(`https://x.com/${username}/following`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const following = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (following.size < limit && retries < maxRetries) {
    const users = await page.evaluate(() => {
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
        };
      }).filter(u => u.username && !u.username.includes('?'));
    });

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

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
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
    
  await page.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay();

  const tweets = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (tweets.size < limit && retries < maxRetries) {
    const tweetData = await page.evaluate(() => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      return Array.from(articles).map((article) => {
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const timeEl = article.querySelector('time');
        const likesEl = article.querySelector('[data-testid="like"] span span');
        const retweetsEl = article.querySelector('[data-testid="retweet"] span span');
        const repliesEl = article.querySelector('[data-testid="reply"] span span');
        const viewsEl = article.querySelector('a[href*="/analytics"] span span');
        const linkEl = article.querySelector('a[href*="/status/"]');
        
        // Get media
        const images = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img')).map(i => i.src);
        const video = article.querySelector('[data-testid="videoPlayer"]') ? true : false;
        
        // Get quoted tweet
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
        };
      }).filter(t => t.id);
    });

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

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
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
  
  await page.goto(`https://x.com/search?q=${encodedQuery}&src=typed_query&f=${f}`, {
    waitUntil: 'networkidle2',
  });
  await randomDelay();

  const tweets = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (tweets.size < limit && retries < maxRetries) {
    const tweetData = await page.evaluate(() => {
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
        };
      }).filter(t => t.id);
    });

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

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
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
  await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
  await randomDelay();

  // Scroll to load full thread
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1000, 2000);
  }

  const thread = await page.evaluate(() => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const mainTweetId = window.location.pathname.match(/status\/(\d+)/)?.[1];
    
    // Get main author
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
        };
      })
      .filter(t => t.id && t.isMainAuthor);
  });

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
  
  // Navigate to likes page
  const likesUrl = tweetUrl.replace(/\/status\//, '/status/') + '/likes';
  await page.goto(likesUrl, { waitUntil: 'networkidle2' });
  await randomDelay();

  const users = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (users.size < limit && retries < maxRetries) {
    const userData = await page.evaluate(() => {
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
    });

    const prevSize = users.size;
    userData.forEach((u) => users.set(u.username, u));

    if (users.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
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
  
  await page.goto(`https://x.com/${username}/media`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const media = [];
  let retries = 0;
  const maxRetries = 10;

  while (media.length < limit && retries < maxRetries) {
    const newMedia = await page.evaluate(() => {
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
    });

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

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
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
  
  const membersUrl = listUrl.endsWith('/members') ? listUrl : `${listUrl}/members`;
  await page.goto(membersUrl, { waitUntil: 'networkidle2' });
  await randomDelay();

  const members = new Map();
  let retries = 0;
  const maxRetries = 10;

  while (members.size < limit && retries < maxRetries) {
    const users = await page.evaluate(() => {
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
    });

    const prevSize = members.size;
    users.forEach((u) => members.set(u.username, u));

    if (members.size === prevSize) {
      retries++;
    } else {
      retries = 0;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay(1500, 3000);
  }

  return Array.from(members.values()).slice(0, limit);
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
// Scrape Bookmarks
// ============================================================================

/**
 * Scrape bookmarked tweets (requires login)
 */
export async function scrapeBookmarks(page, options = {}) {
  const { limit = 100, scrollDelay = 2000 } = options;
  
  await page.goto('https://x.com/i/bookmarks', { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);
  
  const bookmarks = [];
  const seen = new Set();
  let scrolls = 0;
  const maxScrolls = Math.ceil(limit / 5);
  
  while (bookmarks.length < limit && scrolls < maxScrolls) {
    const tweets = await page.$$eval('article[data-testid="tweet"]', (articles) =>
      articles.map((article) => {
        const text = article.querySelector('[data-testid="tweetText"]')?.innerText || '';
        const author = article.querySelector('[data-testid="User-Name"] a')?.getAttribute('href')?.replace('/', '') || '';
        const time = article.querySelector('time')?.getAttribute('datetime') || '';
        const likes = article.querySelector('[data-testid="like"] span')?.innerText || '0';
        const retweets = article.querySelector('[data-testid="retweet"] span')?.innerText || '0';
        const link = article.querySelector('a[href*="/status/"]')?.getAttribute('href') || '';
        return { author, text, time, likes, retweets, link: link ? `https://x.com${link}` : '' };
      })
    );
    
    for (const tweet of tweets) {
      const key = tweet.link || tweet.text.slice(0, 80);
      if (!seen.has(key) && key) {
        seen.add(key);
        bookmarks.push(tweet);
      }
    }
    
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await sleep(scrollDelay);
    scrolls++;
  }
  
  return bookmarks.slice(0, limit);
}

// ============================================================================
// Scrape Notifications
// ============================================================================

/**
 * Scrape recent notifications (requires login)
 */
export async function scrapeNotifications(page, options = {}) {
  const { limit = 50, tab = 'all', scrollDelay = 2000 } = options;
  
  const url = tab === 'mentions'
    ? 'https://x.com/notifications/mentions'
    : 'https://x.com/notifications';
  
  await page.goto(url, { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);
  
  const notifications = [];
  const seen = new Set();
  let scrolls = 0;
  const maxScrolls = Math.ceil(limit / 5);
  
  while (notifications.length < limit && scrolls < maxScrolls) {
    const items = await page.$$eval('article[data-testid="tweet"], [data-testid="notification"]', (els) =>
      els.map((el) => {
        const text = el.innerText || '';
        const time = el.querySelector('time')?.getAttribute('datetime') || '';
        const links = Array.from(el.querySelectorAll('a[href*="/status/"]')).map(a => a.getAttribute('href'));
        return { text: text.slice(0, 280), time, links: links.map(l => `https://x.com${l}`) };
      })
    );
    
    for (const item of items) {
      const key = item.text.slice(0, 100) + item.time;
      if (!seen.has(key) && key.trim()) {
        seen.add(key);
        notifications.push(item);
      }
    }
    
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await sleep(scrollDelay);
    scrolls++;
  }
  
  return notifications.slice(0, limit);
}

// ============================================================================
// Scrape Trending Topics
// ============================================================================

/**
 * Scrape trending topics from the Explore page
 */
export async function scrapeTrending(page, options = {}) {
  const { limit = 30 } = options;
  
  await page.goto('https://x.com/explore/tabs/trending', { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);
  
  // Scroll a few times to load more trends
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, window.innerHeight));
    await sleep(1500);
  }
  
  const trends = await page.$$eval('[data-testid="trend"]', (els) =>
    els.map((el) => {
      const spans = el.querySelectorAll('span');
      const texts = Array.from(spans).map(s => s.innerText).filter(Boolean);
      const category = texts[0] || '';
      const topic = texts.find(t => t.startsWith('#') || t.length > 3) || texts[1] || '';
      const posts = texts.find(t => /posts|tweets/i.test(t)) || '';
      return { category, topic, posts };
    })
  );
  
  return trends.slice(0, limit);
}

// ============================================================================
// Scrape Community Members
// ============================================================================

/**
 * Scrape members of an X Community
 */
export async function scrapeCommunityMembers(page, communityUrl, options = {}) {
  const { limit = 100, scrollDelay = 2000 } = options;
  
  const membersUrl = communityUrl.endsWith('/members')
    ? communityUrl
    : `${communityUrl}/members`;
  
  await page.goto(membersUrl, { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);
  
  const members = [];
  const seen = new Set();
  let scrolls = 0;
  const maxScrolls = Math.ceil(limit / 10);
  
  while (members.length < limit && scrolls < maxScrolls) {
    const users = await page.$$eval('[data-testid="UserCell"]', (cells) =>
      cells.map((cell) => {
        const name = cell.querySelector('[dir="ltr"] span')?.innerText || '';
        const handle = cell.querySelector('a[href^="/"]')?.getAttribute('href')?.replace('/', '') || '';
        const bio = cell.querySelector('[data-testid="UserDescription"]')?.innerText || '';
        return { name, handle, bio };
      })
    );
    
    for (const user of users) {
      if (!seen.has(user.handle) && user.handle) {
        seen.add(user.handle);
        members.push(user);
      }
    }
    
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await sleep(scrollDelay);
    scrolls++;
  }
  
  return members.slice(0, limit);
}

// ============================================================================
// Scrape Spaces
// ============================================================================

/**
 * Scrape X Spaces from search results
 */
export async function scrapeSpaces(page, query, options = {}) {
  const { limit = 20, scrollDelay = 2000 } = options;
  
  await page.goto(`https://x.com/search?q=${encodeURIComponent(query)}&f=top`, {
    waitUntil: 'networkidle2',
  });
  await randomDelay(2000, 3000);
  
  const spaces = [];
  const seen = new Set();
  let scrolls = 0;
  const maxScrolls = Math.ceil(limit / 3);
  
  while (spaces.length < limit && scrolls < maxScrolls) {
    const found = await page.$$eval('a[href*="/i/spaces/"]', (links) =>
      links.map((link) => {
        const href = link.getAttribute('href') || '';
        const card = link.closest('div[data-testid]') || link.parentElement;
        const title = card?.querySelector('span')?.innerText || '';
        return {
          title,
          link: href.startsWith('http') ? href : `https://x.com${href}`,
        };
      })
    );
    
    for (const space of found) {
      if (!seen.has(space.link) && space.link) {
        seen.add(space.link);
        spaces.push(space);
      }
    }
    
    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
    await sleep(scrollDelay);
    scrolls++;
  }
  
  return spaces.slice(0, limit);
}

// ============================================================================
// Main Export
// ============================================================================

export default {
  // Core
  createBrowser,
  createPage,
  loginWithCookie,
  
  // Scrapers
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
  
  // Export
  exportToJSON,
  exportToCSV,
};

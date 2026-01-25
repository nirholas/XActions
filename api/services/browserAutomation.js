/**
 * Browser Automation Service
 * 
 * Provides browser automation for X/Twitter scraping and automation.
 * Wraps the scrapers from src/scrapers with session cookie handling.
 * 
 * @module api/services/browserAutomation
 * @author nichxbt
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// ============================================================================
// Core Utilities
// ============================================================================

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = (min = 1000, max = 3000) => sleep(min + Math.random() * (max - min));

// Browser instance management (singleton)
let browserInstance = null;

/**
 * Get or create browser instance
 */
async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080'
      ]
    });
  }
  return browserInstance;
}

/**
 * Close browser instance
 */
export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Create an authenticated page with session cookie
 */
async function getAuthenticatedPage(sessionCookie) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  // Set viewport with slight randomization
  await page.setViewport({ 
    width: 1280 + Math.floor(Math.random() * 100), 
    height: 800 + Math.floor(Math.random() * 100) 
  });

  // Set user agent
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // Set session cookie if provided
  if (sessionCookie) {
    await page.setCookie({
      name: 'auth_token',
      value: sessionCookie,
      domain: '.x.com',
      path: '/',
      httpOnly: true,
      secure: true,
    });
  }

  return page;
}

// ============================================================================
// Profile Scraper
// ============================================================================

/**
 * Scrape profile information for a user
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {string} username - Twitter username (without @)
 * @returns {Object} Profile data
 */
export async function scrapeProfile(sessionCookie, username) {
  const page = await getAuthenticatedPage(sessionCookie);
  
  try {
    await page.goto(\`https://x.com/\${username}\`, { waitUntil: 'networkidle2' });
    await randomDelay();

    const profile = await page.evaluate(() => {
      const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
      const getAttr = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) || null;

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
        joinDate: getText('[data-testid="UserJoinDate"]'),
        following: followingLink?.querySelector('span')?.textContent || null,
        followers: followersLink?.querySelector('span')?.textContent || null,
        profileImage: avatar || null,
        verified: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"]'),
        protected: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Protected"]'),
      };
    });

    return profile;
  } finally {
    await page.close();
  }
}

// ============================================================================
// Followers Scraper
// ============================================================================

/**
 * Scrape followers for a user
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {string} username - Twitter username
 * @param {Object} options - Scraping options
 * @returns {Object} { users: [], nextCursor }
 */
export async function scrapeFollowers(sessionCookie, username, options = {}) {
  const { limit = 100, cursor } = options;
  const page = await getAuthenticatedPage(sessionCookie);

  try {
    await page.goto(\`https://x.com/\${username}/followers\`, { waitUntil: 'networkidle2' });
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
          const verifiedEl = cell.querySelector('svg[aria-label*="Verified"]');
          const avatarEl = cell.querySelector('img[src*="profile_images"]');

          const href = link?.getAttribute('href') || '';
          const username = href.split('/')[1];

          return {
            username,
            name: nameEl?.textContent || null,
            bio: bioEl?.textContent || null,
            verified: !!verifiedEl,
            profileImage: avatarEl?.src || null,
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

      // Scroll down
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await randomDelay(1500, 3000);
    }

    return {
      users: Array.from(users.values()).slice(0, limit),
      nextCursor: null, // Browser automation doesn't have cursor support
    };
  } finally {
    await page.close();
  }
}

// ============================================================================
// Following Scraper
// ============================================================================

/**
 * Scrape accounts a user is following
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {string} username - Twitter username
 * @param {Object} options - Scraping options
 * @returns {Object} { users: [], nextCursor }
 */
export async function scrapeFollowing(sessionCookie, username, options = {}) {
  const { limit = 100, cursor } = options;
  const page = await getAuthenticatedPage(sessionCookie);

  try {
    await page.goto(\`https://x.com/\${username}/following\`, { waitUntil: 'networkidle2' });
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
          const followsBackEl = cell.querySelector('[data-testid="userFollowIndicator"]');
          const verifiedEl = cell.querySelector('svg[aria-label*="Verified"]');
          const avatarEl = cell.querySelector('img[src*="profile_images"]');

          const href = link?.getAttribute('href') || '';
          const username = href.split('/')[1];

          return {
            username,
            name: nameEl?.textContent || null,
            bio: bioEl?.textContent || null,
            followsBack: !!followsBackEl,
            verified: !!verifiedEl,
            profileImage: avatarEl?.src || null,
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

    return {
      users: Array.from(users.values()).slice(0, limit),
      nextCursor: null,
    };
  } finally {
    await page.close();
  }
}

// ============================================================================
// Tweets Scraper
// ============================================================================

/**
 * Scrape tweets from a user's profile
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {string} username - Twitter username
 * @param {Object} options - Scraping options
 * @returns {Object} { items: [], nextCursor }
 */
export async function scrapeTweets(sessionCookie, username, options = {}) {
  const { limit = 50, includeReplies = false, cursor } = options;
  const page = await getAuthenticatedPage(sessionCookie);

  try {
    const url = includeReplies 
      ? \`https://x.com/\${username}/with_replies\`
      : \`https://x.com/\${username}\`;
      
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
          const images = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img')).map(i => ({
            type: 'image',
            url: i.src,
          }));
          const hasVideo = !!article.querySelector('[data-testid="videoPlayer"]');
          
          return {
            id: linkEl?.href?.match(/status\/(\d+)/)?.[1] || null,
            text: textEl?.textContent || null,
            timestamp: timeEl?.getAttribute('datetime') || null,
            likes: likesEl?.textContent || '0',
            retweets: retweetsEl?.textContent || '0',
            replies: repliesEl?.textContent || '0',
            views: viewsEl?.textContent || null,
            url: linkEl?.href || null,
            media: [...images, ...(hasVideo ? [{ type: 'video', url: linkEl?.href }] : [])],
            isRetweet: !!article.querySelector('[data-testid="socialContext"]'),
            isQuote: !!article.querySelector('[data-testid="quoteTweet"]'),
          };
        }).filter(t => t.id);
      });

      const prevSize = tweets.size;
      tweetData.forEach((t) => tweets.set(t.id, t));

      if (tweets.size === prevSize) {
        retries++;
      } else {
        retries = 0;
      }

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await randomDelay(1500, 3000);
    }

    return {
      items: Array.from(tweets.values()).slice(0, limit),
      nextCursor: null,
    };
  } finally {
    await page.close();
  }
}

// ============================================================================
// Search Tweets
// ============================================================================

/**
 * Search tweets by query
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {string} query - Search query
 * @param {Object} options - Scraping options
 * @returns {Object} { items: [], nextCursor }
 */
export async function searchTweets(sessionCookie, query, options = {}) {
  const { limit = 50, filter = 'latest', cursor } = options;
  const page = await getAuthenticatedPage(sessionCookie);

  try {
    const filterMap = {
      latest: 'live',
      top: 'top',
      people: 'user',
      photos: 'image',
      videos: 'video',
      media: 'media',
    };
    
    const encodedQuery = encodeURIComponent(query);
    const f = filterMap[filter] || 'live';
    
    await page.goto(\`https://x.com/search?q=\${encodedQuery}&src=typed_query&f=\${f}\`, {
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
          const authorName = article.querySelector('[data-testid="User-Name"]')?.textContent;
          const timeEl = article.querySelector('time');
          const linkEl = article.querySelector('a[href*="/status/"]');
          const likesEl = article.querySelector('[data-testid="like"] span span');
          const retweetsEl = article.querySelector('[data-testid="retweet"] span span');
          const repliesEl = article.querySelector('[data-testid="reply"] span span');
          
          return {
            id: linkEl?.href?.match(/status\/(\d+)/)?.[1] || null,
            text: textEl?.textContent || null,
            author: {
              username: authorLink?.href?.split('/')[3] || null,
              name: authorName?.split('@')[0]?.trim() || null,
            },
            timestamp: timeEl?.getAttribute('datetime') || null,
            likes: likesEl?.textContent || '0',
            retweets: retweetsEl?.textContent || '0',
            replies: repliesEl?.textContent || '0',
            url: linkEl?.href || null,
          };
        }).filter(t => t.id);
      });

      const prevSize = tweets.size;
      tweetData.forEach((t) => tweets.set(t.id, t));

      if (tweets.size === prevSize) {
        retries++;
      } else {
        retries = 0;
      }

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await randomDelay(1500, 3000);
    }

    return {
      items: Array.from(tweets.values()).slice(0, limit),
      nextCursor: null,
    };
  } finally {
    await page.close();
  }
}

// ============================================================================
// Thread Scraper
// ============================================================================

/**
 * Scrape a full tweet thread
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {string} tweetId - Tweet ID to scrape thread from
 * @returns {Object} { author, tweets: [] }
 */
export async function scrapeThread(sessionCookie, tweetId) {
  const page = await getAuthenticatedPage(sessionCookie);

  try {
    await page.goto(\`https://x.com/i/status/\${tweetId}\`, { waitUntil: 'networkidle2' });
    await randomDelay();

    // Scroll to load full thread
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await randomDelay(1000, 2000);
    }

    const thread = await page.evaluate((mainTweetId) => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      
      // Get main author
      const mainArticle = Array.from(articles).find(a => 
        a.querySelector(\`a[href*="/status/\${mainTweetId}"]\`)
      );
      const mainAuthorEl = mainArticle?.querySelector('[data-testid="User-Name"] a');
      const mainAuthor = mainAuthorEl?.href?.split('/')[3];
      const mainAuthorName = mainArticle?.querySelector('[data-testid="User-Name"]')?.textContent?.split('@')[0]?.trim();

      const tweets = Array.from(articles)
        .map((article) => {
          const textEl = article.querySelector('[data-testid="tweetText"]');
          const authorLink = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
          const timeEl = article.querySelector('time');
          const linkEl = article.querySelector('a[href*="/status/"]');
          const likesEl = article.querySelector('[data-testid="like"] span span');
          const retweetsEl = article.querySelector('[data-testid="retweet"] span span');
          const repliesEl = article.querySelector('[data-testid="reply"] span span');
          
          const author = authorLink?.href?.split('/')[3];
          
          return {
            id: linkEl?.href?.match(/status\/(\d+)/)?.[1] || null,
            text: textEl?.textContent || null,
            author,
            timestamp: timeEl?.getAttribute('datetime') || null,
            likes: likesEl?.textContent || '0',
            retweets: retweetsEl?.textContent || '0',
            replies: repliesEl?.textContent || '0',
            url: linkEl?.href || null,
            isMainAuthor: author === mainAuthor,
          };
        })
        .filter(t => t.id && t.isMainAuthor);

      return {
        author: {
          username: mainAuthor,
          name: mainAuthorName,
        },
        tweets,
      };
    }, tweetId);

    return thread;
  } finally {
    await page.close();
  }
}

// ============================================================================
// Hashtag Scraper
// ============================================================================

/**
 * Scrape tweets for a hashtag
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {string} hashtag - Hashtag to search (with or without #)
 * @param {Object} options - Scraping options
 * @returns {Object} { items: [], nextCursor }
 */
export async function scrapeHashtag(sessionCookie, hashtag, options = {}) {
  const tag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag;
  return searchTweets(sessionCookie, \`#\${tag}\`, options);
}

// ============================================================================
// Media Scraper
// ============================================================================

/**
 * Scrape media (images/videos) from a user
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {string} username - Twitter username
 * @param {Object} options - Scraping options
 * @returns {Object} { items: [], nextCursor }
 */
export async function scrapeMedia(sessionCookie, username, options = {}) {
  const { limit = 50, type = 'all', cursor } = options;
  const page = await getAuthenticatedPage(sessionCookie);

  try {
    await page.goto(\`https://x.com/\${username}/media\`, { waitUntil: 'networkidle2' });
    await randomDelay();

    const media = [];
    let retries = 0;
    const maxRetries = 10;

    while (media.length < limit && retries < maxRetries) {
      const newMedia = await page.evaluate(() => {
        const items = document.querySelectorAll('article[data-testid="tweet"]');
        return Array.from(items).flatMap((article) => {
          const tweetUrl = article.querySelector('a[href*="/status/"]')?.href;
          const tweetId = tweetUrl?.match(/status\/(\d+)/)?.[1];
          
          const images = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img'))
            .map(img => ({
              type: 'image',
              url: img.src.replace(/&name=\w+/, '&name=large'),
              tweetUrl,
              tweetId,
            }));
          
          const hasVideo = !!article.querySelector('[data-testid="videoPlayer"]');
          const videos = hasVideo ? [{
            type: 'video',
            url: tweetUrl,
            tweetUrl,
            tweetId,
          }] : [];
          
          return [...images, ...videos];
        });
      });

      const prevLength = media.length;
      newMedia.forEach((m) => {
        if (!media.find(existing => existing.url === m.url)) {
          if (type === 'all' || type === m.type + 's') {
            media.push(m);
          }
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

    return {
      items: media.slice(0, limit),
      nextCursor: null,
    };
  } finally {
    await page.close();
  }
}

// ============================================================================
// Tweet Likes Scraper (users who liked a tweet)
// ============================================================================

/**
 * Scrape users who liked a tweet
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {string} tweetId - Tweet ID
 * @param {Object} options - Scraping options
 * @returns {Object} { users: [], nextCursor }
 */
export async function scrapeTweetLikes(sessionCookie, tweetId, options = {}) {
  const { limit = 100, cursor } = options;
  const page = await getAuthenticatedPage(sessionCookie);

  try {
    await page.goto(\`https://x.com/i/status/\${tweetId}/likes\`, { waitUntil: 'networkidle2' });
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
          const verifiedEl = cell.querySelector('svg[aria-label*="Verified"]');

          const href = link?.getAttribute('href') || '';
          const username = href.split('/')[1];

          return {
            username,
            name: nameEl?.textContent || null,
            bio: bioEl?.textContent || null,
            verified: !!verifiedEl,
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

    return {
      users: Array.from(users.values()).slice(0, limit),
      nextCursor: null,
    };
  } finally {
    await page.close();
  }
}

// Alias for backward compatibility
export const scrapeLikes = scrapeTweetLikes;

// ============================================================================
// Tweet Retweets Scraper (users who retweeted a tweet)
// ============================================================================

/**
 * Scrape users who retweeted a tweet
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {string} tweetId - Tweet ID
 * @param {Object} options - Scraping options
 * @returns {Object} { users: [], nextCursor }
 */
export async function scrapeTweetRetweets(sessionCookie, tweetId, options = {}) {
  const { limit = 100, cursor } = options;
  const page = await getAuthenticatedPage(sessionCookie);

  try {
    await page.goto(\`https://x.com/i/status/\${tweetId}/retweets\`, { waitUntil: 'networkidle2' });
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
          const verifiedEl = cell.querySelector('svg[aria-label*="Verified"]');

          const href = link?.getAttribute('href') || '';
          const username = href.split('/')[1];

          return {
            username,
            name: nameEl?.textContent || null,
            bio: bioEl?.textContent || null,
            verified: !!verifiedEl,
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

    return {
      users: Array.from(users.values()).slice(0, limit),
      nextCursor: null,
    };
  } finally {
    await page.close();
  }
}

// Alias for backward compatibility
export const scrapeRetweets = scrapeTweetRetweets;

// ============================================================================
// Bookmarks Scraper
// ============================================================================

/**
 * Scrape user's bookmarks
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {Object} options - Scraping options
 * @returns {Object} { items: [], nextCursor }
 */
export async function scrapeBookmarks(sessionCookie, options = {}) {
  const { limit = 100, cursor } = options;
  const page = await getAuthenticatedPage(sessionCookie);

  try {
    await page.goto('https://x.com/i/bookmarks', { waitUntil: 'networkidle2' });
    await randomDelay();

    const bookmarks = new Map();
    let retries = 0;
    const maxRetries = 10;

    while (bookmarks.size < limit && retries < maxRetries) {
      const bookmarkData = await page.evaluate(() => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        return Array.from(articles).map((article) => {
          const textEl = article.querySelector('[data-testid="tweetText"]');
          const authorLink = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
          const authorName = article.querySelector('[data-testid="User-Name"]')?.textContent;
          const timeEl = article.querySelector('time');
          const linkEl = article.querySelector('a[href*="/status/"]');
          const likesEl = article.querySelector('[data-testid="like"] span span');
          const retweetsEl = article.querySelector('[data-testid="retweet"] span span');
          const repliesEl = article.querySelector('[data-testid="reply"] span span');
          
          return {
            id: linkEl?.href?.match(/status\/(\d+)/)?.[1] || null,
            text: textEl?.textContent || null,
            author: {
              username: authorLink?.href?.split('/')[3] || null,
              name: authorName?.split('@')[0]?.trim() || null,
            },
            timestamp: timeEl?.getAttribute('datetime') || null,
            likes: likesEl?.textContent || '0',
            retweets: retweetsEl?.textContent || '0',
            replies: repliesEl?.textContent || '0',
            url: linkEl?.href || null,
          };
        }).filter(t => t.id);
      });

      const prevSize = bookmarks.size;
      bookmarkData.forEach((b) => bookmarks.set(b.id, b));

      if (bookmarks.size === prevSize) {
        retries++;
      } else {
        retries = 0;
      }

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await randomDelay(1500, 3000);
    }

    return {
      items: Array.from(bookmarks.values()).slice(0, limit),
      nextCursor: null,
    };
  } finally {
    await page.close();
  }
}

// ============================================================================
// Tweet Details Scraper
// ============================================================================

/**
 * Scrape details of a specific tweet
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {string} tweetId - Tweet ID
 * @returns {Object} Tweet details
 */
export async function scrapeTweetDetails(sessionCookie, tweetId) {
  const page = await getAuthenticatedPage(sessionCookie);

  try {
    await page.goto(\`https://x.com/i/status/\${tweetId}\`, { waitUntil: 'networkidle2' });
    await randomDelay();

    const tweet = await page.evaluate(() => {
      const article = document.querySelector('article[data-testid="tweet"]');
      if (!article) return null;

      const textEl = article.querySelector('[data-testid="tweetText"]');
      const authorLink = article.querySelector('[data-testid="User-Name"] a[href^="/"]');
      const authorName = article.querySelector('[data-testid="User-Name"]')?.textContent;
      const timeEl = article.querySelector('time');
      const likesEl = article.querySelector('[data-testid="like"] span span');
      const retweetsEl = article.querySelector('[data-testid="retweet"] span span');
      const repliesEl = article.querySelector('[data-testid="reply"] span span');
      const viewsEl = article.querySelector('a[href*="/analytics"] span span');
      
      // Get media
      const images = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img')).map(i => ({
        type: 'image',
        url: i.src,
      }));
      const hasVideo = !!article.querySelector('[data-testid="videoPlayer"]');

      return {
        id: window.location.pathname.match(/status\/(\d+)/)?.[1] || null,
        text: textEl?.textContent || null,
        author: {
          username: authorLink?.href?.split('/')[3] || null,
          name: authorName?.split('@')[0]?.trim() || null,
        },
        timestamp: timeEl?.getAttribute('datetime') || null,
        likes: likesEl?.textContent || '0',
        retweets: retweetsEl?.textContent || '0',
        replies: repliesEl?.textContent || '0',
        views: viewsEl?.textContent || null,
        media: [...images, ...(hasVideo ? [{ type: 'video' }] : [])],
        isQuote: !!article.querySelector('[data-testid="quoteTweet"]'),
      };
    });

    return tweet;
  } finally {
    await page.close();
  }
}

// ============================================================================
// Video URL Extractor
// ============================================================================

/**
 * Extract video URLs from a tweet
 * @param {string} sessionCookie - X/Twitter auth token
 * @param {string} tweetId - Tweet ID containing video
 * @returns {Array} Array of video URLs with quality info
 */
export async function extractVideoUrls(sessionCookie, tweetId) {
  const page = await getAuthenticatedPage(sessionCookie);

  try {
    await page.goto(\`https://x.com/i/status/\${tweetId}\`, { waitUntil: 'networkidle2' });
    await randomDelay();

    // Click on video to ensure it loads
    const videoPlayer = await page.\$('[data-testid="videoPlayer"]');
    if (videoPlayer) {
      await videoPlayer.click().catch(() => {});
      await sleep(2000);
    }

    const videos = await page.evaluate(() => {
      const results = [];
      const pageContent = document.documentElement.innerHTML;
      
      // Look for video URLs in the page
      const patterns = [
        /https:\/\/video\.twimg\.com\/[^"'\s]+\.mp4[^"'\s]*/g,
        /https:\/\/[^"'\s]*\/amplify_video[^"'\s]*\.mp4[^"'\s]*/g,
        /https:\/\/[^"'\s]*\/ext_tw_video[^"'\s]*\.mp4[^"'\s]*/g,
      ];
      
      patterns.forEach(pattern => {
        const matches = pageContent.match(pattern) || [];
        matches.forEach(url => {
          // Clean up URL
          let cleanUrl = url.replace(/\\u002F/g, '/').replace(/\\/g, '');
          cleanUrl = cleanUrl.split('"')[0].split("'")[0].split(' ')[0];
          
          if (cleanUrl.includes('.mp4')) {
            // Extract quality from URL
            const qualityMatch = cleanUrl.match(/\/(\d+x\d+)\//);
            const quality = qualityMatch ? qualityMatch[1] : 'unknown';
            
            // Extract bitrate if available
            const bitrateMatch = cleanUrl.match(/vid\/(\d+)/);
            const bitrate = bitrateMatch ? parseInt(bitrateMatch[1]) : null;
            
            results.push({ 
              url: cleanUrl, 
              quality,
              bitrate,
              contentType: 'video/mp4',
            });
          }
        });
      });

      // Deduplicate by URL (ignoring query params)
      const unique = [];
      const seen = new Set();
      results.forEach(v => {
        const key = v.url.split('?')[0];
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(v);
        }
      });

      // Sort by quality (highest first)
      return unique.sort((a, b) => {
        const getPixels = (q) => {
          const match = q.match(/(\d+)x(\d+)/);
          return match ? parseInt(match[1]) * parseInt(match[2]) : 0;
        };
        return getPixels(b.quality) - getPixels(a.quality);
      });
    });

    return videos;
  } finally {
    await page.close();
  }
}

// ============================================================================
// Legacy BrowserAutomation Class (for backward compatibility)
// ============================================================================

class BrowserAutomation {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    this.browser = await getBrowser();
    return this.browser;
  }

  async createPage(sessionCookie) {
    return getAuthenticatedPage(sessionCookie);
  }

  async close() {
    await closeBrowser();
  }

  async randomDelay(min, max) {
    return randomDelay(min, max);
  }
}

// Create singleton instance
const browserAutomation = new BrowserAutomation();

// Export everything
export { BrowserAutomation };
export default browserAutomation;

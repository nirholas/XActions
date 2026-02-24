// src/discoveryExplore.js
// Discovery, Explore, Trends, Topics, Search for X/Twitter
// by nichxbt

/**
 * Discovery & Explore - Search, trends, topics, and explore feed automation
 * 
 * Features:
 * - Search tweets with advanced operators
 * - Scrape trending topics (global/local)
 * - Browse and follow topics
 * - Get explore/For You feed
 * - Advanced search with filters
 * - Grok AI topic summaries (2026)
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SELECTORS = {
  searchInput: '[data-testid="SearchBox_Search_Input"]',
  searchResults: '[data-testid="TypeaheadListItem"]',
  trendItem: '[data-testid="trend"]',
  topicFollow: '[data-testid="TopicFollow"]',
  exploreTabs: '[role="tab"]',
  tweet: 'article[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  latestTab: 'a[href*="f=live"]',
  peopleTab: 'a[href*="f=user"]',
  mediaTab: 'a[href*="f=image"]',
};

/**
 * Search tweets with query
 * @param {import('puppeteer').Page} page
 * @param {string} query - Search query (supports operators)
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export async function searchTweets(page, query, options = {}) {
  const { limit = 50, tab = 'latest', since = null, until = null } = options;

  let searchQuery = query;
  if (since) searchQuery += ` since:${since}`;
  if (until) searchQuery += ` until:${until}`;

  const tabParam = tab === 'latest' ? '&f=live' : tab === 'people' ? '&f=user' : tab === 'media' ? '&f=image' : '';
  await page.goto(`https://x.com/search?q=${encodeURIComponent(searchQuery)}${tabParam}`, { waitUntil: 'networkidle2' });
  await sleep(3000);

  const tweets = [];
  let scrollAttempts = 0;

  while (tweets.length < limit && scrollAttempts < Math.ceil(limit / 3)) {
    const newTweets = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel.tweet)).map(tweet => {
        const text = tweet.querySelector(sel.tweetText)?.textContent || '';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        const author = tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '';
        const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
        const likes = tweet.querySelector('[data-testid="like"] span')?.textContent || '0';
        const reposts = tweet.querySelector('[data-testid="retweet"] span')?.textContent || '0';
        return { text, time, author, link, likes, reposts };
      });
    }, SELECTORS);

    for (const tweet of newTweets) {
      if (tweet.link && !tweets.find(t => t.link === tweet.link)) {
        tweets.push(tweet);
      }
    }

    await page.evaluate(() => window.scrollBy(0, 1000));
    await sleep(1500);
    scrollAttempts++;
  }

  return tweets.slice(0, limit);
}

/**
 * Get trending topics
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export async function getTrends(page, options = {}) {
  const { location = 'global' } = options;

  await page.goto('https://x.com/explore/tabs/trending', { waitUntil: 'networkidle2' });
  await sleep(3000);

  const trends = await page.evaluate((sel) => {
    return Array.from(document.querySelectorAll(sel.trendItem)).map((trend, index) => {
      const name = trend.querySelector('[dir="ltr"] span')?.textContent || '';
      const category = trend.querySelector('[dir="ltr"]:first-child')?.textContent || '';
      const tweetCount = trend.querySelector('[dir="ltr"]:last-child')?.textContent || '';
      return { rank: index + 1, name, category, tweetCount: tweetCount.trim() };
    });
  }, SELECTORS);

  return { location, trends, scrapedAt: new Date().toISOString() };
}

/**
 * Get explore feed content
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 * @returns {Promise<Array>}
 */
export async function getExploreFeed(page, options = {}) {
  const { limit = 30, tab = 'foryou' } = options;

  const tabUrls = {
    foryou: 'https://x.com/explore',
    trending: 'https://x.com/explore/tabs/trending',
    news: 'https://x.com/explore/tabs/news',
    sports: 'https://x.com/explore/tabs/sports',
    entertainment: 'https://x.com/explore/tabs/entertainment',
  };

  await page.goto(tabUrls[tab] || tabUrls.foryou, { waitUntil: 'networkidle2' });
  await sleep(3000);

  const items = [];
  let scrollAttempts = 0;

  while (items.length < limit && scrollAttempts < 10) {
    const newItems = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel.tweet)).map(tweet => {
        const text = tweet.querySelector(sel.tweetText)?.textContent || '';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        const author = tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '';
        const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
        return { text, time, author, link };
      });
    }, SELECTORS);

    for (const item of newItems) {
      if (item.link && !items.find(i => i.link === item.link)) {
        items.push(item);
      }
    }

    await page.evaluate(() => window.scrollBy(0, 1000));
    await sleep(1500);
    scrollAttempts++;
  }

  return { tab, items: items.slice(0, limit), scrapedAt: new Date().toISOString() };
}

/**
 * Follow a topic
 * @param {import('puppeteer').Page} page
 * @param {string} topicName
 * @returns {Promise<Object>}
 */
export async function followTopic(page, topicName) {
  await page.goto(`https://x.com/search?q=${encodeURIComponent(topicName)}&f=topic`, { waitUntil: 'networkidle2' });
  await sleep(2000);

  try {
    await page.click(SELECTORS.topicFollow);
    await sleep(1500);
    return { success: true, topic: topicName, action: 'followed' };
  } catch (e) {
    return { success: false, topic: topicName, error: 'Topic follow button not found' };
  }
}

/**
 * Advanced search with multiple filters
 * @param {import('puppeteer').Page} page
 * @param {Object} filters
 * @returns {Promise<Array>}
 */
export async function advancedSearch(page, filters = {}) {
  const {
    allWords = '', exactPhrase = '', anyWords = '', noneOfWords = '',
    hashtags = '', from = '', to = '', mentioning = '',
    since = '', until = '', minLikes = 0, minRetweets = 0,
    hasMedia = false, hasLinks = false, lang = '',
    limit = 50,
  } = filters;

  let query = '';
  if (allWords) query += allWords + ' ';
  if (exactPhrase) query += `"${exactPhrase}" `;
  if (anyWords) query += `(${anyWords.split(' ').join(' OR ')}) `;
  if (noneOfWords) query += noneOfWords.split(' ').map(w => `-${w}`).join(' ') + ' ';
  if (hashtags) query += hashtags.split(' ').map(h => h.startsWith('#') ? h : `#${h}`).join(' ') + ' ';
  if (from) query += `from:${from} `;
  if (to) query += `to:${to} `;
  if (mentioning) query += `@${mentioning} `;
  if (since) query += `since:${since} `;
  if (until) query += `until:${until} `;
  if (minLikes > 0) query += `min_faves:${minLikes} `;
  if (minRetweets > 0) query += `min_retweets:${minRetweets} `;
  if (hasMedia) query += 'filter:media ';
  if (hasLinks) query += 'filter:links ';
  if (lang) query += `lang:${lang} `;

  return searchTweets(page, query.trim(), { limit });
}

export default {
  searchTweets,
  getTrends,
  getExploreFeed,
  followTopic,
  advancedSearch,
  SELECTORS,
};

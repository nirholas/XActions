// src/creatorStudio.js
// Creator Studio and monetization tools for X/Twitter
// by nichxbt

/**
 * Creator Studio - Analytics, subscriptions, tips, revenue
 * 
 * Features:
 * - Account and post analytics
 * - Revenue tracking
 * - Subscription management
 * - Tip configuration
 * - X Money integration (2026)
 * - Affiliate tracking
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SELECTORS = {
  analyticsNav: 'a[href="/i/account_analytics"]',
  impressions: '[data-testid="impressions"]',
  engagements: '[data-testid="engagements"]',
  followersChart: '[data-testid="followersChart"]',
  revenueTab: '[data-testid="revenueTab"]',
  monetization: 'a[href="/settings/monetization"]',
  subscriptionSettings: '[data-testid="subscriptionSettings"]',
  tipsSettings: '[data-testid="tipsSettings"]',
  analyticsExport: '[data-testid="exportAnalytics"]',
};

/**
 * Get account analytics
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function getAccountAnalytics(page, options = {}) {
  const { period = '28d' } = options;

  await page.goto('https://x.com/i/account_analytics', { waitUntil: 'networkidle2' });
  await sleep(3000);

  const analytics = await page.evaluate(() => {
    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '0';
    
    // Try to extract key metrics from the analytics page
    const metrics = {};
    const statElements = document.querySelectorAll('[data-testid*="stat"], [data-testid*="metric"]');
    statElements.forEach(el => {
      const label = el.querySelector('span:first-child')?.textContent || '';
      const value = el.querySelector('span:last-child')?.textContent || '';
      if (label && value) metrics[label] = value;
    });

    // Also try generic extraction
    const cards = document.querySelectorAll('[role="listitem"], [data-testid="analyticsCard"]');
    cards.forEach(card => {
      const text = card.textContent?.trim() || '';
      if (text) metrics[`card_${cards.length}`] = text.substring(0, 200);
    });

    return metrics;
  });

  return {
    period,
    analytics,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Get analytics for a specific post
 * @param {import('puppeteer').Page} page
 * @param {string} postUrl
 * @returns {Promise<Object>}
 */
export async function getPostAnalytics(page, postUrl) {
  await page.goto(postUrl, { waitUntil: 'networkidle2' });
  await sleep(2000);

  // Click analytics button on the post
  try {
    await page.click('[data-testid="analyticsButton"]');
    await sleep(2000);
  } catch (e) {
    // Analytics may be inline on the post
  }

  const analytics = await page.evaluate(() => {
    const tweet = document.querySelector('article[data-testid="tweet"]');
    if (!tweet) return null;

    return {
      likes: tweet.querySelector('[data-testid="like"] span')?.textContent || '0',
      reposts: tweet.querySelector('[data-testid="retweet"] span')?.textContent || '0',
      replies: tweet.querySelector('[data-testid="reply"] span')?.textContent || '0',
      bookmarks: tweet.querySelector('[data-testid="bookmark"] span')?.textContent || '0',
      views: tweet.querySelector('[data-testid="impressions"], [data-testid="analyticsButton"] span')?.textContent || '0',
    };
  });

  return {
    postUrl,
    analytics: analytics || { error: 'Could not extract analytics' },
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Get revenue/earnings data
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Object>}
 */
export async function getRevenue(page) {
  await page.goto('https://x.com/settings/monetization', { waitUntil: 'networkidle2' });
  await sleep(3000);

  const revenue = await page.evaluate(() => {
    const text = document.querySelector('[role="main"]')?.textContent || '';
    return { rawText: text.substring(0, 500) };
  });

  return {
    revenue,
    note: 'Revenue data requires Premium subscription and eligibility',
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Get subscriber list
 * @param {import('puppeteer').Page} page
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function getSubscribers(page, options = {}) {
  const { limit = 50 } = options;

  await page.goto('https://x.com/settings/monetization/subscribers', { waitUntil: 'networkidle2' });
  await sleep(3000);

  const subscribers = await page.evaluate((sel, max) => {
    return Array.from(document.querySelectorAll('[data-testid="UserCell"]')).slice(0, max).map(user => {
      const name = user.querySelector('[dir="ltr"]')?.textContent || '';
      const username = user.querySelector('a[role="link"]')?.href?.split('/').pop() || '';
      const since = user.querySelector('time')?.getAttribute('datetime') || '';
      return { name, username, subscribedSince: since };
    });
  }, SELECTORS, limit);

  return {
    subscribers,
    count: subscribers.length,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Creator dashboard - combined analytics
 * @param {import('puppeteer').Page} page
 * @returns {Promise<Object>}
 */
export async function getCreatorDashboard(page) {
  const analytics = await getAccountAnalytics(page);
  const revenue = await getRevenue(page);

  return {
    analytics: analytics.analytics,
    revenue: revenue.revenue,
    scrapedAt: new Date().toISOString(),
  };
}

export default {
  getAccountAnalytics,
  getPostAnalytics,
  getRevenue,
  getSubscribers,
  getCreatorDashboard,
  SELECTORS,
};

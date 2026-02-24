// src/businessTools.js
// Business and advertising tools for X/Twitter
// by nichxbt

/**
 * Business Tools - Ads, campaigns, brand monitoring, audience insights
 * 
 * Features:
 * - Brand mention monitoring
 * - Competitor analysis
 * - Audience insights
 * - Campaign management basics
 * - Social listening
 * - Post boosting
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const SELECTORS = {
  tweet: 'article[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  userCell: '[data-testid="UserCell"]',
  searchInput: '[data-testid="SearchBox_Search_Input"]',
};

/**
 * Monitor brand mentions
 * @param {import('puppeteer').Page} page
 * @param {string} brandName - Brand name or @handle to monitor
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function monitorBrandMentions(page, brandName, options = {}) {
  const { limit = 50, since = null } = options;

  let query = brandName;
  if (since) query += ` since:${since}`;

  await page.goto(`https://x.com/search?q=${encodeURIComponent(query)}&f=live`, {
    waitUntil: 'networkidle2',
  });
  await sleep(3000);

  const mentions = [];
  let scrollAttempts = 0;

  while (mentions.length < limit && scrollAttempts < Math.ceil(limit / 5)) {
    const newMentions = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel.tweet)).map(tweet => {
        const text = tweet.querySelector(sel.tweetText)?.textContent || '';
        const author = tweet.querySelector('[data-testid="User-Name"] a')?.textContent || '';
        const time = tweet.querySelector('time')?.getAttribute('datetime') || '';
        const link = tweet.querySelector('a[href*="/status/"]')?.href || '';
        const likes = tweet.querySelector('[data-testid="like"] span')?.textContent || '0';
        const reposts = tweet.querySelector('[data-testid="retweet"] span')?.textContent || '0';

        // Basic sentiment analysis
        const lowerText = text.toLowerCase();
        let sentiment = 'neutral';
        const positive = ['love', 'great', 'amazing', 'awesome', 'excellent', 'best', 'good', '🔥', '❤️', '👏'];
        const negative = ['hate', 'terrible', 'worst', 'bad', 'awful', 'horrible', 'scam', '💩', '👎'];
        if (positive.some(w => lowerText.includes(w))) sentiment = 'positive';
        if (negative.some(w => lowerText.includes(w))) sentiment = 'negative';

        return { text, author, time, link, likes, reposts, sentiment };
      });
    }, SELECTORS);

    for (const mention of newMentions) {
      if (mention.link && !mentions.find(m => m.link === mention.link)) {
        mentions.push(mention);
      }
    }

    await page.evaluate(() => window.scrollBy(0, 1000));
    await sleep(1500);
    scrollAttempts++;
  }

  const result = mentions.slice(0, limit);
  const sentimentBreakdown = {
    positive: result.filter(m => m.sentiment === 'positive').length,
    negative: result.filter(m => m.sentiment === 'negative').length,
    neutral: result.filter(m => m.sentiment === 'neutral').length,
  };

  return {
    brand: brandName,
    mentions: result,
    count: result.length,
    sentiment: sentimentBreakdown,
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Get audience insights for an account
 * @param {import('puppeteer').Page} page
 * @param {string} username
 * @param {Object} options
 * @returns {Promise<Object>}
 */
export async function getAudienceInsights(page, username, options = {}) {
  const { sampleSize = 50 } = options;

  // Scrape followers for analysis
  await page.goto(`https://x.com/${username}/followers`, { waitUntil: 'networkidle2' });
  await sleep(3000);

  const followers = [];
  let scrollAttempts = 0;

  while (followers.length < sampleSize && scrollAttempts < Math.ceil(sampleSize / 5)) {
    const newFollowers = await page.evaluate((sel) => {
      return Array.from(document.querySelectorAll(sel.userCell)).map(user => {
        const name = user.querySelector('[dir="ltr"]')?.textContent || '';
        const bio = user.querySelector('[data-testid="UserDescription"]')?.textContent || '';
        const isVerified = !!user.querySelector('[data-testid="icon-verified"]');
        return { name, bio: bio.substring(0, 200), isVerified };
      });
    }, SELECTORS);

    for (const f of newFollowers) {
      if (f.name && !followers.find(e => e.name === f.name)) {
        followers.push(f);
      }
    }

    await page.evaluate(() => window.scrollBy(0, 800));
    await sleep(1500);
    scrollAttempts++;
  }

  // Basic analysis
  const sample = followers.slice(0, sampleSize);
  const verifiedPct = Math.round((sample.filter(f => f.isVerified).length / sample.length) * 100);

  // Extract common interests from bios
  const bioWords = sample.map(f => f.bio.toLowerCase()).join(' ');
  const techKeywords = ['developer', 'engineer', 'coding', 'tech', 'AI', 'startup', 'founder', 'crypto', 'web3', 'design'];
  const interests = {};
  techKeywords.forEach(kw => {
    const count = (bioWords.match(new RegExp(kw, 'gi')) || []).length;
    if (count > 0) interests[kw] = count;
  });

  return {
    username,
    sampleSize: sample.length,
    verifiedFollowersPct: verifiedPct + '%',
    topInterests: Object.entries(interests).sort((a, b) => b[1] - a[1]).slice(0, 10),
    scrapedAt: new Date().toISOString(),
  };
}

/**
 * Competitor analysis
 * @param {import('puppeteer').Page} page
 * @param {Array<string>} competitors - Array of usernames to compare
 * @returns {Promise<Object>}
 */
export async function analyzeCompetitors(page, competitors) {
  const results = [];

  for (const username of competitors) {
    await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    const profile = await page.evaluate(() => {
      const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
      return {
        followers: getText('a[href$="/followers"] span'),
        following: getText('a[href$="/following"] span'),
        isVerified: !!document.querySelector('[data-testid="icon-verified"]'),
        bio: getText('[data-testid="UserDescription"]'),
      };
    });

    results.push({ username, ...profile });
    await sleep(1000);
  }

  return {
    competitors: results,
    comparedAt: new Date().toISOString(),
  };
}

export default {
  monitorBrandMentions,
  getAudienceInsights,
  analyzeCompetitors,
  SELECTORS,
};

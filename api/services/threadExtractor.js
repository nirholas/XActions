/**
 * Thread Extractor Service
 * 
 * Uses Puppeteer to load a Twitter/X thread URL, scroll through it,
 * and extract all tweets in order with text, media, stats, and timestamps.
 * 
 * @module api/services/threadExtractor
 * @author nichxbt
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// In-memory cache (keyed by tweet ID, TTL 24h)
const threadCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Parse a tweet URL and extract the tweet ID and username
 * @param {string} url - Twitter/X URL
 * @returns {{ tweetId: string, username: string } | null}
 */
export function parseTweetUrl(url) {
  const patterns = [
    /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/,
    /(?:mobile\.twitter\.com|mobile\.x\.com)\/(\w+)\/status\/(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { username: match[1], tweetId: match[2] };
    }
  }
  return null;
}

/**
 * Get a cached thread by tweet ID
 * @param {string} tweetId
 * @returns {object|null}
 */
export function getCachedThread(tweetId) {
  const entry = threadCache.get(tweetId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    threadCache.delete(tweetId);
    return null;
  }
  return entry.data;
}

/**
 * Cache a thread result
 * @param {string} tweetId
 * @param {object} data
 */
function cacheThread(tweetId, data) {
  threadCache.set(tweetId, { data, timestamp: Date.now() });
}

/**
 * Extract a full thread from a tweet URL using Puppeteer
 * 
 * @param {string} url - The tweet URL (x.com or twitter.com)
 * @param {object} [options]
 * @param {number} [options.timeout=30000] - Max time in ms
 * @param {number} [options.maxTweets=100] - Max tweets to extract  
 * @param {string} [options.cookie] - Optional auth_token cookie for private accounts
 * @returns {Promise<object>} Thread data
 */
export async function extractThread(url, options = {}) {
  const { timeout = 30000, maxTweets = 100, cookie } = options;

  const parsed = parseTweetUrl(url);
  if (!parsed) {
    throw new Error('Invalid tweet URL. Expected format: https://x.com/user/status/123456');
  }

  // Check cache first
  const cached = getCachedThread(parsed.tweetId);
  if (cached) {
    return cached;
  }

  // Normalize URL to x.com
  const normalizedUrl = `https://x.com/${parsed.username}/status/${parsed.tweetId}`;

  let browser = null;
  let page = null;

  try {
    browser = await puppeteer.launch({
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
        '--window-size=1920,1080',
      ],
    });

    page = await browser.newPage();

    // Set viewport and user-agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Set auth cookie if provided
    if (cookie) {
      await page.setCookie({
        name: 'auth_token',
        value: cookie,
        domain: '.x.com',
        path: '/',
        httpOnly: true,
        secure: true,
      });
    }

    // Navigate to the tweet
    await page.goto(normalizedUrl, { waitUntil: 'networkidle2', timeout });

    // Wait for tweets to load
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 15000 });

    // Give extra time for conversation thread to populate
    await sleep(2000);

    // Scroll and extract tweets
    const startTime = Date.now();
    let previousCount = 0;
    let noChangeAttempts = 0;
    const maxNoChange = 5;

    while (Date.now() - startTime < timeout - 5000 && noChangeAttempts < maxNoChange) {
      // Click any "Show more replies" / "Show this thread" buttons
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('[role="button"]'));
        buttons.forEach((btn) => {
          const text = btn.textContent?.toLowerCase() || '';
          if (text.includes('show') && (text.includes('more') || text.includes('thread') || text.includes('replies'))) {
            btn.click();
          }
        });
      });

      // Scroll down to load more
      await page.evaluate(() => window.scrollBy(0, 600));
      await sleep(1500);

      // Check current count
      const currentCount = await page.evaluate(() => {
        return document.querySelectorAll('article[data-testid="tweet"]').length;
      });

      if (currentCount === previousCount) {
        noChangeAttempts++;
      } else {
        noChangeAttempts = 0;
      }
      previousCount = currentCount;

      if (currentCount >= maxTweets) break;
    }

    // Extract all tweet data
    const rawData = await page.evaluate((authorUsername) => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const tweets = [];

      articles.forEach((article) => {
        try {
          // Get tweet text
          const textEl = article.querySelector('[data-testid="tweetText"]');
          const text = textEl ? textEl.textContent : '';

          // Get user info
          const userNameEl = article.querySelector('[data-testid="User-Name"]');
          const userNameText = userNameEl ? userNameEl.textContent : '';
          const handleMatch = userNameText.match(/@(\w+)/);
          const handle = handleMatch ? handleMatch[1] : '';

          // Get display name (text before the @)
          const nameLinks = userNameEl ? userNameEl.querySelectorAll('a') : [];
          const displayName = nameLinks.length > 0 ? nameLinks[0].textContent.trim() : '';

          // Get avatar
          const avatarEl = article.querySelector('img[src*="profile_images"]');
          const avatar = avatarEl ? avatarEl.src : '';

          // Get timestamp
          const timeEl = article.querySelector('time');
          const timestamp = timeEl ? timeEl.getAttribute('datetime') : '';

          // Get tweet URL
          const timeLink = timeEl ? timeEl.closest('a') : null;
          const tweetUrl = timeLink ? timeLink.href : '';

          // Get media (images)
          const images = Array.from(article.querySelectorAll('img[src*="media"], img[src*="twimg.com/media"]'))
            .map((img) => img.src)
            .filter((src) => !src.includes('profile_images') && !src.includes('emoji'));

          // Get videos
          const videos = Array.from(article.querySelectorAll('video'))
            .map((v) => v.src || v.poster)
            .filter(Boolean);

          // Get engagement stats
          const getStatValue = (testId) => {
            const el = article.querySelector(`[data-testid="${testId}"]`);
            if (!el) return 0;
            const text = el.getAttribute('aria-label') || el.textContent || '0';
            const num = text.match(/[\d,]+/);
            return num ? parseInt(num[0].replace(/,/g, ''), 10) : 0;
          };

          const stats = {
            replies: getStatValue('reply'),
            retweets: getStatValue('retweet'),
            likes: getStatValue('like'),
            bookmarks: getStatValue('bookmark'),
            views: getStatValue('analytics'),
          };

          tweets.push({
            text,
            handle,
            displayName,
            avatar,
            timestamp,
            tweetUrl,
            images,
            videos,
            stats,
          });
        } catch (e) {
          // Skip malformed tweet
        }
      });

      return tweets;
    }, parsed.username);

    // Filter to only thread author's tweets and deduplicate
    const authorLower = parsed.username.toLowerCase();
    const seen = new Set();
    const threadTweets = rawData
      .filter((t) => {
        if (t.handle.toLowerCase() !== authorLower) return false;
        if (!t.text && t.images.length === 0 && t.videos.length === 0) return false;
        const key = t.tweetUrl || t.text.slice(0, 100);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (threadTweets.length === 0) {
      throw new Error('No thread tweets found. The tweet may not be part of a thread, or the page failed to load.');
    }

    // Build author info from first tweet
    const firstTweet = threadTweets[0];
    const author = {
      name: firstTweet.displayName,
      username: firstTweet.handle,
      avatar: firstTweet.avatar,
    };

    // Number the tweets
    const numberedTweets = threadTweets.map((t, i) => ({
      number: i + 1,
      text: t.text,
      media: [...t.images.map((url) => ({ type: 'image', url })), ...t.videos.map((url) => ({ type: 'video', url }))],
      stats: t.stats,
      timestamp: t.timestamp,
      url: t.tweetUrl,
    }));

    const result = {
      author,
      tweets: numberedTweets,
      threadLength: numberedTweets.length,
      sourceUrl: normalizedUrl,
      extractedAt: new Date().toISOString(),
    };

    // Cache the result
    cacheThread(parsed.tweetId, result);

    return result;
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Format thread as plain text
 * @param {object} thread - Extracted thread data
 * @returns {string}
 */
export function formatAsText(thread) {
  let output = `Thread by @${thread.author.username}\n`;
  output += `${'='.repeat(50)}\n\n`;

  thread.tweets.forEach((t) => {
    output += `[${t.number}/${thread.threadLength}]\n`;
    output += `${t.text}\n\n`;
  });

  output += `\nOriginal: ${thread.sourceUrl}\n`;
  return output;
}

/**
 * Format thread as markdown
 * @param {object} thread - Extracted thread data
 * @returns {string}
 */
export function formatAsMarkdown(thread) {
  let output = `# Thread by @${thread.author.username}\n\n`;
  output += `> ${thread.threadLength} tweets | ${new Date(thread.tweets[0]?.timestamp).toLocaleDateString()}\n\n`;
  output += `---\n\n`;

  thread.tweets.forEach((t) => {
    output += `**${t.number}/${thread.threadLength}**\n\n`;
    output += `${t.text}\n\n`;

    t.media.forEach((m) => {
      if (m.type === 'image') {
        output += `![Image](${m.url})\n\n`;
      } else {
        output += `🎥 [Video](${m.url})\n\n`;
      }
    });

    output += `---\n\n`;
  });

  output += `\n[Original Thread](${thread.sourceUrl})\n`;
  return output;
}

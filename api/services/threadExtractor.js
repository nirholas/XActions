/**
 * Thread Extractor Service
 * 
 * Uses Puppeteer to load a Twitter/X thread URL, detect whether it's a thread,
 * scroll through to load all connected tweets, and extract them in order with
 * text, media URLs, engagement stats, and timestamps.
 * 
 * Features:
 * - Browser pool (max 2 instances) — reused across requests
 * - Explicit thread detection ("Show this thread" / multiple connected tweets)
 * - Handles "Show more replies" clicks for long threads
 * - 30-second timeout by default
 * - In-memory cache (24h TTL)
 * 
 * @module api/services/threadExtractor
 * @author nichxbt
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ============================================================================
// Browser Pool (max 2 instances)
// ============================================================================

const POOL_SIZE = 2;
const browsers = [];

async function createBrowser() {
  return puppeteer.launch({
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
}

async function getBrowser() {
  // Reuse an existing browser if available
  for (const entry of browsers) {
    if (!entry.busy) {
      if (entry.browser.connected) {
        entry.busy = true;
        return entry;
      }
      // Browser disconnected — replace it
      const idx = browsers.indexOf(entry);
      try { await entry.browser.close(); } catch {}
      const browser = await createBrowser();
      browsers[idx] = { browser, busy: true };
      return browsers[idx];
    }
  }

  // Create new browser if pool has room
  if (browsers.length < POOL_SIZE) {
    const browser = await createBrowser();
    const entry = { browser, busy: true };
    browsers.push(entry);
    return entry;
  }

  // Pool full — wait for one to free up
  return new Promise((resolve) => {
    const check = setInterval(() => {
      for (const entry of browsers) {
        if (!entry.busy) {
          entry.busy = true;
          clearInterval(check);
          resolve(entry);
          return;
        }
      }
    }, 200);
  });
}

function releaseBrowser(entry) {
  if (entry) entry.busy = false;
}

/**
 * Close all browsers in the pool (for graceful shutdown)
 */
export async function closePool() {
  for (const entry of browsers) {
    try { await entry.browser.close(); } catch {}
  }
  browsers.length = 0;
}

// ============================================================================
// In-memory Cache (keyed by tweet ID, TTL 24h)
// ============================================================================

const threadCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Parse a tweet URL and extract the tweet ID and username
 * @param {string} url - Twitter/X URL
 * @returns {{ tweetId: string, username: string } | null}
 */
export function parseTweetUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const patterns = [
    /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/,
    /(?:mobile\.twitter\.com|mobile\.x\.com)\/(\w+)\/status\/(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.trim().match(pattern);
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

// ============================================================================
// Thread Detection
// ============================================================================

/**
 * Detect whether a loaded page contains a thread (not just a single tweet).
 *
 * Checks for:
 * 1. "Show this thread" link/button anywhere on the page
 * 2. Multiple tweet articles from the same author connected by the vertical
 *    reply line (self-thread indicator)
 * 3. The conversation container holding >1 tweet from the same handle
 *
 * @param {import('puppeteer').Page} page
 * @param {string} authorUsername - The tweet author's handle (without @)
 * @returns {Promise<boolean>}
 */
async function detectThread(page, authorUsername) {
  return page.evaluate((author) => {
    const authorLower = author.toLowerCase();

    // Signal 1 — "Show this thread" text on page
    const allText = document.body.innerText.toLowerCase();
    if (allText.includes('show this thread')) return true;

    // Signal 2 — Multiple articles from the same author
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    let authorTweetCount = 0;
    for (const article of articles) {
      const userEl = article.querySelector('[data-testid="User-Name"]');
      if (!userEl) continue;
      const handleMatch = userEl.textContent.match(/@(\w+)/);
      if (handleMatch && handleMatch[1].toLowerCase() === authorLower) {
        authorTweetCount++;
      }
      if (authorTweetCount >= 2) return true;
    }

    // Signal 3 — Vertical connector line between tweets (self-replies)
    // X renders a vertical blue/gray line connecting thread tweets
    const connectors = document.querySelectorAll('[data-testid="inline-thread-connector"], [class*="r-1awozwy"]');
    if (connectors.length > 0) return true;

    return false;
  }, authorUsername);
}

// ============================================================================
// "Show more" / "Show this thread" Button Clicker
// ============================================================================

/**
 * Click all visible expansion buttons on the page.
 * Returns the number of buttons clicked.
 *
 * Targets:
 * - "Show this thread"
 * - "Show more replies"
 * - "Show replies"
 * - "Show" (generic show-more)
 *
 * @param {import('puppeteer').Page} page
 * @returns {Promise<number>}
 */
async function clickExpansionButtons(page) {
  return page.evaluate(() => {
    let clicked = 0;
    // Check both [role="button"] and <a> elements
    const candidates = [
      ...document.querySelectorAll('[role="button"]'),
      ...document.querySelectorAll('[role="link"]'),
      ...document.querySelectorAll('a'),
    ];

    const targetPhrases = [
      'show this thread',
      'show more replies',
      'show replies',
      'show more',
    ];

    for (const el of candidates) {
      const text = (el.textContent || '').toLowerCase().trim();
      if (targetPhrases.some((phrase) => text.includes(phrase))) {
        try {
          el.click();
          clicked++;
        } catch {}
      }
    }
    return clicked;
  });
}

// ============================================================================
// Tweet Data Extraction (runs inside page context)
// ============================================================================

/**
 * Extract structured data from every tweet article visible on the page.
 * Runs inside page.evaluate().
 *
 * @returns {Array<object>}
 */
function extractTweetsFromPage() {
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  const tweets = [];

  articles.forEach((article) => {
    try {
      // Text
      const textEl = article.querySelector('[data-testid="tweetText"]');
      const text = textEl ? textEl.textContent : '';

      // User info
      const userNameEl = article.querySelector('[data-testid="User-Name"]');
      const userNameText = userNameEl ? userNameEl.textContent : '';
      const handleMatch = userNameText.match(/@(\w+)/);
      const handle = handleMatch ? handleMatch[1] : '';

      // Display name (first link inside User-Name)
      const nameLinks = userNameEl ? userNameEl.querySelectorAll('a') : [];
      const displayName = nameLinks.length > 0 ? nameLinks[0].textContent.trim() : '';

      // Avatar
      const avatarEl = article.querySelector('img[src*="profile_images"]');
      const avatar = avatarEl ? avatarEl.src : '';

      // Timestamp
      const timeEl = article.querySelector('time');
      const timestamp = timeEl ? timeEl.getAttribute('datetime') : '';

      // Tweet URL
      const timeLink = timeEl ? timeEl.closest('a') : null;
      const tweetUrl = timeLink ? timeLink.href : '';

      // Media — images
      const images = Array.from(
        article.querySelectorAll('img[src*="media"], img[src*="twimg.com/media"]')
      )
        .map((img) => img.src)
        .filter((src) => !src.includes('profile_images') && !src.includes('emoji'));

      // Media — videos (src or poster)
      const videos = Array.from(article.querySelectorAll('video'))
        .map((v) => v.src || v.poster)
        .filter(Boolean);

      // Engagement stats
      const getStatValue = (testId) => {
        const el = article.querySelector(`[data-testid="${testId}"]`);
        if (!el) return 0;
        const label = el.getAttribute('aria-label') || el.textContent || '0';
        const num = label.match(/[\d,]+/);
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
    } catch {
      // Skip malformed tweet
    }
  });

  return tweets;
}

// ============================================================================
// Main: extractThread()
// ============================================================================

/**
 * Extract a full thread from a tweet URL using Puppeteer.
 *
 * 1. Loads the tweet URL in a pooled browser
 * 2. Detects whether the tweet is part of a thread
 * 3. Scrolls down, clicking "Show this thread" / "Show more replies"
 * 4. Extracts all author tweets in chronological order
 * 5. Returns structured data with text, media, stats, timestamps
 *
 * @param {string} url - The tweet URL (x.com or twitter.com)
 * @param {object} [options]
 * @param {number} [options.timeout=30000] - Max time in ms (default 30s)
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

  let browserEntry = null;
  let page = null;

  try {
    browserEntry = await getBrowser();
    page = await browserEntry.browser.newPage();

    // Viewport + user-agent
    await page.setViewport({
      width: 1920 + Math.floor(Math.random() * 80),
      height: 1080,
    });
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

    // Wait for at least one tweet article
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 15000 });

    // Give extra time for conversation thread to populate
    await sleep(2000);

    // ------------------------------------------------------------------
    // Detect if this is actually a thread
    // ------------------------------------------------------------------
    const isThread = await detectThread(page, parsed.username);

    if (!isThread) {
      // Still extract the single tweet so the caller gets data back,
      // but flag it as isThread: false
      const singleRaw = await page.evaluate(extractTweetsFromPage);
      const authorLower = parsed.username.toLowerCase();
      const singleTweet = singleRaw.find(
        (t) => t.handle.toLowerCase() === authorLower
      );

      if (!singleTweet) {
        throw new Error('Could not extract the tweet. The page may have failed to load.');
      }

      const result = {
        isThread: false,
        author: {
          name: singleTweet.displayName,
          username: singleTweet.handle,
          avatar: singleTweet.avatar,
        },
        tweets: [
          {
            number: 1,
            text: singleTweet.text,
            media: [
              ...singleTweet.images.map((u) => ({ type: 'image', url: u })),
              ...singleTweet.videos.map((u) => ({ type: 'video', url: u })),
            ],
            stats: singleTweet.stats,
            timestamp: singleTweet.timestamp,
            url: singleTweet.tweetUrl,
          },
        ],
        threadLength: 1,
        sourceUrl: normalizedUrl,
        extractedAt: new Date().toISOString(),
      };

      cacheThread(parsed.tweetId, result);
      return result;
    }

    // ------------------------------------------------------------------
    // Scroll + click expansion buttons to load entire thread
    // ------------------------------------------------------------------
    const startTime = Date.now();
    let previousCount = 0;
    let noChangeRounds = 0;
    const maxNoChange = 5; // give up after 5 rounds with no new tweets

    while (Date.now() - startTime < timeout - 5000 && noChangeRounds < maxNoChange) {
      // Click "Show this thread" / "Show more replies" buttons
      const clicked = await clickExpansionButtons(page);

      // If we clicked something, wait a bit longer for content to load
      if (clicked > 0) {
        await sleep(2000);
      }

      // Scroll down to trigger lazy loading
      await page.evaluate(() => window.scrollBy(0, 800));
      await sleep(1500);

      // Count visible tweets
      const currentCount = await page.evaluate(
        () => document.querySelectorAll('article[data-testid="tweet"]').length
      );

      if (currentCount === previousCount) {
        noChangeRounds++;
      } else {
        noChangeRounds = 0;
      }
      previousCount = currentCount;

      if (currentCount >= maxTweets) break;
    }

    // ------------------------------------------------------------------
    // Extract all tweet data from the page
    // ------------------------------------------------------------------
    const rawData = await page.evaluate(extractTweetsFromPage);

    // Filter to thread author's tweets, deduplicate, sort chronologically
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

    // Build author info
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
      media: [
        ...t.images.map((u) => ({ type: 'image', url: u })),
        ...t.videos.map((u) => ({ type: 'video', url: u })),
      ],
      stats: t.stats,
      timestamp: t.timestamp,
      url: t.tweetUrl,
    }));

    const result = {
      isThread: true,
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
    releaseBrowser(browserEntry);
  }
}

// ============================================================================
// Formatters
// ============================================================================

/**
 * Format thread as plain text
 * @param {object} thread - Extracted thread data
 * @returns {string}
 */
export function formatAsText(thread) {
  let output = `Thread by @${thread.author.username}`;
  if (!thread.isThread) output += ' (single tweet — not a thread)';
  output += '\n';
  output += `${'='.repeat(50)}\n\n`;

  thread.tweets.forEach((t) => {
    output += `[${t.number}/${thread.threadLength}]\n`;
    output += `${t.text}\n`;
    if (t.media.length > 0) {
      output += `  📎 ${t.media.length} attachment(s)\n`;
    }
    output += '\n';
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
  if (!thread.isThread) {
    output += `> **Note:** This is a single tweet, not a thread.\n\n`;
  }
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

    if (t.stats) {
      const parts = [];
      if (t.stats.likes) parts.push(`❤️ ${t.stats.likes}`);
      if (t.stats.retweets) parts.push(`🔁 ${t.stats.retweets}`);
      if (t.stats.replies) parts.push(`💬 ${t.stats.replies}`);
      if (t.stats.views) parts.push(`👁 ${t.stats.views}`);
      if (parts.length > 0) output += `${parts.join(' · ')}\n\n`;
    }

    output += `---\n\n`;
  });

  output += `\n[Original Thread](${thread.sourceUrl})\n`;
  return output;
}

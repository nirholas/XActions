/**
 * Video Extractor Service
 * 
 * Extracts video URLs from X/Twitter tweets using Puppeteer.
 * Intercepts GraphQL TweetDetail responses to get video variants
 * with quality/bitrate info, then returns structured results.
 * 
 * @module api/services/videoExtractor
 * @author nichxbt
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// ============================================================================
// Browser Pool (max 2 instances)
// ============================================================================

const POOL_SIZE = 2;
const EXTRACTION_TIMEOUT = 15000; // 15 seconds max per extraction
const browsers = [];
let poolInitialized = false;

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
      // Verify browser is still connected
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

  // Pool full, wait for one to become available
  return new Promise((resolve) => {
    const check = setInterval(async () => {
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
 * Close all browsers in the pool
 */
export async function closePool() {
  for (const entry of browsers) {
    try { await entry.browser.close(); } catch {}
  }
  browsers.length = 0;
}

// ============================================================================
// URL Validation
// ============================================================================

const TWEET_URL_RE = /^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/;

/**
 * Parse and validate a tweet URL
 * @param {string} url
 * @returns {{ username: string, tweetId: string } | null}
 */
export function parseTweetUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.trim().match(TWEET_URL_RE);
  if (!match) return null;
  return { username: match[1], tweetId: match[2] };
}

// ============================================================================
// Video Extraction
// ============================================================================

/**
 * Extract video info from a tweet URL using Puppeteer.
 * 
 * Strategy:
 * 1. Intercept GraphQL TweetDetail responses for video_info.variants
 * 2. Fall back to scanning page HTML for video.twimg.com URLs
 * 3. Fall back to checking <video> DOM elements
 * 
 * @param {string} tweetUrl — Full tweet URL (x.com or twitter.com)
 * @returns {Promise<Object>} — { videos, thumbnail, duration, author, text }
 */
export async function extractVideo(tweetUrl) {
  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed) {
    throw new Error('Invalid tweet URL. Expected: https://x.com/user/status/123');
  }

  const { username, tweetId } = parsed;
  // Normalize to x.com
  const normalizedUrl = `https://x.com/${username}/status/${tweetId}`;

  let browserEntry = null;
  let page = null;

  try {
    browserEntry = await getBrowser();
    page = await browserEntry.browser.newPage();

    // Randomize viewport slightly
    await page.setViewport({
      width: 1280 + Math.floor(Math.random() * 100),
      height: 800 + Math.floor(Math.random() * 100),
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );

    // Collect video data from intercepted responses
    const interceptedVideos = [];
    let tweetText = '';
    let authorName = username;
    let thumbnailUrl = '';
    let durationMs = 0;

    // Intercept GraphQL TweetDetail responses
    page.on('response', async (response) => {
      try {
        const url = response.url();
        if (!url.includes('TweetDetail') && !url.includes('TweetResultByRestId')) return;
        if (response.status() !== 200) return;

        const json = await response.json();
        const jsonStr = JSON.stringify(json);

        // Extract video_info from the response
        extractVideoInfoFromJson(json, interceptedVideos);

        // Extract tweet text
        if (!tweetText) {
          const textMatch = jsonStr.match(/"full_text":"((?:[^"\\]|\\.)*)"/);
          if (textMatch) tweetText = textMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }

        // Extract author display name
        const nameMatch = jsonStr.match(/"name":"((?:[^"\\]|\\.)*)"/);
        if (nameMatch) authorName = nameMatch[1];

        // Extract thumbnail
        if (!thumbnailUrl) {
          const thumbMatch = jsonStr.match(/"thumbnail_url":"((?:[^"\\]|\\.)*)"/);
          if (thumbMatch) thumbnailUrl = thumbMatch[1].replace(/\\/g, '');
          // Fallback: preview_image_url
          if (!thumbnailUrl) {
            const previewMatch = jsonStr.match(/"preview_image_url":"((?:[^"\\]|\\.)*)"/);
            if (previewMatch) thumbnailUrl = previewMatch[1].replace(/\\/g, '');
          }
          // Fallback: media_url_https for video poster
          if (!thumbnailUrl) {
            const mediaMatch = jsonStr.match(/"media_url_https":"((?:[^"\\]|\\.)*)"/);
            if (mediaMatch) thumbnailUrl = mediaMatch[1].replace(/\\/g, '');
          }
        }
      } catch {
        // Ignore parse errors on non-JSON responses
      }
    });

    // Also intercept direct video.twimg.com requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('video.twimg.com') && url.includes('.mp4')) {
        interceptedVideos.push({
          url,
          content_type: 'video/mp4',
          bitrate: 0, // Unknown from request interception
          source: 'network',
        });
      }
    });

    // Navigate to tweet page with timeout
    await page.goto(normalizedUrl, {
      waitUntil: 'networkidle2',
      timeout: EXTRACTION_TIMEOUT,
    });

    // Wait a moment for GraphQL responses to complete
    await new Promise((r) => setTimeout(r, 2000));

    // Attempt to click the play button if video hasn't auto-played
    try {
      await page.evaluate(() => {
        // Try clicking play button selectors
        const playBtn = document.querySelector('[data-testid="playButton"]') ||
          document.querySelector('[aria-label="Play"]') ||
          document.querySelector('div[role="button"][tabindex="0"] svg');
        if (playBtn) playBtn.click();
      });
      await new Promise((r) => setTimeout(r, 1500));
    } catch {}

    // Fallback: scan page HTML for video URLs
    const pageVideos = await page.evaluate(() => {
      const videos = [];
      const html = document.documentElement.innerHTML;

      // Scan for video.twimg.com URLs in page content
      const patterns = [
        /https:\/\/video\.twimg\.com\/[^"'\s\\]+\.mp4[^"'\s\\]*/g,
        /https:\/\/video\.twimg\.com\/[^"'\s\\]+\/vid\/[^"'\s\\]+/g,
      ];
      for (const pattern of patterns) {
        const matches = html.match(pattern) || [];
        for (const url of matches) {
          const cleaned = url.replace(/\\u002F/g, '/').replace(/\\/g, '');
          videos.push({ url: cleaned, source: 'html_scan' });
        }
      }

      // Check <video> elements
      document.querySelectorAll('video').forEach((el) => {
        if (el.src && !el.src.startsWith('blob:')) {
          videos.push({ url: el.src, source: 'dom_video' });
        }
        el.querySelectorAll('source').forEach((src) => {
          if (src.src && !src.src.startsWith('blob:')) {
            videos.push({ url: src.src, source: 'dom_source' });
          }
        });
      });

      // Check poster attribute for thumbnail
      const videoEl = document.querySelector('video');
      const poster = videoEl?.poster || '';

      return { videos, poster };
    });

    if (pageVideos.poster && !thumbnailUrl) {
      thumbnailUrl = pageVideos.poster;
    }

    // Merge all sources
    const allRaw = [...interceptedVideos, ...pageVideos.videos];

    // Deduplicate and enrich
    const seen = new Set();
    const videos = [];

    for (const v of allRaw) {
      const baseUrl = v.url?.split('?')[0];
      if (!baseUrl || seen.has(baseUrl)) continue;
      if (!baseUrl.includes('.mp4') && !baseUrl.includes('video.twimg.com')) continue;
      seen.add(baseUrl);

      // Parse quality from URL pattern: /vid/{width}x{height}/ or /vid/avc1/{width}x{height}/
      const resMatch = v.url.match(/\/(\d+)x(\d+)\//);
      const width = resMatch ? parseInt(resMatch[1]) : 0;
      const height = resMatch ? parseInt(resMatch[2]) : 0;
      const bitrate = v.bitrate || 0;

      // Determine quality label
      let quality = 'unknown';
      const maxDim = Math.max(width, height);
      if (maxDim >= 1920) quality = '1080p';
      else if (maxDim >= 1280) quality = '720p';
      else if (maxDim >= 640) quality = '480p';
      else if (maxDim >= 480) quality = '360p';
      else if (maxDim > 0) quality = `${maxDim}p`;

      videos.push({
        url: v.url,
        quality,
        width,
        height,
        bitrate,
        contentType: v.content_type || 'video/mp4',
      });
    }

    // Sort by resolution/bitrate (highest first)
    videos.sort((a, b) => {
      const aScore = (a.width * a.height) || a.bitrate;
      const bScore = (b.width * b.height) || b.bitrate;
      return bScore - aScore;
    });

    if (videos.length === 0) {
      throw new Error('No video found in this tweet. Make sure the tweet contains a video (not a GIF or image).');
    }

    return {
      videos,
      thumbnail: thumbnailUrl || null,
      duration: durationMs || null,
      author: authorName,
      username,
      tweetId,
      text: tweetText || null,
    };
  } finally {
    if (page) {
      try { await page.close(); } catch {}
    }
    releaseBrowser(browserEntry);
  }
}

// ============================================================================
// JSON Deep Extraction Helpers
// ============================================================================

/**
 * Recursively extract video_info.variants from a nested JSON object
 * (Twitter GraphQL responses have deeply nested structures)
 */
function extractVideoInfoFromJson(obj, results) {
  if (!obj || typeof obj !== 'object') return;

  // Found video_info directly
  if (obj.video_info && Array.isArray(obj.video_info.variants)) {
    for (const variant of obj.video_info.variants) {
      if (variant.content_type === 'video/mp4' && variant.url) {
        results.push({
          url: variant.url,
          bitrate: variant.bitrate || 0,
          content_type: variant.content_type,
          source: 'graphql',
        });
      }
    }
    // Also grab duration
    if (obj.video_info.duration_millis) {
      // Store on the first result for reference
      results._durationMs = obj.video_info.duration_millis;
    }
    return;
  }

  // Recurse into object properties
  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractVideoInfoFromJson(item, results);
    }
  } else {
    for (const key of Object.keys(obj)) {
      extractVideoInfoFromJson(obj[key], results);
    }
  }
}

// ============================================================================
// Fallback: Twitter Embed Endpoint
// ============================================================================

/**
 * Try to get video info from Twitter's public oembed/publish endpoint.
 * This is a lightweight fallback that doesn't require Puppeteer.
 * 
 * @param {string} tweetUrl
 * @returns {Promise<Object|null>}
 */
export async function extractViaEmbed(tweetUrl) {
  try {
    const embedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`;
    const response = await fetch(embedUrl);
    if (!response.ok) return null;

    const data = await response.json();
    // The oembed response contains HTML but not direct video URLs
    // It's useful for metadata (author, thumbnail) but not video extraction
    return {
      authorName: data.author_name || null,
      authorUrl: data.author_url || null,
      html: data.html || null,
      thumbnailUrl: data.thumbnail_url || null,
    };
  } catch {
    return null;
  }
}

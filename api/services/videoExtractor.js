// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * Video Extractor Service
 *
 * Extracts video URLs from X/Twitter tweets. The network-only lanes live in
 * src/video/edgeExtractor.js so the Express API and the Cloudflare Pages
 * Functions behind xactions.app/video run the exact same extraction code:
 *
 *   1. Twitter syndication endpoint  (no auth)          -> shared
 *   2. fxtwitter API                 (no auth)          -> shared
 *   3. Guest token + GraphQL         (TWITTER_BEARER_TOKEN) -> shared
 *   4. Puppeteer browser automation  (last resort)      -> here, server only
 *
 * @module api/services/videoExtractor
 * @author nichxbt
 */

import {
  extractTweetVideo,
  getQualityLabel,
  parseTweetUrl,
  VideoExtractionError,
} from '../../src/video/edgeExtractor.js';

export { parseTweetUrl, VideoExtractionError };

// ============================================================================
// Constants
// ============================================================================

// Twitter's public bearer token, loaded from env so it is never in source
// control. Set it to unlock the GraphQL lane; the two lanes above it need no
// credentials at all.
const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || '';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://x.com/',
  'Origin': 'https://x.com',
};

const EXTRACTION_TIMEOUT = 15000;

// ============================================================================
// Strategy 3: Puppeteer (last resort)
// ============================================================================

let puppeteerLoaded = false;
let puppeteer = null;

/**
 * Lazily load Puppeteer + stealth plugin (only when needed).
 * This avoids the cost of importing Puppeteer if lightweight strategies work.
 */
async function loadPuppeteer() {
  if (puppeteerLoaded) return;
  try {
    const puppeteerModule = await import('puppeteer-extra');
    const stealthModule = await import('puppeteer-extra-plugin-stealth');
    puppeteer = puppeteerModule.default;
    puppeteer.use(stealthModule.default());
    puppeteerLoaded = true;
  } catch (err) {
    throw new Error(`Puppeteer not available: ${err.message}`, { cause: err });
  }
}

const POOL_SIZE = 2;
const browsers = [];

async function createBrowser() {
  await loadPuppeteer();
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
  for (const entry of browsers) {
    if (!entry.busy) {
      if (entry.browser.connected) {
        entry.busy = true;
        return entry;
      }
      const idx = browsers.indexOf(entry);
      try { await entry.browser.close(); } catch { /* disconnected: being replaced */ }
      const browser = await createBrowser();
      browsers[idx] = { browser, busy: true };
      return browsers[idx];
    }
  }

  if (browsers.length < POOL_SIZE) {
    const browser = await createBrowser();
    const entry = { browser, busy: true };
    browsers.push(entry);
    return entry;
  }

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
    try { await entry.browser.close(); } catch { /* shutting down: already closed is fine */ }
  }
  browsers.length = 0;
}

/**
 * Extract video using Puppeteer browser automation.
 * This is the heaviest strategy but works as a last resort.
 */
async function extractViaPuppeteer(tweetId, username) {
  const normalizedUrl = `https://x.com/${username}/status/${tweetId}`;
  let browserEntry = null;
  let page = null;

  try {
    browserEntry = await getBrowser();
    page = await browserEntry.browser.newPage();

    await page.setViewport({
      width: 1280 + Math.floor(Math.random() * 100),
      height: 800 + Math.floor(Math.random() * 100),
    });

    await page.setUserAgent(DEFAULT_HEADERS['User-Agent']);

    const interceptedVideos = [];
    let tweetText = '';
    let authorName = username;
    let thumbnailUrl = '';
    let durationMs = 0;

    // Intercept GraphQL responses
    page.on('response', async (response) => {
      try {
        const url = response.url();
        if (!url.includes('TweetDetail') && !url.includes('TweetResultByRestId')) return;
        if (response.status() !== 200) return;

        const json = await response.json();
        const jsonStr = JSON.stringify(json);

        extractVideoInfoFromJson(json, interceptedVideos);

        if (!tweetText) {
          const textMatch = jsonStr.match(/"full_text":"((?:[^"\\]|\\.)*)"/);
          if (textMatch) tweetText = textMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }

        const nameMatch = jsonStr.match(/"name":"((?:[^"\\]|\\.)*)"/);
        if (nameMatch) authorName = nameMatch[1];

        if (!thumbnailUrl) {
          const thumbMatch = jsonStr.match(/"thumbnail_url":"((?:[^"\\]|\\.)*)"/);
          if (thumbMatch) thumbnailUrl = thumbMatch[1].replace(/\\/g, '');
          if (!thumbnailUrl) {
            const previewMatch = jsonStr.match(/"preview_image_url":"((?:[^"\\]|\\.)*)"/);
            if (previewMatch) thumbnailUrl = previewMatch[1].replace(/\\/g, '');
          }
          if (!thumbnailUrl) {
            const mediaMatch = jsonStr.match(/"media_url_https":"((?:[^"\\]|\\.)*)"/);
            if (mediaMatch) thumbnailUrl = mediaMatch[1].replace(/\\/g, '');
          }
        }
      } catch {
        // Ignore parse errors
      }
    });

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('video.twimg.com') && url.includes('.mp4')) {
        interceptedVideos.push({
          url,
          content_type: 'video/mp4',
          bitrate: 0,
          source: 'network',
        });
      }
    });

    await page.goto(normalizedUrl, {
      waitUntil: 'networkidle2',
      timeout: EXTRACTION_TIMEOUT,
    });

    await new Promise((r) => setTimeout(r, 2000));

    // Try clicking play button
    try {
      await page.evaluate(() => {
        const playBtn = document.querySelector('[data-testid="playButton"]') ||
          document.querySelector('[aria-label="Play"]') ||
          document.querySelector('div[role="button"][tabindex="0"] svg');
        if (playBtn) playBtn.click();
      });
      await new Promise((r) => setTimeout(r, 1500));
    } catch {
      // Optional nudge so the player requests its stream. Without it the scan
      // below can still find the URL, and throws if it finds nothing.
    }

    // Scan page HTML for video URLs
    const pageVideos = await page.evaluate(() => {
      const videos = [];
      const html = document.documentElement.innerHTML;

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

      const videoEl = document.querySelector('video');
      const poster = videoEl?.poster || '';

      return { videos, poster };
    });

    if (pageVideos.poster && !thumbnailUrl) {
      thumbnailUrl = pageVideos.poster;
    }

    const allRaw = [...interceptedVideos, ...pageVideos.videos];

    const seen = new Set();
    const videos = [];

    for (const v of allRaw) {
      const baseUrl = v.url?.split('?')[0];
      if (!baseUrl || seen.has(baseUrl)) continue;
      if (!baseUrl.includes('.mp4') && !baseUrl.includes('video.twimg.com')) continue;
      seen.add(baseUrl);

      const resMatch = v.url.match(/\/(\d+)x(\d+)\//);
      const width = resMatch ? parseInt(resMatch[1]) : 0;
      const height = resMatch ? parseInt(resMatch[2]) : 0;

      videos.push({
        url: v.url,
        quality: getQualityLabel(width, height),
        width,
        height,
        bitrate: v.bitrate || 0,
        contentType: v.content_type || 'video/mp4',
      });
    }

    videos.sort((a, b) => {
      const aScore = (a.width * a.height) || a.bitrate;
      const bScore = (b.width * b.height) || b.bitrate;
      return bScore - aScore;
    });

    if (videos.length === 0) {
      throw new Error('No video found via Puppeteer');
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
      try { await page.close(); } catch { /* cleanup in finally: must not mask the result */ }
    }
    releaseBrowser(browserEntry);
  }
}

// ============================================================================
// JSON Deep Extraction Helpers
// ============================================================================

/**
 * Recursively extract video_info.variants from a nested JSON object
 */
function extractVideoInfoFromJson(obj, results) {
  if (!obj || typeof obj !== 'object') return;

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
    if (obj.video_info.duration_millis) {
      results._durationMs = obj.video_info.duration_millis;
    }
    return;
  }

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
// Main Extraction (multi-strategy with fallback chain)
// ============================================================================

/**
 * Extract every downloadable video variant from a tweet.
 *
 * Runs the shared network lanes first, then falls back to Puppeteer, which is
 * the only lane that can read a tweet the public endpoints refuse to serve.
 *
 * @param {string} tweetUrl Full tweet URL (x.com or twitter.com)
 * @returns {Promise<Object>} { videos, thumbnail, duration, author, username, tweetId, text, source }
 */
export async function extractVideo(tweetUrl) {
  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed) {
    throw new VideoExtractionError('Invalid tweet URL. Expected: https://x.com/user/status/123', 400);
  }

  let sharedError;
  try {
    console.log('🎬 Trying the shared network lanes...');
    const result = await extractTweetVideo(tweetUrl, { bearerToken: BEARER_TOKEN });
    console.log(`✅ ${result.source} extraction succeeded: ${result.videos.length} variant(s)`);
    return result;
  } catch (err) {
    console.warn('⚠️ Network lanes failed:', err.message);
    sharedError = err;
  }

  try {
    console.log('🎬 Trying Puppeteer extraction...');
    const result = await extractViaPuppeteer(parsed.tweetId, parsed.username);
    console.log(`✅ Puppeteer extraction succeeded: ${result.videos.length} variant(s)`);
    return result;
  } catch (err) {
    console.warn('⚠️ Puppeteer extraction failed:', err.message);
    const details = [...(sharedError.details || []), `puppeteer: ${err.message}`];
    throw new VideoExtractionError(sharedError.message, sharedError.status || 502, details);
  }
}

// ============================================================================
// Fallback: Twitter Embed Endpoint (metadata only)
// ============================================================================

/**
 * Try to get metadata from Twitter's public oembed/publish endpoint.
 * Useful for author info / thumbnails, not video URLs.
 * 
 * @param {string} tweetUrl
 * @returns {Promise<Object|null>}
 */
export async function extractViaEmbed(tweetUrl) {
  try {
    const embedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(tweetUrl)}&omit_script=true`;
    const response = await fetch(embedUrl, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return null;

    const data = await response.json();
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

/**
 * Video Extractor Service
 * 
 * Extracts video URLs from X/Twitter tweets using multiple strategies:
 * 1. Guest Token + GraphQL API (lightweight, no browser needed)
 * 2. FixTweet / fxtwitter API (reliable third-party fallback)
 * 3. Puppeteer browser automation (last resort)
 * 
 * @module api/services/videoExtractor
 * @author nichxbt
 */

// ============================================================================
// Constants
// ============================================================================

// Twitter's public bearer token (used by the web app, not user-specific)
const BEARER_TOKEN = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

const GRAPHQL_TWEET_DETAIL = 'https://api.x.com/graphql/nBS-WpgA6ZG0CyNHD517JQ/TweetResultByRestId';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://x.com/',
  'Origin': 'https://x.com',
};

const EXTRACTION_TIMEOUT = 15000;

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
// Strategy 1: Guest Token + GraphQL API
// ============================================================================

let cachedGuestToken = null;
let guestTokenExpiry = 0;

/**
 * Obtain a guest token from Twitter's activation endpoint.
 * Tokens are cached for 2 hours (they typically last ~3h).
 */
async function getGuestToken() {
  if (cachedGuestToken && Date.now() < guestTokenExpiry) {
    return cachedGuestToken;
  }

  const response = await fetch('https://api.x.com/1.1/guest/activate.json', {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'Authorization': `Bearer ${BEARER_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Guest token request failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.guest_token) {
    throw new Error('No guest_token in activation response');
  }

  cachedGuestToken = data.guest_token;
  guestTokenExpiry = Date.now() + 2 * 60 * 60 * 1000; // 2 hours
  return cachedGuestToken;
}

/**
 * Extract video via Twitter's GraphQL API using a guest token.
 * This is the fastest and most reliable method.
 */
async function extractViaGraphQL(tweetId, username) {
  const guestToken = await getGuestToken();

  const variables = JSON.stringify({
    tweetId,
    withCommunity: false,
    includePromotedContent: false,
    withVoice: false,
  });
  const features = JSON.stringify({
    creator_subscriptions_tweet_preview_api_enabled: true,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    rweb_video_timestamps_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_enhance_cards_enabled: false,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_media_download_video_enabled: true,
  });
  const fieldToggles = JSON.stringify({ withArticleRichContentState: true, withArticlePlainText: false, withGrokAnalyze: false, withDisallowedReplyControls: false });

  const url = `${GRAPHQL_TWEET_DETAIL}?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(features)}&fieldToggles=${encodeURIComponent(fieldToggles)}`;

  const response = await fetch(url, {
    headers: {
      ...DEFAULT_HEADERS,
      'Authorization': `Bearer ${BEARER_TOKEN}`,
      'x-guest-token': guestToken,
      'x-twitter-active-user': 'yes',
      'x-twitter-client-language': 'en',
    },
  });

  if (response.status === 403 || response.status === 401) {
    // Guest token expired or invalidated — clear cache and rethrow
    cachedGuestToken = null;
    guestTokenExpiry = 0;
    throw new Error(`GraphQL auth failed: HTTP ${response.status}`);
  }

  if (!response.ok) {
    throw new Error(`GraphQL request failed: HTTP ${response.status}`);
  }

  const json = await response.json();

  // Navigate the deeply nested GraphQL response
  const result = json?.data?.tweetResult?.result;
  if (!result) {
    throw new Error('Tweet not found in GraphQL response');
  }

  // Handle tombstone / unavailable tweets
  const typename = result.__typename;
  if (typename === 'TweetTombstone') {
    throw new Error('Tweet is unavailable (deleted or private)');
  }

  // The tweet data may be wrapped in a "tweet" property for some visibility types
  const tweetData = result.tweet || result;
  const legacy = tweetData.legacy || {};
  const core = tweetData.core?.user_results?.result?.legacy || {};

  // Extract text
  const tweetText = legacy.full_text || '';
  const authorName = core.name || username;

  // Extract media (videos)
  const media = legacy.extended_entities?.media || legacy.entities?.media || [];
  const videos = [];
  let thumbnailUrl = null;
  let durationMs = null;

  for (const item of media) {
    if (item.type !== 'video' && item.type !== 'animated_gif') continue;

    // Thumbnail
    if (!thumbnailUrl && item.media_url_https) {
      thumbnailUrl = item.media_url_https;
    }

    const videoInfo = item.video_info;
    if (!videoInfo?.variants) continue;

    // Duration
    if (videoInfo.duration_millis && !durationMs) {
      durationMs = videoInfo.duration_millis;
    }

    for (const variant of videoInfo.variants) {
      if (variant.content_type !== 'video/mp4') continue;
      if (!variant.url) continue;

      const resMatch = variant.url.match(/\/(\d+)x(\d+)\//);
      const width = resMatch ? parseInt(resMatch[1]) : 0;
      const height = resMatch ? parseInt(resMatch[2]) : 0;

      videos.push({
        url: variant.url,
        quality: getQualityLabel(width, height),
        width,
        height,
        bitrate: variant.bitrate || 0,
        contentType: 'video/mp4',
      });
    }
  }

  if (videos.length === 0) {
    throw new Error('No video found in GraphQL response');
  }

  // Sort highest quality first
  videos.sort((a, b) => {
    const aScore = (a.width * a.height) || a.bitrate;
    const bScore = (b.width * b.height) || b.bitrate;
    return bScore - aScore;
  });

  return {
    videos,
    thumbnail: thumbnailUrl || null,
    duration: durationMs || null,
    author: authorName,
    username,
    tweetId,
    text: tweetText || null,
  };
}

// ============================================================================
// Strategy 2: FixTweet / fxtwitter API
// ============================================================================

/**
 * Extract video via the fxtwitter API (open-source Twitter embed fixer).
 * Reliable fallback when guest token / GraphQL strategy fails.
 */
async function extractViaFxTwitter(tweetId, username) {
  // fxtwitter provides a JSON API at api.fxtwitter.com
  const url = `https://api.fxtwitter.com/${username}/status/${tweetId}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'XActions/1.0 (+https://github.com/nirholas/XActions)',
      'Accept': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`fxtwitter API failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  const tweet = data?.tweet;
  if (!tweet) {
    throw new Error('No tweet data in fxtwitter response');
  }

  // fxtwitter puts media in tweet.media.videos or tweet.media.all
  const mediaItems = tweet.media?.videos || tweet.media?.all?.filter(m => m.type === 'video') || [];
  const videos = [];
  let thumbnailUrl = tweet.media?.videos?.[0]?.thumbnail_url || null;
  let durationMs = null;

  for (const item of mediaItems) {
    if (!thumbnailUrl && item.thumbnail_url) {
      thumbnailUrl = item.thumbnail_url;
    }
    if (item.duration && !durationMs) {
      durationMs = Math.round(item.duration * 1000);
    }

    // fxtwitter may provide a single URL or multiple variants
    if (item.url) {
      const resMatch = item.url.match(/\/(\d+)x(\d+)\//);
      const width = item.width || (resMatch ? parseInt(resMatch[1]) : 0);
      const height = item.height || (resMatch ? parseInt(resMatch[2]) : 0);

      videos.push({
        url: item.url,
        quality: getQualityLabel(width, height),
        width,
        height,
        bitrate: item.bitrate || 0,
        contentType: 'video/mp4',
      });
    }

    // Check for format variants
    if (Array.isArray(item.variants)) {
      for (const variant of item.variants) {
        if (variant.content_type !== 'video/mp4' && variant.type !== 'video/mp4') continue;
        if (!variant.url) continue;

        const resMatch = variant.url.match(/\/(\d+)x(\d+)\//);
        const width = resMatch ? parseInt(resMatch[1]) : 0;
        const height = resMatch ? parseInt(resMatch[2]) : 0;

        videos.push({
          url: variant.url,
          quality: getQualityLabel(width, height),
          width,
          height,
          bitrate: variant.bitrate || 0,
          contentType: 'video/mp4',
        });
      }
    }
  }

  if (videos.length === 0) {
    throw new Error('No video found in fxtwitter response');
  }

  // Deduplicate by base URL
  const seen = new Set();
  const unique = [];
  for (const v of videos) {
    const base = v.url.split('?')[0];
    if (!seen.has(base)) {
      seen.add(base);
      unique.push(v);
    }
  }

  // Sort highest quality first
  unique.sort((a, b) => {
    const aScore = (a.width * a.height) || a.bitrate;
    const bScore = (b.width * b.height) || b.bitrate;
    return bScore - aScore;
  });

  return {
    videos: unique,
    thumbnail: thumbnailUrl || null,
    duration: durationMs || null,
    author: tweet.author?.name || username,
    username,
    tweetId,
    text: tweet.text || null,
  };
}

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
    throw new Error(`Puppeteer not available: ${err.message}`);
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
      try { await entry.browser.close(); } catch {}
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
    try { await entry.browser.close(); } catch {}
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
    } catch {}

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
// Quality Label Helper
// ============================================================================

function getQualityLabel(width, height) {
  const maxDim = Math.max(width, height);
  if (maxDim >= 1920) return '1080p';
  if (maxDim >= 1280) return '720p';
  if (maxDim >= 640) return '480p';
  if (maxDim >= 480) return '360p';
  if (maxDim > 0) return `${maxDim}p`;
  return 'unknown';
}

// ============================================================================
// Main Extraction (multi-strategy with fallback chain)
// ============================================================================

/**
 * Extract video info from a tweet URL.
 * 
 * Tries strategies in order:
 * 1. Guest Token + GraphQL API (fast, no browser)
 * 2. fxtwitter API (reliable third-party)
 * 3. Puppeteer browser automation (heavy, last resort)
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
  const errors = [];

  // Strategy 1: Guest Token + GraphQL
  try {
    console.log('🎬 Trying GraphQL API extraction...');
    const result = await extractViaGraphQL(tweetId, username);
    console.log(`✅ GraphQL extraction succeeded: ${result.videos.length} variant(s)`);
    return result;
  } catch (err) {
    console.warn('⚠️ GraphQL extraction failed:', err.message);
    errors.push(`GraphQL: ${err.message}`);
  }

  // Strategy 2: fxtwitter API
  try {
    console.log('🎬 Trying fxtwitter API extraction...');
    const result = await extractViaFxTwitter(tweetId, username);
    console.log(`✅ fxtwitter extraction succeeded: ${result.videos.length} variant(s)`);
    return result;
  } catch (err) {
    console.warn('⚠️ fxtwitter extraction failed:', err.message);
    errors.push(`fxtwitter: ${err.message}`);
  }

  // Strategy 3: Puppeteer (last resort)
  try {
    console.log('🎬 Trying Puppeteer extraction...');
    const result = await extractViaPuppeteer(tweetId, username);
    console.log(`✅ Puppeteer extraction succeeded: ${result.videos.length} variant(s)`);
    return result;
  } catch (err) {
    console.warn('⚠️ Puppeteer extraction failed:', err.message);
    errors.push(`Puppeteer: ${err.message}`);
  }

  // All strategies failed
  throw new Error(
    `No video found in this tweet. Make sure the tweet contains a video (not a GIF or image). ` +
    `Details: ${errors.join(' | ')}`
  );
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
    const response = await fetch(embedUrl);
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

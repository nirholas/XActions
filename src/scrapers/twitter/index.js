// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * XActions Twitter Scrapers
 * Puppeteer-based scrapers for X/Twitter
 * 
 * Moved from src/scrapers/index.js to support multi-platform architecture.
 * All original exports are preserved for backward compatibility.
 * 
 * Supports multiple frameworks via the adapter option:
 *   createBrowser({ adapter: 'playwright' })  // Use Playwright
 *   createBrowser({ adapter: 'puppeteer' })   // Use Puppeteer (default)
 *   createBrowser()                            // Legacy Puppeteer (no adapter wrapping)
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

/** Human-like delay using log-normal distribution with occasional distraction spikes. */
const randomDelay = (min = 2000, max = 7000) => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  const median = min + (max - min) * 0.4;
  const spread = (max - min) * 0.25;
  const base = median + z * spread;
  const distraction = Math.random() < 0.08 ? 8000 + Math.random() * 12000 : 0;
  const delay = Math.max(min, Math.min(base, max)) + distraction;
  return sleep(delay);
};

/** Throw if the page redirected to login (expired/invalid cookie). */
function checkAuth(page) {
  const url = page.url();
  if (url.includes('/login') || url.includes('/i/flow/login')) {
    throw new Error('Authentication failed — cookie may be expired.\n\nRun: xactions login');
  }
}

/**
 * Create a browser instance with stealth settings.
 * 
 * Supports adapter mode:
 *   const browser = await createBrowser({ adapter: 'playwright' });
 *   const browser = await createBrowser({ adapter: 'puppeteer' });
 *   const browser = await createBrowser(); // Legacy Puppeteer
 * 
 * @param {Object} [options]
 * @param {string} [options.adapter] - Framework adapter: 'puppeteer', 'playwright', 'cheerio'
 * @param {boolean} [options.headless] - Run headless (default: true)
 * @returns {Promise<Object>} Browser instance
 */
export async function createBrowser(options = {}) {
  if (options.adapter) {
    const { getAdapter } = await import('../adapters/index.js');
    const adapter = await getAdapter(options.adapter);
    const { adapter: _, ...adapterOptions } = options;
    return adapter.launch(adapterOptions);
  }

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
 * Create a page with realistic settings.
 * Works with both native Puppeteer browsers and adapter browsers.
 * 
 * @param {Object} browser - Browser instance (native or adapter)
 * @param {Object} [options]
 * @returns {Promise<Object>} Page instance
 */
export async function createPage(browser, options = {}) {
  if (browser._adapter) {
    const { getAdapter } = await import('../adapters/index.js');
    const adapter = await getAdapter(browser._adapter);
    return adapter.newPage(browser, options);
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1280 + Math.floor(Math.random() * 100), height: 800 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  return page;
}

/**
 * Login with session cookie.
 * Works with both native Puppeteer pages and adapter pages.
 */
export async function loginWithCookie(page, authToken) {
  if (page._adapter) {
    const { getAdapter } = await import('../adapters/index.js');
    const adapter = await getAdapter(page._adapter);
    await adapter.setCookie(page, {
      name: 'auth_token',
      value: authToken,
      domain: '.x.com',
      path: '/',
      httpOnly: true,
      secure: true,
    });
    await adapter.goto(page, 'https://x.com/home', { waitUntil: 'networkidle' });
    return page;
  }

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
 */
export async function scrapeProfile(page, username) {
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const profile = await page.evaluate(() => {
    const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || null;
    const getAttr = (sel, attr) => document.querySelector(sel)?.getAttribute(attr) || null;

    const headerStyle = document.querySelector('[data-testid="UserProfileHeader_Items"]')
      ?.closest('div')?.previousElementSibling?.querySelector('img')?.src;

    const avatar = document.querySelector('[data-testid="UserAvatar-Container-unknown"] img, [data-testid*="UserAvatar"] img')?.src;

    const nameSection = document.querySelector('[data-testid="UserName"]');
    const fullText = nameSection?.textContent || '';
    const usernameMatch = fullText.match(/@(\w+)/);

    const followingLink = document.querySelector('a[href$="/following"]');
    const followersLink = document.querySelector('a[href$="/verified_followers"], a[href$="/followers"]');

    return {
      name: fullText.split('@')[0]?.trim() || null,
      username: usernameMatch?.[1] || null,
      bio: getText('[data-testid="UserDescription"]'),
      location: getText('[data-testid="UserLocation"]'),
      website: getAttr('[data-testid="UserUrl"]', 'href') || getAttr('[data-testid="UserUrl"] a', 'href'),
      joined: getText('[data-testid="UserJoinDate"]'),
      birthday: getText('[data-testid="UserBirthday"]'),
      following: followingLink?.querySelector('span')?.textContent || null,
      followers: followersLink?.querySelector('span')?.textContent || null,
      avatar: avatar || null,
      header: headerStyle || null,
      verified: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"]'),
      protected: !!document.querySelector('[data-testid="UserName"] svg[aria-label*="Protected"]'),
      platform: 'twitter',
    };
  });

  return profile;
}

// ============================================================================
// Followers Scraper
// ============================================================================

/**
 * Scrape followers for a user
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
          platform: 'twitter',
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
          platform: 'twitter',
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
        
        const images = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"] img')).map(i => i.src);
        const video = article.querySelector('[data-testid="videoPlayer"]') ? true : false;
        
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
          platform: 'twitter',
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
          platform: 'twitter',
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
// TweetDetail GraphQL helpers (shared by scrapeThread and scrapePost)
// ============================================================================

/**
 * Fetch TweetDetail GraphQL API from the page context using session cookies.
 * The page must already be on x.com (for cookies to be available).
 * Includes a human-like delay before each call.
 */
async function fetchTweetDetail(page, tweetId) {
  await randomDelay(2000, 5000);
  return page.evaluate(async (id) => {
    const ct0 = document.cookie.match(/ct0=([^;]+)/)?.[1];
    if (!ct0) return null;
    const variables = JSON.stringify({
      focalTweetId: id, with_rux_injections: false, rankingMode: 'Relevance',
      includePromotedContent: false, withCommunity: true,
      withQuickPromoteEligibilityTweetFields: true, withBirdwatchNotes: true, withVoice: true,
    });
    const features = JSON.stringify({
      rweb_video_screen_enabled: false, responsive_web_graphql_timeline_navigation_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      creator_subscriptions_tweet_preview_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      freedom_of_speech_not_reach_fetch_enabled: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
      longform_notetweets_rich_text_read_enabled: true,
    });
    const url = `https://x.com/i/api/graphql/t66713qxyDI9pc4Jyb6wxQ/TweetDetail?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(features)}`;
    try {
      const resp = await fetch(url, {
        headers: {
          'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
          'x-csrf-token': ct0, 'x-twitter-active-user': 'yes', 'x-twitter-auth-type': 'OAuth2Session',
        },
        credentials: 'include',
      });
      return await resp.json();
    } catch { return null; }
  }, tweetId);
}

/** Extract timeline entries from a TweetDetail GraphQL response. */
function extractEntries(graphqlData) {
  const instructions = graphqlData?.data?.threaded_conversation_with_injections_v2?.instructions || [];
  const entries = [];
  for (const inst of instructions) {
    if (inst.entries) entries.push(...inst.entries);
  }
  return entries;
}

/** Unwrap TweetWithVisibilityResults wrapper. */
function unwrapResult(result) {
  if (result?.__typename === 'TweetWithVisibilityResults') return result.tweet;
  return result;
}

/** Get screen_name from a user result (handles both new core and legacy paths). */
function getScreenName(result) {
  const user = result?.core?.user_results?.result;
  return user?.core?.screen_name || user?.legacy?.screen_name || '';
}

/**
 * Parse rich data from a single tweet GraphQL result.
 * Does NOT recurse into quoted tweets — returns quotedTweetId for the caller to handle.
 */
function parseTweetResult(result) {
  result = unwrapResult(result);
  if (!result?.legacy) return null;

  const legacy = result.legacy;
  const author = getScreenName(result);
  const text = result.note_tweet?.note_tweet_results?.result?.text || legacy.full_text || '';

  // Media: images and videos
  const media = (legacy.extended_entities?.media || []).map(m => {
    const item = { type: m.type, url: m.media_url_https };
    if (m.type === 'video' || m.type === 'animated_gif') {
      const best = m.video_info?.variants
        ?.filter(v => v.content_type === 'video/mp4')
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (best) item.videoUrl = best.url;
    }
    return item;
  });

  // Article (X Articles — long-form posts)
  let article = null;
  if (result.article?.article_results?.result) {
    const a = result.article.article_results.result;
    article = {
      id: a.rest_id || null,
      title: a.title || null,
      coverImage: a.cover_media?.media_info?.original_img_url || null,
      url: `https://x.com/${author}/article/${result.rest_id}`,
    };
  }

  // Card (link previews — external URLs)
  let card = null;
  if (result.card?.legacy?.binding_values) {
    const vals = {};
    for (const v of result.card.legacy.binding_values) {
      vals[v.key] = v.value?.string_value || v.value?.scribe_value?.value || v.value?.image_value?.url || '';
    }
    if (vals.title || vals.card_url) {
      card = { title: vals.title || '', description: vals.description || '', url: vals.card_url || '', image: vals.thumbnail_image_original || '' };
    }
  }

  // URLs: external links in tweet text (from both legacy and note_tweet entities)
  const rawUrls = [
    ...(legacy.entities?.urls || []),
    ...(result.note_tweet?.note_tweet_results?.result?.entity_set?.urls || []),
  ];
  const urls = rawUrls
    .map(u => ({ url: u.expanded_url || u.url || '', display: u.display_url || '' }))
    .filter(u => u.url && !u.url.includes('x.com/') && !u.url.includes('twitter.com/'));

  // Quoted tweet ID (for recursive fetching — not parsed from this response)
  const quotedTweetId = result.quoted_status_result?.result?.rest_id || legacy.quoted_status_id_str || null;

  return {
    id: result.rest_id,
    author,
    text,
    timestamp: legacy.created_at ? new Date(legacy.created_at).toISOString() : null,
    url: `https://x.com/${author}/status/${result.rest_id}`,
    media,
    article,
    card,
    urls: urls.length > 0 ? urls : undefined,
    quotedTweetId,
    inReplyTo: legacy.in_reply_to_status_id_str || null,
    replies: legacy.reply_count || 0,
    retweets: legacy.retweet_count || 0,
    likes: legacy.favorite_count || 0,
    views: result.views?.count || '0',
    platform: 'twitter',
  };
}

/**
 * From a list of entries, collect all tweets by a given author and filter
 * to the self-reply thread chain (root tweet + author replying to themselves).
 */
function parseThreadFromEntries(entries, mainAuthor, mainTweetId) {
  const candidates = new Map();

  for (const entry of entries) {
    const result = unwrapResult(entry.content?.itemContent?.tweet_results?.result);
    if (result && getScreenName(result).toLowerCase() === mainAuthor.toLowerCase()) {
      const parsed = parseTweetResult(result);
      if (parsed) candidates.set(parsed.id, parsed);
    }
    for (const item of (entry.content?.items || [])) {
      const r = unwrapResult(item.item?.itemContent?.tweet_results?.result);
      if (r && getScreenName(r).toLowerCase() === mainAuthor.toLowerCase()) {
        const parsed = parseTweetResult(r);
        if (parsed) candidates.set(parsed.id, parsed);
      }
    }
  }

  const threadIds = new Set(candidates.keys());
  return Array.from(candidates.values())
    .filter(t => t.id === mainTweetId || (t.inReplyTo && threadIds.has(t.inReplyTo)))
    .sort((a, b) => {
      const ta = t => t.timestamp ? new Date(t.timestamp).getTime() : 0;
      return ta(a) - ta(b);
    });
}

// ============================================================================
// Thread Scraper
// ============================================================================

/**
 * Scrape a full tweet thread (author's self-reply chain).
 *
 * Uses the TweetDetail GraphQL API directly instead of DOM scraping —
 * X doesn't render self-reply threads as article elements in the DOM,
 * especially for high-engagement tweets.
 */
export async function scrapeThread(page, tweetUrl) {
  const mainTweetId = new URL(tweetUrl).pathname.match(/status\/(\d+)/)?.[1] || null;
  const mainAuthor = new URL(tweetUrl).pathname.split('/').filter(Boolean)[0] || null;
  if (!mainTweetId || !mainAuthor) return [];

  await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
  checkAuth(page);
  await randomDelay(2000, 3000);

  const graphqlData = await fetchTweetDetail(page, mainTweetId);
  if (!graphqlData) return [];

  const entries = extractEntries(graphqlData);
  const thread = parseThreadFromEntries(entries, mainAuthor, mainTweetId);

  // Strip internal fields for backward compatibility
  return thread.map(({ inReplyTo, quotedTweetId, media, article, card, urls, ...rest }) => rest);
}

// ============================================================================
// Post Scraper (rich data + recursive quoted tweets)
// ============================================================================

/**
 * Scrape a single post or thread with full rich data.
 *
 * Returns the thread (1 tweet if single post, N if thread) with rich data
 * per tweet: text, media, article, card, external URLs, engagement, and
 * recursively resolved quoted posts (which may themselves be threads).
 *
 * @param {import('puppeteer').Page} page
 * @param {string} tweetUrl
 * @param {number} [maxDepth=5] - Max recursion depth for nested quote tweets
 */
export async function scrapePost(page, tweetUrl, maxDepth = 5) {
  const mainTweetId = new URL(tweetUrl).pathname.match(/status\/(\d+)/)?.[1] || null;
  const mainAuthor = new URL(tweetUrl).pathname.split('/').filter(Boolean)[0] || null;
  if (!mainTweetId || !mainAuthor) throw new Error('Invalid tweet URL');

  // Ensure we're on x.com for cookie access
  if (!page.url().includes('x.com')) {
    await page.goto('https://x.com', { waitUntil: 'networkidle2', timeout: 30000 });
    checkAuth(page);
    await randomDelay(2000, 3000);
  }

  return _scrapePostRecursive(page, mainTweetId, mainAuthor, maxDepth, 0);
}

async function _scrapePostRecursive(page, tweetId, author, maxDepth, depth) {
  const graphqlData = await fetchTweetDetail(page, tweetId);
  if (!graphqlData) return { thread: [] };

  const entries = extractEntries(graphqlData);
  const thread = parseThreadFromEntries(entries, author, tweetId);
  if (thread.length === 0) return { thread: [] };

  // For each thread tweet, resolve its quoted post recursively
  for (const tweet of thread) {
    if (tweet.quotedTweetId && depth < maxDepth) {
      const qtData = await fetchTweetDetail(page, tweet.quotedTweetId);
      if (qtData) {
        const qtEntries = extractEntries(qtData);
        const focalEntry = qtEntries.find(e =>
          e.entryId?.includes(tweet.quotedTweetId));
        const focalResult = unwrapResult(
          focalEntry?.content?.itemContent?.tweet_results?.result);
        const qtAuthor = focalResult ? getScreenName(focalResult) : '';

        if (qtAuthor) {
          tweet.quotedPost = await _scrapePostRecursive(
            page, tweet.quotedTweetId, qtAuthor, maxDepth, depth + 1);
        }
      }
    }
    delete tweet.quotedTweetId;
    delete tweet.inReplyTo;
  }

  return { thread };
}

// ============================================================================
// Liked Tweets Scraper (a user's liked tweets page)
// ============================================================================

/**
 * Scrape a user's liked tweets via the Likes GraphQL API.
 *
 * Uses cursor-based pagination — no DOM scraping or scroll limits.
 * Writes results incrementally to a JSONL file so progress survives
 * crashes and memory stays bounded for large pulls.
 *
 * Returns { file, count, username, dateRange } — the caller reads the
 * file for the full data.
 *
 * @param {import('puppeteer').Page} page
 * @param {string} username
 * @param {object} options
 * @param {number} [options.limit=50] - Max tweets to return
 * @param {string} [options.from] - Only include likes from this date onward (stops when older)
 * @param {string} [options.to] - Only include likes up to this date (skips newer)
 */
export async function scrapeLikedTweets(page, username, options = {}) {
  const { limit = 50, from, to } = options;

  if (!username) throw new Error('Username is required for scrapeLikedTweets');

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (fromDate && isNaN(fromDate.getTime())) throw new Error(`Invalid "from" date: ${from}`);
  if (toDate && isNaN(toDate.getTime())) throw new Error(`Invalid "to" date: ${to}`);

  // Ensure we're on x.com for cookie access
  if (!page.url().includes('x.com')) {
    await page.goto('https://x.com', { waitUntil: 'networkidle2', timeout: 30000 });
    checkAuth(page);
    await randomDelay(2000, 3000);
  }

  // Resolve numeric userId from username
  const userId = await page.evaluate(async (screenName) => {
    const ct0 = document.cookie.match(/ct0=([^;]+)/)?.[1];
    if (!ct0) return null;
    const variables = JSON.stringify({ screen_name: screenName, withSafetyModeUserFields: true });
    const features = JSON.stringify({ hidden_profile_subscriptions_enabled: true, responsive_web_graphql_skip_user_profile_image_extensions_enabled: false, responsive_web_graphql_timeline_navigation_enabled: true });
    const url = `https://x.com/i/api/graphql/IGgvgiOx4QZndDHuD3x9TQ/UserByScreenName?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(features)}`;
    try {
      const resp = await fetch(url, {
        headers: { 'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA', 'x-csrf-token': ct0, 'x-twitter-active-user': 'yes', 'x-twitter-auth-type': 'OAuth2Session' },
        credentials: 'include',
      });
      const data = await resp.json();
      return data?.data?.user?.result?.rest_id || null;
    } catch { return null; }
  }, username);

  if (!userId) throw new Error(`Could not resolve userId for @${username}`);

  // Set up JSONL output file
  const exportDir = `${process.env.HOME || '/tmp'}/.xactions/exports`;
  await fs.mkdir(exportDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = `${exportDir}/likes-${username}-${ts}.jsonl`;

  let count = 0;
  let cursor = null;
  let firstTimestamp = null;
  let lastTimestamp = null;
  let emptyPages = 0;
  let passedFromDate = false;

  while (count < limit && emptyPages < 3 && !passedFromDate) {
    await randomDelay(2000, 5000);

    const pageData = await page.evaluate(async ({ userId, cursor, pageSize }) => {
      const ct0 = document.cookie.match(/ct0=([^;]+)/)?.[1];
      if (!ct0) return null;
      const variables = { userId, count: pageSize, includePromotedContent: false, withClientEventToken: false, withBirdwatchNotes: false, withVoice: true };
      if (cursor) variables.cursor = cursor;
      const features = {
        rweb_video_screen_enabled: false, responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
        responsive_web_twitter_article_tweet_consumption_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        freedom_of_speech_not_reach_fetch_enabled: true,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        longform_notetweets_rich_text_read_enabled: true,
      };
      const url = `https://x.com/i/api/graphql/KPuet6dGbC8LB2sOLx7tZQ/Likes?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;
      try {
        const resp = await fetch(url, {
          headers: { 'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA', 'x-csrf-token': ct0, 'x-twitter-active-user': 'yes', 'x-twitter-auth-type': 'OAuth2Session' },
          credentials: 'include',
        });
        return await resp.json();
      } catch { return null; }
    }, { userId, cursor, pageSize: Math.min(20, limit - count) });

    if (!pageData) { emptyPages++; continue; }

    // Extract entries from timeline (path: data.user.result.timeline.timeline.instructions)
    const instructions = pageData?.data?.user?.result?.timeline?.timeline?.instructions || [];
    const entries = [];
    for (const inst of instructions) {
      if (inst.entries) entries.push(...inst.entries);
    }

    // Find cursor for next page
    const cursorEntry = entries.find(e => e.entryId?.startsWith('cursor-bottom'));
    cursor = cursorEntry?.content?.value || null;

    // Parse tweets
    const batch = [];
    for (const entry of entries) {
      const result = entry.content?.itemContent?.tweet_results?.result;
      if (!result) continue;
      const parsed = parseTweetResult(result);
      if (!parsed) continue;

      const tweetDate = parsed.timestamp ? new Date(parsed.timestamp) : null;
      if (tweetDate) {
        if (fromDate && tweetDate < fromDate) { passedFromDate = true; break; }
        if (toDate && tweetDate > toDate) continue;
      }

      // Clean internal fields
      delete parsed.quotedTweetId;
      delete parsed.inReplyTo;

      if (!firstTimestamp && parsed.timestamp) firstTimestamp = parsed.timestamp;
      if (parsed.timestamp) lastTimestamp = parsed.timestamp;
      batch.push(parsed);
      count++;
      if (count >= limit) break;
    }

    if (batch.length > 0) {
      const lines = batch.map(t => JSON.stringify(t)).join('\n') + '\n';
      await fs.appendFile(filePath, lines);
      emptyPages = 0;
    } else {
      emptyPages++;
    }

    if (!cursor) break;
  }

  return { file: filePath, count, username, dateRange: { from: firstTimestamp, to: lastTimestamp } };
}

// ============================================================================
// Discover Likes (interleaved fetch + deep read with human-like pacing)
// ============================================================================

/**
 * Fetch liked tweets and deep-read each one, interleaved with human-like
 * timing. Produces two JSONL files:
 *   - likes index (summary per tweet from the Likes API)
 *   - deep reads (full scrapePost output per tweet)
 *
 * The pacing mimics a human browsing their likes: scroll through a page,
 * pause, tap into a post, read it, go back, scroll more.
 *
 * @param {import('puppeteer').Page} page
 * @param {string} username
 * @param {object} options
 * @param {number} [options.limit=50] - Max tweets
 * @param {string} [options.from] - Only likes from this date onward
 * @param {string} [options.to] - Only likes up to this date
 */
export async function discoverLikes(page, username, options = {}) {
  const { limit = 50, from, to } = options;

  if (!username) throw new Error('Username is required');

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;
  if (fromDate && isNaN(fromDate.getTime())) throw new Error(`Invalid "from" date: ${from}`);
  if (toDate && isNaN(toDate.getTime())) throw new Error(`Invalid "to" date: ${to}`);

  // Ensure we're on x.com
  if (!page.url().includes('x.com')) {
    await page.goto('https://x.com', { waitUntil: 'networkidle2', timeout: 30000 });
    checkAuth(page);
    await randomDelay(2000, 3000);
  }

  // Resolve userId
  const userId = await page.evaluate(async (screenName) => {
    const ct0 = document.cookie.match(/ct0=([^;]+)/)?.[1];
    if (!ct0) return null;
    const variables = JSON.stringify({ screen_name: screenName, withSafetyModeUserFields: true });
    const features = JSON.stringify({ hidden_profile_subscriptions_enabled: true, responsive_web_graphql_skip_user_profile_image_extensions_enabled: false, responsive_web_graphql_timeline_navigation_enabled: true });
    const url = `https://x.com/i/api/graphql/IGgvgiOx4QZndDHuD3x9TQ/UserByScreenName?variables=${encodeURIComponent(variables)}&features=${encodeURIComponent(features)}`;
    try {
      const resp = await fetch(url, {
        headers: { 'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA', 'x-csrf-token': ct0, 'x-twitter-active-user': 'yes', 'x-twitter-auth-type': 'OAuth2Session' },
        credentials: 'include',
      });
      const data = await resp.json();
      return data?.data?.user?.result?.rest_id || null;
    } catch { return null; }
  }, username);

  if (!userId) throw new Error(`Could not resolve userId for @${username}`);

  // Set up output files
  const exportDir = `${process.env.HOME || '/tmp'}/.xactions/exports`;
  await fs.mkdir(exportDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const likesFile = `${exportDir}/likes-${username}-${ts}.jsonl`;
  const deepFile = `${exportDir}/likes-${username}-${ts}-deep.jsonl`;

  let count = 0;
  let deepCount = 0;
  let cursor = null;
  let firstTimestamp = null;
  let lastTimestamp = null;
  let emptyPages = 0;
  let passedFromDate = false;

  while (count < limit && emptyPages < 3 && !passedFromDate) {
    // Pause between pages — like scrolling through the feed
    await randomDelay(3000, 8000);

    // Fetch a page of likes
    const pageData = await page.evaluate(async ({ userId, cursor, pageSize }) => {
      const ct0 = document.cookie.match(/ct0=([^;]+)/)?.[1];
      if (!ct0) return null;
      const variables = { userId, count: pageSize, includePromotedContent: false, withClientEventToken: false, withBirdwatchNotes: false, withVoice: true };
      if (cursor) variables.cursor = cursor;
      const features = {
        rweb_video_screen_enabled: false, responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
        responsive_web_twitter_article_tweet_consumption_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        freedom_of_speech_not_reach_fetch_enabled: true,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
        longform_notetweets_rich_text_read_enabled: true,
      };
      const url = `https://x.com/i/api/graphql/KPuet6dGbC8LB2sOLx7tZQ/Likes?variables=${encodeURIComponent(JSON.stringify(variables))}&features=${encodeURIComponent(JSON.stringify(features))}`;
      try {
        const resp = await fetch(url, {
          headers: { 'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA', 'x-csrf-token': ct0, 'x-twitter-active-user': 'yes', 'x-twitter-auth-type': 'OAuth2Session' },
          credentials: 'include',
        });
        return await resp.json();
      } catch { return null; }
    }, { userId, cursor, pageSize: Math.min(20, limit - count) });

    if (!pageData) { emptyPages++; continue; }

    const instructions = pageData?.data?.user?.result?.timeline?.timeline?.instructions || [];
    const entries = [];
    for (const inst of instructions) {
      if (inst.entries) entries.push(...inst.entries);
    }

    const cursorEntry = entries.find(e => e.entryId?.startsWith('cursor-bottom'));
    cursor = cursorEntry?.content?.value || null;

    // Process each tweet in the page
    const batch = [];
    for (const entry of entries) {
      const result = entry.content?.itemContent?.tweet_results?.result;
      if (!result) continue;
      const parsed = parseTweetResult(result);
      if (!parsed) continue;

      const tweetDate = parsed.timestamp ? new Date(parsed.timestamp) : null;
      if (tweetDate) {
        if (fromDate && tweetDate < fromDate) { passedFromDate = true; break; }
        if (toDate && tweetDate > toDate) continue;
      }

      delete parsed.quotedTweetId;
      delete parsed.inReplyTo;

      if (!firstTimestamp && parsed.timestamp) firstTimestamp = parsed.timestamp;
      if (parsed.timestamp) lastTimestamp = parsed.timestamp;
      batch.push(parsed);
      count++;
      if (count >= limit) break;
    }

    // Write likes batch
    if (batch.length > 0) {
      const lines = batch.map(t => JSON.stringify(t)).join('\n') + '\n';
      await fs.appendFile(likesFile, lines);
      emptyPages = 0;
    } else {
      emptyPages++;
    }

    // Deep read each tweet — interleaved with human-like pauses
    for (const tweet of batch) {
      // Pause before tapping in — decision time
      await randomDelay(2000, 5000);

      try {
        const tweetUrl = tweet.url;
        if (!tweetUrl) continue;
        const author = new URL(tweetUrl).pathname.split('/').filter(Boolean)[0];
// ============================================================================
// Likes Scraper
// ============================================================================

/**
 * Scrape users who liked a tweet
 */
export async function scrapeLikes(page, tweetUrl, options = {}) {
  const { limit = 100 } = options;
  
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
// Bookmarks Scraper
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
        return { author, text, time, likes, retweets, link: link ? `https://x.com${link}` : '', platform: 'twitter' };
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
// Notifications Scraper
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
        return { text: text.slice(0, 280), time, links: links.map(l => `https://x.com${l}`), platform: 'twitter' };
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
// Trending Scraper
// ============================================================================

/**
 * Scrape trending topics from the Explore page
 */
export async function scrapeTrending(page, options = {}) {
  const { limit = 30 } = options;
  
  await page.goto('https://x.com/explore/tabs/trending', { waitUntil: 'networkidle2' });
  await randomDelay(2000, 3000);
  
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
      return { category, topic, posts, platform: 'twitter' };
    })
  );
  
  return trends.slice(0, limit);
}

// ============================================================================
// Community Members Scraper
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
        const bio = cell.querySelector('[data-testid="userDescription"]')?.innerText || '';
        return { name, handle, bio, platform: 'twitter' };
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
// Spaces Scraper
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
          platform: 'twitter',
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
// Default Export
// ============================================================================

export default {
  createBrowser,
  createPage,
  loginWithCookie,
  scrapeProfile,
  scrapeFollowers,
  scrapeFollowing,
  scrapeTweets,
  searchTweets,
  scrapeThread,
  scrapePost,
  scrapeLikedTweets,
  discoverLikes,
  scrapeLikes,
  scrapeHashtag,
  scrapeMedia,
  scrapeListMembers,
  scrapeBookmarks,
  scrapeNotifications,
  scrapeTrending,
  scrapeCommunityMembers,
  scrapeSpaces,
  exportToJSON,
  exportToCSV,
};

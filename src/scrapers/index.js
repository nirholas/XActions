/**
 * XActions Scrapers — Unified Multi-Platform Interface
 * 
 * Supports: Twitter/X, Bluesky, Threads, Mastodon
 * 
 * All original Twitter exports are preserved for full backward compatibility.
 * New unified `scrape()` function dispatches to the correct platform module.
 * 
 * Usage:
 *   // Backward-compatible Twitter (unchanged):
 *   import scrapers from 'xactions/scrapers';
 *   const profile = await scrapers.scrapeProfile(page, 'elonmusk');
 * 
 *   // New unified interface:
 *   import { scrape, platforms } from 'xactions/scrapers';
 *   const profile = await scrape('bluesky', 'profile', { username: 'user.bsky.social' });
 *   const profile = await scrape('mastodon', 'profile', { username: 'user', instance: 'https://mastodon.social' });
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

// ============================================================================
// Platform Modules
// ============================================================================

import twitter from './twitter/index.js';
import bluesky from './bluesky/index.js';
import mastodon from './mastodon/index.js';
import threads from './threads/index.js';

// ============================================================================
// Backward-Compatible Twitter Re-exports
// ============================================================================

// Re-export all Twitter functions at top level for backward compatibility
export const {
  createBrowser,
  createPage,
  loginWithCookie,
  scrapeProfile,
  scrapeFollowers,
  scrapeFollowing,
  scrapeTweets,
  searchTweets,
  scrapeThread,
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
} = twitter;

// ============================================================================
// Platform Registry
// ============================================================================

/**
 * Available platform modules
 */
export const platforms = {
  twitter,
  x: twitter, // alias
  bluesky,
  bsky: bluesky, // alias
  mastodon,
  masto: mastodon, // alias
  threads,
};

/**
 * Get a platform module by name
 * @param {string} platform - Platform name
 * @returns {Object} Platform module
 */
export function getPlatform(platform) {
  const mod = platforms[platform?.toLowerCase()];
  if (!mod) {
    const available = Object.keys(platforms).filter(k => !['x', 'bsky', 'masto'].includes(k));
    throw new Error(
      `Unknown platform "${platform}". Available: ${available.join(', ')}`
    );
  }
  return mod;
}

// ============================================================================
// Unified Scrape Interface
// ============================================================================

/**
 * Unified scrape function — dispatches to the correct platform module
 * 
 * @param {string} platform - Platform name: 'twitter', 'bluesky', 'mastodon', 'threads'
 * @param {string} action - Action name: 'profile', 'followers', 'following', 'tweets', 'search', 'hashtag', 'trending'
 * @param {Object} options - Action-specific options
 * @param {string} [options.username] - Target username
 * @param {string} [options.query] - Search query (for 'search' action)
 * @param {string} [options.hashtag] - Hashtag (for 'hashtag' action)
 * @param {number} [options.limit] - Max results
 * @param {string} [options.instance] - Mastodon instance URL
 * @param {Object} [options.page] - Puppeteer page (for Twitter/Threads)
 * @param {Object} [options.client] - API client (for Bluesky/Mastodon)
 * @returns {Promise<Object|Array>} Scraped data
 * 
 * @example
 *   // Twitter
 *   const profile = await scrape('twitter', 'profile', { page, username: 'elonmusk' });
 * 
 *   // Bluesky (no Puppeteer needed)
 *   const profile = await scrape('bluesky', 'profile', { username: 'user.bsky.social' });
 * 
 *   // Mastodon (no Puppeteer needed)
 *   const profile = await scrape('mastodon', 'profile', { username: 'user', instance: 'https://mastodon.social' });
 * 
 *   // Threads (Puppeteer)
 *   const posts = await scrape('threads', 'tweets', { page, username: 'zuck', limit: 20 });
 */
export async function scrape(platform, action, options = {}) {
  const mod = getPlatform(platform);
  const platformName = platform.toLowerCase();

  // Action name mapping
  const actionMap = {
    profile: 'scrapeProfile',
    followers: 'scrapeFollowers',
    following: 'scrapeFollowing',
    tweets: 'scrapeTweets',
    posts: 'scrapeTweets', // alias
    search: 'searchTweets',
    hashtag: 'scrapeHashtag',
    trending: 'scrapeTrending',
    thread: 'scrapeThread',
    likes: 'scrapeLikes',
    media: 'scrapeMedia',
    listMembers: 'scrapeListMembers',
    bookmarks: 'scrapeBookmarks',
    notifications: 'scrapeNotifications',
    communityMembers: 'scrapeCommunityMembers',
    spaces: 'scrapeSpaces',
    feed: 'scrapeFeed',
  };

  const fnName = actionMap[action] || action;
  const fn = mod[fnName];

  if (typeof fn !== 'function') {
    const available = Object.keys(mod).filter(
      (k) => typeof mod[k] === 'function' && (k.startsWith('scrape') || k.startsWith('search'))
    );
    throw new Error(
      `Action "${action}" not available on platform "${platform}". Available: ${available.join(', ')}`
    );
  }

  // Determine the first argument based on platform type
  // Twitter & Threads use Puppeteer page; Bluesky & Mastodon use API clients
  const needsPuppeteer = ['twitter', 'x', 'threads'].includes(platformName);
  const needsClient = ['bluesky', 'bsky', 'mastodon', 'masto'].includes(platformName);

  if (needsPuppeteer) {
    let page = options.page;

    // Auto-create browser/page if not provided
    if (!page) {
      const browser = await mod.createBrowser(options.browserOptions || {});
      page = await mod.createPage(browser);

      // Login if auth token provided (Twitter only)
      if (options.authToken && mod.loginWithCookie) {
        await mod.loginWithCookie(page, options.authToken);
      }

      // Store browser ref for cleanup
      page.__xactions_browser = browser;
    }

    // Determine the second argument based on action
    const target = options.username || options.query || options.hashtag || options.url || options.listUrl || options.communityUrl;

    // Actions that only take page + options (no target)
    const noTargetActions = ['scrapeBookmarks', 'scrapeNotifications', 'scrapeTrending'];
    
    let result;
    if (noTargetActions.includes(fnName)) {
      result = await fn(page, options);
    } else {
      result = await fn(page, target, options);
    }

    // Auto-close browser if we created it
    if (page.__xactions_browser && options.autoClose !== false) {
      await page.__xactions_browser.close();
    }

    return result;
  }

  if (needsClient) {
    let client = options.client;

    // Auto-create client if not provided
    if (!client) {
      if (platformName === 'bluesky' || platformName === 'bsky') {
        client = await bluesky.createAgent({
          service: options.service,
          identifier: options.identifier,
          password: options.password,
        });
      } else {
        client = mastodon.createClient({
          instance: options.instance,
          accessToken: options.accessToken,
        });
      }
    }

    const target = options.username || options.query || options.hashtag || options.feedUri;

    // Actions that only take client + options (no target)
    const noTargetActions = ['scrapeTrending'];

    if (noTargetActions.includes(fnName)) {
      return await fn(client, options);
    }

    return await fn(client, target, options);
  }

  throw new Error(`Cannot determine how to call platform "${platform}"`);
}

// ============================================================================
// Default Export — backward compatible
// ============================================================================

export default {
  // Core (Twitter)
  createBrowser,
  createPage,
  loginWithCookie,
  
  // Twitter Scrapers (backward compatible)
  scrapeProfile,
  scrapeFollowers,
  scrapeFollowing,
  scrapeTweets,
  searchTweets,
  scrapeThread,
  scrapeLikes,
  scrapeHashtag,
  scrapeMedia,
  scrapeListMembers,
  scrapeBookmarks,
  scrapeNotifications,
  scrapeTrending,
  scrapeCommunityMembers,
  scrapeSpaces,
  
  // Export utilities
  exportToJSON,
  exportToCSV,
  
  // Multi-platform
  scrape,
  platforms,
  getPlatform,
  
  // Platform modules
  twitter,
  bluesky,
  mastodon,
  threads,
};

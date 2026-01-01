/**
 * XActions - The Complete X/Twitter Automation Toolkit
 * 
 * Features:
 * - Scrapers: Profile, followers, following, tweets, threads, media
 * - MCP Server: AI agent integration for Claude, GPT, etc.
 * - CLI: Command-line interface for all operations
 * - Browser Scripts: Copy-paste scripts for X.com console
 * - SaaS API: Self-hosted automation platform
 * 
 * No Twitter API required - saves $100-$5000+/month!
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

// Re-export all scrapers
export * from './scrapers/index.js';

// Default export for convenience
import scrapers from './scrapers/index.js';

export { scrapers };

/**
 * Quick start example:
 * 
 * ```javascript
 * import { createBrowser, createPage, scrapeProfile, scrapeFollowers } from 'xactions';
 * 
 * const browser = await createBrowser();
 * const page = await createPage(browser);
 * 
 * // Get profile info
 * const profile = await scrapeProfile(page, 'elonmusk');
 * console.log(profile);
 * 
 * // Scrape followers
 * const followers = await scrapeFollowers(page, 'elonmusk', { limit: 100 });
 * console.log(followers);
 * 
 * await browser.close();
 * ```
 */


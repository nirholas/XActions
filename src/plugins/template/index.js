/**
 * XActions Example Plugin — xactions-plugin-example
 * 
 * Demonstrates the plugin interface by adding:
 *   - A scraper that extracts trending topics
 *   - An MCP tool that exposes the scraper to AI agents
 *   - An Express route that serves the scraper via REST API
 *   - A browser action for window.XActions
 *   - Lifecycle hooks
 * 
 * Use this as a template when building your own XActions plugin.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

// ============================================================================
// Example Scraper: Trending Topics
// ============================================================================

/**
 * Scrape trending topics from X/Twitter Explore page
 * @param {import('puppeteer').Page} page - A logged-in Puppeteer page
 * @param {Object} options
 * @param {number} [options.limit=10] - Max topics to return
 * @returns {Promise<Object[]>} Array of trending topic objects
 */
async function scrapeTrendingTopics(page, options = {}) {
  const limit = options.limit || 10;

  await page.goto('https://x.com/explore/tabs/trending', {
    waitUntil: 'networkidle2',
  });

  // Wait for trending content to load
  await page.waitForSelector('[data-testid="trend"]', { timeout: 10000 }).catch(() => null);

  const trends = await page.evaluate((max) => {
    const items = document.querySelectorAll('[data-testid="trend"]');
    const results = [];

    for (const item of items) {
      if (results.length >= max) break;

      const nameEl = item.querySelector('span');
      const countEl = item.querySelectorAll('span');
      const name = nameEl?.textContent?.trim() || '';
      const tweetCount = countEl.length > 1 ? countEl[countEl.length - 1]?.textContent?.trim() : '';

      if (name) {
        results.push({
          name,
          tweetCount,
          scrapedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  }, limit);

  return trends;
}

// ============================================================================
// Plugin Definition
// ============================================================================

export const name = 'xactions-plugin-example';
export const version = '1.0.0';
export const description = 'Example XActions plugin — trending topics scraper + MCP tool';

/**
 * Browser console actions (added to window.XActions namespace)
 */
export const actions = [
  {
    name: 'getTrending',
    description: 'Log trending topics to the console',
    // This is an IIFE string that runs in the browser console
    script: `(() => {
      const trends = document.querySelectorAll('[data-testid="trend"]');
      const results = [];
      trends.forEach(t => {
        const name = t.querySelector('span')?.textContent?.trim();
        if (name) results.push(name);
      });
      console.log('🔥 Trending:', results);
      return results;
    })()`,
  },
];

/**
 * Puppeteer scraper functions (added to scraper exports)
 */
export const scrapers = [
  {
    name: 'scrapeTrendingTopics',
    description: 'Scrape trending topics from the Explore page',
    handler: scrapeTrendingTopics,
  },
];

/**
 * MCP tool definitions (registered in MCP server for AI agents)
 */
export const tools = [
  {
    name: 'x_get_trending_topics',
    description: 'Get currently trending topics on X/Twitter. Returns topic names and tweet counts.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of trending topics to return (default: 10)',
        },
      },
      required: [],
    },
    // The handler is called when an AI agent invokes this tool
    handler: async (args, { page }) => {
      return await scrapeTrendingTopics(page, { limit: args.limit || 10 });
    },
  },
];

/**
 * Express route handlers (mounted under /api/plugins/<plugin-name>/)
 */
export const routes = [
  {
    method: 'get',
    path: '/trending',
    description: 'Get trending topics',
    handler: (req, res) => {
      // In a real plugin, you'd use Puppeteer here or return cached data
      res.json({
        message: 'Trending topics endpoint from xactions-plugin-example',
        hint: 'This is a placeholder — real implementation would use Puppeteer.',
      });
    },
  },
];

/**
 * Lifecycle hooks
 */
export const hooks = {
  onLoad() {
    console.log('📦 xactions-plugin-example loaded');
  },

  onUnload() {
    console.log('📦 xactions-plugin-example unloaded');
  },

  beforeAction(context) {
    // Called before any automation action runs
    // context: { actionName, args, ... }
  },

  afterAction(context) {
    // Called after any automation action completes
    // context: { actionName, args, result, ... }
  },
};

// Default export for convenient use
export default {
  name,
  version,
  description,
  actions,
  scrapers,
  tools,
  routes,
  hooks,
};

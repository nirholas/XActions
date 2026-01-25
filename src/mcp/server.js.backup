#!/usr/bin/env node
/**
 * XActions MCP Server
 * Model Context Protocol server for AI agents (Claude, GPT, etc.)
 * 
 * This enables AI assistants to automate X/Twitter tasks directly.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://xactions.app
 * @license MIT
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

// Browser instance (reused across calls)
let browser = null;
let page = null;

/**
 * Initialize browser with stealth mode
 */
async function initBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }
  return { browser, page };
}

/**
 * Human-like delay
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => sleep(1000 + Math.random() * 2000);

/**
 * Login to X/Twitter using session cookie
 */
async function loginWithCookie(cookie) {
  const { page } = await initBrowser();
  await page.setCookie({
    name: 'auth_token',
    value: cookie,
    domain: '.x.com',
    path: '/',
    httpOnly: true,
    secure: true,
  });
  await page.goto('https://x.com/home', { waitUntil: 'networkidle2' });
  return { success: true, message: 'Logged in with session cookie' };
}

/**
 * Scrape followers for a user
 */
async function scrapeFollowers(username, limit = 100) {
  const { page } = await initBrowser();
  await page.goto(`https://x.com/${username}/followers`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const followers = new Set();
  let retries = 0;

  while (followers.size < limit && retries < 10) {
    const users = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      return Array.from(cells).map((cell) => {
        const link = cell.querySelector('a[href^="/"]');
        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const bioEl = cell.querySelector('[data-testid="UserDescription"]');
        return {
          username: link?.href?.split('/')[3] || null,
          name: nameEl?.textContent || null,
          bio: bioEl?.textContent || null,
        };
      }).filter(u => u.username);
    });

    const prevSize = followers.size;
    users.forEach((u) => followers.add(JSON.stringify(u)));
    
    if (followers.size === prevSize) retries++;
    else retries = 0;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay();
  }

  return Array.from(followers).map((s) => JSON.parse(s)).slice(0, limit);
}

/**
 * Scrape following for a user
 */
async function scrapeFollowing(username, limit = 100) {
  const { page } = await initBrowser();
  await page.goto(`https://x.com/${username}/following`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const following = new Set();
  let retries = 0;

  while (following.size < limit && retries < 10) {
    const users = await page.evaluate(() => {
      const cells = document.querySelectorAll('[data-testid="UserCell"]');
      return Array.from(cells).map((cell) => {
        const link = cell.querySelector('a[href^="/"]');
        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const followsBack = cell.querySelector('[data-testid="userFollowIndicator"]');
        return {
          username: link?.href?.split('/')[3] || null,
          name: nameEl?.textContent || null,
          followsBack: !!followsBack,
        };
      }).filter(u => u.username);
    });

    const prevSize = following.size;
    users.forEach((u) => following.add(JSON.stringify(u)));
    
    if (following.size === prevSize) retries++;
    else retries = 0;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay();
  }

  return Array.from(following).map((s) => JSON.parse(s)).slice(0, limit);
}

/**
 * Scrape tweets from a user's profile
 */
async function scrapeTweets(username, limit = 50) {
  const { page } = await initBrowser();
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const tweets = new Set();
  let retries = 0;

  while (tweets.size < limit && retries < 10) {
    const tweetData = await page.evaluate(() => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      return Array.from(articles).map((article) => {
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const timeEl = article.querySelector('time');
        const likesEl = article.querySelector('[data-testid="like"] span');
        const retweetsEl = article.querySelector('[data-testid="retweet"] span');
        const repliesEl = article.querySelector('[data-testid="reply"] span');
        const linkEl = article.querySelector('a[href*="/status/"]');
        
        return {
          text: textEl?.textContent || null,
          timestamp: timeEl?.getAttribute('datetime') || null,
          likes: likesEl?.textContent || '0',
          retweets: retweetsEl?.textContent || '0',
          replies: repliesEl?.textContent || '0',
          url: linkEl?.href || null,
        };
      }).filter(t => t.text);
    });

    const prevSize = tweets.size;
    tweetData.forEach((t) => tweets.add(JSON.stringify(t)));
    
    if (tweets.size === prevSize) retries++;
    else retries = 0;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay();
  }

  return Array.from(tweets).map((s) => JSON.parse(s)).slice(0, limit);
}

/**
 * Search tweets by keyword
 */
async function searchTweets(query, limit = 50) {
  const { page } = await initBrowser();
  const encodedQuery = encodeURIComponent(query);
  await page.goto(`https://x.com/search?q=${encodedQuery}&src=typed_query&f=live`, {
    waitUntil: 'networkidle2',
  });
  await randomDelay();

  const tweets = new Set();
  let retries = 0;

  while (tweets.size < limit && retries < 10) {
    const tweetData = await page.evaluate(() => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      return Array.from(articles).map((article) => {
        const textEl = article.querySelector('[data-testid="tweetText"]');
        const authorEl = article.querySelector('[data-testid="User-Name"] a');
        const timeEl = article.querySelector('time');
        const linkEl = article.querySelector('a[href*="/status/"]');
        
        return {
          text: textEl?.textContent || null,
          author: authorEl?.href?.split('/')[3] || null,
          timestamp: timeEl?.getAttribute('datetime') || null,
          url: linkEl?.href || null,
        };
      }).filter(t => t.text);
    });

    const prevSize = tweets.size;
    tweetData.forEach((t) => tweets.add(JSON.stringify(t)));
    
    if (tweets.size === prevSize) retries++;
    else retries = 0;

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await randomDelay();
  }

  return Array.from(tweets).map((s) => JSON.parse(s)).slice(0, limit);
}

/**
 * Get user profile information
 */
async function getProfile(username) {
  const { page } = await initBrowser();
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  return await page.evaluate(() => {
    const nameEl = document.querySelector('[data-testid="UserName"]');
    const bioEl = document.querySelector('[data-testid="UserDescription"]');
    const locationEl = document.querySelector('[data-testid="UserLocation"]');
    const websiteEl = document.querySelector('[data-testid="UserUrl"] a');
    const joinedEl = document.querySelector('[data-testid="UserJoinDate"]');
    
    const followingEl = document.querySelector('a[href$="/following"] span');
    const followersEl = document.querySelector('a[href$="/verified_followers"] span, a[href$="/followers"] span');

    return {
      name: nameEl?.textContent?.split('@')[0]?.trim() || null,
      username: nameEl?.textContent?.match(/@(\w+)/)?.[1] || null,
      bio: bioEl?.textContent || null,
      location: locationEl?.textContent || null,
      website: websiteEl?.href || null,
      joined: joinedEl?.textContent || null,
      following: followingEl?.textContent || null,
      followers: followersEl?.textContent || null,
    };
  });
}

/**
 * Unfollow a user
 */
async function unfollowUser(username) {
  const { page } = await initBrowser();
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  // Click the Following button
  const followingBtn = await page.$('[data-testid$="-unfollow"]');
  if (followingBtn) {
    await followingBtn.click();
    await sleep(500);
    
    // Confirm unfollow
    const confirmBtn = await page.$('[data-testid="confirmationSheetConfirm"]');
    if (confirmBtn) {
      await confirmBtn.click();
      await randomDelay();
      return { success: true, message: `Unfollowed @${username}` };
    }
  }
  
  return { success: false, message: `Could not unfollow @${username}` };
}

/**
 * Follow a user
 */
async function followUser(username) {
  const { page } = await initBrowser();
  await page.goto(`https://x.com/${username}`, { waitUntil: 'networkidle2' });
  await randomDelay();

  const followBtn = await page.$('[data-testid$="-follow"]');
  if (followBtn) {
    await followBtn.click();
    await randomDelay();
    return { success: true, message: `Followed @${username}` };
  }
  
  return { success: false, message: `Could not follow @${username}` };
}

/**
 * Get non-followers (people you follow who don't follow back)
 */
async function getNonFollowers(username) {
  const following = await scrapeFollowing(username, 500);
  const nonFollowers = following.filter(u => !u.followsBack);
  return {
    total: following.length,
    nonFollowers: nonFollowers.map(u => u.username),
    count: nonFollowers.length,
  };
}

/**
 * Post a tweet
 */
async function postTweet(text) {
  const { page } = await initBrowser();
  await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2' });
  await randomDelay();

  // Type the tweet
  const textbox = await page.$('[data-testid="tweetTextarea_0"]');
  if (textbox) {
    await textbox.type(text, { delay: 50 });
    await sleep(500);
    
    // Click post
    const postBtn = await page.$('[data-testid="tweetButton"]');
    if (postBtn) {
      await postBtn.click();
      await randomDelay();
      return { success: true, message: 'Tweet posted successfully' };
    }
  }
  
  return { success: false, message: 'Could not post tweet' };
}

/**
 * Like a tweet by URL
 */
async function likeTweet(tweetUrl) {
  const { page } = await initBrowser();
  await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
  await randomDelay();

  const likeBtn = await page.$('[data-testid="like"]');
  if (likeBtn) {
    await likeBtn.click();
    await randomDelay();
    return { success: true, message: 'Tweet liked' };
  }
  
  return { success: false, message: 'Could not like tweet' };
}

/**
 * Retweet a tweet by URL
 */
async function retweet(tweetUrl) {
  const { page } = await initBrowser();
  await page.goto(tweetUrl, { waitUntil: 'networkidle2' });
  await randomDelay();

  const rtBtn = await page.$('[data-testid="retweet"]');
  if (rtBtn) {
    await rtBtn.click();
    await sleep(500);
    
    const confirmRt = await page.$('[data-testid="retweetConfirm"]');
    if (confirmRt) {
      await confirmRt.click();
      await randomDelay();
      return { success: true, message: 'Retweeted' };
    }
  }
  
  return { success: false, message: 'Could not retweet' };
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: 'xactions-mcp',
    version: '3.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'x_login',
        description: 'Login to X/Twitter using a session cookie (auth_token). Required before other operations.',
        inputSchema: {
          type: 'object',
          properties: {
            cookie: {
              type: 'string',
              description: 'The auth_token cookie value from X.com',
            },
          },
          required: ['cookie'],
        },
      },
      {
        name: 'x_get_profile',
        description: 'Get profile information for an X/Twitter user including bio, follower count, etc.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Twitter username (without @)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'x_get_followers',
        description: 'Scrape followers for an X/Twitter account. Returns usernames, names, and bios.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Twitter username (without @)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of followers to scrape (default: 100)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'x_get_following',
        description: 'Scrape accounts that a user is following. Includes whether they follow back.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Twitter username (without @)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number to scrape (default: 100)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'x_get_non_followers',
        description: 'Get accounts you follow that do not follow you back.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Your Twitter username (without @)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'x_get_tweets',
        description: 'Scrape recent tweets from a user profile.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Twitter username (without @)',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of tweets (default: 50)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'x_search_tweets',
        description: 'Search for tweets matching a query. Returns latest tweets.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (can include operators like from:, to:, #hashtag)',
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 50)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'x_follow',
        description: 'Follow an X/Twitter user.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to follow (without @)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'x_unfollow',
        description: 'Unfollow an X/Twitter user.',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to unfollow (without @)',
            },
          },
          required: ['username'],
        },
      },
      {
        name: 'x_post_tweet',
        description: 'Post a new tweet to X/Twitter.',
        inputSchema: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Tweet content (max 280 characters)',
            },
          },
          required: ['text'],
        },
      },
      {
        name: 'x_like',
        description: 'Like a tweet by its URL.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Full URL of the tweet to like',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'x_retweet',
        description: 'Retweet a tweet by its URL.',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'Full URL of the tweet to retweet',
            },
          },
          required: ['url'],
        },
      },
    ],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'x_login':
        result = await loginWithCookie(args.cookie);
        break;
      case 'x_get_profile':
        result = await getProfile(args.username);
        break;
      case 'x_get_followers':
        result = await scrapeFollowers(args.username, args.limit || 100);
        break;
      case 'x_get_following':
        result = await scrapeFollowing(args.username, args.limit || 100);
        break;
      case 'x_get_non_followers':
        result = await getNonFollowers(args.username);
        break;
      case 'x_get_tweets':
        result = await scrapeTweets(args.username, args.limit || 50);
        break;
      case 'x_search_tweets':
        result = await searchTweets(args.query, args.limit || 50);
        break;
      case 'x_follow':
        result = await followUser(args.username);
        break;
      case 'x_unfollow':
        result = await unfollowUser(args.username);
        break;
      case 'x_post_tweet':
        result = await postTweet(args.text);
        break;
      case 'x_like':
        result = await likeTweet(args.url);
        break;
      case 'x_retweet':
        result = await retweet(args.url);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: error.message }),
        },
      ],
      isError: true,
    };
  }
});

// Cleanup on exit
process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit(0);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('XActions MCP Server running on stdio');
}

main().catch(console.error);

// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * XActions Workflow Actions
 * Wraps existing scrapers and automation functions as workflow steps
 * 
 * Each action follows a standard interface:
 *   execute(params, context) → result
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license Apache-2.0
 */

import scrapers from '../scrapers/index.js';
import { gotoAndRender } from '../utils/navigation.js';
import { openComposer, typeIntoComposer, clickPostButton, confirmPosted } from '../mcp/composer.js';
import { freeAsk, llmEnabled } from '../ai/freeLLM.js';

// ============================================================================
// Browser Pool (shared across action executions)
// ============================================================================

let _browser = null;
let _browserUseCount = 0;
const MAX_BROWSER_USES = 50; // Recycle browser after N uses

async function getBrowser() {
  if (!_browser || _browserUseCount >= MAX_BROWSER_USES) {
    if (_browser) {
      try { await _browser.close(); } catch { /* recycling: the old browser may already be gone */ }
    }
    _browser = await scrapers.createBrowser();
    _browserUseCount = 0;
  }
  _browserUseCount++;
  return _browser;
}

async function getAuthenticatedPage(authToken) {
  const browser = await getBrowser();
  const page = await scrapers.createPage(browser);
  if (authToken) {
    await scrapers.loginWithCookie(page, authToken);
  }
  return page;
}

export async function closeBrowser() {
  if (_browser) {
    try { await _browser.close(); } catch { /* shutting down: already closed is fine */ }
    _browser = null;
    _browserUseCount = 0;
  }
}

// ============================================================================
// Action Registry
// ============================================================================

const actions = {};

/**
 * Register a workflow action
 */
export function registerAction(name, definition) {
  actions[name] = definition;
}

/**
 * Get a registered action by name
 */
export function getAction(name) {
  return actions[name] || null;
}

/**
 * Get all registered actions with metadata
 */
export function listActions() {
  return Object.entries(actions).map(([name, def]) => ({
    name,
    description: def.description,
    params: def.params || {},
    category: def.category || 'general',
  }));
}

// ============================================================================
// Scraper Actions
// ============================================================================

registerAction('scrapeProfile', {
  description: 'Scrape a Twitter/X profile including bio, stats, and recent tweets',
  category: 'scraper',
  params: {
    target: { type: 'string', required: true, description: 'Username (with or without @)' },
  },
  async execute(params, context) {
    const username = params.target.replace(/^@/, '');
    const page = await getAuthenticatedPage(context.authToken);
    try {
      const profile = await scrapers.scrapeProfile(page, username);
      return profile;
    } finally {
      await page.close();
    }
  },
});

registerAction('scrapeFollowers', {
  description: 'Scrape followers list for a Twitter/X user',
  category: 'scraper',
  params: {
    target: { type: 'string', required: true, description: 'Username' },
    limit: { type: 'number', default: 100, description: 'Max followers to scrape' },
  },
  async execute(params, context) {
    const username = params.target.replace(/^@/, '');
    const page = await getAuthenticatedPage(context.authToken);
    try {
      return await scrapers.scrapeFollowers(page, username, { limit: params.limit || 100 });
    } finally {
      await page.close();
    }
  },
});

registerAction('scrapeFollowing', {
  description: 'Scrape following list for a Twitter/X user',
  category: 'scraper',
  params: {
    target: { type: 'string', required: true, description: 'Username' },
    limit: { type: 'number', default: 100, description: 'Max following to scrape' },
  },
  async execute(params, context) {
    const username = params.target.replace(/^@/, '');
    const page = await getAuthenticatedPage(context.authToken);
    try {
      return await scrapers.scrapeFollowing(page, username, { limit: params.limit || 100 });
    } finally {
      await page.close();
    }
  },
});

registerAction('scrapeTweets', {
  description: 'Scrape tweets from a Twitter/X user',
  category: 'scraper',
  params: {
    target: { type: 'string', required: true, description: 'Username' },
    limit: { type: 'number', default: 20, description: 'Max tweets to scrape' },
  },
  async execute(params, context) {
    const username = params.target.replace(/^@/, '');
    const page = await getAuthenticatedPage(context.authToken);
    try {
      return await scrapers.scrapeTweets(page, username, { limit: params.limit || 20 });
    } finally {
      await page.close();
    }
  },
});

registerAction('searchTweets', {
  description: 'Search Twitter/X for tweets matching a query',
  category: 'scraper',
  params: {
    query: { type: 'string', required: true, description: 'Search query' },
    limit: { type: 'number', default: 20, description: 'Max results' },
  },
  async execute(params, context) {
    const page = await getAuthenticatedPage(context.authToken);
    try {
      return await scrapers.searchTweets(page, params.query, { limit: params.limit || 20 });
    } finally {
      await page.close();
    }
  },
});

registerAction('scrapeHashtag', {
  description: 'Scrape tweets from a hashtag',
  category: 'scraper',
  params: {
    hashtag: { type: 'string', required: true, description: 'Hashtag (with or without #)' },
    limit: { type: 'number', default: 20, description: 'Max results' },
  },
  async execute(params, context) {
    const hashtag = params.hashtag.replace(/^#/, '');
    const page = await getAuthenticatedPage(context.authToken);
    try {
      return await scrapers.scrapeHashtag(page, hashtag, { limit: params.limit || 20 });
    } finally {
      await page.close();
    }
  },
});

registerAction('scrapeTrending', {
  description: 'Scrape trending topics from Twitter/X',
  category: 'scraper',
  params: {},
  async execute(params, context) {
    const page = await getAuthenticatedPage(context.authToken);
    try {
      return await scrapers.scrapeTrending(page);
    } finally {
      await page.close();
    }
  },
});

// ============================================================================
// Automation Actions (follow, unfollow, post, like, retweet)
// ============================================================================

registerAction('follow', {
  description: 'Follow a Twitter/X user',
  category: 'automation',
  params: {
    target: { type: 'string', required: true, description: 'Username to follow (with or without @)' },
  },
  async execute(params, context) {
    const username = params.target.replace(/^@/, '');
    const page = await getAuthenticatedPage(context.authToken);
    try {
      await gotoAndRender(page, `https://x.com/${username}`, '[data-testid="placementTracking"]');
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
      const followBtn = await page.$('[data-testid="placementTracking"] [role="button"]:not([data-testid$="-unfollow"])');
      if (followBtn) {
        await followBtn.click();
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
        return { success: true, message: `Followed @${username}` };
      }
      return { success: false, message: `Could not follow @${username} (already following or button not found)` };
    } finally {
      await page.close();
    }
  },
});

registerAction('unfollow', {
  description: 'Unfollow a Twitter/X user',
  category: 'automation',
  params: {
    target: { type: 'string', required: true, description: 'Username to unfollow (with or without @)' },
  },
  async execute(params, context) {
    const username = params.target.replace(/^@/, '');
    const page = await getAuthenticatedPage(context.authToken);
    try {
      await gotoAndRender(page, `https://x.com/${username}`, '[data-testid="placementTracking"]');
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
      const unfollowBtn = await page.$('[data-testid$="-unfollow"]');
      if (unfollowBtn) {
        await unfollowBtn.click();
        await new Promise(r => setTimeout(r, 500));
        const confirmBtn = await page.$('[data-testid="confirmationSheetConfirm"]');
        if (confirmBtn) await confirmBtn.click();
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
        return { success: true, message: `Unfollowed @${username}` };
      }
      return { success: false, message: `Could not unfollow @${username} (not following or button not found)` };
    } finally {
      await page.close();
    }
  },
});

registerAction('postTweet', {
  description: 'Post a tweet on Twitter/X',
  category: 'automation',
  params: {
    text: { type: 'string', required: true, description: 'Tweet text (supports {{variable}} template syntax)' },
  },
  async execute(params, context) {
    const page = await getAuthenticatedPage(context.authToken);
    try {
      // Same composer flow as the MCP x_post_tweet tool (src/mcp/composer.js).
      if (!(await openComposer(page))) return { success: false, message: 'Could not open the composer' };
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
      if (!(await typeIntoComposer(page, 0, params.text, { delay: 50 }))) {
        return { success: false, message: 'The text did not reach the composer, so nothing was posted' };
      }
      await new Promise(r => setTimeout(r, 500));
      if (!(await clickPostButton(page))) {
        return { success: false, message: 'The post button never became enabled, so nothing was posted' };
      }
      const confirmation = await confirmPosted(page, { typed: params.text });
      if (!confirmation.ok) return { success: false, message: confirmation.reason };
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
      return { success: true, message: 'Tweet posted' };
    } finally {
      await page.close();
    }
  },
});

registerAction('like', {
  description: 'Like a tweet on Twitter/X',
  category: 'automation',
  params: {
    url: { type: 'string', required: true, description: 'URL of the tweet to like' },
  },
  async execute(params, context) {
    const page = await getAuthenticatedPage(context.authToken);
    try {
      await gotoAndRender(page, params.url, '[data-testid="like"], [data-testid="unlike"]');
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
      const likeBtn = await page.$('[data-testid="like"]');
      if (likeBtn) {
        await likeBtn.click();
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
        return { success: true, message: 'Tweet liked' };
      }
      return { success: false, message: 'Could not like tweet (already liked or button not found)' };
    } finally {
      await page.close();
    }
  },
});

registerAction('retweet', {
  description: 'Retweet a tweet on Twitter/X',
  category: 'automation',
  params: {
    url: { type: 'string', required: true, description: 'URL of the tweet to retweet' },
  },
  async execute(params, context) {
    const page = await getAuthenticatedPage(context.authToken);
    try {
      await gotoAndRender(page, params.url, '[data-testid="retweet"], [data-testid="unretweet"]');
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
      const retweetBtn = await page.$('[data-testid="retweet"]');
      if (retweetBtn) {
        await retweetBtn.click();
        await new Promise(r => setTimeout(r, 500));
        const confirmBtn = await page.$('[data-testid="retweetConfirm"]');
        if (confirmBtn) await confirmBtn.click();
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
        return { success: true, message: 'Retweeted successfully' };
      }
      return { success: false, message: 'Could not retweet (already retweeted or button not found)' };
    } finally {
      await page.close();
    }
  },
});

registerAction('reply', {
  description: 'Reply to a tweet on Twitter/X',
  category: 'automation',
  params: {
    url: { type: 'string', required: true, description: 'URL of the tweet to reply to' },
    text: { type: 'string', required: true, description: 'Reply text' },
  },
  async execute(params, context) {
    const page = await getAuthenticatedPage(context.authToken);
    try {
      await gotoAndRender(page, params.url, '[data-testid="tweetTextarea_0"]');
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
      if (!(await typeIntoComposer(page, 0, params.text, { delay: 50 }))) {
        return { success: false, message: 'Could not reply to tweet: the reply box did not take the text' };
      }
      await new Promise(r => setTimeout(r, 500));
      if (!(await clickPostButton(page, { testids: ['tweetButtonInline', 'tweetButton'] }))) {
        return { success: false, message: 'Could not reply to tweet: the reply button never became enabled' };
      }
      const confirmation = await confirmPosted(page, { typed: params.text });
      if (!confirmation.ok) return { success: false, message: `Could not reply to tweet: ${confirmation.reason}` };
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
      return { success: true, message: 'Reply posted' };
    } finally {
      await page.close();
    }
  },
});

registerAction('getNonFollowers', {
  description: 'Get users you follow who don\'t follow you back',
  category: 'automation',
  params: {
    target: { type: 'string', required: true, description: 'Your username' },
    limit: { type: 'number', default: 200, description: 'Max users to check' },
  },
  async execute(params, context) {
    const username = params.target.replace(/^@/, '');
    const page = await getAuthenticatedPage(context.authToken);
    try {
      const followers = await scrapers.scrapeFollowers(page, username, { limit: params.limit || 200 });
      const following = await scrapers.scrapeFollowing(page, username, { limit: params.limit || 200 });
      const followerSet = new Set(followers.map(f => f.username?.toLowerCase()).filter(Boolean));
      const nonFollowers = following.filter(f => !followerSet.has(f.username?.toLowerCase()));
      return {
        username,
        nonFollowers: nonFollowers.map(f => f.username),
        count: nonFollowers.length,
        totalFollowers: followers.length,
        totalFollowing: following.length,
      };
    } finally {
      await page.close();
    }
  },
});

// ============================================================================
// Additional Scraper Actions
// ============================================================================

registerAction('scrapeThread', {
  description: 'Scrape a full tweet thread/conversation',
  category: 'scraper',
  params: {
    url: { type: 'string', required: true, description: 'URL of the tweet thread' },
  },
  async execute(params, context) {
    const page = await getAuthenticatedPage(context.authToken);
    try {
      return await scrapers.scrapeThread(page, params.url);
    } finally {
      await page.close();
    }
  },
});

registerAction('scrapeMedia', {
  description: 'Scrape media (images/videos) from a Twitter/X user',
  category: 'scraper',
  params: {
    target: { type: 'string', required: true, description: 'Username' },
    limit: { type: 'number', default: 20, description: 'Max media items to scrape' },
  },
  async execute(params, context) {
    const username = params.target.replace(/^@/, '');
    const page = await getAuthenticatedPage(context.authToken);
    try {
      return await scrapers.scrapeMedia(page, username, { limit: params.limit || 20 });
    } finally {
      await page.close();
    }
  },
});

registerAction('scrapeBookmarks', {
  description: 'Scrape your bookmarked tweets (requires authentication)',
  category: 'scraper',
  params: {
    limit: { type: 'number', default: 50, description: 'Max bookmarks to scrape' },
  },
  async execute(params, context) {
    const page = await getAuthenticatedPage(context.authToken);
    try {
      return await scrapers.scrapeBookmarks(page, { limit: params.limit || 50 });
    } finally {
      await page.close();
    }
  },
});

registerAction('scrapeNotifications', {
  description: 'Scrape your recent notifications (requires authentication)',
  category: 'scraper',
  params: {
    limit: { type: 'number', default: 30, description: 'Max notifications to scrape' },
  },
  async execute(params, context) {
    const page = await getAuthenticatedPage(context.authToken);
    try {
      return await scrapers.scrapeNotifications(page, { limit: params.limit || 30 });
    } finally {
      await page.close();
    }
  },
});

registerAction('scrapeListMembers', {
  description: 'Scrape members of a Twitter/X list',
  category: 'scraper',
  params: {
    url: { type: 'string', required: true, description: 'URL of the Twitter list' },
    limit: { type: 'number', default: 100, description: 'Max members to scrape' },
  },
  async execute(params, context) {
    const page = await getAuthenticatedPage(context.authToken);
    try {
      return await scrapers.scrapeListMembers(page, params.url, { limit: params.limit || 100 });
    } finally {
      await page.close();
    }
  },
});

registerAction('scrapeLikes', {
  description: 'Scrape users who liked a specific tweet',
  category: 'scraper',
  params: {
    url: { type: 'string', required: true, description: 'URL of the tweet' },
    limit: { type: 'number', default: 50, description: 'Max likers to scrape' },
  },
  async execute(params, context) {
    const page = await getAuthenticatedPage(context.authToken);
    try {
      return await scrapers.scrapeLikes(page, params.url, { limit: params.limit || 50 });
    } finally {
      await page.close();
    }
  },
});

// ============================================================================
// Data Transform Actions
// ============================================================================

registerAction('filter', {
  description: 'Filter an array based on a condition',
  category: 'transform',
  params: {
    input: { type: 'string', required: true, description: 'Context variable name (array)' },
    field: { type: 'string', required: true, description: 'Field to filter on' },
    operator: { type: 'string', required: true, description: 'Comparison operator' },
    value: { type: 'any', required: true, description: 'Value to compare against' },
  },
  async execute(params, context) {
    const data = context[params.input];
    if (!Array.isArray(data)) {
      throw new Error(`filter: "${params.input}" is not an array`);
    }

    const ops = {
      '>': (a, b) => Number(a) > Number(b),
      '<': (a, b) => Number(a) < Number(b),
      '>=': (a, b) => Number(a) >= Number(b),
      '<=': (a, b) => Number(a) <= Number(b),
      '==': (a, b) => String(a) === String(b),
      '!=': (a, b) => String(a) !== String(b),
      'contains': (a, b) => String(a).toLowerCase().includes(String(b).toLowerCase()),
    };

    const op = ops[params.operator];
    if (!op) throw new Error(`filter: unknown operator "${params.operator}"`);

    return data.filter(item => {
      const val = params.field.split('.').reduce((o, k) => o?.[k], item);
      return op(val, params.value);
    });
  },
});

registerAction('count', {
  description: 'Count items in an array from context',
  category: 'transform',
  params: {
    input: { type: 'string', required: true, description: 'Context variable name (array)' },
  },
  async execute(params, context) {
    const data = context[params.input];
    return Array.isArray(data) ? data.length : 0;
  },
});

registerAction('pick', {
  description: 'Pick specific fields from objects in an array',
  category: 'transform',
  params: {
    input: { type: 'string', required: true, description: 'Context variable name (array)' },
    fields: { type: 'array', required: true, description: 'Fields to pick' },
  },
  async execute(params, context) {
    const data = context[params.input];
    if (!Array.isArray(data)) {
      throw new Error(`pick: "${params.input}" is not an array`);
    }
    return data.map(item => {
      const picked = {};
      for (const field of params.fields) {
        picked[field] = item[field];
      }
      return picked;
    });
  },
});

registerAction('slice', {
  description: 'Get a subset of an array',
  category: 'transform',
  params: {
    input: { type: 'string', required: true, description: 'Context variable name (array)' },
    start: { type: 'number', default: 0, description: 'Start index' },
    end: { type: 'number', description: 'End index (exclusive)' },
  },
  async execute(params, context) {
    const data = context[params.input];
    if (!Array.isArray(data)) {
      throw new Error(`slice: "${params.input}" is not an array`);
    }
    return data.slice(params.start || 0, params.end);
  },
});

// ============================================================================
// AI Actions
// ============================================================================

registerAction('summarize', {
  description: 'Summarize text with a free LLM (no key needed)',
  category: 'ai',
  params: {
    input: { type: 'string', required: true, description: 'Text to summarize (or context variable name)' },
    prompt: { type: 'string', default: 'Summarize the following text concisely:', description: 'System prompt' },
  },
  async execute(params, context) {
    // Resolve input from context if it's a variable reference
    let text = context[params.input] ?? params.input;
    if (typeof text === 'object') text = JSON.stringify(text, null, 2);

    // Extractive fallback: the first three substantial sentences.
    const extractive = () => {
      const sentences = String(text).split(/[.!?]+/).filter(s => s.trim().length > 20);
      return sentences.slice(0, 3).join('. ').trim() + '.';
    };
    if (!llmEnabled()) return extractive();

    try {
      return await freeAsk(params.prompt || 'Summarize the following text concisely:', String(text).slice(0, 4000), { maxTokens: 500 });
    } catch (error) {
      console.warn(`⚠️  summarize: free LLMs unavailable (${error.message}); using an extractive summary`);
      return extractive();
    }
  },
});

registerAction('generateText', {
  description: 'Generate text with a free LLM (no key needed)',
  category: 'ai',
  params: {
    prompt: { type: 'string', required: true, description: 'The prompt' },
    system: { type: 'string', default: 'You are a helpful assistant.', description: 'System prompt' },
  },
  async execute(params, context) {
    // Template replacement in prompt
    let prompt = params.prompt;
    for (const [key, value] of Object.entries(context)) {
      const strVal = typeof value === 'string' ? value : JSON.stringify(value);
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), strVal);
    }

    // Throws LLMUnavailableError when LLMs are off or every lane fails, so
    // the workflow step fails visibly instead of passing placeholder text on.
    return freeAsk(params.system || 'You are a helpful assistant.', prompt.slice(0, 4000), { maxTokens: 500 });
  },
});

// ============================================================================
// Utility Actions
// ============================================================================

registerAction('log', {
  description: 'Log a message or context variable (useful for debugging workflows)',
  category: 'utility',
  params: {
    message: { type: 'string', description: 'Message to log' },
    variable: { type: 'string', description: 'Context variable name to log' },
  },
  async execute(params, context) {
    const value = params.variable ? context[params.variable] : params.message;
    console.log(`📋 [Workflow Log]`, typeof value === 'object' ? JSON.stringify(value, null, 2) : value);
    return value;
  },
});

registerAction('delay', {
  description: 'Wait for a specified number of milliseconds',
  category: 'utility',
  params: {
    ms: { type: 'number', required: true, description: 'Milliseconds to wait' },
  },
  async execute(params) {
    const ms = Math.min(params.ms || 1000, 300000); // Max 5 minutes
    await new Promise(resolve => setTimeout(resolve, ms));
    return { waited: ms };
  },
});

registerAction('exportJSON', {
  description: 'Export data to a JSON file',
  category: 'utility',
  params: {
    input: { type: 'string', required: true, description: 'Context variable name' },
    filepath: { type: 'string', required: true, description: 'Output file path' },
  },
  async execute(params, context) {
    const data = context[params.input];
    await scrapers.exportToJSON(data, params.filepath);
    return { exported: params.filepath, records: Array.isArray(data) ? data.length : 1 };
  },
});

registerAction('exportCSV', {
  description: 'Export data to a CSV file',
  category: 'utility',
  params: {
    input: { type: 'string', required: true, description: 'Context variable name' },
    filepath: { type: 'string', required: true, description: 'Output file path' },
  },
  async execute(params, context) {
    const data = context[params.input];
    await scrapers.exportToCSV(data, params.filepath);
    return { exported: params.filepath, records: Array.isArray(data) ? data.length : 1 };
  },
});

registerAction('template', {
  description: 'Render a template string with context variables using {{variable}} syntax',
  category: 'utility',
  params: {
    text: { type: 'string', required: true, description: 'Template text with {{variable}} placeholders' },
  },
  async execute(params, context) {
    let text = params.text;
    // Replace {{variable}} and {{variable.field}} patterns
    text = text.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const parts = path.trim().split('.');
      let value = context;
      for (const part of parts) {
        if (value === undefined || value === null) return match;
        value = value[part];
      }
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value ?? match);
    });
    return text;
  },
});

// ============================================================================
// Execute Action
// ============================================================================

/**
 * Execute a workflow action step
 * 
 * @param {object} step - The workflow step definition
 * @param {object} context - The workflow variable context
 * @returns {Promise<any>} - The action result
 */
export async function executeAction(step, context) {
  const actionName = step.action;
  const action = actions[actionName];
  
  if (!action) {
    throw new Error(`Unknown action: "${actionName}". Available: ${Object.keys(actions).join(', ')}`);
  }

  // Resolve template variables in string params
  const resolvedParams = {};
  for (const [key, value] of Object.entries(step)) {
    if (key === 'action' || key === 'output' || key === 'condition') continue;
    
    if (typeof value === 'string') {
      // Replace {{variable}} references
      resolvedParams[key] = value.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const parts = path.trim().split('.');
        let resolved = context;
        for (const part of parts) {
          if (resolved === undefined || resolved === null) return match;
          resolved = resolved[part];
        }
        if (typeof resolved === 'object') return JSON.stringify(resolved);
        return String(resolved ?? match);
      });
    } else {
      resolvedParams[key] = value;
    }
  }

  return await action.execute(resolvedParams, context);
}

export default actions;

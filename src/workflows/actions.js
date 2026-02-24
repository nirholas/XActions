/**
 * XActions Workflow Actions
 * Wraps existing scrapers and automation functions as workflow steps
 * 
 * Each action follows a standard interface:
 *   execute(params, context) → result
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import scrapers from '../scrapers/index.js';

// ============================================================================
// Browser Pool (shared across action executions)
// ============================================================================

let _browser = null;
let _browserUseCount = 0;
const MAX_BROWSER_USES = 50; // Recycle browser after N uses

async function getBrowser() {
  if (!_browser || _browserUseCount >= MAX_BROWSER_USES) {
    if (_browser) {
      try { await _browser.close(); } catch {}
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
    try { await _browser.close(); } catch {}
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
  description: 'Summarize text using OpenRouter or local LLM',
  category: 'ai',
  params: {
    input: { type: 'string', required: true, description: 'Text to summarize (or context variable name)' },
    provider: { type: 'string', default: 'openrouter', description: 'LLM provider' },
    model: { type: 'string', default: 'meta-llama/llama-3.1-8b-instruct:free', description: 'Model ID' },
    prompt: { type: 'string', default: 'Summarize the following text concisely:', description: 'System prompt' },
  },
  async execute(params, context) {
    // Resolve input from context if it's a variable reference
    let text = context[params.input] ?? params.input;
    if (typeof text === 'object') text = JSON.stringify(text, null, 2);
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      // Fallback: simple extractive summary (no LLM)
      const sentences = String(text).split(/[.!?]+/).filter(s => s.trim().length > 20);
      return sentences.slice(0, 3).join('. ').trim() + '.';
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://xactions.app',
        'X-Title': 'XActions Workflow',
      },
      body: JSON.stringify({
        model: params.model || 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: params.prompt || 'Summarize the following text concisely:' },
          { role: 'user', content: String(text).slice(0, 4000) },
        ],
        max_tokens: 500,
      }),
    });

    const result = await response.json();
    return result.choices?.[0]?.message?.content || 'Summary unavailable';
  },
});

registerAction('generateText', {
  description: 'Generate text using OpenRouter or local LLM',
  category: 'ai',
  params: {
    prompt: { type: 'string', required: true, description: 'The prompt' },
    system: { type: 'string', default: 'You are a helpful assistant.', description: 'System prompt' },
    model: { type: 'string', default: 'meta-llama/llama-3.1-8b-instruct:free', description: 'Model ID' },
  },
  async execute(params, context) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return `[AI generation unavailable — set OPENROUTER_API_KEY] Prompt was: ${params.prompt}`;
    }

    // Template replacement in prompt
    let prompt = params.prompt;
    for (const [key, value] of Object.entries(context)) {
      const strVal = typeof value === 'string' ? value : JSON.stringify(value);
      prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), strVal);
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://xactions.app',
        'X-Title': 'XActions Workflow',
      },
      body: JSON.stringify({
        model: params.model || 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: params.system || 'You are a helpful assistant.' },
          { role: 'user', content: prompt.slice(0, 4000) },
        ],
        max_tokens: 500,
      }),
    });

    const result = await response.json();
    return result.choices?.[0]?.message?.content || '';
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

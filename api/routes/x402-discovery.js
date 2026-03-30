/**
 * x402 Discovery Routes
 * 
 * Serves OpenAPI 3.1.0 spec at /openapi.json and
 * /.well-known/x402 for x402scan discovery.
 * 
 * @see https://x402scan.com
 * @author nichxbt
 */

import express from 'express';
import { AI_OPERATION_PRICES } from '../config/x402-config.js';

const router = express.Router();

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse "$0.05" → "0.05"
 */
function parsePrice(priceStr) {
  return priceStr.replace('$', '');
}

/**
 * Map operation key (e.g. "scrape:profile") to HTTP route path
 */
function operationToRoute(operation) {
  const [category, action] = operation.split(':');
  return `/api/ai/${category}/${action}`;
}

/**
 * Build input schema for a given operation based on actual route handlers
 */
function getInputSchema(operation) {
  const schemas = {
    // Scraping
    'scrape:profile': {
      type: 'object',
      required: ['username'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string', description: 'Twitter username (without @)', example: 'elonmusk' },
      },
    },
    'scrape:followers': {
      type: 'object',
      required: ['username'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string', example: 'elonmusk' },
        limit: { type: 'integer', default: 100, minimum: 1, maximum: 1000 },
        cursor: { type: 'string', description: 'Pagination cursor' },
      },
    },
    'scrape:following': {
      type: 'object',
      required: ['username'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string', example: 'elonmusk' },
        limit: { type: 'integer', default: 100, minimum: 1, maximum: 1000 },
        cursor: { type: 'string', description: 'Pagination cursor' },
      },
    },
    'scrape:tweets': {
      type: 'object',
      required: ['username'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string', example: 'elonmusk' },
        limit: { type: 'integer', default: 100, minimum: 1, maximum: 500 },
        cursor: { type: 'string' },
      },
    },
    'scrape:thread': {
      type: 'object',
      required: ['tweetId'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        tweetId: { type: 'string', description: 'Tweet/post ID', example: '1234567890' },
        tweetUrl: { type: 'string', description: 'Full tweet URL (alternative to tweetId)' },
      },
    },
    'scrape:search': {
      type: 'object',
      required: ['query'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        query: { type: 'string', description: 'Search query', example: 'AI agents' },
        limit: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
      },
    },
    'scrape:hashtag': {
      type: 'object',
      required: ['hashtag'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        hashtag: { type: 'string', description: 'Hashtag (without #)', example: 'AI' },
        limit: { type: 'integer', default: 50 },
      },
    },
    'scrape:media': {
      type: 'object',
      required: ['username'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string', example: 'elonmusk' },
        limit: { type: 'integer', default: 50 },
      },
    },
    // Actions
    'action:unfollow-non-followers': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        maxUnfollows: { type: 'integer', default: 100, minimum: 1, maximum: 500 },
        dryRun: { type: 'boolean', default: false, description: 'Preview without unfollowing' },
        excludeUsernames: { type: 'array', items: { type: 'string' }, description: 'Usernames to keep' },
        excludeVerified: { type: 'boolean', default: false },
        delayMs: { type: 'integer', default: 2000, minimum: 1000 },
      },
    },
    'action:unfollow-everyone': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        maxUnfollows: { type: 'integer', default: 100, minimum: 1, maximum: 500 },
        dryRun: { type: 'boolean', default: false },
        excludeUsernames: { type: 'array', items: { type: 'string' } },
        delayMs: { type: 'integer', default: 2000, minimum: 1000 },
      },
    },
    'action:detect-unfollowers': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string', description: 'Username to check' },
      },
    },
    'action:auto-like': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        keywords: { type: 'array', items: { type: 'string' }, description: 'Keywords to match' },
        maxLikes: { type: 'integer', default: 50 },
        delayMs: { type: 'integer', default: 2000, minimum: 1000 },
      },
    },
    'action:follow-engagers': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        tweetId: { type: 'string', description: 'Tweet to find engagers from' },
        maxFollows: { type: 'integer', default: 50 },
        delayMs: { type: 'integer', default: 2000, minimum: 1000 },
      },
    },
    'action:keyword-follow': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        keywords: { type: 'array', items: { type: 'string' } },
        maxFollows: { type: 'integer', default: 50 },
        delayMs: { type: 'integer', default: 2000, minimum: 1000 },
      },
    },
    // Monitoring
    'monitor:account': {
      type: 'object',
      required: ['username'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string' },
        includeFollowers: { type: 'boolean', default: true },
        includeFollowing: { type: 'boolean', default: true },
        includeStats: { type: 'boolean', default: true },
      },
    },
    'monitor:followers': {
      type: 'object',
      required: ['username'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string' },
        compareWithPrevious: { type: 'boolean', default: true },
      },
    },
    'alert:new-followers': {
      type: 'object',
      required: ['username'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string' },
      },
    },
    // Utility
    'download:video': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        tweetUrl: { type: 'string', example: 'https://x.com/elonmusk/status/1234567890' },
        tweetId: { type: 'string', example: '1234567890' },
        quality: { type: 'string', enum: ['highest', 'lowest', 'all'], default: 'highest' },
      },
    },
    'export:bookmarks': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        format: { type: 'string', enum: ['json', 'csv'], default: 'json' },
        limit: { type: 'integer', default: 100 },
      },
    },
    'unroll:thread': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        tweetUrl: { type: 'string' },
        tweetId: { type: 'string' },
      },
    },
    // Profile
    'profile:get': {
      type: 'object',
      required: ['username'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string' },
      },
    },
    'profile:update': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        name: { type: 'string' },
        bio: { type: 'string' },
        location: { type: 'string' },
        website: { type: 'string' },
      },
    },
    // Posting
    'posting:tweet': {
      type: 'object',
    },
    'posting:thread': {
      type: 'object',
      required: ['tweets'],
    'posting:poll': {
      },
/**
 * x402 discovery router
 *
 * This route wrapper delegates to the canonical OpenAPI generators.
 * Keep discovery logic in api/openapi.js.
 */

import express from 'express';
import { generateSpec, generateWellKnown } from '../openapi.js';

const router = express.Router();

router.get('/openapi.json', (req, res) => {
  res.type('application/json').json(generateSpec());
});

router.get('/.well-known/x402', (req, res) => {
  res.type('application/json').json(generateWellKnown());
});

export default router;
    },
    'posting:schedule': {
      type: 'object',
      required: ['text', 'scheduledAt'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        text: { type: 'string' },
        scheduledAt: { type: 'string', format: 'date-time' },
      },
    },
    'posting:delete': {
      type: 'object',
      required: ['tweetId'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        tweetId: { type: 'string' },
      },
    },
    // Engagement
    'engagement:like': {
      type: 'object',
      required: ['tweetId'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        tweetId: { type: 'string' },
      },
    },
    'engagement:unlike': {
      type: 'object',
      required: ['tweetId'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        tweetId: { type: 'string' },
      },
    },
    'engagement:reply': {
      type: 'object',
      required: ['tweetId', 'text'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        tweetId: { type: 'string' },
        text: { type: 'string', maxLength: 280 },
      },
    },
    'engagement:bookmark': {
      type: 'object',
      required: ['tweetId'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        tweetId: { type: 'string' },
      },
    },
    'engagement:auto-like': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        keywords: { type: 'array', items: { type: 'string' } },
        maxLikes: { type: 'integer', default: 50 },
      },
    },
    'engagement:analytics': {
      type: 'object',
      required: ['username'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string' },
        period: { type: 'string', enum: ['7d', '30d', '90d'], default: '30d' },
      },
    },
    // Discovery
    'discovery:search': {
      type: 'object',
      required: ['query'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        query: { type: 'string' },
        limit: { type: 'integer', default: 50 },
      },
    },
    'discovery:trends': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        location: { type: 'string', description: 'WOEID or country name' },
      },
    },
    'discovery:explore': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        category: { type: 'string', enum: ['trending', 'news', 'sports', 'entertainment'] },
      },
    },
    // Notifications
    'notifications:get': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        limit: { type: 'integer', default: 50 },
      },
    },
    'notifications:mute': {
      type: 'object',
      required: ['username'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string' },
      },
    },
    'notifications:unmute': {
      type: 'object',
      required: ['username'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string' },
      },
    },
    // Messages
    'messages:send': {
      type: 'object',
      required: ['username', 'text'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string' },
        text: { type: 'string' },
      },
    },
    'messages:conversations': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        limit: { type: 'integer', default: 50 },
      },
    },
    'messages:export': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        format: { type: 'string', enum: ['json', 'csv'], default: 'json' },
      },
    },
    // Bookmarks
    'bookmarks:get': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        limit: { type: 'integer', default: 100 },
      },
    },
    'bookmarks:folder': {
      type: 'object',
      required: ['name'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        name: { type: 'string', description: 'Folder name' },
      },
    },
    'bookmarks:clear': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        confirm: { type: 'boolean', description: 'Must be true to confirm clearing' },
      },
    },
    // Creator
    'creator:analytics': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        period: { type: 'string', enum: ['7d', '30d', '90d'], default: '30d' },
      },
    },
    'creator:revenue': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
      },
    },
    'creator:subscribers': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        limit: { type: 'integer', default: 100 },
      },
    },
    // Spaces
    'spaces:live': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        limit: { type: 'integer', default: 20 },
      },
    },
    'spaces:scheduled': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        limit: { type: 'integer', default: 20 },
      },
    },
    'spaces:scrape': {
      type: 'object',
      required: ['spaceId'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        spaceId: { type: 'string', description: 'Space ID or URL' },
      },
    },
    // Settings
    'settings:get': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
      },
    },
    'settings:protected': {
      type: 'object',
      required: ['enabled'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        enabled: { type: 'boolean', description: 'Enable or disable protected tweets' },
      },
    },
    'settings:blocked': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        limit: { type: 'integer', default: 100 },
      },
    },
    'settings:muted': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        limit: { type: 'integer', default: 100 },
      },
    },
    'settings:download-data': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
      },
    },
    // Grok
    'grok:query': {
      type: 'object',
      required: ['prompt'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        prompt: { type: 'string', description: 'Question or prompt for Grok AI' },
      },
    },
    'grok:summarize': {
      type: 'object',
      required: ['topic'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        topic: { type: 'string', description: 'Topic to summarize' },
      },
    },
    // Business
    'business:brand-monitor': {
      type: 'object',
      required: ['brandName'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        brandName: { type: 'string' },
        keywords: { type: 'array', items: { type: 'string' } },
      },
    },
    'business:competitor': {
      type: 'object',
      required: ['competitorUsername'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        competitorUsername: { type: 'string' },
      },
    },
    // Premium
    'premium:check': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        username: { type: 'string' },
      },
    },
    // Articles
    'article:publish': {
      type: 'object',
      required: ['title', 'content'],
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        title: { type: 'string' },
        content: { type: 'string', description: 'Article body (markdown supported)' },
      },
    },
    'article:analytics': {
      type: 'object',
      properties: {
        sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
        articleId: { type: 'string' },
      },
    },
  };

  return schemas[operation] || {
    type: 'object',
    properties: {
      sessionCookie: { type: 'string', description: 'X/Twitter auth_token cookie' },
    },
  };
}

/**
 * Human-readable description for each operation
 */
function getOperationDescription(operation) {
  const descriptions = {
    'scrape:profile': 'Get profile information (bio, stats, avatar) for a Twitter user',
    'scrape:followers': 'List followers for a Twitter user with pagination',
    'scrape:following': 'List accounts a Twitter user follows with pagination',
    'scrape:tweets': 'Get recent tweet history for a user',
    'scrape:thread': 'Get a full thread/conversation by tweet ID',
    'scrape:search': 'Search for tweets matching a query',
    'scrape:hashtag': 'Get tweets for a specific hashtag',
    'scrape:media': 'Get media (images/videos) from a user profile',
    'action:unfollow-non-followers': 'Unfollow accounts that do not follow you back',
    'action:unfollow-everyone': 'Unfollow all accounts (with optional exclusion list)',
    'action:detect-unfollowers': 'Detect who recently unfollowed you',
    'action:auto-like': 'Automatically like tweets matching keywords',
    'action:follow-engagers': 'Follow users who engaged with a specific tweet',
    'action:keyword-follow': 'Follow users posting about specific keywords',
    'monitor:account': 'Create a snapshot of account stats for change tracking',
    'monitor:followers': 'Monitor follower changes over time',
    'alert:new-followers': 'Get alerts for new followers since last check',
    'download:video': 'Download video from a tweet (returns temporary URLs)',
    'export:bookmarks': 'Export your bookmarked tweets',
    'unroll:thread': 'Unroll a Twitter thread into plain text',
    'profile:get': 'Get profile information for a user',
    'profile:update': 'Update your profile (name, bio, location, website)',
    'posting:tweet': 'Post a new tweet',
    'posting:thread': 'Post a thread (multiple connected tweets)',
    'posting:poll': 'Create a poll tweet',
    'posting:schedule': 'Schedule a tweet for future posting',
    'posting:delete': 'Delete a tweet by ID',
    'engagement:like': 'Like a tweet',
    'engagement:unlike': 'Unlike a tweet',
    'engagement:reply': 'Reply to a tweet',
    'engagement:bookmark': 'Bookmark a tweet',
    'engagement:auto-like': 'Auto-like tweets by keywords',
    'engagement:analytics': 'Get engagement analytics for a user',
    'discovery:search': 'Search for tweets',
    'discovery:trends': 'Get trending topics',
    'discovery:explore': 'Browse explore feed',
    'notifications:get': 'Get your notifications',
    'notifications:mute': 'Mute a user',
    'notifications:unmute': 'Unmute a user',
    'messages:send': 'Send a direct message',
    'messages:conversations': 'List DM conversations',
    'messages:export': 'Export DM history',
    'bookmarks:get': 'Get your bookmarks',
    'bookmarks:folder': 'Create a bookmark folder',
    'bookmarks:clear': 'Clear all bookmarks',
    'creator:analytics': 'Get creator analytics (impressions, engagement)',
    'creator:revenue': 'Get creator revenue information',
    'creator:subscribers': 'List your subscribers',
    'spaces:live': 'Get currently live Spaces',
    'spaces:scheduled': 'Get upcoming scheduled Spaces',
    'spaces:scrape': 'Scrape a Space for details and participants',
    'settings:get': 'Get account settings',
    'settings:protected': 'Toggle protected tweets mode',
    'settings:blocked': 'Get list of blocked accounts',
    'settings:muted': 'Get list of muted accounts',
    'settings:download-data': 'Request data download archive',
    'grok:query': 'Query Grok AI with a prompt',
    'grok:summarize': 'Use Grok AI to summarize a topic',
    'business:brand-monitor': 'Monitor brand mentions and sentiment',
    'business:competitor': 'Analyze a competitor account',
    'premium:check': 'Check if a user has Twitter Premium',
    'article:publish': 'Publish a long-form article',
    'article:analytics': 'Get analytics for an article',
  };
  return descriptions[operation] || `AI Agent operation: ${operation}`;
}

/**
 * Get category tag from operation key
 */
function getTag(operation) {
  const category = operation.split(':')[0];
  const tagMap = {
    scrape: 'Scraping',
    action: 'Actions',
    monitor: 'Monitoring',
    alert: 'Monitoring',
    download: 'Utility',
    export: 'Utility',
    unroll: 'Utility',
    profile: 'Profile',
    posting: 'Posting',
    engagement: 'Engagement',
    discovery: 'Discovery',
    notifications: 'Notifications',
    messages: 'Messages',
    bookmarks: 'Bookmarks',
    creator: 'Creator',
    spaces: 'Spaces',
    settings: 'Settings',
    grok: 'Grok AI',
    business: 'Business',
    premium: 'Premium',
    article: 'Articles',
  };
  return tagMap[category] || 'Other';
}

// ============================================================================
// OpenAPI spec builder
// ============================================================================

function buildOpenAPISpec() {
  const paths = {};

  for (const [operation, priceStr] of Object.entries(AI_OPERATION_PRICES)) {
    const routePath = operationToRoute(operation);
    const price = parsePrice(priceStr);
    const schema = getInputSchema(operation);
    const description = getOperationDescription(operation);
    const tag = getTag(operation);
    const operationId = operation.replace(':', '_');

    paths[routePath] = {
      post: {
        operationId,
        summary: description,
        tags: [tag],
        'x-payment-info': {
          protocols: ['x402'],
          pricingMode: 'fixed',
          price,
        },
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema,
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful operation',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'object' },
                    meta: { type: 'object' },
                  },
                },
              },
            },
          },
          '402': {
            description: 'Payment Required — sign a USDC payment via x402 and retry with X-PAYMENT header',
          },
          '400': {
            description: 'Invalid input parameters',
          },
          '429': {
            description: 'Rate limited by X/Twitter',
          },
        },
      },
    };
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'XActions AI API',
      version: '1.0.0',
      description: 'X/Twitter automation API for AI agents. Pay-per-request via x402 micropayments in USDC. All endpoints require an X-PAYMENT header with a signed USDC payment (obtained by responding to a 402 challenge). A session cookie (X-Session-Cookie header or sessionCookie body field) is also required for Twitter access.',
      contact: {
        name: 'nichxbt',
        url: 'https://github.com/nirholas/XActions',
      },
      license: {
        name: 'MIT',
        url: 'https://github.com/nirholas/XActions/blob/main/LICENSE',
      },
      'x-guidance': [
        '# XActions AI API — Agent Guide',
        '',
        '## Overview',
        'XActions provides 68+ X/Twitter automation endpoints for AI agents. Every endpoint is pay-per-request via the x402 protocol (USDC on Base).',
        '',
        '## Authentication',
        '1. **x402 Payment**: All /api/ai/* endpoints return 402 Payment Required. Sign the USDC payment with your wallet and retry with the X-PAYMENT header.',
        '2. **Session Cookie**: Most endpoints require a valid X/Twitter auth_token cookie. Pass it as `sessionCookie` in the request body or as the `X-Session-Cookie` header.',
        '',
        '## Typical workflow',
        '1. POST to the desired endpoint (e.g., POST /api/ai/scrape/profile).',
        '2. Receive a 402 response with payment details (amount, network, payTo address).',
        '3. Sign the payment with your wallet (USDC on Base).',
        '4. Retry the same request with the X-PAYMENT header containing the signed payment.',
        '5. Receive the 200 response with the result.',
        '',
        '## Categories',
        '- **Scraping**: Extract profiles, followers, tweets, threads, search results, media',
        '- **Actions**: Unfollow management, auto-like, follow engagers, keyword follow',
        '- **Monitoring**: Track account changes, follower movements, alerts',
        '- **Utility**: Video download, bookmark export, thread unroll',
        '- **Posting**: Tweets, threads, polls, scheduled posts',
        '- **Engagement**: Like, reply, bookmark, analytics',
        '- **Discovery**: Search, trends, explore',
        '- **Messages**: Send DMs, list conversations, export',
        '- **Bookmarks**: Get, organize, clear',
        '- **Creator**: Analytics, revenue, subscribers',
        '- **Spaces**: Live, scheduled, scrape',
        '- **Settings**: Account settings, blocked/muted lists',
        '- **Grok AI**: Query and summarize with Grok',
        '- **Business**: Brand monitoring, competitor analysis',
        '- **Articles**: Publish and analyze long-form content',
        '',
        '## Networks',
        'Payments accepted on Base (recommended, low gas), Base Sepolia (testnet), Ethereum, and Arbitrum One. All payments in USDC.',
        '',
        '## Rate Limits',
        '60 requests/minute, 5 concurrent operations, 10 burst allowance. X/Twitter enforces its own rate limits; expect 1-3s delays between automation actions.',
        '',
        '## Free alternatives',
        '- Browser scripts: https://xactions.app/features',
        '- CLI: npm install -g xactions',
        '- Node.js library: npm install xactions',
      ].join('\n'),
    },
    servers: [
      {
        url: 'https://xactions.app',
        description: 'Production',
      },
      {
        url: 'https://web-production-2eb69.up.railway.app',
        description: 'Railway deployment',
      },
    ],
    paths,
    components: {
      securitySchemes: {
        x402Payment: {
          type: 'apiKey',
          in: 'header',
          name: 'X-PAYMENT',
          description: 'Signed x402 USDC payment token. Obtained by responding to a 402 challenge.',
        },
        sessionCookie: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Session-Cookie',
          description: 'X/Twitter auth_token cookie for browser automation.',
        },
      },
    },
    security: [
      { x402Payment: [] },
      { sessionCookie: [] },
    ],
    tags: [
      { name: 'Scraping', description: 'Extract data from X/Twitter profiles and content' },
      { name: 'Actions', description: 'Automation actions that modify account state' },
      { name: 'Monitoring', description: 'Track account and follower changes over time' },
      { name: 'Utility', description: 'Video download, bookmark export, thread unroll' },
      { name: 'Profile', description: 'Get and update profile information' },
      { name: 'Posting', description: 'Post tweets, threads, polls, and scheduled content' },
      { name: 'Engagement', description: 'Like, reply, bookmark, and engagement analytics' },
      { name: 'Discovery', description: 'Search, trends, and explore' },
      { name: 'Notifications', description: 'Notification management and muting' },
      { name: 'Messages', description: 'Direct message operations' },
      { name: 'Bookmarks', description: 'Bookmark management' },
      { name: 'Creator', description: 'Creator analytics and monetization' },
      { name: 'Spaces', description: 'Twitter Spaces discovery and scraping' },
      { name: 'Settings', description: 'Account settings, blocked and muted lists' },
      { name: 'Grok AI', description: 'Grok AI queries and summarization' },
      { name: 'Business', description: 'Brand monitoring and competitor analysis' },
      { name: 'Premium', description: 'Premium/subscription status' },
      { name: 'Articles', description: 'Long-form article publishing and analytics' },
    ],
  };
}

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /openapi.json — OpenAPI 3.1.0 discovery document
 */
router.get('/openapi.json', (req, res) => {
  const spec = buildOpenAPISpec();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json(spec);
});

/**
 * GET /.well-known/x402 — x402 discovery fallback
 */
router.get('/.well-known/x402', (req, res) => {
  const resources = Object.keys(AI_OPERATION_PRICES).map(operation => {
    const routePath = operationToRoute(operation);
    return `POST ${routePath}`;
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.json({
    version: 1,
    resources,
  });
});

export default router;

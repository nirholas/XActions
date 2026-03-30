// Copyright (c) 2024-2026 nich (@nichxbt). Business Source License 1.1.
/**
 * OpenAPI 3.1 Specification for XActions AI API
 *
 * Serves /openapi.json for x402scan automatic resource discovery.
 * Includes x402 payment extensions so scanners can display pricing,
 * network info, and facilitator details for each endpoint.
 *
 * @see https://x402.org
 * @author nichxbt
 */

import {
  PAY_TO_ADDRESS,
  FACILITATOR_URL,
  NETWORK,
  AI_OPERATION_PRICES,
  getAcceptedNetworks,
  getAcceptedTokens,
  isX402Configured,
} from './config/x402-config.js';

/**
 * Build the x-payment-info extension for an operation.
 * Conforms to x402scan discovery spec.
 */
function paymentInfo(operation) {
  const price = AI_OPERATION_PRICES[operation];
  if (!price) return undefined;

  const productionNetworks = getAcceptedNetworks(false);
  const testnetNetworks = getAcceptedNetworks(true).filter((n) => n.testnet);

  return {
    protocols: ['x402'],
    pricingMode: 'fixed',
    price: price.replace('$', ''),
    currency: 'USDC',
    network: NETWORK,
    payTo: PAY_TO_ADDRESS,
    facilitator: FACILITATOR_URL,
    acceptedChains: productionNetworks.map((n) => n.network),
    acceptedTestnets: testnetNetworks.map((n) => n.network),
    acceptedTokens: ['USDC', 'USDT', 'DAI', 'WETH'],
  };
}

/**
 * Build the x-bazaar extension for an operation.
 * Provides explicit input/output schemas for agent discovery tools.
 */
function bazaarExt(inputSchema, outputRef = '#/components/schemas/SuccessResponse') {
  return {
    schema: {
      properties: {
        input: inputSchema,
        output: { $ref: outputRef },
      },
    },
  };
}

/**
 * Helper — standard error schema ref
 */
const errorRef = { $ref: '#/components/schemas/Error' };

/**
 * Helper — 402 response
 */
const payment402 = {
  description: 'Payment Required — sign a USDC payment and retry with X-PAYMENT header',
  content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentRequired' } } },
};

/**
 * Helper — standard 200 success response with schema
 */
function ok200(description) {
  return {
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/SuccessResponse' } } },
  };
}

/**
 * Helper — async operation 200 response
 */
function ok200Async(description) {
  return {
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/AsyncOperationResponse' } } },
  };
}

/**
 * Helper — session body property
 */
const sessionProp = {
  sessionCookie: {
    type: 'string',
    description: 'X/Twitter auth_token cookie value',
  },
};

// ── Per-operation input schemas (shared between requestBody and x-bazaar) ──────

const S = {
  scrapeProfile: {
    type: 'object',
    required: ['username'],
    properties: {
      ...sessionProp,
      username: { type: 'string', example: 'elonmusk' },
    },
  },
  scrapeFollowers: {
    type: 'object',
    required: ['username'],
    properties: {
      ...sessionProp,
      username: { type: 'string', example: 'elonmusk' },
      limit: { type: 'integer', default: 100, maximum: 1000 },
    },
  },
  scrapeFollowing: {
    type: 'object',
    required: ['username'],
    properties: {
      ...sessionProp,
      username: { type: 'string', example: 'elonmusk' },
      limit: { type: 'integer', default: 100, maximum: 1000 },
    },
  },
  scrapeTweets: {
    type: 'object',
    required: ['username'],
    properties: {
      ...sessionProp,
      username: { type: 'string', example: 'elonmusk' },
      limit: { type: 'integer', default: 50, maximum: 200 },
    },
  },
  scrapeThread: {
    type: 'object',
    required: ['tweetId'],
    properties: {
      ...sessionProp,
      tweetId: { type: 'string', example: '1234567890' },
      tweetUrl: { type: 'string' },
    },
  },
  scrapeSearch: {
    type: 'object',
    required: ['query'],
    properties: {
      ...sessionProp,
      query: { type: 'string', example: 'bitcoin' },
      limit: { type: 'integer', default: 50 },
    },
  },
  scrapeHashtag: {
    type: 'object',
    required: ['hashtag'],
    properties: {
      ...sessionProp,
      hashtag: { type: 'string', example: 'AI' },
      limit: { type: 'integer', default: 50 },
    },
  },
  scrapeMedia: {
    type: 'object',
    required: ['username'],
    properties: {
      ...sessionProp,
      username: { type: 'string', example: 'elonmusk' },
      limit: { type: 'integer', default: 50 },
    },
  },
  actionUnfollowNonFollowers: {
    type: 'object',
    properties: {
      ...sessionProp,
      maxUnfollows: { type: 'integer', default: 100, maximum: 500 },
      dryRun: { type: 'boolean', default: false },
      excludeUsernames: { type: 'array', items: { type: 'string' } },
      excludeVerified: { type: 'boolean', default: false },
      delayMs: { type: 'integer', default: 2000, minimum: 1000 },
    },
  },
  actionUnfollowEveryone: {
    type: 'object',
    properties: {
      ...sessionProp,
      dryRun: { type: 'boolean', default: false },
      delayMs: { type: 'integer', default: 2000, minimum: 1000 },
    },
  },
  actionDetectUnfollowers: {
    type: 'object',
    properties: {
      ...sessionProp,
      username: { type: 'string' },
    },
  },
  actionAutoLike: {
    type: 'object',
    required: ['keywords'],
    properties: {
      ...sessionProp,
      keywords: { type: 'array', items: { type: 'string' } },
      limit: { type: 'integer', default: 50 },
    },
  },
  actionFollowEngagers: {
    type: 'object',
    required: ['tweetId'],
    properties: {
      ...sessionProp,
      tweetId: { type: 'string' },
      limit: { type: 'integer', default: 50 },
    },
  },
  actionKeywordFollow: {
    type: 'object',
    required: ['keyword'],
    properties: {
      ...sessionProp,
      keyword: { type: 'string' },
      limit: { type: 'integer', default: 50 },
    },
  },
  monitorAccount: {
    type: 'object',
    required: ['username'],
    properties: {
      ...sessionProp,
      username: { type: 'string' },
      includeFollowers: { type: 'boolean', default: true },
      includeFollowing: { type: 'boolean', default: true },
      includeStats: { type: 'boolean', default: true },
    },
  },
  monitorFollowers: {
    type: 'object',
    required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  alertNewFollowers: {
    type: 'object',
    required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  downloadVideo: {
    type: 'object',
    properties: {
      ...sessionProp,
      tweetUrl: { type: 'string', example: 'https://x.com/elonmusk/status/1234567890' },
      tweetId: { type: 'string' },
      quality: { type: 'string', enum: ['highest', 'lowest', 'all'], default: 'highest' },
    },
  },
  exportBookmarks: {
    type: 'object',
    properties: {
      ...sessionProp,
      format: { type: 'string', enum: ['json', 'csv'], default: 'json' },
    },
  },
  unrollThread: {
    type: 'object',
    properties: {
      ...sessionProp,
      tweetUrl: { type: 'string' },
      tweetId: { type: 'string' },
    },
  },
  writerAnalyzeVoice: {
    type: 'object',
    required: ['username', 'authToken'],
    properties: {
      username: { type: 'string' },
      authToken: { type: 'string', description: 'X/Twitter auth_token cookie' },
      tweetLimit: { type: 'integer', default: 200 },
    },
  },
  writerGenerate: {
    type: 'object',
    required: ['username', 'topic'],
    properties: {
      username: { type: 'string' },
      topic: { type: 'string' },
      count: { type: 'integer', default: 5 },
      style: { type: 'string', enum: ['casual', 'professional', 'provocative', 'educational'] },
    },
  },
  writerRewrite: {
    type: 'object',
    required: ['tweet'],
    properties: {
      tweet: { type: 'string' },
      goal: { type: 'string', enum: ['engagement', 'clarity', 'humor', 'professionalism'] },
      voiceUsername: { type: 'string' },
    },
  },
  writerCalendar: {
    type: 'object',
    required: ['username'],
    properties: {
      username: { type: 'string' },
      niche: { type: 'string' },
      tweetsPerDay: { type: 'integer', default: 3 },
    },
  },
  writerReply: {
    type: 'object',
    required: ['tweetText'],
    properties: {
      tweetText: { type: 'string' },
      tweetUrl: { type: 'string' },
      voiceUsername: { type: 'string' },
      tone: { type: 'string' },
    },
  },
};

/**
 * Generate the full OpenAPI spec object.
 */
export function generateSpec() {
  const configured = isX402Configured();
  const networks = getAcceptedNetworks(true);
  const tokens = getAcceptedTokens(true);

  return {
    openapi: '3.1.0',
    info: {
      title: 'XActions AI API',
      version: '1.0.0',
      description:
        'X/Twitter automation API for AI agents. Pay-per-request via x402 protocol (USDC on Base). ' +
        'Scrape profiles, automate actions, monitor followers, download media, and generate content.',
      'x-guidance': `XActions is a pay-per-request X/Twitter automation API designed for AI agents.

How to use this API:
1. All paid endpoints are under /api/ai/ and accept POST requests with JSON bodies.
2. Most endpoints require a sessionCookie field — set the user's X/Twitter auth_token cookie value in the request body or X-Session-Cookie header.
3. Payment is handled via the x402 protocol: send a request without payment to receive a 402 response with payment requirements, sign a USDC payment, then retry with the X-PAYMENT header.
4. Payments settle in USDC on Base (chain ID 8453). Base Sepolia (84532) is supported for testing.
5. Free info endpoints: GET /api/ai/ (docs), GET /api/ai/health (status), GET /api/ai/pricing (rates).

Categories:
- scrape: Extract data from X/Twitter (profiles, followers, tweets, hashtags, media)
- action: Automate account actions (unfollow, like, follow, detect unfollowers)
- monitor: Track account changes, follower diffs, snapshots over time
- download/export/unroll: Utility operations (videos, bookmarks, threads)
- writer: AI-powered content generation (voice analysis, tweet generation, calendars)

Free alternatives: Browser scripts, CLI, and Node.js library at https://xactions.app are 100% free. This paid API is for remote AI agent access only.`,
      contact: {
        name: 'nichxbt',
        url: 'https://github.com/nirholas/XActions',
      },
      license: {
        name: 'MIT',
        url: 'https://github.com/nirholas/XActions/blob/main/LICENSE',
      },
      'x-logo': {
        url: 'https://xactions.app/icons/icon-512.png',
      },
    },

    servers: [
      { url: 'https://xactions.app', description: 'Production' },
    ],

    // ── x402 top-level extension ──────────────────────────────────
    'x-x402': {
      enabled: configured,
      version: 2,
      facilitator: FACILITATOR_URL,
      payTo: PAY_TO_ADDRESS,
      acceptedTokens: tokens,
      networks: networks.map((n) => ({
        network: n.network,
        name: n.name,
        usdc: n.usdc,
        tokens: n.tokens,
        recommended: n.recommended || false,
        testnet: n.testnet || false,
      })),
      defaultNetwork: NETWORK,
    },

    // ── Security ──────────────────────────────────────────────────
    components: {
      securitySchemes: {
        x402Payment: {
          type: 'apiKey',
          in: 'header',
          name: 'X-PAYMENT',
          description: 'Signed USDC payment payload per x402 protocol',
        },
        sessionCookie: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Session-Cookie',
          description: 'X/Twitter auth_token cookie for browser automation',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
            message: { type: 'string' },
            retryable: { type: 'boolean' },
            retryAfterMs: { type: 'integer' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        PaymentRequired: {
          type: 'object',
          properties: {
            x402Version: { type: 'integer', example: 2 },
            accepts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  scheme: { type: 'string', example: 'exact' },
                  network: { type: 'string', example: 'eip155:8453' },
                  maxAmountRequired: { type: 'string', example: '$0.001' },
                  resource: { type: 'string' },
                  payTo: { type: 'string' },
                },
              },
            },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                scrapedAt: { type: 'string', format: 'date-time' },
                source: { type: 'string', example: 'x.com' },
              },
            },
          },
        },
        AsyncOperationResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            operationId: { type: 'string' },
            status: { type: 'string', example: 'queued' },
            statusUrl: { type: 'string' },
          },
        },
      },
    },

    security: [{ x402Payment: [] }],

    // ── Paths ──────────────────────────────────────────────────────
    paths: {
      // ─── Scraping ────────────────────────────────────────────────
      '/api/ai/scrape/profile': {
        post: {
          tags: ['Scraping'],
          summary: 'Get profile information',
          'x-payment-info': paymentInfo('scrape:profile'),
          'x-bazaar': bazaarExt(S.scrapeProfile),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.scrapeProfile } },
          },
          responses: {
            200: ok200('Profile data'),
            402: payment402,
            400: { description: 'Missing parameters', content: { 'application/json': { schema: errorRef } } },
          },
        },
      },
      '/api/ai/scrape/followers': {
        post: {
          tags: ['Scraping'],
          summary: 'List followers (up to 1 000)',
          'x-payment-info': paymentInfo('scrape:followers'),
          'x-bazaar': bazaarExt(S.scrapeFollowers),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.scrapeFollowers } },
          },
          responses: { 200: ok200('Follower list'), 402: payment402 },
        },
      },
      '/api/ai/scrape/following': {
        post: {
          tags: ['Scraping'],
          summary: 'List following (up to 1 000)',
          'x-payment-info': paymentInfo('scrape:following'),
          'x-bazaar': bazaarExt(S.scrapeFollowing),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.scrapeFollowing } },
          },
          responses: { 200: ok200('Following list'), 402: payment402 },
        },
      },
      '/api/ai/scrape/tweets': {
        post: {
          tags: ['Scraping'],
          summary: 'Get tweet history',
          'x-payment-info': paymentInfo('scrape:tweets'),
          'x-bazaar': bazaarExt(S.scrapeTweets),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.scrapeTweets } },
          },
          responses: { 200: ok200('Tweet list'), 402: payment402 },
        },
      },
      '/api/ai/scrape/thread': {
        post: {
          tags: ['Scraping'],
          summary: 'Get thread / conversation',
          'x-payment-info': paymentInfo('scrape:thread'),
          'x-bazaar': bazaarExt(S.scrapeThread),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.scrapeThread } },
          },
          responses: { 200: ok200('Thread data'), 402: payment402 },
        },
      },
      '/api/ai/scrape/search': {
        post: {
          tags: ['Scraping'],
          summary: 'Search tweets',
          'x-payment-info': paymentInfo('scrape:search'),
          'x-bazaar': bazaarExt(S.scrapeSearch),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.scrapeSearch } },
          },
          responses: { 200: ok200('Search results'), 402: payment402 },
        },
      },
      '/api/ai/scrape/hashtag': {
        post: {
          tags: ['Scraping'],
          summary: 'Get tweets for a hashtag',
          'x-payment-info': paymentInfo('scrape:hashtag'),
          'x-bazaar': bazaarExt(S.scrapeHashtag),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.scrapeHashtag } },
          },
          responses: { 200: ok200('Hashtag tweets'), 402: payment402 },
        },
      },
      '/api/ai/scrape/media': {
        post: {
          tags: ['Scraping'],
          summary: 'Get media from a profile',
          'x-payment-info': paymentInfo('scrape:media'),
          'x-bazaar': bazaarExt(S.scrapeMedia),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.scrapeMedia } },
          },
          responses: { 200: ok200('Media list'), 402: payment402 },
        },
      },

      // ─── Actions ─────────────────────────────────────────────────
      '/api/ai/action/unfollow-non-followers': {
        post: {
          tags: ['Actions'],
          summary: 'Unfollow accounts that don\'t follow back',
          'x-payment-info': paymentInfo('action:unfollow-non-followers'),
          'x-bazaar': bazaarExt(S.actionUnfollowNonFollowers, '#/components/schemas/AsyncOperationResponse'),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.actionUnfollowNonFollowers } },
          },
          responses: {
            200: ok200Async('Operation queued'),
            402: payment402,
          },
        },
      },
      '/api/ai/action/unfollow-everyone': {
        post: {
          tags: ['Actions'],
          summary: 'Unfollow all accounts',
          'x-payment-info': paymentInfo('action:unfollow-everyone'),
          'x-bazaar': bazaarExt(S.actionUnfollowEveryone),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.actionUnfollowEveryone } },
          },
          responses: { 200: ok200('Operation queued'), 402: payment402 },
        },
      },
      '/api/ai/action/detect-unfollowers': {
        post: {
          tags: ['Actions'],
          summary: 'Detect who unfollowed you',
          'x-payment-info': paymentInfo('action:detect-unfollowers'),
          'x-bazaar': bazaarExt(S.actionDetectUnfollowers),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.actionDetectUnfollowers } },
          },
          responses: { 200: ok200('Unfollower list'), 402: payment402 },
        },
      },
      '/api/ai/action/auto-like': {
        post: {
          tags: ['Actions'],
          summary: 'Auto-like tweets by keyword',
          'x-payment-info': paymentInfo('action:auto-like'),
          'x-bazaar': bazaarExt(S.actionAutoLike),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.actionAutoLike } },
          },
          responses: { 200: ok200('Operation queued'), 402: payment402 },
        },
      },
      '/api/ai/action/follow-engagers': {
        post: {
          tags: ['Actions'],
          summary: 'Follow users who engaged with a tweet',
          'x-payment-info': paymentInfo('action:follow-engagers'),
          'x-bazaar': bazaarExt(S.actionFollowEngagers),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.actionFollowEngagers } },
          },
          responses: { 200: ok200('Operation queued'), 402: payment402 },
        },
      },
      '/api/ai/action/keyword-follow': {
        post: {
          tags: ['Actions'],
          summary: 'Follow users tweeting about a keyword',
          'x-payment-info': paymentInfo('action:keyword-follow'),
          'x-bazaar': bazaarExt(S.actionKeywordFollow),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.actionKeywordFollow } },
          },
          responses: { 200: ok200('Operation queued'), 402: payment402 },
        },
      },

      // ─── Monitoring ──────────────────────────────────────────────
      '/api/ai/monitor/account': {
        post: {
          tags: ['Monitoring'],
          summary: 'Monitor account changes',
          'x-payment-info': paymentInfo('monitor:account'),
          'x-bazaar': bazaarExt(S.monitorAccount),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.monitorAccount } },
          },
          responses: { 200: ok200('Snapshot queued'), 402: payment402 },
        },
      },
      '/api/ai/monitor/followers': {
        post: {
          tags: ['Monitoring'],
          summary: 'Monitor follower changes',
          'x-payment-info': paymentInfo('monitor:followers'),
          'x-bazaar': bazaarExt(S.monitorFollowers),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.monitorFollowers } },
          },
          responses: { 200: ok200('Follower diff'), 402: payment402 },
        },
      },
      '/api/ai/alert/new-followers': {
        post: {
          tags: ['Monitoring'],
          summary: 'Get new follower alerts',
          'x-payment-info': paymentInfo('alert:new-followers'),
          'x-bazaar': bazaarExt(S.alertNewFollowers),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.alertNewFollowers } },
          },
          responses: { 200: ok200('New followers'), 402: payment402 },
        },
      },

      // ─── Utility ─────────────────────────────────────────────────
      '/api/ai/download/video': {
        post: {
          tags: ['Utility'],
          summary: 'Download video from a tweet',
          'x-payment-info': paymentInfo('download:video'),
          'x-bazaar': bazaarExt(S.downloadVideo),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.downloadVideo } },
          },
          responses: { 200: ok200('Video URLs'), 402: payment402 },
        },
      },
      '/api/ai/export/bookmarks': {
        post: {
          tags: ['Utility'],
          summary: 'Export bookmarks',
          'x-payment-info': paymentInfo('export:bookmarks'),
          'x-bazaar': bazaarExt(S.exportBookmarks),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.exportBookmarks } },
          },
          responses: { 200: ok200('Bookmarks data'), 402: payment402 },
        },
      },
      '/api/ai/unroll/thread': {
        post: {
          tags: ['Utility'],
          summary: 'Unroll thread to plain text',
          'x-payment-info': paymentInfo('unroll:thread'),
          'x-bazaar': bazaarExt(S.unrollThread),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.unrollThread } },
          },
          responses: { 200: ok200('Unrolled thread'), 402: payment402 },
        },
      },

      // ─── Writer ──────────────────────────────────────────────────
      '/api/ai/writer/analyze-voice': {
        post: {
          tags: ['Writer'],
          summary: 'Analyze a user\'s writing voice from tweets',
          'x-payment-info': paymentInfo('writer:analyze-voice'),
          'x-bazaar': bazaarExt(S.writerAnalyzeVoice),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.writerAnalyzeVoice } },
          },
          responses: { 200: ok200('Voice profile analysis'), 402: payment402 },
        },
      },
      '/api/ai/writer/generate': {
        post: {
          tags: ['Writer'],
          summary: 'Generate tweets in a user\'s voice',
          'x-payment-info': paymentInfo('writer:generate'),
          'x-bazaar': bazaarExt(S.writerGenerate),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.writerGenerate } },
          },
          responses: { 200: ok200('Generated tweets'), 402: payment402 },
        },
      },
      '/api/ai/writer/rewrite': {
        post: {
          tags: ['Writer'],
          summary: 'Rewrite / improve an existing tweet',
          'x-payment-info': paymentInfo('writer:rewrite'),
          'x-bazaar': bazaarExt(S.writerRewrite),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.writerRewrite } },
          },
          responses: { 200: ok200('Rewritten tweet'), 402: payment402 },
        },
      },
      '/api/ai/writer/calendar': {
        post: {
          tags: ['Writer'],
          summary: 'Generate weekly content calendar',
          'x-payment-info': paymentInfo('writer:calendar'),
          'x-bazaar': bazaarExt(S.writerCalendar),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.writerCalendar } },
          },
          responses: { 200: ok200('Content calendar'), 402: payment402 },
        },
      },
      '/api/ai/writer/reply': {
        post: {
          tags: ['Writer'],
          summary: 'Generate a reply to a tweet',
          'x-payment-info': paymentInfo('writer:reply'),
          'x-bazaar': bazaarExt(S.writerReply),
          requestBody: {
            required: true,
            content: { 'application/json': { schema: S.writerReply } },
          },
          responses: { 200: ok200('Generated reply'), 402: payment402 },
        },
      },
    },

    tags: [
      { name: 'Scraping', description: 'Structured data extraction from X/Twitter' },
      { name: 'Actions', description: 'Account automation (unfollow, like, follow)' },
      { name: 'Monitoring', description: 'Track account & follower changes over time' },
      { name: 'Utility', description: 'Video download, bookmark export, thread unroll' },
      { name: 'Writer', description: 'AI-powered tweet generation & voice analysis' },
    ],
  };
}

/**
 * Generate /.well-known/x402 response.
 * Lists all payable resources as "METHOD /path" entries per x402scan spec.
 */
/**
 * Complete list of all paid resources across all AI route modules.
 * Kept in sync with api/routes/ai/*.js route definitions.
 */
const ALL_PAID_RESOURCES = [
  // ── Scraping ──────────────────────────────────────────────────────
  'POST /api/ai/scrape/profile',
  'POST /api/ai/scrape/followers',
  'POST /api/ai/scrape/following',
  'POST /api/ai/scrape/tweets',
  'POST /api/ai/scrape/search',
  'POST /api/ai/scrape/thread',
  'POST /api/ai/scrape/hashtag',
  'POST /api/ai/scrape/media',
  'POST /api/ai/scrape/likes',
  'POST /api/ai/scrape/retweets',
  'POST /api/ai/scrape/replies',
  'POST /api/ai/scrape/quote-tweets',
  'POST /api/ai/scrape/user-likes',
  'POST /api/ai/scrape/mentions',
  'POST /api/ai/scrape/recommendations',

  // ── Actions ───────────────────────────────────────────────────────
  'POST /api/ai/action/unfollow-non-followers',
  'POST /api/ai/action/unfollow-everyone',
  'POST /api/ai/action/detect-unfollowers',
  'POST /api/ai/action/auto-like',
  'POST /api/ai/action/follow-engagers',
  'POST /api/ai/action/keyword-follow',
  'POST /api/ai/action/auto-comment',
  'POST /api/ai/action/follow',
  'POST /api/ai/action/unfollow',
  'POST /api/ai/action/like',
  'POST /api/ai/action/retweet',
  'POST /api/ai/action/quote-tweet',
  'POST /api/ai/action/post-tweet',
  'POST /api/ai/action/auto-follow',
  'POST /api/ai/action/smart-unfollow',
  'POST /api/ai/action/auto-retweet',
  'POST /api/ai/action/bulk-execute',
  'POST /api/ai/action/cancel/:operationId',
  'GET /api/ai/action/status/:operationId',
  'GET /api/ai/action/history',

  // ── Monitoring ────────────────────────────────────────────────────
  'POST /api/ai/monitor/account',
  'POST /api/ai/monitor/followers',
  'POST /api/ai/monitor/following',
  'POST /api/ai/monitor/compare',
  'POST /api/ai/monitor/keyword',
  'POST /api/ai/monitor/follower-alerts',
  'POST /api/ai/monitor/track-engagement',
  'GET /api/ai/monitor/snapshot/:username',
  'DELETE /api/ai/monitor/snapshot/:username',
  'GET /api/ai/monitor/list',
  // /alert/* alias (same router, different prefix)
  'POST /api/ai/alert/account',
  'POST /api/ai/alert/followers',
  'POST /api/ai/alert/following',
  'POST /api/ai/alert/new-followers',
  'POST /api/ai/alert/compare',
  'POST /api/ai/alert/keyword',
  'POST /api/ai/alert/follower-alerts',
  'POST /api/ai/alert/track-engagement',

  // ── Posting ───────────────────────────────────────────────────────
  'POST /api/ai/posting/tweet',
  'POST /api/ai/posting/thread',
  'POST /api/ai/posting/poll',
  'POST /api/ai/posting/schedule',
  'POST /api/ai/posting/delete',
  'POST /api/ai/posting/reply',
  'POST /api/ai/posting/bookmark',
  'POST /api/ai/posting/bookmarks',
  'POST /api/ai/posting/clear-bookmarks',
  'POST /api/ai/posting/article',

  // ── Engagement ────────────────────────────────────────────────────
  'POST /api/ai/engagement/follow',
  'POST /api/ai/engagement/unfollow',
  'POST /api/ai/engagement/like',
  'POST /api/ai/engagement/retweet',
  'POST /api/ai/engagement/quote-tweet',
  'POST /api/ai/engagement/auto-follow',
  'POST /api/ai/engagement/smart-unfollow',
  'POST /api/ai/engagement/auto-retweet',
  'POST /api/ai/engagement/bulk-execute',
  'POST /api/ai/engagement/notifications',
  'POST /api/ai/engagement/mute',
  'POST /api/ai/engagement/unmute',
  'POST /api/ai/engagement/trends',
  'POST /api/ai/engagement/explore',
  'POST /api/ai/engagement/detect-bots',
  'POST /api/ai/engagement/find-influencers',
  'POST /api/ai/engagement/smart-target',
  'POST /api/ai/engagement/crypto-analyze',
  'POST /api/ai/engagement/audience-insights',
  'POST /api/ai/engagement/engagement-report',

  // ── Analytics ─────────────────────────────────────────────────────
  'POST /api/ai/analytics/account',
  'POST /api/ai/analytics/post',
  'POST /api/ai/analytics/creator',
  'POST /api/ai/analytics/brand-monitor',
  'POST /api/ai/analytics/competitor',
  'POST /api/ai/analytics/audience-overlap',
  'POST /api/ai/analytics/history',
  'POST /api/ai/analytics/snapshot',
  'POST /api/ai/analytics/growth-rate',
  'POST /api/ai/analytics/compare-accounts',
  'POST /api/ai/analytics/analyze-voice',
  'POST /api/ai/analytics/generate-tweet',
  'POST /api/ai/analytics/rewrite-tweet',
  'POST /api/ai/analytics/summarize-thread',
  'POST /api/ai/analytics/best-time',

  // ── Messages ──────────────────────────────────────────────────────
  'POST /api/ai/messages/send',
  'POST /api/ai/messages/conversations',
  'POST /api/ai/messages/export',

  // ── Profile ───────────────────────────────────────────────────────
  'POST /api/ai/profile/update',
  'POST /api/ai/profile/check-premium',
  'POST /api/ai/profile/settings',
  'POST /api/ai/profile/toggle-protected',
  'POST /api/ai/profile/blocked',

  // ── Grok ──────────────────────────────────────────────────────────
  'POST /api/ai/grok/query',
  'POST /api/ai/grok/summarize',
  'POST /api/ai/grok/analyze-image',

  // ── Lists ─────────────────────────────────────────────────────────
  'POST /api/ai/lists/all',
  'POST /api/ai/lists/members',

  // ── Spaces ────────────────────────────────────────────────────────
  'POST /api/ai/spaces/list',
  'POST /api/ai/spaces/scrape',
  'POST /api/ai/spaces/join',
  'POST /api/ai/spaces/leave',
  'POST /api/ai/spaces/status',
  'POST /api/ai/spaces/transcript',

  // ── Sentiment ─────────────────────────────────────────────────────
  'POST /api/ai/sentiment/analyze',
  'POST /api/ai/sentiment/monitor',
  'POST /api/ai/sentiment/report',

  // ── Streams ───────────────────────────────────────────────────────
  'POST /api/ai/streams/start',
  'POST /api/ai/streams/stop',
  'POST /api/ai/streams/list',
  'POST /api/ai/streams/pause',
  'POST /api/ai/streams/resume',
  'POST /api/ai/streams/status',
  'POST /api/ai/streams/history',

  // ── Workflows ─────────────────────────────────────────────────────
  'POST /api/ai/workflows/actions',
  'POST /api/ai/workflows/create',
  'POST /api/ai/workflows/run',
  'POST /api/ai/workflows/list',

  // ── Portability ───────────────────────────────────────────────────
  'POST /api/ai/portability/platforms',
  'POST /api/ai/portability/export-account',
  'POST /api/ai/portability/migrate',
  'POST /api/ai/portability/diff',
  'POST /api/ai/portability/import',
  'POST /api/ai/portability/convert',

  // ── Personas ──────────────────────────────────────────────────────
  'POST /api/ai/personas/presets',
  'POST /api/ai/personas/create',
  'POST /api/ai/personas/list',
  'POST /api/ai/personas/status',
  'POST /api/ai/personas/edit',
  'POST /api/ai/personas/delete',
  'POST /api/ai/personas/run',

  // ── Graph ─────────────────────────────────────────────────────────
  'POST /api/ai/graph/build',
  'POST /api/ai/graph/analyze',
  'POST /api/ai/graph/recommendations',
  'POST /api/ai/graph/list',

  // ── CRM ───────────────────────────────────────────────────────────
  'POST /api/ai/crm/sync',
  'POST /api/ai/crm/tag',
  'POST /api/ai/crm/search',
  'POST /api/ai/crm/segment',

  // ── Scheduler ─────────────────────────────────────────────────────
  'POST /api/ai/schedule/add',
  'POST /api/ai/schedule/list',
  'POST /api/ai/schedule/remove',
  'POST /api/ai/schedule/rss-add',
  'POST /api/ai/schedule/rss-check',
  'POST /api/ai/schedule/rss-drafts',
  'POST /api/ai/schedule/evergreen',

  // ── Optimizer ─────────────────────────────────────────────────────
  'POST /api/ai/optimizer/optimize',
  'POST /api/ai/optimizer/hashtags',
  'POST /api/ai/optimizer/predict',
  'POST /api/ai/optimizer/variations',

  // ── Writer ────────────────────────────────────────────────────────
  'POST /api/ai/writer/analyze-voice',
  'POST /api/ai/writer/generate',
  'POST /api/ai/writer/rewrite',
  'POST /api/ai/writer/calendar',
  'POST /api/ai/writer/reply',

  // ── Utility ───────────────────────────────────────────────────────
  'POST /api/ai/download/video',
  'POST /api/ai/export/bookmarks',
  'POST /api/ai/unroll/thread',
  'POST /api/ai/analyze/profile',
  'POST /api/ai/analyze/tweet',

  // ── Notifications ─────────────────────────────────────────────────
  'POST /api/ai/notify/send',
  'POST /api/ai/notify/test',

  // ── Datasets ──────────────────────────────────────────────────────
  'POST /api/ai/datasets/list',
  'POST /api/ai/datasets/get',

  // ── Teams ─────────────────────────────────────────────────────────
  'POST /api/ai/teams/create',
  'POST /api/ai/teams/members',
];

export function generateWellKnown() {
  return {
    version: 1,
    resources: ALL_PAID_RESOURCES,
  };
}

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

  // ── Scrape extras ────────────────────────────────────────────────
  scrapeLikes: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' }, limit: { type: 'integer', default: 100 } },
  },
  scrapeRetweets: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' }, limit: { type: 'integer', default: 100 } },
  },
  scrapeReplies: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' }, limit: { type: 'integer', default: 50 } },
  },
  scrapeQuoteTweets: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' }, limit: { type: 'integer', default: 50 } },
  },
  scrapeUserLikes: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' }, limit: { type: 'integer', default: 100 } },
  },
  scrapeMentions: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' }, limit: { type: 'integer', default: 50 } },
  },
  scrapeRecommendations: {
    type: 'object',
    properties: { ...sessionProp, limit: { type: 'integer', default: 20 } },
  },

  // ── Action extras ────────────────────────────────────────────────
  actionAutoComment: {
    type: 'object', required: ['keywords', 'templateMessages'],
    properties: { ...sessionProp, keywords: { type: 'array', items: { type: 'string' } }, templateMessages: { type: 'array', items: { type: 'string' } }, limit: { type: 'integer', default: 10 } },
  },
  actionFollow: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  actionUnfollow: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  actionLike: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' } },
  },
  actionRetweet: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' } },
  },
  actionQuoteTweet: {
    type: 'object', required: ['tweetId', 'text'],
    properties: { ...sessionProp, tweetId: { type: 'string' }, text: { type: 'string', maxLength: 280 } },
  },
  actionPostTweet: {
    type: 'object', required: ['text'],
    properties: { ...sessionProp, text: { type: 'string', maxLength: 280 }, replyToTweetId: { type: 'string' } },
  },
  actionAutoFollow: {
    type: 'object',
    properties: { ...sessionProp, keyword: { type: 'string' }, hashtag: { type: 'string' }, limit: { type: 'integer', default: 50 } },
  },
  actionSmartUnfollow: {
    type: 'object',
    properties: { ...sessionProp, maxUnfollows: { type: 'integer', default: 100 }, dryRun: { type: 'boolean', default: false }, minFollowDays: { type: 'integer', default: 30 } },
  },
  actionAutoRetweet: {
    type: 'object', required: ['keywords'],
    properties: { ...sessionProp, keywords: { type: 'array', items: { type: 'string' } }, limit: { type: 'integer', default: 20 } },
  },
  actionBulkExecute: {
    type: 'object', required: ['actions'],
    properties: { ...sessionProp, actions: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, target: { type: 'string' } } } } },
  },

  // ── Posting ──────────────────────────────────────────────────────
  postTweet: {
    type: 'object', required: ['text'],
    properties: { ...sessionProp, text: { type: 'string', maxLength: 280 }, replyToTweetId: { type: 'string' }, mediaUrls: { type: 'array', items: { type: 'string' } } },
  },
  postThread: {
    type: 'object', required: ['tweets'],
    properties: { ...sessionProp, tweets: { type: 'array', items: { type: 'string' }, minItems: 2 } },
  },
  createPoll: {
    type: 'object', required: ['question', 'choices'],
    properties: { ...sessionProp, question: { type: 'string' }, choices: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 }, durationHours: { type: 'integer', default: 24 } },
  },
  scheduleTweet: {
    type: 'object', required: ['text', 'scheduledAt'],
    properties: { ...sessionProp, text: { type: 'string', maxLength: 280 }, scheduledAt: { type: 'string', format: 'date-time' } },
  },
  deleteTweet: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' } },
  },
  replyTweet: {
    type: 'object', required: ['tweetId', 'text'],
    properties: { ...sessionProp, tweetId: { type: 'string' }, text: { type: 'string', maxLength: 280 } },
  },
  bookmarkTweet: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' } },
  },
  getBookmarks: {
    type: 'object',
    properties: { ...sessionProp, limit: { type: 'integer', default: 50 } },
  },
  clearBookmarks: {
    type: 'object',
    properties: { ...sessionProp },
  },
  publishArticle: {
    type: 'object', required: ['title', 'content'],
    properties: { ...sessionProp, title: { type: 'string' }, content: { type: 'string' } },
  },

  // ── Engagement ───────────────────────────────────────────────────
  engagementFollow: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  engagementUnfollow: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  engagementLike: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' } },
  },
  engagementRetweet: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' } },
  },
  engagementQuoteTweet: {
    type: 'object', required: ['tweetId', 'text'],
    properties: { ...sessionProp, tweetId: { type: 'string' }, text: { type: 'string', maxLength: 280 } },
  },
  engagementAutoFollow: {
    type: 'object',
    properties: { ...sessionProp, keyword: { type: 'string' }, hashtag: { type: 'string' }, limit: { type: 'integer', default: 50 } },
  },
  engagementSmartUnfollow: {
    type: 'object',
    properties: { ...sessionProp, maxUnfollows: { type: 'integer', default: 100 }, dryRun: { type: 'boolean', default: false } },
  },
  engagementAutoRetweet: {
    type: 'object', required: ['keywords'],
    properties: { ...sessionProp, keywords: { type: 'array', items: { type: 'string' } }, limit: { type: 'integer', default: 20 } },
  },
  engagementBulkExecute: {
    type: 'object', required: ['actions'],
    properties: { ...sessionProp, actions: { type: 'array', items: { type: 'object' } } },
  },
  engagementNotifications: {
    type: 'object',
    properties: { ...sessionProp, limit: { type: 'integer', default: 50 }, type: { type: 'string', enum: ['all', 'mentions', 'likes', 'follows', 'retweets'] } },
  },
  muteUser: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  unmuteUser: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  getTrends: {
    type: 'object',
    properties: { ...sessionProp, location: { type: 'string', default: 'worldwide' } },
  },
  getExplore: {
    type: 'object',
    properties: { ...sessionProp, limit: { type: 'integer', default: 20 } },
  },
  detectBots: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  findInfluencers: {
    type: 'object', required: ['keyword'],
    properties: { ...sessionProp, keyword: { type: 'string' }, minFollowers: { type: 'integer', default: 1000 }, limit: { type: 'integer', default: 20 } },
  },
  smartTarget: {
    type: 'object', required: ['goal'],
    properties: { ...sessionProp, goal: { type: 'string' }, niche: { type: 'string' } },
  },
  cryptoAnalyze: {
    type: 'object', required: ['ticker'],
    properties: { ...sessionProp, ticker: { type: 'string', example: 'BTC' }, limit: { type: 'integer', default: 100 } },
  },
  audienceInsights: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  engagementReport: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' }, days: { type: 'integer', default: 30 } },
  },

  // ── Analytics ────────────────────────────────────────────────────
  accountAnalytics: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' }, period: { type: 'string', default: '30d' } },
  },
  postAnalytics: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' } },
  },
  creatorAnalytics: {
    type: 'object',
    properties: { ...sessionProp, period: { type: 'string', default: '30d' } },
  },
  brandMonitor: {
    type: 'object', required: ['query'],
    properties: { ...sessionProp, query: { type: 'string' }, limit: { type: 'integer', default: 100 } },
  },
  competitorAnalysis: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  audienceOverlap: {
    type: 'object', required: ['username1', 'username2'],
    properties: { ...sessionProp, username1: { type: 'string' }, username2: { type: 'string' } },
  },
  analyticsHistory: {
    type: 'object',
    properties: { ...sessionProp, username: { type: 'string' }, limit: { type: 'integer', default: 30 } },
  },
  analyticsSnapshot: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  growthRate: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' }, period: { type: 'string', default: '30d' } },
  },
  compareAccounts: {
    type: 'object', required: ['usernames'],
    properties: { ...sessionProp, usernames: { type: 'array', items: { type: 'string' }, minItems: 2 } },
  },
  analyticsAnalyzeVoice: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' }, tweetLimit: { type: 'integer', default: 100 } },
  },
  analyticsGenerateTweet: {
    type: 'object', required: ['username', 'topic'],
    properties: { ...sessionProp, username: { type: 'string' }, topic: { type: 'string' }, count: { type: 'integer', default: 5 } },
  },
  analyticsRewriteTweet: {
    type: 'object', required: ['tweet'],
    properties: { ...sessionProp, tweet: { type: 'string' }, goal: { type: 'string', enum: ['engagement', 'clarity', 'humor', 'professionalism'] } },
  },
  summarizeThread: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' } },
  },
  bestTime: {
    type: 'object',
    properties: { ...sessionProp, username: { type: 'string' }, timezone: { type: 'string', default: 'UTC' } },
  },

  // ── Messages ─────────────────────────────────────────────────────
  sendDM: {
    type: 'object', required: ['username', 'message'],
    properties: { ...sessionProp, username: { type: 'string' }, message: { type: 'string' } },
  },
  listConversations: {
    type: 'object',
    properties: { ...sessionProp, limit: { type: 'integer', default: 20 } },
  },
  exportDMs: {
    type: 'object',
    properties: { ...sessionProp, format: { type: 'string', enum: ['json', 'csv'], default: 'json' } },
  },

  // ── Profile ──────────────────────────────────────────────────────
  updateProfile: {
    type: 'object',
    properties: { ...sessionProp, name: { type: 'string' }, bio: { type: 'string' }, location: { type: 'string' }, website: { type: 'string' } },
  },
  checkPremium: {
    type: 'object',
    properties: { ...sessionProp },
  },
  getSettings: {
    type: 'object',
    properties: { ...sessionProp },
  },
  toggleProtected: {
    type: 'object',
    properties: { ...sessionProp, protected: { type: 'boolean' } },
  },
  getBlocked: {
    type: 'object',
    properties: { ...sessionProp, limit: { type: 'integer', default: 100 } },
  },

  // ── Grok ─────────────────────────────────────────────────────────
  grokQuery: {
    type: 'object', required: ['query'],
    properties: { ...sessionProp, query: { type: 'string' }, context: { type: 'string' } },
  },
  grokSummarize: {
    type: 'object', required: ['topic'],
    properties: { ...sessionProp, topic: { type: 'string' } },
  },
  grokAnalyzeImage: {
    type: 'object', required: ['imageUrl'],
    properties: { ...sessionProp, imageUrl: { type: 'string' }, question: { type: 'string' } },
  },

  // ── Lists ────────────────────────────────────────────────────────
  getLists: {
    type: 'object',
    properties: { ...sessionProp },
  },
  getListMembers: {
    type: 'object', required: ['listId'],
    properties: { ...sessionProp, listId: { type: 'string' }, limit: { type: 'integer', default: 100 } },
  },

  // ── Spaces ───────────────────────────────────────────────────────
  listSpaces: {
    type: 'object',
    properties: { ...sessionProp, limit: { type: 'integer', default: 20 } },
  },
  scrapeSpace: {
    type: 'object', required: ['spaceId'],
    properties: { ...sessionProp, spaceId: { type: 'string' } },
  },
  joinSpace: {
    type: 'object', required: ['spaceId'],
    properties: { ...sessionProp, spaceId: { type: 'string' } },
  },
  leaveSpace: {
    type: 'object', required: ['spaceId'],
    properties: { ...sessionProp, spaceId: { type: 'string' } },
  },
  spaceStatus: {
    type: 'object', required: ['spaceId'],
    properties: { ...sessionProp, spaceId: { type: 'string' } },
  },
  spaceTranscript: {
    type: 'object', required: ['spaceId'],
    properties: { ...sessionProp, spaceId: { type: 'string' } },
  },

  // ── Monitor extras ───────────────────────────────────────────────
  monitorFollowing: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  monitorCompare: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' }, sinceDate: { type: 'string', format: 'date' } },
  },
  monitorKeyword: {
    type: 'object', required: ['keyword'],
    properties: { ...sessionProp, keyword: { type: 'string' }, interval: { type: 'integer', default: 60 } },
  },
  followerAlerts: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  trackEngagement: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' } },
  },

  // ── Sentiment ────────────────────────────────────────────────────
  analyzeSentiment: {
    type: 'object', required: ['query'],
    properties: { ...sessionProp, query: { type: 'string' }, limit: { type: 'integer', default: 100 } },
  },
  monitorSentiment: {
    type: 'object', required: ['brand'],
    properties: { ...sessionProp, brand: { type: 'string' }, interval: { type: 'integer', default: 3600 } },
  },
  sentimentReport: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' }, days: { type: 'integer', default: 30 } },
  },

  // ── Streams ──────────────────────────────────────────────────────
  startStream: {
    type: 'object', required: ['keywords'],
    properties: { ...sessionProp, keywords: { type: 'array', items: { type: 'string' } }, filters: { type: 'object' } },
  },
  stopStream: {
    type: 'object', required: ['streamId'],
    properties: { ...sessionProp, streamId: { type: 'string' } },
  },
  pauseStream: {
    type: 'object', required: ['streamId'],
    properties: { ...sessionProp, streamId: { type: 'string' } },
  },
  resumeStream: {
    type: 'object', required: ['streamId'],
    properties: { ...sessionProp, streamId: { type: 'string' } },
  },
  streamStatus: {
    type: 'object', required: ['streamId'],
    properties: { ...sessionProp, streamId: { type: 'string' } },
  },
  streamHistory: {
    type: 'object',
    properties: { ...sessionProp, limit: { type: 'integer', default: 20 } },
  },
  listStreams: {
    type: 'object',
    properties: { ...sessionProp },
  },

  // ── Workflows ────────────────────────────────────────────────────
  listWorkflowActions: { type: 'object', properties: {} },
  createWorkflow: {
    type: 'object', required: ['name', 'steps'],
    properties: { ...sessionProp, name: { type: 'string' }, steps: { type: 'array', items: { type: 'object' } } },
  },
  runWorkflow: {
    type: 'object', required: ['workflowId'],
    properties: { ...sessionProp, workflowId: { type: 'string' } },
  },
  listWorkflows: {
    type: 'object',
    properties: { ...sessionProp },
  },

  // ── Personas ─────────────────────────────────────────────────────
  personaPresets: { type: 'object', properties: {} },
  createPersona: {
    type: 'object', required: ['name'],
    properties: { ...sessionProp, name: { type: 'string' }, niche: { type: 'string' }, config: { type: 'object' } },
  },
  listPersonas: {
    type: 'object',
    properties: { ...sessionProp },
  },
  personaStatus: {
    type: 'object', required: ['personaId'],
    properties: { ...sessionProp, personaId: { type: 'string' } },
  },
  editPersona: {
    type: 'object', required: ['personaId'],
    properties: { ...sessionProp, personaId: { type: 'string' }, config: { type: 'object' } },
  },
  deletePersona: {
    type: 'object', required: ['personaId'],
    properties: { ...sessionProp, personaId: { type: 'string' } },
  },
  runPersona: {
    type: 'object', required: ['personaId'],
    properties: { ...sessionProp, personaId: { type: 'string' } },
  },

  // ── Graph ────────────────────────────────────────────────────────
  buildGraph: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' }, depth: { type: 'integer', default: 2, maximum: 3 } },
  },
  analyzeGraph: {
    type: 'object', required: ['graphId'],
    properties: { ...sessionProp, graphId: { type: 'string' }, algorithm: { type: 'string', enum: ['pagerank', 'betweenness', 'community'] } },
  },
  graphRecommendations: {
    type: 'object', required: ['graphId'],
    properties: { ...sessionProp, graphId: { type: 'string' }, limit: { type: 'integer', default: 20 } },
  },
  listGraphs: {
    type: 'object',
    properties: { ...sessionProp },
  },

  // ── Portability ──────────────────────────────────────────────────
  listPlatforms: { type: 'object', properties: {} },
  exportAccount: {
    type: 'object',
    properties: { ...sessionProp, format: { type: 'string', enum: ['json', 'csv', 'zip'], default: 'json' } },
  },
  migrateAccount: {
    type: 'object', required: ['platform'],
    properties: { ...sessionProp, platform: { type: 'string', enum: ['bluesky', 'mastodon', 'threads'] } },
  },
  diffExports: {
    type: 'object', required: ['export1', 'export2'],
    properties: { ...sessionProp, export1: { type: 'string' }, export2: { type: 'string' } },
  },
  importData: {
    type: 'object', required: ['platform'],
    properties: { ...sessionProp, platform: { type: 'string' }, data: { type: 'object' } },
  },
  convertFormat: {
    type: 'object', required: ['from', 'to'],
    properties: { ...sessionProp, from: { type: 'string' }, to: { type: 'string' }, data: { type: 'object' } },
  },

  // ── CRM ──────────────────────────────────────────────────────────
  syncCRM: {
    type: 'object',
    properties: { ...sessionProp, limit: { type: 'integer', default: 100 } },
  },
  tagContact: {
    type: 'object', required: ['username', 'tags'],
    properties: { ...sessionProp, username: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } } },
  },
  searchCRM: {
    type: 'object', required: ['query'],
    properties: { ...sessionProp, query: { type: 'string' } },
  },
  segmentCRM: {
    type: 'object', required: ['criteria'],
    properties: { ...sessionProp, criteria: { type: 'object' } },
  },

  // ── Schedule ─────────────────────────────────────────────────────
  addScheduled: {
    type: 'object', required: ['text', 'scheduledAt'],
    properties: { ...sessionProp, text: { type: 'string', maxLength: 280 }, scheduledAt: { type: 'string', format: 'date-time' } },
  },
  listScheduled: {
    type: 'object',
    properties: { ...sessionProp },
  },
  removeScheduled: {
    type: 'object', required: ['id'],
    properties: { ...sessionProp, id: { type: 'string' } },
  },
  addRSS: {
    type: 'object', required: ['url'],
    properties: { ...sessionProp, url: { type: 'string', format: 'uri' }, template: { type: 'string' } },
  },
  checkRSS: {
    type: 'object',
    properties: { ...sessionProp, feedId: { type: 'string' } },
  },
  getRSSDrafts: {
    type: 'object',
    properties: { ...sessionProp },
  },
  findEvergreen: {
    type: 'object',
    properties: { ...sessionProp, username: { type: 'string' }, minLikes: { type: 'integer', default: 10 } },
  },

  // ── Optimizer ────────────────────────────────────────────────────
  optimizeTweet: {
    type: 'object', required: ['text'],
    properties: { ...sessionProp, text: { type: 'string' }, goal: { type: 'string', enum: ['engagement', 'reach', 'conversions'] } },
  },
  suggestHashtags: {
    type: 'object', required: ['topic'],
    properties: { ...sessionProp, topic: { type: 'string' }, count: { type: 'integer', default: 10 } },
  },
  predictPerformance: {
    type: 'object', required: ['text'],
    properties: { ...sessionProp, text: { type: 'string' } },
  },
  generateVariations: {
    type: 'object', required: ['text'],
    properties: { ...sessionProp, text: { type: 'string' }, count: { type: 'integer', default: 5 } },
  },

  // ── Utility extras ───────────────────────────────────────────────
  analyzeProfile: {
    type: 'object', required: ['username'],
    properties: { ...sessionProp, username: { type: 'string' } },
  },
  analyzeTweet: {
    type: 'object', required: ['tweetId'],
    properties: { ...sessionProp, tweetId: { type: 'string' } },
  },

  // ── Notifications ────────────────────────────────────────────────
  sendWebhook: {
    type: 'object', required: ['event', 'url'],
    properties: { url: { type: 'string', format: 'uri' }, event: { type: 'string' }, payload: { type: 'object' } },
  },
  testWebhook: {
    type: 'object', required: ['url'],
    properties: { url: { type: 'string', format: 'uri' } },
  },

  // ── Datasets ─────────────────────────────────────────────────────
  listDatasets: { type: 'object', properties: {} },
  getDataset: {
    type: 'object', required: ['datasetId'],
    properties: { ...sessionProp, datasetId: { type: 'string' } },
  },

  // ── Teams ────────────────────────────────────────────────────────
  createTeam: {
    type: 'object', required: ['name'],
    properties: { ...sessionProp, name: { type: 'string' }, members: { type: 'array', items: { type: 'string' } } },
  },
  getTeamMembers: {
    type: 'object', required: ['teamId'],
    properties: { ...sessionProp, teamId: { type: 'string' } },
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
- scrape: Extract data from X/Twitter (profiles, followers, tweets, hashtags, media, likes, retweets, replies)
- action: Automate account actions (unfollow, like, follow, auto-like, bulk operations)
- posting: Create content (tweet, thread, poll, schedule, delete, reply, bookmark, article)
- engagement: Engagement automation (follow, like, retweet, mute/unmute, trends, bot detection, influencer finder)
- analytics: Deep analytics (account, post, competitor, audience overlap, growth rate, voice analysis)
- messages: Direct messages (send, list conversations, export)
- profile: Profile management (update, settings, protected mode, blocked accounts)
- grok: Grok AI integration (query, summarize, image analysis)
- lists: Twitter Lists (get lists, list members)
- spaces: Twitter Spaces (discover, join, scrape metadata, transcripts)
- monitor: Track changes (account, followers, following, keyword monitoring, snapshots)
- sentiment: Sentiment analysis and reputation monitoring
- streams: Real-time keyword streams
- workflows: Multi-step automation workflows
- personas: Automation personas for 24/7 growth agents
- graph: Social network graph analysis (PageRank, betweenness centrality, community detection)
- portability: Account export, migration to Bluesky/Mastodon/Threads
- crm: Follower CRM (tag, segment, search contacts)
- schedule: Post scheduling and RSS auto-posting
- optimizer: Tweet optimization (hashtags, variations, performance prediction)
- writer: AI content generation (voice analysis, tweet generator, content calendar)
- utility: Video download, bookmark export, thread unroll, profile/tweet analysis
- notify: Webhook notifications
- datasets: Pre-built datasets
- teams: Team management for multi-user automation

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
      '/api/ai/writer/voice-profiles': {
        get: {
          tags: ['Writer'],
          summary: 'List saved voice profiles',
          responses: { 200: ok200('Voice profiles list') },
        },
      },
      '/api/ai/writer/voice-profiles/{username}': {
        get: {
          tags: ['Writer'],
          summary: 'Get a voice profile',
          parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: ok200('Voice profile') },
        },
      },

      // ─── Scraping extras ─────────────────────────────────────────
      '/api/ai/scrape/likes': {
        post: {
          tags: ['Scraping'],
          summary: 'Get tweet likers',
          'x-payment-info': paymentInfo('scrape:likes'),
          'x-bazaar': bazaarExt(S.scrapeLikes),
          requestBody: { required: true, content: { 'application/json': { schema: S.scrapeLikes } } },
          responses: { 200: ok200('Likers list'), 402: payment402 },
        },
      },
      '/api/ai/scrape/retweets': {
        post: {
          tags: ['Scraping'],
          summary: 'Get tweet retweeters',
          'x-payment-info': paymentInfo('scrape:retweets'),
          'x-bazaar': bazaarExt(S.scrapeRetweets),
          requestBody: { required: true, content: { 'application/json': { schema: S.scrapeRetweets } } },
          responses: { 200: ok200('Retweeters list'), 402: payment402 },
        },
      },
      '/api/ai/scrape/replies': {
        post: {
          tags: ['Scraping'],
          summary: 'Get tweet replies',
          'x-payment-info': paymentInfo('scrape:replies'),
          'x-bazaar': bazaarExt(S.scrapeReplies),
          requestBody: { required: true, content: { 'application/json': { schema: S.scrapeReplies } } },
          responses: { 200: ok200('Replies list'), 402: payment402 },
        },
      },
      '/api/ai/scrape/quote-tweets': {
        post: {
          tags: ['Scraping'],
          summary: 'Get quote tweets',
          'x-payment-info': paymentInfo('scrape:quote-tweets'),
          'x-bazaar': bazaarExt(S.scrapeQuoteTweets),
          requestBody: { required: true, content: { 'application/json': { schema: S.scrapeQuoteTweets } } },
          responses: { 200: ok200('Quote tweets'), 402: payment402 },
        },
      },
      '/api/ai/scrape/user-likes': {
        post: {
          tags: ['Scraping'],
          summary: 'Get tweets a user liked',
          'x-payment-info': paymentInfo('scrape:user-likes'),
          'x-bazaar': bazaarExt(S.scrapeUserLikes),
          requestBody: { required: true, content: { 'application/json': { schema: S.scrapeUserLikes } } },
          responses: { 200: ok200('User liked tweets'), 402: payment402 },
        },
      },
      '/api/ai/scrape/mentions': {
        post: {
          tags: ['Scraping'],
          summary: 'Get @mentions of a user',
          'x-payment-info': paymentInfo('scrape:mentions'),
          'x-bazaar': bazaarExt(S.scrapeMentions),
          requestBody: { required: true, content: { 'application/json': { schema: S.scrapeMentions } } },
          responses: { 200: ok200('Mentions list'), 402: payment402 },
        },
      },
      '/api/ai/scrape/recommendations': {
        post: {
          tags: ['Scraping'],
          summary: 'Get recommended accounts',
          'x-payment-info': paymentInfo('scrape:recommendations'),
          'x-bazaar': bazaarExt(S.scrapeRecommendations),
          requestBody: { required: true, content: { 'application/json': { schema: S.scrapeRecommendations } } },
          responses: { 200: ok200('Recommended accounts'), 402: payment402 },
        },
      },

      // ─── Actions extras ──────────────────────────────────────────
      '/api/ai/action/auto-comment': {
        post: {
          tags: ['Actions'],
          summary: 'Auto-comment on keyword tweets',
          'x-payment-info': paymentInfo('action:auto-comment'),
          'x-bazaar': bazaarExt(S.actionAutoComment),
          requestBody: { required: true, content: { 'application/json': { schema: S.actionAutoComment } } },
          responses: { 200: ok200('Auto-comment started'), 402: payment402 },
        },
      },
      '/api/ai/action/follow': {
        post: {
          tags: ['Actions'],
          summary: 'Follow a user',
          'x-payment-info': paymentInfo('action:follow'),
          'x-bazaar': bazaarExt(S.actionFollow),
          requestBody: { required: true, content: { 'application/json': { schema: S.actionFollow } } },
          responses: { 200: ok200('Follow result'), 402: payment402 },
        },
      },
      '/api/ai/action/unfollow': {
        post: {
          tags: ['Actions'],
          summary: 'Unfollow a user',
          'x-payment-info': paymentInfo('action:unfollow'),
          'x-bazaar': bazaarExt(S.actionUnfollow),
          requestBody: { required: true, content: { 'application/json': { schema: S.actionUnfollow } } },
          responses: { 200: ok200('Unfollow result'), 402: payment402 },
        },
      },
      '/api/ai/action/like': {
        post: {
          tags: ['Actions'],
          summary: 'Like a tweet',
          'x-payment-info': paymentInfo('action:like'),
          'x-bazaar': bazaarExt(S.actionLike),
          requestBody: { required: true, content: { 'application/json': { schema: S.actionLike } } },
          responses: { 200: ok200('Like result'), 402: payment402 },
        },
      },
      '/api/ai/action/retweet': {
        post: {
          tags: ['Actions'],
          summary: 'Retweet a tweet',
          'x-payment-info': paymentInfo('action:retweet'),
          'x-bazaar': bazaarExt(S.actionRetweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.actionRetweet } } },
          responses: { 200: ok200('Retweet result'), 402: payment402 },
        },
      },
      '/api/ai/action/quote-tweet': {
        post: {
          tags: ['Actions'],
          summary: 'Quote-tweet',
          'x-payment-info': paymentInfo('action:quote-tweet'),
          'x-bazaar': bazaarExt(S.actionQuoteTweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.actionQuoteTweet } } },
          responses: { 200: ok200('Quote tweet result'), 402: payment402 },
        },
      },
      '/api/ai/action/post-tweet': {
        post: {
          tags: ['Actions'],
          summary: 'Post a tweet',
          'x-payment-info': paymentInfo('action:post-tweet'),
          'x-bazaar': bazaarExt(S.actionPostTweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.actionPostTweet } } },
          responses: { 200: ok200('Tweet posted'), 402: payment402 },
        },
      },
      '/api/ai/action/auto-follow': {
        post: {
          tags: ['Actions'],
          summary: 'Auto-follow by keyword/hashtag',
          'x-payment-info': paymentInfo('action:auto-follow'),
          'x-bazaar': bazaarExt(S.actionAutoFollow),
          requestBody: { required: true, content: { 'application/json': { schema: S.actionAutoFollow } } },
          responses: { 200: ok200('Auto-follow started'), 402: payment402 },
        },
      },
      '/api/ai/action/smart-unfollow': {
        post: {
          tags: ['Actions'],
          summary: 'Smart unfollow inactive/non-followers',
          'x-payment-info': paymentInfo('action:smart-unfollow'),
          'x-bazaar': bazaarExt(S.actionSmartUnfollow),
          requestBody: { required: true, content: { 'application/json': { schema: S.actionSmartUnfollow } } },
          responses: { 200: ok200('Smart unfollow started'), 402: payment402 },
        },
      },
      '/api/ai/action/auto-retweet': {
        post: {
          tags: ['Actions'],
          summary: 'Auto-retweet by keyword',
          'x-payment-info': paymentInfo('action:auto-retweet'),
          'x-bazaar': bazaarExt(S.actionAutoRetweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.actionAutoRetweet } } },
          responses: { 200: ok200('Auto-retweet started'), 402: payment402 },
        },
      },
      '/api/ai/action/bulk-execute': {
        post: {
          tags: ['Actions'],
          summary: 'Bulk execute multiple actions',
          'x-payment-info': paymentInfo('action:bulk-execute'),
          'x-bazaar': bazaarExt(S.actionBulkExecute),
          requestBody: { required: true, content: { 'application/json': { schema: S.actionBulkExecute } } },
          responses: { 200: ok200('Bulk operation result'), 402: payment402 },
        },
      },
      '/api/ai/action/cancel/{operationId}': {
        post: {
          tags: ['Actions'],
          summary: 'Cancel an operation',
          parameters: [{ name: 'operationId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: ok200('Operation cancelled') },
        },
      },
      '/api/ai/action/status/{operationId}': {
        get: {
          tags: ['Actions'],
          summary: 'Check operation status',
          parameters: [{ name: 'operationId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: ok200('Operation status') },
        },
      },
      '/api/ai/action/history': {
        get: {
          tags: ['Actions'],
          summary: 'Operation history',
          responses: { 200: ok200('Operation history') },
        },
      },

      // ─── Posting ─────────────────────────────────────────────────
      '/api/ai/posting/tweet': {
        post: {
          tags: ['Posting'],
          summary: 'Post a tweet',
          'x-payment-info': paymentInfo('posting:tweet'),
          'x-bazaar': bazaarExt(S.postTweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.postTweet } } },
          responses: { 200: ok200('Tweet posted'), 402: payment402 },
        },
      },
      '/api/ai/posting/thread': {
        post: {
          tags: ['Posting'],
          summary: 'Post a thread',
          'x-payment-info': paymentInfo('posting:thread'),
          'x-bazaar': bazaarExt(S.postThread),
          requestBody: { required: true, content: { 'application/json': { schema: S.postThread } } },
          responses: { 200: ok200('Thread posted'), 402: payment402 },
        },
      },
      '/api/ai/posting/poll': {
        post: {
          tags: ['Posting'],
          summary: 'Create a poll',
          'x-payment-info': paymentInfo('posting:poll'),
          'x-bazaar': bazaarExt(S.createPoll),
          requestBody: { required: true, content: { 'application/json': { schema: S.createPoll } } },
          responses: { 200: ok200('Poll created'), 402: payment402 },
        },
      },
      '/api/ai/posting/schedule': {
        post: {
          tags: ['Posting'],
          summary: 'Schedule a tweet',
          'x-payment-info': paymentInfo('posting:schedule'),
          'x-bazaar': bazaarExt(S.scheduleTweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.scheduleTweet } } },
          responses: { 200: ok200('Tweet scheduled'), 402: payment402 },
        },
      },
      '/api/ai/posting/delete': {
        post: {
          tags: ['Posting'],
          summary: 'Delete a tweet',
          'x-payment-info': paymentInfo('posting:delete'),
          'x-bazaar': bazaarExt(S.deleteTweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.deleteTweet } } },
          responses: { 200: ok200('Tweet deleted'), 402: payment402 },
        },
      },
      '/api/ai/posting/reply': {
        post: {
          tags: ['Posting'],
          summary: 'Reply to a tweet',
          'x-payment-info': paymentInfo('posting:reply'),
          'x-bazaar': bazaarExt(S.replyTweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.replyTweet } } },
          responses: { 200: ok200('Reply posted'), 402: payment402 },
        },
      },
      '/api/ai/posting/bookmark': {
        post: {
          tags: ['Posting'],
          summary: 'Bookmark a tweet',
          'x-payment-info': paymentInfo('posting:bookmark'),
          'x-bazaar': bazaarExt(S.bookmarkTweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.bookmarkTweet } } },
          responses: { 200: ok200('Tweet bookmarked'), 402: payment402 },
        },
      },
      '/api/ai/posting/bookmarks': {
        post: {
          tags: ['Posting'],
          summary: 'Get bookmarks',
          'x-payment-info': paymentInfo('posting:bookmarks'),
          'x-bazaar': bazaarExt(S.getBookmarks),
          requestBody: { required: true, content: { 'application/json': { schema: S.getBookmarks } } },
          responses: { 200: ok200('Bookmarks list'), 402: payment402 },
        },
      },
      '/api/ai/posting/clear-bookmarks': {
        post: {
          tags: ['Posting'],
          summary: 'Clear all bookmarks',
          'x-payment-info': paymentInfo('posting:clear-bookmarks'),
          'x-bazaar': bazaarExt(S.clearBookmarks),
          requestBody: { required: true, content: { 'application/json': { schema: S.clearBookmarks } } },
          responses: { 200: ok200('Bookmarks cleared'), 402: payment402 },
        },
      },
      '/api/ai/posting/article': {
        post: {
          tags: ['Posting'],
          summary: 'Publish an article',
          'x-payment-info': paymentInfo('posting:article'),
          'x-bazaar': bazaarExt(S.publishArticle),
          requestBody: { required: true, content: { 'application/json': { schema: S.publishArticle } } },
          responses: { 200: ok200('Article published'), 402: payment402 },
        },
      },

      // ─── Engagement ──────────────────────────────────────────────
      '/api/ai/engagement/follow': {
        post: {
          tags: ['Engagement'],
          summary: 'Follow a user',
          'x-payment-info': paymentInfo('engagement:follow'),
          'x-bazaar': bazaarExt(S.engagementFollow),
          requestBody: { required: true, content: { 'application/json': { schema: S.engagementFollow } } },
          responses: { 200: ok200('Follow result'), 402: payment402 },
        },
      },
      '/api/ai/engagement/unfollow': {
        post: {
          tags: ['Engagement'],
          summary: 'Unfollow a user',
          'x-payment-info': paymentInfo('engagement:unfollow'),
          'x-bazaar': bazaarExt(S.engagementUnfollow),
          requestBody: { required: true, content: { 'application/json': { schema: S.engagementUnfollow } } },
          responses: { 200: ok200('Unfollow result'), 402: payment402 },
        },
      },
      '/api/ai/engagement/like': {
        post: {
          tags: ['Engagement'],
          summary: 'Like a tweet',
          'x-payment-info': paymentInfo('engagement:like'),
          'x-bazaar': bazaarExt(S.engagementLike),
          requestBody: { required: true, content: { 'application/json': { schema: S.engagementLike } } },
          responses: { 200: ok200('Like result'), 402: payment402 },
        },
      },
      '/api/ai/engagement/retweet': {
        post: {
          tags: ['Engagement'],
          summary: 'Retweet a tweet',
          'x-payment-info': paymentInfo('engagement:retweet'),
          'x-bazaar': bazaarExt(S.engagementRetweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.engagementRetweet } } },
          responses: { 200: ok200('Retweet result'), 402: payment402 },
        },
      },
      '/api/ai/engagement/quote-tweet': {
        post: {
          tags: ['Engagement'],
          summary: 'Quote-tweet',
          'x-payment-info': paymentInfo('engagement:quote-tweet'),
          'x-bazaar': bazaarExt(S.engagementQuoteTweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.engagementQuoteTweet } } },
          responses: { 200: ok200('Quote tweet result'), 402: payment402 },
        },
      },
      '/api/ai/engagement/auto-follow': {
        post: {
          tags: ['Engagement'],
          summary: 'Auto-follow by keyword or hashtag',
          'x-payment-info': paymentInfo('engagement:auto-follow'),
          'x-bazaar': bazaarExt(S.engagementAutoFollow),
          requestBody: { required: true, content: { 'application/json': { schema: S.engagementAutoFollow } } },
          responses: { 200: ok200('Auto-follow started'), 402: payment402 },
        },
      },
      '/api/ai/engagement/smart-unfollow': {
        post: {
          tags: ['Engagement'],
          summary: 'Smart unfollow inactive users',
          'x-payment-info': paymentInfo('engagement:smart-unfollow'),
          'x-bazaar': bazaarExt(S.engagementSmartUnfollow),
          requestBody: { required: true, content: { 'application/json': { schema: S.engagementSmartUnfollow } } },
          responses: { 200: ok200('Smart unfollow started'), 402: payment402 },
        },
      },
      '/api/ai/engagement/auto-retweet': {
        post: {
          tags: ['Engagement'],
          summary: 'Auto-retweet by keywords',
          'x-payment-info': paymentInfo('engagement:auto-retweet'),
          'x-bazaar': bazaarExt(S.engagementAutoRetweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.engagementAutoRetweet } } },
          responses: { 200: ok200('Auto-retweet started'), 402: payment402 },
        },
      },
      '/api/ai/engagement/bulk-execute': {
        post: {
          tags: ['Engagement'],
          summary: 'Bulk execute engagement actions',
          'x-payment-info': paymentInfo('engagement:bulk-execute'),
          'x-bazaar': bazaarExt(S.engagementBulkExecute),
          requestBody: { required: true, content: { 'application/json': { schema: S.engagementBulkExecute } } },
          responses: { 200: ok200('Bulk result'), 402: payment402 },
        },
      },
      '/api/ai/engagement/notifications': {
        post: {
          tags: ['Engagement'],
          summary: 'Get notifications',
          'x-payment-info': paymentInfo('engagement:notifications'),
          'x-bazaar': bazaarExt(S.engagementNotifications),
          requestBody: { required: true, content: { 'application/json': { schema: S.engagementNotifications } } },
          responses: { 200: ok200('Notifications'), 402: payment402 },
        },
      },
      '/api/ai/engagement/mute': {
        post: {
          tags: ['Engagement'],
          summary: 'Mute a user',
          'x-payment-info': paymentInfo('engagement:mute'),
          'x-bazaar': bazaarExt(S.muteUser),
          requestBody: { required: true, content: { 'application/json': { schema: S.muteUser } } },
          responses: { 200: ok200('User muted'), 402: payment402 },
        },
      },
      '/api/ai/engagement/unmute': {
        post: {
          tags: ['Engagement'],
          summary: 'Unmute a user',
          'x-payment-info': paymentInfo('engagement:unmute'),
          'x-bazaar': bazaarExt(S.unmuteUser),
          requestBody: { required: true, content: { 'application/json': { schema: S.unmuteUser } } },
          responses: { 200: ok200('User unmuted'), 402: payment402 },
        },
      },
      '/api/ai/engagement/trends': {
        post: {
          tags: ['Engagement'],
          summary: 'Get trending topics',
          'x-payment-info': paymentInfo('engagement:trends'),
          'x-bazaar': bazaarExt(S.getTrends),
          requestBody: { required: true, content: { 'application/json': { schema: S.getTrends } } },
          responses: { 200: ok200('Trending topics'), 402: payment402 },
        },
      },
      '/api/ai/engagement/explore': {
        post: {
          tags: ['Engagement'],
          summary: 'Get explore/For You feed',
          'x-payment-info': paymentInfo('engagement:explore'),
          'x-bazaar': bazaarExt(S.getExplore),
          requestBody: { required: true, content: { 'application/json': { schema: S.getExplore } } },
          responses: { 200: ok200('Explore feed'), 402: payment402 },
        },
      },
      '/api/ai/engagement/detect-bots': {
        post: {
          tags: ['Engagement'],
          summary: 'Detect bot accounts in followers',
          'x-payment-info': paymentInfo('engagement:detect-bots'),
          'x-bazaar': bazaarExt(S.detectBots),
          requestBody: { required: true, content: { 'application/json': { schema: S.detectBots } } },
          responses: { 200: ok200('Bot detection result'), 402: payment402 },
        },
      },
      '/api/ai/engagement/find-influencers': {
        post: {
          tags: ['Engagement'],
          summary: 'Find niche influencers',
          'x-payment-info': paymentInfo('engagement:find-influencers'),
          'x-bazaar': bazaarExt(S.findInfluencers),
          requestBody: { required: true, content: { 'application/json': { schema: S.findInfluencers } } },
          responses: { 200: ok200('Influencers list'), 402: payment402 },
        },
      },
      '/api/ai/engagement/smart-target': {
        post: {
          tags: ['Engagement'],
          summary: 'Smart targeting for growth',
          'x-payment-info': paymentInfo('engagement:smart-target'),
          'x-bazaar': bazaarExt(S.smartTarget),
          requestBody: { required: true, content: { 'application/json': { schema: S.smartTarget } } },
          responses: { 200: ok200('Smart targeting result'), 402: payment402 },
        },
      },
      '/api/ai/engagement/crypto-analyze': {
        post: {
          tags: ['Engagement'],
          summary: 'Crypto tweet sentiment analysis',
          'x-payment-info': paymentInfo('engagement:crypto-analyze'),
          'x-bazaar': bazaarExt(S.cryptoAnalyze),
          requestBody: { required: true, content: { 'application/json': { schema: S.cryptoAnalyze } } },
          responses: { 200: ok200('Crypto analysis'), 402: payment402 },
        },
      },
      '/api/ai/engagement/audience-insights': {
        post: {
          tags: ['Engagement'],
          summary: 'Audience demographics and insights',
          'x-payment-info': paymentInfo('engagement:audience-insights'),
          'x-bazaar': bazaarExt(S.audienceInsights),
          requestBody: { required: true, content: { 'application/json': { schema: S.audienceInsights } } },
          responses: { 200: ok200('Audience insights'), 402: payment402 },
        },
      },
      '/api/ai/engagement/engagement-report': {
        post: {
          tags: ['Engagement'],
          summary: 'Full engagement report for a user',
          'x-payment-info': paymentInfo('engagement:engagement-report'),
          'x-bazaar': bazaarExt(S.engagementReport),
          requestBody: { required: true, content: { 'application/json': { schema: S.engagementReport } } },
          responses: { 200: ok200('Engagement report'), 402: payment402 },
        },
      },

      // ─── Analytics ───────────────────────────────────────────────
      '/api/ai/analytics/account': {
        post: {
          tags: ['Analytics'],
          summary: 'Account analytics overview',
          'x-payment-info': paymentInfo('analytics:account'),
          'x-bazaar': bazaarExt(S.accountAnalytics),
          requestBody: { required: true, content: { 'application/json': { schema: S.accountAnalytics } } },
          responses: { 200: ok200('Account analytics'), 402: payment402 },
        },
      },
      '/api/ai/analytics/post': {
        post: {
          tags: ['Analytics'],
          summary: 'Post/tweet performance analytics',
          'x-payment-info': paymentInfo('analytics:post'),
          'x-bazaar': bazaarExt(S.postAnalytics),
          requestBody: { required: true, content: { 'application/json': { schema: S.postAnalytics } } },
          responses: { 200: ok200('Post analytics'), 402: payment402 },
        },
      },
      '/api/ai/analytics/creator': {
        post: {
          tags: ['Analytics'],
          summary: 'Creator monetization analytics',
          'x-payment-info': paymentInfo('analytics:creator'),
          'x-bazaar': bazaarExt(S.creatorAnalytics),
          requestBody: { required: true, content: { 'application/json': { schema: S.creatorAnalytics } } },
          responses: { 200: ok200('Creator analytics'), 402: payment402 },
        },
      },
      '/api/ai/analytics/brand-monitor': {
        post: {
          tags: ['Analytics'],
          summary: 'Brand mention monitoring',
          'x-payment-info': paymentInfo('analytics:brand-monitor'),
          'x-bazaar': bazaarExt(S.brandMonitor),
          requestBody: { required: true, content: { 'application/json': { schema: S.brandMonitor } } },
          responses: { 200: ok200('Brand monitor result'), 402: payment402 },
        },
      },
      '/api/ai/analytics/competitor': {
        post: {
          tags: ['Analytics'],
          summary: 'Competitor analysis',
          'x-payment-info': paymentInfo('analytics:competitor'),
          'x-bazaar': bazaarExt(S.competitorAnalysis),
          requestBody: { required: true, content: { 'application/json': { schema: S.competitorAnalysis } } },
          responses: { 200: ok200('Competitor analysis'), 402: payment402 },
        },
      },
      '/api/ai/analytics/audience-overlap': {
        post: {
          tags: ['Analytics'],
          summary: 'Audience overlap between two accounts',
          'x-payment-info': paymentInfo('analytics:audience-overlap'),
          'x-bazaar': bazaarExt(S.audienceOverlap),
          requestBody: { required: true, content: { 'application/json': { schema: S.audienceOverlap } } },
          responses: { 200: ok200('Audience overlap'), 402: payment402 },
        },
      },
      '/api/ai/analytics/history': {
        post: {
          tags: ['Analytics'],
          summary: 'Analytics history over time',
          'x-payment-info': paymentInfo('analytics:history'),
          'x-bazaar': bazaarExt(S.analyticsHistory),
          requestBody: { required: true, content: { 'application/json': { schema: S.analyticsHistory } } },
          responses: { 200: ok200('Analytics history'), 402: payment402 },
        },
      },
      '/api/ai/analytics/snapshot': {
        post: {
          tags: ['Analytics'],
          summary: 'Take analytics snapshot',
          'x-payment-info': paymentInfo('analytics:snapshot'),
          'x-bazaar': bazaarExt(S.analyticsSnapshot),
          requestBody: { required: true, content: { 'application/json': { schema: S.analyticsSnapshot } } },
          responses: { 200: ok200('Snapshot taken'), 402: payment402 },
        },
      },
      '/api/ai/analytics/growth-rate': {
        post: {
          tags: ['Analytics'],
          summary: 'Follower growth rate',
          'x-payment-info': paymentInfo('analytics:growth-rate'),
          'x-bazaar': bazaarExt(S.growthRate),
          requestBody: { required: true, content: { 'application/json': { schema: S.growthRate } } },
          responses: { 200: ok200('Growth rate'), 402: payment402 },
        },
      },
      '/api/ai/analytics/compare-accounts': {
        post: {
          tags: ['Analytics'],
          summary: 'Compare multiple accounts',
          'x-payment-info': paymentInfo('analytics:compare-accounts'),
          'x-bazaar': bazaarExt(S.compareAccounts),
          requestBody: { required: true, content: { 'application/json': { schema: S.compareAccounts } } },
          responses: { 200: ok200('Account comparison'), 402: payment402 },
        },
      },
      '/api/ai/analytics/analyze-voice': {
        post: {
          tags: ['Analytics'],
          summary: 'Analyze writing voice from tweets',
          'x-payment-info': paymentInfo('analytics:analyze-voice'),
          'x-bazaar': bazaarExt(S.analyticsAnalyzeVoice),
          requestBody: { required: true, content: { 'application/json': { schema: S.analyticsAnalyzeVoice } } },
          responses: { 200: ok200('Voice analysis'), 402: payment402 },
        },
      },
      '/api/ai/analytics/generate-tweet': {
        post: {
          tags: ['Analytics'],
          summary: 'Generate tweet in user voice',
          'x-payment-info': paymentInfo('analytics:generate-tweet'),
          'x-bazaar': bazaarExt(S.analyticsGenerateTweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.analyticsGenerateTweet } } },
          responses: { 200: ok200('Generated tweet'), 402: payment402 },
        },
      },
      '/api/ai/analytics/rewrite-tweet': {
        post: {
          tags: ['Analytics'],
          summary: 'Rewrite a tweet for better engagement',
          'x-payment-info': paymentInfo('analytics:rewrite-tweet'),
          'x-bazaar': bazaarExt(S.analyticsRewriteTweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.analyticsRewriteTweet } } },
          responses: { 200: ok200('Rewritten tweet'), 402: payment402 },
        },
      },
      '/api/ai/analytics/summarize-thread': {
        post: {
          tags: ['Analytics'],
          summary: 'Summarize a thread',
          'x-payment-info': paymentInfo('analytics:summarize-thread'),
          'x-bazaar': bazaarExt(S.summarizeThread),
          requestBody: { required: true, content: { 'application/json': { schema: S.summarizeThread } } },
          responses: { 200: ok200('Thread summary'), 402: payment402 },
        },
      },
      '/api/ai/analytics/best-time': {
        post: {
          tags: ['Analytics'],
          summary: 'Best time to post analysis',
          'x-payment-info': paymentInfo('analytics:best-time'),
          'x-bazaar': bazaarExt(S.bestTime),
          requestBody: { required: true, content: { 'application/json': { schema: S.bestTime } } },
          responses: { 200: ok200('Best time to post'), 402: payment402 },
        },
      },

      // ─── Messages ────────────────────────────────────────────────
      '/api/ai/messages/send': {
        post: {
          tags: ['Messages'],
          summary: 'Send a direct message',
          'x-payment-info': paymentInfo('messages:send'),
          'x-bazaar': bazaarExt(S.sendDM),
          requestBody: { required: true, content: { 'application/json': { schema: S.sendDM } } },
          responses: { 200: ok200('DM sent'), 402: payment402 },
        },
      },
      '/api/ai/messages/conversations': {
        post: {
          tags: ['Messages'],
          summary: 'List DM conversations',
          'x-payment-info': paymentInfo('messages:conversations'),
          'x-bazaar': bazaarExt(S.listConversations),
          requestBody: { required: true, content: { 'application/json': { schema: S.listConversations } } },
          responses: { 200: ok200('Conversations list'), 402: payment402 },
        },
      },
      '/api/ai/messages/export': {
        post: {
          tags: ['Messages'],
          summary: 'Export DM history',
          'x-payment-info': paymentInfo('messages:export'),
          'x-bazaar': bazaarExt(S.exportDMs),
          requestBody: { required: true, content: { 'application/json': { schema: S.exportDMs } } },
          responses: { 200: ok200('DM export'), 402: payment402 },
        },
      },

      // ─── Profile ─────────────────────────────────────────────────
      '/api/ai/profile/update': {
        post: {
          tags: ['Profile'],
          summary: 'Update profile info',
          'x-payment-info': paymentInfo('profile:update'),
          'x-bazaar': bazaarExt(S.updateProfile),
          requestBody: { required: true, content: { 'application/json': { schema: S.updateProfile } } },
          responses: { 200: ok200('Profile updated'), 402: payment402 },
        },
      },
      '/api/ai/profile/check-premium': {
        post: {
          tags: ['Profile'],
          summary: 'Check Premium/Blue status',
          'x-payment-info': paymentInfo('profile:check-premium'),
          'x-bazaar': bazaarExt(S.checkPremium),
          requestBody: { required: true, content: { 'application/json': { schema: S.checkPremium } } },
          responses: { 200: ok200('Premium status'), 402: payment402 },
        },
      },
      '/api/ai/profile/settings': {
        post: {
          tags: ['Profile'],
          summary: 'Get account settings',
          'x-payment-info': paymentInfo('profile:settings'),
          'x-bazaar': bazaarExt(S.getSettings),
          requestBody: { required: true, content: { 'application/json': { schema: S.getSettings } } },
          responses: { 200: ok200('Account settings'), 402: payment402 },
        },
      },
      '/api/ai/profile/toggle-protected': {
        post: {
          tags: ['Profile'],
          summary: 'Toggle protected tweets',
          'x-payment-info': paymentInfo('profile:toggle-protected'),
          'x-bazaar': bazaarExt(S.toggleProtected),
          requestBody: { required: true, content: { 'application/json': { schema: S.toggleProtected } } },
          responses: { 200: ok200('Protected mode toggled'), 402: payment402 },
        },
      },
      '/api/ai/profile/blocked': {
        post: {
          tags: ['Profile'],
          summary: 'Get blocked accounts',
          'x-payment-info': paymentInfo('profile:blocked'),
          'x-bazaar': bazaarExt(S.getBlocked),
          requestBody: { required: true, content: { 'application/json': { schema: S.getBlocked } } },
          responses: { 200: ok200('Blocked accounts'), 402: payment402 },
        },
      },

      // ─── Grok ────────────────────────────────────────────────────
      '/api/ai/grok/query': {
        post: {
          tags: ['Grok'],
          summary: 'Query Grok AI',
          'x-payment-info': paymentInfo('grok:query'),
          'x-bazaar': bazaarExt(S.grokQuery),
          requestBody: { required: true, content: { 'application/json': { schema: S.grokQuery } } },
          responses: { 200: ok200('Grok response'), 402: payment402 },
        },
      },
      '/api/ai/grok/summarize': {
        post: {
          tags: ['Grok'],
          summary: 'Summarize topic with Grok',
          'x-payment-info': paymentInfo('grok:summarize'),
          'x-bazaar': bazaarExt(S.grokSummarize),
          requestBody: { required: true, content: { 'application/json': { schema: S.grokSummarize } } },
          responses: { 200: ok200('Topic summary'), 402: payment402 },
        },
      },
      '/api/ai/grok/analyze-image': {
        post: {
          tags: ['Grok'],
          summary: 'Analyze image with Grok',
          'x-payment-info': paymentInfo('grok:analyze-image'),
          'x-bazaar': bazaarExt(S.grokAnalyzeImage),
          requestBody: { required: true, content: { 'application/json': { schema: S.grokAnalyzeImage } } },
          responses: { 200: ok200('Image analysis'), 402: payment402 },
        },
      },

      // ─── Lists ───────────────────────────────────────────────────
      '/api/ai/lists/all': {
        post: {
          tags: ['Lists'],
          summary: 'Get all lists',
          'x-payment-info': paymentInfo('lists:all'),
          'x-bazaar': bazaarExt(S.getLists),
          requestBody: { required: true, content: { 'application/json': { schema: S.getLists } } },
          responses: { 200: ok200('Lists'), 402: payment402 },
        },
      },
      '/api/ai/lists/members': {
        post: {
          tags: ['Lists'],
          summary: 'Get list members',
          'x-payment-info': paymentInfo('lists:members'),
          'x-bazaar': bazaarExt(S.getListMembers),
          requestBody: { required: true, content: { 'application/json': { schema: S.getListMembers } } },
          responses: { 200: ok200('List members'), 402: payment402 },
        },
      },

      // ─── Spaces ──────────────────────────────────────────────────
      '/api/ai/spaces/list': {
        post: {
          tags: ['Spaces'],
          summary: 'Discover live Spaces',
          'x-payment-info': paymentInfo('spaces:list'),
          'x-bazaar': bazaarExt(S.listSpaces),
          requestBody: { required: true, content: { 'application/json': { schema: S.listSpaces } } },
          responses: { 200: ok200('Live Spaces'), 402: payment402 },
        },
      },
      '/api/ai/spaces/scrape': {
        post: {
          tags: ['Spaces'],
          summary: 'Scrape Space metadata',
          'x-payment-info': paymentInfo('spaces:scrape'),
          'x-bazaar': bazaarExt(S.scrapeSpace),
          requestBody: { required: true, content: { 'application/json': { schema: S.scrapeSpace } } },
          responses: { 200: ok200('Space metadata'), 402: payment402 },
        },
      },
      '/api/ai/spaces/join': {
        post: {
          tags: ['Spaces'],
          summary: 'Join a Space',
          'x-payment-info': paymentInfo('spaces:join'),
          'x-bazaar': bazaarExt(S.joinSpace),
          requestBody: { required: true, content: { 'application/json': { schema: S.joinSpace } } },
          responses: { 200: ok200('Joined Space'), 402: payment402 },
        },
      },
      '/api/ai/spaces/leave': {
        post: {
          tags: ['Spaces'],
          summary: 'Leave a Space',
          'x-payment-info': paymentInfo('spaces:leave'),
          'x-bazaar': bazaarExt(S.leaveSpace),
          requestBody: { required: true, content: { 'application/json': { schema: S.leaveSpace } } },
          responses: { 200: ok200('Left Space'), 402: payment402 },
        },
      },
      '/api/ai/spaces/status': {
        post: {
          tags: ['Spaces'],
          summary: 'Get Space status',
          'x-payment-info': paymentInfo('spaces:status'),
          'x-bazaar': bazaarExt(S.spaceStatus),
          requestBody: { required: true, content: { 'application/json': { schema: S.spaceStatus } } },
          responses: { 200: ok200('Space status'), 402: payment402 },
        },
      },
      '/api/ai/spaces/transcript': {
        post: {
          tags: ['Spaces'],
          summary: 'Get Space transcript',
          'x-payment-info': paymentInfo('spaces:transcript'),
          'x-bazaar': bazaarExt(S.spaceTranscript),
          requestBody: { required: true, content: { 'application/json': { schema: S.spaceTranscript } } },
          responses: { 200: ok200('Space transcript'), 402: payment402 },
        },
      },

      // ─── Monitoring extras ───────────────────────────────────────
      '/api/ai/monitor/following': {
        post: {
          tags: ['Monitoring'],
          summary: 'Monitor following changes',
          'x-payment-info': paymentInfo('monitor:following'),
          'x-bazaar': bazaarExt(S.monitorFollowing),
          requestBody: { required: true, content: { 'application/json': { schema: S.monitorFollowing } } },
          responses: { 200: ok200('Following snapshot'), 402: payment402 },
        },
      },
      '/api/ai/monitor/compare': {
        post: {
          tags: ['Monitoring'],
          summary: 'Compare follower snapshots',
          'x-payment-info': paymentInfo('monitor:compare'),
          'x-bazaar': bazaarExt(S.monitorCompare),
          requestBody: { required: true, content: { 'application/json': { schema: S.monitorCompare } } },
          responses: { 200: ok200('Snapshot diff'), 402: payment402 },
        },
      },
      '/api/ai/monitor/keyword': {
        post: {
          tags: ['Monitoring'],
          summary: 'Monitor keyword mentions',
          'x-payment-info': paymentInfo('monitor:keyword'),
          'x-bazaar': bazaarExt(S.monitorKeyword),
          requestBody: { required: true, content: { 'application/json': { schema: S.monitorKeyword } } },
          responses: { 200: ok200('Keyword monitor started'), 402: payment402 },
        },
      },
      '/api/ai/monitor/follower-alerts': {
        post: {
          tags: ['Monitoring'],
          summary: 'Get follower change alerts',
          'x-payment-info': paymentInfo('monitor:follower-alerts'),
          'x-bazaar': bazaarExt(S.followerAlerts),
          requestBody: { required: true, content: { 'application/json': { schema: S.followerAlerts } } },
          responses: { 200: ok200('Follower alerts'), 402: payment402 },
        },
      },
      '/api/ai/monitor/track-engagement': {
        post: {
          tags: ['Monitoring'],
          summary: 'Track tweet engagement over time',
          'x-payment-info': paymentInfo('monitor:track-engagement'),
          'x-bazaar': bazaarExt(S.trackEngagement),
          requestBody: { required: true, content: { 'application/json': { schema: S.trackEngagement } } },
          responses: { 200: ok200('Engagement tracking started'), 402: payment402 },
        },
      },
      '/api/ai/monitor/snapshot/{username}': {
        get: {
          tags: ['Monitoring'],
          summary: 'Get latest snapshot for a username',
          parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: ok200('Latest snapshot') },
        },
        delete: {
          tags: ['Monitoring'],
          summary: 'Delete a snapshot',
          parameters: [{ name: 'username', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: ok200('Snapshot deleted') },
        },
      },
      '/api/ai/monitor/list': {
        get: {
          tags: ['Monitoring'],
          summary: 'List monitored accounts',
          responses: { 200: ok200('Monitored accounts') },
        },
      },

      // ─── Sentiment ───────────────────────────────────────────────
      '/api/ai/sentiment/analyze': {
        post: {
          tags: ['Sentiment'],
          summary: 'Analyze tweet sentiment',
          'x-payment-info': paymentInfo('sentiment:analyze'),
          'x-bazaar': bazaarExt(S.analyzeSentiment),
          requestBody: { required: true, content: { 'application/json': { schema: S.analyzeSentiment } } },
          responses: { 200: ok200('Sentiment analysis'), 402: payment402 },
        },
      },
      '/api/ai/sentiment/monitor': {
        post: {
          tags: ['Sentiment'],
          summary: 'Monitor brand reputation',
          'x-payment-info': paymentInfo('sentiment:monitor'),
          'x-bazaar': bazaarExt(S.monitorSentiment),
          requestBody: { required: true, content: { 'application/json': { schema: S.monitorSentiment } } },
          responses: { 200: ok200('Sentiment monitor started'), 402: payment402 },
        },
      },
      '/api/ai/sentiment/report': {
        post: {
          tags: ['Sentiment'],
          summary: 'Reputation report',
          'x-payment-info': paymentInfo('sentiment:report'),
          'x-bazaar': bazaarExt(S.sentimentReport),
          requestBody: { required: true, content: { 'application/json': { schema: S.sentimentReport } } },
          responses: { 200: ok200('Reputation report'), 402: payment402 },
        },
      },

      // ─── Streams ─────────────────────────────────────────────────
      '/api/ai/streams/start': {
        post: {
          tags: ['Streams'],
          summary: 'Start a keyword stream',
          'x-payment-info': paymentInfo('streams:start'),
          'x-bazaar': bazaarExt(S.startStream),
          requestBody: { required: true, content: { 'application/json': { schema: S.startStream } } },
          responses: { 200: ok200('Stream started'), 402: payment402 },
        },
      },
      '/api/ai/streams/stop': {
        post: {
          tags: ['Streams'],
          summary: 'Stop a stream',
          'x-payment-info': paymentInfo('streams:stop'),
          'x-bazaar': bazaarExt(S.stopStream),
          requestBody: { required: true, content: { 'application/json': { schema: S.stopStream } } },
          responses: { 200: ok200('Stream stopped'), 402: payment402 },
        },
      },
      '/api/ai/streams/list': {
        post: {
          tags: ['Streams'],
          summary: 'List active streams',
          requestBody: { required: true, content: { 'application/json': { schema: S.listStreams } } },
          responses: { 200: ok200('Active streams') },
        },
      },
      '/api/ai/streams/pause': {
        post: {
          tags: ['Streams'],
          summary: 'Pause a stream',
          'x-payment-info': paymentInfo('streams:pause'),
          'x-bazaar': bazaarExt(S.pauseStream),
          requestBody: { required: true, content: { 'application/json': { schema: S.pauseStream } } },
          responses: { 200: ok200('Stream paused'), 402: payment402 },
        },
      },
      '/api/ai/streams/resume': {
        post: {
          tags: ['Streams'],
          summary: 'Resume a paused stream',
          'x-payment-info': paymentInfo('streams:resume'),
          'x-bazaar': bazaarExt(S.resumeStream),
          requestBody: { required: true, content: { 'application/json': { schema: S.resumeStream } } },
          responses: { 200: ok200('Stream resumed'), 402: payment402 },
        },
      },
      '/api/ai/streams/status': {
        post: {
          tags: ['Streams'],
          summary: 'Get stream status',
          requestBody: { required: true, content: { 'application/json': { schema: S.streamStatus } } },
          responses: { 200: ok200('Stream status') },
        },
      },
      '/api/ai/streams/history': {
        post: {
          tags: ['Streams'],
          summary: 'Stream history',
          'x-payment-info': paymentInfo('streams:history'),
          'x-bazaar': bazaarExt(S.streamHistory),
          requestBody: { required: true, content: { 'application/json': { schema: S.streamHistory } } },
          responses: { 200: ok200('Stream history'), 402: payment402 },
        },
      },

      // ─── Workflows ───────────────────────────────────────────────
      '/api/ai/workflows/actions': {
        post: {
          tags: ['Workflows'],
          summary: 'List available workflow actions',
          requestBody: { required: true, content: { 'application/json': { schema: S.listWorkflowActions } } },
          responses: { 200: ok200('Available actions') },
        },
      },
      '/api/ai/workflows/create': {
        post: {
          tags: ['Workflows'],
          summary: 'Create a workflow',
          'x-payment-info': paymentInfo('workflows:create'),
          'x-bazaar': bazaarExt(S.createWorkflow),
          requestBody: { required: true, content: { 'application/json': { schema: S.createWorkflow } } },
          responses: { 200: ok200('Workflow created'), 402: payment402 },
        },
      },
      '/api/ai/workflows/run': {
        post: {
          tags: ['Workflows'],
          summary: 'Run a workflow',
          'x-payment-info': paymentInfo('workflows:run'),
          'x-bazaar': bazaarExt(S.runWorkflow),
          requestBody: { required: true, content: { 'application/json': { schema: S.runWorkflow } } },
          responses: { 200: ok200('Workflow started'), 402: payment402 },
        },
      },
      '/api/ai/workflows/list': {
        post: {
          tags: ['Workflows'],
          summary: 'List saved workflows',
          requestBody: { required: true, content: { 'application/json': { schema: S.listWorkflows } } },
          responses: { 200: ok200('Workflows list') },
        },
      },

      // ─── Personas ────────────────────────────────────────────────
      '/api/ai/personas/presets': {
        post: {
          tags: ['Personas'],
          summary: 'List persona presets',
          requestBody: { required: true, content: { 'application/json': { schema: S.personaPresets } } },
          responses: { 200: ok200('Persona presets') },
        },
      },
      '/api/ai/personas/create': {
        post: {
          tags: ['Personas'],
          summary: 'Create an automation persona',
          'x-payment-info': paymentInfo('personas:create'),
          'x-bazaar': bazaarExt(S.createPersona),
          requestBody: { required: true, content: { 'application/json': { schema: S.createPersona } } },
          responses: { 200: ok200('Persona created'), 402: payment402 },
        },
      },
      '/api/ai/personas/list': {
        post: {
          tags: ['Personas'],
          summary: 'List personas',
          requestBody: { required: true, content: { 'application/json': { schema: S.listPersonas } } },
          responses: { 200: ok200('Personas list') },
        },
      },
      '/api/ai/personas/status': {
        post: {
          tags: ['Personas'],
          summary: 'Get persona status',
          requestBody: { required: true, content: { 'application/json': { schema: S.personaStatus } } },
          responses: { 200: ok200('Persona status') },
        },
      },
      '/api/ai/personas/edit': {
        post: {
          tags: ['Personas'],
          summary: 'Edit a persona',
          'x-payment-info': paymentInfo('personas:edit'),
          'x-bazaar': bazaarExt(S.editPersona),
          requestBody: { required: true, content: { 'application/json': { schema: S.editPersona } } },
          responses: { 200: ok200('Persona updated'), 402: payment402 },
        },
      },
      '/api/ai/personas/delete': {
        post: {
          tags: ['Personas'],
          summary: 'Delete a persona',
          'x-payment-info': paymentInfo('personas:delete'),
          'x-bazaar': bazaarExt(S.deletePersona),
          requestBody: { required: true, content: { 'application/json': { schema: S.deletePersona } } },
          responses: { 200: ok200('Persona deleted'), 402: payment402 },
        },
      },
      '/api/ai/personas/run': {
        post: {
          tags: ['Personas'],
          summary: 'Run a persona',
          'x-payment-info': paymentInfo('personas:run'),
          'x-bazaar': bazaarExt(S.runPersona),
          requestBody: { required: true, content: { 'application/json': { schema: S.runPersona } } },
          responses: { 200: ok200('Persona started'), 402: payment402 },
        },
      },

      // ─── Graph ───────────────────────────────────────────────────
      '/api/ai/graph/build': {
        post: {
          tags: ['Graph'],
          summary: 'Build social graph',
          'x-payment-info': paymentInfo('graph:build'),
          'x-bazaar': bazaarExt(S.buildGraph),
          requestBody: { required: true, content: { 'application/json': { schema: S.buildGraph } } },
          responses: { 200: ok200('Graph built'), 402: payment402 },
        },
      },
      '/api/ai/graph/analyze': {
        post: {
          tags: ['Graph'],
          summary: 'Analyze social graph',
          'x-payment-info': paymentInfo('graph:analyze'),
          'x-bazaar': bazaarExt(S.analyzeGraph),
          requestBody: { required: true, content: { 'application/json': { schema: S.analyzeGraph } } },
          responses: { 200: ok200('Graph analysis'), 402: payment402 },
        },
      },
      '/api/ai/graph/recommendations': {
        post: {
          tags: ['Graph'],
          summary: 'Graph-based account recommendations',
          'x-payment-info': paymentInfo('graph:recommendations'),
          'x-bazaar': bazaarExt(S.graphRecommendations),
          requestBody: { required: true, content: { 'application/json': { schema: S.graphRecommendations } } },
          responses: { 200: ok200('Graph recommendations'), 402: payment402 },
        },
      },
      '/api/ai/graph/list': {
        post: {
          tags: ['Graph'],
          summary: 'List saved graphs',
          requestBody: { required: true, content: { 'application/json': { schema: S.listGraphs } } },
          responses: { 200: ok200('Graphs list') },
        },
      },

      // ─── Portability ─────────────────────────────────────────────
      '/api/ai/portability/platforms': {
        post: {
          tags: ['Portability'],
          summary: 'List supported platforms for migration',
          requestBody: { required: true, content: { 'application/json': { schema: S.listPlatforms } } },
          responses: { 200: ok200('Supported platforms') },
        },
      },
      '/api/ai/portability/export-account': {
        post: {
          tags: ['Portability'],
          summary: 'Export full account data',
          'x-payment-info': paymentInfo('portability:export-account'),
          'x-bazaar': bazaarExt(S.exportAccount),
          requestBody: { required: true, content: { 'application/json': { schema: S.exportAccount } } },
          responses: { 200: ok200('Account export'), 402: payment402 },
        },
      },
      '/api/ai/portability/migrate': {
        post: {
          tags: ['Portability'],
          summary: 'Migrate account to another platform',
          'x-payment-info': paymentInfo('portability:migrate'),
          'x-bazaar': bazaarExt(S.migrateAccount),
          requestBody: { required: true, content: { 'application/json': { schema: S.migrateAccount } } },
          responses: { 200: ok200('Migration started'), 402: payment402 },
        },
      },
      '/api/ai/portability/diff': {
        post: {
          tags: ['Portability'],
          summary: 'Diff two account exports',
          'x-payment-info': paymentInfo('portability:diff'),
          'x-bazaar': bazaarExt(S.diffExports),
          requestBody: { required: true, content: { 'application/json': { schema: S.diffExports } } },
          responses: { 200: ok200('Export diff'), 402: payment402 },
        },
      },
      '/api/ai/portability/import': {
        post: {
          tags: ['Portability'],
          summary: 'Import data from another platform',
          'x-payment-info': paymentInfo('portability:import'),
          'x-bazaar': bazaarExt(S.importData),
          requestBody: { required: true, content: { 'application/json': { schema: S.importData } } },
          responses: { 200: ok200('Import started'), 402: payment402 },
        },
      },
      '/api/ai/portability/convert': {
        post: {
          tags: ['Portability'],
          summary: 'Convert data format',
          'x-payment-info': paymentInfo('portability:convert'),
          'x-bazaar': bazaarExt(S.convertFormat),
          requestBody: { required: true, content: { 'application/json': { schema: S.convertFormat } } },
          responses: { 200: ok200('Converted data'), 402: payment402 },
        },
      },

      // ─── CRM ─────────────────────────────────────────────────────
      '/api/ai/crm/sync': {
        post: {
          tags: ['CRM'],
          summary: 'Sync followers to CRM',
          'x-payment-info': paymentInfo('crm:sync'),
          'x-bazaar': bazaarExt(S.syncCRM),
          requestBody: { required: true, content: { 'application/json': { schema: S.syncCRM } } },
          responses: { 200: ok200('CRM synced'), 402: payment402 },
        },
      },
      '/api/ai/crm/tag': {
        post: {
          tags: ['CRM'],
          summary: 'Tag a contact',
          'x-payment-info': paymentInfo('crm:tag'),
          'x-bazaar': bazaarExt(S.tagContact),
          requestBody: { required: true, content: { 'application/json': { schema: S.tagContact } } },
          responses: { 200: ok200('Contact tagged'), 402: payment402 },
        },
      },
      '/api/ai/crm/search': {
        post: {
          tags: ['CRM'],
          summary: 'Search CRM contacts',
          'x-payment-info': paymentInfo('crm:search'),
          'x-bazaar': bazaarExt(S.searchCRM),
          requestBody: { required: true, content: { 'application/json': { schema: S.searchCRM } } },
          responses: { 200: ok200('CRM search results'), 402: payment402 },
        },
      },
      '/api/ai/crm/segment': {
        post: {
          tags: ['CRM'],
          summary: 'Create CRM segment',
          'x-payment-info': paymentInfo('crm:segment'),
          'x-bazaar': bazaarExt(S.segmentCRM),
          requestBody: { required: true, content: { 'application/json': { schema: S.segmentCRM } } },
          responses: { 200: ok200('CRM segment'), 402: payment402 },
        },
      },

      // ─── Schedule ────────────────────────────────────────────────
      '/api/ai/schedule/add': {
        post: {
          tags: ['Schedule'],
          summary: 'Schedule a post',
          'x-payment-info': paymentInfo('schedule:add'),
          'x-bazaar': bazaarExt(S.addScheduled),
          requestBody: { required: true, content: { 'application/json': { schema: S.addScheduled } } },
          responses: { 200: ok200('Post scheduled'), 402: payment402 },
        },
      },
      '/api/ai/schedule/list': {
        post: {
          tags: ['Schedule'],
          summary: 'List scheduled posts',
          requestBody: { required: true, content: { 'application/json': { schema: S.listScheduled } } },
          responses: { 200: ok200('Scheduled posts') },
        },
      },
      '/api/ai/schedule/remove': {
        post: {
          tags: ['Schedule'],
          summary: 'Remove a scheduled post',
          'x-payment-info': paymentInfo('schedule:remove'),
          'x-bazaar': bazaarExt(S.removeScheduled),
          requestBody: { required: true, content: { 'application/json': { schema: S.removeScheduled } } },
          responses: { 200: ok200('Scheduled post removed'), 402: payment402 },
        },
      },
      '/api/ai/schedule/rss-add': {
        post: {
          tags: ['Schedule'],
          summary: 'Add RSS feed for auto-posting',
          'x-payment-info': paymentInfo('schedule:rss-add'),
          'x-bazaar': bazaarExt(S.addRSS),
          requestBody: { required: true, content: { 'application/json': { schema: S.addRSS } } },
          responses: { 200: ok200('RSS feed added'), 402: payment402 },
        },
      },
      '/api/ai/schedule/rss-check': {
        post: {
          tags: ['Schedule'],
          summary: 'Check RSS feed for new items',
          'x-payment-info': paymentInfo('schedule:rss-check'),
          'x-bazaar': bazaarExt(S.checkRSS),
          requestBody: { required: true, content: { 'application/json': { schema: S.checkRSS } } },
          responses: { 200: ok200('RSS feed items'), 402: payment402 },
        },
      },
      '/api/ai/schedule/rss-drafts': {
        post: {
          tags: ['Schedule'],
          summary: 'Get RSS-generated drafts',
          requestBody: { required: true, content: { 'application/json': { schema: S.getRSSDrafts } } },
          responses: { 200: ok200('RSS drafts') },
        },
      },
      '/api/ai/schedule/evergreen': {
        post: {
          tags: ['Schedule'],
          summary: 'Find evergreen content to recycle',
          'x-payment-info': paymentInfo('schedule:evergreen'),
          'x-bazaar': bazaarExt(S.findEvergreen),
          requestBody: { required: true, content: { 'application/json': { schema: S.findEvergreen } } },
          responses: { 200: ok200('Evergreen content'), 402: payment402 },
        },
      },

      // ─── Optimizer ───────────────────────────────────────────────
      '/api/ai/optimizer/optimize': {
        post: {
          tags: ['Optimizer'],
          summary: 'Optimize a tweet for engagement',
          'x-payment-info': paymentInfo('optimizer:optimize'),
          'x-bazaar': bazaarExt(S.optimizeTweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.optimizeTweet } } },
          responses: { 200: ok200('Optimized tweet'), 402: payment402 },
        },
      },
      '/api/ai/optimizer/hashtags': {
        post: {
          tags: ['Optimizer'],
          summary: 'Suggest relevant hashtags',
          'x-payment-info': paymentInfo('optimizer:hashtags'),
          'x-bazaar': bazaarExt(S.suggestHashtags),
          requestBody: { required: true, content: { 'application/json': { schema: S.suggestHashtags } } },
          responses: { 200: ok200('Hashtag suggestions'), 402: payment402 },
        },
      },
      '/api/ai/optimizer/predict': {
        post: {
          tags: ['Optimizer'],
          summary: 'Predict tweet performance',
          'x-payment-info': paymentInfo('optimizer:predict'),
          'x-bazaar': bazaarExt(S.predictPerformance),
          requestBody: { required: true, content: { 'application/json': { schema: S.predictPerformance } } },
          responses: { 200: ok200('Performance prediction'), 402: payment402 },
        },
      },
      '/api/ai/optimizer/variations': {
        post: {
          tags: ['Optimizer'],
          summary: 'Generate tweet variations',
          'x-payment-info': paymentInfo('optimizer:variations'),
          'x-bazaar': bazaarExt(S.generateVariations),
          requestBody: { required: true, content: { 'application/json': { schema: S.generateVariations } } },
          responses: { 200: ok200('Tweet variations'), 402: payment402 },
        },
      },

      // ─── Utility extras ──────────────────────────────────────────
      '/api/ai/analyze/profile': {
        post: {
          tags: ['Utility'],
          summary: 'Deep profile analysis',
          'x-payment-info': paymentInfo('analyze:profile'),
          'x-bazaar': bazaarExt(S.analyzeProfile),
          requestBody: { required: true, content: { 'application/json': { schema: S.analyzeProfile } } },
          responses: { 200: ok200('Profile analysis'), 402: payment402 },
        },
      },
      '/api/ai/analyze/tweet': {
        post: {
          tags: ['Utility'],
          summary: 'Analyze a single tweet',
          'x-payment-info': paymentInfo('analyze:tweet'),
          'x-bazaar': bazaarExt(S.analyzeTweet),
          requestBody: { required: true, content: { 'application/json': { schema: S.analyzeTweet } } },
          responses: { 200: ok200('Tweet analysis'), 402: payment402 },
        },
      },

      // ─── Notifications ───────────────────────────────────────────
      '/api/ai/notify/send': {
        post: {
          tags: ['Notifications'],
          summary: 'Send webhook notification',
          'x-payment-info': paymentInfo('notify:send'),
          'x-bazaar': bazaarExt(S.sendWebhook),
          requestBody: { required: true, content: { 'application/json': { schema: S.sendWebhook } } },
          responses: { 200: ok200('Notification sent'), 402: payment402 },
        },
      },
      '/api/ai/notify/test': {
        post: {
          tags: ['Notifications'],
          summary: 'Test a webhook URL',
          requestBody: { required: true, content: { 'application/json': { schema: S.testWebhook } } },
          responses: { 200: ok200('Webhook test result') },
        },
      },

      // ─── Datasets ────────────────────────────────────────────────
      '/api/ai/datasets/list': {
        post: {
          tags: ['Datasets'],
          summary: 'List available datasets',
          requestBody: { required: true, content: { 'application/json': { schema: S.listDatasets } } },
          responses: { 200: ok200('Datasets list') },
        },
      },
      '/api/ai/datasets/get': {
        post: {
          tags: ['Datasets'],
          summary: 'Fetch a dataset',
          'x-payment-info': paymentInfo('datasets:get'),
          'x-bazaar': bazaarExt(S.getDataset),
          requestBody: { required: true, content: { 'application/json': { schema: S.getDataset } } },
          responses: { 200: ok200('Dataset'), 402: payment402 },
        },
      },

      // ─── Teams ───────────────────────────────────────────────────
      '/api/ai/teams/create': {
        post: {
          tags: ['Teams'],
          summary: 'Create a team',
          'x-payment-info': paymentInfo('teams:create'),
          'x-bazaar': bazaarExt(S.createTeam),
          requestBody: { required: true, content: { 'application/json': { schema: S.createTeam } } },
          responses: { 200: ok200('Team created'), 402: payment402 },
        },
      },
      '/api/ai/teams/members': {
        post: {
          tags: ['Teams'],
          summary: 'Get team members',
          'x-payment-info': paymentInfo('teams:members'),
          'x-bazaar': bazaarExt(S.getTeamMembers),
          requestBody: { required: true, content: { 'application/json': { schema: S.getTeamMembers } } },
          responses: { 200: ok200('Team members'), 402: payment402 },
        },
      },

      // ─── Scripts ─────────────────────────────────────────────────
      '/api/scripts': {
        get: {
          tags: ['Scripts'],
          summary: 'List all available browser scripts with prices',
          responses: { 200: ok200('Scripts list') },
        },
      },
      '/api/scripts/src/{name}': {
        get: {
          tags: ['Scripts'],
          summary: 'Download a browser script from src/',
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: ok200('Script content'), 402: payment402 },
        },
      },
      '/api/scripts/automation/{name}': {
        get: {
          tags: ['Scripts'],
          summary: 'Download an automation script',
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 200: ok200('Script content'), 402: payment402 },
        },
      },
    },

    tags: [
      { name: 'Scraping', description: 'Structured data extraction from X/Twitter' },
      { name: 'Actions', description: 'Account automation (unfollow, like, follow, auto-actions)' },
      { name: 'Posting', description: 'Tweet creation, threads, polls, scheduling, bookmarks' },
      { name: 'Engagement', description: 'Follow, like, retweet, mute, trends, bot detection' },
      { name: 'Analytics', description: 'Account analytics, post performance, competitor analysis' },
      { name: 'Messages', description: 'Direct messages: send, list, export' },
      { name: 'Profile', description: 'Profile management and account settings' },
      { name: 'Grok', description: 'Grok AI: query, summarize, analyze images' },
      { name: 'Lists', description: 'Twitter Lists management' },
      { name: 'Spaces', description: 'Twitter Spaces: discover, join, scrape, transcript' },
      { name: 'Monitoring', description: 'Track account & follower changes over time' },
      { name: 'Sentiment', description: 'Sentiment analysis and reputation monitoring' },
      { name: 'Streams', description: 'Real-time tweet streaming by keyword' },
      { name: 'Workflows', description: 'Multi-step automation workflows' },
      { name: 'Personas', description: 'Automation personas for 24/7 growth' },
      { name: 'Graph', description: 'Social network graph analysis (PageRank, community detection)' },
      { name: 'Portability', description: 'Account export, migration, and cross-platform data' },
      { name: 'CRM', description: 'Follower CRM: tag, segment, search contacts' },
      { name: 'Schedule', description: 'Post scheduling, RSS auto-posting, evergreen recycling' },
      { name: 'Optimizer', description: 'Tweet optimization, hashtag suggestions, performance prediction' },
      { name: 'Utility', description: 'Video download, bookmark export, thread unroll, profile/tweet analysis' },
      { name: 'Notifications', description: 'Webhook notifications for automation events' },
      { name: 'Datasets', description: 'Pre-built X/Twitter datasets for analysis' },
      { name: 'Teams', description: 'Team management for collaborative automation' },
      { name: 'Writer', description: 'AI-powered tweet generation, voice analysis, content calendar' },
      { name: 'Scripts', description: 'Browser scripts for direct X/Twitter automation (downloadable)' },
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

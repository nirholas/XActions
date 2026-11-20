// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * x402 Micropayment Configuration (Optional)
 * 
 * Optional pay-per-request pricing for self-hosted remote AI API.
 * All local features (browser scripts, CLI, MCP server) are 100% free.
 * x402 is only relevant if you self-host the XActions API and want to
 * monetize remote AI agent access. Most users can ignore this file.
 * 
 * @see https://x402.org for protocol documentation
 */

// Determine environment.
//
// Bracket access is deliberate: bundlers (esbuild, and therefore wrangler)
// substitute a literal for `process.env.NODE_ENV` at build time, which would
// freeze this to whatever the build machine had and silently put a deployed
// edge worker on testnet. `process.env['NODE_ENV']` is left alone and read at
// runtime, after the Worker env has been copied across.
const isProduction = process.env['NODE_ENV'] === 'production';

// Payment receiving address. No default: x402 stays disabled until the operator
// sets X402_PAY_TO_ADDRESS, and in production a missing value is a startup error
// (see validateConfig) rather than silently routing funds to someone else's wallet.
export const PAY_TO_ADDRESS = (process.env.X402_PAY_TO_ADDRESS || '').trim();

// Solana receiving address. x402 settles on Solana with the same `exact` scheme
// as on EVM, but the curve and address format differ, so it needs its own
// address. Either chain alone is enough to run a paid API: an operator can take
// payment on Solana only, on Base only, or on both.
export const PAY_TO_ADDRESS_SOLANA = (process.env.X402_PAY_TO_ADDRESS_SOLANA || '').trim();

// CAIP-2 identifiers for Solana. Mainnet is the genesis hash of the main
// cluster; devnet is used when NODE_ENV is not production.
export const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
export const SOLANA_DEVNET = 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1';

// Facilitator that verifies and broadcasts payments.
//
// The default is PayAI's, which needs no key and settles Base and Solana
// mainnet. The reference facilitator at x402.org is deliberately not the
// default: it only supports testnets, so a server pointed at it advertises
// mainnet terms that no caller can actually pay, and the failure only shows up
// when real money is on the line.
export const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL || 'https://facilitator.payai.network';

// Network configuration (legacy - for backwards compatibility)
// Development: eip155:84532 (Base Sepolia testnet)
// Production: eip155:8453 (Base mainnet)
export const NETWORK = process.env.X402_NETWORK || (isProduction ? 'eip155:8453' : 'eip155:84532');

// Solana cluster used for payment. Mainnet in production, devnet elsewhere, so
// a local run cannot accidentally ask an agent for real money.
export const SOLANA_NETWORK =
  process.env.X402_SOLANA_NETWORK || (isProduction ? SOLANA_MAINNET : SOLANA_DEVNET);

// Track if config has been validated
let configValidated = false;

// Supported networks configuration (multi-network support)
export const SUPPORTED_NETWORKS = {
  // ── Production mainnets ──────────────────────────────────────
  'eip155:8453': {
    name: 'Base',
    recommended: true,
    gasCost: 'low',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  'eip155:42161': {
    name: 'Arbitrum One',
    gasCost: 'low',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
  'eip155:10': {
    name: 'Optimism',
    gasCost: 'low',
    usdc: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  },
  'eip155:137': {
    name: 'Polygon',
    gasCost: 'low',
    usdc: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  },
  'eip155:1': {
    name: 'Ethereum',
    gasCost: 'high',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  'eip155:43114': {
    name: 'Avalanche C-Chain',
    gasCost: 'low',
    usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  },
  'eip155:56': {
    name: 'BNB Smart Chain',
    gasCost: 'low',
    usdc: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  },
  'eip155:42220': {
    name: 'Celo',
    gasCost: 'low',
    usdc: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
  },
  'eip155:324': {
    name: 'zkSync Era',
    gasCost: 'low',
    usdc: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4',
  },
  'eip155:59144': {
    name: 'Linea',
    gasCost: 'low',
    usdc: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
  },
  'eip155:534352': {
    name: 'Scroll',
    gasCost: 'low',
    usdc: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4',
  },
  // ── Testnets ─────────────────────────────────────────────────
  'eip155:84532': {
    name: 'Base Sepolia',
    testnet: true,
    gasCost: 'low',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  'eip155:11155111': {
    name: 'Ethereum Sepolia',
    testnet: true,
    gasCost: 'low',
    usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  'eip155:421614': {
    name: 'Arbitrum Sepolia',
    testnet: true,
    gasCost: 'low',
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  },
  // Solana. Sub-second finality and fees around $0.00025, which is what makes
  // a $0.001 API call viable without the fee swallowing the payment.
  [SOLANA_MAINNET]: {
    name: 'Solana',
    recommended: true,
    gasCost: 'lowest',
    usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  },
  [SOLANA_DEVNET]: {
    name: 'Solana Devnet',
    testnet: true,
    gasCost: 'lowest',
    usdc: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },
};

// Token contract addresses per network
// Each entry maps a token symbol to its contract address on that chain.
export const SUPPORTED_TOKENS = {
  // ── Solana ────────────────────────────────────────────────────
  [SOLANA_MAINNET]: {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  },
  [SOLANA_DEVNET]: {
    USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },
  // ── Base ──────────────────────────────────────────────────────
  'eip155:8453': {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    DAI:  '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    WETH: '0x4200000000000000000000000000000000000006',
  },
  // ── Arbitrum One ──────────────────────────────────────────────
  'eip155:42161': {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI:  '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  },
  // ── Optimism ─────────────────────────────────────────────────
  'eip155:10': {
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    DAI:  '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WETH: '0x4200000000000000000000000000000000000006',
  },
  // ── Polygon ──────────────────────────────────────────────────
  'eip155:137': {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI:  '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  },
  // ── Ethereum ─────────────────────────────────────────────────
  'eip155:1': {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI:  '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  },
  // ── Avalanche C-Chain ────────────────────────────────────────
  'eip155:43114': {
    USDC: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    USDT: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    DAI:  '0xd586E7F844cEa2F87f50152665BCbc2C279D8d70',
    WETH: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
  },
  // ── BNB Smart Chain ──────────────────────────────────────────
  'eip155:56': {
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
    DAI:  '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
    WETH: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  },
  // ── Celo ─────────────────────────────────────────────────────
  'eip155:42220': {
    USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C',
    USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
    DAI:  '0xE4fE50cdD716beF95DB2e66aAA5ea1FfF1e037af',
  },
  // ── zkSync Era ───────────────────────────────────────────────
  'eip155:324': {
    USDC: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4',
    USDT: '0x493257fD37EDB34451f62EDf8D2a0C418852bA4C',
    WETH: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91',
  },
  // ── Linea ────────────────────────────────────────────────────
  'eip155:59144': {
    USDC: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
    USDT: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
    DAI:  '0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5',
    WETH: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
  },
  // ── Scroll ───────────────────────────────────────────────────
  'eip155:534352': {
    USDC: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4',
    USDT: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df',
    DAI:  '0xcA77eB3fEFe3725Dc33bccB54eDEFc3D9f764f97',
    WETH: '0x5300000000000000000000000000000000000004',
  },
  // ── Testnets ─────────────────────────────────────────────────
  'eip155:84532': {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  },
  'eip155:11155111': {
    USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  'eip155:421614': {
    USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  },
};

/**
 * Get list of accepted networks for payments
 * @param {boolean} includeTestnet - Whether to include testnet networks
 * @returns {Array} Array of network configurations with token addresses
 */
export function getAcceptedNetworks(includeTestnet = false) {
  return Object.entries(SUPPORTED_NETWORKS)
    .filter(([_, config]) => includeTestnet || !config.testnet)
    .map(([network, config]) => ({
      network,
      ...config,
      tokens: SUPPORTED_TOKENS[network] || {},
      // Legacy compat — keep usdc as top-level field
      usdc: SUPPORTED_TOKENS[network]?.USDC || null,
    }));
}

/**
 * Get network configuration by network ID
 * @param {string} networkId - Network identifier (e.g., 'eip155:8453')
 * @returns {Object|null} Network configuration or null if not found
 */
export function getNetworkConfig(networkId) {
  const base = SUPPORTED_NETWORKS[networkId];
  if (!base) return null;
  return {
    ...base,
    tokens: SUPPORTED_TOKENS[networkId] || {},
    usdc: SUPPORTED_TOKENS[networkId]?.USDC || null,
  };
}

/**
 * Get all accepted tokens across all supported networks
 * @param {boolean} includeTestnet - Whether to include testnet networks
 * @returns {Array<{symbol: string, networks: Array}>} Accepted tokens
 */
export function getAcceptedTokens(includeTestnet = false) {
  const tokenMap = {};
  for (const [networkId, tokens] of Object.entries(SUPPORTED_TOKENS)) {
    const net = SUPPORTED_NETWORKS[networkId];
    if (!net) continue;
    if (!includeTestnet && net.testnet) continue;
    for (const [symbol, address] of Object.entries(tokens)) {
      if (!tokenMap[symbol]) tokenMap[symbol] = [];
      tokenMap[symbol].push({ network: networkId, name: net.name, address });
    }
  }
  return Object.entries(tokenMap).map(([symbol, networks]) => ({ symbol, networks }));
}

// Pricing tiers for AI agent operations (in USD, paid in USDC)
export const AI_OPERATION_PRICES = {
  // Scraping operations
  'scrape:profile': '$0.001',        // Profile info
  'scrape:followers': '$0.01',       // Follower list (up to 1000)
  'scrape:following': '$0.01',       // Following list (up to 1000)
  'scrape:tweets': '$0.005',         // Tweet history (up to 100)
  'scrape:thread': '$0.002',         // Single thread
  'scrape:search': '$0.01',          // Search results
  'scrape:hashtag': '$0.01',         // Hashtag tweets
  'scrape:media': '$0.005',          // Media from profile
  
  // Automation operations
  'action:unfollow-non-followers': '$0.05',  // Clean following list
  'action:unfollow-everyone': '$0.10',       // Full unfollow
  'action:detect-unfollowers': '$0.02',      // Who unfollowed
  'action:auto-like': '$0.02',               // Like tweets
  'action:follow-engagers': '$0.03',         // Follow from engagement
  'action:keyword-follow': '$0.03',          // Follow by keyword
  
  // Monitoring operations  
  'monitor:account': '$0.01',        // Account changes
  'monitor:followers': '$0.01',      // Follower changes
  'alert:new-followers': '$0.005',   // New follower notifications
  
  // Utility operations
  'download:video': '$0.005',        // Video download
  'export:bookmarks': '$0.01',       // Bookmark export
  'unroll:thread': '$0.002',         // Thread unroller
  
  // Profile operations
  'profile:update': '$0.01',         // Update profile fields
  
  // Posting operations
  'posting:tweet': '$0.005',         // Post a tweet
  'posting:thread': '$0.01',         // Post a thread
  'posting:poll': '$0.01',           // Create a poll
  'posting:schedule': '$0.005',      // Schedule a post
  'posting:delete': '$0.002',        // Delete a tweet
  
  // Engagement operations
  
  // Discovery operations
  'discovery:search': '$0.01',       // Search tweets
  'discovery:explore': '$0.005',     // Explore feed
  
  // Notification operations
  
  // DM operations
  'messages:send': '$0.01',          // Send a DM
  'messages:conversations': '$0.005', // List conversations
  'messages:export': '$0.02',        // Export DMs
  
  // Bookmark operations
  'bookmarks:clear': '$0.01',        // Clear all bookmarks
  
  // Creator operations
  'creator:analytics': '$0.01',      // Creator analytics
  'creator:revenue': '$0.005',       // Revenue info
  'creator:subscribers': '$0.01',    // Subscriber list
  
  // Spaces operations
  'spaces:scrape': '$0.01',          // Scrape a Space
  
  // Settings operations
  'settings:get': '$0.005',          // Get settings
  'settings:protected': '$0.005',    // Toggle protected
  'settings:blocked': '$0.01',       // Get blocked accounts
  'settings:muted': '$0.01',         // Get muted accounts
  
  // Grok AI operations
  'grok:query': '$0.02',             // Query Grok
  'grok:summarize': '$0.02',         // Summarize topic
  
  // Business operations
  
  // Premium operations
  'premium:check': '$0.001',         // Check premium status
  
  // Article operations

  // Writer operations
  'writer:analyze-voice': '$0.02',   // Analyze writing voice
  'writer:generate': '$0.01',        // Generate tweets in voice
  'writer:rewrite': '$0.005',        // Rewrite/improve tweet
  'writer:calendar': '$0.02',        // Generate content calendar
  'writer:reply': '$0.005',          // Generate reply
  'writer:comment': '$0.005',        // Generate a reply from a plain-language brief

  // Analytics operations (browser scripts: viewAnalytics, engagementAnalytics, etc.)
  'analytics:audience-overlap': '$0.02',   // Audience overlap comparison
  'analytics:best-time': '$0.01',          // Best time to post analysis
  'analytics:competitor': '$0.02',         // Competitor analysis

  // Automation operations (browser scripts: autoReply, autoRepost, etc.)
  'automation:auto-reply': '$0.03',        // Auto-reply to tweets
  'automation:auto-repost': '$0.03',       // Auto-repost matching tweets
  'automation:plug-replies': '$0.02',      // Auto-plug replies on viral tweets
  'automation:engagement-booster': '$0.03', // Systematic engagement booster
  'automation:content-calendar': '$0.02',  // Content calendar planner
  'automation:welcome-followers': '$0.02', // Welcome new followers via DM
  'automation:continuous-monitor': '$0.02', // Continuous follower monitoring
  'automation:keyword-monitor': '$0.02',   // Keyword mention monitor
  'automation:customer-service': '$0.03',  // Customer service automation
  'automation:evergreen': '$0.02',         // Evergreen tweet recycler

  // Community operations (browser scripts: joinCommunities, manageCommunity, etc.)
  'community:join': '$0.01',         // Join communities by keyword
  'community:leave-all': '$0.02',    // Leave all communities
  'community:create': '$0.02',       // Create a community
  'community:manage': '$0.01',       // Manage community members/settings
  'community:notes': '$0.005',       // View/contribute community notes

  // Lists operations (browser scripts: listManager, advancedLists, etc.)

  // Moderation operations (browser scripts: blockBots, massBlock, etc.)
  'moderation:block-bots': '$0.02',  // Detect and block bots
  'moderation:mass-block': '$0.02',  // Block multiple accounts
  'moderation:mass-unblock': '$0.02', // Unblock multiple accounts
  'moderation:mass-unmute': '$0.01', // Unmute multiple accounts
  'moderation:mute-keywords': '$0.01', // Mute users by keyword
  'moderation:muted-words': '$0.005', // Manage muted words
  'moderation:remove-followers': '$0.02', // Remove followers (soft-block)
  'moderation:report-spam': '$0.01', // Report spam accounts
  'moderation:shadowban-check': '$0.005', // Check shadowban status
  'moderation:verified-only': '$0.005', // Toggle verified-only replies

  // Account operations (browser scripts: backupAccount, auditFollowers, etc.)
  'account:backup': '$0.05',         // Full account backup
  'account:audit-followers': '$0.02', // Audit followers for bots/fakes
  'account:delegate-access': '$0.01', // Manage delegate access
  'account:verify-identity': '$0.005', // ID verification flow

  // Ads operations (browser scripts: adCampaignManager, adsManager, etc.)
  'ads:dashboard': '$0.01',          // Ads dashboard/analytics
  'ads:media-studio': '$0.02',       // Media Studio management

  // X Pro operations (browser scripts: xPro, xProManager)
  'xpro:dashboard': '$0.01',         // X Pro/TweetDeck dashboard

  // Additional posting operations (browser scripts not yet covered)

  // Additional engagement operations

  // Additional scraping operations
  'scrape:likes': '$0.005',          // Scrape tweet likes
  'scrape:retweets': '$0.005',       // Scrape tweet retweets

  // Additional discovery operations
  'discovery:trending-monitor': '$0.01', // Trending topic monitor
  'discovery:save-search': '$0.002', // Save a search query
  'discovery:saved-searches': '$0.005', // Manage saved searches
  'discovery:topics': '$0.005',      // Manage followed topics

  // Additional messages operations

  // Additional spaces operations

  // Additional premium operations

  // Additional settings operations
  'settings:advanced': '$0.005',     // Advanced settings
  'settings:block-list': '$0.01',    // Block list import/export

  // Additional creator operations
  'creator:studio': '$0.01',         // Creator Studio dashboard
  'creator:subscriptions': '$0.01',  // Creator subscription management

  // Additional monitor operations
  'monitor:following': '$0.01',      // Monitor following changes

  // Utility operations (additional browser scripts)

  // ── New route-level pricing (added for full MCP parity) ──────────────────

  // Posting routes (/api/ai/posting/*)
  'posting:reply': '$0.005',          // Reply to a tweet
  'posting:bookmark': '$0.002',       // Bookmark a tweet
  'posting:bookmarks': '$0.01',       // Get bookmarks list
  'posting:clear-bookmarks': '$0.01', // Clear all bookmarks
  'posting:article': '$0.05',         // Publish article

  // Engagement routes (/api/ai/engagement/*)
  'engagement:follow': '$0.002',      // Follow a user
  'engagement:unfollow': '$0.002',    // Unfollow a user
  'engagement:like': '$0.002',        // Like a tweet
  'engagement:retweet': '$0.002',     // Retweet
  'engagement:quote-tweet': '$0.005', // Quote-tweet
  'engagement:auto-follow': '$0.03',  // Auto-follow
  'engagement:smart-unfollow': '$0.03', // Smart unfollow
  'engagement:auto-retweet': '$0.02', // Auto-retweet
  'engagement:bulk-execute': '$0.05', // Bulk execute actions
  'engagement:notifications': '$0.005', // Get notifications
  'engagement:mute': '$0.002',        // Mute user
  'engagement:unmute': '$0.002',      // Unmute user
  'engagement:trends': '$0.005',      // Trending topics
  'engagement:explore': '$0.005',     // Explore feed
  'engagement:detect-bots': '$0.02',  // Bot detection
  'engagement:find-influencers': '$0.05', // Find influencers
  'engagement:smart-target': '$0.05', // Smart targeting
  'engagement:crypto-analyze': '$0.03', // Crypto sentiment
  'engagement:audience-insights': '$0.03', // Audience insights
  'engagement:engagement-report': '$0.05', // Engagement report

  // Action routes (additional, /api/ai/action/*)
  'action:follow': '$0.002',          // Follow user
  'action:unfollow': '$0.002',        // Unfollow user
  'action:like': '$0.002',            // Like tweet
  'action:retweet': '$0.002',         // Retweet
  'action:quote-tweet': '$0.005',     // Quote-tweet
  'action:post-tweet': '$0.005',      // Post tweet
  'action:auto-follow': '$0.03',      // Auto-follow
  'action:smart-unfollow': '$0.03',   // Smart unfollow
  'action:auto-retweet': '$0.02',     // Auto-retweet
  'action:bulk-execute': '$0.05',     // Bulk execute

  // Profile routes (/api/ai/profile/*)
  'profile:check-premium': '$0.001',  // Check premium status
  'profile:settings': '$0.005',       // Get settings
  'profile:toggle-protected': '$0.005', // Toggle protected
  'profile:blocked': '$0.01',         // Get blocked accounts

  // Grok routes (/api/ai/grok/*)
  'grok:analyze-image': '$0.03',      // Analyze image

  // Lists routes (/api/ai/lists/*)
  'lists:all': '$0.005',              // Get all lists
  'lists:members': '$0.01',           // Get list members

  // Spaces routes (/api/ai/spaces/*)
  'spaces:list': '$0.005',            // Discover spaces
  'spaces:join': '$0.005',            // Join a space
  'spaces:leave': '$0.002',           // Leave a space
  'spaces:status': '$0.001',          // Space status
  'spaces:transcript': '$0.01',       // Space transcript

  // Analytics routes (/api/ai/analytics/*)
  'analytics:account': '$0.01',       // Account analytics
  'analytics:post': '$0.005',         // Post analytics
  'analytics:creator': '$0.01',       // Creator analytics
  'analytics:brand-monitor': '$0.03', // Brand monitoring
  'analytics:history': '$0.005',      // Analytics history
  'analytics:snapshot': '$0.005',     // Take snapshot
  'analytics:growth-rate': '$0.005',  // Growth rate
  'analytics:compare-accounts': '$0.01', // Compare accounts
  'analytics:analyze-voice': '$0.02', // Voice analysis
  'analytics:generate-tweet': '$0.01', // Generate tweet
  'analytics:rewrite-tweet': '$0.005', // Rewrite tweet
  'analytics:summarize-thread': '$0.01', // Summarize thread

  // Sentiment routes (/api/ai/sentiment/*)
  'sentiment:analyze': '$0.005',      // Sentiment analysis
  'sentiment:monitor': '$0.03',       // Monitor reputation
  'sentiment:report': '$0.05',        // Reputation report

  // Reputation routes (/api/ai/reputation/*)
  'reputation:score': '$0.01',        // Risk-score a batch of posts and build the report

  // Streams routes (/api/ai/streams/*)
  'streams:start': '$0.01',           // Start stream
  'streams:stop': '$0.002',           // Stop stream
  'streams:list': '$0.001',           // List streams
  'streams:pause': '$0.002',          // Pause stream
  'streams:resume': '$0.002',         // Resume stream
  'streams:status': '$0.001',         // Stream status
  'streams:history': '$0.002',        // Stream history

  // Workflows routes (/api/ai/workflows/*)
  'workflows:create': '$0.01',        // Create workflow
  'workflows:run': '$0.05',           // Run workflow
  'workflows:list': '$0.001',         // List workflows
  'workflows:actions': '$0.001',      // Available actions

  // Portability routes (/api/ai/portability/*)
  'portability:export-account': '$0.10', // Export account
  'portability:migrate': '$0.10',     // Migrate account
  'portability:diff': '$0.02',        // Diff exports
  'portability:platforms': '$0.001',  // List platforms
  'portability:import': '$0.02',      // Import data
  'portability:convert': '$0.002',    // Convert format

  // Personas routes (/api/ai/personas/*)
  'personas:create': '$0.01',         // Create persona
  'personas:list': '$0.001',          // List personas
  'personas:status': '$0.001',        // Persona status
  'personas:edit': '$0.005',          // Edit persona
  'personas:delete': '$0.002',        // Delete persona
  'personas:run': '$0.10',            // Run persona (continuous)
  'personas:presets': '$0.001',       // Persona presets

  // Graph routes (/api/ai/graph/*)
  'graph:build': '$0.10',             // Build social graph
  'graph:analyze': '$0.03',           // Analyze graph
  'graph:recommendations': '$0.02',   // Graph recommendations
  'graph:list': '$0.001',             // List graphs

  // CRM routes (/api/ai/crm/*)
  'crm:sync': '$0.05',                // Sync to CRM
  'crm:tag': '$0.001',                // Tag contact
  'crm:search': '$0.002',             // Search CRM
  'crm:segment': '$0.005',            // CRM segment

  // Schedule routes (/api/ai/schedule/*)
  'schedule:add': '$0.005',           // Schedule post
  'schedule:list': '$0.001',          // List scheduled
  'schedule:remove': '$0.002',        // Remove scheduled
  'schedule:rss-add': '$0.005',       // Add RSS feed
  'schedule:rss-check': '$0.01',      // Check RSS
  'schedule:rss-drafts': '$0.002',    // RSS drafts
  'schedule:evergreen': '$0.01',      // Find evergreen content

  // Optimizer routes (/api/ai/optimizer/*)
  'optimizer:optimize': '$0.01',      // Optimize tweet
  'optimizer:hashtags': '$0.005',     // Suggest hashtags
  'optimizer:predict': '$0.01',       // Predict performance
  'optimizer:variations': '$0.01',    // Generate variations

  // Notify routes (/api/ai/notify/*)
  'notify:send': '$0.01',             // Send notification
  'notify:test': '$0.002',            // Test webhook

  // Datasets routes (/api/ai/datasets/*)
  'datasets:list': '$0.001',          // List datasets
  'datasets:get': '$0.005',           // Fetch dataset

  // Teams routes (/api/ai/teams/*)
  'teams:create': '$0.005',           // Create team
  'teams:members': '$0.002',          // Get team members

  // Scraping additions (/api/ai/scrape/*)
  'scrape:replies': '$0.005',         // Get tweet replies
  'scrape:quote-tweets': '$0.005',    // Get quote tweets
  'scrape:user-likes': '$0.005',      // Get tweets user liked
  'scrape:mentions': '$0.005',        // Get @mentions
  'scrape:recommendations': '$0.005', // Get recommended accounts

  // Monitor additions (/api/ai/monitor/*)
  'monitor:keyword': '$0.02',         // Monitor keyword mentions
  'monitor:follower-alerts': '$0.01', // Follower change alerts
  'monitor:track-engagement': '$0.02', // Track tweet engagement over time
  'monitor:compare': '$0.01',         // Compare follower snapshots

  // Action additions (/api/ai/action/*)
  'action:auto-comment': '$0.02',     // Auto-comment on keyword tweets

  // Analyze utility routes (/api/ai/analyze/*)
  'analyze:profile': '$0.01',         // Deep profile analysis
  'analyze:tweet': '$0.005',          // Analyze a single tweet

  // Account tools
  'account:connected-accounts': '$0.005',
  'account:join-date': '$0.005',
  'account:login-history': '$0.005',
  'account:multi-account': '$0.005',
  'account:qr-code': '$0.002',

  // Ads
  'ads:analytics': '$0.02',
  'ads:campaigns': '$0.02',

  // Articles
  'articles:analytics': '$0.01',
  'articles:compose': '$0.02',
  'articles:draft': '$0.01',
  'articles:list': '$0.005',
  'articles:publish': '$0.05',

  // Automation
  'automation:content-repurpose': '$0.02',
  'automation:quote-tweet-auto': '$0.03',

  // Bookmarks
  'bookmarks:export': '$0.01',
  'bookmarks:folders': '$0.005',
  'bookmarks:import': '$0.01',
  'bookmarks:organize': '$0.01',
  'bookmarks:search': '$0.01',

  // Content cleanup
  'cleanup:archive': '$0.02',
  'cleanup:bulk-delete': '$0.05',
  'cleanup:clear-history': '$0.02',
  'cleanup:clear-reposts': '$0.02',
  'cleanup:delete-tweets': '$0.02',
  'cleanup:unlike-all': '$0.02',

  // Communities
  'community:leave': '$0.01',
  'community:list': '$0.005',
  'community:members': '$0.01',
  'community:search': '$0.01',

  // Discovery
  'discovery:for-you': '$0.005',
  'discovery:trending': '$0.005',

  // Lead generation
  'leads:enrich': '$0.03',
  'leads:export': '$0.02',
  'leads:find': '$0.03',
  'leads:monitor': '$0.02',
  'leads:qualify': '$0.02',
  'leads:score': '$0.02',

  // Media studio
  'media:analytics': '$0.01',
  'media:captions': '$0.005',
  'media:download-batch': '$0.02',
  'media:library': '$0.01',
  'media:studio': '$0.01',
  'media:upload': '$0.01',

  // Moderation
  'moderation:blocked-list': '$0.01',
  'moderation:muted-list': '$0.01',

  // Monitoring and alerts
  'alert:account': '$0.01',
  'alert:alert:new-followers': '$0.01',
  'alert:compare': '$0.01',
  'alert:follower-alerts': '$0.01',
  'alert:followers': '$0.01',
  'alert:following': '$0.01',
  'alert:keyword': '$0.01',
  'alert:track-engagement': '$0.01',
  'monitor:alert:new-followers': '$0.01',
  'monitor:new-followers': '$0.01',

  // Premium
  'premium:features': '$0.001',

  // Settings
  'settings:update': '$0.005',

  // Timeline
  'timeline:collect': '$0.01',
  'timeline:export': '$0.01',
  'timeline:scroll': '$0.002',
  'timeline:switch-feed': '$0.002',
  'timeline:view': '$0.005',

  // Topics
  'topics:discover': '$0.005',
  'topics:follow': '$0.002',
  'topics:list': '$0.005',
  'topics:unfollow': '$0.002',

  // Download, export, unroll, analyze
  'analyze:bookmarks': '$0.01',
  'analyze:thread': '$0.005',
  'analyze:video': '$0.005',
  'download:bookmarks': '$0.01',
  'download:profile': '$0.005',
  'download:thread': '$0.005',
  'download:tweet': '$0.005',
  'export:profile': '$0.005',
  'export:thread': '$0.005',
  'export:tweet': '$0.005',
  'export:video': '$0.005',
  'unroll:bookmarks': '$0.01',
  'unroll:profile': '$0.005',
  'unroll:tweet': '$0.005',
  'unroll:video': '$0.005',

  // Viral threads
  'viral:analyze': '$0.02',
  'viral:generate': '$0.03',
  'viral:headlines': '$0.02',
  'viral:research': '$0.03',
  'viral:trending-hooks': '$0.02',

  // X Pro
  'xpro:columns': '$0.005',
};

/**
 * Endpoints that are deliberately free, and why.
 *
 * The rule this API follows: it charges for X data and X actions, and it does
 * not charge you to manage your relationship with the API itself. An endpoint
 * that is neither priced above nor listed here fails `npm run check:x402`,
 * which is what stops a new route from shipping without either decision being
 * made. A hundred of them had, before that check existed.
 *
 * @type {Record<string, string>} operation -> the reason it is free
 */
export const FREE_OPERATIONS = {
  'action:validate-session': 'Checks whether the session cookie you supplied still works. Charging to find out you cannot be charged for anything else is absurd.',
  'billing:checkout': 'Your billing relationship with us, not data from X.',
  'billing:portal': 'Your billing relationship with us, not data from X.',
  'billing:plans': 'This endpoint is the price list itself; charging for it would be circular.',
  'billing:usage': 'Your own record of what you have already spent here.',
  'billing:invoices': 'Your own invoices from us, which cost nothing to look at.',
  'schedule:rss-remove': 'Stopping a feed you added; charging to stop a charge would trap callers.',
  'webhooks:create': 'Configuring where we deliver your events.',
  'webhooks:list': 'Configuring where we deliver your events.',
  'webhooks:delete': 'Configuring where we deliver your events.',
  'webhooks:test': 'Configuring where we deliver your events.',
  'webhooks:events': 'The list of event names this API can deliver, which is documentation.',
};

// Pricing for browser script downloads (GET /api/scripts/src/:name, GET /api/scripts/automation/:name)
export const SCRIPT_PRICES = {
  // ── src/ scripts (files in browser/; the src/ id is the public URL) ──
  // $0.001 — simple utility/view scripts
  'src/accountMisc': '$0.001',
  'src/communityNotes': '$0.001',
  'src/delegateAccess': '$0.001',
  'src/dmCalls': '$0.001',
  'src/followAccount': '$0.001',
  'src/followList': '$0.001',
  'src/idVerification': '$0.001',
  'src/likePost': '$0.001',
  'src/postInteractions': '$0.001',
  'src/qrCodeSharing': '$0.001',
  'src/repostPost': '$0.001',
  'src/saveSearch': '$0.001',
  'src/savedSearchManager': '$0.001',
  'src/shareEmbed': '$0.001',
  'src/textFormatting': '$0.001',
  'src/timelineViewer': '$0.001',
  'src/uploadContacts': '$0.001',
  'src/verifiedOnly': '$0.001',
  'src/videoCaptions': '$0.001',
  'src/viewAnalytics': '$0.001',

  // $0.002 — analytics and monitoring
  'src/accountHealthMonitor': '$0.002',
  'src/audienceDemographics': '$0.002',
  'src/audienceOverlap': '$0.002',
  'src/auditFollowers': '$0.002',
  'src/bestTimeToPost': '$0.002',
  'src/followerGrowthTracker': '$0.002',
  'src/followerTools': '$0.002',
  'src/hashtagAnalytics': '$0.002',
  'src/newFollowersAlert': '$0.002',
  'src/shadowbanChecker': '$0.002',
  'src/tweetABTester': '$0.002',
  'src/tweetPerformance': '$0.002',
  'src/tweetScheduleOptimizer': '$0.002',
  'src/viralTweetDetector': '$0.002',

  // $0.003 — management and workflow tools
  'src/advancedDM': '$0.003',
  'src/advancedGrok': '$0.003',
  'src/advancedLists': '$0.003',
  'src/advancedNotifications': '$0.003',
  'src/advancedPremium': '$0.003',
  'src/advancedProfile': '$0.003',
  'src/advancedSettings': '$0.003',
  'src/advancedSpaces': '$0.003',
  'src/bookmarkManager': '$0.003',
  'src/bookmarkOrganizer': '$0.003',
  'src/businessTools': '$0.003',
  'src/clearAllBookmarks': '$0.003',
  'src/contentCalendar': '$0.003',
  'src/contentRepurposer': '$0.003',
  'src/creatorStudio': '$0.003',
  'src/creatorSubscriptions': '$0.003',
  'src/discoveryExplore': '$0.003',
  'src/dmManager': '$0.003',
  'src/editPost': '$0.003',
  'src/encryptedDM': '$0.003',
  'src/engagementAnalytics': '$0.003',
  'src/engagementLeaderboard': '$0.003',
  'src/engagementManager': '$0.003',
  'src/grokIntegration': '$0.003',
  'src/groupDM': '$0.003',
  'src/hostSpace': '$0.003',
  'src/joinCommunities': '$0.003',
  'src/joinSpace': '$0.003',
  'src/keywordMonitor': '$0.003',
  'src/listManager': '$0.003',
  'src/manageCommunity': '$0.003',
  'src/manageMutedWords': '$0.003',
  'src/mentionUsers': '$0.003',
  'src/monitorAccount': '$0.003',
  'src/notificationManager': '$0.003',
  'src/pinTweetManager': '$0.003',
  'src/pollCreator': '$0.003',
  'src/postAdvanced': '$0.003',
  'src/postComposer': '$0.003',
  'src/postThread': '$0.003',
  'src/premiumGifting': '$0.003',
  'src/premiumManager': '$0.003',
  'src/profileManager': '$0.003',
  'src/schedulePosts': '$0.003',
  'src/scrapeSpaces': '$0.003',
  'src/sendDirectMessage': '$0.003',
  'src/sentimentAnalyzer': '$0.003',
  'src/settingsManager': '$0.003',
  'src/spacesManager': '$0.003',
  'src/subscribePremium': '$0.003',
  'src/threadComposer': '$0.003',
  'src/timelineScraper': '$0.003',
  'src/topicManager': '$0.003',
  'src/trendingTopicMonitor': '$0.003',
  'src/updateProfile': '$0.003',
  'src/welcomeNewFollowers': '$0.003',
  'src/xPro': '$0.003',
  'src/xProManager': '$0.003',

  // $0.005 — automation scripts
  'src/adCampaignManager': '$0.005',
  'src/adsManager': '$0.005',
  'src/advancedCreator': '$0.005',
  'src/algorithmBuilder': '$0.005',
  'src/articlePublisher': '$0.005',
  'src/autoPlugReplies': '$0.005',
  'src/autoReply': '$0.005',
  'src/autoRepost': '$0.005',
  'src/blockBots': '$0.005',
  'src/blockListManager': '$0.005',
  'src/competitorAnalysis': '$0.005',
  'src/continuousMonitor': '$0.005',
  'src/detectUnfollowers': '$0.005',
  'src/engagementBooster': '$0.005',
  'src/followRatioManager': '$0.005',
  'src/mediaStudio': '$0.005',
  'src/muteByKeywords': '$0.005',
  'src/personaEngine': '$0.005',
  'src/quoteTweetAutomation': '$0.005',
  'src/removeFollowers': '$0.005',
  'src/reportSpam': '$0.005',
  'src/unfollowWDFBLog': '$0.005',
  'src/videoDownloaderBrowser': '$0.005',

  // $0.01 — bulk/destructive/power operations
  'src/backupAccount': '$0.01',
  'src/bulkDeleteTweets': '$0.01',
  'src/clearAllReposts': '$0.01',
  'src/createCommunity': '$0.01',
  'src/createPoll': '$0.01',
  'src/downloadAccountData': '$0.01',
  'src/leaveAllCommunities': '$0.01',
  'src/massBlock': '$0.01',
  'src/massUnblock': '$0.01',
  'src/massUnmute': '$0.01',
  'src/unfollowEveryone': '$0.01',
  'src/unfollowback': '$0.01',
  'src/unlikeAllPosts': '$0.01',

  // ── src/automation/ scripts ───────────────────────────────────
  'automation/core': '$0.001',
  'automation/sessionLogger': '$0.002',
  'automation/linkScraper': '$0.003',
  'automation/protectActiveUsers': '$0.003',
  'automation/quotaSupervisor': '$0.003',
  'automation/autoCommenter': '$0.005',
  'automation/autoLiker': '$0.005',
  'automation/controlPanel': '$0.005',
  'automation/customerService': '$0.005',
  'automation/evergreenRecycler': '$0.005',
  'automation/followEngagers': '$0.005',
  'automation/followTargetUsers': '$0.005',
  'automation/keywordFollow': '$0.005',
  'automation/rssMonitor': '$0.005',
  'automation/smartUnfollow': '$0.005',
  'automation/actions': '$0.01',
  'automation/algorithmBuilder': '$0.01',
  'automation/algorithmTrainer': '$0.01',
  'automation/growthSuite': '$0.01',
  'automation/multiAccount': '$0.01',
};

/**
 * Price for POST /api/scripts/run
 * Running a script costs more than downloading it — it spins up a real
 * Puppeteer session and performs actions on the caller's X account.
 */
export const SCRIPT_RUN_PRICE = '$0.025';

// Route configuration for x402 middleware
export function getRouteConfig(payTo) {
  const routes = {};
  
  for (const [operation, price] of Object.entries(AI_OPERATION_PRICES)) {
    const [category, action] = operation.split(':');
    const routePath = `POST /api/ai/${category}/${action}`;
    
    routes[routePath] = {
      accepts: [{
        scheme: 'exact',
        price,
        network: NETWORK,
        payTo,
      }],
      description: `AI Agent: ${operation.replace(':', ' - ')}`,
      mimeType: 'application/json',
    };
  }
  
  return routes;
}

/**
 * Validate x402 configuration
 * 
 * In production, this THROWS if payment address is not configured.
 * In development, it warns but allows testnet operation.
 * 
 * @param {boolean} throwOnError - If true, throws ConfigurationError on critical issues
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateConfig(throwOnError = false) {
  const errors = [];
  const warnings = [];
  
  // Check payment addresses. Either chain is enough: an operator can take
  // payment on Solana only, on Base only, or on both.
  if (!PAY_TO_ADDRESS && !PAY_TO_ADDRESS_SOLANA) {
    if (isProduction) {
      errors.push(
        'X402_PAY_TO_ADDRESS or X402_PAY_TO_ADDRESS_SOLANA is REQUIRED in production. ' +
        'Set at least one wallet address to receive USDC payments.'
      );
    } else {
      warnings.push(
        'No x402 receiving address set - payments will be disabled in development. ' +
        'Set X402_PAY_TO_ADDRESS (Base) or X402_PAY_TO_ADDRESS_SOLANA (Solana) to test payments.'
      );
    }
  } else if (PAY_TO_ADDRESS_SOLANA && !isSolanaPayToConfigured()) {
    errors.push(
      `X402_PAY_TO_ADDRESS_SOLANA "${PAY_TO_ADDRESS_SOLANA}" is not a valid Solana address. ` +
      'Must be a base58 ed25519 public key.'
    );
  }

  if (!PAY_TO_ADDRESS) {
    // Solana-only deployment: nothing more to check on the EVM side.
  } else if (PAY_TO_ADDRESS === '0xYourWalletAddress' || PAY_TO_ADDRESS === '0xYourEthereumAddress') {
    errors.push(
      'X402_PAY_TO_ADDRESS is set to a placeholder value. ' +
      'Update with your actual Ethereum wallet address.'
    );
  } else if (!PAY_TO_ADDRESS.match(/^0x[a-fA-F0-9]{40}$/)) {
    errors.push(
      `X402_PAY_TO_ADDRESS "${PAY_TO_ADDRESS}" is not a valid Ethereum address. ` +
      'Must be 42 characters starting with 0x.'
    );
  }
  
  // Log network status
  if (NETWORK === 'eip155:84532') {
    console.log('⚠️  x402: Running on Base Sepolia TESTNET');
    if (isProduction) {
      warnings.push('Using testnet (Base Sepolia) in production - switch to eip155:8453 for mainnet');
    }
  } else if (NETWORK === 'eip155:8453') {
    console.log('✅ x402: Running on Base MAINNET');
    if (!isProduction) {
      warnings.push('Using mainnet (Base) in development - switch to eip155:84532 for testnet');
    }
  } else {
    warnings.push(`Unknown network: ${NETWORK}`);
  }
  
  const valid = errors.length === 0;
  
  // Throw in production if there are critical errors
  if (throwOnError && !valid) {
    const errorMsg = `\n❌ x402 Configuration Error:\n${errors.map(e => `   • ${e}`).join('\n')}`;
    throw new Error(errorMsg);
  }
  
  // Mark as validated
  configValidated = true;
  
  return { valid, errors, warnings };
}

/**
 * Ensure config has been validated (call on first request)
 * Returns false if payment address is not configured (disables x402)
 */
export function ensureConfigValidated() {
  if (!configValidated) {
    const result = validateConfig();
    
    // Log warnings
    if (result.warnings.length > 0) {
      console.log('⚠️  x402 Configuration Warnings:');
      result.warnings.forEach(w => console.log(`   • ${w}`));
    }
    
    // Log errors (in dev mode, these are non-fatal)
    if (result.errors.length > 0 && !isProduction) {
      console.log('❌ x402 Configuration Errors (non-fatal in development):');
      result.errors.forEach(e => console.log(`   • ${e}`));
    }
  }
  
  // Return whether x402 can operate on at least one chain
  return isX402Configured();
}

/**
 * Check if x402 is properly configured
 */
export function isX402Configured() {
  return isEvmPayToConfigured() || isSolanaPayToConfigured();
}

/** Placeholder values that have shipped in .env.example over the years. */
const PLACEHOLDER_ADDRESSES = new Set([
  '0xYourWalletAddress',
  '0xYourEthereumAddress',
  'YourSolanaAddress',
]);

/** Whether a usable Base/EVM receiving address is configured. */
export function isEvmPayToConfigured() {
  return Boolean(
    PAY_TO_ADDRESS &&
      /^0x[a-fA-F0-9]{40}$/.test(PAY_TO_ADDRESS) &&
      !PLACEHOLDER_ADDRESSES.has(PAY_TO_ADDRESS),
  );
}

/**
 * Whether a usable Solana receiving address is configured.
 * A Solana address is a base58 ed25519 public key, 32 bytes, which renders as
 * 32 to 44 base58 characters.
 */
export function isSolanaPayToConfigured() {
  return Boolean(
    PAY_TO_ADDRESS_SOLANA &&
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(PAY_TO_ADDRESS_SOLANA) &&
      !PLACEHOLDER_ADDRESSES.has(PAY_TO_ADDRESS_SOLANA),
  );
}

/**
 * The receiving address for a network, or null when that chain is not enabled.
 * @param {string} network - CAIP-2 network id.
 * @returns {string|null}
 */
export function getPayTo(network) {
  if (String(network).startsWith('solana:')) {
    return isSolanaPayToConfigured() ? PAY_TO_ADDRESS_SOLANA : null;
  }
  return isEvmPayToConfigured() ? PAY_TO_ADDRESS : null;
}

/**
 * x402 v1 network names, keyed by CAIP-2 id.
 *
 * v1 identifies a chain by a short name (`base`, `solana`); CAIP-2 arrived with
 * v2. Clients and indexers built against v1 do not recognise `eip155:8453` and
 * reject the challenge as unparseable, so the v1 body is rendered with these
 * names while the v2 header keeps the CAIP-2 ids.
 * @type {Record<string, string>}
 */
export const V1_NETWORK_NAMES = {
  'eip155:8453': 'base',
  'eip155:84532': 'base-sepolia',
  'eip155:42161': 'arbitrum',
  'eip155:10': 'optimism',
  'eip155:137': 'polygon',
  'eip155:1': 'ethereum',
  'eip155:43114': 'avalanche',
  'eip155:421614': 'arbitrum-sepolia',
  [SOLANA_MAINNET]: 'solana',
  [SOLANA_DEVNET]: 'solana-devnet',
};

/**
 * The v1 spelling of a network id, falling back to the id itself for a chain
 * with no v1 name.
 * @param {string} network - CAIP-2 network id.
 * @returns {string}
 */
export function toV1Network(network) {
  return V1_NETWORK_NAMES[network] || network;
}

/**
 * Whether two network identifiers name the same chain, in either spelling.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function sameNetwork(a, b) {
  if (!a || !b) return false;
  return a === b || toV1Network(a) === toV1Network(b);
}

/**
 * Build the `accepts` array for a 402 challenge: one entry per chain that has a
 * receiving address, Solana first.
 *
 * Amounts are integer strings in the token's smallest unit. USDC is 6 decimals
 * on both Solana and Base, so a `$0.001` price is `1000`.
 *
 * @param {object} options
 * @param {string} options.price - Price as a dollar string, e.g. '$0.001'.
 * @param {string} options.resource - Absolute URL of the paid resource.
 * @param {string} options.description - Human-readable description.
 * @param {number} [options.maxTimeoutSeconds] - Settlement window.
 * @returns {object[]} Spec-shaped payment requirements.
 */
export function buildAccepts({ price, resource, description, maxTimeoutSeconds = 300 }) {
  const dollars = Number.parseFloat(String(price).replace('$', ''));
  if (!Number.isFinite(dollars) || dollars <= 0) return [];
  const amount = String(Math.round(dollars * 1_000_000));

  const accepts = [];
  for (const network of [SOLANA_NETWORK, NETWORK]) {
    const payTo = getPayTo(network);
    if (!payTo) continue;
    const config = SUPPORTED_NETWORKS[network];
    if (!config) continue;
    accepts.push({
      scheme: 'exact',
      network,
      amount,
      asset: config.usdc,
      payTo,
      maxTimeoutSeconds,
      resource,
      description,
      mimeType: 'application/json',
      // On EVM this is the EIP-712 domain the wallet signs USDC's
      // transferWithAuthorization against. Solana has no such domain: what it
      // needs instead is the facilitator's fee payer, which only the
      // facilitator can supply, so it is merged in later from /supported.
      ...(network.startsWith('solana:') ? {} : { extra: { name: 'USD Coin', version: '2' } }),
    });
  }
  return accepts;
}

// Get human-readable operation name
/**
 * The operation key for a request path, and the path for an operation key.
 *
 * Every gate used to derive this itself with `path.split('/')` taking the first
 * two segments, which silently could not express a three-segment route:
 * `/api/ai/monitor/alert/new-followers` resolved to the operation
 * `monitor:alert`, which has no price, so the endpoint was served free no matter
 * what the price table said. Deriving it in one place from the whole path is
 * what keeps the price table, the middleware, and the edge gates agreeing.
 *
 * @param {string} path - Absolute request path, e.g. /api/ai/scrape/profile
 * @returns {string|null} operation key, or null when the path is not an AI route
 */
export function operationForPath(path) {
  const match = String(path).match(/^\/api\/ai\/(.+)$/);
  if (!match) return null;
  const segments = match[1].split('?')[0].replace(/\/+$/, '').split('/').filter(Boolean);
  if (segments.length < 2) return null;
  return segments.join(':');
}

/**
 * Inverse of {@link operationForPath}.
 * @param {string} operation - e.g. "scrape:profile"
 * @returns {string} absolute path
 */
export function pathForOperation(operation) {
  return `/api/ai/${String(operation).split(':').join('/')}`;
}

export function getOperationName(operation) {
  const names = {
    'scrape:profile': 'Scrape Profile',
    'scrape:followers': 'Scrape Followers',
    'scrape:following': 'Scrape Following',
    'scrape:tweets': 'Scrape Tweets',
    'scrape:thread': 'Scrape Thread',
    'scrape:search': 'Search Tweets',
    'scrape:hashtag': 'Scrape Hashtag',
    'scrape:media': 'Scrape Media',
    'action:unfollow-non-followers': 'Unfollow Non-Followers',
    'action:unfollow-everyone': 'Unfollow Everyone',
    'action:detect-unfollowers': 'Detect Unfollowers',
    'action:auto-like': 'Auto Like',
    'action:follow-engagers': 'Follow Engagers',
    'action:keyword-follow': 'Keyword Follow',
    'monitor:account': 'Monitor Account',
    'monitor:followers': 'Monitor Followers',
    'alert:new-followers': 'New Follower Alerts',
    'download:video': 'Download Video',
    'export:bookmarks': 'Export Bookmarks',
    'unroll:thread': 'Unroll Thread',
  };
  return names[operation] || operation;
}

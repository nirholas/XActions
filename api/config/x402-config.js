/**
 * x402 Payment Configuration
 * 
 * Configure payment requirements for AI agent endpoints.
 * Humans use free browser scripts; AI agents pay per API call.
 * 
 * @see https://x402.org for protocol documentation
 */

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Payment receiving address (REQUIRED in production)
export const PAY_TO_ADDRESS = process.env.X402_PAY_TO_ADDRESS || (isProduction ? null : null);

// Facilitator URL (testnet for development, mainnet for production)
export const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';

// Network configuration (legacy - for backwards compatibility)
// Development: eip155:84532 (Base Sepolia testnet)
// Production: eip155:8453 (Base mainnet)
export const NETWORK = process.env.X402_NETWORK || (isProduction ? 'eip155:8453' : 'eip155:84532');

// Track if config has been validated
let configValidated = false;

// Supported networks configuration (multi-network support)
export const SUPPORTED_NETWORKS = {
  'eip155:8453': {
    name: 'Base',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    recommended: true,
    gasCost: 'low'
  },
  'eip155:84532': {
    name: 'Base Sepolia',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    testnet: true,
    gasCost: 'low'
  },
  'eip155:1': {
    name: 'Ethereum',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    gasCost: 'high'
  },
  'eip155:42161': {
    name: 'Arbitrum One',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    gasCost: 'low'
  }
};

/**
 * Get list of accepted networks for payments
 * @param {boolean} includeTestnet - Whether to include testnet networks
 * @returns {Array} Array of network configurations
 */
export function getAcceptedNetworks(includeTestnet = false) {
  return Object.entries(SUPPORTED_NETWORKS)
    .filter(([_, config]) => includeTestnet || !config.testnet)
    .map(([network, config]) => ({
      network,
      ...config
    }));
}

/**
 * Get network configuration by network ID
 * @param {string} networkId - Network identifier (e.g., 'eip155:8453')
 * @returns {Object|null} Network configuration or null if not found
 */
export function getNetworkConfig(networkId) {
  return SUPPORTED_NETWORKS[networkId] || null;
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
  'profile:get': '$0.001',           // Get profile info
  'profile:update': '$0.01',         // Update profile fields
  
  // Posting operations
  'posting:tweet': '$0.005',         // Post a tweet
  'posting:thread': '$0.01',         // Post a thread
  'posting:poll': '$0.01',           // Create a poll
  'posting:schedule': '$0.005',      // Schedule a post
  'posting:delete': '$0.002',        // Delete a tweet
  
  // Engagement operations
  'engagement:like': '$0.002',       // Like a tweet
  'engagement:unlike': '$0.002',     // Unlike a tweet
  'engagement:reply': '$0.005',      // Reply to a tweet
  'engagement:bookmark': '$0.002',   // Bookmark a tweet
  'engagement:auto-like': '$0.02',   // Auto-like by keywords
  'engagement:analytics': '$0.01',   // Engagement analytics
  
  // Discovery operations
  'discovery:search': '$0.01',       // Search tweets
  'discovery:trends': '$0.005',      // Get trending topics
  'discovery:explore': '$0.005',     // Explore feed
  
  // Notification operations
  'notifications:get': '$0.005',     // Get notifications
  'notifications:mute': '$0.002',    // Mute a user
  'notifications:unmute': '$0.002',  // Unmute a user
  
  // DM operations
  'messages:send': '$0.01',          // Send a DM
  'messages:conversations': '$0.005', // List conversations
  'messages:export': '$0.02',        // Export DMs
  
  // Bookmark operations
  'bookmarks:get': '$0.01',          // Get bookmarks
  'bookmarks:folder': '$0.005',      // Create folder
  'bookmarks:clear': '$0.01',        // Clear all bookmarks
  
  // Creator operations
  'creator:analytics': '$0.01',      // Creator analytics
  'creator:revenue': '$0.005',       // Revenue info
  'creator:subscribers': '$0.01',    // Subscriber list
  
  // Spaces operations
  'spaces:live': '$0.005',           // Live Spaces
  'spaces:scheduled': '$0.005',      // Scheduled Spaces
  'spaces:scrape': '$0.01',          // Scrape a Space
  
  // Settings operations
  'settings:get': '$0.005',          // Get settings
  'settings:protected': '$0.005',    // Toggle protected
  'settings:blocked': '$0.01',       // Get blocked accounts
  'settings:muted': '$0.01',         // Get muted accounts
  'settings:download-data': '$0.02', // Request data download
  
  // Grok AI operations
  'grok:query': '$0.02',             // Query Grok
  'grok:summarize': '$0.02',         // Summarize topic
  
  // Business operations
  'business:brand-monitor': '$0.03', // Brand monitoring
  'business:competitor': '$0.03',    // Competitor analysis
  
  // Premium operations
  'premium:check': '$0.001',         // Check premium status
  
  // Article operations
  'article:publish': '$0.05',        // Publish article
  'article:analytics': '$0.01',      // Article analytics
};

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
export function validateConfig(throwOnError = isProduction) {
  const errors = [];
  const warnings = [];
  
  // Check payment address
  if (!PAY_TO_ADDRESS) {
    if (isProduction) {
      errors.push(
        'X402_PAY_TO_ADDRESS is REQUIRED in production. ' +
        'Set your wallet address to receive USDC payments.'
      );
    } else {
      warnings.push(
        'X402_PAY_TO_ADDRESS not set - x402 payments will be disabled in development. ' +
        'Set this environment variable to test payments.'
      );
    }
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
  
  // Return whether x402 can operate
  return PAY_TO_ADDRESS && 
         PAY_TO_ADDRESS !== '0xYourWalletAddress' && 
         PAY_TO_ADDRESS !== '0xYourEthereumAddress';
}

/**
 * Check if x402 is properly configured
 */
export function isX402Configured() {
  return PAY_TO_ADDRESS && 
         PAY_TO_ADDRESS.match(/^0x[a-fA-F0-9]{40}$/) &&
         PAY_TO_ADDRESS !== '0xYourWalletAddress' &&
         PAY_TO_ADDRESS !== '0xYourEthereumAddress';
}

// Get human-readable operation name
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

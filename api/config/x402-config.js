/**
 * x402 Payment Configuration
 * 
 * Configure payment requirements for AI agent endpoints.
 * Humans use free browser scripts; AI agents pay per API call.
 * 
 * @see https://x402.org for protocol documentation
 */

// Payment receiving address (set in environment)
export const PAY_TO_ADDRESS = process.env.X402_PAY_TO_ADDRESS || '0xYourWalletAddress';

// Facilitator URL (testnet for development, mainnet for production)
export const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';

// Network configuration
export const NETWORK = process.env.X402_NETWORK || 'eip155:84532'; // Base Sepolia testnet
// Production: 'eip155:8453' (Base mainnet)

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

// Validate environment configuration
export function validateConfig() {
  const errors = [];
  const warnings = [];
  
  if (!process.env.X402_PAY_TO_ADDRESS) {
    warnings.push('X402_PAY_TO_ADDRESS not set - payments will go to default address');
  }
  
  if (PAY_TO_ADDRESS === '0xYourWalletAddress') {
    errors.push('X402_PAY_TO_ADDRESS is set to default - update with your actual wallet address');
  }
  
  if (NETWORK === 'eip155:84532') {
    console.log('⚠️  x402: Running on Base Sepolia testnet');
  } else if (NETWORK === 'eip155:8453') {
    console.log('✅ x402: Running on Base mainnet');
  }
  
  return { valid: errors.length === 0, errors, warnings };
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

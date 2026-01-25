/**
 * x402 Payment Client for XActions API
 * 
 * Handles automatic payment for AI API calls using the x402 protocol:
 * 1. Makes request to endpoint
 * 2. If 402 Payment Required, extracts payment requirements
 * 3. Signs USDC payment with private key (EIP-3009 TransferWithAuthorization)
 * 4. Retries with X-PAYMENT header
 * 5. Returns result
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @see https://x402.org
 * @license MIT
 */

import crypto from 'crypto';

// Lazy-load viem to make it optional
let viem = null;
let viemAccounts = null;
let viemChains = null;

async function loadViem() {
  if (!viem) {
    try {
      viem = await import('viem');
      viemAccounts = await import('viem/accounts');
      viemChains = await import('viem/chains');
    } catch (e) {
      throw new Error(
        'viem package not installed. Install with: npm install viem\n' +
        'This is required for x402 payment signing in remote mode.'
      );
    }
  }
  return { viem, viemAccounts, viemChains };
}

// Supported network configurations
export const NETWORK_CONFIGS = {
  'base-sepolia': {
    chainId: 84532,
    networkId: 'eip155:84532',
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    name: 'Base Sepolia',
    testnet: true,
    gasCost: 'low'
  },
  'base': {
    chainId: 8453,
    networkId: 'eip155:8453',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    name: 'Base',
    recommended: true,
    gasCost: 'low'
  },
  'ethereum': {
    chainId: 1,
    networkId: 'eip155:1',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    name: 'Ethereum',
    gasCost: 'high'
  },
  'arbitrum': {
    chainId: 42161,
    networkId: 'eip155:42161',
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    name: 'Arbitrum One',
    gasCost: 'low'
  }
};

// Legacy USDC addresses (for backwards compatibility)
const USDC_ADDRESSES = {
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'arbitrum': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
};

// Legacy chain IDs (for backwards compatibility)
const CHAIN_IDS = {
  'base-sepolia': 84532,
  'base': 8453,
  'ethereum': 1,
  'arbitrum': 42161,
};

/**
 * Get the cheapest available network from payment options
 * Prefers networks with low gas costs and skips testnets in production
 */
function selectBestNetwork(accepts, preferTestnet = false) {
  if (!accepts || accepts.length === 0) return null;
  
  // Sort by: recommended first, then low gas cost, then name
  const sorted = [...accepts].sort((a, b) => {
    const aExtra = a.extra || {};
    const bExtra = b.extra || {};
    
    // Skip testnets if not preferred
    if (!preferTestnet) {
      if (aExtra.testnet && !bExtra.testnet) return 1;
      if (!aExtra.testnet && bExtra.testnet) return -1;
    }
    
    // Recommended first
    if (aExtra.recommended && !bExtra.recommended) return -1;
    if (!aExtra.recommended && bExtra.recommended) return 1;
    
    // Low gas cost preferred
    if (aExtra.gasCost === 'low' && bExtra.gasCost !== 'low') return -1;
    if (aExtra.gasCost !== 'low' && bExtra.gasCost === 'low') return 1;
    
    return 0;
  });
  
  return sorted[0];
}

/**
 * Convert network ID (eip155:8453) to network name (base)
 */
function networkIdToName(networkId) {
  for (const [name, config] of Object.entries(NETWORK_CONFIGS)) {
    if (config.networkId === networkId) return name;
  }
  return null;
}

/**
 * Get chain object for viem based on network name
 */
async function getChainForNetwork(networkName) {
  const { viemChains } = await loadViem();
  
  switch (networkName) {
    case 'base-sepolia': return viemChains.baseSepolia;
    case 'base': return viemChains.base;
    case 'ethereum': return viemChains.mainnet;
    case 'arbitrum': return viemChains.arbitrum;
    default: return viemChains.baseSepolia;
  }
}

/**
 * Create an x402-enabled API client
 * 
 * @param {Object} config - Configuration options
 * @param {string} config.apiUrl - Base URL for XActions API
 * @param {string} config.privateKey - Wallet private key for payments (0x prefixed)
 * @param {string} config.sessionCookie - X/Twitter session cookie (optional)
 * @param {string} config.network - Preferred network ('base-sepolia', 'base', 'ethereum', 'arbitrum')
 * @param {boolean} config.autoSelectNetwork - Auto-select cheapest network from options (default: true)
 */
export async function createX402Client(config) {
  const { 
    apiUrl = 'https://api.xactions.app', 
    privateKey, 
    sessionCookie,
    network = 'base-sepolia', // Default to testnet
    autoSelectNetwork = true, // Auto-select best network from 402 response
  } = config;
  
  if (!privateKey) {
    console.error('⚠️  X402_PRIVATE_KEY not set - payments will fail');
    console.error('   Get testnet USDC: https://faucet.circle.com/');
  }
  
  // Validate network
  if (!NETWORK_CONFIGS[network]) {
    console.error(`⚠️  Unknown network: ${network}. Using base-sepolia.`);
    console.error(`   Available networks: ${Object.keys(NETWORK_CONFIGS).join(', ')}`);
  }
  
  // Set up wallet for signing payments (lazy loaded)
  let wallet = null;
  let account = null;
  let currentNetwork = network;
  
  if (privateKey) {
    try {
      const { viem, viemAccounts } = await loadViem();
      
      // Ensure private key has 0x prefix
      const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      account = viemAccounts.privateKeyToAccount(pk);
      
      const chain = await getChainForNetwork(network);
      wallet = viem.createWalletClient({
        account,
        chain,
        transport: viem.http(),
      });
      
      console.error(`💰 x402 wallet initialized: ${account.address}`);
      console.error(`   Default network: ${NETWORK_CONFIGS[network]?.name || network}`);
      console.error(`   Auto-select: ${autoSelectNetwork ? 'enabled' : 'disabled'}`);
    } catch (e) {
      console.error(`⚠️  Failed to initialize wallet: ${e.message}`);
    }
  }
  
  /**
   * Make API request with automatic x402 payment handling
   */
  async function apiRequest(endpoint, body) {
    const url = `${apiUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'XActions-MCP/2.0 (x402)',
    };
    
    if (sessionCookie) {
      headers['X-Session-Cookie'] = sessionCookie;
    }
    
    console.error(`📡 Request: ${endpoint}`);
    
    // First request (may return 402)
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    
    // Success - return result
    if (response.ok) {
      console.error(`✅ Success (no payment required)`);
      return await response.json();
    }
    
    // Payment required
    if (response.status === 402) {
      console.error(`💳 Payment required (402)`);
      
      if (!wallet) {
        const error = new Error('Payment required but no wallet configured');
        error.code = 'PAYMENT_REQUIRED';
        
        // Try to get price info from response
        try {
          const data = await response.json();
          error.price = data.price;
          error.network = data.network;
        } catch (e) {
          // Ignore JSON parse errors
        }
        
        throw error;
      }
      
      // Extract payment requirements from header
      const paymentRequiredHeader = response.headers.get('X-Payment-Required') || 
                                     response.headers.get('Payment-Required');
      
      if (!paymentRequiredHeader) {
        throw new Error('402 response missing payment requirements header');
      }
      
      let paymentRequired;
      try {
        paymentRequired = JSON.parse(
          Buffer.from(paymentRequiredHeader, 'base64').toString('utf-8')
        );
      } catch (e) {
        // Try parsing as plain JSON
        paymentRequired = JSON.parse(paymentRequiredHeader);
      }
      
      // Select the best network for payment
      let selectedNetwork = network;
      let selectedAccept = paymentRequired.accepts?.[0];
      
      if (autoSelectNetwork && paymentRequired.accepts?.length > 1) {
        // Auto-select the best network (cheapest gas, recommended, etc.)
        const preferTestnet = network.includes('sepolia') || network.includes('testnet');
        selectedAccept = selectBestNetwork(paymentRequired.accepts, preferTestnet);
        
        if (selectedAccept) {
          const networkName = networkIdToName(selectedAccept.network);
          if (networkName && networkName !== network) {
            selectedNetwork = networkName;
            console.error(`   Auto-selected network: ${selectedAccept.extra?.networkName || selectedNetwork}`);
          }
        }
      }
      
      console.error(`   Amount: ${selectedAccept?.maxAmountRequired || 'unknown'}`);
      console.error(`   Network: ${selectedAccept?.extra?.networkName || selectedNetwork}`);
      console.error(`   Asset: USDC`);
      
      // Sign payment for the selected network
      const payment = await signPayment(wallet, account, paymentRequired, selectedNetwork, selectedAccept);
      
      console.error(`   Signed payment, retrying request...`);
      
      // Retry with payment
      const paidResponse = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'X-Payment': Buffer.from(JSON.stringify(payment)).toString('base64'),
        },
        body: JSON.stringify(body),
      });
      
      if (!paidResponse.ok) {
        const errorData = await paidResponse.json().catch(() => ({}));
        const error = new Error(errorData.message || `Payment failed: ${paidResponse.status}`);
        error.code = 'PAYMENT_FAILED';
        throw error;
      }
      
      // Check for settlement confirmation
      const settlementHeader = paidResponse.headers.get('X-Payment-Response') ||
                               paidResponse.headers.get('Payment-Response');
      
      if (settlementHeader) {
        try {
          const settlement = JSON.parse(
            Buffer.from(settlementHeader, 'base64').toString('utf-8')
          );
          console.error(`✅ Payment settled: ${settlement.transaction || settlement.txHash || 'confirmed'}`);
        } catch (e) {
          console.error(`✅ Payment accepted`);
        }
      } else {
        console.error(`✅ Payment accepted`);
      }
      
      return await paidResponse.json();
    }
    
    // Other error
    let errorMessage = `API error: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // Ignore JSON parse errors
    }
    
    throw new Error(errorMessage);
  }
  
  /**
   * Sign payment using x402 protocol (EIP-3009 TransferWithAuthorization)
   * @param {Object} wallet - Viem wallet client
   * @param {Object} account - Viem account
   * @param {Object} paymentRequired - Full payment requirements from 402 response
   * @param {string} network - Network name to use (e.g., 'base', 'ethereum', 'arbitrum')
   * @param {Object} selectedAccept - Specific accept option to use (optional)
   */
  async function signPayment(wallet, account, paymentRequired, network, selectedAccept = null) {
    // Use selected accept or fall back to first option
    const requirements = selectedAccept || paymentRequired.accepts?.[0] || paymentRequired;
    
    // Get network config
    const networkConfig = NETWORK_CONFIGS[network] || NETWORK_CONFIGS['base-sepolia'];
    
    // Get USDC address from requirements or network config
    const usdcAddress = requirements.asset || networkConfig.usdc;
    const chainId = networkConfig.chainId;
    const networkId = requirements.network || networkConfig.networkId;
    
    // Generate unique nonce
    const nonce = `0x${crypto.randomBytes(32).toString('hex')}`;
    
    // Set validity window (1 hour)
    const validAfter = 0;
    const validBefore = Math.floor(Date.now() / 1000) + 3600;
    
    // Create EIP-712 typed data for TransferWithAuthorization (EIP-3009)
    const domain = {
      name: 'USD Coin', // USDC uses this name
      version: '2',
      chainId,
      verifyingContract: usdcAddress,
    };
    
    const types = {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };
    
    const message = {
      from: account.address,
      to: requirements.payTo,
      value: BigInt(requirements.maxAmountRequired),
      validAfter: BigInt(validAfter),
      validBefore: BigInt(validBefore),
      nonce,
    };
    
    // Sign the typed data
    const signature = await wallet.signTypedData({
      domain,
      types,
      primaryType: 'TransferWithAuthorization',
      message,
    });
    
    // Return x402 payment object with network information
    // Using x402Version: 2 to match middleware expectations
    return {
      x402Version: 2,
      scheme: 'exact',
      network: networkId, // Use EIP-155 network ID (e.g., 'eip155:8453')
      payload: {
        signature,
        authorization: {
          from: account.address,
          to: requirements.payTo,
          value: requirements.maxAmountRequired.toString(),
          validAfter: validAfter.toString(),
          validBefore: validBefore.toString(),
          nonce,
        },
        networkName: network, // Human-readable network name
        chainId, // Chain ID for verification
      },
    };
  }
  
  // Map tool names to API endpoints
  const toolEndpoints = {
    // Scraping tools
    x_get_profile: '/api/ai/scrape/profile',
    x_get_followers: '/api/ai/scrape/followers',
    x_get_following: '/api/ai/scrape/following',
    x_get_tweets: '/api/ai/scrape/tweets',
    x_search_tweets: '/api/ai/scrape/search',
    
    // Analysis tools
    x_get_non_followers: '/api/ai/analysis/non-followers',
    x_detect_unfollowers: '/api/ai/analysis/detect-unfollowers',
    
    // Action tools
    x_follow: '/api/ai/action/follow',
    x_unfollow: '/api/ai/action/unfollow',
    x_unfollow_non_followers: '/api/ai/action/unfollow-non-followers',
    x_post_tweet: '/api/ai/action/post-tweet',
    x_like: '/api/ai/action/like',
    x_retweet: '/api/ai/action/retweet',
    
    // Download tools
    x_download_video: '/api/ai/download/video',
    
    // Auth tools
    x_login: '/api/ai/auth/login',
  };
  
  /**
   * Execute a tool via the remote API
   */
  async function execute(toolName, args) {
    const endpoint = toolEndpoints[toolName];
    if (!endpoint) {
      throw new Error(`Unknown tool: ${toolName}. Available: ${Object.keys(toolEndpoints).join(', ')}`);
    }
    
    const result = await apiRequest(endpoint, {
      ...args,
      // Include session cookie in body as fallback
      sessionCookie: args.sessionCookie || sessionCookie,
    });
    
    // Normalize response format
    return result.data || result;
  }
  
  /**
   * Get wallet info and supported networks (for debugging)
   */
  async function getBalance() {
    if (!account) {
      return { error: 'No wallet configured' };
    }
    
    const networkConfig = NETWORK_CONFIGS[currentNetwork] || NETWORK_CONFIGS['base-sepolia'];
    
    return {
      address: account.address,
      network: currentNetwork,
      networkName: networkConfig.name,
      chainId: networkConfig.chainId,
      usdcContract: networkConfig.usdc,
      autoSelectNetwork,
      supportedNetworks: Object.entries(NETWORK_CONFIGS).map(([name, config]) => ({
        name,
        displayName: config.name,
        chainId: config.chainId,
        networkId: config.networkId,
        recommended: config.recommended || false,
        testnet: config.testnet || false,
        gasCost: config.gasCost
      })),
      note: 'Use a block explorer to check USDC balance',
    };
  }
  
  return {
    execute,
    getBalance,
    wallet,
    account,
    network: currentNetwork,
    networkConfig: NETWORK_CONFIGS[currentNetwork],
    supportedNetworks: NETWORK_CONFIGS,
    autoSelectNetwork,
  };
}

/**
 * Helper to check if an error is a payment error
 */
export function isPaymentError(error) {
  return error.code === 'PAYMENT_REQUIRED' || error.code === 'PAYMENT_FAILED';
}

/**
 * Format payment error for user display
 */
export function formatPaymentError(error) {
  if (error.code === 'PAYMENT_REQUIRED') {
    return {
      error: 'Payment required',
      message: error.message,
      price: error.price,
      network: error.network,
      hint: 'Set X402_PRIVATE_KEY environment variable with a funded wallet',
      faucet: 'Get testnet USDC at https://faucet.circle.com/',
      supportedNetworks: Object.keys(NETWORK_CONFIGS),
    };
  }
  
  if (error.code === 'PAYMENT_FAILED') {
    return {
      error: 'Payment failed',
      message: error.message,
      hint: 'Check wallet has sufficient USDC balance and has approved the transfer',
      supportedNetworks: Object.keys(NETWORK_CONFIGS),
    };
  }
  
  return { error: error.message };
}

export default { createX402Client, isPaymentError, formatPaymentError, NETWORK_CONFIGS };

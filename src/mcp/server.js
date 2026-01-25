#!/usr/bin/env node
/**
 * XActions MCP Server
 * Model Context Protocol server for AI agents (Claude, GPT, etc.)
 * 
 * This enables AI assistants to automate X/Twitter tasks directly.
 * 
 * Modes:
 * - LOCAL (default): Free, uses Puppeteer for browser automation
 * - REMOTE: Paid via x402 protocol, uses XActions cloud API
 * 
 * Environment Variables:
 * - XACTIONS_MODE: 'local' (default) or 'remote'
 * - XACTIONS_API_URL: API URL for remote mode (default: https://api.xactions.app)
 * - X402_PRIVATE_KEY: Wallet private key for x402 payments (remote mode)
 * - X402_NETWORK: 'base-sepolia' (testnet, default) or 'base' (mainnet)
 * - XACTIONS_SESSION_COOKIE: X/Twitter auth_token cookie
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

// ============================================================================
// Configuration
// ============================================================================

const MODE = process.env.XACTIONS_MODE || 'local';
const API_URL = process.env.XACTIONS_API_URL || 'https://api.xactions.app';
const X402_PRIVATE_KEY = process.env.X402_PRIVATE_KEY;
const X402_NETWORK = process.env.X402_NETWORK || 'base-sepolia';
const SESSION_COOKIE = process.env.XACTIONS_SESSION_COOKIE;

// Dynamic backend (initialized at startup)
let localTools = null;
let remoteClient = null;

// ============================================================================
// Tool Definitions
// ============================================================================

const TOOLS = [
  {
    name: 'x_login',
    description: 'Login to X/Twitter using a session cookie (auth_token). Required before some operations.',
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
    name: 'x_unfollow_non_followers',
    description: 'Bulk unfollow accounts that don\'t follow you back.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Your username to analyze',
        },
        maxUnfollows: {
          type: 'number',
          description: 'Maximum accounts to unfollow (default: 100)',
        },
        dryRun: {
          type: 'boolean',
          description: 'Preview without actually unfollowing (default: false)',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_detect_unfollowers',
    description: 'Get current followers for comparison. Run periodically to detect unfollowers.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username to track followers for',
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
  {
    name: 'x_download_video',
    description: 'Get video download URLs from a tweet.',
    inputSchema: {
      type: 'object',
      properties: {
        tweetUrl: {
          type: 'string',
          description: 'URL of the tweet containing video',
        },
      },
      required: ['tweetUrl'],
    },
  },
];

// ============================================================================
// Backend Initialization
// ============================================================================

/**
 * Initialize the appropriate backend based on mode
 */
async function initializeBackend() {
  if (MODE === 'remote') {
    console.error('🌐 XActions MCP Server: Remote mode');
    console.error('   API: ' + API_URL);
    console.error('   Payments: x402 protocol');
    
    if (!X402_PRIVATE_KEY) {
      console.error('⚠️  X402_PRIVATE_KEY not set - payment-required requests will fail');
      console.error('   Set it to enable automatic payments for API calls');
    }
    
    const { createX402Client } = await import('./x402-client.js');
    remoteClient = await createX402Client({
      apiUrl: API_URL,
      privateKey: X402_PRIVATE_KEY,
      sessionCookie: SESSION_COOKIE,
      network: X402_NETWORK,
    });
    
  } else {
    console.error('💻 XActions MCP Server: Local mode (free)');
    console.error('   Using Puppeteer for browser automation');
    
    const tools = await import('./local-tools.js');
    localTools = tools.toolMap || tools.default || tools;
    
    if (SESSION_COOKIE) {
      console.error('   Session cookie provided - will authenticate');
    }
  }
}

/**
 * Execute a tool using the appropriate backend
 */
async function executeTool(name, args) {
  // Add session cookie to args if provided globally
  if (SESSION_COOKIE && !args.cookie && name === 'x_login') {
    args.cookie = SESSION_COOKIE;
  }
  
  if (MODE === 'remote') {
    return await remoteClient.execute(name, args);
  } else {
    const toolFn = localTools[name];
    if (!toolFn) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return await toolFn(args);
  }
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

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Execute tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const result = await executeTool(name, args || {});
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
    
  } catch (error) {
    // Handle x402 payment errors specially
    if (error.code === 'PAYMENT_REQUIRED') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Payment required',
              message: error.message,
              price: error.price,
              network: error.network || X402_NETWORK,
              hint: 'Set X402_PRIVATE_KEY with a funded wallet to enable automatic payments',
              faucet: X402_NETWORK === 'base-sepolia' 
                ? 'Get testnet USDC: https://faucet.circle.com/' 
                : 'Ensure wallet has USDC on Base',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
    
    if (error.code === 'PAYMENT_FAILED') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Payment failed',
              message: error.message,
              hint: 'Check wallet balance and try again',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
    
    // Generic error
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            ...(process.env.DEBUG ? { stack: error.stack } : {}),
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// ============================================================================
// Cleanup and Startup
// ============================================================================

// Cleanup on exit
process.on('SIGINT', async () => {
  console.error('\n🛑 Shutting down...');
  if (MODE === 'local' && localTools?.closeBrowser) {
    await localTools.closeBrowser();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (MODE === 'local' && localTools?.closeBrowser) {
    await localTools.closeBrowser();
  }
  process.exit(0);
});

// Start server
async function main() {
  console.error('');
  console.error('⚡ XActions MCP Server v3.0.0');
  console.error('   https://github.com/nirholas/XActions');
  console.error('');
  
  await initializeBackend();
  
  console.error('');
  console.error('📋 Available tools: ' + TOOLS.length);
  console.error('');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('✅ Server running on stdio');
  console.error('   Ready for connections from Claude, Cursor, etc.');
  console.error('');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

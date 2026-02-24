#!/usr/bin/env node
/**
 * XActions MCP Server
 * Model Context Protocol server for AI agents (Claude, GPT, etc.)
 * 
 * This enables AI assistants to automate X/Twitter tasks directly.
 * Free and open source. No API keys required.
 * 
 * Modes:
 * - LOCAL (default): Free, uses Puppeteer for browser automation
 * - REMOTE: Optional cloud API (can self-host)
 * 
 * Environment Variables:
 * - XACTIONS_MODE: 'local' (default) or 'remote'
 * - XACTIONS_API_URL: API URL for remote mode (default: https://api.xactions.app)
 * - XACTIONS_SESSION_COOKIE: X/Twitter auth_token cookie
 * - X402_PRIVATE_KEY: (Optional) Wallet key for remote mode micropayments
 * - X402_NETWORK: (Optional) 'base-sepolia' or 'base'
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
  // ====== Profile Management ======
  {
    name: 'x_update_profile',
    description: 'Update your X/Twitter profile fields (name, bio, location, website).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Display name (max 50 chars)' },
        bio: { type: 'string', description: 'Bio text (max 160 chars)' },
        location: { type: 'string', description: 'Location text' },
        website: { type: 'string', description: 'Website URL' },
      },
    },
  },
  // ====== Posting & Content ======
  {
    name: 'x_post_thread',
    description: 'Post a multi-tweet thread to X/Twitter.',
    inputSchema: {
      type: 'object',
      properties: {
        tweets: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tweet texts for the thread (2+ tweets)',
        },
      },
      required: ['tweets'],
    },
  },
  {
    name: 'x_create_poll',
    description: 'Create a poll tweet on X/Twitter.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Poll question text' },
        options: {
          type: 'array',
          items: { type: 'string' },
          description: 'Poll options (2-4 choices)',
        },
        durationMinutes: { type: 'number', description: 'Poll duration in minutes (default: 1440 = 24h)' },
      },
      required: ['question', 'options'],
    },
  },
  {
    name: 'x_schedule_post',
    description: 'Schedule a tweet for future posting (requires Premium).',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Tweet text' },
        scheduledAt: { type: 'string', description: 'ISO 8601 datetime for posting' },
      },
      required: ['text', 'scheduledAt'],
    },
  },
  {
    name: 'x_delete_tweet',
    description: 'Delete a tweet by its URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Full URL of the tweet to delete' },
      },
      required: ['url'],
    },
  },
  // ====== Engagement ======
  {
    name: 'x_reply',
    description: 'Reply to a tweet.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL of the tweet to reply to' },
        text: { type: 'string', description: 'Reply text' },
      },
      required: ['url', 'text'],
    },
  },
  {
    name: 'x_bookmark',
    description: 'Bookmark a tweet.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL of the tweet to bookmark' },
      },
      required: ['url'],
    },
  },
  {
    name: 'x_get_bookmarks',
    description: 'Export your bookmarked tweets.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum bookmarks to export (default: 100)' },
        format: { type: 'string', description: 'Output format: json or csv (default: json)' },
      },
    },
  },
  {
    name: 'x_clear_bookmarks',
    description: 'Clear all bookmarks. This cannot be undone.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'x_auto_like',
    description: 'Auto-like tweets matching keywords in your feed.',
    inputSchema: {
      type: 'object',
      properties: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keywords to filter tweets (empty = like all)',
        },
        maxLikes: { type: 'number', description: 'Maximum likes (default: 20)' },
      },
    },
  },
  // ====== Discovery ======
  {
    name: 'x_get_trends',
    description: 'Get current trending topics on X/Twitter.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Category filter: trending, news, sports, entertainment' },
        limit: { type: 'number', description: 'Maximum trends (default: 30)' },
      },
    },
  },
  {
    name: 'x_get_explore',
    description: 'Scrape the Explore feed for trending content.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Explore category (default: trending)' },
        limit: { type: 'number', description: 'Maximum items (default: 30)' },
      },
    },
  },
  // ====== Notifications ======
  {
    name: 'x_get_notifications',
    description: 'Scrape your recent notifications with type classification.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum notifications (default: 100)' },
        filter: { type: 'string', description: 'Filter by type: all, mentions, likes, follows' },
      },
    },
  },
  {
    name: 'x_mute_user',
    description: 'Mute an X/Twitter user.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username to mute (without @)' },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_unmute_user',
    description: 'Unmute an X/Twitter user.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username to unmute (without @)' },
      },
      required: ['username'],
    },
  },
  // ====== Direct Messages ======
  {
    name: 'x_send_dm',
    description: 'Send a direct message to an X/Twitter user.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Recipient username (without @)' },
        message: { type: 'string', description: 'Message text' },
      },
      required: ['username', 'message'],
    },
  },
  {
    name: 'x_get_conversations',
    description: 'Get your DM conversation list.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum conversations (default: 20)' },
      },
    },
  },
  {
    name: 'x_export_dms',
    description: 'Export DM messages to JSON.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum messages (default: 100)' },
      },
    },
  },
  // ====== Grok AI ======
  {
    name: 'x_grok_query',
    description: 'Query Grok AI on X/Twitter. Requires Premium access.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Question or prompt for Grok' },
        mode: { type: 'string', description: 'Grok mode: default, deepsearch, think (default: default)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'x_grok_summarize',
    description: 'Use Grok to summarize a topic from X/Twitter posts.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Topic to summarize' },
      },
      required: ['topic'],
    },
  },
  // ====== Lists ======
  {
    name: 'x_get_lists',
    description: 'Get your X/Twitter lists.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum lists (default: 50)' },
      },
    },
  },
  {
    name: 'x_get_list_members',
    description: 'Get members of a specific X/Twitter list.',
    inputSchema: {
      type: 'object',
      properties: {
        listUrl: { type: 'string', description: 'URL of the list' },
        limit: { type: 'number', description: 'Maximum members (default: 100)' },
      },
      required: ['listUrl'],
    },
  },
  // ====== Spaces ======
  {
    name: 'x_get_spaces',
    description: 'Get live or scheduled X/Twitter Spaces.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Filter: live, scheduled, all (default: live)' },
        topic: { type: 'string', description: 'Topic filter' },
        limit: { type: 'number', description: 'Maximum Spaces (default: 20)' },
      },
    },
  },
  {
    name: 'x_scrape_space',
    description: 'Scrape metadata and speakers from a specific Space.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Space URL' },
      },
      required: ['url'],
    },
  },
  // ====== Analytics ======
  {
    name: 'x_get_analytics',
    description: 'Get your account engagement analytics.',
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Time period: 7d, 28d, 90d (default: 28d)' },
      },
    },
  },
  {
    name: 'x_get_post_analytics',
    description: 'Get detailed analytics for a specific post.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Tweet URL to analyze' },
      },
      required: ['url'],
    },
  },
  // ====== Settings ======
  {
    name: 'x_get_settings',
    description: 'Get a snapshot of your account settings and privacy configuration.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'x_toggle_protected',
    description: 'Toggle protected (private) account mode.',
    inputSchema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'true = protected, false = public' },
      },
      required: ['enabled'],
    },
  },
  {
    name: 'x_get_blocked',
    description: 'Get your blocked accounts list.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum results (default: 200)' },
      },
    },
  },
  // ====== Business ======
  {
    name: 'x_brand_monitor',
    description: 'Monitor brand mentions with sentiment analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        brand: { type: 'string', description: 'Brand name or keyword to monitor' },
        limit: { type: 'number', description: 'Maximum mentions (default: 50)' },
        sentiment: { type: 'boolean', description: 'Include sentiment analysis (default: true)' },
      },
      required: ['brand'],
    },
  },
  {
    name: 'x_competitor_analysis',
    description: 'Compare metrics across competitor accounts.',
    inputSchema: {
      type: 'object',
      properties: {
        handles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of competitor handles to analyze',
        },
      },
      required: ['handles'],
    },
  },
  // ====== Premium ======
  {
    name: 'x_check_premium',
    description: 'Check premium subscription status and available features.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // ====== Articles ======
  {
    name: 'x_publish_article',
    description: 'Publish a long-form article (requires Premium+).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Article title' },
        body: { type: 'string', description: 'Article body content' },
        publish: { type: 'boolean', description: 'true to publish, false to save as draft (default: false)' },
      },
      required: ['title', 'body'],
    },
  },
  // ====== Creator ======
  {
    name: 'x_creator_analytics',
    description: 'Get creator dashboard analytics including revenue and subscribers.',
    inputSchema: {
      type: 'object',
      properties: {
        period: { type: 'string', description: 'Time period: 7d, 28d, 90d (default: 28d)' },
      },
    },
  },
  // ====== Real-Time Streaming ======
  {
    name: 'x_stream_start',
    description: 'Start a real-time stream that polls an X/Twitter account and pushes new events. Types: tweet (new tweets), follower (follow/unfollow events), mention (new mentions). Events are emitted via Socket.IO.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Stream type: tweet, follower, or mention',
          enum: ['tweet', 'follower', 'mention'],
        },
        username: {
          type: 'string',
          description: 'Target username to watch (without @)',
        },
        interval: {
          type: 'number',
          description: 'Poll interval in seconds (default: 60, minimum: 15)',
        },
      },
      required: ['type', 'username'],
    },
  },
  {
    name: 'x_stream_stop',
    description: 'Stop an active real-time stream by its ID.',
    inputSchema: {
      type: 'object',
      properties: {
        streamId: {
          type: 'string',
          description: 'The stream ID returned by x_stream_start',
        },
      },
      required: ['streamId'],
    },
  },
  {
    name: 'x_stream_list',
    description: 'List all active real-time streams with their status, poll counts, and browser pool info.',
    inputSchema: {
      type: 'object',
      properties: {},
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
    
    if (!X402_PRIVATE_KEY) {
      console.error('   Payments: disabled (no wallet configured)');
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

  // Handle streaming tools directly (they work in both local and remote modes)
  if (name === 'x_stream_start' || name === 'x_stream_stop' || name === 'x_stream_list') {
    return await executeStreamTool(name, args);
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

/**
 * Execute streaming-specific tools
 */
async function executeStreamTool(name, args) {
  // Lazy-import to avoid loading streaming deps when not needed
  const streaming = await import('../streaming/index.js');

  switch (name) {
    case 'x_stream_start': {
      const intervalMs = args.interval ? Math.max(15, Number(args.interval)) * 1000 : undefined;
      const stream = await streaming.createStream({
        type: args.type,
        username: args.username,
        interval: intervalMs,
        authToken: SESSION_COOKIE || undefined,
      });
      return stream;
    }
    case 'x_stream_stop': {
      return await streaming.stopStream(args.streamId);
    }
    case 'x_stream_list': {
      const streams = await streaming.listStreams();
      const pool = streaming.getPoolStatus();
      return { streams, pool };
    }
    default:
      throw new Error(`Unknown stream tool: ${name}`);
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
    // Handle payment errors (only relevant in remote mode with x402 enabled)
    if (error.code === 'PAYMENT_REQUIRED') {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Payment required by remote API',
              message: error.message,
              hint: 'Use local mode (free) or configure X402_PRIVATE_KEY for remote mode',
              localMode: 'Set XACTIONS_MODE=local to avoid payments entirely',
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

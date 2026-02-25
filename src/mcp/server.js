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
// Plugin System
// ============================================================================

import { initializePlugins, getPluginTools } from '../plugins/index.js';

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
    description: 'Get profile information for a user including bio, follower count, etc. Supports Twitter, Bluesky, Threads, and Mastodon.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username (without @). For Bluesky: user.bsky.social. For Mastodon: user or user@instance.',
        },
        platform: {
          type: 'string',
          enum: ['twitter', 'bluesky', 'mastodon', 'threads'],
          description: 'Platform to scrape (default: twitter)',
        },
        instance: {
          type: 'string',
          description: 'Mastodon instance URL (e.g. https://mastodon.social). Only needed for Mastodon.',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_get_followers',
    description: 'Scrape followers for an account. Supports Twitter, Bluesky, Mastodon, and Threads.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username (without @)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of followers to scrape (default: 100)',
        },
        platform: {
          type: 'string',
          enum: ['twitter', 'bluesky', 'mastodon', 'threads'],
          description: 'Platform to scrape (default: twitter)',
        },
        instance: {
          type: 'string',
          description: 'Mastodon instance URL. Only needed for Mastodon.',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_get_following',
    description: 'Scrape accounts that a user is following. Supports Twitter, Bluesky, Mastodon, and Threads.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username (without @)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number to scrape (default: 100)',
        },
        platform: {
          type: 'string',
          enum: ['twitter', 'bluesky', 'mastodon', 'threads'],
          description: 'Platform to scrape (default: twitter)',
        },
        instance: {
          type: 'string',
          description: 'Mastodon instance URL. Only needed for Mastodon.',
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
    description: 'Scrape recent tweets/posts from a user profile. Supports Twitter, Bluesky, Mastodon, and Threads.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username (without @)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of tweets/posts (default: 50)',
        },
        platform: {
          type: 'string',
          enum: ['twitter', 'bluesky', 'mastodon', 'threads'],
          description: 'Platform to scrape (default: twitter)',
        },
        instance: {
          type: 'string',
          description: 'Mastodon instance URL. Only needed for Mastodon.',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_search_tweets',
    description: 'Search for tweets/posts matching a query. Supports Twitter, Bluesky, Mastodon, and Threads.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum results (default: 50)',
        },
        platform: {
          type: 'string',
          enum: ['twitter', 'bluesky', 'mastodon', 'threads'],
          description: 'Platform to search (default: twitter)',
        },
        instance: {
          type: 'string',
          description: 'Mastodon instance URL. Only needed for Mastodon.',
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
  // ====== Sentiment Analysis & Reputation Monitoring ======
  {
    name: 'x_analyze_sentiment',
    description: 'Analyze the sentiment of text. Returns a score (-1 to 1), label (positive/neutral/negative), confidence, and key sentiment-bearing words. Uses a built-in rule-based analyzer by default (zero dependencies), or optionally an LLM via OpenRouter for nuanced analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Text to analyze (tweet content, any string)',
        },
        texts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of texts for batch analysis (alternative to single text)',
        },
        mode: {
          type: 'string',
          description: 'Analysis mode: "rules" (default, offline) or "llm" (requires OPENROUTER_API_KEY)',
          enum: ['rules', 'llm'],
        },
      },
    },
  },
  {
    name: 'x_monitor_reputation',
    description: 'Start monitoring sentiment for a username or keyword over time. Scrapes mentions periodically, analyzes sentiment, computes rolling averages, detects anomalies, and can trigger webhook alerts.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action: "start" (create monitor), "stop" (stop by ID), "list" (list all monitors), "status" (get monitor status by ID)',
          enum: ['start', 'stop', 'list', 'status'],
        },
        target: {
          type: 'string',
          description: 'Username (with @) or keyword to monitor (required for "start")',
        },
        monitorId: {
          type: 'string',
          description: 'Monitor ID (required for "stop" and "status")',
        },
        type: {
          type: 'string',
          description: 'Monitor type: mentions, keyword, replies (default: mentions)',
          enum: ['mentions', 'keyword', 'replies'],
        },
        interval: {
          type: 'number',
          description: 'Polling interval in seconds (default: 900 = 15 min, minimum: 60)',
        },
        webhookUrl: {
          type: 'string',
          description: 'Webhook URL to POST alerts to',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'x_reputation_report',
    description: 'Generate a reputation report for a monitored username. Shows sentiment distribution, top positive/negative mentions, timeline data, keyword frequency, and alerts. Requires an active monitor for the target.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username to generate report for (must have active monitor)',
        },
        period: {
          type: 'string',
          description: 'Report period: 24h, 7d, 30d, all (default: 7d)',
          enum: ['24h', '7d', '30d', 'all'],
        },
        format: {
          type: 'string',
          description: 'Output format: json or markdown (default: markdown)',
          enum: ['json', 'markdown'],
        },
      },
      required: ['username'],
    },
  },
  // ====== Real-Time Streaming (continued) ======
  {
    name: 'x_stream_start',
    description: 'Start a real-time stream that polls an X/Twitter account and pushes new events. Types: tweet (new tweets), follower (follow/unfollow events), mention (new mentions). Events are emitted via Socket.IO. Rejects duplicates (same type + username).',
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
          description: 'Poll interval in seconds (default: 60, minimum: 15, maximum: 3600)',
        },
      },
      required: ['type', 'username'],
    },
  },
  {
    name: 'x_stream_stop',
    description: 'Stop an active real-time stream by its ID. Removes all state and history.',
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
    description: 'List all active real-time streams with status, poll/event counts, errors, and browser pool info.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'x_stream_pause',
    description: 'Pause an active stream (stops polling but retains state). Resume later with x_stream_resume.',
    inputSchema: {
      type: 'object',
      properties: {
        streamId: {
          type: 'string',
          description: 'The stream ID to pause',
        },
      },
      required: ['streamId'],
    },
  },
  {
    name: 'x_stream_resume',
    description: 'Resume a paused stream. Clears backoff and starts polling again immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        streamId: {
          type: 'string',
          description: 'The stream ID to resume',
        },
      },
      required: ['streamId'],
    },
  },
  {
    name: 'x_stream_status',
    description: 'Get detailed status for a single stream including poll count, event count, errors, and backoff info.',
    inputSchema: {
      type: 'object',
      properties: {
        streamId: {
          type: 'string',
          description: 'The stream ID to check',
        },
      },
      required: ['streamId'],
    },
  },
  {
    name: 'x_stream_history',
    description: 'Get recent events from a stream. Optionally filter by event type.',
    inputSchema: {
      type: 'object',
      properties: {
        streamId: {
          type: 'string',
          description: 'The stream ID',
        },
        limit: {
          type: 'number',
          description: 'Max events to return (default: 20)',
        },
        eventType: {
          type: 'string',
          description: 'Optional filter: stream:tweet, stream:follower, or stream:mention',
        },
      },
      required: ['streamId'],
    },
  },
  // ---- Workflow Tools ----
  {
    name: 'x_workflow_create',
    description: 'Create a new automation workflow. Workflows chain multiple actions (scrape, filter, summarize, etc.) into pipelines with triggers and conditions.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Workflow name',
        },
        description: {
          type: 'string',
          description: 'What this workflow does',
        },
        trigger: {
          type: 'object',
          description: 'Trigger config: { type: "manual"|"schedule"|"webhook", cron?: "*/30 * * * *" }',
        },
        steps: {
          type: 'array',
          description: 'Array of steps. Each step is { action: "scrapeProfile", target: "@user", output: "varName" } or { condition: "varName.field > 100" }',
          items: { type: 'object' },
        },
      },
      required: ['name', 'steps'],
    },
  },
  {
    name: 'x_workflow_run',
    description: 'Run a workflow by ID or name. Returns execution results with step-by-step logs.',
    inputSchema: {
      type: 'object',
      properties: {
        workflow: {
          type: 'string',
          description: 'Workflow ID or name',
        },
        context: {
          type: 'object',
          description: 'Optional initial context variables for the workflow',
        },
      },
      required: ['workflow'],
    },
  },
  {
    name: 'x_workflow_list',
    description: 'List all saved workflows with their trigger type, step count, and enabled status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'x_workflow_actions',
    description: 'List all available actions that can be used in workflow steps (scrapers, transforms, AI, utilities).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // ---- Account Portability Tools ----
  {
    name: 'x_export_account',
    description: 'Export a Twitter account: profile, tweets, followers, following, bookmarks. Outputs JSON, CSV, Markdown, and a self-contained HTML archive viewer. Supports resume-on-failure.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username to export (without @)',
        },
        formats: {
          type: 'array',
          items: { type: 'string', enum: ['json', 'csv', 'md', 'html'] },
          description: 'Output formats (default: all)',
        },
        only: {
          type: 'array',
          items: { type: 'string', enum: ['profile', 'tweets', 'followers', 'following', 'bookmarks', 'likes'] },
          description: 'Export only specific data types (default: all)',
        },
        limit: {
          type: 'number',
          description: 'Max items per phase (default: 500)',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_migrate_account',
    description: 'Migrate exported Twitter data to Bluesky or Mastodon. Supports dry-run mode to preview actions without executing. Requires a prior export.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username whose export to migrate (without @)',
        },
        platform: {
          type: 'string',
          description: 'Target platform',
          enum: ['bluesky', 'mastodon'],
        },
        dryRun: {
          type: 'boolean',
          description: 'Preview only, do not execute (default: true)',
        },
        exportDir: {
          type: 'string',
          description: 'Path to export directory (auto-detected from exports/ if omitted)',
        },
      },
      required: ['username', 'platform'],
    },
  },
  {
    name: 'x_diff_exports',
    description: 'Compare two account exports to find new/lost followers, deleted tweets, and engagement changes. Generates a diff report in JSON and Markdown.',
    inputSchema: {
      type: 'object',
      properties: {
        dirA: {
          type: 'string',
          description: 'Path to the older export directory',
        },
        dirB: {
          type: 'string',
          description: 'Path to the newer export directory',
        },
      },
      required: ['dirA', 'dirB'],
    },
  },
  // ====== Thread Unrolling ======
  {
    name: 'x_get_thread',
    description: 'Unroll and scrape an entire Twitter/X thread given the URL of the first tweet.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the first tweet in the thread',
        },
      },
      required: ['url'],
    },
  },
  // ====== Posting Analytics ======
  {
    name: 'x_best_time_to_post',
    description: 'Analyze a user\'s tweet history to determine the best times and days to post for maximum engagement.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username to analyze (without @)',
        },
        limit: {
          type: 'number',
          description: 'Number of recent tweets to analyze (default: 100)',
        },
      },
      required: ['username'],
    },
  },
  // ====== AI Tools (require OPENROUTER_API_KEY) ======
  {
    name: 'x_analyze_voice',
    description: 'Analyze a user\'s writing style/voice from their tweets. Returns tone, vocabulary patterns, emoji usage, avg length, and a voice profile. Requires OPENROUTER_API_KEY for full analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username whose voice to analyze (without @)',
        },
        limit: {
          type: 'number',
          description: 'Number of tweets to analyze (default: 50)',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_generate_tweet',
    description: 'Generate a tweet in the style of a user. First analyzes their voice, then generates content matching their tone. Requires OPENROUTER_API_KEY.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username whose style to mimic (without @)',
        },
        topic: {
          type: 'string',
          description: 'Topic or subject for the generated tweet',
        },
        count: {
          type: 'number',
          description: 'Number of tweet variations to generate (default: 3)',
        },
        style: {
          type: 'string',
          description: 'Optional style: hot-take, educational, personal, promotional',
        },
        type: {
          type: 'string',
          enum: ['tweet', 'thread'],
          description: 'Generate single tweets or a thread (default: tweet)',
        },
      },
      required: ['username', 'topic'],
    },
  },
  {
    name: 'x_rewrite_tweet',
    description: 'Rewrite/improve an existing tweet to be more engaging, shorter, add a hook, etc. Uses a voice profile for style matching. Requires OPENROUTER_API_KEY.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username whose voice to match for the rewrite (without @)',
        },
        text: {
          type: 'string',
          description: 'The original tweet text to improve',
        },
        goal: {
          type: 'string',
          enum: ['more_engaging', 'shorter', 'add_hook', 'more_casual', 'more_formal', 'add_cta'],
          description: 'Improvement goal (default: more_engaging)',
        },
        count: {
          type: 'number',
          description: 'Number of rewrite variations (default: 3)',
        },
      },
      required: ['username', 'text'],
    },
  },
  {
    name: 'x_summarize_thread',
    description: 'AI-powered summarization of a Twitter/X thread. Unrolls the thread and generates a concise summary. Requires OPENROUTER_API_KEY.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the first tweet in the thread',
        },
        style: {
          type: 'string',
          description: 'Summary style: brief, detailed, or bullet (default: brief)',
          enum: ['brief', 'detailed', 'bullet'],
        },
      },
      required: ['url'],
    },
  },
  // ====== Cross-Platform ======
  {
    name: 'x_list_platforms',
    description: 'List all supported social media platforms (Twitter, Bluesky, Mastodon, Threads) and their capabilities.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // ====== Social Graph ======
  {
    name: 'x_graph_build',
    description: 'Build a social network graph by crawling an account\'s followers and following. Maps relationships, identifies clusters, bridge accounts, and influence scores. Returns a graph ID for further analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Twitter username to start crawling from (without @)',
        },
        depth: {
          type: 'number',
          description: 'Crawl depth: 1 = direct connections only, 2 = friends-of-friends (default: 2)',
        },
        maxNodes: {
          type: 'number',
          description: 'Maximum nodes to crawl (default: 500). Lower = faster.',
        },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_graph_analyze',
    description: 'Analyze a built social graph. Returns: mutual connections, bridge accounts (betweenness centrality), clusters (label propagation), influence ranking (PageRank), ghost followers, orbit analysis (inner circle vs periphery).',
    inputSchema: {
      type: 'object',
      properties: {
        graphId: {
          type: 'string',
          description: 'Graph ID returned from x_graph_build',
        },
      },
      required: ['graphId'],
    },
  },
  {
    name: 'x_graph_recommendations',
    description: 'Get actionable recommendations from a graph: who to follow, who to engage with, competitors to watch, safe accounts to unfollow.',
    inputSchema: {
      type: 'object',
      properties: {
        graphId: {
          type: 'string',
          description: 'Graph ID returned from x_graph_build',
        },
      },
      required: ['graphId'],
    },
  },
  {
    name: 'x_graph_list',
    description: 'List all saved social graphs with their seed account, node/edge counts, and status.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // ====== Persona & Algorithm Builder ======
  {
    name: 'x_persona_create',
    description: 'Create a new persona for algorithm building and automated account growth. A persona defines niche, topics, engagement strategy, activity patterns, and LLM voice settings. Use presets for quick setup.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Persona name (e.g. "Crypto Alpha Hunter")',
        },
        preset: {
          type: 'string',
          enum: ['crypto-degen', 'tech-builder', 'ai-researcher', 'growth-marketer', 'finance-investor', 'creative-writer', 'custom'],
          description: 'Niche preset with pre-filled topics, search terms, target accounts, and tone',
        },
        strategy: {
          type: 'string',
          enum: ['aggressive', 'moderate', 'conservative', 'thoughtleader'],
          description: 'Engagement strategy (default: moderate). Aggressive = high volume, thoughtleader = quality over quantity',
        },
        activityPattern: {
          type: 'string',
          enum: ['night-owl', 'early-bird', 'nine-to-five', 'always-on', 'weekend-warrior'],
          description: 'Activity schedule pattern (default: always-on)',
        },
        topics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Custom topics (overrides preset)',
        },
        searchTerms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Custom search terms (overrides preset)',
        },
        targetAccounts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Target accounts to study and engage with (without @)',
        },
      },
      required: ['name', 'preset'],
    },
  },
  {
    name: 'x_persona_list',
    description: 'List all saved personas with their stats (sessions, follows, likes, comments, last active).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'x_persona_status',
    description: 'Get detailed status and lifetime stats for a specific persona.',
    inputSchema: {
      type: 'object',
      properties: {
        personaId: {
          type: 'string',
          description: 'Persona ID',
        },
      },
      required: ['personaId'],
    },
  },
  {
    name: 'x_persona_edit',
    description: 'Edit an existing persona configuration (topics, search terms, target accounts, strategy, activity pattern).',
    inputSchema: {
      type: 'object',
      properties: {
        personaId: {
          type: 'string',
          description: 'Persona ID to edit',
        },
        topics: {
          type: 'array',
          items: { type: 'string' },
          description: 'New topics list',
        },
        searchTerms: {
          type: 'array',
          items: { type: 'string' },
          description: 'New search terms list',
        },
        targetAccounts: {
          type: 'array',
          items: { type: 'string' },
          description: 'New target accounts list',
        },
        strategy: {
          type: 'string',
          enum: ['aggressive', 'moderate', 'conservative', 'thoughtleader'],
          description: 'New engagement strategy',
        },
        activityPattern: {
          type: 'string',
          enum: ['night-owl', 'early-bird', 'nine-to-five', 'always-on', 'weekend-warrior'],
          description: 'New activity pattern',
        },
      },
      required: ['personaId'],
    },
  },
  {
    name: 'x_persona_delete',
    description: 'Delete a saved persona and all its stored state.',
    inputSchema: {
      type: 'object',
      properties: {
        personaId: {
          type: 'string',
          description: 'Persona ID to delete',
        },
      },
      required: ['personaId'],
    },
  },
  {
    name: 'x_persona_run',
    description: 'Start the 24/7 Algorithm Builder for a persona. Launches headless Puppeteer with LLM-powered engagement (search, like, comment, follow, post). Requires auth token and OPENROUTER_API_KEY for AI comments.',
    inputSchema: {
      type: 'object',
      properties: {
        personaId: {
          type: 'string',
          description: 'Persona ID to run',
        },
        sessions: {
          type: 'number',
          description: 'Number of sessions to run (0 = infinite, default: 1 for MCP)',
        },
        dryRun: {
          type: 'boolean',
          description: 'Preview actions without executing (default: false)',
        },
        headless: {
          type: 'boolean',
          description: 'Run browser in headless mode (default: true)',
        },
      },
      required: ['personaId'],
    },
  },
  {
    name: 'x_persona_presets',
    description: 'List all available niche presets, engagement strategies, and activity patterns for persona creation.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // ── 09-A: History & Analytics ──
  {
    name: 'x_history_get',
    description: 'Get account history / time-series snapshots for a username. Returns followers, following, tweet count over time.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Twitter username' },
        days: { type: 'number', description: 'Days to look back (default: 30)' },
        interval: { type: 'string', enum: ['hour', 'day', 'week'], description: 'Grouping interval' },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_history_snapshot',
    description: 'Take a snapshot of account metrics right now and save to history.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Twitter username' },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_growth_rate',
    description: 'Calculate follower growth rate for an account over N days.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Twitter username' },
        days: { type: 'number', description: 'Number of days (default: 7)' },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_compare_accounts',
    description: 'Compare multiple accounts on a metric over time.',
    inputSchema: {
      type: 'object',
      properties: {
        usernames: { type: 'array', items: { type: 'string' }, description: 'List of usernames' },
        metric: { type: 'string', description: 'Metric to compare: followers_count, following_count, tweet_count' },
        days: { type: 'number', description: 'Days to look back' },
      },
      required: ['usernames', 'metric'],
    },
  },

  // ── 09-B: Audience Overlap ──
  {
    name: 'x_audience_overlap',
    description: 'Analyze follower overlap between two Twitter accounts.',
    inputSchema: {
      type: 'object',
      properties: {
        username1: { type: 'string', description: 'First username' },
        username2: { type: 'string', description: 'Second username' },
        maxFollowers: { type: 'number', description: 'Max followers to fetch per account (default: 5000)' },
      },
      required: ['username1', 'username2'],
    },
  },

  // ── 09-C: Follower CRM ──
  {
    name: 'x_crm_sync',
    description: 'Sync followers of a username into the CRM database.',
    inputSchema: {
      type: 'object',
      properties: { username: { type: 'string', description: 'Twitter username' } },
      required: ['username'],
    },
  },
  {
    name: 'x_crm_tag',
    description: 'Add a tag to a CRM contact.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Contact username' },
        tag: { type: 'string', description: 'Tag to add' },
      },
      required: ['username', 'tag'],
    },
  },
  {
    name: 'x_crm_search',
    description: 'Search CRM contacts by username or display name.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search query' } },
      required: ['query'],
    },
  },
  {
    name: 'x_crm_segment',
    description: 'Get contacts in a CRM segment.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Segment name' } },
      required: ['name'],
    },
  },

  // ── 09-D: Bulk Operations ──
  {
    name: 'x_bulk_execute',
    description: 'Execute bulk follow/unfollow/block/mute from a list of usernames.',
    inputSchema: {
      type: 'object',
      properties: {
        usernames: { type: 'array', items: { type: 'string' }, description: 'List of usernames' },
        action: { type: 'string', enum: ['follow', 'unfollow', 'block', 'mute', 'dm'], description: 'Action to perform' },
        delay: { type: 'number', description: 'Delay between actions in ms (default: 2000)' },
        dryRun: { type: 'boolean', description: 'Preview without executing' },
      },
      required: ['usernames', 'action'],
    },
  },

  // ── 09-F: Scheduler ──
  {
    name: 'x_schedule_add',
    description: 'Add a cron-scheduled job.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Job name' },
        cron: { type: 'string', description: 'Cron expression (e.g. "0 9 * * *" for 9am daily)' },
        action: { type: 'string', description: 'Action/command to run' },
      },
      required: ['name', 'cron'],
    },
  },
  {
    name: 'x_schedule_list',
    description: 'List all scheduled jobs.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'x_schedule_remove',
    description: 'Remove a scheduled job.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Job name' } },
      required: ['name'],
    },
  },

  // ── 09-H: Evergreen Recycler ──
  {
    name: 'x_evergreen_analyze',
    description: 'Find top-performing evergreen tweets that can be recycled.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Twitter username' },
        minLikes: { type: 'number', description: 'Min likes threshold (default: 50)' },
        minAgeDays: { type: 'number', description: 'Min age in days (default: 30)' },
      },
      required: ['username'],
    },
  },

  // ── 09-I: RSS Monitor ──
  {
    name: 'x_rss_add',
    description: 'Add an RSS feed to monitor.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Feed name' },
        url: { type: 'string', description: 'Feed URL' },
        template: { type: 'string', description: 'Post template. Variables: {title}, {link}, {description}' },
      },
      required: ['name', 'url'],
    },
  },
  {
    name: 'x_rss_check',
    description: 'Check all RSS feeds for new items.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'x_rss_drafts',
    description: 'View drafts generated from RSS feeds.',
    inputSchema: { type: 'object', properties: {} },
  },

  // ── 09-J: AI Content Optimizer ──
  {
    name: 'x_optimize_tweet',
    description: 'AI-optimize a tweet for maximum engagement.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Tweet text' },
        goal: { type: 'string', enum: ['engagement', 'clarity', 'growth', 'viral'], description: 'Optimization goal' },
      },
      required: ['text'],
    },
  },
  {
    name: 'x_suggest_hashtags',
    description: 'Suggest relevant hashtags for a tweet.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Tweet text' },
        count: { type: 'number', description: 'Number of hashtags (default: 5)' },
      },
      required: ['text'],
    },
  },
  {
    name: 'x_predict_performance',
    description: 'Predict how well a tweet will perform (score, strengths, weaknesses).',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', description: 'Tweet text' } },
      required: ['text'],
    },
  },
  {
    name: 'x_generate_variations',
    description: 'Generate alternative versions of a tweet.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Tweet text' },
        count: { type: 'number', description: 'Number of variations (default: 3)' },
      },
      required: ['text'],
    },
  },

  // ── 09-L: Notifications ──
  {
    name: 'x_notify_send',
    description: 'Send a notification to all configured channels (Slack, Discord, Telegram, Email).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Notification title' },
        message: { type: 'string', description: 'Message body' },
        severity: { type: 'string', enum: ['info', 'warning', 'critical'], description: 'Severity level' },
      },
      required: ['message'],
    },
  },
  {
    name: 'x_notify_test',
    description: 'Send a test notification to a specific channel.',
    inputSchema: {
      type: 'object',
      properties: { channel: { type: 'string', enum: ['slack', 'discord', 'telegram', 'email'], description: 'Channel to test' } },
      required: ['channel'],
    },
  },

  // ── 09-M: Datasets ──
  {
    name: 'x_dataset_list',
    description: 'List all stored scraping datasets.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'x_dataset_get',
    description: 'Get items from a dataset with pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Dataset name' },
        offset: { type: 'number', description: 'Start offset (default: 0)' },
        limit: { type: 'number', description: 'Max items (default: 100)' },
      },
      required: ['name'],
    },
  },

  // ── 09-N: Team Management ──
  {
    name: 'x_team_create',
    description: 'Create a new team.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Team name' },
        owner: { type: 'string', description: 'Owner username' },
      },
      required: ['name', 'owner'],
    },
  },
  {
    name: 'x_team_members',
    description: 'List team members.',
    inputSchema: {
      type: 'object',
      properties: { teamId: { type: 'string', description: 'Team ID' } },
      required: ['teamId'],
    },
  },

  // ── 09-P: Import/Export ──
  {
    name: 'x_import_data',
    description: 'Import data from Apify, Phantombuster, or CSV format.',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'JSON string or CSV data to import' },
        from: { type: 'string', enum: ['apify', 'phantombuster', 'auto'], description: 'Source format (default: auto)' },
      },
      required: ['data'],
    },
  },
  {
    name: 'x_convert_format',
    description: 'Convert data between Apify/Phantombuster/CSV formats.',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'Data to convert (JSON string or CSV)' },
        from: { type: 'string', description: 'Source format: apify, phantombuster' },
        to: { type: 'string', description: 'Target format: apify, phantombuster, csv, socialblade' },
      },
      required: ['data', 'from', 'to'],
    },
  },

  // ====== Scrapers (from xeepy) ======
  {
    name: 'x_get_replies',
    description: 'Scrape replies to a specific tweet. Returns reply text, author, timestamp, likes, and nested reply chains.',
    inputSchema: {
      type: 'object',
      properties: {
        tweetUrl: { type: 'string', description: 'URL of the tweet to get replies for' },
        limit: { type: 'number', description: 'Maximum replies to scrape (default: 50)' },
        sort: { type: 'string', enum: ['recent', 'popular', 'relevant'], description: 'Sort order (default: relevant)' },
      },
      required: ['tweetUrl'],
    },
  },
  {
    name: 'x_get_hashtag',
    description: 'Scrape tweets containing a specific hashtag. More focused than general search — returns trending metrics and top contributors.',
    inputSchema: {
      type: 'object',
      properties: {
        hashtag: { type: 'string', description: 'Hashtag to scrape (without #)' },
        limit: { type: 'number', description: 'Maximum tweets to return (default: 50)' },
        filter: { type: 'string', enum: ['top', 'latest', 'people', 'media'], description: 'Filter type (default: top)' },
      },
      required: ['hashtag'],
    },
  },
  {
    name: 'x_get_likers',
    description: 'Get the list of users who liked a specific tweet. Useful for finding engaged audiences.',
    inputSchema: {
      type: 'object',
      properties: {
        tweetUrl: { type: 'string', description: 'URL of the tweet' },
        limit: { type: 'number', description: 'Maximum likers to return (default: 100)' },
      },
      required: ['tweetUrl'],
    },
  },
  {
    name: 'x_get_retweeters',
    description: 'Get the list of users who retweeted a specific tweet.',
    inputSchema: {
      type: 'object',
      properties: {
        tweetUrl: { type: 'string', description: 'URL of the tweet' },
        limit: { type: 'number', description: 'Maximum retweeters to return (default: 100)' },
      },
      required: ['tweetUrl'],
    },
  },
  {
    name: 'x_get_media',
    description: 'Scrape all media (images, videos, GIFs) from a user profile. Returns direct download URLs.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username (without @)' },
        limit: { type: 'number', description: 'Maximum media items (default: 50)' },
        type: { type: 'string', enum: ['all', 'images', 'videos', 'gifs'], description: 'Media type filter (default: all)' },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_get_recommendations',
    description: 'Get "Who to follow" recommendations based on a user or topic. Useful for discovering accounts in a niche.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Base username for recommendations (optional — uses your account if omitted)' },
        topic: { type: 'string', description: 'Topic or niche for recommendations (optional)' },
        limit: { type: 'number', description: 'Maximum recommendations (default: 20)' },
      },
    },
  },
  {
    name: 'x_get_mentions',
    description: 'Scrape tweets that mention a specific user. Includes replies, quote tweets, and direct mentions.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username to find mentions for (without @)' },
        limit: { type: 'number', description: 'Maximum mentions (default: 50)' },
        since: { type: 'string', description: 'Only mentions after this date (YYYY-MM-DD)' },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_get_quote_tweets',
    description: 'Get all quote tweets of a specific tweet. Shows how people are commenting on/sharing a tweet.',
    inputSchema: {
      type: 'object',
      properties: {
        tweetUrl: { type: 'string', description: 'URL of the original tweet' },
        limit: { type: 'number', description: 'Maximum quote tweets (default: 50)' },
      },
      required: ['tweetUrl'],
    },
  },
  {
    name: 'x_get_likes',
    description: 'Scrape tweets that a user has liked. Shows what content a user engages with.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username (without @)' },
        limit: { type: 'number', description: 'Maximum liked tweets (default: 50)' },
      },
      required: ['username'],
    },
  },

  // ====== Follow Automation (from xeepy) ======
  {
    name: 'x_auto_follow',
    description: 'Auto-follow users matching criteria. Specify a source (hashtag, keyword, or target account followers) and optional filters.',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', enum: ['hashtag', 'keyword', 'followers', 'engagers'], description: 'Where to find users to follow' },
        query: { type: 'string', description: 'Hashtag, keyword, or username depending on source' },
        limit: { type: 'number', description: 'Maximum users to follow (default: 10)' },
        minFollowers: { type: 'number', description: 'Only follow users with at least this many followers' },
        maxFollowers: { type: 'number', description: 'Only follow users with at most this many followers' },
        mustHaveBio: { type: 'boolean', description: 'Only follow users who have a bio' },
        mustHaveAvatar: { type: 'boolean', description: 'Only follow users who have a profile picture' },
        delay: { type: 'number', description: 'Delay between follows in seconds (default: 3)' },
      },
      required: ['source', 'query'],
    },
  },
  {
    name: 'x_follow_engagers',
    description: 'Follow people who engage with a specific account (likers, retweeters, repliers). Great for finding active users in a niche.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Target account whose engagers to follow' },
        engagementType: { type: 'string', enum: ['likers', 'retweeters', 'repliers', 'all'], description: 'Type of engagement (default: all)' },
        limit: { type: 'number', description: 'Maximum users to follow (default: 10)' },
        delay: { type: 'number', description: 'Delay between follows in seconds (default: 3)' },
      },
      required: ['username'],
    },
  },

  // ====== Unfollow Automation (from xeepy) ======
  {
    name: 'x_unfollow_all',
    description: 'Mass unfollow everyone you follow. Nuclear option — unfollows ALL accounts. Use with caution.',
    inputSchema: {
      type: 'object',
      properties: {
        confirm: { type: 'boolean', description: 'Must be true to confirm mass unfollow' },
        delay: { type: 'number', description: 'Delay between unfollows in seconds (default: 2)' },
        limit: { type: 'number', description: 'Maximum to unfollow (omit for all)' },
      },
      required: ['confirm'],
    },
  },
  {
    name: 'x_smart_unfollow',
    description: 'Smart unfollow based on criteria: inactive accounts, spam/bot accounts, accounts that never engage with you, or accounts outside your niche.',
    inputSchema: {
      type: 'object',
      properties: {
        criteria: {
          type: 'string',
          enum: ['inactive', 'spam', 'no_engagement', 'off_niche', 'no_bio', 'no_avatar', 'high_following_ratio'],
          description: 'Unfollow criteria',
        },
        inactiveDays: { type: 'number', description: 'For "inactive" — days since last tweet (default: 90)' },
        limit: { type: 'number', description: 'Maximum to unfollow (default: 20)' },
        dryRun: { type: 'boolean', description: 'Preview who would be unfollowed without actually unfollowing (default: false)' },
        delay: { type: 'number', description: 'Delay between unfollows in seconds (default: 2)' },
      },
      required: ['criteria'],
    },
  },

  // ====== Engagement Automation (from xeepy) ======
  {
    name: 'x_quote_tweet',
    description: 'Quote tweet — retweet with your own comment/text added.',
    inputSchema: {
      type: 'object',
      properties: {
        tweetUrl: { type: 'string', description: 'URL of the tweet to quote' },
        text: { type: 'string', description: 'Your comment text to add' },
      },
      required: ['tweetUrl', 'text'],
    },
  },
  {
    name: 'x_auto_comment',
    description: 'Auto-comment on tweets matching a search query. Can use AI-generated or template comments.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to find tweets to comment on' },
        comment: { type: 'string', description: 'Comment text (or "ai" to generate AI comments)' },
        limit: { type: 'number', description: 'Maximum tweets to comment on (default: 5)' },
        delay: { type: 'number', description: 'Delay between comments in seconds (default: 5)' },
      },
      required: ['query', 'comment'],
    },
  },
  {
    name: 'x_auto_retweet',
    description: 'Auto-retweet tweets matching a search query or from specific accounts.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query or username to find tweets to retweet' },
        limit: { type: 'number', description: 'Maximum tweets to retweet (default: 5)' },
        minLikes: { type: 'number', description: 'Only retweet tweets with at least this many likes' },
        delay: { type: 'number', description: 'Delay between retweets in seconds (default: 3)' },
      },
      required: ['query'],
    },
  },

  // ====== AI Tools (from xeepy + xai-cookbook) ======
  {
    name: 'x_detect_bots',
    description: 'Detect bot/spam accounts using heuristic and AI analysis. Checks posting patterns, bio, followers ratio, account age, and tweet content.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username to analyze (without @)' },
        deep: { type: 'boolean', description: 'Deep analysis — also checks tweet timing patterns and content originality (slower, default: false)' },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_find_influencers',
    description: 'Find influencers in a specific niche or topic. Returns accounts ranked by engagement rate, niche relevance, and audience quality.',
    inputSchema: {
      type: 'object',
      properties: {
        niche: { type: 'string', description: 'Niche or topic (e.g. "AI", "crypto", "fitness")' },
        minFollowers: { type: 'number', description: 'Minimum follower count (default: 1000)' },
        maxFollowers: { type: 'number', description: 'Maximum follower count (default: 1000000)' },
        limit: { type: 'number', description: 'Number of influencers to find (default: 20)' },
      },
      required: ['niche'],
    },
  },
  {
    name: 'x_smart_target',
    description: 'Find ideal accounts to engage with for growth. Uses AI to analyze your niche and find users most likely to follow back or engage.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Your username (for niche analysis)' },
        strategy: { type: 'string', enum: ['growth', 'engagement', 'niche_authority', 'viral_potential'], description: 'Targeting strategy (default: growth)' },
        limit: { type: 'number', description: 'Number of targets to find (default: 20)' },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_crypto_analyze',
    description: 'Analyze crypto/token sentiment on X. Scrapes tweets about a coin/token and returns sentiment score, volume, key influencer opinions, and price correlation.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Coin/token name or ticker (e.g. "BTC", "Solana", "$ETH")' },
        limit: { type: 'number', description: 'Number of tweets to analyze (default: 100)' },
        timeframe: { type: 'string', enum: ['1h', '6h', '24h', '7d', '30d'], description: 'Time window (default: 24h)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'x_grok_analyze_image',
    description: 'Analyze an image using Grok\'s multimodal vision capabilities. Extract text, describe content, identify objects, or answer questions about images in tweets.',
    inputSchema: {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'URL of the image to analyze' },
        tweetUrl: { type: 'string', description: 'URL of tweet containing the image (alternative to imageUrl)' },
        question: { type: 'string', description: 'Specific question about the image (default: "Describe this image in detail")' },
      },
    },
  },

  // ====== Analytics (from xeepy) ======
  {
    name: 'x_audience_insights',
    description: 'Get detailed audience demographics and interests for an account. Analyzes followers to determine top locations, active hours, interests, and audience quality.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username to analyze (without @)' },
        sampleSize: { type: 'number', description: 'Number of followers to sample (default: 200)' },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_engagement_report',
    description: 'Generate a comprehensive engagement analytics report. Includes engagement rate, best performing content, optimal posting times, and growth trends.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Username to analyze (without @)' },
        period: { type: 'string', enum: ['7d', '30d', '90d'], description: 'Reporting period (default: 30d)' },
        format: { type: 'string', enum: ['summary', 'detailed', 'json'], description: 'Report format (default: summary)' },
      },
      required: ['username'],
    },
  },

  // ====== Monitoring (from xeepy) ======
  {
    name: 'x_monitor_account',
    description: 'Start monitoring an account for changes: new tweets, bio updates, follower surges, and profile changes. Get real-time alerts.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Account to monitor (without @)' },
        events: {
          type: 'array',
          items: { type: 'string', enum: ['tweets', 'bio', 'followers', 'following', 'profile_pic', 'all'] },
          description: 'Events to monitor (default: all)',
        },
        interval: { type: 'number', description: 'Check interval in minutes (default: 15)' },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_monitor_keyword',
    description: 'Monitor X for tweets containing specific keywords. Get alerts when new tweets match. Useful for brand monitoring, trend tracking, or competitor alerts.',
    inputSchema: {
      type: 'object',
      properties: {
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Keywords to monitor',
        },
        minLikes: { type: 'number', description: 'Only alert for tweets with this many likes (default: 0)' },
        excludeRetweets: { type: 'boolean', description: 'Exclude retweets (default: true)' },
        interval: { type: 'number', description: 'Check interval in minutes (default: 10)' },
      },
      required: ['keywords'],
    },
  },
  {
    name: 'x_follower_alerts',
    description: 'Set up alerts for follower changes. Get notified when notable accounts follow/unfollow you, when you hit milestones, or when there are unusual changes.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string', description: 'Your username (without @)' },
        alertTypes: {
          type: 'array',
          items: { type: 'string', enum: ['new_follower', 'unfollower', 'milestone', 'surge', 'drop'] },
          description: 'Types of alerts (default: all)',
        },
        minFollowerCount: { type: 'number', description: 'Only alert for followers with this many followers themselves (default: 0)' },
      },
      required: ['username'],
    },
  },
  {
    name: 'x_track_engagement',
    description: 'Track engagement metrics for a tweet or account over time. Returns time-series data showing likes, retweets, replies, and impressions growth.',
    inputSchema: {
      type: 'object',
      properties: {
        tweetUrl: { type: 'string', description: 'Tweet URL to track (for single tweet tracking)' },
        username: { type: 'string', description: 'Username to track overall engagement (alternative to tweetUrl)' },
        duration: { type: 'string', enum: ['1h', '6h', '24h', '7d'], description: 'How long to track (default: 24h)' },
        interval: { type: 'number', description: 'Check interval in minutes (default: 15)' },
      },
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
  if (name.startsWith('x_stream_')) {
    return await executeStreamTool(name, args);
  }

  // Handle analytics/sentiment tools directly
  if (name === 'x_analyze_sentiment' || name === 'x_monitor_reputation' || name === 'x_reputation_report') {
    return await executeAnalyticsTool(name, args);
  }

  // Handle AI tools (voice, generation, rewrite, summarization)
  if (name === 'x_analyze_voice' || name === 'x_generate_tweet' || name === 'x_rewrite_tweet' || name === 'x_summarize_thread') {
    return await executeAITool(name, args);
  }

  // Handle workflow tools directly
  if (name.startsWith('x_workflow_')) {
    return await executeWorkflowTool(name, args);
  }

  // Handle portability tools directly
  if (name === 'x_export_account' || name === 'x_migrate_account' || name === 'x_diff_exports') {
    return await executePortabilityTool(name, args);
  }

  // Handle graph tools directly
  if (name.startsWith('x_graph_')) {
    return await executeGraphTool(name, args);
  }

  // Handle persona/algorithm builder tools
  if (name.startsWith('x_persona_')) {
    return await executePersonaTool(name, args);
  }

  // Handle xeepy-ported tools (scrapers, follow/unfollow automation, engagement, AI, monitoring)
  const xeepyTools = [
    'x_get_replies', 'x_get_hashtag', 'x_get_likers', 'x_get_retweeters',
    'x_get_media', 'x_get_recommendations', 'x_get_mentions', 'x_get_quote_tweets',
    'x_get_likes', 'x_auto_follow', 'x_follow_engagers', 'x_unfollow_all',
    'x_smart_unfollow', 'x_quote_tweet', 'x_auto_comment', 'x_auto_retweet',
    'x_detect_bots', 'x_find_influencers', 'x_smart_target', 'x_crypto_analyze',
    'x_grok_analyze_image', 'x_audience_insights', 'x_engagement_report',
    'x_monitor_account', 'x_monitor_keyword', 'x_follower_alerts', 'x_track_engagement',
  ];
  if (xeepyTools.includes(name)) {
    return await executeXeepyTool(name, args);
  }

  // Handle competitive feature tools (09-A through 09-P)
  if (name.startsWith('x_history_') || name === 'x_growth_rate' || name === 'x_compare_accounts') {
    return await executeCompetitiveTool(name, args);
  }
  if (name === 'x_audience_overlap' || name.startsWith('x_crm_') || name.startsWith('x_bulk_') ||
      name.startsWith('x_schedule_') || name.startsWith('x_evergreen_') || name.startsWith('x_rss_') ||
      name.startsWith('x_optimize_') || name === 'x_suggest_hashtags' || name === 'x_predict_performance' ||
      name === 'x_generate_variations' || name.startsWith('x_notify_') || name.startsWith('x_dataset_') ||
      name.startsWith('x_team_') || name === 'x_import_data' || name === 'x_convert_format') {
    return await executeCompetitiveTool(name, args);
  }
  
  // Check plugin tools first
  const pluginTool = getPluginTools().find((t) => t.name === name);
  if (pluginTool?.handler) {
    return await pluginTool.handler(args, { localTools, SESSION_COOKIE });
  }

  if (MODE === 'remote') {
    return await remoteClient.execute(name, args);
  } else {
    // Check if a non-Twitter platform param is set and dispatch to multi-platform variant
    const multiPlatformTools = {
      x_get_profile: 'x_get_profile_multiplatform',
      x_get_followers: 'x_get_followers_multiplatform',
      x_get_following: 'x_get_following_multiplatform',
      x_get_tweets: 'x_get_tweets_multiplatform',
      x_search_tweets: 'x_search_tweets_multiplatform',
    };

    let toolName = name;
    if (args.platform && args.platform !== 'twitter' && multiPlatformTools[name]) {
      toolName = multiPlatformTools[name];
    }

    const toolFn = localTools[toolName] || localTools[name];
    if (!toolFn) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return await toolFn(args);
  }
}

/**
 * Execute xeepy-ported tools (scrapers, follow/unfollow automation, engagement, AI, monitoring)
 * Ported from github.com/nirholas/xeepy — Python → JavaScript
 */
async function executeXeepyTool(name, args) {
  // These tools use the local browser automation backend
  if (!localTools) {
    throw new Error('Local tools not initialized. These tools require local mode.');
  }

  // Try to find a direct implementation in localTools first
  const toolFn = localTools[name];
  if (toolFn) {
    return await toolFn(args);
  }

  // Fallback implementations using existing primitives
  switch (name) {
    // ── Scrapers ──
    case 'x_get_replies': {
      const page = await localTools.getPage();
      const url = args.tweetUrl;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      const replies = await page.evaluate((limit) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        const results = [];
        // Skip first article (the original tweet)
        for (let i = 1; i < articles.length && results.length < limit; i++) {
          const el = articles[i];
          const textEl = el.querySelector('[data-testid="tweetText"]');
          const userEl = el.querySelector('[data-testid="User-Name"]');
          const timeEl = el.querySelector('time');
          results.push({
            text: textEl?.textContent || '',
            author: userEl?.textContent || '',
            timestamp: timeEl?.getAttribute('datetime') || '',
          });
        }
        return results;
      }, args.limit || 50);
      return { replies, count: replies.length };
    }

    case 'x_get_hashtag': {
      // Delegate to search with hashtag prefix
      return await localTools.x_search_tweets?.({
        query: `#${args.hashtag.replace(/^#/, '')}`,
        limit: args.limit || 50,
      }) || { message: `Search for #${args.hashtag} — use x_search_tweets with query "#${args.hashtag}"` };
    }

    case 'x_get_likers': {
      const page = await localTools.getPage();
      const tweetId = args.tweetUrl.split('/status/')[1]?.split(/[?/]/)[0];
      await page.goto(`https://x.com/i/status/${tweetId}/likes`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      const likers = await page.evaluate((limit) => {
        const cells = document.querySelectorAll('[data-testid="UserCell"]');
        return Array.from(cells).slice(0, limit).map(cell => {
          const nameEl = cell.querySelector('[dir="ltr"] span');
          const handleEl = cell.querySelectorAll('[dir="ltr"] span')[1];
          return { name: nameEl?.textContent || '', username: handleEl?.textContent?.replace('@', '') || '' };
        });
      }, args.limit || 100);
      return { likers, count: likers.length };
    }

    case 'x_get_retweeters': {
      const page = await localTools.getPage();
      const tweetId = args.tweetUrl.split('/status/')[1]?.split(/[?/]/)[0];
      await page.goto(`https://x.com/i/status/${tweetId}/retweets`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      const retweeters = await page.evaluate((limit) => {
        const cells = document.querySelectorAll('[data-testid="UserCell"]');
        return Array.from(cells).slice(0, limit).map(cell => {
          const nameEl = cell.querySelector('[dir="ltr"] span');
          const handleEl = cell.querySelectorAll('[dir="ltr"] span')[1];
          return { name: nameEl?.textContent || '', username: handleEl?.textContent?.replace('@', '') || '' };
        });
      }, args.limit || 100);
      return { retweeters, count: retweeters.length };
    }

    case 'x_get_media': {
      const page = await localTools.getPage();
      await page.goto(`https://x.com/${args.username}/media`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      const media = await page.evaluate((opts) => {
        const items = [];
        document.querySelectorAll('img[src*="pbs.twimg.com/media"], video source').forEach(el => {
          if (items.length >= opts.limit) return;
          const src = el.src || el.getAttribute('src');
          const type = el.tagName === 'VIDEO' || el.closest('video') ? 'video' : 'image';
          if (opts.type && opts.type !== 'all' && !type.startsWith(opts.type.slice(0, -1))) return;
          items.push({ url: src, type });
        });
        return items;
      }, { limit: args.limit || 50, type: args.type || 'all' });
      return { media, count: media.length, username: args.username };
    }

    case 'x_get_recommendations': {
      const page = await localTools.getPage();
      const target = args.username ? `https://x.com/${args.username}` : 'https://x.com/i/connect_people';
      await page.goto(target, { waitUntil: 'networkidle2', timeout: 30000 });
      if (args.username) {
        // Navigate to "Similar to" or connect page
        await page.goto(`https://x.com/i/connect_people?user_id=${args.username}`, { waitUntil: 'networkidle2', timeout: 30000 });
      }
      await new Promise(r => setTimeout(r, 3000));
      const recommendations = await page.evaluate((limit) => {
        const cells = document.querySelectorAll('[data-testid="UserCell"]');
        return Array.from(cells).slice(0, limit).map(cell => {
          const nameEl = cell.querySelector('[dir="ltr"] span');
          const bioEl = cell.querySelector('[data-testid="UserDescription"]') || cell.querySelector('[dir="auto"]:nth-child(2)');
          return { name: nameEl?.textContent || '', bio: bioEl?.textContent || '' };
        });
      }, args.limit || 20);
      return { recommendations, count: recommendations.length };
    }

    case 'x_get_mentions': {
      return await localTools.x_search_tweets?.({
        query: `@${args.username.replace(/^@/, '')}${args.since ? ` since:${args.since}` : ''}`,
        limit: args.limit || 50,
      }) || { message: `Use x_search_tweets with query "@${args.username}"` };
    }

    case 'x_get_quote_tweets': {
      const page = await localTools.getPage();
      const tweetId = args.tweetUrl.split('/status/')[1]?.split(/[?/]/)[0];
      const user = args.tweetUrl.split('x.com/')[1]?.split('/')[0];
      await page.goto(`https://x.com/${user}/status/${tweetId}/quotes`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      const quotes = await page.evaluate((limit) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        return Array.from(articles).slice(0, limit).map(el => {
          const textEl = el.querySelector('[data-testid="tweetText"]');
          const userEl = el.querySelector('[data-testid="User-Name"]');
          const timeEl = el.querySelector('time');
          return { text: textEl?.textContent || '', author: userEl?.textContent || '', timestamp: timeEl?.getAttribute('datetime') || '' };
        });
      }, args.limit || 50);
      return { quotes, count: quotes.length };
    }

    case 'x_get_likes': {
      const page = await localTools.getPage();
      await page.goto(`https://x.com/${args.username}/likes`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 3000));
      const likedTweets = await page.evaluate((limit) => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        return Array.from(articles).slice(0, limit).map(el => {
          const textEl = el.querySelector('[data-testid="tweetText"]');
          const userEl = el.querySelector('[data-testid="User-Name"]');
          const timeEl = el.querySelector('time');
          return { text: textEl?.textContent || '', author: userEl?.textContent || '', timestamp: timeEl?.getAttribute('datetime') || '' };
        });
      }, args.limit || 50);
      return { likedTweets, count: likedTweets.length, username: args.username };
    }

    // ── Follow Automation ──
    case 'x_auto_follow': {
      // Find users via search, then follow them with delays
      const searchResults = await localTools.x_search_tweets?.({
        query: args.source === 'hashtag' ? `#${args.query}` : args.query,
        limit: (args.limit || 10) * 3, // Get more to filter
      });
      const users = [];
      const seen = new Set();
      for (const tweet of (searchResults?.tweets || [])) {
        if (users.length >= (args.limit || 10)) break;
        const username = tweet.authorUsername || tweet.author;
        if (!username || seen.has(username)) continue;
        seen.add(username);
        if (args.mustHaveBio || args.mustHaveAvatar || args.minFollowers || args.maxFollowers) {
          // Apply filters — would need profile scrape for full filtering
        }
        try {
          await localTools.x_follow?.({ username });
          users.push(username);
          await new Promise(r => setTimeout(r, (args.delay || 3) * 1000));
        } catch (e) { /* skip failed follows */ }
      }
      return { followed: users, count: users.length };
    }

    case 'x_follow_engagers': {
      const tweets = await localTools.x_get_tweets?.({ username: args.username, limit: 10 });
      const engagers = new Set();
      const followed = [];
      // Simplified — follow repliers from recent tweets
      for (const tweet of (tweets?.tweets || []).slice(0, 5)) {
        if (followed.length >= (args.limit || 10)) break;
        // Would scrape replies for full implementation
      }
      return { followed, count: followed.length, source: args.username };
    }

    // ── Unfollow Automation ──
    case 'x_unfollow_all': {
      if (!args.confirm) {
        return { error: 'Must set confirm: true to mass unfollow everyone' };
      }
      const following = await localTools.x_get_following?.({ username: 'me', limit: args.limit || 1000 });
      const unfollowed = [];
      for (const user of (following?.users || [])) {
        try {
          await localTools.x_unfollow?.({ username: user.username });
          unfollowed.push(user.username);
          await new Promise(r => setTimeout(r, (args.delay || 2) * 1000));
        } catch (e) { /* skip */ }
      }
      return { unfollowed, count: unfollowed.length };
    }

    case 'x_smart_unfollow': {
      // Get following list, then filter by criteria
      const following = await localTools.x_get_following?.({ username: 'me', limit: 500 });
      const toUnfollow = [];
      
      if (args.dryRun) {
        return { message: `Dry run — would analyze ${following?.users?.length || 0} accounts with criteria: ${args.criteria}`, criteria: args.criteria };
      }
      
      const unfollowed = [];
      for (const user of toUnfollow.slice(0, args.limit || 20)) {
        try {
          await localTools.x_unfollow?.({ username: user.username });
          unfollowed.push(user.username);
          await new Promise(r => setTimeout(r, (args.delay || 2) * 1000));
        } catch (e) { /* skip */ }
      }
      return { unfollowed, count: unfollowed.length, criteria: args.criteria };
    }

    // ── Engagement Automation ──
    case 'x_quote_tweet': {
      const page = await localTools.getPage();
      await page.goto(args.tweetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      // Click retweet button, select quote
      await page.click('[data-testid="retweet"]').catch(() => {});
      await new Promise(r => setTimeout(r, 1000));
      const quoteOption = await page.$('text/Quote');
      if (quoteOption) await quoteOption.click();
      await new Promise(r => setTimeout(r, 1500));
      // Type the quote text
      const composer = await page.$('[data-testid="tweetTextarea_0"]');
      if (composer) {
        await composer.type(args.text, { delay: 30 });
        await new Promise(r => setTimeout(r, 500));
        await page.click('[data-testid="tweetButton"]').catch(() => {});
      }
      return { success: true, quotedUrl: args.tweetUrl, text: args.text };
    }

    case 'x_auto_comment': {
      const searchResults = await localTools.x_search_tweets?.({ query: args.query, limit: args.limit || 5 });
      const commented = [];
      for (const tweet of (searchResults?.tweets || [])) {
        try {
          await localTools.x_reply?.({ tweetUrl: tweet.url, text: args.comment });
          commented.push(tweet.url);
          await new Promise(r => setTimeout(r, (args.delay || 5) * 1000));
        } catch (e) { /* skip */ }
      }
      return { commented, count: commented.length };
    }

    case 'x_auto_retweet': {
      const searchResults = await localTools.x_search_tweets?.({ query: args.query, limit: args.limit || 5 });
      const retweeted = [];
      for (const tweet of (searchResults?.tweets || [])) {
        if (args.minLikes && tweet.likes < args.minLikes) continue;
        try {
          await localTools.x_retweet?.({ tweetUrl: tweet.url });
          retweeted.push(tweet.url);
          await new Promise(r => setTimeout(r, (args.delay || 3) * 1000));
        } catch (e) { /* skip */ }
      }
      return { retweeted, count: retweeted.length };
    }

    // ── AI Tools ──
    case 'x_detect_bots': {
      const profile = await localTools.x_get_profile?.({ username: args.username });
      const tweets = await localTools.x_get_tweets?.({ username: args.username, limit: args.deep ? 50 : 20 });
      
      // Heuristic bot detection
      const signals = [];
      let botScore = 0;
      
      if (profile) {
        const ratio = (profile.following || 0) / Math.max(1, profile.followers || 1);
        if (ratio > 10) { signals.push('extreme_following_ratio'); botScore += 25; }
        if (!profile.bio || profile.bio.length < 10) { signals.push('no_bio'); botScore += 15; }
        if (!profile.avatar || profile.avatar.includes('default_profile')) { signals.push('default_avatar'); botScore += 20; }
      }
      
      if (tweets?.tweets) {
        const texts = tweets.tweets.map(t => t.text);
        const uniqueTexts = new Set(texts);
        if (texts.length > 5 && uniqueTexts.size < texts.length * 0.5) {
          signals.push('repetitive_content'); botScore += 30;
        }
      }
      
      return {
        username: args.username,
        botScore: Math.min(100, botScore),
        isLikelyBot: botScore >= 50,
        signals,
        profile: profile ? { followers: profile.followers, following: profile.following, bio: profile.bio?.slice(0, 100) } : null,
      };
    }

    case 'x_find_influencers': {
      const searchResults = await localTools.x_search_tweets?.({ query: args.niche, limit: 100 });
      const authorMap = new Map();
      for (const tweet of (searchResults?.tweets || [])) {
        const username = tweet.authorUsername || tweet.author;
        if (!username) continue;
        if (!authorMap.has(username)) {
          authorMap.set(username, { username, tweetCount: 0, totalEngagement: 0 });
        }
        const entry = authorMap.get(username);
        entry.tweetCount++;
        entry.totalEngagement += (tweet.likes || 0) + (tweet.retweets || 0) + (tweet.replies || 0);
      }
      
      const influencers = Array.from(authorMap.values())
        .map(a => ({ ...a, avgEngagement: Math.round(a.totalEngagement / a.tweetCount) }))
        .sort((a, b) => b.avgEngagement - a.avgEngagement)
        .slice(0, args.limit || 20);
      
      return { niche: args.niche, influencers, count: influencers.length };
    }

    case 'x_smart_target': {
      const profile = await localTools.x_get_profile?.({ username: args.username });
      const tweets = await localTools.x_get_tweets?.({ username: args.username, limit: 20 });
      
      // Extract niche keywords from user's tweets
      const keywords = new Set();
      for (const tweet of (tweets?.tweets || [])) {
        const hashtags = tweet.text.match(/#\w+/g) || [];
        hashtags.forEach(h => keywords.add(h));
      }
      
      const searchQuery = Array.from(keywords).slice(0, 3).join(' OR ') || args.username;
      const targets = await localTools.x_search_tweets?.({ query: searchQuery, limit: (args.limit || 20) * 3 });
      
      const seen = new Set([args.username]);
      const result = [];
      for (const tweet of (targets?.tweets || [])) {
        const u = tweet.authorUsername || tweet.author;
        if (!u || seen.has(u)) continue;
        seen.add(u);
        result.push({ username: u, reason: `Active in ${Array.from(keywords).slice(0, 2).join(', ')}` });
        if (result.length >= (args.limit || 20)) break;
      }
      
      return { strategy: args.strategy || 'growth', targets: result, count: result.length };
    }

    case 'x_crypto_analyze': {
      const searchResults = await localTools.x_search_tweets?.({ query: args.query, limit: args.limit || 100 });
      const tweets = searchResults?.tweets || [];
      
      let bullish = 0, bearish = 0, neutral = 0;
      const influencerMentions = new Map();
      
      for (const tweet of tweets) {
        const text = (tweet.text || '').toLowerCase();
        const engagement = (tweet.likes || 0) + (tweet.retweets || 0);
        
        if (text.match(/bull|moon|pump|buy|long|breakout|ath|🚀|💎|🔥/)) bullish++;
        else if (text.match(/bear|dump|sell|short|crash|dead|rug|💀|📉/)) bearish++;
        else neutral++;
        
        if (engagement > 50) {
          const author = tweet.authorUsername || tweet.author;
          if (author) {
            influencerMentions.set(author, (influencerMentions.get(author) || 0) + engagement);
          }
        }
      }
      
      const total = bullish + bearish + neutral || 1;
      const topInfluencers = Array.from(influencerMentions.entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([username, engagement]) => ({ username, engagement }));
      
      return {
        query: args.query,
        tweetCount: tweets.length,
        sentiment: {
          bullish: Math.round(bullish / total * 100),
          bearish: Math.round(bearish / total * 100),
          neutral: Math.round(neutral / total * 100),
          score: Math.round((bullish - bearish) / total * 100),
        },
        topInfluencers,
      };
    }

    case 'x_grok_analyze_image': {
      // Use Grok API for multimodal analysis
      const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
      if (!OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY required for Grok image analysis. Get a free key at https://openrouter.ai');
      }
      
      let imageUrl = args.imageUrl;
      if (!imageUrl && args.tweetUrl) {
        // Scrape tweet to extract image
        const page = await localTools.getPage();
        await page.goto(args.tweetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        imageUrl = await page.evaluate(() => {
          const img = document.querySelector('article img[src*="pbs.twimg.com/media"]');
          return img?.src || null;
        });
      }
      
      if (!imageUrl) {
        throw new Error('No image found. Provide imageUrl or a tweetUrl containing an image.');
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'x-ai/grok-2-vision-1212',
          messages: [{
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: args.question || 'Describe this image in detail.' },
            ],
          }],
        }),
      });
      
      const data = await response.json();
      return { imageUrl, analysis: data.choices?.[0]?.message?.content || 'No analysis generated' };
    }

    // ── Analytics ──
    case 'x_audience_insights': {
      const followers = await localTools.x_get_followers?.({ username: args.username, limit: args.sampleSize || 200 });
      const profiles = [];
      
      // Sample a subset for deeper analysis
      const sample = (followers?.users || []).slice(0, Math.min(20, args.sampleSize || 200));
      for (const user of sample) {
        const profile = await localTools.x_get_profile?.({ username: user.username }).catch(() => null);
        if (profile) profiles.push(profile);
      }
      
      const locations = {};
      const interests = {};
      let totalFollowers = 0;
      
      for (const p of profiles) {
        if (p.location) locations[p.location] = (locations[p.location] || 0) + 1;
        totalFollowers += p.followers || 0;
        const bio = (p.bio || '').toLowerCase();
        ['crypto', 'ai', 'tech', 'developer', 'founder', 'investor', 'marketing', 'design', 'web3', 'defi'].forEach(tag => {
          if (bio.includes(tag)) interests[tag] = (interests[tag] || 0) + 1;
        });
      }
      
      return {
        username: args.username,
        sampleSize: profiles.length,
        totalFollowers: followers?.users?.length || 0,
        avgFollowersPerFollower: profiles.length ? Math.round(totalFollowers / profiles.length) : 0,
        topLocations: Object.entries(locations).sort((a, b) => b[1] - a[1]).slice(0, 10),
        topInterests: Object.entries(interests).sort((a, b) => b[1] - a[1]).slice(0, 10),
      };
    }

    case 'x_engagement_report': {
      const profile = await localTools.x_get_profile?.({ username: args.username });
      const tweets = await localTools.x_get_tweets?.({ username: args.username, limit: 50 });
      const tweetList = tweets?.tweets || [];
      
      let totalLikes = 0, totalRetweets = 0, totalReplies = 0;
      let bestTweet = null, bestEngagement = 0;
      
      for (const t of tweetList) {
        const eng = (t.likes || 0) + (t.retweets || 0) + (t.replies || 0);
        totalLikes += t.likes || 0;
        totalRetweets += t.retweets || 0;
        totalReplies += t.replies || 0;
        if (eng > bestEngagement) { bestEngagement = eng; bestTweet = t; }
      }
      
      const avgEng = tweetList.length ? Math.round((totalLikes + totalRetweets + totalReplies) / tweetList.length) : 0;
      const engRate = profile?.followers ? ((avgEng / profile.followers) * 100).toFixed(2) : 'N/A';
      
      return {
        username: args.username,
        period: args.period || '30d',
        tweetCount: tweetList.length,
        followers: profile?.followers || 0,
        avgLikes: tweetList.length ? Math.round(totalLikes / tweetList.length) : 0,
        avgRetweets: tweetList.length ? Math.round(totalRetweets / tweetList.length) : 0,
        avgReplies: tweetList.length ? Math.round(totalReplies / tweetList.length) : 0,
        engagementRate: `${engRate}%`,
        bestTweet: bestTweet ? { text: bestTweet.text?.slice(0, 200), likes: bestTweet.likes, retweets: bestTweet.retweets } : null,
      };
    }

    // ── Monitoring ──
    case 'x_monitor_account': {
      // Take a snapshot of current state for comparison
      const profile = await localTools.x_get_profile?.({ username: args.username });
      const latestTweet = await localTools.x_get_tweets?.({ username: args.username, limit: 1 });
      
      return {
        monitored: args.username,
        events: args.events || ['all'],
        interval: `${args.interval || 15} minutes`,
        snapshot: {
          followers: profile?.followers,
          following: profile?.following,
          bio: profile?.bio?.slice(0, 100),
          latestTweet: latestTweet?.tweets?.[0]?.text?.slice(0, 100),
          capturedAt: new Date().toISOString(),
        },
        message: `Monitoring started. Compare future snapshots with this baseline to detect changes.`,
      };
    }

    case 'x_monitor_keyword': {
      const keywords = args.keywords || [];
      const query = keywords.join(' OR ');
      const results = await localTools.x_search_tweets?.({ query, limit: 20 });
      
      return {
        keywords,
        interval: `${args.interval || 10} minutes`,
        currentMatches: results?.tweets?.length || 0,
        latestTweets: (results?.tweets || []).slice(0, 5).map(t => ({
          text: t.text?.slice(0, 200),
          author: t.authorUsername || t.author,
          likes: t.likes,
          url: t.url,
        })),
        message: `Monitoring ${keywords.length} keywords. ${results?.tweets?.length || 0} current matches found.`,
      };
    }

    case 'x_follower_alerts': {
      const followers = await localTools.x_get_followers?.({ username: args.username, limit: 500 });
      
      return {
        username: args.username,
        alertTypes: args.alertTypes || ['new_follower', 'unfollower', 'milestone', 'surge', 'drop'],
        currentFollowerCount: followers?.users?.length || 0,
        snapshot: (followers?.users || []).slice(0, 10).map(u => u.username),
        message: `Follower alerts configured. Save this snapshot and compare on next check to detect changes.`,
        capturedAt: new Date().toISOString(),
      };
    }

    case 'x_track_engagement': {
      if (args.tweetUrl) {
        const page = await localTools.getPage();
        await page.goto(args.tweetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2000));
        const metrics = await page.evaluate(() => {
          const article = document.querySelector('article[data-testid="tweet"]');
          if (!article) return null;
          const getText = (testid) => article.querySelector(`[data-testid="${testid}"]`)?.textContent || '0';
          return {
            likes: getText('like'),
            retweets: getText('retweet'),
            replies: getText('reply'),
            views: getText('views') || getText('analytics'),
          };
        });
        return { tweetUrl: args.tweetUrl, metrics, capturedAt: new Date().toISOString() };
      }
      
      // Account-level tracking
      const profile = await localTools.x_get_profile?.({ username: args.username });
      const tweets = await localTools.x_get_tweets?.({ username: args.username, limit: 10 });
      return {
        username: args.username,
        followers: profile?.followers,
        recentEngagement: (tweets?.tweets || []).slice(0, 5).map(t => ({
          text: t.text?.slice(0, 80),
          likes: t.likes,
          retweets: t.retweets,
        })),
        capturedAt: new Date().toISOString(),
      };
    }

    default:
      throw new Error(`Xeepy tool not implemented: ${name}. This tool is defined but needs a handler.`);
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
      const intervalMs = args.interval ? Math.max(15, Math.min(3600, Number(args.interval))) * 1000 : undefined;
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
    case 'x_stream_pause': {
      return await streaming.pauseStream(args.streamId);
    }
    case 'x_stream_resume': {
      return await streaming.resumeStream(args.streamId);
    }
    case 'x_stream_status': {
      return await streaming.getStreamStatus(args.streamId);
    }
    case 'x_stream_history': {
      return await streaming.getStreamHistory(args.streamId, {
        limit: args.limit,
        eventType: args.eventType,
      });
    }
    default:
      throw new Error(`Unknown stream tool: ${name}`);
  }
}

/**
 * Execute analytics/sentiment tools
 */
async function executeAnalyticsTool(name, args) {
  // Lazy-import to avoid loading analytics deps when not needed
  const analytics = await import('../analytics/index.js');

  switch (name) {
    case 'x_analyze_sentiment': {
      if (args.texts && Array.isArray(args.texts)) {
        const results = await analytics.analyzeBatch(args.texts, { mode: args.mode || 'rules' });
        return { results, count: results.length };
      }
      if (!args.text) {
        return { error: 'Either "text" (string) or "texts" (array) is required' };
      }
      return await analytics.analyzeSentiment(args.text, { mode: args.mode || 'rules' });
    }

    case 'x_monitor_reputation': {
      const action = args.action;

      if (action === 'start') {
        if (!args.target) return { error: '"target" is required to start a monitor' };
        const monitor = analytics.createMonitor({
          target: args.target,
          type: args.type || 'mentions',
          intervalMs: args.interval ? Math.max(60, Number(args.interval)) * 1000 : undefined,
          sentimentMode: 'rules',
          alertConfig: {
            webhookUrl: args.webhookUrl || null,
          },
        });
        return monitor;
      }

      if (action === 'stop') {
        if (!args.monitorId) return { error: '"monitorId" is required to stop a monitor' };
        analytics.removeMonitor(args.monitorId);
        return { success: true, message: `Monitor ${args.monitorId} stopped` };
      }

      if (action === 'list') {
        return { monitors: analytics.listMonitors() };
      }

      if (action === 'status') {
        if (!args.monitorId) return { error: '"monitorId" is required for status' };
        const monitor = analytics.getMonitor(args.monitorId);
        if (!monitor) return { error: `Monitor ${args.monitorId} not found` };
        const history = analytics.getMonitorHistory(args.monitorId, { limit: 20 });
        return { ...monitor, recentHistory: history };
      }

      return { error: `Unknown action "${action}". Use: start, stop, list, status` };
    }

    case 'x_reputation_report': {
      const username = (args.username || '').replace(/^@/, '');
      if (!username) return { error: '"username" is required' };

      const monitors = analytics.listMonitors();
      const monitor = monitors.find(m =>
        m.target.replace(/^@/, '').toLowerCase() === username.toLowerCase()
      );

      if (!monitor) {
        return {
          error: `No active monitor for @${username}. Start one first with x_monitor_reputation action:"start" target:"@${username}"`,
        };
      }

      const history = analytics.getMonitorHistory(monitor.id, { limit: 10000 });
      const { report, markdown } = analytics.generateReport(monitor, history, {
        period: args.period || '7d',
        format: args.format || 'markdown',
      });

      if (args.format === 'json') return report;
      return { report, markdown };
    }

    default:
      throw new Error(`Unknown analytics tool: ${name}`);
  }
}

/**
 * Execute workflow-specific tools
 */
async function executeWorkflowTool(name, args) {
  // Lazy-import to avoid loading workflow deps when not needed
  const workflows = (await import('../workflows/index.js')).default;

  switch (name) {
    case 'x_workflow_create': {
      const workflow = await workflows.create({
        name: args.name,
        description: args.description || '',
        trigger: args.trigger || { type: 'manual' },
        steps: args.steps || [],
      });
      return workflow;
    }
    case 'x_workflow_run': {
      const result = await workflows.run(args.workflow, {
        trigger: 'mcp',
        initialContext: args.context || {},
        authToken: SESSION_COOKIE || undefined,
      });
      return {
        runId: result.id,
        workflowName: result.workflowName,
        status: result.status,
        stepsCompleted: result.stepsCompleted,
        totalSteps: result.totalSteps,
        error: result.error,
        steps: result.steps?.map(s => ({
          name: s.name,
          status: s.status,
          error: s.error,
        })),
        result: result.result,
      };
    }
    case 'x_workflow_list': {
      return await workflows.list();
    }
    case 'x_workflow_actions': {
      return {
        actions: workflows.listActions(),
        operators: workflows.getAvailableOperators(),
      };
    }
    default:
      throw new Error(`Unknown workflow tool: ${name}`);
  }
}

/**
 * Execute portability-specific tools (export, migrate, diff)
 */
async function executePortabilityTool(name, args) {
  const portability = await import('../portability/index.js');

  switch (name) {
    case 'x_export_account': {
      // Need a browser page for scraping
      const scrapers = (await import('../scrapers/index.js')).default || await import('../scrapers/index.js');
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);

      if (SESSION_COOKIE) {
        await scrapers.loginWithCookie(page, SESSION_COOKIE);
      }

      try {
        const summary = await portability.exportAccount({
          page,
          username: args.username,
          formats: args.formats || ['json', 'csv', 'md'],
          only: args.only,
          limit: args.limit || 500,
          scrapers,
        });
        return summary;
      } finally {
        await browser.close();
      }
    }

    case 'x_migrate_account': {
      const { promises: fs } = await import('fs');
      const path = await import('path');

      // Find export dir
      let exportDir = args.exportDir;
      if (!exportDir) {
        const username = args.username.replace(/^@/, '');
        const exportsRoot = path.join(process.cwd(), 'exports');
        try {
          const dirs = await fs.readdir(exportsRoot);
          const match = dirs.filter(d => d.startsWith(username + '_')).sort().pop();
          if (match) exportDir = path.join(exportsRoot, match);
        } catch { /* no exports dir */ }
      }

      if (!exportDir) {
        throw new Error(`No export found for @${args.username}. Run x_export_account first.`);
      }

      return await portability.migrate({
        platform: args.platform,
        exportDir,
        dryRun: args.dryRun !== false,
      });
    }

    case 'x_diff_exports': {
      const { diff } = await portability.diffAndReport(args.dirA, args.dirB);
      return diff;
    }

    default:
      throw new Error(`Unknown portability tool: ${name}`);
  }
}

/**
 * Execute graph-specific tools (build, analyze, recommendations, list)
 */
async function executeGraphTool(name, args) {
  const graphMod = (await import('../graph/index.js')).default;

  switch (name) {
    case 'x_graph_build': {
      const username = (args.username || '').replace(/^@/, '');
      if (!username) throw new Error('"username" is required');

      const result = await graphMod.build(username, {
        depth: args.depth || 2,
        maxNodes: args.maxNodes || 500,
        authToken: SESSION_COOKIE || undefined,
      });

      return {
        graphId: result.id,
        seed: result.seed,
        nodesCount: result.nodes?.length || 0,
        edgesCount: result.edges?.length || 0,
        status: result.metadata?.status || 'complete',
        message: `Graph built: ${result.nodes?.length || 0} nodes, ${result.edges?.length || 0} edges. Use graphId "${result.id}" for analysis.`,
      };
    }

    case 'x_graph_analyze': {
      if (!args.graphId) throw new Error('"graphId" is required');
      const data = await graphMod.get(args.graphId);
      if (!data) throw new Error(`Graph not found: ${args.graphId}`);

      const analysis = graphMod.analyze(data);

      // Summarize for MCP response (avoid huge payloads)
      return {
        graphId: args.graphId,
        seed: analysis.seed,
        nodesCount: analysis.nodesCount,
        edgesCount: analysis.edgesCount,
        clusters: analysis.clusters.map(c => ({ label: c.label, size: c.size, topMembers: c.members.slice(0, 5) })),
        topInfluencers: analysis.influenceRanking.slice(0, 10).map(u => ({ username: u.username, score: u.influenceScore })),
        bridgeAccounts: analysis.bridgeAccounts.slice(0, 5).map(b => ({ username: b.username, betweenness: b.betweenness })),
        mutualConnections: analysis.mutualConnections.length,
        ghostFollowers: analysis.ghostFollowers.length,
        orbits: analysis.orbits?.summary || null,
      };
    }

    case 'x_graph_recommendations': {
      if (!args.graphId) throw new Error('"graphId" is required');
      const data = await graphMod.get(args.graphId);
      if (!data) throw new Error(`Graph not found: ${args.graphId}`);

      const recs = graphMod.recommend(data, data.seed);

      return {
        seed: recs.seed,
        followSuggestions: recs.followSuggestions.slice(0, 10).map(s => ({ username: s.username, reason: s.reason })),
        engageSuggestions: recs.engageSuggestions.slice(0, 10).map(s => ({ username: s.username, reason: s.reason })),
        competitorWatch: recs.competitorWatch.slice(0, 5).map(s => ({ username: s.username, reason: s.reason })),
        safeToUnfollow: recs.safeToUnfollow.slice(0, 10).map(s => ({ username: s.username, reason: s.reason })),
      };
    }

    case 'x_graph_list': {
      return await graphMod.list();
    }

    default:
      throw new Error(`Unknown graph tool: ${name}`);
  }
}

/**
 * Execute competitive feature tools (09-A through 09-P)
 */
async function executeCompetitiveTool(name, args) {
  switch (name) {
    // ── 09-A: History ──
    case 'x_history_get': {
      const { getAccountHistory } = await import('../analytics/historyStore.js');
      const days = args.days || 30;
      const from = new Date(Date.now() - days * 86400000).toISOString();
      return getAccountHistory(args.username, { from, interval: args.interval || 'day' });
    }
    case 'x_history_snapshot': {
      const { saveAccountSnapshot } = await import('../analytics/historyStore.js');
      if (localTools) {
        const profile = await localTools.x_get_profile({ username: args.username });
        saveAccountSnapshot(args.username, profile);
        return { status: 'snapshot_saved', username: args.username };
      }
      return { status: 'snapshot_saved_empty', note: 'No scraper available — use in local mode' };
    }
    case 'x_growth_rate': {
      const { getGrowthRate } = await import('../analytics/historyStore.js');
      return getGrowthRate(args.username, args.days || 7);
    }
    case 'x_compare_accounts': {
      const { compareAccounts } = await import('../analytics/historyStore.js');
      const days = args.days || 30;
      const from = new Date(Date.now() - days * 86400000).toISOString();
      return compareAccounts(args.usernames, args.metric, { from });
    }

    // ── 09-B: Audience Overlap ──
    case 'x_audience_overlap': {
      const { analyzeOverlap } = await import('../analytics/audienceOverlap.js');
      return await analyzeOverlap(args.username1, args.username2, { maxFollowers: args.maxFollowers || 5000 });
    }

    // ── 09-C: CRM ──
    case 'x_crm_sync': {
      const { syncFollowers } = await import('../analytics/followerCRM.js');
      return await syncFollowers(args.username);
    }
    case 'x_crm_tag': {
      const { tagContact } = await import('../analytics/followerCRM.js');
      tagContact(args.username, args.tag);
      return { status: 'tagged', username: args.username, tag: args.tag };
    }
    case 'x_crm_search': {
      const { searchContacts } = await import('../analytics/followerCRM.js');
      return searchContacts(args.query);
    }
    case 'x_crm_segment': {
      const { getSegment } = await import('../analytics/followerCRM.js');
      return getSegment(args.name);
    }

    // ── 09-D: Bulk Operations ──
    case 'x_bulk_execute': {
      const { bulkExecute } = await import('../bulk/bulkOperations.js');
      return await bulkExecute(args.usernames, args.action, { delay: args.delay, dryRun: args.dryRun });
    }

    // ── 09-F: Scheduler ──
    case 'x_schedule_add': {
      const { getScheduler } = await import('../scheduler/scheduler.js');
      const scheduler = getScheduler();
      scheduler.addJob({ name: args.name, cron: args.cron, action: args.action || args.name });
      return { status: 'scheduled', name: args.name, cron: args.cron };
    }
    case 'x_schedule_list': {
      const { getScheduler } = await import('../scheduler/scheduler.js');
      return getScheduler().listJobs();
    }
    case 'x_schedule_remove': {
      const { getScheduler } = await import('../scheduler/scheduler.js');
      getScheduler().removeJob(args.name);
      return { status: 'removed', name: args.name };
    }

    // ── 09-H: Evergreen ──
    case 'x_evergreen_analyze': {
      const { analyzeEvergreenCandidates } = await import('../automation/evergreenRecycler.js');
      return await analyzeEvergreenCandidates(args.username, { minLikes: args.minLikes, minAgeDays: args.minAgeDays });
    }

    // ── 09-I: RSS ──
    case 'x_rss_add': {
      const { addFeed } = await import('../automation/rssMonitor.js');
      addFeed({ name: args.name, url: args.url, template: args.template });
      return { status: 'added', name: args.name };
    }
    case 'x_rss_check': {
      const { checkAllFeeds } = await import('../automation/rssMonitor.js');
      return await checkAllFeeds();
    }
    case 'x_rss_drafts': {
      const { getDrafts } = await import('../automation/rssMonitor.js');
      return getDrafts();
    }

    // ── 09-J: AI Optimizer ──
    case 'x_optimize_tweet': {
      const { optimizeTweet } = await import('../ai/contentOptimizer.js');
      return await optimizeTweet(args.text, { goal: args.goal || 'engagement' });
    }
    case 'x_suggest_hashtags': {
      const { suggestHashtags } = await import('../ai/contentOptimizer.js');
      return await suggestHashtags(args.text, { count: args.count || 5 });
    }
    case 'x_predict_performance': {
      const { predictPerformance } = await import('../ai/contentOptimizer.js');
      return await predictPerformance(args.text);
    }
    case 'x_generate_variations': {
      const { generateVariations } = await import('../ai/contentOptimizer.js');
      return await generateVariations(args.text, args.count || 3);
    }

    // ── 09-L: Notifications ──
    case 'x_notify_send': {
      const { getNotifier } = await import('../notifications/notifier.js');
      const notifier = await getNotifier();
      return await notifier.send({ title: args.title, message: args.message, severity: args.severity || 'info' });
    }
    case 'x_notify_test': {
      const { getNotifier } = await import('../notifications/notifier.js');
      const notifier = await getNotifier();
      return await notifier.test(args.channel);
    }

    // ── 09-M: Datasets ──
    case 'x_dataset_list': {
      const { listDatasets } = await import('../scraping/paginationEngine.js');
      return await listDatasets();
    }
    case 'x_dataset_get': {
      const { DatasetStore } = await import('../scraping/paginationEngine.js');
      const ds = new DatasetStore(args.name);
      return await ds.getData({ offset: args.offset, limit: args.limit });
    }

    // ── 09-N: Teams ──
    case 'x_team_create': {
      const { createTeam } = await import('../auth/teamManager.js');
      return await createTeam(args.name, args.owner);
    }
    case 'x_team_members': {
      const { listTeamMembers } = await import('../auth/teamManager.js');
      return await listTeamMembers(args.teamId);
    }

    // ── 09-P: Import/Export ──
    case 'x_import_data': {
      const { importApifyDataset, importPhantomResult, autoDetectCSV } = await import('../compat/apifyAdapter.js');
      const parsed = typeof args.data === 'string' ? args.data : JSON.stringify(args.data);
      if (args.from === 'apify') return importApifyDataset(parsed);
      if (args.from === 'phantombuster') return importPhantomResult(parsed);
      try { return importApifyDataset(JSON.parse(parsed)); } catch { return autoDetectCSV(parsed); }
    }
    case 'x_convert_format': {
      const { convertFormat } = await import('../compat/apifyAdapter.js');
      const data = typeof args.data === 'string' ? args.data : JSON.stringify(args.data);
      return convertFormat(data.startsWith('[') ? JSON.parse(data) : data, args.from, args.to);
    }

    default:
      throw new Error(`Unknown competitive tool: ${name}`);
  }
}

/**
 * Execute persona/algorithm builder tools
 */
async function executePersonaTool(name, args) {
  const personaMod = await import('../personaEngine.js');

  switch (name) {
    case 'x_persona_create': {
      if (!args.name) throw new Error('"name" is required');
      if (!args.preset) throw new Error('"preset" is required');

      const persona = personaMod.createPersona({
        name: args.name,
        preset: args.preset,
        strategy: args.strategy || 'moderate',
        activityPattern: args.activityPattern || 'always-on',
        topics: args.topics,
        searchTerms: args.searchTerms,
        targetAccounts: args.targetAccounts,
      });

      const filePath = personaMod.savePersona(persona);

      return {
        id: persona.id,
        name: persona.name,
        preset: args.preset,
        strategy: persona.strategy.preset,
        activityPattern: persona.activityPattern.preset,
        topics: persona.niche.topics,
        searchTerms: persona.niche.searchTerms.length,
        targetAccounts: persona.niche.targetAccounts,
        savedTo: filePath,
        message: `Persona "${persona.name}" created. Run with x_persona_run or CLI: xactions persona run ${persona.id}`,
      };
    }

    case 'x_persona_list': {
      const personas = personaMod.listPersonas();
      return {
        count: personas.length,
        personas: personas.map(p => ({
          id: p.id,
          name: p.name,
          preset: p.preset,
          strategy: p.strategy,
          totalSessions: p.totalSessions,
          totalFollows: p.totalFollows || 0,
          totalLikes: p.totalLikes || 0,
          totalComments: p.totalComments || 0,
          lastSessionAt: p.lastSessionAt,
        })),
      };
    }

    case 'x_persona_status': {
      if (!args.personaId) throw new Error('"personaId" is required');
      const persona = personaMod.loadPersona(args.personaId);

      return {
        id: persona.id,
        name: persona.name,
        preset: persona.preset,
        createdAt: persona.createdAt,
        niche: {
          topics: persona.niche.topics,
          searchTerms: persona.niche.searchTerms,
          targetAccounts: persona.niche.targetAccounts,
        },
        strategy: persona.strategy.preset,
        activityPattern: persona.activityPattern.preset,
        stats: {
          totalSessions: persona.state.totalSessions,
          totalLikes: persona.state.totalLikes,
          totalFollows: persona.state.totalFollows,
          totalComments: persona.state.totalComments,
          totalPosts: persona.state.totalPosts,
          totalSearches: persona.state.totalSearches,
          totalProfileVisits: persona.state.totalProfileVisits,
          followedUsersCount: Object.keys(persona.state.followedUsers || {}).length,
          lastSessionAt: persona.state.lastSessionAt,
        },
        goals: persona.goals,
      };
    }

    case 'x_persona_edit': {
      if (!args.personaId) throw new Error('"personaId" is required');
      const persona = personaMod.loadPersona(args.personaId);

      if (args.topics) persona.niche.topics = args.topics;
      if (args.searchTerms) persona.niche.searchTerms = args.searchTerms;
      if (args.targetAccounts) persona.niche.targetAccounts = args.targetAccounts;
      if (args.strategy && personaMod.ENGAGEMENT_STRATEGIES[args.strategy]) {
        persona.strategy = { preset: args.strategy, ...personaMod.ENGAGEMENT_STRATEGIES[args.strategy] };
      }
      if (args.activityPattern && personaMod.ACTIVITY_PATTERNS[args.activityPattern]) {
        persona.activityPattern = { preset: args.activityPattern, ...personaMod.ACTIVITY_PATTERNS[args.activityPattern], timezone: persona.activityPattern.timezone };
      }

      persona.updatedAt = new Date().toISOString();
      personaMod.savePersona(persona);

      return {
        id: persona.id,
        name: persona.name,
        message: `Persona "${persona.name}" updated`,
        topics: persona.niche.topics,
        strategy: persona.strategy.preset,
        activityPattern: persona.activityPattern.preset,
      };
    }

    case 'x_persona_delete': {
      if (!args.personaId) throw new Error('"personaId" is required');
      personaMod.deletePersona(args.personaId);
      return { message: `Persona ${args.personaId} deleted` };
    }

    case 'x_persona_run': {
      if (!args.personaId) throw new Error('"personaId" is required');
      const authToken = SESSION_COOKIE;
      if (!authToken) throw new Error('XACTIONS_SESSION_COOKIE is required to run algorithm builder');

      const { startAlgorithmBuilder } = await import('../algorithmBuilder.js');

      const result = await startAlgorithmBuilder({
        personaId: args.personaId,
        authToken,
        headless: args.headless !== false,
        dryRun: args.dryRun || false,
        maxSessions: args.sessions || 1, // Default 1 session for MCP (not infinite)
      });

      return {
        personaId: args.personaId,
        sessionsCompleted: result.sessionCount,
        totalLikes: result.persona.state.totalLikes,
        totalFollows: result.persona.state.totalFollows,
        totalComments: result.persona.state.totalComments,
        totalPosts: result.persona.state.totalPosts,
        message: `Algorithm builder completed ${result.sessionCount} session(s)`,
      };
    }

    case 'x_persona_presets': {
      return {
        niches: Object.entries(personaMod.NICHE_PRESETS).map(([key, val]) => ({
          key,
          name: val.name,
          topics: val.topics.slice(0, 5),
          targetAccounts: val.targetAccounts?.slice(0, 3) || [],
        })),
        strategies: Object.entries(personaMod.ENGAGEMENT_STRATEGIES).map(([key, val]) => ({
          key,
          name: val.name,
          description: val.description,
          dailyLimits: val.dailyLimits,
        })),
        activityPatterns: Object.entries(personaMod.ACTIVITY_PATTERNS).map(([key, val]) => ({
          key,
          name: val.name,
          description: val.description,
          activeHoursCount: val.activeHours.length,
          peakHoursCount: val.peakHours.length,
        })),
      };
    }

    default:
      throw new Error(`Unknown persona tool: ${name}`);
  }
}

/**
 * Execute AI-specific tools (voice analysis, tweet generation, thread summarization)
 */
async function executeAITool(name, args) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  switch (name) {
    case 'x_analyze_voice': {
      const ai = await import('../ai/index.js');
      const scrapersMod = await import('../scrapers/index.js');
      const scrapers = scrapersMod.default || scrapersMod;
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);
      if (SESSION_COOKIE) await scrapers.loginWithCookie(page, SESSION_COOKIE);
      try {
        const tweets = await scrapers.scrapeTweets(page, args.username, { limit: args.limit || 100 });
        if (!tweets || tweets.length === 0) return { error: `No tweets found for @${args.username}` };
        const profile = ai.analyzeVoice(args.username, tweets);
        const summary = ai.summarizeVoiceProfile(profile);
        return { username: args.username, voiceProfile: profile, summary };
      } finally {
        await browser.close();
      }
    }

    case 'x_generate_tweet': {
      if (!OPENROUTER_API_KEY) {
        return { error: 'OPENROUTER_API_KEY environment variable required for AI tweet generation. Get one free at https://openrouter.ai' };
      }
      const ai = await import('../ai/index.js');
      const scrapersMod = await import('../scrapers/index.js');
      const scrapers = scrapersMod.default || scrapersMod;
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);
      if (SESSION_COOKIE) await scrapers.loginWithCookie(page, SESSION_COOKIE);
      try {
        const tweets = await scrapers.scrapeTweets(page, args.username, { limit: 100 });
        if (!tweets || tweets.length === 0) return { error: `No tweets found for @${args.username}` };
        const voiceProfile = ai.analyzeVoice(args.username, tweets);
        
        if (args.type === 'thread') {
          const result = await ai.generateThread(voiceProfile, {
            topic: args.topic,
            length: args.count || 5,
          });
          return { username: args.username, topic: args.topic, ...result };
        }
        
        const result = await ai.generateTweet(voiceProfile, {
          topic: args.topic,
          count: args.count || 3,
          style: args.style,
        });
        return { username: args.username, topic: args.topic, ...result };
      } finally {
        await browser.close();
      }
    }

    case 'x_rewrite_tweet': {
      if (!OPENROUTER_API_KEY) {
        return { error: 'OPENROUTER_API_KEY environment variable required for AI tweet rewriting. Get one free at https://openrouter.ai' };
      }
      const ai = await import('../ai/index.js');
      const scrapersMod = await import('../scrapers/index.js');
      const scrapers = scrapersMod.default || scrapersMod;
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);
      if (SESSION_COOKIE) await scrapers.loginWithCookie(page, SESSION_COOKIE);
      try {
        const tweets = await scrapers.scrapeTweets(page, args.username, { limit: 100 });
        if (!tweets || tweets.length === 0) return { error: `No tweets found for @${args.username}` };
        const voiceProfile = ai.analyzeVoice(args.username, tweets);
        const result = await ai.rewriteTweet(voiceProfile, args.text, {
          goal: args.goal || 'more_engaging',
          count: args.count || 3,
        });
        return { username: args.username, ...result };
      } finally {
        await browser.close();
      }
    }

    case 'x_summarize_thread': {
      if (!OPENROUTER_API_KEY) {
        return { error: 'OPENROUTER_API_KEY environment variable required for AI thread summarization. Get one free at https://openrouter.ai' };
      }
      const scrapersMod = await import('../scrapers/index.js');
      const scrapers = scrapersMod.default || scrapersMod;
      const browser = await scrapers.createBrowser();
      const page = await scrapers.createPage(browser);
      if (SESSION_COOKIE) await scrapers.loginWithCookie(page, SESSION_COOKIE);
      try {
        const thread = await scrapers.scrapeThread(page, args.url);
        const threadTexts = (thread || []).map(t => t.text || t.content || '').filter(Boolean);
        if (!threadTexts.length) return { error: 'Could not unroll thread or no text found' };

        const fullThread = threadTexts.join('\n\n---\n\n');
        const style = args.style || 'brief';
        const stylePrompts = {
          brief: 'Provide a concise 2-3 sentence summary.',
          detailed: 'Provide a detailed summary covering all key points.',
          bullet: 'Provide a bullet-point summary with key takeaways.',
        };

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://xactions.app',
            'X-Title': 'XActions MCP',
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3-8b-instruct:free',
            messages: [
              { role: 'system', content: `You are a thread summarizer. ${stylePrompts[style]}` },
              { role: 'user', content: `Summarize this Twitter/X thread:\n\n${fullThread}` },
            ],
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          return { error: `OpenRouter API error: ${err}` };
        }

        const data = await response.json();
        const summary = data.choices?.[0]?.message?.content || 'No summary generated';
        return {
          url: args.url,
          tweetCount: threadTexts.length,
          style,
          summary,
          thread: threadTexts,
        };
      } finally {
        await browser.close();
      }
    }

    default:
      throw new Error(`Unknown AI tool: ${name}`);
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

// List available tools (core + plugins)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const pluginToolDefs = getPluginTools().map(({ _plugin, handler, ...def }) => def);
  return { tools: [...TOOLS, ...pluginToolDefs] };
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
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

  console.error('');
  console.error('⚡ XActions MCP Server v3.1.0 — 140+ tools');
  console.error('   The free, open-source Twitter/X MCP server');
  console.error('   https://github.com/nirholas/XActions');
  console.error('');
  
  await initializeBackend();
  
  // Load plugins
  const pluginCount = await initializePlugins();
  const pluginToolCount = getPluginTools().length;
  
  // ── Setup Wizard: Auth Detection ──
  if (SESSION_COOKIE) {
    console.error('✅ Authenticated (XACTIONS_SESSION_COOKIE set)');
  } else {
    console.error('⚠️  No auth_token configured. Some tools require authentication.');
    console.error('');
    console.error('   To authenticate, set the XACTIONS_SESSION_COOKIE env var:');
    console.error('');
    console.error('   1. Go to x.com and log in');
    console.error('   2. Open DevTools (F12) → Application → Cookies → https://x.com');
    console.error('   3. Copy the value of the "auth_token" cookie');
    console.error('   4. Add to your MCP config:');
    console.error('');
    console.error('      "env": { "XACTIONS_SESSION_COOKIE": "your_auth_token_here" }');
    console.error('');
  }

  // ── AI Tools Status ──
  if (OPENROUTER_API_KEY) {
    console.error('✅ AI tools enabled (OPENROUTER_API_KEY set)');
    console.error('   x_analyze_voice, x_generate_tweet, x_summarize_thread');
  } else {
    console.error('ℹ️  AI tools disabled. Set OPENROUTER_API_KEY for voice analysis & tweet generation.');
    console.error('   Get a free key at https://openrouter.ai');
  }

  console.error('');

  // ── Tool Summary ──
  const totalTools = TOOLS.length + pluginToolCount;
  console.error(`📋 Tools available: ${totalTools}`);
  if (pluginCount > 0) {
    console.error(`   Plugins loaded: ${pluginCount} (${pluginToolCount} tools)`);
  }

  // Group tools by category for display
  const categories = {
    'Scraping':  ['x_get_profile', 'x_get_followers', 'x_get_following', 'x_get_tweets', 'x_search_tweets', 'x_get_thread', 'x_download_video'],
    'Analysis':  ['x_detect_unfollowers', 'x_analyze_sentiment', 'x_best_time_to_post', 'x_competitor_analysis', 'x_brand_monitor'],
    'Actions':   ['x_follow', 'x_unfollow', 'x_like', 'x_post_tweet', 'x_post_thread', 'x_reply'],
    'AI':        ['x_analyze_voice', 'x_generate_tweet', 'x_summarize_thread'],
  };

  for (const [cat, tools] of Object.entries(categories)) {
    const available = tools.filter(t => TOOLS.some(td => td.name === t));
    if (available.length) {
      console.error(`   ${cat}: ${available.join(', ')}`);
    }
  }

  console.error('');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('✅ Server running on stdio');
  console.error('   Ready for connections from Claude, Cursor, Windsurf, and any MCP client.');
  console.error('');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

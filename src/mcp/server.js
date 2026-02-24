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
  console.error('⚡ XActions MCP Server v3.0.0');
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

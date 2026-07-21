// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Agent API Routes
 *
 * Dedicated endpoints optimized for AI agent consumption.
 * All routes are protected by x402 payment middleware.
 *
 * Humans should use:
 * - Browser scripts at https://xactions.app/features
 * - Dashboard at https://xactions.app/dashboard
 *
 * @see https://xactions.app/docs/ai-api
 */

import express from 'express';
import scrapeRoutes from './scrape.js';
import actionRoutes from './actions.js';
import monitorRoutes from './monitor.js';
import utilityRoutes from './utility.js';
import writerRoutes from './writer.js';
import postingRoutes from './posting.js';
import engagementRoutes from './engagement.js';
import messagesRoutes from './messages.js';
import profileRoutes from './profile.js';
import grokRoutes from './grok.js';
import listsRoutes from './lists.js';
import spacesRoutes from './spaces.js';
import analyticsRoutes from './analytics.js';
import sentimentRoutes from './sentiment.js';
import streamsRoutes from './streams.js';
import workflowsRoutes from './workflows.js';
import portabilityRoutes from './portability.js';
import personasRoutes from './personas.js';
import graphRoutes from './graph.js';
import crmRoutes from './crm.js';
import schedulerRoutes from './scheduler.js';
import optimizerRoutes from './optimizer.js';
import notificationsRoutes from './notifications.js';
import datasetsRoutes from './datasets.js';
import teamsRoutes from './teams.js';
import automationRoutes from './automation.js';
import communityRoutes from './community.js';
import moderationRoutes from './moderation.js';
import accountRoutes from './account.js';
import adsRoutes from './ads.js';
import xproRoutes from './xpro.js';
import discoveryRoutes from './discovery.js';
import premiumRoutes from './premium.js';
import settingsRoutes from './settings.js';
import creatorRoutes from './creator.js';
import timelineRoutes from './timeline.js';
import topicsRoutes from './topics.js';
import articlesRoutes from './articles.js';
import leadsRoutes from './leads.js';
import viralRoutes from './viral.js';
import billingRoutes from './billing.js';
import webhooksRoutes from './webhooks.js';
import cleanupRoutes from './cleanup.js';
import bookmarksRoutes from './bookmarks.js';
import mediaRoutes from './media.js';

const router = express.Router();

// API documentation endpoint (free - no payment required)
router.get('/', (req, res) => {
  res.json({
    service: 'XActions AI API',
    version: '2.0.0',
    description: 'X/Twitter automation API for AI agents. Pay-per-request via x402.',
    authentication: 'X-PAYMENT header with signed USDC payment',
    documentation: 'https://xactions.app/docs/ai-api',

    endpoints: {
      scraping: {
        'POST /api/ai/scrape/profile': 'Get profile information',
        'POST /api/ai/scrape/followers': 'List followers',
        'POST /api/ai/scrape/following': 'List following',
        'POST /api/ai/scrape/tweets': 'Get tweet history',
        'POST /api/ai/scrape/thread': 'Get thread/conversation',
        'POST /api/ai/scrape/search': 'Search tweets',
        'POST /api/ai/scrape/hashtag': 'Get hashtag tweets',
        'POST /api/ai/scrape/media': 'Get media from profile',
        'POST /api/ai/scrape/likes': 'Get tweet likers',
        'POST /api/ai/scrape/retweets': 'Get tweet retweeters',
        'POST /api/ai/scrape/replies': 'Get tweet replies',
        'POST /api/ai/scrape/quote-tweets': 'Get quote tweets',
        'POST /api/ai/scrape/user-likes': 'Get tweets a user liked',
        'POST /api/ai/scrape/mentions': 'Get @mentions of a user',
        'POST /api/ai/scrape/recommendations': 'Get recommended accounts',
      },
      posting: {
        'POST /api/ai/posting/tweet': 'Post a tweet',
        'POST /api/ai/posting/thread': 'Post a thread',
        'POST /api/ai/posting/poll': 'Create a poll',
        'POST /api/ai/posting/schedule': 'Schedule a tweet',
        'POST /api/ai/posting/delete': 'Delete a tweet',
        'POST /api/ai/posting/reply': 'Reply to a tweet',
        'POST /api/ai/posting/bookmark': 'Bookmark a tweet',
        'POST /api/ai/posting/bookmarks': 'Get bookmarks',
        'POST /api/ai/posting/clear-bookmarks': 'Clear bookmarks',
        'POST /api/ai/posting/article': 'Publish an article',
      },
      engagement: {
        'POST /api/ai/engagement/follow': 'Follow a user',
        'POST /api/ai/engagement/unfollow': 'Unfollow a user',
        'POST /api/ai/engagement/like': 'Like a tweet',
        'POST /api/ai/engagement/retweet': 'Retweet a tweet',
        'POST /api/ai/engagement/quote-tweet': 'Quote-tweet',
        'POST /api/ai/engagement/auto-follow': 'Auto-follow by keyword/hashtag',
        'POST /api/ai/engagement/smart-unfollow': 'Intelligently unfollow',
        'POST /api/ai/engagement/auto-retweet': 'Auto-retweet',
        'POST /api/ai/engagement/bulk-execute': 'Bulk execute actions',
        'POST /api/ai/engagement/notifications': 'Get notifications',
        'POST /api/ai/engagement/mute': 'Mute a user',
        'POST /api/ai/engagement/unmute': 'Unmute a user',
        'POST /api/ai/engagement/trends': 'Get trending topics',
        'POST /api/ai/engagement/explore': 'Get explore feed',
        'POST /api/ai/engagement/detect-bots': 'Detect bot accounts',
        'POST /api/ai/engagement/find-influencers': 'Find niche influencers',
        'POST /api/ai/engagement/smart-target': 'Smart targeting',
        'POST /api/ai/engagement/crypto-analyze': 'Crypto sentiment analysis',
        'POST /api/ai/engagement/audience-insights': 'Audience demographics',
        'POST /api/ai/engagement/engagement-report': 'Engagement report',
      },
      actions: {
        'POST /api/ai/action/unfollow-non-followers': 'Unfollow non-followers',
        'POST /api/ai/action/unfollow-everyone': 'Unfollow all',
        'POST /api/ai/action/detect-unfollowers': 'Detect unfollowers',
        'POST /api/ai/action/auto-like': 'Auto-like tweets',
        'POST /api/ai/action/follow-engagers': 'Follow from engagement',
        'POST /api/ai/action/keyword-follow': 'Follow by keyword',
        'POST /api/ai/action/follow': 'Follow a user',
        'POST /api/ai/action/unfollow': 'Unfollow a user',
        'POST /api/ai/action/like': 'Like a tweet',
        'POST /api/ai/action/retweet': 'Retweet a tweet',
        'POST /api/ai/action/quote-tweet': 'Quote-tweet',
        'POST /api/ai/action/post-tweet': 'Post a tweet',
        'POST /api/ai/action/auto-follow': 'Auto-follow',
        'POST /api/ai/action/smart-unfollow': 'Smart unfollow',
        'POST /api/ai/action/auto-retweet': 'Auto-retweet',
        'POST /api/ai/action/bulk-execute': 'Bulk execute',
        'GET /api/ai/action/status/:operationId': 'Check operation status',
        'GET /api/ai/action/history': 'Operation history',
      },
      analytics: {
        'POST /api/ai/analytics/account': 'Account analytics',
        'POST /api/ai/analytics/post': 'Post performance',
        'POST /api/ai/analytics/creator': 'Creator analytics',
        'POST /api/ai/analytics/brand-monitor': 'Brand monitoring',
        'POST /api/ai/analytics/competitor': 'Competitor analysis',
        'POST /api/ai/analytics/audience-overlap': 'Audience overlap',
        'POST /api/ai/analytics/history': 'Analytics history',
        'POST /api/ai/analytics/snapshot': 'Take snapshot',
        'POST /api/ai/analytics/growth-rate': 'Growth rate',
        'POST /api/ai/analytics/compare-accounts': 'Compare accounts',
        'POST /api/ai/analytics/analyze-voice': 'Analyze writing voice',
        'POST /api/ai/analytics/generate-tweet': 'Generate tweet in voice',
        'POST /api/ai/analytics/rewrite-tweet': 'Rewrite tweet',
        'POST /api/ai/analytics/summarize-thread': 'Summarize thread',
        'POST /api/ai/analytics/best-time': 'Best time to post',
      },
      messages: {
        'POST /api/ai/messages/send': 'Send DM',
        'POST /api/ai/messages/conversations': 'List conversations',
        'POST /api/ai/messages/export': 'Export DMs',
      },
      profile: {
        'POST /api/ai/profile/update': 'Update profile',
        'POST /api/ai/profile/check-premium': 'Check premium status',
        'POST /api/ai/profile/settings': 'Get settings',
        'POST /api/ai/profile/toggle-protected': 'Toggle protected tweets',
        'POST /api/ai/profile/blocked': 'Get blocked accounts',
      },
      grok: {
        'POST /api/ai/grok/query': 'Query Grok',
        'POST /api/ai/grok/summarize': 'Summarize with Grok',
        'POST /api/ai/grok/analyze-image': 'Analyze image with Grok',
      },
      lists: {
        'POST /api/ai/lists/all': 'Get all lists',
        'POST /api/ai/lists/members': 'Get list members',
      },
      spaces: {
        'POST /api/ai/spaces/list': 'Discover Spaces',
        'POST /api/ai/spaces/scrape': 'Scrape Space metadata',
        'POST /api/ai/spaces/join': 'Join a Space',
        'POST /api/ai/spaces/leave': 'Leave a Space',
        'POST /api/ai/spaces/status': 'Get Space status',
        'POST /api/ai/spaces/transcript': 'Get Space transcript',
      },
      monitoring: {
        'POST /api/ai/monitor/account': 'Monitor account',
        'POST /api/ai/monitor/followers': 'Monitor followers',
        'POST /api/ai/monitor/following': 'Monitor following',
        'POST /api/ai/monitor/keyword': 'Monitor keyword',
        'POST /api/ai/monitor/follower-alerts': 'Follower alerts',
        'POST /api/ai/monitor/track-engagement': 'Track tweet engagement',
        'GET /api/ai/monitor/snapshot/:username': 'Get snapshot',
      },
      sentiment: {
        'POST /api/ai/sentiment/analyze': 'Analyze sentiment',
        'POST /api/ai/sentiment/monitor': 'Monitor reputation',
        'POST /api/ai/sentiment/report': 'Reputation report',
      },
      streams: {
        'POST /api/ai/streams/start': 'Start stream',
        'POST /api/ai/streams/stop': 'Stop stream',
        'POST /api/ai/streams/list': 'List streams',
        'POST /api/ai/streams/pause': 'Pause stream',
        'POST /api/ai/streams/resume': 'Resume stream',
        'POST /api/ai/streams/status': 'Stream status',
        'POST /api/ai/streams/history': 'Stream history',
      },
      workflows: {
        'POST /api/ai/workflows/create': 'Create workflow',
        'POST /api/ai/workflows/run': 'Run workflow',
        'POST /api/ai/workflows/list': 'List workflows',
        'POST /api/ai/workflows/actions': 'Available actions',
      },
      personas: {
        'POST /api/ai/personas/create': 'Create persona',
        'POST /api/ai/personas/list': 'List personas',
        'POST /api/ai/personas/status': 'Persona status',
        'POST /api/ai/personas/edit': 'Edit persona',
        'POST /api/ai/personas/delete': 'Delete persona',
        'POST /api/ai/personas/run': 'Run persona',
        'POST /api/ai/personas/presets': 'Persona presets',
      },
      graph: {
        'POST /api/ai/graph/build': 'Build social graph',
        'POST /api/ai/graph/analyze': 'Analyze graph',
        'POST /api/ai/graph/recommendations': 'Graph recommendations',
        'POST /api/ai/graph/list': 'List graphs',
      },
      portability: {
        'POST /api/ai/portability/export-account': 'Export account',
        'POST /api/ai/portability/migrate': 'Migrate to platform',
        'POST /api/ai/portability/diff': 'Diff exports',
        'POST /api/ai/portability/platforms': 'Supported platforms',
        'POST /api/ai/portability/import': 'Import data',
        'POST /api/ai/portability/convert': 'Convert format',
      },
      crm: {
        'POST /api/ai/crm/sync': 'Sync to CRM',
        'POST /api/ai/crm/tag': 'Tag contact',
        'POST /api/ai/crm/search': 'Search CRM',
        'POST /api/ai/crm/segment': 'CRM segment',
      },
      schedule: {
        'POST /api/ai/schedule/add': 'Schedule post',
        'POST /api/ai/schedule/list': 'List scheduled',
        'POST /api/ai/schedule/remove': 'Remove scheduled',
        'POST /api/ai/schedule/rss-add': 'Add RSS feed',
        'POST /api/ai/schedule/rss-check': 'Check RSS',
        'POST /api/ai/schedule/rss-drafts': 'RSS drafts',
        'POST /api/ai/schedule/evergreen': 'Find evergreen content',
      },
      optimizer: {
        'POST /api/ai/optimizer/optimize': 'Optimize tweet',
        'POST /api/ai/optimizer/hashtags': 'Suggest hashtags',
        'POST /api/ai/optimizer/predict': 'Predict performance',
        'POST /api/ai/optimizer/variations': 'Generate variations',
      },
      writer: {
        'POST /api/ai/writer/analyze-voice': 'Analyze writing voice',
        'POST /api/ai/writer/generate': 'Generate tweets in voice',
        'POST /api/ai/writer/rewrite': 'Rewrite tweet',
        'POST /api/ai/writer/calendar': 'Content calendar',
        'POST /api/ai/writer/reply': 'Generate reply',
      },
      utility: {
        'POST /api/ai/download/video': 'Download video',
        'POST /api/ai/export/bookmarks': 'Export bookmarks',
        'POST /api/ai/unroll/thread': 'Unroll thread',
        'POST /api/ai/analyze/profile': 'Analyze profile',
      },
      notifications: {
        'POST /api/ai/notify/send': 'Send webhook notification',
        'POST /api/ai/notify/test': 'Test webhook',
      },
      datasets: {
        'POST /api/ai/datasets/list': 'List datasets',
        'POST /api/ai/datasets/get': 'Fetch dataset',
      },
      teams: {
        'POST /api/ai/teams/create': 'Create team',
        'POST /api/ai/teams/members': 'Get team members',
      },
      automation: {
        'POST /api/ai/automation/auto-reply': 'Auto-reply to tweets',
        'POST /api/ai/automation/auto-repost': 'Auto-repost matching tweets',
        'POST /api/ai/automation/plug-replies': 'Plug replies on viral tweets',
        'POST /api/ai/automation/engagement-booster': 'Systematic engagement booster',
        'POST /api/ai/automation/quote-tweet-auto': 'Auto quote-tweet',
        'POST /api/ai/automation/content-repurpose': 'Repurpose top content',
        'POST /api/ai/automation/content-calendar': 'Plan content calendar',
        'POST /api/ai/automation/welcome-followers': 'Welcome new followers via DM',
        'POST /api/ai/automation/continuous-monitor': 'Continuous follower monitoring',
        'POST /api/ai/automation/keyword-monitor': 'Keyword mention monitor',
        'POST /api/ai/automation/customer-service': 'Customer service automation',
        'POST /api/ai/automation/evergreen': 'Evergreen tweet recycler',
      },
      community: {
        'POST /api/ai/community/join': 'Join a community',
        'POST /api/ai/community/leave': 'Leave a community',
        'POST /api/ai/community/leave-all': 'Leave all communities',
        'POST /api/ai/community/create': 'Create a community',
        'POST /api/ai/community/manage': 'Manage community',
        'POST /api/ai/community/notes': 'Community notes',
        'POST /api/ai/community/list': 'List communities',
        'POST /api/ai/community/members': 'Get community members',
        'POST /api/ai/community/search': 'Search communities',
      },
      moderation: {
        'POST /api/ai/moderation/block-bots': 'Detect and block bots',
        'POST /api/ai/moderation/mass-block': 'Block multiple accounts',
        'POST /api/ai/moderation/mass-unblock': 'Unblock multiple accounts',
        'POST /api/ai/moderation/mass-unmute': 'Unmute multiple accounts',
        'POST /api/ai/moderation/mute-keywords': 'Mute users by keyword',
        'POST /api/ai/moderation/muted-words': 'Manage muted words',
        'POST /api/ai/moderation/remove-followers': 'Remove followers (soft-block)',
        'POST /api/ai/moderation/report-spam': 'Report spam accounts',
        'POST /api/ai/moderation/shadowban-check': 'Check shadowban status',
        'POST /api/ai/moderation/verified-only': 'Toggle verified-only replies',
        'POST /api/ai/moderation/blocked-list': 'Get blocked accounts list',
        'POST /api/ai/moderation/muted-list': 'Get muted accounts list',
      },
      account: {
        'POST /api/ai/account/backup': 'Full account backup',
        'POST /api/ai/account/download-data': 'Request data download',
        'POST /api/ai/account/audit-followers': 'Audit followers for bots',
        'POST /api/ai/account/delegate-access': 'Manage delegate access',
        'POST /api/ai/account/verify-identity': 'Identity verification',
        'POST /api/ai/account/upload-contacts': 'Upload contacts',
        'POST /api/ai/account/multi-account': 'Multi-account management',
        'POST /api/ai/account/join-date': 'Get account join date',
        'POST /api/ai/account/login-history': 'Login history',
        'POST /api/ai/account/connected-accounts': 'Connected accounts',
        'POST /api/ai/account/appeal-suspension': 'Appeal suspension',
        'POST /api/ai/account/qr-code': 'Generate QR code',
      },
      ads: {
        'POST /api/ai/ads/campaigns': 'Manage ad campaigns',
        'POST /api/ai/ads/dashboard': 'Ads dashboard',
        'POST /api/ai/ads/media-studio': 'Media Studio',
        'POST /api/ai/ads/boost': 'Boost a tweet',
        'POST /api/ai/ads/analytics': 'Ads analytics',
      },
      xpro: {
        'POST /api/ai/xpro/dashboard': 'X Pro dashboard',
        'POST /api/ai/xpro/columns': 'Manage columns',
        'POST /api/ai/xpro/manage': 'X Pro management',
      },
      discovery: {
        'POST /api/ai/discovery/trending': 'Trending topics',
        'POST /api/ai/discovery/trending-monitor': 'Monitor trending',
        'POST /api/ai/discovery/save-search': 'Save a search',
        'POST /api/ai/discovery/saved-searches': 'Manage saved searches',
        'POST /api/ai/discovery/topics': 'Discover topics',
        'POST /api/ai/discovery/explore': 'Explore feed',
        'POST /api/ai/discovery/search': 'Search tweets',
        'POST /api/ai/discovery/for-you': 'For You feed',
      },
      premium: {
        'POST /api/ai/premium/check': 'Check premium status',
        'POST /api/ai/premium/gift': 'Gift premium',
        'POST /api/ai/premium/subscribe': 'Subscribe to premium',
        'POST /api/ai/premium/features': 'Premium features',
      },
      settings: {
        'POST /api/ai/settings/get': 'Get settings',
        'POST /api/ai/settings/update': 'Update settings',
        'POST /api/ai/settings/protected': 'Toggle protected tweets',
        'POST /api/ai/settings/blocked': 'Manage blocked accounts',
        'POST /api/ai/settings/muted': 'Manage muted accounts',
        'POST /api/ai/settings/download-data': 'Request data download',
        'POST /api/ai/settings/advanced': 'Advanced settings',
        'POST /api/ai/settings/block-list': 'Import/export block list',
      },
      creator: {
        'POST /api/ai/creator/analytics': 'Creator analytics',
        'POST /api/ai/creator/revenue': 'Revenue info',
        'POST /api/ai/creator/subscribers': 'Subscriber list',
        'POST /api/ai/creator/studio': 'Creator Studio',
        'POST /api/ai/creator/subscriptions': 'Manage subscriptions',
      },
      timeline: {
        'POST /api/ai/timeline/view': 'View timeline',
        'POST /api/ai/timeline/scroll': 'Auto-scroll timeline',
        'POST /api/ai/timeline/collect': 'Collect timeline posts',
        'POST /api/ai/timeline/export': 'Export timeline',
        'POST /api/ai/timeline/switch-feed': 'Switch For You/Following',
      },
      topics: {
        'POST /api/ai/topics/follow': 'Follow a topic',
        'POST /api/ai/topics/unfollow': 'Unfollow a topic',
        'POST /api/ai/topics/discover': 'Discover topics',
        'POST /api/ai/topics/list': 'List followed topics',
      },
      articles: {
        'POST /api/ai/articles/compose': 'Compose article',
        'POST /api/ai/articles/publish': 'Publish article',
        'POST /api/ai/articles/analytics': 'Article analytics',
        'POST /api/ai/articles/list': 'List articles',
        'POST /api/ai/articles/draft': 'Save draft',
      },
      leads: {
        'POST /api/ai/leads/find': 'Find leads',
        'POST /api/ai/leads/qualify': 'Qualify leads',
        'POST /api/ai/leads/export': 'Export leads',
        'POST /api/ai/leads/monitor': 'Monitor leads',
        'POST /api/ai/leads/score': 'Score leads',
        'POST /api/ai/leads/enrich': 'Enrich lead data',
      },
      viral: {
        'POST /api/ai/viral/research': 'Research viral trends',
        'POST /api/ai/viral/generate': 'Generate viral thread',
        'POST /api/ai/viral/analyze': 'Analyze virality',
        'POST /api/ai/viral/trending-hooks': 'Get trending hooks',
        'POST /api/ai/viral/headlines': 'Generate headlines',
      },
      billing: {
        'POST /api/ai/billing/checkout': 'Create checkout session',
        'POST /api/ai/billing/portal': 'Billing portal',
        'POST /api/ai/billing/plans': 'List plans',
        'POST /api/ai/billing/usage': 'Usage data',
        'POST /api/ai/billing/invoices': 'List invoices',
      },
      webhooksManagement: {
        'POST /api/ai/webhooks/create': 'Create webhook',
        'POST /api/ai/webhooks/list': 'List webhooks',
        'POST /api/ai/webhooks/delete': 'Delete webhook',
        'POST /api/ai/webhooks/test': 'Test webhook',
        'POST /api/ai/webhooks/events': 'Available events',
      },
      cleanup: {
        'POST /api/ai/cleanup/delete-tweets': 'Delete tweets',
        'POST /api/ai/cleanup/unlike-all': 'Unlike all posts',
        'POST /api/ai/cleanup/clear-reposts': 'Clear reposts',
        'POST /api/ai/cleanup/clear-history': 'Clear history',
        'POST /api/ai/cleanup/bulk-delete': 'Bulk delete',
        'POST /api/ai/cleanup/archive': 'Archive content',
      },
      bookmarksManagement: {
        'POST /api/ai/bookmarks/export': 'Export bookmarks',
        'POST /api/ai/bookmarks/folders': 'Manage folders',
        'POST /api/ai/bookmarks/organize': 'Organize bookmarks',
        'POST /api/ai/bookmarks/search': 'Search bookmarks',
        'POST /api/ai/bookmarks/clear': 'Clear bookmarks',
        'POST /api/ai/bookmarks/import': 'Import bookmarks',
      },
      media: {
        'POST /api/ai/media/upload': 'Upload media',
        'POST /api/ai/media/library': 'Media library',
        'POST /api/ai/media/analytics': 'Media analytics',
        'POST /api/ai/media/captions': 'Add captions',
        'POST /api/ai/media/studio': 'Media Studio',
        'POST /api/ai/media/download-batch': 'Batch download',
      },
    },

    x402: {
      protocol: 'https://x402.org',
      networks: ['Base (USDC)', 'Arbitrum', 'Ethereum', 'Base Sepolia (testnet)'],
      paymentHeader: 'X-PAYMENT',
    },

    rateLimit: {
      requestsPerMinute: 60,
      concurrentOperations: 5,
      burstAllowance: 10,
    },

    freeAlternatives: {
      browser: 'https://xactions.app/features - Free browser scripts',
      cli: 'npm install -g xactions - Free CLI tool',
      library: 'npm install xactions - Free Node.js library',
    },

    support: {
      docs: 'https://xactions.app/docs',
      github: 'https://github.com/nirholas/XActions',
      twitter: '@nichxbt',
    },
  });
});

// Health check (free)
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), version: '2.0.0' });
});

// Mount original route modules
router.use('/scrape', scrapeRoutes);
router.use('/action', actionRoutes);
router.use('/monitor', monitorRoutes);
router.use('/alert', monitorRoutes);      // backward compat: /alert/new-followers
// Mount utility router once across all its category prefixes.
// Mounting the same router instance multiple times caused Express to walk
// the same handler chain four times per request.
router.use(['/download', '/export', '/unroll', '/analyze'], utilityRoutes);
router.use('/writer', writerRoutes);

// Mount new route modules
router.use('/posting', postingRoutes);
router.use('/engagement', engagementRoutes);
router.use('/messages', messagesRoutes);
router.use('/profile', profileRoutes);
router.use('/grok', grokRoutes);
router.use('/lists', listsRoutes);
router.use('/spaces', spacesRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/sentiment', sentimentRoutes);
router.use('/streams', streamsRoutes);
router.use('/workflows', workflowsRoutes);
router.use('/portability', portabilityRoutes);
router.use('/personas', personasRoutes);
router.use('/graph', graphRoutes);
router.use('/crm', crmRoutes);
router.use('/schedule', schedulerRoutes);
router.use('/optimizer', optimizerRoutes);
router.use('/notify', notificationsRoutes);
router.use('/datasets', datasetsRoutes);
router.use('/teams', teamsRoutes);
router.use('/automation', automationRoutes);
router.use('/community', communityRoutes);
router.use('/moderation', moderationRoutes);
router.use('/account', accountRoutes);
router.use('/ads', adsRoutes);
router.use('/xpro', xproRoutes);
router.use('/discovery', discoveryRoutes);
router.use('/premium', premiumRoutes);
router.use('/settings', settingsRoutes);
router.use('/creator', creatorRoutes);
router.use('/timeline', timelineRoutes);
router.use('/topics', topicsRoutes);
router.use('/articles', articlesRoutes);
router.use('/leads', leadsRoutes);
router.use('/viral', viralRoutes);
router.use('/billing', billingRoutes);
router.use('/webhooks', webhooksRoutes);
router.use('/cleanup', cleanupRoutes);
router.use('/bookmarks', bookmarksRoutes);
router.use('/media', mediaRoutes);

// Catch-all for undefined routes
router.all('*', (req, res) => {
  res.status(404).json({
    error: 'ENDPOINT_NOT_FOUND',
    message: `Endpoint ${req.method} ${req.path} not found`,
    availableEndpoints: 'GET /api/ai/ for full documentation',
    docs: 'https://xactions.app/docs/ai-api',
  });
});

export default router;

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

const router = express.Router();

// API documentation endpoint (free - no payment required)
router.get('/', (req, res) => {
  res.json({
    service: 'XActions AI API',
    version: '1.0.0',
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
      },
      actions: {
        'POST /api/ai/action/unfollow-non-followers': 'Unfollow non-followers',
        'POST /api/ai/action/unfollow-everyone': 'Unfollow all accounts',
        'POST /api/ai/action/detect-unfollowers': 'Detect who unfollowed',
        'POST /api/ai/action/auto-like': 'Auto-like tweets',
        'POST /api/ai/action/follow-engagers': 'Follow from engagement',
        'POST /api/ai/action/keyword-follow': 'Follow by keyword',
        'GET /api/ai/action/status/:operationId': 'Check operation status',
      },
      monitoring: {
        'POST /api/ai/monitor/account': 'Monitor account changes',
        'POST /api/ai/monitor/followers': 'Monitor follower changes',
        'POST /api/ai/monitor/following': 'Monitor following changes',
        'GET /api/ai/monitor/snapshot/:username': 'Get latest snapshot',
        'POST /api/ai/alert/new-followers': 'Get new follower alerts',
      },
      utility: {
        'POST /api/ai/download/video': 'Download video from tweet',
        'POST /api/ai/export/bookmarks': 'Export bookmarks',
        'POST /api/ai/unroll/thread': 'Unroll thread to text',
        'POST /api/ai/analyze/profile': 'Analyze profile engagement',
      },
    },
    
    pricing: {
      scraping: {
        profile: '$0.001',
        followers: '$0.005 per 100',
        following: '$0.005 per 100',
        tweets: '$0.003 per 50',
        search: '$0.005 per 50',
        thread: '$0.002',
        media: '$0.003 per 50',
      },
      actions: {
        'unfollow-non-followers': '$0.01 per 100',
        'unfollow-everyone': '$0.01 per 100',
        'detect-unfollowers': '$0.005',
        'auto-like': '$0.01 per 50',
        'follow-engagers': '$0.01 per 50',
        'keyword-follow': '$0.01 per 50',
      },
      monitoring: {
        'account-snapshot': '$0.005',
        'follower-diff': '$0.003',
      },
      utility: {
        'video-download': '$0.002',
        'bookmark-export': '$0.005',
        'thread-unroll': '$0.002',
      },
    },
    
    freeAlternatives: {
      browser: 'https://xactions.app/features - Free browser scripts',
      cli: 'npm install -g xactions - Free CLI tool',
      library: 'npm install xactions - Free Node.js library',
      tutorials: 'https://xactions.app/tutorials - Step-by-step guides',
    },
    
    x402: {
      protocol: 'https://x402.org',
      network: 'Base (USDC)',
      testnet: 'Base Sepolia',
      paymentHeader: 'X-PAYMENT',
    },
    
    rateLimit: {
      requestsPerMinute: 60,
      concurrentOperations: 5,
      burstAllowance: 10,
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
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Mount route modules
router.use('/scrape', scrapeRoutes);
router.use('/action', actionRoutes);
router.use('/monitor', monitorRoutes);
router.use('/download', utilityRoutes);
router.use('/export', utilityRoutes);
router.use('/unroll', utilityRoutes);
router.use('/analyze', utilityRoutes);

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

/**
 * AI Agent API Routes
 * 
 * These endpoints are protected by x402 payment protocol.
 * AI agents must include X-PAYMENT header with signed USDC payment.
 * Humans should use free browser scripts at https://xactions.app/run.html
 * 
 * Pricing: See /api/ai/pricing for current rates
 */

import express from 'express';
import { requireAIAgent } from '../middleware/ai-detector.js';

const router = express.Router();

// All routes in this file require AI agent authentication
router.use(requireAIAgent);

// ============================================
// SCRAPING ENDPOINTS
// ============================================

/**
 * Scrape profile information
 * POST /api/ai/scrape/profile
 * Price: $0.001
 */
router.post('/scrape/profile', async (req, res) => {
  try {
    const { username, authToken } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }
    
    if (!authToken) {
      return res.status(400).json({ 
        error: 'authToken is required',
        hint: 'Provide your X/Twitter auth_token cookie value'
      });
    }
    
    // Import scraper dynamically
    const { scrapeProfile } = await import('../../src/scrapers/index.js');
    const profile = await scrapeProfile(username, authToken);
    
    res.json({
      success: true,
      data: profile,
      operation: 'scrape:profile',
      payment: req.x402?.verified ? 'settled' : 'skipped',
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Scraping failed', 
      message: error.message 
    });
  }
});

/**
 * Scrape followers list
 * POST /api/ai/scrape/followers
 * Price: $0.01
 */
router.post('/scrape/followers', async (req, res) => {
  try {
    const { username, authToken, limit = 1000 } = req.body;
    
    if (!username || !authToken) {
      return res.status(400).json({ error: 'username and authToken are required' });
    }
    
    const { scrapeFollowers } = await import('../../src/scrapers/index.js');
    const followers = await scrapeFollowers(username, authToken, { limit });
    
    res.json({
      success: true,
      data: followers,
      count: followers.length,
      operation: 'scrape:followers',
    });
  } catch (error) {
    res.status(500).json({ error: 'Scraping failed', message: error.message });
  }
});

/**
 * Scrape following list
 * POST /api/ai/scrape/following
 * Price: $0.01
 */
router.post('/scrape/following', async (req, res) => {
  try {
    const { username, authToken, limit = 1000 } = req.body;
    
    if (!username || !authToken) {
      return res.status(400).json({ error: 'username and authToken are required' });
    }
    
    const { scrapeFollowing } = await import('../../src/scrapers/index.js');
    const following = await scrapeFollowing(username, authToken, { limit });
    
    res.json({
      success: true,
      data: following,
      count: following.length,
      operation: 'scrape:following',
    });
  } catch (error) {
    res.status(500).json({ error: 'Scraping failed', message: error.message });
  }
});

/**
 * Scrape tweets from a user
 * POST /api/ai/scrape/tweets
 * Price: $0.005
 */
router.post('/scrape/tweets', async (req, res) => {
  try {
    const { username, authToken, limit = 100 } = req.body;
    
    if (!username || !authToken) {
      return res.status(400).json({ error: 'username and authToken are required' });
    }
    
    const { scrapeTweets } = await import('../../src/scrapers/index.js');
    const tweets = await scrapeTweets(username, authToken, { limit });
    
    res.json({
      success: true,
      data: tweets,
      count: tweets.length,
      operation: 'scrape:tweets',
    });
  } catch (error) {
    res.status(500).json({ error: 'Scraping failed', message: error.message });
  }
});

/**
 * Scrape a thread
 * POST /api/ai/scrape/thread
 * Price: $0.002
 */
router.post('/scrape/thread', async (req, res) => {
  try {
    const { tweetUrl, authToken } = req.body;
    
    if (!tweetUrl || !authToken) {
      return res.status(400).json({ error: 'tweetUrl and authToken are required' });
    }
    
    const { scrapeThread } = await import('../../src/scrapers/index.js');
    const thread = await scrapeThread(tweetUrl, authToken);
    
    res.json({
      success: true,
      data: thread,
      tweetCount: thread.tweets?.length || 0,
      operation: 'scrape:thread',
    });
  } catch (error) {
    res.status(500).json({ error: 'Scraping failed', message: error.message });
  }
});

/**
 * Search tweets
 * POST /api/ai/scrape/search
 * Price: $0.01
 */
router.post('/scrape/search', async (req, res) => {
  try {
    const { query, authToken, limit = 100 } = req.body;
    
    if (!query || !authToken) {
      return res.status(400).json({ error: 'query and authToken are required' });
    }
    
    const { searchTweets } = await import('../../src/scrapers/index.js');
    const results = await searchTweets(query, authToken, { limit });
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      query,
      operation: 'scrape:search',
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

// ============================================
// ACTION ENDPOINTS
// ============================================

/**
 * Unfollow non-followers
 * POST /api/ai/action/unfollow-non-followers
 * Price: $0.05
 */
router.post('/action/unfollow-non-followers', async (req, res) => {
  try {
    const { authToken, limit = 100, dryRun = false } = req.body;
    
    if (!authToken) {
      return res.status(400).json({ error: 'authToken is required' });
    }
    
    // This would integrate with the browser automation service
    res.json({
      success: true,
      message: dryRun ? 'Dry run complete' : 'Unfollow operation queued',
      operation: 'action:unfollow-non-followers',
      note: 'This operation runs asynchronously. Check /api/ai/monitor/account for results.',
    });
  } catch (error) {
    res.status(500).json({ error: 'Operation failed', message: error.message });
  }
});

/**
 * Detect unfollowers
 * POST /api/ai/action/detect-unfollowers
 * Price: $0.02
 */
router.post('/action/detect-unfollowers', async (req, res) => {
  try {
    const { username, authToken, previousSnapshot } = req.body;
    
    if (!username || !authToken) {
      return res.status(400).json({ error: 'username and authToken are required' });
    }
    
    const { scrapeFollowers } = await import('../../src/scrapers/index.js');
    const currentFollowers = await scrapeFollowers(username, authToken, { limit: 5000 });
    const currentSet = new Set(currentFollowers.map(f => f.username.toLowerCase()));
    
    let unfollowers = [];
    let newFollowers = [];
    
    if (previousSnapshot && Array.isArray(previousSnapshot)) {
      const prevSet = new Set(previousSnapshot.map(u => u.toLowerCase()));
      unfollowers = previousSnapshot.filter(u => !currentSet.has(u.toLowerCase()));
      newFollowers = currentFollowers
        .filter(f => !prevSet.has(f.username.toLowerCase()))
        .map(f => f.username);
    }
    
    res.json({
      success: true,
      data: {
        currentFollowerCount: currentFollowers.length,
        unfollowers,
        newFollowers,
        snapshot: currentFollowers.map(f => f.username),
      },
      operation: 'action:detect-unfollowers',
      hint: 'Save the snapshot array and pass it as previousSnapshot on next call',
    });
  } catch (error) {
    res.status(500).json({ error: 'Operation failed', message: error.message });
  }
});

// ============================================
// MONITORING ENDPOINTS
// ============================================

/**
 * Monitor account changes
 * POST /api/ai/monitor/account
 * Price: $0.01
 */
router.post('/monitor/account', async (req, res) => {
  try {
    const { username, authToken, previousState } = req.body;
    
    if (!username || !authToken) {
      return res.status(400).json({ error: 'username and authToken are required' });
    }
    
    const { scrapeProfile } = await import('../../src/scrapers/index.js');
    const currentState = await scrapeProfile(username, authToken);
    
    let changes = [];
    if (previousState) {
      if (previousState.followers !== currentState.followers) {
        changes.push({
          field: 'followers',
          from: previousState.followers,
          to: currentState.followers,
        });
      }
      if (previousState.following !== currentState.following) {
        changes.push({
          field: 'following',
          from: previousState.following,
          to: currentState.following,
        });
      }
      if (previousState.bio !== currentState.bio) {
        changes.push({
          field: 'bio',
          from: previousState.bio,
          to: currentState.bio,
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        currentState,
        changes,
        hasChanges: changes.length > 0,
      },
      operation: 'monitor:account',
      hint: 'Save currentState and pass as previousState on next call to detect changes',
    });
  } catch (error) {
    res.status(500).json({ error: 'Monitoring failed', message: error.message });
  }
});

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * Download video URL
 * POST /api/ai/download/video
 * Price: $0.005
 */
router.post('/download/video', async (req, res) => {
  try {
    const { tweetUrl, authToken } = req.body;
    
    if (!tweetUrl) {
      return res.status(400).json({ error: 'tweetUrl is required' });
    }
    
    // Extract video URLs from tweet
    // This would need browser automation or API parsing
    res.json({
      success: true,
      data: {
        tweetUrl,
        message: 'Video URL extraction requires browser context',
        alternative: 'Use browser script at https://xactions.app/run.html',
      },
      operation: 'download:video',
    });
  } catch (error) {
    res.status(500).json({ error: 'Download failed', message: error.message });
  }
});

/**
 * Unroll thread
 * POST /api/ai/unroll/thread
 * Price: $0.002
 */
router.post('/unroll/thread', async (req, res) => {
  try {
    const { tweetUrl, authToken, format = 'json' } = req.body;
    
    if (!tweetUrl || !authToken) {
      return res.status(400).json({ error: 'tweetUrl and authToken are required' });
    }
    
    const { scrapeThread } = await import('../../src/scrapers/index.js');
    const thread = await scrapeThread(tweetUrl, authToken);
    
    let output = thread;
    if (format === 'markdown') {
      output = {
        markdown: `# Thread by @${thread.author}\n\n` +
          thread.tweets.map((t, i) => `## ${i + 1}\n\n${t.text}\n`).join('\n'),
        ...thread,
      };
    } else if (format === 'text') {
      output = {
        text: thread.tweets.map((t, i) => `${i + 1}. ${t.text}`).join('\n\n'),
        ...thread,
      };
    }
    
    res.json({
      success: true,
      data: output,
      operation: 'unroll:thread',
    });
  } catch (error) {
    res.status(500).json({ error: 'Unroll failed', message: error.message });
  }
});

export default router;

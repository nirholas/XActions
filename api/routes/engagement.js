import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { queueJob } from '../services/jobQueue.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Like a tweet
router.post('/like/:tweetId', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    const { tweetId } = req.params;
    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'likeTweet',
        status: 'pending',
        config: JSON.stringify({ tweetId }),
      },
    });

    await queueJob({
      type: 'likeTweet',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { tweetId, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Like queued' });
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'Failed to like tweet' });
  }
});

// Unlike a tweet
router.delete('/like/:tweetId', async (req, res) => {
  try {
    const { tweetId } = req.params;
    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'unlikeTweet',
        status: 'pending',
        config: JSON.stringify({ tweetId }),
      },
    });

    await queueJob({
      type: 'unlikeTweet',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { tweetId, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Unlike queued' });
  } catch (error) {
    console.error('Unlike error:', error);
    res.status(500).json({ error: 'Failed to unlike tweet' });
  }
});

// Reply to a tweet
router.post('/reply/:tweetId', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    const { tweetId } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Reply text is required' });

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'replyToTweet',
        status: 'pending',
        config: JSON.stringify({ tweetId, text }),
      },
    });

    await queueJob({
      type: 'replyToTweet',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { tweetId, text, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Reply queued' });
  } catch (error) {
    console.error('Reply error:', error);
    res.status(500).json({ error: 'Failed to reply' });
  }
});

// Bookmark a tweet
router.post('/bookmark/:tweetId', async (req, res) => {
  try {
    const { tweetId } = req.params;
    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'bookmarkTweet',
        status: 'pending',
        config: JSON.stringify({ tweetId }),
      },
    });

    await queueJob({
      type: 'bookmarkTweet',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { tweetId, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Bookmark queued' });
  } catch (error) {
    console.error('Bookmark error:', error);
    res.status(500).json({ error: 'Failed to bookmark' });
  }
});

// Auto-like by keyword
router.post('/auto-like', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    const { keywords, maxLikes = 20, delay = 2000 } = req.body;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'Keywords array is required' });
    }

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'autoLike',
        status: 'pending',
        config: JSON.stringify({ keywords, maxLikes, delay }),
      },
    });

    await queueJob({
      type: 'autoLike',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { keywords, maxLikes, delay, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Auto-like queued' });
  } catch (error) {
    console.error('Auto-like error:', error);
    res.status(500).json({ error: 'Failed to start auto-like' });
  }
});

// Get engagement analytics
router.get('/analytics', async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'engagementAnalytics',
        status: 'pending',
        config: JSON.stringify({ period }),
      },
    });

    await queueJob({
      type: 'engagementAnalytics',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { period, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Analytics fetch queued' });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router;

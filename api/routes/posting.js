import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../middleware/auth.js';
import { queueJob } from '../services/jobQueue.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authMiddleware);

// Post a tweet
router.post('/tweet', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    const { text, replyTo, quoteTweetId } = req.body;
    if (!text) return res.status(400).json({ error: 'Tweet text is required' });
    if (text.length > 25000) return res.status(400).json({ error: 'Tweet exceeds max length' });

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'postTweet',
        status: 'pending',
        config: JSON.stringify({ text, replyTo, quoteTweetId }),
      },
    });

    await queueJob({
      type: 'postTweet',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { text, replyTo, quoteTweetId, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Tweet queued' });
  } catch (error) {
    console.error('Post tweet error:', error);
    res.status(500).json({ error: 'Failed to post tweet' });
  }
});

// Post a thread
router.post('/thread', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    const { tweets } = req.body;
    if (!tweets || !Array.isArray(tweets) || tweets.length < 2) {
      return res.status(400).json({ error: 'Thread requires at least 2 tweets' });
    }

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'postThread',
        status: 'pending',
        config: JSON.stringify({ tweets }),
      },
    });

    await queueJob({
      type: 'postThread',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { tweets, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Thread queued' });
  } catch (error) {
    console.error('Post thread error:', error);
    res.status(500).json({ error: 'Failed to post thread' });
  }
});

// Create a poll
router.post('/poll', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    const { question, options, durationMinutes = 1440 } = req.body;
    if (!question) return res.status(400).json({ error: 'Poll question is required' });
    if (!options || options.length < 2 || options.length > 4) {
      return res.status(400).json({ error: 'Poll requires 2-4 options' });
    }

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'createPoll',
        status: 'pending',
        config: JSON.stringify({ question, options, durationMinutes }),
      },
    });

    await queueJob({
      type: 'createPoll',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { question, options, durationMinutes, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Poll queued' });
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// Schedule a post
router.post('/schedule', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    const { text, scheduledAt } = req.body;
    if (!text) return res.status(400).json({ error: 'Tweet text is required' });
    if (!scheduledAt) return res.status(400).json({ error: 'Schedule time is required' });

    const scheduleDate = new Date(scheduledAt);
    if (scheduleDate <= new Date()) {
      return res.status(400).json({ error: 'Schedule time must be in the future' });
    }

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'schedulePost',
        status: 'pending',
        config: JSON.stringify({ text, scheduledAt }),
      },
    });

    await queueJob({
      type: 'schedulePost',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { text, scheduledAt, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Scheduled post queued' });
  } catch (error) {
    console.error('Schedule post error:', error);
    res.status(500).json({ error: 'Failed to schedule post' });
  }
});

// Delete a tweet
router.delete('/tweet/:tweetId', async (req, res) => {
  try {
    if (!req.user.twitterAccessToken && !req.user.sessionCookie) {
      return res.status(400).json({ error: 'Twitter account not connected' });
    }

    const { tweetId } = req.params;

    const operation = await prisma.operation.create({
      data: {
        userId: req.user.id,
        type: 'deleteTweet',
        status: 'pending',
        config: JSON.stringify({ tweetId }),
      },
    });

    await queueJob({
      type: 'deleteTweet',
      operationId: operation.id,
      userId: req.user.id,
      authMethod: req.user.authMethod || 'oauth',
      config: { tweetId, sessionCookie: req.user.sessionCookie },
    });

    res.json({ operationId: operation.id, status: 'queued', message: 'Delete queued' });
  } catch (error) {
    console.error('Delete tweet error:', error);
    res.status(500).json({ error: 'Failed to delete tweet' });
  }
});

export default router;

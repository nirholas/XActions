/**
 * XActions Thread Reader API Routes
 * 
 * POST /api/thread/unroll   — Extract/unroll a Twitter thread from URL
 * POST /api/thread/summarize — Summarize a thread with AI
 * GET  /api/thread/:tweetId  — Get a cached unrolled thread by tweet ID
 * 
 * @author nichxbt
 * @license MIT
 */

import express from 'express';
import { extractThread, getCachedThread, parseTweetUrl, formatAsText, formatAsMarkdown } from '../services/threadExtractor.js';
import { summarizeThread, calculateReadingTime } from '../services/threadSummarizer.js';

const router = express.Router();

// ============================================================================
// POST /api/thread/unroll
// ============================================================================

/**
 * Unroll a Twitter/X thread
 * Body: { url: "https://x.com/user/status/123", cookie?: "auth_token" }
 * Response: { author, tweets, threadLength, sourceUrl, extractedAt }
 */
router.post('/unroll', async (req, res) => {
  try {
    const { url, cookie } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Missing required field: url',
        example: 'https://x.com/user/status/1234567890',
      });
    }

    const parsed = parseTweetUrl(url);
    if (!parsed) {
      return res.status(400).json({
        error: 'Invalid tweet URL',
        expected: 'https://x.com/username/status/1234567890 or https://twitter.com/username/status/1234567890',
      });
    }

    const thread = await extractThread(url, { cookie, timeout: 30000 });

    return res.json(thread);
  } catch (error) {
    console.error('Thread unroll error:', error.message);
    return res.status(500).json({
      error: 'Failed to unroll thread',
      message: error.message,
    });
  }
});

// ============================================================================
// POST /api/thread/summarize
// ============================================================================

/**
 * Summarize a thread using AI
 * Body: { tweets: [{ text }] } or { url: "https://x.com/..." }
 * Response: { summary, keyPoints, readingTime }
 */
router.post('/summarize', async (req, res) => {
  try {
    const { tweets, url } = req.body;

    let tweetData = tweets;
    let author = null;

    // If URL provided instead of tweets, extract thread first
    if (!tweetData && url) {
      const parsed = parseTweetUrl(url);
      if (!parsed) {
        return res.status(400).json({ error: 'Invalid tweet URL' });
      }

      const thread = await extractThread(url);
      tweetData = thread.tweets;
      author = thread.author?.username;
    }

    if (!tweetData || !Array.isArray(tweetData) || tweetData.length === 0) {
      return res.status(400).json({
        error: 'Either "tweets" (array of { text }) or "url" (tweet URL) is required',
      });
    }

    const result = await summarizeThread({
      tweets: tweetData,
      author,
    });

    return res.json(result);
  } catch (error) {
    console.error('Thread summarize error:', error.message);
    return res.status(500).json({
      error: 'Failed to summarize thread',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/thread/:tweetId
// ============================================================================

/**
 * Get a cached/unrolled thread by tweet ID
 * Used for shareable/SEO URLs
 */
router.get('/:tweetId', async (req, res) => {
  try {
    const { tweetId } = req.params;

    if (!/^\d+$/.test(tweetId)) {
      return res.status(400).json({ error: 'Invalid tweet ID' });
    }

    // Check cache first
    const cached = getCachedThread(tweetId);
    if (cached) {
      return res.json(cached);
    }

    // Try to extract it
    const url = `https://x.com/i/status/${tweetId}`;
    try {
      const thread = await extractThread(url);
      return res.json(thread);
    } catch (extractError) {
      return res.status(404).json({
        error: 'Thread not found or unable to extract',
        message: extractError.message,
      });
    }
  } catch (error) {
    console.error('Thread get error:', error.message);
    return res.status(500).json({
      error: 'Failed to get thread',
      message: error.message,
    });
  }
});

// ============================================================================
// GET /api/thread/:tweetId/text
// ============================================================================

/**
 * Get thread as plain text
 */
router.get('/:tweetId/text', async (req, res) => {
  try {
    const { tweetId } = req.params;

    if (!/^\d+$/.test(tweetId)) {
      return res.status(400).json({ error: 'Invalid tweet ID' });
    }

    const cached = getCachedThread(tweetId);
    if (!cached) {
      return res.status(404).json({ error: 'Thread not cached. Unroll it first via POST /api/thread/unroll' });
    }

    const text = formatAsText(cached);
    res.type('text/plain').send(text);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// GET /api/thread/:tweetId/markdown
// ============================================================================

/**
 * Get thread as markdown
 */
router.get('/:tweetId/markdown', async (req, res) => {
  try {
    const { tweetId } = req.params;

    if (!/^\d+$/.test(tweetId)) {
      return res.status(400).json({ error: 'Invalid tweet ID' });
    }

    const cached = getCachedThread(tweetId);
    if (!cached) {
      return res.status(404).json({ error: 'Thread not cached. Unroll it first via POST /api/thread/unroll' });
    }

    const md = formatAsMarkdown(cached);
    res.type('text/markdown').send(md);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

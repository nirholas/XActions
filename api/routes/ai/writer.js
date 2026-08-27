// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * AI Tweet Writer API Routes
 * 
 * Voice analysis + AI-powered tweet generation.
 * The moat: scrape → analyze voice → generate in user's style.
 * 
 * POST /api/ai/writer/analyze-voice — analyze a user's writing voice
 * POST /api/ai/writer/generate — generate tweets in a voice
 * POST /api/ai/writer/rewrite — improve an existing tweet
 * POST /api/ai/writer/calendar — generate weekly content calendar
 * POST /api/ai/writer/reply — generate a reply to a tweet
 * POST /api/ai/writer/comment — generate a reply from a brief, no voice profile needed
 * GET  /api/ai/writer/voice-profiles — list saved voice profiles
 * 
 * Rate limit: 10 generations/minute for free tier.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const router = express.Router();

/**
 * This route family authenticates callers by raw X auth token, not a
 * platform JWT — there is no req.user. The hash of that token is the only
 * available tenant boundary, so every voice profile read/write below is
 * scoped by it to prevent one caller from listing or reusing another
 * caller's saved voice profile.
 */
const ownerHashOf = (authToken) => crypto.createHash('sha256').update(authToken).digest('hex');

// ============================================================================
// Rate Limiting — 10 generations/minute
// ============================================================================

const generationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Maximum 10 AI generations per minute. Please wait.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// In-memory voice profile store (replace with DB in production)
// ============================================================================

const voiceProfiles = new Map();

// ============================================================================
// Routes
// ============================================================================

/**
 * Analyze a user's writing voice
 * POST /api/ai/writer/analyze-voice
 * 
 * Body: { username, authToken, tweetLimit? }
 * Returns: VoiceProfile object
 */
router.post('/analyze-voice', generationLimiter, async (req, res) => {
  try {
    const { username, authToken, tweetLimit = 200 } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }

    if (!authToken) {
      return res.status(400).json({
        error: 'authToken is required',
        hint: 'Provide your X/Twitter auth_token cookie value to scrape tweets',
      });
    }

    // Step 1: Scrape tweets
    const { scrapeTweets } = await import('../../src/scrapers/index.js');
    const tweets = await scrapeTweets(username, authToken, { limit: tweetLimit });

    if (!tweets || tweets.length === 0) {
      return res.status(404).json({
        error: 'No tweets found',
        message: `Could not scrape tweets for @${username}. The account may be private or have no tweets.`,
      });
    }

    // Step 2: Analyze voice
    const { analyzeVoice, summarizeVoiceProfile } = await import('../../src/ai/voiceAnalyzer.js');
    const profile = analyzeVoice(username, tweets);
    const summary = summarizeVoiceProfile(profile);

    // Step 3: Save profile, scoped to the caller's own auth token
    voiceProfiles.set(`${ownerHashOf(authToken)}:${username.toLowerCase().replace(/^@/, '')}`, {
      profile,
      savedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      data: {
        profile,
        summary,
      },
      operation: 'ai:analyze-voice',
      tweetsScraped: tweets.length,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Voice analysis failed',
      message: error.message,
    });
  }
});

/**
 * Generate tweets in a user's voice
 * POST /api/ai/writer/generate
 * 
 * Body: { username, topic, style?, count?, type?, threadLength?, model?, apiKey? }
 * type: 'tweet' | 'thread'
 */
router.post('/generate', generationLimiter, async (req, res) => {
  try {
    const {
      username, topic, style, count = 3,
      type = 'tweet', threadLength = 5,
      model, apiKey, authToken,
      // Allow passing a voice profile directly
      voiceProfile: directProfile,
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'topic is required' });
    }

    // Resolve voice profile
    let voiceProfile = directProfile;
    if (!voiceProfile && username) {
      if (!authToken) {
        return res.status(400).json({
          error: 'authToken is required',
          hint: 'Provide the authToken used when analyzing this username to load its saved voice profile',
        });
      }
      const saved = voiceProfiles.get(`${ownerHashOf(authToken)}:${username.toLowerCase().replace(/^@/, '')}`);
      if (saved) {
        voiceProfile = saved.profile;
      }
    }

    if (!voiceProfile) {
      return res.status(400).json({
        error: 'Voice profile required',
        message: 'Either pass voiceProfile directly or analyze a username first via POST /api/ai/writer/analyze-voice',
        hint: `No saved profile found${username ? ` for @${username}` : ''}`,
      });
    }

    const { generateTweet, generateThread } = await import('../../src/ai/tweetGenerator.js');

    let result;
    if (type === 'thread') {
      result = await generateThread(voiceProfile, { topic, length: threadLength, model, apiKey });
      res.json({
        success: true,
        data: result,
        operation: 'ai:generate-thread',
      });
    } else {
      result = await generateTweet(voiceProfile, { topic, style, count, model, apiKey });
      res.json({
        success: true,
        data: result,
        operation: 'ai:generate-tweet',
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'Generation failed',
      message: error.message,
    });
  }
});

/**
 * Rewrite/improve an existing tweet
 * POST /api/ai/writer/rewrite
 * 
 * Body: { username, text, goal?, count?, model?, apiKey? }
 */
router.post('/rewrite', generationLimiter, async (req, res) => {
  try {
    const {
      username, text, goal = 'more_engaging', count = 3,
      model, apiKey, authToken, voiceProfile: directProfile,
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required — the tweet to rewrite' });
    }

    let voiceProfile = directProfile;
    if (!voiceProfile && username) {
      if (!authToken) {
        return res.status(400).json({
          error: 'authToken is required',
          hint: 'Provide the authToken used when analyzing this username to load its saved voice profile',
        });
      }
      const saved = voiceProfiles.get(`${ownerHashOf(authToken)}:${username.toLowerCase().replace(/^@/, '')}`);
      if (saved) voiceProfile = saved.profile;
    }

    if (!voiceProfile) {
      return res.status(400).json({
        error: 'Voice profile required',
        message: 'Analyze a username first via POST /api/ai/writer/analyze-voice',
      });
    }

    const { rewriteTweet } = await import('../../src/ai/tweetGenerator.js');
    const result = await rewriteTweet(voiceProfile, text, { goal, count, model, apiKey });

    res.json({
      success: true,
      data: result,
      operation: 'ai:rewrite-tweet',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Rewrite failed',
      message: error.message,
    });
  }
});

/**
 * Generate weekly content calendar
 * POST /api/ai/writer/calendar
 * 
 * Body: { username, topics?, postsPerDay?, days?, model?, apiKey? }
 */
router.post('/calendar', generationLimiter, async (req, res) => {
  try {
    const {
      username, topics, postsPerDay = 2, days = 7,
      model, apiKey, authToken, voiceProfile: directProfile,
    } = req.body;

    let voiceProfile = directProfile;
    if (!voiceProfile && username) {
      if (!authToken) {
        return res.status(400).json({
          error: 'authToken is required',
          hint: 'Provide the authToken used when analyzing this username to load its saved voice profile',
        });
      }
      const saved = voiceProfiles.get(`${ownerHashOf(authToken)}:${username.toLowerCase().replace(/^@/, '')}`);
      if (saved) voiceProfile = saved.profile;
    }

    if (!voiceProfile) {
      return res.status(400).json({
        error: 'Voice profile required',
        message: 'Analyze a username first via POST /api/ai/writer/analyze-voice',
      });
    }

    const { generateWeek } = await import('../../src/ai/tweetGenerator.js');
    const result = await generateWeek(voiceProfile, { topics, postsPerDay, days, model, apiKey });

    res.json({
      success: true,
      data: result,
      operation: 'ai:generate-calendar',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Calendar generation failed',
      message: error.message,
    });
  }
});

/**
 * Generate reply to a tweet
 * POST /api/ai/writer/reply
 * 
 * Body: { username, originalTweet, tone?, count?, model?, apiKey? }
 */
router.post('/reply', generationLimiter, async (req, res) => {
  try {
    const {
      username, originalTweet, tone, count = 3,
      model, apiKey, authToken, voiceProfile: directProfile,
    } = req.body;

    if (!originalTweet) {
      return res.status(400).json({ error: 'originalTweet is required — the tweet to reply to' });
    }

    let voiceProfile = directProfile;
    if (!voiceProfile && username) {
      if (!authToken) {
        return res.status(400).json({
          error: 'authToken is required',
          hint: 'Provide the authToken used when analyzing this username to load its saved voice profile',
        });
      }
      const saved = voiceProfiles.get(`${ownerHashOf(authToken)}:${username.toLowerCase().replace(/^@/, '')}`);
      if (saved) voiceProfile = saved.profile;
    }

    if (!voiceProfile) {
      return res.status(400).json({
        error: 'Voice profile required',
        message: 'Analyze a username first via POST /api/ai/writer/analyze-voice',
      });
    }

    const { generateReply } = await import('../../src/ai/tweetGenerator.js');
    const result = await generateReply(voiceProfile, originalTweet, { tone, count, model, apiKey });

    res.json({
      success: true,
      data: result,
      operation: 'ai:generate-reply',
    });
  } catch (error) {
    res.status(500).json({
      error: 'Reply generation failed',
      message: error.message,
    });
  }
});

/**
 * Generate a comment for a post from a plain-language brief.
 * POST /api/ai/writer/comment
 *
 * No voice profile needed: the brief ("be supportive, ask one question") is
 * the whole instruction. This is what the browser sweep and `xactions engage`
 * use, so the same request works from a script, a cron, or another agent.
 *
 * Body: {
 *   tweet: { text, author?, authorName?, quotedText?, hasMedia? },
 *   prompt, persona?, provider?, model?, apiKey?, baseUrl?,
 *   temperature?, allowHashtags?, allowEmoji?, history?: string[]
 * }
 */
router.post('/comment', generationLimiter, async (req, res) => {
  try {
    const { tweet, prompt, history = [], ...llm } = req.body || {};
    if (!tweet || !tweet.text) {
      return res.status(400).json({ error: 'tweet.text is required — the post to reply to' });
    }
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required — how the comment should sound' });
    }

    const { createCommentGenerator } = await import('../../../src/ai/commentGenerator.js');
    const generator = createCommentGenerator({ prompt, ...llm });
    if (Array.isArray(history)) generator.history.push(...history.filter((h) => typeof h === 'string').slice(-10));
    const result = await generator.generate(tweet);

    res.json({
      success: true,
      data: { comment: result.text, model: result.model, attempts: result.attempts, provider: generator.target.provider },
      operation: 'ai:generate-comment',
    });
  } catch (error) {
    const status = /needs an API key|Unknown LLM provider|needs baseUrl/.test(error.message) ? 400 : 500;
    res.status(status).json({
      error: 'Comment generation failed',
      message: error.message,
    });
  }
});

/**
 * List saved voice profiles
 * GET /api/ai/writer/voice-profiles
 */
router.get('/voice-profiles', (req, res) => {
  const authToken = req.headers['x-auth-token'] || req.query.authToken;
  if (!authToken) {
    return res.status(400).json({
      error: 'authToken is required',
      hint: 'Provide your X/Twitter auth_token via the x-auth-token header or authToken query param',
    });
  }

  const prefix = `${ownerHashOf(authToken)}:`;
  const profiles = [];
  for (const [key, data] of voiceProfiles) {
    if (!key.startsWith(prefix)) continue;
    profiles.push({
      username: key.slice(prefix.length),
      tweetCount: data.profile.tweetCount,
      contentPillars: data.profile.contentPillars.map(p => p.topic),
      savedAt: data.savedAt,
    });
  }

  res.json({
    success: true,
    data: profiles,
    count: profiles.length,
    operation: 'ai:list-voice-profiles',
  });
});

/**
 * Get a specific voice profile
 * GET /api/ai/writer/voice-profiles/:username
 */
router.get('/voice-profiles/:username', (req, res) => {
  const authToken = req.headers['x-auth-token'] || req.query.authToken;
  if (!authToken) {
    return res.status(400).json({
      error: 'authToken is required',
      hint: 'Provide your X/Twitter auth_token via the x-auth-token header or authToken query param',
    });
  }

  const username = req.params.username.toLowerCase().replace(/^@/, '');
  const saved = voiceProfiles.get(`${ownerHashOf(authToken)}:${username}`);

  if (!saved) {
    return res.status(404).json({
      error: 'Profile not found',
      message: `No voice profile saved for @${username}. Analyze first via POST /api/ai/writer/analyze-voice`,
    });
  }

  res.json({
    success: true,
    data: saved.profile,
    savedAt: saved.savedAt,
    operation: 'ai:get-voice-profile',
  });
});

export default router;

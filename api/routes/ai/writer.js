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
 * GET  /api/ai/writer/voice-profiles — list saved voice profiles
 * 
 * Rate limit: 10 generations/minute for free tier.
 * 
 * @author nich (@nichxbt) - https://github.com/nirholas
 * @license MIT
 */

import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

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

    // Step 3: Save profile
    voiceProfiles.set(username.toLowerCase().replace(/^@/, ''), {
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
      model, apiKey,
      // Allow passing a voice profile directly
      voiceProfile: directProfile,
    } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'topic is required' });
    }

    // Resolve voice profile
    let voiceProfile = directProfile;
    if (!voiceProfile && username) {
      const saved = voiceProfiles.get(username.toLowerCase().replace(/^@/, ''));
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
      model, apiKey, voiceProfile: directProfile,
    } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required — the tweet to rewrite' });
    }

    let voiceProfile = directProfile;
    if (!voiceProfile && username) {
      const saved = voiceProfiles.get(username.toLowerCase().replace(/^@/, ''));
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
      model, apiKey, voiceProfile: directProfile,
    } = req.body;

    let voiceProfile = directProfile;
    if (!voiceProfile && username) {
      const saved = voiceProfiles.get(username.toLowerCase().replace(/^@/, ''));
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
      model, apiKey, voiceProfile: directProfile,
    } = req.body;

    if (!originalTweet) {
      return res.status(400).json({ error: 'originalTweet is required — the tweet to reply to' });
    }

    let voiceProfile = directProfile;
    if (!voiceProfile && username) {
      const saved = voiceProfiles.get(username.toLowerCase().replace(/^@/, ''));
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
 * List saved voice profiles
 * GET /api/ai/writer/voice-profiles
 */
router.get('/voice-profiles', (req, res) => {
  const profiles = [];
  for (const [username, data] of voiceProfiles) {
    profiles.push({
      username,
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
  const username = req.params.username.toLowerCase().replace(/^@/, '');
  const saved = voiceProfiles.get(username);

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

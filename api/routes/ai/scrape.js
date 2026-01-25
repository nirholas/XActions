/**
 * AI Scraping Endpoints
 * 
 * Structured data extraction from X/Twitter.
 * All responses follow consistent JSON schema.
 * 
 * @module api/routes/ai/scrape
 */

import express from 'express';

const router = express.Router();

// Require session cookie for all scraping
router.use(async (req, res, next) => {
  const sessionCookie = req.body.sessionCookie || req.headers['x-session-cookie'];
  
  if (!sessionCookie) {
    return res.status(400).json({
      error: 'SESSION_REQUIRED',
      code: 'E_SESSION_MISSING',
      message: 'X/Twitter session cookie is required for scraping',
      hint: 'Include sessionCookie in request body or X-Session-Cookie header',
      docs: 'https://xactions.app/docs/ai-api#authentication',
      example: {
        body: { sessionCookie: 'your_auth_token_here', username: 'elonmusk' },
        header: { 'X-Session-Cookie': 'your_auth_token_here' },
      },
    });
  }
  
  req.sessionCookie = sessionCookie;
  next();
});

/**
 * Helper: Create consistent error response
 */
const errorResponse = (res, statusCode, error, message, extras = {}) => {
  return res.status(statusCode).json({
    success: false,
    error,
    message,
    retryable: extras.retryable ?? true,
    retryAfterMs: extras.retryAfterMs ?? 5000,
    timestamp: new Date().toISOString(),
    ...extras,
  });
};

/**
 * Helper: Create consistent success response
 */
const successResponse = (res, data, meta = {}) => {
  return res.json({
    success: true,
    data,
    meta: {
      scrapedAt: new Date().toISOString(),
      source: 'x.com',
      ...meta,
    },
  });
};

/**
 * POST /api/ai/scrape/profile
 * Get profile information for a username
 */
router.post('/profile', async (req, res) => {
  const { username } = req.body;
  
  if (!username) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_USERNAME',
      message: 'username is required',
      schema: {
        username: { type: 'string', required: true, example: 'elonmusk' },
      },
    });
  }
  
  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  
  try {
    const startTime = Date.now();
    
    // Dynamic import to handle potential module issues
    const { scrapeProfile } = await import('../../services/browserAutomation.js');
    const profile = await scrapeProfile(req.sessionCookie, cleanUsername);
    
    return successResponse(res, {
      username: profile.username,
      displayName: profile.name,
      bio: profile.bio,
      location: profile.location,
      website: profile.website,
      joinDate: profile.joinDate,
      followersCount: parseInt(profile.followers) || 0,
      followingCount: parseInt(profile.following) || 0,
      tweetsCount: parseInt(profile.tweets) || 0,
      verified: profile.verified || false,
      protected: profile.protected || false,
      profileImageUrl: profile.profileImage,
      bannerImageUrl: profile.bannerImage,
    }, {
      durationMs: Date.now() - startTime,
      requestedUsername: cleanUsername,
    });
  } catch (error) {
    console.error('Profile scrape error:', error);
    
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return errorResponse(res, 404, 'USER_NOT_FOUND', `User @${cleanUsername} not found`, {
        retryable: false,
      });
    }
    
    if (error.message?.includes('suspended')) {
      return errorResponse(res, 410, 'USER_SUSPENDED', `User @${cleanUsername} is suspended`, {
        retryable: false,
      });
    }
    
    if (error.message?.includes('rate limit')) {
      return errorResponse(res, 429, 'RATE_LIMITED', 'Rate limited by X/Twitter', {
        retryAfterMs: 60000,
      });
    }
    
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/scrape/followers
 * Get follower list for a username
 */
router.post('/followers', async (req, res) => {
  const { username, limit = 100, cursor } = req.body;
  
  if (!username) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_USERNAME',
      message: 'username is required',
      schema: {
        username: { type: 'string', required: true, example: 'elonmusk' },
        limit: { type: 'number', default: 100, min: 1, max: 1000 },
        cursor: { type: 'string', description: 'Pagination cursor from previous response' },
      },
    });
  }
  
  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 1000);
  
  try {
    const startTime = Date.now();
    
    const { scrapeFollowers } = await import('../../services/browserAutomation.js');
    const followers = await scrapeFollowers(req.sessionCookie, cleanUsername, { 
      limit: effectiveLimit,
      cursor,
    });
    
    return successResponse(res, {
      username: cleanUsername,
      followers: (followers.users || []).map(u => ({
        username: u.username,
        displayName: u.name || u.displayName,
        bio: u.bio || null,
        followsYou: u.followsYou || false,
        verified: u.verified || false,
        followersCount: parseInt(u.followers) || null,
        profileImageUrl: u.profileImage || null,
      })),
      pagination: {
        count: (followers.users || []).length,
        limit: effectiveLimit,
        nextCursor: followers.nextCursor || null,
        hasMore: !!followers.nextCursor,
      },
    }, {
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Followers scrape error:', error);
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/scrape/following
 * Get following list for a username
 */
router.post('/following', async (req, res) => {
  const { username, limit = 100, cursor } = req.body;
  
  if (!username) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_USERNAME',
      message: 'username is required',
      schema: {
        username: { type: 'string', required: true },
        limit: { type: 'number', default: 100, max: 1000 },
        cursor: { type: 'string' },
      },
    });
  }
  
  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 1000);
  
  try {
    const startTime = Date.now();
    
    const { scrapeFollowing } = await import('../../services/browserAutomation.js');
    const following = await scrapeFollowing(req.sessionCookie, cleanUsername, {
      limit: effectiveLimit,
      cursor,
    });
    
    return successResponse(res, {
      username: cleanUsername,
      following: (following.users || []).map(u => ({
        username: u.username,
        displayName: u.name || u.displayName,
        bio: u.bio || null,
        followsBack: u.followsBack || false,
        verified: u.verified || false,
        followersCount: parseInt(u.followers) || null,
        profileImageUrl: u.profileImage || null,
      })),
      pagination: {
        count: (following.users || []).length,
        limit: effectiveLimit,
        nextCursor: following.nextCursor || null,
        hasMore: !!following.nextCursor,
      },
    }, {
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Following scrape error:', error);
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/scrape/tweets
 * Get tweets from a user's profile
 */
router.post('/tweets', async (req, res) => {
  const { username, limit = 50, includeReplies = false, includeRetweets = true, cursor } = req.body;
  
  if (!username) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_USERNAME',
      message: 'username is required',
      schema: {
        username: { type: 'string', required: true },
        limit: { type: 'number', default: 50, max: 200 },
        includeReplies: { type: 'boolean', default: false },
        includeRetweets: { type: 'boolean', default: true },
        cursor: { type: 'string' },
      },
    });
  }
  
  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  
  try {
    const startTime = Date.now();
    
    const { scrapeTweets } = await import('../../services/browserAutomation.js');
    const tweets = await scrapeTweets(req.sessionCookie, cleanUsername, {
      limit: effectiveLimit,
      includeReplies,
      includeRetweets,
      cursor,
    });
    
    return successResponse(res, {
      username: cleanUsername,
      tweets: (tweets.items || []).map(t => ({
        id: t.id,
        text: t.text,
        createdAt: t.timestamp || t.createdAt,
        url: t.url || `https://x.com/${cleanUsername}/status/${t.id}`,
        metrics: {
          likes: parseInt(t.likes) || 0,
          retweets: parseInt(t.retweets) || 0,
          replies: parseInt(t.replies) || 0,
          views: parseInt(t.views) || 0,
          quotes: parseInt(t.quotes) || 0,
          bookmarks: parseInt(t.bookmarks) || 0,
        },
        media: (t.media || []).map(m => ({
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnail,
        })),
        isReply: t.isReply || false,
        isRetweet: t.isRetweet || false,
        isQuote: t.isQuote || false,
        replyToUser: t.replyToUser || null,
        quotedTweetId: t.quotedTweetId || null,
      })),
      pagination: {
        count: (tweets.items || []).length,
        limit: effectiveLimit,
        nextCursor: tweets.nextCursor || null,
        hasMore: !!tweets.nextCursor,
      },
    }, {
      durationMs: Date.now() - startTime,
      filters: { includeReplies, includeRetweets },
    });
  } catch (error) {
    console.error('Tweets scrape error:', error);
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/scrape/search
 * Search tweets by query
 */
router.post('/search', async (req, res) => {
  const { query, limit = 50, filter = 'latest', cursor } = req.body;
  
  if (!query) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_QUERY',
      message: 'query is required',
      schema: {
        query: { type: 'string', required: true, example: 'bitcoin', maxLength: 500 },
        limit: { type: 'number', default: 50, max: 200 },
        filter: { type: 'string', enum: ['latest', 'top', 'people', 'media', 'lists'], default: 'latest' },
        cursor: { type: 'string' },
      },
      examples: {
        simple: { query: 'bitcoin' },
        fromUser: { query: 'from:elonmusk crypto' },
        hashtag: { query: '#ai #machinelearning' },
        advanced: { query: 'from:naval min_faves:100 -filter:replies' },
      },
    });
  }
  
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  const validFilters = ['latest', 'top', 'people', 'media', 'lists'];
  const effectiveFilter = validFilters.includes(filter) ? filter : 'latest';
  
  try {
    const startTime = Date.now();
    
    const { searchTweets } = await import('../../services/browserAutomation.js');
    const results = await searchTweets(req.sessionCookie, query, {
      limit: effectiveLimit,
      filter: effectiveFilter,
      cursor,
    });
    
    return successResponse(res, {
      query,
      filter: effectiveFilter,
      results: (results.items || []).map(t => ({
        id: t.id,
        text: t.text,
        author: {
          username: t.author?.username || t.username,
          displayName: t.author?.name || t.authorName,
          verified: t.author?.verified || false,
          profileImageUrl: t.author?.profileImage || null,
        },
        createdAt: t.timestamp || t.createdAt,
        url: t.url,
        metrics: {
          likes: parseInt(t.likes) || 0,
          retweets: parseInt(t.retweets) || 0,
          replies: parseInt(t.replies) || 0,
          views: parseInt(t.views) || 0,
        },
        media: t.media || [],
      })),
      pagination: {
        count: (results.items || []).length,
        limit: effectiveLimit,
        nextCursor: results.nextCursor || null,
        hasMore: !!results.nextCursor,
      },
    }, {
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Search scrape error:', error);
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/scrape/thread
 * Get full thread/conversation
 */
router.post('/thread', async (req, res) => {
  const { tweetUrl, tweetId } = req.body;
  
  if (!tweetUrl && !tweetId) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_TWEET_REF',
      message: 'tweetUrl or tweetId is required',
      schema: {
        tweetUrl: { type: 'string', example: 'https://x.com/naval/status/1234567890' },
        tweetId: { type: 'string', example: '1234567890' },
      },
    });
  }
  
  // Extract tweet ID from URL if provided
  let effectiveTweetId = tweetId;
  if (tweetUrl) {
    const match = tweetUrl.match(/status\/(\d+)/);
    if (match) {
      effectiveTweetId = match[1];
    }
  }
  
  if (!effectiveTweetId) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_INVALID_TWEET_URL',
      message: 'Could not extract tweet ID from provided URL',
    });
  }
  
  try {
    const startTime = Date.now();
    
    const { scrapeThread } = await import('../../services/browserAutomation.js');
    const thread = await scrapeThread(req.sessionCookie, effectiveTweetId);
    
    return successResponse(res, {
      originalTweetId: effectiveTweetId,
      author: {
        username: thread.author?.username,
        displayName: thread.author?.name,
        verified: thread.author?.verified || false,
        profileImageUrl: thread.author?.profileImage,
      },
      tweets: (thread.tweets || []).map((t, i) => ({
        position: i + 1,
        id: t.id,
        text: t.text,
        createdAt: t.timestamp || t.createdAt,
        metrics: {
          likes: parseInt(t.likes) || 0,
          retweets: parseInt(t.retweets) || 0,
          replies: parseInt(t.replies) || 0,
        },
        media: t.media || [],
      })),
      totalTweets: (thread.tweets || []).length,
      threadText: (thread.tweets || []).map(t => t.text).join('\n\n---\n\n'),
    }, {
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Thread scrape error:', error);
    
    if (error.message?.includes('not found')) {
      return errorResponse(res, 404, 'TWEET_NOT_FOUND', 'Tweet not found', { retryable: false });
    }
    
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/scrape/hashtag
 * Get tweets for a hashtag
 */
router.post('/hashtag', async (req, res) => {
  const { hashtag, limit = 50, filter = 'latest', cursor } = req.body;
  
  if (!hashtag) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_HASHTAG',
      message: 'hashtag is required (with or without #)',
      schema: {
        hashtag: { type: 'string', required: true, example: 'bitcoin' },
        limit: { type: 'number', default: 50, max: 200 },
        filter: { type: 'string', enum: ['latest', 'top'], default: 'latest' },
        cursor: { type: 'string' },
      },
    });
  }
  
  // Normalize hashtag (remove # if present)
  const cleanHashtag = hashtag.replace(/^#/, '');
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
  
  try {
    const startTime = Date.now();
    
    const { searchTweets } = await import('../../services/browserAutomation.js');
    const results = await searchTweets(req.sessionCookie, `#${cleanHashtag}`, {
      limit: effectiveLimit,
      filter: filter === 'top' ? 'top' : 'latest',
      cursor,
    });
    
    return successResponse(res, {
      hashtag: cleanHashtag,
      filter,
      tweets: (results.items || []).map(t => ({
        id: t.id,
        text: t.text,
        author: {
          username: t.author?.username || t.username,
          displayName: t.author?.name || t.authorName,
          verified: t.author?.verified || false,
        },
        createdAt: t.timestamp || t.createdAt,
        url: t.url,
        metrics: {
          likes: parseInt(t.likes) || 0,
          retweets: parseInt(t.retweets) || 0,
          replies: parseInt(t.replies) || 0,
        },
      })),
      pagination: {
        count: (results.items || []).length,
        limit: effectiveLimit,
        nextCursor: results.nextCursor || null,
        hasMore: !!results.nextCursor,
      },
    }, {
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Hashtag scrape error:', error);
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/scrape/media
 * Get media (images/videos) from a profile
 */
router.post('/media', async (req, res) => {
  const { username, limit = 50, type = 'all', cursor } = req.body;
  
  if (!username) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_USERNAME',
      message: 'username is required',
      schema: {
        username: { type: 'string', required: true },
        limit: { type: 'number', default: 50, max: 100 },
        type: { type: 'string', enum: ['all', 'images', 'videos'], default: 'all' },
        cursor: { type: 'string' },
      },
    });
  }
  
  const cleanUsername = username.replace(/^@/, '').toLowerCase();
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
  
  try {
    const startTime = Date.now();
    
    const { scrapeMedia } = await import('../../services/browserAutomation.js');
    const media = await scrapeMedia(req.sessionCookie, cleanUsername, {
      limit: effectiveLimit,
      type,
      cursor,
    });
    
    return successResponse(res, {
      username: cleanUsername,
      media: (media.items || []).map(m => ({
        type: m.type, // 'image' or 'video'
        url: m.url,
        thumbnailUrl: m.thumbnail,
        tweetId: m.tweetId,
        tweetUrl: m.tweetUrl || `https://x.com/${cleanUsername}/status/${m.tweetId}`,
        createdAt: m.timestamp,
        dimensions: m.dimensions || null,
        duration: m.type === 'video' ? m.duration : null,
      })),
      pagination: {
        count: (media.items || []).length,
        limit: effectiveLimit,
        nextCursor: media.nextCursor || null,
        hasMore: !!media.nextCursor,
      },
      summary: {
        images: (media.items || []).filter(m => m.type === 'image').length,
        videos: (media.items || []).filter(m => m.type === 'video').length,
      },
    }, {
      durationMs: Date.now() - startTime,
      filterType: type,
    });
  } catch (error) {
    console.error('Media scrape error:', error);
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/scrape/likes
 * Get users who liked a tweet
 */
router.post('/likes', async (req, res) => {
  const { tweetUrl, tweetId, limit = 100, cursor } = req.body;
  
  if (!tweetUrl && !tweetId) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_TWEET_REF',
      message: 'tweetUrl or tweetId is required',
    });
  }
  
  let effectiveTweetId = tweetId;
  if (tweetUrl) {
    const match = tweetUrl.match(/status\/(\d+)/);
    if (match) effectiveTweetId = match[1];
  }
  
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
  
  try {
    const startTime = Date.now();
    
    const { scrapeTweetLikes } = await import('../../services/browserAutomation.js');
    const likers = await scrapeTweetLikes(req.sessionCookie, effectiveTweetId, {
      limit: effectiveLimit,
      cursor,
    });
    
    return successResponse(res, {
      tweetId: effectiveTweetId,
      likers: (likers.users || []).map(u => ({
        username: u.username,
        displayName: u.name || u.displayName,
        bio: u.bio || null,
        verified: u.verified || false,
        followersCount: parseInt(u.followers) || null,
      })),
      pagination: {
        count: (likers.users || []).length,
        limit: effectiveLimit,
        nextCursor: likers.nextCursor || null,
        hasMore: !!likers.nextCursor,
      },
    }, {
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Likes scrape error:', error);
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

/**
 * POST /api/ai/scrape/retweets
 * Get users who retweeted a tweet
 */
router.post('/retweets', async (req, res) => {
  const { tweetUrl, tweetId, limit = 100, cursor } = req.body;
  
  if (!tweetUrl && !tweetId) {
    return res.status(400).json({
      error: 'INVALID_INPUT',
      code: 'E_MISSING_TWEET_REF',
      message: 'tweetUrl or tweetId is required',
    });
  }
  
  let effectiveTweetId = tweetId;
  if (tweetUrl) {
    const match = tweetUrl.match(/status\/(\d+)/);
    if (match) effectiveTweetId = match[1];
  }
  
  const effectiveLimit = Math.min(Math.max(parseInt(limit) || 100, 1), 500);
  
  try {
    const startTime = Date.now();
    
    const { scrapeTweetRetweets } = await import('../../services/browserAutomation.js');
    const retweeters = await scrapeTweetRetweets(req.sessionCookie, effectiveTweetId, {
      limit: effectiveLimit,
      cursor,
    });
    
    return successResponse(res, {
      tweetId: effectiveTweetId,
      retweeters: (retweeters.users || []).map(u => ({
        username: u.username,
        displayName: u.name || u.displayName,
        bio: u.bio || null,
        verified: u.verified || false,
        followersCount: parseInt(u.followers) || null,
      })),
      pagination: {
        count: (retweeters.users || []).length,
        limit: effectiveLimit,
        nextCursor: retweeters.nextCursor || null,
        hasMore: !!retweeters.nextCursor,
      },
    }, {
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error('Retweets scrape error:', error);
    return errorResponse(res, 500, 'SCRAPE_FAILED', error.message);
  }
});

export default router;

/**
 * Video Download API Routes
 * 
 * POST /api/video/extract — Extract video URLs from a tweet
 * GET  /api/video/download — Proxy video download (avoids CORS)
 * 
 * @module api/routes/video
 * @author nichxbt
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { extractVideo, parseTweetUrl } from '../services/videoExtractor.js';

const router = Router();

// ============================================================================
// Rate Limiting: 30 requests/minute per IP
// ============================================================================

const videoLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait a minute before trying again.',
    retryAfter: 60,
  },
});

router.use(videoLimiter);

// ============================================================================
// In-memory cache (keyed by tweet ID, TTL 1 hour)
// ============================================================================

const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCached(tweetId) {
  const entry = cache.get(tweetId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(tweetId);
    return null;
  }
  return entry.data;
}

function setCache(tweetId, data) {
  cache.set(tweetId, { data, timestamp: Date.now() });
  // Evict old entries if cache grows too large (max 500)
  if (cache.size > 500) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

// ============================================================================
// POST /api/video/extract
// ============================================================================

/**
 * Extract video URLs from a tweet.
 * 
 * Request body: { url: "https://x.com/user/status/123" }
 * Response: {
 *   videos: [{ url, quality, width, height, bitrate, contentType }],
 *   thumbnail, duration, author, username, tweetId, text
 * }
 */
router.post('/extract', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Missing required field: url' });
    }

    const parsed = parseTweetUrl(url);
    if (!parsed) {
      return res.status(400).json({
        error: 'Invalid URL. Please provide a valid X/Twitter tweet URL.',
        example: 'https://x.com/user/status/123456789',
      });
    }

    // Check cache
    const cached = getCached(parsed.tweetId);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Extract video
    const result = await extractVideo(url);

    // Cache result
    setCache(parsed.tweetId, result);

    return res.json(result);
  } catch (error) {
    console.error('❌ Video extraction error:', error.message);

    if (error.message.includes('No video found')) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Invalid tweet URL')) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error.message || 'Failed to extract video. The tweet may be private, deleted, or rate-limited.',
    });
  }
});

// ============================================================================
// GET /api/video/download?url=<encoded_mp4_url>
// ============================================================================

/**
 * Proxy-stream a video download to avoid CORS issues.
 * Sets Content-Disposition for filename: {author}_{tweetId}.mp4
 */
router.get('/download', async (req, res) => {
  try {
    const { url, author, tweetId } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Missing required query param: url' });
    }

    // Validate the URL points to Twitter's video CDN
    const decodedUrl = decodeURIComponent(url);
    if (!decodedUrl.includes('video.twimg.com') && !decodedUrl.includes('pbs.twimg.com')) {
      return res.status(400).json({ error: 'Invalid video URL. Must be a Twitter video CDN URL.' });
    }

    // Fetch the video from Twitter's CDN
    const videoResponse = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://x.com/',
      },
    });

    if (!videoResponse.ok) {
      return res.status(videoResponse.status).json({
        error: `Failed to fetch video: HTTP ${videoResponse.status}`,
      });
    }

    // Set download headers
    const filename = `${author || 'video'}_${tweetId || Date.now()}.mp4`;
    res.setHeader('Content-Type', videoResponse.headers.get('content-type') || 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const contentLength = videoResponse.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream the response (don't buffer in memory)
    const reader = videoResponse.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.writableEnded) {
          res.write(Buffer.from(value));
        }
      }
      res.end();
    };

    await pump();
  } catch (error) {
    console.error('❌ Video download proxy error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download video' });
    }
  }
});

// ============================================================================
// POST /api/video/extract (form-based, for progressive enhancement)
// ============================================================================

/**
 * Handle form POST from the no-JS fallback form.
 * Extracts video and redirects to the download proxy.
 */
router.post('/extract-form', async (req, res) => {
  try {
    const url = req.body.url;
    const parsed = parseTweetUrl(url);

    if (!parsed) {
      return res.redirect('/video?error=invalid');
    }

    // Check cache
    const cached = getCached(parsed.tweetId);
    const result = cached || await extractVideo(url);

    if (!cached) setCache(parsed.tweetId, result);

    if (!result.videos || result.videos.length === 0) {
      return res.redirect('/video?error=novideo');
    }

    // Redirect to download the best quality
    const best = result.videos[0];
    const downloadUrl = `/api/video/download?url=${encodeURIComponent(best.url)}&author=${encodeURIComponent(result.username)}&tweetId=${encodeURIComponent(result.tweetId)}`;
    return res.redirect(downloadUrl);
  } catch (error) {
    console.error('❌ Form extraction error:', error.message);
    return res.redirect('/video?error=failed');
  }
});

export default router;

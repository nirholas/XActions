# Video Downloader

> XActions v3.1.0 — Download videos from X/Twitter tweets.

## Overview

Extract and download videos from any public X/Twitter tweet. Supports multiple quality levels (360p to 1080p) with automatic best-quality selection.

Available via: **Dashboard**, **API**, **CLI**, **MCP**, **Browser Script**

## Dashboard (Web UI)

Visit `http://localhost:3001/video` and paste a tweet URL.

The dashboard provides:
- Paste-and-go URL input
- Multiple quality options
- One-click download
- Video preview with thumbnail
- Tweet metadata (author, text)

## API Endpoints

### Extract Video URLs

```
POST /api/video/extract
Content-Type: application/json

{
  "url": "https://x.com/user/status/123456789"
}
```

**Response:**

```json
{
  "videos": [
    {
      "url": "https://video.twimg.com/.../vid/1280x720/...",
      "quality": "720p",
      "width": 1280,
      "height": 720,
      "bitrate": 2176000,
      "contentType": "video/mp4"
    },
    {
      "url": "https://video.twimg.com/.../vid/640x360/...",
      "quality": "360p",
      "width": 640,
      "height": 360,
      "bitrate": 832000,
      "contentType": "video/mp4"
    }
  ],
  "thumbnail": "https://pbs.twimg.com/...",
  "duration": 15000,
  "author": "Display Name",
  "username": "user",
  "tweetId": "123456789",
  "text": "Tweet text content"
}
```

Videos are sorted by quality (highest first).

### Download Video (Proxy)

Proxies the video download through the server to avoid CORS issues:

```
GET /api/video/download?url=<encoded_mp4_url>&author=user&tweetId=123
```

Returns the video file as `attachment` with filename `{author}_{tweetId}.mp4`.

### Form-Based Extract

For progressive enhancement (no-JS fallback):

```
POST /api/video/extract-form
Content-Type: application/x-www-form-urlencoded

url=https://x.com/user/status/123456789
```

Redirects to the download proxy for the best quality video.

## CLI

```bash
# Download video from tweet URL
xactions download-video https://x.com/user/status/123456789

# With the MCP tool
xactions mcp x_download_video --url "https://x.com/user/status/123"
```

## MCP Tool

```json
{
  "tool": "x_download_video",
  "arguments": {
    "url": "https://x.com/user/status/123456789"
  }
}
```

Returns video URLs with quality info for the AI agent to present.

## Browser Script

Paste into DevTools console on x.com:

```javascript
// Navigate to a tweet with a video, then run:
// Paste src/scrapers/videoDownloader.js contents
```

The browser script (`src/scrapers/videoDownloader.js`) intercepts network requests for `video.twimg.com` URLs.

## How It Works

1. **Puppeteer** navigates to the tweet URL with stealth mode
2. **GraphQL Interception** — listens for `TweetDetail` API responses containing `video_info.variants`
3. **Network Interception** — captures direct `video.twimg.com` MP4 requests
4. **DOM Scanning** — fallback: scans page HTML for video URLs and `<video>` elements
5. **Play Button** — clicks play if the video hasn't auto-played
6. **Deduplication** — merges all sources, removes duplicates, sorts by quality

### Quality Labels

| Resolution | Label |
|-----------|-------|
| ≥1920px | 1080p |
| ≥1280px | 720p |
| ≥640px | 480p |
| ≥480px | 360p |

## Caching

Results are cached in-memory for 1 hour (keyed by tweet ID). Cache max size: 500 entries.

## Rate Limiting

30 requests per minute per IP address.

## Troubleshooting

### 500 Error — "Failed to extract video"

**Common causes:**

1. **Missing Chrome dependencies** — In Codespaces/CI, Puppeteer needs system libraries:
   ```bash
   sudo apt-get install -y libatk1.0-0 libatk-bridge2.0-0 libcups2 \
     libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
     libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2t64 \
     libnspr4 libnss3
   ```
   On Ubuntu 24.04+, use `libasound2t64` instead of `libasound2`.

2. **Tweet is private or deleted** — The extractor can only access public tweets

3. **Tweet has no video** — The tweet contains images or GIFs (not MP4 video). GIFs on X are actually short MP4s and should work.

4. **Rate limited by X** — Wait a minute and retry

### CSP Manifest Errors

```
Loading a manifest from '...' violates Content Security Policy
```

This is a harmless Codespaces tunnel message. It does not affect functionality.

### "No video found in this tweet"

- Verify the tweet actually contains a video (not just images)
- The tweet may be behind a login wall — some videos require authentication
- Try again after a few seconds (GraphQL response may not have loaded)

## Technical Details

- Browser pool: max 2 Puppeteer instances
- Extraction timeout: 15 seconds per request
- Stealth plugin prevents bot detection
- User-Agent: Chrome 131 on Windows
- Supported URL formats:
  - `https://x.com/user/status/123`
  - `https://twitter.com/user/status/123`
  - `https://www.x.com/user/status/123`

---

*XActions v3.1.0 — by nichxbt*

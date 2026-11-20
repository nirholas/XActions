# Video Downloader

> XActions v5.0.0 — Download videos from X/Twitter tweets.

## Overview

Extract and download videos from any public X/Twitter tweet. Supports every quality X publishes (360p through 4K) with automatic best-quality selection.

Available via: **Dashboard**, **API**, **CLI**, **MCP**, **Browser Script**

## Dashboard (Web UI)

Visit [xactions.app/video](https://xactions.app/video) (or `http://localhost:3001/video` when running the API locally) and paste a tweet URL.

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

## Where It Runs

The three endpoints above exist twice, on purpose, and both copies share one
extraction module (`src/video/edgeExtractor.js`):

| Surface | Code | Needs |
|---|---|---|
| xactions.app | `functions/api/video/*` (Cloudflare Pages Functions) | nothing: no database, no browser, no origin server |
| Self-hosted API | `api/routes/video.js` + `api/services/videoExtractor.js` | Node, and Puppeteer only for the last-resort lane |

See [functions/README.md](../functions/README.md) for the edge deployment.

## How It Works

Lanes run in order and the first success wins:

1. **Syndication endpoint**: `cdn.syndication.twimg.com/tweet-result`, the API
   the official embed widget calls. No credentials, and it returns the complete
   mp4 variant ladder.
2. **fxtwitter**: `api.fxtwitter.com`, an independent open-source reader. Picks
   up when X rate-limits the first lane.
3. **Guest token + GraphQL**: `TweetResultByRestId` with a freshly minted guest
   token. Skipped unless `TWITTER_BEARER_TOKEN` is set.
4. **Puppeteer**: self-hosted API only. Navigates the tweet with the stealth
   plugin, intercepts `TweetDetail` GraphQL responses and direct
   `video.twimg.com` requests, scans the DOM, and clicks play if needed.

Every lane returns the same shape, deduplicated by URL and sorted best-first.
HLS playlists (`.m3u8`) are filtered out, since a playlist cannot be saved as a
video file.

### Quality Labels

| Resolution | Label |
|-----------|-------|
| ≥3840px | 4K |
| ≥2560px | 1440p |
| ≥1920px | 1080p |
| ≥1280px | 720p |
| ≥640px | 480p |
| ≥480px | 360p |

## Caching

On xactions.app, successful extractions are held in the Cloudflare edge cache
for one hour, keyed by tweet ID, and the downloaded mp4 is cached for an hour
too. The self-hosted API caches extractions in memory for one hour, max 500
entries.

## Rate Limiting

The self-hosted API allows 30 requests per minute per IP address. On
xactions.app the edge cache absorbs repeat lookups of the same tweet, and
Cloudflare's platform protections cover the rest.

## Troubleshooting

### 503: "This endpoint needs the XActions Node backend"

You called an `/api/*` route on xactions.app that is not one of the edge
endpoints. Only `/api/health` and the three video routes run at the edge; every
other route needs a self-hosted API. Set `XACTIONS_API_ORIGIN` on the Pages
project to forward them to one.

### 500 Error — "Failed to extract video"

**Common causes:**

1. **Missing Chrome dependencies**: self-hosted only. In Codespaces/CI, Puppeteer needs system libraries:
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

- Browser pool: max 2 Puppeteer instances (self-hosted API only)
- Network lane timeout: 10 seconds per lane; Puppeteer timeout: 15 seconds
- Stealth plugin prevents bot detection
- User-Agent: Chrome 131 on Windows
- Supported URL formats:
  - `https://x.com/user/status/123`
  - `https://twitter.com/user/status/123`
  - `https://www.x.com/user/status/123`

---

*XActions v5.0.0 — by nichxbt*

# Video Engine — Programmatic Video Generation

> Generate animated tweet cards, thread previews, analytics dashboards, and promo videos using Remotion.

## Overview

XActions Video Engine uses [Remotion](https://remotion.dev) to programmatically render MP4 videos from social media data. It generates:

- **Tweet Cards** — Animated tweet with author, text, engagement stats (vertical, landscape, square)
- **Thread Previews** — Multi-tweet thread animation
- **Analytics Dashboards** — Animated charts and metrics visualization
- **Promo Videos** — Branded promotional videos

Available in 3 aspect ratios per composition:
- **Vertical** (1080×1920) — Stories, Reels, TikTok
- **Landscape** (1920×1080) — YouTube, website embeds
- **Square** (1080×1080) — Instagram feed, Twitter

---

## Quick Start

### Install dependencies

```bash
npm install remotion @remotion/cli @remotion/player @remotion/renderer
```

### Render all videos

```bash
node site/video/render.mjs
```

### Render a specific composition

```bash
node site/video/render.mjs TweetVideo
node site/video/render.mjs PromoVideo --codec=h264
```

Output goes to `./out/`.

### Preview in browser (Remotion Studio)

```bash
npx remotion studio site/video/src/index.js
```

---

## Compositions

| ID | Description | Resolution |
|----|-------------|------------|
| `TweetVideo` | Animated tweet card | 1080×1920 (vertical) |
| `TweetVideo-Landscape` | Tweet card, landscape | 1920×1080 |
| `TweetVideo-Square` | Tweet card, square | 1080×1080 |
| `ThreadVideo` | Thread preview animation | 1080×1920 (vertical) |
| `ThreadVideo-Landscape` | Thread, landscape | 1920×1080 |
| `AnalyticsDashboard` | Animated analytics | 1920×1080 |
| `PromoVideo` | Brand promo video | 1920×1080 |
| `PromoVideo-Vertical` | Promo, vertical | 1080×1920 |

---

## Architecture

```
site/video/
├── remotion.config.js            ← Remotion config (entry point, overwrite settings)
├── render.mjs                    ← CLI render script
└── src/
    ├── index.js                  ← registerRoot entry point
    ├── Root.jsx                  ← Registers all compositions
    ├── compositions/
    │   ├── TweetVideo.jsx        ← Animated tweet card
    │   ├── ThreadVideo.jsx       ← Thread preview
    │   ├── AnalyticsDashboard.jsx ← Analytics visualization
    │   └── PromoVideo.jsx        ← Promo video
    ├── components/
    │   └── Shared.jsx            ← Reusable UI components
    └── utils/
        └── theme.js              ← FPS, dimensions, colors
```

---

## Default Props

### TweetVideo

```javascript
{
  author: 'nich',
  handle: '@nichxbt',
  text: 'XActions: 75+ free MCP tools for Twitter automation...',
  likes: 2847,
  retweets: 412,
  replies: 163,
  verified: true,
}
```

### Customizing Props

Edit `defaultProps` in [Root.jsx](site/video/src/Root.jsx) or pass input data via Remotion's `--props` flag:

```bash
npx remotion render site/video/src/index.js TweetVideo --props='{"author":"YourName","text":"Your tweet text","likes":100}'
```

---

## Video API (Twitter Video Download)

The API also provides tweet video extraction and download:

```http
POST /api/video/extract
Content-Type: application/json

{ "url": "https://x.com/user/status/123456" }
```

**Response:**
```json
{
  "videos": [
    { "url": "https://video.twimg.com/...", "quality": "720p", "width": 1280, "height": 720 }
  ],
  "thumbnail": "https://pbs.twimg.com/...",
  "author": "username",
  "tweetId": "123456"
}
```

```http
GET /api/video/download?url=<video_url>&author=user&tweetId=123
```

Downloads the video through a proxy (bypasses CORS restrictions).

---

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| Codec | `h264` | Video codec (`h264`, `vp8`, `prores`) |
| FPS | 30 | Frames per second |
| Duration | 150 frames | ~5 seconds at 30fps |
| Output | `./out/` | Directory for rendered files |

### Rate Limits (Video API)

- 30 requests/minute per IP
- In-memory cache: 1-hour TTL, max 500 entries

---

## Tips

- **Use Remotion Studio** for rapid previewing before rendering
- **Customize `theme.js`** to match your brand colors
- **Batch render** with no arguments — renders all 8 compositions at once
- **Feed real data** — replace `defaultProps` with data from XActions scrapers for authentic content
